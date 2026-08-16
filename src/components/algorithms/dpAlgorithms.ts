// ============================================================
// dpAlgorithms.ts — 动态规划算法步骤生成器 + 配置
// 纯逻辑，与 UI 无关，被 DpVisualizer.vue 导入使用
// ============================================================

export interface DpStep {
  grid: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  highlight: [number, number][]
  filled: [number, number][]
  formula?: string
  result?: string
  path?: [number, number][]
  codeLine: number
  description: string
}

export interface DpAlgorithmConfig {
  name: string
  code: string
  generate: () => DpStep[]
  timeBest: string
  timeAvg: string
  timeWorst: string
  space: string
}

// 步骤构造辅助
function mk(
  grid: number[][],
  highlight: [number, number][],
  filled: [number, number][],
  opts: {
    rowLabels?: string[]
    colLabels?: string[]
    formula?: string
    result?: string
    path?: [number, number][]
    codeLine: number
    description: string
  },
): DpStep {
  return {
    grid: grid.map(row => [...row]),
    rowLabels: opts.rowLabels,
    colLabels: opts.colLabels,
    highlight: highlight.map(h => [h[0], h[1]] as [number, number]),
    filled: filled.map(h => [h[0], h[1]] as [number, number]),
    formula: opts.formula,
    result: opts.result,
    path: opts.path?.map(h => [h[0], h[1]] as [number, number]),
    codeLine: opts.codeLine,
    description: opts.description,
  }
}

function cellIn(r: number, c: number, arr: [number, number][]): boolean {
  return arr.some(([a, b]) => a === r && b === c)
}

