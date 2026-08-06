import React, { useState, useEffect, useRef } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Download, Check, AlertCircle, X, Scan, BookOpen, Users, MessageSquare, PenLine, Sparkles } from 'lucide-react'
import { analyzeTextAPI, TONE_COLORS } from '../data/mockReviews'

const hexToRgba = (hex, alpha = 0.55) => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '')
  if (!m) return `rgba(74,74,74,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

// 将批注按句拆分成分段，避免文本臃肿（最多 3 段）
const splitComment = (text, maxSeg = 3) => {
  const raw = String(text || '').trim()
  if (!raw) return []
  const segments = []
  let buf = ''
  for (const ch of raw) {
    buf += ch
    if (/[。！？；!?;…]/.test(ch) && buf.replace(/\s/g, '').length >= 14) {
      segments.push(buf.trim())
      buf = ''
    }
  }
  if (buf.trim()) segments.push(buf.trim())
  if (segments.length > maxSeg) {
    const kept = segments.slice(0, maxSeg)
    kept[maxSeg - 1] = kept[maxSeg - 1] + '…'
    return kept
  }
  return segments
}

// 将总评长文按句分段（每段约 target 字，最多 maxSeg 段）
const splitText = (text, target = 40, maxSeg = 12) => {
  const raw = String(text || '').trim()
  if (!raw) return []
  const segments = []
  let buf = ''
  for (const ch of raw) {
    buf += ch
    if (/[。！？；!?;…]/.test(ch) && buf.replace(/\s/g, '').length >= target) {
      segments.push(buf.trim())
      buf = ''
    }
  }
  if (buf.trim()) segments.push(buf.trim())
  if (segments.length > maxSeg) {
    const kept = segments.slice(0, maxSeg)
    kept[maxSeg - 1] = kept[maxSeg - 1] + '…'
    return kept
  }
  return segments
}

// ==================== 五星（五边形雷达）评级图：隐藏具体分数，仅保留图形 + 调性比喻 ====================
function RadarChart({ data, size = 120 }) {
  const labels = ['语言', '结构', '意象', '情感', '创新']
  const values = [data.language, data.structure, data.imagery, data.emotion, data.innovation]
  const maxVal = 100
  const center = size / 2
  const radius = size * 0.32
  const angleStep = (Math.PI * 2) / 5

  const points = values.map((v, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (v / maxVal) * radius
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
  }).join(' ')

  const gridPoints = [0.25, 0.5, 0.75, 1].map(scale => {
    return Array.from({ length: 5 }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2
      const r = radius * scale
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
    }).join(' ')
  })

  // 外圈标签只显示维度名，不显示分数
  const labelOffset = radius * 0.34 + 8
  const labelPos = values.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2
    return {
      x: center + (radius + labelOffset) * Math.cos(angle),
      y: center + (radius + labelOffset) * Math.sin(angle),
    }
  })

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {gridPoints.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.7" />
        ))}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x2 = center + radius * Math.cos(angle)
          const y2 = center + radius * Math.sin(angle)
          return <line key={i} x1={center} y1={center} x2={x2} y2={y2} stroke="rgba(0,0,0,0.14)" strokeWidth="0.7" />
        })}
        {/* 外圈边界加粗清晰，轮廓锐利 */}
        <polygon points={gridPoints[3]} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1.6" />
        <polygon points={points} fill="rgba(139,115,85,0.18)" stroke="#8B7355" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => {
          const angle = i * angleStep - Math.PI / 2
          const r = (v / maxVal) * radius
          const x = center + r * Math.cos(angle)
          const y = center + r * Math.sin(angle)
          return <circle key={i} cx={x} cy={y} r="3" fill="#8B7355" stroke="#fff" strokeWidth="1.2" />
        })}
        {labels.map((l, i) => (
          <text
            key={i}
            x={labelPos[i].x}
            y={labelPos[i].y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.088}
            fontWeight={600}
            fill="#6B6B6B"
          >
            {l}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ==================== 调性比喻文案（艺术衬线字体）====================
function ToneMetaphor({ text }) {
  if (!text) return null
  return (
    <div
      className="font-serif-cn italic tracking-wide text-center"
      style={{ color: '#8B7355', fontSize: 19, letterSpacing: '0.08em' }}
    >
      {text}
    </div>
  )
}

// ==================== 总分卡片（只显示五边形评级图 + 调性比喻，不显示数字）====================
function ScoreCard({ score, radar, fill, toneMetaphor }) {
  return (
    <motion.div 
      className={`glass-card p-4 flex flex-col ${fill ? 'h-full' : 'mb-3'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`flex flex-col items-center justify-center gap-2.5 ${fill ? 'flex-1' : ''}`}>
        <RadarChart data={radar} size={fill ? 150 : 120} />
        <ToneMetaphor text={toneMetaphor} />
      </div>
    </motion.div>
  )
}

