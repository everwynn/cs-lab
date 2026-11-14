/**
 * 算法分类导航数据（单一数据源）
 *
 * - 列表页（/algorithms）用它渲染分类筛选与卡片
 * - AlgorithmNav.astro 用它计算同分类「上一页 / 下一页」
 *
 * 新增算法时只需在此处补一条记录并创建对应页面。
 */

export interface Algorithm {
  name: string;
  slug: string;
  complexity: string;
  available: boolean;
  desc: string;
  stable?: boolean;
  requiresSorted?: boolean;
  weighted?: boolean;
  directed?: boolean;
}

export interface AlgorithmCategory {
  name: string;
  icon: string;
  description: string;
  algorithms: Algorithm[];
}

export const categories: AlgorithmCategory[] = [
  {
    name: '排序算法',
    icon: '🔀',
    description: '可视化展示各种排序算法的执行过程，理解比较与交换的原理',
    algorithms: [
      { name: '冒泡排序', slug: 'sorting/bubble-sort', complexity: 'O(n²)', stable: true, available: true, desc: '相邻比较，逐步冒泡最大值到末尾' },
      { name: '选择排序', slug: 'sorting/selection-sort', complexity: 'O(n²)', stable: false, available: true, desc: '每轮选出最小值放到已排序末尾' },
      { name: '插入排序', slug: 'sorting/insertion-sort', complexity: 'O(n²)', stable: true, available: true, desc: '逐个插入到已排序序列的正确位置' },
      { name: '快速排序', slug: 'sorting/quick-sort', complexity: 'O(n log n)', stable: false, available: true, desc: '分治法，选取基准元素分区排序' },
      { name: '归并排序', slug: 'sorting/merge-sort', complexity: 'O(n log n)', stable: true, available: true, desc: '分治法，合并两个有序子序列' },
      { name: '堆排序', slug: 'sorting/heap-sort', complexity: 'O(n log n)', stable: false, available: true, desc: '利用堆数据结构进行排序' },
      { name: '希尔排序', slug: 'sorting/shell-sort', complexity: 'O(n^1.3)', stable: false, available: true, desc: '按增量分组进行插入排序' },
      { name: '计数排序', slug: 'sorting/counting-sort', complexity: 'O(n+k)', stable: true, available: true, desc: '非比较排序，适用于整数范围已知' },
    ],
  },
  {
    name: '搜索算法',
    icon: '🔍',
    description: '在数据结构中查找目标元素的各种算法',
    algorithms: [
      { name: '线性查找', slug: 'searching/linear-search', complexity: 'O(n)', available: true, requiresSorted: false, desc: '逐个遍历比较查找' },
      { name: '二分查找', slug: 'searching/binary-search', complexity: 'O(log n)', available: true, requiresSorted: true, desc: '在有序数组中折半查找' },
      { name: '哈希查找', slug: 'searching/hash-search', complexity: 'O(1)', available: true, requiresSorted: false, desc: '利用哈希表实现 O(1) 查找' },
    ],
  },
  {
    name: '图论算法',
    icon: '🕸️',
    description: '图的遍历、最短路径、最小生成树等经典算法',
    algorithms: [
      { name: '广度优先搜索 (BFS)', slug: 'graph/bfs', complexity: 'O(V+E)', available: true, weighted: false, directed: false, desc: '逐层遍历图的节点' },
      { name: '深度优先搜索 (DFS)', slug: 'graph/dfs', complexity: 'O(V+E)', available: true, weighted: false, directed: false, desc: '沿分支深入遍历图的节点' },
      { name: 'Dijkstra 最短路径', slug: 'graph/dijkstra', complexity: 'O(V²)', available: true, weighted: true, directed: false, desc: '单源最短路径算法' },
      { name: '拓扑排序 (Kahn)', slug: 'graph/topological-sort', complexity: 'O(V+E)', available: true, weighted: false, directed: true, desc: '入度归零入队，DAG 线性排序' },
      { name: 'Prim 最小生成树', slug: 'graph/prim', complexity: 'O(V²)', available: true, weighted: true, directed: false, desc: '从起点生长，每次选最小横切边' },
      { name: 'Kruskal 最小生成树', slug: 'graph/kruskal', complexity: 'O(E log E)', available: true, weighted: true, directed: false, desc: '边按权重排序，并查集避免成环' },
    ],
  },
  {
    name: '动态规划',
    icon: '📐',
    description: '通过状态转移方程逐步求解最优解，展示 DP 表格填充过程',
    algorithms: [
      { name: '斐波那契（记忆化）', slug: 'dp/fibonacci', complexity: 'O(n)', available: true, desc: '一维 DP 表格，展示递归→记忆化的优化过程' },
      { name: '0/1 背包', slug: 'dp/knapsack', complexity: 'O(nW)', available: true, desc: '二维 DP 表格，展示选/不选物品的决策过程' },
      { name: '最长公共子序列 (LCS)', slug: 'dp/lcs', complexity: 'O(mn)', available: true, desc: '二维 DP 表格 + 回溯路径，找出最长公共子序列' },
    ],
  },
  {
    name: '回溯法',
    icon: '🔙',
    description: 'DFS + 剪枝，系统搜索解空间，冲突时自动回退',
    algorithms: [
      { name: 'N 皇后（4 皇后）', slug: 'backtracking/n-queens', complexity: 'O(n!)', available: true, desc: '4×4 棋盘放置皇后，冲突回溯' },
      { name: '数独求解（4×4）', slug: 'backtracking/sudoku', complexity: 'O(n^(n²))', available: true, desc: '4×4 数独逐格填入，冲突回溯' },
    ],
  },
];

export interface AlgorithmNeighbors {
  category: { name: string; icon: string };
  /** 当前算法在分类内的序号（从 0 开始） */
  index: number;
  total: number;
  prev: Algorithm | null;
  next: Algorithm | null;
}

/**
 * 根据 slug（如 'graph/prim'）查找同分类前后算法。
 * 非算法详情页或 slug 不存在时返回 null。
 */
export function findAlgorithmNeighbors(slug: string): AlgorithmNeighbors | null {
  for (const category of categories) {
    const index = category.algorithms.findIndex((a) => a.slug === slug);
    if (index !== -1) {
      return {
        category: { name: category.name, icon: category.icon },
        index,
        total: category.algorithms.length,
        prev: index > 0 ? category.algorithms[index - 1] : null,
        next: index < category.algorithms.length - 1 ? category.algorithms[index + 1] : null,
      };
    }
  }
  return null;
}
