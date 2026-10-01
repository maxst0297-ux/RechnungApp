// Diktieren in der App – zwei Wege, je nachdem, was das Gerät kann:
//   1. Live-Diktat: die Spracherkennung des Browsers schreibt mit, während du sprichst (Chrome, Safari am Mac,
//      Safari-Tab am iPhone). Achtung: Der Browser schickt die Sprache dafür an Apple bzw. Google.
//   2. Sprachaufnahme: Die App nimmt auf (WAV, 16 kHz). Die Aufnahme hängt an der Notiz, wandert beim Abgleich auf
//      den Laptop, und der Laptop tippt sie dort offline ab (whisper.cpp). Das funktioniert auch in der iPhone-App
//      vom Home-Bildschirm, in der die Live-Erkennung des Browsers nicht verfügbar ist – und ohne Netz.

export const liveDiktatMoeglich = () => !!(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
export const aufnahmeMoeglich = () => !!(globalThis.navigator?.mediaDevices?.getUserMedia && (globalThis.AudioContext || globalThis.webkitAudioContext));
export const istHomeBildschirmApp = () => !!(globalThis.matchMedia?.('(display-mode: standalone)').matches || globalThis.navigator?.standalone);
export const istIOS = () => /iPhone|iPad|iPod/.test(globalThis.navigator?.userAgent || '') || (globalThis.navigator?.platform === 'MacIntel' && globalThis.navigator?.maxTouchPoints > 1);

/** Gesprochene Satzzeichen umsetzen: „Komma", „Punkt", „Fragezeichen", „Doppelpunkt", „neue Zeile". */
export function sprachbefehle(text) {
  return String(text || '')
    .replace(/\s*\b(neue zeile|neuer absatz|absatz)\b\s*/gi, '\n')
    .replace(/\s*\bkomma\b/gi, ',')
    .replace(/\s*\bpunkt\b(?=\s|$)/gi, '.')
    .replace(/\s*\bfragezeichen\b/gi, '?')
    .replace(/\s*\bdoppelpunkt\b/gi, ':')
    .replace(/[ \t]+\n/g, '\n');
}
/** Neuen Satzteil sauber an vorhandenen Text anhängen. */
export function anhaengen(vorher, neu) {
  const b = String(neu || '').trim();
  if (!b) return vorher || '';
  const a = String(vorher || '');
  if (!a.trim()) return b.charAt(0).toUpperCase() + b.slice(1);
  const trenner = /\n$/.test(a) || /^[,.?:!]/.test(b) ? '' : ' ';
  const anfang = /[.?!]\s*$/.test(a) || /\n$/.test(a) ? b.charAt(0).toUpperCase() + b.slice(1) : b;
  return a.replace(/[ \t]+$/, '') + trenner + anfang;
}

/**
 * Live-Diktat über die Spracherkennung des Browsers.
 * @param {object} o
 * @param {(fest: string, zwischen: string) => void} o.beiText   fest = erkannte Sätze, zwischen = gerade gesprochener Teil
 * @param {(fehler: string) => void} o.beiFehler
 * @param {() => void} o.beiEnde
 */
export function liveDiktat({ beiText, beiFehler, beiEnde }) {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  const r = new SR();
  // Android-Chrome wiederholt im Dauerbetrieb schon erkannte Sätze – dort satzweise zuhören und neu starten (onend)
  r.lang = 'de-DE'; r.continuous = !/Android/i.test(globalThis.navigator?.userAgent || ''); r.interimResults = true; r.maxAlternatives = 1;
  let aktiv = true, fest = '', neustarts = 0;
  r.onresult = e => {
    let zwischen = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) fest = anhaengen(fest, sprachbefehle(t)); else zwischen += t;
    }
    neustarts = 0;
    beiText(fest, sprachbefehle(zwischen));
  };
  r.onerror = e => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    aktiv = false;
    beiFehler(e.error || 'fehler');
  };
  // Manche Browser beenden nach einer Pause von selbst – solange der Knopf an ist, weiter zuhören.
  r.onend = () => {
    if (aktiv && neustarts++ < 20) { try { r.start(); return; } catch { /* dann eben Ende */ } }
    aktiv = false;
    beiEnde(fest);
  };
  r.start();
  return { stopp() { aktiv = false; try { r.stop(); } catch { beiEnde(fest); } } };
}

