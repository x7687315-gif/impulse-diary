# 「攒钱日记」设计规范 v1.0

> 工作代号 impulse-diary ｜ 2026-09-30 ｜ 状态：待用户确认后开工
> 北极星：**不是记录我花了多少钱，而是记录我如何面对自己的消费欲望。**

## 1. 已确认的关键决策（grill-me 结论）

| 决策点 | 结论 |
|--------|------|
| 交付路线 | **PWA 先行**：电脑测试 → 发布 HTTPS → 真我 GT 5 Pro Chrome「添加到主屏幕」；日后需要真 APK 再套 Capacitor（代码 100% 复用） |
| 数据策略 | 本地优先，**两台设备各自独立**；内置 JSON 导出/导入做备份与搬家 |
| 灵动岛 | **单岛默认 + 左右滑切换四模块 + 双击展开竖排四岛**（用户原创交互） |
| 缓冲期提醒 | **应用内提醒**（不用系统推送）：日记顶部「⏳ 有 N 笔缓冲期到期」+ 记录显示已等待时长 |

## 2. 信息架构

```
App（侧边栏：桌面端常驻 / 移动端抽屉）
├── 📓 消费日记（首页）
│   ├── 按日分组的便签时间流（参考用户手机便签截图版式）
│   ├── 底部灵动岛（单岛滑动 / 双击展开）
│   ├── ＋ 记录一次消费冲动（右下主按钮）
│   └── 缓冲期到期提醒条（条件显示）
├── 📊 数据统计（周 / 月 / 年）
│   ├── 五口径汇总（冲动总额 / 实际支出 / 已节省 / 即将支出 / 基金存入）
│   ├── 趋势图 + 来源分布（极简自绘 SVG）
│   └── 手动调整入口 + 调整记录流水
├── 🎯 我的目标
│   ├── 目标卡：¥133 / ¥300 + 进度条 +「距离目标又近了 ¥21」
│   └── 新建 / 编辑目标
└── ⚙️ 设置
    ├── 导出 / 导入 JSON
    ├── 缓冲期默认时长（24 / 48 / 72h）
    ├── 示例数据（首次启动可选载入）
    └── 关于
```

## 3. 数据模型（TypeScript）

```ts
type Decision = 'BOUGHT' | 'RESISTED' | 'DEFERRED' | 'SUBSTITUTED' | 'PLANNED';
type Motive   = 'STRESS' | 'WANT' | 'SOCIAL' | 'NECESSITY' | 'OTHER';
type Zone     = 'FREE' | 'BUFFER' | 'CAUTION';   // 随心花 / 缓冲期 / 谨慎考虑区

interface Entry {
  id: string;              // crypto.randomUUID()
  createdAt: number;       // epoch ms
  content: string;         // 自然语言描述："看到一个 ¥21 的东西，很想买"
  intendedAmount: number;  // 冲动金额
  actualAmount: number;    // 实际支出（SUBSTITUTED 可 > 0，其余见矩阵）
  decision: Decision;
  motive: Motive;
  zone: Zone;              // 可不选（null = 未分区）
  savedAmount: number;     // 节省额
  fundAmount: number;      // 拨入基金额（≤ savedAmount）
  targetId?: string;       // 关联目标
  tags: string[];
  bufferUntil?: number;    // DEFERRED 专用：到期时间戳
  resolvedAt?: number;     // DEFERRED → 终态的时间
  updatedAt: number;       // 为将来同步预留（本版不同步）
}

interface Goal {
  id: string; name: string; targetAmount: number;
  createdAt: number; deadline?: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'PAUSED';
  // currentAmount 不存储，由 entries.fundAmount 汇总 + adjustments(FUND) 实时推导
}

interface Adjustment {
  id: string; createdAt: number;
  type: 'SAVED' | 'PLANNED' | 'FUND' | 'ACTUAL';  // 对应四个统计口径
  targetId?: string;       // type=FUND 时必填
  amount: number;          // 可正可负
  reason: string;          // 必填，保留全部流水
}
```

**设计要点**：
- `currentAmount` 等统计值**一律推导，不冗余存储**——手动调整以 Adjustment 流水形式叠加，既可纠错又完整保留轨迹（用户明确要求）。
- `PLANNED` 为新增决策态（规格「即将支出」岛的数据来源），后续流转：付款 → BOUGHT；放弃 → RESISTED。
- Dexie 单例导出（`db.ts`），禁在组件内 `new Dexie()`；全部读取走 `useLiveQuery`。

## 4. 金额流转矩阵（数据一致性的唯一依据）

| 决策 | intended | actual | saved | 即将支出 | 备注 |
|------|----------|--------|-------|---------|------|
| BOUGHT 已购买 | 计入冲动 | = 冲动额 | 0 | 0 | 实付额可改（优惠等） |
| RESISTED 已放弃 | 计入冲动 | 0 | = 冲动额 | 0 | 可全额/部分拨入基金 |
| SUBSTITUTED 替代 | 计入冲动 | 替代花费 | 冲动 − 实付 | 0 | 替代可免费（家里的柠檬茶） |
| DEFERRED 延迟 | 计入冲动 | 0 | 0 | 0 | 暂不计入任何统计；到期提醒 |
| PLANNED 已计划 | 计入冲动 | 0 | 0 | = 冲动额 | 付款/放弃后终态化 |

