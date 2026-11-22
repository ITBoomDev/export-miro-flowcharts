# Chrome Web Store listing (EN)

Localized name/short description live in `_locales/*/messages.json`. This file holds the rest of the
dashboard fields, so they are reviewed in git.

## Single purpose

Export flowcharts from the Miro board the user has open into text formats (LLM-ready text, Mermaid, JSON)
for copying or downloading.

## Detailed description

Miro has no flowchart export, and its public API returns flowchart shapes without their text. Export
Miro Flowcharts reads the board you have open and turns the flowchart into a format LLMs reason well about.

• Live side panel — stays open next to the board and updates as you select or edit.
• Three formats — compact LLM text (adjacency list with short IDs, DFS order, explicit loops), Mermaid
  (frames become subgraphs) and JSON.
• Prompt templates — wrap the export in your own instructions: find logic gaps, write test cases,
  explain the process, describe a state machine.
• One-key copy — Alt+Shift+C copies the selection and shows a toast on the board.
• Token estimate, so you know it fits your prompt.
• English, Ukrainian and Russian interface.

Private by design: everything runs locally in your browser. No network requests, no analytics, no
account. Works only on miro.com board pages.

Note: relies on Miro's experimental in-page SDK, which Miro may change. Not affiliated with Miro.

## Permission justifications

| Permission | Why |
|---|---|
| `scripting` | Runs the reader function in the Miro board page (MAIN world), the only place `window.miro` exists, and shows the copy toast. |
| host `https://miro.com/app/board/*` | Needed to inject that function without a user gesture so live mode can follow selection changes. Scoped to board pages only. |
| `storage` | Saves the user's format, options, language and prompt templates locally. |
| `sidePanel` | The persistent panel that shows the export while the user works on the board. |
| `clipboardWrite` | Copies the export on the hotkey, when the page may block the async clipboard API. |

## Data usage disclosures

- Collects user data: **No.** Remote code: **No.**
- Privacy policy URL: `https://github.com/ITBoomDev/export-miro-flowcharts/blob/main/docs/PRIVACY.md`
- Homepage / support URL: `https://github.com/ITBoomDev/export-miro-flowcharts`
- Submission steps: [`PUBLISHING.md`](PUBLISHING.md)

## Assets still needed

- Screenshots 1280×800 (panel on a real board; one per language if localizing)
- Promo tile 440×280
