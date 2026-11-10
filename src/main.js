import './style.css';
import {
  DAY, addDays, civilKey, civilOf, sameCivil, dayInfo, ekadashis, markedLunarDays,
  lunarDayOf, lunarDayStart, sutkiAt, tithiName, tithiTransitions, masaAt, masaName, moonInfo,
  moonRiseSet, nextPhaseTime,
} from './astro.js';

/* ---------- state ---------- */
const STORE = 'luna-ekadashi-settings-v1';
const DEFAULT_LOC = { name: 'Москва', region: 'Россия', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' };
const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
const S = {
  loc: saved.loc || DEFAULT_LOC,
  tradition: saved.tradition || 'vaishnava',
  system: saved.system || 'tithi',
  wax: saved.wax ?? true,
  installDismissed: saved.installDismissed || false,
};
const save = () => localStorage.setItem(STORE, JSON.stringify(S));

const today = () => civilOf(S.loc.tz, new Date());
let tab = 'cal';
let sel = today();
let view = { y: sel.y, m: sel.m };

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

/* ---------- formatting ---------- */
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const civDate = (c) => new Date(Date.UTC(c.y, c.m - 1, c.d, 12));
const fmtC = (c, o) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...o }).format(civDate(c));
const dayMonth = (c) => fmtC(c, { day: 'numeric', month: 'long' });
const weekdayLong = (c) => cap(fmtC(c, { weekday: 'long' }));
const weekdayShort = (c) => fmtC(c, { weekday: 'short' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtT = (d) => (d ? new Intl.DateTimeFormat('ru-RU', { timeZone: S.loc.tz, hour: '2-digit', minute: '2-digit' }).format(d) : '—');
const fmtDT = (d) => (d ? `${dayMonth(civilOf(S.loc.tz, d))}, ${fmtT(d)}` : '—');
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const daysBetween = (a, b) => Math.round((civDate(b) - civDate(a)) / DAY);
function relDay(c) {
  const n = daysBetween(today(), c);
  if (n === 0) return 'сегодня';
  if (n === 1) return 'завтра';
  if (n === -1) return 'вчера';
  if (n > 1) return `через ${n} ${plural(n, 'день', 'дня', 'дней')}`;
  return `${-n} ${plural(-n, 'день', 'дня', 'дней')} назад`;
}
function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* ---------- icons ---------- */
function moonSvg(phase, size = 16, cls = '') {
  const r = size / 2 - 0.5;
  const c = size / 2;
  const p = ((phase % 360) + 360) % 360;
  const waxing = p < 180;
  const rx = Math.abs(Math.cos((p * Math.PI) / 180)) * r;
  const gibbous = p > 90 && p < 270;
  const outer = waxing ? 1 : 0;
  const term = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
  const lit = `M${c} ${c - r} A${r} ${r} 0 0 ${outer} ${c} ${c + r} A${rx} ${r} 0 0 ${term} ${c} ${c - r}Z`;
  const flip = S.loc.lat < 0 ? ` transform="scale(-1 1)" transform-origin="${c} ${c}"` : '';
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25" stroke-width="${Math.max(0.5, size / 120)}"/>
    <path d="${lit}" fill="currentColor"${flip}/></svg>`;
}
const ICON = {
  pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  left: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chev: '<svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5l5 5-5 5"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  share: '<svg width="14" height="16" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M12 2v15M7 7l5-5 5 5M5 12H3v14h18V12h-2"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#fff"/><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>',
  leaf: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2c3 3 5 6 5 10a5 5 0 0 1-10 0c0-4 2-7 5-10zm0 12.5V22" stroke="#fff" stroke-width="1.6"/></svg>',
  cup: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3"/></svg>',
  loc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M21 3L3 10.5l7.5 3 3 7.5L21 3z"/></svg>',
  cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 2.5v4M16 2.5v4" stroke-linecap="round"/></svg>',
};
const TAB_ICONS = {
  cal: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 2.5v4M16 2.5v4" stroke-linecap="round"/><circle cx="8" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  ek: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3c2.6 2.6 4 5.3 4 8.5a4 4 0 0 1-8 0C8 8.3 9.4 5.6 12 3z"/><path d="M12 15.5c-2.5 2.3-5.5 3-9 2.5 1.6-3 4.2-4.6 7.2-4.6M12 15.5c2.5 2.3 5.5 3 9 2.5-1.6-3-4.2-4.6-7.2-4.6M12 15.5V21" stroke-linecap="round"/></svg>',
  moon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  set: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
};

/* ---------- data helpers ---------- */
function ekForRange(from, n) {
  return ekadashis(S.loc, from, n, S.tradition);
}
function nextEkadashi() {
  const t = today();
  return ekForRange(addDays(t, -2), 45).find((e) => daysBetween(t, e.paranaDay) >= 0);
}
const kindNote = {
  viddha: 'Перенос на день позже: при арунодае (за 96 мин до восхода) ещё длилась Дашами — такой экадаши считается «осквернённым» (дашами-виддха). Пост — в Двадаши (махадвадаши).',
  vriddhi: 'Экадаши длится два восхода подряд (вриддхи).',
  kshaya: 'Экадаши-титхи не застаёт ни одного восхода (кшайя).',
  'dvadashi-kshaya': 'Двадаши не застаёт следующего восхода, поэтому пост переносится на день раньше.',
};
const pakshaName = (p) => (p === 0 ? 'Шукла-пакша (растущая Луна)' : 'Кришна-пакша (убывающая Луна)');
const lunarLabel = (n) => (n === 1 ? 'Новолуние · начало лунного месяца' : n === 15 ? 'Пурнима · полнолуние' : '');

/* ---------- render: calendar ---------- */
function isIOSSafariBrowser() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches;
}

function header(title) {
  return `<div class="header"><h1 class="large-title">${title}</h1>
    <button class="loc-chip" data-act="goto-set">${ICON.pin}<span>${esc(S.loc.name)}</span></button></div>`;
}

function renderCalendar() {
  const t = today();
  const first = { y: view.y, m: view.m, d: 1 };
  const dow = (civDate(first).getUTCDay() + 6) % 7;
  const gridStart = addDays(first, -dow);
  const nCells = Math.ceil((dow + new Date(Date.UTC(view.y, view.m, 0)).getUTCDate()) / 7) * 7;

  const eks = ekForRange(addDays(gridStart, -2), nCells + 4);
  const ekDays = new Set(eks.map((e) => civilKey(e.day)));
  const parDays = new Set(eks.map((e) => civilKey(e.paranaDay)));
  const marks = new Map(markedLunarDays(S.loc, gridStart, nCells, S.system).map((x) => [civilKey(x.c), x.n]));

  let html = '';
  if (isIOSSafariBrowser() && !S.installDismissed) {
    html += `<div class="install"><img src="./icons/apple-touch-icon.png" alt="">
      <div class="grow"><b>Установите на экран «Домой»</b>Нажмите ${ICON.share} «Поделиться» внизу Safari, затем «На экран Домой».</div>
      <button class="x" data-act="dismiss-install" aria-label="Закрыть">×</button></div>`;
  }
  html += header(`${MONTHS[view.m - 1]} <span class="year">${view.y}</span>`);
  html += `<div class="sub">${esc(S.loc.region || '')}${S.loc.region ? ' · ' : ''}${S.tradition === 'vaishnava' ? 'Вайшнавский' : 'Смарта'} календарь</div>`;

  const ne = nextEkadashi();
  if (ne) {
    const isToday = sameCivil(ne.day, t);
    const kicker = isToday ? 'Сегодня экадаши' : daysBetween(t, ne.day) < 0 ? 'Сегодня выход из поста' : `Ближайший экадаши · ${relDay(ne.day)}`;
    html += `<button class="hero" data-act="select" data-d="${civilKey(ne.day)}">
      <div class="kicker">${kicker}</div>
      <h2>${esc(ne.name)}</h2>
      <div class="when">${weekdayLong(ne.day)}, ${dayMonth(ne.day)} · ${masaName(ne.masa)}</div>
      <div class="times">
        <div class="tbox in"><div class="lbl">Вход</div><div class="t">${fmtT(ne.fastStart)}</div><div class="d">восход, ${weekdayShort(ne.day)} ${ne.day.d}</div></div>
        <div class="tbox out"><div class="lbl">Выход</div><div class="t">${fmtT(ne.parana.start)}–${fmtT(ne.parana.end)}</div><div class="d">парана, ${weekdayShort(ne.paranaDay)} ${ne.paranaDay.d}</div></div>
      </div></button>`;
  }

  html += `<div class="nav-row"><button class="link" data-act="today">Сегодня</button>
    <div class="nav-btns"><button class="icon-btn" data-act="prev" aria-label="Предыдущий месяц">${ICON.left}</button>
    <button class="icon-btn" data-act="next" aria-label="Следующий месяц">${ICON.right}</button></div></div>`;

  html += '<div class="grid" id="grid">';
  WD.forEach((w, i) => { html += `<div class="wd${i > 4 ? ' we' : ''}">${w}</div>`; });
  for (let i = 0; i < nCells; i++) {
    const c = addDays(gridStart, i);
    const k = civilKey(c);
    const ld = lunarDayOf(S.loc, c, S.system);
    const day = dayInfo(S.loc, c);
    const ph = moonInfo(S.loc, day.ref).phase;
    const cls = ['cell'];
    if (c.m !== view.m) cls.push('other');
    if (sameCivil(c, t)) cls.push('today');
    if (sameCivil(c, sel)) cls.push('sel');
    if (ekDays.has(k)) cls.push('ek');
    if (S.wax && ld <= 15) cls.push('wax');
    const dots = [];
    if (ekDays.has(k)) dots.push('<i class="dot ek"></i>');
    if (parDays.has(k)) dots.push('<i class="dot par"></i>');
    if (marks.has(k)) dots.push('<i class="dot lun"></i>');
    html += `<button class="${cls.join(' ')}" data-act="select" data-d="${k}" aria-label="${dayMonth(c)}">
      <span class="num">${c.d}</span><span class="ld">${moonSvg(ph, 9)}${ld}</span><span class="dots">${dots.join('')}</span></button>`;
  }
  html += '</div>';
  html += `<div class="legend"><span><i class="dot ek"></i>Экадаши</span><span><i class="dot par"></i>Выход (парана)</span>
    <span><i class="dot lun"></i>1-й и 15-й лунный день</span>${S.wax ? '<span><i class="sw"></i>Лунные дни 1–15</span>' : ''}</div>`;

  html += renderDayDetail(sel, eks);
  return html;
}

function renderDayDetail(c, eks) {
  const day = dayInfo(S.loc, c);
  const masa = masaAt(day.ref);
  const tithi = day.tithi;
  const paksha = tithi <= 15 ? 0 : 1;
  let html = `<div class="day-head"><h3>${weekdayLong(c)}, ${dayMonth(c)}</h3>
    <div class="sub">${masaName(masa)} · ${pakshaName(paksha)}</div></div>`;

  const list = eks || ekForRange(addDays(c, -2), 5);
  for (const e of list) {
    if (sameCivil(addDays(e.day, -1), c)) {
      html += `<div class="event pre"><div class="et">Завтра — ${esc(e.name)}</div>
        <div class="kv"><span>Последний приём пищи</span><b>до заката ${fmtT(e.lastMeal)}</b></div>
        <div class="hint">Накануне экадаши принято есть один раз, до заката, и уже не есть зерновые и бобовые.</div></div>`;
    }
    if (sameCivil(e.day, c)) {
      html += `<div class="event"><div class="et">${esc(e.name)}</div>
        <div class="es">${e.alt ? `Также: ${esc(e.alt)} · ` : ''}${masaName(e.masa)}, ${e.paksha === 0 ? 'шукла' : 'кришна'}-пакша</div>
        <div class="kv"><span>Вход в пост</span><b>восход ${fmtT(e.fastStart)}</b></div>
        <div class="kv"><span>Последняя еда накануне</span><b>до ${fmtT(e.lastMeal)}</b></div>
        <div class="kv"><span>Выход (парана)</span><b>${weekdayShort(e.paranaDay)}, ${fmtT(e.parana.start)}–${fmtT(e.parana.end)}</b></div>
        <div class="kv"><span>Экадаши-титхи</span><b>${fmtDT(e.ekStart)} – ${fmtDT(e.ekEnd)}</b></div>
        ${kindNote[e.kind] ? `<div class="hint">${kindNote[e.kind]}</div>` : ''}
        <div class="hint">Пост длится от восхода в день экадаши до параны на следующее утро. Без зерновых и бобовых; по возможности — без воды (нирджала) или на фруктах.</div></div>`;
    }
    if (sameCivil(e.paranaDay, c)) {
      html += `<div class="event par"><div class="et">Выход из поста · парана</div>
        <div class="es">После: ${esc(e.name)}</div>
        <div class="kv"><span>Прервать пост</span><b>${fmtT(e.parana.start)} – ${fmtT(e.parana.end)}</b></div>
        <div class="kv"><span>Окончание Двадаши</span><b>${fmtDT(e.dvEnd)}</b></div>
        <div class="hint">Прервите пост ${e.parana.reason}. Принято начинать с зерновой пищи (например, риса), предложенной Господу.</div></div>`;
    }
  }

  // lunar day
  const marks = markedLunarDays(S.loc, c, 1, S.system);
  const mi = moonInfo(S.loc, day.ref);
  const mrs = moonRiseSet(S.loc, day);
  const trans = tithiTransitions(day);
  let lunarTitle;
  let lunarRows = '';
  if (S.system === 'sutki') {
    const s = sutkiAt(S.loc, day.ref);
    lunarTitle = `${s.n}-е лунные сутки`;
    lunarRows += `<div class="kv"><span>Начались</span><b>${fmtDT(s.start)}</b></div>`;
    if (mrs.rise) lunarRows += `<div class="kv"><span>Следующие сутки</span><b>с ${fmtT(mrs.rise)} (восход Луны)</b></div>`;
  } else {
    lunarTitle = `${tithi}-й лунный день · ${tithiName(tithi)}`;
  }
  lunarRows += `<div class="kv"><span>Титхи на восходе</span><b>${tithiName(tithi)} (${tithi})</b></div>`;
  for (const tr of trans) {
    if (tr.at > day.ref) lunarRows += `<div class="kv"><span>С ${fmtT(tr.at)}</span><b>${tithiName(tr.tithi)} (${tr.tithi})</b></div>`;
  }
  lunarRows += `<div class="kv"><span>Фаза Луны</span><b>${mi.name}, ${Math.round(mi.illum * 100)}%</b></div>`;
  lunarRows += `<div class="kv"><span>Восход / заход Луны</span><b>${fmtT(mrs.rise)} / ${fmtT(mrs.set)}</b></div>`;
  const markNote = marks.length ? `<div class="hint">★ Знаковый день: ${marks[0].n}-й лунный день — ${lunarLabel(marks[0].n).toLowerCase()}.</div>` : '';
  html += `<div class="event lun"><div class="et">${lunarTitle}</div>${lunarRows}${markNote}</div>`;

  html += `<div class="group">
    <div class="row ind"><div class="badge sun">${ICON.sun}</div><div class="grow title">Восход</div><div class="val">${fmtT(day.sunrise)}</div></div>
    <div class="row ind"><div class="badge gray">${ICON.sun}</div><div class="grow title">Закат</div><div class="val">${fmtT(day.sunset)}</div></div>
  </div>
  <div class="foot">Время указано для: ${esc(S.loc.name)} (${esc(S.loc.tz)}).</div>`;
  return html;
}

/* ---------- render: ekadashi list ---------- */
function renderEkList() {
  const t = today();
  const from = { y: t.y, m: t.m, d: 1 };
  const eks = ekForRange(from, 400);
  const ne = nextEkadashi();
  let html = header('Экадаши');
  html += `<div class="sub">${S.tradition === 'vaishnava' ? 'Вайшнавский (ИСККОН)' : 'Смарта'} · время входа и выхода для вашего места</div>`;
  let curMonth = '';
  let open = false;
  for (const e of eks) {
    const mk = `${e.day.y}-${e.day.m}`;
    if (mk !== curMonth) {
      if (open) html += '</div>';
      html += `<div class="ek-month">${MONTHS[e.day.m - 1]} <span class="y">${e.day.y}</span></div><div class="group">`;
      curMonth = mk;
      open = true;
    }
    const past = daysBetween(t, e.paranaDay) < 0;
    const isNext = ne && sameCivil(ne.day, e.day);
    const pill = e.kind === 'viddha' ? '<span class="pill">махадвадаши</span>' : e.masa.adhika ? '<span class="pill">адхика</span>' : '';
    html += `<button class="row ${past ? 'past' : ''} ${isNext ? 'next' : ''}" data-act="select-go" data-d="${civilKey(e.day)}">
      <div class="datebox"><div class="dn">${e.day.d}</div><div class="dw">${weekdayShort(e.day)}</div></div>
      <div class="grow"><div class="title">${esc(e.name)}${isNext ? '<span class="pill acc">скоро</span>' : ''}${pill}</div>
      <div class="note">Вход: восход ${fmtT(e.fastStart)} · Выход: ${weekdayShort(e.paranaDay)} ${fmtT(e.parana.start)}–${fmtT(e.parana.end)}</div></div>
      <span class="chev">${ICON.chev}</span></button>`;
  }
  if (open) html += '</div>';
  html += `<div class="foot" style="margin-top:14px">Вход — с восхода Солнца в день экадаши (последняя еда накануне до заката). Выход — парана в указанном окне на следующее утро.</div>`;
  return html;
}

/* ---------- render: moon ---------- */
function renderMoon() {
  const now = new Date();
  const t = today();
  const day = dayInfo(S.loc, t);
  const mi = moonInfo(S.loc, now);
  const mrs = moonRiseSet(S.loc, day);
  const ld = S.system === 'sutki' ? sutkiAt(S.loc, now).n : Math.floor(mi.phase / 12) + 1;
  const nNew = nextPhaseTime(0, now);
  const nFull = nextPhaseTime(180, now);

  let html = header('Луна');
  html += `<div class="sub">${S.system === 'sutki' ? 'Лунные сутки (от восхода Луны)' : 'Ведические лунные дни (титхи)'}</div>`;
  html += `<div class="moon-hero" style="color:var(--text)">${moonSvg(mi.phase, 132)}
    <div class="ph">${mi.name}</div><div class="il">Освещённость ${Math.round(mi.illum * 100)}% · ${ld}-й лунный день${S.system === 'tithi' ? ` · ${tithiName(ld)}` : ''}</div>
    <div class="stats"><div>Восход<b>${fmtT(mrs.rise)}</b></div><div>Заход<b>${fmtT(mrs.set)}</b></div><div>Месяц<b>${masaName(masaAt(now))}</b></div></div></div>`;

  const phases = [[0, 'Новолуние', nNew], [180, 'Полнолуние', nFull]].sort((a, b) => a[2] - b[2]);
  html += `<div class="section-title">Ближайшие фазы</div><div class="group">${phases.map(([deg, label, at]) => `
    <div class="row ind"><div class="badge moon" style="color:#fff">${moonSvg(deg, 18)}</div><div class="grow"><div class="title">${label}</div><div class="note">${relDay(civilOf(S.loc.tz, at))}</div></div><div class="val">${fmtDT(at)}</div></div>`).join('')}
  </div>`;

  const marks = markedLunarDays(S.loc, t, 366, S.system);
  html += `<div class="section-title">Знаковые дни · 1-й и 15-й лунный день</div><div class="group">`;
  for (const m of marks.slice(0, 26)) {
    const start = lunarDayStart(S.loc, m.c, m.n, S.system);
    html += `<button class="row ind" data-act="select-go" data-d="${civilKey(m.c)}">
      <div class="badge moon" style="color:#fff">${moonSvg(m.n === 1 ? 6 : 180, 18)}</div>
      <div class="grow"><div class="title">${weekdayShort(m.c)}, ${dayMonth(m.c)}</div><div class="note">${m.n === 1 ? 'Новолуние' : 'Полнолуние'}${start ? ` · с ${fmtDT(start)}` : ''}</div></div>
      <div class="val">${m.n}-й день</div><span class="chev">${ICON.chev}</span></button>`;
  }
  html += `</div><div class="foot">Дни 1–15 — светлая половина лунного месяца (растущая Луна). 1-й день открывает месяц, 15-й — полнолуние.</div>`;
  return html;
}

/* ---------- render: settings ---------- */
function seg(name, opts, cur) {
  return `<div class="seg">${opts.map(([v, l]) => `<button data-act="seg" data-name="${name}" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
function renderSettings() {
  let html = header('Настройки');
  html += `<div class="section-title">Местоположение</div>
  <div class="group">
    <div class="row ind"><div class="badge moon">${ICON.pin.replace('currentColor', '#fff').replace('14', '18').replace('14', '18')}</div>
      <div class="grow"><div class="title">${esc(S.loc.name)}</div><div class="note">${esc(S.loc.region || '')} ${S.loc.lat.toFixed(3)}°, ${S.loc.lon.toFixed(3)}° · ${esc(S.loc.tz)}</div></div></div>
    <button class="row ind" data-act="gps"><div class="badge" style="background:var(--blue)">${ICON.loc}</div><div class="grow title" style="color:var(--blue)">Определить автоматически</div></button>
  </div>
  <div class="section-title">Найти город</div>
  <label class="search">${ICON.search}<input id="q" type="search" placeholder="Город, например «Вриндаван»" autocomplete="off" enterkeyhint="search"></label>
  <div id="results"></div>
  <div class="foot">Время восхода, входа в экадаши и выхода из него рассчитывается для выбранной точки и её часового пояса.</div>

  <div class="section-title">Традиция экадаши</div>
  <div class="group"><div class="seg-wrap">${seg('tradition', [['vaishnava', 'Вайшнавы (ИСККОН)'], ['smarta', 'Смарта']], S.tradition)}</div></div>
  <div class="foot">${S.tradition === 'vaishnava'
    ? 'Как в Vaishnava Calendar ИСККОН / GCal: если при арунодае (за 96 минут до восхода) ещё длится Дашами, пост переносится на следующий день. Парана — после восхода, до 1/3 светового дня или до конца Двадаши.'
    : 'Как в Drik Panchang: экадаши — день, когда титхи застаёт восход. Парана — после Хари-васары (первой четверти Двадаши), предпочтительно в пратахкалу.'}</div>

  <div class="section-title">Лунные дни</div>
  <div class="group"><div class="seg-wrap">${seg('system', [['tithi', 'Титхи (ведические)'], ['sutki', 'Лунные сутки']], S.system)}</div>
    <div class="row"><div class="grow title">Подсвечивать дни 1–15</div><label class="switch"><input type="checkbox" data-act="wax" ${S.wax ? 'checked' : ''}><span></span></label></div>
  </div>
  <div class="foot">${S.system === 'tithi'
    ? 'Титхи — 1/30 лунного месяца (каждые 12° между Луной и Солнцем). День определяется титхи на восходе.'
    : 'Лунные сутки — от одного восхода Луны до следующего; 1-е сутки начинаются в момент новолуния.'}</div>

  <div class="section-title">Календарь iPhone</div>
  <div class="group"><button class="row ind" data-act="ics"><div class="badge" style="background:var(--red)">${ICON.cal}</div>
    <div class="grow"><div class="title" style="color:var(--blue)">Добавить в Календарь</div><div class="note">Экадаши, парана и 1-й / 15-й лунные дни на 12 месяцев, с напоминаниями</div></div></button></div>

  <div class="foot" style="margin-top:24px">Расчёты выполняются на устройстве (astronomy-engine), без интернета. Аянамша — Лахири, месяцы — аманта.</div>`;
  return html;
}

/* ---------- main render ---------- */
function renderTabbar() {
  const tabs = [['cal', 'Календарь'], ['ek', 'Экадаши'], ['moon', 'Луна'], ['set', 'Настройки']];
  tabbar.innerHTML = `<div class="in">${tabs.map(([id, l]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${TAB_ICONS[id]}${l}</button>`).join('')}</div>`;
}
function render() {
  const fns = { cal: renderCalendar, ek: renderEkList, moon: renderMoon, set: renderSettings };
  app.innerHTML = fns[tab]();
  renderTabbar();
  if (tab === 'set') bindSearch();
}
function setTab(t) {
  tab = t;
  render();
  window.scrollTo(0, 0);
}
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'select' || act === 'select-go') {
    sel = parseKey(el.dataset.d);
    view = { y: sel.y, m: sel.m };
    if (act === 'select-go') setTab('cal');
    else render();
    if (act === 'select' || act === 'select-go') document.querySelector('.day-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (act === 'prev' || act === 'next') {
    shiftMonth(act === 'prev' ? -1 : 1);
  } else if (act === 'today') {
    sel = today();
    view = { y: sel.y, m: sel.m };
    render();
  } else if (act === 'goto-set') setTab('set');
  else if (act === 'dismiss-install') { S.installDismissed = true; save(); render(); }
  else if (act === 'seg') { S[el.dataset.name] = el.dataset.v; save(); render(); }
  else if (act === 'gps') useGPS();
  else if (act === 'ics') exportICS();
  else if (act === 'pick') pickLocation(JSON.parse(el.dataset.loc));
});
app.addEventListener('change', (ev) => {
  if (ev.target.dataset.act === 'wax') { S.wax = ev.target.checked; save(); }
});
tabbar.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-tab]');
  if (b) setTab(b.dataset.tab);
});

function shiftMonth(n) {
  const d = new Date(Date.UTC(view.y, view.m - 1 + n, 1));
  view = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
  const t = today();
  sel = t.y === view.y && t.m === view.m ? t : { ...view, d: 1 };
  render();
}

// horizontal swipe on the month grid
let touch = null;
app.addEventListener('touchstart', (e) => {
  if (tab !== 'cal' || !e.target.closest('#grid')) return;
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
app.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1);
}, { passive: true });

/* ---------- location ---------- */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function pickLocation(loc) {
  S.loc = loc;
  save();
  sel = today();
  view = { y: sel.y, m: sel.m };
  toast(`Место: ${loc.name}`);
  setTab('cal');
}

let searchTimer;
let searchSeq = 0;
function bindSearch() {
  const q = document.getElementById('q');
  const out = document.getElementById('results');
  q.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const text = q.value.trim();
    if (text.length < 2) { out.innerHTML = ''; return; }
    searchTimer = setTimeout(async () => {
      const seq = ++searchSeq;
      out.innerHTML = '<div class="group"><div class="spinner">Поиск…</div></div>';
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=8&language=ru&format=json`);
        const j = await r.json();
        if (seq !== searchSeq) return;
        const items = (j.results || []).filter((x) => x.timezone);
        out.innerHTML = items.length
          ? `<div class="group">${items.map((x) => {
            const loc = { name: x.name, region: [x.admin1, x.country].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude, tz: x.timezone };
            return `<button class="row" data-act="pick" data-loc="${esc(JSON.stringify(loc))}"><div class="grow"><div class="title">${esc(x.name)}</div><div class="note">${esc(loc.region)}</div></div><span class="chev">${ICON.chev}</span></button>`;
          }).join('')}</div>`
          : '<div class="group"><div class="spinner">Ничего не найдено</div></div>';
      } catch {
        out.innerHTML = '<div class="group"><div class="spinner">Нет соединения с интернетом</div></div>';
      }
    }, 350);
  });
}

function useGPS() {
  if (!navigator.geolocation) { toast('Геолокация недоступна'); return; }
  toast('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = +pos.coords.latitude.toFixed(4);
    const lon = +pos.coords.longitude.toFixed(4);
    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let name = 'Моё местоположение';
    let region = '';
    const [tzRes, geoRes] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`).then((r) => r.json()),
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`).then((r) => r.json()),
    ]);
    if (tzRes.status === 'fulfilled' && tzRes.value.timezone) tz = tzRes.value.timezone;
    if (geoRes.status === 'fulfilled') {
      name = geoRes.value.city || geoRes.value.locality || name;
      region = [geoRes.value.principalSubdivision, geoRes.value.countryName].filter(Boolean).join(', ');
    }
    pickLocation({ name, region, lat, lon, tz });
  }, () => toast('Нет доступа к геолокации. Разрешите её в настройках Safari.'), { enableHighAccuracy: false, timeout: 15000 });
}

/* ---------- iCalendar export ---------- */
function exportICS() {
  const t = today();
  const eks = ekForRange(t, 366);
  const marks = markedLunarDays(S.loc, t, 366, S.system);
  const icsDate = (c) => civilKey(c).replace(/-/g, '');
  const icsUTC = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const txt = (s) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const stamp = icsUTC(new Date());
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Luna Ekadashi//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Экадаши и Луна'];
  const uid = (s) => `${s}-${S.loc.lat}-${S.loc.lon}@luna-ekadashi`;
  for (const e of eks) {
    const desc = `Вход: восход ${fmtT(e.fastStart)} (последняя еда накануне до ${fmtT(e.lastMeal)})\nВыход (парана): ${dayMonth(e.paranaDay)} ${fmtT(e.parana.start)}–${fmtT(e.parana.end)}\n${masaName(e.masa)}\nМесто: ${S.loc.name}`;
    L.push('BEGIN:VEVENT', `UID:${uid(`ek-${civilKey(e.day)}`)}`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.day)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.day, 1))}`,
      `SUMMARY:${txt(`🌿 ${e.name}`)}`, `DESCRIPTION:${txt(desc)}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT6H', `DESCRIPTION:${txt(`Завтра ${e.name}`)}`, 'END:VALARM', 'END:VEVENT');
    L.push('BEGIN:VEVENT', `UID:${uid(`par-${civilKey(e.paranaDay)}`)}`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsUTC(e.parana.start)}`, `DTEND:${icsUTC(e.parana.end)}`,
      `SUMMARY:${txt('Выход из экадаши (парана)')}`, `DESCRIPTION:${txt(`Прервать пост ${e.parana.reason}. После: ${e.name}`)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:Время параны', 'END:VALARM', 'END:VEVENT');
  }
  for (const m of marks) {
    L.push('BEGIN:VEVENT', `UID:${uid(`ld${m.n}-${civilKey(m.c)}`)}`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(m.c)}`, `DTEND;VALUE=DATE:${icsDate(addDays(m.c, 1))}`,
      `SUMMARY:${txt(`${m.n === 1 ? '🌑' : '🌕'} ${m.n}-й лунный день`)}`, `DESCRIPTION:${txt(lunarLabel(m.n))}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  const body = L.map(fold).join('\r\n');
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ekadashi-luna.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}
// RFC 5545 line folding at 75 octets (UTF-8 aware)
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/* ---------- boot ---------- */
render();
// refresh "today" when returning to the app on a new day
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tab !== 'set') render();
});
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
