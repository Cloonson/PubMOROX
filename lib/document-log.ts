const FILENAME = "MOROX/document-log.json"

export interface DocumentLogEntry {
  id: string
  filename: string
  type: string
  vorname: string
  nachname: string
  createdAt: number
}

async function readLog(): Promise<DocumentLogEntry[]> {
  const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  if (!isTauri) {
    const raw = localStorage.getItem("morox_document_log")
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

async function writeLog(entries: DocumentLogEntry[]): Promise<void> {
  const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  if (!isTauri) {
    localStorage.setItem("morox_document_log", JSON.stringify(entries))
    return
  }
  const { BaseDirectory, writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs")
  await mkdir("MOROX", { baseDir: BaseDirectory.Document, recursive: true })
  await writeTextFile(FILENAME, JSON.stringify(entries, null, 2), { baseDir: BaseDirectory.Document })
}

export async function addDocumentLog(entry: Omit<DocumentLogEntry, "id" | "createdAt">): Promise<void> {
  try {
    const entries = await readLog()
    entries.push({ ...entry, id: crypto.randomUUID(), createdAt: Date.now() })
    await writeLog(entries)
  } catch {
    // logging should never crash the app
  }
}

export async function getDocumentsForEmployee(vorname: string, nachname: string): Promise<DocumentLogEntry[]> {
  const entries = await readLog()
  const norm = (v: string, n: string) => `${v} ${n}`.toLowerCase().trim()
  return entries
    .filter((e) => norm(e.vorname, e.nachname) === norm(vorname, nachname))
    .sort((a, b) => b.createdAt - a.createdAt)
}
