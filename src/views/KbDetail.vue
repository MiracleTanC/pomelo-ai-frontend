<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="$router.push('/kb')"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2 v-if="kb">{{ kb.name }}</h2>
      </div>
      <div v-if="kb" class="header-actions">
        <el-button @click="loadDocs" :loading="docsLoading"><el-icon><Refresh /></el-icon> 刷新</el-button>
        <el-button type="primary" @click="showUpload = true"><el-icon><Upload /></el-icon> 上传文档</el-button>
        <el-button @click="handleVectorizeAll" :loading="batchLoading"><el-icon><Lightning /></el-icon> 全库向量化</el-button>
        <el-button @click="$router.push(`/search-test/${kbId}`)"><el-icon><Search /></el-icon> 检索测试</el-button>
      </div>
    </div>

    <!-- 统计面板 -->
    <el-row :gutter="12" v-if="stats" class="stats-row">
      <el-col :span="4"><el-card shadow="never"><el-statistic title="文档总数" :value="stats.totalDocs" /></el-card></el-col>
      <el-col :span="4"><el-card shadow="never"><el-statistic title="已索引" :value="stats.indexedDocs" /></el-card></el-col>
      <el-col :span="4"><el-card shadow="never"><el-statistic title="待处理" :value="stats.pendingDocs" /></el-card></el-col>
      <el-col :span="4"><el-card shadow="never"><el-statistic title="失败" :value="stats.failedDocs" :value-style="{color: stats.failedDocs > 0 ? '#f56c6c' : ''}" /></el-card></el-col>
      <el-col :span="4"><el-card shadow="never"><el-statistic title="切片总数" :value="stats.totalChunks" /></el-card></el-col>
      <el-col :span="4"><el-card shadow="never"><el-statistic title="已向量化" :value="stats.totalVectorized" /></el-card></el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="content-tabs">
      <!-- 文档管理 -->
      <el-tab-pane label="文档管理" name="docs">
        <div class="filter-bar">
          <el-select v-model="statusFilter" placeholder="按状态筛选" clearable style="width:180px" @change="loadDocs">
            <el-option label="已上传" value="UPLOADED" />
            <el-option label="已解析" value="PARSED" />
            <el-option label="已切片" value="CHUNKED" />
            <el-option label="已索引" value="INDEXED" />
            <el-option label="解析失败" value="PARSE_FAILED" />
            <el-option label="向量化失败" value="VECTOR_FAILED" />
          </el-select>
          <div>
            <el-button v-if="selectedIds.length" type="primary" @click="handleBatchVectorize">
              批量向量化 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>

        <!-- 流程说明 -->
        <div class="flow-guide">
          <span class="flow-label">处理流程：</span>
          <span class="flow-step">① 上传</span>
          <el-icon class="flow-arrow"><Right /></el-icon>
          <span class="flow-step">② 解析</span>
          <el-icon class="flow-arrow"><Right /></el-icon>
          <span class="flow-step">③ 切片</span>
          <el-icon class="flow-arrow"><Right /></el-icon>
          <span class="flow-step">④ 向量化</span>
          <el-icon class="flow-arrow"><Right /></el-icon>
          <span class="flow-step flow-step-final">⑤ 可检索</span>
          <el-divider direction="vertical" class="flow-divider" />
          <span class="flow-hint">「加工」一键执行 ②③④，鼠标悬停各操作查看详细说明</span>
        </div>

        <el-table :data="docs" v-loading="docsLoading" stripe @selection-change="onSelectionChange">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" @click="goDocDetail(row)">{{ row.name }}</el-button>
              <el-tag v-if="!row.enabled" size="small" type="warning" style="margin-left:4px">停用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="90">
            <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="向量化进度" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.chunkCount > 0">{{ row.vectorizedChunks }}/{{ row.chunkCount }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="160">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="340" align="center">
            <template #default="{ row }">
              <el-tooltip content="解析→切片→向量化一步到位，上传后一键完成" placement="top">
                <el-button link size="small" type="primary" @click="handleAction(row, 'ingest')">加工</el-button>
              </el-tooltip>
              <el-tooltip content="仅提取纯文本，暂不切片和向量化" placement="top">
                <el-button link size="small" @click="handleAction(row, 'parse')">解析</el-button>
              </el-tooltip>
              <el-tooltip content="仅将已解析的文本切分为片段" placement="top">
                <el-button link size="small" @click="handleAction(row, 'chunk')">切片</el-button>
              </el-tooltip>
              <el-tooltip content="仅将已切片的内容嵌入向量库" placement="top">
                <el-button link size="small" @click="handleAction(row, 'vectorize')">向量化</el-button>
              </el-tooltip>
              <el-tooltip content="清除旧结果，重新走完整加工流水线" placement="top">
                <el-button link size="small" @click="handleAction(row, 'reparse')">重加工</el-button>
              </el-tooltip>
              <el-tooltip :content="row.enabled ? '停用后不参与检索，向量保留' : '恢复检索'" placement="top">
                <el-button link size="small" :type="row.enabled ? 'warning' : 'success'" @click="toggleEnabled(row)">
                  {{ row.enabled ? '停用' : '启用' }}
                </el-button>
              </el-tooltip>
              <el-tooltip content="同步删除向量、切片、元数据和文件" placement="top">
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 元数据字段配置 -->
      <el-tab-pane label="元数据字段配置" name="meta">
        <div class="filter-bar">
          <span class="meta-tip">字段可动态增删，支持 SYSTEM / DOC_PROPERTY / REGEX / LLM 提取方式。新增字段后可批量补充提取。</span>
          <div>
            <el-button size="small" @click="handleReExtract" :loading="reExtractLoading">批量重新提取</el-button>
            <el-button type="primary" size="small" @click="showMetaAdd = true"><el-icon><Plus /></el-icon> 新增字段</el-button>
          </div>
        </div>
        <el-table :data="metaFields" v-loading="metaLoading" stripe size="small">
          <el-table-column prop="fieldKey" label="字段Key" width="130" />
          <el-table-column prop="fieldName" label="字段名" width="110" />
          <el-table-column prop="fieldType" label="类型" width="80" />
          <el-table-column prop="extractType" label="提取方式" width="120" />
          <el-table-column prop="extractRule" label="提取规则" min-width="200" show-overflow-tooltip />
          <el-table-column label="属性" width="160" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.required" size="small" type="danger">必填</el-tag>
              <el-tag v-if="row.searchable" size="small" type="success">可检索</el-tag>
              <el-tag v-if="row.vectorized" size="small" type="warning">向量化</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link size="small" @click="handleMetaEdit(row)">编辑</el-button>
              <el-button link size="small" type="danger" @click="handleMetaDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 知识库配置 -->
      <el-tab-pane label="知识库配置" name="config">
        <el-form v-if="kb" :model="configForm" label-width="120px" style="max-width:600px">
          <el-form-item label="名称"><el-input v-model="configForm.name" /></el-form-item>
          <el-form-item label="描述"><el-input v-model="configForm.description" type="textarea" :rows="2" /></el-form-item>
          <el-divider>切片配置</el-divider>
          <el-form-item label="切片策略">
            <el-select v-model="configForm.chunkStrategy" style="width:100%">
              <el-option label="通用切片 (general)" value="general" />
              <el-option label="按标题层级 (heading)" value="heading" />
              <el-option label="QA问答对 (qa)" value="qa" />
            </el-select>
          </el-form-item>
          <el-form-item label="切片大小"><el-input-number v-model="configForm.chunkSize" :min="100" :max="4000" :step="100" /></el-form-item>
          <el-form-item label="切片重叠"><el-input-number v-model="configForm.chunkOverlap" :min="0" :max="200" :step="10" /></el-form-item>
          <el-divider>检索配置</el-divider>
          <el-form-item label="Top-K"><el-input-number v-model="configForm.topK" :min="1" :max="20" /></el-form-item>
          <el-form-item label="重排数量"><el-input-number v-model="configForm.rerankTopK" :min="1" :max="10" /></el-form-item>
          <el-form-item label="相似度阈值"><el-input-number v-model="configForm.similarityThreshold" :min="0" :max="1" :step="0.05" :precision="2" /></el-form-item>
          <el-form-item label="自动向量化"><el-switch v-model="configForm.autoVectorize" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfig" :loading="configSaving">保存配置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 上传对话框 -->
    <el-dialog v-model="showUpload" title="上传文档" width="520px">
      <el-upload drag multiple :auto-upload="false" :file-list="uploadFiles" accept=".pdf,.docx,.txt,.md,.xlsx,.csv,.pptx" :on-change="(f) => uploadFiles.push(f)">
        <el-icon size="40"><UploadFilled /></el-icon>
        <div>拖拽文件到此处或点击选择</div>
        <template #tip>支持 PDF/Word/Excel/PPT/TXT/MD，单文件最大 100MB</template>
      </el-upload>
      <template #footer>
        <el-button @click="showUpload = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">上传</el-button>
      </template>
    </el-dialog>

    <!-- 元数据字段新增/编辑对话框 -->
    <el-dialog v-model="showMetaAdd" :title="metaForm.id ? '编辑字段' : '新增字段'" width="560px">
      <el-form :model="metaForm" label-width="100px" size="small">
        <el-form-item label="字段Key" required><el-input v-model="metaForm.fieldKey" :disabled="!!metaForm.id" placeholder="如 author" /></el-form-item>
        <el-form-item label="字段名" required><el-input v-model="metaForm.fieldName" placeholder="如 作者" /></el-form-item>
        <el-form-item label="数据类型">
          <el-select v-model="metaForm.fieldType" style="width:100%">
            <el-option v-for="t in ['string','text','number','date','datetime','list','json','enum']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="提取方式" required>
          <el-select v-model="metaForm.extractType" style="width:100%">
            <el-option label="系统自动(SYSTEM)" value="SYSTEM" />
            <el-option label="文档属性(DOC_PROPERTY)" value="DOC_PROPERTY" />
            <el-option label="正则匹配(REGEX)" value="REGEX" />
            <el-option label="大模型生成(LLM)" value="LLM" />
          </el-select>
        </el-form-item>
        <el-form-item label="提取规则">
          <el-input v-model="metaForm.extractRule" type="textarea" :rows="3" placeholder="LLM方式=提示词模板；REGEX=正则表达式；DOC_PROPERTY=属性名(title/author等)" />
        </el-form-item>
        <el-form-item label="选项">
          <el-checkbox v-model="metaForm.required">必填</el-checkbox>
          <el-checkbox v-model="metaForm.searchable">可检索</el-checkbox>
          <el-checkbox v-model="metaForm.vectorized">向量化</el-checkbox>
          <el-checkbox v-model="metaForm.displayInList">列表展示</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMetaAdd = false">取消</el-button>
        <el-button type="primary" @click="handleMetaSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kbApi } from '../api/kb'
