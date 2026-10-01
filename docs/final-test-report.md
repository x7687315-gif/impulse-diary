# 全局测试与安全检查报告

日期：2026-09-30 ｜ 结论：**通过，可交付本机测试**

## 1. 构建 / 类型检查
- `tsc --noEmit`：0 错误（strict 模式）。
- `vite build`：49 模块，JS 292.85KB（gzip 96KB），CSS 14.29KB，2.4~20s 完成。
- PWA：generateSW 模式，precache 8 entries（300KB），sw.js / workbox 正常产出。

## 2. 冒烟测试（vite preview @ localhost:4173）
| 检查项 | 结果 |
|--------|------|
| GET / （index.html） | 200，`<title>攒钱日记</title>` |
| GET /manifest.webmanifest | 200 |
| GET /sw.js（Service Worker） | 200 |
| GET /icon-192.png | 200 |

## 3. 数据一致性设计审查
- 金额流转唯一实现 `deriveAmounts`（表单预览与入库共用）→ 预览即所得。
- 三个岛的数字、统计页汇总、目标进度共用同一套推导函数（statsOf / fundInOf / adjSum）→ 天然一致，不存在两套口径。
- DEFERRED 不计入节省/支出/基金（规格 §11 情况 D）；PLANNED 计入冲动+即将支出，付款后转 BOUGHT。
- 手动调整以流水叠加，永久保留，不篡改原始记录。

## 4. 安全检查清单
| 检查项 | 结果 |
|--------|------|
| GitHub 令牌泄漏扫描（ghp 前缀全仓匹配） | **0 命中**（令牌未落盘、未入仓库） |
| dangerouslySetInnerHTML / eval | **0 命中**（React 默认转义，无 XSS 注入面） |
| 外部网络请求（CDN/字体/统计） | **0 个**（系统字体、无外链）—— 隐私目标达成，离线可用 |
| 数据边界 | 仅本机 IndexedDB + localStorage；导出/导入仅用户手动触发 |
| SW 缓存策略 | 同源 precache + autoUpdate + cleanupOutdatedCaches（规避旧 chunk 卡死坑） |

## 5. 桌面快速启动
- 桌面已放置 **`攒钱日记（测试版）.bat`**（GBK 编码，cmd 中文路径兼容）。
- 双击 → 自动启动本地服务并打开浏览器；关闭黑色窗口即停止服务。
- 技术细节：bat 内使用 node.exe 绝对路径直连 `vite.js preview`，不依赖系统 PATH（已验证 vite 正常启动，见 launch.log 记录）。
- 曾尝试标准 .lnk（含图标），但程序化生成的 LNK 二进制未被 Windows Shell 接受，故采用 bat 方案；日后可手动右键 bat → 发送到桌面快捷方式换图标。

## 6. 已知限制（不阻塞测试）
- 时段统计的"即将支出"按 PLANNED 记录的创建时间归入时段（v1 简化口径）。
- Service Worker 在 preview 下的更新需刷新一次生效（autoUpdate 行为，正常）。
- 图标为程序化绘制（纯 Python 标准库），如需手绘艺术版随时可换。

## 7. 下一步（手机端封装，等用户本机测试通过后）
1. 用「发布为应用」把 dist 发布成 HTTPS 链接 → 手机 Chrome 打开 → 「添加到主屏幕」→ 获得独立图标、全屏、离线可用的 PWA。
2. 如坚持要真 APK：工程已预留 Capacitor 出口（base './' 已就绪），需要本机 Android Studio + JDK。
