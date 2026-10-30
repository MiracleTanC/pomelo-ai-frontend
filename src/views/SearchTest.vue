<template>
  <div class="page">
    <div class="page-header">
      <el-button link @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
      <h2>检索测试</h2>
    </div>

    <el-card shadow="never" class="test-card">
      <el-input v-model="query" type="textarea" :rows="3" placeholder="输入测试问题…" />
      <div class="params-bar">
        <span class="param-item">Top-K: <el-input-number v-model="topK" :min="1" :max="20" size="small" /></span>
        <span class="param-item">相似度阈值: <el-input-number v-model="threshold" :min="0" :max="1" :step="0.05" :precision="2" size="small" /></span>
        <el-button type="primary" @click="runSearch" :loading="loading">
          <el-icon><Search /></el-icon> 检索
        </el-button>
      </div>
    </el-card>

    <div v-if="results.length" class="results-area">
      <div class="results-title">召回结果（{{ results.length }} 条）</div>
      <el-card v-for="(r, i) in results" :key="i" shadow="never" class="result-card">
        <div class="result-header">
          <span class="result-idx">#{{ i + 1 }}</span>
          <span class="result-doc">{{ r.docName }}</span>
          <el-tag size="small" type="success">相似度: {{ (r.score ?? 0).toFixed(4) }}</el-tag>
          <span v-if="r.page" class="result-page">p.{{ r.page }}</span>
        </div>
        <div class="result-content">{{ r.content || r.text }}</div>
      </el-card>
    </div>
    <el-empty v-else-if="searched" description="无召回结果" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import http from '../api/http'
import { ElMessage } from 'element-plus'

const route = useRoute()
const kbId = route.params.kbId
const query = ref('')
const topK = ref(8)
const threshold = ref(0.3)
const loading = ref(false)
const searched = ref(false)
const results = ref([])

onMounted(async () => {
  const res = await http.get(`/kb/${kbId}`)
  topK.value = res.data.topK || 8
  threshold.value = res.data.similarityThreshold || 0.3
})

async function runSearch() {
  if (!query.value.trim()) { ElMessage.warning('请输入测试问题'); return }
  loading.value = true
  searched.value = true
  try {
    const res = await http.post(`/chat/search-test`, {
      kbId, message: query.value, topK: topK.value, similarityThreshold: threshold.value,
    })
    results.value = res.data || []
  } finally { loading.value = false }
}
</script>

<style scoped>
.page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { margin: 0; color: var(--pomelo-text-primary); }
.test-card { margin-bottom: 20px; }
.params-bar { display: flex; align-items: center; gap: 20px; margin-top: 12px; }
.param-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.results-area { margin-top: 20px; }
.results-title { font-weight: 600; margin-bottom: 12px; color: var(--pomelo-text-primary); }
.result-card { margin-bottom: 10px; }
.result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.result-idx { font-weight: 600; color: var(--pomelo-primary); }
.result-doc { font-weight: 600; color: var(--pomelo-text-primary); }
.result-page { color: var(--pomelo-text-secondary); font-size: 12px; }
.result-content { white-space: pre-wrap; line-height: 1.8; color: var(--pomelo-text-primary); }
</style>