**统计口径**（推导公式）：
```
已节省   = Σ entry.savedAmount + Σ adj(type=SAVED)
实际支出 = Σ entry.actualAmount + Σ adj(type=ACTUAL)
即将支出 = Σ entry.intendedAmount(decision=PLANNED) + Σ adj(type=PLANNED)
基金余额 = Σ entry.fundAmount(targetId) + Σ adj(type=FUND, targetId)
```

## 5. 灵动岛交互规格

| 手势 | 单岛态 | 展开态 |
|------|--------|--------|
| 左滑 / 右滑 | 切换模块（已节省 → 即将支出 → 大件基金循环），方向跟随滑动方向 | — |
| 单击 | 弹出该模块明细面板（含「手动调整」入口；基金岛 → 目标详情） | 单击某一岛 → 该岛明细 |
| 双击 | 展开为竖排四岛（依次浮出动画） | 收回单岛（恢复到之前所在模块） |

- 视觉：白底胶囊、软阴影、圆图标、tabular-nums 数字；基金岛带进度条与「¥133 / ¥300」。
- 页码点（● ○ ○）指示当前模块，展开态隐藏。
- 动效曲线：`cubic-bezier(0.2, 0, 0, 1)`，展开 stagger 约 55ms/岛；滑动 220ms。
- 实现注意：单击/双击用 240ms 定时器区分；pointer events 实现手势，阈值 36px 且横向位移 > 纵向。

## 6. 视觉 tokens（纸感 + 几何极简，参考用户便签截图）

```css
--paper:  #FAFAF7;   /* 页面底：暖纸白 */
--card:   #FFFFFF;   /* 便签卡 */
--line:   #ECEAE4;   /* 分隔线 */
--ink:    #1F1E1B;   /* 主文字：墨色 */
--ink-2:  #6F6D66;   /* 次级 */
--ink-3:  #A8A69E;   /* 时间戳/元信息 */
--save:   #2F7D5C;   /* 节省 / 基金：墨绿 */
--spend:  #C2543A;   /* 支出：赭红 */
--pending:#B08A3E;   /* 缓冲 / 待定：琥珀 */
--radius-card: 16px; --radius-island: 999px;
--shadow-island: 0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06);
字体：正文 system-ui / Noto Sans SC；日记标题与金额可用 Noto Serif SC 增加纸感；
数字一律 tabular-nums；移动端触控目标 ≥ 44px。
```

**首页便签结构**（对齐截图）：日期组头「09月30日」→ 每条：时间（ink-3 小字）→ 正文自然语言 → 决策行（中性色：没有购买 / 社交消费）→ 金额行（+¥21 → 已节省 · +¥21 → 大件基金，墨绿；−¥16 赭红）。语言中性，禁止评判性文案。

## 7. 技术选型

| 层 | 选择 | 理由 | 否决项 |
|----|------|------|--------|
| 框架 | React 18 + TS + Vite | 用户规格指定 | Vue/Svelte |
| 数据 | Dexie.js + dexie-react-hooks | 14.6k★ 活跃；useLiveQuery 免手工同步 | raw IndexedDB |
| UI 状态 | zustand | 轻量，只管岛展开/弹窗/表单草稿 | Redux（过重） |
| 样式 | 全局 tokens.css + CSS Modules | 完全掌控纸感细节 | Tailwind（DSL 障碍） |
| 图表 | 自绘 SVG 迷你图 | 极简审美可控，零依赖 | ECharts（太重） |
| PWA | vite-plugin-pwa | SW 模板成熟；index.html 用 network-first 防 SW 缓存事故 | 手写 SW |
| 包管理 | **npm** | 本机 pnpm symlink 已知失效 | pnpm |

## 8. 八阶段开发计划（每阶段结束跑回归）

1. ✅ ~~信息架构 / 数据模型 / 状态流转 / 核心交互~~（本文档）
2. 工程脚手架 + Dexie schema + 首页便签流（含示例数据）
3. 新增记录全流程（含实时金额流转预览「这笔账会怎么记」）
4. 灵动岛（单岛滑动 / 双击展开 / 明细面板）
5. 目标系统（新建目标、拨付转入、进度正反馈）
6. 统计页 周 / 月 / 年（自绘趋势图 + 来源分布）
7. 手动调整（金额 + 必填原因 + 调整流水页）
8. 移动端 UI 精修、动画、PWA manifest、导出导入、数据一致性回归

## 9. 风险与对策

| 风险 | 对策 |
|------|------|
| SW 缓存导致更新后白屏（PWA 头号事故） | index.html network-first；SW 文件 no-cache |
| Dexie 多 tab / 配额错误 | 写路径 try/catch + 可读报错；单例纪律 |
| 单击与双击手势冲突 | 240ms 定时器仲裁（原型已验证思路） |
| 本机 pnpm 失效 | 全程 npm |
| 测试数据污染真实数据 | 手机端首次启动不载示例数据；导出文件带 schema 版本号 |
