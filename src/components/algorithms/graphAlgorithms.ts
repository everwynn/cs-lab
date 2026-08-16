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

function mk(
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
  },
): GraphStep {
  return {
    nodes: graphNodes,
    edges: graphEdges,
    visited: opts.visited ? [...opts.visited] : [],
    current: opts.current,
    queue: opts.queue ? [...opts.queue] : undefined,
    stack: opts.stack ? [...opts.stack] : undefined,
    distances: opts.distances ? { ...opts.distances } : undefined,
    frontier: opts.frontier ? [...opts.frontier] : undefined,
    traversalOrder: opts.traversalOrder ? [...opts.traversalOrder] : [],
    codeLine: opts.codeLine,
    description: opts.description,
  }
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
}