import { docApi } from '../api/doc'
import { metaApi } from '../api/meta'
import http from '../api/http'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const kbId = route.params.id

const kb = ref(null)
const stats = ref(null)
const docs = ref([])
const docsLoading = ref(false)
const batchLoading = ref(false)
const reExtractLoading = ref(false)
const activeTab = ref('docs')
const statusFilter = ref('')
const selectedIds = ref([])

const showUpload = ref(false)
const uploadFiles = ref([])
const uploading = ref(false)

const metaFields = ref([])
const metaLoading = ref(false)
const showMetaAdd = ref(false)
const metaForm = ref({})

const configForm = reactive({ name: '', description: '', chunkSize: 500, chunkOverlap: 50, topK: 8, rerankTopK: 4, similarityThreshold: 0.3, autoVectorize: false, chunkStrategy: 'general' })
const configSaving = ref(false)

onMounted(() => { loadKb(); loadDocs(); loadMeta(); loadStats() })

watch(() => activeTab.value, (tab) => {
  if (tab === 'config' && kb.value) {
    Object.assign(configForm, { name: kb.value.name, description: kb.value.description, chunkSize: kb.value.chunkSize, chunkOverlap: kb.value.chunkOverlap, topK: kb.value.topK, rerankTopK: kb.value.rerankTopK, similarityThreshold: kb.value.similarityThreshold, autoVectorize: kb.value.autoVectorize, chunkStrategy: kb.value.chunkStrategy || 'general' })
  }
})

