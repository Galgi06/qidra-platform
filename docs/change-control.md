# Qidra Change Control

## Purpose

Every meaningful change in Qidra must have a traceable history:
- who made the change
- when it was made
- what was changed
- how it can be reverted

This policy applies to application code, schema changes, infrastructure scripts, and operational procedures.

## Mandatory Rules

1. Do not change Qidra without Git history.
2. Each completed block of work must end with a separate commit.
3. Commit messages must describe the result, not the intent.
4. Significant changes must be added to `CHANGELOG.md`.
5. Structural changes must be protected by a pre-change commit and backup.

## Commit Format

Use concise commit messages:

```text
feat: add digital clone profile
feat: add voice profile
feat: improve mobile interview UX
fix: archive navigation
fix: interview flow
chore: update change control policy
docs: record migration procedure
```

Recommended prefixes:
- `feat:` new functionality
- `fix:` bug fix
- `docs:` documentation only
- `chore:` operational or maintenance change
- `refactor:` code restructuring without behavior change
- `perf:` performance improvement

## Changelog Rules

Every substantial release or completed work block must be recorded in `CHANGELOG.md` with:
- release date
- version
- list of changes
- list of fixes

If a block contains only changes or only fixes, keep the empty section out of that release note.

## Daily Report

To see what changed over the last 24 hours, run:

```bash
npm run changes:last-day
```

This command reads:
- Git commits from the last 24 hours
- changelog entries for the corresponding dates

It must not infer changes from the current uncommitted working tree.

## Structural Changes and Migrations

Before any structural change, including database schema changes, migration files, storage structure, or critical deployment scripts:

1. Make sure the current state is committed.
2. Create a backup.
3. Perform the change.
4. Verify the result.
5. Create a new commit with the completed change.

### Required sequence

```bash
git status
git add <files>
git commit -m "chore: checkpoint before schema change"
npm run backup:database
# or
npm run backup:postgres

# apply migration / structural change

git add <files>
git commit -m "feat: apply schema change for <scope>"
```

## Rollback Principle

Rollback must be possible through Git history and backups.

Typical rollback methods:

```bash
git log --oneline
git show <commit>
git revert <commit>
```

For schema or production data incidents, use the latest verified database backup before rollback.

## Repository State

Qidra must remain a valid Git repository at all times. If the repository is ever copied into a non-Git directory, initialize Git before any change:

```bash
git init
git add .
git commit -m "chore: initialize repository history"
```

## Enforcement

From this point onward:
- no completed task is considered done without a commit
- no major release is considered done without a changelog entry
- no structural migration is considered safe without a backup step
