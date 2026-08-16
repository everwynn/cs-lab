<script setup lang="ts">
// ============================================================
// DataStructureVisualizer —— 数据结构动画可视化组件
// 根据 layout 类型渲染栈/队列/链表/哈希表/BST
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import type { DSDefinition, DSState, DSStep } from './dataStructureDefinitions'
import { allDataStructures } from './dataStructureDefinitions'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const props = defineProps<{
  dataStructureId: string
}>()

const ds = computed<DSDefinition>(() => allDataStructures.find(d => d.id === props.dataStructureId) ?? allDataStructures[0])

const steps = computed(() => ds.value.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<DSStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)
const currentState = computed<DSState>(() => currentStepData.value?.state ?? {})

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

// 是否高亮某节点
function isActive(id: string): boolean {
  return currentStepData.value?.highlight?.includes(id) ?? false
}

const categoryLabel: Record<string, string> = {
  linear: '线性',
  linked: '链式',
  hash: '哈希',
  tree: '树形',
}

const categoryColor: Record<string, string> = {
  linear: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  linked: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  hash: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  tree: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
}

// ===== 响应式缩放与 viewBox =====
const SCALE = 1.25
const VIEW_W = 900

function originalRequiredHeight(): number {
  const state = currentState.value
  const layout = ds.value.layout
  switch (layout) {
    case 'stack':
    case 'queue':
      return 230
    case 'linked-list':
      return 290
    case 'hash-map': {
      const n = Math.max(1, (state.buckets || []).length)
      return Math.max(94 + (n - 1) * 60, 320) + 60
    }
    case 'array-list':
      return 220
    case 'bst':
    case 'heap':
    case 'trie':
    case 'union-find': {
      const nodes = state.treeNodes || []
      const maxNodeY = nodes.length ? Math.max(...nodes.map(n => n.y)) : 170
      return Math.max(maxNodeY + 40, 320) + 60
    }
    default:
      return 400
  }
}

