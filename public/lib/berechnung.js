// Rechnungsbeträge berechnen – nach den Rechenregeln der EN 16931 (Grundlage der E-Rechnung):
// Positionsbetrag = Menge × Einzelpreis (auf Cent gerundet), Umsatzsteuer je Steuersatz auf die Summe der Positionen.
import { rundeCent } from './geld.js';

/** Art einer Position – wichtig für § 35a EStG (Arbeits-, Maschinen- und Fahrtkosten getrennt vom Material). */
export const ARTEN = {
  arbeit: 'Arbeitszeit',
  fahrt: 'Fahrtkosten',
  geraet: 'Maschinen/Geräte',
  material: 'Material',
  sonstiges: 'Sonstiges'
};
export const ARBEITSKOSTEN = new Set(['arbeit', 'fahrt', 'geraet']);

/** Einheiten mit Code nach UN/ECE Rec. 20 (wird für die E-Rechnung gebraucht). */
export const EINHEITEN = [
  { k: 'Std.', code: 'HUR' }, { k: 'Stk.', code: 'H87' }, { k: 'pauschal', code: 'LS' }, { k: 'm', code: 'MTR' },
  { k: 'm²', code: 'MTK' }, { k: 'm³', code: 'MTQ' }, { k: 'lfm', code: 'MTR' }, { k: 'km', code: 'KMT' },
  { k: 'kg', code: 'KGM' }, { k: 'l', code: 'LTR' }, { k: 'Tag', code: 'DAY' }, { k: 'Satz', code: 'SET' }
];
export const einheitCode = k => (EINHEITEN.find(e => e.k === k) || { code: 'C62' }).code;

export const STEUERSAETZE = [19, 7, 0];

export const KUNDENTYPEN = { privat: 'Privat', firma: 'Firma', behoerde: 'Behörde' };

/** Netto einer Position in Cent. */
export function positionNetto(p) {
  return rundeCent((Number(p.menge) || 0) * (Number(p.preisCent) || 0));
}

/** Nur angehakte Positionen kommen auf die Rechnung. */
export const aktivePositionen = r => (r.positionen || []).filter(p => p.aktiv !== false);

/**
 * Summen einer Rechnung.
 * @param {object} r            Rechnung/Entwurf mit positionen[]
 * @param {object} o
 * @param {boolean} o.reverseCharge  § 13b: Kunde schuldet die Steuer → 0 % (Kategorie AE)
 */
export function berechne(r, { reverseCharge = false } = {}) {
  const positionen = aktivePositionen(r).map(p => {
    const satz = reverseCharge ? 0 : Number(p.steuersatz ?? 19);
    const ustKategorie = reverseCharge ? 'AE' : satz > 0 ? 'S' : 'E';
    return { ...p, satz, ustKategorie, nettoCent: positionNetto(p) };
  });
  const gruppenMap = new Map();
  for (const p of positionen) {
    const key = p.ustKategorie + ':' + p.satz;
    const g = gruppenMap.get(key) || { ustKategorie: p.ustKategorie, satz: p.satz, nettoCent: 0, steuerCent: 0, arbeitNettoCent: 0 };
    g.nettoCent += p.nettoCent;
    if (ARBEITSKOSTEN.has(p.art)) g.arbeitNettoCent += p.nettoCent;
    gruppenMap.set(key, g);
  }
  const gruppen = [...gruppenMap.values()].sort((a, b) => b.satz - a.satz);
  let steuerCent = 0, arbeitNettoCent = 0, arbeitSteuerCent = 0;
  for (const g of gruppen) {
    g.steuerCent = rundeCent(g.nettoCent * g.satz / 100);
    steuerCent += g.steuerCent;
    arbeitNettoCent += g.arbeitNettoCent;
    arbeitSteuerCent += rundeCent(g.arbeitNettoCent * g.satz / 100);
  }
  const nettoCent = positionen.reduce((s, p) => s + p.nettoCent, 0);
  return {
    positionen, gruppen, nettoCent, steuerCent, bruttoCent: nettoCent + steuerCent,
    arbeitNettoCent, arbeitSteuerCent, arbeitBruttoCent: arbeitNettoCent + arbeitSteuerCent
  };
}
