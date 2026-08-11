import { tagUserText, rankCandidates } from '../api/tagging.js'
import { styleRankAuthors } from '../api/styleRank.js'
import { ALL_WRITTEN } from '../api/writers.js'

const FOREIGN_NAMES = new Set([
  '莎士比亚', '狄更斯', '伍尔夫', '奥威尔', '石黑一雄', '乔伊斯', '司汤达', '巴尔扎克',
  '雨果', '福楼拜', '莫泊桑', '普鲁斯特', '加缪', '米兰·昆德拉', '卡夫卡', '黑塞',
  '茨威格', '卡尔维诺', '普希金', '列夫·托尔斯泰', '陀思妥耶夫斯基', '契诃夫',
  '马克·吐温', '海明威', '菲茨杰拉德', '塞林格', '马尔克斯', '博尔赫斯', '聂鲁达',
  '波德莱尔', '惠特曼', '艾略特', '夏目漱石', '芥川龙之介', '川端康成', '三岛由纪夫',
  '太宰治', '村上春树', '泰戈尔', '纪伯伦', '塞万提斯', '爱伦·坡', '霍桑', '梅尔维尔',
  '纳博科夫', '雷蒙德·卡佛', '冯内古特', '托马斯·曼', '斯坦贝克', '毛姆', '杰克·伦敦',
  '赛珍珠', '里尔克', '兰波', '马拉美', '辛波斯卡', '阿赫玛托娃', '帕斯捷尔纳克',
  '奈保尔', '帕慕克', '大江健三郎', '谷崎润一郎', '安部公房', '萨特', '波伏娃', '尼采',
  '叔本华', '克尔凯郭尔', '维特根斯坦', '蒙田', '培根', '柏拉图', '亚里士多德', '康德',
  '罗素', '卢梭', '以赛亚·伯林', '薇依', '果戈理', '屠格涅夫', '哈代', '王尔德', '劳伦斯',
  '奥斯汀', '艾米莉·勃朗特', '左拉', '福克纳',
])
const WRITERS = ALL_WRITTEN

function pickTop(tagTop, vecTop, n) {
  const norm = (list, len) => { const m = new Map(); list.forEach((x, i) => m.set(x.name, (len - i) / len)); return m }
  const tr = norm(tagTop, tagTop.length)
  const vr = norm(vecTop, vecTop.length)
  const names = new Set([...tr.keys(), ...vr.keys()])
  const scored = [...names].map((name) => {
    const t = tr.get(name) || 0
    const v = vr.get(name) || 0
    const both = t > 0 && v > 0
    return { name, score: both ? 0.5 * t + 0.5 * v : (v > 0 ? v : t) * 0.55 }
  }).sort((a, b) => b.score - a.score)
  const pick = scored.slice(0, n).map((s) => WRITERS.find((x) => x.name === s.name)).filter(Boolean)
  const pool = [...pick]
  const hasCn = pool.some((s) => !FOREIGN_NAMES.has(s.name))
  const hasFr = pool.some((s) => FOREIGN_NAMES.has(s.name))
  if (n > 1 && (!hasCn || !hasFr)) {
    const need = !hasCn ? 'cn' : 'fr'
    const alt = scored
      .filter((s) => (need === 'cn' ? !FOREIGN_NAMES.has(s.name) : FOREIGN_NAMES.has(s.name)))
      .map((s) => WRITERS.find((x) => x.name === s.name)).filter(Boolean)
    if (alt.length) pool[pool.length - 1] = alt[0]
  }
  return [...new Set(pool.map((w) => w.name))]
}

function fused(text, poolSize) {
  const userTags = tagUserText(text)
  const tagTop = rankCandidates(userTags, poolSize).candidates
  const vecTop = styleRankAuthors(text, poolSize + 2)
  return pickTop(tagTop, vecTop, 6)
}

const cases = [
  ['鲁迅向', '我坐在长街的石阶上，看人群走过去。他们不看路，也不看我。天色灰白了，没有人抬头。我想起许多年前，也有这样一个黄昏，也有人这样走过。铁屋子是闷的，可外面也没有光。'],
  ['汪曾祺向', '早晨的菜场最热闹。卖豆腐的老王把豆腐切成一块一块，放在水里，白生生的。我买了两块，回家放点葱花，滴两滴香油，就着一碗热粥，吃得浑身舒坦。日子就是这么过的。'],
  ['学者散文向', '人生在世，与其汲汲于功名，不如放下一半的执着，留些闲心给风月。读书不必求全，交友不必求尽，饭要慢些吃，话要缓些说，这方是生活本来的面目。'],
  ['乡土深情向', '村子在大山脚下，溪水从门前流过。黄昏的时候，女人在河边洗衣，男人在田里收工，牛在坡上慢慢地走。远处的炊烟，一缕一缕地升起来，天边的云，也渐渐地红了。'],
  ['城市孤独向', '深夜的地铁，车厢里空荡荡的。我靠着玻璃窗，看着外面的灯火一闪一闪地过去。这座城市很大，大到装得下所有人的孤独，却装不下一句真话。'],
]
for (const pool of [6, 10, 14]) {
  console.log(`\n===== 标签池 ${pool} → 融合选 6 =====`)
  for (const [label, t] of cases) {
    const only = rankCandidates(tagUserText(t), 6).candidates.map((c) => c.name)
    console.log(`[${label}]\n  纯标签: ${only.join('、')}\n  融合  : ${fused(t, pool).join('、')}`)
  }
}
