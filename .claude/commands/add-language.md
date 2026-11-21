---
description: Add a new UI + output language
argument-hint: <code> <native name>, e.g. pl Polski
---

Add the language $ARGUMENTS.

1. `src/i18n.js`: add the code with its native name to `LANGS`, then add a full dictionary to `DICT` by
   translating every key of `DICT.en`. Count strings are plural objects. Check the language's CLDR
   categories with `new Intl.PluralRules('<code>').resolvedOptions().pluralCategories` and provide each one.
   Keep `{placeholders}` and `{{flowchart}}` untouched. Template bodies are prompts for an LLM, so they
   should read naturally and stay imperative.
2. `src/format.js`: add an entry to `LEGEND` that mirrors `en` (title with and without a board name, stats,
   legend, statsShort, outside, notes, near, noText).
3. `_locales/<code>/messages.json`: translate `extName` (≤ 75 chars, keep "Export Miro Flowcharts" in
   English), `extShortName` (unchanged), `extDescription` (≤ 132 chars) and `cmdCopy`.
4. Tests: add plural assertions for the new language to `test/i18n.test.mjs`, plus a legend assertion
   to `test/options.test.mjs`.
5. Run `bun run test` (the "every language has every key" test must pass), then `bun run smoke`.
6. Add a line to the Unreleased section of `CHANGELOG.md`.
