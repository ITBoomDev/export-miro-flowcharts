import { extractBoard, installWatcher, pollState } from './extract.js';
import { render, fmtTokens, PLACEHOLDERS } from './format.js';
import { loadSettings, saveSettings, builtinTemplates } from './settings.js';
import { LANGS, detectLang, resolveLang, makeT, resolveTemplate } from './i18n.js';

const BOARD = 'https://miro.com/app/board/';
const POLL_MS = 400;
const BIG_PROMPT = 30_000;

const $ = s => document.querySelector(s);
/** @type {(s: string) => NodeListOf<HTMLInputElement>} — typed loosely so dataset/title/placeholder are assignable */
const $$ = s => /** @type {any} */ (document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S;                 // settings (persisted)
let lang = 'en';       // resolved UI language
let T = makeT('en');   // translator
let raw = null;        // cached board data
let tabId = null;      // board tab currently shown
let winId = null;      // this panel's window
let sig = null;        // selection signature of `raw`
let ver = 0;           // board change counter seen in `raw`
let busy = false, pending = false;
let current = null;    // last render result
let emptyState = null; // { title, body } keys/text, re-rendered on language change
let editingId = null;  // template being edited

const persist = () => saveSettings(S);
const exec = async (id, func) => (await chrome.scripting.executeScript({ target: { tabId: id }, world: 'MAIN', func }))[0]?.result;
const sortedSig = ids => [...ids].sort().join(',');

// ───────── board I/O ─────────

async function activeBoardTab() {
  const [t] = await chrome.tabs.query({ active: true, windowId: winId });
  return t?.url?.startsWith(BOARD) ? t : null;
}

async function refresh() {
  if (busy) { pending = true; return; }
  busy = true;
  $('.output').classList.add('busy');
  try {
    const tab = await activeBoardTab();
    if (!tab) {
      tabId = null; raw = null;
      return showEmpty({ title: 'empty_open_title', body: 'empty_open_body' });
    }
    if (tab.id !== tabId) { raw = null; showLoading(); }
    tabId = tab.id;

    await exec(tabId, installWatcher).catch(() => {});
    const res = await exec(tabId, extractBoard);
    if (!res || res.errorCode || res.error) {
      raw = null;
      return showEmpty({ title: 'empty_err_title', body: res?.errorCode ? `err_${res.errorCode}` : null, text: res?.error || (!res && T('err_no_data')) });
    }
    raw = res;
    sig = sortedSig(res.selection);
    ver = res.ver;
    update();
  } catch (e) {
    raw = null;
    showEmpty({ title: 'empty_err_title', text: String(e.message || e) });
  } finally {
    busy = false;
    $('.output').classList.remove('busy');
    if (pending) { pending = false; refresh(); }
  }
}

let debounceTimer;
const refreshSoon = (ms = 250) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(refresh, ms); };

// Live mode. Selection changes re-render from cache (instant); only real board changes
// (create/delete/update events) trigger a full re-read. Without events: re-read on selection change.
setInterval(async () => {
  if (!S?.autoUpdate || document.hidden || busy || tabId == null || !raw) return;
  let st;
  try { st = await exec(tabId, pollState); } catch { return; }
  if (!st || busy) return;
  if (st.ver !== ver) { ver = st.ver; sig = st.sel; refreshSoon(400); return; }
  if (st.sel !== sig) {
    sig = st.sel;
    if (st.events) { raw.selection = st.sel ? st.sel.split(',') : []; update(); }
    else refreshSoon();
  }
}, POLL_MS);

chrome.tabs.onActivated.addListener(info => { if (info.windowId === winId) refreshSoon(0); });
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  // Miro is an SPA: switching boards changes the URL without a full load
  if (tab.windowId === winId && tab.active && (info.url || info.status === 'complete')) refreshSoon();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSoon(0); });

// ───────── rendering ─────────

