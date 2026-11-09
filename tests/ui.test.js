const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const DOCS = path.join(__dirname, '..', 'docs');
const read = (f) => fs.readFileSync(path.join(DOCS, f), 'utf8');

/** Load the real page + scripts in a fresh fake phone browser. `seed` pre-fills localStorage. */
function openApp(seed = {}) {
  const dom = new JSDOM(read('index.html'), { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, v);
  w.eval(read('core.js'));
  w.eval(read('app.js'));
  const $ = (s) => w.document.querySelector(s);
  const $$ = (s) => [...w.document.querySelectorAll(s)];
  const type = (sel, value) => { $(sel).value = value; $(sel).dispatchEvent(new w.Event('input', { bubbles: true })); };
  const addItem = (name, qty = '0', unit = 'pcs', low = '0') => {
    $('#fab').click();
    type('#f-name', name); type('#f-unit', unit); type('#f-qty', qty); type('#f-low', low);
    $('#f-save').click();
  };
  const quick = (text) => { $('#quick-input').value = text; $('#quick').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); };
  const cardOf = (name) => $$('.card').find((c) => c.querySelector('.name').textContent.startsWith(name));
  const qtyOf = (name) => cardOf(name).querySelector('.qty').textContent.trim();
  return { w, $, $$, type, addItem, quick, cardOf, qtyOf, toast: () => $('#toast').textContent };
}

test('first run shows a friendly empty state', () => {
  const a = openApp();
  assert.match(a.$('#list').textContent, /No items yet/);
  assert.equal(a.$('#sheet').hidden, true);
});

test('add an item, then sell and restock with the big buttons', () => {
  const a = openApp();
  a.addItem('Rice', '10', 'kg', '3');
  assert.equal(a.$('#sheet').hidden, true);
  assert.equal(a.qtyOf('Rice'), '10 kg');
  a.cardOf('Rice').querySelector('[data-act=minus]').click();
  assert.equal(a.qtyOf('Rice'), '9 kg');
  a.cardOf('Rice').querySelector('[data-act=plus]').click();
  a.cardOf('Rice').querySelector('[data-act=plus]').click();
  assert.equal(a.qtyOf('Rice'), '11 kg');
});

test('cannot go below zero, and zero stock is badged "Out"', () => {
  const a = openApp();
  a.addItem('Tea', '1');
  a.cardOf('Tea').querySelector('[data-act=minus]').click();
  assert.ok(a.cardOf('Tea').querySelector('.badge.out'));
  a.cardOf('Tea').querySelector('[data-act=minus]').click();
  assert.match(a.toast(), /Not enough stock/);
  assert.equal(a.qtyOf('Tea'), '0 pcs');
});

test('duplicate and empty names are rejected with a message, sheet stays open', () => {
  const a = openApp();
  a.addItem('Oil', '2');
  a.addItem('oil', '5');
  assert.match(a.toast(), /already exists/);
  assert.equal(a.$('#sheet').hidden, false);
  a.type('#f-name', '   ');
  a.$('#f-save').click();
  assert.match(a.toast(), /enter a name/i);
});

test('quick entry: sold / stock in / errors', () => {
  const a = openApp();
  a.addItem('Parle-G', '10', 'pkt');
  a.quick('sold 3 parle-g');
  assert.equal(a.qtyOf('Parle-G'), '7 pkt');
  assert.match(a.toast(), /-3 Parle-G/);
  assert.equal(a.$('#quick-input').value, '');
  a.quick('+5 Parle-G');
  assert.equal(a.qtyOf('Parle-G'), '12 pkt');
  a.quick('sold 1 salt');
  assert.match(a.toast(), /not found/i);
  a.quick('hello');
  assert.match(a.toast(), /Could not understand/);
});

test('adjust sheet: sell a custom amount, with a note shown in history', () => {
  const a = openApp();
  a.addItem('Sugar', '20', 'kg');
  a.cardOf('Sugar').querySelector('[data-act=more]').click();
  a.type('#f-amount', '2,5');
  a.type('#f-note', 'Ravi');
  a.$('#f-sold').click();
  assert.equal(a.qtyOf('Sugar'), '17.5 kg');
  a.$$('#tabs button').find((b) => b.dataset.tab === 'history').click();
  assert.match(a.$('#list').textContent, /Ravi/);
  assert.match(a.$('#list').textContent, /-2\.5/);
});

