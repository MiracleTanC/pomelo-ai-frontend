import http from './http'

export const metaApi = {
  list: (kbId) => http.get(`/kb/${kbId}/meta-field`),
  add: (kbId, data) => http.post(`/kb/${kbId}/meta-field`, data),
  update: (kbId, configId, data) => http.put(`/kb/${kbId}/meta-field/${configId}`, data),
  delete: (kbId, configId) => http.delete(`/kb/${kbId}/meta-field/${configId}`),
}
