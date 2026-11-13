// ============================================================
// lsmTreeDefinition.ts — LSM-Tree 与布隆过滤器
// 演示主线：MemTable 写满刷盘 → 三个 L0 SSTable
// → get(f) 被 L0-1 的布隆过滤器整表跳过，在 L0-2 命中
// → get(z) 三张表全部跳过，直接返回 null
// → 后台 compaction 把 L0 归并为有序的 L1。
// ============================================================

export interface LsmEntry {
  key: string
  value: number
}

export interface LsmTable {
  id: string
  level: 'L0' | 'L1'
  entries: LsmEntry[]
  bloom: number[] // 16 位：0/1（8 位在 12 个 key 下会全满，无法演示整表跳过）
}

export interface LsmState {
  memTable: LsmEntry[]
  memCapacity: number
  tables: LsmTable[]
  readingTableId: string | null // 'mem' 表示正在查 MemTable
  bloomCheck: { tableId: string; bits: number[]; hit: boolean; query: number[] } | null
  foundValue: number | null
  compaction: { sources: string[]; target: string } | null
  writeOps: number
  readOps: number
}

export interface LsmStep {
  description: string
  codeLine: number
  state: LsmState
}

export interface LsmTreeDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => LsmStep[]
}

const code = `class LsmTree {
    List<Entry> memTable = new ArrayList<>();  // 内存有序表
    int memLimit = 4;

    void put(String key, int value) {
        memTable.add(new Entry(key, value));
        Collections.sort(memTable);
        if (memTable.size() >= memLimit) flush();  // 写满就刷盘
    }

    void flush() {
        List<Entry> sorted = memTable;
        L0.add(new SSTable(sorted, bloomOf(sorted))); // 新表进 L0
        memTable.clear();
        if (L0.size() > 2) compact();              // L0 太多 → 合并
    }

    Integer get(String key) {
        Entry hit = search(memTable, key);
        if (hit != null) return hit.value;         // 内存命中
        for (SSTable t : L0) {
            if (!t.bloom.mightContain(key)) continue; // 整表跳过
            hit = search(t.entries, key);
            if (hit != null) return hit.value;
        }
        for (SSTable t : L1) {
            if (!t.bloom.mightContain(key)) continue;
            hit = search(t.entries, key);
            if (hit != null) return hit.value;
        }
        return null;                               // 一定不存在
    }

    void compact() {                               // L0 → L1 多路归并
        List<Entry> merged = mergeSort(L0, L1);
        L1 = List.of(new SSTable(merged, bloomOf(merged)));
        L0.clear();                                // 写放大来自这里
    }
}`

// 每个 key 在 16 位布隆过滤器上的两个哈希位（预先算好，演示内固定）
const BLOOM_BITS: Record<string, number[]> = {
  a: [7, 2],
  b: [14, 15],
  c: [5, 12],
  d: [12, 9],
  e: [3, 6],
  f: [10, 3],
  g: [1, 0],
  h: [8, 13],
  i: [15, 10],
  j: [6, 7],
  k: [13, 4],
  l: [4, 1],
}
// z 的两个哈希位：位 11 从未被 a..l 置 1 → 所有表都能确定性跳过
const Z_BITS = [11, 6]

const ENTRIES: LsmEntry[] = 'abcdefghijkl'.split('').map((key, index) => ({ key, value: index + 1 }))

const bloomOf = (entries: LsmEntry[]): number[] => {
  const bits = new Array(16).fill(0)
  for (const entry of entries) {
    for (const bit of BLOOM_BITS[entry.key] ?? []) bits[bit] = 1
  }
  return bits
}

