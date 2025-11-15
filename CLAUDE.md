# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quick Prompt是一个基于WXT框架的浏览器扩展项目，专注于提示词管理与快速输入。该扩展允许用户在任何网页输入框中通过`/p`快速触发提示词选择器，支持变量、分类管理、数据同步等高级功能。

## Development Commands

### Core Commands
- `pnpm dev` - 开发模式（Chrome）
- `pnpm dev:firefox` - 开发模式（Firefox）
- `pnpm build` - 构建扩展（Chrome）
- `pnpm build:firefox` - 构建扩展（Firefox）
- `pnpm zip` - 打包为发布版本（Chrome）
- `pnpm zip:firefox` - 打包为发布版本（Firefox）
- `pnpm compile` - TypeScript类型检查

### Testing and Quality
- `pnpm compile` - 运行TypeScript编译检查（无输出文件）

## Architecture Overview

### WXT Framework Structure
项目使用WXT框架构建，这是一个现代化的Web扩展开发框架：

- **entrypoints/** - 扩展入口点目录
  - `background.ts` - 后台脚本，处理扩展生命周期、快捷键、右键菜单
  - `content/` - 内容脚本，注入到网页中处理输入框监听和提示词选择器
  - `popup/` - 弹窗页面，扩展图标点击后的界面
  - `options/` - 选项页面，提示词管理界面

### Component Architecture
- **React + TypeScript** - 使用React构建UI组件，TypeScript提供类型安全
- **Tailwind CSS** - 样式框架，支持明暗主题自动切换
- **模块化设计** - 核心功能拆分为独立模块：
  - `utils/browser/` - 浏览器API封装（快捷键、消息传递、存储等）
  - `utils/auth/` - Google认证相关
  - `utils/sync/` - Notion同步功能
  - `utils/categoryUtils.ts` - 分类管理
  - `utils/i18n.ts` - 国际化支持

### Key Features Implementation
- **变量系统** - 支持`{{变量名}}`格式的动态变量
- **拖拽排序** - 使用@dnd-kit实现提示词排序
- **数据存储** - browser.storage.local用于本地数据，browser.storage.sync用于设置同步
- **跨平台支持** - 同时支持Chrome（MV3）和Firefox（MV2）

## Important Configuration Files

### wxt.config.ts
WXT框架的核心配置文件，包含：
- Vite构建配置（Tailwind CSS、生产环境console移除）
- 扩展manifest配置（权限、OAuth2、快捷键等）
- 环境变量处理（Chrome/Web客户端ID）

### Extension Manifest
通过wxt.config.ts动态生成，包含：
- 快捷键：`Ctrl+Shift+P`（打开选择器）、`Ctrl+Shift+S`（保存提示词）
- 权限：storage、contextMenus、identity
- OAuth2配置用于Google认证

## Development Guidelines

### File Organization
- 新组件放在对应entrypoint的`components/`目录下
- 工具函数按功能分类放在`utils/`目录下
- 类型定义统一在`utils/types.ts`中管理

### Browser Extension Patterns
- 使用WXT的`defineBackground`、`defineContentScript`等包装器
- 通过`browser.runtime.sendMessage`进行组件间通信
- 存储操作优先使用WXT的storage包装器

### UI/UX Considerations
- 支持明暗主题自动切换
- 使用Tailwind CSS的响应式设计
- 考虑不同网站的CSS冲突，content script使用独立样式作用域

### Internationalization
- 所有用户可见文本通过`utils/i18n.ts`的`t()`函数处理
- 扩展描述使用Chrome i18n API的`__MSG_*__`格式

## Testing Notes
- 手动测试各浏览器兼容性（Chrome、Firefox）
- 测试不同网站的输入框兼容性（普通input、textarea、contenteditable）
- 验证快捷键在不同操作系统下的行为
- 测试数据导入导出功能的完整性