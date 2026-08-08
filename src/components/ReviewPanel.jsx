import React, { useState, useEffect, useRef } from 'react'
import { useWriterStore } from '../store/useWriterStore'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Share2, Check, AlertCircle, X, Scan, BookOpen, Users, MessageSquare, PenLine, Sparkles } from 'lucide-react'
import { analyzeTextAPI, TONE_COLORS } from '../data/mockReviews'
import QRCode from 'qrcode'

const hexToRgba = (hex, alpha = 0.55) => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '')
  if (!m) return `rgba(74,74,74,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

// 统一的强 ease-out 曲线（进入/退出类动画），避免散落的默认缓动
const EASE_OUT = [0.23, 1, 0.32, 1]

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

  // 标签文字必须落在 SVG 边界内，否则 html2canvas 导出时会被裁掉
  const fontSize = size * 0.088
  const halfFont = fontSize / 2
  const maxLabelDist = size / 2 - halfFont - 2
  const labelOffset = Math.max(4, Math.min(radius * 0.34 + 8, maxLabelDist - radius))

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
function ToneMetaphor({ text, size = 19 }) {
  if (!text) return null
  return (
    <div
      className="font-serif-cn italic tracking-wide text-center"
      style={{ color: '#8B7355', fontSize: size, letterSpacing: '0.08em' }}
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
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className={`flex flex-col items-center justify-center gap-2.5 ${fill ? 'flex-1' : ''}`}>
        <RadarChart data={radar} size={fill ? 180 : 120} />
        <ToneMetaphor text={toneMetaphor} size={fill ? 22 : 19} />
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
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      {/* 顶部墨渍：中心湿痕缓慢起伏，三层水墨晕染环向外扩散，替代原来的硬边雷达 */}
      <div className="relative h-24 mb-4 flex items-center justify-center">
        {/* 水墨晕染环：由中心向外扩散并淡去（无硬边，像纸上洇开） */}
        <div className="absolute w-16 h-16 rounded-full ink-bleed" style={{ background: 'radial-gradient(circle, rgba(74,74,74,0.16), transparent 70%)', animation: 'ink-bleed 2.4s cubic-bezier(0.4,0,0.2,1) infinite' }} />
        <div className="absolute w-16 h-16 rounded-full ink-bleed" style={{ background: 'radial-gradient(circle, rgba(74,74,74,0.12), transparent 70%)', animation: 'ink-bleed 2.4s cubic-bezier(0.4,0,0.2,1) 0.8s infinite' }} />
        <div className="absolute w-16 h-16 rounded-full ink-bleed" style={{ background: 'radial-gradient(circle, rgba(74,74,74,0.09), transparent 70%)', animation: 'ink-bleed 2.4s cubic-bezier(0.4,0,0.2,1) 1.6s infinite' }} />
        {/* 中心墨渍：纸上湿痕般缓慢呼吸 */}
        <div
          className="relative w-16 h-16 rounded-full shadow-sm"
          style={{
            background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9), rgba(74,74,74,0.12) 58%, rgba(74,74,74,0.28) 100%)',
            animation: 'ink-breathe 2.6s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-editor-accent font-serif-cn">
            {progress || 0}%
          </div>
        </div>
      </div>

      <div className="relative mb-2">
        <div className="text-xs font-medium text-editor-secondary flex items-center gap-1.5 font-serif-cn">
          <Sparkles size={12} className="text-editor-accent" />
          AI 解读进行中
        </div>
        {/* 落笔墨痕：标签下一条墨线自左向右扫过，与整站毛笔意象呼应 */}
        <div className="absolute -bottom-1 left-0 h-[2px] w-16 overflow-hidden rounded-full">
          <div
            className="absolute top-0 left-0 h-full w-full animate-brush-sweep rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,115,85,0.6), transparent)' }}
          />
        </div>
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
                ${done ? 'bg-editor-accent/6' : ''}
                ${active ? 'bg-editor-accent/8' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.3 }}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 font-serif-cn
                ${done ? 'bg-editor-accent text-white' : ''}
                ${active ? 'bg-editor-accent text-white' : 'bg-black/5 text-editor-secondary/60'}`}
              >
                {done ? <Check size={13} /> : <Icon size={13} className={active ? 'animate-bounce' : ''} />}
              </div>
              <span className={`text-sm font-serif-cn ${done ? 'text-editor-secondary/70' : active ? 'text-editor-text' : 'text-editor-secondary/40'}`}>
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
      {/* 落笔进度：底部一条毛笔般的墨痕从右向左扫过（与整体纸张气质呼应） */}
      <div className="relative h-1.5 mt-3 overflow-hidden rounded-full bg-black/5">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to left, transparent, rgba(74,74,74,0.7) 50%, transparent)',
            width: '36%',
            animation: 'brush-sweep 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
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
      <div className="text-[12px] font-semibold text-editor-accent leading-none">{p}%</div>
    </div>
  )
}

