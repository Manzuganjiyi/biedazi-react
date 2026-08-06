import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import GhostTextOverlay from './GhostTextOverlay'

export default function EditorCanvas() {
  const { 
    articles, activeArticleId, updateContent, updateMeta, 
    ghostActive, ghostText, acceptGhost, clearGhost,
    isThinking, resultsVisible, showBottomBar
  } = useWriterStore()

  const editorRef = useRef(null)
  const titleRef = useRef(null)
  const authorRef = useRef(null)
  const saveTimer = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const activeArticle = articles.find(a => a.id === activeArticleId)
  const annotations = activeArticle?.review?.annotations || []

  // 检查编辑器是否为空
  const checkEmpty = useCallback(() => {
    if (!editorRef.current) return true
    const text = editorRef.current.innerText || ''
    setIsEmpty(text.trim().length === 0)
  }, [])

  // 加载文章内容
  useEffect(() => {
    if (!activeArticle || !editorRef.current) return
    if (activeArticle.content) {
      editorRef.current.innerHTML = activeArticle.content
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('')
    } else {
      editorRef.current.innerHTML = '<p><br></p>'
    }
    checkEmpty()
    if (titleRef.current) {
      titleRef.current.value = activeArticle.title === '未命名篇章' ? '' : activeArticle.title
    }
    if (authorRef.current) {
      authorRef.current.value = activeArticle.author === '佚名' ? '' : activeArticle.author
    }
  }, [activeArticleId])

  const handleInput = useCallback(() => {
    checkEmpty()
    if (!editorRef.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const text = Array.from(editorRef.current.querySelectorAll('p'))
        .map(p => p.textContent)
        .join('\n\n')
      updateContent(text)
    }, 500)
  }, [updateContent, checkEmpty])

  const handleKeyDown = useCallback((e) => {
    if (!ghostActive) return
    if (e.key === 'Enter') {
      e.preventDefault()
      acceptGhost()
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      clearGhost()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      clearGhost()
    }
  }, [ghostActive, acceptGhost, clearGhost])

  const handleTitleBlur = () => {
    updateMeta(titleRef.current?.value, authorRef.current?.value)
  }

  const handleAuthorBlur = () => {
    updateMeta(titleRef.current?.value, authorRef.current?.value)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      authorRef.current?.focus()
    }
  }

  // 在原文中内嵌批注标记（mark + 序号角标）
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !annotations.length || !resultsVisible) return

    // 先清除旧标记，避免残留角标数字
    editor.querySelectorAll('mark.anno-mark').forEach(m => {
      const clone = m.cloneNode(true)
      clone.querySelectorAll('.anno-badge').forEach(b => b.remove())
      m.replaceWith(document.createTextNode(clone.textContent))
    })

    annotations.forEach((anno, idx) => {
      if (!anno?.quote) return
      const paras = Array.from(editor.querySelectorAll('p'))
      for (const p of paras) {
        if (p.querySelector('mark.anno-mark')) continue
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
        let node
        let found = false
        while ((node = walker.nextNode())) {
          if (node.parentElement && node.parentElement.closest('mark.anno-mark')) continue
          const pos = node.textContent.indexOf(anno.quote)
          if (pos >= 0) {
            const mark = document.createElement('mark')
            mark.className = 'anno-mark'
            mark.dataset.index = String(idx)
            mark.style.setProperty('--i', idx)
            mark.textContent = anno.quote
            const badge = document.createElement('span')
            badge.className = 'anno-badge'
            badge.textContent = String(idx + 1)
            mark.appendChild(badge)
            const tail = document.createTextNode(node.textContent.slice(pos + anno.quote.length))
            node.textContent = node.textContent.slice(0, pos)
            node.parentNode.insertBefore(mark, node.nextSibling)
            node.parentNode.insertBefore(tail, mark.nextSibling)
            found = true
            break
          }
        }
        if (found) break
      }
    })
  }, [activeArticleId, resultsVisible, annotations])

  return (
    <div className={`flex-1 flex flex-col bg-editor relative overflow-hidden ${showBottomBar ? 'editor-review-mode' : ''}`}>
      <div className="editor-scroll-area flex-1 overflow-y-auto px-5 py-10">
        <div className="max-w-[720px] mx-auto relative">
          {/* 元信息栏 */}
          <div className="mb-8">
            <input
              ref={titleRef}
              type="text"
              placeholder="未命名篇章"
              className="meta-input font-serif-cn text-2xl font-semibold text-editor-text pb-1"
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
            <input
              ref={authorRef}
              type="text"
              placeholder="佚名"
              className="meta-input w-3/5 text-sm text-editor-secondary mt-2 pb-1"
              onBlur={handleAuthorBlur}
            />
          </div>

          {/* 编辑器 */}
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="editor-typography min-h-[400px] outline-none text-editor-text"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
            />
            {/* JS 控制的 placeholder */}
            {isEmpty && (
              <div 
                className="absolute top-0 left-0 pointer-events-none text-editor-secondary/50 text-base leading-editor"
                style={{ zIndex: 1 }}
              >
                开始写作...
              </div>
            )}
            <GhostTextOverlay />
          </div>
        </div>
      </div>

      {/* AI 分析中的扫描动效 */}
      {isThinking && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute left-0 right-0 h-40 animate-editor-scan"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(74,74,74,0.09), transparent)' }}
          />
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-editor-accent/30 rounded-tl-md" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-editor-accent/30 rounded-tr-md" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-editor-accent/30 rounded-bl-md" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-editor-accent/30 rounded-br-md" />
        </div>
      )}
    </div>
  )
}
