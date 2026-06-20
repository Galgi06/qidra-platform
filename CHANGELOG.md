# Changelog

All significant changes in Qidra must be recorded here.

Format for each release entry:
- date
- version
- changes
- fixes

## [0.1.0] - 2026-06-19

### Changes
- Added a formal change-control policy for the Qidra repository.
- Added a daily change report command based on `git log` and `CHANGELOG.md`.
- Added an operational runbook for commits, structural changes, backups, and migrations.

### Fixes
- Standardized the project history process so future changes can be traced and rolled back reliably.

## [0.1.1] - 2026-06-20

### Changes
- Added controlled client-side handling for required KYC file fields so participant profile submission does not silently fail on hidden file inputs in mobile browsers.

### Fixes
- Fixed the participant KYC form to surface explicit file-field errors instead of behaving like an inactive submit button on Safari/mobile flows.
