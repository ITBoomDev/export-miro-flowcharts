import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, formatLLM, formatMermaid, formatJSON } from '../src/format.js';

const shape = (id, shape, content, x, y, extra = {}) =>
  ({ id, type: 'shape', shape: `flow_chart_${shape}`, content: `<p>${content}</p>`, x, y, width: 200, height: 80, ...extra });
const conn = (id, a, b, caption, style) =>
  ({ id, type: 'connector', start: { item: a }, end: { item: b }, captions: caption ? [{ content: caption }] : [], style });

const raw = {
  selection: [],
  items: [
    { id: 'F', type: 'frame', title: 'Login', x: 0, y: 0, width: 2000, height: 2000 },
    shape('a', 'terminator', 'Start', 0, 0),
    shape('b', 'decision', 'Has token?', 0, 200),
    shape('c', 'process', 'Validate &amp; refresh', -300, 400),
    shape('d', 'process', 'Show login', 300, 400),
    shape('e', 'terminator', 'Done', 0, 600),
    { id: 's', type: 'stencil', x: 900, y: 900, width: 10, height: 10 },
    { id: 'n', type: 'sticky_note', content: 'Max 3 retries', x: 320, y: 480 },
    { id: 't', type: 'text', content: 'loose label', x: 5000, y: 5000 },
    conn('1', 'a', 'b'),
    conn('2', 'b', 'c', 'yes'),
    conn('3', 'b', 'd', 'no'),
    conn('4', 'c', 'e'),
    conn('5', 'd', 'b', 'retry'),                                            // loop
    conn('6', 'e', 'd', null, { startStrokeCap: 'stealth', endStrokeCap: 'none' }), // reversed: d → e
  ],
};

test('structure', () => {
  const g = buildGraph(raw);
  const byLabel = Object.fromEntries(g.nodes.map(n => [n.label, n]));
  assert.equal(g.nodes.length, 5);
  assert.deepEqual(g.entries, ['N1']);
  assert.equal(byLabel['Start'].key, 'N1');
  assert.equal(byLabel['Validate & refresh'].kind, 'process');

  const dec = byLabel['Has token?'];
  assert.deepEqual(dec.out.map(e => e.label), ['yes', 'no']);

  const login = byLabel['Show login'];
  const retry = login.out.find(e => e.label === 'retry');
  assert.equal(retry.loop, true, 'retry is a back edge');
  assert.ok(login.out.some(e => e.to === byLabel['Done'].key), 'reversed arrow d → e');
  assert.ok(!byLabel['Validate & refresh'].out.some(e => e.loop), 'merge is not a loop');
});

test('notes and warnings', () => {
  const g = buildGraph(raw);
  const notes = g.notes.map(n => n.label);
  assert.ok(notes.includes('Max 3 retries'));
  assert.ok(notes.includes('loose label'));
  assert.equal(g.notes.find(n => n.label === 'Max 3 retries').near,
    g.nodes.find(n => n.label === 'Show login').key);
});

test('selection scope', () => {
  const g = buildGraph({ ...raw, selection: ['a', 'b', '1'] });
  assert.equal(g.nodes.length, 2);
  assert.equal(g.scoped, true);
});

test('formatters render', () => {
  const g = buildGraph(raw);
  const llm = formatLLM(g);
  assert.match(llm, /N2 \(decision\) Has token\?\n  → \[yes\] N3\n  → \[no\] N\d/);
  assert.match(llm, /↩/);
  const mmd = formatMermaid(g);
  assert.match(mmd, /N2\{"Has token\?"\}/);
  assert.match(mmd, /N1\(\["Start"\]\)/);
  const json = JSON.parse(formatJSON(g));
  assert.equal(json.edges.length, 6);
  console.log('\n' + llm + '\n' + mmd);
});
