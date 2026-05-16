"use client"

import { useState, useEffect } from "react"
import { Settings, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function SettingsDialog() {
  const [zoom, setZoom] = useState(125)
  const [minijobLimit, setMinijobLimit] = useState("603,00")

  useEffect(() => {
    // Zoom beim Laden aus localStorage abrufen
    const savedZoom = localStorage.getItem("app-zoom")
    if (savedZoom) {
      const zoomValue = parseInt(savedZoom)
      setZoom(zoomValue)
      applyZoom(zoomValue)
    }

    // Minijob-Grenze beim Laden aus localStorage abrufen
    const savedLimit = localStorage.getItem("minijob-limit")
    if (savedLimit) {
      setMinijobLimit(savedLimit)
    }
  }, [])

  const applyZoom = (zoomValue: number) => {
    document.documentElement.style.zoom = `${zoomValue}%`
  }

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.max(75, Math.min(200, zoom + delta))
    setZoom(newZoom)
    applyZoom(newZoom)
    localStorage.setItem("app-zoom", newZoom.toString())
  }

  const resetZoom = () => {
    setZoom(125)
    applyZoom(125)
    localStorage.setItem("app-zoom", "125")
  }

  const handleMinijobLimitChange = (value: string) => {
    // Erlaube nur Zahlen, Kommas und Punkte
    const sanitized = value.replace(/[^\d.,]/g, "")
    setMinijobLimit(sanitized)
  }

  const handleMinijobLimitBlur = () => {
    // Konvertiere zu Dezimalformat mit 2 Nachkommastellen
    let value = minijobLimit.replace(",", ".")
    const numValue = parseFloat(value)
    
    if (!isNaN(numValue)) {
      const formatted = numValue.toFixed(2).replace(".", ",")
      setMinijobLimit(formatted)
      localStorage.setItem("minijob-limit", formatted)
    } else {
      // Fallback auf Standardwert
      setMinijobLimit("603,00")
      localStorage.setItem("minijob-limit", "603,00")
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-50 bg-white/90 hover:bg-gray-200 shadow-md text-gray-700 hover:text-gray-900"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Passen Sie die Anzeige nach Ihren Wünschen an.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Zoom-Stufe</Label>
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoomChange(-5)}
                disabled={zoom <= 75}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold">{zoom}%</div>
                <div className="text-sm text-muted-foreground">
                  Aktuelle Größe
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoomChange(5)}
                disabled={zoom >= 200}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoomChange(-10)}
                disabled={zoom <= 75}
                className="flex-1"
              >
                -10%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                className="flex-1"
              >
                Standard (125%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoomChange(10)}
                disabled={zoom >= 200}
                className="flex-1"
              >
                +10%
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center pt-2">
              Zoom-Bereich: 75% - 200%
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <Label className="text-base font-semibold">Minijob-Entgeltgrenze</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={minijobLimit}
                  onChange={(e) => handleMinijobLimitChange(e.target.value)}
                  onBlur={handleMinijobLimitBlur}
                  placeholder="z.B. 603,00"
                  className="text-center text-lg font-semibold"
                />
                <span className="text-muted-foreground">€</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
