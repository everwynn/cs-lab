// ============================================================
// searchingAlgorithms.ts — 搜索算法步骤生成器 + 配置
// 纯逻辑，与 UI 无关，被 SearchVisualizer.vue 导入使用
// ============================================================

export interface SearchStep {
  array: number[]
  target: number
  current?: number
  found?: number
  low?: number
  mid?: number
  high?: number
  hashTable?: number[][]
  bucketIndex?: number
  chainIndex?: number
  codeLine: number
  description: string
}

export interface SearchAlgorithmConfig {
  name: string
  code: string
  generate: (arr: number[], target: number) => SearchStep[]
  timeBest: string
  timeAvg: string
  timeWorst: string
  space: string
  requiresSorted: boolean
}

function mk(
  a: number[],
  target: number,
  opts: { current?: number; found?: number; low?: number; mid?: number; high?: number; hashTable?: number[][]; bucketIndex?: number; chainIndex?: number; codeLine: number; description: string },
): SearchStep {
  return {
    array: [...a],
    target,
    current: opts.current,
    found: opts.found,
    low: opts.low,
    mid: opts.mid,
    high: opts.high,
    hashTable: opts.hashTable ? opts.hashTable.map(bucket => [...bucket]) : undefined,
    bucketIndex: opts.bucketIndex,
    chainIndex: opts.chainIndex,
    codeLine: opts.codeLine,
    description: opts.description,
  }
}

// ============================================================
// 1. 线性查找
// ============================================================
function generateLinearSteps(arr: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = []
  const a = [...arr]
  const n = a.length

  steps.push(mk(a, target, { codeLine: 1, description: `开始线性查找，目标值 target = ${target}` }))
  steps.push(mk(a, target, { codeLine: 2, description: `数组长度 n = ${n}` }))

  for (let i = 0; i < n; i++) {
    steps.push(mk(a, target, { current: i, codeLine: 3, description: `i = ${i}：检查 arr[${i}] = ${a[i]}` }))
    steps.push(mk(a, target, { current: i, codeLine: 4, description: `比较 arr[${i}] = ${a[i]} 是否等于 ${target}` }))
    if (a[i] === target) {
      steps.push(mk(a, target, { current: i, found: i, codeLine: 5, description: `命中！arr[${i}] == ${target}，返回下标 ${i}` }))
      return steps
    }
    steps.push(mk(a, target, { current: i, codeLine: 4, description: `arr[${i}] = ${a[i]} ≠ ${target}，继续下一个` }))
  }

  steps.push(mk(a, target, { codeLine: 7, description: `遍历结束，未找到 ${target}，返回 -1` }))
  return steps
}

// ============================================================
// 2. 二分查找
// ============================================================
function generateBinarySteps(arr: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = []
  const a = [...arr]
  const n = a.length

  steps.push(mk(a, target, { codeLine: 1, description: `开始二分查找，目标值 target = ${target}（数组已按升序排列）` }))

  let low = 0
  let high = n - 1
  steps.push(mk(a, target, { low, high, codeLine: 2, description: `low = 0` }))
  steps.push(mk(a, target, { low, high, codeLine: 3, description: `high = n - 1 = ${high}` }))

  while (low <= high) {
    steps.push(mk(a, target, { low, high, codeLine: 4, description: `low = ${low} ≤ high = ${high}，继续查找` }))
    const mid = low + Math.floor((high - low) / 2)
    steps.push(mk(a, target, { low, mid, high, codeLine: 5, description: `mid = low + (high - low) / 2 = ${mid}，arr[${mid}] = ${a[mid]}` }))

    steps.push(mk(a, target, { low, mid, high, codeLine: 6, description: `比较 arr[${mid}] = ${a[mid]} 和 target = ${target}` }))
    if (a[mid] === target) {
      steps.push(mk(a, target, { low, mid, high, found: mid, codeLine: 7, description: `命中！arr[${mid}] == ${target}，返回下标 ${mid}` }))
      return steps
    } else if (a[mid] < target) {
      steps.push(mk(a, target, { low, mid, high, codeLine: 8, description: `arr[${mid}] = ${a[mid]} < ${target}，目标在右半部分` }))
      low = mid + 1
      steps.push(mk(a, target, { low, high, codeLine: 9, description: `low = mid + 1 = ${low}` }))
    } else {
      steps.push(mk(a, target, { low, mid, high, codeLine: 10, description: `arr[${mid}] = ${a[mid]} > ${target}，目标在左半部分` }))
      high = mid - 1
      steps.push(mk(a, target, { low, high, codeLine: 11, description: `high = mid - 1 = ${high}` }))
    }
  }

  steps.push(mk(a, target, { low, high, codeLine: 13, description: `low = ${low} > high = ${high}，区间为空，未找到 ${target}，返回 -1` }))
  return steps
}

