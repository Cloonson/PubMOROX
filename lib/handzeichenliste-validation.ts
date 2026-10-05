import type { HandzeichenRow, HandzeichenlisteDraft } from "@/lib/handzeichenliste-service"

const FIELDS = {
  name: "Nachname und Vorname",
  anschrift: "Anschrift",
  qualifikation: "Qualifikation",
  wochenstunden: "Wochenstunden",
  beschaeftigungsbeginn: "Beschäftigungsbeginn",
} as const

export type HandzeichenField = keyof typeof FIELDS
export interface MissingHandzeichenField {
  key: string
  label: string
}

export function missingHandzeichenFields(draft: HandzeichenlisteDraft): MissingHandzeichenField[] {
  const missing: MissingHandzeichenField[] = []
  if (!draft.periodeLabel.trim()) missing.push({ key: "periode", label: "Periode" })

  const checkRow = (row: HandzeichenRow | null, key: string, label: string) => {
    for (const field of Object.keys(FIELDS) as HandzeichenField[]) {
      const filled = field === "name"
        ? !!row?.nachname.trim() && !!row?.vorname.trim()
        : !!row?.[field].trim()
      if (!filled) missing.push({ key: `${key}.${field}`, label: `${label}: ${FIELDS[field]}` })
    }
  }

  checkRow(draft.pdlRow, "pdlRow", "Pflegedienstleitung")
  checkRow(draft.stellvPdlRow, "stellvPdlRow", "Stellvertretende Pflegedienstleitung")
  // Only actual draft rows are validated, never the automatic page padding.
  draft.weitereMitarbeiter.forEach((row, i) => {
    const name = [row.nachname, row.vorname].filter(Boolean).join(", ")
    checkRow(row, `mitarbeiter.${i}`, `Mitarbeiter ${i + 1}${name ? ` (${name})` : ""}`)
  })
  // Signatures are handwritten after printing; departure date is optional.
  return missing
}