function update() {
  if (!raw) return;
  const tpl = resolveTemplate(S.templates.find(t => t.id === S.templateId), T);
  current = render(raw, { ...S, lang, templateBody: tpl?.body });
  const g = current.graph;

  emptyState = null;
  $('#empty').hidden = true;
  $('#out').value = current.text;

  $('#board').hidden = !raw.boardName;
  $('#board').textContent = raw.boardName || '';
  $('#board').title = raw.boardName || '';

  const scope = T(g.scoped ? 'scope_is_selection' : S.selectionOnly ? 'scope_is_fallback' : 'scope_is_board');
  $('#stats').textContent = `${T('nodes', { n: g.nodes.length })} · ${T('edges', { n: g.edgeCount })} · ${T('notes', { n: g.notes.length })} — ${scope}`;
  $('#stats').title = T('timing', { read: raw.perf?.totalMs ?? '?', items: raw.perf?.items ?? raw.items.length, render: Math.round(current.ms) });
  $('#tokens').textContent = T('tokens', { t: fmtTokens(current.tokens) });
  $('#tokens').classList.toggle('big', current.tokens > BIG_PROMPT);

  const warns = g.warnings.map(w => T(`warn_${w.code}`, w));
  if (!g.nodes.length) warns.unshift(T('warn_no_nodes'));
  $('#warn').hidden = !warns.length;
  $('#warn').textContent = warns.join(' ');
}

// state: { title: key, body?: key, text?: literal }
function showEmpty(state) {
  emptyState = state;
  current = null;
  $('#out').value = '';
  $('#empty').innerHTML = `<b>${esc(T(state.title))}</b><span>${esc(state.body ? T(state.body) : state.text || '')}</span>`;
  $('#empty').hidden = false;
  $('#board').hidden = true;
  $('#stats').textContent = '';
  $('#stats').title = '';
  $('#tokens').textContent = '';
  $('#warn').hidden = true;
}

const showLoading = () => showEmpty({ title: 'loading' });

function flash(btn, text) {
  const prev = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1100);
}

// ───────── i18n ─────────

function setLang() {
  lang = resolveLang(S.uiLang);
  T = makeT(lang);
  document.documentElement.lang = lang;
}

function applyI18n() {
  $$('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach(el => { el.title = T(el.dataset.i18nTitle); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = T(el.dataset.i18nPh); });
  $('#tpl-text').placeholder = `${T('tpl_body_ph')}\n\n{{flowchart}}`;
  $('#tpl-hint').innerHTML = T('tpl_hint', {
    ph: PLACEHOLDERS.map(p => `<code>${esc(p)}</code>`).join(' '),
    flowchart: '<code>{{flowchart}}</code>',
  });
  renderLangSelects();
  renderTemplateSelect();
  if (!$('#view-tpl').hidden) renderTplList();
  if (raw) update();
  else if (emptyState) showEmpty(emptyState);
}

function renderLangSelects() {
  const native = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('#lang').innerHTML = `<option value="auto">${esc(T('lang_auto', { lang: LANGS[detectLang()] }))}</option>${native}`;
  $('#lang').value = S.uiLang;
  $('#o-lang').innerHTML = `<option value="ui">${esc(T('opt_legend_ui'))}</option>${native}`;
  $('#o-lang').value = S.opts.lang;
}

// ───────── controls ─────────

function bindSeg(sel, get, set) {
  const el = $(sel);
  const paint = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === get()));
  el.addEventListener('click', e => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v || v === get()) return;
    set(v); paint(); persist(); update();
  });
  paint();
}

const paintLive = () => $('#live').classList.toggle('on', S.autoUpdate);

function renderTemplateSelect() {
  if (!S.templates.some(t => t.id === S.templateId)) S.templateId = '';
  $('#template').innerHTML =
    `<option value="">${esc(T('tpl_none'))}</option>` +
    S.templates.map(t => `<option value="${esc(t.id)}">${esc(resolveTemplate(t, T).name)}</option>`).join('');
  $('#template').value = S.templateId;
}

function bindOptions() {
  for (const k of Object.keys(S.opts)) {
    const el = $(`#o-${k}`);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!S.opts[k];
    else el.value = S.opts[k];
    el.addEventListener('change', () => {
      S.opts[k] = el.type === 'checkbox' ? el.checked : el.value;
      persist(); update();
    });
  }
  $('#opts').open = !!S.optsOpen;
  $('#opts').addEventListener('toggle', () => { S.optsOpen = $('#opts').open; persist(); });
}

async function showShortcut() {
  const cmds = await chrome.commands.getAll();
  const sc = cmds.find(c => c.name === 'copy-flowchart')?.shortcut;
  $('#hint-set').hidden = !sc;
  $('#hint-unset').hidden = !!sc;
  $('#shortcut').textContent = sc || '';
}

