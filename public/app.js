// RechnungApp – Oberfläche für Handy und Laptop (Vanilla-JS ohne Build-Schritt, wie MyDesk).
// Arbeitet immer mit der Kopie auf dem Gerät (speicher) – der Abgleich mit dem Laptop läuft im Hintergrund.
import { euro, centAus, centText, mengeAus, mengeText } from './lib/geld.js';
import { heuteIso, datumDe, tageZwischen, istIso } from './lib/datum.js';
import { ARTEN, EINHEITEN, STEUERSAETZE, KUNDENTYPEN, berechne, positionNetto } from './lib/berechnung.js';
import { pruefeRechnung, istReverseCharge, ustIdGueltig, zahlungszielTage } from './lib/pruefung.js';
import { festeFassung, zahlstatus, offenerBetrag, nummernformatGueltig, rechnungsnummer, STANDARD_NUMMERNFORMAT } from './lib/festschreiben.js';
import { epcText, qrMatrix, qrSvg, ibanGueltig, ibanText } from './lib/girocode.js';
import { anrede, anschriftZeilen, absenderZeile, infoZeilen, betreffZeile, fussSpalten } from './lib/brief.js';
import { vorschlaegeAus } from './lib/vorschlaege.js';
import { starteAbgleich } from './lib/abgleich-client.js';

const ICONS = {
  start: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  rechnung: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',
  kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  kunden: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c1.9.9 3 3 3 5.8"/>',
  leistungen: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.6-.6-2.6z"/>',
  einstellungen: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  zurueck: '<path d="M15 5l-7 7 7 7"/>',
  suche: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.4v.2"/>',
  fehler: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  okkreis: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  muell: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  mikro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  handy: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  druck: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  euro: '<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M5 10.5h8M5 13.5h8"/>',
  stern: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  kopie: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V4H4v12h4"/>',
  storno: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  auge: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  schloss: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eingang: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
  notiz: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  abgleich: '<path d="M20 8a8 8 0 0 0-14.5-2M4 4v4h4"/><path d="M4 16a8 8 0 0 0 14.5 2M20 20v-4h-4"/>'
};
const ic = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kopie = o => JSON.parse(JSON.stringify(o));
const nachName = (a, b) => String(a.name || a.bezeichnung || '').localeCompare(String(b.name || b.bezeichnung || ''), 'de', { sensitivity: 'base' });
const STANDARD_EINLEITUNG = 'vielen Dank für Ihren Auftrag. Für die ausgeführten Arbeiten berechnen wir Ihnen:';
const STATUS_TEXT = { entwurf: 'Entwurf', freigabe: 'Wartet auf Laptop', offen: 'Offen', ueberfaellig: 'Überfällig', bezahlt: 'Bezahlt', storniert: 'Storniert', storno: 'Storno' };
const HINWEIS_KURZ = { '35a': 'Arbeitskosten nach § 35a EStG ausgewiesen', aufbewahrung: 'Aufbewahrungshinweis für Privatkunden (§ 14b UStG)', verzug: 'Verzugshinweis (§ 286 Abs. 3 BGB)',
  '13b': '§ 13b: Steuerschuldnerschaft des Leistungsempfängers', ist: 'Hinweis Ist-Versteuerung', storno: 'Bezug auf die ursprüngliche Rechnung' };
