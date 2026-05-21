"use client"

import Image from "next/image"
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
  Home,
  FolderOpen,
  Users,
  TrendingUp,
  BarChart2,
  Calculator,
  ClipboardList,
  FilePlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
}

interface AppSidebarProps {
  activeDocument: DocumentType | null
  onSelectDocument: (type: DocumentType) => void
  onGoHome: () => void
  showStorage?: boolean
  onOpenStorage?: () => void
  showMitarbeiter?: boolean
  onOpenMitarbeiter?: () => void
  showVerguetung?: boolean
  onOpenVerguetung?: () => void
  showPrognosemeldungen?: boolean
  onOpenPrognosemeldungen?: () => void
  showAusgleichszuweisung?: boolean
  onOpenAusgleichszuweisung?: () => void
  showUmlagemeldung?: boolean
  onOpenUmlagemeldung?: () => void
  showSonstige?: boolean
  onOpenSonstige?: () => void
}

export function AppSidebar({ activeDocument, onSelectDocument, onGoHome, showStorage, onOpenStorage, showMitarbeiter, onOpenMitarbeiter, showVerguetung, onOpenVerguetung, showPrognosemeldungen, onOpenPrognosemeldungen, showAusgleichszuweisung, onOpenAusgleichszuweisung, showUmlagemeldung, onOpenUmlagemeldung, showSonstige, onOpenSonstige }: AppSidebarProps) {
  const vertraege = documentTypes.filter((d) => d.category === "vertraege")
  const zeugnisse = documentTypes.filter((d) => d.category === "zeugnisse")
  const disziplinar = documentTypes.filter((d) => d.category === "disziplinar")


  return (
    <aside className="w-64 min-h-screen bg-sidebar-background text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <button onClick={onGoHome} className="flex justify-center w-full">
          <Image
            src="/moro-logo.png"
            alt="Pflegedienst MORO Logo"
            width={110}
            height={85}
            className="object-contain"
          />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <button
            onClick={onGoHome}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeDocument === null && !showStorage && !showMitarbeiter && !showVerguetung && !showPrognosemeldungen && !showAusgleichszuweisung && !showUmlagemeldung && !showSonstige
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <Home className="w-4 h-4" />
            Übersicht
          </button>

          <button
            onClick={onOpenStorage}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              showStorage
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            Speicher
          </button>

          <button
            onClick={onOpenMitarbeiter}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              showMitarbeiter
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <Users className="w-4 h-4" />
            Mitarbeiter
          </button>

          <button
            onClick={onOpenSonstige}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              showSonstige
                ? "bg-orange-500/10 text-orange-500"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <FilePlus className="w-4 h-4" />
            Sonstige Dokumente
          </button>

        </div>

        <div>
          <h3 className="text-sm font-bold text-sidebar-foreground mb-2">
            Verträge
          </h3>
          <ul className="space-y-1">
            {vertraege.map((doc) => {
              const Icon = iconMap[doc.icon as keyof typeof iconMap]
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                      activeDocument === doc.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      activeDocument === doc.id ? "text-primary" : "group-hover:text-primary"
                    )} />
                    {doc.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-sidebar-foreground mb-2">
            Zeugnisse
          </h3>
          <ul className="space-y-1">
            {zeugnisse.map((doc) => {
              const Icon = iconMap[doc.icon as keyof typeof iconMap]
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                      activeDocument === doc.id
                        ? "bg-secondary/10 text-secondary"
                        : "hover:bg-secondary/10 hover:text-secondary"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      activeDocument === doc.id ? "text-secondary" : "group-hover:text-secondary"
                    )} />
                    {doc.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-sidebar-foreground mb-2">
            Maßnahmen
          </h3>
          <ul className="space-y-1">
            {disziplinar.map((doc) => {
              const Icon = iconMap[doc.icon as keyof typeof iconMap]
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                      activeDocument === doc.id
                        ? "bg-destructive/10 text-destructive"
                        : "hover:bg-destructive/10 hover:text-destructive"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      activeDocument === doc.id ? "text-destructive" : "group-hover:text-destructive"
                    )} />
                    {doc.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-sidebar-foreground mb-2">
            Vergütungsverhandlung
          </h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={onOpenVerguetung}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                  showVerguetung
                    ? "bg-purple-500/10 text-purple-500"
                    : "hover:bg-purple-500/10 hover:text-purple-500"
                )}
              >
                <TrendingUp className={cn("w-4 h-4 transition-colors", showVerguetung ? "text-purple-500" : "")} />
                Berechnungsschema
              </button>
            </li>
          </ul>
        </div>

        <div className="opacity-50">
          <h3 className="text-sm font-bold text-sidebar-foreground mb-1">
            PFAU.NRW
          </h3>
          <p className="text-xs text-muted-foreground mb-2 italic">In Entwicklung</p>
          <ul className="space-y-1">
            <li>
              <button
                disabled
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
              >
                <BarChart2 className="w-4 h-4" />
                Prognosemeldungen
              </button>
            </li>
            <li>
              <button
                disabled
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
              >
                <Calculator className="w-4 h-4" />
                Ausgleichszuweisung
              </button>
            </li>
            <li>
              <button
                disabled
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
              >
                <ClipboardList className="w-4 h-4" />
                Umlagemeldung
              </button>
            </li>
          </ul>
        </div>

      </nav>

      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/70">
        <p>© 2026 Pflegedienst MORO GmbH</p>
      </div>
    </aside>
  )
}
