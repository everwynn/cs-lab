// ============================================================
// 数据结构可视化 —— 9 个数据结构定义与步骤生成器
// ============================================================

// 布局类型：决定 Visualizer 如何渲染当前状态
export type DSLayout = 'stack' | 'queue' | 'linked-list' | 'hash-map' | 'bst' | 'heap' | 'trie' | 'union-find' | 'array-list'

// 通用节点：用于数组/栈/队列/链表/哈希链
export interface DSNode {
  id: string
  value: string
}

export interface DSEdge {
  from: string
  to: string
}

// 哈希表桶
export interface DSBucket {
  index: number
  items: DSNode[]
}

// 树/并查集 节点（带预计算坐标）
export interface DSTreeNode extends DSNode {
  x: number
  y: number
  end?: boolean       // Trie：是否为单词结束节点
}

// 每一步的完整状态：随步骤推进而重建
export interface DSState {
  elements?: DSNode[]                              // 线性序列：栈/队列/链表/动态数组
  capacity?: number                                // 动态数组容量
  edges?: DSEdge[]                                  // 链表 next / 父子边 / 并查集父指针
  headId?: string                                   // 链表头指针
  tailId?: string                                   // 链表尾指针
  buckets?: DSBucket[]                              // 哈希表
  tableSize?: number                                // 哈希表桶数
  treeNodes?: DSTreeNode[]                          // BST/堆/Trie/并查集 节点
  treeEdges?: DSEdge[]                              // 树的父子边 / 并查集父指针
  info?: Record<string, string>                     // 附加信息（size、capacity 等）
}

export interface DSStep {
  description: string
  codeLine: number
  state: DSState
  highlight?: string[]                              // 当前激活的节点 id
  message?: string                                  // 操作说明标签
}

export interface DSDefinition {
  id: string
  name: string
  category: 'linear' | 'linked' | 'hash' | 'tree'
  icon: string
  desc: string
  scenario: string
  code: string
  layout: DSLayout
  generateSteps: () => DSStep[]
}

const cloneState = (s: DSState): DSState => JSON.parse(JSON.stringify(s))

// ============================================================
// 1. 栈 Stack（基于数组实现）
// ============================================================
export const stackDS: DSDefinition = {
  id: 'stack',
  name: '栈',
  category: 'linear',
  icon: '📚',
  desc: '后进先出（LIFO）线性结构，只能在栈顶插入和删除。',
  scenario: '浏览器后退按钮、函数调用栈、括号匹配。',
  code: `public class Stack<E> {
    private Object[] data = new Object[8];
    private int size = 0;

    public void push(E e) {
        ensureCapacity();
        data[size++] = e;
    }

    public E pop() {
        E e = (E) data[--size];
        data[size] = null;
        return e;
    }

    public E peek() {
        return (E) data[size - 1];
    }

    public boolean isEmpty() {
        return size == 0;
    }

    private void ensureCapacity() {
        if (size == data.length) {
            data = Arrays.copyOf(data, size * 2);
        }
    }
}`,
  layout: 'stack',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { elements: [], info: { capacity: '8', size: '0' } }

    steps.push({
      description: '初始化一个空栈，底层数组容量为 8，size = 0。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new Stack()',
    })

    const mk = (desc: string, line: number, els: string[], msg?: string, highlight?: string[]): DSStep => {
      const st = cloneState(base)
      st.elements = els.map((v, i) => ({ id: `n${i}`, value: v }))
      st.info = { capacity: '8', size: String(els.length) }
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(mk('push(10)：在栈顶压入 10，size 自增到 1。', 6, ['10'], 'push(10)', ['n0']))
    steps.push(mk('push(20)：再压入 20，20 成为新栈顶。', 6, ['10', '20'], 'push(20)', ['n1']))
    steps.push(mk('push(30)：继续压入 30，现在栈顶是 30。', 6, ['10', '20', '30'], 'push(30)', ['n2']))
    steps.push(mk('peek()：查看栈顶元素，返回 30，但不删除。', 18, ['10', '20', '30'], 'peek() → 30', ['n2']))
    steps.push(mk('pop()：弹出栈顶 30，size 减到 2，栈顶变为 20。', 11, ['10', '20'], 'pop() → 30', ['n1']))
    steps.push(mk('pop()：再次弹出栈顶 20，size 减到 1。', 11, ['10'], 'pop() → 20', ['n0']))
    steps.push(mk('pop()：弹出最后一个元素 10，栈为空，size = 0。', 11, [], 'pop() → 10'))

    return steps
  },
}

