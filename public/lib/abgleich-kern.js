// Abgleich Handy ↔ Laptop – der Teil, der auf dem Laptop läuft (und in der Vorschau im Browser nachgebaut wird).
//
// Prinzip: Jedes Gerät hat eine eigene Kopie der Daten und arbeitet auch ohne Verbindung weiter. Sobald der Laptop
// erreichbar ist, schickt das Gerät seine Änderungen und holt alles, was sich seit dem letzten Abgleich geändert hat.
// Der Laptop ist die Hauptablage: Er zählt jede Änderung fortlaufend (seq), entscheidet bei gleichzeitigen Änderungen,
// vergibt Rechnungs-, Kunden- und Baustellennummern und schreibt Rechnungen fest. Abschriften von Sprachaufnahmen
// schreibt nur der Laptop. Festgeschriebene Rechnungen kann kein Gerät
// mehr verändern – nur Zahlungen und Versand dürfen noch nachgetragen werden.
//
// Der Speicher wird übergeben (SQLite auf dem Laptop, Arbeitsspeicher in der Vorschau) und muss bieten:
//   (jeder Datensatz trägt seine Sammlung in „_typ" – „typ" gehört dem Inhalt, z. B. Kundentyp oder Rechnungsart)
//   holen(typ, id) · schreiben(typ, id, datensatz) → seq · seit(seq) · alle(typ) · zaehler(name) · zaehlerSetzen(name, wert)
//   protokoll({ aktion, typ, id, geraet, daten }) · transaktion(fn)
import { festschreiben, zaehlerName, rechnungsnummer, NACH_FESTSCHREIBEN_AENDERBAR, STATUS_NACH_FESTSCHREIBEN } from './festschreiben.js';
import { heuteIso } from './datum.js';

export const TYPEN = ['einstellungen', 'kunden', 'leistungen', 'kategorien', 'baustellen', 'notizen', 'rechnungen'];
const NUR_SERVER = ['nummer', 'fest', 'festgeschriebenAm', 'pdf', 'datum', 'faellig', 'freigabeFehler', 'storniertDurch'];
export const ABSCHRIFT_FELDER = ['abschrift', 'abschriftStatus', 'abschriftZeit'];
const MAX_GROESSE = { einstellungen: 3_000_000, default: 400_000 };
const gleich = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Änderungen eines Geräts übernehmen.
 * @param {Array} aenderungen  [{ typ, id, daten, basis, geaendert, geloescht }]
 *   basis = die seq, die das Gerät von diesem Datensatz kannte (0 = neu angelegt)
 * @returns {Array} je Änderung { typ, id, ok, grund? }
 */
export function aenderungenUebernehmen(speicher, geraet, aenderungen, { jetzt = new Date().toISOString() } = {}) {
  const ergebnisse = [];
  for (const a of Array.isArray(aenderungen) ? aenderungen : []) {
    const typ = a && a.typ, id = a && String(a.id || '');
    if (!TYPEN.includes(typ) || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) { ergebnisse.push({ typ, id, ok: false, grund: 'ungueltig' }); continue; }
    const groesse = JSON.stringify(a.daten || {}).length;
    if (groesse > (MAX_GROESSE[typ] || MAX_GROESSE.default)) { ergebnisse.push({ typ, id, ok: false, grund: 'zu-gross' }); continue; }
    ergebnisse.push(speicher.transaktion(() => eineAenderung(speicher, geraet, { ...a, typ, id }, jetzt)));
  }
  return ergebnisse;
}

