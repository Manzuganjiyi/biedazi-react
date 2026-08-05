const DEFAULT_BASE_URL = 'https://maas-api.cn-huabei-1.xf-yun.com/v2'
const DEFAULT_MODEL = 'xop35qwen2b'

const XFYUN_BASE_URL = process.env.XFYUN_BASE_URL || DEFAULT_BASE_URL
const XFYUN_MODEL = process.env.XFYUN_MODEL || DEFAULT_MODEL
const XFYUN_API_KEY = process.env.XFYUN_API_KEY

export const config = {
  runtime: 'edge',
}

const TONES = ['melancholy', 'passionate', 'serene', 'mysterious', 'humorous']

// ==================== 真实作家库（只能从中选择，绝不编造）====================
const WRITERS = [
  { name: '鲁迅', work: '《呐喊》', work2: '《朝花夕拾》' },
  { name: '老舍', work: '《骆驼祥子》', work2: '《茶馆》' },
  { name: '巴金', work: '《家》', work2: '《随想录》' },
  { name: '茅盾', work: '《子夜》', work2: '《春蚕》' },
  { name: '沈从文', work: '《边城》', work2: '《长河》' },
  { name: '钱钟书', work: '《围城》', work2: '《人·兽·鬼》' },
  { name: '张爱玲', work: '《金锁记》', work2: '《倾城之恋》' },
  { name: '萧红', work: '《呼兰河传》', work2: '《生死场》' },
  { name: '郁达夫', work: '《沉沦》', work2: '《迟桂花》' },
  { name: '汪曾祺', work: '《受戒》', work2: '《人间草木》' },
  { name: '林语堂', work: '《生活的艺术》', work2: '《京华烟云》' },
  { name: '季羡林', work: '《牛棚杂忆》', work2: '《留德十年》' },
  { name: '朱自清', work: '《背影》', work2: '《荷塘月色》' },
  { name: '徐志摩', work: '《志摩的诗》', work2: '《翡冷翠的一夜》' },
  { name: '梁实秋', work: '《雅舍小品》', work2: '《槐园梦忆》' },
  { name: '周作人', work: '《雨天的书》', work2: '《自己的园地》' },
  { name: '丰子恺', work: '《缘缘堂随笔》', work2: '《护生画集》' },
  { name: '冯骥才', work: '《俗世奇人》', work2: '《珍珠鸟》' },
  { name: '王朔', work: '《动物凶猛》', work2: '《顽主》' },
  { name: '路遥', work: '《平凡的世界》', work2: '《人生》' },
  { name: '余华', work: '《活着》', work2: '《许三观卖血记》' },
  { name: '莫言', work: '《红高粱家族》', work2: '《蛙》' },
  { name: '苏童', work: '《妻妾成群》', work2: '《河岸》' },
  { name: '毕飞宇', work: '《推拿》', work2: '《玉米》' },
  { name: '阿来', work: '《尘埃落定》', work2: '《云中记》' },
  { name: '王小波', work: '《黄金时代》', work2: '《沉默的大多数》' },
  { name: '迟子建', work: '《额尔古纳河右岸》', work2: '《世界上所有的夜晚》' },
  { name: '刘震云', work: '《一句顶一万句》', work2: '《一地鸡毛》' },
  { name: '史铁生', work: '《我与地坛》', work2: '《病隙碎笔》' },
  { name: '北岛', work: '《北岛诗选》', work2: '《守夜》' },
  { name: '海子', work: '《海子的诗》', work2: '《土地》' },
  { name: '木心', work: '《文学回忆录》', work2: '《素履之往》' },
  { name: '贾平凹', work: '《秦腔》', work2: '《废都》' },
  { name: '莎士比亚', work: '《哈姆雷特》', work2: '《罗密欧与朱丽叶》' },
  { name: '狄更斯', work: '《双城记》', work2: '《雾都孤儿》' },
  { name: '伍尔夫', work: '《到灯塔去》', work2: '《一间自己的房间》' },
  { name: '奥威尔', work: '《一九八四》', work2: '《动物庄园》' },
  { name: '石黑一雄', work: '《长日将尽》', work2: '《远山淡影》' },
  { name: '乔伊斯', work: '《尤利西斯》', work2: '《都柏林人》' },
  { name: '司汤达', work: '《红与黑》', work2: '《巴马修道院》' },
  { name: '巴尔扎克', work: '《高老头》', work2: '《欧也妮·葛朗台》' },
  { name: '雨果', work: '《悲惨世界》', work2: '《巴黎圣母院》' },
  { name: '福楼拜', work: '《包法利夫人》', work2: '《情感教育》' },
  { name: '莫泊桑', work: '《羊脂球》', work2: '《漂亮朋友》' },
  { name: '普鲁斯特', work: '《追忆似水年华》', work2: '《驳圣伯夫》' },
  { name: '加缪', work: '《局外人》', work2: '《鼠疫》' },
  { name: '米兰·昆德拉', work: '《不能承受的生命之轻》', work2: '《笑忘录》' },
  { name: '卡夫卡', work: '《变形记》', work2: '《城堡》' },
  { name: '黑塞', work: '《荒原狼》', work2: '《悉达多》' },
  { name: '茨威格', work: '《一个陌生女人的来信》', work2: '《昨日的世界》' },
  { name: '卡尔维诺', work: '《看不见的城市》', work2: '《树上的男爵》' },
  { name: '普希金', work: '《叶甫盖尼·奥涅金》', work2: '《上尉的女儿》' },
  { name: '列夫·托尔斯泰', work: '《战争与和平》', work2: '《安娜·卡列尼娜》' },
  { name: '陀思妥耶夫斯基', work: '《罪与罚》', work2: '《卡拉马佐夫兄弟》' },
  { name: '契诃夫', work: '《樱桃园》', work2: '《套中人》' },
  { name: '马克·吐温', work: '《哈克贝利·费恩历险记》', work2: '《汤姆·索亚历险记》' },
  { name: '海明威', work: '《老人与海》', work2: '《永别了，武器》' },
  { name: '菲茨杰拉德', work: '《了不起的盖茨比》', work2: '《夜色温柔》' },
  { name: '塞林格', work: '《麦田里的守望者》', work2: '《九故事》' },
  { name: '马尔克斯', work: '《百年孤独》', work2: '《霍乱时期的爱情》' },
  { name: '博尔赫斯', work: '《小径分岔的花园》', work2: '《阿莱夫》' },
  { name: '聂鲁达', work: '《二十首情诗和一首绝望的歌》', work2: '《漫歌集》' },
  { name: '波德莱尔', work: '《恶之花》', work2: '《巴黎的忧郁》' },
  { name: '惠特曼', work: '《草叶集》', work2: '《民主远景》' },
  { name: '艾略特', work: '《荒原》', work2: '《四个四重奏》' },
  { name: '夏目漱石', work: '《我是猫》', work2: '《心》' },
  { name: '芥川龙之介', work: '《罗生门》', work2: '《竹林中》' },
  { name: '川端康成', work: '《雪国》', work2: '《千只鹤》' },
  { name: '三岛由纪夫', work: '《金阁寺》', work2: '《潮骚》' },
  { name: '太宰治', work: '《人间失格》', work2: '《斜阳》' },
  { name: '村上春树', work: '《挪威的森林》', work2: '《海边的卡夫卡》' },
  { name: '泰戈尔', work: '《吉檀迦利》', work2: '《飞鸟集》' },
  { name: '纪伯伦', work: '《先知》', work2: '《沙与沫》' },
  { name: '塞万提斯', work: '《堂吉诃德》', work2: '《惩恶扬善故事集》' },
]

