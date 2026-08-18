// The version in `package.json` is what `npm install` resolves and what
// `claude-jobs --version` prints, and the newest released heading in
// CHANGELOG.md is what a reader takes as the shipped version. Nothing compared
// them, so a release could bump one and leave the other behind and every test
// would still pass. Same defect shape as beval.__version__ sitting at 0.0.1
// through two releases: a declared value nobody reads is a claim nobody checked.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('package.json', root)), 'utf8'))
const changelog = readFileSync(fileURLToPath(new URL('CHANGELOG.md', root)), 'utf8')

const releasedVersions = () => [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1])

test('CHANGELOG.md has at least one released heading', () => {
  assert.ok(
    releasedVersions().length > 0,
    'no `## [x.y.z]` heading in CHANGELOG.md, so this test can check nothing',
  )
})

test('package.json version matches the newest released heading', () => {
  assert.equal(pkg.version, releasedVersions()[0])
})
