import axios from 'axios'

const BASE = '/api'

export const api = axios.create({ baseURL: BASE, timeout: 10000 })

export const fetchMetrics       = () => api.get('/dashboard/metrics').then(r => r.data)
export const fetchActivity      = (limit=30) => api.get(`/dashboard/activity?limit=${limit}`).then(r => r.data)
export const fetchAllReferrals  = (limit=50) => api.get(`/dashboard/referrals?limit=${limit}`).then(r => r.data)
export const fetchFraudFlags    = (limit=100) => api.get(`/fraud/flags?limit=${limit}`).then(r => r.data)
export const fetchFraudStats    = () => api.get('/fraud/stats').then(r => r.data)
export const fetchUsers         = () => api.get('/users').then(r => r.data)
export const fetchUser          = (id) => api.get(`/user/${id}`).then(r => r.data)
export const fetchUserGraph     = (id, depth=3) => api.get(`/user/${id}/graph?depth=${depth}`).then(r => r.data)
export const fetchUserRewards   = (id) => api.get(`/user/${id}/rewards`).then(r => r.data)
export const claimReferral      = (body) => api.post('/referral/claim', body).then(r => r.data)
export const createUser         = (body) => api.post('/user', body).then(r => r.data)
export const simulateRewards    = (body) => api.post('/referral/simulate', body).then(r => r.data)