const WRITER_LINE = WRITERS.map((w) => `${w.name}-${w.work.replace(/《|》/g, '')}/${w.work2.replace(/《|》/g, '')}`).join('、')

// ==================== 基于文本内容的真实评分逻辑 ====================
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

function computeRadar(text) {
  const t = (text || '').trim()
  const chars = t.replace(/\s+/g, '')
  const len = chars.length
  const sentences = t.split(/[。！？；!?;…]/).map((s) => s.trim()).filter(Boolean)
  const paras = t.split(/\n+/).map((p) => p.trim()).filter(Boolean)

  const unique = new Set(chars)
  const diversity = chars.length ? unique.size / chars.length : 0

  const sentLens = sentences.map((s) => s.length)
  const meanLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0
  const sd = sentLens.length > 1
    ? Math.sqrt(sentLens.reduce((a, b) => a + (b - meanLen) ** 2, 0) / sentLens.length)
    : 0
  const rhythm = Math.min(sd / 6, 1)

  const SENSORY = ['光', '色', '声', '香', '味', '影', '夜', '晨', '黄昏', '风', '雨', '云', '月', '星', '雪', '花', '叶', '草', '树', '山', '水', '灯', '火', '雾', '烟', '路', '巷', '窗', '镜', '河', '海', '鸟', '虫', '泪', '霞', '霜']
  let sensory = 0
  for (const w of SENSORY) if (t.includes(w)) sensory++

  const RHETORIC = ['像', '仿佛', '如', '好像', '如同', '似', '若', '似乎']
  let rhetoric = 0
  for (const w of RHETORIC) if (t.includes(w)) rhetoric++

  const EMOTION = ['爱', '恨', '愁', '悲', '喜', '怒', '思', '念', '痛', '静', '孤', '独', '暖', '冷', '泪', '叹', '悔', '迷', '怅', '惘', '忧', '惧', '寂静', '温暖', '苍凉', '温柔', '孤独', '忧伤', '忧郁', '沉默', '怅惘']
  let emotion = 0
  for (const w of EMOTION) if (t.includes(w)) emotion++

  const paraScore = paras.length >= 3 && paras.length <= 10 ? 1 : paras.length >= 2 ? 0.7 : 0.4
  const sentScore = sentences.length >= 3 ? Math.min(sentences.length / 10, 1) : sentences.length / 3

  const language = clamp(56 + diversity * 20 + Math.min(rhetoric / 4, 1) * 12 + rhythm * 10, 50, 92)
  const structure = clamp(52 + paraScore * 16 + sentScore * 12 + rhythm * 8, 50, 92)
  const imagery = clamp(54 + Math.min(sensory / 12, 1) * 22 + diversity * 10, 50, 92)
  const emotionD = clamp(52 + Math.min(emotion / 8, 1) * 20 + (len > 100 ? 6 : 0), 50, 92)
  const innovation = clamp(50 + Math.min(diversity * 2.2, 1) * 24, 45, 90)

  const radar = { language, structure, imagery, emotion: emotionD, innovation }
  const score = clamp(Object.values(radar).reduce((a, b) => a + b, 0) / 5 + 8, 58, 92)
  return { radar, score }
}

