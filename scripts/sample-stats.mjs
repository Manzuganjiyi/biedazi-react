import { AUTHOR_SAMPLES } from '../api/data/authorSamples.js'
const s = Object.entries(AUTHOR_SAMPLES).map(([n, a]) => ({ n, c: a.join('').length })).sort((x, y) => x.c - y.c)
for (const x of s.filter((x) => x.c < 160)) console.log(x.c, x.n)
