// ============================================================
// graphAlgorithms.ts — 图论算法步骤生成器 + 配置
// 纯逻辑，与 UI 无关，被 GraphVisualizer.vue 导入使用
// ============================================================

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  weight: number
  directed?: boolean
}

export interface SortedEdge {
  from: string
  to: string
  weight: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface GraphStep {
  nodes: GraphNode[]
  edges: GraphEdge[]
  visited: string[]
  current?: string
  queue?: string[]
  stack?: string[]
  distances?: Record<string, number>
  frontier?: string[]
  traversalOrder: string[]
  codeLine: number
  description: string
  // ===== 拓扑排序 / 最小生成树扩展字段（可选，向后兼容） =====
  indegrees?: Record<string, number>
  sortedEdges?: SortedEdge[]
  sets?: string[][]
  candidateEdgeKeys?: string[]
  mstEdgeKeys?: string[]
  rejectedEdgeKeys?: string[]
  currentEdgeKey?: string
  totalWeight?: number
}

export interface GraphAlgorithmConfig {
  name: string
  code: string
  generate: (start?: string) => GraphStep[]
  timeBest: string
  timeAvg: string
  timeWorst: string
  space: string
  weighted: boolean
  directed: boolean
  usesStart?: boolean
}

// ============================================================
// 公共图数据（无向带权图，BFS/DFS 忽略权重）
// ============================================================
export const graphNodes: GraphNode[] = [
  { id: 'A', label: 'A', x: 200, y: 40 },
  { id: 'B', label: 'B', x: 100, y: 120 },
  { id: 'C', label: 'C', x: 300, y: 120 },
  { id: 'D', label: 'D', x: 80, y: 220 },
  { id: 'E', label: 'E', x: 200, y: 180 },
  { id: 'F', label: 'F', x: 320, y: 220 },
  { id: 'G', label: 'G', x: 200, y: 280 },
]

export const graphEdges: GraphEdge[] = [
  { from: 'A', to: 'B', weight: 1 },
  { from: 'A', to: 'C', weight: 4 },
  { from: 'B', to: 'D', weight: 2 },
  { from: 'B', to: 'E', weight: 5 },
  { from: 'C', to: 'E', weight: 1 },
  { from: 'C', to: 'F', weight: 3 },
  { from: 'D', to: 'E', weight: 2 },
  { from: 'E', to: 'F', weight: 1 },
  { from: 'E', to: 'G', weight: 3 },
  { from: 'F', to: 'G', weight: 2 },
]

// 邻接表（无向图）
function buildAdjList(): Record<string, string[]> {
  const adj: Record<string, string[]> = {}
  for (const n of graphNodes) adj[n.id] = []
  for (const e of graphEdges) {
    adj[e.from].push(e.to)
    adj[e.to].push(e.from)
  }
  return adj
}

function mkWith(
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts: {
    visited?: string[]
    current?: string
    queue?: string[]
    stack?: string[]
    distances?: Record<string, number>
    frontier?: string[]
    traversalOrder?: string[]
    codeLine: number
    description: string
    indegrees?: Record<string, number>
    sortedEdges?: SortedEdge[]
    sets?: string[][]
    candidateEdgeKeys?: string[]
    mstEdgeKeys?: string[]
    rejectedEdgeKeys?: string[]
    currentEdgeKey?: string
    totalWeight?: number
  },
): GraphStep {
  return {
    nodes,
    edges,
    visited: opts.visited ? [...opts.visited] : [],
    current: opts.current,
    queue: opts.queue ? [...opts.queue] : undefined,
    stack: opts.stack ? [...opts.stack] : undefined,
    distances: opts.distances ? { ...opts.distances } : undefined,
    frontier: opts.frontier ? [...opts.frontier] : undefined,
    traversalOrder: opts.traversalOrder ? [...opts.traversalOrder] : [],
    codeLine: opts.codeLine,
    description: opts.description,
    indegrees: opts.indegrees ? { ...opts.indegrees } : undefined,
    sortedEdges: opts.sortedEdges ? opts.sortedEdges.map((s) => ({ ...s })) : undefined,
    sets: opts.sets ? opts.sets.map((s) => [...s]) : undefined,
    candidateEdgeKeys: opts.candidateEdgeKeys ? [...opts.candidateEdgeKeys] : undefined,
    mstEdgeKeys: opts.mstEdgeKeys ? [...opts.mstEdgeKeys] : undefined,
    rejectedEdgeKeys: opts.rejectedEdgeKeys ? [...opts.rejectedEdgeKeys] : undefined,
    currentEdgeKey: opts.currentEdgeKey,
    totalWeight: opts.totalWeight,
  }
}

function mk(opts: Parameters<typeof mkWith>[2]): GraphStep {
  return mkWith(graphNodes, graphEdges, opts)
}

// ============================================================
// 1. 广度优先搜索（BFS）
// ============================================================
function generateBfsSteps(start = 'A'): GraphStep[] {
  const steps: GraphStep[] = []
  const adj = buildAdjList()
  const visited = new Set<string>()
  const queue: string[] = []
  const traversalOrder: string[] = []

  steps.push(mk({ codeLine: 1, description: `开始广度优先搜索（BFS），起点为 ${start}` }))
  steps.push(mk({ codeLine: 2, description: '初始化访问集合 visited 和队列 queue' }))

  visited.add(start)
  queue.push(start)
  steps.push(mk({ visited: Array.from(visited), queue, codeLine: 4, description: `将起点 ${start} 标记为已访问并入队` }))

  while (queue.length > 0) {
    const node = queue.shift()!
    traversalOrder.push(node)
    steps.push(mk({ visited: Array.from(visited), queue, current: node, traversalOrder, codeLine: 5, description: `出队节点 ${node}，正在访问` }))

    const neighbors = adj[node].sort()
    for (const neighbor of neighbors) {
      steps.push(mk({ visited: Array.from(visited), queue, current: node, traversalOrder, codeLine: 7, description: `检查邻居 ${neighbor}` }))
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
        steps.push(mk({ visited: Array.from(visited), queue, current: node, traversalOrder, codeLine: 8, description: `${neighbor} 未访问，标记并入队` }))
      } else {
        steps.push(mk({ visited: Array.from(visited), queue, current: node, traversalOrder, codeLine: 9, description: `${neighbor} 已访问，跳过` }))
      }
    }
  }

