import React from 'react'
import { MotionConfig } from 'framer-motion'
import ArticleTabs from './components/ArticleTabs'
import EditorCanvas from './components/EditorCanvas'
import ReviewPanel from './components/ReviewPanel'
import FloatingActionBall from './components/FloatingActionBall'

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col overflow-hidden bg-editor">
        {/* 顶部文章栏 */}
        <ArticleTabs />

        {/* 主内容区 */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* 编辑器 */}
          <EditorCanvas />

          {/* 反馈面板 */}
          <ReviewPanel />
        </div>

        {/* 悬浮球 */}
        <FloatingActionBall />
      </div>

      {/* 全站纸张质感：细噪点纸纹 + 中心微亮四角微沉的纸感光晕 */}
      <div className="paper-grain" aria-hidden />
      <div className="paper-vignette" aria-hidden />
    </MotionConfig>
  )
}

export default App
