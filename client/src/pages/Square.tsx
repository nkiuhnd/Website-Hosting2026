import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, Heart, Eye, Filter, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface SquareProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  visitCount: number;
  user: {
    id: string;
    username: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

const getGradient = (str: string) => {
  const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 80%), hsl(${(hue + 45) % 360}, 70%, 60%))`;
};

export default function Square() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [projects, setProjects] = useState<SquareProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/square', {
        params: {
          search,
          sort,
          page,
          limit: 12
        }
      });
      setProjects(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, sort]); // Search is triggered manually or debounced? Let's trigger on enter or button for now

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">社区广场</h1>
            </div>
            <div className="flex items-center gap-4">
               {token ? (
                   <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                       控制台
                   </button>
               ) : (
                   <button onClick={() => navigate('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                       登录
                   </button>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="latest">最新发布</option>
              <option value="popular">最多点赞</option>
              <option value="views">最多访问</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">暂无公开项目</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/square/${project.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
              >
                {/* Cover Image */}
                <div
                  className="h-40 w-full flex items-center justify-center text-white text-4xl font-bold uppercase select-none"
                  style={{ background: getGradient(project.name) }}
                >
                  {project.name.substring(0, 2)}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1 group-hover:text-blue-600 transition">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 h-8 mb-4">
                    {project.description || '暂无简介'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                        {project.user.username.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[80px]">{project.user.username}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {project.visitCount}
                      </span>
                      <span className="flex items-center gap-1 text-pink-500">
                        <Heart size={12} className="fill-pink-500" /> {project._count.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
