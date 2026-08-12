import React, { useState, useEffect } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import { Feather, Loader2, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FloatingActionBall() {
  const { isReviewing, isThinking, triggerReview, returnToEditor, showBottomBar, bottomBarH, showContinuation } = useWriterStore(
    useShallow((s) => ({
      isReviewing: s.isReviewing,
      isThinking: s.isThinking,
      triggerReview: s.triggerReview,
      returnToEditor: s.returnToEditor,
      showBottomBar: s.showBottomBar,
      bottomBarH: s.bottomBarH,
      showContinuation: s.showContinuation,
    }))
  )
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isDone = isReviewing && !isThinking

  const handleClick = () => {
    if (isReviewing) {
      // 评价完成后再次点击 → 收起右栏与下边栏，返回上一页面状态（编辑器视角）
      if (!isThinking) returnToEditor()
      return
    }
    triggerReview()
  }

  const getIcon = () => {
    if (isThinking) return <Loader2 className="w-6 h-6 animate-spin" />
    if (isDone) return <ArrowLeft className="w-6 h-6" />
    return <Feather className="w-6 h-6" />
  }

  const tooltipText = isDone ? (showContinuation ? '展开点评' : '返回编辑') : '开始解读'

  // 移动端底部抽屉自带关闭按钮，审稿期间隐藏悬浮球，避免遮挡
  if (isMobile && isReviewing) return null

  // 下边栏升起时把球"顶上去"：用 transform 位移代替动画 bottom，避免 layout 抖动
  const liftPx = showBottomBar ? window.innerHeight * (bottomBarH / 100) + 28 - 32 : 0

  return (
    <motion.button
      className={`fixed z-50 w-16 h-16 rounded-full bg-editor-accent text-white 
                 flex items-center justify-center shadow-lg cursor-pointer
                 disabled:opacity-60 disabled:cursor-not-allowed`}
      style={{ right: 32, bottom: 32 }}
      animate={{ y: -liftPx }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      disabled={isReviewing && isThinking}
    >
      {getIcon()}

      {/* Tooltip */}
      <motion.div
        className="absolute right-[72px] top-1/2 -translate-y-1/2 
                   bg-editor-accent text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap
                   pointer-events-none"
        initial={{ opacity: 0, scale: 0.9, x: 5 }}
        animate={{ 
          opacity: isHovered && !isThinking ? 1 : 0, 
          scale: isHovered && !isThinking ? 1 : 0.9,
          x: isHovered && !isThinking ? 0 : 5
        }}
        transition={{ duration: 0.2 }}
      >
        {tooltipText}
      </motion.div>
    </motion.button>
  )
}
