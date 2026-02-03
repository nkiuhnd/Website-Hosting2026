import axios from 'axios';

const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const normalizedBase = rawBase
  ? rawBase.replace(/\/+$/, '')
  : '/api';
const baseURL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
