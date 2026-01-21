import React from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">用户注册协议与免责声明</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-gray-600 space-y-4 leading-relaxed text-sm md:text-base">
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">1. 合法合规使用</h4>
            <p>
              用户在 YunMind 平台注册及上传内容时，必须严格遵守中国法律法规。
              <span className="font-bold text-red-500">严禁上传、托管或传播以下内容：</span>
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 bg-red-50 p-3 rounded text-red-700">
              <li>涉及暴力、恐怖主义、极端主义的信息</li>
              <li>淫秽、色情、赌博或教唆犯罪的内容</li>
              <li>危害国家安全、破坏社会稳定的言论</li>
              <li>侵犯他人版权、隐私权或其他合法权益的文件</li>
              <li>包含恶意代码、病毒或用于网络攻击的工具</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">2. 内容责任自负</h4>
            <p>
              YunMind 仅提供静态网页托管的技术服务。用户上传的所有内容（包括但不限于文字、图片、代码、链接）均由用户本人全权负责。
              <span className="font-bold text-gray-900">平台不对用户上传内容的合法性、真实性或准确性承担任何责任。</span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">3. 违规处理机制</h4>
            <p>
              平台保留随时审查用户内容的权利。一旦发现违规内容，平台有权在不通知用户的情况下采取以下措施：
            </p>
            <ul className="list-disc list-inside pl-2 text-gray-600">
              <li>立即删除违规文件或下线相关项目</li>
              <li>冻结或注销违规用户的账号</li>
              <li>依法向有关监管部门报告并配合调查</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">4. 服务变更与终止</h4>
            <p>
              鉴于网络服务的特殊性，平台有权根据业务发展需要或法律法规要求，随时调整、暂停或终止部分或全部服务，而无需对用户或第三方承担责任。
            </p>
          </div>
          
          <div className="pt-4 text-xs text-gray-400 text-center">
            注册即代表您已阅读并同意上述所有条款
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm hover:shadow"
          >
            我已阅读并理解
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;