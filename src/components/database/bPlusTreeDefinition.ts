// ============================================================
// B+ 树索引 —— 定义、真实插入/分裂实现与逐步快照
// 4 阶：每个节点最多 3 个键；叶子节点用 next 指针串成有序链表
// ============================================================

export const ORDER = 4
export const MAX_KEYS = ORDER - 1

interface LeafNode {
  id: string
  leaf: true
  keys: number[]
  next: LeafNode | null
}

interface InternalNode {
  id: string
  leaf: false
  keys: number[]
  children: TreeNode[]
}

type TreeNode = LeafNode | InternalNode

// ------------------------------------------------------------
// 快照类型：每步重建完整状态，由 Visualizer 直接渲染
// ------------------------------------------------------------

export interface BPlusNodeSnapshot {
  id: string
  keys: number[]
  leaf: boolean
  x: number
  y: number
  width: number
  height: number
  isNew: boolean
}

export interface BPlusEdgeSnapshot {
  from: string
  to: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface BPlusState {
  nodes: BPlusNodeSnapshot[]
  edges: BPlusEdgeSnapshot[]
  leafLinks: BPlusEdgeSnapshot[]
  width: number
  height: number
  activeKey: { nodeId: string; keyIndex: number } | null
  pathNodes: string[]
  pathEdges: string[]
  scanningLeaves: string[]
  floatingIds: string[]
  result: number[] | null
}

export interface BPlusStep {
  description: string
  codeLine: number
  message?: string
  state: BPlusState
}

export interface BPlusDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => BPlusStep[]
}

// ------------------------------------------------------------
// 布局常量
// ------------------------------------------------------------

const NODE_H = 40
const KEY_W = 40
const PAD_X = 8
const LEAF_GAP = 44
const ROW_GAP = 76
const TOP = 30
const MIN_NODE_W = 56

const widthOf = (node: TreeNode): number =>
  Math.max(MIN_NODE_W, node.keys.length * KEY_W + PAD_X * 2)

// ------------------------------------------------------------
// 布局：叶子按链表顺序排布，内部节点取其子节点中心
// ------------------------------------------------------------

interface LayoutResult {
  nodes: BPlusNodeSnapshot[]
  edges: BPlusEdgeSnapshot[]
  leafLinks: BPlusEdgeSnapshot[]
  width: number
  height: number
  floatingIds: string[]
}

// 分裂瞬间、尚未挂回父节点的右半部分，作为「浮动块」并排展示
interface FloatingTree {
  root: TreeNode
  depth: number
}

const FLOAT_GAP = 84

