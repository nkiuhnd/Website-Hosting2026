import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { LayoutDashboard, Users, FileText, LogOut, AlertTriangle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold">{t('common.admin_panel')}</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <LayoutDashboard size={20} /> {t('common.dashboard')}
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <Users size={20} /> {t('common.users')}
          </Link>
          <Link to="/admin/projects" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <FileText size={20} /> {t('common.projects')}
          </Link>
          <Link to="/admin/reports" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <AlertTriangle size={20} /> 违规举报
          </Link>
          <Link to="/admin/messages" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <Mail size={20} /> 站内信
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-4">
          <div className="px-3">
             <LanguageSwitcher />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 p-3 w-full text-red-400 hover:bg-gray-800 rounded transition">
            <LogOut size={20} /> {t('common.logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
