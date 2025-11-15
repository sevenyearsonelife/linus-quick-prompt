# Repository Guidelines

## 项目结构与模块组织
仓库基于 WXT 浏览器扩展架构，核心入口位于 `entrypoints/`：`background.ts` 管理后台事件，`content/` 挂载 React 前端，`options/` 与 `popup/` 提供配置与即时交互界面。跨入口共享的逻辑集中在 `utils/` 与 `types/`，静态资源置于 `assets/`，公共文档位于 `docs/`，构建配置例如 `wxt.config.ts`、`tailwind.config.js` 存放于根目录。

## 构建、测试与开发命令
使用 `pnpm dev` 在 Chromium 浏览器热重载开发，`pnpm dev:firefox` 针对 Firefox 调试。发布前运行 `pnpm build` 或 `pnpm build:firefox` 生成产物，必要时使用 `pnpm zip` / `pnpm zip:firefox` 打包扩展压缩包。`pnpm compile` 触发 TypeScript 类型检查，确保无类型回归。

## 编码风格与命名规范
全仓库采用 TypeScript + React 16+ Hooks 写法，遵循函数式组件模式。统一使用 2 空格缩进，文件命名保持 kebab-case，组件放置在 `entrypoints/**/components/` 且导出默认函数。Tailwind 原子类遵循实义优先，复用样式请抽象至 `utils/`。提交前保证通过 `pnpm compile`，必要时配合编辑器内置格式化工具保持 import 顺序与引号风格一致（单引号）。

## 测试指南
当前未引入自动化测试框架，提交前需通过 `pnpm compile` 完成类型校验，并在目标浏览器中加载 WXT 开发产物手动验证核心交互（拖拽排序、提示词置顶、导入导出）无回归。新增功能请在 PR 描述中记录手动测试步骤与结果，确保评审者可复现。

## Commit 与 Pull Request 规范
遵循 Git 历史的「emoji + 类型 + 冒号 + 简短中文描述」风格，例如 `✨ feat: 添加拖拽排序功能`。每个 commit 聚焦单一改动。提交 PR 时附上变更摘要、关联 Issue、手动测试说明及必要截图；若影响多浏览器平台，请列出分别的验证结论，并在描述中标明需要评审的关注点。

## 安全与配置提示
`.env` 等敏感配置不得入库。升级依赖前先查阅 `CHANGELOG.md` 与 WXT 兼容性。打包前确认 `public/` 下 manifest 权限最小化，避免额外权限导致商店审核失败。
