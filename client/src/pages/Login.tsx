import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', data);
      login(res.data.token, res.data.username, res.data.role);
      if (res.data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
      const rawMessage = (data && typeof data === 'object' && 'message' in data)
        ? (data as { message?: unknown }).message
        : undefined;
      const message = typeof rawMessage === 'string' ? rawMessage : undefined;
      // 优先显示后端返回的中文错误信息，如果没有则使用默认翻译
      setError(message || t('login.login_failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('login.title')}</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block mb-1 font-medium">{t('common.username')}</label>
            <input
              {...register('username', { required: true })}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && <span className="text-red-500 text-sm">{t('common.required')}</span>}
          </div>
          <div className="mb-6">
            <label className="block mb-1 font-medium">{t('common.password')}</label>
            <input
              type="password"
              {...register('password', { required: true })}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && <span className="text-red-500 text-sm">{t('common.required')}</span>}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
            {t('common.login')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          {t('login.no_account')} <Link to="/register" className="text-blue-600 hover:underline">{t('common.register')}</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          忘记密码？<Link to="/forgot" className="text-blue-600 hover:underline">通过短信验证码找回</Link>
        </p>
      </div>
    </div>
  );
}