// ==================== 思考过程（创意雷达扫视 + 均衡推进）====================
function ThinkingProcess({ steps, activeIndex, progress }) {
  const icons = [Scan, BookOpen, Users, MessageSquare, PenLine]

  return (
    <motion.div
      className="glass-card p-5 mb-4 overflow-hidden relative"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 顶部雷达扫视 + 环形进度 */}
      <div className="relative h-24 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-editor-accent/20 animate-ping" style={{ animationDuration: '2.4s' }} />
        <div className="absolute inset-3 rounded-full border border-editor-accent/15 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.5s' }} />
        <div className="absolute inset-6 rounded-full border border-editor-accent/10 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '1s' }} />
        {/* 旋转扫描射线 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
        >
          <div className="absolute top-1/2 left-1/2 w-[47%] h-px origin-left"
            style={{ background: 'linear-gradient(to right, transparent, rgba(74,74,74,0.55), transparent)' }}
          />
        </motion.div>
        {/* 环形进度 */}
        <div className="relative w-16 h-16 bg-white/70 rounded-full shadow-sm">
          <svg viewBox="0 0 64 64" className="w-16 h-16">
            <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="27" fill="none" stroke="#4A4A4A" strokeWidth="4"
              strokeLinecap="round" strokeDasharray="169.6"
              strokeDashoffset={169.6 * (1 - (progress || 0) / 100)}
              transform="rotate(-90 32 32)"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-editor-accent">
            {progress || 0}%
          </div>
        </div>
      </div>

      <div className="text-xs font-medium text-editor-secondary mb-2 flex items-center gap-1.5">
        <Sparkles size={12} className="text-editor-accent" />
        AI 解读进行中
      </div>

      <div className="space-y-1">
        {steps.map((step, i) => {
          const Icon = icons[i] || Scan
          const done = i < activeIndex
          const active = i === activeIndex
          return (
            <motion.div
              key={i}
              className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors duration-300
                ${done ? 'bg-green-50/70' : ''}
                ${active ? 'bg-editor-accent/5' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.3 }}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300
                ${done ? 'bg-green-500 text-white' : ''}
                ${active ? 'bg-editor-accent text-white' : 'bg-black/5 text-editor-secondary/60'}`}
              >
                {done ? <Check size={13} /> : <Icon size={13} className={active ? 'animate-bounce' : ''} />}
              </div>
              <span className={`text-sm ${done ? 'text-editor-secondary/70' : active ? 'text-editor-text' : 'text-editor-secondary/40'}`}>
                {step}
              </span>
              {active && (
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-editor-accent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-editor-accent animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-editor-accent animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ==================== 相似度液体圆球（瓶中水占比，60% 即满）====================
function LiquidBall({ percent, size = 42 }) {
  const p = Math.max(2, Math.min(100, Number(percent) || 0))
  // 显示仍为真实百分比；液面按 60% 即灌满的比例填充，让比例关系更有辨识度
  const fillPct = Math.min(100, (p / 60) * 100)
  const cx = size / 2
  const r = size / 2 - 1.5
  const liquidH = r * 2 * (fillPct / 100)
  const yTop = size / 2 + r - liquidH
  const liquidColor = '#6B7367'
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ width: size + 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <clipPath id={`lb-clip-${p}-${size}`}>
            <circle cx={cx} cy={cx} r={r} />
          </clipPath>
        </defs>
        {/* 瓶体淡色 */}
        <circle cx={cx} cy={cx} r={r} fill="rgba(255,255,255,0.55)" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        {/* 液体（低饱和的深灰绿，按比例从下往上） */}
        <g clipPath={`url(#lb-clip-${p}-${size})`}>
          <rect x={0} y={yTop} width={size} height={liquidH + 1} fill={liquidColor} opacity="0.8" />
          {/* 液面亮光 */}
          <ellipse cx={cx} cy={yTop + 1.5} rx={r - 1} ry={2.5} fill="rgba(255,255,255,0.32)" />
          {/* 液面波纹 */}
          <path
            d={`M ${cx - r} ${yTop + 4} Q ${cx - r / 2} ${yTop - 1} ${cx} ${yTop + 3} T ${cx + r} ${yTop + 3}`}
            fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"
          />
          {/* 液体气泡 */}
          <circle cx={cx - r / 2.4} cy={yTop + liquidH * 0.55} r={1.6} fill="rgba(255,255,255,0.45)" />
          <circle cx={cx + r / 3} cy={yTop + liquidH * 0.3} r={1.1} fill="rgba(255,255,255,0.35)" />
        </g>
        {/* 玻璃高光 */}
        <ellipse cx={cx - r * 0.38} cy={cx - r * 0.4} rx={r * 0.22} ry={r * 0.45} fill="rgba(255,255,255,0.5)" transform={`rotate(-24 ${cx - r * 0.38} ${cx - r * 0.4})`} />
      </svg>
      <div className="text-[10px] font-semibold text-editor-accent leading-none">{p}%</div>
    </div>
  )
}

// ==================== 相似作家卡片（三位，每位两部代表作）====================
function AuthorsCard({ authors, fill }) {
  const list = Array.isArray(authors) && authors.length ? authors : []
  return (
    <motion.div 
      className={`glass-card p-4 flex flex-col ${fill ? 'h-full' : 'mb-3'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {list.map((author, i) => (
        <div 
          key={i}
          className={`flex items-center gap-2.5 ${fill ? 'flex-1 items-center' : ''} ${i < list.length - 1 ? 'border-b border-black/5' : ''}`}
        >
          <LiquidBall percent={author.similarity} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-medium text-editor-text leading-tight">{author.name}</span>
              <span className="text-[11px] text-editor-secondary truncate">{author.work}</span>
            </div>
            <div className="text-[11px] text-editor-secondary/70 mt-0.5 leading-snug">{author.reason}</div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ==================== 批注列表（带锚定功能 + 分段呈现）====================
function AnnotationList({ annotations, onAnchorClick, reading }) {
  return (
    <motion.div 
      className={`p-4 mb-3 rounded-xl border transition-all duration-500
        ${reading ? 'bg-white/30 border-white/20 backdrop-blur-md' : 'bg-white/60 border-white/30 backdrop-blur-xl'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="text-xs font-medium text-editor-secondary mb-2.5">
        原文批注 <span className="text-editor-secondary/50">({annotations.length} 条)</span>
      </div>
      {annotations.map((anno, i) => {
        const segments = splitComment(anno.comment)
        return (
          <motion.div 
            key={anno.id || i} 
            className="py-3 border-b border-black/5 last:border-0 cursor-pointer hover:bg-black/3 rounded-md px-2 -mx-2 transition-colors"
            onClick={() => onAnchorClick && onAnchorClick(i, anno.quote)}
            title="点击跳转到原文位置"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.4 }}
          >
            <div className="text-xs text-editor-secondary italic mb-2 pl-2 border-l-2 border-editor-border leading-relaxed">
              {anno.quote}
            </div>
            <div className="text-sm text-editor-text leading-relaxed">
              {segments.map((seg, j) => (
                <div
                  key={j}
                  className={j > 0 ? 'mt-1.5 pl-2 border-l-2 border-editor-border/60' : ''}
                >
                  {seg}
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ==================== 文本解读卡片（自然段落，无小标题）====================
function SummaryCard({ review, fill }) {
  const hasStructured = review?.textOverview || review?.literaryAnalysis || review?.comparison || review?.conclusion
  const [revealClosing, setRevealClosing] = useState(false)
  const contentRef = useRef(null)

  // 感悟句在滚动完总评后滑出：内容不足一屏时直接显示，否则滚动到底才显示
  useEffect(() => {
    if (!fill) {
      setRevealClosing(true)
      return
    }
    const el = contentRef.current
    if (el && el.scrollHeight <= el.clientHeight + 4) setRevealClosing(true)
  }, [fill])

  const handleScroll = () => {
    const el = contentRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) setRevealClosing(true)
  }

  // 升华句滑入时总评同步向上滚动到底，让升华句始终露在视野里
  useEffect(() => {
    if (!fill || !revealClosing) return
    const el = contentRef.current
    if (!el) return
    const start = performance.now()
    const dur = 600
    let raf
    const tick = (t) => {
      el.scrollTop = el.scrollHeight
      if (t - start < dur) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [revealClosing, fill])

  // 把四段内容连成自然段落，段与段之间用空行过渡，不显示任何小标题
  const flowSegments = [
    review?.textOverview,
    review?.literaryAnalysis,
    review?.comparison,
    review?.conclusion,
  ].filter((s) => String(s || '').trim())

  return (
    <motion.div 
      className={`glass-card p-4 flex flex-col ${fill ? 'h-full' : 'mb-3'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div ref={contentRef} onScroll={handleScroll} className={`text-[13px] text-editor-text leading-relaxed ${fill ? 'flex-1 overflow-y-auto' : ''}`}>
        {hasStructured ? (
          flowSegments.map((seg, j) => (
            <div key={j} className={`whitespace-pre-line ${j > 0 ? 'mt-3' : ''}`}>
              {seg}
            </div>
          ))
        ) : (
          <div className="whitespace-pre-line">{review?.summary}</div>
        )}
      </div>
      {review?.emotionalClosing && (
        <motion.div
          initial={false}
          animate={{ gridTemplateRows: revealClosing ? '1fr' : '0fr', opacity: revealClosing ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut', delay: revealClosing ? 0.1 : 0 }}
          className="flex-shrink-0"
          style={{ display: 'grid' }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="pt-3 border-t border-black/5 text-base italic leading-relaxed" style={{ color: '#8B7355' }}>
              "{review.emotionalClosing}"
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ==================== 9:16 分享卡片（导出图片用）====================
const ShareCard = React.forwardRef(function ShareCard({ review, article, color }, ref) {
  // 总评以自然段落呈现，无小标题
  const flowSegments = [
    review.textOverview,
    review.literaryAnalysis,
    review.comparison,
    review.conclusion,
  ].filter((s) => String(s || '').trim())
  const totalChars = flowSegments.join('').length
  const contentWidth = 378
  const contentArea = 360
  let bodyFont = 13
  while (bodyFont > 8) {
    const perLine = Math.max(1, Math.floor(contentWidth / bodyFont))
    const lines = Math.ceil(totalChars / perLine)
    const px = lines * bodyFont * 1.8 + flowSegments.length * 10
    if (px <= contentArea) break
    bodyFont -= 0.5
  }

  const ink = '#2C2C2C'
  const sub = '#6B6B6B'
  const accent = '#8B7355'

  return (
    <div id="share-card-root" style={{ position: 'fixed', left: -9999, top: 0, zIndex: -9999, pointerEvents: 'none' }}>
      <div
        ref={ref}
        style={{
          width: 450,
          minHeight: 800,
          boxSizing: 'border-box',
          padding: '34px 36px 26px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Noto Serif SC","Source Han Serif",serif',
          background: `linear-gradient(165deg, ${hexToRgba(color, 0.4)}, #FAF9F6 62%)`,
        }}
      >
        {/* 顶部品牌 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: accent, display: 'inline-block' }} />
          <span style={{ fontSize: 12, letterSpacing: 2, color: sub }}>笔搭子 · 文本解读</span>
        </div>

        {/* 标题与作者 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 21, fontWeight: 600, color: ink, lineHeight: 1.4 }}>{article.title || '未命名篇章'}</div>
          <div style={{ fontSize: 12, color: sub, marginTop: 4 }}>作者：{article.author || '佚名'}</div>
        </div>

        {/* 评分：五星（五边形）评级图 + 调性比喻，居中排列避免右侧留白 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.7)' }}>
          <RadarChart data={review.radar} size={110} />
          {review.toneMetaphor && (
            <div style={{ fontSize: 14, fontStyle: 'italic', color: accent, lineHeight: 1.5 }}>
              {review.toneMetaphor}
            </div>
          )}
        </div>

        {/* 相似作家（液体圆球表示占比） */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(review.authors || []).map((a, i) => (
            <div
              key={i}
              style={{ flex: 1, background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <LiquidBall percent={a.similarity} size={34} />
              </div>
              <div style={{ fontSize: 13, color: ink, fontWeight: 600, lineHeight: 1.3 }}>
                {a.name} <span style={{ fontSize: 10, color: sub, fontWeight: 400 }}>{a.work}</span>
              </div>
              <div style={{ fontSize: 10, color: sub, marginTop: 3, lineHeight: 1.5 }}>{a.reason}</div>
            </div>
          ))}
        </div>

        {/* 总评：自然段落，无小标题 */}
        <div style={{ flex: '1 0 auto' }}>
          {flowSegments.map((seg, j) => (
            <div key={j} style={{ fontSize: bodyFont, lineHeight: 1.8, color: ink, whiteSpace: 'pre-line', marginBottom: 8 }}>
              {seg}
            </div>
          ))}
        </div>

        {/* 结语与落款 */}
        {review.emotionalClosing && (
          <div style={{ fontSize: 12, color: accent, fontStyle: 'italic', marginBottom: 14, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            "{review.emotionalClosing}"
          </div>
        )}
        <div style={{ fontSize: 9, color: sub, textAlign: 'center', letterSpacing: 1 }}>由笔搭子 AI 生成 · 仅供创作参考</div>
      </div>
    </div>
  )
})

// ==================== 主面板 ====================
export default function ReviewPanel() {
  const { 
    isReviewing, isThinking, thinkingSteps, activeArticleId, articles,
    toneColor, closeReview, setGhostText, saveReview, setStyleColor, setThinking,
    showBottomBar, setShowBottomBar, setResultsVisible, closeRequestId,
    bottomBarH, setBottomBarH,
  } = useWriterStore()

  const [activeStep, setActiveStep] = useState(0)
  const [thinkingProgress, setThinkingProgress] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [reviewData, setReviewData] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareImage, setShareImage] = useState(null)
  const shareCardRef = useRef(null)
  const sideScrollRef = useRef(null)

  const activeArticle = articles.find(a => a.id === activeArticleId)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isReviewing || !activeArticle?.content?.trim()) return

    setActiveStep(0)
    setThinkingProgress(0)
    setShowResults(false)
    setReviewData(null)
    setIsClosing(false)
    setError(null)
    setResultsVisible(false)
    setShowBottomBar(false)
    setBottomBarH(isMobile ? 62 : 50)

    // 视觉推进与真实 API 调用并行：按 20s 名义时长均衡分配 5 个阶段
    const TOTAL_MS = 20000
    const startedAt = Date.now()
    const progressTimer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / TOTAL_MS)
      setThinkingProgress(Math.round(ratio * 100))
      setActiveStep(Math.min(thinkingSteps.length - 1, Math.floor(ratio * thinkingSteps.length)))
    }, 120)

    analyzeTextAPI(
      activeArticle.content,
      activeArticle.title,
      activeArticle.author
    )
      .then(result => {
        clearInterval(progressTimer)
        setThinking(false, [])
        setStyleColor(result.styleColor || TONE_COLORS[result.tone])
        setReviewData(result)
        saveReview(result)
        setGhostText(result.continuation)
        setShowResults(true)
        setResultsVisible(true)
      })
      .catch(err => {
        clearInterval(progressTimer)
        setThinking(false, [])
        setError(err)
        console.error('AI 分析失败:', err)
      })

    return () => clearInterval(progressTimer)
  }, [isReviewing, activeArticleId])

  const handleAnchorClick = (index, quote) => {
    const editor = document.getElementById('editor-content')
    if (!editor) return

    // 优先跳转到内嵌的原文批注标记
    const mark = editor.querySelector(`mark.anno-mark[data-index="${index}"]`)
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
      mark.classList.add('anno-flash')
      setTimeout(() => mark.classList.remove('anno-flash'), 2600)
      return
    }

    // 兜底：滚动到包含引文的段落
    const paras = editor.querySelectorAll('p')
    for (const p of paras) {
      if (p.textContent.includes(quote)) {
        p.scrollIntoView({ behavior: 'smooth', block: 'center' })

        const originalBg = p.style.backgroundColor
        p.style.backgroundColor = 'rgba(139,115,85,0.2)'
        p.style.transition = 'background-color 0.3s'

        setTimeout(() => {
          p.style.backgroundColor = originalBg
        }, 3000)

        break
      }
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setShowResults(false)
      setResultsVisible(false)
      setShowBottomBar(false)
      setActiveStep(0)
      setThinkingProgress(0)
      setReviewData(null)
      setError(null)
      closeReview()
    }, 400)
  }

  const handleExportImage = async () => {
    if (!reviewData || !activeArticle) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const node = shareCardRef.current
      if (!node) return
      const canvas = await html2canvas(node, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          // html2canvas 1.4.1 无法解析 backdrop-filter，克隆文档中强制禁用
          const style = doc.createElement('style')
          style.textContent = `
            *, *::before, *::after {
              -webkit-backdrop-filter: none !important;
              backdrop-filter: none !important;
            }
            html, body, #root, #root > div {
              overflow: visible !important;
              height: auto !important;
            }
          `
          doc.head.appendChild(style)
          // 确保分享卡在克隆文档中可见可定位，且不被任何父级裁剪
          const root = doc.getElementById('share-card-root')
          if (root) {
            root.style.position = 'absolute'
            root.style.left = '0'
            root.style.top = '0'
            root.style.zIndex = '0'
            root.style.overflow = 'visible'
          }
        },
      })
      setShareImage(canvas.toDataURL('image/png'))
      setShowShare(true)
    } catch (e) {
      console.error('导出图片失败:', e)
      alert(`导出图片失败：${(e && e.message) || e}`)
    }
  }

  // 导出 PDF：将 9:16 审稿卡片渲染为图像后嵌入 PDF（保证中文显示）
  const handleExportPDF = async () => {
    if (!reviewData || !activeArticle) return
    try {
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const { jsPDF } = jsPDFModule
      const html2canvas = html2canvasModule.default
      const node = shareCardRef.current
      if (!node) return
      const canvas = await html2canvas(node, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const style = doc.createElement('style')
          style.textContent = `
            *, *::before, *::after {
              -webkit-backdrop-filter: none !important;
              backdrop-filter: none !important;
            }
            html, body, #root, #root > div {
              overflow: visible !important;
              height: auto !important;
            }
          `
          doc.head.appendChild(style)
          const root = doc.getElementById('share-card-root')
          if (root) {
            root.style.position = 'absolute'
            root.style.left = '0'
            root.style.top = '0'
            root.style.zIndex = '0'
            root.style.overflow = 'visible'
          }
        },
      })
      const img = canvas.toDataURL('image/png')
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      })
      doc.addImage(img, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      doc.save(`${activeArticle.title || '笔搭子'}_文本解读.pdf`)
    } catch (e) {
      console.error('导出 PDF 失败:', e)
      alert(`导出 PDF 失败：${(e && e.message) || e}`)
    }
  }

  // 到达批注底部后再向下滚动 → 滑出下边栏；下边栏出现后向上滚动 → 回到批注
  const touchStartY = useRef(null)
  const handleWheel = (e) => {
    const el = sideScrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    const nearTop = el.scrollTop < 24
    const scrollable = el.scrollHeight > el.clientHeight + 40
    if (!showBottomBar) {
      if (e.deltaY > 0 && (nearBottom || !scrollable)) setShowBottomBar(true)
    } else if (e.deltaY < 0 && nearTop) {
      setShowBottomBar(false)
    }
  }
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches?.[0]?.clientY ?? null
  }
  const handleTouchMove = (e) => {
    const el = sideScrollRef.current
    if (!el || touchStartY.current == null) return
    const dy = touchStartY.current - e.touches[0].clientY
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    const nearTop = el.scrollTop < 24
    const scrollable = el.scrollHeight > el.clientHeight + 40
    if (!showBottomBar) {
      if (dy > 0 && (nearBottom || !scrollable)) setShowBottomBar(true)
    } else if (dy < 0 && nearTop) {
      setShowBottomBar(false)
    }
    touchStartY.current = e.touches[0].clientY
  }

  // 下边栏高度拖动：按住顶部抓手上下拖动，自由调整高度
  const handleDragStart = (e) => {
    e.preventDefault()
    const el = e.currentTarget
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    const move = (ev) => {
      const vh = ((window.innerHeight - ev.clientY) / window.innerHeight) * 100
      setBottomBarH(Math.round(vh))
    }
    const up = () => {
      try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  // 悬浮球在评价完成后请求关闭 → 回到编辑器视角
  useEffect(() => {
    if (closeRequestId > 0 && isReviewing) {
      handleClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeRequestId])

  if (!isReviewing) return null

  // 移动端：编辑器在上，锐评结果以底部抽屉呈现（上下分栏，不打字不看批注时也能回看编辑器）
  if (isMobile) {
    return (
      <>
        <motion.div 
          ref={sideScrollRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-[0_-6px_24px_rgba(0,0,0,0.12)] flex flex-col"
          style={{ height: `${bottomBarH}vh`, background: `linear-gradient(0deg, ${hexToRgba(toneColor, 0.38)}, #FAF9F6 60%)`, borderTop: `1px solid ${hexToRgba(toneColor, 0.5)}` }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 210 }}
        >
          {/* 顶部抓手（可上下拖动调节抽屉高度）+ 关闭 */}
          <div
            className="flex items-center justify-between px-4 pt-1.5 pb-1 border-b border-black/5 flex-shrink-0 relative"
            style={{ touchAction: 'none' }}
            onPointerDown={handleDragStart}
          >
            <div className="w-10 h-1 rounded-full bg-black/15 mx-auto" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8 }} />
            <span className="text-xs text-editor-secondary pl-1">
              {isThinking && !showResults && !error ? 'AI 解读中' : '锐评结果'}
            </span>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 flex-shrink-0"
              onClick={handleClose}
            >
              <X size={15} />
            </button>
          </div>

          {/* 粉刷动画层 - 分析完成后涂刷至代表风格的颜色 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {(showResults || isClosing) && (
              <>
                <div 
                  key={isClosing ? 'm-paint-off' : 'm-paint-on'}
                  className={`absolute right-0 top-0 bottom-0 
                    ${isClosing ? 'animate-paint-right-rev' : 'animate-paint-right'}
                  `}
                  style={{ background: `linear-gradient(to left, ${hexToRgba(toneColor)}, transparent)` }}
                />
                {!isClosing && (
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1/3 animate-shimmer"
                    style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.5), transparent)' }}
                  />
                )}
              </>
            )}
          </div>
          <div className="relative flex-1 min-h-0 overflow-y-auto p-4 pt-2">
            <AnimatePresence mode="wait">
              {isThinking && !showResults && !error ? (
                <ThinkingProcess steps={thinkingSteps} activeIndex={activeStep} progress={thinkingProgress} />
              ) : error ? (
                <div className="glass-card p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <div className="text-sm text-editor-text mb-2">分析失败</div>
                  <div className="text-xs text-editor-secondary">{error?.message || error}</div>
                  {error?.details && (
                    <div className="text-xs text-editor-secondary/60 mt-2 break-all">{error.details}</div>
                  )}
                </div>
              ) : showResults && reviewData ? (
                <>
                  <AnnotationList annotations={reviewData.annotations} onAnchorClick={handleAnchorClick} />
                  <ScoreCard score={reviewData.score} radar={reviewData.radar} toneMetaphor={reviewData.toneMetaphor} />
                  <AuthorsCard authors={reviewData.authors} />
                  <SummaryCard review={reviewData} />
                  <button 
                    className="w-full py-2.5 rounded-lg bg-editor-accent text-white text-sm flex items-center justify-center gap-2"
                    onClick={handleExportPDF}
                  >
                    <Download size={14} /> 导出 PDF
                  </button>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 隐藏的 9:16 分享卡片（导出用） */}
        {reviewData && (
          <ShareCard ref={shareCardRef} review={reviewData} article={activeArticle} color={toneColor} />
        )}

        {/* 分享弹窗 */}
        {showShare && shareImage && (
          <div
            className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowShare(false)}
          >
            <div
              className="bg-white rounded-xl p-4 max-w-[300px] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-medium mb-3 text-center">点评分享图片（9:16）</div>
              <img src={shareImage} alt="点评分享" className="w-full rounded-lg border border-black/10" />
              <div className="text-[10px] text-editor-secondary text-center mt-2">
                手机端长按图片可保存转发
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowShare(false)}
                  className="flex-1 py-2 rounded-lg bg-black/5 text-sm"
                >
                  关闭
                </button>
                <a
                  href={shareImage}
                  download={`${activeArticle?.title || '笔搭子'}_锐评.png`}
                  className="flex-1 py-2 rounded-lg bg-editor-accent text-white text-sm text-center"
                >
                  下载图片
                </a>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // 桌面端：右侧批注栏（浮动卡片）+ 可拖动的下边栏
  return (
    <>
      {/* 右侧批注栏：浮动玻璃卡片。未升起下边栏时占满右列高度，不遮住编辑器全文；下边栏升起时上移腾位，编辑器同时向左上压缩 */}
      <div
        className={`fixed right-4 z-40 flex flex-col rounded-2xl overflow-hidden transition-all duration-500
          ${isReviewing && !isClosing ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          top: 16,
          width: 400,
          maxWidth: '38vw',
          bottom: showResults && showBottomBar ? `calc(${bottomBarH}vh + 12px)` : 16,
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(255,255,255,0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* 粉刷动画层 - 仅在分析完成、呈现结果时从原色涂刷至代表风格的颜色 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {(showResults || isClosing) && (
            <>
              <div 
                key={isClosing ? 'paint-off' : 'paint-on'}
                className={`absolute right-0 top-0 bottom-0 
                  ${isClosing ? 'animate-paint-right-rev' : 'animate-paint-right'}
                `}
                style={{ 
                  background: `linear-gradient(to left, ${hexToRgba(toneColor)}, transparent)`,
                }}
              />
              <div 
                key={isClosing ? 'paint-off-b' : 'paint-on-b'}
                className={`absolute left-0 right-0 bottom-0 
                  ${isClosing ? 'animate-paint-bottom-rev' : 'animate-paint-bottom'}
                `}
                style={{ 
                  background: `linear-gradient(to top, ${hexToRgba(toneColor)}, transparent)`,
                }}
              />
              {!isClosing && (
                <>
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1/3 animate-shimmer"
                    style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.55), transparent)' }}
                  />
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1/3 animate-shimmer"
                    style={{ 
                      background: 'linear-gradient(to left, rgba(255,255,255,0.4), transparent)',
                      animationDelay: '0.45s',
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* 内容区 */}
        <div
          ref={sideScrollRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="relative z-10 flex-1 overflow-y-auto p-5 pt-12"
        >
          <motion.button
            className="absolute top-3 left-3 text-xs text-editor-accent hover:text-editor-text 
                       transition-colors px-2 py-1 rounded-md hover:bg-black/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: showResults || error ? 1 : 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleClose}
          >
            <span className="flex items-center gap-1">
              <ArrowLeft size={12} /> 退回
            </span>
          </motion.button>

          <motion.button
            className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-md 
                       bg-white/70 border border-black/10 hover:bg-white/90 transition-colors
                       flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: showResults ? 1 : 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleExportPDF}
          >
            <Download size={12} /> 导出 PDF
          </motion.button>

          <AnimatePresence mode="wait">
            {isThinking && !showResults && !error ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ThinkingProcess steps={thinkingSteps} activeIndex={activeStep} progress={thinkingProgress} />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 text-center"
              >
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <div className="text-sm text-editor-text mb-2">分析失败</div>
                <div className="text-xs text-editor-secondary">{error?.message || error}</div>
                {error?.details && (
                  <div className="text-xs text-editor-secondary/60 mt-2 break-all">{error.details}</div>
                )}
                <div className="text-xs text-editor-secondary mt-2">请检查网络连接或 API 配置</div>
              </motion.div>
            ) : showResults && reviewData ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AnnotationList
                  annotations={reviewData.annotations}
                  onAnchorClick={handleAnchorClick}
                  reading={!showBottomBar}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* 下边栏：直接呈现有效信息（评级 / 相似作家 / 文本解读），无标题栏；高度可按住顶部抓手上下拖动；色调与文风呼应 */}
      {showResults && !error && reviewData && showBottomBar && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-30 flex flex-col shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
          style={{
            height: `${bottomBarH}vh`,
            background: `linear-gradient(0deg, ${hexToRgba(toneColor, 0.42)}, rgba(250,249,246,0.98) 62%)`,
            borderTop: `1px solid ${hexToRgba(toneColor, 0.55)}`,
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, y: 64 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 与右侧批注栏协调的色调描边：从右往左由深到浅，错落呼应 */}
          <div className="absolute inset-x-0 top-0 h-1 pointer-events-none" style={{ background: `linear-gradient(to left, ${hexToRgba(toneColor, 0.85)}, transparent 70%)` }} />
          {/* 拖动抓手：按住上下拖动自由调整高度 */}
          <div
            className="absolute inset-x-0 top-0 h-6 z-10 flex items-start justify-center cursor-ns-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={handleDragStart}
          >
            <div className="mt-1.5 w-12 h-1 rounded-full bg-black/20" />
          </div>
          {/* 内容三栏：等高分栏，视觉整齐 */}
          <div className="flex flex-1 min-h-0 pt-1">
            <div className="w-[240px] flex-shrink-0 p-4 border-r border-black/5 overflow-y-auto">
              <ScoreCard score={reviewData.score} radar={reviewData.radar} toneMetaphor={reviewData.toneMetaphor} fill />
            </div>
            <div className="w-[280px] flex-shrink-0 p-4 border-r border-black/5 overflow-y-auto">
              <AuthorsCard authors={reviewData.authors} fill />
            </div>
            <div className="flex-1 min-w-0 p-4 overflow-y-auto">
              <SummaryCard review={reviewData} fill />
            </div>
          </div>
        </motion.div>
      )}

      {/* 隐藏的 9:16 分享卡片（导出用） */}
      {reviewData && (
        <ShareCard ref={shareCardRef} review={reviewData} article={activeArticle} color={toneColor} />
      )}

      {/* 分享弹窗 */}
      {showShare && shareImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-white rounded-xl p-4 max-w-[300px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium mb-3 text-center">点评分享图片（9:16）</div>
            <img src={shareImage} alt="点评分享" className="w-full rounded-lg border border-black/10" />
            <div className="text-[10px] text-editor-secondary text-center mt-2">
              手机端长按图片可保存转发
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowShare(false)}
                className="flex-1 py-2 rounded-lg bg-black/5 text-sm"
              >
                关闭
              </button>
              <a
                href={shareImage}
                download={`${activeArticle?.title || '笔搭子'}_锐评.png`}
                className="flex-1 py-2 rounded-lg bg-editor-accent text-white text-sm text-center"
              >
                下载图片
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
