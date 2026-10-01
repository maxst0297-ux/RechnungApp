# RechnungApp – Fahrplan

**Stand:** 1. Oktober 2026 · **Grundlage:** MyDesk (Version vom 28.09.2026) · **Status:** erste Version gebaut (Entwurf) – Stand und neue Reihenfolge in Abschnitt 0

> **Wichtig:** Dieser Fahrplan fasst die Rechtslage nach bestem Wissen zusammen (Stand Oktober 2026). Er ist keine
> Steuer- oder Rechtsberatung. Bevor die erste echte Rechnung rausgeht, sollte ein Steuerberater einmal über die
> Musterrechnungen und die Einstellungen schauen (eingeplant in Etappe 3).

## Inhalt

0. [Stand und Entscheidungen (Update)](#0-stand-und-entscheidungen-update-1-oktober-2026)
1. [Kurzfassung](#1-kurzfassung)
2. [Was MyDesk schon mitbringt](#2-was-mydesk-schon-mitbringt)
3. [Grundsatzentscheidung: eigene App neben MyDesk](#3-grundsatzentscheidung-eigene-app-neben-mydesk)
4. [Rechtlicher Rahmen](#4-rechtlicher-rahmen-stand-oktober-2026)
5. [Was das System beinhalten muss](#5-was-das-system-beinhalten-muss)
6. [So sieht die fertige Rechnung aus](#6-so-sieht-die-fertige-rechnung-aus-muster)
7. [Technik und Aufbau](#7-technik-und-aufbau)
8. [Der Fahrplan in Etappen](#8-der-fahrplan-in-etappen)
9. [Voraussetzungen – Checkliste](#9-voraussetzungen--checkliste)
10. [Offene Fragen an dich](#10-offene-fragen-an-dich)
11. [Risiken und Grenzen](#11-risiken-und-grenzen)
12. [Nächste Schritte](#12-nächste-schritte)
13. [Quellen](#quellen-abgerufen-am-1-oktober-2026)

---

## 0. Stand und Entscheidungen (Update 1. Oktober 2026)

**Deine Antworten**
- Handwerksbetrieb (Firma), **umsatzsteuerpflichtig** – also Regelbesteuerung, kein Kleinunternehmer.
- Kunden: **Privatleute, Firmen und Behörden** (Anteile offen).
- **Gespeichert wird auf dem Laptop**, nicht auf der NAS. Handy und Laptop arbeiten gleichzeitig und gleichen sich
  gegenseitig ab.

**Was sich dadurch ändert**

| Thema | Vorher geplant | Jetzt |
|---|---|---|
| Hauptablage | QNAP-NAS (Docker) | Laptop: Ordner `~/RechnungApp` mit Datenbank, Archiv und Sicherungen |
| Handy | öffnet die App auf der NAS (nur mit Verbindung) | eigene Kopie auf dem Handy, arbeitet auch offline; Abgleich, sobald der Laptop erreichbar ist |
| Verbindung | Tailscale zur NAS | Tailscale zum Laptop (HTTPS über `tailscale serve`) – funktioniert auch unterwegs |
| Gleichzeitig arbeiten | – | Jede Änderung wird fortlaufend gezählt. Ändern zwei Geräte denselben Eintrag, gewinnt die neuere Änderung, die ältere bleibt im Protokoll. Rechnungs- und Kundennummern vergibt nur der Laptop. |
| Sicherung | NAS + USB-Platte | tägliche Kopie der Datenbank + Time Machine auf eine externe Platte + eine Kopie außer Haus |
| E-Rechnung | Etappe 7 | **vorgezogen**: Behörden verlangen schon heute XRechnung; Firmenkunden ab 1.1.2028 (bzw. 1.1.2027 bei mehr als 800.000 € Vorjahresumsatz) |
| Handwerk | allgemein | Ausweis der Arbeitskosten (§ 35a EStG), § 13b (Bauleistung an Bauunternehmer) und Grundstückshinweise sind eingebaut; Abschlags- und Schlussrechnungen rücken vor |

**Update: Kategorien, Baustellen, Notizen mit Diktat (zweite Version)**
- **Leistungs-Kategorien:** eigene Kategorien mit Farbe und Reihenfolge (Vorschlag zum Start: Arbeitszeit, Material,
  Anfahrt & Fahrtkosten, Wartung & Kundendienst, Sonstiges). Nur im Katalog der App – gruppiert und filterbar, auch
  bei „Aus Katalog" in der Rechnung –, damit man Leistungen schnell findet. Die Rechnung selbst wird nicht gegliedert
  (deine Entscheidung).
- **Baustellen:** Name, Kunde, Adresse, Stand (laufend/abgeschlossen); Nummer `B-0001` vom Laptop. Je Baustelle ein
  Bautagebuch und „Rechnung erstellen" aus allen offenen Notizen.
- **Bedienung, schlicht:** Reiter Übersicht · Baustellen · ⊕ · Rechnungen · Mehr; das goldene ⊕ legt eine Notiz oder
  eine Rechnung an. Notiz als eigener ruhiger Bildschirm, Notizen als antippbare Karten, weniger Knöpfe und Texte.
- **Notiz** statt „Erfassen": Baustelle mit einem Tipp (zuletzt benutzte vorgewählt,
  neue direkt anlegbar, Erkennung aus dem Text), Diktat, Fotos, Datum. Notizen sind offen → in Rechnung →
  abgerechnet (oder ohne Rechnung erledigt). Ungespeicherte Notizen übersteht das Schließen der App.
- **Diktat:** live über die Spracherkennung des Browsers oder als Aufnahme, die der Laptop offline mit whisper.cpp
  abtippt (für die iPhone-App vom Home-Bildschirm und ohne Netz). Mehrere Aufnahmen hängen sich an dieselbe Notiz.
  Die Erkennung versteht jetzt auch Zahlwörter („zweieinhalb Stunden"), Abkürzungen („8 Std. Helfer"), Ortsangaben
  („Eckventil unter dem Waschtisch") und hält Hausnummern, Daten und Beträge nicht für Mengen.
- **Geprüft:** 17 automatische Tests, darunter der Server mit einem Ersatz für whisper.cpp. Mit echtem Server, zwei
  Browsern und Test-Mikrofon durchgespielt: Notiz mit Foto vom Handy ist nach unter 1 Sekunde am Laptop →
  Rechnung aus der Baustelle → festgeschrieben → Handy zeigt „abgerechnet"; Aufnahme am Handy → am Laptop abgetippt →
  Text und erkannte Positionen am Handy; Notiz ohne Verbindung kommt später an.

**Was schon gebaut ist (erste Version)**
- **Laptop-Server** (`server.js`): SQLite-Datenbank, Abgleich mit beliebig vielen Geräten, Live-Meldung an offene
  Geräte, Festschreiben mit Nummernvergabe, PDF nach DIN 5008 mit GiroCode, schreibgeschütztes Archiv mit
  SHA-256-Prüfsumme, Änderungsprotokoll mit Prüfsummen-Kette, tägliche Sicherung, optional PIN.
- **App für Handy und Laptop:** Übersicht; Rechnungen mit Editor, Live-Blatt und Rechts-Check; festgeschriebene
  Rechnung mit Zahlungen und Storno; Kunden (Privat/Firma/Behörde, § 13b, Leitweg-ID, Zustimmung zur Mail-Rechnung,
  wiederkehrende Positionen); Leistungskatalog, der mitwächst; Erfassen mit Foto und Notiz/Diktat inklusive
  Erkennung von Kunde, Leistungen und Mengen; Eingang; Einstellungen.
- **Offline:** Das Handy startet auch ohne Laptop, speichert alles auf dem Gerät und überträgt es später.
- **Geprüft:** 11 automatische Tests (Rechnen, Rechts-Check, GiroCode, Erkennung, Server mit zwei Geräten). Im
  Browser durchgespielt: Handy erfasst → Laptop sieht es nach etwa 1 Sekunde → Laptop schreibt fest → Handy sieht die
  Nummer; Handy offline → überträgt später automatisch.
- **Zum Ansehen:** eine Vorschau mit Beispieldaten (der Laptop wird im Browser nachgebildet) und eine
  Muster-Rechnung als PDF (`docs/Muster-Rechnung.pdf`, neu erzeugen mit `npm run muster`).

**Neue Reihenfolge der Etappen**

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Grundgerüst: Laptop-Server, Abgleich, Sicherung | erste Version fertig |
| 2 | Kunden und Leistungskatalog | erste Version fertig |
| 3 | Rechnung, Rechts-Check, PDF, Storno, Zahlungen | erste Version fertig – Prüfung der Muster-Rechnung durch den Steuerberater offen |
| 4 | Einrichtung auf deinem Laptop (Autostart, Tailscale, Time Machine), deine echten Leistungen und Kunden | als Nächstes |
| 5 | E-Rechnung: XRechnung (Behörden) und ZUGFeRD (Firmen), automatische Prüfung vor dem Versand | vorgezogen |
| 6 | Mailversand direkt aus der App, Zahlungserinnerung und Mahnungen | danach |
| 7 | Abschlags- und Schlussrechnungen, Angebote | für Handwerk vorgezogen |
| 8 | Erfassen ausbauen: Diktat mit Whisper ✓ (zweite Version), Dokument-Scanner aus MyDesk, Texterkennung für Belege, Kurzbefehl | Diktat fertig, Rest danach |
| 9 | Wiederkehrende Rechnungen, Auswertungen, Steuer-Export, Verfahrensdokumentation | danach |

**Noch offen – bitte beantworten**
1. Versteuerst du nach **Ist oder Soll**? (Steht im Steuerbescheid, sonst weiß es der Steuerberater.)
2. Lag der **Gesamtumsatz 2026 über 800.000 €**? Dann muss die E-Rechnung an Firmen schon ab 1.1.2027 laufen.
3. **Welches Gewerk** genau (z. B. Sanitär/Heizung, Elektro, Maler)? Dann passe ich Startkatalog und Beispiele an.
4. Ist der Laptop ein **Mac**, und ist er tagsüber meist an? Davon hängt ab, wie schnell sich das Handy abgleicht.
5. Über welches **Mail-Postfach** (Anbieter) sollen die Rechnungen später rausgehen?
6. Gibt es einen **Steuerberater**, und arbeitet er mit DATEV?
7. **Kategorien:** Passen die vorgeschlagenen, oder ordnest du lieber nach Gewerk/Bauabschnitt (z. B. Demontage,
   Rohinstallation, Fliesen, Endmontage)? Mit deiner Leistungsliste lege ich sie gleich passend an.

---

## 1. Kurzfassung

**Ziel:** Eine App, mit der du am Handy festhältst, was du beim Kunden gemacht hast (Foto, Text, Sprache), und am
Laptop – oder direkt am Handy – daraus mit wenigen Tipps eine fertige, rechtlich korrekte Rechnung machst: zum Mailen
und zum Drucken. Kunden, Leistungen und Preise wachsen als Datenbestand mit; Wiederkehrendes ist vorangehakt, Beträge
bleiben änderbar.

**Die fünf wichtigsten Empfehlungen**

1. **Eigene App „RechnungApp" neben MyDesk** – gleiche Technik, gleiches Design, aber getrennte Daten.
   Geschäftliches gehört nicht zu den Gesundheitsdaten in MyDesk.
2. **Laptop als Hauptablage, Handy mit eigener Kopie:** Beide arbeiten gleichzeitig und gleichen sich über Tailscale
   ab. Was du am Handy fotografierst oder diktierst, liegt Sekunden später im „Eingang" am Laptop – ohne Verbindung
   wartet es auf dem Handy.
3. **Recht von Anfang an eingebaut:** Pflichtangaben-Prüfung, fortlaufende Nummern, Festschreiben statt Löschen
   (GoBD), passende Steuerhinweise automatisch.
4. **E-Rechnung von Anfang an mitgedacht:** Die Daten werden so gespeichert, dass ZUGFeRD/XRechnung später ohne Umbau
   möglich sind – Pflicht bei Firmenkunden spätestens ab 1.1.2028.
5. **Schritt für Schritt:** Erste echte Rechnung nach Etappe 3, Handy-Erfassung mit Sprache in Etappe 5, Automatik
   für Wiederkehrendes in Etappe 6.

**Deine Wünsche – und wo sie im Fahrplan landen**

| Dein Wunsch | Umsetzung | Etappe |
|---|---|---|
| Rechnungen automatisch erstellen | Rechnungsassistent; Entwürfe aus Erfassungen und Abos | 3, 5, 6 |
| nach den offiziellen, rechtlichen Richtlinien | Rechts-Check, Pflichtangaben, GoBD, E-Rechnung | 3, 7, 8 |
| Schnittstelle Handy ↔ Laptop | Laptop speichert, Handy hat eine eigene Kopie, gegenseitiger Abgleich, Live-„Eingang" | 1, 5 |
| fotografieren mit Texterkennung | Scanner und Texterkennung aus MyDesk | 5 |
| Spracherkennung | iPhone-Diktat, Kurzbefehl, später Whisper auf dem Laptop | 5 |
| Wiederkehrendes anklicken | Standardpositionen je Kunde (vorangehakt), Favoriten, „wie letzte Rechnung" | 2, 3 |
| Beträge anpassen | jede Position im Entwurf änderbar, Kundenpreise | 2, 3 |
| Datenbestand, der mitwächst | Leistungskatalog lernt aus jeder Rechnung | 2, 5 |
| Kunden anlegen | Kundenverwaltung, Import aus Excel, Kontakten oder per Foto | 2 |
| per Mail und zum Drucken | PDF (DIN 5008, Fensterumschlag), Mailversand, Teilen-Menü | 3, 4 |
| einfache Oberfläche für Handy und PC | Bedienung wie MyDesk, am PC zweispaltig | alle |

---

## 2. Was MyDesk schon mitbringt

Gute Nachricht: Ein großer Teil der Technik existiert schon und ist im Alltag erprobt. Ich habe den Code
(Stand 28.09.2026) durchgesehen:

| Baustein | in MyDesk | Verwendung in der RechnungApp |
|---|---|---|
| Installierbare App für Handy und Laptop, Design „Nacht & Gold" + Themes | `public/app.js`, `app.css`, `styles.css` | gleiche Bedienung und Optik |
| Server (Node/Express) mit Komprimierung, Ladebalken, Fehlerprotokoll | `server.js` | Grundgerüst |
| Dokument-Scanner (Kantenerkennung, Entzerren, Filter, mehrseitig) | `public/scan.js` | Belege und Arbeitsnachweise fotografieren – fast unverändert |
| Texterkennung offline (Tesseract deutsch, `pdftotext`), am Handy und auf der NAS | `extract.js`, `app.js` | Material-Belege, Briefköpfe, Visitenkarten auslesen |
| „Texterkennung lernt mit" (Absender an IBAN, USt-IdNr., Mail-Domain erkennen) | `lernen.js` | Lieferanten und Kunden wiedererkennen; dasselbe Prinzip für Vorschläge aus Text und Sprache |
| Rote Markierung „noch nicht geprüft" | `app.js` | für alles, was die App selbst vorschlägt |
| PDF-Erzeugung (pdf-lib) | `paket.js` | Ausgangspunkt fürs Rechnungs-PDF |
| Excel- und ZIP-Export | `export.js` | Rechnungsausgangsbuch, Jahresexport für den Steuerberater |
| Erinnerungen per Push, Kalender mit Fristen | `server.js`, `app.js`, `sw.js` | Fälligkeiten, Mahnungen, „Rechnungen bereit zur Freigabe" |
| PIN und Face ID (Passkey) | `server.js`, `app.js` | Zugangsschutz – hier für die ganze App |
| Tägliche Sicherung, USB-Spiegel, Prüfbericht | `server.js`, `mydesk-autobuild.sh` | übernehmen, dazu Prüfsummen für Rechnungen |
| Auto-Update von GitHub, Docker, HTTPS über Tailscale | `mydesk-einrichten.sh`, `mydesk-autobuild.sh`, `docker-compose.yml` | auf dem Laptop ersetzt durch Autostart und `git pull` |
| Teilen-Menü (Mail, Dateien …) | `app.js` | Rechnung am Handy weitergeben |
| Vorschau ohne NAS | `scripts/build-preview.mjs`, `preview/demo-api.js` | neue Oberflächen vorab im Browser testen |

**Was ganz neu entsteht:** Kunden, Leistungskatalog, Rechnungsassistent, Nummernkreise, Festschreiben mit
Änderungsprotokoll, Rechts-Check, Rechnungs-PDF nach DIN 5008 mit QR-Code zum Bezahlen, E-Rechnung, Mailversand,
Zahlungen und Mahnwesen, wiederkehrende Rechnungen, Eingang mit Sprachnotizen, Auswertungen für Umsatzsteuer und EÜR,
Verfahrensdokumentation.

**Nebenbefund:** MyDesk läuft im Container auf Node 20 (`node:20-alpine`). Node 20 bekommt seit dem 30.04.2026 keine
Sicherheitsupdates mehr. Die RechnungApp startet deshalb auf Node 24 (unterstützt bis 30.04.2028); MyDesk sollte bei
Gelegenheit nachziehen.

---

## 3. Grundsatzentscheidung: eigene App neben MyDesk

**Empfehlung:** eigene App „RechnungApp" (dieses Repo) als Schwester von MyDesk – so wie MyDesk damals aus
GesundZurück entstanden ist.

Warum nicht einfach ein weiteres Projekt in MyDesk?

1. **Privat und geschäftlich trennen.** MyDesk enthält Gesundheitsdaten (Arztrechnungen, Befunde). Die sind nach
   DSGVO besonders geschützt. Bei einer Prüfung darf das Finanzamt Einsicht in das System nehmen, mit dem du
   Rechnungen erstellst und aufbewahrst – private Befunde haben dort nichts zu suchen.
2. **Andere Spielregeln.** In MyDesk darfst du alles jederzeit ändern und löschen. Eine geschriebene Rechnung
   dagegen darf nicht mehr verändert werden; Fehler werden per Storno oder Korrektur behoben (GoBD).
3. **Eigene Aufbewahrung.** Rechnungen müssen 8 Jahre lesbar bleiben. Mit eigener Datenbank, eigener Sicherung und
   eigenem Archivordner lässt sich das sauber nachweisen.
4. **Trotzdem vertraut.** Gleiche Technik, gleiches Design, gleiche Bedienung. Bewährte Teile
   werden übernommen statt neu geschrieben.
5. **Verbindung bleibt möglich.** Eine Kachel auf der MyDesk-Startseite kann die RechnungApp öffnen.

---

## 4. Rechtlicher Rahmen (Stand Oktober 2026)

### 4.1 Pflichtangaben einer Rechnung (§ 14 Abs. 4 UStG) – und woher die App sie nimmt

| Pflichtangabe | Woher in der App |
|---|---|
| Vollständiger Name und Anschrift von dir **und** vom Kunden | Stammdaten „Mein Unternehmen" und Kundendaten. Beides wird beim Festschreiben in die Rechnung kopiert, damit eine spätere Adressänderung alte Rechnungen nicht verändert |
| Deine Steuernummer **oder** USt-IdNr. (nicht die persönliche Steuer-ID!) | Stammdaten, Pflichtfeld mit Formatprüfung |
| Ausstellungsdatum | automatisch beim Festschreiben |
| Fortlaufende, einmalige Rechnungsnummer | Nummernkreis; wird erst beim Festschreiben vergeben |
| Menge und handelsübliche Bezeichnung der Leistung | Positionen aus dem Leistungskatalog; Warnung bei zu knappen Texten wie „Arbeiten" |
| Zeitpunkt der Leistung (Datum oder Zeitraum, der Monat genügt) | Pflichtfeld im Assistenten, Vorschlag aus den Erfassungen |
| Entgelt nach Steuersätzen aufgeschlüsselt, dazu vorab vereinbarte Minderungen (z. B. Skonto) | automatische Berechnung; Skonto aus den Zahlungsbedingungen |
| Steuersatz und Steuerbetrag – oder Hinweis auf die Steuerbefreiung | automatisch nach deinem Steuerstatus und der Art der Leistung |
| Bei Arbeiten an Haus/Grundstück für Privatkunden: Hinweis auf deren 2-jährige Aufbewahrungspflicht | automatisch, wenn Kunde „privat" und Leistung „am Grundstück" |
| Bei Gutschriften: das Wort „Gutschrift" | nur, falls du Gutschriften nutzt |

**Kleinunternehmer** (§ 19 UStG) haben seit 2025 vereinfachte Pflichtangaben (§ 34a UStDV): Name und Anschrift
beider Seiten, Steuernummer oder USt-IdNr., Ausstellungsdatum, Menge und Art der Leistung, Betrag in einer Summe und
ein Hinweis auf die Steuerbefreiung für Kleinunternehmer. Die App schreibt trotzdem immer Rechnungsnummer und
Leistungsdatum dazu – für Ordnung, Mahnungen und Nachvollziehbarkeit.

**Kleinbetragsrechnungen** (bis 250 € brutto, § 33 UStDV) brauchen weniger Angaben. Die App erstellt trotzdem immer
die vollständige Rechnung – das kostet nichts und vermeidet Sonderfälle.

### 4.2 Sonderfälle – was die App automatisch ergänzt („Rechts-Check")

| Situation | Was die App macht |
|---|---|
| Du bist Kleinunternehmer (Umsatz Vorjahr ≤ 25.000 €, laufendes Jahr ≤ 100.000 €) | keine Umsatzsteuer; Hinweis z. B. „Umsatzsteuerfrei aufgrund der Kleinunternehmerregelung (§ 19 UStG)". Steuerfelder sind gesperrt – wer Steuer ausweist, ohne es zu dürfen, schuldet sie trotzdem (§ 14c UStG) |
| Du bist regelbesteuert | 19 % bzw. 7 % je Position, Steuer je Steuersatz auf die Summe |
| Du versteuerst nach Ist (vereinnahmten Entgelten) – **ab 1.1.2028** | neue Pflichtangabe: Hinweis „Versteuerung nach vereinnahmten Entgelten" |
| Privatkunde, Arbeiten in Haus, Wohnung oder Garten | Arbeits-, Maschinen- und Fahrtkosten getrennt vom Material ausweisen (der Kunde kann 20 % davon steuerlich absetzen, § 35a EStG – nur bei Überweisung, nicht bar); dazu der 2-Jahres-Aufbewahrungshinweis |
| Firmenkunde im Inland | bis Ende 2027 PDF (mit Zustimmung) möglich, ab 2028 E-Rechnung (siehe 4.3) |
| Behörde | XRechnung mit Leitweg-ID |
| Bauleistung an einen Bauunternehmer (§ 13b UStG) | keine Steuer, Hinweis „Steuerschuldnerschaft des Leistungsempfängers" |
| Firmenkunde in einem anderen EU-Land | Reverse Charge, USt-IdNr. beider Seiten, Zusammenfassende Meldung – nur falls du solche Kunden hast |
| Steuerfreie Leistung (§ 4 UStG, z. B. bestimmte Unterrichts- oder Heilberufsleistungen) | Hinweis auf die Steuerbefreiung mit Grund |
| Rechnung mehr als 6 Monate nach der Leistung (Firmenkunde oder Grundstücksleistung) | Warnung – Frist nach § 14 Abs. 2 UStG, bei Verstoß ist ein Bußgeld bis 5.000 € möglich |

### 4.3 E-Rechnung: was wann gilt

| Zeitraum | Empfangen | Ausstellen an Firmenkunden im Inland |
|---|---|---|
| seit 1.1.2025 | **Pflicht für alle Unternehmen** (auch Kleinunternehmer) – ein E-Mail-Postfach genügt | E-Rechnung ist der Normalfall; Papier und PDF (mit Zustimmung des Kunden) übergangsweise erlaubt |
| 2026 | – | Papier/PDF für alle noch erlaubt |
| 2027 | – | Papier/PDF nur noch, wenn dein Gesamtumsatz 2026 höchstens 800.000 € betrug |
| **ab 1.1.2028** | – | **E-Rechnung Pflicht.** Ausnahmen: Kleinunternehmer, Kleinbeträge bis 250 €, Fahrausweise |
| Privatkunden | – | keine Pflicht: PDF oder Papier bleiben |
| ab 1.7.2030 (EU-Paket „ViDA") | EU-weit E-Rechnung und Meldesystem für **grenzüberschreitende** Firmenrechnungen | betrifft dich nur bei EU-Firmenkunden |

Eine Verschiebung der Fristen ist (Stand Ende August 2026) nicht beschlossen.

**Was zählt als E-Rechnung?** Nur strukturierte Daten nach der europäischen Norm EN 16931 – also **XRechnung**
(reine XML-Datei) oder **ZUGFeRD** ab Version 2.0.1 (PDF mit eingebetteter XML; alle Profile außer MINIMUM und
BASIC WL – wir nehmen das Profil „EN 16931"). Ein normales PDF ist **keine** E-Rechnung.

**Aktuelle Versionen:** ZUGFeRD 2.5 (Juni 2026, abwärtskompatibel). XRechnung 3.0.x gilt mindestens bis 31.07.2027;
XRechnung 4.0 (auf Basis der neuen EN 16931-1:2026) liegt seit September 2026 als Vorabversion vor, die finale
Fassung wird für Frühjahr 2027 erwartet. → Die App muss Formatversionen austauschbar halten.

**BMF-Schreiben vom 15.10.2025:** unterscheidet Formatfehler (die Datei ist dann gar keine E-Rechnung), Verstöße
gegen Geschäftsregeln und inhaltliche Fehler. Für uns heißt das: **Jede E-Rechnung wird vor dem Versand automatisch
geprüft.**

**Was das für dich bedeutet:**
- **Als Kleinunternehmer:** E-Rechnungen auszustellen ist freiwillig – **empfangen** musst du sie aber können
  (z. B. von Lieferanten).
- **Mit Umsatzsteuer und Firmenkunden:** Bis Ende 2027 reicht PDF mit Zustimmung (bei Umsatz ≤ 800.000 €), ab 2028
  muss ZUGFeRD oder XRechnung raus. Etappe 7 sollte deshalb **spätestens Mitte 2027** fertig sein.
- **Nur Privatkunden:** Für den Versand ist keine E-Rechnung nötig.
- **Gleichbleibende Leistungen** (z. B. Monatspauschale laut Vertrag): Bei einer Dauerrechnung genügt es, sie
  einmal als E-Rechnung zu stellen. Dauerrechnungen, die vor 2027 auf Papier oder als PDF ausgestellt wurden,
  bleiben laut BMF gültig, solange sich an ihnen nichts ändert.

### 4.4 GoBD – ordnungsgemäße elektronische Aufzeichnung

Die GoBD (zuletzt geändert am 14.07.2025, vor allem wegen der E-Rechnung) gelten für jede Software, mit der Rechnungen
erstellt und aufbewahrt werden. Übersetzt in die App:

| Grundsatz | So setzt die App ihn um |
|---|---|
| Unveränderbar | Rechnung wird „festgeschrieben": PDF/XML schreibgeschützt abgelegt, Prüfsumme in der Datenbank, keine Lösch-Taste. Fehler → Storno oder Korrekturrechnung mit Bezug auf das Original |
| Nachvollziehbar | Änderungsprotokoll (wer, wann, was) – auch für Kunden- und Katalogdaten; Verknüpfung Erfassung → Rechnung → Zahlung → Mahnung |
| Vollständig | Jede Rechnung erhält eine Nummer, Entwürfe noch keine – verworfene Entwürfe hinterlassen keine Lücken |
| Richtig | Rechts-Check vor dem Festschreiben, Rechnen in Cent |
| Zeitgerecht | Erinnerung an liegengebliebene Entwürfe und noch nicht abgerechnete Erfassungen |
| Geordnet | Archiv nach Jahr und Nummer, Suche über alles |
| Aufbewahren | **8 Jahre** ab Ende des Ausstellungsjahres (seit 2025, Bürokratieentlastungsgesetz IV), maschinell auswertbar und im **Originalformat** – bei E-Rechnungen zählt die **XML-Datei** |
| Datensicherung | täglich in den Ordner `Sicherungen` auf dem Laptop, dazu Time Machine auf eine externe Platte und **eine Kopie außer Haus** (Brand, Diebstahl) |
| Verfahrensdokumentation | kurze Beschreibung, wie du Rechnungen erstellst, prüfst, versendest und sicherst. Die App erzeugt eine Vorlage und füllt die technischen Teile selbst aus |
| Datenzugriff bei einer Prüfung | Export aller Rechnungsdaten als CSV plus PDF/XML auf Knopfdruck |

Fotografierte Papierbelege (z. B. Kassenbons für Material) dürfen das Papier ersetzen, wenn das Foto vollständig und
lesbar ist und das Vorgehen in der Verfahrensdokumentation beschrieben ist („mobiles Scannen").

### 4.5 Rechnungsnummer, Korrektur, Storno

- Die Nummer muss **einmalig** sein; mehrere Nummernkreise sind erlaubt. Vorschlag: `JJJJ-NNNN`, jedes Jahr ab
  `0001` (z. B. `2026-0042`).
- Vergeben wird sie erst beim Festschreiben – und danach nie wieder, auch nicht nach einem Storno.
- Falsche Rechnung → **Stornorechnung** (Minusbeträge, Bezug auf das Original) und neue Rechnung, oder eine
  **Rechnungskorrektur**, die eindeutig auf die ursprüngliche Rechnung verweist.

### 4.6 Versand per E-Mail

- Ein PDF per Mail ist umsatzsteuerlich eine „sonstige Rechnung" und braucht die **Zustimmung des Empfängers** –
  formlos genügt (mündlich, per Mail, im Auftrag). Die App speichert je Kunde, ob und wann er zugestimmt hat.
- Eine elektronische Signatur ist nicht nötig.
- Die Mail selbst muss nicht aufbewahrt werden, wenn sie nur „Transportmittel" für die angehängte Rechnung ist – die
  Rechnung schon. Die App führt trotzdem ein Versandprotokoll (wann, an wen, welche Datei).

### 4.7 Zahlungsverzug und Mahnung (BGB)

- Ohne Mahnung kommt der Kunde spätestens **30 Tage nach Fälligkeit und Zugang der Rechnung** in Verzug
  (§ 286 Abs. 3 BGB) – bei Privatkunden **nur, wenn die Rechnung darauf hinweist**. Die App setzt diesen Hinweis bei
  Privatkunden automatisch.
- Verzugszinsen (§ 288 BGB): Privatkunden Basiszins + 5 Prozentpunkte, Firmen Basiszins + 9 Prozentpunkte und 40 €
  Pauschale. Basiszins seit 1.7.2026: 1,52 % → also 6,52 % bzw. 10,52 %. Der Basiszins ändert sich zum 1.1. und 1.7.;
  die App erinnert daran.
- Forderungen verjähren nach 3 Jahren zum Jahresende – die App warnt bei sehr alten offenen Rechnungen.

### 4.8 Datenschutz (DSGVO)

- Kundendaten verarbeitest du, um den Auftrag abzuwickeln und weil das Gesetz die Aufbewahrung verlangt – das ist
  erlaubt (Art. 6 Abs. 1 b und c DSGVO). Gespeichert wird nur, was nötig ist.
- **Pluspunkt deiner Lösung:** Alles liegt auf deinem eigenen Laptop, Zugriff nur über Tailscale plus PIN. Kein
  Cloud-Anbieter sieht deine Kundendaten.
- Kunden informieren (Art. 13): kurzer Datenschutzhinweis, z. B. auf Angebot, Auftrag oder Website.
- Kurzes Verzeichnis der Verarbeitungstätigkeiten (Art. 30) – die App liefert eine Vorlage.
- Externe Dienste (Mailanbieter, optional Cloud-KI oder -Spracherkennung): nur mit Vertrag zur Auftragsverarbeitung,
  möglichst mit Servern in der EU, KI nur, wenn du sie ausdrücklich einschaltest.
- Fotos beim Kunden: keine Personen oder Autokennzeichen – oder vorher fragen.
- Nach Ablauf der Aufbewahrungsfrist wird gelöscht. Die App zeigt an, was gelöscht werden darf, und sperrt das
  Löschen vorher.

### 4.9 Was nicht nötig ist

- **Keine Zertifizierung** der Software – die gibt es in Deutschland nicht als Pflicht. Ordnungsgemäß wird es durch
  die Software **plus** Verfahrensdokumentation **plus** den gelebten Ablauf.
- **Keine elektronische Signatur** und **kein Kassensystem mit TSE**, solange du keine Barverkäufe über eine
  elektronische Kasse machst.
- Die **Wirtschafts-Identifikationsnummer** (W-IdNr.) ist auf Rechnungen derzeit keine Pflicht – die App bekommt
  trotzdem ein Feld dafür.

---

## 5. Was das System beinhalten muss

**M1 · Mein Unternehmen (Stammdaten)**
Name, Anschrift, Kontakt, Logo · Steuernummer, USt-IdNr., W-IdNr. · Steuerstatus (Kleinunternehmer oder
regelbesteuert, Ist- oder Soll-Versteuerung) · Bankverbindung · Nummernkreise · Zahlungsbedingungen (Zahlungsziel,
Skonto) · Textbausteine (Einleitung, Schluss, Mailtext) · Briefbogen und Fußzeile.

**M2 · Kunden**
Kundennummer · Typ privat/Firma/Behörde · Anschrift, Ansprechpartner, Mail, Telefon · USt-IdNr. (EU) und Leitweg-ID
(Behörde) · Versandweg (Mail/Post) und Format (PDF/ZUGFeRD/XRechnung) · Zustimmung zu Mail-Rechnungen mit Datum ·
eigenes Zahlungsziel · **Kundenpreise** · **Standardpositionen** (bei neuer Rechnung vorangehakt) · Notizen und Fotos.
Anlegen per Hand, aus Excel/CSV, aus einem iPhone-Kontakt (vCard) oder per Foto von Briefkopf oder Visitenkarte.

**M3 · Leistungskatalog – dein wachsender Datenbestand**
Bezeichnung und Beschreibung · Einheit (Std., Stk., km, m², pauschal …) · Nettopreis · Steuersatz · Art (Arbeit,
Material, Fahrt – wichtig für § 35a) · Favoriten · Suchwörter für Sprache und Texterkennung · Nutzungshäufigkeit.
Neue Freitext-Positionen bietet die App zum Speichern an. Preisänderungen gehen zentral (z. B. „alle Arbeitspreise
+3 % ab 1.1.").

**M4 · Erfassen unterwegs (Handy) und Eingang**
Ein großer „Erfassen"-Knopf: **Foto/Scan** (MyDesk-Scanner) · **Diktat** · **Notiz** · optional **Zeit**
(Start/Stopp) · Zuordnung zu Kunde und Datum (mit Vorschlag) · Texterkennung für Belege (Betrag, Lieferant, Datum) ·
Vorschläge für Rechnungspositionen aus Text und Sprache (rot markiert, bis du sie bestätigst) · alles erscheint
sofort im **Eingang** am Laptop.

**M5 · Rechnungsassistent**
Kunde wählen → Standardpositionen und offene Erfassungen sind vorangehakt → Mengen und Beträge anpassen, Positionen
aus dem Katalog dazu → Leistungsdatum oder -zeitraum → **Live-Vorschau** → **Rechts-Check** → Festschreiben (Nummer,
Datum, Archiv) → senden oder drucken. Abkürzungen: „wie letzte Rechnung" und Sammelrechnung (alle offenen Erfassungen
eines Kunden im Monat).

**M6 · Rechnungsdokumente**
PDF nach DIN 5008 (Anschrift passt ins Fenster eines DIN-lang-Umschlags, Falzmarken) · Logo, Fußzeile mit Bank- und
Steuerdaten · **GiroCode** (QR-Code, den Banking-Apps zum Überweisen scannen) · PDF/A für die Langzeitarchivierung ·
E-Rechnung (Etappe 7) · Anlagen wie Fotodokumentation oder Stundennachweis als eigene Datei.

**M7 · Versand**
Mail direkt aus der App über dein Postfach, Mailtext-Vorlagen, Kopie an dich · am Handy das Teilen-Menü · Drucken am
Laptop · Versandprotokoll.

**M8 · Zahlungen und Mahnwesen**
Status Entwurf → festgeschrieben → versendet → teilbezahlt/bezahlt, überfällig oder storniert · Zahlungseingang mit
Datum (wichtig für EÜR und Ist-Versteuerung) · Skonto · Push-Erinnerung bei Fälligkeit · Zahlungserinnerung →
1. Mahnung → 2. Mahnung (Vorlagen, Verzugszinsen-Rechner) · Fälligkeiten im Kalender.

**M9 · Wiederkehrende Rechnungen**
Abos und Daueraufträge (monatlich, quartalsweise, jährlich) · Leistungszeitraum automatisch · Entwürfe entstehen von
selbst → Push „3 Rechnungen bereit" → mit einem Tipp prüfen und senden · optional ganz automatisch, solange sich
nichts ändert.

**M10 · Korrekturen**
Storno, Korrekturrechnung, Gutschrift – immer mit Bezug auf das Original, nie überschreiben.

**M11 · Auswertungen und Export**
Umsätze nach Monat, Jahr und Kunde · offene Posten · Umsatzsteuer-Summen je Steuersatz und Zeitraum (Soll oder Ist)
als Hilfe für die Voranmeldung · EÜR-Liste nach Zahlungsdatum · Jahres-ZIP (Excel-Liste und alle PDFs/XML) für den
Steuerberater · optional DATEV-Format · Datenexport für eine Prüfung.

**M12 · Archiv und Sicherheit**
Ablage `Rechnungen/<Jahr>/<Nummer>_<Kunde>.pdf` (plus `.xml`) · schreibgeschützt mit Prüfsumme · Prüfbericht (fehlt
etwas, wurde etwas verändert?) · Aufbewahrungsfristen · PIN/Face ID für die ganze App · tägliche Sicherung, Time Machine,
Kopie außer Haus.

**M13 · Später oder optional**
Angebote → Auftrag → Rechnung · Abschlags- und Schlussrechnungen · Unterschrift des Kunden am Handy
(Arbeitsnachweis) · Kontoauszug-Import (CSV) zum automatischen Abhaken · Erfassen ohne Netz (Warteschlange) ·
Empfang und Anzeige eingehender E-Rechnungen von Lieferanten · KI-Assistent (nur auf Wunsch).

---

## 6. So sieht die fertige Rechnung aus (Muster)

Beispiel mit Umsatzsteuer für einen Privatkunden. Als Kleinunternehmer entfallen die Steuerzeilen, stattdessen steht
der § 19-Hinweis da.

```
 Max Mustermann · Musterstraße 1 · 12345 Musterstadt                     [LOGO]
 ─────────────────────────────────────────────────────────────────────────────
 Herrn                                        Rechnungsnr.:     2026-0042
 Hans Huber                                   Rechnungsdatum:   01.10.2026
 Gartenweg 5                                  Leistungszeit:    22.–26.09.2026
 80331 München                                Kundennr.:        K-0007

 Rechnung Nr. 2026-0042

 Sehr geehrter Herr Huber, für meine Leistungen berechne ich Ihnen:

 Pos  Leistung                       Menge  Einheit     Einzelpreis      Betrag
 1    Arbeitsleistung vor Ort          3,5  Std.            45,00 €    157,50 €
 2    Anfahrtspauschale                  1  pauschal        15,00 €     15,00 €
 3    Material: Dichtband 10 m           4  Stk.             8,90 €     35,60 €
                                            Summe netto                208,10 €
                                            zzgl. 19 % USt              39,54 €
                                            Rechnungsbetrag            247,64 €

 Enthaltene Arbeits- und Fahrtkosten (§ 35a EStG): 205,28 € inkl. USt

 Zahlbar ohne Abzug bis 15.10.2026 auf das unten genannte Konto.  [GiroCode]
 Als Privatkunde sind Sie verpflichtet, diese Rechnung 2 Jahre aufzubewahren
 (§ 14b Abs. 1 Satz 5 UStG). Sie kommen spätestens 30 Tage nach Fälligkeit
 und Zugang dieser Rechnung in Verzug (§ 286 Abs. 3 BGB).
 ─────────────────────────────────────────────────────────────────────────────
 Anschrift · Telefon · Mail  │  Bank · IBAN · BIC  │  Steuernr. bzw. USt-IdNr.
```

---

## 7. Technik und Aufbau

```
  iPhone (App auf dem Home-Bildschirm)            Laptop (Browser oder Dock-App)
  eigene Kopie der Daten, geht auch offline        Hauptablage
  Foto · Notiz · Diktat · Rechnung                 Eingang · prüfen · festschreiben · drucken
            │                                                │
            └──────── Abgleich über Tailscale (HTTPS) ───────┤
                                                             │
          Laptop: Node-Server „RechnungApp" (Port 4200, startet automatisch)
          ├─ Datenbank: SQLite in ~/RechnungApp/Daten (+ tägliche Sicherung)
          ├─ Archiv: ~/RechnungApp/Archiv (Rechnungs-PDFs schreibgeschützt, Fotos)
          └─ Abgleich: zählt jede Änderung, vergibt Nummern, schreibt fest
                                   │
          Time Machine / externe Platte  +  Kopie außer Haus
                                   │
          dein Mail-Postfach (SMTP)  ──►  Kunde
```

### Entscheidungen

| Thema | Vorschlag | Warum |
|---|---|---|
| Laufzeit | Node 24 LTS, App in Vanilla-JS ohne Build-Schritt wie MyDesk | vertraut, Sicherheitsupdates bis 04/2028 |
| Datenbank | **SQLite** (statt JSON wie in MyDesk) | Transaktionen: Eine Rechnungsnummer kann nie doppelt vergeben werden oder verloren gehen; eigene Tabelle fürs Änderungsprotokoll |
| Rechnen | in Cent; Steuer je Steuersatz auf die Summe der Positionen | keine Rundungsfehler, entspricht EN 16931 |
| Datenmodell | von Anfang an nach EN 16931 (Einheiten-Codes, Steuerkategorien, Zahlungsarten) | E-Rechnung später ohne Umbau |
| PDF | pdf-lib (wie MyDesk) mit eingebetteter freier Schrift → PDF/A | Langzeitarchiv, Voraussetzung für ZUGFeRD |
| E-Rechnung | Bibliothek prüfen (z. B. `node-zugferd`, `@stackforge-eu/factur-x`) oder eigene XML-Vorlage; Prüfung mit dem offiziellen KoSIT-Validator bzw. Mustang | Formatversionen wechseln (XRechnung 4.0 kommt 2027) |
| Mail | `nodemailer` über SMTP deines Postfachs; Zugangsdaten in `secrets/` auf dem Laptop, nie in Git | Versand auch automatisch (Abos, Mahnungen); über dein echtes Postfach landen Mails seltener im Spam |
| Handy ↔ Laptop | jedes Gerät hat eine eigene Kopie (IndexedDB), Abgleich in beide Richtungen, Live-Meldung per Server-Sent Events | Foto am Handy → Sekunden später im Eingang am Laptop, offline wartet es |
| Betrieb | Node-Server auf dem Laptop (Port 4200, nur lokal erreichbar), Autostart, `tailscale serve --bg --https=443 http://127.0.0.1:4200`, Ablage `~/RechnungApp` | kein Docker nötig; das Handy erreicht den Laptop zu Hause und unterwegs |
| Zugang | PIN/Face ID für die ganze App (nicht optional) | Geschäftsdaten |

### Spracherkennung – die Optionen

| Weg | So funktioniert's | Aufwand | Datenschutz | Einsatz |
|---|---|---|---|---|
| iPhone-Diktat (Mikrofon-Taste der Tastatur) | in jedem Textfeld der App | keiner | auf dem iPhone | Stufe 1 – ab Tag 1 |
| Kurzbefehl „Notiz an RechnungApp" | Siri oder Action-Button → diktieren → landet im Eingang, ohne die App zu öffnen | klein | wie oben | Stufe 1 |
| Sprachaufnahme + Whisper auf dem Laptop | Aufnahme in der App, der Laptop schreibt mit; die Aufnahme bleibt als Beleg | mittel | bleibt komplett zu Hause | **gebaut** („Aufnahme → Laptop") |
| Spracherkennung im Browser (Web Speech API) | Text erscheint beim Sprechen | – | läuft beim Browser-Anbieter (Apple/Google) | **gebaut** („Live mitschreiben") – in der Home-Bildschirm-App auf dem iPhone nicht verfügbar, dort nimmt die App automatisch auf |
| Cloud-Dienst | Aufnahme geht an einen Anbieter | klein | Vertrag zur Auftragsverarbeitung nötig, Kosten | nur, wenn du es willst |

### Vom Text zur Rechnungsposition

- **Stufe 1 (offline):** Die App sucht in Diktat, Notiz oder erkanntem Text nach Mengen, Einheiten und Begriffen aus
  deinem Katalog – z. B. „2,5 Stunden Hecke schneiden bei Huber" → Kunde Huber, Position „Heckenschnitt", 2,5 Std.
  Jede Korrektur merkt sie sich, genau wie `lernen.js` in MyDesk.
- **Stufe 2 (optional):** Cloud-KI (z. B. die Claude-API) für freie Formulierungen und Handschrift – nur Text ohne
  Kundennamen, nur nach ausdrücklichem Einschalten, Ergebnis immer rot markiert, bis du es bestätigst.

### Datenmodell (Skizze)

```
Unternehmen  name, anschrift, steuernummer, ustId, wIdNr, steuerstatus, versteuerung (ist/soll),
             bank, logo, zahlungsbedingungen, textbausteine, nummernkreise
Kunde        id, kundennr, typ (privat/firma/behoerde), name, anschrift, mail, ustId, leitwegId,
             versand, format, zustimmungMail, zahlungsziel, preise{}, standardPositionen[]
Artikel      id, bezeichnung, beschreibung, einheit (UN/ECE-Code), preisNettoCent, steuersatz,
             art (arbeit/material/fahrt), favorit, suchwoerter[]
Kategorie    id, name, farbe, position                              (Artikel.kategorieId → Kategorie)
Baustelle    id, nummer (B-0001), name, kundeId, anschrift, status (aktiv/abgeschlossen), beginn, ende
Notiz        id, datum, baustelleId, kundeId, text, fotos[], audio, abschrift (nur der Laptop schreibt sie),
             status (offen/zugeordnet/abgerechnet/erledigt), rechnungId
Rechnung     id, nummer, typ (rechnung/storno/korrektur), status, datum, leistungVon, leistungBis,
             kunde (Kopie), unternehmen (Kopie), positionen[], summen, hinweise[],
             dateien {pdf, xml, sha256}, versand[], zahlungen[], mahnungen[], bezugId
Abo          id, kundeId, positionen[], intervall, naechsterTermin, automatik
Protokoll    zeit, geraet, aktion, objekt, vorher, nachher   (wird nur ergänzt, nie geändert)
```

---

## 8. Der Fahrplan in Etappen

> **Update:** Stand und neue Reihenfolge stehen in [Abschnitt 0](#0-stand-und-entscheidungen-update-1-oktober-2026). Die
> Beschreibungen unten bleiben als Detailplan gültig.

| Etappe | Inhalt | Ergebnis | Umfang |
|---|---|---|---|
| 0 | Klären und Sammeln | Antworten und Daten | du |
| 1 | Grundgerüst | App läuft auf dem Laptop, Stammdaten sind drin | mittel |
| 2 | Kunden und Leistungskatalog | Datenbestand steht | mittel |
| 3 | Rechnung, PDF, Drucken | **erste echte Rechnung** | groß |
| 4 | Mailversand, Zahlungen, Mahnungen | Rechnung geht raus, Zahlungen im Blick | mittel |
| 5 | Erfassen am Handy: Foto, Text, Sprache | Foto/Diktat → Rechnungsentwurf | groß |
| 6 | Wiederkehrendes automatisch | Monatsabrechnung nur noch freigeben | mittel |
| 7 | E-Rechnung | fit für Firmenkunden ab 2028 | groß |
| 8 | Auswertungen, Steuer, GoBD-Unterlagen | Jahresunterlagen per Knopfdruck | mittel |
| 9 | Extras nach Bedarf | – | je nach Wunsch |

Die Etappen 5 bis 7 lassen sich tauschen: Hast du viele Firmenkunden, ziehen wir die E-Rechnung vor.

### Etappe 0 – Klären und Sammeln (vor dem ersten Code)
- Fragen aus [Abschnitt 10](#10-offene-fragen-an-dich) beantworten
- Daten zusammentragen ([Abschnitt 9 B](#9-voraussetzungen--checkliste))
- Laptop: Node.js 24 installieren, Tailscale auf Laptop und iPhone
- Falls vorhanden, mit dem Steuerberater klären: Steuerstatus, gewünschtes Exportformat

**Fertig, wenn:** Steuerstatus, Kundenarten und Versandweg feststehen.

### Etappe 1 – Grundgerüst
- Repo mit der MyDesk-Basis aufsetzen: Server, App-Rahmen, Design und Themes, Login mit PIN/Face ID, Fehlerprotokoll
- Laptop-Server mit Autostart, HTTPS über Tailscale, tägliche Sicherung, Prüfbericht
- SQLite-Datenbank mit Änderungsprotokoll
- „Mein Unternehmen": Stammdaten, Steuerstatus, Bank, Logo, Nummernkreis, Zahlungsbedingungen
- Vorschau-Version zum Testen ohne Laptop-Server

**Fertig, wenn:** Die App läuft auf dem Laptop, Handy und Laptop öffnen sie, die Stammdaten sind gespeichert und die
Sicherung läuft.

### Etappe 2 – Kunden und Leistungskatalog
- Kunden anlegen, suchen, bearbeiten; Typ, Versandweg, Zustimmung zur Mail-Rechnung
- Import aus Excel/CSV und iPhone-Kontakten; Kunde aus einem Foto (Briefkopf, Visitenkarte) per Texterkennung
- Leistungskatalog mit Einheiten, Preisen, Steuersätzen, Art (Arbeit/Material/Fahrt) und Favoriten
- Kundenpreise und Standardpositionen je Kunde

**Fertig, wenn:** Deine echten Kunden und Leistungen sind drin.

### Etappe 3 – Rechnung, PDF, Drucken (erste echte Rechnung)
- Rechnungsassistent mit vorangehakten Positionen, änderbaren Beträgen und Live-Vorschau
- Rechts-Check: Pflichtangaben, Hinweise je Fall, Plausibilität, 6-Monats-Frist
- Festschreiben: Nummer, Datum, schreibgeschütztes PDF, Prüfsumme, Protokoll
- PDF nach DIN 5008 mit Logo, Fußzeile, GiroCode und Falzmarken; PDF/A
- Drucken, Teilen am Handy, „wie letzte Rechnung", Storno und Korrekturrechnung

**Fertig, wenn:** Der Steuerberater hat die Musterrechnungen (eine je Kundenart) abgenickt und die erste echte
Rechnung ist raus.

### Etappe 4 – Mailversand, Zahlungen, Mahnungen
- Mail direkt aus der App (SMTP), Vorlagen, Kopie an dich, Versandprotokoll
- Zahlungseingang erfassen (auch Teilzahlung und Skonto), Status „überfällig"
- Push-Erinnerungen, Fälligkeiten im Kalender
- Zahlungserinnerung, 1. und 2. Mahnung mit Verzugszinsen-Rechner

**Fertig, wenn:** Eine Rechnung geht per Mail raus, die Zahlung ist abgehakt und Überfälliges meldet sich von selbst.

### Etappe 5 – Erfassen am Handy (Foto, Text, Sprache)
- „Notiz"-Knopf: Diktat, Text, Fotos – direkt einer Baustelle zugeordnet ✓; noch offen: Scan (MyDesk-Scanner), Zeit
- Bautagebuch je Baustelle mit Live-Aktualisierung; Rechnung aus allen offenen Notizen ✓
- Texterkennung für Material-Belege (Betrag, Lieferant, Datum) → Position „Material laut Beleg" (optional mit
  Aufschlag)
- Sprache Stufe 1: iPhone-Diktat und Kurzbefehl „Notiz an RechnungApp"; Stufe 2: Whisper auf dem Laptop
- Positionsvorschläge aus Text, die aus deinen Korrekturen lernen
- Fotodokumentation je Kunde, optional als Anlage zur Rechnung

**Fertig, wenn:** Ein Foto oder Diktat am Handy wird in unter einer Minute zum Rechnungsentwurf am Laptop.

### Etappe 6 – Wiederkehrendes automatisch
- Abos und Daueraufträge mit Intervall und automatischem Leistungszeitraum
- Entwürfe entstehen von selbst, Push „Rechnungen bereit", Freigabe mit einem Tipp; optional Vollautomatik
- Sammelrechnung: alle offenen Erfassungen eines Kunden im Monat
- Preisänderungen für alle Abos auf einmal

**Fertig, wenn:** Die Monatsabrechnung besteht nur noch aus „prüfen und freigeben".

### Etappe 7 – E-Rechnung
- ZUGFeRD (Profil EN 16931) als Standard für Firmenkunden; XRechnung für Behörden (Leitweg-ID)
- automatische Prüfung vor dem Versand; der Prüfbericht wird mit archiviert
- XML und PDF unverändert im Archiv
- Empfang: eingehende E-Rechnungen (z. B. von Lieferanten) lesbar anzeigen und die XML aufbewahren
- Rechts-Check um den Hinweis zur Ist-Versteuerung ergänzen (Pflicht auf allen Rechnungen ab 1.1.2028, falls du nach
  Ist versteuerst)

**Fertig, wenn:** Testrechnungen bestehen die offizielle Prüfung und der erste Firmenkunde hat eine ZUGFeRD-Rechnung
bekommen – **spätestens Mitte 2027.**

### Etappe 8 – Auswertungen, Steuer, GoBD-Unterlagen
- Übersicht: Umsatz, offene Posten, Kunden
- Umsatzsteuer-Summen je Steuersatz und Zeitraum als Hilfe für die Voranmeldung (Soll oder Ist)
- EÜR-Liste nach Zahlungsdatum, Rechnungsausgangsbuch (Excel), Jahres-ZIP, optional DATEV
- Verfahrensdokumentation als Vorlage (technische Teile automatisch), Verzeichnis der Verarbeitungstätigkeiten
- Datenexport für eine Prüfung, Anzeige der Aufbewahrungs- und Löschfristen

**Fertig, wenn:** Die Jahresunterlagen für Steuerberater und Finanzamt kommen per Knopfdruck.

### Etappe 9 – Extras nach Bedarf
Angebote → Auftrag → Rechnung · Abschlags- und Schlussrechnungen · Zeiterfassung mit Fahrtzeit und Kilometern ·
Unterschrift des Kunden am Handy · Kontoauszug-Import · Erfassen ohne Netz · KI-Assistent · Kachel in MyDesk ·
Kunden im EU-Ausland.

### Meilensteine
1. **Nach Etappe 3:** die erste echte Rechnung aus der App.
2. **Nach Etappe 5:** dein Kernwunsch „am Handy erfassen → am Laptop abrechnen" läuft.
3. **Spätestens Mitte 2027:** E-Rechnung fertig (Pflicht bei Firmenkunden ab 1.1.2028).

---

## 9. Voraussetzungen – Checkliste

**A · Rechtlich und steuerlich (du)**
- [ ] Gewerbe angemeldet bzw. freiberufliche Tätigkeit aufgenommen und beim Finanzamt erfasst (Fragebogen zur
      steuerlichen Erfassung über ELSTER) → **Steuernummer**
- [ ] Steuerstatus geklärt: Kleinunternehmer ja/nein, Ist- oder Soll-Versteuerung
- [ ] USt-IdNr. beim Bundeszentralamt für Steuern – nötig bei EU-Kunden, sinnvoll, damit die Steuernummer nicht auf
      jeder Rechnung steht
- [ ] Konto für Zahlungseingänge (empfohlen: getrennt vom Privatkonto)
- [ ] Zustimmung deiner Kunden zu Rechnungen per Mail (formlos, z. B. eine kurze Mail)
- [ ] Optional: Steuerberater für den Check der Musterrechnungen (Etappe 3) und das Exportformat

**B · Inhalte (du)**
- [ ] Firmendaten: Name, Anschrift, Telefon, Mail, ggf. Website, Logo (PNG oder SVG)
- [ ] Startkatalog: deine 10–30 häufigsten Leistungen mit Einheit und Preis
- [ ] Kundenliste (Excel/CSV genügt): Name, Anschrift, Mail, privat oder Firma
- [ ] Zahlungsziel (z. B. 14 Tage), Skonto ja/nein, Nummernformat (Vorschlag `2026-0001`)
- [ ] Mail-Postfach für den Versand mit SMTP-Zugang (App-Passwort), am besten eine geschäftliche Adresse

**C · Technik**
- [ ] Laptop mit Node.js 24 LTS (kostenlos, nodejs.org)
- [ ] GitHub-Repo RechnungApp (vorhanden) – der Laptop holt Updates per `git pull`
- [ ] Tailscale auf iPhone und Laptop (gleiches Konto); in der Tailscale-Verwaltung MagicDNS und HTTPS-Zertifikate einschalten
- [ ] Kopie außer Haus für das Archiv (z. B. verschlüsselte Cloud-Sicherung oder eine zweite Platte an einem anderen
      Ort)
- [ ] Externe Platte für Time Machine (Sicherung des ganzen Laptops)
- [ ] Optional: Zugangsschlüssel für einen KI-Dienst, falls du Stufe 2 möchtest

---

## 10. Offene Fragen an dich

> **Update:** Beantwortet sind 1 (umsatzsteuerpflichtig), 2 (Handwerk), 3 (Privat, Firmen, Behörden) und 5 (eigene App).
> Was noch offen ist, steht in [Abschnitt 0](#0-stand-und-entscheidungen-update-1-oktober-2026).

1. **Steuerstatus:** Kleinunternehmer oder mit Umsatzsteuer? Falls mit: Ist- oder Soll-Versteuerung? Liegt dein
   Umsatz deutlich unter 800.000 €?
2. **Was stellst du in Rechnung?** Zum Beispiel Handwerk/Service an Haus und Garten, Beratung, Unterricht,
   Warenverkauf … – das bestimmt Steuersätze, den § 35a-Ausweis, mögliche Steuerbefreiungen und § 13b.
3. **Wer sind deine Kunden?** Privat, Firmen, Behörden, Ausland – grob in Prozent.
4. **Wie viele Rechnungen** schreibst du im Monat, und wie viele davon wiederholen sich (gleiche Leistung, gleicher
   Betrag)?
5. **Eigene App** neben MyDesk (Empfehlung) – einverstanden?
6. **Versand:** direkt aus der App über dein Mail-Postfach (welcher Anbieter?) oder über das Teilen-Menü am Handy?
7. **KI:** Alles strikt offline auf dem Laptop – oder darf optional ein Cloud-Dienst helfen (bessere Erkennung von
   Handschrift und freier Sprache)?
8. **Steuerberater:** vorhanden? Welches Format möchte er (DATEV, Excel, PDF)?
9. **Extras:** Brauchst du Angebote, Abschlagsrechnungen, Zeiterfassung oder eine Unterschrift des Kunden?
10. **Netz:** Bist du bei Kunden oft ohne Mobilfunk? Dann planen wir „Erfassen ohne Netz" früher ein.

---

## 11. Risiken und Grenzen

| Risiko | Gegenmaßnahme |
|---|---|
| Falsche Steuerangaben sind teuer (z. B. Steuer ausgewiesen als Kleinunternehmer → wird trotzdem geschuldet) | Rechts-Check, Abnahme der Musterrechnungen durch den Steuerberater in Etappe 3 |
| Doppelte oder verlorene Rechnungsnummern | Nummer erst beim Festschreiben, Datenbank-Transaktion, Prüfbericht |
| Datenverlust – der Laptop kann kaputtgehen oder gestohlen werden | tägliche Sicherung, Time Machine, Kopie außer Haus, Festplattenverschlüsselung (FileVault) |
| Gleichzeitige Änderung desselben Eintrags auf zwei Geräten | die neuere Änderung gewinnt, die ältere bleibt im Protokoll; Nummern vergibt nur der Laptop |
| Laptop aus oder zugeklappt | das Handy arbeitet weiter und gleicht später ab; für schnellen Abgleich den Laptop tagsüber anlassen |
| iPhone-Grenzen: Browser-Spracherkennung geht in der Home-Bildschirm-App nicht; Mitteilungen nur, wenn die App auf dem Home-Bildschirm liegt | dort nimmt die App auf und der Laptop tippt mit Whisper ab; Tastatur-Diktat geht immer |
| Texterkennung, Sprache und KI können sich irren | alles Vorgeschlagene bleibt rot, bis du es bestätigst; nichts geht ohne Freigabe raus (außer du schaltest die Vollautomatik für Abos ein) |
| E-Rechnungsformate ändern sich (XRechnung 4.0 ab 2027) | Bibliothek und Prüfregeln aktuell halten, Testrechnungen bei jedem Update |
| Rechnungs-Mails landen im Spam | Versand über dein echtes Postfach statt direkt vom Laptop, möglichst eigene Domain |
| Gesetze ändern sich | Regeln einmal im Jahr prüfen, den Basiszins halbjährlich |

---

## 12. Nächste Schritte

1. Du beantwortest die Fragen aus [Abschnitt 10](#10-offene-fragen-an-dich) – Stichworte reichen.
2. Du sammelst die Daten aus [Abschnitt 9 B](#9-voraussetzungen--checkliste) (Logo, Leistungen mit Preisen,
   Kundenliste).
3. Ich passe den Fahrplan an deine Antworten an und starte mit **Etappe 1** in diesem Repo (Grundgerüst aus MyDesk).
4. Optional wie gewohnt: den Fahrplan vom Denk-Kreis (`node council.js`) gegenlesen lassen.

---

## Quellen (abgerufen am 1. Oktober 2026)

**E-Rechnung**
- Fristen und Übergangsregeln: [e-rechnung.tools – E-Rechnungspflicht 2026](https://www.e-rechnung.tools/ratgeber/e-rechnungspflicht),
  [e-rechnungen.org – alle Fristen](https://www.e-rechnungen.org/e-rechnung-pflicht-fristen),
  [IHK Rheinhessen – Empfangspflicht seit 2025](https://www.ihk.de/rheinhessen/rechtundsteuern/gesetzesaenderung/bmf-plant-verpflichtende-erechnung-und-meldesystem-6185318)
- BMF-Schreiben vom 15.10.2025: [IHK Köln](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/steuern/bmf-schreiben-zur-e-rechnung-vom-15-10-2025-6774012),
  [Haufe](https://www.haufe.de/finance/steuern-finanzen/bmf-schreiben-v-15102025-zur-e-rechnung_190_669628.html)
- Dauerrechnungen: [IHK – Erläuterungen zum BMF-Schreiben (PDF)](https://ihk.de/blueprint/servlet/resource/blob/6286014/865bf37b7b06c452593f605d8cf96a7a/erlaeuterungen-zum-bmf-schreiben-e-rechnung-10-2024-data.pdf)
- ZUGFeRD 2.5: [FeRD – Neue ZUGFeRD-Version 2.5 veröffentlicht](https://www.ferd-net.de/aktuelles-veranstaltungen/aktuelles/news/neue-zugferd-version-25-veroeffentlicht)
- XRechnung 4.0: [xeinkauf.de – XRechnung 4.0](https://xeinkauf.de/aktuelles/xrechnung/xrechnung-4-umsetzung/),
  [cosinex – Vorabversion und Zeitplan](https://blog.cosinex.de/2026/09/16/xrechnung-4-0-vorabversion-en-16931/)
- ViDA ab 2030: [IHK München – VAT in the Digital Age](https://www.ihk-muenchen.de/ratgeber/steuern/umsatzsteuer/vat-in-the-digital-age/)

**Umsatzsteuer, GoBD, Aufbewahrung**
- Rechnungsanforderungen, Kleinunternehmer: [ZDH – Anforderungen an Rechnungen](https://www.zdh.de/presse/publikationen/info-flyer/umsatzsteuer-anforderungen-an-rechnungen/),
  [selbststaendigkeit.de – Kleinunternehmer-Rechnung 2026](https://selbststaendigkeit.de/buchhaltung-fuer-gruender/steuernummer-rechnung-kleinunternehmer/)
- Ist-Versteuerung ab 2028: [IWW – JStG 2024 reformiert Vorsteuerabzug ab 2028](https://www.iww.de/ssp/unternehmer/umsatz-vorsteuer-jstg-2024-reformiert-vorsteuerabzug-ab-2028-vorsicht-vor-allem-bei-der-ist-besteuerung-f164109),
  [zahlenblick – Ist-Versteuerung ab 2028](https://www.zahlenblick.de/news/steueraenderung-zur-ist-versteuerung-ab-2028.php)
- GoBD-Änderung 14.07.2025: [KPMG](https://kpmg.com/de/de/themen/2025/07/bmf-gobd-zweite-aenderung.html),
  [IHK Gera – Aufbewahrung von E-Rechnungen](https://www.ihk.de/gera/recht-und-steuern/aktuelles-rechtundsteuern/aufbewahrung-von-e-rechnungen-6636974)
- 8 Jahre Aufbewahrung (BEG IV): [Haufe – Viertes Bürokratieentlastungsgesetz](https://www.haufe.de/steuern/gesetzgebung-politik/viertes-buerokratieentlastungsgesetz_168_613390.html)
- W-IdNr.: [IHK München – Wirtschafts-Identifikationsnummer](https://www.ihk-muenchen.de/ratgeber/steuern/wirtschafts-identifikationsnummer/)
- § 35a EStG: [Steuerschroeder – Handwerkerleistungen absetzen](https://www.steuerschroeder.de/handwerkerleistungen-absetzen-35a-estg.html)

**Zivilrecht**
- Basiszinssatz ab 1.7.2026: [Deutsche Bundesbank](https://www.bundesbank.de/de/presse/pressenotizen/bekanntgabe-des-basiszinssatzes-zum-1-juli-2026-anpassung-auf-1-52--941386)

**Technik**
- Spracherkennung in iPhone-Web-Apps: [What PWA Can Do Today – Speech recognition](https://whatpwacando.today/speech-recognition),
  [firt.dev – iOS 14.5](https://firt.dev/ios-14.5/)
- E-Rechnungs-Bibliotheken: [node-zugferd (npm)](https://npmjs.com/package/node-zugferd),
  [@stackforge-eu/factur-x (JSR)](https://jsr.io/@stackforge-eu/factur-x)
- Node.js-Lebenszyklus: [endoflife.ai – Node.js 20](https://endoflife.ai/nodejs/20)
