import { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { Ban, CheckCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, Trash2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SortDirection = 'asc' | 'desc';

interface AdminUserRow {
  id: string;
  username: string;
  phone?: string | null;
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });
  const [filters, setFilters] = useState({
    lastActiveAfter: '', // '24h', '7d', '30d'
    minStorage: '', // MB
    maxStorage: '', // MB
    minProjectCount: '',
    maxProjectCount: ''
  });
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const fetchUsers = useCallback(() => {
    // Calculate date string for lastActiveAfter
    let activeDateStr = '';
    if (filters.lastActiveAfter) {
      const now = new Date();
      if (filters.lastActiveAfter === '24h') now.setDate(now.getDate() - 1);
      if (filters.lastActiveAfter === '7d') now.setDate(now.getDate() - 7);
      if (filters.lastActiveAfter === '30d') now.setDate(now.getDate() - 30);
      activeDateStr = now.toISOString();
    }

    api.get('/admin/users', {
      params: {
        search,
        page,
        limit: pageSize,
        sortBy: sortConfig.key,
        order: sortConfig.direction,
        lastActiveAfter: activeDateStr || undefined,
        minStorage: filters.minStorage || undefined,
        maxStorage: filters.maxStorage || undefined,
        minProjectCount: filters.minProjectCount || undefined,
        maxProjectCount: filters.maxProjectCount || undefined
      }
    }).then(res => {
      // Backend now returns { data, total, page, totalPages }
      // Or fallback to array if older backend (handled for safety)
      if (res.data.data) {
          setUsers(res.data.data);
          setTotal(res.data.total);
      } else if (Array.isArray(res.data)) {
          setUsers(res.data);
          setTotal(res.data.length);
      }
    }).catch(console.error);
  }, [search, sortConfig, page, pageSize, filters]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchUsers]);

  const exportData = async () => {
    try {
      // Fetch all data for export
      const res = await api.get('/admin/users', {
        params: {
          search,
          limit: 'all', // Backend should handle this to return all
          sortBy: sortConfig.key,
          order: sortConfig.direction,
          lastActiveAfter: filters.lastActiveAfter ? (() => {
             const now = new Date();
             if (filters.lastActiveAfter === '24h') now.setDate(now.getDate() - 1);
             if (filters.lastActiveAfter === '7d') now.setDate(now.getDate() - 7);
             if (filters.lastActiveAfter === '30d') now.setDate(now.getDate() - 30);
             return now.toISOString();
          })() : undefined,
          minStorage: filters.minStorage || undefined,
          maxStorage: filters.maxStorage || undefined,
          minProjectCount: filters.minProjectCount || undefined,
          maxProjectCount: filters.maxProjectCount || undefined
        }
      });
      
      const dataToExport = res.data.data || res.data;
      if (!Array.isArray(dataToExport)) return;

      const csvContent = [
        ['ID', '用户名', '手机号', '角色', '状态', '注册时间', '最后登录', '省份', '城市', '学校', '项目数', '总占用空间(B)'],
        ...dataToExport.map((u: AdminUserRow) => [
          u.id,
          u.username,
          u.phone || '',
          u.role,
          u.status,
          new Date(u.createdAt).toLocaleString(),
          u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '',
          u.province || '',
          u.city || '',
          u.school || '',
          u.projectCount,
          u.totalSize
        ])
      ].map(e => e.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed', e);
      alert(t('common.action_failed'));
    }
  };

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

  const sendVerificationCode = async () => {
    try {
      await api.post('/admin/send-verify-code');
      setCodeSent(true);
      setCountdown(60);
      alert(t('common.verification_code_sent'));
    } catch (error: unknown) {
      const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: unknown }).message : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      alert(message || t('common.action_failed'));
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (!verifyCode) {
      alert(t('common.verification_code_required'));
      return;
    }
    try {
      await api.delete(`/admin/users/${userToDelete}`, {
        headers: {
          'x-verify-code': verifyCode
        }
      });
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
        setVerifyCode('');
        setCodeSent(false);
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">{t('admin.user_management')}</h2>
          <div className="flex gap-2">
            <button
                onClick={exportData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
                <FolderOpen size={18} />
                导出数据
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <input
                type="text"
                placeholder={t('admin.search_users')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            <select
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={filters.lastActiveAfter}
                onChange={(e) => setFilters(prev => ({ ...prev, lastActiveAfter: e.target.value }))}
            >
                <option value="">所有登录时间</option>
                <option value="24h">最近24小时登录</option>
                <option value="7d">最近7天登录</option>
                <option value="30d">最近30天登录</option>
            </select>
            
            <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-600 text-sm">每页:</span>
                <select
                    className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                    }}
                >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 items-center border-t pt-4">
            <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">用量(MB):</span>
                <div className="flex items-center gap-1">
                  <input
                      type="number"
                      placeholder="Min"
                      value={filters.minStorage}
                      onChange={(e) => setFilters(prev => ({ ...prev, minStorage: e.target.value }))}
                      className="px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none w-20 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxStorage}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxStorage: e.target.value }))}
                      className="px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none w-20 text-sm"
                  />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">项目数量:</span>
                <div className="flex items-center gap-1">
                  <input
                      type="number"
                      placeholder="Min"
                      value={filters.minProjectCount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minProjectCount: e.target.value }))}
                      className="px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none w-20 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxProjectCount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxProjectCount: e.target.value }))}
                      className="px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none w-20 text-sm"
                  />
                </div>
            </div>
          </div>
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
                <div className="flex items-center">{t('common.username')} <SortIcon columnKey="username" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('projectCount')}
              >
                <div className="flex items-center">项目数量 <SortIcon columnKey="projectCount" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalSize')}
              >
                <div className="flex items-center">{t('admin.usage')} <SortIcon columnKey="totalSize" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">注册时间 <SortIcon columnKey="createdAt" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
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
                     <span>{user.phone || <span className="text-gray-300">-</span>}</span>
                     <div className="text-xs text-gray-400 mt-1">
                        {(user.province || user.city) ? `${user.province || ''} ${user.city || ''}` : ''}
                        {user.school && (user.province || user.city ? ' · ' : '') + user.school}
                        {!user.province && !user.city && !user.school && <span className="text-gray-300">-</span>}
                     </div>
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
                  {new Date(user.createdAt).toLocaleString()}
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
                        className="text-yellow-600 hover:text-yellow-900"
                        title={t('admin.reset_password')}
                      >
                        <KeyRound size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(user.id)}
                        className="text-gray-400 hover:text-red-600"
                        title={t('admin.delete_user')}
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
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  {t('common.no_data')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
                显示 {((page - 1) * pageSize) + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    上一页
                </button>
                <span className="px-3 py-1 border rounded bg-white">
                    {page} / {Math.max(1, Math.ceil(total / pageSize))}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(total / pageSize)}
                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    下一页
                </button>
            </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin.confirm_delete_user')}</h3>
            <p className="text-gray-600 mb-6">
              {t('admin.confirm_delete_warning', 'Are you sure you want to delete this user? This action cannot be undone.')}
            </p>

            {/* Verification Code Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('common.verification_code', 'SMS Verification Code')}
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder="123456"
                    />
                    <button
                        onClick={sendVerificationCode}
                        disabled={countdown > 0}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                            countdown > 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                    >
                        {countdown > 0 ? `${countdown}s` : (codeSent ? t('common.resend') : t('common.send_code'))}
                    </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    验证码将发送至管理员手机号 (尾号8879)
                </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={!verifyCode}
                className={`px-4 py-2 rounded-md transition-colors ${
                    !verifyCode 
                    ? 'bg-red-300 text-white cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
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
