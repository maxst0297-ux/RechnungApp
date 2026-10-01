// RechnungApp – Oberfläche für Handy und Laptop (Vanilla-JS ohne Build-Schritt, wie MyDesk).
// Arbeitet immer mit der Kopie auf dem Gerät (speicher) – der Abgleich mit dem Laptop läuft im Hintergrund.
// Handy: Reiter Übersicht · Baustellen · ⊕ (Notiz oder Rechnung) · Rechnungen · Mehr. Laptop: Seitenleiste.
import { euro, centAus, centText, mengeAus, mengeText } from './lib/geld.js';
import { heuteIso, datumDe, tageZwischen, istIso, zuDate } from './lib/datum.js';
import { ARTEN, EINHEITEN, STEUERSAETZE, KUNDENTYPEN, berechne, positionNetto } from './lib/berechnung.js';
import { pruefeRechnung, istReverseCharge, ustIdGueltig, zahlungszielTage } from './lib/pruefung.js';
import { festeFassung, zahlstatus, offenerBetrag, nummernformatGueltig, rechnungsnummer, STANDARD_NUMMERNFORMAT } from './lib/festschreiben.js';
import { ibanGueltig } from './lib/girocode.js';
import { blattHtml } from './lib/blatt.js';
import { vorschlaegeAus, vorschlaegeSumme } from './lib/vorschlaege.js';
import { liveDiktatMoeglich, aufnahmeMoeglich, istHomeBildschirmApp, istIOS, liveDiktat, aufnahmeStarten, anhaengen, dauerText, wavVerbinden } from './lib/diktat.js';
import { starteAbgleich } from './lib/abgleich-client.js';

const ICONS = {
  start: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  rechnung: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',
  kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  bild: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  kunden: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c1.9.9 3 3 3 5.8"/>',
  leistungen: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.6-.6-2.6z"/>',
  baustelle: '<path d="M10 3.5h4l4.6 15.5H5.4z"/><path d="M8.1 10h7.8M6.8 14.5h10.4"/><path d="M3.5 19h17"/>',
  kategorie: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  einstellungen: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  mehr: '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  zurueck: '<path d="M15 5l-7 7 7 7"/>',
  weiter: '<path d="M9 5l7 7-7 7"/>',
  hoch: '<path d="M6 15l6-6 6 6"/>',
  runter: '<path d="M6 9l6 6 6-6"/>',
  suche: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.4v.2"/>',
  fehler: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  okkreis: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  muell: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  mikro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stopp: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  welle: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  kalender: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  druck: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  euro: '<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M5 10.5h8M5 13.5h8"/>',
  stern: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  kopie: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V4H4v12h4"/>',
  storno: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  auge: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  schloss: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  notiz: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  abgleich: '<path d="M20 8a8 8 0 0 0-14.5-2M4 4v4h4"/><path d="M4 16a8 8 0 0 0 14.5 2M20 20v-4h-4"/>'
};
const ic = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kopie = o => JSON.parse(JSON.stringify(o));
const nachName = (a, b) => String(a.name || a.bezeichnung || '').localeCompare(String(b.name || b.bezeichnung || ''), 'de', { sensitivity: 'base' });
const stripMeta = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_')));
const mehrzahl = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
const STANDARD_EINLEITUNG = 'vielen Dank für Ihren Auftrag. Für die ausgeführten Arbeiten berechnen wir Ihnen:';
const STATUS_TEXT = { entwurf: 'Entwurf', freigabe: 'Wartet auf Laptop', offen: 'Offen', ueberfaellig: 'Überfällig', bezahlt: 'Bezahlt', storniert: 'Storniert', storno: 'Storno' };
const NOTIZ_STATUS = { offen: ['Offen', 'offen'], zugeordnet: ['In Rechnung', 'freigabe'], abgerechnet: ['Abgerechnet', 'bezahlt'], erledigt: ['Erledigt', 'entwurf'] };
const HINWEIS_KURZ = { '35a': 'Arbeitskosten nach § 35a EStG ausgewiesen', aufbewahrung: 'Aufbewahrungshinweis für Privatkunden (§ 14b UStG)', verzug: 'Verzugshinweis (§ 286 Abs. 3 BGB)',
  '13b': '§ 13b: Steuerschuldnerschaft des Leistungsempfängers', ist: 'Hinweis Ist-Versteuerung', storno: 'Bezug auf die ursprüngliche Rechnung' };
const WOCHENTAG = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const UHRZEIT = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
/** Farben für Leistungs-Kategorien (in beiden Designs gut lesbar). */
export const FARBEN = { gold: '#c9a063', orange: '#e8945a', rot: '#e5735f', lila: '#b08ad8', blau: '#6fa3d8', tuerkis: '#4fb8ad', gruen: '#6cbf8c', grau: '#9b9ba1' };
const FARBNAMEN = { gold: 'Gold', orange: 'Orange', rot: 'Rot', lila: 'Lila', blau: 'Blau', tuerkis: 'Türkis', gruen: 'Grün', grau: 'Grau' };
const KATEGORIE_VORSCHLAG = [['Arbeitszeit', 'gold'], ['Material', 'gruen'], ['Anfahrt & Fahrtkosten', 'blau'], ['Wartung & Kundendienst', 'orange'], ['Sonstiges', 'grau']];

