// Release-integrity checks: things Chrome Web Store review or a user install would trip over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const json = p => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const manifest = json('manifest.json');
const pkg = json('package.json');

test('manifest and package.json versions match', () => {
  assert.equal(manifest.version, pkg.version);
});

test('CHANGELOG has an entry for the current version', () => {
  const log = readFileSync(resolve(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.match(log, new RegExp(`^## ${pkg.version.replaceAll('.', '\\.')} `, 'm'));
});

test('every file referenced by the manifest exists', () => {
  const paths = [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];
  for (const p of paths) assert.ok(existsSync(resolve(ROOT, p)), `missing ${p}`);
});

test('permissions are the documented minimum', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['clipboardWrite', 'scripting', 'sidePanel', 'storage']);
  assert.deepEqual(manifest.host_permissions, ['https://miro.com/app/board/*']);
  assert.equal(manifest.content_scripts, undefined);
});

test('store listing strings respect Chrome Web Store limits', () => {
  for (const lang of readdirSync(resolve(ROOT, '_locales'))) {
    const m = json(`_locales/${lang}/messages.json`);
    assert.ok(m.extName.message.length <= 75, `${lang} extName > 75`);
    assert.ok(m.extShortName.message.length <= 12 + 15, `${lang} extShortName too long`);
    assert.ok(m.extDescription.message.length <= 132, `${lang} extDescription > 132`);
  }
});

test('every locale defines the same message keys as the default locale', () => {
  const base = Object.keys(json(`_locales/${manifest.default_locale}/messages.json`)).sort();
  for (const lang of readdirSync(resolve(ROOT, '_locales'))) {
    assert.deepEqual(Object.keys(json(`_locales/${lang}/messages.json`)).sort(), base, lang);
  }
});

test('shipped source has no network calls or remote code', () => {
  for (const f of readdirSync(resolve(ROOT, 'src')).filter(f => /\.(js|html)$/.test(f))) {
    const src = readFileSync(resolve(ROOT, 'src', f), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts|eval\s*\(/, f);
    assert.doesNotMatch(src, /<script[^>]+src=["']https?:/, f);
  }
});
