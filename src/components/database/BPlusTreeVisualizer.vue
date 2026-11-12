<script setup lang="ts">
// ============================================================
// BPlusTreeVisualizer —— B+ 树索引动画可视化
// 复用统一播放控制栏与代码面板，SVG 由快照状态直接渲染
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { bPlusTreeDefinition } from './bPlusTreeDefinition'
import type { BPlusState, BPlusStep } from './bPlusTreeDefinition'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const ds = bPlusTreeDefinition
const steps = computed<BPlusStep[]>(() => ds.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<BPlusStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)
const emptyState: BPlusState = {
  nodes: [],
  edges: [],
  leafLinks: [],
  width: 240,
  height: 140,
  activeKey: null,
  pathNodes: [],
  pathEdges: [],
  scanningLeaves: [],
  floatingIds: [],
  result: null,
}
const state = computed<BPlusState>(() => currentStepData.value?.state ?? emptyState)

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

// 视图尺寸：给一个最小视口宽度，避免空树或小树被过度放大；树在视口内水平居中
const PAD = 16
const MIN_VIEW_W = 640
const MIN_VIEW_H = 220
const viewWidth = computed(() => Math.max(state.value.width + PAD * 2, MIN_VIEW_W))
const viewHeight = computed(() => Math.max(state.value.height, MIN_VIEW_H))
const viewBox = computed(() => `0 0 ${viewWidth.value} ${viewHeight.value}`)
const offsetX = computed(() => PAD + (viewWidth.value - PAD * 2 - state.value.width) / 2)

const isOnPath = (id: string) => state.value.pathNodes.includes(id)
const isScanning = (id: string) => state.value.scanningLeaves.includes(id)
const isFloating = (id: string) => state.value.floatingIds.includes(id)
const isActiveKey = (nodeId: string, keyIndex: number) =>
  state.value.activeKey?.nodeId === nodeId && state.value.activeKey?.keyIndex === keyIndex
const isOnPathEdge = (from: string, to: string) => state.value.pathEdges.includes(`${from}->${to}`)

