// Datenbank auf dem Laptop: eine SQLite-Datei (in Node eingebaut, keine Zusatzsoftware nötig).
//   datensaetze  – Kunden, Leistungen, Kategorien, Baustellen, Notizen, Rechnungen, Einstellungen (JSON) mit fortlaufender
//                  Änderungsnummer (seq)
//   zaehler      – Rechnungsnummern je Jahr, Kunden- und Baustellennummern, seq
//   dateien      – Fotos und Sprachaufnahmen der Geräte (Datei im Archiv-Ordner) samt Abschrift
//   protokoll    – jede Änderung, nur anhängen; jede Zeile enthält die Prüfsumme der vorigen (Kette) → nachträgliche
//                  Manipulation fällt auf (GoBD: Nachvollziehbarkeit und Unveränderbarkeit)
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

export const SCHEMA_VERSION = 1;

export function oeffneDatenbank(datei) {
  const db = new DatabaseSync(datei);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS datensaetze (typ TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL, daten TEXT NOT NULL, PRIMARY KEY (typ, id));
    CREATE INDEX IF NOT EXISTS datensaetze_seq ON datensaetze (seq);
    CREATE TABLE IF NOT EXISTS zaehler (name TEXT PRIMARY KEY, wert INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (name TEXT PRIMARY KEY, wert TEXT);
    CREATE TABLE IF NOT EXISTS dateien (id TEXT PRIMARY KEY, pfad TEXT NOT NULL, mime TEXT, groesse INTEGER, sha256 TEXT, zeit TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS protokoll (
      nr INTEGER PRIMARY KEY AUTOINCREMENT, zeit TEXT NOT NULL, geraet TEXT, aktion TEXT NOT NULL,
      typ TEXT, id TEXT, daten TEXT, kette TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS protokoll_keine_aenderung BEFORE UPDATE ON protokoll BEGIN SELECT RAISE(ABORT, 'Das Protokoll ist unveränderbar'); END;
    CREATE TRIGGER IF NOT EXISTS protokoll_kein_loeschen BEFORE DELETE ON protokoll BEGIN SELECT RAISE(ABORT, 'Das Protokoll ist unveränderbar'); END;
  `);
  db.prepare('INSERT OR IGNORE INTO meta (name, wert) VALUES (?, ?)').run('schema', String(SCHEMA_VERSION));
  db.prepare('INSERT OR IGNORE INTO meta (name, wert) VALUES (?, ?)').run('angelegt', new Date().toISOString());
  // Spalten für die Abschrift von Sprachaufnahmen (ältere Datenbanken bekommen sie nachgerüstet)
  const spalten = new Set(db.prepare('PRAGMA table_info(dateien)').all().map(z => z.name));
  for (const [name, typ] of [['abschrift', 'TEXT'], ['abschrift_status', 'TEXT'], ['abschrift_zeit', 'TEXT']]) {
    if (!spalten.has(name)) db.exec(`ALTER TABLE dateien ADD COLUMN ${name} ${typ}`);
  }

  const q = {
    holen: db.prepare('SELECT daten, seq FROM datensaetze WHERE typ = ? AND id = ?'),
    schreiben: db.prepare('INSERT INTO datensaetze (typ, id, seq, daten) VALUES (?, ?, ?, ?) ON CONFLICT (typ, id) DO UPDATE SET seq = excluded.seq, daten = excluded.daten'),
    seit: db.prepare('SELECT daten, seq FROM datensaetze WHERE seq > ? ORDER BY seq LIMIT ?'),
    alle: db.prepare('SELECT daten, seq FROM datensaetze WHERE typ = ?'),
    zaehler: db.prepare('SELECT wert FROM zaehler WHERE name = ?'),
    zaehlerSetzen: db.prepare('INSERT INTO zaehler (name, wert) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET wert = excluded.wert'),
    letzteKette: db.prepare('SELECT kette FROM protokoll ORDER BY nr DESC LIMIT 1'),
    protokoll: db.prepare('INSERT INTO protokoll (zeit, geraet, aktion, typ, id, daten, kette) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    protokollAlle: db.prepare('SELECT * FROM protokoll ORDER BY nr'),
    anzahl: db.prepare('SELECT typ, COUNT(*) AS n FROM datensaetze GROUP BY typ'),
    dateiMerken: db.prepare('INSERT INTO dateien (id, pfad, mime, groesse, sha256, zeit) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING'),
    dateiHolen: db.prepare('SELECT * FROM dateien WHERE id = ?'),
    abschriftSetzen: db.prepare('UPDATE dateien SET abschrift = ?, abschrift_status = ?, abschrift_zeit = ? WHERE id = ?'),
    aufnahmen: db.prepare("SELECT * FROM dateien WHERE mime LIKE 'audio/%' ORDER BY zeit")
  };
  const lesen = zeile => (zeile ? { ...JSON.parse(zeile.daten), _seq: Number(zeile.seq) } : null);
  let tiefe = 0;

  const speicher = {
    db,
    holen: (typ, id) => lesen(q.holen.get(typ, id)),
    alle: typ => q.alle.all(typ).map(lesen),
    seit: (seq, limit = 20000) => q.seit.all(Number(seq) || 0, limit).map(lesen),
    zaehler: name => Number(q.zaehler.get(name)?.wert || 0),
    zaehlerSetzen: (name, wert) => { q.zaehlerSetzen.run(name, Number(wert)); },
    hoechsteSeq: () => speicher.zaehler('seq'),
    schreiben(typ, id, datensatz) {
      const seq = speicher.zaehler('seq') + 1;
      speicher.zaehlerSetzen('seq', seq);
      const { _seq, ...ohne } = datensatz;
      q.schreiben.run(typ, id, seq, JSON.stringify({ ...ohne, _typ: typ, id }));
      return seq;
    },
    protokoll({ aktion, typ = null, id = null, geraet = null, daten = null }) {
      const zeit = new Date().toISOString();
      const json = daten == null ? null : JSON.stringify(daten);
      const vorher = q.letzteKette.get()?.kette || 'start';
      const kette = crypto.createHash('sha256').update([vorher, zeit, geraet, aktion, typ, id, json].join('|')).digest('hex');
      q.protokoll.run(zeit, geraet, aktion, typ, id, json, kette);
    },
    /** Prüft die Prüfsummen-Kette des Protokolls. */
    protokollPruefen() {
      let vorher = 'start', n = 0;
      for (const z of q.protokollAlle.iterate()) {
        const soll = crypto.createHash('sha256').update([vorher, z.zeit, z.geraet, z.aktion, z.typ, z.id, z.daten].join('|')).digest('hex');
        if (soll !== z.kette) return { ok: false, nr: Number(z.nr), eintraege: n };
        vorher = z.kette; n++;
      }
      return { ok: true, eintraege: n };
    },
    transaktion(fn) {
      if (tiefe > 0) return fn();
      tiefe++;
      db.exec('BEGIN IMMEDIATE');
      try { const r = fn(); db.exec('COMMIT'); return r; }
      catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
      finally { tiefe--; }
    },
    anzahl: () => Object.fromEntries(q.anzahl.all().map(z => [z.typ, Number(z.n)])),
    dateiMerken: ({ id, pfad, mime, groesse, sha256 }) => { q.dateiMerken.run(id, pfad, mime, groesse, sha256, new Date().toISOString()); },
    dateiHolen: id => q.dateiHolen.get(id) || null,
    abschriftMerken: (id, { text = null, status }) => { q.abschriftSetzen.run(text, status, new Date().toISOString(), id); },
    aufnahmen: () => q.aufnahmen.all(),
    /** Vollständige Kopie der Datenbank (auch während des Betriebs konsistent). */
    sichernNach(ziel) { db.exec(`VACUUM INTO '${String(ziel).replace(/'/g, "''")}'`); },
    schliessen: () => db.close()
  };
  return speicher;
}
