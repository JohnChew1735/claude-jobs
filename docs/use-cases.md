# Running on a subscription instead of an API key

The mechanism `claude-jobs` uses — let the already-logged-in Claude Code CLI execute the work — is one instance of a broader pattern. Here is where that pattern fits, and where it does not.

## Officially supported

| Case | How | Notes |
| --- | --- | --- |
| Scheduled local automation | `claude -p "<prompt>" --permission-mode bypassPermissions --output-format stream-json` under launchd/systemd/cron | What this package generates. Running the CLI on your own machine is the product working as designed |
| Scheduled work, first-party, in the cloud | [Routines](https://code.claude.com/docs/en/routines) — a saved prompt Anthropic runs on a schedule, an API call, or a GitHub event | Runs against a fresh clone, so no local files. Draws on the same subscription and is capped per day by plan (5 on Pro, 15 on Max, 25 on Team/Enterprise at the time of writing) |
| Scheduled work, first-party, on your machine | [Desktop scheduled tasks](https://code.claude.com/docs/en/desktop-scheduled-tasks) — the Routines page in Claude Code Desktop, choosing **Local** | Local files and tools, its own run history, one catch-up run after a missed window. Fires only while the app is open and the computer is awake |
| CI on GitHub | `claude-code-action` with the `claude_code_oauth_token` input instead of `anthropic_api_key` | Token from `claude setup-token`, stored as a repository secret. Runs draw on the quota of whoever created the token |
| Your own agent or app | Claude Agent SDK authenticating as your account rather than with an API key | Supported for subscription plans |
| Chat gateway / bot | Route turns through the local CLI as the execution backend instead of calling the API | A self-hosted gateway (OpenClaw and similar) answers chat messages on your subscription with no key in its config — worked example in [openclaw.md](openclaw.md) |

The common requirement: Claude Code must be logged in **on the host that runs the work**, and the credential is `CLAUDE_CODE_OAUTH_TOKEN`, not `ANTHROPIC_API_KEY`.

## Where an API key is still the right answer

- **Team pipelines.** Subscription quota belongs to an individual. CI running under several committers cannot pool it.
- **Predictable per-token cost** and server-side billing control.
- **Long-lived hosts** that should not depend on one person's login staying valid.
- **API-only features** — prompt caching, response storage, and anything else the CLI does not surface.

## The line

This package deliberately does not proxy a subscription into a general-purpose API endpoint for other tools. Tools in that category exist, but they sit outside what Anthropic sanctions, they have been blocked before, and they lose API-only features along the way. Anthropic's credential policy is explicit that OAuth credentials are for Claude Code and claude.ai.

If you need an endpoint that arbitrary software can call, buy an API key. If you need your own machine to do work on a schedule, this is the supported path.

## Usage limits

Subscription-authenticated runs — including `claude -p` and GitHub Actions — consume your subscription's usage limits. A separate credit pool for these paths has been announced and then paused, so treat the specifics as something to re-check rather than as settled.

Practical consequence for scheduled work: sessions compete with your own interactive use. Hitting the limit shows up as a job exiting non-zero mid-session. Spread the schedule, keep jitter on, and use `claude-jobs run <name> --now` to catch up.
