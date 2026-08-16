<script setup lang="ts">
// ============================================================
// VisualizerControls — 算法可视化统一控制栏
// 提供播放、单步、重置、跳转到首尾、速度调节和键盘快捷键
// ============================================================
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
  minSpeed?: number
  maxSpeed?: number
}>()

const emit = defineEmits<{
  (e: 'toggle-play'): void
  (e: 'step-backward'): void
  (e: 'step-forward'): void
  (e: 'reset'): void
  (e: 'jump-start'): void
  (e: 'jump-end'): void
  (e: 'update:speed', value: number): void
}>()

function updateSpeed(v: number) {
  emit('update:speed', v)
}

function onKeyDown(event: KeyboardEvent) {
  // 避免在输入框中触发
  const target = event.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }

  switch (event.key) {
    case ' ':
    case 'k':
      event.preventDefault()
      emit('toggle-play')
      break
    case 'ArrowLeft':
    case 'j':
      event.preventDefault()
      emit('step-backward')
      break
    case 'ArrowRight':
    case 'l':
      event.preventDefault()
      emit('step-forward')
      break
    case 'Home':
      event.preventDefault()
      emit('jump-start')
      break
    case 'End':
      event.preventDefault()
      emit('jump-end')
      break
    case 'r':
      event.preventDefault()
      emit('reset')
      break
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
    <button @click="$emit('jump-start')" title="跳到开头 (Home)"
      class="text-xs sm:text-sm px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="currentStep === 0">
      ⏮
    </button>
    <button @click="$emit('step-backward')" title="上一步 (← / j)"
      class="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="currentStep === 0">
      ◀
    </button>
    <button @click="$emit('toggle-play')" :title="isPlaying ? '暂停 (Space / k)' : '播放 (Space / k)'"
      class="flex items-center gap-1 text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition-all font-medium min-w-[4.5rem] sm:min-w-[5.5rem] justify-center">
      <span v-if="isPlaying">⏸</span>
      <span v-else>▶</span>
      {{ isPlaying ? '暂停' : '播放' }}
    </button>
    <button @click="$emit('step-forward')" title="下一步 (→ / l)"
      class="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="currentStep >= totalSteps - 1">
      ▶
    </button>
    <button @click="$emit('jump-end')" title="跳到结尾 (End)"
      class="text-xs sm:text-sm px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="currentStep >= totalSteps - 1">
      ⏭
    </button>
    <button @click="$emit('reset')" title="重置 (r)"
      class="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50 hover:text-accent transition-all">
      <span class="sm:hidden">↻</span>
      <span class="hidden sm:inline">↻ 重置</span>
    </button>

    <div class="flex items-center gap-2 ml-auto">
      <span class="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">速度</span>
      <input :value="speed" @input="updateSpeed(($event.target as HTMLInputElement).valueAsNumber)" type="range"
        :min="minSpeed ?? 0.5" :max="maxSpeed ?? 5" step="0.5" class="w-20 sm:w-24 accent-accent" />
      <span class="text-[10px] sm:text-xs font-mono font-bold text-accent-dark dark:text-accent w-6 sm:w-8">{{ speed }}x</span>
    </div>
  </div>

  <!-- 快捷键提示 -->
  <div class="mt-2 hidden sm:flex flex-wrap gap-2 text-[10px] text-gray-400 dark:text-slate-500">
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">Space / k: 播放/暂停</span>
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">← / j: 上一步</span>
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">→ / l: 下一步</span>
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">Home: 开头</span>
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">End: 结尾</span>
    <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">r: 重置</span>
  </div>
</template>
