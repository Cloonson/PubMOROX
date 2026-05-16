export type DocumentType =
  | "arbeitsvertrag"
  | "aushilfsvertrag"
  | "ausbildungsvertrag"
  | "aenderungsvereinbarung"
  | "arbeitszeugnis"
  | "zwischenzeugnis"
  | "abmahnung"
  | "kuendigung"

export interface DocumentTypeInfo {
  id: DocumentType
  title: string
  description: string
  icon: string
  category: "vertraege" | "zeugnisse" | "disziplinar" | "sonstiges"
}

export const documentTypes: DocumentTypeInfo[] = [
  {
    id: "arbeitsvertrag",
    title: "Arbeitsvertrag",
    description: "Unbefristeter oder befristeter Arbeitsvertrag",
    icon: "FileText",
    category: "vertraege",
  },
  {
    id: "aushilfsvertrag",
    title: "Aushilfsvertrag",
    description: "Vertrag für Aushilfskräfte",
    icon: "Clock",
    category: "vertraege",
  },
  {
    id: "ausbildungsvertrag",
    title: "Ausbildungsvertrag",
    description: "Vertrag für Auszubildende",
    icon: "GraduationCap",
    category: "vertraege",
  },
  {
    id: "aenderungsvereinbarung",
    title: "Änderungsvereinbarung",
    description: "Änderung bestehender Verträge",
    icon: "FileEdit",
    category: "vertraege",
  },
  {
    id: "arbeitszeugnis",
    title: "Arbeitszeugnis",
    description: "Qualifiziertes Arbeitszeugnis",
    icon: "Award",
    category: "zeugnisse",
  },
  {
    id: "zwischenzeugnis",
    title: "Zwischenzeugnis",
    description: "Zeugnis während der Beschäftigung",
    icon: "FileCheck",
    category: "zeugnisse",
  },
  {
    id: "abmahnung",
    title: "Abmahnung",
    description: "Schriftliche Abmahnung",
    icon: "AlertTriangle",
    category: "disziplinar",
  },
  {
    id: "kuendigung",
    title: "Kündigung",
    description: "Ordentliche oder außerordentliche Kündigung",
    icon: "XCircle",
    category: "disziplinar",
  },
]

export interface BaseFormData {
  // Mitarbeiter Daten
  mitarbeiterVorname: string
  mitarbeiterNachname: string
  mitarbeiterStrasse: string
  mitarbeiterPlz: string
  mitarbeiterOrt: string
  mitarbeiterGeburtsdatum: string
  
  // Allgemeine Daten
  erstellungsdatum: string
}

export interface ArbeitsvertragData extends BaseFormData {
  befristet: boolean
  befristungEnde?: string
  eintrittsdatum: string
  position: string
  abteilung: string
  arbeitszeit: string
  wochenarbeitszeit: string
  gehalt: string
  urlaubstage: string
  probezeit: string
  kuendigungsfrist: string
}

export interface AushilfsvertragData extends BaseFormData {
  eintrittsdatum: string
  befristungEnde: string
  position: string
  stundenlohn: string
  maxStundenProWoche: string
}

export interface AusbildungsvertragData extends BaseFormData {
  ausbildungsbeginn: string
  ausbildungsende: string
  ausbildungsberuf: string
  ausbildungsverguetung1: string
  ausbildungsverguetung2: string
  ausbildungsverguetung3: string
  berufsschule: string
}


export interface AenderungsvereinbarungData extends BaseFormData {
  urspruenglichesVertragsdatum: string
  aenderungAb: string
  aenderungsgrund: string
  neuePosition?: string
  neuesGehalt?: string
  neueArbeitszeit?: string
  sonstigeAenderungen?: string
}

export interface ArbeitszeugnisData extends BaseFormData {
  zeugnisart: "einfach" | "qualifiziert"
  eintrittsdatum: string
  austrittsdatum: string
  position: string
  aufgabenbeschreibung: string
  leistungsbewertung: string
  sozialverhalten: string
  austrittsgrund: string
}

export interface ZwischenzeugnisData extends BaseFormData {
  eintrittsdatum: string
  position: string
  aufgabenbeschreibung: string
  leistungsbewertung: string
  sozialverhalten: string
  ausstellungsgrund: string
}

export interface AbmahnungData extends BaseFormData {
  eintrittsdatum: string
  position: string
  verstossdatum: string
  verstossart: string
  verstossbeschreibung: string
  konsequenzen: string
}

export interface KuendigungData extends BaseFormData {
  kuendigungsart: "ordentlich" | "ausserordentlich"
  eintrittsdatum: string
  position: string
  kuendigungsdatum: string
  kuendigungsfrist: string
  letzterArbeitstag: string
  kuendigungsgrund?: string
}

export type FormData =
  | ArbeitsvertragData
  | AushilfsvertragData
  | AusbildungsvertragData
  | AenderungsvereinbarungData
  | ArbeitszeugnisData
  | ZwischenzeugnisData
  | AbmahnungData
  | KuendigungData
