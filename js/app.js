/* SBA Checklisten — Piloten-App (PWA). Ein Bildschirm nach dem anderen, alles aus dem lokalen Speicher,
 * Abgleich mit dem Worker, sobald Netz da ist. Keine Bibliotheken. */
import { APP } from './version.js';
import { t, setLang, getLang, LANGS } from './i18n.js';
import { api, setTokenGetter } from './api.js';
import * as store from './store.js';

const $app = document.getElementById('app');
const S = store.get();
setTokenGetter(() => store.get().token);

let route = { name: 'home', p: {} };
let online = navigator.onLine;
let installPrompt = null;
let swWaiting = null;
let updating = false;
let toastTimer = null;
let refreshTimer = null;
let whatsNew = null;
let whatsNewSince = 0;
let loginMsg = null;

// ---------- Helfer ----------
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ms) => { if (!ms) return '–'; const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtDate = (ms) => { if (!ms) return '–'; const d = new Date(ms); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
const WD = { de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], fr: ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'], en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] };
const fmtDay = (ms) => (WD[getLang()] || WD.de)[new Date(ms).getDay()] + ' ' + fmtDate(ms);
const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
function whenLabel(ms) {
  const now = Date.now();
  if (sameDay(ms, now)) return t('today') + ' ' + fmtTime(ms);
  if (sameDay(ms, now - 86400000)) return t('yesterday') + ' ' + fmtTime(ms);
  return fmtDate(ms) + ' ' + fmtTime(ms);
}
function icao(pos) {
  if (!pos || pos.lat == null) return '–';
  const f = (v, len) => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.round((a - d) * 60); return String(d).padStart(len, '0') + pad(m); };
  return f(pos.lat, 2) + (pos.lat >= 0 ? 'N' : 'S') + f(pos.lon, 3) + (pos.lon >= 0 ? 'E' : 'W');
}
function getPos(timeout = 6000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    navigator.geolocation.getCurrentPosition(
      (p) => fin({ lat: +p.coords.latitude.toFixed(5), lon: +p.coords.longitude.toFixed(5), acc: Math.round(p.coords.accuracy || 0) }),
      () => fin(null), { enableHighAccuracy: false, timeout, maximumAge: 60000 });
    setTimeout(() => fin(null), timeout + 500);
  });
}
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const platform = () => (isIOS() ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'other');

// ---------- Symbole ----------
const I = {
  chev: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  chevW: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  back: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  star: (on) => `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/></svg>`,
  check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  checkBig: '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  warn: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  lists: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  clock: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  dots: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  pdf: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
  plus: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  refresh: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>',
  phone: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  trash: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  logout: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h7v18h-7"/></svg>',
  info: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  install: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 8v7M9 12l3 3 3-3"/></svg>'
};

// ---------- Daten ----------
const data = () => store.get().data || { groups: [], balloonTypes: [], variables: [], balloons: [], favorites: [], checklists: [], settings: {} };
const user = () => store.get().user;
function activeBalloon() {
  const d = data(); const id = store.get().activeBalloonId;
  return d.balloons.find((b) => b.id === id) || d.balloons.find((b) => b.aktiv) || d.balloons[0] || null;
}
const balloonType = (b) => (b ? data().balloonTypes.find((x) => x.id === b.balloon_type_id) || null : null);
function visibleLists() {
  const b = activeBalloon(); const ty = balloonType(b);
  const d = data();
  const order = Object.fromEntries(d.groups.map((g) => [g.id, g.reihenfolge]));
  return d.checklists.filter((c) => !ty || c.art === 'beide' || c.art === ty.art)
    .sort((a, b2) => (order[a.group_id] - order[b2.group_id]) || a.title.localeCompare(b2.title));
}
const findList = (id) => data().checklists.find((c) => c.id === id);
const groupName = (g) => (g ? (g['name_' + getLang()] || g.name_de) : '');
const isFav = (id) => data().favorites.some((f) => f.checklist_id === id && f.source === 'nutzer');
const favEntry = (id) => data().favorites.find((f) => f.checklist_id === id);
function varValue(key, withUnit = true) {
  const ty = balloonType(activeBalloon()); if (!ty) return null;
  const v = ty.values && ty.values[key]; if (v == null || v === '') return null;
  const def = data().variables.find((x) => x.key === key);
  return withUnit && def && def.einheit ? v + ' ' + def.einheit : String(v);
}
// {{key}} im Text → Wert mit Einheit; steht die Einheit schon im Text dahinter, nur der Wert
const resolveText = (txt) => String(txt || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}(\s*\S*)/gi, (m, k, rest) => {
  const key = k.toLowerCase(); const def = data().variables.find((x) => x.key === key);
  const unitFollows = def && def.einheit && rest.trim().toLowerCase().startsWith(def.einheit.toLowerCase());
  return (varValue(key, !unitFollows) ?? '—') + rest;
});
const countItems = (content) => (content.sections || []).reduce((n, s) => n + (s.items || []).filter((i) => !i.type || i.type === 'item').length, 0);

// ---------- Sitzungen (Protokoll) ----------
function newSession(cl) {
  const b = activeBalloon();
  return { id: uuid(), checklist_id: cl.id, checklist_version_id: cl.version_id, balloon_id: b ? b.id : null, sprache: getLang(),
    start_device: Date.now(), status: 'offen', items: {}, items_total: cl.item_count || countItems(cl.content), pos_start: null, pos_end: null, title: cl.title, version: cl.version, kennzeichen: b ? b.kennzeichen : null };
}
const serialize = (s) => ({ id: s.id, checklist_version_id: s.checklist_version_id, balloon_id: s.balloon_id, sprache: s.sprache, start_device: s.start_device, end_device: s.end_device || null,
  status: s.status, pos_start: s.pos_start, pos_end: s.pos_end, items_total: s.items_total, items_done: Object.keys(s.items).length, items: Object.entries(s.items).map(([key, done_at]) => ({ key, done_at })) });
