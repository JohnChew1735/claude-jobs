import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = fileURLToPath(new URL('../bin/claude-jobs.js', import.meta.url))

function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'claude-jobs-test-'))
  try {
    return fn(home)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

function cli(home, args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_JOBS_HOME: home, CLAUDE_JOBS_SCHEDULER: 'cron' },
  })
}

test('init scaffolds a runnable job and dry-run explains it without calling claude', () => {
  withHome((home) => {
    const out = cli(home, ['init', 'demo', '--task', 'Do the thing.', '--at', '09:30', '--jitter', '0'])
    assert.match(out, /Created job "demo"/)

    const job = JSON.parse(readFileSync(join(home, 'jobs', 'demo', 'job.json'), 'utf8'))
    assert.equal(job.hour, 9)
    assert.equal(job.minute, 30)
    assert.equal(job.permissionMode, 'bypassPermissions')

    const prompt = readFileSync(join(home, 'jobs', 'demo', 'prompt.md'), 'utf8')
    assert.match(prompt, /Do the thing\./)
    assert.match(prompt, /demo-summary\.md/)
    assert.ok(!prompt.includes('{{'), 'every placeholder should be resolved')

    const dry = cli(home, ['run', 'demo', '--dry-run'])
    assert.match(dry, /--permission-mode bypassPermissions/)
    assert.match(dry, /--output-format stream-json/)
    assert.match(dry, /Do the thing\./)
  })
})

test('list reports the job as not yet installed', () => {
  withHome((home) => {
    cli(home, ['init', 'demo', '--task', 'x'])
    const out = cli(home, ['list'])
    assert.match(out, /demo/)
    assert.match(out, /no/)
  })
})

test('init refuses to clobber an existing job without --force', () => {
  withHome((home) => {
    cli(home, ['init', 'demo', '--task', 'x'])
    assert.throws(() => cli(home, ['init', 'demo', '--task', 'y']), /already exists/)
    cli(home, ['init', 'demo', '--task', 'y', '--force'])
  })
})

test('a job name that would break a unit filename is rejected', () => {
  withHome((home) => {
    assert.throws(() => cli(home, ['init', 'Bad Name', '--task', 'x']), /invalid job name/)
  })
})
