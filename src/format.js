// Pure graph builder + formatters. No browser APIs — testable in Node.

export const clean = s => String(s ?? '')
  .replace(/<\/(p|div|li)>|<br\s*\/?>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const kindOf = i => i.type === 'shape' ? (i.shape || 'shape').replace(/^flow_chart_/, '') : i.type;

export function buildGraph(raw, { selectionOnly = true } = {}) {
  const items = raw.items || [];
  const byId = new Map(items.map(i => [i.id, i]));
  const warnings = [];

  // scope: selection + descendants of selected frames
  let scope = null;
  if (selectionOnly && raw.selection?.length) {
    scope = new Set(raw.selection);
    for (let grew = true; grew;) {
      grew = false;
      for (const i of items) {
        if (!scope.has(i.id) && i.parentId && scope.has(i.parentId)) { scope.add(i.id); grew = true; }
      }
    }
  }
  const inScope = i => !scope || scope.has(i.id);

  // absolute coords: children of frames are relative to parent's top-left
  const absCache = new Map();
  const abs = i => {
    if (absCache.has(i.id)) return absCache.get(i.id);
    let x = i.x ?? 0, y = i.y ?? 0;
    const p = i.parentId && byId.get(i.parentId);
    if (p && i.relativeTo === 'parent_top_left') {
      const pa = abs(p);
      x += pa.x - (p.width ?? 0) / 2;
      y += pa.y - (p.height ?? 0) / 2;
    }
    const r = { x, y };
    absCache.set(i.id, r);
    return r;
  };

  const frames = new Map(items.filter(i => i.type === 'frame').map(f => [f.id, clean(f.title) || 'Untitled frame']));
  const connectors = items.filter(i => i.type === 'connector');
  const endpointIds = new Set(connectors.flatMap(c => [c.start?.item, c.end?.item]).filter(Boolean));

  const nodes = new Map();
  const looseTexts = [];
  for (const i of items) {
    if (i.type === 'connector' || i.type === 'frame' || !inScope(i)) continue;
    const n = {
      id: i.id, kind: kindOf(i), ...abs(i), w: i.width, h: i.height,
      label: clean(i.content || i.title || i.text || i.description),
      frame: frames.get(i.parentId),
    };
    if (i.type === 'text' && !endpointIds.has(i.id)) looseTexts.push(n);
    else nodes.set(i.id, n);
  }

  // separate text layers placed over empty shapes become their label
  const absorbed = new Set();
  for (const n of nodes.values()) {
    if (n.label || n.w === undefined) continue;
    const inside = looseTexts.filter(t =>
      Math.abs(t.x - n.x) <= n.w / 2 + 20 && Math.abs(t.y - n.y) <= n.h / 2 + 20);
    inside.sort((a, b) => a.y - b.y).forEach(t => absorbed.add(t.id));
    n.label = inside.map(t => t.label).filter(Boolean).join(' — ');
  }

  const stencils = [...nodes.values()].filter(n => n.kind === 'stencil').length;
  if (stencils) warnings.push({ code: 'stencils', n: stencils });

  // edges; direction follows arrowheads
  const edges = [];
  for (const c of connectors) {
    let a = c.start?.item, b = c.end?.item;
    if (!nodes.has(a) || !nodes.has(b)) continue;
    const sc = c.style?.startStrokeCap, ec = c.style?.endStrokeCap;
    let directed = true;
    if (ec === 'none' && sc && sc !== 'none') [a, b] = [b, a];
    else if (ec === 'none' && (!sc || sc === 'none')) directed = false;
    edges.push({ from: a, to: b, directed, label: clean((c.captions || []).map(x => x.content).join(' ')) });
  }

  const out = new Map([...nodes.keys()].map(id => [id, []]));
  const indeg = new Map([...nodes.keys()].map(id => [id, 0]));
  edges.forEach(e => { out.get(e.from).push(e); indeg.set(e.to, indeg.get(e.to) + 1); });

  const P = id => nodes.get(id);
  const byPos = (a, b) => (Math.abs(P(a).y - P(b).y) > 30 ? P(a).y - P(b).y : P(a).x - P(b).x);
  out.forEach(list => list.sort((e1, e2) => byPos(e1.to, e2.to)));

  const connected = [...nodes.keys()].filter(id => out.get(id).length || indeg.get(id));
  const roots = connected.filter(id => indeg.get(id) === 0).sort(byPos);

  // DFS preorder; back edges (to a node on the stack) are true loops, not merges
  const order = [], seen = new Set(), onStack = new Set(), back = new Set();
  const stack = [];
  const visit = start => {
    // iterative DFS to survive large boards
    stack.push({ id: start, i: 0 });
    seen.add(start); onStack.add(start); order.push(start);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const list = out.get(top.id);
      if (top.i >= list.length) { onStack.delete(top.id); stack.pop(); continue; }
      const e = list[top.i++];
      if (onStack.has(e.to)) back.add(e);
      else if (!seen.has(e.to)) {
        seen.add(e.to); onStack.add(e.to); order.push(e.to);
        stack.push({ id: e.to, i: 0 });
      }
    }
  };
  roots.forEach(id => !seen.has(id) && visit(id));
  [...connected].sort(byPos).forEach(id => !seen.has(id) && visit(id));

  const key = new Map(order.map((id, i) => [id, `N${i + 1}`]));

  const gNodes = order.map(id => {
    const n = nodes.get(id);
    return {
      key: key.get(id), id, kind: n.kind, label: n.label, frame: n.frame ?? null,
      out: out.get(id).map(e => ({ to: key.get(e.to), label: e.label, directed: e.directed, loop: back.has(e) })),
    };
  });

  // unconnected items with text → notes, anchored to the nearest connected node
  const noteSrc = [
    ...[...nodes.values()].filter(n => !key.has(n.id)),
    ...looseTexts.filter(t => !absorbed.has(t.id)),
  ].filter(n => n.label).sort((a, b) => a.y - b.y || a.x - b.x);

  const notes = noteSrc.map(n => {
    let best = null, bd = Infinity;
    for (const id of order) {
      const m = nodes.get(id), d = Math.hypot(m.x - n.x, m.y - n.y);
      if (d < bd) { bd = d; best = id; }
    }
    return { kind: n.kind, label: n.label, frame: n.frame ?? null, near: best ? key.get(best) : null };
  });

  return {
    nodes: gNodes,
    edgeCount: edges.length,
    entries: roots.map(id => key.get(id)),
    ends: order.filter(id => !out.get(id).length).map(id => key.get(id)),
    notes,
    hasFrames: frames.size > 0,
    warnings,
    scoped: !!scope,
  };
}

