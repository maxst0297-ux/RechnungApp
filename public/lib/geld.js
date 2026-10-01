// Geldbeträge werden überall in Cent (ganze Zahlen) gerechnet – so entstehen keine Rundungsfehler.
// Läuft im Browser und auf dem Laptop-Server (Node) gleich.

/** Kaufmännisch runden, symmetrisch für negative Beträge (Storno): 0,5 → 1, −0,5 → −1. */
export function rundeCent(x) {
  const n = Number(x) || 0;
  const r = Math.round(Math.abs(n) + 1e-7);
  return n < 0 ? -r : r;
}

/** „1.234,56", „1234,5", „1234.56", „45" → Cent. Leere/ungültige Eingabe → null. */
export function centAus(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? rundeCent(text * 100) : null;
  let s = String(text ?? '').trim().replace(/\s|€/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d*(\.\d*)?$/.test(s) || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? rundeCent(n * 100) : null;
}

/** Menge aus Eingabe („2,5" → 2.5), höchstens 3 Nachkommastellen. */
export function mengeAus(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? Math.round(text * 1000) / 1000 : null;
  const s = String(text ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!s || !/^-?\d*(\.\d*)?$/.test(s) || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
}

const fmt2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMenge = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });

/** 24764 → „247,64 €" */
export function euro(cent, { zeichen = true } = {}) {
  const t = fmt2.format((Number(cent) || 0) / 100);
  return zeichen ? t + ' €' : t;
}
/** 24764 → „247,64" (für Eingabefelder) */
export const centText = cent => (cent == null ? '' : fmt2.format(cent / 100));
/** 2.5 → „2,5" */
export const mengeText = m => (m == null ? '' : fmtMenge.format(m));
