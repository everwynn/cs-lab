// ============================================================
// gitDefinitions.ts — Git 工作流可视化：5 个主题定义与步骤生成器
// ============================================================

export interface GitCommit {
  id: string
  label: string
  branch: string
  x: number
  y: number
  color: string
  parents: string[]
}

export interface GitBranch {
  name: string
  color: string
  head: string
}

export interface GitStep {
  commits: GitCommit[]
  branches: GitBranch[]
  head: string
  stagingArea?: string[]
  workingDir?: string[]
  highlight: string[]
  message?: string
  codeLine: number
  description: string
}

export interface GitTopicDefinition {
  id: string
  name: string
  icon: string
  desc: string
  scenario: string
  code: string
  generateSteps: () => GitStep[]
}

// ── 工具函数 ─────────────────────────────────────────────────
const BRANCH_COLORS: Record<string, string> = {
  main: '#3b82f6',
  master: '#3b82f6',
  develop: '#8b5cf6',
  feature: '#10b981',
  'feature/login': '#10b981',
  'feature/pay': '#f59e0b',
  release: '#f97316',
  hotfix: '#ef4444',
  'hotfix/login-fix': '#ef4444',
  bugfix: '#ec4899',
}

function c(id: string, label: string, branch: string, x: number, y: number, parents: string[] = []): GitCommit {
  return { id, label, branch, x, y, color: BRANCH_COLORS[branch] || '#6b7280', parents }
}

function b(name: string, head: string): GitBranch {
  return { name, color: BRANCH_COLORS[name] || '#6b7280', head }
}

function mkStep(opts: {
  commits: GitCommit[]
  branches: GitBranch[]
  head: string
  stagingArea?: string[]
  workingDir?: string[]
  highlight: string[]
  message?: string
  codeLine: number
  description: string
}): GitStep {
  return {
    commits: opts.commits.map(c => ({ ...c })),
    branches: opts.branches.map(b => ({ ...b })),
    head: opts.head,
    stagingArea: opts.stagingArea,
    workingDir: opts.workingDir,
    highlight: opts.highlight,
    message: opts.message,
    codeLine: opts.codeLine,
    description: opts.description,
  }
}

// ============================================================
// 1. Git 基础流程 — init → add → commit → log
// ============================================================
function generateBasicsSteps(): GitStep[] {
  const steps: GitStep[] = []
  let commits: GitCommit[] = []
  let branches: GitBranch[] = []
  let head = ''
  let staging: string[] = []
  let working: string[] = []

  // Step 1: 初始工作区
  steps.push(mkStep({
    commits, branches, head,
    workingDir: [],
    highlight: [],
    codeLine: 1,
    description: '开始：一个空的项目目录，准备初始化 Git 仓库',
  }))

  // Step 2: git init
  branches = [b('main', '')]
  steps.push(mkStep({
    commits, branches, head: 'main',
    highlight: [],
    codeLine: 2,
    description: 'git init：在当前目录初始化一个新的 Git 仓库，创建 main 分支',
  }))

  // Step 3: 创建文件（工作区）
  working = ['index.html']
  steps.push(mkStep({
    commits, branches, head: 'main',
    workingDir: working,
    highlight: [],
    codeLine: 3,
    description: '创建 index.html 文件，此时文件在工作区（Working Directory），尚未被 Git 追踪',
  }))

  // Step 4: git add index.html
  staging = ['index.html']
  working = []
  steps.push(mkStep({
    commits, branches, head: 'main',
    stagingArea: staging, workingDir: working,
    highlight: [],
    codeLine: 4,
    description: 'git add index.html：将文件从工作区移入暂存区（Staging Area），准备提交',
  }))

  // Step 5: git commit -m "init: add index.html"
  commits = [c('a1b2c3d', 'init: add index.html', 'main', 0, 0)]
  branches = [b('main', 'a1b2c3d')]
  staging = []
  steps.push(mkStep({
    commits, branches, head: 'main',
    stagingArea: staging,
    highlight: ['a1b2c3d'],
    codeLine: 5,
    description: 'git commit：将暂存区的变更提交到仓库，生成 commit a1b2c3d，main 分支向前移动',
  }))

  // Step 6: 再创建文件
  working = ['style.css']
  steps.push(mkStep({
    commits, branches, head: 'main',
    workingDir: working,
    highlight: ['a1b2c3d'],
    codeLine: 3,
    description: '创建 style.css 文件，文件在工作区',
  }))

  // Step 7: git add style.css
  staging = ['style.css']
  working = []
  steps.push(mkStep({
    commits, branches, head: 'main',
    stagingArea: staging,
    highlight: ['a1b2c3d'],
    codeLine: 4,
    description: 'git add style.css：将 style.css 加入暂存区',
  }))

  // Step 8: git commit
  commits = [
    c('a1b2c3d', 'init: add index.html', 'main', 0, 0),
    c('e4f5g6h', 'feat: add style.css', 'main', 0, 1, ['a1b2c3d']),
  ]
  branches = [b('main', 'e4f5g6h')]
  steps.push(mkStep({
    commits, branches, head: 'main',
    highlight: ['e4f5g6h'],
    codeLine: 5,
    description: 'git commit -m "feat: add style.css"：第二次提交，commit e4f5g6h，形成线性历史',
  }))

  // Step 9: git log
  steps.push(mkStep({
    commits, branches, head: 'main',
    highlight: ['e4f5g6h', 'a1b2c3d'],
    codeLine: 6,
    description: 'git log：查看提交历史，从最新提交往回追溯 parent 链，显示所有 commit',
  }))

  return steps
}

