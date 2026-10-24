# Einrichtung — Frontend (GitHub Pages) und Worker (Cloudflare)

Dauer beim ersten Mal etwa 20 Minuten. Reihenfolge einhalten; jeder Schritt ist einzeln prüfbar.
Schlüssel und Kennwörter nie in Dateien des Repositories schreiben und nie im Chat weitergeben.

## 1 Frontend auf GitHub Pages

1. Repository `bwicki/checklists`: Settings → Pages → Source «Deploy from a branch», Branch `main`,
   Ordner `/ (root)`. Die Datei `CNAME` (`checklists.wicki.aero`) liegt bereits im Repository.
2. DNS für wicki.aero (Cloudflare): `CNAME checklists → bwicki.github.io`, Proxy **aus** (graue Wolke),
   bis GitHub das Zertifikat ausgestellt hat.
3. Settings → Pages → Custom domain `checklists.wicki.aero`, nach «DNS check successful»
   **Enforce HTTPS** aktivieren.
4. Prüfung: https://checklists.wicki.aero zeigt die Startseite «SBA Checklisten».

## 2 Cloudflare-Konto vorbereiten

1. Dashboard → rechts oben Account-ID kopieren (dieselbe wie bei ops).
2. API-Token: entweder das bestehende ops-Token aus dem Passwortmanager, oder neu: My Profile →
   API Tokens → Create Token → Vorlage «Edit Cloudflare Workers»; zusätzlich **D1 → Edit** und
   **Workers R2 Storage → Edit** ergänzen. Token kopieren (wird nur einmal gezeigt).
3. Im GitHub-Repository: Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SESSION_SECRET`, `ENC_KEY`
   (die letzten beiden je eine Zufallszeichenkette ≥ 32 Zeichen aus dem Passwortmanager, dort ablegen).

## 3 Worker einrichten: GitHub-Workflow «Setup worker»

1. GitHub → **Actions** → links «Setup worker» → rechts **Run workflow** → `api_base` auf `auto`
   lassen → grüner Knopf **Run workflow**.
2. Der Lauf dauert 1–2 Minuten. Er legt die D1-Datenbank `checklists` und den R2-Bucket
   `checklists-files` an, trägt die `database_id` in `worker/wrangler.toml` ein, spielt das Schema ein,
   deployt den Worker, setzt die Secrets, prüft `/api/health` und trägt die Adresse
   `https://checklists-api.<konto>.workers.dev` in `js/config.js` ein (Commit «Setup worker: …»).
3. Die Zusammenfassung des Laufs zeigt die Adresse. Prüfung: Adresse + `/api/health` im Browser
   öffnen → `"ok": true` und `"db": "ok (7 Gruppen)"`.

Bricht ein Schritt ab, steht die Ursache rot im Protokoll des Laufs (meist ein fehlendes Secret oder
ein Token ohne «D1 Edit»/«R2 Edit»). Der Workflow ist wiederholbar.

## 4 Claude-API-Schlüssel (für die Übersetzungen FR/EN)

1. https://platform.claude.com → Settings → **API keys** → Create key, Name «checklists».
2. Schlüssel sofort in den Passwortmanager kopieren (wird nur einmal gezeigt).
3. In der Verwaltung (https://checklists.wicki.aero/admin.html) unter **Einstellungen → Zugänge**
   eintragen; er wird mit `ENC_KEY` verschlüsselt in der Datenbank abgelegt und nie angezeigt.

## 5 Erster Start

1. Piloten-App öffnen (https://checklists.wicki.aero), Sprache wählen, eigenes Kürzel (≥ 5 Zeichen) und
   Namen eingeben. **Der erste angelegte Nutzer wird automatisch Supermaster.**
2. Verwaltung öffnen (`/admin.html`, gleiches Kürzel) → **Ballonmuster** anlegen (Werte je Variable),
   dann **Import** (Word/Excel/Text) oder «Neue Liste von Hand» → prüfen → **Speichern und freigeben**.
3. Unter **Nutzer** dem Admin die Rolle «Admin» geben, sobald er sich in der App angemeldet hat.
4. Testweise in der App einen Ballon erfassen (Mehr → Ballon hinzufügen) – die Listen der passenden
   Ballonart erscheinen.

## 6 Laufender Betrieb

* Änderungen unter `worker/` werden durch den Workflow «Deploy worker» automatisch deployt
  (inklusive Schema-Nachzug).
* Frontend-Änderungen sind nach dem Push in 1–2 Minuten auf checklists.wicki.aero sichtbar.
* Eigene API-Domain `api.checklists.wicki.aero` ist optional (siehe Zusammenfassung des Setup-Laufs).
