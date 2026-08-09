// ==================== 用户文本 → 分层标签（本地规则海选）====================
// 不调用模型：把用户文本按 STYLE_DIMENSIONS 七大维度映射成标签集，
// 供海选在作者风格网络中取最近邻（top6）。规则只求"方向大致对"，
// 精判由 2B 模型只看 6 位候选完成，因此这里故意宽松、多命中，避免误杀真相关作家。
import { ALL_WRITTEN, FOREIGN_NAMES, hierarchicalSimilarity } from './writers.js'

// 各维度的触发词（标签 → 命中即计一次；用文本子串匹配）
const THEME_WORDS = {
  乡土: ['村庄', '田野', '庄稼', '麦子', '稻', '院子', '外婆', '奶奶', '爷', '炊烟', '田埂', '村子', '牛羊', '麦田', '黄土', '老乡'],
  都市: ['城市', '地铁', '写字楼', '咖啡', '酒吧', '公寓', '街头', '霓虹', '公交', '上班', '加班', '都市', '深夜的街道'],
  战争: ['战争', '战场', '枪', '炮', '牺牲', '战士', '硝烟', '军队', '战火', '兵', '阵地'],
  家庭: ['母亲', '父亲', '妻子', '丈夫', '孩子', '爹', '娘', '奶奶', '爷爷', '兄妹', '弟弟', '妹妹', '哥哥', '姐姐', '一家', '家'],
  心理: ['心里', '内心', '想起', '回忆', '梦', '意识', '念头', '思绪', '脑海', '心头', '默默', '想着'],
  自然: ['山', '水', '树', '花', '草', '云', '月', '风', '雨', '雪', '江', '河', '湖', '海', '林', '雾', '天空', '田野', '溪'],
  哲思: ['生命', '死亡', '存在', '时间', '意义', '虚无', '宇宙', '命运', '永恒', '灵魂', '人生', '世界'],
  底层: ['穷人', '辛苦', '打工', '失业', '苦难', '挨饿', '糊口', '劳累', '苦力', '破旧', '简陋'],
  爱情: ['爱', '恋', '吻', '思念', '情书', '恋慕', '情人', '约会', '心动', '缠绵'],
  市井: ['巷', '街', '摊', '买卖', '饭馆', '茶馆', '小店', '集市', '吆喝', '铺子', '胡同'],
  历史: ['历史', '朝代', '王朝', '皇帝', '年代', '古人', '沧桑'],
  政治: ['政治', '体制', '权力', '国家', '革命', '秩序', '制度'],
}

const TONE_WORDS = {
  冷: ['冷', '寒', '凉', '霜', '冰', '苍白', '寂静', '清冷', '寒意'],
  暖: ['暖', '温', '阳光', '温柔', '温暖', '柔光', '热乎'],
  冲淡: ['淡', '素', '静', '闲', '微', '轻', '缓缓', '淡淡', '幽幽'],
  沉郁: ['沉', '郁', '深', '暗', '重', '压', '灰暗', '凝重', '低沉'],
  炽烈: ['炽', '烈', '燃', '火', '热', '狂', '沸腾', '燃烧', '滚烫'],
  苍凉: ['苍凉', '荒凉', '凋', '残', '破败', '萧瑟', '苍茫', '凄清'],
  诙谐: ['笑', '滑稽', '调侃', '幽默', '逗', '打趣', '好笑', '逗趣'],
  悲悯: ['悲', '悯', '怜', '叹', '怜惜', '哀', '恻隐'],
  荒诞: ['荒诞', '荒谬', '怪', '莫名', '离奇', '荒唐', '诡异'],
  孤独: ['孤', '独', '一个人', '寂寞', '无人', '独自', '孤单'],
  感伤: ['伤', '忧', '怅', '惘', '泪', '愁', '叹息', '怅惘', '忧伤', '惆怅'],
  怪诞: ['诡异', '怪诞', '森然', '魇', '悚然'],
}

const IMAGE_WORDS = {
  物哀: ['落花', '凋零', '残雪', '枯', '逝', '易逝', '飘零', '残月'],
  荒原感: ['荒原', '旷野', '沙漠', '荒芜', '孤岛', '戈壁', '废墟'],
  市井烟火: ['炊烟', '饭', '菜', '灶', '茶', '集市', '烟火气', '饭菜'],
  山林水泽: ['山', '林', '溪', '河', '湖', '泉', '雾', '雨', '云', '江', '水'],
  宗教灵性: ['神', '佛', '禅', '灵魂', '灵', '修行', '祈祷', '信仰'],
  魔幻: ['魔', '鬼', '幻', '妖', '梦境', '神怪', '咒语', '幻象'],
  孤绝: ['孤峰', '绝壁', '荒漠', '旷野', '独', '寒星', '断崖'],
}

