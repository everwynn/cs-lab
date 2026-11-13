// ============================================================
// consistentHashingDefinition.ts — 一致性哈希：哈希环 + 虚拟节点
// 演示主线：A/B/C 三节点 → 5 个 key 全部落在 A（严重倾斜）
// → 每个节点补虚拟节点 → 负载差降到 1
// → 扩容加入 D，只有落在相邻区间的一个 key 迁移（1/5）。
// ============================================================

export interface HashRingNode {
  id: string
  label: string
  angle: number // 0..359
  vnodeOf: string | null // 非 null 表示是某个物理节点的虚拟节点
}

export interface HashRingKey {
  id: string
  label: string
  angle: number
  owner: string | null
  migrating: boolean
}

export interface HashRingState {
  nodes: HashRingNode[]
  keys: HashRingKey[]
  ownerCounts: Record<string, number>
  scanningKeyId: string | null
  highlightArc: { from: number; to: number; label: string } | null
  message: string | null
}

export interface HashRingStep {
  description: string
  codeLine: number
  state: HashRingState
}

export interface ConsistentHashingDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => HashRingStep[]
}

const code = `class HashRing {
    TreeMap<Long, Node> ring = new TreeMap<>();  // 有序环：hash → 节点
    int replica = 3;                            // 每个物理节点的虚拟节点数

    void add(Node node) {
        for (int i = 0; i < replica; i++) {
            long h = hash(node.name + "#" + i); // 虚拟节点各自取哈希
            ring.put(h, node);
        }
    }

    Node getNode(String key) {
        long h = hash(key);
        Map.Entry<Long, Node> e = ring.ceilingEntry(h); // 顺时针第一个点
        if (e == null) e = ring.firstEntry();           // 越过末端就绕回起点
        return e.getValue();
    }

    // 扩容：新节点只接管逆时针方向上的一小段区间
    void rebalance(Node newNode) {
        add(newNode);
        // 只有落在 (前一个点, newNode] 区间内的 key 需要迁移，
        // 其余 key 的归属完全不变 —— 迁移量约 1/(N+1)
    }
}`

const PHYSICAL_ANGLES: Record<string, number> = { A: 30, B: 150, C: 270, D: 60 }
const VNODE_ANGLES: Record<string, number[]> = {
  A: [290, 350],
  B: [310, 340],
  C: [20, 330],
  D: [327, 90, 180],
}
const KEYS: Array<{ label: string; angle: number }> = [
  { label: 'k1', angle: 295 },
  { label: 'k2', angle: 310 },
  { label: 'k3', angle: 325 },
  { label: 'k4', angle: 345 },
  { label: 'k5', angle: 15 },
]

