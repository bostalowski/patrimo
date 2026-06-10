import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "danger" | "warning" | "info";

const variants: Record<Variant, string> = {
  default:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  danger:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