// ============================================================
// 2. 队列 Queue（基于数组实现，FIFO）
// ============================================================
export const queueDS: DSDefinition = {
  id: 'queue',
  name: '队列',
  category: 'linear',
  icon: '🚶',
  desc: '先进先出（FIFO）线性结构，队尾入队、队头出队。',
  scenario: '任务调度、消息缓冲、打印队列、广度优先搜索。',
  code: `public class Queue<E> {
    private Object[] data = new Object[8];
    private int head = 0;
    private int tail = 0;
    private int size = 0;

    public void offer(E e) {
        data[tail] = e;
        tail = (tail + 1) % data.length;
        size++;
    }

    public E poll() {
        E e = (E) data[head];
        data[head] = null;
        head = (head + 1) % data.length;
        size--;
        return e;
    }

    public E peek() {
        return (E) data[head];
    }
}`,
  layout: 'queue',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { elements: [], info: { size: '0' } }

    steps.push({
      description: '初始化一个空队列，head = tail = 0，size = 0。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new Queue()',
    })

    const mk = (desc: string, line: number, els: string[], msg?: string, highlight?: string[]): DSStep => {
      const st = cloneState(base)
      st.elements = els.map((v, i) => ({ id: `n${i}`, value: v }))
      st.info = { size: String(els.length) }
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(mk('offer(10)：10 从队尾入队，size = 1。', 7, ['10'], 'offer(10)', ['n0']))
    steps.push(mk('offer(20)：20 入队，排在 10 后面。', 7, ['10', '20'], 'offer(20)', ['n1']))
    steps.push(mk('offer(30)：30 入队，现在队列：10 → 20 → 30。', 7, ['10', '20', '30'], 'offer(30)', ['n2']))
    steps.push(mk('poll()：10 从队头出队（先进先出），size = 2。', 13, ['20', '30'], 'poll() → 10', ['n0']))
    steps.push(mk('offer(40)：40 从队尾入队。', 7, ['20', '30', '40'], 'offer(40)', ['n2']))
    steps.push(mk('poll()：20 出队，最先进入的最先离开。', 13, ['30', '40'], 'poll() → 20', ['n0']))
    steps.push(mk('poll()：30 出队，队列只剩 40。', 13, ['40'], 'poll() → 30', ['n0']))

    return steps
  },
}

// ============================================================
// 3. 链表 LinkedList（单向链表）
// ============================================================
export const linkedListDS: DSDefinition = {
  id: 'linked-list',
  name: '链表',
  category: 'linked',
  icon: '🔗',
  desc: '通过指针串联的节点序列，插入删除无需移动元素。',
  scenario: '动态数据集合、LRU 缓存、实现栈和队列的底层结构。',
  code: `public class LinkedList<E> {
    private Node head;
    private int size;

    private static class Node<E> {
        E item;
        Node next;
        Node(E e) { item = e; }
    }

    public void add(E e) {
        Node node = new Node(e);
        if (head == null) { head = node; return; }
        Node cur = head;
        while (cur.next != null) cur = cur.next;
        cur.next = node;
        size++;
    }

    public void insert(int index, E e) {
        Node node = new Node(e);
        if (index == 0) {
            node.next = head; head = node; return;
        }
        Node prev = head;
        for (int i = 0; i < index - 1; i++) prev = prev.next;
        node.next = prev.next;
        prev.next = node;
        size++;
    }

    public void remove(E e) {
        if (head == null) return;
        if (head.item.equals(e)) { head = head.next; return; }
        Node cur = head;
        while (cur.next != null && !cur.next.item.equals(e))
            cur = cur.next;
        if (cur.next != null) cur.next = cur.next.next;
        size--;
    }
}`,
  layout: 'linked-list',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { elements: [], edges: [] }

    steps.push({
      description: '初始化空链表，head = null，size = 0。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new LinkedList()',
    })

    const mk = (desc: string, line: number, els: string[], msg?: string, highlight?: string[]): DSStep => {
      const st = cloneState(base)
      st.elements = els.map((v, i) => ({ id: `n${i}`, value: v }))
      st.edges = els.slice(0, -1).map((_, i) => ({ from: `n${i}`, to: `n${i + 1}` }))
      st.headId = els.length ? 'n0' : undefined
      st.info = { size: String(els.length) }
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(mk('add(10)：链表为空，head 直接指向新节点 10。', 10, ['10'], 'add(10)', ['n0']))
    steps.push(mk('add(20)：遍历到末尾，把 20 接在 10 后面。', 14, ['10', '20'], 'add(20)', ['n1']))
    steps.push(mk('add(30)：继续在末尾追加 30。', 14, ['10', '20', '30'], 'add(30)', ['n2']))
    steps.push(mk('insert(1, 15)：在索引 1 处插入 15，断开 10→20，重连为 10→15→20。', 22, ['10', '15', '20', '30'], 'insert(1, 15)', ['n1']))
    steps.push(mk('remove(20)：找到 20 的前驱 15，让 15.next 指向 30，跳过 20。', 36, ['10', '15', '30'], 'remove(20)', ['n1', 'n2']))
    steps.push(mk('最终链表：head → 10 → 15 → 30 → null。', 2, ['10', '15', '30']))

    return steps
  },
}

