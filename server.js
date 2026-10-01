// RechnungApp – Server auf dem Laptop (Hauptablage).
// Speichert alles in einem Ordner auf dem Laptop, liefert die App an Handy und Laptop aus und gleicht beide ab.
// Start:  npm start   →  http://localhost:4200
// Handy:  über Tailscale (HTTPS), siehe README.md
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { oeffneDatenbank } from './src/datenbank.js';
import { erstelleRechnungsPdf } from './src/rechnung-pdf.js';
import { aenderungenUebernehmen, freigabenAusfuehren, seit, abschriftSetzen } from './public/lib/abgleich-kern.js';
import { diktatEinrichtung, abtippen } from './src/diktat.js';
import { festeFassung } from './public/lib/festschreiben.js';
import { heuteIso } from './public/lib/datum.js';

process.removeAllListeners('warning');   // Hinweis „SQLite ist experimentell" ausblenden (Node 22/24)
process.on('warning', w => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf8')).version;
const PORT = Number(process.env.PORT || 4200);
const HOST = process.env.RA_HOST || '127.0.0.1';               // nur lokal; das Handy kommt über Tailscale (tailscale serve)
const ORDNER = process.env.RA_ORDNER || join(os.homedir(), 'RechnungApp');
const PIN = process.env.RA_PIN || '';
const ORDN = { daten: join(ORDNER, 'Daten'), archiv: join(ORDNER, 'Archiv'), sicherungen: join(ORDNER, 'Sicherungen'), modelle: join(ORDNER, 'Modelle') };
for (const d of Object.values(ORDN)) fs.mkdirSync(d, { recursive: true });

const speicher = oeffneDatenbank(join(ORDN.daten, 'rechnungapp.sqlite'));
const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);

// Daten der ersten Version: „Erfassungen" heißen jetzt „Notizen" (mit Baustelle, Fotos und Sprachaufnahme) – einmalig umziehen
function erfassungenUmziehen() {
  const alt = speicher.alle('erfassungen').filter(e => !e._geloescht);
  if (!alt.length) return;
  const status = { neu: 'offen', zugeordnet: 'zugeordnet', erledigt: 'erledigt', abgerechnet: 'abgerechnet' };
  const jetzt = new Date().toISOString();
  speicher.transaktion(() => {
    for (const e of alt) {
      if (!speicher.holen('notizen', e.id)) {
        speicher.schreiben('notizen', e.id, { id: e.id, text: e.text || '', baustelleId: null, kundeId: e.kundeId || null, datum: e.datum, fotos: e.dateien || [],
          audio: null, audioSekunden: 0, status: status[e.status] || 'offen', rechnungId: e.rechnungId || null, angelegt: e.angelegt || jetzt,
          geraetName: e.geraetName || '', _geaendert: e._geaendert || jetzt, _geraet: e._geraet || 'laptop' });
      }
      speicher.schreiben('erfassungen', e.id, { ...e, _geloescht: true, _geaendert: jetzt, _geraet: 'laptop' });
    }
    for (const r of speicher.alle('rechnungen')) {
      if (!r._geloescht && r.status === 'entwurf' && r.erfassungen?.length && !r.notizen?.length) speicher.schreiben('rechnungen', r.id, { ...r, notizen: r.erfassungen });
    }
    speicher.protokoll({ aktion: 'umzug', typ: 'notizen', geraet: 'laptop', daten: { erfassungen: alt.length } });
  });
  log(`${alt.length} Erfassungen als Notizen übernommen`);
}
erfassungenUmziehen();

