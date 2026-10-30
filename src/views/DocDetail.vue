<template>
  <div class="page">
    <div class="page-header">
      <el-button link @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
      <h2 v-if="doc">{{ doc.name }}</h2>
      <div v-if="doc" class="header-actions">
        <el-button size="small" @click="loadChunks" :loading="chunkLoading">刷新切片</el-button>
        <el-button size="small" type="primary" @click="handleIncrementalVectorize" :disabled="!hasEdited">
          <el-icon><Lightning /></el-icon> 增量向量化
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="info">
        <el-descriptions v-if="doc" :column="2" border>
          <el-descriptions-item label="文件名">{{ doc.name }}</el-descriptions-item>
          <el-descriptions-item label="大小">{{ formatSize(doc.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="MIME">{{ doc.mimeType }}</el-descriptions-item>
          <el-descriptions-item label="SHA-256">{{ doc.sha256 }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(doc.status)" size="small">{{ statusLabel(doc.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="切片数">{{ doc.chunkCount }}</el-descriptions-item>
          <el-descriptions-item label="已向量化">{{ doc.vectorizedChunks }}</el-descriptions-item>
          <el-descriptions-item label="错误信息" v-if="doc.errorMsg">{{ doc.errorMsg }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ formatTime(doc.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="解析时间">{{ formatTime(doc.parsedAt) }}</el-descriptions-item>
          <el-descriptions-item label="切片时间">{{ formatTime(doc.chunkedAt) }}</el-descriptions-item>
          <el-descriptions-item label="向量化时间">{{ formatTime(doc.vectorizedAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- 原文预览 -->
      <el-tab-pane label="原文预览" name="content">
        <div v-if="doc?.parsedContent" class="parsed-content">{{ doc.parsedContent }}</div>
        <el-empty v-else description="文档尚未解析，无原文内容" />
      </el-tab-pane>

      <!-- 切片列表（支持编辑） -->
      <el-tab-pane label="切片列表" name="chunks">
        <el-table :data="chunks" v-loading="chunkLoading" stripe size="small" max-height="600">
          <el-table-column prop="chunkIndex" label="#" width="60" align="center" />
          <el-table-column label="内容" min-width="400">
            <template #default="{ row }">
              <span v-if="editingId !== row.id" class="chunk-text">{{ row.content }}</span>
              <el-input v-else v-model="editingContent" type="textarea" :rows="3" />
            </template>
          </el-table-column>
          <el-table-column prop="page" label="页" width="60" align="center" />
          <el-table-column prop="charCount" label="字符" width="80" align="center" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="chunkStatusType(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <template v-if="editingId === row.id">
                <el-button link size="small" type="primary" @click="saveEdit(row)">保存</el-button>
                <el-button link size="small" @click="cancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-button link size="small" @click="startEdit(row)">编辑</el-button>
                <el-button link size="small" type="primary" @click="goDocDetail(row)">详情</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 元数据 -->
      <el-tab-pane label="元数据" name="metadata">
        <el-table :data="doc?.metadata || []" stripe size="small">
          <el-table-column prop="fieldKey" label="字段Key" width="140" />
          <el-table-column prop="fieldName" label="字段名" width="140" />
          <el-table-column prop="fieldValue" label="值" min-width="300" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { docApi } from '../api/doc'
import http from '../api/http'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const docId = route.params.id
const doc = ref(null)
const chunks = ref([])
const chunkLoading = ref(false)
const activeTab = ref('info')
const editingId = ref('')
const editingContent = ref('')

const hasEdited = computed(() => chunks.value.some(c => c.status === 'EDITED'))

onMounted(async () => {
  await loadDoc()
  await loadChunks()
})

async function loadDoc() {
  const res = await docApi.detail(docId)
  doc.value = res.data
}

async function loadChunks() {
  chunkLoading.value = true
  try {
    const res = await docApi.detail(docId)
    chunks.value = res.data.chunks || []
  } finally { chunkLoading.value = false }
}

function startEdit(row) {
  editingId.value = row.id
  editingContent.value = row.content
}

function cancelEdit() {
  editingId.value = ''
  editingContent.value = ''
}

async function saveEdit(row) {
  if (!editingContent.value.trim()) { ElMessage.warning('内容不能为空'); return }
  await http.put(`/doc/chunk/${row.id}`, { content: editingContent.value })
  ElMessage.success('切片已编辑，旧向量已删除')
  editingId.value = ''
  await loadChunks()
}

async function handleIncrementalVectorize() {
  await ElMessageBox.confirm('确认增量向量化？只重新嵌入已编辑的切片。')
  await http.post(`/doc/vectorize-incremental/${docId}`)
  ElMessage.success('增量向量化任务已提交')
  setTimeout(loadDoc, 2000)
}

function goDocDetail(row) {
  // 同页查看切片详情（展开内容）
  startEdit(row)
}

function statusLabel(s) {
  const map = { UPLOADED:'已上传', PARSING:'解析中', PARSED:'已解析', PARSE_FAILED:'解析失败', CHUNKING:'切片中', CHUNKED:'已切片', CHUNK_FAILED:'切片失败', VECTORIZING:'向量化中', INDEXED:'已索引', VECTOR_FAILED:'向量化失败', DELETED:'已删除' }
  return map[s] || s
}
function statusType(s) {
  if (s === 'INDEXED') return 'success'
  if (s?.includes('FAILED')) return 'danger'
  if (s?.includes('ING')) return 'warning'
  return 'info'
}
function chunkStatusType(s) {
  if (s === 'VECTORIZED') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'EDITED' || s === 'STALE') return 'warning'
  return 'info'
}
function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + k[i]
}
function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { margin: 0; flex: 1; color: var(--pomelo-text-primary); }
.header-actions { display: flex; gap: 8px; }
.parsed-content {
  white-space: pre-wrap;
  background: var(--pomelo-content-bg);
  padding: 16px;
  border-radius: var(--pomelo-radius);
  max-height: 600px;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 14px;
  border: 1px solid var(--pomelo-card-border);
}
.chunk-text {
  white-space: pre-wrap;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
