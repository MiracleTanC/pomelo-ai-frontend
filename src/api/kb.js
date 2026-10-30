import http from './http'

export const kbApi = {
  list: () => http.get('/kb'),
  get: (id) => http.get(`/kb/${id}`),
  create: (data) => http.post('/kb', data),
  update: (id, data) => http.put(`/kb/${id}`, data),
  delete: (id) => http.delete(`/kb/${id}`),
}
