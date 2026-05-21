"use client"

import React, { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Key, ChevronDown, Loader2, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { listEmployees, type Employee } from "@/lib/employee-service"
import type { DocumentType } from "@/lib/types"
import {
  generateAenderungsvereinbarung,
  generateKuendigung,
  generateAbmahnung,
  generateArbeitszeugnis,
  generateSonstigesDokument,
} from "@/lib/docx-generator"

interface Message {
  role: "user" | "assistant"
  content: string
  action?: ParsedAction
  actionState?: "idle" | "loading" | "done" | "error"
}

interface ParsedAction {
  type: DocumentType
  generatorData: Record<string, string>
}

interface AiAssistantProps {
  onOpenDocument?: (type: DocumentType, data: Record<string, string>) => void
}

const API_KEY_STORAGE = "morox-anthropic-key"
const ACTION_RE = /__ACTION__([\s\S]*?)__END__/

const BASE_SYSTEM_PROMPT = `Du bist Roxi, die KI-Assistentin der Pflegedienst MORO GmbH. Du hilfst beim Erstellen von HR-Dokumenten.
Dein Name ist Roxi. Stelle dich beim ersten Kontakt kurz als Roxi vor.

Du hilfst beim Erstellen und Verwalten von HR-Dokumenten:
- arbeitsvertrag (befristet, unbefristet, geringfügig)
- aushilfsvertrag
- ausbildungsvertrag
- aenderungsvereinbarung (Vergütung, Arbeitszeit, Urlaubstage, Tage/Woche)
- arbeitszeugnis / zwischenzeugnis (gut/mittel/schlecht)
- abmahnung
- kuendigung (ordentlich oder außerordentlich)

Antworte immer auf Deutsch. Sei präzise, freundlich und professionell.
Keine Markdown-Sonderzeichen wie **, ##, --- oder - [ ]. Nutze stattdessen Emojis zur Strukturierung.
Bei rechtlichen Fragen weise kurz darauf hin, dass du keine Rechtsberatung erteilst.

PFLICHTABLAUF VOR JEDEM DOKUMENT — halte dich immer genau daran:

Schritt 1 — Informationen sammeln:
Stelle fest, welche Pflichtfelder für den Dokumenttyp noch fehlen. Frage nach ALLEN fehlenden Feldern auf einmal (nicht einzeln nacheinander).

Schritt 2 — Zusammenfassung zur Bestätigung:
Sobald du alle nötigen Informationen hast, fasse sie IMMER in einer übersichtlichen Liste zusammen und frage explizit: "Soll ich das Dokument so erstellen?" oder "Ist alles korrekt?". Warte auf eine ausdrückliche Bestätigung ("ja", "stimmt", "passt", "ok", o.ä.).

Schritt 3 — Dokument erstellen:
Nach ausdrücklicher Bestätigung ("ja", "jawohl", "stimmt", "passt", "ok", "mach das", "erstell es" o.ä.) schreibe eine kurze Bestätigungsnachricht (1 Satz) und hänge UNMITTELBAR DANACH den ACTION-Block an. Der ACTION-Block MUSS in dieser Antwort enthalten sein — kein weiteres Nachfragen, keine weitere Zusammenfassung.

Beispiel-Antwort nach Bestätigung:
"Perfekt, ich erstelle das Dokument jetzt! ✅
__ACTION__{"type":"sonstige","gender":"Frau","vorname":"Maria","nachname":"Muster","street":"Musterstr. 1","city":"44388 Dortmund","titel":"Muster-Titel","text":"Muster-Text"}__END__"

WICHTIG: Erstelle NIEMALS einen ACTION-Block ohne vorherige Bestätigung. Aber sobald Bestätigung kommt — ACTION-Block MUSS in der gleichen Antwort erscheinen, ohne Ausnahme.

FORMAT je Dokumenttyp:

ÄNDERUNGSVEREINBARUNG:
__ACTION__{"type":"aenderungsvereinbarung","mitarbeiter":"VORNAME NACHNAME","vertragsart":"unbefristeten","vertragsdatum":"TT.MM.JJJJ","aenderungsdatum":"TT.MM.JJJJ","aenderungen":"TEXT"}__END__
vertragsart = "unbefristeten" oder "befristeten". vertragsdatum = ursprünglicher Vertragsabschluss (Fallback: eintrittsdatum aus Mitarbeiterliste).
aenderungen = exakt eine oder mehrere der folgenden Zeilen (je nach was geändert wird), mit \\n zwischen mehreren:
Vergütung:    "• Der Arbeitnehmer erhält eine stündliche Bruttovergütung von XX,XX EUR. Die Vergütung ist jeweils am 1. des nächsten Monats fällig. (Änderung zu § 5 des Arbeitsvertrags)"
Tage/Woche:   "• Die Arbeitswoche ist eine X-Tage-Woche. (Änderung zu § 6 Abs. 2 des Arbeitsvertrags)"
Stunden:      "• Die regelmäßige monatliche Arbeitszeit beträgt mindestens X Stunden. Der Arbeitnehmer verpflichtet sich, auf Abruf des Arbeitgebers bis zu X Stunden monatlich zu arbeiten. (Änderung zu § 6 Abs. 2 des Arbeitsvertrags)"
Urlaub:       "• Der Arbeitnehmer hat Anspruch auf X Arbeitstage Erholungsurlaub pro Kalenderjahr. Der Urlaubsanspruch richtet sich nach der Anzahl der regelmäßigen Arbeitstage pro Woche. (Änderung zu § 7 des Arbeitsvertrags)"
Ersetze X / XX,XX mit den genannten Werten. Kein "ab dem [Datum]" im Text — das Datum steht separat im aenderungsdatum-Feld.

KÜNDIGUNG:
__ACTION__{"type":"kuendigung","mitarbeiter":"VORNAME NACHNAME","kuendigungsart":"ordentlich","kuendigungsdatum":"TT.MM.JJJJ","letzterArbeitstag":"TT.MM.JJJJ","reason":""}__END__
kuendigungsart = "ordentlich" oder "ausserordentlich". reason leer lassen bei ordentlicher Kündigung.

ABMAHNUNG:
__ACTION__{"type":"abmahnung","mitarbeiter":"VORNAME NACHNAME","beschreibung":"TEXT","konsequenz":"Im Wiederholungsfall behalten wir uns die Kündigung des Arbeitsverhältnisses vor."}__END__

ARBEITSZEUGNIS / ZWISCHENZEUGNIS:
__ACTION__{"type":"arbeitszeugnis","mitarbeiter":"VORNAME NACHNAME","bewertung":"gut","begin":"TT.MM.JJJJ","ende":"TT.MM.JJJJ","prof":"Position","cofbirth":"Geburtsort","beendet":"ja"}__END__
bewertung = "gut", "mittel" oder "schlecht". beendet = "ja" nur wenn Austrittsdatum bereits in der Vergangenheit liegt, sonst "nein".

SONSTIGES DOKUMENT (für alle anderen Anschreiben, Briefe, Mitteilungen — z.B. Kündigung Pflegevertrag, Einladungen, Mitteilungen, Bescheinigungen):
__ACTION__{"type":"sonstige","gender":"Frau","vorname":"VORNAME","nachname":"NACHNAME","street":"Straße Nr","city":"PLZ Ort","titel":"Betreff","text":"Nur Fließtext — OHNE Anrede, OHNE Grußformel"}__END__

REGELN für sonstige:
- gender = "Frau" oder "Herr". Ableitung: "Patientin/Kundin/Mitarbeiterin/sie/ihr" → "Frau"; "Patient/Kunde/Mitarbeiter/er/ihm" → "Herr". Wenn der Name ohne Anrede genannt wird, nutze den Kontext aus dem gesamten Gespräch. NIEMALS vom Namen auf das Geschlecht schließen — nur aus expliziten Angaben oder Kontext-Wörtern wie "Patientin".
- vorname und nachname getrennt angeben. Wenn der Nutzer "Frau/Herr VORNAME NACHNAME" sagt → gender extrahieren, vorname/nachname trennen. Bei mehr als 2 Wörtern (ohne Anrede) EINMAL fragen welcher der Nachname ist.
- street und city IMMER erfragen wenn nicht angegeben — werden für die Anschrift auf dem Brief benötigt.
- Datum (date) NIEMALS fragen — wird automatisch auf das heutige Datum gesetzt.
- Unterzeichner NIEMALS fragen — steht bereits in der Vorlage.
- titel = vollständiger, ausformulierter Betreff, z.B. "Kündigung des bestehenden Pflegevertrags" statt nur "Kündigung Pflegevertrag".
- text = professioneller Fließtext auf Deutsch, KEIN "Sehr geehrte/r...", KEIN "Mit freundlichen Grüßen", KEINE Grußformeln.
- Schreibe natürliches, warmes aber professionelles Deutsch. Halte den Text KURZ — 2–4 Sätze, keine Füllsätze wie "Wir werden alles in unserer Kraft Stehende tun" oder "für einen reibungslosen Übergang". Beispiel Stil: "wir bedauern Ihnen mitteilen zu müssen, dass wir den bestehenden Pflegevertrag zwischen Ihnen und uns, der Pflegedienst MORO GmbH, zum [Datum] aufgrund von [Grund] kündigen müssen. Wir entschuldigen uns für die Unannehmlichkeiten."
- Für sonstige Dokumente: Schritt-2-Bestätigung kann übersprungen werden wenn alle Infos vorhanden — direkt ACTION erstellen.
- Nach jeder Bestätigung durch den Nutzer: sofort ACTION-Block ausgeben, NIEMALS nochmals fragen oder nur "Ich erstelle es jetzt" schreiben ohne den Block.
- Diese Option nutzen wenn kein spezieller HR-Dokumenttyp passt. Bei Anfragen ohne passende Vorlage kurz erwähnen ("Dafür habe ich keine spezielle Vorlage, ich erstelle ein allgemeines Anschreiben.") und direkt sonstige nutzen.`

const fmtDE = (d: string): string => {
  if (!d) return ""
  if (d.includes(".")) return d
  const p = d.split("-")
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d
}

const today = () => new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

function parseAction(raw: string, employees: Employee[]): {
  text: string
  action?: ParsedAction
} {
  const match = raw.match(ACTION_RE)
  if (!match) return { text: raw.trim() }

  const text = raw.replace(ACTION_RE, "").trim()
  try {
    const json = JSON.parse(match[1].trim())
    const { type, mitarbeiter, ...rest } = json

    const fullName = (mitarbeiter as string || "").trim()
    const emp = fullName ? employees.find(
      (e) => `${e.vorname} ${e.nachname}`.toLowerCase() === fullName.toLowerCase()
    ) : undefined
    const vorname = emp ? emp.vorname : (fullName.split(" ")[0] || "")
    const nachname = emp ? emp.nachname : fullName.split(" ").slice(1).join(" ")

    const gender = emp?.geschlecht === "weiblich" ? "Frau" : "Herr"

    const base: Record<string, string> = emp ? {
      gender,
      vorname: emp.vorname,
      nachname: emp.nachname,
      street: emp.strasse,
      city: `${emp.plz} ${emp.ort}`.trim(),
      bday: fmtDE(emp.geburtsdatum),
      date: today(),
    } : { gender, vorname, nachname, date: today(), street: "", city: "", bday: "" }

    let generatorData: Record<string, string> = { ...base }

    if (type === "aenderungsvereinbarung") {
      generatorData = {
        ...base,
        vertragsart: rest.vertragsart || "unbefristeten",
        vertragsdatum: fmtDE(rest.vertragsdatum || emp?.eintrittsdatum || ""),
        aenderungsdatum: fmtDE(rest.aenderungsdatum || ""),
        aenderungen: rest.aenderungen || "",
      }
    } else if (type === "kuendigung") {
      generatorData = {
        ...base,
        type: rest.kuendigungsart === "ausserordentlich" ? "außerordentlich" : "ordentlich",
        kdate: fmtDE(rest.kuendigungsdatum || ""),
        last: fmtDE(rest.letzterArbeitstag || ""),
        reason: rest.reason || "",
      }
    } else if (type === "abmahnung") {
      generatorData = {
        ...base,
        beschreibung: rest.beschreibung || "",
        konsequenz: rest.konsequenz || "Im Wiederholungsfall behalten wir uns die Kündigung des Arbeitsverhältnisses vor.",
      }
    } else if (type === "arbeitszeugnis" || type === "zwischenzeugnis") {
      generatorData = {
        ...base,
        bewertung: rest.bewertung || "gut",
        begin: fmtDE(rest.begin || emp?.eintrittsdatum || ""),
        ende: fmtDE(rest.ende || ""),
        prof: rest.prof || emp?.position || "",
        cofbirth: rest.cofbirth || "",
        beendet: rest.beendet || "nein",
      }
    }

    if (type === "sonstige") {
      // New format: explicit gender/vorname/nachname/street/city fields
      // Fall back to legacy mitarbeiter parsing if new fields not present
      let sGender = rest.gender || ""
      let sVorname = rest.vorname || ""
      let sNachname = rest.nachname || ""
      let sStreet = rest.street || (emp ? emp.strasse || "" : "")
      let sCity = rest.city || (emp ? `${emp.plz || ""} ${emp.ort || ""}`.trim() : "")

      // Legacy fallback: mitarbeiter field
      if (!sVorname && !sNachname && mitarbeiter) {
        const parts = (mitarbeiter as string).trim().split(" ")
        if (parts[0] === "Frau" || parts[0] === "Herr") {
          sGender = parts[0]
          sVorname = parts[1] || ""
          sNachname = parts.slice(2).join(" ")
        } else {
          sVorname = parts[0] || ""
          sNachname = parts.slice(1).join(" ")
        }
      }

      // If employee found in list, prefer their data
      if (emp) {
        sGender = emp.geschlecht === "weiblich" ? "Frau" : "Herr"
        sVorname = emp.vorname
        sNachname = emp.nachname
        sStreet = emp.strasse || ""
        sCity = `${emp.plz || ""} ${emp.ort || ""}`.trim()
      }

      generatorData = {
        gender: sGender,
        vorname: sVorname,
        nachname: sNachname,
        street: sStreet,
        city: sCity,
        date: today(),
        titel: rest.titel || "",
        text: rest.text || "",
      }
    }

    return { text, action: { type: type as DocumentType, generatorData } }
  } catch {
    return { text }
  }
}

async function executeAction(action: ParsedAction): Promise<void> {
  const d = action.generatorData as any
  switch (action.type) {
    case "aenderungsvereinbarung":
      await generateAenderungsvereinbarung({
        gender: d.gender,
        vorname: d.vorname,
        nachname: d.nachname,
        vertragsart: d.vertragsart,
        vertragsdatum: d.vertragsdatum,
        aenderungsdatum: d.aenderungsdatum,
        aenderungen: d.aenderungen,
      })
      break
    case "kuendigung":
      await generateKuendigung({
        gender: d.gender,
        vorname: d.vorname,
        nachname: d.nachname,
        street: d.street,
        city: d.city,
        date: d.date,
        kdate: d.kdate,
        last: d.last,
        type: d.type,
        reason: d.reason,
      })
      break
    case "abmahnung":
      await generateAbmahnung({
        gender: d.gender,
        vorname: d.vorname,
        nachname: d.nachname,
        street: d.street,
        city: d.city,
        date: d.date,
        beschreibung: d.beschreibung,
        konsequenz: d.konsequenz,
      })
      break
    case "arbeitszeugnis":
    case "zwischenzeugnis":
      await generateArbeitszeugnis({
        gender: d.gender,
        vorname: d.vorname,
        nachname: d.nachname,
        street: d.street,
        city: d.city,
        date: d.date,
        bday: d.bday,
        cofbirth: d.cofbirth,
        begin: d.begin,
        prof: d.prof,
        ende: d.ende,
        bewertung: d.bewertung,
        beendet: d.beendet,
      })
      break
    case "sonstige":
      await generateSonstigesDokument({
        gender: d.gender,
        vorname: d.vorname,
        nachname: d.nachname,
        street: d.street,
        city: d.city,
        date: d.date,
        titel: d.titel,
        text: d.text,
      })
      break
    default:
      throw new Error(`Dokumenttyp "${action.type}" wird noch nicht direkt unterstützt.`)
  }
}

function MessageBubble({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1" />
        const clean = line
          .replace(/^#{1,3}\s*/, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/^[-*]\s+\[[ x]\]\s*/, "")
          .replace(/^[-*]\s+/, "• ")
          .replace(/^---+$/, "")
        if (!clean.trim()) return null
        return <p key={i} className="leading-relaxed">{clean}</p>
      })}
    </div>
  )
}

