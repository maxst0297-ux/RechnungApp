// Beispieldaten für die Vorschau: ein Handwerksbetrieb (Sanitär/Heizung) mit Privat-, Firmen- und Behördenkunden.
// Alles ist erfunden und als Beispiel gekennzeichnet. Rechnungen werden über denselben Weg festgeschrieben wie in der
// echten App (Rechts-Check, Nummernvergabe) – nur mit zurückliegenden Daten.
import { aenderungenUebernehmen, freigabenAusfuehren } from '../public/lib/abgleich-kern.js';
import { heuteIso, plusTage } from '../public/lib/datum.js';

export const FIRMA = {
  name: 'Muster Haustechnik GmbH', zusatz: 'Meisterbetrieb für Sanitär, Heizung und Bad · Beispieldaten', inhaber: 'Max Muster',
  strasse: 'Werkstattweg 3', plz: '80331', ort: 'München', land: 'DE', telefon: '089 1234567', mail: 'rechnung@muster-haustechnik.example',
  web: 'www.muster-haustechnik.example', steuernummer: '143/123/45678', ustId: 'DE123456789',
  iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', bank: 'Musterbank München',
  fusszeile: 'Amtsgericht München HRB 123456 · Geschäftsführer: Max Muster',
  versteuerung: 'soll', umsatzUeber800k: false, zahlungszielTage: 14, nummernFormat: '{JJJJ}-{NNNN}',
  einleitung: 'vielen Dank für Ihren Auftrag. Für die ausgeführten Arbeiten berechnen wir Ihnen:', schluss: 'Mit freundlichen Grüßen'
};