// ── Sicherung: täglich eine vollständige Kopie der Datenbank, 30 Tage aufheben ──
function sichern(anlass = 'taeglich') {
  try {
    const name = `rechnungapp-${heuteIso()}${anlass === 'taeglich' ? '' : '-' + anlass + '-' + Date.now()}.sqlite`;
    const ziel = join(ORDN.sicherungen, name);
    if (anlass === 'taeglich' && fs.existsSync(ziel)) return null;
    speicher.sichernNach(ziel);
    const taeglich = fs.readdirSync(ORDN.sicherungen).filter(f => /^rechnungapp-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort();
    taeglich.slice(0, Math.max(0, taeglich.length - 30)).forEach(f => fs.rmSync(join(ORDN.sicherungen, f), { force: true }));
    log('Sicherung erstellt:', name);
    return name;
  } catch (e) { log('Sicherung fehlgeschlagen:', e.message); return null; }
}
sichern();
setInterval(() => sichern(), 60 * 60 * 1000).unref();

// ── Festschreiben: PDF erzeugen, schreibgeschützt ablegen, Prüfsumme merken ──
const sauber = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'Kunde';
async function pdfErzeugen(rechnung, firma) {
  const bytes = await erstelleRechnungsPdf({ fest: rechnung.fest, logo: firma.logo, erstellt: rechnung.festgeschriebenAm });
  const jahr = String(rechnung.datum).slice(0, 4);
  const ordner = join(ORDN.archiv, 'Rechnungen', jahr);
  fs.mkdirSync(ordner, { recursive: true });
  let name = `${sauber(rechnung.nummer)}_${sauber(rechnung.fest.kunde.name)}.pdf`;
  for (let i = 2; fs.existsSync(join(ordner, name)); i++) name = `${sauber(rechnung.nummer)}_${sauber(rechnung.fest.kunde.name)}_${i}.pdf`;
  const ziel = join(ordner, name), tmp = ziel + '.tmp';
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, ziel);
  fs.chmodSync(ziel, 0o444);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  return { datei: relative(ORDNER, ziel).split(sep).join('/'), sha256, groesse: bytes.length };
}
let freigabeKette = Promise.resolve();
function freigabenAbarbeiten(geraet) {
  const p = freigabeKette.then(() => freigabenAusfuehren(speicher, { geraet, pdfErzeugen }));
  freigabeKette = p.catch(() => {});
  return p;
}

// ── Live-Meldungen an offene Geräte (Server-Sent Events) ──
const zuhoerer = new Set();
function melden() { const seq = speicher.hoechsteSeq(); for (const res of zuhoerer) res.write(`event: seq\ndata: ${seq}\n\n`); }
setInterval(() => { for (const res of zuhoerer) res.write(': da\n\n'); }, 25000).unref();
const geraete = new Map();

// ── Sprachaufnahmen abtippen (whisper.cpp, offline auf dem Laptop) – eine nach der anderen ──
let diktatKette = Promise.resolve();
const fachwoerter = () => [...new Set([...speicher.alle('leistungen').filter(l => !l._geloescht && l.aktiv !== false).map(l => l.bezeichnung),
  ...speicher.alle('baustellen').filter(b => !b._geloescht).map(b => b.name), ...speicher.alle('kunden').filter(k => !k._geloescht).map(k => k.name)])]
  .join(', ').slice(0, 600);
function abtippenEinreihen(id) { diktatKette = diktatKette.then(() => einmalAbtippen(id)).catch(e => log('Abtippen:', e.message)); }
async function einmalAbtippen(id) {
  const d = speicher.dateiHolen(id);
  if (!d || d.abschrift_status === 'fertig') return;
  const e = diktatEinrichtung(ORDN.modelle);
  if (!e.verfuegbar) speicher.abschriftMerken(id, { status: 'keine-erkennung' });
  else {
    const start = Date.now();
    try {
      const text = await abtippen(join(ORDNER, d.pfad), { programm: e.programm, modell: e.modell, hinweise: fachwoerter() });
      speicher.abschriftMerken(id, { text, status: 'fertig' });
      log(`Sprachaufnahme abgetippt (${Math.round((Date.now() - start) / 100) / 10} s): ${text.slice(0, 60)}`);
    } catch (err) { speicher.abschriftMerken(id, { status: 'fehler' }); log('Abtippen fehlgeschlagen:', err.message); }
  }
  abschriftenAnwenden();
}
/** Fertige Abschriften an die Notizen hängen – auch wenn die Notiz erst nach der Aufnahme beim Laptop ankommt. */
function abschriftenAnwenden() {
  let n = 0;
  for (const notiz of speicher.alle('notizen')) {
    if (notiz._geloescht || !notiz.audio) continue;
    const d = speicher.dateiHolen(notiz.audio);
    if (!d || !d.abschrift_status) continue;
    if (notiz.abschriftStatus === d.abschrift_status && (notiz.abschrift || '') === (d.abschrift || '')) continue;
    n += abschriftSetzen(speicher, notiz.audio, { text: d.abschrift || '', status: d.abschrift_status });
  }
  if (n) melden();
  return n;
}
// Beim Start: Aufnahmen ohne Abschrift (z. B. weil die Spracherkennung erst jetzt eingerichtet ist) erneut einreihen
for (const d of speicher.aufnahmen()) if (d.abschrift_status !== 'fertig') abtippenEinreihen(d.id);

