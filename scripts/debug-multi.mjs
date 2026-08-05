import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'))
  return m ? m[1].trim() : undefined
}
const BASE = get('XFYUN_BASE_URL') || 'https://maas-api.cn-huabei-1.xf-yun.com/v2'
const MODEL = get('XFYUN_MODEL') || 'xop35qwen2b'
const KEY = get('XFYUN_API_KEY')

const { buildPrompt, extractJson } = await import('../api/review.js')

const SAMPLES = [
  {
    title: '黄昏',
    content: '黄昏的光落在老梧桐树上，叶子一片片变黄。我坐在巷口的石阶上，数着来来往往的人影。风把回忆吹散又聚拢，像极了我这些年走过的路。此刻的寂静里，藏着许多说不出口的话。',
  },
  {
    title: '雨夜',
    content: '雨下了一整夜，窗外的路灯在水汽里晕成一片光。我翻着旧照片，那些模糊的面孔像隔着毛玻璃的灯，看得见轮廓，却想不起名字。清晨雨停了，屋檐还在滴水，一下一下，敲着空荡荡的院子。',
  },
  {
    title: '巷口早餐摊',
    content: '天还没亮，巷口的豆浆摊就冒起了白烟。老板从铁桶里舀豆浆，手稳得像机器。蒸笼掀开的一瞬，热气扑了满脸。他老婆在旁边数零钱，嘴里念叨着今天的菜价。上班的人来去匆匆，谁也顾不上看他们一眼。这人间烟火，偏偏最动人。',
  },
  {
    title: '故乡的河',
    content: '我是在那条河边长大的。河水不深，夏天能没过膝盖，我们光着脚踩进去，惊起一片白色的水花。河底的石子圆润温凉，踩上去像踩着一枚枚被岁月磨平的印章。如今河道被水泥砌平了，两岸种上了景观树，河水也浅得只剩一线。我站在这条再也认不出的河边，忽然明白，原来故乡不是地方，是那个可以随时回去、却再也回不去的从前。风从河面吹过来，带着陌生的水草味，我站了很久很久，直到夕阳把影子拉得老长，才慢慢转身离开。',
  },
]

async function callXfyun(prompt, temperature) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature, max_tokens: 5000 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`)
  return data.choices?.[0]?.message?.content
}

let total = 0
let fail = 0
for (let round = 1; round <= 12; round++) {
  const s = SAMPLES[(round - 1) % SAMPLES.length]
  const prompt = buildPrompt({ content: s.content, title: s.title, author: '佚名' })
  try {
    let raw = await callXfyun(prompt, 0.7)
    fs.writeFileSync(path.join(__dirname, 'last_fail_raw.txt'), raw, 'utf8')
    let parsed
    try {
      parsed = extractJson(raw)
    } catch {
      raw = await callXfyun(prompt, 0.3)
      fs.writeFileSync(path.join(__dirname, 'last_fail_raw.txt'), raw, 'utf8')
      parsed = extractJson(raw)
    }
    total++
    const authors = parsed.authors.map((a) => a.name).join(',')
    console.log(`RUN${round} OK  authors=[${authors}] annos=${parsed.annotations?.length}`)
  } catch (e) {
    fail++
    console.log(`RUN${round} FAIL ${e.message}`)
    const raw = fs.readFileSync(path.join(__dirname, 'last_fail_raw.txt'), 'utf8')
    fs.writeFileSync(path.join(__dirname, 'persist_fail.txt'), raw, 'utf8')
    console.log('  RAW_TAIL:', JSON.stringify(raw.slice(-700)))
  }
}
console.log(`\n==== 总计 ${total + fail} 次：成功 ${total}，失败 ${fail} ====`)
