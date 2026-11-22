# Contributing

Thanks for helping. This is a small, deliberately simple project, and these notes keep it that way.

## Ground rules

These come from the project's goals (a trustworthy, auditable, local-only tool). Changes that break them
will not be merged:

1. **No network requests, analytics or remote code.** "Runs locally" is the core promise.
2. **No build step and no runtime dependencies.** The extension is vanilla ES modules loaded directly by Chrome.
3. **Don't widen permissions** without a written reason in [`docs/DECISIONS.md`](docs/DECISIONS.md).
4. **`src/format.js` stays pure** (no `chrome.*`, no DOM) and every output change has a test.
5. **Functions passed to `chrome.scripting.executeScript({ func })` must be self-contained.** They are
   serialized with `toString()`: no imports, no outer-scope variables, plain-data return values.
6. **Every UI string goes through `T()`** and has a key in every language.
7. **Settings changes need a migration** and a test. Never break users' stored templates.

The full list with rationale is in [`CLAUDE.md`](CLAUDE.md) (it doubles as contributor guidance).

## Setup

```bash
git clone https://github.com/ITBoomDev/export-miro-flowcharts.git
cd export-miro-flowcharts
bun install
bunx playwright-core install chromium   # once, for the smoke test
```

Load the folder as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked). After
editing, press ↻ on the extension card.

## Before you open a pull request

```bash
bun run check
```

This runs the unit tests, the type check and the end-to-end smoke test, and must pass. Also:

- Add or update tests for behavior you change.
- Add an entry under `## Unreleased` in [`CHANGELOG.md`](CHANGELOG.md).
- If you changed what is read from the board, update `test/smoke/mock-board.html` and the fixtures.
- If you changed behavior that depends on Miro's SDK, say how you verified it on a real board.

## Code style

2-space indent, single quotes, semicolons, modern JavaScript. Keep functions small. Types are JSDoc checked
by `tsc`; add annotations only where inference fails. Escape board-provided text with `esc()` before
`innerHTML`. See [`.editorconfig`](.editorconfig).

## Commits and pull requests

- Write commit messages in English, imperative mood, a short subject line and a body explaining why.
- Keep pull requests focused: one change, one purpose.
- Describe what changed, why, and how you tested it. The pull request template lists the checklist.

## Good first contributions

- A new interface language (see "Adding a language" in the [README](README.md#adding-a-language)).
- Reports from real boards: unusual shapes, large diagrams, edge cases the mock doesn't cover.
- Items from the backlog in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Reporting bugs and asking questions

Use the [issue templates](https://github.com/ITBoomDev/export-miro-flowcharts/issues/new/choose). For
security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
