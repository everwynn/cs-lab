<script setup lang="ts">
// ============================================================
// DesignPatternVisualizer —— 设计模式动画可视化组件（优化版）
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import type { PatternDefinition, PatternObject, PatternStep, PatternMessage } from './patternDefinitions'
import { allPatterns } from './patternDefinitions'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const props = defineProps<{
  patternId: string
}>()

const pattern = computed(() => allPatterns.find(p => p.id === props.patternId) ?? allPatterns[0])

const steps = computed(() => pattern.value.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<PatternStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)

// SVG 画布配置：统一放大 1.25 倍，让节点、文字、箭头都更清晰
const SCALE = 1.25
const VIEW_W = 1040

// 根据当前模式所有对象计算内容边界，动态 viewBox 高度减少内部留白
const contentBounds = computed(() => {
  let maxX = 0
  let maxY = 0
  pattern.value.objects.forEach((obj: PatternObject) => {
    maxX = Math.max(maxX, (obj.x + obj.w) * SCALE)
    maxY = Math.max(maxY, (obj.y + obj.h) * SCALE)
  })
  return { maxX, maxY }
})

const viewBoxH = computed(() => Math.max(320, Math.ceil(contentBounds.value.maxY + 60)))
const viewBoxStr = computed(() => `0 0 ${VIEW_W} ${viewBoxH.value}`)

// 计算每个对象是在哪一步被创建的
const createdAtStep = computed(() => {
  const map = new Map<string, number>()
  steps.value.forEach((step, idx) => {
    step.createdObjects?.forEach(id => {
      if (!map.has(id)) map.set(id, idx)
    })
  })
  return map
})

// 当前可见的对象
const visibleObjects = computed(() => {
  return pattern.value.objects.filter((obj: PatternObject) => {
    const at = createdAtStep.value.get(obj.id)
    return at === undefined || at <= currentStep.value
  })
})

// 渲染用缩放后的对象
const renderObjects = computed<PatternObject[]>(() => {
  return visibleObjects.value.map((obj: PatternObject) => ({
    ...obj,
    x: obj.x * SCALE,
    y: obj.y * SCALE,
    w: obj.w * SCALE,
    h: obj.h * SCALE,
  }))
})

const objectMap = computed(() => new Map(renderObjects.value.map(o => [o.id, o])))

// 累积状态：每个对象显示最新的 state 值
const objectStates = computed(() => {
  const states: Record<string, string | undefined> = {}
  pattern.value.objects.forEach((obj: PatternObject) => {
    states[obj.id] = obj.subtitle
  })
  for (let i = 0; i <= currentStep.value; i++) {
    const s = steps.value[i].state
    if (s) {
      Object.entries(s).forEach(([key, value]) => {
        states[key] = value
      })
    }
  }
  return states
})

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
  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value++
  }
}

function stepBackward() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
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

function isActive(objId: string): boolean {
  return currentStepData.value?.activeObjects.includes(objId) ?? false
}

function formatLabel(label: string): string {
  return label
    .split('\n')
    .map(line => {
      if (line.startsWith('<<') && line.endsWith('>>')) {
        return `<span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 tracking-wider">${line}</span>`
      }
      return `<span>${line}</span>`
    })
    .join('<br>')
}

function labelBox(label: string) {
  // 按 14px 等宽字体估算，给足边距，防止长标签被挤成多行
  const chars = label.length
  const width = Math.min(260, Math.max(120, chars * 8 + 28))
  const lineChars = (width - 28) / 8
  const lines = Math.max(1, Math.ceil(chars / lineChars))
  const height = lines * 18 + 12
  return { width, height }
}

const currentMessageBox = computed(() => {
  if (!currentStepData.value?.message) return { width: 100, height: 24 }
  return labelBox(currentStepData.value.message.label)
})

// SVG 工具函数
function boxCenter(box: PatternObject) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

function boundaryPoint(targetX: number, targetY: number, box: PatternObject) {
  const center = boxCenter(box)
  const dx = targetX - center.x
  const dy = targetY - center.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx === 0 && absDy === 0) {
    return center
  }

  const scale = absDx * box.h > absDy * box.w
    ? (box.w / 2) / absDx
    : (box.h / 2) / absDy

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  }
}

function arrowPoints(message: PatternMessage) {
  const from = objectMap.value.get(message.from)
  const to = objectMap.value.get(message.to)
  if (!from || !to) return null

  const fromCenter = boxCenter(from)
  const toCenter = boxCenter(to)

  const start = boundaryPoint(toCenter.x, toCenter.y, from)
  const end = boundaryPoint(fromCenter.x, fromCenter.y, to)

  return { start, end }
}

const currentMessagePoints = computed(() => {
  if (!currentStepData.value?.message) return null
  return arrowPoints(currentStepData.value.message)
})

function midPoint(start: { x: number; y: number }, end: { x: number; y: number }) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}

