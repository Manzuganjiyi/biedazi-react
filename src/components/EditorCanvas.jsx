import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import GhostTextOverlay from './GhostTextOverlay'

export default function EditorCanvas() {
  const { 
    articles, activeArticleId, updateContent, updateMeta, 
    ghostActive, ghostText, acceptGhost, clearGhost,
    isThinking, resultsVisible, showBottomBar, isReviewing, bottomBarH,
    showContinuation, setShowContinuation, setShowBottomBar,
    continuationDimmed, setContinuationDimmed,
  } = useWriterStore()

  const editorRef = useRef(null)
  const titleRef = useRef(null)
  const authorRef = useRef(null)
  const saveTimer = useRef(null)
  const scrollAreaRef = useRef(null)
  const contRef = useRef(null)
  const contTouchY = useRef(null)
  const upAccum = useRef(0)
  const downAccum = useRef(0)
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
    // 输入文字时自动收起批注与总评；续写内容以淡色形式保留在原位
    if (isReviewing && resultsVisible) {
      setShowBottomBar(false)
      setShowContinuation(true)
      setContinuationDimmed(true)
    }
    if (!editorRef.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const text = Array.from(editorRef.current.querySelectorAll('p'))
        .map(p => p.textContent)
        .join('\n\n')
      updateContent(text)
    }, 500)
  }, [updateContent, checkEmpty, isReviewing, resultsVisible, setShowBottomBar, setShowContinuation, setContinuationDimmed])

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

  // 批注标记：结果可见时在原文中内嵌标记与角标；切到续写模式时移除标记避免与续写文案混淆
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    // 先清除旧标记，避免残留角标数字
    editor.querySelectorAll('mark.anno-mark').forEach(m => {
      const clone = m.cloneNode(true)
      clone.querySelectorAll('.anno-badge').forEach(b => b.remove())
      m.replaceWith(document.createTextNode(clone.textContent))
    })

    if (showContinuation) return
    if (!annotations.length || !resultsVisible) return

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
  }, [activeArticleId, resultsVisible, annotations, showContinuation])

  // 与回退键一致的双向滚动切换：
  // 滚动到顶再向上滚 → 收起右栏/底栏，切到纯编辑器+续写视图（同 returnToEditor 的收起）
  // 滚动到底再向下滚 → 重新展开右栏（同 returnToEditor 的展开）
  // 两方向都带累积缓冲，避免顺手一滚就误触
  const revealContinuation = useCallback(() => {
    setShowContinuation(true)
    setShowBottomBar(false)
    setContinuationDimmed(false)
  }, [setShowContinuation, setShowBottomBar, setContinuationDimmed])

  const expandPanels = useCallback(() => {
    setShowContinuation(false)
    setContinuationDimmed(false)
  }, [setShowContinuation, setContinuationDimmed])

  const handleEditorWheel = useCallback((e) => {
    const el = scrollAreaRef.current
    if (!el || !resultsVisible) return
    const nearTop = el.scrollTop <= 4
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30

    if (!showContinuation) {
      // 右栏展开态：滚到顶后再向上滚 → 收起
      if (nearTop && e.deltaY < 0) {
        upAccum.current += Math.abs(e.deltaY)
        if (upAccum.current >= 60) {
          upAccum.current = 0
          revealContinuation()
        }
      } else {
        upAccum.current = 0
      }
    } else {
      // 纯编辑器态：滚到底后再向下滚 → 展开右栏
      if (nearBottom && e.deltaY > 0) {
        downAccum.current += Math.abs(e.deltaY)
        if (downAccum.current >= 60) {
          downAccum.current = 0
          expandPanels()
        }
      } else {
        downAccum.current = 0
      }
    }
  }, [showContinuation, resultsVisible, revealContinuation, expandPanels])

  const handleEditorTouchStart = useCallback((e) => {
    contTouchY.current = e.touches?.[0]?.clientY ?? null
  }, [])

  const handleEditorTouchMove = useCallback((e) => {
    const el = scrollAreaRef.current
    if (!el || contTouchY.current == null || !resultsVisible) return
    const dy = contTouchY.current - e.touches[0].clientY
    const nearTop = el.scrollTop <= 4
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30

    if (!showContinuation) {
      // 右栏展开态：滚到顶后再向上滚（dy<0 向上滚动）→ 收起
      if (nearTop && dy < 0) {
        upAccum.current += Math.abs(dy)
        if (upAccum.current >= 60) {
          upAccum.current = 0
          revealContinuation()
          contTouchY.current = null
          return
        }
      } else {
        upAccum.current = 0
      }
    } else {
      // 纯编辑器态：滚到底后再向下滚（dy>0 向下滚动）→ 展开右栏
      if (nearBottom && dy > 0) {
        downAccum.current += Math.abs(dy)
        if (downAccum.current >= 60) {
          downAccum.current = 0
          expandPanels()
          contTouchY.current = null
          return
        }
      } else {
        downAccum.current = 0
      }
    }
    contTouchY.current = e.touches[0].clientY
  }, [showContinuation, resultsVisible, revealContinuation, expandPanels])

  // 滚动触发（非淡色）切到续写模式后，把续写内容滚动到视野内；输入触发的淡色保留不抢光标位置
  useEffect(() => {
    if (showContinuation && !continuationDimmed && contRef.current && scrollAreaRef.current) {
      const el = scrollAreaRef.current
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [showContinuation, continuationDimmed])

  return (
    <div
      className={`flex-1 flex flex-col bg-editor relative overflow-hidden ${isReviewing && !showContinuation ? 'editor-review-mode' : ''}`}
      style={{
        // 右侧批注栏一出现就让出右列空间（编辑器整体左移，不被遮挡）；
        // 下边栏升起时再同步压缩高度，两者配合形成"向左上"的留白；
        // 切到续写模式后恢复满宽满高，仅剩编辑器
        marginRight: isReviewing && !showContinuation ? 432 : 0,
        height: showBottomBar && !showContinuation ? `calc(100% - ${bottomBarH}vh)` : '100%',
        transition: 'margin-right 0.5s cubic-bezier(0.22, 1, 0.36, 1), height 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        ref={scrollAreaRef}
        onWheel={handleEditorWheel}
        onTouchStart={handleEditorTouchStart}
        onTouchMove={handleEditorTouchMove}
        className="editor-scroll-area flex-1 overflow-y-auto px-5 py-10"
      >
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

          {/* 续写内容：切到续写模式后，紧跟在文段之后呈现；输入文字时以淡色形式保留 */}
          {showContinuation && activeArticle?.review?.continuation && (
            <div
              ref={contRef}
              className={`mt-8 pt-6 border-t border-editor-border/50 transition-opacity duration-500 ${continuationDimmed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 mb-4 text-xs text-editor-secondary/70 tracking-widest">
                <span className="w-1 h-1 rounded-full bg-editor-accent/60" />
                续写
              </div>
              <div className="font-serif-cn leading-editor text-base text-editor-text/85 whitespace-pre-line">
                {activeArticle.review.continuation}
              </div>
            </div>
          )}
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
