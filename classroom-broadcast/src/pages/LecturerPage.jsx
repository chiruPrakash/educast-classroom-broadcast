import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoPreview from '../components/lecturer/VideoPreview';
import ControlBar from '../components/lecturer/ControlBar';
import { ToastContainer } from '../components/shared/Toast';
import StatusBadge from '../components/shared/StatusBadge';
import Logo from '../components/shared/Logo';
import useToast from '../hooks/useToast';
import { subscribeToSessions, getLiveKitRoomName } from '../services/sessionService';
import { LecturerBroadcaster, getCameraStream, stopStream } from '../services/livekitService';
import { logoutUser } from '../services/authService';
import { Users, Radio, LogOut, ChevronDown, RefreshCw } from 'lucide-react';

export default function LecturerPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  const broadcasterRef = useRef(null);
  const previewStreamRef = useRef(null); // Camera preview before going live

  useEffect(() => {
    if (role && role !== 'lecturer' && role !== 'admin') navigate('/login');
  }, [role, navigate]);

  // Subscribe to live sessions
  useEffect(() => {
    const unsub = subscribeToSessions((all) => {
      const live = all.filter(s => s.status === 'live');
      setSessions(live);
      if (!selectedSession && live.length === 1) setSelectedSession(live[0]);
    });
    return unsub;
  }, []);

  // Initialize camera preview on mount
  useEffect(() => {
    initCameraPreview();
    return () => {
      if (previewStreamRef.current) stopStream(previewStreamRef.current);
      if (broadcasterRef.current) broadcasterRef.current.destroy();
    };
  }, []);

  const initCameraPreview = async () => {
    try {
      const stream = await getCameraStream();
      previewStreamRef.current = stream;
      setLocalStream(stream);
      toast.success('Camera & microphone ready');
    } catch (e) {
      toast.error('Camera access denied. Check browser permissions.');
    }
  };

  // ── Mic toggle ────────────────────────────────────────────

  const handleToggleMic = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isBroadcasting && broadcasterRef.current) {
      // LiveKit handles track muting server-side
      await broadcasterRef.current.toggleMic(nextMuted);
    } else {
      // Preview mode — mute the raw MediaStream
      if (previewStreamRef.current) {
        previewStreamRef.current.getAudioTracks().forEach(t => {
          t.enabled = !nextMuted;
        });
      }
    }
  };

  // ── Camera toggle ─────────────────────────────────────────

  const handleToggleCam = async () => {
    if (isScreenSharing) return;
    const nextOff = !isCamOff;
    setIsCamOff(nextOff);

    if (isBroadcasting && broadcasterRef.current) {
      await broadcasterRef.current.toggleCamera(nextOff);
    } else {
      // Preview mode — disable video tracks
      if (previewStreamRef.current) {
        previewStreamRef.current.getVideoTracks().forEach(t => {
          t.enabled = !nextOff;
        });
      }
    }
  };

  // ── Screen share toggle ───────────────────────────────────

  const handleToggleScreen = async () => {
    if (!isBroadcasting) {
      // Not live yet — inform the user
      toast.info('Start broadcasting first, then use screen share.');
      return;
    }

    if (isScreenSharing) {
      // Stop screen share
      await broadcasterRef.current.stopScreen();
      setIsScreenSharing(false);
      toast.info('Switched back to camera');
    } else {
      // Start screen share
      try {
        await broadcasterRef.current.publishScreen();
        setIsScreenSharing(true);
        toast.success('Screen sharing started — viewers can see your screen');
      } catch (e) {
        if (e.name !== 'NotAllowedError') {
          toast.error('Screen share failed: ' + e.message);
        }
      }
    }
  };

  // ── Broadcast start/stop ─────────────────────────────────

  const handleStartBroadcast = async () => {
    if (!selectedSession) {
      toast.error('Please select a live session first.');
      return;
    }

    try {
      // Stop the local preview stream — LiveKit will provide its own
      if (previewStreamRef.current) {
        stopStream(previewStreamRef.current);
        previewStreamRef.current = null;
        setLocalStream(null);
      }

      const roomName = getLiveKitRoomName(selectedSession.id);
      const participantName = user?.email || `lecturer_${Date.now()}`;

      const broadcaster = new LecturerBroadcaster(roomName);

      broadcaster.onParticipantCountChange((count) => {
        setParticipantCount(count);
      });

      await broadcaster.connect(
        participantName,
        // Called when LiveKit delivers the local video for preview
        (stream) => setLocalStream(stream),
        // Called on state changes (e.g. screen share ended via browser UI)
        ({ screenShareStopped }) => {
          if (screenShareStopped) setIsScreenSharing(false);
        }
      );

      broadcasterRef.current = broadcaster;
      setIsBroadcasting(true);
      toast.success('🔴 Broadcasting started! Viewers can now join.');
    } catch (e) {
      console.error('[LecturerPage] Broadcast failed:', e);
      toast.error('Broadcast failed: ' + e.message);
      // Restore preview stream on failure
      initCameraPreview();
    }
  };

  const handleStopBroadcast = async () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.destroy();
      broadcasterRef.current = null;
    }
    setIsBroadcasting(false);
    setIsScreenSharing(false);
    setLocalStream(null);
    setParticipantCount(0);
    // Restore camera preview
    await initCameraPreview();
    toast.info('Broadcast stopped');
  };

  const handleLogout = async () => {
    if (isBroadcasting) handleStopBroadcast();
    await logoutUser();
    navigate('/login');
  };

  const liveSessions = sessions.filter(s => s.status === 'live');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="bg-[#0F1117] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs font-mono hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout} className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Main — Video */}
        <div className="flex-1 p-6 space-y-5">
          {/* Session Selector */}
          <div className="card border border-white/5">
            <p className="label">Active Session</p>
            <div className="relative">
              <button
                onClick={() => setShowSessionPicker(s => !s)}
                className="w-full flex items-center justify-between p-3 bg-ink-900/60 border border-white/10 rounded-xl text-left hover:border-white/20 transition-all"
              >
                <div>
                  {selectedSession
                    ? <><p className="font-display font-semibold text-white text-sm">{selectedSession.title}</p>
                        <p className="text-white/30 text-xs mt-0.5">{selectedSession.description}</p></>
                    : <p className="text-white/30 text-sm">Select a live session to broadcast</p>
                  }
                </div>
                <ChevronDown size={16} className="text-white/30 flex-shrink-0" />
              </button>

              {showSessionPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E222B] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                  {liveSessions.length === 0
                    ? <p className="text-white/30 text-sm p-4 text-center">No live sessions. Ask admin to start one.</p>
                    : liveSessions.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSession(s); setShowSessionPicker(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <p className="font-display font-semibold text-white text-sm">{s.title}</p>
                          </div>
                          <p className="text-white/30 text-xs mt-0.5 pl-3.5">{s.description}</p>
                        </button>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Video Preview */}
          <VideoPreview
            stream={localStream}
            isMuted={isMuted}
            isCamOff={isCamOff}
            isScreenSharing={isScreenSharing}
          />

          {/* Controls */}
          <div className="card border border-white/5">
            <ControlBar
              isMuted={isMuted}
              isCamOff={isCamOff}
              isScreenSharing={isScreenSharing}
              isBroadcasting={isBroadcasting}
              hasStream={!!localStream}
              sessionStatus={selectedSession?.status}
              onToggleMic={handleToggleMic}
              onToggleCam={handleToggleCam}
              onToggleScreen={handleToggleScreen}
              onStartBroadcast={handleStartBroadcast}
              onStopBroadcast={handleStopBroadcast}
            />
          </div>
        </div>

        {/* Sidebar — Info */}
        <div className="w-full lg:w-80 p-6 pt-0 lg:pt-6 space-y-4">
          {/* Broadcast Status */}
          <div className={`card border ${isBroadcasting ? 'border-red-500/20 live-glow' : 'border-white/5'}`}>
            <p className="label">Broadcast Status</p>
            {isBroadcasting ? (
              <>
                <div className="flex items-center gap-3 mt-2">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-400 animate-ping opacity-60" />
                  </div>
                  <div>
                    <p className="text-red-400 font-display font-semibold text-sm">ON AIR</p>
                    <p className="text-white/30 text-xs font-body">Streaming via LiveKit</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-body">
                  <span className="text-white/40">Connected Classrooms:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded animate-fade-in">
                    {participantCount}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div>
                  <p className="text-white/50 font-display font-semibold text-sm">Offline</p>
                  <p className="text-white/20 text-xs font-body">Not broadcasting</p>
                </div>
              </div>
            )}
          </div>

          {/* Session Info */}
          {selectedSession && (
            <div className="card border border-white/5">
              <p className="label">Session Info</p>
              <p className="font-display font-semibold text-white text-sm mt-1">{selectedSession.title}</p>
              <p className="text-white/40 text-xs font-body mt-1 leading-relaxed">{selectedSession.description || 'No description'}</p>
              <div className="mt-3">
                <StatusBadge status={selectedSession.status} />
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="card border border-white/5">
            <p className="label">How to Broadcast</p>
            <ol className="mt-2 space-y-2">
              {[
                'Admin must start the session first',
                'Select the live session above',
                'Allow camera & microphone',
                'Click "Go Live" to start broadcasting',
                'Use controls to mute/unmute or share screen',
              ].map((step, i) => (
                <li key={i} className="flex gap-2 text-xs font-body text-white/40">
                  <span className="font-mono text-emerald-400/60 flex-shrink-0">{i+1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Camera reset */}
          <button
            onClick={initCameraPreview}
            disabled={isBroadcasting}
            className="btn-secondary w-full text-xs flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <RefreshCw size={13} />Reinitialize Camera
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