const fileName = () => {
  const base = (raw?.boardName || raw?.url?.match(/\/board\/([^/?#]+)/)?.[1] || 'miro-board')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'miro-board'}.${current.fmt.ext}`;
};

// ───────── templates view ─────────

const showView = v => { $('#view-main').hidden = v !== 'main'; $('#view-tpl').hidden = v !== 'tpl'; };

function renderTplList() {
  $('#tpl-list').innerHTML = S.templates.length
    ? S.templates.map(raw => {
        const t = resolveTemplate(raw, T);
        return `
        <li data-id="${esc(t.id)}">
          <span class="name">${esc(t.name)}${t.builtin ? `<span class="tag">${esc(T('tpl_builtin'))}</span>` : ''}</span>
          <span class="preview">${esc(t.body.replace(/\s+/g, ' ').slice(0, 100))}</span>
        </li>`;
      }).join('')
    : `<li class="preview">${esc(T('tpl_empty'))}</li>`;
}

function openForm(id) {
  editingId = id;
  const t = resolveTemplate(S.templates.find(x => x.id === id), T);
  $('#tpl-name').value = t?.name ?? '';
  $('#tpl-text').value = t?.body ?? `${T('tpl_body_ph')}\n\n{{flowchart}}`;
  $('#tpl-delete').hidden = !t;
  $('#tpl-form').hidden = false;
  $('#tpl-new').hidden = true;
  $('#tpl-name').focus();
}

function closeForm() {
  editingId = null;
  $('#tpl-form').hidden = true;
  $('#tpl-new').hidden = false;
}

function templatesChanged() {
  persist(); renderTplList(); renderTemplateSelect(); update();
}

// ───────── init ─────────

S = await loadSettings();
winId = (await chrome.windows.getCurrent()).id;
setLang();

bindSeg('#seg-scope', () => (S.selectionOnly ? 'selection' : 'board'), v => { S.selectionOnly = v === 'selection'; });
bindSeg('#seg-format', () => S.format, v => { S.format = v; });
bindOptions();
paintLive();
showShortcut();
applyI18n();
showLoading();

$('#lang').onchange = e => { S.uiLang = e.target.value; persist(); setLang(); applyI18n(); };
$('#live').onclick = () => { S.autoUpdate = !S.autoUpdate; paintLive(); persist(); if (S.autoUpdate) refresh(); };
$('#refresh').onclick = () => refresh();
$('#template').onchange = e => { S.templateId = e.target.value; persist(); update(); };

$('#copy').onclick = async () => {
  if (!current) return;
  await navigator.clipboard.writeText(current.text);
  flash($('#copy'), T('copied'));
};

$('#download').onclick = () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([current.text], { type: `${current.fmt.mime};charset=utf-8` }));
  // attached to the DOM for maximum compatibility of the `download` attribute
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName(), hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$$('.open-shortcuts').forEach(a => {
  a.onclick = e => { e.preventDefault(); chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); };
});

$('#edit-templates').onclick = () => { renderTplList(); closeForm(); showView('tpl'); };
$('#tpl-back').onclick = () => showView('main');
$('#tpl-new').onclick = () => openForm(null);
$('#tpl-cancel').onclick = closeForm;
$('#tpl-list').onclick = e => { const id = e.target.closest('li')?.dataset.id; if (id) openForm(id); };

$('#tpl-form').onsubmit = e => {
  e.preventDefault();
  const name = $('#tpl-name').value.trim();
  const body = $('#tpl-text').value;
  if (!name) return;
  const i = S.templates.findIndex(t => t.id === editingId);
  if (i >= 0) {
    const t = resolveTemplate(S.templates[i], T);
    // untouched built-in stays translatable; an edited one becomes a regular template
    if (!(t.builtin && t.name === name && t.body === body)) S.templates[i] = { id: t.id, name, body };
  } else {
    const id = `t${Date.now().toString(36)}`;
    S.templates.push({ id, name, body });
    S.templateId = id;
  }
  closeForm(); templatesChanged();
};

$('#tpl-delete').onclick = () => {
  S.templates = S.templates.filter(t => t.id !== editingId);
  closeForm(); templatesChanged();
};

// Restores built-ins (as translatable references, dropping edits to them), keeps custom ones.
$('#tpl-reset').onclick = () => {
  const builtins = builtinTemplates();
  const ids = new Set(builtins.map(t => t.id));
  S.templates = [...builtins, ...S.templates.filter(t => !ids.has(t.id))];
  closeForm(); templatesChanged();
};

refresh();
