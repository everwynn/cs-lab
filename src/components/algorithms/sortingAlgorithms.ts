// ============================================================
// sortingAlgorithms.ts — 8 种排序算法步骤生成器 + 配置
// 纯逻辑，与 UI 无关，被 SortingVisualizer.vue 导入使用
// ============================================================

export interface SortStep {
  array: number[]
  comparing: number[]
  swapping: number[]
  sorted: number[]
  pivot?: number
  codeLine: number
  description: string
}

export interface AlgorithmConfig {
  name: string
  code: string
  generate: (arr: number[]) => SortStep[]
  timeBest: string
  timeAvg: string
  timeWorst: string
  space: string
  stable: boolean
}

// 步骤构造辅助函数
function mk(
  a: number[],
  sorted: number[],
  opts: { comparing?: number[]; swapping?: number[]; pivot?: number; codeLine: number; description: string },
): SortStep {
  return {
    array: [...a],
    comparing: opts.comparing || [],
    swapping: opts.swapping || [],
    sorted: [...sorted],
    pivot: opts.pivot,
    codeLine: opts.codeLine,
    description: opts.description,
  }
}

// ============================================================
// 1. 冒泡排序
// ============================================================
function generateBubbleSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  const sorted: number[] = []
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]
  steps.push(mk(a, sorted, { codeLine: 1, description: `开始冒泡排序，数组长度 ${n}` }))
  steps.push(mk(a, sorted, { codeLine: 2, description: `n = arr.length = ${n}` }))
  for (let i = 0; i < n - 1; i++) {
    steps.push(mk(a, sorted, { codeLine: 3, description: `外层循环：i = ${i}，第 ${i + 1}/${n - 1} 轮` }))
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push(mk(a, sorted, { comparing: [j, j + 1], codeLine: 4, description: `内层循环：j = ${j}，比较范围 [0, ${n - 1 - i})` }))
      const needSwap = a[j] > a[j + 1]
      steps.push(mk(a, sorted, { comparing: [j, j + 1], codeLine: 5, description: needSwap ? `arr[${j}] = ${a[j]} > arr[${j + 1}] = ${a[j + 1]}，需要交换` : `arr[${j}] = ${a[j]} ≤ arr[${j + 1}] = ${a[j + 1]}，无需交换` }))
      if (needSwap) {
        steps.push(mk(a, sorted, { swapping: [j, j + 1], codeLine: 6, description: `temp = arr[${j}] = ${a[j]}` }))
        const t = a[j]; a[j] = a[j + 1]
        steps.push(mk(a, sorted, { swapping: [j, j + 1], codeLine: 7, description: `arr[${j}] = arr[${j + 1}] = ${a[j]}` }))
        a[j + 1] = t
        steps.push(mk(a, sorted, { swapping: [j, j + 1], codeLine: 8, description: `arr[${j + 1}] = temp = ${a[j + 1]}，交换完成` }))
      }
    }
    sorted.push(n - 1 - i)
    steps.push(mk(a, sorted, { codeLine: 11, description: `第 ${i + 1} 轮结束，元素 ${a[n - 1 - i]} 已就位` }))
  }
  sorted.push(0)
  steps.push(mk(a, sorted, { codeLine: 12, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 2. 选择排序
// ============================================================
function generateSelectionSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  const sorted: number[] = []
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]
  steps.push(mk(a, sorted, { codeLine: 1, description: `开始选择排序，数组长度 ${n}` }))
  steps.push(mk(a, sorted, { codeLine: 2, description: `n = arr.length = ${n}` }))
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i
    steps.push(mk(a, sorted, { codeLine: 3, description: `外层循环：i = ${i}，从位置 ${i} 开始找最小值` }))
    steps.push(mk(a, sorted, { pivot: minIdx, codeLine: 4, description: `minIdx = i = ${minIdx}，当前最小值 = ${a[minIdx]}` }))
    for (let j = i + 1; j < n; j++) {
      steps.push(mk(a, sorted, { comparing: [j], pivot: minIdx, codeLine: 5, description: `j = ${j}，比较 arr[${j}] = ${a[j]} 和 arr[minIdx] = ${a[minIdx]}` }))
      if (a[j] < a[minIdx]) {
        steps.push(mk(a, sorted, { comparing: [j], pivot: minIdx, codeLine: 6, description: `${a[j]} < ${a[minIdx]}，更新最小值索引` }))
        minIdx = j
        steps.push(mk(a, sorted, { pivot: minIdx, codeLine: 7, description: `minIdx = ${minIdx}，当前最小值 = ${a[minIdx]}` }))
      }
    }
    if (minIdx !== i) {
      steps.push(mk(a, sorted, { swapping: [i, minIdx], codeLine: 10, description: `temp = arr[${minIdx}] = ${a[minIdx]}` }))
      const t = a[minIdx]; a[minIdx] = a[i]
      steps.push(mk(a, sorted, { swapping: [i, minIdx], codeLine: 11, description: `arr[${minIdx}] = arr[${i}] = ${a[minIdx]}` }))
      a[i] = t
      steps.push(mk(a, sorted, { swapping: [i, minIdx], codeLine: 12, description: `arr[${i}] = temp = ${a[i]}，交换完成` }))
    }
    sorted.push(i)
    steps.push(mk(a, sorted, { codeLine: 13, description: `第 ${i + 1} 轮结束，位置 ${i} 已就位：${a[i]}` }))
  }
  sorted.push(n - 1)
  steps.push(mk(a, sorted, { codeLine: 14, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 3. 插入排序
// ============================================================
function generateInsertionSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  const sorted: number[] = [0]
  if (n < 2) return [mk(a, [0], { codeLine: 1, description: '数组长度不足，无需排序' })]
  steps.push(mk(a, sorted, { codeLine: 1, description: `开始插入排序，数组长度 ${n}` }))
  steps.push(mk(a, sorted, { codeLine: 2, description: `n = arr.length = ${n}` }))
  for (let i = 1; i < n; i++) {
    const key = a[i]
    steps.push(mk(a, sorted, { pivot: i, codeLine: 3, description: `外层循环：i = ${i}` }))
    steps.push(mk(a, sorted, { pivot: i, codeLine: 4, description: `key = arr[${i}] = ${key}（待插入元素）` }))
    let j = i - 1
    steps.push(mk(a, sorted, { pivot: i, codeLine: 5, description: `j = i - 1 = ${j}` }))
    while (j >= 0 && a[j] > key) {
      steps.push(mk(a, sorted, { comparing: [j], pivot: i, codeLine: 6, description: `j = ${j}：arr[${j}] = ${a[j]} > key = ${key}，需要后移` }))
      a[j + 1] = a[j]
      steps.push(mk(a, sorted, { swapping: [j, j + 1], pivot: i, codeLine: 7, description: `arr[${j + 1}] = arr[${j}] = ${a[j + 1]}，元素后移` }))
      j--
      steps.push(mk(a, sorted, { pivot: i, codeLine: 8, description: `j-- → j = ${j}` }))
    }
    if (j >= 0) {
      steps.push(mk(a, sorted, { comparing: [j], pivot: i, codeLine: 6, description: `j = ${j}：arr[${j}] = ${a[j]} ≤ key = ${key}，停止后移` }))
    } else {
      steps.push(mk(a, sorted, { pivot: i, codeLine: 6, description: `j = -1 < 0，停止后移` }))
    }
    a[j + 1] = key
    sorted.push(i)
    steps.push(mk(a, sorted, { codeLine: 10, description: `arr[${j + 1}] = key = ${key}，插入完成` }))
  }
  steps.push(mk(a, sorted, { codeLine: 12, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 4. 快速排序
// ============================================================
function generateQuickSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  const sorted: number[] = []
  if (n < 2) return [mk(a, [0], { codeLine: 1, description: '数组长度不足，无需排序' })]

  function partition(low: number, high: number): number {
    const pivotVal = a[high]
    steps.push(mk(a, sorted, { pivot: high, codeLine: 10, description: `pivot = arr[${high}] = ${pivotVal}` }))
    let i = low - 1
    steps.push(mk(a, sorted, { pivot: high, codeLine: 11, description: `i = low - 1 = ${i}` }))
    for (let j = low; j < high; j++) {
      steps.push(mk(a, sorted, { comparing: [j], pivot: high, codeLine: 12, description: `j = ${j}：比较 arr[${j}] = ${a[j]} 与 pivot = ${pivotVal}` }))
      if (a[j] <= pivotVal) {
        steps.push(mk(a, sorted, { comparing: [j], pivot: high, codeLine: 13, description: `${a[j]} ≤ ${pivotVal}，i++ → i = ${i + 1}` }))
        i++
        if (i !== j) {
          steps.push(mk(a, sorted, { swapping: [i, j], pivot: high, codeLine: 15, description: `temp = arr[${i}] = ${a[i]}` }))
          const t = a[i]; a[i] = a[j]
          steps.push(mk(a, sorted, { swapping: [i, j], pivot: high, codeLine: 16, description: `arr[${i}] = arr[${j}] = ${a[i]}` }))
          a[j] = t
          steps.push(mk(a, sorted, { swapping: [i, j], pivot: high, codeLine: 17, description: `arr[${j}] = temp = ${a[j]}，交换完成` }))
        }
      } else {
        steps.push(mk(a, sorted, { comparing: [j], pivot: high, codeLine: 13, description: `${a[j]} > ${pivotVal}，跳过` }))
      }
    }
    steps.push(mk(a, sorted, { swapping: [i + 1, high], codeLine: 20, description: `temp = arr[${i + 1}] = ${a[i + 1]}` }))
    const t = a[i + 1]; a[i + 1] = a[high]
    steps.push(mk(a, sorted, { swapping: [i + 1, high], codeLine: 21, description: `arr[${i + 1}] = arr[${high}] = ${a[i + 1]}` }))
    a[high] = t
    steps.push(mk(a, sorted, { swapping: [i + 1, high], codeLine: 22, description: `arr[${high}] = temp = ${a[high]}，基准点就位` }))
    sorted.push(i + 1)
    steps.push(mk(a, sorted, { codeLine: 23, description: `返回基准点位置 ${i + 1}` }))
    return i + 1
  }

  function quickSort(low: number, high: number) {
    if (low < high) {
      steps.push(mk(a, sorted, { codeLine: 2, description: `low = ${low} < high = ${high}，继续分区` }))
      steps.push(mk(a, sorted, { codeLine: 3, description: `调用 partition(arr, ${low}, ${high})` }))
      const pi = partition(low, high)
      steps.push(mk(a, sorted, { codeLine: 4, description: `递归排序左半 [${low}, ${pi - 1}]` }))
      quickSort(low, pi - 1)
      steps.push(mk(a, sorted, { codeLine: 5, description: `递归排序右半 [${pi + 1}, ${high}]` }))
      quickSort(pi + 1, high)
    } else if (low === high) {
      sorted.push(low)
      steps.push(mk(a, sorted, { codeLine: 2, description: `low = high = ${low}，单元素已有序` }))
    }
  }

  steps.push(mk(a, sorted, { codeLine: 1, description: `开始快速排序，数组长度 ${n}` }))
  quickSort(0, n - 1)
  for (let i = 0; i < n; i++) { if (!sorted.includes(i)) sorted.push(i) }
  steps.push(mk(a, sorted, { codeLine: 7, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 5. 归并排序
// ============================================================
function generateMergeSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]

  function merge(left: number, mid: number, right: number) {
    const temp: number[] = []
    let i = left, j = mid + 1, k = 0
    steps.push(mk(a, [], { codeLine: 11, description: `创建临时数组，长度 = ${right - left + 1}` }))
    steps.push(mk(a, [], { comparing: [i, j], codeLine: 12, description: `i = ${i}, j = ${j}, k = 0` }))
    while (i <= mid && j <= right) {
      steps.push(mk(a, [], { comparing: [i, j], codeLine: 13, description: `比较 arr[${i}] = ${a[i]} 和 arr[${j}] = ${a[j]}` }))
      if (a[i] <= a[j]) {
        temp[k] = a[i]
        steps.push(mk(a, [], { comparing: [i, j], codeLine: 15, description: `${a[i]} ≤ ${a[j]}，取左半 arr[${i}] = ${a[i]} → temp[${k}]` }))
        i++; k++
      } else {
        temp[k] = a[j]
        steps.push(mk(a, [], { comparing: [i, j], codeLine: 17, description: `${a[j]} < ${a[i]}，取右半 arr[${j}] = ${a[j]} → temp[${k}]` }))
        j++; k++
      }
    }
    while (i <= mid) { temp[k] = a[i]; steps.push(mk(a, [], { swapping: [i], codeLine: 21, description: `剩余左半 arr[${i}] = ${a[i]} → temp[${k}]` })); i++; k++ }
    while (j <= right) { temp[k] = a[j]; steps.push(mk(a, [], { swapping: [j], codeLine: 24, description: `剩余右半 arr[${j}] = ${a[j]} → temp[${k}]` })); j++; k++ }
    for (let m = 0; m < temp.length; m++) {
      a[left + m] = temp[m]
      steps.push(mk(a, [], { swapping: [left + m], codeLine: 27, description: `arr[${left + m}] = temp[${m}] = ${temp[m]}，回写原数组` }))
    }
  }

  function mergeSort(left: number, right: number) {
    if (left < right) {
      const mid = Math.floor(left + (right - left) / 2)
      steps.push(mk(a, [], { codeLine: 2, description: `left = ${left} < right = ${right}，继续拆分` }))
      steps.push(mk(a, [], { codeLine: 3, description: `mid = ${mid}（中点）` }))
      steps.push(mk(a, [], { codeLine: 4, description: `递归排序左半 [${left}, ${mid}]` }))
      mergeSort(left, mid)
      steps.push(mk(a, [], { codeLine: 5, description: `递归排序右半 [${mid + 1}, ${right}]` }))
      mergeSort(mid + 1, right)
      steps.push(mk(a, [], { codeLine: 6, description: `合并 [${left}, ${mid}] 和 [${mid + 1}, ${right}]` }))
      merge(left, mid, right)
    }
  }

  steps.push(mk(a, [], { codeLine: 1, description: `开始归并排序，数组长度 ${n}` }))
  mergeSort(0, n - 1)
  const all = Array.from({ length: n }, (_, i) => i)
  steps.push(mk(a, all, { codeLine: 29, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 6. 堆排序
// ============================================================
function generateHeapSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  const sorted: number[] = []
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]

  function heapify(size: number, i: number) {
    let largest = i
    const left = 2 * i + 1
    const right = 2 * i + 2
    steps.push(mk(a, sorted, { pivot: i, codeLine: 15, description: `heapify：当前节点 i = ${i}（值 ${a[i]}）` }))
    if (left < size) {
      steps.push(mk(a, sorted, { comparing: [left], pivot: largest, codeLine: 18, description: `左子节点 left = ${left}（值 ${a[left]}）${a[left] > a[largest] ? '，大于当前最大' : '，不大于当前最大'}` }))
      if (a[left] > a[largest]) { largest = left; steps.push(mk(a, sorted, { pivot: largest, codeLine: 19, description: `largest = left = ${largest}` })) }
    }
    if (right < size) {
      steps.push(mk(a, sorted, { comparing: [right], pivot: largest, codeLine: 21, description: `右子节点 right = ${right}（值 ${a[right]}）${a[right] > a[largest] ? '，大于当前最大' : '，不大于当前最大'}` }))
      if (a[right] > a[largest]) { largest = right; steps.push(mk(a, sorted, { pivot: largest, codeLine: 22, description: `largest = right = ${largest}` })) }
    }
    if (largest !== i) {
      steps.push(mk(a, sorted, { swapping: [i, largest], codeLine: 25, description: `temp = arr[${i}] = ${a[i]}` }))
      const t = a[i]; a[i] = a[largest]
      steps.push(mk(a, sorted, { swapping: [i, largest], codeLine: 26, description: `arr[${i}] = arr[${largest}] = ${a[i]}` }))
      a[largest] = t
      steps.push(mk(a, sorted, { swapping: [i, largest], codeLine: 27, description: `arr[${largest}] = temp = ${a[largest]}，交换完成` }))
      steps.push(mk(a, sorted, { codeLine: 28, description: `递归 heapify(size = ${size}, i = ${largest})` }))
      heapify(size, largest)
    }
  }

  steps.push(mk(a, sorted, { codeLine: 1, description: `开始堆排序，数组长度 ${n}` }))
  steps.push(mk(a, sorted, { codeLine: 2, description: `n = arr.length = ${n}` }))
  // 建堆
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    steps.push(mk(a, sorted, { codeLine: 3, description: `建堆阶段：从非叶子节点 i = ${i} 开始` }))
    steps.push(mk(a, sorted, { codeLine: 4, description: `调用 heapify(arr, ${n}, ${i})` }))
    heapify(n, i)
  }
  steps.push(mk(a, sorted, { codeLine: 5, description: '最大堆构建完成！' }))
  // 提取
  for (let i = n - 1; i > 0; i--) {
    steps.push(mk(a, sorted, { codeLine: 6, description: `提取阶段：i = ${i}，将堆顶交换到末尾` }))
    steps.push(mk(a, sorted, { swapping: [0, i], codeLine: 7, description: `temp = arr[0] = ${a[0]}` }))
    const t = a[0]; a[0] = a[i]
    steps.push(mk(a, sorted, { swapping: [0, i], codeLine: 8, description: `arr[0] = arr[${i}] = ${a[0]}` }))
    a[i] = t
    steps.push(mk(a, sorted, { swapping: [0, i], codeLine: 9, description: `arr[${i}] = temp = ${a[i]}，堆顶已移到末尾` }))
    sorted.push(i)
    steps.push(mk(a, sorted, { codeLine: 10, description: `对剩余 ${i} 个元素调用 heapify(arr, ${i}, 0)` }))
    heapify(i, 0)
  }
  sorted.push(0)
  steps.push(mk(a, sorted, { codeLine: 12, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 7. 希尔排序
// ============================================================
function generateShellSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]
  steps.push(mk(a, [], { codeLine: 1, description: `开始希尔排序，数组长度 ${n}` }))
  steps.push(mk(a, [], { codeLine: 2, description: `n = arr.length = ${n}` }))
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    steps.push(mk(a, [], { codeLine: 3, description: `gap = ${gap}（增量），将数组分为 ${gap} 组` }))
    for (let i = gap; i < n; i++) {
      const temp = a[i]
      steps.push(mk(a, [], { codeLine: 4, description: `i = ${i}，temp = arr[${i}] = ${temp}` }))
      steps.push(mk(a, [], { pivot: i, codeLine: 5, description: `temp = ${temp}（待插入元素）` }))
      let j: number
      steps.push(mk(a, [], { pivot: i, codeLine: 6, description: `j = i = ${i}` }))
      for (j = i; j >= gap && a[j - gap] > temp; j -= gap) {
        steps.push(mk(a, [], { comparing: [j - gap], pivot: i, codeLine: 7, description: `j = ${j}：arr[${j - gap}] = ${a[j - gap]} > temp = ${temp}，后移` }))
        a[j] = a[j - gap]
        steps.push(mk(a, [], { swapping: [j], pivot: i, codeLine: 8, description: `arr[${j}] = arr[${j - gap}] = ${a[j]}` }))
      }
      if (j !== i) {
        a[j] = temp
        steps.push(mk(a, [], { codeLine: 10, description: `arr[${j}] = temp = ${temp}，插入完成` }))
      }
    }
  }
  const all = Array.from({ length: n }, (_, i) => i)
  steps.push(mk(a, all, { codeLine: 13, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 8. 计数排序（稳定实现）
// ============================================================
function generateCountingSteps(initial: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...initial]
  const n = a.length
  if (n < 2) return [mk(a, [], { codeLine: 1, description: '数组长度不足，无需排序' })]
  steps.push(mk(a, [], { codeLine: 1, description: `开始计数排序，数组长度 ${n}` }))
  // 找最大值
  let max = a[0]
  steps.push(mk(a, [], { pivot: 0, codeLine: 2, description: `max = arr[0] = ${max}` }))
  for (let i = 1; i < n; i++) {
    steps.push(mk(a, [], { comparing: [i], pivot: 0, codeLine: 3, description: `i = ${i}：比较 arr[${i}] = ${a[i]} 和 max = ${max}` }))
    if (a[i] > max) {
      steps.push(mk(a, [], { codeLine: 4, description: `${a[i]} > ${max}，更新最大值` }))
      max = a[i]
      steps.push(mk(a, [], { codeLine: 5, description: `max = ${max}` }))
    }
  }
  steps.push(mk(a, [], { codeLine: 7, description: `最大值 = ${max}，创建 count 数组（长度 ${max + 1}）` }))
  // 计数
  const count = new Array(max + 1).fill(0)
  steps.push(mk(a, [], { codeLine: 8, description: `创建 count 数组，长度 = ${max + 1}` }))
  for (let i = 0; i < n; i++) {
    count[a[i]]++
    steps.push(mk(a, [], { comparing: [i], codeLine: 9, description: `i = ${i}：count[${a[i]}]++ → ${count[a[i]]}` }))
    steps.push(mk(a, [], { codeLine: 10, description: `count[${a[i]}] = ${count[a[i]]}` }))
  }
  // 计算前缀和：count[i] 表示 ≤ i 的元素个数，是稳定放置的关键
  for (let i = 1; i <= max; i++) {
    count[i] += count[i - 1]
    steps.push(mk(a, [], { codeLine: 12, description: `i = ${i}：count[${i}] += count[${i - 1}] → ${count[i]}（≤ ${i} 的元素个数）` }))
    steps.push(mk(a, [], { codeLine: 13, description: `前缀和 count[${i}] = ${count[i]}` }))
  }
  // 从右向左放置到输出数组，保证稳定性
  steps.push(mk(a, [], { codeLine: 15, description: `创建输出数组 output，长度 = ${n}` }))
  const output = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    const val = a[i]
    const pos = count[val] - 1
    output[pos] = val
    count[val]--
    steps.push(mk(a, [], { comparing: [i], codeLine: 16, description: `i = ${i}：arr[${i}] = ${val}，从右侧取最后一个 ${val}` }))
    steps.push(mk(a, [], { codeLine: 17, description: `output[${pos}] = ${val}（从右放，相等元素原顺序得以保留）` }))
    steps.push(mk(a, [], { codeLine: 18, description: `count[${val}]-- → ${count[val]}` }))
  }
  // 回写
  const sorted: number[] = []
  for (let i = 0; i < n; i++) {
    a[i] = output[i]
    sorted.push(i)
    steps.push(mk(a, sorted, { swapping: [i], codeLine: 20, description: `i = ${i}：arr[${i}] = output[${i}] = ${a[i]}` }))
    steps.push(mk(a, sorted, { codeLine: 21, description: `arr[${i}] 已回写到原数组` }))
  }
  steps.push(mk(a, sorted, { codeLine: 23, description: '排序完成！数组已全部有序。' }))
  return steps
}

// ============================================================
// 算法配置
// ============================================================
export const algorithmMeta: Record<string, AlgorithmConfig> = {
  bubble: {
    name: '冒泡排序',
    code: `public static void bubbleSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}`,
    generate: generateBubbleSteps,
    timeBest: 'O(n)',
    timeAvg: 'O(n\u00b2)',
    timeWorst: 'O(n\u00b2)',
    space: 'O(1)',
    stable: true,
  },
  selection: {
    name: '选择排序',
    code: `public static void selectionSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        int temp = arr[minIdx];
        arr[minIdx] = arr[i];
        arr[i] = temp;
    }
}`,
    generate: generateSelectionSteps,
    timeBest: 'O(n\u00b2)',
    timeAvg: 'O(n\u00b2)',
    timeWorst: 'O(n\u00b2)',
    space: 'O(1)',
    stable: false,
  },
  insertion: {
    name: '插入排序',
    code: `public static void insertionSort(int[] arr) {
    int n = arr.length;
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}`,
    generate: generateInsertionSteps,
    timeBest: 'O(n)',
    timeAvg: 'O(n\u00b2)',
    timeWorst: 'O(n\u00b2)',
    space: 'O(1)',
    stable: true,
  },
  quick: {
    name: '快速排序',
    code: `public static void quickSort(int[] arr, int low, int high) {
    if (low < high) {
        int pivotIdx = partition(arr, low, high);
        quickSort(arr, low, pivotIdx - 1);
        quickSort(arr, pivotIdx + 1, high);
    }
}

private static int partition(int[] arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    int temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return i + 1;
}`,
    generate: generateQuickSteps,
    timeBest: 'O(n log n)',
    timeAvg: 'O(n log n)',
    timeWorst: 'O(n\u00b2)',
    space: 'O(log n)',
    stable: false,
  },
  merge: {
    name: '归并排序',
    code: `public static void mergeSort(int[] arr, int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }
}

private static void merge(int[] arr, int left, int mid, int right) {
    int[] temp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp[k++] = arr[i++];
        } else {
            temp[k++] = arr[j++];
        }
    }
    while (i <= mid) {
        temp[k++] = arr[i++];
    }
    while (j <= right) {
        temp[k++] = arr[j++];
    }
    for (int m = 0; m < temp.length; m++) {
        arr[left + m] = temp[m];
    }
}`,
    generate: generateMergeSteps,
    timeBest: 'O(n log n)',
    timeAvg: 'O(n log n)',
    timeWorst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
  },
  heap: {
    name: '堆排序',
    code: `public static void heapSort(int[] arr) {
    int n = arr.length;
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    for (int i = n - 1; i > 0; i--) {
        int temp = arr[0];
        arr[0] = arr[i];
        arr[i] = temp;
        heapify(arr, i, 0);
    }
}

private static void heapify(int[] arr, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    if (left < n && arr[left] > arr[largest]) {
        largest = left;
    }
    if (right < n && arr[right] > arr[largest]) {
        largest = right;
    }
    if (largest != i) {
        int temp = arr[i];
        arr[i] = arr[largest];
        arr[largest] = temp;
        heapify(arr, n, largest);
    }
}`,
    generate: generateHeapSteps,
    timeBest: 'O(n log n)',
    timeAvg: 'O(n log n)',
    timeWorst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
  },
  shell: {
    name: '希尔排序',
    code: `public static void shellSort(int[] arr) {
    int n = arr.length;
    for (int gap = n / 2; gap > 0; gap /= 2) {
        for (int i = gap; i < n; i++) {
            int temp = arr[i];
            int j;
            for (j = i; j >= gap && arr[j - gap] > temp; j -= gap) {
                arr[j] = arr[j - gap];
            }
            arr[j] = temp;
        }
    }
}`,
    generate: generateShellSteps,
    timeBest: 'O(n log n)',
    timeAvg: 'O(n\u00b9\u00b3)',
    timeWorst: 'O(n\u00b2)',
    space: 'O(1)',
    stable: false,
  },
  counting: {
    name: '计数排序',
    code: `public static void countingSort(int[] arr) {
    int max = arr[0];
    for (int i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    int[] count = new int[max + 1];
    for (int i = 0; i < arr.length; i++) {
        count[arr[i]]++;
    }
    for (int i = 1; i <= max; i++) {
        count[i] += count[i - 1];
    }
    int[] output = new int[arr.length];
    for (int i = arr.length - 1; i >= 0; i--) {
        output[count[arr[i]] - 1] = arr[i];
        count[arr[i]]--;
    }
    for (int i = 0; i < arr.length; i++) {
        arr[i] = output[i];
    }
}`,
    generate: generateCountingSteps,
    timeBest: 'O(n + k)',
    timeAvg: 'O(n + k)',
    timeWorst: 'O(n + k)',
    space: 'O(k)',
    stable: true,
  },
}
