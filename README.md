# claude-jobs

Scheduled, unattended [Claude Code](https://claude.com/claude-code) runs — driven by the CLI you already have logged in, so **no `ANTHROPIC_API_KEY` is involved**.

One command scaffolds the whole thing: a prompt, a hardened runner script, and a real scheduler entry (launchd, systemd or cron).

```bash
npx claude-jobs init morning-report \
  --skill ./playbooks/morning-report.md \
  --at 09:30 \
  --notify 'echo "$CLAUDE_JOB_MESSAGE" | mail -s "morning report" me@example.com'

npx claude-jobs run morning-report --dry-run   # see exactly what will happen
npx claude-jobs install morning-report          # hand it to the OS scheduler
```

If you have ever written the same `claude -p` wrapper script for the third time — the one with the explicit `PATH`, the random start delay, the summary file, the notifier — this is that script, generalized and tested.

## Why

Claude Code is a real product with a real login. On the machine where you are already signed in, `claude -p` is a legitimate, non-interactive way to run work on your subscription. What that leaves you missing is everything *around* the call: schedulers start with an empty environment, unattended agents must never stop to ask a question, and a run nobody watches needs to report its own outcome.

`claude-jobs` is the boring wrapper that gets those details right, so the interesting part stays in your prompt.

**Non-goals:** this does not proxy, resell or wrap your subscription as an API for other tools. It runs the official CLI, as you, on your own machine. See [docs/policy.md](docs/policy.md).

## Install

```bash
npm install -g claude-jobs   # or just use npx claude-jobs
claude-jobs doctor           # checks the binary, the login, and your scheduler
```

Requires Node 18.17+, Claude Code installed and logged in (`claude auth login`) **as the same user that will run the jobs**.

## Commands

| Command | What it does |
| --- | --- |
| `init <name>` | Scaffold prompt + runner + scheduler unit |
| `list` | Every job and whether it is actually scheduled |
| `run <name> [--now\|--dry-run]` | Run by hand — `--dry-run` prints the plan and the prompt |
| `install` / `uninstall <name>` | Register / unregister with launchd, systemd or cron |
| `logs <name> [--lines N]` | Tail the job log |
| `status <name>` | Schedule, paths, and the last summary the agent wrote |
| `doctor` | Binary, login, API-key leakage, scheduler detection |

Useful `init` flags: `--skill`, `--task`, `--prompt-file`, `--at HH:MM`, `--jitter`, `--workdir`, `--scheduler`, `--model`, `--precheck`, `--notify`, `--permission-mode`. Run `claude-jobs help` for the full list.

## What people run

A job earns its place when the work repeats, needs judgement rather than just a command, and produces something short enough to read over coffee. The five that pay off fastest:

- **Dependency and CVE triage.** Run the audit, then separate what actually reaches your code from what sits in a devDependency nothing calls, and open a PR for the safe patch bumps. The sorting is the value — listing every advisory is what you already ignore.
- **Morning error triage.** Read overnight errors, group them, and say which ones deserve attention. A dashboard counts them; this one interprets them.
- **CI flake triage.** Read the day's failed runs, group by cause, name the tests that failed for reasons unrelated to the change. A week of this gives you a ranked flake list instead of a feeling.
- **Docs drift.** Compare the docs against the code and open a PR for what diverged — renamed flags, examples that no longer run. Nobody wants this job; an agent never gets bored of it.
- **A digest with your taste in it.** Read the sources you chose and keep only what touches what you are working on now. The filter is what makes it different from an RSS reader.

```bash
claude-jobs init dep-triage --skill ~/playbooks/deps.md --at 02:30 \
  --workdir ~/src/api \
  --precheck 'git -C ~/src/api fetch --quiet' \
  --notify 'gh issue comment 42 --body "$CLAUDE_JOB_MESSAGE"'
```

More ideas — release notes, issue triage, cost anomalies, backup verification, competitor watch — plus the jobs that are a bad fit and why: [docs/use-case-ideas.md](docs/use-case-ideas.md).

## What a job looks like on disk

```
~/.claude-jobs/
├── jobs/<name>/job.json      # the declaration
├── jobs/<name>/prompt.md     # what the agent is told — edit this freely
├── jobs/<name>/run.sh        # generated runner, yours to modify
├── logs/<name>.log           # stream-json, every step as it happens
└── state/<name>-summary.md   # the agent's own report, written last
```

Nothing is hidden in a database. Delete the directory and the job is gone.

## The decisions baked into the runner

These are the parts that are easy to get wrong once and then debug for a week:

- **Explicit environment.** Schedulers do not load your shell profile. `PATH`, `HOME` and the absolute path to `claude` are written into the script.
- **The prompt is a pointer.** It names a skill or runbook file rather than embedding the logic, so behaviour changes without touching the scheduler.
- **Unattended means unattended.** The prompt tells the agent never to wait for an answer, and to park human decisions in writing instead of blocking.
- **`--permission-mode bypassPermissions`.** A headless run cannot approve anything. Override with `--permission-mode` if you want a stricter mode.
- **`--output-format stream-json --verbose`.** Steps land in the log as they happen instead of buffering until the end.
- **Preconditions before spending a session.** `--precheck` runs a cheap command first; if it fails, the run is skipped and reported rather than started into a broken environment.
- **Random start jitter.** Firing at the same second every day is a machine rhythm, and staggering also keeps several jobs off the same usage-limit cliff.
- **Delivery is separate from logging.** The agent writes a summary file as its last step; the runner delivers that file through `--notify`. No summary means the run is reported as failed, with the exit code.
- **State lives in files.** Each run is a fresh process; continuity comes from whatever the skill writes down.

Details and the reasoning behind each one: [docs/design.md](docs/design.md).

## Beyond a laptop

The same "subscription instead of API key" idea shows up in a few officially supported places — GitHub Actions with `claude_code_oauth_token`, the Agent SDK authenticating as your account, and chat gateways that execute turns through the local CLI. Where each one fits, and where the line is: [docs/use-cases.md](docs/use-cases.md).

### Answering a chat message instead of a schedule

A scheduled job and a chat bot are the same substrate with a different trigger. [OpenClaw](https://docs.openclaw.ai) is a self-hosted gateway that connects Zalo, Telegram, Slack and friends to an agent, and it can run every turn through your logged-in CLI — no API key in the config at all:

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "claude-cli/claude-sonnet-5" },
      "cliBackends": { "claude-cli": { "command": "/opt/homebrew/bin/claude" } },
      "agentRuntime": { "id": "claude-cli" }
    }
  }
}
```

A ready-to-run script that merges this into an existing gateway config, with a backup and a dry run, is in [examples/openclaw/](examples/openclaw/):

```bash
node examples/openclaw/apply-claude-cli-backend.mjs            # show the diff
node examples/openclaw/apply-claude-cli-backend.mjs --write    # apply it
```

The full walkthrough — how a turn executes, why the model list must not contain a direct-API model, and what a long-running gateway does differently from a one-shot job — is in [docs/openclaw.md](docs/openclaw.md).

Run both and you cover the two halves: the gateway answers when someone asks, `claude-jobs` acts when nobody does.

## Limitations

- **One daily time per job.** `--at` takes `HH:MM` and schedules that job once a day. Several times a day, weekdays only, or a full cron expression means several jobs, or editing the generated scheduler unit by hand.
- **No retries and no catch-up.** A failed run is reported, not repeated, and a run whose scheduled minute passed while the machine was asleep or off is handled by whatever the scheduler does — this tool adds no logic of its own on top.
- **macOS, Linux, and any Unix with cron.** The scheduler is launchd on macOS, systemd user timers on Linux, and cron where either is missing. Windows Task Scheduler is not supported.
- **The login is the dependency.** Jobs run through the Claude Code CLI as the user who installed them, so the machine needs an interactive login that is still valid. There is no API-key path by design, and no way to run this on a host nobody has ever logged into. `claude-jobs doctor` checks that before a schedule silently starts failing.
- **`bypassPermissions` by default.** An unattended run cannot approve a tool call, so it starts with permissions bypassed in the working directory given to it. That is a trust decision about that directory, not a detail — `--permission-mode` makes it stricter.
- **The agent's report is the only outcome.** Delivery is driven by the summary file the agent writes last. A run that ends without one is reported as failed, even if useful work happened before it stopped.

## Related tools

Two separate concerns around the same CLI; either works on its own.

| Tool | What it does |
|---|---|
| `claude-jobs` (this repo) | Runs Claude Code on a schedule, unattended, and reports the outcome |
| [`claude-router`](https://github.com/vinhnguyenthanhdn/claude-router) | Points Claude Code at a 9Router provider instead of Anthropic, per process in the terminal or per machine in VSCode (Windows) |

## Contributing

Issues and PRs are welcome — especially scheduler support beyond launchd/systemd/cron, notifier recipes, and prompt templates that survive real unattended use. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

If this saved you an afternoon, a ⭐ helps other people find it.

## License

MIT
