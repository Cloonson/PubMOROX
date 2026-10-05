import { saveGeneratedFile, safeExportName } from "@/lib/file-export"
import { toast } from "sonner"
import { paginate, persistExportFile, type HandzeichenRow, type HandzeichenlisteDraft } from "@/lib/handzeichenliste-service"

const HEADERS = [
  "Name, Vorname",
  "Anschrift (Straße, PLZ, Ort)",
  "Qualifikation *)",
  "Wochentl. Arbeitszeit (in Std.)",
  "Beschäftigungsbeginn",
  "Unterschrift des Mitarbeiters",
  "Handzeichen",
  "Ausgeschieden am:",
]

const COL_WIDTHS = [24, 32, 14, 12, 16, 24, 12, 16]

const GRAY = "F0F0F0"
const RED = "961414"

function thinBorder() {
  return {
    top: { style: "thin" as const },
    left: { style: "thin" as const },
    bottom: { style: "thin" as const },
    right: { style: "thin" as const },
  }
}

function nameOf(row: HandzeichenRow): string {
  return `${row.nachname}${row.nachname && row.vorname ? ", " : ""}${row.vorname}`
}

function writeSheet(
  workbook: import("exceljs").Workbook,
  sheetName: string,
  pdlRow: HandzeichenRow | null,
  stellvRow: HandzeichenRow | null,
  pageRows: HandzeichenRow[]
) {
  const ws = workbook.addWorksheet(sheetName.slice(0, 31))
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }
  COL_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  let r = 1
  const setCell = (row: number, col: number, value: unknown, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string; align?: "left" | "center" | "right" }) => {
    const cell = ws.getCell(row, col)
    cell.value = value as import("exceljs").CellValue
    cell.font = {
      bold: !!opts?.bold,
      italic: !!opts?.italic,
      size: opts?.size ?? 10,
      color: opts?.color ? { argb: `FF${opts.color}` } : undefined,
    }
    if (opts?.align) cell.alignment = { horizontal: opts.align, vertical: "middle", wrapText: true }
    else cell.alignment = { vertical: "middle", wrapText: true }
  }

  setCell(r, 1, "Dokumentation der Unterschriften / Handzeichen der beschäftigten Pflegekräfte / Mitarbeiter", { bold: true, size: 12 })
  ws.mergeCells(r, 1, r, HEADERS.length)
  r++
  setCell(r, 1, "Name und Anschrift der Krankenpflegeeinrichtung", { italic: true, size: 9 })
  ws.mergeCells(r, 1, r, HEADERS.length)
  r++
  setCell(r, 1, "Pflegedienst MORO GmbH, Provinzialstraße 82, 44388 Dortmund", { bold: true, size: 11, color: RED })
  ws.mergeCells(r, 1, r, HEADERS.length - 2)
  setCell(r, HEADERS.length - 1, "IK-Nr:", { bold: true, align: "right" })
  setCell(r, HEADERS.length, "460 502 542", { bold: true })
  r += 2

  // Tabellenkopf
  const headerRow = r
  HEADERS.forEach((h, i) => setCell(headerRow, i + 1, h, { bold: true, size: 8, align: "center" }))
  ws.getRow(headerRow).eachCell((cell) => {
    cell.border = thinBorder()
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GRAY}` } }
  })
  r++

  const writeSectionRow = (label: string) => {
    setCell(r, 1, label, { bold: true })
    ws.mergeCells(r, 1, r, HEADERS.length)
    ws.getRow(r).eachCell((cell) => {
      cell.border = thinBorder()
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GRAY}` } }
    })
    r++
  }

  const writeDataRow = (row: HandzeichenRow) => {
    const values = [nameOf(row), row.anschrift, row.qualifikation, row.wochenstunden, row.beschaeftigungsbeginn, "", "", row.ausgeschiedenAm]
    values.forEach((v, i) => setCell(r, i + 1, v, { align: i >= 2 && i <= 4 ? "center" : "left" }))
    for (let c = 1; c <= HEADERS.length; c++) ws.getCell(r, c).border = thinBorder()
    r++
  }

  writeSectionRow("Pflegedienstleitung seit:")
  writeDataRow(pdlRow ?? emptyRow())
  writeSectionRow("stellvertretende Pflegedienstleitung seit:")
  writeDataRow(stellvRow ?? emptyRow())
  writeSectionRow("weitere Mitarbeiter")
  for (const row of pageRows) writeDataRow(row)

  r += 1
  const legendLeft = [
    "*) K = Krankenschwester/Krankenpfleger",
    "     A = Altenpflegerin/Altenpfleger",
    "     HW = Hauswirtschafter/in",
    "     KPH = Krankenpflegehelferin/Krankenpflegehelfer",
    "     AZ = Arzthelferin",
    "     S = Sonstige Kraft (bitte genaue Bezeichnung angeben)",
    "**) Pfl. = Pflegeassistent/in, Pfl.1 = Pflegefachfrau / Pflegefachmann in LG1+LG2",
  ]
  legendLeft.forEach((line) => {
    setCell(r, 1, line, { size: 7.5 })
    ws.mergeCells(r, 1, r, HEADERS.length)
    r++
  })
  r++
  setCell(r, 1, "Sofern Qualifikationsnachweis bisher nicht eingereicht wurde, bitte auf gesondertem Blatt angeben.", { size: 8 })
  ws.mergeCells(r, 1, r, HEADERS.length)
  r += 2
  setCell(r, 1, "Datum", { size: 9 })
  setCell(r, 4, "Unterschrift und Stempel", { size: 9 })
}

function emptyRow(): HandzeichenRow {
  return {
    employeeId: null,
    nachname: "",
    vorname: "",
    anschrift: "",
    qualifikation: "",
    wochenstunden: "",
    beschaeftigungsbeginn: "",
    ausgeschiedenAm: "",
  }
}

export async function buildHandzeichenlisteWorkbook(draft: HandzeichenlisteDraft): Promise<import("exceljs").Workbook> {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "MOROX"
  workbook.created = new Date()

  const pages = paginate(draft.weitereMitarbeiter)
  pages.forEach((pageRows, i) => {
    const sheetName = pages.length > 1 ? `Seite ${i + 1}` : "Handzeichenliste"
    writeSheet(workbook, sheetName, draft.pdlRow, draft.stellvPdlRow, pageRows)
  })

  return workbook
}

export async function exportHandzeichenlisteExcel(draft: HandzeichenlisteDraft, filename: string): Promise<string> {
  const workbook = await buildHandzeichenlisteWorkbook(draft)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const finalName = safeExportName(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
  await saveGeneratedFile(blob, finalName)
  try {
    await persistExportFile(finalName, blob)
  } catch {
    toast.warning("Datei gespeichert, konnte aber nicht im MOROX-Verlauf archiviert werden")
  }
  return finalName
}
