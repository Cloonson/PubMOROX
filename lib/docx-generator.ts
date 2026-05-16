import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { saveAs } from "file-saver-es"
import expressions from "angular-expressions"
import { addDocumentLog } from "./document-log"

// Hilfsfunktion um zu prüfen ob wir in Tauri laufen
function isTauri(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const ensureDocxName = (name: string) => (name && name.toLowerCase().endsWith(".docx")) ? name : `${name}.docx`

// Sicherer Save-Helper mit korrektem Dateinamen (verhindert "Unknown")
function toNamedFile(blob: Blob, targetFilename: string): File {
  const safeName = ensureDocxName(targetFilename || "Dokument")
  const typedBlob = blob.type ? blob : new Blob([blob], { type: DOCX_MIME })
  return new File([typedBlob], safeName, { type: typedBlob.type || DOCX_MIME })
}

function browserDownload(blob: Blob, targetFilename: string) {
  const file = toNamedFile(blob, targetFilename)
  const url = URL.createObjectURL(file)
  const a = document.createElement("a")
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  // Banner: etwas verzögert damit er unter dem Erfolgs-Toast erscheint
  setTimeout(() => {
    import("sonner").then(({ toast }) => {
      toast.info(`Sie finden die Datei in Ihren Downloads.`, {
        description: file.name,
        duration: 6000,
      })
    })
  }, 400)
}

async function logOutputPath() {
  // Versuche den realen Pfad vom Projekt-Unterordner zu holen
  try {
    const { documentDir, join } = await import("@tauri-apps/api/path")
    // Da wir nicht direkt auf den Projektordner zugreifen können ohne Security-Hürden, 
    // nutzen wir den Documents/MOROX/files Pfad als stabilere Alternative 
    // oder bleiben bei ResourceDir. 
    // Aber der User will explizit einen "files"-Ordner im Projekt.
  } catch {
    // kein Tauri oder Pfad-API nicht verfügbar
  }
}

// Speichere Datei im files Ordner
async function saveToOutputFolder(
  blob: Blob,
  targetFilename: string,
  meta?: { type: string; vorname: string; nachname: string }
): Promise<void> {
  const safeFilename = ensureDocxName(targetFilename)

  if (isTauri()) {
    try {
      // Importiere Tauri APIs dynamisch
      const { BaseDirectory, writeFile, mkdir } = await import("@tauri-apps/plugin-fs")
      const { documentDir, join } = await import("@tauri-apps/api/path")
      
      // Nutze den Documents-Ordner als stabilen, sichtbaren Ort für den User
      const docPath = await documentDir()
      const moroPath = await join(docPath, "MOROX", "files")
      
      console.log(`Versuche in ${moroPath} zu speichern...`)

      // In Tauri v2 müssen wir für Folder-Erstellung etc. meist BaseDirectories nutzen oder Scopes
      // Wir nutzen hier Document-Directory als sicheren Hafen
      try {
        await mkdir("MOROX/files", { baseDir: BaseDirectory.Document, recursive: true })
      } catch (e) {
        // Ordner existiert wahrscheinlich schon
      }
      
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Speichere im Documents/MOROX/files Ordner
      await writeFile(`MOROX/files/${safeFilename}`, uint8Array, { baseDir: BaseDirectory.Document })

      if (meta) await addDocumentLog({ ...meta, filename: safeFilename })

      // Datei direkt öffnen
      try {
        const { openPath } = await import("@tauri-apps/plugin-opener")
        const fullPath = await join(docPath, "MOROX", "files", safeFilename)
        await openPath(fullPath)
      } catch {
        browserDownload(blob, safeFilename)
      }
    } catch (error: any) {
      const msg = error?.message || String(error)
      console.error("❌ Tauri Save Error:", error)
      import("sonner").then(({ toast }) => toast.error("Speicherfehler: " + msg))
      browserDownload(blob, safeFilename)
    }
  } else {
    // Im Browser: normaler Download
    browserDownload(blob, targetFilename)
    if (meta) await addDocumentLog({ ...meta, filename: ensureDocxName(targetFilename) })
  }
}

export interface AushilfsvertragData {
  gender: string
  vorname: string
  nachname: string
  bday: string
  street: string
  city: string
  begin: string
  grenz: string
  ende?: string
  prof: string
  wage: string
  vaca: string
  befristet: string
}

export interface AusbildungsvertragData {
  gender: string
  vorname: string
  nachname: string
  street: string
  city: string
  bday: string
  begin: string
  ende: string
  first: string
  second: string
  third: string
}

export interface KuendigungData {
  gender: string
  vorname: string
  nachname: string
  street: string
  city: string
  date: string
  kdate: string
  last: string
  type: string
  reason: string
}

export interface InvestitionskostenData {
  gender: string
  vorname: string
  nachname: string
  street: string
  city: string
  bday: string
}

export async function generateKuendigung(data: KuendigungData) {
  try {
    const templatePath = "/kuendigung/kuendigung.docx"

    // Cache-Busting
    const cacheBuster = `?v=${Date.now()}`
    const templateUrl = templatePath + cacheBuster

    console.log("Lade Kündigung-Template:", templateUrl)

    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Template nicht gefunden: ${templatePath}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    
    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return {
        get(scope: any) {
          return expr(scope)
        }
      }
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: {
        start: '{',
        end: '}'
      },
      nullGetter() {
        return ""
      },
    })

    const templateData = {
      gender: data.gender || "",
      vorname: data.vorname || "",
      nachname: data.nachname || "",
      street: data.street || "",
      city: data.city || "",
      date: data.date || "",
      kdate: data.kdate || "",
      last: data.last || "",
      type: data.type || "",
      reason: data.reason || "",
    }

    console.log("Kündigung Template-Daten:", templateData)

    doc.setData(templateData)
    doc.render()

    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    })

    const filename = `Kuendigung_${data.vorname}_${data.nachname}_${data.date.replace(/\./g, '-')}.docx`
    await saveToOutputFolder(output, filename, { type: "Kündigung", vorname: data.vorname, nachname: data.nachname })

    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren der Kündigung:", error)
    if (error.properties && error.properties.errors) {
      const errors = error.properties.errors
      errors.forEach((err: any) => {
        console.error(`- Fehler in Tag: ${err.name}`, err)
      })
    }
    throw error
  }
}

