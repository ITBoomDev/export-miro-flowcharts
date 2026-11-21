# Decisions

Short records of choices that are not obvious from the code. Add new ones at the end.

## D1. A Chrome extension, not an MCP server or a Miro app

- **Context:** the goal is visibility through a useful open-source tool plus an article.
- **Options:** our own MCP server; a Miro app (Web SDK, Marketplace); a Chrome extension.
- **Decision:** a Chrome extension.
- **Why:** an official Miro MCP server already exists, plus a popular community one with 88 tools. A third
  MCP limited by the public API, which can't read stencils, would lose. The gap is users without MCP:
  ChatGPT or Gemini web, corporate LLMs, and Enterprise accounts where the admin hasn't enabled MCP. It
  also covers one-off pastes into a prompt. `window.miro` turned out to be available in the top frame
  of a normal board, so the extension works without installing anything on the board.
- **Risk:** this depends on an undocumented or experimental API. Miro can break it. The README says
  "works as of November 2026".

## D2. Read via the page's `window.miro` in the MAIN world

The REST API and the stable SDK don't return flowchart text. Only `miro.board.experimental` does, and it
lives in the page, so scripts are injected with `world: 'MAIN'`. Extension content scripts run in an
isolated world and can't see `window.miro`.

## D3. The LLM output format is an adjacency list

The default format is not Mermaid. Each node appears once, with its outgoing transitions right below it.
IDs are short (`N1`), which saves tokens and avoids near-identical 19-digit numbers. Nodes follow DFS
order from the entry points, so the text reads like the scenario. Loops are marked `↩` only for real back
edges, and the header gives explicit entries and ends. Frames become sections, and unconnected comments
become notes anchored to the nearest node. Mermaid and JSON are available as alternatives.

## D4. A side panel instead of a popup

A popup closes when you click the board, which breaks the "select, look, select again" loop. The side panel
stays open and updates live.

## D5. A host permission on boards instead of `activeTab`

Live mode has to poll the tab without a user gesture, which `activeTab` doesn't allow. The host permission
is scoped to `https://miro.com/app/board/*` only. The extension makes no network requests.

## D6. No build step, no runtime dependencies

The code is vanilla ES modules loaded by Chrome directly. That makes it easy to audit (good for Chrome Web
Store review and for article readers) and keeps it trivial to fork. The token count is a heuristic
(ASCII ≈ 4 chars per token, other scripts ≈ 2) rather than a bundled tokenizer.

## D7. The hotkey copies from an injected isolated-world function

There is no offscreen document. `navigator.clipboard.writeText` runs in the page after the key press,
with an `execCommand('copy')` fallback, and the `clipboardWrite` permission makes the fallback reliable.
The toast is plain DOM in the page.

## D8. Built-in templates are stored as references

`{ id, builtin: true }` lets built-in templates follow the UI language. Saving an edited one copies its
text, so it becomes a regular template. Untouched v0.2 templates are migrated back to references.

## D9. Cache plus change events for performance

v0.2 re-read the whole board twice (experimental and stable `get()`) on every selection change. v0.3
reads once and re-renders selection changes from cache. It re-reads only on create, delete or update
events, and falls back to re-reading on selection change when events are unavailable. The formatter
itself handles 3000 nodes in about 130 ms, so it isn't the bottleneck.

## D10. Name: "Export Miro Flowcharts"

- **Rejected:** "FlowPrompt" and "PromptFlow", which are taken in the Chrome Web Store.
- **Rejected:** "Miro Advanced Export" and "Export Miro Board". They read as the native PDF or PNG export
  that Miro already has, which invites one-star reviews, and they look like an official Miro product.
- **Rejected:** "Edgewise", a strong brand with weaker search.
- **Chosen:** "Export Miro Flowcharts — to LLM, Mermaid & JSON". It is search-friendly, promises exactly
  what the extension does, and isn't a native feature name. The README carries a "Not affiliated with
  Miro" line.

## D11. Bun as the dev toolchain, npm dropped

- **Context:** the dev machine has Bun but no Node, and every script was `npm run …`.
- **Decision:** all scripts run with `bun` (`bun test`, `bun run smoke/typecheck/zip/icons`); the
  lockfile is `bun.lock`. Tests keep importing `node:test`/`node:assert`, which Bun maps to its own
  runner, so they still run on Node 20+ (`node --test test/*.test.mjs`) — useful for CI diversity.
- **Why not Node:** nothing in the project needs Node specifically; Bun starts faster and is what's
  installed. **Why not Bun APIs** (`bun:test`, `Bun.file`): keeping the `node:*` surface keeps the test
  suite portable and the scripts runnable by contributors on either runtime.
- **Scope:** dev-only. The shipped extension has no runtime, no bundling, no install step for users.

## D12. No TypeScript migration; types via JSDoc + `tsc --checkJs`

- **Context:** should the source move to `.ts` (compiled with Bun or tsc)?
- **Decision:** no. Chrome can't load `.ts`, so TS would force a build step and break D6 (the audit
  story "what you load unpacked is exactly what ships", which matters for Chrome Web Store review and
  for article readers). The code is ~1500 lines and already fully covered by tests.
- **Instead:** `bun run typecheck` runs `tsc` with `checkJs` over `src/` (see `jsconfig.json`), with
  `chrome-types` for `chrome.*` and `types/globals.d.ts` for `window.miro`/`__emfWatch`. That catches
  typos and wrong call signatures at ~zero cost. JSDoc annotations are added only where inference
  fails, not everywhere.
- **Revisit if:** the codebase grows past the point where JSDoc is painful (complex generics, many
  contributors), in which case TS + a checked-in build with source maps would be the path.
