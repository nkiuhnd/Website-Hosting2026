import React from 'react';
import { AlertCircle, FileArchive, CheckCircle2, XCircle } from 'lucide-react';

interface ZipRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

const ZipRulesModal: React.FC<ZipRulesModalProps> = ({ isOpen, onClose, errorMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">上传失败</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">错误原因：</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Rules Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <FileArchive className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-gray-900">ZIP 文件上传规范</h4>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> 文件格式
                </h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>必须是 .zip 格式压缩包</li>
                  <li>或者单文件 .html</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> 大小限制
                </h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>压缩包大小 &le; 20MB</li>
                  <li>解压后总大小 &le; 100MB</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 md:col-span-2">
                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> 文件结构与安全
                </h5>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5"></span>
                    <span>
                      <strong className="text-gray-800">必须包含入口文件：</strong>
                      <br/>
                      压缩包内应包含 <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">index.html</code> 文件，系统会自动识别并将其作为网站首页。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5"></span>
                    <span>
                      <strong className="text-gray-800">禁止包含非法路径：</strong>
                      <br/>
                      文件名不能包含 <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">..</code> 等相对路径，防止路径遍历攻击。
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZipRulesModal;