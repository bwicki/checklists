-- v0.2.0: Referenzgruppen (Grundlagen, Sonderverfahren) zählen nicht als Flugphase.
-- Einzelne Anweisung je Datei: schlägt fehl, wenn die Spalte schon existiert – das ist beabsichtigt (Workflow ignoriert den Fehler).
ALTER TABLE groups ADD COLUMN ist_phase INTEGER NOT NULL DEFAULT 1;
