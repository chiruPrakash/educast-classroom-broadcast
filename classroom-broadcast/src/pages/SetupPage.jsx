// Admin Setup Utility
// Use this page ONCE to create your initial admin & lecturer accounts
// Navigate to /setup to use it, then disable by removing the route

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdminAccount, createLecturerAccount } from '../services/authService';
import Logo from '../components/shared/Logo';
import { ShieldCheck, GraduationCap, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('admin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setDone('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (tab === 'admin') {
        await createAdminAccount(form.email, form.password, form.name);
        setDone(`Admin account created for ${form.email}`);
      } else {
        await createLecturerAccount(form.email, form.password, form.name);
        setDone(`Lecturer account created for ${form.email}`);
      }
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="md" />
          <h1 className="font-display font-bold text-2xl text-white mt-4 mb-1">Account Setup</h1>
          <p className="text-white/40 text-sm font-body">Create your initial admin and lecturer accounts.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-300 text-xs font-mono">SETUP MODE — Disable after use</span>
          </div>
        </div>

        <div className="card border border-white/5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-ink-900/60 rounded-xl mb-6">
            {[
              { id: 'admin',    label: 'Admin',    Icon: ShieldCheck },
              { id: 'lecturer', label: 'Lecturer', Icon: GraduationCap },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-body transition-all
                  ${tab === id ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input-field" placeholder="Dr. Jane Smith" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" placeholder="admin@college.edu" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password (min 6 chars)</label>
              <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            </div>

            {error && <p className="text-red-400 text-xs font-body">{error}</p>}
            {done && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle size={14} className="text-emerald-400" />
                <p className="text-emerald-300 text-xs font-body">{done}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
              {loading ? 'Creating…' : `Create ${tab === 'admin' ? 'Admin' : 'Lecturer'} Account`}
            </button>
          </form>
        </div>

        <button onClick={() => navigate('/login')}
          className="mt-4 w-full text-center text-white/30 hover:text-white/60 text-xs font-body transition-colors">
          ← Back to Login
        </button>
      </div>
    </div>
  );
}
