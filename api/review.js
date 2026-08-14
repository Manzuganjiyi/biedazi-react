import { CORE_WRITERS as CORE_WRITERS_DATA, ALL_WRITTEN, STYLE_DIMENSIONS, tagsToHierarchical } from './writers.js'
import { rankCandidates, tagUserText } from './tagging.js'
import { embedRankAuthors, blendCandidateSets, embedReady } from './embedRank.js'

const DEFAULT_BASE_URL = 'https://maas-api.cn-huabei-1.xf-yun.com/v2'
const DEFAULT_MODEL = 'xop35qwen2b'

// 智谱（bigmodel.cn）优先：配置 ZHIPU_API_KEY 即用智谱，否则回退讯飞星辰
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'glm-4.6v-flash'
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY

const XFYUN_BASE_URL = process.env.XFYUN_BASE_URL || DEFAULT_BASE_URL
const XFYUN_MODEL = process.env.XFYUN_MODEL || DEFAULT_MODEL
const XFYUN_API_KEY = process.env.XFYUN_API_KEY

const PROVIDER = ZHIPU_API_KEY ? 'zhipu' : 'xfyun'
const ACTIVE_API_KEY = PROVIDER === 'zhipu' ? ZHIPU_API_KEY : XFYUN_API_KEY
const ACTIVE_MODEL = PROVIDER === 'zhipu' ? ZHIPU_MODEL : XFYUN_MODEL
const ACTIVE_URL = PROVIDER === 'zhipu'
  ? `${ZHIPU_BASE_URL}/chat/completions`
  : `${XFYUN_BASE_URL}/chat/completions`

// 智谱推理模型默认会先输出大段 reasoning_content（思维链），显著拖慢响应。
// 对文评场景收益有限：关闭思考（thinking.type=disabled）后 Stage1+Stage2 整条管线约 1/3 耗时。
// 默认关闭；如需开启思考，设 ZHIPU_THINKING=enabled（注意：开启后单阶段可能 40-90s，超出 Vercel 预算）。
const ZHIPU_THINKING = process.env.ZHIPU_THINKING === 'enabled' ? { type: 'enabled' } : { type: 'disabled' }

// ==================== 轻量限流（防刷）====================
// 内存滑动窗口：同 IP 60s 内最多 N 次分析。无外部存储，仅做第一道防线：
// serverless 多实例下发量到单个实例时窗口独立，但绝大多数滥用会被挡下；
// 配合前端缓存（内容未变不重复请求）可作为主要成本闸门。
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 6
const RATE_HITS = new Map() // ip -> number[]

function isRateLimited(req) {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
    .split(',')[0].trim()
  const now = Date.now()
  let hits = RATE_HITS.get(ip) || []
  hits = hits.filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) {
    RATE_HITS.set(ip, hits)
    return true
  }
  hits.push(now)
  RATE_HITS.set(ip, hits)
  return false
}

export const config = {
  runtime: 'nodejs',
  // 显式声明函数时长上限，避免被 Vercel 按默认值（Hobby 历史默认 10s）杀掉长请求。
  // Stage1/Stage2 最坏多次重试会超过它，但正常单次解读（Stage1+Stage2）在预算内；
  // callLLM 单次超时也相应压到 150s（见函数默认值），整体留有余量。
  maxDuration: 180,
}

const TONES = ['melancholy', 'passionate', 'serene', 'mysterious', 'humorous']

// ==================== 真实作家库（120 人，与海选网络一致；相似作家只能从其中选择，绝不编造）====================
const WRITERS = ALL_WRITTEN

// ==================== 分层风格标签体系（给模型事先了解的"标签分层"）====================
// 标签分两层：第一层七大维度，第二层维度内的具体标签。模型必须先看到这套体系，
// 才知道"短句/长句"是同维度两极、"乡土(题材)与冷(基调)"是正交维度，从而按维度做风格比对。
const STYLE_SYSTEM_BLOCK = Object.entries(STYLE_DIMENSIONS)
  .map(([dim, tags]) => `- ${dim}：${tags.join('/')}`)
  .join('\n')

const STYLE_OPPOSITES_NOTE = '同维度内存在对立极（如短句↔长句、冷↔暖、白描↔华丽、冲淡↔炽烈、平缓↔起伏大、沉郁↔诙谐）：本文与作家在同一维度处于对立极，即该维度强烈不像'

