// Vom Text zur Rechnungsposition (Stufe 1, komplett offline):
// Aus einer Notiz oder einem Diktat wie „Bei Schneider 2,5 Std. Silikonfuge erneuert, 4 Meter, Anfahrt"
// werden Kunde, Leistungen aus deinem Katalog und Mengen herausgesucht. Die App zeigt das nur als Vorschlag –
// übernommen wird erst, was du bestätigst.

export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const STOPP = new Set(('und oder mit ohne bei beim im in am an auf aus von vom zum zur der die das den dem des ein eine einen einem einer ' +
  'neu neue neuen erneuert getauscht gewechselt gemacht erledigt heute gestern noch dann plus sowie inkl inklusive ca etwa fuer kunde ' +
  'familie herr frau firma std stunde stunden stk stueck meter pauschal').split(' '));
const woerter = s => norm(s).split(/[^a-z0-9²³]+/).filter(w => w.length >= 3 && !STOPP.has(w) && !/^\d+$/.test(w));
const stamm = w => w.slice(0, Math.min(w.length, 6));
const passt = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (stamm(a) === stamm(b) || a.startsWith(b) || b.startsWith(a)));

const EINHEIT_WORTE = [
  [/^(std|stunden?|h|std\.)$/, 'Std.'], [/^(stk|stueck|st|x|mal)$/, 'Stk.'], [/^(m2|m²|qm|quadratmeter)$/, 'm²'],
  [/^(m3|m³|kubikmeter)$/, 'm³'], [/^(lfm|laufmeter)$/, 'lfm'], [/^(m|meter)$/, 'm'], [/^(km|kilometer)$/, 'km'],
  [/^(kg|kilo|kilogramm)$/, 'kg'], [/^(l|liter)$/, 'l'], [/^(tag|tage|tagen)$/, 'Tag']
];
const einheitAus = w => { for (const [re, e] of EINHEIT_WORTE) if (re.test(w)) return e; return null; };
const VERWANDT = { 'm': ['m', 'lfm'], 'lfm': ['m', 'lfm'], 'Stk.': ['Stk.', 'Satz'], 'Std.': ['Std.'] };
const vertraeglich = (mengenEinheit, katalogEinheit) => !mengenEinheit ? ['Stk.', 'pauschal', 'Satz'].includes(katalogEinheit)
  : (VERWANDT[mengenEinheit] || [mengenEinheit]).includes(katalogEinheit);

function mengenIn(abschnitt) {
  const out = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(std\.?|stunden?|h\b|stk\.?|stück|stueck|x\b|mal\b|m²|m2|qm|quadratmeter|m³|m3|lfm|laufmeter|meter|m\b|km|kilometer|kg|kilo|liter|l\b|tage?n?\b)?/gi;
  let m;
  while ((m = re.exec(abschnitt))) {
    const menge = Number(m[1].replace(',', '.'));
    if (!Number.isFinite(menge) || menge <= 0 || menge > 100000) continue;
    out.push({ menge, einheit: m[2] ? einheitAus(norm(m[2]).replace(/\.$/, '')) : null, text: m[0].trim() });
  }
  return out;
}

/**
 * @param {string} text
 * @param {Array} leistungen  Katalog
 * @param {Array} kunden
 * @returns {{ kunde: object|null, positionen: Array<{leistungId, bezeichnung, menge, einheit, quelle}> }}
 */
export function vorschlaegeAus(text, leistungen = [], kunden = []) {
  const ergebnis = { kunde: null, positionen: [] };
  if (!String(text || '').trim()) return ergebnis;

  // Kunde: Namensbestandteile (ab 4 Buchstaben) im Text
  const textWoerter = woerter(text);
  let besterKunde = null, besterKundeWert = 0;
  for (const k of kunden) {
    if (k._geloescht) continue;
    const teile = woerter(k.name).filter(w => w.length >= 4 && !['gmbh', 'bauer', 'haus'].includes(w));
    const wert = teile.filter(t => textWoerter.some(w => passt(w, t))).length;
    if (wert > besterKundeWert) { besterKunde = k; besterKundeWert = wert; }
  }
  if (besterKunde) ergebnis.kunde = { id: besterKunde.id, name: besterKunde.name };

  const katalog = leistungen.filter(l => !l._geloescht && l.aktiv !== false)
    .map(l => ({ l, worte: [...new Set([...woerter(l.bezeichnung), ...woerter(l.suchwoerter)])] }));
  const standardArbeit = leistungen.find(l => !l._geloescht && l.art === 'arbeit' && l.einheit === 'Std.' && l.favorit)
    || leistungen.find(l => !l._geloescht && l.art === 'arbeit' && l.einheit === 'Std.');
  const dazu = (l, menge, quelle) => {
    const da = ergebnis.positionen.find(x => x.leistungId === l.id);
    if (da) { if (menge && da.ohneMenge) { da.menge = menge; da.ohneMenge = false; } return da; }
    const p = { leistungId: l.id, bezeichnung: l.bezeichnung, menge: menge || 1, einheit: l.einheit, quelle, ohneMenge: !menge };
    ergebnis.positionen.push(p);
    return p;
  };

  for (const abschnitt of String(text).split(/(?<!\d),|,(?!\d)|[;\n]+|\.\s|\s+und\s+|\s+sowie\s+|\s+plus\s+/i)) {
    if (!abschnitt.trim()) continue;
    const aw = woerter(abschnitt);
    const mengen = mengenIn(abschnitt);
    const treffer = katalog.map(k => ({ l: k.l, wert: k.worte.filter(t => aw.some(w => passt(w, t))).length }))
      .filter(t => t.wert > 0).sort((a, b) => b.wert - a.wert);
    const genommen = new Set();
    for (const t of treffer.slice(0, 2)) {
      if (t.wert < treffer[0].wert) break;
      const i = mengen.findIndex((m, idx) => !genommen.has(idx) && vertraeglich(m.einheit, t.l.einheit));
      if (i >= 0) genommen.add(i);
      dazu(t.l, i >= 0 ? mengen[i].menge : (t.l.einheit === 'pauschal' ? 1 : null), abschnitt.trim());
    }
    mengen.forEach((m, i) => {
      if (genommen.has(i)) return;
      // Menge ohne eigene Leistung („…, 4 Meter") gehört zur vorherigen Leistung ohne Menge
      const offen = ergebnis.positionen.find(p => p.ohneMenge && vertraeglich(m.einheit, p.einheit));
      if (offen) { offen.menge = m.menge; offen.ohneMenge = false; offen.quelle += ', ' + abschnitt.trim(); }
      else if (m.einheit === 'Std.' && standardArbeit) dazu(standardArbeit, m.menge, abschnitt.trim()); // übrige Stunden → Arbeitszeit
    });
  }
  ergebnis.positionen.forEach(p => delete p.ohneMenge);
  return ergebnis;
}
