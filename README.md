# RechnungApp

Rechnungen für den Handwerksbetrieb – Schwester-App von **MyDesk** (gleiche Bedienung, gleiches Design „Nacht & Gold",
eigene Daten). Am Handy erfassen (Foto, Notiz, Diktat), am Laptop oder Handy daraus rechtssichere Rechnungen erstellen –
zum Drucken und Verschicken.

**Stand:** erste Version (Entwurf). Was fertig ist und was als Nächstes kommt: [FAHRPLAN.md](FAHRPLAN.md), Abschnitt 0.
Muster-Rechnung: [docs/Muster-Rechnung.pdf](docs/Muster-Rechnung.pdf).

## So funktioniert es

- **Der Laptop ist die Hauptablage.** Ein kleiner Server (`server.js`) speichert alles im Ordner `~/RechnungApp`:
  - `Daten/rechnungapp.sqlite` – Kunden, Leistungen, Rechnungen, Erfassungen, Änderungsprotokoll
  - `Archiv/Rechnungen/<Jahr>/` – jede festgeschriebene Rechnung als PDF, schreibgeschützt, mit Prüfsumme
  - `Archiv/Erfassungen/` – Fotos vom Handy
  - `Sicherungen/` – jeden Tag eine vollständige Kopie der Datenbank (30 Tage)
- **Handy und Laptop arbeiten gleichzeitig.** Jedes Gerät hat eine eigene Kopie der Daten und funktioniert auch ohne
  Verbindung. Sobald der Laptop erreichbar ist, gleichen sich beide ab – in beide Richtungen, bei offener App sofort.
- **Nummern vergibt nur der Laptop.** „Festschreiben" am Handy wird vorgemerkt; der Laptop prüft die Rechnung
  (Rechts-Check), vergibt die nächste Nummer, erzeugt das PDF und legt es ab. Danach ist die Rechnung unveränderbar
  (GoBD) – Korrekturen nur per Storno.

## Starten auf dem Laptop

Voraussetzung: [Node.js 24 LTS](https://nodejs.org) (oder neuer; mindestens 22.13).

```bash
npm install
npm start
```

Dann im Browser: <http://localhost:4200>. Auf dem Mac lässt sich die Seite in Safari über „Ablage → Zum Dock hinzufügen"
wie ein Programm starten.

Einstellungen über Umgebungsvariablen:

| Variable | Bedeutung | Standard |
|---|---|---|
| `RA_ORDNER` | Ablageordner | `~/RechnungApp` |
| `PORT` | Port des Servers | `4200` |
| `RA_PIN` | PIN-Abfrage für alle Geräte | aus |
| `RA_HOST` | Adresse, auf der der Server lauscht | `127.0.0.1` (nur der Laptop selbst) |

Den Ablageordner **nicht** in einen iCloud-/Dropbox-Ordner legen (die Datenbank verträgt kein Synchronisieren von
außen). Time Machine sichert ihn ganz normal mit.

## Handy verbinden (Tailscale)

1. Tailscale auf Laptop und iPhone installieren, mit demselben Konto anmelden. In der Tailscale-Verwaltung
   (DNS-Einstellungen) **MagicDNS** und **HTTPS-Zertifikate** einschalten.
2. Auf dem Laptop: `tailscale serve --bg --https=443 http://127.0.0.1:4200`
3. Die angezeigte Adresse (`https://<laptop-name>.<tailnet>.ts.net`) auf dem iPhone in Safari öffnen →
   Teilen → „Zum Home-Bildschirm".

Ab dann startet die App auch ohne Verbindung und gleicht sich ab, sobald der Laptop an ist – zu Hause und unterwegs.

## Vorschau und Tests

```bash
npm test          # Rechnen, Rechts-Check, GiroCode, Erkennung, Server mit zwei Geräten
npm run vorschau  # preview/dist/rechnungapp-vorschau.html – Oberfläche mit Beispieldaten, Laptop im Browser nachgebildet
npm run muster    # docs/Muster-Rechnung.pdf – z. B. zum Prüfen durch den Steuerberater
```

## Aufbau

```
server.js                 Laptop-Server: Abgleich, Festschreiben, PDF, Dateien, Sicherung, Live-Meldungen
src/datenbank.js          SQLite (in Node eingebaut) mit Änderungsprotokoll und Prüfsummen-Kette
src/rechnung-pdf.js       Rechnungs-PDF nach DIN 5008 mit GiroCode
public/                   App für Handy und Laptop (ohne Build-Schritt)
  app.js, app.css         Oberfläche
  start.js, sw.js         Start und Offline-Betrieb (Service Worker)
  lib/                    gemeinsame Logik – läuft im Browser und auf dem Server:
    berechnung.js           Beträge in Cent, Umsatzsteuer je Steuersatz (EN 16931)
    pruefung.js             Rechts-Check: Pflichtangaben § 14 UStG, § 13b, § 35a, Hinweise
    festschreiben.js        Druckfassung, Nummernformat, Zahlungsstand
    abgleich-kern.js        Abgleich auf dem Laptop (Konflikte, Schutz festgeschriebener Rechnungen)
    abgleich-client.js      Abgleich auf dem Gerät
    speicher.js             Gerätespeicher (IndexedDB) mit Ausgang
    vorschlaege.js          Notiz/Diktat → Kunde, Leistungen, Mengen
    girocode.js, brief.js   GiroCode (EPC-QR) und Briefbausteine
vorschau/                 Beispieldaten und nachgebildeter Laptop für die Vorschau
scripts/                  Vorschau bauen, Muster-Rechnung erzeugen
test/                     automatische Tests
```

Keine Steuer- oder Rechtsberatung – den Rechnungsaufbau vor dem ersten echten Einsatz einmal vom Steuerberater prüfen
lassen (Muster-Rechnung siehe oben).