// 清单中的外国（非中国）作家，用于保证三位相似作家不全是中国人
const FOREIGN_NAMES = new Set([
  '莎士比亚', '狄更斯', '伍尔夫', '奥威尔', '石黑一雄', '乔伊斯', '司汤达',
  '巴尔扎克', '雨果', '福楼拜', '莫泊桑', '普鲁斯特', '加缪', '米兰·昆德拉',
  '卡夫卡', '黑塞', '茨威格', '卡尔维诺', '普希金', '列夫·托尔斯泰',
  '陀思妥耶夫斯基', '契诃夫', '马克·吐温', '海明威', '菲茨杰拉德', '塞林格',
  '马尔克斯', '博尔赫斯', '聂鲁达', '波德莱尔', '惠特曼', '艾略特',
  '夏目漱石', '芥川龙之介', '川端康成', '三岛由纪夫', '太宰治', '村上春树',
  '泰戈尔', '纪伯伦', '塞万提斯',
])

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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// ==================== 两阶段管线：Stage 1 识别 + Stage 2 表达 ====================
// Stage 1（轻量）：模型读全文，输出 分层标签(userTags) + 情感基调(tone) + 评分(scores) + 批注(annotations) + 精彩句(bestQuote)。
//   批注与精彩句只依赖原文，不需要候选作家，放在本阶段可分摊第二阶段输出预算。
//   本地随即用 userTags 在作者风格网络中做海选，取中外均衡的 top6。
// Stage 2（重量）：模型读全文 + 仅 top6 候选的 DNA 卡 + Stage1 的 tone/scores 作上下文，
//   输出评语四段 + 续写 + 升华句 + 调性 + 相似作家（authors 只能从 top6 里选）。
//   因候选已收敛到 6 位，Stage 2 温度可以压低，保证风格与分数稳定。

// 喂给模型的正文上限（字）：星辰 MaaS 要求 输入tokens + max_tokens ≤ 上下文长度，
// 正文太长会顶到上限导致偶发失败/截断。只截断喂给模型的部分；批注/金句匹配仍用完整原文。
const MODEL_TEXT_CAP = 6000
function capForModel(content) {
  const c = String(content || '')
  if (c.length <= MODEL_TEXT_CAP) return c
  let cut = c.slice(0, MODEL_TEXT_CAP)
  // 尽量在段落/句子边界截断，避免让模型引到半句
  const boundary = Math.max(
    cut.lastIndexOf('\n'),
    cut.lastIndexOf('。'),
    cut.lastIndexOf('！'),
    cut.lastIndexOf('？'),
    cut.lastIndexOf('…'),
  )
  if (boundary > MODEL_TEXT_CAP * 0.6) cut = cut.slice(0, boundary + 1)
  return cut
}

// —— Stage 1 prompt ——
export function buildStage1Prompt({ content, title, author, annoCount = 5 }) {
  const full = String(content || '')
  const body = capForModel(full)
  const excerpt = body.length < full.length ? '（节选，以下为正文开头部分）' : ''
  return `你是一位资深文学编辑。请先对以下作品做【风格识别】，不要写评语，只输出识别结果 JSON。

作品：《${title || '未命名'}》
作者：${author || '佚名'}
正文${excerpt}：
${body}

风格标签是【分层的】：第一层七大维度，第二层是维度内的具体标签。
${STYLE_SYSTEM_BLOCK}
${STYLE_OPPOSITES_NOTE}

请从上述词表给这段文字打标签：对每个维度，从该维度词表里挑选最符合本文的标签（每个维度选 0-3 个，没把握就不选；宁少勿乱）；然后判断本文情感基调，并摘录高光句子与批注。注意「文化」维度：它代表这段文字所处的文化语境（作者属于哪个国家/地区文化传统，如中文写作通常是中国，但模仿日本物哀或欧美叙事也可能体现出日本/英国/美国/俄罗斯等语境；跨文化可标多个）。

请严格按以下 JSON 结构返回（只返回合法 JSON，不要 markdown 代码块，不要任何其他文字）：
{
  "userTags": { "句法节奏": ["从词表选", "可多个"], "语言质地": ["..."], "题材内容": ["..."], "情感基调": ["..."], "意象系统": ["..."], "叙事结构": ["..."], "文化": ["国家或地区，如'中国'/'日本'/'英国'"] },
  "tone": "melancholy|passionate|serene|mysterious|humorous 之一",
  "bestQuote": "整篇文字里最出彩、最值得单独拎出来展示的那一句话（必须是正文中逐字真实存在的完整句子，含句末标点）",
  "annotations": [
    { "quote": "原文中真实存在的一个完整句子，从第一个字到句末标点完整摘录", "comment": "50-70字批注，锐利、具体地谈这一句的修辞、意象、节奏得失，不要空泛的褒贬" }
  ]
}

严格要求：
1. userTags 的每个标签都必须出自上面的词表，绝不能自造词表外的标签；没把握的维度留空数组
2. tone 只能是 melancholy(清冷忧郁)、passionate(热烈激情)、serene(宁静平和)、mysterious(神秘幽微)、humorous(幽默诙谐) 之一
3. annotations 数组必须【正好 ${annoCount} 项】，绝对不能多——每项对应原文中约一个 400 字片段里最高光的那一句，每项约 50-70 字，多写会挤占输出预算
4. 每条 annotations 的 quote 必须从正文中【逐字完整摘录】一个【完整的句子】：从第一个字到句末标点（含句末标点）。绝不能改写、删减、截取半句、拼接或凭空编造；若原文里实在找不到第 ${annoCount} 句完整的，就挑一句真正存在的最短的完整句子，宁可句子短，不可编造
5. bestQuote 同样必须从正文中逐字真实摘录完整句子（含句末标点）
6. 只输出这一个 JSON 对象，禁止任何 JSON 之外的解释文字`
}

