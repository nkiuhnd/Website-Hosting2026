import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';
import { useAuth } from '../context/useAuth';
import { Trash2, ExternalLink, LogOut, LayoutGrid, List, Search, User, Download, QrCode, Bell, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ProjectIcon from '../components/ProjectIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import ZipRulesModal from '../components/ZipRulesModal';
import ShareQRCodeModal from '../components/ShareQRCodeModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  entryFile?: string;
  siteUrl?: string;
  size: number;
  visitCount: number;
  status: string;
  isPublic: boolean;
}

interface Message {
  id: number;
  title: string | null;
  content: string;
  read: boolean;
  type: string;
  createdAt: string;
}

interface UploadProjectForm {
  name: string;
  description?: string;
  file: FileList;
  showPlatformFooter: boolean;
}

export default function Dashboard() {
  const { username, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadProjectForm>({
    defaultValues: {
      showPlatformFooter: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (localStorage.getItem('dashboardViewMode') as 'grid' | 'list') || 'grid'
  );
  const [search, setSearch] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  const [shareModalData, setShareModalData] = useState<{ url: string; name: string } | null>(null);
  const [messageMode, setMessageMode] = useState<'user' | 'appeal'>('user');
  const [messageTo, setMessageTo] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

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

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const res = await api.get('/projects/messages/all');
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchProjects]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (location.state && (location.state as any).openMessage) {
      setShowMessageModal(true);
      if ((location.state as any).messageMode) {
        setMessageMode((location.state as any).messageMode);
      }
      // Clear state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const markMessageRead = async (id: number) => {
    try {
      await api.patch(`/projects/messages/${id}/read`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  };

  const userMessages = messages.filter(m => m.type === 'user');
  const systemMessages = messages.filter(m => m.type !== 'user');
  const unreadUserCount = userMessages.filter(m => !m.read).length;
  const unreadSystemCount = systemMessages.filter(m => !m.read).length;

  const markAllReadUser = async () => {
    try {
      await api.post('/projects/messages/read-all?scope=user');
      setMessages(prev => prev.map(m => m.type === 'user' ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Failed to mark all user messages as read', err);
    }
  };

  const markAllReadSystem = async () => {
    try {
      await api.post('/projects/messages/read-all?scope=system');
      setMessages(prev => prev.map(m => m.type !== 'user' ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Failed to mark all system messages as read', err);
    }
  };

  const openMessageDetail = (msg: Message) => {
    setActiveMessage(msg);
    setShowMessageDetail(true);
    setShowInbox(false);
    setShowMessages(false);
    if (!msg.read) {
      markMessageRead(msg.id);
    }
  };

  const extractSenderName = (msg: Message) => {
    const titleMatch = msg.title?.match(/来自\s*([^\s]+)\s*/);
    const contentMatch = msg.content.match(/来自\s*([^\s：:]+)[：:]/);
    return contentMatch?.[1] || titleMatch?.[1] || null;
  };

  const replyToMessage = (msg: Message) => {
    const sender = extractSenderName(msg);
    setMessageMode('user');
    setMessageTitle(msg.title ? `回复：${msg.title}` : '回复站内信');
    setMessageContent('');
    setMessageTo(sender || '');
    setMessageFeedback(sender ? null : '未识别发送者，请手动填写');
    setShowMessageDetail(false);
    setShowMessageModal(true);
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('确认删除该消息？')) return;
    try {
      await api.delete(`/projects/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (activeMessage?.id === id) {
        setShowMessageDetail(false);
        setActiveMessage(null);
      }
    } catch {
      alert('删除失败');
    }
  };

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('dashboardViewMode', mode);
  };

  const togglePublic = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/projects/${id}/toggle-public`, { isPublic: !currentStatus });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, isPublic: !currentStatus } : p));
    } catch (err) {
      console.error('Failed to toggle public status', err);
      alert('操作失败');
    }
  };

  const onUpload = async (data: UploadProjectForm) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('file', data.file[0]);
    formData.append('showPlatformFooter', String(data.showPlatformFooter));

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
      setUploadErrorMsg(message || t('common.action_failed'));
      setErrorModalOpen(true);
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

  const onDownload = async (id: string, name: string) => {
    try {
      const response = await api.get(`/projects/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert(t('common.download_failed') || 'Download failed');
    }
  };

  const onSendMessage = async () => {
    if (messageSending) return;
    const content = messageContent.trim();
    const title = messageTitle.trim();
    const toUsername = messageTo.trim();
    if (!content) {
      setMessageFeedback('内容不能为空');
      return;
    }
    if (messageMode === 'user' && !toUsername) {
      setMessageFeedback('收件人用户名不能为空');
      return;
    }
    setMessageSending(true);
    setMessageFeedback(null);
    try {
      if (messageMode === 'user') {
        await api.post('/projects/messages/send', {
          toUsername,
          title,
          content
        });
        setMessageFeedback('站内信已发送');
      } else {
        await api.post('/projects/messages/appeal', {
          title,
          content
        });
        setMessageFeedback('申诉已发送');
      }
      setMessageContent('');
      setMessageTitle('');
      if (messageMode === 'user') {
        setMessageTo('');
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data)
        ? (data as { message?: unknown }).message
        : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      setMessageFeedback(message || '发送失败');
    } finally {
      setMessageSending(false);
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
          
          <div className="relative">
            <button 
              onClick={() => setShowMessages(!showMessages)}
              className="p-2 text-gray-600 hover:text-blue-600 transition relative"
              title="通知"
            >
              <Bell size={20} />
              {unreadSystemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
                  {unreadSystemCount > 99 ? '99+' : unreadSystemCount}
                </span>
              )}
            </button>

            {showMessages && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in-up">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm">系统通知</h3>
                  {unreadSystemCount > 0 && (
                    <button onClick={markAllReadSystem} className="text-xs text-blue-600 hover:underline">全部已读</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingMessages ? (
                    <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
                  ) : systemMessages.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">暂无通知</div>
                  ) : (
                    systemMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${!msg.read ? 'bg-blue-50/30' : ''}`}
                        onClick={() => openMessageDetail(msg)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-semibold text-sm ${!msg.read ? 'text-blue-700' : 'text-gray-700'}`}>{msg.title || '系统通知'}</span>
                          {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{msg.content}</p>
                        <div className="text-[10px] text-gray-400 mt-2">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowInbox(!showInbox)}
              className="text-blue-600 hover:text-blue-700 transition text-sm relative"
            >
              站内信
              {unreadUserCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-red-500"></span>
              )}
            </button>

            {showInbox && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in-up">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm">站内信</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowInbox(false);
                        setMessageFeedback(null);
                        setShowMessageModal(true);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      写站内信
                    </button>
                    {unreadUserCount > 0 && (
                      <button onClick={markAllReadUser} className="text-xs text-blue-600 hover:underline">全部已读</button>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingMessages ? (
                    <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
                  ) : userMessages.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">暂无站内信</div>
                  ) : (
                    userMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${!msg.read ? 'bg-blue-50/30' : ''}`}
                        onClick={() => openMessageDetail(msg)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-semibold text-sm ${!msg.read ? 'text-blue-700' : 'text-gray-700'}`}>{msg.title || '站内信'}</span>
                          {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{msg.content}</p>
                        <div className="text-[10px] text-gray-400 mt-2">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-gray-600 hidden md:inline">{t('common.welcome')}, <strong>{username}</strong></span>
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition" title="个人中心">
            <User size={18} /> <span className="hidden md:inline">个人中心</span>
          </button>
          <div className="h-4 w-px bg-gray-300 mx-1 hidden md:block"></div>
          <button onClick={logout} className="flex items-center gap-2 text-red-600 hover:text-red-700 transition" title={t('common.logout')}>
            <LogOut size={18} /> <span className="hidden md:inline">{t('common.logout')}</span>
          </button>
        </div>
      </nav>

      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">站内信</h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">类型</label>
                <select
                  value={messageMode}
                  onChange={(e) => setMessageMode(e.target.value as 'user' | 'appeal')}
                  className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="user">发送给用户</option>
                  <option value="appeal">申诉管理员</option>
                </select>
              </div>
              {messageMode === 'user' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">收件人用户名</label>
                  <input
                    value={messageTo}
                    onChange={(e) => setMessageTo(e.target.value)}
                    placeholder="username"
                    className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
              <div className={messageMode === 'user' ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-medium mb-1 text-gray-700">标题</label>
                <input
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder={messageMode === 'appeal' ? '申诉' : '站内信'}
                  className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">内容</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder={messageMode === 'appeal' ? '请填写申诉理由' : '请输入消息内容'}
                rows={6}
                maxLength={500}
                className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {messageContent.length}/500
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={onSendMessage}
                disabled={messageSending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {messageSending ? '发送中...' : '发送'}
              </button>
              {messageFeedback && (
                <span className={`text-sm ${messageFeedback.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
                  {messageFeedback}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showMessageDetail && activeMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">{activeMessage.title || (activeMessage.type === 'user' ? '站内信' : '系统通知')}</h2>
              <button
                onClick={() => {
                  setShowMessageDetail(false);
                  setActiveMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-4">{new Date(activeMessage.createdAt).toLocaleString()}</div>
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">{activeMessage.content}</div>
            </div>
            <div className="mt-5 flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
              {activeMessage.type === 'user' && (
                <button
                  onClick={() => replyToMessage(activeMessage)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  回复
                </button>
              )}
              <button
                onClick={() => deleteMessage(activeMessage.id)}
                className="border border-red-300 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition"
              >
                删除
              </button>
              <button
                onClick={() => {
                  setShowMessageDetail(false);
                  setActiveMessage(null);
                }}
                className="border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="showPlatformFooter"
              {...register('showPlatformFooter')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="showPlatformFooter" className="ml-2 text-xs text-gray-600">
              {t('dashboard.show_platform_footer')} (推荐开启，帮助平台推广)
            </label>
          </div> */}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900 truncate" title={project.name}>{project.name}</h3>
                        {project.status === 'DISABLED' && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                            已封禁
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatBytes(project.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShareModalData({ url: project.siteUrl || '', name: project.name })}
                      className="text-gray-300 hover:text-indigo-600 transition p-1"
                      title="分享二维码"
                    >
                      <QrCode size={18} />
                    </button>
                    <button onClick={() => onDownload(project.id, project.name)} className="text-gray-300 hover:text-blue-500 transition p-1" title={t('common.download')}>
                      <Download size={18} />
                    </button>
                    <button onClick={() => onDelete(project.id)} className="text-gray-300 hover:text-red-500 transition p-1" title={t('common.delete')}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">{project.description || t('dashboard.no_description')}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => togglePublic(project.id, project.isPublic)}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition ${project.isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      title={project.isPublic ? '已公开到广场' : '私有项目'}
                    >
                      <Globe size={12} />
                      {project.isPublic ? '公开' : '私有'}
                    </button>
                    {project.isPublic && (
                      <a
                        href={`/square/${project.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        title="在广场中查看"
                      >
                        广场视角 <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
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
                          {project.status === 'DISABLED' && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded border border-red-200">
                              已封禁
                            </span>
                          )}
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
                          <button
                            onClick={() => togglePublic(project.id, project.isPublic)}
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition ${project.isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            title={project.isPublic ? '已公开到广场' : '私有项目'}
                          >
                            <Globe size={12} />
                            {project.isPublic ? '公开' : '私有'}
                          </button>
                          {project.isPublic && (
                            <a
                              href={`/square/${project.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              title="在广场中查看"
                            >
                              广场视角 <ExternalLink size={10} />
                            </a>
                          )}
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
                            onClick={() => onDownload(project.id, project.name)} 
                            className="text-gray-400 hover:text-blue-600"
                            title={t('common.download')}
                          >
                            <Download size={18} />
                          </button>
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
      <ZipRulesModal 
        isOpen={errorModalOpen} 
        onClose={() => setErrorModalOpen(false)} 
        errorMessage={uploadErrorMsg}
      />
      <ShareQRCodeModal
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        projectUrl={shareModalData?.url || ''}
        projectName={shareModalData?.name || ''}
      />
    </div>
  );
}
