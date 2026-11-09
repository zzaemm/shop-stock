const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../docs/core.js');

const T0 = new Date(2026, 10, 4, 12, 0, 0).getTime();
const codeOf = (fn) => { try { fn(); } catch (e) { return e.code; } return null; };

function shop() {
  let s = C.emptyState();
  s = C.addItem(s, { name: 'Rice', unit: 'kg', qty: 20, low: 5 }, T0);
  s = C.addItem(s, { name: 'Parle-G', unit: 'pkt', qty: 4, low: 6 }, T0);
  s = C.addItem(s, { name: 'Rice Flour', unit: 'kg', qty: 0 }, T0);
  return s;
}
const id = (s, name) => s.items.find((i) => i.name === name).id;

test('addItem trims, defaults unit, logs opening stock', () => {
  const s = C.addItem(C.emptyState(), { name: '  Sugar   ', qty: '12' }, T0);
  assert.equal(s.items[0].name, 'Sugar');
  assert.equal(s.items[0].unit, 'pcs');
  assert.equal(s.items[0].qty, 12);
  assert.equal(s.log.length, 1);
  assert.equal(s.log[0].note, 'opening stock');
});

test('addItem rejects empty, duplicate (case-insensitive) and bad numbers', () => {
  const s = shop();
  assert.equal(codeOf(() => C.addItem(s, { name: '   ' })), 'EMPTY_NAME');
  assert.equal(codeOf(() => C.addItem(s, { name: 'rice' })), 'DUPLICATE');
  assert.equal(codeOf(() => C.addItem(s, { name: 'Oil', qty: -1 })), 'BAD_NUMBER');
  assert.equal(codeOf(() => C.addItem(s, { name: 'Oil', qty: 'abc' })), 'BAD_NUMBER');
});

test('adjust updates quantity, logs the change, never mutates the old state', () => {
  const s = shop();
  const s2 = C.adjust(s, id(s, 'Rice'), -3, 'Ravi', T0 + 1);
  assert.equal(s.items[0].qty, 20);
  assert.equal(s2.items[0].qty, 17);
  assert.deepEqual(s2.log.at(-1).delta, -3);
  assert.equal(s2.log.at(-1).after, 17);
});

test('cannot sell more than in stock', () => {
  const s = shop();
  assert.equal(codeOf(() => C.adjust(s, id(s, 'Parle-G'), -5)), 'NOT_ENOUGH');
  assert.equal(codeOf(() => C.adjust(s, id(s, 'Parle-G'), 0)), 'BAD_NUMBER');
  assert.equal(codeOf(() => C.adjust(s, 'nope', 1)), 'NO_ITEM');
});

test('decimal quantities do not drift', () => {
  let s = C.addItem(C.emptyState(), { name: 'Oil', unit: 'L', qty: 0.3 }, T0);
  s = C.adjust(s, s.items[0].id, 0.1);
  s = C.adjust(s, s.items[0].id, 0.2);
  assert.equal(s.items[0].qty, 0.6);
});

test('comma decimals are accepted (typed on phone keyboards)', () => {
  const s = C.addItem(C.emptyState(), { name: 'Oil', qty: '1,5' });
  assert.equal(s.items[0].qty, 1.5);
});

test('undoLast reverses the last entry, and refuses when it would go negative', () => {
  let s = shop();
  const rice = id(s, 'Rice');
  s = C.adjust(s, rice, -3);
  s = C.undoLast(s);
  assert.equal(s.items.find((i) => i.id === rice).qty, 20);
  let t = C.addItem(C.emptyState(), { name: 'Tea' }, T0);
  t = C.adjust(t, t.items[0].id, 5);
  t = { ...t, items: t.items.map((i) => ({ ...i, qty: 1 })) }; // simulate stock sold since
  assert.equal(codeOf(() => C.undoLast(t)), 'CANNOT_UNDO');
  assert.equal(codeOf(() => C.undoLast(C.emptyState())), 'NOTHING_TO_UNDO');
});

test('lowStock flags at or below alert level and always flags zero', () => {
  const names = C.lowStock(shop()).map((i) => i.name);
  assert.deepEqual(names, ['Rice Flour', 'Parle-G']); // 0 first, then 4; Rice (20 > 5) is fine
});

test('removeItem also removes that item\'s history', () => {
  const s = shop();
  const t = C.removeItem(s, id(s, 'Rice'));
  assert.equal(t.items.length, 2);
  assert.ok(t.log.every((l) => l.itemId !== id(s, 'Rice')));
});