// ── App ──
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '12mb' }));

const AUTH_COOKIE = 'ra_auth';
const AUTH_TOKEN = PIN ? crypto.createHash('sha256').update(PIN + '|rechnungapp').digest('hex') : '';
const cookie = (req, name) => (/(?:^|; )ra_auth=([^;]+)/.exec(req.headers.cookie || '') || [])[1] || '';
const angemeldet = req => !PIN || cookie(req, AUTH_COOKIE) === AUTH_TOKEN;
app.get('/api/me', (req, res) => res.json({ pinNoetig: !!PIN, angemeldet: angemeldet(req) }));
app.post('/api/login', (req, res) => {
  if (!PIN) return res.json({ ok: true });
  if (String(req.body?.pin || '') !== PIN) return res.status(401).json({ ok: false });
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${AUTH_TOKEN}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Strict${req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.use('/api', (req, res, next) => (angemeldet(req) ? next() : res.status(401).json({ fehler: 'anmelden' })));

app.get('/api/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, version: VERSION, seq: speicher.hoechsteSeq(), ordner: ORDNER, anzahl: speicher.anzahl(),
    protokoll: speicher.protokollPruefen(), geraete: [...geraete.values()],
    diktat: (({ verfuegbar, modell }) => ({ verfuegbar, modell: modell ? modell.split(/[\\/]/).pop() : null, modellOrdner: ORDN.modelle }))(diktatEinrichtung(ORDN.modelle)),
    sicherungen: fs.readdirSync(ORDN.sicherungen).filter(f => f.endsWith('.sqlite')).sort().slice(-3) });
});

// Abgleich: Änderungen des Geräts übernehmen, angeforderte Freigaben ausführen, alles Neue zurückgeben.
app.post('/api/abgleich', async (req, res) => {
  const b = req.body || {};
  const geraet = String(b.geraet?.id || 'unbekannt').slice(0, 40);
  geraete.set(geraet, { id: geraet, name: String(b.geraet?.name || '').slice(0, 60), zuletzt: new Date().toISOString() });
  try {
    const vorher = speicher.hoechsteSeq();
    const ergebnisse = aenderungenUebernehmen(speicher, geraet, b.aenderungen || []);
    abschriftenAnwenden();
    const freigaben = await freigabenAbarbeiten(geraet);
    for (const f of freigaben) log(f.ok ? `Festgeschrieben: ${f.nummer}` : `Freigabe abgelehnt (${f.id}): ${f.fehler.join(' ')}`);
    const datensaetze = seit(speicher, b.seit);
    res.json({ ergebnisse, freigaben, datensaetze, seq: speicher.hoechsteSeq() });
    if (speicher.hoechsteSeq() !== vorher) melden();
  } catch (e) {
    log('Abgleich fehlgeschlagen:', e.stack || e.message);
    res.status(500).json({ fehler: e.message });
  }
});

app.get('/api/ereignisse', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`retry: 5000\nevent: seq\ndata: ${speicher.hoechsteSeq()}\n\n`);
  zuhoerer.add(res);
  req.on('close', () => zuhoerer.delete(res));
});