function eineAenderung(speicher, geraet, a, jetzt) {
  const { typ, id } = a;
  const alt = speicher.holen(typ, id);
  const geaendert = typeof a.geaendert === 'string' ? a.geaendert.slice(0, 40) : jetzt;
  const daten = { ...(a.daten || {}) };
  for (const k of Object.keys(daten)) if (k.startsWith('_')) delete daten[k];

  // Festgeschriebene Rechnung: nur Zahlungen, Versand, Mahnungen und interne Notiz dürfen sich ändern.
  if (typ === 'rechnungen' && alt && alt.status && alt.status !== 'entwurf') {
    if (a.geloescht) return { typ, id, ok: false, grund: 'festgeschrieben', aktuell: alt };
    const neu = { ...alt };
    let geaendertFeld = false;
    for (const k of NACH_FESTSCHREIBEN_AENDERBAR) {
      if (!(k in daten) || gleich(daten[k], alt[k])) continue;
      if (k === 'status' && (!STATUS_NACH_FESTSCHREIBEN.has(daten.status) || !STATUS_NACH_FESTSCHREIBEN.has(alt.status))) continue;
      neu[k] = daten[k]; geaendertFeld = true;
    }
    if (!geaendertFeld) return { typ, id, ok: true, grund: 'unveraendert', aktuell: alt };
    neu._geaendert = geaendert; neu._geraet = geraet;
    speicher.schreiben(typ, id, neu);
    speicher.protokoll({ aktion: 'zahlung-versand', typ, id, geraet, daten: pick(neu, NACH_FESTSCHREIBEN_AENDERBAR) });
    return { typ, id, ok: true, aktuell: speicher.holen(typ, id) };
  }

  // Gleichzeitig auf zwei Geräten geändert: die neuere Änderung gewinnt, die ältere bleibt im Protokoll erhalten.
  if (alt && (alt._seq || 0) > (Number(a.basis) || 0) && String(alt._geaendert || '') > geaendert) {
    speicher.protokoll({ aktion: 'konflikt-verworfen', typ, id, geraet, daten });
    return { typ, id, ok: false, grund: 'konflikt', aktuell: alt };
  }

  if (typ === 'rechnungen') {
    for (const k of NUR_SERVER) delete daten[k];
    daten.status = 'entwurf';
    if (daten.typ !== 'storno') daten.typ = 'rechnung';
  }
  if (typ === 'kunden' && !a.geloescht) daten.nummer = alt?.nummer || ('K-' + String(naechster(speicher, 'kunde')).padStart(4, '0'));
  if (typ === 'baustellen' && !a.geloescht) daten.nummer = alt?.nummer || ('B-' + String(naechster(speicher, 'baustelle')).padStart(4, '0'));
  if (typ === 'notizen') {
    // Die Abschrift einer Sprachaufnahme gehört dem Laptop – ein Gerät kann sie nicht überschreiben.
    // Neue Aufnahme an der Notiz → alte Abschrift gilt nicht mehr (die neue folgt, sobald der Laptop sie abgetippt hat).
    const gleicheAufnahme = !!alt && alt.audio === daten.audio;
    for (const k of ABSCHRIFT_FELDER) daten[k] = gleicheAufnahme ? alt[k] ?? null : null;
    if (daten.audio && !daten.abschriftStatus) daten.abschriftStatus = 'wartet';
    if (!daten.audio && daten.abschriftStatus === 'wartet') daten.abschriftStatus = null;
    if (alt?.status === 'abgerechnet') { daten.status = 'abgerechnet'; daten.rechnungId = alt.rechnungId; }
  }
  if (typ === 'einstellungen' && id === 'firma' && daten.nummernFormat && alt?.nummernFormat !== daten.nummernFormat) {
    speicher.protokoll({ aktion: 'nummernformat', typ, id, geraet, daten: { alt: alt?.nummernFormat, neu: daten.nummernFormat } });
  }

  const datensatz = { ...daten, id, _typ: typ, _geaendert: geaendert, _geraet: geraet, _geloescht: !!a.geloescht };
  speicher.schreiben(typ, id, datensatz);
  speicher.protokoll({ aktion: a.geloescht ? 'geloescht' : alt ? 'geaendert' : 'angelegt', typ, id, geraet, daten: datensatz });
  return { typ, id, ok: true };
}

const pick = (o, felder) => Object.fromEntries(felder.filter(k => k in o).map(k => [k, o[k]]));
function naechster(speicher, name) { const n = speicher.zaehler(name) + 1; speicher.zaehlerSetzen(name, n); return n; }

/**
 * Vom Gerät angeforderte Freigaben ausführen: verbindlich prüfen, Nummer vergeben, festschreiben, PDF ablegen.
 * Läuft immer nur einmal gleichzeitig (der Aufrufer reiht die Aufrufe hintereinander).
 * @param {Function} [pdfErzeugen]  async (rechnung) → { datei, sha256 } – nur auf dem Laptop
 * @returns {Promise<Array>} [{ id, ok, nummer?, fehler? }]
 */