// ============================================================
// 4. 哈希表 HashMap（拉链法）
// ============================================================
export const hashMapDS: DSDefinition = {
  id: 'hash-map',
  name: '哈希表',
  category: 'hash',
  icon: '🗂️',
  desc: '通过哈希函数将键映射到桶，冲突时用拉链法解决。',
  scenario: '键值存储、缓存、字典、数据库索引的底层思路。',
  code: `public class HashMap<K, V> {
    private static final int SIZE = 4;
    private Node[] table = new Node[SIZE];
    private int size = 0;

    private static class Node {
        Object key; Object value; Node next;
        Node(Object k, Object v) { key = k; value = v; }
    }

    private int hash(Object key) {
        return Math.abs(key.hashCode() % SIZE);
    }

    public void put(K key, V value) {
        int i = hash(key);
        Node cur = table[i];
        while (cur != null) {
            if (cur.key.equals(key)) { cur.value = value; return; }
            cur = cur.next;
        }
        Node node = new Node(key, value);
        node.next = table[i];
        table[i] = node;
        size++;
    }

    public Object get(K key) {
        int i = hash(key);
        Node cur = table[i];
        while (cur != null) {
            if (cur.key.equals(key)) return cur.value;
            cur = cur.next;
        }
        return null;
    }
}`,
  layout: 'hash-map',
  generateSteps: () => {
    const TABLE_SIZE = 4
    // 预设哈希：让 name 落到桶0、age 落到桶3、city 落到桶0（冲突）
    const hashOf: Record<string, number> = { name: 0, age: 3, city: 0, job: 2 }
    const steps: DSStep[] = []
    const base: DSState = {
      buckets: Array.from({ length: TABLE_SIZE }, (_, i) => ({ index: i, items: [] })),
      tableSize: TABLE_SIZE,
      info: { size: '0', capacity: String(TABLE_SIZE) },
    }

    steps.push({
      description: '初始化哈希表，4 个桶都为空，size = 0。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new HashMap()',
    })

    const put = (key: string, value: string, line: number, desc: string, highlightBucket: number, conflict?: boolean): DSStep => {
      const st = cloneState(base)
      // 复制已有项
      const existing = steps.length > 0
        ? (steps[steps.length - 1].state.buckets || []).map(b => ({ ...b, items: [...b.items] }))
        : Array.from({ length: TABLE_SIZE }, (_, i) => ({ index: i, items: [] as DSNode[] }))
      st.buckets = existing
      const idx = hashOf[key]
      const newNode = { id: `${key}`, value: `${key}=${value}` }
      st.buckets[idx].items.unshift(newNode) // 头插法
      st.info = {
        size: String(steps.filter(s => s.message?.startsWith('put')).length + 1),
        capacity: String(TABLE_SIZE),
      }
      return {
        description: desc,
        codeLine: line,
        state: st,
        highlight: [`${key}`],
        message: `put("${key}", "${value}") → 桶${idx}${conflict ? '（冲突，挂到链头）' : ''}`,
      }
    }

    steps.push(put('name', 'Tom', 18, 'put("name","Tom")：hash("name") = 0，桶 0 为空，直接放入。', 0, false))
    steps.push(put('age', '25', 18, 'put("age","25")：hash("age") = 3，桶 3 为空，放入。', 3, false))
    steps.push(put('city', 'BJ', 18, 'put("city","BJ")：hash("city") = 0，桶 0 已有 name，发生冲突！用头插法挂到链表头部。', 0, true))
    steps.push(put('job', 'Dev', 18, 'put("job","Dev")：hash("job") = 2，桶 2 为空，放入。', 2, false))

    // get("name")
    const getSt = cloneState(base)
    getSt.buckets = (steps[steps.length - 1].state.buckets || []).map(b => ({ ...b, items: [...b.items] }))
    getSt.info = { size: '4', capacity: String(TABLE_SIZE) }
    steps.push({
      description: 'get("name")：hash("name") = 0，遍历桶 0 的链表，依次比较 city → name，匹配到 name，返回 "Tom"。',
      codeLine: 28,
      state: getSt,
      highlight: ['name', 'city'],
      message: 'get("name") → "Tom"',
    })

    return steps
  },
}

