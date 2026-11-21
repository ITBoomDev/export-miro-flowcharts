// End-to-end smoke test: loads the unpacked extension into Chromium, serves a fake Miro board
// with a mocked `window.miro` SDK, and drives the side panel + hotkey path.
//
//   npm run smoke                     # uses Playwright's bundled Chromium (npx playwright-core install chromium)
//   CHROME_PATH=/path/to/chrome npm run smoke
//   HEADED=1 npm run smoke            # watch it
//
// Branded Google Chrome 137+ ignores --load-extension. Use Chromium or Chrome for Testing.

import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BOARD = 'https://miro.com/app/board/uXjVtest=/';
const OUT = process.env.SMOKE_OUT || mkdtempSync(resolve(tmpdir(), 'emf-smoke-'));
const mockPage = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'mock-board.html'), 'utf8');

const step = (name, ok = true) => console.log(`${ok ? '✓' : '✗'} ${name}`);

const ctx = await chromium.launchPersistentContext(mkdtempSync(resolve(tmpdir(), 'emf-profile-')), {
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chromium' }),
  headless: !process.env.HEADED,
  locale: 'uk-UA',
  env: { ...process.env, LANG: 'C.UTF-8' }, // non-UTF-8 locales make Chrome drop Cyrillic download names
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--lang=uk'],
  viewport: { width: 380, height: 820 },
  acceptDownloads: true,
});

try {
  await ctx.route('https://miro.com/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: mockPage }));
  let [sw] = ctx.serviceWorkers();
  sw ??= await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const board = await ctx.newPage();
  await board.goto(BOARD);
  const boardTabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: 'https://miro.com/*' }))[0].id);

  const panel = await ctx.newPage();
  const errors = [];
  panel.on('pageerror', e => errors.push(e.message));
  panel.on('console', m => m.type() === 'error' && errors.push(m.text()));
  // In a test the panel is a tab, so its "active tab" would be itself: point it at the board.
  await panel.addInitScript(([id, url]) => {
    const q = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = async o => (o.active ? [{ id, url, windowId: o.windowId }] : q(o));
  }, [boardTabId, BOARD]);

  // 1. first load
  const t0 = Date.now();
  await panel.goto(`chrome-extension://${extId}/src/panel.html`);
  await panel.waitForFunction(() => document.querySelector('#out').value.length > 0, null, { timeout: 10_000 });
  const gets = await board.evaluate(() => window.__gets);
  assert.equal(gets, 1, 'first load must read the board exactly once');
  step(`first load ${Date.now() - t0} ms, 1 SDK read`);

  // 2. language auto-detect + board name
  assert.equal(await panel.evaluate(() => document.documentElement.lang), 'uk');
  assert.equal(await panel.textContent('#board'), 'Онбординг користувача v2');
  const out = await panel.inputValue('#out');
  assert.match(out, /^# Блок-схема: Онбординг користувача v2 \(експорт з Miro\)/);
  assert.match(out, /→ \[повтор\] N2 ↩/);
  assert.match(out, /Ліміт 3 спроби — біля N5/);
  step('uk auto-detected, board name, loop marker, notes');
  await panel.screenshot({ path: resolve(OUT, 'panel-uk.png') });

  // 3. selection change re-renders from cache, no SDK read
  await board.evaluate(() => { window.__sel = ['a', 'b', '1']; });
  await panel.waitForFunction(() => document.querySelector('#stats').textContent.startsWith('2 вузли'), null, { timeout: 5000 });
  assert.equal(await board.evaluate(() => window.__gets), 1, 'selection change must not re-read the board');
  step('selection change from cache, 0 extra reads');

  // 4. board edit event triggers one re-read
  await board.evaluate(() => {
    window.__exp.find(i => i.id === 'a').content = '<p>Старт</p>';
    window.__emit('experimental:items:update');
  });
  await panel.waitForFunction(() => document.querySelector('#out').value.includes('Старт'), null, { timeout: 5000 });
  assert.equal(await board.evaluate(() => window.__gets), 2);
  step('update event → 1 re-read');

  // 5. switch to Russian + template
  await panel.selectOption('#lang', 'ru');
  await panel.selectOption('#template', 'gaps');
  assert.match(await panel.textContent('#stats'), /^2 узла · 1 связь/);
  assert.match(await panel.inputValue('#out'), /^Проанализируй эту блок-схему/);
  step('ru UI + translated built-in template');
  await panel.screenshot({ path: resolve(OUT, 'panel-ru.png') });

  // 6. formats
  await panel.click('#seg-format button[data-v="mermaid"]');
  assert.match(await panel.inputValue('#out'), /flowchart TD/);
  await panel.click('#seg-format button[data-v="json"]');
  await panel.selectOption('#template', '');
  JSON.parse(await panel.inputValue('#out'));
  await panel.click('#seg-format button[data-v="llm"]');
  step('mermaid + valid json');

  // 7. download uses the board name
  const [dl] = await Promise.all([panel.waitForEvent('download'), panel.click('#download')]);
  assert.equal(dl.suggestedFilename(), 'Онбординг користувача v2.md');
  step('download file name from board name');

  // 8. hotkey path (same function chrome.commands calls)
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://miro.com' });
  await board.bringToFront();
  await sw.evaluate(async id => self.copyFlowchart(await chrome.tabs.get(id)), boardTabId);
  await board.waitForSelector('#__miro_llm_toast');
  assert.match(await board.textContent('#__miro_llm_toast'), /^✓ Скопировано 2 узла/);
  assert.match(await board.evaluate(() => navigator.clipboard.readText()), /^# Блок-схема/);
  step('hotkey: clipboard + toast');

  assert.deepEqual(errors, [], `console errors: ${errors.join(' | ')}`);
  step('no console errors');
  console.log(`\nScreenshots: ${OUT}`);
} catch (e) {
  step(e.message, false);
  process.exitCode = 1;
} finally {
  await ctx.close();
}
