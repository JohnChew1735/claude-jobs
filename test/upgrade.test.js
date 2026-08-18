// `run.sh` is generated once, at init, and a job keeps the copy it was born
// with. So every fix that lands in templates/run.sh reaches existing jobs only
// through `claude-jobs install <name>`, which calls writeRunner before handing
// the job to the scheduler. That makes writeRunner the upgrade path, and these
// cases pin the two things an upgrade depends on:
//
//   1. a job.json written by an older version — one that has never heard of a
//      field the current runner renders — still produces a complete runner,
//      with no surviving placeholder;
//   2. the value it falls back to is the documented default, not an empty
//      string or an undefined that reaches bash as a syntax error.
//
// Both are exercised by real jobs and by nothing else in the suite: the
// rotation tests call renderTemplate with an explicit cap, so the
// `job.logMaxBytes === undefined` branch of writeRunner has no cover.
import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_LOG_MAX_BYTES, buildJob, writeRunner } from '../src/commands.js'
import { ensureDirs, logFile, runnerFile, writeJob } from '../src/paths.js'

/** The runner is bash; the case that executes it needs one. */
const needsBash = (() => {
  try {
    execFileSync('bash', ['-c', 'exit 0'], { stdio: 'ignore' })
    return false
  } catch (error) {
    return error.code === 'ENOENT' ? 'no bash on PATH' : false
  }
})()

/**
 * Redirects CLAUDE_JOBS_HOME for the duration of a synchronous callback.
 *
 * Synchronous on purpose: an async body would get its home restored and its
 * temp directory deleted the moment it yielded, and would then resolve paths
 * against the real ~/.claude-jobs without failing. Keep the callbacks here
 * synchronous, or fix that first (#28).
 */
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'claude-jobs-upgrade-'))
  const prev = process.env.CLAUDE_JOBS_HOME
  process.env.CLAUDE_JOBS_HOME = home
  try {
    return fn(home)
  } finally {
    if (prev === undefined) delete process.env.CLAUDE_JOBS_HOME
    else process.env.CLAUDE_JOBS_HOME = prev
    rmSync(home, { recursive: true, force: true })
  }
}

/** A job.json as an older version would have written it: no `logMaxBytes`. */
function legacyJob(name) {
  const job = buildJob(name, { task: 'hi', scheduler: 'cron' })
  delete job.logMaxBytes
  return job
}

test('a job.json from before --log-max-bytes existed renders the documented default', () => {
  withHome(() => {
    ensureDirs()
    const job = legacyJob('legacy')
    assert.equal('logMaxBytes' in job, false, 'the fixture must not carry the field')

    writeJob('legacy', job)
    writeRunner(job)

    const script = readFileSync(runnerFile('legacy'), 'utf8')
    assert.match(script, new RegExp(`^LOG_MAX_BYTES=${DEFAULT_LOG_MAX_BYTES}$`, 'm'))
  })
})

test('a regenerated legacy job actually rotates when it runs', { skip: needsBash }, () => {
  withHome(() => {
    ensureDirs()
    // The text of the rendered line is not the whole claim. `LOG_MAX_BYTES`
    // reaches bash as an operand of `-gt`, so a fallback that renders anything
    // other than an integer — `undefined`, an empty string — passes a regex on
    // the value and then fails at run time, on a schedule, in a log nobody is
    // watching. This runs the shipped script.
    const job = legacyJob('legacy')
    job.claudeBin = '/bin/echo'
    writeJob('legacy', job)
    writeRunner(job)

    writeFileSync(logFile('legacy'), 'x'.repeat(DEFAULT_LOG_MAX_BYTES + 1))
    execFileSync('bash', [runnerFile('legacy'), '--now'], { stdio: 'ignore' })

    assert.ok(existsSync(`${logFile('legacy')}.1`), 'oversize log should have been rotated')
    const fresh = readFileSync(logFile('legacy'), 'utf8')
    assert.match(fresh, /rotated previous log \(\d+ bytes >= \d+\)/)
    assert.match(fresh, /=== session start ===/)
  })
})

test('a job that recorded 0 keeps 0 when its runner is regenerated', () => {
  withHome(() => {
    ensureDirs()
    // The upgrade must not read an explicit "off" as an absent field: 0 is
    // falsy, so a `job.logMaxBytes || DEFAULT` would silently switch rotation
    // on for someone who turned it off on purpose.
    const job = buildJob('off', { task: 'hi', scheduler: 'cron', 'log-max-bytes': '0' })
    assert.equal(job.logMaxBytes, 0)

    writeJob('off', job)
    writeRunner(job)

    assert.match(readFileSync(runnerFile('off'), 'utf8'), /^LOG_MAX_BYTES=0$/m)
  })
})
