// 简单的 i18n 工具函数，使用 browser.i18n API
export function t(key: string, substitutions?: string[]): string {
  try {
    const msg = browser?.i18n?.getMessage?.(key as any, substitutions)
    if (typeof msg === 'string' && msg.length > 0) {
      return msg
    }
    return key
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 扩展被刷新后，旧 content script 上下文失效时，直接回退为 key
    if (!message.includes('Extension context invalidated')) {
      console.warn(`Translation missing for key: ${key}`)
    }
    return key
  }
}
