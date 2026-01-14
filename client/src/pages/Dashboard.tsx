import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';
import { useAuth } from '../context/useAuth';
import { Trash2, ExternalLink, LogOut, LayoutGrid, List, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ProjectIcon from '../components/ProjectIcon';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  entryFile?: string;
  siteUrl?: string;
  size: number;
  visitCount: number;
}

interface UploadProjectForm {
  name: string;
  description?: string;
  file: FileList;
}

export default function Dashboard() {
  const { username, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadProjectForm>();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (localStorage.getItem('dashboardViewMode') as 'grid' | 'list') || 'grid'
  );
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects', {
        params: { search }
      });
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchProjects]);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('dashboardViewMode', mode);
  };

  const onUpload = async (data: UploadProjectForm) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('file', data.file[0]);

    try {
      await api.post('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      reset();
      fetchProjects();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data)
        ? (data as { message?: unknown }).message
        : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      alert(message || t('common.action_failed'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('common.are_you_sure'))) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch {
      alert(t('common.delete_failed'));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {t('dashboard.title')}
        </h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <span className="text-gray-600 hidden md:inline">{t('common.welcome')}, <strong>{username}</strong></span>
          <button onClick={logout} className="flex items-center gap-2 text-red-600 hover:text-red-700 transition" title={t('common.logout')}>
            <LogOut size={18} /> <span className="hidden md:inline">{t('common.logout')}</span>
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4 max-w-6xl">
        {/* Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">{t('dashboard.upload_new_project')}</h2>
          <form onSubmit={handleSubmit(onUpload)} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-sm font-medium mb-1 text-gray-700">{t('dashboard.project_name_slug')}</label>
              <input
                {...register('name', { required: true, pattern: /^[a-z0-9-]+$/ })}
                placeholder="my-site"
                className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.name && <span className="text-red-500 text-xs block mt-1">{t('dashboard.name_error')}</span>}
            </div>
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-sm font-medium mb-1 text-gray-700">{t('dashboard.description')}</label>
              <input
                {...register('description')}
                placeholder="My awesome site"
                className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-sm font-medium mb-1 text-gray-700">{t('dashboard.project_files')}</label>
              <input
                type="file"
                accept=".html,.zip"
                {...register('file', { required: true })}
                className="border p-2 rounded w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition w-full md:w-auto whitespace-nowrap"
            >
              {loading ? t('dashboard.uploading') : t('dashboard.upload')}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-3">{t('dashboard.upload_hint')}</p>
        </div>

        {/* Toolbar: Title, Search, View Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">{t('dashboard.your_projects')}</h2>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder={t('admin.search_projects')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => toggleViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => toggleViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="List View"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">{search ? t('admin.no_projects_found') : t('dashboard.no_projects')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ProjectIcon name={project.name} size="md" />
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-lg text-gray-900 truncate" title={project.name}>{project.name}</h3>
                      <span className="text-xs text-gray-400">{formatBytes(project.size)}</span>
                    </div>
                  </div>
                  <button onClick={() => onDelete(project.id)} className="text-gray-300 hover:text-red-500 transition p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">{project.description || t('dashboard.no_description')}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-gray-400 text-xs">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <a
                    href={project.siteUrl || `http://localhost:4000/sites/${username}/${project.name}${project.entryFile && project.entryFile !== 'index.html' ? '/' + project.entryFile : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {t('dashboard.visit_site')} <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.projects')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.description')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.size')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.created')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ProjectIcon name={project.name} size="sm" className="mr-3" />
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 max-w-xs truncate">{project.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBytes(project.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={project.siteUrl || `http://localhost:4000/sites/${username}/${project.name}${project.entryFile && project.entryFile !== 'index.html' ? '/' + project.entryFile : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            title={t('dashboard.visit_site')}
                          >
                            <ExternalLink size={18} />
                          </a>
                          <button 
                            onClick={() => onDelete(project.id)} 
                            className="text-gray-400 hover:text-red-600"
                            title={t('common.delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
