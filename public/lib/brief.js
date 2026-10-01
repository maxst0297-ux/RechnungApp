// Gemeinsame Bausteine für den Rechnungsbrief – gleich im PDF (Laptop) und in der Seitenansicht der App.
import { datumDe, zeitraumDe } from './datum.js';

export function anrede(kunde) {
  const name = String(kunde?.name || '').trim();
  const nachname = name.split(/\s+/).pop();
  if (kunde?.anrede === 'Herr') return `Sehr geehrter Herr ${nachname},`;
  if (kunde?.anrede === 'Frau') return `Sehr geehrte Frau ${nachname},`;
  if (/^familie\s/i.test(name)) return `Sehr geehrte ${name},`;
  return 'Sehr geehrte Damen und Herren,';
}

export function anschriftZeilen(kunde) {
  const k = kunde || {};
  const zeilen = [];
  if (k.anrede === 'Herr') zeilen.push('Herrn'); else if (k.anrede === 'Frau') zeilen.push('Frau');
  zeilen.push(k.name || '');
  if (k.zusatz) zeilen.push(k.zusatz);
  if (k.strasse) zeilen.push(k.strasse);
  zeilen.push([k.plz, k.ort].filter(Boolean).join(' '));
  if (k.land && !['DE', 'Deutschland'].includes(k.land)) zeilen.push(String(k.land).toUpperCase());
  return zeilen.slice(0, 6);
}

export const absenderZeile = f => [f?.name, f?.strasse, [f?.plz, f?.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

/** Infoblock rechts oben: [Bezeichnung, Wert] */
export function infoZeilen(fest, { entwurf = false } = {}) {
  const k = fest.kunde || {}, f = fest.firma || {};
  const storno = fest.typ === 'storno';
  const z = [];
  if (!entwurf) z.push([storno ? 'Storno-Nr.' : 'Rechnungsnr.', fest.nummer]);
  z.push([entwurf ? 'Stand' : 'Rechnungsdatum', datumDe(fest.datum)]);
  if (fest.leistungVon) z.push([fest.leistungBis && fest.leistungBis !== fest.leistungVon ? 'Leistungszeitraum' : 'Leistungsdatum', zeitraumDe(fest.leistungVon, fest.leistungBis)]);
  if (k.nummer) z.push(['Kundennr.', k.nummer]);
  if (k.ustId && k.typ === 'firma') z.push(['Ihre USt-IdNr.', k.ustId]);
  if (k.leitwegId) z.push(['Leitweg-ID', k.leitwegId]);
  if (storno && fest.original) z.push(['zu Rechnung', `${fest.original.nummer} vom ${datumDe(fest.original.datum)}`]);
  if (f.telefon) z.push(['Telefon', f.telefon]);
  return z;
}

export function betreffZeile(fest, { entwurf = false } = {}) {
  if (fest.typ === 'storno') return `Stornorechnung Nr. ${fest.nummer || '…'}`;
  return entwurf ? 'Rechnung (Entwurf – noch ohne Nummer)' : `Rechnung Nr. ${fest.nummer}`;
}

/** Fußzeile in vier Spalten */
export function fussSpalten(f, ibanText) {
  return [
    [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' '), f.inhaber ? 'Inhaber/GF: ' + f.inhaber : ''],
    [f.telefon ? 'Tel. ' + f.telefon : '', f.mail, f.web],
    [f.bank, f.iban ? 'IBAN ' + ibanText(f.iban) : '', f.bic ? 'BIC ' + f.bic : ''],
    [f.steuernummer ? 'Steuernr. ' + f.steuernummer : '', f.ustId ? 'USt-IdNr. ' + f.ustId : '', f.fusszeile || '']
  ].map(z => z.filter(Boolean));
}