// ============================================================
// 2. 分支与合并 — branch → checkout → merge
// ============================================================
function generateBranchingSteps(): GitStep[] {
  const steps: GitStep[] = []

  // 初始：main 有 2 个 commit
  const baseCommits: GitCommit[] = [
    c('c1', '初始提交', 'main', 0, 0),
    c('c2', '基础功能', 'main', 0, 1, ['c1']),
  ]

  // Step 1: 当前在 main
  steps.push(mkStep({
    commits: baseCommits,
    branches: [b('main', 'c2')],
    head: 'main',
    highlight: ['c2'],
    codeLine: 1,
    description: '当前在 main 分支，已有 2 个 commit，准备开发新功能',
  }))

  // Step 2: git branch feature
  steps.push(mkStep({
    commits: baseCommits,
    branches: [b('main', 'c2'), b('feature', 'c2')],
    head: 'main',
    highlight: ['c2'],
    codeLine: 2,
    description: 'git branch feature：创建 feature 分支，指向当前 c2 commit（分支只是指针）',
  }))

  // Step 3: git checkout feature
  steps.push(mkStep({
    commits: baseCommits,
    branches: [b('main', 'c2'), b('feature', 'c2')],
    head: 'feature',
    highlight: ['c2'],
    codeLine: 3,
    description: 'git checkout feature：切换到 feature 分支，HEAD 指向 feature',
  }))

  // Step 4: commit on feature
  const commitsAfterF = [
    ...baseCommits,
    c('f1', 'feat: 新增登录页', 'feature', 1, 2, ['c2']),
  ]
  steps.push(mkStep({
    commits: commitsAfterF,
    branches: [b('main', 'c2'), b('feature', 'f1')],
    head: 'feature',
    highlight: ['f1'],
    codeLine: 4,
    description: '在 feature 分支提交 f1，main 分支停在 c2 不动，分支开始分叉',
  }))

  // Step 5: 继续在 feature 提交
  const commitsAfterF2 = [
    ...commitsAfterF,
    c('f2', 'feat: 登录功能完成', 'feature', 1, 3, ['f1']),
  ]
  steps.push(mkStep({
    commits: commitsAfterF2,
    branches: [b('main', 'c2'), b('feature', 'f2')],
    head: 'feature',
    highlight: ['f2'],
    codeLine: 4,
    description: 'feature 分支继续前进到 f2，此时 main 和 feature 已分叉',
  }))

  // Step 6: git checkout main
  steps.push(mkStep({
    commits: commitsAfterF2,
    branches: [b('main', 'c2'), b('feature', 'f2')],
    head: 'main',
    highlight: ['c2'],
    codeLine: 5,
    description: 'git checkout main：切回 main 分支，HEAD 指向 c2',
  }))

  // Step 7: git merge feature（fast-forward）
  const mergedCommits = [
    ...commitsAfterF2,
    c('m1', 'Merge feature → main', 'main', 0, 4, ['c2', 'f2']),
  ]
  steps.push(mkStep({
    commits: mergedCommits,
    branches: [b('main', 'm1'), b('feature', 'f2')],
    head: 'main',
    highlight: ['m1', 'f2', 'c2'],
    codeLine: 6,
    description: 'git merge feature：合并！创建 merge commit m1，将 main 和 feature 的历史合并，两条线汇聚',
  }))

  // Step 8: git branch -d feature
  steps.push(mkStep({
    commits: mergedCommits,
    branches: [b('main', 'm1')],
    head: 'main',
    highlight: ['m1'],
    codeLine: 7,
    description: 'git branch -d feature：删除已合并的 feature 分支，历史保留在 main 中',
  }))

  return steps
}

