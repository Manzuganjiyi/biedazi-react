// ==================== 智谱 embedding-3 客户端 ====================
// 请求：POST https://open.bigmodel.cn/api/paas/v4/embeddings
// 返回：data[0].embedding 为 2048 维 float 数组。
// ENV：ZHIPU_API_KEY 必填（与对话模型共用）；
//      EMB_MODEL 默认 embedding-3（可选替换其他 embedding 模型）。
// 说明：原讯飞开放平台 Embedding（EMB_APP_ID/EMB_API_KEY/EMB_API_SECRET，
// domain=para）因服务不可用（licc failed）已停用，改用智谱 embedding-3。
// 建库脚本 build-embedding-vectors.mjs 与运行时 embedRank.js 均走本模块，
// 保证"建库向量空间"与"查询向量空间"一致。

export const EMB_MODEL = process.env.EMB_MODEL || 'embedding-3'

export const embedReady = () => {
  const ok = Boolean(process.env.ZHIPU_API_KEY)
  if (!ok) console.error('[zhipuEmbed] 缺少 ZHIPU_API_KEY，embedding 不可用')
  return ok
}

// 文本 → embedding 向量数组。失败抛错（含 http 状态与错误信息）。
export async function embedText(text, opts = {}) {
  const input = String(text || '')
  const model = opts.model || EMB_MODEL
  const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({ model, input }),
  })
  const raw = await resp.text()
  let data = null
  try { data = JSON.parse(raw) } catch { data = null }
  if (!resp.ok || !data?.data?.[0]?.embedding) {
    const err = new Error(`embedding 失败（http=${resp.status} ${JSON.stringify(data?.error || data?.msg || raw.slice(0, 120))}）`)
    err.retryable = resp.status >= 500 || resp.status === 429
    throw err
  }
  return data.data[0].embedding
}
