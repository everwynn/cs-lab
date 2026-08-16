<script setup lang="ts">
// ============================================================
// SearchVisualizer — 搜索算法动画演示组件
// 从 searchingAlgorithms.ts 导入步骤生成器和配置
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { searchAlgorithmMeta, type SearchStep } from './searchingAlgorithms'
import VisualizerControls from './VisualizerControls.vue'
import CodePanel from './CodePanel.vue'

// ===== Props =====
const props = withDefaults(defineProps<{
  algorithm?: string
  initialArray?: number[]
  target?: number
}>(), {
  algorithm: 'linear',
  initialArray: () => [4, 2, 8, 5, 1, 9, 3, 7],
  target: 5,
})

// ===== 响应式状态 =====
const meta = computed(() => searchAlgorithmMeta[props.algorithm] || searchAlgorithmMeta.linear)
const inputArrayStr = ref(props.initialArray.join(', '))
const inputTarget = ref(props.target)
const steps = ref<SearchStep[]>(meta.value.generate([...props.initialArray], props.target))
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

// ===== 计算属性 =====
const currentStepData = computed(() => steps.value[currentStep.value])
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

// ===== 统计 =====
const stats = computed(() => {
  const upto = currentStep.value + 1
  const slice = steps.value.slice(0, upto)
  const comparisons = slice.filter(s => s.current !== undefined).length
  return { comparisons }
})

function parseArray(): number[] {
  return inputArrayStr.value
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n))
}

function regenerateSteps() {
  let arr = parseArray()
  if (arr.length < 1) return
  if (meta.value.requiresSorted) {
    arr = [...arr].sort((a, b) => a - b)
    inputArrayStr.value = arr.join(', ')
  }
  pause()
  steps.value = meta.value.generate(arr, inputTarget.value)
  currentStep.value = 0
}

function randomArray() {
  const len = 8 + Math.floor(Math.random() * 5)
  const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 90) + 10)
  if (meta.value.requiresSorted) {
    arr.sort((a, b) => a - b)
  }
  inputArrayStr.value = arr.join(', ')
  inputTarget.value = arr[Math.floor(Math.random() * arr.length)]
  regenerateSteps()
}

// ===== 样式辅助 =====
function getBoxClasses(index: number): string {
  const step = currentStepData.value
  if (!step) return 'bg-blue-500 dark:bg-blue-600 text-white'
  if (step.found === index) return 'bg-green-500 dark:bg-green-600 text-white ring-4 ring-green-300 dark:ring-green-700'
  if (step.current === index) return 'bg-amber-400 dark:bg-amber-500 text-white'
  if (step.mid === index) return 'bg-amber-400 dark:bg-amber-500 text-white'
  if (meta.value.requiresSorted && step.low !== undefined && step.high !== undefined) {
    if (index < step.low || index > step.high) return 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
  }
  return 'bg-blue-500 dark:bg-blue-600 text-white'
}

function getMarker(index: number): string {
  const step = currentStepData.value
  if (!step) return ''
  const markers: string[] = []
  if (step.low === index) markers.push('L')
  if (step.mid === index) markers.push('M')
  if (step.high === index) markers.push('H')
  return markers.join('/')
}

// ===== 哈希表可视化辅助 =====
const isHashAlgorithm = computed(() => props.algorithm === 'hash')
const hashTable = computed(() => currentStepData.value?.hashTable || [])

function getBucketClasses(bucketIndex: number): string {
  const step = currentStepData.value
  if (!step) return 'border-gray-200 dark:border-slate-700'
  if (step.bucketIndex === bucketIndex) return 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
  return 'border-gray-200 dark:border-slate-700'
}

function getBucketItemClasses(bucketIndex: number, chainIndex: number): string {
  const step = currentStepData.value
  if (!step) return 'bg-blue-500 dark:bg-blue-600 text-white'
  const isCurrentBucket = step.bucketIndex === bucketIndex
  const isCurrentChain = step.chainIndex === chainIndex
  if (isCurrentBucket && isCurrentChain) {
    if (step.found === bucketIndex) return 'bg-green-500 dark:bg-green-600 text-white ring-4 ring-green-300 dark:ring-green-700'
    return 'bg-amber-400 dark:bg-amber-500 text-white'
  }
  return 'bg-blue-500 dark:bg-blue-600 text-white'
}

