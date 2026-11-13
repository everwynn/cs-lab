// ============================================================
// raftDefinition.ts — Raft 选举与日志复制
// 四幕连续剧（39 步）：
//   幕一（1-8）   term1 选举：C 超时 → 拉票 → 3 票当选 → 心跳稳定
//   幕二（9-19）  日志复制：x=1 提交闭环；E 掉线落后；y=2 本地追加后 C 宕机
//   幕三（20-32） 两次选举：E 落后竞选被拒（term2）→ A 当选（term3）
//                 → y 提交（2 份不足 → 3 份提交）→ E 追平
//   幕四（33-39） 旧 Leader 回归：C 臣服 → nextIndex 回退 → 截断覆盖 → 收敛
// ============================================================

export type RaftRole = 'follower' | 'candidate' | 'leader' | 'offline'

export interface RaftEntry {
  index: number // 1-based
  term: number
  command: string // 'x=1' / 'y=2'
}

export interface RaftNodeState {
  id: string // 'A'..'E'
  role: RaftRole
  term: number
  votedFor: string | null
  votes: number // 当前任期票数（含自投）
  timeoutMs: number // 随机选举超时（展示用）
  log: RaftEntry[]
  commitIndex: number
  kv: Record<string, string> // 已应用的状态机
}

export type RaftMessageType =
  | 'requestVote'
  | 'granted'
  | 'denied'
  | 'appendEntries'
  | 'ack'
  | 'heartbeat'

export interface RaftMessage {
  id: string
  type: RaftMessageType
  from: string
  to: string | 'ALL'
  term: number
  detail?: string
}

export type RaftPhase = 'election' | 'replication' | 'failover' | 'converged'

export interface RaftState {
  nodes: RaftNodeState[]
  messages: RaftMessage[] // 在途消息
  clientRequest: string | null
  phase: RaftPhase
  note: string | null // 底部关键提示
  cutting: { nodeId: string; index: number } | null // 正在截断的日志格
}

export interface RaftStep {
  description: string
  codeLine: number
  state: RaftState
  highlight?: string[] // 高亮节点 id
}

export interface RaftDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => RaftStep[]
}

const code = `class RaftNode {
    int currentTerm; String votedFor;            // 任期 / 本任期投票
    Role role = Role.FOLLOWER;
    List<Entry> log = new ArrayList<>();         // index 从 1 开始
    int commitIndex, applied;
    Map<String, String> kv = new HashMap<>();

    // ---------- 1) 选举 ----------
    void onElectionTimeout() {
        currentTerm++; role = Role.CANDIDATE;
        votedFor = id; votes = 1;                // 先投自己
        for (RaftNode peer : peers())
            peer.send(new RequestVote(currentTerm,
                log.size(), lastLogTerm()));
    }

    boolean handleRequestVote(RequestVote req) {
        if (req.term < currentTerm) return false;
        if (req.term > currentTerm) {            // 先追随更高任期
            currentTerm = req.term;
            votedFor = null;
            role = Role.FOLLOWER;
        }
        boolean logOk = req.lastLogTerm > lastLogTerm()
            || (req.lastLogTerm == lastLogTerm()
                && req.lastLogIndex >= log.size());
        if (!logOk) return false;                // 日志落后，拒绝投票
        if (votedFor != null && !votedFor.equals(req.candidateId))
            return false;                        // 一个任期只投一票
        votedFor = req.candidateId;
        return true;
    }

    void onVoteGranted() {
        if (++votes >= peers() / 2 + 1) {        // 3 / 5 即多数派
            role = Role.LEADER;
            broadcastHeartbeat();                // 当选立即发心跳
        }
    }

    // ---------- 2) 日志复制 ----------
    void onClientCommand(String cmd) {
        if (role != Role.LEADER) return;
        log.add(new Entry(log.size() + 1, currentTerm, cmd));
        broadcastNext();
    }

    void handleAppendEntries(AppendEntries req) {
        if (req.term < currentTerm) return;
        if (req.term > currentTerm) {            // 高任期立即臣服
            currentTerm = req.term;
            votedFor = null;
            role = Role.FOLLOWER;
        }
        while (log.size() > req.prevLogIndex
            && log.get(req.prevLogIndex).term != req.prevLogTerm)
            log.remove(log.size() - 1);          // 截断冲突条目
        for (Entry e : req.entries)
            if (log.size() < e.index) log.add(e); // 追加缺失条目
        commitIndex = Math.min(req.leaderCommit, log.size());
        applyCommitted();
    }

    // ---------- 3) 提交推进 ----------
    void onAppendReply(String peer, boolean ok, int match) {
        if (ok) { matchIndex.put(peer, match); advanceCommitIndex(); }
        else { nextIndex.put(peer, nextIndex.get(peer) - 1); retry(peer); }
    }

    void advanceCommitIndex() {
        for (int i = log.size(); i > commitIndex; i--) {
            int cnt = 1;                         // 自己算一票
            for (int m : matchIndex.values())
                if (m >= i) cnt++;
            if (cnt >= peers() / 2 + 1) {        // 过半才提交
                commitIndex = i;
                applyCommitted();
                break;
            }
        }
    }

    void applyCommitted() {
        while (applied < commitIndex)
            kv.put(...);
    }
}`

