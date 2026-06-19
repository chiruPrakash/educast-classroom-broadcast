// WebRTC Service — One-to-Many Broadcast via Firestore signalling
import {
  addViewerICE,
  subscribeToLecturerICE,
  subscribeToAnswers,
  subscribeToViewerICE,
  sendJoinRequest,
  sendViewerOffer,
  sendViewerAnswer,
  subscribeToViewerSignaling,
  addLecturerICEForViewer
} from './sessionService';

let cachedIceServers = null;

export async function getIceServers() {
  if (cachedIceServers) {
    return cachedIceServers;
  }
  try {
    const response = await fetch("https://vemueducast.metered.live/api/v1/turn/credentials?apiKey=XZcytTGR-83dP9HNybDw0Of0WLdWHhH0w67ZTGS5ZQlUkV0T");
    if (!response.ok) {
      throw new Error(`Metered.ca API error: ${response.status}`);
    }
    const iceServers = await response.json();
    cachedIceServers = { iceServers };
    console.log("Dynamically loaded ICE servers from Metered.ca:", cachedIceServers);
    return cachedIceServers;
  } catch (error) {
    console.error("Failed to fetch dynamic credentials, using openrelay fallback:", error);
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:openrelay.metered.ca:80' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    };
  }
}

// ── LecturerBroadcaster ───────────────────────────────────────

