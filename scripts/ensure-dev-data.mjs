import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Dev convenience only: seeds a sample workbook so `npm run dev` / `electron:dev`
// always have data to look at. Never touches an existing data/config.json, and
// is wired only as predev / preelectron:dev — never from build/start/electron:build/pack.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const dataDir = process.env.FINGRAPHS_DATA_DIR
  ? resolve(process.env.FINGRAPHS_DATA_DIR)
  : resolve(repoRoot, "data");

const configPath = resolve(dataDir, "config.json");

if (existsSync(configPath)) {
  console.log(
    "[ensure-dev-data] data/config.json already present — leaving existing configuration untouched.",
  );
  process.exit(0);
}

const fixtureSrc = resolve(repoRoot, "data-fixtures", "sample-portfolio.xlsx");
const workbookDest = resolve(dataDir, "sample-portfolio.xlsx");

mkdirSync(dataDir, { recursive: true });
copyFileSync(fixtureSrc, workbookDest);

writeFileSync(
  configPath,
  JSON.stringify(
    { excelPath: workbookDest, inflationRate: 0.02, syncIntervalMinutes: 30 },
    null,
    2,
  ) + "\n",
  "utf-8",
);

console.log(
  `[ensure-dev-data] No data/config.json found — seeded sample workbook at ${workbookDest}`,
);