const IDS = ['A', 'B', 'C', 'D', 'E']
const TIMEOUTS: Record<string, number> = { A: 180, B: 200, C: 150, D: 220, E: 250 }
const MAJORITY = 3

function baseNode(id: string): RaftNodeState {
  return {
    id,
    role: 'follower',
    term: 0,
    votedFor: null,
    votes: 0,
    timeoutMs: TIMEOUTS[id] ?? 0,
    log: [],
    commitIndex: 0,
    kv: {},
  }
}

function cloneNodes(nodes: RaftNodeState[]): RaftNodeState[] {
  return nodes.map((n) => ({
    ...n,
    log: n.log.map((e) => ({ ...e })),
    kv: { ...n.kv },
  }))
}

export function generateSteps(): RaftStep[] {
  const steps: RaftStep[] = []
  let nodes = IDS.map(baseNode)
  let messages: RaftMessage[] = []
  let clientRequest: string | null = null
  let phase: RaftPhase = 'election'
  let note: string | null = null
  let cutting: { nodeId: string; index: number } | null = null
  let msgSeq = 0

  const node = (id: string): RaftNodeState => nodes.find((n) => n.id === id)!
  const msg = (
    from: string,
    to: string | 'ALL',
    type: RaftMessageType,
    term: number,
    detail?: string,
  ): RaftMessage => ({ id: `m${++msgSeq}`, from, to, type, term, detail })

  const snap = (description: string, codeLine: number, highlight?: string[]) => {
    steps.push({
      description,
      codeLine,
      state: {
        nodes: cloneNodes(nodes),
        messages: messages.map((m) => ({ ...m })),
        clientRequest,
        phase,
        note,
        cutting: cutting ? { ...cutting } : null,
      },
      highlight: highlight ? [...highlight] : [],
    })
  }

  // ---------- 幕一 · 选举（term 1） ----------
  snap(
    '集群启动：5 个节点全部是 Follower，term=0、日志为空。每个节点有随机选举超时——C 的 150ms 最短，它将最先触发选举。',
    2,
    [],
  )

  node('C').role = 'candidate'
  node('C').term = 1
  node('C').votedFor = 'C'
  node('C').votes = 1
  note = '选举超时最先意味着本轮选票大概率归 C：随机化超时正是为了避免所有节点同时竞选（split vote）'
  snap(
    'C 选举超时：term 0→1，角色从 Follower 变成 Candidate，并把票投给自己（1 票）。',
    10,
    ['C'],
  )

  messages = [msg('C', 'A', 'requestVote', 1, 'lastLog=0/0'), msg('C', 'B', 'requestVote', 1, 'lastLog=0/0'), msg('C', 'D', 'requestVote', 1, 'lastLog=0/0'), msg('C', 'E', 'requestVote', 1, 'lastLog=0/0')]
  note = 'RequestVote 携带任期和候选人最后一条日志的 (index, term)，供投票者判断候选人日志是否足够新'
  snap(
    'C 向 A、B、D、E 并行广播 RequestVote(term=1, lastLogIndex=0, lastLogTerm=0)。',
    13,
    ['C'],
  )

  node('A').term = 1
  node('A').votedFor = 'C'
  messages = messages.filter((m) => m.to !== 'A')
  messages.push(msg('A', 'C', 'granted', 1, '日志不旧，投票'))
  note = '投票判定顺序：先比较任期，再把票投给日志不旧的候选人；一个任期只投一票'
  snap(
    'A 收到拉票：term 1>0 → 更新本地 term=1、清空 votedFor；日志同样新 → 投 C，回 granted。',
    17,
    ['A', 'C'],
  )

  node('B').term = 1
  node('B').votedFor = 'C'
  messages = messages.filter((m) => m.to !== 'B')
  messages.push(msg('B', 'C', 'granted', 1, '日志不旧，投票'))
  snap(
    'B 同样把票投给 C：term 一致、候选日志不旧。A、B 的回执正在路上。',
    30,
    ['B', 'C'],
  )

  node('C').votes = 3
  node('C').role = 'leader'
  messages = [msg('C', 'D', 'requestVote', 1, 'lastLog=0/0'), msg('C', 'E', 'requestVote', 1, 'lastLog=0/0')]
  note = '多数派门槛 = 3（5 节点过半）。D、E 的票还在路上，但已不影响结果'
  snap(
    'C 收到 A、B 的回执：票数 3 ≥ 多数派 3，当选 term=1 的 Leader——无需等 D、E 的回复。',
    35,
    ['C'],
  )

  messages = [msg('C', 'A', 'heartbeat', 1, 'prev=0 entries=[]'), msg('C', 'B', 'heartbeat', 1, 'prev=0 entries=[]'), msg('C', 'D', 'heartbeat', 1, 'prev=0 entries=[]'), msg('C', 'E', 'heartbeat', 1, 'prev=0 entries=[]')]
  note = '心跳本质是一条不带日志的 AppendEntries；周期必须小于选举超时下限'
  snap(
    'C 当选后立即广播心跳（空 AppendEntries，term=1），宣告 Leader 权威。',
    37,
    ['C'],
  )

  messages = []
  note = '选举完成：一个任期（term）至多一个 Leader，这是 Raft 的第一条安全性质'
  snap(
    'A/B/D/E 收到心跳：term 一致，重置各自的选举计时器，集群进入稳定状态。',
    49,
    ['A', 'B', 'D', 'E'],
  )

  // ---------- 幕二 · 日志复制（term 1） ----------
  phase = 'replication'
  clientRequest = 'SET x=1'
  snap(
    '客户端向 Leader C 提交写请求 SET x=1，所有写都必须经过 Leader。',
    42,
    ['C'],
  )

  node('C').log = [{ index: 1, term: 1, command: 'x=1' }]
  note = '日志条目 = (index, term, command)；此刻只在 C 本地，commitIndex 仍为 0'
  snap(
    'C 把 x=1 追加为日志 #1(term=1)。未得到多数派确认前，它不能被提交。',
    44,
    ['C'],
  )

  messages = [msg('C', 'A', 'appendEntries', 1, 'prev=0 entries=[#1]'), msg('C', 'B', 'appendEntries', 1, 'prev=0 entries=[#1]'), msg('C', 'D', 'appendEntries', 1, 'prev=0 entries=[#1]'), msg('C', 'E', 'appendEntries', 1, 'prev=0 entries=[#1]')]
  note = 'AppendEntries 携带 prevLogIndex/prevLogTerm 作为一致性检查点'
  snap(
    'C 向全部节点并行复制 #1：AppendEntries(term=1, prevLogIndex=0, entries=[#1])。',
    45,
    ['C'],
  )

  node('A').log = [{ index: 1, term: 1, command: 'x=1' }]
  messages = messages.filter((m) => m.to !== 'A')
  messages.push(msg('A', 'C', 'ack', 1, 'matchIndex=1'))
  snap(
    'A：prevLogIndex=0 匹配 → 追加 #1 → 回执 matchIndex=1。',
    48,
    ['A'],
  )

  node('B').log = [{ index: 1, term: 1, command: 'x=1' }]
  messages = messages.filter((m) => m.to !== 'B')
  messages.push(msg('B', 'C', 'ack', 1, 'matchIndex=1'))
  note = 'C 侧已有 自己 + A + B = 3 份确认，已达多数派'
  snap(
    'B 同样追加 #1 并回执 matchIndex=1。',
    59,
    ['B'],
  )

  node('D').log = [{ index: 1, term: 1, command: 'x=1' }]
  node('E').role = 'offline'
  messages = messages.filter((m) => m.to !== 'D' && m.to !== 'E')
  messages.push(msg('D', 'C', 'ack', 1, 'matchIndex=1'))
  note = 'E 掉线不会被感知为「失败」，但它的日志已落后——这条伏笔将在幕三兑现'
  snap(
    'D 追加 #1 并回执；E 网络抖动掉线，复制请求未送达（日志仍为空）。',
    59,
    ['D', 'E'],
  )

  node('C').commitIndex = 1
  node('C').kv = { x: '1' }
  messages = []
  note = '提交（commitIndex 前移）与应用（写入状态机）是两步：先记录提交点，再回放'
  snap(
    'C 统计 index1 已有 4 份（自己+A+B+D）≥ 3 → commitIndex 0→1，应用 x=1 到状态机。',
    75,
    ['C'],
  )

  node('A').commitIndex = 1
  node('A').kv = { x: '1' }
  node('B').commitIndex = 1
  node('B').kv = { x: '1' }
  node('D').commitIndex = 1
  node('D').kv = { x: '1' }
  messages = [msg('C', 'A', 'heartbeat', 1, 'leaderCommit=1'), msg('C', 'B', 'heartbeat', 1, 'leaderCommit=1'), msg('C', 'D', 'heartbeat', 1, 'leaderCommit=1')]
  note = 'Follower 的提交点由下一次心跳中的 leaderCommit 带动'
  snap(
    'C 的下一次心跳携带 leaderCommit=1 → A/B/D 各自前移提交点并应用 x=1（E 离线收不到）。',
    60,
    ['A', 'B', 'D'],
  )

  messages = []
  note = '此刻 4 个节点的日志和状态机完全一致，只有 E 落后'
  snap(
    '幕二收官：A/B/C/D 的日志对齐为 [#1 x=1]，kv={x:1}。',
    83,
    ['A', 'B', 'C', 'D'],
  )

  clientRequest = 'SET y=2'
  node('C').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 1, command: 'y=2' },
  ]
  note = '这条 #2 尚未复制给任何节点，也未提交——它是后面「可能丢失」的日志'
  snap(
    '客户端又提交 SET y=2：C 把它追加为 #2(term=1)，尚未复制、尚未提交。',
    44,
    ['C'],
  )

  node('C').role = 'offline'
  note = '#2 只存在于 C 本地；Raft 只保证「已提交」的日志不丢，未提交的可以丢'
  snap(
    'C 突然宕机。它带走了未提交的 #2 y=2，集群失去了 Leader。',
    3,
    ['C'],
  )

  // ---------- 幕三 · 两次选举（term2 失败 / term3 成功） ----------
  phase = 'failover'
  node('E').role = 'candidate'
  node('E').term = 2
  node('E').votedFor = 'E'
  node('E').votes = 1
  note = '离线期间 E 的选举计时器反复超时，term 已涨到 2——但它的日志是空的'
  snap(
    'E 恢复上线（它的日志仍为空）：立即带着 term=2 发起竞选，自投 1 票。',
    10,
    ['E'],
  )

  messages = [msg('E', 'A', 'requestVote', 2, 'lastLog=0/0'), msg('E', 'B', 'requestVote', 2, 'lastLog=0/0'), msg('E', 'D', 'requestVote', 2, 'lastLog=0/0')]
  note = '候选人只能拿到「日志至少和自己一样新」的节点的票'
  snap(
    'E 向 A/B/D 拉票 RequestVote(term=2, lastLogIndex=0, lastLogTerm=0)。',
    13,
    ['E'],
  )

  node('A').term = 2
  node('A').votedFor = null
  messages = messages.filter((m) => m.to !== 'A')
  messages.push(msg('A', 'E', 'denied', 2, '日志不够新'))
  note = '先跟随更高任期（term 设为 2），再以日志新旧判定拒绝——任期不会挡回请求，日志会'
  snap(
    'A：term 2>1 → 本地 term 更新为 2；但 E 的 lastLogTerm=0 < 本地 1 → 日志不够新，拒绝投票。',
    24,
    ['A', 'E'],
  )

  node('B').term = 2
  node('B').votedFor = null
  node('D').term = 2
  node('D').votedFor = null
  node('E').role = 'follower'
  messages = []
  note = '选举限制（log up-to-date）：日志落后的节点拿不到多数派，永远无法当选——已提交日志因此不会丢失'
  snap(
    'B、D 同样拒绝 → E 仅自投 1 票，竞选失败退回 Follower(term=2)。集群 term 被抬到 2。',
    27,
    ['B', 'D', 'E'],
  )

  node('A').role = 'candidate'
  node('A').term = 3
  node('A').votedFor = 'A'
  node('A').votes = 1
  messages = [msg('A', 'B', 'requestVote', 3, 'lastLog=1/1'), msg('A', 'D', 'requestVote', 3, 'lastLog=1/1'), msg('A', 'E', 'requestVote', 3, 'lastLog=1/1')]
  note = '失败的那轮选举并非白费：它消耗了 term 2，让真正有资格的节点以 term 3 重新开始'
  snap(
    'A 选举超时（180ms 最短在线）：term 2→3，自投 1 票，向 B/D/E 拉票。',
    10,
    ['A'],
  )

  node('B').term = 3
  node('B').votedFor = 'A'
  node('D').term = 3
  node('D').votedFor = 'A'
  node('E').term = 3
  node('E').votedFor = null
  messages = [msg('B', 'A', 'granted', 3, '日志同样新'), msg('D', 'A', 'granted', 3, '日志同样新'), msg('E', 'A', 'denied', 3, '日志落后')]
  note = 'A 与 B/D 的 lastLog 都是 (1,1) → 日志同样新；E 仍为空 → 被拒（不影响结果）'
  snap(
    'B、D 投 A（日志同样新 1/1）；E 日志落后被拒。A 共 3 票，达多数派。',
    30,
    ['B', 'D'],
  )

  node('A').role = 'leader'
  node('A').votes = 3
  node('A').votedFor = 'A'
  messages = [msg('A', 'B', 'heartbeat', 3, 'prev=0 entries=[]'), msg('A', 'D', 'heartbeat', 3, 'prev=0 entries=[]'), msg('A', 'E', 'heartbeat', 3, 'prev=0 entries=[]')]
  note = '任期内 Leader 的唯一性由「一任期一票 + 多数派 3」共同保证'
  snap(
    'A 收到 B、D 回执：3 票 ≥ 3，当选 term=3 的 Leader，立即广播心跳。',
    35,
    ['A'],
  )

  messages = []
  note = 'Leader 需要为每个 Follower 维护 nextIndex —— E 落后，nextIndex 将从更早位置开始'
  snap(
    'B/D/E 接受 term=3 的心跳；E 的日志仍为空，Leader 将从更早位置开始追平它。',
    50,
    ['B', 'D', 'E'],
  )

  clientRequest = 'SET y=2（重试）'
  node('A').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 3, command: 'y=2' },
  ]
  note = '客户端没有收到 C 的确认，于是把同一条写重发给新 Leader A'
  snap(
    '客户端重试 SET y=2：新 Leader A 把它追加为 #2(term=3)，尚未提交。',
    44,
    ['A'],
  )

  messages = [msg('A', 'B', 'appendEntries', 3, 'prev=1 entries=[#2]'), msg('A', 'D', 'appendEntries', 3, 'prev=1 entries=[#2]'), msg('A', 'E', 'appendEntries', 3, 'prev=0 entries=[#1,#2]')]
  note = 'nextIndex 回退：E 的日志是空的，Leader 干脆从 prev=0 把两条日志一起发过去'
  snap(
    'A 广播复制：B/D 从 prev=1 发 #2；E 日志落后，回退 nextIndex 从 prev=0 发 #1+#2 两条。',
    45,
    ['A'],
  )

  node('B').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 3, command: 'y=2' },
  ]
  messages = messages.filter((m) => m.to !== 'B')
  messages.push(msg('B', 'A', 'ack', 3, 'matchIndex=2'))
  note = 'quorum 的严格含义：过半（≥3）才提交；只有 Leader 自己 + 1 个 Follower 是不够的'
  snap(
    'B 回执 matchIndex=2 → A 统计只有 自己+B = 2 份 < 3，还不能提交。',
    75,
    ['A', 'B'],
  )

  node('D').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 3, command: 'y=2' },
  ]
  node('E').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 3, command: 'y=2' },
  ]
  node('A').commitIndex = 2
  node('A').kv = { x: '1', y: '2' }
  messages = []
  note = 'D、E 的回执同时带来 E 的追平：两条日志一次补齐'
  snap(
    'D、E 回执到达：index2 已有 4 份 ≥ 3 → commitIndex 前移到 2，应用 y=2。',
    75,
    ['A'],
  )

  node('B').commitIndex = 2
  node('B').kv = { x: '1', y: '2' }
  node('D').commitIndex = 2
  node('D').kv = { x: '1', y: '2' }
  node('E').commitIndex = 2
  node('E').kv = { x: '1', y: '2' }
  messages = [msg('A', 'B', 'heartbeat', 3, 'leaderCommit=2'), msg('A', 'D', 'heartbeat', 3, 'leaderCommit=2'), msg('A', 'E', 'heartbeat', 3, 'leaderCommit=2')]
  note = 'E 从 0 条追到 2 条：落后不可怕，nextIndex 回退 + 重发就能补齐'
  snap(
    '心跳携带 leaderCommit=2 → B/D/E 应用 y=2；E 的两条日志全部追平，4 节点一致。',
    60,
    ['B', 'D', 'E'],
  )

  // ---------- 幕四 · 旧 Leader 回归与冲突日志覆盖 ----------
  messages = []
  node('C').role = 'follower'
  node('C').term = 1
  node('C').votedFor = 'C'
  node('C').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 1, command: 'y=2' },
  ]
  node('C').commitIndex = 1
  node('C').kv = { x: '1' }
  note = '#2 是 term1 的「孤儿日志」：与 A 在 #2 上的 term3 条目同 index 不同 term，注定被截断'
  snap(
    'C 恢复上线：term 仍是 1，本地日志 [#1 x=1(已提交), #2 y=2(term1, 未提交)]。',
    2,
    ['C'],
  )

  node('C').term = 3
  node('C').votedFor = null
  messages = [msg('A', 'C', 'heartbeat', 3, 'prev=0 entries=[]')]
  note = '旧 Leader 一看到更高 term 的心跳就立即降级——任期就是集群的「时钟」'
  snap(
    'A 的心跳到达 C：term 3>1 → C 更新 term=3、清空 votedFor、转回 Follower（旧 Leader 臣服）。',
    50,
    ['C', 'A'],
  )

  messages = [msg('A', 'C', 'denied', 3, 'prev=2 处 term 不匹配，回退 nextIndex')]
  note = 'prevLogIndex/prevLogTerm 是一致性检查点：对不上就拒绝，Leader 回退 nextIndex 重试'
  snap(
    'A 以 prev=2 试探：C 的 #2 是 term1 ≠ prevLogTerm=3 → 拒绝。Leader 将回退 nextIndex。',
    56,
    ['C', 'A'],
  )

  messages = [msg('A', 'C', 'appendEntries', 3, 'prev=1 entries=[#2(t3)]')]
  cutting = { nodeId: 'C', index: 2 }
  node('C').log = [
    { index: 1, term: 1, command: 'x=1' },
    { index: 2, term: 3, command: 'y=2' },
  ]
  note = '截断规则：从冲突点开始的本地条目全部删除，再写入 Leader 的版本'
  snap(
    'A 回退到 prev=1 重发：C 检测本地 #2 冲突 → 截断删除 #2(term1) → 写入 Leader 的 #2(term3)。',
    57,
    ['C'],
  )

  cutting = null
  messages = []
  node('C').commitIndex = 2
  node('C').kv = { x: '1', y: '2' }
  note = '至此 5 个节点的日志与状态机完全一致——崩溃恢复完成'
  snap(
    'C 应用 y=2：commitIndex 追至 2，5 节点日志完全一致 [#1 x=1(t1), #2 y=2(t3)]。',
    60,
    ['A', 'B', 'C', 'D', 'E'],
  )

  phase = 'converged'
  note = '选举限制 + 多数派提交 + 日志匹配，三条规则共同保证了 Raft 的安全性'
  snap(
    '结论：选举限制让落后的 E 无法当选；quorum 让 2 份回执无法提交；日志匹配让冲突条目被 Leader 覆盖。',
    75,
    ['A', 'B', 'C', 'D', 'E'],
  )

  note = '生产实现中 term/votedFor/log 必须持久化到磁盘，否则重启后会违反选举安全；本演示省略了快照、成员变更与 PreVote'
  snap(
    'Raft 的最终保证：一个任期至多一个 Leader；已提交的日志一定出现在未来的 Leader 中；冲突的未提交日志会被覆盖。',
    83,
    ['A', 'B', 'C', 'D', 'E'],
  )

  return steps
}

export const raftDefinition: RaftDefinition = {
  id: 'raft',
  name: 'Raft 选举与日志复制',
  icon: '🗳️',
  desc: 'Leader 选举、term 与心跳、日志提交，把共识算法拆成可播放的步骤。',
  scenario: '分布式一致性、etcd / TiKV',
  code,
  generateSteps,
}
