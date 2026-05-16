"use client"

import { useState } from "react"
import {
  generateArbeitsvertrag,
  generateAushilfsvertrag,
  generateAusbildungsvertrag,
  generateKuendigung,
  generateArbeitszeugnis,
  generateAenderungsvereinbarung,
  generateAbmahnung,
} from "@/lib/docx-generator"

const PERSON = {
  gender: "Herr",
  vorname: "Max",
  nachname: "Mustermann",
  bday: "01.01.1990",
  street: "Musterstraße 1",
  city: "12345 Musterstadt",
  cofbirth: "Berlin",
}

const DOCS = [
  {
    label: "Arbeitsvertrag (unbefristet)",
    fn: () =>
      generateArbeitsvertrag({
        ...PERSON,
        begin: "01.06.2026",
        prof: "Pflegefachkraft",
        probezeit: "6",
        tagewoche: "5",
        minstunden: "30",
        stundenmax: "40",
        wage: "3.200,00",
        vaca: "28",
        vertragsart: "unbefristet",
      }),
  },
  {
    label: "Arbeitsvertrag (befristet)",
    fn: () =>
      generateArbeitsvertrag({
        ...PERSON,
        begin: "01.06.2026",
        prof: "Pflegefachkraft",
        probezeit: "6",
        tagewoche: "5",
        minstunden: "30",
        stundenmax: "40",
        wage: "3.200,00",
        vaca: "28",
        vertragsart: "befristet",
        ende: "31.05.2027",
      }),
  },
  {
    label: "Aushilfsvertrag (befristet)",
    fn: () =>
      generateAushilfsvertrag(
        {
          ...PERSON,
          begin: "01.06.2026",
          ende: "31.05.2027",
          grenz: "538",
          prof: "Aushilfspflegekraft",
          wage: "13,50",
          vaca: "14",
          befristet: "befristet",
        },
        true
      ),
  },
  {
    label: "Aushilfsvertrag (unbefristet)",
    fn: () =>
      generateAushilfsvertrag(
        {
          ...PERSON,
          begin: "01.06.2026",
          grenz: "538",
          prof: "Aushilfspflegekraft",
          wage: "13,50",
          vaca: "14",
          befristet: "unbefristet",
        },
        false
      ),
  },
  {
    label: "Ausbildungsvertrag (männlich)",
    fn: () =>
      generateAusbildungsvertrag(
        {
          gender: "Herr",
          vorname: "Max",
          nachname: "Mustermann",
          street: "Musterstraße 1",
          city: "12345 Musterstadt",
          bday: "01.01.2005",
          begin: "01.09.2026",
          ende: "31.08.2029",
          first: "900,00",
          second: "950,00",
          third: "1.000,00",
        },
        "männlich"
      ),
  },
  {
    label: "Ausbildungsvertrag (weiblich)",
    fn: () =>
      generateAusbildungsvertrag(
        {
          gender: "Frau",
          vorname: "Maria",
          nachname: "Musterfrau",
          street: "Musterstraße 1",
          city: "12345 Musterstadt",
          bday: "01.01.2005",
          begin: "01.09.2026",
          ende: "31.08.2029",
          first: "900,00",
          second: "950,00",
          third: "1.000,00",
        },
        "weiblich"
      ),
  },
  {
    label: "Kündigung (ordentlich)",
    fn: () =>
      generateKuendigung({
        ...PERSON,
        date: "15.05.2026",
        kdate: "30.06.2026",
        last: "30.06.2026",
        type: "ordentlich",
        reason: "",
      }),
  },
  {
    label: "Arbeitszeugnis (gut, männlich)",
    fn: () =>
      generateArbeitszeugnis({
        ...PERSON,
        date: "15.05.2026",
        begin: "01.01.2023",
        prof: "Pflegefachkraft",
        ende: "30.04.2026",
        bewertung: "gut",
        beendet: "nein",
      }),
  },
  {
    label: "Arbeitszeugnis (sehr gut, weiblich)",
    fn: () =>
      generateArbeitszeugnis({
        gender: "Frau",
        vorname: "Maria",
        nachname: "Musterfrau",
        street: "Musterstraße 1",
        city: "12345 Musterstadt",
        bday: "01.01.1990",
        cofbirth: "Hamburg",
        date: "15.05.2026",
        begin: "01.01.2023",
        prof: "Pflegefachkraft",
        ende: "30.04.2026",
        bewertung: "sehr gut",
        beendet: "ja",
      }),
  },
  {
    label: "Abmahnung",
    fn: () =>
      generateAbmahnung({
        ...PERSON,
        date: "15.05.2026",
        beschreibung:
          "Am 10.05.2026 sind Sie unentschuldigt nicht zur Arbeit erschienen, ohne dies rechtzeitig zu melden.",
        konsequenz:
          "Wir fordern Sie auf, künftig pünktlich und zuverlässig Ihre Arbeitspflichten zu erfüllen. Im Wiederholungsfall behalten wir uns arbeitsrechtliche Konsequenzen bis hin zur Kündigung vor.",
      }),
  },
  {
    label: "Änderungsvereinbarung",
    fn: () =>
      generateAenderungsvereinbarung({
        gender: "Herr",
        vorname: "Max",
        nachname: "Mustermann",
        vertragsart: "unbefristeten",
        vertragsdatum: "01.01.2023",
        aenderungsdatum: "01.07.2026",
        aenderungen:
          "Die wöchentliche Arbeitszeit wird ab dem 01.07.2026 von 40 Stunden auf 30 Stunden reduziert. Das monatliche Bruttogehalt beträgt ab diesem Zeitpunkt 2.400,00 Euro.",
      }),
  },
]

export default function TestDocsPage() {
  const [results, setResults] = useState<Record<string, "idle" | "running" | "ok" | "error">>({})

  const run = async (label: string, fn: () => Promise<any>) => {
    setResults((r) => ({ ...r, [label]: "running" }))
    try {
      await fn()
      setResults((r) => ({ ...r, [label]: "ok" }))
    } catch (e: any) {
      console.error(label, e)
      setResults((r) => ({ ...r, [label]: "error" }))
    }
  }

  const runAll = async () => {
    for (const doc of DOCS) {
      await run(doc.label, doc.fn)
    }
  }

  const icon = (s: string) => {
    if (s === "running") return "⏳"
    if (s === "ok") return "✅"
    if (s === "error") return "❌"
    return "⬜"
  }

  return (
    <div style={{ fontFamily: "monospace", padding: 32, maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>Dokument-Test — Max Mustermann</h1>
      <button
        onClick={runAll}
        style={{ marginBottom: 24, padding: "8px 20px", fontSize: 14, cursor: "pointer" }}
      >
        Alle generieren
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DOCS.map((doc) => (
          <div key={doc.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20 }}>{icon(results[doc.label] ?? "idle")}</span>
            <button
              onClick={() => run(doc.label, doc.fn)}
              style={{ fontSize: 13, cursor: "pointer", textAlign: "left" }}
            >
              {doc.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
