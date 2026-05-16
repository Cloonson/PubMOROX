"use client"

import { useState } from "react"
import { AlertTriangle, Plus, Trash2, Info, ChevronRight, ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Meldungstyp = "pfk" | "pfa"
type Vollzeit = "Vollzeit" | "Teilzeit"
type AusbildungsumfangPFA = "Vollzeit" | "Teilzeit" | "Vorbereitungskurs Vollzeit" | "Vorbereitungskurs Teilzeit" | "Nur Abnahme Abschlussprüfung"

const BEGRUENDUNGEN = [
  "Neues Ausbildungsjahr startet regulär",
  "Bestehende Kapazitäten vorhanden",
  "Ersatz für ausgeschiedene Auszubildende",
  "Erstmalige Ausbildung in der Einrichtung",
  "Erhöhter Bedarf an Pflegefachkräften",
  "Sonstiges",
]

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

interface AusbildungsEintrag {
  id: number
  ausbildungsbeginn: string
  ausbildungsumfang: string
  teilzeitProzent: string
  anzahl: string
  begruendung: string
  begruendungSonstiges: string
}

interface VerguetungData {
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
const newEintrag = (): AusbildungsEintrag => ({
  id: nextId++,
  ausbildungsbeginn: "",
  ausbildungsumfang: "Vollzeit",
  teilzeitProzent: "",
  anzahl: "",
  begruendung: "",
  begruendungSonstiges: "",
})

const STEPS_PFK = ["Meldungstyp", "Restjahr 2026", "Prognose 2027", "Vergütung 2027", "Übersicht"]
const STEPS_PFA = ["Meldungstyp", "Prognose 2027", "Übersicht"]

function EintragCard({
  eintrag,
  onUpdate,
  onDelete,
  isPFA,
  label,
}: {
  eintrag: AusbildungsEintrag
  onUpdate: (updated: AusbildungsEintrag) => void
  onDelete: () => void
  isPFA: boolean
  label: string
}) {
  const umfangOptionen: string[] = isPFA
    ? ["Vollzeit", "Teilzeit", "Vorbereitungskurs Vollzeit", "Vorbereitungskurs Teilzeit", "Nur Abnahme Abschlussprüfung"]
    : ["Vollzeit", "Teilzeit"]

  return (
    <div className="border border-border rounded-md p-4 bg-muted/10 space-y-3 relative">
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
        title="Eintrag entfernen"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Ausbildungsbeginn <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="tt.mm.jjjj"
            value={eintrag.ausbildungsbeginn}
            onChange={(e) => onUpdate({ ...eintrag, ausbildungsbeginn: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Ausbildungsumfang <span className="text-destructive">*</span>
          </label>
          <select
            value={eintrag.ausbildungsumfang}
            onChange={(e) => onUpdate({ ...eintrag, ausbildungsumfang: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {umfangOptionen.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {eintrag.ausbildungsumfang === "Teilzeit" && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Teilzeit in Prozent <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="99"
                placeholder="z.B. 75"
                value={eintrag.teilzeitProzent}
                onChange={(e) => onUpdate({ ...eintrag, teilzeitProzent: e.target.value })}
                className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Anzahl der Auszubildenden <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={eintrag.anzahl}
            onChange={(e) => onUpdate({ ...eintrag, anzahl: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className={eintrag.ausbildungsumfang === "Teilzeit" ? "" : "sm:col-span-2"}>
          <label className="block text-xs font-medium text-foreground mb-1">
            Begründung der Auszubildendenzahl <span className="text-destructive">*</span>
          </label>
          <select
            value={eintrag.begruendung}
            onChange={(e) => onUpdate({ ...eintrag, begruendung: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">– Bitte wählen –</option>
            {BEGRUENDUNGEN.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {eintrag.begruendung === "Sonstiges" && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-foreground mb-1">
              Eigene Begründung <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Begründung eingeben"
              value={eintrag.begruendungSonstiges}
              onChange={(e) => onUpdate({ ...eintrag, begruendungSonstiges: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function PrognosemeldungView() {
  const [meldungstyp, setMeldungstyp] = useState<Meldungstyp | "">("")
  const [step, setStep] = useState(0)

  // Restjahr 2026 (nur PFK)
  const [hatRestjahr, setHatRestjahr] = useState<"ja" | "nein" | "">("")
  const [restjahrEintraege, setRestjahrEintraege] = useState<AusbildungsEintrag[]>([])

  // Prognose 2027
  const [hat2027, setHat2027] = useState<"ja" | "nein" | "">("")
  const [eintraege2027, setEintraege2027] = useState<AusbildungsEintrag[]>([])

  // Vergütung 2027 (nur PFK)
  const [verguetung, setVerguetung] = useState<VerguetungData>({
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

  const [showFinalSummary, setShowFinalSummary] = useState(false)

  const isPFA = meldungstyp === "pfa"
  const steps = isPFA ? STEPS_PFA : STEPS_PFK
  const totalSteps = steps.length

  const currentStepName = steps[step] ?? ""

  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const isSonstiger = verguetung.tarifvertrag === "Sonstiger Tarifvertrag" || verguetung.tarifvertrag === "Haustarifvertrag"

  const updateRestjahr = (id: number, updated: AusbildungsEintrag) =>
    setRestjahrEintraege((prev) => prev.map((e) => (e.id === id ? updated : e)))
  const deleteRestjahr = (id: number) =>
    setRestjahrEintraege((prev) => prev.filter((e) => e.id !== id))

  const update2027 = (id: number, updated: AusbildungsEintrag) =>
    setEintraege2027((prev) => prev.map((e) => (e.id === id ? updated : e)))
  const delete2027 = (id: number) =>
    setEintraege2027((prev) => prev.filter((e) => e.id !== id))

  const setV = (field: keyof VerguetungData, value: unknown) =>
    setVerguetung((prev) => ({ ...prev, [field]: value }))

  const getStepIndex = (name: string) => steps.indexOf(name)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Prognosemeldungen 2027</h1>
        <p className="text-muted-foreground text-sm">
          Auszubildenden-Prognosemeldung für PFAU.NRW vorbereiten
        </p>
      </div>

      {/* Fristhinweis */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">Frist: 30. Juni 2026</p>
          <p className="text-amber-700">
            Prognosemeldungen 2027 müssen bis 30.06.2026 auf PFAU.NRW eingereicht werden.
            In PFAU.NRW: Pflegefachkraft → Prognosemeldung → Neue Prognosemeldung 2027+
          </p>
        </div>
      </div>

      {/* PFA Erstmals-Hinweis */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-muted-foreground mb-6">
        <Info className="w-3 h-3 inline mr-1 text-blue-600" />
        <strong className="text-foreground">Neu 2027:</strong> Erstmalig auch Prognosemeldung für Auszubildende zur Pflegefachassistenz (PFA) möglich.
        Finanzierung über Ausgleichsfonds nur für Ausbildungen, die ab 01.01.2027 neu starten.
      </div>

      {/* Step Indicator */}
      {meldungstyp && (
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i === step
                    ? "bg-emerald-600 text-white"
                    : i < step
                    ? "bg-emerald-500/20 text-emerald-700 cursor-pointer hover:bg-emerald-500/30"
                    : "bg-muted text-muted-foreground cursor-default"
                )}
              >
                {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                {s}
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Meldungstyp */}
      {step === 0 && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-4">Meldungstyp wählen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["pfk", "pfa"] as const).map((typ) => (
              <button
                key={typ}
                onClick={() => { setMeldungstyp(typ); setStep(1) }}
                className={cn(
                  "border-2 rounded-lg p-4 text-left transition-all",
                  meldungstyp === typ
                    ? "border-emerald-600 bg-emerald-500/5"
                    : "border-border hover:border-emerald-500/50"
                )}
              >
                <div className="font-semibold text-foreground mb-1">
                  {typ === "pfk" ? "Pflegefachkraft (PFK)" : "Pflegefachassistenz (PFA)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {typ === "pfk"
                    ? "3-jährige Ausbildung nach Pflegeberufegesetz. Inkl. Restjahr 2026 und Vergütungsangaben."
                    : "12–18 Monate Ausbildung. Erstmalig für Ausbildungsbeginn ab 01.01.2027. Keine Restjahr 2026 und keine Vergütungsangaben erforderlich."}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Prognose Restjahr 2026 (nur PFK) */}
      {meldungstyp === "pfk" && currentStepName === "Restjahr 2026" && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-2">Prognose Restjahr 2026</h2>
          <div className="bg-muted/30 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground mb-4">
            <strong className="text-foreground">Zeitraum: 01.11.2026 – 31.12.2026</strong>
            <br />
            Diese Angaben haben <strong>keine Auswirkung</strong> auf das festgesetzte Ausbildungsbudget für 2026.
            Auszubildende, die ihre Ausbildung bis einschließlich 31.10.2026 begonnen haben,
            werden automatisch über bestehende Ist-Meldungen berücksichtigt.
          </div>

          <p className="text-sm font-medium text-foreground mb-3">
            Erwarten Sie Auszubildende zur Pflegefachkraft, die ihre Ausbildung zwischen dem
            01.11.2026 und 31.12.2026 (voraussichtlich) beginnen werden? <span className="text-destructive">*</span>
          </p>
          <div className="flex gap-6 mb-4">
            {(["ja", "nein"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hatRestjahr"
                  checked={hatRestjahr === v}
                  onChange={() => setHatRestjahr(v)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-foreground">{v === "ja" ? "Ja" : "Nein"}</span>
              </label>
            ))}
          </div>

          {hatRestjahr === "ja" && (
            <div className="space-y-3">
              {restjahrEintraege.map((e, i) => (
                <EintragCard
                  key={e.id}
                  eintrag={e}
                  onUpdate={(upd) => updateRestjahr(e.id, upd)}
                  onDelete={() => deleteRestjahr(e.id)}
                  isPFA={false}
                  label={`Auszubildende ${i + 1}`}
                />
              ))}
              <button
                onClick={() => setRestjahrEintraege((prev) => [...prev, newEintrag()])}
                className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                Prognostizierte Auszubildende zur Pflegefachkraft hinzufügen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Prognose 2027 */}
      {currentStepName === "Prognose 2027" && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-2">Prognose 2027</h2>
          <div className="bg-muted/30 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground mb-4">
            <strong className="text-foreground">Zeitraum: 01.01.2027 – 31.12.2027</strong>
            {isPFA && (
              <span className="block mt-1 text-amber-700">
                PFA: Finanzierung über Ausgleichsfonds nur für Ausbildungen, die ab 01.01.2027 neu starten.
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-foreground mb-3">
            Beabsichtigen Sie im Jahr 2027 mindestens einen neuen Ausbildungsvertrag nach dem PflBG zu schließen? <span className="text-destructive">*</span>
          </p>
          <div className="flex gap-6 mb-4">
            {(["ja", "nein"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hat2027"
                  checked={hat2027 === v}
                  onChange={() => setHat2027(v)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-foreground">{v === "ja" ? "Ja" : "Nein"}</span>
              </label>
            ))}
          </div>

          {hat2027 === "ja" && (
            <div className="space-y-3">
              {eintraege2027.map((e, i) => (
                <EintragCard
                  key={e.id}
                  eintrag={e}
                  onUpdate={(upd) => update2027(e.id, upd)}
                  onDelete={() => delete2027(e.id)}
                  isPFA={isPFA}
                  label={`Auszubildende ${i + 1}`}
                />
              ))}
              <button
                onClick={() => setEintraege2027((prev) => [...prev, newEintrag()])}
                className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                {isPFA
                  ? "Prognostizierte Auszubildende zur Pflegefachassistenz hinzufügen"
                  : "Prognostizierte Auszubildende zur Pflegefachkraft hinzufügen"}
              </button>
            </div>
          )}
          {hat2027 === "nein" && (
            <div className="bg-muted/20 rounded-md px-3 py-2 text-sm text-muted-foreground">
              Soweit Sie voraussichtlich keine Ausbildung in 2027 planen, erstellen Sie trotzdem die
              Meldung und verneinen eine Ausbildungsabsicht. Bitte möglichst genaue Prognosen abgeben.
            </div>
          )}
        </div>
      )}

      {/* Step: Vergütung 2027 (nur PFK) */}
      {meldungstyp === "pfk" && currentStepName === "Vergütung 2027" && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-2">Vergütung in 2027</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Angaben bilden die maximal mögliche Auszahlung der Vergütungsbestandteile der Ausgleichszuweisungen ab.
            Nach Festsetzung des Finanzierungsbedarfs ist eine Änderung nicht mehr möglich.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tarifvertrag <span className="text-destructive">*</span>
              </label>
              <select
                value={verguetung.tarifvertrag}
                onChange={(e) => setV("tarifvertrag", e.target.value)}
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
                    value={verguetung.tarifvertragName}
                    onChange={(e) => setV("tarifvertragName", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Upload Tarifvertrag (inkl. Ausbildungsvergütung) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setV("tarifvertragFile", e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-500/10 file:text-emerald-700 hover:file:bg-emerald-500/20 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bruttogehalt {j}. Ausbildungsjahr <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={j === 1 ? verguetung.bruttoJ1 : j === 2 ? verguetung.bruttoJ2 : verguetung.bruttoJ3}
                      onChange={(e) =>
                        setV(j === 1 ? "bruttoJ1" : j === 2 ? "bruttoJ2" : "bruttoJ3", e.target.value)
                      }
                      className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">monatlich</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monatliche Sonderzahlungen <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={verguetung.sonderzahlungen}
                    onChange={(e) => setV("sonderzahlungen", e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Urlaubs-/Weihnachtsgeld, Zuschläge, VL, AG-Zuschüsse etc.</p>
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
                    value={verguetung.agBeitrag}
                    onChange={(e) => setV("agBeitrag", e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Einheitlich 24 % (RV + KV + PV + AV + KV-Zusatz)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Durchschnittliche Jahres-Bruttopersonalkosten vollausgebildete PFK (Vorjahr 2025) <span className="text-destructive">*</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={verguetung.jahresPersonalkosten}
                  onChange={(e) => setV("jahresPersonalkosten", e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              </div>
              <div className="bg-muted/20 rounded-md px-3 py-2 text-xs text-muted-foreground mt-2 max-w-2xl">
                <strong className="text-foreground">Berechnung:</strong> Summe aller Bruttopersonalkosten (AG-Kosten inkl. AG-Beiträge) der vollausgebildeten PFK
                ÷ Summe der Stellenanteile dieser PFK. Kontengruppen 60–64 nach KHBV/PBV, bereinigt um Auszubildende und
                Hilfskräfte. Ambulante Einrichtungen: 14 Auszubildende entsprechen 1 vollausgebildeten PFK.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Übersicht */}
      {currentStepName === "Übersicht" && (
        <div className="bg-card border border-border rounded-lg p-5 mb-5">
          <h2 className="font-semibold text-foreground mb-4">Übersicht – Alle Angaben</h2>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Meldungstyp:</span>
              <span className="font-medium text-foreground">
                {meldungstyp === "pfk" ? "Pflegefachkraft (PFK)" : "Pflegefachassistenz (PFA)"}
              </span>
            </div>

            {meldungstyp === "pfk" && (
              <div>
                <p className="font-medium text-foreground mb-2">Prognose Restjahr 2026 (01.11.–31.12.2026):</p>
                {hatRestjahr === "nein" && <p className="text-muted-foreground">Keine Auszubildenden erwartet.</p>}
                {hatRestjahr === "ja" && restjahrEintraege.length === 0 && <p className="text-muted-foreground">Ja – keine Einträge erfasst.</p>}
                {hatRestjahr === "ja" && restjahrEintraege.map((e, i) => (
                  <div key={e.id} className="bg-muted/20 rounded-md px-3 py-2 mb-2">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Eintrag {i + 1}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-muted-foreground">Beginn:</span><span>{e.ausbildungsbeginn || "–"}</span>
                      <span className="text-muted-foreground">Umfang:</span><span>{e.ausbildungsumfang}{e.teilzeitProzent ? ` (${e.teilzeitProzent}%)` : ""}</span>
                      <span className="text-muted-foreground">Anzahl:</span><span>{e.anzahl || "–"}</span>
                      <span className="text-muted-foreground">Begründung:</span><span>{e.begruendung === "Sonstiges" ? e.begruendungSonstiges : e.begruendung || "–"}</span>
                    </div>
                  </div>
                ))}
                {hatRestjahr === "" && <p className="text-muted-foreground italic">Keine Angabe gemacht.</p>}
              </div>
            )}

            <div>
              <p className="font-medium text-foreground mb-2">Prognose 2027 (01.01.–31.12.2027):</p>
              {hat2027 === "nein" && <p className="text-muted-foreground">Kein neuer Ausbildungsvertrag beabsichtigt.</p>}
              {hat2027 === "ja" && eintraege2027.length === 0 && <p className="text-muted-foreground">Ja – keine Einträge erfasst.</p>}
              {hat2027 === "ja" && eintraege2027.map((e, i) => (
                <div key={e.id} className="bg-muted/20 rounded-md px-3 py-2 mb-2">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Eintrag {i + 1}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Beginn:</span><span>{e.ausbildungsbeginn || "–"}</span>
                    <span className="text-muted-foreground">Umfang:</span><span>{e.ausbildungsumfang}{e.teilzeitProzent ? ` (${e.teilzeitProzent}%)` : ""}</span>
                    <span className="text-muted-foreground">Anzahl:</span><span>{e.anzahl || "–"}</span>
                    <span className="text-muted-foreground">Begründung:</span><span>{e.begruendung === "Sonstiges" ? e.begruendungSonstiges : e.begruendung || "–"}</span>
                  </div>
                </div>
              ))}
              {hat2027 === "" && <p className="text-muted-foreground italic">Keine Angabe gemacht.</p>}
            </div>

            {meldungstyp === "pfk" && (
              <div>
                <p className="font-medium text-foreground mb-2">Vergütung 2027:</p>
                <div className="bg-muted/20 rounded-md px-3 py-2">
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Tarifvertrag:</span><span>{verguetung.tarifvertrag || "–"}</span>
                    {isSonstiger && <><span className="text-muted-foreground">Name:</span><span>{verguetung.tarifvertragName || "–"}</span></>}
                    <span className="text-muted-foreground">Bruttogehalt J1:</span><span>{verguetung.bruttoJ1 ? `${verguetung.bruttoJ1} €` : "–"}</span>
                    <span className="text-muted-foreground">Bruttogehalt J2:</span><span>{verguetung.bruttoJ2 ? `${verguetung.bruttoJ2} €` : "–"}</span>
                    <span className="text-muted-foreground">Bruttogehalt J3:</span><span>{verguetung.bruttoJ3 ? `${verguetung.bruttoJ3} €` : "–"}</span>
                    <span className="text-muted-foreground">Sonderzahlungen:</span><span>{verguetung.sonderzahlungen ? `${verguetung.sonderzahlungen} %` : "–"}</span>
                    <span className="text-muted-foreground">AG-Beitrag SV:</span><span>{verguetung.agBeitrag ? `${verguetung.agBeitrag} %` : "–"}</span>
                    <span className="text-muted-foreground">Jahres-Personalkosten PFK:</span><span>{verguetung.jahresPersonalkosten ? `${verguetung.jahresPersonalkosten} €` : "–"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1 text-emerald-600" />
              Diese Werte in PFAU.NRW eingeben:{" "}
              <strong className="text-foreground">
                {meldungstyp === "pfk" ? "Pflegefachkraft" : "Pflegefachassistenz"} → Prognosemeldung → Neue Prognosemeldung 2027+
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {meldungstyp && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={step === 0 ? () => setMeldungstyp("") : goBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Neu starten" : "Zurück"}
          </Button>

          {step < totalSteps - 1 && (
            <Button
              onClick={goNext}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
