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

    const fullName = (mitarbeiter as string).trim()
    const emp = employees.find(
      (e) => `${e.vorname} ${e.nachname}`.toLowerCase() === fullName.toLowerCase()
    )
    const vorname = emp ? emp.vorname : fullName.split(" ")[0]
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          employees,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Fehler: ${data.error || res.statusText}` },
        ])
      } else {
        const { text: cleanText, action } = parseAction(data.message, employees)
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanText, action, actionState: action ? "idle" : undefined },
        ])
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Verbindungsfehler: ${err.message}` },
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
              <span className="font-semibold text-sm">MOROX Assistent</span>
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
                <p className="font-medium">Wie kann ich helfen?</p>
                <p className="text-xs">Fragen zu Dokumenten, Formulierungen oder Rechtlichem</p>
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