// Fotos und Sprachaufnahmen aus Notizen: landen im Archiv-Ordner auf dem Laptop, Aufnahmen werden abgetippt
const ENDUNG = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/mpeg': 'mp3' };
app.put('/api/dateien/:id', express.raw({ type: () => true, limit: '30mb' }), (req, res) => {
  const id = req.params.id;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return res.status(400).json({ fehler: 'ungültige Kennung' });
  if (speicher.dateiHolen(id)) return res.json({ ok: true, schonDa: true });
  const mime = String(req.headers['content-type'] || '').split(';')[0];
  const endung = ENDUNG[mime];
  if (!endung || !req.body?.length) return res.status(415).json({ fehler: 'Dateityp nicht unterstützt' });
  const [j, m] = heuteIso().split('-');
  const ordner = join(ORDN.archiv, 'Notizen', j, m);
  fs.mkdirSync(ordner, { recursive: true });
  const ziel = join(ordner, `${id}.${endung}`);
  fs.writeFileSync(ziel + '.tmp', req.body); fs.renameSync(ziel + '.tmp', ziel);
  const sha256 = crypto.createHash('sha256').update(req.body).digest('hex');
  speicher.dateiMerken({ id, pfad: relative(ORDNER, ziel).split(sep).join('/'), mime, groesse: req.body.length, sha256 });
  speicher.protokoll({ aktion: 'datei', typ: 'dateien', id, geraet: String(req.headers['x-geraet'] || ''), daten: { mime, sha256 } });
  if (endung === 'wav') abtippenEinreihen(id);
  res.json({ ok: true });
});
app.get('/api/dateien/:id', (req, res) => {
  const d = speicher.dateiHolen(req.params.id);
  if (!d) return res.status(404).json({ fehler: 'nicht gefunden' });
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.type(d.mime).sendFile(join(ORDNER, d.pfad));
});

// Rechnungs-PDF: festgeschrieben → die archivierte Datei; Entwurf → frisch erzeugt mit Wasserzeichen „ENTWURF"
app.get('/api/rechnungen/:id/pdf', async (req, res) => {
  const r = speicher.holen('rechnungen', req.params.id);
  if (!r || r._geloescht) return res.status(404).json({ fehler: 'Rechnung nicht gefunden' });
  const art = req.query.download ? 'attachment' : 'inline';
  if (r.status !== 'entwurf' && r.pdf?.datei) {
    const name = `${(r.typ === 'storno' ? 'Stornorechnung_' : 'Rechnung_')}${sauber(r.nummer)}.pdf`;
    res.setHeader('Content-Disposition', `${art}; filename="${name}"`);
    return res.type('application/pdf').sendFile(join(ORDNER, r.pdf.datei));
  }
  const firma = speicher.holen('einstellungen', 'firma') || {};
  const kunde = r.kundeId ? speicher.holen('kunden', r.kundeId) : null;
  const original = r.stornoVon ? speicher.holen('rechnungen', r.stornoVon) : null;
  const { fest } = festeFassung({ entwurf: r, firma, kunde, nummer: '', datum: heuteIso(), original, kategorien: speicher.alle('kategorien') });
  const bytes = await erstelleRechnungsPdf({ fest, logo: firma.logo, entwurf: true });
  res.setHeader('Content-Disposition', `${art}; filename="Rechnung_Entwurf.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('application/pdf').send(Buffer.from(bytes));
});

// ── App-Dateien ──
// Service Worker mit Versionskennung aus dem Inhalt aller App-Dateien → Handy lädt Neues, sobald es den Laptop erreicht.
const PUBLIC = join(__dirname, 'public');
function appDateien(dir = PUBLIC) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? appDateien(join(dir, e.name))
    : e.name === 'sw.js' ? [] : ['/' + relative(PUBLIC, join(dir, e.name)).split(sep).join('/')]);
}
const QR_DATEI = join(__dirname, 'node_modules', 'qrcode-generator', 'dist', 'qrcode.mjs');
const appListe = [...appDateien(), '/vendor/qrcode-generator.mjs', '/'];
const appVersion = crypto.createHash('sha1').update(appDateien().map(f => fs.readFileSync(join(PUBLIC, f))).join('|') + VERSION).digest('hex').slice(0, 12);
const swCode = fs.readFileSync(join(PUBLIC, 'sw.js'), 'utf8').replace('__VERSION__', appVersion).replace('__DATEIEN__', JSON.stringify(appListe));
app.get('/sw.js', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.type('application/javascript').send(swCode); });
app.get('/vendor/qrcode-generator.mjs', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.type('application/javascript').sendFile(QR_DATEI); });
app.use(express.static(PUBLIC, { setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));
app.get('/{*pfad}', (req, res, next) => (req.path.startsWith('/api/') ? next() : res.sendFile(join(PUBLIC, 'index.html'))));

app.listen(PORT, HOST, () => {
  log(`RechnungApp ${VERSION} läuft: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  log(`Ablage: ${ORDNER}`);
  if (!PIN) log('Hinweis: ohne PIN (RA_PIN) – nur über Tailscale/localhost erreichbar machen.');
});
