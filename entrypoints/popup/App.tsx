import { BROWSER_STORAGE_KEY } from '@/utils/constants'
import { useState, useEffect } from 'react'
import Logo from '~/assets/icon.png'
import '~/assets/tailwind.css'
import { t } from '../../utils/i18n'

function App() {
  const [promptCount, setPromptCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [shortcutKey, setShortcutKey] = useState<string>('')
  const [saveShortcutKey, setSaveShortcutKey] = useState<string>('')
  const [shortcutSettingsUrl, setShortcutSettingsUrl] = useState<string>('')
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(false)
  const [extractedQuestions, setExtractedQuestions] = useState<string[]>([])
  const [extractingQuestions, setExtractingQuestions] = useState<boolean>(false)
  const [extractQuestionsError, setExtractQuestionsError] = useState<string | null>(null)
  const isReceivingEndMissingError = (error: any) => {
    return typeof error?.message === 'string' && error.message.includes('Receiving end does not exist')
  }

  // 加载提示数量
  const loadPromptCount = async () => {
    try {
      setLoading(true)

      // 直接从本地存储获取数据
      try {
        const result = await browser.storage.local.get(BROWSER_STORAGE_KEY)
        const allPrompts = result.userPrompts || []

        if (Array.isArray(allPrompts)) {
          // 只计算启用的提示词数量
          const enabledPrompts = allPrompts.filter((prompt: any) => prompt.enabled !== false)
          setPromptCount(enabledPrompts.length)

          console.log(t('popupPromptsInfo', [allPrompts.length.toString(), enabledPrompts.length.toString()]))
        } else {
          setPromptCount(0)
        }
      } catch (storageErr) {
        console.error('弹出窗口：直接读取storage失败', storageErr)
        setError(t('errorCannotReadStorage'))
        setPromptCount(0)
      }
    } catch (err) {
      console.error('弹出窗口：加载提示数量出错', err)
      setError(t('errorCannotLoadPrompts'))
    } finally {
      setLoading(false)
    }
  }

  // 获取当前快捷键
  const getShortcutKey = async () => {
    try {
      // 检测当前浏览器类型
      const isFirefox = navigator.userAgent.includes('Firefox')
      // 设置对应浏览器的扩展快捷键设置页面
      if (isFirefox) {
        setShortcutSettingsUrl('about:addons')
      } else {
        setShortcutSettingsUrl('chrome://extensions/shortcuts')
      }
      
      // 检查用户是否已选择不再提醒
      const reminderSettings = await browser.storage.local.get('shortcut_reminder_dismissed')
      const isReminderDismissed = reminderSettings.shortcut_reminder_dismissed === true
      
      // 从浏览器API获取真实配置的快捷键
      const commands = await browser.commands.getAll()
      const commandMap = {
        prompt: commands.find(cmd => cmd.name === 'open-prompt-selector'),
        save: commands.find(cmd => cmd.name === 'save-selected-prompt')
      }
      
      // 提取快捷键字符串
      const shortcuts = {
        prompt: commandMap.prompt?.shortcut || '',
        save: commandMap.save?.shortcut || ''
      }
      
      // 更新状态
      setShortcutKey(shortcuts.prompt)
      setSaveShortcutKey(shortcuts.save)
      
      // 判断是否显示帮助信息：当任一快捷键未设置且用户未选择不再提醒时显示
      const hasAllShortcuts = shortcuts.prompt && shortcuts.save
      setShowShortcutHelp(!hasAllShortcuts && !isReminderDismissed)
      
    } catch (err) {
      console.error('获取快捷键设置失败', err)
      
      // 检查用户是否已选择不再提醒
      try {
        const reminderSettings = await browser.storage.local.get('shortcut_reminder_dismissed')
        const isReminderDismissed = reminderSettings.shortcut_reminder_dismissed === true
        
        // 出错时提示用户进入快捷键设置页面（如果用户未选择不再提醒）
        const isFirefox = navigator.userAgent.includes('Firefox')
        if (isFirefox) {
          setShortcutSettingsUrl('about:addons')
        } else {
          setShortcutSettingsUrl('chrome://extensions/shortcuts')
        }
        setShortcutKey('')
        setSaveShortcutKey('')
        setShowShortcutHelp(!isReminderDismissed)
      } catch (storageErr) {
        console.error('检查提醒设置失败', storageErr)
        // 如果连存储都访问不了，还是显示提醒
        setShowShortcutHelp(true)
      }
    }
  }

  // 首次加载
  useEffect(() => {
    loadPromptCount()
    getShortcutKey()

    // 检查系统暗黑模式设置并应用
    const applySystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      // 应用暗黑模式到HTML元素
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // 首次应用主题
    applySystemTheme()

    // 监听系统暗黑模式变化
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applySystemTheme()
    darkModeMediaQuery.addEventListener('change', listener)

    return () => {
      darkModeMediaQuery.removeEventListener('change', listener)
    }
  }, [])

  // 打开选项页（在新标签页中）
  const openOptionsPage = async () => {
    try {
      // 向background脚本发送消息请求在新标签页中打开选项页
      await browser.runtime.sendMessage({ action: 'openOptionsPage' })
      // 关闭popup窗口
      window.close()
    } catch (err) {
      console.error('弹出窗口：打开选项页出错', err)
      // 回退方案：直接使用API打开选项页
      browser.runtime.openOptionsPage()
    }
  }

  // 打开快捷键设置页面
  const openShortcutSettings = () => {
    // 对于Firefox，直接打开about:addons后需要用户进一步操作
    if (navigator.userAgent.includes('Firefox')) {
      // 显示额外提示
      alert(t('firefoxShortcutHelp'))
    }
    
    // 尝试打开设置页面
    try {
      browser.tabs.create({ url: shortcutSettingsUrl })
      window.close()
    } catch (err) {
      console.error('打开快捷键设置页面失败', err)
    }
  }

  const getActiveTabId = async (): Promise<number | undefined> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    return tabs[0]?.id
  }

  const extractQuestionsInTab = async (tabId: number): Promise<string[]> => {
    const scripting = (browser as any)?.scripting
    if (!scripting?.executeScript) {
      throw new Error(t('popupExtractQuestionsFailed'))
    }

    const [{ result }] = await scripting.executeScript({
      target: { tabId },
      func: () => {
        const MAX_EXTRACTED_QUESTIONS = 10

        const stripNumberPrefix = (text: string): string => {
          return text.replace(/^\d+[\.\)、]\s*/, '').trim()
        }

        const buildQuestionHtml = (index: number, title: string | null, text: string): string => {
          if (title && text.includes(title)) {
            const questionText = text.substring(text.indexOf(title) + title.length).trim()
            const cleanTitle = stripNumberPrefix(title)
            const cleanRest = stripNumberPrefix(questionText)
            return `<span class="question-number">${index + 1}.</span> <span class="question-title">${cleanTitle}</span> ${cleanRest}`
          }
          return `<span class="question-number">${index + 1}.</span> ${stripNumberPrefix(text)}`
        }

        const questions: string[] = []
        let foundQuestions = false

        if (!document.querySelector('textarea')) {
          throw new Error('未检测到Google AI Studio的输入框，请确保在正确的页面上')
        }

        const allOrderedLists = document.querySelectorAll<HTMLOListElement>('ol')
        for (let i = 0; i < allOrderedLists.length; i++) {
          const list = allOrderedLists[i]
          const listItems = list.querySelectorAll<HTMLLIElement>('li')
          if (listItems.length >= 5) {
            const tempQuestions: string[] = []
            listItems.forEach((item, index) => {
              if (index < MAX_EXTRACTED_QUESTIONS) {
                const strongElement = item.querySelector<HTMLElement>('strong, b')
                const questionTitle = strongElement ? strongElement.textContent?.trim() || '' : ''
                const fullQuestion = item.textContent?.trim() || ''
                tempQuestions.push(buildQuestionHtml(index, questionTitle || null, fullQuestion))
              }
            })
            if (tempQuestions.length >= 5) {
              questions.push(...tempQuestions)
              foundQuestions = true
              break
            }
          }
        }

        if (!foundQuestions) {
          const allParagraphs = document.querySelectorAll<HTMLParagraphElement>('p')
          const numberedParagraphs: { title: string | null; fullText: string }[] = []

          allParagraphs.forEach((paragraph) => {
            const text = paragraph.textContent?.trim() || ''
            if (/^\d+[\.\)、]/.test(text) && text.length > 10) {
              const strongElement = paragraph.querySelector<HTMLElement>('strong, b')
              const title = strongElement ? strongElement.textContent?.trim() || null : null
              numberedParagraphs.push({ title, fullText: text })
            }
          })

          if (numberedParagraphs.length >= 5) {
            numberedParagraphs.slice(0, MAX_EXTRACTED_QUESTIONS).forEach((item, index) => {
              questions.push(buildQuestionHtml(index, item.title, item.fullText))
            })
            foundQuestions = true
          }
        }

        if (!foundQuestions) {
          const numberedTexts: string[] = []
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
          let node = walker.nextNode()
          while (node) {
            const text = node.textContent?.trim() || ''
            if (/^\d+[\.\)、]/.test(text) && text.length > 10) {
              numberedTexts.push(text)
            }
            node = walker.nextNode()
          }

          const uniqueTexts = Array.from(new Set(numberedTexts))
          if (uniqueTexts.length >= 5) {
            uniqueTexts.slice(0, MAX_EXTRACTED_QUESTIONS).forEach((text, index) => {
              questions.push(`<span class="question-number">${index + 1}.</span> ${stripNumberPrefix(text)}`)
            })
            foundQuestions = true
          }
        }

        if (!foundQuestions) {
          const allListItems = document.querySelectorAll<HTMLLIElement>('li')
          const tempQuestions: string[] = []
          allListItems.forEach((item, index) => {
            if (index < MAX_EXTRACTED_QUESTIONS) {
              const text = item.textContent?.trim() || ''
              if (text.length > 10) {
                tempQuestions.push(`<span class="question-number">${index + 1}.</span> ${text}`)
              }
            }
          })
          if (tempQuestions.length >= 5) {
            questions.push(...tempQuestions)
            foundQuestions = true
          }
        }

        if (!foundQuestions || questions.length === 0) {
          throw new Error('未找到问题列表。请确保AI已经回复了包含有序问题的响应。')
        }

        return questions
      }
    })

    return (result || []) as string[]
  }

  const injectContentScriptToTab = async (tabId: number): Promise<boolean> => {
    try {
      const scripting = (browser as any)?.scripting
      if (!scripting?.executeScript) {
        return false
      }
      await scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js']
      })
      return true
    } catch (error) {
      console.error('注入内容脚本失败:', error)
      return false
    }
  }

  const sendMessageWithAutoInjection = async <T,>(tabId: number, message: any): Promise<T> => {
    try {
      return await browser.tabs.sendMessage(tabId, message)
    } catch (error: any) {
      if (isReceivingEndMissingError(error)) {
        const injected = await injectContentScriptToTab(tabId)
        if (injected) {
          await new Promise(resolve => setTimeout(resolve, 50))
          return await browser.tabs.sendMessage(tabId, message)
        }
      }
      throw error
    }
  }

  const handleExtractQuestions = async () => {
    try {
      setExtractQuestionsError(null)
      setExtractingQuestions(true)
      const tabId = await getActiveTabId()
      if (!tabId) {
        throw new Error(t('popupExtractQuestionsNoTab'))
      }
      const questions = await extractQuestionsInTab(tabId)
      setExtractedQuestions(questions)
      if (questions.length === 0) {
        setExtractQuestionsError(t('aiStudioNoQuestionsFound'))
      }
    } catch (err: any) {
      console.error('弹出窗口：提取问题失败', err)
      if (isReceivingEndMissingError(err)) {
        setExtractQuestionsError(t('popupExtractQuestionsConnectFailed'))
      } else {
        setExtractQuestionsError(err?.message || t('popupExtractQuestionsFailed'))
      }
    } finally {
      setExtractingQuestions(false)
    }
  }

  const handleClearQuestions = () => {
    setExtractedQuestions([])
    setExtractQuestionsError(null)
  }

  // 不再提醒快捷键设置问题
  const dismissShortcutReminder = async () => {
    try {
      await browser.storage.local.set({
        'shortcut_reminder_dismissed': true,
        'shortcut_reminder_dismissed_at': Date.now()
      })
      setShowShortcutHelp(false)
      console.log(t('popupShortcutReminderSet'))
    } catch (error) {
      console.error('弹出窗口: 设置不再提醒时出错:', error)
    }
  }

  return (
    <div className='p-4 w-full max-w-[350px] min-w-[300px] box-border bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200'>
      {/* 标题区域 */}
      <div className='flex justify-center items-center mb-3'>
        <img src={Logo} className='h-8 mr-2' alt='quick prompt logo' />
        <h1 className='text-lg font-bold whitespace-nowrap m-0 p-0 leading-normal dark:text-white'>
          Quick Prompt
        </h1>
      </div>

      {/* 统计卡片 */}
      <div className='rounded-lg shadow p-2 mb-3 relative bg-white dark:bg-gray-800 transition-colors duration-200'>
        <div className='flex justify-between items-center mb-1'>
          <div className='flex items-center'>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className='text-sm font-semibold m-0 text-gray-700 dark:text-gray-200'>{t('promptLibrary')}</h2>
          </div>
        </div>

        {/* 设置固定高度容器，防止状态切换时闪烁 */}
        <div className='h-12 flex items-center justify-center'>
          {loading ? (
            // 骨架屏加载状态
            <div className='text-center w-full'>
              <div className='h-6 flex justify-center items-center'>
                <div className='w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
              </div>
              <div className='h-3 mt-1 flex justify-center items-center'>
                <div className='w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
              </div>
            </div>
          ) : error ? (
            <div className='text-red-500 text-center text-xs dark:text-red-400'>{error}</div>
          ) : (
            <div className='text-center flex items-center justify-center'>
              <span className='text-xl font-bold text-blue-600 dark:text-blue-400 mr-1.5'>
                {promptCount}
              </span>
              <p className='text-gray-500 text-xs m-0 dark:text-gray-400'>{t('availablePrompts')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 操作区域 */}
      <div className='flex flex-col gap-2'>
        <button
          onClick={openOptionsPage}
          className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200'
        >
          {t('managePrompts')}
        </button>

        <div className='rounded-lg shadow p-3 bg-white dark:bg-gray-800 transition-colors duration-200'>
          <div className='flex items-center justify-between flex-wrap gap-2 mb-2'>
            <div>
              <h2 className='text-sm font-semibold m-0 text-gray-800 dark:text-gray-100'>{t('popupExtractQuestionsTitle')}</h2>
              <p className='text-xs text-gray-500 dark:text-gray-400 m-0'>{t('popupExtractQuestionsSubtitle')}</p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={handleExtractQuestions}
                disabled={extractingQuestions}
                className='bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200'
              >
                {extractingQuestions ? t('popupExtractQuestionsWorking') : t('popupExtractQuestionsButton')}
              </button>
              <button
                onClick={handleClearQuestions}
                className='border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
              >
                {t('popupClearQuestionsButton')}
              </button>
            </div>
          </div>

          {extractQuestionsError && (
            <div className='text-xs text-red-500 dark:text-red-400 mb-2 leading-relaxed'>
              {extractQuestionsError}
            </div>
          )}

          <div className='max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900/40'>
            {extractedQuestions.length === 0 ? (
              <p className='text-xs text-gray-500 dark:text-gray-400 m-0'>{t('popupExtractQuestionsEmpty')}</p>
            ) : (
              <ol className='list-none m-0 p-0 space-y-2'>
                {extractedQuestions.map((question, index) => (
                  <li
                    key={`question-${index}`}
                    className='text-xs text-gray-700 dark:text-gray-200 leading-relaxed'
                    dangerouslySetInnerHTML={{ __html: question }}
                  />
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* 快捷方式提示区域 */}
        <div className='mt-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 shadow-sm'>
          <h3 className='text-xs font-medium text-gray-600 dark:text-gray-300 mb-2'>{t('usage')}</h3>

          <div className='flex items-start mb-2'>
            <div className='flex-shrink-0 text-blue-500 dark:text-blue-400 mr-2 mt-1'>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <span className='text-xs text-gray-600 dark:text-gray-300 leading-relaxed'>
              {t('quickInput')} <kbd className='inline-flex items-center justify-center px-1.5 py-0.5 my-0.5 text-xs font-semibold bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 shadow-sm text-blue-600 dark:text-blue-400 min-h-[20px]'>/p</kbd>
              {shortcutKey && (
                <> {t('orPress')} <kbd className='inline-flex items-center justify-center ml-1 px-1.5 py-0.5 my-0.5 text-xs font-semibold bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 shadow-sm text-blue-600 dark:text-blue-400 min-h-[20px]'>{shortcutKey}</kbd></>
              )}
            </span>
          </div>

          {saveShortcutKey && (
            <div className='flex items-start mb-2'>
              <div className='flex-shrink-0 text-blue-500 dark:text-blue-400 mr-2 mt-1'>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className='text-xs text-gray-600 dark:text-gray-300 leading-relaxed'>
                {t('quickSave')} <kbd className='inline-flex items-center justify-center px-1.5 py-0.5 my-0.5 text-xs font-semibold bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 shadow-sm text-blue-600 dark:text-blue-400 min-h-[20px]'>{saveShortcutKey}</kbd> {t('savePrompt')}
              </span>
            </div>
          )}

          <div className='flex items-start mb-2'>
            <div className='flex-shrink-0 text-blue-500 dark:text-blue-400 mr-2 mt-1'>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className='text-xs text-gray-600 dark:text-gray-300 leading-relaxed'>
              {t('rightClickSave')}
            </span>
          </div>

          {showShortcutHelp && (
            <div className='mt-2 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md border border-yellow-200 dark:border-yellow-800'>
              <div className='flex items-start'>
                <div className='flex-shrink-0 text-yellow-500 dark:text-yellow-400 mr-2 mt-1'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className='text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed mb-1'>
                    {t('shortcutNotConfigured')}
                  </p>
                  <button 
                    onClick={openShortcutSettings}
                    className='text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md transition-colors duration-200'
                  >
                    {t('configureShortcut')}
                  </button>
                  <button
                    onClick={dismissShortcutReminder}
                    className='text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-1 py-1 transition-colors duration-200 ml-2'
                    title={t('dismissReminderTitle')}
                  >
                    {t('noReminder')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
