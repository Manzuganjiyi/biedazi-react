import React from 'react'
import { useWriterStore } from '../store/useWriterStore'
import { useShallow } from 'zustand/react/shallow'
import { Plus, X } from 'lucide-react'

export default function ArticleTabs() {
  const { articles, activeArticleId, setActiveArticle, createArticle, deleteArticle } = useWriterStore(
    useShallow((s) => ({
      articles: s.articles,
      activeArticleId: s.activeArticleId,
      setActiveArticle: s.setActiveArticle,
      createArticle: s.createArticle,
      deleteArticle: s.deleteArticle,
    }))
  )

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-editor-border/60 bg-transparent overflow-x-auto flex-shrink-0">
      {articles.map(art => (
        <button
          key={art.id}
          onClick={() => setActiveArticle(art.id)}
          className={`
            group relative px-3.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors duration-200
            ${art.id === activeArticleId 
              ? 'bg-black/5 text-editor-text font-medium' 
              : 'text-editor-secondary hover:bg-black/5'
            }
          `}
        >
          <span>{art.title}</span>
          {articles.length > 1 && (
            <span
              onClick={(e) => { e.stopPropagation(); deleteArticle(art.id); }}
              className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full 
                         bg-white shadow-sm text-[10px] text-red-500 opacity-0 group-hover:opacity-100 
                         transition-opacity cursor-pointer hover:bg-red-50"
            >
              <X size={10} />
            </span>
          )}
        </button>
      ))}
      <button
        onClick={createArticle}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-dashed 
                   border-editor-border text-editor-secondary hover:bg-black/5 transition-colors flex-shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
