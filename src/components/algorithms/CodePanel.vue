<script setup lang="ts">
// ============================================================
// CodePanel — 代码展示面板
// 支持 Java / Shell 语法高亮、复制代码、高亮行自动滚动到视野内
// ============================================================
import { ref, computed, watch, nextTick } from 'vue'
import { highlightJava, highlightShell } from './codeHighlight'

const props = withDefaults(defineProps<{
  code: string
  currentLine: number
  language?: 'java' | 'shell'
}>(), {
  language: 'java',
})

const highlighter = computed(() => props.language === 'shell' ? highlightShell : highlightJava)
const langLabel = computed(() => props.language === 'shell' ? 'Shell' : 'Java')

const codeLines = computed(() => props.code.split('\n'))
const highlightedRef = ref<HTMLElement | null>(null)
const preRef = ref<HTMLElement | null>(null)
const copied = ref(false)

function copyCode() {
  navigator.clipboard.writeText(props.code).then(() => {
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  })
}

function scrollToHighlightedLine() {
  const el = highlightedRef.value
  const pre = preRef.value
  if (!el || !pre) return

  // 如果代码没有超出面板高度，不需要滚动
  if (pre.scrollHeight <= pre.clientHeight) return

  const targetTop = el.offsetTop
  const targetHeight = el.offsetHeight
  const containerHeight = pre.clientHeight
  const maxScrollTop = pre.scrollHeight - containerHeight

  const desiredScrollTop = targetTop - containerHeight / 2 + targetHeight / 2
  const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, desiredScrollTop))

  pre.scrollTo({ top: clampedScrollTop, behavior: 'smooth' })
}

watch(() => props.currentLine, () => {
  nextTick(scrollToHighlightedLine)
})
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-3 sm:p-4 overflow-hidden flex flex-col h-full min-h-[16rem] sm:min-h-[18rem] max-h-[22rem] sm:max-h-[30rem]">
    <div class="flex items-center justify-between mb-3 flex-shrink-0">
      <span class="text-sm font-medium text-gray-600 dark:text-slate-400">代码实现</span>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 text-xs rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">{{ langLabel }}</span>
        <button @click="copyCode"
          class="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all flex items-center gap-1">
          <span v-if="copied">✓</span>
          <span v-else>📋</span>
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>
    <pre ref="preRef" class="text-sm leading-relaxed overflow-auto flex-1"><code class="font-mono">
      <div v-for="(line, idx) in codeLines" :key="idx"
        :ref="currentLine === idx + 1 ? (el) => { highlightedRef = el as HTMLElement } : undefined"
        :class="['flex items-start', currentLine === idx + 1 ? 'bg-amber-100 dark:bg-amber-900/30 -mx-4 px-4 border-l-2 border-amber-500' : '']">
        <span :class="['inline-block w-8 flex-shrink-0 text-right pr-3 select-none', currentLine === idx + 1 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-300 dark:text-slate-600']">{{ idx + 1 }}</span>
        <span v-html="highlighter(line) || '&nbsp;'" class="flex-1 text-gray-700 dark:text-slate-300"></span>
      </div>
    </code></pre>
  </div>
</template>
