export interface LeistungsdatenRow {
  klNr: string
  pflegegrad: number
  positionsnummer: string
  anzahl: number
}

export interface VerguetungResult {
  pflegegrade: { pg1: number; pg2: number; pg3: number; pg4: number; pg5: number }
  leistungen: Record<string, number>
  totalPatients: number
}

interface PositionInfo {
  pCode: string
  name: string
  row: number
  sortKey: number
  unit: "Anzahl" | "Minuten" | "Besuch"
}

// Positionsnummer → P-code info + Excel row in column F
const POSITION_INFO: Record<string, PositionInfo> = {
  "1010001": { pCode: "P01",  name: "Ganzwaschung",                          row: 35, sortKey:  1,    unit: "Minuten" },
  "1010002": { pCode: "P02",  name: "Teilwaschung",                          row: 36, sortKey:  2,    unit: "Minuten" },
  "1010003": { pCode: "P03",  name: "Ausscheidungen",                        row: 37, sortKey:  3,    unit: "Minuten" },
  "1010004": { pCode: "P04",  name: "Selbst. Nahrungsaufnahme",              row: 38, sortKey:  4,    unit: "Minuten" },
  "1010005": { pCode: "P05",  name: "Hilfe bei der Nahrungsaufnahme",        row: 39, sortKey:  5,    unit: "Minuten" },
  "1010006": { pCode: "P06",  name: "Sondenernährung",                       row: 40, sortKey:  6,    unit: "Minuten" },
  "1010011": { pCode: "P11",  name: "Einkaufen",                             row: 45, sortKey: 11,    unit: "Minuten" },
  "1010012": { pCode: "P12",  name: "Zubereiten von warmen Mahlzeiten",      row: 46, sortKey: 12,    unit: "Minuten" },
  "1010013": { pCode: "P13",  name: "Reinigung der Wohnung",                 row: 47, sortKey: 13,    unit: "Minuten" },
  "1010014": { pCode: "P14",  name: "Waschen u. Pflegen der Wäsche",         row: 48, sortKey: 14,    unit: "Minuten" },
  "1010015": { pCode: "P15",  name: "Hausbesuchspauschale",                  row: 49, sortKey: 15,    unit: "Besuch"  },
  "7010015": { pCode: "P15",  name: "Hausbesuchspauschale",                  row: 49, sortKey: 15,    unit: "Besuch"  },
  "0101015a": { pCode: "P15a", name: "Erhöhte Hausbesuchspauschale",         row: 50, sortKey: 15.5,  unit: "Besuch"  },
  "9010017": { pCode: "P17",  name: "Beratungsbesuch (§37 Abs. 3)",          row: 53, sortKey: 17,    unit: "Besuch"  },
  "1010019": { pCode: "P19",  name: "Große Grundpflege",                     row: 55, sortKey: 19,    unit: "Minuten" },
  "1010021": { pCode: "P21",  name: "Kleine Grundpflege",                    row: 57, sortKey: 21,    unit: "Minuten" },
  "7010021": { pCode: "P21",  name: "Kleine Grundpflege",                    row: 57, sortKey: 21,    unit: "Minuten" },
  "1010022": { pCode: "P22",  name: "Große hauswirtschaftliche Versorgung",  row: 58, sortKey: 22,    unit: "Minuten" },
  "1010023": { pCode: "P23",  name: "Große Grundpflege m. Lagern",           row: 59, sortKey: 23,    unit: "Minuten" },
  "1010025": { pCode: "P25",  name: "Kleine Grundpflege m. Lagern",          row: 61, sortKey: 25,    unit: "Minuten" },
  "7010025": { pCode: "P25",  name: "Kleine Grundpflege m. Lagern",          row: 61, sortKey: 25,    unit: "Minuten" },
  "1010028": { pCode: "P28",  name: "Kleine pflegerische Hilfestellung 2",   row: 64, sortKey: 28,    unit: "Minuten" },
  "1010029": { pCode: "P29",  name: "Kleine pflegerische Hilfestellung 3",   row: 65, sortKey: 29,    unit: "Minuten" },
  "1010030": { pCode: "P30",  name: "Kleine pflegerische Hilfestellung 4",   row: 66, sortKey: 30,    unit: "Minuten" },
}

// Positionsnummer → Excel row in column F (1-indexed)
const POSITION_TO_ROW: Record<string, number> = Object.fromEntries(
  Object.entries(POSITION_INFO).map(([k, v]) => [k, v.row])
)

export function getPositionInfo(pos: string): PositionInfo | null {
  return POSITION_INFO[pos.trim().toLowerCase()] ?? null
}

export function rowToCell(row: number): string {
  return `F${row}`
}

