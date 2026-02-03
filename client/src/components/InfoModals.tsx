import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalBase: React.FC<ModalProps & { title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-gray-600 space-y-6 leading-relaxed text-sm md:text-base">
          {children}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export const AboutModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="关于 YunMind">
    <div className="space-y-4">
      <div className="bg-indigo-50 p-4 rounded-lg text-indigo-800 font-medium">
        极简主义的静态网页托管平台 —— 为开发者、学生和创作者而生。
      </div>
      
      <div>
        <h4 className="font-bold text-gray-900 mb-2">💡 我们的初衷</h4>
        <p>
          在云服务日益复杂的今天，我们发现很多时候，用户只是想简单地发布一个 Demo、一份简历或是一个个人主页。
          YunMind 致力于解决“上传即上线”的痛点，无需配置服务器，无需编写复杂的 CI/CD 脚本。
        </p>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 mb-2">🚀 核心特性</h4>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><span className="font-medium text-gray-900">秒级部署</span>：拖拽 html文件或ZIP 包，几秒钟内生成可访问链接。</li>
          <li><span className="font-medium text-gray-900">隐形部署</span>：生成的链接除非主动公开，否则通常不会被搜索引擎抓取。</li>
          <li><span className="font-medium text-gray-900">完全免费</span>：致力于为个人开发者提供长期的基础服务。</li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 mb-2">👨‍💻 关于开发者</h4>
        <p>
          我们相信工具应该服务于人，而不是让人服务于工具。
          希望能帮助你更专注于创造本身。
        </p>
      </div>
    </div>
  </ModalBase>
);

export const DocsModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="使用文档 & 常见问题">
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">1</span>
          快速上手指南
        </h4>
        <div className="space-y-4 pl-2 border-l-2 border-indigo-100 ml-3">
          <div className="pl-4">
            <h5 className="font-bold text-gray-800">第一步：准备文件</h5>
            <p className="text-sm mt-1">
              如果是单一的 <code className="bg-gray-100 px-1 py-0.5 rounded">.html</code> 文件，可以直接上传。
              如果是包含多个文件（CSS/JS/图片）的文件夹，请将其打包成一个 <code className="bg-gray-100 px-1 py-0.5 rounded">.zip</code> 格式的压缩包。
              <br/>
              <span className="text-amber-600 text-xs">注意：请确保 index.html 文件位于压缩包的根目录下。</span>
            </p>
          </div>
          <div className="pl-4">
            <h5 className="font-bold text-gray-800">第二步：上传部署</h5>
            <p className="text-sm mt-1">
              登录控制台，点击“上传新项目”按钮或直接拖拽 ZIP 文件到上传区域。系统会自动解压并部署。
            </p>
          </div>
          <div className="pl-4">
            <h5 className="font-bold text-gray-800">第三步：访问分享</h5>
            <p className="text-sm mt-1">
              部署完成后，您将获得一个专属链接（如 <code className="bg-gray-100 px-1 py-0.5 rounded">user.yunmind.cn/project</code>），即可分享给他人访问。
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 text-lg mb-4">📚 常见问题 (FAQ)</h4>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-bold text-gray-800 mb-1">Q: 支持 PHP/Python/Node.js 等动态后端吗？</h5>
            <p className="text-sm">A: 不支持。YunMind 仅提供静态网页托管服务，仅支持 HTML、CSS、JavaScript 及静态资源文件。</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-bold text-gray-800 mb-1">Q: 单个项目的大小限制是多少？</h5>
            <p className="text-sm">A: 目前单个 ZIP 包的上传限制为 20MB，足以满足大多数个人网站、简历和 Demo 的需求。</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-bold text-gray-800 mb-1">Q: 部署的网页会被搜索引擎收录吗？</h5>
            <p className="text-sm">A: 生成的链接难以猜测，除非主动公开，否则通常不会被搜索引擎抓取。如果您希望严格禁止收录，建议自行添加 robots.txt。</p>
          </div>
        </div>
      </div>
    </div>
  </ModalBase>
);

export const PrivacyModal: React.FC<ModalProps> = (props) => (
  <ModalBase {...props} title="隐私保护指引">
    <div className="space-y-4">
      <div className="text-sm bg-green-50 text-green-700 p-3 rounded border border-green-100">
        我们深知隐私的重要性。YunMind 坚持“最小化数据收集”原则，仅收集维持服务运行所必需的最少信息。
      </div>

      <div>
        <h4 className="font-bold text-gray-900 mb-2">1. 我们收集哪些信息？</h4>
        <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
          <li><span className="font-medium">手机号码</span>：仅用于发送登录验证码，验证账号真实性，确保平台安全。</li>
          <li><span className="font-medium">上传的文件</span>：您主动上传的网页文件，我们将加密存储于服务器，仅用于您的网站展示。</li>
          <li><span className="font-medium">访问日志</span>：为了系统安全和风控，我们会记录基础的访问日志（IP、时间），定期自动清理。</li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 mb-2">2. 我们如何使用这些信息？</h4>
        <p className="text-sm">
          您的信息仅用于提供托管服务、身份验证和安全防护。我们<span className="font-bold text-gray-900">绝不会</span>向任何第三方出售、出租或交易您的个人信息。
        </p>
      </div>

      <div>
        <h4 className="font-bold text-gray-900 mb-2">3. 数据安全与权利</h4>
        <p className="text-sm mb-2">
          我们采用行业标准的加密技术保护您的数据安全。
        </p>
        <p className="text-sm">
          您拥有对自己数据的完全控制权。如果您希望注销账号或删除特定数据，请随时联系我们，我们将在核实身份后立即处理。
        </p>
      </div>
    </div>
  </ModalBase>
);

export const ContactModal: React.FC<ModalProps> = (props) => {
  const [copied, setCopied] = useState(false);
  const email = "yunmind.cn@gmail.com";

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalBase {...props} title="联系我们">
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xl font-bold text-gray-900">有问题或建议？</h4>
          <p className="text-gray-600 max-w-sm mx-auto">
            欢迎任何反馈、Bug 报告或功能建议。
          </p>
          <p className="text-sm text-gray-500">
             您也可以通过 <span className="font-medium text-gray-700">站内信</span> 直接联系管理员
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
          <span className="font-mono text-gray-800 font-medium select-all">{email}</span>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 shadow-sm'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已复制
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                复制
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-gray-400">
          一般会在 24 小时内回复邮件
        </div>
      </div>
    </ModalBase>
  );
};
