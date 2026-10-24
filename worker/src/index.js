// SBA Checklisten — Cloudflare Worker (API) v0.1.0
//
// Zugang: «Authorization: Bearer <Gerätetoken>». Das Token wird bei der Anmeldung erzeugt, auf dem
// Gerät gespeichert und in der Tabelle devices als SHA-256-Hash abgelegt. Kein Kennwort, keine PIN.
// Rollen: pilot | admin | supermaster. Admin darf alles ausser Protokolle einzelner Nutzer einsehen
// (nur Supermaster). Zeiten in Unix-Millisekunden.
//
// Wichtige Pfade
//   POST /api/login                 {kuerzel, name?, sprache?, plattform?} → {token, user, existed}
//   GET  /api/me · PUT /api/me      Profil
//   POST /api/logout                Gerät abmelden
//   GET  /api/bootstrap             alles, was die Piloten-App braucht (Gruppen, Listen, Muster, Favoriten …)
//   POST /api/favorites             {checklist_id, on}
//   GET/POST/PUT/DELETE /api/balloons[/:id]
//   POST /api/sync                  {sessions:[…]} Protokoll-Sitzungen vom Gerät (idempotent)
//   GET  /api/sessions?from&to      eigenes Protokoll
//   /api/admin/…                    Verwaltung (siehe unten)

const JSON_HDR = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const LANGS = ['de', 'fr', 'en'];
const ROLES = ['pilot', 'admin', 'supermaster'];

// ---------- Hilfsfunktionen ----------
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...JSON_HDR, ...extra } });
const err = (msg, status = 400, extra = {}) => json({ ok: false, error: msg }, status, extra);
const now = () => Date.now();
const uuid = () => crypto.randomUUID();
const norm = (s) => String(s || '').trim();
const normKuerzel = (s) => norm(s).toLowerCase().replace(/[^a-z0-9äöüéèàç._-]/g, '');

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Filename',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  const a = new Uint8Array(32); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function encKey(env) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(env.ENC_KEY || '')));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(env, text) {
  const key = await encKey(env); const iv = new Uint8Array(12); crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...iv)) + '.' + btoa(String.fromCharCode(...new Uint8Array(ct)));
}
async function decrypt(env, blob) {
  try {
    const [ivb, ctb] = String(blob).split('.');
    const iv = Uint8Array.from(atob(ivb), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctb), (c) => c.charCodeAt(0));
    const key = await encKey(env);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  } catch { return null; }
}
async function readJson(request) { try { return await request.json(); } catch { return null; } }
const parseContent = (s) => { try { const c = JSON.parse(s || '{}'); return c && typeof c === 'object' ? c : {}; } catch { return {}; } };
function countItems(content) { let n = 0; for (const s of content.sections || []) for (const it of s.items || []) if (!it.type || it.type === 'item') n++; return n; }

// ---------- Datenzugriff ----------
async function userByToken(env, request) {
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return null;
  const h = await sha256hex(m[1]);
  const row = await env.DB.prepare(
    'SELECT u.*, d.id AS device_id FROM devices d JOIN users u ON u.id = d.user_id WHERE d.token_hash = ?'
  ).bind(h).first();
  if (!row) return null;
  if (row.status === 'gesperrt') return { ...row, blocked: true };
  const t = now();
  if (!row.last_active || t - row.last_active > 60000) {
    env.DB.batch([
      env.DB.prepare('UPDATE users SET last_active=? WHERE id=?').bind(t, row.id),
      env.DB.prepare('UPDATE devices SET last_seen=? WHERE id=?').bind(t, row.device_id)
    ]).catch(() => null);
  }
  return row;
}
const isAdmin = (u) => u && (u.rolle === 'admin' || u.rolle === 'supermaster');
const isSuper = (u) => u && u.rolle === 'supermaster';
const pubUser = (u) => ({ id: u.id, kuerzel: u.kuerzel, name: u.name, rolle: u.rolle, sprache: u.sprache, status: u.status, created_at: u.created_at, last_active: u.last_active });

async function getSettings(env) {
  const rows = (await env.DB.prepare('SELECT key, value FROM settings').all()).results || [];
  const s = {}; for (const r of rows) s[r.key] = r.value;
  return s;
}
function pickLang(v, lang) {
  // Inhalt in Nutzersprache, sonst DE mit Hinweis
  if (lang !== 'de') {
    const txt = v['inhalt_' + lang]; const st = v['status_' + lang];
    if (txt && (st === 'geprueft' || st === 'automatisch')) return { content: parseContent(txt), lang, fallback: false, translation: st };
  }
  return { content: parseContent(v.inhalt_de), lang: 'de', fallback: lang !== 'de', translation: null };
}

async function loadChecklistsForPilot(env, user) {
  const rows = (await env.DB.prepare(`
    SELECT c.id, c.group_id, c.art, c.ist_notfall, v.id AS version_id, v.version, v.inhalt_de, v.inhalt_fr, v.inhalt_en,
           v.status_fr, v.status_en, v.item_count, v.released_at
    FROM checklists c JOIN checklist_versions v ON v.id = c.current_version_id
    WHERE c.deleted_at IS NULL AND v.status = 'freigegeben'`).all()).results || [];
  return rows.map((r) => {
    const pick = pickLang(r, user.sprache || 'de');
    return {
      id: r.id, group_id: r.group_id, art: r.art, ist_notfall: !!r.ist_notfall,
      version_id: r.version_id, version: r.version, item_count: r.item_count, released_at: r.released_at,
      title: pick.content.title || '', content: pick.content, lang: pick.lang, fallback: pick.fallback
    };
  });
}

