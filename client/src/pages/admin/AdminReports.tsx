import { useState, useEffect } from 'react';
import api from '../../api';
import { AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface Report {
  id: number;
  type: string;
  content: string;
  targetUrl: string;
  projectId?: string;
  ip?: string;
  status: 'PENDING' | 'HANDLED' | 'DISMISSED';
  createdAt: string;
  project?: {
    name: string;
    status: string;
  };
  user?: {
    id: string;
    username: string;
    status: string;
  };
  userViolationCount?: number;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ARCHIVED'>('PENDING');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
    } catch (error) {
      console.error('Fetch reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      // Optimistic update
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));

      await api.patch(`/admin/reports/${id}`, { status });
      fetchReports();
    } catch (error) {
      console.error('Update report status error:', error);
      alert('更新失败');
      fetchReports(); // Revert on error
    }
  };

  const banUser = async (userId: string) => {
    if (!window.confirm('确认封禁该用户账号？该用户将无法登录及访问所有项目。')) return;
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: 'BANNED' });
      fetchReports();
    } catch (error) {
      console.error('Ban user error:', error);
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HANDLED':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle size={12}/> 已处理</span>;
      case 'DISMISSED':
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">已忽略</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock size={12}/> 待处理</span>;
    }
  };

  const filteredReports = reports.filter(report => {
    if (activeTab === 'PENDING') return report.status === 'PENDING';
    return report.status === 'HANDLED' || report.status === 'DISMISSED';
  });

  if (loading) return <div className="text-center py-10">加载中...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <AlertTriangle className="text-red-500" /> 违规举报管理
      </h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'PENDING'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          待处理 ({reports.filter(r => r.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ARCHIVED'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          已处理历史
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">举报信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">违规用户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">举报来源</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  没有{activeTab === 'PENDING' ? '待处理' : '历史'}记录
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-medium">{report.type}</span>
                    <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium mb-1">{report.content}</div>
                  <a href={report.targetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                    {report.targetUrl} <ExternalLink size={10} />
                  </a>
                </td>
                <td className="px-6 py-4">
                  {report.user ? (
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">{report.user.username}</span>
                          {report.user.status === 'BANNED' && (
                             <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">已封号</span>
                          )}
                       </div>
                       <div className="text-xs text-gray-500">
                         累计封禁项目: <span className={`font-medium ${report.userViolationCount! > 0 ? 'text-red-600' : 'text-gray-700'}`}>{report.userViolationCount}</span>
                       </div>
                       <div className="mt-1">
                         {report.user.status !== 'BANNED' && report.userViolationCount! >= 3 && (
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs text-orange-600 flex items-center gap-1">
                                 <AlertTriangle size={12}/> 建议封号
                               </span>
                               <button 
                                 onClick={() => banUser(report.user!.id)}
                                 className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 transition-colors"
                               >
                                 封禁账号
                               </button>
                             </div>
                           )
                         }
                       </div>
                     </div>
                  ) : <span className="text-gray-400 text-sm">未识别用户</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  IP: {report.ip || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(report.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    {activeTab === 'PENDING' ? (
                      <>
                        <button 
                           onClick={() => handleStatusChange(report.id, 'HANDLED')}
                           className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-100 border border-red-200"
                        >
                          确认违规(封禁)
                        </button>
                        <button 
                           onClick={() => handleStatusChange(report.id, 'DISMISSED')}
                           className="bg-gray-50 text-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-100 border border-gray-200"
                        >
                          忽略举报
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">无需操作</span>
                    )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
