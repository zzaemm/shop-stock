/* ShopStock core: pure, immutable stock logic. No DOM, no storage, so it is fully unit-testable.
 * Works in the browser (window.Core) and in Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;

  /** Errors carry a stable `code` so the UI can show them in the shopkeeper's language. */
  class StockError extends Error {
    constructor(code, detail) {
      super(code);
      this.name = 'StockError';
      this.code = code;
      this.detail = detail;
    }
  }

  let counter = 0;
  const uid = () => Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  const key = (s) => clean(s).toLowerCase();
  const round3 = (n) => Math.round(n * 1000) / 1000;
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

  const emptyState = () => ({ version: VERSION, items: [], log: [] });

  function toNumber(v, { min = 0, allowZero = true } = {}) {
    const n = typeof v === 'string' ? Number(v.trim().replace(',', '.')) : v;
    if (!isNum(n) || n < min || (!allowZero && n === 0)) throw new StockError('BAD_NUMBER');
    return round3(n);
  }

  function addItem(state, { name, unit = 'pcs', qty = 0, low = 0 }, now = Date.now()) {
    const nm = clean(name);
    if (!nm) throw new StockError('EMPTY_NAME');
    if (state.items.some((i) => key(i.name) === key(nm))) throw new StockError('DUPLICATE', nm);
    const item = {
      id: uid(),
      name: nm,
      unit: clean(unit) || 'pcs',
      qty: toNumber(qty === '' ? 0 : qty),
      low: toNumber(low === '' ? 0 : low),
    };
    const log = item.qty > 0
      ? [...state.log, { id: uid(), itemId: item.id, delta: item.qty, note: 'opening stock', ts: now, after: item.qty }]
      : state.log;
    return { ...state, items: [...state.items, item], log };
  }

  function adjust(state, itemId, delta, note = '', now = Date.now()) {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) throw new StockError('NO_ITEM');
    const d = toNumber(delta, { min: -Infinity, allowZero: false });
    const after = round3(item.qty + d);
    if (after < 0) throw new StockError('NOT_ENOUGH', { have: item.qty, unit: item.unit });
    return {
      ...state,
      items: state.items.map((i) => (i.id === itemId ? { ...i, qty: after } : i)),
      log: [...state.log, { id: uid(), itemId, delta: d, note: clean(note), ts: now, after }],
    };
  }

  function undoLast(state) {
    const last = state.log[state.log.length - 1];
    if (!last) throw new StockError('NOTHING_TO_UNDO');
    const item = state.items.find((i) => i.id === last.itemId);
    const back = item ? round3(item.qty - last.delta) : 0;
    if (item && back < 0) throw new StockError('CANNOT_UNDO');
    return {
      ...state,
      items: state.items.map((i) => (i.id === last.itemId ? { ...i, qty: back } : i)),
      log: state.log.slice(0, -1),
    };
  }

  function removeItem(state, itemId) {
    return {
      ...state,
      items: state.items.filter((i) => i.id !== itemId),
      log: state.log.filter((l) => l.itemId !== itemId),
    };
  }

  /** Out of stock (qty 0) is always flagged; otherwise flagged at or below the item's alert level. */
  const lowStock = (state) =>
    state.items.filter((i) => i.qty <= i.low).sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name));

  function findItems(state, query) {
    const q = key(query);
    if (!q) return [...state.items];
    const rank = (i) => {
      const n = key(i.name);
      return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : 3;
    };
    return state.items
      .map((i) => [rank(i), i])
      .filter(([r]) => r < 3)
      .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
      .map(([, i]) => i);
  }

  const QUICK = /^(sold|sell|out|in|add|got|bought|received|restock|[+-])\s*(\d+(?:[.,]\d+)?)\s*(?:x|of)?\s+(.+)$/i;
  const OUT_WORDS = new Set(['sold', 'sell', 'out', '-']);

  /** "sold 3 rice", "-3 rice", "+10 rice", "got 10 rice" -> {type, qty, name} or null. */
  function parseQuickEntry(text) {
    const m = clean(text).match(QUICK);
    if (!m) return null;
    const qty = Number(m[2].replace(',', '.'));
    if (!(qty > 0)) return null;
    return { type: OUT_WORDS.has(m[1].toLowerCase()) ? 'out' : 'in', qty, name: clean(m[3]) };
  }

  function applyQuickEntry(state, text, now = Date.now()) {
    const parsed = parseQuickEntry(text);
    if (!parsed) throw new StockError('CANT_PARSE');
    const matches = findItems(state, parsed.name);
    if (!matches.length) throw new StockError('NO_ITEM', parsed.name);
    const exact = matches.find((i) => key(i.name) === key(parsed.name));
    if (!exact && matches.length > 1) throw new StockError('AMBIGUOUS', matches.map((i) => i.name));
    const item = exact || matches[0];
    const delta = parsed.type === 'out' ? -parsed.qty : parsed.qty;
    return { state: adjust(state, item.id, delta, 'quick entry', now), item, delta };
  }

  /** CSV cell. Text starting with = + - @ is prefixed so spreadsheets never run it as a formula. */
  function cell(v, isText = true) {
    let s = String(v == null ? '' : v);
    if (isText && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const row = (cells) => cells.join(',');

  function itemsToCSV(state) {
    const lines = [row(['name', 'unit', 'quantity', 'alert_at'])];
    for (const i of state.items) lines.push(row([cell(i.name), cell(i.unit), cell(i.qty, false), cell(i.low, false)]));
    return lines.join('\n') + '\n';
  }

  function logToCSV(state) {
    const names = new Map(state.items.map((i) => [i.id, i.name]));
    const lines = [row(['date', 'item', 'change', 'balance', 'note'])];
    for (const l of [...state.log].reverse()) {
      lines.push(row([new Date(l.ts).toISOString(), cell(names.get(l.itemId) || '?'), cell(l.delta, false), cell(l.after, false), cell(l.note)]));
    }
    return lines.join('\n') + '\n';
  }

  function todaySummary(state, now = Date.now()) {
    const d = new Date(now);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = state.log.filter((l) => l.ts >= start && l.note !== 'opening stock');
    return {
      entries: today.length,
      stockedIn: today.filter((l) => l.delta > 0).length,
      soldOut: today.filter((l) => l.delta < 0).length,
    };
  }

  const exportJSON = (state) => JSON.stringify(state, null, 2);

  /** Parse and validate saved/backup data. Anything malformed is rejected, never half-loaded. */
  function parseState(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new StockError('BAD_FILE');
    }
    const okItem = (i) => i && typeof i.id === 'string' && typeof i.name === 'string' && clean(i.name) &&
      typeof i.unit === 'string' && isNum(i.qty) && i.qty >= 0 && isNum(i.low) && i.low >= 0;
    const okLog = (l) => l && typeof l.id === 'string' && typeof l.itemId === 'string' && isNum(l.delta) &&
      isNum(l.ts) && isNum(l.after) && typeof l.note === 'string';
    if (!data || data.version !== VERSION || !Array.isArray(data.items) || !Array.isArray(data.log) ||
        !data.items.every(okItem) || !data.log.every(okLog)) {
      throw new StockError('BAD_FILE');
    }
    const ids = new Set(data.items.map((i) => i.id));
    if (ids.size !== data.items.length) throw new StockError('BAD_FILE');
    return { version: VERSION, items: data.items, log: data.log.filter((l) => ids.has(l.itemId)) };
  }

  return {
    VERSION, StockError, emptyState, addItem, adjust, undoLast, removeItem, lowStock, findItems,
    parseQuickEntry, applyQuickEntry, itemsToCSV, logToCSV, todaySummary, exportJSON, parseState,
  };
});
