# 开工前决策简报 — 消费冲动日记（暂定名 impulse-diary）

> 日期：2026-09-30 ｜ 模式：github-preflight 快速核查 ｜ 状态：待用户拍板

## 0. 检索台账（真实 query + 命中 URL）

| # | 检索面 | Query / 动作 | 命中 |
|---|--------|--------------|------|
| 1 | 外部 | `PWA vs Capacitor 2026 个人应用 打包 Android APK 对比 本地优先` | ourcodeworld.com/articles/read/3646、saastostore.com/blog/pwa-to-apk、code2native.com/blog/convert-react-to-mobile |
| 2 | 外部 | `Dexie.js IndexedDB React local-first persistence pitfalls known issues` | dexie 仓库快照（reporank.net/en/repo/dexie-dexie-js.html）、techbloat.com Dexie 指南、worldprogramming.org offline-first 模式、10play.dev 调试文、ask.csdn.net/questions/9805690 |
| 3 | 外部 | `欲望记账 冲动消费 记录 app 开源 GitHub 拒绝消费挑战` | medevel.com 开源财务应用清单、localfirstapp.github.io/finance/actual.html（Actual Budget） |
| 4 | 仓库 | GitHub 搜 `impulse spending tracker in:name,description,readme` | bephrem1/impulse（7★，2018 年，概念最接近但已停更）等 |
| 5 | 仓库 | GitHub 搜 `no spend tracker savings goal in:name,description` | shraddhashetty-27/smart-expense-companion（含 wishlist decision simulator + no-spend challenge，Flutter）、vml520/Gidget（单文件本地优先）、GiftOnyinye/SabiBuddy（offline-first 无登录） |
| 6 | 语义/评论面 | 未单独执行（首轮 WebSearch 一条被拦截） | 该面未找到有效来源，不影响核心结论 |

## 1. 核心结论（三角验证后）

1. **没有可直接抄的产品级轮子。** 「消费冲动日记」这个定位（记录欲望瞬间 + 决策转化 + 目标基金，而非记账）在 GitHub/开源圈没有成熟同类项目；概念上最接近的元素散落在：no-spend streak（OopsBudgeter）、wishlist decision simulator（smart-expense-companion）、savings goals（大量）。→ **需要自建，无重复造轮子风险。**
2. **技术栈完全成立且有权威背书：** 2026 年的主流建议仍是「默认 PWA，需要商店分发/原生 API 时再上 Capacitor，两者共用同一份 Web 代码」（ourcodeworld 决策规则）。Realme GT 5 Pro 是安卓机，Chrome 完整支持 PWA 安装（独立图标/全屏/离线）。
3. **Dexie.js 是 IndexedDB 本地优先的成熟解**（14.6k★，Apache-2.0，2026-09 仍活跃），配套 dexie-react-hooks 的 useLiveQuery 可让 UI 自动跟随数据变化；也确认可与 Capacitor 共存。
4. **后续出 APK 有三条路**：TWA 云打包（~800KB，需 HTTPS+manifest 达标）、Capacitor 本地打包（需 Android Studio）、或继续保持 PWA。PWA 路线不封死任何一条。

## 2. 已知坑（带来源）

| 坑 | 来源 | 对策 |
|----|------|------|
| Service Worker 缓存失效是 PWA 头号事故源：发新版后旧 index.html 引用已删除的 chunk，用户卡死 | code2native.com | SW 文档 + index.html 用 network-first；HTML 不强缓存 |
| Dexie 单例纪律：组件内 new Dexie() 会报 "Database already open"、React 18 严格模式双重挂载引发竞态 | ask.csdn.net/questions/9805690 | db.ts 模块级单例导出；用 useLiveQuery，不在 useEffect 里手动 open |
| IndexedDB 配额/隐私模式/多 tab 打开阻塞（blocked）等错误路径多 | techbloat.com Dexie 指南 | 写路径 try/catch + 用户可读的错误提示；versionchange 处理 |
| 国产 ROM（ColorOS 类）杀后台严重，Web Push 到达率不可靠 | 社区共识（待验证） | 缓冲期提醒不做系统推送依赖，改为应用内提醒（待用户拍板） |
| pnpm 在本机 Windows 装新依赖会因 symlink 失败 | 用户既有经验 | 用 npm |

## 3. 可选方向（待拍板）

- **方向 A（倾向）：PWA 先行** — React+TS+Vite+Dexie，电脑测 → 发布 HTTPS → 手机 Chrome「添加到主屏幕」。零 Android Studio。日后需要真 APK 时用 Capacitor 套壳，代码 100% 复用。
- **方向 B：直接 Capacitor 出 APK** — 本机需装 Android Studio + JDK（约 3-5GB），每次迭代重新打包传手机。
- **方向 C：PWA + TWA 云打包** — 不装 Android Studio 拿到 ~800KB 真 APK，但依赖第三方打包服务与域名校验。

## 4. 开工 checklist（拍板后）

- [ ] 确认交付路线 / 数据策略 / 灵动岛形态 / 缓冲期机制
- [ ] 产出设计规范（信息架构、数据模型、状态流转、视觉 tokens）
- [ ] 搭工程：Vite + React + TS + Dexie + zustand（或纯 Dexie live query）+ npm（非 pnpm）
- [ ] 按八阶段推进，每阶段回归验证
