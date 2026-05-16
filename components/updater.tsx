"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

function isTauri() {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
}

export function Updater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [version, setVersion] = useState("")
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState("")
  const [checkError, setCheckError] = useState("")

  useEffect(() => {
    if (!isTauri()) {
      setCheckError("not-tauri")
      return
    }
    const timer = setTimeout(checkUpdate, 3000)
    return () => clearTimeout(timer)
  }, [])

  const checkUpdate = async () => {
    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()
      if (update?.available) {
        setVersion(update.version)
        setUpdateAvailable(true)
      } else {
        setCheckError(`kein update (current ok)`)
      }
    } catch (e: any) {
      setCheckError(e?.message || String(e))
    }
  }

  const installUpdate = async () => {
    setInstalling(true)
    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const { relaunch } = await import("@tauri-apps/plugin-process")
      const update = await check()
      if (update?.available) {
        await update.downloadAndInstall()
        await relaunch()
      }
    } catch (e: any) {
      console.error("Update fehlgeschlagen:", e)
      setError(e?.message || String(e))
      setInstalling(false)
    }
  }

  if (!updateAvailable || dismissed) return null

  return (
    <div className="fixed bottom-24 left-4 z-50 bg-background border rounded-xl shadow-lg p-4 w-72 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">Update verfügbar 🎉</p>
          <p className="text-xs text-muted-foreground mt-0.5">MOROX {version} ist bereit</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
      <Button size="sm" onClick={installUpdate} disabled={installing} className="w-full">
        {installing ? (
          "Wird installiert..."
        ) : (
          <><Download className="w-3.5 h-3.5 mr-1.5" /> Jetzt installieren</>
        )}
      </Button>
      {error && <p className="text-xs text-destructive break-words">{error}</p>}
    </div>
  )
}
