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

## [0.1.2] - 2026-06-24

### Changes
- Added draft autosave for the investor project submission form so text fields persist between sessions.
- Rebuilt the project file upload component to support removing and replacing selected files before submission.
- Added support for project videos in listing attachments and real-estate visuals.

### Fixes
- Fixed the real-estate submission flow so uploaded files are appended reliably during form submission instead of being lost in the browser state.
- Fixed edit-mode handling of existing uploaded files by explicitly keeping or clearing current file groups per field.