function layoutTree(root: TreeNode, floating: FloatingTree | null = null): LayoutResult {
  const nodes: BPlusNodeSnapshot[] = []
  const edges: BPlusEdgeSnapshot[] = []
  const leafLinks: BPlusEdgeSnapshot[] = []
  const floatingIds: string[] = []
  const allLeaves: LeafNode[] = []
  const centerOf = new Map<string, number>()
  const depthOf = new Map<string, number>()

  // 浮动块的叶子 id 需要预先保留，避免主块沿 next 链把它们也收进来
  const floatingLeafIds = new Set<string>()
  if (floating) {
    let probe: TreeNode = floating.root
    while (!probe.leaf) probe = probe.children[0]
    let current: LeafNode | null = probe as LeafNode
    while (current) {
      floatingLeafIds.add(current.id)
      current = current.next
    }
  }

  // 从叶子开始布局一个区块：叶子按 next 链从左到右，内部节点取子节点中心
  const layoutBlock = (blockRoot: TreeNode, xOffset: number, baseDepth: number, reserved: Set<string>): number => {
    let cursor = xOffset
    let probe: TreeNode = blockRoot
    while (!probe.leaf) probe = probe.children[0]
    let leaf: LeafNode | null = probe as LeafNode
    while (leaf && !reserved.has(leaf.id)) {
      const width = widthOf(leaf)
      centerOf.set(leaf.id, cursor + width / 2)
      allLeaves.push(leaf)
      cursor += width + LEAF_GAP
      leaf = leaf.next
    }
    const blockWidth = Math.max(cursor - xOffset - LEAF_GAP, MIN_NODE_W)

    const walk = (node: TreeNode, depth: number) => {
      depthOf.set(node.id, depth)
      if (!node.leaf) node.children.forEach((child) => walk(child, depth + 1))
    }
    walk(blockRoot, baseDepth)

    const post = (node: TreeNode): number => {
      if (node.leaf) return centerOf.get(node.id) ?? 0
      let sum = 0
      for (const child of node.children) sum += post(child)
      const center = sum / node.children.length
      centerOf.set(node.id, center)
      return center
    }
    post(blockRoot)

    const collect = (node: TreeNode) => {
      const width = widthOf(node)
      const center = centerOf.get(node.id) ?? 0
      const y = TOP + (depthOf.get(node.id) ?? 0) * (NODE_H + ROW_GAP)
      nodes.push({
        id: node.id,
        keys: [...node.keys],
        leaf: node.leaf,
        x: center - width / 2,
        y,
        width,
        height: NODE_H,
        isNew: false,
      })
      if (!node.leaf) {
        node.children.forEach((child, index) => {
          const anchorX = center - width / 2 + ((index + 0.5) / node.children.length) * width
          const childCenter = centerOf.get(child.id) ?? 0
          const childY = TOP + (depthOf.get(child.id) ?? 0) * (NODE_H + ROW_GAP)
          edges.push({
            from: node.id,
            to: child.id,
            x1: anchorX,
            y1: y + NODE_H,
            x2: childCenter,
            y2: childY,
          })
          collect(child)
        })
      }
    }
    collect(blockRoot)
    return blockWidth
  }

  const mainWidth = layoutBlock(root, 0, 0, floatingLeafIds)
  let totalWidth = mainWidth

  if (floating) {
    const floatWidth = layoutBlock(floating.root, mainWidth + FLOAT_GAP, floating.depth, new Set())
    totalWidth = mainWidth + FLOAT_GAP + floatWidth
    const mark = (node: TreeNode) => {
      floatingIds.push(node.id)
      if (!node.leaf) node.children.forEach(mark)
    }
    mark(floating.root)
  }

  // 叶子链表箭头：覆盖主块与浮动块，分裂瞬间最后一片主叶的 next 已指向浮动叶
  for (const leaf of allLeaves) {
    const next = leaf.next
    if (!next || !centerOf.has(next.id)) continue
    const y = TOP + (depthOf.get(leaf.id) ?? 0) * (NODE_H + ROW_GAP) + NODE_H / 2
    leafLinks.push({
      from: leaf.id,
      to: next.id,
      x1: (centerOf.get(leaf.id) ?? 0) + widthOf(leaf) / 2,
      y1: y,
      x2: (centerOf.get(next.id) ?? 0) - widthOf(next) / 2,
      y2: y,
    })
  }

  const maxDepth = Math.max(...depthOf.values())
  return {
    nodes,
    edges,
    leafLinks,
    width: totalWidth,
    height: TOP + maxDepth * (NODE_H + ROW_GAP) + NODE_H + 56,
    floatingIds,
  }
}

// ------------------------------------------------------------
// 步骤生成器
// ------------------------------------------------------------

const nodeText = (node: TreeNode): string => `[${node.keys.join(', ')}]`

const compareText = (node: InternalNode, key: number, index: number): string => {
  if (index === 0) return `${key} < ${node.keys[0]}`
  if (index === node.keys.length) return `${key} >= ${node.keys[node.keys.length - 1]}`
  return `${node.keys[index - 1]} <= ${key} < ${node.keys[index]}`
}

const childIndexOf = (node: InternalNode, key: number): number => {
  let i = 0
  while (i < node.keys.length && key >= node.keys[i]) i += 1
  return i
}

