"use client"

import { isExportCancelled } from "@/lib/file-export"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  PenTool,
  Upload,
  Download,
  FileSpreadsheet,
  History,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { listEmployees, type Employee } from "@/lib/employee-service"
import {
  ROWS_PER_PAGE,
  EMPTY_ROW,
  paginate,
  employeeToRow,
  isExcludedFromHandzeichenliste,
  diffAgainstLastRecord,
  readDraft,
  saveDraft,
  listRecords,
  upsertRecord,
  downloadPersistedExport,
  isTauri,
  type HandzeichenRow,
  type HandzeichenlisteDraft,
  type HandzeichenlisteRecord,
} from "@/lib/handzeichenliste-service"
import { missingHandzeichenFields } from "@/lib/handzeichenliste-validation"
import { exportHandzeichenlistePdf } from "@/lib/handzeichenliste-pdf"
import { exportHandzeichenlisteExcel } from "@/lib/handzeichenliste-excel"

function empName(e: Employee) {
  return `${e.nachname}, ${e.vorname}`
}

const EMPTY_DRAFT: HandzeichenlisteDraft = {
  periodeLabel: "",
  pdlRow: null,
  stellvPdlRow: null,
  weitereMitarbeiter: [],
}

export function HandzeichenlisteView() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [draft, setDraft] = useState<HandzeichenlisteDraft>(EMPTY_DRAFT)
  const [records, setRecords] = useState<HandzeichenlisteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [verlaufOpen, setVerlaufOpen] = useState(false)
  const [showMissingFields, setShowMissingFields] = useState(false)
  const [pendingExport, setPendingExport] = useState<"pdf" | "excel" | null>(null)
  const [exporting, setExporting] = useState(false)
  const missingFields = useMemo(() => missingHandzeichenFields(draft), [draft])
  const missingKeys = new Set(missingFields.map((field) => field.key))
  const fieldProps = (key: string) => {
    const missing = showMissingFields && missingKeys.has(key)
    return {
      "aria-invalid": missing || undefined,
      title: missing ? "Dieses Feld ist noch leer oder unvollständig" : undefined,
      style: missing ? { borderColor: "hsl(var(--destructive))", backgroundColor: "hsl(var(--destructive) / 0.08)" } : undefined,
    }
  }
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Import-Assistent
  const [step1Open, setStep1Open] = useState(false)
  const [step2Open, setStep2Open] = useState(false)
  const [pdlId, setPdlId] = useState<string>("")
  const [stellvId, setStellvId] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const [emps, savedDraft, recs] = await Promise.all([
        listEmployees("aktiv"),
        readDraft(),
        listRecords(),
      ])
      setEmployees(emps)
      setDraft(savedDraft ?? EMPTY_DRAFT)
      setShowMissingFields(savedDraft !== null)
      setRecords(recs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Debounced Autosave des Entwurfs
  useEffect(() => {
    if (loading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveDraft(draft) }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const pages = useMemo(() => paginate(draft.weitereMitarbeiter), [draft.weitereMitarbeiter])
  const pflegekraefte = useMemo(() => employees.filter((e) => !isExcludedFromHandzeichenliste(e)), [employees])

  const guessRolle = (e: Employee, kind: "pdl" | "stellv_pdl") => {
    if (e.handzeichenRolle === kind) return true
    const p = e.position.toLowerCase()
    if (kind === "pdl") return p.includes("pdl") && !p.includes("stellv") && !p.includes("stv")
    return (p.includes("stellv") && p.includes("pdl")) || (p.includes("stv") && p.includes("pdl"))
  }

  const openImportWizard = () => {
    if (pflegekraefte.length === 0) {
      toast.error("Keine aktiven Mitarbeiter in der Mitarbeiterliste gefunden")
      return
    }
    const guessedPdl = pflegekraefte.find((e) => guessRolle(e, "pdl"))
    const guessedStellv = pflegekraefte.find((e) => guessRolle(e, "stellv_pdl"))
    setPdlId(guessedPdl?.id ?? "")
    setStellvId(guessedStellv?.id ?? "")
    setStep1Open(true)
  }

  const confirmStep1 = () => {
    if (!pdlId || !stellvId) {
      toast.error("Bitte PDL und stellvertretende PDL auswählen")
      return
    }
    if (pdlId === stellvId) {
      toast.error("PDL und stellvertretende PDL müssen unterschiedliche Personen sein")
      return
    }
    const rest = pflegekraefte.filter((e) => e.id !== pdlId && e.id !== stellvId)
    setSelectedIds(new Set(rest.map((e) => e.id)))
    setStep1Open(false)
    setStep2Open(true)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectableForStep2 = useMemo(
    () => pflegekraefte.filter((e) => e.id !== pdlId && e.id !== stellvId).sort((a, b) => a.nachname.localeCompare(b.nachname, "de")),
    [pflegekraefte, pdlId, stellvId]
  )

  const confirmStep2 = async () => {
    const pdlEmp = employees.find((e) => e.id === pdlId) ?? null
    const stellvEmp = employees.find((e) => e.id === stellvId) ?? null
    const weitere = selectableForStep2
      .filter((e) => selectedIds.has(e.id))
      .map((e) => employeeToRow(e, ""))

    const lastRecord = records[0] ?? null
    const diff = diffAgainstLastRecord(employees, lastRecord)
    weitere.forEach((row) => {
      if (row.employeeId && diff.neuHireIds.includes(row.employeeId)) row.isNeu = true
      const abgang = diff.moeglicheAbgaenge.find((a) => a.employeeId === row.employeeId)
      if (abgang) row.ausgeschiedenAm = abgang.suggestedDate
    })

    const newDraft: HandzeichenlisteDraft = {
      periodeLabel: draft.periodeLabel,
      pdlRow: pdlEmp ? employeeToRow(pdlEmp, "pdl") : null,
      stellvPdlRow: stellvEmp ? employeeToRow(stellvEmp, "stellv_pdl") : null,
      weitereMitarbeiter: weitere,
    }
    try {
      await saveDraft(newDraft)
    } catch {
      toast.error("Import konnte nicht gespeichert werden. Bitte erneut versuchen.")
      return
    }
    setDraft(newDraft)
    setStep2Open(false)
    setShowMissingFields(true)
    toast.success(`Handzeichenliste importiert: ${weitere.length + 2} Mitarbeiter übernommen`, { duration: 6000 })
    const missing = missingHandzeichenFields(newDraft)
    if (missing.length > 0) toast.warning(`${missing.length} Felder sind noch leer oder unvollständig und wurden markiert`, { duration: 6000 })
  }

  const updateRow = (index: number, field: keyof HandzeichenRow, value: string) => {
    setDraft((prev) => ({
      ...prev,
      weitereMitarbeiter: prev.weitereMitarbeiter.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }))
  }

  const updatePinnedRow = (which: "pdlRow" | "stellvPdlRow", field: keyof HandzeichenRow, value: string) => {
    setDraft((prev) => {
      const current = prev[which] ?? { ...EMPTY_ROW }
      return { ...prev, [which]: { ...current, [field]: value } }
    })
  }

  const removeRow = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      weitereMitarbeiter: prev.weitereMitarbeiter.filter((_, i) => i !== index),
    }))
  }

  const addManualRow = () => {
    setShowMissingFields(true)
    setDraft((prev) => ({ ...prev, weitereMitarbeiter: [...prev.weitereMitarbeiter, { ...EMPTY_ROW }] }))
  }

  const totalCount = draft.weitereMitarbeiter.length + (draft.pdlRow ? 1 : 0) + (draft.stellvPdlRow ? 1 : 0)

  const employeeIdsInDraft = () =>
    [draft.pdlRow?.employeeId, draft.stellvPdlRow?.employeeId, ...draft.weitereMitarbeiter.map((r) => r.employeeId)]
      .filter((id): id is string => !!id)

  const exportDraft = async (format: "pdf" | "excel") => {
    setPendingExport(null)
    setExporting(true)
    const periodeLabel = draft.periodeLabel.trim() || "Ohne Periode"
    const filenameBase = `Handzeichenliste_${periodeLabel.replace(/\s+/g, "_")}`
    try {
      const filename = format === "pdf"
        ? await exportHandzeichenlistePdf(draft, filenameBase)
        : await exportHandzeichenlisteExcel(draft, filenameBase)
      await upsertRecord({
        periodeLabel,
        employeeIds: employeeIdsInDraft(),
        ...(format === "pdf" ? { pdfFilename: filename } : { excelFilename: filename }),
      })
      setRecords(await listRecords())
    } catch (err: any) {
      if (isExportCancelled(err)) return
      toast.error(`Fehler beim Export: ${err.message ?? err}`)
    } finally {
      setExporting(false)
    }
  }

  const requestExport = (format: "pdf" | "excel") => {
    setShowMissingFields(true)
    if (missingFields.length > 0) {
      setPendingExport(format)
      return
    }
    void exportDraft(format)
  }

  const handleRedownload = async (filename: string) => {
    try {
      await downloadPersistedExport(filename)
    } catch (err: any) {
      if (isExportCancelled(err)) return
      toast.error(err.message ?? "Datei nicht gefunden")
    }
  }

  const pinnedRowFields = (which: "pdlRow" | "stellvPdlRow", label: string) => {
    const row = draft[which]
    return (
      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        <div className="grid grid-cols-8 gap-1 items-center bg-muted/30 rounded px-1 py-1 text-xs">
          <Input {...fieldProps(`${which}.name`)} className="h-7 text-xs col-span-2" placeholder="Name, Vorname"
            value={row ? `${row.nachname}${row.nachname && row.vorname ? ", " : ""}${row.vorname}` : ""}
            onChange={(e) => {
              const [nachname, vorname] = e.target.value.split(",").map((s) => s.trim())
              updatePinnedRow(which, "nachname", nachname ?? "")
              updatePinnedRow(which, "vorname", vorname ?? "")
            }}
          />
          <Input {...fieldProps(`${which}.anschrift`)} className="h-7 text-xs col-span-2" placeholder="Anschrift" value={row?.anschrift ?? ""} onChange={(e) => updatePinnedRow(which, "anschrift", e.target.value)} />
          <Input {...fieldProps(`${which}.qualifikation`)} className="h-7 text-xs" placeholder="Quali." value={row?.qualifikation ?? ""} onChange={(e) => updatePinnedRow(which, "qualifikation", e.target.value)} />
          <Input {...fieldProps(`${which}.wochenstunden`)} className="h-7 text-xs" placeholder="Std." value={row?.wochenstunden ?? ""} onChange={(e) => updatePinnedRow(which, "wochenstunden", e.target.value)} />
          <Input {...fieldProps(`${which}.beschaeftigungsbeginn`)} className="h-7 text-xs" placeholder="Beginn" value={row?.beschaeftigungsbeginn ?? ""} onChange={(e) => updatePinnedRow(which, "beschaeftigungsbeginn", e.target.value)} />
          <Input className="h-7 text-xs" placeholder="Ausg. am" value={row?.ausgeschiedenAm ?? ""} onChange={(e) => updatePinnedRow(which, "ausgeschiedenAm", e.target.value)} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <PenTool className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Handzeichenliste</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0 ? `${totalCount} Mitarbeiter · ${pages.length} Seite(n)` : "Noch keine Mitarbeiter importiert"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setVerlaufOpen(true)}>
            <History className="w-4 h-4" />
            Verlauf
          </Button>
          <Button variant="outline" className="gap-2" onClick={openImportWizard}>
            <Upload className="w-4 h-4" />
            Aus Mitarbeiterliste importieren
          </Button>
          <Button variant="outline" className="gap-2" disabled={exporting || loading} onClick={() => requestExport("excel")}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel exportieren
          </Button>
          <Button className="gap-2" disabled={exporting || loading} onClick={() => requestExport("pdf")}>
            <Download className="w-4 h-4" />
            PDF exportieren
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <Label className="text-xs text-muted-foreground">Periode (für Dateiname & Verlauf)</Label>
        <Input
          {...fieldProps("periode")}
          className="max-w-xs mt-1"
          placeholder='z. B. "Juli 2025"'
          value={draft.periodeLabel}
          onChange={(e) => setDraft((p) => ({ ...p, periodeLabel: e.target.value }))}
        />
      </Card>

      {showMissingFields && missingFields.length > 0 && (
        <div role="status" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {missingFields.length} Felder sind noch leer oder unvollständig. Die betroffenen Felder sind rot markiert.
          Du kannst sie ergänzen oder nach dem Hinweis trotzdem exportieren.
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Laden...</p>
      ) : totalCount === 0 && !showMissingFields ? (
        <div className="text-center py-16 text-muted-foreground">
          <PenTool className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Noch keine Handzeichenliste angelegt</p>
          <p className="text-sm mt-1">Starte mit &quot;Aus Mitarbeiterliste importieren&quot;.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedRowFields("pdlRow", "Pflegedienstleitung seit:")}
          {pinnedRowFields("stellvPdlRow", "stellvertretende Pflegedienstleitung seit:")}

          {pages.map((pageRows, pageIdx) => (
            <Card key={pageIdx} className="p-3 overflow-x-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Seite {pageIdx + 1} von {pages.length} {pages.length > 1 ? "(eigenes Excel-Sheet / PDF-Seite)" : ""}
              </p>
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border p-1.5 text-left">Name, Vorname</th>
                    <th className="border p-1.5 text-left">Anschrift</th>
                    <th className="border p-1.5">Qualifikation</th>
                    <th className="border p-1.5">Wochenstd.</th>
                    <th className="border p-1.5">Beschäftigungsbeginn</th>
                    <th className="border p-1.5">Ausgeschieden am</th>
                    <th className="border p-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const globalIndex = pageIdx * ROWS_PER_PAGE + i
                    const isBlank = !row.nachname && !row.vorname && row.employeeId === null
                    return (
                      <tr key={globalIndex} className={isBlank ? "text-muted-foreground/40" : undefined}>
                        <td className="border p-0.5">
                          <div className="flex items-center gap-1">
                            <Input
                              {...fieldProps(`mitarbeiter.${globalIndex}.name`)}
                              disabled={globalIndex >= draft.weitereMitarbeiter.length}
                              className="h-7 text-xs border-transparent bg-transparent"
                              value={`${row.nachname}${row.nachname && row.vorname ? ", " : ""}${row.vorname}`}
                              placeholder="Nachname, Vorname"
                              onChange={(e) => {
                                const [nachname, vorname] = e.target.value.split(",").map((s) => s.trim())
                                setDraft((prev) => ({
                                  ...prev,
                                  weitereMitarbeiter: prev.weitereMitarbeiter.map((r, gi) =>
                                    gi === globalIndex ? { ...r, nachname: nachname ?? "", vorname: vorname ?? "" } : r
                                  ),
                                }))
                              }}
                            />
                            {row.isNeu && <Badge variant="secondary" className="text-[10px] py-0 shrink-0 text-green-600">Neu</Badge>}
                          </div>
                        </td>
                        <td className="border p-0.5">
                          <Input disabled={globalIndex >= draft.weitereMitarbeiter.length} {...fieldProps(`mitarbeiter.${globalIndex}.anschrift`)} className="h-7 text-xs border-transparent bg-transparent" value={row.anschrift}
                            onChange={(e) => updateRow(globalIndex, "anschrift", e.target.value)} />
                        </td>
                        <td className="border p-0.5">
                          <Input disabled={globalIndex >= draft.weitereMitarbeiter.length} {...fieldProps(`mitarbeiter.${globalIndex}.qualifikation`)} className="h-7 text-xs text-center border-transparent bg-transparent" value={row.qualifikation}
                            onChange={(e) => updateRow(globalIndex, "qualifikation", e.target.value)} />
                        </td>
                        <td className="border p-0.5">
                          <Input disabled={globalIndex >= draft.weitereMitarbeiter.length} {...fieldProps(`mitarbeiter.${globalIndex}.wochenstunden`)} className="h-7 text-xs text-center border-transparent bg-transparent" value={row.wochenstunden}
                            onChange={(e) => updateRow(globalIndex, "wochenstunden", e.target.value)} />
                        </td>
                        <td className="border p-0.5">
                          <Input disabled={globalIndex >= draft.weitereMitarbeiter.length} {...fieldProps(`mitarbeiter.${globalIndex}.beschaeftigungsbeginn`)} className="h-7 text-xs text-center border-transparent bg-transparent" value={row.beschaeftigungsbeginn}
                            onChange={(e) => updateRow(globalIndex, "beschaeftigungsbeginn", e.target.value)} />
                        </td>
                        <td className="border p-0.5">
                          <Input disabled={globalIndex >= draft.weitereMitarbeiter.length} className="h-7 text-xs text-center border-transparent bg-transparent" value={row.ausgeschiedenAm}
                            onChange={(e) => updateRow(globalIndex, "ausgeschiedenAm", e.target.value)} />
                        </td>
                        <td className="border p-0.5 text-center">
                          <button disabled={globalIndex >= draft.weitereMitarbeiter.length} onClick={() => removeRow(globalIndex)} className="text-muted-foreground hover:text-destructive" title="Zeile entfernen">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          ))}

          <Button variant="outline" size="sm" className="gap-2" onClick={addManualRow}>
            <Plus className="w-3.5 h-3.5" />
            Zeile manuell hinzufügen
          </Button>
        </div>
      )}

      <Dialog open={pendingExport !== null} onOpenChange={(open) => { if (!open) setPendingExport(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Noch leere oder unvollständige Felder</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {missingFields.length} Felder sind noch nicht vollständig ausgefüllt. Du kannst die markierten Felder ergänzen oder die Handzeichenliste trotzdem erstellen.
          </p>
          <ul className="max-h-52 overflow-y-auto list-disc pl-5 text-sm space-y-1">
            {missingFields.map((field) => <li key={field.key}>{field.label}</li>)}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingExport(null)}>Felder ergänzen</Button>
            <Button disabled={exporting} onClick={() => { if (pendingExport) void exportDraft(pendingExport) }}>Trotzdem erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schritt 1: PDL bestätigen */}
      <Dialog open={step1Open} onOpenChange={setStep1Open}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              PDL &amp; stellvertretende PDL bestätigen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Automatisch anhand der Mitarbeiterliste vorgeschlagen — bitte prüfen und bei Bedarf ändern.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pflegedienstleitung (PDL)</Label>
              <Select value={pdlId} onValueChange={setPdlId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  {pflegekraefte.map((e) => (
                    <SelectItem key={e.id} value={e.id} disabled={e.id === stellvId}>{empName(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">stellvertretende PDL</Label>
              <Select value={stellvId} onValueChange={setStellvId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  {pflegekraefte.map((e) => (
                    <SelectItem key={e.id} value={e.id} disabled={e.id === pdlId}>{empName(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setStep1Open(false)}>Abbrechen</Button>
            <Button onClick={confirmStep1}>Korrekt, weiter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schritt 2: Mitarbeiter auswählen */}
      <Dialog open={step2Open} onOpenChange={setStep2Open}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitarbeiter auswählen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-1">
            Auszubildende und Bürokräfte (Verwaltung/Sekretariat) werden nicht angezeigt — sie gehören nicht in die Handzeichenliste.
          </p>
          <div className="flex items-center gap-3 text-xs px-1 pb-2 border-b">
            <button className="text-primary font-medium flex items-center gap-1 hover:opacity-80"
              onClick={() => setSelectedIds(new Set(selectableForStep2.map((e) => e.id)))}>
              <CheckSquare className="w-3.5 h-3.5" /> Alle auswählen
            </button>
            <button className="text-primary font-medium flex items-center gap-1 hover:opacity-80"
              onClick={() => setSelectedIds(new Set())}>
              <Square className="w-3.5 h-3.5" /> Alle abwählen
            </button>
            <span className="ml-auto text-muted-foreground">{selectedIds.size} / {selectableForStep2.length} ausgewählt</span>
          </div>
          <div className="space-y-0.5 max-h-96 overflow-y-auto">
            {selectableForStep2.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                {empName(e)}
                {e.position && <span className="text-xs text-muted-foreground ml-auto">{e.position}</span>}
              </label>
            ))}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setStep2Open(false)}>Abbrechen</Button>
            <Button onClick={confirmStep2}>Übernehmen ({selectedIds.size + 2})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verlauf */}
      <Dialog open={verlaufOpen} onOpenChange={setVerlaufOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verlauf vergangener Handzeichenlisten</DialogTitle>
          </DialogHeader>
          {!isTauri() && (
            <p className="text-xs text-muted-foreground">
              Gespeicherte Exporte können in der Desktop-App erneut über „Speichern unter“ ausgegeben werden.
            </p>
          )}
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Noch keine Exporte vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.periodeLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.erstelltAm).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{r.employeeIds.length} Mitarbeiter
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.pdfFilename && (
                      <button onClick={() => handleRedownload(r.pdfFilename)} className="text-xs text-primary hover:underline">PDF</button>
                    )}
                    {r.excelFilename && (
                      <button onClick={() => handleRedownload(r.excelFilename)} className="text-xs text-primary hover:underline">Excel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
