import { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { Ban, CheckCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, Trash2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SortDirection = 'asc' | 'desc';

interface AdminUserRow {
  id: string;
  username: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  lastLoginIp?: string | null;
  lastActiveAt?: string | null;
  province?: string | null;
  city?: string | null;
  school?: string | null;
  createdAt: string;
  projectCount: number;
  totalSize: number;
}

function SortIcon(props: { columnKey: string; sortKey: string; sortDirection: SortDirection }) {
  if (props.sortKey !== props.columnKey) return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
  return props.sortDirection === 'asc'
    ? <ArrowUp size={14} className="ml-1 text-blue-600" />
    : <ArrowDown size={14} className="ml-1 text-blue-600" />;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchUsers = useCallback(() => {
    api.get('/admin/users', {
      params: {
        search,
        sortBy: sortConfig.key,
        order: sortConfig.direction
      }
    }).then(res => setUsers(res.data)).catch(console.error);
  }, [search, sortConfig]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchUsers]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    const confirmMsg = newStatus === 'BANNED' ? t('admin.confirm_ban') : t('admin.confirm_activate');
    if (!confirm(confirmMsg)) return;
    
    try {
      await api.patch(`/admin/users/${id}/status`, { status: newStatus });
      fetchUsers();
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
      const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: unknown }).message : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      if (status === 404) {
        alert(t('admin.user_not_found'));
        fetchUsers();
      } else {
        alert(message || t('common.action_failed'));
      }
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete}`);
      fetchUsers();
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
      const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: unknown }).message : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      if (status === 404) {
        alert(t('admin.user_not_found'));
        fetchUsers(); // Refresh list if user not found
      } else {
        alert(message || t('common.action_failed'));
      }
    } finally {
        setDeleteModalOpen(false);
        setUserToDelete(null);
    }
  };

  const openDeleteModal = (id: string) => {
      setUserToDelete(id);
      setDeleteModalOpen(true);
  };

  const resetPassword = async (id: string) => {
    const newPassword = prompt(t('admin.enter_new_password'));
    if (!newPassword) return;
    try {
      await api.patch(`/admin/users/${id}/reset-password`, { newPassword });
      alert(t('admin.password_reset_success'));
    } catch (error: unknown) {
      const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: unknown }).message : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      alert(message || t('common.action_failed'));
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction: direction as SortDirection });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOnline = (lastActiveAt: string | null | undefined) => {
    if (!lastActiveAt) return false;
    const diff = Date.now() - new Date(lastActiveAt).getTime();
    return diff < 5 * 60 * 1000;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('admin.user_management')}</h2>
        <div className="relative">
          <input
            type="text"
            placeholder={t('admin.search_users')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center">{t('admin.user')} <SortIcon columnKey="username" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.location')} / {t('admin.school')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('projectCount')}
              >
                <div className="flex items-center">{t('common.projects')} <SortIcon columnKey="projectCount" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalSize')}
              >
                <div className="flex items-center">{t('admin.usage')} <SortIcon columnKey="totalSize" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastLoginAt')}
              >
                <div className="flex items-center">{t('admin.last_login')} <SortIcon columnKey="lastLoginAt" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">{user.username}</div>
                    {isOnline(user.lastActiveAt) && (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title={t('admin.online')}></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                    {(user.province || user.city) ? (
                        <span>{user.province || ''} {user.city || ''}</span>
                    ) : <span className="text-gray-300">-</span>}
                    {user.school && <span className="text-xs text-gray-400">{user.school}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    {user.projectCount}
                    {user.projectCount > 0 && (
                      <button 
                        onClick={() => navigate(`/admin/projects?userId=${user.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('admin.view_projects')}
                      >
                        <FolderOpen size={16} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(user.totalSize)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t('common.no')}</div>
                  {user.lastLoginIp && (
                    <div className="text-xs text-gray-400 font-mono mt-1">{user.lastLoginIp}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.status === 'ACTIVE' ? t('common.active') : t('common.banned')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.role !== 'ADMIN' && (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleStatus(user.id, user.status)}
                        className={`${user.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.status === 'ACTIVE' ? t('admin.ban_user') : t('admin.activate_user')}
                      >
                        {user.status === 'ACTIVE' ? <Ban size={18} /> : <CheckCircle size={18} />}
                      </button>
                      <button 
                        onClick={() => resetPassword(user.id)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="重置密码"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(user.id)}
                        className="text-red-600 hover:text-red-800"
                        title="删除用户"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {t('admin.no_users_found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin.confirm_delete_user')}</h3>
            <p className="text-gray-600 mb-6">
              {t('admin.confirm_delete_warning', 'Are you sure you want to delete this user? This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