async function loadKb() { const res = await kbApi.get(kbId); kb.value = res.data }
async function loadDocs() {
  docsLoading.value = true
  try { const res = await docApi.list(kbId, statusFilter.value || undefined); docs.value = res.data || [] }
  finally { docsLoading.value = false }
}
async function loadStats() {
  try { const res = await http.get(`/doc/stats/${kbId}`); stats.value = res.data } catch {}
}
async function loadMeta() {
  metaLoading.value = true
  try { const res = await metaApi.list(kbId); metaFields.value = res.data || [] }
  finally { metaLoading.value = false }
}

function onSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function handleUpload() {
  if (!uploadFiles.value.length) { ElMessage.warning('请选择文件'); return }
  uploading.value = true
  try {
    const rawFiles = uploadFiles.value.map(f => f.raw)
    await docApi.uploadBatch(kbId, rawFiles)
    ElMessage.success(`已上传 ${rawFiles.length} 个文件`)
    showUpload.value = false; uploadFiles.value = []
    await loadDocs(); await loadStats()
  } finally { uploading.value = false }
}

async function handleAction(row, action) {
  const labels = { ingest: '加工', parse: '解析', vectorize: '向量化', reparse: '重加工' }
  await ElMessageBox.confirm(`确认对「${row.name}」执行${labels[action]}？`, labels[action])
  const fn = docApi[action]
  if (!fn) { ElMessage.error(`操作 ${labels[action]} 未定义`); return }
  await fn(row.id)
  ElMessage.success(`${labels[action]}任务已提交`)
  // 立即刷新一次（显示 PARSING/VECTORIZING 等中间态），然后轮询直到终态
  await loadDocs()
  pollDocStatus(row.id)
}

