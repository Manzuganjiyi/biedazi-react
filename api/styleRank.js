// ==================== 文本统计风格向量 → 作者相似度排序 ====================
// 与 tagging 的 120 位标签网络互补：这里用文本统计（用字/节奏/语体）直接比对，
// 结果供 review.js 与 rankCandidates 融合，避免向量层只覆盖部分作者造成偏袒。
import { STYLE_VECTORS } from './data/styleVectors.js'
import { ALL_WRITTEN } from './writers.js'

const V = STYLE_VECTORS
const LIBRARY = new Set(ALL_WRITTEN.map((w) => w.name))

const PUNCT = '。，、；：？！…“”‘’「」《》——（）'
const FUNC_WORDS = '的了着在是有就也都又还很更把被从对与和或而之其于所因为但却若则'
const WENYAN = '之乎者也矣焉哉兮曰尔吾其乃且惟亦'
const SPOKEN = '吧呢嘛哈哦咧哪啦哎嘿么'
const SIMILE = '像仿佛如同宛如好像似若如'
const LYRIC = '啊呀呵唉哟'
const SENSORY = '光色声香味影夜晨黄昏风雨云月星雪花叶草树山水灯火雾烟路巷窗镜河海鸟虫泪霞霜'
const QUOTE = '“”‘’「」『』'

function clean(t) {
  return String(t || '').replace(/\s+/g, '')
}

function sentenceStats(t) {
  const sents = t.split(/[。！？；!?;…\n]/).map((s) => s.trim()).filter((s) => s.length)
  const lens = sents.map((s) => s.length)
  const n = lens.length
  if (!n) return { mean: 0, sd: 0 }
  const mean = lens.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / n) : 0
  return { mean, sd }
}

function countChars(t, set) {
  let c = 0
  for (const ch of t) if (set.includes(ch)) c++
  return c
}

function redupCount(t) {
  let c = 0
  for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) c++
  return c
}

function scalarFeatures(t) {
  const n = t.length || 1
  const s = sentenceStats(t)
  return [
    countChars(t, PUNCT) / n,
    countChars(t, FUNC_WORDS) / n,
    countChars(t, WENYAN) / n,
    countChars(t, SPOKEN) / n,
    countChars(t, SIMILE) / n,
    countChars(t, LYRIC) / n,
    countChars(t, SENSORY) / n,
    countChars(t, QUOTE) / n,
    redupCount(t) / n,
    s.mean / n,
    s.sd / n,
  ]
}

// 抽取一段文本的风格向量：{ profile: z-score 字符画像, scalars: z-score 标量, chars }
export function embedText(text) {
  const t = clean(text)
  const n = t.length || 1
  const profile = new Array(V.vocab.length).fill(0)
  for (const ch of t) {
    const i = V.vocab.indexOf(ch)
    if (i !== -1) profile[i]++
  }
  for (let i = 0; i < profile.length; i++) profile[i] = (profile[i] / n - V.charMean[i]) / V.charStd[i]
  const raw = scalarFeatures(t)
  const scalars = raw.map((v, i) => (v - V.scalarMean[i]) / V.scalarStd[i])
  return { profile, scalars, chars: t.length }
}

function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const den = Math.sqrt(na) * Math.sqrt(nb)
  return den ? dot / den : 0
}

// 对用户文本做向量排序，返回 [{ name, score, profile, scalar }]，score∈[-1,1]。
// 文本越短，字符画像越不可靠，越偏向稳定的标量特征。
export function styleRankAuthors(text, topK = 6) {
  const e = embedText(text)
  const w = 0.35 + 0.3 * Math.min(1, e.chars / 800)
  const scored = V.authors.map((a) => {
    const profile = cosine(e.profile, a.vec)
    const scalar = cosine(e.scalars, a.scalars)
    return { name: a.name, score: w * profile + (1 - w) * scalar, profile, scalar }
  })
  return scored
    .filter((x) => LIBRARY.has(x.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
