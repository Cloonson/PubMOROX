export interface MinutenConfig {
  grundpflege: number
  haeuslicheBetreuung: number
  hauswirtschaft: number
}

export interface EigenerklarungResult {
  // Punktwert-Formular
  punkteLK_1_14_16_30: number
  ertraegeLK31_33: number

  // Zeitwert-Formular
  umsaetzeGrundpflege: number
  umsaetzeBetreuung: number
  umsaetzeHauswirtschaft: number
  umsaetzeLK17: number
  anzahlGrundpflege: number
  anzahlBetreuung: number
  anzahlHauswirtschaft: number

  // VZÄ SGB XI Berechnung
  ertraegeSgbXITotal: number   // Alle SGB XI Erträge (für VZÄ-Formel)
  gesamtertragTotal: number     // Alle Erträge gesamt

  hasPunkteCol: boolean
  hasBetragsCol: boolean
  warnings: string[]
}

// Kategorie je LK-Nummer
type LKKat = "grundpflege" | "betreuung" | "hauswirtschaft" | "lk17" | "lk31_33" | "excluded"

function lkKategorie(lk: number): LKKat {
  if (lk === 15 || lk === 150) return "excluded"   // Hausbesuchspauschalen
  if (lk === 17) return "lk17"                       // Beratungsbesuch §37.3
  if (lk >= 31 && lk <= 33) return "lk31_33"
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30].includes(lk)) return "grundpflege"
  if ([16, 18].includes(lk)) return "betreuung"
  if ([11, 12, 13, 14, 22].includes(lk)) return "hauswirtschaft"
  return "grundpflege" // default unbekannte LK zu Grundpflege
}

// Letzte 2 Ziffern der Positionsnummer als LK-Nummer
function posToLK(pos: string): number | null {
  const clean = pos.trim().replace(/[^0-9a-z]/gi, "").toLowerCase()
  // Sonderfall 15a
  if (clean.endsWith("15a") || clean.endsWith("015a")) return 150
  const num = parseInt(clean.slice(-2))
  return isNaN(num) ? null : num
}

