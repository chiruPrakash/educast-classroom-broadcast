import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getUserRole } from '../services/authService';
import Logo from '../components/shared/Logo';
import { Eye, EyeOff, Tv2, GraduationCap, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      const role = await getUserRole(user.uid);
      if (role === 'admin') navigate('/admin');
      else if (role === 'lecturer') navigate('/lecturer');
      else navigate('/classroom');
    } catch (err) {
      setError(err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-[#0F1117] border-r border-white/5 p-10">
        <Logo size="md" />
        <div className="space-y-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-white leading-tight mb-3">
              Live Classroom<br />Broadcasting<br />
              <span className="text-emerald-400">Platform</span>
            </h1>
            <p className="text-white/40 text-sm font-body leading-relaxed">
              Deliver live lectures to multiple classrooms simultaneously with ultra-low latency.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, label: 'Admin', desc: 'Manage sessions & users' },
              { icon: GraduationCap, label: 'Lecturer', desc: 'Broadcast your lecture' },
              { icon: Tv2, label: 'Classroom', desc: 'Watch live sessions' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Icon size={16} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-display font-semibold text-white">{label}</div>
                  <div className="text-xs text-white/40">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs font-body">EduCast v1.0 — College Demo</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-white mb-1">Welcome back</h2>
            <p className="text-white/40 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs font-body">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 justify-center flex items-center gap-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white/3 border border-white/5 rounded-xl">
            <p className="text-white/30 text-xs font-mono mb-2 uppercase tracking-widest">Demo Hint</p>
            <p className="text-white/40 text-xs font-body">
              Create accounts via Firebase Console or use the Admin setup utility. See README for setup instructions.
            </p>
          </div>

          {/* Classroom viewer — no login required */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/classroom')}
              className="text-white/40 hover:text-emerald-400 text-xs font-body transition-colors underline underline-offset-4"
            >
              Continue as Classroom Viewer →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
