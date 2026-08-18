# CS Lab

> 计算机基础知识的交互式可视化学习平台

通过逐步动画与代码同步高亮，让抽象的算法、数据结构、设计模式和 Git 工作流变得直观易懂。

**在线体验**：[https://everwynn.github.io/cs-lab/](https://everwynn.github.io/cs-lab/)

---

## 功能概览

### 算法可视化

覆盖排序、搜索、图论、动态规划、回溯五大类经典算法，每步动画配合 Java 代码行同步高亮。

| 类别 | 算法 |
|---|---|
| 排序 | 冒泡、选择、插入、希尔、归并、快速、堆、计数 |
| 搜索 | 线性查找、二分查找、哈希查找 |
| 图论 | BFS、DFS、Dijkstra 最短路径 |
| 动态规划 | 斐波那契、0/1 背包、最长公共子序列 |
| 回溯 | N 皇后、数独求解 |

### 数据结构

栈、队列、链表、哈希表、二叉搜索树、堆、Trie、并查集、动态数组——每种结构都有增删查改的完整动画演示。

### 设计模式

单例、工厂、观察者、策略、装饰器，通过对象关系图展示创建、组合与交互过程。

### Git 工作流

分支、合并、Rebase、冲突解决、Git Flow，commit 图实时演进，Shell 命令同步高亮。

---

## 交互特性

- **播放控制**：播放 / 暂停 / 单步前进后退 / 跳到首尾 / 速度调节
- **键盘快捷键**：`Space` 播放暂停、`←→` 单步、`Home/End` 跳首尾、`R` 重置
- **自定义输入**：算法板块支持自定义数组数据，实时观察不同输入下的执行过程
- **深色 / 浅色主题**：自动跟随系统，支持手动切换
- **响应式布局**：桌面端侧边代码面板，移动端全宽适配

---

## 技术栈

| 技术 | 用途 |
|---|---|
| [Astro](https://astro.build/) 4 | 静态站点生成 |
| [Vue](https://vuejs.org/) 3 | 交互式可视化组件 |
| [Tailwind CSS](https://tailwindcss.com/) 3 | 样式框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| SVG | 动态图形绘制引擎 |
| [Shiki](https://shiki.style/) | 代码语法高亮 |

---

## 快速开始

```sh
# 安装依赖
npm install

# 启动开发服务器（http://localhost:4321）
npm run dev

# 构建生产站点
npm run build

# 本地预览构建结果
npm run preview
```

> 环境要求：Node.js >= 18.17.1

---

## 部署

纯静态站点，构建产物在 `./dist` 目录，可部署到任意静态托管服务：

- [GitHub Pages](https://pages.github.com/)（本项目使用）
- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- Nginx / 其他静态服务器

---

## 项目文档

详细的架构设计、模块说明和扩展指南请参阅 [docs/项目架构文档.md](docs/项目架构文档.md)。

---

## License

MIT
