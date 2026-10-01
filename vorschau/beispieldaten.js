// Beispieldaten für die Vorschau: ein Handwerksbetrieb (Sanitär/Heizung) mit Privat-, Firmen- und Behördenkunden,
// Leistungs-Kategorien (zum Finden im Katalog), Baustellen mit Notizen (auch eine Sprachaufnahme samt Abschrift) und Rechnungen.
// Alles ist erfunden und als Beispiel gekennzeichnet. Rechnungen werden über denselben Weg festgeschrieben wie in der
// echten App (Rechts-Check, Nummernvergabe) – nur mit zurückliegenden Daten.
import { aenderungenUebernehmen, freigabenAusfuehren, abschriftSetzen } from '../public/lib/abgleich-kern.js';
import { heuteIso, plusTage } from '../public/lib/datum.js';
import { wavBlob } from '../public/lib/diktat.js';

export const FIRMA = {
  name: 'Muster Haustechnik GmbH', zusatz: 'Meisterbetrieb für Sanitär, Heizung und Bad · Beispieldaten', inhaber: 'Max Muster',
  strasse: 'Werkstattweg 3', plz: '80331', ort: 'München', land: 'DE', telefon: '089 1234567', mail: 'rechnung@muster-haustechnik.example',
  web: 'www.muster-haustechnik.example', steuernummer: '143/123/45678', ustId: 'DE123456789',
  iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', bank: 'Musterbank München',
  fusszeile: 'Amtsgericht München HRB 123456 · Geschäftsführer: Max Muster',
  versteuerung: 'soll', umsatzUeber800k: false, zahlungszielTage: 14, nummernFormat: '{JJJJ}-{NNNN}',
  einleitung: 'vielen Dank für Ihren Auftrag. Für die ausgeführten Arbeiten berechnen wir Ihnen:', schluss: 'Mit freundlichen Grüßen'
};

export const KATEGORIEN = [
  { id: 'kat-arbeit', name: 'Arbeitszeit', farbe: 'gold', position: 10 },
  { id: 'kat-heizung', name: 'Heizung & Wartung', farbe: 'orange', position: 20 },
  { id: 'kat-sanitaer', name: 'Sanitär & Bad', farbe: 'blau', position: 30 },
  { id: 'kat-material', name: 'Material', farbe: 'gruen', position: 40 },
  { id: 'kat-sonstiges', name: 'Anfahrt & Sonstiges', farbe: 'grau', position: 50 }
];

const L = (id, bezeichnung, einheit, preisCent, art, kategorieId, extra = {}) => ({ id, bezeichnung, einheit, preisCent, art, kategorieId, steuersatz: 19, favorit: false, suchwoerter: '', beschreibung: '', aktiv: true, ...extra });
export const LEISTUNGEN = [
  L('l-geselle', 'Arbeitszeit Geselle', 'Std.', 5800, 'arbeit', 'kat-arbeit', { favorit: true, suchwoerter: 'geselle monteur arbeitszeit stunde stunden' }),
  L('l-meister', 'Arbeitszeit Meister', 'Std.', 7200, 'arbeit', 'kat-arbeit', { suchwoerter: 'meister' }),
  L('l-helfer', 'Arbeitszeit Helfer', 'Std.', 3900, 'arbeit', 'kat-arbeit', { suchwoerter: 'helfer azubi lehrling' }),
  L('l-wartung', 'Wartung Gas-Brennwerttherme', 'pauschal', 14900, 'arbeit', 'kat-heizung', { favorit: true, suchwoerter: 'wartung therme heizung brennwert', beschreibung: 'inkl. Abgasmessung und Funktionsprüfung' }),
  L('l-notdienst', 'Notdienstzuschlag (Wochenende/Nacht)', 'pauschal', 6000, 'arbeit', 'kat-heizung', { suchwoerter: 'notdienst zuschlag wochenende nacht' }),
  L('l-fuge', 'Silikonfuge erneuern', 'm', 1250, 'arbeit', 'kat-sanitaer', { suchwoerter: 'silikon fuge fugen abdichten' }),
  L('l-rohr', 'Rohrreinigung mit Maschine', 'Std.', 8900, 'geraet', 'kat-sanitaer', { suchwoerter: 'rohrreinigung verstopfung spirale abfluss' }),
  L('l-armatur', 'Einhebel-Waschtischarmatur, verchromt', 'Stk.', 18900, 'material', 'kat-material', { suchwoerter: 'armatur waschtisch wasserhahn' }),
  L('l-eckventil', 'Eckventil 1/2"', 'Stk.', 1490, 'material', 'kat-material', { favorit: true, suchwoerter: 'eckventil ventil' }),
  L('l-klein', 'Kleinmaterial (Dichtungen, Befestigung)', 'pauschal', 1850, 'material', 'kat-material', { favorit: true, suchwoerter: 'kleinmaterial dichtung dichtungen' }),
  L('l-anfahrt', 'Anfahrtspauschale Stadtgebiet', 'pauschal', 3500, 'fahrt', 'kat-sonstiges', { favorit: true, suchwoerter: 'anfahrt fahrt' }),
  L('l-km', 'Fahrtkosten außerhalb', 'km', 80, 'fahrt', 'kat-sonstiges', { suchwoerter: 'kilometer fahrtkosten' }),
  L('l-entsorgung', 'Entsorgung Altmaterial', 'pauschal', 2500, 'sonstiges', 'kat-sonstiges', { suchwoerter: 'entsorgung' })
];

