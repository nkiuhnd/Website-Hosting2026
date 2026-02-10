import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Mail, CheckCircle, Clock } from 'lucide-react';

interface Message {
  id: number;
  title: string | null;
  content: string;
  read: boolean;
  type: string;
  createdAt: string;
}

type FilterType = 'all' | 'appeal' | 'user' | 'system' | 'announcement';

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('appeal');

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

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) return <div className="text-center py-10">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="text-blue-500" /> 站内信
        </h2>
        <div className="flex items-center gap-4">
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
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{msg.title || '站内信'}</div>
                  <div className="text-sm text-gray-600 mt-1">{msg.content}</div>
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
                  {!msg.read && (
                    <button
                      onClick={() => markMessageRead(msg.id)}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      标记已读
                    </button>
                  )}
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
    </div>
  );
}
