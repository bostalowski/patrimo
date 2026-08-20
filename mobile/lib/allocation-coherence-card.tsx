import type {
	DiversificationCoherenceResult,
	DiversificationCoherenceStatus,
	DiversificationFinding,
	DiversificationFindingKind,
} from "@patrimo/core/diversification-coherence";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import {
	assessDiversificationBandTone,
	diversificationBandSignedDelta,
	type DiversificationBandTone,
} from "@patrimo/core/diversification-targets";
import { Text, View } from "react-native";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<DiversificationCoherenceStatus, string> = {
	aligned: "Aligné",
	watch: "À surveiller",
	misaligned: "Décalé",
};

const FINDING_LABEL: Record<
	DiversificationFindingKind,
	Record<"watch" | "breach", string>
> = {
	band_drift: {
		watch: "Stock à surveiller",
		breach: "Stock hors bande",
	},
	flow_misalign: {
		watch: "DCA à surveiller",
		breach: "DCA hors bande",
	},
};

function statusColor(status: DiversificationCoherenceStatus, theme: Theme): string {
	if (status === "aligned") return theme.success;
	if (status === "watch") return theme.warning;
	return theme.danger;
}

function toneColor(tone: DiversificationBandTone, theme: Theme): string {
	if (tone === "ok") return theme.text;
	if (tone === "watch") return theme.warning;
	return theme.danger;
}

function findingLabel(f: DiversificationFinding): string {
	return FINDING_LABEL[f.kind][f.tone];
}

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

const ppFormatter = new Intl.NumberFormat("fr-FR", {
	signDisplay: "exceptZero",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

function fmtBand(minPct: number, maxPct: number): string {
	if (minPct === maxPct) return fmt(minPct);
	return `${pctFormatter.format(minPct)}–${pctFormatter.format(maxPct)}`;
}

function fmtDelta(delta: number): string | null {
	if (delta === 0) return null;
	return `${ppFormatter.format(delta * 100)} pp`;
}

function ValueCell({
	value,
	minPct,
	maxPct,
	theme: t,
	width,
}: {
	value: number | null;
	minPct: number;
	maxPct: number;
	theme: Theme;
	width: number;
}) {
	if (value === null) {
		return (
			<Text style={{ width, textAlign: "right", fontSize: 13, color: t.text }}>
				—
			</Text>
		);
	}
	const tone = assessDiversificationBandTone(value, minPct, maxPct);
	const deltaLabel = fmtDelta(
		diversificationBandSignedDelta(value, minPct, maxPct),
	);
	const color = toneColor(tone, t);
	return (
		<View style={{ width, alignItems: "flex-end" }}>
			<Text
				style={{
					textAlign: "right",
					fontSize: 13,
					fontWeight: tone === "ok" ? "400" : "700",
					color,
				}}
			>
				{fmt(value)}
			</Text>
			{deltaLabel && (
				<Text style={{ fontSize: 10, fontWeight: "600", color, opacity: 0.9 }}>
					{deltaLabel}
				</Text>
			)}
		</View>
	);
}

export function AllocationCoherenceCard({
	coherence,
	theme: t,
}: {
	coherence: DiversificationCoherenceResult | null;
	theme: Theme;
}) {
	if (!coherence) return null;

	const tone = statusColor(coherence.status, t);
	const showDca = coherence.annualDcaTotal > 0;

	const seen = new Set<string>();
	const deduped = coherence.findings.filter((f) => {
		const key = `${f.kind}:${f.key}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return (
		<View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
			<View style={[shared.row, { marginBottom: 8 }]}>
				<Text style={[shared.label, { color: t.textSecondary }]}>
					Cohérence diversification
				</Text>
				<Text style={{ color: tone, fontSize: 13, fontWeight: "600" }}>
					{STATUS_LABEL[coherence.status]}
				</Text>
			</View>

			{deduped.length > 0 && (
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 4,
						marginBottom: 12,
					}}
				>
					{deduped.map((f) => {
						const badgeColor =
							f.tone === "watch" ? t.warning : t.danger;
						return (
							<View
								key={`${f.kind}:${f.key}`}
								style={{
									paddingHorizontal: 8,
									paddingVertical: 2,
									borderRadius: 6,
									backgroundColor: `${badgeColor}22`,
								}}
							>
								<Text
									style={{
										color: badgeColor,
										fontSize: 11,
										fontWeight: "600",
									}}
								>
									{findingLabel(f)}
									{f.key ? ` · ${diversificationKeyLabel(f.key)}` : ""}
								</Text>
							</View>
						);
					})}
				</View>
			)}

			<View style={{ marginBottom: 4 }}>
				<View style={{ flexDirection: "row", paddingVertical: 4 }}>
					<Text
						style={{
							flex: 1,
							color: t.textMuted,
							fontSize: 11,
							fontWeight: "600",
							textTransform: "uppercase",
						}}
					>
						Dimension
					</Text>
					<Text
						style={{
							width: 64,
							textAlign: "right",
							color: t.textMuted,
							fontSize: 11,
							fontWeight: "600",
							textTransform: "uppercase",
						}}
					>
						Bande
					</Text>
					<Text
						style={{
							width: 56,
							textAlign: "right",
							color: t.textMuted,
							fontSize: 11,
							fontWeight: "600",
							textTransform: "uppercase",
						}}
					>
						Réel
					</Text>
					{showDca && (
						<Text
							style={{
								width: 56,
								textAlign: "right",
								color: t.textMuted,
								fontSize: 11,
								fontWeight: "600",
								textTransform: "uppercase",
							}}
						>
							DCA
						</Text>
					)}
				</View>
				{coherence.bands.map((band, i) => (
					<View
						key={band.key}
						style={{
							flexDirection: "row",
							alignItems: "flex-start",
							paddingVertical: 8,
							borderTopWidth: i > 0 ? 1 : 0,
							borderTopColor: t.cardBorder,
						}}
					>
						<Text style={{ flex: 1, color: t.textSecondary, fontSize: 13 }}>
							{diversificationKeyLabel(band.key)}
						</Text>
						<Text
							style={{
								width: 64,
								textAlign: "right",
								color: t.textMuted,
								fontSize: 13,
							}}
						>
							{fmtBand(band.minPct, band.maxPct)}
						</Text>
						<ValueCell
							value={band.stockPct}
							minPct={band.minPct}
							maxPct={band.maxPct}
							theme={t}
							width={56}
						/>
						{showDca && (
							<ValueCell
								value={band.flowPct}
								minPct={band.minPct}
								maxPct={band.maxPct}
								theme={t}
								width={56}
							/>
						)}
					</View>
				))}
			</View>
		</View>
	);
}
