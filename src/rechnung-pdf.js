// Rechnungs-PDF nach DIN 5008 (Form B): Anschrift passt ins Fenster eines DIN-lang-Umschlags,
// Falz- und Lochmarken, Infoblock rechts, Positionstabelle mit Seitenumbruch, Summen je Steuersatz,
// gesetzliche Hinweise, GiroCode zum Bezahlen und eine Fußzeile mit allen Firmen-, Bank- und Steuerdaten.
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { euro, mengeText } from '../public/lib/geld.js';
import { anrede, anschriftZeilen, absenderZeile, infoZeilen, betreffZeile, fussSpalten } from '../public/lib/brief.js';
import { epcText, qrMatrix, ibanText } from '../public/lib/girocode.js';

const MM = 72 / 25.4;
const SEITE = { b: 210, h: 297 };
const LINKS = 25, RECHTS = 190, FUSS_OBEN = 274, INHALT_UNTEN = 266;
const SCHWARZ = rgb(0.1, 0.1, 0.11), GRAU = rgb(0.42, 0.42, 0.45), LINIE = rgb(0.78, 0.78, 0.8), AKZENT = rgb(0.62, 0.47, 0.25), HELL = rgb(0.96, 0.95, 0.93);

// Die eingebauten PDF-Schriften kennen nur den Zeichensatz WinAnsi – alles andere wird ersetzt statt abzustürzen.
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const ERSATZ = { '→': '->', '←': '<-', '≤': '<=', '≥': '>=', '≈': '~', ' ': ' ', ' ': ' ', ' ': ' ', '−': '-', '✓': 'x' };
export function winAnsi(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.includes(ch)) out += ch;
    else if (ERSATZ[ch]) out += ERSATZ[ch];
    else if (ch === '\t') out += ' ';
    else if (ch !== '\n' && ch !== '\r') out += '?';
  }
  return out;
}

function umbrechen(text, font, groesse, breite) {
  const zeilen = [];
  for (const absatz of String(text ?? '').split(/\r?\n/)) {
    let zeile = '';
    for (const wort of winAnsi(absatz).split(/ +/)) {
      const versuch = zeile ? zeile + ' ' + wort : wort;
      if (font.widthOfTextAtSize(versuch, groesse) <= breite) { zeile = versuch; continue; }
      if (zeile) zeilen.push(zeile);
      let rest = wort;
      while (font.widthOfTextAtSize(rest, groesse) > breite && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), groesse) > breite) n--;
        zeilen.push(rest.slice(0, n)); rest = rest.slice(n);
      }
      zeile = rest;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

async function logoEinbetten(doc, dataUrl) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  try { return m[1].toLowerCase() === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes); } catch { return null; }
}

/**
 * @param {object} a
 * @param {object} a.fest      Druckfassung (siehe festeFassung in public/lib/festschreiben.js)
 * @param {string} [a.logo]    Logo als data:-URL (PNG/JPEG)
 * @param {boolean} [a.entwurf] Entwurf: Wasserzeichen „ENTWURF", keine Nummer
 * @param {string} [a.erstellt] Zeitpunkt der Festschreibung (ISO) für die PDF-Metadaten
 * @returns {Promise<Uint8Array>}
 */