// ============================================================
// 1. 斐波那契（动态规划）
// ============================================================
function generateFibSteps(): DpStep[] {
  const steps: DpStep[] = []
  const n = 10
  const dp = new Array(n + 1).fill(-1)
  const filled: [number, number][] = []

  const colLabels = Array.from({ length: n + 1 }, (_, i) => `F(${i})`)
  const rowLabels = ['dp']

  steps.push(mk([dp], [], filled, {
    colLabels, rowLabels,
    codeLine: 1,
    description: `计算斐波那契数列 F(0) ~ F(${n})，初始化 DP 表格`,
  }))

  steps.push(mk([dp], [], filled, {
    colLabels, rowLabels,
    formula: 'dp[i] = dp[i-1] + dp[i-2]',
    codeLine: 2,
    description: '状态转移方程：dp[i] = dp[i-1] + dp[i-2]',
  }))

  // Base cases
  dp[0] = 0
  filled.push([0, 0])
  steps.push(mk([dp], [[0, 0]], filled, {
    colLabels, rowLabels,
    formula: 'dp[0] = 0',
    codeLine: 3,
    description: '基础情况：F(0) = 0',
  }))

  dp[1] = 1
  filled.push([0, 1])
  steps.push(mk([dp], [[0, 1]], filled, {
    colLabels, rowLabels,
    formula: 'dp[1] = 1',
    codeLine: 4,
    description: '基础情况：F(1) = 1',
  }))

  // Fill DP table
  for (let i = 2; i <= n; i++) {
    steps.push(mk([dp], [[0, i - 1], [0, i - 2]], filled, {
      colLabels, rowLabels,
      formula: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]}`,
      codeLine: 6,
      description: `计算 F(${i})：查看 dp[${i - 1}] = ${dp[i - 1]} 和 dp[${i - 2}] = ${dp[i - 2]}`,
    }))

    dp[i] = dp[i - 1] + dp[i - 2]
    filled.push([0, i])
    steps.push(mk([dp], [[0, i]], filled, {
      colLabels, rowLabels,
      formula: `dp[${i}] = ${dp[i]}`,
      codeLine: 7,
      description: `F(${i}) = ${dp[i]}，填入表格`,
    }))
  }

  steps.push(mk([dp], [], filled, {
    colLabels, rowLabels,
    result: `F(${n}) = ${dp[n]}`,
    codeLine: 9,
    description: `动态规划完成！F(${n}) = ${dp[n]}，避免了大量重复计算。`,
  }))

  return steps
}

// ============================================================
// 2. 0/1 背包问题
// ============================================================
function generateKnapsackSteps(): DpStep[] {
  const steps: DpStep[] = []
  const weights = [2, 3, 4, 5]
  const values = [3, 4, 5, 6]
  const W = 8
  const n = weights.length
  const itemLabels = ['—', ...weights.map((w, i) => `物品${i + 1}(w=${w},v=${values[i]})`)]
  const capLabels = Array.from({ length: W + 1 }, (_, i) => `w=${i}`)

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0))
  const filled: [number, number][] = []

  // 初始化第 0 行
  for (let w = 0; w <= W; w++) {
    filled.push([0, w])
  }
  steps.push(mk(dp, [], filled, {
    rowLabels: itemLabels, colLabels: capLabels,
    formula: 'dp[0][w] = 0',
    codeLine: 1,
    description: `0/1 背包：${n} 件物品，背包容量 W=${W}。初始化：无物品时价值为 0`,
  }))

  for (let i = 1; i <= n; i++) {
    const wi = weights[i - 1]
    const vi = values[i - 1]
    steps.push(mk(dp, [], filled, {
      rowLabels: itemLabels, colLabels: capLabels,
      codeLine: 2,
      description: `处理物品 ${i}：重量=${wi}，价值=${vi}`,
    }))

    for (let w = 0; w <= W; w++) {
      if (wi > w) {
        // 装不下
        dp[i][w] = dp[i - 1][w]
        filled.push([i, w])
        steps.push(mk(dp, [[i, w], [i - 1, w]], filled, {
          rowLabels: itemLabels, colLabels: capLabels,
          formula: `dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i - 1][w]}（装不下）`,
          codeLine: 4,
          description: `w=${w} < 物品重量${wi}，装不下，继承上一行 dp[${i - 1}][${w}] = ${dp[i - 1][w]}`,
        }))
      } else {
        const skip = dp[i - 1][w]
        const take = dp[i - 1][w - wi] + vi
        steps.push(mk(dp, [[i - 1, w], [i - 1, w - wi]], filled, {
          rowLabels: itemLabels, colLabels: capLabels,
          formula: `max(dp[${i - 1}][${w}], dp[${i - 1}][${w - wi}] + ${vi}) = max(${skip}, ${take})`,
          codeLine: 6,
          description: `w=${w} ≥ ${wi}，选择：不装=${skip}，装=${dp[i - 1][w - wi]}+${vi}=${take}`,
        }))
        dp[i][w] = Math.max(skip, take)
        filled.push([i, w])
        const choice = take > skip ? '装入' : '不装'
        steps.push(mk(dp, [[i, w]], filled, {
          rowLabels: itemLabels, colLabels: capLabels,
          formula: `dp[${i}][${w}] = ${dp[i][w]}`,
          codeLine: 7,
          description: `dp[${i}][${w}] = ${dp[i][w]}，决策：${choice}`,
        }))
      }
    }
  }

  // 回溯找出选择的物品
  const path: [number, number][] = []
  let r = n, c = W
  path.push([r, c])
  while (r > 0 && c > 0) {
    if (dp[r][c] !== dp[r - 1][c]) {
      c -= weights[r - 1]
      r--
      path.push([r, c])
    } else {
      r--
      path.push([r, c])
    }
  }

  steps.push(mk(dp, [], filled, {
    rowLabels: itemLabels, colLabels: capLabels,
    result: `最大价值 = dp[${n}][${W}] = ${dp[n][W]}`,
    path,
    codeLine: 10,
    description: `背包问题完成！最大价值 = ${dp[n][W]}，高亮路径为回溯选择过程。`,
  }))

  return steps
}

// ============================================================
// 3. 最长公共子序列（LCS）
// ============================================================
function generateLcsSteps(): DpStep[] {
  const steps: DpStep[] = []
  const s1 = 'ABCBDAB'
  const s2 = 'BDCAB'
  const m = s1.length
  const n = s2.length

  const colLabels = ['—', ...s2.split('')]
  const rowLabels = ['—', ...s1.split('')]

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  const filled: [number, number][] = []

  // 初始化
  for (let i = 0; i <= m; i++) filled.push([i, 0])
  for (let j = 0; j <= n; j++) filled.push([0, j])

  steps.push(mk(dp, [], filled, {
    rowLabels, colLabels,
    formula: 'dp[i][j] = 0  (i=0 或 j=0)',
    codeLine: 1,
    description: `LCS("${s1}", "${s2}")：初始化 DP 表格，第 0 行/列为 0`,
  }))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        // 字符匹配
        steps.push(mk(dp, [[i - 1, j - 1]], filled, {
          rowLabels, colLabels,
          formula: `s1[${i - 1}]='${s1[i - 1]}' == s2[${j - 1}]='${s2[j - 1]}'`,
          codeLine: 4,
          description: `s1[${i - 1}] = '${s1[i - 1]}' 与 s2[${j - 1}] = '${s2[j - 1]}' 匹配！dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1`,
        }))
        dp[i][j] = dp[i - 1][j - 1] + 1
        filled.push([i, j])
        steps.push(mk(dp, [[i, j]], filled, {
          rowLabels, colLabels,
          formula: `dp[${i}][${j}] = ${dp[i][j]}`,
          codeLine: 5,
          description: `匹配：dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}`,
        }))
      } else {
        // 字符不匹配
        steps.push(mk(dp, [[i - 1, j], [i, j - 1]], filled, {
          rowLabels, colLabels,
          formula: `s1[${i - 1}]='${s1[i - 1]}' ≠ s2[${j - 1}]='${s2[j - 1]}'`,
          codeLine: 7,
          description: `s1[${i - 1}] = '${s1[i - 1]}' ≠ s2[${j - 1}] = '${s2[j - 1]}'，取 max(dp[${i - 1}][${j}]=${dp[i - 1][j]}, dp[${i}][${j - 1}]=${dp[i][j - 1]})`,
        }))
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        filled.push([i, j])
        steps.push(mk(dp, [[i, j]], filled, {
          rowLabels, colLabels,
          formula: `dp[${i}][${j}] = max(${dp[i - 1][j]}, ${dp[i][j - 1]}) = ${dp[i][j]}`,
          codeLine: 8,
          description: `不匹配：dp[${i}][${j}] = max(${dp[i - 1][j]}, ${dp[i][j - 1]}) = ${dp[i][j]}`,
        }))
      }
    }
  }

  // 回溯找出 LCS
  const path: [number, number][] = []
  let i = m, j = n
  path.push([i, j])
  const lcsChars: string[] = []
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      lcsChars.unshift(s1[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
    path.push([i, j])
  }
  const lcs = lcsChars.join('')

  steps.push(mk(dp, [], filled, {
    rowLabels, colLabels,
    result: `LCS = "${lcs}"，长度 = ${dp[m][n]}`,
    path,
    codeLine: 12,
    description: `LCS 完成！最长公共子序列 = "${lcs}"，长度 = ${dp[m][n]}。高亮路径为回溯追踪过程。`,
  }))

  return steps
}

// ============================================================
// 算法配置
// ============================================================
export const dpAlgorithmMeta: Record<string, DpAlgorithmConfig> = {
  fibonacci: {
    name: '斐波那契（动态规划）',
    code: `// 斐波那契数列 — 动态规划（自底向上）
