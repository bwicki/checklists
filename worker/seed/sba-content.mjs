/* SBA Checklisten — Ausgangsinhalt (Entwürfe) aus den Vorlagen der Fahrlehrer, Stand 25.10.2026.
 *
 * Quellen: Entwürfe V0 (Nachtfahrt, MEL, Kronleinen/Hüllenöffnung/Quick-Release, Betriebslimiten, Passagiereinweisung,
 * Nebeldurchstoss, Fesselballonaufstiege Kubicek/Ultramagic, Landung, Notverfahren), Merkblatt Trockenheit (SBAV, V2 Juli 2026),
 * Beitrag 079 Aussenlandungen (April 2025), Faktenblatt SBAV/SBV «Tipps für Landwirte und Ballonfahrer», BG Verkehr
 * «Sicherheit und Gesundheit beim Umgang mit Heissluftballonen» (2. Auflage 2025).
 *
 * Alle Listen werden als ENTWURF angelegt (Version 1, Status entwurf) – Freigabe durch den Admin nach dem Workshop.
 * Listen ohne Vorlage sind Platzhalter mit wenigen plausiblen Punkten und dem Hinweis «wird im Workshop erarbeitet».
 * Textformat wie im Editor: # Titel · ## Abschnitt · eine Zeile je Punkt · > Hinweis · {{variable}}.
 */

export const groups = [
  // id, key, reihenfolge, DE, FR, EN, limit, ist_notfall, ist_phase
  ['g1', 'vorbereitung', 1, 'Vorbereitung', 'Préparation', 'Preparation', 6, 0, 1],
  ['g2', 'vor_dem_start', 2, 'Vor dem Start', 'Avant le décollage', 'Before take-off', 4, 0, 1],
  ['g3', 'start', 3, 'Start', 'Décollage', 'Take-off', 4, 0, 1],
  ['g4', 'fahrt', 4, 'Fahrt', 'Vol', 'Flight', 4, 0, 1],
  ['g5', 'landung', 5, 'Landung', 'Atterrissage', 'Landing', 4, 0, 1],
  ['g6', 'nach_der_fahrt', 6, 'Nach der Fahrt', 'Après le vol', 'After the flight', 4, 0, 1],
  ['g8', 'grundlagen', 7, 'Grundlagen', 'Bases', 'Reference', 0, 0, 0],
  ['g9', 'sonderverfahren', 8, 'Sonderverfahren', 'Procédures spéciales', 'Special procedures', 0, 0, 0],
  ['g7', 'notfall', 9, 'Notfall', 'Urgence', 'Emergency', 0, 1, 1]
];

export const variables = [
  // key, DE, FR, EN, Einheit, nur_art
  ['steigrate_max', 'Steigrate max.', 'Taux de montée max.', 'Max. climb rate', 'm/s', null],
  ['sinkrate_max', 'Sinkrate max.', 'Taux de descente max.', 'Max. descent rate', 'm/s', null],
  ['mtom', 'Startmasse max. (MTOM)', 'Masse max. au décollage (MTOM)', 'Max. take-off mass (MTOM)', 'kg', null],
  ['mlm', 'Landemasse min.', 'Masse min. à l’atterrissage', 'Min. landing mass', 'kg', 'heissluft'],
  ['pax_max', 'Passagiere max.', 'Passagers max.', 'Max. passengers', null, null],
  ['huellentemp_max', 'Hüllentemperatur max.', 'Température max. de l’enveloppe', 'Max. envelope temperature', '°C', 'heissluft'],
  ['bodenwind_max', 'Bodenwind max.', 'Vent au sol max.', 'Max. surface wind', 'kt', null],
  ['brennerdruck_min', 'Brennerdruck min.', 'Pression brûleur min.', 'Min. burner pressure', 'bar', 'heissluft'],
  ['brennerdruck_max', 'Brennerdruck max.', 'Pression brûleur max.', 'Max. burner pressure', 'bar', 'heissluft'],
  ['flaschen_min', 'Anzahl Propanbehälter min.', 'Nombre min. de bouteilles', 'Min. number of cylinders', null, 'heissluft'],
  ['parachute_max', 'Parachute max. offen', 'Parachute ouvert max.', 'Parachute open max.', 's', 'heissluft'],
  ['fessel_pax_max', 'Fesselbetrieb: Passagiere max.', 'Captif : passagers max.', 'Tethered: max. passengers', null, 'heissluft'],
  ['fessel_tom_max', 'Fesselbetrieb: Startmasse max.', 'Captif : masse max.', 'Tethered: max. take-off mass', 'kg', 'heissluft'],
  ['fessel_bruchlast_min', 'Fesselbetrieb: Bruchlast Seile min.', 'Captif : charge de rupture min.', 'Tethered: min. rope breaking load', 'kg', 'heissluft'],
  ['fessel_wind_max', 'Fesselbetrieb: Wind max.', 'Captif : vent max.', 'Tethered: max. wind', 'kt', 'heissluft'],
  ['fessel_hoehe_max', 'Fesselbetrieb: Höhe max.', 'Captif : hauteur max.', 'Tethered: max. height', 'm', 'heissluft']
];