test('findItems ranks exact, prefix, then substring', () => {
  const s = shop();
  assert.deepEqual(C.findItems(s, 'rice').map((i) => i.name), ['Rice', 'Rice Flour']);
  assert.deepEqual(C.findItems(s, 'flour').map((i) => i.name), ['Rice Flour']);
  assert.equal(C.findItems(s, '').length, 3);
  assert.equal(C.findItems(s, 'zzz').length, 0);
});

test('parseQuickEntry understands common phrasings', () => {
  assert.deepEqual(C.parseQuickEntry('sold 3 rice'), { type: 'out', qty: 3, name: 'rice' });
  assert.deepEqual(C.parseQuickEntry('-3 rice'), { type: 'out', qty: 3, name: 'rice' });
  assert.deepEqual(C.parseQuickEntry('+10 Parle-G'), { type: 'in', qty: 10, name: 'Parle-G' });
  assert.deepEqual(C.parseQuickEntry('got 2.5 x rice flour'), { type: 'in', qty: 2.5, name: 'rice flour' });
  assert.deepEqual(C.parseQuickEntry('SOLD 1,5 of rice'), { type: 'out', qty: 1.5, name: 'rice' });
  assert.equal(C.parseQuickEntry('hello'), null);
  assert.equal(C.parseQuickEntry('sold 0 rice'), null);
  assert.equal(C.parseQuickEntry('sold rice'), null);
});

test('applyQuickEntry picks the exact match, and refuses ambiguous or unknown names', () => {
  const s = shop();
  const r = C.applyQuickEntry(s, 'sold 3 rice', T0);
  assert.equal(r.item.name, 'Rice');
  assert.equal(r.state.items.find((i) => i.name === 'Rice').qty, 17);
  assert.equal(codeOf(() => C.applyQuickEntry(s, 'sold 1 ric')), 'AMBIGUOUS');
  assert.equal(codeOf(() => C.applyQuickEntry(s, 'sold 1 salt')), 'NO_ITEM');
  assert.equal(codeOf(() => C.applyQuickEntry(s, 'banana')), 'CANT_PARSE');
  assert.equal(codeOf(() => C.applyQuickEntry(s, 'sold 99 rice')), 'NOT_ENOUGH');
});

test('CSV escapes commas/quotes and neutralises spreadsheet formulas', () => {
  let s = C.addItem(C.emptyState(), { name: 'Oil, "Gold"', unit: 'L', qty: 2 }, T0);
  s = C.addItem(s, { name: '=HYPERLINK("x")', qty: 1 }, T0);
  const csv = C.itemsToCSV(s);
  assert.match(csv, /"Oil, ""Gold""",L,2,0/);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\")\""));
  assert.equal(csv.split('\n')[0], 'name,unit,quantity,alert_at');
});

test('log CSV is newest first and includes balances', () => {
  let s = C.addItem(C.emptyState(), { name: 'Tea', qty: 5 }, T0);
  s = C.adjust(s, s.items[0].id, -2, 'x', T0 + 1000);
  const lines = C.logToCSV(s).trim().split('\n');
  assert.equal(lines[0], 'date,item,change,balance,note');
  assert.match(lines[1], /,Tea,-2,3,x$/);
  assert.match(lines[2], /,Tea,5,5,opening stock$/);
});

test('todaySummary counts only today and ignores opening stock', () => {
  let s = shop();
  s = C.adjust(s, id(s, 'Rice'), -1, '', T0);
  s = C.adjust(s, id(s, 'Rice'), 2, '', T0);
  s = C.adjust(s, id(s, 'Rice'), -1, '', T0 - 3 * 86400000);
  assert.deepEqual(C.todaySummary(s, T0), { entries: 2, stockedIn: 1, soldOut: 1 });
});

test('backup round-trips, and corrupt or foreign files are rejected', () => {
  const base = shop();
  const s = C.adjust(base, id(base, 'Rice'), 0.5, '', T0);
  assert.deepEqual(C.parseState(C.exportJSON(s)), s);
  assert.equal(codeOf(() => C.parseState('not json')), 'BAD_FILE');
  assert.equal(codeOf(() => C.parseState('{"version":1,"items":[{"id":"a"}],"log":[]}')), 'BAD_FILE');
  assert.equal(codeOf(() => C.parseState('{"version":2,"items":[],"log":[]}')), 'BAD_FILE');
  assert.equal(codeOf(() => C.parseState('null')), 'BAD_FILE');
  const dup = { version: 1, items: [{ id: 'a', name: 'x', unit: 'u', qty: 1, low: 0 }, { id: 'a', name: 'y', unit: 'u', qty: 1, low: 0 }], log: [] };
  assert.equal(codeOf(() => C.parseState(JSON.stringify(dup))), 'BAD_FILE');
});
