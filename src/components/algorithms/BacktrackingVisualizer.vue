<script setup lang="ts">
// ============================================================
// BacktrackingVisualizer — 回溯算法动画演示组件
// 支持 N 皇后和数独两种可视化模式
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { backtrackAlgorithmMeta, type BacktrackStep } from './backtrackingAlgorithms'
import VisualizerControls from './VisualizerControls.vue'
import CodePanel from './CodePanel.vue'

const props = withDefaults(defineProps<{
  algorithm?: string
}>(), {
  algorithm: 'nQueens',
})

const meta = computed(() => backtrackAlgorithmMeta[props.algorithm] || backtrackAlgorithmMeta.nQueens)
const steps = ref<BacktrackStep[]>(meta.value.generate())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)
const progress = computed(() => totalSteps.value > 0 ? Math.round(((currentStep.value + 1) / totalSteps.value) * 100) : 0)
const intervalMs = computed(() => Math.max(100, Math.round(800 / speed.value)))

const isNQueens = computed(() => props.algorithm === 'nQueens')
const boardSize = computed(() => currentStepData.value?.board.length || 4)

// 播放控制
function play() {
  if (currentStep.value >= totalSteps.value - 1) currentStep.value = 0
  isPlaying.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (currentStep.value < totalSteps.value - 1) currentStep.value++
    else pause()
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

// 单元格样式
function getCellClasses(row: number, col: number): string {
  const step = currentStepData.value
  if (!step) return ''
  const isCurrent = step.row === row && step.col === col
  const isFixed = step.fixed?.[row]?.[col]
  const hasQueen = isNQueens.value && step.board[row][col] === 1
  const hasNum = !isNQueens.value && step.board[row][col] !== 0

  if (isCurrent && step.backtracking) {
    return 'bg-red-100 dark:bg-red-900/40 ring-2 ring-red-500 animate-pulse'
  }
  if (isCurrent && step.isValid === false) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-400'
  }
  if (isCurrent && (step.placed || step.isValid)) {
    return 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500'
  }
  if (isCurrent) {
    return 'bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500'
  }
  if (isFixed) {
    return 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold'
  }
  if (hasQueen || hasNum) {
    return 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
  }
  // 棋盘交替色
  const isDarkCell = (row + col) % 2 === 1
  return isDarkCell
    ? 'bg-amber-50 dark:bg-slate-800'
    : 'bg-amber-100/50 dark:bg-slate-900/50'
}

function getCellContent(row: number, col: number): string {
  const step = currentStepData.value
  if (!step) return ''
  if (isNQueens.value) {
    return step.board[row][col] === 1 ? '♛' : ''
  }
  const val = step.board[row][col]
  return val === 0 ? '' : String(val)
}

// 统计
const queenCount = computed(() => {
  const step = currentStepData.value
  if (!step || !isNQueens.value) return 0
  return step.board.flat().filter(v => v === 1).length
})

watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.algorithm, () => {
  steps.value = meta.value.generate()
  currentStep.value = 0
})
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- 棋盘 + 代码 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 棋盘 -->
      <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-600 dark:text-slate-400">
            {{ isNQueens ? '棋盘' : '数独网格' }}
          </span>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-500"></span>当前</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 ring-1 ring-green-500"></span>放置</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 ring-1 ring-red-500"></span>冲突/回溯</span>
            <span v-if="!isNQueens" class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-gray-200 dark:bg-slate-700"></span>固定</span>
          </div>
        </div>

        <div class="flex justify-center">
          <div
            class="inline-grid border-2 border-gray-700 dark:border-slate-400 rounded-lg overflow-hidden"
            :style="{ gridTemplateColumns: `repeat(${boardSize}, minmax(2.5rem, 4rem))` }">
            <div
              v-for="row in boardSize"
              :key="`row-${row}`"
              class="contents">
              <div
                v-for="col in boardSize"
                :key="`cell-${row - 1}-${col - 1}`"
                :class="[
                  'w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-2xl font-bold transition-all duration-300 border border-gray-300 dark:border-slate-600',
                  getCellClasses(row - 1, col - 1),
                ]">
                {{ getCellContent(row - 1, col - 1) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 皇后计数 -->
        <div v-if="isNQueens" class="mt-4 flex items-center justify-center gap-2">
          <span class="text-xs text-gray-500 dark:text-slate-400">已放置皇后：</span>
          <span class="text-sm font-bold font-mono text-accent-dark dark:text-accent">{{ queenCount }} / {{ boardSize }}</span>
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
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
    </div>
  </div>
</template>
