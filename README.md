# SBA Checklisten

Ballon-Checklisten je Flugzustand als installierbare Web-App (PWA) mit Protokoll je Nutzer und
Verwaltung am Desktop – für die Swiss Ballooning Academy.

- Piloten-App: https://checklists.wicki.aero (installierbar auf Android, iPhone und iPad)
- Verwaltung: https://checklists.wicki.aero/admin.html (Rolle Admin oder Supermaster)
- Einrichtung: `SETUP.md` (GitHub Pages, Cloudflare Worker über den Workflow «Setup worker»)
- Pflichtenheft: `docs/Pflichtenheft_Checklisten_v0.2.docx` · Gliederungsvorschlag Workshop: `docs/Checklisten-Gliederung_Workshop_v0.2.docx` · Änderungen: `CHANGELOG.md`
- Ausgangsinhalt (Checklisten-Entwürfe, Variablen, Muster, Dokumente): `worker/seed/` – Workflow «Seed SBA content»
- Worker (API, D1, R2): `worker/` · Schema `worker/schema.sql` · API-Übersicht am Anfang von `worker/src/index.js`

## Aufbau

| Teil | Dateien | Zweck |
|---|---|---|
| Piloten-App | `index.html`, `js/app.js`, `js/i18n.js`, `js/store.js`, `js/api.js`, `css/app.css`, `sw.js`, `manifest.webmanifest`, `icons/` | Anmeldung mit Kürzel, Übersicht «Nächster Schritt», Checklisten abhaken, Notfall, Protokoll, Mehr (Ballone, Sprache, Darstellung). Läuft ohne Netz aus dem lokalen Speicher. |
| Verwaltung | `admin.html`, `js/admin.js`, `js/import.js`, `css/admin.css`, `js/vendor/` | Checklisten (Editor, Versionen, Freigabe, Übersetzungen, Druck/PDF), Import aus Word/Excel/Text, Ballonmuster und Variablen, Auswertung mit Rangliste, Nutzer, Einstellungen und Zugänge. |
| Worker | `worker/src/index.js`, `worker/schema.sql`, `worker/migrations/`, `worker/wrangler.toml` | API mit Gerätetoken, D1-Datenbank, R2 für Importoriginale und vertiefende Dokumente (signierte Links), Übersetzung über die Claude-API (Schlüssel verschlüsselt in der DB). |

Version: eine Stelle, `js/version.js` (dazu `APP_VERSION` in `worker/wrangler.toml` und ein Eintrag in `CHANGELOG.md`).

## Rollen

- **Pilot**: eigene Checklisten, eigenes Protokoll.
- **Admin**: alles in der Verwaltung – ausser Protokolle einzelner Nutzer.
- **Supermaster**: zusätzlich Protokolle einzelner Nutzer einsehen und herunterladen, Supermaster-Rolle vergeben. Der erste angelegte Nutzer wird automatisch Supermaster.

## Lokal entwickeln

```
cd worker && npm ci
npx wrangler d1 execute checklists --local --yes --file=schema.sql
npx wrangler dev --local --port 8787 --var ENC_KEY:<32+ Zeichen> --var SESSION_SECRET:<32+ Zeichen>
```
Dann `js/config.js` vorübergehend auf `http://127.0.0.1:8787` zeigen lassen und die Seite mit einem
einfachen Webserver auf Port 8080 ausliefern (`python3 -m http.server 8080`).

Lizenz: siehe `LICENSE` (alle Rechte vorbehalten).
