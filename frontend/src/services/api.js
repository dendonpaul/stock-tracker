import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  getProfile: () => api.get('/auth/profile')
};

export const stockApi = {
  getAll: (params) => api.get('/stocks', { params }),
  getOne: (id) => api.get(`/stocks/${id}`),
  create: (data) => api.post('/stocks', data),
  update: (id, data) => api.put(`/stocks/${id}`, data),
  delete: (id) => api.delete(`/stocks/${id}`),
  loadDefaults: () => api.post('/stocks/load-defaults'),
  clearAll: () => api.delete('/stocks/clear-all')
};

export const feeApi = {
  getAll: (params) => api.get('/fees', { params }),
  getOne: (id) => api.get(`/fees/${id}`),
  create: (data) => api.post('/fees', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  delete: (id) => api.delete(`/fees/${id}`),
  calculate: (data) => api.post('/fees/calculate', data),
  loadDefaults: () => api.post('/fees/load-defaults'),
  clearAll: () => api.delete('/fees/clear-all')
};

export const tradeApi = {
  getAll: (params) => api.get('/trades', { params }),
  getOne: (id) => api.get(`/trades/${id}`),
  create: (data) => api.post('/trades', data),
  update: (id, data) => api.put(`/trades/${id}`, data),
  close: (id, data) => api.put(`/trades/${id}/close`, data),
  previewClose: (id, data) => api.post(`/trades/${id}/preview-close`, data),
  delete: (id) => api.delete(`/trades/${id}`),
  bulkDelete: (ids) => api.post('/trades/bulk-delete', { ids }),
  importCSV: (data) => api.post('/trades/import', data),
  getAnalytics: (params) => api.get('/trades/analytics', { params }),
  getDashboard: () => api.get('/trades/dashboard'),
  getMonthlySummary: (params) => api.get('/trades/monthly-summary', { params }),
  getProfitTrend: (params) => api.get('/trades/profit-trend', { params }),
  getProfitByPeriod: (period) => api.get(`/trades/profit/${period}`)
};

export const aiApi = {
  getTradeExitSuggestion: (tradeId) => api.get(`/ai/trade-suggestion/${tradeId}`),
  saveAnalysis: (data) => api.post('/ai/analyses', data),
  getAnalyses: (params) => api.get('/ai/analyses', { params }),
  getAnalysis: (id) => api.get(`/ai/analyses/${id}`),
  getAnalysisByTrade: (tradeId) => api.get(`/ai/analyses/by-trade/${tradeId}`),
  deleteAnalysis: (id) => api.delete(`/ai/analyses/${id}`),
  deleteAllAnalyses: () => api.delete('/ai/analyses')
};

export default api;
