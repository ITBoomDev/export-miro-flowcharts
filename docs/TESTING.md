# Testing

## Unit tests: `bun run test`

Written against the `node:test` API, run by `bun test` (they also run on Node 20+ with
`node --test test/*.test.mjs`). They cover the pure core:

- `test/format.test.mjs`: graph structure, loops vs merges, reversed arrows, notes, selection scope, formatters
- `test/options.test.mjs`: frames grouped once, option toggles, uk/ru legends, Mermaid subgraphs,
  JSON options, templates, `render()` with the board name
- `test/i18n.test.mjs`: language detection, every key present in every language, CLDR plurals,
  translatable built-in templates, v0.2 → v3 settings migration, 3000-node performance budget (< 1.5 s)

## Type check: `bun run typecheck`

`tsc` over `src/` with `checkJs` (see `jsconfig.json`): JSDoc annotations plus `chrome-types` for the
`chrome.*` APIs and `types/globals.d.ts` for page globals. Nothing is compiled or emitted — Chrome loads
the same `.js` files directly.

## Smoke test: `bun run smoke`

`test/smoke/smoke.mjs` launches Chromium with the unpacked extension. Playwright intercepts
`https://miro.com/**` and serves `test/smoke/mock-board.html`, which defines a fake `window.miro`:

- stable `get()` returns flowchart shapes as `stencil` without text, the same as real Miro
- `experimental.get()` returns them as `shape` with text
- every `get()` takes 300 ms and is counted in `window.__gets`
- `ui.on()` stores handlers, and `window.__emit(event)` fires them
- `window.__sel` drives `getSelection()`

It checks, in order:

1. The first load reads the board exactly once
2. The language is auto-detected (`uk`), along with the board name, the loop marker and the notes
3. A selection change re-renders with 0 extra reads
4. An update event causes exactly 1 re-read
5. Switching to `ru` translates the UI and the built-in template
6. Mermaid output is produced and JSON parses
7. The download file name comes from the board name
8. The hotkey path (`self.copyFlowchart`) fills the clipboard and shows the toast
9. There are no console errors in the panel

Requirements: `bunx playwright-core install chromium` once, or `CHROME_PATH` pointing to Chromium or
Chrome for Testing. Branded Chrome 137+ ignores `--load-extension`. Use `HEADED=1` to watch the run and
`SMOKE_OUT=dir` to keep the screenshots.

The smoke test runs the panel as a regular tab and patches `chrome.tabs.query({ active })` to return the
board tab. Keep that patch in the test only.

When you change what's read from the board, update `mock-board.html` first. When you add UI, add a step
here.

## Manual checklist on a real board

See `docs/ROADMAP.md` → "Now: verify on a real board". Before each release:

- [ ] Load unpacked → open a real flowchart board → the panel shows the board name and a correct export
- [ ] Select a part of the board → the output updates without a "busy" flash
- [ ] Edit a shape's text → the output updates without ↻
- [ ] Mermaid output pasted into mermaid.live renders
- [ ] `Alt+Shift+C` → toast and clipboard
- [ ] Switch the language in the header → everything is translated, including template names
- [ ] DevTools: no errors in the panel or in the service worker
