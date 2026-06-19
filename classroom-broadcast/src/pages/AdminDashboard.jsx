// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Radio, History, Users, LogOut,
  Plus, X, CheckCircle, AlertCircle, Tv, ChevronRight,
  Activity, Clock
} from 'lucide-react';
import {
  createSession, startSession, endSession,
  subscribeToSessions, subscribeToClassrooms,
  logoutAdmin,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { Logo, StatusBadge } from '../components/shared/StatusBadge';
import SessionCard from '../components/shared/SessionCard';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatDistanceToNow } from 'date-fns';

// ─── Sub-views ────────────────────────────────────────────────
function StatsBar({ sessions, classrooms }) {
  const live       = sessions.filter(s => s.status === 'live').length;
  const scheduled  = sessions.filter(s => s.status === 'scheduled').length;
  const ended      = sessions.filter(s => s.status === 'ended').length;
  const watching   = classrooms.filter(c => c.status === 'watching').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Live Now', value: live, icon: Radio, color: 'red', glow: true },
        { label: 'Scheduled', value: scheduled, icon: Clock, color: 'amber' },
        { label: 'Classrooms Active', value: watching, icon: Tv, color: 'brand' },
        { label: 'Total Sessions', value: sessions.length, icon: Activity, color: 'slate' },
      ].map(({ label, value, icon: Icon, color, glow }) => (
        <div key={label} className="glass rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg bg-${color}-500/15 flex items-center justify-center`}>
              <Icon size={16} className={`text-${color}-400`} />
            </div>
            {glow && value > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400 live-dot" />
            )}
          </div>
          <div className="font-display font-bold text-2xl text-white">{value}</div>
          <div className="text-slate-500 text-xs mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function CreateSessionModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required.');
    setBusy(true);
    try {
      const id = await createSession({ title: title.trim(), description: desc.trim(), adminId: user?.uid });
      onCreated(id);
      onClose();
    } catch (err) {
      setError('Failed to create session. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-xl text-white">New Session</h3>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Session Title *</label>
            <input
              className="input-field"
              placeholder="e.g. AI Workshop"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="e.g. Introduction to Artificial Intelligence"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Creating…' : <><CheckCircle size={14} />Create Session</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassroomsView({ classrooms }) {
  const active = classrooms.filter(c => c.status === 'watching');
  const idle   = classrooms.filter(c => c.status !== 'watching');

  const timeAgo = (ts) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true }); }
    catch { return 'just now'; }
  };

  return (
    <div>
      <h2 className="font-display font-semibold text-lg text-white mb-4">
        Active Classrooms
        <span className="ml-2 text-sm text-slate-500 font-body font-normal">
          ({active.length} watching)
        </span>
      </h2>

      {classrooms.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Tv size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No classrooms connected yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...active, ...idle].map(c => (
            <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.status === 'watching' ? 'bg-emerald-400 live-dot' : 'bg-slate-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-white text-sm truncate">{c.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {c.status === 'watching' ? 'Watching live session' : 'Idle'}
                  {c.lastSeen && ` · ${timeAgo(c.lastSeen)}`}
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-display font-semibold ${
                c.status === 'watching'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
              }`}>
                {c.status === 'watching' ? 'Watching' : 'Idle'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [view, setView]           = useState('dashboard'); // dashboard | history | classrooms
  const [sessions, setSessions]   = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    const unsubS = subscribeToSessions(setSessions);
    const unsubC = subscribeToClassrooms(setClassrooms);
    return () => { unsubS(); unsubC(); };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStart = async (id) => {
    try {
      await startSession(id, user?.uid);
      showToast('Session is now live!');
    } catch { showToast('Failed to start session', 'error'); }
  };

  const handleEnd = async (id) => {
    if (!confirm('End this session? Viewers will be disconnected.')) return;
    try {
      await endSession(id);
      showToast('Session ended.');
    } catch { showToast('Failed to end session', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      showToast('Session deleted.');
    } catch { showToast('Failed to delete session', 'error'); }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/login');
  };

  // Derived views
  const liveSessions      = sessions.filter(s => s.status === 'live');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');
  const endedSessions     = sessions.filter(s => s.status === 'ended');

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'classrooms', label: 'Classrooms', icon: Tv },
    { id: 'history',    label: 'History',    icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] flex flex-col p-4 gap-1">
        <div className="px-1 py-2 mb-4">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={view === id ? 'nav-item-active w-full' : 'nav-item w-full'}
            >
              <Icon size={16} />
              {label}
              {id === 'classrooms' && classrooms.filter(c => c.status === 'watching').length > 0 && (
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full font-display font-bold border border-emerald-500/20">
                  {classrooms.filter(c => c.status === 'watching').length}
                </span>
              )}
              {id === 'dashboard' && liveSessions.length > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-display font-bold border border-red-500/20 live-dot">
                  {liveSessions.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] pt-3">
          <div className="px-3 py-2 mb-2">
            <div className="text-white text-xs font-display font-semibold truncate">{user?.email}</div>
            <div className="text-slate-500 text-xs">Administrator</div>
          </div>
          <button onClick={handleLogout} className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-lg border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white capitalize">{view}</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {view === 'dashboard' && 'Overview of your broadcasting sessions'}
              {view === 'classrooms' && 'Monitor connected classroom viewers'}
              {view === 'history' && 'Past and completed sessions'}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={15} />
            New Session
          </button>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats always visible */}
          <StatsBar sessions={sessions} classrooms={classrooms} />

          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="space-y-6">
              {/* Live sessions */}
              {liveSessions.length > 0 && (
                <section>
                  <h2 className="font-display font-semibold text-base text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 live-dot" />
                    Live Now
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {liveSessions.map(s => (
                      <SessionCard key={s.id} session={s} onEnd={handleEnd} />
                    ))}
                  </div>
                </section>
              )}

              {/* Scheduled */}
              <section>
                <h2 className="font-display font-semibold text-base text-white mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  Scheduled Sessions
                  <span className="text-slate-500 font-body font-normal text-sm">({scheduledSessions.length})</span>
                </h2>
                {scheduledSessions.length === 0 ? (
                  <div className="glass rounded-xl p-10 text-center">
                    <Radio size={28} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No scheduled sessions</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto mt-4 text-xs">
                      <Plus size={13} />Create one
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scheduledSessions.map(s => (
                      <SessionCard key={s.id} session={s} onStart={handleStart} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* CLASSROOMS VIEW */}
          {view === 'classrooms' && <ClassroomsView classrooms={classrooms} />}

          {/* HISTORY VIEW */}
          {view === 'history' && (
            <div>
              <h2 className="font-display font-semibold text-lg text-white mb-4">
                Session History
                <span className="ml-2 text-sm text-slate-500 font-body font-normal">({endedSessions.length} ended)</span>
              </h2>
              {endedSessions.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                  <History size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No completed sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {endedSessions.map(s => (
                    <SessionCard key={s.id} session={s} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create session modal */}
      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => showToast(`Session created!`)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl glass border shadow-xl animate-slide-up text-sm font-body ${
          toast.type === 'error'
            ? 'border-red-500/30 text-red-400'
            : 'border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.type === 'error'
            ? <AlertCircle size={15} />
            : <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
