/* SBA Checklisten — Zugriff auf den Worker (Bearer-Gerätetoken). Ohne Netz werfen die Aufrufe
 * einen Fehler mit code 'offline'; die App fängt das ab und arbeitet aus dem lokalen Speicher. */
const base = () => ((window.CHECKLISTS_CONFIG || {}).apiBase || '').replace(/\/$/, '');
let tokenGetter = () => null;
export function setTokenGetter(fn) { tokenGetter = fn; }

export class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }

async function call(method, path, body, opts = {}) {
  if (!base()) throw new ApiError('keine_api', 0);
  const headers = { ...(opts.headers || {}) };
  const tok = tokenGetter();
  if (tok) headers.Authorization = 'Bearer ' + tok;
  let payload;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); } else payload = body;
  let res;
  try {
    res = await fetch(base() + path, { method, headers, body: payload, cache: 'no-store' });
  } catch { throw new ApiError('offline', 0); }
  if (opts.raw) return res;
  let data = null; try { data = await res.json(); } catch { /* leer */ }
  if (!res.ok || !data || data.ok === false) throw new ApiError((data && data.error) || ('http_' + res.status), res.status);
  return data;
}

export const api = {
  health: () => call('GET', '/api/health'),
  login: (kuerzel, name, sprache, plattform) => call('POST', '/api/login', { kuerzel, name, sprache, plattform }),
  me: () => call('GET', '/api/me'),
  updateMe: (patch) => call('PUT', '/api/me', patch),
  logout: () => call('POST', '/api/logout'),
  installed: () => call('POST', '/api/installed'),
  bootstrap: (since) => call('GET', '/api/bootstrap' + (since ? '?since=' + since : '')),
  favorite: (checklist_id, on) => call('POST', '/api/favorites', { checklist_id, on }),
  addBalloon: (kennzeichen, balloon_type_id) => call('POST', '/api/balloons', { kennzeichen, balloon_type_id }),
  updateBalloon: (id, patch) => call('PUT', '/api/balloons/' + id, patch),
  deleteBalloon: (id) => call('DELETE', '/api/balloons/' + id),
  sync: (sessions) => call('POST', '/api/sync', { sessions }),
  sessions: (from, to) => call('GET', '/api/sessions?from=' + (from || 0) + '&to=' + (to || 0)),
  // Verwaltung
  admin: {
    checklists: () => call('GET', '/api/admin/checklists'),
    createChecklist: (b) => call('POST', '/api/admin/checklists', b),
    updateChecklist: (id, b) => call('PUT', '/api/admin/checklists/' + id, b),
    deleteChecklist: (id) => call('DELETE', '/api/admin/checklists/' + id),
    newVersion: (id, b) => call('POST', '/api/admin/checklists/' + id + '/versions', b),
    version: (vid) => call('GET', '/api/admin/versions/' + vid),
    release: (vid) => call('POST', '/api/admin/versions/' + vid + '/release'),
    translate: (vid) => call('POST', '/api/admin/versions/' + vid + '/translate'),
    setTranslation: (vid, lang, content, status) => call('PUT', '/api/admin/versions/' + vid + '/translation', { lang, content, status }),
    groups: () => call('GET', '/api/admin/groups'),
    updateGroup: (id, b) => call('PUT', '/api/admin/groups/' + id, b),
    balloonTypes: () => call('GET', '/api/admin/balloon-types'),
    createType: (b) => call('POST', '/api/admin/balloon-types', b),
    updateType: (id, b) => call('PUT', '/api/admin/balloon-types/' + id, b),
    deleteType: (id) => call('DELETE', '/api/admin/balloon-types/' + id),
    saveVariable: (b) => call('POST', '/api/admin/variables', b),
    users: () => call('GET', '/api/admin/users'),
    updateUser: (id, b) => call('PUT', '/api/admin/users/' + id, b),
    userSessions: (id) => call('GET', '/api/admin/users/' + id + '/sessions'),
    stats: (from, to) => call('GET', '/api/admin/stats?from=' + (from || 0) + '&to=' + (to || 0)),
    settings: () => call('GET', '/api/admin/settings'),
    saveSettings: (b) => call('PUT', '/api/admin/settings', b),
    uploadFile: (file) => call('POST', '/api/admin/files', file, { headers: { 'X-Filename': file.name, 'Content-Type': file.type || 'application/octet-stream' } })
  }
};
