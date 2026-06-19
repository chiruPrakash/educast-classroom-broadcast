import Logo from './Logo';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-ink-950 flex flex-col items-center justify-center gap-6 z-50">
      <Logo size="lg" />
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-white/40 text-sm font-body">{message}</p>
      </div>
    </div>
  );
}
