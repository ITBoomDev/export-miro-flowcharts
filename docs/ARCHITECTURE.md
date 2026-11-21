# Architecture

## Components

```
┌──────────────── Miro board tab ────────────────┐
│ MAIN world: window.miro (Miro's own SDK)       │
│   ▲ extractBoard / installWatcher / pollState  │   (src/extract.js, injected per call)
│ ISOLATED world: copyAndToast                   │   (src/background.js, injected per hotkey)
└───────▲──────────────────────────▲─────────────┘
        │ chrome.scripting         │ chrome.scripting
┌───────┴─────────┐        ┌───────┴──────────────┐
│ Side panel      │        │ Service worker       │
│ src/panel.js    │        │ src/background.js    │
│  cache + live   │        │  icon → open panel   │
│  UI, templates  │        │  hotkey → copy+toast │
└───────┬─────────┘        └───────┬──────────────┘
        └──── format.js (pure) ────┘  + i18n.js + settings.js (chrome.storage.local)
```

No content scripts are declared. Everything is injected on demand with `chrome.scripting.executeScript`
under the host permission `https://miro.com/app/board/*`.

## Read path

`extractBoard()` (MAIN world):

1. Waits up to 5 s for `window.miro.board`. If it never appears, returns `{ errorCode: 'no_sdk' }`.
2. Runs in parallel: `experimental.get()` (falling back to `board.get()` when there is no experimental
   namespace), `getSelection()` and `getInfo()`.
3. If experimental returned no connectors, adds `board.get({ type: 'connector' })`. If it returned
   nothing at all, falls back to `board.get()`.
4. `pick()` copies the plain fields: id, type, shape, parentId, relativeTo, geometry, text fields,
   start/end, stroke caps and captions.
5. Takes the board name from `getInfo().name` (not exposed today), otherwise from the cleaned
   `document.title`.
6. Returns `{ items, selection, experimental, url, boardName, ver, perf }`.

## Live mode (panel)

- On open, on tab switch or SPA URL change, and on ↻: `installWatcher()` (idempotent) then `extractBoard()`.
  This is a full read that caches `raw`, `sig` (sorted selection ids) and `ver`.
- Every 400 ms, while the panel is visible and Live is on, `pollState()` returns `{ sel, ver, events }`:
  - if `ver` changed (a create, delete or update event fired), do a debounced full re-read;
  - if only `sel` changed and `events` is true, set `raw.selection` and call `update()`. This re-renders
    from cache with zero SDK calls;
  - if only `sel` changed and `events` is false, do a full re-read, because the cache can't be trusted.
- `busy`/`pending` serialize full reads, so overlapping requests collapse into one follow-up.

## Hotkey path

`chrome.commands` `copy-flowchart` → `copyFlowchart(tab)` in the service worker:
`loadSettings` → `extractBoard` (MAIN) → `render` → `copyAndToast` (ISOLATED world, clipboard with an
`execCommand` fallback, toast DOM). It uses the same settings as the panel, so whatever the panel shows is
what the hotkey copies. It is exposed as `globalThis.copyFlowchart` for the smoke test and SW console.

## Graph building (`buildGraph`)

1. **Scope:** the selection plus all descendants of selected frames. An empty selection means the whole board.
2. **Absolute coordinates** through the parent chain (`relativeTo: 'parent_top_left'`).
3. **Nodes:** everything except connectors and frames. Text items not attached to connectors become
   `looseTexts`.
4. **Label absorption:** a loose text positioned over an empty shape becomes that shape's label.
5. **Edges:** connectors whose both ends are in scope. Direction follows the stroke caps: an arrow only
   at the start reverses the edge, and no arrows at all makes it undirected. Captions become the edge label.
6. **Order:** roots (in-degree 0) sorted by position, then an iterative DFS. Children are sorted by `y`,
   then `x` when |Δy| ≤ 30. Components without a root are visited after that.
7. **Back edges:** an edge to a node on the DFS stack is a loop (`↩`). Merges into already-visited nodes
   are not loops.
8. **Keys** `N1…Nn` in DFS order. Ends are nodes with out-degree 0.
9. **Notes:** unconnected nodes and loose texts with a label, each with the nearest connected node.
10. **Warnings** (structured, translated in the UI): `{ code: 'stencils', n }`.

`render(raw, { selectionOnly, format, opts, lang, templateBody })` returns `{ text, graph, tokens, fmt, ms }`.
`opts.lang === 'ui'` means "use `lang`" (the resolved UI language).

## Settings schema (`chrome.storage.local.settings`, v3)

```js
{
  v: 3,
  uiLang: 'auto' | 'en' | 'uk' | 'ru',
  format: 'llm' | 'mermaid' | 'json',
  selectionOnly: boolean,
  autoUpdate: boolean,
  templateId: '' | string,
  optsOpen: boolean,
  opts: { lang: 'ui'|'en'|'uk'|'ru', showTypes, includeNotes, includeFrames, includeIds, mermaidDir: 'TD'|'LR'|'BT'|'RL' },
  templates: Array<{ id, builtin: true } | { id, name, body }>,
}
```

Built-in templates are references (`builtin: true`) rendered in the current language. Saving an edited
built-in turns it into `{ id, name, body }`. "Restore built-in templates" turns it back into a reference.
`migrate()` upgrades v0.2 settings, which had no `v` and stored built-ins as English text.

## i18n

- UI: `DICT` in `i18n.js`, applied through `data-i18n`, `data-i18n-title` and `data-i18n-ph` attributes plus
  `T()` calls. Language resolution: setting → `navigator.languages` → `chrome.i18n.getUILanguage()` →
  the `Intl` locale → `en`.
- Output text: `LEGEND` in `format.js` (title, stats line, legend, notes header…).
- Store listing: `_locales/*/messages.json` (`extName` ≤ 75 chars, `extDescription` ≤ 132 chars).