function generateSteps(): HashRingStep[] {
  const steps: HashRingStep[] = []
  const state: HashRingState = {
    nodes: [],
    keys: [],
    ownerCounts: {},
    scanningKeyId: null,
    highlightArc: null,
    message: null,
  }

  const snapshot = (): HashRingState => ({
    nodes: state.nodes.map((node) => ({ ...node })),
    keys: state.keys.map((key) => ({ ...key })),
    ownerCounts: { ...state.ownerCounts },
    scanningKeyId: state.scanningKeyId,
    highlightArc: state.highlightArc ? { ...state.highlightArc } : null,
    message: state.message,
  })

  const push = (description: string, codeLine: number, patch: Partial<HashRingState> = {}) => {
    Object.assign(state, patch)
    const activeKeys = state.keys.filter((key) => key.owner)
    const counts: Record<string, number> = {}
    for (const node of state.nodes) {
      if (!node.vnodeOf) counts[node.id] = 0
    }
    for (const key of activeKeys) {
      if (key.owner) counts[key.owner] = (counts[key.owner] ?? 0) + 1
    }
    state.ownerCounts = counts
    steps.push({ description, codeLine, state: snapshot() })
  }

  // 顺时针查找：返回最近的下一个点（含绕回）
  const clockwisePoint = (angle: number): HashRingNode | null => {
    if (state.nodes.length === 0) return null
    const sorted = [...state.nodes].sort((a, b) => a.angle - b.angle)
    const hit = sorted.find((node) => node.angle >= angle)
    const target = hit ?? sorted[0]
    return target
  }

  // 步骤 1：空环
  push('空的一致性哈希环：0°..359° 首尾相接。没有任何节点时，所有 key 都无处可去。', 1)

  // 步骤 2-4：加入 A/B/C
  const addPhysical = (id: string, angle: number, codeLine: number) => {
    state.nodes = [...state.nodes, { id, label: id, angle, vnodeOf: null }]
    push(`加入物理节点 ${id}，哈希后落在环上 ${angle}°。现在环被切成 ${state.nodes.length} 段。`, codeLine)
  }
  addPhysical('A', PHYSICAL_ANGLES.A, 5)
  addPhysical('B', PHYSICAL_ANGLES.B, 8)
  addPhysical('C', PHYSICAL_ANGLES.C, 8)

  // 步骤 5-9：逐个插入 key（全部落在 A 的区间上）
  for (const item of KEYS) {
    const point = clockwisePoint(item.angle)
    const owner = point?.id ?? null
    const wraps = point ? point.angle < item.angle : false
    state.keys = [
      ...state.keys,
      { id: item.label, label: item.label, angle: item.angle, owner, migrating: false },
    ]
    push(
      `插入 ${item.label}（${item.angle}°）：从 key 沿顺时针找到第一个节点 ${owner}（${point?.angle}°）${wraps ? '，越过环末端后绕回起点' : ''}，归属 ${owner}。`,
      wraps ? 15 : 14,
      {
        scanningKeyId: item.label,
        highlightArc: point ? { from: item.angle, to: point.angle, label: `${item.label} → ${owner}` } : null,
      },
    )
  }

  // 步骤 10：负载统计
  const simpleCounts = { ...state.ownerCounts }
  push(
    `统计负载：A=${simpleCounts.A ?? 0}，B=${simpleCounts.B ?? 0}，C=${simpleCounts.C ?? 0}。5 个 key 全部压在 A 上 —— 只有 3 个物理点把环切得太粗，哈希不均匀时就会严重倾斜。`,
    12,
    { scanningKeyId: null, highlightArc: null, message: '负载失衡：B、C 空转' },
  )

  // 步骤 11：虚拟节点概念
  push(
    '解决办法是虚拟节点：每个物理节点在环上映射出多个点（这里每节点 3 个）。点变密之后，每个节点负责的弧段被切得更碎，负载自然更均匀。',
    3,
    { message: '虚拟节点 = 同一物理节点在环上的多个哈希位置' },
  )

  // 步骤 12-14：给 A/B/C 加虚拟节点
  for (const id of ['A', 'B', 'C']) {
    const vnodeId = `${id}#`
    const added: HashRingNode[] = VNODE_ANGLES[id].map((angle, index) => ({
      id: `${vnodeId}${index + 1}`,
      label: `${id}#${index + 1}`,
      angle,
      vnodeOf: id,
    }))
    state.nodes = [...state.nodes, ...added]
    push(
      `${id} 增加虚拟节点 ${VNODE_ANGLES[id].map((angle) => `${angle}°`).join(' / ')}。环上的点从 ${state.nodes.length - added.length} 个变成 ${state.nodes.length} 个。`,
      7,
      {
        highlightArc: {
          from: VNODE_ANGLES[id][0],
          to: VNODE_ANGLES[id][VNODE_ANGLES[id].length - 1],
          label: `${id} 的虚拟节点`,
        },
      },
    )
  }

  // 步骤 15-19：重新映射所有 key
  for (const key of state.keys) {
    const point = clockwisePoint(key.angle)
    const owner = point?.vnodeOf ?? point?.id ?? null
    const exact = point ? point.angle === key.angle : false
    key.owner = owner
    key.migrating = false
    state.scanningKeyId = key.label
    push(
      `重新映射 ${key.label}（${key.angle}°）：顺时针第一个点落在 ${point?.label ?? '—'}（${point?.angle ?? '—'}°）${exact ? '，正好命中该点' : ''} → 归属 ${owner}。`,
      14,
      {
        highlightArc: point ? { from: key.angle, to: point.angle, label: `${key.label} → ${owner}` } : null,
      },
    )
  }

  // 步骤 20：虚拟节点后的负载
  const balancedCounts = { ...state.ownerCounts }
  const countsAfterVnode = Object.values(balancedCounts)
  push(
    `虚拟节点生效后：A=${balancedCounts.A ?? 0}，B=${balancedCounts.B ?? 0}，C=${balancedCounts.C ?? 0}。最大与最小负载只差 ${Math.max(...countsAfterVnode) - Math.min(...countsAfterVnode)} —— 点越密，分布越接近均匀。`,
    12,
    { scanningKeyId: null, highlightArc: null, message: '虚拟节点让负载差降到 1' },
  )

  // 步骤 21：扩容加入 D
  const dNodes: HashRingNode[] = VNODE_ANGLES.D.map((angle, index) => ({
    id: `D#${index + 1}`,
    label: `D#${index + 1}`,
    angle,
    vnodeOf: 'D',
  }))
  state.nodes = [
    ...state.nodes,
    { id: 'D', label: 'D', angle: PHYSICAL_ANGLES.D, vnodeOf: null },
    ...dNodes,
  ]
  push(
    `扩容：加入物理节点 D（环上 ${PHYSICAL_ANGLES.D}°），它的虚拟节点哈希到 ${VNODE_ANGLES.D.map((angle) => `${angle}°`).join(' / ')}。注意 D#1 落在 327°，紧挨着 k3 的 325°。`,
    20,
    {
      highlightArc: { from: 310, to: 327, label: 'D 接管的新区间' },
      scanningKeyId: null,
      message: '扩容：新增节点接管相邻区间',
    },
  )

  // 步骤 22：检查受影响区间
  push(
    '一致性哈希的关键性质：D 只接管「前一个点（B#2 = 310°）到 D#1 = 327°」这一小段。区间内只有 k3（325°）一个 key，其余 key 的归属完全不动。',
    22,
    { highlightArc: { from: 310, to: 327, label: '受影响的只有这一段' } },
  )

  // 步骤 23：k3 迁移
  const migrating = state.keys.find((key) => key.label === 'k3')
  if (migrating) {
    migrating.owner = 'D'
    migrating.migrating = true
    push(
      '重新映射 k3（325°）：顺时针第一个点变成 D#1（327°），k3 从 C 迁移到 D。这是这次扩容唯一的迁移。',
      14,
      {
        scanningKeyId: 'k3',
        highlightArc: { from: 325, to: 327, label: 'k3 → D' },
      },
    )
  }

  // 步骤 24：迁移后负载
  const finalCounts = { ...state.ownerCounts }
  push(
    `迁移后负载：A=${finalCounts.A ?? 0}，B=${finalCounts.B ?? 0}，C=${finalCounts.C ?? 0}，D=${finalCounts.D ?? 0}。5 个 key 只动了 1 个 —— 迁移量 1/5，而不是取模方案的全量重排。`,
    24,
    { scanningKeyId: null, highlightArc: null, message: '迁移量 = 1/5 = 20%' },
  )

  // 步骤 25：结论
  push(
    '结论：一致性哈希用「顺时针找点」把节点增减的影响限制在相邻弧段；虚拟节点负责把每个物理节点的负载摊匀。存储系统（Redis Cluster、TiKV、Dynamo）都建立在这两点之上。',
    25,
    { message: '顺时针归属 + 虚拟节点 = 可控迁移量 + 均衡负载' },
  )

  return steps
}

export const consistentHashingDefinition: ConsistentHashingDefinition = {
  id: 'consistent-hashing',
  name: '一致性哈希',
  icon: '🎯',
  desc: '哈希环、虚拟节点与数据迁移量，解释扩容时为什么只动一小部分。',
  scenario: '分布式缓存、分库分表、负载均衡',
  code,
  generateSteps,
}
