import { ALL_WRITTEN } from '../api/writers.js'
import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'

const inLibrary = new Set(ALL_WRITTEN.map((w) => w.name))
const sampled = new Set(Object.keys(AUTHOR_SAMPLES))

const missing = [...inLibrary].filter((n) => !sampled.has(n))
const extra = [...sampled].filter((n) => !inLibrary.has(n))

console.log('ALL_WRITTEN count:', inLibrary.size)
console.log('AUTHOR_SAMPLES count:', sampled.size)
console.log('missing from samples:', missing.length ? missing.join(', ') : '(none)')
console.log('sampled but not in library:', extra.length ? extra.join(', ') : '(none)')

let totalChars = 0
let minAuthor = ''
let minChars = Infinity
for (const [n, arr] of Object.entries(AUTHOR_SAMPLES)) {
  const chars = arr.join('').length
  totalChars += chars
  if (chars < minChars) { minChars = chars; minAuthor = n }
}
console.log('total sample chars:', totalChars)
console.log('smallest author:', minAuthor, minChars, 'chars')
