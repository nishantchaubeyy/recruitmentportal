import { mockApiRequest } from './mockApi';

// ── Configuration ─────────────────────────────────────────────
// Set VITE_MOCK_API=true in frontend/.env.local to run without backend.
// Remove it (or set false) when connecting to a real server.
const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

// Exposed so UI can hide mock-only affordances when talking to a real backend.
export const IS_MOCK = USE_MOCK;

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE_URL = API_URL;

/**
 * Unified API request function.
 * Routes to mock handler or real backend based on VITE_MOCK_API env variable.
 */
async function apiRequest(endpoint, options = {}) {
  // ── MOCK MODE ────────────────────────────────────────────────
  if (USE_MOCK) {
    return mockApiRequest(endpoint, options);
  }

  // ── REAL BACKEND MODE ─────────────────────────────────────────
  const token = localStorage.getItem('token');

  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Handle expired/invalid token
  if (response.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server API Error (${response.status}: ${response.statusText}). Please check server logs.`);
    }
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(typeof data === 'object' && data.error ? data.error : `Request failed with status ${response.status}`);
  }

  return data;
}

/**
 * Resolves a media / poster path to a fully accessible URL.
 * Handles data URIs, absolute URLs, and relative upload paths.
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const backendBase = API_URL.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendBase}${cleanPath}`;
}

export { apiRequest };

