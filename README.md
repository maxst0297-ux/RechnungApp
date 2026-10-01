# RechnungApp

Rechnungen für den Handwerksbetrieb – Schwester-App von **MyDesk** (gleiche Bedienung, gleiches Design „Nacht & Gold",
eigene Daten). Auf der Baustelle Notizen diktieren und fotografieren – direkt der Baustelle zugeordnet –, am Laptop oder
Handy daraus rechtssichere Rechnungen erstellen, zum Drucken und Verschicken. Im Leistungskatalog sind die Leistungen
nach Kategorien geordnet, damit man sie schnell findet – die Rechnung selbst bleibt eine einfache Liste.

**Stand:** zweite Version (Entwurf) – Kategorien, Baustellen, Notizen mit Diktat. Was fertig ist und was als Nächstes kommt: [FAHRPLAN.md](FAHRPLAN.md), Abschnitt 0.
Muster-Rechnung: [docs/Muster-Rechnung.pdf](docs/Muster-Rechnung.pdf).

## So funktioniert es

- **Der Laptop ist die Hauptablage.** Ein kleiner Server (`server.js`) speichert alles im Ordner `~/RechnungApp`:
  - `Daten/rechnungapp.sqlite` – Kunden, Leistungen, Kategorien, Baustellen, Notizen, Rechnungen, Änderungsprotokoll
  - `Archiv/Rechnungen/<Jahr>/` – jede festgeschriebene Rechnung als PDF, schreibgeschützt, mit Prüfsumme
  - `Archiv/Notizen/<Jahr>/<Monat>/` – Fotos und Sprachaufnahmen vom Handy
  - `Modelle/` – Sprachmodell zum Abtippen von Aufnahmen (siehe „Diktat")
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
| `RA_WHISPER` | Pfad zu `whisper-cli`, falls nicht automatisch gefunden | `PATH`, `/opt/homebrew/bin`, `/usr/local/bin` |
| `RA_WHISPER_MODELL` | bestimmtes Sprachmodell statt des besten im Ordner `Modelle` | – |

Den Ablageordner **nicht** in einen iCloud-/Dropbox-Ordner legen (die Datenbank verträgt kein Synchronisieren von
außen). Time Machine sichert ihn ganz normal mit.

## Handy verbinden (Tailscale)

1. Tailscale auf Laptop und iPhone installieren, mit demselben Konto anmelden. In der Tailscale-Verwaltung
   (DNS-Einstellungen) **MagicDNS** und **HTTPS-Zertifikate** einschalten.
2. Auf dem Laptop: `tailscale serve --bg --https=443 http://127.0.0.1:4200`
3. Die angezeigte Adresse (`https://<laptop-name>.<tailnet>.ts.net`) auf dem iPhone in Safari öffnen →
   Teilen → „Zum Home-Bildschirm".

Ab dann startet die App auch ohne Verbindung und gleicht sich ab, sobald der Laptop an ist – zu Hause und unterwegs.

## Notizen, Baustellen und Diktat

- **Bedienung am Handy:** unten Übersicht · Baustellen · ⊕ · Rechnungen · Mehr (Notizen, Kunden, Leistungen,
  Einstellungen). Das goldene ⊕ in der Mitte legt eine **Notiz** oder eine **Rechnung** an. Am Laptop steht alles in
  der Seitenleiste, „Neu" oben.
- **Notiz:** oben die Baustelle wählen – die zuletzt benutzte ist am selben Tag schon
  gewählt, eine neue lässt sich direkt anlegen. Dann diktieren oder tippen, Fotos dazu, speichern. Nennt der Text eine
  Baustelle, ihre Straße oder einen Kunden mit genau einer laufenden Baustelle, ordnet die App sie selbst zu.
- **Baustelle:** Bautagebuch mit allen Notizen, Fotos und Aufnahmen nach Tagen. „Rechnung erstellen" übernimmt alle
  offenen Notizen: erkannte Leistungen und Mengen werden zusammengezählt, Leistungszeitraum, Kunde und
  „Bauvorhaben: …" im Betreff kommen von selbst. Beim Festschreiben gelten die Notizen als abgerechnet.
- **Diktat – zwei Wege** (Einstellungen → Diktat, je Gerät):
  - *Live mitschreiben:* Der Text erscheint beim Sprechen (Safari-Tab am iPhone, Safari/Chrome am Mac). Die Erkennung
    macht der Browser-Anbieter (Apple bzw. Google).
  - *Aufnahme → Laptop:* Die App nimmt auf, die Aufnahme geht nur an den Laptop und wird dort **offline** abgetippt.
    Klappt auch ohne Netz und in der iPhone-App vom Home-Bildschirm (dort ist Live nicht möglich – die App nimmt dann
    automatisch auf). Die Mikrofon-Taste der iPhone-Tastatur funktioniert in jedem Textfeld zusätzlich.

### Abtippen auf dem Laptop einrichten (einmalig, Mac)

```bash
brew install whisper-cpp
mkdir -p ~/RechnungApp/Modelle
curl -L -o ~/RechnungApp/Modelle/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

`ggml-small.bin` (knapp 500 MB) ist ein guter Start; genauer, aber größer ist `ggml-large-v3-turbo.bin` (1,6 GB). Liegen
mehrere Modelle im Ordner, nimmt die App das genaueste. Neue Aufnahmen werden ohne Neustart abgetippt; Aufnahmen, die
schon vorher gewartet haben, beim nächsten Start des Servers. Ob alles bereit ist, zeigt Einstellungen → Diktat. Die Wörter aus deinem
Leistungskatalog, die Baustellen und Kundennamen gibt die App dem Modell als Hinweis mit – das verbessert die Erkennung
von Fachbegriffen wie „Eckventil".

## Vorschau und Tests

```bash
npm test          # Rechnen, Rechts-Check, GiroCode, Erkennung, Diktat, Server mit zwei Geräten und Abtippen
npm run vorschau  # preview/dist/rechnungapp-vorschau.html – Oberfläche mit Beispieldaten, Laptop im Browser nachgebildet
npm run muster    # docs/Muster-Rechnung.pdf – z. B. zum Prüfen durch den Steuerberater
```

## Aufbau

```
server.js                 Laptop-Server: Abgleich, Festschreiben, PDF, Dateien, Sicherung, Live-Meldungen
src/datenbank.js          SQLite (in Node eingebaut) mit Änderungsprotokoll und Prüfsummen-Kette
src/rechnung-pdf.js       Rechnungs-PDF nach DIN 5008 mit GiroCode
src/diktat.js             Sprachaufnahmen abtippen mit whisper.cpp (offline)
public/                   App für Handy und Laptop (ohne Build-Schritt)
  app.js, app.css         Oberfläche
  start.js, sw.js         Start und Offline-Betrieb (Service Worker)
  lib/                    gemeinsame Logik – läuft im Browser und auf dem Server:
    berechnung.js           Beträge in Cent, Umsatzsteuer je Steuersatz (EN 16931)
    pruefung.js             Rechts-Check: Pflichtangaben § 14 UStG, § 13b, § 35a, Hinweise
    festschreiben.js        Druckfassung, Nummernformat, Zahlungsstand
    blatt.js                Seitenansicht der Rechnung (wie das PDF)
    abgleich-kern.js        Abgleich auf dem Laptop (Konflikte, Schutz festgeschriebener Rechnungen)
    abgleich-client.js      Abgleich auf dem Gerät
    speicher.js             Gerätespeicher (IndexedDB) mit Ausgang
    vorschlaege.js          Notiz/Diktat → Baustelle, Kunde, Leistungen, Mengen (Zahlwörter, Abkürzungen)
    diktat.js               Live-Diktat (Browser) und Sprachaufnahme als WAV
    girocode.js, brief.js   GiroCode (EPC-QR) und Briefbausteine
vorschau/                 Beispieldaten und nachgebildeter Laptop für die Vorschau
scripts/                  Vorschau bauen, Muster-Rechnung erzeugen
test/                     automatische Tests
```

Keine Steuer- oder Rechtsberatung – den Rechnungsaufbau vor dem ersten echten Einsatz einmal vom Steuerberater prüfen
lassen (Muster-Rechnung siehe oben).
