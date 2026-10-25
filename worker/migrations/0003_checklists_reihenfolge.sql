-- v0.2.0: Reihenfolge der Checklisten innerhalb einer Gruppe (Admin kann sie ordnen; «Nächster Schritt» folgt ihr).
ALTER TABLE checklists ADD COLUMN reihenfolge INTEGER NOT NULL DEFAULT 0;
