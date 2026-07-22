import { ROWS_PER_PAGE, paginate, persistExportFile, type HandzeichenRow, type HandzeichenlisteDraft } from "@/lib/handzeichenliste-service"

const COLUMNS = [
  { header: "Name, Vorname", key: "name", width: 42 },
  { header: "Anschrift (Straße, PLZ, Ort)", key: "anschrift", width: 60 },
  { header: "Qualifikation *)", key: "qualifikation", width: 22 },
  { header: "Wochentl.\nArbeitszeit\n(in Std.)", key: "wochenstunden", width: 20 },
  { header: "Beschäftigungs-\nbeginn", key: "beginn", width: 28 },
  { header: "Unterschrift\ndes Mitarbeiters", key: "unterschrift", width: 40 },
  { header: "Hand-\nzeichen", key: "handzeichen", width: 20 },
  { header: "Ausge-\nschieden am:", key: "ausgeschieden", width: 28 },
] as const

const LEGEND_LEFT = [
  "*) K = Krankenschwester/Krankenpfleger",
  "     A = Altenpflegerin/Altenpfleger",
  "     HW = Hauswirtschafter/in",
  "     KPH = Krankenpflegehelferin/Krankenpflegehelfer",
  "     AZ = Arzthelferin",
  "     S = Sonstige Kraft (bitte genaue Bezeichnung angeben)",
]

const LEGEND_RIGHT = [
  "**) weitere Mitarbeiter bitte auf gesondertem Blatt angeben",
  "     Pfl. = Pflegeassistent/in",
  "     Pfl.1 = Pflegefachfrau / Pflegefachmann in LG1+LG2",
]

type Cell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }
type BodyRow = Cell[]

function rowToCells(row: HandzeichenRow): BodyRow {
  return [
    `${row.nachname}${row.nachname && row.vorname ? ", " : ""}${row.vorname}`,
    row.anschrift,
    row.qualifikation,
    row.wochenstunden,
    row.beschaeftigungsbeginn,
    "",
    "",
    row.ausgeschiedenAm,
  ]
}

function sectionRow(label: string): BodyRow {
  return [{ content: label, colSpan: COLUMNS.length, styles: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "left" as const } }]
}

export async function buildHandzeichenlistePdf(draft: HandzeichenlisteDraft): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  const pdlRow = draft.pdlRow
  const stellvRow = draft.stellvPdlRow
  const pages = paginate(draft.weitereMitarbeiter)

  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex > 0) doc.addPage()

    let y = margin
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Dokumentation der Unterschriften / Handzeichen der beschäftigten Pflegekräfte / Mitarbeiter", margin, y)
    y += 6
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.text("Name und Anschrift der Krankenpflegeeinrichtung", margin, y)
    y += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(150, 20, 20)
    doc.text("Pflegedienst MORO GmbH, Provinzialstraße 82, 44388 Dortmund", margin, y)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("IK-Nr: 460 502 542", pageWidth - margin, y, { align: "right" })
    y += 5

    const body: BodyRow[] = []
    body.push(sectionRow("Pflegedienstleitung seit:"))
    body.push(rowToCells(pdlRow ?? pdlRowFallback()))
    body.push(sectionRow("stellvertretende Pflegedienstleitung seit:"))
    body.push(rowToCells(stellvRow ?? pdlRowFallback()))
    body.push(sectionRow("weitere Mitarbeiter"))
    for (const r of pageRows) body.push(rowToCells(r))

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [COLUMNS.map((c) => c.header)],
      body,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, valign: "middle" },
      headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.5, halign: "center" },
      columnStyles: Object.fromEntries(COLUMNS.map((c, i) => [i, { cellWidth: c.width }])),
      tableWidth: COLUMNS.reduce((sum, c) => sum + c.width, 0),
    })

    const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    let footerY = (lastAutoTable?.finalY ?? y) + 5
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    LEGEND_LEFT.forEach((line, i) => doc.text(line, margin, footerY + i * 3.2))
    LEGEND_RIGHT.forEach((line, i) => doc.text(line, margin + 140, footerY + i * 3.2))
    footerY += Math.max(LEGEND_LEFT.length, LEGEND_RIGHT.length) * 3.2 + 3

    doc.setFontSize(7)
    doc.text(
      "Sofern Qualifikationsnachweis bisher nicht eingereicht wurde, bitte auf gesondertem Blatt angeben.",
      margin,
      footerY
    )
    // Leerraum zum tatsächlichen Unterschreiben, bevor die Linie + Beschriftung kommt
    footerY += 16

    doc.setFontSize(8)
    doc.line(margin, footerY, margin + 45, footerY)
    doc.text("Datum", margin, footerY + 4)
    doc.line(margin + 90, footerY, margin + 190, footerY)
    doc.text("Unterschrift und Stempel", margin + 90, footerY + 4)

    doc.setFontSize(8)
    doc.text("Anlage 2", pageWidth - margin, pageHeight - margin, { align: "right" })
  })

  return doc.output("blob")
}

function pdlRowFallback(): HandzeichenRow {
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

export async function exportHandzeichenlistePdf(draft: HandzeichenlisteDraft, filename: string): Promise<string> {
  const blob = await buildHandzeichenlistePdf(draft)
  const finalName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  await persistExportFile(finalName, blob)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = finalName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return finalName
}

export { ROWS_PER_PAGE }
