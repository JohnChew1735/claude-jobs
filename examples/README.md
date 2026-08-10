# Examples

Copy-paste starting points. Each one is a real command or file, not pseudocode.

## Notifiers

`--notify` is a plain shell command. The summary arrives in `$CLAUDE_JOB_MESSAGE`, the job name in `$CLAUDE_JOB_NAME`.

```bash
# macOS desktop notification
--notify 'terminal-notifier -title "$CLAUDE_JOB_NAME" -message "$CLAUDE_JOB_MESSAGE"'

# Email
--notify 'echo "$CLAUDE_JOB_MESSAGE" | mail -s "$CLAUDE_JOB_NAME" me@example.com'

# Slack incoming webhook
--notify 'curl -sf -X POST -H "Content-type: application/json" \
  --data "$(jq -n --arg t "$CLAUDE_JOB_MESSAGE" "{text:\$t}")" "$SLACK_WEBHOOK_URL"'

# Any chat CLI
--notify 'some-chat-cli send --to me --message "$CLAUDE_JOB_MESSAGE"'

# Append to a file you read later
--notify 'printf "\n## %s %s\n%s\n" "$CLAUDE_JOB_NAME" "$(date +%F)" "$CLAUDE_JOB_MESSAGE" >> ~/reports.md'
```

Keep the notifier honest about failures: the runner sends a message with the exit code when the agent wrote no summary, so a silent job is a broken notifier, not a quiet success.

## Prechecks

`--precheck` runs before a session is spent. Non-zero exit skips the run and reports it.

```bash
--precheck 'curl -sf http://127.0.0.1:9222/json/version >/dev/null'   # a browser is up
--precheck 'test -d /Volumes/backup'                                  # a volume is mounted
--precheck 'pg_isready -q -h localhost'                               # a database answers
--precheck 'git -C ~/src/project fetch --quiet'                       # the network works
```

## A job that runs a skill

```bash
claude-jobs init weekly-digest \
  --skill ~/playbooks/weekly-digest.md \
  --workdir ~/src/project \
  --at 08:15 \
  --jitter 1800 \
  --precheck 'git -C ~/src/project fetch --quiet' \
  --notify 'echo "$CLAUDE_JOB_MESSAGE" | mail -s "weekly digest" me@example.com'
```

Then edit `~/.claude-jobs/jobs/weekly-digest/prompt.md` — that file is the contract with the agent, and it is meant to be edited.

## Several jobs on one machine

Stagger them. Sessions compete for the same usage limits, and jitter alone will not separate two jobs that start at the same hour.

```bash
claude-jobs init inbox-triage  --at 09:00 --jitter 1800 --skill ~/playbooks/inbox.md
claude-jobs init repo-hygiene  --at 13:00 --jitter 1800 --skill ~/playbooks/hygiene.md
claude-jobs init evening-recap --at 19:00 --jitter 900  --skill ~/playbooks/recap.md
claude-jobs list
```

## The same idea in CI

See [github-actions.yml](github-actions.yml) for a workflow that authenticates with a subscription token instead of an API key.
