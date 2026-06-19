export default function StatusBadge({ status }) {
  const map = {
    live:   { cls: 'bg-red-500/15 text-red-400 border-red-500/30',     dot: 'bg-red-400',     label: 'LIVE' },
    idle:   { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400',   label: 'SCHEDULED' },
    ended:  { cls: 'bg-white/5 text-white/40 border-white/10',          dot: 'bg-white/30',    label: 'ENDED' },
  };
  const { cls, dot, label } = map[status] ?? map.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
