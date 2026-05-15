"use client"

import { useEffect, useRef, useState } from "react"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Hash,
  Upload,
  ArchiveRestore,
  Archive,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import {
  listEmployees,
  saveEmployee,
  updateEmployee,
  archiveEmployee,
  restoreEmployee,
  deleteEmployee,
  type Employee,
} from "@/lib/employee-service"
import { parseEmployeesFromExcel, diffEmployees, type ParsedEmployee } from "@/lib/excel-import"
import { getDocumentsForEmployee, type DocumentLogEntry } from "@/lib/document-log"
import { openFileFromStorage } from "@/lib/storage-service"
import { documentTypes, type DocumentType } from "@/lib/types"

type Filter = "aktiv" | "archiviert" | "alle"

const EMPTY_FORM: Omit<Employee, "id" | "createdAt"> = {
  vorname: "",
  nachname: "",
  geschlecht: "",
  geburtsdatum: "",
  strasse: "",
  plz: "",
  ort: "",
  telefon: "",
  mobil: "",
  email: "",
  position: "",
  beschaeftigung: "",
  eintrittsdatum: "",
  mitNr: "",
  krankenkasse: "",
  lbnr: "",
  notizen: "",
  archiviert: false,
}

interface DeleteConfirm {
  emp: Employee
}

interface ImportDiff {
  missing: { emp: Employee; archive: boolean }[]
  toAdd: { parsed: ParsedEmployee; add: boolean }[]
  toUpdate: { emp: Employee; parsed: ParsedEmployee; changes: string[]; accept: boolean }[]
}

interface MitarbeiterViewProps {
  onPrintDocument: (type: DocumentType, employeeData: Record<string, string>) => void
}

