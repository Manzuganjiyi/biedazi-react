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

// ==================== 名著识别（服务端兜底，保证经典名篇不被误判低分 / 强批）====================
// 正文指纹 → 所属作家（用于把作者强制列为最相似作家）
const MASTERPIECE_FINGERPRINTS = [
  { text: '我与父亲不相见已二年余了', writer: '朱自清' }, // 《背影》
  { text: '这几天心里颇不宁静', writer: '朱自清' }, // 《荷塘月色》
  { text: '盼望着，盼望着，东风来了', writer: '朱自清' }, // 《春》
  { text: '时候既然是深冬', writer: '鲁迅' }, // 《故乡》
  { text: '在我的后园，可以看见墙外有两株树', writer: '鲁迅' }, // 《秋夜》
  { text: '北国的秋，却特别地来得清', writer: '郁达夫' }, // 《故都的秋》
  { text: '对于一个在北平住惯的人', writer: '老舍' }, // 《济南的冬天》
  { text: '那是力争上游的一种树', writer: '茅盾' }, // 《白杨礼赞》
  { text: '梅什金公爵从瑞士回到了彼得堡', writer: '陀思妥耶夫斯基' }, // 《白痴》
  { text: '由四川过湖南去，靠东有一条官路', writer: '沈从文' }, // 《边城》
  { text: '北京的冬季，地上还有积雪，灰黑色的秃树枝丫叉于晴朗的天空中', writer: '鲁迅' }, // 《风筝》
  { text: '秋天的后半夜，月亮下去了，太阳还没有出', writer: '鲁迅' }, // 《药》
  { text: '鲁镇的酒店的格局，是和别处不同的', writer: '鲁迅' }, // 《孔乙己》
  { text: '我冒了严寒，回到相隔二千余里，别了二十余年的故乡去', writer: '鲁迅' }, // 《故乡》
  { text: '我家门前有两棵树，一棵是枣树，另一棵也是枣树', writer: '鲁迅' }, // 《秋夜》
  { text: '此后我竟没有再来过这城，只是时时想起那雪', writer: '郁达夫' }, // 《故都的秋》周边
  { text: '在北平即使不出门去罢', writer: '老舍' }, // 《济南的冬天》
  { text: '我们过了江，进了车站', writer: '朱自清' }, // 《背影》
  { text: '有一次，幼小的我，忽然走到母亲面前', writer: '冰心' }, // 《寄小读者》
]

