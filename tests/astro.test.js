// Regression checks against published Drik Panchang dates (New Delhi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ekadashis, civilKey, markedLunarDays } from '../src/astro.js';

const delhi = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' };
const hm = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: delhi.tz, hour: '2-digit', minute: '2-digit' }).format(d);
const find = (list, key) => list.find((e) => civilKey(e.day) === key);

test('smarta fast days and parana', () => {
  const l = ekadashis(delhi, { y: 2025, m: 6, d: 1 }, 240, 'smarta');
  const nirjala = find(l, '2025-06-06');
  assert.ok(nirjala, 'Nirjala on 6 June 2025');
  assert.equal(hm(nirjala.parana.start), '13:43'); // Drik: 01:44 PM
  assert.ok(find(l, '2025-06-21'), 'Yogini (kshaya) on 21 June');
  assert.ok(find(l, '2025-11-01'), 'Devutthana on 1 Nov (dvadashi kshaya)');
  assert.ok(find(l, '2025-12-30'), 'Pausha Putrada on 30 Dec');
});

test('vaishnava shifts kshaya and gauna days', () => {
  const l = ekadashis(delhi, { y: 2025, m: 6, d: 1 }, 240, 'vaishnava');
  assert.ok(find(l, '2025-06-22'));
  assert.ok(find(l, '2025-11-02'));
  assert.ok(find(l, '2025-12-31'));
});

test('adhika masa names in 2026', () => {
  const l = ekadashis(delhi, { y: 2026, m: 5, d: 20 }, 30, 'vaishnava');
  assert.deepEqual(l.map((e) => e.name), ['Падмини экадаши', 'Парама экадаши']);
});

test('lunar days 1 and 15', () => {
  const msk = { lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' };
  const m = markedLunarDays(msk, { y: 2026, m: 11, d: 1 }, 30, 'tithi').map((x) => `${civilKey(x.c)}:${x.n}`);
  assert.deepEqual(m, ['2026-11-10:1', '2026-11-24:15']);
});
