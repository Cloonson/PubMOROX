"use client"

import { isExportCancelled } from "@/lib/file-export"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Clock3,
  Plus,
  Upload,
  Download,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowRightCircle,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  MONTHS,
  computeMonths,
  resturlaubstage,
  createSheet,
  listSheets,
  updateSheet,
  updateMonth,
  rolloverToNextYear,
  readConfig,
  dismissWorker,
  archiveSheet,
  restoreSheet,
  deleteSheet,
  type StundenlisteSheet,
  type MonthRaw,
} from "@/lib/stundenliste-service"
import { exportStundenlisten, importStundenlisten, type EmployeeRef } from "@/lib/stundenliste-excel"

const FIELD_ROWS: { key: keyof MonthRaw; label: string; gray?: boolean }[] = [
  { key: "stundenAktuell", label: "Stunden aktuell" },
  { key: "ausgezahlt", label: "Ausgezahlt" },
  { key: "ausgezahlteUeberstunden", label: "Ausgezahlte Überstunden", gray: true },
  { key: "sonntag", label: "Sonntag", gray: true },
  { key: "feiertagMitFza", label: "Feiertag mit FZA" },
  { key: "feiertagOhneFza", label: "Feiertag ohne FZA", gray: true },
  { key: "urlaubGenommen", label: "Urlaub genommen", gray: true },
]

const MONTH_COLORS = [
  "bg-sky-50 dark:bg-sky-950/30",
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-orange-50 dark:bg-orange-950/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
]

// Etwas dunklere Variante für berechnete (nicht editierbare) Zellen, zur klaren Abgrenzung von Eingabefeldern
const MONTH_COLORS_COMPUTED = [
  "bg-sky-100 dark:bg-sky-950/60",
  "bg-amber-100 dark:bg-amber-950/60",
  "bg-orange-100 dark:bg-orange-950/60",
  "bg-emerald-100 dark:bg-emerald-950/60",
]

const NUMBER_INPUT_CLASS =
  "h-8 text-xs text-center px-1 border-transparent bg-transparent hover:bg-muted/60 focus-visible:bg-background focus-visible:border-primary/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

function NumberCell({
  value,
  onChange,
  inputRef,
  onEnter,
}: {
  value: number
  onChange: (v: number) => void
  inputRef?: (el: HTMLInputElement | null) => void
  onEnter?: () => void
}) {
  return (
    <Input
      ref={inputRef}
      type="number"
      className={NUMBER_INPUT_CLASS}
      placeholder="0"
      value={value === 0 ? "" : value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onEnter?.()
        }
      }}
    />
  )
}

// Editierbare Zeilen von oben nach unten, mit Angabe welche Monatsspalten sie besitzen.
// "all" = alle 12 Monate, "first" = nur die erste Datenspalte (Jan).
const EDITABLE_ROWS: { cols: "all" | "first" }[] = [
  { cols: "first" as const }, // Stunden Vormonat (nur Jan, Feb-Dez sind Formel)
  ...FIELD_ROWS.map(() => ({ cols: "all" as const })),
  { cols: "first" as const }, // Urlaubsanspruch laufendes Jahr
  { cols: "first" as const }, // Resturlaubsanspruch Vorjahr
]
const ROW_STUNDEN_VORMONAT = 0
const ROW_URLAUBSANSPRUCH = FIELD_ROWS.length + 1
const ROW_RESTURLAUB_VORJAHR = FIELD_ROWS.length + 2

function empName(e: Employee) {
  return `${e.nachname}, ${e.vorname}`
}

