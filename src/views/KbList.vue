<template>
  <div class="page">
    <div class="page-header">
      <h2>知识库</h2>
      <el-button type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon> 创建知识库
      </el-button>
    </div>

    <el-table :data="kbs" v-loading="loading" stripe @row-click="goDetail" style="cursor:pointer">
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="docCount" label="文档" width="80" align="center" />
      <el-table-column prop="chunkCount" label="切片" width="80" align="center" />
      <el-table-column label="切片策略" width="120" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.chunkStrategy || 'general' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="自动向量化" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.autoVectorize ? 'success' : 'info'" size="small">
            {{ row.autoVectorize ? '开' : '关' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center">
        <template #default="{ row }">
          <el-button link @click.stop="goDetail(row)">进入</el-button>
          <el-button link @click.stop="goChat(row)">对话</el-button>
          <el-button link type="danger" @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建对话框 -->
    <el-dialog v-model="showCreate" title="创建知识库" width="520px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="知识库名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-divider>切片配置</el-divider>
        <el-form-item label="切片策略">
          <el-select v-model="form.chunkStrategy" style="width:100%">
            <el-option label="通用切片 (general)" value="general" />
            <el-option label="按标题层级 (heading)" value="heading" />
            <el-option label="QA问答对 (qa)" value="qa" />
          </el-select>
        </el-form-item>
        <el-form-item label="切片大小">
          <el-input-number v-model="form.chunkSize" :min="100" :max="4000" :step="100" />
        </el-form-item>
        <el-form-item label="切片重叠">
          <el-input-number v-model="form.chunkOverlap" :min="0" :max="200" :step="10" />
        </el-form-item>
        <el-divider>检索配置</el-divider>
        <el-form-item label="Top-K">
          <el-input-number v-model="form.topK" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="重排数量">
          <el-input-number v-model="form.rerankTopK" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="相似度阈值">
          <el-input-number v-model="form.similarityThreshold" :min="0" :max="1" :step="0.05" :precision="2" />
        </el-form-item>
        <el-form-item label="自动向量化">
          <el-switch v-model="form.autoVectorize" />
          <span class="tip">开启后上传文档自动触发向量化</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { kbApi } from '../api/kb'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const kbs = ref([])
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const form = ref({
  name: '', description: '',
  chunkSize: 500, chunkOverlap: 50,
  topK: 8, rerankTopK: 4, similarityThreshold: 0.3,
  autoVectorize: false, chunkStrategy: 'general',
})

async function load() {
  loading.value = true
  try {
    const res = await kbApi.list()
    kbs.value = res.data || []
  } finally { loading.value = false }
}

async function handleCreate() {
  if (!form.value.name.trim()) { ElMessage.warning('请输入名称'); return }
  creating.value = true
  try {
    await kbApi.create(form.value)
    ElMessage.success('创建成功')
    showCreate.value = false
    form.value = { name: '', description: '', chunkSize: 500, chunkOverlap: 50, topK: 8, rerankTopK: 4, similarityThreshold: 0.3, autoVectorize: false, chunkStrategy: 'general' }
    await load()
  } finally { creating.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除知识库「${row.name}」？该操作将删除所有文档、向量及元数据。`, '危险操作', { type: 'warning' })
  await kbApi.delete(row.id)
  ElMessage.success('已删除')
  await load()
}

function goDetail(row) { router.push({ name: 'kb-detail', params: { id: row.id } }) }
function goChat(row) { router.push({ name: 'chat', query: { kbId: row.id } }) }

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<style scoped>
.page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; color: var(--pomelo-text-primary); }
.tip { margin-left: 10px; color: var(--pomelo-text-secondary); font-size: 12px; }
</style>
