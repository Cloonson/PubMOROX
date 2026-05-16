import PizZip from 'pizzip';
import { readFileSync, writeFileSync } from 'fs';

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceParagraphText(originalXml, newText) {
  const pPrMatch = originalXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const rPrMatch = originalXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : '';
  const pAttrs = (originalXml.match(/<w:p ([^>]+)>/) || ['', ''])[1];
  return `<w:p ${pAttrs}>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`;
}

const buf = readFileSync('public/change/Änderungsvereinbarung Huma Khurshid Mai 2026.docx');
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g);

const replacements = {
  13: replaceParagraphText(paragraphs[13], '{gender} {vorname} {nachname},'),
  17: replaceParagraphText(paragraphs[17], 'Die Parteien verbindet ein {vertragsart} Arbeitsvertrag vom {vertragsdatum}.'),
  18: replaceParagraphText(paragraphs[18], 'Nunmehr kommen die Parteien darin überein, dass ab dem {aenderungsdatum} folgende Änderungen wirksam werden sollen:'),
  20: replaceParagraphText(paragraphs[20], '{aenderungen}'),
};

let newXml = xml;
let offset = 0;
const originalParagraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];

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
writeFileSync('public/change/av_aenderung.docx', out);
console.log('Written: public/change/av_aenderung.docx');
