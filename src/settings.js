import { DEFAULT_OPTS } from './format.js';
import { BUILTIN_TEMPLATE_IDS, DICT } from './i18n.js';

export const SETTINGS_VERSION = 3;

export const builtinTemplates = () => BUILTIN_TEMPLATE_IDS.map(id => ({ id, builtin: true }));

export const DEFAULTS = {
  v: SETTINGS_VERSION,
  uiLang: 'auto',
  format: 'llm',
  selectionOnly: true,
  autoUpdate: true,
  templateId: '',
  optsOpen: false,
  opts: { ...DEFAULT_OPTS },
  templates: builtinTemplates(),
};

export function migrate(s) {
  if (!s) return s;
  if (!s.v) {
    // 0.2 stored built-in templates as English text: turn untouched ones into translatable references
    s.templates = (s.templates || []).map(t =>
      BUILTIN_TEMPLATE_IDS.includes(t.id)
        && t.name === DICT.en[`tpl_${t.id}_name`]
        && t.body === DICT.en[`tpl_${t.id}_body`]
        ? { id: t.id, builtin: true }
        : t);
    if (s.opts?.lang === 'en') s.opts.lang = 'ui';
    s.v = SETTINGS_VERSION;
  }
  return s;
}

export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  const s = migrate(settings);
  return {
    ...DEFAULTS,
    ...s,
    opts: { ...DEFAULTS.opts, ...s?.opts },
    templates: structuredClone(Array.isArray(s?.templates) ? s.templates : DEFAULTS.templates),
  };
}

export const saveSettings = s => chrome.storage.local.set({ settings: s });