const logEntry = (s) => ({ id: s.id, title: s.title, version: s.version, kennzeichen: s.kennzeichen, start_device: s.start_device, end_device: s.end_device || null, status: s.status, pos_start: s.pos_start, pos_end: s.pos_end, items_total: s.items_total, items_done: Object.keys(s.items).length });
function lastTick(s) { const ticks = Object.values(s.items); return Math.max(s.start_device, ...(ticks.length ? ticks : [0])); }
function autoAbort() {
  const st = store.get(); const limit = (data().settings.abbruch_minuten || 60) * 60000; let changed = false;
  for (const [cid, s] of Object.entries(st.open)) {
    if (Date.now() - lastTick(s) > limit) {
      s.status = 'abgebrochen_auto'; s.end_device = Date.now();
      store.logUpsert(logEntry(s)); store.enqueue(serialize(s)); delete st.open[cid]; changed = true;
    }
  }
  if (changed) { store.save(); syncQueue(); }
}
async function syncQueue() {
  const q = store.get().queue; if (!q.length || !online || !store.get().token) return;
  try {
    const r = await api.sync(q.slice(0, 50));
    store.dequeue(r.results.filter((x) => x.ok || x.error === 'fremd').map((x) => x.id));
  } catch { /* später */ }
}
function ensureSession(cl) {
  const st = store.get();
  let s = st.open[cl.id];
  if (!s || s.checklist_version_id !== cl.version_id) {
    s = newSession(cl); st.open[cl.id] = s; store.save();
    store.enqueue(serialize(s)); syncQueue();
    getPos().then((pos) => { if (pos && st.open[cl.id] === s) { s.pos_start = pos; store.save(); } });
  }
  return s;
}
function openChecklist(id) {
  const cl = findList(id); if (!cl) return;
  ensureSession(cl);
  go('checklist', { id });
}
function toggleItem(cid, key) {
  const s = store.get().open[cid]; if (!s) return;
  if (s.items[key]) delete s.items[key]; else s.items[key] = Date.now();
  store.save(); render();
}
async function finishSession(cid, status) {
  const st = store.get(); const s = st.open[cid]; if (!s) return;
  s.status = status; s.end_device = Date.now();
  delete st.open[cid]; store.save();
  const result = { ...s };
  store.logUpsert(logEntry(result));
  go('done', { session: result });
  const pos = await getPos(5000);
  if (pos) { result.pos_end = pos; if (route.name === 'done' && route.p.session && route.p.session.id === result.id) render(); }
  store.logUpsert(logEntry(result)); store.enqueue(serialize(result)); syncQueue();
}

// ---------- Netz ----------
async function refresh(silent = true) {
  if (!store.get().token || !online) return false;
  try {
    const st = store.get();
    const r = await api.bootstrap(st.lastSeen || 0);
    const { whatsNew: wn, ...rest } = r;
    const firstLoad = !st.data; const prevSeen = st.lastSeen;
    store.set({ data: rest, dataAt: Date.now(), user: r.user, lastSeen: r.serverTime });
    if (r.user.sprache && r.user.sprache !== getLang()) { setLang(r.user.sprache); store.set({ lang: r.user.sprache }); }
    if (wn && wn.length && !firstLoad) { whatsNew = wn; whatsNewSince = prevSeen; }
    try { const sess = await api.sessions(0, 0); store.logReplace(sess.sessions.map((x) => ({ id: x.id, title: x.title, version: x.version, kennzeichen: x.kennzeichen, start_device: x.start_device || x.start_server, end_device: x.end_device || x.end_server, status: x.status, pos_start: x.pos_start, pos_end: x.pos_end, items_total: x.items_total, items_done: x.items_done }))); } catch { /* egal */ }
    await syncQueue();
    if (!silent) toast(t('saved'));
    render();
    return true;
  } catch (e) {
    if (e.code === 'nicht_angemeldet' || e.code === 'gesperrt') { doLogout(true); }
    return false;
  }
}

// ---------- Navigation und Darstellung ----------
function go(name, p = {}) { route = { name, p }; window.scrollTo(0, 0); render(); }
function toast(msg) {
  clearTimeout(toastTimer);
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.remove('hidden');
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function applyTheme() { const th = store.get().theme || 'auto'; if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th); }

const statusline = () => `<div class="statusline"><span class="who">${h(user() ? user().kuerzel : '')} · v${APP.version}</span><img class="logo-sym" src="assets/sba-symbol.png" alt="Swiss Ballooning Academy"></div>`;
const nav = (cur) => `<nav class="nav" aria-label="Hauptnavigation">
  <button type="button" class="emgbtn" data-act="emergency" aria-label="${h(t('nav_emergency'))}" title="${h(t('nav_emergency'))}">${I.warn}</button>
  <button type="button" class="${cur === 'home' ? 'cur' : ''}" data-act="home" ${cur === 'home' ? 'aria-current="page"' : ''}>${I.lists}${h(t('nav_lists'))}</button>
  <button type="button" class="${cur === 'log' ? 'cur' : ''}" data-act="log" ${cur === 'log' ? 'aria-current="page"' : ''}>${I.clock}${h(t('nav_log'))}</button>
  <button type="button" class="${cur === 'more' ? 'cur' : ''}" data-act="more" ${cur === 'more' ? 'aria-current="page"' : ''}>${I.dots}${h(t('nav_more'))}</button></nav>`;
const updateBanner = () => (swWaiting ? `<button type="button" class="banner blue" data-act="update">${h(t('update_available'))}</button>` : '');
const offlineBanner = () => (!online ? `<div class="banner">${h(t('offline'))}</div>` : '');

function render() {
  const token = store.get().token;
  let html = '';
  if (!token) html = viewLogin();
  else if (route.name === 'install') html = viewInstall();
  else if (route.name === 'checklist') html = viewChecklist();
  else if (route.name === 'done') html = viewDone();
  else if (route.name === 'emergency') html = viewEmergency();
  else if (route.name === 'log') html = viewLog();
  else if (route.name === 'more') html = viewMore();
  else html = viewHome();
  if (route.modal) html += route.modal();
  if (whatsNew && token && route.name === 'home' && !route.modal) html += viewWhatsNew();
  $app.innerHTML = html;
  const f = $app.querySelector('[data-autofocus]'); if (f) f.focus();
}

