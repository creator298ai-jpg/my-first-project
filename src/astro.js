// Astronomical and calendar logic: tithi, lunar days, masa, Ekadashi and parana.
import {
  Body, Observer, MoonPhase, SearchMoonPhase, SearchRiseSet, SunPosition, Illumination,
} from 'astronomy-engine';

export const MIN = 60000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const ARUNODAYA = 96 * MIN; // 4 ghatikas before sunrise

export const TITHI_NAMES = [
  'Пратипада', 'Двития', 'Трития', 'Чатуртхи', 'Панчами', 'Шаштхи', 'Саптами', 'Аштами',
  'Навами', 'Дашами', 'Экадаши', 'Двадаши', 'Трайодаши', 'Чатурдаши',
];

export function tithiName(t) {
  if (t === 15) return 'Пурнима';
  if (t === 30) return 'Амавасья';
  return TITHI_NAMES[(t - 1) % 15];
}

export const MASA_NAMES = [
  'Чайтра', 'Вайшакха', 'Джьештха', 'Ашадха', 'Шравана', 'Бхадрапада',
  'Ашвина', 'Картика', 'Маргаширша', 'Пауша', 'Магха', 'Пхалгуна',
];

// Ekadashi names by amanta month: [shukla, krishna]; each entry [name, alternative names]
const EK_NAMES = [
  [['Камада', ''], ['Варутхини', '']],
  [['Мохини', ''], ['Апара', 'Ачала']],
  [['Пандава Нирджала', 'Бхима'], ['Йогини', '']],
  [['Шаяна', 'Девашаяни, Падма'], ['Камика', '']],
  [['Павитропана', 'Шравана-путрада'], ['Аннада', 'Аджа']],
  [['Паршва', 'Паривартини'], ['Индира', '']],
  [['Пашанкуша', ''], ['Рама', '']],
  [['Утхана', 'Прабодхини, Девоттхани'], ['Утпанна', '']],
  [['Мокшада', 'Гита-джаянти'], ['Сапхала', '']],
  [['Путрада', 'Пауша-путрада'], ['Шат-тила', '']],
  [['Бхаими', 'Джая'], ['Виджая', '']],
  [['Амалаки', ''], ['Папамочани', '']],
];
const ADHIKA_NAMES = [['Падмини', 'Камала'], ['Парама', 'Пурушоттама']];

