import { Radio, Clock } from 'lucide-react';

export default function SessionList({ sessions, onJoin, joining }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-white/3 flex items-center justify-center mx-auto mb-4">
          <Radio size={24} className="text-white/10" />
        </div>
        <p className="text-white/40 font-body text-sm">No live sessions right now</p>
        <p className="text-white/20 font-body text-xs mt-1">Check back later or ask your lecturer</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map(session => (
        <div key={session.id}
          className="card border border-red-500/10 hover:border-red-500/20 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE
            </span>
          </div>
          <h3 className="font-display font-bold text-white text-base mb-1 group-hover:text-emerald-400 transition-colors">
            {session.title}
          </h3>
          <p className="text-white/40 text-xs font-body line-clamp-2 mb-4 leading-relaxed">
            {session.description || 'No description provided.'}
          </p>
          <button
            onClick={() => onJoin(session)}
            disabled={joining === session.id}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {joining === session.id
              ? <><span className="w-3 h-3 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />Joining…</>
              : <>Join Session →</>
            }
          </button>
        </div>
      ))}
    </div>
  );
}
