import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const envExample = path.join(cwd, '.env.example')
const docs = [
  'docs/release/FRONTEND_RELEASE_HANDOFF.md',
  'docs/release/SPA_FALLBACK_EXAMPLES.md',
  'docs/release/PRODUCTION_SMOKE_TEST.md',
]

const checks = []
checks.push({ label: '.env.example present', pass: fs.existsSync(envExample) })
for (const doc of docs) {
  checks.push({ label: `${doc} present`, pass: fs.existsSync(path.join(cwd, doc)) })
}

const failed = checks.filter((item) => !item.pass)
for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}: ${item.label}`)
}

if (failed.length) {
  process.exitCode = 1
} else {
  console.log('GyneCRM frontend release config handoff files are present.')
}
