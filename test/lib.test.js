// Tests der gemeinsamen Logik (Browser + Laptop-Server): Rechnen, Rechts-Check, Festschreiben, GiroCode, Vorschläge,
// Diktat-Hilfen, Gliederung nach Kategorien, Baustellen und Notizen im Abgleich.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rundeCent, centAus, mengeAus, euro } from '../public/lib/geld.js';
import { berechne } from '../public/lib/berechnung.js';
import { pruefeRechnung } from '../public/lib/pruefung.js';
import { festschreiben, festeFassung, abschnitte, rechnungsnummer, zaehlerName, zahlstatus } from '../public/lib/festschreiben.js';
import { epcText, ibanGueltig, qrMatrix } from '../public/lib/girocode.js';
import { vorschlaegeAus, vorschlaegeSumme, zahlwoerter } from '../public/lib/vorschlaege.js';
import { sprachbefehle, anhaengen, wavBlob, wavVerbinden } from '../public/lib/diktat.js';
import { blattHtml } from '../public/lib/blatt.js';
import { aenderungenUebernehmen, freigabenAusfuehren, abschriftSetzen } from '../public/lib/abgleich-kern.js';
import { zeitraumDe, plusTage } from '../public/lib/datum.js';

const firma = { name: 'Muster Haustechnik GmbH', strasse: 'Werkstattweg 3', plz: '80331', ort: 'München', steuernummer: '143/123/45678',
  ustId: 'DE123456789', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX', zahlungszielTage: 14, versteuerung: 'soll' };
const privat = { id: 'k1', typ: 'privat', name: 'Hans Huber', strasse: 'Gartenweg 5', plz: '80331', ort: 'München' };
const pos = (id, bezeichnung, menge, einheit, preisCent, art, steuersatz = 19) => ({ id, bezeichnung, menge, einheit, preisCent, art, steuersatz });
const entwurf = {
  id: 'r1', typ: 'rechnung', status: 'entwurf', kundeId: 'k1', leistungVon: '2026-09-22', leistungBis: '2026-09-26',
  positionen: [pos('p1', 'Arbeitsleistung vor Ort', 3.5, 'Std.', 4500, 'arbeit'), pos('p2', 'Anfahrtspauschale', 1, 'pauschal', 1500, 'fahrt'),
    pos('p3', 'Material: Dichtband 10 m', 4, 'Stk.', 890, 'material'), { ...pos('p4', 'Nicht angehakt', 1, 'Stk.', 99999, 'material'), aktiv: false }]
};

test('Geld: Eingaben, Rundung, Anzeige', () => {
  assert.equal(centAus('1.234,56'), 123456);
  assert.equal(centAus('45'), 4500);
  assert.equal(centAus('45,5'), 4550);
  assert.equal(centAus('12.50'), 1250);
  assert.equal(centAus('1.000'), 100000);
  assert.equal(centAus('abc'), null);
  assert.equal(mengeAus('2,5'), 2.5);
  assert.equal(rundeCent(3953.9), 3954);
  assert.equal(rundeCent(-0.5), -1);
  assert.equal(euro(24764), '247,64 €');
});

test('Berechnung wie die Musterrechnung im Fahrplan', () => {
  const s = berechne(entwurf);
  assert.equal(s.nettoCent, 20810);
  assert.equal(s.steuerCent, 3954);
  assert.equal(s.bruttoCent, 24764);
  assert.equal(s.arbeitNettoCent, 17250);
  assert.equal(s.arbeitBruttoCent, 20528);
  assert.equal(s.positionen.length, 3, 'nicht angehakte Position zählt nicht');
});

test('Gemischte Steuersätze und § 13b', () => {
  const r = { positionen: [pos('a', 'Arbeitszeit Geselle', 2, 'Std.', 5800, 'arbeit'), pos('b', 'Fachbuch', 1, 'Stk.', 2000, 'material', 7)] };
  const s = berechne(r);
  assert.deepEqual(s.gruppen.map(g => [g.satz, g.nettoCent, g.steuerCent]), [[19, 11600, 2204], [7, 2000, 140]]);
  const rc = berechne(r, { reverseCharge: true });
  assert.equal(rc.steuerCent, 0);
  assert.equal(rc.gruppen[0].ustKategorie, 'AE');
});

test('Rechts-Check: Privatkunde bekommt § 35a, Aufbewahrung und Verzugshinweis', () => {
  const p = pruefeRechnung({ firma, kunde: privat, rechnung: entwurf, datum: '2026-10-01' });
  assert.equal(p.ok, true, JSON.stringify(p.fehler));
  const ids = p.hinweise.map(h => h.id);
  assert.deepEqual(ids, ['35a', 'aufbewahrung', 'verzug']);
  assert.match(p.hinweise[0].text, /205,28 €/);
  assert.equal(p.faellig, '2026-10-15');
});

test('Rechts-Check: Pflichtangaben fehlen → Fehler', () => {
  const p = pruefeRechnung({ firma: { name: 'X' }, kunde: null, rechnung: { positionen: [], leistungVon: '' }, datum: '2026-10-01' });
  assert.equal(p.ok, false);
  const texte = p.fehler.map(f => f.text).join(' | ');
  for (const t of ['Anschrift', 'Steuernummer', 'Kunden', 'keine Positionen', 'Leistungsdatum']) assert.match(texte, new RegExp(t));
});

test('Rechts-Check: Firmenkunde mit § 13b, Behörde, E-Rechnung ab 2028, 6-Monats-Frist, Ist-Versteuerung', () => {
  const bau = { id: 'k2', typ: 'firma', name: 'Bau-Kontor Süd GmbH', strasse: 'Am Ring 1', plz: '80999', ort: 'München', bauleistender13b: true };
  const p1 = pruefeRechnung({ firma, kunde: bau, rechnung: entwurf, datum: '2026-10-01' });
  assert.equal(p1.reverseCharge, true);
  assert.equal(p1.summen.steuerCent, 0);
  assert.ok(p1.hinweise.some(h => h.id === '13b'));
  assert.ok(!p1.hinweise.some(h => h.id === '35a'), 'kein § 35a bei Firmen');

  const amt = { id: 'k3', typ: 'behoerde', name: 'Stadt Musterstadt', strasse: 'Rathausplatz 1', plz: '80000', ort: 'Musterstadt' };
  const p2 = pruefeRechnung({ firma, kunde: amt, rechnung: entwurf, datum: '2026-10-01' });
  assert.ok(p2.warnungen.some(w => /XRechnung/.test(w.text)));
  assert.ok(p2.warnungen.some(w => /Leitweg-ID/.test(w.text)));

  const firmaKunde = { ...bau, bauleistender13b: false };
  const gross = { ...entwurf, positionen: entwurf.positionen.map(p => ({ ...p, menge: p.menge * 10 })) };
  const p3 = pruefeRechnung({ firma, kunde: firmaKunde, rechnung: gross, datum: '2028-01-05' });
  assert.ok(!pruefeRechnung({ firma, kunde: firmaKunde, rechnung: entwurf, datum: '2028-01-05' }).warnungen.some(w => /E-Rechnung/.test(w.text)), 'Kleinbetrag ≤ 250 € braucht keine E-Rechnung');
  assert.ok(p3.warnungen.some(w => /E-Rechnung/.test(w.text)));
  assert.ok(p3.warnungen.some(w => /6 Monate/.test(w.text)));

  const p4 = pruefeRechnung({ firma: { ...firma, versteuerung: 'ist' }, kunde: privat, rechnung: entwurf, datum: '2028-01-05' });
  assert.ok(p4.hinweise.some(h => h.id === 'ist'));
});

test('Festschreiben: Nummer, Fälligkeit, unveränderbare Fassung', () => {
  assert.equal(rechnungsnummer('{JJJJ}-{NNNN}', 2026, 42), '2026-0042');
  assert.equal(rechnungsnummer('RE{JJ}/{NNN}', 2026, 7), 'RE26/007');
  assert.equal(zaehlerName('{JJJJ}-{NNNN}', 2026), 'rechnung-2026');
  const e = festschreiben({ entwurf, firma, kunde: privat, nummer: '2026-0042', datum: '2026-10-01' });
  assert.equal(e.ok, true);
  assert.equal(e.rechnung.status, 'offen');
  assert.equal(e.rechnung.fest.summen.bruttoCent, 24764);
  assert.equal(e.rechnung.fest.positionen.length, 3);
  assert.equal(e.rechnung.fest.kunde.name, 'Hans Huber');
  assert.equal(zahlstatus(e.rechnung, '2026-10-20'), 'ueberfaellig');
  assert.equal(zahlstatus(e.rechnung, '2026-10-10'), 'offen');
  const fehler = festschreiben({ entwurf: { ...entwurf, positionen: [] }, firma, kunde: privat, nummer: 'x', datum: '2026-10-01' });
  assert.equal(fehler.ok, false);
});

test('GiroCode: gültige IBAN, Inhalt nach EPC-Standard, QR-Code', () => {
  assert.equal(ibanGueltig('DE89 3704 0044 0532 0130 00'), true);
  assert.equal(ibanGueltig('DE89 3704 0044 0532 0130 01'), false);
  const t = epcText({ name: firma.name, iban: firma.iban, bic: firma.bic, betragCent: 24764, zweck: 'Rechnung 2026-0042' });
  assert.equal(t.split('\n')[7], 'EUR247.64');
  assert.equal(t.split('\n')[6], 'DE89370400440532013000');
  const m = qrMatrix(t);
  assert.ok(m.length >= 25 && m.length === m[0].length);
  assert.equal(epcText({ name: 'x', iban: 'DE00', betragCent: 100 }), null);
});

test('Vorschläge aus einer diktierten Notiz', () => {
  const leistungen = [
    { id: 'l1', bezeichnung: 'Arbeitszeit Geselle', einheit: 'Std.', art: 'arbeit', favorit: true },
    { id: 'l2', bezeichnung: 'Silikonfuge erneuern', einheit: 'm', art: 'arbeit', suchwoerter: 'fuge silikon abdichten' },
    { id: 'l3', bezeichnung: 'Anfahrtspauschale', einheit: 'pauschal', art: 'fahrt', suchwoerter: 'anfahrt fahrt' },
    { id: 'l4', bezeichnung: 'Eckventil 1/2"', einheit: 'Stk.', art: 'material', suchwoerter: 'eckventil ventil' }
  ];
  const kunden = [{ id: 'k1', name: 'Familie Schneider' }, { id: 'k2', name: 'Hans Huber' }];
  const v = vorschlaegeAus('Bei Schneider 2,5 Std. Silikonfuge im Bad erneuert, 4 Meter, Anfahrt und 2 Eckventile getauscht', leistungen, kunden);
  assert.equal(v.kunde?.id, 'k1');
  const m = Object.fromEntries(v.positionen.map(p => [p.leistungId, p.menge]));
  assert.deepEqual(m, { l2: 4, l1: 2.5, l3: 1, l4: 2 });
});

test('Datum: Zeiträume lesbar', () => {
  assert.equal(zeitraumDe('2026-09-22', '2026-09-26'), '22.09.–26.09.2026');
  assert.equal(zeitraumDe('2026-09-22', '2026-09-22'), '22.09.2026');
  assert.equal(plusTage('2026-12-25', 14), '2027-01-08');
});

test('Diktat: Zahlwörter, gesprochene Satzzeichen, Anhängen', () => {
  assert.equal(zahlwoerter('zweieinhalb Stunden'), '2,5 Stunden');
  assert.equal(zahlwoerter('eine halbe Stunde'), '0,5 Stunde');
  assert.equal(zahlwoerter('dreiviertel Stunde'), '0,75 Stunde');
  assert.equal(zahlwoerter('anderthalb Stunden, vierundzwanzig Meter'), '1,5 Stunden, 24 Meter');
  assert.equal(sprachbefehle('Fuge erneuert komma vier Meter punkt neue Zeile Anfahrt'), 'Fuge erneuert, vier Meter.\nAnfahrt');
  assert.equal(anhaengen('', 'zwei Eckventile'), 'Zwei Eckventile');
  assert.equal(anhaengen('Fuge erneuert.', 'danach Anfahrt'), 'Fuge erneuert. Danach Anfahrt');
  assert.equal(anhaengen('Fuge erneuert', ', vier Meter'), 'Fuge erneuert, vier Meter');
  assert.equal(anhaengen('Fuge erneuert', 'vier Meter'), 'Fuge erneuert vier Meter');
});

test('Diktat: Aufnahmen aneinanderhängen (WAV 16 kHz)', async () => {
  const a = wavBlob([new Int16Array([1, 2, 3])], 3, 16000), b = wavBlob([new Int16Array([4, -5])], 2, 16000);
  const c = await wavVerbinden(a, b);
  const puffer = await c.arrayBuffer(), kopf = new DataView(puffer);
  assert.equal(String.fromCharCode(...new Uint8Array(puffer.slice(0, 4))), 'RIFF');
  assert.equal(kopf.getUint32(24, true), 16000);
  assert.equal(kopf.getUint32(40, true), 10, 'Datenlänge: 5 Werte × 2 Byte');
  assert.deepEqual([...new Int16Array(puffer.slice(44))], [1, 2, 3, 4, -5]);
});

test('Vorschläge: Abkürzungen, Ortsangaben, keine Hausnummern/Daten/Beträge als Mengen, Baustelle erkennen', () => {
  const katalog = [
    { id: 'g', bezeichnung: 'Arbeitszeit Geselle', einheit: 'Std.', art: 'arbeit', favorit: true, suchwoerter: 'geselle monteur' },
    { id: 'm', bezeichnung: 'Arbeitszeit Meister', einheit: 'Std.', art: 'arbeit' },
    { id: 'h', bezeichnung: 'Arbeitszeit Helfer', einheit: 'Std.', art: 'arbeit', suchwoerter: 'helfer' },
    { id: 'e', bezeichnung: 'Eckventil 1/2"', einheit: 'Stk.', art: 'material', suchwoerter: 'eckventil ventil' },
    { id: 'w', bezeichnung: 'Einhebel-Waschtischarmatur', einheit: 'Stk.', art: 'material', suchwoerter: 'armatur waschtisch' },
    { id: 'n', bezeichnung: 'Notdienstzuschlag', einheit: 'pauschal', art: 'arbeit', suchwoerter: 'notdienst wochenende nacht' },
    { id: 'k', bezeichnung: 'Kleinmaterial', einheit: 'pauschal', art: 'material' }
  ];
  const mengen = t => Object.fromEntries(vorschlaegeAus(t, katalog).positionen.map(p => [p.leistungId, p.menge]));
  assert.deepEqual(mengen('3. OG: 8 Std. Geselle, 7,5 Std. Helfer'), { g: 8, h: 7.5 }, '„Std." und „3." beenden keinen Satz');
  assert.deepEqual(mengen('Eckventil unter dem Waschtisch getauscht'), { e: 1 }, 'Ortsangabe ist keine Leistung');
  assert.deepEqual(mengen('Eine Stunde Arbeitszeit'), { g: 1 }, 'gemeinsames Stichwort → nur die häufig gebrauchte Leistung');
  assert.deepEqual(mengen('Termin nächste Woche, Ahornweg 3'), {}, '„Woche" ist nicht „Wochenende", Hausnummer keine Menge');
  assert.deepEqual(mengen('Kleinmaterial 20,47 €'), { k: 1 }, 'Geldbetrag ist keine Menge');
  assert.deepEqual(mengen('am 3.10. um 14:30 Uhr: 2 Eckventile'), { e: 2 }, 'Datum und Uhrzeit sind keine Mengen');
  assert.deepEqual(Object.fromEntries(vorschlaegeSumme(['8 Std. Geselle', '7,5 Std. Geselle, Kleinmaterial'], katalog).map(p => [p.leistungId, p.menge])), { g: 15.5, k: 1 });

  const kunden = [{ id: 'k1', name: 'Familie Schneider' }, { id: 'k2', name: 'Bau-Kontor Süd GmbH' }, { id: 'k3', name: 'Hans Huber' }];
  const baustellen = [{ id: 'b1', name: 'Bad OG Schneider', kundeId: 'k1', strasse: 'Lindenstraße 12' },
    { id: 'b2', name: 'Wohnanlage Am Ring', kundeId: 'k2', strasse: 'Am Ring 5' },
    { id: 'b3', name: 'Tiefgarage Am Ring', kundeId: 'k2', strasse: 'Am Ring 9', status: 'abgeschlossen' },
    { id: 'b4', name: 'Heizungskeller', kundeId: 'k3', strasse: 'Gartenweg 5' }];
  const b = t => vorschlaegeAus(t, katalog, kunden, baustellen);
  assert.equal(b('Wohnanlage: 8 Std. Geselle').baustelle?.id, 'b2', 'über den Namen');
  assert.equal(b('Wohnanlage: 8 Std. Geselle').kunde?.id, 'k2', 'Kunde kommt von der Baustelle');
  assert.equal(b('Lindenstraße fertig').baustelle?.id, 'b1', 'über die Straße');
  assert.equal(b('Bei Huber Therme gewartet').baustelle?.id, 'b4', 'Kunde mit genau einer laufenden Baustelle');
  assert.equal(b('Tiefgarage nachgesehen').baustelle, null, 'abgeschlossene Baustellen zählen nicht');
});

test('Gliederung nach Kategorien: Reihenfolge, Abschnitte, Zwischensummen, Blatt', () => {
  const kategorien = [{ id: 'kM', name: 'Material', position: 20 }, { id: 'kA', name: 'Arbeitszeit', position: 10 }];
  const r = { ...entwurf, gliedern: true, positionen: [
    { ...pos('p1', 'Eckventil', 2, 'Stk.', 1490, 'material'), kategorieId: 'kM' },
    { ...pos('p2', 'Arbeitszeit Geselle', 2, 'Std.', 5800, 'arbeit'), kategorieId: 'kA' },
    pos('p3', 'Entsorgung', 1, 'pauschal', 2500, 'sonstiges'),
    { ...pos('p4', 'Arbeitszeit Helfer', 1, 'Std.', 3900, 'arbeit'), kategorieId: 'kA' }] };
  const { fest } = festeFassung({ entwurf: r, firma, kunde: privat, nummer: '', datum: '2026-10-01', kategorien });
  assert.deepEqual(fest.positionen.map(p => [p.pos, p.bezeichnung, p.gruppe]),
    [[1, 'Arbeitszeit Geselle', 'Arbeitszeit'], [2, 'Arbeitszeit Helfer', 'Arbeitszeit'], [3, 'Eckventil', 'Material'], [4, 'Entsorgung', 'Weitere Leistungen']]);
  const a = abschnitte(fest);
  assert.deepEqual(a.map(x => [x.name, x.nettoCent]), [['Arbeitszeit', 15500], ['Material', 2980], ['Weitere Leistungen', 2500]]);
  assert.equal(a.reduce((s, x) => s + x.nettoCent, 0), fest.summen.nettoCent);
  const html = blattHtml(fest, { entwurf: true });
  assert.match(html, /<tr class="b-gruppe"><td><\/td><td colspan="5">Arbeitszeit<\/td><\/tr>/);
  assert.match(html, /Summe Arbeitszeit<\/td><td class="r">155,00 €/);
  const ohne = festeFassung({ entwurf: { ...r, gliedern: false }, firma, kunde: privat, nummer: '', datum: '2026-10-01', kategorien }).fest;
  assert.equal(abschnitte(ohne).length, 1, 'ohne Gliederung ein Abschnitt');
  assert.equal(ohne.positionen[0].bezeichnung, 'Eckventil', 'Reihenfolge wie eingegeben');
  assert.doesNotMatch(blattHtml(ohne), /b-gruppe|Summe Arbeitszeit/);
});

/** Speicher im Arbeitsspeicher – gleiche Schnittstelle wie die SQLite-Datenbank am Laptop. */
function speicherImArbeitsspeicher() {
  const daten = new Map(), zaehler = new Map(), k = o => JSON.parse(JSON.stringify(o));
  return {
    holen: (t, id) => { const d = daten.get(t + '/' + id); return d ? k(d) : null; },
    alle: t => [...daten.values()].filter(d => d._typ === t).map(k),
    seit: seq => [...daten.values()].filter(d => d._seq > seq).map(k),
    zaehler: n => zaehler.get(n) || 0, zaehlerSetzen: (n, w) => { zaehler.set(n, w); }, hoechsteSeq: () => zaehler.get('seq') || 0,
    schreiben(t, id, d) { const seq = (zaehler.get('seq') || 0) + 1; zaehler.set('seq', seq); const { _seq, ...o } = d; void _seq; daten.set(t + '/' + id, { ...k(o), _typ: t, id, _seq: seq }); return seq; },
    protokoll() {}, transaktion: fn => fn()
  };
}
const ohneMeta = d => Object.fromEntries(Object.entries(d).filter(([key]) => !key.startsWith('_')));

test('Abgleich: Baustellen-Nummern, Notizen, Abschrift gehört dem Laptop, abgerechnet bleibt abgerechnet', async () => {
  const s = speicherImArbeitsspeicher();
  let uhr = Date.parse('2026-10-01T08:00:00Z');
  const neu = (typ, id, daten, extra = {}) => ({ typ, id, daten, basis: 0, geaendert: new Date(uhr += 1000).toISOString(), ...extra });
  aenderungenUebernehmen(s, 'handy', [neu('baustellen', 'b1', { name: 'Bad', nummer: 'GEFAELSCHT' }), neu('baustellen', 'b2', { name: 'Keller' })]);
  assert.equal(s.holen('baustellen', 'b1').nummer, 'B-0001', 'Baustellennummer vergibt der Laptop');
  assert.equal(s.holen('baustellen', 'b2').nummer, 'B-0002');

  aenderungenUebernehmen(s, 'handy', [neu('notizen', 'n1', { text: '', baustelleId: 'b1', audio: 'a1', abschrift: 'gefälscht', abschriftStatus: 'fertig', status: 'offen' })]);
  let n = s.holen('notizen', 'n1');
  assert.equal(n.abschrift, null, 'Gerät kann keine Abschrift setzen');
  assert.equal(n.abschriftStatus, 'wartet');

  assert.equal(abschriftSetzen(s, 'a1', { text: 'Eckventil getauscht', status: 'fertig' }), 1);
  n = s.holen('notizen', 'n1');
  assert.deepEqual([n.abschrift, n.abschriftStatus], ['Eckventil getauscht', 'fertig']);

  aenderungenUebernehmen(s, 'handy', [neu('notizen', 'n1', { ...ohneMeta(n), text: 'dazu Anfahrt', abschrift: null }, { basis: n._seq })]);
  n = s.holen('notizen', 'n1');
  assert.deepEqual([n.text, n.abschrift], ['dazu Anfahrt', 'Eckventil getauscht'], 'Text ändern lässt die Abschrift stehen');

  aenderungenUebernehmen(s, 'handy', [neu('notizen', 'n1', { ...ohneMeta(n), audio: 'a2' }, { basis: n._seq })]);
  n = s.holen('notizen', 'n1');
  assert.deepEqual([n.abschrift, n.abschriftStatus], [null, 'wartet'], 'neue Aufnahme → alte Abschrift gilt nicht mehr');

  // Gleichzeitig: Laptop tippt ab, während das Handy (auf altem Stand) den Text ändert → beides bleibt erhalten
  const vorher = n;
  abschriftSetzen(s, 'a2', { text: 'Zweite Aufnahme', status: 'fertig' });
  const erg = aenderungenUebernehmen(s, 'handy', [neu('notizen', 'n1', { ...ohneMeta(vorher), text: 'Text neu' }, { basis: vorher._seq })]);
  assert.equal(erg[0].ok, true, JSON.stringify(erg));
  n = s.holen('notizen', 'n1');
  assert.deepEqual([n.text, n.abschrift], ['Text neu', 'Zweite Aufnahme']);

  // Rechnung aus der Notiz festschreiben → Notiz ist abgerechnet und lässt sich nicht wieder öffnen
  aenderungenUebernehmen(s, 'laptop', [neu('einstellungen', 'firma', firma), neu('kunden', 'k1', privat)]);
  aenderungenUebernehmen(s, 'handy', [neu('rechnungen', 'r1', { ...entwurf, notizen: ['n1'], freigabe: { angefordert: new Date(uhr).toISOString() } })]);
  const f = await freigabenAusfuehren(s, { geraet: 'laptop', heute: '2026-10-01' });
  assert.equal(f[0].ok, true, JSON.stringify(f));
  n = s.holen('notizen', 'n1');
  assert.deepEqual([n.status, n.rechnungId], ['abgerechnet', 'r1']);
  aenderungenUebernehmen(s, 'handy', [neu('notizen', 'n1', { ...ohneMeta(n), status: 'offen', rechnungId: null }, { basis: n._seq })]);
  assert.equal(s.holen('notizen', 'n1').status, 'abgerechnet');
  assert.equal(aenderungenUebernehmen(s, 'handy', [neu('erfassungen', 'e1', { text: 'alt' })])[0].grund, 'ungueltig', 'alte Sammlung wird abgewiesen');
});
