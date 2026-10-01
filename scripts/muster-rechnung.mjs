// Erzeugt Muster-Rechnungen (Beispieldaten) mit demselben Code wie beim Festschreiben – z. B. zum Prüfen durch den Steuerberater.
// Aufruf:  npm run muster   →  docs/Muster-Rechnung.pdf und docs/Muster-Rechnung-gegliedert.pdf (nach Leistungs-Kategorien)
import fs from 'node:fs';
import { festschreiben } from '../public/lib/festschreiben.js';
import { erstelleRechnungsPdf } from '../src/rechnung-pdf.js';
const firma = { name: 'Muster Haustechnik GmbH', zusatz: 'Meisterbetrieb für Sanitär, Heizung und Bad · Beispielrechnung', inhaber: 'Max Muster', strasse: 'Werkstattweg 3', plz: '80331', ort: 'München', telefon: '089 1234567', mail: 'info@muster-haustechnik.de', web: 'www.muster-haustechnik.de', steuernummer: '143/123/45678',
  ustId: 'DE123456789', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', bank: 'Commerzbank München', zahlungszielTage: 14, fusszeile: 'Amtsgericht München HRB 123456 · Geschäftsführer: Max Muster', einleitung: 'vielen Dank für Ihren Auftrag. Für die ausgeführten Arbeiten berechnen wir Ihnen:', schluss: 'Mit freundlichen Grüßen' };
const kunde = { nummer: 'K-0007', typ: 'privat', anrede: 'Herr', name: 'Hans Huber', strasse: 'Gartenweg 5', plz: '80331', ort: 'München' };
const KAT = { arbeit: 'kA', fahrt: 'kF', material: 'kM' };
const kategorien = [{ id: 'kA', name: 'Arbeitszeit', position: 10 }, { id: 'kM', name: 'Material', position: 20 }, { id: 'kF', name: 'Anfahrt', position: 30 }];
const pos = (id, bezeichnung, menge, einheit, preisCent, art, beschreibung = '') => ({ id, bezeichnung, menge, einheit, preisCent, art, steuersatz: 19, beschreibung, kategorieId: KAT[art] });
const entwurf = { typ: 'rechnung', kundeId: 'k', leistungVon: '2026-09-22', leistungBis: '2026-09-26', amGrundstueck: true, betreff: 'Badsanierung EG – Austausch Waschtischarmatur und Silikonfugen',
  positionen: [pos('a', 'Arbeitszeit Geselle', 3.5, 'Std.', 5800, 'arbeit', 'Demontage alte Armatur, Montage neue Armatur, Dichtheitsprüfung'),
    pos('b', 'Silikonfuge erneuern', 4, 'm', 1250, 'arbeit', 'Dusche und Waschtisch, sanitärgerechtes Silikon'),
    pos('c', 'Anfahrtspauschale Stadtgebiet', 1, 'pauschal', 3500, 'fahrt'),
    pos('d', 'Einhebel-Waschtischarmatur, verchromt', 1, 'Stk.', 18900, 'material'),
    pos('e', 'Eckventil 1/2"', 2, 'Stk.', 1490, 'material'),
    pos('f', 'Kleinmaterial (Dichtungen, Befestigung)', 1, 'pauschal', 1850, 'material')] };
for (const [datei, gliedern] of [['Muster-Rechnung.pdf', false], ['Muster-Rechnung-gegliedert.pdf', true]]) {
  const e = festschreiben({ entwurf: { ...entwurf, gliedern }, firma, kunde, nummer: '2026-0042', datum: '2026-10-01', kategorien });
  if (!e.ok) { console.log(e.pruefung.fehler); process.exit(1); }
  const bytes = await erstelleRechnungsPdf({ fest: e.rechnung.fest, erstellt: '2026-10-01T10:00:00Z' });
  const ziel = new URL('../docs/' + datei, import.meta.url);
  fs.writeFileSync(ziel, bytes);
  console.log('Muster-Rechnung erstellt:', ziel.pathname);
}
