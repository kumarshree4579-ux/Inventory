import api from './client';

const toFormData = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, v));
  return fd;
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refresh: (data) => api.post('/auth/refresh', data),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getPermissions: () => api.get('/roles/permissions'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  remove: (id) => api.delete(`/roles/${id}`),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', toFormData(data), multipart),
  update: (id, data) => api.put(`/products/${id}`, toFormData(data), multipart),
  remove: (id) => api.delete(`/products/${id}`),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  search: (q, field) => api.get('/products/search', { params: { q, field } }),
  import: (formData) => api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const brandsAPI = {
  getAll: (params) => api.get('/brands', { params }),
  create: (data) => api.post('/brands', toFormData(data), multipart),
  update: (id, data) => api.put(`/brands/${id}`, toFormData(data), multipart),
  remove: (id) => api.delete(`/brands/${id}`),
};

export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  remove: (id) => api.delete(`/suppliers/${id}`),
};

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

export const branchesAPI = {
  getAll: (params) => api.get('/branches', { params }),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  remove: (id) => api.delete(`/branches/${id}`),
};

export const countersAPI = {
  getAll: (params) => api.get('/counters', { params }),
  getByBranch: (branch) => api.get('/counters', { params: { branch, limit: 50 } }),
  create: (data) => api.post('/counters', data),
  update: (id, data) => api.put(`/counters/${id}`, data),
  remove: (id) => api.delete(`/counters/${id}`),
};

export const purchaseAPI = {
  getAll: (params) => api.get('/purchase', { params }),
  create: (data) => api.post('/purchase', data),
  approve: (id) => api.put(`/purchase/${id}/approve`),
  receive: (id, data) => api.post(`/purchase/${id}/receive`, data),
};

export const stockAPI = {
  getAll: (params) => api.get('/stock', { params }),
  adjust: (data) => api.post('/stock/adjust', data),
  transfer: (data) => api.post('/stock/transfer', data),
  getTransactions: (params) => api.get('/stock/transactions', { params }),
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  hold: (id) => api.put(`/sales/${id}/hold`),
  resume: (id) => api.put(`/sales/${id}/resume`),
};

export const returnsAPI = {
  getAll: (params) => api.get('/returns', { params }),
  create: (data) => api.post('/returns', data),
  approve: (id) => api.put(`/returns/${id}/approve`),
};

export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
};

export const cashDrawerAPI = {
  get: () => api.get('/cash-drawer'),
  open: (data) => api.post('/cash-drawer/open', data),
  close: (id, data) => api.put(`/cash-drawer/${id}/close`, data),
};

export const reportsAPI = {
  sales: (params) => api.get('/reports/sales', { params }),
  purchase: (params) => api.get('/reports/purchase', { params }),
  profit: (params) => api.get('/reports/profit', { params }),
  gst: (params) => api.get('/reports/gst', { params }),
  inventory: () => api.get('/reports/inventory'),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const printersAPI = {
  getAll: (params) => api.get('/printers', { params }),
  create: (data) => api.post('/printers', data),
  update: (id, data) => api.put(`/printers/${id}`, data),
  remove: (id) => api.delete(`/printers/${id}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};

export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
};
