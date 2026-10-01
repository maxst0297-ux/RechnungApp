// Start der Vorschau: echte Oberfläche + echter Gerätespeicher + echter Abgleich – nur der Laptop ist nachgebildet.
import { oeffneSpeicher } from '../public/lib/speicher.js';
import { starteApp } from '../public/app.js';
import { erstelleVorschauLaptop } from './laptop-nachbau.js';

try { if (localStorage.getItem('ra-design') === 'hell') document.documentElement.dataset.design = 'hell'; } catch { /* ohne Speicher: Standard-Design */ }
const laptop = await erstelleVorschauLaptop();
const speicher = await oeffneSpeicher('rechnungapp-vorschau-geraet');
starteApp({ speicher, transport: laptop.transport, modus: 'vorschau', wurzel: document.getElementById('app'), vorschau: laptop });
