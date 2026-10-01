// Ende-zu-Ende-Test des Laptop-Servers mit zwei simulierten Geräten (Handy + Laptop):
// Abgleich in beide Richtungen, gleichzeitige Änderungen, Freigabe mit Nummernvergabe, PDF im Archiv,
// Schutz festgeschriebener Rechnungen, Storno, Dateiablage, Protokoll-Kette.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { join } from 'node:path';

const ORDNER = fs.mkdtempSync(join(os.tmpdir(), 'rechnungapp-test-'));
const PORT = 4300 + Math.floor(Math.random() * 500);
const URL = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), RA_ORDNER: ORDNER }, stdio: 'pipe' });
  server.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL + '/api/status')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server startet nicht');
});
after(() => { server?.kill(); fs.rmSync(ORDNER, { recursive: true, force: true }); });

const abgleich = async (geraet, seit, aenderungen = []) => {
  const r = await fetch(URL + '/api/abgleich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geraet: { id: geraet, name: geraet }, seit, aenderungen }) });
  assert.equal(r.status, 200);
  return r.json();
};
const finde = (antwort, typ, id) => antwort.datensaetze.filter(d => d._typ === typ && d.id === id).pop();
const jetzt = (plusMs = 0) => new Date(Date.now() + plusMs).toISOString();

const firma = { name: 'Muster Haustechnik GmbH', strasse: 'Werkstattweg 3', plz: '80331', ort: 'München', steuernummer: '143/123/45678',
  ustId: 'DE123456789', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', zahlungszielTage: 14, nummernFormat: '{JJJJ}-{NNNN}', schluss: 'Mit freundlichen Grüßen' };
const kunde = { typ: 'privat', anrede: 'Herr', name: 'Hans Huber', strasse: 'Gartenweg 5', plz: '80331', ort: 'München' };
const entwurf = { typ: 'rechnung', kundeId: 'k1', leistungVon: '2026-09-22', leistungBis: '2026-09-26', amGrundstueck: true,
  positionen: [{ id: 'p1', bezeichnung: 'Arbeitszeit Geselle', menge: 3.5, einheit: 'Std.', preisCent: 4500, steuersatz: 19, art: 'arbeit' },
    { id: 'p2', bezeichnung: 'Anfahrtspauschale', menge: 1, einheit: 'pauschal', preisCent: 1500, steuersatz: 19, art: 'fahrt' }] };

test('Abgleich, Konflikt, Festschreiben, Schutz, Storno, Dateien', async () => {
  // Handy legt Firma, Kunde und Entwurf an
  const h1 = await abgleich('handy', 0, [
    { typ: 'einstellungen', id: 'firma', daten: firma, basis: 0, geaendert: jetzt() },
    { typ: 'kunden', id: 'k1', daten: kunde, basis: 0, geaendert: jetzt() },
    { typ: 'rechnungen', id: 'r1', daten: { ...entwurf, nummer: 'GEFAELSCHT', status: 'offen' }, basis: 0, geaendert: jetzt() }
  ]);
  assert.ok(h1.ergebnisse.every(e => e.ok));
  assert.equal(finde(h1, 'kunden', 'k1').nummer, 'K-0001', 'Kundennummer vergibt der Laptop');
  const r1 = finde(h1, 'rechnungen', 'r1');
  assert.equal(r1.status, 'entwurf', 'Gerät kann nicht selbst festschreiben');
  assert.equal(r1.nummer, undefined);

  // Laptop holt alles
  const l1 = await abgleich('laptop', 0);
  assert.equal(finde(l1, 'rechnungen', 'r1').positionen.length, 2);

  // Gleichzeitig ändern: Laptop (neuer) gewinnt, Handy (älter, alte Basis) wird verworfen
  const basis = r1._seq;
  const l2 = await abgleich('laptop', l1.seq, [{ typ: 'rechnungen', id: 'r1', daten: { ...entwurf, betreff: 'Bad EG' }, basis, geaendert: jetzt(1000) }]);
  assert.ok(l2.ergebnisse[0].ok);
  const h2 = await abgleich('handy', h1.seq, [{ typ: 'rechnungen', id: 'r1', daten: { ...entwurf, betreff: 'alt vom Handy' }, basis, geaendert: jetzt(-60000) }]);
  assert.equal(h2.ergebnisse[0].grund, 'konflikt');
  assert.equal(finde(h2, 'rechnungen', 'r1').betreff, 'Bad EG');

  // Handy fordert die Freigabe an → Laptop prüft, vergibt Nummer, legt PDF ab
  const stand = finde(h2, 'rechnungen', 'r1');
  const h3 = await abgleich('handy', h2.seq, [{ typ: 'rechnungen', id: 'r1', daten: { ...stand, freigabe: { angefordert: jetzt(), geraet: 'handy' } }, basis: stand._seq, geaendert: jetzt(2000) }]);
  const jahr = new Date().getFullYear();
  assert.equal(h3.freigaben[0].ok, true, JSON.stringify(h3.freigaben));
  const fest = finde(h3, 'rechnungen', 'r1');
  assert.equal(fest.nummer, `${jahr}-0001`);
  assert.equal(fest.status, 'offen');
  assert.equal(fest.fest.summen.bruttoCent, 20528);
  const pdfPfad = join(ORDNER, fest.pdf.datei);
  const bytes = fs.readFileSync(pdfPfad);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), fest.pdf.sha256);
  assert.equal(fs.statSync(pdfPfad).mode & 0o222, 0, 'PDF ist schreibgeschützt');
  const text = execFileSync('pdftotext', ['-layout', pdfPfad, '-']).toString().replace(/\s+/g, ' ');
  for (const t of [`Rechnung Nr. ${jahr}-0001`, '205,28 €', '32,78 €', '§ 35a EStG', 'Hans Huber', 'K-0001']) assert.ok(text.includes(t), 'PDF enthält ' + t + ' – Text: ' + text.slice(0, 1500));

  // Festgeschriebene Rechnung: Positionen bleiben, Zahlung darf nachgetragen werden
  const h4 = await abgleich('handy', h3.seq, [{ typ: 'rechnungen', id: 'r1', basis: fest._seq, geaendert: jetzt(3000),
    daten: { ...fest, positionen: [], zahlungen: [{ datum: '2026-10-05', betragCent: 20528 }], status: 'bezahlt' } }]);
  const nachher = finde(h4, 'rechnungen', 'r1');
  assert.equal(nachher.positionen.length, 2);
  assert.equal(nachher.status, 'bezahlt');
  assert.equal(nachher.fest.nummer, `${jahr}-0001`);
  const loeschen = await abgleich('handy', h4.seq, [{ typ: 'rechnungen', id: 'r1', daten: {}, basis: nachher._seq, geloescht: true, geaendert: jetzt(4000) }]);
  assert.equal(loeschen.ergebnisse[0].grund, 'festgeschrieben');

  // Storno
  const st = { typ: 'storno', stornoVon: 'r1', kundeId: 'k1', leistungVon: fest.leistungVon, leistungBis: fest.leistungBis, amGrundstueck: true,
    positionen: fest.positionen.map(p => ({ ...p, menge: -p.menge })), freigabe: { angefordert: jetzt(), geraet: 'laptop' } };
  const l3 = await abgleich('laptop', l2.seq, [{ typ: 'rechnungen', id: 's1', daten: st, basis: 0, geaendert: jetzt(5000) }]);
  assert.equal(l3.freigaben[0].ok, true, JSON.stringify(l3.freigaben));
  assert.equal(finde(l3, 'rechnungen', 's1').nummer, `${jahr}-0002`);
  assert.equal(finde(l3, 'rechnungen', 's1').fest.summen.bruttoCent, -20528);
  assert.equal(finde(l3, 'rechnungen', 'r1').status, 'storniert');

  // PDF abrufen (archiviert und Entwurf)
  const pdf = await fetch(URL + '/api/rechnungen/r1/pdf');
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  await abgleich('laptop', 0, [{ typ: 'rechnungen', id: 'r2', daten: entwurf, basis: 0, geaendert: jetzt() }]);
  const entwurfPdf = await fetch(URL + '/api/rechnungen/r2/pdf');
  assert.equal(entwurfPdf.status, 200);

  // Foto vom Handy landet im Archiv auf dem Laptop
  const foto = crypto.randomBytes(2048);
  const put = await fetch(URL + '/api/dateien/f1', { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: foto });
  assert.equal(put.status, 200);
  const zurueck = Buffer.from(await (await fetch(URL + '/api/dateien/f1')).arrayBuffer());
  assert.ok(zurueck.equals(foto));

  // Protokoll-Kette intakt, Sicherung angelegt
  const status = await (await fetch(URL + '/api/status')).json();
  assert.equal(status.protokoll.ok, true);
  assert.ok(status.protokoll.eintraege > 5);
  assert.ok(status.sicherungen.length >= 1);
});
