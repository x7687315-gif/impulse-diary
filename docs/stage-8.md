# 阶段 8 记录：PWA + 导出导入 + 移动端精修 + 设置页

日期：2026-09-30 ｜ 状态：✅ 完成（构建验证通过）

## 做了什么
- **设置页**（`src/pages/SettingsPage.tsx`）：缓冲期默认时长（24/48/72h）、导出 / 导入 JSON、载入示例数据、清空全部数据（双重确认）、关于（北极星 + 隐私说明）。
- **数据备份**（`src/db/backup.ts`）：导出带 schemaVersion 的 JSON；导入校验格式 + 双确认后整库替换（async 事务，无竞态）。PC 测试数据与手机数据的搬家通道。
- **PWA**（vite.config.ts）：manifest（名称/主题色/standalone/图标），vite-plugin-pwa generateSW + autoUpdate + cleanupOutdatedCaches；图标三件套（icon.svg / icon-192.png / icon-512.png，纯 Python 标准库绘制，含 .ico 供桌面快捷方式使用）。
- **移动端自适应**（贯穿全站的硬性要求）：
  - `viewport-fit=cover` + `env(safe-area-inset-*)`（岛和 toast 都垫高，真机不被手势条遮挡）
  - `100dvh` 视口高度、≤768px 侧边栏转抽屉 + 顶栏、触控目标 ≥44px、内容列 640px 上限、汇总卡两列网格
  - `prefers-reduced-motion` 降级

## 验证
构建通过；preview 冒烟 200（index / manifest / sw.js / 图标）。
