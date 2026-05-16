export interface ParsedEmployee {
  mitNr: string
  nachname: string
  vorname: string
  geschlecht: string
  geburtsdatum: string
  krankenkasse: string
  position: string
  beschaeftigung: string
  lbnr: string
  telefon: string
  mobil: string
  email: string
  strasse: string
  plz: string
  ort: string
  eintrittsdatum: string
}

function parseAddress(val: unknown): { strasse: string; plz: string; ort: string } {
  const s = clean(val)
  if (!s) return { strasse: "", plz: "", ort: "" }
  const commaIdx = s.lastIndexOf(", ")
  if (commaIdx === -1) return { strasse: s, plz: "", ort: "" }
  const strasse = s.slice(0, commaIdx).trim()
  const rest = s.slice(commaIdx + 2).trim()
  const spaceIdx = rest.indexOf(" ")
  if (spaceIdx === -1) return { strasse, plz: rest, ort: "" }
  return { strasse, plz: rest.slice(0, spaceIdx), ort: rest.slice(spaceIdx + 1) }
}

function clean(val: unknown): string {
  if (val === null || val === undefined) return ""
  const s = String(val).trim()
  return s === " " ? "" : s
}

function anredeToGeschlecht(anrede: string): string {
  const a = anrede.trim().toLowerCase()
  if (a === "herr") return "männlich"
  if (a === "frau") return "weiblich"
  return ""
}

export interface AmbiguousName {
  rowIndex: number
  fullName: string
  parts: string[]
  rest: Omit<ParsedEmployee, "vorname" | "nachname">
}

export interface ParseEmployeesResult {
  employees: ParsedEmployee[]
  ambiguous: AmbiguousName[]
  hasGenderColumn: boolean
}

function splitName(full: string): { vorname: string; nachname: string } | null {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 2) return { nachname: parts[0], vorname: parts[1] }
  if (parts.length === 1) return { nachname: parts[0], vorname: "" }
  return null // ambiguous — 3+ parts, Dialog fragt nach
}

function fmtDate(val: unknown): string {
  if (!val && val !== 0) return ""
  if (val instanceof Date) {
    const d = val.getDate().toString().padStart(2, "0")
    const m = (val.getMonth() + 1).toString().padStart(2, "0")
    const y = val.getFullYear()
    return `${d}.${m}.${y}`
  }
  if (typeof val === "number") {
    // Excel serial date → JS Date (Excel epoch = 1899-12-30)
    const ms = (val - 25569) * 86400000
    const d = new Date(ms)
    const dd = d.getUTCDate().toString().padStart(2, "0")
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0")
    const yy = d.getUTCFullYear()
    return `${dd}.${mm}.${yy}`
  }
  return clean(val)
}

