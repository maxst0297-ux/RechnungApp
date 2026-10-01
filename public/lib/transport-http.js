// Verbindung zum Laptop-Server über HTTP(S) – im echten Betrieb über die Tailscale-Adresse des Laptops.

const fehlerAus = async r => {
  const e = new Error(r.status === 401 ? 'Anmeldung nötig' : `Laptop antwortet mit Fehler ${r.status}`);
  if (r.status === 401) e.anmelden = true;
  try { const j = await r.json(); if (j.fehler && r.status !== 401) e.message = j.fehler; } catch {}
  return e;
};
const mitZeitlimit = (p, ms) => Promise.race([p, new Promise((_, nein) => setTimeout(() => nein(new Error('Laptop nicht erreichbar')), ms))]);

export function httpTransport() {
  const istLaptop = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return {
    art: istLaptop ? 'laptop' : 'netz',
    istLaptop,
    async abgleich(body) {
      let r;
      try { r = await mitZeitlimit(fetch('/api/abgleich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }), 20000); }
      catch { throw new Error('Laptop nicht erreichbar'); }
      if (!r.ok) throw await fehlerAus(r);
      return r.json();
    },
    async dateiHoch(id, blob, mime, geraetId) {
      let r;
      try { r = await mitZeitlimit(fetch('/api/dateien/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': mime || blob.type, 'X-Geraet': geraetId || '' }, body: blob }), 60000); }
      catch { throw new Error('Laptop nicht erreichbar'); }
      if (!r.ok) throw await fehlerAus(r);
    },
    dateiUrl: id => '/api/dateien/' + encodeURIComponent(id),
    pdfUrl: id => '/api/rechnungen/' + encodeURIComponent(id) + '/pdf',
    ereignisse(aufruf) {
      if (!('EventSource' in window)) return;
      const es = new EventSource('/api/ereignisse');
      es.addEventListener('seq', e => aufruf(Number(e.data)));
    },
    async status() { const r = await fetch('/api/status', { credentials: 'same-origin' }); if (!r.ok) throw await fehlerAus(r); return r.json(); },
    async anmelden(pin) { const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); return r.ok; }
  };
}
