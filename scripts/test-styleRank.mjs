import { styleRankAuthors } from '../api/styleRank.js'
import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'

// 自举：每位作者用「去掉最后一段」后的其余样本作为查询，看作者是否进 top5
let hitTop5 = 0
let hitTop3 = 0
const total = Object.keys(AUTHOR_SAMPLES).length
const worst = []
for (const [name, samples] of Object.entries(AUTHOR_SAMPLES)) {
  if (samples.length < 2) continue
  const query = samples.slice(0, -1).join('')
  const ranked = styleRankAuthors(query, 5)
  const pos = ranked.findIndex((r) => r.name === name)
  if (pos === 0) worst.push([name, ranked[0].name, ranked[1].name])
  if (pos >= 0 && pos < 5) hitTop5++
  if (pos >= 0 && pos < 3) hitTop3++
}
console.log(`self-hit top5: ${hitTop5}/${total}  top3: ${hitTop3}/${total}`)
console.log('best match sample (first 10):')
for (const w of worst.slice(0, 10)) console.log(' ', w.join(' | '))

console.log('\n--- 对照文本 1：刻意模仿鲁迅（短句、冷峻、看客）---')
console.log(styleRankAuthors('我坐在长街的石阶上，看人群走过去。他们不看路，也不看我。天色灰白了，没有人抬头。我想起许多年前，也有这样一个黄昏，也有人这样走过。铁屋子是闷的，可外面也没有光。').slice(0, 6).map((r) => `${r.name} ${(r.score * 100).toFixed(0)}%`).join('  '))

console.log('\n--- 对照文本 2：刻意模仿汪曾祺（白描、吃食、淡）---')
console.log(styleRankAuthors('早晨的菜场最热闹。卖豆腐的老王把豆腐切成一块一块，放在水里，白生生的。我买了两块，回家放点葱花，滴两滴香油，就着一碗热粥，吃得浑身舒坦。日子就是这么过的。').slice(0, 6).map((r) => `${r.name} ${(r.score * 100).toFixed(0)}%`).join('  '))

console.log('\n--- 对照文本 3：哲理议论（学者散文，林语堂/周作人）---')
console.log(styleRankAuthors('人生在世，与其汲汲于功名，不如放下一半的执着，留些闲心给风月。读书不必求全，交友不必求尽，饭要慢些吃，话要缓些说，这方是生活本来的面目。').slice(0, 6).map((r) => `${r.name} ${(r.score * 100).toFixed(0)}%`).join('  '))
