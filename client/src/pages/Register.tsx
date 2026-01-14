import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendSmsCode, verifyRegisterCode } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    username: '',
    password: '',
    code: ''
  });

  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 清理倒计时
  useEffect(() => {
    return () => {
      // Cleanup handled by closure in setInterval, but good practice to clear if component unmounts
      // In this simple implementation, the interval ID isn't stored in ref, so we rely on component state check
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  const handleSendCode = async () => {
    const { phone } = formData;
    
    // Simple validation
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrorMsg('请输入正确的中国大陆手机号');
      return;
    }
    // 虽然发送验证码时不一定需要用户名（后端逻辑可能需要检查手机号是否重复），但后端 send-code 接口只接收 phone 和 type
    // 不过为了防止用户乱填，我们可以在发送前不做用户名校验，或者做简单校验
    
    if (countdown > 0) return;

    try {
      await sendSmsCode(phone, 'register');
      setErrorMsg('验证码已发送，有效期5分钟');
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
    const { phone, username, password, code } = formData;

    if (!phone || !username || !password || !code) {
      setErrorMsg('请完善所有必填项');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('密码至少6个字符');
      return;
    }
    if (code.length !== 6) {
      setErrorMsg('验证码为6位数字');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await verifyRegisterCode(phone, code, username, password);
      // 注册成功，提示用户并延迟跳转
      setSuccessMsg('注册成功！正在跳转登录页面...');
      setTimeout(() => {
        navigate('/login', { state: { success: true, msg: '注册成功，请登录' } });
      }, 2000);
    } catch (err) {
      const error = err as AxiosError<{ message?: string; error?: string }>;
      setErrorMsg(error.response?.data?.message || error.response?.data?.error || '注册失败，请稍后重试');
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
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">手机号注册</h2>
        
        {successMsg && (
          <div className="mb-4 p-2 bg-green-50 text-green-600 rounded text-center text-sm">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-center text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 用户名 */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="username">
              {t('common.username')}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请设置用户名"
            />
          </div>

          {/* 手机号 */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="phone">
              手机号
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入11位手机号"
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

          {/* 密码 */}
          <div className="mb-6">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="password">
              {t('common.password')}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
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
            {isSubmitting ? '注册中...' : t('common.register')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          已有账号？ <Link to="/login" className="text-blue-600 hover:underline">{t('common.login')}</Link>
          <span className="mx-2">|</span>
          <Link to="/forgot" className="text-blue-600 hover:underline">忘记密码？</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
