import React, { useState, useEffect } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import { Feather, Loader2, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FloatingActionBall() {
  const { isReviewing, isThinking, triggerReview, requestPanelClose, showBottomBar } = useWriterStore()
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
      // 评价完成后再次点击 → 回到最初的编辑器视角
      if (!isThinking) requestPanelClose()
      return
    }
    triggerReview()
  }

  const getIcon = () => {
    if (isThinking) return <Loader2 className="w-6 h-6 animate-spin" />
    if (isDone) return <X className="w-6 h-6" />
    return <Feather className="w-6 h-6" />
  }

  const tooltipText = isDone ? '返回编辑' : 'AI 锐评'

  // 下边栏升起时，把悬浮球抬到其上方，避免遮挡总评；移动端抽屉自带关闭按钮，直接隐藏
  if (showBottomBar && isMobile) return null

  return (
    <motion.button
      className={`fixed z-50 w-16 h-16 rounded-full bg-editor-accent text-white 
                 flex items-center justify-center shadow-lg cursor-pointer
                 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-500`}
      style={{ right: 32, bottom: showBottomBar ? 'calc(50vh + 28px)' : 32 }}
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