/** 轮询文档状态直到不再是处理中 */
async function pollDocStatus(docId) {
  const maxPolls = 30
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const doc = docs.value.find(d => d.id === docId)
    if (!doc) break  // 文档被删了
    // 处理中状态：PARSING / CHUNKING / VECTORIZING
    const isProcessing = doc.status?.includes('ING')
    await loadDocs()
    await loadStats()
    const updated = docs.value.find(d => d.id === docId)
    if (!updated || !updated.status?.includes('ING')) break
  }
}

async function handleBatchVectorize() {
  await ElMessageBox.confirm(`确认批量向量化 ${selectedIds.value.length} 篇文档？`)
  await docApi.batchVectorize(selectedIds.value)
  ElMessage.success('批量向量化任务已提交')
  await loadDocs()
  // 轮询第一个文档状态
  if (selectedIds.value.length) pollDocStatus(selectedIds.value[0])
}

async function handleVectorizeAll() {
  await ElMessageBox.confirm(`确认对知识库全部未完成文档执行向量化？`)
  batchLoading.value = true
  try {
    await docApi.vectorizeAll(kbId)
    ElMessage.success('全库向量化任务已提交')
    await loadDocs()
    // 轮询第一个非终态文档
    const pending = docs.value.find(d => d.status?.includes('ING') || d.status === 'UPLOADED' || d.status === 'PARSED' || d.status === 'CHUNKED')
    if (pending) pollDocStatus(pending.id)
  } finally { batchLoading.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？将同步删除向量、切片和元数据。`, '危险操作', { type: 'warning' })
  await docApi.delete(row.id)
  ElMessage.success('已删除')
  await loadDocs(); await loadStats(); await loadKb()
}

async function toggleEnabled(row) {
  const newEnabled = !row.enabled
  await docApi.setEnabled(row.id, newEnabled)
  ElMessage.success(newEnabled ? '已启用' : '已停用')
  await loadDocs()
}

function goDocDetail(row) { router.push({ name: 'doc-detail', params: { id: row.id } }) }

// ---- 元数据 ----
function handleMetaEdit(row) { metaForm.value = { ...row }; showMetaAdd.value = true }
async function handleMetaSave() {
  const f = metaForm.value
  if (!f.fieldKey || !f.fieldName) { ElMessage.warning('字段Key和字段名必填'); return }
  if (f.id) { await metaApi.update(kbId, f.id, f) } else { await metaApi.add(kbId, f) }
  ElMessage.success('保存成功'); showMetaAdd.value = false; metaForm.value = {}
  await loadMeta()
}
async function handleMetaDelete(row) {
  await ElMessageBox.confirm(`确认删除字段「${row.fieldName}」？`)
  await metaApi.delete(kbId, row.id)
  ElMessage.success('已删除'); await loadMeta()
}
async function handleReExtract() {
  await ElMessageBox.confirm('确认对全部已解析文档按当前字段配置重新提取元数据？')
  reExtractLoading.value = true
  try { await http.post(`/doc/meta-reextract/${kbId}`); ElMessage.success('批量重新提取已提交'); setTimeout(loadStats, 2000) }
  finally { reExtractLoading.value = false }
}

// ---- 知识库配置 ----
async function saveConfig() {
  configSaving.value = true
  try { await kbApi.update(kbId, configForm); ElMessage.success('配置已保存'); await loadKb() }
  finally { configSaving.value = false }
}

// ---- 工具 ----
function statusLabel(s) {
  const map = { UPLOADED:'已上传', PARSING:'解析中', PARSED:'已解析', PARSE_FAILED:'解析失败', CHUNKING:'切片中', CHUNKED:'已切片', CHUNK_FAILED:'切片失败', VECTORIZING:'向量化中', INDEXED:'已索引', VECTOR_FAILED:'向量化失败', DELETED:'已删除' }
  return map[s] || s
}
function statusType(s) {
  if (s === 'INDEXED') return 'success'
  if (s?.includes('FAILED')) return 'danger'
  if (s === 'UPLOADED' || s === 'PARSED' || s === 'CHUNKED') return 'info'
  if (s?.includes('ING')) return 'warning'
  return 'info'
}
function formatSize(bytes) { if (!bytes) return '0 B'; const k = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes) / Math.log(1024)); return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + k[i] }
function formatTime(t) { if (!t) return ''; return new Date(t).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { margin: 0; color: var(--pomelo-text-primary); }
.header-actions { display: flex; gap: 8px; }
.stats-row { margin-bottom: 16px; }
.filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.meta-tip { color: var(--pomelo-text-secondary); font-size: 12px; }
.flow-guide {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; margin-bottom: 12px;
  background: var(--pomelo-primary-light, #ecf5ff);
  border: 1px solid #d4e8fc;
  border-radius: var(--pomelo-radius, 8px);
  font-size: 13px;
}
.flow-label { font-weight: 600; color: var(--pomelo-primary, #409eff); white-space: nowrap; }
.flow-step {
  display: inline-flex; align-items: center;
  padding: 2px 10px; border-radius: 12px;
  background: #fff; color: var(--pomelo-text-regular, #606266);
  border: 1px solid #e4e7ed; white-space: nowrap;
}
.flow-step-final {
  background: var(--pomelo-primary, #409eff); color: #fff; border-color: var(--pomelo-primary, #409eff);
}
.flow-arrow { color: #c0c4cc; }
.flow-divider { margin: 0 4px; }
.flow-hint { color: var(--pomelo-text-secondary, #909399); white-space: nowrap; }
</style>