// ============================================================
// 5. 二叉搜索树 BST
// ============================================================
export const bstDS: DSDefinition = {
  id: 'bst',
  name: '二叉搜索树',
  category: 'tree',
  icon: '🌳',
  desc: '左子树小于根，右子树大于根，中序遍历得到有序序列。',
  scenario: '有序数据的高效查找、删除，是红黑树、AVL 树的基础。',
  code: `public class BST<E extends Comparable<E>> {
    private Node root;

    private static class Node {
        int val; Node left, right;
        Node(int v) { val = v; }
    }

    public void insert(int val) {
        root = insert(root, val);
    }

    private Node insert(Node node, int val) {
        if (node == null) return new Node(val);
        if (val < node.val)
            node.left = insert(node.left, val);
        else if (val > node.val)
            node.right = insert(node.right, val);
        return node;
    }

    public boolean search(int val) {
        Node cur = root;
        while (cur != null) {
            if (val == cur.val) return true;
            cur = val < cur.val ? cur.left : cur.right;
        }
        return false;
    }

    public void inorder() {
        inorder(root);
    }

    private void inorder(Node node) {
        if (node == null) return;
        inorder(node.left);
        System.out.print(node.val + " ");
        inorder(node.right);
    }
}`,
  layout: 'bst',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { treeNodes: [], treeEdges: [] }

    steps.push({
      description: '初始化一棵空的二叉搜索树，root = null。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new BST()',
    })

    // 手动构造每一步的树状态（插入序列：50, 30, 70, 20, 40）
    // 坐标：以画布中心为根，按层级向下展开
    const CX = 360
    const LEVEL_H = 70
    const mkNode = (id: string, val: number, x: number, y: number): DSTreeNode => ({ id, value: String(val), x, y })

    const build = (nodes: DSTreeNode[], highlight?: string[], desc?: string, line?: number, msg?: string): DSStep => {
      const st = cloneState(base)
      st.treeNodes = nodes
      // 边根据 BST 结构手动指定
      st.treeEdges = []
      const ids = nodes.map(n => n.id)
      if (ids.includes('50')) {
        if (ids.includes('30')) st.treeEdges.push({ from: '50', to: '30' })
        if (ids.includes('70')) st.treeEdges.push({ from: '50', to: '70' })
      }
      if (ids.includes('30')) {
        if (ids.includes('20')) st.treeEdges.push({ from: '30', to: '20' })
        if (ids.includes('40')) st.treeEdges.push({ from: '30', to: '40' })
      }
      return {
        description: desc || '',
        codeLine: line || 2,
        state: st,
        highlight,
        message: msg,
      }
    }

    steps.push(build(
      [mkNode('50', 50, CX, 40)],
      ['50'],
      'insert(50)：树为空，50 成为根节点。',
      11,
      'insert(50)'
    ))
    steps.push(build(
      [mkNode('50', 50, CX, 40), mkNode('30', 30, CX - 110, 40 + LEVEL_H)],
      ['50', '30'],
      'insert(30)：30 < 50，进入左子树，左子树为空，插入为 50 的左孩子。',
      14,
      'insert(30)'
    ))
    steps.push(build(
      [mkNode('50', 50, CX, 40), mkNode('30', 30, CX - 110, 40 + LEVEL_H), mkNode('70', 70, CX + 110, 40 + LEVEL_H)],
      ['50', '70'],
      'insert(70)：70 > 50，进入右子树，插入为 50 的右孩子。',
      16,
      'insert(70)'
    ))
    steps.push(build(
      [mkNode('50', 50, CX, 40), mkNode('30', 30, CX - 110, 40 + LEVEL_H), mkNode('70', 70, CX + 110, 40 + LEVEL_H), mkNode('20', 20, CX - 170, 40 + LEVEL_H * 2)],
      ['30', '20'],
      'insert(20)：20 < 50 向左，20 < 30 继续向左，插入为 30 的左孩子。',
      14,
      'insert(20)'
    ))
    steps.push(build(
      [mkNode('50', 50, CX, 40), mkNode('30', 30, CX - 110, 40 + LEVEL_H), mkNode('70', 70, CX + 110, 40 + LEVEL_H), mkNode('20', 20, CX - 170, 40 + LEVEL_H * 2), mkNode('40', 40, CX - 50, 40 + LEVEL_H * 2)],
      ['30', '40'],
      'insert(40)：40 < 50 向左，40 > 30 向右，插入为 30 的右孩子。',
      16,
      'insert(40)'
    ))

    // search(40)
    const finalNodes = steps[steps.length - 1].state.treeNodes || []
    steps.push(build(
      [...finalNodes],
      ['50', '30', '40'],
      'search(40)：从根 50 出发，40 < 50 向左到 30，40 > 30 向右到 40，找到！',
      22,
      'search(40) → true'
    ))

    // search(60)
    steps.push(build(
      [...finalNodes],
      ['50', '70'],
      'search(60)：60 > 50 向右到 70，60 < 70 向左，左子树为空，未找到。',
      22,
      'search(60) → false'
    ))

    // 中序遍历
    steps.push(build(
      [...finalNodes],
      ['20', '30', '40', '50', '70'],
      '中序遍历（左→根→右）：20 → 30 → 40 → 50 → 70，得到升序序列。',
      33,
      'inorder() → 20 30 40 50 70'
    ))

    return steps
  },
}

