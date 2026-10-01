// Tests der gemeinsamen Logik (Browser + Laptop-Server): Rechnen, Rechts-Check, Festschreiben, GiroCode, Vorschläge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rundeCent, centAus, mengeAus, euro } from '../public/lib/geld.js';
import { berechne } from '../public/lib/berechnung.js';
import { pruefeRechnung } from '../public/lib/pruefung.js';
import { festschreiben, rechnungsnummer, zaehlerName, zahlstatus } from '../public/lib/festschreiben.js';
import { epcText, ibanGueltig, qrMatrix } from '../public/lib/girocode.js';
import { vorschlaegeAus } from '../public/lib/vorschlaege.js';
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
  assert.equal(rc.gruppen[0].kategorie, 'AE');
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