const viewBoxH = computed(() => Math.ceil(originalRequiredHeight() * SCALE))
const viewBoxStr = computed(() => `0 0 ${VIEW_W} ${viewBoxH.value}`)
const scaleTransform = computed(() => `scale(${SCALE})`)
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
        <span :class="['ml-auto text-xs px-2.5 py-1 rounded-full border', categoryColor[ds.category]]">
          {{ categoryLabel[ds.category] }}
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="relative bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden min-h-[260px] sm:min-h-[320px] max-h-[460px] sm:max-h-[520px] text-left sm:text-center">
          <svg :viewBox="viewBoxStr" class="w-full h-auto min-w-[640px] max-w-[900px] inline-block" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="ds-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" class="text-gray-400 dark:text-slate-500" />
              </marker>
              <marker id="ds-arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" class="text-accent dark:text-accent-light" />
              </marker>
            </defs>

            <g :transform="scaleTransform">

            <!-- ===== 栈 / 队列：水平方块序列 ===== -->
            <g v-if="ds.layout === 'stack' || ds.layout === 'queue'">
              <!-- 左右端标签 -->
              <text x="60" y="105" text-anchor="start" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ ds.layout === 'stack' ? '栈底 →' : '队头(出) →' }}
              </text>
              <text x="660" y="105" text-anchor="end" class="text-sm fill-accent-dark dark:fill-accent font-mono">
                {{ ds.layout === 'stack' ? '← 栈顶' : '← 队尾(入)' }}
              </text>

              <g v-if="(currentState.elements || []).length === 0">
                <rect x="80" y="70" width="560" height="60" rx="6"
                  fill="none" stroke="currentColor" stroke-dasharray="6,5"
                  class="text-gray-300 dark:text-slate-700" />
                <text x="360" y="105" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空</text>
              </g>

              <g v-else>
                <g v-for="(el, idx) in (currentState.elements || [])" :key="el.id">
                  <rect
                    :x="360 - ((currentState.elements!.length - 1) * 70) / 2 + idx * 70 - 30"
                    :y="ds.layout === 'stack' ? 70 + (currentState.elements!.length - 1 - idx) * 0 : 70"
                    width="60" height="60" rx="6"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(el.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text
                    :x="360 - ((currentState.elements!.length - 1) * 70) / 2 + idx * 70"
                    :y="ds.layout === 'stack' ? 70 + 36 : 106"
                    text-anchor="middle"
                    class="text-base fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ el.value }}
                  </text>
                </g>

                <!-- 栈顶/队尾指示已由右侧标签标出 -->
              </g>

              <!-- 信息条 -->
              <text x="360" y="180" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== 链表 ===== -->
            <g v-else-if="ds.layout === 'linked-list'">
              <text x="40" y="100" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">head</text>

              <g v-if="!(currentState.elements || []).length">
                <rect x="40" y="130" width="560" height="60" rx="6"
                  fill="none" stroke="currentColor" stroke-dasharray="6,5"
                  class="text-gray-300 dark:text-slate-700" />
                <text x="360" y="165" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空链表 (head = null)</text>
              </g>

              <g v-else>
                <!-- null 节点 -->
                <text :x="360 + ((currentState.elements!.length - 1) * 100) / 2 + 80" y="170"
                  text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">null</text>

                <!-- 边 -->
                <g v-for="(el, idx) in (currentState.elements || [])" :key="'edge-' + el.id">
                  <line v-if="idx < (currentState.elements!.length - 1)"
                    :x1="360 - ((currentState.elements!.length - 1) * 100) / 2 + idx * 100 + 32"
                    :y1="160"
                    :x2="360 - ((currentState.elements!.length - 1) * 100) / 2 + (idx + 1) * 100 - 32"
                    :y2="160"
                    :stroke="isActive(el.id) || isActive((currentState.elements![idx + 1].id)) ? 'currentColor' : 'currentColor'"
                    stroke-width="2" stroke-dasharray="4,3"
                    :class="isActive(el.id) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'"
                    marker-end="url(#ds-arrow)" />
                </g>

                <!-- 最后一个节点到 null 的箭头 -->
                <line
                  :x1="360 + ((currentState.elements!.length - 1) * 100) / 2 + 32"
                  :y1="160"
                  :x2="360 + ((currentState.elements!.length - 1) * 100) / 2 + 80"
                  :y2="160"
                  stroke="currentColor" stroke-width="2" stroke-dasharray="4,3"
                  class="text-gray-300 dark:text-slate-600"
                  marker-end="url(#ds-arrow)" />

                <!-- 节点 -->
                <g v-for="(el, idx) in (currentState.elements || [])" :key="el.id">
                  <rect
                    :x="360 - ((currentState.elements!.length - 1) * 100) / 2 + idx * 100 - 32"
                    y="130" width="64" height="60" rx="8"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(el.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text
                    :x="360 - ((currentState.elements!.length - 1) * 100) / 2 + idx * 100"
                    y="166" text-anchor="middle"
                    class="text-base fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ el.value }}
                  </text>
                </g>
              </g>

              <text x="360" y="240" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== 哈希表 ===== -->
            <g v-else-if="ds.layout === 'hash-map'">
              <text x="360" y="24" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                哈希表 (拉链法) · 桶数 = {{ currentState.tableSize }}
              </text>

              <g v-for="(bucket, bIdx) in (currentState.buckets || [])" :key="bIdx">
                <!-- 桶头 -->
                <rect :x="60" :y="50 + bIdx * 60" width="70" height="44" rx="6"
                  :class="[
                    'stroke-2',
                    (currentState.buckets || [])[bIdx].items.some(it => isActive(it.id))
                      ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                      : 'fill-slate-100 dark:fill-slate-800 stroke-gray-300 dark:stroke-slate-600',
                  ]" />
                <text :x="95" :y="76" text-anchor="middle"
                  class="text-sm fill-gray-600 dark:fill-slate-300 font-mono font-bold">
                  [{{ bIdx }}]
                </text>

                <g v-if="bucket.items.length === 0">
                  <text :x="160" :y="76" class="text-sm fill-gray-300 dark:fill-slate-600 font-mono">→ null</text>
                </g>

                <g v-else>
                  <!-- 链表边 -->
                  <g v-for="(item, iIdx) in bucket.items" :key="'be-' + item.id">
                    <line v-if="iIdx === 0"
                      :x1="130" :y1="72 + bIdx * 60"
                      :x2="200" :y2="72 + bIdx * 60"
                      stroke="currentColor" stroke-width="2" stroke-dasharray="4,3"
                      :class="isActive(item.id) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'"
                      marker-end="url(#ds-arrow)" />
                    <line v-else
                      :x1="200 + (iIdx - 1) * 140 + 90" :y1="72 + bIdx * 60"
                      :x2="200 + iIdx * 140" :y2="72 + bIdx * 60"
                      stroke="currentColor" stroke-width="2" stroke-dasharray="4,3"
                      :class="isActive(item.id) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'"
                      marker-end="url(#ds-arrow)" />
                  </g>
                  <!-- 末尾到 null -->
                  <line
                    :x1="200 + (bucket.items.length - 1) * 140 + 90" :y1="72 + bIdx * 60"
                    :x2="200 + bucket.items.length * 140 + 10" :y2="72 + bIdx * 60"
                    stroke="currentColor" stroke-width="2" stroke-dasharray="4,3"
                    class="text-gray-300 dark:text-slate-600"
                    marker-end="url(#ds-arrow)" />
                  <text :x="200 + bucket.items.length * 140 + 20" :y="76"
                    class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">null</text>

                  <!-- 链节点 -->
                  <g v-for="(item, iIdx) in bucket.items" :key="item.id">
                    <rect :x="200 + iIdx * 140" :y="50 + bIdx * 60" width="90" height="44" rx="6"
                      :class="[
                        'stroke-2 transition-all duration-300',
                        isActive(item.id)
                          ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                          : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                      ]" />
                    <text :x="245 + iIdx * 140" :y="76" text-anchor="middle"
                      class="text-xs fill-gray-800 dark:fill-slate-100 font-mono font-medium pointer-events-none">
                      {{ item.value }}
                    </text>
                  </g>
                </g>
              </g>

              <text x="360" y="320" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== BST ===== -->
            <g v-else-if="ds.layout === 'bst'">
              <text x="360" y="16" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">二叉搜索树 (root)</text>

              <g v-if="!(currentState.treeNodes || []).length">
                <text x="360" y="170" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空树 (root = null)</text>
              </g>

              <g v-else>
                <!-- 边 -->
                <g v-for="edge in (currentState.treeEdges || [])" :key="'te-' + edge.from + '-' + edge.to">
                  <line
                    :x1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.x"
                    :y1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.y"
                    :x2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.x"
                    :y2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.y"
                    stroke="currentColor" stroke-width="2"
                    :class="(isActive(edge.from) || isActive(edge.to)) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'" />
                </g>

                <!-- 节点 -->
                <g v-for="node in (currentState.treeNodes || [])" :key="node.id">
                  <circle :cx="node.x" :cy="node.y" r="20"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(node.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text :x="node.x" :y="node.y + 4" text-anchor="middle"
                    class="text-sm fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ node.value }}
                  </text>
                </g>
              </g>

              <text x="360" y="320" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentStepData?.message || '' }}
              </text>
            </g>

            <!-- ===== 堆 Heap（复用树形渲染） ===== -->
            <g v-else-if="ds.layout === 'heap'">
              <text x="360" y="16" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">最大堆 (根 = 最大值)</text>

              <g v-if="!(currentState.treeNodes || []).length">
                <text x="360" y="170" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空堆</text>
              </g>

              <g v-else>
                <g v-for="edge in (currentState.treeEdges || [])" :key="'he-' + edge.from + '-' + edge.to">
                  <line
                    :x1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.x"
                    :y1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.y"
                    :x2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.x"
                    :y2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.y"
                    stroke="currentColor" stroke-width="2"
                    :class="(isActive(edge.from) || isActive(edge.to)) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'" />
                </g>
                <g v-for="node in (currentState.treeNodes || [])" :key="node.id">
                  <circle :cx="node.x" :cy="node.y" r="20"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(node.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text :x="node.x" :y="node.y + 4" text-anchor="middle"
                    class="text-sm fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ node.value }}
                  </text>
                </g>
              </g>
              <text x="360" y="320" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== 字典树 Trie ===== -->
            <g v-else-if="ds.layout === 'trie'">
              <text x="360" y="16" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">字典树 (前缀共享)</text>

              <g v-if="!(currentState.treeNodes || []).length">
                <text x="360" y="170" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空 Trie (root)</text>
              </g>

              <g v-else>
                <g v-for="edge in (currentState.treeEdges || [])" :key="'te2-' + edge.from + '-' + edge.to">
                  <line
                    :x1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.x"
                    :y1="(currentState.treeNodes || []).find(n => n.id === edge.from)?.y"
                    :x2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.x"
                    :y2="(currentState.treeNodes || []).find(n => n.id === edge.to)?.y"
                    stroke="currentColor" stroke-width="2"
                    :class="(isActive(edge.from) || isActive(edge.to)) ? 'text-accent dark:text-accent-light' : 'text-gray-300 dark:text-slate-600'" />
                </g>
                <g v-for="node in (currentState.treeNodes || [])" :key="node.id">
                  <!-- 单词结束节点：双层圆环 + 琥珀填充 -->
                  <circle v-if="node.end" :cx="node.x" :cy="node.y" r="22"
                    :class="['stroke-2 transition-all duration-300',
                      isActive(node.id)
                        ? 'fill-amber-100 dark:fill-amber-900/40 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-amber-50 dark:fill-amber-900/20 stroke-amber-400 dark:stroke-amber-600']" />
                  <circle :cx="node.x" :cy="node.y" r="18"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(node.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : node.end
                          ? 'fill-amber-50 dark:fill-amber-900/20 stroke-amber-400 dark:stroke-amber-600'
                          : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text :x="node.x" :y="node.y + 4" text-anchor="middle"
                    class="text-sm fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ node.value }}
                  </text>
                </g>
              </g>
              <text x="360" y="320" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== 并查集 Union-Find ===== -->
            <g v-else-if="ds.layout === 'union-find'">
              <text x="360" y="16" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">并查集 (箭头 = parent 指针，根无箭头)</text>

              <g v-if="!(currentState.treeNodes || []).length">
                <text x="360" y="170" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空</text>
              </g>

              <g v-else>
                <!-- 父指针箭头（child → parent） -->
                <g v-for="edge in (currentState.treeEdges || [])" :key="'uf-' + edge.from + '-' + edge.to">
                  <line
                    :x1="((currentState.treeNodes || []).find(n => n.id === edge.from)?.x || 0)"
                    :y1="((currentState.treeNodes || []).find(n => n.id === edge.from)?.y || 0) - 20"
                    :x2="((currentState.treeNodes || []).find(n => n.id === edge.to)?.x || 0)"
                    :y2="((currentState.treeNodes || []).find(n => n.id === edge.to)?.y || 0) + 20"
                    stroke="currentColor" stroke-width="2" stroke-dasharray="5,3"
                    :class="(isActive(edge.from) || isActive(edge.to)) ? 'text-accent dark:text-accent-light' : 'text-gray-400 dark:text-slate-500'"
                    marker-end="url(#ds-arrow-active)" />
                </g>
                <g v-for="node in (currentState.treeNodes || [])" :key="node.id">
                  <!-- 根节点：实心琥珀；非根：白底 -->
                  <circle :cx="node.x" :cy="node.y" r="22"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive(node.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text :x="node.x" :y="node.y + 4" text-anchor="middle"
                    class="text-sm fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ node.value }}
                  </text>
                </g>
              </g>
              <text x="360" y="320" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentState.info ? Object.entries(currentState.info).map(([k, v]) => `${k} = ${v}`).join('  ·  ') : '' }}
              </text>
            </g>

            <!-- ===== 动态数组 ArrayList ===== -->
            <g v-else-if="ds.layout === 'array-list'">
              <text x="360" y="16" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                动态数组 · size = {{ currentState.info?.size || 0 }} / capacity = {{ currentState.capacity || 4 }}
              </text>

              <g v-if="!(currentState.elements || []).length && !(currentState.capacity)">
                <text x="360" y="170" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500">空数组</text>
              </g>

              <g v-else>
                <g v-for="idx in (currentState.capacity || 0)" :key="'al-cap-' + idx">
                  <!-- 已用槽位 -->
                  <rect v-if="idx - 1 < (currentState.elements || []).length"
                    :x="360 - ((currentState.capacity! - 1) * 70) / 2 + (idx - 1) * 70 - 30"
                    y="60" width="60" height="60" rx="6"
                    :class="[
                      'stroke-2 transition-all duration-300',
                      isActive((currentState.elements || [])[idx - 1]?.id)
                        ? 'fill-amber-50 dark:fill-amber-900/30 stroke-amber-500 dark:stroke-amber-400'
                        : 'fill-white dark:fill-slate-800 stroke-gray-200 dark:stroke-slate-600',
                    ]" />
                  <text v-if="idx - 1 < (currentState.elements || []).length"
                    :x="360 - ((currentState.capacity! - 1) * 70) / 2 + (idx - 1) * 70"
                    y="96" text-anchor="middle"
                    class="text-base fill-gray-800 dark:fill-slate-100 font-bold font-mono pointer-events-none">
                    {{ (currentState.elements || [])[idx - 1]?.value }}
                  </text>
                  <!-- 空槽位（虚线） -->
                  <rect v-else
                    :x="360 - ((currentState.capacity! - 1) * 70) / 2 + (idx - 1) * 70 - 30"
                    y="60" width="60" height="60" rx="6"
                    fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5,4"
                    class="text-gray-200 dark:text-slate-700" />
                </g>

                <!-- size 指针 -->
                <text :x="360 - ((currentState.capacity! - 1) * 70) / 2 + (currentState.elements || []).length * 70 - 30"
                  y="50" text-anchor="middle"
                  class="text-sm fill-accent-dark dark:fill-accent font-mono">↑ size</text>
              </g>

              <text x="360" y="180" text-anchor="middle" class="text-sm fill-gray-400 dark:fill-slate-500 font-mono">
                {{ currentStepData?.message || '' }}
              </text>
            </g>
            </g>
          </svg>
        </div>

        <!-- 步骤说明 -->
        <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 min-h-[5rem]">
          <div class="text-xs text-gray-500 dark:text-slate-500 mb-1.5">
            步骤 {{ currentStep + 1 }} / {{ totalSteps }} <span v-if="currentStepData?.message" class="ml-2 text-accent-dark dark:text-accent font-mono">{{ currentStepData.message }}</span>
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
