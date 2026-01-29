import { useEffect, useState } from 'react';
import api from '../../api';
import { useTranslation } from 'react-i18next';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalVisits: number;
  visitsToday?: number;
  totalStorage: number;
  activeUsersToday: number;
  currentActiveUsers?: number;
}

interface VisitLog {
  id: number;
  ip: string;
  userAgent: string;
  createdAt: string;
  project: {
    name: string;
    user: {
      username: string;
    };
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitLog[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(console.error);
    api.get('/admin/visit-logs?limit=10').then(res => setRecentVisits(res.data.logs)).catch(console.error);
  }, []);

  if (!stats) return <div>{t('common.loading')}</div>;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('admin.system_overview')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">{t('admin.total_users')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">{t('admin.total_projects')}</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalProjects}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">{t('admin.total_visits')}</p>
          <div className="flex items-end gap-2">
             <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalVisits}</p>
             {stats.visitsToday !== undefined && (
                 <span className="text-sm text-gray-500 mb-1"> (今日: {stats.visitsToday})</span>
             )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">{t('admin.storage_used')}</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{formatBytes(stats.totalStorage)}</p>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold mb-4">{t('admin.activity')}</h3>
            <p className="text-gray-600">{t('admin.active_users_today')}: <span className="font-bold text-gray-900">{stats.activeUsersToday}</span></p>
            {typeof stats.currentActiveUsers === 'number' && (
            <p className="text-gray-600 mt-2">{t('admin.online')}: <span className="font-bold text-gray-900">{stats.currentActiveUsers}</span></p>
            )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold mb-4">最近访问记录</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2">时间</th>
                            <th className="pb-2">项目</th>
                            <th className="pb-2">IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentVisits.map(log => (
                            <tr key={log.id} className="border-b last:border-0">
                                <td className="py-2">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-2">
                                    <span className="font-medium">{log.project.user.username}</span>
                                    <span className="text-gray-400">/</span>
                                    <span>{log.project.name}</span>
                                </td>
                                <td className="py-2 font-mono text-xs">{log.ip}</td>
                            </tr>
                        ))}
                        {recentVisits.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-4 text-center text-gray-400">暂无访问记录</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
