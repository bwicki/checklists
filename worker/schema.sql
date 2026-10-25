-- SBA Checklisten — Datenbankschema v0.1 (Cloudflare D1 / SQLite)
-- Wiederholbar: alle Anweisungen sind idempotent (IF NOT EXISTS / INSERT OR IGNORE).
-- Zeiten als Unix-Millisekunden (INTEGER). Texte in JSON-Spalten als UTF-8.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  kuerzel       TEXT NOT NULL UNIQUE,            -- kleingeschrieben, mind. 5 Zeichen
  name          TEXT,
  rolle         TEXT NOT NULL DEFAULT 'pilot',   -- pilot | admin | supermaster
  sprache       TEXT NOT NULL DEFAULT 'de',      -- de | fr | en
  status        TEXT NOT NULL DEFAULT 'aktiv',   -- aktiv | gesperrt
  created_at    INTEGER NOT NULL,
  last_active   INTEGER
);

CREATE TABLE IF NOT EXISTS devices (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  token_hash    TEXT NOT NULL,                   -- SHA-256 des Geräte-Tokens
  plattform     TEXT,                            -- ios | android | desktop | other
  installed     INTEGER NOT NULL DEFAULT 0,      -- 1 = als PWA installiert
  created_at    INTEGER NOT NULL,
  last_seen     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

CREATE TABLE IF NOT EXISTS balloon_types (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  art           TEXT NOT NULL,                   -- heissluft | gas
  hersteller    TEXT,
  aktiv         INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS variables (
  key           TEXT PRIMARY KEY,                -- z. B. steigrate_max
  label_de      TEXT NOT NULL,
  label_fr      TEXT,
  label_en      TEXT,
  einheit       TEXT,                            -- m/s, kg, °C …
  nur_art       TEXT                             -- NULL | heissluft | gas
);

CREATE TABLE IF NOT EXISTS balloon_type_values (
  balloon_type_id TEXT NOT NULL REFERENCES balloon_types(id),
  variable_key    TEXT NOT NULL REFERENCES variables(key),
  wert            TEXT NOT NULL,
  PRIMARY KEY (balloon_type_id, variable_key)
);

CREATE TABLE IF NOT EXISTS balloons (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  kennzeichen     TEXT NOT NULL,
  balloon_type_id TEXT NOT NULL REFERENCES balloon_types(id),
  aktiv           INTEGER NOT NULL DEFAULT 1,    -- 1 = zuletzt gewählter Ballon des Nutzers
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_balloons_user ON balloons(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id            TEXT PRIMARY KEY,
  key           TEXT NOT NULL UNIQUE,
  reihenfolge   INTEGER NOT NULL,
  name_de       TEXT NOT NULL,
  name_fr       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  limit_count   INTEGER NOT NULL DEFAULT 4,      -- 0 = kein Limit
  ist_notfall   INTEGER NOT NULL DEFAULT 0,
  ist_phase     INTEGER NOT NULL DEFAULT 1       -- 1 = Flugphase (zählt für «Nächster Schritt»), 0 = Referenzgruppe (Grundlagen, Sonderverfahren)
);

-- Vertiefende Dokumente je Checkliste (nicht Teil der Liste; Datei in R2)
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  checklist_id  TEXT NOT NULL REFERENCES checklists(id),
  titel         TEXT NOT NULL,
  dateiname     TEXT NOT NULL,
  r2_key        TEXT NOT NULL,
  mime          TEXT,
  groesse       INTEGER,
  reihenfolge   INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_documents_checklist ON documents(checklist_id);

CREATE TABLE IF NOT EXISTS checklists (
  id                 TEXT PRIMARY KEY,
  group_id           TEXT NOT NULL REFERENCES groups(id),
  art                TEXT NOT NULL DEFAULT 'beide', -- heissluft | gas | beide
  ist_notfall        INTEGER NOT NULL DEFAULT 0,
  current_version_id TEXT,                          -- zuletzt freigegebene Version
  created_by         TEXT REFERENCES users(id),
  created_at         INTEGER NOT NULL,
  reihenfolge        INTEGER NOT NULL DEFAULT 0,   -- Reihenfolge innerhalb der Gruppe
  deleted_at         INTEGER                        -- Soft-Delete; Protokolle bleiben gültig
);
CREATE INDEX IF NOT EXISTS idx_checklists_group ON checklists(group_id);

CREATE TABLE IF NOT EXISTS checklist_versions (
  id            TEXT PRIMARY KEY,
  checklist_id  TEXT NOT NULL REFERENCES checklists(id),
  version       INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'entwurf',  -- entwurf | freigegeben
  inhalt_de     TEXT NOT NULL,                    -- JSON: {title, sections:[{title, items:[{key,text,type,var}]}]}
  inhalt_fr     TEXT,
  inhalt_en     TEXT,
  status_fr     TEXT NOT NULL DEFAULT 'fehlt',    -- fehlt | automatisch | geprueft
  status_en     TEXT NOT NULL DEFAULT 'fehlt',
  item_count    INTEGER NOT NULL DEFAULT 0,
  original_file TEXT,                             -- R2-Schlüssel der Importdatei
  change_note   TEXT,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  released_by   TEXT REFERENCES users(id),
  released_at   INTEGER,
  UNIQUE (checklist_id, version)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id       TEXT NOT NULL REFERENCES users(id),
  checklist_id  TEXT NOT NULL REFERENCES checklists(id),
  source        TEXT NOT NULL DEFAULT 'nutzer',   -- nutzer | automatisch
  last_used     INTEGER,
  PRIMARY KEY (user_id, checklist_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                   TEXT PRIMARY KEY,          -- vom Gerät erzeugt (UUID), für Offline-Sync
  user_id              TEXT NOT NULL REFERENCES users(id),
  balloon_id           TEXT REFERENCES balloons(id),
  checklist_version_id TEXT NOT NULL REFERENCES checklist_versions(id),
  sprache              TEXT NOT NULL,
  start_device         INTEGER NOT NULL,
  start_server         INTEGER NOT NULL,
  end_device           INTEGER,
  end_server           INTEGER,
  status               TEXT NOT NULL DEFAULT 'offen', -- offen | abgeschlossen | unvollstaendig | abgebrochen | abgebrochen_auto
  pos_start_lat        REAL, pos_start_lon REAL, pos_start_acc REAL,
  pos_end_lat          REAL, pos_end_lon   REAL, pos_end_acc   REAL,
  items_total          INTEGER NOT NULL DEFAULT 0,
  items_done           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_start ON sessions(user_id, start_server);

CREATE TABLE IF NOT EXISTS session_items (
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  item_key      TEXT NOT NULL,
  done_at       INTEGER NOT NULL,
  PRIMARY KEY (session_id, item_key)
);

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,
  text_de       TEXT NOT NULL,
  text_fr       TEXT,
  text_en       TEXT,
  effekt        TEXT NOT NULL DEFAULT 'keiner',  -- keiner | santa | schnee | konfetti | feuerwerk | ballon | krone
  dauer         INTEGER NOT NULL DEFAULT 3,      -- Sekunden
  empfaenger    TEXT NOT NULL DEFAULT 'alle',    -- alle | heissluft | gas | nutzer
  user_id       TEXT REFERENCES users(id),       -- bei empfaenger = nutzer
  von           INTEGER,
  bis           INTEGER,
  aktiv         INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS message_seen (
  message_id    TEXT NOT NULL REFERENCES messages(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  seen_at       INTEGER NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS awards (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  titel         TEXT NOT NULL,
  saison        TEXT,
  verliehen_von TEXT REFERENCES users(id),
  verliehen_am  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key           TEXT PRIMARY KEY,                -- z. B. anthropic_api_key (verschlüsselt), app_name, loesch_stichtag
  value         TEXT,
  updated_by    TEXT,
  updated_at    INTEGER
);

-- Grunddaten: Gruppen (Obergliederung, vorläufig) und Variablenkatalog
INSERT OR IGNORE INTO groups (id, key, reihenfolge, name_de, name_fr, name_en, limit_count, ist_notfall) VALUES
  ('g1', 'vorbereitung',   1, 'Vorbereitung',    'Préparation',        'Preparation',      4, 0),
  ('g2', 'vor_dem_start',  2, 'Vor dem Start',   'Avant le décollage', 'Before take-off',  4, 0),
  ('g3', 'start',          3, 'Start',           'Décollage',          'Take-off',         4, 0),
  ('g4', 'fahrt',          4, 'Fahrt',           'Vol',                'Flight',           4, 0),
  ('g5', 'landung',        5, 'Landung',         'Atterrissage',       'Landing',          4, 0),
  ('g6', 'nach_der_fahrt', 6, 'Nach der Fahrt',  'Après le vol',       'After the flight', 4, 0),
  ('g7', 'notfall',        7, 'Notfall',         'Urgence',            'Emergency',        0, 1);

INSERT OR IGNORE INTO variables (key, label_de, label_fr, label_en, einheit, nur_art) VALUES
  ('steigrate_max',   'Steigrate max.',        'Taux de montée max.',      'Max. climb rate',     'm/s', NULL),
  ('sinkrate_max',    'Sinkrate max.',         'Taux de descente max.',    'Max. descent rate',   'm/s', NULL),
  ('mtom',            'Abflugmasse max.',      'Masse max. au décollage',  'MTOM',                'kg',  NULL),
  ('huellentemp_max', 'Hüllentemperatur max.', 'Température max. enveloppe','Max. envelope temp.', '°C',  'heissluft');

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('app_name', 'SBA Checklisten', 0),
  ('warn_items', '12', 0),
  ('abbruch_minuten', '60', 0),
  ('aufbewahrung_jahre', '3', 0),
  ('loesch_stichtag', '01-31', 0);
