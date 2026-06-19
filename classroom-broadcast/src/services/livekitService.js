// ============================================================
// src/services/livekitService.js
// LiveKit-powered broadcasting
// ============================================================

import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || '';
const TOKEN_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:4000';

// ── Token fetching ────────────────────────────────────────────

async function fetchToken(roomName, participantName, isPublisher) {
  const res = await fetch(`${TOKEN_SERVER_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantName, isPublisher }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token server error ${res.status}: ${errText}`);
  }
  const { token } = await res.json();
  return token;
}

// ── LecturerBroadcaster ───────────────────────────────────────

export class LecturerBroadcaster {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.room = null;
    this._onLocalVideo = null;
    this._onStateChange = null;
    this._isMuted = false;
    this._isCamOff = false;
    this._isScreenSharing = false;
    this._onParticipantCountChange = null;
  }

  onParticipantCountChange(callback) {
    this._onParticipantCountChange = callback;
    return this;
  }

  _notifyParticipantCount() {
    if (!this.room) return;
    const count = this.room.remoteParticipants.size;
    this._onParticipantCountChange?.(count);
  }

  async connect(participantName, onLocalVideo, onStateChange) {
    if (!LIVEKIT_URL) {
      throw new Error('VITE_LIVEKIT_URL is not set. Check your .env file and restart the dev server.');
    }

    this._onLocalVideo = onLocalVideo;
    this._onStateChange = onStateChange;

    const token = await fetchToken(this.sessionId, participantName, true);

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    this.room
      .on(RoomEvent.Disconnected, () => {
        console.warn('[LiveKit Lecturer] Disconnected');
      })
      .on(RoomEvent.Reconnecting, () => {
        console.log('[LiveKit Lecturer] Reconnecting...');
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit Lecturer] Reconnected');
        this._notifyLocalStream();
        this._notifyParticipantCount();
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        console.log('[LiveKit Lecturer] Track published:', pub.source);
        // Small delay ensures MediaStreamTrack is fully initialized
        setTimeout(() => this._notifyLocalStream(), 150);
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        console.log('[LiveKit Lecturer] Track unpublished:', pub.source);
        setTimeout(() => this._notifyLocalStream(), 150);
      })
      .on(RoomEvent.ParticipantConnected, (p) => {
        console.log('[LiveKit Lecturer] Participant connected:', p.identity);
        this._notifyParticipantCount();
      })
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        console.log('[LiveKit Lecturer] Participant disconnected:', p.identity);
        this._notifyParticipantCount();
      });

    await this.room.connect(LIVEKIT_URL, token, { autoSubscribe: false });
    console.log('[LiveKit Lecturer] Connected to room:', this.sessionId);
    this._notifyParticipantCount();

    await this.room.localParticipant.enableCameraAndMicrophone();
    setTimeout(() => this._notifyLocalStream(), 300);
  }

  // ── Internal helpers ──────────────────────────────────────

  _getCamPub() {
    for (const pub of (this.room?.localParticipant.videoTrackPublications.values() ?? [])) {
      if (pub.source === Track.Source.Camera) return pub;
    }
    return null;
  }

  _getMicPub() {
    for (const pub of (this.room?.localParticipant.audioTrackPublications.values() ?? [])) {
      if (pub.source === Track.Source.Microphone) return pub;
    }
    return null;
  }

  /**
   * Build the local preview stream and deliver it via onLocalVideo.
   * - When screen sharing: shows the screen track
   * - Otherwise: shows the camera track
   */
  _notifyLocalStream() {
    if (!this._onLocalVideo || !this.room) return;

    const mediaTracks = [];

    // === Video ===
    if (this._isScreenSharing) {
      // Use screen share track for preview
      for (const pub of this.room.localParticipant.videoTrackPublications.values()) {
        if (pub.source === Track.Source.ScreenShare && pub.track?.mediaStreamTrack) {
          mediaTracks.push(pub.track.mediaStreamTrack);
          break;
        }
      }
    }
    // Fallback: always add camera track (even if muted — overlay handles the visual)
    if (mediaTracks.length === 0) {
      const camPub = this._getCamPub();
      if (camPub?.track?.mediaStreamTrack) {
        mediaTracks.push(camPub.track.mediaStreamTrack);
      }
    }

    // === Audio ===
    const micPub = this._getMicPub();
    if (micPub?.track?.mediaStreamTrack) {
      mediaTracks.push(micPub.track.mediaStreamTrack);
    }

    if (mediaTracks.length > 0) {
      this._onLocalVideo(new MediaStream(mediaTracks));
    }
  }

  // ── Controls ─────────────────────────────────────────────

  /**
   * Mute / unmute the microphone.
   * Uses track.mute() so the track STAYS PUBLISHED — just sends muted signal.
   */
  async toggleMic(muted) {
    this._isMuted = muted;
    const micPub = this._getMicPub();
    if (micPub?.track) {
      if (muted) {
        await micPub.track.mute();
      } else {
        await micPub.track.unmute();
      }
    }
  }

  /**
   * Enable / disable the camera.
   * Uses track.mute() so the track stays published and viewers receive TrackMuted.
   * This also preserves the local MediaStreamTrack so the preview can recover.
   */
  async toggleCamera(off) {
    if (this._isScreenSharing) return;
    this._isCamOff = off;

    const camPub = this._getCamPub();
    if (camPub?.track) {
      if (off) {
        await camPub.track.mute();
      } else {
        await camPub.track.unmute();
        // Refresh preview after unmuting
        setTimeout(() => this._notifyLocalStream(), 100);
      }
    }
    // Always refresh the preview
    this._notifyLocalStream();
  }

  /**
   * Start screen share. Camera track remains published alongside.
   * Viewers will receive both tracks; ViewerReceiver prioritises screen share.
   */
  async publishScreen() {
    if (!this.room || this._isScreenSharing) return;

    try {
      const pub = await this.room.localParticipant.setScreenShareEnabled(true, {
        audio: true,
      });
      this._isScreenSharing = true;

      // Switch preview to screen share
      setTimeout(() => this._notifyLocalStream(), 200);

      if (pub?.track?.mediaStreamTrack) {
        pub.track.mediaStreamTrack.addEventListener('ended', () => {
          this._handleScreenEnded();
        }, { once: true });
      }

      console.log('[LiveKit Lecturer] Screen share started');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('[LiveKit Lecturer] Screen share error:', err);
        throw err;
      }
    }
  }

  /**
   * Stop screen share and revert preview to camera.
   */
  async stopScreen() {
    if (!this.room || !this._isScreenSharing) return;
    await this.room.localParticipant.setScreenShareEnabled(false);
    this._isScreenSharing = false;
    setTimeout(() => this._notifyLocalStream(), 200);
    console.log('[LiveKit Lecturer] Screen share stopped');
  }

  _handleScreenEnded() {
    this.room?.localParticipant.setScreenShareEnabled(false).catch(err => {
      console.warn('[LiveKit Lecturer] Error disabling screenshare after ended:', err);
    });
    this._isScreenSharing = false;
    setTimeout(() => this._notifyLocalStream(), 200);
    this._onStateChange?.({ screenShareStopped: true });
  }

  get isScreenSharing() {
    return this._isScreenSharing;
  }

  destroy() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    console.log('[LiveKit Lecturer] Broadcaster destroyed');
  }
}

