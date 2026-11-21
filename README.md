# Export Miro Flowcharts

**Miro flowcharts → LLM-ready text, Mermaid & JSON.**

Miro has no export for flowcharts, and its public API returns flowchart shapes as `stencil` with no text.
This Chrome extension reads the board through Miro's own Web SDK (`miro.board.experimental`) in the page,
and turns the flowchart into a format LLMs reason well about.

## Features

- **Live side panel.** It stays open next to the board and refreshes when you change the selection.
- **Three formats:** LLM text (adjacency list), Mermaid (frames become subgraphs) and JSON.
- **Prompt templates.** Wrap the export in your own instructions with `{{flowchart}}`, `{{board_name}}`, `{{board_url}}` and `{{stats}}`. Four templates ship built in: logic gaps, test cases, explanation, state machine.
- **Output options:** legend language (EN/UK), node types, notes, frames as sections, original Miro item IDs, Mermaid direction.
- **One-key copy.** `Alt+Shift+C` copies the selection with the current settings and shows a toast on the board. The panel doesn't need to be open.
- **Token estimate**, so you can tell whether the export fits your prompt.
- **Board name** is used in the export header, the `{{board_name}}` placeholder and the download file name.
- **English, Ukrainian, Russian.** The language is detected from the browser and system locale and can be switched at the top of the panel. Built-in templates and the output legend are translated too.
- **Fast.** The board is read once. After that, selection changes re-render from cache with zero SDK calls. The board is re-read only when Miro reports an item was created, deleted or updated.

## LLM text format

```
N2 (decision) Has token?
  → [yes] N3
  → [no] N5
N5 (process) Show login
  → [retry] N2 ↩
```

- Short IDs instead of 19-digit Miro IDs, so fewer tokens and no confusing near-identical numbers.
- Nodes come in DFS order from the entry points, so the text reads like the scenario.
- `↩` marks real loops (back edges), not merges of branches.
- Arrow direction comes from the arrowheads. Lines without arrowheads are shown as `—`.
- Unconnected stickies and texts are listed as notes, each linked to the nearest node.

## Install (dev)

1. `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select this folder.
2. Pin the extension. Clicking its icon opens the side panel.
3. To check or change the hotkey, go to `chrome://extensions/shortcuts`.

## Architecture

```
src/extract.js     runs in the page (MAIN world): board read, change watcher, cheap selection poll
src/format.js      pure: graph building, formatters, output legends, templates, token estimate
src/i18n.js        UI dictionaries (en/uk/ru), language detection, CLDR plurals
src/settings.js    defaults, migrations, chrome.storage persistence
src/panel.*        side panel UI; polls selection + change counter every 400 ms while visible
src/background.js  opens the panel on icon click; hotkey → extract → render → copy + toast
_locales/          store listing name/description per language
```

Permissions are limited to `https://miro.com/app/board/*`. The extension makes no network requests,
and the board never leaves your browser.

## Adding a language

1. `src/i18n.js`: add the code to `LANGS` and a dictionary to `DICT`. Missing keys fall back to English, and the test suite reports which keys are missing.
2. `src/format.js`: add an entry to `LEGEND` (the output header and legend).
3. `_locales/<code>/messages.json`: add the store listing texts.

## Develop

The toolchain is [Bun](https://bun.sh) (`bun install` once). The code itself is vanilla ES modules with
no build step — what you load unpacked is exactly what ships.

```
bun run test       # unit tests
bun run typecheck  # type-check src/ (JSDoc + tsc, no compilation)
bun run smoke      # end-to-end in Chromium with a mocked Miro board
bun run check      # all three
bun run zip        # dist/export-miro-flowcharts.zip
```

The smoke test needs Chromium: run `bunx playwright-core install chromium` once, or set `CHROME_PATH`.
Branded Chrome 137+ ignores `--load-extension`.

More in [`docs/`](docs): architecture, Miro SDK notes, decisions, roadmap, testing. Contributor and agent
guidelines are in [`CLAUDE.md`](CLAUDE.md).

## Caveats

This extension relies on `miro.board.experimental`, which Miro may change without notice. It works as of November 2026.
If the extension reports shapes "without text", the experimental API isn't available on that board.

MIT. Not affiliated with or endorsed by Miro. Miro is a trademark of its respective owner.
