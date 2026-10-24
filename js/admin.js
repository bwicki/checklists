/* SBA Checklisten — Verwaltung (Desktop, Rolle admin/supermaster). Deutsch. */
import { APP } from './version.js';
import { api, setTokenGetter } from './api.js';
import * as store from './store.js';
import { parseFile, parseText, linesToContent, contentToText, textToContent, countItems, countNotes, usedVars } from './import.js';

const $app = document.getElementById('app');
setTokenGetter(() => store.get().token);

const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ms) => { if (!ms) return '–'; const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtDate = (ms) => { if (!ms) return '–'; const d = new Date(ms); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
const fmtWhen = (ms) => { if (!ms) return '–'; const d = new Date(ms), n = new Date(); const same = d.toDateString() === n.toDateString(); const yest = new Date(n.getTime() - 86400000).toDateString() === d.toDateString(); return (same ? 'heute' : yest ? 'gestern' : fmtDate(ms)) + ' ' + fmtTime(ms) + ' LT'; };
const icao = (lat, lon) => { if (lat == null) return '–'; const f = (v, len) => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.round((a - d) * 60); return String(d).padStart(len, '0') + pad(m); }; return f(lat, 2) + (lat >= 0 ? 'N' : 'S') + f(lon, 3) + (lon >= 0 ? 'E' : 'W'); };
const ART = { heissluft: 'Heissluft', gas: 'Gas', beide: 'Beide' };
const STATUS = { abgeschlossen: ['abgeschlossen', 'green'], unvollstaendig: ['unvollständig', 'amber'], abgebrochen: ['abgebrochen', 'red'], abgebrochen_auto: ['abgebrochen (Zeit)', 'red'], offen: ['offen', 'grey'] };
const ROLE = { pilot: 'Pilot', admin: 'Admin', supermaster: 'Supermaster' };

const I = {
  check: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  edit: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  plus: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  upload: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V5M6 11l6-6 6 6M4 21h16"/></svg>',
  print: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
  download: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>',
  globe: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  release: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  lock: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  log: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  crown: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18l1-11-5 4-5-7-5 7-5-4z"/></svg>',
  warn: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  chevR: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
};

// ---------- Zustand ----------
let page = (location.hash || '#checklists').slice(1);
let me = null;
let cache = {};           // je Seite geladene Daten
let modal = null;         // Funktion, die das Dialog-HTML liefert
let msg = null;
let sel = new Set();      // ausgewählte Checklisten
let filt = { gruppe: '', art: '', status: '' };
let usageFilt = { zeit: 'season', nutzer: '', liste: '', art: '' };
let imp = null;           // Import-Assistent
let editor = null;        // Editor-Zustand
let toastTimer = null;

function toast(s) { clearTimeout(toastTimer); let el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); } el.textContent = s; el.classList.remove('hidden'); toastTimer = setTimeout(() => el.classList.add('hidden'), 2600); }
function errText(e) { const m = { offline: 'Keine Verbindung.', kein_zugriff: 'Kein Zugriff.', nur_supermaster: 'Nur der Supermaster darf das.', gruppenlimit: 'Gruppenlimit erreicht – zuerst eine Liste verschieben oder das Limit erhöhen (Einstellungen).', titel_fehlt: 'Titel fehlt.', api_schluessel_fehlt: 'Kein Claude-API-Schlüssel hinterlegt (Einstellungen → Zugänge).', kuerzel_vergeben: 'Kürzel schon vergeben.' }; return m[e.code] || ('Fehler: ' + (e.code || e.message)); }