export async function parseEigenerklarung(
  buffer: ArrayBuffer,
  minutenConfig: MinutenConfig
): Promise<EigenerklarungResult> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  const warnings: string[] = []

  if (rows.length < 2) {
    warnings.push("Excel-Datei enthält keine Daten.")
    return emptyResult(warnings)
  }

  const header = rows[0] as unknown[]
  const findCol = (keywords: string[]): number => {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i] ?? "").toLowerCase().replace(/\s+/g, "")
      if (keywords.some((k) => h.includes(k))) return i
    }
    return -1
  }

  const colPos    = findCol(["positionsnummer", "position", "leistungsnummer"])
  const colAnzahl = findCol(["anzahl", "menge"])
  const colArt    = findCol(["leistungsart", "art", "kostenträger"])
  const colPunkte = findCol(["punkte", "punktzahl", "gesamtpunkte"])
  const colBetrag = findCol(["betrag", "euro", "umsatz", "preis", "summe", "betrag(eur)"])

  const hasPunkteCol = colPunkte >= 0
  const hasBetragsCol = colBetrag >= 0

  if (!hasPunkteCol) {
    warnings.push("Keine Punkte-Spalte gefunden. Für Punktwert-Berechnung Export mit Punktspalte verwenden.")
  }
  if (!hasBetragsCol) {
    warnings.push("Keine Betrags-Spalte gefunden. Euro-Werte können nicht berechnet werden.")
  }
  if (colPos < 0) {
    warnings.push("Keine Positionsnummer-Spalte gefunden. Bitte Leistungsstatistik-Export verwenden.")
    return emptyResult(warnings)
  }

  let punkteLK_1_14_16_30 = 0
  let ertraegeLK31_33 = 0
  let umsaetzeGrundpflege = 0
  let umsaetzeBetreuung = 0
  let umsaetzeHauswirtschaft = 0
  let umsaetzeLK17 = 0
  let anzahlGrundpflege = 0
  let anzahlBetreuung = 0
  let anzahlHauswirtschaft = 0
  let ertraegeSgbXITotal = 0
  let gesamtertragTotal = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue

    const pos    = colPos >= 0    ? String(row[colPos]    ?? "").trim() : ""
    const anzahl = colAnzahl >= 0 ? Number(row[colAnzahl]) || 0 : 0
    const art    = colArt >= 0    ? String(row[colArt]    ?? "").trim().toLowerCase() : ""
    const punkte = colPunkte >= 0 ? Number(row[colPunkte]) || 0 : 0
    const betrag = colBetrag >= 0 ? Number(row[colBetrag]) || 0 : 0

    // Gesamtertrag über alle Zeilen summieren
    gesamtertragTotal += betrag

    if (!pos) continue

    const isSgbXI = !art || art.includes("sgb xi") || art.includes("xi") || art.includes("pflegekasse")

    if (isSgbXI) {
      ertraegeSgbXITotal += betrag
    } else {
      continue // SGB V, §45b etc. nur für Gesamtertrag, nicht für Eigenerklärung
    }

    const lk = posToLK(pos)
    if (lk === null) continue

    const kat = lkKategorie(lk)
    if (kat === "excluded") continue

    if (kat === "lk31_33") {
      ertraegeLK31_33 += betrag
      continue
    }

    if (kat === "lk17") {
      umsaetzeLK17 += betrag
      continue
    }

    punkteLK_1_14_16_30 += hasPunkteCol ? punkte : 0

    if (kat === "grundpflege") {
      umsaetzeGrundpflege += betrag
      anzahlGrundpflege += anzahl
    } else if (kat === "betreuung") {
      umsaetzeBetreuung += betrag
      anzahlBetreuung += anzahl
    } else if (kat === "hauswirtschaft") {
      umsaetzeHauswirtschaft += betrag
      anzahlHauswirtschaft += anzahl
    }
  }

  const r2 = (n: number) => Math.round(n * 100) / 100

  return {
    punkteLK_1_14_16_30: Math.round(punkteLK_1_14_16_30),
    ertraegeLK31_33: r2(ertraegeLK31_33),
    umsaetzeGrundpflege: r2(umsaetzeGrundpflege),
    umsaetzeBetreuung: r2(umsaetzeBetreuung),
    umsaetzeHauswirtschaft: r2(umsaetzeHauswirtschaft),
    umsaetzeLK17: r2(umsaetzeLK17),
    anzahlGrundpflege,
    anzahlBetreuung,
    anzahlHauswirtschaft,
    ertraegeSgbXITotal: r2(ertraegeSgbXITotal),
    gesamtertragTotal: r2(gesamtertragTotal),
    hasPunkteCol,
    hasBetragsCol,
    warnings,
  }
}

function emptyResult(warnings: string[]): EigenerklarungResult {
  return {
    punkteLK_1_14_16_30: 0, ertraegeLK31_33: 0,
    umsaetzeGrundpflege: 0, umsaetzeBetreuung: 0, umsaetzeHauswirtschaft: 0, umsaetzeLK17: 0,
    anzahlGrundpflege: 0, anzahlBetreuung: 0, anzahlHauswirtschaft: 0,
    ertraegeSgbXITotal: 0, gesamtertragTotal: 0,
    hasPunkteCol: false, hasBetragsCol: false, warnings,
  }
}

export function berechneteMinuten(result: EigenerklarungResult, config: MinutenConfig) {
  return {
    grundpflege: Math.round(result.anzahlGrundpflege * config.grundpflege),
    betreuung:   Math.round(result.anzahlBetreuung   * config.haeuslicheBetreuung),
    hauswirtschaft: Math.round(result.anzahlHauswirtschaft * config.hauswirtschaft),
  }
}

export function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
