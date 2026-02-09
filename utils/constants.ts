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
    id: "default-ghibli",
    title: "吉卜力风格",
    content: "将图片转换为吉卜力风格",
    tags: ["画图", "吉卜力"],
    enabled: true,
    categoryId: "painting",
  },
  {
    id: "default-code-explain",
    title: "代码解释",
    content: "请解释以下代码的功能和工作原理：\n\n",
    tags: ["编程"],
    enabled: true,
    categoryId: "programming",
  },
  {
    id: "default-role-template",
    title: "开发角色",
    content: "你现在是一个{{角色}}，有着{{年限}}年的开发经验，擅长{{技能}}。",
    tags: ["编程", "变量"],
    enabled: true,
    categoryId: "programming",
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
