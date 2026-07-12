import { MONTHS, computeMonths, resturlaubstage, EMPTY_MONTH, type StundenlisteSheet, type MonthRaw } from "@/lib/stundenliste-service"

const MONTH_FILLS = ["DDEBF7", "FFF2CC", "FCE4D6", "E2EFDA"]
const GRAY = "D9D9D9"
const GREEN = "A9D08E"
const ORANGE = "FFC000"
const TAB_COLOR = "FF8181"

const ROW = {
  header: 1,
  vormonat: 2,
  aktuell: 3,
  summe: 4,
  ausgezahlt: 5,
  ausgezahlteUeberstunden: 6,
  reststunden: 7,
  sonntag: 8,
  feiertagMitFza: 9,
  feiertagOhneFza: 10,
  urlaubsanspruch: 11,
  urlaubGenommen: 12,
  resturlaubsanspruchVorjahr: 14,
}

function monthCol(i: number): string {
  return String.fromCharCode("B".charCodeAt(0) + i) // B..M
}

function fill(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: `FF${argb}` } }
}

function thinTop() {
  return { top: { style: "thin" as const } }
}

export interface EmployeeRef {
  id: string
  vorname: string
  nachname: string
}

/** Baut ein einzelnes Excel-Worksheet für einen Mitarbeiter, inkl. Formeln, Farben und Formatierung. */
export function writeStundenlisteSheet(
  workbook: import("exceljs").Workbook,
  employee: EmployeeRef,
  sheetData: StundenlisteSheet
) {
  const name = `${employee.nachname}, ${employee.vorname}`.slice(0, 31)
  const ws = workbook.addWorksheet(name, { properties: { tabColor: { argb: `FF${TAB_COLOR}` } } })

  ws.getColumn("A").width = 30.5
  ws.getColumn("B").width = 11.16
  ws.getColumn("N").width = 25.16
  ws.getRow(1).height = 27
  for (let r = 2; r <= 14; r++) ws.getRow(r).height = 19

  const setCell = (coord: string, value: unknown, opts?: { bold?: boolean; size?: number; center?: boolean; fillColor?: string; border?: "thin-top" | "medium" }) => {
    const cell = ws.getCell(coord)
    cell.value = value as import("exceljs").CellValue
    if (opts?.bold || opts?.size) cell.font = { bold: !!opts.bold, size: opts.size ?? 11 }
    if (opts?.center) cell.alignment = { horizontal: "center" }
    if (opts?.fillColor) cell.fill = fill(opts.fillColor)
    if (opts?.border === "thin-top") cell.border = thinTop()
    if (opts?.border === "medium") cell.border = { top: { style: "medium" }, bottom: { style: "medium" } }
  }

  setCell("A1", sheetData.year, { bold: true, size: 16, center: true })
  MONTHS.forEach((m, i) => {
    setCell(`${monthCol(i)}1`, m, { bold: true, size: 13, center: true, fillColor: MONTH_FILLS[i % 4] })
  })

  setCell("A2", "Stunden Vormonat", { border: "thin-top" })
  setCell("A3", "Stunden aktuell")
  setCell("A4", "Summe", { border: "thin-top" })
  setCell("A5", "Ausgezahlt")
  setCell("A6", "Ausgezahlte Überstunden", { fillColor: GRAY })
  setCell("A7", "Reststunden", { border: "thin-top" })
  setCell("A8", "Sonntag", { fillColor: GRAY })
  setCell("A9", "Feiertag mit FZA")
  setCell("A10", "Feiertag ohne FZA", { fillColor: GRAY })
  setCell("N10", "Resturlaubstage", { bold: true, center: true })
  setCell("A11", "Urlaubsanspruch laufendes Jahr")
  setCell("A12", "Urlaub genommen", { fillColor: GRAY })
  setCell("A14", "Resturlaubsanspruch Vorjahr", { fillColor: GREEN, border: "medium" })
  setCell("B14", sheetData.resturlaubsanspruchVorjahr, { fillColor: GREEN, border: "medium", center: true })
  setCell("B11", sheetData.urlaubsanspruchLaufendesJahr, { center: true })

  // Stunden Vormonat Januar ist in MOROX editierbar (Startwert ohne Vorjahres-Sheet) - im Original-Template
  // gab es dafür keine sichtbare Zelle, wir schreiben ihn hier trotzdem mit rein für Nachvollziehbarkeit
  setCell("B2", sheetData.stundenVormonatJan, { fillColor: GRAY, center: true })

  for (let i = 0; i < 12; i++) {
    const col = monthCol(i)
    const m: MonthRaw = sheetData.months[i] ?? EMPTY_MONTH
    const monthFill = MONTH_FILLS[i % 4]

    setCell(`${col}3`, m.stundenAktuell, { center: true })
    setCell(`${col}5`, m.ausgezahlt, { center: true })
    setCell(`${col}6`, m.ausgezahlteUeberstunden, { fillColor: GRAY, center: true })
    setCell(`${col}8`, m.sonntag, { fillColor: GRAY, center: true })
    setCell(`${col}9`, m.feiertagMitFza, { center: true })
    setCell(`${col}10`, m.feiertagOhneFza, { fillColor: GRAY, center: true })
    setCell(`${col}12`, m.urlaubGenommen, { fillColor: GRAY, center: true })

    // Vormonat: Jan siehe B2 oben, Feb..Dez verweisen auf Reststunden des Vormonats
    if (i > 0) {
      const prevCol = monthCol(i - 1)
      setCell(`${col}2`, { formula: `${prevCol}7` }, { fillColor: GRAY, center: true })
    }

    setCell(`${col}4`, { formula: i === 0 ? `${col}3` : `${col}2+${col}3` }, { fillColor: GRAY, center: true, border: "thin-top" })
    setCell(`${col}7`, { formula: `${col}4-${col}5-${col}6` }, { fillColor: monthFill, center: true, border: "thin-top" })

    // Urlaubsanspruch-Kette
    if (i === 0) {
      // Jan zeigt den rohen Jahres-Anspruch direkt (bereits oben in B11 gesetzt)
    } else if (i === 1) {
      setCell(`${col}11`, { formula: "(B14+B11)-B12" }, { fillColor: monthFill, center: true })
    } else {
      const prevCol = monthCol(i - 1)
      setCell(`${col}11`, { formula: `${prevCol}11-${prevCol}12` }, { fillColor: monthFill, center: true })
    }
  }

  setCell("N11", { formula: "M11-M12" }, { bold: true, center: true, fillColor: ORANGE })

  return ws
}

