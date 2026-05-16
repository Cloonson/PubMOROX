"use client"

import { useState } from "react"
import { AlertTriangle, Info, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const TARIFVERTRAEGE = [
  "AVR Caritas",
  "AVR Diakonie Bayern",
  "AVR Diakonie Deutschland",
  "AVR DWBO",
  "AVR DWBO - Anlage Johanniter",
  "BAT-KF (KrSchO)",
  "DRK RTV",
  "TV AWO NRW",
  "TV Entgelt HELIOS",
  "TVA-L Pflege",
  "TVAöD-Pflege",
  "Sonstiger Tarifvertrag",
  "Haustarifvertrag",
  "Kein Tarifvertrag",
]

interface AuszubildenderEintrag {
  id: number
  name: string
  ausbildungsbeginn: string
  ausbildungsende: string
  ausbildungsumfang: string
  ausbildungsart: "pfk" | "pfa"
}

interface VergütungBlock {
  ausbildungsart: "pfk" | "pfa"
  tarifvertrag: string
  tarifvertragName: string
  tarifvertragFile: File | null
  bruttoJ1: string
  bruttoJ2: string
  bruttoJ3: string
  sonderzahlungen: string
  agBeitrag: string
  jahresPersonalkosten: string
}

let nextId = 1

const defaultVergütung = (art: "pfk" | "pfa"): VergütungBlock => ({
  ausbildungsart: art,
  tarifvertrag: "",
  tarifvertragName: "",
  tarifvertragFile: null,
  bruttoJ1: "",
  bruttoJ2: "",
  bruttoJ3: "",
  sonderzahlungen: "",
  agBeitrag: "24.00",
  jahresPersonalkosten: "",
})

export function AusgleichszuweisungView() {
  const [abrechnungsjahr] = useState("2025")
  const [auszubildende, setAuszubildende] = useState<AuszubildenderEintrag[]>([])
  const [vergütungPFK, setVergütungPFK] = useState<VergütungBlock>(defaultVergütung("pfk"))
  const [vergütungPFA, setVergütungPFA] = useState<VergütungBlock>(defaultVergütung("pfa"))
  const [nachweisFile, setNachweisFile] = useState<File | null>(null)
  const [erlaeuterung, setErlaeuterung] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [showHinweise, setShowHinweise] = useState(false)

  const hatPFK = auszubildende.some((a) => a.ausbildungsart === "pfk")
  const hatPFA = auszubildende.some((a) => a.ausbildungsart === "pfa")

  const addAuszubildender = () =>
    setAuszubildende((prev) => [
      ...prev,
      { id: nextId++, name: "", ausbildungsbeginn: "", ausbildungsende: "", ausbildungsumfang: "Vollzeit", ausbildungsart: "pfk" },
    ])

  const updateAusz = (id: number, field: keyof AuszubildenderEintrag, value: string) =>
    setAuszubildende((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  const deleteAusz = (id: number) =>
    setAuszubildende((prev) => prev.filter((a) => a.id !== id))

  const setV = (art: "pfk" | "pfa", field: keyof VergütungBlock, value: unknown) => {
    if (art === "pfk") setVergütungPFK((prev) => ({ ...prev, [field]: value }))
    else setVergütungPFA((prev) => ({ ...prev, [field]: value }))
  }

  const renderVergütungForm = (v: VergütungBlock) => {
    const art = v.ausbildungsart
    const isSonstiger = v.tarifvertrag === "Sonstiger Tarifvertrag" || v.tarifvertrag === "Haustarifvertrag"
    const jahreCount = art === "pfk" ? 3 : 2

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tarifvertrag <span className="text-destructive">*</span>
          </label>
          <select
            value={v.tarifvertrag}
            onChange={(e) => setV(art, "tarifvertrag", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">– Bitte wählen –</option>
            {TARIFVERTRAEGE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {isSonstiger && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-emerald-500/30">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name des Tarifvertrages <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Bezeichnung eingeben"
                value={v.tarifvertragName}
                onChange={(e) => setV(art, "tarifvertragName", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Upload Tarifvertrag <span className="text-destructive">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setV(art, "tarifvertragFile", e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-500/10 file:text-emerald-700 hover:file:bg-emerald-500/20 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className={cn("grid gap-4", jahreCount === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
          {Array.from({ length: jahreCount }, (_, i) => i + 1).map((j) => (
            <div key={j}>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tatsächliches Bruttogehalt {j}. Ausbildungsjahr <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={j === 1 ? v.bruttoJ1 : j === 2 ? v.bruttoJ2 : v.bruttoJ3}
                  onChange={(e) => setV(art, j === 1 ? "bruttoJ1" : j === 2 ? "bruttoJ2" : "bruttoJ3", e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">monatlich (tatsächlich gezahlt)</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tatsächliche Sonderzahlungen <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={v.sonderzahlungen}
                onChange={(e) => setV(art, "sonderzahlungen", e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">bezogen auf monatliches Bruttogehalt</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              AG-Beitrag Sozialversicherung <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="24,00"
                value={v.agBeitrag}
                onChange={(e) => setV(art, "agBeitrag", e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">einheitlich 24 % (RV + KV + PV + AV)</p>
          </div>
        </div>

        {art === "pfk" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Durchschn. Jahres-Bruttopersonalkosten vollausgebildete PFK ({abrechnungsjahr}) <span className="text-destructive">*</span>
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={v.jahresPersonalkosten}
                onChange={(e) => setV(art, "jahresPersonalkosten", e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ambulante Einrichtungen: 14 Auszubildende = 1 vollausgebildete PFK
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Abrechnungsmeldung Ausgleichszuweisungen</h1>
        <p className="text-muted-foreground text-sm">
          Abrechnung der Ausgleichszuweisungen {abrechnungsjahr} für PFAU.NRW vorbereiten
        </p>
      </div>

      {/* Fristhinweis */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">Frist: 30. Juni 2026</p>
          <p className="text-amber-700">
            Abrechnungsmeldung der Ausgleichszuweisungen {abrechnungsjahr} bis 30.06.2026 einreichen.
            In PFAU.NRW: Ausgleichszuweisung → Abrechnung
          </p>
        </div>
      </div>

      {/* Hinweise aufklappbar */}
      <div className="bg-card border border-border rounded-lg mb-5">
        <button
          onClick={() => setShowHinweise(!showHinweise)}
          className="flex items-center justify-between w-full px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-foreground">Was ist die Abrechnungsmeldung?</span>
          </div>
          {showHinweise ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showHinweise && (
          <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2 border-t border-border pt-3">
            <p>
              Die Abrechnungsmeldung der Ausgleichszuweisungen dient der Abrechnung des
              <strong className="text-foreground"> Vergütungsbestandteils</strong> der Ausgleichszuweisungen.
              Die tatsächlich gezahlten Vergütungswerte werden mit den Prognosewerten verglichen.
            </p>
            <p>
              Bei Vergütungswerten, die nicht zur Auszahlung an die Auszubildenden gekommen sind, erfolgt
              eine <strong className="text-foreground">Rückforderung</strong> zu viel erhaltener Ausgleichszuweisungen.
              Eine Nachzahlung ist nicht möglich, da die Prognosewerte die maximal mögliche Auszahlung bilden.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-md px-3 py-2 text-xs">
              <p className="font-medium text-foreground mb-1">Kalkulatorische Aufschläge 2027:</p>
              <p>PFK / Studierende: <strong className="text-foreground">4,16 %</strong> &nbsp;|&nbsp; PFA: <strong className="text-foreground">4,63 %</strong></p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Mit <span className="text-destructive font-bold">*</span> gekennzeichnete Felder sind Pflichtfelder.
      </p>

      {/* Sektion A: Auszubildende */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1">
          Auszubildende im Abrechnungsjahr {abrechnungsjahr} <span className="text-destructive">*</span>
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Alle Auszubildenden, für die Ausgleichszuweisungen im Finanzierungsjahr {abrechnungsjahr} abgerechnet werden.
          Nur Auszubildende mit zahlungswirksamen Ist-Meldungen berücksichtigen.
        </p>

        <div className="space-y-3">
          {auszubildende.map((a, i) => (
            <div key={a.id} className="border border-border rounded-md p-4 bg-muted/10 relative">
              <button
                onClick={() => deleteAusz(a.id)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Auszubildende/r {i + 1}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Name, Vorname <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nachname, Vorname"
                    value={a.name}
                    onChange={(e) => updateAusz(a.id, "name", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Ausbildungsbeginn <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="tt.mm.jjjj"
                    value={a.ausbildungsbeginn}
                    onChange={(e) => updateAusz(a.id, "ausbildungsbeginn", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Ausbildungsende (geplant/tatsächlich)
                  </label>
                  <input
                    type="text"
                    placeholder="tt.mm.jjjj"
                    value={a.ausbildungsende}
                    onChange={(e) => updateAusz(a.id, "ausbildungsende", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Ausbildungsumfang <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={a.ausbildungsumfang}
                    onChange={(e) => updateAusz(a.id, "ausbildungsumfang", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Vollzeit">Vollzeit</option>
                    <option value="Teilzeit">Teilzeit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Ausbildungsart <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={a.ausbildungsart}
                    onChange={(e) => updateAusz(a.id, "ausbildungsart", e.target.value as "pfk" | "pfa")}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="pfk">Pflegefachkraft (PFK)</option>
                    <option value="pfa">Pflegefachassistenz (PFA)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addAuszubildender}
            className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            Auszubildende/n hinzufügen
          </button>
        </div>
      </div>

      {/* Sektion B: Vergütungsdaten PFK */}
      {(hatPFK || auszubildende.length === 0) && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-1">
            Tatsächliche Vergütung {abrechnungsjahr} – Pflegefachkraft (PFK) <span className="text-destructive">*</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Tatsächlich gezahlte Vergütungswerte für Auszubildende zur PFK im Abrechnungsjahr {abrechnungsjahr}.
            Maßgeblich für die Abrechnung des Vergütungsbestandteils der Ausgleichszuweisung.
          </p>
          {renderVergütungForm(vergütungPFK)}
        </div>
      )}

      {/* Sektion C: Vergütungsdaten PFA */}
      {hatPFA && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-1">
            Tatsächliche Vergütung {abrechnungsjahr} – Pflegefachassistenz (PFA) <span className="text-destructive">*</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Tatsächlich gezahlte Vergütungswerte für Auszubildende zur PFA im Abrechnungsjahr {abrechnungsjahr}.
          </p>
          {renderVergütungForm(vergütungPFA)}
        </div>
      )}

      {/* Sektion D: Nachweise */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-3">Nachweise</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Nachweise über die tatsächlich gezahlten Vergütungen (z.B. Gehaltsabrechnungen, Lohnjournal).
          Keine personenbezogenen Daten der Pflegebedürftigen. Zulässige Formate: PDF, JPEG, JPG, PNG.
        </p>
        <input
          type="file"
          accept=".pdf,.jpeg,.jpg,.png"
          onChange={(e) => setNachweisFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-500/10 file:text-emerald-700 hover:file:bg-emerald-500/20 cursor-pointer"
        />
        {nachweisFile && (
          <p className="text-xs text-emerald-700 mt-1">✓ {nachweisFile.name}</p>
        )}
      </div>

      {/* Sektion E: Erläuterung */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1">Erläuterung</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Pflichtfeld bei erneuter Einreichung nach Zurückweisung. Bei Ersteinreichung optional.
        </p>
        <textarea
          rows={3}
          placeholder="Erläuterung (optional bei Ersteinreichung)"
          value={erlaeuterung}
          onChange={(e) => setErlaeuterung(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Zusammenfassung */}
      <div className="bg-card border border-border rounded-lg p-5">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="font-semibold text-foreground">Zusammenfassung für PFAU.NRW</h2>
          {showSummary ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showSummary && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-2">Auszubildende ({abrechnungsjahr}):</p>
              {auszubildende.length === 0 && <p className="text-muted-foreground italic">Keine erfasst.</p>}
              {auszubildende.map((a, i) => (
                <div key={a.id} className="bg-muted/20 rounded-md px-3 py-2 mb-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Name:</span><span>{a.name || "–"}</span>
                  <span className="text-muted-foreground">Beginn:</span><span>{a.ausbildungsbeginn || "–"}</span>
                  <span className="text-muted-foreground">Ende:</span><span>{a.ausbildungsende || "–"}</span>
                  <span className="text-muted-foreground">Umfang:</span><span>{a.ausbildungsumfang}</span>
                  <span className="text-muted-foreground">Art:</span><span>{a.ausbildungsart === "pfk" ? "Pflegefachkraft" : "Pflegefachassistenz"}</span>
                </div>
              ))}
            </div>

            {[vergütungPFK, ...(hatPFA ? [vergütungPFA] : [])].map((v) => (
              <div key={v.ausbildungsart}>
                <p className="font-medium text-foreground mb-2">
                  Vergütung {v.ausbildungsart === "pfk" ? "PFK" : "PFA"}:
                </p>
                <div className="bg-muted/20 rounded-md px-3 py-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Tarifvertrag:</span><span>{v.tarifvertrag || "–"}</span>
                  <span className="text-muted-foreground">Bruttogehalt J1:</span><span>{v.bruttoJ1 ? `${v.bruttoJ1} €` : "–"}</span>
                  <span className="text-muted-foreground">Bruttogehalt J2:</span><span>{v.bruttoJ2 ? `${v.bruttoJ2} €` : "–"}</span>
                  {v.ausbildungsart === "pfk" && <><span className="text-muted-foreground">Bruttogehalt J3:</span><span>{v.bruttoJ3 ? `${v.bruttoJ3} €` : "–"}</span></>}
                  <span className="text-muted-foreground">Sonderzahlungen:</span><span>{v.sonderzahlungen ? `${v.sonderzahlungen} %` : "–"}</span>
                  <span className="text-muted-foreground">AG-Beitrag SV:</span><span>{v.agBeitrag ? `${v.agBeitrag} %` : "–"}</span>
                  {v.ausbildungsart === "pfk" && <><span className="text-muted-foreground">Jahres-Personalkosten:</span><span>{v.jahresPersonalkosten ? `${v.jahresPersonalkosten} €` : "–"}</span></>}
                </div>
              </div>
            ))}

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1 text-emerald-600" />
              In PFAU.NRW eingeben: <strong className="text-foreground">Ausgleichszuweisung → Abrechnung → Abrechnungsmeldung {abrechnungsjahr}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