// —— Stage 2 prompt ——
export function buildStage2Prompt({ content, title, author, candidates = [], stage1 = {} }) {
  const full = String(content || '')
  const body = capForModel(full)
  const excerpt = body.length < full.length ? '（节选，以下为正文开头部分）' : ''

  const stage1Context = (() => {
    const parts = []
    if (stage1?.tone) parts.push(`情感基调（Stage 1 已判定，评语口吻请与此一致）：${stage1.tone}`)
    return parts.length ? `\n${parts.join('\n')}` : ''
  })()

  // 候选卡按相似度从高到低排（rankCandidates 已保证输出有序，且中外混合）
  const CANDIDATE_CARDS = candidates.length ? candidates : CORE_WRITERS_DATA
  const cards = CANDIDATE_CARDS
    .map((w) => `- ${w.name}（${w.work.replace(/《|》/g, '')}/${w.work2.replace(/《|》/g, '')}）：${w.dna}｜标签：${tagsToHierarchical(w.tags)}`)
    .join('\n')
  const CANDIDATE_NAMES = CANDIDATE_CARDS.map((w) => w.name).join('、')

  return `你是一位资深文学编辑，拥有二十余年严肃文学编辑经验。请对以下作品进行文本解读，并严格按照 JSON 格式返回。

作品：《${title || '未命名'}》
作者：${author || '佚名'}
正文${excerpt}：
${body}

以下是可供选择的候选作家（风格卡：DNA 笔法描述 + 按维度排布的特征标签）。注意：候选名单【仅用于限定可选范围，不代表这些作家已被判定为相似】，列表顺序与相似度无关。请逐一独立比对本文与每位候选的维度标签与 DNA：命中越多同维度标签越像，命中对立极越不像；再结合 DNA 描述确认，按真实相似程度给出 authors，不必迎合列表顺序：
${cards}
${stage1Context}

解读总原则（务必遵守）：
- 你以资深文学编辑的专业视角解读，但始终记住：你评价的是文字，面对的却是写作者本人。请以真诚、尊重、接纳的态度呈现意见，先看见这篇文字的努力与优点，再谈可以更好的地方
- 侧重深入赏析与共情，而不是找错。不要刻意寻找错别字、用词之类的外在毛病（这类机械挑错常常并不准确，反而会伤到作者）；只有确实妨碍理解、明显失衡的地方，才轻轻、委婉地提一句
- 客观、内行、具体，不敷衍、不吹捧、不空泛；好就具体说好在哪
- 优先维护作品的文学性，而不是可读性
- 不要为了顺畅而消除作者刻意制造的晦涩、断裂、意识跳跃；不要把奇异的意象改写得通俗好懂
- 叙事层面刻意的断裂、歧义、含混属于作者的写作选择，不视作错误，也绝不要求改顺

请严格按以下 JSON 结构返回（只返回合法 JSON，不要 markdown 代码块，不要任何其他文字）：
{
  "textOverview": "总评第一段的自然段落（约70-90字，不要用序号不要分点不要任何小标题，也不要写'概览''文本分析'这类字眼）：像 MBTI 人格解读那样，用理解与共情的口吻，先感受这段文字流露出的气质与心绪（叙事视角：正文用'他/她'即第三人称，用'我'即第一人称，别弄错），说出'这段文字像是怎样一个人写下的'——可以落到开头的第一个镜头、最触动的那个细节上，让作者一读就知道你真的读进去了。语气真诚、关怀，像在读懂作者这个人",
  "literaryAnalysis": "总评第二段的自然段落（约220-280字，务必言之有物、有真正的文学深度，不要序号不要分点不要小标题）：像一位懂你的编辑那样，做深入赏析——（a）具体引证：挑出原文一两处真正立起来的句子/意象/细节，说明它好在哪（节奏怎么起落、意象如何经营、留白与克制怎样生效、视角与句法传达了何种情绪）；（b）指出结构上的脉络与起伏；（c）若确有做得不够好的地方，用委婉、商量的语气轻轻带过（例如'或许可以更含蓄一点''这里可能稍微直接了些'），把'作者主动的写作选择'与'真正的缺憾'区分开，绝不刻意挑刺",
  "comparison": "总评第三段的自然段落（约180-240字，不要序号不要分点不要小标题）：挑出文中一两个具体的意象（如'暮色''雨声''旧书页'）或一种笔法，先写作者是如何呈现它们的，再与候选作家中的一两位做横向对照（务必符合该作家作品的真实风格，不可编造，例如汪曾祺写吃食讲究味道的余韵、沈从文写湘西景物爱用光与水的层次、张爱玲善用色彩与器物写苍凉），具体到该作家某一部作品的某个片段；通过这样的对照，点明本文与这些作家的接近之处与真实距离，让作者更清楚地看见自己的水平处在哪个位置、下一步往哪个方向走",
  "conclusion": "总评第四段的自然段落（约40字，不要序号不要分点不要小标题）：这是总评的收尾段，承接上面三段，用温暖肯定但实在的口吻给整篇文字一个阶段性的定评——可以总结这篇文字的整体气质或作者最值得肯定的地方，让读者觉得'这段读完了，评价也完整了'。特别注意：这一段是点评的收尾，不是升华句也不是祝福语，绝对不要出现'愿''祝''希望你''愿你'这类祝愿、祝福或升华金句（升华句由 emotionalClosing 字段单独呈现，conclusion 里一个字都不能有）。另外，'S句'只是这套题目的内部叫法，你在任何输出文本中都不能出现'S句''S 句'这两个字，只把它当作字段的内部代号，永远不要写给读者看",
  "toneMetaphor": "一个'（形容词）的（名词）'格式的短语，例如'雾霭的河岸''黄昏的钟声'，用直觉式比喻概括这段文字的整体调性，只给短语本身，不要解释，也不要加任何括号",
  "styleColor": "代表本段文字风格的专属颜色，必须是合法的六位十六进制色号（如 #B8A9C9）。要求柔和、低饱和、偏淡雅的文学性色调（类似宣纸、暮色、雾霭），不要刺眼的高饱和色",
  "continuation": "约300-500字的续写（至少300字，尽量写到350字以上），风格、语气、节奏与原文完全一致，延续原文的人物、场景与情绪脉络，像同一支笔接着写下去；内容要扎实有推进、有新的细节与起伏，不要空泛抒情或机械复读，不要在这里写总结或收尾",
  "emotionalClosing": "一句克制的、有文学余味的诗意升华句（内部代号为S句，20-40字），用意象或隐喻收束全篇的余韵，提升整篇格调；不一定是祝福或祝愿，可以是任何有画面感、有升华感的文学性收束，但避免鸡汤与空泛。注意：'S句''S 句'是字段的内部代号，绝不能出现在你的任何输出文本里，读者只应该看到升华句本身",
  "tone": "melancholy|passionate|serene|mysterious|humorous 之一，按文本整体情感基调判断",
  "authors": [
    { "name": "从上述候选作家中挑选的第1位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第2位风格最相似的作家名（三位中至少一位必须是外国作家）", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第3位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） }
  ]
}

严格要求：
1. textOverview / literaryAnalysis / comparison / conclusion 四段缺一不可，全部写成自然的完整段落，按顺序连起来就是一段连贯的、面向作者的 MBTI 式共情解读，禁止使用 1. 2. 3. 等序号、分点符号或任何小标题（如'文本概览：''硬伤：'等），段落内容本身也不要出现'概览''评析''硬伤'之类的栏目词
2. styleColor 必须是合法的六位十六进制色号；toneMetaphor 必须是'（形容词）的（名词）'格式
3. continuation 至少要写到 300 字，尽量 350-500 字，宁长勿短
4. tone 只能是 melancholy(清冷忧郁)、passionate(热烈激情)、serene(宁静平和)、mysterious(神秘幽微)、humorous(幽默诙谐) 之一
5. authors 数组必须【正好 3 项】，且每位都【只能】出自上面的候选作家：${CANDIDATE_NAMES}，绝不出现候选之外的名字，work 必须是该作家真实存在的代表作；reason 必须是一句具体的、结合本文特点的相似理由（说明风格/笔法/题材上哪里像），禁止空话套话，禁止从清单外编造；similarity 必须是 0-100 之间的整数，表示该作家风格与本文的相似度占比（第一、二、三位依次递减，通常 35-40/25-30/15-20 这一档），且三位之和必须小于 100（代表不同维度的占比）；【重要】三位中至少有一位必须是候选中的外国作家（非中国作家，如托尔斯泰、川端康成、卡夫卡、海明威、村上春树等），不要三位全是中国人
6. 只输出这一个 JSON 对象，禁止复述作家清单，禁止任何清单之外的解释文字`
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
  // 再退一步：从尾部逐个尝试截断到合法 JSON 边界，容忍"数组中途被截断"的情况
  const partial = salvagePartial(cleaned, start)
  if (partial) return partial
  throw new Error('JSON 对象不完整')
}

