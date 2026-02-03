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
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [announcementFeedback, setAnnouncementFeedback] = useState<string | null>(null);
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

  const sendAnnouncement = async () => {
    if (announcementSending) return;
    const content = announcementContent.trim();
    const title = announcementTitle.trim();
    if (!content) {
      setAnnouncementFeedback('公告内容不能为空');
      return;
    }
    setAnnouncementSending(true);
    setAnnouncementFeedback(null);
    try {
      await api.post('/admin/announcements', { title, content });
      setAnnouncementFeedback('公告已发布');
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data)
        ? (data as { message?: unknown }).message
        : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      setAnnouncementFeedback(message || '发布失败');
    } finally {
      setAnnouncementSending(false);
    }
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

      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4">发布公告</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">标题</label>
            <input
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="系统公告"
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">内容</label>
          <textarea
            value={announcementContent}
            onChange={(e) => setAnnouncementContent(e.target.value)}
            rows={4}
            className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={sendAnnouncement}
            disabled={announcementSending}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition"
          >
            {announcementSending ? '发布中...' : '发布公告'}
          </button>
          {announcementFeedback && (
            <span className={`text-sm ${announcementFeedback.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
              {announcementFeedback}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