test('history undo reverses the latest entry', () => {
  const a = openApp();
  a.addItem('Salt', '5');
  a.quick('sold 2 salt');
  a.$$('#tabs button').find((b) => b.dataset.tab === 'history').click();
  a.$('[data-act=undo]').click();
  a.$$('#tabs button').find((b) => b.dataset.tab === 'stock').click();
  assert.equal(a.qtyOf('Salt'), '5 pcs');
});

test('low tab lists only items at or below their alert level', () => {
  const a = openApp();
  a.addItem('Rice', '20', 'kg', '5');
  a.addItem('Dal', '4', 'kg', '5');
  a.$$('#tabs button').find((b) => b.dataset.tab === 'low').click();
  const names = a.$$('.card .name').map((n) => n.textContent);
  assert.equal(names.length, 1);
  assert.match(names[0], /^Dal/);
});

test('search filters the list', () => {
  const a = openApp();
  a.addItem('Rice'); a.addItem('Dal'); a.addItem('Rice Flour');
  a.type('#search', 'rice');
  assert.equal(a.$$('.card').length, 2);
  a.type('#search', 'zzz');
  assert.match(a.$('#list').textContent, /No item matches/);
});

test('item names are shown as text, never as HTML', () => {
  const a = openApp();
  a.addItem('<img src=x onerror=alert(1)>', '1');
  assert.equal(a.$$('#list img').length, 0);
  assert.match(a.$('#list').textContent, /<img src=x/);
});

test('delete needs a second tap', () => {
  const a = openApp();
  a.addItem('Soap', '3');
  a.cardOf('Soap').querySelector('[data-act=more]').click();
  a.$('#f-delete').click();
  assert.ok(a.cardOf('Soap'));
  a.$('#f-delete').click();
  assert.equal(a.cardOf('Soap'), undefined);
});

test('data survives a reload (saved in localStorage)', () => {
  const a = openApp();
  a.addItem('Rice', '8', 'kg');
  const saved = a.w.localStorage.getItem('shopstock.v1');
  const b = openApp({ 'shopstock.v1': saved });
  assert.equal(b.qtyOf('Rice'), '8 kg');
});

test('corrupt saved data does not crash the app and is kept aside', () => {
  const b = openApp({ 'shopstock.v1': '{broken' });
  assert.match(b.$('#list').textContent, /No items yet/);
  assert.equal(b.w.localStorage.getItem('shopstock.v1.corrupt'), '{broken');
});

test('language switch to Malayalam relabels the tabs and persists', () => {
  const a = openApp();
  a.$('#btn-settings').click();
  const sel = a.$('#f-lang');
  sel.value = 'ml';
  sel.dispatchEvent(new a.w.Event('change', { bubbles: true }));
  assert.equal(a.$$('#tabs button')[0].textContent, 'സ്റ്റോക്ക്');
  assert.equal(a.w.localStorage.getItem('shopstock.lang'), 'ml');
});

test('every Malayalam string exists for every English key', () => {
  const src = read('app.js');
  const grab = (lang) => {
    const start = src.indexOf(`      ${lang}: {`);
    const body = src.slice(start, src.indexOf('\n    },', start));
    return new Set([...body.matchAll(/^\s+([a-z_]+|[A-Z_]+):/gm)].map((m) => m[1]).concat([...body.matchAll(/,\s*([a-z_]+):/g)].map((m) => m[1])));
  };
  const en = grab('en'), ml = grab('ml');
  const missing = [...en].filter((k) => !ml.has(k));
  assert.deepEqual(missing, []);
});

test('service worker caches every file the page needs', () => {
  const sw = read('sw.js');
  for (const f of ['index.html', 'style.css', 'core.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
    assert.ok(sw.includes(`'${f}'`), `sw.js is missing ${f}`);
    assert.ok(fs.existsSync(path.join(DOCS, f)), `${f} does not exist`);
  }
  const manifest = JSON.parse(read('manifest.webmanifest'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(DOCS, icon.src)));
});
