import { storage } from '#imports'
import { isDarkMode } from '@/utils/tools'
import { showPromptSelector } from './components/PromptSelector'
import { extractVariables } from './utils/variableParser'
import { BROWSER_STORAGE_KEY } from '@/utils/constants'
import { migratePromptsWithCategory } from '@/utils/categoryUtils'
import type { EditableElement, PromptItem, PromptItemWithVariables } from '@/utils/types'
import { t } from '@/utils/i18n'

export default defineContentScript({
  matches: ['*://*/*'],

  async main(ctx) {
    console.log(t('contentScriptLoaded'))

    // 记录上次输入的状态
    let lastInputValue = ''
    let isPromptSelectorOpen = false

    const isAiStudioPage = (): boolean => {
      return window.location.hostname.includes('aistudio.google.com')
    }

    const isAlphaXivPage = (): boolean => {
      return window.location.hostname.includes('alphaxiv.org')
    }

    const MAX_EXTRACTED_QUESTIONS = 10

    const insertPromptAndRunOnAiStudio = async (promptText: string): Promise<void> => {
      try {
        const textarea = document.querySelector<HTMLTextAreaElement>('textarea')

        if (!textarea) {
          console.error('AI Studio: 未找到输入框')
          throw new Error(t('aiStudioTextareaMissing'))
        }

        textarea.value = promptText

        const inputEvent = new Event('input', { bubbles: true })
        textarea.dispatchEvent(inputEvent)

        const changeEvent = new Event('change', { bubbles: true })
        textarea.dispatchEvent(changeEvent)

        textarea.focus()

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            const runButton = document.querySelector<HTMLButtonElement>('button.run-button')
            if (runButton && !runButton.disabled) {
              runButton.click()
            } else {
              const allRunButtons = document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')
              for (const btn of Array.from(allRunButtons)) {
                if (btn.textContent?.includes('Run') && !btn.disabled) {
                  btn.click()
                  break
                }
              }
            }
            resolve()
          }, 500)
        })
      } catch (error) {
        console.error('AI Studio: insertPromptAndRunOnAiStudio 失败', error)
        throw error
      }
    }

    const insertPromptAndRunOnAlphaXiv = async (promptText: string): Promise<void> => {
      try {
        const editor = document.querySelector<HTMLDivElement>('.tiptap.ProseMirror[contenteditable="true"]')

        if (!editor) {
          console.error('AlphaXiv: 未找到输入框')
          throw new Error(t('aiStudioTextareaMissing'))
        }

        // 清空现有内容并插入新文本
        editor.textContent = promptText

        // 触发 input 事件以激活编辑器
        const inputEvent = new Event('input', { bubbles: true })
        editor.dispatchEvent(inputEvent)

        editor.focus()

        // 等待一段时间后点击发送按钮
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            // 查找带有 lucide-arrow-up 图标的发送按钮
            const arrowUpIcon = document.querySelector('.lucide.lucide-arrow-up')
            if (arrowUpIcon) {
              const sendButton = arrowUpIcon.closest('button')
              if (sendButton && !sendButton.disabled) {
                sendButton.click()
              }
            }
            resolve()
          }, 500)
        })
      } catch (error) {
        console.error('AlphaXiv: insertPromptAndRunOnAlphaXiv 失败', error)
        throw error
      }
    }

    const buildQuestionHtml = (index: number, title: string | null, text: string): string => {
      if (title && text.includes(title)) {
        const questionText = text.substring(text.indexOf(title) + title.length).trim()
        return `<span class="question-number">${index + 1}.</span> <span class="question-title">${title}</span> ${questionText}`
      }
      return `<span class="question-number">${index + 1}.</span> ${text}`
    }

    const stripNumberPrefix = (text: string): string => {
      return text.replace(/^\d+[\.\)、]\s*/, '')
    }

    const normalizeLinesFromBody = (): string[] => {
      const bodyText = document.body.innerText || ''
      return bodyText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    }

    const collectNumberedParagraphsFromLines = (lines: string[]): string[] => {
      const aggregated: string[] = []
      let current = ''

      for (const line of lines) {
        if (/^\d+[\.\)、]/.test(line)) {
          if (current) {
            aggregated.push(current.trim())
          }
          current = line
        } else if (current) {
          current += ` ${line}`
        }
      }

      if (current) {
        aggregated.push(current.trim())
      }

      return aggregated
    }

    const findSequentialQuestions = (aggregated: string[]): string[] => {
      const sequential: string[] = []
      let currentBlock: string[] = []
      let lastNumber: number | null = null

      for (const entry of aggregated) {
        const match = entry.match(/^(\d+)/)
        if (!match) continue
        const number = parseInt(match[1], 10)

        if (currentBlock.length === 0) {
          currentBlock.push(entry)
          lastNumber = number
        } else if (lastNumber !== null && number === lastNumber + 1) {
          currentBlock.push(entry)
          lastNumber = number
        } else {
          if (currentBlock.length >= 5) {
            return currentBlock
          }
          currentBlock = [entry]
          lastNumber = number
        }

        if (currentBlock.length >= 5) {
          return currentBlock
        }
      }

      if (currentBlock.length >= 5) {
        return currentBlock
      }

      return sequential
    }

    const extractQuestionsFromAiResponse = (): string[] => {
      const questions: string[] = []
      let foundQuestions = false

      if (!document.querySelector('textarea')) {
        throw new Error(t('aiStudioTextareaMissing'))
      }

      const allOrderedLists = document.querySelectorAll<HTMLOListElement>('ol')
      for (let i = 0; i < allOrderedLists.length; i++) {
        const listItems = allOrderedLists[i].querySelectorAll('li')
        if (listItems.length >= 5) {
          const tempQuestions: string[] = []
          listItems.forEach((item, index) => {
            if (index < MAX_EXTRACTED_QUESTIONS) {
              const strongElement = item.querySelector<HTMLElement>('strong, b')
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

      if (!foundQuestions) {
        console.log('尝试从段落中提取问题')
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
        
        console.log(`找到 ${numberedParagraphs.length} 个编号段落`)
        
        if (numberedParagraphs.length >= 5) {
          numberedParagraphs.slice(0, MAX_EXTRACTED_QUESTIONS).forEach((item, index) => {
            if (item.title && item.fullText.includes(item.title)) {
              const questionText = item.fullText.substring(item.fullText.indexOf(item.title) + item.title.length).trim()
              const cleanTitle = stripNumberPrefix(item.title)
              const cleanRest = stripNumberPrefix(questionText)
              questions.push(`<span class="question-number">${index + 1}.</span> <span class="question-title">${cleanTitle}</span> ${cleanRest}`)
            } else {
              questions.push(`<span class="question-number">${index + 1}.</span> ${stripNumberPrefix(item.fullText)}`)
            }
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

      if (!foundQuestions) {
        const lines = normalizeLinesFromBody()
        const aggregated = collectNumberedParagraphsFromLines(lines)
        const sequentialBlock = findSequentialQuestions(aggregated)

        if (sequentialBlock.length >= 5) {
          sequentialBlock.slice(0, MAX_EXTRACTED_QUESTIONS).forEach((text, index) => {
            questions.push(`<span class="question-number">${index + 1}.</span> ${stripNumberPrefix(text)}`)
          })
          foundQuestions = true
        }
      }

      if (!foundQuestions || questions.length === 0) {
        throw new Error(t('aiStudioNoQuestionsFound'))
      }

      return questions
    }

    const extractQuestionsFromAlphaXiv = (): string[] => {
      const questions: string[] = []
      let foundQuestions = false

      // 查找所有 markdown-content 容器（AlphaXiv 特有的结构）
      const markdownContents = document.querySelectorAll<HTMLDivElement>('.markdown-content')
      
      // 优先从最后一个 markdown-content 中提取（最新的 AI 回复）
      for (let i = markdownContents.length - 1; i >= 0; i--) {
        const container = markdownContents[i]
        const orderedLists = container.querySelectorAll<HTMLOListElement>('ol')
        
        for (let j = 0; j < orderedLists.length; j++) {
          const listItems = orderedLists[j].querySelectorAll('li')
          
          if (listItems.length >= 5) {
            const tempQuestions: string[] = []
            listItems.forEach((item, index) => {
              if (index < MAX_EXTRACTED_QUESTIONS) {
                // 提取 strong 标签作为标题
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
        
        if (foundQuestions) break
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
            if (item.title && item.fullText.includes(item.title)) {
              const questionText = item.fullText.substring(item.fullText.indexOf(item.title) + item.title.length).trim()
              const cleanTitle = stripNumberPrefix(item.title)
              const cleanRest = stripNumberPrefix(questionText)
              questions.push(`<span class="question-number">${index + 1}.</span> <span class="question-title">${cleanTitle}</span> ${cleanRest}`)
            } else {
              questions.push(`<span class="question-number">${index + 1}.</span> ${stripNumberPrefix(item.fullText)}`)
            }
          })
          foundQuestions = true
        }
      }

      if (!foundQuestions || questions.length === 0) {
        throw new Error(t('aiStudioNoQuestionsFound'))
      }

      return questions
    }

    // 设置容器的主题属性
    const setThemeAttributes = (container: HTMLElement) => {
      // 设置数据属性以指示当前主题
      container.setAttribute('data-theme', isDarkMode() ? 'dark' : 'light')

      // 监听主题变化
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleThemeChange = (e: MediaQueryListEvent) => {
        container.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }

      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleThemeChange)
      }
    }

    // 获取 contenteditable 元素的内容
    const getContentEditableValue = (element: HTMLElement): string => {
      return element.textContent || ''
    }

    // 设置 contenteditable 元素的内容
    const setContentEditableValue = (element: HTMLElement, value: string): void => {
      element.textContent = value
      // 触发 input 事件以通知其他监听器内容变化
      const inputEvent = new InputEvent('input', { bubbles: true })
      element.dispatchEvent(inputEvent)
    }

    // 创建适配器以统一处理不同类型的输入元素
    const createEditableAdapter = (element: HTMLElement | HTMLInputElement | HTMLTextAreaElement): EditableElement => {
      // 处理标准输入元素
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element
      } 
      // 处理 contenteditable 元素
      else if (element.getAttribute('contenteditable') === 'true') {
        const adapter = {
          _element: element, // 保存原始元素引用
          get value(): string {
            return getContentEditableValue(element)
          },
          set value(newValue: string) {
            setContentEditableValue(element, newValue)
          },
          // contenteditable 元素没有原生的 selectionStart 属性，
          // 但可以通过 selection API 获取当前光标位置
          get selectionStart(): number {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              if (element.contains(range.startContainer)) {
                return range.startOffset
              }
            }
            return 0
          },
          focus(): void {
            element.focus()
          },
          setSelectionRange(start: number, end: number): void {
            try {
              const selection = window.getSelection()
              if (selection) {
                selection.removeAllRanges()
                const range = document.createRange()
                // 尝试在文本节点中设置范围
                let textNode = element.firstChild
                if (!textNode) {
                  textNode = document.createTextNode('')
                  element.appendChild(textNode)
                }
                range.setStart(textNode, Math.min(start, textNode.textContent?.length || 0))
                range.setEnd(textNode, Math.min(end, textNode.textContent?.length || 0))
                selection.addRange(range)
              }
            } catch (error) {
              console.error('设置 contenteditable 光标位置失败:', error)
            }
          },
          dispatchEvent(event: Event): boolean {
            return element.dispatchEvent(event)
          }
        }
        return adapter as EditableElement
      }
      return null as unknown as EditableElement
    }

    // 通用函数：获取当前聚焦的输入框元素（如果有）
    const getFocusedTextInput = (): EditableElement | null => {
      const activeElement = document.activeElement
      
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return activeElement
      } 
      // 支持 contenteditable 元素
      else if (
        activeElement instanceof HTMLElement &&
        activeElement.getAttribute('contenteditable') === 'true'
      ) {
        return createEditableAdapter(activeElement)
      }
      return null
    }

    // 通用函数：打开选项页并传递选中的文本
    const openOptionsWithText = async (text: string) => {
      try {
        // 不直接使用tabs API，而是发送消息给背景脚本
        const response = await browser.runtime.sendMessage({
          action: 'openOptionsPageWithText',
          text: text
        })
        
        console.log('内容脚本: 已请求背景脚本打开选项页', response)
        return response && response.success
      } catch (error) {
        console.error('内容脚本: 请求打开选项页失败:', error)
        return false
      }
    }

    // 通用函数：打开提示词选择器
    const openPromptSelector = async (inputElement?: EditableElement) => {
      if (isPromptSelectorOpen) return

      try {
        isPromptSelectorOpen = true
        console.log('准备打开提示词选择器...')

        // 保存当前活动元素
        const activeElement = document.activeElement as HTMLElement

        // 如果没有提供输入框，尝试获取当前聚焦的输入框
        const targetInput = inputElement || getFocusedTextInput()

        // 如果找不到任何输入框，给出提示并返回
        if (!targetInput) {
          alert(t('clickInputBoxFirst'))
          isPromptSelectorOpen = false
          return
        }

        // 先执行数据迁移，确保分类信息正确
        await migratePromptsWithCategory()

        // 从存储中获取所有提示词
        const allPrompts = (await storage.getItem<PromptItem[]>(`local:${BROWSER_STORAGE_KEY}`)) || []
        
        // 过滤只保留启用的提示词
        const prompts : PromptItemWithVariables[] = allPrompts.filter(prompt => prompt.enabled !== false)

        // 预处理提示词中的变量
        prompts.forEach(prompt => {
          // 从内容中提取变量
          prompt._variables = extractVariables(prompt.content)
        })

        if (prompts && prompts.length > 0) {
          console.log(`共找到 ${prompts.length} 个启用的提示词，显示选择器...`)

          // 显示提示词选择器弹窗
          const container = showPromptSelector(prompts, targetInput, () => {
            // 在选择器关闭时恢复焦点
            if (activeElement && typeof activeElement.focus === 'function') {
              setTimeout(() => {
                console.log(t('restoreFocus'))
                activeElement.focus()
              }, 100)
            }
            isPromptSelectorOpen = false
          })

          // 设置主题
          if (container) {
            setThemeAttributes(container)
          }

        } else {
          console.log(t('noEnabledPromptsFound'))
          alert(t('noEnabledPromptsAlert'))
          isPromptSelectorOpen = false
        }
      } catch (error) {
        console.error(t('errorGettingPrompts'), error)
        isPromptSelectorOpen = false
      }
    }

    // 用于记录可编辑元素的最后一次内容
    const contentEditableValuesMap = new WeakMap<HTMLElement, string>()

    // 监听输入框输入事件
    document.addEventListener('input', async (event) => {
      // 检查事件目标是否为标准输入元素（输入框或文本域）
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        const inputElement = event.target as HTMLInputElement | HTMLTextAreaElement
        const value = inputElement.value

        // 检查是否输入了"/p"并且弹窗尚未打开
        if (value?.toLowerCase()?.endsWith('/p') && lastInputValue !== value && !isPromptSelectorOpen) {
          lastInputValue = value

          // 使用通用函数打开提示词选择器
          await openPromptSelector(inputElement)
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
          // 更新上次输入值
          lastInputValue = value
        }
      } 
      // 支持 contenteditable 元素的输入检测
      else if (
        event.target instanceof HTMLElement && 
        event.target.getAttribute('contenteditable') === 'true'
      ) {
        const editableElement = event.target as HTMLElement
        const adapter = createEditableAdapter(editableElement)
        const value = adapter.value

        // 获取上一次的值，如果没有则为空字符串
        const lastValue = contentEditableValuesMap.get(editableElement) || ''
        
        // 检查是否输入了"/p"并且弹窗尚未打开
        if (value?.toLowerCase()?.endsWith('/p') && lastValue !== value && !isPromptSelectorOpen) {
          contentEditableValuesMap.set(editableElement, value)
          
          // 使用通用函数打开提示词选择器
          await openPromptSelector(adapter)
        } else if (!value?.toLowerCase()?.endsWith('/p')) {
          // 更新上次输入值
          contentEditableValuesMap.set(editableElement, value)
        }
      }
    })

    // 监听来自背景脚本的消息
    browser.runtime.onMessage.addListener(async (message) => {
      console.log('内容脚本: 收到消息', message)

      if (message.action === 'insertPrompt') {
        if (!isAiStudioPage() && !isAlphaXivPage()) {
          return { success: false, error: t('aiStudioPageRequired') }
        }
        const promptText = typeof message.text === 'string' ? message.text : ''
        if (!promptText.trim()) {
          return { success: false, error: t('aiStudioPromptRequired') }
        }
        try {
          if (isAlphaXivPage()) {
            await insertPromptAndRunOnAlphaXiv(promptText)
          } else {
            await insertPromptAndRunOnAiStudio(promptText)
          }
          return { success: true }
        } catch (error: any) {
          return { success: false, error: error?.message || t('aiStudioInsertFailed') }
        }
      }

      if (message.action === 'extractQuestions') {
        if (!isAiStudioPage() && !isAlphaXivPage()) {
          return { success: false, error: t('aiStudioPageRequired') }
        }
        try {
          const questions = isAlphaXivPage() 
            ? extractQuestionsFromAlphaXiv() 
            : extractQuestionsFromAiResponse()
          return { success: true, questions }
        } catch (error: any) {
          return { success: false, error: error?.message || t('aiStudioExtractFailed') }
        }
      }

      if (message.action === 'openPromptSelector') {
        // 使用通用函数打开提示词选择器
        await openPromptSelector()
        return { success: true }
      }

      if (message.action === 'getSelectedText') {
        try {
          // 获取当前选中的文本
          const selectedText = window.getSelection()?.toString() || ''
          console.log('内容脚本: 获取到选中文本:', selectedText)
          
          if (selectedText) {
            // 如果有选中文本，通过背景脚本打开选项页
            const opened = await openOptionsWithText(selectedText)
            return { success: true, text: selectedText, openedOptionsPage: opened }
          } else {
            console.log('内容脚本: 未选中任何文本')
            return { success: true, text: '' }
          }
        } catch (error) {
          console.error(t('errorGettingSelectedText'), error)
          return { success: false, error: t('getSelectedTextFailed') }
        }
      }

      return false
    })
  },
})
