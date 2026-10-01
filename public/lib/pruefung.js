// Rechts-Check: prüft einen Rechnungsentwurf gegen die Pflichtangaben (§ 14 Abs. 4 UStG) und ergänzt die Hinweise,
// die je nach Fall auf die Rechnung gehören (§ 13b UStG, § 35a EStG, § 14b UStG, § 286 BGB, Ist-Versteuerung ab 2028).
// Stand der Regeln: Oktober 2026 – siehe FAHRPLAN.md, Abschnitt 4. Läuft im Browser (Live-Prüfung) und auf dem
// Laptop-Server (verbindliche Prüfung beim Festschreiben).
import { berechne, KUNDENTYPEN } from './berechnung.js';
import { euro } from './geld.js';
import { istIso, plusTage, tageZwischen, datumDe, plusMonate } from './datum.js';

const leer = s => !String(s ?? '').trim();
const ALLGEMEIN = /^(arbeit(en)?|material(ien)?|leistung(en)?|diverses?|sonstiges|kleinteile|pauschale?)$/i;
export const ustIdGueltig = s => /^DE\d{9}$/.test(String(s || '').replace(/\s/g, '').toUpperCase());
export const steuernummerPlausibel = s => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; };

/** § 13b: Bauleistung an einen Kunden, der selbst nachhaltig Bauleistungen erbringt. */
export const istReverseCharge = (kunde, rechnung) => !!(kunde && kunde.typ === 'firma' && kunde.bauleistender13b && rechnung?.typ !== 'gutschrift');

export function zahlungszielTage(rechnung, kunde, firma) {
  for (const v of [rechnung?.zahlungszielTage, kunde?.zahlungszielTage, firma?.zahlungszielTage]) {
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Math.max(0, Math.round(Number(v)));
  }
  return 14;
}

/**
 * @param {object} a
 * @param {object} a.firma     Stammdaten „Mein Unternehmen"
 * @param {object} a.kunde     Kunde (oder null)
 * @param {object} a.rechnung  Entwurf
 * @param {string} a.datum     Rechnungsdatum (JJJJ-MM-TT), beim Entwurf = heute
 * @param {object} [a.original] bei Storno: { nummer, datum } der ursprünglichen Rechnung
 */