const WOCHENTAG = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function starteApp({ speicher, transport, modus = 'echt', wurzel = document.getElementById('app'), vorschau = null }) {
  const Z = {
    ansicht: 'start', id: null, verlauf: [], filterR: 'alle', filterK: 'alle', sucheR: '', sucheK: '', sucheL: '',
    editorTab: 'bearbeiten', entwurf: null, entwurfNeu: false, form: null, dialog: null, toast: null, beschreibungOffen: new Set(),
    erfassung: null, abgleich: { verbunden: null, laeuft: false, wartend: 0 }, serverStatus: null
  };
  const heute = () => heuteIso();
  const firma = () => speicher.holen('einstellungen', 'firma') || {};
  const kunden = () => speicher.alle('kunden').sort(nachName);
  const kunde = id => (id ? speicher.holen('kunden', id) : null);
  const leistungen = () => speicher.alle('leistungen').filter(l => l.aktiv !== false).sort(nachName);
  const leistung = id => (id ? speicher.holen('leistungen', id) : null);
  const rechnungen = () => speicher.alle('rechnungen');
  const erfassungen = () => speicher.alle('erfassungen');
  const neueId = v => speicher.neueId(v);
  const istLaptop = transport.istLaptop;

  // ── Abgleich ──
  const abgleich = starteAbgleich({
    speicher, transport,
    melden: st => { Z.abgleich = st; abgleichChipsAktualisieren(); if (st.anmelden && !Z.dialog) { Z.dialog = { art: 'anmelden' }; render(); } },
    abgelehnt: liste => {
      const k = liste.find(e => e.grund === 'konflikt');
      if (k) zeigeToast('Auf einem anderen Gerät wurde gleichzeitig etwas geändert – die neuere Fassung gilt.');
      if (liste.some(e => e.grund === 'zu-gross')) zeigeToast('Eine Änderung ist zu groß (z. B. Logo) – bitte kleineres Bild wählen.');
    }
  });
  speicher.beiAenderung(quelle => { if (quelle === 'laptop') nachFremdAenderung(); });

  // ── Navigation ──
  function gehe(ansicht, id = null) {
    entwurfSofortSpeichern();
    Z.verlauf.push([Z.ansicht, Z.id]);
    Object.assign(Z, { ansicht, id, form: null, editorTab: 'bearbeiten', dialog: null });
    vorbereiten(); render(); window.scrollTo(0, 0);
  }
  function tab(ansicht) { entwurfSofortSpeichern(); Object.assign(Z, { ansicht, id: null, verlauf: [], form: null, dialog: null }); vorbereiten(); render(); window.scrollTo(0, 0); }
  function zurueck() {
    entwurfSofortSpeichern();
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
      Z.form = { typ: 'leistungen', neu: !l, daten: l ? kopie(l) : { id: neueId('l'), bezeichnung: '', beschreibung: '', einheit: 'Std.', preisCent: null, steuersatz: 19, art: 'arbeit', favorit: false, suchwoerter: '', aktiv: true } };
    }
    if (Z.ansicht === 'einstellungen' && !Z.form) {
      Z.form = { typ: 'einstellungen', daten: { nummernFormat: STANDARD_NUMMERNFORMAT, zahlungszielTage: 14, versteuerung: 'soll', einleitung: STANDARD_EINLEITUNG, schluss: 'Mit freundlichen Grüßen', ...kopie(firma()), id: 'firma' } };
      if (transport.status) transport.status().then(s => { Z.serverStatus = s; if (Z.ansicht === 'einstellungen') teilErsetzen('#serverstatus', serverStatusHtml()); }).catch(() => {});
    }
    if (Z.ansicht === 'erfassen' && !Z.erfassung) Z.erfassung = neueErfassung();
  }

  // ── Rendern ──
  function render() {
    const fokus = document.activeElement && document.activeElement.id;
    wurzel.innerHTML = `<div class="rahmen">${seitenleiste()}<main class="inhalt ${['rechnung'].includes(Z.ansicht) ? 'breit' : ''}" id="inhalt">${ansicht()}</main>${tabLeiste()}</div>${dialogHtml()}${toastHtml()}`;
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
      case 'kunden': return ansichtKunden();
      case 'kunde': return ansichtKunde();
      case 'leistungen': return ansichtLeistungen();
      case 'leistung': return ansichtLeistung();
      case 'erfassen': return ansichtErfassen();
      case 'einstellungen': return ansichtEinstellungen();
      default: return ansichtStart();
    }
  }
  function teilErsetzen(sel, html) { const el = wurzel.querySelector(sel); if (el) el.innerHTML = html; }

  const NAV = [['start', 'start', 'Übersicht'], ['rechnungen', 'rechnung', 'Rechnungen'], ['erfassen', 'kamera', 'Erfassen'], ['kunden', 'kunden', 'Kunden'], ['leistungen', 'leistungen', 'Leistungen'], ['einstellungen', 'einstellungen', 'Einstellungen']];
  const aktivTab = () => ({ rechnung: 'rechnungen', kunde: 'kunden', leistung: 'leistungen' }[Z.ansicht] || Z.ansicht);
  function seitenleiste() {
    const neu = erfassungen().filter(e => e.status === 'neu').length;
    return `<nav class="seitenleiste" aria-label="Hauptmenü">
      <div class="marke"><span class="marke-zeichen">${ic('rechnung')}</span><div><strong>RechnungApp</strong><small>${esc(firma().name || 'Rechnungen fürs Handwerk')}</small></div></div>
      ${NAV.map(([a, i, t]) => `<button class="nav ${aktivTab() === a ? 'aktiv' : ''}" data-act="tab" data-ansicht="${a}">${ic(i)}<span>${t}</span>${a === 'erfassen' && neu ? `<span class="zaehler">${neu}</span>` : ''}</button>`).join('')}
      <div class="fuss">${abgleichChip()}<button class="knopf voll" data-act="neueRechnung">${ic('plus')} Neue Rechnung</button></div>
    </nav>`;
  }
  function tabLeiste() {
    const t = (a, i, text) => `<button class="tab ${aktivTab() === a ? 'aktiv' : ''}" data-act="tab" data-ansicht="${a}">${ic(i)}<span>${text}</span></button>`;
    return `<nav class="tabs" aria-label="Hauptmenü">${t('start', 'start', 'Übersicht')}${t('rechnungen', 'rechnung', 'Rechnungen')}
      <button class="tab erfassen ${aktivTab() === 'erfassen' ? 'aktiv' : ''}" data-act="tab" data-ansicht="erfassen"><span class="kreis">${ic('kamera')}</span><span>Erfassen</span></button>
      ${t('kunden', 'kunden', 'Kunden')}${t('leistungen', 'leistungen', 'Leistungen')}</nav>`;
  }
  function kopf({ titel, unter = '', zurueckKnopf = false, rechts = '' }) {
    return `<header class="kopf">${zurueckKnopf ? `<button class="rund" data-act="zurueck" aria-label="Zurück">${ic('zurueck')}</button>` : ''}
      <div class="titelblock"><h1>${esc(titel)}</h1>${unter ? `<span class="unterzeile">${esc(unter)}</span>` : ''}</div>${rechts}</header>`;
  }
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
    return `<button class="abgleich ${klasse}" data-act="abgleichDialog" data-chip title="Abgleich mit dem Laptop"><span class="punkt"></span><span class="lang">${esc(lang)}</span><span class="kurz">${esc(kurz)}</span></button>`;
  }
  function abgleichChipsAktualisieren() { for (const el of wurzel.querySelectorAll('[data-chip]')) el.outerHTML = abgleichChip(); if (Z.dialog?.art === 'abgleich') teilErsetzen('.dialog', dialogInhalt()); }

  const vorschauBand = () => (modus === 'vorschau'
    ? `<div class="vorschau-band">${ic('auge')}<span><strong>Vorschau</strong> mit Beispieldaten – alles bleibt auf diesem Gerät. Der „Laptop" wird im Browser nachgebildet.</span></div>` : '');

  // ── Übersicht ──
  function ansichtStart() {
    const h = heute(), rs = rechnungen();
    const st = r => zahlstatus(r, h);
    const offen = rs.filter(r => ['offen', 'ueberfaellig'].includes(st(r)));
    const ueber = rs.filter(r => st(r) === 'ueberfaellig');
    const entwuerfe = rs.filter(r => r.status === 'entwurf');
    const summe = l => l.reduce((s, r) => s + offenerBetrag(r), 0);
    const eingang = erfassungen().filter(e => e.status === 'neu').sort((a, b) => String(b.angelegt).localeCompare(String(a.angelegt)));
    const zuletzt = rs.slice().sort((a, b) => String(b._geaendert).localeCompare(String(a._geaendert))).slice(0, 6);
    const f = firma();
    const fehltFirma = !f.name || !(f.steuernummer || f.ustId) || !f.strasse;
    return kopf({ titel: 'Übersicht', unter: WOCHENTAG.format(new Date()), rechts: `<span class="nur-handy">${abgleichChip()}</span><button class="rund nur-handy" data-act="tab" data-ansicht="einstellungen" aria-label="Einstellungen">${ic('einstellungen')}</button>` }) + `
      <div class="stapel">${vorschauBand()}
        ${fehltFirma ? `<div class="box gold">${ic('stift')}<div><strong>Zuerst deine Firmendaten eintragen.</strong><br>Name, Anschrift und Steuernummer stehen auf jeder Rechnung.<div class="knopfreihe"><button class="knopf" data-act="tab" data-ansicht="einstellungen">Firmendaten eintragen</button></div></div></div>` : ''}
        <div class="kennzahlen">
          <button class="kennzahl" data-act="rechnungenFilter" data-wert="offen"><span class="etikett">Offen</span><strong>${euro(summe(offen))}</strong><span class="sub">${offen.length} Rechnung${offen.length === 1 ? '' : 'en'}</span></button>
          <button class="kennzahl ${ueber.length ? 'warn' : ''}" data-act="rechnungenFilter" data-wert="ueberfaellig"><span class="etikett">Überfällig</span><strong>${euro(summe(ueber))}</strong><span class="sub">${ueber.length} Rechnung${ueber.length === 1 ? '' : 'en'}</span></button>
          <button class="kennzahl" data-act="rechnungenFilter" data-wert="entwurf"><span class="etikett">Entwürfe</span><strong>${entwuerfe.length}</strong><span class="sub">ohne Nummer</span></button>
        </div>
        <div class="aktionen-gross">
          <button class="aktion haupt" data-act="neueRechnung"><span class="marke-zeichen">${ic('plus')}</span>Neue Rechnung</button>
          <button class="aktion" data-act="tab" data-ansicht="erfassen"><span class="marke-zeichen">${ic('kamera')}</span>Erfassen</button>
          <button class="aktion" data-act="neuerKunde"><span class="marke-zeichen">${ic('kunden')}</span>Neuer Kunde</button>
        </div>
        ${eingang.length ? `<section class="karte"><h2>${ic('eingang')} Eingang <span class="pille offen">${eingang.length} neu</span><button class="knopf leise rechts" data-act="tab" data-ansicht="erfassen">Alle</button></h2>${eingang.slice(0, 3).map(eingangKarte).join('')}</section>` : ''}
        <section class="karte"><h2>Zuletzt bearbeitet<button class="knopf leise rechts" data-act="tab" data-ansicht="rechnungen">Alle Rechnungen</button></h2>
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
    let neben;
    if (r.status === 'entwurf') neben = `Entwurf · ${(r.positionen || []).filter(p => p.aktiv !== false).length} Positionen`;
    else if (st === 'ueberfaellig') neben = `${datumDe(r.datum)} · seit ${tageZwischen(r.faellig, heute())} Tagen fällig`;
    else if (st === 'offen') neben = `${datumDe(r.datum)} · fällig ${datumDe(r.faellig)}`;
    else neben = datumDe(r.datum);
    return `<button class="zeile" data-act="oeffneRechnung" data-id="${r.id}">
      <span class="haupt">${r.nummer ? esc(r.nummer) + ' · ' : ''}${esc(name)}</span><span class="rechts">${euro(betrag)}</span>
      <span class="neben">${esc(neben)}</span><span class="rechts">${pille(st)}</span></button>`;
  }
  function rechnungenGefiltert() {
    const h = heute(), q = Z.sucheR.trim().toLowerCase();
    return rechnungen().filter(r => {
      const st = zahlstatus(r, h);
      if (Z.filterR === 'entwurf' && !['entwurf', 'freigabe'].includes(st)) return false;
      if (Z.filterR === 'offen' && !['offen', 'ueberfaellig'].includes(st)) return false;
      if (Z.filterR === 'ueberfaellig' && st !== 'ueberfaellig') return false;
      if (Z.filterR === 'bezahlt' && st !== 'bezahlt') return false;
      if (Z.filterR === 'storniert' && !['storniert', 'storno'].includes(st)) return false;
      if (!q) return true;
      const name = r.fest?.kunde?.name || kunde(r.kundeId)?.name || '';
      return (name + ' ' + (r.nummer || '') + ' ' + (r.betreff || '')).toLowerCase().includes(q);
    }).sort((a, b) => (a.status === 'entwurf') !== (b.status === 'entwurf') ? (a.status === 'entwurf' ? -1 : 1)
      : String(b.datum || b._geaendert).localeCompare(String(a.datum || a._geaendert)) || String(b.nummer).localeCompare(String(a.nummer)));
  }
  const rechnungsListeHtml = () => { const l = rechnungenGefiltert(); return l.length ? l.map(rechnungZeile).join('') : '<div class="leer">Keine passenden Rechnungen.</div>'; };
  function ansichtRechnungen() {
    const f = [['alle', 'Alle'], ['entwurf', 'Entwürfe'], ['offen', 'Offen'], ['ueberfaellig', 'Überfällig'], ['bezahlt', 'Bezahlt'], ['storniert', 'Storniert']];
    return kopf({ titel: 'Rechnungen', rechts: `<button class="knopf" data-act="neueRechnung">${ic('plus')} Neu</button>` }) + `
      <div class="stapel">${vorschauBand()}
        <div class="filter" role="tablist">${f.map(([w, t]) => `<button class="chip ${Z.filterR === w ? 'an' : ''}" data-act="rechnungenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-r" type="search" data-suche="R" value="${esc(Z.sucheR)}" placeholder="Kunde, Nummer oder Betreff"></label>
        <section class="karte"><div class="liste" id="liste-r">${rechnungsListeHtml()}</div></section>
      </div>`;
  }

  // ── Rechnungseditor (Entwurf) ──
  function neueRechnung(kundeId = null, extra = {}) {
    const f = firma();
    const r = { id: neueId('r'), typ: 'rechnung', status: 'entwurf', kundeId, leistungVon: heute(), leistungBis: '', amGrundstueck: true, betreff: '',
      einleitung: f.einleitung || STANDARD_EINLEITUNG, schluss: f.schluss || 'Mit freundlichen Grüßen', zahlungszielTage: null, positionen: [], erfassungen: [],
      angelegt: new Date().toISOString(), ...extra };
    if (kundeId && !extra.positionen) standardDazu(r, kunde(kundeId));
    entwurfSofortSpeichern();
    Z.verlauf.push([Z.ansicht, Z.id]);
    Object.assign(Z, { ansicht: 'rechnung', id: r.id, entwurf: r, entwurfNeu: true, editorTab: 'bearbeiten', form: null, dialog: null });
    if (r.kundeId || r.positionen.length) entwurfSofortSpeichern();
    render(); window.scrollTo(0, 0);
  }
  const posAusLeistung = (l, menge = 1) => ({ id: neueId('p'), leistungId: l.id, bezeichnung: l.bezeichnung, beschreibung: l.beschreibung || '', menge, einheit: l.einheit,
    preisCent: l.preisCent ?? null, steuersatz: l.steuersatz ?? 19, art: l.art || 'sonstiges', aktiv: true });
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
    const { _seq, _geaendert, _geraet, _geloescht, _typ, ...daten } = r;
    void _seq; void _geaendert; void _geraet; void _geloescht; void _typ;
    if (gespeichert && JSON.stringify({ ...gespeichert, _seq: 0, _geaendert: 0, _geraet: 0, _typ: 0, _geloescht: 0 }) === JSON.stringify({ ...daten, _seq: 0, _geaendert: 0, _geraet: 0, _typ: 0, _geloescht: 0 })) return;
    speicher.aendern('rechnungen', daten);
    Z.entwurfNeu = false;
  }

  function ansichtEditor() {
    const r = Z.entwurf;
    const k = kunde(r.kundeId), f = firma();
    const p = pruefeRechnung({ firma: f, kunde: k, rechnung: r, datum: heute(), original: originalVon(r) });
    const wartet = !!r.freigabe;
    const titel = r.typ === 'storno' ? 'Stornorechnung' : 'Rechnung';
    return kopf({ titel, unter: k ? k.name : 'Entwurf – noch ohne Nummer', zurueckKnopf: true, rechts: abgleichChip() }) + `
      ${vorschauBand()}
      ${freigabeBanner(r)}
      <div class="nur-schmal" style="margin:12px 0"><div class="segment voll" role="tablist">
        <button class="${Z.editorTab === 'bearbeiten' ? 'an' : ''}" data-act="editorTab" data-tab="bearbeiten">Bearbeiten</button>
        <button class="${Z.editorTab === 'vorschau' ? 'an' : ''}" data-act="editorTab" data-tab="vorschau">Vorschau</button></div></div>
      <div class="editor ${Z.editorTab === 'vorschau' ? 'zeige-blatt' : ''}" style="margin-top:12px">
        <fieldset class="form-spalte" style="border:0;margin:0;padding:0;min-width:0" ${wartet ? 'disabled' : ''}>
          ${karteKunde(r, k)}${karteLeistung(r, k)}${kartePositionen(r, k)}${karteTexte(r, k, f)}
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
    if (r.freigabe) return `<div class="box ocker">${ic('laptop')}<div><strong>Freigegeben – wartet auf den Laptop.</strong><br>Sobald der Laptop erreichbar ist, prüft er die Rechnung, vergibt die Nummer und legt das PDF ab.
      <div class="knopfreihe"><button class="knopf zweit" data-act="abgleichJetzt">${ic('abgleich')} Jetzt abgleichen</button><button class="knopf leise" data-act="freigabeZuruecknehmen">Freigabe zurücknehmen</button></div></div></div>`;
    if (r.freigabeFehler?.length) return `<div class="box rot">${ic('fehler')}<div><strong>Der Laptop hat die Freigabe abgelehnt:</strong><br>${r.freigabeFehler.map(esc).join('<br>')}</div></div>`;
    return '';
  }
  function karteKunde(r, k) {
    if (!k) return `<section class="karte"><h2>Kunde</h2><button class="knopf voll" data-act="kundeWaehlen">${ic('kunden')} Kunde wählen</button></section>`;
    const fehlend = (k.standard || []).filter(s => !r.positionen.some(p => p.leistungId === s.leistungId) && leistung(s.leistungId));
    return `<section class="karte"><h2>Kunde<button class="knopf leise rechts" data-act="kundeWaehlen">Ändern</button></h2>
      <div class="kunde-kurz"><div><strong>${esc(k.name)}</strong><div class="neben">${esc([k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${k.nummer ? ' · ' + esc(k.nummer) : ''}</div></div>
        <span class="pille typ">${KUNDENTYPEN[k.typ] || ''}${k.bauleistender13b ? ' · § 13b' : ''}</span></div>
      ${fehlend.length ? `<div class="knopfreihe" style="margin-top:10px"><button class="chip dazu" data-act="standardUebernehmen">Wiederkehrende Positionen von ${esc(k.name)} (${fehlend.length})</button></div>` : ''}
    </section>`;
  }
  function karteLeistung(r, k) {
    return `<section class="karte"><h2>Leistung</h2><div class="felder">
      <label class="feld"><span>Leistung am / ab</span><input type="date" id="e-von" data-e="leistungVon" value="${esc(r.leistungVon || '')}" class="${istIso(r.leistungVon) ? '' : 'fehlt'}"></label>
      <label class="feld"><span>bis (bei Zeitraum)</span><input type="date" id="e-bis" data-e="leistungBis" value="${esc(r.leistungBis || '')}"></label>
      <label class="feld ganz"><span>Betreff / Bauvorhaben (optional)</span><input id="e-betreff" data-e="betreff" value="${esc(r.betreff || '')}" placeholder="z. B. Badsanierung EG, Gartenweg 5"></label>
      ${k?.typ === 'privat' ? `<label class="schalter ganz"><input type="checkbox" id="e-grund" data-e="amGrundstueck" ${r.amGrundstueck !== false ? 'checked' : ''}>
        <span>Arbeiten an Haus, Wohnung oder Grundstück<br><small class="leise">Dann kommen der Ausweis der Arbeitskosten (§ 35a EStG) und der Aufbewahrungshinweis auf die Rechnung.</small></span></label>` : ''}
    </div></section>`;
  }
  function kartePositionen(r) {
    const favs = leistungen().filter(l => l.favorit && !r.positionen.some(p => p.leistungId === l.id)).slice(0, 8);
    const ausEingang = erfassungen().filter(e => e.status === 'neu' && (!r.kundeId || e.kundeId === r.kundeId || !e.kundeId));
    const aktiv = r.positionen.filter(p => p.aktiv !== false).length;
    return `<section class="karte"><h2>Positionen<span class="leise klein rechts" id="pos-zaehler">${aktiv} von ${r.positionen.length} angehakt</span></h2>
      <div class="positionen">${r.positionen.length ? r.positionen.map(posHtml).join('') : '<div class="leer">Noch keine Positionen – unten aus dem Katalog wählen oder frei eintragen.</div>'}</div>
      ${favs.length ? `<div style="margin-top:12px"><div class="etikett" style="margin-bottom:6px">Häufig</div><div class="filter" style="flex-wrap:wrap">${favs.map(l => `<button class="chip dazu" data-act="leistungDazu" data-id="${l.id}">${esc(l.bezeichnung)}</button>`).join('')}</div></div>` : ''}
      <div class="knopfreihe" style="margin-top:12px">
        <button class="knopf zweit" data-act="katalogOeffnen">${ic('leistungen')} Aus Katalog</button>
        <button class="knopf zweit" data-act="freiePosition">${ic('stift')} Freie Position</button>
        ${ausEingang.length ? `<button class="knopf zweit" data-act="ausEingangOeffnen">${ic('eingang')} Aus Eingang (${ausEingang.length})</button>` : ''}
      </div></section>`;
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
      ${offen ? `<textarea id="p-${p.id}-besch" data-p="beschreibung" placeholder="Beschreibung (optional), z. B. was genau gemacht wurde">${esc(p.beschreibung || '')}</textarea>` : ''}
    </div>`;
  }
  function karteTexte(r, k, f) {
    const std = zahlungszielTage({ zahlungszielTage: null }, k, f);
    return `<details class="karte"><summary style="cursor:pointer"><strong>Texte und Zahlungsziel</strong> <span class="leise klein">· Einleitung, Schluss, Zahlungsziel</span></summary>
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
        ${p.hinweise.map(h => `<li class="h">${ic('haken')}<span>Wird aufgedruckt: ${esc(HINWEIS_KURZ[h.id] || h.text)}</span></li>`).join('')}
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
    return blattHtml(fest, { entwurf: true });
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

  // ── Rechnung ansehen (festgeschrieben) ──
  function ansichtRechnung(r) {
    const h = heute(), st = zahlstatus(r, h), f = r.fest, s = f.summen;
    const gezahlt = (r.zahlungen || []).reduce((a, z) => a + (Number(z.betragCent) || 0), 0);
    const storniertDurch = r.storniertDurch ? speicher.holen('rechnungen', r.storniertDurch) : null;
    let faelligText = '';
    if (st === 'ueberfaellig') faelligText = `seit ${tageZwischen(r.faellig, h)} Tagen überfällig`;
    else if (st === 'offen') { const t = tageZwischen(h, r.faellig); faelligText = t === 0 ? 'heute fällig' : `fällig in ${t} Tag${t === 1 ? '' : 'en'}`; }
    return kopf({ titel: `${r.typ === 'storno' ? 'Storno' : 'Rechnung'} ${r.nummer}`, unter: f.kunde.name, zurueckKnopf: true, rechts: abgleichChip() }) + `${vorschauBand()}
      <div class="zweispaltig" style="margin-top:12px">
        <div class="stapel">
          <section class="karte"><h2>${pille(st)}<span class="rechts betrag" style="font-size:20px">${euro(s.bruttoCent)}</span></h2>
            <div class="summen">
              <div><span>Rechnungsdatum</span><span>${datumDe(r.datum)}</span></div>
              ${r.typ !== 'storno' ? `<div><span>Fällig am</span><span>${datumDe(r.faellig)}${faelligText ? ' · ' + faelligText : ''}</span></div>` : ''}
              ${gezahlt ? `<div><span>Bezahlt</span><span>${euro(gezahlt)}</span></div>` : ''}
              ${['offen', 'ueberfaellig'].includes(st) ? `<div class="gesamt"><span>Noch offen</span><span>${euro(offenerBetrag(r))}</span></div>` : ''}
              ${storniertDurch ? `<div><span>Storniert durch</span><span>${esc(storniertDurch.nummer || 'Storno (wartet)')}</span></div>` : ''}
              ${f.original ? `<div><span>Storniert Rechnung</span><span>${esc(f.original.nummer)} vom ${datumDe(f.original.datum)}</span></div>` : ''}
            </div>
            ${(r.zahlungen || []).length ? `<div class="liste" style="margin-top:10px">${r.zahlungen.map((z, i) => `<div class="zeile" style="cursor:default"><span class="haupt">${ic('euro')} Zahlung vom ${datumDe(z.datum)}</span><span class="rechts">${euro(z.betragCent)}</span><span class="neben">${esc(z.notiz || 'Überweisung')}</span><span class="rechts"><button class="knopf leise" data-act="zahlungEntfernen" data-i="${i}">Entfernen</button></span></div>`).join('')}</div>` : ''}
          </section>
          <section class="karte"><h2>Aktionen</h2><div class="knopfreihe">
            <button class="knopf" data-act="pdfOeffnen">${ic('druck')} PDF öffnen / drucken</button>
            ${['offen', 'ueberfaellig'].includes(st) ? `<button class="knopf zweit" data-act="zahlungDialog">${ic('euro')} Zahlung erfassen</button>` : ''}
            <button class="knopf zweit" data-act="mailHinweis">${ic('mail')} Per Mail senden</button>
            ${r.typ !== 'storno' ? `<button class="knopf zweit" data-act="wieDiese">${ic('kopie')} Als neue Rechnung kopieren</button>` : ''}
            ${['offen', 'ueberfaellig', 'bezahlt'].includes(st) && r.typ !== 'storno' && !r.storniertDurch ? `<button class="knopf gefahr" data-act="stornoFragen">${ic('storno')} Stornieren</button>` : ''}
          </div></section>
          <section class="karte"><h2>${ic('schloss')} Unveränderbar abgelegt</h2>
            <div class="summen klein">
              <div><span>Festgeschrieben</span><span>${r.festgeschriebenAm ? new Date(r.festgeschriebenAm).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '–'}</span></div>
              <div><span>Archivdatei</span><span style="overflow-wrap:anywhere;text-align:right">${esc(r.pdf?.datei || (modus === 'vorschau' ? 'im Vorschau-Modus ohne PDF' : '–'))}</span></div>
              ${r.pdf?.sha256 ? `<div><span>Prüfsumme (SHA-256)</span><span class="zahl">${esc(r.pdf.sha256.slice(0, 16))}…</span></div>` : ''}
            </div>
            <p class="leise klein" style="margin:10px 0 0">Inhalt und Nummer lassen sich nicht mehr ändern (GoBD). Korrekturen gehen nur per Storno. Zahlungen werden protokolliert.</p>
          </section>
        </div>
        <div>${blattHtml(f, { entwurf: false })}</div>
      </div>`;
  }

  // ── Das Blatt (Seitenansicht der Rechnung) ──
  function blattHtml(fest, { entwurf }) {
    const f = fest.firma || {}, k = fest.kunde || {}, s = fest.summen;
    const logo = firma().logo;
    const mehrere = new Set(fest.positionen.map(p => p.satz)).size > 1;
    const epc = !entwurf && fest.typ !== 'storno' ? epcText({ name: f.kontoinhaber || f.name, iban: f.iban, bic: f.bic, betragCent: s.bruttoCent, zweck: `Rechnung ${fest.nummer}` }) : null;
    const anschrift = k.name ? anschriftZeilen(k).map(esc).join('<br>') : '<span class="b-leer">Anschrift des Kunden</span>';
    const zeilen = fest.positionen.length ? fest.positionen.map(p => `<tr><td class="b-nr">${p.pos}</td><td>${esc(p.bezeichnung) || '<span class="b-leer">Bezeichnung</span>'}${p.beschreibung ? `<small>${esc(p.beschreibung)}</small>` : ''}</td>
        <td class="r">${mengeText(p.menge)}</td><td>${esc(p.einheit)}</td><td class="r">${euro(p.preisCent)}</td>${mehrere ? `<td class="r">${fest.reverseCharge ? '–' : p.satz + ' %'}</td>` : ''}<td class="r">${euro(p.nettoCent)}</td></tr>`).join('')
      : `<tr><td></td><td colspan="${mehrere ? 6 : 5}" class="b-leer">Noch keine Positionen</td></tr>`;
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
        <table class="b-tabelle"><thead><tr><th>Pos.</th><th>Leistung</th><th class="r">Menge</th><th>Einheit</th><th class="r">Einzelpreis</th>${mehrere ? '<th class="r">USt</th>' : ''}<th class="r">Betrag</th></tr></thead><tbody>${zeilen}</tbody></table>
        <div class="b-summen">${summen}</div>
        <div class="b-unten"><div class="b-hinweise">${(fest.hinweise || []).map(h => `<span>${esc(h)}</span>`).join('')}${fest.zahlung ? `<strong>${esc(fest.zahlung)}</strong>` : ''}</div>
          ${epc ? `<div class="b-qr">${qrSvg(qrMatrix(epc))}GiroCode: mit der Banking-App scannen</div>` : ''}</div>
        ${fest.schluss ? `<p>${esc(fest.schluss)}<br>${esc(f.name || '')}</p>` : ''}
      </div>
      <footer class="b-fuss">${fussSpalten(f, ibanText).map(sp => `<div>${sp.map(esc).join('<br>')}</div>`).join('')}</footer>
    </div></div>`;
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

  // ── Kunden ──
  function ansichtKunden() {
    const f = [['alle', 'Alle'], ['privat', 'Privat'], ['firma', 'Firmen'], ['behoerde', 'Behörden']];
    return kopf({ titel: 'Kunden', rechts: `<button class="knopf" data-act="neuerKunde">${ic('plus')} Neu</button>` }) + `
      <div class="stapel">${vorschauBand()}
        <div class="filter">${f.map(([w, t]) => `<button class="chip ${Z.filterK === w ? 'an' : ''}" data-act="kundenFilter" data-wert="${w}">${t}</button>`).join('')}</div>
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-k" type="search" data-suche="K" value="${esc(Z.sucheK)}" placeholder="Name, Ort oder Kundennummer"></label>
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
        <span class="neben">${esc([k.nummer || 'neu', k.ort].filter(Boolean).join(' · '))}</span><span class="rechts"><span class="pille typ">${KUNDENTYPEN[k.typ] || ''}</span></span></button>`;
    }).join('');
  }
  function ansichtKunde() {
    const d = Z.form.daten, neu = Z.form.neu;
    const seg = (feld, werte) => `<div class="segment">${werte.map(([w, t]) => `<button type="button" class="${d[feld] === w ? 'an' : ''}" data-act="formWahl" data-feld="${feld}" data-wert="${w}">${t}</button>`).join('')}</div>`;
    const inp = (feld, label, extra = '') => `<label class="feld ${extra.includes('ganz') ? 'ganz' : ''}"><span>${label}</span><input id="k-${feld}" data-form="${feld}" value="${esc(d[feld] || '')}" ${extra.replace('ganz', '')}></label>`;
    const ihreRechnungen = neu ? [] : rechnungen().filter(r => r.kundeId === d.id).sort((a, b) => String(b._geaendert).localeCompare(String(a._geaendert)));
    return kopf({ titel: neu ? 'Neuer Kunde' : d.name || 'Kunde', unter: neu ? '' : `${d.nummer || 'Nummer folgt beim Abgleich'} · ${KUNDENTYPEN[d.typ]}`, zurueckKnopf: true }) + `
      <div class="stapel">
        <section class="karte"><h2>Art des Kunden</h2>${seg('typ', [['privat', 'Privat'], ['firma', 'Firma'], ['behoerde', 'Behörde']])}
          <p class="leise klein" style="margin:10px 0 0">${d.typ === 'privat' ? 'Privatkunden bekommen automatisch den Ausweis der Arbeitskosten (§ 35a EStG), den Aufbewahrungs- und den Verzugshinweis.' : d.typ === 'firma' ? 'Firmen: ab 2028 nur noch E-Rechnung (ZUGFeRD/XRechnung) – die Daten dafür sammelt die App schon jetzt.' : 'Behörden verlangen eine XRechnung mit Leitweg-ID.'}</p></section>
        <section class="karte"><h2>Name und Anschrift</h2><div class="felder">
          ${d.typ === 'privat' ? `<div class="feld ganz"><span>Anrede</span>${seg('anrede', [['Herr', 'Herr'], ['Frau', 'Frau'], ['', 'Familie / ohne']])}</div>` : ''}
          ${inp('name', d.typ === 'privat' ? 'Name (z. B. Hans Huber oder Familie Schneider)' : d.typ === 'firma' ? 'Firmenname' : 'Behörde / Dienststelle', 'ganz')}
          ${inp('zusatz', 'Zusatz (z. B. z. Hd. Frau Maier, Abteilung)', 'ganz')}
          ${inp('strasse', 'Straße und Hausnummer', 'ganz')}
          ${inp('plz', 'PLZ', 'inputmode="numeric"')}${inp('ort', 'Ort')}
        </div></section>
        <section class="karte"><h2>Kontakt und Versand</h2><div class="felder">
          ${inp('mail', 'E-Mail', 'type="email"')}${inp('telefon', 'Telefon', 'type="tel"')}
          <div class="feld ganz"><span>Rechnung kommt per</span>${seg('versand', [['mail', 'E-Mail (PDF)'], ['post', 'Post']])}</div>
          ${d.versand === 'mail' ? `<label class="schalter ganz"><input type="checkbox" id="k-zust" data-form-schalter="zustimmungMail" ${d.zustimmungMail ? 'checked' : ''}><span>Kunde ist mit Rechnungen per E-Mail einverstanden${d.zustimmungMail ? ` (vermerkt am ${datumDe(d.zustimmungMail)})` : ''}<br><small class="leise">Pflicht für PDF-Rechnungen per Mail – formlos genügt (mündlich, per Mail, im Auftrag).</small></span></label>` : ''}
        </div></section>
        ${d.typ !== 'privat' ? `<section class="karte"><h2>Steuer und E-Rechnung</h2><div class="felder">
          ${d.typ === 'firma' ? inp('ustId', 'USt-IdNr. des Kunden (optional)', 'placeholder="DE123456789"') : ''}
          ${d.typ === 'behoerde' ? inp('leitwegId', 'Leitweg-ID', 'placeholder="z. B. 09162000-12345-06"') : ''}
          ${d.typ === 'firma' ? `<label class="schalter ganz"><input type="checkbox" id="k-13b" data-form-schalter="bauleistender13b" ${d.bauleistender13b ? 'checked' : ''}><span>Kunde erbringt selbst Bauleistungen (§ 13b UStG)<br><small class="leise">Z. B. Bauträger oder Generalunternehmer mit Freistellungsnachweis (USt 1 TG). Dann schuldet der Kunde die Umsatzsteuer – die Rechnung geht ohne USt raus.</small></span></label>` : ''}
          ${d.ustId && !ustIdGueltig(d.ustId) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die USt-IdNr. hat nicht das Format DE + 9 Ziffern.</span></div>' : ''}
        </div></section>` : ''}
        <section class="karte"><h2>Zahlung und wiederkehrende Positionen</h2><div class="felder">
          <label class="feld"><span>Zahlungsziel in Tagen (leer = Standard)</span><input id="k-ziel" data-form="zahlungszielTage" inputmode="numeric" value="${d.zahlungszielTage ?? ''}"></label>
        </div>
          <p class="leise klein">Wiederkehrende Positionen sind bei jeder neuen Rechnung für diesen Kunden schon angehakt.</p>
          <div class="liste">${(d.standard || []).map((s, i) => { const l = leistung(s.leistungId); return l ? `<div class="zeile" style="cursor:default"><span class="haupt">${esc(l.bezeichnung)}</span>
            <span class="rechts"><button class="loeschen" data-act="standardEntfernen" data-i="${i}" aria-label="Entfernen">${ic('muell')}</button></span>
            <span class="neben"><input id="k-std-${i}" data-std="${i}" inputmode="decimal" value="${mengeText(s.menge)}" style="width:80px;min-height:34px;padding:5px 8px"> ${esc(l.einheit)} · ${euro(l.preisCent)}</span><span></span></div>` : ''; }).join('') || '<div class="leer">Keine wiederkehrenden Positionen.</div>'}</div>
          <button class="knopf zweit" data-act="katalogOeffnen" data-ziel="standard" style="margin-top:10px">${ic('plus')} Position hinzufügen</button>
        </section>
        <section class="karte"><h2>Notiz</h2><textarea id="k-notiz" data-form="notiz" placeholder="z. B. Schlüssel beim Nachbarn, Hund im Garten">${esc(d.notiz || '')}</textarea></section>
        <div class="leiste-unten"><button class="knopf zweit" data-act="zurueck">Abbrechen</button><button class="knopf" data-act="kundeSpeichern">${ic('haken')} Speichern</button></div>
        ${neu ? '' : `<section class="karte"><h2>Rechnungen<button class="knopf leise rechts" data-act="neueRechnungFuer" data-id="${d.id}">${ic('plus')} Neue Rechnung</button></h2>
          <div class="liste">${ihreRechnungen.length ? ihreRechnungen.map(rechnungZeile).join('') : '<div class="leer">Noch keine Rechnungen.</div>'}</div>
          ${!ihreRechnungen.length ? `<button class="knopf leise" data-act="kundeLoeschenFragen" style="margin-top:8px">${ic('muell')} Kunde löschen</button>` : ''}</section>`}
      </div>`;
  }

  // ── Leistungen (Katalog) ──
  function ansichtLeistungen() {
    return kopf({ titel: 'Leistungen', unter: 'Dein Katalog – wächst mit jeder Rechnung', rechts: `<button class="knopf" data-act="neueLeistung">${ic('plus')} Neu</button>` }) + `
      <div class="stapel">${vorschauBand()}
        <label class="suche"><span class="versteckt">Suchen</span>${ic('suche')}<input id="suche-l" type="search" data-suche="L" value="${esc(Z.sucheL)}" placeholder="Leistung suchen"></label>
        <div id="liste-l" class="stapel">${leistungenListeHtml()}</div>
      </div>`;
  }
  function leistungenListeHtml(auswahl = null) {
    const q = (auswahl ? Z.dialog?.suche || '' : Z.sucheL).trim().toLowerCase();
    const l = leistungen().filter(x => !q || [x.bezeichnung, x.suchwoerter, x.beschreibung].join(' ').toLowerCase().includes(q));
    if (!l.length) return '<div class="leer">Keine Leistungen gefunden.</div>';
    const gruppen = Object.keys(ARTEN).map(a => [a, l.filter(x => (x.art || 'sonstiges') === a)]).filter(([, g]) => g.length);
    const zeile = x => `<button class="zeile" data-act="${auswahl ? 'katalogWahl' : 'leistungOeffnen'}" data-id="${x.id}"><span class="haupt">${x.favorit ? '<span style="color:var(--gold)">★</span> ' : ''}${esc(x.bezeichnung)}</span>
      <span class="rechts">${euro(x.preisCent)}</span><span class="neben">${esc(x.einheit)} · ${x.steuersatz ?? 19} % USt${x.beschreibung ? ' · ' + esc(x.beschreibung) : ''}</span><span class="rechts leise klein">netto</span></button>`;
    return gruppen.map(([a, g]) => auswahl ? `<div class="etikett" style="margin:10px 0 0">${ARTEN[a]}</div>${g.map(zeile).join('')}`
      : `<section class="karte"><h2>${ARTEN[a]}<span class="leise klein rechts">${g.length}</span></h2><div class="liste">${g.map(zeile).join('')}</div></section>`).join('');
  }
  function ansichtLeistung() {
    const d = Z.form.daten, neu = Z.form.neu;
    const opt = (liste, wert) => liste.map(([w, t]) => `<option value="${esc(w)}" ${String(w) === String(wert) ? 'selected' : ''}>${esc(t)}</option>`).join('');
    const brutto = d.preisCent == null ? '' : euro(Math.round(d.preisCent * (1 + (Number(d.steuersatz ?? 19)) / 100)));
    return kopf({ titel: neu ? 'Neue Leistung' : d.bezeichnung || 'Leistung', zurueckKnopf: true }) + `
      <div class="stapel"><section class="karte"><div class="felder">
        <label class="feld ganz"><span>Bezeichnung (so steht es auf der Rechnung)</span><input id="l-bez" data-form="bezeichnung" value="${esc(d.bezeichnung)}" placeholder="z. B. Arbeitszeit Geselle"></label>
        <label class="feld ganz"><span>Beschreibung (optional)</span><textarea id="l-besch" data-form="beschreibung">${esc(d.beschreibung || '')}</textarea></label>
        <label class="feld"><span>Einheit</span><select id="l-einheit" data-form="einheit">${opt(EINHEITEN.map(e => [e.k, e.k]), d.einheit)}</select></label>
        <label class="feld"><span>Art (für § 35a)</span><select id="l-art" data-form="art">${opt(Object.entries(ARTEN), d.art)}</select></label>
        <label class="feld"><span>Preis netto €</span><input id="l-preis" data-form="preis" inputmode="decimal" value="${esc(centText(d.preisCent))}"></label>
        <label class="feld"><span>Umsatzsteuer</span><select id="l-satz" data-form="steuersatz">${opt(STEUERSAETZE.map(s => [s, s + ' %']), d.steuersatz ?? 19)}</select></label>
        <div class="feld ganz leise klein" id="l-brutto">${brutto ? 'Brutto: ' + brutto : ''}</div>
        <label class="feld ganz"><span>Suchwörter für Diktat und Texterkennung (optional)</span><input id="l-such" data-form="suchwoerter" value="${esc(d.suchwoerter || '')}" placeholder="z. B. monteur stunde arbeitszeit"></label>
        <label class="schalter ganz"><input type="checkbox" id="l-fav" data-form-schalter="favorit" ${d.favorit ? 'checked' : ''}><span>Häufig gebraucht (erscheint im Rechnungseditor als Schnellauswahl)</span></label>
      </div></section>
      <div class="leiste-unten"><button class="knopf zweit" data-act="zurueck">Abbrechen</button><button class="knopf" data-act="leistungSpeichern">${ic('haken')} Speichern</button></div>
      ${neu ? '' : `<button class="knopf leise" data-act="leistungAusblenden">${ic('muell')} Aus dem Katalog nehmen</button>`}</div>`;
  }

  // ── Erfassen & Eingang ──
  function neueErfassung() { return { id: neueId('e'), text: '', kundeId: '', kundeAuto: true, datum: heute(), dateien: [] }; }
  const bildUrls = new Map();
  function bildUrl(id) {
    if (bildUrls.has(id)) return bildUrls.get(id);
    const d = speicher.dateiHolen(id);
    const url = d?.blob ? URL.createObjectURL(d.blob) : transport.dateiUrl?.(id) || '';
    if (url) bildUrls.set(id, url);
    return url;
  }
  function ansichtErfassen() {
    const e = Z.erfassung;
    const eingang = erfassungen().filter(x => x.status === 'neu' || x.status === 'zugeordnet').sort((a, b) => String(b.angelegt).localeCompare(String(a.angelegt)));
    return kopf({ titel: 'Erfassen', unter: 'Foto, Notiz oder Diktat – landet im Eingang am Laptop', rechts: abgleichChip() }) + `
      <div class="stapel">${vorschauBand()}
        <div class="erfassen-knoepfe">
          <label class="erfassen-knopf">${ic('kamera')}<span>Foto aufnehmen</span><small>Beleg, Schaden, Arbeitsnachweis</small>
            <input id="e-foto" type="file" accept="image/*" capture="environment" multiple data-act-change="fotoGewaehlt"></label>
          <button class="erfassen-knopf" data-act="notizFokus">${ic('mikro')}<span>Notiz / Diktat</span><small>Mikrofon-Taste der iPhone-Tastatur</small></button>
        </div>
        <section class="karte"><h2>${ic('notiz')} Was wurde gemacht?</h2><div class="felder">
          <label class="feld ganz"><span>Notiz</span><textarea id="erf-text" data-erf="text" placeholder="z. B. Bei Schneider 2,5 Std. Silikonfuge erneuert, 4 Meter, Anfahrt, 2 Eckventile getauscht">${esc(e.text)}</textarea>
            <small>Tipp: Auf dem iPhone die Mikrofon-Taste der Tastatur antippen und einfach sprechen.</small></label>
          <label class="feld"><span>Kunde</span><select id="erf-kunde" data-erf="kundeId"><option value="">– später zuordnen –</option>${kunden().map(k => `<option value="${k.id}" ${e.kundeId === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
          <label class="feld"><span>Datum</span><input type="date" id="erf-datum" data-erf="datum" value="${esc(e.datum)}"></label>
          ${e.dateien.length ? `<div class="fotos ganz">${e.dateien.map(id => `<div class="foto"><img src="${esc(bildUrl(id))}" alt="Foto"><button class="loeschen" data-act="fotoEntfernen" data-id="${id}" aria-label="Foto entfernen">${ic('muell')}</button></div>`).join('')}</div>` : ''}
        </div>
          <div id="erkannt" style="margin-top:12px">${erkanntHtml(e.text)}</div>
          <div class="knopfreihe" style="margin-top:12px"><button class="knopf voll" data-act="erfassungSpeichern" ${e.text.trim() || e.dateien.length ? '' : 'disabled'} id="erf-speichern">${ic('haken')} In den Eingang legen</button></div>
        </section>
        <section class="karte"><h2>${ic('eingang')} Eingang<span class="leise klein rechts">${eingang.length}</span></h2>
          ${eingang.length ? eingang.map(eingangKarte).join('') : '<div class="leer">Der Eingang ist leer. Alles, was du am Handy erfasst, erscheint hier – auch am Laptop.</div>'}</section>
      </div>`;
  }
  function erkanntHtml(text) {
    if (!String(text || '').trim()) return '';
    const v = vorschlaegeAus(text, leistungen(), kunden());
    if (!v.kunde && !v.positionen.length) return `<div class="box">${ic('suche')}<span>Noch nichts aus dem Katalog erkannt. Leistungen mit passenden Suchwörtern werden automatisch gefunden.</span></div>`;
    return `<div class="box gold">${ic('okkreis')}<div class="erkannt"><strong>Erkannt (Vorschlag)</strong>
      ${v.kunde ? `<span>Kunde: ${esc(v.kunde.name)}</span>` : ''}
      ${v.positionen.length ? `<div class="filter" style="flex-wrap:wrap">${v.positionen.map(p => `<span class="chip mini">${mengeText(p.menge)} ${esc(p.einheit)} · ${esc(p.bezeichnung)}</span>`).join('')}</div>` : ''}
      <small class="leise">Wird erst übernommen, wenn du die Erfassung in eine Rechnung holst.</small></div></div>`;
  }
  function eingangKarte(e) {
    const k = kunde(e.kundeId), v = vorschlaegeAus(e.text, leistungen(), kunden());
    const r = e.rechnungId ? speicher.holen('rechnungen', e.rechnungId) : null;
    return `<div class="eingang-karte">${e.dateien?.length ? `<div class="foto"><img src="${esc(bildUrl(e.dateien[0]))}" alt="Foto"></div>` : `<div class="notiz-symbol">${ic('notiz')}</div>`}
      <div style="min-width:0"><div class="leise klein">${datumDe(e.datum)} · ${esc(k?.name || (v.kunde ? v.kunde.name + ' (erkannt)' : 'ohne Kunde'))}${e.geraetName ? ' · von ' + esc(e.geraetName) : ''}${e.dateien?.length > 1 ? ' · ' + e.dateien.length + ' Fotos' : ''}</div>
        <p>${esc(e.text || 'Foto ohne Notiz')}</p>
        ${v.positionen.length ? `<div class="filter" style="flex-wrap:wrap;margin-bottom:8px">${v.positionen.map(p => `<span class="chip mini">${mengeText(p.menge)} ${esc(p.einheit)} · ${esc(p.bezeichnung)}</span>`).join('')}</div>` : ''}
        <div class="knopfreihe">${e.status === 'zugeordnet' && r ? `<button class="knopf zweit" data-act="oeffneRechnung" data-id="${r.id}">${ic('rechnung')} Zur Rechnung</button>`
          : `<button class="knopf" data-act="erfassungUebernehmen" data-id="${e.id}">${ic('rechnung')} In Rechnung übernehmen</button>`}
          <button class="knopf leise" data-act="erfassungErledigt" data-id="${e.id}">Erledigt</button></div></div></div>`;
  }

  // ── Einstellungen ──
  function ansichtEinstellungen() {
    const d = Z.form.daten;
    const inp = (feld, label, extra = '') => `<label class="feld ${extra.includes('ganz') ? 'ganz' : ''}"><span>${label}</span><input id="f-${feld}" data-form="${feld}" value="${esc(d[feld] ?? '')}" ${extra.replace('ganz', '')}></label>`;
    const seg = (feld, werte) => `<div class="segment">${werte.map(([w, t]) => `<button type="button" class="${d[feld] === w ? 'an' : ''}" data-act="formWahl" data-feld="${feld}" data-wert="${w}">${t}</button>`).join('')}</div>`;
    const formatOk = nummernformatGueltig(d.nummernFormat || STANDARD_NUMMERNFORMAT);
    const jahr = new Date().getFullYear();
    const design = document.documentElement.dataset.design === 'hell' ? 'hell' : 'dunkel';
    return kopf({ titel: 'Einstellungen', zurueckKnopf: Z.verlauf.length > 0, rechts: abgleichChip() }) + `
      <div class="stapel">${vorschauBand()}
        <section class="karte"><h2>Mein Unternehmen</h2><p class="leise klein" style="margin:0 0 12px">Diese Angaben stehen auf jeder Rechnung (Briefkopf und Fußzeile).</p><div class="felder">
          ${inp('name', 'Firmenname', 'ganz')}${inp('zusatz', 'Zusatz unter dem Namen (z. B. Meisterbetrieb für Sanitär und Heizung)', 'ganz')}
          ${inp('inhaber', 'Inhaber / Geschäftsführer', 'ganz')}${inp('strasse', 'Straße und Hausnummer', 'ganz')}${inp('plz', 'PLZ', 'inputmode="numeric"')}${inp('ort', 'Ort')}
          ${inp('telefon', 'Telefon', 'type="tel"')}${inp('mail', 'E-Mail', 'type="email"')}${inp('web', 'Website', 'ganz')}
          <div class="feld ganz"><span>Logo (PNG oder JPG, erscheint oben rechts)</span><div class="knopfreihe">${d.logo ? `<img src="${esc(d.logo)}" alt="Logo" style="max-height:48px;max-width:160px;background:#fff;padding:4px;border-radius:6px">` : ''}
            <label class="knopf zweit" style="position:relative">${ic('plus')} ${d.logo ? 'Anderes Logo' : 'Logo wählen'}<input type="file" accept="image/png,image/jpeg" data-act-change="logoGewaehlt" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
            ${d.logo ? '<button type="button" class="knopf leise" data-act="logoEntfernen">Entfernen</button>' : ''}</div></div>
        </div></section>
        <section class="karte"><h2>Steuer und Bank</h2><div class="felder">
          ${inp('steuernummer', 'Steuernummer (vom Finanzamt)', 'placeholder="z. B. 143/123/45678"')}${inp('ustId', 'USt-IdNr.', 'placeholder="DE123456789"')}
          ${d.ustId && !ustIdGueltig(d.ustId) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die USt-IdNr. hat nicht das Format DE + 9 Ziffern.</span></div>' : ''}
          ${inp('iban', 'IBAN', 'ganz')}${d.iban && !ibanGueltig(d.iban) ? '<div class="box ocker ganz">' + ic('warn') + '<span>Die IBAN ist nicht gültig (Prüfziffer).</span></div>' : ''}
          ${inp('bic', 'BIC')}${inp('bank', 'Bank')}
          ${inp('fusszeile', 'Weitere Pflichtangaben in der Fußzeile (z. B. Registergericht, HRB, Geschäftsführer)', 'ganz')}
          <div class="feld ganz"><span>Umsatzsteuer wird versteuert nach</span>${seg('versteuerung', [['soll', 'vereinbarten Entgelten (Soll)'], ['ist', 'vereinnahmten Entgelten (Ist)']])}
            <small>Steht in deinem Steuerbescheid bzw. weiß dein Steuerberater. Bei Ist-Versteuerung kommt ab 2028 ein Pflichthinweis auf jede Rechnung – die App setzt ihn automatisch.</small></div>
          <label class="schalter ganz"><input type="checkbox" id="f-800" data-form-schalter="umsatzUeber800k" ${d.umsatzUeber800k ? 'checked' : ''}><span>Gesamtumsatz im Vorjahr über 800.000 €<br><small class="leise">Dann gilt die E-Rechnungspflicht für Firmenkunden schon ab 1.1.2027 (sonst ab 1.1.2028).</small></span></label>
        </div></section>
        <section class="karte"><h2>Rechnungen</h2><div class="felder">
          <label class="feld"><span>Nummernformat</span><input id="f-format" data-form="nummernFormat" value="${esc(d.nummernFormat || STANDARD_NUMMERNFORMAT)}" class="${formatOk ? '' : 'fehlt'}"><small>{JJJJ} = Jahr, {NNNN} = laufende Nummer. Beispiel: ${formatOk ? esc(rechnungsnummer(d.nummernFormat, jahr, 42)) : 'Format braucht {NNNN}'}</small></label>
          <label class="feld"><span>Zahlungsziel (Tage)</span><input id="f-ziel" data-form="zahlungszielTage" inputmode="numeric" value="${esc(d.zahlungszielTage ?? 14)}"></label>
          <label class="feld ganz"><span>Einleitung (Standard)</span><textarea id="f-einl" data-form="einleitung">${esc(d.einleitung || '')}</textarea></label>
          <label class="feld ganz"><span>Schluss (Standard)</span><textarea id="f-schluss" data-form="schluss" style="min-height:48px">${esc(d.schluss || '')}</textarea></label>
        </div></section>
        <div class="leiste-unten"><button class="knopf" data-act="firmaSpeichern">${ic('haken')} Einstellungen speichern</button></div>
        <section class="karte"><h2>${ic('abgleich')} Abgleich Handy ↔ Laptop</h2>${abgleichInfoHtml()}</section>
        <section class="karte" id="serverstatus">${serverStatusHtml()}</section>
        <section class="karte"><h2>Darstellung</h2><div class="segment"><button class="${design === 'dunkel' ? 'an' : ''}" data-act="design" data-wert="dunkel">Nacht & Gold</button><button class="${design === 'hell' ? 'an' : ''}" data-act="design" data-wert="hell">Hell</button></div></section>
        ${modus === 'vorschau' ? `<section class="karte"><h2>Vorschau</h2><p class="leise klein" style="margin:0 0 10px">Setzt alle Beispieldaten auf diesem Gerät zurück.</p><button class="knopf gefahr" data-act="vorschauZuruecksetzen">Beispieldaten zurücksetzen</button></section>` : ''}
      </div>`;
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
      ${modus === 'vorschau' ? `<button class="knopf zweit" data-act="vorschauVerbindung">${ic('laptop')} Laptop ${vorschau?.verbunden ? 'trennen' : 'verbinden'} (Test)</button>` : ''}</div>
    <p class="leise klein" style="margin:10px 0 0">${modus === 'vorschau' ? 'Teste den Offline-Fall: Laptop trennen, etwas erfassen oder ändern, dann wieder verbinden – die Änderungen wandern automatisch hinüber.'
      : 'Alles wird auf dem Laptop gespeichert. Das Handy hat eine eigene Kopie, arbeitet auch ohne Verbindung und gleicht sich ab, sobald der Laptop erreichbar ist.'}</p>`;
  }
  function serverStatusHtml() {
    if (modus === 'vorschau') return `<h2>${ic('laptop')} Ablage</h2><p class="leise klein" style="margin:0">In der echten App liegt alles in einem Ordner auf dem Laptop: Datenbank, Rechnungs-PDFs, Fotos und tägliche Sicherungen.</p>`;
    const s = Z.serverStatus;
    if (!s) return `<h2>${ic('laptop')} Ablage auf dem Laptop</h2><p class="leise klein" style="margin:0">Laptop nicht erreichbar – Angaben folgen beim nächsten Abgleich.</p>`;
    return `<h2>${ic('laptop')} Ablage auf dem Laptop</h2><div class="summen klein">
      <div><span>Ordner</span><span style="overflow-wrap:anywhere;text-align:right">${esc(s.ordner)}</span></div>
      <div><span>Rechnungen · Kunden · Leistungen</span><span>${s.anzahl.rechnungen || 0} · ${s.anzahl.kunden || 0} · ${s.anzahl.leistungen || 0}</span></div>
      <div><span>Änderungsprotokoll</span><span>${s.protokoll.ok ? 'intakt (' + s.protokoll.eintraege + ' Einträge)' : 'BESCHÄDIGT ab Eintrag ' + s.protokoll.nr}</span></div>
      <div><span>Letzte Sicherung</span><span>${esc((s.sicherungen || []).slice(-1)[0] || '–')}</span></div>
      <div><span>Version</span><span>${esc(s.version)}</span></div></div>`;
  }

  // ── Dialoge ──
  function dialogHtml() { return Z.dialog ? `<div class="blende" data-blende><div class="dialog" role="dialog" aria-modal="true">${dialogInhalt()}</div></div>` : ''; }
  function dialogInhalt() {
    const d = Z.dialog;
    const zu = `<button class="knopf zweit" data-act="dialogZu">Abbrechen</button>`;
    switch (d.art) {
      case 'kundeWaehlen': return `<h2>Kunde wählen</h2>
        <label class="suche">${ic('suche')}<input id="d-suche" type="search" data-dsuche value="${esc(d.suche || '')}" placeholder="Name oder Ort"></label>
        <div class="waehlliste liste" id="d-liste">${kundenWahlHtml()}</div>
        <div class="knopfreihe"><button class="knopf zweit" data-act="neuerKundeAusEditor">${ic('plus')} Neuer Kunde</button>${zu}</div>`;
      case 'katalog': return `<h2>Aus dem Katalog</h2>
        <label class="suche">${ic('suche')}<input id="d-suche" type="search" data-dsuche value="${esc(d.suche || '')}" placeholder="Leistung suchen"></label>
        <div class="waehlliste" id="d-liste">${leistungenListeHtml(true)}</div><div class="knopfreihe">${zu}</div>`;
      case 'ausEingang': {
        const l = erfassungen().filter(e => e.status === 'neu' && (!Z.entwurf?.kundeId || e.kundeId === Z.entwurf.kundeId || !e.kundeId));
        return `<h2>Aus dem Eingang übernehmen</h2><div class="waehlliste">${l.map(e => `<div class="eingang-karte">${e.dateien?.length ? `<div class="foto"><img src="${esc(bildUrl(e.dateien[0]))}" alt=""></div>` : `<div class="notiz-symbol">${ic('notiz')}</div>`}
          <div><div class="leise klein">${datumDe(e.datum)}</div><p>${esc(e.text || 'Foto')}</p><button class="knopf" data-act="eingangInEntwurf" data-id="${e.id}">${ic('plus')} Übernehmen</button></div></div>`).join('')}</div><div class="knopfreihe">${zu}</div>`;
      }
      case 'festschreiben': {
        const r = Z.entwurf, k = kunde(r.kundeId), s = entwurfSummen(r);
        return `<h2>Rechnung festschreiben?</h2>
          <div class="summen"><div><span>Kunde</span><span>${esc(k?.name || '')}</span></div><div><span>Positionen</span><span>${r.positionen.filter(p => p.aktiv !== false).length}</span></div><div class="gesamt"><span>Rechnungsbetrag</span><span>${euro(s.bruttoCent)}</span></div></div>
          <div class="box gold">${ic('schloss')}<span>Der Laptop prüft die Rechnung, vergibt die nächste Rechnungsnummer und legt das PDF unveränderbar ab. Danach sind nur noch Zahlungen und ein Storno möglich.</span></div>
          <div class="knopfreihe">${zu}<button class="knopf" data-act="festschreiben">${ic('schloss')} Festschreiben</button></div>`;
      }
      case 'storno': return `<h2>Rechnung stornieren?</h2>
        <div class="box rot">${ic('storno')}<span>Es entsteht eine Stornorechnung mit eigener Nummer und negativen Beträgen, die diese Rechnung vollständig aufhebt. Die Original-Rechnung bleibt unverändert im Archiv (GoBD).</span></div>
        <div class="knopfreihe">${zu}<button class="knopf gefahr" data-act="stornieren">${ic('storno')} Stornorechnung erstellen</button></div>`;
      case 'zahlung': {
        const r = speicher.holen('rechnungen', Z.id);
        return `<h2>Zahlung erfassen</h2><div class="felder">
          <label class="feld"><span>Eingegangen am</span><input type="date" id="z-datum" value="${heute()}"></label>
          <label class="feld"><span>Betrag €</span><input id="z-betrag" inputmode="decimal" value="${esc(centText(offenerBetrag(r)))}"></label>
          <label class="feld ganz"><span>Notiz (optional)</span><input id="z-notiz" placeholder="z. B. Überweisung, bar, Skonto"></label></div>
          <div class="knopfreihe">${zu}<button class="knopf" data-act="zahlungSpeichern">${ic('haken')} Speichern</button></div>`;
      }
      case 'loeschen': return `<h2>${esc(d.titel)}</h2><p class="leise">${esc(d.text)}</p><div class="knopfreihe">${zu}<button class="knopf gefahr" data-act="${d.aktion}">${ic('muell')} Löschen</button></div>`;
      case 'abgleich': return `<h2>Abgleich mit dem Laptop</h2>${abgleichInfoHtml()}<div class="knopfreihe"><button class="knopf zweit" data-act="dialogZu">Schließen</button></div>`;
      case 'info': return `<h2>${esc(d.titel)}</h2><p>${d.html}</p><div class="knopfreihe"><button class="knopf" data-act="dialogZu">Verstanden</button></div>`;
      case 'anmelden': return `<h2>Anmelden</h2><p class="leise">Der Laptop ist mit einer PIN geschützt.</p>
        <label class="feld"><span>PIN</span><input id="pin" type="password" inputmode="numeric" autocomplete="current-password"></label>
        <div class="knopfreihe"><button class="knopf" data-act="anmelden">Anmelden</button></div>`;
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
    toastTimer = setTimeout(() => { Z.toast = null; wurzel.querySelector('.toast')?.remove(); }, 3600);
  }

  // ── Aktionen ──
  const H = {
    tab: el => tab(el.dataset.ansicht),
    zurueck: () => zurueck(),
    rechnungenFilter: el => { Z.filterR = el.dataset.wert; if (Z.ansicht !== 'rechnungen') tab('rechnungen'); else render(); },
    kundenFilter: el => { Z.filterK = el.dataset.wert; render(); },
    oeffneRechnung: el => gehe('rechnung', el.dataset.id),
    neueRechnung: () => neueRechnung(),
    neueRechnungFuer: el => neueRechnung(el.dataset.id),
    neuerKunde: () => gehe('kunde', null),
    kundeOeffnen: el => gehe('kunde', el.dataset.id),
    kundeBearbeiten: el => gehe('kunde', el.dataset.id),
    neueLeistung: () => gehe('leistung', null),
    leistungOeffnen: el => gehe('leistung', el.dataset.id),
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
      if (leer) standardDazu(r, k);
      Z.dialog = null; entwurfSofortSpeichern(); render();
    },
    neuerKundeAusEditor: () => { Z.dialog = null; Z.entwurfNeu = false; gehe('kunde', null); Z.form.zurueckZuEntwurf = Z.verlauf[Z.verlauf.length - 1]?.[1]; },
    standardUebernehmen: () => { standardDazu(Z.entwurf, kunde(Z.entwurf.kundeId)); entwurfSofortSpeichern(); render(); },
    leistungDazu: el => { Z.entwurf.positionen.push(posAusLeistung(leistung(el.dataset.id))); entwurfSofortSpeichern(); render(); },
    katalogOeffnen: el => { Z.dialog = { art: 'katalog', suche: '', ziel: el.dataset.ziel || 'entwurf' }; render(); },
    katalogWahl: el => {
      const l = leistung(el.dataset.id);
      if (Z.dialog.ziel === 'standard') { Z.form.daten.standard = [...(Z.form.daten.standard || []), { leistungId: l.id, menge: 1 }]; }
      else { Z.entwurf.positionen.push(posAusLeistung(l)); entwurfSofortSpeichern(); }
      Z.dialog = null; render(); zeigeToast(`„${l.bezeichnung}" hinzugefügt`);
    },
    freiePosition: () => { const p = { id: neueId('p'), leistungId: null, bezeichnung: '', beschreibung: '', menge: 1, einheit: 'Std.', preisCent: null, steuersatz: 19, art: 'arbeit', aktiv: true }; Z.entwurf.positionen.push(p); render(); document.getElementById(`p-${p.id}-bez`)?.focus(); },
    posLoeschen: el => { Z.entwurf.positionen = Z.entwurf.positionen.filter(p => p.id !== el.dataset.id); entwurfSofortSpeichern(); render(); },
    beschreibungZeigen: el => { Z.beschreibungOffen.add(el.dataset.id); render(); document.getElementById(`p-${el.dataset.id}-besch`)?.focus(); },
    posInKatalog: el => {
      const p = Z.entwurf.positionen.find(x => x.id === el.dataset.id);
      const l = { id: neueId('l'), bezeichnung: p.bezeichnung.trim(), beschreibung: p.beschreibung || '', einheit: p.einheit, preisCent: p.preisCent, steuersatz: p.steuersatz ?? 19, art: p.art || 'sonstiges', favorit: false, suchwoerter: '', aktiv: true };
      speicher.aendern('leistungen', l); p.leistungId = l.id; entwurfSofortSpeichern(); render(); zeigeToast('In den Leistungskatalog übernommen');
    },
    ausEingangOeffnen: () => { Z.dialog = { art: 'ausEingang' }; render(); },
    eingangInEntwurf: el => { erfassungInEntwurf(speicher.holen('erfassungen', el.dataset.id), Z.entwurf); Z.dialog = null; entwurfSofortSpeichern(); render(); },
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
    entwurfLoeschenFragen: () => { Z.dialog = { art: 'loeschen', titel: 'Entwurf löschen?', text: 'Der Entwurf hat noch keine Nummer und kann gelöscht werden.', aktion: 'entwurfLoeschen' }; render(); },
    entwurfLoeschen: () => {
      const r = Z.entwurf;
      for (const id of r.erfassungen || []) { const e = speicher.holen('erfassungen', id); if (e && e.status === 'zugeordnet') speicher.aendern('erfassungen', { ...stripMeta(e), status: 'neu', rechnungId: null }); }
      if (speicher.holen('rechnungen', r.id)) speicher.loeschen('rechnungen', r.id);
      Z.entwurf = null; Z.dialog = null; zurueck(); zeigeToast('Entwurf gelöscht');
    },

    // Festgeschriebene Rechnung
    pdfOeffnen: () => {
      const r = speicher.holen('rechnungen', Z.id);
      if (modus === 'vorschau' || !transport.pdfUrl) { Z.dialog = { art: 'info', titel: 'PDF in der echten App', html: 'Das PDF erzeugt der Laptop beim Festschreiben und legt es schreibgeschützt im Archiv-Ordner ab. Dort öffnest du es zum Drucken oder Weiterleiten. In dieser Vorschau gibt es keinen echten Laptop – deshalb siehst du die Rechnung hier als Seitenansicht.' }; render(); return; }
      window.open(transport.pdfUrl(r.id), '_blank', 'noopener');
    },
    mailHinweis: () => { Z.dialog = { art: 'info', titel: 'Versand per E-Mail', html: 'Der Versand direkt aus der App über dein Mail-Postfach kommt in einem der nächsten Schritte – mit Mailvorlage, Kopie an dich und Versandprotokoll. Bis dahin: PDF öffnen und über das Teilen-Menü oder dein Mailprogramm verschicken.' }; render(); },
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
      neueRechnung(r.kundeId, { positionen: (r.positionen || []).filter(p => p.aktiv !== false).map(p => ({ ...p, id: neueId('p') })), betreff: r.betreff || '', amGrundstueck: r.amGrundstueck });
    },
    stornoFragen: () => { Z.dialog = { art: 'storno' }; render(); },
    stornieren: async () => {
      const r = speicher.holen('rechnungen', Z.id);
      const s = { id: neueId('r'), typ: 'storno', status: 'entwurf', stornoVon: r.id, kundeId: r.kundeId, leistungVon: r.fest.leistungVon, leistungBis: r.fest.leistungBis,
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
      if (ziel) { zurueck(); if (Z.entwurf && Z.entwurf.id === ziel) { Z.entwurf.kundeId = gespeichert.id; if (!Z.entwurf.positionen.length) standardDazu(Z.entwurf, gespeichert); entwurfSofortSpeichern(); render(); } }
      else { zurueck(); }
      zeigeToast('Kunde gespeichert');
    },
    kundeLoeschenFragen: () => { Z.dialog = { art: 'loeschen', titel: 'Kunde löschen?', text: 'Der Kunde hat noch keine Rechnungen und kann gelöscht werden.', aktion: 'kundeLoeschen' }; render(); },
    kundeLoeschen: () => { speicher.loeschen('kunden', Z.form.daten.id); Z.dialog = null; Z.form = null; zurueck(); zeigeToast('Kunde gelöscht'); },

    // Leistungen
    leistungSpeichern: () => {
      const d = Z.form.daten;
      if (!String(d.bezeichnung || '').trim()) { zeigeToast('Bitte eine Bezeichnung eintragen'); return; }
      if (d.preisCent == null) { zeigeToast('Bitte einen Preis eintragen'); return; }
      speicher.aendern('leistungen', stripMeta(d)); Z.form = null; zurueck(); zeigeToast('Leistung gespeichert');
    },
    leistungAusblenden: () => { speicher.aendern('leistungen', { ...stripMeta(Z.form.daten), aktiv: false }); Z.form = null; zurueck(); zeigeToast('Aus dem Katalog genommen'); },

    // Erfassen
    notizFokus: () => document.getElementById('erf-text')?.focus(),
    fotoEntfernen: el => { Z.erfassung.dateien = Z.erfassung.dateien.filter(x => x !== el.dataset.id); render(); },
    erfassungSpeichern: () => {
      const e = Z.erfassung;
      if (!e.text.trim() && !e.dateien.length) return;
      const v = vorschlaegeAus(e.text, leistungen(), kunden());
      speicher.aendern('erfassungen', { id: e.id, typ: e.dateien.length ? 'foto' : 'notiz', text: e.text.trim(), kundeId: e.kundeId || v.kunde?.id || null, datum: e.datum || heute(),
        dateien: e.dateien, status: 'neu', angelegt: new Date().toISOString(), geraetName: speicher.geraet.name });
      Z.erfassung = neueErfassung(); render();
      zeigeToast(modus === 'echt' && !istLaptop && !Z.abgleich.verbunden ? 'Im Eingang gespeichert – geht an den Laptop, sobald er erreichbar ist' : 'Im Eingang gespeichert');
    },
    erfassungErledigt: el => { const e = speicher.holen('erfassungen', el.dataset.id); speicher.aendern('erfassungen', { ...stripMeta(e), status: 'erledigt' }); render(); },
    erfassungUebernehmen: el => {
      const e = speicher.holen('erfassungen', el.dataset.id);
      const v = vorschlaegeAus(e.text, leistungen(), kunden());
      const kundeId = e.kundeId || v.kunde?.id || null;
      let r = kundeId && rechnungen().filter(x => x.status === 'entwurf' && !x.freigabe && x.kundeId === kundeId).sort((a, b) => String(b._geaendert).localeCompare(String(a._geaendert)))[0];
      if (r) { r = kopie(r); erfassungInEntwurf(e, r); speicher.aendern('rechnungen', stripMeta(r)); gehe('rechnung', r.id); }
      else {
        neueRechnung(kundeId, { positionen: [], leistungVon: e.datum || heute() });
        const k = kunde(kundeId); if (k) standardDazu(Z.entwurf, k);
        erfassungInEntwurf(e, Z.entwurf);
        Z.entwurfNeu = false; entwurfSofortSpeichern(); render();
      }
    },
    logoEntfernen: () => { Z.form.daten.logo = null; render(); },
    firmaSpeichern: () => {
      const d = Z.form.daten;
      if (!nummernformatGueltig(d.nummernFormat)) { zeigeToast('Das Nummernformat braucht {NNNN} für die laufende Nummer'); return; }
      speicher.aendern('einstellungen', { ...stripMeta(d), id: 'firma' });
      zeigeToast('Einstellungen gespeichert'); render();
    }
  };
  function erfassungInEntwurf(e, r) {
    const v = vorschlaegeAus(e.text, leistungen(), kunden());
    for (const p of v.positionen) {
      const da = r.positionen.find(x => x.leistungId === p.leistungId);
      if (da && Number(da.menge) === 1 && p.menge !== 1 && !(r.erfassungen || []).length) da.menge = p.menge;
      else if (!da) r.positionen.push(posAusLeistung(leistung(p.leistungId), p.menge));
    }
    if (!v.positionen.length && e.text) r.positionen.push({ id: neueId('p'), leistungId: null, bezeichnung: 'Leistung laut Notiz', beschreibung: e.text.slice(0, 300), menge: 1, einheit: 'pauschal', preisCent: null, steuersatz: 19, art: 'arbeit', aktiv: true });
    if (!r.kundeId) r.kundeId = e.kundeId || v.kunde?.id || null;
    if (istIso(e.datum) && (!istIso(r.leistungVon) || e.datum < r.leistungVon)) { if (!r.leistungBis) r.leistungBis = r.leistungVon; r.leistungVon = e.datum; }
    if (r.leistungBis && r.leistungBis === r.leistungVon) r.leistungBis = '';
    r.erfassungen = [...new Set([...(r.erfassungen || []), e.id])];
    speicher.aendern('erfassungen', { ...stripMeta(e), status: 'zugeordnet', rechnungId: r.id, kundeId: r.kundeId || e.kundeId || null });
    zeigeToast(v.positionen.length ? `${v.positionen.length} Position${v.positionen.length === 1 ? '' : 'en'} aus der Notiz übernommen – bitte prüfen` : 'Notiz übernommen – bitte Leistung und Preis ergänzen');
  }
  const stripMeta = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_')));

  // Klicks
  wurzel.addEventListener('click', ev => {
    if (ev.target.matches('[data-blende]')) { Z.dialog = null; render(); return; }
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = H[el.dataset.act];
    if (f) { ev.preventDefault(); f(el, ev); }
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
      return;
    }
    if (el.matches('[data-dsuche]')) { Z.dialog.suche = el.value; teilErsetzen('#d-liste', Z.dialog.art === 'katalog' ? leistungenListeHtml(true) : kundenWahlHtml()); return; }
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
      if (Z.form.typ === 'leistungen' && (f === 'preis' || f === 'steuersatz')) teilErsetzen('#l-brutto', d.preisCent == null ? '' : 'Brutto: ' + euro(Math.round(d.preisCent * (1 + Number(d.steuersatz ?? 19) / 100))));
      if (Z.form.typ === 'einstellungen' && ['ustId', 'iban', 'nummernFormat'].includes(f) && art === 'change') render();
      return;
    }
    if (el.dataset.std !== undefined && Z.form) { Z.form.daten.standard[Number(el.dataset.std)].menge = mengeAus(el.value) || 1; return; }
    if (el.dataset.erf && Z.erfassung) {
      const f = el.dataset.erf;
      Z.erfassung[f] = el.value;
      if (f === 'kundeId') Z.erfassung.kundeAuto = false;
      if (f === 'text') {
        teilErsetzen('#erkannt', erkanntHtml(el.value));
        const v = Z.erfassung.kundeAuto ? vorschlaegeAus(el.value, leistungen(), kunden()) : null;
        if (v?.kunde) { Z.erfassung.kundeId = v.kunde.id; const s = wurzel.querySelector('#erf-kunde'); if (s) s.value = v.kunde.id; }
        const knopf = wurzel.querySelector('#erf-speichern'); if (knopf) knopf.disabled = !(el.value.trim() || Z.erfassung.dateien.length);
      }
      return;
    }
    if (el.matches('[data-geraetname]')) { speicher.geraetNennen(el.value); }
  }
  async function dateiGewaehlt(el) {
    const dateien = [...(el.files || [])];
    if (el.dataset.actChange === 'logoGewaehlt' && dateien[0]) {
      const url = await bildVerkleinern(dateien[0], 900, 'image/png', true);
      if (url.length > 2_500_000) { zeigeToast('Das Logo ist zu groß – bitte ein kleineres Bild wählen'); return; }
      Z.form.daten.logo = url; render(); return;
    }
    if (el.dataset.actChange === 'fotoGewaehlt') {
      for (const d of dateien) {
        const blob = await bildVerkleinern(d, 2000, 'image/jpeg');
        const id = await speicher.dateiAblegen(blob, 'image/jpeg');
        Z.erfassung.dateien.push(id);
      }
      render();
    }
  }
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
    if (['kunde', 'leistung', 'einstellungen'].includes(Z.ansicht) && Z.form) return;
    if (Z.dialog && Z.dialog.art !== 'abgleich') return;
    if (!tippt) render();
  }

  // Erstes Zeichnen
  Z.erfassung = neueErfassung();
  render();
  window.addEventListener('beforeunload', () => entwurfSofortSpeichern());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') entwurfSofortSpeichern(); });
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