  steps.push(mk({ visited: Array.from(visited), queue, traversalOrder, codeLine: 11, description: '队列为空，BFS 遍历完成' }))
  return steps
}

// ============================================================
// 2. 深度优先搜索（DFS）
// ============================================================
function generateDfsSteps(start = 'A'): GraphStep[] {
  const steps: GraphStep[] = []
  const adj = buildAdjList()
  const visited = new Set<string>()
  const stack: string[] = []
  const traversalOrder: string[] = []

  steps.push(mk({ codeLine: 1, description: `开始深度优先搜索（DFS），起点为 ${start}` }))
  steps.push(mk({ codeLine: 2, description: '初始化访问集合 visited 和栈 stack' }))

  stack.push(start)
  steps.push(mk({ stack, codeLine: 4, description: `将起点 ${start} 压入栈中` }))

  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node)) {
      steps.push(mk({ visited: Array.from(visited), stack, current: node, traversalOrder, codeLine: 6, description: `${node} 已访问，出栈跳过` }))
      continue
    }
    visited.add(node)
    traversalOrder.push(node)
    steps.push(mk({ visited: Array.from(visited), stack, current: node, traversalOrder, codeLine: 7, description: `出栈并访问节点 ${node}` }))

    const neighbors = adj[node].sort().reverse()
    for (const neighbor of neighbors) {
      steps.push(mk({ visited: Array.from(visited), stack, current: node, traversalOrder, codeLine: 9, description: `检查邻居 ${neighbor}` }))
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
        steps.push(mk({ visited: Array.from(visited), stack, current: node, traversalOrder, codeLine: 10, description: `${neighbor} 未访问，压入栈` }))
      } else {
        steps.push(mk({ visited: Array.from(visited), stack, current: node, traversalOrder, codeLine: 11, description: `${neighbor} 已访问，跳过` }))
      }
    }
  }

  steps.push(mk({ visited: Array.from(visited), stack, traversalOrder, codeLine: 13, description: '栈为空，DFS 遍历完成' }))
  return steps
}