async function autoAbort(env, userId, minutes) {
  // Offene Sitzungen ohne Haken seit > minutes → abgebrochen_auto
  const limit = now() - minutes * 60000;
  const open = (await env.DB.prepare("SELECT id, start_server FROM sessions WHERE user_id=? AND status='offen'").bind(userId).all()).results || [];
  for (const s of open) {
    const last = await env.DB.prepare('SELECT MAX(done_at) AS m FROM session_items WHERE session_id=?').bind(s.id).first();
    const lastAct = Math.max(s.start_server, last?.m || 0);
    if (lastAct < limit) {
      await env.DB.prepare("UPDATE sessions SET status='abgebrochen_auto', end_server=? WHERE id=?").bind(now(), s.id).run();
    }
  }
}

// ---------- Öffentliche / Piloten-Endpunkte ----------
async function handleLogin(env, request) {
  const b = await readJson(request) || {};
  const kuerzel = normKuerzel(b.kuerzel);
  if (kuerzel.length < 5) return err('kuerzel_zu_kurz');
  const sprache = LANGS.includes(b.sprache) ? b.sprache : 'de';
  let u = await env.DB.prepare('SELECT * FROM users WHERE kuerzel=?').bind(kuerzel).first();
  let existed = true;
  if (!u) {
    const name = norm(b.name);
    if (!name) return json({ ok: true, needName: true, existed: false });
    existed = false;
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
    const rolle = (count?.n || 0) === 0 ? 'supermaster' : 'pilot'; // erster Nutzer = Supermaster
    u = { id: uuid(), kuerzel, name, rolle, sprache, status: 'aktiv', created_at: now(), last_active: now() };
    await env.DB.prepare('INSERT INTO users (id,kuerzel,name,rolle,sprache,status,created_at,last_active) VALUES (?,?,?,?,?,?,?,?)')
      .bind(u.id, u.kuerzel, u.name, u.rolle, u.sprache, u.status, u.created_at, u.last_active).run();
  } else if (u.status === 'gesperrt') {
    return err('gesperrt', 403);
  } else if (b.sprache && LANGS.includes(b.sprache) && b.sprache !== u.sprache) {
    await env.DB.prepare('UPDATE users SET sprache=? WHERE id=?').bind(b.sprache, u.id).run(); u.sprache = b.sprache;
  }
  const token = randomToken();
  await env.DB.prepare('INSERT INTO devices (id,user_id,token_hash,plattform,installed,created_at,last_seen) VALUES (?,?,?,?,0,?,?)')
    .bind(uuid(), u.id, await sha256hex(token), norm(b.plattform) || null, now(), now()).run();
  return json({ ok: true, token, existed, user: pubUser(u) });
}

async function handleBootstrap(env, user, since) {
  const settings = await getSettings(env);
  await autoAbort(env, user.id, parseInt(settings.abbruch_minuten || '60', 10));
  const [groups, types, values, vars, balloons, favs] = await Promise.all([
    env.DB.prepare('SELECT * FROM groups ORDER BY reihenfolge').all(),
    env.DB.prepare('SELECT * FROM balloon_types WHERE aktiv=1 ORDER BY art, name').all(),
    env.DB.prepare('SELECT * FROM balloon_type_values').all(),
    env.DB.prepare('SELECT * FROM variables ORDER BY key').all(),
    env.DB.prepare('SELECT * FROM balloons WHERE user_id=? ORDER BY created_at').bind(user.id).all(),
    env.DB.prepare('SELECT * FROM favorites WHERE user_id=?').bind(user.id).all()
  ]);
  const valuesByType = {};
  for (const v of values.results || []) (valuesByType[v.balloon_type_id] ||= {})[v.variable_key] = v.wert;
  const checklists = await loadChecklistsForPilot(env, user);
  const sinceMs = parseInt(since || '0', 10) || 0;
  const whatsNew = sinceMs ? checklists.filter((c) => c.released_at && c.released_at > sinceMs).map((c) => ({ id: c.id, title: c.title, version: c.version, released_at: c.released_at, is_new: c.version === 1 })) : [];
  return json({
    ok: true, serverTime: now(), user: pubUser(user),
    settings: { app_name: settings.app_name || 'SBA Checklisten', warn_items: +settings.warn_items || 12, abbruch_minuten: +settings.abbruch_minuten || 60, aufbewahrung_jahre: +settings.aufbewahrung_jahre || 3 },
    groups: groups.results || [],
    balloonTypes: (types.results || []).map((t) => ({ ...t, values: valuesByType[t.id] || {} })),
    variables: vars.results || [],
    balloons: balloons.results || [],
    favorites: favs.results || [],
    checklists, whatsNew
  });
}

