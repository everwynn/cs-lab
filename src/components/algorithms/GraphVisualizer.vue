<script setup lang="ts">
// ============================================================
// GraphVisualizer — 图论算法动画演示组件
// 从 graphAlgorithms.ts 导入步骤生成器和配置
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { graphAlgorithmMeta, graphNodes, type GraphStep, type GraphNode, type GraphEdge } from './graphAlgorithms'
import VisualizerControls from './VisualizerControls.vue'
import CodePanel from './CodePanel.vue'

// ===== Props =====
const props = withDefaults(defineProps<{
  algorithm?: string
  startNode?: string
}>(), {
  algorithm: 'bfs',
  startNode: 'A',
})

// ===== 响应式状态 =====
const meta = computed(() => graphAlgorithmMeta[props.algorithm] || graphAlgorithmMeta.bfs)
const startNode = ref(props.startNode)
const steps = ref<GraphStep[]>(meta.value.generate(startNode.value))
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

// ===== 计算属性 =====
const currentStepData = computed(() => steps.value[currentStep.value])
const visitedCount = computed(() => currentStepData.value?.visited.length || 0)
const totalSteps = computed(() => steps.value.length)
const progress = computed(() => totalSteps.value > 0 ? Math.round(((currentStep.value + 1) / totalSteps.value) * 100) : 0)
const intervalMs = computed(() => Math.max(100, Math.round(800 / speed.value)))

// ===== 播放控制 =====
function play() {
  if (currentStep.value >= totalSteps.value - 1) currentStep.value = 0
  isPlaying.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++
    } else {
      pause()
    }
  }, intervalMs.value)
}

function pause() {
  isPlaying.value = false
  if (timer) { clearInterval(timer); timer = null }
}

function togglePlay() { isPlaying.value ? pause() : play() }
function stepForward() { pause(); if (currentStep.value < totalSteps.value - 1) currentStep.value++ }
function stepBackward() { pause(); if (currentStep.value > 0) currentStep.value-- }
function reset() { pause(); currentStep.value = 0 }
function jumpStart() { pause(); currentStep.value = 0 }
function jumpEnd() { pause(); currentStep.value = totalSteps.value - 1 }

function regenerateSteps() {
  pause()
  steps.value = meta.value.generate(startNode.value)
  currentStep.value = 0
}

// ===== SVG 辅助 =====
function nodeClasses(node: GraphNode): string {
  const step = currentStepData.value
  if (!step) return 'fill-blue-500 stroke-blue-600 dark:fill-blue-600 dark:stroke-blue-500'
  if (step.current === node.id) return 'fill-amber-400 stroke-amber-500 dark:fill-amber-500 dark:stroke-amber-400'
  if (step.visited.includes(node.id)) return 'fill-green-500 stroke-green-600 dark:fill-green-600 dark:stroke-green-500'
  if (isFrontier(node.id)) return 'fill-purple-500 stroke-purple-600 dark:fill-purple-500 dark:stroke-purple-400'
  return 'fill-blue-500 stroke-blue-600 dark:fill-blue-600 dark:stroke-blue-500'
}

function isFrontier(nodeId: string): boolean {
  const step = currentStepData.value
  if (!step) return false
  if (step.queue && step.queue.includes(nodeId)) return true
  if (step.stack && step.stack.includes(nodeId)) return true
  return false
}

function edgeClasses(edge: GraphEdge): string {
  const step = currentStepData.value
  if (!step || !step.current) return 'stroke-gray-300 dark:stroke-slate-600'
  if ((edge.from === step.current || edge.to === step.current)) {
    const other = edge.from === step.current ? edge.to : edge.from
    if (!step.visited.includes(other) || step.visited.indexOf(step.current) >= step.visited.indexOf(other)) {
      return 'stroke-amber-400 dark:stroke-amber-500'
    }
  }
  return 'stroke-gray-300 dark:stroke-slate-600'
}

function nodeRadius(node: GraphNode): number {
  const step = currentStepData.value
  if (step && step.current === node.id) return 24
  return 20
}

function formatDist(d: number): string {
  return d === Infinity ? '∞' : String(d)
}

