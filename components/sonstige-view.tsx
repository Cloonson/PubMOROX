"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, Loader2, Send, Sparkles, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listEmployees, type Employee } from "@/lib/employee-service"
import { generateSonstigesDokument } from "@/lib/docx-generator"
import { toast } from "sonner"

const API_KEY_STORAGE = "morox-anthropic-key"

const todayDE = () =>
  new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

interface RoxiMsg {
  role: "user" | "assistant"
  content: string
}

export function SonstigeView({ onBack }: { onBack: () => void }) {
  const [gender, setGender] = useState("")
  const [vorname, setVorname] = useState("")
  const [nachname, setNachname] = useState("")
  const [strasse, setStrasse] = useState("")
  const [plz, setPlz] = useState("")
  const [ort, setOrt] = useState("")
  const [titel, setTitel] = useState("")
  const [text, setText] = useState("")
  const [generating, setGenerating] = useState(false)

  const [showPicker, setShowPicker] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState("")

  const [showRoxi, setShowRoxi] = useState(false)
  const [roxiMsgs, setRoxiMsgs] = useState<RoxiMsg[]>([])
  const [roxiInput, setRoxiInput] = useState("")
  const [roxiLoading, setRoxiLoading] = useState(false)
  const roxiBottomRef = useRef<HTMLDivElement>(null)

  const openPicker = async () => {
    const list = await listEmployees()
    setEmployees(list.filter(e => !e.archiviert))
    setSearch("")
    setShowPicker(true)
  }

  const selectEmployee = (emp: Employee) => {
    setGender(emp.geschlecht === "weiblich" ? "Frau" : "Herr")
    setVorname(emp.vorname)
    setNachname(emp.nachname)
    setStrasse(emp.strasse || "")
    setPlz(emp.plz || "")
    setOrt(emp.ort || "")
    setShowPicker(false)
  }

  const filtered = employees.filter(e =>
    `${e.vorname} ${e.nachname}`.toLowerCase().includes(search.toLowerCase())
  )

  const sendRoxi = async () => {
    const msg = roxiInput.trim()
    if (!msg || roxiLoading) return
    const apiKey = localStorage.getItem(API_KEY_STORAGE)
    if (!apiKey) {
      toast.error("Kein API-Schlüssel. Bitte in Roxi-Chat eingeben.")
      return
    }

    const updated: RoxiMsg[] = [...roxiMsgs, { role: "user", content: msg }]
    setRoxiMsgs(updated)
    setRoxiInput("")
    setRoxiLoading(true)

    try {
      const ctx = [
        vorname || nachname ? `Empfänger: ${[gender, vorname, nachname].filter(Boolean).join(" ")}` : "",
        titel ? `Aktueller Betreff: ${titel}` : "",
        text ? `Aktueller Text: ${text}` : "",
      ].filter(Boolean).join("\n")

      const system = `Du bist Roxi, KI-Assistentin der Pflegedienst MORO GmbH.
Du hilfst gerade, den Text für ein sonstiges Anschreiben zu verfassen.

WICHTIG:
- Schreibe NUR den Haupttext. KEINE Anrede ("Sehr geehrte/r...") und KEIN "Mit freundlichen Grüßen" — beide sind bereits in der Vorlage.
- Wenn du bereit bist Text und/oder Betreff zu liefern, hänge am Ende deiner Antwort folgende Blöcke an:
  __TITEL__Betreff hier__ENDTITEL__
  __TEXT__Brieftext hier__ENDTEXT__
- Stelle zuerst Fragen, wenn dir wichtige Informationen fehlen.
- Antworte auf Deutsch, professionell. Kein Markdown (**, ##). Emojis zur Strukturierung ok.
${ctx ? `\nKontext:\n${ctx}` : ""}`

      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      const resp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system,
        messages: updated.map(m => ({ role: m.role, content: m.content })),
      })

      const raw = resp.content[0].type === "text" ? resp.content[0].text : ""

      const titelMatch = raw.match(/__TITEL__([\s\S]*?)__ENDTITEL__/)
      const textMatch = raw.match(/__TEXT__([\s\S]*?)__ENDTEXT__/)
      if (titelMatch) setTitel(titelMatch[1].trim())
      if (textMatch) setText(textMatch[1].trim())

      const display = raw
        .replace(/__TITEL__[\s\S]*?__ENDTITEL__/, "")
        .replace(/__TEXT__[\s\S]*?__ENDTEXT__/, "")
        .trim()

      setRoxiMsgs(prev => [
        ...prev,
        { role: "assistant", content: display || (textMatch ? "✅ Text wurde übernommen." : raw) },
      ])
    } catch (e: any) {
      setRoxiMsgs(prev => [...prev, { role: "assistant", content: `Fehler: ${e.message}` }])
    } finally {
      setRoxiLoading(false)
      setTimeout(() => roxiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }

  const handleGenerate = async () => {
    if (!titel.trim()) {
      toast.error("Bitte einen Betreff eingeben.")
      return
    }
    setGenerating(true)
    try {
      await generateSonstigesDokument({
        gender,
        vorname,
        nachname,
        street: strasse,
        city: `${plz} ${ort}`.trim(),
        date: todayDE(),
        titel,
        text,
      })
      toast.success("Dokument erstellt!")
    } catch (e: any) {
      toast.error("Fehler: " + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Sonstiges Dokument</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Freies Anschreiben erstellen</p>
        </div>
      </div>

      {/* Empfänger */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Label className="text-sm font-semibold">Empfänger</Label>
          <Button size="sm" variant="outline" onClick={openPicker} className="h-7 text-xs gap-1">
            <Users className="w-3.5 h-3.5" /> Mitarbeiter wählen
          </Button>
          {(vorname || nachname) && (
            <button
              onClick={() => { setGender(""); setVorname(""); setNachname(""); setStrasse(""); setPlz(""); setOrt("") }}
              className="text-muted-foreground hover:text-foreground"
              title="Leeren"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <Label className="text-xs mb-1 block">Anrede</Label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">—</option>
              <option value="Herr">Herr</option>
              <option value="Frau">Frau</option>
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Vorname</Label>
            <Input value={vorname} onChange={e => setVorname(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Nachname</Label>
            <Input value={nachname} onChange={e => setNachname(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Straße &amp; Hausnr.</Label>
            <Input value={strasse} onChange={e => setStrasse(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">PLZ</Label>
            <Input value={plz} onChange={e => setPlz(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Ort</Label>
            <Input value={ort} onChange={e => setOrt(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
      </div>

      {/* Betreff */}
      <div className="mb-4">
        <Label className="text-sm font-semibold mb-1 block">Betreff / Titel</Label>
        <Input
          value={titel}
          onChange={e => setTitel(e.target.value)}
          placeholder="z. B. Einladung zum Gespräch"
          className="h-9 text-sm"
        />
      </div>

      {/* Text */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-semibold">Text</Label>
          <button
            onClick={() => setShowRoxi(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Mit Roxi schreiben"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mit Roxi schreiben
          </button>
        </div>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Brieftext hier eingeben (ohne Anrede und ohne Grußformel — diese sind bereits in der Vorlage enthalten)"
          rows={8}
          className="text-sm resize-none"
        />
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full">
        {generating
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Wird erstellt...</>
          : "Dokument erstellen"}
      </Button>

      {/* Mitarbeiter-Picker */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mitarbeiter auswählen</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-3 h-9 text-sm"
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">Keine Mitarbeiter gefunden</p>
            )}
            {filtered.map(emp => (
              <button
                key={emp.id}
                onClick={() => selectEmployee(emp)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
              >
                <span className="font-medium">{emp.vorname} {emp.nachname}</span>
                {emp.position && (
                  <span className="text-muted-foreground ml-2 text-xs">{emp.position}</span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Roxi-Popup */}
      {showRoxi && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[420px] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(480px, calc(100vh - 120px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">Roxi — Text schreiben</span>
            </div>
            <button onClick={() => setShowRoxi(false)} className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {roxiMsgs.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-6 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">Beschreibe, was Roxi schreiben soll.</p>
                <p className="text-xs opacity-70">Titel und Text werden automatisch übernommen.</p>
              </div>
            )}
            <div className="space-y-3">
              {roxiMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {m.content.split("\n").map((line, j) =>
                      line.trim()
                        ? <p key={j} className="leading-relaxed">{line}</p>
                        : <div key={j} className="h-1" />
                    )}
                  </div>
                </div>
              ))}
              {roxiLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={roxiBottomRef} />
            </div>
          </div>

          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={roxiInput}
              onChange={e => setRoxiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRoxi() } }}
              placeholder="Was soll Roxi schreiben? (Enter senden)"
              rows={1}
              disabled={roxiLoading}
              className="resize-none text-sm min-h-[36px] max-h-[100px]"
            />
            <Button
              size="sm"
              onClick={sendRoxi}
              disabled={!roxiInput.trim() || roxiLoading}
              className="h-9 w-9 p-0 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
