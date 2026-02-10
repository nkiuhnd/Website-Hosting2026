import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';

interface ShareQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUrl: string;
  projectName: string;
}

const ShareQRCodeModal: React.FC<ShareQRCodeModalProps> = ({ isOpen, onClose, projectUrl, projectName }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">分享网页</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <div className="mb-2 text-center">
             <p className="text-sm text-gray-500">项目：{projectName}</p>
          </div>

          <div className="p-4 bg-white border-2 border-gray-100 rounded-xl shadow-sm mb-6">
            <QRCodeSVG
              value={projectUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <p className="text-gray-600 text-sm mb-6 text-center">
            微信扫一扫 · 转发给好友/班级群
          </p>

          {/* Copy Link Section */}
          <div className="w-full relative">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1 truncate text-sm text-gray-600 font-mono">
                {projectUrl}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  copied 
                    ? 'bg-green-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareQRCodeModal;
