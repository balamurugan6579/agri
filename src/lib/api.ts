// Resolve backend API Base URL
// 1. Explicit VITE_API_BASE_URL if set in .env
// 2. Relative URLs (/chat, /predict) which are proxied by Vite to http://127.0.0.1:5000
// 3. Direct http://127.0.0.1:5000 fallback if running on standalone static origin
const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (
  envBaseUrl !== undefined && envBaseUrl.trim() !== ''
    ? envBaseUrl
    : (typeof window !== 'undefined' && window.location.port === '5000'
        ? window.location.origin
        : '')
).replace(/\/+$/, '');

export const CHAT_URL = API_BASE_URL ? `${API_BASE_URL}/chat` : '/chat';
export const PREDICT_URL = API_BASE_URL ? `${API_BASE_URL}/predict` : '/predict';
export const DIRECT_BACKEND_CHAT_URL = 'http://127.0.0.1:5000/chat';
