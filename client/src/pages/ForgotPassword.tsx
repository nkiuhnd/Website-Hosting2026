import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendResetCode, resetPassword } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { AxiosError } from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    newPassword: ''
  });

  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 清理倒计时
  useEffect(() => {
    return () => {
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSendCode = async () => {
    const { phone } = formData;
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrorMsg('请输入正确的中国大陆手机号');
      return;
    }
    
    if (countdown > 0) return;

    try {
      await sendResetCode(phone);
      setSuccessMsg('验证码已发送，有效期5分钟');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const error = err as AxiosError<{ message?: string; error?: string }>;
      setErrorMsg(error.response?.data?.message || error.response?.data?.error || '验证码发送失败，请稍后重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { phone, code, newPassword } = formData;

    if (!phone || !code || !newPassword) {
      setErrorMsg('请完善所有必填项');
      return;
    }
    if (code.length !== 6) {
      setErrorMsg('验证码为6位数字');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('新密码至少6个字符');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await resetPassword(phone, code, newPassword);
      setSuccessMsg('密码重置成功，即将跳转登录...');
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/login', { state: { success: true, msg: '密码重置成功，请登录' } });
      }, 2000);
    } catch (err) {
      const error = err as AxiosError<{ message?: string; error?: string }>;
      setErrorMsg(error.response?.data?.message || error.response?.data?.error || '密码重置失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="bg-white p-8 rounded shadow-md w-96 max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">找回密码</h2>
        
        {errorMsg && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-center text-sm">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-2 bg-green-50 text-green-600 rounded text-center text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 手机号 */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="phone">
              注册手机号
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入注册时的手机号"
              maxLength={11}
            />
          </div>

          {/* 验证码 */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="code">
              验证码
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6位验证码"
                maxLength={6}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div className="mb-6">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="newPassword">
              新密码
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="至少6个字符"
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium disabled:opacity-70"
          >
            {isSubmitting ? '重置中...' : '确认重置密码'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          记得密码了？ <Link to="/login" className="text-blue-600 hover:underline">立即登录</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