export const balloonTypes = [
  { id: 'bt-kubicek-bb34z', name: 'Kubicek BB34Z', art: 'heissluft', hersteller: 'Kubicek', values: {
    steigrate_max: '4', sinkrate_max: '6.5', mtom: '1040', mlm: '455', pax_max: '3', huellentemp_max: '124', bodenwind_max: '14.6',
    brennerdruck_min: '3', brennerdruck_max: '12', flaschen_min: '2', parachute_max: '3',
    fessel_pax_max: '4', fessel_tom_max: '775', fessel_bruchlast_min: '4000', fessel_wind_max: '7.8', fessel_hoehe_max: '30' } },
  { id: 'bt-ultramagic-m90', name: 'Ultramagic M-90', art: 'heissluft', hersteller: 'Ultramagic', values: {
    mtom: '752', fessel_pax_max: '3', fessel_tom_max: '752', fessel_bruchlast_min: '4500', fessel_wind_max: '9', fessel_hoehe_max: '30' } }
];

// Dokumente: Schlüssel → Datei unter worker/seed/files/, Titel, MIME
export const files = {
  'merkblatt-trockenheit': { file: 'merkblatt-trockenheit-sbav-2026-07.pdf', titel: 'Merkblatt «Ballonfahren bei Trockenheit» (SBAV, Version 2, Juli 2026)', mime: 'application/pdf' },
  'aussenlandungen-079': { file: '079-aussenlandungen-2025-04.pdf', titel: 'Aussenlandungen: Braucht es eine Bewilligung des Grundeigentümers? (Beitrag 079, April 2025)', mime: 'application/pdf' },
  'faktenblatt-landwirte': { file: 'faktenblatt-landwirte-ballonfahrer-sbav-sbv.pdf', titel: 'Tipps für Landwirte und Ballonfahrer (Faktenblatt SBAV / SBV)', mime: 'application/pdf' },
  'bg-sicherheit': { file: 'bg-verkehr-sicherheit-heissluftballone-2025.pdf', titel: 'Sicherheit und Gesundheit beim Umgang mit Heissluftballonen (BG Verkehr, 2. Auflage 2025, 74 S.)', mime: 'application/pdf' },
  'fessel-kubicek': { file: 'fesselballonaufstiege-kubicek-bb34z-v0.docx', titel: 'Fesselballonaufstiege Kubicek BB34Z – Entwurf V0 (Tabellen, Skizzen)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'fessel-ultramagic': { file: 'fesselballonaufstiege-ultramagic-m90-v0.docx', titel: 'Fesselballonaufstiege Ultramagic M-90 – Entwurf V0 (Beladungstabelle)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'notverfahren': { file: 'notverfahren-v0.docx', titel: 'Notverfahren – Entwurf V0 (mit Abbildungen Körperhaltung)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'passagiereinweisung': { file: 'passagiereinweisung-v0.docx', titel: 'Passagiereinweisung – Entwurf V0 mit Anhang Sicherheitshinweise FR/EN (DGAC)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'nachtfahrt': { file: 'nachtfahrt-v0.docx', titel: 'Nachtfahrt (NVFR) – Entwurf V0 mit Rechtsgrundlagen', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'nebeldurchstoss': { file: 'nebeldurchstossverfahren-v0.docx', titel: 'Nebeldurchstossverfahren – Entwurf V0 mit Rechtsgrundlagen', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'betriebslimiten': { file: 'betriebslimiten-v0.docx', titel: 'Betriebslimiten – Entwurf V0 (Beispiel Kubicek 3400 m³)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'mel': { file: 'mindestausruestung-mel-v0.docx', titel: 'Mindestausrüstung (MEL) – Entwurf V0', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'crew': { file: 'crew-einweisung-v0.docx', titel: 'Kronleinen-Crew, Hüllenöffnung-Crew, Quick-Release – Entwurf V0', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'landung': { file: 'landung-v0.docx', titel: 'Landung – Entwurf V0', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
};

// Checklisten: slug, Gruppe, Art, Quelle, Dokumente, Listentext
export const checklists = [
  // ---------- Vorbereitung ----------
  { slug: 'flugplanung', group: 'g1', art: 'beide', quelle: 'Workshop', docs: [], text: `# Flugplanung
> Entwurf – wird im Workshop mit den Fahrlehrern erarbeitet.
Fahrtgebiet, Startplatz und mögliche Landegebiete festgelegt
Fahrtdauer und Alternativen geplant
Begleitfahrzeug, Crew und Kommunikation organisiert
Checklisten Meteo, Luftraum, Masse und Flugplanaufgabe durchgegangen` },

  { slug: 'meteo-entscheid', group: 'g1', art: 'beide', quelle: 'Workshop', docs: ['merkblatt-trockenheit'], text: `# Meteo und Entscheidungskriterien
> Entwurf – wird im Workshop erarbeitet; ComOPS und Privatbetrieb unterscheiden.
## Wetter
Wetterbriefing eingeholt (GAFOR, TAF/METAR, Windprofil, Gewitter, Inversion)
Bodenwind am Startplatz unter {{bodenwind_max}} erwartet
Wind in der Höhe und im Landegebiet beurteilt
Sicht und Wolkenuntergrenze über die ganze Fahrt VMC
## Entscheid
Trockenheit und Brandgefahr geprüft (eigene Checkliste)
Go/No-Go entschieden und Crew informiert` },

  { slug: 'luftraum', group: 'g1', art: 'beide', quelle: 'Workshop', docs: [], text: `# Luftraum
> Entwurf – wird im Workshop erarbeitet.
DABS und NOTAM für den Fahrttag geprüft
Luftraumstruktur entlang der Route geprüft (CTR, TMA, Gefahren- und Sperrgebiete)
Freigaben und Frequenzen notiert
Transponder- und Funkpflicht geklärt
Höhenmessereinstellgebiet und QNH bekannt` },

  { slug: 'flugplanaufgabe', group: 'g1', art: 'beide', quelle: 'Workshop', docs: [], text: `# Flugplanaufgabe
> Entwurf – wird im Workshop erarbeitet. Pflicht unter anderem bei Nachtfahrten (spätestens 3 Std. vorher) und bei Grenzübertritt.
Flugplan nötig? (Nacht, Grenzübertritt, Luftraumvorgabe)
Flugplan auf skybriefing.com eingereicht
Aktivierung und Schliessung des Flugplans geregelt` },

  { slug: 'masse-gasreserven', group: 'g1', art: 'heissluft', quelle: 'Workshop', docs: [], text: `# Masse und Gasreserven
> Entwurf – wird im Workshop erarbeitet (MTOW, MLW, Gasreserven, maximale Passagieranzahl). Werte aus dem Ballonmuster.
## Masse
Startmasse berechnet und unter {{mtom}}
Landemasse über {{mlm}}
Höchstens {{pax_max}} Passagiere (Versicherung, Korbfläche)
## Gas
Gasvorrat für Fahrtdauer plus Reserve berechnet
Mindestens {{flaschen_min}} Flaschen, alle voll
Bei Nachtfahrt 40 % Mehrverbrauch berücksichtigt` },

  { slug: 'trockenheit', group: 'g1', art: 'heissluft', quelle: 'Merkblatt Trockenheit', docs: ['merkblatt-trockenheit'], text: `# Trockenheit und Brandgefahr
> Nach Merkblatt «Ballonfahren bei Trockenheit» (SBAV, Version 2, Juli 2026). Ergänzt das Flight Manual, ersetzt es nicht.
## Vor der Fahrt
Waldbrandgefahr sowie kantonale und kommunale Verbote für Start- und Landegebiet geprüft
Startplatz unmittelbar vor dem Aufrüsten kontrolliert: Heu, Stroh, dürres Gras bei Brenner und Ventilator entfernt, Arbeitsbereich wenn möglich angefeuchtet
Flammtuch vor dem Aufheizen am Brennerrahmen eingehängt (sofern möglich)
Fahrzeuge nicht über trockenem Gras oder Stroh abgestellt (Katalysator bis 400 °C)
## Briefing
Alle wissen, wo Feuerlöscher, Löschdecke und Mobiltelefon sind; Schaumlöscher griffbereit
Kinder und nicht eingewiesene Personen halten beim Aufheizen Abstand; Rauchverbot für alle
## Start und Landung
Ventilator sofort nach der Kaltfüllung abgestellt; kein Heu oder Stroh in die Hülle geblasen
Bei Gasgeruch, Undichtigkeit, unkontrollierter Flamme oder Entstehungsbrand Aufheizen sofort abgebrochen
Landeplatz mit kurzem grünem Bewuchs, blankem Boden, Kies oder feuchtem Untergrund gewählt – Stoppelfelder und trockenes Heu gemieden
## Nach der Landung
Gaszufuhr und Pilotflammen so bald wie möglich geschlossen; Korb wenn möglich senkrecht stehen gelassen
Start- und Landeplatz sowie Standplatz des Begleitfahrzeugs auf Rauch, Glut, Brandgeruch und erwärmte Stellen kontrolliert
> Bei Brand: Feuerwehr 118 oder Notruf 112 mit genauem Standort.` },

  // ---------- Vor dem Start ----------
  { slug: 'aufruesten', group: 'g2', art: 'heissluft', quelle: 'Workshop', docs: ['bg-sicherheit', 'merkblatt-trockenheit'], text: `# Aufrüsten
> Entwurf – Standardverfahren nach AFM, wird im Workshop erarbeitet.
Startplatz, Windrichtung, Hindernisse und Zuschauerabstand beurteilt
Korb, Brenner, Flaschen und Hülle gemäss AFM geprüft und verbunden
Brennertest durchgeführt, Druck zwischen {{brennerdruck_min}} und {{brennerdruck_max}}
Crew eingewiesen (Checkliste Crew-Einweisung)
Kaltfüllung mit Ventilator, Aufrichten mit Brenner; Ventilator danach sofort aus` },

  { slug: 'crew-einweisung', group: 'g2', art: 'heissluft', quelle: 'Entwurf V0', docs: ['crew', 'bg-sicherheit'], text: `# Crew-Einweisung
> Gemäss AFM Kubicek. Entwurf V0 (Kronleinen-Crew, Hüllenöffnung-Crew, Quick-Release).
## Kronenseil
Handschuhe und festes Schuhwerk
Kronenseil am Ende halten, mit 20–40 kg Zug die Hülle stabilisieren; Seil nie um Hand oder Körper wickeln, im Notfall loslassen
Sobald der Ventilator aus ist und der Pilot heizt, langsam zum Korb gehen; stoppen, sobald die Hülle senkrecht steht
## Hüllenöffnung
Handschuhe; Kleidung aus Naturfasern oder nicht brennbar, Arme und Beine bedeckt; keine losen Teile, lange Haare zusammengebunden
Seile straff halten, nicht zwischen den Tragseilen stehen
Ventilator parallel zur Hülle; auf Signal des Piloten abschalten
Nach dem Aufrichten Korb halten und beschweren
Eine Person hält die Zuschauer auf sicherem Abstand
## Quick-Release
Zuschauer zwischen Ankerpunkt und Ballon fernhalten
Nur der Pilot betätigt das Quick-Release` },

  { slug: 'passagiereinweisung', group: 'g2', art: 'heissluft', quelle: 'Entwurf V0', docs: ['passagiereinweisung'], text: `# Passagiereinweisung
> Gemäss AFM Kubicek. Entwurf V0 – Sicherheitshinweise FR/EN (DGAC) als Dokument hinterlegt.
## Vor der Fahrt
Kleidung für Höhe und Kälte; Sonnenbrille, Kopfschutz, Sonnencreme, Getränke und Esswaren
## Vor dem Start
Rauchverbot im Umkreis von 30 m
Anweisungen des Piloten befolgen; sicherer Abstand zum Ventilator
Nichts aus dem Korb werfen; Hände und Arme bleiben im Korb
Nicht festhalten an Brennstoffschläuchen, Steuerleinen, Brennerhebeln oder Flaschenventilen
## Landung
Lose Gegenstände vor der Landung verstauen
Landeposition gezeigt: Füsse zusammen, ganze Sohle am Korbboden, Knie leicht gebeugt, Griffe im Korb halten, Kopf unter der oberen Polsterung
Nicht am Korbrand oder an den Brennerstützen festhalten
Auf Umkippen des Korbes gefasst sein; im Korb bleiben bis zur Erlaubnis des Piloten
> Kurz vor der Landung das Landeverfahren nochmals wiederholen.` },

  { slug: 'start-check', group: 'g2', art: 'heissluft', quelle: 'Workshop', docs: [], text: `# Start-Check
> Entwurf – Standardverfahren vor dem Abheben, wird im Workshop erarbeitet.
Passagiere eingewiesen und in Position
Instrumente ein, Funk auf Frequenz, Transponder gesetzt
Flaschenventile offen, Brenner und Pilotflammen geprüft
Crew bereit; Quick-Release nur durch den Piloten
Steigrate nach dem Start begrenzt auf {{steigrate_max}}` },

  // ---------- Start ----------
  { slug: 'start', group: 'g3', art: 'heissluft', quelle: 'Workshop', docs: [], text: `# Start
> Entwurf – Standardverfahren, wird im Workshop erarbeitet.
Luftraum über dem Startplatz frei, Hindernisse in Fahrtrichtung beurteilt
Abheben kontrolliert, Steigrate höchstens {{steigrate_max}}
Begleitfahrzeug informiert (Richtung, voraussichtliche Fahrtdauer)` },

  // ---------- Fahrt ----------
  { slug: 'fahrt', group: 'g4', art: 'heissluft', quelle: 'Workshop', docs: [], text: `# Fahrt
> Entwurf – Standardverfahren, wird im Workshop erarbeitet.
Höhe, Steig- und Sinkrate innerhalb der Betriebsgrenzen
Gasvorrat und Verbrauch regelmässig geprüft; Flaschenwechsel nach AFM
Luftraum und Frequenzen beachtet, Position gemeldet wo nötig
Landegebiet frühzeitig beurteilt (Wind, Hindernisse, Zufahrt, Brandgefahr)` },

  // ---------- Landung ----------
  { slug: 'landung', group: 'g5', art: 'heissluft', quelle: 'Entwurf V0', docs: ['landung'], text: `# Landung
> Gemäss AFM Kubicek. Entwurf V0. Grenzen für Ventil und Parachute: siehe Betriebsgrenzen.
## Vorbereitung
Passagiere informiert, Landeverfahren wiederholt, Landeposition eingenommen
Begleitmannschaft informiert
Pilot angeschnallt (Rückhaltesystem)
Windscherung beachtet
## Landephase
Auf 1 m sinken und parallel zum Boden fahren
Flaschenventile zu, letztes Mal heizen, Pilotflamme aus
Parachuteleine ziehen, bis der Ballon stillsteht
Schnellentleerung (falls installiert) erst bei höchstens 2 m Höhe (Boden bis Korbunterkante)
Passagiere vor dem Bodenkontakt informiert
## Nach der Landung
Alle bleiben im Korb, bis der Pilot das Aussteigen freigibt` },

  { slug: 'reissbahnlandung', group: 'g5', art: 'heissluft', quelle: 'Workshop', docs: [], text: `# Reissbahnlandung
> Entwurf – wird im Workshop erarbeitet (Standardlandung und Reissbahnlandung).
Reissbahnlandung entschieden (Wind, Platz); Begleitmannschaft informiert
Passagiere: Position für schnelle Landung, Griffe festhalten
Flaschenventile zu, Pilotflamme aus vor dem Bodenkontakt
Reissbahn beim Aufsetzen vollständig öffnen` },

  // ---------- Nach der Fahrt ----------
  { slug: 'abruesten', group: 'g6', art: 'heissluft', quelle: 'Workshop', docs: ['merkblatt-trockenheit'], text: `# Abrüsten
> Entwurf – Standardverfahren, wird im Workshop erarbeitet.
Hülle entleert; Flaschenventile zu, Schläuche entleert
Hülle, Korb und Brenner kontrolliert, Schäden notiert
Material verladen; Landeplatz auf Glut und Brandgeruch kontrolliert und sauber hinterlassen` },

  { slug: 'grundeigentuemer', group: 'g6', art: 'beide', quelle: 'Faktenblatt SBAV/SBV', docs: ['faktenblatt-landwirte'], text: `# Grundeigentümer und Landwirt
> Nach Faktenblatt SBAV/SBV «Tipps für Landwirte und Ballonfahrer». Zutrittsrecht zur Bergung besteht (ZGB Art. 700), keine pauschale Landegebühr; entstandene Schäden sind zu ersetzen. Der Pilot verantwortet das Verhalten des ganzen Teams.
Grundeigentümer oder Landwirt wenn möglich angesprochen, Bergung erklärt; Ruhezeiten respektiert
Begleitfahrzeug nur auf Wegen, nicht auf kultiviertem Land; Fahrverbote eingehalten
Zäune und Tore sofort wieder geschlossen; Abstand zu Tieren (Pferde, Mutterkühe, Herdenschutzhunde)
Schäden und Umtriebe sofort gemeldet, Kontaktdaten ausgetauscht, Entschädigung vereinbart
Abfälle mitgenommen, Verschmutzungen beseitigt; höflich geblieben, keine Konflikte` },

  { slug: 'nachbereitung', group: 'g6', art: 'beide', quelle: 'Workshop', docs: [], text: `# Nachbereitung
> Entwurf – wird im Workshop erarbeitet.
Flugplan geschlossen (falls aufgegeben)
Bordbuch und Flugbuch nachgeführt
Mängel gemeldet; Flaschen zum Füllen bereitgestellt` },

  // ---------- Grundlagen (Referenz) ----------
  { slug: 'borddokumente', group: 'g8', art: 'beide', quelle: 'Workshop', docs: [], text: `# Borddokumente
> Entwurf – wird im Workshop erarbeitet.
Lufttüchtigkeitszeugnis und Prüfbericht (ARC) gültig
Eintragungsschein und Lärmzeugnis an Bord
Versicherungsnachweis gültig und an Bord
Flughandbuch (AFM) und Bordbuch an Bord
Lizenz, Medical und Funkzeugnis des Piloten gültig
Bei Passagierfahrten: Beförderungsscheine ausgefüllt` },

  { slug: 'mel', group: 'g8', art: 'heissluft', quelle: 'Entwurf V0', docs: ['mel'], text: `# Mindestausrüstung (MEL)
> Gemäss AFM Kubicek. Entwurf V0.
Höhenmesser und Variometer
Temperaturmessgerät oder Schmelzsicherung
Zwei zusätzliche Zündquellen (zusätzlich zum Piezozünder)
Feuerlöscher und Feuerlöschdecke
Manövrierseil mindestens 25 m (82 ft)
Uhr mit Stunden, Minuten und Sekunden
Hilfsmittel zur Bestimmung der Driftrichtung (GPS, Kompass, Karte)
Erste-Hilfe-Kasten
Quick-Release
Schutzhandschuhe für Pilot und Besatzung
Messer bei Nachtfahrten
Sauerstoff: ab 10 000 ft nach 30 Min. für den Piloten, ab 13 000 ft für Pilot und Passagiere` },

  { slug: 'betriebsgrenzen', group: 'g8', art: 'heissluft', quelle: 'Entwurf V0', docs: ['betriebslimiten'], text: `# Betriebsgrenzen
> Werte gemäss AFM des Ballonmusters – sie werden aus dem gewählten Ballon eingesetzt. Entwurf V0 (Beispiel Kubicek 3400 m³).
## Grenzwerte
Bodenwind höchstens {{bodenwind_max}}
Brennerdruck zwischen {{brennerdruck_min}} und {{brennerdruck_max}}
Mindestens {{flaschen_min}} Propanbehälter
Hüllentemperatur höchstens {{huellentemp_max}}
Startmasse höchstens {{mtom}}, Landemasse mindestens {{mlm}}
Höchstens {{pax_max}} Passagiere (Versicherung, MTOM, Korbfläche)
Steiggeschwindigkeit höchstens {{steigrate_max}}, Sinkgeschwindigkeit höchstens {{sinkrate_max}}
## Hülle, Ventil und Parachute
Zulässige Beschädigung: unterhalb des ersten horizontalen Lastbands; oberhalb höchstens 5 mm in jeder Richtung
Parachute höchstens {{parachute_max}} geöffnet
Parachute geschlossen beim schnellen Sinken, beim Heizen, bei Hüllendeformation und beim schnellen Steigen
Ventil nicht beim Kaltabstieg und nicht nahe der maximalen Steigrate verwenden` },

  { slug: 'befoerderungsschein', group: 'g8', art: 'beide', quelle: 'Workshop', docs: [], text: `# Beförderungsschein und Schulung
> Entwurf – wird im Workshop erarbeitet (Passagierfahrten, ComOPS, Privatbetrieb).
Betriebsart geklärt: ComOPS (Lufttransportführer) oder Privatbetrieb
Beförderungsschein je Passagier ausgefüllt und unterschrieben
Bei Schulung: Ausbildungsauftrag und Berechtigung des Fahrlehrers geklärt
Versicherungsdeckung für die Betriebsart geprüft` },

  { slug: 'bewilligungen-landwirte', group: 'g8', art: 'beide', quelle: 'Beitrag 079 + Faktenblatt', docs: ['aussenlandungen-079', 'faktenblatt-landwirte'], text: `# Bewilligungen, Landwirte und Aussenlandungen
> Grundlagen: Aussenlandeverordnung (AuLaV, SR 748.132.3), ZGB Art. 700 und 926–929, Beitrag 079 «Aussenlandungen» (April 2025), Faktenblatt SBAV/SBV.
## Rechtslage
Ballone dürfen ausserhalb von Flugplätzen starten und landen; keine BAZL-Bewilligung nötig (Art. 3 und 21 AuLaV)
Für die Aussenlandung braucht es grundsätzlich kein Einverständnis des Grundeigentümers – das Privatrecht bleibt vorbehalten
Nur ein gerichtliches Verbot (Art. 258 ZPO, sichtbares Schild) verbietet Landungen generell; private Tafeln sind unwirksam
Auf Aufforderung des Grundeigentümers abfliegen oder den Ballon entfernen; keine Aussenlandung bei Unfallstellen
## Startplatz
Einwilligung des Landbesitzers für den Startplatz eingeholt (Image, gutes Einvernehmen)
Zufahrtsbeschränkungen und Fahrverbote eingehalten; nicht auf kultiviertes Land gefahren
## Landeplatz
Abgeerntete, gemähte, unbeweidete und nicht eingezäunte Flächen bevorzugt; Schutzgebiete gemieden
Tiere berücksichtigt: keine Tieffahrten und kein Lärm bei Fluchttieren, Vorsicht bei Mutterkuhherden und Herdenschutzhunden
Schäden und Umtriebe sofort gemeldet und entschädigt; Kontakt Schweizerischer Ballonverband bei Unstimmigkeiten` },

  { slug: 'pruefungsfahrt', group: 'g8', art: 'beide', quelle: 'Workshop (mit FE(B))', docs: [], text: `# Prüfungsfahrt FE(B)
> Entwurf – wird im Workshop mit mindestens einem FE(B) erarbeitet: geforderte Standards für die praktische Prüfung.
Prüfungsablauf und Beurteilungskriterien mit dem FE(B) besprochen
Fahrtvorbereitung vollständig dokumentiert (Meteo, Luftraum, NOTAM, Masse, Gas)
Standardverfahren nach AFM demonstriert (Aufrüsten, Start, Fahrt, Landung, Abrüsten)
Notverfahren erklärt und soweit möglich demonstriert
Entscheidungen begründet (Go/No-Go, Landeplatzwahl)` },

  // ---------- Sonderverfahren (Referenz) ----------
  { slug: 'fesselaufstieg', group: 'g9', art: 'heissluft', quelle: 'Entwürfe V0 Kubicek + Ultramagic', docs: ['fessel-kubicek', 'fessel-ultramagic'], text: `# Fesselaufstieg
> Gemäss AFM des Ballonmusters (Kubicek BB34Z, Ultramagic M-90 – Originalentwürfe mit Tabellen als Dokumente). Werte aus dem Ballonmuster.
## Berechtigung und Beladung
Pilot für Fesselaufstiege berechtigt (Ultramagic: mindestens 1 Aufstieg je 48 Monate)
Flaschenanzahl und Anordnung gemäss AFM (Kubicek: genau 2 × VA70 in der Ecke; Ultramagic: Worthington aussen)
Höchstens {{fessel_pax_max}} Passagiere (Korbfläche 0.25 m² je Person, Versicherung)
Startmasse höchstens {{fessel_tom_max}}
## Fesselung
3 Seile und Ankerpunkte mit Bruchlast mindestens {{fessel_bruchlast_min}}; Karabiner geprüft
Seile am Hüllenkarabiner befestigt; Seile, Karabiner und Befestigungen ohne Defekte
Ankerpunkte: Fahrzeuge mit mindestens 2000 kg oder gleichwertige Fixpunkte (Betonblöcke, Baumstämme) innerhalb der Absperrung
Kein Quick-Release im Fesselbetrieb
## Platz, Crew und Wetter
Platz abgesperrt, keine Unbeteiligten; Crew geschult (Ein- und Ausstieg hälftig, Beförderungsscheine am Eingang)
Wind höchstens {{fessel_wind_max}} (Böen eingerechnet); Anemometer vor Ort; Auf- und Abstieg mit Brennerstössen kontrollierbar
Höhe Korbboden über Grund höchstens {{fessel_hoehe_max}}; Seillänge erlaubt das Ablegen in jede Richtung
Messer im Korb (kurze Befestigungsseile im Notfall kappen)` },

  { slug: 'nebeldurchstoss', group: 'g9', art: 'beide', quelle: 'Entwurf V0', docs: ['nebeldurchstoss'], text: `# Nebeldurchstossverfahren
> Gemäss SERA, VABFP, VRV-L (Art. 24 Abs. 3: national im Luftraum G zugelassen, in der EU verboten) und VFR-RAC. Entwurf V0.
## Voraussetzungen
Pilot berechtigt (Ausbildungsnachweis vorhanden; keine Recency erforderlich)
Durchstoss vollständig im Luftraum G; über der Nebelschicht mindestens 100 m Luftraum G frei
Hinderniskarte geprüft: Freileitungen (openinframap.org) und Luftfahrthindernisse (map.geo.admin.ch, Thema Luftfahrt)
## Wetter
Über dem Nebel VMC
Nebeluntergrenze höchstens 200 m über dem Startplatz; Schicht höchstens 300 m dick
Landegebiet nebelfrei, keine Nebelbildung prognostiziert
## Vor dem Start
Höhenmesser auf QNH des Höhenmessereinstellgebiets (Zürich, Genf, Tessin)
Transponder Mode S auf 7000 (Mode C genügt nicht)
Blindübermittlung auf 130.800 MHz vorbereitet: vor dem Start und nach dem Durchstoss
Briefing Crew und Passagiere: Verfahren, Sinnestäuschungen, geplante Steigrate
Steigrate so geplant, dass 5 Min. nach dem Start mindestens 300 m über der Nebelobergrenze erreicht sind (max. 800 m in 5 Min. = 2.7 m/s)
> Funkbeispiel: «Traffic Region Zug, HB-BAA, Hot Air Balloon departure in fog from Steinhausen, departure in 1 minute.» Nach dem Durchstoss: «HB-BAA, fog departure completed, above Steinhausen, 4200 ft.»` },

  { slug: 'nachtfahrt', group: 'g9', art: 'beide', quelle: 'Entwurf V0', docs: ['nachtfahrt'], text: `# Nachtfahrt (NVFR)
> Gemäss RAC, VRV-L, SERA. Nacht: Ende der bürgerlichen Abenddämmerung bis Beginn der bürgerlichen Morgendämmerung (VFR RAC 4-4-1). Entwurf V0.
## Voraussetzungen
Pilot für Nachtfahrten berechtigt (Eintrag in der Lizenz)
Flugplan spätestens 3 Std. vor dem Aufstieg eingereicht (skybriefing.com, VFR RAC 4-5-5)
Tag- und Nachtgrenzen für den Fahrttag bestimmt
## Ausrüstung
Zusammenstosswarnlicht (ACL) eingeschaltet: rot oder weiss blinkend, 40–140 Blitze/min, 360° horizontal, ±60° vertikal (CS 31HB/GB.65, SERA 3215)
Handscheinwerfer und 2 Stirnlampen (Reichweite mindestens 60 m) an Bord
Messer an Bord (ACL-Kabel im Notfall kappen)
## Betrieb
Transponder Mode S auf 7000 (Mode C genügt nicht)
Funkverbindung mit dem Flugverkehrsdienst auch in Luftraum G und E, sofern verfügbar (VFR RAC 4-3-2)
40 % höherer Propanverbrauch berücksichtigt (keine Sonneneinstrahlung)` },

  // ---------- Notfall ----------
  { slug: 'nf-harte-landung', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Harte oder schnelle Landung
> Gemäss AFM Kubicek. Entwurf V0 – Körperhaltungen siehe Dokument «Notverfahren».
## Schnelle, nicht standardmässige Landung
Geeigneten Landeplatz wählen; allenfalls Hülle mit geeignetem Hindernis stoppen
Passagiere: Haltung für schnelle Landung, Griffe festhalten, Korb erst auf Anweisung verlassen
Pilot: Rückhaltesystem anziehen
Flaschen schliessen, Pilotflamme löschen, Schläuche entleeren
Geringstmögliche Sinkrate beim Bodenkontakt; Parachute vor dem Bodenkontakt vollständig ziehen
## Harte Landung
Korrekte Körperhaltung, Griffe festhalten, Rückhaltesystem
Flaschen schliessen, Pilotflamme löschen, Schläuche entleeren
Parachute vor dem Bodenkontakt vollständig ziehen
## Notaufstieg
Doppelbrenner aktivieren – Entscheid nicht mehr ändern` },

  { slug: 'nf-hindernis', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Hindernis und Freileitung
> Gemäss AFM Kubicek. Entwurf V0.
## Hohes Hindernis
Ballon im Ausgleich horizontal halten
Passagiere: Haltung einnehmen, festhalten, nicht aus dem Korb fallen; Pilot Rückhaltesystem
So bald wie möglich landen, Hilfe anfordern
## Tiefes Hindernis – Korb bleibt am Boden
So ventilieren, dass der Korb vor dem Hindernis den Boden erreicht
Flaschenventile schliessen; Parachute ziehen, damit der Ballon am Boden bleibt
Hilfe anfordern
## Elektro-Freileitung
Parachute mit roter Leine ziehen und sinken
Passagiere: Haltung für hohe Sinkrate, Gesicht nach unten, Augen schützen, keine Flaschen oder Metallteile berühren
Alle Flaschenventile schliessen, Schläuche entleeren; erneutes Abheben verhindern
Notruf: Strom abschalten lassen, Hilfe anfordern; Korb erst auf Anweisung verlassen` },

  { slug: 'nf-kollision-huelle', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Kollision und Hüllenschaden
> Gemäss AFM Kubicek. Entwurf V0.
## Kollision mit anderem Ballon
Anderen Piloten warnen; Kontakt Korb–Hülle vermeiden; Vertikalgeschwindigkeit so weit wie möglich reduzieren
Unterer Ballon: Sinken einleiten, Sinkrate mit Heizen oder Ballast konstant halten; Passagiere Haltung für hohe Sinkrate
Oberer Ballon: heizen und steigen, eigenen Korb von der fremden Hülle fernhalten – nicht heizen, wenn zu nahe an der fremden Hülle
Fremde Hülle oben stark beschädigt: Hülle am Korb befestigen, Sinkrate durch kräftiges Heizen kontrollieren, schnellstmöglich landen
## Beschädigung der eigenen Hülle
Harte Landung vermeiden: heizen, Hülle prall halten (bei geschlossener Füllöffnung durch die Seitenwand heizen)
Tief fahren, so bald wie praktikabel landen
Sinkrate durch Heizen, sonst durch Ballastabwurf konstant halten
Auf harte Landung vorbereiten` },

  { slug: 'nf-gelaende', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Landung in schwierigem Gelände
> Gemäss AFM Kubicek. Entwurf V0.
## Nebel
Mit höchstens 0.5 m/s sinken; Raum unter dem Korb kontrollieren, Hindernissen ausweichen
## Trockene Vegetation
Vor der Landung Pilotflamme löschen, Verdampferspirale kühlen, Flaschenventile schliessen
## Thermik, böiger Wind
Mitten in grosser, offener Fläche landen; schnell sinken, mit Doppelbrenner abfangen
Pilotflamme löschen; Parachute in Bodennähe vollständig ziehen
## Wald
Lichtung oder Pfad wählen; Begleitmannschaft informieren; Steuerleinen und Kronenseil kurz halten
Passagiere Rettungsposition; kontrolliert zwischen den Bäumen sinken; vorher Schläuche entleeren, Pilotflamme aus
Bleibt der Korb hängen: im Korb bleiben, Hilfe anfordern – am Boden die Hülle frei fallen lassen
## Bebautes Gebiet
Wie im Wald, zusätzlich Manövrierseil verwenden
## Wasser
Nichtschwimmer bestimmen, Hilfe anfordern; tief fahren, nahe am Ufer landen, Brennstoff entsprechend verbrauchen
Ohne Rettungsboot: Hülle so bald wie möglich vom Korb trennen, Korb als Floss nutzen, auf Hilfe warten` },

  { slug: 'nf-brenner', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Brennerstörung
> Gemäss AFM Kubicek. Entwurf V0.
## Pilotflamme der ersten Einheit ausgefallen
Mit der zweiten Einheit steigen; Pilotflamme mit der Hauptbrennerflamme zünden
Brennstoffstand, Schlauchanschlüsse und Druckregler prüfen
## Beide Pilotflammen ausgefallen
Schlauchsystem prüfen; mit Piezo oder Ersatzzünder zünden
Bleibt die Störung: Hauptbrenner oder Flüsterbrenner zünden, Flamme klein halten als Pilotflamme; baldmöglichst landen
## Hauptfahrventil schliesst nicht
Flüssigphase an der Flasche schliessen; Flaschenventil anstelle des Hauptfahrventils verwenden
## Hauptbrenner ausser Betrieb
Mit der zweiten Einheit heizen; Brennstoffstand, Schläuche und Flaschenventil prüfen; baldmöglichst landen
## Kein Brenner funktioniert
Brennstoffmenge, Flaschenventile und Schlauchanschlüsse prüfen; neue Flasche anschliessen (Rego: hängengebliebene Dichtung prüfen)
Bleibt die Störung: auf harte Landung vorbereiten` },

  { slug: 'nf-brand', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Brand und Brennstoffleck
> Gemäss AFM Kubicek. Entwurf V0.
## Brand in der Luft
Alle Flüssigphasen an den Flaschen schliessen; Löschdecke verwenden
Mit der Löschdecke die Hauptbrennerventile öffnen und den Brennstoff in den Schläuchen verbrauchen
Brand mit dem Feuerlöscher löschen; so bald wie möglich mit funktionsfähiger Einheit landen
## Brand am Boden
Alle Flüssigphasen schliessen; Löschdecke; Hauptbrennerventile öffnen, Brennstoff verbrauchen
Brand mit dem Feuerlöscher löschen; Ballon mit dem roten Seil entleeren
Lässt sich der Brand nicht löschen: Personen evakuieren
## Brennstoffleck
Brennstoffzufuhr zum betroffenen Schlauch schliessen; Schlauch über das Hauptbrennerventil leeren
Kein Propangeruch mehr: unbeschädigte Einheit verwenden; baldmöglichst landen` },

  { slug: 'nf-nacht', group: 'g7', art: 'heissluft', quelle: 'Notverfahren V0', docs: ['notverfahren'], text: `# Nachtfahrt – Störungen
> Gemäss AFM Kubicek. Entwurf V0.
## Anti-Collision-Light bleibt im Hindernis hängen
Durch Aufsteigen lösen, sonst Kabel mit dem Messer durchtrennen
## Positionslichter ausgefallen
Kabel, Sicherung und Stecker kontrollieren
Bleibt die Störung: Flugleitstelle informieren` }
];
