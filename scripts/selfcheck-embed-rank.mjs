// 向量库自检：拿作者样本前 70% 做查询，看作者本人能否进 topK。
// 全量跑会触讯飞限流，默认抽 15 位代表性作者。
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'
import { embedRankAuthors } from '../api/embedRank.js'

const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const SAMPLE = ['鲁迅', '汪曾祺', '张爱玲', '萧红', '老舍', '海明威', '川端康成', '加缪', '北岛', '史铁生', '王安忆', '马尔克斯', '卡夫卡', '太宰治', '博尔赫斯']

let hitTop1 = 0, hitTop3 = 0, hitTop5 = 0, hitTop8 = 0
for (const name of SAMPLE) {
  const samples = AUTHOR_SAMPLES[name]
  if (!samples || samples.length < 2) { console.log(`跳过 ${name}（样本不足）`); continue }
  const query = samples.slice(0, -1).join('').slice(0, 800)
  const ranked = await embedRankAuthors(query, 8)
  const pos = ranked.findIndex((r) => r.name === name)
  console.log(`  ${name}: top${pos + 1} ${pos < 0 ? '未进前8' : ''}  (top3: ${ranked.slice(0, 3).map((r) => r.name).join('/')})`)
  if (pos === 0) hitTop1++
  if (pos >= 0 && pos < 3) hitTop3++
  if (pos >= 0 && pos < 5) hitTop5++
  if (pos >= 0 && pos < 8) hitTop8++
  await new Promise((r) => setTimeout(r, 400))
}
const n = SAMPLE.length
console.log(`\n自检结果：top1=${hitTop1}/${n}  top3=${hitTop3}/${n}  top5=${hitTop5}/${n}  top8=${hitTop8}/${n}`)
