import { extractBoard } from './extract.js';
import { render, fmtTokens } from './format.js';
import { loadSettings } from './settings.js';
import { makeT, resolveLang, resolveTemplate } from './i18n.js';

const BOARD = 'https://miro.com/app/board/';

const openOnClick = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(openOnClick);
chrome.runtime.onStartup.addListener(openOnClick);

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'copy-flowchart') copyFlowchart(tab);
});

// Hotkey: copy with the current panel settings, no UI. Feedback via an in-page toast.
async function copyFlowchart(tab) {
  tab ??= (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.url?.startsWith(BOARD)) return;

  const settings = await loadSettings();
  const lang = resolveLang(settings.uiLang);
  const T = makeT(lang);

  let text = null, msg, ok = true;
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: extractBoard });
    if (!result || result.errorCode || result.error) {
      throw new Error(result?.errorCode ? T(`err_${result.errorCode}`) : result?.error || T('err_no_data'));
    }
    const tpl = resolveTemplate(settings.templates.find(t => t.id === settings.templateId), T);
    const r = render(result, { ...settings, lang, templateBody: tpl?.body });
    if (!r.graph.nodes.length) throw new Error(T('toast_no_shapes'));
    text = r.text;
    msg = T('toast_copied', {
      nodes: T('nodes', { n: r.graph.nodes.length }),
      edges: T('edges', { n: r.graph.edgeCount }),
      t: fmtTokens(r.tokens),
      fmt: r.fmt.key === 'llm' ? T('fmt_llm') : r.fmt.label,
      scope: T(r.graph.scoped ? 'scope_is_selection' : 'scope_is_board'),
    });
  } catch (e) {
    ok = false;
    msg = String(e.message || e);
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyAndToast,
    args: [text, msg, ok, T('toast_clip_blocked')],
  });
}
globalThis.copyFlowchart = copyFlowchart; // reachable from the service-worker console / tests

// Runs in the page (isolated world). Self-contained.
async function copyAndToast(text, msg, ok, blockedMsg) {
  if (text) {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.append(ta);
      ta.select();
      copied = document.execCommand('copy');
      ta.remove();
    }
    if (!copied) { ok = false; msg = blockedMsg; }
  }

  const ID = '__miro_llm_toast';
  document.getElementById(ID)?.remove();
  const el = document.createElement('div');
  el.id = ID;
  el.textContent = (ok ? '✓ ' : '⚠ ') + msg;
  el.style.cssText = [
    'position:fixed', 'z-index:2147483647', 'left:50%', 'bottom:28px', 'transform:translateX(-50%)',
    'padding:10px 16px', 'border-radius:10px', 'font:500 13px/1.3 system-ui,sans-serif', 'color:#fff',
    `background:${ok ? '#1e2a78' : '#b3261e'}`, 'box-shadow:0 8px 28px rgba(0,0,0,.25)',
    'transition:opacity .25s', 'pointer-events:none', 'max-width:80vw',
  ].join(';');
  document.body.append(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2400);
}
