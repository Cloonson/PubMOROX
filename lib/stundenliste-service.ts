export const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const

export interface MonthRaw {
  stundenAktuell: number
  ausgezahlt: number
  ausgezahlteUeberstunden: number
  sonntag: number
  feiertagMitFza: number
  feiertagOhneFza: number
  urlaubGenommen: number
}

export const EMPTY_MONTH: MonthRaw = {
  stundenAktuell: 0,
  ausgezahlt: 0,
  ausgezahlteUeberstunden: 0,
  sonntag: 0,
  feiertagMitFza: 0,
  feiertagOhneFza: 0,
  urlaubGenommen: 0,
}

export interface StundenlisteSheet {
  id: string
  employeeId: string
  year: number
  stundenVormonatJan: number // "Stunden Vormonat" Januar-Wert, alle Folgemonate = Vormonat-Reststunden
  urlaubsanspruchLaufendesJahr: number // konstanter Jahres-Basiswert (wird pro Monat fortgeschrieben)
  resturlaubsanspruchVorjahr: number
  months: MonthRaw[] // Index 0 = Januar .. 11 = Dezember
  archiviert: boolean
  createdAt: number
  updatedAt: number
}

export interface MonthComputed extends MonthRaw {
  stundenVormonat: number
  summe: number
  reststunden: number
  urlaubsanspruch: number
}

export interface StundenlisteConfig {
  dismissedWorkerIds: string[]
}

const SHEETS_FILE = "MOROX/stundenlisten.json"
const CONFIG_FILE = "MOROX/stundenlisten-config.json"

function isTauri(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
}

async function readJson<T>(filename: string, fallbackKey: string, fallback: T): Promise<T> {
  if (!isTauri()) {
    const raw = localStorage.getItem(fallbackKey)
    return raw ? JSON.parse(raw) : fallback
  }
  try {
    const { BaseDirectory, readTextFile } = await import("@tauri-apps/plugin-fs")
    const raw = await readTextFile(filename, { baseDir: BaseDirectory.Document })
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJson<T>(filename: string, fallbackKey: string, data: T): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(fallbackKey, JSON.stringify(data))
    return
  }
  const { BaseDirectory, writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs")
  await mkdir("MOROX", { baseDir: BaseDirectory.Document, recursive: true })
  await writeTextFile(filename, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.Document })
}

async function readSheets(): Promise<StundenlisteSheet[]> {
  return readJson(SHEETS_FILE, "morox_stundenlisten", [])
}

async function writeSheets(sheets: StundenlisteSheet[]): Promise<void> {
  return writeJson(SHEETS_FILE, "morox_stundenlisten", sheets)
}

export async function readConfig(): Promise<StundenlisteConfig> {
  return readJson(CONFIG_FILE, "morox_stundenlisten_config", { dismissedWorkerIds: [] })
}

export async function writeConfig(config: StundenlisteConfig): Promise<void> {
  return writeJson(CONFIG_FILE, "morox_stundenlisten_config", config)
}

export async function dismissWorker(employeeId: string): Promise<void> {
  const config = await readConfig()
  if (!config.dismissedWorkerIds.includes(employeeId)) {
    config.dismissedWorkerIds.push(employeeId)
    await writeConfig(config)
  }
}

export async function undismissWorker(employeeId: string): Promise<void> {
  const config = await readConfig()
  config.dismissedWorkerIds = config.dismissedWorkerIds.filter((id) => id !== employeeId)
  await writeConfig(config)
}

export async function listSheets(year?: number): Promise<StundenlisteSheet[]> {
  const sheets = await readSheets()
  return year ? sheets.filter((s) => s.year === year) : sheets
}

export async function getSheet(employeeId: string, year: number): Promise<StundenlisteSheet | null> {
  const sheets = await readSheets()
  return sheets.find((s) => s.employeeId === employeeId && s.year === year) ?? null
}