// ============================================================
// 3. Dijkstra 最短路径
// ============================================================
function generateDijkstraSteps(start = 'A'): GraphStep[] {
  const steps: GraphStep[] = []
  const dist: Record<string, number> = {}
  const visited = new Set<string>()
  const traversalOrder: string[] = []

  for (const n of graphNodes) dist[n.id] = Infinity
  dist[start] = 0

  steps.push(mk({ distances: dist, codeLine: 1, description: `开始 Dijkstra 算法，起点为 ${start}` }))
  steps.push(mk({ distances: dist, codeLine: 2, description: `初始化所有节点距离为 ∞，起点 ${start} 距离为 0` }))

  while (visited.size < graphNodes.length) {
    // 选择未访问中距离最小的节点
    let u: string | null = null
    let minDist = Infinity
    for (const n of graphNodes) {
      if (!visited.has(n.id) && dist[n.id] < minDist) {
        minDist = dist[n.id]
        u = n.id
      }
    }

    if (u === null || minDist === Infinity) {
      steps.push(mk({ visited: Array.from(visited), distances: dist, traversalOrder, codeLine: 5, description: '剩余未访问节点均不可达，算法结束' }))
      break
    }

    visited.add(u)
    traversalOrder.push(u)
    steps.push(mk({ visited: Array.from(visited), distances: dist, current: u, traversalOrder, codeLine: 5, description: `选择距离最小的未访问节点 ${u}，当前距离 ${minDist}` }))

    // 松弛邻边
    for (const e of graphEdges) {
      let v: string | null = null
      if (e.from === u) v = e.to
      else if (e.to === u) v = e.from
      if (!v || visited.has(v)) continue

      steps.push(mk({ visited: Array.from(visited), distances: dist, current: u, traversalOrder, codeLine: 7, description: `检查边 ${u}-${v}，权重 ${e.weight}` }))
      const newDist = dist[u] + e.weight
      const oldDist = dist[v]
      if (newDist < dist[v]) {
        dist[v] = newDist
        steps.push(mk({ visited: Array.from(visited), distances: dist, current: u, traversalOrder, codeLine: 8, description: `dist[${v}] 从 ${oldDist === Infinity ? '∞' : oldDist} 更新为 ${newDist}` }))
      } else {
        steps.push(mk({ visited: Array.from(visited), distances: dist, current: u, traversalOrder, codeLine: 9, description: `dist[${v}] = ${dist[v] === Infinity ? '∞' : dist[v]} 不需要更新` }))
      }
    }
  }

  steps.push(mk({ visited: Array.from(visited), distances: dist, traversalOrder, codeLine: 11, description: '所有节点已确定最短距离，算法完成' }))
  return steps
}

// ============================================================
// 4. 拓扑排序（Kahn 入度法）— 专用有向无环图
// ============================================================
export const topoNodes: GraphNode[] = graphNodes

export const topoEdges: GraphEdge[] = [
  { from: 'A', to: 'B', weight: 0, directed: true },
  { from: 'A', to: 'C', weight: 0, directed: true },
  { from: 'B', to: 'D', weight: 0, directed: true },
  { from: 'C', to: 'E', weight: 0, directed: true },
  { from: 'B', to: 'E', weight: 0, directed: true },
  { from: 'D', to: 'F', weight: 0, directed: true },
  { from: 'E', to: 'F', weight: 0, directed: true },
  { from: 'F', to: 'G', weight: 0, directed: true },
]

function edgeKey(e: GraphEdge): string {
  return `${e.from}-${e.to}`
}

function buildIndegrees(nodes: GraphNode[], edges: GraphEdge[]): Record<string, number> {
  const ind: Record<string, number> = {}
  for (const n of nodes) ind[n.id] = 0
  for (const e of edges) ind[e.to]++
  return ind
}

