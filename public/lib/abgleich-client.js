// Abgleich auf dem Gerät: schickt den Ausgang an den Laptop, holt alles Neue und lädt Fotos hoch.
// Läuft beim Start, nach jeder Änderung (kurz verzögert), alle 20 Sekunden, wenn die App wieder sichtbar wird,
// wenn das Netz zurückkommt und sofort, wenn der Laptop eine Änderung eines anderen Geräts meldet.

export function starteAbgleich({ speicher, transport, melden = () => {}, abgelehnt = () => {} }) {
  const status = { verbunden: null, laeuft: false, zuletzt: null, fehler: '', wartend: 0, anmelden: false };
  let laeuft = null, nochmal = false, timer = null;
  const aktualisieren = () => { status.wartend = speicher.wartend() + speicher.dateienOffen().length; melden({ ...status }); };

  async function einmal() {
    status.laeuft = true; aktualisieren();
    try {
      for (const d of speicher.dateienOffen()) {
        await transport.dateiHoch(d.id, d.blob, d.mime, speicher.geraet.id);
        speicher.dateiHochgeladen(d.id);
      }
      const gesendet = speicher.ausgang();
      const antwort = await transport.abgleich({ geraet: speicher.geraet, seit: speicher.seq(), aenderungen: gesendet });
      const nichtUebernommen = speicher.nachAbgleich(gesendet, antwort);
      if (nichtUebernommen.length) abgelehnt(nichtUebernommen);
      Object.assign(status, { verbunden: true, zuletzt: new Date(), fehler: '', anmelden: false });
      return antwort;
    } catch (e) {
      Object.assign(status, { verbunden: false, fehler: (e && e.message) || 'Laptop nicht erreichbar', anmelden: !!(e && e.anmelden) });
      return null;
    } finally { status.laeuft = false; aktualisieren(); }
  }

  async function abgleichen() {
    if (laeuft) { nochmal = true; return laeuft; }
    laeuft = einmal();
    try { return await laeuft; }
    finally { laeuft = null; if (nochmal) { nochmal = false; abgleichen(); } }
  }
  const bald = (ms = 700) => { clearTimeout(timer); timer = setTimeout(abgleichen, ms); };

  speicher.beiAenderung(quelle => { aktualisieren(); if (quelle === 'lokal') bald(); });
  setInterval(() => { if (document.visibilityState === 'visible') abgleichen(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') abgleichen(); });
  window.addEventListener('online', () => abgleichen());
  transport.ereignisse?.(seq => { if (seq > speicher.seq()) bald(150); });
  aktualisieren();
  abgleichen();
  return { abgleichen, status: () => ({ ...status }) };
}
