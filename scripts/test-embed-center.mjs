import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { AUTHOR_EMBEDDINGS } from '../api/data/authorEmbeddings.js'
import { embedUserText, cosine } from '../api/embedRank.js'

const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const authors = AUTHOR_EMBEDDINGS.authors
const names = Object.keys(authors)
const DIM = AUTHOR_EMBEDDINGS.dim
const mean = new Array(DIM).fill(0)
for (const n of names) for (let i = 0; i < DIM; i++) mean[i] += authors[n][i]
for (let i = 0; i < DIM; i++) mean[i] /= names.length

const centered = {}
for (const n of names) centered[n] = authors[n].map((v, i) => v - mean[i])
const center = (v) => v.map((x, i) => x - mean[i])

const text = '夜很深了，窗外的光一盏一盏熄灭。她合上书，纸页的余温还贴着指尖，心里那一点点的叹息，随雨声落到天亮。'
const q = await embedUserText(text)
const qc = center(q)

const rank = (map) => Object.keys(map).map((n) => ({ name: n, score: cosine(q, map[n]) })).sort((a, b) => b.score - a.score)
const rankC = () => Object.keys(centered).map((n) => ({ name: n, score: cosine(qc, centered[n]) })).sort((a, b) => b.score - a.score)

const raw = rank(authors)
const cen = rankC()
console.log('原始 cosine  top8:')
raw.slice(0, 8).forEach((t, i) => console.log(`  ${i + 1}. ${t.name}  ${t.score.toFixed(4)}`))
console.log(`  分差 spread = ${(raw[0].score - raw[7].score).toFixed(4)}`)
console.log('去中心化后  top8:')
cen.slice(0, 8).forEach((t, i) => console.log(`  ${i + 1}. ${t.name}  ${t.score.toFixed(4)}`))
console.log(`  分差 spread = ${(cen[0].score - cen[7].score).toFixed(4)}`)