export async function freigabenAusfuehren(speicher, { geraet = 'laptop', heute = heuteIso(), zeitpunkt = new Date().toISOString(), pdfErzeugen = null } = {}) {
  const ergebnisse = [];
  const offen = speicher.alle('rechnungen').filter(r => !r._geloescht && r.status === 'entwurf' && r.freigabe)
    .sort((a, b) => String(a.freigabe.angefordert || '').localeCompare(String(b.freigabe.angefordert || '')));
  for (const entwurf of offen) {
    const firma = speicher.holen('einstellungen', 'firma') || {};
    const kunde = entwurf.kundeId ? speicher.holen('kunden', entwurf.kundeId) : null;
    const original = entwurf.typ === 'storno' && entwurf.stornoVon ? speicher.holen('rechnungen', entwurf.stornoVon) : null;
    const ablehnen = fehler => {
      speicher.transaktion(() => {
        speicher.schreiben('rechnungen', entwurf.id, { ...entwurf, freigabe: null, freigabeFehler: fehler, _geaendert: zeitpunkt, _geraet: geraet });
        speicher.protokoll({ aktion: 'freigabe-abgelehnt', typ: 'rechnungen', id: entwurf.id, geraet, daten: { fehler } });
      });
      ergebnisse.push({ id: entwurf.id, ok: false, fehler });
    };
    if (entwurf.typ === 'storno' && (!original || original.status === 'entwurf' || original.status === 'storniert' || original.status === 'storno')) {
      ablehnen(['Die ursprüngliche Rechnung ist nicht (mehr) stornierbar.']); continue;
    }
    if (kunde && kunde._geloescht) { ablehnen(['Der Kunde wurde gelöscht.']); continue; }
    const jahr = Number(heute.slice(0, 4));
    const zaehler = zaehlerName(firma.nummernFormat, jahr);
    const laufend = speicher.zaehler(zaehler) + 1;
    const nummer = rechnungsnummer(firma.nummernFormat, jahr, laufend);
    const vergeben = speicher.alle('rechnungen').some(r => r.nummer === nummer && r.id !== entwurf.id);
    if (vergeben) { ablehnen([`Die Rechnungsnummer ${nummer} ist schon vergeben – bitte Nummernkreis in den Einstellungen prüfen.`]); continue; }
    const e = festschreiben({ entwurf, firma, kunde, nummer, datum: heute, original, zeitpunkt, kategorien: speicher.alle('kategorien') });
    if (!e.ok) { ablehnen(e.pruefung.fehler.map(f => f.text)); continue; }
    let pdf = null;
    if (pdfErzeugen) {
      try { pdf = await pdfErzeugen(e.rechnung, firma); }
      catch (err) { ablehnen(['Das PDF konnte nicht erstellt werden: ' + (err && err.message || err)]); continue; }
    }
    speicher.transaktion(() => {
      if (speicher.zaehler(zaehler) !== laufend - 1) throw new Error('Nummernkreis wurde gleichzeitig verändert');
      speicher.zaehlerSetzen(zaehler, laufend);
      const fest = { ...e.rechnung, pdf, _geaendert: zeitpunkt, _geraet: geraet, _geloescht: false };
      speicher.schreiben('rechnungen', entwurf.id, fest);
      speicher.protokoll({ aktion: 'festgeschrieben', typ: 'rechnungen', id: entwurf.id, geraet, daten: { nummer, sha256: pdf?.sha256 || null, fest: fest.fest } });
      if (original) {
        speicher.schreiben('rechnungen', original.id, { ...original, status: 'storniert', storniertDurch: entwurf.id, _geaendert: zeitpunkt, _geraet: geraet });
        speicher.protokoll({ aktion: 'storniert', typ: 'rechnungen', id: original.id, geraet, daten: { durch: nummer } });
      }
      // Notizen, die in diese Rechnung eingeflossen sind, gelten als abgerechnet
      for (const nid of entwurf.notizen || []) {
        const n = speicher.holen('notizen', nid);
        if (n && !n._geloescht && n.status !== 'abgerechnet') speicher.schreiben('notizen', nid, { ...n, status: 'abgerechnet', rechnungId: entwurf.id, _geaendert: zeitpunkt, _geraet: geraet });
      }
    });
    ergebnisse.push({ id: entwurf.id, ok: true, nummer });
  }
  return ergebnisse;
}

/**
 * Abschrift einer Sprachaufnahme an alle Notizen hängen, die diese Aufnahme tragen (nur der Laptop ruft das auf).
 * @param {string} dateiId  Kennung der Aufnahme
 * @param {{ text?: string, status: 'fertig'|'keine-erkennung'|'fehler' }} ergebnis
 * @returns {number} Anzahl geänderter Notizen
 */
export function abschriftSetzen(speicher, dateiId, { text = '', status }, { geraet = 'laptop', zeitpunkt = new Date().toISOString() } = {}) {
  let n = 0;
  for (const notiz of speicher.alle('notizen')) {
    if (notiz._geloescht || notiz.audio !== dateiId) continue;
    if (notiz.abschriftStatus === status && (notiz.abschrift || '') === (text || '')) continue;
    speicher.transaktion(() => {
      // _geaendert bleibt: die Abschrift soll keine Textänderung eines Geräts „überholen" (die würde sonst als älter verworfen)
      speicher.schreiben('notizen', notiz.id, { ...notiz, abschrift: text || null, abschriftStatus: status, abschriftZeit: zeitpunkt });
      speicher.protokoll({ aktion: 'abschrift', typ: 'notizen', id: notiz.id, geraet, daten: { status, laenge: (text || '').length } });
    });
    n++;
  }
  return n;
}

/** Alles seit einer seq (für den Abgleich des Geräts). */
export function seit(speicher, seq) { return speicher.seit(Number(seq) || 0); }
