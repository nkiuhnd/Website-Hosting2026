import { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { Search, Calendar, FolderOpen, Smartphone, Monitor, Globe, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export default function AdminVisitLogs() {
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  // Granular filters state
  const [ipFilter, setIpFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Applied filters state (for confirm-to-search behavior)
  const [appliedIp, setAppliedIp] = useState('');
  const [appliedProject, setAppliedProject] = useState('');
  const [appliedUser, setAppliedUser] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();

  const fetchLogs = useCallback(() => {
    setLoading(true);
    // Safely format dates
    let startIso = undefined;
    if (appliedStartDate) {
        const d = new Date(appliedStartDate);
        if (!isNaN(d.getTime())) startIso = d.toISOString();
    }
    
    let endIso = undefined;
    if (appliedEndDate) {
        const d = new Date(appliedEndDate);
        if (!isNaN(d.getTime())) endIso = d.toISOString();
    }

    api.get('/admin/visit-logs', {
      params: {
        page,
        limit: pageSize,
        ip: appliedIp,
        projectName: appliedProject,
        username: appliedUser,
        startDate: startIso,
        endDate: endIso,
        _t: Date.now(), // Prevent caching
      }
    }).then(res => {
        setLogs(res.data.logs);
        setTotal(res.data.total);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize, appliedIp, appliedProject, appliedUser, appliedStartDate, appliedEndDate, refreshTrigger]);

  // Initial load and handle page/size changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(1);
    setAppliedIp(ipFilter);
    setAppliedProject(projectFilter);
    setAppliedUser(userFilter);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setRefreshTrigger(prev => prev + 1);
  };


  const exportData = async () => {
    try {
      // Safely format dates for export
      let startIso = undefined;
      if (appliedStartDate) {
          const d = new Date(appliedStartDate);
          if (!isNaN(d.getTime())) startIso = d.toISOString();
      }
      
      let endIso = undefined;
      if (appliedEndDate) {
          const d = new Date(appliedEndDate);
          if (!isNaN(d.getTime())) endIso = d.toISOString();
      }

      const res = await api.get('/admin/visit-logs', {
        params: {
          limit: '10000', // Reasonable limit for export
          ip: appliedIp,
          projectName: appliedProject,
          username: appliedUser,
          startDate: startIso,
          endDate: endIso,
        }
      });
      
      const dataToExport = res.data.logs;
      if (!Array.isArray(dataToExport)) return;

      const csvContent = [
        ['ID', '访问时间', '项目', '所有者', 'IP地址', '操作系统', '浏览器', 'UserAgent'],
        ...dataToExport.map((log: VisitLog) => {
            const ua = parseUserAgent(log.userAgent);
            return [
                log.id,
                new Date(log.createdAt).toLocaleString(),
                log.project.name,
                log.project.user.username,
                log.ip || 'Unknown',
                ua.os,
                ua.browser,
                `"${(log.userAgent || '').replace(/"/g, '""')}"` // Escape quotes for CSV
            ];
        })
      ].map(e => e.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `visit_logs_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed', e);
      alert(t('common.action_failed'));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            流量监控台
          </h2>
          <div className="flex gap-2">
            <button
                onClick={exportData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
            >
                <FolderOpen size={18} />
                导出日志
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索 IP地址..."
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="搜索 项目名称..."
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
              <FolderOpen className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="搜索 用户名..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
               <div className="relative">
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-56"
                  />
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
               </div>
               <span className="text-gray-400">-</span>
               <div className="relative">
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-56"
                  />
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
               </div>
            </div>

            <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
                搜索
            </button>

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
                    <option value="200">200</option>
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {(appliedIp || appliedProject || appliedUser || appliedStartDate || appliedEndDate) && (
            <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2 flex-wrap">
                <Search size={14} />
                <span>当前筛选: </span>
                {appliedIp && <span className="font-medium bg-blue-100 px-2 py-0.5 rounded">IP: "{appliedIp}"</span>}
                {appliedProject && <span className="font-medium bg-blue-100 px-2 py-0.5 rounded">项目: "{appliedProject}"</span>}
                {appliedUser && <span className="font-medium bg-blue-100 px-2 py-0.5 rounded">用户: "{appliedUser}"</span>}
                
                {(appliedStartDate || appliedEndDate) && <span className="mx-1 text-gray-400">|</span>}
                {appliedStartDate && <span>{new Date(appliedStartDate).toLocaleString()} 起</span>}
                {appliedEndDate && <span> 至 {new Date(appliedEndDate).toLocaleString()}</span>}
                <button 
                    onClick={() => {
                        setIpFilter('');
                        setProjectFilter('');
                        setUserFilter('');
                        setStartDate('');
                        setEndDate('');
                        
                        setAppliedIp('');
                        setAppliedProject('');
                        setAppliedUser('');
                        setAppliedStartDate('');
                        setAppliedEndDate('');
                        setRefreshTrigger(p => p + 1);
                    }}
                    className="ml-auto text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                    清除筛选
                </button>
            </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访客信息 (IP)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备环境</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问项目</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const ua = parseUserAgent(log.userAgent);
              const DeviceIcon = ua.icon;
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <Globe size={16} className="text-gray-400" />
                        <span className="text-sm font-mono text-gray-700">{log.ip || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2" title={log.userAgent}>
                        <DeviceIcon size={16} className={ua.device === 'Mobile' ? 'text-purple-500' : 'text-blue-500'} />
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-900">{ua.os}</span>
                            <span className="text-xs text-gray-500">{ua.browser}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{log.project.name}</span>
                        <span className="text-xs text-gray-500">@{log.project.user.username}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  暂无访问记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-gray-50 border border-gray-200 rounded-lg mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {((page - 1) * pageSize) + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              上一页
            </button>
            <span className="px-3 py-1 border rounded bg-white">
              {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              下一页
            </button>
          </div>
      </div>
    </div>
  );
}
