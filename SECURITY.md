# Security policy

## Supported versions

The latest published release on npm.

## Reporting a vulnerability

Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Please do not open a public issue for anything exploitable.

Include what you did, what happened, and what you expected. A rough timeline: acknowledgement within a week, a fix or an explanation within a month.

## What is in scope

- Generated scripts running commands the user did not intend — injection through a job name, prompt, precheck or notify value.
- Anything that would cause this package to read, store or transmit credentials. It must never do that; the Claude Code CLI owns its own auth.
- File permissions or paths that expose job state to other users on the machine.

## What is not

- **`--permission-mode bypassPermissions` by design.** Unattended runs cannot approve tool calls, so the default lets the agent act. That is a documented trust decision, not a vulnerability. Read a generated `run.sh` before installing it, and point jobs at directories you are willing to hand over.
- **Prompts and logs holding sensitive content.** Whatever the agent reads can end up in `~/.claude-jobs/logs/` or in a summary you forward. Treat both as unencrypted.
- Vulnerabilities in Claude Code itself — report those to Anthropic.