/**
 * Sprachaufnahme als WAV (16 kHz, mono, 16 Bit) – das Format, das whisper.cpp auf dem Laptop direkt liest.
 * Wird schon während der Aufnahme auf 16 kHz heruntergerechnet (5 Minuten ≈ 9,6 MB).
 * @param {object} o
 * @param {(pegel: number, sekunden: number) => void} [o.beiPegel]
 * @param {number} [o.maxSekunden]
 */
export async function aufnahmeStarten({ beiPegel = () => {}, maxSekunden = 300, beiMaximum = () => {} } = {}) {
  // Audio noch während des Antippens starten – iPhone und Browser lassen Ton sonst stumm
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ctx = new AC();
  const bereit = ctx.resume().catch(() => {});
  let strom;
  try { strom = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { ctx.close().catch(() => {}); throw e; }
  await bereit;
  const quelle = ctx.createMediaStreamSource(strom);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const ZIEL = 16000, faktor = ctx.sampleRate / ZIEL;
  const teile = [];
  let pos = 0, basis = 0, letzter = 0, anzahl = 0, beendet = false;
  proc.onaudioprocess = e => {
    if (beendet) return;
    const d = e.inputBuffer.getChannelData(0), L = d.length;
    const aus = new Int16Array(Math.ceil(L / faktor) + 2);
    let n = 0, quadrat = 0;
    while (pos < basis + L - 1) {
      const i = pos - basis, i0 = Math.floor(i), f = i - i0;
      const a = i0 < 0 ? letzter : d[i0], b = d[i0 + 1];
      const wert = Math.max(-1, Math.min(1, a + (b - a) * f));
      aus[n++] = wert < 0 ? wert * 0x8000 : wert * 0x7fff;
      quadrat += wert * wert;
      pos += faktor;
    }
    letzter = d[L - 1]; basis += L;
    teile.push(aus.subarray(0, n)); anzahl += n;
    const sek = anzahl / ZIEL;
    beiPegel(Math.min(1, Math.sqrt(quadrat / Math.max(1, n)) * 5), sek);
    if (sek >= maxSekunden) beiMaximum();
  };
  quelle.connect(proc); proc.connect(ctx.destination);
  const aufraeumen = async () => {
    beendet = true;
    try { proc.disconnect(); quelle.disconnect(); } catch { /* schon getrennt */ }
    strom.getTracks().forEach(t => t.stop());
    try { await ctx.close(); } catch { /* schon zu */ }
  };
  return {
    async stopp() { await aufraeumen(); return { blob: wavBlob(teile, anzahl, ZIEL), sekunden: anzahl / ZIEL }; },
    abbrechen: aufraeumen
  };
}

/** WAV-Datei aus 16-Bit-Teilen. */
export function wavBlob(teile, anzahl, rate) {
  const kopf = new DataView(new ArrayBuffer(44));
  const text = (o, s) => { for (let i = 0; i < s.length; i++) kopf.setUint8(o + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); kopf.setUint32(4, 36 + anzahl * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); kopf.setUint32(16, 16, true); kopf.setUint16(20, 1, true); kopf.setUint16(22, 1, true);
  kopf.setUint32(24, rate, true); kopf.setUint32(28, rate * 2, true); kopf.setUint16(32, 2, true); kopf.setUint16(34, 16, true);
  text(36, 'data'); kopf.setUint32(40, anzahl * 2, true);
  return new Blob([kopf.buffer, ...teile], { type: 'audio/wav' });
}

/** Zwei WAV-Aufnahmen dieses Moduls aneinanderhängen (weiter diktieren an derselben Notiz). */
export async function wavVerbinden(a, b) {
  const [x, y] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  const rate = new DataView(x).getUint32(24, true);
  const teile = [new Int16Array(x.slice(44)), new Int16Array(y.slice(44))];
  return wavBlob(teile, teile[0].length + teile[1].length, rate);
}

export const dauerText = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
