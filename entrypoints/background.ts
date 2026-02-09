import { BROWSER_STORAGE_KEY, DEFAULT_PROMPTS } from "@/utils/constants"
import { initializeDefaultCategories, migratePromptsWithCategory } from "@/utils/categoryUtils"
import type { PromptItem } from "@/utils/types"

// Import extracted modules
import { checkShortcutConfiguration, handleCommand } from "@/utils/browser/shortcutManager"
import { createContextMenus, handleContextMenuClick } from "@/utils/browser/contextMenuManager"
import { setupNotificationHandlers } from "@/utils/browser/notificationManager"
import { setupStorageChangeListeners } from "@/utils/browser/storageManager"
import { handleRuntimeMessage } from "@/utils/browser/messageHandler"

const LEGACY_DEFAULT_PROMPT_IDS = new Set([
  "default-ghibli",
  "default-code-explain",
  "default-role-template",
  "default-weekly-report",
  "default-meeting-minutes",
  "default-email-polish",
  "default-content-summary",
  "default-cn-en-translate",
  "default-code-review",
]);

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

  const initializeDefaultData = async () => {
    try {
      await initializeDefaultCategories();
      await migratePromptsWithCategory();

      const promptsResult = await browser.storage.local.get(BROWSER_STORAGE_KEY);
      const prompts = promptsResult[BROWSER_STORAGE_KEY as keyof typeof promptsResult] as PromptItem[] | undefined;

      if (prompts && Array.isArray(prompts) && prompts.length > 0) {
        const promptsWithoutLegacy = prompts.filter((prompt) => !LEGACY_DEFAULT_PROMPT_IDS.has(prompt.id));
        const removedLegacyCount = prompts.length - promptsWithoutLegacy.length;

        const existingIds = new Set(promptsWithoutLegacy.map((prompt) => prompt.id));
        const maxSortOrder = promptsWithoutLegacy.reduce((max, prompt) => {
          const current = prompt.sortOrder ?? -1;
          return current > max ? current : max;
        }, -1);

        const missingDefaultPrompts = DEFAULT_PROMPTS
          .filter((prompt) => !existingIds.has(prompt.id))
          .map((prompt, index) => ({
            ...prompt,
            sortOrder: maxSortOrder + index + 1,
            lastModified: new Date().toISOString(),
          }));

        if (removedLegacyCount > 0 || missingDefaultPrompts.length > 0) {
          const dataToStore: Record<string, any> = {};
          dataToStore[BROWSER_STORAGE_KEY] = [...promptsWithoutLegacy, ...missingDefaultPrompts];
          await browser.storage.local.set(dataToStore);
          console.log(`背景脚本: 已清理 ${removedLegacyCount} 条旧默认提示词，补齐 ${missingDefaultPrompts.length} 条默认提示词`);
        } else {
          console.log('背景脚本: 已存在Prompts数据，无需初始化默认提示词');
        }
      } else {
        const dataToStore: Record<string, any> = {};
        dataToStore[BROWSER_STORAGE_KEY] = DEFAULT_PROMPTS;
        await browser.storage.local.set(dataToStore);
        console.log('背景脚本: 默认提示词初始化完成');
      }
    } catch (error) {
      console.error('背景脚本: 初始化默认数据失败:', error);
    }
  };

  // Initialize default data
  initializeDefaultData();

  // Setup all the modular components
  createContextMenus().catch(error => {
    console.error('背景脚本: 创建右键菜单失败', error)
  });
  setupNotificationHandlers();
  setupStorageChangeListeners();

  // Setup event listeners
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);
  browser.commands.onCommand.addListener(handleCommand);

  // Extension lifecycle events
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('背景脚本: 扩展首次安装');
      await initializeDefaultData();
      console.log('背景脚本: 首次安装初始化完成');

      // 安装后延迟一下再检测快捷键，确保扩展完全加载
      setTimeout(async () => {
        await checkShortcutConfiguration();
      }, 2000);
    }
  });

  // Setup message handler
  browser.runtime.onMessage.addListener(handleRuntimeMessage);

  console.log('Background script fully initialized with modular components.');
})
