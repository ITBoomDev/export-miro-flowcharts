// Functions in this file run in the page's MAIN world via chrome.scripting.executeScript({ func }).
// Each one must be fully self-contained: it is serialized with Function.prototype.toString.

// Full read of the board. One SDK call for items (experimental returns flowchart shapes
// with text); stable API is only asked for connectors if experimental didn't return any.
export async function extractBoard() {
  const t0 = performance.now();
  try {
    for (let i = 0; i < 50 && !window.miro?.board; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    const board = window.miro?.board;
    if (!board) return { errorCode: 'no_sdk' };

    const exp = board.experimental;
    const [first, selection, info] = await Promise.all([
      exp ? exp.get() : board.get(),
      board.getSelection(),
      typeof board.getInfo === 'function' ? board.getInfo().catch(() => null) : null,
    ]);

    let items = first;
    if (exp && !items.length) items = await board.get();
    else if (exp && !items.some(i => i.type === 'connector')) items = items.concat(await board.get({ type: 'connector' }));
    const tGet = performance.now();

    const pick = i => ({
      id: i.id,
      type: i.type,
      shape: i.shape,
      parentId: i.parentId ?? null,
      relativeTo: i.relativeTo,
      x: i.x, y: i.y, width: i.width, height: i.height,
      content: typeof i.content === 'string' ? i.content : undefined,
      title: typeof i.title === 'string' ? i.title : undefined,
      text: typeof i.text === 'string' ? i.text : undefined,
      description: typeof i.description === 'string' ? i.description : undefined,
      start: i.start?.item ? { item: i.start.item } : undefined,
      end: i.end?.item ? { item: i.end.item } : undefined,
      style: i.type === 'connector' && i.style
        ? { startStrokeCap: i.style.startStrokeCap, endStrokeCap: i.style.endStrokeCap }
        : undefined,
      captions: Array.isArray(i.captions) ? i.captions.map(c => ({ content: c.content })) : undefined,
    });

    const byId = new Map();
    for (const i of items) byId.set(i.id, pick(i));

    // Board name: SDK if it ever exposes it, otherwise the tab title without Miro's suffix.
    const fromTitle = String(document.title || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[-|–—]\s*Miro\s*$/i, '')
      .replace(/,\s*[^,]*(whiteboard|доска|дошка|tablero|tableau|lavagna)[^,]*$/i, '')
      .trim();
    const boardName = (typeof info?.name === 'string' && info.name.trim()) || (fromTitle && !/^miro$/i.test(fromTitle) ? fromTitle : null);

    return {
      items: [...byId.values()],
      selection: selection.map(i => i.id),
      experimental: !!exp,
      url: location.href,
      boardName,
      ver: window.__emfWatch?.ver ?? 0,
      perf: { getMs: Math.round(tGet - t0), totalMs: Math.round(performance.now() - t0), items: byId.size },
    };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

// Installs board-change listeners once per page. `ver` bumps on create/delete/update,
// so the panel can re-read the board only when it actually changed.
export async function installWatcher() {
  const w = (window.__emfWatch ??= { ver: 0, events: false, installed: false });
  const ui = window.miro?.board?.ui;
  if (w.installed || typeof ui?.on !== 'function') return w.events;
  w.installed = true;
  const bump = () => { w.ver++; };
  const tryOn = async ev => { try { await ui.on(ev, bump); return true; } catch { return false; } };
  const [, , updates] = await Promise.all([tryOn('items:create'), tryOn('items:delete'), tryOn('experimental:items:update')]);
  w.events = updates; // without update events we can't trust the cache
  return w.events;
}

// Cheap poll: selection + change counter.
export async function pollState() {
  try {
    const sel = await window.miro.board.getSelection();
    const w = window.__emfWatch;
    return { sel: sel.map(i => i.id).sort().join(','), ver: w?.ver ?? 0, events: !!w?.events };
  } catch {
    return null;
  }
}