// ───────────────────────── formatters ─────────────────────────

export const DEFAULT_OPTS = {
  lang: 'ui',          // output language: ui (follow interface) | en | uk | ru
  showTypes: true,     // (decision), (process)…
  includeNotes: true,  // unconnected stickies/texts
  includeFrames: true, // frames → sections / subgraphs
  includeIds: false,   // original Miro item IDs (for round-trips)
  mermaidDir: 'TD',
};

const LEGEND = {
  en: {
    title: name => (name ? `# Flowchart: ${name} (exported from Miro)` : '# Flowchart (exported from Miro)'),
    stats: (n, e, en, end) => `Nodes: ${n}. Edges: ${e}. Entry: ${en}. End: ${end}.`,
    legend: t => `Format: \`Nx ${t ? '(type) ' : ''}label\`, then its outgoing transitions \`→ [condition] Ny\`. \`↩\` = back edge (loop). \`—\` = undirected link.`,
    statsShort: (n, e) => `${n} nodes, ${e} edges`,
    outside: '(outside frames)', notes: '## Notes (not connected)', near: 'near', noText: '(no text)',
  },
  uk: {
    title: name => (name ? `# Блок-схема: ${name} (експорт з Miro)` : '# Блок-схема (експорт з Miro)'),
    stats: (n, e, en, end) => `Вузлів: ${n}. Зв'язків: ${e}. Вхід: ${en}. Кінець: ${end}.`,
    legend: t => `Формат: \`Nx ${t ? '(тип) ' : ''}текст\`, далі вихідні переходи \`→ [умова] Ny\`. \`↩\` — зворотний перехід (цикл). \`—\` — зв'язок без напрямку.`,
    statsShort: (n, e) => `вузлів: ${n}, зв'язків: ${e}`,
    outside: '(поза фреймами)', notes: '## Нотатки (не пов\'язані)', near: 'біля', noText: '(без тексту)',
  },
  ru: {
    title: name => (name ? `# Блок-схема: ${name} (экспорт из Miro)` : '# Блок-схема (экспорт из Miro)'),
    stats: (n, e, en, end) => `Узлов: ${n}. Связей: ${e}. Вход: ${en}. Конец: ${end}.`,
    legend: t => `Формат: \`Nx ${t ? '(тип) ' : ''}текст\`, затем исходящие переходы \`→ [условие] Ny\`. \`↩\` — обратный переход (цикл). \`—\` — связь без направления.`,
    statsShort: (n, e) => `узлов: ${n}, связей: ${e}`,
    outside: '(вне фреймов)', notes: '## Заметки (не связаны)', near: 'рядом с', noText: '(без текста)',
  },
};

