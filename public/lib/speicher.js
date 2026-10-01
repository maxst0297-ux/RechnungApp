// Speicher auf dem Gerät (Handy oder Laptop-Browser): eine eigene Kopie aller Daten in IndexedDB,
// dazu ein „Ausgang" mit Änderungen, die der Laptop noch nicht kennt, und Fotos, die noch hochgeladen werden müssen.
// Gearbeitet wird immer im Arbeitsspeicher (schnell); IndexedDB hält alles über Neustarts hinweg fest.
// Klappt IndexedDB nicht (privates Fenster o. Ä.), läuft die App trotzdem – dann nur bis zum Schließen.

const uid = (vor = '') => vor + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const kopie = o => (o == null ? o : JSON.parse(JSON.stringify(o)));

function idbOeffnen(name) {
  return new Promise((ok, fehler) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { for (const s of ['daten', 'ausgang', 'meta', 'dateien']) r.result.createObjectStore(s); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
    r.onblocked = () => fehler(new Error('IndexedDB blockiert'));
  });
}
function alleAus(db, store) {
  return new Promise((ok, fehler) => {
    const t = db.transaction(store), s = t.objectStore(store), aus = new Map();
    const c = s.openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { aus.set(cur.key, cur.value); cur.continue(); } else ok(aus); };
    c.onerror = () => fehler(c.error);
  });
}

/**
 * @param {string} name  Name der Gerätedatenbank (Vorschau und echte App getrennt)
 */