export async function erstelleRechnungsPdf({ fest, logo = null, entwurf = false, erstellt = null }) {
  const f = fest.firma || {}, k = fest.kunde || {};
  const storno = fest.typ === 'storno';
  const titel = (storno ? 'Stornorechnung' : 'Rechnung') + (entwurf ? ' (Entwurf)' : ` Nr. ${fest.nummer}`);
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(titel)); doc.setAuthor(winAnsi(f.name || '')); doc.setCreator('RechnungApp'); doc.setProducer('RechnungApp (pdf-lib)');
  doc.setSubject(winAnsi(`${titel} an ${k.name || ''}`)); doc.setLanguage('de-DE');
  if (erstellt) { doc.setCreationDate(new Date(erstellt)); doc.setModificationDate(new Date(erstellt)); }
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const fett = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoBild = await logoEinbetten(doc, logo);

  const seiten = [];
  let seite = null;
  const y = mm => (SEITE.h - mm) * MM;
  const x = mm => mm * MM;
  const text = (t, xmm, ymm, { font = normal, groesse = 9.5, farbe = SCHWARZ, rechts = false } = {}) => {
    const s = winAnsi(t);
    const w = font.widthOfTextAtSize(s, groesse);
    seite.drawText(s, { x: rechts ? x(xmm) - w : x(xmm), y: y(ymm), size: groesse, font, color: farbe });
    return w / MM;
  };
  const linie = (x1, y1, x2, y2, { farbe = LINIE, dicke = 0.6 } = {}) => seite.drawLine({ start: { x: x(x1), y: y(y1) }, end: { x: x(x2), y: y(y2) }, thickness: dicke, color: farbe });
  const neueSeite = () => {
    seite = doc.addPage([SEITE.b * MM, SEITE.h * MM]); seiten.push(seite);
    // Falzmarken (105 mm / 210 mm) und Lochmarke (148,5 mm) am linken Rand
    linie(4, 105, 9, 105, { farbe: GRAU, dicke: 0.4 }); linie(4, 210, 9, 210, { farbe: GRAU, dicke: 0.4 }); linie(4, 148.5, 11, 148.5, { farbe: GRAU, dicke: 0.4 });
    if (entwurf) seite.drawText('ENTWURF', { x: x(42), y: y(205), size: 96, font: fett, color: rgb(0.86, 0.84, 0.8), rotate: degrees(40), opacity: 0.55 });
    return seite;
  };

  // ── Seite 1: Briefkopf ──
  neueSeite();
  let logoBreite = 0;
  if (logoBild) {
    const sk = Math.min((60 * MM) / logoBild.width, (24 * MM) / logoBild.height);
    const w = logoBild.width * sk, h = logoBild.height * sk;
    seite.drawImage(logoBild, { x: x(RECHTS) - w, y: y(12) - h, width: w, height: h });
    logoBreite = w / MM;
  }
  text(f.name || '', LINKS, 20, { font: fett, groesse: 15 });
  if (f.zusatz) text(f.zusatz, LINKS, 26, { groesse: 9, farbe: GRAU });
  linie(LINKS, 31, RECHTS - (logoBreite ? logoBreite + 4 : 0), 31, { farbe: AKZENT, dicke: 1.2 });

  // Rücksendeangabe + Anschrift (Fenster)
  const absW = text(absenderZeile(f), LINKS, 58.5, { groesse: 7, farbe: GRAU });
  linie(LINKS, 59.4, LINKS + Math.min(absW, 80), 59.4, { farbe: GRAU, dicke: 0.3 });
  anschriftZeilen(k).forEach((z, i) => text(z, LINKS, 66 + i * 4.4, { groesse: 10 }));

  // Infoblock rechts
  const info = infoZeilen(fest, { entwurf });
  info.forEach(([l, w], i) => { text(l, 125, 54 + i * 4.6, { groesse: 8, farbe: GRAU }); text(w, 152, 54 + i * 4.6, { groesse: 9 }); });

  // Betreff, Anrede, Einleitung
  let pos = 103;
  text(betreffZeile(fest, { entwurf }), LINKS, pos, { font: fett, groesse: 13 });
  pos += 6;
  if (fest.betreff) { for (const z of umbrechen(fest.betreff, normal, 10, (RECHTS - LINKS) * MM)) { text(z, LINKS, pos, { groesse: 10 }); pos += 4.6; } }
  pos += 4;
  text(anrede(k), LINKS, pos, { groesse: 10 }); pos += 6;
  if (fest.einleitung) { for (const z of umbrechen(fest.einleitung, normal, 10, (RECHTS - LINKS) * MM)) { text(z, LINKS, pos, { groesse: 10 }); pos += 4.6; } pos += 3; }

  // ── Positionstabelle ──
  const mehrereSaetze = new Set(fest.positionen.map(p => p.satz)).size > 1;
  const SP = { pos: LINKS, bez: LINKS + 9, menge: mehrereSaetze ? 124 : 132, einheit: mehrereSaetze ? 126 : 134, preis: mehrereSaetze ? 158 : 166, satz: 170, betrag: RECHTS };
  const bezBreite = (SP.menge - 14 - SP.bez) * MM;
  const kopf = () => {
    seite.drawRectangle({ x: x(LINKS - 1.5), y: y(pos + 2), width: (RECHTS - LINKS + 3) * MM, height: 6.4 * MM, color: HELL });
    text('Pos.', SP.pos, pos, { font: fett, groesse: 8 }); text('Leistung', SP.bez, pos, { font: fett, groesse: 8 });
    text('Menge', SP.menge, pos, { font: fett, groesse: 8, rechts: true }); text('Einheit', SP.einheit, pos, { font: fett, groesse: 8 });
    text('Einzelpreis', SP.preis, pos, { font: fett, groesse: 8, rechts: true });
    if (mehrereSaetze) text('USt', SP.satz + 4, pos, { font: fett, groesse: 8, rechts: true });
    text('Betrag', SP.betrag, pos, { font: fett, groesse: 8, rechts: true });
    pos += 6.5;
  };
  const folgeseite = () => {
    neueSeite();
    text(`${storno ? 'Stornorechnung' : 'Rechnung'} ${entwurf ? '(Entwurf)' : 'Nr. ' + fest.nummer} · ${f.name || ''}`, LINKS, 18, { groesse: 8.5, farbe: GRAU });
    pos = 28;
  };
  kopf();
  const zeilePosition = p => {
    const bez = umbrechen(p.bezeichnung, normal, 9.5, bezBreite);
    const besch = p.beschreibung ? umbrechen(p.beschreibung, normal, 8, bezBreite) : [];
    const unten = (bez.length - 1) * 4.3 + (besch.length ? 4.3 - 0.6 + (besch.length - 1) * 3.6 : 0);   // letzte Grundlinie relativ zu pos
    if (pos + unten + 2 > INHALT_UNTEN) { folgeseite(); kopf(); }
    text(String(p.pos), SP.pos, pos, { groesse: 9.5, farbe: GRAU });
    bez.forEach((z, i) => text(z, SP.bez, pos + i * 4.3, { groesse: 9.5 }));
    besch.forEach((z, i) => text(z, SP.bez, pos + bez.length * 4.3 - 0.6 + i * 3.6, { groesse: 8, farbe: GRAU }));
    text(mengeText(p.menge), SP.menge, pos, { rechts: true });
    text(p.einheit, SP.einheit, pos);
    text(euro(p.preisCent), SP.preis, pos, { rechts: true });
    if (mehrereSaetze) text(fest.reverseCharge ? '–' : `${p.satz} %`, SP.satz + 4, pos, { rechts: true, groesse: 8.5, farbe: GRAU });
    text(euro(p.nettoCent), SP.betrag, pos, { rechts: true });
    const trenner = pos + unten + 1.9;
    linie(LINKS, trenner, RECHTS, trenner, { dicke: 0.3 });
    pos = trenner + 4.6;
  };
  fest.positionen.forEach(zeilePosition);

  // ── Summen ──
  const s = fest.summen;
  const summenZeilen = [['Summe netto', euro(s.nettoCent)]];
  if (fest.reverseCharge) summenZeilen.push(['Umsatzsteuer (Steuerschuld beim Leistungsempfänger)', euro(0)]);
  else for (const g of s.gruppen) summenZeilen.push([g.satz > 0 ? `zzgl. ${g.satz} % USt auf ${euro(g.nettoCent)}` : `steuerfrei (0 %) auf ${euro(g.nettoCent)}`, euro(g.steuerCent)]);
  if (pos + summenZeilen.length * 4.8 + 10 > INHALT_UNTEN) { folgeseite(); }
  pos += 2.5;
  for (const [l, w] of summenZeilen) { text(l, 166, pos, { groesse: 9, farbe: GRAU, rechts: true }); text(w, RECHTS, pos, { rechts: true }); pos += 4.8; }
  linie(120, pos - 2.6, RECHTS, pos - 2.6, { farbe: SCHWARZ, dicke: 0.8 });
  pos += 2.6;
  text(storno ? 'Gutschriftsbetrag' : 'Rechnungsbetrag', 166, pos, { font: fett, groesse: 11, rechts: true });
  text(euro(s.bruttoCent), RECHTS, pos, { font: fett, groesse: 11, rechts: true });
  pos += 9;

  // ── Hinweise, Zahlung, GiroCode ──
  const epc = !entwurf && !storno ? epcText({ name: f.kontoinhaber || f.name, iban: f.iban, bic: f.bic, betragCent: s.bruttoCent, zweck: `Rechnung ${fest.nummer}` }) : null;
  const qrBreite = epc ? 26 : 0;
  const textBreite = (RECHTS - LINKS - (epc ? qrBreite + 6 : 0)) * MM;
  const block = [];
  for (const h of fest.hinweise || []) block.push(...umbrechen(h, normal, 8.5, textBreite), '');
  if (fest.zahlung) block.push(...umbrechen(fest.zahlung, fett, 9, textBreite).map(z => '§B' + z), '');
  const blockHoehe = block.length * 3.9;
  if (pos + Math.max(blockHoehe, qrBreite + 4) > INHALT_UNTEN) folgeseite();
  const blockStart = pos;
  for (const z of block) {
    if (z.startsWith('§B')) text(z.slice(2), LINKS, pos, { font: fett, groesse: 9 });
    else if (z) text(z, LINKS, pos, { groesse: 8.5, farbe: SCHWARZ });
    pos += z ? 3.9 : 1.8;
  }
  if (epc) {
    const matrix = qrMatrix(epc);
    const n = matrix.length, modul = (qrBreite - 2) / n, qx = RECHTS - qrBreite + 1, qy = blockStart - 3;
    seite.drawRectangle({ x: x(qx - 1), y: y(qy + qrBreite - 1), width: qrBreite * MM, height: qrBreite * MM, color: rgb(1, 1, 1), borderColor: LINIE, borderWidth: 0.4 });
    matrix.forEach((zeile, r) => zeile.forEach((dunkel, c) => {
      if (dunkel) seite.drawRectangle({ x: x(qx + c * modul), y: y(qy + (r + 1) * modul), width: modul * MM + 0.15, height: modul * MM + 0.15, color: rgb(0, 0, 0) });
    }));
    text('GiroCode: mit der', RECHTS, qy + qrBreite + 2.2, { groesse: 6.5, farbe: GRAU, rechts: true });
    text('Banking-App scannen', RECHTS, qy + qrBreite + 4.8, { groesse: 6.5, farbe: GRAU, rechts: true });
    pos = Math.max(pos, qy + qrBreite + 7);
  }
  if (fest.schluss) {
    if (pos + 12 > INHALT_UNTEN) folgeseite();
    pos += 2;
    for (const z of umbrechen(fest.schluss, normal, 10, (RECHTS - LINKS) * MM)) { text(z, LINKS, pos, { groesse: 10 }); pos += 4.6; }
    text(f.name || '', LINKS, pos + 1, { groesse: 10 });
  }

  // ── Fußzeile + Seitenzahlen auf jeder Seite ──
  const spalten = fussSpalten(f, ibanText);
  const breiten = [42, 40, 46, 37];
  seiten.forEach((sp, i) => {
    seite = sp;
    linie(LINKS, FUSS_OBEN, RECHTS, FUSS_OBEN, { dicke: 0.4 });
    let sx = LINKS;
    spalten.forEach((zeilen, si) => {
      const alle = zeilen.flatMap(z => umbrechen(z, normal, 6.8, (breiten[si] - 2) * MM)).slice(0, 5);
      alle.forEach((z, zi) => text(z, sx, FUSS_OBEN + 4 + zi * 3.1, { groesse: 6.8, farbe: GRAU }));
      sx += breiten[si];
    });
    if (seiten.length > 1) text(`Seite ${i + 1} von ${seiten.length}`, RECHTS, FUSS_OBEN - 2, { groesse: 7.5, farbe: GRAU, rechts: true });
  });
  return doc.save();
}
