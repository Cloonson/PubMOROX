import PizZip from 'pizzip';
import { readFileSync, writeFileSync } from 'fs';

// Build a replacement paragraph: keeps pPr and first rPr, sets new text
function replaceParagraphText(originalXml, newText) {
  const pPrMatch = originalXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const rPrMatch = originalXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : '';
  const pAttrs = (originalXml.match(/<w:p ([^>]+)>/) || ['', ''])[1];
  return `<w:p ${pAttrs}>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`;
}

// Build an empty paragraph (just pPr)
function emptyParagraph(originalXml) {
  const pPrMatch = originalXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const pAttrs = (originalXml.match(/<w:p ([^>]+)>/) || ['', ''])[1];
  return `<w:p ${pAttrs}>${pPr}</w:p>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fixContract(inputPath, outputPath, isBefristet) {
  const buf = readFileSync(inputPath);
  const zip = new PizZip(buf);
  let xml = zip.file('word/document.xml').asText();

  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g);

  const replacements = {};

  // P11: befristet vs unbefristet intro
  if (isBefristet) {
    replacements[11] = replaceParagraphText(paragraphs[11], 'wird der folgende befristete Arbeitsvertrag geschlossen:');
  } else {
    replacements[11] = replaceParagraphText(paragraphs[11], 'wird der folgende unbefristete Arbeitsvertrag geschlossen:');
  }

  // P13: §1 body — remove geringfügig
  replacements[13] = replaceParagraphText(paragraphs[13],
    'Das Arbeitsverhältnis beginnt am {begin}. {gender} {vorname} {nachname} wird als {prof} eingestellt.'
  );

  // P14: §2 title — for unbefristet, no "Ende"
  if (!isBefristet) {
    replacements[14] = replaceParagraphText(paragraphs[14], '§ 2 Beginn des Arbeitsverhältnisses');
  }

  // P15: befristung end — for unbefristet, change to open-ended
  if (!isBefristet) {
    replacements[15] = replaceParagraphText(paragraphs[15],
      'Das Arbeitsverhältnis wird auf unbestimmte Zeit geschlossen.'
    );
  }
  // for befristet, P15 already says "Das Arbeitsverhältnis ist befristet und endet, ohne dass es einer Kündigung bedarf zum {ende}." — keep as is

  // P21: §4 Vergütung — remove {grenz}
  replacements[21] = replaceParagraphText(paragraphs[21],
    'Der Arbeitnehmer erhält eine stündliche Bruttovergütung von {wage} EUR. Die Vergütung ist jeweils am 1. des nächsten Monats fällig.'
  );

  // P22: Pauschalabgabe/Bundesknappschaft — remove (geringfügig-specific)
  replacements[22] = emptyParagraph(paragraphs[22]);

  // P23: Zuschläge — keep for normal workers, but make optional note
  // Actually keep it — applies to Pflege workers on weekends
  // No change to P23 / P24

  // P26: Arbeitszeit — replace geringfügig Entgeltgrenze with proper text
  replacements[26] = replaceParagraphText(paragraphs[26],
    'Die Arbeitszeit richtet sich nach dem Umfang der tatsächlich anfallenden Arbeit und bemisst sich so, dass die wöchentliche Arbeitszeit {tagewoche} Tage umfasst. Die monatliche Arbeitszeit beträgt mindestens {minstunden} bis höchstens {stundenmax} Stunden.'
  );

  // P47: §11 title — change from Rentenversicherungsfreiheit to Salvatorische Klausel
  replacements[47] = replaceParagraphText(paragraphs[47], '§ 11 Salvatorische Klausel');

  // P48: §11 body 1 — replace with Salvatorische Klausel content
  replacements[48] = replaceParagraphText(paragraphs[48],
    'Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder nach Vertragsschluss unwirksam oder undurchführbar werden, bleibt davon die Wirksamkeit des Vertrages im Übrigen unberührt.'
  );

  // P49: §11 body 2 — replace with second sentence of Salvatorische Klausel
  replacements[49] = replaceParagraphText(paragraphs[49],
    'An die Stelle der unwirksamen oder undurchführbaren Bestimmung soll diejenige wirksame und durchführbare Regelung treten, deren Wirkungen der wirtschaftlichen Zielsetzung am nächsten kommen, die die Vertragsparteien mit der unwirksamen bzw. undurchführbaren Bestimmung verfolgt haben.'
  );

  // P50: §12 title — fix (currently "§ 12 Salvatorische Klausel" but content is probezeit)
  replacements[50] = replaceParagraphText(paragraphs[50], '§ 12 Schriftform');

  // P51: §12 body 1 — replace misplaced probezeit content with Schriftform content
  replacements[51] = replaceParagraphText(paragraphs[51],
    'Änderungen und Ergänzungen dieses Arbeitsvertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Aufhebung des Schriftformerfordernisses selbst.'
  );

  // P52: §12 body 2 — replace
  replacements[52] = replaceParagraphText(paragraphs[52],
    'Mündliche Nebenabreden wurden nicht getroffen. Etwaige mündliche Vereinbarungen sind unwirksam.'
  );

  // P53: §12 body 3 — replace
  replacements[53] = replaceParagraphText(paragraphs[53],
    'Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Dortmund.'
  );

  // Apply replacements
  let newXml = xml;
  let offset = 0;
  const originalParagraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];

  // Build replacement map by original index
  for (const [idx, newParagraph] of Object.entries(replacements)) {
    const i = parseInt(idx);
    const match = originalParagraphs[i];
    if (!match) continue;
    newXml = newXml.slice(0, match.index + offset) +
             newParagraph +
             newXml.slice(match.index + offset + match[0].length);
    offset += newParagraph.length - match[0].length;
  }

  zip.file('word/document.xml', newXml);
  const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(outputPath, out);
  console.log(`Written: ${outputPath}`);
}

fixContract(
  'public/contracts/av_befristet.docx',
  'public/contracts/av_befristet.docx',
  true
);

fixContract(
  'public/contracts/av_unbefristet.docx',
  'public/contracts/av_unbefristet.docx',
  false
);