const categoryLabel: Record<string, string> = {
  creational: '创建型',
  structural: '结构型',
  behavioral: '行为型',
}

const categoryColor: Record<string, string> = {
  creational: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  structural: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  behavioral: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
}
</script>

<template>
  <div class="space-y-6">
    <!-- 标题与场景 -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-3xl">{{ pattern.icon }}</span>
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{{ pattern.name }}</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ pattern.desc }}</p>
        </div>
        <span :class="['ml-auto text-xs px-2.5 py-1 rounded-full border', categoryColor[pattern.category]]">
          {{ categoryLabel[pattern.category] }}
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ pattern.scenario }}
      </div>
    </div>

    <!-- 全宽单列布局：可视化 + 代码 -->
    <div class="space-y-6">
      <!-- 左侧：可视化 -->
      <div class="relative bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden min-h-[260px] sm:min-h-[320px] max-h-[420px] sm:max-h-[480px] text-left sm:text-center">
        <svg :viewBox="viewBoxStr" class="w-full h-auto min-w-[640px] inline-block" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto">
              <polygon points="0 0, 12 4.5, 0 9" fill="currentColor" class="text-accent dark:text-accent-light" />
            </marker>
            <filter id="active-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- 消息箭头 -->
          <g v-if="currentMessagePoints">
            <path
              :d="`M ${currentMessagePoints.start.x} ${currentMessagePoints.start.y} L ${currentMessagePoints.end.x} ${currentMessagePoints.end.y}`"
              fill="none" stroke="currentColor" stroke-width="3.5" stroke-dasharray="8,5"
              class="text-accent dark:text-accent-light animate-pulse"
              marker-end="url(#arrowhead)" />

            <!-- 消息标签背景 -->
            <rect
              :x="midPoint(currentMessagePoints.start, currentMessagePoints.end).x - currentMessageBox.width / 2"
              :y="midPoint(currentMessagePoints.start, currentMessagePoints.end).y - currentMessageBox.height / 2"
              :width="currentMessageBox.width" :height="currentMessageBox.height" rx="6"
              class="fill-amber-50 dark:fill-slate-800 stroke-accent dark:stroke-accent-light" stroke-width="1.5" />
            <!-- 消息标签文字（使用 foreignObject 自动换行） -->
            <foreignObject
              :x="midPoint(currentMessagePoints.start, currentMessagePoints.end).x - currentMessageBox.width / 2"
              :y="midPoint(currentMessagePoints.start, currentMessagePoints.end).y - currentMessageBox.height / 2"
              :width="currentMessageBox.width" :height="currentMessageBox.height">
              <div class="w-full h-full flex items-center justify-center px-1.5">
                <span class="text-xs sm:text-sm font-mono font-bold text-accent-dark dark:text-accent leading-tight text-center break-words">
                  {{ currentStepData?.message?.label }}
                </span>
              </div>
            </foreignObject>
          </g>

          <!-- 对象节点 -->
          <g v-for="obj in renderObjects" :key="obj.id"
            :class="['transition-all duration-300', isActive(obj.id) ? 'opacity-100' : 'opacity-[0.88]']">
            <rect :x="obj.x" :y="obj.y" :width="obj.w" :height="obj.h" rx="10"
              :filter="isActive(obj.id) ? 'url(#active-glow)' : undefined"
              :stroke-dasharray="obj.type === 'interface' ? '7,5' : undefined"
              :class="[
                'stroke-[2.5] transition-all duration-300',
                isActive(obj.id)
                  ? 'fill-amber-50 dark:fill-amber-900/20 stroke-amber-500 dark:stroke-amber-400'
                  : 'fill-white dark:fill-slate-800 stroke-gray-300 dark:stroke-slate-600',
              ]" />
            <!-- 对象标签：使用 foreignObject 自动换行，避免文字溢出 -->
            <foreignObject :x="obj.x" :y="obj.y" :width="obj.w" :height="obj.h">
              <div class="w-full h-full flex flex-col items-center justify-center text-center px-2 overflow-hidden">
                <div class="text-sm sm:text-base font-bold leading-tight text-gray-800 dark:text-slate-200" v-html="formatLabel(obj.label)"></div>
                <div v-if="objectStates[obj.id]" class="text-xs sm:text-sm font-mono text-gray-500 dark:text-slate-400 mt-1">
                  {{ objectStates[obj.id] }}
                </div>
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>

      <!-- 步骤说明 -->
      <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 min-h-[5rem]">
        <div class="text-xs text-gray-500 dark:text-slate-500 mb-1.5">
          步骤 {{ currentStep + 1 }} / {{ totalSteps }}
        </div>
        <p class="text-sm sm:text-base text-gray-800 dark:text-slate-200 leading-relaxed">
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

      <!-- 代码面板：全宽展示，与动画上下呼应 -->
      <CodePanel :code="pattern.code" :current-line="currentStepData?.codeLine || 0" />
    </div>
  </div>
</template>
