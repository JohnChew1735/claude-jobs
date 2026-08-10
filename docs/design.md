# Design notes

Why the generated runner looks the way it does. Every item here comes from a failure mode that shows up once you actually leave a job running for a few weeks.

## The shape

```
scheduler (launchd / systemd / cron)
    └── run.sh
         ├── export PATH / HOME explicitly
         ├── random start delay
         ├── precheck: cheap command that must pass
         ├── claude -p "$(cat prompt.md)" --permission-mode … --output-format stream-json
         │     └── agent reads the skill file, does the work, writes summary
         └── deliver summary (or the failure) through the notify command
```

One scheduled tick is one CLI invocation. There is no daemon, no session pool, no shared state between runs.

## Decisions

### Explicit environment

`launchd` and `systemd` start with a near-empty environment, and `cron` gives you a `PATH` of roughly `/usr/bin:/bin`. A script that works in your terminal and fails under the scheduler is almost always this. The runner writes `PATH`, `HOME` and the absolute path to `claude` into the file rather than inheriting them.

### The prompt is a pointer, not the content

The generated prompt names a file — a `SKILL.md`, a runbook, a checklist — and tells the agent to follow it. Behaviour then lives in a document you can version and edit, and changing it never means touching a scheduler unit.

### Unattended runs need to be told they are unattended

Without an explicit instruction, an agent that hits an ambiguous decision will stop and ask. Nobody is reading. The template tells it to never ask, to record open decisions in writing, and to continue with the rest of the work — so a single unclear step costs you one paragraph, not the entire session.

### Permission mode

A headless run cannot approve a tool call, so the default is `--permission-mode bypassPermissions`. This is a real trust decision: the agent runs with your credentials in the working directory you gave it. Point jobs at a directory you are willing to hand over, and use `--permission-mode` if you want something stricter.

### Streaming output

`--output-format stream-json --verbose` writes each step to the log as it happens. Buffered output tells you nothing while a run is stuck, and a job that hangs at 3am is exactly when you want to see the last thing it did.

### Precheck before spending a session

Sessions are not free — they consume your subscription's usage limits. When a job depends on something external (a browser on a debug port, a VPN, a mounted volume, a reachable database), check it first with `--precheck`. A failed precheck skips the run, says so, and costs a second.

### Jitter

Two reasons. A job that fires at exactly the same second every day is a recognizable machine rhythm to anything watching from the outside. And several jobs starting together compete for the same usage limits — spreading them out turns a cluster of failures into a queue.

### Delivery is separate from logging

The log is for you, when something is wrong. The summary is the product of the run. The agent writes the summary as its very last step, in a fixed shape; the runner reads that file and hands it to `--notify`. If the file is missing, the runner reports the failure and the exit code, so a broken session is still audible.

`--notify` receives the text in `$CLAUDE_JOB_MESSAGE` and the job name in `$CLAUDE_JOB_NAME`. It is a plain shell command, so anything works — `mail`, `curl` to a webhook, a chat CLI, `terminal-notifier`.

### State in files, not in sessions

Each run is a fresh process. Anything that must survive belongs in a file the skill owns — a progress log, a ledger, a state directory. This is also what makes runs resumable after a crash: the next session reads the same files and continues.

### Names are constrained

Job names become filenames, launchd labels and systemd unit names, so they are restricted to lowercase letters, digits and dashes. Better to reject `My Job` at creation than to debug a broken unit later.

## Known failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Job exits non-zero, log ends mid-session | Subscription usage limit reached | Spread schedules with `--at` / `--jitter`, rerun with `run <name> --now` |
| `claude: command not found` in the log | Scheduler `PATH` does not include the binary | `claude-jobs install` regenerates the runner; or pass `--claude /full/path` |
| Runs but never delivers | Agent did not write the summary file | Keep the "last step" instruction in the prompt; check the path in `status` |
| Session waits forever | Prompt lost the unattended instruction | Restore it, and keep `--permission-mode bypassPermissions` |
| Job stops firing after a reboot (systemd) | Timer not enabled for the user | `claude-jobs install <name>` again; consider `loginctl enable-linger` |