export function MitarbeiterView({ onPrintDocument }: MitarbeiterViewProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("aktiv")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [importDiff, setImportDiff] = useState<ImportDiff | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null)
  const [detailDocs, setDetailDocs] = useState<DocumentLogEntry[]>([])
  const [detailDocsLoading, setDetailDocsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Multi-Select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  // Ambiguous names from import
  const [ambiguousNames, setAmbiguousNames] = useState<import("@/lib/excel-import").AmbiguousName[]>([])
  const [resolvedNames, setResolvedNames] = useState<Record<number, { vorname: string; nachname: string }>>({})
  const [pendingParsed, setPendingParsed] = useState<import("@/lib/excel-import").ParsedEmployee[]>([])
  // Gender dialog
  const [genderParsed, setGenderParsed] = useState<import("@/lib/excel-import").ParsedEmployee[]>([])
  const [genderMap, setGenderMap] = useState<Record<number, "männlich" | "weiblich" | "">>({})

  const load = async (f: Filter = filter) => {
    setLoading(true)
    try {
      const [filtered, all] = await Promise.all([listEmployees(f), listEmployees("alle")])
      setEmployees(filtered)
      setAllEmployees(all)
    } catch {
      toast.error("Fehler beim Laden der Mitarbeiter")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const switchFilter = (f: Filter) => {
    setFilter(f)
    load(f)
  }

  const openAdd = () => {
    setEditingEmployee(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    const { id, createdAt, ...rest } = emp
    setFormData(rest)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.vorname.trim() || !formData.nachname.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder")
      return
    }
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData)
        toast.success("Mitarbeiter aktualisiert")
      } else {
        await saveEmployee(formData)
        toast.success("Mitarbeiter gespeichert")
      }
      setDialogOpen(false)
      load()
    } catch {
      toast.error("Fehler beim Speichern")
    }
  }

  const handleArchive = async (emp: Employee) => {
    try {
      await archiveEmployee(emp.id)
      toast.success(`${emp.vorname} ${emp.nachname} archiviert`)
      load()
    } catch {
      toast.error("Fehler beim Archivieren")
    }
  }

  const handleRestore = async (emp: Employee) => {
    try {
      await restoreEmployee(emp.id)
      toast.success(`${emp.vorname} ${emp.nachname} wiederhergestellt`)
      load()
    } catch {
      toast.error("Fehler beim Wiederherstellen")
    }
  }

  const openDetail = async (emp: Employee) => {
    setDetailEmployee(emp)
    setDetailDocs([])
    setDetailDocsLoading(true)
    try {
      const docs = await getDocumentsForEmployee(emp.vorname, emp.nachname)
      setDetailDocs(docs)
    } catch {
      // ignore
    } finally {
      setDetailDocsLoading(false)
    }
  }

  const handleDelete = async (emp: Employee) => {
    setDeleteConfirm({ emp })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteEmployee(deleteConfirm.emp.id)
      toast.success("Mitarbeiter endgültig gelöscht")
      setDeleteConfirm(null)
      load()
    } catch {
      toast.error("Fehler beim Löschen")
    }
  }

  const handlePrint = (emp: Employee, docType: DocumentType) => {
    onPrintDocument(docType, {
      mitarbeiterVorname: emp.vorname,
      mitarbeiterNachname: emp.nachname,
      mitarbeiterGeburtsdatum: emp.geburtsdatum,
      mitarbeiterStrasse: emp.strasse,
      mitarbeiterPlz: emp.plz,
      mitarbeiterOrt: emp.ort,
      eintrittsdatum: emp.eintrittsdatum,
      position: emp.position,
      geschlecht: emp.geschlecht,
    })
  }

  const startGenderOrDiff = (parsed: import("@/lib/excel-import").ParsedEmployee[], hasGenderColumn: boolean) => {
    if (!hasGenderColumn) {
      setGenderParsed(parsed)
      setGenderMap(Object.fromEntries(parsed.map((_, i) => [i, ""])))
    } else {
      runDiff(parsed)
    }
  }

  const runDiff = (parsed: import("@/lib/excel-import").ParsedEmployee[]) => {
    const activeEmployees = allEmployees.filter((e) => !e.archiviert)
    const { missing, toAdd, toUpdate } = diffEmployees(activeEmployees, parsed)
    if (missing.length === 0 && toAdd.length === 0 && toUpdate.length === 0) {
      toast.success("Liste ist aktuell — keine Änderungen gefunden")
      return
    }
    setImportDiff({
      missing: missing.map((emp) => ({ emp, archive: false })),
      toAdd: toAdd.map((p) => ({ parsed: p, add: true })),
      toUpdate: toUpdate.map((u) => ({ ...u, accept: true })),
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    try {
      const buffer = await file.arrayBuffer()
      const { employees: parsed, ambiguous, hasGenderColumn } = await parseEmployeesFromExcel(buffer)
      if (parsed.length === 0 && ambiguous.length === 0) {
        toast.error("Keine Mitarbeiter in der Datei gefunden")
        return
      }
      if (ambiguous.length > 0) {
        setPendingParsed(parsed)
        setAmbiguousNames(ambiguous)
        setResolvedNames({})
        return
      }
      startGenderOrDiff(parsed, hasGenderColumn)
    } catch (err: any) {
      toast.error(`Fehler beim Lesen der Datei: ${err.message}`)
    }
  }

  const confirmAmbiguous = () => {
    const resolved: import("@/lib/excel-import").ParsedEmployee[] = ambiguousNames.map((a) => {
      const r = resolvedNames[a.rowIndex]
      return {
        ...a.rest,
        nachname: r?.nachname ?? a.parts[0],
        vorname:  r?.vorname  ?? a.parts.slice(1).join(" "),
      }
    })
    const all = [...pendingParsed, ...resolved]
    setAmbiguousNames([])
    setPendingParsed([])
    // Gender column was absent (otherwise ambiguous wouldn't have been triggered without it)
    startGenderOrDiff(all, all.some((p) => p.geschlecht !== ""))
  }

  // Multi-Select handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(filtered.map((e) => e.id)))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const handleBulkArchive = async () => {
    try {
      for (const id of selectedIds) {
        await archiveEmployee(id)
      }
      toast.success(`${selectedIds.size} Mitarbeiter archiviert`)
      clearSelection()
      load()
    } catch {
      toast.error("Fehler beim Archivieren")
    }
  }

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteEmployee(id)
      }
      toast.success(`${selectedIds.size} Mitarbeiter gelöscht`)
      clearSelection()
      load()
    } catch {
      toast.error("Fehler beim Löschen")
    }
  }

  const confirmImport = async () => {
    if (!importDiff) return
    try {
      for (const { emp, archive } of importDiff.missing) {
        if (archive) await archiveEmployee(emp.id)
      }
      for (const { parsed, add } of importDiff.toAdd) {
        if (add) {
          await saveEmployee({
            ...EMPTY_FORM,
            vorname: parsed.vorname,
            nachname: parsed.nachname,
            geschlecht: parsed.geschlecht,
            geburtsdatum: parsed.geburtsdatum,
            strasse: parsed.strasse,
            plz: parsed.plz,
            ort: parsed.ort,
            eintrittsdatum: parsed.eintrittsdatum,
            position: parsed.position,
            beschaeftigung: parsed.beschaeftigung,
            telefon: parsed.telefon,
            mobil: parsed.mobil,
            email: parsed.email,
            mitNr: parsed.mitNr,
            krankenkasse: parsed.krankenkasse,
            lbnr: parsed.lbnr,
          })
        }
      }
      for (const { emp, parsed, accept } of importDiff.toUpdate) {
        if (accept) {
          await updateEmployee(emp.id, {
            geschlecht: parsed.geschlecht || emp.geschlecht,
            geburtsdatum: parsed.geburtsdatum || emp.geburtsdatum,
            strasse: parsed.strasse || emp.strasse,
            plz: parsed.plz || emp.plz,
            ort: parsed.ort || emp.ort,
            eintrittsdatum: parsed.eintrittsdatum || emp.eintrittsdatum,
            position: parsed.position || emp.position,
            beschaeftigung: parsed.beschaeftigung || emp.beschaeftigung,
            telefon: parsed.telefon || emp.telefon,
            mobil: parsed.mobil || emp.mobil,
            email: parsed.email || emp.email,
            krankenkasse: parsed.krankenkasse || emp.krankenkasse,
            lbnr: parsed.lbnr || emp.lbnr,
            mitNr: parsed.mitNr || emp.mitNr,
          })
        }
      }
      toast.success("Import abgeschlossen")
      setImportDiff(null)
      load()
    } catch (err: any) {
      toast.error(`Fehler beim Import: ${err.message}`)
    }
  }

  const field = (key: keyof typeof EMPTY_FORM, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {key === "notizen" ? (
        <Textarea
          value={formData[key] as string}
          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={2}
          className="text-sm"
        />
      ) : (
        <Input
          type={type}
          value={formData[key] as string}
          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  )

  const filtered = employees
    .filter((e) =>
      `${e.vorname} ${e.nachname} ${e.position} ${e.mitNr}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => a.nachname.localeCompare(b.nachname, "de") || a.vorname.localeCompare(b.vorname, "de"))

  const docGroups = [
    { label: "Verträge", types: documentTypes.filter((d) => d.category === "vertraege") },
    { label: "Zeugnisse", types: documentTypes.filter((d) => d.category === "zeugnisse") },
    { label: "Maßnahmen", types: documentTypes.filter((d) => d.category === "disziplinar") },
  ]

  const activeCount = allEmployees.filter((e) => !e.archiviert).length
  const archivedCount = allEmployees.filter((e) => e.archiviert).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mitarbeiter</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} aktiv{archivedCount > 0 ? ` · ${archivedCount} archiviert` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />
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
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border rounded-lg p-1 w-fit">
        {(["aktiv", "archiviert", "alle"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => switchFilter(f)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "aktiv" ? "Aktiv" : f === "archiviert" ? "Archiviert" : "Alle"}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Laden...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {search ? "Keine Ergebnisse" : filter === "archiviert" ? "Keine archivierten Mitarbeiter" : "Noch keine Mitarbeiter"}
          </p>
        </div>
      ) : (
        <>
        {/* Bulk-Aktionsleiste */}
        {selectMode && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <button onClick={selectedIds.size === filtered.length ? clearSelection : selectAll} className="flex items-center gap-1.5 text-primary font-medium hover:opacity-80">
              {selectedIds.size === filtered.length
                ? <MinusSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
              {selectedIds.size === filtered.length ? "Alle abwählen" : "Alle auswählen"}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-muted-foreground">{selectedIds.size} ausgewählt</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkArchive}>
                    <Archive className="w-3 h-3" />
                    Archivieren
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={handleBulkDelete}>
                    <Trash2 className="w-3 h-3" />
                    Löschen
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((emp) => (
            <Card key={emp.id} className={`overflow-hidden ${emp.archiviert ? "opacity-60" : ""} ${selectMode && selectedIds.has(emp.id) ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  {selectMode && (
                    <button
                      className="mr-2 shrink-0"
                      onClick={() => toggleSelect(emp.id)}
                    >
                      {selectedIds.has(emp.id)
                        ? <CheckSquare className="w-5 h-5 text-primary" />
                        : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  )}
                  <button
                    className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                    onClick={() => selectMode ? toggleSelect(emp.id) : openDetail(emp)}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                      {emp.vorname[0]}{emp.nachname[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {emp.geschlecht === "männlich" ? "Herr " : emp.geschlecht === "weiblich" ? "Frau " : ""}
                          {emp.vorname} {emp.nachname}
                        </p>
                        {emp.archiviert && (
                          <Badge variant="secondary" className="text-xs py-0 text-orange-600">Archiviert</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {emp.position && (
                          <Badge variant="secondary" className="text-xs py-0">{emp.position}</Badge>
                        )}
                        {emp.mitNr && (
                          <span className="text-xs text-muted-foreground">#{emp.mitNr}</span>
                        )}
                        {emp.beschaeftigung && (
                          <span className="text-xs text-muted-foreground">{emp.beschaeftigung}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 ml-3">
                    {!emp.archiviert && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                            <FileText className="w-3.5 h-3.5" />
                            Dokument
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {docGroups.map((group) => (
                            <div key={group.label}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                {group.label}
                              </div>
                              {group.types.map((doc) => (
                                <DropdownMenuItem
                                  key={doc.id}
                                  onClick={() => handlePrint(emp, doc.id)}
                                  className="text-xs"
                                >
                                  {doc.title}
                                </DropdownMenuItem>
                              ))}
                            </div>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {emp.archiviert ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => handleRestore(emp)}
                        title="Wiederherstellen"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-orange-500 hover:text-orange-600"
                        onClick={() => handleArchive(emp)}
                        title="Archivieren"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {emp.archiviert && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(emp)}
                        title="Endgültig löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

            </Card>
          ))}
        </div>
        </>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Mitarbeiter bearbeiten" : "Mitarbeiter hinzufügen"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Geschlecht</Label>
              <RadioGroup
                value={formData.geschlecht}
                onValueChange={(v) => setFormData((p) => ({ ...p, geschlecht: v }))}
                className="flex gap-4 pt-1"
              >
                {[["männlich", "Männlich"], ["weiblich", "Weiblich"], ["divers", "Divers"]].map(([val, label]) => (
                  <div key={val} className="flex items-center gap-2">
                    <RadioGroupItem value={val} id={val} />
                    <Label htmlFor={val} className="text-sm font-normal cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field("vorname", "Vorname *", "text", "Max")}
              {field("nachname", "Nachname *", "text", "Mustermann")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("geburtsdatum", "Geburtsdatum", "text", "TT.MM.JJJJ")}
              {field("eintrittsdatum", "Eintrittsdatum", "text", "TT.MM.JJJJ")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("position", "Tätigkeit", "text", "Pflegefachkraft")}
              {field("beschaeftigung", "Beschäftigung", "text", "Vollzeit")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("mitNr", "Mit.Nr.", "text", "32")}
              {field("krankenkasse", "Krankenkasse", "text", "BARMER")}
            </div>
            {field("lbnr", "LBNR", "text", "")}
            {field("strasse", "Straße & Hausnummer", "text", "Musterstraße 1")}
            <div className="grid grid-cols-3 gap-3">
              <div>{field("plz", "PLZ", "text", "44388")}</div>
              <div className="col-span-2">{field("ort", "Ort", "text", "Dortmund")}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("telefon", "Telefon", "tel", "0234 - 12345")}
              {field("mobil", "Mobil", "tel", "0176 - 12345678")}
            </div>
            {field("email", "E-Mail", "email", "max@example.de")}
            {field("notizen", "Notizen")}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave}>
              {editingEmployee ? "Speichern" : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Modal */}
      <Dialog open={!!detailEmployee} onOpenChange={(o) => !o && setDetailEmployee(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {detailEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                    {detailEmployee.vorname[0]}{detailEmployee.nachname[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">
                      {detailEmployee.geschlecht === "männlich" ? "Herr " : detailEmployee.geschlecht === "weiblich" ? "Frau " : ""}
                      {detailEmployee.vorname} {detailEmployee.nachname}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      {detailEmployee.position && <Badge variant="secondary" className="text-xs">{detailEmployee.position}</Badge>}
                      {detailEmployee.archiviert && <Badge variant="secondary" className="text-xs text-orange-600">Archiviert</Badge>}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                {detailEmployee.mitNr && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Mit.Nr.</p>
                    <p className="font-medium">{detailEmployee.mitNr}</p>
                  </div>
                )}
                {detailEmployee.beschaeftigung && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Beschäftigung</p>
                    <p className="font-medium">{detailEmployee.beschaeftigung}</p>
                  </div>
                )}
                {detailEmployee.krankenkasse && (
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-xs text-muted-foreground">Krankenkasse</p>
                    <p className="font-medium">{detailEmployee.krankenkasse}</p>
                  </div>
                )}
                {detailEmployee.geburtsdatum && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Geburtsdatum</p>
                    <p className="font-medium">{detailEmployee.geburtsdatum}</p>
                  </div>
                )}
                {detailEmployee.eintrittsdatum && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Eintrittsdatum</p>
                    <p className="font-medium">{detailEmployee.eintrittsdatum}</p>
                  </div>
                )}
                {(detailEmployee.strasse || detailEmployee.ort) && (
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-xs text-muted-foreground">Adresse</p>
                    <p className="font-medium">
                      {[detailEmployee.strasse, [detailEmployee.plz, detailEmployee.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
                {detailEmployee.telefon && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Telefon</p>
                    <p className="font-medium">{detailEmployee.telefon}</p>
                  </div>
                )}
                {detailEmployee.mobil && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Mobil</p>
                    <p className="font-medium">{detailEmployee.mobil}</p>
                  </div>
                )}
                {detailEmployee.email && (
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-xs text-muted-foreground">E-Mail</p>
                    <p className="font-medium">{detailEmployee.email}</p>
                  </div>
                )}
                {detailEmployee.lbnr && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">LBNR</p>
                    <p className="font-medium">{detailEmployee.lbnr}</p>
                  </div>
                )}
                {detailEmployee.notizen && (
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-xs text-muted-foreground">Notizen</p>
                    <p className="text-muted-foreground text-xs bg-muted/50 rounded p-2">{detailEmployee.notizen}</p>
                  </div>
                )}
              </div>

              {/* Document history */}
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Erstellte Dokumente
                </p>
                {detailDocsLoading ? (
                  <p className="text-xs text-muted-foreground">Laden...</p>
                ) : detailDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Noch keine Dokumente erstellt.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{doc.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={() => openFileFromStorage(doc.filename)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                          title={doc.filename}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Herunterladen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => openEdit(detailEmployee)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Bearbeiten
                </Button>
                <Button onClick={() => setDetailEmployee(null)}>Schließen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mitarbeiter endgültig löschen?</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {deleteConfirm.emp.vorname} {deleteConfirm.emp.nachname}
              </span>{" "}
              wird permanent gelöscht. Alle zugehörigen Daten gehen verloren und können nicht wiederhergestellt werden.
            </p>
          )}
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={confirmDelete}>Endgültig löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Diff Modal */}
      <Dialog open={!!importDiff} onOpenChange={(o) => !o && setImportDiff(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel-Import: Unterschiede</DialogTitle>
          </DialogHeader>

          {importDiff && (
            <div className="space-y-5">
              {importDiff.missing.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-orange-600 mb-2">
                    ⚠️ Nicht in der neuen Liste ({importDiff.missing.length})
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Diese Mitarbeiter sind in MOROX, aber nicht in der importierten Excel. Archivieren oder behalten?
                  </p>
                  <div className="space-y-2">
                    {importDiff.missing.map(({ emp, archive }, i) => (
                      <div key={emp.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{emp.vorname} {emp.nachname}</span>
                          {emp.position && <span className="text-xs text-muted-foreground ml-2">{emp.position}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={archive}
                              onCheckedChange={(c) =>
                                setImportDiff((d) => d ? {
                                  ...d,
                                  missing: d.missing.map((m, j) => j === i ? { ...m, archive: !!c } : m),
                                } : d)
                              }
                            />
                            Archivieren
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importDiff.toUpdate.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-blue-600 mb-2">
                    🔄 Geänderte Informationen ({importDiff.toUpdate.length})
                  </p>
                  <div className="space-y-2">
                    {importDiff.toUpdate.map(({ emp, changes, accept }, i) => (
                      <div key={emp.id} className="bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{emp.vorname} {emp.nachname}</span>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={accept}
                              onCheckedChange={(c) =>
                                setImportDiff((d) => d ? {
                                  ...d,
                                  toUpdate: d.toUpdate.map((u, j) => j === i ? { ...u, accept: !!c } : u),
                                } : d)
                              }
                            />
                            Übernehmen
                          </label>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {changes.map((c, ci) => <li key={ci}>{c}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importDiff.toAdd.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-green-600 mb-2">
                    ✅ Neue Mitarbeiter ({importDiff.toAdd.length})
                  </p>
                  <div className="space-y-2">
                    {importDiff.toAdd.map(({ parsed, add }, i) => (
                      <div key={i} className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{parsed.vorname} {parsed.nachname}</span>
                          {parsed.position && <span className="text-xs text-muted-foreground ml-2">{parsed.position}</span>}
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={add}
                            onCheckedChange={(c) =>
                              setImportDiff((d) => d ? {
                                ...d,
                                toAdd: d.toAdd.map((a, j) => j === i ? { ...a, add: !!c } : a),
                              } : d)
                            }
                          />
                          Hinzufügen
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setImportDiff(null)}>Abbrechen</Button>
            <Button onClick={confirmImport}>Import bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gender Dialog */}
      <Dialog open={genderParsed.length > 0} onOpenChange={(o) => !o && setGenderParsed([])}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Geschlecht zuweisen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Die Import-Datei enthält kein Geschlechtsfeld. Bitte für jeden Mitarbeiter festlegen:
          </p>
          <div className="grid grid-cols-3 gap-1 text-xs font-medium text-muted-foreground px-1 mb-1">
            <span>Name</span>
            <span className="text-center">Männlich</span>
            <span className="text-center">Weiblich</span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {genderParsed.map((p, i) => (
              <div key={i} className="grid grid-cols-3 items-center gap-1 px-1 py-1 rounded hover:bg-muted/30">
                <span className="text-sm truncate">{p.nachname}, {p.vorname}</span>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    checked={genderMap[i] === "männlich"}
                    onChange={() => setGenderMap((prev) => ({
                      ...prev,
                      [i]: prev[i] === "männlich" ? "" : "männlich",
                    }))}
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-pink-500 cursor-pointer"
                    checked={genderMap[i] === "weiblich"}
                    onChange={() => setGenderMap((prev) => ({
                      ...prev,
                      [i]: prev[i] === "weiblich" ? "" : "weiblich",
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2 border-t border-border mt-3 text-xs text-muted-foreground">
            <button className="underline" onClick={() => setGenderMap(Object.fromEntries(genderParsed.map((_, i) => [i, "männlich"])))}>Alle männlich</button>
            <button className="underline" onClick={() => setGenderMap(Object.fromEntries(genderParsed.map((_, i) => [i, "weiblich"])))}>Alle weiblich</button>
            <button className="underline" onClick={() => setGenderMap(Object.fromEntries(genderParsed.map((_, i) => [i, ""])))}>Zurücksetzen</button>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setGenderParsed([])}>Abbrechen</Button>
            <Button onClick={() => {
              const withGender = genderParsed.map((p, i) => ({ ...p, geschlecht: genderMap[i] ?? "" }))
              setGenderParsed([])
              runDiff(withGender)
            }}>
              Weiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ambiguous Names Dialog */}
      <Dialog open={ambiguousNames.length > 0} onOpenChange={(o) => !o && setAmbiguousNames([])}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Namen klären</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Bei folgenden Namen konnte Vor- und Nachname nicht automatisch erkannt werden. Bitte zuweisen:
          </p>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {ambiguousNames.map((a) => {
              const r = resolvedNames[a.rowIndex] ?? { nachname: a.parts[0], vorname: a.parts.slice(1).join(" ") }
              return (
                <div key={a.rowIndex} className="border border-border rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">„{a.fullName}"</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Vorname</label>
                      <Input
                        value={r.vorname}
                        onChange={(e) => setResolvedNames((prev) => ({ ...prev, [a.rowIndex]: { ...r, vorname: e.target.value } }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nachname</label>
                      <Input
                        value={r.nachname}
                        onChange={(e) => setResolvedNames((prev) => ({ ...prev, [a.rowIndex]: { ...r, nachname: e.target.value } }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAmbiguousNames([])}>Abbrechen</Button>
            <Button onClick={confirmAmbiguous}>Weiter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