// ==================== 工具函数 ====================
const clampCount = (len, cap = 12) => Math.max(1, Math.min(cap, Math.ceil(len / 400)))

// 从正文抽取"完整的句子"（含句末标点），按出现顺序返回；末尾无句末标点的残句不计入
function extractSentences(content) {
  const out = []
  for (const p of String(content || '').split(/\n+/)) {
    const t = p.replace(/\s+/g, '')
    if (!t) continue
    let buf = ''
    for (const ch of t) {
      buf += ch
      if (/[。！？…]/.test(ch)) {
        out.push(buf)
        buf = ''
      }
    }
  }
  return out
}

// 近似"最长公共子串"长度，判断模型引文与真实句子的契合度
function overlapScore(a, b) {
  const maxWin = Math.min(a.length, 60)
  for (let win = maxWin; win >= 4; win--) {
    for (let s = 0; s + win <= a.length; s++) {
      if (b.indexOf(a.substr(s, win)) !== -1) return win
    }
  }
  return 0
}

export function buildPrompt({ content, title, author, annoCount = 5 }) {
  return `你是一位资深文学编辑，拥有二十余年严肃文学编辑经验。请对以下作品进行审稿，并严格按照 JSON 格式返回。

作品：《${title || '未命名'}》
作者：${author || '佚名'}
正文：
${content}

以下都是真实存在的知名作家（作家名-代表作），请【只能】从中选择与本文风格最相似的作家，绝不能编造清单之外的作家或作品：
${WRITER_LINE}

评审总原则（务必遵守）：
- 你的身份是一位严厉而内行的资深文学编辑：客观、锐利、具体，不敷衍、不吹捧、不空泛；好就具体说好在哪，坏就直说坏在哪，给出作者能直接拿去修改、真正有价值的话
- 优先维护作品的文学性，而不是可读性
- 不要为了顺畅而消除作者刻意制造的晦涩、断裂、意识跳跃；不要把奇异的意象改写得通俗好懂
- 只修正真正的硬伤：错别字、的/得/地误用、语法崩坏、逻辑彻底断裂
- 叙事层面刻意的断裂、歧义、含混属于作者的写作选择，不视作错误，也绝不要求改顺

评分标准（务必遵守）：
- 60 分 = 省市级文学刊物可发表的水平；70 分 = 国内重要文学期刊水平；80 分 = 顶尖（《收获》《人民文学》级别）；90 分以上 = 一流作家的名篇；100 分 = 诺贝尔文学奖级别
- 绝大多数投稿在 55-75 之间；只有真正出色、让人眼前一亮的文本才给 80 以上，切勿虚高
- 五个分项（语言/结构/意象/情感/创新）与总分都要基于你对文本的真实判断，且必须与评语口径一致：评语里批评得越重，分数就越低

请严格按以下 JSON 结构返回（只返回合法 JSON，不要 markdown 代码块，不要任何其他文字）：
{
  "textOverview": "①文本概览：这段写什么；叙事视角（必须准确判断人称，正文若用'他/她'即第三人称，用'我'即第一人称，别弄错）；在长篇里承担什么功能；整体气质。直接写内容，约60字",
  "hardIssues": "②硬伤核查：只列出客观错误（错别字、的得地、语法崩坏、逻辑彻底断裂），没有就写【无硬伤】。绝不把审美偏好放这里，约40字",
  "literaryAnalysis": "③文学评析：像资深编辑那样锐利地讲：哪些地方真正立起来了、好在哪；哪些是硬伤、哪些是作者主动的写作选择；哪里冗赘可删、哪里存在表意缺口。约150字以内，务必精炼、言之有物",
  "conclusion": "④结论：一句话判定本段是否可用，并附带需要处理的工作，约40字",
  "styleColor": "代表本段文字风格的专属颜色，必须是合法的六位十六进制色号（如 #B8A9C9）。要求柔和、低饱和、偏淡雅的文学性色调（类似宣纸、暮色、雾霭），不要刺眼的高饱和色",
  "continuation": "约80字的续写，风格与原文一致",
  "emotionalClosing": "一句克制的、有文学余味的祝福或升华语（20-40字），避免鸡汤与空泛，最好用意象或隐喻收束，能提升整篇格调",
  "tone": "melancholy|passionate|serene|mysterious|humorous 之一，按文本整体情感基调判断",
  "scores": { "language": 0-100整数, "structure": 0-100整数, "imagery": 0-100整数, "emotion": 0-100整数, "innovation": 0-100整数, "total": 0-100整数 },
  "authors": [
    { "name": "从上述清单挑选的第1位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第2位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第3位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） }
  ],
  "annotations": [
    { "quote": "原文中真实存在的一个完整句子的高光句，从句子第一个字到句末标点完整摘录", "comment": "50-70字批注，锐利、具体地谈这一句的修辞、意象、节奏得失，不要空泛的褒贬" }
  ]
}

严格要求：
1. textOverview / hardIssues / literaryAnalysis / conclusion 四段缺一不可，直接给正文内容，不要额外加①②③④之外的标题
2. styleColor 必须是合法的六位十六进制色号
3. annotations 数组必须【正好 ${annoCount} 项】，绝对不能多——每项对应原文中约一个 400 字片段里最高光的那一句，每项约 50-70 字，多写会挤占输出预算导致前面字段截断，输出预算有限，请务必只写 ${annoCount} 项
4. 每条 annotations 的 quote 必须从正文中【逐字完整摘录】一个【完整的句子】：从句子第一个字开始，到句号/问号/感叹号/省略号等句末标点为止（含句末标点）。绝不能改写、删减、截取半句、拼接或凭空编造；若原文里实在找不到完整的第 ${annoCount} 句，就挑一句真正存在的最短的完整句子，宁可句子短，不可编造
5. authors 数组必须【正好 3 项】，且每位都严格出自上面的作家清单，work 必须是该作家真实存在的代表作；reason 必须是一句具体的、结合本文特点的相似理由（说明风格/笔法/题材上哪里像），禁止空话套话，禁止从清单外编造；similarity 必须是 0-100 之间的整数，表示该作家风格与本文的相似度百分比，按你的真实判断给出（通常 55-90，第一位应是最高的）
6. tone 只能是 melancholy(清冷忧郁)、passionate(热烈激情)、serene(宁静平和)、mysterious(神秘幽微)、humorous(幽默诙谐) 之一
7. scores 的五个分项与 total 都必须是 0-100 之间的整数，且必须严格对照评分标准与你的评语来给，禁止一律给高分
8. 只输出这一个 JSON 对象，禁止复述作家清单，禁止任何清单之外的解释文字`
}