/* ---------- time zone helpers ---------- */
const dtfCache = new Map();
function dtf(tz) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export function zonedParts(tz, date) {
  const p = {};
  for (const x of dtf(tz).formatToParts(date)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

function tzOffset(tz, t) {
  const p = zonedParts(tz, new Date(t));
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
}

export function zonedMidnight(tz, y, m, d) {
  const g = Date.UTC(y, m - 1, d);
  let t = g - tzOffset(tz, g);
  t = g - tzOffset(tz, t);
  return new Date(t);
}

export function addDays(c, n) {
  const dt = new Date(Date.UTC(c.y, c.m - 1, c.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
export const civilKey = (c) => `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`;
export const sameCivil = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;
export function civilOf(tz, date) {
  const p = zonedParts(tz, date);
  return { y: p.y, m: p.m, d: p.d };
}

/* ---------- tithi ---------- */
export const tithiAt = (date) => Math.floor(MoonPhase(date) / 12) + 1; // 1..30

function phaseCrossing(targetDeg, from, limitDays) {
  const r = SearchMoonPhase(((targetDeg % 360) + 360) % 360, from, limitDays);
  return r ? r.date : null;
}
export const nextPhaseTime = (deg, from) => phaseCrossing(deg, from, 40);
export const tithiEnd = (t, after) => phaseCrossing(t * 12, after, 3);
export const tithiStart = (t, before) => phaseCrossing((t - 1) * 12, before, -3);

/* ---------- masa ---------- */
function ayanamsaLahiri(date) {
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
  return 23.853 + years * (50.29 / 3600);
}
const siderealSun = (date) => (((SunPosition(date).elon - ayanamsaLahiri(date)) % 360) + 360) % 360;

export function masaAt(date) {
  const nm1 = phaseCrossing(0, date, -35);
  const nm2 = phaseCrossing(0, date, 35);
  const r1 = Math.floor(siderealSun(nm1) / 30);
  const r2 = Math.floor(siderealSun(nm2) / 30);
  return { index: (r1 + 1) % 12, adhika: r1 === r2, newMoon: nm1, nextNewMoon: nm2 };
}
export const masaName = (m) => (m.adhika ? 'Адхика ' : '') + MASA_NAMES[m.index];

/* ---------- day data ---------- */
const dayCache = new Map();
export function dayInfo(loc, c) {
  const key = `${loc.lat},${loc.lon},${loc.tz},${civilKey(c)}`;
  let r = dayCache.get(key);
  if (r) return r;
  const mid = zonedMidnight(loc.tz, c.y, c.m, c.d);
  const n = addDays(c, 1);
  const next = zonedMidnight(loc.tz, n.y, n.m, n.d);
  const obs = new Observer(loc.lat, loc.lon, 0);
  const sr = SearchRiseSet(Body.Sun, obs, +1, mid, 1);
  const ss = SearchRiseSet(Body.Sun, obs, -1, mid, 1);
  const sunrise = sr && sr.date < next ? sr.date : null;
  const sunset = ss && ss.date < next ? ss.date : null;
  // polar day/night fallback: use 06:00 local as the reference "sunrise"
  const ref = sunrise || new Date(mid.getTime() + 6 * HOUR);
  r = {
    c, mid, next, sunrise, sunset, ref,
    tithi: tithiAt(ref),
    aruTithi: tithiAt(new Date(ref.getTime() - ARUNODAYA)),
  };
  if (dayCache.size > 5000) dayCache.clear();
  dayCache.set(key, r);
  return r;
}

export function tithiTransitions(day) {
  const out = [];
  let t = tithiAt(day.mid);
  let from = day.mid;
  for (let i = 0; i < 3; i++) {
    const end = tithiEnd(t, from);
    if (!end || end >= day.next) break;
    t = (t % 30) + 1;
    out.push({ at: end, tithi: t });
    from = new Date(end.getTime() + MIN);
  }
  return out;
}

export function moonInfo(loc, date) {
  const phase = MoonPhase(date);
  const illum = Illumination(Body.Moon, date).phase_fraction;
  return { phase, illum, name: phaseName(phase) };
}

export function phaseName(p) {
  if (p < 6 || p >= 354) return 'Новолуние';
  if (p < 84) return 'Растущий серп';
  if (p < 96) return 'Первая четверть';
  if (p < 174) return 'Растущая Луна';
  if (p < 186) return 'Полнолуние';
  if (p < 264) return 'Убывающая Луна';
  if (p < 276) return 'Последняя четверть';
  return 'Убывающий серп';
}

export function moonRiseSet(loc, day) {
  const obs = new Observer(loc.lat, loc.lon, 0);
  const r = SearchRiseSet(Body.Moon, obs, +1, day.mid, 1);
  const s = SearchRiseSet(Body.Moon, obs, -1, day.mid, 1);
  return {
    rise: r && r.date < day.next ? r.date : null,
    set: s && s.date < day.next ? s.date : null,
  };
}

/* ---------- lunar days counted from moonrise (лунные сутки) ---------- */
const riseCache = new Map();
function moonrisesAfter(loc, nm) {
  const key = `${loc.lat},${loc.lon},${nm.getTime()}`;
  let list = riseCache.get(key);
  if (list) return list;
  list = [];
  const obs = new Observer(loc.lat, loc.lon, 0);
  let from = nm;
  const stop = nm.getTime() + 31 * DAY;
  while (from.getTime() < stop) {
    const r = SearchRiseSet(Body.Moon, obs, +1, from, 3);
    if (!r) break;
    list.push(r.date);
    from = new Date(r.date.getTime() + HOUR);
  }
  riseCache.set(key, list);
  return list;
}

/** Lunar day (1..30) by the moonrise system, and the moment it began. */
export function sutkiAt(loc, date) {
  const nm = phaseCrossing(0, date, -31);
  const rises = moonrisesAfter(loc, nm);
  let n = 1;
  let start = nm;
  for (const r of rises) {
    if (r > date) break;
    n++;
    start = r;
  }
  return { n: Math.min(n, 30), start };
}

/** Lunar day number shown for a civil day in the chosen system. */
export function lunarDayOf(loc, c, system) {
  const day = dayInfo(loc, c);
  if (system === 'sutki') return sutkiAt(loc, day.ref).n;
  return day.tithi;
}

/** Start moment of the lunar day `n` that is current or nearest after `day.mid`. */
export function lunarDayStart(loc, c, n, system) {
  const day = dayInfo(loc, c);
  if (system === 'sutki') {
    // search back from end of day for the moment `n` started
    const s = sutkiAt(loc, new Date(day.next.getTime() - MIN));
    if (s.n === n) return s.start;
    const s2 = sutkiAt(loc, day.ref);
    return s2.n === n ? s2.start : null;
  }
  return tithiStart(n, day.next);
}

/**
 * Civil days on which lunar days 1 and 15 fall. A day is marked with N when N is current at
 * sunrise for the first time, or when N is skipped at sunrise (kshaya) — then on the day it arises.
 */
export function markedLunarDays(loc, from, nDays, system, wanted = [1, 15]) {
  const vals = [];
  for (let i = -1; i <= nDays; i++) vals.push(lunarDayOf(loc, addDays(from, i), system));
  const out = [];
  for (let i = 1; i <= nDays; i++) {
    const prev = vals[i - 1];
    const cur = vals[i];
    const nxt = vals[i + 1];
    for (const n of wanted) {
      const before = n === 1 ? 30 : n - 1;
      if ((cur === n && prev !== n) || (cur === before && nxt === n + 1)) {
        out.push({ c: addDays(from, i - 1), n });
      }
    }
  }
  return out;
}

/* ---------- Ekadashi ---------- */
const ekCache = new Map();

/**
 * Ekadashi fasts whose fast day lies in [from, from + nDays).
 * tradition: 'vaishnava' (ISKCON / Navadvipa Panjika, arunodaya rule) or 'smarta' (sunrise rule).
 */
export function ekadashis(loc, from, nDays, tradition) {
  const key = `${loc.lat},${loc.lon},${loc.tz},${civilKey(from)},${nDays},${tradition}`;
  if (ekCache.has(key)) return ekCache.get(key);
  const OFF = 3;
  const days = [];
  for (let i = -OFF; i < nDays + OFF; i++) days.push(dayInfo(loc, addDays(from, i)));
  const res = [];
  const seen = new Set();
  for (let i = 1; i < days.length - 2; i++) {
    const t = days[i].tithi;
    const tp = days[i - 1].tithi;
    const tn = days[i + 1].tithi;
    let fast = null;
    let ek = null;
    let kind = 'normal';
    if ((t === 11 || t === 26) && tp !== t) {
      ek = t;
      if (tradition === 'vaishnava') {
        if (days[i].aruTithi !== t) { fast = i + 1; kind = 'viddha'; }
        else if (tn === t) { fast = i + 1; kind = 'vriddhi'; }
        else fast = i;
      } else {
        fast = i;
        if (tn === t) kind = 'vriddhi';
        // Dvadashi never touches the next sunrise: parana would fall outside Dvadashi,
        // so Smartas fast on the day Ekadashi arises.
        else if (tn === t + 2) { fast = i - 1; kind = 'dvadashi-kshaya'; }
      }
    } else if ((t === 10 && tn === 12) || (t === 25 && tn === 27)) {
      ek = t + 1;
      kind = 'kshaya';
      fast = tradition === 'vaishnava' ? i + 1 : i;
    }
    if (fast === null) continue;
    const idx = fast - OFF;
    if (idx < 0 || idx >= nDays || seen.has(fast)) continue;
    seen.add(fast);
    res.push(buildEkadashi(days, fast, ek, kind, tradition));
  }
  ekCache.set(key, res);
  return res;
}

function buildEkadashi(days, fi, ek, kind, tradition) {
  const F = days[fi];
  const P = days[fi + 1];
  const prev = days[fi - 1];
  const ekEnd = tithiEnd(ek, new Date(F.ref.getTime() - 1.6 * DAY));
  const ekStart = tithiStart(ek, ekEnd);
  const dvEnd = tithiEnd(ek + 1, new Date(ekEnd.getTime() + MIN));
  const paksha = ek === 11 ? 0 : 1;
  const masa = masaAt(new Date((ekStart.getTime() + ekEnd.getTime()) / 2));
  const [name, alt] = masa.adhika ? ADHIKA_NAMES[paksha] : EK_NAMES[masa.index][paksha];
  return {
    day: F.c,
    paranaDay: P.c,
    name: `${name} экадаши`,
    alt,
    paksha,
    masa,
    kind,
    tradition,
    ekStart,
    ekEnd,
    dvEnd,
    fastStart: F.sunrise || F.ref,
    lastMeal: prev.sunset,
    lastMealDay: prev.c,
    parana: parana(P, ekEnd, dvEnd, tradition),
  };
}

/**
 * Parana window.
 * Vaishnava (GCal / ISKCON): after sunrise (and after Ekadashi tithi), before 1/3 of daylight
 * or the end of Dvadashi, whichever is earlier.
 * Smarta (Drik Panchang): after Hari Vasara (first quarter of Dvadashi), preferably in Pratahkal
 * (first 1/5 of daylight); if Hari Vasara extends beyond it, after Madhyahna.
 */
export function parana(P, ekEnd, dvEnd, tradition) {
  const sr = (P.sunrise || P.ref).getTime();
  const ss = (P.sunset || new Date(sr + 12 * HOUR)).getTime();
  const dl = ss - sr;
  const ee = ekEnd.getTime();
  const de = dvEnd.getTime();
  let start;
  let end;
  let reason = '';
  if (tradition === 'vaishnava') {
    start = Math.max(sr, ee);
    end = sr + dl / 3;
    reason = 'до истечения 1/3 светового дня';
    if (de > start && de < end) { end = de; reason = 'до окончания Двадаши'; }
  } else {
    const hv = ee + (de - ee) / 4;
    const pratah = sr + dl / 5;
    start = Math.max(sr, hv);
    end = Math.min(pratah, de);
    reason = de < pratah ? 'до окончания Двадаши' : 'в пратахкалу (первая 1/5 дня)';
    if (de <= sr) {
      start = sr; end = pratah; reason = 'Двадаши окончилась до восхода';
    } else if (end <= start) {
      start = Math.max(start, sr + (3 * dl) / 5);
      end = Math.min(de, sr + (4 * dl) / 5);
      reason = 'после мадхьяхны (Хари-васара длится дольше пратахкалы)';
    }
  }
  if (end <= start) end = start + HOUR;
  return { start: new Date(start), end: new Date(end), reason, dvEnd };
}