// ---------- Rahmen ----------
const NAV = [['checklists', 'Checklisten'], ['import', 'Import'], ['balloons', 'Ballonmuster'], ['usage', 'Auswertung'], ['users', 'Nutzer'], ['settings', 'Einstellungen']];
function frame(inner) {
  return `<div class="layout">
  <aside class="side">
    <div class="brand"><div class="sq">${I.check}</div><span><b>Checklisten</b><small>Administration</small></span></div>
    ${NAV.map(([k, l]) => `<a href="#${k}" class="${page === k ? 'cur' : ''}" ${page === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}
    <div class="grow"></div>
    <a href="index.html" class="pilot">Zur Piloten-App</a>
    <button type="button" class="navbtn pilot" data-act="logout">Abmelden</button>
    <div class="who">${h(me.kuerzel)} · v${APP.version}<span>${ROLE[me.rolle] || me.rolle}</span></div>
  </aside>
  <main class="main"><div class="logo-row"><img src="assets/sba-logo.png" alt="Swiss Ballooning Academy"></div>${inner}</main></div>${modal ? modal() : ''}`;
}
async function render() {
  const token = store.get().token;
  if (!token) { $app.innerHTML = viewLogin(); return; }
  if (!me) {
    try { me = (await api.me()).user; } catch (e) { if (e.code === 'nicht_angemeldet' || e.code === 'gesperrt') { store.set({ token: null, user: null }); $app.innerHTML = viewLogin(); return; } $app.innerHTML = `<div class="login"><form><p class="msg err">${h(errText(e))}</p></form></div>`; return; }
  }
  if (me.rolle !== 'admin' && me.rolle !== 'supermaster') { $app.innerHTML = `<div class="login"><form><img src="assets/sba-logo.png" alt=""><h1>Verwaltung</h1><p class="msg err">Kürzel ${h(me.kuerzel)} hat die Rolle Pilot – kein Zugriff auf die Verwaltung.</p><a class="btn" href="index.html">Zur Piloten-App</a><button type="button" class="btn" data-act="logout">Abmelden</button></form></div>`; return; }
  let inner;
  try {
    if (page === 'import') inner = await viewImport();
    else if (page === 'balloons') inner = await viewBalloons();
    else if (page === 'usage') inner = await viewUsage();
    else if (page === 'users') inner = await viewUsers();
    else if (page === 'settings') inner = await viewSettings();
    else inner = await viewChecklists();
  } catch (e) { inner = `<p class="msg err">${h(errText(e))}</p>`; }
  $app.innerHTML = frame(inner);
  const f = $app.querySelector('[data-autofocus]'); if (f) f.focus();
}

// ---------- Anmeldung ----------
function viewLogin() {
  return `<div class="login"><form id="loginform"><img src="assets/sba-logo.png" alt="Swiss Ballooning Academy"><h1>Verwaltung</h1>
    <div class="field"><label for="kuerzel">Kürzel</label><input id="kuerzel" type="text" autocomplete="username" autocapitalize="none" data-autofocus></div>
    ${msg ? `<p class="msg err">${h(msg)}</p>` : ''}
    <button type="submit" class="btn primary">Anmelden</button>
    <p class="msg">Nur Kürzel mit Rolle Admin oder Supermaster. Neue Kürzel werden in der Piloten-App angelegt.</p></form></div>`;
}

// ---------- Checklisten ----------
async function loadChecklists() { cache.cl = await api.admin.checklists(); return cache.cl; }
function latest(c) { return c.versions[c.versions.length - 1]; }
function current(c) { return c.versions.find((v) => v.id === c.current_version_id) || null; }
function draft(c) { return c.versions.find((v) => v.status === 'entwurf') || null; }
const langPill = (st, lang) => st === 'geprueft' ? `<span class="pill green" title="Übersetzung geprüft">${lang}</span>` : st === 'automatisch' ? `<span class="pill amber" title="Übersetzung automatisch erzeugt – prüfen und freigeben">${I.warn} ${lang}</span>` : `<span class="pill grey" title="Keine Übersetzung">${lang}</span>`;
async function viewChecklists() {
  const d = cache.cl || await loadChecklists();
  const groups = d.groups; const gname = (id) => (groups.find((g) => g.id === id) || {}).name_de || id;
  const rows = d.checklists.filter((c) => (!filt.gruppe || c.group_id === filt.gruppe) && (!filt.art || c.art === filt.art) && (!filt.status || (filt.status === 'entwurf' ? !!draft(c) : !!current(c))));
  const counts = groups.map((g) => { const n = d.checklists.filter((c) => c.group_id === g.id).length; return `<span class="chip ${g.limit_count && n >= g.limit_count ? 'full' : ''}">${h(g.name_de)} ${n}${g.limit_count ? ' / ' + g.limit_count : ''}</span>`; }).join('');
  for (const id of [...sel]) if (!d.checklists.some((c) => c.id === id)) sel.delete(id);
  return `<div class="head"><h1>Checklisten</h1><div class="tools">
      <span class="cnt">${sel.size} ausgewählt</span>
      <select id="printlang" aria-label="Sprache für Druck und PDF"><option value="de">DE</option><option value="fr">FR</option><option value="en">EN</option></select>
      <button type="button" class="ib" data-act="print" aria-label="Ausgewählte Checklisten drucken oder als PDF speichern" title="Drucken / als PDF speichern" ${sel.size ? '' : 'disabled'}>${I.print}</button>
      <span class="sep"></span>
      <a class="ib primary" href="#import" aria-label="Checkliste importieren (Word / Excel)" title="Importieren (Word / Excel)">${I.upload}</a>
      <button type="button" class="ib" data-act="new" aria-label="Neue Liste von Hand anlegen" title="Neue Liste von Hand">${I.plus}</button></div></div>
    <div class="chips"><span class="lbl">Gruppen:</span>${counts}</div>
    <div class="filters"><label for="f-gruppe">Gruppe</label><select id="f-gruppe" data-filt="gruppe"><option value="">Alle</option>${groups.map((g) => `<option value="${g.id}" ${filt.gruppe === g.id ? 'selected' : ''}>${h(g.name_de)}</option>`).join('')}</select>
      <label for="f-art">Ballonart</label><select id="f-art" data-filt="art"><option value="">Alle</option>${Object.entries(ART).map(([k, v]) => `<option value="${k}" ${filt.art === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <label for="f-status">Status</label><select id="f-status" data-filt="status"><option value="">Alle</option><option value="frei" ${filt.status === 'frei' ? 'selected' : ''}>Freigegeben</option><option value="entwurf" ${filt.status === 'entwurf' ? 'selected' : ''}>Mit Entwurf</option></select></div>
    <div class="card tablewrap"><table><thead><tr><th><input type="checkbox" data-act="sel-all" aria-label="Alle auswählen" ${rows.length && rows.every((c) => sel.has(c.id)) ? 'checked' : ''}></th><th>Gruppe</th><th>Checkliste</th><th>Ballonart</th><th>Sprachen</th><th>Punkte</th><th>Version</th><th>Status</th><th>Geändert</th><th>Nutzungen</th><th></th></tr></thead><tbody>
      ${rows.length ? rows.map((c) => { const v = current(c) || latest(c); const dr = draft(c); return `<tr>
        <td><input type="checkbox" data-act="sel" data-id="${c.id}" aria-label="Auswählen" ${sel.has(c.id) ? 'checked' : ''}></td>
        <td>${h(gname(c.group_id))}</td><td><b>${h(v.title)}</b></td><td><span class="pill blue">${ART[c.art]}</span></td>
        <td><span class="langs"><span class="pill green" title="Quelle (importiert)">DE</span>${langPill(v.status_fr, 'FR')}${langPill(v.status_en, 'EN')}</span></td>
        <td class="num">${v.item_count}</td><td class="num">${v.version}${dr && dr.id !== v.id ? ` <span class="pill grey">Entwurf ${dr.version}</span>` : ''}</td>
        <td>${current(c) ? '<span class="pill green">Freigegeben</span>' : '<span class="pill amber">Entwurf</span>'}</td>
        <td class="nowrap">${h(fmtDate(v.released_at || v.created_at))} · ${h(v.created_by || '')}</td><td class="num">${c.sessions}</td>
        <td class="acts"><button type="button" class="ib small" data-act="edit" data-id="${c.id}" aria-label="Bearbeiten" title="Bearbeiten (neue Version)">${I.edit}</button>
          ${dr ? `<button type="button" class="ib small" style="color:var(--green)" data-act="release" data-id="${dr.id}" aria-label="Entwurf freigeben" title="Entwurf ${dr.version} freigeben">${I.release}</button>` : ''}
          <button type="button" class="ib small" data-act="translate" data-id="${c.id}" aria-label="Übersetzungen" title="Übersetzungen FR / EN">${I.globe}</button>
          <button type="button" class="ib small danger" data-act="del" data-id="${c.id}" aria-label="Löschen" title="Löschen">${I.trash}</button></td></tr>`; }).join('') : '<tr><td colspan="11" class="msg">Keine Checklisten. Über «Import» eine Word- oder Excel-Datei laden oder von Hand anlegen.</td></tr>'}
    </tbody></table></div>`;
}

// Editor (neue Liste / neue Version)
function openEditor(c, v, groups) {
  const content = v ? null : { title: '', sections: [{ title: '', items: [] }] };
  editor = { c, vid: v ? v.id : null, text: content ? contentToText(content) : '', group_id: c ? c.group_id : (groups[0] || {}).id, art: c ? c.art : 'beide', note: '', msg: null, loading: !!v };
  modal = () => viewEditor(false); render();
  if (v) api.admin.version(v.id).then((r) => { editor.text = contentToText(r.version.content_de); editor.loading = false; render(); }).catch((e) => { editor.msg = errText(e); editor.loading = false; render(); });
}
function viewEditor(inline) {
  const d = cache.cl; const vars = cache.vars || [];
  let content; try { content = textToContent(editor.text); } catch { content = { title: '', sections: [] }; }
  const n = countItems(content); const warn = +(cache.settings?.warn_items || 12);
  const body = `<div class="mb">
      <div class="row"><div class="field"><label for="e-gruppe">Gruppe</label><select id="e-gruppe" data-ed="group_id">${d.groups.map((g) => `<option value="${g.id}" ${editor.group_id === g.id ? 'selected' : ''}>${h(g.name_de)}</option>`).join('')}</select></div>
        <div class="field"><label for="e-art">Ballonart</label><select id="e-art" data-ed="art">${Object.entries(ART).map(([k, v]) => `<option value="${k}" ${editor.art === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field" style="flex:2 1 260px"><label for="e-note">Änderungsnotiz</label><input id="e-note" type="text" data-ed="note" value="${h(editor.note)}" placeholder="z. B. Punkt Funkcheck ergänzt"></div></div>
      <div class="editor">
        <div class="field"><label for="e-text">Listentext · <code># Titel</code> · <code>## Abschnitt</code> · eine Zeile je Punkt · <code>&gt; Hinweis</code> · Variablen als <code>{{name}}</code></label>
          <textarea id="e-text" data-ed="text" ${editor.loading ? 'disabled' : ''}>${h(editor.text)}</textarea>
          <div class="varbtns">${vars.map((v) => `<button type="button" data-act="insvar" data-key="${h(v.key)}" title="${h(v.label_de)}${v.einheit ? ' (' + h(v.einheit) + ')' : ''}">{{${h(v.key)}}}</button>`).join('')}</div></div>
        <div><div class="field"><label>Vorschau (wie auf dem Handy) · ${n} Punkte · ${countNotes(content)} Hinweise</label>${n > warn ? `<div class="warn">${I.warn} Mehr als ${warn} Punkte – kürzer ist besser. Lieber aufteilen.</div>` : ''}${preview(content, vars)}</div></div>
      </div>
      ${editor.msg ? `<p class="msg err">${h(editor.msg)}</p>` : ''}
    </div>
    <div class="mf"><button type="button" class="btn primary" data-act="save" ${editor.loading ? 'disabled' : ''}>${I.check} Als Entwurf speichern</button><button type="button" class="btn green" data-act="save-release" ${editor.loading ? 'disabled' : ''}>${I.check} Speichern und freigeben</button><button type="button" class="btn" data-act="${inline ? 'imp-back' : 'close'}">${I.x} ${inline ? 'Zurück' : 'Abbrechen'}</button></div>`;
  if (inline) return `<div class="card" style="overflow:hidden">${body}</div>`;
  return `<div class="modal-bg"><div class="modal wide"><div class="mh"><h2>${editor.c ? 'Neue Version: ' + h(content.title || '') : 'Neue Checkliste'}</h2><button type="button" class="ib small" data-act="close" aria-label="Schliessen" title="Schliessen">${I.x}</button></div>${body}</div></div>`;
}
function preview(content, vars) {
  const unit = (k) => { const v = vars.find((x) => x.key === k); return v ? '[' + v.label_de + (v.einheit ? ' ' + v.einheit : '') + ']' : '[' + k + ']'; };
  const txt = (s) => h(String(s).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k) => unit(k.toLowerCase())));
  return `<div class="preview"><h3>${h(content.title || '(Titel fehlt)')}</h3>${(content.sections || []).map((s) => `${s.title ? `<h4>${txt(s.title)}</h4>` : ''}${(s.items || []).map((it) => it.type === 'note' ? `<div class="pi note">${txt(it.text)}</div>` : `<div class="pi"><span class="bx"></span><span>${txt(it.text)}</span></div>`).join('')}`).join('')}</div>`;
}
async function saveEditor(release) {
  let content; try { content = textToContent(editor.text); } catch { editor.msg = 'Text unlesbar.'; render(); return; }
  if (!content.title) { editor.msg = 'Titel fehlt (erste Zeile: # Titel).'; render(); return; }
  if (!countItems(content)) { editor.msg = 'Keine Punkte.'; render(); return; }
  try {
    let vid;
    if (editor.c) {
      await api.admin.updateChecklist(editor.c.id, { group_id: editor.group_id, art: editor.art });
      vid = (await api.admin.newVersion(editor.c.id, { content, change_note: editor.note })).version_id;
    } else {
      vid = (await api.admin.createChecklist({ group_id: editor.group_id, art: editor.art, content, change_note: editor.note || 'Erstfassung', original_file: editor.original_file || null })).version_id;
    }
    if (release) await api.admin.release(vid);
    modal = null; editor = null; imp = null; await loadChecklists(); toast(release ? 'Freigegeben.' : 'Als Entwurf gespeichert.'); if (page === 'import') { location.hash = '#checklists'; } else render();
  } catch (e) { editor.msg = errText(e); render(); }
}

// Übersetzungen
function viewTranslate() {
  const tr = cache.tr; if (!tr) return '';
  const v = tr.version;
  const block = (lang) => { const st = v['status_' + lang]; const c = tr.edit[lang]; return `<div class="field"><label>${lang.toUpperCase()} · ${st === 'geprueft' ? '<span class="pill green">geprüft</span>' : st === 'automatisch' ? '<span class="pill amber">automatisch – zu prüfen</span>' : '<span class="pill grey">fehlt</span>'}</label><textarea data-tr="${lang}" style="min-height:300px">${h(c)}</textarea><div class="actions"><button type="button" class="btn green" data-act="tr-ok" data-lang="${lang}">${I.check} Als geprüft speichern</button><button type="button" class="btn" data-act="tr-save" data-lang="${lang}">Speichern (noch zu prüfen)</button></div></div>`; };
  return `<div class="modal-bg"><div class="modal wide"><div class="mh"><h2>Übersetzungen: ${h(v.content_de.title)} (Version ${v.version})</h2><button type="button" class="ib small" data-act="close" aria-label="Schliessen">${I.x}</button></div>
    <div class="mb"><div class="actions"><button type="button" class="btn primary" data-act="tr-auto" ${tr.busy ? 'disabled' : ''}>${I.globe} ${tr.busy ? 'Übersetzt …' : 'Automatisch übersetzen (FR und EN)'}</button><span class="msg">Nutzt den in den Einstellungen hinterlegten Claude-API-Schlüssel. Danach prüfen und als geprüft speichern – erst dann sehen Piloten die Übersetzung ohne Hinweis.</span></div>
      ${tr.msg ? `<p class="msg ${tr.kind || 'err'}">${h(tr.msg)}</p>` : ''}
      <div class="editor"><div class="field"><label>DE (Quelle)</label><textarea readonly style="min-height:300px">${h(contentToText(v.content_de))}</textarea></div><div style="display:flex;flex-direction:column;gap:14px">${block('fr')}${block('en')}</div></div></div>
    <div class="mf"><button type="button" class="btn" data-act="close">${I.x} Schliessen</button></div></div></div>`;
}
async function openTranslate(c) {
  const v = current(c) || latest(c);
  try { const r = await api.admin.version(v.id); cache.tr = { version: r.version, edit: { fr: r.version.content_fr ? contentToText(r.version.content_fr) : '', en: r.version.content_en ? contentToText(r.version.content_en) : '' }, msg: null }; modal = viewTranslate; render(); }
  catch (e) { toast(errText(e)); }
}

// Druck / PDF
async function printSelected() {
  const lang = document.getElementById('printlang').value;
  const d = cache.cl; const items = [];
  for (const id of sel) { const c = d.checklists.find((x) => x.id === id); if (!c) continue; const v = current(c) || latest(c); const r = await api.admin.version(v.id); const content = (lang !== 'de' && r.version['content_' + lang]) || r.version.content_de; items.push({ c, v: r.version, content, fallback: lang !== 'de' && !r.version['content_' + lang] }); }
  const gname = (id) => (d.groups.find((g) => g.id === id) || {})['name_' + lang] || (d.groups.find((g) => g.id === id) || {}).name_de || '';
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>SBA Checklisten</title><style>
    body{font-family:Inter,system-ui,sans-serif;color:#111;margin:0;padding:20mm 18mm}.cl{page-break-after:always}.cl:last-child{page-break-after:auto}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1D4ED8;padding-bottom:8px;margin-bottom:12px}.hd img{height:48px}
    h1{font-size:22px;margin:0}.meta{font-size:12px;color:#555;margin-top:4px}h2{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#555;margin:14px 0 6px}
    .it{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px}.bx{width:16px;height:16px;border:2px solid #9CA3AF;border-radius:4px;flex-shrink:0;margin-top:1px}
    .note{font-style:italic;color:#555;font-size:13px}.var{background:#FEF3C7;color:#92400E;border-radius:4px;padding:0 4px;font-weight:600}.ft{font-size:11px;color:#777;margin-top:16px}.fb{font-size:12px;color:#92400E}
    @media print{body{padding:0}}</style></head><body>
    ${items.map(({ c, v, content, fallback }) => `<section class="cl"><div class="hd"><div><h1>${h(content.title)}</h1><div class="meta">${h(gname(c.group_id))} · ${ART[c.art]} · Version ${v.version} · ${h(fmtDate(v.released_at || v.created_at))}${fallback ? ' · <span class="fb">Übersetzung fehlt – deutsche Fassung</span>' : ''}</div></div><img src="assets/sba-logo.png" alt=""></div>
      ${(content.sections || []).map((s) => `${s.title ? `<h2>${h(s.title)}</h2>` : ''}${(s.items || []).map((it) => it.type === 'note' ? `<div class="it note">${h(it.text)}</div>` : `<div class="it"><span class="bx"></span><span>${h(it.text).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, '<span class="var">$1</span>')}</span></div>`).join('')}`).join('')}
      <div class="ft">Swiss Ballooning Academy · SBA Checklisten v${APP.version} · Variablen in gelb werden in der App durch die Werte des Ballonmusters ersetzt.</div></section>`).join('')}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)})</script></body></html>`;
  const w = window.open('', '_blank'); if (!w) { toast('Pop-up blockiert – bitte erlauben.'); return; }
  w.document.write(html); w.document.close();
}

// ---------- Import ----------
async function viewImport() {
  if (!cache.cl) await loadChecklists();
  if (!cache.vars) { cache.vars = (await api.admin.balloonTypes()).variables; }
  if (!imp) imp = { step: 1, lines: null, original: '', filename: '', msg: null };
  const steps = `<ol class="steps"><li ${imp.step === 1 ? 'aria-current="step"' : ''}><span class="no">1</span>Datei hochladen</li><li ${imp.step === 2 ? 'aria-current="step"' : ''}><span class="no">2</span>Struktur prüfen</li><li ${imp.step === 3 ? 'aria-current="step"' : ''}><span class="no">3</span>Zuordnung und Freigabe</li></ol>`;
  if (imp.step === 1) {
    return `<div class="head"><h1>Import-Assistent</h1></div>${steps}
      <div class="drop" id="drop"><div>${I.upload}</div><b>Word (.docx), Excel (.xlsx) oder Text hierher ziehen</b><span>oder</span><label class="btn primary" for="file">Datei wählen</label><input id="file" type="file" accept=".docx,.xlsx,.xlsm,.xls,.csv,.txt,.md" class="hidden"></div>
      <div class="card form"><div class="field"><label for="paste">Oder Text einfügen (eine Zeile je Punkt; Abschnitte als eigene Zeile, z. B. «1. Korb»; Hinweise mit «Hinweis:»)</label><textarea id="paste" style="min-height:160px" placeholder="Checkliste Vor dem Start&#10;1. Korb&#10;Instrumente eingeschaltet und geprüft&#10;Ballast gezählt&#10;Hinweis: Bei Wind über 15 kt nicht starten."></textarea></div><div class="actions"><button type="button" class="btn primary" data-act="imp-text">Weiter mit diesem Text</button></div></div>
      ${imp.msg ? `<p class="msg err">${h(imp.msg)}</p>` : ''}
      <p class="hint">Erkannt werden Überschriften (Abschnitte), Aufzählungen und Tabellen (Punkte) sowie Zeilen, die mit «Hinweis:» beginnen. In Excel: Spalte A Abschnitt, Spalte B Punkt – oder eine Spalte mit dem Typ (Abschnitt/Punkt/Hinweis).</p>`;
  }
  if (imp.step === 2) {
    const n = imp.lines.filter((l) => l.type === 'item').length; const s = imp.lines.filter((l) => l.type === 'section').length; const nt = imp.lines.filter((l) => l.type === 'note').length;
    const vars = usedVars(linesToContent(imp.lines)).length;
    return `<div class="head"><h1>Import-Assistent</h1><span class="msg">Datei: ${h(imp.filename || 'Text')} · ${imp.lines.length} Zeilen erkannt</span></div>${steps}
      <div class="grid2"><section><div class="section-title" style="padding-left:0"><h2>Original</h2></div><div class="orig">${h(imp.original)}</div></section>
      <section><div class="section-title" style="padding-left:0"><h2>Erkannte Struktur – bitte prüfen</h2><span class="msg">${s} Abschnitte · ${n} Punkte · ${nt} Hinweise · ${vars} Variablen</span></div>
        <div class="lines">${imp.lines.map((l, i) => `<div class="line ${l.type === 'section' ? 'sec' : l.type === 'ignore' ? 'ign' : ''}"><select data-line-type="${i}" aria-label="Typ Zeile ${i + 1}">${[['title', 'Titel'], ['section', 'Abschnitt'], ['item', 'Punkt'], ['note', 'Hinweis'], ['ignore', 'Ignorieren']].map(([k, v]) => `<option value="${k}" ${l.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select><input type="text" data-line-text="${i}" aria-label="Text Zeile ${i + 1}" value="${h(l.text)}"></div>`).join('')}</div>
        <div class="actions" style="margin-top:12px"><button type="button" class="btn" data-act="imp-addline">${I.plus} Zeile</button></div></section></div>
      <div class="actions"><button type="button" class="btn" data-act="imp-back">Zurück</button><button type="button" class="btn primary" data-act="imp-next">Weiter: Zuordnung ${I.chevR}</button></div>`;
  }
  // Schritt 3: Editor als Seite
  return `<div class="head"><h1>Import-Assistent</h1></div>${steps}${viewEditor(true)}`;
}
async function importFile(file) {
  try { const r = await parseFile(file); imp = { step: 2, lines: r.lines, original: r.original, filename: file.name, file, msg: null }; render(); }
  catch (e) { imp.msg = 'Datei konnte nicht gelesen werden: ' + e.message; render(); }
}

// ---------- Ballonmuster ----------
async function viewBalloons() {
  const d = await api.admin.balloonTypes(); cache.types = d.types; cache.vars = d.variables;
  const vars = d.variables;
  return `<div class="head"><h1>Ballonmuster</h1><button type="button" class="ib primary" data-act="type-new" aria-label="Ballonmuster hinzufügen" title="Muster hinzufügen">${I.plus}</button></div>
    <p class="hint">Die Werte je Muster werden in den Checklisten an der Stelle der Variablen eingesetzt. Piloten wählen beim Erfassen ihres Ballons eines dieser Muster.</p>
    <div class="card tablewrap"><table><thead><tr><th>Muster</th><th>Art</th><th>Hersteller</th>${vars.map((v) => `<th>${h(v.label_de)}${v.einheit ? ' (' + h(v.einheit) + ')' : ''}</th>`).join('')}<th>Ballone</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.types.length ? d.types.map((t) => `<tr><td><b>${h(t.name)}</b></td><td><span class="pill blue">${ART[t.art]}</span></td><td>${h(t.hersteller || '')}</td>${vars.map((v) => `<td class="num">${v.nur_art && v.nur_art !== t.art ? '<span class="msg">–</span>' : (t.values[v.key] != null && t.values[v.key] !== '' ? h(t.values[v.key]) : '<span class="pill amber">fehlt</span>')}</td>`).join('')}<td class="num">${t.balloons}</td><td>${t.aktiv ? '<span class="pill green">aktiv</span>' : '<span class="pill grey">inaktiv</span>'}</td>
        <td class="acts"><button type="button" class="ib small" data-act="type-edit" data-id="${t.id}" aria-label="Bearbeiten" title="Bearbeiten">${I.edit}</button>${t.aktiv ? `<button type="button" class="ib small danger" data-act="type-del" data-id="${t.id}" aria-label="Deaktivieren" title="Deaktivieren (bleibt bei bestehenden Ballonen)">${I.trash}</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="99" class="msg">Noch keine Muster.</td></tr>'}
    </tbody></table></div>
    <section class="card"><div class="section-title"><h2>Variablenkatalog</h2><button type="button" class="ib small" data-act="var-new" aria-label="Variable hinzufügen" title="Variable hinzufügen">${I.plus}</button></div>
      <div class="vars">${vars.map((v) => `<div class="var"><code>{{${h(v.key)}}}</code><span>${h(v.label_de)} · ${h(v.label_fr || '–')} · ${h(v.label_en || '–')}</span><span class="s">${v.einheit ? 'Einheit ' + h(v.einheit) : 'ohne Einheit'}${v.nur_art ? ' · nur ' + ART[v.nur_art] : ''}</span></div>`).join('')}</div>
      <p class="hint" style="padding:0 14px 14px">Neue Variablen erscheinen als Spalte bei den Mustern und stehen im Editor zur Auswahl. Im Listentext als <code>{{name}}</code> einsetzen; die Einheit wird automatisch angehängt.</p></section>`;
}
function viewTypeModal() {
  const t = cache.typeEdit; const vars = cache.vars;
  return `<div class="modal-bg"><form class="modal" id="typeform"><div class="mh"><h2>${t.id ? 'Muster bearbeiten' : 'Neues Ballonmuster'}</h2><button type="button" class="ib small" data-act="close" aria-label="Schliessen">${I.x}</button></div><div class="mb">
    <div class="row"><div class="field" style="flex:2 1 200px"><label for="t-name">Muster</label><input id="t-name" type="text" value="${h(t.name || '')}" placeholder="z. B. Ultramagic M-77" data-autofocus></div><div class="field"><label for="t-art">Art</label><select id="t-art"><option value="heissluft" ${t.art === 'heissluft' ? 'selected' : ''}>Heissluft</option><option value="gas" ${t.art === 'gas' ? 'selected' : ''}>Gas</option></select></div></div>
    <div class="field"><label for="t-herst">Hersteller</label><input id="t-herst" type="text" value="${h(t.hersteller || '')}"></div>
    ${vars.map((v) => `<div class="field"><label for="t-v-${h(v.key)}">${h(v.label_de)}${v.einheit ? ' (' + h(v.einheit) + ')' : ''}${v.nur_art ? ' · nur ' + ART[v.nur_art] : ''}</label><input id="t-v-${h(v.key)}" type="text" data-val="${h(v.key)}" value="${h((t.values || {})[v.key] ?? '')}"></div>`).join('')}
    ${t.id ? `<div class="field"><label><input type="checkbox" id="t-aktiv" ${t.aktiv ? 'checked' : ''}> aktiv (für Piloten wählbar)</label></div>` : ''}
    ${t.msg ? `<p class="msg err">${h(t.msg)}</p>` : ''}</div>
    <div class="mf"><button type="submit" class="btn primary">${I.check} Speichern</button><button type="button" class="btn" data-act="close">${I.x} Abbrechen</button></div></form></div>`;
}
function viewVarModal() {
  const v = cache.varEdit;
  return `<div class="modal-bg"><form class="modal" id="varform"><div class="mh"><h2>Variable</h2><button type="button" class="ib small" data-act="close" aria-label="Schliessen">${I.x}</button></div><div class="mb">
    <div class="field"><label for="v-key">Schlüssel (klein, a–z, 0–9, _)</label><input id="v-key" type="text" value="${h(v.key || '')}" placeholder="z. B. steigrate_max" data-autofocus></div>
    <div class="field"><label for="v-de">Bezeichnung DE</label><input id="v-de" type="text" value="${h(v.label_de || '')}"></div>
    <div class="field"><label for="v-fr">Bezeichnung FR</label><input id="v-fr" type="text" value="${h(v.label_fr || '')}"></div>
    <div class="field"><label for="v-en">Bezeichnung EN</label><input id="v-en" type="text" value="${h(v.label_en || '')}"></div>
    <div class="row"><div class="field"><label for="v-unit">Einheit</label><input id="v-unit" type="text" value="${h(v.einheit || '')}" placeholder="m/s, kg, °C"></div><div class="field"><label for="v-art">Nur für</label><select id="v-art"><option value="">Heissluft und Gas</option><option value="heissluft" ${v.nur_art === 'heissluft' ? 'selected' : ''}>nur Heissluft</option><option value="gas" ${v.nur_art === 'gas' ? 'selected' : ''}>nur Gas</option></select></div></div>
    ${v.msg ? `<p class="msg err">${h(v.msg)}</p>` : ''}</div>
    <div class="mf"><button type="submit" class="btn primary">${I.check} Speichern</button><button type="button" class="btn" data-act="close">${I.x} Abbrechen</button></div></form></div>`;
}

// ---------- Auswertung ----------
async function viewUsage() {
  const y = new Date().getFullYear(); const now = Date.now();
  const from = usageFilt.zeit === '30' ? now - 30 * 86400000 : usageFilt.zeit === 'season' ? new Date(y, 0, 1).getTime() : 0;
  const d = await api.admin.stats(from, 0); cache.stats = d;
  const all = d.sessions;
  const users = [...new Map(all.map((s) => [s.user_id, s])).values()].sort((a, b) => a.kuerzel.localeCompare(b.kuerzel));
  const lists = [...new Map(all.map((s) => [s.checklist_id, s])).values()].sort((a, b) => a.title.localeCompare(b.title));
  const rows = all.filter((s) => (!usageFilt.nutzer || s.user_id === usageFilt.nutzer) && (!usageFilt.liste || s.checklist_id === usageFilt.liste) && (!usageFilt.art || s.ballon_art === usageFilt.art));
  const done = rows.filter((s) => s.status === 'abgeschlossen');
  const durs = done.map((s) => (s.end - s.start) / 60000).filter((x) => x >= 0).sort((a, b) => a - b);
  const median = durs.length ? Math.round(durs[Math.floor(durs.length / 2)]) : null;
  const byList = new Map(); for (const s of rows) { const e = byList.get(s.checklist_id) || { title: s.title, n: 0, done: 0, abort: 0 }; e.n++; if (s.status === 'abgeschlossen') e.done++; if (s.status.startsWith('abgebrochen')) e.abort++; byList.set(s.checklist_id, e); }
  const byUser = new Map(); for (const s of rows) { const e = byUser.get(s.user_id) || { kuerzel: s.kuerzel, name: s.name, n: 0, done: 0 }; e.n++; if (s.status === 'abgeschlossen') e.done++; byUser.set(s.user_id, e); }
  const userRows = [...byUser.values()].sort((a, b) => b.done - a.done || b.n - a.n);
  const activeUsers = new Set(rows.map((s) => s.user_id)).size;
  const sel2 = (id, key, opts) => `<select id="${id}" data-usage="${key}">${opts.map(([v, l]) => `<option value="${v}" ${usageFilt[key] === v ? 'selected' : ''}>${h(l)}</option>`).join('')}</select>`;
  return `<div class="head"><h1>Auswertung</h1><button type="button" class="ib" data-act="csv" aria-label="Als CSV exportieren" title="CSV exportieren">${I.download}</button></div>
    <div class="filters"><label for="u-zeit">Zeitraum</label>${sel2('u-zeit', 'zeit', [['30', '30 Tage'], ['season', 'Saison ' + y], ['all', 'Alles']])}
      <label for="u-nutzer">Nutzer</label>${sel2('u-nutzer', 'nutzer', [['', 'Alle'], ...users.map((u) => [u.user_id, u.kuerzel])])}
      <label for="u-liste">Checkliste</label>${sel2('u-liste', 'liste', [['', 'Alle'], ...lists.map((l) => [l.checklist_id, l.title])])}
      <label for="u-art">Ballonart</label>${sel2('u-art', 'art', [['', 'Alle'], ['heissluft', 'Heissluft'], ['gas', 'Gas']])}</div>
    <div class="kpis"><div class="card kpi"><span class="l">Sitzungen</span><span class="v">${rows.length}</span></div><div class="card kpi"><span class="l">Abgeschlossen</span><span class="v">${rows.length ? Math.round(done.length / rows.length * 100) + ' %' : '–'}</span></div><div class="card kpi"><span class="l">Aktive Nutzer</span><span class="v">${activeUsers} / ${d.activeUsers}</span></div><div class="card kpi"><span class="l">Dauer je Liste (Median)</span><span class="v">${median != null ? median + ' min' : '–'}</span></div></div>
    <div class="grid2">
      <section class="card tablewrap"><table><caption>Sitzungen (neueste ${Math.min(rows.length, 200)})</caption><thead><tr><th>Datum</th><th>Zeit</th><th>Nutzer</th><th>Ballon</th><th>Checkliste</th><th>Vers.</th><th>Status</th><th>Dauer</th><th>Ort</th></tr></thead><tbody>
        ${rows.slice(0, 200).map((s) => `<tr><td class="nowrap">${fmtDate(s.start)}</td><td class="nowrap">${fmtTime(s.start)} LT</td><td title="${h(s.name || '')}">${h(s.kuerzel)}</td><td>${h(s.kennzeichen || '–')}</td><td>${h(s.title)}</td><td class="num">${s.version}</td><td><span class="pill ${STATUS[s.status][1]}">${s.items_done} / ${s.items_total}</span></td><td class="num">${s.end ? Math.max(0, Math.round((s.end - s.start) / 60000)) + ' min' + (s.status === 'abgebrochen_auto' ? ' (auto)' : '') : '–'}</td><td class="nowrap">${s.pos ? icao(s.pos.lat, s.pos.lon) : '–'}</td></tr>`).join('') || '<tr><td colspan="9" class="msg">Keine Sitzungen im Zeitraum.</td></tr>'}</tbody></table></section>
      <div style="display:flex;flex-direction:column;gap:16px">
        <section class="card tablewrap"><table><caption>Nutzung je Checkliste</caption><thead><tr><th>Liste</th><th>Sitzungen</th><th>Abgeschl.</th><th>Abgebr.</th></tr></thead><tbody>${[...byList.values()].sort((a, b) => b.n - a.n).map((e) => `<tr><td>${h(e.title)}</td><td class="num">${e.n}</td><td class="num">${e.done}</td><td class="num">${e.abort}</td></tr>`).join('') || '<tr><td colspan="4" class="msg">–</td></tr>'}</tbody></table></section>
        <section class="card tablewrap"><table><caption>Nutzung je Nutzer · Rangliste</caption><thead><tr><th></th><th>Kürzel</th><th>Name</th><th>Sitzungen</th><th>Abgeschl.</th></tr></thead><tbody>${userRows.map((e, i) => `<tr><td>${i === 0 && e.done > 0 ? `<span class="crown" title="Fleissigste Nutzerin / fleissigster Nutzer">${I.crown}</span>` : ''}</td><td>${h(e.kuerzel)}</td><td>${h(e.name || '')}</td><td class="num">${e.n}</td><td class="num">${e.done}</td></tr>`).join('') || '<tr><td colspan="5" class="msg">–</td></tr>'}</tbody></table></section>
      </div></div>`;
}
function exportCsv() {
  const rows = cache.stats ? cache.stats.sessions : [];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = [['Datum', 'Zeit LT', 'Kuerzel', 'Name', 'Ballon', 'Art', 'Checkliste', 'Version', 'Status', 'Punkte erledigt', 'Punkte total', 'Dauer min', 'Ort'].map(esc).join(';')];
  for (const s of rows) lines.push([fmtDate(s.start), fmtTime(s.start), s.kuerzel, s.name, s.kennzeichen, s.ballon_art, s.title, s.version, STATUS[s.status][0], s.items_done, s.items_total, s.end ? Math.round((s.end - s.start) / 60000) : '', s.pos ? icao(s.pos.lat, s.pos.lon) : ''].map(esc).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'checklisten-auswertung.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Nutzer ----------
async function viewUsers() {
  const d = await api.admin.users(); cache.users = d.users;
  const weekAgo = Date.now() - 7 * 86400000; const newN = d.users.filter((u) => u.created_at > weekAgo).length;
  const sup = me.rolle === 'supermaster';
  return `<div class="head"><h1>Nutzer</h1><span class="msg">${d.users.length} Nutzer · ${newN} neu diese Woche</span></div>
    <p class="hint">Neue Nutzer legen sich selbst an, indem sie in der App ein noch freies Kürzel (mindestens 5 Zeichen) eingeben. Keine Freischaltung nötig; ein Kürzel kann hier gesperrt werden.</p>
    <div class="card tablewrap"><table><thead><tr><th>Kürzel</th><th>Name</th><th>Rolle</th><th>Sprache</th><th>Ballone</th><th>Sitzungen</th><th>Zuletzt aktiv</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.users.map((u) => { const canEdit = u.id !== me.id && (sup || u.rolle !== 'supermaster'); return `<tr><td><b>${h(u.kuerzel)}</b></td><td>${h(u.name || '')}</td>
        <td>${canEdit ? `<select data-role="${u.id}" aria-label="Rolle ${h(u.kuerzel)}"><option value="pilot" ${u.rolle === 'pilot' ? 'selected' : ''}>Pilot</option><option value="admin" ${u.rolle === 'admin' ? 'selected' : ''}>Admin</option>${sup ? `<option value="supermaster" ${u.rolle === 'supermaster' ? 'selected' : ''}>Supermaster</option>` : ''}</select>` : `<span class="pill blue">${ROLE[u.rolle]}</span>`}</td>
        <td>${(u.sprache || 'de').toUpperCase()}</td><td>${h(u.balloons.join(', ') || '–')}</td><td class="num">${u.completed} / ${u.sessions}</td><td class="nowrap">${h(fmtWhen(u.last_active))}</td>
        <td>${u.status === 'gesperrt' ? '<span class="pill red">Gesperrt</span>' : u.created_at > weekAgo ? '<span class="pill blue">Neu</span>' : '<span class="pill green">Aktiv</span>'}</td>
        <td class="acts">${sup ? `<button type="button" class="ib small" data-act="user-log" data-id="${u.id}" aria-label="Protokoll ansehen" title="Protokoll (nur Supermaster)">${I.log}</button>` : ''}${canEdit ? (u.status === 'gesperrt' ? `<button type="button" class="ib small" data-act="user-unlock" data-id="${u.id}" aria-label="Entsperren" title="Entsperren">${I.unlock}</button>` : `<button type="button" class="ib small danger" data-act="user-lock" data-id="${u.id}" aria-label="Sperren" title="Kürzel sperren (Geräte werden abgemeldet)">${I.lock}</button>`) : ''}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="hint">Admins sehen die Auswertung mit Namen, aber nicht die Protokoll-Details einzelner Nutzer; die sieht nur der Nutzer selbst und der Supermaster.</p>`;
}
function viewUserLog() {
  const u = cache.userLog; if (!u) return '';
  return `<div class="modal-bg"><div class="modal wide"><div class="mh"><h2>Protokoll ${h(u.user.kuerzel)} · ${h(u.user.name || '')}</h2><div class="actions"><button type="button" class="ib small" data-act="print-userlog" aria-label="Drucken / PDF" title="Drucken / als PDF speichern">${I.print}</button><button type="button" class="ib small" data-act="close" aria-label="Schliessen">${I.x}</button></div></div>
    <div class="mb" id="userlog"><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Zeit</th><th>Ballon</th><th>Checkliste</th><th>Vers.</th><th>Status</th><th>Dauer</th><th>Ort Start</th><th>Ort Ende</th></tr></thead><tbody>
      ${u.sessions.map((s) => `<tr><td class="nowrap">${fmtDate(s.start_device || s.start_server)}</td><td class="nowrap">${fmtTime(s.start_device || s.start_server)} LT</td><td>${h(s.kennzeichen || '–')}</td><td>${h(s.title)}</td><td class="num">${s.version}</td><td><span class="pill ${STATUS[s.status][1]}">${s.items_done} / ${s.items_total}</span></td><td class="num">${s.end_device ? Math.max(0, Math.round((s.end_device - s.start_device) / 60000)) + ' min' : '–'}</td><td class="nowrap">${s.pos_start ? icao(s.pos_start.lat, s.pos_start.lon) : '–'}</td><td class="nowrap">${s.pos_end ? icao(s.pos_end.lat, s.pos_end.lon) : '–'}</td></tr>`).join('') || '<tr><td colspan="9" class="msg">Keine Einträge.</td></tr>'}</tbody></table></div></div></div></div>`;
}

// ---------- Einstellungen ----------
async function viewSettings() {
  const s = (await api.admin.settings()).settings; cache.settings = s;
  const g = (await api.admin.groups()).groups;
  return `<div class="head"><h1>Einstellungen</h1></div>
    <div class="grid2">
      <form class="card form" id="settingsform"><h2 style="font-size:16px">Allgemein</h2>
        <div class="field"><label for="s-name">App-Name</label><input id="s-name" type="text" name="app_name" value="${h(s.app_name)}"></div>
        <div class="row"><div class="field"><label for="s-warn">Warnung ab Punkten je Liste</label><input id="s-warn" type="number" name="warn_items" min="1" value="${h(s.warn_items)}"></div><div class="field"><label for="s-abbr">Automatischer Abbruch nach (Minuten ohne Haken)</label><input id="s-abbr" type="number" name="abbruch_minuten" min="5" value="${h(s.abbruch_minuten)}"></div></div>
        <div class="row"><div class="field"><label for="s-jahre">Aufbewahrung Protokolle (Jahre)</label><input id="s-jahre" type="number" name="aufbewahrung_jahre" min="1" value="${h(s.aufbewahrung_jahre)}"></div><div class="field"><label for="s-stich">Lösch-Stichtag (MM-TT)</label><input id="s-stich" type="text" name="loesch_stichtag" value="${h(s.loesch_stichtag)}" placeholder="01-31"></div></div>
        <p class="hint">Das Löschen alter Protokolle erfolgt erst nach Bestätigung durch den Admin (folgt in einer späteren Version).</p>
        <div class="actions"><button type="submit" class="btn primary">${I.check} Speichern</button></div></form>
      <div style="display:flex;flex-direction:column;gap:16px">
        <form class="card form" id="keyform"><h2 style="font-size:16px">Zugänge</h2>
          <div class="field"><label for="s-key">Claude-API-Schlüssel (für automatische Übersetzungen) · ${s.api_key_set ? '<span class="pill green">hinterlegt</span>' : '<span class="pill amber">fehlt</span>'}</label><input id="s-key" type="password" autocomplete="off" placeholder="${s.api_key_set ? 'neuen Schlüssel eingeben, um zu ersetzen' : 'sk-ant-…'}"></div>
          <p class="hint">Wird verschlüsselt gespeichert und nie angezeigt. Leer lassen = unverändert. Schlüssel unter console.anthropic.com → API Keys erzeugen.</p>
          <div class="actions"><button type="submit" class="btn primary">${I.check} Schlüssel speichern</button>${s.api_key_set ? `<button type="button" class="btn danger" data-act="key-del">${I.trash} Entfernen</button>` : ''}</div></form>
        <form class="card form" id="groupsform"><h2 style="font-size:16px">Gruppen (Flugzustände) und Limits</h2>
          ${g.map((gr) => `<div class="row"><div class="field" style="flex:2 1 200px"><label>${h(gr.name_de)} · ${h(gr.name_fr)} · ${h(gr.name_en)}</label><span class="msg">${gr.count} Listen</span></div><div class="field"><label for="g-${gr.id}">Limit (0 = keines)</label><input id="g-${gr.id}" type="number" min="0" data-glimit="${gr.id}" value="${gr.limit_count}"></div></div>`).join('')}
          <div class="actions"><button type="submit" class="btn primary">${I.check} Limits speichern</button></div></form>
      </div></div>`;
}

// ---------- Ereignisse ----------
function closeModal() { modal = null; cache.tr = null; cache.userLog = null; render(); }
$app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.filt) { filt[el.dataset.filt] = el.value; render(); return; }
  if (el.dataset.usage) { usageFilt[el.dataset.usage] = el.value; render(); return; }
  if (el.dataset.ed) { editor[el.dataset.ed] = el.value; if (el.dataset.ed === 'text') render(); return; }
  if (el.dataset.tr) { cache.tr.edit[el.dataset.tr] = el.value; return; }
  if (el.dataset.lineType != null) { imp.lines[+el.dataset.lineType].type = el.value; render(); return; }
  if (el.dataset.lineText != null) { imp.lines[+el.dataset.lineText].text = el.value; return; }
  if (el.id === 'file' && el.files[0]) { importFile(el.files[0]); return; }
  if (el.dataset.role) { try { await api.admin.updateUser(el.dataset.role, { rolle: el.value }); toast('Rolle gespeichert.'); } catch (e2) { toast(errText(e2)); } render(); return; }
});
$app.addEventListener('input', (e) => { const el = e.target; if (el.dataset.ed === 'text') { editor.text = el.value; clearTimeout(editor.tm); editor.tm = setTimeout(() => { const ta = document.getElementById('e-text'); const pos = ta ? ta.selectionStart : 0; render(); const ta2 = document.getElementById('e-text'); if (ta2) { ta2.focus(); ta2.setSelectionRange(pos, pos); } }, 500); } });
$app.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'loginform') {
    try { const r = await api.login(document.getElementById('kuerzel').value.trim().toLowerCase(), '', null, 'admin'); if (r.needName) { msg = 'Dieses Kürzel gibt es nicht. Neue Kürzel werden in der Piloten-App angelegt.'; render(); return; } store.set({ token: r.token, user: r.user }); me = null; msg = null; render(); }
    catch (e2) { msg = e2.code === 'gesperrt' ? 'Kürzel gesperrt.' : e2.code === 'kuerzel_zu_kurz' ? 'Mindestens 5 Zeichen.' : errText(e2); render(); }
    return;
  }
  if (f.id === 'typeform') {
    const t = cache.typeEdit; const values = {}; f.querySelectorAll('[data-val]').forEach((i) => { values[i.dataset.val] = i.value.trim(); });
    const b = { name: document.getElementById('t-name').value.trim(), art: document.getElementById('t-art').value, hersteller: document.getElementById('t-herst').value.trim(), values };
    if (t.id) b.aktiv = document.getElementById('t-aktiv').checked;
    try { if (t.id) await api.admin.updateType(t.id, b); else await api.admin.createType(b); modal = null; toast('Gespeichert.'); render(); } catch (e2) { t.msg = errText(e2); render(); }
    return;
  }
  if (f.id === 'varform') {
    const b = { key: document.getElementById('v-key').value, label_de: document.getElementById('v-de').value, label_fr: document.getElementById('v-fr').value, label_en: document.getElementById('v-en').value, einheit: document.getElementById('v-unit').value, nur_art: document.getElementById('v-art').value || null };
    try { await api.admin.saveVariable(b); modal = null; toast('Gespeichert.'); render(); } catch (e2) { cache.varEdit.msg = errText(e2); render(); }
    return;
  }
  if (f.id === 'settingsform') { const b = {}; f.querySelectorAll('[name]').forEach((i) => { b[i.name] = i.value.trim(); }); try { await api.admin.saveSettings(b); toast('Gespeichert.'); } catch (e2) { toast(errText(e2)); } return; }
  if (f.id === 'keyform') { const k = document.getElementById('s-key').value.trim(); if (!k) { toast('Kein Schlüssel eingegeben.'); return; } try { await api.admin.saveSettings({ anthropic_api_key: k }); toast('Schlüssel gespeichert.'); render(); } catch (e2) { toast(errText(e2)); } return; }
  if (f.id === 'groupsform') { try { for (const i of f.querySelectorAll('[data-glimit]')) await api.admin.updateGroup(i.dataset.glimit, { limit_count: +i.value }); toast('Limits gespeichert.'); cache.cl = null; } catch (e2) { toast(errText(e2)); } return; }
});
$app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act; const id = el.dataset.id;
  const cl = () => (cache.cl || {}).checklists || [];
  switch (act) {
    case 'logout': try { await api.logout(); } catch { /* egal */ } store.reset(); me = null; render(); break;
    case 'close': closeModal(); break;
    case 'sel': if (el.checked) sel.add(id); else sel.delete(id); render(); break;
    case 'sel-all': { const d = cache.cl; const rows = d.checklists.filter((c) => (!filt.gruppe || c.group_id === filt.gruppe) && (!filt.art || c.art === filt.art)); if (el.checked) rows.forEach((c) => sel.add(c.id)); else rows.forEach((c) => sel.delete(c.id)); render(); break; }
    case 'print': printSelected(); break;
    case 'new': if (!cache.vars) cache.vars = (await api.admin.balloonTypes()).variables; if (!cache.settings) cache.settings = (await api.admin.settings()).settings; openEditor(null, null, cache.cl.groups); break;
    case 'edit': { const c = cl().find((x) => x.id === id); if (!cache.vars) cache.vars = (await api.admin.balloonTypes()).variables; if (!cache.settings) cache.settings = (await api.admin.settings()).settings; openEditor(c, draft(c) || current(c) || latest(c), cache.cl.groups); break; }
    case 'release': if (confirm('Entwurf freigeben? Die Piloten erhalten die neue Version beim nächsten Öffnen der App.')) { try { await api.admin.release(id); await loadChecklists(); toast('Freigegeben.'); } catch (e2) { toast(errText(e2)); } render(); } break;
    case 'del': { const c = cl().find((x) => x.id === id); if (c && confirm(`Checkliste «${(current(c) || latest(c)).title}» löschen? Protokolleinträge bleiben erhalten.`)) { try { await api.admin.deleteChecklist(id); sel.delete(id); await loadChecklists(); toast('Gelöscht.'); } catch (e2) { toast(errText(e2)); } render(); } break; }
    case 'translate': { const c = cl().find((x) => x.id === id); if (c) openTranslate(c); break; }
    case 'tr-auto': { cache.tr.busy = true; cache.tr.msg = null; render(); try { const r = await api.admin.translate(cache.tr.version.id); cache.tr.edit.fr = contentToText(r.fr); cache.tr.edit.en = contentToText(r.en); cache.tr.version.status_fr = 'automatisch'; cache.tr.version.status_en = 'automatisch'; cache.tr.msg = 'Übersetzt – bitte prüfen und als geprüft speichern.'; cache.tr.kind = 'ok'; await loadChecklists(); } catch (e2) { cache.tr.msg = errText(e2); cache.tr.kind = 'err'; } cache.tr.busy = false; render(); break; }
    case 'tr-ok': case 'tr-save': { const lang = el.dataset.lang; const ta = document.querySelector(`textarea[data-tr="${lang}"]`); const txt = ta ? ta.value : cache.tr.edit[lang]; let content; try { content = textToContent(txt); } catch { cache.tr.msg = 'Text unlesbar.'; render(); break; } if (!content.title) { cache.tr.msg = 'Titel fehlt (# Titel).'; render(); break; } try { await api.admin.setTranslation(cache.tr.version.id, lang, content, act === 'tr-ok' ? 'geprueft' : 'automatisch'); cache.tr.version['status_' + lang] = act === 'tr-ok' ? 'geprueft' : 'automatisch'; cache.tr.edit[lang] = txt; cache.tr.msg = lang.toUpperCase() + ' gespeichert.'; cache.tr.kind = 'ok'; await loadChecklists(); } catch (e2) { cache.tr.msg = errText(e2); cache.tr.kind = 'err'; } render(); break; }
    case 'insvar': { const ta = document.getElementById('e-text'); if (!ta) break; const ins = '{{' + el.dataset.key + '}}'; const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd); editor.text = ta.value; render(); const ta2 = document.getElementById('e-text'); if (ta2) { ta2.focus(); ta2.setSelectionRange(s + ins.length, s + ins.length); } break; }
    case 'save': saveEditor(false); break;
    case 'save-release': saveEditor(true); break;
    case 'imp-text': { const txt = document.getElementById('paste').value; if (!txt.trim()) { imp.msg = 'Kein Text.'; render(); break; } const r = parseText(txt); imp = { step: 2, lines: r.lines, original: r.original, filename: '', msg: null }; render(); break; }
    case 'imp-addline': imp.lines.push({ type: 'item', text: '' }); render(); break;
    case 'imp-back': if (imp.step === 3) { editor = null; imp.step = 2; } else { imp = null; } render(); break;
    case 'imp-next': {
      const content = linesToContent(imp.lines); if (!content.title) { toast('Bitte eine Zeile als Titel kennzeichnen.'); break; }
      let original_file = null;
      if (imp.file) { try { original_file = (await api.admin.uploadFile(imp.file)).key; } catch { /* Original nicht gespeichert, weiter */ } }
      if (!cache.settings) cache.settings = (await api.admin.settings()).settings;
      editor = { c: null, vid: null, text: contentToText(content), group_id: (cache.cl.groups[0] || {}).id, art: 'beide', note: 'Erstfassung (Import ' + (imp.filename || 'Text') + ')', msg: null, loading: false, original_file };
      imp.step = 3; render(); break;
    }
    case 'type-new': cache.typeEdit = { art: 'heissluft', values: {} }; modal = viewTypeModal; render(); break;
    case 'type-edit': cache.typeEdit = { ...cache.types.find((t) => t.id === id), msg: null }; modal = viewTypeModal; render(); break;
    case 'type-del': if (confirm('Muster deaktivieren? Bestehende Ballone behalten es; Piloten können es nicht mehr neu wählen.')) { try { await api.admin.deleteType(id); toast('Deaktiviert.'); } catch (e2) { toast(errText(e2)); } render(); } break;
    case 'var-new': cache.varEdit = {}; modal = viewVarModal; render(); break;
    case 'csv': exportCsv(); break;
    case 'user-lock': if (confirm('Kürzel sperren? Alle Geräte dieses Nutzers werden abgemeldet.')) { try { await api.admin.updateUser(id, { status: 'gesperrt' }); toast('Gesperrt.'); } catch (e2) { toast(errText(e2)); } render(); } break;
    case 'user-unlock': try { await api.admin.updateUser(id, { status: 'aktiv' }); toast('Entsperrt.'); } catch (e2) { toast(errText(e2)); } render(); break;
    case 'user-log': { try { const r = await api.admin.userSessions(id); cache.userLog = { user: cache.users.find((u) => u.id === id), sessions: r.sessions }; modal = viewUserLog; render(); } catch (e2) { toast(errText(e2)); } break; }
    case 'print-userlog': { const u = cache.userLog; const w = window.open('', '_blank'); if (!w) { toast('Pop-up blockiert.'); break; } w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Protokoll ${h(u.user.kuerzel)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:16mm;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:5px 6px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#555}h1{font-size:18px;margin:0 0 4px}.m{color:#555;margin-bottom:12px}</style></head><body><h1>Protokoll ${h(u.user.kuerzel)} · ${h(u.user.name || '')}</h1><div class="m">SBA Checklisten · erstellt ${fmtDate(Date.now())} ${fmtTime(Date.now())} LT</div>${document.getElementById('userlog').innerHTML}<script>setTimeout(function(){window.print()},300)</script></body></html>`); w.document.close(); break; }
    case 'key-del': if (confirm('API-Schlüssel entfernen?')) { try { await api.admin.saveSettings({ anthropic_api_key: '' }); toast('Entfernt.'); } catch (e2) { toast(errText(e2)); } render(); } break;
    default: break;
  }
});
// Drag & Drop
$app.addEventListener('dragover', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
$app.addEventListener('dragleave', (e) => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
$app.addEventListener('drop', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) importFile(f); } });

window.addEventListener('hashchange', () => { page = (location.hash || '#checklists').slice(1); modal = null; if (page !== 'import') { imp = null; editor = null; } render(); });
render();