public static int fibonacci(int n) {
    int[] dp = new int[n + 1];
    dp[0] = 0;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}`,
    generate: generateFibSteps,
    timeBest: 'O(n)',
    timeAvg: 'O(n)',
    timeWorst: 'O(n)',
    space: 'O(n)',
  },
  knapsack: {
    name: '0/1 背包问题',
    code: `// 0/1 背包问题 — 动态规划
public static int knapsack(int[] wt, int[] val, int W) {
    int n = wt.length;
    int[][] dp = new int[n + 1][W + 1];
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            if (wt[i - 1] > w) {
                dp[i][w] = dp[i - 1][w];
            } else {
                dp[i][w] = Math.max(
                    dp[i - 1][w],
                    dp[i - 1][w - wt[i - 1]] + val[i - 1]
                );
            }
        }
    }
    return dp[n][W];
}`,
    generate: generateKnapsackSteps,
    timeBest: 'O(n×W)',
    timeAvg: 'O(n×W)',
    timeWorst: 'O(n×W)',
    space: 'O(n×W)',
  },
  lcs: {
    name: '最长公共子序列（LCS）',
    code: `// 最长公共子序列 — 动态规划
public static int lcs(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(
                    dp[i - 1][j], dp[i][j - 1]
                );
            }
        }
    }
    return dp[m][n];
}`,
    generate: generateLcsSteps,
    timeBest: 'O(m×n)',
    timeAvg: 'O(m×n)',
    timeWorst: 'O(m×n)',
    space: 'O(m×n)',
  },
}
