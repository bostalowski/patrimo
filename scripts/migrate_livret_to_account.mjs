import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const SHEET_TRANSACTIONS = "Transactions";
const SHEET_ACTIFS = "Actifs";
const SHEET_COMPTES = "Comptes";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail(
    "chemin du fichier Excel manquant.\nUsage : node scripts/migrate_livret_to_account.mjs <chemin/vers/Investissement.xlsx>",
  );
}

const absolutePath = resolve(inputPath);

function readSheetAoa(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) fail(`feuille "${sheetName}" introuvable.`);
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const headers = (aoa[0] ?? []).map((h) => String(h ?? ""));
  if (headers.length === 0) fail(`feuille "${sheetName}" sans ligne d'en-tête.`);
  return { headers, rows: aoa.slice(1) };
}

function columnIndex(headers, name) {
  const index = headers.indexOf(name);
  if (index === -1) fail(`colonne "${name}" manquante.`);
  return index;
}

function ensureColumn(headers, name) {
  let index = headers.indexOf(name);
  if (index === -1) {
    headers.push(name);
    index = headers.length - 1;
  }
  return index;
}

function cell(row, index) {
  return index < row.length ? (row[index] ?? null) : null;
}

const buffer = readFileSync(absolutePath);
const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

const actifs = readSheetAoa(workbook, SHEET_ACTIFS);
const comptes = readSheetAoa(workbook, SHEET_COMPTES);
const transactions = readSheetAoa(workbook, SHEET_TRANSACTIONS);

const actifIdIdx = columnIndex(actifs.headers, "ID");
const actifTypeIdx = columnIndex(actifs.headers, "Type");
const actifLabelIdx = columnIndex(actifs.headers, "Libellé");
const actifTauxIdx = actifs.headers.indexOf("Taux");
const actifPlafondIdx = actifs.headers.indexOf("Plafond");

const livretAssets = actifs.rows
  .filter((row) => String(cell(row, actifTypeIdx) ?? "").trim() === "LIVRET")
  .map((row) => ({
    id: String(cell(row, actifIdIdx) ?? "").trim(),
    label: String(cell(row, actifLabelIdx) ?? "").trim(),
    rate: actifTauxIdx === -1 ? null : cell(row, actifTauxIdx),
    plafond: actifPlafondIdx === -1 ? null : cell(row, actifPlafondIdx),
  }));

if (livretAssets.length === 0) {
  console.log("Aucun actif de type LIVRET trouvé. Rien à migrer.");
  process.exit(0);
}

const backupPath = `${absolutePath}.bak`;
copyFileSync(absolutePath, backupPath);
console.log(`Sauvegarde créée : ${backupPath}`);

const compteIdIdx = columnIndex(comptes.headers, "ID");
const compteLabelIdx = columnIndex(comptes.headers, "Libellé");
const compteTypeIdx = columnIndex(comptes.headers, "Type");
const compteEnvIdx = columnIndex(comptes.headers, "Enveloppe");
const compteTauxIdx = ensureColumn(comptes.headers, "Taux");
const comptePlafondIdx = ensureColumn(comptes.headers, "Plafond");

const existingAccountIds = new Set(
  comptes.rows
    .map((row) => String(cell(row, compteIdIdx) ?? "").trim())
    .filter(Boolean),
);

function uniqueAccountId(base) {
  if (!existingAccountIds.has(base)) return base;
  let suffix = 2;
  while (existingAccountIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

const accountIdByAsset = new Map();

for (const livret of livretAssets) {
  const accountId = uniqueAccountId(livret.id || "livret");
  existingAccountIds.add(accountId);
  accountIdByAsset.set(livret.id, accountId);

  const newRow = new Array(comptes.headers.length).fill(null);
  newRow[compteIdIdx] = accountId;
  newRow[compteLabelIdx] = livret.label || accountId;
  newRow[compteTypeIdx] = "BANQUE";
  newRow[compteEnvIdx] = "LIVRET";
  newRow[compteTauxIdx] = livret.rate ?? null;
  newRow[comptePlafondIdx] = livret.plafond ?? null;
  comptes.rows.push(newRow);

  console.log(
    `Livret "${livret.label || livret.id}" -> compte ${accountId} (taux ${livret.rate ?? "—"}, plafond ${livret.plafond ?? "—"}).`,
  );
}

const txCompteIdx = columnIndex(transactions.headers, "Compte");
const txActifIdx = columnIndex(transactions.headers, "Actif");

let reassigned = 0;
for (const row of transactions.rows) {
  const actif = String(cell(row, txActifIdx) ?? "").trim();
  const accountId = accountIdByAsset.get(actif);
  if (!accountId) continue;
  while (row.length < transactions.headers.length) row.push(null);
  row[txCompteIdx] = accountId;
  row[txActifIdx] = null;
  reassigned += 1;
}
console.log(`${reassigned} transaction(s) réaffectée(s) au compte livret (sans actif).`);

const livretAssetIds = new Set(livretAssets.map((l) => l.id));
const keptActifs = actifs.rows.filter(
  (row) => !livretAssetIds.has(String(cell(row, actifIdIdx) ?? "").trim()),
);
console.log(`${actifs.rows.length - keptActifs.length} actif(s) LIVRET supprimé(s).`);

function writeSheet(sheetName, headers, rows) {
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([headers, ...rows], {
    cellDates: true,
  });
}

writeSheet(SHEET_ACTIFS, actifs.headers, keptActifs);
writeSheet(SHEET_COMPTES, comptes.headers, comptes.rows);
writeSheet(SHEET_TRANSACTIONS, transactions.headers, transactions.rows);

const out = XLSX.write(workbook, {
  type: "buffer",
  bookType: "xlsx",
  cellDates: true,
});
writeFileSync(absolutePath, out);

console.log(`Migration terminée : ${absolutePath}`);
