import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import { Eye, EyeOff, ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });
  const userIdFilter = searchParams.get('userId');
  const { t } = useTranslation();

  const fetchProjects = useCallback(() => {
    api.get('/admin/projects', {
      params: {
        search,
        userId: userIdFilter,
        sortBy: sortConfig.key,
        order: sortConfig.direction
      }
    }).then(res => setProjects(res.data)).catch(console.error);
  }, [search, userIdFilter, sortConfig]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProjects]);

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('admin.project_management')}
          {userIdFilter && (
             <span className="ml-4 text-sm font-normal bg-blue-100 text-blue-800 px-3 py-1 rounded-full inline-flex items-center gap-2">
               {t('admin.filtered_by_user')}: {userIdFilter.substring(0, 8)}...
               <button onClick={clearUserFilter} className="hover:text-blue-900"><X size={14} /></button>
             </span>
          )}
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder={t('admin.search_projects')}
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
                    className="text-blue-600 hover:text-blue-900"
                    title={t('dashboard.visit_site')}
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => toggleStatus(project.id, project.status)}
                    className={`${project.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
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
    </div>
  );
}
