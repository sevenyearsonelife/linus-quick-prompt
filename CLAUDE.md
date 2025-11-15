# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quick Prompt是一个基于WXT框架的浏览器扩展项目，专注于提示词管理与快速输入。该扩展允许用户在任何网页输入框中通过`/p`快速触发提示词选择器，支持变量、分类管理、数据同步、Google AI Studio集成等高级功能。

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
- **Tailwind CSS 4.x** - 样式框架，支持明暗主题自动切换
- **模块化设计** - 核心功能拆分为独立模块：
  - `utils/browser/` - 浏览器API封装（快捷键、消息传递、存储等）
  - `utils/auth/` - Google认证相关
  - `utils/sync/` - Notion同步功能
  - `utils/categoryUtils.ts` - 分类管理
  - `utils/promptUtils.ts` - 提示词工具
  - `utils/i18n.ts` - 国际化支持

### Data Models
核心数据结构在`utils/types.ts`中定义：
- **PromptItem**: 提示词项（id、title、content、tags、enabled、categoryId、pinned、sortOrder等）
- **Category**: 分类（id、name、description、color、enabled等）
- **AppStorage**: 应用存储结构（prompts、categories、settings）

### Key Features Implementation
- **变量系统** - 支持`{{变量名}}`格式的动态变量，使用时弹出输入框
- **拖拽排序** - 使用@dnd-kit实现提示词排序，支持跨分类拖拽
- **数据存储** - browser.storage.local用于本地数据，browser.storage.sync用于设置同步
- **Google AI Studio集成** - 自动提取AI Studio页面中的问题列表
- **跨平台支持** - 同时支持Chrome（MV3）和Firefox（MV2）

## Important Configuration Files

### wxt.config.ts
WXT框架的核心配置文件，包含：
- Vite构建配置（Tailwind CSS、生产环境console移除）
- 扩展manifest配置（权限、OAuth2、快捷键等）
- 环境变量处理（Chrome/Web客户端ID）
- Google OAuth2认证配置

### Extension Manifest
通过wxt.config.ts动态生成，包含：
- 快捷键：`Ctrl+Shift+P`（打开选择器）、`Ctrl+Shift+S`（保存提示词）
- 权限：storage、contextMenus、identity、scripting
- 主机权限：https://aistudio.google.com/*
- OAuth2配置用于Google认证

### package.json
- 使用pnpm 9.1.2作为包管理器
- 核心依赖：React 19.1.0、@dnd-kit、@headlessui/react、react-router-dom
- 构建工具：wxt 0.20.7、TypeScript 5.8.3

## Development Guidelines

### File Organization
- 新组件放在对应entrypoint的`components/`目录下
- 工具函数按功能分类放在`utils/`目录下
- 类型定义统一在`utils/types.ts`中管理
- 静态资源放在`assets/`目录下

### Browser Extension Patterns
- 使用WXT的`defineBackground`、`defineContentScript`等包装器
- 通过`browser.runtime.sendMessage`进行组件间通信
- 存储操作优先使用WXT的storage包装器
- 内容脚本使用shadow DOM避免CSS冲突

### UI/UX Considerations
- 支持明暗主题自动切换（使用Tailwind dark模式）
- 使用Tailwind CSS的响应式设计
- 考虑不同网站的CSS冲突，content script使用独立样式作用域
- 使用@headlessui/react提供无障碍访问支持

### Internationalization
- 所有用户可见文本通过`utils/i18n.ts`的`t()`函数处理
- 扩展描述使用Chrome i18n API的`__MSG_*__`格式
- 默认语言为英文，支持多语言

### Content Script Integration
- 支持`/p`触发命令在input、textarea、contenteditable元素中工作
- 使用多种策略检测输入框（querySelector、事件监听、焦点管理）
- 处理iframe中的输入框（需要配置访问权限）

## Testing Notes
- 手动测试各浏览器兼容性（Chrome、Firefox）
- 测试不同网站的输入框兼容性（普通input、textarea、contenteditable）
- 验证快捷键在不同操作系统下的行为
- 测试数据导入导出功能的完整性
- 测试Google AI Studio集成功能
- 测试变量系统的正确性

## Special Implementation Details

### Google AI Studio Integration
- 自动检测aistudio.google.com页面
- 提取AI响应中的问题列表
- 支持多种问题提取策略和格式

### Variable System
- 使用正则表达式识别`{{变量名}}`格式
- 运行时弹出变量输入对话框
- 支持复杂变量组合和嵌套

### Drag and Drop
- 使用@dnd-kit核心库
- 支持水平、垂直拖拽排序
- 自动保存排序状态到存储