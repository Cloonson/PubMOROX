import PizZip from 'pizzip';
import { readFileSync, writeFileSync } from 'fs';

function escapeXml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getAttrs(p) {
  return (p.match(/<w:p ([^>]+)>/) || ['',''])[1];
}
function getPPr(p) {
  return (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
}
function getFirstRPr(p) {
  return (p.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
}

function makeP(orig, text) {
  const attrs = getAttrs(orig);
  const pPr = getPPr(orig);
  const rPr = getFirstRPr(orig);
  const lines = text.split('\n');
  const runs = lines.map((line, i) => {
    const br = i < lines.length - 1 ? `<w:r><w:br/></w:r>` : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>${br}`;
  }).join('');
  return `<w:p ${attrs}>${pPr}${runs}</w:p>`;
}

function emptyP(orig) {
  const attrs = getAttrs(orig);
  const pPr = getPPr(orig);
  return `<w:p ${attrs}>${pPr}</w:p>`;
}

function applyReplacements(xml, replacements) {
  const matches = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];
  let result = xml;
  let offset = 0;
  for (const [idx, newP] of Object.entries(replacements)) {
    const m = matches[parseInt(idx)];
    if (!m) continue;
    result = result.slice(0, m.index + offset) + newP + result.slice(m.index + offset + m[0].length);
    offset += newP.length - m[0].length;
  }
  return result;
}

function getParagraphs(xml) {
  return xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
}

function getText(p) {
  return (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g,'')).join('');
}

function saveDocx(zip, path) {
  const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(path, out);
  console.log('Written:', path);
}

// ─── 1. KÜNDIGUNG ────────────────────────────────────────────────────────────
{
  const buf = readFileSync('public/kuendigung/Kündigung Lena Wosmüller 2023.docx');
  const zip = new PizZip(buf);
  let xml = zip.file('word/document.xml').asText();
  const ps = getParagraphs(xml);

  const repl = {
    1:  makeP(ps[1],  'Pflegedienst MORO GmbH • Provinzialstraße 82 • 44388 Dortmund\n{gender} {vorname} {nachname}\n{street}\n{city}'),
    3:  makeP(ps[3],  'Dortmund, den {date}'),
    6:  makeP(ps[6],  'Sehr geehrte/r {gender} {nachname},'),
    7:  makeP(ps[7],  'hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis {type === \'ordentlich\' ? \'ordentlich und fristgerecht\' : \'fristlos und außerordentlich aus wichtigem Grund\'} zum {kdate}.{#reason}\n\nGrund: {reason}{/reason}'),
    8:  makeP(ps[8],  'Wir möchten Sie darauf hinweisen, dass Sie sich unverzüglich an die Agentur für Arbeit wenden und arbeitssuchend melden müssen. Kommen Sie Ihrer Meldepflicht nicht nach, können finanzielle Nachteile entstehen.'),
    9:  makeP(ps[9],  'Falls Sie noch im Besitz von Arbeitskleidung oder Schlüsseln sind, bitten wir Sie uns diese schnellstmöglich, spätestens jedoch drei (3) Tage nach dem Ende des Arbeitsverhältnisses am {last}, zurückzugeben.'),
  };

  zip.file('word/document.xml', applyReplacements(xml, repl));
  saveDocx(zip, 'public/kuendigung/kuendigung.docx');
}

// ─── 2. ABMAHNUNG ────────────────────────────────────────────────────────────
{
  const buf = readFileSync('public/mahnung/Mahnung Wosmüller 03_2023.docx');
  const zip = new PizZip(buf);
  let xml = zip.file('word/document.xml').asText();
  const ps = getParagraphs(xml);

  const repl = {
    2:  makeP(ps[2],  'Pflegedienst MORO GmbH • Provinzialstraße 82 • 44388 Dortmund\n{gender} {vorname} {nachname}\n{street}\n{city}'),
    4:  makeP(ps[4],  'Dortmund, den {date}'),
    6:  makeP(ps[6],  '{gender === \'Herr\' ? \'Sehr geehrter Herr\' : \'Sehr geehrte Frau\'} {nachname},'),
    7:  makeP(ps[7],  '{beschreibung}'),
    8:  makeP(ps[8],  'Wir fordern Sie hiermit ausdrücklich auf, dieses Verhalten in Zukunft zu unterlassen. {konsequenz}'),
  };

  zip.file('word/document.xml', applyReplacements(xml, repl));
  saveDocx(zip, 'public/mahnung/abmahnung.docx');
}

// ─── 3. ZEUGNISSE — tense-aware via {beendet === 'ja' ? ... : ...} ─────────

const zeugnisTexte = {
  male: {
    gut: {
      leistung: `Herr {nachname} war stets eigenmotiviert und realisierte beharrlich die gesetzten und selbstgesteckten Ziele. Er zeigte eine gute Übersicht und Arbeitseinteilung, vor allem auch in Situationen mit turbulentem Geschäftsbetrieb und mit erheblicher Arbeitsbelastung. Er {beendet === 'ja' ? 'verfügte' : 'verfügt'} über ein umfassendes Fachwissen, welches er zur Bewältigung seiner Aufgaben erfolgreich einsetzte. Herr {nachname} lieferte eine konstant gute Arbeitsqualität. Seine Aufgaben erledigte er selbstständig mit Sorgfalt, Genauigkeit und stets zu unserer vollen Zufriedenheit.`,
      sozial: `Herr {nachname} war ein verantwortungsbewusster und zuverlässiger Mitarbeiter. Sein Verhalten gegenüber Vorgesetzten und Mitarbeitern war stets einwandfrei.\n\nHerr {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende} auf eigenen Wunsch. Wir danken ihm für die hervorragende Zusammenarbeit und bedauern es sehr, ihn als Mitarbeiter {beendet === 'ja' ? 'verloren zu haben' : 'zu verlieren'}. Für seinen weiteren Berufs- und Lebensweg wünschen wir ihm alles Gute und auch weiterhin viel Erfolg.`,
    },
    mittel: {
      leistung: `Herr {nachname} zeigte sich motiviert und erfüllte die ihm gestellten Aufgaben. Er {beendet === 'ja' ? 'verfügte' : 'verfügt'} über solides Fachwissen, welches er zur Bewältigung seiner Aufgaben einsetzte. Die Arbeitsqualität von Herrn {nachname} entsprach den Anforderungen. Seine Aufgaben erledigte er zu unserer Zufriedenheit.`,
      sozial: `Herr {nachname} war ein pflichtbewusster Mitarbeiter. Sein Verhalten gegenüber Vorgesetzten und Mitarbeitern war korrekt.Herr {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende}. Wir wünschen ihm für seinen weiteren Berufs- und Lebensweg alles Gute.`,
    },
    schlecht: {
      leistung: `Herr {nachname} war bemüht, die ihm übertragenen Aufgaben zu erfüllen. Er setzte das vorhandene Fachwissen ein, um seinen Arbeitsbereich zu bewältigen. Die Arbeitsqualität von Herrn {nachname} entsprach überwiegend unseren Anforderungen. Seine Aufgaben erledigte er zu unserer überwiegenden Zufriedenheit.`,
      sozial: `Herr {nachname} verhielt sich gegenüber Vorgesetzten und Mitarbeitern im Wesentlichen korrekt.Herr {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende}. Wir wünschen ihm für seinen weiteren Berufs- und Lebensweg alles Gute.`,
    },
  },
  female: {
    gut: {
      leistung: `Frau {nachname} war stets eigenmotiviert und realisierte beharrlich die gesetzten und selbstgesteckten Ziele. Sie zeigte eine gute Übersicht und Arbeitseinteilung, vor allem auch in Situationen mit turbulentem Geschäftsbetrieb und mit erheblicher Arbeitsbelastung. Sie {beendet === 'ja' ? 'verfügte' : 'verfügt'} über ein umfassendes Fachwissen, welches sie zur Bewältigung ihrer Aufgaben erfolgreich einsetzte. Frau {nachname} lieferte eine konstant gute Arbeitsqualität. Ihre Aufgaben erledigte sie selbstständig mit Sorgfalt, Genauigkeit und stets zu unserer vollen Zufriedenheit.`,
      sozial: `Frau {nachname} war eine verantwortungsbewusste und zuverlässige Mitarbeiterin. Ihr Verhalten gegenüber Vorgesetzten und Mitarbeitern war stets einwandfrei.Frau {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende} auf eigenen Wunsch. Wir danken ihr für die hervorragende Zusammenarbeit und bedauern es sehr, sie als Mitarbeiterin {beendet === 'ja' ? 'verloren zu haben' : 'zu verlieren'}. Für ihren weiteren Berufs- und Lebensweg wünschen wir ihr alles Gute und auch weiterhin viel Erfolg.`,
    },
    mittel: {
      leistung: `Frau {nachname} zeigte sich motiviert und erfüllte die ihr gestellten Aufgaben. Sie {beendet === 'ja' ? 'verfügte' : 'verfügt'} über solides Fachwissen, welches sie zur Bewältigung ihrer Aufgaben einsetzte. Die Arbeitsqualität von Frau {nachname} entsprach den Anforderungen. Ihre Aufgaben erledigte sie zu unserer Zufriedenheit.`,
      sozial: `Frau {nachname} war eine pflichtbewusste Mitarbeiterin. Ihr Verhalten gegenüber Vorgesetzten und Mitarbeitern war korrekt.Frau {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende}. Wir wünschen ihr für ihren weiteren Berufs- und Lebensweg alles Gute.`,
    },
    schlecht: {
      leistung: `Frau {nachname} war bemüht, die ihr übertragenen Aufgaben zu erfüllen. Sie setzte das vorhandene Fachwissen ein, um ihren Arbeitsbereich zu bewältigen. Die Arbeitsqualität von Frau {nachname} entsprach überwiegend unseren Anforderungen. Ihre Aufgaben erledigte sie zu unserer überwiegenden Zufriedenheit.`,
      sozial: `Frau {nachname} verhielt sich gegenüber Vorgesetzten und Mitarbeitern im Wesentlichen korrekt.Frau {nachname} {beendet === 'ja' ? 'verließ' : 'verlässt'} unser Unternehmen zum {ende}. Wir wünschen ihr für ihren weiteren Berufs- und Lebensweg alles Gute.`,
    },
  },
};

const zeugnisHeaderP4 = {
  male: `Herr {vorname} {nachname}, geboren am {bday} in {cofbirth}, {beendet === 'ja' ? 'war' : 'ist'} seit dem {begin} als {prof} in unserem Unternehmen beschäftigt.\nDie Pflegedienst MORO GmbH ist ein ambulanter Pflegedienst mit Sitz in Dortmund. Das Unternehmen versorgt rund 100 Patienten aus Bochum und Dortmund, bei denen pflegerische als auch hauswirtschaftliche Leistungen benötigt werden.\nSein Aufgabengebiet umfasste im Wesentlichen alle Tätigkeiten als {prof}.`,
  female: `Frau {vorname} {nachname}, geboren am {bday} in {cofbirth}, {beendet === 'ja' ? 'war' : 'ist'} seit dem {begin} als {prof} in unserem Unternehmen beschäftigt.\nDie Pflegedienst MORO GmbH ist ein ambulanter Pflegedienst mit Sitz in Dortmund. Das Unternehmen versorgt rund 100 Patienten aus Bochum und Dortmund, bei denen pflegerische als auch hauswirtschaftliche Leistungen benötigt werden.\nIhr Aufgabengebiet umfasste im Wesentlichen alle Tätigkeiten als {prof}.`,
};

const zeugnisHeaderP1 = {
  male: `Pflegedienst MORO GmbH • Provinzialstraße 82 • 44388 Dortmund\nHerr {vorname} {nachname}\n{street}\n{city}`,
  female: `Pflegedienst MORO GmbH • Provinzialstraße 82 • 44388 Dortmund\nFrau {vorname} {nachname}\n{street}\n{city}`,
};

for (const [sex, grades] of Object.entries(zeugnisTexte)) {
  const basePath = sex === 'male'
    ? 'public/zeugnisse/Arbeitszeugnis_male_good.docx'
    : 'public/zeugnisse/Arbeitszeugnis_female_good.docx';

  const baseBuf = readFileSync(basePath);

  for (const [grade, texts] of Object.entries(grades)) {
    const zip = new PizZip(baseBuf);
    const xml = zip.file('word/document.xml').asText();
    const ps = getParagraphs(xml);

    const repl = {
      1: makeP(ps[1], zeugnisHeaderP1[sex]),
      2: makeP(ps[2], 'Dortmund, den {date}'),
      4: makeP(ps[4], zeugnisHeaderP4[sex]),
      5: makeP(ps[5], texts.leistung),
      6: makeP(ps[6], texts.sozial),
    };

    zip.file('word/document.xml', applyReplacements(xml, repl));
    const outPath = `public/zeugnisse/Arbeitszeugnis_${sex}_${grade}.docx`;
    saveDocx(zip, outPath);
  }
}
