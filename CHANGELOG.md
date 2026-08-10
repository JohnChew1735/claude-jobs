# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0]

Initial release.

- `init`, `list`, `run`, `install`, `uninstall`, `logs`, `status`, `doctor`.
- Scheduler backends: launchd, systemd user timers, cron.
- Generated runner with explicit environment, start jitter, precheck gate, streaming log, summary-file delivery and a notify hook.
- Prompt template written for unattended runs.
- Docs: design notes, subscription-vs-API-key use cases, gateway example, policy scope.