// ============================================================
// 3. Merge vs Rebase — 同一场景两种策略对比
// ============================================================
function generateMergeVsRebaseSteps(): GitStep[] {
  const steps: GitStep[] = []

  // 基础状态：main + feature 各有一个提交
  const base: GitCommit[] = [
    c('c1', '初始提交', 'main', 0, 0),
    c('c2', '基础功能', 'main', 0, 1, ['c1']),
  ]
  const withFeature: GitCommit[] = [
    ...base,
    c('f1', 'feat: 新增功能', 'feature', 1, 2, ['c2']),
  ]
  // main 也有新提交（制造分叉）
  const diverged: GitCommit[] = [
    ...withFeature,
    c('c3', 'fix: main 修复', 'main', 0, 2, ['c2']),
  ]

  // Step 1: 分叉状态
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'feature',
    highlight: ['c3', 'f1'],
    codeLine: 1,
    description: '分叉场景：main 在 c3，feature 在 f1，两者从 c2 分叉，需要整合',
  }))

  // ── 策略一：Merge ──
  // Step 2: checkout main
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    highlight: ['c3'],
    codeLine: 2,
    description: '【策略一：Merge】git checkout main：切回 main 准备合并',
  }))

  // Step 3: git merge feature
  const mergeResult: GitCommit[] = [
    ...diverged,
    c('m1', 'Merge feature → main', 'main', 0, 3, ['c3', 'f1']),
  ]
  steps.push(mkStep({
    commits: mergeResult,
    branches: [b('main', 'm1'), b('feature', 'f1')],
    head: 'main',
    highlight: ['m1', 'c3', 'f1'],
    codeLine: 3,
    description: 'git merge feature：创建 merge commit m1，保留完整分叉历史（两条线汇聚）',
  }))

  // Step 4: merge 后的 log
  steps.push(mkStep({
    commits: mergeResult,
    branches: [b('main', 'm1'), b('feature', 'f1')],
    head: 'main',
    highlight: ['m1', 'c3', 'f1', 'c2', 'c1'],
    codeLine: 4,
    description: 'Merge 后的 git log：历史呈 Y 形，保留了分支结构，可追溯完整的开发过程',
  }))

  // ── 策略二：Rebase ──
  // Step 5: 回到分叉状态（重新开始）
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'feature',
    highlight: ['c3', 'f1'],
    codeLine: 5,
    description: '【策略二：Rebase】回到分叉状态，改用 rebase 策略整合',
  }))

  // Step 6: git rebase main（将 f1 rebase 到 c3 之后）
  const rebased: GitCommit[] = [
    c('c1', '初始提交', 'main', 0, 0),
    c('c2', '基础功能', 'main', 0, 1, ['c1']),
    c('c3', 'fix: main 修复', 'main', 0, 2, ['c2']),
    c("f1'", 'feat: 新增功能', 'feature', 0, 3, ['c3']),
  ]
  steps.push(mkStep({
    commits: rebased,
    branches: [b('main', 'c3'), b('feature', "f1'")],
    head: 'feature',
    highlight: ["f1'", 'c3'],
    codeLine: 6,
    description: "git rebase main：将 f1 重新播放到 c3 之后，变成 f1'，历史变成一条直线（原 f1 被废弃）",
  }))

  // Step 7: checkout main && git merge（fast-forward）
  const rebaseFinal: GitCommit[] = [
    ...rebased,
  ]
  steps.push(mkStep({
    commits: rebaseFinal,
    branches: [b('main', "f1'"), b('feature', "f1'")],
    head: 'main',
    highlight: ["f1'", 'c3', 'c2', 'c1'],
    codeLine: 7,
    description: "checkout main + merge：fast-forward 合并，main 直接指向 f1'，历史呈线性，更干净",
  }))

  // Step 8: 对比说明
  steps.push(mkStep({
    commits: rebaseFinal,
    branches: [b('main', "f1'"), b('feature', "f1'")],
    head: 'main',
    highlight: [],
    codeLine: 8,
    description: '对比：Merge 保留分支历史（Y形）；Rebase 产生线性历史（直线）。公共分支慎用 Rebase！',
  }))

  return steps
}

