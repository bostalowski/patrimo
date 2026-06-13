"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  Coins,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Pencil,
  PiggyBank,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/actifs", label: "Actifs", icon: Coins },
  { href: "/comptes", label: "Comptes", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/fiscalite", label: "Fiscalité", icon: Landmark },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/projection", label: "Projection", icon: TrendingUp },
  { href: "/dca", label: "DCA", icon: Calculator },
  { href: "/prix-manuels", label: "Prix manuels", icon: Pencil },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-2 px-2">
        <BarChart3 className="h-5 w-5 text-emerald-500" />
        <span className="text-base font-semibold tracking-tight">
          Patrimo
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
