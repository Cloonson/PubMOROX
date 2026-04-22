"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Dashboard } from "@/components/dashboard"
import { DocumentForm } from "@/components/document-form"
import { StorageView } from "@/components/storage-view"
import { MitarbeiterView } from "@/components/mitarbeiter-view"
import { SettingsDialog } from "@/components/settings-dialog"
import { AiAssistant } from "@/components/ai-assistant"
import type { DocumentType } from "@/lib/types"

export default function Home() {
  const [activeDocument, setActiveDocument] = useState<DocumentType | null>(null)
  const [showStorage, setShowStorage] = useState(false)
  const [showMitarbeiter, setShowMitarbeiter] = useState(false)
  const [documentInitialData, setDocumentInitialData] = useState<Record<string, string> | undefined>()

  const handleSelectDocument = (type: DocumentType) => {
    setActiveDocument(type)
    setShowStorage(false)
    setShowMitarbeiter(false)
    setDocumentInitialData(undefined)
  }

  const handleGoHome = () => {
    setActiveDocument(null)
    setShowStorage(false)
    setShowMitarbeiter(false)
    setDocumentInitialData(undefined)
  }

  const handleOpenStorage = () => {
    setActiveDocument(null)
    setShowStorage(true)
    setShowMitarbeiter(false)
  }

  const handleOpenMitarbeiter = () => {
    setActiveDocument(null)
    setShowStorage(false)
    setShowMitarbeiter(true)
  }

  const handlePrintFromEmployee = (type: DocumentType, data: Record<string, string>) => {
    setDocumentInitialData(data)
    setActiveDocument(type)
    setShowStorage(false)
    setShowMitarbeiter(false)
  }

  const handleDocumentCreated = () => {
    setActiveDocument(null)
    setShowStorage(true)
    setShowMitarbeiter(false)
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
      />
      <main className="flex-1 overflow-auto relative">
        {activeDocument === null && !showStorage && !showMitarbeiter && <SettingsDialog />}
        {showStorage ? (
          <StorageView />
        ) : showMitarbeiter ? (
          <MitarbeiterView onPrintDocument={handlePrintFromEmployee} />
        ) : activeDocument === null ? (
          <Dashboard onSelectDocument={handleSelectDocument} />
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
    </div>
  )
}
