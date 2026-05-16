"use client"

import { useState, useRef } from "react"
import { AlertTriangle, Calculator, Info, ChevronDown, ChevronUp, Upload, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  parseEigenerklarung,
  berechneteMinuten,
  formatEuro,
  type EigenerklarungResult,
  type MinutenConfig,
} from "@/lib/eigenerklarung-calculator"

interface UmlagemeldungData {
  pfkVzae: string
  pfaVzae: string
  sgbXIMethode: "direkt" | "berechnen"
  pfkVzaeSgbXI: string
  pfaVzaeSgbXI: string
  ertraegeSgbXI: string
  gesamtertrag: string
  punkteAbgerechnet: "ja" | "nein" | ""
  zeitverguetungAbgerechnet: "ja" | "nein" | ""
  verguetungsvereinbarung: "ja" | "nein" | ""
  eigenerlaerungFile: File | null
  nachweisFile: File | null
  erlaeuterung: string
}

const emptyEigenerklarung: EigenerklarungResult = {
  punkteLK_1_14_16_30: 0, ertraegeLK31_33: 0,
  umsaetzeGrundpflege: 0, umsaetzeBetreuung: 0, umsaetzeHauswirtschaft: 0, umsaetzeLK17: 0,
  anzahlGrundpflege: 0, anzahlBetreuung: 0, anzahlHauswirtschaft: 0,
  ertraegeSgbXITotal: 0, gesamtertragTotal: 0,
  hasPunkteCol: false, hasBetragsCol: false, warnings: [],
}

function formatDe(val: string): string {
  const n = parseFloat(val.replace(",", "."))
  if (isNaN(n)) return "–"
  return n.toFixed(2).replace(".", ",")
}

