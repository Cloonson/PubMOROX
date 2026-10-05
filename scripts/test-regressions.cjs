const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const repo = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(repo, request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};
const { missingHandzeichenFields } = require('../lib/handzeichenliste-validation.ts');
const { EMPTY_ROW, paginate } = require('../lib/handzeichenliste-service.ts');
const { EMPTY_MONTH, computeMonths, resturlaubstage } = require('../lib/stundenliste-service.ts');
const { buildStundenlisteWorkbook, importStundenlisten } = require('../lib/stundenliste-excel.ts');
const ExcelJS = require('exceljs');
const { saveGeneratedFile, isExportCancelled, safeExportName } = require('../lib/file-export.ts');

async function run() {
  assert.equal(safeExportName('Vertrag: Anna/Max.docx'), 'Vertrag_ Anna_Max.docx');
  assert.equal(safeExportName('CON.pdf'), '_CON.pdf');
  const file = new Blob(['example pdf'], { type: 'application/pdf' });
  const chosenPath = 'C:\\Users\\Muster\\Desktop\\Meine Datei.pdf';
  const saves = [];
  const services = { save: async (filename, bytes) => { saves.push({filename, bytes}); return {path: chosenPath, openError: null}; }, reveal: async () => {} };
  assert.equal(await saveGeneratedFile(file, 'Meine Datei.pdf', services), chosenPath);
  assert.equal(Buffer.from(saves[0].bytes).toString(), 'example pdf');
  await assert.rejects(saveGeneratedFile(file, 'Meine Datei.pdf', { ...services, save: async () => null }), isExportCancelled);
  await assert.rejects(saveGeneratedFile(file, 'Meine Datei.pdf', { ...services, save: async () => { throw new Error('disk full'); } }), /disk full/);
  // Failed automatic opening must preserve the successful save, never trigger
  // a browser download or convert it into an export failure.
  assert.equal(await saveGeneratedFile(file, 'Meine Datei.pdf', { ...services, save: async () => ({path: chosenPath, openError: 'no browser'}) }), chosenPath);

  const person = { ...EMPTY_ROW, nachname: 'Muster', vorname: 'Anna', anschrift: 'Musterweg 1', qualifikation: 'K', wochenstunden: '0', beschaeftigungsbeginn: '01.01.2026' };
  const draft = { periodeLabel: '2026', pdlRow: person, stellvPdlRow: person, weitereMitarbeiter: [person] };
  assert.equal(paginate(draft.weitereMitarbeiter)[0].length, 11);
  assert.deepEqual(missingHandzeichenFields(draft), [], 'padding, optional departure dates and zero hours must not trigger warnings');
  const incomplete = { ...draft, weitereMitarbeiter: [{ ...person, vorname: '', anschrift: '  ' }] };
  assert.deepEqual(missingHandzeichenFields(incomplete).map(f => f.key), ['mitarbeiter.0.name', 'mitarbeiter.0.anschrift']);
  assert.equal(missingHandzeichenFields({ ...draft, pdlRow: null }).length, 5);
  assert.equal(missingHandzeichenFields({ ...draft, weitereMitarbeiter: [EMPTY_ROW] }).length, 5, 'explicitly added empty row must be checked');
  assert.equal(missingHandzeichenFields({ ...draft, periodeLabel: ' ' })[0].key, 'periode');

  const sheet = { id: 's1', employeeId: 'e1', year: 2026, stundenVormonatJan: 10, urlaubsanspruchLaufendesJahr: 30, resturlaubsanspruchVorjahr: 5, months: Array.from({ length: 12 }, (_, i) => ({ ...EMPTY_MONTH, stundenAktuell: 160, ausgezahlt: 150, ausgezahlteUeberstunden: 5, urlaubGenommen: i === 0 ? 2 : i === 11 ? 3 : 0 })), archiviert: false, createdAt: 0, updatedAt: 0 };
  const months = computeMonths(sheet);
  assert.equal(months[0].summe, 170);
  assert.equal(months[0].reststunden, 15);
  assert.equal(months[1].stundenVormonat, 15);
  assert.equal(months[0].urlaubsanspruch, 35);
  assert.equal(months[1].urlaubsanspruch, 33);
  assert.equal(resturlaubstage(sheet, months), 30);
  const wb = await buildStundenlisteWorkbook([{ employee: { id: 'e1', nachname: 'Muster', vorname: 'Anna' }, sheet }]);
  const ws = wb.worksheets[0];
  // Independently evaluate the exported arithmetic formulas from their cell references.
  function evaluate(address, checkCaches = true) {
    const value = ws.getCell(address).value;
    if (typeof value === 'number') return value;
    assert.ok(value && typeof value.formula === 'string', `unexpected value at ${address}`);
    const expression = value.formula.replace(/[A-Z]+[0-9]+/g, ref => `(${evaluate(ref, checkCaches)})`);
    assert.match(expression, /^[0-9+\-().\s]+$/);
    const result = Function(`"use strict"; return (${expression});`)();
    if (checkCaches) assert.equal(value.result, result, `cached result at ${address} disagrees with formula`);
    return result;
  }
  for (let i = 0; i < 12; i++) {
    const col = String.fromCharCode(66 + i);
    assert.equal(evaluate(`${col}4`), 170 + i * 5);
    assert.equal(evaluate(`${col}7`), 15 + i * 5);
    assert.equal(evaluate(`${col}11`), i === 0 ? 35 : 33);
  }
  assert.equal(evaluate('N11'), 30);
  ws.getCell('B15').value = 40;
  assert.equal(evaluate('B11', false), 45);
  assert.equal(evaluate('C11', false), 43);
  ws.getCell('B2').value = -10;
  assert.equal(evaluate('B4', false), 150);
  assert.equal(evaluate('C2', false), -5);
  ws.getCell('B2').value = 10;
  // Restore temporary test inputs before roundtrip.
  ws.getCell('B15').value = 30;
  const bytes = await wb.xlsx.writeBuffer();
  const roundtrip = await importStundenlisten(bytes);
  assert.equal(roundtrip[0].urlaubsanspruchLaufendesJahr, 30, 'carryover must not be counted twice when reimporting');
  assert.equal(roundtrip[0].resturlaubsanspruchVorjahr, 5);
  assert.equal(roundtrip[0].stundenVormonatJan, 10);
  assert.deepEqual(roundtrip[0].months, sheet.months);
  const legacy = new ExcelJS.Workbook();
  const legacyWs = legacy.addWorksheet('Muster, Anna');
  legacyWs.getCell('A1').value = 2025;
  legacyWs.getCell('B11').value = 30;
  legacyWs.getCell('B14').value = 5;
  legacyWs.getCell('B3').value = 160;
  legacyWs.getCell('B4').value = { formula: 'B3+10', result: 170 };
  const old = await importStundenlisten(await legacy.xlsx.writeBuffer());
  assert.equal(old[0].urlaubsanspruchLaufendesJahr, 30);
  assert.equal(old[0].stundenVormonatJan, 10, 'legacy January carryover must be reconstructed');
  console.log('Passed: save/cancel/write-error/open-error handling, missing-field validation, 12 months of exported formulas/caches, year-end balances, new and legacy Excel import.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
