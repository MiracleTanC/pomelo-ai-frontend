<template>
  <div class="page">
    <div class="page-header">
      <el-button link @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
      <h2>向量空间可视化</h2>
      <div>
        <el-select v-model="kbId" placeholder="选择知识库" style="width:200px" @change="loadData">
          <el-option v-for="kb in kbs" :key="kb.id" :label="kb.name" :value="kb.id" />
        </el-select>
        <el-button @click="loadData" :loading="loading" style="margin-left:8px">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="result?.message && result.message !== 'ok'" type="warning" :title="result.message" :closable="false" style="margin-bottom:12px" />

    <div class="viz-container" v-loading="loading">
      <canvas ref="canvas" width="900" height="600" @mousemove="onMouseMove" @mouseleave="hovered = null"></canvas>
      <div v-if="hovered" class="tooltip" :style="{ left: hovered.x + 15 + 'px', top: hovered.y + 15 + 'px' }">
        <div class="tooltip-title">{{ hovered.docName }}</div>
        <div class="tooltip-text">{{ hovered.preview }}</div>
        <div class="tooltip-meta">页 {{ hovered.page }} · 切片 {{ hovered.chunkIndex }}</div>
      </div>
    </div>

    <div class="legend" v-if="docColors.length > 1">
      <span class="legend-title">文档分组：</span>
      <span v-for="(d, i) in docColors" :key="d.docId" class="legend-item">
        <span class="color-dot" :style="{ background: d.color }"></span>
        {{ d.docName }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import http from '../api/http'
import { kbApi } from '../api/kb'

const kbs = ref([])
const kbId = ref('')
const result = ref(null)
const loading = ref(false)
const canvas = ref(null)
const hovered = ref(null)
const points = ref([])
const docColors = ref([])

const COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6', '#1abc9c', '#34495e', '#e74c3c', '#2ecc71']

onMounted(async () => {
  const res = await kbApi.list()
  kbs.value = res.data || []
  if (kbs.value.length) {
    kbId.value = kbs.value[0].id
    await loadData()
  }
})

async function loadData() {
  if (!kbId.value) return
  loading.value = true
  try {
    const res = await http.get(`/viz/scatter/${kbId.value}`)
    result.value = res.data
    points.value = res.data.points || []
    // 按文档分组分配颜色
    const docMap = new Map()
    points.value.forEach(p => {
      if (!docMap.has(p.docId)) docMap.set(p.docId, { docId: p.docId, docName: p.docName, color: COLORS[docMap.size % COLORS.length] })
    })
    docColors.value = [...docMap.values()]
    await nextTick()
    draw()
  } finally { loading.value = false }
}

function draw() {
  const ctx = canvas.value.getContext('2d')
  const w = canvas.value.width, h = canvas.value.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, w, h)

  if (points.value.length === 0) {
    ctx.fillStyle = '#ccc'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('暂无向量数据', w / 2, h / 2)
    return
  }

  // 计算坐标范围
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  points.value.forEach(p => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  })
  const pad = 40
  const sx = (w - pad * 2) / (maxX - minX || 1)
  const sy = (h - pad * 2) / (maxY - minY || 1)

  // 画轴
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke()

  // 画散点
  points.value.forEach(p => {
    const docColor = docColors.value.find(d => d.docId === p.docId)?.color || '#409eff'
    const x = pad + (p.x - minX) * sx
    const y = h - pad - (p.y - minY) * sy
    p._sx = x; p._sy = y
    ctx.fillStyle = docColor + 'cc'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = docColor
    ctx.lineWidth = 0.5
    ctx.stroke()
  })

  // 标题
  ctx.fillStyle = '#333'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`PCA 2D 降维 · ${points.value.length} 个向量`, pad, 20)
}

function onMouseMove(e) {
  const rect = canvas.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  let nearest = null
  let minDist = 10
  points.value.forEach(p => {
    if (!p._sx) return
    const d = Math.hypot(p._sx - mx, p._sy - my)
    if (d < minDist) {
      minDist = d
      nearest = { ...p, x: mx, y: my }
    }
  })
  hovered.value = nearest
}
</script>

<style scoped>
.page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { margin: 0; flex: 1; color: var(--pomelo-text-primary); }
.viz-container {
  position: relative;
  background: var(--pomelo-card-bg);
  border: 1px solid var(--pomelo-card-border);
  border-radius: var(--pomelo-radius);
  padding: 16px;
}
canvas { display: block; border: 1px solid var(--pomelo-card-border); border-radius: var(--pomelo-radius-sm); cursor: crosshair; }
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 8px 12px;
  border-radius: var(--pomelo-radius-sm);
  font-size: 12px;
  max-width: 300px;
  pointer-events: none;
  z-index: 10;
}
.tooltip-title { font-weight: bold; margin-bottom: 4px; }
.tooltip-text { max-height: 60px; overflow: hidden; }
.tooltip-meta { color: rgba(255, 255, 255, 0.6); margin-top: 4px; }
.legend { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.legend-title { font-weight: bold; font-size: 13px; color: var(--pomelo-text-primary); }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--pomelo-text-regular); }
.color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
</style>
