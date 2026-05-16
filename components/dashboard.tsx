"use client"

import {
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
  TrendingUp,
  BarChart2,
  ClipboardList,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { documentTypes, type DocumentType } from "@/lib/types"

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

interface DashboardProps {
  onSelectDocument: (type: DocumentType) => void
  onOpenVerguetung?: () => void
  onOpenPrognosemeldungen?: () => void
  onOpenAusgleichszuweisung?: () => void
  onOpenUmlagemeldung?: () => void
}

export function Dashboard({ onSelectDocument, onOpenVerguetung, onOpenPrognosemeldungen, onOpenAusgleichszuweisung, onOpenUmlagemeldung }: DashboardProps) {
  const vertraege = documentTypes.filter((d) => d.category === "vertraege")
  const zeugnisse = documentTypes.filter((d) => d.category === "zeugnisse")
  const disziplinar = documentTypes.filter((d) => d.category === "disziplinar")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">MOROX</h1>
        <p className="text-muted-foreground mt-1">
          Neue Dokumente erstellen
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-primary rounded-full" />
          Verträge
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vertraege.map((doc) => {
            const Icon = iconMap[doc.icon as keyof typeof iconMap]
            return (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
                onClick={() => onSelectDocument(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg leading-tight min-w-0 break-words">{doc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{doc.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-secondary rounded-full" />
          Zeugnisse
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zeugnisse.map((doc) => {
            const Icon = iconMap[doc.icon as keyof typeof iconMap]
            return (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-secondary group"
                onClick={() => onSelectDocument(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg leading-tight min-w-0 break-words">{doc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{doc.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-destructive rounded-full" />
          Disziplinarmaßnahmen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {disziplinar.map((doc) => {
            const Icon = iconMap[doc.icon as keyof typeof iconMap]
            return (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-destructive group"
                onClick={() => onSelectDocument(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg leading-tight min-w-0 break-words">{doc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{doc.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-500 rounded-full" />
          Vergütungsverhandlung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-500 group"
            onClick={onOpenVerguetung}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg leading-tight min-w-0 break-words">Berechnungsschema</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Leistungsdaten importieren und Berechnungsschema automatisch ausfüllen</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-emerald-600 rounded-full" />
          PFAU.NRW
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-emerald-600 group"
            onClick={onOpenPrognosemeldungen}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg leading-tight min-w-0 break-words">Prognosemeldungen</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Auszubildenden-Prognosemeldung für PFK und PFA 2027 vorbereiten</CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-emerald-600 group"
            onClick={onOpenAusgleichszuweisung}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Calculator className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg leading-tight min-w-0 break-words">Ausgleichszuweisung</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Berechnungsinfo, Aufschläge und Navigationshilfe für PFAU.NRW</CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-emerald-600 group"
            onClick={onOpenUmlagemeldung}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg leading-tight min-w-0 break-words">Umlagemeldung</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>VZÄ berechnen und Umlagemeldung für PFAU.NRW vorbereiten</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