function generateSteps(): LsmStep[] {
  const steps: LsmStep[] = []
  const state: LsmState = {
    memTable: [],
    memCapacity: 4,
    tables: [],
    readingTableId: null,
    bloomCheck: null,
    foundValue: null,
    compaction: null,
    writeOps: 0,
    readOps: 0,
  }

  const push = (description: string, codeLine: number, patch: Partial<LsmState> = {}) => {
    Object.assign(state, patch)
    steps.push({
      description,
      codeLine,
      state: {
        memTable: state.memTable.map((entry) => ({ ...entry })),
        memCapacity: state.memCapacity,
        tables: state.tables.map((table) => ({
          ...table,
          entries: table.entries.map((entry) => ({ ...entry })),
          bloom: [...table.bloom],
        })),
        readingTableId: state.readingTableId,
        bloomCheck: state.bloomCheck
          ? { ...state.bloomCheck, bits: [...state.bloomCheck.bits], query: [...state.bloomCheck.query] }
          : null,
        foundValue: state.foundValue,
        compaction: state.compaction
          ? { sources: [...state.compaction.sources], target: state.compaction.target }
          : null,
        writeOps: state.writeOps,
        readOps: state.readOps,
      },
    })
  }

  const byId = (id: string) => state.tables.find((table) => table.id === id)

  // 步骤 1：初始化
  push(
    '初始化：空的 MemTable（容量 4），L0 / L1 都没有 SSTable。写入先进入内存有序表，写满才刷成磁盘上的有序文件 —— 这就是 LSM 的「顺序写」。',
    1,
    { memTable: [], tables: [], readingTableId: null, bloomCheck: null, foundValue: null, compaction: null },
  )

  // 步骤 2-5：写入 a..d
  for (const entry of ENTRIES.slice(0, 4)) {
    state.memTable = [...state.memTable, { ...entry }].sort((a, b) => a.key.localeCompare(b.key))
    state.writeOps += 1
    push(
      `put(${entry.key}, ${entry.value})：写入 MemTable（${state.memTable.length}/${state.memCapacity}），表内始终按 key 有序。`,
      6,
      { readingTableId: null, bloomCheck: null, foundValue: null },
    )
  }

  // 步骤 6：刷盘 L0-1
  const table01: LsmTable = { id: 'L0-1', level: 'L0', entries: [...state.memTable], bloom: bloomOf(state.memTable) }
  state.tables = [table01]
  state.memTable = []
  push(
    'MemTable 达到容量 4，flush：整表刷成 SSTable L0-1（a..d），同时按 key 建立布隆过滤器。MemTable 清空，可以继续接收写入。',
    13,
    { readingTableId: null, bloomCheck: null },
  )

  // 步骤 7-10：写入 e..h
  for (const entry of ENTRIES.slice(4, 8)) {
    state.memTable = [...state.memTable, { ...entry }].sort((a, b) => a.key.localeCompare(b.key))
    state.writeOps += 1
    push(
      `put(${entry.key}, ${entry.value})：MemTable ${state.memTable.length}/${state.memCapacity}。`,
      6,
      { readingTableId: null, bloomCheck: null, foundValue: null },
    )
  }

  // 步骤 11：刷盘 L0-2
  const table02: LsmTable = { id: 'L0-2', level: 'L0', entries: [...state.memTable], bloom: bloomOf(state.memTable) }
  state.tables = [...state.tables, table02]
  state.memTable = []
  push('再次写满，flush 出 L0-2（e..h）。L0 现在有两张表。', 13, { readingTableId: null, bloomCheck: null })

  // 步骤 12-15：写入 i..l
  for (const entry of ENTRIES.slice(8, 12)) {
    state.memTable = [...state.memTable, { ...entry }].sort((a, b) => a.key.localeCompare(b.key))
    state.writeOps += 1
    push(
      `put(${entry.key}, ${entry.value})：MemTable ${state.memTable.length}/${state.memCapacity}。`,
      6,
      { readingTableId: null, bloomCheck: null, foundValue: null },
    )
  }

  // 步骤 16：刷盘 L0-3
  const table03: LsmTable = { id: 'L0-3', level: 'L0', entries: [...state.memTable], bloom: bloomOf(state.memTable) }
  state.tables = [...state.tables, table03]
  state.memTable = []
  push('flush 出 L0-3（i..l）。12 次写入只产生 3 次顺序落盘，没有任何随机写。', 13, {
    readingTableId: null,
    bloomCheck: null,
  })

  // 步骤 17：get(f) 查 MemTable
  state.readOps += 1
  push('get(f)：先在 MemTable 里找 —— 空表，未命中，只能去磁盘上的 L0 逐张检查。', 19, {
    readingTableId: 'mem',
    bloomCheck: null,
    foundValue: null,
  })

  // 步骤 18：L0-1 布隆判定
  const fBits = BLOOM_BITS.f
  const checkBloom = (table: LsmTable, query: number[], hit: boolean, description: string, codeLine = 22) => {
    push(description, codeLine, {
      readingTableId: table.id,
      bloomCheck: { tableId: table.id, bits: [...table.bloom], hit, query: [...query] },
      foundValue: null,
    })
  }
  checkBloom(
    table01,
    fBits,
    fBits.every((bit) => table01.bloom[bit] === 1),
    '查 L0-1 的布隆过滤器：f 的两个哈希位是 10 和 3，L0-1 里位 10 = 0 → f 一定不在 L0-1。',
  )

  // 步骤 19：跳过 L0-1
  push('布隆过滤器判定「一定不存在」→ 整张 L0-1 直接跳过，4 条数据一条都没读。这就是布隆过滤器省掉的磁盘 IO。', 22, {
    readingTableId: null,
    bloomCheck: null,
    foundValue: null,
  })

  // 步骤 20：L0-2 布隆判定
  checkBloom(
    table02,
    fBits,
    true,
    '查 L0-2 的布隆过滤器：位 10 = 1，位 3 = 1 → f 可能存在。注意布隆过滤器只能给出「一定不存在」，「可能存在」需要真去表里确认。',
  )

  // 步骤 21：扫描 L0-2
  state.readingTableId = 'L0-2'
  push('扫描 L0-2 的有序数据（e、f、g、h）：第 2 条就是 f = 6。L0 由新到旧，找到即可返回。', 23, {
    foundValue: 6,
    bloomCheck: null,
  })

  // 步骤 22：返回 6
  push('返回 6。本次读只真正读了一张表（L0-2）—— 布隆过滤器把 L0-1 的 4 条数据块直接省掉了。', 24, {
    readingTableId: null,
    foundValue: 6,
  })

  // 步骤 23：get(z) 查 MemTable
  state.readOps += 1
  push('get(z)：MemTable 还是空，去 L0 找。', 19, { readingTableId: 'mem', bloomCheck: null, foundValue: null })

  // 步骤 24-26：三张 L0 布隆全部跳过
  for (const table of [...state.tables]) {
    checkBloom(
      table,
      Z_BITS,
      false,
      `查 ${table.id} 的布隆：z 的哈希位是 11 和 6，${table.id} 的位 11 = 0 → z 一定不在 ${table.id}，跳过。`,
    )
  }

  // 步骤 27：返回 null
  push('三张 L0 全部被布隆过滤器否决：z 不存在，返回 null。检查了 3 张表，实际读的数据块是 0 个。', 31, {
    readingTableId: null,
    bloomCheck: null,
    foundValue: null,
  })

  // 步骤 28：触发 compaction
  push(
    '后台 compaction：L0 已经有 3 张表，超过阈值 2。继续积累会让读路径越来越慢，必须合并。',
    15,
    { compaction: { sources: ['L0-1', 'L0-2', 'L0-3'], target: 'L1-1' } },
  )

  // 步骤 29：选择 sources
  push('选择 L0-1 / L0-2 / L0-3 作为合并来源，目标是最底层的 L1-1。', 35, {
    compaction: { sources: ['L0-1', 'L0-2', 'L0-3'], target: 'L1-1' },
  })

  // 步骤 30：多路归并
  push(
    '多路归并：三张各 4 条的有序表合成一张 12 条的有序表（a..l）。12 条数据全部重写一遍 —— 这就是 LSM 的写放大。',
    35,
    { compaction: { sources: ['L0-1', 'L0-2', 'L0-3'], target: 'L1-1' } },
  )

  // 步骤 31：写出 L1-1，清空 L0
  const mergedEntries = [...ENTRIES]
  const tableL1: LsmTable = { id: 'L1-1', level: 'L1', entries: mergedEntries, bloom: bloomOf(mergedEntries) }
  state.tables = [tableL1]
  push('L1-1 落盘：a..l 全部有序，配上新的布隆过滤器；L0 三张表清空。之后读路径只需查 L1 这一层。', 36, {
    compaction: null,
    readingTableId: null,
    bloomCheck: null,
  })

  // 步骤 32：L1 布隆
  checkBloom(
    tableL1,
    Z_BITS,
    false,
    'L1-1 的布隆是全部 key 的并集：位 11 依然为 0 → 查 z 同样一眼跳过整层。',
    27,
  )

  // 步骤 33：结论
  push(
    '结论：LSM 用顺序写 + 后台 compaction 换高吞吐，代价是写放大；布隆过滤器把「一定不存在」的 SSTable 整层砍掉，缓解读放大。对比 B+ 树：原地更新、读稳定，但写要随机落盘。',
    37,
    { readingTableId: null, bloomCheck: null, compaction: null },
  )

  // 避免未使用告警（byId 保留给后续扩展查询定位）
  void byId

  return steps
}

export const lsmTreeDefinition: LsmTreeDefinition = {
  id: 'lsm-tree',
  name: 'LSM-Tree 与布隆过滤器',
  icon: '🧱',
  desc: 'MemTable 刷盘、分层 SSTable 与 compaction 合并；读路径用布隆过滤器整层跳过。',
  scenario: 'RocksDB / LevelDB / HBase、KV 存储选型',
  code,
  generateSteps,
}