// 名篇辨识的标志性内容线索（人物名 / 经典意象 / 独特场景）：
// 比"开篇首句"更可靠——用户可能只贴中段或节选，但标志性人物名通常仍会出现在片段里。
// 内容命中任一标志物即强制按名篇处理，不依赖模型文风判断，是 D 方案的确定性兜底。
const MASTERPIECE_MARKERS = [
  // —— 中国现当代经典 ——
  { marker: '闰土', writer: '鲁迅' },
  { marker: '祥林嫂', writer: '鲁迅' },
  { marker: '孔乙己', writer: '鲁迅' },
  { marker: '阿Q', writer: '鲁迅' },
  { marker: '人血馒头', writer: '鲁迅' },
  { marker: '小英子', writer: '汪曾祺' },
  { marker: '明海', writer: '汪曾祺' },
  { marker: '高邮咸鸭蛋', writer: '汪曾祺' },
  { marker: '方鸿渐', writer: '钱钟书' },
  { marker: '三闾大学', writer: '钱钟书' },
  { marker: '白流苏', writer: '张爱玲' },
  { marker: '范柳原', writer: '张爱玲' },
  { marker: '振保', writer: '张爱玲' },
  { marker: '骆驼祥子', writer: '老舍' },
  { marker: '裕泰', writer: '老舍' },
  { marker: '觉新', writer: '巴金' },
  { marker: '鸣凤', writer: '巴金' },
  { marker: '汪文宣', writer: '巴金' },
  { marker: '吴荪甫', writer: '茅盾' },
  { marker: '庄之蝶', writer: '贾平凹' },
  { marker: '王二', writer: '王小波' },
  { marker: '陈清扬', writer: '王小波' },
  { marker: '傻子少爷', writer: '阿来' },
  { marker: '我与地坛', writer: '史铁生' },
  { marker: '面朝大海', writer: '海子' },
  { marker: '额尔古纳河', writer: '迟子建' },
  // —— 外国经典（中译本的标志性人名/意象）——
  { marker: '哈姆雷特', writer: '莎士比亚' },
  { marker: '奥赛罗', writer: '莎士比亚' },
  { marker: '麦克白', writer: '莎士比亚' },
  { marker: '冉阿让', writer: '雨果' },
  { marker: '珂赛特', writer: '雨果' },
  { marker: '包法利', writer: '福楼拜' },
  { marker: '于连', writer: '司汤达' },
  { marker: '高老头', writer: '巴尔扎克' },
  { marker: '拉斯蒂涅', writer: '巴尔扎克' },
  { marker: '羊脂球', writer: '莫泊桑' },
  { marker: '默尔索', writer: '加缪' },
  { marker: '老大哥', writer: '奥威尔' },
  { marker: '一九八四', writer: '奥威尔' },
  { marker: '格里高尔', writer: '卡夫卡' },
  { marker: '荒原狼', writer: '黑塞' },
  { marker: '悉达多', writer: '黑塞' },
  { marker: '奥涅金', writer: '普希金' },
  { marker: '安娜·卡列尼娜', writer: '列夫·托尔斯泰' },
  { marker: '拉斯柯尔尼科夫', writer: '陀思妥耶夫斯基' },
  { marker: '索尼娅', writer: '陀思妥耶夫斯基' },
  { marker: '卡拉马佐夫', writer: '陀思妥耶夫斯基' },
  { marker: '阿辽沙', writer: '陀思妥耶夫斯基' },
  { marker: '梅什金', writer: '陀思妥耶夫斯基' },
  { marker: '马林鱼', writer: '海明威' },
  { marker: '盖茨比', writer: '菲茨杰拉德' },
  { marker: '霍尔顿', writer: '塞林格' },
  { marker: '布恩迪亚', writer: '马尔克斯' },
  { marker: '马孔多', writer: '马尔克斯' },
  { marker: '阿莱夫', writer: '博尔赫斯' },
  { marker: '苦沙弥', writer: '夏目漱石' },
  { marker: '岛村', writer: '川端康成' },
  { marker: '驹子', writer: '川端康成' },
  { marker: '叶藏', writer: '太宰治' },
  { marker: '挪威的森林', writer: '村上春树' },
  { marker: '吉檀迦利', writer: '泰戈尔' },
  { marker: '堂吉诃德', writer: '塞万提斯' },
  { marker: '桑丘', writer: '塞万提斯' },
]

// 供 prompt 使用的名篇线索参照表：作家 → 标志性人物/意象，让模型同样能凭内容自判
const MARKER_LINE = (() => {
  const byWriter = {}
  for (const m of MASTERPIECE_MARKERS) {
    if (!byWriter[m.writer]) byWriter[m.writer] = []
    byWriter[m.writer].push(m.marker)
  }
  return Object.entries(byWriter)
    .map(([w, ms]) => `${w}（${[...new Set(ms)].join('/')}）`)
    .join('；')
})()

