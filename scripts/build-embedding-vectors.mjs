// ==================== 生成语义 embedding 作者向量库（讯飞开放平台 Embedding）====================
// 用法（凭证在 .env 或环境变量）：
//   EMB_APP_ID / EMB_API_KEY / EMB_API_SECRET
// 运行：node scripts/build-embedding-vectors.mjs
// 可选 ENV：EMB_DOMAIN（默认 para，与 api/embedRank.js 一致）、AUTHOR_CAP（每位作者字符上限，默认 400）
// 策略（省 token）：每位作者只调 1 次 embedding，样本合并截断到 AUTHOR_CAP 字。
// 输出：src/data/authorEmbeddings.js（author name → 2560 维向量）
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'
import { embedText, embedReady } from '../api/xfyunEmbed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUTHOR_CAP = Number(process.env.AUTHOR_CAP || 400)
const DELAY_MS = Number(process.env.EMBED_DELAY_MS || 150)

// 从 .env 补充环境变量（不覆盖已设置的）
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

if (!embedReady()) {
  console.error('缺少 EMB_APP_ID/EMB_API_KEY/EMB_API_SECRET（可从 .env 或环境变量读）。')
  process.exit(1)
}

const names = Object.keys(AUTHOR_SAMPLES)
const map = {}
let dim = 0
let totalChars = 0

for (let idx = 0; idx < names.length; idx++) {
  const name = names[idx]
  const merged = AUTHOR_SAMPLES[name]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, AUTHOR_CAP)
  totalChars += merged.length
  let vec = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      vec = await embedText(merged)
      break
    } catch (e) {
      console.error(`  ${name} 第 ${attempt + 1} 次失败：${e.message}`)
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  if (!vec) {
    console.error(`  ${name} 连续失败，跳过（该作者将无向量）`)
    continue
  }
  dim = vec.length
  map[name] = vec.map((v) => Math.round(v * 1e4) / 1e4)
  console.log(`[${idx + 1}/${names.length}] ${name}  dim=${dim}  chars=${merged.length}`)
  await new Promise((r) => setTimeout(r, DELAY_MS))
}

const out = { version: 2, domain: 'para', dim, authors: map }
const outPath = join(__dirname, '..', 'api', 'data', 'authorEmbeddings.js')
const body = `// 自动生成：node scripts/build-embedding-vectors.mjs（讯飞开放平台 Embedding，domain=para，dim ${dim}）
// 勿手改。占位空库时运行时自动回退纯标签。
export const AUTHOR_EMBEDDINGS = ${JSON.stringify(out)}
`
writeFileSync(outPath, body, 'utf8')
console.log('\nwritten', outPath)
console.log(`authors=${Object.keys(map).length}/${names.length}  dim=${dim}  embedChars=${totalChars}`)
console.log('预估 token 量（中文约 1 字≈1.2 token）≈', Math.round(totalChars * 1.2))
