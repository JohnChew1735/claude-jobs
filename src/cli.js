import {
  cmdDoctor,
  cmdInit,
  cmdInstall,
  cmdList,
  cmdLogs,
  cmdRun,
  cmdStatus,
  cmdUninstall,
} from './commands.js'

const USAGE = `claude-jobs — scheduled, unattended Claude Code CLI runs (no API key)

Usage:
  claude-jobs init <name> [options]   scaffold a job (prompt + runner + scheduler unit)
  claude-jobs list                    list jobs and whether they are scheduled
  claude-jobs run <name> [--now]      run a job now (--dry-run prints the plan)
  claude-jobs install <name>          register the job with the OS scheduler
  claude-jobs uninstall <name>        unregister it (--purge also deletes the files)
  claude-jobs logs <name> [--lines N] tail the job log
  claude-jobs status <name>           schedule, paths and the last summary
  claude-jobs doctor                  check the CLI, its login and the scheduler

init options:
  --skill <path>          file the agent should read and follow (SKILL.md, runbook, checklist)
  --task <text>           inline task instead of --skill
  --prompt-file <path>    use your own prompt template instead of the built-in one
  --at <HH:MM>            daily start time, 24-hour (default 09:00)
  --jitter <seconds>      random extra delay before starting (default 900, 0 disables)
  --workdir <path>        directory the run starts in (default: current directory)
  --scheduler <name>      launchd | systemd | cron (default: per platform)
  --claude <path>         claude binary (default: whatever is on PATH)
  --model <name>          pass --model to the CLI
  --permission-mode <m>   default bypassPermissions (unattended runs cannot answer prompts)
  --precheck <command>    shell command that must succeed before a session is spent
  --notify <command>      shell command that receives the summary in $CLAUDE_JOB_MESSAGE
  --path <PATH>           PATH exported inside the runner
  --force                 overwrite an existing job

Docs: https://github.com/vinhnguyenthanhdn/claude-jobs
`

export function parseArgs(argv) {
  const args = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      args.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true
    } else {
      flags[key] = next
      i += 1
    }
  }
  return { args, flags }
}

export async function main(argv) {
  const { args, flags } = parseArgs(argv)
  const command = args.shift()

  if (!command || flags.help || command === 'help') {
    console.log(USAGE)
    return
  }

  switch (command) {
    case 'init':
      return cmdInit(args, flags)
    case 'list':
      return cmdList()
    case 'run':
      return cmdRun(args, flags)
    case 'install':
      return cmdInstall(args)
    case 'uninstall':
      return cmdUninstall(args, flags)
    case 'logs':
      return cmdLogs(args, flags)
    case 'status':
      return cmdStatus(args)
    case 'doctor':
      return cmdDoctor()
    default:
      throw new Error(`unknown command "${command}". Run "claude-jobs help".`)
  }
}
