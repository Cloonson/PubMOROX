"use client"

import { useEffect, useState } from "react"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  deleteEmployee,
  type Employee,
} from "@/lib/employee-service"
import { documentTypes, type DocumentType } from "@/lib/types"

const EMPTY_FORM: Omit<Employee, "id" | "createdAt"> = {
  vorname: "",
  nachname: "",
  geschlecht: "",
  geburtsdatum: "",
  strasse: "",
  plz: "",
  ort: "",
  telefon: "",
  email: "",
  position: "",
  eintrittsdatum: "",
  personalnummer: "",
  notizen: "",
}

interface MitarbeiterViewProps {
  onPrintDocument: (type: DocumentType, employeeData: Record<string, string>) => void
}

export function MitarbeiterView({ onPrintDocument }: MitarbeiterViewProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [docMenuEmployee, setDocMenuEmployee] = useState<Employee | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setEmployees(await listEmployees())
    } catch {
      toast.error("Fehler beim Laden der Mitarbeiter")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`"${emp.vorname} ${emp.nachname}" wirklich löschen?`)) return
    try {
      await deleteEmployee(emp.id)
      toast.success("Mitarbeiter gelöscht")
      load()
    } catch {
      toast.error("Fehler beim Löschen")
    }
  }

  const handlePrint = (emp: Employee, docType: DocumentType) => {
    const initialData: Record<string, string> = {
      mitarbeiterVorname: emp.vorname,
      mitarbeiterNachname: emp.nachname,
      mitarbeiterGeburtsdatum: emp.geburtsdatum,
      mitarbeiterStrasse: emp.strasse,
      mitarbeiterPlz: emp.plz,
      mitarbeiterOrt: emp.ort,
      eintrittsdatum: emp.eintrittsdatum,
      position: emp.position,
      geschlecht: emp.geschlecht,
    }
    onPrintDocument(docType, initialData)
  }

  const field = (key: keyof typeof EMPTY_FORM, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {key === "notizen" ? (
        <Textarea
          value={formData[key]}
          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={2}
          className="text-sm"
        />
      ) : (
        <Input
          type={type}
          value={formData[key]}
          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  )

  const filtered = employees.filter(
    (e) =>
      `${e.vorname} ${e.nachname} ${e.position} ${e.personalnummer}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  const docGroups = [
    { label: "Verträge", types: documentTypes.filter((d) => d.category === "vertraege") },
    { label: "Zeugnisse", types: documentTypes.filter((d) => d.category === "zeugnisse") },
    { label: "Maßnahmen", types: documentTypes.filter((d) => d.category === "disziplinar") },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mitarbeiter</h1>
            <p className="text-sm text-muted-foreground">{employees.length} Mitarbeiter gespeichert</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Mitarbeiter hinzufügen
        </Button>
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
            {search ? "Keine Ergebnisse" : "Noch keine Mitarbeiter"}
          </p>
          {!search && (
            <p className="text-sm mt-1">Klicke auf „Mitarbeiter hinzufügen"</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp) => (
            <Card key={emp.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                      {emp.vorname[0]}{emp.nachname[0]}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {emp.geschlecht === "männlich" ? "Herr " : emp.geschlecht === "weiblich" ? "Frau " : ""}{emp.vorname} {emp.nachname}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {emp.position && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {emp.position}
                          </Badge>
                        )}
                        {emp.personalnummer && (
                          <span className="text-xs text-muted-foreground">
                            #{emp.personalnummer}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedId === emp.id ? (
                      <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 ml-3">
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

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(emp)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(emp)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === emp.id && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="border-t pt-3 grid grid-cols-2 gap-2 text-sm">
                    {emp.geburtsdatum && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>geb. {emp.geburtsdatum}</span>
                      </div>
                    )}
                    {emp.eintrittsdatum && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        <span>seit {emp.eintrittsdatum}</span>
                      </div>
                    )}
                    {(emp.strasse || emp.ort) && (
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{[emp.strasse, emp.plz && emp.ort ? `${emp.plz} ${emp.ort}` : emp.ort].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {emp.telefon && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{emp.telefon}</span>
                      </div>
                    )}
                    {emp.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span>{emp.email}</span>
                      </div>
                    )}
                    {emp.notizen && (
                      <div className="col-span-2 mt-1 text-muted-foreground text-xs bg-muted/50 rounded p-2">
                        {emp.notizen}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

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
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="männlich" id="m" />
                  <Label htmlFor="m" className="text-sm font-normal cursor-pointer">Männlich</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weiblich" id="w" />
                  <Label htmlFor="w" className="text-sm font-normal cursor-pointer">Weiblich</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="divers" id="d" />
                  <Label htmlFor="d" className="text-sm font-normal cursor-pointer">Divers</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("vorname", "Vorname *", "text", "Max")}
              {field("nachname", "Nachname *", "text", "Mustermann")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("geburtsdatum", "Geburtsdatum", "date")}
              {field("personalnummer", "Personalnummer", "text", "MA-001")}
            </div>
            {field("position", "Position / Stelle", "text", "Pflegefachkraft")}
            {field("eintrittsdatum", "Eintrittsdatum", "date")}
            {field("strasse", "Straße & Hausnummer", "text", "Musterstraße 1")}
            <div className="grid grid-cols-3 gap-3">
              <div>
                {field("plz", "PLZ", "text", "12345")}
              </div>
              <div className="col-span-2">
                {field("ort", "Ort", "text", "Berlin")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("telefon", "Telefon", "tel", "+49 123 456789")}
              {field("email", "E-Mail", "email", "max@example.de")}
            </div>
            {field("notizen", "Notizen")}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>
              {editingEmployee ? "Speichern" : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
