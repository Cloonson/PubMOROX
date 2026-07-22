"use client"

import { useState } from "react"
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
  Clock3,
  PenTool,
  ChevronDown,
  ChevronRight,
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
  showStundenliste?: boolean
  onOpenStundenliste?: () => void
  showVerguetung?: boolean
  onOpenVerguetung?: () => void
  showPrognosemeldungen?: boolean
  onOpenPrognosemeldungen?: () => void
  showAusgleichszuweisung?: boolean
  onOpenAusgleichszuweisung?: () => void
  showUmlagemeldung?: boolean
  onOpenUmlagemeldung?: () => void
  showHandzeichenliste?: boolean
  onOpenHandzeichenliste?: () => void
}

type CategoryKey = "vertraege" | "zeugnisse" | "massnahmen" | "verguetung" | "pfau"

function CollapsibleContent({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-in-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

function CategoryHeader({
  label,
  open,
  onToggle,
  subtitle,
  accentClass,
  bgClass,
}: {
  label: string
  open: boolean
  onToggle: () => void
  subtitle?: string
  accentClass?: string
  bgClass?: string
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center justify-between w-full mb-2 group px-3 py-2 rounded-md transition-colors",
        bgClass ?? "bg-muted/20"
      )}
    >
      <div>
        <h3 className="text-sm font-bold text-left text-sidebar-foreground">{label}</h3>
        {subtitle && <p className="text-xs text-muted-foreground italic text-left">{subtitle}</p>}
      </div>
      {open ? (
        <ChevronDown className={cn("w-4 h-4 shrink-0", accentClass ?? "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
      ) : (
        <ChevronRight className={cn("w-4 h-4 shrink-0", accentClass ?? "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
      )}
    </button>
  )
}

export function AppSidebar({ activeDocument, onSelectDocument, onGoHome, showStorage, onOpenStorage, showMitarbeiter, onOpenMitarbeiter, showStundenliste, onOpenStundenliste, showVerguetung, onOpenVerguetung, showPrognosemeldungen, onOpenPrognosemeldungen, showAusgleichszuweisung, onOpenAusgleichszuweisung, showUmlagemeldung, onOpenUmlagemeldung, showHandzeichenliste, onOpenHandzeichenliste }: AppSidebarProps) {
  const vertraege = documentTypes.filter((d) => d.category === "vertraege")
  const zeugnisse = documentTypes.filter((d) => d.category === "zeugnisse")
  const disziplinar = documentTypes.filter((d) => d.category === "disziplinar")

  // Alle Kategorien standardmäßig eingeklappt
  const [openCategories, setOpenCategories] = useState<Record<CategoryKey, boolean>>({
    vertraege: false,
    zeugnisse: false,
    massnahmen: false,
    verguetung: false,
    pfau: false,
  })
  const toggleCategory = (key: CategoryKey) =>
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }))


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
              activeDocument === null && !showStorage && !showMitarbeiter && !showStundenliste && !showVerguetung && !showPrognosemeldungen && !showAusgleichszuweisung && !showUmlagemeldung && !showHandzeichenliste
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
            onClick={onOpenStundenliste}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              showStundenliste
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <Clock3 className="w-4 h-4" />
            Stundenlisten
          </button>

          <button
            onClick={onOpenHandzeichenliste}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
              showHandzeichenliste
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50"
            )}
          >
            <PenTool className="w-4 h-4" />
            Handzeichenliste
          </button>

        </div>

        <div>
          <CategoryHeader label="Verträge" open={openCategories.vertraege} onToggle={() => toggleCategory("vertraege")} accentClass="text-primary" bgClass="bg-primary/[0.04]" />
          <CollapsibleContent open={openCategories.vertraege}>
            <ul className="space-y-1">
              {vertraege.map((doc) => {
                const Icon = iconMap[doc.icon as keyof typeof iconMap]
                return (
                  <li key={doc.id}>
                    <button
                      onClick={() => onSelectDocument(doc.id)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors bg-primary/5",
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
          </CollapsibleContent>
        </div>

        <div>
          <CategoryHeader label="Zeugnisse" open={openCategories.zeugnisse} onToggle={() => toggleCategory("zeugnisse")} accentClass="text-secondary" bgClass="bg-secondary/[0.04]" />
          <CollapsibleContent open={openCategories.zeugnisse}>
            <ul className="space-y-1">
              {zeugnisse.map((doc) => {
                const Icon = iconMap[doc.icon as keyof typeof iconMap]
                return (
                  <li key={doc.id}>
                    <button
                      onClick={() => onSelectDocument(doc.id)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors bg-secondary/5",
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
          </CollapsibleContent>
        </div>

        <div>
          <CategoryHeader label="Maßnahmen" open={openCategories.massnahmen} onToggle={() => toggleCategory("massnahmen")} accentClass="text-destructive" bgClass="bg-destructive/[0.04]" />
          <CollapsibleContent open={openCategories.massnahmen}>
            <ul className="space-y-1">
              {disziplinar.map((doc) => {
                const Icon = iconMap[doc.icon as keyof typeof iconMap]
                return (
                  <li key={doc.id}>
                    <button
                      onClick={() => onSelectDocument(doc.id)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors bg-destructive/5",
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
          </CollapsibleContent>
        </div>

        <div>
          <CategoryHeader label="Vergütungsverhandlung" open={openCategories.verguetung} onToggle={() => toggleCategory("verguetung")} accentClass="text-purple-500" bgClass="bg-purple-500/[0.04]" />
          <CollapsibleContent open={openCategories.verguetung}>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={onOpenVerguetung}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors bg-purple-500/5",
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
          </CollapsibleContent>
        </div>

        <div className="opacity-50">
          <CategoryHeader label="PFAU.NRW" open={openCategories.pfau} onToggle={() => toggleCategory("pfau")} subtitle="In Entwicklung" bgClass="bg-muted/10" />
          <CollapsibleContent open={openCategories.pfau}>
            <ul className="space-y-1">
              <li>
                <button
                  disabled
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed bg-muted/20"
                >
                  <BarChart2 className="w-4 h-4" />
                  Prognosemeldungen
                </button>
              </li>
              <li>
                <button
                  disabled
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed bg-muted/20"
                >
                  <Calculator className="w-4 h-4" />
                  Ausgleichszuweisung
                </button>
              </li>
              <li>
                <button
                  disabled
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-not-allowed bg-muted/20"
                >
                  <ClipboardList className="w-4 h-4" />
                  Umlagemeldung
                </button>
              </li>
            </ul>
          </CollapsibleContent>
        </div>

      </nav>

      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/70">
        <p>© 2026 Pflegedienst MORO GmbH</p>
      </div>
    </aside>
  )
}