// ============================================================
// 4. 冲突解决 — 合并冲突产生 → 解决 → commit
// ============================================================
function generateConflictSteps(): GitStep[] {
  const steps: GitStep[] = []

  const base: GitCommit[] = [
    c('c1', '初始提交', 'main', 0, 0),
    c('c2', '添加 app.js（第3行: let x=1）', 'main', 0, 1, ['c1']),
  ]

  // Step 1: 分叉状态（两个分支修改同一文件）
  const diverged: GitCommit[] = [
    ...base,
    c('f1', 'feature: 修改第3行: let x=10', 'feature', 1, 2, ['c2']),
    c('c3', 'main: 修改第3行: let x=20', 'main', 0, 2, ['c2']),
  ]
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    highlight: ['c3', 'f1'],
    codeLine: 1,
    description: 'main 和 feature 都修改了 app.js 的第3行，产生了不同的改动，即将冲突',
  }))

  // Step 2: git merge feature
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    workingDir: ['app.js (CONFLICT)'],
    highlight: ['c3', 'f1'],
    message: 'CONFLICT (content): Merge conflict in app.js',
    codeLine: 2,
    description: 'git merge feature：❌ 合并失败！app.js 第3行产生冲突（CONFLICT），Git 无法自动决定保留哪个版本',
  }))

  // Step 3: 查看冲突内容
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    workingDir: ['app.js: <<<<<<< HEAD | let x=20 | ======= | let x=10 | >>>>>>> feature'],
    highlight: ['c3', 'f1'],
    codeLine: 3,
    description: '查看 app.js：Git 在冲突处插入标记，<<<<<<< HEAD（main）vs >>>>>>> feature，需手动选择',
  }))

  // Step 4: 手动编辑解决冲突
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    workingDir: ['app.js: let x=10 // 保留 feature 的版本'],
    highlight: ['c3', 'f1'],
    codeLine: 4,
    description: '手动编辑 app.js：删除冲突标记，选择保留 let x=10（或自行合并为其他值）',
  }))

  // Step 5: git add app.js
  steps.push(mkStep({
    commits: diverged,
    branches: [b('main', 'c3'), b('feature', 'f1')],
    head: 'main',
    stagingArea: ['app.js (resolved)'],
    highlight: ['c3', 'f1'],
    codeLine: 5,
    description: 'git add app.js：将解决后的文件加入暂存区，标记冲突已解决',
  }))

  // Step 6: git commit（完成合并）
  const resolved: GitCommit[] = [
    ...diverged,
    c('m1', 'Merge feature (conflict resolved)', 'main', 0, 3, ['c3', 'f1']),
  ]
  steps.push(mkStep({
    commits: resolved,
    branches: [b('main', 'm1'), b('feature', 'f1')],
    head: 'main',
    highlight: ['m1', 'c3', 'f1'],
    codeLine: 6,
    description: 'git commit：冲突已解决，完成合并提交！merge commit m1 记录了这次带冲突的合并',
  }))

  return steps
}

