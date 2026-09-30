# 阶段 2 记录：工程脚手架 + 数据层 + 首页便签流

日期：2026-09-30 ｜ 状态：✅ 完成（构建验证通过）

## 做了什么
- Vite 6 + React 18 + TypeScript 5.8 工程脚手架（npm，非 pnpm）。
- 设计 tokens 全量落进 `src/styles.css`：纸感配色（--paper/#FAFAF7）、墨色文字、三语义色（节省墨绿/支出赭红/待定琥珀）、便签卡/胶囊/弹层/表单全套组件样式。
- 数据层：`src/db/db.ts`（Dexie 单例，entries/goals/adjustments 三表 + 索引）；`src/db/stats.ts`（五口径推导、deriveAmounts 金额流转唯一实现、周/月/年区间工具、逐日聚合、fundBalance）；`src/db/prefs.ts`（localStorage 偏好）。
- 全局状态：`src/state/uiStore.ts`（zustand：页面切换/侧边栏/表单开关/调整弹窗/toast）。
- App 外壳：桌面端常驻侧边栏 + 移动端（≤768px）抽屉 + 顶栏；内容列 max-width 640px 居中。
- 首页便签流：按日分组（新日期在前、日内旧→新），NoteCard 展示时间/正文/动机与分区标签/决策行/金额行，五种决策各有颜色语义；DEFERRED 显示"已等待 X 小时/已到期"。
- 示例数据 `src/seed.ts`：镜像用户手机便签的三条真实记录 + 补齐一周数据，数字精确对齐设计规格（已节省 ¥247 / 即将支出 ¥86 / 基金 ¥133/¥300），首次启动自动载入。

## 怎么做的（关键决策）
- 统计值一律从流水推导、不冗余存储 → 手动调整（阶段 7）天然可回溯。
- 响应式：`viewport-fit=cover` + `env(safe-area-inset-*)` + `100dvh` + `clamp`/断点，为真机全屏体验铺路。

## 验证
- `npm run build`（tsc --noEmit + vite build）通过；PWA worker 正常生成。

## 波折记录
- npm 安装踩坑与修复过程见 `docs/npm-env-notes.md`（官方源 12 分钟失败 → npmmirror 镜像 1 分钟完成 → 补装 esbuild Windows 二进制修复 npm/cli#4828）。
