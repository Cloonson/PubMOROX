"use client"

import React, { useEffect, useState } from "react"
import { listStoredFiles, deleteFileFromStorage, openFileFromStorage, type StoredFile } from "@/lib/storage-service"
import { FileText, Download, Trash2, Search, RefreshCw, FileBox, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function StorageView() {
  const [files, setFiles] = useState<StoredFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const loadFiles = async () => {
    setLoading(true);
    try {
      const storedFiles = await listStoredFiles();
      setFiles(storedFiles);
    } catch (e) {
      toast.error("Fehler beim Laden der Dateien");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  const handleReveal = async (filename: string) => {
    const isTauri = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
    if (!isTauri) return
    try {
      const { documentDir, join } = await import("@tauri-apps/api/path")
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener")
      const docPath = await documentDir()
      const filePath = await join(docPath, "MOROX", "files", filename)
      await revealItemInDir(filePath)
    } catch (e) {
      toast.error("Speicherort konnte nicht geöffnet werden")
    }
  }

  const handleDelete = async (filename: string) => {
    if (confirm(`Möchten Sie "${filename}" wirklich löschen?`)) {
      const success = await deleteFileFromStorage(filename);
      if (success) {
        toast.success("Datei gelöscht");
        loadFiles();
      } else {
        toast.error("Fehler beim Löschen");
      }
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Speicher</h1>
          <p className="text-muted-foreground">Alle lokal generierten Dokumente im Überblick.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadFiles} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Dokumente durchsuchen..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Lade Dokumente...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileBox className="w-12 h-12 mb-4 opacity-20" />
              <p>{searchTerm ? "Keine passenden Dokumente gefunden." : "Noch keine Dokumente gespeichert."}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div 
                  key={file.name}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-none mb-1">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.lastModified)} • {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openFileFromStorage(file.name)}
                      title="Herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReveal(file.name)}
                      title="Speicherort öffnen"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
