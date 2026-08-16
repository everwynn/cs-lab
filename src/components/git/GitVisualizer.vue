<script setup lang="ts">
// ============================================================
// GitVisualizer — Git 工作流可视化组件
// SVG 渲染 commit 节点图 + 分支线条 + 暂存区/工作区面板
// ============================================================
import { ref, computed, watch, onUnmounted } from 'vue'
import { allGitTopics, type GitStep, type GitCommit } from './gitDefinitions'
import VisualizerControls from '../algorithms/VisualizerControls.vue'
import CodePanel from '../algorithms/CodePanel.vue'

const props = defineProps<{
  topicId: string
}>()

const topic = computed(() => allGitTopics.find(t => t.id === props.topicId) ?? allGitTopics[0])

const steps = ref<GitStep[]>(topic.value.generateSteps())
const currentStep = ref(0)
const isPlaying = ref(false)
const speed = ref(1.5)
let timer: ReturnType<typeof setInterval> | null = null

const currentStepData = computed<GitStep | undefined>(() => steps.value[currentStep.value])
const totalSteps = computed(() => steps.value.length)
const progress = computed(() => totalSteps.value > 0 ? Math.round(((currentStep.value + 1) / totalSteps.value) * 100) : 0)
const intervalMs = computed(() => Math.max(200, Math.round(1200 / speed.value)))

// ── SVG 布局计算 ─────────────────────────────────────────────
// 增大尺寸、拉开间距，解决文字拥挤和节点重叠问题
const NODE_R = 26
const COL_W = 200
const ROW_H = 110
const PAD_X = 70
const PAD_Y = 55

function toPixel(commit: GitCommit): { px: number; py: number } {
  return {
    px: commit.x * COL_W + PAD_X,
    py: commit.y * ROW_H + PAD_Y,
  }
}

const svgWidth = computed(() => {
  const commits = currentStepData.value?.commits ?? []
  const maxX = commits.reduce((m, c) => Math.max(m, c.x), 0)
  const maxBranchLabelWidth = (currentStepData.value?.branches ?? [])
    .reduce((m, b) => Math.max(m, b.name.length * 8 + 18), 0)
  // 右侧预留分支标签 + 滚动余量
  return (maxX + 1) * COL_W + PAD_X * 2 + NODE_R + 24 + maxBranchLabelWidth
})

const svgHeight = computed(() => {
  const commits = currentStepData.value?.commits ?? []
  const maxY = commits.reduce((m, c) => Math.max(m, c.y), 0)
  return (maxY + 1) * ROW_H + PAD_Y * 2 + 30
})

