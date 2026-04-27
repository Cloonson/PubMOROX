"use client"

import { useState, useRef } from "react"
import { Upload, Download, FileSpreadsheet, Users, BarChart3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseLeistungsdaten, fillBerechnungsschema, getPositionInfo, type VerguetungResult } from "@/lib/verguetung-calculator"

const TEMPLATE_PATH = "/invest/Berechnungsschema_2025_v1.08_Versand.xlsx"

export function VerguetungsverhandlungenView() {
  const [result, setResult] = useState<VerguetungResult | null>(null)
  const [filename, setFilename] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [filling, setFilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parseLeistungsdaten(buffer)
      setResult(parsed)
      setFilename(file.name)
    } catch (err) {
      setError("Fehler beim Einlesen der Datei: " + String(err))
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDownload = async () => {
    if (!result) return
    setFilling(true)
    setError(null)
    try {
      const resp = await fetch(TEMPLATE_PATH)
      if (!resp.ok) throw new Error("Template nicht gefunden: " + TEMPLATE_PATH)
      const templateBuffer = await resp.arrayBuffer()
      const blob = await fillBerechnungsschema(templateBuffer, result)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Berechnungsschema_2025_ausgefuellt.xlsx"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError("Fehler beim Ausfüllen: " + String(err))
    } finally {
      setFilling(false)
    }
  }

  const pg = result?.pflegegrade

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Vergütungsverhandlungen</h1>
        <p className="text-muted-foreground text-sm">
          Leistungsdaten importieren → Berechnungsschema automatisch ausfüllen
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground mb-4 space-y-1">
        <p className="font-medium text-foreground">So exportierst du die Leistungsdaten:</p>
        <ol className="list-decimal list-inside space-y-0.5 mt-1">
          <li>In <span className="font-medium text-foreground">meinpflegedienst.com</span> auf <span className="font-medium text-foreground">Rechnung</span> klicken</li>
          <li>Auf <span className="font-medium text-foreground">Statistik</span> klicken</li>
          <li>Das gewünschte <span className="font-medium text-foreground">Jahr</span> auswählen</li>
          <li>Zeitraum <span className="font-medium text-foreground">Januar – Dezember</span> auswählen</li>
          <li>Zu <span className="font-medium text-foreground">Leistungen</span> wechseln und exportieren</li>
        </ol>
      </div>

      {/* Import */}
      <div className="border border-dashed border-border rounded-xl p-8 text-center mb-6 bg-muted/20">
        <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          {filename ? (
            <span className="font-medium text-foreground">{filename}</span>
          ) : (
            "Leistungsdaten-Exportdatei (.xls / .xlsx) einlesen"
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Wird eingelesen…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Datei auswählen
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Pflegegrade summary */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Patienten nach Pflegegrad
              <span className="ml-auto text-xs font-normal normal-case">
                Gesamt: {result.totalPatients} Patienten
              </span>
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const count = pg?.[`pg${n}` as keyof typeof pg] ?? 0
                return (
                  <div
                    key={n}
                    className="rounded-lg border border-border bg-card p-4 text-center"
                  >
                    <div className="text-xs text-muted-foreground mb-1">PG {n}</div>
                    <div className="text-2xl font-bold text-foreground">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leistungen summary */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Erkannte Leistungspositionen
            </h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-16">Nr.</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Komplex</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Positionsnummer</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Anzahl</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group by P-code: merge rows that map to the same cell
                    const grouped = new Map<string, { info: ReturnType<typeof getPositionInfo>; positions: string[]; anzahl: number }>()
                    const ungrouped: { pos: string; anzahl: number }[] = []

                    for (const [pos, anzahl] of Object.entries(result.leistungen)) {
                      const info = getPositionInfo(pos)
                      if (info) {
                        const key = info.pCode
                        if (grouped.has(key)) {
                          const g = grouped.get(key)!
                          g.positions.push(pos)
                          g.anzahl += anzahl
                        } else {
                          grouped.set(key, { info, positions: [pos], anzahl })
                        }
                      } else {
                        ungrouped.push({ pos, anzahl })
                      }
                    }

                    const rows = [
                      ...[...grouped.values()].sort((a, b) => (a.info!.sortKey) - (b.info!.sortKey)),
                      ...ungrouped.map(({ pos, anzahl }) => ({ info: null, positions: [pos], anzahl })),
                    ]

                    return rows.map(({ info, positions, anzahl }) => (
                      <tr key={positions.join(",")} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono font-semibold text-xs text-primary">{info?.pCode ?? "—"}</td>
                        <td className="px-4 py-2">{info?.name ?? <span className="text-muted-foreground italic">unbekannt</span>}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{positions.join(", ")}</td>
                        <td className="px-4 py-2 text-right font-medium">{anzahl}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <Button onClick={handleDownload} disabled={filling}>
              {filling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Wird erstellt…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Berechnungsschema herunterladen
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
