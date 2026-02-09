import { BROWSER_STORAGE_KEY } from '@/utils/constants'
import { useState, useEffect } from 'react'
import '~/assets/tailwind.css'
import { t } from '../../utils/i18n'

const LAST_QUESTIONS_STORAGE_KEY = 'quickPrompt:lastExtractedQuestions'

function App() {
  const [promptCount, setPromptCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
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

  // 首次加载
  useEffect(() => {
    loadPromptCount()

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

  useEffect(() => {
    const loadLastQuestions = async () => {
      try {
        const result = await browser.storage.local.get(LAST_QUESTIONS_STORAGE_KEY)
        const savedQuestions = result?.[LAST_QUESTIONS_STORAGE_KEY]
        if (Array.isArray(savedQuestions)) {
          setExtractedQuestions(savedQuestions)
        }
      } catch (err) {
        console.error('弹出窗口：读取历史问题失败', err)
      }
    }
    loadLastQuestions()
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

  const getActiveTabId = async (): Promise<number | undefined> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    return tabs[0]?.id
  }

  const htmlToPlainText = (html: string): string => {
    const container = document.createElement('div')
    container.innerHTML = html
    return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim()
  }

  const formatQuestionWithIndex = (text: string, index: number): string => {
    const NBSP = '\u00A0'
    const stripped = text.replace(/^\d+[\.\)、]\s*/, '').trim()
    return `${index}.${NBSP}${stripped}`
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

        const isAlphaXiv = window.location.hostname.includes('alphaxiv.org')
        const isAiStudio = window.location.hostname.includes('aistudio.google.com')
        
        if (!isAlphaXiv && !isAiStudio) {
          throw new Error('请在支持的页面中使用该功能（Google AI Studio 或 AlphaXiv）')
        }

        // AlphaXiv 特定的提取逻辑
        if (isAlphaXiv) {
          const markdownContents = document.querySelectorAll<HTMLDivElement>('.markdown-content')
          
          // 优先从最后一个 markdown-content 中提取（最新的 AI 回复）
          for (let i = markdownContents.length - 1; i >= 0 && !foundQuestions; i--) {
            const container = markdownContents[i]
            const orderedLists = container.querySelectorAll<HTMLOListElement>('ol')
            
            for (let j = 0; j < orderedLists.length; j++) {
              const listItems = orderedLists[j].querySelectorAll('li')
              
              if (listItems.length >= 5) {
                const tempQuestions: string[] = []
                listItems.forEach((item, index) => {
                  if (index < MAX_EXTRACTED_QUESTIONS) {
                    const strongElement = item.querySelector<HTMLElement>('strong')
                    const title = strongElement ? strongElement.textContent?.trim() || '' : ''
                    const fullQuestion = item.textContent?.trim() || ''
                    
                    tempQuestions.push(buildQuestionHtml(index, title || null, fullQuestion))
                  }
                })
                
                if (tempQuestions.length >= 5) {
                  questions.push(...tempQuestions)
                  foundQuestions = true
                  break
                }
              }
            }
          }

          // 备用方案：从整个页面的 <p> 标签中查找编号段落
          if (!foundQuestions) {
            const allParagraphs = document.querySelectorAll<HTMLParagraphElement>('.markdown-content p')
            const numberedParagraphs: { title: string | null; fullText: string }[] = []
            
            allParagraphs.forEach((paragraph) => {
              const text = paragraph.textContent?.trim() || ''
              if (/^\d+[\.\)、]/.test(text) && text.length > 10) {
                const strongElement = paragraph.querySelector<HTMLElement>('strong')
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
        }

        // AI Studio 原有的提取逻辑
        if (!foundQuestions) {
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
      try {
        await browser.storage.local.set({
          [LAST_QUESTIONS_STORAGE_KEY]: questions,
        })
      } catch (err) {
        console.error('弹出窗口：缓存提取问题失败', err)
      }
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

  const handleClearQuestions = async () => {
    setExtractedQuestions([])
    setExtractQuestionsError(null)
    try {
      await browser.storage.local.remove(LAST_QUESTIONS_STORAGE_KEY)
    } catch (err) {
      console.error('弹出窗口：清理历史问题失败', err)
    }
  }

  const handleQuestionClick = async (questionHtml: string, displayIndex: number) => {
    try {
      const plainText = htmlToPlainText(questionHtml)
      if (!plainText) {
        setExtractQuestionsError(t('popupSendQuestionFailed'))
        return
      }
      const finalText = formatQuestionWithIndex(plainText, displayIndex)
      setExtractQuestionsError(null)
      const tabId = await getActiveTabId()
      if (!tabId) {
        throw new Error(t('popupExtractQuestionsNoTab'))
      }
      await sendMessageWithAutoInjection(tabId, {
        action: 'insertPrompt',
        text: finalText
      })
    } catch (err: any) {
      console.error('弹出窗口：发送问题失败', err)
      setExtractQuestionsError(err?.message || t('popupSendQuestionFailed'))
    }
  }

  return (
    <div className='p-4 w-full max-w-[700px] min-w-[600px] box-border bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200'>
      {/* 统计卡片 */}
      <div className='rounded-lg shadow p-2 mb-3 relative bg-white dark:bg-gray-800 transition-colors duration-200'>
        <div className='flex justify-between items-center mb-1'>
          <div className='flex items-center'>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <span className='text-xl font-bold text-cyan-600 dark:text-cyan-400 mr-1.5'>
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
          className='bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 transition-colors duration-200'
        >
          {t('managePrompts')}
        </button>

        <div className='rounded-lg shadow bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 transition-colors duration-200'>
          {/* 标题区域 */}
          <div className='flex items-center gap-3 mb-3'>
            <div className='flex-shrink-0 w-10 h-10 bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300 rounded-full flex items-center justify-center'>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className='flex-1'>
              <h2 className='text-sm font-semibold m-0 text-gray-900 dark:text-white leading-tight'>{t('popupExtractQuestionsTitle')}</h2>
              <p className='text-xs text-gray-500 dark:text-gray-400 m-0 mt-0.5 leading-tight'>{t('popupExtractQuestionsSubtitle')}</p>
            </div>
          </div>

          {/* 按钮区域 */}
          <div className='flex items-center gap-2 mb-3'>
            <button
              onClick={handleExtractQuestions}
              disabled={extractingQuestions}
              className='flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-cyan-700 active:bg-cyan-800 disabled:bg-cyan-400 disabled:text-white disabled:cursor-not-allowed transition-colors duration-200'
            >
              {extractingQuestions ? (
                <span className='flex items-center justify-center gap-2'>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('popupExtractQuestionsWorking')}
                </span>
              ) : (
                t('popupExtractQuestionsButton')
              )}
            </button>
            <button
              onClick={handleClearQuestions}
              className='px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
            >
              {t('popupClearQuestionsButton')}
            </button>
          </div>

          {/* 错误提示 */}
          {extractQuestionsError && (
            <div className='mb-3 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2'>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className='text-xs text-red-600 dark:text-red-400 leading-relaxed flex-1'>
                {extractQuestionsError}
              </span>
            </div>
          )}

          {/* 结果展示区域 */}
          <div className='max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900'>
            {extractedQuestions.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-6 text-center'>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className='text-sm text-gray-500 dark:text-gray-400 m-0 font-medium'>{t('popupExtractQuestionsEmpty')}</p>
              </div>
            ) : (
              <ol className='list-none m-0 p-0 space-y-2'>
                {extractedQuestions.map((question, index) => (
                  <li
                    key={`question-${index}`}
                    className='text-sm text-gray-700 dark:text-gray-200 leading-relaxed p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
                    onClick={() => handleQuestionClick(question, index + 1)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleQuestionClick(question, index + 1)
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: question }}
                  />
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
