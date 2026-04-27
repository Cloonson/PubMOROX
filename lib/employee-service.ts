export interface Employee {
  id: string
  vorname: string
  nachname: string
  geschlecht: string
  geburtsdatum: string
  strasse: string
  plz: string
  ort: string
  telefon: string
  mobil: string
  email: string
  position: string
  eintrittsdatum: string
  mitNr: string
  krankenkasse: string
  beschaeftigung: string
  lbnr: string
  notizen: string
  archiviert: boolean
  createdAt: number
}

const FILENAME = "MOROX/mitarbeiter.json"

async function readEmployees(): Promise<Employee[]> {
  const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  if (!isTauri) {
    const raw = localStorage.getItem("morox_mitarbeiter")
    return raw ? JSON.parse(raw) : []
  }
  try {
    const { BaseDirectory, readTextFile } = await import("@tauri-apps/plugin-fs")
    const raw = await readTextFile(FILENAME, { baseDir: BaseDirectory.Document })
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeEmployees(employees: Employee[]): Promise<void> {
  const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  if (!isTauri) {
    localStorage.setItem("morox_mitarbeiter", JSON.stringify(employees))
    return
  }
  const { BaseDirectory, writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs")
  await mkdir("MOROX", { baseDir: BaseDirectory.Document, recursive: true })
  await writeTextFile(FILENAME, JSON.stringify(employees, null, 2), { baseDir: BaseDirectory.Document })
}

export async function listEmployees(filter: "aktiv" | "archiviert" | "alle" = "aktiv"): Promise<Employee[]> {
  const employees = await readEmployees()
  const filtered =
    filter === "alle"
      ? employees
      : filter === "archiviert"
      ? employees.filter((e) => e.archiviert)
      : employees.filter((e) => !e.archiviert)
  return filtered.sort((a, b) => a.nachname.localeCompare(b.nachname))
}

export async function saveEmployee(employee: Omit<Employee, "id" | "createdAt">): Promise<Employee> {
  const employees = await readEmployees()
  const newEmployee: Employee = {
    ...employee,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  employees.push(newEmployee)
  await writeEmployees(employees)
  return newEmployee
}

export async function updateEmployee(id: string, data: Partial<Omit<Employee, "id" | "createdAt">>): Promise<void> {
  const employees = await readEmployees()
  const idx = employees.findIndex((e) => e.id === id)
  if (idx === -1) throw new Error("Mitarbeiter nicht gefunden")
  employees[idx] = { ...employees[idx], ...data }
  await writeEmployees(employees)
}

export async function archiveEmployee(id: string): Promise<void> {
  await updateEmployee(id, { archiviert: true })
}

export async function restoreEmployee(id: string): Promise<void> {
  await updateEmployee(id, { archiviert: false })
}

export async function deleteEmployee(id: string): Promise<void> {
  const employees = await readEmployees()
  await writeEmployees(employees.filter((e) => e.id !== id))
}
