import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import { Eye, EyeOff, ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Filter, Calendar, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SortDirection = 'asc' | 'desc';

interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  size: number;
  visitCount: number;
  status: string;
  entryFile?: string;
  siteUrl?: string;
  createdAt: string;
  user: {
    username: string;
  };
}

function SortIcon(props: { columnKey: string; sortKey: string; sortDirection: SortDirection }) {
  if (props.sortKey !== props.columnKey) return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
  return props.sortDirection === 'asc'
    ? <ArrowUp size={14} className="ml-1 text-blue-600" />
    : <ArrowDown size={14} className="ml-1 text-blue-600" />;
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minVisits, setMinVisits] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });
  const userIdFilter = searchParams.get('userId');
  const { t } = useTranslation();

  const fetchProjects = useCallback(() => {
    api.get('/admin/projects', {
      params: {
        search,
        userId: userIdFilter,
        page,
        limit: pageSize,
        sortBy: sortConfig.key,
        order: sortConfig.direction,
        minVisits,
        createdAfter
      }
    }).then(res => {
        if (res.data.data) {
            setProjects(res.data.data);
            setTotal(res.data.total);
        } else if (Array.isArray(res.data)) {
            setProjects(res.data);
            setTotal(res.data.length);
        }
    }).catch(console.error);
  }, [search, userIdFilter, sortConfig, page, pageSize, minVisits, createdAfter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProjects]);

  const exportData = async () => {
    try {
      const res = await api.get('/admin/projects', {
        params: {
          search,
          userId: userIdFilter,
          limit: 'all',
          sortBy: sortConfig.key,
          order: sortConfig.direction,
          minVisits,
          createdAfter
        }
      });
      
      const dataToExport = res.data.data || res.data;
      if (!Array.isArray(dataToExport)) return;

      const csvContent = [
        ['ID', '项目名称', '所有者', '大小(B)', '访问量', '创建时间', '状态', 'URL'],
        ...dataToExport.map((p: AdminProject) => [
          p.id,
          p.name,
          p.user.username,
          p.size,
          p.visitCount,
          new Date(p.createdAt).toLocaleString(),
          p.status,
          p.siteUrl || ''
        ])
      ].map(e => e.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `projects_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed', e);
      alert(t('common.action_failed'));
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const confirmMsg = newStatus === 'DISABLED' ? t('admin.confirm_disable') : t('admin.confirm_enable');
    if (!confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/projects/${id}/status`, { status: newStatus });
      fetchProjects();
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
      if (status === 404) {
        alert(t('admin.project_not_found'));
        fetchProjects();
      } else {
        alert(t('common.action_failed'));
      }
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction: direction as SortDirection });
  };

  const clearUserFilter = () => {
    searchParams.delete('userId');
    setSearchParams(searchParams);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {t('admin.project_management')}
            {userIdFilter && (
               <span className="ml-4 text-sm font-normal bg-blue-100 text-blue-800 px-3 py-1 rounded-full inline-flex items-center gap-2">
                 {t('admin.filtered_by_user')}: {userIdFilter.substring(0, 8)}...
                 <button onClick={clearUserFilter} className="hover:text-blue-900 cursor-pointer"><X size={14} /></button>
               </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button
                onClick={exportData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
            >
                <FolderOpen size={18} />
                导出数据
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="relative">
              <input
                type="text"
                placeholder={t('admin.search_projects')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
               <div className="relative">
                  <input
                    type="number"
                    placeholder="最小访问量"
                    value={minVisits}
                    onChange={(e) => setMinVisits(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-36"
                  />
                  <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
               </div>
               <div className="relative">
                  <input
                    type="date"
                    value={createdAfter}
                    onChange={(e) => setCreatedAfter(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40"
                    title="创建时间之后"
                  />
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
               </div>
            </div>

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
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">{t('common.projects')} <SortIcon columnKey="name" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.owner')}</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('size')}
              >
                <div className="flex items-center">{t('admin.size')} <SortIcon columnKey="size" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('visitCount')}
              >
                <div className="flex items-center">{t('admin.visits')} <SortIcon columnKey="visitCount" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">{t('admin.created')} <SortIcon columnKey="createdAt" sortKey={sortConfig.key} sortDirection={sortConfig.direction} /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{project.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{project.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(project.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.visitCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(project.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {project.status === 'ACTIVE' ? t('common.active') : t('common.disabled')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                  <a 
                    href={project.siteUrl || `http://localhost:4000/sites/${project.user.username}/${project.name}${project.entryFile && project.entryFile !== 'index.html' ? '/' + project.entryFile : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 cursor-pointer"
                    title={t('dashboard.visit_site')}
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => toggleStatus(project.id, project.status)}
                    className={`${project.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} cursor-pointer`}
                    title={project.status === 'ACTIVE' ? t('admin.disable_project') : t('admin.enable_project')}
                  >
                    {project.status === 'ACTIVE' ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {t('admin.no_projects_found')}
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
