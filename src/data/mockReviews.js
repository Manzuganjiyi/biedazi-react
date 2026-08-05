// ==================== 调性颜色映射 ====================
export const TONE_COLORS = {
  melancholy: '#A8C4D0',
  passionate: '#D4A8A8',
  serene: '#A8D4B8',
  mysterious: '#C4A8D4',
  humorous: '#D4C8A0',
  default: '#FAF9F6',
}

export const THINKING_STEPS = [
  '正在分析句式结构...',
  '正在检索相似作家...',
  '正在提取高光句子...',
  '正在撰写批注...',
  '正在生成总评...',
]

// ==================== 调用真实 AI（讯飞星辰 MaaS 免费 Qwen 模型）====================
export async function analyzeTextAPI(text, title = '', author = '') {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, title, author }),
  })

  if (!response.ok) {
    let message = 'AI 分析失败'
    let details = ''
    try {
      const error = await response.json()
      message = error.error || message
      details = error.details || ''
    } catch {
      // ignore parse errors, keep default message
    }
    const e = new Error(message)
    e.details = details
    throw e
  }

  return response.json()
}
