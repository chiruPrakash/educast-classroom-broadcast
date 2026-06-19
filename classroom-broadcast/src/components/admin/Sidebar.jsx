import { LayoutDashboard, PlusCircle, History, Tv2, LogOut } from 'lucide-react';
import Logo from '../shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',          id: 'dashboard' },
  { icon: PlusCircle,       label: 'New Session',        id: 'create' },
  { icon: Tv2,              label: 'Active Classrooms',  id: 'classrooms' },
  { icon: History,          label: 'Session History',    id: 'history' },
];

export default function AdminSidebar({ active, setActive }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-[#0F1117] border-r border-white/5 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <Logo size="sm" />
      </div>
      <div className="px-3 py-4 mt-1">
        <p className="label px-2">Navigation</p>
        <nav className="space-y-0.5">
          {NAV.map(({ icon: Icon, label, id }) => (
            <div key={id} onClick={() => setActive(id)}
              className={`nav-item ${active === id ? 'nav-item-active' : ''}`}>
              <Icon size={16} />{label}
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-display font-bold">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-body truncate">{user?.email}</p>
            <p className="text-white/30 text-xs font-mono">Admin</p>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-item w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/5">
          <LogOut size={15} />Sign Out
        </button>
      </div>
    </aside>
  );
}