export class LecturerBroadcaster {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.localStream = null;
    this.peerConnections = {}; // viewerId -> RTCPeerConnection
    this.unsubscribers = {}; // viewerId -> Array of unsub functions
    this.viewerIceQueues = {}; // viewerId -> Array of queued candidates
    this.answersUnsub = null;
  }

  setStream(stream) {
    this.localStream = stream;
  }

  startListening() {
    console.log("Lecturer started listening for viewer connections...");
    
    // Subscribe to join requests
    this.answersUnsub = subscribeToAnswers(this.sessionId, async (data) => {
      if (!data) return;
      const viewerId = data.id;

      if (data.status === 'request') {
        console.log(`Processing join request from viewer: ${viewerId}`);
        
        // Clean up any stale connection for this viewer first
        this.disconnectViewer(viewerId);

        const iceConfig = await getIceServers();
        const pc = new RTCPeerConnection(iceConfig);
        this.peerConnections[viewerId] = pc;
        this.unsubscribers[viewerId] = [];
        this.viewerIceQueues[viewerId] = [];

        // Add local tracks to this viewer's connection
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
          });
        }

        // Handle candidate generation for this connection
        pc.onicecandidate = async ({ candidate }) => {
          if (candidate) {
            await addLecturerICEForViewer(this.sessionId, viewerId, candidate);
          }
        };

        // Create connection offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendViewerOffer(this.sessionId, viewerId, offer);

        // Listen to this viewer's ICE candidates
        const iceUnsub = subscribeToViewerICE(this.sessionId, viewerId, async (candidateData) => {
          try {
            const cleanCandidate = {};
            if (candidateData.candidate !== undefined) cleanCandidate.candidate = candidateData.candidate;
            if (candidateData.sdpMid !== undefined) cleanCandidate.sdpMid = candidateData.sdpMid;
            if (candidateData.sdpMLineIndex !== undefined) cleanCandidate.sdpMLineIndex = candidateData.sdpMLineIndex;
            if (candidateData.usernameFragment !== undefined) cleanCandidate.usernameFragment = candidateData.usernameFragment;

            const candidate = new RTCIceCandidate(cleanCandidate);
            if (pc.remoteDescription) {
              await pc.addIceCandidate(candidate);
            } else {
              console.log(`Queueing viewer ICE candidate for ${viewerId}...`);
              if (this.viewerIceQueues[viewerId]) {
                this.viewerIceQueues[viewerId].push(candidate);
              }
            }
          } catch (e) {
            // Ignore candidates added too early or invalid
          }
        });
        this.unsubscribers[viewerId].push(iceUnsub);

        // Listen for the viewer's answer
        const sigUnsub = subscribeToViewerSignaling(this.sessionId, viewerId, async (sigData) => {
          if (sigData && sigData.status === 'answer' && sigData.answer) {
            try {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(sigData.answer));
                console.log(`Successfully connected to viewer: ${viewerId}`);

                // Process queued ICE candidates for this viewer
                const queue = this.viewerIceQueues[viewerId] || [];
                console.log(`Processing ${queue.length} queued ICE candidates for viewer ${viewerId}`);
                while (queue.length > 0) {
                  const candidate = queue.shift();
                  try {
                    await pc.addIceCandidate(candidate);
                  } catch (iceError) {
                    console.warn(`Failed to add queued ICE candidate for viewer ${viewerId}:`, iceError);
                  }
                }
              }
            } catch (e) {
              console.warn(`Failed to set remote description for viewer ${viewerId}:`, e);
            }
          }
        });
        this.unsubscribers[viewerId].push(sigUnsub);
      }
    });
  }

  async replaceStream(newStream) {
    this.localStream = newStream;
    for (const [viewerId, pc] of Object.entries(this.peerConnections)) {
      const senders = pc.getSenders();
      const tracks = newStream.getTracks();

      for (const track of tracks) {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          try {
            await sender.replaceTrack(track);
          } catch (e) {
            console.warn(`replaceTrack failed for viewer ${viewerId}:`, e);
          }
        } else {
          try {
            pc.addTrack(track, newStream);
          } catch (e) {
            // Track addition failure
          }
        }
      }
    }
  }

  disconnectViewer(viewerId) {
    if (this.unsubscribers[viewerId]) {
      this.unsubscribers[viewerId].forEach(unsub => unsub());
      delete this.unsubscribers[viewerId];
    }
    if (this.peerConnections[viewerId]) {
      try {
        this.peerConnections[viewerId].close();
      } catch (e) {}
      delete this.peerConnections[viewerId];
    }
    if (this.viewerIceQueues[viewerId]) {
      delete this.viewerIceQueues[viewerId];
    }
    console.log(`Disconnected viewer: ${viewerId}`);
  }

  destroy() {
    if (this.answersUnsub) {
      this.answersUnsub();
      this.answersUnsub = null;
    }
    for (const viewerId of Object.keys(this.peerConnections)) {
      this.disconnectViewer(viewerId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    console.log("Lecturer broadcaster destroyed");
  }
}

// ── ViewerReceiver ────────────────────────────────────────────

export class ViewerReceiver {
  constructor(sessionId, viewerId) {
    this.sessionId = sessionId;
    this.viewerId = viewerId;
    this.pc = null;
    this.unsubscribers = [];
    this._onStream = null;
    this._offerHandled = false;
    this.iceCandidatesQueue = []; // Queue for candidates arriving early
  }

  onStream(callback) {
    this._onStream = callback;
    return this;
  }

  async connect() {
    const iceConfig = await getIceServers();
    this.pc = new RTCPeerConnection(iceConfig);

    this.pc.ontrack = ({ streams }) => {
      if (this._onStream && streams[0]) {
        console.log("Remote media stream received");
        this._onStream(streams[0]);
      }
    };

    this.pc.onicecandidate = async ({ candidate }) => {
      if (candidate) {
        await addViewerICE(this.sessionId, this.viewerId, candidate);
      }
    };

    // Watch for signaling updates (offers from the lecturer)
    const signalingUnsub = subscribeToViewerSignaling(this.sessionId, this.viewerId, async (data) => {
      if (!data) {
        // Document was deleted (lecturer cleared signaling data or restarted session).
        // Reset the peer connection and re-request joining.
        console.log("Signaling document deleted, resetting and re-sending join request...");
        this._offerHandled = false;
        this.iceCandidatesQueue = []; // Clear candidate queue
        if (this.pc) {
          try { this.pc.close(); } catch (e) {}
        }
        const freshIceConfig = await getIceServers();
        this.pc = new RTCPeerConnection(freshIceConfig);
        this.pc.ontrack = ({ streams }) => {
          if (this._onStream && streams[0]) {
            console.log("Remote media stream received");
            this._onStream(streams[0]);
          }
        };
        this.pc.onicecandidate = async ({ candidate }) => {
          if (candidate) {
            await addViewerICE(this.sessionId, this.viewerId, candidate);
          }
        };
        await sendJoinRequest(this.sessionId, this.viewerId);
        return;
      }

      if (data.status === 'request') {
        this._offerHandled = false;
      }

      if (data.status === 'offer' && data.offer && !this._offerHandled) {
        try {
          this._offerHandled = true;
          await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          // Process queued ICE candidates
          console.log(`Processing ${this.iceCandidatesQueue.length} queued ICE candidates`);
          while (this.iceCandidatesQueue.length > 0) {
            const candidate = this.iceCandidatesQueue.shift();
            try {
              await this.pc.addIceCandidate(candidate);
            } catch (iceError) {
              console.warn("Failed to add queued ICE candidate:", iceError);
            }
          }

          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await sendViewerAnswer(this.sessionId, this.viewerId, answer);
          console.log("Viewer generated and sent WebRTC answer successfully");
        } catch (e) {
          this._offerHandled = false;
          console.warn('Error handling offer and sending answer:', e);
        }
      }
    });
    this.unsubscribers.push(signalingUnsub);

    // Watch for lecturer candidates
    const lecturerIceUnsub = subscribeToLecturerICE(this.sessionId, this.viewerId, async (data) => {
      try {
        const cleanCandidate = {};
        if (data.candidate !== undefined) cleanCandidate.candidate = data.candidate;
        if (data.sdpMid !== undefined) cleanCandidate.sdpMid = data.sdpMid;
        if (data.sdpMLineIndex !== undefined) cleanCandidate.sdpMLineIndex = data.sdpMLineIndex;
        if (data.usernameFragment !== undefined) cleanCandidate.usernameFragment = data.usernameFragment;

        const candidate = new RTCIceCandidate(cleanCandidate);
        if (this.pc && this.pc.remoteDescription) {
          await this.pc.addIceCandidate(candidate);
        } else {
          console.log("Queueing lecturer ICE candidate...");
          this.iceCandidatesQueue.push(candidate);
        }
      } catch (e) {
        // Ignore errors
      }
    });
    this.unsubscribers.push(lecturerIceUnsub);

    // Write join request to trigger offer creation
    await sendJoinRequest(this.sessionId, this.viewerId);
  }

  destroy() {
    this.unsubscribers.forEach(u => u());
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
    }
    this.iceCandidatesQueue = [];
    console.log(`ViewerReceiver destroyed for: ${this.viewerId}`);
  }
}