// ==================== 相似作家卡片（三位，每位两部代表作）====================
function AuthorsCard({ authors, fill }) {
  const list = Array.isArray(authors) && authors.length ? authors : []
  return (
    <motion.div 
      className={`glass-card p-4 flex flex-col ${fill ? 'h-full justify-center' : 'mb-3'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      {list.map((author, i) => (
        <div 
          key={i}
          className={`flex items-center gap-3 py-2 ${i < list.length - 1 ? 'border-b border-black/5' : ''}`}
        >
          <LiquidBall percent={author.similarity} size={fill ? 50 : 42} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-medium text-editor-text leading-tight">{author.name}</span>
              <span className="text-[13px] text-editor-secondary truncate">{author.work}</span>
            </div>
            <div className="text-[13px] text-editor-secondary/70 mt-1 leading-snug line-clamp-2">{author.reason}</div>
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
      className={`p-4 mb-3 rounded-xl border transition-[background-color,border-color] duration-500
        ${reading ? 'bg-white/30 border-white/20 backdrop-blur-md' : 'bg-white/60 border-white/30 backdrop-blur-xl'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: EASE_OUT }}
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
            transition={{ delay: i * 0.08, duration: 0.35, ease: EASE_OUT }}
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
      transition={{ duration: 0.4, delay: 0.3, ease: EASE_OUT }}
    >
      <div ref={contentRef} onScroll={handleScroll} className={`text-[15px] text-editor-text leading-relaxed ${fill ? 'flex-1 overflow-y-auto' : ''}`}>
        {hasStructured ? (
          flowSegments.map((seg, j) => (
            <div key={j} className={`whitespace-pre-line ${j > 0 ? 'mt-3' : ''}`}>
              {seg}
            </div>
          ))
        ) : (
          <div className="whitespace-pre-line">{review?.summary || ''}</div>
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
// 右上角二维码：指向官网 www.bidazi.cloud，仅绘制墨色码点于透明底，直接融入卡片底色
const SHARE_URL = 'https://www.bidazi.cloud'

function ShareQrCode({ size = 44 }) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    try {
      const qr = QRCode.create(SHARE_URL, { errorCorrectionLevel: 'M' })
      const n = qr.modules.size
      const quiet = 2 // 静区模块数（透明），保证扫码可靠
      const scale = Math.max(1, Math.ceil((size * 4) / (n + quiet * 2)))
      const canvas = document.createElement('canvas')
      canvas.width = (n + quiet * 2) * scale
      canvas.height = (n + quiet * 2) * scale
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#2C2C2C'
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.modules.get(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale)
        }
      }
      const url = canvas.toDataURL('image/png')
      if (!cancelled) setDataUrl(url)
    } catch {
      // 生成失败时静默占位，不影响分享卡布局
    }
    return () => { cancelled = true }
  }, [size])
  if (!dataUrl) return <div style={{ width: size, height: size }} />
  return <img src={dataUrl} alt="扫码进入笔搭子" style={{ width: size, height: size, display: 'block' }} />
}

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
        {/* 标题与作者：右侧并列官网二维码（上沿略低于标题区，透明底融入卡片） */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 21, fontWeight: 600, color: ink, lineHeight: 1.4 }}>{article.title || '未命名篇章'}</div>
            <div style={{ fontSize: 12, color: sub, marginTop: 4 }}>作者：{article.author || '佚名'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingTop: 14 }}>
            <ShareQrCode />
            <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', height: 44, fontSize: 9, color: sub, letterSpacing: 2, marginLeft: 6, lineHeight: 1 }}>
              {'扫码体验'.split('').map((ch, i) => <span key={i}>{ch}</span>)}
            </span>
          </div>
        </div>

        {/* 评分：雷达图居中并稍微缩小（防止标签文字被裁），右侧呈现文中最出彩的句子与调性比喻 */}
        {(() => {
          const bestQuote = review.bestQuote || review.annotations?.[0]?.quote || ''
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.7)' }}>
              <RadarChart data={review.radar} size={92} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {bestQuote && (
                  <div style={{ fontSize: 10, color: ink, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 8, borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>
                    {bestQuote}
                  </div>
                )}
                {review.toneMetaphor && (
                  <div style={{ fontSize: 12, color: accent, fontStyle: 'italic', letterSpacing: '0.04em', textAlign: 'center', marginLeft: 12 }}>
                    {review.toneMetaphor}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

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

// ==================== 水彩浸润层 ====================
// 结果呈现瞬间，一束水彩从右侧批注栏的右侧甩入编辑区：先是一整幅色带
// 由右向左铺开（clip-path），同时多个色斑从右侧"飞落"（translateX 位移）
// 向左晕开。动画结束后整层沉降为淡淡的持久底色（不消失），让水彩真正
// 沁进纸里，符合"浸润后保持"的观感。
// right（vw）：色斑落点相对右侧视口的距离，分布在编辑区（左 ~60%）而非批注栏。
const SPLASH_BLOTS = [
  { top: '8%',  size: 340, right: 58, delay: 0.03, dur: 1.15, o: 0.38 },
  { top: '28%', size: 470, right: 42, delay: 0.2,  dur: 1.45, o: 0.3 },
  { top: '54%', size: 300, right: 40, delay: 0.38, dur: 1.25, o: 0.34 },
  { top: '74%', size: 430, right: 55, delay: 0.14, dur: 1.5,  o: 0.26 },
]

function WatercolorSplash({ color }) {
  // 水彩纹理：feTurbulence + feDisplacementMap 让色斑边缘呈自然晕染
  const textureId = React.useMemo(() => `wc-${Math.random().toString(36).slice(2, 8)}`, [])
  // 飞溅动画（约 2s）结束后，整层沉降为持久淡色，不再消失
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 2100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[35] overflow-hidden"
      style={{
        opacity: settled ? 0.34 : 1,
        transition: 'opacity 1.4s ease-out',
      }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <filter id={textureId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={3} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="90" />
          </filter>
        </defs>
      </svg>

      {/* 整幅水彩：由右缘由右向左铺开覆盖全屏（含编辑区与批注栏），铺开后留驻 */}
      <div
        className="absolute right-0 top-0 bottom-0 left-0"
        style={{
          filter: `url(#${textureId})`,
          background: `radial-gradient(ellipse at 0% 42%, ${hexToRgba(color, 0.5)}, ${hexToRgba(color, 0.18)} 46%, transparent 78%)`,
          mixBlendMode: 'multiply',
          clipPath: 'inset(0 100% 0 0)',
          animation: 'watercolor-sweep 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
      />

      {/* 错落飞溅的色斑：从右侧之外甩入、向左飞落并晕开，落点散布在编辑区（左），边缘经纹理滤镜呈水彩晕染 */}
      {SPLASH_BLOTS.map((b, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            right: `${b.right}vw`,
            top: b.top,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${hexToRgba(color, b.o)} 0%, ${hexToRgba(color, b.o * 0.4)} 42%, transparent 72%)`,
            mixBlendMode: 'multiply',
            filter: `url(#${textureId})`,
            transform: 'translateX(26vw)',
            animation: `watercolor-blot ${b.dur}s cubic-bezier(0.22, 1, 0.36, 1) ${b.delay}s forwards`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}

// ==================== 主面板 ====================
export default function ReviewPanel() {
  const { 
    isReviewing, isThinking, thinkingSteps, activeArticleId, articles,
    toneColor, closeReview, saveReview, setStyleColor, setThinking,
    showBottomBar, setShowBottomBar, setResultsVisible, closeRequestId,
    bottomBarH, setBottomBarH, showContinuation, setShowContinuation,
    cachedReview, setCachedReview,
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
  const drawerScrollRef = useRef(null)
  const drawerTouchY = useRef(null)
  const drawerUpAccum = useRef(0)
  const drawerUpStart = useRef(0)
  // 结果呈现瞬间播放一次水彩浸润（用自增 key 触发重新挂载）
  const [splashKey, setSplashKey] = useState(0)
  const [splashOn, setSplashOn] = useState(false)
  const reduceMotion = useReducedMotion()

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
    setShowContinuation(false)
    setBottomBarH(isMobile ? 62 : 50)
    prevResults.current = false
    setSplashOn(false)

    // 内容未改动 → 直接复用上次解读，跳过思考与 API
    if (cachedReview) {
      setThinking(false, [])
      setStyleColor(cachedReview.styleColor || TONE_COLORS[cachedReview.tone])
      setReviewData(cachedReview)
      setCachedReview(null)
      setShowResults(true)
      setResultsVisible(true)
      return
    }

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

  // 结果呈现（含缓存复用）瞬间播放一次水彩浸润；已播过或重开解读时重置
  const prevResults = useRef(false)
  useEffect(() => {
    if (showResults && !prevResults.current) {
      setSplashKey(k => k + 1)
      setSplashOn(true)
    }
    if (!showResults) setSplashOn(false)
    prevResults.current = showResults
  }, [showResults])

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

  // 动态分包在重新部署后可能因旧 chunk 失效而加载失败（Failed to fetch dynamically imported module），
  // 强制刷新一次拉取最新入口即可恢复；文章内容已持久化到 localStorage，刷新不丢数据
  const loadHtml2canvas = async () => {
    try {
      const mod = await import('html2canvas')
      return mod.default
    } catch (e) {
      if (!window.__html2canvasReloaded) {
        window.__html2canvasReloaded = true
        window.location.reload()
      }
      throw e
    }
  }

  const handleExportImage = async () => {
    if (!reviewData || !activeArticle) return
    try {
      const html2canvas = await loadHtml2canvas()
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

  // 分享图片：将 9:16 审稿卡片调起系统分享面板（微信/QQ/存相册等）；不支持则降级为下载
  const handleShareImage = async () => {
    if (!reviewData || !activeArticle || !shareImage) return
    try {
      const blob = await (await fetch(shareImage)).blob()
      const fileName = `${activeArticle.title || '笔搭子'}_锐评.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      // 分享文案优先用升华句，其次调性隐喻，最后退回标题
      const shareText = reviewData.emotionalClosing
        || reviewData.toneMetaphor
        || `${activeArticle.title || '我的文章'} · 文本解读`
      const shareData = { title: activeArticle.title || '笔搭子', text: shareText, files: [file] }
      const canShareFiles = typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })
      if (canShareFiles) {
        await navigator.share(shareData)
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ title: shareData.title, text: shareText })
      } else {
        // 不支持系统分享：降级为下载
        const a = document.createElement('a')
        a.href = shareImage
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        alert('当前浏览器不支持系统分享，已改为下载图片')
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return // 用户取消分享，静默处理
      console.error('分享失败:', e)
      alert(`分享失败：${(e && e.message) || e}`)
    }
  }

  // 右侧批注栏滚动到底 → 滑出下边栏（只负责展开；收回由下边栏自身滚到顶触发）
  const touchStartY = useRef(null)
  const handleWheel = (e) => {
    const el = sideScrollRef.current
    if (!el || showBottomBar) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    const scrollable = el.scrollHeight > el.clientHeight + 40
    if (e.deltaY > 0 && (nearBottom || !scrollable)) setShowBottomBar(true)
  }
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches?.[0]?.clientY ?? null
  }
  const handleTouchMove = (e) => {
    const el = sideScrollRef.current
    if (!el || touchStartY.current == null || showBottomBar) return
    const dy = touchStartY.current - e.touches[0].clientY
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    const scrollable = el.scrollHeight > el.clientHeight + 40
    if (dy > 0 && (nearBottom || !scrollable)) setShowBottomBar(true)
    touchStartY.current = e.touches[0].clientY
  }

  // 下边栏自身滚到顶后再向上滚动 → 收回下边栏，回到右侧批注。
  // 为总评区留出向上缓冲空间：总评内容在内部滚动容器里滚动，
  // 只有当"当前光标处真正可滚动的元素"已经滚到顶（向上没有更多内容可看），
  // 且累积向上滚动超过阈值时才收回，避免刚进总评区、内容一滚就被立刻收起
  const barUpAccum = useRef(0)
  const barUpStart = useRef(0)

  // 移动端抽屉：内容滚到顶后再向下滑（dy<0 上滑）→ 收起抽屉，回到编辑器视角（同桌面下边栏收回）
  const handleDrawerWheel = (e) => {
    const el = drawerScrollRef.current
    if (!el) return
    const scroller = findScrollable(e.target)
    const atTop = !scroller || scroller.scrollTop <= 4
    if (atTop && e.deltaY < 0) {
      const now = Date.now()
      if (!drawerUpStart.current || now - drawerUpStart.current > 400) {
        drawerUpStart.current = now
        drawerUpAccum.current = 0
      }
      drawerUpAccum.current += Math.abs(e.deltaY)
      if (drawerUpAccum.current >= 120) {
        drawerUpAccum.current = 0
        drawerUpStart.current = 0
        setShowContinuation(true)
        setShowBottomBar(false)
      }
    } else {
      drawerUpAccum.current = 0
      drawerUpStart.current = 0
    }
  }
  const handleDrawerTouchStart = (e) => {
    drawerTouchY.current = e.touches?.[0]?.clientY ?? null
  }
  const handleDrawerTouchMove = (e) => {
    if (drawerTouchY.current == null) return
    const dy = drawerTouchY.current - e.touches[0].clientY
    drawerTouchY.current = e.touches[0].clientY
    const scroller = findScrollable(e.target)
    const atTop = !scroller || scroller.scrollTop <= 4
    if (atTop && dy < 0) {
      const now = Date.now()
      if (!drawerUpStart.current || now - drawerUpStart.current > 400) {
        drawerUpStart.current = now
        drawerUpAccum.current = 0
      }
      drawerUpAccum.current += Math.abs(dy)
      if (drawerUpAccum.current >= 120) {
        drawerUpAccum.current = 0
        drawerUpStart.current = 0
        setShowContinuation(true)
        setShowBottomBar(false)
      }
    } else {
      drawerUpAccum.current = 0
      drawerUpStart.current = 0
    }
  }

  // 从事件目标向上找到真正发生滚动的元素（总评/作者/评级各自的内层滚动容器）
  const findScrollable = (node) => {
    let el = node
    while (el && el !== document.body) {
      if (el.scrollHeight - el.clientHeight > 1) return el
      el = el.parentElement
    }
    return null
  }

  const handleBarWheel = (e) => {
    if (!showBottomBar) return
    const scroller = findScrollable(e.target)
    const atTop = !scroller || scroller.scrollTop <= 4
    if (atTop && e.deltaY < 0) {
      const now = Date.now()
      // 天然缓冲：同一段连续向上滚动需在时间窗内累积足够距离才收回，杜绝顺手一滚就消失
      if (!barUpStart.current || now - barUpStart.current > 400) {
        barUpStart.current = now
        barUpAccum.current = 0
      }
      barUpAccum.current += Math.abs(e.deltaY)
      if (barUpAccum.current >= 120) {
        barUpAccum.current = 0
        barUpStart.current = 0
        setShowBottomBar(false)
      }
    } else {
      // 下面还有内容可往上滚，或正在往下滚：先让内容自己滚动，不参与收回
      barUpAccum.current = 0
      barUpStart.current = 0
    }
  }
  const barTouchY = useRef(null)
  const handleBarTouchStart = (e) => {
    barTouchY.current = e.touches?.[0]?.clientY ?? null
  }
  const handleBarTouchMove = (e) => {
    if (barTouchY.current == null || !showBottomBar) return
    const dy = barTouchY.current - e.touches[0].clientY
    barTouchY.current = e.touches[0].clientY
    const scroller = findScrollable(e.target)
    const atTop = !scroller || scroller.scrollTop <= 4
    if (atTop && dy < 0) {
      const now = Date.now()
      if (!barUpStart.current || now - barUpStart.current > 400) {
        barUpStart.current = now
        barUpAccum.current = 0
      }
      barUpAccum.current += Math.abs(dy)
      if (barUpAccum.current >= 120) {
        barUpAccum.current = 0
        barUpStart.current = 0
        setShowBottomBar(false)
      }
    } else {
      barUpAccum.current = 0
      barUpStart.current = 0
    }
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
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-[0_-6px_24px_rgba(0,0,0,0.12)] flex flex-col"
          style={{ height: `${bottomBarH}vh`, background: `linear-gradient(0deg, ${hexToRgba(toneColor, 0.38)}, #FAF9F6 60%)`, borderTop: `1px solid ${hexToRgba(toneColor, 0.5)}` }}
          initial={{ y: '100%' }}
          animate={{ y: showContinuation ? '100%' : 0 }}
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
              {isThinking && !showResults && !error ? 'AI 解读中' : '解读报告'}
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
                  style={{ background: `linear-gradient(to left, ${hexToRgba(toneColor)}, ${hexToRgba(toneColor, 0.35)} 55%, transparent)` }}
                />
                {!isClosing && (
                  <>
                    <div 
                      className="absolute inset-0 animate-paint-soft"
                      style={{ background: `radial-gradient(circle at 85% 30%, ${hexToRgba(toneColor, 0.22)}, transparent 62%)` }}
                    />
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1/3 animate-shimmer"
                      style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.5), transparent)' }}
                    />
                  </>
                )}
              </>
            )}
          </div>
          <div
            ref={drawerScrollRef}
            onWheel={handleDrawerWheel}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            className="relative flex-1 min-h-0 overflow-y-auto p-4 pt-2"
          >
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
                    onClick={handleExportImage}
                  >
                    <Share2 size={14} /> 分享解读
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
                点「分享」发送给好友，或长按图片保存
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowShare(false)}
                  className="flex-1 py-2 rounded-lg bg-black/5 text-sm"
                >
                  关闭
                </button>
                <button
                  onClick={handleShareImage}
                  className="flex-1 py-2 rounded-lg bg-editor-accent text-white text-sm"
                >
                  分享
                </button>
                <a
                  href={shareImage}
                  download={`${activeArticle?.title || '笔搭子'}_锐评.png`}
                  className="flex-1 py-2 rounded-lg bg-black/5 text-sm text-center"
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
      {/* 水彩浸润：结果呈现时从侧边飞溅浸润编辑区（只在桌面端，一次） */}
      {splashOn && !isMobile && !reduceMotion && (
        <WatercolorSplash key={splashKey} color={toneColor} />
      )}
      {/* 右侧批注栏：浮动玻璃卡片。未升起下边栏时占满右列高度，不遮住编辑器全文；下边栏升起时上移腾位，编辑器同时向左上压缩；切到续写模式后滑出 */}
      <div
        className={`fixed right-4 z-40 flex flex-col rounded-2xl overflow-hidden transition-[transform,bottom] duration-500
          ${isReviewing && !isClosing && !showContinuation ? 'translate-x-0' : 'translate-x-full'}
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
                  background: `linear-gradient(to left, ${hexToRgba(toneColor)}, ${hexToRgba(toneColor, 0.35)} 55%, transparent)`,
                }}
              />
              <div 
                key={isClosing ? 'paint-off-b' : 'paint-on-b'}
                className={`absolute left-0 right-0 bottom-0 
                  ${isClosing ? 'animate-paint-bottom-rev' : 'animate-paint-bottom'}
                `}
                style={{ 
                  background: `linear-gradient(to top, ${hexToRgba(toneColor, 0.5)}, transparent)`,
                }}
              />
              {/* 第二层：调性互补的淡色晕染，让粉刷更有层次 */}
              {!isClosing && (
                <div 
                  className="absolute inset-0 animate-paint-soft"
                  style={{ background: `radial-gradient(circle at 85% 30%, ${hexToRgba(toneColor, 0.22)}, transparent 62%)` }}
                />
              )}
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
            onClick={handleExportImage}
          >
            <Share2 size={12} /> 分享解读
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
      <AnimatePresence>
        {showResults && !error && reviewData && showBottomBar && !showContinuation && (
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
            exit={{ opacity: 0, y: 64 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
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
          {/* 内容三栏：等高分栏，视觉整齐；各自滚到顶再上滑时收回下边栏 */}
          {/* 顶部 pt-6 避开拖动手柄（h-6） */}
          <div className="flex flex-1 min-h-0 pt-6">
            <div
              className="w-[260px] flex-shrink-0 p-4 border-r border-black/5 overflow-y-auto"
              onWheel={handleBarWheel}
              onTouchStart={handleBarTouchStart}
              onTouchMove={handleBarTouchMove}
            >
              <ScoreCard score={reviewData.score} radar={reviewData.radar} toneMetaphor={reviewData.toneMetaphor} fill />
            </div>
            <div
              className="w-[300px] flex-shrink-0 p-4 border-r border-black/5 overflow-y-auto"
              onWheel={handleBarWheel}
              onTouchStart={handleBarTouchStart}
              onTouchMove={handleBarTouchMove}
            >
              <AuthorsCard authors={reviewData.authors} fill />
            </div>
            <div
              className="flex-1 min-w-0 p-4 overflow-y-auto"
              onWheel={handleBarWheel}
              onTouchStart={handleBarTouchStart}
              onTouchMove={handleBarTouchMove}
            >
              <SummaryCard review={reviewData} fill />
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

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
              点「分享」发送给好友，或长按图片保存
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowShare(false)}
                className="flex-1 py-2 rounded-lg bg-black/5 text-sm"
              >
                关闭
              </button>
              <button
                onClick={handleShareImage}
                className="flex-1 py-2 rounded-lg bg-editor-accent text-white text-sm"
              >
                分享
              </button>
              <a
                href={shareImage}
                download={`${activeArticle?.title || '笔搭子'}_锐评.png`}
                className="flex-1 py-2 rounded-lg bg-black/5 text-sm text-center"
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