// ===== 生命周期 =====
watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.algorithm, () => regenerateSteps())
watch(startNode, () => regenerateSteps())
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- 可视化 + 代码 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 图可视化 -->
      <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-600 dark:text-slate-400">图可视化</span>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-600"></span>未访问</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-500"></span>待访问</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500"></span>当前</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 dark:bg-green-600"></span>已访问</span>
          </div>
        </div>
        <div class="flex justify-center bg-gray-50 dark:bg-slate-900/30 rounded-lg p-2 sm:p-4">
          <svg viewBox="0 0 400 320" class="w-full sm:max-w-md h-auto">
            <!-- 边 -->
            <line v-for="(edge, idx) in currentStepData?.edges" :key="'edge-' + idx"
              :x1="currentStepData?.nodes.find(n => n.id === edge.from)?.x"
              :y1="currentStepData?.nodes.find(n => n.id === edge.from)?.y"
              :x2="currentStepData?.nodes.find(n => n.id === edge.to)?.x"
              :y2="currentStepData?.nodes.find(n => n.id === edge.to)?.y"
              :class="['transition-all duration-300', edgeClasses(edge)]"
              stroke-width="3" />
            <!-- 边权重 -->
            <text v-for="(edge, idx) in (meta.weighted ? currentStepData?.edges : [])" :key="'weight-' + idx"
              :x="((currentStepData?.nodes.find(n => n.id === edge.from)?.x || 0) + (currentStepData?.nodes.find(n => n.id === edge.to)?.x || 0)) / 2"
              :y="((currentStepData?.nodes.find(n => n.id === edge.from)?.y || 0) + (currentStepData?.nodes.find(n => n.id === edge.to)?.y || 0)) / 2 - 6"
              class="text-xs font-mono font-bold fill-gray-500 dark:fill-slate-400"
              text-anchor="middle">
              {{ edge.weight }}
            </text>
            <!-- 节点 -->
            <g v-for="node in currentStepData?.nodes" :key="node.id">
              <circle :cx="node.x" :cy="node.y" :r="nodeRadius(node)"
                :class="['transition-all duration-300', nodeClasses(node)]"
                stroke-width="3" />
              <text :x="node.x" :y="node.y" dy="0.35em"
                class="text-sm font-bold fill-white"
                text-anchor="middle">
                {{ node.label }}
              </text>
            </g>
          </svg>
        </div>

        <!-- 状态面板 -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="currentStepData?.queue !== undefined" class="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <div class="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">队列 Queue</div>
            <div class="text-sm font-mono text-purple-700 dark:text-purple-300">{{ currentStepData.queue.length > 0 ? currentStepData.queue.join(' → ') : '空' }}</div>
          </div>
          <div v-if="currentStepData?.stack !== undefined" class="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <div class="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">栈 Stack</div>
            <div class="text-sm font-mono text-purple-700 dark:text-purple-300">{{ currentStepData.stack.length > 0 ? currentStepData.stack.join(' | ') : '空' }}</div>
          </div>
          <div v-if="currentStepData?.distances !== undefined" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 sm:col-span-2">
            <div class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">最短距离 Dist</div>
            <div class="flex flex-wrap gap-2">
              <span v-for="node in currentStepData.nodes" :key="'dist-' + node.id"
                class="text-xs font-mono px-2 py-1 rounded"
                :class="currentStepData.current === node.id ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300'">
                {{ node.label }}={{ formatDist(currentStepData.distances[node.id]) }}
              </span>
            </div>
          </div>
          <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 sm:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-green-600 dark:text-green-400 font-medium">遍历顺序</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 font-mono">已访问 {{ visitedCount }} / {{ currentStepData?.nodes.length || 0 }}</span>
            </div>
            <div class="text-sm font-mono text-green-700 dark:text-green-300">
              {{ currentStepData?.traversalOrder?.length > 0 ? currentStepData.traversalOrder.join(' → ') : '尚未访问节点' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 代码 -->
      <CodePanel :code="meta.code" :current-line="currentStepData?.codeLine || 0" />
    </div>

    <!-- 起点选择 + 播放控制 -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
        <label class="text-xs font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">起点</label>
        <select v-model="startNode"
          class="text-sm font-mono px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option v-for="node in graphNodes" :key="node.id" :value="node.id">{{ node.label }}</option>
        </select>
      </div>
      <div class="flex-1">
        <VisualizerControls
          :is-playing="isPlaying"
          :current-step="currentStep"
          :total-steps="totalSteps"
          v-model:speed="speed"
          @toggle-play="togglePlay"
          @step-backward="stepBackward"
          @step-forward="stepForward"
          @reset="reset"
          @jump-start="jumpStart"
          @jump-end="jumpEnd" />
      </div>
    </div>

    <!-- 进度 + 步骤说明 -->
    <div>
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
        <span>步骤 <strong class="text-gray-700 dark:text-slate-200">{{ currentStep + 1 }}</strong> / {{ totalSteps }}</span>
        <span class="font-mono">{{ progress }}%</span>
      </div>
      <div class="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div class="h-full rounded-full bg-accent transition-all duration-300" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="mt-3 p-3.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ currentStepData?.description || '准备就绪' }}</span>
      </div>
    </div>

    <!-- 算法信息 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">最优时间</div>
        <div class="text-sm font-bold font-mono text-green-600 dark:text-green-400">{{ meta.timeBest }}</div>
      </div>
      <div class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">平均时间</div>
        <div class="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{{ meta.timeAvg }}</div>
      </div>
      <div class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">最差时间</div>
        <div class="text-sm font-bold font-mono text-red-500 dark:text-red-400">{{ meta.timeWorst }}</div>
      </div>
      <div class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">空间复杂度</div>
        <div class="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{{ meta.space }}</div>
      </div>
      <div class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">图类型</div>
        <div class="text-sm font-bold text-purple-600 dark:text-purple-400">{{ meta.weighted ? '带权' : '无权' }} · {{ meta.directed ? '有向' : '无向' }}</div>
      </div>
    </div>
  </div>
</template>
