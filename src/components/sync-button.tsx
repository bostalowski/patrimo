"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_SYNC_INTERVAL_MINUTES } from "@/lib/prices/schedule";

const TICK_MS = 60 * 1000;

function lastSyncAge(lastSync: string | null): number {
  if (!lastSync) return Number.POSITIVE_INFINITY;
  const then = new Date(lastSync).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Date.now() - then;
}

function formatRelative(lastSync: string | null): string {
  const age = lastSyncAge(lastSync);
  if (!Number.isFinite(age)) return "Jamais synchronisé";
  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) return "Synchronisé à l'instant";
  if (minutes < 60) return `Synchronisé il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synchronisé il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Synchronisé il y a ${days} j`;
}

export function SyncButton({
  lastSync = null,
  intervalMinutes = DEFAULT_SYNC_INTERVAL_MINUTES,
  className,
}: {
  lastSync?: string | null;
  intervalMinutes?: number;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState(() => formatRelative(lastSync));
  const syncingRef = useRef(false);
  const staleMs = intervalMinutes * 60_000;

  const sync = useCallback(
    async (auto: boolean) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setBusy(true);
      try {
        const url = auto ? "/api/prices/sync?ifStale=1" : "/api/prices/sync";
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
        syncingRef.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    setCaption(formatRelative(lastSync));
    if (lastSyncAge(lastSync) > staleMs) sync(true);

    const tick = setInterval(() => {
      setCaption(formatRelative(lastSync));
      if (lastSyncAge(lastSync) > staleMs) sync(true);
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [lastSync, staleMs, sync]);

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={() => sync(false)}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
        {busy ? "Synchronisation…" : "Sync cours"}
      </button>
      <span className="text-xs text-zinc-400 dark:text-zinc-500">
        {busy ? "Synchronisation…" : caption}
      </span>
    </div>
  );
}
