"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/prices/sync", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const isLoading = busy || pending;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
        className,
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
      {isLoading ? "Synchronisation…" : "Sync cours"}
    </button>
  );
}
