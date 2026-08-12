// ==================== 语义向量作者匹配（讯飞开放平台 Embedding）====================
// 运行时：embed 用户正文一次 → 与作者向量余弦 → topK。
// 与标签网络融合见 blendCandidateSets；任一环节失败由调用方回退纯标签。
// 向量库为 2.5MB 大文件：仅在 embedReady() 为 true 时动态 import（惰性加载），
// 未配置 EMB_* 凭证的部署不经解析，节省 serverless 冷启动时间。
import { embedText, embedReady as xfyunEmbedReady } from './xfyunEmbed.js'

let authorEmbeddings = null
let authorEmbeddingsPromise = null

async function loadAuthorEmbeddings() {
  if (authorEmbeddings) return authorEmbeddings
  if (!authorEmbeddingsPromise) {
    authorEmbeddingsPromise = import('./data/authorEmbeddings.js')
      .then((m) => m.AUTHOR_EMBEDDINGS)
      .then((lib) => {
        authorEmbeddings = lib
        return lib
      })
  }
  return authorEmbeddingsPromise
}

export const embedReady = () => xfyunEmbedReady()

const EMBED_TEXT_CAP = 1000 // 运行时 embed 正文截断字数（省 token）

// 全体作者向量的均值（共向分量）。embedding 分数普遍挤在高位，
// 去中心化后余弦区分度大幅提升（实测 spread 0.0077 → 0.2464）。
// 均值 / 去中心化向量 / 模长一次算好缓存：135 位 × 2560 维的重计算移到模块级，
// 每次请求直接复用（E9 优化）。
let precomputed = null
async function getPrecomputed() {
  if (precomputed) return precomputed
  const embeddings = await loadAuthorEmbeddings()
  const dim = embeddings.dim
  const names = Object.keys(embeddings.authors)
  const sum = new Array(dim).fill(0)
  for (const name of names) {
    const v = embeddings.authors[name]
    for (let i = 0; i < dim; i++) sum[i] += v[i]
  }
  const n = Math.max(1, names.length)
  const mean = sum.map((x) => x / n)

  const centered = new Map()
  const norms = new Map()
  for (const name of names) {
    const a = embeddings.authors[name]
    const c = a.map((x, i) => x - mean[i])
    centered.set(name, c)
    let sq = 0
    for (let i = 0; i < c.length; i++) sq += c[i] * c[i]
    norms.set(name, Math.sqrt(sq))
  }
  precomputed = { dim, mean, centered, norms }
  return precomputed
}

// 用户正文 → 向量。用与建库相同的 EMB_DOMAIN（para）保证同空间可比。
export async function embedUserText(text) {
  const input = String(text || '').replace(/\s+/g, '').slice(0, EMBED_TEXT_CAP)
  return embedText(input, { domain: process.env.EMB_DOMAIN || 'para' })
}

// 标准化余弦：输出 = dot(a, b) / (|a|·|b|)。
// 业务侧传第三参 bNorm（= |b|，预先算好）；未传时（脚本/旧调用）现场现算模长，保持两参语义。
export function cosine(a, b, bNorm) {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
  }
  let nb = bNorm
  if (nb === undefined) {
    nb = 0
    for (let i = 0; i < len; i++) nb += b[i] * b[i]
    nb = Math.sqrt(nb)
  }
  const den = Math.sqrt(na) * nb
  return den ? dot / den : 0
}

// 用户正文 → 与作者向量比余弦，返回 topK [{ name, score }]
// 双方先减去全体作者均值（去中心化），避免"共向分量"压扁区分度。
// 作者侧已去中心化并预计算模长，每次请求只需对用户向量算一次去中心化与模板。
export async function embedRankAuthors(text, topK = 8) {
  const vec = await embedUserText(text)
  const { mean, centered, norms } = await getPrecomputed()
  const qc = vec.map((x, i) => x - mean[i])
  const scored = [...centered.entries()].map(([name, ac]) => ({
    name,
    score: cosine(qc, ac, norms.get(name)),
  })).sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// ==================== 与标签网络融合 ====================
// tagTop（标签海选）、vecTop（向量海选）各按排名归一化到 [0,1]：
// 两边都命中 0.5/0.5，仅一边命中给 0.55（弱信号）。120 位全覆盖，中外无偏。
// 候选卡需保持 { name, work, work2, dna, tags } 形状，供 Stage2 使用。
export function blendCandidateSets(tagTop, vecTop, writers, foreignNames, n = 6) {
  const norm = (list, len) => {
    const m = new Map()
    list.forEach((x, i) => m.set(x.name, (len - i) / len))
    return m
  }
  const tr = norm(tagTop, tagTop.length)
  const vr = norm(vecTop, vecTop.length)
  const names = new Set([...tr.keys(), ...vr.keys()])
  const scored = [...names].map((name) => {
    const t = tr.get(name) || 0
    const v = vr.get(name) || 0
    const both = t > 0 && v > 0
    return { name, score: both ? 0.5 * t + 0.5 * v : (v > 0 ? v : t) * 0.55 }
  }).sort((a, b) => b.score - a.score)

  const toCard = (name) => {
    const w = writers.find((x) => x.name === name)
    return w ? { ...w, foreign: foreignNames.has(w.name) } : null
  }
  let pool = scored.slice(0, n).map((s) => toCard(s.name)).filter(Boolean)

  const byScore = (arr) => [...arr].sort((a, b) => {
    const sa = scored.find((s) => s.name === a.name)?.score || 0
    const sb = scored.find((s) => s.name === b.name)?.score || 0
    return sb - sa
  })
  pool = byScore(pool)
  const hasCn = pool.some((s) => !s.foreign)
  const hasFr = pool.some((s) => s.foreign)
  if (n > 1 && (!hasCn || !hasFr)) {
    const need = !hasCn ? 'cn' : 'fr'
    const alt = scored
      .filter((s) => (need === 'cn' ? !foreignNames.has(s.name) : foreignNames.has(s.name)))
      .map((s) => toCard(s.name))
      .filter(Boolean)
    if (alt.length) pool[pool.length - 1] = alt[0]
    pool = byScore(pool)
  }
  return pool.slice(0, n)
}
