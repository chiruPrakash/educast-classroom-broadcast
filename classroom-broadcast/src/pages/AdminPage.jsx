import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/admin/Sidebar';
import SessionCard from '../components/admin/SessionCard';
import CreateSessionForm from '../components/admin/CreateSessionForm';
import { ToastContainer } from '../components/shared/Toast';
import StatusBadge from '../components/shared/StatusBadge';
import useToast from '../hooks/useToast';
import {
  createSession, startSession, endSession,
  subscribeToSessions, subscribeToClassrooms
} from '../services/sessionService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Radio, Users, BarChart2, Tv2, PlayCircle, Clock
} from 'lucide-react';

export default function AdminPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [active, setActive] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [creating, setCreating] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (role && role !== 'admin') navigate('/login');
  }, [role, navigate]);

  // Subscribe to all sessions
  useEffect(() => {
    const unsub = subscribeToSessions(setSessions);
    return unsub;
  }, []);

  // Subscribe to classrooms of live sessions
  useEffect(() => {
    const liveSession = sessions.find(s => s.status === 'live');
    if (!liveSession) { setClassrooms([]); return; }
    const unsub = subscribeToClassrooms(liveSession.id, setClassrooms);
    return unsub;
  }, [sessions]);

  const handleCreate = async ({ title, description }) => {
    setCreating(true);
    try {
      await createSession({ title, description, createdBy: user.uid });
      toast.success('Session created successfully');
      setActive('dashboard');
    } catch (e) {
      toast.error('Failed to create session: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await startSession(id);
      toast.success('Session is now LIVE');
    } catch (e) {
      toast.error('Failed to start: ' + e.message);
    }
  };

  const handleEnd = async (id) => {
    if (!confirm('End this session? All viewers will be disconnected.')) return;
    try {
      await endSession(id);
      toast.info('Session ended');
    } catch (e) {
      toast.error('Failed to end: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session permanently?')) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      toast.success('Session deleted');
    } catch (e) {
      toast.error('Failed to delete: ' + e.message);
    }
  };

  const liveSessions   = sessions.filter(s => s.status === 'live');
  const idleSessions   = sessions.filter(s => s.status === 'idle');
  const endedSessions  = sessions.filter(s => s.status === 'ended');

  const stats = [
    { icon: Radio,      label: 'Live Now',     value: liveSessions.length,  accent: 'text-red-400'     },
    { icon: Clock,      label: 'Scheduled',    value: idleSessions.length,  accent: 'text-amber-400'   },
    { icon: Users,      label: 'Classrooms',   value: classrooms.length,    accent: 'text-emerald-400' },
    { icon: BarChart2,  label: 'Total Sessions', value: sessions.length,    accent: 'text-blue-400'    },
  ];

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active={active} setActive={setActive} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink-950/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white">
              {active === 'dashboard'  && 'Dashboard'}
              {active === 'create'     && 'Create New Session'}
              {active === 'classrooms' && 'Active Classrooms'}
              {active === 'history'    && 'Session History'}
            </h1>
            <p className="text-white/30 text-xs font-body mt-0.5">EduCast Admin Panel</p>
          </div>
          {liveSessions.length > 0 && (
            <div className="live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {liveSessions.length} LIVE
            </div>
          )}
        </div>

        <div className="p-8 space-y-8">
          {/* DASHBOARD */}
          {active === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ icon: Icon, label, value, accent }) => (
                  <div key={label} className="card border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-white/30 uppercase tracking-widest">{label}</span>
                      <Icon size={16} className={accent} />
                    </div>
                    <div className={`font-display font-bold text-3xl ${accent}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Live Sessions */}
              {liveSessions.length > 0 && (
                <div>
                  <h2 className="section-title mb-4">🔴 Live Sessions</h2>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {liveSessions.map(s => (
                      <SessionCard key={s.id} session={s} onStart={handleStart} onEnd={handleEnd} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Idle Sessions */}
              {idleSessions.length > 0 && (
                <div>
                  <h2 className="section-title mb-4">Scheduled Sessions</h2>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {idleSessions.map(s => (
                      <SessionCard key={s.id} session={s} onStart={handleStart} onEnd={handleEnd} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {sessions.length === 0 && (
                <div className="text-center py-20">
                  <PlayCircle size={40} className="text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 font-body text-sm">No sessions yet.</p>
                  <button onClick={() => setActive('create')} className="btn-primary mt-4 text-sm">
                    Create Your First Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CREATE SESSION */}
          {active === 'create' && (
            <div className="max-w-xl animate-fade-in">
              <div className="card border border-white/5">
                <h2 className="section-title mb-1">New Broadcast Session</h2>
                <p className="text-white/40 text-sm font-body mb-6">Fill in the details below to create a session. Start it when the lecturer is ready.</p>
                <CreateSessionForm onSubmit={handleCreate} loading={creating} />
              </div>
            </div>
          )}

          {/* ACTIVE CLASSROOMS */}
          {active === 'classrooms' && (
            <div className="animate-fade-in">
              <h2 className="section-title mb-4">Connected Classrooms</h2>
              {liveSessions.length === 0 ? (
                <div className="text-center py-16">
                  <Tv2 size={36} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm font-body">No sessions are live right now.</p>
                </div>
              ) : classrooms.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={36} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm font-body">No classrooms have joined yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {classrooms.map(c => (
                    <div key={c.id} className="card border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-400">WATCHING</span>
                      </div>
                      <p className="font-display font-semibold text-white text-sm">{c.name}</p>
                      <p className="text-white/30 text-xs font-body mt-0.5">
                        Joined {c.joinedAt?.toDate ? c.joinedAt.toDate().toLocaleTimeString() : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {active === 'history' && (
            <div className="animate-fade-in">
              <h2 className="section-title mb-4">All Sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-white/30 text-sm font-body text-center py-16">No sessions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => {
                    const d = s.createdAt?.toDate ? s.createdAt.toDate() : null;
                    return (
                      <div key={s.id} className="flex items-center gap-4 p-4 card border border-white/5 hover:border-white/10 transition-all">
                        <StatusBadge status={s.status} />
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-white text-sm truncate">{s.title}</p>
                          <p className="text-white/30 text-xs font-body truncate">{s.description || 'No description'}</p>
                        </div>
                        <p className="text-white/20 text-xs font-mono flex-shrink-0">
                          {d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </p>
                        {s.status !== 'live' && (
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors rounded">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
