# Apply the CLI backend to an OpenClaw gateway

Turn a self-hosted [OpenClaw](https://docs.openclaw.ai) gateway into a chat bot that runs on your Claude subscription through the local CLI — no `ANTHROPIC_API_KEY`, no key stored in the config.

Same substrate as a `claude-jobs` job, different trigger: the gateway answers when someone sends a message, a job acts when nobody does.

## Requirements

Claude Code installed and logged in **on the host that runs the gateway**:

```bash
claude auth login
claude auth status
```

## Apply it

```bash
node apply-claude-cli-backend.mjs            # dry run: prints what would change
node apply-claude-cli-backend.mjs --write    # backs up, applies, verifies
openclaw daemon restart
```

Options: `--model <name>` (default `claude-sonnet-5`), `--config <path>` (default `~/.openclaw/openclaw.json`), `--claude <path>` (default: whatever is on `PATH`).

The script merges into your existing config rather than replacing it, writes a timestamped `.bak` first, and refuses to run if the CLI is not logged in. [openclaw.sample.json](openclaw.sample.json) is the same fragment if you prefer to merge by hand.

## What it sets, and why

```json
{
  "auth": { "profiles": { "anthropic:claude-cli": { "provider": "claude-cli", "mode": "oauth" } } },
  "agents": {
    "defaults": {
      "model": { "primary": "claude-cli/claude-sonnet-5" },
      "models": { "claude-cli/claude-sonnet-5": {}, "claude-cli/claude-opus-5": {} },
      "cliBackends": { "claude-cli": { "command": "/opt/homebrew/bin/claude" } },
      "agentRuntime": { "id": "claude-cli" }
    }
  }
}
```

- **`agentRuntime.id`** picks *what executes the turn*; the model ref picks *which model*. Conflating the two is the usual source of confusion.
- **`cliBackends.claude-cli.command`** is an absolute path because a gateway started by launchd or systemd has a minimal `PATH`.
- **The `models` allowlist keeps only `claude-cli/` refs.** The script drops `anthropic/*` entries, and that is the important part: a direct-API ref left in the list is a live fallback. One failed background task cascades onto it and the gateway starts failing on third-party usage limits instead of staying on the subscription.

## Verify

```bash
openclaw models status
```

Expect the default model to be your `claude-cli/` ref and the Anthropic auth profile to read as OAuth, sourced from the CLI's own credential store. If the model list still shows direct-API refs, they are coming from a plugin default rather than your config — that is the first place to look when an extra-usage error appears.

Full walkthrough of how a turn executes: [../../docs/openclaw.md](../../docs/openclaw.md).
