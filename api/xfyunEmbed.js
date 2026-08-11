// ==================== 讯飞开放平台 Embedding 客户端（llm embedding 协议）====================
// 鉴权：HMAC-SHA256 签名（appid + APIKey + APISecret），authorization 拼进 URL query。
// 请求：POST https://emb-cn-huabei-1.xf-yun.com/
// 返回：payload.feature.text 是 base64 编码的 float32（小端）数组，默认 2560 维。
// ENV：EMB_APP_ID / EMB_API_KEY / EMB_API_SECRET 必填；
//      EMB_DOMAIN 默认 para（作者样本=原文段落向量化；与运行时查询必须同域可比），
//      EMB_HOST 默认 emb-cn-huabei-1.xf-yun.com
// 签名用 Web Crypto API（crypto.subtle），兼容 Vercel Edge Runtime（不用 node:crypto/Buffer）。

export const EMB_HOST = process.env.EMB_HOST || 'emb-cn-huabei-1.xf-yun.com'
export const EMB_DOMAIN = process.env.EMB_DOMAIN || 'para'

export const embedReady = () => {
  const ok = process.env.EMB_APP_ID && process.env.EMB_API_KEY && process.env.EMB_API_SECRET
  if (!ok) console.error('[xfyunEmbed] 缺少 EMB_APP_ID/EMB_API_KEY/EMB_API_SECRET，embedding 不可用')
  return Boolean(ok)
}

const _b64u8 = (u8) => {
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  return btoa(bin)
}
const _b64str = (str) => _b64u8(new TextEncoder().encode(str))

async function buildSignedUrl() {
  const date = new Date().toUTCString()
  const tmp = `host: ${EMB_HOST}\ndate: ${date}\nPOST / HTTP/1.1`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.EMB_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(tmp))
  const signature = _b64u8(new Uint8Array(sigBuf))
  const authOrigin = `api_key="${process.env.EMB_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = _b64str(authOrigin)
  return `https://${EMB_HOST}/?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${EMB_HOST}`
}

// 文本 → 2560 维 float32 数组。失败抛错（code 等）。
export async function embedText(text, opts = {}) {
  const domain = opts.domain || EMB_DOMAIN
  const input = String(text || '')
  const inner = JSON.stringify({ messages: [{ content: input, role: 'user' }] })
  const body = JSON.stringify({
    header: { app_id: process.env.EMB_APP_ID, status: 3 },
    parameter: { emb: { domain, feature: { encoding: 'utf8', compress: 'raw', format: 'plain' } } },
    payload: {
      messages: { encoding: 'utf8', compress: 'raw', format: 'json', status: 3, text: _b64str(inner) },
    },
  })
  const resp = await fetch(await buildSignedUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const raw = await resp.text()
  let data = null
  try { data = JSON.parse(raw) } catch { data = null }
  const code = data?.header?.code
  const msg = data?.header?.message
  if (!resp.ok || code !== 0) {
    const err = new Error(`embedding 失败（http=${resp.status} code=${code} ${msg || raw.slice(0, 120)}）`)
    err.retryable = !data || typeof code !== 'number' || code !== 0
    throw err
  }
  const b64 = data?.payload?.feature?.text
  if (!b64) throw new Error('embedding 响应缺少 payload.feature.text')
  const bin = atob(b64)
  const len = bin.length
  const out = new Array(Math.floor(len / 4))
  const dv = new DataView(new ArrayBuffer(4))
  for (let i = 0; i < out.length; i++) {
    const o = i * 4
    dv.setUint8(0, bin.charCodeAt(o))
    dv.setUint8(1, bin.charCodeAt(o + 1))
    dv.setUint8(2, bin.charCodeAt(o + 2))
    dv.setUint8(3, bin.charCodeAt(o + 3))
    out[i] = dv.getFloat32(0, true)
  }
  return out
}