export function pruefeRechnung({ firma = {}, kunde = null, rechnung, datum, original = null }) {
  const fehler = [], warnungen = [], hinweise = [];
  const F = (text, ziel = 'rechnung') => fehler.push({ text, ziel });
  const W = (text, ziel = 'rechnung') => warnungen.push({ text, ziel });
  const storno = rechnung.typ === 'storno';
  const reverseCharge = istReverseCharge(kunde, rechnung);
  const privat = kunde?.typ === 'privat';
  const amGrundstueck = privat && rechnung.amGrundstueck !== false;
  const summen = berechne(rechnung, { reverseCharge });

  // ── Deine Angaben (§ 14 Abs. 4 Nr. 1 und 2 UStG) ──
  if (leer(firma.name)) F('Firmenname fehlt (Einstellungen → Mein Unternehmen).', 'firma');
  if (leer(firma.strasse) || leer(firma.plz) || leer(firma.ort)) F('Deine vollständige Anschrift fehlt (Einstellungen → Mein Unternehmen).', 'firma');
  if (leer(firma.steuernummer) && leer(firma.ustId)) F('Steuernummer oder USt-IdNr. fehlt (Einstellungen → Mein Unternehmen).', 'firma');
  if (!leer(firma.ustId) && !ustIdGueltig(firma.ustId)) F('Deine USt-IdNr. hat nicht das Format DE + 9 Ziffern.', 'firma');
  if (!leer(firma.steuernummer) && !steuernummerPlausibel(firma.steuernummer)) W('Deine Steuernummer sieht ungewöhnlich aus (10–13 Ziffern erwartet).', 'firma');
  if (leer(firma.iban)) W('Keine Bankverbindung hinterlegt – der Kunde weiß nicht, wohin er zahlen soll.', 'firma');

  // ── Kunde (§ 14 Abs. 4 Nr. 1 UStG) ──
  if (!kunde) F('Bitte einen Kunden wählen.', 'kunde');
  else {
    if (leer(kunde.name)) F('Name des Kunden fehlt.', 'kunde');
    if (leer(kunde.strasse) || leer(kunde.plz) || leer(kunde.ort)) F('Vollständige Anschrift des Kunden fehlt.', 'kunde');
    if (kunde.typ === 'behoerde') {
      W('Behörden verlangen eine E-Rechnung (XRechnung). Die XRechnung ist der nächste große Baustein – bis dahin mit der Behörde klären, ob ein PDF genügt.', 'kunde');
      if (leer(kunde.leitwegId)) W('Leitweg-ID der Behörde fehlt (steht im Auftrag oder bei der Behörde).', 'kunde');
    }
    if (kunde.typ === 'firma' && !storno) {
      const kleinbetrag = summen.bruttoCent <= 25000;
      const eRechnungPflicht = !kleinbetrag && (datum >= '2028-01-01' || (datum >= '2027-01-01' && firma.umsatzUeber800k));
      if (eRechnungPflicht) W('Für diesen Firmenkunden ist eine E-Rechnung (ZUGFeRD oder XRechnung) Pflicht – ein PDF reicht nicht mehr.', 'kunde');
    }
    if (kunde.versand === 'mail' && leer(kunde.zustimmungMail) && kunde.typ !== 'behoerde') {
      W('Für eine PDF-Rechnung per Mail braucht es die Zustimmung des Kunden (formlos genügt). Beim Kunden vermerken, sobald sie vorliegt.', 'kunde');
    }
  }

  // ── Leistung (§ 14 Abs. 4 Nr. 5 und 6 UStG) ──
  const aktive = summen.positionen;
  if (!aktive.length) F('Die Rechnung hat keine Positionen.');
  for (const p of aktive) {
    const name = String(p.bezeichnung || '').trim();
    const ziel = 'position:' + p.id;
    if (name.length < 2) F('Eine Position hat keine Bezeichnung.', ziel);
    else if (ALLGEMEIN.test(name)) W(`Position „${name}" genauer beschreiben (z. B. „Arbeitszeit Geselle" oder „Eckventil 1/2"").`, ziel);
    if (!Number(p.menge)) F(`Position „${name || '…'}": Menge fehlt.`, ziel);
    if (p.preisCent === null || p.preisCent === undefined || p.preisCent === '') F(`Position „${name || '…'}": Preis fehlt.`, ziel);
    if (leer(p.einheit)) F(`Position „${name || '…'}": Einheit fehlt.`, ziel);
  }
  if (!istIso(rechnung.leistungVon)) F('Leistungsdatum fehlt.');
  else {
    if (istIso(rechnung.leistungBis) && rechnung.leistungBis < rechnung.leistungVon) F('Das Ende des Leistungszeitraums liegt vor dem Beginn.');
    const ende = istIso(rechnung.leistungBis) ? rechnung.leistungBis : rechnung.leistungVon;
    if (ende > datum) W('Das Leistungsdatum liegt nach dem Rechnungsdatum.');
    if (!storno && plusMonate(ende, 6) < datum && (kunde?.typ !== 'privat' || amGrundstueck)) {
      W(`Die Leistung liegt mehr als 6 Monate zurück (${tageZwischen(ende, datum)} Tage). Rechnungen an Unternehmen und für Arbeiten am Grundstück sind innerhalb von 6 Monaten zu stellen (§ 14 Abs. 2 UStG).`);
    }
  }
  if (storno && !(original && original.nummer)) F('Die Stornorechnung braucht einen Bezug auf die ursprüngliche Rechnung.');
  if (!storno && summen.bruttoCent < 0) W('Negativer Rechnungsbetrag – für Korrekturen bitte „Stornieren" bei der ursprünglichen Rechnung nutzen.');
  if (!storno && summen.bruttoCent === 0 && aktive.length) W('Der Rechnungsbetrag ist 0,00 €.');

  // ── Hinweise, die auf die Rechnung gedruckt werden ──
  if (storno && original) hinweise.push({ id: 'storno', text: `Diese Stornorechnung hebt die Rechnung Nr. ${original.nummer} vom ${datumDe(original.datum)} vollständig auf.` });
  if (reverseCharge) hinweise.push({ id: '13b', text: 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b Abs. 2 Nr. 4, Abs. 5 UStG). Die Umsatzsteuer schulden Sie als Leistungsempfänger.' });
  if (firma.versteuerung === 'ist' && datum >= '2028-01-01') hinweise.push({ id: 'ist', text: 'Versteuerung nach vereinnahmten Entgelten.' });
  if (amGrundstueck && !storno && !reverseCharge && summen.arbeitBruttoCent > 0) {
    hinweise.push({ id: '35a', text: `Im Rechnungsbetrag enthaltene Arbeits-, Maschinen- und Fahrtkosten (§ 35a EStG): ${euro(summen.arbeitBruttoCent)} (netto ${euro(summen.arbeitNettoCent)} zzgl. ${euro(summen.arbeitSteuerCent)} USt).` });
  }
  if (amGrundstueck) hinweise.push({ id: 'aufbewahrung', text: 'Als Privatkunde sind Sie gesetzlich verpflichtet, diese Rechnung zwei Jahre aufzubewahren (§ 14b Abs. 1 Satz 5 UStG).' });

  // ── Zahlung ──
  const tage = zahlungszielTage(rechnung, kunde, firma);
  const faellig = plusTage(datum, tage);
  let zahlung = '';
  if (summen.bruttoCent > 0) {
    zahlung = tage === 0 ? 'Der Rechnungsbetrag ist sofort ohne Abzug fällig.' : `Bitte überweisen Sie den Rechnungsbetrag ohne Abzug bis zum ${datumDe(faellig)} unter Angabe der Rechnungsnummer.`;
    if (privat) hinweise.push({ id: 'verzug', text: 'Sie kommen spätestens 30 Tage nach Fälligkeit und Zugang dieser Rechnung auch ohne Mahnung in Verzug (§ 286 Abs. 3 BGB).' });
  } else if (summen.bruttoCent < 0) zahlung = `Den Betrag von ${euro(-summen.bruttoCent)} erstatten wir Ihnen bzw. verrechnen ihn.`;

  return { ok: fehler.length === 0, fehler, warnungen, hinweise, summen, reverseCharge, privat, amGrundstueck, faellig, zahlungszielTage: tage, zahlung, kundentyp: kunde ? KUNDENTYPEN[kunde.typ] : '' };
}
