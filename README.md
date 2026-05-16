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