// ============================================================
// 5. Git Flow 工作流 — main/develop/feature/release/hotfix
// ============================================================
function generateGitFlowSteps(): GitStep[] {
  const steps: GitStep[] = []

  // Step 1: 初始状态 main
  steps.push(mkStep({
    commits: [c('v1.0', 'v1.0 发布', 'main', 0, 0)],
    branches: [b('main', 'v1.0')],
    head: 'main',
    highlight: ['v1.0'],
    codeLine: 1,
    description: '初始状态：main 分支在 v1.0 发布版本，生产环境运行稳定',
  }))

  // Step 2: 创建 develop
  const withDev: GitCommit[] = [
    c('v1.0', 'v1.0 发布', 'main', 0, 0),
    c('d1', 'develop: 开始 v1.1 开发', 'develop', 1, 1, ['v1.0']),
  ]
  steps.push(mkStep({
    commits: withDev,
    branches: [b('main', 'v1.0'), b('develop', 'd1')],
    head: 'develop',
    highlight: ['d1', 'v1.0'],
    codeLine: 2,
    description: '从 main 创建 develop 分支：所有开发工作在 develop 上进行，main 保持稳定',
  }))

  // Step 3: 创建 feature/login
  const withFeature: GitCommit[] = [
    ...withDev,
    c('fl1', 'feat: 登录页面', 'feature/login', 2, 2, ['d1']),
  ]
  steps.push(mkStep({
    commits: withFeature,
    branches: [b('main', 'v1.0'), b('develop', 'd1'), b('feature/login', 'fl1')],
    head: 'feature/login',
    highlight: ['fl1', 'd1'],
    codeLine: 3,
    description: '从 develop 创建 feature/login：每个新功能一个分支，开发完合并回 develop',
  }))

  // Step 4: feature/login 完成并合并到 develop
  const featureMerged: GitCommit[] = [
    ...withFeature,
    c('d2', 'develop: merge feature/login', 'develop', 1, 3, ['d1', 'fl1']),
  ]
  steps.push(mkStep({
    commits: featureMerged,
    branches: [b('main', 'v1.0'), b('develop', 'd2')],
    head: 'develop',
    highlight: ['d2', 'fl1'],
    codeLine: 4,
    description: 'feature/login 完成后合并回 develop，删除 feature 分支',
  }))

  // Step 5: 创建 feature/pay（另一个功能）
  const withPay: GitCommit[] = [
    ...featureMerged,
    c('fp1', 'feat: 支付功能', 'feature/pay', 2, 4, ['d2']),
  ]
  steps.push(mkStep({
    commits: withPay,
    branches: [b('main', 'v1.0'), b('develop', 'd2'), b('feature/pay', 'fp1')],
    head: 'feature/pay',
    highlight: ['fp1', 'd2'],
    codeLine: 3,
    description: '创建 feature/pay：并行开发支付功能',
  }))

  // Step 6: feature/pay 合并回 develop
  const payMerged: GitCommit[] = [
    ...withPay,
    c('d3', 'develop: merge feature/pay', 'develop', 1, 5, ['d2', 'fp1']),
  ]
  steps.push(mkStep({
    commits: payMerged,
    branches: [b('main', 'v1.0'), b('develop', 'd3')],
    head: 'develop',
    highlight: ['d3', 'fp1'],
    codeLine: 4,
    description: 'feature/pay 合并回 develop，v1.1 功能开发完成',
  }))

  // Step 7: 创建 release 分支
  const withRelease: GitCommit[] = [
    ...payMerged,
    c('r1', 'release: v1.1-rc1 测试修复', 'release', 3, 6, ['d3']),
  ]
  steps.push(mkStep({
    commits: withRelease,
    branches: [b('main', 'v1.0'), b('develop', 'd3'), b('release', 'r1')],
    head: 'release',
    highlight: ['r1', 'd3'],
    codeLine: 5,
    description: '从 develop 创建 release 分支：只允许 bug 修复，不加新功能，准备发布 v1.1',
  }))

  // Step 8: release 合并到 main（发布）
  const released: GitCommit[] = [
    ...withRelease,
    c('v1.1', 'v1.1 正式发布', 'main', 0, 7, ['v1.0', 'r1']),
  ]
  steps.push(mkStep({
    commits: released,
    branches: [b('main', 'v1.1'), b('develop', 'd3')],
    head: 'main',
    highlight: ['v1.1', 'v1.0', 'r1'],
    codeLine: 6,
    description: 'release 合并到 main 并打 tag v1.1：正式发布！生产环境更新到 v1.1',
  }))

  // Step 9: hotfix 场景
  const withHotfix: GitCommit[] = [
    ...released,
    c('hf1', 'hotfix: 修复登录崩溃', 'hotfix', 4, 8, ['v1.1']),
  ]
  steps.push(mkStep({
    commits: withHotfix,
    branches: [b('main', 'v1.1'), b('develop', 'd3'), b('hotfix', 'hf1')],
    head: 'hotfix',
    highlight: ['hf1', 'v1.1'],
    codeLine: 7,
    description: '紧急！生产环境发现登录崩溃，从 main 创建 hotfix 分支，快速修复',
  }))

  // Step 10: hotfix 合并到 main + develop
  const hotfixFinal: GitCommit[] = [
    ...withHotfix,
    c('v1.1.1', 'v1.1.1 hotfix 发布', 'main', 0, 9, ['v1.1', 'hf1']),
    c('d4', 'develop: merge hotfix', 'develop', 1, 10, ['d3', 'hf1']),
  ]
  steps.push(mkStep({
    commits: hotfixFinal,
    branches: [b('main', 'v1.1.1'), b('develop', 'd4')],
    head: 'main',
    highlight: ['v1.1.1', 'v1.1', 'hf1', 'd4'],
    codeLine: 8,
    description: 'hotfix 同时合并到 main（发布 v1.1.1）和 develop（同步修复），完整 Git Flow 演示结束！',
  }))

  return steps
}

