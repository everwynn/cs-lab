<script setup lang="ts">
// ============================================================
// TableOfContents 组件 — 悬浮目录 + 回顶按钮
// ============================================================
// 功能：
// 1. 自动扫描页面中的 h2/h3 标题，生成目录列表
// 2. 右下角悬浮按钮，点击展开/收起目录面板
// 3. 点击目录项平滑滚动到对应标题
// 4. 滚动时高亮当前可见章节
// 5. 页面滚动超过 300px 后显示"回顶"按钮
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue'

interface TocItem {
  id: string
  text: string
  level: number  // 2 = h2, 3 = h3
}

const tocItems = ref<TocItem[]>([])
const isOpen = ref(false)
const activeId = ref('')
const showScrollTop = ref(false)

// 扫描文章中的 h2/h3 标题，自动添加 id
const scanHeadings = () => {
  // 限定在 .prose 区域内扫描，避免扫到页面标题
  const article = document.querySelector('.prose')
  if (!article) return

  const headings = article.querySelectorAll('h2, h3')
  const items: TocItem[] = []

  headings.forEach((heading, index) => {
    // 如果没有 id，自动生成一个
    if (!heading.id) {
      const text = heading.textContent || ''
      // 生成 id：中文/英文/数字，其余替换为横杠
      const id = `heading-${index}-${text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
      heading.id = id
    }
    items.push({
      id: heading.id,
      text: heading.textContent || '',
      level: parseInt(heading.tagName[1]),
    })
  })

  tocItems.value = items
}

// 监听滚动：更新高亮 + 回顶按钮显示
const onScroll = () => {
  showScrollTop.value = window.scrollY > 300

  // 找到当前在视口中最靠近顶部的标题
  const scrollY = window.scrollY + 120  // 偏移量补偿 header 高度
  let current = ''

  tocItems.value.forEach(item => {
    const el = document.getElementById(item.id)
    if (el && el.offsetTop <= scrollY) {
      current = item.id
    }
  })
  activeId.value = current
}

// 点击目录项：平滑滚动
const scrollTo = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top, behavior: 'smooth' })
  isOpen.value = false
}

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 点击遮罩关闭目录
const handleClickOutside = (e: MouseEvent) => {
  const panel = document.getElementById('toc-panel')
  const btn = document.getElementById('toc-btn')
  if (panel && btn && !panel.contains(e.target as Node) && !btn.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  scanHeadings()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', handleClickOutside)
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <!-- 目录面板 -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="isOpen && tocItems.length > 0"
        id="toc-panel"
        class="w-64 max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-black/20"
      >
        <!-- 面板头部 -->
        <div class="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span class="text-sm font-semibold text-gray-700 dark:text-slate-200">目录</span>
          <button
            @click="isOpen = false"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 目录列表 -->
        <nav class="p-2">
          <button
            v-for="item in tocItems"
            :key="item.id"
            @click="scrollTo(item.id)"
            :class="[
              'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
              item.level === 3 ? 'pl-6' : '',
              activeId === item.id
                ? 'bg-accent/10 text-accent-dark dark:text-accent font-medium border-l-2 border-accent'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            {{ item.text }}
          </button>
        </nav>

        <!-- 空状态 -->
        <div v-if="tocItems.length === 0" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
          暂无目录
        </div>
      </div>
    </Transition>

    <!-- 按钮区（回顶 + 目录） -->
    <div class="flex flex-col items-center gap-2">
      <!-- 回顶按钮 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-75"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-75"
      >
        <button
          v-if="showScrollTop"
          @click="scrollToTop"
          title="回到顶部"
          class="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent hover:border-accent/50 dark:hover:border-accent/30 transition-all duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </Transition>

      <!-- 目录按钮 -->
      <button
        v-if="tocItems.length > 0"
        id="toc-btn"
        @click="isOpen = !isOpen"
        :title="isOpen ? '收起目录' : '展开目录'"
        :class="[
          'w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          isOpen
            ? 'bg-accent text-white border border-accent shadow-accent/30'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent hover:border-accent/50 dark:hover:border-accent/30'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/>
        </svg>
      </button>
    </div>
  </div>
</template>