export function starteApp({ speicher, transport, modus = 'echt', wurzel = document.getElementById('app'), vorschau = null }) {
  const Z = {
    ansicht: 'start', id: null, verlauf: [], filterR: 'alle', filterK: 'alle', filterB: 'aktiv', filterN: 'offen', filterL: 'alle',
    sucheR: '', sucheK: '', sucheL: '', sucheB: '', editorTab: 'bearbeiten', entwurf: null, entwurfNeu: false, form: null, dialog: null,
    toast: null, beschreibungOffen: new Set(), notiz: null, diktat: null, abgleich: { verbunden: null, laeuft: false, wartend: 0 }, serverStatus: null
  };
  const heute = () => heuteIso();
  const firma = () => speicher.holen('einstellungen', 'firma') || {};
  const kunden = () => speicher.alle('kunden').sort(nachName);
  const kunde = id => (id ? speicher.holen('kunden', id) : null);
  const leistungen = () => speicher.alle('leistungen').filter(l => l.aktiv !== false).sort(nachName);
  const leistung = id => (id ? speicher.holen('leistungen', id) : null);
  const rechnungen = () => speicher.alle('rechnungen');
  const kategorien = () => speicher.alle('kategorien').sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0) || nachName(a, b));
  const kategorie = id => (id ? speicher.holen('kategorien', id) : null);
  const baustellen = () => speicher.alle('baustellen');
  const baustelle = id => (id ? speicher.holen('baustellen', id) : null);
  const notizen = () => speicher.alle('notizen');
  const notizenVon = bid => notizen().filter(n => n.baustelleId === bid);
  const istOffen = n => (n.status || 'offen') === 'offen';
  const neueId = v => speicher.neueId(v);
  const istLaptop = transport.istLaptop;
  const neuesteZuerst = (a, b) => String(b.datum || '').localeCompare(String(a.datum || '')) || String(b.angelegt || '').localeCompare(String(a.angelegt || ''));
  /** Text einer Notiz für die Erkennung: getippt/diktiert + Abschrift der Sprachaufnahme vom Laptop */
  const notizText = n => [n.text, n.abschriftStatus === 'fertig' && !n.abschriftUebernommen ? n.abschrift : ''].filter(s => String(s || '').trim()).join('\n');
  const notizLeer = n => !String(n.text || '').trim() && !(n.fotos || []).length && !n.audio;
  const farbeVon = k => FARBEN[k?.farbe] || FARBEN.grau;
  const punkt = k => `<span class="punkt" style="--k:${farbeVon(k)}"></span>`;
  const adresse = o => [o?.strasse, [o?.plz, o?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const datumKurz = d => { if (!istIso(d)) return ''; const t = tageZwischen(d, heute()); return t === 0 ? 'Heute' : t === 1 ? 'Gestern' : datumDe(d); };
  const tagText = d => { if (!istIso(d)) return 'Ohne Datum'; const t = tageZwischen(d, heute()); return t === 0 ? 'Heute' : t === 1 ? 'Gestern' : WOCHENTAG.format(zuDate(d)); };
  const uhrzeit = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : UHRZEIT.format(d); };
  /** Betreff für Rechnungen einer Baustelle – nennt den Leistungsort, wenn er nicht die Kundenanschrift ist. */
  function bauvorhabenText(b) {
    const adr = adresse(b), k = kunde(b.kundeId);
    return `Bauvorhaben: ${b.name}${adr && adr !== adresse(k) ? ', ' + adr : ''}`;
  }
  /** Letzte Tätigkeit je Baustelle (Änderung oder neueste Notiz) – sortiert „zuletzt benutzt zuerst". */
  function aktivitaeten() {
    const m = new Map(baustellen().map(b => [b.id, String(b._geaendert || b.angelegt || '')]));
    for (const n of notizen()) if (m.has(n.baustelleId)) { const z = String(n.angelegt || n._geaendert || ''); if (z > m.get(n.baustelleId)) m.set(n.baustelleId, z); }
    return m;
  }
  const baustellenSortiert = (nurLaufend = true) => { const m = aktivitaeten(); return baustellen().filter(b => !nurLaufend || b.status !== 'abgeschlossen').sort((a, b) => m.get(b.id).localeCompare(m.get(a.id))); };
  function notizZahlen() {
    const m = new Map();
    for (const n of notizen()) {
      if (!n.baustelleId) continue;
      const z = m.get(n.baustelleId) || { offen: 0, alle: 0 };
      z.alle++; if (istOffen(n)) z.offen++;
      m.set(n.baustelleId, z);
    }
    return m;
  }
  const dateiUrls = new Map();
  function dateiUrl(id) {
    if (dateiUrls.has(id)) return dateiUrls.get(id);
    const d = speicher.dateiHolen(id);
    const url = d?.blob ? URL.createObjectURL(d.blob) : transport.dateiUrl?.(id) || '';
    if (url) dateiUrls.set(id, url);
    return url;
  }

  // ── Abgleich ──
  const abgleich = starteAbgleich({
    speicher, transport,
    melden: st => { Z.abgleich = st; abgleichChipsAktualisieren(); if (st.anmelden && !Z.dialog) { Z.dialog = { art: 'anmelden' }; render(); } },
    abgelehnt: liste => {
      if (liste.some(e => e.grund === 'konflikt')) zeigeToast('Auf einem anderen Gerät wurde gleichzeitig etwas geändert – die neuere Fassung gilt.');
      if (liste.some(e => e.grund === 'zu-gross')) zeigeToast('Eine Änderung ist zu groß (z. B. Logo) – bitte kleineres Bild wählen.');
    }
  });
  speicher.beiAenderung(quelle => { if (quelle === 'laptop') nachFremdAenderung(); });

  // ── Navigation ──
  function verlassen() { entwurfSofortSpeichern(); notizMerken(); if (Z.diktat) diktatStoppen(); }
  function gehe(ansicht, id = null) {
    verlassen();
    Z.verlauf.push([Z.ansicht, Z.id]);
    Object.assign(Z, { ansicht, id, form: null, editorTab: 'bearbeiten', dialog: null });
    vorbereiten(); render(); window.scrollTo(0, 0);
  }
  function tab(ansicht) { verlassen(); Object.assign(Z, { ansicht, id: null, verlauf: [], form: null, dialog: null }); vorbereiten(); render(); window.scrollTo(0, 0); }
  function zurueck() {
    verlassen();
    const v = Z.verlauf.pop() || ['start', null];
    Object.assign(Z, { ansicht: v[0], id: v[1], form: null, dialog: null, editorTab: 'bearbeiten' });
    vorbereiten(); render(); window.scrollTo(0, 0);
  }
  function vorbereiten() {
    if (Z.ansicht === 'rechnung') {
      const r = speicher.holen('rechnungen', Z.id);
      if (!r) { Z.ansicht = 'rechnungen'; return; }
      Z.entwurf = r.status === 'entwurf' ? kopie(r) : null;
      Z.entwurfNeu = false;
    }
    if (Z.ansicht === 'kunde' && !Z.form) {
      const k = Z.id ? kunde(Z.id) : null;
      Z.form = { typ: 'kunden', neu: !k, daten: k ? kopie(k) : { id: neueId('k'), typ: 'privat', anrede: '', name: '', strasse: '', plz: '', ort: '', land: 'DE', mail: '', telefon: '', versand: 'mail', zustimmungMail: '', standard: [], notiz: '' } };
    }
    if (Z.ansicht === 'leistung' && !Z.form) {
      const l = Z.id ? leistung(Z.id) : null;
      Z.form = { typ: 'leistungen', neu: !l, daten: l ? kopie(l) : { id: neueId('l'), bezeichnung: '', beschreibung: '', einheit: 'Std.', preisCent: null, steuersatz: 19, art: 'arbeit',
        kategorieId: kategorie(Z.filterL)?.id || null, favorit: false, suchwoerter: '', aktiv: true } };
    }
    if (Z.ansicht === 'baustelle' && !baustelle(Z.id)) Z.ansicht = 'baustellen';
    if (Z.ansicht === 'baustelleForm' && !Z.form) {
      const b = Z.id ? baustelle(Z.id) : null;
      Z.form = { typ: 'baustellen', neu: !b, daten: b ? kopie(b) : { id: neueId('b'), name: '', kundeId: null, strasse: '', plz: '', ort: '', status: 'aktiv', beginn: heute(), notiz: '', angelegt: new Date().toISOString() } };
    }
    if (Z.ansicht === 'notiz') {
      const n = Z.id ? speicher.holen('notizen', Z.id) : null;
      if (n) Z.notiz = { ...kopie(n), fotos: [...(n.fotos || [])], neu: false, baustelleAuto: false };
      else { Z.id = null; if (!Z.notiz || !Z.notiz.neu) Z.notiz = gemerkterEntwurf() || neueNotiz(); }
    }
    if (Z.ansicht === 'einstellungen' && !Z.form) {
      Z.form = { typ: 'einstellungen', daten: { nummernFormat: STANDARD_NUMMERNFORMAT, zahlungszielTage: 14, versteuerung: 'soll', einleitung: STANDARD_EINLEITUNG, schluss: 'Mit freundlichen Grüßen', ...kopie(firma()), id: 'firma' } };
      if (transport.status) transport.status().then(s => {
        Z.serverStatus = s;
        if (Z.ansicht === 'einstellungen') { teilErsetzen('#serverstatus', serverStatusHtml()); teilErsetzen('#diktat-einstellung', diktatEinstellungHtml()); }
      }).catch(() => {});
    }
  }

  // ── Rendern ──
  function render() {
    const fokus = document.activeElement && document.activeElement.id;
    wurzel.innerHTML = `<div class="rahmen">${seitenleiste()}<main class="inhalt ${Z.ansicht === 'rechnung' ? 'breit' : ''}" id="inhalt">${ansicht()}</main>${tabLeiste()}</div>${dialogHtml()}${toastHtml()}`;
    blaetterSkalieren();
    if (fokus) document.getElementById(fokus)?.focus();
  }
  function ansicht() {
    switch (Z.ansicht) {
      case 'rechnungen': return ansichtRechnungen();
      case 'rechnung': {
        const r = speicher.holen('rechnungen', Z.id);
        if (Z.entwurf && Z.entwurf.id === Z.id && (!r || r.status === 'entwurf')) return ansichtEditor();
        return !r ? ansichtRechnungen() : r.status === 'entwurf' ? ansichtEditor() : ansichtRechnung(r);
      }
      case 'baustellen': return ansichtBaustellen();
      case 'baustelle': return baustelle(Z.id) ? ansichtBaustelle() : ansichtBaustellen();
      case 'baustelleForm': return ansichtBaustelleForm();
      case 'notiz': return ansichtNotiz();
      case 'notizen': return ansichtNotizen();
      case 'kunden': return ansichtKunden();
      case 'kunde': return ansichtKunde();
      case 'leistungen': return ansichtLeistungen();
      case 'leistung': return ansichtLeistung();
      case 'kategorien': return ansichtKategorien();
      case 'mehr': return ansichtMehr();
      case 'einstellungen': return ansichtEinstellungen();
      default: return ansichtStart();
    }
  }
  function teilErsetzen(sel, html) { const el = wurzel.querySelector(sel); if (el) el.innerHTML = html; }

  const NAV = [['start', 'start', 'Übersicht'], ['baustellen', 'baustelle', 'Baustellen'], ['rechnungen', 'rechnung', 'Rechnungen'], null,
    ['notizen', 'notiz', 'Notizen'], ['kunden', 'kunden', 'Kunden'], ['leistungen', 'leistungen', 'Leistungen'], ['einstellungen', 'einstellungen', 'Einstellungen']];
  const OBER = { rechnung: 'rechnungen', kunde: 'kunden', leistung: 'leistungen', kategorien: 'leistungen', baustelle: 'baustellen', baustelleForm: 'baustellen', notiz: 'notizen' };
  const aktivNav = () => OBER[Z.ansicht] || Z.ansicht;
  const aktivTab = () => { const a = Z.ansicht === 'notiz' ? 'baustellen' : aktivNav(); return ['notizen', 'kunden', 'leistungen', 'einstellungen', 'mehr'].includes(a) ? 'mehr' : a; };
  function seitenleiste() {
    const offen = notizen().filter(istOffen).length;
    return `<nav class="seitenleiste" aria-label="Hauptmenü">
      <div class="marke"><span class="marke-zeichen">${ic('rechnung')}</span><div><strong>RechnungApp</strong><small>${esc(firma().name || 'Rechnungen fürs Handwerk')}</small></div></div>
      <button class="knopf voll neu-knopf" data-act="neuMenue">${ic('plus')} Neu</button>
      ${NAV.map(e => e ? `<button class="nav ${aktivNav() === e[0] ? 'aktiv' : ''}" data-act="tab" data-ansicht="${e[0]}">${ic(e[1])}<span>${e[2]}</span>${e[0] === 'notizen' && offen ? `<span class="zaehler" title="Offene Notizen">${offen}</span>` : ''}</button>` : '<hr class="nav-trenner">').join('')}
      <div class="fuss">${abgleichChip()}</div>
    </nav>`;
  }
  function tabLeiste() {
    const t = (a, i, text) => `<button class="tab ${aktivTab() === a ? 'aktiv' : ''}" data-act="tab" data-ansicht="${a}">${ic(i)}<span>${text}</span></button>`;
    return `<nav class="tabs" aria-label="Hauptmenü">${t('start', 'start', 'Übersicht')}${t('baustellen', 'baustelle', 'Baustellen')}
      <button class="tab mitte" data-act="neuMenue" aria-label="Hinzufügen: Notiz oder Rechnung"><span class="kreis">${ic('plus')}</span></button>
      ${t('rechnungen', 'rechnung', 'Rechnungen')}${t('mehr', 'mehr', 'Mehr')}</nav>`;
  }
  function kopf({ titel, unter = '', zurueckKnopf = false, rechts = '' }) {
    return `<header class="kopf">${zurueckKnopf ? `<button class="rund" data-act="zurueck" aria-label="Zurück">${ic('zurueck')}</button>` : ''}
      <div class="titelblock"><h1>${esc(titel)}</h1>${unter ? `<span class="unterzeile">${esc(unter)}</span>` : ''}</div>${rechts}</header>`;
  }
  const rundKnopf = (act, icon, label, extra = '') => `<button class="rund" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${ic(icon)}</button>`;
  function abgleichChip() {
    const a = Z.abgleich, n = a.wartend ? ' · ' + a.wartend : '';
    let klasse, lang, kurz;
    if (istLaptop) {
      klasse = a.verbunden === false ? 'weg' : 'ok';
      lang = a.verbunden === false ? 'Server läuft nicht' : 'Gespeichert auf diesem Laptop'; kurz = a.verbunden === false ? 'Server aus' : 'Laptop';
    } else {
      klasse = a.laeuft ? 'laeuft' : a.verbunden ? 'ok' : a.verbunden === false ? 'weg' : '';
      lang = a.laeuft ? 'Gleiche ab …' : a.verbunden ? 'Laptop verbunden' : a.verbunden === false ? `Laptop ${modus === 'vorschau' ? 'getrennt' : 'nicht erreichbar'}${a.wartend ? ' · ' + a.wartend + ' warten' : ''}` : 'Verbinde …';
      kurz = a.laeuft ? 'Abgleich …' : a.verbunden ? 'Verbunden' : a.verbunden === false ? 'Offline' + n : '…';
    }
    return `<button class="abgleich ${klasse}" data-act="abgleichDialog" data-chip title="Abgleich mit dem Laptop"><span class="punkt-status"></span><span class="lang">${esc(lang)}</span><span class="kurz">${esc(kurz)}</span></button>`;
  }
  /** Platz für den Abgleich-Hinweis in Kopfzeilen – sichtbar nur, solange der Laptop nicht erreichbar ist. */
  const statusOrt = () => `<span class="status-ort" data-chip-ort>${Z.abgleich.verbunden === false ? abgleichChip() : ''}</span>`;
  function abgleichChipsAktualisieren() {
    for (const el of wurzel.querySelectorAll('[data-chip-ort]')) el.innerHTML = Z.abgleich.verbunden === false ? abgleichChip() : '';
    for (const el of wurzel.querySelectorAll('[data-chip]')) el.outerHTML = abgleichChip();
    if (Z.dialog?.art === 'abgleich') teilErsetzen('.dialog', dialogInhalt());
  }
  const vorschauBand = () => (modus === 'vorschau'
    ? `<div class="vorschau-band">${ic('auge')}<span><strong>Vorschau</strong> mit Beispieldaten – der Laptop wird im Browser nachgebildet.</span></div>` : '');

  // ── Übersicht ──
  function ansichtStart() {
    const h = heute(), rs = rechnungen();
    const st = r => zahlstatus(r, h);
    const offen = rs.filter(r => ['offen', 'ueberfaellig'].includes(st(r)));
    const ueber = rs.filter(r => st(r) === 'ueberfaellig');
    const entwuerfe = rs.filter(r => r.status === 'entwurf');
    const summe = l => l.reduce((s, r) => s + offenerBetrag(r), 0);
    const zahlen = notizZahlen();
    const bereit = baustellenSortiert(false).filter(b => zahlen.get(b.id)?.offen);
    const ohne = notizen().filter(n => !n.baustelleId && istOffen(n)).length;
    const zuletzt = rs.slice().sort((a, b) => String(b._geaendert).localeCompare(String(a._geaendert))).slice(0, 5);
    const f = firma();
    const fehltFirma = !f.name || !(f.steuernummer || f.ustId) || !f.strasse;
    const zeile = (act, id, titel, neben, zahl) => `<button class="zeile" data-act="${act}" ${id ? `data-id="${id}"` : ''}><span class="haupt">${esc(titel)}</span>
      <span class="rechts"><span class="zahl-badge">${zahl}</span></span><span class="neben">${esc(neben)}</span><span></span></button>`;
    return kopf({ titel: 'Übersicht', unter: WOCHENTAG.format(new Date()), rechts: `<span class="nur-handy">${abgleichChip()}</span>` }) + `
      <div class="stapel">${vorschauBand()}
        ${fehltFirma ? `<div class="box gold">${ic('stift')}<div><strong>Zuerst deine Firmendaten eintragen.</strong><div class="knopfreihe"><button class="knopf" data-act="tab" data-ansicht="einstellungen">Firmendaten</button></div></div></div>` : ''}
        <div class="kennzahlen">
          <button class="kennzahl" data-act="rechnungenFilter" data-wert="offen"><span class="etikett">Offen</span><strong>${euro(summe(offen))}</strong><span class="sub">${mehrzahl(offen.length, 'Rechnung', 'Rechnungen')}</span></button>
          <button class="kennzahl ${ueber.length ? 'warn' : ''}" data-act="rechnungenFilter" data-wert="ueberfaellig"><span class="etikett">Überfällig</span><strong>${euro(summe(ueber))}</strong><span class="sub">${mehrzahl(ueber.length, 'Rechnung', 'Rechnungen')}</span></button>
          <button class="kennzahl" data-act="rechnungenFilter" data-wert="entwurf"><span class="etikett">Entwürfe</span><strong>${entwuerfe.length}</strong><span class="sub">ohne Nummer</span></button>
        </div>
        ${bereit.length || ohne ? `<section class="karte"><h2>Offene Notizen</h2><div class="liste">
          ${bereit.slice(0, 6).map(b => zeile('baustelleOeffnen', b.id, b.name, kunde(b.kundeId)?.name || 'ohne Kunde', zahlen.get(b.id).offen)).join('')}
          ${ohne ? zeile('notizenOhneBaustelle', '', 'Ohne Baustelle', 'noch zuordnen', ohne) : ''}
        </div></section>` : ''}
        <section class="karte"><h2>Zuletzt<button class="knopf leise rechts" data-act="tab" data-ansicht="rechnungen">Alle</button></h2>
          <div class="liste">${zuletzt.length ? zuletzt.map(rechnungZeile).join('') : '<div class="leer">Noch keine Rechnungen.</div>'}</div></section>
      </div>`;
  }

  // ── Rechnungen ──
  const pille = st => `<span class="pille ${st}">${STATUS_TEXT[st] || st}</span>`;
  function entwurfSummen(r) { return berechne(r, { reverseCharge: istReverseCharge(kunde(r.kundeId), r) }); }
  function rechnungZeile(r) {
    const st = zahlstatus(r, heute());
    const name = r.fest?.kunde?.name || kunde(r.kundeId)?.name || 'Noch kein Kunde';
    const betrag = r.fest ? r.fest.summen.bruttoCent : entwurfSummen(r).bruttoCent;
    const b = baustelle(r.baustelleId);
    let neben;
    if (r.status === 'entwurf') neben = mehrzahl((r.positionen || []).filter(p => p.aktiv !== false).length, 'Position', 'Positionen');
    else if (st === 'ueberfaellig') neben = `seit ${tageZwischen(r.faellig, heute())} Tagen fällig`;
    else if (st === 'offen') neben = `fällig ${datumDe(r.faellig)}`;
    else neben = datumDe(r.datum);
    return `<button class="zeile" data-act="oeffneRechnung" data-id="${r.id}">
      <span class="haupt">${r.nummer ? esc(r.nummer) + ' · ' : ''}${esc(name)}</span><span class="rechts">${euro(betrag)}</span>
      <span class="neben">${b ? esc(b.name) + ' · ' : ''}${esc(neben)}</span><span class="rechts">${pille(st)}</span></button>`;
  }
  function rechnungenGefiltert() {
    const h = heute(), q = Z.sucheR.trim().toLowerCase();
    return rechnungen().filter(r => {
      const st = zahlstatus(r, h);
      if (Z.filterR === 'entwurf' && !['entwurf', 'freigabe'].includes(st)) return false;
      if (Z.filterR === 'offen' && !['offen', 'ueberfaellig'].includes(st)) return false;
      if (Z.filterR === 'ueberfaellig' && st !== 'ueberfaellig') return false;
      if (Z.filterR === 'bezahlt' && st !== 'bezahlt') return false;
      if (!q) return true;
      const name = r.fest?.kunde?.name || kunde(r.kundeId)?.name || '';
      return [name, r.nummer, r.betreff, baustelle(r.baustelleId)?.name].join(' ').toLowerCase().includes(q);
    }).sort((a, b) => (a.status === 'entwurf') !== (b.status === 'entwurf') ? (a.status === 'entwurf' ? -1 : 1)
      : String(b.datum || b._geaendert).localeCompare(String(a.datum || a._geaendert)) || String(b.nummer).localeCompare(String(a.nummer)));
  }
  const rechnungsListeHtml = () => { const l = rechnungenGefiltert(); return l.length ? l.map(rechnungZeile).join('') : '<div class="leer">Keine passenden Rechnungen.</div>'; };
  function ansichtRechnungen() {
    const f = [['alle', 'Alle'], ['entwurf', 'Entwürfe'], ['offen', 'Offen'], ['ueberfaellig', 'Überfällig'], ['bezahlt', 'Bezahlt']];
    return kopf({ titel: 'Rechnungen', rechts: statusOrt() }) + `
      <div class="stapel">
        <div class="filter" role="tablist">${f.map(([w, t]) => `<button class="chip ${Z.filterR === w ? 'an' : ''}" data-act="rechnungenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-r" type="search" data-suche="R" value="${esc(Z.sucheR)}" placeholder="Suchen"></label>
        <section class="karte"><div class="liste" id="liste-r">${rechnungsListeHtml()}</div></section>
      </div>`;
  }

  // ── Rechnungseditor (Entwurf) ──
  function neueRechnung(kundeId = null, extra = {}) {
    const f = firma(), k = kunde(kundeId);
    const r = { id: neueId('r'), typ: 'rechnung', status: 'entwurf', kundeId, baustelleId: null, leistungVon: heute(), leistungBis: '', amGrundstueck: !k || k.typ === 'privat', betreff: '',
      einleitung: f.einleitung || STANDARD_EINLEITUNG, schluss: f.schluss || 'Mit freundlichen Grüßen', zahlungszielTage: null, positionen: [], notizen: [],
      angelegt: new Date().toISOString(), ...extra };
    if (k && !extra.positionen) standardDazu(r, k);
    verlassen();
    Z.verlauf.push([Z.ansicht, Z.id]);
    Object.assign(Z, { ansicht: 'rechnung', id: r.id, entwurf: r, entwurfNeu: true, editorTab: 'bearbeiten', form: null, dialog: null });
    if (r.kundeId || r.positionen.length) entwurfSofortSpeichern();
    render(); window.scrollTo(0, 0);
  }
  const posAusLeistung = (l, menge = 1, extra = {}) => ({ id: neueId('p'), leistungId: l.id, bezeichnung: l.bezeichnung, beschreibung: l.beschreibung || '', menge, einheit: l.einheit,
    preisCent: l.preisCent ?? null, steuersatz: l.steuersatz ?? 19, art: l.art || 'sonstiges', aktiv: true, ...extra });
  function standardDazu(r, k) {
    for (const s of k?.standard || []) { const l = leistung(s.leistungId); if (l && !r.positionen.some(p => p.leistungId === l.id)) r.positionen.push(posAusLeistung(l, s.menge || 1)); }
  }
  let speicherTimer = null;
  function entwurfSpeichernBald() {
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(entwurfSofortSpeichern, 350);
  }
  function entwurfSofortSpeichern() {
    clearTimeout(speicherTimer); speicherTimer = null;
    const r = Z.entwurf;
    if (!r || Z.ansicht !== 'rechnung') return;
    const gespeichert = speicher.holen('rechnungen', r.id);
    if (gespeichert && gespeichert.status !== 'entwurf') return;            // inzwischen festgeschrieben
    if (Z.entwurfNeu && !r.kundeId && !(r.positionen || []).length) return; // leere neue Rechnung nicht ablegen
    const daten = stripMeta(r);
    if (gespeichert && JSON.stringify(stripMeta(gespeichert)) === JSON.stringify(daten)) return;
    speicher.aendern('rechnungen', daten);
    Z.entwurfNeu = false;
  }

  function ansichtEditor() {
    const r = Z.entwurf;
    const k = kunde(r.kundeId), f = firma();
    const p = pruefeRechnung({ firma: f, kunde: k, rechnung: r, datum: heute(), original: originalVon(r) });
    const wartet = !!r.freigabe;
    const titel = r.typ === 'storno' ? 'Stornorechnung' : 'Rechnung';
    return kopf({ titel, unter: k ? k.name : 'Entwurf', zurueckKnopf: true, rechts: statusOrt() }) + `
      ${freigabeBanner(r)}
      <div class="nur-schmal" style="margin:4px 0 12px"><div class="segment voll" role="tablist">
        <button class="${Z.editorTab === 'bearbeiten' ? 'an' : ''}" data-act="editorTab" data-tab="bearbeiten">Bearbeiten</button>
        <button class="${Z.editorTab === 'vorschau' ? 'an' : ''}" data-act="editorTab" data-tab="vorschau">Vorschau</button></div></div>
      <div class="editor ${Z.editorTab === 'vorschau' ? 'zeige-blatt' : ''}">
        <fieldset class="form-spalte" style="border:0;margin:0;padding:0;min-width:0" ${wartet ? 'disabled' : ''}>
          ${karteKunde(r, k)}${karteLeistung(r, k)}${kartePositionen(r)}${karteNotizen(r)}${karteTexte(r, k, f)}
          <section class="karte" id="pruefung">${pruefungHtml(p, k)}</section>
          <section class="karte" id="summen">${summenHtml(p)}</section>
          <div class="knopfreihe"><button class="knopf leise" data-act="entwurfLoeschenFragen">${ic('muell')} Entwurf löschen</button>
            ${transport.pdfUrl && !Z.entwurfNeu ? `<a class="knopf leise" href="${transport.pdfUrl(r.id)}" target="_blank" rel="noopener">${ic('druck')} PDF-Entwurf</a>` : ''}</div>
        </fieldset>
        <div class="blatt-spalte" id="blatt">${entwurfBlatt(r)}</div>
      </div>
      ${wartet ? '' : `<div class="leiste-unten editor-leiste" style="margin-top:14px">
        <button class="knopf zweit nur-schmal" data-act="editorTab" data-tab="${Z.editorTab === 'vorschau' ? 'bearbeiten' : 'vorschau'}">${ic(Z.editorTab === 'vorschau' ? 'stift' : 'auge')} ${Z.editorTab === 'vorschau' ? 'Bearbeiten' : 'Vorschau'}</button>
        <button class="knopf" id="festschreiben-knopf" data-act="festschreibenFragen" ${p.ok ? '' : 'disabled'}>${ic('schloss')} Festschreiben</button></div>`}`;
  }
  const originalVon = r => (r.typ === 'storno' && r.stornoVon ? speicher.holen('rechnungen', r.stornoVon) : null);
  function freigabeBanner(r) {
    if (r.freigabe) return `<div class="box ocker">${ic('laptop')}<div><strong>Freigegeben – wartet auf den Laptop.</strong><br>Sobald der Laptop erreichbar ist, vergibt er die Nummer und legt das PDF ab.
      <div class="knopfreihe"><button class="knopf zweit" data-act="abgleichJetzt">${ic('abgleich')} Jetzt abgleichen</button><button class="knopf leise" data-act="freigabeZuruecknehmen">Freigabe zurücknehmen</button></div></div></div>`;
    if (r.freigabeFehler?.length) return `<div class="box rot">${ic('fehler')}<div><strong>Der Laptop hat die Freigabe abgelehnt:</strong><br>${r.freigabeFehler.map(esc).join('<br>')}</div></div>`;
    return '';
  }
  function karteKunde(r, k) {
    const b = baustelle(r.baustelleId);
    if (!k) return `<section class="karte"><h2>Kunde</h2><button class="knopf voll" data-act="kundeWaehlen">${ic('kunden')} Kunde wählen</button>${baustelleImEditor(r, b, k)}</section>`;
    const fehlend = (k.standard || []).filter(s => !r.positionen.some(p => p.leistungId === s.leistungId) && leistung(s.leistungId));
    return `<section class="karte"><h2>Kunde<button class="knopf leise rechts" data-act="kundeWaehlen">Ändern</button></h2>
      <div class="kunde-kurz"><div><strong>${esc(k.name)}</strong><div class="neben">${esc(adresse(k))}${k.nummer ? ' · ' + esc(k.nummer) : ''}</div></div>
        <span class="pille typ">${KUNDENTYPEN[k.typ] || ''}${k.bauleistender13b ? ' · § 13b' : ''}</span></div>
      ${baustelleImEditor(r, b, k)}
      ${fehlend.length ? `<div class="knopfreihe" style="margin-top:10px"><button class="chip dazu" data-act="standardUebernehmen">Wiederkehrende Positionen (${fehlend.length})</button></div>` : ''}
    </section>`;
  }
  function baustelleImEditor(r, b, k) {
    if (b) return `<div class="im-editor">${ic('baustelle')}<div><strong>${esc(b.name)}</strong>${adresse(b) ? `<span class="leise klein"> · ${esc(adresse(b))}</span>` : ''}</div>
      <button class="knopf leise" data-act="entwurfBaustelleLoesen">Lösen</button></div>`;
    const moegliche = k ? baustellenSortiert(true).filter(x => x.kundeId === k.id) : [];
    if (!moegliche.length) return '';
    return `<div class="im-editor">${ic('baustelle')}<div class="filter wrap">${moegliche.slice(0, 5).map(x => `<button class="chip dazu" data-act="entwurfBaustelle" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>`;
  }
  function karteLeistung(r, k) {
    return `<section class="karte"><h2>Leistung</h2><div class="felder">
      <label class="feld"><span>Leistung am / ab</span><input type="date" id="e-von" data-e="leistungVon" value="${esc(r.leistungVon || '')}" class="${istIso(r.leistungVon) ? '' : 'fehlt'}"></label>
      <label class="feld"><span>bis (bei Zeitraum)</span><input type="date" id="e-bis" data-e="leistungBis" value="${esc(r.leistungBis || '')}"></label>
      <label class="feld ganz"><span>Betreff (optional)</span><input id="e-betreff" data-e="betreff" value="${esc(r.betreff || '')}" placeholder="z. B. Badsanierung EG"></label>
      ${k?.typ === 'privat' ? `<label class="schalter ganz"><input type="checkbox" id="e-grund" data-e="amGrundstueck" ${r.amGrundstueck !== false ? 'checked' : ''}>
        <span>Arbeiten an Haus, Wohnung oder Grundstück <small class="leise">(§ 35a EStG)</small></span></label>` : ''}
    </div></section>`;
  }
  function kartePositionen(r) {
    const favs = leistungen().filter(l => l.favorit && !r.positionen.some(p => p.leistungId === l.id)).slice(0, 8);
    const aktiv = r.positionen.filter(p => p.aktiv !== false).length;
    return `<section class="karte"><h2>Positionen<span class="leise klein rechts" id="pos-zaehler">${aktiv} von ${r.positionen.length} angehakt</span></h2>
      <div class="positionen">${r.positionen.length ? r.positionen.map(posHtml).join('') : '<div class="leer">Noch keine Positionen.</div>'}</div>
      ${favs.length ? `<div class="filter wrap" style="margin-top:12px">${favs.map(l => `<button class="chip dazu" data-act="leistungDazu" data-id="${l.id}">${esc(l.bezeichnung)}</button>`).join('')}</div>` : ''}
      <div class="knopfreihe" style="margin-top:12px">
        <button class="knopf zweit" data-act="katalogOeffnen">${ic('leistungen')} Aus Katalog</button>
        <button class="knopf zweit" data-act="freiePosition">${ic('stift')} Frei</button>
      </div>
    </section>`;
  }
  function posHtml(p) {
    const offen = p.beschreibung || Z.beschreibungOffen.has(p.id);
    const opt = (liste, wert) => liste.map(([w, t]) => `<option value="${esc(w)}" ${String(w) === String(wert) ? 'selected' : ''}>${esc(t)}</option>`).join('');
    return `<div class="pos ${p.aktiv === false ? 'aus' : ''}" data-pos="${p.id}">
      <div class="oben"><input type="checkbox" id="p-${p.id}-aktiv" data-p="aktiv" ${p.aktiv !== false ? 'checked' : ''} aria-label="Auf die Rechnung">
        <input id="p-${p.id}-bez" data-p="bezeichnung" value="${esc(p.bezeichnung)}" placeholder="Bezeichnung, z. B. Arbeitszeit Geselle" aria-label="Bezeichnung" class="${String(p.bezeichnung || '').trim().length < 2 ? 'fehlt' : ''}">
        <button class="loeschen" data-act="posLoeschen" data-id="${p.id}" aria-label="Position entfernen">${ic('muell')}</button></div>
      <div class="werte">
        <label class="feld"><span>Menge</span><input id="p-${p.id}-menge" data-p="menge" inputmode="decimal" value="${esc(mengeText(p.menge))}" class="${Number(p.menge) ? '' : 'fehlt'}"></label>
        <label class="feld"><span>Einheit</span><select id="p-${p.id}-einheit" data-p="einheit">${opt(EINHEITEN.map(e => [e.k, e.k]), p.einheit)}</select></label>
        <label class="feld"><span>Preis netto €</span><input id="p-${p.id}-preis" data-p="preis" inputmode="decimal" value="${esc(centText(p.preisCent))}" class="${p.preisCent == null ? 'fehlt' : ''}"></label>
        <label class="feld"><span>USt</span><select id="p-${p.id}-satz" data-p="steuersatz">${opt(STEUERSAETZE.map(s => [s, s + ' %']), p.steuersatz ?? 19)}</select></label>
        <div class="betrag" data-betrag="${p.id}">${euro(positionNetto(p))}</div>
      </div>
      <div class="unten"><label class="art">Art <select id="p-${p.id}-art" data-p="art">${opt(Object.entries(ARTEN), p.art || 'sonstiges')}</select></label>
        <span class="knopfreihe">${!p.leistungId && String(p.bezeichnung || '').trim().length > 2 && p.preisCent != null ? `<button class="knopf leise" data-act="posInKatalog" data-id="${p.id}">${ic('stern')} In Katalog</button>` : ''}
        ${offen ? '' : `<button class="knopf leise" data-act="beschreibungZeigen" data-id="${p.id}">+ Beschreibung</button>`}</span></div>
      ${offen ? `<textarea id="p-${p.id}-besch" data-p="beschreibung" placeholder="Beschreibung (optional)">${esc(p.beschreibung || '')}</textarea>` : ''}
    </div>`;
  }
  /** Offene Notizen, die zu diesem Entwurf passen: gleiche Baustelle – sonst gleicher Kunde oder noch ganz ohne Zuordnung. */
  function passendeOffeneNotizen(r) {
    const drin = new Set(r.notizen || []);
    return notizen().filter(n => istOffen(n) && !drin.has(n.id) && (r.baustelleId ? n.baustelleId === r.baustelleId
      : !r.kundeId || (!n.baustelleId && !n.kundeId) || n.kundeId === r.kundeId || baustelle(n.baustelleId)?.kundeId === r.kundeId)).sort(neuesteZuerst);
  }
  function karteNotizen(r) {
    const ns = (r.notizen || []).map(id => speicher.holen('notizen', id)).filter(Boolean).sort(neuesteZuerst);
    const weitere = passendeOffeneNotizen(r).length;
    if (!ns.length && !weitere) return '';
    return `<section class="karte"><h2>Notizen${weitere ? `<button class="knopf leise rechts" data-act="notizenWahl">${ic('plus')} ${weitere} offen</button>` : ''}</h2>
      ${ns.length ? `<div class="liste">${ns.map(n => notizZeile(n, 'entwurf')).join('')}</div>` : ''}</section>`;
  }
  /** Notiz als kompakte Zeile – im Rechnungseditor und in der Auswahl offener Notizen. */
  function notizZeile(n, art) {
    const text = notizText(n).replace(/\s+/g, ' ').trim();
    const b = baustelle(n.baustelleId);
    const ohneTreffer = art === 'entwurf' && text && !vorschlaegeAus(notizText(n), leistungen()).positionen.length;
    return `<div class="n-zeile"><div class="n-text"><span>${esc(text || ((n.fotos || []).length ? 'Foto' : 'Sprachaufnahme'))}</span>
        <small>${esc([datumKurz(n.datum), art === 'wahl' && b ? b.name : ''].filter(Boolean).join(' · '))}</small></div>
      ${art === 'wahl' ? `<button class="knopf zweit klein" data-act="notizInEntwurf" data-id="${n.id}">${ic('plus')}</button>`
        : `${ohneTreffer ? `<button class="knopf leise klein" data-act="notizAlsPosition" data-id="${n.id}">Als Position</button>` : ''}
           <button class="loeschen" data-act="notizAusEntwurf" data-id="${n.id}" aria-label="Aus der Rechnung nehmen" title="Aus der Rechnung nehmen">${ic('fehler')}</button>`}</div>`;
  }
  function karteTexte(r, k, f) {
    const std = zahlungszielTage({ zahlungszielTage: null }, k, f);
    return `<details class="karte"><summary style="cursor:pointer"><strong>Texte und Zahlungsziel</strong></summary>
      <div class="felder" style="margin-top:12px">
        <label class="feld ganz"><span>Einleitung (nach der Anrede)</span><textarea id="e-einl" data-e="einleitung">${esc(r.einleitung || '')}</textarea></label>
        <label class="feld ganz"><span>Schluss</span><textarea id="e-schluss" data-e="schluss" style="min-height:48px">${esc(r.schluss || '')}</textarea></label>
        <label class="feld"><span>Zahlungsziel in Tagen</span><input id="e-ziel" data-e="zahlungszielTage" inputmode="numeric" value="${r.zahlungszielTage ?? ''}" placeholder="Standard: ${std}"></label>
      </div></details>`;
  }
  function pruefungHtml(p, k) {
    const link = ziel => ziel === 'firma' ? ' <button class="link" data-act="tab" data-ansicht="einstellungen">Ergänzen</button>'
      : ziel === 'kunde' && k ? ` <button class="link" data-act="kundeBearbeiten" data-id="${k.id}">Kunde bearbeiten</button>` : '';
    const offen = p.fehler.length;
    return `<div class="pruef-kopf"><h2 style="margin:0">Rechts-Check</h2>${offen ? `<span class="pille ueberfaellig">${offen} fehlt</span>` : '<span class="pille bezahlt">Bereit</span>'}</div>
      <ul class="pruefliste" style="margin-top:12px">
        ${p.fehler.map(x => `<li class="f">${ic('fehler')}<span>${esc(x.text)}${link(x.ziel)}</span></li>`).join('')}
        ${p.warnungen.map(x => `<li class="w">${ic('warn')}<span>${esc(x.text)}${link(x.ziel)}</span></li>`).join('')}
        ${offen ? '' : `<li class="h">${ic('haken')}<span>Pflichtangaben nach § 14 Abs. 4 UStG vollständig</span></li>`}
        ${p.hinweise.map(h => `<li class="h">${ic('haken')}<span>${esc(HINWEIS_KURZ[h.id] || h.text)}</span></li>`).join('')}
      </ul>`;
  }
  function summenHtml(p) {
    const s = p.summen;
    return `<h2>Summe</h2><div class="summen">
      <div><span>Netto</span><span>${euro(s.nettoCent)}</span></div>
      ${p.reverseCharge ? `<div><span>USt (§ 13b – schuldet der Kunde)</span><span>${euro(0)}</span></div>` : s.gruppen.map(g => `<div><span>${g.satz} % USt auf ${euro(g.nettoCent)}</span><span>${euro(g.steuerCent)}</span></div>`).join('')}
      <div class="gesamt"><span>Rechnungsbetrag</span><span>${euro(s.bruttoCent)}</span></div>
      ${p.amGrundstueck && s.arbeitBruttoCent && !p.reverseCharge ? `<div class="anteil"><span>davon Arbeits-/Fahrtkosten (§ 35a)</span><span>${euro(s.arbeitBruttoCent)}</span></div>` : ''}
      <div class="anteil"><span>Fällig</span><span>${datumDe(p.faellig)} (${p.zahlungszielTage} Tage)</span></div>
    </div>`;
  }
  function entwurfBlatt(r) {
    const { fest } = festeFassung({ entwurf: r, firma: firma(), kunde: kunde(r.kundeId), nummer: '', datum: heute(), original: originalVon(r) });
    return blattHtml(fest, { entwurf: true, logo: firma().logo });
  }
  function teilAktualisieren() {
    const r = Z.entwurf, k = kunde(r.kundeId);
    const p = pruefeRechnung({ firma: firma(), kunde: k, rechnung: r, datum: heute(), original: originalVon(r) });
    teilErsetzen('#pruefung', pruefungHtml(p, k));
    teilErsetzen('#summen', summenHtml(p));
    teilErsetzen('#blatt', entwurfBlatt(r));
    const knopf = wurzel.querySelector('#festschreiben-knopf'); if (knopf) knopf.disabled = !p.ok;
    const z = wurzel.querySelector('#pos-zaehler'); if (z) z.textContent = `${r.positionen.filter(x => x.aktiv !== false).length} von ${r.positionen.length} angehakt`;
    blaetterSkalieren();
  }

  // ── Notizen → Rechnung ──
  /** Notizen in einen Entwurf übernehmen: erkannte Leistungen zusammenzählen, Zeitraum, Kunde und Baustelle ergänzen. */
  function notizenInEntwurf(liste, r) {
    const ns = liste.filter(n => n && !(r.notizen || []).includes(n.id));
    if (!ns.length) return;
    const hatteNotizen = (r.notizen || []).length > 0;
    const vs = vorschlaegeSumme(ns.map(notizText).filter(Boolean), leistungen());
    for (const p of vs) {
      const l = leistung(p.leistungId);
      if (!l) continue;
      const da = r.positionen.find(x => x.leistungId === l.id);
      if (!da) r.positionen.push(posAusLeistung(l, p.menge, { ausNotiz: true }));
      else if (da.ausNotiz) da.menge = Math.round((Number(da.menge) + p.menge) * 1000) / 1000;   // weitere Notizen: Mengen addieren
      else { if (p.menge > Number(da.menge)) da.menge = p.menge; da.ausNotiz = true; }          // Standardposition: nicht doppelt zählen
    }
    const daten = [...(r.notizen || []).map(id => speicher.holen('notizen', id)?.datum), ...ns.map(n => n.datum)].filter(istIso).sort();
    if (daten.length) {
      const von = daten[0], bis = daten[daten.length - 1];
      if (!hatteNotizen) { r.leistungVon = von; r.leistungBis = bis !== von ? bis : ''; }
      else {
        if (!istIso(r.leistungVon) || von < r.leistungVon) r.leistungVon = von;
        if (bis > (istIso(r.leistungBis) ? r.leistungBis : r.leistungVon)) r.leistungBis = bis;
        if (r.leistungBis === r.leistungVon) r.leistungBis = '';
      }
    }
    if (!r.kundeId) {
      r.kundeId = ns.map(n => baustelle(n.baustelleId)?.kundeId || n.kundeId).find(Boolean) || null;
      if (r.kundeId && kunde(r.kundeId)?.typ !== 'privat') r.amGrundstueck = false;
    }
    if (!r.baustelleId) {
      const ids = [...new Set(ns.map(n => n.baustelleId).filter(Boolean))];
      const b = ids.length === 1 ? baustelle(ids[0]) : null;
      if (b) { r.baustelleId = b.id; if (!String(r.betreff || '').trim()) r.betreff = bauvorhabenText(b); }
    }
    r.notizen = [...new Set([...(r.notizen || []), ...ns.map(n => n.id)])];
    for (const n of ns) speicher.aendern('notizen', { ...stripMeta(n), status: 'zugeordnet', rechnungId: r.id, kundeId: n.kundeId || r.kundeId || null });
    zeigeToast(vs.length ? `${mehrzahl(vs.length, 'Position', 'Positionen')} aus ${mehrzahl(ns.length, 'Notiz', 'Notizen')} übernommen – bitte prüfen`
      : `${ns.length === 1 ? 'Notiz' : ns.length + ' Notizen'} übernommen – Leistungen bitte ergänzen`);
  }
  /** Rechnung aus Notizen: offener Entwurf derselben Baustelle (bzw. desselben Kunden) – sonst ein neuer. */
  function rechnungAusNotizen(ns, { baustelleId = null, kundeId = null } = {}) {
    const b = baustelle(baustelleId);
    kundeId = b?.kundeId || kundeId || null;
    let r = rechnungen().filter(x => x.status === 'entwurf' && !x.freigabe && (b ? x.baustelleId === b.id : kundeId && x.kundeId === kundeId && !x.baustelleId))
      .sort((x, y) => String(y._geaendert).localeCompare(String(x._geaendert)))[0];
    if (r) { r = kopie(r); notizenInEntwurf(ns, r); speicher.aendern('rechnungen', stripMeta(r)); gehe('rechnung', r.id); return; }
    neueRechnung(kundeId, b ? { baustelleId: b.id, betreff: bauvorhabenText(b) } : {});
    notizenInEntwurf(ns, Z.entwurf);
    Z.entwurfNeu = false; entwurfSofortSpeichern(); render();
  }
  /** Neue Rechnung für eine Baustelle – gibt es schon einen offenen Entwurf, geht es dorthin. */
  function rechnungFuerBaustelle(b) {
    const e = rechnungen().find(r => r.status === 'entwurf' && !r.freigabe && r.baustelleId === b.id);
    if (e) gehe('rechnung', e.id); else neueRechnung(b.kundeId, { baustelleId: b.id, betreff: bauvorhabenText(b) });
  }

  // ── Rechnung ansehen (festgeschrieben) ──
  function ansichtRechnung(r) {
    const h = heute(), st = zahlstatus(r, h), f = r.fest, s = f.summen;
    const gezahlt = (r.zahlungen || []).reduce((a, z) => a + (Number(z.betragCent) || 0), 0);
    const storniertDurch = r.storniertDurch ? speicher.holen('rechnungen', r.storniertDurch) : null;
    const b = baustelle(r.baustelleId);
    let faelligText = '';
    if (st === 'ueberfaellig') faelligText = `seit ${tageZwischen(r.faellig, h)} Tagen überfällig`;
    else if (st === 'offen') { const t = tageZwischen(h, r.faellig); faelligText = t === 0 ? 'heute fällig' : `in ${t} Tag${t === 1 ? '' : 'en'}`; }
    return kopf({ titel: `${r.typ === 'storno' ? 'Storno' : 'Rechnung'} ${r.nummer}`, unter: f.kunde.name, zurueckKnopf: true, rechts: statusOrt() }) + `
      <div class="zweispaltig">
        <div class="stapel">
          <section class="karte"><h2>${pille(st)}<span class="rechts betrag" style="font-size:20px">${euro(s.bruttoCent)}</span></h2>
            <div class="summen">
              <div><span>Rechnungsdatum</span><span>${datumDe(r.datum)}</span></div>
              ${r.typ !== 'storno' ? `<div><span>Fällig am</span><span>${datumDe(r.faellig)}${faelligText ? ' · ' + faelligText : ''}</span></div>` : ''}
              ${b ? `<div><span>Baustelle</span><span><button class="link" data-act="baustelleOeffnen" data-id="${b.id}">${esc(b.name)}</button></span></div>` : ''}
              ${gezahlt ? `<div><span>Bezahlt</span><span>${euro(gezahlt)}</span></div>` : ''}
              ${['offen', 'ueberfaellig'].includes(st) ? `<div class="gesamt"><span>Noch offen</span><span>${euro(offenerBetrag(r))}</span></div>` : ''}
              ${storniertDurch ? `<div><span>Storniert durch</span><span>${esc(storniertDurch.nummer || 'Storno (wartet)')}</span></div>` : ''}
              ${f.original ? `<div><span>Storniert Rechnung</span><span>${esc(f.original.nummer)} vom ${datumDe(f.original.datum)}</span></div>` : ''}
            </div>
            ${(r.zahlungen || []).length ? `<div class="liste" style="margin-top:10px">${r.zahlungen.map((z, i) => `<div class="zeile" style="cursor:default"><span class="haupt">${ic('euro')} Zahlung vom ${datumDe(z.datum)}</span><span class="rechts">${euro(z.betragCent)}</span><span class="neben">${esc(z.notiz || 'Überweisung')}</span><span class="rechts"><button class="knopf leise" data-act="zahlungEntfernen" data-i="${i}">Entfernen</button></span></div>`).join('')}</div>` : ''}
          </section>
          <div class="knopfreihe">
            <button class="knopf" data-act="pdfOeffnen">${ic('druck')} PDF</button>
            ${['offen', 'ueberfaellig'].includes(st) ? `<button class="knopf zweit" data-act="zahlungDialog">${ic('euro')} Zahlung</button>` : ''}
            <button class="knopf zweit" data-act="mailHinweis">${ic('mail')} Mail</button>
          </div>
          <div class="knopfreihe leise-reihe">
            ${r.typ !== 'storno' ? `<button class="knopf leise" data-act="wieDiese">${ic('kopie')} Als neue Rechnung kopieren</button>` : ''}
            ${['offen', 'ueberfaellig', 'bezahlt'].includes(st) && r.typ !== 'storno' && !r.storniertDurch ? `<button class="knopf leise warnfarbe" data-act="stornoFragen">${ic('storno')} Stornieren</button>` : ''}
          </div>
          <p class="leise klein" style="margin:0">${ic('schloss')} Festgeschrieben${r.festgeschriebenAm ? ' am ' + new Date(r.festgeschriebenAm).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : ''} – unveränderbar archiviert${r.pdf?.datei ? ` (${esc(r.pdf.datei)})` : modus === 'vorschau' ? ' (in der Vorschau ohne PDF)' : ''}. Korrekturen nur per Storno.</p>
        </div>
        <div>${blattHtml(f, { entwurf: false, logo: firma().logo })}</div>
      </div>`;
  }
  let skalierer = null;
  function blaetterSkalieren() {
    const huellen = wurzel.querySelectorAll('[data-blatt]');
    if (!skalierer && 'ResizeObserver' in window) skalierer = new ResizeObserver(eintraege => eintraege.forEach(e => skaliere(e.target)));
    huellen.forEach(h => { skaliere(h); skalierer?.observe(h); });
  }
  function skaliere(h) {
    const b = h.firstElementChild; if (!b || !h.clientWidth) return;
    const s = h.clientWidth / b.offsetWidth;
    b.style.transform = `scale(${s})`;
    h.style.height = Math.ceil(b.offsetHeight * s) + 'px';
  }

  // ── Baustellen ──
  function ansichtBaustellen() {
    const viele = baustellen().length > 8;
    return kopf({ titel: 'Baustellen', rechts: statusOrt() + rundKnopf('neueBaustelle', 'plus', 'Neue Baustelle') }) + `
      <div class="stapel">
        <div class="filter">${[['aktiv', 'Laufend'], ['abgeschlossen', 'Abgeschlossen']].map(([w, t]) => `<button class="chip ${Z.filterB === w ? 'an' : ''}" data-act="baustellenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        ${viele ? `<label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-b" type="search" data-suche="B" value="${esc(Z.sucheB)}" placeholder="Suchen"></label>` : ''}
        <section class="karte"><div class="liste" id="liste-b">${baustellenListeHtml(viele)}</div></section>
      </div>`;
  }
  function baustellenListeHtml(mitSuche = true) {
    const q = mitSuche ? Z.sucheB.trim().toLowerCase() : '', zahlen = notizZahlen();
    const l = baustellenSortiert(false).filter(b => (Z.filterB === 'abgeschlossen') === (b.status === 'abgeschlossen')
      && (!q || [b.name, b.nummer, b.strasse, b.ort, kunde(b.kundeId)?.name].join(' ').toLowerCase().includes(q)));
    if (!l.length) return `<div class="leer">${Z.filterB === 'aktiv' && !q ? 'Noch keine laufenden Baustellen.' : 'Keine Baustellen.'}</div>`;
    return l.map(b => baustelleZeile(b, zahlen.get(b.id))).join('');
  }
  function baustelleZeile(b, z) {
    return `<button class="zeile" data-act="baustelleOeffnen" data-id="${b.id}"><span class="haupt">${esc(b.name)}</span>
      <span class="rechts">${z?.offen ? `<span class="zahl-badge" title="offene Notizen">${z.offen}</span>` : ''}</span>
      <span class="neben">${esc([kunde(b.kundeId)?.name, b.ort].filter(Boolean).join(' · ') || 'ohne Kunde')}</span><span></span></button>`;
  }
  function ansichtBaustelle() {
    const b = baustelle(Z.id), k = kunde(b.kundeId);
    const ns = notizenVon(b.id).sort(neuesteZuerst);
    const offen = ns.filter(istOffen).length;
    const rs = rechnungen().filter(r => r.baustelleId === b.id).sort((x, y) => String(y.datum || y._geaendert).localeCompare(String(x.datum || x._geaendert)));
    const entwurf = rs.find(r => r.status === 'entwurf' && !r.freigabe);
    const fertig = b.status === 'abgeschlossen';
    const tage = new Map();
    for (const n of ns) { const d = istIso(n.datum) ? n.datum : String(n.angelegt || '').slice(0, 10); if (!tage.has(d)) tage.set(d, []); tage.get(d).push(n); }
    return kopf({ titel: b.name, unter: [k?.name, adresse(b)].filter(Boolean).join(' · '), zurueckKnopf: true,
      rechts: statusOrt() + rundKnopf('baustelleBearbeiten', 'stift', 'Baustelle bearbeiten', `data-id="${b.id}"`) }) + `
      <div class="stapel">
        ${fertig ? `<div class="box">${ic('haken')}<span>Abgeschlossen${istIso(b.ende) ? ' am ' + datumDe(b.ende) : ''}</span></div>` : ''}
        <div class="knopfreihe zwei">
          <button class="knopf" data-act="baustelleNotiz" data-id="${b.id}">${ic('mikro')} Notiz</button>
          <button class="knopf zweit" data-act="${offen ? 'rechnungAusBaustelle' : 'rechnungFuerBaustelle'}" data-id="${b.id}">${ic('rechnung')} ${offen ? `Rechnung · ${offen}` : entwurf ? 'Zum Entwurf' : 'Rechnung'}</button>
        </div>
        ${b.notiz ? `<p class="hinweis-text">${esc(b.notiz)}</p>` : ''}
        <section class="karte">${ns.length ? [...tage].map(([d, l]) => `<div class="tag-kopf">${esc(tagText(d))}</div>${l.map(n => notizKarte(n, { imTagebuch: true })).join('')}`).join('')
          : '<div class="leer">Noch keine Notizen.</div>'}</section>
        ${rs.length ? `<section class="karte"><h2>Rechnungen</h2><div class="liste">${rs.map(rechnungZeile).join('')}</div></section>` : ''}
        <div><button class="knopf leise" data-act="baustelleStatus" data-id="${b.id}">${fertig ? 'Wieder öffnen' : 'Baustelle abschließen'}</button></div>
      </div>`;
  }
  function ansichtBaustelleForm() {
    const d = Z.form.daten, neu = Z.form.neu, k = kunde(d.kundeId);
    const inp = (feld, label, extra = '') => `<label class="feld ${extra.includes('ganz') ? 'ganz' : ''}"><span>${label}</span><input id="b-${feld}" data-form="${feld}" value="${esc(d[feld] || '')}" ${extra.replace('ganz', '')}></label>`;
    const seg = (feld, werte) => `<div class="segment">${werte.map(([w, t]) => `<button type="button" class="${d[feld] === w ? 'an' : ''}" data-act="formWahl" data-feld="${feld}" data-wert="${w}">${t}</button>`).join('')}</div>`;
    const leer = !neu && !notizenVon(d.id).length && !rechnungen().some(r => r.baustelleId === d.id);
    return kopf({ titel: neu ? 'Neue Baustelle' : 'Baustelle bearbeiten', unter: neu ? '' : d.nummer || '', zurueckKnopf: true }) + `
      <div class="stapel">
        <section class="karte"><div class="felder">
          ${inp('name', 'Name', 'ganz placeholder="z. B. Bad OG Schneider"')}
          <label class="feld ganz"><span>Kunde</span><select id="b-kunde" data-form="kundeId"><option value="">– noch offen –</option>${kunden().map(x => `<option value="${x.id}" ${d.kundeId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          ${inp('strasse', 'Straße und Hausnummer', 'ganz')}${inp('plz', 'PLZ', 'inputmode="numeric"')}${inp('ort', 'Ort')}
          ${k && adresse(k) !== adresse(d) ? `<div class="ganz"><button class="knopf leise" data-act="baustelleAdresseVomKunden">Anschrift des Kunden übernehmen</button></div>` : ''}
          <label class="feld"><span>Beginn</span><input type="date" id="b-beginn" data-form="beginn" value="${esc(d.beginn || '')}"></label>
          <div class="feld"><span>Stand</span>${seg('status', [['aktiv', 'Laufend'], ['abgeschlossen', 'Abgeschlossen']])}</div>
          <label class="feld ganz"><span>Hinweise</span><textarea id="b-notiz" data-form="notiz" placeholder="z. B. Schlüssel beim Hausmeister">${esc(d.notiz || '')}</textarea></label>
        </div></section>
        <div class="leiste-unten"><button class="knopf zweit" data-act="zurueck">Abbrechen</button><button class="knopf" data-act="baustelleSpeichern">${ic('haken')} Speichern</button></div>
        ${leer ? `<div><button class="knopf leise" data-act="baustelleLoeschenFragen" data-id="${d.id}">${ic('muell')} Baustelle löschen</button></div>` : ''}
      </div>`;
  }

  // ── Notizen ──
  function neueNotiz(vorgabe = {}) {
    const l = speicher.meta('letzteBaustelle');
    const b = l && Date.now() - l.zeit < 12 * 3600e3 ? baustelle(l.id) : null;   // am selben Arbeitstag: zuletzt benutzte Baustelle vorwählen
    return { id: neueId('n'), neu: true, text: '', baustelleId: b && b.status !== 'abgeschlossen' ? b.id : null, baustelleAuto: true, datum: heute(), fotos: [], audio: null, audioSekunden: 0, ...vorgabe };
  }
  function gemerkterEntwurf() {
    const e = speicher.meta('notizEntwurf');
    return e && e.id && e.neu && !speicher.holen('notizen', e.id) ? { ...e, fotos: [...(e.fotos || [])] } : null;
  }
  let merkTimer = null;
  function notizMerkenBald() { clearTimeout(merkTimer); merkTimer = setTimeout(notizMerken, 400); }
  /** Ungespeicherte neue Notiz auf dem Gerät festhalten – übersteht Neuladen und das Beenden der App. */
  function notizMerken() { clearTimeout(merkTimer); const n = Z.notiz; if (n?.neu) speicher.setMeta('notizEntwurf', notizLeer(n) ? null : kopie(n)); }

  function ansichtNotiz() {
    const n = Z.notiz, bearbeiten = !n.neu, st = n.status || 'offen';
    const r = n.rechnungId ? speicher.holen('rechnungen', n.rechnungId) : null;
    const leise = bearbeiten ? [
      st === 'offen' ? `<button class="knopf leise" data-act="notizRechnung" data-id="${n.id}">${ic('rechnung')} In Rechnung</button>` : '',
      r ? `<button class="knopf leise" data-act="oeffneRechnung" data-id="${r.id}">${ic('rechnung')} ${r.nummer ? 'Rechnung ' + esc(r.nummer) : 'Zum Entwurf'}</button>` : '',
      st === 'offen' ? `<button class="knopf leise" data-act="notizErledigt" data-id="${n.id}" title="Ohne Rechnung abhaken">${ic('haken')} Erledigt</button>`
        : st === 'erledigt' ? `<button class="knopf leise" data-act="notizWiederOffen" data-id="${n.id}">Wieder offen</button>` : '',
      st !== 'abgerechnet' ? `<button class="knopf leise" data-act="notizLoeschenFragen" data-id="${n.id}">${ic('muell')} Löschen</button>` : ''
    ].join('') : `<button class="knopf leise" data-act="notizVerwerfen" id="n-verwerfen" ${notizLeer(n) ? 'hidden' : ''}>Verwerfen</button>`;
    return kopf({ titel: bearbeiten ? 'Notiz' : 'Neue Notiz', unter: bearbeiten ? [datumKurz(n.datum), n.geraetName].filter(Boolean).join(' · ') : '', zurueckKnopf: true, rechts: statusOrt() }) + `
      <div class="stapel notiz-seite">
        ${bearbeiten && st !== 'offen' ? `<div class="box">${ic(st === 'abgerechnet' ? 'schloss' : 'haken')}<span>${st === 'abgerechnet' ? `Abgerechnet${r?.nummer ? ' mit Rechnung ' + esc(r.nummer) : ''}` : st === 'zugeordnet' ? 'Steckt in einem Rechnungsentwurf' : 'Erledigt (ohne Rechnung)'}</span></div>` : ''}
        <div id="n-baustellen">${baustellenWahlHtml()}</div>
        <textarea id="n-text" data-n="text" rows="5" placeholder="Was wurde gemacht?" aria-label="Notiz">${esc(n.text)}</textarea>
        <div class="zwischen" id="d-zwischen"></div>
        <div class="notiz-leiste">
          <span id="diktat">${diktatHtml()}</span>
          <label class="knopf zweit symbol foto-knopf" title="Foto aufnehmen">${ic('kamera')}<input type="file" accept="image/*" capture="environment" data-act-change="fotoGewaehlt" aria-label="Foto aufnehmen"></label>
          <label class="knopf zweit symbol foto-knopf" title="Aus der Galerie">${ic('bild')}<input type="file" accept="image/*" multiple data-act-change="fotoGewaehlt" aria-label="Fotos aus der Galerie"></label>
          <label class="knopf leise datum-knopf" title="Datum ändern">${ic('kalender')}<span id="n-datum-text">${esc(datumKurz(n.datum) || 'Datum')}</span><input type="date" id="n-datum" data-n="datum" value="${esc(n.datum)}" aria-label="Datum"></label>
        </div>
        ${n.audio ? aufnahmeHtml(n) : ''}
        ${n.fotos.length ? fotosHtml(n.fotos, true) : ''}
        <div class="erkannt-zeile" id="erkannt">${erkanntHtml(n)}</div>
        <button class="knopf voll" data-act="notizSpeichern" id="n-speichern" ${notizLeer(n) ? 'disabled' : ''}>Speichern</button>
        <div class="knopfreihe leise-reihe">${leise}</div>
      </div>`;
  }
  function baustellenWahlHtml() {
    const n = Z.notiz, gewaehlt = baustelle(n.baustelleId);
    const liste = [...(gewaehlt ? [gewaehlt] : []), ...baustellenSortiert(true).filter(b => b.id !== gewaehlt?.id)].slice(0, 12);
    return `<div class="filter baustellen-wahl" aria-label="Baustelle">${liste.map(b => `<button class="chip ${b.id === n.baustelleId ? 'an' : ''}" data-act="notizBaustelle" data-id="${b.id}">${b.id === n.baustelleId ? ic('haken') : ''}${esc(b.name)}</button>`).join('')}
      <button class="chip dazu" data-act="baustelleSchnell">Baustelle</button>
      <button class="chip ${!n.baustelleId ? 'an' : ''}" data-act="notizBaustelle" data-id="">Ohne</button></div>`;
  }
  /** Erkannte Leistungen als stille Zeile unter der Notiz. */
  function erkanntHtml(n, v = null) {
    const text = notizText(n);
    if (!text.trim()) return '';
    v = v || vorschlaegeAus(text, leistungen(), kunden(), baustellen());
    if (!v.positionen.length) return '';
    return `${ic('okkreis')}<span>${v.positionen.map(p => `${esc(mengeText(p.menge))} ${esc(p.einheit)} ${esc(p.bezeichnung)}`).join(' · ')}</span>`;
  }
  function ansichtNotizen() {
    return kopf({ titel: 'Notizen', zurueckKnopf: Z.verlauf.length > 0, rechts: statusOrt() }) + `
      <div class="stapel">
        <div class="filter">${[['offen', 'Offen'], ['ohne', 'Ohne Baustelle'], ['alle', 'Alle']].map(([w, t]) => `<button class="chip ${Z.filterN === w ? 'an' : ''}" data-act="notizenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        <section class="karte" id="liste-n">${notizenListeHtml()}</section>
      </div>`;
  }
  function notizenListeHtml() {
    let l = notizen();
    if (Z.filterN === 'offen') l = l.filter(istOffen);
    if (Z.filterN === 'ohne') l = l.filter(n => !n.baustelleId && n.status !== 'abgerechnet');
    l.sort(neuesteZuerst);
    if (!l.length) return `<div class="leer">${Z.filterN === 'offen' ? 'Keine offenen Notizen.' : Z.filterN === 'ohne' ? 'Alle Notizen sind einer Baustelle zugeordnet.' : 'Noch keine Notizen.'}</div>`;
    return l.slice(0, 60).map(n => notizKarte(n)).join('') + (l.length > 60 ? `<div class="leer">… und ${l.length - 60} ältere</div>` : '');
  }
  const fotosHtml = (ids, loeschbar = false) => `<div class="fotos">${ids.map(id => `<div class="foto"><button class="foto-oeffnen" data-act="fotoZeigen" data-id="${id}" aria-label="Foto ansehen"><img src="${esc(dateiUrl(id))}" alt="" loading="lazy"></button>
    ${loeschbar ? `<button class="loeschen" data-act="fotoEntfernen" data-id="${id}" aria-label="Foto entfernen">${ic('muell')}</button>` : ''}</div>`).join('')}</div>`;
  /** Stand der Abschrift einer Sprachaufnahme in wenigen Worten. */
  function abschriftStand(n) {
    const s = n.abschriftStatus;
    if (s === 'fertig') return n.abschrift ? '' : 'kein Text erkannt';
    if (s === 'keine-erkennung') return 'Abtippen am Laptop nicht eingerichtet';
    if (s === 'fehler') return 'Abtippen fehlgeschlagen';
    return n._seq ? 'wird am Laptop abgetippt …' : 'wird abgetippt, sobald der Laptop erreichbar ist';
  }
  function aufnahmeHtml(n) {
    // Abschrift nur zeigen, wenn sie zu genau dieser (gespeicherten) Aufnahme gehört – nicht zu einer gerade neu aufgenommenen
    const gespeichert = n.neu ? null : speicher.holen('notizen', n.id);
    const gleicheAufnahme = !!gespeichert && gespeichert.audio === n.audio;
    const fertig = gleicheAufnahme && n.abschriftStatus === 'fertig' && n.abschrift;
    return `<div class="aufnahme"><div class="aufnahme-kopf"><audio controls preload="metadata" src="${esc(dateiUrl(n.audio))}"></audio>
        <button class="loeschen" data-act="aufnahmeEntfernen" aria-label="Aufnahme entfernen" title="Aufnahme entfernen">${ic('muell')}</button></div>
      ${fertig ? (n.abschriftUebernommen ? '' : `<p class="abschrift-text">${esc(n.abschrift)} <button class="link" data-act="abschriftUebernehmen">In den Text</button></p>`)
        : `<span class="leise klein">${ic('welle')} ${gleicheAufnahme ? esc(abschriftStand(n)) : 'Der Laptop tippt die Aufnahme nach dem Speichern ab.'}</span>`}
    </div>`;
  }
  /** Notiz in Listen und im Bautagebuch – antippen öffnet sie. */
  function notizKarte(n, { imTagebuch = false } = {}) {
    const b = baustelle(n.baustelleId), st = n.status || 'offen';
    const [stText, stKlasse] = NOTIZ_STATUS[st] || NOTIZ_STATUS.offen;
    const abschrift = n.abschriftStatus === 'fertig' && n.abschrift && !n.abschriftUebernommen ? n.abschrift : '';
    const fuss = imTagebuch ? [uhrzeit(n.angelegt), n.geraetName] : [datumKurz(n.datum), b ? b.name : 'Ohne Baustelle'];
    return `<div class="notiz-karte ${st === 'erledigt' ? 'blass' : ''}" data-act="notizBearbeiten" data-id="${n.id}" role="button" tabindex="0">
      ${n.text ? `<p>${esc(n.text)}</p>` : ''}
      ${abschrift ? `<p class="${n.text ? 'abschrift-text' : ''}">${esc(abschrift)}</p>` : ''}
      ${n.audio && !abschrift ? `<p class="leise klein">${ic('welle')} Sprachaufnahme ${dauerText(n.audioSekunden || 0)} – ${esc(abschriftStand(n))}</p>` : ''}
      ${(n.fotos || []).length || n.audio ? `<div class="medien">${(n.fotos || []).length ? fotosHtml(n.fotos) : ''}${n.audio ? `<audio controls preload="metadata" src="${esc(dateiUrl(n.audio))}"></audio>` : ''}</div>` : ''}
      <div class="nk-fuss"><span>${esc(fuss.filter(Boolean).join(' · '))}</span>${st !== 'offen' ? `<span class="pille ${stKlasse}">${stText}</span>` : ''}</div>
    </div>`;
  }
  /** Nach Tippen oder Diktat: Erkennung, automatische Baustelle, Speichern-Knopf – ohne das Eingabefeld neu zu zeichnen. */
  function notizTextGeaendert() {
    const n = Z.notiz;
    const v = vorschlaegeAus(notizText(n), leistungen(), kunden(), baustellen());
    if (n.neu && n.baustelleAuto && v.baustelle && v.baustelle.id !== n.baustelleId) { n.baustelleId = v.baustelle.id; teilErsetzen('#n-baustellen', baustellenWahlHtml()); }
    teilErsetzen('#erkannt', erkanntHtml(n, v));
    notizKnoepfeAktualisieren();
    notizMerkenBald();
  }
  function notizKnoepfeAktualisieren() {
    const n = Z.notiz;
    const k = wurzel.querySelector('#n-speichern'); if (k) k.disabled = notizLeer(n);
    const vw = wurzel.querySelector('#n-verwerfen'); if (vw) vw.hidden = notizLeer(n);
  }
  /** Bearbeitete Notiz ablegen (ohne die Ansicht zu wechseln). */
  function notizSichern(extra = {}) {
    const n = Z.notiz;
    const alt = n.neu ? null : speicher.holen('notizen', n.id);
    const b = baustelle(n.baustelleId);
    const v = b ? null : vorschlaegeAus(notizText(n), leistungen(), kunden());
    const neu = speicher.aendern('notizen', {
      ...(alt ? stripMeta(alt) : {}), id: n.id, text: String(n.text || '').trim(), baustelleId: b?.id || null,
      kundeId: b ? b.kundeId || null : v?.kunde?.id || alt?.kundeId || null,
      datum: istIso(n.datum) ? n.datum : heute(), fotos: [...n.fotos], audio: n.audio || null, audioSekunden: n.audio ? Number(n.audioSekunden) || 0 : 0,
      abschriftUebernommen: !!n.abschriftUebernommen, status: alt?.status || 'offen', rechnungId: alt?.rechnungId || null,
      angelegt: alt?.angelegt || new Date().toISOString(), geraetName: alt?.geraetName || speicher.geraet.name, ...extra
    });
    if (b) speicher.setMeta('letzteBaustelle', { id: b.id, zeit: Date.now() });
    return neu;
  }

  // ── Diktat ──
  // Live: die Spracherkennung des Browsers schreibt mit. Aufnahme: WAV an der Notiz, der Laptop tippt ab (whisper.cpp).
  // In der Vorschau (ohne Mikrofon) wird beides mit einem Beispielsatz vorgeführt.
  const liveHier = () => modus === 'vorschau' || (liveDiktatMoeglich() && !(istIOS() && istHomeBildschirmApp()) && speicher.meta('liveGesperrt') !== true);
  const aufnahmeHier = () => modus === 'vorschau' || aufnahmeMoeglich();
  function diktatArt() {
    const wahl = speicher.meta('diktatModus') || 'live';
    if (wahl === 'aufnahme') return aufnahmeHier() ? 'aufnahme' : liveHier() ? 'live' : null;
    return liveHier() ? 'live' : aufnahmeHier() ? 'aufnahme' : null;
  }
  function diktatHtml() {
    const d = Z.diktat;
    if (d) {
      const aufnahme = d.art === 'aufnahme' || d.alsAufnahme;
      return `<button type="button" class="knopf diktat-pille an" data-act="diktatStopp" aria-label="Diktat beenden">
        <span class="pegel ${aufnahme ? '' : 'auto'}" id="d-pegel" style="--p:${(d.pegel || 0).toFixed(2)}"><i></i><i></i><i></i><i></i></span>
        <span id="d-zeit">${d.endet ? '…' : dauerText(d.sek || 0)}</span>${ic('stopp')}</button>`;
    }
    return diktatArt() ? `<button type="button" class="knopf zweit diktat-pille" data-act="diktatStart">${ic('mikro')} Diktieren</button>` : '';
  }
  const diktatNeuZeichnen = () => teilErsetzen('#diktat', diktatHtml());
  /** Zeit, Pegel und Zwischentext aktualisieren – ohne den Knopf neu zu bauen (sonst gehen Antipper verloren). */
  function diktatTick() {
    const d = Z.diktat; if (!d) return;
    const z = wurzel.querySelector('#d-zeit'); if (z && !d.endet) z.textContent = dauerText(d.sek || 0);
    const p = wurzel.querySelector('#d-pegel'); if (p) p.style.setProperty('--p', (d.pegel || 0).toFixed(2));
    const w = wurzel.querySelector('#d-zwischen'); if (w && w.textContent !== (d.zwischen || '')) w.textContent = d.zwischen || '';
  }
  function diktatText(neu) {
    const n = Z.notiz; if (!n || !String(neu || '').trim()) return;
    n.text = anhaengen(n.text, neu);
    const ta = wurzel.querySelector('#n-text');
    if (ta) { ta.value = n.text; ta.scrollTop = ta.scrollHeight; }
    notizTextGeaendert();
  }
  function neuesDiktat(art, extra = {}) {
    const d = { art, start: Date.now(), sek: 0, pegel: 0, zwischen: '', ...extra };
    d.ende = new Promise(ok => { d.fertig = ok; });
    Z.diktat = d;
    return d;
  }
  function diktatEnde(d) {
    if (d.beendet) return;
    d.beendet = true;
    clearInterval(d.uhr); clearTimeout(d.notaus);
    if (d.art === 'live' && d.zwischen?.trim()) diktatText(d.zwischen);   // nicht mehr abgeschlossener Satzteil geht nicht verloren
    if (Z.diktat === d) Z.diktat = null;
    const w = wurzel.querySelector('#d-zwischen'); if (w) w.textContent = '';
    diktatNeuZeichnen();
    d.fertig();
  }
  function diktatStoppen() {
    const d = Z.diktat;
    if (!d) return Promise.resolve();
    if (!d.endet) {
      d.endet = true;
      if (d.art === 'live') { try { d.steuerung?.stopp(); } catch { /* schon beendet */ } d.notaus = setTimeout(() => diktatEnde(d), 1500); diktatNeuZeichnen(); }
      else if (d.art === 'aufnahme') { diktatNeuZeichnen(); if (d.steuerung) aufnahmeBeenden(d); }
      else vorfuehrungBeenden(d);
    }
    return d.ende;
  }
  async function diktatStarten() {
    if (Z.diktat || !Z.notiz) return;
    const art = diktatArt();
    if (!art) return;
    if (modus === 'vorschau') return vorfuehrungStarten(art);
    if (art === 'live') {
      const d = neuesDiktat('live', { festLaenge: 0 });
      try {
        d.steuerung = liveDiktat({
          beiText: (fest, zwischen) => {
            if (d.beendet) return;
            const neu = fest.slice(d.festLaenge); d.festLaenge = fest.length;
            if (neu.trim()) diktatText(neu);
            d.zwischen = zwischen; diktatTick();
          },
          beiFehler: fehler => {
            d.zwischen = ''; diktatEnde(d);
            if ((fehler === 'not-allowed' || fehler === 'service-not-allowed') && aufnahmeMoeglich()) {
              speicher.setMeta('liveGesperrt', true);   // ab jetzt Aufnahme – starten darf sie nur ein neues Antippen
              diktatNeuZeichnen();
              zeigeToast('Live-Diktat ist hier gesperrt – bitte nochmal auf „Diktieren" tippen: Dann wird aufgenommen und der Laptop tippt ab.');
            } else zeigeToast({ 'not-allowed': 'Kein Zugriff aufs Mikrofon – bitte in den Einstellungen erlauben.', network: 'Live-Diktat braucht Internet – in den Einstellungen auf „Aufnahme" stellen.',
              'audio-capture': 'Kein Mikrofon gefunden.' }[fehler] || `Diktat unterbrochen (${fehler})`);
          },
          beiEnde: () => diktatEnde(d)
        });
      } catch (e) { diktatEnde(d); zeigeToast('Diktat konnte nicht starten: ' + (e?.message || e)); return; }
      d.uhr = setInterval(() => { d.sek = (Date.now() - d.start) / 1000; diktatTick(); }, 500);
      diktatNeuZeichnen();
      return;
    }
    const d = neuesDiktat('aufnahme');
    diktatNeuZeichnen();
    try {
      d.steuerung = await aufnahmeStarten({
        beiPegel: (pegel, sek) => { d.pegel = pegel; d.sek = sek; diktatTick(); },
        maxSekunden: 300,
        beiMaximum: () => { if (!d.endet) { zeigeToast('5 Minuten erreicht – Aufnahme beendet. Für mehr einfach weiter diktieren.'); diktatStoppen(); } }
      });
      if (d.endet) aufnahmeBeenden(d);   // während der Mikrofon-Freigabe schon wieder gestoppt
    } catch (e) {
      diktatEnde(d);
      zeigeToast(e?.name === 'NotAllowedError' ? 'Kein Zugriff aufs Mikrofon – bitte in den Einstellungen des Telefons erlauben.' : 'Aufnahme nicht möglich: ' + (e?.message || e));
    }
  }
  async function aufnahmeBeenden(d) {
    try {
      const erg = await d.steuerung.stopp();
      if (erg.sekunden < 0.6) zeigeToast('Aufnahme zu kurz – nichts gespeichert');
      else await aufnahmeAnhaengen(erg.blob, erg.sekunden);
    } catch (e) { console.warn(e); zeigeToast('Aufnahme konnte nicht gespeichert werden'); }
    diktatEnde(d);
    if (Z.ansicht === 'notiz') render();
  }
  /** Aufnahme an die Notiz hängen – war schon eine da, wird angehängt (eine Notiz = eine Aufnahme). */
  async function aufnahmeAnhaengen(blob, sekunden) {
    const n = Z.notiz;
    if (!n) return null;
    if (n.audio) {
      const alt = speicher.dateiHolen(n.audio)?.blob || await fetch(dateiUrl(n.audio)).then(r => (r.ok ? r.blob() : null)).catch(() => null);
      if (alt) { try { blob = await wavVerbinden(alt, blob); sekunden += Number(n.audioSekunden) || 0; } catch { /* dann nur die neue */ } }
      if (n.neu) speicher.dateiVerwerfen(n.audio);
    }
    const id = await speicher.dateiAblegen(blob, 'audio/wav');
    n.audio = id; n.audioSekunden = Math.round(sekunden * 10) / 10;
    n.abschriftUebernommen = false;   // die neue Abschrift umfasst die ganze Aufnahme – wieder anzeigen
    notizMerken();
    return id;
  }
  function vorfuehrungStarten(art) {
    const satz = vorschau?.diktatBeispiel?.(baustelle(Z.notiz.baustelleId)) || 'Zweieinhalb Stunden Silikonfuge erneuert, vier Meter, Anfahrt.';
    const worte = satz.split(/\s+/);
    const d = neuesDiktat('vorfuehrung', { alsAufnahme: art === 'aufnahme', satz, i: 0, puffer: [] });
    d.uhr = setInterval(() => {
      if (d.endet) return;
      d.sek = (Date.now() - d.start) / 1000; d.pegel = 0.25 + Math.random() * 0.7;
      if (d.i < worte.length) {
        const w = worte[d.i++];
        if (!d.alsAufnahme) {
          d.puffer.push(w);
          if (/[,.;:!?]$/.test(w) || d.i === worte.length) { const teil = d.puffer.join(' '); d.puffer = []; d.zwischen = ''; diktatText(teil); }
          else d.zwischen = d.puffer.join(' ');
        }
      } else { diktatStoppen(); return; }
      diktatTick();
    }, 330);
    diktatNeuZeichnen();
  }
  async function vorfuehrungBeenden(d) {
    clearInterval(d.uhr);
    if (!d.alsAufnahme && d.puffer.length) { diktatText(d.puffer.join(' ')); d.puffer = []; }
    d.zwischen = '';
    if (d.alsAufnahme && vorschau?.aufnahmeNachbilden) {
      const sek = Math.max(1.5, d.sek);
      const id = await aufnahmeAnhaengen(vorschau.aufnahmeNachbilden(sek), sek);
      Z.notiz.vorfuehrText = anhaengen(Z.notiz.vorfuehrText || '', d.satz);
      vorschau.abschriftVormerken?.(id, Z.notiz.vorfuehrText);   // der nachgebildete Laptop „tippt" nach dem Hochladen ab
    }
    diktatEnde(d);
    if (d.alsAufnahme && Z.ansicht === 'notiz') render();
  }

  // ── Kunden ──
  function ansichtKunden() {
    const f = [['alle', 'Alle'], ['privat', 'Privat'], ['firma', 'Firmen'], ['behoerde', 'Behörden']];
    return kopf({ titel: 'Kunden', zurueckKnopf: Z.verlauf.length > 0, rechts: statusOrt() + rundKnopf('neuerKunde', 'plus', 'Neuer Kunde') }) + `
      <div class="stapel">
        <div class="filter">${f.map(([w, t]) => `<button class="chip ${Z.filterK === w ? 'an' : ''}" data-act="kundenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-k" type="search" data-suche="K" value="${esc(Z.sucheK)}" placeholder="Suchen"></label>
        <section class="karte"><div class="liste" id="liste-k">${kundenListeHtml()}</div></section>
      </div>`;
  }
  function kundenListeHtml() {
    const q = Z.sucheK.trim().toLowerCase(), h = heute();
    const l = kunden().filter(k => (Z.filterK === 'alle' || k.typ === Z.filterK) && (!q || [k.name, k.ort, k.nummer, k.mail].join(' ').toLowerCase().includes(q)));
    if (!l.length) return '<div class="leer">Keine Kunden gefunden.</div>';
    return l.map(k => {
      const offen = rechnungen().filter(r => r.kundeId === k.id && ['offen', 'ueberfaellig'].includes(zahlstatus(r, h))).reduce((s, r) => s + offenerBetrag(r), 0);
      return `<button class="zeile" data-act="kundeOeffnen" data-id="${k.id}"><span class="haupt">${esc(k.name)}</span><span class="rechts">${offen ? euro(offen) : ''}</span>
        <span class="neben">${esc([KUNDENTYPEN[k.typ], k.ort].filter(Boolean).join(' · '))}</span><span></span></button>`;
    }).join('');
  }
  function ansichtKunde() {
    const d = Z.form.daten, neu = Z.form.neu;
    const seg = (feld, werte) => `<div class="segment">${werte.map(([w, t]) => `<button type="button" class="${d[feld] === w ? 'an' : ''}" data-act="formWahl" data-feld="${feld}" data-wert="${w}">${t}</button>`).join('')}</div>`;
    const inp = (feld, label, extra = '') => `<label class="feld ${extra.includes('ganz') ? 'ganz' : ''}"><span>${label}</span><input id="k-${feld}" data-form="${feld}" value="${esc(d[feld] || '')}" ${extra.replace('ganz', '')}></label>`;
    const ihreRechnungen = neu ? [] : rechnungen().filter(r => r.kundeId === d.id).sort((a, b) => String(b._geaendert).localeCompare(String(a._geaendert)));
    const ihreBaustellen = neu ? [] : baustellenSortiert(false).filter(b => b.kundeId === d.id);
    const zahlen = notizZahlen();
    return kopf({ titel: neu ? 'Neuer Kunde' : d.name || 'Kunde', unter: neu ? '' : `${d.nummer || 'Nummer folgt beim Abgleich'} · ${KUNDENTYPEN[d.typ]}`, zurueckKnopf: true }) + `
      <div class="stapel">
        <section class="karte"><div class="felder">
          <div class="feld ganz"><span>Art</span>${seg('typ', [['privat', 'Privat'], ['firma', 'Firma'], ['behoerde', 'Behörde']])}</div>
          ${d.typ === 'privat' ? `<div class="feld ganz"><span>Anrede</span>${seg('anrede', [['Herr', 'Herr'], ['Frau', 'Frau'], ['', 'Familie / ohne']])}</div>` : ''}
          ${inp('name', d.typ === 'privat' ? 'Name' : d.typ === 'firma' ? 'Firmenname' : 'Behörde / Dienststelle', 'ganz')}
          ${inp('zusatz', 'Zusatz (z. B. z. Hd. Frau Maier)', 'ganz')}
          ${inp('strasse', 'Straße und Hausnummer', 'ganz')}
          ${inp('plz', 'PLZ', 'inputmode="numeric"')}${inp('ort', 'Ort')}
          ${inp('mail', 'E-Mail', 'type="email"')}${inp('telefon', 'Telefon', 'type="tel"')}
          <div class="feld ganz"><span>Rechnung per</span>${seg('versand', [['mail', 'E-Mail (PDF)'], ['post', 'Post']])}</div>
          ${d.versand === 'mail' ? `<label class="schalter ganz"><input type="checkbox" id="k-zust" data-form-schalter="zustimmungMail" ${d.zustimmungMail ? 'checked' : ''}><span>Einverstanden mit Rechnungen per E-Mail${d.zustimmungMail ? ` (vermerkt am ${datumDe(d.zustimmungMail)})` : ''}</span></label>` : ''}
          ${d.typ === 'firma' ? inp('ustId', 'USt-IdNr. (optional)', 'placeholder="DE123456789"') : ''}
          ${d.typ === 'behoerde' ? inp('leitwegId', 'Leitweg-ID', 'placeholder="z. B. 09162000-12345-06"') : ''}
          ${d.typ === 'firma' ? `<label class="schalter ganz"><input type="checkbox" id="k-13b" data-form-schalter="bauleistender13b" ${d.bauleistender13b ? 'checked' : ''}><span>Erbringt selbst Bauleistungen (§ 13b UStG)<br><small class="leise">Dann schuldet der Kunde die Umsatzsteuer – die Rechnung geht ohne USt raus.</small></span></label>` : ''}
          ${d.ustId && !ustIdGueltig(d.ustId) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die USt-IdNr. hat nicht das Format DE + 9 Ziffern.</span></div>' : ''}
          <label class="feld"><span>Zahlungsziel in Tagen</span><input id="k-ziel" data-form="zahlungszielTage" inputmode="numeric" value="${d.zahlungszielTage ?? ''}" placeholder="Standard"></label>
        </div></section>
        <section class="karte"><h2>Wiederkehrende Positionen</h2>
          <div class="liste">${(d.standard || []).map((s, i) => { const l = leistung(s.leistungId); return l ? `<div class="zeile" style="cursor:default"><span class="haupt">${esc(l.bezeichnung)}</span>
            <span class="rechts"><button class="loeschen" data-act="standardEntfernen" data-i="${i}" aria-label="Entfernen">${ic('muell')}</button></span>
            <span class="neben"><input id="k-std-${i}" data-std="${i}" inputmode="decimal" value="${mengeText(s.menge)}" style="width:80px;min-height:34px;padding:5px 8px"> ${esc(l.einheit)} · ${euro(l.preisCent)}</span><span></span></div>` : ''; }).join('') || '<div class="leer">Keine.</div>'}</div>
          <button class="knopf leise" data-act="katalogOeffnen" data-ziel="standard" style="margin-top:6px">${ic('plus')} Position</button>
        </section>
        <section class="karte"><h2>Notiz</h2><textarea id="k-notiz" data-form="notiz" placeholder="z. B. Schlüssel beim Nachbarn">${esc(d.notiz || '')}</textarea></section>
        <div class="leiste-unten"><button class="knopf zweit" data-act="zurueck">Abbrechen</button><button class="knopf" data-act="kundeSpeichern">${ic('haken')} Speichern</button></div>
        ${neu ? '' : `<section class="karte"><h2>Baustellen<button class="knopf leise rechts" data-act="baustelleFuerKunde" data-id="${d.id}">${ic('plus')} Neu</button></h2>
          <div class="liste">${ihreBaustellen.length ? ihreBaustellen.map(b => baustelleZeile(b, zahlen.get(b.id))).join('') : '<div class="leer">Keine.</div>'}</div></section>
          <section class="karte"><h2>Rechnungen<button class="knopf leise rechts" data-act="neueRechnungFuer" data-id="${d.id}">${ic('plus')} Neu</button></h2>
          <div class="liste">${ihreRechnungen.length ? ihreRechnungen.map(rechnungZeile).join('') : '<div class="leer">Keine.</div>'}</div></section>
          ${!ihreRechnungen.length && !ihreBaustellen.length ? `<div><button class="knopf leise" data-act="kundeLoeschenFragen">${ic('muell')} Kunde löschen</button></div>` : ''}`}
      </div>`;
  }

  // ── Leistungen (Katalog, nach Kategorien geordnet – zum schnellen Finden) ──
  function ansichtLeistungen() {
    const ks = kategorien();
    const ohne = ks.length && leistungen().some(l => !kategorie(l.kategorieId));
    const chips = [['alle', 'Alle', null], ...ks.map(k => [k.id, k.name, k]), ...(ohne ? [['ohne', 'Ohne Kategorie', null]] : [])];
    if (Z.filterL !== 'alle' && !chips.some(([w]) => w === Z.filterL)) Z.filterL = 'alle';
    return kopf({ titel: 'Leistungen', unter: 'Preise netto', zurueckKnopf: Z.verlauf.length > 0,
      rechts: statusOrt() + rundKnopf('kategorienOeffnen', 'kategorie', 'Kategorien') + rundKnopf('neueLeistung', 'plus', 'Neue Leistung') }) + `
      <div class="stapel">
        ${ks.length ? `<div class="filter">${chips.map(([w, t, k]) => `<button class="chip ${Z.filterL === w ? 'an' : ''}" data-act="leistungenFilter" data-wert="${w}">${k ? punkt(k) : ''}${esc(t)}</button>`).join('')}</div>`
          : `<div class="box">${ic('kategorie')}<div>Mit Kategorien findest du Leistungen schneller.<div class="knopfreihe"><button class="knopf zweit" data-act="kategorienVorschlag">Vorschlag übernehmen</button><button class="knopf leise" data-act="kategorieNeu">Eigene anlegen</button></div></div></div>`}
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-l" type="search" data-suche="L" value="${esc(Z.sucheL)}" placeholder="Suchen"></label>
        <div id="liste-l" class="stapel">${leistungenListeHtml()}</div>
      </div>`;
  }
  function leistungenListeHtml(auswahl = false) {
    const q = (auswahl ? Z.dialog?.suche || '' : Z.sucheL).trim().toLowerCase();
    const filter = auswahl ? Z.dialog?.kat || 'alle' : Z.filterL;
    const ks = kategorien();
    const l = leistungen().filter(x => (!q || [x.bezeichnung, x.suchwoerter, x.beschreibung].join(' ').toLowerCase().includes(q))
      && (filter === 'alle' || (filter === 'ohne' ? !ks.some(k => k.id === x.kategorieId) : x.kategorieId === filter)));
    if (!l.length) return '<div class="leer">Keine Leistungen gefunden.</div>';
    // Mit Kategorien danach gruppiert (Reihenfolge wie festgelegt), sonst nach Art der Leistung
    const gruppen = ks.length
      ? [...ks.map(k => [`${punkt(k)}${esc(k.name)}`, l.filter(x => x.kategorieId === k.id)]), ['Ohne Kategorie', l.filter(x => !ks.some(k => k.id === x.kategorieId))]]
      : Object.keys(ARTEN).map(a => [ARTEN[a], l.filter(x => (x.art || 'sonstiges') === a)]);
    const zeile = x => `<button class="zeile" data-act="${auswahl ? 'katalogWahl' : 'leistungOeffnen'}" data-id="${x.id}"><span class="haupt">${x.favorit ? '<span class="stern">★</span> ' : ''}${esc(x.bezeichnung)}</span>
      <span class="rechts">${euro(x.preisCent)}</span><span class="neben">${esc(x.einheit)}${(x.steuersatz ?? 19) !== 19 ? ` · ${x.steuersatz} % USt` : ''}${x.beschreibung ? ' · ' + esc(x.beschreibung) : ''}</span><span></span></button>`;
    return gruppen.filter(([, g]) => g.length).map(([titel, g]) => auswahl ? `<div class="etikett gruppe-titel">${titel}</div>${g.map(zeile).join('')}`
      : `<section class="karte"><h2>${titel}</h2><div class="liste">${g.map(zeile).join('')}</div></section>`).join('');
  }
  function ansichtLeistung() {
    const d = Z.form.daten, neu = Z.form.neu, ks = kategorien();
    const opt = (liste, wert) => liste.map(([w, t]) => `<option value="${esc(w)}" ${String(w) === String(wert) ? 'selected' : ''}>${esc(t)}</option>`).join('');
    const brutto = d.preisCent == null ? '' : euro(Math.round(d.preisCent * (1 + (Number(d.steuersatz ?? 19)) / 100)));
    return kopf({ titel: neu ? 'Neue Leistung' : d.bezeichnung || 'Leistung', zurueckKnopf: true }) + `
      <div class="stapel"><section class="karte"><div class="felder">
        <label class="feld ganz"><span>Bezeichnung (so steht es auf der Rechnung)</span><input id="l-bez" data-form="bezeichnung" value="${esc(d.bezeichnung)}" placeholder="z. B. Arbeitszeit Geselle"></label>
        <div class="feld ganz"><span>Kategorie</span><div class="filter wrap">${ks.map(k => `<button type="button" class="chip ${d.kategorieId === k.id ? 'an' : ''}" data-act="leistungKat" data-id="${k.id}">${punkt(k)}${esc(k.name)}</button>`).join('')}
          ${ks.length ? `<button type="button" class="chip ${!ks.some(k => k.id === d.kategorieId) ? 'an' : ''}" data-act="leistungKat" data-id="">Ohne</button>` : ''}
          <button type="button" class="chip dazu" data-act="kategorieNeu" data-ziel="leistung">Neu</button></div></div>
        <label class="feld"><span>Preis netto €</span><input id="l-preis" data-form="preis" inputmode="decimal" value="${esc(centText(d.preisCent))}"><small id="l-brutto">${brutto ? 'Brutto ' + brutto : ''}</small></label>
        <label class="feld"><span>Einheit</span><select id="l-einheit" data-form="einheit">${opt(EINHEITEN.map(e => [e.k, e.k]), d.einheit)}</select></label>
        <label class="feld"><span>Art (für § 35a)</span><select id="l-art" data-form="art">${opt(Object.entries(ARTEN), d.art)}</select></label>
        <label class="feld"><span>Umsatzsteuer</span><select id="l-satz" data-form="steuersatz">${opt(STEUERSAETZE.map(s => [s, s + ' %']), d.steuersatz ?? 19)}</select></label>
        <label class="feld ganz"><span>Beschreibung (optional)</span><textarea id="l-besch" data-form="beschreibung">${esc(d.beschreibung || '')}</textarea></label>
        <label class="feld ganz"><span>Suchwörter für Diktat und Erkennung (optional)</span><input id="l-such" data-form="suchwoerter" value="${esc(d.suchwoerter || '')}" placeholder="z. B. monteur stunde"></label>
        <label class="schalter ganz"><input type="checkbox" id="l-fav" data-form-schalter="favorit" ${d.favorit ? 'checked' : ''}><span>Häufig gebraucht (Schnellauswahl in der Rechnung)</span></label>
      </div></section>
      <div class="leiste-unten"><button class="knopf zweit" data-act="zurueck">Abbrechen</button><button class="knopf" data-act="leistungSpeichern">${ic('haken')} Speichern</button></div>
      ${neu ? '' : `<div><button class="knopf leise" data-act="leistungAusblenden">${ic('muell')} Aus dem Katalog nehmen</button></div>`}</div>`;
  }
  function ansichtKategorien() {
    const ks = kategorien(), alle = leistungen();
    return kopf({ titel: 'Kategorien', zurueckKnopf: Z.verlauf.length > 0, rechts: rundKnopf('kategorieNeu', 'plus', 'Neue Kategorie') }) + `
      <div class="stapel">
        ${ks.length ? `<section class="karte"><div class="liste">${ks.map((k, i) => {
            const n = alle.filter(l => l.kategorieId === k.id).length;
            return `<div class="zeile2"><button data-act="kategorieBearbeiten" data-id="${k.id}"><span class="haupt">${punkt(k)}${esc(k.name)}</span><span class="neben">${mehrzahl(n, 'Leistung', 'Leistungen')}</span></button>
              <span class="knopfreihe eng"><button class="rund klein" data-act="kategorieVerschieben" data-id="${k.id}" data-richtung="-1" ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">${ic('hoch')}</button>
                <button class="rund klein" data-act="kategorieVerschieben" data-id="${k.id}" data-richtung="1" ${i === ks.length - 1 ? 'disabled' : ''} aria-label="Nach unten">${ic('runter')}</button></span></div>`;
          }).join('')}</div></section>`
        : `<div class="box">${ic('kategorie')}<div>Noch keine Kategorien. Vorschlag: ${KATEGORIE_VORSCHLAG.map(([n]) => esc(n)).join(', ')}.
            <div class="knopfreihe"><button class="knopf zweit" data-act="kategorienVorschlag">Vorschlag übernehmen</button></div></div></div>`}
      </div>`;
  }
  function kategorieVerschieben(id, richtung) {
    const l = kategorien(), i = l.findIndex(k => k.id === id), j = i + richtung;
    if (i < 0 || j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    l.forEach((k, idx) => { const pos = (idx + 1) * 10; if (Number(k.position) !== pos) speicher.aendern('kategorien', { ...stripMeta(k), position: pos }); });
    render();
  }

  // ── Mehr (Handy) ──
  function ansichtMehr() {
    const offen = notizen().filter(istOffen).length;
    const z = (ansicht, icon, titel, zahl = 0) => `<button class="zeile mehr-zeile" data-act="gehe" data-ansicht="${ansicht}"><span class="mehr-symbol">${ic(icon)}</span>
      <span class="mehr-text">${titel}</span>${zahl ? `<span class="zahl-badge">${zahl}</span>` : ''}${ic('weiter')}</button>`;
    return kopf({ titel: 'Mehr', rechts: statusOrt() }) + `
      <div class="stapel"><section class="karte"><div class="liste">
        ${z('notizen', 'notiz', 'Notizen', offen)}${z('kunden', 'kunden', 'Kunden')}${z('leistungen', 'leistungen', 'Leistungen')}${z('einstellungen', 'einstellungen', 'Einstellungen')}
      </div></section></div>`;
  }

  // ── Einstellungen ──
  function ansichtEinstellungen() {
    const d = Z.form.daten;
    const inp = (feld, label, extra = '') => `<label class="feld ${extra.includes('ganz') ? 'ganz' : ''}"><span>${label}</span><input id="f-${feld}" data-form="${feld}" value="${esc(d[feld] ?? '')}" ${extra.replace('ganz', '')}></label>`;
    const seg = (feld, werte) => `<div class="segment">${werte.map(([w, t]) => `<button type="button" class="${d[feld] === w ? 'an' : ''}" data-act="formWahl" data-feld="${feld}" data-wert="${w}">${t}</button>`).join('')}</div>`;
    const formatOk = nummernformatGueltig(d.nummernFormat || STANDARD_NUMMERNFORMAT);
    const jahr = new Date().getFullYear();
    const design = document.documentElement.dataset.design === 'hell' ? 'hell' : 'dunkel';
    return kopf({ titel: 'Einstellungen', zurueckKnopf: Z.verlauf.length > 0, rechts: statusOrt() }) + `
      <div class="stapel">
        <section class="karte"><h2>Mein Unternehmen</h2><div class="felder">
          ${inp('name', 'Firmenname', 'ganz')}${inp('zusatz', 'Zusatz unter dem Namen', 'ganz')}
          ${inp('inhaber', 'Inhaber / Geschäftsführer', 'ganz')}${inp('strasse', 'Straße und Hausnummer', 'ganz')}${inp('plz', 'PLZ', 'inputmode="numeric"')}${inp('ort', 'Ort')}
          ${inp('telefon', 'Telefon', 'type="tel"')}${inp('mail', 'E-Mail', 'type="email"')}${inp('web', 'Website', 'ganz')}
          <div class="feld ganz"><span>Logo (PNG oder JPG)</span><div class="knopfreihe">${d.logo ? `<img src="${esc(d.logo)}" alt="Logo" style="max-height:48px;max-width:160px;background:#fff;padding:4px;border-radius:6px">` : ''}
            <label class="knopf zweit foto-knopf">${ic('plus')} ${d.logo ? 'Anderes Logo' : 'Logo wählen'}<input type="file" accept="image/png,image/jpeg" data-act-change="logoGewaehlt"></label>
            ${d.logo ? '<button type="button" class="knopf leise" data-act="logoEntfernen">Entfernen</button>' : ''}</div></div>
        </div></section>
        <section class="karte"><h2>Steuer und Bank</h2><div class="felder">
          ${inp('steuernummer', 'Steuernummer', 'placeholder="z. B. 143/123/45678"')}${inp('ustId', 'USt-IdNr.', 'placeholder="DE123456789"')}
          ${d.ustId && !ustIdGueltig(d.ustId) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die USt-IdNr. hat nicht das Format DE + 9 Ziffern.</span></div>' : ''}
          ${inp('iban', 'IBAN', 'ganz')}${d.iban && !ibanGueltig(d.iban) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die IBAN ist nicht gültig (Prüfziffer).</span></div>' : ''}
          ${inp('bic', 'BIC')}${inp('bank', 'Bank')}
          ${inp('fusszeile', 'Weitere Pflichtangaben (z. B. Registergericht, HRB)', 'ganz')}
          <div class="feld ganz"><span>Versteuerung</span>${seg('versteuerung', [['soll', 'Soll (vereinbart)'], ['ist', 'Ist (vereinnahmt)']])}
            <small>Bei Ist-Versteuerung setzt die App ab 2028 den Pflichthinweis auf jede Rechnung.</small></div>
          <label class="schalter ganz"><input type="checkbox" id="f-800" data-form-schalter="umsatzUeber800k" ${d.umsatzUeber800k ? 'checked' : ''}><span>Vorjahresumsatz über 800.000 € <small class="leise">(E-Rechnung an Firmen dann schon ab 2027)</small></span></label>
        </div></section>
        <section class="karte"><h2>Rechnungen</h2><div class="felder">
          <label class="feld"><span>Nummernformat</span><input id="f-format" data-form="nummernFormat" value="${esc(d.nummernFormat || STANDARD_NUMMERNFORMAT)}" class="${formatOk ? '' : 'fehlt'}"><small>${formatOk ? 'z. B. ' + esc(rechnungsnummer(d.nummernFormat, jahr, 42)) : 'Format braucht {NNNN}'}</small></label>
          <label class="feld"><span>Zahlungsziel (Tage)</span><input id="f-ziel" data-form="zahlungszielTage" inputmode="numeric" value="${esc(d.zahlungszielTage ?? 14)}"></label>
          <label class="feld ganz"><span>Einleitung</span><textarea id="f-einl" data-form="einleitung">${esc(d.einleitung || '')}</textarea></label>
          <label class="feld ganz"><span>Schluss</span><textarea id="f-schluss" data-form="schluss" style="min-height:48px">${esc(d.schluss || '')}</textarea></label>
        </div></section>
        <div class="leiste-unten"><button class="knopf" data-act="firmaSpeichern">${ic('haken')} Speichern</button></div>
        <section class="karte" id="diktat-einstellung">${diktatEinstellungHtml()}</section>
        <section class="karte"><h2>Abgleich</h2>${abgleichInfoHtml()}</section>
        <section class="karte" id="serverstatus">${serverStatusHtml()}</section>
        <section class="karte"><h2>Darstellung</h2><div class="segment"><button class="${design === 'dunkel' ? 'an' : ''}" data-act="design" data-wert="dunkel">Nacht & Gold</button><button class="${design === 'hell' ? 'an' : ''}" data-act="design" data-wert="hell">Hell</button></div></section>
        ${modus === 'vorschau' ? `<section class="karte"><h2>Vorschau</h2><button class="knopf gefahr" data-act="vorschauZuruecksetzen">Beispieldaten zurücksetzen</button></section>` : ''}
      </div>`;
  }
  function diktatEinstellungHtml() {
    const wahl = speicher.meta('diktatModus') || 'live';
    const live = liveHier(), s = Z.serverStatus?.diktat;
    return `<h2>Diktat</h2>
      <div class="segment voll"><button class="${wahl !== 'aufnahme' ? 'an' : ''}" data-act="diktatModus" data-wert="live">Live mitschreiben</button><button class="${wahl === 'aufnahme' ? 'an' : ''}" data-act="diktatModus" data-wert="aufnahme">Aufnahme → Laptop</button></div>
      <p class="leise klein" style="margin:10px 0 0">${wahl === 'aufnahme' ? 'Die Aufnahme geht nur an deinen Laptop und wird dort offline abgetippt – auch ohne Netz.'
        : `Der Text erscheint beim Sprechen; die Erkennung macht der Browser-Anbieter (Apple bzw. Google).${live ? '' : ' Auf diesem Gerät nicht möglich – hier wird aufgenommen.'}`}
        ${modus === 'vorschau' ? ' In der Vorschau wird das Diktat ohne Mikrofon vorgeführt.'
          : s ? (s.verfuegbar ? ` Abtippen am Laptop: bereit (${esc(s.modell || '')}).` : ' Abtippen am Laptop: noch nicht eingerichtet (README → Diktat).') : ''}</p>`;
  }
  function abgleichInfoHtml() {
    const a = Z.abgleich;
    return `<div class="summen klein">
      <div><span>Dieses Gerät</span><span>${esc(speicher.geraet.name)}</span></div>
      <div><span>Status</span><span>${a.laeuft ? 'gleicht gerade ab' : a.verbunden ? 'verbunden' : a.verbunden === false ? 'Laptop nicht erreichbar' : '…'}</span></div>
      <div><span>Letzter Abgleich</span><span>${a.zuletzt ? new Date(a.zuletzt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '–'}</span></div>
      <div><span>Warten auf Übertragung</span><span>${a.wartend || 0}</span></div>
    </div>
    <div class="felder" style="margin-top:12px"><label class="feld"><span>Name dieses Geräts</span><input id="g-name" data-geraetname value="${esc(speicher.geraet.name)}"></label></div>
    <div class="knopfreihe" style="margin-top:12px"><button class="knopf zweit" data-act="abgleichJetzt">${ic('abgleich')} Jetzt abgleichen</button>
      ${modus === 'vorschau' ? `<button class="knopf zweit" data-act="vorschauVerbindung">${ic('laptop')} Laptop ${vorschau?.verbunden ? 'trennen' : 'verbinden'} (Test)</button>` : ''}</div>`;
  }
  function serverStatusHtml() {
    if (modus === 'vorschau') return `<h2>Ablage</h2><p class="leise klein" style="margin:0">In der echten App liegt alles in einem Ordner auf dem Laptop: Datenbank, Rechnungs-PDFs, Fotos, Sprachaufnahmen und tägliche Sicherungen.</p>`;
    const s = Z.serverStatus;
    if (!s) return `<h2>Ablage auf dem Laptop</h2><p class="leise klein" style="margin:0">Laptop nicht erreichbar.</p>`;
    return `<h2>Ablage auf dem Laptop</h2><div class="summen klein">
      <div><span>Ordner</span><span style="overflow-wrap:anywhere;text-align:right">${esc(s.ordner)}</span></div>
      <div><span>Rechnungen · Kunden · Baustellen · Notizen</span><span>${s.anzahl.rechnungen || 0} · ${s.anzahl.kunden || 0} · ${s.anzahl.baustellen || 0} · ${s.anzahl.notizen || 0}</span></div>
      <div><span>Abtippen von Sprachaufnahmen</span><span>${s.diktat?.verfuegbar ? 'bereit' : 'nicht eingerichtet'}</span></div>
      <div><span>Änderungsprotokoll</span><span>${s.protokoll.ok ? 'intakt (' + s.protokoll.eintraege + ')' : 'BESCHÄDIGT ab Eintrag ' + s.protokoll.nr}</span></div>
      <div><span>Letzte Sicherung</span><span>${esc((s.sicherungen || []).slice(-1)[0] || '–')}</span></div>
      <div><span>Version</span><span>${esc(s.version)}</span></div></div>`;
  }

  // ── Dialoge ──
  function dialogHtml() { return Z.dialog ? `<div class="blende" data-blende><div class="dialog ${Z.dialog.art === 'neu' ? 'dialog-menue' : ''}" role="dialog" aria-modal="true">${dialogInhalt()}</div></div>` : ''; }
  function dialogInhalt() {
    const d = Z.dialog;
    const zu = `<button class="knopf zweit" data-act="dialogZu">Abbrechen</button>`;
    switch (d.art) {
      case 'neu': return `<div class="neu-menue">
          <button data-act="neueNotiz"><span class="neu-symbol">${ic('mikro')}</span>Notiz</button>
          <button data-act="neueRechnung"><span class="neu-symbol">${ic('rechnung')}</span>Rechnung</button></div>`;
      case 'kundeWaehlen': return `<h2>Kunde wählen</h2>
        <label class="suche">${ic('suche')}<input id="d-suche" type="search" data-dsuche value="${esc(d.suche || '')}" placeholder="Suchen"></label>
        <div class="waehlliste liste" id="d-liste">${kundenWahlHtml()}</div>
        <div class="knopfreihe"><button class="knopf leise" data-act="neuerKundeAusEditor">${ic('plus')} Neuer Kunde</button>${zu}</div>`;
      case 'katalog': {
        const ks = kategorien();
        return `<h2>Aus dem Katalog</h2>
          ${ks.length ? `<div class="filter">${[['alle', 'Alle', null], ...ks.map(k => [k.id, k.name, k])].map(([w, t, k]) => `<button class="chip ${(d.kat || 'alle') === w ? 'an' : ''}" data-act="katalogKat" data-wert="${w}">${k ? punkt(k) : ''}${esc(t)}</button>`).join('')}</div>` : ''}
          <label class="suche">${ic('suche')}<input id="d-suche" type="search" data-dsuche value="${esc(d.suche || '')}" placeholder="Suchen"></label>
          <div class="waehlliste" id="d-liste">${leistungenListeHtml(true)}</div><div class="knopfreihe">${zu}</div>`;
      }
      case 'notizenWahl': {
        const l = passendeOffeneNotizen(Z.entwurf);
        return `<h2>Offene Notizen</h2>
          <div class="waehlliste liste">${l.length ? l.map(n => notizZeile(n, 'wahl')).join('') : '<div class="leer">Keine offenen Notizen.</div>'}</div>
          <div class="knopfreihe">${zu}${l.length > 1 ? `<button class="knopf" data-act="alleNotizenInEntwurf">Alle übernehmen</button>` : ''}</div>`;
      }
      case 'festschreiben': {
        const r = Z.entwurf, k = kunde(r.kundeId), s = entwurfSummen(r);
        return `<h2>Rechnung festschreiben?</h2>
          <div class="summen"><div><span>Kunde</span><span>${esc(k?.name || '')}</span></div><div class="gesamt"><span>Rechnungsbetrag</span><span>${euro(s.bruttoCent)}</span></div></div>
          <p class="leise" style="margin:0">Der Laptop vergibt die Nummer und legt das PDF unveränderbar ab. Danach sind nur noch Zahlungen und ein Storno möglich.</p>
          <div class="knopfreihe">${zu}<button class="knopf" data-act="festschreiben">${ic('schloss')} Festschreiben</button></div>`;
      }
      case 'storno': return `<h2>Rechnung stornieren?</h2>
        <p class="leise" style="margin:0">Es entsteht eine Stornorechnung mit eigener Nummer, die diese Rechnung vollständig aufhebt. Das Original bleibt unverändert im Archiv.</p>
        <div class="knopfreihe">${zu}<button class="knopf gefahr" data-act="stornieren">${ic('storno')} Stornieren</button></div>`;
      case 'zahlung': {
        const r = speicher.holen('rechnungen', Z.id);
        return `<h2>Zahlung erfassen</h2><div class="felder">
          <label class="feld"><span>Eingegangen am</span><input type="date" id="z-datum" value="${heute()}"></label>
          <label class="feld"><span>Betrag €</span><input id="z-betrag" inputmode="decimal" value="${esc(centText(offenerBetrag(r)))}"></label>
          <label class="feld ganz"><span>Notiz (optional)</span><input id="z-notiz" placeholder="z. B. Überweisung, bar, Skonto"></label></div>
          <div class="knopfreihe">${zu}<button class="knopf" data-act="zahlungSpeichern">${ic('haken')} Speichern</button></div>`;
      }
      case 'loeschen': return `<h2>${esc(d.titel)}</h2><p class="leise" style="margin:0">${esc(d.text)}</p><div class="knopfreihe">${zu}<button class="knopf gefahr" data-act="${d.aktion}">${ic('muell')} Löschen</button></div>`;
      case 'abgleich': return `<h2>Abgleich mit dem Laptop</h2>${abgleichInfoHtml()}<div class="knopfreihe"><button class="knopf zweit" data-act="dialogZu">Schließen</button></div>`;
      case 'info': return `<h2>${esc(d.titel)}</h2><p style="margin:0">${d.html}</p><div class="knopfreihe"><button class="knopf" data-act="dialogZu">Verstanden</button></div>`;
      case 'anmelden': return `<h2>Anmelden</h2><p class="leise" style="margin:0">Der Laptop ist mit einer PIN geschützt.</p>
        <label class="feld"><span>PIN</span><input id="pin" type="password" inputmode="numeric" autocomplete="current-password"></label>
        <div class="knopfreihe"><button class="knopf" data-act="anmelden">Anmelden</button></div>`;
      case 'baustelleNeu': return `<h2>Neue Baustelle</h2><div class="felder">
          <label class="feld ganz"><span>Name</span><input id="d-b-name" data-dfeld="name" value="${esc(d.name || '')}" placeholder="z. B. Bad OG Schneider"></label>
          <label class="feld ganz"><span>Kunde</span><select id="d-b-kunde" data-dfeld="kundeId"><option value="">– noch offen –</option>${kunden().map(k => `<option value="${k.id}" ${d.kundeId === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
          <label class="feld ganz"><span>Straße (leer = Anschrift des Kunden)</span><input id="d-b-str" data-dfeld="strasse" value="${esc(d.strasse || '')}"></label>
          <label class="feld"><span>PLZ</span><input id="d-b-plz" data-dfeld="plz" inputmode="numeric" value="${esc(d.plz || '')}"></label>
          <label class="feld"><span>Ort</span><input id="d-b-ort" data-dfeld="ort" value="${esc(d.ort || '')}"></label></div>
        <div class="knopfreihe">${zu}<button class="knopf" data-act="baustelleSchnellSpeichern">${ic('haken')} Anlegen</button></div>`;
      case 'kategorie': {
        const n = d.id ? leistungen().filter(l => l.kategorieId === d.id).length : 0;
        return `<h2>${d.id ? 'Kategorie' : 'Neue Kategorie'}</h2>
          <label class="feld"><span>Name</span><input id="d-kat-name" data-dfeld="name" value="${esc(d.name || '')}" placeholder="z. B. Heizung, Sanitär, Material"></label>
          <div class="feld"><span>Farbe</span><div class="farbwahl">${Object.entries(FARBEN).map(([f, hex]) => `<button type="button" class="${d.farbe === f ? 'an' : ''}" style="--k:${hex}" data-act="kategorieFarbe" data-wert="${f}" aria-label="${FARBNAMEN[f]}" title="${FARBNAMEN[f]}"></button>`).join('')}</div></div>
          ${d.bestaetigen ? `<div class="box rot">${ic('warn')}<span>${mehrzahl(n, 'Leistung steht', 'Leistungen stehen')} danach unter „Ohne Kategorie".</span></div>` : ''}
          <div class="knopfreihe">${d.id ? `<button class="knopf ${d.bestaetigen ? 'gefahr' : 'leise'}" data-act="kategorieLoeschen" style="margin-right:auto">${ic('muell')} ${d.bestaetigen ? 'Trotzdem löschen' : 'Löschen'}</button>` : ''}${zu}<button class="knopf" data-act="kategorieSpeichern">${ic('haken')} Speichern</button></div>`;
      }
      case 'foto': return `<div class="foto-gross"><img src="${esc(dateiUrl(d.id))}" alt="Foto"></div><div class="knopfreihe"><button class="knopf" data-act="dialogZu">Schließen</button></div>`;
      default: return '';
    }
  }
  function kundenWahlHtml() {
    const q = (Z.dialog?.suche || '').trim().toLowerCase();
    const l = kunden().filter(k => !q || [k.name, k.ort, k.nummer].join(' ').toLowerCase().includes(q));
    return l.length ? l.map(k => `<button class="zeile" data-act="kundeGewaehlt" data-id="${k.id}"><span class="haupt">${esc(k.name)}</span><span class="rechts"><span class="pille typ">${KUNDENTYPEN[k.typ]}</span></span><span class="neben">${esc([k.strasse, k.ort].filter(Boolean).join(', '))}</span><span></span></button>`).join('')
      : '<div class="leer">Kein Kunde gefunden.</div>';
  }
  function toastHtml() { return Z.toast ? `<div class="toast" role="status">${esc(Z.toast)}</div>` : ''; }
  let toastTimer = null;
  function zeigeToast(text) {
    Z.toast = text;
    wurzel.querySelector('.toast')?.remove();
    wurzel.insertAdjacentHTML('beforeend', toastHtml());
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { Z.toast = null; wurzel.querySelector('.toast')?.remove(); }, 3800);
  }

  // ── Hilfen für Aktionen ──
  function baustelleVomEntwurf(r) {
    const b = baustelle(r.baustelleId);
    if (b && String(r.betreff || '').trim() === bauvorhabenText(b)) r.betreff = '';
    r.baustelleId = null;
  }
  const freieFarbe = () => { const belegt = new Set(kategorien().map(k => k.farbe)); return Object.keys(FARBEN).find(f => !belegt.has(f)) || 'grau'; };
  const naechstePosition = () => Math.max(0, ...kategorien().map(k => Number(k.position) || 0)) + 10;

  // ── Aktionen ──
  const H = {
    tab: el => tab(el.dataset.ansicht),
    gehe: el => gehe(el.dataset.ansicht),
    zurueck: () => zurueck(),
    neuMenue: () => { Z.dialog = { art: 'neu' }; render(); },
    neueNotiz: () => {
      const bid = Z.ansicht === 'baustelle' ? Z.id : null;   // aus einer Baustelle heraus: gleich ihr zuordnen
      Z.dialog = null;
      gehe('notiz');
      if (bid && Z.notiz.neu && notizLeer(Z.notiz)) { Z.notiz.baustelleId = bid; Z.notiz.baustelleAuto = false; render(); }
    },
    neueRechnung: () => {
      Z.dialog = null;
      if (Z.ansicht === 'baustelle' && baustelle(Z.id)) return rechnungFuerBaustelle(baustelle(Z.id));
      if (Z.ansicht === 'kunde' && Z.form && !Z.form.neu) return neueRechnung(Z.form.daten.id);
      neueRechnung();
    },
    rechnungenFilter: el => { Z.filterR = el.dataset.wert; if (Z.ansicht !== 'rechnungen') tab('rechnungen'); else render(); },
    kundenFilter: el => { Z.filterK = el.dataset.wert; render(); },
    baustellenFilter: el => { Z.filterB = el.dataset.wert; render(); },
    notizenFilter: el => { Z.filterN = el.dataset.wert; render(); },
    notizenOhneBaustelle: () => { Z.filterN = 'ohne'; gehe('notizen'); },
    leistungenFilter: el => { Z.filterL = el.dataset.wert; render(); },
    oeffneRechnung: el => gehe('rechnung', el.dataset.id),
    neueRechnungFuer: el => neueRechnung(el.dataset.id),
    neuerKunde: () => gehe('kunde', null),
    kundeOeffnen: el => gehe('kunde', el.dataset.id),
    kundeBearbeiten: el => gehe('kunde', el.dataset.id),
    neueLeistung: () => gehe('leistung', null),
    leistungOeffnen: el => gehe('leistung', el.dataset.id),
    kategorienOeffnen: () => gehe('kategorien'),
    editorTab: el => { Z.editorTab = el.dataset.tab; render(); window.scrollTo(0, 0); },
    dialogZu: () => { Z.dialog = null; render(); },
    abgleichDialog: () => { Z.dialog = { art: 'abgleich' }; render(); abgleich.abgleichen(); },
    abgleichJetzt: async () => { await abgleich.abgleichen(); render(); },
    vorschauVerbindung: () => { vorschau.verbunden = !vorschau.verbunden; zeigeToast(vorschau.verbunden ? 'Laptop verbunden – gleiche ab' : 'Laptop getrennt – Änderungen warten auf dem Gerät'); abgleich.abgleichen().then(render); render(); },
    vorschauZuruecksetzen: async () => { await vorschau.zuruecksetzen(); await speicher.leeren(); location.reload(); },
    design: el => { const hell = el.dataset.wert === 'hell'; if (hell) document.documentElement.dataset.design = 'hell'; else delete document.documentElement.dataset.design; try { localStorage.setItem('ra-design', hell ? 'hell' : 'dunkel'); } catch {} render(); },
    anmelden: async () => { const ok = await transport.anmelden(wurzel.querySelector('#pin').value); if (ok) { Z.dialog = null; render(); abgleich.abgleichen(); } else zeigeToast('PIN falsch'); },

    // Rechnungseditor
    kundeWaehlen: () => { Z.dialog = { art: 'kundeWaehlen', suche: '' }; render(); },
    kundeGewaehlt: el => {
      const r = Z.entwurf, k = kunde(el.dataset.id);
      const leer = !r.positionen.length;
      r.kundeId = k.id;
      if (k.typ !== 'privat') r.amGrundstueck = false; else if (r.amGrundstueck === false && leer) r.amGrundstueck = true;
      const b = baustelle(r.baustelleId);
      if (b?.kundeId && b.kundeId !== k.id) baustelleVomEntwurf(r);
      if (leer) standardDazu(r, k);
      Z.dialog = null; entwurfSofortSpeichern(); render();
    },
    entwurfBaustelle: el => {
      const r = Z.entwurf, b = baustelle(el.dataset.id);
      r.baustelleId = b.id;
      if (!String(r.betreff || '').trim()) r.betreff = bauvorhabenText(b);
      entwurfSofortSpeichern(); render();
    },
    entwurfBaustelleLoesen: () => { baustelleVomEntwurf(Z.entwurf); entwurfSofortSpeichern(); render(); },
    neuerKundeAusEditor: () => { Z.dialog = null; Z.entwurfNeu = false; gehe('kunde', null); Z.form.zurueckZuEntwurf = Z.verlauf[Z.verlauf.length - 1]?.[1]; },
    standardUebernehmen: () => { standardDazu(Z.entwurf, kunde(Z.entwurf.kundeId)); entwurfSofortSpeichern(); render(); },
    leistungDazu: el => { Z.entwurf.positionen.push(posAusLeistung(leistung(el.dataset.id))); entwurfSofortSpeichern(); render(); },
    katalogOeffnen: el => { Z.dialog = { art: 'katalog', suche: '', kat: 'alle', ziel: el.dataset.ziel || 'entwurf' }; render(); },
    katalogKat: el => { Z.dialog.kat = el.dataset.wert; teilErsetzen('.dialog', dialogInhalt()); },
    katalogWahl: el => {
      const l = leistung(el.dataset.id);
      if (Z.dialog.ziel === 'standard') { Z.form.daten.standard = [...(Z.form.daten.standard || []), { leistungId: l.id, menge: 1 }]; }
      else { Z.entwurf.positionen.push(posAusLeistung(l)); entwurfSofortSpeichern(); }
      Z.dialog = null; render(); zeigeToast(`„${l.bezeichnung}" hinzugefügt`);
    },
    freiePosition: () => {
      const p = { id: neueId('p'), leistungId: null, bezeichnung: '', beschreibung: '', menge: 1, einheit: 'Std.', preisCent: null, steuersatz: 19, art: 'arbeit', aktiv: true };
      Z.entwurf.positionen.push(p); render(); document.getElementById(`p-${p.id}-bez`)?.focus();
    },
    posLoeschen: el => { Z.entwurf.positionen = Z.entwurf.positionen.filter(p => p.id !== el.dataset.id); entwurfSofortSpeichern(); render(); },
    beschreibungZeigen: el => { Z.beschreibungOffen.add(el.dataset.id); render(); document.getElementById(`p-${el.dataset.id}-besch`)?.focus(); },
    posInKatalog: el => {
      const p = Z.entwurf.positionen.find(x => x.id === el.dataset.id);
      const l = { id: neueId('l'), bezeichnung: p.bezeichnung.trim(), beschreibung: p.beschreibung || '', einheit: p.einheit, preisCent: p.preisCent, steuersatz: p.steuersatz ?? 19, art: p.art || 'sonstiges',
        kategorieId: null, favorit: false, suchwoerter: '', aktiv: true };
      speicher.aendern('leistungen', l); p.leistungId = l.id; entwurfSofortSpeichern(); render(); zeigeToast('In den Leistungskatalog übernommen');
    },
    notizenWahl: () => { Z.dialog = { art: 'notizenWahl' }; render(); },
    notizInEntwurf: el => {
      notizenInEntwurf([speicher.holen('notizen', el.dataset.id)], Z.entwurf);
      if (!passendeOffeneNotizen(Z.entwurf).length) Z.dialog = null;
      entwurfSofortSpeichern(); render();
    },
    alleNotizenInEntwurf: () => { notizenInEntwurf(passendeOffeneNotizen(Z.entwurf), Z.entwurf); Z.dialog = null; entwurfSofortSpeichern(); render(); },
    notizAusEntwurf: el => {
      const r = Z.entwurf, n = speicher.holen('notizen', el.dataset.id);
      r.notizen = (r.notizen || []).filter(id => id !== el.dataset.id);
      if (n && n.status === 'zugeordnet') speicher.aendern('notizen', { ...stripMeta(n), status: 'offen', rechnungId: null });
      entwurfSofortSpeichern(); render(); zeigeToast('Notiz ist wieder offen – Positionen bei Bedarf anpassen');
    },
    notizAlsPosition: el => {
      const n = speicher.holen('notizen', el.dataset.id);
      if (!n) return;
      const text = notizText(n).replace(/\s+/g, ' ').trim();
      const kurz = text.length > 60 ? text.slice(0, 60).replace(/\s+\S*$/, '') : text;
      const p = { id: neueId('p'), leistungId: null, bezeichnung: kurz, beschreibung: text.length > kurz.length ? text : '', menge: 1, einheit: 'pauschal', preisCent: null,
        steuersatz: 19, art: 'arbeit', aktiv: true, ausNotiz: true };
      Z.entwurf.positionen.push(p); entwurfSofortSpeichern(); render(); document.getElementById(`p-${p.id}-preis`)?.focus();
      zeigeToast('Als Position übernommen – Bezeichnung und Preis bitte prüfen');
    },
    festschreibenFragen: () => { entwurfSofortSpeichern(); Z.dialog = { art: 'festschreiben' }; render(); },
    festschreiben: async () => {
      const r = Z.entwurf;
      r.freigabe = { angefordert: new Date().toISOString(), geraet: speicher.geraet.name };
      r.freigabeFehler = null;
      Z.entwurfNeu = false;
      entwurfSofortSpeichern();
      Z.dialog = null; render();
      await abgleich.abgleichen();
      const nach = speicher.holen('rechnungen', r.id);
      if (nach && nach.status !== 'entwurf') { zeigeToast(`Rechnung ${nach.nummer} festgeschrieben`); Z.entwurf = null; render(); }
      else if (nach?.freigabeFehler?.length) { Z.entwurf = kopie(nach); render(); }
      else zeigeToast('Freigabe vorgemerkt – die Nummer vergibt der Laptop beim nächsten Abgleich.');
    },
    freigabeZuruecknehmen: () => { Z.entwurf.freigabe = null; speicher.aendern('rechnungen', stripMeta(Z.entwurf)); render(); },
    entwurfLoeschenFragen: () => { Z.dialog = { art: 'loeschen', titel: 'Entwurf löschen?', text: 'Zugeordnete Notizen werden wieder offen.', aktion: 'entwurfLoeschen' }; render(); },
    entwurfLoeschen: () => {
      const r = Z.entwurf;
      for (const id of r.notizen || []) { const n = speicher.holen('notizen', id); if (n && n.status === 'zugeordnet' && n.rechnungId === r.id) speicher.aendern('notizen', { ...stripMeta(n), status: 'offen', rechnungId: null }); }
      if (speicher.holen('rechnungen', r.id)) speicher.loeschen('rechnungen', r.id);
      Z.entwurf = null; Z.dialog = null; zurueck(); zeigeToast('Entwurf gelöscht');
    },

    // Festgeschriebene Rechnung
    pdfOeffnen: () => {
      const r = speicher.holen('rechnungen', Z.id);
      if (modus === 'vorschau' || !transport.pdfUrl) { Z.dialog = { art: 'info', titel: 'PDF in der echten App', html: 'Das PDF erzeugt der Laptop beim Festschreiben und legt es schreibgeschützt im Archiv-Ordner ab. In dieser Vorschau gibt es keinen echten Laptop – deshalb siehst du die Rechnung hier als Seitenansicht.' }; render(); return; }
      window.open(transport.pdfUrl(r.id), '_blank', 'noopener');
    },
    mailHinweis: () => { Z.dialog = { art: 'info', titel: 'Versand per E-Mail', html: 'Der Versand direkt aus der App kommt in einem der nächsten Schritte. Bis dahin: PDF öffnen und über das Teilen-Menü oder dein Mailprogramm verschicken.' }; render(); },
    zahlungDialog: () => { Z.dialog = { art: 'zahlung' }; render(); },
    zahlungSpeichern: () => {
      const r = kopie(speicher.holen('rechnungen', Z.id));
      const betrag = centAus(wurzel.querySelector('#z-betrag').value), datum = wurzel.querySelector('#z-datum').value;
      if (!betrag || betrag <= 0 || !istIso(datum)) { zeigeToast('Bitte Datum und Betrag angeben'); return; }
      r.zahlungen = [...(r.zahlungen || []), { datum, betragCent: betrag, notiz: wurzel.querySelector('#z-notiz').value.trim() }];
      const gezahlt = r.zahlungen.reduce((s, z) => s + z.betragCent, 0);
      if (gezahlt >= r.fest.summen.bruttoCent) { r.status = 'bezahlt'; r.bezahltAm = datum; }
      speicher.aendern('rechnungen', stripMeta(r)); Z.dialog = null; render(); zeigeToast(r.status === 'bezahlt' ? 'Als bezahlt markiert' : 'Teilzahlung erfasst');
    },
    zahlungEntfernen: el => {
      const r = kopie(speicher.holen('rechnungen', Z.id));
      r.zahlungen.splice(Number(el.dataset.i), 1);
      const gezahlt = r.zahlungen.reduce((s, z) => s + z.betragCent, 0);
      if (r.status === 'bezahlt' && gezahlt < r.fest.summen.bruttoCent) { r.status = 'offen'; r.bezahltAm = null; }
      speicher.aendern('rechnungen', stripMeta(r)); render();
    },
    wieDiese: () => {
      const r = speicher.holen('rechnungen', Z.id);
      neueRechnung(r.kundeId, { positionen: (r.positionen || []).filter(p => p.aktiv !== false).map(p => ({ ...p, id: neueId('p'), ausNotiz: false })), betreff: r.betreff || '',
        amGrundstueck: r.amGrundstueck, baustelleId: r.baustelleId || null });
    },
    stornoFragen: () => { Z.dialog = { art: 'storno' }; render(); },
    stornieren: async () => {
      const r = speicher.holen('rechnungen', Z.id);
      const s = { id: neueId('r'), typ: 'storno', status: 'entwurf', stornoVon: r.id, kundeId: r.kundeId, baustelleId: r.baustelleId || null, leistungVon: r.fest.leistungVon, leistungBis: r.fest.leistungBis,
        amGrundstueck: r.amGrundstueck, betreff: `Storno zu Rechnung ${r.nummer}`, einleitung: 'hiermit stornieren wir die oben genannte Rechnung vollständig.', schluss: r.fest.schluss,
        positionen: (r.positionen || []).filter(p => p.aktiv !== false).map(p => ({ ...p, id: neueId('p'), menge: -Number(p.menge) })),
        freigabe: { angefordert: new Date().toISOString(), geraet: speicher.geraet.name }, angelegt: new Date().toISOString() };
      speicher.aendern('rechnungen', s);
      Z.dialog = null; render();
      await abgleich.abgleichen();
      const nach = speicher.holen('rechnungen', s.id);
      if (nach && nach.status !== 'entwurf') { zeigeToast(`Stornorechnung ${nach.nummer} erstellt`); gehe('rechnung', s.id); }
      else zeigeToast('Storno vorgemerkt – wird beim nächsten Abgleich festgeschrieben.');
    },

    // Kunden
    formWahl: el => { Z.form.daten[el.dataset.feld] = el.dataset.wert; render(); },
    standardEntfernen: el => { Z.form.daten.standard.splice(Number(el.dataset.i), 1); render(); },
    kundeSpeichern: () => {
      const d = Z.form.daten;
      if (!String(d.name || '').trim()) { zeigeToast('Bitte einen Namen eintragen'); document.getElementById('k-name')?.focus(); return; }
      if (d.typ !== 'privat') d.anrede = '';
      const gespeichert = speicher.aendern('kunden', stripMeta(d));
      const ziel = Z.form.zurueckZuEntwurf;
      Z.form = null;
      zurueck();
      if (ziel && Z.entwurf && Z.entwurf.id === ziel) { Z.entwurf.kundeId = gespeichert.id; if (!Z.entwurf.positionen.length) standardDazu(Z.entwurf, gespeichert); entwurfSofortSpeichern(); render(); }
      zeigeToast('Kunde gespeichert');
    },
    kundeLoeschenFragen: () => { Z.dialog = { art: 'loeschen', titel: 'Kunde löschen?', text: 'Der Kunde hat keine Rechnungen und keine Baustellen.', aktion: 'kundeLoeschen' }; render(); },
    kundeLoeschen: () => { speicher.loeschen('kunden', Z.form.daten.id); Z.dialog = null; Z.form = null; zurueck(); zeigeToast('Kunde gelöscht'); },

    // Leistungen und Kategorien
    leistungSpeichern: () => {
      const d = Z.form.daten;
      if (!String(d.bezeichnung || '').trim()) { zeigeToast('Bitte eine Bezeichnung eintragen'); return; }
      if (d.preisCent == null) { zeigeToast('Bitte einen Preis eintragen'); return; }
      speicher.aendern('leistungen', stripMeta(d)); Z.form = null; zurueck(); zeigeToast('Leistung gespeichert');
    },
    leistungAusblenden: () => { speicher.aendern('leistungen', { ...stripMeta(Z.form.daten), aktiv: false }); Z.form = null; zurueck(); zeigeToast('Aus dem Katalog genommen'); },
    leistungKat: el => { Z.form.daten.kategorieId = el.dataset.id || null; render(); },
    kategorienVorschlag: () => {
      KATEGORIE_VORSCHLAG.forEach(([name, farbe], i) => speicher.aendern('kategorien', { id: neueId('kat'), name, farbe, position: (i + 1) * 10 }));
      render(); zeigeToast('Kategorien angelegt – Leistung antippen, um sie zuzuordnen');
    },
    kategorieNeu: el => { Z.dialog = { art: 'kategorie', id: null, name: '', farbe: freieFarbe(), ziel: el.dataset.ziel || '' }; render(); wurzel.querySelector('#d-kat-name')?.focus(); },
    kategorieBearbeiten: el => { const k = kategorie(el.dataset.id); Z.dialog = { art: 'kategorie', id: k.id, name: k.name, farbe: k.farbe || 'grau' }; render(); },
    kategorieFarbe: el => { Z.dialog.farbe = el.dataset.wert; teilErsetzen('.dialog', dialogInhalt()); },
    kategorieSpeichern: () => {
      const d = Z.dialog, name = String(d.name || '').trim();
      if (!name) { zeigeToast('Bitte einen Namen eintragen'); return; }
      if (kategorien().some(k => k.id !== d.id && k.name.toLowerCase() === name.toLowerCase())) { zeigeToast('Diese Kategorie gibt es schon'); return; }
      const alt = kategorie(d.id);
      const k = speicher.aendern('kategorien', { ...(alt ? stripMeta(alt) : { id: neueId('kat'), position: naechstePosition() }), name, farbe: d.farbe });
      if (d.ziel === 'leistung' && Z.form?.typ === 'leistungen') Z.form.daten.kategorieId = k.id;
      Z.dialog = null; render();
    },
    kategorieLoeschen: () => {
      const d = Z.dialog;
      const betroffen = speicher.alle('leistungen').filter(l => l.kategorieId === d.id);
      if (betroffen.some(l => l.aktiv !== false) && !d.bestaetigen) { d.bestaetigen = true; teilErsetzen('.dialog', dialogInhalt()); return; }
      for (const l of betroffen) speicher.aendern('leistungen', { ...stripMeta(l), kategorieId: null });
      speicher.loeschen('kategorien', d.id);
      if (Z.filterL === d.id) Z.filterL = 'alle';
      Z.dialog = null; render(); zeigeToast('Kategorie gelöscht');
    },
    kategorieVerschieben: el => kategorieVerschieben(el.dataset.id, Number(el.dataset.richtung)),

    // Baustellen
    baustelleOeffnen: el => gehe('baustelle', el.dataset.id),
    neueBaustelle: () => gehe('baustelleForm', null),
    baustelleBearbeiten: el => gehe('baustelleForm', el.dataset.id),
    baustelleFuerKunde: el => {
      const k = kunde(el.dataset.id);
      gehe('baustelleForm', null);
      Object.assign(Z.form.daten, { kundeId: k.id, strasse: k.strasse || '', plz: k.plz || '', ort: k.ort || '' });
      render();
    },
    baustelleAdresseVomKunden: () => { const d = Z.form.daten, k = kunde(d.kundeId); if (k) { Object.assign(d, { strasse: k.strasse || '', plz: k.plz || '', ort: k.ort || '' }); render(); } },
    baustelleSpeichern: () => {
      const d = Z.form.daten;
      if (!String(d.name || '').trim()) { zeigeToast('Bitte einen Namen eintragen'); document.getElementById('b-name')?.focus(); return; }
      const neu = Z.form.neu;
      const ende = d.status === 'abgeschlossen' ? (istIso(d.ende) ? d.ende : heute()) : '';
      const b = speicher.aendern('baustellen', { ...stripMeta(d), name: d.name.trim(), kundeId: d.kundeId || null, ende });
      Z.form = null;
      if (neu) { Object.assign(Z, { ansicht: 'baustelle', id: b.id }); vorbereiten(); render(); window.scrollTo(0, 0); }
      else zurueck();
      zeigeToast(neu ? 'Baustelle angelegt' : 'Gespeichert');
    },
    baustelleStatus: el => {
      const b = baustelle(el.dataset.id), fertig = b.status !== 'abgeschlossen';
      speicher.aendern('baustellen', { ...stripMeta(b), status: fertig ? 'abgeschlossen' : 'aktiv', ende: fertig ? heute() : '' });
      render(); zeigeToast(fertig ? 'Baustelle abgeschlossen' : 'Baustelle wieder geöffnet');
    },
    baustelleLoeschenFragen: el => { Z.dialog = { art: 'loeschen', titel: 'Baustelle löschen?', text: 'Sie hat keine Notizen und keine Rechnungen.', aktion: 'baustelleLoeschen', id: el.dataset.id }; render(); },
    baustelleLoeschen: () => {
      const id = Z.dialog.id;
      speicher.loeschen('baustellen', id); Z.dialog = null; Z.form = null;
      zurueck(); if (Z.ansicht === 'baustelle' && Z.id === id) zurueck();
      zeigeToast('Baustelle gelöscht');
    },
    baustelleNotiz: el => {
      const id = el.dataset.id;
      gehe('notiz');
      if (Z.notiz.neu) { Z.notiz.baustelleId = id; Z.notiz.baustelleAuto = false; notizMerken(); render(); }
    },
    rechnungAusBaustelle: el => { const b = baustelle(el.dataset.id); if (b) rechnungAusNotizen(notizenVon(b.id).filter(istOffen), { baustelleId: b.id }); },
    rechnungFuerBaustelle: el => { const b = baustelle(el.dataset.id); if (b) rechnungFuerBaustelle(b); },
    baustelleSchnell: () => {
      const v = Z.notiz ? vorschlaegeAus(notizText(Z.notiz), leistungen(), kunden()) : null;
      Z.dialog = { art: 'baustelleNeu', name: '', kundeId: Z.notiz?.kundeId || v?.kunde?.id || '', strasse: '', plz: '', ort: '' };
      render(); wurzel.querySelector('#d-b-name')?.focus();
    },
    baustelleSchnellSpeichern: () => {
      const d = Z.dialog;
      if (!String(d.name || '').trim()) { zeigeToast('Bitte einen Namen eintragen'); wurzel.querySelector('#d-b-name')?.focus(); return; }
      const k = kunde(d.kundeId);
      const ohneAdresse = !String(d.strasse || '').trim() && !String(d.ort || '').trim();
      const b = speicher.aendern('baustellen', { id: neueId('b'), name: d.name.trim(), kundeId: k?.id || null, strasse: ohneAdresse ? k?.strasse || '' : String(d.strasse || '').trim(),
        plz: ohneAdresse ? k?.plz || '' : String(d.plz || '').trim(), ort: ohneAdresse ? k?.ort || '' : String(d.ort || '').trim(), status: 'aktiv', beginn: heute(), notiz: '', angelegt: new Date().toISOString() });
      Z.dialog = null;
      if (Z.notiz && Z.ansicht === 'notiz') { Z.notiz.baustelleId = b.id; Z.notiz.baustelleAuto = false; notizMerken(); }
      render();
    },

    // Notizen
    notizBaustelle: el => {
      const n = Z.notiz;
      n.baustelleId = el.dataset.id || null; n.baustelleAuto = false;
      teilErsetzen('#n-baustellen', baustellenWahlHtml()); notizMerkenBald();
    },
    notizSpeichern: async () => {
      if (Z.diktat) await diktatStoppen();
      const n = Z.notiz;
      if (!n || notizLeer(n)) return;
      notizSichern();
      const b = baustelle(n.baustelleId);
      const offline = modus === 'echt' && !istLaptop && !Z.abgleich.verbunden;
      if (n.neu) { Z.notiz = neueNotiz(); notizMerken(); }
      zurueck();
      zeigeToast(`Gespeichert${b ? ' · ' + b.name : ''}${offline ? ' – geht an den Laptop, sobald er erreichbar ist' : ''}`);
    },
    notizVerwerfen: async () => {
      if (Z.diktat) await diktatStoppen();
      const n = Z.notiz;
      for (const id of n.fotos) speicher.dateiVerwerfen(id);
      if (n.audio) speicher.dateiVerwerfen(n.audio);
      Z.notiz = neueNotiz({ baustelleId: n.baustelleId, baustelleAuto: n.baustelleAuto });
      notizMerken(); zurueck();
    },
    notizBearbeiten: el => gehe('notiz', el.dataset.id),
    notizRechnung: async () => {
      if (Z.diktat) await diktatStoppen();
      const n = notizSichern();   // Änderungen zuerst ablegen
      if (baustelle(n.baustelleId)) rechnungAusNotizen([n], { baustelleId: n.baustelleId });
      else rechnungAusNotizen([n], { kundeId: n.kundeId || vorschlaegeAus(notizText(n), leistungen(), kunden()).kunde?.id || null });
    },
    notizErledigt: async () => {
      if (Z.diktat) await diktatStoppen();
      notizSichern({ status: 'erledigt' }); zurueck(); zeigeToast('Abgehakt – ohne Rechnung');
    },
    notizWiederOffen: () => { notizSichern({ status: 'offen', rechnungId: null }); zurueck(); },
    notizLoeschenFragen: el => {
      const n = speicher.holen('notizen', el.dataset.id);
      if (n?.status === 'abgerechnet') { zeigeToast('Abgerechnete Notizen bleiben als Nachweis erhalten'); return; }
      Z.dialog = { art: 'loeschen', titel: 'Notiz löschen?', text: 'Text, Fotos und Sprachaufnahme werden entfernt.', aktion: 'notizLoeschen', id: el.dataset.id }; render();
    },
    notizLoeschen: () => {
      const id = Z.dialog.id, n = speicher.holen('notizen', id);
      const r = n?.rechnungId ? speicher.holen('rechnungen', n.rechnungId) : null;
      if (r?.status === 'entwurf') speicher.aendern('rechnungen', { ...stripMeta(r), notizen: (r.notizen || []).filter(x => x !== id) });
      speicher.loeschen('notizen', id);
      Z.dialog = null;
      if (Z.ansicht === 'notiz' && Z.notiz?.id === id) zurueck(); else render();
      zeigeToast('Notiz gelöscht');
    },
    fotoZeigen: el => { Z.dialog = { art: 'foto', id: el.dataset.id }; render(); },
    fotoEntfernen: el => {
      const n = Z.notiz;
      n.fotos = n.fotos.filter(x => x !== el.dataset.id);
      if (n.neu) speicher.dateiVerwerfen(el.dataset.id);
      notizMerken(); render();
    },
    aufnahmeEntfernen: () => {
      const n = Z.notiz;
      if (n.neu && n.audio) speicher.dateiVerwerfen(n.audio);
      Object.assign(n, { audio: null, audioSekunden: 0, vorfuehrText: '', abschrift: null, abschriftStatus: null, abschriftUebernommen: false });
      notizMerken(); render();
    },
    abschriftUebernehmen: () => { const n = Z.notiz; n.text = anhaengen(n.text, n.abschrift); n.abschriftUebernommen = true; render(); },

    // Diktat
    diktatStart: () => diktatStarten(),
    diktatStopp: () => diktatStoppen(),
    diktatModus: el => { speicher.setMeta('diktatModus', el.dataset.wert); if (el.dataset.wert === 'live') speicher.setMeta('liveGesperrt', false); teilErsetzen('#diktat-einstellung', diktatEinstellungHtml()); },

    // Einstellungen
    logoEntfernen: () => { Z.form.daten.logo = null; render(); },
    firmaSpeichern: () => {
      const d = Z.form.daten;
      if (!nummernformatGueltig(d.nummernFormat)) { zeigeToast('Das Nummernformat braucht {NNNN} für die laufende Nummer'); return; }
      speicher.aendern('einstellungen', { ...stripMeta(d), id: 'firma' });
      zeigeToast('Einstellungen gespeichert'); render();
    }
  };

  // Klicks
  wurzel.addEventListener('click', ev => {
    if (ev.target.matches('[data-blende]')) { Z.dialog = null; render(); return; }
    if (ev.target.closest('audio')) return;          // Abspielen in einer Notiz-Karte öffnet nicht die Notiz
    if (ev.target.id === 'n-datum') { try { ev.target.showPicker(); } catch { /* Gerät öffnet den Kalender selbst */ } return; }
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = H[el.dataset.act];
    if (f) { ev.preventDefault(); f(el, ev); }
  });
  wurzel.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role="button"][data-act]')) { ev.preventDefault(); ev.target.click(); }
  });
  // Eingaben
  wurzel.addEventListener('input', ev => eingabe(ev.target, 'input'));
  wurzel.addEventListener('change', ev => eingabe(ev.target, 'change'));
  function eingabe(el, art) {
    const textartig = el.matches('input:not([type=checkbox]):not([type=file]):not([type=date]), textarea');
    if (textartig && art === 'change') return;
    if (!textartig && art === 'input' && !el.matches('input[type=date]')) return;
    if (el.dataset.actChange && art === 'change') return dateiGewaehlt(el);
    if (el.dataset.suche) {
      const welche = el.dataset.suche;
      Z['suche' + welche] = el.value;
      if (welche === 'R') teilErsetzen('#liste-r', rechnungsListeHtml());
      if (welche === 'K') teilErsetzen('#liste-k', kundenListeHtml());
      if (welche === 'L') teilErsetzen('#liste-l', leistungenListeHtml());
      if (welche === 'B') teilErsetzen('#liste-b', baustellenListeHtml());
      return;
    }
    if (el.matches('[data-dsuche]')) { Z.dialog.suche = el.value; teilErsetzen('#d-liste', Z.dialog.art === 'katalog' ? leistungenListeHtml(true) : kundenWahlHtml()); return; }
    if (el.dataset.dfeld && Z.dialog) { Z.dialog[el.dataset.dfeld] = el.type === 'checkbox' ? el.checked : el.value; return; }
    if (el.dataset.n && Z.notiz) {
      Z.notiz[el.dataset.n] = el.value;
      if (el.dataset.n === 'datum') { const t = wurzel.querySelector('#n-datum-text'); if (t) t.textContent = datumKurz(el.value) || 'Datum'; }
      if (el.dataset.n === 'text') notizTextGeaendert(); else notizMerkenBald();
      return;
    }
    if (el.dataset.e && Z.entwurf) {
      const f = el.dataset.e;
      Z.entwurf[f] = el.type === 'checkbox' ? el.checked : f === 'zahlungszielTage' ? (el.value.trim() === '' ? null : Math.max(0, parseInt(el.value, 10) || 0)) : el.value;
      if (f === 'leistungVon') el.classList.toggle('fehlt', !istIso(el.value));
      entwurfSpeichernBald(); teilAktualisieren(); return;
    }
    const posEl = el.closest('[data-pos]');
    if (el.dataset.p && posEl && Z.entwurf) {
      const p = Z.entwurf.positionen.find(x => x.id === posEl.dataset.pos);
      const f = el.dataset.p;
      if (f === 'aktiv') { p.aktiv = el.checked; posEl.classList.toggle('aus', !el.checked); }
      else if (f === 'menge') { p.menge = mengeAus(el.value); el.classList.toggle('fehlt', !Number(p.menge)); }
      else if (f === 'preis') { p.preisCent = centAus(el.value); el.classList.toggle('fehlt', p.preisCent == null); }
      else if (f === 'steuersatz') p.steuersatz = Number(el.value);
      else { p[f] = el.value; if (f === 'bezeichnung') el.classList.toggle('fehlt', el.value.trim().length < 2); }
      const zelle = posEl.querySelector('[data-betrag]'); if (zelle) zelle.textContent = euro(positionNetto(p));
      entwurfSpeichernBald(); teilAktualisieren(); return;
    }
    if ((el.dataset.form || el.dataset.formSchalter) && Z.form) {
      const d = Z.form.daten;
      if (el.dataset.formSchalter) {
        const f = el.dataset.formSchalter;
        d[f] = f === 'zustimmungMail' ? (el.checked ? heute() : '') : el.checked;
        if (f === 'zustimmungMail') render();
        return;
      }
      const f = el.dataset.form;
      if (f === 'preis') { d.preisCent = centAus(el.value); }
      else if (f === 'steuersatz') d.steuersatz = Number(el.value);
      else if (f === 'zahlungszielTage') d.zahlungszielTage = el.value.trim() === '' ? (Z.form.typ === 'einstellungen' ? 14 : null) : Math.max(0, parseInt(el.value, 10) || 0);
      else d[f] = el.value;
      if (Z.form.typ === 'leistungen' && (f === 'preis' || f === 'steuersatz')) teilErsetzen('#l-brutto', d.preisCent == null ? '' : 'Brutto ' + euro(Math.round(d.preisCent * (1 + Number(d.steuersatz ?? 19) / 100))));
      if (Z.form.typ === 'einstellungen' && ['ustId', 'iban', 'nummernFormat'].includes(f) && art === 'change') render();
      if (Z.form.typ === 'baustellen' && f === 'kundeId') render();
      return;
    }
    if (el.dataset.std !== undefined && Z.form) { Z.form.daten.standard[Number(el.dataset.std)].menge = mengeAus(el.value) || 1; return; }
    if (el.matches('[data-geraetname]')) { speicher.geraetNennen(el.value); }
  }
  async function dateiGewaehlt(el) {
    const dateien = [...(el.files || [])];
    if (el.dataset.actChange === 'logoGewaehlt' && dateien[0]) {
      const url = await bildVerkleinern(dateien[0], 900, 'image/png', true);
      if (url.length > 2_500_000) { zeigeToast('Das Logo ist zu groß – bitte ein kleineres Bild wählen'); return; }
      Z.form.daten.logo = url; render(); return;
    }
    if (el.dataset.actChange === 'fotoGewaehlt' && Z.notiz) {
      for (const d of dateien) {
        try { Z.notiz.fotos.push(await speicher.dateiAblegen(await bildVerkleinern(d, 2000, 'image/jpeg'), 'image/jpeg')); }
        catch { zeigeToast('Ein Bild konnte nicht gelesen werden'); }
      }
      notizMerken(); render();
    }
  }
  const audioSpielt = () => [...wurzel.querySelectorAll('audio')].some(a => !a.paused);
  let spaeterZeichnen = false;
  wurzel.addEventListener('pause', () => { if (spaeterZeichnen && !audioSpielt()) { spaeterZeichnen = false; nachFremdAenderung(); } }, true);
  /** Der Laptop hat Neues geschickt (anderes Gerät, Nummer vergeben, Abschrift fertig …) – behutsam neu zeichnen. */
  function nachFremdAenderung() {
    abgleichChipsAktualisieren();
    const tippt = document.activeElement && document.activeElement.matches('input, textarea, select');
    if (Z.ansicht === 'rechnung' && Z.entwurf) {
      const r = speicher.holen('rechnungen', Z.entwurf.id);
      if (!r) return;
      if (r.status !== 'entwurf') { Z.entwurf = null; render(); zeigeToast(`Rechnung ${r.nummer} wurde festgeschrieben`); return; }
      if (JSON.stringify(r.freigabe) !== JSON.stringify(Z.entwurf.freigabe) || JSON.stringify(r.freigabeFehler) !== JSON.stringify(Z.entwurf.freigabeFehler)) {
        Z.entwurf.freigabe = r.freigabe; Z.entwurf.freigabeFehler = r.freigabeFehler; if (!tippt) render();
      }
      return;
    }
    if (['kunde', 'leistung', 'einstellungen', 'baustelleForm'].includes(Z.ansicht) && Z.form) return;
    if (Z.dialog && Z.dialog.art !== 'abgleich') return;
    if (audioSpielt()) { spaeterZeichnen = true; return; }
    if (Z.ansicht === 'notiz') {
      // Eingabe bleibt unberührt – nur die Baustellen-Auswahl und ggf. die frisch abgetippte Aufnahme der bearbeiteten Notiz
      const n = Z.notiz, gespeichert = !n.neu ? speicher.holen('notizen', n.id) : null;
      if (gespeichert && (gespeichert.abschriftStatus !== n.abschriftStatus || gespeichert.abschrift !== n.abschrift)) {
        Object.assign(n, { abschrift: gespeichert.abschrift, abschriftStatus: gespeichert.abschriftStatus, abschriftZeit: gespeichert.abschriftZeit, _seq: gespeichert._seq });
        if (!tippt && !Z.diktat) { render(); return; }
      }
      if (n.neu) teilErsetzen('#n-baustellen', baustellenWahlHtml());
      return;
    }
    if (!tippt) render();
  }

  // Erstes Zeichnen
  Z.notiz = gemerkterEntwurf() || neueNotiz();
  render();
  window.addEventListener('beforeunload', () => { entwurfSofortSpeichern(); notizMerken(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    entwurfSofortSpeichern(); notizMerken();
    if (Z.diktat) diktatStoppen();      // Bildschirm aus / App gewechselt: Aufnahme sichern statt verlieren
  });
  return { zustand: Z, abgleich };
}

/** Foto verkleinern (Handykameras liefern 12 MP – für Belege reichen 2000 px), als Blob oder data:-URL. */
async function bildVerkleinern(datei, maxPx, typ, alsUrl = false) {
  const url = URL.createObjectURL(datei);
  try {
    const img = await new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = url; });
    const s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext('2d');
    if (typ === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (alsUrl) return c.toDataURL(typ, 0.9);
    return await new Promise(ok => c.toBlob(ok, typ, 0.85));
  } finally { URL.revokeObjectURL(url); }
}
