import { Play, Square, Clock, Users, Trash2 } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

export default function SessionCard({ session, onStart, onEnd, onDelete }) {
  const { id, title, description, status, createdAt, viewerCount } = session;

  const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`card border transition-all duration-300 hover:border-white/10 ${status === 'live' ? 'live-glow border-red-500/20' : 'border-white/5'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={status} />
          </div>
          <h3 className="font-display font-semibold text-white text-base truncate mt-1">{title}</h3>
          <p className="text-white/40 text-xs font-body mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/30 font-body mb-4">
        <span className="flex items-center gap-1">
          <Clock size={11} />{fmtDate(createdAt)}
        </span>
        {status === 'live' && (
          <span className="flex items-center gap-1 text-emerald-400/70">
            <Users size={11} />{viewerCount ?? 0} watching
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === 'idle' && (
          <button onClick={() => onStart(id)} className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5">
            <Play size={13} />Start Session
          </button>
        )}
        {status === 'live' && (
          <button onClick={() => onEnd(id)} className="btn-danger text-xs py-2 px-3 flex items-center gap-1.5">
            <Square size={13} />End Session
          </button>
        )}
        {status === 'ended' && (
          <span className="text-xs text-white/20 font-mono">Session concluded</span>
        )}
        {status !== 'live' && (
          <button onClick={() => onDelete(id)} className="ml-auto p-2 text-white/20 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
