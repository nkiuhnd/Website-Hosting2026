import React, { useEffect, useState } from 'react';
import api from '../api';
import { User, Lock, Clock, HardDrive, Globe, FileText, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Password change state
  const [passForm, setPassForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
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
      setPassMsg({ type: 'error', text: err.response?.data?.message || '密码修改失败' });
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Failed to load profile</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-blue-600" /> 个人中心
          </h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition"
          >
            返回控制台
          </button>
        </div>

        {/* Info & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Info Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 md:col-span-3 lg:col-span-1">
                <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mb-4">
                        {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{profile.username}</h2>
                    <p className="text-sm text-gray-500 mt-1">{profile.role === 'ADMIN' ? '管理员' : '普通用户'}</p>
                </div>
                <div className="pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">手机号</span>
                        <span className="text-gray-900 font-medium">{profile.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">注册时间</span>
                        <span className="text-gray-900 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="md:col-span-3 lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
                    <FileText className="text-indigo-500 w-8 h-8" />
                    <div className="text-2xl font-bold text-gray-900">{profile.stats.projectCount}</div>
                    <div className="text-sm text-gray-500">项目数量</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
                    <HardDrive className="text-emerald-500 w-8 h-8" />
                    <div className="text-2xl font-bold text-gray-900">{formatBytes(profile.stats.totalSize)}</div>
                    <div className="text-sm text-gray-500">已用空间</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
                    <Globe className="text-orange-500 w-8 h-8" />
                    <div className="text-2xl font-bold text-gray-900">{profile.stats.totalVisits}</div>
                    <div className="text-sm text-gray-500">总访问量</div>
                </div>
                
                {/* Security Section (Taking remaining space) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sm:col-span-3">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <Lock size={18} className="text-gray-500" /> 安全设置
                     </h3>
                     <form onSubmit={handlePassChange} className="max-w-md">
                        {passMsg.text && (
                            <div className={`mb-4 p-2 rounded text-sm ${passMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {passMsg.text}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">当前密码</label>
                                <input 
                                    type="password" 
                                    value={passForm.oldPassword}
                                    onChange={e => setPassForm({...passForm, oldPassword: e.target.value})}
                                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">新密码</label>
                                <input 
                                    type="password" 
                                    value={passForm.newPassword}
                                    onChange={e => setPassForm({...passForm, newPassword: e.target.value})}
                                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                    placeholder="至少6位"
                                />
                            </div>
                            <div className="flex items-end">
                                <button 
                                    type="submit" 
                                    disabled={passLoading}
                                    className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    {passLoading ? '修改中...' : '修改密码'}
                                </button>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">确认新密码</label>
                                <input 
                                    type="password" 
                                    value={passForm.confirmPassword}
                                    onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})}
                                    className="w-full md:w-1/3 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                     </form>
                </div>
            </div>
        </div>

        {/* Login History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Activity size={18} className="text-gray-500" /> 最近登录记录
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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
                        {profile.loginLogs.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">
                                    暂无记录
                                </td>
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