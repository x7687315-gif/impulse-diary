# npm 安装环境备忘（本机 Windows + 国内网络）

> 2026-09-30 排查记录。起因：本项目首次 `npm install` 走官方源 7 分钟仅完成一半，用户历史每次装依赖都卡。

## 结论（按命中顺序）

1. **根因：默认源 registry.npmjs.org 国内访问极慢**，典型表现是卡在 fetchMetadata / idealTree 几十分钟。
   - 对策（已落地）：项目 `.npmrc` 写入 `registry=https://registry.npmmirror.com`（npmmirror 官方只读镜像，周下载 15 亿+）。
   - 来源：https://npmmirror.com/ ；多篇指南均建议「切源后把 .npmrc 纳入版本管理」。
   - 注意：npm 缓存不跨源复用，切源后首次安装仍是全量下载。
2. **Windows EBUSY / EPERM（装到一半报错）**：杀软实时扫描 node_modules、编辑器占用文件导致 rename 失败。
   - 对策：把项目目录 / npm 缓存目录加入 Defender 排除项；关编辑器重试。
   - 来源：https://github.com/npm/npm/issues/14680 ；Stack Overflow 39293636。
3. **npm 可选依赖 bug（npm/cli#4828）**：Vite 在 Windows 上可能缺 `@rollup/rollup-win32-x64-msvc` / `@esbuild/win32-x64`，跑 dev/build 报 `Cannot find module`。
   - 对策：安装完成后验证；缺了补装 `npm install @rollup/rollup-win32-x64-msvc --no-save`；顽固时删 node_modules + package-lock 重装。
   - 来源：https://github.com/vitejs/vite/discussions/20334 ；npm/cli#4828。
4. **全局 .npmrc 残留 `os=linux` 会让 npm 装错平台的二进制**（vite Discussion #20334 评论区多人中招）。
   - 本机已检查：用户级 .npmrc 不存在，无此雷。

## 本项目落地

- `impulse-diary/.npmrc`：registry → npmmirror；fund/audit 关闭。
- pnpm 仍然禁用（本机 symlink 失败，见用户长期记忆）。
