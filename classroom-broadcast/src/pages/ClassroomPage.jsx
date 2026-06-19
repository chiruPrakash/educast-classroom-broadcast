import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/classroom/VideoPlayer';
import SessionList from '../components/classroom/SessionList';
import { ToastContainer } from '../components/shared/Toast';
import Logo from '../components/shared/Logo';
import useToast from '../hooks/useToast';
import {
  subscribeToSessions,
  subscribeToSession,
  registerClassroom,
  removeClassroom,
  getLiveKitRoomName,
} from '../services/sessionService';
import { ViewerReceiver } from '../services/livekitService';
import { ArrowLeft, Tv2 } from 'lucide-react';

export default function ClassroomPage() {
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [liveSessions, setLiveSessions]       = useState([]);
  const [currentSession, setCurrentSession]   = useState(null);
  const [remoteStream, setRemoteStream]        = useState(null);
  const [isConnected, setIsConnected]          = useState(false);
  const [joining, setJoining]                  = useState(null);
  const [classroomName, setClassroomName]      = useState('');
  const [namePrompt, setNamePrompt]            = useState(false);
  const [pendingSession, setPendingSession]    = useState(null);
  const [classroomId, setClassroomId]          = useState(null);
  const [sessionEndedMsg, setSessionEndedMsg]  = useState(false);
  const [isLecturerCamMuted, setIsLecturerCamMuted] = useState(false);
  const [isLecturerMicMuted, setIsLecturerMicMuted] = useState(false);
  const [isLecturerScreenSharing, setIsLecturerScreenSharing] = useState(false);

  const viewerRef = useRef(null);
  // Stable viewer identity — persists across re-renders
  const viewerId  = useRef(`viewer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  // Subscribe to live sessions
  useEffect(() => {
    const unsub = subscribeToSessions((all) => {
      setLiveSessions(all.filter(s => s.status === 'live'));
    });
    return unsub;
  }, []);

  // Watch current session for "ended" state
  useEffect(() => {
    if (!currentSession?.id) return;
    const unsub = subscribeToSession(currentSession.id, (updated) => {
      if (updated.status === 'ended') {
        setSessionEndedMsg(true);
        toast.info('The session has ended.');
        cleanup();
        setTimeout(() => setSessionEndedMsg(false), 8000);
      }
    });
    return unsub;
  }, [currentSession?.id]);

  const cleanup = () => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }
    if (classroomId) removeClassroom(classroomId);
    setCurrentSession(null);
    setRemoteStream(null);
    setIsConnected(false);
    setClassroomId(null);
    setIsLecturerCamMuted(false);
    setIsLecturerMicMuted(false);
    setIsLecturerScreenSharing(false);
  };

  const handleJoinRequest = (session) => {
    setPendingSession(session);
    setNamePrompt(true);
  };

  const handleConfirmJoin = async () => {
    if (!classroomName.trim() || !pendingSession) return;
    setNamePrompt(false);
    setJoining(pendingSession.id);

    try {
      // Register classroom in Firestore (for admin dashboard)
      const cId = await registerClassroom(pendingSession.id, classroomName.trim());
      setClassroomId(cId);
      setCurrentSession(pendingSession);

      // Build a unique participant name from classroom name + viewer ID
      const participantName = `${classroomName.trim()}_${viewerId.current}`;
      const roomName = getLiveKitRoomName(pendingSession.id);

      // Set up LiveKit viewer
      const receiver = new ViewerReceiver(roomName, participantName);

      receiver.onStream((stream, isScreenShare) => {
        if (stream) {
          setRemoteStream(stream);
          setIsLecturerScreenSharing(isScreenShare);
          setIsConnected(true);
          toast.success('Stream connected!');
        } else {
          // All tracks removed — lecturer may have stopped
          setRemoteStream(null);
          setIsLecturerScreenSharing(false);
          toast.info('Waiting for lecturer to start broadcasting…');
        }
      });

      receiver.onCamMuted((isMuted) => {
        setIsLecturerCamMuted(isMuted);
      });

      receiver.onMicMuted((isMuted) => {
        setIsLecturerMicMuted(isMuted);
      });

      await receiver.connect();
      viewerRef.current = receiver;

      // isConnected = true means "joined the room", stream arrives separately
      setIsConnected(true);
      toast.info('Joined session — waiting for lecturer to broadcast…');
    } catch (e) {
      console.error('[ClassroomPage] Join failed:', e);
      toast.error('Failed to join: ' + e.message);
      cleanup();
    } finally {
      setJoining(null);
    }
  };

  const handleLeave = () => {
    cleanup();
    toast.info('Left session');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#0F1117] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {currentSession && (
            <button onClick={handleLeave} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
              <ArrowLeft size={13} />Leave Session
            </button>
          )}
          <button onClick={() => navigate('/login')}
            className="text-white/30 hover:text-white/60 text-xs font-body transition-colors">
            Sign In
          </button>
        </div>
      </header>

      <div className="flex-1 p-6">
        {/* Session Ended Notification */}
        {sessionEndedMsg && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <p className="text-amber-300 text-sm font-body">The session has ended. Thank you for attending!</p>
          </div>
        )}

        {/* Watching a session */}
        {currentSession ? (
          <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
            {/* Session info bar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display font-bold text-xl text-white">{currentSession.title}</h1>
                <p className="text-white/40 text-sm font-body mt-0.5">{currentSession.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="live-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE
                </div>
              </div>
            </div>

            {/* Video player */}
            <VideoPlayer
              stream={remoteStream}
              isConnected={isConnected}
              isLecturerCamMuted={isLecturerCamMuted}
              isLecturerMicMuted={isLecturerMicMuted}
              isLecturerScreenSharing={isLecturerScreenSharing}
            />

            {/* Info row */}
            <div className="flex items-center gap-4">
              <div className="card border border-white/5 flex items-center gap-2 py-2 px-3">
                <Tv2 size={14} className="text-emerald-400" />
                <span className="text-white/60 text-xs font-body">{classroomName}</span>
              </div>
              <div className={`card border py-2 px-3 flex items-center gap-2 ${isConnected && remoteStream ? 'border-emerald-500/20' : 'border-white/5'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected && remoteStream ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                <span className={`text-xs font-mono ${isConnected && remoteStream ? 'text-emerald-400' : 'text-white/30'}`}>
                  {isConnected && remoteStream ? 'STREAMING' : 'WAITING'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Session picker */
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div>
              <h1 className="font-display font-bold text-2xl text-white mb-1">Classroom Viewer</h1>
              <p className="text-white/40 text-sm font-body">Select a live session to start watching.</p>
            </div>
            <SessionList sessions={liveSessions} onJoin={handleJoinRequest} joining={joining} />
          </div>
        )}
      </div>

      {/* Name Prompt Modal */}
      {namePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNamePrompt(false)} />
          <div className="relative w-full max-w-sm bg-[#161921] border border-white/10 rounded-2xl shadow-2xl p-6 animate-slide-up">
            <h2 className="font-display font-bold text-lg text-white mb-1">Enter Classroom Name</h2>
            <p className="text-white/40 text-sm font-body mb-5">This will appear in the Admin's classroom list.</p>
            <label className="label">Classroom Name</label>
            <input
              type="text"
              className="input-field mb-4"
              placeholder="e.g. Room 301, Lab A, Hall B…"
              value={classroomName}
              onChange={e => setClassroomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmJoin()}
              autoFocus
              maxLength={40}
            />
            <div className="flex gap-3">
              <button onClick={() => setNamePrompt(false)} className="btn-secondary flex-1 text-sm justify-center">Cancel</button>
              <button onClick={handleConfirmJoin} disabled={!classroomName.trim()} className="btn-primary flex-1 text-sm justify-center">
                Join →
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