function generateTopoSortSteps(): GraphStep[] {
  const steps: GraphStep[] = []
  const adj: Record<string, string[]> = {}
  for (const n of topoNodes) adj[n.id] = []
  for (const e of topoEdges) adj[e.from].push(e.to)

  const indegree = buildIndegrees(topoNodes, topoEdges)
  const queue: string[] = []
  const result: string[] = []

  steps.push(mkWith(topoNodes, topoEdges, {
    indegrees: indegree,
    codeLine: 8,
    description: '统计入度：A 无前置（入度 0），E、F 各有两个前置（入度 2）',
  }))

  for (const n of topoNodes) {
    if (indegree[n.id] === 0) queue.push(n.id)
  }
  steps.push(mkWith(topoNodes, topoEdges, {
    indegrees: indegree,
    queue,
    codeLine: 14,
    description: `入度为 0 的节点 ${queue.join('、')} 入队（它们没有任何前置任务）`,
  }))

  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    steps.push(mkWith(topoNodes, topoEdges, {
      indegrees: indegree,
      queue,
      current: node,
      visited: [...result],
      traversalOrder: result,
      codeLine: 20,
      description: `出队 ${node}，加入输出序列（已输出 ${result.length}/${topoNodes.length}）`,
    }))

    for (const next of adj[node]) {
      indegree[next]--
      if (indegree[next] === 0) {
        queue.push(next)
        steps.push(mkWith(topoNodes, topoEdges, {
          indegrees: indegree,
          queue,
          current: node,
          visited: [...result],
          traversalOrder: result,
          codeLine: 24,
          description: `边 ${node}→${next}：入度减为 0，${next} 入队`,
        }))
      } else {
        steps.push(mkWith(topoNodes, topoEdges, {
          indegrees: indegree,
          queue,
          current: node,
          visited: [...result],
          traversalOrder: result,
          codeLine: 22,
          description: `边 ${node}→${next}：入度减为 ${indegree[next]}，仍大于 0，暂不入队`,
        }))
      }
    }
  }

  steps.push(mkWith(topoNodes, topoEdges, {
    indegrees: indegree,
    queue,
    visited: [...result],
    traversalOrder: result,
    codeLine: 31,
    description: `队列为空，拓扑排序完成：${result.join(' → ')}。输出 ${result.length} 个节点 = 总数，说明无环；若小于总数则图中有环`,
  }))

  return steps
}

// ============================================================
// 5. Prim 最小生成树（生长树 + 最小横切边）
// ============================================================
function generatePrimSteps(start = 'A'): GraphStep[] {
  const steps: GraphStep[] = []
  const inTree = new Set<string>([start])
  const mstKeys: string[] = []
  const candidateKeys: string[] = []
  let total = 0

  // 横切边 = 恰好一端在树内的边
  const refreshCandidates = () => {
    candidateKeys.length = 0
    for (const e of graphEdges) {
      if (inTree.has(e.from) !== inTree.has(e.to)) candidateKeys.push(edgeKey(e))
    }
  }

  refreshCandidates()
  steps.push(mk({
    visited: [start],
    mstEdgeKeys: mstKeys,
    candidateEdgeKeys: candidateKeys,
    totalWeight: total,
    codeLine: 6,
    description: `初始化：树 = {${start}}，候选边为 ${start} 的全部邻边，MST 为空、总权重 0`,
  }))

  while (inTree.size < graphNodes.length) {
    const candidates = graphEdges.filter((e) => candidateKeys.includes(edgeKey(e)))
    let best = candidates[0]
    for (const e of candidates) {
      if (e.weight < best.weight) best = e
    }
    const key = edgeKey(best)
    steps.push(mk({
      visited: Array.from(inTree),
      mstEdgeKeys: mstKeys,
      candidateEdgeKeys: candidateKeys,
      currentEdgeKey: key,
      totalWeight: total,
      codeLine: 14,
      description: `选权重最小的横切边 ${key}（权重 ${best.weight}）`,
    }))

    const nextNode = inTree.has(best.from) ? best.to : best.from
    inTree.add(nextNode)
    mstKeys.push(key)
    total += best.weight
    refreshCandidates()
    steps.push(mk({
      visited: Array.from(inTree),
      mstEdgeKeys: mstKeys,
      candidateEdgeKeys: candidateKeys,
      currentEdgeKey: key,
      totalWeight: total,
      codeLine: 18,
      description: `${key} 加入 MST（总权重 ${total}），节点 ${nextNode} 入树；候选边更新为 ${candidateKeys.length} 条`,
    }))
  }

  steps.push(mk({
    visited: Array.from(inTree),
    mstEdgeKeys: mstKeys,
    candidateEdgeKeys: [],
    totalWeight: total,
    codeLine: 26,
    description: `全部节点入树，Prim 完成：${mstKeys.length} 条边 = V−1，总权重 ${total}；候选边始终只连接「树内—树外」`,
  }))

  return steps
}

