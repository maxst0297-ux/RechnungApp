// Start der echten App (vom Laptop-Server ausgeliefert): Gerätespeicher öffnen, mit dem Laptop verbinden, Oberfläche zeigen.
import { oeffneSpeicher } from './lib/speicher.js';
import { httpTransport } from './lib/transport-http.js';
import { starteApp } from './app.js';

// Service Worker: hält die App auf dem Handy bereit, auch wenn der Laptop gerade aus ist (braucht HTTPS, z. B. über Tailscale).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('Service Worker nicht registriert:', e));
}
// Den Browser bitten, die Gerätedaten nicht bei Platzmangel zu löschen.
navigator.storage?.persist?.().catch(() => {});

const speicher = await oeffneSpeicher('rechnungapp');
starteApp({ speicher, transport: httpTransport(), modus: 'echt', wurzel: document.getElementById('app') });
