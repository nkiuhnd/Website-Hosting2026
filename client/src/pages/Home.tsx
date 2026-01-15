import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const Home = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleStart = () => {
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">YunMind</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                登录
              </button>
              <button 
                onClick={handleStart}
                className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all hover:shadow-lg"
              >
                {token ? '控制台' : '免费注册'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60" />
          
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-8 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              新一代静态网页托管平台
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
              极速托管你的 <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                个人网页与项目
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              告别繁琐的服务器配置。上传即生成专属私密链接，
              默认不被搜索引擎收录，只有知道链接的人才能访问，确保你的数据与创意安全。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={handleStart}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                开始免费托管
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all hover:border-gray-300 w-full sm:w-auto"
              >
                了解更多
              </button>
            </div>
          </div>

          {/* Browser Mockup Gallery */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-indigo-200 to-purple-200 blur-3xl opacity-30 -z-10" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Card 1: Resume/Portfolio */}
              <div className="relative group transform translate-y-8 md:translate-y-12 hover:-translate-y-2 transition-transform duration-500 z-10">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
                  {/* Browser Header */}
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-200 rounded text-[10px] text-gray-400 px-2 py-0.5 text-center mx-2 truncate">
                      user2.yunmind.cn/resume
                    </div>
                  </div>
                  {/* Content Placeholder */}
                  <div className="h-48 bg-gray-50 p-4 relative overflow-hidden group-hover:bg-gray-100 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 mb-4 mx-auto" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 mx-auto" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded mx-auto" />
                    <div className="mt-6 flex gap-2 justify-center">
                      <div className="h-8 w-8 rounded bg-gray-200" />
                      <div className="h-8 w-8 rounded bg-gray-200" />
                      <div className="h-8 w-8 rounded bg-gray-200" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1 rounded-full text-xs font-medium shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                        个人简历
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Main Project (Center, Larger) */}
              <div className="relative group transform hover:-translate-y-2 transition-transform duration-500 z-20">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-200 rounded text-[10px] text-gray-400 px-2 py-0.5 text-center mx-2 truncate">
                      demo.yunmind.cn/app
                    </div>
                  </div>
                  <div className="h-64 bg-indigo-50 p-6 relative overflow-hidden group-hover:bg-indigo-100 transition-colors">
                     {/* Abstract Dashboard UI */}
                     <div className="flex gap-4 mb-4">
                       <div className="w-1/3 h-20 bg-white rounded-lg shadow-sm opacity-60" />
                       <div className="w-1/3 h-20 bg-white rounded-lg shadow-sm opacity-60" />
                       <div className="w-1/3 h-20 bg-white rounded-lg shadow-sm opacity-60" />
                     </div>
                     <div className="h-32 bg-white rounded-lg shadow-sm opacity-60 p-3">
                        <div className="h-3 w-1/3 bg-gray-100 rounded mb-3" />
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-gray-100 rounded" />
                          <div className="h-2 w-5/6 bg-gray-100 rounded" />
                          <div className="h-2 w-4/6 bg-gray-100 rounded" />
                        </div>
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1 rounded-full text-xs font-medium shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                        Web 应用
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Blog/Docs */}
              <div className="relative group transform translate-y-8 md:translate-y-12 hover:-translate-y-2 transition-transform duration-500 z-10">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-200 rounded text-[10px] text-gray-400 px-2 py-0.5 text-center mx-2 truncate">
                      blog.yunmind.cn
                    </div>
                  </div>
                  <div className="h-48 bg-gray-50 p-4 relative overflow-hidden group-hover:bg-gray-100 transition-colors">
                    <div className="h-4 w-1/2 bg-gray-300 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-gray-200 rounded" />
                      <div className="h-2 w-full bg-gray-200 rounded" />
                      <div className="h-2 w-2/3 bg-gray-200 rounded" />
                    </div>
                    <div className="mt-4 h-20 w-full bg-gray-200 rounded opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1 rounded-full text-xs font-medium shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                        个人博客
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">仅需三步，即刻上线</h2>
            <p className="mt-4 text-gray-600">摒弃复杂的 CI/CD 配置，回归最简单的发布方式</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-indigo-100 -z-10" />

            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                <span className="text-4xl">📂</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. 上传文件</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs">
                将你的 HTML/CSS/JS 文件打包成 ZIP，点击上传按钮，或直接拖拽到控制台。
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                <span className="text-4xl">⚡️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. 自动部署</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs">
                系统自动解压、配置 SSL 证书并分发到边缘节点，全程仅需几秒钟。
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                <span className="text-4xl">🔗</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. 获得链接</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs">
                生成专属私密链接（如 username.yunmind.cn/project），全球皆可访问。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">为什么选择 YunMind？</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              专为开发者打造的轻量级托管服务，剔除一切繁杂配置，回归纯粹的部署体验。
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: '秒级部署',
                desc: '支持 ZIP 压缩包一键上传，后端自动解压并部署。无论是静态 HTML 还是 React/Vue 构建产物，瞬间上线。',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: '专属子域名',
                desc: '每个用户拥有独立的二级域名空间（如 username.yunmind.cn），让你的项目拥有专业且易记的访问地址。',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                )
              },
              {
                title: '隐私优先',
                desc: '你的网页默认是“隐形”的。我们配置了防爬虫协议，只有你分享链接的对象才能访问。非常适合内部测试、个人简历或私密项目。',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[100px] opacity-20 -translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">准备好发布你的下一个想法了吗？</h2>
          <p className="text-xl text-gray-300 mb-10">
            加入 YunMind，体验最纯粹的网页托管服务,仅需几秒钟即可开始。
          </p>
          <button 
            onClick={handleStart}
            className="px-10 py-4 bg-white text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
          >
            立即免费注册
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">YunMind</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">关于我们</a>
            <a href="#" className="hover:text-gray-900">使用文档</a>
            <a href="#" className="hover:text-gray-900">隐私政策</a>
            <a href="#" className="hover:text-gray-900">联系支持</a>
          </div>
          <div className="text-sm text-gray-400">
            © 2026 YunMind. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
