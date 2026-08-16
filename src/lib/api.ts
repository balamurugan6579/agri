const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const CHAT_URL = `${API_BASE_URL}/chat`;
export const PREDICT_URL = `${API_BASE_URL}/predict`;
