/* Erzeugt worker/seed/sba-seed.sql aus sba-content.mjs. Aufruf: node worker/seed/build-seed.mjs
 * Idempotent: INSERT OR IGNORE (bestehende Zeilen bleiben; Änderungen an Entwürfen macht der Admin in der Verwaltung). */
import { writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textToContent, countItems } from '../../js/import.js';
import { groups, variables, balloonTypes, files, checklists } from './sba-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const T0 = Date.UTC(2026, 9, 25, 6, 0, 0); // feste Zeit, damit der Seed reproduzierbar bleibt
const out = ['-- SBA Checklisten – Ausgangsinhalt (automatisch erzeugt aus sba-content.mjs, nicht von Hand ändern)', 'PRAGMA foreign_keys = OFF;'];

// Gruppen: neue einfügen, bestehende in Reihenfolge/Limit/Typ nachziehen
for (const [id, key, r, de, fr, en, lim, nf, ph] of groups) {
  out.push(`INSERT OR IGNORE INTO groups (id,key,reihenfolge,name_de,name_fr,name_en,limit_count,ist_notfall,ist_phase) VALUES (${[id, key, r, de, fr, en, lim, nf, ph].map(q).join(',')});`);
  out.push(`UPDATE groups SET reihenfolge=${r}, limit_count=${lim}, ist_phase=${ph} WHERE id=${q(id)};`);
}
for (const [key, de, fr, en, unit, art] of variables) {
  out.push(`INSERT OR IGNORE INTO variables (key,label_de,label_fr,label_en,einheit,nur_art) VALUES (${[key, de, fr, en, unit, art].map(q).join(',')});`);
}
for (const t of balloonTypes) {
  out.push(`INSERT OR IGNORE INTO balloon_types (id,name,art,hersteller,aktiv,created_at) VALUES (${[t.id, t.name, t.art, t.hersteller].map(q).join(',')},1,${T0});`);
  for (const [k, v] of Object.entries(t.values)) out.push(`INSERT OR IGNORE INTO balloon_type_values (balloon_type_id,variable_key,wert) VALUES (${q(t.id)},${q(k)},${q(v)});`);
}
let warn = [];
const docRows = [];
const perGroup = {};
checklists.forEach((c, i) => {
  const order = (perGroup[c.group] = (perGroup[c.group] || 0) + 1);
  const content = textToContent(c.text);
  if (!content.title) throw new Error('Titel fehlt: ' + c.slug);
  const n = countItems(content);
  if (n > 12) warn.push(`${c.slug}: ${n} Punkte`);
  const cid = 'cl-' + c.slug, vid = 'v-' + c.slug + '-1', t = T0 + i * 1000;
  out.push(`INSERT OR IGNORE INTO checklists (id,group_id,art,ist_notfall,reihenfolge,current_version_id,created_by,created_at) VALUES (${q(cid)},${q(c.group)},${q(c.art)},${c.group === 'g7' ? 1 : 0},${order},NULL,NULL,${t});`);
  out.push(`INSERT OR IGNORE INTO checklist_versions (id,checklist_id,version,status,inhalt_de,status_fr,status_en,item_count,change_note,created_by,created_at) VALUES (${q(vid)},${q(cid)},1,'entwurf',${q(JSON.stringify(content))},'fehlt','fehlt',${n},${q('Erstfassung aus Vorlage: ' + c.quelle)},NULL,${t});`);
  c.docs.forEach((key, j) => {
    const f = files[key]; if (!f) throw new Error('Dokument unbekannt: ' + key);
    const path = join(here, 'files', f.file);
    const size = existsSync(path) ? statSync(path).size : 0;
    if (!size) warn.push(`Datei fehlt: ${f.file}`);
    const id = 'doc-' + c.slug + '-' + key;
    docRows.push({ id, cid, f, j, size, t: t + j });
  });
});
for (const d of docRows) {
  out.push(`INSERT OR IGNORE INTO documents (id,checklist_id,titel,dateiname,r2_key,mime,groesse,reihenfolge,created_by,created_at) VALUES (${q(d.id)},${q(d.cid)},${q(d.f.titel)},${q(d.f.file)},${q('documents/seed/' + d.f.file)},${q(d.f.mime)},${d.size},${d.j + 1},NULL,${d.t});`);
}
out.push('PRAGMA foreign_keys = ON;');
writeFileSync(join(here, 'sba-seed.sql'), out.join('\n') + '\n');
// Dateiliste für den Workflow (R2-Upload)
writeFileSync(join(here, 'files.txt'), [...new Set(Object.values(files).map((f) => f.file))].join('\n') + '\n');
console.log(`sba-seed.sql: ${checklists.length} Checklisten, ${docRows.length} Dokumentverknüpfungen, ${variables.length} Variablen, ${balloonTypes.length} Muster`);
if (warn.length) console.log('Hinweise:\n  ' + warn.join('\n  '));
