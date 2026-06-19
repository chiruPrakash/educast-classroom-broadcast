// EduCast Logo Component
export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { img: 32, text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 40, text: 'text-base', sub: 'text-xs' },
    lg: { img: 52, text: 'text-xl', sub: 'text-sm' },
  };
  const n = sizes[size] || sizes.md;
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/vemu-logo.jpg"
        alt="VEMU Institute of Technology"
        width={n.img}
        height={n.img}
        className="rounded-full object-cover border-2 border-emerald-400/30 shadow-lg flex-shrink-0"
        style={{ minWidth: n.img }}
      />
      <div className="flex flex-col leading-tight">
        <span className={`font-display font-bold ${n.text} text-white tracking-tight`}>
          Edu<span className="text-emerald-400">Cast</span>
        </span>
        <span className={`font-body ${n.sub} text-white/40 tracking-wide uppercase`}>
          VEMU Institute of Technology
        </span>
      </div>
    </div>
  );
}
