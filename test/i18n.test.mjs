import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICT, LANGS, detectLang, makeT, resolveTemplate, BUILTIN_TEMPLATE_IDS } from '../src/i18n.js';
import { migrate } from '../src/settings.js';
import { render } from '../src/format.js';

test('detectLang picks the first supported browser language', () => {
  assert.equal(detectLang(['de-DE', 'uk-UA', 'en']), 'uk');
  assert.equal(detectLang(['ru_RU']), 'ru');
  assert.equal(detectLang(['fr', 'es']), 'en');
});

test('every language has every key (or a plural object with other)', () => {
  for (const code of Object.keys(LANGS)) {
    for (const [k, v] of Object.entries(DICT.en)) {
      assert.ok(k in DICT[code], `${code}.${k} missing`);
      if (typeof v === 'object') assert.ok(DICT[code][k].other, `${code}.${k}.other`);
    }
  }
});

test('plurals follow CLDR rules', () => {
  const uk = makeT('uk'), ru = makeT('ru'), en = makeT('en');
  assert.equal(uk('nodes', { n: 1 }), '1 вузол');
  assert.equal(uk('nodes', { n: 3 }), '3 вузли');
  assert.equal(uk('nodes', { n: 5 }), '5 вузлів');
  assert.equal(uk('nodes', { n: 21 }), '21 вузол');
  assert.equal(ru('edges', { n: 2 }), '2 связи');
  assert.equal(ru('edges', { n: 11 }), '11 связей');
  assert.equal(en('notes', { n: 1 }), '1 note');
});

test('built-in templates translate, edited ones keep their text', () => {
  const uk = makeT('uk');
  assert.equal(resolveTemplate({ id: 'gaps', builtin: true }, uk).name, 'Знайти логічні діри');
  assert.equal(resolveTemplate({ id: 'gaps', name: 'Mine', body: 'X' }, uk).name, 'Mine');
});

test('0.2 settings migrate untouched built-ins to translatable refs', () => {
  const s = migrate({
    opts: { lang: 'en' },
    templates: [
      { id: 'gaps', name: DICT.en.tpl_gaps_name, body: DICT.en.tpl_gaps_body },
      { id: 'tests', name: 'Edited', body: 'mine' },
      { id: 'tabc', name: 'Custom', body: 'c' },
    ],
  });
  assert.deepEqual(s.templates[0], { id: 'gaps', builtin: true });
  assert.equal(s.templates[1].name, 'Edited');
  assert.equal(s.opts.lang, 'ui');
  assert.equal(s.v, 3);
  assert.ok(BUILTIN_TEMPLATE_IDS.includes('state-machine'));
});

test('output language "ui" follows interface language', () => {
  const r = render({ items: [], selection: [] }, { format: 'llm', opts: { lang: 'ui' }, lang: 'ru' });
  assert.match(r.text, /^# Блок-схема/);
});

test('large board renders fast', () => {
  const N = 3000, items = [];
  for (let i = 0; i < N; i++) items.push({ id: `s${i}`, type: 'shape', shape: 'flow_chart_process', content: `Step ${i}`, x: (i % 50) * 250, y: Math.floor(i / 50) * 150, width: 200, height: 80 });
  for (let i = 0; i < N - 1; i++) items.push({ id: `c${i}`, type: 'connector', start: { item: `s${i}` }, end: { item: `s${i + 1}` } });
  for (let i = 0; i < 300; i++) items.push({ id: `n${i}`, type: 'sticky_note', content: `note ${i}`, x: i * 40, y: -500 });
  const r = render({ items, selection: [] }, { format: 'llm', opts: {}, lang: 'en' });
  assert.equal(r.graph.nodes.length, N);
  console.log(`render ${N} nodes + ${N - 1} edges + 300 notes: ${r.ms.toFixed(0)} ms`);
  assert.ok(r.ms < 1500, `too slow: ${r.ms} ms`);
});