export function extractJson(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // fall through to brace-matching extraction
  }

  let start = -1
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' && cleaned[i + 1] !== ':') {
      start = i
      break
    }
  }
  if (start === -1) throw new Error('未找到 JSON 对象')

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else {
      if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const jsonStr = cleaned.slice(start, i + 1)
          try {
            return JSON.parse(jsonStr)
          } catch {
            throw new Error('JSON 解析失败')
          }
        }
      }
    }
  }

  // 模型输出被 max_tokens 截断时，尝试修补不完整 JSON
  const salvaged = salvageJson(cleaned, start)
  if (salvaged) return salvaged
  throw new Error('JSON 对象不完整')
}

// 修补被截断的 JSON：补全未闭合的字符串与括号
function salvageJson(cleaned, start) {
  const stack = []
  let inString = false
  let escaped = false
  let depth1Close = -1

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else {
      if (ch === '"') inString = true
      else if (ch === '{' || ch === '[') stack.push(ch)
      else if (ch === '}' || ch === ']') {
        const open = stack.pop()
        if ((open === '{' && ch === '}') || (open === '[' && ch === ']')) {
          if (stack.length === 1) depth1Close = i
        } else return null
      }
    }
  }

  if (!stack.length && !inString) return null

  let out = cleaned.slice(start)
  if (inString) {
    if (escaped) out += '\\'
    out += '"'
  }
  while (stack.length) out += stack.pop() === '{' ? '}' : ']'
  try {
    return JSON.parse(out)
  } catch {
    // 退路：在上一个完整注释对象后截断并闭合数组
    if (depth1Close > -1) {
      const out2 = cleaned.slice(start, depth1Close + 1) + ']}'
      try {
        return JSON.parse(out2)
      } catch {
        return null
      }
    }
    return null
  }
}

