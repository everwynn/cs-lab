// ============================================================
// mvccDefinition.ts — 事务隔离与 MVCC：版本链 + ReadView 判定
// 演示主线：T1 修改余额、T2 先后两次读取；
// RR 复用同一 ReadView（两次都读到 1000），
// RC 每次 SELECT 重新生成（第二次读到 2000）。
// ============================================================

export interface MvccVersion {
  id: string
  trxId: number
  balance: number
  committed: boolean
  isUndo: boolean
}

export interface MvccReadView {
  mIds: number[]
  minTrxId: number
  maxTrxId: number
  creatorTrxId: number
  label: string
}

export interface MvccTxnEvent {
  id: string
  trx: 'T1' | 'T2'
  label: 'BEGIN' | 'UPDATE' | 'SELECT' | 'COMMIT'
  detail: string
}

export interface MvccState {
  versions: MvccVersion[]
  checkingVersionId: string | null
  verdict: 'visible' | 'invisible' | null
  readView: MvccReadView | null
  events: MvccTxnEvent[]
  activeTxn: 'T1' | 'T2' | null
  sql: string | null
  result: number | null
  isolation: 'RR' | 'RC'
  phase: 'rr' | 'rc'
  note: string | null
}

export interface MvccStep {
  description: string
  codeLine: number
  message?: string
  state: MvccState
}

export interface MvccDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => MvccStep[]
}

const T1 = 101
const T2 = 102

const code = `class Version {                     // undo log 中的一个版本
    long trxId;                    // 生成该版本的事务 id
    int balance;
    Version rollPtr;               // 指向更早的版本
}

class ReadView {                    // 快照读的可见性依据
    List<Long> mIds;               // 活跃事务 id 列表
    long minTrxId, maxTrxId;       // 活跃事务的最小 / 最大 id
    long creatorTrxId;             // 创建 ReadView 的事务
}

ReadView buildReadView() {
    ReadView rv = new ReadView();
    rv.mIds = activeTransactions();        // 当前未提交的其它事务
    rv.maxTrxId = nextTrxId();             // 下一个待分配的事务 id
    rv.minTrxId = rv.mIds.isEmpty() ? rv.maxTrxId : min(rv.mIds);
    rv.creatorTrxId = currentTrxId;
    return rv;
}

boolean visible(Version v, ReadView rv) {
    if (v.trxId < rv.minTrxId) return true;      // 快照前已结束
    if (v.trxId >= rv.maxTrxId) return false;    // 快照后才开启
    if (rv.mIds.contains(v.trxId)) return false; // 当时仍活跃
    return true;
}

int select(long trxId) {
    ReadView rv = snapshot;         // 快照读：沿用已有 ReadView
    if (rv == null) {               // 第一次 SELECT 才生成
        rv = buildReadView();
        snapshot = rv;
    }
    Version v = latest;
    while (v != null) {
        if (visible(v, rv)) return v.balance;
        v = v.rollPtr;              // 不可见就看更早的版本
    }
    return -1;
}

void update(int balance) {
    Version v = new Version();
    v.trxId = currentTrxId;
    v.balance = balance;
    v.rollPtr = latest;             // 挂到版本链头
    latest = v;
}

void commit() {
    // 提交只改变事务状态，版本仍留在 undo log 中
}`