// ── ViewerReceiver ────────────────────────────────────────────

export class ViewerReceiver {
  constructor(sessionId, viewerId) {
    this.sessionId = sessionId;
    this.viewerId = viewerId;
    this.room = null;
    this._onStream = null;
    this._onCamMuted = null;
    this._onMicMuted = null;
  }

  onStream(callback) {
    this._onStream = callback;
    return this;
  }

  /**
   * Called when the lecturer's camera track is muted/unmuted.
   * @param {Function} callback — (isMuted: boolean) => void
   */
  onCamMuted(callback) {
    this._onCamMuted = callback;
    return this;
  }

  /**
   * Called when the lecturer's mic track is muted/unmuted.
   * @param {Function} callback — (isMuted: boolean) => void
   */
  onMicMuted(callback) {
    this._onMicMuted = callback;
    return this;
  }

  async connect() {
    if (!LIVEKIT_URL) {
      throw new Error('VITE_LIVEKIT_URL is not set. Check your .env file.');
    }

    const token = await fetchToken(this.sessionId, this.viewerId, false);

    this.room = new Room({ adaptiveStream: true, dynacast: true });

    this.room
      .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        console.log('[LiveKit Viewer] Track subscribed:', track.source, track.kind);
        this._rebuildStream();
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        console.log('[LiveKit Viewer] Track unsubscribed:', track.source);
        this._rebuildStream();
      })
      .on(RoomEvent.TrackMuted, (pub, participant) => {
        console.log('[LiveKit Viewer] Track muted:', pub.source);
        // Camera muted → notify UI to show camera-off overlay
        if (pub.source === Track.Source.Camera) {
          this._onCamMuted?.(true);
        }
        this._rebuildStream();
      })
      .on(RoomEvent.TrackUnmuted, (pub, participant) => {
        console.log('[LiveKit Viewer] Track unmuted:', pub.source);
        if (pub.source === Track.Source.Camera) {
          this._onCamMuted?.(false);
        }
        this._rebuildStream();
      })
      .on(RoomEvent.Disconnected, () => {
        console.warn('[LiveKit Viewer] Disconnected');
      })
      .on(RoomEvent.Reconnecting, () => {
        console.log('[LiveKit Viewer] Reconnecting...');
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit Viewer] Reconnected');
        this._rebuildStream();
      });

    await this.room.connect(LIVEKIT_URL, token, { autoSubscribe: true });
    console.log('[LiveKit Viewer] Connected to room:', this.sessionId);

    // Pick up existing tracks if broadcaster is already in room
    this._rebuildStream();
  }

  /**
   * Rebuild the stream from current subscribed tracks.
   * Screen share takes priority over camera for the video slot.
   */
  _rebuildStream() {
    if (!this.room) return;

    let screenShareTrack = null;
    let cameraTrack = null;
    let audioTrack = null;
    let isCamMuted = false;
    let isMicMuted = false;

    this.room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.source === Track.Source.Camera) {
          isCamMuted = pub.isMuted;
        }
        if (pub.source === Track.Source.Microphone) {
          isMicMuted = pub.isMuted;
        }

        if (!pub.isSubscribed || !pub.track?.mediaStreamTrack) return;

        if (pub.source === Track.Source.ScreenShare && pub.kind === Track.Kind.Video) {
          screenShareTrack = pub.track.mediaStreamTrack;
        } else if (pub.source === Track.Source.Camera && pub.kind === Track.Kind.Video) {
          cameraTrack = pub.track.mediaStreamTrack;
        } else if (pub.kind === Track.Kind.Audio) {
          audioTrack = pub.track.mediaStreamTrack;
        }
      });
    });

    // Notify camera mute state
    this._onCamMuted?.(isCamMuted);
    // Notify mic mute state
    this._onMicMuted?.(isMicMuted);

    // Screen share takes priority; fall back to camera
    const videoTrack = screenShareTrack || cameraTrack;
    const isScreenShare = !!screenShareTrack;

    if (videoTrack || audioTrack) {
      const tracks = [];
      if (videoTrack) tracks.push(videoTrack);
      if (audioTrack) tracks.push(audioTrack);
      this._onStream?.(new MediaStream(tracks), isScreenShare);
    } else {
      this._onStream?.(null, false);
    }
  }

  destroy() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    console.log('[LiveKit Viewer] Receiver destroyed:', this.viewerId);
  }
}

// ── Media helpers ─────────────────────────────────────────────

export const getCameraStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (err) {
    console.warn('[Media] Camera access failed, using canvas fallback:', err);
    return _createFallbackStream();
  }
};

export const getScreenStream = async () => {
  return await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: true,
  });
};

export const stopStream = (stream) => {
  if (stream) stream.getTracks().forEach(t => t.stop());
};

function _createFallbackStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  let hue = 0;
  const intervalId = setInterval(() => {
    if (ctx) {
      ctx.fillStyle = `hsl(${hue}, 70%, 15%)`;
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EduCast — No Camera', 320, 170);
      hue = (hue + 0.5) % 360;
    }
  }, 100);
  const videoStream = canvas.captureStream(15);
  const videoTrack = videoStream.getVideoTracks()[0];
  const originalStop = videoTrack.stop.bind(videoTrack);
  videoTrack.stop = () => { clearInterval(intervalId); originalStop(); };

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dst = audioCtx.createMediaStreamDestination();
  const gain = audioCtx.createGain();
  gain.gain.value = 0;
  gain.connect(dst);

  return new MediaStream([videoTrack, dst.stream.getAudioTracks()[0]]);
}