// ============================================================
// 6. 堆 Heap（最大堆）
// ============================================================
export const heapDS: DSDefinition = {
  id: 'heap',
  name: '堆',
  category: 'tree',
  icon: '⛰️',
  desc: '完全二叉树，父节点总是大于（或等于）子节点，根即最大值。',
  scenario: '优先队列、TopK 问题、堆排序、任务调度。',
  code: `public class MaxHeap {
    private int[] data = new int[8];
    private int size = 0;

    public void push(int val) {
        data[size] = val;
        siftUp(size);
        size++;
    }

    public int pop() {
        int max = data[0];
        size--;
        data[0] = data[size];
        siftDown(0);
        return max;
    }

    private void siftUp(int i) {
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (data[parent] >= data[i]) break;
            swap(parent, i);
            i = parent;
        }
    }

    private void siftDown(int i) {
        while (true) {
            int l = 2 * i + 1, r = 2 * i + 2;
            int largest = i;
            if (l < size && data[l] > data[largest]) largest = l;
            if (r < size && data[r] > data[largest]) largest = r;
            if (largest == i) break;
            swap(i, largest);
            i = largest;
        }
    }
}`,
  layout: 'heap',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { treeNodes: [], treeEdges: [], info: {} }
    // 完全二叉树坐标（按层序索引）
    const pos = (i: number): { x: number; y: number } => {
      const positions = [
        { x: 360, y: 50 },                               // 0
        { x: 230, y: 130 }, { x: 490, y: 130 },          // 1,2
        { x: 140, y: 210 }, { x: 320, y: 210 },          // 3,4
        { x: 460, y: 210 }, { x: 600, y: 210 },          // 5,6
      ]
      return positions[i] || { x: 360, y: 290 }
    }
    const mkNode = (i: number, val: number): DSTreeNode => ({ id: `h${i}`, value: String(val), x: pos(i).x, y: pos(i).y })

    const build = (nodes: DSTreeNode[], edges: DSEdge[], highlight: string[], desc: string, line: number, msg: string): DSStep => {
      const st = cloneState(base)
      st.treeNodes = nodes
      st.treeEdges = edges
      st.info = { size: String(nodes.length) }
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }
    const edgesOf = (n: number): DSEdge[] => {
      const e: DSEdge[] = []
      for (let i = 1; i < n; i++) e.push({ from: `h${(i - 1) >> 1}`, to: `h${i}` })
      return e
    }

    steps.push(build([], [], [], '初始化一个空的最大堆，size = 0。', 2, 'new MaxHeap()'))

    // insert(50): root, no sift-up
    steps.push(build([mkNode(0, 50)], edgesOf(1), ['h0'], 'push(50)：放到末尾索引 0，是根节点，无需上浮。', 6, 'push(50)'))
    // insert(30): left child, 30<50 no sift-up
    steps.push(build([mkNode(0, 50), mkNode(1, 30)], edgesOf(2), ['h1'], 'push(30)：放到索引 1，父节点 50 ≥ 30，无需上浮。', 6, 'push(30)'))
    // insert(70): right child, 70>50 sift-up swap → 70 becomes root
    steps.push(build([mkNode(0, 70), mkNode(1, 30), mkNode(2, 50)], [
      { from: 'h0', to: 'h1' }, { from: 'h0', to: 'h2' }
    ], ['h0', 'h2'], 'push(70)：放到索引 2，70 > 父 50！上浮交换，70 成为新根，50 下移。', 6, 'push(70) → 上浮'))
    // insert(20)
    steps.push(build([mkNode(0, 70), mkNode(1, 30), mkNode(2, 50), mkNode(3, 20)], edgesOf(4), ['h3'], 'push(20)：放到索引 3，父 30 ≥ 20，无需上浮。', 6, 'push(20)'))
    // insert(60): index 4, parent=30(idx1), 60>30 sift-up swap → 60 at idx1
    steps.push(build([mkNode(0, 70), mkNode(1, 60), mkNode(2, 50), mkNode(3, 20), mkNode(4, 30)], edgesOf(5), ['h1', 'h4'], 'push(60)：放到索引 4，60 > 父 30！上浮交换，60 上到索引 1。', 6, 'push(60) → 上浮'))

    const fullNodes = steps[steps.length - 1].state.treeNodes || []
    const fullEdges = steps[steps.length - 1].state.treeEdges || []

    // pop(): remove 70 (root), move 30 to root, sift-down
    steps.push(build(
      [mkNode(0, 60), mkNode(1, 30), mkNode(2, 50), mkNode(3, 20)],
      edgesOf(4),
      ['h0', 'h2'],
      'pop()：取出根 70（最大值）。末尾 30 移到根，开始下沉：30 < 右子 50，交换。下沉后 50 成根，60 再比...',
      10,
      'pop() → 70（下沉调整）'
    ))
    // After sift-down: 60 vs 50... let me compute: arr=[60,30,50,20] after moving 30 to root then siftdown
    // Actually let me re-derive. Before pop: heap=[70,60,50,20,30] (indices 0-4)
    // pop: max=70. swap root(70) with last(30), remove last. arr=[30,60,50,20], size=4
    // siftDown(0): children idx1=60, idx2=50. largest=idx1(60). swap(0,1). arr=[60,30,50,20]. i=1, children idx3=20,idx4(out). largest=1. done.
    // Result: [60,30,50,20]
    steps.push(build(
      [mkNode(0, 60), mkNode(1, 30), mkNode(2, 50), mkNode(3, 20)],
      edgesOf(4),
      ['h0'],
      '下沉结束：60 成为新根，堆性质恢复。size = 4。',
      32,
      '堆调整完成'
    ))

    return steps
  },
}

