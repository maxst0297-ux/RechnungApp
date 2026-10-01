// Start der Vorschau: echte Oberfläche + echter Gerätespeicher + echter Abgleich – nur der Laptop ist nachgebildet.
import { oeffneSpeicher } from '../public/lib/speicher.js';
import { starteApp } from '../public/app.js';
import { erstelleVorschauLaptop } from './laptop-nachbau.js';

const GERAET = 'rechnungapp-vorschau-geraet';
try { if (localStorage.getItem('ra-design') === 'hell') document.documentElement.dataset.design = 'hell'; } catch { /* ohne Speicher: Standard-Design */ }
const laptop = await erstelleVorschauLaptop();
let speicher = await oeffneSpeicher(GERAET);
// Neue Beispieldaten am „Laptop" → auch die Kopie auf dem Gerät neu beginnen (sonst mischen sich alte und neue Stände)
if (laptop.neuAngelegt) { await speicher.leeren(); speicher = await oeffneSpeicher(GERAET); }
starteApp({ speicher, transport: laptop.transport, modus: 'vorschau', wurzel: document.getElementById('app'), vorschau: laptop });
