// SBA Checklisten — Cloudflare Worker, Grundgerüst v0.1
// Die eigentliche API (Anmeldung, Checklisten, Protokoll, Admin) folgt mit der Lieferung v0.1.0.
// Dieses Gerüst liefert /api/health für die Einrichtung und beantwortet CORS.

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/api/health') {
      let db = 'unbekannt';
      try {
        const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM groups').first();
        db = row && typeof row.n === 'number' ? `ok (${row.n} Gruppen)` : 'ok';
      } catch (e) {
        db = 'fehler: ' + (e && e.message ? e.message : String(e));
      }
      return json({ ok: true, app: 'checklists-api', version: env.APP_VERSION || '', db, time: Date.now() }, 200, cors);
    }

    if (p.startsWith('/api/')) {
      return json({ ok: false, error: 'noch nicht verfügbar – Lieferung v0.1.0 folgt', path: p }, 404, cors);
    }

    return json({ ok: true, app: 'checklists-api', hint: 'API unter /api/…' }, 200, cors);
  }
};
