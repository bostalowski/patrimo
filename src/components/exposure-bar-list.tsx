import { formatEuro, formatPercent } from "@/lib/utils";

export type ExposureBarItem = {
	key: string;
	label: string;
	weight: number;
	marketValue?: number;
};

/**
 * Horizontal percentage bars (Amundi-style): label | track fill | % · €.
 * Bar width is absolute on a 0–100 % track.
 */
export function ExposureBarList({ items }: { items: ExposureBarItem[] }) {
	if (items.length === 0) return null;

	return (
		<ul className="space-y-2.5" role="list">
			{items.map((item) => {
				const pct = Math.max(0, Math.min(1, item.weight));
				return (
					<li key={item.key} className="grid grid-cols-[minmax(7rem,9.5rem)_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
						<span className="truncate text-right text-zinc-700 dark:text-zinc-200">
							{item.label}
						</span>
						<div
							className="h-3.5 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"
							aria-hidden
						>
							<div
								className="h-full rounded-sm bg-sky-600 dark:bg-sky-500"
								style={{ width: `${pct * 100}%` }}
							/>
						</div>
						<span className="min-w-[7.5rem] whitespace-nowrap text-right font-mono text-zinc-600 dark:text-zinc-300">
							{formatPercent(item.weight)}
							{item.marketValue !== undefined && (
								<span className="text-zinc-400 dark:text-zinc-500">
									{" "}
									· {formatEuro(item.marketValue)}
								</span>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
