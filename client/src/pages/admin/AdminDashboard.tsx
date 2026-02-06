import { useEffect, useState } from 'react';
import api from '../../api';
import { useTranslation } from 'react-i18next';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import { Users, Folder, MousePointer, HardDrive, Zap, Globe, Activity } from 'lucide-react';

interface ChartData {
  date: string;
  visits: number;
  users: number;
  projects: number;
}

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalVisits: number;
  visitsToday?: number;
  totalStorage: number;
  activeUsersToday: number;
  currentActiveUsers?: number;
  chartData?: ChartData[];
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

  if (!stats) return <div className="p-8 flex justify-center">{t('common.loading')}</div>;

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

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t('admin.system_overview')}</h2>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
           {new Date().toLocaleDateString()}
        </span>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('admin.total_users')}
          value={stats.totalUsers}
          subValue={`今日活跃: ${stats.activeUsersToday}`}
          icon={Users}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <StatCard
          title={t('admin.total_projects')}
          value={stats.totalProjects}
          subValue="托管项目总数"
          icon={Folder}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <StatCard
          title={t('admin.total_visits')}
          value={stats.totalVisits.toLocaleString()}
          subValue={`今日: ${stats.visitsToday}`}
          icon={MousePointer}
          colorClass="text-green-600"
          bgClass="bg-green-50"
        />
        <StatCard
          title={t('admin.storage_used')}
          value={formatBytes(stats.totalStorage)}
          subValue="总占用空间"
          icon={HardDrive}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trend Chart (Visits) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              近7天访问趋势
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData || []}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#374151' }}
                />
                <Area type="monotone" dataKey="visits" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" name="访问量" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Chart (Users & Projects) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              新增趋势
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="users" name="新用户" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="projects" name="新项目" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Status & Recent Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                实时状态
            </h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">当前在线用户</span>
                    <span className="text-2xl font-bold text-green-600">{stats.currentActiveUsers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">今日活跃用户</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.activeUsersToday}</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800 mb-2 font-medium">系统公告</p>
                    <div className="space-y-3">
                        <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
                            <input
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                placeholder="标题"
                                className="w-full text-sm px-4 py-3 border-b border-gray-100 focus:outline-none focus:bg-blue-50/30 transition-colors placeholder-gray-400 font-medium"
                            />
                            <textarea
                                value={announcementContent}
                                onChange={(e) => setAnnouncementContent(e.target.value)}
                                rows={3}
                                placeholder="内容..."
                                className="w-full text-sm px-4 py-3 focus:outline-none focus:bg-blue-50/30 transition-colors resize-none placeholder-gray-400 block"
                            />
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className={`text-xs ${announcementFeedback?.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
                                {announcementFeedback}
                            </span>
                            <button
                                onClick={sendAnnouncement}
                                disabled={announcementSending}
                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {announcementSending ? '发送中' : '发布'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Recent Visits Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">最近访问记录</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部</button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                            <th className="pb-3 font-medium pl-2">时间</th>
                            <th className="pb-3 font-medium">项目 / 用户</th>
                            <th className="pb-3 font-medium">来源 IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {recentVisits.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 pl-2 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{log.project.name}</span>
                                        <span className="text-xs text-gray-400">{log.project.user.username}</span>
                                    </div>
                                </td>
                                <td className="py-3 font-mono text-xs text-gray-500">{log.ip}</td>
                            </tr>
                        ))}
                        {recentVisits.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-gray-400">暂无访问记录</td>
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