const LANG_WORDS = {
  华丽: ['仿佛', '如同', '宛如', '好像', '晶莹', '璀璨', '绚烂', '旖旎', '流光', '斑斓'],
  口语化: ['吧', '呢', '嘛', '呀', '哈', '嘿嘿', '嘻嘻', '哥们', '咱们', '挺'],
  文言气: ['之乎', '者也', '矣', '焉', '哉', '余', '吾', '何以', '若夫'],
  智性反讽: ['不过', '但是', '难道', '究竟', '讽刺', '可笑', '所谓', '偏偏'],
  抒情: ['啊', '呀', '呵', '愿', '亲爱的', '多美', '多么'],
  细腻: ['一丝', '一缕', '微微', '细细', '轻轻', '缓缓', '慢慢', '一点点'],
}

const STRUCT_WORDS = {
  散文化: ['后来', '记得', '于是', '那时候', '如今', '想起', '仿佛看见'],
  戏剧化: ['他说', '她说', '问道', '笑道', '喊道', '对话', '说道'],
  意识流: ['忽然', '恍惚', '闪回', '脑海', '飘', '游离', '意识'],
  寓言化: ['寓言', '象征', '影子', '镜子', '寓言般', '仿佛说的'],
  现实批判: ['现实', '社会', '应该', '必须', '问题', '批判', '这样的'],
  心理独白: ['我想', '我心里', '我知道', '我明白', '我问自己'],
  传奇化: ['传奇', '故事', '传说', '奇人', '世外', '江湖'],
  自白: ['坦白', '忏悔', '我承认'],
}

function countHits(text, words) {
  let hits = 0
  for (const w of words) {
    if (text.includes(w)) hits++
  }
  return hits
}

// 取文本中命中数最多的标签；命中数同最多则都保留（宽松多命中）
function pickTags(text, table) {
  const scored = []
  for (const [tag, words] of Object.entries(table)) {
    const hits = countHits(text, words)
    if (hits > 0) scored.push({ tag, hits })
  }
  scored.sort((a, b) => b.hits - a.hits)
  if (!scored.length) return []
  const max = scored[0].hits
  return scored.filter((s) => s.hits >= Math.max(1, max - 1)).map((s) => s.tag)
}

// 主入口：文本 → 分层标签集（词表内）
export function tagUserText(text) {
  const t = String(text || '').replace(/\s+/g, '')
  if (!t.length) return []

  const tags = new Set()

  // 句法节奏：按平均句长 + 起伏度粗判
  const sentences = String(text || '').split(/[。！？；!?;…]/).map((s) => s.trim()).filter(Boolean)
  const lens = sentences.map((s) => s.length)
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0
  const sd = lens.length > 1 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0
  if (mean <= 18) tags.add('短句')
  else if (mean >= 40) tags.add('长句')
  else tags.add('平缓')
  if (sd >= 16) tags.add('起伏大')
  else tags.add('平缓')

  // 语言质地 / 情感基调 / 题材 / 意象 / 叙事结构：关键词表宽松多命中
  for (const tag of pickTags(t, LANG_WORDS)) tags.add(tag)
  for (const tag of pickTags(t, TONE_WORDS)) tags.add(tag)
  for (const tag of pickTags(t, THEME_WORDS)) tags.add(tag)
  for (const tag of pickTags(t, IMAGE_WORDS)) tags.add(tag)
  for (const tag of pickTags(t, STRUCT_WORDS)) tags.add(tag)

  return [...tags]
}

// 海选：在 120 位作者网络中返回距离最近的前 N 位候选。
// 输入 userTags 是模型对用户文本打出的分层标签（七大维度的词表内标签集合）；
// 海选逻辑本身是纯本地网络计算，不调用模型。
// 按相似度从高到低取全局 top n；仅当 top n 全是同国籍（全中或全外）时，
// 用另一国籍中 score 最高的一位替换掉最低的一位，保证中外混合。
export function rankCandidates(userTags, n = 6) {
  const scored = ALL_WRITTEN.map((w) => {
    const r = hierarchicalSimilarity(userTags, w.tags)
    return {
      name: w.name,
      work: w.work,
      work2: w.work2,
      dna: w.dna,
      tags: w.tags,
      foreign: FOREIGN_NAMES.has(w.name),
      score: r.score,
    }
  })

  const byScore = (arr) => [...arr].sort((a, b) => b.score - a.score)
  let pool = byScore(scored).slice(0, n)
  const hasCn = pool.some((s) => !s.foreign)
  const hasFr = pool.some((s) => s.foreign)
  if (n > 1 && (!hasCn || !hasFr)) {
    const pickFrom = !hasCn
      ? byScore(scored.filter((s) => !s.foreign))[0]
      : byScore(scored.filter((s) => s.foreign))[0]
    pool[pool.length - 1] = pickFrom
    pool = byScore(pool)
  }
  return {
    userTags,
    candidates: pool.slice(0, n),
  }
}