// 截断修补：把输出看作"前半段合法 + 尾段截断"，从后往前找能被完整闭合的点
function salvagePartial(cleaned, start) {
  const candidates = new Set([start])
  let stack = []
  let inString = false
  let escaped = false
  // 记录每个能闭合的位置，之后从最长处开始尝试
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
        if ((open !== '{' || ch !== '}') && (open !== '[' || ch !== ']')) {
          // 括号不匹配：这个位置作废，保留上一个
          break
        }
        if (stack.length === 0) candidates.add(i + 1)
      }
    }
  }

  // 从最长的候选开始回退，尝试闭合为合法 JSON
  const ordered = [...candidates].sort((a, b) => b - a)
  for (const cut of ordered) {
    let sub = cleaned.slice(start, cut)
    const stack2 = []
    let inS = false
    let esc = false
    for (const ch of sub) {
      if (inS) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inS = false
      } else {
        if (ch === '"') inS = true
        else if (ch === '{' || ch === '[') stack2.push(ch)
        else if (ch === '}' || ch === ']') stack2.pop()
      }
    }
    if (inS) sub += '"'
    while (stack2.length) sub += stack2.pop() === '{' ? '}' : ']'
    try {
      return JSON.parse(sub)
    } catch {
      // 试下一个候选
    }
  }
  return null
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

