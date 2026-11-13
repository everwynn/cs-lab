<script setup lang="ts">
// ============================================================
// MvccVisualizer —— 事务隔离与 MVCC 动画可视化
// HTML 布局：时间轴 + undo 版本链 + ReadView 面板 + SQL 结果
// 复用统一播放控制栏与代码面板
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { mvccDefinition } from './mvccDefinition'
import type { MvccState, MvccStep, MvccVersion, MvccTxnEvent } from './mvccDefinition'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const ds = mvccDefinition
const steps = computed<MvccStep[]>(() => ds.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<MvccStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)

const emptyState: MvccState = {
  versions: [],
  checkingVersionId: null,
  verdict: null,
  readView: null,
  events: [],
  activeTxn: null,
  sql: null,
  result: null,
  isolation: 'RR',
  phase: 'rr',
  note: null,
}
const state = computed<MvccState>(() => currentStepData.value?.state ?? emptyState)

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

const eventsOf = (trx: 'T1' | 'T2') => state.value.events.filter((item: MvccTxnEvent) => item.trx === trx)

const eventChipClass = (event: MvccTxnEvent) => {
  if (event.label === 'BEGIN') return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  if (event.label === 'UPDATE') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  if (event.label === 'SELECT') return 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
  return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
}

const versionClass = (version: MvccVersion) => {
  const isChecking = state.value.checkingVersionId === version.id
  if (isChecking && state.value.verdict === 'visible') {
    return 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-200 dark:ring-emerald-800'
  }
  if (isChecking && state.value.verdict === 'invisible') {
    return 'border-gray-400 dark:border-slate-500 bg-gray-100 dark:bg-slate-800/60 opacity-60'
  }
  if (isChecking) {
    return 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-200 dark:ring-amber-800'
  }
  if (version.isUndo) {
    return 'border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/40'
  }
  return 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/40'
}

const verdictLabel = computed(() => {
  if (state.value.verdict === 'visible') return '可见'
  if (state.value.verdict === 'invisible') return '不可见，跳过'
  return null
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
          数据库事务
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"></span>
          判定命中（可见）
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-gray-400 bg-gray-100 dark:bg-slate-800"></span>
          跳过（不可见）
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-amber-400"></span>
          正在判定
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-gray-300 dark:border-slate-600"></span>
          undo log 历史版本
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <!-- 时间轴 -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3 space-y-2">
            <div class="text-xs font-medium text-gray-500 dark:text-slate-500">事务时间轴</div>
            <div v-for="trx in ['T1', 'T2']" :key="trx" class="flex items-center gap-3">
              <span
                :class="[
                  'inline-flex items-center justify-center w-9 h-6 rounded text-xs font-mono font-bold border',
                  state.activeTxn === trx
                    ? 'bg-accent text-white border-accent'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700',
                ]">{{ trx }}</span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="event in eventsOf(trx as 'T1' | 'T2')"
                  :key="event.id"
                  :title="event.detail"
                  :class="['px-2 py-0.5 rounded text-[11px] font-mono border', eventChipClass(event)]">
                  {{ event.label }}
                </span>
                <span v-if="eventsOf(trx as 'T1' | 'T2').length === 0" class="text-[11px] text-gray-400 dark:text-slate-600">—</span>
              </div>
            </div>
          </div>

          <!-- 版本链 -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs font-medium text-gray-500 dark:text-slate-500">undo log 版本链（从新到旧）</div>
              <span v-if="verdictLabel" class="text-[11px] font-mono text-amber-600 dark:text-amber-400">{{ verdictLabel }}</span>
            </div>
            <div class="flex items-center gap-2 overflow-x-auto py-1">
              <template v-for="(version, index) in state.versions" :key="version.id">
                <div :class="['shrink-0 w-40 rounded-lg border p-3 transition-all', versionClass(version)]">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-mono font-bold text-gray-700 dark:text-slate-200">{{ version.id }}</span>
                    <span
                      v-if="version.isUndo"
                      class="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500">
                      undo
                    </span>
                  </div>
                  <div class="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white font-mono">{{ version.balance }}</div>
                  <div class="mt-1 text-[11px] font-mono text-gray-500 dark:text-slate-400">trx_id = {{ version.trxId }}</div>
                  <div class="mt-1">
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-0.5 rounded-full border',
                        version.committed
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                      ]">
                      {{ version.committed ? '已提交' : '未提交' }}
                    </span>
                  </div>
                </div>
                <div v-if="index < state.versions.length - 1" class="shrink-0 flex flex-col items-center px-1">
                  <span class="text-lg text-gray-400 dark:text-slate-500 leading-none">→</span>
                  <span class="text-[10px] font-mono text-gray-400 dark:text-slate-600">roll_ptr</span>
                </div>
              </template>
              <div v-if="state.versions.length === 0" class="text-sm text-gray-400 dark:text-slate-500 font-mono py-4">版本链为空</div>
            </div>
          </div>

          <!-- ReadView + SQL 结果 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-medium text-gray-500 dark:text-slate-500">ReadView</span>
                <span v-if="state.readView" class="text-[10px] text-gray-400 dark:text-slate-500">{{ state.readView.label }}</span>
              </div>
              <div v-if="state.readView" class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div class="col-span-2 rounded bg-gray-50 dark:bg-slate-800/60 px-2 py-1">
                  <span class="text-gray-400 dark:text-slate-500">m_ids = </span>
                  <span class="text-gray-800 dark:text-slate-200">[{{ state.readView.mIds.join(', ') }}]</span>
                </div>
                <div class="rounded bg-gray-50 dark:bg-slate-800/60 px-2 py-1">
                  <span class="text-gray-400 dark:text-slate-500">min = </span>
                  <span class="text-gray-800 dark:text-slate-200">{{ state.readView.minTrxId }}</span>
                </div>
                <div class="rounded bg-gray-50 dark:bg-slate-800/60 px-2 py-1">
                  <span class="text-gray-400 dark:text-slate-500">max = </span>
                  <span class="text-gray-800 dark:text-slate-200">{{ state.readView.maxTrxId }}</span>
                </div>
                <div class="col-span-2 rounded bg-gray-50 dark:bg-slate-800/60 px-2 py-1">
                  <span class="text-gray-400 dark:text-slate-500">creator = </span>
                  <span class="text-gray-800 dark:text-slate-200">{{ state.readView.creatorTrxId }}</span>
                </div>
              </div>
              <div v-else class="text-xs text-gray-400 dark:text-slate-500 font-mono py-2">尚未生成（第一次 SELECT 时才创建）</div>
              <div v-if="state.note" class="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{{ state.note }}</div>
            </div>

            <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
              <div class="text-xs font-medium text-gray-500 dark:text-slate-500 mb-2">
                SQL 与结果
                <span class="ml-2 text-[10px] font-mono">{{ state.isolation }}</span>
              </div>
              <div v-if="state.sql" class="text-[12px] font-mono text-gray-800 dark:text-slate-200 break-all leading-relaxed">{{ state.sql }}</div>
              <div v-else class="text-xs text-gray-400 dark:text-slate-500 font-mono">—</div>
              <div v-if="state.result !== null" class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-mono">
                → {{ state.result }}
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤说明 -->
        <div class="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 min-h-[5rem]">
          <div class="text-xs text-gray-500 dark:text-slate-500 mb-1.5">
            步骤 {{ currentStep + 1 }} / {{ totalSteps }}
            <span class="ml-2 font-mono">{{ state.isolation }}</span>
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