// nodes grouped by frame, frames in order of first appearance, DFS order kept inside
const groupByFrame = nodes => {
  const groups = new Map();
  for (const n of nodes) {
    const k = n.frame ?? null;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(n);
  }
  return groups;
};

/** @typedef {Partial<typeof DEFAULT_OPTS> & { boardName?: string }} FormatOpts */

/** @param {FormatOpts} [opts] */
export function formatLLM(g, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const t = LEGEND[o.lang] || LEGEND.en;
  const L = [t.title(o.boardName), t.stats(g.nodes.length, g.edgeCount, g.entries.join(', ') || '—', g.ends.join(', ') || '—'), t.legend(o.showTypes)];

  const line = n => `${n.key}${o.showTypes ? ` (${n.kind})` : ''} ${n.label || t.noText}${o.includeIds ? ` <miro:${n.id}>` : ''}`;
  const block = n => {
    L.push(line(n));
    for (const e of n.out) {
      L.push(`  ${e.directed ? '→' : '—'} ${e.label ? `[${e.label}] ` : ''}${e.to}${e.loop ? ' ↩' : ''}`);
    }
  };

  if (o.includeFrames && g.hasFrames) {
    for (const [frame, nodes] of groupByFrame(g.nodes)) {
      L.push('', `## ${frame ?? t.outside}`);
      nodes.forEach(block);
    }
  } else {
    L.push('');
    g.nodes.forEach(block);
  }

  if (o.includeNotes && g.notes.length) {
    L.push('', t.notes);
    for (const n of g.notes) {
      L.push(`- ${o.showTypes ? `(${n.kind}) ` : ''}${n.label}${n.near ? ` — ${t.near} ${n.near}` : ''}`);
    }
  }
  return L.join('\n') + '\n';
}

const MERMAID_SHAPE = {
  decision: ['{', '}'], rhombus: ['{', '}'],
  terminator: ['([', '])'], start_end: ['([', '])'], round_rectangle: ['(', ')'],
  circle: ['((', '))'], connector: ['((', '))'],
  magnetic_disk: ['[(', ')]'], database: ['[(', ')]'],
  input_output: ['[/', '/]'], parallelogram: ['[/', '/]'],
  predefined_process: ['[[', ']]'], hexagon: ['{{', '}}'], preparation: ['{{', '}}'],
};

