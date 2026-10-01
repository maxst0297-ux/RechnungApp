// Festschreiben: aus einem geprüften Entwurf wird eine unveränderbare Rechnung (GoBD).
// Die Rechnungsnummer vergibt ausschließlich der Laptop-Server (bzw. in der Vorschau dessen Nachbau) –
// so kann eine Nummer nie doppelt vorkommen, auch wenn Handy und Laptop gleichzeitig arbeiten.
import { pruefeRechnung } from './pruefung.js';
import { einheitCode } from './berechnung.js';

export const STANDARD_NUMMERNFORMAT = '{JJJJ}-{NNNN}';

/** Zähler-Name je Nummernkreis: bei Formaten mit Jahr beginnt jedes Jahr neu. */
export function zaehlerName(format, jahr) {
  return /\{JJ(JJ)?\}/.test(format || STANDARD_NUMMERNFORMAT) ? `rechnung-${jahr}` : 'rechnung';
}

/** „{JJJJ}-{NNNN}", 2026, 42 → „2026-0042" */
export function rechnungsnummer(format, jahr, laufend) {
  const f = String(format || STANDARD_NUMMERNFORMAT);
  return f.replace('{JJJJ}', String(jahr)).replace('{JJ}', String(jahr).slice(-2))
    .replace(/\{(N+)\}/, (_, n) => String(laufend).padStart(n.length, '0'));
}
export function nummernformatGueltig(format) { return /\{N+\}/.test(String(format || '')) && String(format).length <= 40; }

const FIRMA_FELDER = ['name', 'zusatz', 'inhaber', 'strasse', 'plz', 'ort', 'land', 'telefon', 'mail', 'web', 'steuernummer', 'ustId',
  'iban', 'bic', 'bank', 'kontoinhaber', 'fusszeile', 'versteuerung'];
const KUNDE_FELDER = ['nummer', 'typ', 'anrede', 'name', 'zusatz', 'strasse', 'plz', 'ort', 'land', 'mail', 'ustId', 'leitwegId', 'bauleistender13b'];
const nehmen = (o, felder) => Object.fromEntries(felder.filter(k => o && o[k] !== undefined && o[k] !== '').map(k => [k, o[k]]));

/**
 * Baut die Druckfassung („fest") einer Rechnung – auch für Entwürfe (Vorschau), dann ohne Gewähr.
 * @returns {{ pruefung: object, fest: object }}
 */
export function festeFassung({ entwurf, firma = {}, kunde = null, nummer = '', datum, original = null, kategorien = [] }) {
  const pruefung = pruefeRechnung({ firma, kunde, rechnung: entwurf, datum, original });
  const s = pruefung.summen;
  // Optional nach Leistungs-Kategorien gliedern (Überschrift + Zwischensumme je Kategorie auf der Rechnung)
  const gliedern = !!entwurf.gliedern;
  const gruppeVon = p => { const k = kategorien.find(x => x.id === p.kategorieId && !x._geloescht); return k ? { name: k.name, rang: Number(k.position) || 0 } : { name: 'Weitere Leistungen', rang: 1e9 }; };
  const positionen = gliedern ? s.positionen.map((p, i) => ({ p, i, g: gruppeVon(p) })).sort((a, b) => a.g.rang - b.g.rang || a.g.name.localeCompare(b.g.name, 'de') || a.i - b.i)
    .map(x => ({ ...x.p, gruppe: x.g.name })) : s.positionen;
  const fest = {
    typ: entwurf.typ || 'rechnung', nummer, datum, faellig: pruefung.faellig, zahlungszielTage: pruefung.zahlungszielTage,
    leistungVon: entwurf.leistungVon || '', leistungBis: entwurf.leistungBis || entwurf.leistungVon || '',
    firma: nehmen(firma, FIRMA_FELDER), kunde: nehmen(kunde, KUNDE_FELDER),
    betreff: String(entwurf.betreff || '').trim(), einleitung: String(entwurf.einleitung ?? firma.einleitung ?? '').trim(),
    schluss: String(entwurf.schluss ?? firma.schluss ?? '').trim(),
    gliedern,
    positionen: positionen.map((p, i) => ({ pos: i + 1, bezeichnung: String(p.bezeichnung || '').trim(), beschreibung: String(p.beschreibung || '').trim(),
      menge: Number(p.menge) || 0, einheit: p.einheit || '', einheitCode: einheitCode(p.einheit), preisCent: Number(p.preisCent) || 0, satz: p.satz,
      ustKategorie: p.ustKategorie, art: p.art || 'sonstiges', nettoCent: p.nettoCent, ...(gliedern ? { gruppe: p.gruppe } : {}) })),
    summen: { gruppen: s.gruppen, nettoCent: s.nettoCent, steuerCent: s.steuerCent, bruttoCent: s.bruttoCent,
      arbeitNettoCent: s.arbeitNettoCent, arbeitSteuerCent: s.arbeitSteuerCent, arbeitBruttoCent: s.arbeitBruttoCent },
    hinweise: pruefung.hinweise.map(h => h.text), zahlung: pruefung.zahlung,
    reverseCharge: pruefung.reverseCharge, original: original ? { nummer: original.nummer, datum: original.datum } : null
  };
  return { pruefung, fest };
}

