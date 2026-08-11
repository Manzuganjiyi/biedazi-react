// 端到端验证（真实调用讯飞 embedding，两次调用约几百 token）
// 运行：node scripts/test-embed-e2e.mjs
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { embedRankAuthors } from '../api/embedRank.js'

const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const texts = {
  '夜色文学': '夜很深了，窗外的光一盏一盏熄灭。她合上书，纸页的余温还贴着指尖，心里那一点点的叹息，随雨声落到天亮。',
  '市井烟火': '天没亮透，巷口的包子铺已经腾起白汽。大爷支起油锅，油条在滚油里翻了个身，金黄得发亮，隔壁的狗蹲在门槛上等。',
}

for (const [label, text] of Object.entries(texts)) {
  const top = await embedRankAuthors(text, 8)
  console.log(`\n【${label}】top8:`)
  for (const t of top) console.log(`  ${t.name}  ${t.score.toFixed(4)}`)
}
