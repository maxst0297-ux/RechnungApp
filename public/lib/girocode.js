// GiroCode (EPC-QR-Code): Banking-Apps lesen daraus Empfänger, IBAN, Betrag und Verwendungszweck.
// Standard: EPC069-12, Version 002, Zeichensatz UTF-8, Fehlerkorrektur M.
import qrcode from 'qrcode-generator';

export const ibanNormal = s => String(s || '').replace(/\s/g, '').toUpperCase();
export const ibanText = s => ibanNormal(s).replace(/(.{4})/g, '$1 ').trim();

/** Prüfziffer nach ISO 13616 (mod 97). */
export function ibanGueltig(s) {
  const iban = ibanNormal(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith('DE') && iban.length !== 22) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of umgestellt) {
    const wert = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const z of wert) rest = (rest * 10 + Number(z)) % 97;
  }
  return rest === 1;
}

/** Inhalt des QR-Codes – oder null, wenn keine gültige IBAN oder kein positiver Betrag. */
export function epcText({ name, iban, bic, betragCent, zweck }) {
  if (!ibanGueltig(iban) || !(betragCent > 0) || betragCent > 99999999999) return null;
  const empfaenger = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  if (!empfaenger) return null;
  return ['BCD', '002', '1', 'SCT', String(bic || '').replace(/\s/g, '').toUpperCase(), empfaenger, ibanNormal(iban),
    'EUR' + (betragCent / 100).toFixed(2), '', '', String(zweck || '').replace(/\s+/g, ' ').trim().slice(0, 140)].join('\n');
}

const utf8 = s => Array.from(new TextEncoder().encode(s));

/** QR-Code als Raster (true = dunkles Modul). */
export function qrMatrix(text) {
  const vorher = qrcode.stringToBytes;
  qrcode.stringToBytes = utf8;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
  } finally { qrcode.stringToBytes = vorher; }
}

/** QR-Code als SVG (für die Vorschau in der App). */
export function qrSvg(matrix, { rand = 2 } = {}) {
  const n = matrix.length, g = n + 2 * rand;
  let pfad = '';
  matrix.forEach((zeile, r) => zeile.forEach((dunkel, c) => { if (dunkel) pfad += `M${c + rand} ${r + rand}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g} ${g}" shape-rendering="crispEdges" role="img" aria-label="GiroCode">` +
    `<rect width="${g}" height="${g}" fill="#ffffff"/><path d="${pfad}" fill="#000000"/></svg>`;
}
