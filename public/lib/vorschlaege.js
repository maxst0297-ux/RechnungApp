// Vom Text zur Rechnungsposition (Stufe 1, komplett offline):
// Aus einer Notiz oder einem Diktat wie „Bei Schneider zweieinhalb Stunden Silikonfuge erneuert, 4 Meter, Anfahrt"
// werden Baustelle, Kunde, Leistungen aus deinem Katalog und Mengen herausgesucht. Die App zeigt das nur als
// Vorschlag – übernommen wird erst, was du bestätigst.

export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const STOPP = new Set(('und oder mit ohne bei beim im in am an auf aus von vom zum zur der die das den dem des ein eine einen einem einer ' +
  'neu neue neuen erneuert getauscht gewechselt gemacht erledigt heute gestern noch dann plus sowie inkl inklusive ca etwa fuer kunde ' +
  'familie herr frau firma std stunde stunden stk stueck meter pauschal').split(' '));
const woerter = s => norm(s).split(/[^a-z0-9²³]+/).filter(w => w.length >= 3 && !STOPP.has(w) && !/^\d+$/.test(w));
const stamm = w => w.slice(0, Math.min(w.length, 6));
// Gleiches Wort, gleicher Wortstamm (erste 6 Buchstaben) oder Wortanfang – Letzteres nur bei ähnlicher Länge
// („Eckventile" ↔ „Eckventil"), damit nicht „Woche" zu „Wochenende" passt.
const passt = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (stamm(a) === stamm(b)
  || ((a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.7)));

// ── Zahlwörter → Ziffern („zweieinhalb Stunden" → „2,5 Stunden") – Diktate liefern Mengen oft als Wörter ──
const ZAHL = { ein: 1, eins: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, elf: 11, zwolf: 12, dreizehn: 13, vierzehn: 14, funfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18,
  neunzehn: 19, zwanzig: 20, dreissig: 30, vierzig: 40, funfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90, hundert: 100 };
const ZEHNER = new Set(['zwanzig', 'dreissig', 'vierzig', 'funfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']);
function zahlwert(w) {
  if (w in ZAHL) return ZAHL[w];
  if (w === 'anderthalb' || w === 'eineinhalb') return 1.5;
  let m = /^([a-z]+?)einhalb$/.exec(w);
  if (m && m[1] in ZAHL) return ZAHL[m[1]] + 0.5;
  m = /^([a-z]+?)und([a-z]+)$/.exec(w);
  if (m && m[1] in ZAHL && ZAHL[m[1]] < 10 && ZEHNER.has(m[2])) return ZAHL[m[1]] + ZAHL[m[2]];
  return null;
}
const zifferText = n => String(n).replace('.', ',');
/** Ersetzt Zahlwörter durch Ziffern. Nur für die Erkennung – der gespeicherte Text bleibt, wie er gesagt wurde. */
export function zahlwoerter(text) {
  let s = String(text || '');
  s = s.replace(/\b(drei)?viertel\s*stunde\b/gi, (_, drei) => (drei ? '0,75' : '0,25') + ' Stunde');
  s = s.replace(/\b(ein|eine|einen|einer)\s+(halbe|halben|halbes)\b/gi, '0,5');
  s = s.replace(/\bhalbe\s+stunde\b/gi, '0,5 Stunde');
  return s.replace(/[A-Za-zÄÖÜäöüß]+/g, wort => {
    const w = norm(wort);
    const z = zahlwert(w);
    return z === null ? wort : zifferText(z);
  });
}

