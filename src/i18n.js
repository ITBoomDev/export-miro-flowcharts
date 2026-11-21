// UI translations. To add a language: add it to LANGS and DICT (missing keys fall back to English),
// add the legend strings in format.js (LEGEND) and _locales/<code>/messages.json for the store listing.

export const LANGS = { en: 'English', uk: 'Українська', ru: 'Русский' };

export const BUILTIN_TEMPLATE_IDS = ['gaps', 'tests', 'explain', 'state-machine'];

export const DICT = {
  en: {
    lang_title: 'Interface language',
    lang_auto: 'Auto · {lang}',
    scope_selection: 'Selection',
    scope_board: 'Whole board',
    live: 'Live',
    live_title: 'Update automatically when the selection or the board changes',
    refresh_title: 'Re-read the board',
    fmt_llm: 'LLM text',
    tpl_none: 'No template: raw export',
    tpl_manage: 'Manage templates',
    opts: 'Output options',
    opt_legend: 'Output language',
    opt_legend_ui: 'Same as interface',
    opt_mermaid: 'Mermaid direction',
    opt_types: 'Node types',
    opt_notes: 'Notes',
    opt_frames: 'Frames as sections',
    opt_ids: 'Miro item IDs',
    nodes: { one: '{n} node', other: '{n} nodes' },
    edges: { one: '{n} edge', other: '{n} edges' },
    notes: { one: '{n} note', other: '{n} notes' },
    scope_is_selection: 'selection',
    scope_is_fallback: 'nothing selected → whole board',
    scope_is_board: 'whole board',
    tokens: '~{t} tokens',
    tokens_title: 'Rough estimate. Cyrillic text costs about twice as many tokens as English.',
    timing: 'Board read: {read} ms ({items} items) · render: {render} ms',
    copy: 'Copy',
    copied: 'Copied ✓',
    download: 'Download',
    hint_set: 'copies with these settings without opening the panel',
    change: 'change',
    hint_unset_link: 'Set a keyboard shortcut',
    hint_unset_rest: ' to copy without opening the panel.',
    empty_open_title: 'Open a Miro board',
    empty_open_body: 'The panel follows the active tab.',
    empty_err_title: "Can't read this board",
    loading: 'Reading the board…',
    err_no_sdk: 'Miro SDK not found on this page. Reload the board and try again.',
    err_no_data: 'No data returned.',
    warn_no_nodes: 'No connected shapes in scope.',
    warn_stencils: { one: '{n} flowchart shape came back without text: the experimental API is unavailable.', other: '{n} flowchart shapes came back without text: the experimental API is unavailable.' },
    tpl_title: 'Prompt templates',
    back: 'Back',
    tpl_new: '+ New template',
    tpl_name_ph: 'Template name',
    tpl_body_ph: 'Your instructions…',
    tpl_hint: 'Placeholders: {ph}. Without {flowchart} the export is appended at the end.',
    tpl_builtin: 'built-in',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    tpl_reset: 'Restore built-in templates',
    tpl_empty: 'No templates yet.',
    toast_copied: 'Copied {nodes} · {edges} · ~{t} tokens ({fmt}, {scope})',
    toast_clip_blocked: 'Clipboard blocked: open the side panel and press Copy',
    toast_no_shapes: 'No connected shapes found',
    'tpl_gaps_name': 'Find logic gaps',
    'tpl_gaps_body': 'Review this flowchart. List dead ends, missing branches, unclear conditions and unreachable steps. Reference nodes by ID.\n\n{{flowchart}}',
    'tpl_tests_name': 'Generate test cases',
    'tpl_tests_body': 'Write test cases that cover every path in this flowchart, including loops. Use a table: ID, path (node IDs), preconditions, expected result.\n\n{{flowchart}}',
    'tpl_explain_name': 'Explain the process',
    'tpl_explain_body': 'Explain this process step by step for a new team member. Keep node IDs in brackets.\n\n{{flowchart}}',
    'tpl_state-machine_name': 'State machine (TypeScript)',
    'tpl_state-machine_body': 'Implement this flowchart as a typed state machine in TypeScript: one state per node, transitions as events, guards for decision branches.\n\n{{flowchart}}',
  },

  uk: {
    lang_title: 'Мова інтерфейсу',
    lang_auto: 'Авто · {lang}',
    scope_selection: 'Виділене',
    scope_board: 'Вся дошка',
    live: 'Live',
    live_title: 'Оновлювати автоматично при зміні виділення або дошки',
    refresh_title: 'Перечитати дошку',
    fmt_llm: 'Текст для LLM',
    tpl_none: 'Без шаблону: чистий експорт',
    tpl_manage: 'Керувати шаблонами',
    opts: 'Параметри виводу',
    opt_legend: 'Мова виводу',
    opt_legend_ui: 'Як інтерфейс',
    opt_mermaid: 'Напрям Mermaid',
    opt_types: 'Типи вузлів',
    opt_notes: 'Нотатки',
    opt_frames: 'Фрейми як секції',
    opt_ids: 'ID елементів Miro',
    nodes: { one: '{n} вузол', few: '{n} вузли', many: '{n} вузлів', other: '{n} вузла' },
    edges: { one: "{n} зв'язок", few: "{n} зв'язки", many: "{n} зв'язків", other: "{n} зв'язку" },
    notes: { one: '{n} нотатка', few: '{n} нотатки', many: '{n} нотаток', other: '{n} нотатки' },
    scope_is_selection: 'виділене',
    scope_is_fallback: 'нічого не виділено → вся дошка',
    scope_is_board: 'вся дошка',
    tokens: '~{t} токенів',
    tokens_title: 'Приблизна оцінка. Кирилиця коштує приблизно вдвічі більше токенів, ніж англійська.',
    timing: 'Читання дошки: {read} мс ({items} елементів) · рендер: {render} мс',
    copy: 'Копіювати',
    copied: 'Скопійовано ✓',
    download: 'Завантажити',
    hint_set: 'копіює з цими налаштуваннями без відкриття панелі',
    change: 'змінити',
    hint_unset_link: 'Призначте гарячу клавішу',
    hint_unset_rest: ', щоб копіювати без відкриття панелі.',
    empty_open_title: 'Відкрийте дошку Miro',
    empty_open_body: 'Панель стежить за активною вкладкою.',
    empty_err_title: 'Не вдається прочитати дошку',
    loading: 'Читаю дошку…',
    err_no_sdk: 'На сторінці немає Miro SDK. Перезавантажте дошку й спробуйте ще раз.',
    err_no_data: 'Дані не отримано.',
    warn_no_nodes: "У вибраній області немає пов'язаних фігур.",
    warn_stencils: { one: '{n} фігура блок-схеми прийшла без тексту: experimental API недоступний.', few: '{n} фігури блок-схеми прийшли без тексту: experimental API недоступний.', many: '{n} фігур блок-схеми прийшли без тексту: experimental API недоступний.', other: '{n} фігури блок-схеми прийшли без тексту: experimental API недоступний.' },
    tpl_title: 'Шаблони промптів',
    back: 'Назад',
    tpl_new: '+ Новий шаблон',
    tpl_name_ph: 'Назва шаблону',
    tpl_body_ph: 'Ваші інструкції…',
    tpl_hint: 'Плейсхолдери: {ph}. Без {flowchart} експорт додається в кінець.',
    tpl_builtin: 'вбудований',
    save: 'Зберегти',
    cancel: 'Скасувати',
    delete: 'Видалити',
    tpl_reset: 'Відновити вбудовані шаблони',
    tpl_empty: 'Шаблонів ще немає.',
    toast_copied: 'Скопійовано {nodes} · {edges} · ~{t} токенів ({fmt}, {scope})',
    toast_clip_blocked: 'Буфер обміну заблоковано: відкрийте панель і натисніть «Копіювати»',
    toast_no_shapes: "Пов'язаних фігур не знайдено",
    'tpl_gaps_name': 'Знайти логічні діри',
    'tpl_gaps_body': 'Проаналізуй цю блок-схему. Знайди тупики, відсутні гілки, нечіткі умови й недосяжні кроки. Посилайся на вузли за ID.\n\n{{flowchart}}',
    'tpl_tests_name': 'Згенерувати тест-кейси',
    'tpl_tests_body': 'Напиши тест-кейси, що покривають кожен шлях цієї блок-схеми, включно з циклами. Формат: таблиця з колонками ID, шлях (ID вузлів), передумови, очікуваний результат.\n\n{{flowchart}}',
    'tpl_explain_name': 'Пояснити процес',
    'tpl_explain_body': 'Поясни цей процес крок за кроком для нового члена команди. ID вузлів вказуй у дужках.\n\n{{flowchart}}',
    'tpl_state-machine_name': 'State machine (TypeScript)',
    'tpl_state-machine_body': 'Реалізуй цю блок-схему як типізовану state machine на TypeScript: один стан на вузол, переходи як події, guards для гілок рішень.\n\n{{flowchart}}',
  },

  ru: {
    lang_title: 'Язык интерфейса',
    lang_auto: 'Авто · {lang}',
    scope_selection: 'Выделенное',
    scope_board: 'Вся доска',
    live: 'Live',
    live_title: 'Обновлять автоматически при изменении выделения или доски',
    refresh_title: 'Перечитать доску',
    fmt_llm: 'Текст для LLM',
    tpl_none: 'Без шаблона: чистый экспорт',
    tpl_manage: 'Управление шаблонами',
    opts: 'Параметры вывода',
    opt_legend: 'Язык вывода',
    opt_legend_ui: 'Как интерфейс',
    opt_mermaid: 'Направление Mermaid',
    opt_types: 'Типы узлов',
    opt_notes: 'Заметки',
    opt_frames: 'Фреймы как секции',
    opt_ids: 'ID элементов Miro',
    nodes: { one: '{n} узел', few: '{n} узла', many: '{n} узлов', other: '{n} узла' },
    edges: { one: '{n} связь', few: '{n} связи', many: '{n} связей', other: '{n} связи' },
    notes: { one: '{n} заметка', few: '{n} заметки', many: '{n} заметок', other: '{n} заметки' },
    scope_is_selection: 'выделенное',
    scope_is_fallback: 'ничего не выделено → вся доска',
    scope_is_board: 'вся доска',
    tokens: '~{t} токенов',
    tokens_title: 'Приблизительная оценка. Кириллица стоит примерно вдвое больше токенов, чем английский.',
    timing: 'Чтение доски: {read} мс ({items} элементов) · рендер: {render} мс',
    copy: 'Копировать',
    copied: 'Скопировано ✓',
    download: 'Скачать',
    hint_set: 'копирует с этими настройками без открытия панели',
    change: 'изменить',
    hint_unset_link: 'Назначьте горячую клавишу',
    hint_unset_rest: ', чтобы копировать без открытия панели.',
    empty_open_title: 'Откройте доску Miro',
    empty_open_body: 'Панель следит за активной вкладкой.',
    empty_err_title: 'Не удаётся прочитать доску',
    loading: 'Читаю доску…',
    err_no_sdk: 'На странице нет Miro SDK. Перезагрузите доску и попробуйте снова.',
    err_no_data: 'Данные не получены.',
    warn_no_nodes: 'В выбранной области нет связанных фигур.',
    warn_stencils: { one: '{n} фигура блок-схемы пришла без текста: experimental API недоступен.', few: '{n} фигуры блок-схемы пришли без текста: experimental API недоступен.', many: '{n} фигур блок-схемы пришли без текста: experimental API недоступен.', other: '{n} фигуры блок-схемы пришли без текста: experimental API недоступен.' },
    tpl_title: 'Шаблоны промптов',
    back: 'Назад',
    tpl_new: '+ Новый шаблон',
    tpl_name_ph: 'Название шаблона',
    tpl_body_ph: 'Ваши инструкции…',
    tpl_hint: 'Плейсхолдеры: {ph}. Без {flowchart} экспорт добавляется в конец.',
    tpl_builtin: 'встроенный',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    tpl_reset: 'Восстановить встроенные шаблоны',
    tpl_empty: 'Шаблонов пока нет.',
    toast_copied: 'Скопировано {nodes} · {edges} · ~{t} токенов ({fmt}, {scope})',
    toast_clip_blocked: 'Буфер обмена заблокирован: откройте панель и нажмите «Копировать»',
    toast_no_shapes: 'Связанные фигуры не найдены',
    'tpl_gaps_name': 'Найти логические дыры',
    'tpl_gaps_body': 'Проанализируй эту блок-схему. Найди тупики, недостающие ветки, нечёткие условия и недостижимые шаги. Ссылайся на узлы по ID.\n\n{{flowchart}}',
    'tpl_tests_name': 'Сгенерировать тест-кейсы',
    'tpl_tests_body': 'Напиши тест-кейсы, покрывающие каждый путь этой блок-схемы, включая циклы. Формат: таблица с колонками ID, путь (ID узлов), предусловия, ожидаемый результат.\n\n{{flowchart}}',
    'tpl_explain_name': 'Объяснить процесс',
    'tpl_explain_body': 'Объясни этот процесс шаг за шагом для нового участника команды. ID узлов указывай в скобках.\n\n{{flowchart}}',
    'tpl_state-machine_name': 'State machine (TypeScript)',
    'tpl_state-machine_body': 'Реализуй эту блок-схему как типизированную state machine на TypeScript: одно состояние на узел, переходы как события, guards для веток решений.\n\n{{flowchart}}',
  },
};

