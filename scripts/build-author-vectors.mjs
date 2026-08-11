// ==================== 生成风格向量库（统计特征 → styleVectors.js）====================
// 用法：node scripts/build-author-vectors.mjs
// 为每位作家从短样本抽取两类特征：
//   1) 字符频率画像（语料 top-N 常用字的 z-score 频次）——捕捉用字习惯（虚词/语体/词汇）
//   2) 标量特征（句长均值/方差、标点密度、虚词密度、文言气、口语词、比喻词、感官词、引语、叠词）——捕捉节奏与语体
// 匹配时对用户文本抽取同样特征，做余弦相似度。
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const VOCAB_SIZE = 260
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
  if (!n) return { mean: 0, sd: 0, count: 0 }
  const mean = lens.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / n) : 0
  return { mean, sd, count: n }
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
  const punct = countChars(t, PUNCT) / n
  const func = countChars(t, FUNC_WORDS) / n
  const wenyan = countChars(t, WENYAN) / n
  const spoken = countChars(t, SPOKEN) / n
  const simile = countChars(t, SIMILE) / n
  const lyric = countChars(t, LYRIC) / n
  const sensory = countChars(t, SENSORY) / n
  const quote = countChars(t, QUOTE) / n
  const redup = redupCount(t) / n
  const meanLen = s.mean / n // 句长按字符比例归一（消除文本长度影响）
  const lenVar = s.sd / n
  return [punct, func, wenyan, spoken, simile, lyric, sensory, quote, redup, meanLen, lenVar]
}

// ---- 语料池：每位作家全样本拼接 ----
const corpus = {} // name -> cleaned text
for (const [name, samples] of Object.entries(AUTHOR_SAMPLES)) {
  corpus[name] = clean(samples.join(''))
}

// ---- 共享字表：全语料 top-N 高频字（含虚词，不含标点）----
const globalCount = new Map()
for (const t of Object.values(corpus)) {
  for (const ch of t) {
    if (PUNCT.includes(ch)) continue
    globalCount.set(ch, (globalCount.get(ch) || 0) + 1)
  }
}
const vocab = [...globalCount.entries()]
  .filter(([, c]) => c >= 3)
  .sort((a, b) => b[1] - a[1])
  .slice(0, VOCAB_SIZE)
  .map(([ch]) => ch)
const vocabIndex = new Map(vocab.map((ch, i) => [ch, i]))

// ---- 每位作家：字符频次画像（z-score 需跨作者统计）----
const freqRows = [] // [authorIdx][vocabIdx]
const names = Object.keys(corpus)
for (const name of names) {
  const t = corpus[name]
  const total = t.length || 1
  const row = new Array(vocab.length).fill(0)
  for (const ch of t) {
    const i = vocabIndex.get(ch)
    if (i !== undefined) row[i]++
  }
  for (let i = 0; i < row.length; i++) row[i] /= total
  freqRows.push(row)
}

// 按列（每个字）跨作者求 mean/std，再 z-score
const charMean = []
const charStd = []
const zProfiles = []
for (let j = 0; j < vocab.length; j++) {
  const col = freqRows.map((r) => r[j])
  const m = col.reduce((a, b) => a + b, 0) / col.length
  const sd = Math.sqrt(col.reduce((a, b) => a + (b - m) ** 2, 0) / col.length) || 1
  charMean.push(m)
  charStd.push(sd)
}
for (let i = 0; i < names.length; i++) {
  zProfiles.push(freqRows[i].map((f, j) => ((f - charMean[j]) / charStd[j])))
}

// ---- 标量特征：同样跨作者 z-score ----
const SCALAR_NAMES = ['标点', '虚词', '文言气', '口语词', '比喻词', '抒情词', '感官词', '引语', '叠词', '句长', '句长波动']
const rawScalars = names.map((n) => scalarFeatures(corpus[n]))
const scalarMean = []
const scalarStd = []
for (let j = 0; j < SCALAR_NAMES.length; j++) {
  const col = rawScalars.map((r) => r[j])
  const m = col.reduce((a, b) => a + b, 0) / col.length
  const sd = Math.sqrt(col.reduce((a, b) => a + (b - m) ** 2, 0) / col.length) || 1
  scalarMean.push(m)
  scalarStd.push(sd)
}

// ---- 组装输出 ----
const round3 = (x) => Math.round(x * 1000) / 1000
const authors = names.map((name, i) => ({
  name,
  samples: AUTHOR_SAMPLES[name].length,
  chars: corpus[name].length,
  vec: zProfiles[i].map(round3),
  scalars: rawScalars[i].map((v, j) => round3((v - scalarMean[j]) / scalarStd[j])),
}))

const out = {
  version: 1,
  vocab,
  charMean: charMean.map(round3),
  charStd: charStd.map(round3),
  scalarNames: SCALAR_NAMES,
  scalarMean: scalarMean.map(round3),
  scalarStd: scalarStd.map(round3),
  authors,
}

const outPath = join(__dirname, '..', 'src', 'data', 'styleVectors.js')
const body = `// 自动生成：node scripts/build-author-vectors.mjs
// 120 位候选（及扩展）作者的统计风格向量。勿手改。
export const STYLE_VECTORS = ${JSON.stringify(out)}
`
writeFileSync(outPath, body, 'utf8')
console.log('written', outPath)
console.log('authors:', names.length, '| vocab:', vocab.length, '| total chars:', Object.values(corpus).reduce((a, b) => a + b.length, 0))