export function formatMermaid(g, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const q = s => String(s).replace(/"/g, '#quot;');
  const node = (n, pad) => {
    const [a, b] = MERMAID_SHAPE[n.kind] || ['[', ']'];
    return `${pad}${n.key}${a}"${q(n.label || n.kind)}"${b}`;
  };
  const L = [`flowchart ${o.mermaidDir}`];

  if (o.includeFrames && g.hasFrames) {
    let fi = 0;
    for (const [frame, nodes] of groupByFrame(g.nodes)) {
      if (frame == null) { nodes.forEach(n => L.push(node(n, '  '))); continue; }
      L.push(`  subgraph F${++fi}["${q(frame)}"]`);
      nodes.forEach(n => L.push(node(n, '    ')));
      L.push('  end');
    }
  } else {
    g.nodes.forEach(n => L.push(node(n, '  ')));
  }

  for (const n of g.nodes) {
    for (const e of n.out) {
      L.push(`  ${n.key} ${e.directed ? '-->' : '---'}${e.label ? `|"${q(e.label)}"|` : ''} ${e.to}`);
    }
  }
  return L.join('\n') + '\n';
}

export function formatJSON(g, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const doc = {
    entries: g.entries,
    ends: g.ends,
    nodes: g.nodes.map(n => ({
      id: n.key,
      type: n.kind,
      label: n.label,
      ...(o.includeFrames ? { frame: n.frame } : {}),
      ...(o.includeIds ? { miroId: n.id } : {}),
    })),
    edges: g.nodes.flatMap(n => n.out.map(e => ({
      from: n.key, to: e.to, label: e.label || null, directed: e.directed, loop: e.loop,
    }))),
  };
  if (o.includeNotes) doc.notes = g.notes.map(n => (o.includeFrames ? n : { kind: n.kind, label: n.label, near: n.near }));
  return JSON.stringify(doc, null, 2) + '\n';
}

export const FORMATS = {
  llm: { key: 'llm', label: 'LLM text', fn: formatLLM, ext: 'md', mime: 'text/markdown' },
  mermaid: { key: 'mermaid', label: 'Mermaid', fn: formatMermaid, ext: 'mmd', mime: 'text/plain' },
  json: { key: 'json', label: 'JSON', fn: formatJSON, ext: 'json', mime: 'application/json' },
};

// ───────────────────────── templates & tokens ─────────────────────────

export const PLACEHOLDERS = ['{{flowchart}}', '{{board_name}}', '{{board_url}}', '{{stats}}'];

export function applyTemplate(body, text, ctx = {}) {
  if (!body?.trim()) return text;
  const withText = body.includes('{{flowchart}}') ? body : `${body.trimEnd()}\n\n{{flowchart}}`;
  return withText
    .split('{{flowchart}}').join(text.trimEnd())
    .split('{{board_url}}').join(ctx.boardUrl || '')
    .split('{{board_name}}').join(ctx.boardName || '')
    .split('{{stats}}').join(ctx.stats || '')
    .trimEnd() + '\n';
}

// Rough estimate without shipping a tokenizer: ~4 chars/token for ASCII,
// Cyrillic and other scripts tokenize ~2x worse.
export function estimateTokens(text) {
  let ascii = 0, other = 0;
  for (const ch of text) (ch.charCodeAt(0) < 128 ? ascii++ : other++);
  return Math.ceil(ascii / 4 + other / 2);
}

export const fmtTokens = t => (t < 1000 ? String(t) : `${(t / 1000).toFixed(t < 10000 ? 1 : 0)}k`);

// One entry point for the panel and the hotkey.
// cfg: { selectionOnly, format, opts, lang (resolved UI language), templateBody }
export function render(raw, cfg) {
  const t0 = performance.now();
  const graph = buildGraph(raw, { selectionOnly: cfg.selectionOnly });
  const fmt = FORMATS[cfg.format] || FORMATS.llm;
  const o = { ...DEFAULT_OPTS, ...cfg.opts, boardName: raw.boardName || '' };
  if (!(o.lang in LEGEND)) o.lang = cfg.lang in LEGEND ? cfg.lang : 'en';
  let text = fmt.fn(graph, o);
  if (cfg.templateBody) {
    text = applyTemplate(cfg.templateBody, text, {
      boardUrl: raw.url,
      boardName: raw.boardName,
      stats: LEGEND[o.lang].statsShort(graph.nodes.length, graph.edgeCount),
    });
  }
  return { text, graph, tokens: estimateTokens(text), fmt, ms: performance.now() - t0 };
}
