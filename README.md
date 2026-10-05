# MOROX

HR-Dokumentenverwaltung für die **Pflegedienst MORO GmbH** — Desktop-App auf Basis von Tauri v2 + Next.js.

## Features

- Dokumente erstellen & als `.docx` herunterladen:
  - Arbeitsvertrag (befristet, unbefristet, geringfügig)
  - Aushilfsvertrag
  - Ausbildungsvertrag
  - Änderungsvereinbarung
  - Arbeitszeugnis / Zwischenzeugnis (gut / mittel / schlecht)
  - Abmahnung
  - Kündigung (ordentlich / außerordentlich)
- Mitarbeiterverwaltung (lokal gespeichert)
- KI-Assistent (Anthropic Claude) — Dokumente per Chat erstellen

## Voraussetzungen

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

## Installation

```bash
git clone https://github.com/Cloonson/MOROX.git
cd MOROX
npm install
```

## Starten

```bash
# Desktop-App (Tauri)
npx tauri dev

# Nur Web-Browser (ohne Tauri)
npm run dev
```

## KI-Assistent

Eigenen Anthropic API-Key benötigt. In der App unten rechts auf den Chat-Button klicken → API-Schlüssel eingeben. Der Key wird lokal im Browser gespeichert und nie übertragen.

API-Keys: [console.anthropic.com](https://console.anthropic.com/)

## Build

```bash
npx tauri build
```

Die fertige `.app` / `.exe` liegt danach in `src-tauri/target/release/bundle/`.

## Dateien speichern und öffnen

In der Desktop-App verwenden DOCX-, PDF- und XLSX-Exporte den nativen
„Speichern unter“-Dialog. Nach dem Speichern zeigt ein Toast den tatsächlichen
Speicherpfad und bietet „Im Ordner anzeigen“ an. PDFs öffnen im Standardbrowser,
Word-Dokumente bevorzugt in Microsoft Word (sonst in der Standardanwendung),
Excel-Dateien in der Standardanwendung für XLSX.

Abbrechen erstellt keinen Verlaufseintrag und keine interne Archivkopie.
Ein Fehler beim Öffnen lässt die gespeicherte Datei bestehen und wird separat
gemeldet. DOCX-Dateien und Handzeichenlisten bleiben zusätzlich im bisherigen
MOROX-Archiv verfügbar. Dateien im Dokumentenspeicher werden direkt geöffnet.
Die reine Browser-Version startet weiterhin einen Browser-Download und meldet
diesen ausdrücklich als „Download gestartet“.

Die nativen Befehle liegen in `src-tauri/src/file_export.rs`; der gemeinsame
Frontend-Ablauf liegt in `lib/file-export.ts`. Tests: `npm test` und
`cargo test --manifest-path src-tauri/Cargo.toml --lib`.

## Windows-Updates

Windows-Releases enthalten NSIS (`-setup.exe`) und MSI (`.msi`). In `latest.json`
müssen beide mit ihrer jeweiligen Signatur unter `windows-x86_64-nsis` und
`windows-x86_64-msi` stehen. Tauri wählt den Installer passend zur bestehenden
Installation. Der generische Schlüssel bleibt für ältere Clients erhalten.
Ein Wechsel von MSI zu NSIS kann eine zweite Installation erzeugen, während eine
bestehende Verknüpfung weiter die alte App öffnet. NSIS-Updates erhalten zusätzlich
den Ordner der laufenden App über `/D=`, damit sie genau diese Kopie ersetzen.

Manifest-Regressionstests:

```bash
python3 -m unittest discover -s .github/scripts -p 'test_*.py'
```

Vor der Freigabe auf Windows für **MSI und NSIS** prüfen:

1. Eine ältere Version installieren und über ihre Verknüpfung starten.
2. Das Update installieren; MSI muss MSI erhalten, NSIS muss NSIS erhalten.
3. Nach dem automatischen Start die App vollständig schließen.
4. Dieselbe Verknüpfung erneut öffnen: Die neue Version muss starten und das
   Update-Popup darf nicht wieder erscheinen.
5. Für NSIS auch einen benutzerdefinierten Installationsordner mit Leerzeichen
   testen. Der Pfad der App muss beim Update gleich bleiben.

Bereits entstandene doppelte Installationen werden nicht automatisch entfernt.
In diesem Fall das Ziel der verwendeten Verknüpfung prüfen und die neue Version
mit demselben Installer-Typ wie die dortige Installation installieren.



HINWEIS: 

macOS-Build läuft nur auf macOS, Windows-Build nur auf Windows.     
                                         
  Tauri baut immer nur für das aktuelle Betriebssystem. Um eine .exe zu     
  bekommen musst du npx tauri build auf einem Windows-PC ausführen (oder
  GitHub Actions CI nutzen, die baut für alle Plattformen automatisch).     
           
  Einfachste Option für Windows-Build: Auf dem Windows-Rechner zuhause:     
  1. git clone https://github.com/Cloonson/MOROX.git
  2. Node.js + Rust installieren                                            
  3. npm install                
  4. npx tauri build                                                        
                    
  Dann hat er eine .exe lokal.  