// 识别结果：detected 是否命中共识名篇；writer 若可确定（作者名/标题/指纹对应），则为该作家
function detectMasterpiece(meta) {
  const title = String(meta?.title || '').replace(/[《》\s]/g, '')
  const author = String(meta?.author || '').trim()
  const content = String(meta?.content || '')
  const writerNames = WRITERS.map((w) => w.name)

  if (author) {
    const byAuthor = WRITERS.find((w) => w.name === author)
    if (byAuthor) return { detected: true, writer: byAuthor }
  }
  if (title) {
    const byTitle = WRITERS.find((w) => {
      const w1 = w.work.replace(/[《》]/g, '')
      const w2 = w.work2.replace(/[《》]/g, '')
      return w1 === title || w2 === title || w1.includes(title) || w2.includes(title)
    })
    if (byTitle) return { detected: true, writer: byTitle }
  }
  for (const fp of MASTERPIECE_FINGERPRINTS) {
    if (content.includes(fp.text)) {
      const w = WRITERS.find((x) => x.name === fp.writer)
      return { detected: true, writer: w || null }
    }
  }
  // 标志性人物/意象命中：即使节选或中译本文风不典型，也能凭内容确认名篇身份
  for (const m of MASTERPIECE_MARKERS) {
    if (content.includes(m.marker)) {
      const w = WRITERS.find((x) => x.name === m.writer)
      return { detected: true, writer: w || null }
    }
  }
  return { detected: false, writer: null }
}

// 合并"模型凭正文文风的自判"与"服务端指纹/元信息检测"：
// 服务端检测（元信息 / 开篇指纹 / 标志性人物意象）是确定性依据，命中即直接采纳其作家；
// 模型自判仅用于服务端未命中的情况（模型凭文风认出清单外/库外名篇时作为补充）
function mergeMasterpiece(modelJudgment, serverDetect) {
  // 服务端命中：作者以服务端为准，避免模型自判时猜错作者（如把《白痴》中译本误判为沈从文）
  if (serverDetect && serverDetect.detected && serverDetect.writer) {
    return { detected: true, writer: serverDetect.writer }
  }
  const mj = modelJudgment && typeof modelJudgment === 'object' ? modelJudgment : {}
  const modelConfirmed = mj.isMasterpiece === true
  let writer = null
  if (modelConfirmed && typeof mj.writer === 'string') {
    const name = mj.writer.trim()
    const w = WRITERS.find((x) => x.name === name)
    if (w) writer = w
  }
  // 服务端已识别但没有对应作家（指纹作者不在清单）时，仍视为名篇
  const detected = modelConfirmed || !!(serverDetect && serverDetect.detected)
  return { detected, writer }
}