// Browser language + OS/Chrome locale, in priority order.
export function browserLangs() {
  const out = [];
  if (typeof navigator !== 'undefined') out.push(...(navigator.languages || []), navigator.language);
  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) out.push(chrome.i18n.getUILanguage());
  try { out.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch { /* ignore */ }
  return out.filter(Boolean);
}

export function detectLang(candidates = browserLangs()) {
  for (const c of candidates) {
    const base = String(c).toLowerCase().split(/[-_]/)[0];
    if (base in LANGS) return base;
  }
  return 'en';
}

export const resolveLang = setting => (setting && setting !== 'auto' && setting in LANGS ? setting : detectLang());

export function makeT(lang) {
  const dict = DICT[lang] || DICT.en;
  const rules = new Intl.PluralRules(lang in LANGS ? lang : 'en');
  return (key, params = {}) => {
    let s = dict[key] ?? DICT.en[key] ?? key;
    if (typeof s === 'object') s = s[rules.select(Number(params.n ?? 0))] ?? s.other;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  };
}

// Built-in templates are stored as { id, builtin: true } and rendered in the current language.
// Editing one turns it into a regular template with its own text.
export function resolveTemplate(t, T) {
  if (!t) return null;
  return t.builtin
    ? { id: t.id, builtin: true, name: T(`tpl_${t.id}_name`), body: T(`tpl_${t.id}_body`) }
    : t;
}
