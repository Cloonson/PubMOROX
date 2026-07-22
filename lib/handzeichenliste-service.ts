import type { Employee } from "@/lib/employee-service"

export const ROWS_PER_PAGE = 11

export interface HandzeichenRow {
  employeeId: string | null
  nachname: string
  vorname: string
  anschrift: string
  qualifikation: string
  wochenstunden: string
  beschaeftigungsbeginn: string
  ausgeschiedenAm: string
  isNeu?: boolean
}

export interface HandzeichenlisteDraft {
  periodeLabel: string
  pdlRow: HandzeichenRow | null
  stellvPdlRow: HandzeichenRow | null
  weitereMitarbeiter: HandzeichenRow[]
}

export interface HandzeichenlisteRecord {
  id: string
  periodeLabel: string
  erstelltAm: number
  pdfFilename: string
  excelFilename: string
  employeeIds: string[]
}

export const EMPTY_ROW: HandzeichenRow = {
  employeeId: null,
  nachname: "",
  vorname: "",
  anschrift: "",
  qualifikation: "",
  wochenstunden: "",
  beschaeftigungsbeginn: "",
  ausgeschiedenAm: "",
}

const LOG_FILENAME = "MOROX/handzeichenliste-log.json"

interface Store {
  draft: HandzeichenlisteDraft | null
  records: HandzeichenlisteRecord[]
}

export function isTauri() {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
}

const FILES_DIR = "MOROX/handzeichenlisten"

/** Persistiert den Export zusätzlich lokal, damit er später über Verlauf erneut heruntergeladen werden kann. */
export async function persistExportFile(filename: string, blob: Blob): Promise<void> {
  if (!isTauri()) return
  const { BaseDirectory, writeFile, mkdir } = await import("@tauri-apps/plugin-fs")
  await mkdir(FILES_DIR, { baseDir: BaseDirectory.Document, recursive: true })
  const buffer = new Uint8Array(await blob.arrayBuffer())
  await writeFile(`${FILES_DIR}/${filename}`, buffer, { baseDir: BaseDirectory.Document })
}

export async function downloadPersistedExport(filename: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("Erneuter Download ist nur in der Desktop-App verfügbar")
  }
  const { BaseDirectory, readFile } = await import("@tauri-apps/plugin-fs")
  const content = await readFile(`${FILES_DIR}/${filename}`, { baseDir: BaseDirectory.Document })
  const mime = filename.endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function readStore(): Promise<Store> {
  if (!isTauri()) {
    const raw = localStorage.getItem("morox_handzeichenliste")
    return raw ? JSON.parse(raw) : { draft: null, records: [] }
  }
  try {
    const { BaseDirectory, readTextFile } = await import("@tauri-apps/plugin-fs")
    const raw = await readTextFile(LOG_FILENAME, { baseDir: BaseDirectory.Document })
    return JSON.parse(raw)
  } catch {
    return { draft: null, records: [] }
  }
}

async function writeStore(store: Store): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem("morox_handzeichenliste", JSON.stringify(store))
    return
  }
  const { BaseDirectory, writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs")
  await mkdir("MOROX", { baseDir: BaseDirectory.Document, recursive: true })
  await writeTextFile(LOG_FILENAME, JSON.stringify(store, null, 2), { baseDir: BaseDirectory.Document })
}

export async function readDraft(): Promise<HandzeichenlisteDraft | null> {
  const store = await readStore()
  return store.draft
}

export async function saveDraft(draft: HandzeichenlisteDraft): Promise<void> {
  const store = await readStore()
  store.draft = draft
  await writeStore(store)
}

export async function listRecords(): Promise<HandzeichenlisteRecord[]> {
  const store = await readStore()
  return store.records.sort((a, b) => b.erstelltAm - a.erstelltAm)
}

/** Legt einen neuen Verlaufseintrag an, oder ergänzt einen kürzlich (< 30 Min.) für dieselbe Periode erzeugten
 *  Eintrag um das jeweils andere Dateiformat, statt PDF- und Excel-Export als zwei Einträge zu duplizieren. */
export async function upsertRecord(input: {
  periodeLabel: string
  employeeIds: string[]
  pdfFilename?: string
  excelFilename?: string
}): Promise<HandzeichenlisteRecord> {
  const store = await readStore()
  const recent = store.records.find(
    (r) => r.periodeLabel === input.periodeLabel && Date.now() - r.erstelltAm < 30 * 60 * 1000
  )
  if (recent) {
    if (input.pdfFilename) recent.pdfFilename = input.pdfFilename
    if (input.excelFilename) recent.excelFilename = input.excelFilename
    recent.employeeIds = input.employeeIds
    await writeStore(store)
    return recent
  }
  const newRecord: HandzeichenlisteRecord = {
    id: crypto.randomUUID(),
    erstelltAm: Date.now(),
    periodeLabel: input.periodeLabel,
    pdfFilename: input.pdfFilename ?? "",
    excelFilename: input.excelFilename ?? "",
    employeeIds: input.employeeIds,
  }
  store.records.push(newRecord)
  await writeStore(store)
  return newRecord
}

