/* SBA Checklisten — Import aus Word (.docx), Excel (.xlsx/.csv) oder Text, und das Listen-Textformat
 * des Editors. Bibliotheken: mammoth (docx → HTML) und SheetJS (xlsx) aus js/vendor, global geladen.
 *
 * Zeilen: {type: 'title'|'section'|'item'|'note'|'ignore', text}
 * Inhalt (JSON): {title, sections:[{title, items:[{key, type:'item'|'note', text, var?}]}]}
 *
 * Textformat des Editors:
 *   # Titel
 *   ## Abschnitt
 *   Punkt (Variablen als {{steigrate_max}})
 *   > Hinweis
 */

const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s•\-–*·▪◦●o]+\s*/, '').trim();
const NOTE_RE = /^(hinweis|note|remarque|achtung|attention|caution|bemerkung|info)\b/i;
const NUM_RE = /^\d+[.)]\s+/;

function classify(text, ctx) {
  const t = clean(text);
  if (!t) return null;
  if (NOTE_RE.test(t)) return { type: 'note', text: t.replace(/^(hinweis|note|remarque|achtung|attention|caution|bemerkung|info)\s*[:：]\s*/i, '') };
  if (ctx.heading) return { type: 'section', text: t.replace(NUM_RE, '') };
  if (NUM_RE.test(t) && t.length < 45 && !/[.!?]$/.test(t)) return { type: 'section', text: t.replace(NUM_RE, '') };
  if (t.length < 40 && t === t.toUpperCase() && /[A-ZÄÖÜ]{3,}/.test(t)) return { type: 'section', text: t.charAt(0) + t.slice(1).toLowerCase() };
  return { type: 'item', text: t };
}

export async function parseDocx(buffer) {
  if (!window.mammoth) throw new Error('mammoth fehlt');
  const res = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
  const doc = new DOMParser().parseFromString('<div>' + res.value + '</div>', 'text/html');
  const lines = []; let titleSeen = false;
  const push = (l) => { if (l) lines.push(l); };
  const walk = (node) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'h1' || (!titleSeen && (tag === 'h2' || tag === 'p') && clean(el.textContent) && /checklist|liste/i.test(el.textContent))) {
        if (!titleSeen) { push({ type: 'title', text: clean(el.textContent).replace(/^checkliste\s*[:\-–]?\s*/i, '') }); titleSeen = true; continue; }
      }
      if (/^h[2-6]$/.test(tag)) { push(classify(el.textContent, { heading: true })); continue; }
      if (tag === 'ul' || tag === 'ol') { for (const li of el.querySelectorAll(':scope > li')) push(classify(li.textContent, {})); continue; }
      if (tag === 'table') {
        for (const tr of el.querySelectorAll('tr')) {
          const cells = [...tr.querySelectorAll('td,th')].map((c) => clean(c.textContent)).filter(Boolean);
          if (!cells.length) continue;
          if (tr.querySelector('th') && cells.length > 1) continue; // Kopfzeile
          push(classify(cells.length === 1 ? cells[0] : cells.join(' – '), {}));
        }
        continue;
      }
      if (tag === 'p') {
        const txt = clean(el.textContent); if (!txt) continue;
        const onlyBold = el.querySelector('strong') && clean(el.querySelector('strong').textContent) === txt;
        push(classify(txt, { heading: onlyBold && txt.length < 60 }));
        continue;
      }
      if (el.children.length) walk(el);
    }
  };
  walk(doc.body.firstElementChild);
  return { lines: dedupe(lines), original: textOf(doc.body) };
}

