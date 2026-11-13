<script setup lang="ts">
// ============================================================
// RaftVisualizer —— Raft 共识算法动画可视化
// 布局：五列节点卡（角色 / term / 日志）→ 在途消息通道 → note
// 日志格按 index 对齐：committed 绿勾、冲突截断红划线
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { raftDefinition } from './raftDefinition'
import type { RaftState, RaftStep, RaftNodeState, RaftMessage, RaftRole } from './raftDefinition'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const ds = raftDefinition
const steps = computed<RaftStep[]>(() => ds.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<RaftStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)

const emptyState: RaftState = {
  nodes: [],
  messages: [],
  clientRequest: null,
  phase: 'election',
  note: null,
  cutting: null,
}
const state = computed<RaftState>(() => currentStepData.value?.state ?? emptyState)
const highlight = computed<string[]>(() => currentStepData.value?.highlight ?? [])

const phaseLabel: Record<RaftState['phase'], string> = {
  election: '选举',
  replication: '日志复制',
  failover: '故障与重选',
  converged: '收敛',
}
const phaseClass: Record<RaftState['phase'], string> = {
  election: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  replication: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  failover: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  converged: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
}

const roleLabel: Record<RaftRole, string> = {
  leader: 'Leader',
  candidate: 'Candidate',
  follower: 'Follower',
  offline: 'Offline',
}
const roleBadge = (role: RaftRole) => {
  switch (role) {
    case 'leader':
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
    case 'candidate':
      return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
    case 'offline':
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
    default:
      return 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600'
  }
}

const nodeClass = (node: RaftNodeState) => {
  const base = 'rounded-lg border p-2.5 transition-all'
  if (node.role === 'offline') {
    return `${base} border-dashed border-red-300 dark:border-red-500/60 bg-red-50/40 dark:bg-red-900/10 opacity-60 grayscale`
  }
  const card =
    node.role === 'leader'
      ? 'border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
      : node.role === 'candidate'
        ? 'border-sky-300 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-900/10'
        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40'
  const hl = highlight.value.includes(node.id) ? ' ring-2 ring-accent/60' : ''
  return `${base} ${card}${hl}`
}

const LOG_SLOTS = 2 // 全程最多两条日志：index 对齐展示
const isCommitted = (node: RaftNodeState, index: number) =>
  !!node.log[index - 1] && index <= node.commitIndex
const isCutting = (node: RaftNodeState, index: number) =>
  state.value.cutting?.nodeId === node.id && state.value.cutting?.index === index

const slotClass = (node: RaftNodeState, index: number) => {
  const entry = node.log[index - 1]
  if (!entry) return 'border-dashed border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600'
  if (isCutting(node, index)) {
    return 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 line-through'
  }
  if (isCommitted(node, index)) {
    return 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
  }
  return 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
}

const kvText = (node: RaftNodeState) => {
  const entries = Object.entries(node.kv)
  return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join(' ') : '—'
}

const msgLabel: Record<RaftMessage['type'], string> = {
  requestVote: 'RequestVote',
  granted: 'Granted',
  denied: 'Denied',
  appendEntries: 'AppendEntries',
  ack: 'Ack',
  heartbeat: 'Heartbeat',
}
const msgClass = (m: RaftMessage) => {
  switch (m.type) {
    case 'requestVote':
      return 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'
    case 'granted':
    case 'ack':
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
    case 'denied':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
    case 'appendEntries':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'
  }
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
        <span :class="['ml-auto text-xs px-2.5 py-1 rounded-full border', phaseClass[state.phase]]">
          {{ phaseLabel[state.phase] }}
        </span>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400">
        <strong class="text-gray-900 dark:text-slate-200">场景：</strong>{{ ds.scenario }}
      </div>
      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-amber-400"></span>
          Leader
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-sky-400"></span>
          Candidate
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-gray-300 dark:border-slate-600"></span>
          Follower
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-red-300"></span>
          Offline
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-emerald-400"></span>
          已提交日志
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-gray-200"></span>
          空槽
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
      <!-- 左侧：可视化 + 控制台 -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <!-- 客户端请求与多数派提示 -->
          <div class="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300"
            >
              多数派 = 3 / 5
            </span>
            <span
              v-if="state.clientRequest"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono"
            >
              客户端 → {{ state.clientRequest }}
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500"
            >
              无客户端请求
            </span>
          </div>

          <!-- 五个节点 -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div v-for="node in state.nodes" :key="node.id" :class="nodeClass(node)">
              <div class="flex items-center justify-between gap-1">
                <span class="text-lg font-mono font-bold text-gray-800 dark:text-slate-100">{{ node.id }}</span>
                <span :class="['text-[9px] px-1.5 py-0.5 rounded-full border font-medium', roleBadge(node.role)]">
                  {{ roleLabel[node.role] }}
                </span>
              </div>
              <div class="mt-1 space-y-0.5 text-[10px] font-mono text-gray-500 dark:text-slate-400">
                <div>term {{ node.term }}</div>
                <div>vote {{ node.votedFor ?? '—' }}</div>
                <div>
                  {{ node.timeoutMs }}ms<span v-if="node.role === 'candidate'"> · {{ node.votes }}票</span>
                </div>
              </div>
              <!-- 日志格：按 index 对齐 -->
              <div class="mt-1.5 space-y-1">
                <div
                  v-for="slot in LOG_SLOTS"
                  :key="slot"
                  :class="[
                    'h-10 rounded border px-1 py-0.5 text-[10px] font-mono leading-tight transition-all',
                    slotClass(node, slot),
                  ]"
                >
                  <template v-if="node.log[slot - 1]">
                    <div class="flex items-center justify-between">
                      <span class="font-bold">#{{ slot }}</span>
                      <span class="flex items-center gap-0.5">
                        <span>t{{ node.log[slot - 1].term }}</span>
                        <span v-if="isCommitted(node, slot) && !isCutting(node, slot)">✓</span>
                      </span>
                    </div>
                    <div class="truncate">{{ node.log[slot - 1].command }}</div>
                  </template>
                  <div v-else class="flex h-full items-center justify-center">·</div>
                </div>
              </div>
              <div class="mt-1 truncate text-[9px] font-mono text-gray-400 dark:text-slate-500">
                kv {{ kvText(node) }}
              </div>
            </div>
          </div>

          <!-- 在途消息通道 -->
          <div class="rounded-lg bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-500 dark:text-slate-500">在途消息</span>
              <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">{{ state.messages.length }} 条</span>
            </div>
            <div v-if="state.messages.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="m in state.messages"
                :key="m.id"
                :class="['inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-mono', msgClass(m)]"
              >
                {{ msgLabel[m.type] }} {{ m.from }}→{{ m.to }} · term={{ m.term
                }}<span v-if="m.detail" class="opacity-70">· {{ m.detail }}</span>
              </span>
            </div>
            <div v-else class="text-[11px] font-mono text-gray-300 dark:text-slate-600 py-1">
              当前无在途消息
            </div>
          </div>

          <!-- note 提示 -->
          <div
            v-if="state.note"
            class="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 text-[12px] leading-relaxed text-amber-800 dark:text-amber-300"
          >
            {{ state.note }}
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
