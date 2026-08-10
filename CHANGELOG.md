# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

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
