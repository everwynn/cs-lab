// ============================================================
// backtrackingAlgorithms.ts — 回溯算法步骤生成器 + 配置
// 纯逻辑，与 UI 无关，被 BacktrackingVisualizer.vue 导入使用
// ============================================================

export interface BacktrackStep {
  board: number[][]
  row?: number
  col?: number
  isValid?: boolean
  backtracking?: boolean
  placed?: boolean
  queens?: [number, number][]
  fixed?: boolean[][]
  codeLine: number
  description: string
}

export interface BacktrackAlgorithmConfig {
  name: string
  code: string
  generate: () => BacktrackStep[]
  timeBest: string
  timeAvg: string
  timeWorst: string
  space: string
}

function mkBoard(n: number, fill = 0): number[][] {
  return Array.from({ length: n }, () => new Array(n).fill(fill))
}

function cloneBoard(b: number[][]): number[][] {
  return b.map(row => [...row])
}

function mk(
  board: number[][],
  opts: {
    row?: number
    col?: number
    isValid?: boolean
    backtracking?: boolean
    placed?: boolean
    queens?: [number, number][]
    fixed?: boolean[][]
    codeLine: number
    description: string
  },
): BacktrackStep {
  return {
    board: cloneBoard(board),
    row: opts.row,
    col: opts.col,
    isValid: opts.isValid,
    backtracking: opts.backtracking,
    placed: opts.placed,
    queens: opts.queens?.map(q => [q[0], q[1]] as [number, number]),
    fixed: opts.fixed?.map(row => [...row]),
    codeLine: opts.codeLine,
    description: opts.description,
  }
}

// ============================================================
// 1. N 皇后（4 皇后）
// ============================================================
function generateNQueensSteps(): BacktrackStep[] {
  const steps: BacktrackStep[] = []
  const n = 4
  const board = mkBoard(n)
  const queens: [number, number][] = []

  function isSafe(row: number, col: number): boolean {
    for (const [r, c] of queens) {
      if (c === col) return false
      if (Math.abs(r - row) === Math.abs(c - col)) return false
    }
    return true
  }

  function solve(row: number): boolean {
    if (row === n) {
      steps.push(mk(board, {
        queens: [...queens],
        codeLine: 2,
        description: `所有 ${n} 个皇后都已成功放置！找到一个解。`,
      }))
      return true
    }

    steps.push(mk(board, {
      row,
      queens: [...queens],
      codeLine: 3,
      description: `第 ${row + 1} 行：尝试在每一列放置皇后`,
    }))

    for (let col = 0; col < n; col++) {
      steps.push(mk(board, {
        row, col,
        queens: [...queens],
        codeLine: 4,
        description: `检查位置 (${row}, ${col})：尝试放置皇后`,
      }))

      const safe = isSafe(row, col)
      if (safe) {
        board[row][col] = 1
        queens.push([row, col])
        steps.push(mk(board, {
          row, col,
          isValid: true,
          placed: true,
          queens: [...queens],
          codeLine: 6,
          description: `(${row}, ${col}) 安全！放置皇后 ♛，当前共 ${queens.length} 个`,
        }))

        if (solve(row + 1)) return true

        // 回溯
        queens.pop()
        board[row][col] = 0
        steps.push(mk(board, {
          row, col,
          backtracking: true,
          queens: [...queens],
          codeLine: 8,
          description: `第 ${row + 1} 行无解，回溯：移除 (${row}, ${col}) 的皇后`,
        }))
      } else {
        steps.push(mk(board, {
          row, col,
          isValid: false,
          queens: [...queens],
          codeLine: 5,
          description: `(${row}, ${col}) 不安全（与已有皇后冲突），跳过`,
        }))
      }
    }

    steps.push(mk(board, {
      row,
      backtracking: true,
      queens: [...queens],
      codeLine: 10,
      description: `第 ${row + 1} 行所有列都尝试过，均不可放置，回溯到上一行`,
    }))
    return false
  }

  steps.push(mk(board, {
    queens: [],
    codeLine: 1,
    description: `${n} 皇后问题：在 ${n}×${n} 棋盘上放置 ${n} 个皇后，使任意两个不在同一行、列、对角线`,
  }))

  solve(0)

  return steps
}

