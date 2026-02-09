import { PromptItem, Category } from "./types";

export const BROWSER_STORAGE_KEY = "userPrompts";
export const CATEGORIES_STORAGE_KEY = "userCategories";

// 默认分类ID
export const DEFAULT_CATEGORY_ID = "default";

/**
 * 默认分类
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: DEFAULT_CATEGORY_ID,
    name: "默认",
    description: "系统默认分类，用于存放未分类的提示词",
    color: "#06b6d4",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "programming",
    name: "编程开发",
    description: "编程、代码相关的提示词",
    color: "#10b981",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "painting",
    name: "绘画",
    description: "绘画相关的提示词",
    color: "#f59e0b",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 默认的prompt样例
 */
export const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: "default-weekly-report",
    title: "周报生成",
    content: "请根据以下本周工作内容，生成结构清晰的周报（完成事项/风险问题/下周计划）：\n\n",
    tags: ["写作", "周报"],
    enabled: true,
    categoryId: "default",
  },
  {
    id: "default-meeting-minutes",
    title: "会议纪要",
    content: "请将以下会议记录整理成纪要，包含：议题、结论、待办事项（负责人+截止时间）：\n\n",
    tags: ["会议", "整理"],
    enabled: true,
    categoryId: "default",
  },
  {
    id: "default-email-polish",
    title: "邮件润色",
    content: "请将以下邮件内容润色为专业、礼貌且简洁的表达，并给出中文和英文两个版本：\n\n",
    tags: ["邮件", "润色"],
    enabled: true,
    categoryId: "default",
  },
  {
    id: "default-content-summary",
    title: "内容总结",
    content: "请将以下内容总结为3个要点，并给出1条可执行建议：\n\n",
    tags: ["总结", "写作"],
    enabled: true,
    categoryId: "default",
  },
  {
    id: "default-cn-en-translate",
    title: "中英翻译",
    content: "请将以下中文翻译为自然的英文，保持专业语气：\n\n",
    tags: ["翻译", "英文"],
    enabled: true,
    categoryId: "default",
  },
  {
    id: "default-code-review",
    title: "代码审查",
    content: "请从可读性、性能和潜在Bug三个维度审查以下代码，并给出修改建议：\n\n",
    tags: ["编程", "代码审查"],
    enabled: true,
    categoryId: "programming",
  },
];
