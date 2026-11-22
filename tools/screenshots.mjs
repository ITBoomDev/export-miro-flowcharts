// Generates Chrome Web Store assets into store/: five 1280×800 screenshots and a 440×280 promo tile.
// The real side panel is captured in Chromium against a demo board (tools/screenshots/demo-board.html)
// and placed next to a headline. No Miro UI is imitated.
//
//   bun run screenshots           (needs Chromium: bunx playwright-core install chromium, or CHROME_PATH)

import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'store');
const BOARD = 'https://miro.com/app/board/uXjVdemo=/';
const demoPage = readFileSync(resolve(ROOT, 'tools/screenshots/demo-board.html'), 'utf8');
const iconUri = `data:image/png;base64,${readFileSync(resolve(ROOT, 'icons/icon128.png')).toString('base64')}`;

mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, 'screenshots'), { recursive: true });

const ctx = await chromium.launchPersistentContext(mkdtempSync(resolve(tmpdir(), 'emf-shots-')), {
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chromium' }),
  headless: true,
  locale: 'en-US',
  env: { ...process.env, LANG: 'C.UTF-8' },
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=en'],
  viewport: { width: 400, height: 740 },
});

const css = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; font-family: 'Segoe UI', system-ui, sans-serif; color: #fff;
    background: radial-gradient(1200px 800px at 15% 10%, #3a4bd0 0%, #1e2a78 45%, #131a4d 100%);
    display: flex; align-items: center; justify-content: space-between; padding: 0 90px 0 100px; overflow: hidden; }
  .copy { width: 640px; }
  .tag { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 20px; opacity: .85; margin-bottom: 28px; }
  .tag img { width: 36px; height: 36px; border-radius: 9px; }
  h1 { font-size: 60px; line-height: 1.08; font-weight: 700; letter-spacing: -1px; margin-bottom: 26px; }
  p { font-size: 26px; line-height: 1.4; opacity: .88; max-width: 560px; }
  .shot { border-radius: 14px; box-shadow: 0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.12); display: block; }
`;

const compose = (title, sub, shotUri) => `<!doctype html><meta charset="utf-8"><style>${css}</style>
  <div class="copy">
    <div class="tag"><img src="${iconUri}" alt="">Export Miro Flowcharts</div>
    <h1>${title}</h1><p>${sub}</p>
  </div>
  <img class="shot" src="${shotUri}" width="400" height="740" alt="">`;

const tile = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 440px; height: 280px; font-family: 'Segoe UI', system-ui, sans-serif; color: #fff; padding: 34px;
    background: radial-gradient(500px 320px at 15% 0%, #3a4bd0 0%, #1e2a78 50%, #131a4d 100%);
    display: flex; flex-direction: column; justify-content: center; gap: 18px; }
  img { width: 64px; height: 64px; border-radius: 16px; }
  h1 { font-size: 34px; line-height: 1.1; letter-spacing: -.5px; }
  p { font-size: 17px; opacity: .85; }
</style><img src="${iconUri}" alt=""><h1>Export Miro<br>Flowcharts</h1><p>To LLM text, Mermaid &amp; JSON</p>`;

const scenes = [
  { file: '01-llm-text', title: 'Flowcharts to LLM&#8209;ready text',
    sub: 'Short IDs, depth-first order and explicit loops. Fewer tokens, fewer mistakes.',
    run: async () => {} },
  { file: '02-mermaid', title: 'Mermaid and JSON too',
    sub: 'Frames become subgraphs. Paste into mermaid.live or feed a pipeline.',
    run: async p => { await p.click('#seg-format button[data-v="mermaid"]'); } },
  { file: '03-templates', title: 'Your prompt, built in',
    sub: 'Wrap the export in ready-made or custom instructions with one click.',
    run: async p => { await p.selectOption('#template', 'gaps'); } },
  { file: '04-selection', title: 'Export just the part you select',
    sub: 'The live panel follows your selection and edits on the board.',
    run: async (p, board) => {
      await board.evaluate(() => { window.__sel = ['b', 'c', 'e']; });
      await p.waitForFunction(() => document.querySelector('#stats').textContent.startsWith('3 nodes'), null, { timeout: 5000 });
    } },
  { file: '05-languages', title: 'English, Ukrainian, Russian',
    sub: 'Interface, output legend and templates follow your language.',
    run: async p => { await p.selectOption('#lang', 'uk'); } },
];

try {
  await ctx.route('https://miro.com/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: demoPage }));
  let [sw] = ctx.serviceWorkers();
  sw ??= await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const board = await ctx.newPage();
  await board.goto(BOARD);
  const boardTabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: 'https://miro.com/*' }))[0].id);

  const stage = await ctx.newPage();
  await stage.setViewportSize({ width: 1280, height: 800 });

  for (const s of scenes) {
    // a fresh panel with default settings per scene, so state never leaks between shots
    await sw.evaluate(() => chrome.storage.local.clear());
    const panel = await ctx.newPage();
    await panel.setViewportSize({ width: 400, height: 740 });
    await panel.addInitScript(([id, url]) => {
      const q = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async o => (o.active ? [{ id, url, windowId: o.windowId }] : q(o));
    }, [boardTabId, BOARD]);
    await board.evaluate(() => { window.__sel = []; });
    await panel.goto(`chrome-extension://${extId}/src/panel.html`);
    await panel.waitForFunction(() => document.querySelector('#out').value.length > 0, null, { timeout: 10_000 });
    await s.run(panel, board);
    await panel.waitForTimeout(300);

    const shot = await panel.screenshot({ type: 'png' });
    await stage.setContent(compose(s.title, s.sub, `data:image/png;base64,${shot.toString('base64')}`));
    await stage.screenshot({ path: resolve(OUT, 'screenshots', `${s.file}.png`) });
    await panel.close();
    console.log(`store/screenshots/${s.file}.png`);
  }

  await stage.setViewportSize({ width: 440, height: 280 });
  await stage.setContent(tile);
  await stage.screenshot({ path: resolve(OUT, 'promo-tile-440x280.png') });
  console.log('store/promo-tile-440x280.png');
} finally {
  await ctx.close();
}
