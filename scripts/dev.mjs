// 同时启动前端 Vite 与本地 API 服务（dev-server 3000），Ctrl+C 一起退出
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(root, '..')

const procs = [
  spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], { cwd: projectRoot, stdio: 'inherit', shell: true }),
  spawn(process.execPath, [join(root, 'dev-server.mjs')], { cwd: projectRoot, stdio: 'inherit' }),
]

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const p of procs) {
    if (p && !p.killed) p.kill()
  }
  process.exit(code)
}

for (const p of procs) {
  p.on('error', (e) => console.error('[dev] 子进程错误:', e.message))
  p.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev] 子进程退出（code=${code}），正在关闭全部…`)
      shutdown(code)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