/** Rät das Qualifikations-Kürzel (K/A/HW/KPH/AZ/Pfl./Pfl.1) anhand der Tätigkeit, plus PDL-Zusatz. */
export function guessKuerzel(position: string, rolle: "pdl" | "stellv_pdl" | "" = ""): string {
  const p = position.toLowerCase()
  let base = ""
  if (p.includes("pflegefachkraft") || p.includes("pflegefachfrau") || p.includes("pflegefachmann")) {
    base = "Pfl.1"
  } else if (p.includes("pflegehelfer") || p.includes("krankenpflegehelfer")) {
    base = "KPH"
  } else if (p.includes("krankenschwester") || p.includes("krankenpfleger")) {
    base = "K"
  } else if (p.includes("altenpfleger")) {
    base = "A"
  } else if (p.includes("hauswirtschaft")) {
    base = "HW"
  } else if (p.includes("pflegeassistent")) {
    base = "Pfl."
  } else if (p.includes("arzthelfer")) {
    base = "AZ"
  }
  const suffix = rolle === "pdl" ? "/PDL" : rolle === "stellv_pdl" ? "/StvPDL" : ""
  return `${base}${suffix}`
}

/** Auszubildende werden nie in die Handzeichenliste importiert. */
export function isAuszubildende(e: Employee): boolean {
  const text = `${e.position} ${e.beschaeftigung}`.toLowerCase()
  return text.includes("auszubild") || text.includes("azubi")
}

const BUERO_KEYWORDS = ["büro", "buero", "verwaltung", "sekretär", "sekretariat", "buchhaltung", "empfang", "office"]

/** Bürokräfte (Verwaltung/Sekretariat/Buchhaltung) sind keine Pflegekräfte und gehören nicht in die Handzeichenliste. */
export function isBueroMitarbeiter(e: Employee): boolean {
  const text = `${e.position} ${e.beschaeftigung}`.toLowerCase()
  return BUERO_KEYWORDS.some((kw) => text.includes(kw))
}

/** Alle Ausschlusskriterien für den Handzeichenliste-Import (Azubis, Bürokräfte). */
export function isExcludedFromHandzeichenliste(e: Employee): boolean {
  return isAuszubildende(e) || isBueroMitarbeiter(e)
}

export function employeeToRow(e: Employee, rolle: "pdl" | "stellv_pdl" | "" = ""): HandzeichenRow {
  return {
    employeeId: e.id,
    nachname: e.nachname,
    vorname: e.vorname,
    anschrift: [e.strasse, [e.plz, e.ort].filter(Boolean).join(" ")].filter(Boolean).join(" / "),
    qualifikation: guessKuerzel(e.position, rolle),
    wochenstunden: e.wochenstunden,
    beschaeftigungsbeginn: e.eintrittsdatum,
    ausgeschiedenAm: "",
  }
}

/** Teilt Mitarbeiterzeilen in Seiten/Sheets zu ROWS_PER_PAGE auf; nur die letzte Seite wird mit leeren (aber umrandeten) Zeilen aufgefüllt. */
export function paginate(rows: HandzeichenRow[]): HandzeichenRow[][] {
  const pages: HandzeichenRow[][] = []
  if (rows.length === 0) {
    pages.push(Array.from({ length: ROWS_PER_PAGE }, () => ({ ...EMPTY_ROW })))
    return pages
  }
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + ROWS_PER_PAGE))
  }
  const last = pages[pages.length - 1]
  while (last.length < ROWS_PER_PAGE) {
    last.push({ ...EMPTY_ROW })
  }
  return pages
}

export interface DiffResult {
  neuHireIds: string[]
  moeglicheAbgaenge: { employeeId: string; suggestedDate: string }[]
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
}

/** Vergleicht aktuelle Mitarbeiter gegen die zuletzt exportierte Liste: neue Mitarbeiter & mögliche Abgänge. */
export function diffAgainstLastRecord(current: Employee[], lastRecord: HandzeichenlisteRecord | null): DiffResult {
  if (!lastRecord) return { neuHireIds: [], moeglicheAbgaenge: [] }
  const lastIds = new Set(lastRecord.employeeIds)
  const neuHireIds = current
    .filter((e) => !e.archiviert && !lastIds.has(e.id) && !isExcludedFromHandzeichenliste(e))
    .map((e) => e.id)
  const moeglicheAbgaenge = current
    .filter((e) => e.archiviert && lastIds.has(e.id) && e.archiviertAm)
    .map((e) => ({ employeeId: e.id, suggestedDate: fmtDate(e.archiviertAm as number) }))
  return { neuHireIds, moeglicheAbgaenge }
}
