// Baut die Vorschau als EINE HTML-Datei (ohne Server, mit Beispieldaten): preview/dist/rechnungapp-vorschau.html
// Echte Oberfläche aus public/, der Laptop wird im Browser nachgebildet (vorschau/laptop-nachbau.js).
// Aufruf:  npm run vorschau
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const aus = join(root, 'preview', 'dist');
fs.mkdirSync(aus, { recursive: true });

const ergebnis = await build({
  entryPoints: [join(root, 'vorschau', 'start-vorschau.js')], bundle: true, format: 'esm', target: ['es2022'],
  minify: true, write: false, legalComments: 'none', charset: 'utf8'
});
const js = ergebnis.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// Schriften als data:-URI einbetten (die Vorschau lädt nichts nach)
let css = fs.readFileSync(join(root, 'public', 'app.css'), 'utf8');
css = css.replace(/url\(fonts\/([\w.-]+\.woff2)\)/g, (_, datei) => `url(data:font/woff2;base64,${fs.readFileSync(join(root, 'public', 'fonts', datei)).toString('base64')})`);

const html = `<title>RechnungApp</title>
<meta name="theme-color" content="#1f1f21">
<style>${css}</style>
<script>try{if(localStorage.getItem('ra-design')==='hell')document.documentElement.dataset.design='hell'}catch(e){}</script>
<div id="app"><div style="min-height:60vh;display:grid;place-items:center;font-family:system-ui;color:#ecebe8">RechnungApp wird geladen …</div></div>
<script type="module">${js}</script>
`;
const ziel = join(aus, 'rechnungapp-vorschau.html');
fs.writeFileSync(ziel, html);
console.log(`Vorschau gebaut: ${ziel} (${Math.round(html.length / 1024)} KB)`);