export function UmlagemeldungView() {
  const [data, setData] = useState<UmlagemeldungData>({
    pfkVzae: "",
    pfaVzae: "",
    sgbXIMethode: "direkt",
    pfkVzaeSgbXI: "",
    pfaVzaeSgbXI: "",
    ertraegeSgbXI: "",
    gesamtertrag: "",
    punkteAbgerechnet: "",
    zeitverguetungAbgerechnet: "",
    verguetungsvereinbarung: "",
    eigenerlaerungFile: null,
    nachweisFile: null,
    erlaeuterung: "",
  })
  const [showSummary, setShowSummary] = useState(false)
  const [showCalcHint, setShowCalcHint] = useState(false)

  // Eigenerklärung-Berechnung
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelResult, setExcelResult] = useState<EigenerklarungResult | null>(null)
  const [excelFilename, setExcelFilename] = useState("")
  const [minutenConfig, setMinutenConfig] = useState<MinutenConfig>({
    grundpflege: 25,
    haeuslicheBetreuung: 60,
    hauswirtschaft: 60,
  })
  // Überschreibbare berechnete Werte
  const [punkteOverride, setPunkteOverride] = useState("")
  const [lk3133Override, setLk3133Override] = useState("")
  const [umsatzGPOverride, setUmsatzGPOverride] = useState("")
  const [umsatzBetOverride, setUmsatzBetOverride] = useState("")
  const [umsatzHWOverride, setUmsatzHWOverride] = useState("")
  const [umsatzLK17Override, setUmsatzLK17Override] = useState("")
  const [minGPOverride, setMinGPOverride] = useState("")
  const [minBetOverride, setMinBetOverride] = useState("")
  const [minHWOverride, setMinHWOverride] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelLoading(true)
    setExcelResult(null)
    try {
      const buf = await file.arrayBuffer()
      const result = await parseEigenerklarung(buf, minutenConfig)
      setExcelResult(result)
      setExcelFilename(file.name)
      // SGB XI Erträge → automatisch in VZÄ-Rechner einfüllen
      if (result.ertraegeSgbXITotal > 0) {
        set("ertraegeSgbXI", String(result.ertraegeSgbXITotal))
        set("sgbXIMethode", "berechnen")
      }
      if (result.gesamtertragTotal > 0) {
        set("gesamtertrag", String(result.gesamtertragTotal))
      }
      // Berechnete Werte in Felder schreiben (überschreibbar)
      setPunkteOverride(result.punkteLK_1_14_16_30 > 0 ? String(result.punkteLK_1_14_16_30) : "")
      setLk3133Override(result.ertraegeLK31_33 > 0 ? formatEuro(result.ertraegeLK31_33) : "")
      setUmsatzGPOverride(result.umsaetzeGrundpflege > 0 ? formatEuro(result.umsaetzeGrundpflege) : "")
      setUmsatzBetOverride(result.umsaetzeBetreuung > 0 ? formatEuro(result.umsaetzeBetreuung) : "")
      setUmsatzHWOverride(result.umsaetzeHauswirtschaft > 0 ? formatEuro(result.umsaetzeHauswirtschaft) : "")
      setUmsatzLK17Override(result.umsaetzeLK17 > 0 ? formatEuro(result.umsaetzeLK17) : "")
      const min = berechneteMinuten(result, minutenConfig)
      setMinGPOverride(min.grundpflege > 0 ? String(min.grundpflege) : "")
      setMinBetOverride(min.betreuung > 0 ? String(min.betreuung) : "")
      setMinHWOverride(min.hauswirtschaft > 0 ? String(min.hauswirtschaft) : "")
    } catch (err) {
      setExcelResult({ ...emptyEigenerklarung, warnings: ["Fehler beim Einlesen: " + String(err)] })
    } finally {
      setExcelLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const recalcMinuten = () => {
    if (!excelResult) return
    const min = berechneteMinuten(excelResult, minutenConfig)
    setMinGPOverride(min.grundpflege > 0 ? String(min.grundpflege) : "0")
    setMinBetOverride(min.betreuung > 0 ? String(min.betreuung) : "0")
    setMinHWOverride(min.hauswirtschaft > 0 ? String(min.hauswirtschaft) : "0")
  }

  const gesamtUmsatz = (() => {
    const a = parseFloat(umsatzGPOverride.replace(",", ".")) || 0
    const b = parseFloat(umsatzBetOverride.replace(",", ".")) || 0
    const c = parseFloat(umsatzHWOverride.replace(",", ".")) || 0
    return a + b + c
  })()

  const gesamtMinuten = (() => {
    const a = parseInt(minGPOverride) || 0
    const b = parseInt(minBetOverride) || 0
    const c = parseInt(minHWOverride) || 0
    return a + b + c
  })()

  const set = (field: keyof UmlagemeldungData, value: unknown) =>
    setData((prev) => ({ ...prev, [field]: value }))

  const calcVzaeSgbXI = (vzae: string, ertrag: string, gesamt: string): string => {
    const v = parseFloat(vzae.replace(",", "."))
    const e = parseFloat(ertrag.replace(",", "."))
    const g = parseFloat(gesamt.replace(",", "."))
    if (isNaN(v) || isNaN(e) || isNaN(g) || g === 0) return ""
    return ((e / g) * v).toFixed(2)
  }

  const pfkCalc = calcVzaeSgbXI(data.pfkVzae, data.ertraegeSgbXI, data.gesamtertrag)
  const pfaCalc = calcVzaeSgbXI(data.pfaVzae, data.ertraegeSgbXI, data.gesamtertrag)

  const displayPfkSgbXI = data.sgbXIMethode === "berechnen" ? pfkCalc : data.pfkVzaeSgbXI
  const displayPfaSgbXI = data.sgbXIMethode === "berechnen" ? pfaCalc : data.pfaVzaeSgbXI

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Umlagemeldung</h1>
        <p className="text-muted-foreground text-sm">
          Daten für die Umlagemeldung auf PFAU.NRW vorbereiten
        </p>
      </div>

      {/* Sektion A: VZÄ zum 15.12. */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1">
          Vollzeitäquivalente (VZÄ) zum 15.12. des Vorjahres <span className="text-destructive">*</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Pflegefachkräfte und Pflegefachassistenzkräfte, die am Stichtag 15.12. in der Einrichtung beschäftigt
          (nicht ruhender Arbeitsvertrag) oder eingesetzt (Arbeitnehmerüberlassung) sind. Berechnung: Wochenstunden ÷ übliche Vollzeit-Wochenstunden = VZÄ.
          Nicht zu berücksichtigen: Personen ohne Entgeltfortzahlung (Elternzeit, Langzeitkranke außerhalb Lohnfortzahlung, Beschäftigungsverbot).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Pflegefachkräfte VZÄ <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={data.pfkVzae}
              onChange={(e) => set("pfkVzae", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Pflegefachkräfte (3-jährige Ausbildung)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Pflegefachassistenzkräfte VZÄ <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={data.pfaVzae}
              onChange={(e) => set("pfaVzae", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Pflegefachassistenzkräfte (12–18 Monate Ausbildung)</p>
          </div>
        </div>
      </div>

      {/* Sektion B: Anteil VZÄ nach SGB XI */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1">
          Anteil VZÄ nach SGB XI <span className="text-destructive">*</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Anteil der VZÄ, der auf Pflegeleistungen nach dem SGB XI entfällt. Vorrangig zeitliche Abgrenzung.
          Hilfsweise Abgrenzung nach Erträgen möglich.
        </p>

        {/* Methode */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sgbXIMethode"
              checked={data.sgbXIMethode === "direkt"}
              onChange={() => set("sgbXIMethode", "direkt")}
              className="accent-emerald-600"
            />
            <span className="text-sm text-foreground">Direkt eingeben</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sgbXIMethode"
              checked={data.sgbXIMethode === "berechnen"}
              onChange={() => set("sgbXIMethode", "berechnen")}
              className="accent-emerald-600"
            />
            <span className="text-sm text-foreground">Berechnen (nach Ertragsanteil)</span>
          </label>
        </div>

        {data.sgbXIMethode === "berechnen" && (
          <div className="mb-4">
            <div
              className="flex items-center gap-2 cursor-pointer mb-2"
              onClick={() => setShowCalcHint(!showCalcHint)}
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-foreground">Rechenformel</span>
              {showCalcHint ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
            {showCalcHint && (
              <div className="bg-muted/30 rounded-md px-3 py-2 text-xs text-muted-foreground mb-3 space-y-1">
                <p className="font-medium text-foreground">VZÄ nach SGB XI = Erträge SGB XI Vorjahr × VZÄ gesamt ÷ Gesamtertrag Vorjahr</p>
                <p>
                  Erträge SGB XI ohne Refinanzierungsaufschläge (Punktwertaufschlag). Gesamtertrag umfasst
                  SGB XI, SGB V, SGB XII, Privatleistungen und Sonstiges.
                </p>
                <p className="italic">
                  Beispiel: 300.000 € × 5,2 VZÄ ÷ 500.000 € = 3,12 VZÄ nach SGB XI
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Erträge SGB XI Vorjahr (ohne Refinanzierungsaufschläge) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={data.ertraegeSgbXI}
                    onChange={(e) => set("ertraegeSgbXI", e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Gesamtertrag Vorjahr <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={data.gesamtertrag}
                    onChange={(e) => set("gesamtertrag", e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">SGB XI + SGB V + SGB XII + Privat + Sonstiges</p>
              </div>
            </div>
            {(pfkCalc || pfaCalc) && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-sm">
                <p className="font-medium text-foreground mb-1">Berechnetes Ergebnis:</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>PFK VZÄ nach SGB XI:</span>
                  <span className="font-medium text-foreground">{pfkCalc ? `${formatDe(pfkCalc)} VZÄ` : "–"}</span>
                  <span>PFA VZÄ nach SGB XI:</span>
                  <span className="font-medium text-foreground">{pfaCalc ? `${formatDe(pfaCalc)} VZÄ` : "–"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {data.sgbXIMethode === "direkt" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Pflegefachkräfte VZÄ nach SGB XI <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={data.pfkVzaeSgbXI}
                onChange={(e) => set("pfkVzaeSgbXI", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Pflegefachassistenzkräfte VZÄ nach SGB XI <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={data.pfaVzaeSgbXI}
                onChange={(e) => set("pfaVzaeSgbXI", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sektion: Eigenerklärung berechnen */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600" />
          Eigenerklärung automatisch berechnen
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Leistungsstatistik-Excel aus meinpflegedienst.com hochladen → Werte für die Eigenerklärung werden
          automatisch berechnet. Die Ergebnisse sind editierbar.
        </p>

        {/* Export-Anleitung */}
        <div className="bg-muted/30 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground mb-4 space-y-0.5">
          <p className="font-medium text-foreground">Export aus meinpflegedienst.com:</p>
          <ol className="list-decimal list-inside space-y-0.5 mt-1">
            <li>Rechnung → <strong className="text-foreground">Statistik</strong></li>
            <li>Jahr <strong className="text-foreground">2025</strong> auswählen</li>
            <li>Zeitraum <strong className="text-foreground">Januar – Dezember</strong></li>
            <li>Zu <strong className="text-foreground">Leistungen</strong> wechseln → exportieren</li>
          </ol>
        </div>

        {/* Minuten-Konfiguration (für Zeitvergütung) */}
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground mb-2">Minuten pro Einheit (für Zeitvergütungs-Berechnung)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { label: "Grundpflege / Erstbesuch", key: "grundpflege" as const },
              { label: "Häusliche Betreuung", key: "haeuslicheBetreuung" as const },
              { label: "Hauswirtschaftliche Versorgung", key: "hauswirtschaft" as const },
            ] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={minutenConfig[key]}
                    onChange={(e) => setMinutenConfig((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-input bg-background pl-3 pr-12 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Min/Einh.</span>
                </div>
              </div>
            ))}
          </div>
          {excelResult && (
            <button
              onClick={recalcMinuten}
              className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
            >
              ↻ Minuten neu berechnen
            </button>
          )}
        </div>

        {/* Upload */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={excelLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {excelLoading ? "Berechne..." : excelFilename ? `Neue Datei laden (${excelFilename})` : "Leistungsstatistik-Excel hochladen"}
          </button>
        </div>

        {/* Warnungen */}
        {excelResult && excelResult.warnings.length > 0 && (
          <div className="mb-4 space-y-1">
            {excelResult.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 rounded px-3 py-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Ergebnisse */}
        {excelResult && (
          <div className="space-y-4">
            {/* Punktwert-Formular */}
            <div className="border border-border rounded-md p-4">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="bg-purple-500/10 text-purple-700 text-xs px-2 py-0.5 rounded-full">Basispunktwert</span>
                Eigenerklärung Vergütungsvereinbarung mit Punktwert
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    I. Gesamtpunktzahl für 2025 (LK 1–14, 16–30, ohne LK 15/15a)
                    {excelResult.hasPunkteCol
                      ? <span className="ml-2 text-emerald-600"><CheckCircle className="w-3 h-3 inline" /> aus Excel</span>
                      : <span className="ml-2 text-amber-600"><XCircle className="w-3 h-3 inline" /> keine Punkte-Spalte</span>}
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      value={punkteOverride}
                      onChange={(e) => setPunkteOverride(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-input bg-background pl-3 pr-16 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Punkte</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    II. Pflegesachleistungen LK 31–33 für 2025 (abzgl. Refinanzierungsaufschläge)
                    {excelResult.hasBetragsCol
                      ? <span className="ml-2 text-emerald-600"><CheckCircle className="w-3 h-3 inline" /> aus Excel</span>
                      : <span className="ml-2 text-amber-600"><XCircle className="w-3 h-3 inline" /> keine Betrags-Spalte</span>}
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      value={lk3133Override}
                      onChange={(e) => setLk3133Override(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-md border border-input bg-background pl-3 pr-10 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Zeitwert-Formular */}
            <div className="border border-border rounded-md p-4">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-700 text-xs px-2 py-0.5 rounded-full">Minutenwert</span>
                Eigenerklärung Vergütungsvereinbarung mit Zeitwert
              </p>

              <p className="text-xs text-muted-foreground mb-3">
                I. Abgerechnete Umsätze nach Zeitvergütung SGB XI (ohne LK 17):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {([
                  { label: "a) Grundpflege / Erstbesuch / Folgebesuch", val: umsatzGPOverride, set: setUmsatzGPOverride },
                  { label: "b) Häusliche Betreuung", val: umsatzBetOverride, set: setUmsatzBetOverride },
                  { label: "c) Hauswirtschaftliche Versorgung", val: umsatzHWOverride, set: setUmsatzHWOverride },
                ] as const).map(({ label, val, set: setFn }) => (
                  <div key={label}>
                    <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <input type="text" value={val} onChange={(e) => setFn(e.target.value)} placeholder="0,00"
                        className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Gesamtumsätze 2025 (a+b+c)</label>
                  <div className="relative">
                    <input type="text" readOnly value={formatEuro(gesamtUmsatz)}
                      className="w-full rounded-md border border-border bg-muted/30 pl-3 pr-8 py-1.5 text-sm text-muted-foreground" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-2">
                II. Beratungsbesuche § 37 Abs. 3 SGB XI (nur LK 17):
              </p>
              <div className="max-w-xs mb-3">
                <div className="relative">
                  <input type="text" value={umsatzLK17Override} onChange={(e) => setUmsatzLK17Override(e.target.value)} placeholder="0,00"
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                III. Abgerechnete Minuten nach Zeitvergütung SGB XI (ohne LK 17):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { label: "a) Grundpflege / Erstbesuch / Folgebesuch", val: minGPOverride, set: setMinGPOverride },
                  { label: "b) Häusliche Betreuung", val: minBetOverride, set: setMinBetOverride },
                  { label: "c) Hauswirtschaftliche Versorgung", val: minHWOverride, set: setMinHWOverride },
                ] as const).map(({ label, val, set: setFn }) => (
                  <div key={label}>
                    <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <input type="text" value={val} onChange={(e) => setFn(e.target.value)} placeholder="0"
                        className="w-full rounded-md border border-input bg-background pl-3 pr-16 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Minuten</span>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Gesamtminuten 2025 (a+b+c)</label>
                  <div className="relative">
                    <input type="text" readOnly value={gesamtMinuten}
                      className="w-full rounded-md border border-border bg-muted/30 pl-3 pr-16 py-1.5 text-sm text-muted-foreground" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Minuten</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1" />
              Alle Werte ohne Refinanzierungsaufschläge (Punktwertaufschlag). Nicht enthalten: SGB V, LK 15/15a,
              intensivpflegerische KK-Leistungen, § 45b SGB XI, Verhinderungspflege (§ 39 SGB XI).
            </p>
          </div>
        )}
      </div>

      {/* Zusammenfassung */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="font-semibold text-foreground">Zusammenfassung für PFAU.NRW</h2>
          {showSummary
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showSummary && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-muted-foreground">PFK VZÄ zum 15.12.:</span>
              <span className="font-medium text-foreground">{data.pfkVzae ? formatDe(data.pfkVzae) : "–"}</span>

              <span className="text-muted-foreground">PFA VZÄ zum 15.12.:</span>
              <span className="font-medium text-foreground">{data.pfaVzae ? formatDe(data.pfaVzae) : "–"}</span>

              <span className="text-muted-foreground">PFK VZÄ nach SGB XI:</span>
              <span className="font-medium text-foreground">
                {displayPfkSgbXI ? formatDe(displayPfkSgbXI) : "–"}
                {data.sgbXIMethode === "berechnen" && displayPfkSgbXI && (
                  <span className="text-xs text-muted-foreground ml-1">(aus Excel berechnet)</span>
                )}
              </span>

              <span className="text-muted-foreground">PFA VZÄ nach SGB XI:</span>
              <span className="font-medium text-foreground">
                {displayPfaSgbXI ? formatDe(displayPfaSgbXI) : "–"}
                {data.sgbXIMethode === "berechnen" && displayPfaSgbXI && (
                  <span className="text-xs text-muted-foreground ml-1">(aus Excel berechnet)</span>
                )}
              </span>

              {punkteOverride && (
                <>
                  <span className="text-muted-foreground">Gesamtpunktzahl LK 1–14, 16–30:</span>
                  <span className="font-medium text-foreground">{punkteOverride} Punkte</span>
                </>
              )}
              {lk3133Override && (
                <>
                  <span className="text-muted-foreground">LK 31–33 Erträge:</span>
                  <span className="font-medium text-foreground">{lk3133Override} €</span>
                </>
              )}
              {umsatzGPOverride && (
                <>
                  <span className="text-muted-foreground">Umsätze Grundpflege (a):</span>
                  <span className="font-medium text-foreground">{umsatzGPOverride} €</span>
                  <span className="text-muted-foreground">Umsätze Betreuung (b):</span>
                  <span className="font-medium text-foreground">{umsatzBetOverride || "–"} €</span>
                  <span className="text-muted-foreground">Umsätze Hauswirtschaft (c):</span>
                  <span className="font-medium text-foreground">{umsatzHWOverride || "–"} €</span>
                  <span className="text-muted-foreground">Gesamtumsätze:</span>
                  <span className="font-medium text-foreground">{formatEuro(gesamtUmsatz)} €</span>
                  <span className="text-muted-foreground">LK 17 (Beratungsbesuche):</span>
                  <span className="font-medium text-foreground">{umsatzLK17Override || "0,00"} €</span>
                  <span className="text-muted-foreground">Gesamtminuten:</span>
                  <span className="font-medium text-foreground">{gesamtMinuten} Min</span>
                </>
              )}
            </div>
            <div className="bg-muted/30 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1" />
              Diese Werte in das Formular auf <strong className="text-foreground">pfau.nrw.de → Umlage → Umlagemeldung</strong> übertragen.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