// ============================================================
// 6. Kruskal 最小生成树（边排序 + 并查集防环）
// ============================================================
function generateKruskalSteps(): GraphStep[] {
  const steps: GraphStep[] = []
  const sorted = [...graphEdges].sort((a, b) => a.weight - b.weight)
  const parent: Record<string, string> = {}
  for (const n of graphNodes) parent[n.id] = n.id

  const find = (x: string): string => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }

  const setsOf = (): string[][] => {
    const groups: Record<string, string[]> = {}
    for (const n of graphNodes) {
      const r = find(n.id)
      if (!groups[r]) groups[r] = []
      groups[r].push(n.id)
    }
    return Object.values(groups)
  }

  const statuses: SortedEdge[] = sorted.map((e) => ({
    from: e.from,
    to: e.to,
    weight: e.weight,
    status: 'pending' as const,
  }))
  const mstKeys: string[] = []
  const rejectedKeys: string[] = []
  let total = 0

  const base = () => ({
    sets: setsOf(),
    sortedEdges: statuses,
    mstEdgeKeys: mstKeys,
    rejectedEdgeKeys: rejectedKeys,
    totalWeight: total,
  })

  steps.push(mk({ ...base(), codeLine: 4, description: '初始化：7 个节点各自为独立集合（并查集），MST 与拒绝集为空' }))

  steps.push(mk({
    ...base(),
    codeLine: 6,
    description: `10 条边按权重升序排列：${sorted.map((e) => `${e.from}-${e.to}(${e.weight})`).join(' · ')}`,
  }))

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const key = edgeKey(e)
    const ru = find(e.from)
    const rv = find(e.to)

    if (ru !== rv) {
      steps.push(mk({
        ...base(),
        currentEdgeKey: key,
        codeLine: 10,
        description: `检查 ${key}：find(${e.from})=${ru}，find(${e.to})=${rv}，两端不在同一集合`,
      }))
      parent[ru] = rv
      mstKeys.push(key)
      total += e.weight
      statuses[i] = { ...statuses[i], status: 'accepted' }
      const full = mstKeys.length === graphNodes.length - 1
      steps.push(mk({
        ...base(),
        currentEdgeKey: key,
        codeLine: 13,
        description: `${key} 接受：合并集合，MST 共 ${mstKeys.length} 条边、总权重 ${total}${full ? '；已选满 V−1 条，标准实现可提前结束，这里继续扫描剩余边演示成环拒绝' : ''}`,
      }))
    } else {
      rejectedKeys.push(key)
      statuses[i] = { ...statuses[i], status: 'rejected' }
      steps.push(mk({
        ...base(),
        currentEdgeKey: key,
        codeLine: 12,
        description: `检查 ${key}：find(${e.from}) = find(${e.to}) = ${ru}，两端已连通，加入会成环，拒绝`,
      }))
    }
  }

  steps.push(mk({
    ...base(),
    codeLine: 21,
    description: `扫描完成：MST ${mstKeys.length} 条边、总权重 ${total}、拒绝 ${rejectedKeys.length} 条成环边`,
  }))

  return steps
}

