# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.3]

### Added

- `examples/openclaw/`: a sample config fragment and an apply script that merges the CLI backend into an existing gateway config — dry run by default, timestamped backup, refuses to run when the CLI is not logged in, and drops direct-API model refs that would silently become a fallback.

### Changed

- Documentation examples now use Sonnet 5 / Opus 5 model refs.

## [0.1.2]

### Changed

- Surfaced the chat-gateway case on the front page: a self-hosted gateway can answer messages through the same logged-in CLI, with no key in its config. Same substrate as a scheduled job, different trigger.

## [0.1.1]

### Fixed

- `list` and `status` reported a job as installed as soon as it was scaffolded. `init` writes the unit file so it can be read before committing to it, which is not the same as the scheduler having accepted it — installed state is now read from `launchctl` / `systemctl` instead of from the file's existence.

### Added

- `claude-jobs --version`.

## [0.1.0]

Initial release.

- `init`, `list`, `run`, `install`, `uninstall`, `logs`, `status`, `doctor`.
- Scheduler backends: launchd, systemd user timers, cron.
- Generated runner with explicit environment, start jitter, precheck gate, streaming log, summary-file delivery and a notify hook.
- Prompt template written for unattended runs.
- Docs: design notes, subscription-vs-API-key use cases, gateway example, policy scope.
