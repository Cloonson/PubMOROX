"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Dashboard } from "@/components/dashboard"
import { DocumentForm } from "@/components/document-form"
import { StorageView } from "@/components/storage-view"
import { MitarbeiterView } from "@/components/mitarbeiter-view"
import { VerguetungsverhandlungenView } from "@/components/verguetungsverhandlungen-view"
import { PrognosemeldungView } from "@/components/prognosemeldung-view"
import { AusgleichszuweisungView } from "@/components/ausgleichszuweisung-view"
import { UmlagemeldungView } from "@/components/umlagemeldung-view"
import { SonstigeView } from "@/components/sonstige-view"
import { SettingsDialog } from "@/components/settings-dialog"
import { AiAssistant } from "@/components/ai-assistant"
import { Updater } from "@/components/updater"
import type { DocumentType } from "@/lib/types"

export default function Home() {
  const [activeDocument, setActiveDocument] = useState<DocumentType | null>(null)
  const [showStorage, setShowStorage] = useState(false)
  const [showMitarbeiter, setShowMitarbeiter] = useState(false)
  const [showVerguetung, setShowVerguetung] = useState(false)
  const [showPrognosemeldungen, setShowPrognosemeldungen] = useState(false)
  const [showAusgleichszuweisung, setShowAusgleichszuweisung] = useState(false)
  const [showUmlagemeldung, setShowUmlagemeldung] = useState(false)
  const [showSonstige, setShowSonstige] = useState(false)
  const [documentInitialData, setDocumentInitialData] = useState<Record<string, string> | undefined>()

  const resetViews = () => {
    setShowStorage(false)
    setShowMitarbeiter(false)
    setShowVerguetung(false)
    setShowPrognosemeldungen(false)
    setShowAusgleichszuweisung(false)
    setShowUmlagemeldung(false)
    setShowSonstige(false)
  }

  const handleSelectDocument = (type: DocumentType) => {
    setActiveDocument(type)
    resetViews()
    setDocumentInitialData(undefined)
  }

  const handleGoHome = () => {
    setActiveDocument(null)
    resetViews()
    setDocumentInitialData(undefined)
  }

  const handleOpenStorage = () => {
    setActiveDocument(null)
    resetViews()
    setShowStorage(true)
  }

  const handleOpenMitarbeiter = () => {
    setActiveDocument(null)
    resetViews()
    setShowMitarbeiter(true)
  }

  const handleOpenVerguetung = () => {
    setActiveDocument(null)
    resetViews()
    setShowVerguetung(true)
  }

  const handleOpenPrognosemeldungen = () => {
    setActiveDocument(null)
    resetViews()
    setShowPrognosemeldungen(true)
  }

  const handleOpenAusgleichszuweisung = () => {
    setActiveDocument(null)
    resetViews()
    setShowAusgleichszuweisung(true)
  }

  const handleOpenUmlagemeldung = () => {
    setActiveDocument(null)
    resetViews()
    setShowUmlagemeldung(true)
  }

  const handleOpenSonstige = () => {
    setActiveDocument(null)
    resetViews()
    setShowSonstige(true)
  }

  const handlePrintFromEmployee = (type: DocumentType, data: Record<string, string>) => {
    setDocumentInitialData(data)
    setActiveDocument(type)
    resetViews()
  }

  const handleDocumentCreated = () => {
    setActiveDocument(null)
    resetViews()
    setShowStorage(true)
    setDocumentInitialData(undefined)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeDocument={activeDocument}
        onSelectDocument={handleSelectDocument}
        onGoHome={handleGoHome}
        showStorage={showStorage}
        onOpenStorage={handleOpenStorage}
        showMitarbeiter={showMitarbeiter}
        onOpenMitarbeiter={handleOpenMitarbeiter}
        showVerguetung={showVerguetung}
        onOpenVerguetung={handleOpenVerguetung}
        showPrognosemeldungen={showPrognosemeldungen}
        onOpenPrognosemeldungen={handleOpenPrognosemeldungen}
        showAusgleichszuweisung={showAusgleichszuweisung}
        onOpenAusgleichszuweisung={handleOpenAusgleichszuweisung}
        showUmlagemeldung={showUmlagemeldung}
        onOpenUmlagemeldung={handleOpenUmlagemeldung}
        showSonstige={showSonstige}
        onOpenSonstige={handleOpenSonstige}
      />
      <main className="flex-1 overflow-auto relative">
        {activeDocument === null && !showStorage && !showMitarbeiter && !showVerguetung && !showPrognosemeldungen && !showAusgleichszuweisung && !showUmlagemeldung && !showSonstige && <SettingsDialog />}
        {showStorage ? (
          <StorageView />
        ) : showMitarbeiter ? (
          <MitarbeiterView onPrintDocument={handlePrintFromEmployee} />
        ) : showVerguetung ? (
          <VerguetungsverhandlungenView />
        ) : showPrognosemeldungen ? (
          <PrognosemeldungView />
        ) : showAusgleichszuweisung ? (
          <AusgleichszuweisungView />
        ) : showUmlagemeldung ? (
          <UmlagemeldungView />
        ) : showSonstige ? (
          <SonstigeView onBack={handleGoHome} />
        ) : activeDocument === null ? (
          <Dashboard
            onSelectDocument={handleSelectDocument}
            onOpenVerguetung={handleOpenVerguetung}
            onOpenPrognosemeldungen={handleOpenPrognosemeldungen}
            onOpenAusgleichszuweisung={handleOpenAusgleichszuweisung}
            onOpenUmlagemeldung={handleOpenUmlagemeldung}
            onOpenSonstige={handleOpenSonstige}
          />
        ) : (
          <DocumentForm
            documentType={activeDocument}
            onBack={handleGoHome}
            onDocumentCreated={handleDocumentCreated}
            initialData={documentInitialData}
          />
        )}
      </main>
      <AiAssistant onOpenDocument={handlePrintFromEmployee} />
      <Updater />
    </div>
  )
}
