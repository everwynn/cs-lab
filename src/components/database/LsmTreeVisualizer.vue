<script setup lang="ts">
// ============================================================
// LsmTreeVisualizer —— LSM-Tree + 布隆过滤器动画可视化
// 布局：MemTable 容量格 → L0 多张 SSTable → compaction → L1
// 读路径：布隆位数组逐表判定（跳过 / 读表）
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { lsmTreeDefinition } from './lsmTreeDefinition'
import type { LsmState, LsmStep, LsmTable } from './lsmTreeDefinition'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const ds = lsmTreeDefinition
const steps = computed<LsmStep[]>(() => ds.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<LsmStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)

const emptyState: LsmState = {
  memTable: [],
  memCapacity: 4,
  tables: [],
  readingTableId: null,
  bloomCheck: null,
  foundValue: null,
  compaction: null,
  writeOps: 0,
  readOps: 0,
}
const state = computed<LsmState>(() => currentStepData.value?.state ?? emptyState)

const l0Tables = computed(() => state.value.tables.filter((table) => table.level === 'L0'))
const l1Tables = computed(() => state.value.tables.filter((table) => table.level === 'L1'))

const tableClass = (table: LsmTable) => {
  if (state.value.compaction?.sources.includes(table.id)) {
    return 'border-amber-400 dark:border-amber-500 bg-amber-50/60 dark:bg-amber-900/10 ring-2 ring-amber-200 dark:ring-amber-800'
  }
  if (state.value.readingTableId === table.id) {
    return 'border-sky-400 dark:border-sky-500 bg-sky-50/60 dark:bg-sky-900/10 ring-2 ring-sky-200 dark:ring-sky-800'
  }
  if (state.value.bloomCheck?.tableId === table.id) {
    return state.value.bloomCheck.hit
      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/10 ring-2 ring-emerald-200 dark:ring-emerald-800'
      : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/40 opacity-70'
  }
  return 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40'
}

const bitClass = (bit: number, index: number) => {
  const check = state.value.bloomCheck
  const isQuery = check ? check.query.includes(index) : false
  if (isQuery && bit === 1) {
    return 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300'
  }
  if (isQuery && bit === 0) {
    return 'border-dashed border-red-300 dark:border-red-500/70 text-red-400 dark:text-red-400'
  }
  if (bit === 1) {
    return 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
  }
  return 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
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
          存储引擎
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-sky-400"></span>
          MemTable / 正在读
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-amber-400"></span>
          compact 来源 / 查询位
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-emerald-400"></span>
          布隆判定「可能存在」
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-red-300"></span>
          查询位为 0 → 整表跳过
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <!-- 计数器 -->
          <div class="flex flex-wrap items-center gap-2 text-[11px]">
            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300">
              写 <strong class="font-mono text-accent-dark dark:text-accent">{{ state.writeOps }}</strong> 次
            </span>
            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300">
              读 <strong class="font-mono text-accent-dark dark:text-accent">{{ state.readOps }}</strong> 次
            </span>
            <span v-if="state.foundValue !== null" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono">
              get → {{ state.foundValue }}
            </span>
            <span v-if="state.compaction" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono">
              compaction：{{ state.compaction.sources.join(' + ') }} → {{ state.compaction.target }}
            </span>
          </div>

          <!-- MemTable -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-500 dark:text-slate-500">MemTable（内存有序表）</span>
              <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">{{ state.memTable.length }} / {{ state.memCapacity }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <div v-for="slot in state.memCapacity" :key="`slot-${slot}`"
                :class="[
                  'w-16 h-12 rounded-md border text-[11px] font-mono flex flex-col items-center justify-center transition-all',
                  state.memTable[slot - 1]
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                    : 'border-dashed border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600',
                ]">
                <template v-if="state.memTable[slot - 1]">
                  <span class="font-bold">{{ state.memTable[slot - 1].key }}</span>
                  <span>{{ state.memTable[slot - 1].value }}</span>
                </template>
                <span v-else>·</span>
              </div>
            </div>
          </div>

          <!-- L0 SSTable -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-2">L0（新表在上，读路径逐张检查）</div>
            <div class="flex flex-wrap gap-2">
              <div v-for="table in l0Tables" :key="table.id"
                :class="['w-36 rounded-md border p-2 transition-all', tableClass(table)]">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-mono font-bold text-gray-700 dark:text-slate-200">{{ table.id }}</span>
                  <span class="text-[9px] px-1 rounded border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500">L0</span>
                </div>
                <div class="grid grid-cols-2 gap-0.5 text-[10px] font-mono">
                  <span v-for="entry in table.entries" :key="entry.key"
                    class="px-1 py-0.5 rounded bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300">
                    {{ entry.key }}={{ entry.value }}
                  </span>
                </div>
              </div>
              <div v-if="l0Tables.length === 0" class="text-[11px] font-mono text-gray-300 dark:text-slate-600 py-2">
                L0 为空
              </div>
            </div>
          </div>

          <!-- compaction 指示 -->
          <div v-if="state.compaction" class="flex items-center justify-center gap-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">
            <span>{{ state.compaction.sources.join(' + ') }}</span>
            <span>↘ 多路归并 ↙</span>
            <span>{{ state.compaction.target }}</span>
          </div>

          <!-- L1 SSTable -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-2">L1（有序大表）</div>
            <div class="flex flex-wrap gap-2">
              <div v-for="table in l1Tables" :key="table.id"
                :class="['rounded-md border p-2 transition-all', tableClass(table)]">
                <div class="flex items-center justify-between gap-6 mb-1">
                  <span class="text-[11px] font-mono font-bold text-gray-700 dark:text-slate-200">{{ table.id }}</span>
                  <span class="text-[9px] px-1 rounded border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500">L1 · {{ table.entries.length }} 条</span>
                </div>
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-0.5 text-[10px] font-mono">
                  <span v-for="entry in table.entries" :key="entry.key"
                    class="px-1 py-0.5 rounded bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300">
                    {{ entry.key }}={{ entry.value }}
                  </span>
                </div>
              </div>
              <div v-if="l1Tables.length === 0" class="text-[11px] font-mono text-gray-300 dark:text-slate-600 py-2">
                L1 为空（compaction 之后才会出现）
              </div>
            </div>
          </div>

          <!-- 布隆过滤器位数组 -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-500 dark:text-slate-500">布隆过滤器（16 位）</span>
              <span v-if="state.bloomCheck" class="text-[10px] font-mono text-gray-400 dark:text-slate-500">{{ state.bloomCheck.tableId }}</span>
            </div>
            <div v-if="state.bloomCheck" class="space-y-2">
              <div class="flex flex-wrap gap-1">
                <span v-for="(bit, index) in state.bloomCheck.bits" :key="`bit-${index}`"
                  :class="['w-6 h-6 rounded border text-[10px] font-mono flex items-center justify-center', bitClass(bit, index)]">
                  {{ bit }}
                </span>
              </div>
              <div :class="[
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px]',
                state.bloomCheck.hit
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-50 dark:bg-slate-800/60 border-dashed border-red-300 dark:border-red-500/70 text-red-500 dark:text-red-400',
              ]">
                {{ state.bloomCheck.hit
                  ? `查询位 ${state.bloomCheck.query.join(', ')} 全为 1 → 可能存在，需要读表确认`
                  : `查询位 ${state.bloomCheck.query.join(', ')} 存在 0 → 一定不存在，整表跳过` }}
              </div>
            </div>
            <div v-else class="text-[11px] font-mono text-gray-400 dark:text-slate-500 py-2">
              读路径上每次只展示一张表的布隆判定
            </div>
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
