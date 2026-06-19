// src/components/shared/SessionCard.jsx
import React from 'react';
import { Users, Clock, PlayCircle, StopCircle, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch { return '—'; }
}

export default function SessionCard({
  session,
  onStart,
  onEnd,
  onDelete,
  actions = true,
  onClick,
}) {
  return (
    <div
      className={`glass rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-white/[0.06]' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-white text-base leading-snug truncate">
            {session.title}
          </h3>
          {session.description && (
            <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">
              {session.description}
            </p>
          )}
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-slate-500 font-body">
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {session.status === 'live'
            ? `Started ${formatTime(session.startedAt)}`
            : session.status === 'ended'
            ? `Ended ${formatTime(session.endedAt)}`
            : `Created ${formatTime(session.createdAt)}`}
        </span>
        {session.status === 'live' && (
          <span className="flex items-center gap-1.5">
            <Users size={12} />
            {session.viewerCount || 0} watching
          </span>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
          {session.status === 'scheduled' && onStart && (
            <button onClick={(e) => { e.stopPropagation(); onStart(session.id); }} className="btn-success text-xs px-3 py-2">
              <PlayCircle size={14} />
              Start Session
            </button>
          )}
          {session.status === 'live' && onEnd && (
            <button onClick={(e) => { e.stopPropagation(); onEnd(session.id); }} className="btn-danger text-xs px-3 py-2">
              <StopCircle size={14} />
              End Session
            </button>
          )}
          {onDelete && session.status !== 'live' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="ml-auto btn-icon text-red-400 hover:text-red-300"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
