import React, { useEffect, useState } from 'react';
import api from '../api';
import { User, Lock, Clock, HardDrive, Globe, FileText, Activity, BarChart2, ExternalLink, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProjectVisitLogsModal from '../components/ProjectVisitLogsModal';

interface LoginLog {
  id: string;
  ip: string;
  userAgent: string;
  status: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  phone: string | null;
  role: string;
  createdAt: string;
  stats: {
    projectCount: number;
    totalSize: number;
    totalVisits: number;
  };
  loginLogs: LoginLog[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  size: number;
  visitCount: number;
  siteUrl: string;
  updatedAt: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginLogs, setShowLoginLogs] = useState(false);
  
  // Modal state
  const [selectedProject, setSelectedProject] = useState<{id: string, name: string} | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Project>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
       return sortDirection === 'asc' 
         ? aValue.localeCompare(bValue) 
         : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
       return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  // Password change state
  const [passForm, setPassForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchProjects()]).finally(() => setLoading(false));
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassMsg({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassMsg({ type: 'error', text: '新密码至少需要6位' });
      return;
    }

    setPassLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword
      });
      setPassMsg({ type: 'success', text: '密码修改成功' });
      setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const message = err.response?.data?.message || '密码修改失败';
      setPassMsg({ type: 'error', text: message });
    } finally {
      setPassLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!profile) return <div className="p-8 text-center text-red-500">Failed to load profile</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-blue-600" /> 个人中心
          </h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            返回控制台
          </button>
        </div>

        {/* Top Section: User Info & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Info Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-1">
                <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 mb-4 shadow-inner">
                        {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{profile.username}</h2>
                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${profile.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {profile.role === 'ADMIN' ? '管理员' : '普通用户'}
                    </span>
                </div>
                <div className="pt-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-2"><Smartphone size={14} /> 手机号</span>
                        <span className="text-gray-900 font-medium font-mono">{profile.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-2"><Clock size={14} /> 注册时间</span>
                        <span className="text-gray-900 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                        <FileText size={24} />
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{profile.stats.projectCount}</div>
                        <div className="text-sm text-gray-500 font-medium mt-1">项目数量</div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <HardDrive size={24} />
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{formatBytes(profile.stats.totalSize)}</div>
                        <div className="text-sm text-gray-500 font-medium mt-1">已用空间</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600">
                        <Globe size={24} />
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{profile.stats.totalVisits}</div>
                        <div className="text-sm text-gray-500 font-medium mt-1">总访问量</div>
                    </div>
                </div>

                {/* Security / Password Change - Inline with stats to save space */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sm:col-span-3">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-lg">
                        <Lock size={20} className="text-blue-500" /> 安全设置
                     </h3>
                     <form onSubmit={handlePassChange}>
                        {passMsg.text && (
                            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center ${passMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {passMsg.text}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">当前密码</label>
                                <input 
                                    type="password" 
                                    value={passForm.oldPassword}
                                    onChange={e => setPassForm({...passForm, oldPassword: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">新密码 (至少6位)</label>
                                <input 
                                    type="password" 
                                    value={passForm.newPassword}
                                    onChange={e => setPassForm({...passForm, newPassword: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">确认新密码</label>
                                    <input 
                                        type="password" 
                                        value={passForm.confirmPassword}
                                        onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={passLoading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors h-[38px] mt-auto cursor-pointer disabled:cursor-not-allowed"
                                >
                                    {passLoading ? '...' : '修改密码'}
                                </button>
                            </div>
                        </div>
                     </form>
                </div>
            </div>
        </div>

        {/* Project Analytics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="text-blue-500" /> 项目访问分析
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    项目名称
                                    {sortField === 'name' && (
                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('size')}
                            >
                                <div className="flex items-center gap-1">
                                    占用空间
                                    {sortField === 'size' && (
                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('visitCount')}
                            >
                                <div className="flex items-center gap-1">
                                    总访问量
                                    {sortField === 'visitCount' && (
                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                                onClick={() => handleSort('updatedAt')}
                            >
                                <div className="flex items-center gap-1">
                                    更新时间
                                    {sortField === 'updatedAt' && (
                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {sortedProjects.map((project) => (
                            <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col max-w-[200px] md:max-w-[300px]">
                                        <span className="font-medium text-gray-900 truncate" title={project.name}>{project.name}</span>
                                        <a 
                                            href={project.siteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5 w-full cursor-pointer"
                                            title={project.siteUrl}
                                        >
                                            <span className="truncate flex-1 min-w-0">{project.siteUrl}</span>
                                            <ExternalLink size={10} className="flex-shrink-0" />
                                        </a>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                                        project.status === 'BANNED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {project.status === 'ACTIVE' ? '运行中' : project.status === 'BANNED' ? '已封禁' : '已停止'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                    {formatBytes(project.size)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-900 font-bold">{project.visitCount}</span>
                                        <span className="text-xs text-gray-400">次</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(project.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => setSelectedProject({ id: project.id, name: project.name })}
                                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-xs cursor-pointer"
                                    >
                                        查看详情
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sortedProjects.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    暂无项目
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Collapsible Login History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
                onClick={() => setShowLoginLogs(!showLoginLogs)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Activity size={18} className="text-gray-500" /> 最近登录记录
                </h3>
                {showLoginLogs ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            
            {showLoginLogs && (
                <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {profile.loginLogs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-gray-400" />
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {log.ip}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {log.status === 'SUCCESS' ? '成功' : '失败'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

      </div>

      {/* Modal */}
      {selectedProject && (
        <ProjectVisitLogsModal 
            isOpen={!!selectedProject} 
            onClose={() => setSelectedProject(null)} 
            projectId={selectedProject.id}
            projectName={selectedProject.name}
        />
      )}
    </div>
  );
}
