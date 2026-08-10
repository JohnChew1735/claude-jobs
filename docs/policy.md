# Scope and policy

## What this project does

It generates scripts that invoke the Claude Code CLI, installed and logged in by you, on your own machine, under your own scheduler. That is the supported, documented way to run Claude Code non-interactively.

## What it does not do

- It does not extract, store, forward or re-sign your credentials. It never reads your token; the CLI handles its own auth.
- It does not expose your subscription as an API endpoint for other software.
- It does not attempt to bypass usage limits, and it does not hide or disguise the fact that a run is automated.

If you need an endpoint that arbitrary tools can call, use an Anthropic API key. That is what it exists for.

## Your responsibilities

- **Permissions.** The default `--permission-mode bypassPermissions` lets the agent act without asking. Point jobs at directories you are willing to hand over, and read a generated `run.sh` before installing it.
- **Terms.** Your use is governed by your Anthropic plan's terms. Those terms change; this file is not legal advice and is not a guarantee.
- **Secrets.** Prompts and logs can capture whatever the agent reads. `~/.claude-jobs/logs/` is not a safe place for secrets, and neither is a summary you pipe into a chat channel.

## Reporting a problem

Security issues: see [SECURITY.md](../SECURITY.md). Anything else: open an issue.
