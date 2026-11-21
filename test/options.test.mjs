import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, formatLLM, formatMermaid, formatJSON, applyTemplate, estimateTokens, render } from '../src/format.js';

const S = (id, shape, content, x, y, parentId) => ({
  id, type: 'shape', shape: `flow_chart_${shape}`, content, x, y, width: 200, height: 80,
  ...(parentId ? { parentId, relativeTo: 'parent_top_left' } : {}),
});
const C = (id, a, b, cap) => ({ id, type: 'connector', start: { item: a }, end: { item: b }, captions: cap ? [{ content: cap }] : [] });

const raw = {
  url: 'https://miro.com/app/board/uXjVabc=/',
  selection: [],
  items: [
    { id: 'F1', type: 'frame', title: 'Auth', x: 0, y: 0, width: 1000, height: 1000 },
    { id: 'F2', type: 'frame', title: 'Billing', x: 2000, y: 0, width: 1000, height: 1000 },
    S('a', 'terminator', 'Start', 100, 100, 'F1'),
    S('b', 'decision', 'Paid?', 100, 300, 'F1'),
    S('c', 'process', 'Charge', 100, 100, 'F2'),
    S('d', 'terminator', 'Done', 100, 400, 'F1'),
    C('1', 'a', 'b'), C('2', 'b', 'c', 'no'), C('3', 'b', 'd', 'yes'), C('4', 'c', 'd'),
  ],
};

test('frames are grouped once each (no duplicated headers)', () => {
  const t = formatLLM(buildGraph(raw));
  assert.equal(t.match(/^## Auth$/gm).length, 1);
  assert.equal(t.match(/^## Billing$/gm).length, 1);
});

test('option toggles', () => {
  const g = buildGraph(raw);
  const t = formatLLM(g, { showTypes: false, includeFrames: false, includeIds: true });
  assert.doesNotMatch(t, /\(decision\)/);
  assert.doesNotMatch(t, /^## /m);
  assert.match(t, /N\d Paid\? <miro:b>/);
});

test('ukrainian legend', () => {
  const t = formatLLM(buildGraph(raw), { lang: 'uk' });
  const r = formatLLM(buildGraph(raw), { lang: 'ru', boardName: 'Доска' });
  assert.match(r, /^# Блок-схема: Доска \(экспорт из Miro\)\nУзлов: 4/);
  assert.match(t, /^# Блок-схема/);
  assert.match(t, /Вузлів: 4/);
});

test('mermaid subgraphs and direction', () => {
  const m = formatMermaid(buildGraph(raw), { mermaidDir: 'LR' });
  assert.match(m, /^flowchart LR/);
  assert.match(m, /subgraph F1\["Auth"\]/);
  assert.match(m, /subgraph F2\["Billing"\]/);
  assert.equal(m.match(/^\s+end$/gm).length, 2);
});

test('json options', () => {
  const j = JSON.parse(formatJSON(buildGraph(raw), { includeIds: true, includeNotes: false }));
  assert.ok(j.nodes.every(n => n.miroId));
  assert.equal(j.notes, undefined);
});

test('templates', () => {
  assert.equal(applyTemplate('Q:\n{{flowchart}}\nURL {{board_url}}', 'X', { boardUrl: 'u' }), 'Q:\nX\nURL u\n');
  assert.equal(applyTemplate('No placeholder', 'X'), 'No placeholder\n\nX\n');
  assert.equal(applyTemplate('', 'X'), 'X');
});

test('render() wires template + tokens + board name', () => {
  const r = render({ ...raw, boardName: 'Checkout v2' }, {
    format: 'llm', selectionOnly: true, opts: {}, lang: 'en',
    templateBody: 'Analyze {{board_name}} ({{stats}}):\n{{flowchart}}',
  });
  assert.match(r.text, /^Analyze Checkout v2 \(4 nodes, 4 edges\):\n# Flowchart: Checkout v2/);
  assert.ok(r.tokens > 0);
  assert.ok(estimateTokens('привіт') > estimateTokens('hello!'));
});
