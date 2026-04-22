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
  Calculator,
  Home,
  FolderOpen,
  Users,
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
  Calculator,
}

interface AppSidebarProps {
  activeDocument: DocumentType | null
  onSelectDocument: (type: DocumentType) => void
  onGoHome: () => void
  showStorage?: boolean
  onOpenStorage?: () => void
  showMitarbeiter?: boolean
  onOpenMitarbeiter?: () => void
}

export function AppSidebar({ activeDocument, onSelectDocument, onGoHome, showStorage, onOpenStorage, showMitarbeiter, onOpenMitarbeiter }: AppSidebarProps) {
  const vertraege = documentTypes.filter((d) => d.category === "vertraege")
  const zeugnisse = documentTypes.filter((d) => d.category === "zeugnisse")
  const disziplinar = documentTypes.filter((d) => d.category === "disziplinar")
  const sonstiges = documentTypes.filter((d) => d.category === "sonstiges")

  return (
    <aside className="w-64 min-h-screen bg-sidebar-background text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <button onClick={onGoHome} className="flex items-center gap-3 w-full">
          <Image
            src="/moro.png"
            alt="Pflegedienst MORO Logo"
            width={300}
            height={100}
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
              activeDocument === null && !showStorage && !showMitarbeiter
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
            Sonstiges
          </h3>
          <ul className="space-y-1">
            {sonstiges.map((doc) => {
              const Icon = iconMap[doc.icon as keyof typeof iconMap]
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
                      activeDocument === doc.id
                        ? "bg-purple-500/10 text-purple-500"
                        : "hover:bg-purple-500/10 hover:text-purple-500"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-colors",
                      activeDocument === doc.id ? "text-purple-500" : "group-hover:text-purple-500"
                    )} />
                    {doc.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/70">
        <p>© 2026 Pflegedienst MORO GmbH</p>
      </div>
    </aside>
  )
}
