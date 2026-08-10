#!/usr/bin/env node
/**
 * Point an OpenClaw gateway at your logged-in Claude Code CLI, so turns run on
 * your subscription and no API key appears in the config.
 *
 *   node apply-claude-cli-backend.mjs            # show the diff, change nothing
 *   node apply-claude-cli-backend.mjs --write    # back up, apply, verify
 *
 * Options:
 *   --model <name>    default claude-sonnet-5
 *   --config <path>   default ~/.openclaw/openclaw.json
 *   --claude <path>   default: whatever `command -v claude` resolves to
 *
 * Afterwards: `openclaw daemon restart`, then `openclaw models status`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1]
}

const WRITE = argv.includes('--write')
const MODEL = flag('model', 'claude-sonnet-5')
const CONFIG = flag('config', join(homedir(), '.openclaw', 'openclaw.json'))
const CLAUDE =
  flag('claude', null) ||
  spawnSync('/bin/sh', ['-c', 'command -v claude'], { encoding: 'utf8' }).stdout.trim() ||
  '/opt/homebrew/bin/claude'

const fail = (message) => {
  console.error(`error: ${message}`)
  process.exit(1)
}

if (!existsSync(CONFIG)) fail(`no OpenClaw config at ${CONFIG}. Pass --config <path>.`)
if (!existsSync(CLAUDE)) fail(`no claude binary at ${CLAUDE}. Install Claude Code or pass --claude <path>.`)

// The gateway may run as a service with a minimal PATH, so the backend gets an
// absolute path rather than a bare command name.
const auth = spawnSync(CLAUDE, ['auth', 'status'], { encoding: 'utf8' })
if (auth.status !== 0) fail('claude is not logged in on this host. Run "claude auth login" first.')

const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
const before = JSON.stringify(config, null, 2)

config.auth ??= {}
config.auth.profiles ??= {}
config.auth.profiles['anthropic:claude-cli'] = { provider: 'claude-cli', mode: 'oauth' }

config.agents ??= {}
config.agents.defaults ??= {}
const defaults = config.agents.defaults
defaults.model = { ...defaults.model, primary: `claude-cli/${MODEL}` }
defaults.cliBackends = { ...defaults.cliBackends, 'claude-cli': { command: CLAUDE } }
defaults.agentRuntime = { ...defaults.agentRuntime, id: 'claude-cli' }

// Any anthropic/* ref left in the allowlist is a live fallback to the direct
// API: one failed background task cascades onto it and the run dies on
// third-party usage limits instead of quietly staying on the subscription.
const existing = Object.keys(defaults.models || {})
const dropped = existing.filter((ref) => ref.startsWith('anthropic/'))
const kept = existing.filter((ref) => ref.startsWith('claude-cli/'))
defaults.models = Object.fromEntries(
  [...new Set([`claude-cli/${MODEL}`, ...kept])].map((ref) => [ref, defaults.models?.[ref] ?? {}]),
)

const after = JSON.stringify(config, null, 2)

if (before === after) {
  console.log('Already configured for the claude-cli backend — nothing to change.')
  process.exit(0)
}

console.log(`config   ${CONFIG}`)
console.log(`binary   ${CLAUDE}`)
console.log(`primary  claude-cli/${MODEL}`)
console.log(`models   ${Object.keys(defaults.models).join(', ')}`)
if (dropped.length) console.log(`removed  ${dropped.join(', ')} (direct-API refs)`)

if (!WRITE) {
  console.log('\nDry run. Re-run with --write to apply.')
  process.exit(0)
}

const backup = `${CONFIG}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`
copyFileSync(CONFIG, backup)
writeFileSync(CONFIG, `${after}\n`)
console.log(`\nBacked up to ${backup}`)
console.log('Applied. Next:')
console.log('  openclaw daemon restart')
console.log('  openclaw models status     # expect the claude-cli profile and an OAuth entry')

try {
  execFileSync('openclaw', ['models', 'status'], { stdio: 'inherit' })
} catch {
  console.log('\n(Could not run "openclaw models status" — run it yourself after restarting.)')
}