// ============================================================
// 算法配置
// ============================================================
export const graphAlgorithmMeta: Record<string, GraphAlgorithmConfig> = {
  bfs: {
    name: '广度优先搜索（BFS）',
    code: `public static void bfs(Map<String, List<String>> graph, String start) {
    Set<String> visited = new HashSet<>();
    Queue<String> queue = new LinkedList<>();
    visited.add(start);
    queue.offer(start);
    while (!queue.isEmpty()) {
        String node = queue.poll();
        for (String neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.offer(neighbor);
            }
        }
    }
}`,
    generate: generateBfsSteps,
    timeBest: 'O(V+E)',
    timeAvg: 'O(V+E)',
    timeWorst: 'O(V+E)',
    space: 'O(V)',
    weighted: false,
    directed: false,
  },
  dfs: {
    name: '深度优先搜索（DFS）',
    code: `public static void dfs(Map<String, List<String>> graph, String start) {
    Set<String> visited = new HashSet<>();
    Stack<String> stack = new Stack<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        String node = stack.pop();
        if (visited.contains(node)) continue;
        visited.add(node);
        for (String neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                stack.push(neighbor);
            }
        }
    }
}`,
    generate: generateDfsSteps,
    timeBest: 'O(V+E)',
    timeAvg: 'O(V+E)',
    timeWorst: 'O(V+E)',
    space: 'O(V)',
    weighted: false,
    directed: false,
  },
  dijkstra: {
    name: 'Dijkstra 最短路径',
    code: `public static Map<String, Integer> dijkstra(Map<String, List<Edge>> graph, String start) {
    Map<String, Integer> dist = new HashMap<>();
    for (String node : graph.keySet()) {
        dist.put(node, Integer.MAX_VALUE);
    }
    dist.put(start, 0);
    Set<String> visited = new HashSet<>();
    while (visited.size() < graph.size()) {
        String u = minDistanceNode(dist, visited);
        if (u == null) break;
        visited.add(u);
        for (Edge e : graph.get(u)) {
            String v = e.to;
            int newDist = dist.get(u) + e.weight;
            if (newDist < dist.get(v)) {
                dist.put(v, newDist);
            }
        }
    }
    return dist;
}`,
    generate: generateDijkstraSteps,
    timeBest: 'O(V²)',
    timeAvg: 'O(V²)',
    timeWorst: 'O(V²)',
    space: 'O(V)',
    weighted: true,
    directed: false,
  },
  'topological-sort': {
    name: '拓扑排序（Kahn）',
    code: `public static List<String> topologicalSort(Map<String, List<String>> graph) {
    Map<String, Integer> indegree = new HashMap<>();
    for (String node : graph.keySet()) {
        indegree.putIfAbsent(node, 0);
    }
    for (String node : graph.keySet()) {
        for (String next : graph.get(node)) {
            indegree.merge(next, 1, Integer::sum);
        }
    }
    Queue<String> queue = new LinkedList<>();
    for (String node : indegree.keySet()) {
        if (indegree.get(node) == 0) {
            queue.offer(node);
        }
    }
    List<String> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        String node = queue.poll();
        order.add(node);
        for (String next : graph.get(node)) {
            indegree.merge(next, -1, Integer::sum);
            if (indegree.get(next) == 0) {
                queue.offer(next);
            }
        }
    }
    if (order.size() < indegree.size()) {
        throw new IllegalStateException("图中存在环");
    }
    return order;
}`,
    generate: generateTopoSortSteps,
    timeBest: 'O(V+E)',
    timeAvg: 'O(V+E)',
    timeWorst: 'O(V+E)',
    space: 'O(V)',
    weighted: false,
    directed: true,
    usesStart: false,
  },
  prim: {
    name: 'Prim 最小生成树',
    code: `public static int prim(int[][] weight, int start) {
    int n = weight.length;
    boolean[] inTree = new boolean[n];
    int[] lowcost = new int[n];
    for (int i = 0; i < n; i++) {
        lowcost[i] = weight[start][i];
    }
    inTree[start] = true;
    int total = 0;
    for (int k = 1; k < n; k++) {
        int u = -1, min = Integer.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            if (!inTree[i] && lowcost[i] < min) {
                min = lowcost[i];
                u = i;
            }
        }
        inTree[u] = true;
        total += min;
        for (int i = 0; i < n; i++) {
            if (!inTree[i] && weight[u][i] < lowcost[i]) {
                lowcost[i] = weight[u][i];
            }
        }
    }
    return total;
}`,
    generate: generatePrimSteps,
    timeBest: 'O(V²)',
    timeAvg: 'O(V²)',
    timeWorst: 'O(V²)',
    space: 'O(V)',
    weighted: true,
    directed: false,
  },
  kruskal: {
    name: 'Kruskal 最小生成树',
    code: `public static List<Edge> kruskal(int n, List<Edge> edges) {
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    edges.sort(Comparator.comparingInt(e -> e.weight));
    List<Edge> mst = new ArrayList<>();
    int total = 0;
    for (Edge e : edges) {
        int ru = find(parent, e.from);
        int rv = find(parent, e.to);
        if (ru != rv) {
            parent[ru] = rv;
            mst.add(e);
            total += e.weight;
            if (mst.size() == n - 1) {
                break;
            }
        }
    }
    return mst;
}

static int find(int[] parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}`,
    generate: generateKruskalSteps,
    timeBest: 'O(E log E)',
    timeAvg: 'O(E log E)',
    timeWorst: 'O(E log E)',
    space: 'O(V)',
    weighted: true,
    directed: false,
    usesStart: false,
  },
}