export function AiAssistant({ onOpenDocument }: AiAssistantProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE)
    if (stored) setApiKey(stored)
    else setShowKeyInput(true)
    listEmployees().then(setEmployees).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const saveKey = () => {
    const trimmed = keyDraft.trim()
    if (!trimmed) return
    localStorage.setItem(API_KEY_STORAGE, trimmed)
    setApiKey(trimmed)
    setShowKeyInput(false)
    setKeyDraft("")
  }

  const handleGenerate = async (msgIndex: number) => {
    const msg = messages[msgIndex]
    if (!msg?.action) return

    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, actionState: "loading" } : m))
    )

    try {
      await executeAction(msg.action)
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, actionState: "done" } : m))
      )
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, actionState: "error" } : m))
      )
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading || !apiKey) return

    const userMsg: Message = { role: "user", content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLoading(true)

    // Detect confirmation — inject a hard reminder into the API messages so the model outputs the ACTION block
    const isConfirmation = /^(ja|jawohl|stimmt|passt|ok|okay|genau|richtig|korrekt|mach das|erstell|bitte|super|gut|perfekt|yes|jep|jo|sicher|natürlich|los|weiter|mach es|mach|done|klar|doch)[\s!.]*$/i.test(text)

    try {
      let systemPrompt = BASE_SYSTEM_PROMPT
      if (employees.length > 0) {
        const employeeList = employees
          .map((e) => `- ${e.vorname} ${e.nachname} | ${e.geschlecht || "—"} | Geb. ${e.geburtsdatum || "—"} | ${e.position || "—"} | Eintr. ${e.eintrittsdatum || "—"} | ${e.strasse || ""}, ${e.plz || ""} ${e.ort || ""}`.trim())
          .join("\n")
        systemPrompt += `\n\nAktuelle Mitarbeiterliste:\n${employeeList}`
      }

      // When user confirms, force the ACTION block by replacing last user message content for the API call
      const apiMessages = next.map((m, i) => {
        if (isConfirmation && i === next.length - 1) {
          return {
            role: m.role as "user" | "assistant",
            content: m.content + "\n\n[WICHTIG: Gib jetzt SOFORT den vollständigen __ACTION__....__END__ Block aus. Kein weiteres Nachfragen. Kein weiterer Text außer einem kurzen Satz davor.]",
          }
        }
        return { role: m.role as "user" | "assistant", content: m.content }
      })

      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: apiMessages,
      })

      const content = response.content[0]
      if (content.type !== "text") throw new Error("Unerwarteter Antworttyp")

      console.log("=== ROXI RAW RESPONSE ===")
      console.log(content.text)
      console.log("=== ACTION REGEX TEST ===")
      console.log("Match:", ACTION_RE.test(content.text))
      console.log("=========================")

      const { text: cleanText, action } = parseAction(content.text, employees)
      console.log("Parsed action:", action)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: cleanText, action, actionState: action ? "idle" : undefined },
      ])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Fehler: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        style={{ width: 52, height: 52 }}
        title="KI-Assistent"
      >
        {open ? <ChevronDown className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[500px] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(620px, calc(100vh - 120px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">Roxi</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyInput((v) => !v)}
                className="p-1.5 rounded hover:bg-white/20 transition-colors"
                title="API-Schlüssel"
              >
                <Key className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showKeyInput && (
            <div className="p-4 border-b bg-muted/30 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Anthropic API-Schlüssel
              </Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  placeholder="sk-ant-..."
                  className="text-sm h-8"
                />
                <Button size="sm" className="h-8 px-3" onClick={saveKey}>OK</Button>
              </div>
              {apiKey && <p className="text-xs text-green-600">Schlüssel gespeichert.</p>}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 space-y-1">
                <Bot className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-medium">Hallo, ich bin Roxi!</p>
                <p className="text-xs">Wie kann ich dir heute helfen?</p>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant"
                      ? <MessageBubble content={msg.content} />
                      : <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>

                  {msg.action && (
                    <div className="mt-2">
                      {msg.actionState === "done" ? (
                        <p className="text-xs text-green-600 font-medium">✅ Dokument erstellt und gespeichert</p>
                      ) : msg.actionState === "error" ? (
                        <p className="text-xs text-destructive">Fehler beim Erstellen. Formular manuell öffnen?</p>
                      ) : (
                        <button
                          onClick={() => handleGenerate(i)}
                          disabled={msg.actionState === "loading"}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          {msg.actionState === "loading"
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Wird erstellt...</>
                            : <><FileDown className="w-3.5 h-3.5" /> Dokument erstellen</>
                          }
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={apiKey ? "Nachricht... (Enter zum Senden)" : "Bitte zuerst API-Schlüssel eingeben"}
              disabled={!apiKey || loading}
              rows={1}
              className="resize-none text-sm min-h-[36px] max-h-[120px]"
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || !apiKey || loading}
              className="h-9 w-9 p-0 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