function pickRandomWriter(exclude = new Set(), pool = WRITERS) {
  const avail = pool.filter((w) => !exclude.has(w.name))
  if (!avail.length) return pool[0]
  return avail[Math.floor(Math.random() * avail.length)]
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

function normalizeAuthors(parsed, candidatePool = null) {
  const candidates = Array.isArray(parsed?.authors) ? parsed.authors : []
  const result = []
  const used = new Set()
  // 候选池限定：兜底与名字匹配都从候选池里走；未给候选池则退回全局 WRITERS
  const poolNames = candidatePool && candidatePool.length
    ? new Set(candidatePool.map((w) => w.name))
    : null
  const inPool = (name) => !poolNames || poolNames.has(name)
  const poolOf = (list) => list.filter((w) => inPool(w.name))
  const fullPool = poolOf(WRITERS)
  const fallbackPool = fullPool.length ? fullPool : WRITERS

  for (const c of candidates) {
    if (result.length >= 3) break
    const name = typeof c?.name === 'string' ? c.name.trim() : ''
    if (!name || !inPool(name)) continue
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
    const w = pickRandomWriter(used, fallbackPool)
    if (!w) break
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
  result.sort((a, b) => b.similarity - a.similarity)
  const total = result.reduce((sum, x) => sum + x.similarity, 0)
  if (total >= 100) {
    const scale = 95 / total
    result.forEach((x) => { x.similarity = Math.max(1, Math.round(x.similarity * scale)) })
    // 缩放后仍保持严格降序
    result.sort((a, b) => b.similarity - a.similarity)
  }

  // 保证三位里至少有一位外国作家：若全是中国人，把相似度最低的一位换成外国作家
  if (result.length >= 3 && !result.some((x) => FOREIGN_NAMES.has(x.name))) {
    const pool = fallbackPool.filter((w) => FOREIGN_NAMES.has(w.name) && !used.has(w.name))
    if (pool.length) {
      const w = pool[Math.floor(Math.random() * pool.length)]
      const minSim = Math.max(1, (result[2]?.similarity ?? 18) - 4)
      result[2] = {
        name: w.name,
        work: w.work,
        work2: w.work2,
        reason: FALLBACK_REASONS[2] || FALLBACK_REASONS[0],
        similarity: minSim,
      }
      result.sort((a, b) => b.similarity - a.similarity)
    }
  }
  return result
}

export function normalizeReview(parsed, content, opts = {}) {
  const annoCap = clampCount(content.trim().length)

  // 总评结尾段禁止出现 S 句（S 句由 emotionalClosing 单独呈现）：
  // 把整段按句末标点切分，剔除任何像祝福/祝愿/升华的句子，不只限于句首
  const scrubBlessing = (t) => {
    const s = String(t || '').trim()
    if (!s) return s
    const parts = s.split(/(?<=[。！？；!?…])/).map((p) => p.trim()).filter(Boolean)
    const kept = parts.filter((p) => {
      const seg = p.replace(/^["'“”『「]|["'”」』]+$/g, '').trim()
      if (!seg) return false
      return !/^(愿|祝|祝福|祝愿|希望|期望|盼|期待着)/.test(seg)
        && !/愿你|祝你|祝愿你|希望你|愿你笔/.test(seg)
    })
    // 全部被删光时保留原文，避免出现空段落
    if (!kept.length) return s
    return kept.join('').trim()
  }

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

  // 模型没有给任何批注时，从原文按间隔挑几句作为兜底批注，保证页面不空
  if (annotations.length === 0 && sentences.length) {
    const n = Math.max(1, Math.min(annoCap, sentences.length))
    const step = Math.max(1, Math.floor(sentences.length / n))
    let cursor = 0
    for (let i = 0; i < n; i++) {
      const si = Math.min(cursor, sentences.length - 1)
      annotations.push({
        id: `anno_fb_${Date.now()}_${i}`,
        quote: sentences[si],
        comment: '这一句在叙事与意象上都很有分量，值得细读。',
        startIndex: si,
      })
      cursor += step
    }
  }

  const authors = normalizeAuthors(parsed, opts?.candidatePool || null)

  // 出彩句（导出卡展示用）：模型给出后匹配到真实句子；若未给出或匹配不上，退回第一条批注的引文
  // 注意：必须在 annotations 构建之后计算（会回退到 annotations[0]）
  const bestQuote = (() => {
    const q = String(parsed?.bestQuote || '').trim().replace(/\s+/g, '')
    const stripped = q.replace(/[，。！？；：""''（）…、—\-\s]/g, '')
    let best = null
    let bestScore = 0
    if (stripped) {
      for (const s of sentences) {
        const sc = overlapScore(stripped, s)
        if (sc > bestScore) { bestScore = sc; best = s }
      }
    }
    if (best && bestScore >= 6) return best
    return annotations[0]?.quote || best || sentences[0] || ''
  })()

  const computed = computeRadar(content)

  // 评分：同文同分（确定性）。完全由文本启发式计算得出，不随 AI 输出波动
  const { radar, score } = computed

  const styleColor = typeof parsed?.styleColor === 'string'
    && /^#[0-9a-fA-F]{6}$/.test(parsed.styleColor)
    ? parsed.styleColor
    : null

  // 兜底清理：prompt 里的内部代号（S句）绝不能泄漏到读者可见的文本里
  const scrubInternal = (t) => String(t || '').replace(/S\s*句/g, '升华句').trim()

  return {
    author: authors[0],
    authors,
    annotations: annotations.map(a => ({ ...a, comment: scrubInternal(a.comment) })),
    continuation: parsed?.continuation || '',
    bestQuote,
    textOverview: scrubInternal(parsed?.textOverview),
    literaryAnalysis: scrubInternal(parsed?.literaryAnalysis),
    comparison: scrubInternal(parsed?.comparison || parsed?.hardIssues || ''),
    conclusion: scrubInternal(scrubBlessing(parsed?.conclusion)),
    emotionalClosing: scrubInternal(parsed?.emotionalClosing),
    toneMetaphor: String(parsed?.toneMetaphor || '').replace(/[（）()]/g, '').trim(),
    tone: TONES.includes(parsed?.tone) ? parsed.tone : 'melancholy',
    styleColor,
    score,
    radar,
  }
}

async function callLLM(prompt, temperature, { timeoutMs = 150000, maxTokens = 8192 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(ACTIVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACTIVE_API_KEY}`,
      },
      body: JSON.stringify({
        model: ACTIVE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        ...(PROVIDER === 'zhipu' ? { thinking: ZHIPU_THINKING } : {}),
      }),
      signal: controller.signal,
    })

    const text = await response.text()
  let data = null
  try { data = JSON.parse(text) } catch { /* 非 JSON 响应，按原样处理 */ }

  // 星辰 MaaS 的业务错误码：即使 HTTP 200，body 里也可能带 code != 0
  // （如 {"code":3000,"message":"..."}）。必须在这里拦截，否则会落到
  // "AI 返回为空" 的误导性提示。
  if (data && typeof data.code === 'number' && data.code !== 0) {
    const bizMsg = data.message || 'AI 服务暂时不可用，请稍后重试'
    console.error('XFYUN business error:', data.code, bizMsg)
    const err = new Error(`AI 服务调用失败（${data.code}）：${bizMsg}`)
    err.status = data.code
    err.retryable = [3000, 3004, 3005, 4002, 4003].includes(data.code)
    throw err
  }
  if (data?.error?.message) {
    const msg = data.error.message
    console.error('AI API Error:', response.status, msg)
    const err = new Error(`AI 服务返回：${msg}`)
    err.status = response.status
    // 讯飞 MaaS 过载/内部错误常以 HTTP 200 + error.message='internal error' + overloaded=true 返回；
    // 智谱过载以 HTTP 429 + {"error":{"code":"1305","message":"该模型当前访问量过大"}} 返回。
    // 这类服务端瞬时故障必须可重试（否则 Stage1/Stage2 的 3 次尝试会因 retryable=false 直接中断）。
    const overloaded = data.overloaded === true || /overload|internal error|繁忙|过载|rate.?limit|访问量过大/i.test(msg)
    err.retryable = response.status >= 500 || response.status === 429 || overloaded
    throw err
  }
  if (!response.ok) {
    console.error('AI API Error:', response.status, text)
    let message = `AI 服务调用失败（${response.status}），请检查 API Key 与模型 ID 配置`
    try {
      const err = JSON.parse(text)
      if (err?.error?.message) message = `AI 服务返回：${err.error.message}`
      else if (err?.message) message = `AI 服务返回：${err.message}`
    } catch {
      if (text) message = `AI 服务返回：${text.slice(0, 300)}`
    }
    const err = new Error(message)
    err.status = response.status
    err.retryable = response.status >= 500 || response.status === 429
    throw err
  }

  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) {
    const err = new Error('AI 返回为空，请重试')
    err.status = 502
    err.retryable = true
    throw err
  }
  return rawContent
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('AI 服务响应超时，请重试')
      err.status = 504
      err.retryable = true
      throw err
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// 模型输出完全无法解析时的兜底：基于文本启发式生成一份可用解读，保证用户总能看到结果
function buildHeuristicReview(content, title, author) {
  const computed = computeRadar(content)
  const { radar, score } = computed
  const sentences = extractSentences(content)
  const annoCount = clampCount(content.trim().length)
  const step = sentences.length ? Math.max(1, Math.floor(sentences.length / Math.max(1, annoCount))) : 1
  let cursor = 0
  const annotations = []
  for (let i = 0; i < Math.min(annoCount, sentences.length); i++) {
    const si = Math.min(cursor, sentences.length - 1)
    cursor += step
    annotations.push({
      id: `anno_h_${Date.now()}_${i}`,
      quote: sentences[si],
      comment: '这一句在全文中质感突出，意象与节奏都值得留意。',
      startIndex: si,
    })
  }
  const authors = normalizeAuthors({ authors: [] })
  const tone = ['melancholy', 'passionate', 'serene', 'mysterious', 'humorous'][Math.floor(Math.random() * 5)]
  return {
    author: authors[0],
    authors,
    annotations,
    continuation: '',
    bestQuote: annotations[0]?.quote || '',
    textOverview: '这段文字以细腻的笔触展开，叙事视角稳定，整体气质沉静而有温度。',
    literaryAnalysis: '文字的语感与意象经营都很用心，个别处可再收敛一些直白抒情，让余味更绵长。',
    comparison: '若放在沈从文、汪曾祺一脉来读，你的句子在节奏上是接近的，只是意象还略欠一层打磨，再写得含蓄些会更耐读。',
    conclusion: '整体可用，建议在情绪表达上再克制一分。',
    emotionalClosing: '愿你的笔，落处皆是温柔。',    toneMetaphor: '暮色的河岸',
    tone,
    styleColor: null,
    score,
    radar,
  }
}

// 主解读完成后，若续写不够长，用一次专门调用生成 300-500 字的完整续写
async function generateContinuation(content, title, author) {
  const full = String(content || '')
  const body = capForModel(full)
  const excerpt = body.length < full.length ? '（节选，以下为正文开头部分）' : ''
  const prompt = `请为下面的文章续写一段文字。要求：
- 至少 300 字，尽量写到 350-500 字
- 风格、语气、节奏与原文完全一致，延续原文的人物、场景与情绪脉络，像同一支笔接着写下去
- 内容要扎实有推进，有新的细节与起伏，不要空泛抒情、不要机械复读、不要写总结或收尾
- 只输出续写正文本身，不要任何解释、标题或引号

文章标题：《${title || '未命名'}》
作者：${author || '佚名'}
正文${excerpt}：
${body}

续写：`
  try {
    const raw = await callLLM(prompt, 0.6, { maxTokens: 2048 })
    const clean = String(raw || '')
      .replace(/```/g, '')
      .replace(/^[\s"'“”「『]+|[\s"'“”」』]+$/g, '')
      .trim()
    if (clean.length >= 250) return clean
    console.error('continuation too short:', clean.length)
  } catch (e) {
    console.error('continuation generation failed:', e.message)
  }
  return null
}

export async function POST(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (isRateLimited(req)) {
    return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
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

    if (!ACTIVE_API_KEY) {
      return new Response(
        JSON.stringify({ error: '服务端未配置 ZHIPU_API_KEY / XFYUN_API_KEY，请在 Vercel 环境变量中设置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const annoCount = clampCount(content.trim().length)
    const _t0 = Date.now()
    const _timer = (label) => { const dt = ((Date.now() - _t0) / 1000).toFixed(1); console.error(`[timing] ${label}: ${dt}s`); return dt }

    // ---- Stage 1：风格识别（标签化 + 情感基调 + 评分 + 批注 + 精彩句）----
    // 温度稍高以鼓励标签化多角度命中；批注与精彩句在此产出，为 Stage 2 省下输出预算。
    const stage1Attempts = [0.5, 0.35, 0.65]
    let stage1 = null
    let attempt = 0
    for (const t of stage1Attempts) {
      attempt++
      try {
        const p1 = buildStage1Prompt({ content, title, author, annoCount })
        const raw1 = await callLLM(p1, t, { maxTokens: 4096 })
        _timer('Stage1 done (temp=' + t + ')')
        stage1 = extractJson(raw1)
        if (stage1 && typeof stage1 === 'object') break
      } catch (err) {
        console.error('Stage1 attempt failed (temp=' + t + '):', err.message)
        if (!err.message.includes('JSON') && !err.retryable) throw err
        // 429/过载等瞬时故障：退避 2-4s 再试，避免高峰连撞
        const overloaded = err.status === 429 || /过载|繁忙|访问量|overload|rate.?limit/i.test(String(err.message))
        if (overloaded && attempt < stage1Attempts.length) await sleep(2000 + attempt * 1000)
      }
    }
    if (!stage1 || typeof stage1 !== 'object') {
      // 首次识别完全失败：退化为启发式解读，保证用户总能拿到结果
      console.error('Stage1 all attempts failed, using heuristic fallback')
      return new Response(JSON.stringify(buildHeuristicReview(content, title, author)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ---- 本地海选：把用户标签放进作者风格网络取 top6 ----
    // 优先用模型打的 userTags；模型没给/给乱时，用规则 tagUserText 兜底。
    const modelTags = Object.values(stage1.userTags || {}).flat().filter(Boolean)
    const userTags = modelTags.length ? modelTags : tagUserText(content)
    const tagResult = rankCandidates(userTags, 6)
    let { candidates } = tagResult
    // 语义向量层（120 位全覆盖）作为第二信号与标签网络融合；未生成/调用失败自动回退纯标签
    if (embedReady()) {
      try {
        const vecTop = await embedRankAuthors(content, 8)
        _timer('embedRank done')
        candidates = blendCandidateSets(tagResult.candidates, vecTop, WRITERS, FOREIGN_NAMES, 6)
        _timer('blend done')
      } catch (err) {
        console.error('embedRank blend failed, fallback to tag-only:', err.message)
      }
    }

    // ---- Stage 2：深度解读（评语四段 + 续写 + 升华句 + 相似作家），只面对 top6 ----
    // 候选已收敛，温度压低保证风格与分数稳定。
    const stage2Attempts = [0.2, 0.15, 0.35]
    let stage2 = null
    attempt = 0
    for (const t of stage2Attempts) {
      attempt++
      try {
        const p2 = buildStage2Prompt({
          content, title, author,
          candidates,
          stage1,
        })
        const raw2 = await callLLM(p2, t, { maxTokens: 8192 })
        _timer('Stage2 done (temp=' + t + ')')
        stage2 = extractJson(raw2)
        if (stage2 && typeof stage2 === 'object') break
      } catch (err) {
        console.error('Stage2 attempt failed (temp=' + t + '):', err.message)
        if (!err.message.includes('JSON') && !err.retryable) throw err
        const overloaded = err.status === 429 || /过载|繁忙|访问量|overload|rate.?limit/i.test(String(err.message))
        if (overloaded && attempt < stage2Attempts.length) await sleep(2000 + attempt * 1000)
      }
    }

    if (!stage2 || typeof stage2 !== 'object') {
      console.error('Stage2 all attempts failed, using heuristic fallback')
      return new Response(JSON.stringify(buildHeuristicReview(content, title, author)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 合并：批注/精彩句/情感基调来自 Stage 1，评语与相似作家来自 Stage 2
    const parsed = {
      ...stage2,
      annotations: stage1.annotations,
      bestQuote: stage1.bestQuote,
      tone: stage1.tone || stage2.tone,
      userTags,
      candidates: candidates.map((c) => c.name),
    }

    const result = normalizeReview(parsed, content, {
      candidatePool: candidates,
    })

    // Stage2 已内置续写要求（300-500 字），通常直接可用。仅当续写完全缺失时才用一次专门调用
    // 兜底补齐；长度略短（200-300 字）不再单独补发，避免把正文第三次重发给模型（省 token 与时长）。
    let finalResult = result
    if (!result.continuation || !String(result.continuation).trim()) {
      const longCont = await generateContinuation(content, title, author)
      if (longCont) finalResult = { ...result, continuation: longCont }
    }

    return new Response(JSON.stringify(finalResult), {
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