export function parseXlsx(buffer, filename) {
  if (!window.XLSX) throw new Error('SheetJS fehlt');
  const wb = window.XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  const lines = []; const orig = [];
  let title = (filename || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  for (const r of rows) {
    const cells = r.map((c) => clean(c)).filter(Boolean);
    orig.push(r.map((c) => String(c ?? '')).join(' | '));
    if (!cells.length) continue;
    const typeCell = cells.find((c) => /^(abschnitt|section|punkt|item|hinweis|note|titel|title)$/i.test(c));
    if (typeCell) {
      const text = cells.filter((c) => c !== typeCell).join(' – ');
      const ty = /^(abschnitt|section)$/i.test(typeCell) ? 'section' : /^(hinweis|note)$/i.test(typeCell) ? 'note' : /^(titel|title)$/i.test(typeCell) ? 'title' : 'item';
      if (ty === 'title') { title = text; continue; }
      lines.push({ type: ty, text });
      continue;
    }
    if (r.length > 1 && clean(r[0]) && !clean(r[1])) { lines.push(classify(cells[0], { heading: true })); continue; } // nur Spalte A → Abschnitt
    if (r.length > 1 && clean(r[0]) && clean(r[1])) { // Spalte A Abschnitt (trägt), Spalte B Punkt
      const sec = clean(r[0]); const last = [...lines].reverse().find((l) => l.type === 'section');
      if (!last || last.text !== sec) lines.push({ type: 'section', text: sec });
      lines.push(classify(cells.slice(1).join(' – '), {}));
      continue;
    }
    lines.push(classify(cells.join(' – '), {}));
  }
  return { lines: dedupe([{ type: 'title', text: title }, ...lines]), original: orig.join('\n') };
}

export function parseText(text) {
  const lines = [];
  let first = true;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const t = raw.trim(); if (!t) continue;
    if (first) { first = false; if (!/^[•\-*]/.test(t) && t.length < 80) { lines.push({ type: 'title', text: clean(t).replace(/^checkliste\s*[:\-–]?\s*/i, '') }); continue; } }
    const l = classify(t, { heading: /^#{1,3}\s/.test(t) || /^\d+[.)]\s+\S+$/.test(t) });
    if (l) lines.push(l);
  }
  return { lines: dedupe(lines), original: text };
}

function dedupe(lines) {
  const out = []; let hasTitle = false;
  for (const l of lines) {
    if (!l || !l.text) continue;
    if (l.type === 'title') { if (hasTitle) { out.push({ ...l, type: 'section' }); continue; } hasTitle = true; }
    out.push(l);
  }
  if (!hasTitle) out.unshift({ type: 'title', text: '' });
  return out;
}
function textOf(node) {
  const out = [];
  for (const el of node.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr')) {
    if (el.closest('li,td,th') && el.tagName !== 'LI' && el.tagName !== 'TR') continue; // Absätze in Zellen/Listen nicht doppelt
    const t = el.tagName === 'TR' ? [...el.querySelectorAll('td,th')].map((c) => clean(c.textContent)).filter(Boolean).join(' | ') : clean(el.textContent);
    if (t) out.push(t);
  }
  return out.join('\n');
}

// ---------- Zeilen ↔ Inhalt ↔ Textformat ----------
export function linesToContent(lines) {
  const content = { title: '', sections: [] };
  let sec = null; let si = 0; let ii = 0;
  for (const l of lines) {
    if (l.type === 'ignore' || !clean(l.text)) continue;
    if (l.type === 'title') { content.title = clean(l.text); continue; }
    if (l.type === 'section') { sec = { title: clean(l.text), items: [] }; content.sections.push(sec); si++; ii = 0; continue; }
    if (!sec) { sec = { title: '', items: [] }; content.sections.push(sec); si++; ii = 0; }
    ii++;
    const item = { key: 's' + si + 'i' + ii, type: l.type === 'note' ? 'note' : 'item', text: clean(l.text) };
    const m = /\{\{\s*([a-z0-9_]+)\s*\}\}/i.exec(item.text); if (m && l.type !== 'note') item.var = m[1].toLowerCase();
    sec.items.push(item);
  }
  return content;
}
export function contentToText(content) {
  const out = ['# ' + (content.title || '')];
  for (const s of content.sections || []) {
    out.push(''); if (s.title) out.push('## ' + s.title);
    for (const it of s.items || []) out.push((it.type === 'note' ? '> ' : '') + it.text);
  }
  return out.join('\n');
}
export function textToContent(text) {
  const lines = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const t = raw.trim(); if (!t) continue;
    if (/^#\s/.test(t)) lines.push({ type: 'title', text: t.replace(/^#\s+/, '') });
    else if (/^##+\s/.test(t)) lines.push({ type: 'section', text: t.replace(/^##+\s+/, '') });
    else if (/^>\s?/.test(t)) lines.push({ type: 'note', text: t.replace(/^>\s?/, '') });
    else lines.push({ type: 'item', text: t });
  }
  return linesToContent(lines);
}
export const countItems = (content) => (content.sections || []).reduce((n, s) => n + (s.items || []).filter((i) => i.type !== 'note').length, 0);
export const countNotes = (content) => (content.sections || []).reduce((n, s) => n + (s.items || []).filter((i) => i.type === 'note').length, 0);
export const usedVars = (content) => { const set = new Set(); for (const s of content.sections || []) for (const i of s.items || []) for (const m of String(i.text).matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) set.add(m[1].toLowerCase()); return [...set]; };

export async function parseFile(file) {
  const name = file.name || '';
  if (/\.docx$/i.test(name)) return parseDocx(await file.arrayBuffer());
  if (/\.(xlsx|xlsm|xls|csv)$/i.test(name)) return parseXlsx(await file.arrayBuffer(), name);
  if (/\.(txt|md)$/i.test(name)) return parseText(await file.text());
  throw new Error('Dateityp nicht unterstützt: ' + name);
}
