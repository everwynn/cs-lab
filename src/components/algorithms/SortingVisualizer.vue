<script setup lang="ts">
// ============================================================
// SortingVisualizer — 排序算法动画演示组件
// 从 sortingAlgorithms.ts 导入步骤生成器和配置
// 纯前端，零后端，步骤预生成 + CSS 动画播放
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { algorithmMeta, type SortStep } from './sortingAlgorithms'
import VisualizerControls from './VisualizerControls.vue'
import CodePanel from './CodePanel.vue'

// ===== Props =====
const props = withDefaults(defineProps<{
  algorithm?: string
  initialArray?: number[]
}>(), {
  algorithm: 'bubble',
  initialArray: () => [5, 3, 8, 1, 9, 2, 7, 4, 6],
})

// ===== 响应式状态 =====
const meta = computed(() => algorithmMeta[props.algorithm] || algorithmMeta.bubble)
const inputArrayStr = ref(props.initialArray.join(', '))
const arraySize = ref(props.initialArray.length)
const steps = ref<SortStep[]>(meta.value.generate([...props.initialArray]))
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

// ===== 计算属性 =====
const currentStepData = computed(() => steps.value[currentStep.value])
const currentArray = computed(() => currentStepData.value?.array || [])
const maxValue = computed(() => Math.max(...currentArray.value, 1))
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
  const arr = inputArrayStr.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
  if (arr.length < 2) return
  arraySize.value = arr.length
  pause()
  steps.value = meta.value.generate(arr)
  currentStep.value = 0
}

function randomArray() {
  const len = Math.max(5, Math.min(30, arraySize.value))
  const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 90) + 10)
  inputArrayStr.value = arr.join(', ')
  regenerateSteps()
}

// ===== 统计 =====
const stats = computed(() => {
  const upto = currentStep.value + 1
  const slice = steps.value.slice(0, upto)
  const comparisons = slice.filter(s => s.comparing.length > 0).length
  const swaps = slice.filter(s => s.swapping.length === 2).length
  return { comparisons, swaps }
})

// ===== 样式辅助 =====
function barHeight(val: number): string {
  return `${(val / maxValue.value) * 100}%`
}

function getBarClasses(index: number): string {
  const step = currentStepData.value
  if (!step) return 'bg-blue-500 dark:bg-blue-600'
  if (step.swapping.includes(index)) return 'bg-red-500 dark:bg-red-500'
  if (step.comparing.includes(index)) return 'bg-amber-400 dark:bg-amber-500'
  if (step.pivot === index) return 'bg-purple-500 dark:bg-purple-500'
  if (step.sorted.includes(index)) return 'bg-green-500 dark:bg-green-600'
  return 'bg-blue-500 dark:bg-blue-600'
}

// ===== 生命周期 =====
watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.algorithm, () => regenerateSteps())
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- 数组输入 -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">数组（逗号分隔）</label>
        <input v-model="inputArrayStr" @keyup.enter="regenerateSteps" type="text"
          placeholder="5, 3, 8, 1, 9, 2, 7, 4, 6"
          class="w-full px-4 py-2.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50" />
      </div>
      <div class="flex gap-2 items-end">
        <button @click="regenerateSteps"
          class="text-xs px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-all whitespace-nowrap">应用数组</button>
        <button @click="randomArray"
          class="text-xs px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 transition-all whitespace-nowrap">🎲 随机</button>
      </div>
    </div>

    <!-- 数组大小 + 统计 -->
    <div class="flex flex-col sm:flex-row gap-4 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
      <div class="flex items-center gap-3 flex-1">
        <label class="text-xs font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">随机大小</label>
        <input v-model.number="arraySize" @change="randomArray" type="range" min="5" max="30" step="1" class="flex-1 accent-accent" />
        <span class="text-xs font-mono font-bold text-accent-dark dark:text-accent w-6">{{ arraySize }}</span>
      </div>
      <div class="flex items-center gap-4 text-xs">
        <span class="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-mono">比较 {{ stats.comparisons }}</span>
        <span class="px-2 py-1 rounded bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-mono">交换 {{ stats.swaps }}</span>
      </div>
    </div>

    <!-- 可视化 + 代码 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 柱状图 -->
      <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-600 dark:text-slate-400">数组可视化</span>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500 dark:bg-blue-600"></span>未排序</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-400 dark:bg-amber-500"></span>比较中</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500"></span>交换中</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-purple-500"></span>基准/关键</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500 dark:bg-green-600"></span>已排序</span>
          </div>
        </div>
        <div class="flex items-end justify-center gap-0.5 sm:gap-1 h-48 sm:h-64 bg-gray-50 dark:bg-slate-900/30 rounded-lg p-2 sm:p-3">
          <div v-for="(val, idx) in currentArray" :key="idx"
            :class="['flex-1 rounded-t-sm sm:rounded-t-md transition-all duration-300 ease-out flex items-start justify-center min-w-0', getBarClasses(idx)]"
            :style="{ height: barHeight(val) }">
            <span :class="['text-white font-mono font-bold pt-0.5 sm:pt-1 select-none', currentArray.length > 15 ? 'hidden' : 'hidden sm:block text-[10px] sm:text-xs']">{{ val }}</span>
          </div>
        </div>
      </div>

      <!-- 代码 -->
      <CodePanel :code="meta.code" :current-line="currentStepData?.codeLine || 0" />
    </div>

    <!-- 播放控制 -->
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
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">稳定性</div>
        <div class="text-sm font-bold" :class="meta.stable ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">{{ meta.stable ? '稳定' : '不稳定' }}</div>
      </div>
    </div>
  </div>
</template>