export const KUNDEN = [
  { id: 'k-huber', typ: 'privat', anrede: 'Herr', name: 'Hans Huber', strasse: 'Gartenweg 5', plz: '80331', ort: 'München', land: 'DE', mail: 'hans.huber@example.de',
    telefon: '0171 2345678', versand: 'mail', zustimmungMail: '2026-03-12', standard: [{ leistungId: 'l-wartung', menge: 1 }, { leistungId: 'l-anfahrt', menge: 1 }], notiz: 'Jährliche Thermenwartung im Herbst.' },
  { id: 'k-schneider', typ: 'privat', anrede: '', name: 'Familie Schneider', strasse: 'Lindenstraße 12', plz: '85540', ort: 'Haar', land: 'DE', mail: '', versand: 'post', standard: [], notiz: '' },
  { id: 'k-krause', typ: 'firma', name: 'Bäckerei Krause GmbH', zusatz: 'Buchhaltung', strasse: 'Industriestraße 8', plz: '81829', ort: 'München', land: 'DE',
    mail: 'buchhaltung@baeckerei-krause.example', versand: 'mail', zustimmungMail: '2025-11-02', ustId: 'DE811234567', zahlungszielTage: 30, standard: [], notiz: '' },
  { id: 'k-baukontor', typ: 'firma', name: 'Bau-Kontor Süd GmbH', strasse: 'Am Ring 1', plz: '80999', ort: 'München', land: 'DE', mail: 'rechnungen@bau-kontor.example',
    versand: 'mail', zustimmungMail: '2026-01-15', ustId: 'DE298765432', bauleistender13b: true, zahlungszielTage: 30, standard: [], notiz: 'Generalunternehmer, Freistellungsnachweis (USt 1 TG) liegt vor.' },
  { id: 'k-stadt', typ: 'behoerde', name: 'Stadt Musterstadt – Gebäudemanagement', strasse: 'Rathausplatz 1', plz: '85000', ort: 'Musterstadt', land: 'DE',
    mail: 'e-rechnung@musterstadt.example', versand: 'mail', leitwegId: '09162000-12345-06', standard: [], notiz: '' }
];

const pos = (leistungId, menge, extra = {}) => {
  const l = LEISTUNGEN.find(x => x.id === leistungId);
  return { id: 'p-' + leistungId + '-' + menge, leistungId, bezeichnung: l.bezeichnung, beschreibung: l.beschreibung, menge, einheit: l.einheit, preisCent: l.preisCent,
    steuersatz: l.steuersatz, art: l.art, aktiv: true, ...extra };
};