export function StundenlisteView() {
  const currentYear = new Date().getFullYear()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sheets, setSheets] = useState<StundenlisteSheet[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [year, setYear] = useState(currentYear)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingWorkers, setPendingWorkers] = useState<Employee[]>([])
  const [pendingAccept, setPendingAccept] = useState<Record<string, boolean>>({})
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sheetFilter, setSheetFilter] = useState<"aktiv" | "archiviert" | "alle">("aktiv")
  const [deleteConfirm, setDeleteConfirm] = useState<{ sheetIds: string[]; label: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const load = async () => {
    setLoading(true)
    try {
      const [emps, allSheets, config] = await Promise.all([
        listEmployees("alle"),
        listSheets(),
        readConfig(),
      ])
      setEmployees(emps)
      setSheets(allSheets)
      setDismissed(config.dismissedWorkerIds)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeEmployees = useMemo(() => employees.filter((e) => !e.archiviert), [employees])
  const yearSheets = useMemo(() => sheets.filter((s) => s.year === year), [sheets, year])
  const years = useMemo(() => {
    const ys = new Set(sheets.map((s) => s.year))
    ys.add(currentYear)
    return Array.from(ys).sort((a, b) => b - a)
  }, [sheets, currentYear])

  // Sheets in diesem Jahr, gefiltert nach Archiv-Status
  const filteredYearSheets = useMemo(
    () =>
      yearSheets.filter((s) =>
        sheetFilter === "alle" ? true : sheetFilter === "archiviert" ? s.archiviert : !s.archiviert
      ),
    [yearSheets, sheetFilter]
  )

  // Mitarbeiter mit (gefiltertem) Sheet in diesem Jahr
  const workersWithSheet = useMemo(
    () => employees.filter((e) => filteredYearSheets.some((s) => s.employeeId === e.id)),
    [employees, filteredYearSheets]
  )

  // Aktive Mitarbeiter ohne Sheet in diesem Jahr und noch nicht abgelehnt -> einmalig fragen
  useEffect(() => {
    if (loading) return
    const toAsk = activeEmployees.filter(
      (e) => !yearSheets.some((s) => s.employeeId === e.id) && !dismissed.includes(e.id)
    )
    if (toAsk.length > 0 && !addDialogOpen && pendingWorkers.length === 0) {
      setPendingWorkers(toAsk)
      setPendingAccept(Object.fromEntries(toAsk.map((e) => [e.id, true])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeEmployees, yearSheets, dismissed])

  const confirmPending = async () => {
    for (const e of pendingWorkers) {
      if (pendingAccept[e.id]) {
        await createSheet(e.id, year)
      } else {
        await dismissWorker(e.id)
      }
    }
    setPendingWorkers([])
    setPendingAccept({})
    await load()
  }

  // Manuelles Hinzufügen (auch bereits abgelehnte Mitarbeiter)
  const remainingForManualAdd = useMemo(
    () => activeEmployees.filter((e) => !yearSheets.some((s) => s.employeeId === e.id)),
    [activeEmployees, yearSheets]
  )

  const addWorkerManually = async (employeeId: string) => {
    await createSheet(employeeId, year)
    setAddDialogOpen(false)
    await load()
    setSelectedEmployeeId(employeeId)
  }

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null
  const selectedSheet = selectedEmployee
    ? yearSheets.find((s) => s.employeeId === selectedEmployee.id) ?? null
    : null
  const computed = selectedSheet ? computeMonths(selectedSheet) : null
  const restUrlaub = selectedSheet && computed ? resturlaubstage(selectedSheet, computed) : 0

  const patchMonth = async (monthIdx: number, key: keyof MonthRaw, value: number) => {
    if (!selectedSheet) return
    // optimistisches Update
    setSheets((prev) =>
      prev.map((s) =>
        s.id === selectedSheet.id
          ? { ...s, months: s.months.map((m, i) => (i === monthIdx ? { ...m, [key]: value } : m)) }
          : s
      )
    )
    await updateMonth(selectedSheet.id, monthIdx, { [key]: value })
  }

  const patchBase = async (key: "urlaubsanspruchLaufendesJahr" | "resturlaubsanspruchVorjahr" | "stundenVormonatJan", value: number) => {
    if (!selectedSheet) return
    setSheets((prev) => prev.map((s) => (s.id === selectedSheet.id ? { ...s, [key]: value } : s)))
    await updateSheet(selectedSheet.id, { [key]: value })
  }

  const handleRollover = async (employeeId: string) => {
    await rolloverToNextYear(employeeId, year)
    toast.success("Neues Jahr angelegt, Reststunden übernommen")
    await load()
    setYear(year + 1)
  }

  // Native, nicht-passiver Listener: React's onWheel ist passiv, preventDefault() würde
  // dort stillschweigend ignoriert und die Seite würde trotzdem mitscrollen.
  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [selectedSheet])

  const cellKey = (row: number, col: number) => `${row}:${col}`

  const registerCell = (row: number, col: number) => (el: HTMLInputElement | null) => {
    const key = cellKey(row, col)
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }

  // Enter springt zur nächsten editierbaren Zeile darunter in derselben Spalte
  // (überspringt berechnete Zeilen); Tab bleibt Standardverhalten (Zelle rechts).
  const focusCellBelow = (row: number, col: number) => {
    for (let r = row + 1; r < EDITABLE_ROWS.length; r++) {
      const meta = EDITABLE_ROWS[r]
      if (meta.cols === "all" || col === 0) {
        const el = cellRefs.current.get(cellKey(r, col))
        if (el) {
          el.focus()
          return
        }
      }
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = workersWithSheet.length > 0 && workersWithSheet.every((e) => selectedIds.has(e.id))
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(workersWithSheet.map((e) => e.id)))
  }

  const sheetIdFor = (employeeId: string) => yearSheets.find((s) => s.employeeId === employeeId)?.id ?? null

  const handleArchiveWorker = async (employeeId: string) => {
    const id = sheetIdFor(employeeId)
    if (!id) return
    await archiveSheet(id)
    toast.success("Stundenliste archiviert")
    await load()
  }

  const handleRestoreWorker = async (employeeId: string) => {
    const id = sheetIdFor(employeeId)
    if (!id) return
    await restoreSheet(id)
    toast.success("Stundenliste wiederhergestellt")
    await load()
  }

  const requestDeleteSingle = (employeeId: string, name: string) => {
    const id = sheetIdFor(employeeId)
    if (!id) return
    setDeleteConfirm({ sheetIds: [id], label: name })
  }

  const requestDeleteSelected = () => {
    const ids = Array.from(selectedIds).map(sheetIdFor).filter((id): id is string => !!id)
    if (ids.length === 0) return
    setDeleteConfirm({ sheetIds: ids, label: `${ids.length} Mitarbeiter` })
  }

  const handleArchiveSelected = async () => {
    const ids = Array.from(selectedIds).map(sheetIdFor).filter((id): id is string => !!id)
    if (ids.length === 0) return
    for (const id of ids) await archiveSheet(id)
    toast.success(`${ids.length} Stundenliste(n) archiviert`)
    setSelectedIds(new Set())
    await load()
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    for (const id of deleteConfirm.sheetIds) await deleteSheet(id)
    toast.success("Gelöscht")
    if (deleteConfirm.sheetIds.some((id) => id === selectedSheet?.id)) setSelectedEmployeeId(null)
    setSelectedIds(new Set())
    setDeleteConfirm(null)
    await load()
  }

  const buildEntries = (ids: string[]): { employee: EmployeeRef; sheet: StundenlisteSheet }[] =>
    ids
      .map((id) => {
        const emp = employees.find((e) => e.id === id)
        const sheet = yearSheets.find((s) => s.employeeId === id)
        if (!emp || !sheet) return null
        return { employee: { id: emp.id, vorname: emp.vorname, nachname: emp.nachname }, sheet }
      })
      .filter((x): x is { employee: EmployeeRef; sheet: StundenlisteSheet } => x !== null)

  const handleExportSelected = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : selectedEmployeeId ? [selectedEmployeeId] : []
    if (ids.length === 0) {
      toast.error("Keine Mitarbeiter ausgewählt")
      return
    }
    try {
      await exportStundenlisten(buildEntries(ids), `Stundenliste_${year}_Auswahl`)
    } catch (err) {
      if (!isExportCancelled(err)) toast.error(`Export fehlgeschlagen: ${String(err)}`)
    }
  }

  const handleExportAll = async () => {
    const ids = workersWithSheet.map((e) => e.id)
    if (ids.length === 0) {
      toast.error("Keine Stundenlisten für dieses Jahr")
      return
    }
    try {
      await exportStundenlisten(buildEntries(ids), `MitarbeiterStundenliste${year}`)
    } catch (err) {
      if (!isExportCancelled(err)) toast.error(`Export fehlgeschlagen: ${String(err)}`)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    try {
      const buffer = await file.arrayBuffer()
      const imported = await importStundenlisten(buffer)
      if (imported.length === 0) {
        toast.error("Keine Stundenlisten in der Datei gefunden")
        return
      }
      let matched = 0
      let unmatched = 0
      for (const imp of imported) {
        const emp = employees.find(
          (e) =>
            e.vorname.toLowerCase().trim() === imp.vorname.toLowerCase().trim() &&
            e.nachname.toLowerCase().trim() === imp.nachname.toLowerCase().trim()
        )
        if (!emp) {
          unmatched++
          continue
        }
        matched++
        const sheet = await createSheet(emp.id, imp.year, {
          stundenVormonatJan: imp.stundenVormonatJan,
          urlaubsanspruchLaufendesJahr: imp.urlaubsanspruchLaufendesJahr,
          resturlaubsanspruchVorjahr: imp.resturlaubsanspruchVorjahr,
        })
        await updateSheet(sheet.id, {
          stundenVormonatJan: imp.stundenVormonatJan,
          urlaubsanspruchLaufendesJahr: imp.urlaubsanspruchLaufendesJahr,
          resturlaubsanspruchVorjahr: imp.resturlaubsanspruchVorjahr,
          months: imp.months,
        })
      }
      if (matched > 0) {
        toast.success(`${matched} Stundenliste(n) erfolgreich importiert`, {
          description: unmatched > 0 ? `${unmatched} Tabellenblatt/-blätter ohne passenden Mitarbeiter wurden übersprungen.` : undefined,
          duration: 6000,
        })
      } else {
        toast.warning("Keine Stundenlisten importiert", {
          description: "Für die Tabellenblätter wurde kein passender Mitarbeiter gefunden.",
          duration: 6000,
        })
      }
      await load()
    } catch {
      toast.error("Fehler beim Import — ist das eine gültige Stundenliste-Excel?")
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock3 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Stundenlisten</h1>
            <p className="text-sm text-muted-foreground">{workersWithSheet.length} Mitarbeiter · {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleImport} />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Importieren
          </Button>
          <Button
            variant={selectMode ? "default" : "outline"}
            className="gap-2"
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
          >
            <CheckSquare className="w-4 h-4" />
            Auswahl
          </Button>
          {selectMode ? (
            <>
              <Button className="gap-2" onClick={handleExportSelected}>
                <Download className="w-4 h-4" />
                Auswahl exportieren
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={selectedIds.size === 0}
                onClick={handleArchiveSelected}
              >
                <Archive className="w-4 h-4" />
                Archivieren
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                disabled={selectedIds.size === 0}
                onClick={requestDeleteSelected}
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            </>
          ) : (
            <Button variant="outline" className="gap-2" onClick={handleExportAll}>
              <Download className="w-4 h-4" />
              Alle exportieren
            </Button>
          )}
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Mitarbeiter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* Worker list */}
        <Card className="p-2 h-fit max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b">
            <Select value={sheetFilter} onValueChange={(v) => setSheetFilter(v as typeof sheetFilter)}>
              <SelectTrigger className="h-7 text-xs w-[120px] border-none shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="archiviert">Archiviert</SelectItem>
                <SelectItem value="alle">Alle</SelectItem>
              </SelectContent>
            </Select>
            {selectMode && workersWithSheet.length > 0 && (
              <button onClick={toggleSelectAll} className="shrink-0" title="Alle auswählen/abwählen">
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Laden...</p>
          ) : workersWithSheet.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">
              {sheetFilter === "archiviert" ? "Keine archivierten Stundenlisten" : `Noch keine Stundenlisten für ${year}`}
            </p>
          ) : (
            workersWithSheet
              .sort((a, b) => a.nachname.localeCompare(b.nachname, "de"))
              .map((e) => {
                const sheet = yearSheets.find((s) => s.employeeId === e.id)
                return (
                  <div
                    key={e.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      selectedEmployeeId === e.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {selectMode && (
                      <button onClick={() => toggleSelect(e.id)} className="shrink-0">
                        {selectedIds.has(e.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      className="flex-1 flex items-center justify-between text-left min-w-0"
                      onClick={() => setSelectedEmployeeId(e.id)}
                    >
                      <span className="truncate">{empName(e)}</span>
                      {!selectMode && sheet?.archiviert && <Archive className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />}
                    </button>
                    {!selectMode && (
                      <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        {sheet?.archiviert ? (
                          <button
                            onClick={() => handleRestoreWorker(e.id)}
                            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                            title="Wiederherstellen"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveWorker(e.id)}
                            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-orange-500"
                            title="Archivieren"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => requestDeleteSingle(e.id, empName(e))}
                          className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                          title="Löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                    {!selectMode && <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />}
                  </div>
                )
              })
          )}
        </Card>

        {/* Grid */}
        <Card className="p-4 min-w-0">
          {!selectedSheet || !computed ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Mitarbeiter links auswählen
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{empName(selectedEmployee!)} — {year}</h2>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => handleRollover(selectedEmployee!.id)}>
                  <ArrowRightCircle className="w-4 h-4" />
                  Jahr {year + 1} anlegen
                </Button>
              </div>

              <div
                ref={tableScrollRef}
                className="rounded-lg border overflow-auto max-h-[70vh] scrollbar-visible"
              >
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2.5 sticky left-0 top-0 z-30 bg-card min-w-[210px] border-b border-r"></th>
                      {MONTHS.map((m, i) => (
                        <th
                          key={m}
                          className={`p-2.5 text-center font-semibold sticky top-0 z-20 min-w-[72px] border-b ${MONTH_COLORS[i % 4]}`}
                        >
                          {m.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-medium sticky left-0 z-10 bg-card border-r text-muted-foreground whitespace-nowrap">
                        Stunden Vormonat
                      </td>
                      {computed.map((c, i) =>
                        i === 0 ? (
                          <td key={i} className="p-0.5 text-center border-t">
                            <NumberCell
                              value={selectedSheet.stundenVormonatJan}
                              onChange={(v) => patchBase("stundenVormonatJan", v)}
                              inputRef={registerCell(ROW_STUNDEN_VORMONAT, 0)}
                              onEnter={() => focusCellBelow(ROW_STUNDEN_VORMONAT, 0)}
                            />
                          </td>
                        ) : (
                          <td key={i} className="p-2 text-center text-muted-foreground border-t bg-muted/50">{c.stundenVormonat}</td>
                        )
                      )}
                    </tr>
                    {FIELD_ROWS.map(({ key, label, gray }, rowIdx) => (
                      <tr key={key} className={gray ? "bg-muted/20" : undefined}>
                        <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">{label}</td>
                        {MONTHS.map((_, i) => (
                          <td key={i} className="p-0.5 text-center border-t">
                            <NumberCell
                              value={selectedSheet.months[i][key]}
                              onChange={(v) => patchMonth(i, key, v)}
                              inputRef={registerCell(rowIdx + 1, i)}
                              onEnter={() => focusCellBelow(rowIdx + 1, i)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-medium">
                      <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">Summe</td>
                      {computed.map((c, i) => (
                        <td key={i} className="p-2 text-center border-t">{c.summe}</td>
                      ))}
                    </tr>
                    <tr className="font-semibold">
                      <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">Reststunden</td>
                      {computed.map((c, i) => (
                        <td key={i} className={`p-2 text-center border-t ${MONTH_COLORS_COMPUTED[i % 4]}`}>{c.reststunden}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">
                        Urlaubsanspruch lfd. Jahr <span className="text-muted-foreground font-normal">(Basis Jan.)</span>
                      </td>
                      <td className="p-0.5 text-center border-t">
                        <NumberCell
                          value={selectedSheet.urlaubsanspruchLaufendesJahr}
                          onChange={(v) => patchBase("urlaubsanspruchLaufendesJahr", v)}
                          inputRef={registerCell(ROW_URLAUBSANSPRUCH, 0)}
                          onEnter={() => focusCellBelow(ROW_URLAUBSANSPRUCH, 0)}
                        />
                      </td>
                      <td colSpan={11} className="border-t"></td>
                    </tr>
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">Urlaubsanspruch</td>
                      {computed.map((c, i) => (
                        <td key={i} className={`p-2 text-center border-t ${MONTH_COLORS_COMPUTED[i % 4]}`}>{c.urlaubsanspruch}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 sticky left-0 z-10 bg-card border-r border-t whitespace-nowrap">Resturlaubsanspruch Vorjahr</td>
                      <td className="p-0.5 text-center border-t bg-emerald-50 dark:bg-emerald-950/30">
                        <NumberCell
                          value={selectedSheet.resturlaubsanspruchVorjahr}
                          onChange={(v) => patchBase("resturlaubsanspruchVorjahr", v)}
                          inputRef={registerCell(ROW_RESTURLAUB_VORJAHR, 0)}
                          onEnter={() => focusCellBelow(ROW_RESTURLAUB_VORJAHR, 0)}
                        />
                      </td>
                      <td colSpan={11} className="border-t"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border-transparent">
                  Resturlaubstage: {restUrlaub}
                </Badge>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Auto-Prompt: neue Mitarbeiter aus Mitarbeiterliste übernehmen? */}
      <Dialog open={pendingWorkers.length > 0} onOpenChange={(o) => !o && confirmPending()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Mitarbeiter in Stundenliste {year} aufnehmen?</DialogTitle>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer border-b mb-1 font-medium">
            <input
              type="checkbox"
              checked={pendingWorkers.every((e) => pendingAccept[e.id] ?? true)}
              onChange={(ev) =>
                setPendingAccept(Object.fromEntries(pendingWorkers.map((e) => [e.id, ev.target.checked])))
              }
            />
            Alle auswählen
          </label>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {pendingWorkers.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingAccept[e.id] ?? true}
                  onChange={(ev) => setPendingAccept((prev) => ({ ...prev, [e.id]: ev.target.checked }))}
                />
                {empName(e)}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Abgelehnte Mitarbeiter werden nicht erneut automatisch abgefragt — sie lassen sich jederzeit manuell über &quot;+ Mitarbeiter&quot; hinzufügen.
          </p>
          <DialogFooter>
            <Button onClick={confirmPending}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manuelles Hinzufügen */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mitarbeiter zu Stundenliste {year} hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {remainingForManualAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">Alle aktiven Mitarbeiter sind bereits erfasst.</p>
            ) : (
              remainingForManualAdd
                .sort((a, b) => a.nachname.localeCompare(b.nachname, "de"))
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => addWorkerManually(e.id)}
                    className="w-full text-left text-sm px-3 py-2 rounded hover:bg-muted"
                  >
                    {empName(e)}
                  </button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Löschen bestätigen */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stundenliste endgültig löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteConfirm?.sheetIds.length === 1
              ? `Die Stundenliste ${year} von ${deleteConfirm.label} wird unwiderruflich gelöscht.`
              : `${deleteConfirm?.label} Stundenlisten ${year} werden unwiderruflich gelöscht.`}
            {" "}Alternativ kannst du archivieren, um die Daten zu behalten.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={confirmDelete}>Endgültig löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