export async function buildStundenlisteWorkbook(
  entries: { employee: EmployeeRef; sheet: StundenlisteSheet }[]
): Promise<import("exceljs").Workbook> {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "MOROX"
  workbook.created = new Date()
  for (const { employee, sheet } of entries) {
    writeStundenlisteSheet(workbook, employee, sheet)
  }
  return workbook
}

export async function exportStundenlisten(
  entries: { employee: EmployeeRef; sheet: StundenlisteSheet }[],
  filename: string
): Promise<void> {
  const workbook = await buildStundenlisteWorkbook(entries)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ImportedSheet {
  sheetName: string
  vorname: string
  nachname: string
  year: number
  stundenVormonatJan: number
  urlaubsanspruchLaufendesJahr: number
  resturlaubsanspruchVorjahr: number
  months: MonthRaw[]
}

function splitSheetName(name: string): { vorname: string; nachname: string } | null {
  const parts = name.split(",").map((p) => p.trim())
  if (parts.length !== 2) return null
  return { nachname: parts[0], vorname: parts[1] }
}

function num(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof v === "object" && "result" in (v as Record<string, unknown>)) {
    const r = (v as { result: unknown }).result
    return typeof r === "number" ? r : 0
  }
  return 0
}

/** Liest eine Mitarbeiter-Stundenliste-Excel (wie die von der Lohnbuchhaltung) ein und extrahiert pro Tab die Rohwerte. */
export async function importStundenlisten(buffer: ArrayBuffer): Promise<ImportedSheet[]> {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const results: ImportedSheet[] = []

  workbook.eachSheet((ws) => {
    if (ws.name.toLowerCase().includes("kopierbare")) return
    const names = splitSheetName(ws.name)
    if (!names) return

    const year = num(ws.getCell("A1").value) || new Date().getFullYear()
    const months: MonthRaw[] = []
    for (let i = 0; i < 12; i++) {
      const col = monthCol(i)
      months.push({
        stundenAktuell: num(ws.getCell(`${col}${ROW.aktuell}`).value),
        ausgezahlt: num(ws.getCell(`${col}${ROW.ausgezahlt}`).value),
        ausgezahlteUeberstunden: num(ws.getCell(`${col}${ROW.ausgezahlteUeberstunden}`).value),
        sonntag: num(ws.getCell(`${col}${ROW.sonntag}`).value),
        feiertagMitFza: num(ws.getCell(`${col}${ROW.feiertagMitFza}`).value),
        feiertagOhneFza: num(ws.getCell(`${col}${ROW.feiertagOhneFza}`).value),
        urlaubGenommen: num(ws.getCell(`${col}${ROW.urlaubGenommen}`).value),
      })
    }

    // MOROX-Exporte schreiben B2 direkt. Das Original-Template der Lohnbuchhaltung kennt diese
    // Zelle nicht - dort rekonstruieren wir den Jan-Startwert aus Summe Jan minus Stunden aktuell Jan.
    const b2 = ws.getCell("B2").value
    const stundenVormonatJan =
      b2 !== null && b2 !== undefined && b2 !== ""
        ? num(b2)
        : num(ws.getCell(`B${ROW.summe}`).value) - months[0].stundenAktuell

    results.push({
      sheetName: ws.name,
      vorname: names.vorname,
      nachname: names.nachname,
      year,
      stundenVormonatJan: Number.isFinite(stundenVormonatJan) ? stundenVormonatJan : 0,
      urlaubsanspruchLaufendesJahr: num(ws.getCell("B11").value),
      resturlaubsanspruchVorjahr: num(ws.getCell("B14").value),
      months,
    })
  })

  return results
}

export { computeMonths, resturlaubstage }