function generateSteps(): MvccStep[] {
  const steps: MvccStep[] = []
  const state: MvccState = {
    versions: [],
    checkingVersionId: null,
    verdict: null,
    readView: null,
    events: [],
    activeTxn: null,
    sql: null,
    result: null,
    isolation: 'RR',
    phase: 'rr',
    note: null,
  }

  const push = (description: string, codeLine: number, patch: Partial<MvccState> = {}, message?: string) => {
    Object.assign(state, patch)
    steps.push({
      description,
      codeLine,
      message,
      state: {
        ...state,
        versions: state.versions.map((item) => ({ ...item })),
        events: state.events.map((item) => ({ ...item })),
        readView: state.readView ? { ...state.readView, mIds: [...state.readView.mIds] } : null,
      },
    })
  }

  let eventSeq = 0
  const addEvent = (trx: 'T1' | 'T2', label: MvccTxnEvent['label'], detail: string) => {
    state.events = [...state.events, { id: `e${(eventSeq += 1)}`, trx, label, detail }]
  }

  // ---------- RR 阶段 ----------
  push('行记录只有一个版本：balance = 1000，trx_id = 100，已提交。版本链的起点。', 1, {
    versions: [{ id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: false }],
  })

  addEvent('T2', 'BEGIN', 'T2 开始')
  push('T2（trx_id = 102）开启事务。BEGIN 本身不生成 ReadView，第一次快照读时才生成。', 29, {
    activeTxn: 'T2',
  })

  addEvent('T1', 'BEGIN', 'T1 开始')
  push('T1（trx_id = 101）也开启事务，准备修改同一行数据。', 29, {
    activeTxn: 'T1',
  })

  addEvent('T1', 'UPDATE', 'UPDATE balance = 2000')
  push(
    'T1 执行 UPDATE：生成新版本 v2（balance = 2000，trx_id = 101，尚未提交），旧版本 v1 转入 undo log，roll_ptr 指向它。',
    48,
    {
      activeTxn: 'T1',
      sql: 'UPDATE account SET balance = 2000 WHERE id = 1;',
      versions: [
        { id: 'v2', trxId: T1, balance: 2000, committed: false, isUndo: false },
        { id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: true },
      ],
      checkingVersionId: null,
      verdict: null,
      result: null,
    },
  )

  addEvent('T2', 'SELECT', 'SELECT balance')
  push(
    'T2 第一次 SELECT：生成 ReadView（m_ids = [101]，min = 101，max = 103）。这份快照决定了它之后能看见什么。',
    32,
    {
      activeTxn: 'T2',
      sql: 'SELECT balance FROM account WHERE id = 1;',
      readView: { mIds: [T1], minTrxId: T1, maxTrxId: T2 + 1, creatorTrxId: T2, label: 'T2 第一次 SELECT 时生成' },
      checkingVersionId: 'v2',
      verdict: null,
      result: null,
      note: 'RR：第一次 SELECT 生成 ReadView，之后一直复用',
    },
  )

  push(
    '从版本链头开始判定：v2 的 trx_id = 101 在 m_ids 中 → 生成它的事务当时还活着 → 不可见，沿 roll_ptr 继续往回找。',
    25,
    { verdict: 'invisible' },
  )

  push(
    'v1 的 trx_id = 100 < min_trx_id = 101 → 它在快照建立前就已提交 → 可见，返回 balance = 1000。',
    23,
    { checkingVersionId: 'v1', verdict: 'visible', result: 1000 },
    'SELECT → 1000',
  )

  addEvent('T1', 'COMMIT', 'T1 提交')
  push(
    'T1 提交：v2 变为已提交版本。但 T2 手中仍是旧的 ReadView，v2 在其中的可见性不变。',
    52,
    {
      activeTxn: null,
      versions: [
        { id: 'v2', trxId: T1, balance: 2000, committed: true, isUndo: false },
        { id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: true },
      ],
      checkingVersionId: null,
      verdict: null,
    },
  )

  addEvent('T2', 'SELECT', 'SELECT balance（第二次）')
  push(
    'T2 第二次 SELECT（RR）：不生成新 ReadView，继续用第一次的快照，重新沿版本链判定。',
    30,
    {
      activeTxn: 'T2',
      sql: 'SELECT balance FROM account WHERE id = 1;',
      checkingVersionId: 'v2',
      verdict: null,
      result: null,
    },
  )

  push(
    '仍然从 v2 开始：trx_id = 101 依旧在 m_ids 中 → 不可见。即使它现在已经提交，旧快照里它仍是「当时未提交」的事务。',
    25,
    { verdict: 'invisible' },
  )

  push(
    '沿 roll_ptr 到 v1：trx_id = 100 < min → 可见，返回 1000。两次读取结果一致，这就是可重复读。',
    23,
    { checkingVersionId: 'v1', verdict: 'visible', result: 1000 },
    'SELECT → 1000',
  )

  addEvent('T2', 'COMMIT', 'T2 提交')
  push('T2 提交。RR 阶段结束：两次 SELECT 都返回 1000，可重复读成立。', 52, {
    activeTxn: null,
    checkingVersionId: null,
    verdict: null,
  })

  // ---------- RC 阶段 ----------
  push(
    '下面换成 RC（读已提交）再走一遍。RC 的关键区别：每次 SELECT 都重新生成 ReadView。先重置版本链。',
    29,
    {
      phase: 'rc',
      isolation: 'RC',
      versions: [{ id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: false }],
      readView: null,
      events: [],
      activeTxn: null,
      sql: null,
      result: null,
      checkingVersionId: null,
      verdict: null,
      note: 'RC：每次 SELECT 重新生成 ReadView',
    },
  )

  addEvent('T1', 'BEGIN', 'T1 开始')
  push('T1（trx_id = 101）开始。', 29, { activeTxn: 'T1' })

  addEvent('T1', 'UPDATE', 'UPDATE balance = 2000')
  push(
    'T1 更新：生成 v2（未提交），v1 转入 undo log。',
    48,
    {
      sql: 'UPDATE account SET balance = 2000 WHERE id = 1;',
      versions: [
        { id: 'v2', trxId: T1, balance: 2000, committed: false, isUndo: false },
        { id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: true },
      ],
      checkingVersionId: 'v2',
      verdict: null,
      result: null,
    },
  )

  addEvent('T2', 'BEGIN', 'T2 开始')
  addEvent('T2', 'SELECT', 'SELECT balance（第一次）')
  push(
    'T2（trx_id = 102）开始并第一次 SELECT：此时活跃事务只有 T1，ReadView 为 m_ids = [101]，min = 101，max = 103。',
    32,
    {
      activeTxn: 'T2',
      sql: 'SELECT balance FROM account WHERE id = 1;',
      readView: { mIds: [T1], minTrxId: T1, maxTrxId: T2 + 1, creatorTrxId: T2, label: 'T2 第一次 SELECT 时生成' },
      checkingVersionId: 'v2',
      verdict: null,
      result: null,
      note: 'RC：每次 SELECT 重新生成 ReadView',
    },
  )

  push('判定 v2：trx_id = 101 在 m_ids 中 → 不可见。', 25, { verdict: 'invisible' })
  push('v1 可见 → 返回 1000。第一次读取结果与 RR 相同。', 23, { checkingVersionId: 'v1', verdict: 'visible', result: 1000 }, 'SELECT → 1000')

  addEvent('T1', 'COMMIT', 'T1 提交')
  push('T1 提交，v2 变为已提交。', 52, {
    activeTxn: null,
    versions: [
      { id: 'v2', trxId: T1, balance: 2000, committed: true, isUndo: false },
      { id: 'v1', trxId: 100, balance: 1000, committed: true, isUndo: true },
    ],
    checkingVersionId: null,
    verdict: null,
  })

  addEvent('T2', 'SELECT', 'SELECT balance（第二次）')
  push(
    'T2 第二次 SELECT（RC）：重新生成 ReadView —— 此时 T1 已提交，活跃列表为空，min = max = 103。',
    32,
    {
      activeTxn: 'T2',
      sql: 'SELECT balance FROM account WHERE id = 1;',
      readView: { mIds: [], minTrxId: T2 + 1, maxTrxId: T2 + 1, creatorTrxId: T2, label: 'RC：第二次 SELECT 重新生成' },
      checkingVersionId: 'v2',
      verdict: null,
      result: null,
    },
  )

  push(
    '判定 v2：trx_id = 101 < min_trx_id = 103 → 可见，返回 balance = 2000。同一事务两次读取结果不同，这就是不可重复读。',
    23,
    { verdict: 'visible', result: 2000 },
    'SELECT → 2000',
  )

  push(
    '结论：同一段并发操作，RR 两次都读到 1000，RC 第二次读到 2000。唯一的变量是 ReadView 的生成时机 —— 快照读的隔离性就建立在这里。',
    30,
    { checkingVersionId: null, verdict: null },
    'RR → 1000, 1000 | RC → 1000, 2000',
  )

  return steps
}

export const mvccDefinition: MvccDefinition = {
  id: 'mvcc',
  name: '事务隔离与 MVCC',
  icon: '🔀',
  desc: 'undo log 版本链、ReadView 与隔离级别，解释不可重复读与幻读是怎么被解决的。',
  scenario: 'MySQL 事务、并发控制、面试高频',
  code,
  generateSteps,
}
