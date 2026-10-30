import http from './http'
import { useAuthStore } from '../stores/auth'

export const docApi = {
  list: (kbId, status) => http.get(`/doc/list/${kbId}`, { params: status ? { status } : {} }),
  detail: (docId) => http.get(`/doc/${docId}`),
  upload: (kbId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post(`/doc/upload/${kbId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadBatch: (kbId, files) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    return http.post(`/doc/upload-batch/${kbId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  parse: (docId) => http.post(`/doc/parse/${docId}`),
  chunk: (docId) => http.post(`/doc/chunk/${docId}`),
  vectorize: (docId) => http.post(`/doc/vectorize/${docId}`),
  ingest: (docId) => http.post(`/doc/ingest/${docId}`),
  reParse: (docId) => http.post(`/doc/reparse/${docId}`),
  reparse: (docId) => http.post(`/doc/reparse/${docId}`),  // alias: 兼容 handleAction 的 action 名
  setEnabled: (docId, enabled) => http.put(`/doc/${docId}/enabled?enabled=${enabled}`),
  batchVectorize: (docIds) => http.post('/doc/vectorize-batch', { docIds }),
  vectorizeAll: (kbId) => http.post(`/doc/vectorize-all/${kbId}`),
  delete: (docId) => http.delete(`/doc/${docId}`),
}

/**
 * SSE 流式对话——使用 fetch + ReadableStream 手动解析 SSE 事件。
 */
export async function chatStream({ kbId, sessionId, message, onToken, onDone, onError }) {
  const auth = useAuthStore()
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kbId, sessionId, message }),
  })

  if (!res.ok) {
    onError?.('请求失败')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      let event = 'message'
      let data = ''
      block.split('\n').forEach(line => {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      })
      if (event === 'token') onToken?.(data)
      else if (event === 'done') onDone?.(JSON.parse(data))
      else if (event === 'error') onError?.(data)
    }
  }
}
