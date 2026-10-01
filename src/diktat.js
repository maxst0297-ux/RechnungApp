// Sprachaufnahmen auf dem Laptop abtippen – offline mit whisper.cpp (nichts verlässt den Laptop).
// Einrichten auf dem Mac (einmalig, siehe README):
//   brew install whisper-cpp
//   mkdir -p ~/RechnungApp/Modelle && curl -L -o ~/RechnungApp/Modelle/ggml-small.bin \
//     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
// Gefunden wird whisper-cli automatisch (PATH, /opt/homebrew/bin, /usr/local/bin) und das erste Modell im Ordner
// „Modelle". Abweichend: RA_WHISPER=/pfad/zu/whisper-cli  RA_WHISPER_MODELL=/pfad/zu/ggml-….bin
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { join, delimiter } from 'node:path';

const KANDIDATEN = ['whisper-cli', 'whisper-cpp'];
const MODELL_REIHENFOLGE = ['large-v3-turbo', 'medium', 'small', 'base', 'tiny'];

function programmFinden() {
  if (process.env.RA_WHISPER) return fs.existsSync(process.env.RA_WHISPER) ? process.env.RA_WHISPER : null;
  const ordner = [...(process.env.PATH || '').split(delimiter), '/opt/homebrew/bin', '/usr/local/bin'];
  for (const name of KANDIDATEN) for (const o of ordner) { const p = join(o, name); if (o && fs.existsSync(p)) return p; }
  return null;
}
function modellFinden(modellOrdner) {
  if (process.env.RA_WHISPER_MODELL) return fs.existsSync(process.env.RA_WHISPER_MODELL) ? process.env.RA_WHISPER_MODELL : null;
  let dateien = [];
  try { dateien = fs.readdirSync(modellOrdner).filter(f => /^ggml-.*\.bin$/.test(f)); } catch { return null; }
  const rang = f => { const i = MODELL_REIHENFOLGE.findIndex(m => f.includes(m)); return i < 0 ? 99 : i; };
  dateien.sort((a, b) => rang(a) - rang(b));
  return dateien.length ? join(modellOrdner, dateien[0]) : null;
}

/** Stellt fest, ob abgetippt werden kann (bei jedem Aufruf neu – so wirkt eine Nachinstallation ohne Neustart). */
export function diktatEinrichtung(modellOrdner) {
  const programm = programmFinden(), modell = modellFinden(modellOrdner);
  return { verfuegbar: !!(programm && modell), programm, modell };
}

/**
 * WAV-Datei abtippen.
 * @param {string} wavPfad
 * @param {object} o
 * @param {string} o.programm  whisper-cli
 * @param {string} o.modell    ggml-Modell
 * @param {string} [o.hinweise] Fachwörter aus dem Leistungskatalog – verbessert die Erkennung (z. B. „Eckventil")
 * @returns {Promise<string>}
 */
export function abtippen(wavPfad, { programm, modell, hinweise = '' }) {
  return new Promise((ok, fehler) => {
    const args = ['-m', modell, '-f', wavPfad, '-l', 'de', '-nt', '-np'];
    if (hinweise) args.push('--prompt', hinweise.slice(0, 600));
    const p = spawn(programm, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = '', err = '';
    const zeit = setTimeout(() => { p.kill(); fehler(new Error('Zeitüberschreitung beim Abtippen')); }, 10 * 60 * 1000);
    p.stdout.on('data', d => { aus += d; });
    p.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-5000); });
    p.on('error', e => { clearTimeout(zeit); fehler(e); });
    p.on('close', code => {
      clearTimeout(zeit);
      if (code !== 0) return fehler(new Error((err.trim().split('\n').pop() || `whisper beendet mit ${code}`).slice(0, 300)));
      ok(aus.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim());
    });
  });
}