// ============================================================
// 所有主题注册
// ============================================================
export const allGitTopics: GitTopicDefinition[] = [
  {
    id: 'basics',
    name: 'Git 基础流程',
    icon: '🚀',
    desc: 'init → add → commit → log，工作区/暂存区/仓库三区流转',
    scenario: '刚接触 Git 的开发者，从零开始管理项目版本',
    code: `# Git 基础流程
git init                          # 初始化仓库
echo "hello" > index.html         # 创建文件
git add index.html                # 工作区 → 暂存区
git commit -m "init: add index"   # 暂存区 → 仓库
echo "body{}" > style.css         # 再创建文件
git add style.css
git commit -m "feat: add style"
git log --oneline                 # 查看提交历史`,
    generateSteps: generateBasicsSteps,
  },
  {
    id: 'branching',
    name: '分支与合并',
    icon: '🌿',
    desc: 'branch → checkout → merge，分支分叉与合并的可视化时间线',
    scenario: '在不影响主分支的情况下开发新功能，完成后合并',
    code: `# 分支与合并
git branch feature         # 创建 feature 分支
git checkout feature       # 切换到 feature
# (开发新功能...)
git commit -m "feat: 登录页"
git commit -m "feat: 登录完成"
git checkout main          # 切回 main
git merge feature          # 合并 feature → main
git branch -d feature      # 删除 feature 分支`,
    generateSteps: generateBranchingSteps,
  },
  {
    id: 'merge-vs-rebase',
    name: 'Merge vs Rebase',
    icon: '⚔️',
    desc: '同一分叉场景，两种整合策略的动画对比',
    scenario: 'feature 和 main 都有新提交，需要整合代码',
    code: `# 分叉场景
# main:    c1 → c2 → c3
# feature: c1 → c2 → f1

# ── 策略一：Merge ──
git checkout main
git merge feature       # 创建 merge commit，保留分叉历史

# ── 策略二：Rebase ──
git checkout feature
git rebase main         # 将 f1 重放到 c3 之后，线性历史
git checkout main
git merge feature       # fast-forward 合并`,
    generateSteps: generateMergeVsRebaseSteps,
  },
  {
    id: 'conflict',
    name: '冲突解决',
    icon: '💥',
    desc: '合并冲突产生 → 手动解决 → commit 的完整流程',
    scenario: '两人修改同一文件的同一行，Git 无法自动合并',
    code: `# 冲突解决
# main:    修改 app.js 第3行: let x = 20
# feature: 修改 app.js 第3行: let x = 10
git checkout main
git merge feature       # ❌ CONFLICT in app.js

# 查看冲突标记
# <<<<<<< HEAD
# let x = 20
# =======
# let x = 10
# >>>>>>> feature

vim app.js              # 手动编辑，删除标记，选择正确版本
git add app.js          # 标记冲突已解决
git commit              # 完成合并提交`,
    generateSteps: generateConflictSteps,
  },
  {
    id: 'gitflow',
    name: 'Git Flow 工作流',
    icon: '🏗️',
    desc: 'main/develop/feature/release/hotfix 分支协作全流程',
    scenario: '团队协作开发，规范的分支策略管理发布节奏',
    code: `# Git Flow 工作流
git checkout -b develop main        # 创建 develop
git checkout -b feature/login develop  # 创建功能分支
# (开发完成后)
git merge feature/login develop     # 合并回 develop
git checkout -b release/1.1 develop # 创建发布分支
# (修复发布 bug)
git merge release/1.1 main          # 合并到 main，打 tag
git tag v1.1
git checkout -b hotfix/login main   # 生产紧急修复
git merge hotfix/login main         # 修复合入 main
git merge hotfix/login develop      # 修复合入 develop（同步）`,
    generateSteps: generateGitFlowSteps,
  },
]

export function getGitTopicById(id: string): GitTopicDefinition | undefined {
  return allGitTopics.find(t => t.id === id)
}