function pickRandomWriter(exclude = new Set()) {
  const pool = WRITERS.filter((w) => !exclude.has(w.name))
  if (!pool.length) return WRITERS[0]
  return pool[Math.floor(Math.random() * pool.length)]
}

const FALLBACK_REASONS = [
  '叙事节奏与句法气质相近，读感有共通之处。',
  '同样擅长以意象营造氛围，笔触细腻绵长。',
  '行文克制中见深情，风格气质相仿。',
]

const cleanReason = (r) => {
  const s = String(r || '').trim().replace(/\s+/g, '')
  if (!s) return ''
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}

// 把 AI 给的相似度转为 0-100 的整数，非法则给一个合理默认值
const toSimilarity = (v, fallback) => {
  const n = Number(v)
  if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n)
  return fallback
}

function normalizeAuthors(parsed) {
  const candidates = Array.isArray(parsed?.authors) ? parsed.authors : []
  const result = []
  const used = new Set()

  for (const c of candidates) {
    if (result.length >= 3) break
    const name = typeof c?.name === 'string' ? c.name.trim() : ''
    if (!name) continue
    let writer = WRITERS.find((w) => w.name === name)
    if (writer && !used.has(name)) {
      used.add(name)
      result.push({
        name: writer.name,
        work: writer.work,
        work2: writer.work2,
        reason: cleanReason(c.reason) || FALLBACK_REASONS[result.length % FALLBACK_REASONS.length],
        similarity: toSimilarity(c.similarity, 90 - result.length * 8),
      })
    }
  }

  while (result.length < 3) {
    const w = pickRandomWriter(used)
    used.add(w.name)
    result.push({
      name: w.name,
      work: w.work,
      work2: w.work2,
      reason: FALLBACK_REASONS[result.length % FALLBACK_REASONS.length],
      similarity: 55 + Math.floor(Math.random() * 25),
    })
  }

  // 按相似度从高到低排序，第一位即最相似
  return result.sort((a, b) => b.similarity - a.similarity)
}

