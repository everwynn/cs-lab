# CS Lab

计算机基础知识的交互式可视化学习平台。

CS Lab 通过逐步动画与代码同步高亮，帮助学习者理解算法、数据结构、设计模式和 Git 工作流等核心概念。

- 在线地址：https://everwynn.github.io/cs-lab/
- 关联站点：[TechHub](https://everwynn.github.ioe) — 技术项目展示与在线工具箱

## 当前覆盖内容

### 算法（/algorithms）

排序、搜索、图论、动态规划、回溯等经典算法的执行过程可视化：

- 排序：冒泡、选择、插入、希尔、归并、快速、堆、计数排序
- 搜索：线性搜索、二分搜索、哈希搜索
- 图论：BFS、DFS、Dijkstra 最短路径
- 动态规划：斐波那契、背包问题、最长公共子序列
- 回溯：N 皇后、数独

### 数据结构（/data-structures）

栈、队列、链表、哈希表、二叉搜索树、堆、Trie、并查集等结构的增删查改动画演示。

### 设计模式（/design-patterns）

单例、工厂、观察者、策略、装饰器等常用设计模式的结构图与交互式示例。

### Git 工作流（/git-workflow）

分支、合并、Rebase、冲突解决、Git Flow 等协作流程的分支图可视化。

## 技术栈

- [Astro](https://astro.build/) 4 — 静态站点生成器
- [Vue](https://vuejs.org/) 3 — 交互式可视化组件
- [Tailwind CSS](https://tailwindcss.com/) 3 — 样式框架
- [TypeScript](https://www.typescriptlang.org/) — 类型安全
- [SVG](https://developer.mozilla.org/zh-CN/docs/Web/SVG) — 动态图形绘制
- [Shiki](https://shiki.style/) — 代码高亮

## 项目结构

```text
/
├── public/                       # 静态资源（favicon 等）
├── src/
│   ├── components/               # 可复用组件
│   │   ├── algorithms/           # 算法可视化组件
│   │   ├── dataStructures/       # 数据结构可视化组件
│   │   ├── designPatterns/       # 设计模式可视化组件
│   │   └── git/                  # Git 工作流可视化组件
│   ├── layouts/                  # 页面布局
│   ├── pages/                    # 路由页面
│   │   ├── algorithms/           # 算法页面
│   │   ├── data-structures/      # 数据结构页面
│   │   ├── design-patterns/      # 设计模式页面
│   │   └── git-workflow/         # Git 工作流页面
│   └── styles/                   # 全局样式
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
```

## 本地开发

```sh
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产站点
npm run build

# 本地预览构建结果
npm run preview
```

开发服务器默认运行在 http://localhost:4321。

## 部署

本项目为静态站点，构建输出位于 `./dist` 目录，可部署到任意静态托管服务：

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- Nginx / GitHub Pages

部署前请根据实际域名修改 `astro.config.mjs` 中的 `site` 配置。

## 内容维护

新增主题页面：在 `src/components/` 下对应模块新增可视化组件，并在 `src/pages/` 下创建 Astro 页面引用该组件。

每个可视化主题通常包含：

1. 可视化组件（Vue + SVG）
2. 算法/结构定义文件（TypeScript）
3. 页面文件（Astro）