// ============================================================
// 7. 字典树 Trie
// ============================================================
export const trieDS: DSDefinition = {
  id: 'trie',
  name: '字典树',
  category: 'tree',
  icon: '🔤',
  desc: '前缀树，共享公共前缀的字符串集合，查找前缀高效。',
  scenario: '搜索引擎自动补全、拼写检查、IP 路由最长前缀匹配。',
  code: `public class Trie {
    private Node root = new Node();

    private static class Node {
        Map<Character, Node> children = new HashMap<>();
        boolean isEnd;
    }

    public void insert(String word) {
        Node cur = root;
        for (char c : word.toCharArray()) {
            cur = cur.children.computeIfAbsent(c, k -> new Node());
        }
        cur.isEnd = true;
    }

    public boolean search(String word) {
        Node node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private Node find(String s) {
        Node cur = root;
        for (char c : s.toCharArray()) {
            cur = cur.children.get(c);
            if (cur == null) return null;
        }
        return cur;
    }
}`,
  layout: 'trie',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { treeNodes: [], treeEdges: [], info: {} }
    // 预设坐标（插入 cat, car, dog）
    // root(360,40) → c(260,110) → a(260,180) → t(200,250,end), r(340,250,end)
    //              → d(480,110) → o(480,180) → g(480,250,end)
    const P: Record<string, { x: number; y: number }> = {
      root: { x: 360, y: 40 },
      c: { x: 260, y: 110 }, a: { x: 260, y: 180 },
      t: { x: 200, y: 250 }, r: { x: 340, y: 250 },
      d: { x: 480, y: 110 }, o: { x: 480, y: 180 }, g: { x: 480, y: 250 },
    }
    const mkNode = (id: string, ch: string, end = false): DSTreeNode => ({ id, value: ch, x: P[id].x, y: P[id].y, end })

    const build = (nodes: DSTreeNode[], edges: DSEdge[], highlight: string[], desc: string, line: number, msg: string, info?: Record<string, string>): DSStep => {
      const st = cloneState(base)
      st.treeNodes = nodes
      st.treeEdges = edges
      st.info = info || {}
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(build([], [], [], '初始化 Trie，只有根节点（空字符）。', 2, 'new Trie()', { words: '0' }))

    // insert("cat"): root → c → a → t(end)
    steps.push(build(
      [mkNode('root', '•'), mkNode('c', 'c'), mkNode('a', 'a'), mkNode('t', 't', true)],
      [{ from: 'root', to: 'c' }, { from: 'c', to: 'a' }, { from: 'a', to: 't' }],
      ['c', 'a', 't'],
      'insert("cat")：依次创建 c → a → t 三层节点，t 标记为单词结束。共享前缀从此开始。',
      8,
      'insert("cat")',
      { words: '1' }
    ))
    // insert("car"): reuses c→a, new r(end)
    steps.push(build(
      [mkNode('root', '•'), mkNode('c', 'c'), mkNode('a', 'a'), mkNode('t', 't', true), mkNode('r', 'r', true)],
      [{ from: 'root', to: 'c' }, { from: 'c', to: 'a' }, { from: 'a', to: 't' }, { from: 'a', to: 'r' }],
      ['c', 'a', 'r'],
      'insert("car")：复用已有的 c → a 前缀（无需新建），只新增 r 节点并标记结束。前缀共享节省空间。',
      8,
      'insert("car")（复用 ca）',
      { words: '2' }
    ))
    // insert("dog"): new branch root→d→o→g(end)
    steps.push(build(
      [mkNode('root', '•'), mkNode('c', 'c'), mkNode('a', 'a'), mkNode('t', 't', true), mkNode('r', 'r', true), mkNode('d', 'd'), mkNode('o', 'o'), mkNode('g', 'g', true)],
      [
        { from: 'root', to: 'c' }, { from: 'c', to: 'a' }, { from: 'a', to: 't' }, { from: 'a', to: 'r' },
        { from: 'root', to: 'd' }, { from: 'd', to: 'o' }, { from: 'o', to: 'g' },
      ],
      ['d', 'o', 'g'],
      'insert("dog")：c 与 d 不同，从根开新分支 d → o → g，g 标记结束。',
      8,
      'insert("dog")',
      { words: '3' }
    ))

    const finalNodes = steps[steps.length - 1].state.treeNodes || []
    const finalEdges = steps[steps.length - 1].state.treeEdges || []

    // search("car")
    steps.push(build(
      [...finalNodes], [...finalEdges],
      ['root', 'c', 'a', 'r'],
      'search("car")：从根沿 c → a → r 遍历，到达 r 且 isEnd=true，找到。',
      17,
      'search("car") → true',
      { words: '3' }
    ))

    // startsWith("ca")
    steps.push(build(
      [...finalNodes], [...finalEdges],
      ['root', 'c', 'a'],
      'startsWith("ca")：沿 c → a 遍历，节点存在（无需 isEnd），前缀存在，返回 true。',
      22,
      'startsWith("ca") → true',
      { words: '3' }
    ))

    return steps
  },
}