export async function generateAusbildungsvertrag(
  data: AusbildungsvertragData,
  geschlecht: "männlich" | "weiblich"
) {
  try {
    // Wähle das richtige Template basierend auf Geschlecht
    const templatePath = geschlecht === "weiblich"
      ? "/azubi/azubi_weiblich.docx"
      : "/azubi/azubi_male.docx"

    // Cache-Busting
    const cacheBuster = `?v=${Date.now()}`
    const templateUrl = templatePath + cacheBuster

    console.log("Lade Ausbildungsvertrag-Template:", templateUrl)

    // Lade das Template
    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Template nicht gefunden: ${templatePath}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    
    // Konfiguriere Angular Expressions
    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return {
        get(scope: any) {
          return expr(scope)
        }
      }
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: {
        start: '{',
        end: '}'
      },
      nullGetter() {
        return ""
      },
    })

    // Bereite die Daten vor
    const templateData = {
      gender: data.gender || "",
      vorname: data.vorname || "",
      nachname: data.nachname || "",
      street: data.street || "",
      city: data.city || "",
      bday: data.bday || "",
      begin: data.begin || "",
      ende: data.ende || "",
      first: data.first || "",
      second: data.second || "",
      third: data.third || "",
    }

    console.log("Ausbildungsvertrag Template-Daten:", templateData)

    // Setze die Daten
    doc.setData(templateData)

    // Rendere das Dokument
    doc.render()

    // Generiere die Ausgabedatei with richtigem MIME-Type
    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    })

    // Erstelle Dateinamen
    const filename = `Ausbildungsvertrag_${data.vorname}_${data.nachname}_${data.begin.replace(/\./g, '-')}.docx`
    await saveToOutputFolder(output, filename, { type: "Ausbildungsvertrag", vorname: data.vorname, nachname: data.nachname })

    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren des Ausbildungsvertrags:", error)
    
    if (error.properties && error.properties.errors) {
      const errors = error.properties.errors
      console.error("Template-Fehler Details:", errors)
      
      errors.forEach((err: any) => {
        console.error(`- Fehler in Tag: ${err.name}`, err)
      })
    }
    
    throw error
  }
}

export interface ArbeitsvertragData {
  gender: string
  vorname: string
  nachname: string
  bday: string
  street: string
  city: string
  begin: string
  prof: string
  probezeit: string
  tagewoche: string
  minstunden: string
  stundenmax: string
  wage: string
  vaca: string
  vertragsart: "unbefristet" | "befristet" | "geringfuegig"
  ende?: string
}

