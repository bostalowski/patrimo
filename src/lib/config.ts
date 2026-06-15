import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { clampInflationRate, DEFAULT_INFLATION_RATE } from "@/lib/inflation";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
  ? resolve(process.env.FINGRAPHS_DATA_DIR)
  : resolve(process.cwd(), "data");

const CONFIG_FILE = resolve(DATA_DIR, "config.json");

export type AppConfig = {
  excelPath: string | null;
  inflationRate: number;
};

const DEFAULT_CONFIG: AppConfig = {
  excelPath: null,
  inflationRate: DEFAULT_INFLATION_RATE,
};

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

export function getDataDir(): string {
  return DATA_DIR;
}

export function readConfig(): AppConfig {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      excelPath:
        typeof parsed.excelPath === "string" && parsed.excelPath.trim().length > 0
          ? parsed.excelPath
          : null,
      inflationRate:
        typeof parsed.inflationRate === "number"
          ? clampInflationRate(parsed.inflationRate)
          : DEFAULT_INFLATION_RATE,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }
}

export function writeConfig(config: AppConfig): void {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function expandUserPath(input: string): string {
  return input.startsWith("~")
    ? input.replace(/^~(?=$|\/|\\)/, homedir())
    : input;
}

export function resolveUserPath(input: string): string {
  return resolve(expandUserPath(input));
}

export function getInflationRate(): number {
  return clampInflationRate(readConfig().inflationRate);
}

export function getConfiguredExcelPath(): string | null {
  const fromConfig = readConfig().excelPath;
  if (fromConfig && fromConfig.trim().length > 0) {
    return resolveUserPath(fromConfig);
  }
  const fromEnv = process.env.EXCEL_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return resolveUserPath(fromEnv);
  }
  return null;
}