function generateSteps(): BPlusStep[] {
  const steps: BPlusStep[] = []
  let seq = 0
  const nextId = (prefix: string) => `${prefix}${(seq += 1)}`

  let root: TreeNode = { id: nextId('L'), leaf: true, keys: [], next: null }

  interface PushOptions {
    activeKey?: { nodeId: string; keyIndex: number }
    pathNodes?: string[]
    pathEdges?: string[]
    scanningLeaves?: string[]
    result?: number[]
    newIds?: string[]
    floating?: FloatingTree
  }

  const push = (description: string, codeLine: number, message: string, options: PushOptions = {}) => {
    const layout = layoutTree(root, options.floating ?? null)
    const newIds = options.newIds ?? []
    steps.push({
      description,
      codeLine,
      message,
      state: {
        nodes: layout.nodes.map((node) => ({ ...node, isNew: newIds.includes(node.id) })),
        edges: layout.edges,
        leafLinks: layout.leafLinks,
        width: layout.width,
        height: layout.height,
        activeKey: options.activeKey ?? null,
        pathNodes: options.pathNodes ?? [],
        pathEdges: options.pathEdges ?? [],
        scanningLeaves: options.scanningLeaves ?? [],
        floatingIds: layout.floatingIds,
        result: options.result ?? null,
      },
    })
  }

  // 初始状态
  push('初始化一棵空的 B+ 树：根节点同时也是叶子节点，没有键。', 3, 'new BPlusTree()')

  const buildPath = (nodes: TreeNode[]): { pathNodes: string[]; pathEdges: string[] } => ({
    pathNodes: nodes.map((node) => node.id),
    pathEdges: nodes.slice(1).map((node, index) => `${nodes[index].id}->${node.id}`),
  })

  // 插入（递归处理分裂）
  const insert = (key: number): void => {
    const visited: TreeNode[] = []

    const insertRec = (node: TreeNode, depth: number): { sep: number; right: TreeNode } | null => {
      visited.push(node)

      if (node.leaf) {
        node.keys.push(key)
        node.keys.sort((a, b) => a - b)
        const index = node.keys.indexOf(key)
        push(
          node.keys.length > MAX_KEYS
            ? `到达叶子节点，插入 ${key} 后暂时有 ${node.keys.length} 个键（超出上限 ${MAX_KEYS}），下一步分裂。`
            : `到达叶子节点，插入 ${key}，叶子内保持有序：${nodeText(node)}。`,
          18,
          `insert(${key})`,
          { activeKey: { nodeId: node.id, keyIndex: index }, ...buildPath(visited) },
        )
        if (node.keys.length <= MAX_KEYS) return null

        // 叶子分裂：4 个键 → 左右各 2 个，右叶第一个键提升
        const mid = Math.ceil(node.keys.length / 2)
        const right: LeafNode = {
          id: nextId('L'),
          leaf: true,
          keys: node.keys.slice(mid),
          next: node.next,
        }
        node.keys = node.keys.slice(0, mid)
        node.next = right
        const sep = right.keys[0]
        push(
          `叶子溢出（${MAX_KEYS + 1} 个键）：分裂为 ${nodeText(node)} 与 ${nodeText(right)}，把 ${sep} 提升到父节点。`,
          20,
          `split → ${sep}`,
          { ...buildPath(visited), newIds: [right.id], floating: { root: right, depth } },
        )
        return { sep, right }
      }

      const index = childIndexOf(node, key)
      push(
        `在内部节点 ${nodeText(node)} 中比较：${compareText(node, key, index)}，进入第 ${index + 1} 个子树。`,
        23,
        `insert(${key})`,
        { ...buildPath(visited) },
      )

      const split = insertRec(node.children[index], depth + 1)
      if (!split) return null

      // 把分裂产生的分隔键与右子节点插入当前节点
      node.keys.splice(index, 0, split.sep)
      node.children.splice(index + 1, 0, split.right)
      push(
        node.keys.length > MAX_KEYS
          ? `把分隔键 ${split.sep} 与右子节点挂回父节点：父节点 ${nodeText(node)} 也超出上限，下一步继续分裂。`
          : `把分隔键 ${split.sep} 与右子节点挂回父节点，父节点变为 ${nodeText(node)}。`,
        26,
        `promote ${split.sep}`,
        { ...buildPath(visited), newIds: [split.right.id] },
      )

      if (node.keys.length <= MAX_KEYS) return null

      // 内部节点分裂：中间键提升，左右各分一半子节点
      const mid = Math.floor(node.keys.length / 2)
      const sep = node.keys[mid]
      const right: InternalNode = {
        id: nextId('I'),
        leaf: false,
        keys: node.keys.slice(mid + 1),
        children: node.children.slice(mid + 1),
      }
      node.keys = node.keys.slice(0, mid)
      node.children = node.children.slice(0, mid + 1)
      push(
        `内部节点也溢出：中间键 ${sep} 提升，节点分裂为 ${nodeText(node)} 与 ${nodeText(right)}。`,
        29,
        `split → ${sep}`,
        { ...buildPath(visited), newIds: [right.id], floating: { root: right, depth } },
      )
      return { sep, right }
    }

    push(`插入 ${key}：从根节点开始向下查找应落的叶子。`, 6, `insert(${key})`)
    const split = insertRec(root, 0)
    if (split) {
      const newRoot: InternalNode = {
        id: nextId('I'),
        leaf: false,
        keys: [split.sep],
        children: [root, split.right],
      }
      const leftId = root.id
      root = newRoot
      push(
        `根节点分裂：${split.sep} 成为新的根，树增高一层，所有叶子仍在同一深度。`,
        7,
        `new root [${split.sep}]`,
        { newIds: [newRoot.id], pathNodes: [newRoot.id, leftId] },
      )
    }
  }

  for (const key of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    insert(key)
  }

  // 等值查找
  const find = (key: number): void => {
    const visited: TreeNode[] = []
    let node: TreeNode = root
    while (!node.leaf) {
      visited.push(node)
      const index = childIndexOf(node, key)
      push(
        `查找 ${key}：在 ${nodeText(node)} 中比较，${compareText(node, key, index)}，进入第 ${index + 1} 个子树。`,
        41,
        `find(${key})`,
        buildPath(visited),
      )
      node = node.children[index]
    }
    visited.push(node)
    const index = node.keys.indexOf(key)
    push(
      index >= 0
        ? `在叶子 ${nodeText(node)} 中比较，找到 ${key}。`
        : `在叶子 ${nodeText(node)} 中没有 ${key}，查找失败。`,
      42,
      `find(${key}) → ${index >= 0 ? key : 'null'}`,
      {
        ...buildPath(visited),
        activeKey: index >= 0 ? { nodeId: node.id, keyIndex: index } : undefined,
      },
    )
  }

  find(60)

  // 范围查询：定位起点后沿叶子链表扫描
  const range = (from: number, to: number): void => {
    const visited: TreeNode[] = []
    let node: TreeNode = root
    while (!node.leaf) {
      visited.push(node)
      const index = childIndexOf(node, from)
      push(
        `范围查询 ${from}~${to}：先用 ${from} 定位起点，在 ${nodeText(node)} 中比较后进入第 ${index + 1} 个子树。`,
        48,
        `range(${from}, ${to})`,
        buildPath(visited),
      )
      node = node.children[index]
    }
    visited.push(node)

    const result: number[] = []
    const scanned: string[] = []
    let leaf: LeafNode | null = node
    while (leaf) {
      scanned.push(leaf.id)
      const picked: number[] = []
      for (const key of leaf.keys) {
        if (key > to) {
          result.push(...picked)
          push(
            `扫描叶子 ${nodeText(leaf)}：收集 ${picked.length ? picked.join(', ') : '无'}，遇到 ${key} > ${to}，停止扫描。`,
            53,
            `range(${from}, ${to})`,
            { scanningLeaves: [...scanned], result: [...result] },
          )
          return
        }
        if (key >= from) {
          result.push(key)
          picked.push(key)
        }
      }
      push(
        `扫描叶子 ${nodeText(leaf)}：收集 ${picked.length ? picked.join(', ') : '无'}，沿 next 指针继续找下一个叶子。`,
        50,
        `range(${from}, ${to})`,
        { scanningLeaves: [...scanned], result: [...result] },
      )
      leaf = leaf.next
    }
    push(
      `叶子链表扫描结束，范围结果：[${result.join(', ')}]。`,
      56,
      `range(${from}, ${to})`,
      { scanningLeaves: [...scanned], result: [...result] },
    )
  }

  range(40, 80)

  return steps
}