// ── Media Helpers ─────────────────────────────────────────────

export const getCameraStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true }
    });
  } catch (err) {
    console.warn("Real media devices not available, generating fake streams:", err);
    // Create a fake video track using a canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    // Draw something animated on the canvas to simulate a feed
    let hue = 0;
    const intervalId = setInterval(() => {
      if (ctx) {
        ctx.fillStyle = `hsl(${hue}, 70%, 20%)`;
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EduCast Simulation Feed', 320, 180);
        hue = (hue + 1) % 360;
      }
    }, 100);

    const videoStream = canvas.captureStream(30);
    const videoTrack = videoStream.getVideoTracks()[0];
    
    // Create a fake silent audio track
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const dst = audioContext.createMediaStreamDestination();
    oscillator.connect(dst);
    // Keep it silent (gain = 0)
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    oscillator.connect(gainNode);
    gainNode.connect(dst);
    
    const audioTrack = dst.stream.getAudioTracks()[0];
    
    const combinedStream = new MediaStream([videoTrack, audioTrack]);
    // Save reference to stop the interval when track is stopped
    const originalStop = videoTrack.stop;
    videoTrack.stop = function() {
      clearInterval(intervalId);
      audioContext.close();
      if (originalStop) originalStop.call(videoTrack);
    };
    
    return combinedStream;
  }
};

export const getScreenStream = async () => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true
    });
  } catch (err) {
    console.warn("Screen display capture not available, falling back to camera stream:", err);
    return getCameraStream();
  }
};

export const stopStream = (stream) => {
  if (stream) stream.getTracks().forEach(t => t.stop());
};
