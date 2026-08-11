// 对比：纯标签海选 top6 vs 标签+向量融合 top6（同一文本）
// 运行：node scripts/demo-tag-vs-vector.mjs [可选文本]
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tagUserText, rankCandidates } from '../api/tagging.js'
import { embedRankAuthors, blendCandidateSets, embedReady } from '../api/embedRank.js'
import { ALL_WRITTEN as WRITERS, FOREIGN_NAMES } from '../api/writers.js'

const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const samples = {
  '夜色文学（萧红/川端风）': '夜很深了，窗外的光一盏一盏熄灭。她合上书，纸页的余温还贴着指尖，心里那一点点的叹息，随雨声落到天亮。',
  '市井烟火（汪曾祺风）': '天没亮透，巷口的包子铺已经腾起白汽。大爷支起油锅，油条在滚油里翻了个身，金黄得发亮，隔壁的狗蹲在门槛上等着。',
  '鲁迅式冷峻短句': '老屋里终于静下来。窗外没有风，连树影都懒得动。桌上的灯半明半暗，照着一个人孤零零的影子，投在发白的墙上。',
  '北岛式哲思独白': '我们靠得很近，可各自走各自的路。路被时间磨薄了，尽头没有人，只有一点微光，照见彼此说不出口的沉默。',
}

const argText = process.argv.slice(2).join(' ')
const entries = argText ? { [`自定义文本`]: argText } : samples

for (const [label, text] of Object.entries(entries)) {
  console.log(`\n======================== ${label} ========================`)
  console.log(`文本：${text.slice(0, 60)}...`)

  const tags = tagUserText(text)
  console.log(`\n[本地规则标签] ${tags.length ? tags.join(' / ') : '（无命中）'}`)

  const tagResult = rankCandidates(tags, 6)
  console.log('\n--- 纯标签海选 top6 ---')
  for (const c of tagResult.candidates) console.log(`  ${c.name}${c.foreign ? '（外）' : '（中）'}`)

  if (!embedReady()) {
    console.log('\n（无 EMB 凭证，跳过向量融合）')
    continue
  }

  const vecTop = await embedRankAuthors(text, 8)
  console.log('\n--- 向量海选 top8 ---')
  for (const v of vecTop) console.log(`  ${v.name}  ${v.score.toFixed(4)}`)

  const tagTop = tagResult.candidates.map((c, i) => ({ name: c.name, score: 6 - i }))
  const blended = blendCandidateSets(tagTop, vecTop, WRITERS, FOREIGN_NAMES, 6)
  console.log('\n--- 融合后 top6（本地线上实际使用）---')
  for (const c of blended) console.log(`  ${c.name}${c.foreign ? '（外）' : '（中）'}`)

  const tagNames = tagResult.candidates.map((c) => c.name)
  const blendNames = blended.map((c) => c.name)
  const onlyTag = tagNames.filter((n) => !blendNames.includes(n))
  const onlyBlend = blendNames.filter((n) => !tagNames.includes(n))
  if (onlyTag.length || onlyBlend.length) {
    console.log(`\n差异：纯标签有 [${onlyTag.join(', ')}]，融合换入 [${onlyBlend.join(', ')}]`)
  } else {
    console.log('\n差异：两组结果一致')
  }
}
