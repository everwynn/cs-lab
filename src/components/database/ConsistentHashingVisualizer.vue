<script setup lang="ts">
// ============================================================
// ConsistentHashingVisualizer —— 哈希环 + 虚拟节点动画可视化
// SVG 环：物理节点（大圆）、虚拟节点（小点）、key（菱形）
// 顺时针归属弧线 + 扩容迁移区间高亮；复用统一播放栏与代码面板
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { consistentHashingDefinition } from './consistentHashingDefinition'
import type { HashRingState, HashRingStep, HashRingNode } from './consistentHashingDefinition'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const ds = consistentHashingDefinition
const steps = computed<HashRingStep[]>(() => ds.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<HashRingStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)

const emptyState: HashRingState = {
  nodes: [],
  keys: [],
  ownerCounts: {},
  scanningKeyId: null,
  highlightArc: null,
  message: null,
}
const state = computed<HashRingState>(() => currentStepData.value?.state ?? emptyState)

// ---------- 环几何 ----------
const CX = 280
const CY = 280
const R = 200
const KEY_R = 156
const KEY_LABEL_R = 126

const toXY = (angle: number, radius: number) => {
  const rad = (angle * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

const pointXY = (node: HashRingNode) => toXY(node.angle, R)
const keyXY = (angle: number) => toXY(angle, KEY_R)
const keyLabelXY = (angle: number) => toXY(angle, KEY_LABEL_R)

const arcPath = (from: number, to: number, radius: number) => {
  const span = (to - from + 360) % 360
  if (span < 0.5) return ''
  const start = toXY(from, radius)
  const end = toXY(to, radius)
  const largeArc = span > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

const midAngle = (from: number, to: number) => {
  const span = (to - from + 360) % 360
  return (from + span / 2) % 360
}

// ---------- 颜色 ----------
const COLORS: Record<string, string> = {
  A: '#0ea5e9',
  B: '#8b5cf6',
  C: '#f59e0b',
  D: '#10b981',
}
const colorOf = (id: string | null): string => (id && COLORS[id]) || '#94a3b8'

const physicals = computed(() => state.value.nodes.filter((node) => !node.vnodeOf))
const vnodes = computed(() => state.value.nodes.filter((node) => node.vnodeOf))
const maxCount = computed(() => Math.max(1, ...Object.values(state.value.ownerCounts)))
const highlight = computed(() => state.value.highlightArc)

const keyFill = (id: string) => {
  if (state.value.scanningKeyId === id) return '#f59e0b'
  const key = state.value.keys.find((item) => item.id === id)
  return key?.migrating ? '#ef4444' : key?.owner ? colorOf(key.owner) : '#94a3b8'
}

// ---------- 播放控制 ----------
function play() {
  if (isPlaying.value) return
  isPlaying.value = true
  scheduleNext()
}

function pause() {
  isPlaying.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function scheduleNext() {
  if (timer) clearInterval(timer)
  const interval = Math.max(300, 1500 / speed.value)
  timer = setInterval(() => {
    if (currentStep.value >= totalSteps.value - 1) {
      pause()
      return
    }
    currentStep.value++
  }, interval)
}

function togglePlay() {
  if (isPlaying.value) pause()
  else play()
}

function stepForward() {
  if (currentStep.value < totalSteps.value - 1) currentStep.value++
}

function stepBackward() {
  if (currentStep.value > 0) currentStep.value--
}

function jumpStart() {
  currentStep.value = 0
}

function jumpEnd() {
  currentStep.value = totalSteps.value - 1
}

function reset() {
  pause()
  currentStep.value = 0
}

watch(speed, () => {
  if (isPlaying.value) scheduleNext()
})

onUnmounted(() => {
  pause()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 标题与场景 -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-3xl">{{ ds.icon }}</span>
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{{ ds.name }}</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ ds.desc }}</p>
        </div>
        <span class="ml-auto text-xs px-2.5 py-1 rounded-full border bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
          分布式
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-full bg-sky-500"></span>
          物理节点
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-2 w-2 rounded-full bg-sky-300"></span>
          虚拟节点
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rotate-45 bg-gray-400"></span>
          key
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-1 w-5 rounded bg-amber-400"></span>
          归属 / 迁移区间
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          <div v-if="state.message" class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
            {{ state.message }}
          </div>
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-2">
            <svg viewBox="0 0 560 560" class="w-full max-w-[520px] mx-auto" role="img" aria-label="一致性哈希环">
              <!-- 底环 -->
              <circle :cx="CX" :cy="CY" :r="R" fill="none" class="stroke-gray-200 dark:stroke-slate-700" stroke-width="2" />
              <!-- 角度刻度 -->
              <text v-for="deg in [0, 90, 180, 270]" :key="`deg-${deg}`" :x="toXY(deg, 252).x" :y="toXY(deg, 252).y"
                text-anchor="middle" dominant-baseline="middle" class="fill-gray-300 dark:fill-slate-600" font-size="11">
                {{ deg }}°
              </text>

              <!-- 归属 / 迁移区间高亮 -->
              <path v-if="highlight && arcPath(highlight.from, highlight.to, R)"
                :d="arcPath(highlight.from, highlight.to, R)" fill="none" stroke="#f59e0b" stroke-width="10"
                stroke-opacity="0.25" stroke-linecap="round" />
              <path v-if="highlight && arcPath(highlight.from, highlight.to, R)"
                :d="arcPath(highlight.from, highlight.to, R)" fill="none" stroke="#f59e0b" stroke-width="3"
                stroke-dasharray="6,4" stroke-linecap="round" />
              <text v-if="highlight" :x="toXY(midAngle(highlight.from, highlight.to), 232).x"
                :y="toXY(midAngle(highlight.from, highlight.to), 232).y" text-anchor="middle"
                class="fill-amber-500" font-size="11" font-weight="600">
                {{ highlight.label }}
              </text>

              <!-- 虚拟节点 -->
              <circle v-for="node in vnodes" :key="node.id" :cx="pointXY(node).x" :cy="pointXY(node).y" r="5"
                :fill="colorOf(node.vnodeOf)" fill-opacity="0.75">
                <title>{{ node.label }}（{{ node.angle }}°）</title>
              </circle>

              <!-- 物理节点 -->
              <g v-for="node in physicals" :key="node.id">
                <circle :cx="pointXY(node).x" :cy="pointXY(node).y" r="13" :fill="colorOf(node.id)" />
                <text :x="pointXY(node).x" :y="pointXY(node).y" text-anchor="middle" dominant-baseline="middle"
                  fill="#ffffff" font-size="13" font-weight="700">{{ node.label }}</text>
                <text :x="toXY(node.angle, 228).x" :y="toXY(node.angle, 228).y" text-anchor="middle"
                  dominant-baseline="middle" class="fill-gray-500 dark:fill-slate-400" font-size="11">
                  {{ node.label }} · {{ node.angle }}°
                </text>
              </g>

              <!-- key -->
              <g v-for="key in state.keys" :key="key.id">
                <rect :x="keyXY(key.angle).x - 6" :y="keyXY(key.angle).y - 6" width="12" height="12" rx="2"
                  :fill="keyFill(key.id)" :transform="`rotate(45 ${keyXY(key.angle).x} ${keyXY(key.angle).y})`"
                  :stroke="state.scanningKeyId === key.id ? '#f59e0b' : 'transparent'" stroke-width="2">
                  <title>{{ key.label }}（{{ key.angle }}°）→ {{ key.owner ?? '未归属' }}</title>
                </rect>
                <text :x="keyLabelXY(key.angle).x" :y="keyLabelXY(key.angle).y" text-anchor="middle"
                  dominant-baseline="middle" class="fill-gray-500 dark:fill-slate-400" font-size="11" font-weight="600">
                  {{ key.label }}
                </text>
              </g>

              <!-- 空环提示 -->
              <text v-if="state.nodes.length === 0" :x="CX" :y="CY + 4" text-anchor="middle"
                class="fill-gray-300 dark:fill-slate-600" font-size="13">空环：0°..359°</text>
            </svg>
          </div>

          <!-- 负载统计 -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-2">各节点负载（key 数）</div>
            <div v-if="Object.keys(state.ownerCounts).length" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div v-for="(count, id) in state.ownerCounts" :key="id" class="space-y-1">
                <div class="flex items-center gap-1.5 text-[11px] font-mono">
                  <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: colorOf(id) }"></span>
                  <span class="text-gray-600 dark:text-slate-300">{{ id }}</span>
                  <span class="ml-auto font-bold text-gray-900 dark:text-white">{{ count }}</span>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div class="h-full rounded-full transition-all" :style="{ width: `${(count / maxCount) * 100}%`, backgroundColor: colorOf(id) }"></div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-gray-400 dark:text-slate-500 font-mono">环上还没有节点</div>
          </div>
        </div>

        <!-- 步骤说明 -->
        <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 min-h-[5rem]">
          <div class="text-xs text-gray-500 dark:text-slate-500 mb-1.5">步骤 {{ currentStep + 1 }} / {{ totalSteps }}</div>
          <p class="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
            {{ currentStepData?.description || '准备就绪，点击播放开始演示。' }}
          </p>
        </div>

        <!-- 控制栏 -->
        <VisualizerControls
          :is-playing="isPlaying"
          :current-step="currentStep"
          :total-steps="totalSteps"
          :speed="speed"
          @toggle-play="togglePlay"
          @step-forward="stepForward"
          @step-backward="stepBackward"
          @jump-start="jumpStart"
          @jump-end="jumpEnd"
          @reset="reset"
          @update:speed="speed = $event" />
      </div>

      <!-- 右侧：代码面板 -->
      <div class="h-full">
        <CodePanel :code="ds.code" :current-line="currentStepData?.codeLine || 0" />
      </div>
    </div>
  </div>
</template>
