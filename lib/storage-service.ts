export interface StoredFile {
  name: string;
  path: string;
  size: number;
  lastModified: number;
}

export async function listStoredFiles(): Promise<StoredFile[]> {
  const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
  if (!isTauri) return [];

  try {
    const { BaseDirectory, readDir, stat } = await import("@tauri-apps/plugin-fs");
    
    // Versuche den "MOROX/files" Ordner in deinen "Dokumente" zu lesen
    const entries = await readDir("MOROX/files", { baseDir: BaseDirectory.Document });
    
    const files: StoredFile[] = [];
    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".docx")) {
        const filePath = `MOROX/files/${entry.name}`;
        const s = await stat(filePath, { baseDir: BaseDirectory.Document });
        
        files.push({
          name: entry.name,
          path: filePath,
          size: s.size,
          lastModified: s.mtime ? new Date(s.mtime).getTime() : Date.now()
        });
      }
    }
    
    // Sortiere nach Datum absteigend
    return files.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error("Fehler beim Auflisten der Dateien:", error);
    return [];
  }
}

export async function openFileFromStorage(filename: string) {
  try {
    const { BaseDirectory, readFile } = await import("@tauri-apps/plugin-fs");
    
    // Lade aus Dokumente/MOROX/files Ordner
    const content = await readFile(`MOROX/files/${filename}`, { baseDir: BaseDirectory.Document });
    const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Fehler beim Öffnen der Datei:", error);
  }
}

export async function deleteFileFromStorage(filename: string) {
  try {
    const { BaseDirectory, remove } = await import("@tauri-apps/plugin-fs");
    await remove(`MOROX/files/${filename}`, { baseDir: BaseDirectory.Document });
    return true;
  } catch (error) {
    console.error("Fehler beim Löschen der Datei:", error);
    return false;
  }
}
