import { STYLE_VECTORS } from '../api/data/styleVectors.js'

const V = STYLE_VECTORS
const PUNCT = '。，、；：？！…“”‘’「」《》——（）'
const FUNC = '的了着在是有就也都又还很更把被从对与和或而之其于所因为但却若则'
const WEN = '之乎者也矣焉哉兮曰尔吾其乃且惟亦'
const SPOKEN = '吧呢嘛哈哦咧哪啦哎嘿么'
const SIM = '像仿佛如同宛如好像似若如'
const LYR = '啊呀呵唉哟'
const SEN = '光色声香味影夜晨黄昏风雨云月星雪花叶草树山水灯火雾烟路巷窗镜河海鸟虫泪霞霜'
const QUOTE = '“”‘’「」『』'

function clean(t) { return String(t || '').replace(/\s+/g, '') }
function sentStats(t) {
  const l = t.split(/[。！？；!?;…\n]/).map((s) => s.trim()).filter((s) => s.length).map((s) => s.length)
  const n = l.length || 1
  const m = l.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / n) : 0
  return { m, sd }
}
function count(t, set) { let c = 0; for (const ch of t) if (set.includes(ch)) c++; return c }
function redup(t) { let c = 0; for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) c++; return c }
function scalars(t) {
  const n = t.length || 1
  const s = sentStats(t)
  return [count(t, PUNCT) / n, count(t, FUNC) / n, count(t, WEN) / n, count(t, SPOKEN) / n,
    count(t, SIM) / n, count(t, LYR) / n, count(t, SEN) / n, count(t, QUOTE) / n,
    redup(t) / n, s.m / n, s.sd / n]
}
function embed(t, w) {
  const x = clean(t)
  const n = x.length || 1
  const prof = new Array(V.vocab.length).fill(0)
  for (const ch of x) { const i = V.vocab.indexOf(ch); if (i !== -1) prof[i]++ }
  const profZ = prof.map((c, i) => (c / n - V.charMean[i]) / V.charStd[i])
  const raw = scalars(x)
  const scZ = raw.map((v, i) => (v - V.scalarMean[i]) / V.scalarStd[i])
  return { prof: profZ, sc: scZ, chars: x.length, w }
}
function cos(a, b) {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  const den = Math.sqrt(na) * Math.sqrt(nb)
  return den ? d / den : 0
}
function rank(t, w) {
  const e = embed(t, w)
  const scored = V.authors.map((a) => {
    const p = cos(e.prof, a.vec)
    const s = cos(e.sc, a.scalars)
    return { name: a.name, score: e.w * p + (1 - e.w) * s }
  }).sort((a, b) => b.score - a.score)
  return scored.slice(0, 6).map((r) => `${r.name} ${(r.score * 100).toFixed(0)}`)
}

const wang = '早晨的菜场最热闹。卖豆腐的老王把豆腐切成一块一块，放在水里，白生生的。我买了两块，回家放点葱花，滴两滴香油，就着一碗热粥，吃得浑身舒坦。日子就是这么过的。菜场东头有个卖馄饨的摊子，皮薄馅大，汤里漂着几粒虾皮，撒一把香菜，冬天喝一碗，从头暖到脚。我常想，人这一辈子，图的不就是这点热乎气儿么。黄昏的时候，我又路过菜场，收摊的老王正在收拾家什，见我来了，笑着说：明儿还有新磨的豆腐。'
const lu = '我坐在长街的石阶上，看人群走过去。他们不看路，也不看我。天色灰白了，没有人抬头。我想起许多年前，也有这样一个黄昏，也有人这样走过。铁屋子是闷的，可外面也没有光。后来我在书里读到，说我们这样的看客，看得久了，心也就冷了。我不信。可是风一吹，我发现自己果然站了很久，久到连影子都斜了。远处有人在喊，喊什么我听不清，只觉得那声音在空荡荡的街面上，撞来撞去，最后跌在墙角里，碎了。'

for (const w of [0.4, 0.6, 0.75, 0.85]) {
  console.log(`\n===== profile weight = ${w} =====`)
  console.log('汪曾祺向:', rank(wang, w).join('  '))
  console.log('鲁迅向  :', rank(lu, w).join('  '))
}