// 将 commit label 按单词边界换行，避免截断英文单词
function wrapLabel(label: string, maxChars = 16): string[] {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    // 单个超长词（如文件路径）再按字符拆
    if (word.length > maxChars) {
      if (current) {
        lines.push(current)
        current = ''
      }
      let remaining = word
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars))
        remaining = remaining.slice(maxChars)
      }
      current = remaining
      continue
    }

    const next = current ? `${current} ${word}` : word
    const width = next.split('').reduce((sum, ch) => sum + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)
    if (width > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

// 哪些分支指向某个 commit
function branchesAtCommit(commitId: string): { name: string; color: string }[] {
  const branches = currentStepData.value?.branches ?? []
  return branches
    .filter(br => br.head === commitId)
    .map(br => ({ name: br.name, color: br.color }))
}

function isHighlighted(commitId: string): boolean {
  return currentStepData.value?.highlight?.includes(commitId) ?? false
}

function isHead(commitId: string): boolean {
  const branches = currentStepData.value?.branches ?? []
  const headBranch = branches.find(br => br.name === currentStepData.value?.head)
  return headBranch?.head === commitId || false
}

// ── 播放控制 ─────────────────────────────────────────────────
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

watch(speed, () => { if (isPlaying.value) { pause(); play() } })
watch(() => props.topicId, () => {
  steps.value = topic.value.generateSteps()
  currentStep.value = 0
})
onUnmounted(() => pause())
</script>

<template>
  <div class="space-y-5">
    <!-- Git 图：改为独立完整宽度，给 commit 图充足空间 -->
    <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Commit Graph</span>
        <span class="text-sm font-medium text-accent-dark dark:text-accent">HEAD → {{ currentStepData?.head || '-' }}</span>
      </div>

      <div class="overflow-auto rounded-lg bg-gray-50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800" style="max-height: 640px;">
        <svg v-if="currentStepData" :width="svgWidth" :height="svgHeight" class="block min-w-full">
          <defs>
            <!-- 高亮节点发光滤镜 -->
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- 连线：parent → child -->
          <template v-for="commit in currentStepData.commits" :key="'lines-' + commit.id">
            <template v-for="parentId in commit.parents" :key="'line-' + commit.id + '-' + parentId">
              <line
                :x1="toPixel(currentStepData.commits.find(c => c.id === parentId) || commit).px"
                :y1="toPixel(currentStepData.commits.find(c => c.id === parentId) || commit).py"
                :x2="toPixel(commit).px"
                :y2="toPixel(commit).py"
                :stroke="commit.color"
                stroke-width="3"
                stroke-opacity="0.5"
                stroke-linecap="round" />
            </template>
          </template>

          <!-- commit 节点 -->
          <template v-for="commit in currentStepData.commits" :key="'node-' + commit.id">
            <!-- 高亮时外圈光晕 -->
            <circle
              v-if="isHighlighted(commit.id)"
              :cx="toPixel(commit).px"
              :cy="toPixel(commit).py"
              :r="NODE_R + 10"
              :fill="commit.color"
              fill-opacity="0.12"
              class="pointer-events-none" />

            <circle
              :cx="toPixel(commit).px"
              :cy="toPixel(commit).py"
              :r="isHighlighted(commit.id) ? NODE_R + 5 : NODE_R"
              :fill="commit.color"
              :stroke="isHead(commit.id) ? '#ffffff' : 'none'"
              stroke-width="isHead(commit.id) ? 4 : 0"
              :filter="isHighlighted(commit.id) ? 'url(#glow)' : undefined"
              :opacity="isHighlighted(commit.id) ? 1 : 0.85"
              class="transition-all duration-300" />

            <!-- commit hash 文字 -->
            <text
              :x="toPixel(commit).px"
              :y="toPixel(commit).py + 5"
              text-anchor="middle"
              fill="white"
              font-size="11"
              font-family="monospace"
              font-weight="bold"
              class="pointer-events-none select-none">
              {{ commit.id.length > 6 ? commit.id.slice(0, 6) : commit.id }}
            </text>

            <!-- commit label：使用 foreignObject 实现多行换行，避免截断和重叠 -->
            <foreignObject
              :x="toPixel(commit).px - 70"
              :y="toPixel(commit).py + NODE_R + 10"
              width="140"
              height="70"
              class="pointer-events-none">
              <div xmlns="http://www.w3.org/1999/xhtml" class="text-center leading-tight">
                <div
                  v-for="(line, li) in wrapLabel(commit.label, 14)"
                  :key="li"
                  class="text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                  {{ line }}
                </div>
              </div>
            </foreignObject>

            <!-- 分支标签（节点右侧，避免与上下 commit label 重叠） -->
            <template v-for="(br, bi) in branchesAtCommit(commit.id)" :key="'br-' + commit.id + '-' + br.name">
              <rect
                :x="toPixel(commit).px + NODE_R + 12"
                :y="toPixel(commit).py - 12 + bi * 26"
                :width="br.name.length * 8 + 18"
                height="22"
                rx="11"
                :fill="br.color"
                fill-opacity="0.15"
                :stroke="br.color"
                stroke-width="1.5" />
              <text
                :x="toPixel(commit).px + NODE_R + 12 + (br.name.length * 8 + 18) / 2"
                :y="toPixel(commit).py + 4 + bi * 26"
                text-anchor="middle"
                :fill="br.color"
                font-size="11"
                font-weight="bold"
                font-family="monospace"
                class="pointer-events-none select-none">
                {{ br.name }}
              </text>
            </template>
          </template>
        </svg>
        <div v-else class="flex items-center justify-center h-64 text-gray-400 dark:text-slate-500 text-sm">
          暂无数据
        </div>
      </div>

      <!-- 图例 -->
      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-slate-400">
        <span v-for="br in (currentStepData?.branches ?? [])" :key="br.name" class="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
          <span class="w-3 h-3 rounded-full" :style="{ background: br.color }"></span>
          {{ br.name }}
        </span>
      </div>
    </div>

    <!-- 代码面板（Git 命令） -->
    <CodePanel :code="topic.code" :current-line="currentStepData?.codeLine || 0" language="shell" />

    <!-- 暂存区 + 工作区面板 -->
    <div v-if="currentStepData?.stagingArea || currentStepData?.workingDir" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-if="currentStepData?.stagingArea" class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-3">
        <div class="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          暂存区 Staging Area
        </div>
        <div v-for="item in currentStepData.stagingArea" :key="item" class="text-xs text-green-800 dark:text-green-300 font-mono py-0.5">+ {{ item }}</div>
      </div>
      <div v-if="currentStepData?.workingDir" class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
        <div class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          工作区 Working Directory
        </div>
        <div v-for="item in currentStepData.workingDir" :key="item" class="text-xs text-amber-800 dark:text-amber-300 font-mono py-0.5">~ {{ item }}</div>
      </div>
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
      <!-- 冲突提示 -->
      <div v-if="currentStepData?.message" class="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-mono">
        ⚠️ {{ currentStepData.message }}
      </div>
    </div>
  </div>
</template>