// 确定性评分：同文同分。名篇则强制高位，普通文本完全由启发式计算得出（与 AI 无关，保证稳定）
function finalizeScores(computed, masterpiece) {
  if (!masterpiece) return computed
  return {
    radar: { language: 91, structure: 89, imagery: 92, emotion: 90, innovation: 87 },
    score: 90,
  }
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

export function buildPrompt({ content, title, author, annoCount = 5, masterpiece = false, masterpieceWriter = null }) {
  const masterpieceLine = masterpiece
    ? '\n- ★ 本篇经识别为公认的经典名篇：评分（scores 与 total）一律 85 分以上，总评语气应像向经典致敬而非例行评审，禁止任何强烈负面批评'
    : ''
  const forcedWriterLine = masterpieceWriter
    ? `\n- ★ 本篇已被识别为「${masterpieceWriter.name}」的代表作：相似作家 authors 的第 1 位必须且只能是 ${masterpieceWriter.name}（similarity 设为最高，约 90 上下），其余两位再从清单里挑风格相近的作家`
    : ''
  return `你是一位资深文学编辑，拥有二十余年严肃文学编辑经验。请对以下作品进行文本解读，并严格按照 JSON 格式返回。

作品：《${title || '未命名'}》
作者：${author || '佚名'}
正文：
${content}

以下都是真实存在的知名作家（作家名-代表作），请【只能】从中选择与本文风格最相似的作家，绝不能编造清单之外的作家或作品：
${WRITER_LINE}

名篇辨识参照（仅供判断本文是否属于以下经典名篇的标志性内容线索，出现这些人物名/意象/场景即大概率是对应名篇的中译或节选）：
${MARKER_LINE}

解读总原则（务必遵守）：
- 你以资深文学编辑的专业视角解读，但始终记住：你评价的是文字，面对的却是写作者本人。请以真诚、尊重、接纳的态度呈现意见，先看见这篇文字的努力与优点，再谈可以更好的地方
- 侧重深入赏析与共情，而不是找错。不要刻意寻找错别字、用词之类的外在毛病（这类机械挑错常常并不准确，反而会伤到作者）；只有确实妨碍理解、明显失衡的地方，才轻轻、委婉地提一句
- 客观、内行、具体，不敷衍、不吹捧、不空泛；好就具体说好在哪
- 优先维护作品的文学性，而不是可读性
- 不要为了顺畅而消除作者刻意制造的晦涩、断裂、意识跳跃；不要把奇异的意象改写得通俗好懂
- 叙事层面刻意的断裂、歧义、含混属于作者的写作选择，不视作错误，也绝不要求改顺
- 名著豁免：请凭【正文的文风与内容】判断本文是否明显是某部经典名篇或名家作品的片段（如《背影》《荷塘月色》《故乡》《罪与罚》等）。判断只依据正文本身的文字气质与内容，不依赖作品标题、作者名或任何元信息；如果你凭文风与内容确认了它的名篇身份，评价必须符合其既定的文学地位——客观、尊重，肯定其经典价值，严禁对名著给出低分或强烈的负面批评${masterpieceLine}${forcedWriterLine}

评分标准（务必遵守）：
- 60 分 = 省市级文学刊物可发表的水平；70 分 = 国内重要文学期刊水平；80 分 = 顶尖（《收获》《人民文学》级别）；90 分以上 = 一流作家的名篇；100 分 = 诺贝尔文学奖级别
- 绝大多数投稿在 55-75 之间；只有真正出色、让人眼前一亮的文本才给 80 以上，切勿虚高
- 五个分项（语言/结构/意象/情感/创新）与总分都要基于你对文本的真实判断，且必须与评语口径一致：评语里批评得越重，分数就越低
- 请保持评分稳定性：同一水准的文本给出同一档的分数，不要让分数随心情浮动

请严格按以下 JSON 结构返回（只返回合法 JSON，不要 markdown 代码块，不要任何其他文字）：
{
  "textOverview": "总评第一段的自然段落（约70-90字，不要用序号不要分点不要任何小标题，也不要写'概览''文本分析'这类字眼）：像 MBTI 人格解读那样，用理解与共情的口吻，先感受这段文字流露出的气质与心绪（叙事视角：正文用'他/她'即第三人称，用'我'即第一人称，别弄错），说出'这段文字像是怎样一个人写下的'——可以落到开头的第一个镜头、最触动的那个细节上，让作者一读就知道你真的读进去了。语气真诚、关怀，像在读懂作者这个人",
  "literaryAnalysis": "总评第二段的自然段落（约220-280字，务必言之有物、有真正的文学深度，不要序号不要分点不要小标题）：像一位懂你的编辑那样，做深入赏析——（a）具体引证：挑出原文一两处真正立起来的句子/意象/细节，说明它好在哪（节奏怎么起落、意象如何经营、留白与克制怎样生效、视角与句法传达了何种情绪）；（b）指出结构上的脉络与起伏；（c）若确有做得不够好的地方，用委婉、商量的语气轻轻带过（例如'或许可以更含蓄一点''这里可能稍微直接了些'），把'作者主动的写作选择'与'真正的缺憾'区分开，绝不刻意挑刺",
  "comparison": "总评第三段的自然段落（约180-240字，不要序号不要分点不要小标题）：挑出文中一两个具体的意象（如'暮色''雨声''旧书页'）或一种笔法，先写作者是如何呈现它们的，再写清单里最相似的那位作家在处理同类意象时的真实笔法（务必符合该作家作品的真实风格，不可编造，例如汪曾祺写吃食讲究味道的余韵、沈从文写湘西景物爱用光与水的层次、张爱玲善用色彩与器物写苍凉），具体到该作家某一部作品的某个片段；通过这样的对照，点明本文与这位作家的接近之处与真实距离，让作者更清楚地看见自己的水平处在哪个位置、下一步往哪个方向走",
  "conclusion": "总评第四段的自然段落（约40字，不要序号不要分点不要小标题）：这是总评的收尾段，承接上面三段，用温暖肯定但实在的口吻给整篇文字一个阶段性的定评——可以总结这篇文字的整体气质或作者最值得肯定的地方，让读者觉得'这段读完了，评价也完整了'。特别注意：这一段是点评的收尾，不是升华句也不是祝福语，绝对不要出现'愿''祝''希望你''愿你'这类祝愿、祝福或升华金句（升华句由 emotionalClosing 字段单独呈现，conclusion 里一个字都不能有）。另外，'S句'只是这套题目的内部叫法，你在任何输出文本中都不能出现'S句''S 句'这两个字，只把它当作字段的内部代号，永远不要写给读者看",
  "toneMetaphor": "一个'（形容词）的（名词）'格式的短语，例如'雾霭的河岸''黄昏的钟声'，用直觉式比喻概括这段文字的整体调性，只给短语本身，不要解释，也不要加任何括号",
  "styleColor": "代表本段文字风格的专属颜色，必须是合法的六位十六进制色号（如 #B8A9C9）。要求柔和、低饱和、偏淡雅的文学性色调（类似宣纸、暮色、雾霭），不要刺眼的高饱和色",
  "continuation": "约300-500字的续写（至少300字，尽量写到350字以上），风格、语气、节奏与原文完全一致，延续原文的人物、场景与情绪脉络，像同一支笔接着写下去；内容要扎实有推进、有新的细节与起伏，不要空泛抒情或机械复读，不要在这里写总结或收尾",
  "bestQuote": "整篇文字里最出彩、最值得单独拎出来展示的那一句话（可以是任何位置的完整句子，必须在正文中逐字真实存在，含句末标点；要挑真正立得住、有文学质感的句子，不是随便选一句）",
  "emotionalClosing": "一句克制的、有文学余味的诗意升华句（内部代号为S句，20-40字），用意象或隐喻收束全篇的余韵，提升整篇格调；不一定是祝福或祝愿，可以是任何有画面感、有升华感的文学性收束，但避免鸡汤与空泛。注意：'S句''S 句'是字段的内部代号，绝不能出现在你的任何输出文本里，读者只应该看到升华句本身",
  "tone": "melancholy|passionate|serene|mysterious|humorous 之一，按文本整体情感基调判断",
  "masterpiece": { "isMasterpiece": 是否凭正文文风与内容判断出本文明显是某部经典名篇/名家作品（true/false）, "writer": "若 isMasterpiece 为 true 且你能确定作者，填该作者在清单中的准确名字（例如'朱自清'）；不确定或非清单内作者则填 null", "work": "若 isMasterpiece 为 true 且你能确定作品，填作品名（如'《背影》'）；不确定则填 null" },
  "scores": { "language": 0-100整数, "structure": 0-100整数, "imagery": 0-100整数, "emotion": 0-100整数, "innovation": 0-100整数, "total": 0-100整数 },
  "authors": [
    { "name": "从上述清单挑选的第1位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第2位风格最相似的作家名（三位中至少一位必须是外国作家）", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） },
    { "name": "第3位风格最相似的作家名", "work": "该作家的代表作", "reason": "一句简短的话说明该作家与本文风格相似的原因，约20-40字", "similarity": 0-100整数（风格相似度百分比） }
  ],
  "annotations": [
    { "quote": "原文中真实存在的一个完整句子的高光句，从句子第一个字到句末标点完整摘录", "comment": "50-70字批注，锐利、具体地谈这一句的修辞、意象、节奏得失，不要空泛的褒贬" }
  ]
}

严格要求：
1. textOverview / literaryAnalysis / comparison / conclusion 四段缺一不可，全部写成自然的完整段落，按顺序连起来就是一段连贯的、面向作者的 MBTI 式共情解读，禁止使用 1. 2. 3. 等序号、分点符号或任何小标题（如'文本概览：''硬伤：'等），段落内容本身也不要出现'概览''评析''硬伤'之类的栏目词
2. styleColor 必须是合法的六位十六进制色号；toneMetaphor 必须是'（形容词）的（名词）'格式
3. annotations 数组必须【正好 ${annoCount} 项】，绝对不能多——每项对应原文中约一个 400 字片段里最高光的那一句，每项约 50-70 字，多写会挤占输出预算导致前面字段截断，输出预算有限，请务必只写 ${annoCount} 项
4. 每条 annotations 的 quote 必须从正文中【逐字完整摘录】一个【完整的句子】：从句子第一个字开始，到句号/问号/感叹号/省略号等句末标点为止（含句末标点）。绝不能改写、删减、截取半句、拼接或凭空编造；若原文里实在找不到完整的第 ${annoCount} 句，就挑一句真正存在的最短的完整句子，宁可句子短，不可编造
5. authors 数组必须【正好 3 项】，且每位都严格出自上面的作家清单，work 必须是该作家真实存在的代表作；reason 必须是一句具体的、结合本文特点的相似理由（说明风格/笔法/题材上哪里像），禁止空话套话，禁止从清单外编造；similarity 必须是 0-100 之间的整数，表示该作家风格与本文的相似度占比（第一、二、三位依次递减，通常 35-40/25-30/15-20 这一档），且三位之和必须小于 100（代表不同维度的占比）；【重要】三位中至少有一位必须是清单中的外国作家（非中国作家，如托尔斯泰、川端康成、卡夫卡、海明威、村上春树等），不要三位全是中国人
6. tone 只能是 melancholy(清冷忧郁)、passionate(热烈激情)、serene(宁静平和)、mysterious(神秘幽微)、humorous(幽默诙谐) 之一
7. scores 的五个分项与 total 都必须是 0-100 之间的整数，且必须严格对照评分标准与你的评语来给，禁止一律给高分
8. masterpiece.isMasterpiece 必须只凭正文文风与内容判断，绝不参考标题与作者名；只要有一丝不确定就不判为 true（宁缺毋滥）；writer 只有在确凿且存在于作家清单时才有值，否则一律 null
9. 只输出这一个 JSON 对象，禁止复述作家清单，禁止任何清单之外的解释文字`
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

function normalizeAuthors(parsed, forcedWriter = null) {
  const candidates = Array.isArray(parsed?.authors) ? parsed.authors : []
  const result = []
  const used = new Set()

  // 名著识别命中：作者必须位列第一（最相似），不允许模型漏掉或排到后面
  if (forcedWriter && WRITERS.some((w) => w.name === forcedWriter.name)) {
    used.add(forcedWriter.name)
    result.push({
      name: forcedWriter.name,
      work: forcedWriter.work,
      work2: forcedWriter.work2,
      reason: '这是本文对应的经典名篇作者，笔法与风格天然一脉相承，相似度最高。',
      similarity: 92,
    })
  }

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
  result.sort((a, b) => b.similarity - a.similarity)
  // 有名篇强制作者时：其意义是"这位作者与本文一脉相承、居首"，不再套用普通文本的
  // "三位占比总和 < 100"约束，只保证强制作者保持第一且其余两位严格低于它
  const forcedIdx = forcedWriter ? result.findIndex((x) => x.name === forcedWriter.name) : -1
  if (forcedIdx >= 0) {
    result.forEach((x, i) => {
      if (i !== forcedIdx && x.similarity >= result[forcedIdx].similarity) {
        x.similarity = Math.max(1, result[forcedIdx].similarity - 10)
      }
    })
    result.sort((a, b) => b.similarity - a.similarity)
  } else {
    const total = result.reduce((sum, x) => sum + x.similarity, 0)
    if (total >= 100) {
      const scale = 95 / total
      result.forEach((x) => { x.similarity = Math.max(1, Math.round(x.similarity * scale)) })
      // 缩放后仍保持严格降序
      result.sort((a, b) => b.similarity - a.similarity)
    }
  }

  // 保证三位里至少有一位外国作家：若全是中国人，把相似度最低的一位换成外国作家
  if (result.length >= 3 && !result.some((x) => FOREIGN_NAMES.has(x.name))) {
    const pool = WRITERS.filter((w) => FOREIGN_NAMES.has(w.name) && !used.has(w.name))
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

  const authors = normalizeAuthors(parsed, opts?.masterpieceWriter || null)

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

  // 评分：同文同分（确定性）。完全由文本启发式计算得出，不随 AI 输出波动；
  // 识别为经典名篇时强制高位，保证名著不会得到与其地位不符的低分
  const { radar, score } = finalizeScores(computed, !!opts.masterpiece)

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
    console.error('XFYUN API Error:', response.status, msg)
    const err = new Error(`AI 服务返回：${msg}`)
    err.status = response.status
    err.retryable = response.status >= 500 || response.status === 429
    throw err
  }
  if (!response.ok) {
    console.error('XFYUN API Error:', response.status, text)
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
}

// 模型输出完全无法解析时的兜底：基于文本启发式生成一份可用解读，保证用户总能看到结果
function buildHeuristicReview(content, title, author, masterpiece = false) {
  const computed = computeRadar(content)
  const { radar, score } = finalizeScores(computed, !!(masterpiece && masterpiece.detected))
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
  const authors = normalizeAuthors({ authors: [] }, masterpiece?.writer || null)
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
  const prompt = `请为下面的文章续写一段文字。要求：
- 至少 300 字，尽量写到 350-500 字
- 风格、语气、节奏与原文完全一致，延续原文的人物、场景与情绪脉络，像同一支笔接着写下去
- 内容要扎实有推进，有新的细节与起伏，不要空泛抒情、不要机械复读、不要写总结或收尾
- 只输出续写正文本身，不要任何解释、标题或引号

文章标题：《${title || '未命名'}》
作者：${author || '佚名'}
正文：
${content}

续写：`
  try {
    const raw = await callXfyun(prompt, 0.6)
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
    const serverDetect = detectMasterpiece({ title, author, content })
    const prompt = buildPrompt({ content, title, author, annoCount, masterpiece: serverDetect.detected, masterpieceWriter: serverDetect.writer })

    // 低温度优先（保证评分稳定），最多尝试 3 次不同的温度与温度抖动
    const attempts = [0.35, 0.2, 0.5]
    let rawContent = ''
    let parsed = null
    for (const t of attempts) {
      try {
        rawContent = await callXfyun(prompt, t)
        parsed = extractJson(rawContent)
        if (parsed) break
      } catch (err) {
        console.error('Review attempt failed (temp=' + t + '):', err.message)
        // 服务端/业务错误（如 3000 之类的瞬时错误）也会重试；明确的配置类错误（401/403）直接抛出
        if (!err.message.includes('JSON') && !err.retryable) throw err
      }
    }

    if (!parsed) {
      // 完全无法解析：退化为基于文本的启发式解读，保证用户总能拿到结果
      console.error('All parsing attempts failed, using heuristic fallback')
      return new Response(JSON.stringify(buildHeuristicReview(content, title, author, serverDetect)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 名著判定以模型凭正文文风的自判为主，服务端指纹/元信息兜底
    const masterpiece = mergeMasterpiece(parsed?.masterpiece, serverDetect)
    const result = normalizeReview(parsed, content, { masterpiece: masterpiece.detected, masterpieceWriter: masterpiece.writer })

    // 续写未达到 300-500 字时，用一次专门调用补齐，保证续写够长、够有推进
    let finalResult = result
    if (!result.continuation || String(result.continuation).length < 250) {
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
