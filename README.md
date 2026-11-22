# Export Miro Flowcharts

**Export Miro flowcharts to LLM-ready text, Mermaid and JSON.** A Chrome extension that runs entirely in your browser.

[![CI](https://github.com/ITBoomDev/export-miro-flowcharts/actions/workflows/ci.yml/badge.svg)](https://github.com/ITBoomDev/export-miro-flowcharts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)
![Local only](https://img.shields.io/badge/privacy-100%25%20local-2ea44f)

Miro has no export for flowcharts, and its public REST API and stable Web SDK return flowchart shapes as
`stencil` items with no text. This extension reads the board through Miro's own in-page SDK
(`miro.board.experimental`), which does return the text, and converts the diagram into a format that
language models reason about well.

> Not affiliated with or endorsed by Miro. Miro is a trademark of its respective owner.

## Contents

- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [Output formats](#output-formats)
- [Prompt templates](#prompt-templates)
- [Options](#options)
- [Privacy and permissions](#privacy-and-permissions)
- [Limitations and troubleshooting](#limitations-and-troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Live side panel.** It stays open next to the board and refreshes when you change the selection or edit a shape.
- **Three formats.** LLM text (an adjacency list built for token efficiency), Mermaid (frames become subgraphs) and JSON.
- **Prompt templates.** Wrap the export in your own instructions with `{{flowchart}}`, `{{board_name}}`,
  `{{board_url}}` and `{{stats}}`. Four ship built in: logic gaps, test cases, explanation, state machine.
- **One-key copy.** `Alt+Shift+C` copies the selection with your current settings and shows a toast on the board.
  The panel does not need to be open.
- **Token estimate** in the panel, so you know whether the export fits your prompt.
- **Selection or whole board.** Select part of a diagram to export just that part. Selecting a frame includes everything inside it.
- **English, Ukrainian and Russian** interface, detected from the browser. The output legend and built-in templates are translated too.
- **Fast.** The board is read once. Selection changes re-render from cache with zero SDK calls, and the board is re-read only when Miro reports a change.
- **Private.** No network requests, no analytics, no account. See [Privacy and permissions](#privacy-and-permissions).

## Install

### From the Chrome Web Store

Listing in review. The link will be added here once it is published.

### From a release (unpacked)

1. Download `export-miro-flowcharts.zip` from the [latest release](https://github.com/ITBoomDev/export-miro-flowcharts/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.
4. Pin the extension to the toolbar.

### From source

```bash
git clone https://github.com/ITBoomDev/export-miro-flowcharts.git
```

Then load the cloned folder with **Load unpacked** as above. There is no build step: what you load is the source.

Requires Chrome 116 or newer (or another Chromium browser with side panel support).

## Usage

1. Open a Miro board at `https://miro.com/app/board/…` that contains a flowchart.
2. Click the extension icon. The side panel opens and shows the export of the whole board.
3. Select part of the diagram to export only that part. The panel updates as you select.
4. Pick a format and, optionally, a prompt template.
5. **Copy** to the clipboard or **Download** a file named after the board.

To copy without opening the panel, press `Alt+Shift+C` on the board. Change the shortcut at
`chrome://extensions/shortcuts`.

## Output formats

For this diagram (a login flow with a retry loop):

### LLM text (default)

```
# Flowchart: Login flow (exported from Miro)
Nodes: 5. Edges: 6. Entry: N1. End: N4.
Format: `Nx (type) label`, then its outgoing transitions `→ [condition] Ny`. `↩` = back edge (loop). `—` = undirected link.

N1 (terminator) Start
  → N2
N2 (decision) Has token?
  → [yes] N3
  → [no] N5
N3 (process) Validate & refresh
  → N4
N4 (terminator) Done
N5 (process) Show login
  → [retry] N2 ↩
  → N4
```

- Short IDs (`N1…Nn`) instead of 19-digit Miro IDs: fewer tokens, and no near-identical numbers for a model to confuse.
- Nodes come in depth-first order from the entry points, so the text reads like the scenario.
- `↩` marks real loops (back edges), not merges of branches. The header lists entries and ends explicitly.
- Arrow direction comes from the arrowheads. Lines without arrowheads are shown as `—`.
- Unconnected stickies and text items are listed as notes, each linked to the nearest node.

### Mermaid

```
flowchart TD
  N1(["Start"])
  N2{"Has token?"}
  N3["Validate & refresh"]
  N4(["Done"])
  N5["Show login"]
  N1 --> N2
  N2 -->|"yes"| N3
  N2 -->|"no"| N5
  N3 --> N4
  N5 -->|"retry"| N2
  N5 --> N4
```

Flowchart shapes map to Mermaid shapes (decision, terminator, database, input/output…). Frames become
subgraphs. Paste the result into [mermaid.live](https://mermaid.live) to preview it.

### JSON

`entries`, `ends`, `nodes` (`id`, `type`, `label`, `frame`), `edges` (`from`, `to`, `label`, `directed`,
`loop`) and `notes`. Suited to scripts and pipelines.

## Prompt templates

A template is your instruction text with placeholders. The export replaces them when you copy.

| Placeholder | Replaced with |
|---|---|
| `{{flowchart}}` | The export. If missing, it is appended at the end. |
| `{{board_name}}` | The board name from the tab title |
| `{{board_url}}` | The board URL |
| `{{stats}}` | A short summary, for example "5 nodes, 6 edges" |

Open the pencil button next to the template list to add, edit or delete templates. "Restore built-in
templates" brings back the four defaults without touching your own.

## Options

| Option | Effect |
|---|---|
| Legend language | Language of the output header and legend: follow the interface, or English, Ukrainian, Russian |
| Node types | Show `(decision)`, `(process)`… in LLM text |
| Notes | Include unconnected stickies and texts |
| Frames | Frames become sections (LLM text) or subgraphs (Mermaid) |
| Miro item IDs | Add the original Miro IDs, for round trips back to the board |
| Mermaid direction | `TD`, `LR`, `BT` or `RL` |

## Privacy and permissions

Everything happens locally. The extension makes **no network requests**, has no analytics and loads no
remote code. Your board never leaves your browser. Settings are stored with `chrome.storage.local` on your
device. The [privacy policy](docs/PRIVACY.md) has the details.

| Permission | Why it is needed |
|---|---|
| Host `https://miro.com/app/board/*` | Reads the board in the page. Nothing outside board pages is accessed. |
| `scripting` | Injects the reader into the board page and shows the copy toast |
| `storage` | Saves your options and templates locally |
| `sidePanel` | The persistent panel next to the board |
| `clipboardWrite` | Copies the export when the page blocks the async clipboard API |

No content scripts are declared. Code is injected only on board pages, only when you use the extension.

## Limitations and troubleshooting

- **Relies on an experimental Miro API.** `miro.board.experimental` is not part of Miro's stable, documented
  SDK. Miro may change it without notice. The extension was verified in November 2026.
- **"Shapes without text" warning.** The experimental API was not available for that board, so Miro returned
  stencils with no text. Reload the board page and try again.
- **Nothing shows up.** Open a board URL (`miro.com/app/board/…`). The panel works only on board pages.
- **The panel does not update live.** If Miro's change events are unavailable, the extension falls back to
  re-reading the board on every selection change. It is correct but slower. Use ↻ to force a refresh.
- **Large boards.** The formatter handles thousands of nodes in milliseconds. Reading a very large board
  from Miro itself can take a second or more.
- **Branded Chrome and tests.** Chrome 137+ ignores `--load-extension`, which only affects the automated
  smoke test, not normal installation.

Found a bug? [Open an issue](https://github.com/ITBoomDev/export-miro-flowcharts/issues/new/choose) and
include the diagnostics described in the template.

## Development

The toolchain is [Bun](https://bun.sh). The extension itself is vanilla ES modules with no build step and no
runtime dependencies.

```bash
bun install
bun run test        # unit tests
bun run typecheck   # tsc over src/ via JSDoc, no compilation
bun run smoke       # end-to-end: Chromium + the extension + a mocked Miro board
bun run check       # all three
bun run zip         # dist/export-miro-flowcharts.zip for the Chrome Web Store
```

The smoke test needs Chromium: run `bunx playwright-core install chromium` once, or set `CHROME_PATH`.

```
src/extract.js     runs in the page (MAIN world): board read, change watcher, selection poll
src/format.js      pure: graph building, formatters, output legends, templates, token estimate
src/i18n.js        UI dictionaries (en/uk/ru), language detection, CLDR plurals
src/settings.js    defaults, migrations, chrome.storage persistence
src/panel.*        side panel UI
src/background.js  opens the panel on icon click; hotkey → extract → render → copy + toast
_locales/          store listing texts per language
```

Further reading in [`docs/`](docs): [architecture](docs/ARCHITECTURE.md), [Miro SDK notes](docs/MIRO_SDK_NOTES.md),
[design decisions](docs/DECISIONS.md), [testing](docs/TESTING.md), [publishing](docs/PUBLISHING.md) and the
[roadmap](docs/ROADMAP.md).

### Adding a language

1. `src/i18n.js`: add the code to `LANGS` and a dictionary to `DICT`. The test suite reports missing keys.
2. `src/format.js`: add an entry to `LEGEND` (the output header and legend).
3. `_locales/<code>/messages.json`: add the store listing texts.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Security issues go
through [SECURITY.md](SECURITY.md). Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Release history is in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE). Not affiliated with or endorsed by Miro.