export async function createSheet(
  employeeId: string,
  year: number,
  opts?: { stundenVormonatJan?: number; urlaubsanspruchLaufendesJahr?: number; resturlaubsanspruchVorjahr?: number }
): Promise<StundenlisteSheet> {
  const sheets = await readSheets()
  const existing = sheets.find((s) => s.employeeId === employeeId && s.year === year)
  if (existing) return existing

  const sheet: StundenlisteSheet = {
    id: crypto.randomUUID(),
    employeeId,
    year,
    stundenVormonatJan: opts?.stundenVormonatJan ?? 0,
    urlaubsanspruchLaufendesJahr: opts?.urlaubsanspruchLaufendesJahr ?? 0,
    resturlaubsanspruchVorjahr: opts?.resturlaubsanspruchVorjahr ?? 0,
    months: Array.from({ length: 12 }, () => ({ ...EMPTY_MONTH })),
    archiviert: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  sheets.push(sheet)
  await writeSheets(sheets)
  return sheet
}

/**
 * Legt das Folgejahr für einen Mitarbeiter an: übernimmt die Dezember-Reststunden als
 * Vormonat-Wert für Januar, und die Resturlaubstage (N11, nach Abzug des Dezember-Urlaubs)
 * als Resturlaubsanspruch Vorjahr. Beide Werte bleiben im neuen Sheet normal editierbar.
 */
export async function rolloverToNextYear(employeeId: string, fromYear: number): Promise<StundenlisteSheet> {
  const prev = await getSheet(employeeId, fromYear)
  const prevComputed = prev ? computeMonths(prev) : null
  const decReststunden = prevComputed ? prevComputed[11].reststunden : 0
  const decResturlaubstage = prev && prevComputed ? resturlaubstage(prev, prevComputed) : 0
  return createSheet(employeeId, fromYear + 1, {
    stundenVormonatJan: decReststunden,
    urlaubsanspruchLaufendesJahr: 0,
    resturlaubsanspruchVorjahr: decResturlaubstage,
  })
}

export async function updateSheet(id: string, patch: Partial<Omit<StundenlisteSheet, "id" | "employeeId" | "year" | "createdAt">>): Promise<void> {
  const sheets = await readSheets()
  const idx = sheets.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error("Stundenliste nicht gefunden")
  sheets[idx] = { ...sheets[idx], ...patch, updatedAt: Date.now() }
  await writeSheets(sheets)
}

export async function updateMonth(id: string, monthIndex: number, patch: Partial<MonthRaw>): Promise<void> {
  const sheets = await readSheets()
  const idx = sheets.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error("Stundenliste nicht gefunden")
  const months = [...sheets[idx].months]
  months[monthIndex] = { ...months[monthIndex], ...patch }
  sheets[idx] = { ...sheets[idx], months, updatedAt: Date.now() }
  await writeSheets(sheets)
}

export async function deleteSheet(id: string): Promise<void> {
  const sheets = await readSheets()
  await writeSheets(sheets.filter((s) => s.id !== id))
}

export async function archiveSheet(id: string): Promise<void> {
  await updateSheet(id, { archiviert: true })
}

export async function restoreSheet(id: string): Promise<void> {
  await updateSheet(id, { archiviert: false })
}

export async function upsertSheetFull(sheet: StundenlisteSheet): Promise<void> {
  const sheets = await readSheets()
  const idx = sheets.findIndex((s) => s.employeeId === sheet.employeeId && s.year === sheet.year)
  if (idx === -1) {
    sheets.push(sheet)
  } else {
    sheets[idx] = { ...sheet, id: sheets[idx].id, createdAt: sheets[idx].createdAt, updatedAt: Date.now() }
  }
  await writeSheets(sheets)
}

/**
 * Spiegelt die Formeln aus der "Kopierbare Folie" Vorlage:
 * Vormonat[0] = sheet.stundenVormonatJan, Vormonat[n] = Reststunden[n-1]
 * Summe = Vormonat + StundenAktuell
 * Reststunden = Summe - Ausgezahlt - AusgezahlteÜberstunden
 *
 * Urlaub: Anspruch[Jan] = urlaubsanspruchLaufendesJahr (einmalige Jahres-Eingabe, roh)
 * Anspruch[Feb] = (resturlaubsanspruchVorjahr + Anspruch[Jan]) - UrlaubGenommen[Jan]
 * Anspruch[n>Feb] = Anspruch[n-1] - UrlaubGenommen[n-1]
 * Resturlaubstage (Spalte N) = Anspruch[Dez] - UrlaubGenommen[Dez]
 */
export function computeMonths(sheet: StundenlisteSheet): MonthComputed[] {
  const result: MonthComputed[] = []
  let prevReststunden = sheet.stundenVormonatJan
  let anspruch = sheet.urlaubsanspruchLaufendesJahr

  for (let i = 0; i < 12; i++) {
    const m = sheet.months[i] ?? EMPTY_MONTH
    const stundenVormonat = i === 0 ? sheet.stundenVormonatJan : prevReststunden
    const summe = stundenVormonat + m.stundenAktuell
    const reststunden = summe - m.ausgezahlt - m.ausgezahlteUeberstunden

    if (i === 1) {
      anspruch = sheet.resturlaubsanspruchVorjahr + anspruch - sheet.months[0].urlaubGenommen
    } else if (i > 1) {
      anspruch = anspruch - sheet.months[i - 1].urlaubGenommen
    }

    result.push({ ...m, stundenVormonat, summe, reststunden, urlaubsanspruch: anspruch })
    prevReststunden = reststunden
  }
  return result
}

export function resturlaubstage(sheet: StundenlisteSheet, computed: MonthComputed[]): number {
  return (computed[11]?.urlaubsanspruch ?? 0) - (sheet.months[11]?.urlaubGenommen ?? 0)
}