export interface AenderungsvereinbarungData {
  gender: string
  vorname: string
  nachname: string
  vertragsart: string
  vertragsdatum: string
  aenderungsdatum: string
  aenderungen: string
}

export async function generateAenderungsvereinbarung(data: AenderungsvereinbarungData) {
  try {
    const response = await fetch(`/change/av_aenderung.docx?v=${Date.now()}`)
    if (!response.ok) throw new Error("Template nicht gefunden: /change/av_aenderung.docx")
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)

    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return { get(scope: any) { return expr(scope) } }
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: { start: '{', end: '}' },
      nullGetter() { return "" },
    })

    doc.setData({
      gender: data.gender,
      vorname: data.vorname,
      nachname: data.nachname,
      vertragsart: data.vertragsart,
      vertragsdatum: data.vertragsdatum,
      aenderungsdatum: data.aenderungsdatum,
      aenderungen: data.aenderungen,
    })
    doc.render()

    const output = doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" })
    await saveToOutputFolder(output, `Aenderungsvereinbarung_${data.vorname}_${data.nachname}.docx`, { type: "Änderungsvereinbarung", vorname: data.vorname, nachname: data.nachname })
    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren der Änderungsvereinbarung:", error)
    throw error
  }
}

export async function generateArbeitsvertrag(data: ArbeitsvertragData) {
  const templateMap = {
    unbefristet: "/contracts/av_unbefristet.docx",
    befristet: "/contracts/av_befristet.docx",
    geringfuegig: "/aushilfe/av_gering_befristet.docx",
  }
  const templatePath = templateMap[data.vertragsart]

  try {
    const response = await fetch(templatePath + `?v=${Date.now()}`)
    if (!response.ok) throw new Error(`Template nicht gefunden: ${templatePath}`)
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)

    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return { get(scope: any) { return expr(scope) } }
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: { start: '{', end: '}' },
      nullGetter() { return "" },
    })

    doc.setData({
      gender: data.gender,
      vorname: data.vorname,
      nachname: data.nachname,
      bday: data.bday,
      street: data.street,
      city: data.city,
      begin: data.begin,
      prof: data.prof,
      probezeit: data.probezeit,
      tagewoche: data.tagewoche,
      minstunden: data.minstunden,
      stundenmax: data.stundenmax,
      wage: data.wage,
      vaca: data.vaca,
      ende: data.ende || "",
    })
    doc.render()

    const output = doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" })
    const suffix = data.vertragsart === "geringfuegig" ? "Geringfuegig" : data.vertragsart === "befristet" ? "Befristet" : "Unbefristet"
    await saveToOutputFolder(output, `Arbeitsvertrag_${suffix}_${data.vorname}_${data.nachname}.docx`, { type: "Arbeitsvertrag", vorname: data.vorname, nachname: data.nachname })
    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren des Arbeitsvertrags:", error)
    throw error
  }
}

export interface ArbeitszeugnisData {
  vorname: string
  nachname: string
  street: string
  city: string
  date: string
  bday: string
  cofbirth: string
  begin: string
  prof: string
  ende: string
  gender: string
  bewertung?: string
  beendet?: string
}

export interface AbmahnungTemplateData {
  gender: string
  vorname: string
  nachname: string
  street: string
  city: string
  date: string
  beschreibung: string
  konsequenz: string
}

export async function generateAbmahnung(data: AbmahnungTemplateData) {
  try {
    const response = await fetch(`/mahnung/abmahnung.docx?v=${Date.now()}`)
    if (!response.ok) throw new Error("Template nicht gefunden: /mahnung/abmahnung.docx")
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)

    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return { get(scope: any) { return expr(scope) } }
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: { start: '{', end: '}' },
      nullGetter() { return "" },
    })

    doc.setData({
      gender: data.gender,
      vorname: data.vorname,
      nachname: data.nachname,
      street: data.street,
      city: data.city,
      date: data.date,
      beschreibung: data.beschreibung,
      konsequenz: data.konsequenz,
    })
    doc.render()

    const output = doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" })
    await saveToOutputFolder(output, `Abmahnung_${data.vorname}_${data.nachname}.docx`, { type: "Abmahnung", vorname: data.vorname, nachname: data.nachname })
    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren der Abmahnung:", error)
    throw error
  }
}

