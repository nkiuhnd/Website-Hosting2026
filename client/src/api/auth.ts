import api from '../api';

export interface RegisterData {
  phone: string;
  username: string;
  password?: string;
  code?: string;
}

export interface LoginData {
  username: string;
  password?: string;
}

export interface ResetPasswordData {
  phone: string;
  code: string;
  newPassword: string;
}

// 1. 发送验证码 (支持注册和重置密码)
// type: 'register' | 'reset'
export const sendSmsCode = (phone: string, type: 'register' | 'reset') => {
  return api.post('/auth/send-code', { phone, type });
};

// 2. 验证注册验证码并注册 (对应后端 /api/auth/verify-code)
export const verifyRegisterCode = (phone: string, code: string, username: string, password: string) => {
  return api.post('/auth/verify-code', { phone, code, username, password });
};

// 3. 验证找回密码验证码并重置密码 (对应后端 /api/auth/reset-password)
export const resetPassword = (phone: string, code: string, newPassword: string) => {
  return api.post('/auth/reset-password', { phone, code, newPassword });
};

// 4. 发送找回密码验证码 (如果后端有独立接口)
// 也可以直接复用 sendSmsCode(phone, 'reset')
export const sendResetCode = (phone: string) => {
    // 后端 server/src/routes/auth.ts 中有一个单独的 /reset-password/send-code 路由，
    // 也有通用的 /send-code 路由。为了保险，使用文档中提到的专用路由。
    return api.post('/auth/reset-password/send-code', { phone });
};
