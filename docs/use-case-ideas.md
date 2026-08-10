# Job ideas

Jobs that suit a scheduled agent share three traits: the work **repeats**, it needs **reading and judgement** rather than just running a command, and the result is **short enough to read in thirty seconds**. Everything below fits that shape. The five in the README are the ones that pay off fastest; these are the rest.

## Repository

**Dependency and CVE triage** — run the audit, then separate what actually reaches your code from what sits in a devDependency nothing calls. Open a PR for the safe patch bumps. The sorting is the value; a bot that lists every advisory is noise.

**CI flake triage** — read the failed runs from the last day, group them by cause, and name the tests that failed for reasons unrelated to the change. After a week you have a ranked flake list instead of a feeling.

**Docs drift** — compare the README and docs against the code, then open a PR for what has diverged: renamed flags, examples that no longer run, install steps for a version you dropped. Nobody wants this job and an agent never gets bored of it.

**Release notes** — draft the changelog from commits and merged PRs since the last tag, in the voice the repo already uses.

**Issue triage** — label incoming issues, spot duplicates, ask for the missing reproduction details, and leave the maintainer a summary instead of a queue.

**Debt ledger** — walk one directory a day, record what is fragile and why in a file that accumulates. The point is coverage over time, not a verdict in one run.

## Operations

**Morning error triage** — read overnight errors, group them, and say which ones deserve attention. A dashboard counts; this interprets.

**Backup and health verification** — run the checks, and when something is off, explain *how* it is off. That explanation is what a shell script cannot give you.

**Cost anomaly report** — read the billing export, flag unusual increases, and correlate them with recent deploys or config changes.

## Personal and solo operator

**A digest with your taste in it** — read the sources you chose and keep only what touches what you are working on right now. That filter is the difference from an RSS reader.

**Competitor or pricing watch** — fetch the pages, compare against the last measurement, report only what changed.

**Social account building** — post, reply and measure on a schedule, keeping a progress file so each session scores the last one. This is the archetype for "only works if it happens every day".

**Knowledge base hygiene** — merge stray notes, add the links between them, and surface claims that contradict each other.

**Client status report** — assemble the weekly update from real activity — commits, tickets, deploys — and leave it as a draft for you to send.

## When not to use a job

- **Anything that needs to be realtime, or to run every minute.** Each session consumes subscription usage limits. Real monitoring wants Prometheus, not an agent.
- **Purely mechanical work** — renaming files, running a migration. A script is cheaper and cannot be creatively wrong.
- **Anything where one bad run does real damage** — pushing to production, emailing customers, deleting data. Let the agent draft it and keep a human on the button.
- **Team pipelines.** Subscription quota belongs to one person and does not pool. Use an API key there; see [use-cases.md](use-cases.md).

## Turning an idea into a job

All of these are the same shape. Write the playbook, define what a good report looks like, and let the runner handle the rest:

```bash
claude-jobs init <name> --skill ~/playbooks/<name>.md --at HH:MM \
  --workdir ~/src/project \
  --precheck '<cheap command that must succeed first>' \
  --notify '<where the summary goes>'
```

[../examples/skill-template.md](../examples/skill-template.md) is a starting skeleton for the playbook, and the sections that matter most are the scoring step at the top — where the agent grades what the last run predicted — and the fixed report shape at the end, so consecutive runs can be compared at a glance.