const L = (id, bezeichnung, einheit, preisCent, art, extra = {}) => ({ id, bezeichnung, einheit, preisCent, art, steuersatz: 19, favorit: false, suchwoerter: '', beschreibung: '', aktiv: true, ...extra });
export const LEISTUNGEN = [
  L('l-geselle', 'Arbeitszeit Geselle', 'Std.', 5800, 'arbeit', { favorit: true, suchwoerter: 'geselle monteur arbeitszeit stunde stunden' }),
  L('l-meister', 'Arbeitszeit Meister', 'Std.', 7200, 'arbeit', { suchwoerter: 'meister' }),
  L('l-helfer', 'Arbeitszeit Helfer', 'Std.', 3900, 'arbeit', { suchwoerter: 'helfer azubi lehrling' }),
  L('l-anfahrt', 'Anfahrtspauschale Stadtgebiet', 'pauschal', 3500, 'fahrt', { favorit: true, suchwoerter: 'anfahrt fahrt' }),
  L('l-km', 'Fahrtkosten außerhalb', 'km', 80, 'fahrt', { suchwoerter: 'kilometer fahrtkosten' }),
  L('l-wartung', 'Wartung Gas-Brennwerttherme', 'pauschal', 14900, 'arbeit', { favorit: true, suchwoerter: 'wartung therme heizung brennwert', beschreibung: 'inkl. Abgasmessung und Funktionsprüfung' }),
  L('l-fuge', 'Silikonfuge erneuern', 'm', 1250, 'arbeit', { suchwoerter: 'silikon fuge fugen abdichten' }),
  L('l-armatur', 'Einhebel-Waschtischarmatur, verchromt', 'Stk.', 18900, 'material', { suchwoerter: 'armatur waschtisch wasserhahn' }),
  L('l-eckventil', 'Eckventil 1/2"', 'Stk.', 1490, 'material', { favorit: true, suchwoerter: 'eckventil ventil' }),
  L('l-klein', 'Kleinmaterial (Dichtungen, Befestigung)', 'pauschal', 1850, 'material', { favorit: true, suchwoerter: 'kleinmaterial dichtung dichtungen' }),
  L('l-notdienst', 'Notdienstzuschlag (Wochenende/Nacht)', 'pauschal', 6000, 'arbeit', { suchwoerter: 'notdienst zuschlag wochenende nacht' }),
  L('l-entsorgung', 'Entsorgung Altmaterial', 'pauschal', 2500, 'sonstiges', { suchwoerter: 'entsorgung' }),
  L('l-rohr', 'Rohrreinigung mit Maschine', 'Std.', 8900, 'geraet', { suchwoerter: 'rohrreinigung verstopfung spirale abfluss' })
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

/** Legt alle Beispieldaten im nachgebildeten Laptop an. */
export async function beispieldatenAnlegen(speicher, dateien) {
  const h = heuteIso(), tag = n => plusTage(h, n), jetzt = new Date().toISOString();
  const neu = (typ, id, daten) => ({ typ, id, daten, basis: 0, geaendert: jetzt });
  aenderungenUebernehmen(speicher, 'laptop', [neu('einstellungen', 'firma', FIRMA), ...KUNDEN.map(k => neu('kunden', k.id, k)), ...LEISTUNGEN.map(l => neu('leistungen', l.id, l))]);
  for (const j of new Set([tag(-45), h].map(d => d.slice(0, 4)))) speicher.zaehlerSetzen('rechnung-' + j, 37);

  const basis = (kundeId, von, bis, positionen, extra = {}) => ({ typ: 'rechnung', kundeId, leistungVon: von, leistungBis: bis, amGrundstueck: true, positionen,
    einleitung: FIRMA.einleitung, schluss: FIRMA.schluss, betreff: '', erfassungen: [], ...extra });
  const fertig = [
    { id: 'r-demo-baukontor', datum: tag(-45), d: basis('k-baukontor', tag(-52), tag(-47), [pos('l-geselle', 16), pos('l-helfer', 16), pos('l-klein', 2)], { amGrundstueck: false, betreff: 'Bauvorhaben Wohnanlage Am Ring, Haus B – Vorwandinstallation 2. OG' }) },
    { id: 'r-demo-krause', datum: tag(-24), bezahlt: tag(-9), d: basis('k-krause', tag(-27), '', [pos('l-wartung', 1), pos('l-anfahrt', 1), pos('l-klein', 1)], { amGrundstueck: false, betreff: 'Wartung Gastherme Backstube' }) },
    { id: 'r-demo-huber', datum: tag(-6), d: basis('k-huber', tag(-8), '', [pos('l-wartung', 1), pos('l-anfahrt', 1), pos('l-eckventil', 2), pos('l-geselle', 0.5, { beschreibung: 'Austausch der Eckventile unter dem Waschtisch' })], { betreff: 'Jährliche Thermenwartung' }) },
    { id: 'r-demo-stadt', datum: tag(-3), d: basis('k-stadt', tag(-4), '', [pos('l-rohr', 2, { beschreibung: 'Grundleitung Turnhalle Nord, Verstopfung beseitigt' }), pos('l-anfahrt', 1)], { amGrundstueck: false, betreff: 'Auftrag GM-2026-118 – Rohrreinigung Turnhalle Nord' }) }
  ];
  for (const r of fertig) {
    aenderungenUebernehmen(speicher, 'laptop', [neu('rechnungen', r.id, { ...r.d, freigabe: { angefordert: jetzt, geraet: 'Laptop' } })]);
    await freigabenAusfuehren(speicher, { geraet: 'Laptop', heute: r.datum, zeitpunkt: r.datum + 'T09:30:00.000Z' });
    if (r.bezahlt) {
      const f = speicher.holen('rechnungen', r.id);
      aenderungenUebernehmen(speicher, 'laptop', [{ ...neu('rechnungen', r.id, { ...f, status: 'bezahlt', bezahltAm: r.bezahlt, zahlungen: [{ datum: r.bezahlt, betragCent: f.fest.summen.bruttoCent, notiz: 'Überweisung' }] }), basis: f._seq }]);
    }
  }
  aenderungenUebernehmen(speicher, 'laptop', [neu('rechnungen', 'r-demo-entwurf', basis('k-schneider', tag(-1), '',
    [pos('l-geselle', 2.5), pos('l-fuge', 4, { beschreibung: 'Dusche und Badewanne, sanitärgerechtes Silikon' }), pos('l-anfahrt', 1)], { betreff: 'Bad OG – Silikonfugen erneuert' }))]);

  dateien.set('f-demo-bon', { blob: new Blob([BELEG], { type: 'image/svg+xml' }), mime: 'image/svg+xml' });
  aenderungenUebernehmen(speicher, 'laptop', [
    neu('erfassungen', 'e-demo-krause', { typ: 'notiz', text: 'Bäckerei Krause: Zulauf Spülmaschine undicht – 1,5 Std. Geselle, Eckventil getauscht, Anfahrt', kundeId: null, datum: h, dateien: [], status: 'neu', angelegt: jetzt, geraetName: 'Handy' }),
    neu('erfassungen', 'e-demo-bon', { typ: 'foto', text: 'Kassenbon Baumarkt: Material für das Bad bei Schneider, 20,47 € brutto', kundeId: 'k-schneider', datum: tag(-1), dateien: ['f-demo-bon'], status: 'neu', angelegt: new Date(Date.now() - 3600e3).toISOString(), geraetName: 'Handy' })
  ]);
}
