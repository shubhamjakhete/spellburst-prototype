/**
 * Drives the eval in a real browser and writes src/eval/results.json after
 * every trial. Resume-safe: already-recorded trials are skipped.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/tmp/sbqa/package.json')
const { chromium } = require('playwright-core')

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const OUT = `${ROOT}/src/eval/results.json`
const BASE = (process.env.BASE ?? 'http://localhost:3000') + '/?k=demo-96f8d08a2e02ec20'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const REPS = 5

function load() {
  if (!existsSync(OUT)) {
    return {
      started: new Date().toISOString(),
      finished: '',
      model: 'claude-sonnet-5',
      applyCalls: 0,
      planCalls: 0,
      part1: [],
      part2: [],
      part3: [],
    }
  }
  return JSON.parse(readFileSync(OUT, 'utf8'))
}

function save(data) {
  writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n')
}

const have = (results, caseId, condition, rep) =>
  results.part1.some(
    (t) => t.caseId === caseId && t.condition === condition && t.rep === rep,
  )

const havePlan = (results, sketchId, request) =>
  results.part2.some((t) => t.sketchId === sketchId && t.request === request)

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
await page.goto(BASE, { waitUntil: 'networkidle' })

const results = load()
if (!results.started) results.started = new Date().toISOString()
save(results)

const meta = await page.evaluate(async () => {
  const { EVAL_CASES, PLAN_REQUESTS, BASE_SKETCHES, measureBases, runSanity } =
    await import('/src/eval/run.ts')
  window.__evalBefores = await measureBases()
  const part3 = await runSanity()
  return {
    cases: EVAL_CASES,
    requests: [...PLAN_REQUESTS],
    sketches: BASE_SKETCHES.map((s) => s.id),
    part3,
  }
})

if (results.part3.length === 0) {
  results.part3 = meta.part3
  save(results)
  console.log('part3 sanity written', meta.part3.map((r) => `${r.sketchId}:${r.motionPass && r.colourPass ? 'ok' : 'FAIL'}`).join(' '))
}

// Re-measure bases inside each trial from the frozen code; we only pass ids.
const jobs = []
for (const item of meta.cases) {
  for (const condition of ['not-asked', 'asked']) {
    for (let rep = 1; rep <= REPS; rep++) {
      jobs.push({ caseId: item.id, condition, rep, sketchId: item.sketchId })
    }
  }
}

console.log(`part1 ${results.part1.length}/${jobs.length} already done`)

for (const job of jobs) {
  if (have(results, job.caseId, job.condition, job.rep)) continue

  const trial = await page.evaluate(async (job) => {
    const { EVAL_CASES, runPreservationTrial } = await import('/src/eval/run.ts')
    const item = EVAL_CASES.find((c) => c.id === job.caseId)
    return runPreservationTrial(
      item,
      job.condition,
      job.rep,
      window.__evalBefores[item.sketchId],
    )
  }, job)

  results.part1.push(trial)
  results.applyCalls += 1
  save(results)
  const mark = trial.error ? 'ERR' : trial.call
  console.log(
    `p1 ${results.part1.length}/${jobs.length}  case ${job.caseId} ${job.condition} #${job.rep}  ${mark}  ${trial.detail || trial.error || ''}`,
  )
}

const planJobs = []
for (const sketchId of meta.sketches) {
  for (const request of meta.requests) {
    planJobs.push({ sketchId, request })
  }
}

console.log(`part2 ${results.part2.length}/${planJobs.length} already done`)

for (const job of planJobs) {
  if (havePlan(results, job.sketchId, job.request)) continue
  const record = await page.evaluate(async (job) => {
    const { runPlanRecord } = await import('/src/eval/run.ts')
    return runPlanRecord(job.sketchId, job.request)
  }, job)
  results.part2.push(record)
  results.planCalls += 1
  save(results)
  console.log(
    `p2 ${results.part2.length}/${planJobs.length}  ${job.sketchId} · ${job.request}  ${record.error ?? record.change.join(', ')}`,
  )
}

results.finished = new Date().toISOString()
save(results)
console.log('done', results.started, '→', results.finished)
await browser.close()
