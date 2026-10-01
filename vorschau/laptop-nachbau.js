// Vorschau: der Laptop wird im Browser nachgebildet. Er nutzt dieselbe Abgleich-Logik wie der echte Laptop-Server
// (public/lib/abgleich-kern.js) – nur ohne SQLite und ohne PDF. Daten bleiben in diesem Browser (IndexedDB).
import { aenderungenUebernehmen, freigabenAusfuehren, seit } from '../public/lib/abgleich-kern.js';
import { beispieldatenAnlegen } from './beispieldaten.js';

const DB = 'rechnungapp-vorschau-laptop';
const pause = ms => new Promise(ok => setTimeout(ok, ms));

function kv(modus, wert) {
  return new Promise(ok => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onerror = () => ok(null);
      r.onsuccess = () => {
        const t = r.result.transaction('kv', modus === 'lesen' ? 'readonly' : 'readwrite');
        const s = t.objectStore('kv');
        const q = modus === 'lesen' ? s.get('zustand') : s.put(wert, 'zustand');
        q.onsuccess = () => ok(modus === 'lesen' ? q.result || null : true);
        q.onerror = () => ok(null);
      };
    } catch { ok(null); }
  });
}

function speicherImArbeitsspeicher(zustand) {
  const daten = new Map(zustand?.daten || []), zaehler = new Map(zustand?.zaehler || []);
  const k = o => JSON.parse(JSON.stringify(o));
  return {
    holen: (t, id) => { const d = daten.get(t + '/' + id); return d ? k(d) : null; },
    alle: t => [...daten.values()].filter(d => d._typ === t).map(k),
    seit: seq => [...daten.values()].filter(d => (d._seq || 0) > seq).sort((a, b) => a._seq - b._seq).map(k),
    zaehler: n => zaehler.get(n) || 0,
    zaehlerSetzen: (n, w) => { zaehler.set(n, w); },
    hoechsteSeq: () => zaehler.get('seq') || 0,
    schreiben(t, id, d) {
      const seq = (zaehler.get('seq') || 0) + 1;
      zaehler.set('seq', seq);
      const { _seq, ...ohne } = d; void _seq;
      daten.set(t + '/' + id, { ...k(ohne), _typ: t, id, _seq: seq });
      return seq;
    },
    protokoll() {},
    transaktion: fn => fn(),
    export: () => ({ daten: [...daten.entries()], zaehler: [...zaehler.entries()] })
  };
}

export async function erstelleVorschauLaptop() {
  const gespeichert = await kv('lesen');
  const speicher = speicherImArbeitsspeicher(gespeichert?.speicher);
  const dateien = new Map(gespeichert?.dateien || []);
  if (!gespeichert) await beispieldatenAnlegen(speicher, dateien);
  let timer = null;
  const sichern = () => { clearTimeout(timer); timer = setTimeout(() => kv('schreiben', { speicher: speicher.export(), dateien: [...dateien.entries()] }), 200); };
  if (!gespeichert) sichern();
  const urls = new Map();

  const laptop = {
    verbunden: true,
    transport: {
      art: 'vorschau', istLaptop: false,
      async abgleich(body) {
        await pause(280);
        if (!laptop.verbunden) throw new Error('Laptop nicht erreichbar');
        const ergebnisse = aenderungenUebernehmen(speicher, body.geraet?.id || 'geraet', body.aenderungen || []);
        const freigaben = await freigabenAusfuehren(speicher, { geraet: body.geraet?.name || 'Gerät' });
        sichern();
        return { ergebnisse, freigaben, datensaetze: seit(speicher, body.seit), seq: speicher.hoechsteSeq() };
      },
      async dateiHoch(id, blob, mime) {
        await pause(150);
        if (!laptop.verbunden) throw new Error('Laptop nicht erreichbar');
        dateien.set(id, { blob, mime }); sichern();
      },
      dateiUrl(id) {
        const d = dateien.get(id);
        if (!d) return '';
        if (!urls.has(id)) urls.set(id, URL.createObjectURL(d.blob));
        return urls.get(id);
      }
    },
    async zuruecksetzen() {
      await new Promise(ok => { try { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => ok(); } catch { ok(); } });
    }
  };
  return laptop;
}
