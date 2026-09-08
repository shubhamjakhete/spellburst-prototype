import { readFileSync } from 'node:fs'

const results = JSON.parse(
  readFileSync(new URL('../src/eval/results.json', import.meta.url), 'utf8'),
)
const cases = [
  [1, 'movement'],
  [2, 'colour'],
  [3, 'movement'],
  [4, 'colour'],
  [5, 'movement'],
  [6, 'colour'],
  [7, 'movement'],
  [8, 'colour'],
  [9, 'movement'],
  [10, 'colour'],
  [11, 'movement'],
  [12, 'colour'],
]

function score(caseId, condition) {
  const rows = results.part1.filter(
    (t) => t.caseId === caseId && t.condition === condition,
  )
  return rows.filter((t) => t.call === 'changed').length
}

console.log('| # | property | drift, not asked | drift, asked | gap |')
console.log('|---|---|---|---|---|')
let not = 0
let asked = 0
for (const [id, property] of cases) {
  const a = score(id, 'not-asked')
  const b = score(id, 'asked')
  not += a
  asked += b
  console.log(`| ${id} | ${property} | ${a}/5 | ${b}/5 | ${a - b} |`)
}
console.log()
console.log(`**Overall drift without asking:** ${not} / 60`)
console.log(`**Overall drift when asked:** ${asked} / 60`)
console.log()

function jaccard(left, right) {
  const a = new Set(left)
  const b = new Set(right)
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  let shared = 0
  for (const name of a) if (b.has(name)) shared += 1
  return shared / union.size
}

function meanOverlap(records) {
  let total = 0
  let pairs = 0
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      total += jaccard(records[i].change, records[j].change)
      pairs += 1
    }
  }
  return pairs === 0 ? 0 : total / pairs
}

function oppositeConflict(records) {
  const calmer = records.find((r) => r.request.includes('calmer'))
  const chaotic = records.find((r) => r.request.includes('chaotic'))
  if (!calmer || !chaotic || calmer.error || chaotic.error) return 'n/a'
  return jaccard(calmer.change, chaotic.change) === 0 ? 'yes' : 'no'
}

const sketches = [...new Set(results.part2.map((r) => r.sketchId))]
console.log('| sketch | mean overlap across 7 requests | calmer vs chaotic conflict? |')
console.log('|---|---|---|')
for (const id of sketches) {
  const rows = results.part2.filter((r) => r.sketchId === id)
  console.log(
    `| ${id} | ${meanOverlap(rows).toFixed(2)} | ${oppositeConflict(rows)} |`,
  )
}

console.log()
console.log('| sketch | motion expected | motion measured | colour expected | colour measured |')
console.log('|---|---|---|---|---|')
for (const row of results.part3) {
  console.log(
    `| ${row.title} | ${row.motionExpected} | ${row.motionMeasured.toFixed(4)} (${row.motionClass}) | ${row.colourExpected} | ${row.colourMeasured} |`,
  )
}

console.log()
console.log('started', results.started)
console.log('finished', results.finished)
console.log('apply', results.applyCalls, 'plan', results.planCalls)
