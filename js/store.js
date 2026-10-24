/* SBA Checklisten — lokaler Speicher (localStorage). Hier liegen Token, Nutzer, Sprache, die zuletzt
 * geladenen Checklisten (für den Betrieb ohne Netz), offene Sitzungen und die Warteschlange der noch
 * nicht übertragenen Protokolleinträge. */
const KEY = 'sba-checklists';

const defaults = () => ({
  token: null, user: null, lang: null, theme: 'auto', installedAsked: false,
  data: null,          // letzte Antwort von /api/bootstrap (ohne whatsNew)
  dataAt: 0,           // Zeitpunkt (Gerät) der letzten Aktualisierung
  lastSeen: 0,         // Serverzeit des letzten Besuchs → «Was ist neu»
  activeBalloonId: null,
  open: {},            // offene Sitzungen je Checklisten-ID
  queue: [],           // Sitzungen, die noch an den Server müssen
  log: [],             // eigenes Protokoll (lokale Kopie; Server ist massgebend)
  expanded: {}         // auf-/zugeklappte Gruppen
});

let state = null;
function load() {
  if (state) return state;
  try { state = { ...defaults(), ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; }
  catch { state = defaults(); }
  return state;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* voll oder gesperrt */ } }
export function get() { return load(); }
export function set(patch) { Object.assign(load(), patch); save(); return state; }
export function reset() { const keep = { lang: load().lang, theme: load().theme }; state = { ...defaults(), ...keep }; save(); return state; }

// Warteschlange
export function enqueue(session) {
  const q = load().queue;
  const i = q.findIndex((s) => s.id === session.id);
  if (i >= 0) q[i] = session; else q.push(session);
  save();
}
export function dequeue(ids) { const s = load(); s.queue = s.queue.filter((x) => !ids.includes(x.id)); save(); }

// Lokales Protokoll (zum Anzeigen ohne Netz, max. 300 Einträge)
export function logUpsert(entry) {
  const l = load().log;
  const i = l.findIndex((e) => e.id === entry.id);
  if (i >= 0) l[i] = { ...l[i], ...entry }; else l.unshift(entry);
  if (l.length > 300) l.length = 300;
  save();
}
export function logReplace(entries) { load().log = entries.slice(0, 300); save(); }
