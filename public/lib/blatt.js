// Seitenansicht einer Rechnung („Blatt") als HTML – gleiche Anordnung wie das PDF vom Laptop (DIN 5008, Form B).
// Wird im Rechnungseditor live neu gezeichnet und zeigt festgeschriebene Rechnungen so, wie sie verschickt wurden.
import { euro, mengeText } from './geld.js';
import { anrede, anschriftZeilen, absenderZeile, infoZeilen, betreffZeile, fussSpalten } from './brief.js';
import { abschnitte } from './festschreiben.js';
import { epcText, qrMatrix, qrSvg, ibanText } from './girocode.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {object} fest       Druckfassung (festeFassung bzw. rechnung.fest)
 * @param {object} o
 * @param {boolean} o.entwurf  Wasserzeichen, keine Nummer, kein GiroCode
 * @param {string} [o.logo]    Logo als data:-URL
 */
export function blattHtml(fest, { entwurf = false, logo = null } = {}) {
  const f = fest.firma || {}, k = fest.kunde || {}, s = fest.summen;
  const mehrere = new Set(fest.positionen.map(p => p.satz)).size > 1;
  const spalten = mehrere ? 7 : 6;
  const epc = !entwurf && fest.typ !== 'storno' ? epcText({ name: f.kontoinhaber || f.name, iban: f.iban, bic: f.bic, betragCent: s.bruttoCent, zweck: `Rechnung ${fest.nummer}` }) : null;
  const anschrift = k.name ? anschriftZeilen(k).map(esc).join('<br>') : '<span class="b-leer">Anschrift des Kunden</span>';
  const zeile = p => `<tr><td class="b-nr">${p.pos}</td><td>${esc(p.bezeichnung) || '<span class="b-leer">Bezeichnung</span>'}${p.beschreibung ? `<small>${esc(p.beschreibung)}</small>` : ''}</td>
    <td class="r">${mengeText(p.menge)}</td><td>${esc(p.einheit)}</td><td class="r">${euro(p.preisCent)}</td>${mehrere ? `<td class="r">${fest.reverseCharge ? '–' : p.satz + ' %'}</td>` : ''}<td class="r">${euro(p.nettoCent)}</td></tr>`;
  // Bei Gliederung nach Kategorien: Überschrift und Zwischensumme je Abschnitt (wie im PDF)
  const koerper = fest.positionen.length
    ? abschnitte(fest).map(a => (a.name ? `<tr class="b-gruppe"><td></td><td colspan="${spalten - 1}">${esc(a.name)}</td></tr>` : '')
      + a.positionen.map(zeile).join('')
      + (a.name ? `<tr class="b-zwischen"><td></td><td colspan="${spalten - 2}" class="r">Summe ${esc(a.name)}</td><td class="r">${euro(a.nettoCent)}</td></tr>` : '')).join('')
    : `<tr><td></td><td colspan="${spalten - 1}" class="b-leer">Noch keine Positionen</td></tr>`;
  const summen = [`<div><span>Summe netto</span><span>${euro(s.nettoCent)}</span></div>`,
    ...(fest.reverseCharge ? [`<div><span>Umsatzsteuer (Steuerschuld beim Leistungsempfänger)</span><span>${euro(0)}</span></div>`]
      : s.gruppen.map(g => `<div><span>${g.satz > 0 ? `zzgl. ${g.satz} % USt auf ${euro(g.nettoCent)}` : `steuerfrei auf ${euro(g.nettoCent)}`}</span><span>${euro(g.steuerCent)}</span></div>`)),
    `<div class="ges"><span>${fest.typ === 'storno' ? 'Gutschriftsbetrag' : 'Rechnungsbetrag'}</span><span>${euro(s.bruttoCent)}</span></div>`].join('');
  return `<div class="blatt-huelle" data-blatt><div class="blatt">
    <div class="b-falz" style="top:105mm"></div><div class="b-falz" style="top:148.5mm;width:7mm"></div><div class="b-falz" style="top:210mm"></div>
    ${entwurf ? '<div class="b-wasser">ENTWURF</div>' : ''}
    <div class="b-firma"><div><strong>${esc(f.name || 'Dein Firmenname')}</strong>${f.zusatz ? `<span>${esc(f.zusatz)}</span>` : ''}</div>${logo ? `<img src="${esc(logo)}" alt="">` : ''}</div>
    <div class="b-fenster"><div class="b-absender">${esc(absenderZeile(f))}</div><div class="b-anschrift">${anschrift}</div></div>
    <dl class="b-info">${infoZeilen(fest, { entwurf }).map(([l, w]) => `<dt>${esc(l)}</dt><dd>${esc(w)}</dd>`).join('')}</dl>
    <div class="b-text">
      <div><h2>${esc(betreffZeile(fest, { entwurf }))}</h2>${fest.betreff ? `<p style="margin-top:1.5mm">${esc(fest.betreff)}</p>` : ''}</div>
      <p>${esc(anrede(k))}</p>${fest.einleitung ? `<p>${esc(fest.einleitung)}</p>` : ''}
      <table class="b-tabelle"><thead><tr><th>Pos.</th><th>Leistung</th><th class="r">Menge</th><th>Einheit</th><th class="r">Einzelpreis</th>${mehrere ? '<th class="r">USt</th>' : ''}<th class="r">Betrag</th></tr></thead><tbody>${koerper}</tbody></table>
      <div class="b-summen">${summen}</div>
      <div class="b-unten"><div class="b-hinweise">${(fest.hinweise || []).map(h => `<span>${esc(h)}</span>`).join('')}${fest.zahlung ? `<strong>${esc(fest.zahlung)}</strong>` : ''}</div>
        ${epc ? `<div class="b-qr">${qrSvg(qrMatrix(epc))}GiroCode: mit der Banking-App scannen</div>` : ''}</div>
      ${fest.schluss ? `<p>${esc(fest.schluss)}<br>${esc(f.name || '')}</p>` : ''}
    </div>
    <footer class="b-fuss">${fussSpalten(f, ibanText).map(sp => `<div>${sp.map(esc).join('<br>')}</div>`).join('')}</footer>
  </div></div>`;
}