// ============================================================
// 3. 哈希查找（拉链法）
// ============================================================
function generateHashSteps(arr: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = []
  const a = [...arr]
  const n = a.length
  const size = n * 2
  const table: number[][] = Array.from({ length: size }, () => [])

  steps.push(mk(a, target, { codeLine: 1, description: `开始哈希查找，目标值 target = ${target}` }))
  steps.push(mk(a, target, { codeLine: 2, description: `哈希表大小 size = keys.length * 2 = ${size}` }))
  steps.push(mk(a, target, { hashTable: table, codeLine: 3, description: `创建 ${size} 个空桶（拉链法处理冲突）` }))

  for (let i = 0; i < size; i++) {
    steps.push(mk(a, target, { hashTable: table, codeLine: 4, description: `初始化桶 ${i}` }))
    steps.push(mk(a, target, { hashTable: table, codeLine: 5, description: `table[${i}] = 空链表` }))
  }

  for (let i = 0; i < n; i++) {
    const key = a[i]
    steps.push(mk(a, target, { current: i, hashTable: table, codeLine: 7, description: `取出第 ${i} 个关键字 key = ${key}` }))
    const idx = key % size
    const hasCollision = table[idx].length > 0
    steps.push(mk(a, target, { current: i, bucketIndex: idx, hashTable: table, codeLine: 8, description: `hash(${key}) = ${key} % ${size} = ${idx}${hasCollision ? '（桶中已有元素，发生冲突）' : ''}` }))
    table[idx].push(key)
    steps.push(mk(a, target, { current: i, bucketIndex: idx, chainIndex: table[idx].length - 1, hashTable: table, codeLine: 9, description: `将 ${key} 放入桶 ${idx} 的链表末尾` }))
  }

  steps.push(mk(a, target, { hashTable: table, codeLine: 11, description: '哈希表构建完成，开始查找' }))
  const targetIdx = ((target % size) + size) % size
  steps.push(mk(a, target, { bucketIndex: targetIdx, hashTable: table, codeLine: 11, description: `hash(${target}) = ${target} % ${size} = ${targetIdx}，目标应在桶 ${targetIdx}` }))

  const bucket = table[targetIdx]
  if (bucket.length === 0) {
    steps.push(mk(a, target, { bucketIndex: targetIdx, hashTable: table, codeLine: 17, description: `桶 ${targetIdx} 为空，未找到 ${target}，返回 -1` }))
    return steps
  }

  for (let i = 0; i < bucket.length; i++) {
    steps.push(mk(a, target, { bucketIndex: targetIdx, chainIndex: i, hashTable: table, codeLine: 12, description: `检查桶 ${targetIdx} 中第 ${i} 个元素` }))
    steps.push(mk(a, target, { bucketIndex: targetIdx, chainIndex: i, hashTable: table, codeLine: 13, description: `比较 ${bucket[i]} 和 ${target}` }))
    if (bucket[i] === target) {
      steps.push(mk(a, target, { found: targetIdx, bucketIndex: targetIdx, chainIndex: i, hashTable: table, codeLine: 14, description: `命中！在桶 ${targetIdx} 的第 ${i} 个位置找到 ${target}` }))
      return steps
    }
  }

  steps.push(mk(a, target, { bucketIndex: targetIdx, hashTable: table, codeLine: 17, description: `桶 ${targetIdx} 中没有 ${target}，返回 -1` }))
  return steps
}

// ============================================================
// 算法配置
// ============================================================
export const searchAlgorithmMeta: Record<string, SearchAlgorithmConfig> = {
  linear: {
    name: '线性查找',
    code: `public static int linearSearch(int[] arr, int target) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == target) {
            return i;
        }
    }
    return -1;
}`,
    generate: generateLinearSteps,
    timeBest: 'O(1)',
    timeAvg: 'O(n)',
    timeWorst: 'O(n)',
    space: 'O(1)',
    requiresSorted: false,
  },
  binary: {
    name: '二分查找',
    code: `public static int binarySearch(int[] arr, int target) {
    int low = 0;
    int high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
    generate: generateBinarySteps,
    timeBest: 'O(1)',
    timeAvg: 'O(log n)',
    timeWorst: 'O(log n)',
    space: 'O(1)',
    requiresSorted: true,
  },
  hash: {
    name: '哈希查找',
    code: `public static int hashSearch(int[] keys, int target) {
    int size = keys.length * 2;
    ArrayList<Integer>[] table = new ArrayList[size];
    for (int i = 0; i < size; i++) {
        table[i] = new ArrayList<Integer>();
    }
    for (int key : keys) {
        int idx = key % size;
        table[idx].add(key);
    }
    int idx = target % size;
    for (int i = 0; i < table[idx].size(); i++) {
        if (table[idx].get(i) == target) {
            return idx;
        }
    }
    return -1;
}`,
    generate: generateHashSteps,
    timeBest: 'O(1)',
    timeAvg: 'O(1)',
    timeWorst: 'O(n)',
    space: 'O(n)',
    requiresSorted: false,
  },
}