/**
 * Prüft den Entwurf verbindlich und baut die unveränderbare Fassung.
 * @returns {{ ok: boolean, pruefung: object, rechnung?: object }}
 */
export function festschreiben({ entwurf, firma, kunde, nummer, datum, original = null, kategorien = [], zeitpunkt = new Date().toISOString() }) {
  const { pruefung, fest } = festeFassung({ entwurf, firma, kunde, nummer, datum, original, kategorien });
  if (!pruefung.ok) return { ok: false, pruefung };
  const rechnung = {
    ...entwurf, nummer, datum, faellig: fest.faellig, fest,
    status: fest.typ === 'storno' ? 'storno' : 'offen',
    festgeschriebenAm: zeitpunkt, freigabe: null, freigabeFehler: null
  };
  return { ok: true, pruefung, rechnung };
}

/** Felder, die nach dem Festschreiben noch geändert werden dürfen (Zahlungen, Versand, interne Notiz). */
export const NACH_FESTSCHREIBEN_AENDERBAR = ['zahlungen', 'bezahltAm', 'status', 'versand', 'notizIntern', 'mahnungen'];
export const STATUS_NACH_FESTSCHREIBEN = new Set(['offen', 'bezahlt']);

/** Zahlungsstand: offen / überfällig / bezahlt / storniert – für Listen und Übersicht. */
export function zahlstatus(r, heute) {
  if (r.status === 'entwurf') return r.freigabe ? 'freigabe' : 'entwurf';
  if (r.status === 'storniert') return 'storniert';
  if (r.status === 'storno') return 'storno';
  if (r.status === 'bezahlt') return 'bezahlt';
  return r.faellig && r.faellig < heute ? 'ueberfaellig' : 'offen';
}
/** Positionen der Druckfassung in Abschnitte teilen (bei Gliederung je Kategorie, sonst ein Abschnitt). */
export function abschnitte(fest) {
  if (!fest.gliedern) return [{ name: '', positionen: fest.positionen, nettoCent: fest.summen?.nettoCent ?? fest.positionen.reduce((s, p) => s + p.nettoCent, 0) }];
  const aus = [];
  for (const p of fest.positionen) {
    let a = aus[aus.length - 1];
    if (!a || a.name !== p.gruppe) { a = { name: p.gruppe, positionen: [], nettoCent: 0 }; aus.push(a); }
    a.positionen.push(p); a.nettoCent += p.nettoCent;
  }
  return aus;
}

export const offenerBetrag = r => {
  const brutto = r.fest?.summen?.bruttoCent || 0;
  const gezahlt = (r.zahlungen || []).reduce((s, z) => s + (Number(z.betragCent) || 0), 0);
  return Math.max(0, brutto - gezahlt);
};
