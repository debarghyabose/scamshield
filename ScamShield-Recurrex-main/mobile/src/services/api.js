import { auth } from './firebase';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8000').replace(/\/$/, '');

async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, authRequired = false } = {}) {
  const token = await getToken();
  if (authRequired && !token) {
    throw new Error('Authentication required');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.detail || 'Request failed';
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    if (err.message === 'Network request failed' || err.message.includes('fetch')) {
      throw new Error(`Cannot reach ScamShield server at ${BASE_URL}.`);
    }
    throw err;
  }
}

export const api = {
  health: () => request('/api/health'),
  scanMessage: ({ text, save = true }) => request('/api/scan/message', { method: 'POST', body: { text, save } }),
  scanUrl: ({ url, save = true }) => request('/api/scan/url', { method: 'POST', body: { url, save } }),
  scanTransaction: (payload) => request('/api/scan/transaction', { method: 'POST', body: payload }),
  listScans: () => request('/api/scans?limit=50', { authRequired: true }),
  getScan: (id) => request(`/api/scans/${encodeURIComponent(id)}`, { authRequired: true }),
  deleteScan: (id) => request(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE', authRequired: true }),
  getStats: () => request('/api/scans/stats', { authRequired: true }),
  getProfile: () => request('/api/profile', { authRequired: true }),
  updateProfile: (fields) => request('/api/profile', { method: 'PUT', body: fields, authRequired: true }),
  submitReport: (report) => request('/api/report', { method: 'POST', body: report, authRequired: true }),
};
