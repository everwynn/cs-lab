<script setup lang="ts">
// ============================================================
// DpVisualizer — 动态规划算法动画演示组件
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { dpAlgorithmMeta, type DpStep } from './dpAlgorithms'
import VisualizerControls from './VisualizerControls.vue'
import CodePanel from './CodePanel.vue'

const props = withDefaults(defineProps<{
  algorithm?: string
}>(), {
  algorithm: 'fibonacci',
})

const meta = computed(() => dpAlgorithmMeta[props.algorithm] || dpAlgorithmMeta.fibonacci)
const steps = ref<DpStep[]>(meta.value.generate())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)
const progress = computed(() => totalSteps.value > 0 ? Math.round(((currentStep.value + 1) / totalSteps.value) * 100) : 0)
const intervalMs = computed(() => Math.max(100, Math.round(800 / speed.value)))

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
  if (!step) return 'bg-gray-100 dark:bg-slate-800'

  // 路径高亮（回溯路径）
  if (step.path && step.path.some(([r, c]) => r === row && c === col)) {
    return 'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 ring-2 ring-purple-400'
  }

  // 当前正在计算
  if (step.highlight.some(([r, c]) => r === row && c === col)) {
    return 'bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white ring-2 ring-amber-500 font-bold'
  }

  // 已填充
  if (step.filled.some(([r, c]) => r === row && c === col)) {
    return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
  }

  // 未计算
  return 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600'
}

function getCellValue(row: number, col: number): string {
  const step = currentStepData.value
  if (!step) return '—'
  const val = step.grid[row]?.[col]
  if (val === undefined || val === -1) return '—'
  return String(val)
}

watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.algorithm, () => {
  steps.value = meta.value.generate()
  currentStep.value = 0
})
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- 可视化 + 代码 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- DP 表格 -->
      <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-gray-600 dark:text-slate-400">DP 表格</span>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700"></span>已计算</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-300 dark:bg-amber-600"></span>当前</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-purple-200 dark:bg-purple-800 border border-purple-400"></span>路径</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600"></span>未计算</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="border-collapse text-xs sm:text-sm font-mono">
            <!-- 列标签 -->
            <thead v-if="currentStepData?.colLabels">
              <tr>
                <th class="p-1 sm:p-1.5 min-w-[2.5rem]"></th>
                <th v-for="(label, ci) in currentStepData.colLabels" :key="ci"
                  class="p-1 sm:p-1.5 text-center text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 font-medium min-w-[2rem] sm:min-w-[2.5rem]">
                  {{ label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in currentStepData?.grid" :key="ri">
                <!-- 行标签 -->
                <td v-if="currentStepData?.rowLabels" class="p-1 sm:p-1.5 text-right text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap pr-2">
                  {{ currentStepData.rowLabels[ri] || '' }}
                </td>
                <td v-for="(val, ci) in row" :key="ci"
                  :class="['p-1 sm:p-1.5 text-center border border-gray-200 dark:border-slate-700 transition-all duration-300 min-w-[2rem] sm:min-w-[2.5rem]', getCellClasses(ri, ci)]">
                  {{ getCellValue(ri, ci) }}
                </td>
              </tr>
            </tbody>
          </table>
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

    <!-- 进度 + 公式 + 步骤说明 -->
    <div>
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
        <span>步骤 <strong class="text-gray-700 dark:text-slate-200">{{ currentStep + 1 }}</strong> / {{ totalSteps }}</span>
        <span class="font-mono">{{ progress }}%</span>
      </div>
      <div class="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div class="h-full rounded-full bg-accent transition-all duration-300" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- 状态转移公式 -->
      <div v-if="currentStepData?.formula" class="mt-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-sm font-mono text-purple-700 dark:text-purple-300">
        <span class="text-xs text-purple-500 dark:text-purple-400 mr-2">公式：</span>
        {{ currentStepData.formula }}
      </div>

      <!-- 结果 -->
      <div v-if="currentStepData?.result" class="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-sm font-mono text-green-700 dark:text-green-300 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        {{ currentStepData.result }}
      </div>

      <!-- 步骤说明 -->
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
