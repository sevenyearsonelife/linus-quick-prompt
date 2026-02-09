# Linus Prompt

[English](./README_en.md) | 中文

<p align="center">
  <img src="./assets/icon.png" alt="Linus Prompt Logo" width="128" style="background: transparent;">
</p>

Linus Prompt 是一个基于 WXT 的浏览器扩展，聚焦于“提示词管理 + 网页端快速插入 + AI 页面问题提取”。  
当前仓库版本已包含提示词变量、置顶、拖拽排序等能力。

## 核心能力

- 全网页输入框触发提示词选择器（输入 `/p`，不区分大小写）
- 快捷键支持
  - 打开选择器：`Ctrl+Shift+P` / `Command+Shift+P`
  - 保存选中文本为提示词：`Ctrl+Shift+S` / `Command+Shift+S`
- 右键菜单保存选中文本到提示词库
- 提示词管理：启用/停用、置顶、拖拽排序、标签、备注、分类字段
- 变量模板：支持 `{{变量名}}`，插入前弹窗填写变量值
- Popup 提取问题：支持从 `Google AI Studio` 与 `AlphaXiv` 提取问题列表，并一键回填到页面输入框执行
- i18n 与主题：内置中英文文案、自动跟随系统明暗主题

## 技术栈

- `WXT` + `React 19` + `TypeScript`
- `Tailwind CSS v4`
- `@dnd-kit`（拖拽排序）
- `browser.storage`（本地与同步配置）

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. （可选）配置环境变量

复制 `.env.example` 到 `.env`，按需配置：

```bash
WXT_FIREFOX_EXTENSION_ID=quick-prompt@example.com
```

说明：

- `WXT_FIREFOX_EXTENSION_ID`：Firefox 扩展 ID

### 3. 常用命令

```bash
# Chrome 开发
pnpm dev

# Firefox 开发
pnpm dev:firefox

# 构建
pnpm build
pnpm build:firefox

# 打包
pnpm zip
pnpm zip:firefox

# TypeScript 类型检查
pnpm compile
```

## 加载扩展

### Chrome / Edge

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `.output/chrome-mv3/`

### Firefox

1. 打开 `about:debugging`
2. 进入 “This Firefox”
3. 点击 “Load Temporary Add-on”
4. 选择 `.output/firefox-mv2/manifest.json`

## 使用说明

### 快速插入提示词

1. 在任意输入框末尾输入 `/p`
2. 选择弹窗中的提示词（支持搜索、分类筛选、键盘上下键选择）
3. 若提示词包含变量（如 `{{topic}}`），先填写变量再插入

### 快速保存提示词

- 方式 1：在网页中选中文本，按快捷键保存
- 方式 2：选中文本后右键，点击“保存选中的文本作为提示词”

### Popup 提取问题（AI Studio / AlphaXiv）

1. 打开扩展 Popup
2. 点击“提取问题”
3. 在结果列表点击某个问题，会自动发送到当前 AI 页面输入框并触发运行

## 项目结构

```text
entrypoints/
  background.ts        # 后台逻辑、命令、右键菜单、消息路由
  content/             # 页面注入逻辑、提示词选择器、变量输入
  popup/               # 扩展弹窗（统计 + 问题提取）
  options/             # 配置页（提示词管理、集成页面）
utils/                 # 存储、同步、认证、工具函数
public/_locales/       # i18n 文案（zh/en）
docs/                  # 使用与配置文档
```

## 已知限制

- 个别复杂输入组件站点下，`/p` 触发后可能出现触发词残留；建议优先使用快捷键触发选择器。

## License

MIT
