import { BROWSER_STORAGE_KEY, CATEGORIES_STORAGE_KEY } from "@/utils/constants"
import type { Category, PromptItem } from "@/utils/types"
import { t } from "@/utils/i18n"

// Main message handler
export const handleRuntimeMessage = async (
  message: any,
  _sender: Browser.runtime.MessageSender,
  _sendResponse: (response?: any) => void,
) => {
  console.log('[MSG_RECEIVED] Background received message:', message)

  if (message.action === 'getPrompts') {
    try {
      const result = await browser.storage.local.get(BROWSER_STORAGE_KEY)
      const allPrompts = (result[BROWSER_STORAGE_KEY as keyof typeof result] as PromptItem[]) || []
      const enabledPrompts = allPrompts.filter((prompt: PromptItem) => prompt.enabled !== false)
      console.log(
        t('backgroundPromptsLoaded'),
        allPrompts.length,
        t('backgroundPromptsEnabled'),
        enabledPrompts.length,
        t('backgroundPromptsEnabledSuffix'),
      )
      return { success: true, data: enabledPrompts }
    } catch (error) {
      console.error(t('backgroundGetPromptsError'), error)
      return { success: false, error: t('backgroundGetPromptsDataError') }
    }
  }

  if (message.action === 'getPromptSelectorMeta') {
    try {
      const [categoriesResult, settingsResult] = await Promise.all([
        browser.storage.local.get(CATEGORIES_STORAGE_KEY),
        browser.storage.sync.get('globalSettings'),
      ])

      const categories = (categoriesResult[CATEGORIES_STORAGE_KEY as keyof typeof categoriesResult] as Category[]) || []
      const globalSettings = settingsResult.globalSettings as { closeModalOnOutsideClick?: boolean } | undefined

      return {
        success: true,
        data: {
          categories,
          closeModalOnOutsideClick: globalSettings?.closeModalOnOutsideClick ?? true,
        },
      }
    } catch (error) {
      console.error('Failed to get prompt selector meta:', error)
      return { success: false, error: 'Failed to get prompt selector meta' }
    }
  }

  if (message.action === 'openOptionsPage') {
    try {
      const optionsUrl = browser.runtime.getURL('/options.html')
      await browser.tabs.create({ url: optionsUrl })
      return { success: true }
    } catch (error) {
      console.error(t('backgroundOpenOptionsError'), error)
      browser.runtime.openOptionsPage()
      return { success: true, fallback: true }
    }
  }

  if (message.action === 'openOptionsPageWithText') {
    try {
      const optionsUrl = browser.runtime.getURL('/options.html')
      const urlWithParams = `${optionsUrl}?action=new&content=${encodeURIComponent(message.text)}`
      await browser.tabs.create({ url: urlWithParams })
      return { success: true }
    } catch (error: any) {
      console.error(t('backgroundOpenOptionsWithTextError'), error)
      return { success: false, error: error.message }
    }
  }
}
