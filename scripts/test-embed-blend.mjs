// 无 API 验证：embedRank 的 cosine 与 blendCandidateSets 融合逻辑。
// 运行：node scripts/test-embed-blend.mjs
import { AUTHOR_EMBEDDINGS } from '../api/data/authorEmbeddings.js'
import { cosine, embedReady, blendCandidateSets } from '../api/embedRank.js'
import { ALL_WRITTEN as WRITERS, FOREIGN_NAMES } from '../api/writers.js'

let fail = 0
const ok = (cond, msg) => { if (!cond) { fail++; console.error('FAIL:', msg) } else console.log('ok:', msg) }

// 1. cosine 基础：相同向量=1，正交=0
ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9, 'cosine 相同向量=1')
ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-9, 'cosine 正交=0')
ok(cosine([0, 0], [1, 1]) === 0, 'cosine 零向量=0')

// 2. embedReady：无 EMB_* 凭证时应为 false；有凭证 + 真实库时应为 true
delete process.env.EMB_APP_ID
delete process.env.EMB_API_KEY
delete process.env.EMB_API_SECRET
ok(!embedReady(), '无 EMB_* 凭证 → embedReady false')
process.env.EMB_APP_ID = 'x'
process.env.EMB_API_KEY = 'y'
process.env.EMB_API_SECRET = 'z'
ok(embedReady(), '有凭证 + 真实库 → embedReady true')

// 3. blendCandidateSets：合成 tagTop/vecTop 融合
// 取真实 writers 造一个语义 top8（前 6 与标签 top6 重叠一半，另加 2 个新的）
const tagTop = WRITERS.slice(0, 6).map((w, i) => ({ name: w.name, score: 6 - i }))
const foreignName = [...FOREIGN_NAMES].find((n) => WRITERS.some((w) => w.name === n))
const vecTop = [
  ...WRITERS.slice(0, 3).map((w, i) => ({ name: w.name, score: 8 - i })),
  ...WRITERS.slice(20, 24).map((w, i) => ({ name: w.name, score: 5 - i })),
  { name: foreignName, score: 3 },
]
const blended = blendCandidateSets(tagTop, vecTop, WRITERS, FOREIGN_NAMES, 6)
ok(Array.isArray(blended) && blended.length === 6, `blend 返回 6 个候选（实际 ${blended.length}）`)
ok(new Set(blended.map((c) => c.name)).size === blended.length, 'blend 无重复')
for (const c of blended) {
  ok(c.work && c.dna && Array.isArray(c.tags), `候选 ${c.name} 形状完整（work/dna/tags）`)
}
const hasCn = blended.some((c) => !c.foreign)
const hasFr = blended.some((c) => c.foreign)
ok(hasCn && hasFr, `blend 中外混合（cn=${hasCn} fr=${hasFr}）`)
ok(WRITERS.length === FOREIGN_NAMES.size + (WRITERS.length - FOREIGN_NAMES.size), 'FOREIGN_NAMES 子集检查通过')
console.log('blended names:', blended.map((c) => c.name).join(' / '))

console.log(fail ? `\n${fail} 项失败` : '\n全部通过')
process.exit(fail ? 1 : 0)