// ============================================================
// 8. 并查集 Union-Find
// ============================================================
export const unionFindDS: DSDefinition = {
  id: 'union-find',
  name: '并查集',
  category: 'tree',
  icon: '🪢',
  desc: '维护若干不相交集合，支持高效的合并与查找（近 O(1) 均摊）。',
  scenario: '连通性问题、Kruskal 最小生成树、社交网络分组、等价类。',
  code: `public class UnionFind {
    private int[] parent;
    private int[] rank;
    private int count;

    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        count = n;
    }

    public int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // 路径压缩
        return parent[x];
    }

    public void union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return;
        if (rank[rx] < rank[ry]) { int t = rx; rx = ry; ry = t; }
        parent[ry] = rx;
        if (rank[rx] == rank[ry]) rank[rx]++;
        count--;
    }

    public boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}`,
  layout: 'union-find',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { treeNodes: [], treeEdges: [], info: {} }
    // 6 个元素坐标：2行3列
    const P: Record<string, { x: number; y: number }> = {
      e0: { x: 140, y: 90 }, e1: { x: 360, y: 90 }, e2: { x: 580, y: 90 },
      e3: { x: 140, y: 230 }, e4: { x: 360, y: 230 }, e5: { x: 580, y: 230 },
    }
    const mkNode = (id: string): DSTreeNode => ({ id, value: id.slice(1), x: P[id].x, y: P[id].y })
    const allNodes = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'].map(mkNode)

    const build = (edges: DSEdge[], highlight: string[], desc: string, line: number, msg: string, info?: Record<string, string>): DSStep => {
      const st = cloneState(base)
      st.treeNodes = [...allNodes]
      st.treeEdges = edges
      st.info = info || {}
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(build([], [], '初始化 6 个元素，每个自成一集合，parent[i] = i，count = 6。', 2, 'new UnionFind(6)', { count: '6' }))

    // union(0,1): parent[1]=0
    steps.push(build([{ from: 'e1', to: 'e0' }], ['e0', 'e1'], 'union(0,1)：find(0)=0, find(1)=1 不同根，按 rank 合并，parent[1]=0。count = 5。', 18, 'union(0,1)', { count: '5' }))
    // union(2,3): parent[3]=2
    steps.push(build([{ from: 'e1', to: 'e0' }, { from: 'e3', to: 'e2' }], ['e2', 'e3'], 'union(2,3)：parent[3]=2。现在有两个集合 {0,1}、{2,3}。count = 4。', 18, 'union(2,3)', { count: '4' }))
    // union(4,5): parent[5]=4
    steps.push(build([{ from: 'e1', to: 'e0' }, { from: 'e3', to: 'e2' }, { from: 'e5', to: 'e4' }], ['e4', 'e5'], 'union(4,5)：parent[5]=4。三个集合：{0,1}、{2,3}、{4,5}。count = 3。', 18, 'union(4,5)', { count: '3' }))
    // union(0,2): merges {0,1} and {2,3}, parent[2]=0
    steps.push(build(
      [{ from: 'e1', to: 'e0' }, { from: 'e3', to: 'e2' }, { from: 'e5', to: 'e4' }, { from: 'e2', to: 'e0' }],
      ['e0', 'e2'],
      'union(0,2)：合并 {0,1} 和 {2,3}，parent[2]=0。现在 {0,1,2,3} 为一大集合。count = 2。',
      18, 'union(0,2)', { count: '2' }
    ))
    // find(3): 3→2→0, path compression
    steps.push(build(
      [{ from: 'e1', to: 'e0' }, { from: 'e2', to: 'e0' }, { from: 'e3', to: 'e0' }, { from: 'e5', to: 'e4' }],
      ['e3', 'e2', 'e0'],
      'find(3)：3 的父是 2，2 的父是 0，0 是根。返回 0。路径压缩后 parent[3]=0（直接指向根）。',
      11, 'find(3) → 0', { count: '2' }
    ))
    // connected(1,3): both root 0
    steps.push(build(
      [{ from: 'e1', to: 'e0' }, { from: 'e2', to: 'e0' }, { from: 'e3', to: 'e0' }, { from: 'e5', to: 'e4' }],
      ['e1', 'e0', 'e3'],
      'connected(1,3)：find(1)=0，find(3)=0，同根，返回 true。1 和 3 在同一集合。',
      28, 'connected(1,3) → true', { count: '2' }
    ))

    return steps
  },
}

