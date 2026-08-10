# Worked example: a chat gateway on the local CLI

[OpenClaw](https://docs.openclaw.ai) is a self-hosted gateway that connects chat channels to an agent. It can execute every turn through the local Claude Code CLI instead of calling the API — the same idea as this package, applied to a long-running service rather than a scheduled script. It is included here because the configuration shows how the pieces are named in a system that has thought about it carefully.

## Two separate choices

| Concept | Question it answers | Example value |
| --- | --- | --- |
| Model ref | Which model | `anthropic/claude-sonnet-4-6` |
| Agent runtime / CLI backend | What executes the turn | `claude-cli` → `/opt/homebrew/bin/claude` |

Legacy refs such as `claude-cli/<model>` fold both choices into one string and still work; the modern form keeps them apart.

## Configuration

```json
{
  "auth": {
    "profiles": {
      "anthropic:claude-cli": { "provider": "claude-cli", "mode": "oauth" }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "claude-cli/claude-sonnet-4-6" },
      "models": {
        "claude-cli/claude-sonnet-4-6": {},
        "claude-cli/claude-opus-4-7": {},
        "claude-cli/claude-haiku-4-5": {}
      },
      "cliBackends": { "claude-cli": { "command": "/opt/homebrew/bin/claude" } },
      "agentRuntime": { "id": "claude-cli" }
    }
  }
}
```

Setup is two steps — log the CLI in, then point model selection at it:

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

No API key appears anywhere. Credentials are read from the CLI's own keychain entry.

## How a turn executes

1. The provider prefix selects the backend.
2. The gateway's system prompt and workspace context go in through `--append-system-prompt`.
3. The CLI runs with a session id. The bundled backend keeps one Claude stdio process alive per gateway session and sends follow-up turns as stream-json over stdin.
4. Output is parsed as JSONL; the final text is the reply.
5. Session ids persist, so a gateway restart resumes rather than starting fresh — after verifying the stored transcript still exists.

Two details worth stealing:

- **Skills are filtered per session** and passed as a temporary plugin directory, so the CLI's own skill resolver sees exactly the set the gateway intends.
- **Permission mode is derived, not configured twice.** When the gateway's exec policy is fully permissive it appends `--permission-mode bypassPermissions`, the same flag this package writes into its runners.

## The trap

Keep API-backed model refs out of the model list entirely. Background tasks inside such a gateway can fail over to whatever else is configured; if a direct-API model is reachable, the fallback silently leaves the subscription path and fails on third-party usage limits instead. Configure only CLI-backed refs, then verify with the gateway's own status command rather than by reading the config file.

## What is different here

| | Gateway | claude-jobs |
| --- | --- | --- |
| Lifetime | Long-running daemon | One process per scheduled tick |
| Session | Persistent, resumable | Fresh every run |
| Continuity | Session ids | Files the skill writes |
| Trigger | Inbound chat message | Scheduler |

Same substrate, opposite ends of the spectrum. Both avoid the API key by letting the logged-in CLI do the work.
