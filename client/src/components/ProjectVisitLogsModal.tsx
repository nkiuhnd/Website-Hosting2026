import { useEffect, useState } from 'react';
import api from '../api';
import { X, Smartphone, Monitor, HelpCircle, ChevronLeft, ChevronRight, Calendar, Globe } from 'lucide-react';

interface VisitLog {
  id: number;
  ip: string;
  userAgent: string;
  createdAt: string;
}

interface ProjectVisitLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const parseUserAgent = (ua: string) => {
    if (!ua) return { os: 'Unknown', browser: 'Unknown', device: 'Unknown', icon: HelpCircle };
    
    let os = 'Unknown';
    let browser = 'Unknown';
    let device = 'Desktop';
    let icon = Monitor;

    // Simple OS detection
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) { os = 'Android'; device = 'Mobile'; icon = Smartphone; }
    else if (/iPhone|iPad|iPod/.test(ua)) { os = 'iOS'; device = 'Mobile'; icon = Smartphone; }

    // Simple Browser detection
    if (/Chrome/.test(ua) && !/Edge|OPR/.test(ua)) browser = 'Chrome';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Edge/.test(ua)) browser = 'Edge';
    else if (/OPR/.test(ua)) browser = 'Opera';
    else if (/Trident/.test(ua)) browser = 'IE';

    return { os, browser, device, icon };
};

export default function ProjectVisitLogsModal({ isOpen, onClose, projectId, projectName }: ProjectVisitLogsModalProps) {
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    if (isOpen && projectId) {
      setPage(1);
      fetchLogs(1);
    }
  }, [isOpen, projectId]);

  const fetchLogs = (p: number) => {
    setLoading(true);
    api.get(`/projects/${projectId}/visits`, {
      params: { page: p, limit: pageSize }
    })
    .then(res => {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPage(p);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">访问日志详情</h3>
            <p className="text-sm text-gray-500 mt-1">项目: {projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">来源 IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备环境</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p>加载中...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    暂无访问记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const ua = parseUserAgent(log.userAgent);
                  const Icon = ua.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-gray-400" />
                            {log.ip || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${ua.device === 'Mobile' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{ua.os}</span>
                            <span className="text-xs text-gray-500">{ua.browser}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-500">
                共 {total} 条记录
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => fetchLogs(page - 1)}
                    disabled={page === 1 || loading}
                    className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="px-4 py-2 bg-white border rounded text-sm flex items-center">
                    {page} / {Math.max(1, totalPages)}
                </span>
                <button
                    onClick={() => fetchLogs(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