// ===== 生命周期 =====
watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.algorithm, () => regenerateSteps())
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- 数组 + 目标值输入 -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-[2]">
        <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
          数组（逗号分隔）
          <span v-if="meta.requiresSorted" class="ml-1 text-accent-dark dark:text-accent">*二分查找会自动排序</span>
        </label>
        <input v-model="inputArrayStr" @keyup.enter="regenerateSteps" type="text"
          placeholder="4, 2, 8, 5, 1, 9, 3, 7"
          class="w-full px-4 py-2.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50" />
      </div>
      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">目标值</label>
        <input v-model.number="inputTarget" @keyup.enter="regenerateSteps" type="number"
          class="w-full px-4 py-2.5 text-sm font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50" />
      </div>
      <div class="flex gap-2 items-end">
        <button @click="regenerateSteps"
          class="text-xs px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-all whitespace-nowrap">应用</button>
        <button @click="randomArray"
          class="text-xs px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 transition-all whitespace-nowrap">🎲 随机</button>
      </div>
    </div>

    <!-- 统计 -->
    <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
      <span class="text-xs font-medium text-gray-600 dark:text-slate-400">比较次数</span>
      <span class="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">{{ stats.comparisons }}</span>
    </div>

    <!-- 可视化 + 代码 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 数组 / 哈希表可视化 -->
      <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4">
        <template v-if="!isHashAlgorithm">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium text-gray-600 dark:text-slate-400">数组可视化</span>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500 dark:bg-blue-600"></span>未检查</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-400 dark:bg-amber-500"></span>当前/中点</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500 dark:bg-green-600"></span>命中</span>
              <span v-if="meta.requiresSorted" class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-gray-300 dark:bg-slate-700"></span>已排除</span>
            </div>
          </div>
          <div class="flex flex-wrap justify-center gap-2 sm:gap-3 min-h-[8rem] bg-gray-50 dark:bg-slate-900/30 rounded-lg p-3 sm:p-4">
            <div v-for="(value, index) in currentStepData?.array" :key="index" class="relative flex flex-col items-center w-9 sm:w-12">
              <div :class="['w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-md sm:rounded-lg text-xs sm:text-base font-mono font-bold transition-all duration-300', getBoxClasses(index)]">
                {{ value }}
              </div>
              <span class="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{{ index }}</span>
              <span v-if="getMarker(index)" class="absolute -bottom-3 sm:-bottom-4 text-[10px] font-bold text-accent-dark dark:text-accent">
                {{ getMarker(index) }}
              </span>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium text-gray-600 dark:text-slate-400">哈希表可视化（拉链法）</span>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500 dark:bg-blue-600"></span>已存入</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-400 dark:bg-amber-500"></span>当前/比较</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500 dark:bg-green-600"></span>命中</span>
            </div>
          </div>
          <div class="space-y-4 min-h-[8rem] bg-gray-50 dark:bg-slate-900/30 rounded-lg p-4">
            <!-- 原始关键字 -->
            <div>
              <div class="text-xs text-gray-500 dark:text-slate-500 mb-2">原始关键字</div>
              <div class="flex flex-wrap gap-1.5 sm:gap-2">
                <div v-for="(value, index) in currentStepData?.array" :key="'key-' + index"
                  :class="['w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md font-mono font-bold text-xs sm:text-sm transition-all duration-300', currentStepData?.current === index ? 'bg-amber-400 dark:bg-amber-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300']">
                  {{ value }}
                </div>
              </div>
            </div>
            <!-- 哈希表 -->
            <div>
              <div class="text-xs text-gray-500 dark:text-slate-500 mb-2">哈希表（桶）</div>
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                <div v-for="(bucket, bucketIndex) in hashTable" :key="'bucket-' + bucketIndex"
                  :class="['rounded-lg border-2 p-2 transition-all duration-300', getBucketClasses(bucketIndex)]">
                  <div class="text-[10px] font-mono font-bold text-center text-gray-400 dark:text-slate-500 mb-1">#{{ bucketIndex }}</div>
                  <div class="flex flex-col gap-1">
                    <div v-for="(value, chainIndex) in bucket" :key="'item-' + bucketIndex + '-' + chainIndex"
                      :class="['w-full h-8 flex items-center justify-center rounded font-mono font-bold text-xs transition-all duration-300', getBucketItemClasses(bucketIndex, chainIndex)]">
                      {{ value }}
                    </div>
                    <div v-if="bucket.length === 0" class="w-full h-8 flex items-center justify-center rounded text-xs text-gray-300 dark:text-slate-600">空</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
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
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1">数据要求</div>
        <div class="text-sm font-bold" :class="meta.requiresSorted ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'">{{ meta.requiresSorted ? '需有序' : '无需有序' }}</div>
      </div>
    </div>
  </div>
</template>