export function positionToCell(pos: string): string | null {
  const row = POSITION_TO_ROW[pos.trim().toLowerCase()]
  return row ? `F${row}` : null
}

export async function parseLeistungsdaten(buffer: ArrayBuffer): Promise<VerguetungResult> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  if (rows.length < 2) {
    return { pflegegrade: { pg1: 0, pg2: 0, pg3: 0, pg4: 0, pg5: 0 }, leistungen: {}, totalPatients: 0 }
  }

  // Find header row to determine column indices
  const header = rows[0] as unknown[]
  const findCol = (keywords: string[]): number => {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i] ?? "").toLowerCase()
      if (keywords.some((k) => h.includes(k))) return i
    }
    return -1
  }

  const colKlNr = findCol(["kl.nr", "kl. nr", "klient", "kundennummer"])
  const colPG = findCol(["pflegegrad"])
  const colPos = findCol(["positionsnummer", "position"])
  const colAnzahl = findCol(["anzahl"])
  const colArt = findCol(["leistungsart"])

  // patientPG: first PG seen per klNr
  // qualifiedPatients: klNr with at least one SGB XI (§36) row — excludes §37.3 only patients
  const patientPG = new Map<string, number>()
  const qualifiedPatients = new Set<string>()
  const leistungSums = new Map<string, number>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue

    const klNr = colKlNr >= 0 ? String(row[colKlNr] ?? "").trim() : ""
    const pgRaw = colPG >= 0 ? String(row[colPG] ?? "") : ""
    const pg = parseInt(pgRaw.replace(/[^0-9]/g, "")) || 0
    const pos = colPos >= 0 ? String(row[colPos] ?? "").trim().toLowerCase() : ""
    const anzahl = colAnzahl >= 0 ? Number(row[colAnzahl]) || 0 : 0
    const art = colArt >= 0 ? String(row[colArt] ?? "").trim() : ""

    if (klNr && pg >= 1 && pg <= 5 && !patientPG.has(klNr)) {
      patientPG.set(klNr, pg)
    }

    // Only patients with at least one Pflegesachleistung (SGB XI = §36) qualify
    // §37.3 SGB XI (Beratungsbesuche) are explicitly excluded per Berechnungsschema instructions
    // Only qualify if also has a valid Pflegegrad 1-5
    if (klNr && art === "SGB XI" && pg >= 1 && pg <= 5) {
      qualifiedPatients.add(klNr)
    }

    if (pos && anzahl > 0) {
      leistungSums.set(pos, (leistungSums.get(pos) ?? 0) + anzahl)
    }
  }

  const pgCounts = [0, 0, 0, 0, 0]
  for (const [klNr, pg] of patientPG.entries()) {
    if (qualifiedPatients.has(klNr) && pg >= 1 && pg <= 5) pgCounts[pg - 1]++
  }

  const leistungen: Record<string, number> = {}
  for (const [pos, sum] of leistungSums.entries()) {
    leistungen[pos] = sum
  }

  return {
    pflegegrade: { pg1: pgCounts[0], pg2: pgCounts[1], pg3: pgCounts[2], pg4: pgCounts[3], pg5: pgCounts[4] },
    leistungen,
    totalPatients: qualifiedPatients.size,
  }
}

export async function fillBerechnungsschema(
  templateBuffer: ArrayBuffer,
  result: VerguetungResult
): Promise<Blob> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(templateBuffer, { type: "array", cellStyles: true })

  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("daten")) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  const setCellValue = (cell: string, value: number) => {
    if (!ws[cell]) ws[cell] = { t: "n", v: value }
    else {
      ws[cell].v = value
      ws[cell].t = "n"
      delete ws[cell].f
    }
  }

  // Pflegegrade row 31
  setCellValue("A31", result.pflegegrade.pg1)
  setCellValue("C31", result.pflegegrade.pg2)
  setCellValue("D31", result.pflegegrade.pg3)
  setCellValue("E31", result.pflegegrade.pg4)
  setCellValue("F31", result.pflegegrade.pg5)

  // Leistungen: sum by cell, multiple positionsnummern can map to same row
  const cellSums = new Map<string, number>()
  for (const [pos, anzahl] of Object.entries(result.leistungen)) {
    const cell = positionToCell(pos)
    if (cell) {
      cellSums.set(cell, (cellSums.get(cell) ?? 0) + anzahl)
    }
  }

  for (const [cell, sum] of cellSums.entries()) {
    setCellValue(cell, sum)
  }

  // Expand sheet ref to cover all written cells
  const utils = XLSX.utils
  if (ws["!ref"]) {
    const range = utils.decode_range(ws["!ref"])
    // Ensure range covers at least row 66 (F66 = row index 65)
    if (range.e.r < 65) range.e.r = 65
    ws["!ref"] = utils.encode_range(range)
  }

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" })
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}
