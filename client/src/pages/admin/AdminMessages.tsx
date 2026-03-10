import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Mail, CheckCircle, Clock, Trash2, Reply, Send } from 'lucide-react';

interface Message {
  id: number;
  title: string | null;
  content: string;
  read: boolean;
  type: string;
  createdAt: string;
  userId?: string;
}

type FilterType = 'all' | 'appeal' | 'user' | 'system' | 'announcement';

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('appeal');
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [writeData, setWriteData] = useState({ userId: '', username: '', title: '', content: '' });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/projects/messages/all');
      setMessages(res.data);
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages;
    return messages.filter(msg => msg.type === filter);
  }, [messages, filter]);

  const markMessageRead = async (id: number) => {
    try {
      await api.patch(`/projects/messages/${id}/read`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch (error) {
      console.error('Mark read error:', error);
      alert('操作失败');
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/projects/messages/read-all');
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
    } catch (error) {
      console.error('Mark all read error:', error);
      alert('操作失败');
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('确定要删除这条消息吗？')) return;
    try {
      await api.delete(`/projects/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Delete message error:', error);
      alert('删除失败');
    }
  };

  const openReplyModal = (message: Message) => {
    // 打开回复前先标记为已读
    if (!message.read) {
      markMessageRead(message.id);
    }
    // 关闭详情模态框（如果打开）
    setDetailModalOpen(false);
    setSelectedMessage(message);
    setReplyContent('');
    setReplyModalOpen(true);
  };

  const openDetailModal = (message: Message) => {
    // 打开详情时自动标记为已读
    if (!message.read) {
      markMessageRead(message.id);
    }
    setSelectedMessage(message);
    setDetailModalOpen(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }
    try {
      // 从消息内容中提取发送者的用户ID
      // 格式：来自用户 [username] (ID: userId) 的申诉：...
      let targetUserId = selectedMessage.userId;
      const userIdMatch = selectedMessage.content.match(/ID: ([^)]+)\)/);
      if (userIdMatch && userIdMatch[1]) {
        targetUserId = userIdMatch[1];
        console.log('提取到用户ID:', targetUserId);
      }
      
      // 构建带引用的回复内容，隐藏用户ID
      const cleanContent = selectedMessage.content.replace(/来自用户 \[(.*?)\] \(ID: [^)]+\) 的申诉：/g, '来自用户 $1 的申诉：');
      const quotedContent = `【申诉引用】\n${cleanContent}\n\n【管理员回复】\n${replyContent}`;
      
      await api.post('/admin/send-message', {
        userId: targetUserId,
        title: `回复：${selectedMessage.title || '站内信'}`,
        content: quotedContent,
        type: 'user'
      });
      alert('回复已发送');
      setReplyModalOpen(false);
      setReplyContent('');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Send reply error:', error);
      alert('发送失败');
    }
  };

  const openWriteModal = () => {
    // 打开写信窗口时，先关闭其他可能打开的窗口
    setDetailModalOpen(false);
    setReplyModalOpen(false);
    setWriteData({ userId: '', username: '', title: '', content: '' });
    setWriteModalOpen(true);
  };

  const closeWriteModal = () => {
    setWriteModalOpen(false);
    setWriteData({ userId: '', username: '', title: '', content: '' });
    // 刷新消息列表
    fetchMessages();
  };

  const sendMessage = async () => {
    if (!writeData.userId || !writeData.content.trim()) {
      alert('请填写用户ID和消息内容');
      return;
    }
    try {
      await api.post('/admin/send-message', {
        userId: writeData.userId,
        title: writeData.title || '站内信',
        content: writeData.content,
        type: 'user'
      });
      alert('消息已发送');
      // 关闭写站内信窗口并刷新消息列表
      closeWriteModal();
    } catch (error) {
      console.error('Send message error:', error);
      alert('发送失败');
    }
  };

  const searchUser = async () => {
    if (!writeData.username.trim()) return;
    try {
      const res = await api.get(`/admin/users?search=${writeData.username}&limit=1`);
      if (res.data.data && res.data.data.length > 0) {
        const user = res.data.data[0];
        setWriteData(prev => ({ ...prev, userId: user.id }));
        alert(`找到用户：${user.username}，ID：${user.id}`);
      } else {
        alert('未找到该用户');
      }
    } catch (error) {
      console.error('Search user error:', error);
      alert('搜索失败');
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) return <div className="text-center py-10">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="text-blue-500" /> 站内信
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={openWriteModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Send size={16} />
            写信
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="border border-gray-200 rounded px-3 py-2 text-sm"
          >
            <option value="appeal">申诉</option>
            <option value="user">用户</option>
            <option value="system">系统</option>
            <option value="announcement">公告</option>
            <option value="all">全部</option>
          </select>
          <button
            onClick={markAllRead}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
            disabled={unreadCount === 0}
          >
            全部已读
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMessages.map(msg => (
              <tr key={msg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 w-96 min-w-96 max-w-96">
                  <div className="font-medium text-gray-900 cursor-pointer hover:underline" onClick={() => openDetailModal(msg)}>
                    {msg.title || '站内信'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {msg.content.replace(/来自用户 \[(.*?)\] \(ID: [^)]+\) 的申诉：/g, '来自用户 $1 的申诉：')}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{msg.type}</td>
                <td className="px-6 py-4">
                  {msg.read ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> 已读
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                      <Clock size={12} /> 未读
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(msg.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {!msg.read && (
                      <button
                        onClick={() => markMessageRead(msg.id)}
                        className="text-xs text-blue-600 hover:underline cursor-pointer"
                      >
                        标记已读
                      </button>
                    )}
                    <button
                      onClick={() => openReplyModal(msg)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Reply size={10} />
                      回复
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-xs text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMessages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-400">暂无消息</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {replyModalOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Reply size={20} className="text-blue-600" />
                回复消息
              </h3>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  <span className="font-medium text-gray-900">原消息：</span>
                  {selectedMessage.content.replace(/来自用户 \[(.*?)\] \(ID: [^)]+\) 的申诉：/g, '来自用户 $1 的申诉：')}
                </p>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="请输入回复内容..."
                className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
              />
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={sendReply}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
              >
                发送回复
              </button>
              <button
                onClick={() => {
                  setReplyModalOpen(false);
                  setSelectedMessage(null);
                  setReplyContent('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Mail size={20} className="text-blue-600" />
                消息详情
              </h3>
              <div className="mt-2 flex justify-end items-center text-sm text-gray-500">
                <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-3 text-lg">{selectedMessage.title || '站内信'}</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words p-4 bg-gray-50 rounded-lg border border-gray-100">
                  {selectedMessage.content.replace(/来自用户 \[(.*?)\] \(ID: [^)]+\) 的申诉：/g, '来自用户 $1 的申诉：')}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => openReplyModal(selectedMessage)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
              >
                回复
              </button>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedMessage(null);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {writeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Send size={20} className="text-blue-600" />
                写站内信
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收件人
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={writeData.username}
                    onChange={(e) => setWriteData({ ...writeData, username: e.target.value })}
                    placeholder="输入用户名搜索"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={searchUser}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-medium"
                  >
                    搜索
                  </button>
                </div>
                {writeData.userId && (
                  <p className="text-sm text-green-600 mt-1">已选择用户ID：{writeData.userId}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题（可选）
                </label>
                <input
                  type="text"
                  value={writeData.title}
                  onChange={(e) => setWriteData({ ...writeData, title: e.target.value })}
                  placeholder="消息标题"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                <textarea
                  value={writeData.content}
                  onChange={(e) => setWriteData({ ...writeData, content: e.target.value })}
                  placeholder="请输入消息内容..."
                  className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
              >
                发送消息
              </button>
              <button
                onClick={() => {
                  setWriteModalOpen(false);
                  setWriteData({ userId: '', username: '', title: '', content: '' });
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