// ============================================================
// 2. 数独求解（4×4 简化版，适合可视化）
// ============================================================
function generateSudokuSteps(): BacktrackStep[] {
  const steps: BacktrackStep[] = []

  // 4x4 数独，0 表示空格
  const initial = [
    [1, 0, 0, 4],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [4, 0, 0, 1],
  ]
  const n = 4
  const boxSize = 2
  const board = cloneBoard(initial)

  // 标记固定（题目给出）的格子
  const fixed: boolean[][] = initial.map(row => row.map(v => v !== 0))

  function isValidPlacement(row: number, col: number, num: number): boolean {
    // 检查行
    for (let c = 0; c < n; c++) {
      if (c !== col && board[row][c] === num) return false
    }
    // 检查列
    for (let r = 0; r < n; r++) {
      if (r !== row && board[r][col] === num) return false
    }
    // 检查 2x2 宫格
    const boxRow = Math.floor(row / boxSize) * boxSize
    const boxCol = Math.floor(col / boxSize) * boxSize
    for (let r = boxRow; r < boxRow + boxSize; r++) {
      for (let c = boxCol; c < boxCol + boxSize; c++) {
        if (r !== row && c !== col && board[r][c] === num) return false
      }
    }
    return true
  }

  function findEmpty(): [number, number] | null {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === 0) return [r, c]
      }
    }
    return null
  }

  function solve(): boolean {
    const empty = findEmpty()
    if (!empty) {
      steps.push(mk(board, {
        fixed,
        codeLine: 2,
        description: '所有空格已填满，数独求解完成！',
      }))
      return true
    }

    const [row, col] = empty
    steps.push(mk(board, {
      row, col,
      fixed,
      codeLine: 4,
      description: `找到空格 (${row}, ${col})，尝试填入 1~${n}`,
    }))

    for (let num = 1; num <= n; num++) {
      steps.push(mk(board, {
        row, col,
        fixed,
        codeLine: 5,
        description: `尝试在 (${row}, ${col}) 填入 ${num}`,
      }))

      const valid = isValidPlacement(row, col, num)
      if (valid) {
        board[row][col] = num
        steps.push(mk(board, {
          row, col,
          isValid: true,
          placed: true,
          fixed,
          codeLine: 7,
          description: `${num} 在 (${row}, ${col}) 合法，放置成功`,
        }))

        if (solve()) return true

        // 回溯
        board[row][col] = 0
        steps.push(mk(board, {
          row, col,
          backtracking: true,
          fixed,
          codeLine: 9,
          description: `后续无解，回溯：移除 (${row}, ${col}) 的 ${num}`,
        }))
      } else {
        steps.push(mk(board, {
          row, col,
          isValid: false,
          fixed,
          codeLine: 6,
          description: `${num} 在 (${row}, ${col}) 不合法（行/列/宫格冲突），跳过`,
        }))
      }
    }

    steps.push(mk(board, {
      row, col,
      backtracking: true,
      fixed,
      codeLine: 11,
      description: `(${row}, ${col}) 尝试了 1~${n} 都不行，回溯到上一格`,
    }))
    return false
  }

  steps.push(mk(board, {
    fixed,
    codeLine: 1,
    description: '4×4 数独求解：在空格中填入 1~4，使每行、每列、每个 2×2 宫格都包含 1~4',
  }))

  steps.push(mk(board, {
    fixed,
    codeLine: 1,
    description: `初始棋盘：${fixed.flat().filter(v => v).length} 个已知数字，${n * n - fixed.flat().filter(v => v).length} 个空格待填`,
  }))

  solve()
  return steps
}

// ============================================================
// 算法配置
// ============================================================
export const backtrackAlgorithmMeta: Record<string, BacktrackAlgorithmConfig> = {
  nQueens: {
    name: 'N 皇后（4 皇后）',
    code: `// N 皇后问题 — 回溯法
public static void solveNQueens(int n) {
    int[] queens = new int[n];
    Arrays.fill(queens, -1);
    solve(queens, 0, n);
}

private static void solve(int[] queens, int row, int n) {
    if (row == n) {
        printSolution(queens);
        return;
    }
    for (int col = 0; col < n; col++) {
        if (isSafe(queens, row, col)) {
            queens[row] = col;
            solve(queens, row + 1, n);
            queens[row] = -1; // 回溯
        }
    }
}`,
    generate: generateNQueensSteps,
    timeBest: 'O(n!)',
    timeAvg: 'O(n!)',
    timeWorst: 'O(n!)',
    space: 'O(n)',
  },
  sudoku: {
    name: '数独求解（4×4）',
    code: `// 数独求解 — 回溯法
public static boolean solveSudoku(int[][] board) {
    int[] empty = findEmpty(board);
    if (empty == null) return true;
    int row = empty[0], col = empty[1];
    for (int num = 1; num <= 4; num++) {
        if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = 0; // 回溯
        }
    }
    return false;
}`,
    generate: generateSudokuSteps,
    timeBest: 'O(1)',
    timeAvg: 'O(n^(n²))',
    timeWorst: 'O(n^(n²))',
    space: 'O(n²)',
  },
}
