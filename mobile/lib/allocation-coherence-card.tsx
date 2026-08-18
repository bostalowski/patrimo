import type {
	DiversificationCoherenceResult,
	DiversificationCoherenceStatus,
	DiversificationFindingKind,
} from "@patrimo/core/diversification-coherence";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import { isValueInDiversificationBand } from "@patrimo/core/diversification-targets";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<DiversificationCoherenceStatus, string> = {
	aligned: "Aligné",
	misaligned: "Décalé",
};

const FINDING_LABEL: Record<DiversificationFindingKind, string> = {
	band_drift: "Stock hors bande",
	flow_misalign: "DCA hors bande",
};

function statusColor(status: DiversificationCoherenceStatus, theme: Theme): string {
	return status === "aligned" ? theme.success : theme.danger;
}

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	maximumFractionDigits: 0,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

function fmtBand(minPct: number, maxPct: number): string {
	if (minPct === maxPct) return fmt(minPct);
	return `${pctFormatter.format(minPct)}–${pctFormatter.format(maxPct)}`;
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
				<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
					<Pressable
						onPress={() => router.push("/geographie")}
						accessibilityRole="button"
						accessibilityLabel="Modifier"
					>
						<Text
							style={{ color: t.textMuted, fontSize: 12, fontWeight: "600" }}
						>
							Modifier
						</Text>
					</Pressable>
					<Text style={{ color: tone, fontSize: 13, fontWeight: "600" }}>
						{STATUS_LABEL[coherence.status]}
					</Text>
				</View>
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
					{deduped.map((f) => (
						<View
							key={`${f.kind}:${f.key}`}
							style={{
								paddingHorizontal: 8,
								paddingVertical: 2,
								borderRadius: 6,
								backgroundColor: `${t.danger}22`,
							}}
						>
							<Text
								style={{
									color: t.danger,
									fontSize: 11,
									fontWeight: "600",
								}}
							>
								{FINDING_LABEL[f.kind]}
								{f.key ? ` · ${diversificationKeyLabel(f.key)}` : ""}
							</Text>
						</View>
					))}
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
							width: 56,
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
							width: 44,
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
								width: 44,
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
				{coherence.bands.map((band, i) => {
					const driftBad = !isValueInDiversificationBand(
						band.stockPct,
						band.minPct,
						band.maxPct,
					);
					const flowBad =
						band.flowPct !== null &&
						!isValueInDiversificationBand(
							band.flowPct,
							band.minPct,
							band.maxPct,
						);
					return (
						<View
							key={band.key}
							style={{
								flexDirection: "row",
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
									width: 56,
									textAlign: "right",
									color: t.textMuted,
									fontSize: 13,
								}}
							>
								{fmtBand(band.minPct, band.maxPct)}
							</Text>
							<Text
								style={{
									width: 44,
									textAlign: "right",
									fontSize: 13,
									fontWeight: driftBad ? "700" : "400",
									color: driftBad ? t.danger : t.text,
								}}
							>
								{fmt(band.stockPct)}
							</Text>
							{showDca && (
								<Text
									style={{
										width: 44,
										textAlign: "right",
										fontSize: 13,
										fontWeight: flowBad ? "700" : "400",
										color: flowBad ? t.danger : t.text,
									}}
								>
									{fmt(band.flowPct)}
								</Text>
							)}
						</View>
					);
				})}
			</View>
		</View>
	);
}
