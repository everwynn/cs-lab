<script setup lang="ts">
// ============================================================
// AlgorithmFilter — 算法列表页分类筛选 + 搜索组件
// ============================================================
import { ref, computed } from 'vue'
import { withBase } from '../../utils/baseUrl'

interface Algorithm {
  name: string
  slug: string
  complexity: string
  available: boolean
  stable?: boolean
  requiresSorted?: boolean
  weighted?: boolean
  desc: string
}

interface Category {
  name: string
  icon: string
  description: string
  algorithms: Algorithm[]
}

const props = defineProps<{
  categories: Category[]
}>()

const search = ref('')
const activeCategory = ref('全部')
const categoryNames = computed(() => ['全部', ...props.categories.map(c => c.name)])

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.categories
    .filter(cat => activeCategory.value === '全部' || cat.name === activeCategory.value)
    .map(cat => ({
      ...cat,
      algorithms: cat.algorithms.filter(algo =>
        algo.name.toLowerCase().includes(q) ||
        algo.desc.toLowerCase().includes(q) ||
        algo.complexity.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => cat.algorithms.length > 0)
})

function badgeText(algo: Algorithm, catName: string): string {
  if (catName === '排序算法') return algo.stable ? '稳定' : '不稳定'
  if (catName === '搜索算法') return algo.requiresSorted ? '需有序' : '无需有序'
  if (catName === '图论算法') return algo.weighted ? '带权' : '无权'
  return ''
}

function badgeClass(algo: Algorithm, catName: string): string {
  if (catName === '排序算法') {
    return algo.stable
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  }
  if (catName === '搜索算法') {
    return algo.requiresSorted
      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  }
  if (catName === '图论算法') {
    return algo.weighted
      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  }
  return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 搜索 + 分类筛选 -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input v-model="search" type="text" placeholder="搜索算法名称、描述或复杂度..."
          class="w-full pl-9 pr-4 py-2 sm:py-2.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50" />
      </div>
      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <button v-for="cat in categoryNames" :key="cat" @click="activeCategory = cat"
          :class="['text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all', activeCategory === cat
            ? 'border-accent bg-accent text-white'
            : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-accent/50']">
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- 结果列表 -->
    <div v-if="filteredCategories.length === 0" class="text-center py-12 text-gray-500 dark:text-slate-500 text-sm">
      没有找到匹配的算法
    </div>

    <div v-for="cat in filteredCategories" :key="cat.name" class="space-y-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ cat.icon }}</span>
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ cat.name }}</h2>
          <p class="text-sm text-gray-500 dark:text-slate-500">{{ cat.description }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a v-for="algo in cat.algorithms" :key="algo.slug" :href="algo.available ? withBase('/algorithms/' + algo.slug) : '#'"
          :class="['block p-5 rounded-xl border transition-all', algo.available
            ? 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-accent/50 hover:shadow-md'
            : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/20 opacity-60 cursor-not-allowed']">
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ algo.name }}</h3>
            <span :class="['text-xs font-mono font-bold px-2 py-0.5 rounded', badgeClass(algo, cat.name)]">
              {{ badgeText(algo, cat.name) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">{{ algo.desc }}</p>
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-gray-400 dark:text-slate-500">{{ algo.complexity }}</span>
            <span v-if="algo.available" class="text-xs text-accent-dark dark:text-accent font-medium flex items-center gap-1">
              开始演示
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </span>
            <span v-else class="text-xs text-gray-400 dark:text-slate-600">开发中</span>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>
