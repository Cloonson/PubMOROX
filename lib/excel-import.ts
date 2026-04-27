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

export async function parseEmployeesFromExcel(buffer: ArrayBuffer): Promise<ParsedEmployee[]> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  if (rows.length < 2) return []

  return rows
    .slice(1)
    .filter((r) => r[0] && (r[1] || r[2]))
    .map((r) => {
      const addr = parseAddress(r[12])
      return {
        mitNr: clean(r[0]),
        geschlecht: anredeToGeschlecht(clean(r[1])),
        vorname: clean(r[2]),
        nachname: clean(r[3]),
        geburtsdatum: clean(r[4]),
        krankenkasse: clean(r[5]),
        position: clean(r[6]),
        beschaeftigung: clean(r[7]),
        lbnr: clean(r[8]),
        telefon: clean(r[9]),
        mobil: clean(r[10]),
        email: clean(r[11]),
        strasse: addr.strasse,
        plz: addr.plz,
        ort: addr.ort,
        eintrittsdatum: clean(r[13]),
      }
    })
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
