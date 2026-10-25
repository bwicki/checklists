# Änderungen

## 0.2.0 – 2026-10-25

**Inhalt (Seed)**
- 33 Checklisten als Entwürfe aus den Vorlagen der Fahrlehrer (Nachtfahrt, MEL, Crew-Einweisung, Betriebslimiten, Passagiereinweisung, Nebeldurchstoss, Fesselaufstieg, Landung, Notverfahren → 7 Notfall-Listen) und Grundlagen (Merkblatt Trockenheit, Beitrag 079 Aussenlandungen, Faktenblatt Landwirte); Platzhalter für die Workshop-Themen (Flugplanung, Meteo, Luftraum, Borddokumente, Masse und Gasreserven, Standardverfahren, Beförderungsschein, Prüfungsfahrt FE(B) u. a.).
- Zwei Referenzgruppen «Grundlagen» und «Sonderverfahren» (zählen nicht für «Nächster Schritt»); Vorbereitung mit Limit 6.
- 12 neue Variablen (Bodenwind, Brennerdruck, Flaschen, Landemasse, Passagiere, Parachute, Fesselbetrieb) und zwei Ballonmuster (Kubicek BB34Z, Ultramagic M-90) mit Werten aus den Entwürfen.
- 14 vertiefende Dokumente den Listen zugeordnet. Workflow «Seed SBA content» (Actions) spielt alles wiederholbar ein.
- Gliederungsvorschlag für den Workshop: `docs/Checklisten-Gliederung_Workshop_v0.2.docx`.

**Piloten-App**
- Dokumente je Checkliste: Buch-Symbol mit Zähler im Listenkopf → Liste der Unterlagen (öffnen im Browser, braucht Netz); Seite «Mehr → Dokumente» mit allen Unterlagen nach Liste. Buch-Symbol in der Übersicht bei Listen mit Dokumenten.
- Referenzgruppen in eigener Sektion «Grundlagen und Sonderverfahren» unter den Flugphasen.
- «Nächster Schritt» folgt jetzt der Reihenfolge der Listen (innerhalb der Gruppe und über Gruppen) und überspringt heute Erledigtes; die Abschlussseite schlägt die nächste Liste in dieser Reihenfolge vor.

**Verwaltung**
- Büroklammer je Checkliste: Dokumente hochladen (PDF, Word, Excel, Bilder, max. 25 MB), Titel ändern, entfernen; Spalte «Dok.».
- Pfeile ordnen Checklisten innerhalb einer Gruppe.
- Einstellungen → Gruppen: Namen DE/FR/EN, Typ Flugphase/Referenz, Limit, Reihenfolge, neue Gruppen anlegen, leere löschen.

**Worker**
- Tabelle `documents`, Spalten `groups.ist_phase` und `checklists.reihenfolge` (Migrationen unter `worker/migrations/`, vom Deploy-Workflow eingespielt).
- Endpunkte: `/api/admin/documents` (Liste, Upload, Titel, Löschen), `/api/doc/:id?exp&sig` (signierter Link, eine Woche gültig, im Bootstrap mitgeliefert), `/api/admin/groups` (anlegen, ändern, ordnen, löschen), `/api/admin/checklists/order`.

## 0.1.0 – 2026-10-24

Erste nutzbare Fassung.

**Piloten-App (PWA)**
- Anmeldung nur mit Kürzel (≥ 5 Zeichen, Buchstaben/Ziffern, Gross-/Kleinschreibung egal); neues Kürzel = neues Konto (Name wird abgefragt); Gerät bleibt angemeldet.
- Sprachwahl DE · FR · EN ganz am Anfang; Oberfläche und Listeninhalte in der gewählten Sprache (fehlende Übersetzung → deutsche Fassung mit Hinweis).
- Installationsseite nach der Anmeldung (iPhone/iPad, Android; «Jetzt installieren», wenn der Browser es anbietet).
- Übersicht mit «Nächster Schritt», Favoriten und zuletzt benutzt, alle Listen nach Flugzustand (Gruppen auf-/zuklappbar), Ballonwahl bei mehr als einem Ballon.
- Checkliste: ganzes Feld antippen, Fortschrittsbalken, Werte des Ballonmusters eingesetzt (`{{variable}}`), Abschliessen jederzeit (Haken grau bis alles abgehakt, Rückfrage bei unvollständig), Abbrechen (X), automatischer Abbruch nach 60 min ohne Haken.
- Abschlussseite mit Datum, Zeit (LT), Ballon, Ort (ICAO-Kurzformat), Listenversion, Pilot; Sprung zur nächsten Liste.
- Notfallbereich (rotes Symbol links unten auf allen Seiten) mit Notfall-Listen und Anruf 117/112.
- Protokoll (30 Tage · Saison · Alles) mit Druck/PDF; Einträge nicht veränderbar.
- Mehr: Ballone (Kennzeichen + Muster, aktiv wählen, entfernen), Sprache, Name, Kürzel ändern, Darstellung hell/dunkel/auto, Stand der Checklisten mit Prüf-Knopf (Aktualisierung sonst automatisch), Abmelden.
- Offline: Listen, Muster und Protokoll auf dem Gerät; Protokolleinträge werden gesammelt und bei Netz übertragen.
- «Was ist neu»-Fenster beim Öffnen, wenn seit dem letzten Besuch Listen neu oder geändert sind.

**Verwaltung (Desktop)**
- Checklisten: Tabelle mit Gruppe, Art, Sprachen (FR/EN mit Prüf-Symbol), Punkten, Version, Status, Nutzungen; Editor im Listentext-Format mit Vorschau wie auf dem Handy, Warnung ab 12 Punkten; Entwurf/Freigabe; Löschen; Druck/PDF ausgewählter Listen mit Sprachwahl.
- Import-Assistent: Word (.docx), Excel (.xlsx), Text; Struktur prüfen (Titel/Abschnitt/Punkt/Hinweis/Ignorieren); Original wird in R2 abgelegt.
- Übersetzungen FR/EN: automatisch über die Claude-API (Schlüssel in Einstellungen → Zugänge), prüfen und als geprüft speichern.
- Ballonmuster mit Werten je Variable; Variablenkatalog (DE/FR/EN, Einheit, nur Heissluft/Gas).
- Auswertung: Zeitraum, Nutzer, Liste, Art; Kennzahlen; Sitzungen; Nutzung je Liste; Rangliste je Nutzer mit Krone; CSV-Export.
- Nutzer: Rolle (Pilot/Admin; Supermaster nur durch Supermaster), sperren/entsperren; Protokoll einzelner Nutzer nur für Supermaster (Ansicht und Druck/PDF).
- Einstellungen: App-Name, Warnschwelle, Abbruchzeit, Aufbewahrung, Stichtag, Gruppenlimits; Claude-API-Schlüssel verschlüsselt.

**Worker**
- API mit Gerätetoken (SHA-256 in der DB), Login/Registrierung, Bootstrap, Favoriten, Ballone, Sitzungs-Abgleich (idempotent), Protokoll, Verwaltungs-Endpunkte, R2-Dateien, Übersetzung, Einstellungen (AES-GCM für den API-Schlüssel).

**Noch nicht enthalten (geplant)**
- Begrüssungsnachricht mit Effekt (Santa usw.) und Auszeichnungen (v0.3), Löschlauf nach Stichtag mit Admin-Bestätigung, PDF-Erzeugung ohne Druckdialog.
