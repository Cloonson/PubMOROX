import { toast } from "sonner"

export class ExportCancelledError extends Error {
  constructor() { super("Speichern abgebrochen"); this.name = "ExportCancelledError" }
}

export function isExportCancelled(error: unknown): boolean {
  return error instanceof ExportCancelledError
}

interface SavedExport { path: string; openError: string | null }
export interface DesktopExportServices {
  save(filename: string, bytes: number[]): Promise<SavedExport | null>
  reveal(path: string): Promise<void>
}

function isTauri() {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
}

export function safeExportName(filename: string): string {
  let name = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/, "")
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`
  return name || "Dokument"
}

async function desktopServices(): Promise<DesktopExportServices> {
  const { invoke } = await import("@tauri-apps/api/core")
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener")
  return {
    save: (filename, bytes) => invoke<SavedExport | null>("save_export_file", { filename, bytes }),
    reveal: revealItemInDir,
  }
}

export async function openSavedFile(path: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("open_export_file", { path })
}

/** All generated desktop files use the native OS save dialog. Cancellation is
 * distinct from both success and write failure; opening never triggers a second download. */
export async function saveGeneratedFile(blob: Blob, filename: string, services?: DesktopExportServices): Promise<string> {
  filename = safeExportName(filename)
  if (services || isTauri()) {
    const desktop = services ?? await desktopServices()
    const result = await desktop.save(filename, Array.from(new Uint8Array(await blob.arrayBuffer())))
    if (!result) {
      toast.info("Speichern abgebrochen")
      throw new ExportCancelledError()
    }
    toast.success("Datei gespeichert", {
      description: result.path,
      duration: 10000,
      action: {
        label: "Im Ordner anzeigen",
        onClick: () => { void desktop.reveal(result.path).catch(() => toast.error("Speicherordner konnte nicht geöffnet werden")) },
      },
    })
    if (result.openError) {
      toast.warning("Datei gespeichert, konnte aber nicht geöffnet werden", {
        description: result.openError,
        duration: 10000,
      })
    }
    return result.path
  }

  // Browser-only use cannot launch local Word or an OS file dialog on every
  // browser. Keep the fallback honest: a download is started, not confirmed saved.
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  toast.info("Download gestartet", {
    description: `${filename} – Den Speicherort legt dein Browser fest.`,
    duration: 10000,
    ...(blob.type === "application/pdf" ? {
      action: {
        label: "PDF öffnen",
        onClick: () => {
          const preview = URL.createObjectURL(blob)
          window.open(preview, "_blank", "noopener,noreferrer")
          setTimeout(() => URL.revokeObjectURL(preview), 60000)
        },
      },
    } : {}),
  })
  return filename
}