// ------------------------------------------------------------
// 定义对象
// ------------------------------------------------------------

const code = `class BPlusTree {
    static final int ORDER = 4;       // 4 阶：每个节点最多 3 个键
    Node root = new Leaf();           // 只有一个叶子时，它就是根

    void insert(int key) {
        Split split = insert(root, key);
        if (split != null) {          // 根也溢出了：树增高一层
            Internal newRoot = new Internal();
            newRoot.keys.add(split.sep);
            newRoot.children.add(root);
            newRoot.children.add(split.right);
            root = newRoot;
        }
    }

    Split insert(Node node, int key) {
        if (node instanceof Leaf leaf) {
            leaf.insertSorted(key);    // 叶子内保持有序
            if (leaf.keys.size() <= ORDER - 1) return null;
            return leaf.split();       // 叶子分裂：右半 + 提升键
        }
        Internal in = (Internal) node;
        int i = childIndex(in, key);   // 比较键，选择子树
        Split split = insert(in.children.get(i), key);
        if (split == null) return null;
        in.keys.add(i, split.sep);     // 分隔键上移到父节点
        in.children.add(i + 1, split.right);
        if (in.keys.size() <= ORDER - 1) return null;
        return in.split();             // 内部节点同样分裂
    }

    int childIndex(Internal in, int key) {
        int i = 0;
        while (i < in.keys.size() && key >= in.keys.get(i)) i++;
        return i;                      // 大于等于当前键就继续往右
    }

    boolean find(int key) {
        Node node = root;
        while (node instanceof Internal in)
            node = in.children.get(childIndex(in, key));
        return ((Leaf) node).keys.contains(key);
    }

    List<Integer> range(int from, int to) {
        Node node = root;
        while (node instanceof Internal in)
            node = in.children.get(childIndex(in, from));
        List<Integer> out = new ArrayList<>();
        for (Leaf leaf = (Leaf) node; leaf != null; leaf = leaf.next) {
            for (int k : leaf.keys) {
                if (k >= from && k <= to) out.add(k);
                if (k > to) return out;
            }
        }
        return out;
    }
}`

export const bPlusTreeDefinition: BPlusDefinition = {
  id: 'b-plus-tree',
  name: 'B+ 树索引',
  icon: '🌳',
  desc: '叶子指针连成有序链表的平衡多叉树，MySQL InnoDB 索引的底层结构。',
  scenario: '数据库索引、范围查询、磁盘页组织；一次查找只需 2~3 层 IO。',
  code,
  generateSteps,
}