// key 单元格的中心 x（与定义里的 PAD_X / KEY_W 保持一致）
const KEY_W = 40
const CELL_PAD = 8
const cellX = (nodeX: number, index: number) => nodeX - PAD + CELL_PAD + index * KEY_W + KEY_W / 2
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
          数据库索引
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-6 bg-gray-300 dark:bg-slate-600"></span>
          父子指针
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-0.5 w-6 border-t-2 border-dashed border-teal-400 dark:border-teal-500"></span>
          叶子 next 链表
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-emerald-500"></span>
          新节点
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm bg-amber-200 dark:bg-amber-700"></span>
          当前操作的键
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden min-h-[260px] sm:min-h-[320px]">
          <svg :viewBox="viewBox" class="w-full h-auto min-w-[680px]" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="bp-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 9 3, 0 6" fill="currentColor" class="text-teal-400 dark:text-teal-500" />
              </marker>
              <marker id="bp-arrow-active" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 9 3, 0 6" fill="currentColor" class="text-accent dark:text-accent-light" />
              </marker>
            </defs>

            <g :transform="`translate(${offsetX}, 0)`">
              <!-- 空树提示 -->
              <g v-if="state.nodes.length === 0">
                <text :x="state.width / 2" :y="70" text-anchor="middle"
                  class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">空 B+ 树（根 = 叶子）</text>
              </g>

              <!-- 叶子链表箭头（虚线） -->
              <g v-for="link in state.leafLinks" :key="'ll-' + link.from + '-' + link.to">
                <line :x1="link.x1" :y1="link.y1" :x2="link.x2" :y2="link.y2"
                  stroke="currentColor" stroke-width="1.8" stroke-dasharray="5,4"
                  class="text-teal-400 dark:text-teal-500"
                  marker-end="url(#bp-arrow)" />
                <text :x="(link.x1 + link.x2) / 2" :y="link.y1 - 7" text-anchor="middle"
                  class="text-[11px] fill-teal-500 dark:fill-teal-400 font-mono pointer-events-none">next</text>
              </g>

              <!-- 父子边 -->
              <line v-for="edge in state.edges" :key="'e-' + edge.from + '-' + edge.to"
                :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2"
                stroke="currentColor"
                :stroke-width="isOnPathEdge(edge.from, edge.to) ? 2.5 : 1.6"
                :class="isOnPathEdge(edge.from, edge.to)
                  ? 'text-accent dark:text-accent-light'
                  : 'text-gray-300 dark:text-slate-600'" />

              <!-- 节点 -->
              <g v-for="node in state.nodes" :key="node.id">
                <!-- 空节点：虚线框 -->
                <g v-if="node.keys.length === 0">
                  <rect :x="node.x - PAD" :y="node.y" :width="node.width" :height="node.height" rx="6"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6,5"
                    class="text-gray-300 dark:text-slate-600" />
                  <text :x="node.x - PAD + node.width / 2" :y="node.y + node.height / 2 + 5" text-anchor="middle"
                    class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">空</text>
                </g>

                <g v-else>
                  <!-- 节点主体 -->
                  <rect :x="node.x - PAD" :y="node.y" :width="node.width" :height="node.height" rx="6"
                    :stroke-width="isOnPath(node.id) || isScanning(node.id) || node.isNew || isFloating(node.id) ? 2.4 : 1.6"
                    :stroke-dasharray="node.isNew || isFloating(node.id) ? '6,4' : undefined"
                    :class="[
                      node.isNew || isFloating(node.id)
                        ? 'fill-emerald-50 dark:fill-emerald-900/20 stroke-emerald-500 dark:stroke-emerald-400'
                        : isScanning(node.id)
                          ? 'fill-accent/10 stroke-accent dark:stroke-accent-light'
                          : isOnPath(node.id)
                            ? 'fill-amber-50 dark:fill-amber-900/20 stroke-accent dark:stroke-accent-light'
                            : 'fill-white dark:fill-slate-800 stroke-gray-300 dark:stroke-slate-600',
                    ]" />

                  <!-- 键单元格：交替底色 + 分隔线 -->
                  <g v-for="(key, keyIndex) in node.keys" :key="node.id + '-k' + keyIndex">
                    <rect v-if="isActiveKey(node.id, keyIndex)"
                      :x="node.x - PAD + CELL_PAD + keyIndex * KEY_W" :y="node.y + 3"
                      :width="KEY_W" :height="node.height - 6" rx="3"
                      class="fill-amber-200 dark:fill-amber-600/60" />
                    <line v-if="keyIndex > 0"
                      :x1="node.x - PAD + CELL_PAD + keyIndex * KEY_W"
                      :y1="node.y + 7" :x2="node.x - PAD + CELL_PAD + keyIndex * KEY_W"
                      :y2="node.y + node.height - 7"
                      stroke="currentColor" stroke-width="1" class="text-gray-200 dark:text-slate-600" />
                    <text :x="cellX(node.x, keyIndex)" :y="node.y + node.height / 2 + 5" text-anchor="middle"
                      :class="[
                        'font-mono pointer-events-none',
                        isActiveKey(node.id, keyIndex)
                          ? 'text-[15px] font-bold fill-amber-800 dark:fill-amber-200'
                          : 'text-sm fill-gray-800 dark:fill-slate-100',
                      ]">
                      {{ key }}
                    </text>
                  </g>

                  <!-- 叶子标记 -->
                  <text :x="node.x - PAD + node.width / 2" :y="node.y + node.height + 14" text-anchor="middle"
                    class="text-[10px] fill-gray-400 dark:fill-slate-500 font-mono pointer-events-none">
                    {{ node.leaf ? 'leaf' : 'internal' }}
                  </text>
                </g>
              </g>

              <!-- 范围查询结果 -->
              <text v-if="state.result" :x="state.width / 2" :y="viewHeight - 18" text-anchor="middle"
                class="text-[13px] fill-accent-dark dark:fill-accent font-mono">
                范围结果：[ {{ state.result.join(', ') }} ]
              </text>
            </g>
          </svg>
        </div>

        <!-- 步骤说明 -->
        <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 min-h-[5rem]">
          <div class="text-xs text-gray-500 dark:text-slate-500 mb-1.5">
            步骤 {{ currentStep + 1 }} / {{ totalSteps }}
            <span v-if="currentStepData?.message" class="ml-2 text-accent-dark dark:text-accent font-mono">{{ currentStepData.message }}</span>
          </div>
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
