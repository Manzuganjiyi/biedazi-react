import { createServer } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {
  console.warn('[dev-server] 未找到 .env 文件，请参考 .env.example 创建')
}

const { POST: handler } = await import('../api/review.js')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000')

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/api/review') {
    try {
      const chunks = []
      for await (const c of req) chunks.push(c)
      const body = Buffer.concat(chunks).toString('utf-8')

      const webReq = new Request(url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const webRes = await handler(webReq)
      res.writeHead(webRes.status, Object.fromEntries(webRes.headers))
      res.end(await webRes.text())
    } catch (e) {
      console.error('[dev-server] handler error:', e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '本地 API 服务错误', details: String((e && e.message) || e) }))
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(3000, () => {
  console.log('笔搭子本地 API 服务已启动: http://localhost:3000/api/review')
})