// ============================================================
// 9. 动态数组 ArrayList
// ============================================================
export const arrayListDS: DSDefinition = {
  id: 'array-list',
  name: '动态数组',
  category: 'linear',
  icon: '📐',
  desc: '自动扩容的数组，随机访问 O(1)，扩容时复制到更大数组。',
  scenario: 'Java ArrayList、Go slice、C++ vector，几乎所有语言的动态列表底层。',
  code: `public class ArrayList<E> {
    private Object[] data = new Object[4];
    private int size = 0;

    public void add(E e) {
        ensureCapacity();
        data[size++] = e;
    }

    public E get(int index) {
        return (E) data[index];
    }

    public E remove(int index) {
        E old = (E) data[index];
        // 后面元素左移填补空缺
        for (int i = index; i < size - 1; i++)
            data[i] = data[i + 1];
        data[--size] = null;
        return old;
    }

    private void ensureCapacity() {
        if (size == data.length) {
            data = Arrays.copyOf(data, size * 2); // 扩容 2 倍
        }
    }
}`,
  layout: 'array-list',
  generateSteps: () => {
    const steps: DSStep[] = []
    const base: DSState = { elements: [], capacity: 4, info: {} }

    steps.push({
      description: '初始化动态数组，容量 capacity = 4，size = 0（4 个空槽）。',
      codeLine: 2,
      state: cloneState(base),
      message: 'new ArrayList()',
    })

    const mk = (desc: string, line: number, els: string[], cap: number, msg?: string, highlight?: string[]): DSStep => {
      const st = cloneState(base)
      st.elements = els.map((v, i) => ({ id: `n${i}`, value: v }))
      st.capacity = cap
      st.info = { size: String(els.length), capacity: String(cap) }
      return { description: desc, codeLine: line, state: st, highlight, message: msg }
    }

    steps.push(mk('add(10)：size < capacity，直接放入索引 0，size = 1。', 7, ['10'], 4, 'add(10)', ['n0']))
    steps.push(mk('add(20)：放入索引 1，size = 2。', 7, ['10', '20'], 4, 'add(20)', ['n1']))
    steps.push(mk('add(30)：放入索引 2，size = 3。', 7, ['10', '20', '30'], 4, 'add(30)', ['n2']))
    steps.push(mk('add(40)：放入索引 3，size = 4，数组已满！', 7, ['10', '20', '30', '40'], 4, 'add(40) → 满', ['n3']))
    steps.push(mk('add(50)：数组已满，触发扩容！容量 4 → 8，复制旧元素，再放入 50，size = 5。', 24, ['10', '20', '30', '40', '50'], 8, 'add(50) → 扩容 2x', ['n4']))
    steps.push(mk('get(1)：随机访问，O(1) 直接定位，返回 data[1] = 20。', 11, ['10', '20', '30', '40', '50'], 8, 'get(1) → 20', ['n1']))
    steps.push(mk('remove(2)：删除索引 2 的 30，后面元素 40、50 左移填补，size = 4。', 14, ['10', '20', '40', '50'], 8, 'remove(2) → 30', ['n2', 'n3']))

    return steps
  },
}

// ============================================================
// 导出全部
// ============================================================
export const allDataStructures: DSDefinition[] = [
  stackDS,
  queueDS,
  linkedListDS,
  hashMapDS,
  bstDS,
  heapDS,
  trieDS,
  unionFindDS,
  arrayListDS,
]
