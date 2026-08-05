import React, { useEffect, useRef } from 'react'
import { useWriterStore } from '../store/useWriterStore'

export default function GhostTextOverlay() {
  const { ghostText, ghostActive } = useWriterStore()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!ghostActive || !ghostText) return
    const editor = document.getElementById('editor-content')
    if (!editor) return

    const sel = window.getSelection()
    if (!sel.rangeCount) return

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()

    if (layerRef.current) {
      layerRef.current.style.top = `${rect.bottom - editorRect.top}px`
    }
  }, [ghostText, ghostActive])

  if (!ghostActive || !ghostText) return null

  return (
    <div
      ref={layerRef}
      className="absolute left-0 right-0 pointer-events-none text-editor-ghost italic leading-editor text-base"
      style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
    >
      {ghostText}
    </div>
  )
}
