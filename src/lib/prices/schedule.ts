export const DEFAULT_SYNC_INTERVAL_MINUTES = 30;
export const MIN_SYNC_INTERVAL_MINUTES = 5;
export const MAX_SYNC_INTERVAL_MINUTES = 1440;

export const SYNC_INTERVAL_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 heure" },
  { minutes: 240, label: "4 heures" },
  { minutes: 720, label: "12 heures" },
  { minutes: 1440, label: "1 jour" },
];

export function clampSyncIntervalMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SYNC_INTERVAL_MINUTES;
  }
  return Math.min(
    MAX_SYNC_INTERVAL_MINUTES,
    Math.max(MIN_SYNC_INTERVAL_MINUTES, value),
  );
}

export type ShouldRunSyncInput = {
  ifStale: boolean;
  lastSync: string | null;
  now: number;
  intervalMinutes: number;
};

export function shouldRunSync(input: ShouldRunSyncInput): boolean {
  if (!input.ifStale) return true;
  if (!input.lastSync) return true;
  const ageMs = input.now - new Date(input.lastSync).getTime();
  return ageMs > input.intervalMinutes * 60_000;
}
