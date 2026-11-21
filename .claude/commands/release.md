---
description: Prepare a release (version bump, changelog, checks, zip)
argument-hint: <version, e.g. 0.4.0>
---

Prepare release $ARGUMENTS:

1. Check that the working tree is clean (`git status`). If it isn't, stop and show the changes.
2. Set `"version": "$ARGUMENTS"` in **both** `manifest.json` and `package.json`.
3. In `CHANGELOG.md`, turn the unreleased changes into a `## $ARGUMENTS (<today>)` section with
   Added, Changed and Fixed groups, based on `git log` since the last tag. Keep it short and user-facing.
4. Run `bun run check`. If anything fails, stop and report.
5. Run `bun run zip` and report the path and size of `dist/export-miro-flowcharts.zip`.
6. Show the diff and propose the commit message `release: v$ARGUMENTS`. Don't commit, tag or push
   unless I confirm.