export async function parseEmployeesFromExcel(buffer: ArrayBuffer): Promise<ParseEmployeesResult> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "array", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // raw:true so we get actual values (incl. Date objects for date cells)
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as unknown[][]

  if (rows.length < 2) return { employees: [], ambiguous: [], hasGenderColumn: false }

  const header = (rows[0] as unknown[]).map((h) => String(h ?? "").toLowerCase().trim())

  const col = (keywords: string[]): number => {
    for (const kw of keywords) {
      const i = header.findIndex((h) => h.includes(kw))
      if (i >= 0) return i
    }
    return -1
  }

  // Separate Vorname/Nachname columns take priority; fall back to combined Name
  const colVorname  = col(["vorname", "first name", "firstname"])
  const colNachname = col(["nachname", "familienname", "last name", "lastname"])
  const colName     = colVorname < 0 && colNachname < 0 ? col(["name"]) : -1

  const colAnrede      = col(["anrede", "titel", "geschlecht", "gender"])
  const colMitNr       = col(["mit.nr", "mitarb", "personal-nr", "personalnr", "mitarbeiternr", "nr."])
  const colGeburtsdatum= col(["geburtsdatum", "geburtstag", "geb.", "birthday"])
  const colKrankenkasse= col(["krankenkasse", "kasse"])
  const colPosition    = col(["tätigkeit", "tatigkeit", "taetigkeit", "position", "funktion", "beruf"])
  const colBeschaeft   = col(["beschäftigungsverhältnis", "beschäftigungsverh", "beschäftigung", "beschaeftigung", "anstellung", "arbeitszeit"])
  const colLbnr        = col(["lbnr", "lb-nr", "lb nr"])
  const colTelefon     = col(["telefon", "tel.", "festnetz", "phone"])
  const colMobil       = col(["mobil", "handy", "mobile"])
  const colEmail       = col(["e-mail", "email", "mail"])
  const colAdresse     = col(["adresse", "anschrift", "address", "straße", "strasse"])
  const colEintritt    = col(["eintrittsdatum", "eintritt", "start", "beginn"])

  const g   = (r: unknown[], c: number) => c >= 0 ? clean(r[c]) : ""
  const gDt = (r: unknown[], c: number) => c >= 0 ? fmtDate(r[c]) : ""

  const employees: ParsedEmployee[] = []
  const ambiguous: AmbiguousName[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (!r || r.every((c) => c === null || c === undefined || c === "")) continue

    const addr = colAdresse >= 0 ? parseAddress(r[colAdresse]) : { strasse: "", plz: "", ort: "" }

    const rest: Omit<ParsedEmployee, "vorname" | "nachname"> = {
      mitNr:          g(r, colMitNr),
      geschlecht:     colAnrede >= 0 ? anredeToGeschlecht(g(r, colAnrede)) : "",
      geburtsdatum:   gDt(r, colGeburtsdatum),
      krankenkasse:   g(r, colKrankenkasse),
      position:       g(r, colPosition),
      beschaeftigung: g(r, colBeschaeft),
      lbnr:           g(r, colLbnr),
      telefon:        g(r, colTelefon),
      mobil:          g(r, colMobil),
      email:          g(r, colEmail),
      strasse:        addr.strasse,
      plz:            addr.plz,
      ort:            addr.ort,
      eintrittsdatum: gDt(r, colEintritt),
    }

    if (colName >= 0) {
      const full = clean(r[colName])
      const split = splitName(full)
      if (split) {
        employees.push({ ...rest, vorname: split.vorname, nachname: split.nachname })
      } else if (full) {
        ambiguous.push({ rowIndex: i, fullName: full, parts: full.trim().split(/\s+/), rest })
      }
    } else {
      const vorname  = g(r, colVorname)
      const nachname = g(r, colNachname)
      if (vorname || nachname) employees.push({ ...rest, vorname, nachname })
    }
  }

  return { employees, ambiguous, hasGenderColumn: colAnrede >= 0 }
}

export function diffEmployees(
  existing: import("./employee-service").Employee[],
  parsed: ParsedEmployee[]
): {
  missing: import("./employee-service").Employee[]
  toAdd: ParsedEmployee[]
  toUpdate: { emp: import("./employee-service").Employee; parsed: ParsedEmployee; changes: string[] }[]
} {
  const COMPARE_FIELDS: { key: keyof ParsedEmployee; label: string }[] = [
    { key: "position", label: "Tätigkeit" },
    { key: "beschaeftigung", label: "Beschäftigung" },
    { key: "telefon", label: "Telefon" },
    { key: "mobil", label: "Mobil" },
    { key: "email", label: "E-Mail" },
    { key: "krankenkasse", label: "Krankenkasse" },
    { key: "lbnr", label: "LBNR" },
    { key: "strasse", label: "Straße" },
    { key: "plz", label: "PLZ" },
    { key: "ort", label: "Ort" },
    { key: "geburtsdatum", label: "Geburtsdatum" },
    { key: "eintrittsdatum", label: "Eintrittsdatum" },
    { key: "geschlecht", label: "Anrede" },
  ]

  const normName = (v: string, n: string) => `${v} ${n}`.toLowerCase().trim()

  const findMatch = (p: ParsedEmployee) => {
    if (p.mitNr) {
      const byNr = existing.find((e) => e.mitNr === p.mitNr)
      if (byNr) return byNr
    }
    return existing.find((e) => normName(e.vorname, e.nachname) === normName(p.vorname, p.nachname))
  }

  const matched = new Set<string>()
  const toAdd: ParsedEmployee[] = []
  const toUpdate: { emp: import("./employee-service").Employee; parsed: ParsedEmployee; changes: string[] }[] = []

  for (const p of parsed) {
    const emp = findMatch(p)
    if (!emp) {
      toAdd.push(p)
    } else {
      matched.add(emp.id)
      const changes: string[] = []
      for (const { key, label } of COMPARE_FIELDS) {
        const oldVal = (emp as Record<string, string>)[key] || ""
        const newVal = p[key] || ""
        if (oldVal !== newVal && newVal !== "") {
          changes.push(`${label}: „${oldVal || "—"}" → „${newVal}"`)
        }
      }
      if (changes.length > 0) toUpdate.push({ emp, parsed: p, changes })
    }
  }

  const missing = existing.filter((e) => !e.archiviert && !matched.has(e.id))

  return { missing, toAdd, toUpdate }
}