export async function oeffneSpeicher(name = 'rechnungapp') {
  let db = null;
  const daten = new Map(), ausgang = new Map(), meta = new Map(), dateien = new Map();
  try {
    db = await idbOeffnen(name);
    for (const [store, ziel] of [['daten', daten], ['ausgang', ausgang], ['meta', meta], ['dateien', dateien]]) {
      for (const [k, v] of await alleAus(db, store)) ziel.set(k, v);
    }
  } catch (e) { console.warn('Gerätespeicher nicht verfügbar – Daten nur bis zum Schließen:', e && e.message); db = null; }

  const schreiben = (store, key, wert) => {
    if (!db) return;
    try { const t = db.transaction(store, 'readwrite'); wert === undefined ? t.objectStore(store).delete(key) : t.objectStore(store).put(wert, key); }
    catch (e) { console.warn('Speichern fehlgeschlagen', e); }
  };
  const setMeta = (k, v) => { meta.set(k, v); schreiben('meta', k, v); };
  if (!meta.get('geraetId')) setMeta('geraetId', uid('g'));
  if (!meta.get('geraetName')) setMeta('geraetName', /iPhone|Android/i.test(navigator.userAgent) ? 'Handy' : /iPad/i.test(navigator.userAgent) ? 'iPad' : 'Laptop');

  const hoerer = new Set();
  const gemeldet = quelle => { for (const f of hoerer) { try { f(quelle); } catch (e) { console.error(e); } } };
  let version = 0;

  const s = {
    persistent: !!db,
    get geraet() { return { id: meta.get('geraetId'), name: meta.get('geraetName') }; },
    geraetNennen(n) { setMeta('geraetName', String(n || '').slice(0, 40) || 'Gerät'); },
    seq: () => Number(meta.get('seq') || 0),
    meta: k => meta.get(k),
    setMeta,
    neueId: uid,

    /** Alle (nicht gelöschten) Datensätze einer Sammlung */
    alle(typ) { const aus = []; for (const d of daten.values()) if (d._typ === typ && !d._geloescht) aus.push(d); return aus; },
    holen(typ, id) { const d = daten.get(typ + '/' + id); return d && !d._geloescht ? d : null; },

    /** Eigene Änderung: sofort sichtbar, wandert in den Ausgang Richtung Laptop. */
    aendern(typ, datensatz, { still = false } = {}) {
      const id = datensatz.id || uid(typ.slice(0, 1));
      const key = typ + '/' + id;
      const alt = daten.get(key);
      const neu = { ...kopie(datensatz), id, _typ: typ, _seq: alt?._seq || 0, _geaendert: new Date().toISOString(), _geraet: meta.get('geraetId'), _geloescht: false };
      daten.set(key, neu); schreiben('daten', key, neu);
      const eintrag = { typ, id, basis: ausgang.get(key)?.basis ?? (alt?._seq || 0), v: ++version + Date.now() };
      ausgang.set(key, eintrag); schreiben('ausgang', key, eintrag);
      if (!still) gemeldet('lokal');
      return neu;
    },
    loeschen(typ, id) {
      const key = typ + '/' + id, alt = daten.get(key);
      if (!alt) return;
      const neu = { ...alt, _geloescht: true, _geaendert: new Date().toISOString(), _geraet: meta.get('geraetId') };
      daten.set(key, neu); schreiben('daten', key, neu);
      const eintrag = { typ, id, basis: ausgang.get(key)?.basis ?? (alt._seq || 0), v: ++version + Date.now() };
      ausgang.set(key, eintrag); schreiben('ausgang', key, eintrag);
      gemeldet('lokal');
    },

    /** Was an den Laptop geht */
    ausgang() {
      return [...ausgang.entries()].map(([key, e]) => {
        const d = daten.get(key) || {};
        const nutz = Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_')));
        return { typ: e.typ, id: e.id, basis: e.basis, v: e.v, geaendert: d._geaendert, geloescht: !!d._geloescht, daten: nutz };
      });
    },
    wartend: () => ausgang.size,

    /**
     * Antwort des Laptops einarbeiten.
     * @param {Array} gesendet  die mitgeschickten Ausgangs-Einträge
     * @param {object} antwort  { ergebnisse, datensaetze, seq }
     * @returns {Array} Datensätze, bei denen die eigene Änderung nicht übernommen wurde (Konflikt / festgeschrieben)
     */
    nachAbgleich(gesendet, antwort) {
      const abgelehnt = [];
      const vonUns = new Map(gesendet.map(e => [e.typ + '/' + e.id, e.v]));
      for (const e of antwort.ergebnisse || []) {
        const key = e.typ + '/' + e.id;
        if (vonUns.has(key) && ausgang.get(key)?.v === vonUns.get(key)) { ausgang.delete(key); schreiben('ausgang', key, undefined); }
        if (!e.ok && e.grund !== 'unveraendert') abgelehnt.push(e);
        if (e.aktuell) uebernehmen(e.aktuell);
      }
      for (const d of antwort.datensaetze || []) uebernehmen(d);
      if (Number.isFinite(antwort.seq)) setMeta('seq', Math.max(s.seq(), antwort.seq));
      gemeldet('laptop');
      return abgelehnt;
    },

    // ── Fotos/Dateien ──
    async dateiAblegen(blob, mime) {
      const id = uid('f');
      const eintrag = { blob, mime: mime || blob.type, hochgeladen: false, zeit: Date.now() };
      dateien.set(id, eintrag); schreiben('dateien', id, eintrag);
      return id;
    },
    dateiHolen: id => dateien.get(id) || null,
    dateienOffen: () => [...dateien.entries()].filter(([, d]) => !d.hochgeladen).map(([id, d]) => ({ id, ...d })),
    dateiHochgeladen(id) { const d = dateien.get(id); if (d) { d.hochgeladen = true; schreiben('dateien', id, d); } },

    beiAenderung(f) { hoerer.add(f); return () => hoerer.delete(f); },
    async leeren() {
      daten.clear(); ausgang.clear(); meta.clear(); dateien.clear();
      if (db) { db.close(); await new Promise(ok => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => ok(); }); }
    }
  };

  // Vom Laptop kommende Fassung übernehmen – außer der Datensatz hat hier noch eine neuere, ungesendete Änderung.
  function uebernehmen(d) {
    if (!d || !d._typ || !d.id) return;
    const key = d._typ + '/' + d.id;
    if (ausgang.has(key)) {
      // Eigenes Echo vom Laptop: die noch wartende neuere Änderung baut darauf auf (kein Konflikt mit sich selbst)
      const e = ausgang.get(key);
      if (d._geraet === meta.get('geraetId')) { e.basis = Math.max(e.basis || 0, d._seq || 0); schreiben('ausgang', key, e); }
      const lokal = daten.get(key);
      if (lokal) { lokal._seq = Math.max(lokal._seq || 0, d._geraet === meta.get('geraetId') ? d._seq || 0 : 0); }
      return;
    }
    daten.set(key, d); schreiben('daten', key, d);
  }
  return s;
}
