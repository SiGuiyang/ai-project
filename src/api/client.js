import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || '请求失败'
    ElMessage?.error(message)
    return Promise.reject(error)
  }
)

export const orders = {
  list: (params) => client.get('/orders', { params }),
  get: (id) => client.get(`/orders/${id}`),
  create: (data) => client.post('/orders', data),
  updateStatus: (id, status) => client.patch(`/orders/${id}/status`, { status }),
  delete: (id) => client.delete(`/orders/${id}`),
}

export const waybills = {
  list: (params) => client.get('/waybills', { params }),
  get: (id) => client.get(`/waybills/${id}`),
  create: (data) => client.post('/waybills', data),
  updateStatus: (id, status) => client.patch(`/waybills/${id}/status`, { status }),
}

export const tracking = {
  list: (waybillId) => client.get(`/tracking/${waybillId}`),
  latest: (waybillId) => client.get(`/tracking/${waybillId}/latest`),
  create: (data) => client.post('/tracking', data),
}

export default client
