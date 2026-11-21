# Miro SDK notes

What the extension relies on, and how sure we are about each part. Re-check anything marked
**assumed** on a real board before building on it, and move it to "verified" afterwards.

## Verified on a real board (November 2026)

- `window.miro` exists in the **top frame** of a normal board page (`https://miro.com/app/board/…`) with no
  Miro app installed or open. `typeof miro?.board?.experimental === 'object'`.
- `miro.board.get()` returns flowchart shapes as `type: 'stencil'` with **no text**. It only gives id,
  geometry, `connectorIds` and metadata.
- `miro.board.experimental.get()` returns the same shapes as `type: 'shape'` **with `content`**. The text
  export worked on a real board through this namespace.
- Connectors expose `start.item` and `end.item`.

## Documented by Miro

- Stencil items are unsupported in the stable Web SDK and the REST API. Only `miro.board.experimental`
  returns flowchart shapes as `shape`.
  <https://developers.miro.com/docs/shape_shapeexperimental>
- An official Miro MCP server exists (`https://mcp.miro.com`, tools such as `context_get` and
  `canvas_read_as_svg`). Enterprise admins must enable it.
  <https://developers.miro.com/docs/miro-mcp>

## Assumed (not yet verified on a real board)

| Assumption | Where it's used | If wrong |
|---|---|---|
| `experimental.get()` also returns connectors, frames, texts and stickies | `extractBoard` | Connectors already have a fallback. Missing frames or texts would mean no sections or notes |
| Flowchart `shape` names start with `flow_chart_` (`flow_chart_decision`, `…_terminator`, `…_process`, `…_magnetic_disk`, `…_input_output`, `…_predefined_process`) | `kindOf`, `MERMAID_SHAPE` | Wrong node types and default Mermaid shapes. Text and edges are unaffected |
| Frame children use `relativeTo: 'parent_top_left'` | `buildGraph` `abs()` | Notes attach to the wrong nodes, label absorption fails, ordering is off |
| `board.ui.on('items:create' \| 'items:delete' \| 'experimental:items:update')` works in the top frame | `installWatcher` | `events: false`, so every selection change does a full re-read (slower, still correct) |
| Connector `style.startStrokeCap` / `endStrokeCap` use `'none'` for no arrow | edge direction | Edges drawn backwards are not reversed, or links without arrows look directed |
| `captions[].content` is HTML | edge labels | Labels contain tags (`clean()` strips HTML anyway) |
| Tab title is `"<Board> - Miro"` or `"<Board>, Online Whiteboard…"` | `boardName` | A stray suffix in the board name. Fix the regex in `extractBoard` |
| `getInfo()` has no `name` | `boardName` | None: it's preferred when present |
| `getSelection()` is cheap enough to poll every 400 ms | live mode | Raise `POLL_MS` in panel.js |

## How to inspect on a real board

In DevTools on the board tab, with the `top` context selected:

```js
const exp = await miro.board.experimental.get();
console.table(exp.map(i => ({ type: i.type, shape: i.shape, rel: i.relativeTo, parent: i.parentId, text: (i.content || i.title || '').slice(0, 40) })));
(await miro.board.get({ type: 'connector' })).slice(0, 3).map(c => ({ start: c.start, end: c.end, style: c.style, captions: c.captions }));
document.title;
await miro.board.getInfo();
miro.board.ui.on('experimental:items:update', e => console.log('update', e)); // then edit a shape
```