async function handleSync(env, user, request) {
  const b = await readJson(request) || {};
  const list = Array.isArray(b.sessions) ? b.sessions : [];
  const results = [];
  for (const s of list) {
    if (!s || !s.id || !s.checklist_version_id) { results.push({ id: s?.id, ok: false }); continue; }
    const ex = await env.DB.prepare('SELECT id, user_id, start_server, end_server, status FROM sessions WHERE id=?').bind(s.id).first();
    if (ex && ex.user_id !== user.id) { results.push({ id: s.id, ok: false, error: 'fremd' }); continue; }
    const finished = !!s.end_device && s.status && s.status !== 'offen';
    const t = now();
    if (!ex) {
      await env.DB.prepare(`INSERT INTO sessions (id,user_id,balloon_id,checklist_version_id,sprache,start_device,start_server,end_device,end_server,status,
        pos_start_lat,pos_start_lon,pos_start_acc,pos_end_lat,pos_end_lon,pos_end_acc,items_total,items_done) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(s.id, user.id, s.balloon_id || null, s.checklist_version_id, LANGS.includes(s.sprache) ? s.sprache : 'de',
          +s.start_device || t, t, finished ? (+s.end_device || t) : null, finished ? t : null, finished ? s.status : 'offen',
          s.pos_start?.lat ?? null, s.pos_start?.lon ?? null, s.pos_start?.acc ?? null,
          s.pos_end?.lat ?? null, s.pos_end?.lon ?? null, s.pos_end?.acc ?? null,
          +s.items_total || 0, +s.items_done || 0).run();
    } else if (ex.status === 'offen' || !ex.end_server) {
      await env.DB.prepare(`UPDATE sessions SET end_device=?, end_server=?, status=?, pos_start_lat=COALESCE(pos_start_lat,?), pos_start_lon=COALESCE(pos_start_lon,?), pos_start_acc=COALESCE(pos_start_acc,?),
          pos_end_lat=?, pos_end_lon=?, pos_end_acc=?, items_total=?, items_done=?, balloon_id=COALESCE(?,balloon_id) WHERE id=?`)
        .bind(finished ? (+s.end_device || t) : null, finished ? t : null, finished ? s.status : 'offen',
          s.pos_start?.lat ?? null, s.pos_start?.lon ?? null, s.pos_start?.acc ?? null,
          s.pos_end?.lat ?? null, s.pos_end?.lon ?? null, s.pos_end?.acc ?? null, +s.items_total || 0, +s.items_done || 0, s.balloon_id || null, s.id).run();
    }
    const items = Array.isArray(s.items) ? s.items : [];
    if (items.length) {
      const stmts = items.filter((it) => it && it.key).map((it) =>
        env.DB.prepare('INSERT OR IGNORE INTO session_items (session_id,item_key,done_at) VALUES (?,?,?)').bind(s.id, String(it.key), +it.done_at || t));
      if (stmts.length) await env.DB.batch(stmts);
    }
    if (finished) {
      // zuletzt benutzt → Favoritenblock (automatisch), ohne Nutzer-Favoriten zu überschreiben
      const v = await env.DB.prepare('SELECT checklist_id FROM checklist_versions WHERE id=?').bind(s.checklist_version_id).first();
      if (v) {
        await env.DB.prepare(`INSERT INTO favorites (user_id,checklist_id,source,last_used) VALUES (?,?,'automatisch',?)
          ON CONFLICT(user_id,checklist_id) DO UPDATE SET last_used=excluded.last_used`).bind(user.id, v.checklist_id, t).run();
      }
    }
    results.push({ id: s.id, ok: true });
  }
  return json({ ok: true, results, serverTime: now() });
}

async function handleMySessions(env, user, url) {
  const from = parseInt(url.searchParams.get('from') || '0', 10) || 0;
  const to = parseInt(url.searchParams.get('to') || '0', 10) || now() + 86400000;
  const rows = (await env.DB.prepare(`
    SELECT s.*, v.inhalt_de, v.inhalt_fr, v.inhalt_en, v.version, b.kennzeichen, bt.name AS muster, bt.art AS ballon_art
    FROM sessions s JOIN checklist_versions v ON v.id = s.checklist_version_id
    LEFT JOIN balloons b ON b.id = s.balloon_id LEFT JOIN balloon_types bt ON bt.id = b.balloon_type_id
    WHERE s.user_id=? AND s.start_server BETWEEN ? AND ? ORDER BY s.start_server DESC LIMIT 500`).bind(user.id, from, to).all()).results || [];
  return json({ ok: true, sessions: rows.map((r) => sessionRow(r, user.sprache)) });
}
function sessionRow(r, lang) {
  const t = parseContent(r['inhalt_' + lang] || r.inhalt_de).title || parseContent(r.inhalt_de).title || '';
  return {
    id: r.id, user_id: r.user_id, kuerzel: r.kuerzel, name: r.name, title: t, version: r.version, kennzeichen: r.kennzeichen, muster: r.muster, ballon_art: r.ballon_art,
    start_device: r.start_device, start_server: r.start_server, end_device: r.end_device, end_server: r.end_server, status: r.status,
    pos_start: r.pos_start_lat != null ? { lat: r.pos_start_lat, lon: r.pos_start_lon, acc: r.pos_start_acc } : null,
    pos_end: r.pos_end_lat != null ? { lat: r.pos_end_lat, lon: r.pos_end_lon, acc: r.pos_end_acc } : null,
    items_total: r.items_total, items_done: r.items_done, sprache: r.sprache
  };
}

// ---------- Admin ----------
async function adminChecklists(env) {
  const rows = (await env.DB.prepare(`
    SELECT c.id, c.group_id, c.art, c.ist_notfall, c.current_version_id, c.created_at, c.deleted_at,
           v.id AS version_id, v.version, v.status, v.inhalt_de, v.inhalt_fr, v.inhalt_en, v.status_fr, v.status_en, v.item_count, v.created_at AS v_created_at, v.created_by, v.released_at, v.change_note,
           u.kuerzel AS created_by_kuerzel
    FROM checklists c JOIN checklist_versions v ON v.checklist_id = c.id
    LEFT JOIN users u ON u.id = v.created_by
    WHERE c.deleted_at IS NULL ORDER BY c.created_at, v.version`).all()).results || [];
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, { id: r.id, group_id: r.group_id, art: r.art, ist_notfall: !!r.ist_notfall, current_version_id: r.current_version_id, versions: [] });
    map.get(r.id).versions.push({
      id: r.version_id, version: r.version, status: r.status, title: parseContent(r.inhalt_de).title || '', item_count: r.item_count,
      status_fr: r.status_fr, status_en: r.status_en, created_at: r.v_created_at, created_by: r.created_by_kuerzel, released_at: r.released_at, change_note: r.change_note
    });
  }
  const usage = (await env.DB.prepare(`SELECT v.checklist_id, COUNT(*) AS n FROM sessions s JOIN checklist_versions v ON v.id=s.checklist_version_id GROUP BY v.checklist_id`).all()).results || [];
  const useMap = Object.fromEntries(usage.map((u) => [u.checklist_id, u.n]));
  return [...map.values()].map((c) => ({ ...c, sessions: useMap[c.id] || 0 }));
}

async function groupCount(env, groupId) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM checklists WHERE group_id=? AND deleted_at IS NULL').bind(groupId).first();
  return r?.n || 0;
}

async function handleAdmin(env, user, request, url, p) {
  if (!isAdmin(user)) return err('kein_zugriff', 403);
  const m = request.method;

  if (p === '/api/admin/checklists' && m === 'GET') return json({ ok: true, checklists: await adminChecklists(env), groups: (await env.DB.prepare('SELECT * FROM groups ORDER BY reihenfolge').all()).results });

  if (p === '/api/admin/checklists' && m === 'POST') {
    const b = await readJson(request) || {};
    const content = b.content && typeof b.content === 'object' ? b.content : null;
    if (!content || !norm(content.title)) return err('titel_fehlt');
    const g = await env.DB.prepare('SELECT * FROM groups WHERE id=?').bind(b.group_id).first();
    if (!g) return err('gruppe_fehlt');
    if (g.limit_count > 0 && (await groupCount(env, g.id)) >= g.limit_count) return err('gruppenlimit', 409, {}, );
    const art = ['heissluft', 'gas', 'beide'].includes(b.art) ? b.art : 'beide';
    const cid = uuid(), vid = uuid(), t = now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO checklists (id,group_id,art,ist_notfall,current_version_id,created_by,created_at) VALUES (?,?,?,?,NULL,?,?)').bind(cid, g.id, art, g.ist_notfall ? 1 : 0, user.id, t),
      env.DB.prepare('INSERT INTO checklist_versions (id,checklist_id,version,status,inhalt_de,status_fr,status_en,item_count,original_file,change_note,created_by,created_at) VALUES (?,?,1,?,?,?,?,?,?,?,?,?)')
        .bind(vid, cid, 'entwurf', JSON.stringify(content), 'fehlt', 'fehlt', countItems(content), norm(b.original_file) || null, norm(b.change_note) || 'Erstfassung', user.id, t)
    ]);
    return json({ ok: true, id: cid, version_id: vid });
  }

  let mm;
  if ((mm = /^\/api\/admin\/checklists\/([^/]+)$/.exec(p))) {
    const cid = mm[1];
    const c = await env.DB.prepare('SELECT * FROM checklists WHERE id=? AND deleted_at IS NULL').bind(cid).first();
    if (!c) return err('nicht_gefunden', 404);
    if (m === 'DELETE') { await env.DB.prepare('UPDATE checklists SET deleted_at=? WHERE id=?').bind(now(), cid).run(); return json({ ok: true }); }
    if (m === 'PUT') {
      const b = await readJson(request) || {};
      const art = ['heissluft', 'gas', 'beide'].includes(b.art) ? b.art : c.art;
      let group_id = c.group_id;
      if (b.group_id && b.group_id !== c.group_id) {
        const g = await env.DB.prepare('SELECT * FROM groups WHERE id=?').bind(b.group_id).first();
        if (!g) return err('gruppe_fehlt');
        if (g.limit_count > 0 && (await groupCount(env, g.id)) >= g.limit_count) return err('gruppenlimit', 409);
        group_id = g.id;
      }
      await env.DB.prepare('UPDATE checklists SET art=?, group_id=? WHERE id=?').bind(art, group_id, cid).run();
      return json({ ok: true });
    }
  }
  if ((mm = /^\/api\/admin\/checklists\/([^/]+)\/versions$/.exec(p)) && m === 'POST') {
    // neue Entwurfsversion (oder bestehenden Entwurf überschreiben)
    const cid = mm[1];
    const b = await readJson(request) || {};
    const content = b.content && typeof b.content === 'object' ? b.content : null;
    if (!content || !norm(content.title)) return err('titel_fehlt');
    const c = await env.DB.prepare('SELECT * FROM checklists WHERE id=? AND deleted_at IS NULL').bind(cid).first();
    if (!c) return err('nicht_gefunden', 404);
    const draft = await env.DB.prepare("SELECT * FROM checklist_versions WHERE checklist_id=? AND status='entwurf' ORDER BY version DESC LIMIT 1").bind(cid).first();
    const t = now();
    if (draft) {
      await env.DB.prepare("UPDATE checklist_versions SET inhalt_de=?, inhalt_fr=NULL, inhalt_en=NULL, status_fr='fehlt', status_en='fehlt', item_count=?, change_note=?, created_by=?, created_at=? WHERE id=?")
        .bind(JSON.stringify(content), countItems(content), norm(b.change_note) || draft.change_note, user.id, t, draft.id).run();
      return json({ ok: true, version_id: draft.id, version: draft.version });
    }
    const mx = await env.DB.prepare('SELECT MAX(version) AS v FROM checklist_versions WHERE checklist_id=?').bind(cid).first();
    const vid = uuid(), ver = (mx?.v || 0) + 1;
    await env.DB.prepare('INSERT INTO checklist_versions (id,checklist_id,version,status,inhalt_de,status_fr,status_en,item_count,change_note,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(vid, cid, ver, 'entwurf', JSON.stringify(content), 'fehlt', 'fehlt', countItems(content), norm(b.change_note) || null, user.id, t).run();
    return json({ ok: true, version_id: vid, version: ver });
  }
  if ((mm = /^\/api\/admin\/versions\/([^/]+)$/.exec(p)) && m === 'GET') {
    const v = await env.DB.prepare('SELECT * FROM checklist_versions WHERE id=?').bind(mm[1]).first();
    if (!v) return err('nicht_gefunden', 404);
    return json({ ok: true, version: { ...v, content_de: parseContent(v.inhalt_de), content_fr: v.inhalt_fr ? parseContent(v.inhalt_fr) : null, content_en: v.inhalt_en ? parseContent(v.inhalt_en) : null, inhalt_de: undefined, inhalt_fr: undefined, inhalt_en: undefined } });
  }
  if ((mm = /^\/api\/admin\/versions\/([^/]+)\/release$/.exec(p)) && m === 'POST') {
    const v = await env.DB.prepare('SELECT * FROM checklist_versions WHERE id=?').bind(mm[1]).first();
    if (!v) return err('nicht_gefunden', 404);
    const t = now();
    await env.DB.batch([
      env.DB.prepare("UPDATE checklist_versions SET status='freigegeben', released_by=?, released_at=? WHERE id=?").bind(user.id, t, v.id),
      env.DB.prepare('UPDATE checklists SET current_version_id=? WHERE id=?').bind(v.id, v.checklist_id)
    ]);
    return json({ ok: true });
  }
  if ((mm = /^\/api\/admin\/versions\/([^/]+)\/translation$/.exec(p)) && m === 'PUT') {
    // Übersetzung setzen/prüfen: {lang:'fr'|'en', content, status:'automatisch'|'geprueft'}
    const b = await readJson(request) || {};
    if (!['fr', 'en'].includes(b.lang)) return err('sprache');
    const st = b.status === 'geprueft' ? 'geprueft' : 'automatisch';
    await env.DB.prepare(`UPDATE checklist_versions SET inhalt_${b.lang}=?, status_${b.lang}=? WHERE id=?`).bind(JSON.stringify(b.content || {}), st, mm[1]).run();
    return json({ ok: true });
  }
  if ((mm = /^\/api\/admin\/versions\/([^/]+)\/translate$/.exec(p)) && m === 'POST') {
    return handleTranslate(env, mm[1]);
  }

  if (p === '/api/admin/groups' && m === 'GET') {
    const groups = (await env.DB.prepare('SELECT * FROM groups ORDER BY reihenfolge').all()).results || [];
    for (const g of groups) g.count = await groupCount(env, g.id);
    return json({ ok: true, groups });
  }
  if ((mm = /^\/api\/admin\/groups\/([^/]+)$/.exec(p)) && m === 'PUT') {
    const b = await readJson(request) || {};
    await env.DB.prepare('UPDATE groups SET limit_count=COALESCE(?,limit_count), name_de=COALESCE(?,name_de), name_fr=COALESCE(?,name_fr), name_en=COALESCE(?,name_en) WHERE id=?')
      .bind(b.limit_count != null ? +b.limit_count : null, norm(b.name_de) || null, norm(b.name_fr) || null, norm(b.name_en) || null, mm[1]).run();
    return json({ ok: true });
  }

  // Ballonmuster und Variablen
  if (p === '/api/admin/balloon-types' && m === 'GET') {
    const types = (await env.DB.prepare('SELECT * FROM balloon_types ORDER BY art, name').all()).results || [];
    const values = (await env.DB.prepare('SELECT * FROM balloon_type_values').all()).results || [];
    const counts = (await env.DB.prepare('SELECT balloon_type_id, COUNT(*) AS n FROM balloons GROUP BY balloon_type_id').all()).results || [];
    const cm = Object.fromEntries(counts.map((c) => [c.balloon_type_id, c.n]));
    for (const t of types) { t.values = {}; t.balloons = cm[t.id] || 0; }
    const tm = Object.fromEntries(types.map((t) => [t.id, t]));
    for (const v of values) if (tm[v.balloon_type_id]) tm[v.balloon_type_id].values[v.variable_key] = v.wert;
    return json({ ok: true, types, variables: (await env.DB.prepare('SELECT * FROM variables ORDER BY key').all()).results });
  }
  if (p === '/api/admin/balloon-types' && m === 'POST') {
    const b = await readJson(request) || {};
    if (!norm(b.name) || !['heissluft', 'gas'].includes(b.art)) return err('angaben');
    const id = uuid();
    await env.DB.prepare('INSERT INTO balloon_types (id,name,art,hersteller,aktiv,created_at) VALUES (?,?,?,?,1,?)').bind(id, norm(b.name), b.art, norm(b.hersteller) || null, now()).run();
    await saveTypeValues(env, id, b.values);
    return json({ ok: true, id });
  }
  if ((mm = /^\/api\/admin\/balloon-types\/([^/]+)$/.exec(p)) && (m === 'PUT' || m === 'DELETE')) {
    if (m === 'DELETE') { await env.DB.prepare('UPDATE balloon_types SET aktiv=0 WHERE id=?').bind(mm[1]).run(); return json({ ok: true }); }
    const b = await readJson(request) || {};
    await env.DB.prepare('UPDATE balloon_types SET name=COALESCE(?,name), art=COALESCE(?,art), hersteller=COALESCE(?,hersteller), aktiv=COALESCE(?,aktiv) WHERE id=?')
      .bind(norm(b.name) || null, ['heissluft', 'gas'].includes(b.art) ? b.art : null, b.hersteller != null ? norm(b.hersteller) : null, b.aktiv != null ? (b.aktiv ? 1 : 0) : null, mm[1]).run();
    if (b.values) await saveTypeValues(env, mm[1], b.values);
    return json({ ok: true });
  }
  if (p === '/api/admin/variables' && m === 'POST') {
    const b = await readJson(request) || {};
    const key = norm(b.key).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key || !norm(b.label_de)) return err('angaben');
    await env.DB.prepare('INSERT INTO variables (key,label_de,label_fr,label_en,einheit,nur_art) VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET label_de=excluded.label_de, label_fr=excluded.label_fr, label_en=excluded.label_en, einheit=excluded.einheit, nur_art=excluded.nur_art')
      .bind(key, norm(b.label_de), norm(b.label_fr) || null, norm(b.label_en) || null, norm(b.einheit) || null, ['heissluft', 'gas'].includes(b.nur_art) ? b.nur_art : null).run();
    return json({ ok: true, key });
  }

  // Nutzer
  if (p === '/api/admin/users' && m === 'GET') {
    const users = (await env.DB.prepare('SELECT * FROM users ORDER BY kuerzel').all()).results || [];
    const balloons = (await env.DB.prepare('SELECT user_id, kennzeichen FROM balloons ORDER BY created_at').all()).results || [];
    const stats = (await env.DB.prepare("SELECT user_id, COUNT(*) AS n, SUM(CASE WHEN status='abgeschlossen' THEN 1 ELSE 0 END) AS done FROM sessions GROUP BY user_id").all()).results || [];
    const sm = Object.fromEntries(stats.map((s) => [s.user_id, s]));
    return json({ ok: true, users: users.map((u) => ({ ...pubUser(u), balloons: balloons.filter((b) => b.user_id === u.id).map((b) => b.kennzeichen), sessions: sm[u.id]?.n || 0, completed: sm[u.id]?.done || 0 })) });
  }
  if ((mm = /^\/api\/admin\/users\/([^/]+)$/.exec(p)) && m === 'PUT') {
    const b = await readJson(request) || {};
    const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(mm[1]).first();
    if (!target) return err('nicht_gefunden', 404);
    if (target.rolle === 'supermaster' && !isSuper(user)) return err('kein_zugriff', 403);
    const rolle = ROLES.includes(b.rolle) ? b.rolle : null;
    if (rolle === 'supermaster' && !isSuper(user)) return err('kein_zugriff', 403);
    const status = ['aktiv', 'gesperrt'].includes(b.status) ? b.status : null;
    await env.DB.prepare('UPDATE users SET rolle=COALESCE(?,rolle), status=COALESCE(?,status), name=COALESCE(?,name) WHERE id=?').bind(rolle, status, norm(b.name) || null, mm[1]).run();
    if (status === 'gesperrt') await env.DB.prepare('DELETE FROM devices WHERE user_id=?').bind(mm[1]).run();
    return json({ ok: true });
  }
  if ((mm = /^\/api\/admin\/users\/([^/]+)\/sessions$/.exec(p)) && m === 'GET') {
    if (!isSuper(user)) return err('nur_supermaster', 403);
    const rows = (await env.DB.prepare(`SELECT s.*, u.kuerzel, u.name, v.inhalt_de, v.inhalt_fr, v.inhalt_en, v.version, b.kennzeichen, bt.name AS muster, bt.art AS ballon_art
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN checklist_versions v ON v.id=s.checklist_version_id
      LEFT JOIN balloons b ON b.id=s.balloon_id LEFT JOIN balloon_types bt ON bt.id=b.balloon_type_id
      WHERE s.user_id=? ORDER BY s.start_server DESC LIMIT 1000`).bind(mm[1]).all()).results || [];
    return json({ ok: true, sessions: rows.map((r) => sessionRow(r, 'de')) });
  }

  // Auswertung (Admin sieht Namen, aber nur Übersicht)
  if (p === '/api/admin/stats' && m === 'GET') {
    const from = parseInt(url.searchParams.get('from') || '0', 10) || 0;
    const to = parseInt(url.searchParams.get('to') || '0', 10) || now() + 86400000;
    const rows = (await env.DB.prepare(`SELECT s.id, s.user_id, u.kuerzel, u.name, s.balloon_id, b.kennzeichen, bt.art AS ballon_art, v.checklist_id, v.version, v.inhalt_de,
        s.start_server, s.end_server, s.status, s.items_total, s.items_done, s.pos_start_lat, s.pos_start_lon
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN checklist_versions v ON v.id=s.checklist_version_id
      LEFT JOIN balloons b ON b.id=s.balloon_id LEFT JOIN balloon_types bt ON bt.id=b.balloon_type_id
      WHERE s.start_server BETWEEN ? AND ? ORDER BY s.start_server DESC LIMIT 2000`).bind(from, to).all()).results || [];
    const sessions = rows.map((r) => ({ id: r.id, user_id: r.user_id, kuerzel: r.kuerzel, name: r.name, kennzeichen: r.kennzeichen, ballon_art: r.ballon_art, checklist_id: r.checklist_id, version: r.version,
      title: parseContent(r.inhalt_de).title || '', start: r.start_server, end: r.end_server, status: r.status, items_total: r.items_total, items_done: r.items_done,
      pos: r.pos_start_lat != null ? { lat: r.pos_start_lat, lon: r.pos_start_lon } : null }));
    const users = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE status=\'aktiv\'').first())?.n || 0;
    return json({ ok: true, sessions, activeUsers: users });
  }

  // Einstellungen und Zugänge
  if (p === '/api/admin/settings' && m === 'GET') {
    const s = await getSettings(env);
    return json({ ok: true, settings: { app_name: s.app_name || '', warn_items: s.warn_items || '12', abbruch_minuten: s.abbruch_minuten || '60', aufbewahrung_jahre: s.aufbewahrung_jahre || '3', loesch_stichtag: s.loesch_stichtag || '01-31', api_key_set: !!s.anthropic_api_key } });
  }
  if (p === '/api/admin/settings' && m === 'PUT') {
    const b = await readJson(request) || {};
    const stmts = [];
    for (const k of ['app_name', 'warn_items', 'abbruch_minuten', 'aufbewahrung_jahre', 'loesch_stichtag']) {
      if (b[k] != null) stmts.push(env.DB.prepare('INSERT INTO settings (key,value,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at').bind(k, String(b[k]), user.id, now()));
    }
    if (b.anthropic_api_key != null) {
      const val = norm(b.anthropic_api_key) ? await encrypt(env, norm(b.anthropic_api_key)) : null;
      stmts.push(env.DB.prepare('INSERT INTO settings (key,value,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at').bind('anthropic_api_key', val, user.id, now()));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true });
  }

  // Dateien (Importoriginale) in R2
  if (p === '/api/admin/files' && m === 'POST') {
    const name = norm(request.headers.get('X-Filename') || 'datei').replace(/[^\w.\-äöüÄÖÜ ]/g, '_');
    const key = `imports/${Date.now()}-${name}`;
    await env.FILES.put(key, request.body, { httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' } });
    return json({ ok: true, key });
  }
  if ((mm = /^\/api\/admin\/files\/(.+)$/.exec(p)) && m === 'GET') {
    const obj = await env.FILES.get(decodeURIComponent(mm[1]));
    if (!obj) return err('nicht_gefunden', 404);
    return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, no-store' } });
  }

  return err('nicht_gefunden', 404);
}

async function saveTypeValues(env, typeId, values) {
  if (!values || typeof values !== 'object') return;
  const stmts = [];
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === '') stmts.push(env.DB.prepare('DELETE FROM balloon_type_values WHERE balloon_type_id=? AND variable_key=?').bind(typeId, k));
    else stmts.push(env.DB.prepare('INSERT INTO balloon_type_values (balloon_type_id,variable_key,wert) VALUES (?,?,?) ON CONFLICT(balloon_type_id,variable_key) DO UPDATE SET wert=excluded.wert').bind(typeId, k, String(v)));
  }
  if (stmts.length) await env.DB.batch(stmts);
}

async function handleTranslate(env, versionId) {
  const s = await getSettings(env);
  const apiKey = s.anthropic_api_key ? await decrypt(env, s.anthropic_api_key) : null;
  if (!apiKey) return err('api_schluessel_fehlt', 409);
  const v = await env.DB.prepare('SELECT * FROM checklist_versions WHERE id=?').bind(versionId).first();
  if (!v) return err('nicht_gefunden', 404);
  const content = parseContent(v.inhalt_de);
  const prompt = `Übersetze die folgende Ballon-Checkliste (JSON) aus dem Deutschen ins Französische und ins Englische. Fachsprache Ballonfahrt (Heissluft/Gas), kurz und imperativ wie im Original. Platzhalter wie {{steigrate_max}} unverändert lassen. Gib NUR ein JSON-Objekt zurück: {"fr": <gleiche Struktur>, "en": <gleiche Struktur>}.\n\n${JSON.stringify(content)}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) return err('uebersetzung_fehlgeschlagen: ' + res.status, 502);
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  const mJson = /\{[\s\S]*\}/.exec(text);
  let out; try { out = JSON.parse(mJson ? mJson[0] : text); } catch { return err('uebersetzung_unlesbar', 502); }
  if (!out.fr || !out.en) return err('uebersetzung_unvollstaendig', 502);
  await env.DB.prepare("UPDATE checklist_versions SET inhalt_fr=?, inhalt_en=?, status_fr='automatisch', status_en='automatisch' WHERE id=?")
    .bind(JSON.stringify(out.fr), JSON.stringify(out.en), versionId).run();
  return json({ ok: true, fr: out.fr, en: out.en });
}

// ---------- Router ----------
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    const p = url.pathname;
    const withCors = (r) => { for (const [k, v] of Object.entries(cors)) r.headers.set(k, v); return r; };

    try {
      if (p === '/api/health') {
        let db = 'unbekannt';
        try { const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM groups').first(); db = `ok (${row?.n ?? '?'} Gruppen)`; } catch (e) { db = 'fehler: ' + e.message; }
        return withCors(json({ ok: true, app: 'checklists-api', version: env.APP_VERSION || '', db, time: now() }));
      }
      if (p === '/api/login' && request.method === 'POST') return withCors(await handleLogin(env, request));
      if (!p.startsWith('/api/')) return withCors(json({ ok: true, app: 'checklists-api', hint: 'API unter /api/…' }));

      const user = await userByToken(env, request);
      if (!user) return withCors(err('nicht_angemeldet', 401));
      if (user.blocked) return withCors(err('gesperrt', 403));
      const m = request.method;

      if (p === '/api/me' && m === 'GET') return withCors(json({ ok: true, user: pubUser(user) }));
      if (p === '/api/me' && m === 'PUT') {
        const b = await readJson(request) || {};
        const sprache = LANGS.includes(b.sprache) ? b.sprache : null;
        let kuerzel = null;
        if (b.kuerzel) {
          kuerzel = normKuerzel(b.kuerzel);
          if (kuerzel.length < 5) return withCors(err('kuerzel_zu_kurz'));
          const ex = await env.DB.prepare('SELECT id FROM users WHERE kuerzel=? AND id<>?').bind(kuerzel, user.id).first();
          if (ex) return withCors(err('kuerzel_vergeben', 409));
        }
        await env.DB.prepare('UPDATE users SET name=COALESCE(?,name), sprache=COALESCE(?,sprache), kuerzel=COALESCE(?,kuerzel) WHERE id=?').bind(norm(b.name) || null, sprache, kuerzel, user.id).run();
        const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
        return withCors(json({ ok: true, user: pubUser(u) }));
      }
      if (p === '/api/logout' && m === 'POST') { await env.DB.prepare('DELETE FROM devices WHERE id=?').bind(user.device_id).run(); return withCors(json({ ok: true })); }
      if (p === '/api/installed' && m === 'POST') { await env.DB.prepare('UPDATE devices SET installed=1 WHERE id=?').bind(user.device_id).run(); return withCors(json({ ok: true })); }
      if (p === '/api/bootstrap' && m === 'GET') return withCors(await handleBootstrap(env, user, url.searchParams.get('since')));

      if (p === '/api/favorites' && m === 'POST') {
        const b = await readJson(request) || {};
        if (!b.checklist_id) return withCors(err('angaben'));
        if (b.on) await env.DB.prepare("INSERT INTO favorites (user_id,checklist_id,source,last_used) VALUES (?,?,'nutzer',NULL) ON CONFLICT(user_id,checklist_id) DO UPDATE SET source='nutzer'").bind(user.id, b.checklist_id).run();
        else await env.DB.prepare('DELETE FROM favorites WHERE user_id=? AND checklist_id=?').bind(user.id, b.checklist_id).run();
        return withCors(json({ ok: true }));
      }

      if (p === '/api/balloons' && m === 'GET') return withCors(json({ ok: true, balloons: (await env.DB.prepare('SELECT * FROM balloons WHERE user_id=? ORDER BY created_at').bind(user.id).all()).results }));
      if (p === '/api/balloons' && m === 'POST') {
        const b = await readJson(request) || {};
        const kz = norm(b.kennzeichen).toUpperCase();
        if (!kz || !b.balloon_type_id) return withCors(err('angaben'));
        const t = await env.DB.prepare('SELECT id FROM balloon_types WHERE id=? AND aktiv=1').bind(b.balloon_type_id).first();
        if (!t) return withCors(err('muster_fehlt'));
        const dup = await env.DB.prepare('SELECT id FROM balloons WHERE user_id=? AND kennzeichen=?').bind(user.id, kz).first();
        if (dup) { // gleiches Kennzeichen schon erfasst → aktualisieren statt doppeln
          await env.DB.batch([
            env.DB.prepare('UPDATE balloons SET aktiv=0 WHERE user_id=?').bind(user.id),
            env.DB.prepare('UPDATE balloons SET balloon_type_id=?, aktiv=1 WHERE id=?').bind(b.balloon_type_id, dup.id)
          ]);
          return withCors(json({ ok: true, id: dup.id, existed: true }));
        }
        const id = uuid();
        await env.DB.batch([
          env.DB.prepare('UPDATE balloons SET aktiv=0 WHERE user_id=?').bind(user.id),
          env.DB.prepare('INSERT INTO balloons (id,user_id,kennzeichen,balloon_type_id,aktiv,created_at) VALUES (?,?,?,?,1,?)').bind(id, user.id, kz, b.balloon_type_id, now())
        ]);
        return withCors(json({ ok: true, id }));
      }
      let mm;
      if ((mm = /^\/api\/balloons\/([^/]+)$/.exec(p))) {
        const bl = await env.DB.prepare('SELECT * FROM balloons WHERE id=? AND user_id=?').bind(mm[1], user.id).first();
        if (!bl) return withCors(err('nicht_gefunden', 404));
        if (m === 'DELETE') { await env.DB.prepare('DELETE FROM balloons WHERE id=?').bind(bl.id).run(); return withCors(json({ ok: true })); }
        if (m === 'PUT') {
          const b = await readJson(request) || {};
          if (b.aktiv) await env.DB.prepare('UPDATE balloons SET aktiv=0 WHERE user_id=?').bind(user.id).run();
          await env.DB.prepare('UPDATE balloons SET kennzeichen=COALESCE(?,kennzeichen), balloon_type_id=COALESCE(?,balloon_type_id), aktiv=COALESCE(?,aktiv) WHERE id=?')
            .bind(b.kennzeichen ? norm(b.kennzeichen).toUpperCase() : null, b.balloon_type_id || null, b.aktiv != null ? (b.aktiv ? 1 : 0) : null, bl.id).run();
          return withCors(json({ ok: true }));
        }
      }

      if (p === '/api/sync' && m === 'POST') return withCors(await handleSync(env, user, request));
      if (p === '/api/sessions' && m === 'GET') return withCors(await handleMySessions(env, user, url));

      if (p.startsWith('/api/admin/')) return withCors(await handleAdmin(env, user, request, url, p));
      return withCors(err('nicht_gefunden', 404));
    } catch (e) {
      return withCors(err('serverfehler: ' + (e && e.message ? e.message : String(e)), 500));
    }
  }
};
