import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THINKING_STEPS } from '../data/mockReviews'

const TONE_COLORS = {
  melancholy: '#D4E1E6',
  passionate: '#E6D4D4',
  serene: '#D4E6D8',
  mysterious: '#DCD4E6',
  humorous: '#E6E0D4',
  default: '#FAF9F6',
}

const createArticle = (title = '未命名篇章') => ({
  id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  title: title || '未命名篇章',
  author: '佚名',
  content: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  review: null,
})

const initialArticles = [createArticle('未命名篇章 1')]

export const useWriterStore = create(
  persist(
    (set, get) => ({
      articles: initialArticles,
      activeArticleId: initialArticles[0].id,
      isReviewing: false,
      isThinking: false,
      thinkingSteps: [],
      resultsVisible: false,
      closeRequestId: 0,
      ghostText: '',
      ghostActive: false,
      toneColor: TONE_COLORS.default,

      setArticles: (articles) => set({ articles }),

      setActiveArticle: (id) => {
        const { updateActiveArticle } = get()
        updateActiveArticle()
        set({ 
          activeArticleId: id, 
          isReviewing: false, 
          isThinking: false,
          resultsVisible: false,
          ghostText: '',
          ghostActive: false,
          toneColor: TONE_COLORS.default,
        })
      },

      createArticle: () => {
        const { articles, setActiveArticle } = get()
        const newArt = createArticle(`未命名篇章 ${articles.length + 1}`)
        set({ articles: [...articles, newArt] })
        setActiveArticle(newArt.id)
      },

      deleteArticle: (id) => {
        const { articles, activeArticleId, setActiveArticle } = get()
        if (articles.length <= 1) return
        const filtered = articles.filter(a => a.id !== id)
        set({ articles: filtered })
        if (activeArticleId === id) {
          setActiveArticle(filtered[0].id)
        }
      },

      updateActiveArticle: (updates = {}) => {
        const { articles, activeArticleId } = get()
        if (!activeArticleId) return
        set({
          articles: articles.map(a =>
            a.id === activeArticleId
              ? { ...a, ...updates, updatedAt: new Date().toISOString() }
              : a
          ),
        })
      },

      updateMeta: (title, author) => {
        get().updateActiveArticle({ title: title || '未命名篇章', author: author || '佚名' })
      },

      updateContent: (content) => {
        get().updateActiveArticle({ content })
      },

      setReviewing: (isReviewing) => set({ isReviewing }),
      setThinking: (isThinking, thinkingSteps = []) => set({ isThinking, thinkingSteps }),
      setResultsVisible: (visible) => set({ resultsVisible: visible }),
      requestPanelClose: () => set((s) => ({ closeRequestId: s.closeRequestId + 1 })),
      setToneColor: (tone) => set({ toneColor: TONE_COLORS[tone] || TONE_COLORS.default }),
      setStyleColor: (color) => set({
        toneColor: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
          ? color
          : TONE_COLORS.default,
      }),

      setGhostText: (text) => set({ ghostText: text, ghostActive: !!text }),
      clearGhost: () => set({ ghostText: '', ghostActive: false }),
      acceptGhost: () => {
        const { ghostText, activeArticleId, articles } = get()
        if (!ghostText) return
        const art = articles.find(a => a.id === activeArticleId)
        if (art) {
          const newContent = art.content + (art.content ? '\n\n' : '') + ghostText
          get().updateActiveArticle({ content: newContent })
        }
        set({ ghostText: '', ghostActive: false })
      },

      saveReview: (review) => {
        get().updateActiveArticle({ review })
      },

      triggerReview: () => {
        const { isReviewing, articles, activeArticleId, setReviewing, setThinking } = get()
        if (isReviewing) return

        const activeArticle = articles.find(a => a.id === activeArticleId)
        if (!activeArticle?.content?.trim()) {
          alert('请先写点什么，再让 AI 锐评~')
          return
        }

        const editorScroll = document.querySelector('.editor-scroll-area')
        if (editorScroll) {
          editorScroll.scrollTo({ top: 0, behavior: 'smooth' })
        }

        setThinking(true, THINKING_STEPS)
        setReviewing(true)
      },

      closeReview: () => {
        set({ 
          isReviewing: false,
          isThinking: false,
          thinkingSteps: [],
          resultsVisible: false,
          ghostText: '',
          ghostActive: false,
          toneColor: TONE_COLORS.default,
        })
      },
    }),
    {
      name: 'biedazi-writer-store',
      partialize: (state) => ({ 
        articles: state.articles, 
        activeArticleId: state.activeArticleId 
      }),
    }
  )
)