// ---------- Anmeldung ----------
function viewLogin() {
  const lang = getLang();
  return `<div class="screen"><div class="auth">
    <div class="brand"><img class="logo-big" src="assets/sba-logo.png" alt="Swiss Ballooning Academy"><h1>${h(t('checklists'))}</h1></div>
    <div class="langs">${LANGS.map((l) => `<button type="button" class="chip" data-act="lang" data-lang="${l.code}" aria-pressed="${lang === l.code}">${l.label}</button>`).join('')}</div>
    <form id="loginform" autocomplete="on">
      <div class="field"><label for="kuerzel">${h(t('login_kuerzel'))}</label><input id="kuerzel" name="username" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${h(t('login_kuerzel_ph'))}" value="${h(loginMsg?.kuerzel || '')}" ${loginMsg?.needName ? '' : 'data-autofocus'}></div>
      <div class="field"><label for="name">${h(t('login_name'))}</label><input id="name" name="name" type="text" autocomplete="name" placeholder="${h(t('login_name_ph'))}" value="${h(loginMsg?.name || '')}" ${loginMsg?.needName ? 'data-autofocus' : ''}></div>
      ${loginMsg?.text ? `<p class="msg ${loginMsg.kind || ''}" style="margin-top:12px">${h(loginMsg.text)}</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:18px">
        <button type="submit" class="btn primary big" aria-label="${h(t('login_next'))}" title="${h(t('login_next'))}">${I.chevW}</button>
        <p class="msg">${h(t('login_hint'))}</p>
      </div>
    </form>
    <div class="spacer"></div>
    <p class="footnote">${h(APP.name)} v${APP.version}</p>
  </div></div>`;
}
async function submitLogin() {
  const kuerzel = (document.getElementById('kuerzel').value || '').trim().toLowerCase();
  const name = (document.getElementById('name').value || '').trim();
  const clean = kuerzel.replace(/[^a-z0-9äöüéèàç._-]/g, '');
  if (clean.length < 5) { loginMsg = { kuerzel, name, text: t('login_too_short'), kind: 'err' }; render(); return; }
  if (!online) { loginMsg = { kuerzel, name, text: t('login_offline'), kind: 'err' }; render(); return; }
  try {
    const r = await api.login(clean, name, getLang(), platform());
    if (r.needName) { loginMsg = { kuerzel: clean, name, needName: true, text: t('login_need_name'), kind: 'err' }; render(); return; }
    loginMsg = null;
    store.set({ token: r.token, user: r.user, lang: r.user.sprache });
    setLang(r.user.sprache);
    const greet = r.existed ? t('login_welcome_back', { name: r.user.name }) : t('login_welcome_new', { kuerzel: r.user.kuerzel });
    if (!isStandalone()) go('install', { greet }); else go('home');
    refresh();
  } catch (e) {
    const map = { kuerzel_zu_kurz: t('login_too_short'), gesperrt: t('login_blocked'), offline: t('login_offline') };
    loginMsg = { kuerzel, name, text: map[e.code] || t('error', { msg: e.code }), kind: 'err' }; render();
  }
}

// ---------- Installation ----------
function viewInstall() {
  const p = route.p.tab || (isIOS() ? 'ios' : 'android');
  const steps = p === 'ios' ? ['install_ios_1', 'install_ios_2', 'install_ios_3'] : ['install_and_1', 'install_and_2', 'install_and_3'];
  return `<div class="screen"><div class="auth">
    <div class="brand"><img class="logo-big" src="assets/sba-logo.png" alt="Swiss Ballooning Academy"><h1>${h(t('checklists'))}</h1>${route.p.greet ? `<p class="msg ok">${h(route.p.greet)}</p>` : ''}</div>
    <div class="chips"><button type="button" class="chip" data-act="install-tab" data-tab="ios" aria-pressed="${p === 'ios'}">${h(t('install_iphone'))}</button><button type="button" class="chip" data-act="install-tab" data-tab="android" aria-pressed="${p === 'android'}">${h(t('install_android'))}</button></div>
    <section class="section"><h2 style="font-size:17px;text-transform:none;letter-spacing:0;color:var(--text)">${h(t('install_title'))}</h2>
      <ol class="steps">${steps.map((k, i) => `<li><span class="no">${i + 1}</span><span>${h(t(k))}</span></li>`).join('')}</ol>
      <p class="msg" style="text-align:left">${h(t('install_after'))}</p></section>
    <div class="spacer"></div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${installPrompt ? `<button type="button" class="btn primary big" data-act="install-now">${I.install}${h(t('install_now'))}</button>` : ''}
      <button type="button" class="btn ${installPrompt ? 'secondary' : 'primary'} big" data-act="install-done">${I.checkBig}<span>${h(t('install_done'))}</span></button>
      <button type="button" class="linkbtn" data-act="install-later">${h(t('install_later'))}</button>
    </div>
  </div></div>`;
}

// ---------- Übersicht ----------
function computeNext() {
  const d = data(); const b = activeBalloon();
  if (!d.checklists.length) return { kind: 'none' };
  if (!b && d.balloonTypes.length) return { kind: 'nobal' };
  const lists = visibleLists().filter((c) => !c.ist_notfall);
  if (!lists.length) return { kind: 'none' };
  const open = store.get().open;
  const o = lists.find((c) => open[c.id]);
  if (o) { const s = open[o.id]; return { kind: 'resume', list: o, sub: t('next_sub_progress', { done: Object.keys(s.items).length, n: s.items_total }) }; }
  const today = store.get().log.filter((e) => sameDay(e.start_device, Date.now()) && (e.status === 'abgeschlossen' || e.status === 'unvollstaendig')).sort((a, b2) => b2.start_device - a.start_device);
  if (today.length) {
    const last = today[0]; const lastList = d.checklists.find((c) => c.title === last.title) || null;
    const order = Object.fromEntries(d.groups.map((g) => [g.id, g.reihenfolge]));
    const lastOrder = lastList ? order[lastList.group_id] : -1;
    const nxt = lists.find((c) => order[c.group_id] > lastOrder);
    if (nxt) return { kind: 'next', list: nxt, sub: t('next_sub_done', { title: last.title, time: fmtTime(last.end_device || last.start_device), n: nxt.item_count }) };
  }
  return { kind: 'start', list: lists[0], sub: t('next_sub_items', { n: lists[0].item_count }) };
}
function viewHome() {
  const d = data(); const b = activeBalloon(); const ty = balloonType(b);
  const nx = computeNext();
  let nextHtml;
  if (nx.kind === 'nobal') nextHtml = `<button type="button" class="next" data-act="more"><span class="col"><span class="k">${h(t('next_step'))}</span><span class="t">${h(t('next_no_balloon'))}</span><span class="s">${h(t('next_no_balloon_sub'))}</span></span>${I.chevW}</button>`;
  else if (nx.kind === 'none') nextHtml = `<div class="next" style="background:var(--muted2)"><span class="col"><span class="k">${h(t('next_step'))}</span><span class="t">${h(t('next_no_lists'))}</span><span class="s">${h(t('next_no_lists_sub'))}</span></span></div>`;
  else nextHtml = `<button type="button" class="next" data-act="open" data-id="${nx.list.id}"><span class="col"><span class="k">${h(t('next_step'))}</span><span class="t">${h(t(nx.kind === 'resume' ? 'next_resume' : nx.kind === 'next' ? 'next_continue' : 'next_start', { title: nx.list.title }))}</span><span class="s">${h(nx.sub)}</span></span>${I.chevW}</button>`;

  const lists = visibleLists().filter((c) => !c.ist_notfall);
  const favs = lists.map((c) => ({ c, f: favEntry(c.id) })).filter((x) => x.f)
    .sort((a, b2) => ((b2.f.source === 'nutzer') - (a.f.source === 'nutzer')) || ((b2.f.last_used || 0) - (a.f.last_used || 0))).slice(0, 5);
  const favHtml = favs.length ? `<section class="section"><h2><span style="color:var(--amber)">${I.star(true)}</span>${h(t('favorites'))}</h2><div class="card list">
    ${favs.map(({ c, f }) => `<button type="button" class="row" data-act="open" data-id="${c.id}"><span class="col"><span class="t">${h(c.title)}</span><span class="s">${h(t(c.item_count === 1 ? 'item_one' : 'items', { n: c.item_count }))}${f.last_used ? ' · ' + h(t('last_used', { when: whenLabel(f.last_used) })) : ''}</span></span><span class="chev">${I.chev}</span></button>`).join('')}</div></section>` : '';

  const exp = store.get().expanded; const nextGroup = nx.list ? nx.list.group_id : null;
  const groups = d.groups.filter((g) => !g.ist_notfall);
  const groupHtml = groups.map((g, gi) => {
    const items = lists.filter((c) => c.group_id === g.id);
    const open = exp[g.id] != null ? exp[g.id] : (g.id === nextGroup);
    const last = gi === groups.length - 1;
    return `<button type="button" class="group" data-act="toggle-group" data-id="${g.id}" aria-expanded="${open}"><span>${h(groupName(g))}</span><span class="n">${items.length}${open ? I.up : I.down}</span></button>
      ${open ? `<div class="${last ? '' : 'group-last'}">${items.map((c) => `<div class="item"><button type="button" style="flex:1 1 auto;min-height:46px;border:0;background:none;color:inherit;text-align:left;font-size:15px;padding:0" data-act="open" data-id="${c.id}">${h(c.title)}</button>${isFav(c.id) ? `<button type="button" class="star" data-act="fav" data-id="${c.id}" aria-label="${h(t('fav_remove'))}" title="${h(t('fav_remove'))}">${I.star(true)}</button>` : `<button type="button" class="star off" data-act="fav" data-id="${c.id}" aria-label="${h(t('fav_add'))}" title="${h(t('fav_add'))}">${I.star(false)}</button>`}</div>`).join('') || `<div class="item"><span class="nf">–</span></div>`}</div>` : ''}`;
  }).join('');

  const balloonBtn = d.balloons.length > 1 ? `<button type="button" class="balloon-btn" data-act="pick-balloon"><span>${h(b.kennzeichen)} · ${h(t(ty ? ty.art : 'beide'))}</span>${I.down}</button>` : (b ? `<span class="sub nowrap">${h(b.kennzeichen)} · ${h(t(ty ? ty.art : 'beide'))}</span>` : '');
  return `<div class="screen">
    <header class="top">${statusline()}<div class="titlerow"><h1>${h(t('checklists'))}</h1>${balloonBtn}</div></header>
    ${updateBanner()}${offlineBanner()}
    <main class="main">
      ${nextHtml}
      ${favHtml}
      <section class="section"><h2>${h(ty ? t('all_lists', { art: t(ty.art) }) : t('all_lists_any'))}</h2><div class="card list">${groupHtml}</div></section>
    </main>
    ${nav('home')}</div>`;
}
function viewWhatsNew() {
  const d = data();
  const groups = Object.fromEntries(d.groups.map((g) => [g.id, g]));
  return `<div class="modal-bg" data-act="wn-close"><section class="modal" role="dialog" aria-labelledby="wn-title" data-stop>
    <div><h2 id="wn-title">${h(t('whatsnew'))}</h2><p>${h(t('whatsnew_sub', { date: fmtDate(whatsNewSince || Date.now()) }))}</p></div>
    <div>${whatsNew.map((w) => { const c = findList(w.id); return `<div class="wn-row"><span class="col"><span class="t" style="font-weight:600">${h(w.title)}</span><span class="s" style="font-size:13px;color:var(--muted)">${h(w.is_new ? t('wn_new', { group: c ? groupName(groups[c.group_id]) : '', n: c ? c.item_count : '' }) : t('wn_updated', { v: w.version }))}</span></span>
      ${w.is_new && c ? `<button type="button" class="star ${isFav(c.id) ? '' : 'off'}" data-act="fav" data-id="${c.id}" aria-label="${h(t('fav_add'))}" title="${h(t('fav_add'))}" style="color:${isFav(c.id) ? 'var(--amber)' : 'var(--box-border)'};border:0;background:none;width:40px;height:40px">${I.star(isFav(c.id))}</button>` : (c ? `<button type="button" class="linkbtn" data-act="wn-view" data-id="${c.id}">${h(t('wn_view'))}</button>` : '')}</div>`; }).join('')}</div>
    <button type="button" class="btn primary" data-act="wn-close" aria-label="${h(t('understood'))}" title="${h(t('understood'))}">${I.checkBig}</button>
  </section></div>`;
}
function viewBalloonPicker() {
  const d = data(); const cur = activeBalloon();
  return `<div class="sheet-bg" data-act="close-modal"><div class="sheet" data-stop><h2>${h(t('balloon'))}</h2>
    ${d.balloons.map((b) => { const ty = balloonType(b); return `<button type="button" class="row" data-act="set-balloon" data-id="${b.id}"><span class="col"><span class="t">${h(b.kennzeichen)}</span><span class="s">${h(ty ? ty.name + ' · ' + t(ty.art) : '')}</span></span>${b.id === cur.id ? `<span class="pill green">${h(t('active'))}</span>` : I.chev}</button>`; }).join('')}
  </div></div>`;
}

// ---------- Checkliste ----------
function viewChecklist() {
  const cl = findList(route.p.id); if (!cl) return viewHome();
  const s = ensureSession(cl);
  const b = activeBalloon(); const ty = balloonType(b);
  const total = s.items_total; const done = Object.keys(s.items).length; const pct = total ? Math.round(done / total * 100) : 0;
  const sections = (cl.content.sections || []).map((sec) => `<section class="section">${sec.title ? `<h2>${h(resolveText(sec.title))}</h2>` : ''}<div class="card list">
    ${(sec.items || []).map((it) => {
      if (it.type === 'note') return `<div class="ci note"><span class="box">${I.info}</span><span class="txt">${h(resolveText(it.text))}</span></div>`;
      const d = !!s.items[it.key]; const val = it.var && !/\{\{/.test(it.text) ? varValue(it.var) : null; // Chip nur, wenn der Wert nicht schon im Text steht
      return `<button type="button" class="ci ${d ? 'done' : ''}" data-act="tick" data-key="${h(it.key)}" aria-pressed="${d}"><span class="box">${d ? I.check : ''}</span><span class="txt">${h(resolveText(it.text))}</span>${val ? `<span class="val">${h(val)}</span>` : ''}</button>`;
    }).join('')}</div></section>`).join('');
  return `<div class="screen">
    <header class="top">${statusline()}
      <div class="backrow"><button type="button" class="back" data-act="home" aria-label="${h(t('back'))}" title="${h(t('back'))}">${I.back}</button>
        <div class="col" style="display:flex;flex-direction:column;gap:2px;min-width:0"><h1 style="font-size:21px">${h(cl.title)}</h1><p class="sub">${h([b ? b.kennzeichen : null, ty ? ty.name : null, t('list_version', { v: cl.version })].filter(Boolean).join(' · '))}</p></div></div>
      <div class="progress"><div class="l"><span>${h(t('progress'))}</span><span class="nowrap">${h(t('of', { done, n: total }))}</span></div><div class="bar"><div style="width:${pct}%"></div></div></div>
    </header>
    ${cl.fallback ? `<div class="banner">${h(t('translation_missing'))}</div>` : ''}
    <main class="main" style="gap:14px">${sections}</main>
    <div class="actions" style="position:sticky;bottom:0">
      <button type="button" class="btn-finish ${done >= total ? 'ready' : ''}" data-act="finish" aria-label="${h(t('finish'))}" title="${h(t('finish'))}">${I.checkBig}</button>
      <button type="button" class="btn-abort" data-act="abort" aria-label="${h(t('abort'))}" title="${h(t('abort'))}">${I.x}</button>
    </div>
    ${nav('')}</div>`;
}
function confirmModal(text, onOk) {
  route.modal = () => `<div class="modal-bg" data-act="close-modal"><div class="modal" data-stop><p style="color:var(--text);font-size:16px;font-weight:500">${h(text)}</p>
    <div class="two"><button type="button" class="btn primary" data-act="confirm-ok" aria-label="${h(t('ok'))}" title="${h(t('ok'))}">${I.checkBig}</button><button type="button" class="btn secondary" data-act="close-modal" aria-label="${h(t('cancel'))}" title="${h(t('cancel'))}">${I.x}</button></div></div></div>`;
  route.onOk = onOk; render();
}

// ---------- Abschluss ----------
function viewDone() {
  const s = route.p.session; if (!s) return viewHome();
  const d = data(); const b = d.balloons.find((x) => x.id === s.balloon_id); const ty = balloonType(b);
  const done = Object.keys(s.items).length; const ok = s.status === 'abgeschlossen';
  const dur = Math.max(0, Math.round((s.end_device - s.start_device) / 60000));
  const lists = visibleLists().filter((c) => !c.ist_notfall);
  const order = Object.fromEntries(d.groups.map((g) => [g.id, g.reihenfolge]));
  const cur = findList(s.checklist_id); const nxt = cur ? lists.find((c) => order[c.group_id] > order[cur.group_id]) : null;
  return `<div class="screen">
    <header class="top">${statusline()}</header>
    <main class="main">
      <div class="done-head"><div class="done-badge ${ok ? '' : 'part'}">${I.checkBig}</div><h1>${h(s.title)}</h1><span class="pill ${ok ? 'green' : 'amber'}">${h(t(ok ? 'done_title' : 'done_incomplete', { done, n: s.items_total }))}</span></div>
      <dl class="facts card">
        <dt>${h(t('date'))}</dt><dd>${h(fmtDate(s.start_device))}</dd>
        <dt>${h(t('time'))}</dt><dd class="nowrap">${h(fmtTime(s.start_device))} – ${h(fmtTime(s.end_device))} LT (${h(t('min', { n: dur }))})</dd>
        <dt>${h(t('balloon'))}</dt><dd>${h([b ? b.kennzeichen : '–', ty ? ty.name : null].filter(Boolean).join(' · '))}</dd>
        <dt>${h(t('place'))}</dt><dd class="nowrap">${h(icao(s.pos_end || s.pos_start))}</dd>
        <dt>${h(t('list'))}</dt><dd>${h(t('version_short', { v: s.version }))}</dd>
        <dt>${h(t('pilot'))}</dt><dd>${h(user().kuerzel)}</dd>
      </dl>
      <div class="spacer"></div>
      <div class="two">
        <button type="button" class="btn secondary" data-act="home" aria-label="${h(t('overview'))}" title="${h(t('overview'))}">${I.lists}<span>${h(t('overview'))}</span></button>
        ${nxt ? `<button type="button" class="btn primary" data-act="open" data-id="${nxt.id}" aria-label="${h(t('continue_with', { title: nxt.title }))}" title="${h(t('continue_with', { title: nxt.title }))}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(nxt.title)}</span>${I.chevW}</button>` : ''}
      </div>
    </main>
    ${nav('')}</div>`;
}

// ---------- Notfall ----------
function viewEmergency() {
  const lists = visibleLists().filter((c) => c.ist_notfall);
  return `<div class="screen emg">
    <header class="top">${statusline()}<div class="titlerow"><h1>${h(t('emergency'))}</h1><button type="button" class="close" data-act="home" aria-label="${h(t('emergency_close'))}" title="${h(t('emergency_close'))}">${I.x}</button></div></header>
    <main class="main" style="gap:10px">
      ${lists.length ? lists.map((c) => `<button type="button" class="emg-row" data-act="open" data-id="${c.id}"><span>${h(c.title)}</span>${I.chevW}</button>`).join('') : `<p class="msg">${h(t('emergency_none'))}</p>`}
      <div class="spacer"></div>
      <a class="emg-call" href="tel:117" aria-label="${h(t('emergency_call'))}" title="${h(t('emergency_call'))}">${I.phone}117 / 112</a>
    </main></div>`;
}

// ---------- Protokoll ----------
function viewLog() {
  const f = route.p.filter || '30';
  const now = Date.now(); const y = new Date().getFullYear();
  const from = f === '30' ? now - 30 * 86400000 : f === 'season' ? new Date(y, 0, 1).getTime() : 0;
  const entries = store.get().log.filter((e) => e.start_device >= from).sort((a, b) => b.start_device - a.start_device);
  const days = [];
  for (const e of entries) { const key = fmtDate(e.start_device) + '|' + (e.kennzeichen || ''); let d = days.find((x) => x.key === key); if (!d) { d = { key, ts: e.start_device, kz: e.kennzeichen, rows: [] }; days.push(d); } d.rows.push(e); }
  const pillClass = (e) => (e.status === 'abgeschlossen' ? 'green' : e.status === 'unvollstaendig' ? 'amber' : e.status === 'offen' ? 'grey' : 'red');
  const rangeLabel = f === '30' ? t('log_30') : f === 'season' ? t('log_season', { y }) : t('log_all');
  return `<div class="screen">
    <header class="top">${statusline()}
      <div class="titlerow"><h1>${h(t('log_title'))}</h1><button type="button" class="iconbtn" data-act="print" aria-label="${h(t('log_pdf'))}" title="${h(t('log_pdf'))}">${I.pdf}</button></div>
      <div class="chips"><button type="button" class="chip" data-act="log-filter" data-f="30" aria-pressed="${f === '30'}">${h(t('log_30'))}</button><button type="button" class="chip" data-act="log-filter" data-f="season" aria-pressed="${f === 'season'}">${h(t('log_season', { y }))}</button><button type="button" class="chip" data-act="log-filter" data-f="all" aria-pressed="${f === 'all'}">${h(t('log_all'))}</button></div>
    </header>
    <main class="main">
      <div class="print-head">${h(t('print_title', { kuerzel: user().kuerzel }))} · ${h(user().name || '')} · ${h(t('print_range'))}: ${h(rangeLabel)} · ${h(t('print_generated', { when: fmtDate(now) + ' ' + fmtTime(now) }))}</div>
      ${days.length ? days.map((d) => `<section class="section logday"><h2>${h(fmtDay(d.ts))}${d.kz ? ' · ' + h(d.kz) : ''}</h2><div class="card list">
        ${d.rows.map((e) => `<div class="logrow"><span class="tm">${h(fmtTime(e.start_device))} LT</span><span class="col"><span class="t">${h(e.title)}</span><span class="s">${e.end_device ? h(t('min', { n: Math.max(0, Math.round((e.end_device - e.start_device) / 60000)) })) + ' · ' : ''}${h(icao(e.pos_start))}${e.pos_end && icao(e.pos_end) !== icao(e.pos_start) ? ' → ' + h(icao(e.pos_end)) : ''} · v${h(e.version)}</span></span><span class="pill ${pillClass(e)}">${h(e.items_done)} / ${h(e.items_total)}</span></div>`).join('')}
      </div></section>`).join('') : `<p class="msg">${h(t('log_empty'))}</p>`}
    </main>
    ${nav('log')}</div>`;
}

// ---------- Mehr ----------
function viewMore() {
  const d = data(); const u = user(); const cur = activeBalloon(); const st = store.get();
  const balloons = d.balloons.map((b) => { const ty = balloonType(b); const vals = ty ? d.variables.filter((v) => ty.values && ty.values[v.key] != null && ty.values[v.key] !== '' && (!v.nur_art || v.nur_art === ty.art)).map((v) => `<span>${h((v['label_' + getLang()] || v.label_de) + ' ' + ty.values[v.key] + (v.einheit ? ' ' + v.einheit : ''))}</span>`).join('') : '';
    const isCur = cur && cur.id === b.id;
    return `<div class="bal"><div class="h"><span class="col" style="display:flex;flex-direction:column;gap:2px"><span class="kz">${h(b.kennzeichen)}</span><span class="m">${h(t('balloon_type'))}: ${h(ty ? ty.name + ' · ' + t(ty.art) : '–')}</span></span>
      <span style="display:flex;gap:6px;align-items:center">${isCur ? `<span class="pill green">${h(t('active'))}</span>` : `<button type="button" class="iconbtn" data-act="set-balloon" data-id="${b.id}" aria-label="${h(t('choose_balloon'))}" title="${h(t('choose_balloon'))}">${I.checkBig}</button>`}<button type="button" class="iconbtn" style="color:var(--red)" data-act="del-balloon" data-id="${b.id}" aria-label="${h(t('remove_balloon'))}" title="${h(t('remove_balloon'))}">${I.trash}</button></span></div>
      ${isCur && vals ? `<div class="vals">${vals}</div>` : ''}</div>`; }).join('');
  return `<div class="screen">
    <header class="top">${statusline()}<div class="titlerow"><h1>${h(t('more'))}</h1></div></header>
    ${updateBanner()}
    <main class="main">
      <section class="section"><h2>${h(t('my_balloons'))}</h2><div class="card list">${balloons}
        <button type="button" class="set" data-act="add-balloon" aria-label="${h(t('add_balloon'))}" title="${h(t('add_balloon'))}" style="justify-content:center;color:var(--blue);font-weight:600">${I.plus}<span>${h(t('add_balloon'))}</span></button></div></section>
      <section class="section"><h2>${h(t('settings'))}</h2><div class="card list">
        <div class="set"><span>${h(t('language'))}</span><div class="seg">${LANGS.map((l) => `<button type="button" data-act="set-lang" data-lang="${l.code}" aria-pressed="${getLang() === l.code}">${l.short}</button>`).join('')}</div></div>
        <button type="button" class="set" data-act="edit-name"><span>${h(t('name'))}</span><span class="v">${h(u.name || '')}${I.chev}</span></button>
        <button type="button" class="set" data-act="edit-kuerzel"><span>${h(t('change_kuerzel'))}</span><span class="v">${h(u.kuerzel)}${I.chev}</span></button>
        <div class="set"><span>${h(t('theme'))}</span><div class="seg">${['auto', 'light', 'dark'].map((k) => `<button type="button" data-act="set-theme" data-theme="${k}" aria-pressed="${(st.theme || 'auto') === k}">${h(t('theme_' + k))}</button>`).join('')}</div></div>
        <div class="set"><span class="col" style="display:flex;flex-direction:column;gap:2px;min-width:0"><span>${h(t('lists_status'))}</span><span class="v" style="white-space:normal">${h(st.dataAt ? t('lists_uptodate', { when: whenLabel(st.dataAt) }) : t('lists_never'))}</span></span><button type="button" class="iconbtn" data-act="refresh" aria-label="${h(t('lists_check'))}" title="${h(t('lists_check'))}">${I.refresh}</button></div>
        ${!isStandalone() ? `<button type="button" class="set" data-act="install"><span>${h(t('install_title'))}</span><span class="v">${I.install}</span></button>` : ''}
      </div></section>
      ${(u.rolle === 'admin' || u.rolle === 'supermaster') ? `<a class="btn secondary" href="admin.html">Admin</a>` : ''}
      <button type="button" class="btn danger" data-act="logout" aria-label="${h(t('logout'))}" title="${h(t('logout'))}">${I.logout}<span>${h(t('logout'))}</span></button>
      <p class="footnote">${h(APP.name)} v${APP.version} · checklists.wicki.aero</p>
    </main>
    ${nav('more')}</div>`;
}
function inputModal(title, value, placeholder, onOk, opts = {}) {
  route.modal = () => `<div class="modal-bg" data-act="close-modal"><form class="modal" data-stop id="modalform"><h2>${h(title)}</h2>
    ${opts.select ? `<div class="field"><label for="mselect">${h(opts.selectLabel || '')}</label><select id="mselect">${opts.select.map((o) => `<option value="${h(o.value)}">${h(o.label)}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="minput">${h(opts.label || title)}</label><input id="minput" type="text" value="${h(value || '')}" placeholder="${h(placeholder || '')}" ${opts.attrs || ''} data-autofocus></div>
    ${route.modalMsg ? `<p class="msg err">${h(route.modalMsg)}</p>` : ''}
    <div class="two"><button type="submit" class="btn primary" aria-label="${h(t('ok'))}" title="${h(t('ok'))}">${I.checkBig}</button><button type="button" class="btn secondary" data-act="close-modal" aria-label="${h(t('cancel'))}" title="${h(t('cancel'))}">${I.x}</button></div></form></div>`;
  route.onOk = onOk; route.modalMsg = null; render();
}
async function doLogout(silent) {
  try { await syncQueue(); if (!silent) await api.logout(); } catch { /* egal */ }
  store.reset(); route = { name: 'home', p: {} }; render();
}

// ---------- Ereignisse ----------
$app.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (e.target.id === 'loginform') return submitLogin();
  if (e.target.id === 'modalform' && route.onOk) { const v = document.getElementById('minput').value; const sel = document.getElementById('mselect'); await route.onOk(v, sel ? sel.value : null); }
});
$app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (e.target.closest('[data-stop]') && el.classList.contains('modal-bg')) return;
  if (e.target.closest('[data-stop]') && el.classList.contains('sheet-bg')) return;
  const act = el.dataset.act; const id = el.dataset.id;
  const closeModal = () => { route.modal = null; route.onOk = null; route.modalMsg = null; render(); };
  switch (act) {
    case 'lang': setLang(el.dataset.lang); store.set({ lang: el.dataset.lang }); render(); break;
    case 'install-tab': route.p.tab = el.dataset.tab; render(); break;
    case 'install-now': if (installPrompt) { installPrompt.prompt(); try { await installPrompt.userChoice; } catch { /* egal */ } installPrompt = null; } render(); break;
    case 'install-done': store.set({ installedAsked: true }); api.installed().catch(() => null); go('home'); break;
    case 'install-later': store.set({ installedAsked: true }); go('home'); break;
    case 'install': go('install'); break;
    case 'home': go('home'); break;
    case 'log': go('log'); break;
    case 'more': go('more'); break;
    case 'emergency': go('emergency'); break;
    case 'open': whatsNew = null; openChecklist(id); break;
    case 'toggle-group': { const st = store.get(); const nx = computeNext(); const cur = st.expanded[id] != null ? st.expanded[id] : !!(nx.list && nx.list.group_id === id); st.expanded[id] = !cur; store.save(); render(); break; }
    case 'fav': { const on = !isFav(id); const d = data(); d.favorites = d.favorites.filter((f) => f.checklist_id !== id); if (on) d.favorites.push({ checklist_id: id, source: 'nutzer', last_used: null }); store.save(); render(); api.favorite(id, on).catch(() => null); break; }
    case 'pick-balloon': route.modal = viewBalloonPicker; render(); break;
    case 'set-balloon': { store.set({ activeBalloonId: id }); const d = data(); d.balloons.forEach((b) => { b.aktiv = b.id === id ? 1 : 0; }); store.save(); closeModal(); api.updateBalloon(id, { aktiv: true }).catch(() => null); break; }
    case 'del-balloon': confirmModal(t('remove_balloon') + ' ' + (data().balloons.find((b) => b.id === id) || {}).kennzeichen + '?', async () => { const d = data(); d.balloons = d.balloons.filter((b) => b.id !== id); if (store.get().activeBalloonId === id) store.set({ activeBalloonId: null }); store.save(); closeModal(); try { await api.deleteBalloon(id); } catch { /* egal */ } }); break;
    case 'add-balloon': {
      const types = data().balloonTypes;
      if (!types.length) { toast(t('no_types')); break; }
      inputModal(t('add_balloon'), '', t('kennzeichen_ph'), async (v, typeId) => {
        const kz = v.trim().toUpperCase(); if (!kz) return;
        try { const r = await api.addBalloon(kz, typeId); const d = data(); d.balloons.forEach((b) => { b.aktiv = 0; }); const ex = d.balloons.find((b) => b.id === r.id); if (ex) { ex.balloon_type_id = typeId; ex.aktiv = 1; } else d.balloons.push({ id: r.id, kennzeichen: kz, balloon_type_id: typeId, aktiv: 1 }); store.set({ activeBalloonId: r.id }); store.save(); closeModal(); toast(t('saved')); }
        catch (e2) { route.modalMsg = e2.code === 'offline' ? t('login_offline') : t('error', { msg: e2.code }); render(); }
      }, { label: t('kennzeichen'), select: types.map((ty) => ({ value: ty.id, label: ty.name + ' · ' + t(ty.art) })), selectLabel: t('choose_type'), attrs: 'autocapitalize="characters"' });
      break;
    }
    case 'tick': toggleItem(route.p.id, el.dataset.key); break;
    case 'finish': { const s = store.get().open[route.p.id]; if (!s) break; const done = Object.keys(s.items).length; if (done >= s.items_total) finishSession(route.p.id, 'abgeschlossen'); else confirmModal(t('confirm_incomplete', { done, n: s.items_total }), () => { route.modal = null; finishSession(route.p.id, 'unvollstaendig'); }); break; }
    case 'abort': confirmModal(t('confirm_abort'), () => { route.modal = null; const cid = route.p.id; const st = store.get(); const s = st.open[cid]; if (s) { s.status = 'abgebrochen'; s.end_device = Date.now(); delete st.open[cid]; store.save(); store.logUpsert(logEntry(s)); store.enqueue(serialize(s)); syncQueue(); } go('home'); }); break;
    case 'confirm-ok': if (route.onOk) { const fn = route.onOk; route.onOk = null; await fn(); } break;
    case 'close-modal': closeModal(); break;
    case 'wn-close': whatsNew = null; render(); break;
    case 'wn-view': { const c = findList(id); whatsNew = null; if (c) { store.get().expanded[c.group_id] = true; store.save(); } render(); break; }
    case 'log-filter': route.p.filter = el.dataset.f; render(); break;
    case 'print': window.print(); break;
    case 'set-lang': { const l = el.dataset.lang; setLang(l); store.set({ lang: l }); render(); try { await api.updateMe({ sprache: l }); await refresh(); } catch { /* offline: Inhalte bleiben in alter Sprache */ } break; }
    case 'set-theme': store.set({ theme: el.dataset.theme }); applyTheme(); render(); break;
    case 'refresh': { const ok = await refresh(false); if (!ok) toast(t('offline')); break; }
    case 'edit-name': inputModal(t('name'), user().name, t('login_name_ph'), async (v) => { if (!v.trim()) return; try { const r = await api.updateMe({ name: v.trim() }); store.set({ user: r.user }); closeModal(); toast(t('saved')); } catch (e2) { route.modalMsg = e2.code === 'offline' ? t('login_offline') : t('error', { msg: e2.code }); render(); } }, { attrs: 'autocomplete="name"' }); break;
    case 'edit-kuerzel': inputModal(t('change_kuerzel'), user().kuerzel, t('login_kuerzel_ph'), async (v) => { try { const r = await api.updateMe({ kuerzel: v.trim().toLowerCase() }); store.set({ user: r.user }); closeModal(); toast(t('saved')); } catch (e2) { route.modalMsg = e2.code === 'kuerzel_vergeben' ? t('kuerzel_taken') : e2.code === 'kuerzel_zu_kurz' ? t('login_too_short') : e2.code === 'offline' ? t('login_offline') : t('error', { msg: e2.code }); render(); } }, { attrs: 'autocapitalize="none" autocorrect="off"' }); break;
    case 'logout': confirmModal(t('logout_confirm'), () => doLogout(false)); break;
    case 'update': if (swWaiting) { updating = true; swWaiting.postMessage('skipWaiting'); } break;
    default: break;
  }
});

// ---------- Start ----------
function init() {
  const st = store.get();
  const nav0 = (navigator.language || 'de').slice(0, 2).toLowerCase();
  setLang(st.lang || (['de', 'fr', 'en'].includes(nav0) ? nav0 : 'de'));
  applyTheme();
  window.addEventListener('online', () => { online = true; syncQueue(); refresh(); render(); });
  window.addEventListener('offline', () => { online = false; render(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (route.name === 'install') render(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; api.installed().catch(() => null); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { autoAbort(); refresh(); } });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { type: 'module' }).then((reg) => {
      if (reg.waiting) { swWaiting = reg.waiting; render(); }
      reg.addEventListener('updatefound', () => { const nw = reg.installing; if (!nw) return; nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = nw; render(); } }); });
    }).catch(() => null);
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) { updating = false; location.reload(); } });
  }
  if (st.token) { autoAbort(); if (!isStandalone() && !st.installedAsked && !st.data) route = { name: 'install', p: {} }; }
  render();
  if (st.token) { refresh(); refreshTimer = setInterval(() => refresh(), 10 * 60000); }
}
init();
