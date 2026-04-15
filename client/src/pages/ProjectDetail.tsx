import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Heart, MessageSquare, Eye, ExternalLink, ArrowLeft, Send, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    username: string;
  };
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  visitCount: number;
  isPublic: boolean;
  isLiked: boolean;
  siteUrl?: string;
  user: {
    id: string;
    username: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageSending, setMessageSending] = useState(false);

  // Use siteUrl from API if available, otherwise construct it (fallback)
  const siteUrl = project?.siteUrl || '';

  useEffect(() => {
    fetchProject();
    fetchComments();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/square/${id}`);
      setProject(res.data);
    } catch (err) {
      console.error(err);
      navigate('/square');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/square/${id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {
    if (!token) return navigate('/login');
    try {
      const res = await api.post(`/square/${id}/like`);
      setProject(prev => prev ? {
        ...prev,
        isLiked: res.data.liked,
        _count: {
          ...prev._count,
          likes: res.data.liked ? prev._count.likes + 1 : prev._count.likes - 1
        }
      } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return navigate('/login');
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/square/${id}/comments`, { content: newComment });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
      setProject(prev => prev ? {
        ...prev,
        _count: { ...prev._count, comments: prev._count.comments + 1 }
      } : null);
    } catch (err) {
      alert('评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;
    setMessageSending(true);
    try {
      // Reuse existing message API
      await api.post('/projects/messages/send', {
        toUsername: project?.user.username,
        title: `来自广场项目的咨询: ${project?.name}`,
        content: messageContent
      });
      alert('发送成功！');
      setMessageModalOpen(false);
      setMessageContent('');
    } catch (err) {
      alert('发送失败，请登陆。');
    } finally {
      setMessageSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/square')} className="text-gray-500 hover:text-gray-900 cursor-pointer">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {token && (
               <button
                 onClick={() => navigate('/dashboard')}
                 className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition shadow-sm hover:shadow cursor-pointer"
               >
                 控制台 <LayoutDashboard size={14} />
               </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Iframe Preview */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 text-center px-4">
                  <div className="bg-white border border-gray-200 rounded px-3 py-0.5 text-xs text-gray-400 inline-block w-full max-w-md truncate">
                    {siteUrl}
                  </div>
                </div>
                <div className="w-16"></div> {/* Spacer for symmetry */}
              </div>
              
              <div className="relative w-full bg-gray-100 overflow-hidden h-[600px] flex items-center justify-center">
                 <iframe 
                   src={siteUrl} 
                   className="border-0 bg-white w-full h-full"
                   title="Project Preview"
                   sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                 />
              </div>
              
              {/* Action Bar Below Frame */}
              <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <button
                          onClick={handleLike}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition border cursor-pointer ${project.isLiked ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                          <Heart size={20} className={project.isLiked ? 'fill-pink-600' : ''} />
                          <span className="font-medium">{project.isLiked ? '已赞' : '点赞'}</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs ml-1">{project._count.likes}</span>
                      </button>

                      {/* Contact Author Button */}
                      {token && username !== project.user.username && (
                          <button
                              onClick={() => setMessageModalOpen(true)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                          >
                              <Send size={20} />
                              <span className="font-medium">联系作者</span>
                          </button>
                      )}
                      {!token && (
                          <button
                              onClick={() => navigate('/login')}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                          >
                              <Send size={20} />
                              <span className="font-medium">联系作者</span>
                          </button>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">访问量: {project.visitCount}</span>
                      <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition shadow-sm hover:shadow cursor-pointer"
                      >
                          访问原站 <ExternalLink size={14} />
                      </a>
                  </div>
              </div>
            </div>

            {/* Comments Section (Below Iframe) */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MessageSquare size={20} /> 评论 ({project._count.comments})
              </h2>
              
              {/* Comment Form */}
              {token ? (
                <form onSubmit={handleComment} className="mb-8">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {username?.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="写下你的想法..."
                        className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[100px]"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          {submittingComment ? '发送中...' : '发表评论'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 mb-8">
                  请 <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">登录</button> 后发表评论
                </div>
              )}

              {/* Comment List */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">暂无评论，快来抢沙发吧！</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shrink-0">
                        {comment.user.username.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{comment.user.username}</span>
                          <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar (Info Card) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              {/* Author Section */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">关于作者</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {project.user.username.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">{project.user.username}</div>
                  </div>
                </div>
                
                {!token && (
                   <button
                     onClick={() => navigate('/login')}
                     className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                   >
                     <Send size={16} /> 登录后联系作者
                   </button>
                )}
              </div>

              <hr className="border-gray-100 my-6" />

              {/* Project Info Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">项目信息</h3>
                <div className="space-y-4">
                   <div>
                     <div className="text-xs text-gray-500 mb-1">发布时间</div>
                     <div className="text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500 mb-1">简介</div>
                     <div className="text-sm text-gray-600 leading-relaxed">
                       {project.description || '作者很懒，没有写简介'}
                     </div>
                   </div>
                   <div>
                     <div className="text-xs text-gray-500 mb-1">统计</div>
                     <div className="flex gap-4 text-sm text-gray-600">
                       <span className="flex items-center gap-1"><Eye size={14}/> {project.visitCount}</span>
                       <span className="flex items-center gap-1"><Heart size={14}/> {project._count.likes}</span>
                       <span className="flex items-center gap-1"><MessageSquare size={14}/> {project._count.comments}</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Message Modal */}
      {messageModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">发送站内信给 {project.user.username}</h3>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="请输入消息内容..."
              className="w-full border border-gray-300 rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMessageModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSendMessage}
                disabled={messageSending || !messageContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
              >
                {messageSending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
