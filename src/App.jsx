import React from 'react'
import ArticleTabs from './components/ArticleTabs'
import EditorCanvas from './components/EditorCanvas'
import ReviewPanel from './components/ReviewPanel'
import FloatingActionBall from './components/FloatingActionBall'

function App() {
  return (
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
  )
}

export default App
