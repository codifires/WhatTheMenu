import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const path = window.location.pathname
      if (!path.includes('/login') && !path.includes('/register')) {
        window.location.href = path.includes('/admin') ? '/admin/login' : '/owner/login'
      }
    }
    return Promise.reject(error)
  }
)

// ============ AUTH ============
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  registerOwner: (data) => api.post('/auth/register', data),
  checkAvailability: (data) => api.post('/auth/check-availability', data),
  forgotPassword: (data) => api.post('/auth/forgotpassword', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// ============ ADMIN ============
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCafes: (params) => api.get('/admin/cafes', { params }),
  getCafe: (id) => api.get(`/admin/cafes/${id}`),
  createCafe: (data) => api.post('/admin/cafes', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateCafe: (id, data) => api.put(`/admin/cafes/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCafe: (id) => api.delete(`/admin/cafes/${id}`),
  suspendCafe: (id) => api.put(`/admin/cafes/${id}/suspend`),
  activateCafe: (id) => api.put(`/admin/cafes/${id}/activate`),
  getSubscriptions: () => api.get('/admin/subscriptions'),
  getSubscriptionHistory: (cafeId) => api.get(`/admin/subscriptions/${cafeId}/history`),
  updateSubscription: (id, data) => api.put(`/admin/subscriptions/${id}`, data),
  getSubscriptionRequests: () => api.get('/admin/subscription-requests'),
  approveSubscriptionRequest: (id) => api.put(`/admin/subscription-requests/${id}/approve`),
  rejectSubscriptionRequest: (id) => api.put(`/admin/subscription-requests/${id}/reject`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getGlobalMedia: () => api.get('/admin/media'),
  uploadGlobalMedia: (data) => api.post('/admin/media', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteGlobalMedia: (id) => api.delete(`/admin/media/${id}`),
  getRevenue: (params) => api.get('/admin/revenue', { params }),
}

// ============ PUBLIC SETTINGS ============
export const publicAPI = {
  getSettings: () => api.get('/settings/public'),
}

// ============ OWNER ============
export const ownerAPI = {
  getDashboard: () => api.get('/owner/dashboard'),
  // Categories
  getCategories: () => api.get('/owner/categories'),
  createCategory: (data) => api.post('/owner/categories', data),
  updateCategory: (id, data) => api.put(`/owner/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/owner/categories/${id}`),
  // Menu Items
  getMenuItems: (params) => api.get('/owner/menu-items', { params }),
  createMenuItem: (data) => api.post('/owner/menu-items', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateMenuItem: (id, data) => api.put(`/owner/menu-items/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMenuItem: (id) => api.delete(`/owner/menu-items/${id}`),
  toggleAvailability: (id) => api.put(`/owner/menu-items/${id}/availability`),
  // Orders
  getOrders: (params) => api.get('/owner/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/owner/orders/${id}/status`, data),
  updatePaymentStatus: (id) => api.put(`/owner/orders/${id}/payment`),
  // QR Code
  getQRCode: () => api.get('/owner/qr-code'),
  regenerateQRCode: () => api.post('/owner/qr-code/regenerate'),
  // Feedback
  getFeedback: () => api.get('/owner/feedback'),
  // Settings
  updateSettings: (data) => api.put('/owner/settings', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Subscription
  initiateSubscriptionSession: (data) => api.post('/owner/subscription/initiate-session', data),
  checkSubscriptionStatus: (sessionId) => api.get(`/owner/subscription/check-status/${sessionId}`),
  cancelSubscriptionSession: (sessionId) => api.post(`/owner/subscription/cancel-session/${sessionId}`),
  simulateSubscriptionWebhook: (data) => api.post('/owner/subscription/webhook', data),
  submitSubscriptionRequest: (data) => api.post('/owner/subscription/request', data),
  getGlobalMedia: () => api.get('/owner/media/global'),
  // Revenue History (permanent ledger)
  getRevenue: (params) => api.get('/owner/revenue', { params }),
}

// ============ CUSTOMER (PUBLIC) ============
export const customerAPI = {
  getCafeMenu: (cafeId) => api.get(`/menu/${cafeId}`),
  searchMenu: (cafeId, q) => api.get(`/menu/${cafeId}/search`, { params: { q } }),
  placeOrder: (data) => api.post('/orders', data),
  initiateUpiSession: (data) => api.post('/orders/initiate-upi-session', data),
  checkUpiStatus: (sessionId) => api.get(`/orders/check-upi-status/${sessionId}`),
  cancelUpiSession: (sessionId) => api.post(`/orders/cancel-upi-session/${sessionId}`),
  simulateUpiWebhook: (data) => api.post('/orders/upi-webhook', data),
  trackOrder: (orderNumber) => api.get(`/orders/${orderNumber}/track`),
  submitFeedback: (data) => api.post('/feedback', data),
}

export default api