const BELEG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#f7f5f0"/>
<text x="300" y="80" font-family="Courier New, monospace" font-size="30" font-weight="bold" text-anchor="middle" fill="#222">BAUMARKT BEISPIEL</text>
<text x="300" y="118" font-family="Courier New, monospace" font-size="20" text-anchor="middle" fill="#555">Filiale München-Ost · Beispielbeleg</text>
<g font-family="Courier New, monospace" font-size="24" fill="#222">
<text x="50" y="220">Sanitär-Silikon weiß</text><text x="550" y="220" text-anchor="end">8,99</text>
<text x="50" y="270">Dichtband 10 m</text><text x="550" y="270" text-anchor="end">6,49</text>
<text x="50" y="320">Fugenglätter-Set</text><text x="550" y="320" text-anchor="end">4,99</text>
<line x1="50" y1="370" x2="550" y2="370" stroke="#222" stroke-dasharray="6 6"/>
<text x="50" y="420" font-weight="bold">SUMME EUR</text><text x="550" y="420" text-anchor="end" font-weight="bold">20,47</text>
<text x="50" y="470" font-size="20">enth. 19 % MwSt 3,27</text></g>
<text x="300" y="820" font-family="Courier New, monospace" font-size="20" text-anchor="middle" fill="#888">Vielen Dank für Ihren Einkauf</text></svg>`;

/** Nachgebildete Sprachaufnahme (gedämpftes Gemurmel) – die Vorschau hat kein Mikrofon. */
export function aufnahmeNachbilden(sekunden) {
  const rate = 16000, n = Math.round(sekunden * rate), a = new Int16Array(n);
  let braun = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    braun = braun * 0.985 + (Math.random() * 2 - 1) * 0.15;
    const silbe = Math.max(0, Math.sin(t * Math.PI * 4.3)) ** 2 * (0.6 + 0.4 * Math.sin(t * 1.7));
    const stimme = Math.sin(2 * Math.PI * 140 * t) * 0.5 + Math.sin(2 * Math.PI * 280 * t) * 0.25;
    a[i] = Math.max(-1, Math.min(1, (braun * 0.6 + stimme * 0.4) * silbe * 0.35)) * 32767;
  }
  return wavBlob([a], n, rate);
}

/** Beispielsatz für die Diktat-Vorführung – passend zur gewählten Baustelle. */
export function diktatBeispiel(b) {
  const saetze = {
    'b-schneider': 'Silikonfuge an der Duschtasse nachgebessert, zwei Meter, eine halbe Stunde, Kleinmaterial.',
    'b-ring': 'Vorwandinstallation drittes OG weiter, acht Stunden Geselle, acht Stunden Helfer.',
    'b-krause': 'Spülmaschinenzulauf neu abgedichtet, eineinhalb Stunden, Eckventil getauscht, Anfahrt.'
  };
  return saetze[b?.id] || (b ? 'Eine Stunde Arbeitszeit, Anfahrt, Kleinmaterial.' : 'Bei Familie Schneider zweieinhalb Stunden Silikonfuge erneuert, vier Meter, Anfahrt.');
}

/** Legt alle Beispieldaten im nachgebildeten Laptop an. */
export async function beispieldatenAnlegen(speicher, dateien) {
  const h = heuteIso(), tag = n => plusTage(h, n), jetzt = new Date().toISOString();
  const vor = stunden => new Date(Date.now() - stunden * 3600e3).toISOString();
  const neu = (typ, id, daten) => ({ typ, id, daten, basis: 0, geaendert: jetzt });
  aenderungenUebernehmen(speicher, 'laptop', [neu('einstellungen', 'firma', FIRMA), ...KATEGORIEN.map(k => neu('kategorien', k.id, k)),
    ...KUNDEN.map(k => neu('kunden', k.id, k)), ...LEISTUNGEN.map(l => neu('leistungen', l.id, l))]);
  for (const j of new Set([tag(-55), h].map(d => d.slice(0, 4)))) speicher.zaehlerSetzen('rechnung-' + j, 37);

  // Baustellen
  const B = (id, name, kundeId, strasse, plz, ort, extra = {}) => neu('baustellen', id, { name, kundeId, strasse, plz, ort, status: 'aktiv', notiz: '', angelegt: vor(24 * 30), ...extra });
  aenderungenUebernehmen(speicher, 'laptop', [
    B('b-huber', 'Thermenwartung Huber', 'k-huber', 'Gartenweg 5', '80331', 'München', { status: 'abgeschlossen', beginn: tag(-8), ende: tag(-8) }),
    B('b-turnhalle', 'Turnhalle Nord', 'k-stadt', 'Schulweg 4', '85000', 'Musterstadt', { status: 'abgeschlossen', beginn: tag(-4), ende: tag(-4), notiz: 'Auftrag GM-2026-118, Hausmeister Herr Brandl' }),
    B('b-ring', 'Wohnanlage Am Ring, Haus B', 'k-baukontor', 'Am Ring 5', '80999', 'München', { beginn: tag(-55), notiz: 'Bauleitung: Herr Maier, 0170 1112223' }),
    B('b-krause', 'Backstube Krause', 'k-krause', 'Industriestraße 8', '81829', 'München', { beginn: h, angelegt: vor(3) }),
    B('b-schneider', 'Bad OG Schneider', 'k-schneider', 'Lindenstraße 12', '85540', 'Haar', { beginn: tag(-2), angelegt: vor(50), notiz: 'Schlüssel bei der Nachbarin (Hausnummer 14).' })
  ]);

  // Notizen (vom Handy erfasst)
  const N = (id, datum, baustelleId, kundeId, text, extra = {}) => neu('notizen', id, { text, baustelleId, kundeId, datum, fotos: [], audio: null, audioSekunden: 0,
    status: 'offen', rechnungId: null, angelegt: vor(tageZwischenJetzt(datum, h) * 24 + 2), geraetName: 'Handy', ...extra });
  dateien.set('f-demo-bon', { blob: new Blob([BELEG], { type: 'image/svg+xml' }), mime: 'image/svg+xml' });
  dateien.set('f-demo-diktat', { blob: aufnahmeNachbilden(6.4), mime: 'audio/wav' });
  aenderungenUebernehmen(speicher, 'laptop', [
    N('n-ring-alt', tag(-50), 'b-ring', 'k-baukontor', 'Vorwand 2. OG Haus B fertig: 16 Std. Geselle, 16 Std. Helfer, Kleinmaterial', { status: 'zugeordnet', rechnungId: 'r-demo-baukontor' }),
    N('n-turnhalle', tag(-4), 'b-turnhalle', 'k-stadt', 'Grundleitung Turnhalle Nord verstopft, 2 Std. Rohrreinigung mit Maschine, Anfahrt', { status: 'zugeordnet', rechnungId: 'r-demo-stadt' }),
    N('n-ring-1', tag(-2), 'b-ring', 'k-baukontor', 'Vorwandinstallation 3. OG begonnen, 8 Std. Geselle, 8 Std. Helfer'),
    N('n-ring-2', tag(-1), 'b-ring', 'k-baukontor', '3. OG weiter, 7,5 Std. Geselle, 7,5 Std. Helfer, Kleinmaterial'),
    N('n-schneider-1', tag(-1), 'b-schneider', 'k-schneider', 'Silikonfugen in Dusche und Wanne raus und neu gemacht, 4 Meter, 2,5 Std., Anfahrt', { status: 'zugeordnet', rechnungId: 'r-demo-entwurf' }),
    N('n-schneider-2', h, 'b-schneider', 'k-schneider', 'Material aus dem Baumarkt fürs Bad – Kassenbon 20,47 € brutto, als Kleinmaterial abrechnen', { fotos: ['f-demo-bon'], angelegt: vor(2) }),
    N('n-schneider-3', h, 'b-schneider', 'k-schneider', '', { audio: 'f-demo-diktat', audioSekunden: 6.4, angelegt: vor(1) }),
    N('n-krause', h, 'b-krause', 'k-krause', 'Zulauf Spülmaschine undicht – 1,5 Std. Geselle, Eckventil getauscht, Anfahrt', { angelegt: vor(1.5) }),
    N('n-anfrage', h, null, null, 'Neue Anfrage: Heizkörper im Flur tropft, Familie Weber, Ahornweg 3 – Termin nächste Woche', { angelegt: vor(0.5) })
  ]);
  // Die Sprachaufnahme hat der Laptop schon abgetippt (wie mit whisper.cpp)
  abschriftSetzen(speicher, 'f-demo-diktat', { text: 'Eckventil unter dem Waschtisch getauscht, eine halbe Stunde.', status: 'fertig' });

  // Rechnungen – über denselben Weg festgeschrieben wie in der echten App
  const basis = (kundeId, von, bis, positionen, extra = {}) => ({ typ: 'rechnung', kundeId, leistungVon: von, leistungBis: bis, amGrundstueck: true, positionen,
    einleitung: FIRMA.einleitung, schluss: FIRMA.schluss, betreff: '', notizen: [], baustelleId: null, ...extra });
  const fertig = [
    { id: 'r-demo-baukontor', datum: tag(-45), d: basis('k-baukontor', tag(-52), tag(-47), [pos('l-geselle', 16), pos('l-helfer', 16), pos('l-klein', 2)],
      { amGrundstueck: false, baustelleId: 'b-ring', notizen: ['n-ring-alt'], betreff: 'Bauvorhaben: Wohnanlage Am Ring, Haus B, Am Ring 5, 80999 München – Vorwandinstallation 2. OG' }) },
    { id: 'r-demo-krause', datum: tag(-24), bezahlt: tag(-9), d: basis('k-krause', tag(-27), '', [pos('l-wartung', 1), pos('l-anfahrt', 1), pos('l-klein', 1)], { amGrundstueck: false, betreff: 'Wartung Gastherme Backstube' }) },
    { id: 'r-demo-huber', datum: tag(-6), d: basis('k-huber', tag(-8), '', [pos('l-wartung', 1), pos('l-anfahrt', 1), pos('l-eckventil', 2), pos('l-geselle', 0.5, { beschreibung: 'Austausch der Eckventile unter dem Waschtisch' })],
      { betreff: 'Jährliche Thermenwartung', baustelleId: 'b-huber' }) },
    { id: 'r-demo-stadt', datum: tag(-3), d: basis('k-stadt', tag(-4), '', [pos('l-rohr', 2, { beschreibung: 'Grundleitung Turnhalle Nord, Verstopfung beseitigt' }), pos('l-anfahrt', 1)],
      { amGrundstueck: false, baustelleId: 'b-turnhalle', notizen: ['n-turnhalle'], betreff: 'Auftrag GM-2026-118 – Rohrreinigung Turnhalle Nord, Schulweg 4, 85000 Musterstadt' }) }
  ];
  for (const r of fertig) {
    aenderungenUebernehmen(speicher, 'laptop', [neu('rechnungen', r.id, { ...r.d, freigabe: { angefordert: jetzt, geraet: 'Laptop' } })]);
    await freigabenAusfuehren(speicher, { geraet: 'Laptop', heute: r.datum, zeitpunkt: r.datum + 'T09:30:00.000Z' });
    if (r.bezahlt) {
      const f = speicher.holen('rechnungen', r.id);
      aenderungenUebernehmen(speicher, 'laptop', [{ ...neu('rechnungen', r.id, { ...f, status: 'bezahlt', bezahltAm: r.bezahlt, zahlungen: [{ datum: r.bezahlt, betragCent: f.fest.summen.bruttoCent, notiz: 'Überweisung' }] }), basis: f._seq }]);
    }
  }
  // Offener Entwurf aus der Notiz von gestern (Bad Schneider)
  aenderungenUebernehmen(speicher, 'laptop', [neu('rechnungen', 'r-demo-entwurf', basis('k-schneider', tag(-1), '',
    [pos('l-geselle', 2.5, { ausNotiz: true }), pos('l-fuge', 4, { beschreibung: 'Dusche und Badewanne, sanitärgerechtes Silikon', ausNotiz: true }), pos('l-anfahrt', 1, { ausNotiz: true })],
    { betreff: 'Bauvorhaben: Bad OG Schneider', baustelleId: 'b-schneider', notizen: ['n-schneider-1'] }))]);
}
const tageZwischenJetzt = (datum, heute) => Math.max(0, Math.round((new Date(heute) - new Date(datum)) / 86400000));