export async function generateArbeitszeugnis(data: ArbeitszeugnisData) {
  const bewertung = data.bewertung || "gut"
  const sex = data.gender === "weiblich" ? "female" : "male"
  const templatePath = `/zeugnisse/Arbeitszeugnis_${sex}_${bewertung}.docx`

  try {
    const response = await fetch(templatePath + `?v=${Date.now()}`)
    if (!response.ok) throw new Error(`Template nicht gefunden: ${templatePath}`)
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)

    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return { get(scope: any) { return expr(scope) } }
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: { start: '{', end: '}' },
      nullGetter() { return "" },
    })

    doc.setData({
      vorname: data.vorname,
      nachname: data.nachname,
      street: data.street,
      city: data.city,
      date: data.date,
      bday: data.bday,
      cofbirth: data.cofbirth,
      begin: data.begin,
      prof: data.prof,
      ende: data.ende,
      beendet: data.beendet || "nein",
    })
    doc.render()

    const output = doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" })
    await saveToOutputFolder(output, `Arbeitszeugnis_${data.vorname}_${data.nachname}.docx`, { type: "Arbeitszeugnis", vorname: data.vorname, nachname: data.nachname })
    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren des Arbeitszeugnisses:", error)
    throw error
  }
}

export async function generateAushilfsvertrag(
  data: AushilfsvertragData,
  isBefristet: boolean
) {
  try {
    // Wähle das richtige Template
    const templatePath = isBefristet
      ? "/aushilfe/av_gering_befristet.docx"
      : "/aushilfe/av_gering_unbefristet.docx"

    // Cache-Busting: Verhindere, dass der Browser alte Versionen lädt
    const cacheBuster = `?v=${Date.now()}`
    const templateUrl = templatePath + cacheBuster

    console.log("Lade Template:", templateUrl)

    // Lade das Template
    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Template nicht gefunden: ${templatePath}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    
    // Konfiguriere Angular Expressions für besseres Parsing
    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return {
        get(scope: any) {
          return expr(scope)
        }
      }
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: {
        start: '{',
        end: '}'
      },
      nullGetter() {
        return ""
      },
    })

    // Bereite die Daten vor
    const templateData = {
      gender: data.gender || "",
      vorname: data.vorname || "",
      nachname: data.nachname || "",
      bday: data.bday || "",
      street: data.street || "",
      city: data.city || "",
      begin: data.begin || "",
      grenz: data.grenz || "",
      ende: isBefristet ? (data.ende || "") : "",
      prof: data.prof || "",
      wage: data.wage || "",
      vaca: data.vaca || "",
    }

    console.log("Template-Daten:", templateData)

    // Setze die Daten
    doc.setData(templateData)

    // Rendere das Dokument
    doc.render()

    // Generiere die Ausgabedatei mit richtigem MIME-Type
    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    })

    const filename = `AV_${data.vorname}_${data.nachname}_${data.begin.replace(/\./g, '-')}.docx`
    await saveToOutputFolder(output, filename, { type: "Aushilfsvertrag", vorname: data.vorname, nachname: data.nachname })

    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren des Dokuments:", error)
    
    // Detailliertere Fehlermeldung für Template-Fehler
    if (error.properties && error.properties.errors) {
      const errors = error.properties.errors
      console.error("Template-Fehler Details:", errors)
      
      errors.forEach((err: any) => {
        console.error(`- Fehler in Tag: ${err.name}`, err)
      })
    }
    
    throw error
  }
}

export async function generateInvestitionskosten(data: InvestitionskostenData) {
  try {
    const templatePath = "/invest/investitionskosten.docx"
    const templateUrl = templatePath + `?v=${Date.now()}`

    console.log("Lade Investitionskosten-Template:", templateUrl)

    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Template nicht gefunden: ${templatePath}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    
    function angularParser(tag: string) {
      const expr = expressions.compile(tag)
      return {
        get(scope: any) {
          return expr(scope)
        }
      }
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
      delimiters: {
        start: '{',
        end: '}'
      },
      nullGetter() {
        return ""
      },
    })

    const templateData = {
      gender: data.gender || "",
      vorname: data.vorname || "",
      nachname: data.nachname || "",
      street: data.street || "",
      city: data.city || "",
      bday: data.bday || "",
    }

    doc.setData(templateData)
    doc.render()

    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    })

    const filename = `Investitionskosten_${data.vorname}_${data.nachname}.docx`
    await saveToOutputFolder(output, filename, { type: "Investitionskosten", vorname: data.vorname, nachname: data.nachname })

    return true
  } catch (error: any) {
    console.error("Fehler beim Generieren der Investitionskosten:", error)
    throw error
  }
}