const EINHEIT_WORTE = [
  [/^(std|stunden?|h|std\.)$/, 'Std.'], [/^(stk|stueck|st|x|mal)$/, 'Stk.'], [/^(m2|m²|qm|quadratmeter)$/, 'm²'],
  [/^(m3|m³|kubikmeter)$/, 'm³'], [/^(lfm|laufmeter)$/, 'lfm'], [/^(m|meter)$/, 'm'], [/^(km|kilometer)$/, 'km'],
  [/^(kg|kilo|kilogramm)$/, 'kg'], [/^(l|liter)$/, 'l'], [/^(tag|tage|tagen)$/, 'Tag']
];
const einheitAus = w => { for (const [re, e] of EINHEIT_WORTE) if (re.test(w)) return e; return null; };
const VERWANDT = { 'm': ['m', 'lfm'], 'lfm': ['m', 'lfm'], 'Stk.': ['Stk.', 'Satz'], 'Std.': ['Std.'] };
const vertraeglich = (mengenEinheit, katalogEinheit) => !mengenEinheit ? ['Stk.', 'pauschal', 'Satz'].includes(katalogEinheit)
  : (VERWANDT[mengenEinheit] || [mengenEinheit]).includes(katalogEinheit);

// Zahlen, die keine Mengen sind: Datum, Uhrzeit, Hausnummer, Geldbetrag, Prozent, Ordnungszahl („3. OG")
function ohneFremdeZahlen(s) {
  return String(s)
    .replace(/\b\d{1,2}\.\d{1,2}\.(?:\d{2,4})?/g, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*uhr\b|\b\d{1,2}:\d{2}\b/gi, ' ')
    .replace(/((?:stra(?:ß|ss)e|str\.|weg|platz|allee|gasse|steig|pfad)|\b(?:ring|hof|damm|ufer))\s+\d+\s*[a-z]?\b/gi, '$1 ')
    .replace(/-?\d+(?:[.,]\d+)?\s*(?:€|eur\b|euro\b|%|prozent\b)/gi, ' ')
    .replace(/\b\d+\.(?=\s*[a-zäöüß])/gi, ' ');
}
function mengenIn(abschnitt) {
  abschnitt = ohneFremdeZahlen(abschnitt);
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

// Teilt eine Notiz in Abschnitte (je Abschnitt meist eine Leistung). Ein Punkt beendet den Satz nur, wenn er nicht zu
// einer Abkürzung („8 Std. Helfer", „ca. 2 m") oder Ordnungszahl („3. OG") gehört; Dezimalkomma („2,5") trennt nicht.
const TRENNER = /(?<!\d),|,(?!\d)|[;\n]+|(?<!\d|\b(?:std|stk|ca|inkl|bzw|nr|st|pos|tel|str|evtl|ggf|lfm|zzgl|ggü|max|min|bspw))\.\s|\s+und\s+|\s+sowie\s+|\s+plus\s+/i;
// Ortsangaben beschreiben, WO gearbeitet wurde, nicht WAS berechnet wird: „Eckventil unter dem Waschtisch getauscht"
// ist ein Eckventil, keine Waschtischarmatur. Für die Suche im Katalog fallen sie deshalb weg.
const ORTSANGABE = /\b(?:unter|über|ueber|an|am|im|in|neben|hinter|vor|auf|zum|zur|vom)\s+(?:(?:dem|der|den|des|die|das|einem|einer|eines)\s+)?[A-Za-zÄÖÜäöüß-]+/gi;

const UNSPEZIFISCH = new Set(['gmbh', 'bauer', 'haus', 'wohnung', 'baustelle', 'strasse', 'weg', 'platz', 'muenchen', 'munchen']);
/** Bester Treffer einer Liste anhand von Namensbestandteilen im Text. */
function besterTreffer(textWoerter, liste, teileVon) {
  let bester = null, wert = 0;
  for (const x of liste) {
    if (x._geloescht) continue;
    const teile = [...new Set(teileVon(x).flatMap(woerter))].filter(w => w.length >= 4 && !UNSPEZIFISCH.has(w));
    const w = teile.filter(t => textWoerter.some(tw => passt(tw, t))).length;
    if (w > wert) { bester = x; wert = w; }
  }
  return bester;
}

/**
 * @param {string} text
 * @param {Array} leistungen  Katalog
 * @param {Array} kunden
 * @param {Array} [baustellen]
 * @returns {{ kunde: object|null, baustelle: object|null, positionen: Array<{leistungId, bezeichnung, menge, einheit, quelle}> }}
 */
export function vorschlaegeAus(text, leistungen = [], kunden = [], baustellen = []) {
  const ergebnis = { kunde: null, baustelle: null, positionen: [] };
  if (!String(text || '').trim()) return ergebnis;
  const t = zahlwoerter(text);
  const textWoerter = woerter(t);

  // Baustelle (Name oder Straße) und Kunde (Name) im Text
  const aktiv = baustellen.filter(b => b.status !== 'abgeschlossen');
  const b = besterTreffer(textWoerter, aktiv, x => [x.name, x.strasse]);
  const k = besterTreffer(textWoerter, kunden, x => [x.name]);
  if (b) ergebnis.baustelle = { id: b.id, name: b.name };
  else if (k) { const ihre = aktiv.filter(x => x.kundeId === k.id); if (ihre.length === 1) ergebnis.baustelle = { id: ihre[0].id, name: ihre[0].name }; }
  const kunde = k || (b && kunden.find(x => x.id === b.kundeId));
  if (kunde) ergebnis.kunde = { id: kunde.id, name: kunde.name };

  const katalog = leistungen.filter(l => !l._geloescht && l.aktiv !== false)
    .map(l => ({ l, worte: [...new Set([...woerter(l.bezeichnung), ...woerter(l.suchwoerter)])] }));
  const standardArbeit = leistungen.find(l => !l._geloescht && l.aktiv !== false && l.art === 'arbeit' && l.einheit === 'Std.' && l.favorit)
    || leistungen.find(l => !l._geloescht && l.aktiv !== false && l.art === 'arbeit' && l.einheit === 'Std.');
  const dazu = (l, menge, quelle) => {
    const da = ergebnis.positionen.find(x => x.leistungId === l.id);
    if (da) { if (menge && da.ohneMenge) { da.menge = menge; da.ohneMenge = false; } return da; }
    const p = { leistungId: l.id, bezeichnung: l.bezeichnung, menge: menge || 1, einheit: l.einheit, quelle, ohneMenge: !menge };
    ergebnis.positionen.push(p);
    return p;
  };

  for (const abschnitt of t.split(TRENNER)) {
    if (!abschnitt.trim()) continue;
    const aw = woerter(abschnitt.replace(ORTSANGABE, ' '));
    const mengen = mengenIn(abschnitt);
    const treffer = katalog.map(x => { const worte = x.worte.filter(w2 => aw.some(w => passt(w, w2))); return { l: x.l, wert: worte.length, worte }; })
      .filter(x => x.wert > 0).sort((a, b2) => b2.wert - a.wert || (b2.l.favorit ? 1 : 0) - (a.l.favorit ? 1 : 0));
    const genommen = new Set(), benutzt = new Set();
    for (const x of treffer.slice(0, 3)) {
      if (x.wert < treffer[0].wert) break;
      // Zwei Leistungen nur, wenn jede ihr eigenes Stichwort hat („8 Std. Geselle, Helfer") – nicht bei einem gemeinsamen
      // Wort wie „Arbeitszeit": dann gilt die häufig gebrauchte
      if (x.worte.every(w => benutzt.has(w))) continue;
      x.worte.forEach(w => benutzt.add(w));
      const i = mengen.findIndex((m, idx) => !genommen.has(idx) && vertraeglich(m.einheit, x.l.einheit));
      if (i >= 0) genommen.add(i);
      dazu(x.l, i >= 0 ? mengen[i].menge : (x.l.einheit === 'pauschal' ? 1 : null), abschnitt.trim());
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

/** Vorschläge mehrerer Notizen zusammenzählen (z. B. alle offenen Notizen einer Baustelle). */
export function vorschlaegeSumme(texte, leistungen = []) {
  const summe = new Map();
  for (const text of texte) {
    for (const p of vorschlaegeAus(text, leistungen).positionen) {
      const da = summe.get(p.leistungId);
      if (da) da.menge = Math.round((da.menge + p.menge) * 1000) / 1000; else summe.set(p.leistungId, { ...p });
    }
  }
  return [...summe.values()];
}
