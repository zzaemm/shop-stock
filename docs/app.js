/* ShopStock UI. All user text goes through textContent (never innerHTML), so item names can't inject markup. */
(function () {
  'use strict';
  const Core = window.Core;
  const STORE_KEY = 'shopstock.v1';
  const LANG_KEY = 'shopstock.lang';

  const I18N = {
    en: {
      tab_stock: 'Stock', tab_low: 'Low', tab_history: 'History', search: 'Search items',
      quick_placeholder: 'Quick: sold 3 rice  or  +10 oil', go: 'Go',
      add_item: 'Add item', name: 'Item name', unit: 'Unit (kg, pkt, pcs...)', opening: 'Quantity now',
      alert_at: 'Warn me at or below', save: 'Save', cancel: 'Cancel', close: 'Close',
      sold: 'Sold', stock_in: 'Stock in', amount: 'Amount', note: 'Note (optional)',
      delete_item: 'Delete item', delete_confirm: 'Tap again to delete', undo: 'Undo last entry',
      settings: 'Settings', language: 'Language', export_items: 'Download stock (CSV)', export_log: 'Download history (CSV)',
      backup: 'Back up data', restore: 'Restore from backup', local_note: 'Your data stays on this phone. Back it up now and then.',
      out_badge: 'Out', low_badge: 'Low', no_items: 'No items yet. Tap + to add your first item.',
      no_low: 'Nothing is running low.', no_history: 'No entries yet.', no_match: 'No item matches.',
      today: (s) => `Today: ${s.soldOut} sold, ${s.stockedIn} stocked in`, items_n: (n) => `${n} items`,
      saved: 'Saved', done_in: (q, n) => `+${q} ${n}`, done_out: (q, n) => `-${q} ${n}`, undone: 'Undone',
      restored: 'Backup restored', deleted: 'Item deleted', opening_stock: 'opening stock', quick_entry: 'quick entry',
      err: {
        EMPTY_NAME: 'Please enter a name.', DUPLICATE: 'That item already exists.', BAD_NUMBER: 'Enter a valid number.',
        NOT_ENOUGH: 'Not enough stock.', NO_ITEM: 'Item not found.', CANT_PARSE: 'Could not understand. Try: sold 3 rice',
        AMBIGUOUS: 'More than one item matches. Type the full name.', CANNOT_UNDO: 'Cannot undo this one.',
        NOTHING_TO_UNDO: 'Nothing to undo.', BAD_FILE: 'That file is not a valid backup.', STORAGE: 'Could not save on this phone. Storage may be full.',
      },
    },
    ml: {
      tab_stock: 'സ്റ്റോക്ക്', tab_low: 'കുറവ്', tab_history: 'ചരിത്രം', search: 'സാധനം തിരയുക',
      quick_placeholder: 'ഉദാ: sold 3 rice  അല്ലെങ്കിൽ  +10 oil', go: 'ശരി',
      add_item: 'സാധനം ചേർക്കുക', name: 'സാധനത്തിന്റെ പേര്', unit: 'യൂണിറ്റ് (kg, pkt, pcs...)', opening: 'ഇപ്പോഴത്തെ അളവ്',
      alert_at: 'ഇതിൽ കുറഞ്ഞാൽ അറിയിക്കുക', save: 'സേവ്', cancel: 'റദ്ദാക്കുക', close: 'അടയ്ക്കുക',
      sold: 'വിറ്റു', stock_in: 'വരവ്', amount: 'അളവ്', note: 'കുറിപ്പ് (ഓപ്ഷണൽ)',
      delete_item: 'സാധനം ഒഴിവാക്കുക', delete_confirm: 'ഒഴിവാക്കാൻ വീണ്ടും അമർത്തുക', undo: 'അവസാനത്തെ എൻട്രി പഴയപടിയാക്കുക',
      settings: 'സെറ്റിംഗ്സ്', language: 'ഭാഷ', export_items: 'സ്റ്റോക്ക് ഡൗൺലോഡ് (CSV)', export_log: 'ചരിത്രം ഡൗൺലോഡ് (CSV)',
      backup: 'ഡാറ്റ ബാക്കപ്പ്', restore: 'ബാക്കപ്പിൽ നിന്ന് തിരികെയെടുക്കുക', local_note: 'നിങ്ങളുടെ ഡാറ്റ ഈ ഫോണിൽ തന്നെയാണ്. ഇടയ്ക്കിടെ ബാക്കപ്പ് എടുക്കുക.',
      out_badge: 'തീർന്നു', low_badge: 'കുറവ്', no_items: 'സാധനങ്ങൾ ഇല്ല. ആദ്യത്തേത് ചേർക്കാൻ + അമർത്തുക.',
      no_low: 'ഒന്നും കുറവല്ല.', no_history: 'എൻട്രികൾ ഇല്ല.', no_match: 'ചേരുന്ന സാധനം ഇല്ല.',
      today: (s) => `ഇന്ന്: ${s.soldOut} വിൽപ്പന, ${s.stockedIn} വരവ്`, items_n: (n) => `${n} സാധനങ്ങൾ`,
      saved: 'സേവ് ചെയ്തു', done_in: (q, n) => `+${q} ${n}`, done_out: (q, n) => `-${q} ${n}`, undone: 'പഴയപടിയാക്കി',
      restored: 'ബാക്കപ്പ് തിരികെയെടുത്തു', deleted: 'സാധനം ഒഴിവാക്കി', opening_stock: 'തുടക്ക സ്റ്റോക്ക്', quick_entry: 'ക്വിക്ക് എൻട്രി',
      err: {
        EMPTY_NAME: 'പേര് നൽകുക.', DUPLICATE: 'ഈ സാധനം ഇതിനകം ഉണ്ട്.', BAD_NUMBER: 'ശരിയായ സംഖ്യ നൽകുക.',
        NOT_ENOUGH: 'സ്റ്റോക്ക് മതിയാകില്ല.', NO_ITEM: 'സാധനം കണ്ടില്ല.', CANT_PARSE: 'മനസ്സിലായില്ല. ഉദാ: sold 3 rice',
        AMBIGUOUS: 'ഒന്നിലധികം സാധനങ്ങൾ ചേരുന്നു. മുഴുവൻ പേര് ടൈപ്പ് ചെയ്യുക.', CANNOT_UNDO: 'ഇത് പഴയപടിയാക്കാൻ കഴിയില്ല.',
        NOTHING_TO_UNDO: 'പഴയപടിയാക്കാൻ ഒന്നുമില്ല.', BAD_FILE: 'ഇത് ശരിയായ ബാക്കപ്പ് ഫയൽ അല്ല.', STORAGE: 'ഫോണിൽ സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല. സ്ഥലം തീർന്നിരിക്കാം.',
      },
    },
  };

  const $ = (sel) => document.querySelector(sel);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };

  let lang = I18N[store.get(LANG_KEY)] ? store.get(LANG_KEY) : (navigator.language || '').startsWith('ml') ? 'ml' : 'en';
  let state = loadState();
  let tab = 'stock';
  let query = '';
  let toastTimer = null;

  const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === 'function' ? v(...a) : v; };
  const tErr = (code) => I18N[lang].err[code] || code;

  function loadState() {
    const raw = store.get(STORE_KEY);
    if (!raw) return Core.emptyState();
    try { return Core.parseState(raw); } catch (e) {
      store.set(STORE_KEY + '.corrupt', raw); // keep the unreadable data instead of silently losing it
      return Core.emptyState();
    }
  }

  function commit(next) {
    state = next;
    if (!store.set(STORE_KEY, Core.exportJSON(state))) toast(tErr('STORAGE'));
    render();
  }

  /** Run an action; show known StockErrors as friendly messages. Returns true on success. */
  function attempt(fn) {
    try { fn(); return true; } catch (e) {
      if (e instanceof Core.StockError) { toast(tErr(e.code)); return false; }
      throw e;
    }
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  }

  const fmt = (n) => String(Math.round(n * 1000) / 1000);
  const when = (ts) => new Date(ts).toLocaleString(lang === 'ml' ? 'ml-IN' : undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const noteText = (n) => (n === 'opening stock' ? t('opening_stock') : n === 'quick entry' ? t('quick_entry') : n);

  /* ---------- main screens ---------- */

  function render() {
    document.documentElement.lang = lang;
    $('#app-title').textContent = 'ShopStock';
    for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
    for (const n of document.querySelectorAll('[data-i18n-placeholder]')) n.placeholder = t(n.dataset.i18nPlaceholder);
    for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    $('#searchwrap').hidden = tab === 'history';

    const s = Core.todaySummary(state);
    $('#summary').textContent = state.items.length ? `${t('items_n', state.items.length)}  ·  ${t('today', s)}` : '';

    const list = $('#list');
    list.replaceChildren();
    if (tab === 'history') renderHistory(list);
    else renderItems(list, tab === 'low' ? Core.lowStock(state) : state.items);
  }

  function renderItems(list, base) {
    let items = base;
    if (query) {
      const hit = new Set(Core.findItems(state, query).map((i) => i.id));
      items = base.filter((i) => hit.has(i.id));
    } else if (tab === 'stock') {
      items = [...base].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (!items.length) {
      const msg = query ? t('no_match') : tab === 'low' ? t('no_low') : t('no_items');
      list.append(el('div', { class: 'empty' }, msg));
      return;
    }
    for (const i of items) list.append(itemCard(i));
  }

  function itemCard(i) {
    const out = i.qty === 0;
    const low = !out && i.qty <= i.low;
    return el('div', { class: 'card' + (out ? ' out' : low ? ' low' : ''), 'data-id': i.id },
      el('div', { class: 'name' }, i.name, out ? el('span', { class: 'badge out' }, t('out_badge')) : low ? el('span', { class: 'badge low' }, t('low_badge')) : null),
      el('div', { class: 'qty' }, fmt(i.qty), ' ', el('small', {}, i.unit)),
      el('div', { class: 'actions' },
        el('button', { 'data-act': 'minus', 'aria-label': t('sold'), onclick: () => attempt(() => commit(Core.adjust(state, i.id, -1))) }, '−1'),
        el('button', { 'data-act': 'plus', 'aria-label': t('stock_in'), onclick: () => attempt(() => commit(Core.adjust(state, i.id, 1))) }, '+1'),
        el('button', { class: 'more', 'data-act': 'more', 'aria-label': t('amount'), onclick: () => adjustSheet(i.id) }, '…')));
  }

  function renderHistory(list) {
    const names = new Map(state.items.map((i) => [i.id, i]));
    if (!state.log.length) { list.append(el('div', { class: 'empty' }, t('no_history'))); return; }
    list.append(el('button', { class: 'undo', 'data-act': 'undo', onclick: () => { if (attempt(() => commit(Core.undoLast(state)))) toast(t('undone')); } }, t('undo')));
    for (const l of [...state.log].reverse().slice(0, 200)) {
      const item = names.get(l.itemId);
      list.append(el('div', { class: 'log-row' },
        el('div', {}, el('div', { class: 'name' }, item ? item.name : '?'), el('div', { class: 'when' }, when(l.ts) + (l.note ? '  ·  ' + noteText(l.note) : ''))),
        el('div', { class: 'qty' }, el('span', { class: l.delta > 0 ? 'delta-in' : 'delta-out' }, (l.delta > 0 ? '+' : '') + fmt(l.delta)), el('div', {}, el('small', {}, '= ' + fmt(l.after) + (item ? ' ' + item.unit : ''))))));
    }
  }

  /* ---------- sheets ---------- */

  function openSheet(...content) {
    $('#sheet-body').replaceChildren(...content);
    $('#sheet').hidden = false;
  }
  const closeSheet = () => { $('#sheet').hidden = true; $('#sheet-body').replaceChildren(); };
  const field = (label, input) => el('label', {}, label, input);

  function addSheet() {
    const name = el('input', { id: 'f-name', type: 'text', autocomplete: 'off', maxlength: '60' });
    const unit = el('input', { id: 'f-unit', type: 'text', value: 'pcs', maxlength: '12' });
    const qty = el('input', { id: 'f-qty', type: 'text', inputmode: 'decimal', value: '0' });
    const low = el('input', { id: 'f-low', type: 'text', inputmode: 'decimal', value: '0' });
    openSheet(
      el('h2', {}, t('add_item')), field(t('name'), name),
      el('div', { class: 'row2' }, field(t('unit'), unit), field(t('opening'), qty)),
      field(t('alert_at'), low),
      el('button', { class: 'btn primary', id: 'f-save', onclick: () => {
        if (attempt(() => commit(Core.addItem(state, { name: name.value, unit: unit.value, qty: qty.value, low: low.value })))) { closeSheet(); toast(t('saved')); }
      } }, t('save')),
      el('button', { class: 'btn', onclick: closeSheet }, t('cancel')));
    name.focus();
  }

  function adjustSheet(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    const amount = el('input', { id: 'f-amount', type: 'text', inputmode: 'decimal', placeholder: '0' });
    const note = el('input', { id: 'f-note', type: 'text', maxlength: '80' });
    const go = (sign) => {
      const raw = amount.value;
      if (attempt(() => {
        const n = Number(String(raw).trim().replace(',', '.'));
        if (!(n > 0)) throw new Core.StockError('BAD_NUMBER');
        commit(Core.adjust(state, id, sign * n, note.value));
      })) closeSheet();
    };
    const del = el('button', { class: 'btn danger', id: 'f-delete' }, t('delete_item'));
    let armed = false;
    del.addEventListener('click', () => {
      if (!armed) { armed = true; del.textContent = t('delete_confirm'); return; }
      commit(Core.removeItem(state, id)); closeSheet(); toast(t('deleted'));
    });
    openSheet(
      el('h2', {}, `${item.name}  ·  ${fmt(item.qty)} ${item.unit}`),
      field(t('amount'), amount), field(t('note'), note),
      el('div', { class: 'row2' },
        el('button', { class: 'btn out', id: 'f-sold', onclick: () => go(-1) }, '− ' + t('sold')),
        el('button', { class: 'btn primary', id: 'f-in', onclick: () => go(1) }, '+ ' + t('stock_in'))),
      del, el('button', { class: 'btn', onclick: closeSheet }, t('close')));
    amount.focus();
  }

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  function settingsSheet() {
    const langSel = el('select', { id: 'f-lang' }, el('option', { value: 'en' }, 'English'), el('option', { value: 'ml' }, 'മലയാളം'));
    langSel.value = lang;
    langSel.addEventListener('change', () => { lang = langSel.value; store.set(LANG_KEY, lang); render(); settingsSheet(); });
    const file = el('input', { type: 'file', accept: 'application/json,.json', id: 'f-file', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      let text;
      try { text = await f.text(); } catch (e) { toast(tErr('BAD_FILE')); return; }
      if (attempt(() => commit(Core.parseState(text)))) { closeSheet(); toast(t('restored')); }
    });
    openSheet(
      el('h2', {}, t('settings')), field(t('language'), langSel),
      el('button', { class: 'btn', id: 'f-export-items', onclick: () => download(`stock-${stamp()}.csv`, Core.itemsToCSV(state), 'text/csv') }, t('export_items')),
      el('button', { class: 'btn', id: 'f-export-log', onclick: () => download(`history-${stamp()}.csv`, Core.logToCSV(state), 'text/csv') }, t('export_log')),
      el('button', { class: 'btn', id: 'f-backup', onclick: () => download(`shopstock-backup-${stamp()}.json`, Core.exportJSON(state), 'application/json') }, t('backup')),
      el('button', { class: 'btn', id: 'f-restore', onclick: () => file.click() }, t('restore')), file,
      el('p', { class: 'empty' }, t('local_note')),
      el('button', { class: 'btn', onclick: closeSheet }, t('close')));
  }

  /* ---------- wiring ---------- */

  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; render(); } });
  $('#search').addEventListener('input', (e) => { query = e.target.value; render(); });
  $('#fab').addEventListener('click', addSheet);
  $('#btn-settings').addEventListener('click', settingsSheet);
  $('#sheet-backdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  $('#quick').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#quick-input');
    let result;
    if (attempt(() => { result = Core.applyQuickEntry(state, input.value); })) {
      commit(result.state);
      const q = fmt(Math.abs(result.delta));
      toast(result.delta < 0 ? t('done_out', q, result.item.name) : t('done_in', q, result.item.name));
      input.value = '';
    }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  render();
  window.__shopstock = { get state() { return state; } }; // read-only handle for tests
})();