export function normalizeReview(parsed, content) {
  const annoCap = clampCount(content.trim().length)

  // 批注：quote 必须是原文中真实存在的完整句子。模型可能改写/编造引文，
  // 因此用"最长公共子串"把每条批注匹配到最近的真实句子；匹配不上就按文本顺序就近分配。
  const sentences = extractSentences(content)
  const rawAnno = (Array.isArray(parsed.annotations) ? parsed.annotations : [])
    .filter((a) => a && String(a.comment || '').trim())
    .slice(0, annoCap)

  const usedIdx = new Set()
  const pickByTextOrder = (preferPos) => {
    const avail = []
    sentences.forEach((s, j) => { if (!usedIdx.has(j)) avail.push(j) })
    if (!avail.length) return -1
    let best = avail[0]
    let bestDist = Infinity
    for (const j of avail) {
      const pos = sentences.length > 1 ? j / (sentences.length - 1) : 0.5
      const dist = Math.abs(pos - preferPos)
      if (dist < bestDist) { bestDist = dist; best = j }
    }
    return best
  }

  const annotations = rawAnno.map((a, i) => {
    const quote = String(a.quote || '').trim().replace(/\s+/g, '')
    const stripped = quote.replace(/[，。！？；：""''（）…、—\-\s]/g, '')
    let si = -1
    let bestScore = 0
    sentences.forEach((s, j) => {
      if (usedIdx.has(j)) return
      let sc = stripped ? overlapScore(stripped, s) : 0
      if (s.length > 60) sc -= (s.length - 60) * 0.4
      if (sc > bestScore) { bestScore = sc; si = j }
    })
    // 契合度太低（模型可能编造了引文）→ 按文本顺序就近分配一个真实句子
    if (si === -1 || bestScore < 6) {
      const preferPos = rawAnno.length > 1 ? i / (rawAnno.length - 1) : 0.5
      si = pickByTextOrder(preferPos)
    }
    if (si === -1) return null
    usedIdx.add(si)
    return {
      id: `anno_${Date.now()}_${i}`,
      quote: sentences[si],
      comment: String(a.comment).trim(),
      startIndex: si,
    }
  }).filter(Boolean)

  const authors = normalizeAuthors(parsed)
  const computed = computeRadar(content)

  // 评分：优先采纳 AI 编辑给出的分数（按 60/80/100 校准），缺失或非法则退回启发式计算
  const toNum = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    return Math.max(0, Math.min(100, Math.round(n)))
  }
  const s = parsed?.scores && typeof parsed.scores === 'object' ? parsed.scores : {}
  const rNum = {
    language: toNum(s.language),
    structure: toNum(s.structure),
    imagery: toNum(s.imagery),
    emotion: toNum(s.emotion),
    innovation: toNum(s.innovation),
    total: toNum(s.total),
  }
  const hasAny = Object.values(rNum).some((v) => v !== null)
  let radar, score
  if (hasAny) {
    const five = [rNum.language, rNum.structure, rNum.imagery, rNum.emotion, rNum.innovation]
    radar = {
      language: rNum.language ?? computed.radar.language,
      structure: rNum.structure ?? computed.radar.structure,
      imagery: rNum.imagery ?? computed.radar.imagery,
      emotion: rNum.emotion ?? computed.radar.emotion,
      innovation: rNum.innovation ?? computed.radar.innovation,
    }
    const fiveVals = five.filter((v) => v !== null)
    const avg = Math.round(fiveVals.reduce((a, b) => a + b, 0) / Math.max(1, fiveVals.length))
    // 总分与分项均分保持口径一致（允许 ±10 的编辑浮动），避免分项低而总分虚高
    const base = rNum.total !== null ? rNum.total : avg
    score = Math.max(avg - 10, Math.min(avg + 10, base))
  } else {
    radar = computed.radar
    score = computed.score
  }

  const styleColor = typeof parsed?.styleColor === 'string'
    && /^#[0-9a-fA-F]{6}$/.test(parsed.styleColor)
    ? parsed.styleColor
    : null

  return {
    author: authors[0],
    authors,
    annotations,
    continuation: parsed?.continuation || '',
    textOverview: parsed?.textOverview || '',
    hardIssues: parsed?.hardIssues || '',
    literaryAnalysis: parsed?.literaryAnalysis || '',
    conclusion: parsed?.conclusion || '',
    emotionalClosing: parsed?.emotionalClosing || '',
    tone: TONES.includes(parsed?.tone) ? parsed.tone : 'melancholy',
    styleColor,
    score,
    radar,
  }
}

