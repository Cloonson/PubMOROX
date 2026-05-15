"use client"

import React from "react"

import { useState } from "react"
import { 
  ArrowLeft, 
  Download, 
  FileText,
  Clock,
  GraduationCap,
  BookOpen,
  FileEdit,
  Award,
  FileCheck,
  AlertTriangle,
  XCircle,
  Calculator,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { documentTypes, type DocumentType } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import {
  generateAushilfsvertrag,
  generateAusbildungsvertrag,
  generateKuendigung,
  generateArbeitsvertrag,
  generateArbeitszeugnis,
  generateAenderungsvereinbarung,
  generateAbmahnung,
} from "@/lib/docx-generator"

const iconMap = {
  FileText,
  Clock,
  GraduationCap,
  BookOpen,
  FileEdit,
  Award,
  FileCheck,
  AlertTriangle,
  XCircle,
  Calculator,
}

interface DocumentFormProps {
  documentType: DocumentType
  onBack: () => void
  onDocumentCreated?: () => void
  initialData?: Record<string, string>
}

export function DocumentForm({ documentType, onBack, onDocumentCreated, initialData }: DocumentFormProps) {
  const docInfo = documentTypes.find((d) => d.id === documentType)
  const Icon = docInfo?.icon ? iconMap[docInfo.icon as keyof typeof iconMap] : FileText
  const normalizeInitialData = (data?: Record<string, string>): Record<string, string> => {
    if (!data) return {}
    // These fields use type="date" → must be YYYY-MM-DD
    const dateFields = ["mitarbeiterGeburtsdatum", "eintrittsdatum", "austrittsdatum", "ausbildungsbeginn", "ausbildungsende", "befristungEnde", "erstellungsdatum", "urspruenglichesVertragsdatum", "aenderungAb"]
    const result: Record<string, string> = { ...data }
    for (const field of dateFields) {
      const val = result[field]
      if (!val) continue
      const num = Number(val)
      if (!isNaN(num) && String(val).trim() === String(num)) {
        // Excel serial → YYYY-MM-DD
        const ms = (num - 25569) * 86400000
        const d = new Date(ms)
        result[field] = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`
      } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val.trim())) {
        // DD.MM.YYYY → YYYY-MM-DD
        const [dd, mm, yyyy] = val.trim().split(".")
        result[field] = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
      }
    }
    return result
  }

  const [formData, setFormData] = useState<Record<string, string | boolean>>({
    erstellungsdatum: new Date().toISOString().split("T")[0],
    befristet: "befristet",
    ...normalizeInitialData(initialData),
  })
  const [showValidation, setShowValidation] = useState(false)

  // Farbe basierend auf Kategorie
  const getCategoryColor = () => {
    switch (docInfo?.category) {
      case "vertraege":
        return {
          bg: "bg-primary/10",
          text: "text-primary",
          border: "bg-primary",
        }
      case "zeugnisse":
        return {
          bg: "bg-secondary/10",
          text: "text-secondary",
          border: "bg-secondary",
        }
      case "disziplinar":
        return {
          bg: "bg-destructive/10",
          text: "text-destructive",
          border: "bg-destructive",
        }
      case "sonstiges":
        return {
          bg: "bg-purple-500/10",
          text: "text-purple-500",
          border: "bg-purple-500",
        }
      default:
        return {
          bg: "bg-primary/10",
          text: "text-primary",
          border: "bg-primary",
        }
    }
  }

  const colors = getCategoryColor()

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (showValidation && value && String(value).trim() !== "") {
      setShowValidation(false)
    }
  }

  // Prüfe ob ein bestimmtes Feld fehlt
  const isFieldMissing = (fieldName: string) => {
    if (!showValidation) return false
    return !formData[fieldName] || String(formData[fieldName]).trim() === ""
  }

  // Prüfe ob alle Pflichtfelder ausgefüllt sind
  const isFormValid = () => {
    // Allgemeine Pflichtfelder
    const baseFields = ["geschlecht", "mitarbeiterVorname", "mitarbeiterNachname", "mitarbeiterStrasse", "mitarbeiterPlz", "mitarbeiterOrt", "mitarbeiterGeburtsdatum"]
    const baseValid = baseFields.every((field) => formData[field] && String(formData[field]).trim() !== "")
    
    if (!baseValid) return false

    // Dokumentspezifische Pflichtfelder
    if (documentType === "aushilfsvertrag") {
      const aushilfeFields = ["befristet", "eintrittsdatum", "position", "stundenlohn", "urlaubstage"]
      const aushilfeValid = aushilfeFields.every((field) => formData[field] && String(formData[field]).trim() !== "")
      
      // Wenn befristet, muss auch befristungEnde ausgefüllt sein
      if (formData.befristet === "befristet") {
        return aushilfeValid && formData.befristungEnde && String(formData.befristungEnde).trim() !== ""
      }
      
      return aushilfeValid
    }

    if (documentType === "ausbildungsvertrag") {
      const ausbildungFields = ["ausbildungsbeginn", "ausbildungsende", "ausbildungsverguetung1", "ausbildungsverguetung2", "ausbildungsverguetung3"]
      return ausbildungFields.every((field) => formData[field] && String(formData[field]).trim() !== "")
    }

    if (documentType === "kuendigung") {
      const kuendigungFields = ["kuendigungsart", "kuendigungsdatum", "letzterArbeitstag"]
      const kuendigungValid = kuendigungFields.every((field) => formData[field] && String(formData[field]).trim() !== "")
      
      if (formData.kuendigungsart === "ausserordentlich") {
        return kuendigungValid && formData.kuendigungsgrund && String(formData.kuendigungsgrund).trim() !== ""
      }
      
      return kuendigungValid
    }

    if (documentType === "aenderungsvereinbarung") {
      return !!(formData.bisherigterVertragstyp && formData.urspruenglichesVertragsdatum && formData.aenderungAb && formData.aenderungsText && String(formData.aenderungsText).trim() !== "")
    }

    return true
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    // Already in DD.MM.YYYY format → return as-is
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString.trim())) return dateString.trim()
    // ISO YYYY-MM-DD → convert to DD.MM.YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
      const [y, m, d] = dateString.split("-")
      return `${d}.${m}.${y}`
    }
    // Fallback: let JS parse it
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      setShowValidation(true)
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }

    try {
      if (documentType === "arbeitsvertrag") {
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          bday: formatDate(String(formData.mitarbeiterGeburtsdatum)),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          begin: formatDate(String(formData.eintrittsdatum)),
          prof: String(formData.position),
          probezeit: String(formData.probezeit || ""),
          tagewoche: String(formData.tagewoche || ""),
          minstunden: String(formData.minstunden || ""),
          stundenmax: String(formData.stundenmax || ""),
          wage: String(formData.wage || ""),
          vaca: String(formData.urlaubstage || ""),
          vertragsart: (formData.vertragsart as "unbefristet" | "befristet" | "geringfuegig") || "unbefristet",
          ende: formData.befristungEnde ? formatDate(String(formData.befristungEnde)) : undefined,
        }
        await generateArbeitsvertrag(data)
        toast.success("Arbeitsvertrag wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "arbeitszeugnis" || documentType === "zwischenzeugnis") {
        const data = {
          gender: String(formData.geschlecht || ""),
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          date: formatDate(String(formData.erstellungsdatum)),
          bday: formatDate(String(formData.mitarbeiterGeburtsdatum)),
          cofbirth: String(formData.geburtsort || ""),
          begin: formatDate(String(formData.eintrittsdatum)),
          prof: String(formData.position),
          ende: formatDate(String(formData.austrittsdatum || "")),
          bewertung: String(formData.bewertung || "gut"),
          beendet: String(formData.beendet || "nein"),
        }
        await generateArbeitszeugnis(data)
        toast.success("Zeugnis wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "aushilfsvertrag") {
        // Hole die Minijob-Grenze aus localStorage
        const minijobLimit = localStorage.getItem("minijob-limit") || "603,00"
        
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          bday: formatDate(String(formData.mitarbeiterGeburtsdatum)),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          begin: formatDate(String(formData.eintrittsdatum)),
          grenz: minijobLimit,
          ...(formData.befristet === "befristet" && { ende: formatDate(String(formData.befristungEnde)) }),
          prof: String(formData.position),
          wage: String(formData.stundenlohn),
          vaca: String(formData.urlaubstage),
          befristet: String(formData.befristet),
        }

        await generateAushilfsvertrag(data, formData.befristet === "befristet")
        toast.success("Dokument wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "ausbildungsvertrag") {
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          bday: formatDate(String(formData.mitarbeiterGeburtsdatum)),
          begin: formatDate(String(formData.ausbildungsbeginn)),
          ende: formatDate(String(formData.ausbildungsende)),
          first: String(formData.ausbildungsverguetung1),
          second: String(formData.ausbildungsverguetung2),
          third: String(formData.ausbildungsverguetung3),
        }

        await generateAusbildungsvertrag(data, formData.geschlecht as "männlich" | "weiblich")
        toast.success("Ausbildungsvertrag wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "kuendigung") {
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          date: formatDate(String(formData.erstellungsdatum)),
          kdate: formatDate(String(formData.kuendigungsdatum)),
          last: formatDate(String(formData.letzterArbeitstag)),
          type: formData.kuendigungsart === "ordentlich" ? "ordentlich" : "außerordentlich",
          reason: String(formData.kuendigungsgrund || ""),
        }

        await generateKuendigung(data)
        toast.success("Kündigung wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "abmahnung") {
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          street: String(formData.mitarbeiterStrasse),
          city: `${formData.mitarbeiterPlz} ${formData.mitarbeiterOrt}`,
          date: formatDate(String(formData.erstellungsdatum)),
          beschreibung: String(formData.verstossbeschreibung || ""),
          konsequenz: String(formData.konsequenzen || "Im Wiederholungsfall behalten wir uns die Kündigung des Arbeitsverhältnisses vor."),
        }
        await generateAbmahnung(data)
        toast.success("Abmahnung wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else if (documentType === "aenderungsvereinbarung") {
        const data = {
          gender: formData.geschlecht === "männlich" ? "Herr" : formData.geschlecht === "weiblich" ? "Frau" : "Person",
          vorname: String(formData.mitarbeiterVorname),
          nachname: String(formData.mitarbeiterNachname),
          vertragsart: formData.bisherigterVertragstyp === "befristet" ? "befristeten" : "unbefristeten",
          vertragsdatum: formatDate(String(formData.urspruenglichesVertragsdatum)),
          aenderungsdatum: formatDate(String(formData.aenderungAb)),
          aenderungen: String(formData.aenderungsText || ""),
        }
        await generateAenderungsvereinbarung(data)
        toast.success("Änderungsvereinbarung wurde erfolgreich erstellt!")
        onDocumentCreated?.()
      } else {
        console.log("[v0] Form submitted with data:", formData)
        toast.info("Dokument-Daten wurden erfasst. DOCX-Export wird später implementiert.")
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Dokuments:", error)
      
      // Zeige detaillierte Fehlermeldung an
      let errorMessage = "Fehler beim Erstellen des Dokuments."
      
      if (error && typeof error === "object" && "properties" in error) {
        const docError = error as any
        if (docError.properties && docError.properties.errors) {
          errorMessage = "Template-Fehler gefunden. Bitte überprüfen Sie die DOCX-Vorlage."
        } else {
          errorMessage = String((error as any).message || "Unbekannter Fehler")
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zur Übersicht
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{docInfo?.title}</CardTitle>
              <CardDescription>{docInfo?.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Mitarbeiterdaten */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className={`w-1.5 h-5 ${colors.border} rounded-full`} />
                Mitarbeiterdaten
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geschlecht" className={isFieldMissing("geschlecht") ? "text-red-500" : ""}>
                    Geschlecht *
                  </Label>
                  <Select
                    required
                    value={(formData.geschlecht as string) || ""}
                    onValueChange={(value) => updateField("geschlecht", value)}
                  >
                    <SelectTrigger 
                      id="geschlecht"
                      className={isFieldMissing("geschlecht") ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="männlich">Männlich</SelectItem>
                      <SelectItem value="weiblich">Weiblich</SelectItem>
                      <SelectItem value="divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label htmlFor="mitarbeiterVorname" className={isFieldMissing("mitarbeiterVorname") ? "text-red-500" : ""}>
                    Vorname *
                  </Label>
                  <Input
                    id="mitarbeiterVorname"
                    required
                    value={(formData.mitarbeiterVorname as string) || ""}
                    onChange={(e) => updateField("mitarbeiterVorname", e.target.value)}
                    placeholder="Max"
                    className={isFieldMissing("mitarbeiterVorname") ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mitarbeiterNachname" className={isFieldMissing("mitarbeiterNachname") ? "text-red-500" : ""}>
                    Nachname *
                  </Label>
                  <Input
                    id="mitarbeiterNachname"
                    required
                    value={(formData.mitarbeiterNachname as string) || ""}
                    onChange={(e) => updateField("mitarbeiterNachname", e.target.value)}
                    placeholder="Mustermann"
                    className={isFieldMissing("mitarbeiterNachname") ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mitarbeiterStrasse" className={isFieldMissing("mitarbeiterStrasse") ? "text-red-500" : ""}>
                    Straße und Hausnummer *
                  </Label>
                  <Input
                    id="mitarbeiterStrasse"
                    required
                    value={(formData.mitarbeiterStrasse as string) || ""}
                    onChange={(e) => updateField("mitarbeiterStrasse", e.target.value)}
                    placeholder="Musterstraße 123"
                    className={isFieldMissing("mitarbeiterStrasse") ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mitarbeiterPlz" className={isFieldMissing("mitarbeiterPlz") ? "text-red-500" : ""}>
                    PLZ *
                  </Label>
                  <Input
                    id="mitarbeiterPlz"
                    required
                    value={(formData.mitarbeiterPlz as string) || ""}
                    onChange={(e) => updateField("mitarbeiterPlz", e.target.value)}
                    placeholder="12345"
                    className={isFieldMissing("mitarbeiterPlz") ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mitarbeiterOrt" className={isFieldMissing("mitarbeiterOrt") ? "text-red-500" : ""}>
                    Ort *
                  </Label>
                  <Input
                    id="mitarbeiterOrt"
                    required
                    value={(formData.mitarbeiterOrt as string) || ""}
                    onChange={(e) => updateField("mitarbeiterOrt", e.target.value)}
                    placeholder="Musterstadt"
                    className={isFieldMissing("mitarbeiterOrt") ? "border-red-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mitarbeiterGeburtsdatum" className={isFieldMissing("mitarbeiterGeburtsdatum") ? "text-red-500" : ""}>
                    Geburtsdatum *
                  </Label>
                  <Input
                    id="mitarbeiterGeburtsdatum"
                    type="date"
                    required
                    value={(formData.mitarbeiterGeburtsdatum as string) || ""}
                    onChange={(e) => updateField("mitarbeiterGeburtsdatum", e.target.value)}
                    className={isFieldMissing("mitarbeiterGeburtsdatum") ? "border-red-500" : ""}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Dokumentspezifische Felder */}
            {renderDocumentSpecificFields(documentType, formData, updateField, isFieldMissing)}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Dokument erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function renderDocumentSpecificFields(
  documentType: DocumentType,
  formData: Record<string, string | boolean>,
  updateField: (field: string, value: string | boolean) => void,
  isFieldMissing: (fieldName: string) => boolean
) {
  switch (documentType) {
    case "arbeitsvertrag":
      return <ArbeitsvertragFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "aushilfsvertrag":
      return <AushilfsvertragFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "ausbildungsvertrag":
      return <AusbildungsvertragFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "aenderungsvereinbarung":
      return <AenderungsvereinbarungFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "arbeitszeugnis":
      return <ArbeitszeugnisFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "zwischenzeugnis":
      return <ZwischenzeugnisFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "abmahnung":
      return <AbmahnungFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    case "kuendigung":
      return <KuendigungFields formData={formData} updateField={updateField} isFieldMissing={isFieldMissing} />
    default:
      return null
  }
}

interface FieldProps {
  formData: Record<string, string | boolean>
  updateField: (field: string, value: string | boolean) => void
  isFieldMissing: (fieldName: string) => boolean
}

function ArbeitsvertragFields({ formData, updateField }: FieldProps) {
  const isBefristet = formData.vertragsart === "befristet" || formData.vertragsart === "geringfuegig"

  const calcBefristungEnde = (eintrittsdatum: string) => {
    if (!eintrittsdatum) return ""
    // Support both YYYY-MM-DD (date input) and DD.MM.YYYY (German typed)
    let y: number, m: number, d: number
    if (eintrittsdatum.includes(".")) {
      const parts = eintrittsdatum.split(".").map(Number)
      d = parts[0]; m = parts[1]; y = parts[2]
    } else {
      const parts = eintrittsdatum.split("-").map(Number)
      y = parts[0]; m = parts[1]; d = parts[2]
    }
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return ""
    const date = new Date(y, m - 1, d)
    date.setFullYear(date.getFullYear() + 1)
    date.setDate(date.getDate() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const handleEintrittsdatumChange = (value: string) => {
    updateField("eintrittsdatum", value)
    if (isBefristet) {
      const result = calcBefristungEnde(value)
      if (result) updateField("befristungEnde", result)
    }
  }

  const handleVertragsartChange = (value: string) => {
    updateField("vertragsart", value)
    const isBef = value === "befristet" || value === "geringfuegig"
    if (isBef && formData.eintrittsdatum) {
      const result = calcBefristungEnde(formData.eintrittsdatum as string)
      if (result) updateField("befristungEnde", result)
    }
    if (!isBef) {
      updateField("befristungEnde", "")
    }
  }

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-primary rounded-full" />
        Vertragsdaten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="vertragsart">Vertragsart *</Label>
          <Select
            value={(formData.vertragsart as string) || "unbefristet"}
            onValueChange={handleVertragsartChange}
          >
            <SelectTrigger id="vertragsart">
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unbefristet">Unbefristet</SelectItem>
              <SelectItem value="befristet">Befristet</SelectItem>
              <SelectItem value="geringfuegig">Geringfügig beschäftigt (befristet)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eintrittsdatum">Eintrittsdatum *</Label>
          <Input
            id="eintrittsdatum"
            type="date"
            required
            value={(formData.eintrittsdatum as string) || ""}
            onChange={(e) => handleEintrittsdatumChange(e.target.value)}
          />
        </div>
        {isBefristet && (
          <div className="space-y-2">
            <Label htmlFor="befristungEnde">Befristet bis *</Label>
            <Input
              id="befristungEnde"
              type="date"
              required
              value={(formData.befristungEnde as string) || ""}
              onChange={(e) => updateField("befristungEnde", e.target.value)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="position">Position / Berufsbezeichnung *</Label>
          <Input
            id="position"
            required
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegefachkraft"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="probezeit">Probezeit (Monate)</Label>
          <Input
            id="probezeit"
            value={(formData.probezeit as string) || ""}
            onChange={(e) => updateField("probezeit", e.target.value)}
            placeholder="z.B. 6"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagewoche">Arbeitstage pro Woche</Label>
          <Input
            id="tagewoche"
            value={(formData.tagewoche as string) || ""}
            onChange={(e) => updateField("tagewoche", e.target.value)}
            placeholder="z.B. 5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minstunden">Mindeststunden/Woche</Label>
          <Input
            id="minstunden"
            value={(formData.minstunden as string) || ""}
            onChange={(e) => updateField("minstunden", e.target.value)}
            placeholder="z.B. 20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stundenmax">Maximalstunden/Woche</Label>
          <Input
            id="stundenmax"
            value={(formData.stundenmax as string) || ""}
            onChange={(e) => updateField("stundenmax", e.target.value)}
            placeholder="z.B. 40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wage">Stundenlohn (€/Std.) *</Label>
          <Input
            id="wage"
            required
            value={(formData.wage as string) || ""}
            onChange={(e) => updateField("wage", e.target.value)}
            placeholder="z.B. 18,50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="urlaubstage">Urlaubstage/Jahr</Label>
          <Input
            id="urlaubstage"
            value={(formData.urlaubstage as string) || ""}
            onChange={(e) => updateField("urlaubstage", e.target.value)}
            placeholder="z.B. 30"
          />
        </div>
      </div>
    </section>
  )
}

function AushilfsvertragFields({ formData, updateField, isFieldMissing }: FieldProps) {
  // Berechne automatisch Befristungsdatum (Eintrittsdatum + 1 Jahr - 1 Tag)
  const calculateBefristungEnde = (eintrittsdatum: string) => {
    if (!eintrittsdatum) return ""
    
    // Parse das Datum im Format YYYY-MM-DD
    const [year, month, day] = eintrittsdatum.split("-").map(Number)
    
    // Erstelle Datum mit den Werten (Monat ist 0-indexiert in JavaScript)
    const date = new Date(year, month - 1, day)
    
    // Addiere 1 Jahr und subtrahiere 1 Tag
    date.setFullYear(date.getFullYear() + 1)
    date.setDate(date.getDate() - 1)
    
    // Formatiere zurück zu YYYY-MM-DD
    const resultYear = date.getFullYear()
    const resultMonth = String(date.getMonth() + 1).padStart(2, '0')
    const resultDay = String(date.getDate()).padStart(2, '0')
    
    return `${resultYear}-${resultMonth}-${resultDay}`
  }

  // Formatiere Stundenlohn mit 2 Dezimalstellen
  const formatStundenlohn = (value: string) => {
    if (!value) return value
    // Ersetze Komma durch Punkt für Parsing
    const sanitized = value.replace(",", ".")
    const numValue = parseFloat(sanitized)
    
    if (!isNaN(numValue)) {
      // Formatiere mit 2 Nachkommastellen und Komma
      return numValue.toFixed(2).replace(".", ",")
    }
    return value
  }

  // Handle Eintrittsdatum Change
  const handleEintrittsdatumChange = (value: string) => {
    updateField("eintrittsdatum", value)
    if (formData.befristet === "befristet") {
      const calculatedEnd = calculateBefristungEnde(value)
      if (calculatedEnd) updateField("befristungEnde", calculatedEnd)
    }
  }

  // Handle Befristung Change
  const handleBefristetChange = (value: string) => {
    updateField("befristet", value)
    
    // Wenn auf befristet gewechselt wird, setze Enddatum
    if (value === "befristet" && formData.eintrittsdatum) {
      const calculatedEnd = calculateBefristungEnde(formData.eintrittsdatum as string)
      if (calculatedEnd) {
        updateField("befristungEnde", calculatedEnd)
      }
    }
    // Wenn auf unbefristet gewechselt wird, lösche Enddatum
    if (value === "unbefristet") {
      updateField("befristungEnde", "")
    }
  }

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-primary rounded-full" />
        Aushilfsvertragsdaten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zeile 1: Befristung links, rechts leer */}
        <div className="space-y-2">
          <Label htmlFor="befristet" className={isFieldMissing("befristet") ? "text-red-500" : ""}>
            Befristung *
          </Label>
          <Select
            value={(formData.befristet as string) || "befristet"}
            onValueChange={handleBefristetChange}
          >
            <SelectTrigger 
              id="befristet"
              className={isFieldMissing("befristet") ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Befristung auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="befristet">Befristet</SelectItem>
              <SelectItem value="unbefristet">Unbefristet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div></div>

        {/* Zeile 2: Eintrittsdatum links, Befristet bis rechts (nur wenn befristet) */}
        <div className="space-y-2">
          <Label htmlFor="eintrittsdatum" className={isFieldMissing("eintrittsdatum") ? "text-red-500" : ""}>
            Eintrittsdatum *
          </Label>
          <Input
            id="eintrittsdatum"
            type="date"
            required
            value={(formData.eintrittsdatum as string) || ""}
            onChange={(e) => handleEintrittsdatumChange(e.target.value)}
            className={isFieldMissing("eintrittsdatum") ? "border-red-500" : ""}
          />
        </div>

        {(formData.befristet === "befristet" || !formData.befristet) ? (
          <div className="space-y-2">
            <Label htmlFor="befristungEnde" className={isFieldMissing("befristungEnde") ? "text-red-500" : ""}>
              Befristet bis *
            </Label>
            <Input
              id="befristungEnde"
              type="date"
              required
              value={(formData.befristungEnde as string) || ""}
              onChange={(e) => updateField("befristungEnde", e.target.value)}
              className={isFieldMissing("befristungEnde") ? "border-red-500" : ""}
            />
          </div>
        ) : (
          <div></div>
        )}

        {/* Zeile 3: Position links, Stundenlohn rechts */}
        <div className="space-y-2">
          <Label htmlFor="position" className={isFieldMissing("position") ? "text-red-500" : ""}>
            Position *
          </Label>
          <Input
            id="position"
            required
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegehilfskraft"
            className={isFieldMissing("position") ? "border-red-500" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stundenlohn" className={isFieldMissing("stundenlohn") ? "text-red-500" : ""}>
            Stundenlohn (€/Std.) *
          </Label>
          <Input
            id="stundenlohn"
            required
            value={(formData.stundenlohn as string) || ""}
            onChange={(e) => updateField("stundenlohn", e.target.value)}
            onBlur={(e) => {
              const formatted = formatStundenlohn(e.target.value)
              updateField("stundenlohn", formatted)
            }}
            placeholder="z.B. 15,00"
            className={isFieldMissing("stundenlohn") ? "border-red-500" : ""}
          />
        </div>

        {/* Zeile 4: Urlaubstage */}
        <div className="space-y-2">
          <Label htmlFor="urlaubstage" className={isFieldMissing("urlaubstage") ? "text-red-500" : ""}>
            Urlaubstage/Jahr *
          </Label>
          <Input
            id="urlaubstage"
            required
            value={(formData.urlaubstage as string) || ""}
            onChange={(e) => updateField("urlaubstage", e.target.value)}
            placeholder="z.B. 30"
            className={isFieldMissing("urlaubstage") ? "border-red-500" : ""}
          />
        </div>
      </div>
    </section>
  )
}

function AusbildungsvertragFields({ formData, updateField, isFieldMissing }: FieldProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-primary rounded-full" />
        Ausbildungsdaten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ausbildungsbeginn" className={isFieldMissing("ausbildungsbeginn") ? "text-red-500" : ""}>
            Ausbildungsbeginn *
          </Label>
          <Input
            id="ausbildungsbeginn"
            type="date"
            required
            className={isFieldMissing("ausbildungsbeginn") ? "border-red-500" : ""}
            value={(formData.ausbildungsbeginn as string) || ""}
            onChange={(e) => updateField("ausbildungsbeginn", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ausbildungsende" className={isFieldMissing("ausbildungsende") ? "text-red-500" : ""}>
            Voraussichtliches Ausbildungsende *
          </Label>
          <Input
            id="ausbildungsende"
            type="date"
            required
            className={isFieldMissing("ausbildungsende") ? "border-red-500" : ""}
            value={(formData.ausbildungsende as string) || ""}
            onChange={(e) => updateField("ausbildungsende", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ausbildungsverguetung1" className={isFieldMissing("ausbildungsverguetung1") ? "text-red-500" : ""}>
            Vergütung 1. Jahr (€) *
          </Label>
          <Input
            id="ausbildungsverguetung1"
            required
            className={isFieldMissing("ausbildungsverguetung1") ? "border-red-500" : ""}
            value={(formData.ausbildungsverguetung1 as string) || ""}
            onChange={(e) => updateField("ausbildungsverguetung1", e.target.value)}
            placeholder="z.B. 1190,68"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ausbildungsverguetung2" className={isFieldMissing("ausbildungsverguetung2") ? "text-red-500" : ""}>
            Vergütung 2. Jahr (€) *
          </Label>
          <Input
            id="ausbildungsverguetung2"
            required
            className={isFieldMissing("ausbildungsverguetung2") ? "border-red-500" : ""}
            value={(formData.ausbildungsverguetung2 as string) || ""}
            onChange={(e) => updateField("ausbildungsverguetung2", e.target.value)}
            placeholder="z.B. 1252,07"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ausbildungsverguetung3" className={isFieldMissing("ausbildungsverguetung3") ? "text-red-500" : ""}>
            Vergütung 3. Jahr (€) *
          </Label>
          <Input
            id="ausbildungsverguetung3"
            required
            className={isFieldMissing("ausbildungsverguetung3") ? "border-red-500" : ""}
            value={(formData.ausbildungsverguetung3 as string) || ""}
            onChange={(e) => updateField("ausbildungsverguetung3", e.target.value)}
            placeholder="z.B. 1353,38"
          />
        </div>
      </div>
    </section>
  )
}


const fmtDateDoc = (d: string) => {
  if (!d) return "___"
  const parts = d.split("-")
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return d
}

const PARAGRAPHEN = [
  {
    id: "verguetung",
    title: "§ 5 Vergütung",
    fields: [
      { key: "p_wage", label: "Neuer Stundenlohn (EUR)", placeholder: "z.B. 15,50" },
    ],
    buildText: (vals: Record<string, string>) =>
      `• Der Arbeitnehmer erhält eine stündliche Bruttovergütung von ${vals.p_wage || "___"} EUR. Die Vergütung ist jeweils am 1. des nächsten Monats fällig. (Änderung zu § 5 des Arbeitsvertrags)`,
  },
  {
    id: "tagewoche",
    title: "§ 6 Arbeitszeit – Arbeitswoche",
    fields: [
      { key: "p_tagewoche", label: "Arbeitstage pro Woche", placeholder: "z.B. 5" },
    ],
    buildText: (vals: Record<string, string>) =>
      `• Die Arbeitswoche ist eine ${vals.p_tagewoche || "___"}-Tage-Woche. (Änderung zu § 6 Abs. 2 des Arbeitsvertrags)`,
  },
  {
    id: "stunden",
    title: "§ 6 Arbeitszeit – Stunden",
    fields: [
      { key: "p_minstunden", label: "Min. Stunden/Monat", placeholder: "z.B. 80" },
      { key: "p_stundenmax", label: "Max. Stunden/Monat", placeholder: "z.B. 100" },
    ],
    buildText: (vals: Record<string, string>) =>
      `• Die regelmäßige monatliche Arbeitszeit beträgt mindestens ${vals.p_minstunden || "___"} Stunden. Der Arbeitnehmer verpflichtet sich, auf Abruf des Arbeitgebers bis zu ${vals.p_stundenmax || "___"} Stunden monatlich zu arbeiten. (Änderung zu § 6 Abs. 2 des Arbeitsvertrags)`,
  },
  {
    id: "urlaub",
    title: "§ 7 Urlaub",
    fields: [
      { key: "p_vaca", label: "Urlaubstage pro Kalenderjahr", placeholder: "z.B. 25" },
    ],
    buildText: (vals: Record<string, string>) =>
      `• Der Arbeitnehmer hat Anspruch auf ${vals.p_vaca || "___"} Arbeitstage Erholungsurlaub pro Kalenderjahr. Der Urlaubsanspruch richtet sich nach der Anzahl der regelmäßigen Arbeitstage pro Woche. (Änderung zu § 7 des Arbeitsvertrags)`,
  },
]

function AenderungsvereinbarungFields({ formData, updateField, isFieldMissing }: FieldProps) {
  const selectedStr = (formData.selectedParagraphen as string) || ""
  const selectedIds: string[] = selectedStr ? selectedStr.split(",") : []

  const rebuildText = (ids: string[], data: Record<string, string | boolean>) => {
    const vals = data as Record<string, string>
    const parts = PARAGRAPHEN
      .filter((p) => ids.includes(p.id))
      .map((p) => p.buildText(vals))
      .filter(Boolean)
    updateField("aenderungsText", parts.join("\n\n"))
  }

  const toggleParagraph = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    updateField("selectedParagraphen", next.join(","))
    rebuildText(next, formData)
  }

  const handleFieldChange = (key: string, value: string) => {
    updateField(key, value)
    setTimeout(() => {
      const updated = { ...formData, [key]: value }
      rebuildText(selectedIds, updated)
    }, 0)
  }

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <div className="w-1.5 h-5 bg-primary rounded-full" />
        Änderungsdaten
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bisherigterVertragstyp">Bisheriger Vertragstyp *</Label>
          <Select
            value={(formData.bisherigterVertragstyp as string) || ""}
            onValueChange={(v) => updateField("bisherigterVertragstyp", v)}
          >
            <SelectTrigger id="bisherigterVertragstyp">
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unbefristet">Unbefristeter Arbeitsvertrag</SelectItem>
              <SelectItem value="befristet">Befristeter Arbeitsvertrag</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urspruenglichesVertragsdatum">Ursprüngliches Vertragsdatum *</Label>
          <Input
            id="urspruenglichesVertragsdatum"
            type="date"
            required
            value={(formData.urspruenglichesVertragsdatum as string) || ""}
            onChange={(e) => updateField("urspruenglichesVertragsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aenderungAb">Änderung gültig ab *</Label>
          <Input
            id="aenderungAb"
            type="date"
            required
            value={(formData.aenderungAb as string) || ""}
            onChange={(e) => {
              updateField("aenderungAb", e.target.value)
              setTimeout(() => {
                const updated = { ...formData, aenderungAb: e.target.value }
                rebuildText(selectedIds, updated)
              }, 0)
            }}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-base font-semibold">Betroffene Paragraphen *</Label>
        <p className="text-sm text-muted-foreground">Wählen Sie die zu ändernden Paragrafen aus und füllen Sie die neuen Werte ein.</p>

        <div className="space-y-4">
          {PARAGRAPHEN.map((para) => {
            const isSelected = selectedIds.includes(para.id)
            return (
              <div key={para.id} className={`rounded-lg border p-4 transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <div className="flex items-center gap-3 mb-0">
                  <Checkbox
                    id={`para-${para.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleParagraph(para.id)}
                  />
                  <Label htmlFor={`para-${para.id}`} className="font-medium cursor-pointer">
                    {para.title}
                  </Label>
                </div>

                {isSelected && (
                  <div className={`mt-3 grid gap-3 ${para.fields.length > 1 ? "grid-cols-1 md:grid-cols-" + para.fields.length : "grid-cols-1"}`}>
                    {para.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
                        {(field as any).multiline ? (
                          <Textarea
                            id={field.key}
                            value={(formData[field.key as any] as string) || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={field.key}
                            value={(formData[field.key as any] as string) || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="aenderungsText" className={`text-sm font-medium ${isFieldMissing("aenderungsText") ? "text-red-500" : ""}`}>
              Vorschau Änderungstext *
            </Label>
            <Textarea
              id="aenderungsText"
              value={(formData.aenderungsText as string) || ""}
              onChange={(e) => updateField("aenderungsText", e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Text wird automatisch aus den Eingaben generiert..."
            />
            <p className="text-xs text-muted-foreground">Der Text kann hier noch manuell angepasst werden.</p>
          </div>
        </>
      )}
    </section>
  )
}

function ArbeitszeugnisFields({ formData, updateField }: FieldProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-secondary rounded-full" />
        Zeugnis-Daten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bewertung">Zeugnis-Bewertung *</Label>
          <Select
            value={(formData.bewertung as string) || "gut"}
            onValueChange={(v) => updateField("bewertung", v)}
          >
            <SelectTrigger id="bewertung">
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gut">Gut (sehr zufrieden)</SelectItem>
              <SelectItem value="mittel">Mittel (zufrieden)</SelectItem>
              <SelectItem value="schlecht">Ausreichend (überwiegend zufrieden)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2 flex items-center gap-3 rounded-lg border p-3">
          <Switch
            id="beendet"
            checked={(formData.beendet as string) === "ja"}
            onCheckedChange={(checked) => updateField("beendet", checked ? "ja" : "nein")}
          />
          <div>
            <Label htmlFor="beendet" className="font-medium cursor-pointer">Arbeitsverhältnis bereits beendet</Label>
            <p className="text-xs text-muted-foreground">
              {(formData.beendet as string) === "ja"
                ? "Vergangenheitsform: \"verließ unser Unternehmen zum...\""
                : "Gegenwartsform: \"verlässt unser Unternehmen zum...\""}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eintrittsdatum">Eintrittsdatum *</Label>
          <Input
            id="eintrittsdatum"
            type="date"
            required
            value={(formData.eintrittsdatum as string) || ""}
            onChange={(e) => updateField("eintrittsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="austrittsdatum">
            {(formData.beendet as string) === "ja" ? "Austrittsdatum *" : "Austrittsdatum (geplant) *"}
          </Label>
          <Input
            id="austrittsdatum"
            type="date"
            required
            value={(formData.austrittsdatum as string) || ""}
            onChange={(e) => updateField("austrittsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            required
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegefachkraft"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geburtsort">Geburtsort *</Label>
          <Input
            id="geburtsort"
            required
            value={(formData.geburtsort as string) || ""}
            onChange={(e) => updateField("geburtsort", e.target.value)}
            placeholder="z.B. Berlin"
          />
        </div>
      </div>
    </section>
  )
}

function ZwischenzeugnisFields({ formData, updateField }: FieldProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-secondary rounded-full" />
        Zwischenzeugnis-Daten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bewertung">Zeugnis-Bewertung *</Label>
          <Select
            value={(formData.bewertung as string) || "gut"}
            onValueChange={(v) => updateField("bewertung", v)}
          >
            <SelectTrigger id="bewertung">
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gut">Gut (sehr zufrieden)</SelectItem>
              <SelectItem value="mittel">Mittel (zufrieden)</SelectItem>
              <SelectItem value="schlecht">Ausreichend (überwiegend zufrieden)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2 flex items-center gap-3 rounded-lg border p-3">
          <Switch
            id="beendet-zwischen"
            checked={(formData.beendet as string) === "ja"}
            onCheckedChange={(checked) => updateField("beendet", checked ? "ja" : "nein")}
          />
          <div>
            <Label htmlFor="beendet-zwischen" className="font-medium cursor-pointer">Arbeitsverhältnis bereits beendet</Label>
            <p className="text-xs text-muted-foreground">
              {(formData.beendet as string) === "ja"
                ? "Vergangenheitsform: \"verließ unser Unternehmen zum...\""
                : "Gegenwartsform: \"verlässt unser Unternehmen zum...\""}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eintrittsdatum">Eintrittsdatum *</Label>
          <Input
            id="eintrittsdatum"
            type="date"
            required
            value={(formData.eintrittsdatum as string) || ""}
            onChange={(e) => updateField("eintrittsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="austrittsdatum">
            {(formData.beendet as string) === "ja" ? "Austrittsdatum *" : "Ausstellungsdatum *"}
          </Label>
          <Input
            id="austrittsdatum"
            type="date"
            required
            value={(formData.austrittsdatum as string) || ""}
            onChange={(e) => updateField("austrittsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Aktuelle Position *</Label>
          <Input
            id="position"
            required
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegefachkraft"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geburtsort">Geburtsort *</Label>
          <Input
            id="geburtsort"
            required
            value={(formData.geburtsort as string) || ""}
            onChange={(e) => updateField("geburtsort", e.target.value)}
            placeholder="z.B. Berlin"
          />
        </div>
      </div>
    </section>
  )
}

function AbmahnungFields({ formData, updateField }: FieldProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-destructive rounded-full" />
        Abmahnungsdaten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eintrittsdatum">Eintrittsdatum</Label>
          <Input
            id="eintrittsdatum"
            type="date"
            value={(formData.eintrittsdatum as string) || ""}
            onChange={(e) => updateField("eintrittsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegefachkraft"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="verstossdatum">Datum des Verstoßes *</Label>
          <Input
            id="verstossdatum"
            type="date"
            required
            value={(formData.verstossdatum as string) || ""}
            onChange={(e) => updateField("verstossdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="verstossart">Art des Verstoßes *</Label>
          <Select
            value={(formData.verstossart as string) || ""}
            onValueChange={(value) => updateField("verstossart", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verspaetung">Verspätung/Abwesenheit</SelectItem>
              <SelectItem value="arbeitsverweigerung">Arbeitsverweigerung</SelectItem>
              <SelectItem value="pflichtverletzung">Pflichtverletzung</SelectItem>
              <SelectItem value="verhalten">Fehlverhalten</SelectItem>
              <SelectItem value="sonstiges">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="verstossbeschreibung">Detaillierte Beschreibung des Verstoßes *</Label>
          <Textarea
            id="verstossbeschreibung"
            required
            value={(formData.verstossbeschreibung as string) || ""}
            onChange={(e) => updateField("verstossbeschreibung", e.target.value)}
            placeholder="Genaue Beschreibung des Vorfalls mit Datum, Uhrzeit und Zeugen..."
            rows={4}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="konsequenzen">Konsequenzen bei Wiederholung</Label>
          <Textarea
            id="konsequenzen"
            value={(formData.konsequenzen as string) || ""}
            onChange={(e) => updateField("konsequenzen", e.target.value)}
            placeholder="z.B. Im Wiederholungsfall behalten wir uns die Kündigung des Arbeitsverhältnisses vor."
            rows={2}
          />
        </div>
      </div>
    </section>
  )
}

function KuendigungFields({ formData, updateField, isFieldMissing }: FieldProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-destructive rounded-full" />
        Kündigungsdaten
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kuendigungsart" className={isFieldMissing("kuendigungsart") ? "text-red-500" : ""}>
            Kündigungsart *
          </Label>
          <Select
            value={(formData.kuendigungsart as string) || ""}
            onValueChange={(value) => updateField("kuendigungsart", value)}
          >
            <SelectTrigger className={isFieldMissing("kuendigungsart") ? "border-red-500" : ""}>
              <SelectValue placeholder="Auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ordentlich">Ordentliche Kündigung</SelectItem>
              <SelectItem value="ausserordentlich">Außerordentliche Kündigung</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={(formData.position as string) || ""}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="z.B. Pflegefachkraft"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kuendigungsdatum" className={isFieldMissing("kuendigungsdatum") ? "text-red-500" : ""}>
            Kündigungsdatum *
          </Label>
          <Input
            id="kuendigungsdatum"
            type="date"
            required
            className={isFieldMissing("kuendigungsdatum") ? "border-red-500" : ""}
            value={(formData.kuendigungsdatum as string) || ""}
            onChange={(e) => updateField("kuendigungsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="letzterArbeitstag" className={isFieldMissing("letzterArbeitstag") ? "text-red-500" : ""}>
            Letzter Arbeitstag *
          </Label>
          <Input
            id="letzterArbeitstag"
            type="date"
            required
            className={isFieldMissing("letzterArbeitstag") ? "border-red-500" : ""}
            value={(formData.letzterArbeitstag as string) || ""}
            onChange={(e) => updateField("letzterArbeitstag", e.target.value)}
          />
        </div>
        {formData.kuendigungsart === "ausserordentlich" && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="kuendigungsgrund" className={isFieldMissing("kuendigungsgrund") ? "text-red-500" : ""}>
              Kündigungsgrund *
            </Label>
            <Textarea
              id="kuendigungsgrund"
              required
              className={isFieldMissing("kuendigungsgrund") ? "border-red-500" : ""}
              value={(formData.kuendigungsgrund as string) || ""}
              onChange={(e) => updateField("kuendigungsgrund", e.target.value)}
              placeholder="Begründung für die außerordentliche Kündigung..."
              rows={4}
            />
          </div>
        )}
      </div>
    </section>
  )
}