async function callXfyun(prompt, temperature) {
  const response = await fetch(`${XFYUN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XFYUN_API_KEY}`,
    },
    body: JSON.stringify({
      model: XFYUN_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 8192,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('XFYUN API Error:', response.status, errText)
    let message = `AI 服务调用失败（${response.status}），请检查 API Key 与模型 ID 配置`
    try {
      const err = JSON.parse(errText)
      if (err?.error?.message) message = `AI 服务返回：${err.error.message}`
    } catch {
      if (errText) message = `AI 服务返回：${errText.slice(0, 300)}`
    }
    const err = new Error(message)
    err.status = response.status
    throw err
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content
  if (!rawContent) {
    const err = new Error('AI 返回为空，请重试')
    err.status = 502
    throw err
  }
  return rawContent
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { content, title, author } = await req.json()

    if (!content || content.trim().length < 20) {
      return new Response(JSON.stringify({ error: '内容太短，请至少写 20 字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!XFYUN_API_KEY) {
      return new Response(
        JSON.stringify({ error: '服务端未配置 XFYUN_API_KEY，请在 Vercel 环境变量中设置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const annoCount = clampCount(content.trim().length)
    const prompt = buildPrompt({ content, title, author, annoCount })

    // 首次调用；若输出无法解析为 JSON，自动用较低温度重试一次
    let rawContent
    let parsed
    try {
      rawContent = await callXfyun(prompt, 0.7)
      parsed = extractJson(rawContent)
    } catch (firstErr) {
      if (firstErr.message.includes('JSON')) {
        rawContent = await callXfyun(prompt, 0.3)
        parsed = extractJson(rawContent)
      } else {
        throw firstErr
      }
    }

    const result = normalizeReview(parsed, content)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Review API Error:', error)
    const friendly = error.message.includes('JSON')
      ? 'AI 输出格式异常，已自动重试仍失败，请再试一次'
      : error.status
        ? error.message
        : 'AI 分析失败，请稍后重试'
    return new Response(
      JSON.stringify({ error: friendly, details: error.message }),
      { status: error.status || 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
