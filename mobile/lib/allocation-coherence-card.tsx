import type {
	AllocationCoherenceResult,
	AllocationCoherenceStatus,
	AllocationFindingKind,
} from "@patrimo/core/allocation-coherence";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<AllocationCoherenceStatus, string> = {
	aligned: "Aligné",
	watch: "À surveiller",
	misaligned: "Décalé",
};

const FINDING_LABEL: Record<AllocationFindingKind, string> = {
	category_drift: "Stock décalé",
	flow_misalign: "DCA décalé",
	unmapped_stock: "Actifs non ciblés",
	geo_coverage_gap: "Géo incomplète",
};

function statusColor(status: AllocationCoherenceStatus, theme: Theme): string {
	switch (status) {
		case "aligned":
			return theme.success;
		case "watch":
			return "#d97706";
		case "misaligned":
			return theme.danger;
	}
}

function findingColor(kind: AllocationFindingKind, theme: Theme): string {
	return kind === "geo_coverage_gap" ? "#d97706" : theme.danger;
}

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	maximumFractionDigits: 0,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

export function AllocationCoherenceCard({
	coherence,
	theme: t,
}: {
	coherence: AllocationCoherenceResult | null;
	theme: Theme;
}) {
	if (!coherence) return null;

	const tone = statusColor(coherence.status, t);
	const showDca = coherence.annualDcaTotal > 0;

	const seen = new Set<string>();
	const deduped = coherence.findings.filter((f) => {
		const key = `${f.kind}:${f.categoryLabel ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return (
		<View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
			<View style={[shared.row, { marginBottom: 8 }]}>
				<Text style={[shared.label, { color: t.textSecondary }]}>
					Cohérence d&apos;allocation
				</Text>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
					<Pressable
						onPress={() => router.push("/investissements")}
						accessibilityRole="button"
						accessibilityLabel="Modifier le plan d'allocation"
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
							key={`${f.kind}:${f.categoryLabel ?? ""}`}
							style={{
								paddingHorizontal: 8,
								paddingVertical: 2,
								borderRadius: 6,
								backgroundColor: `${findingColor(f.kind, t)}22`,
							}}
						>
							<Text
								style={{
									color: findingColor(f.kind, t),
									fontSize: 11,
									fontWeight: "600",
								}}
							>
								{FINDING_LABEL[f.kind]}
								{f.categoryLabel ? ` · ${f.categoryLabel}` : ""}
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
						Catégorie
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
						Cible
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
				{coherence.categories.map((cat, i) => {
					const driftBad =
						cat.stockPct !== undefined &&
						Math.abs(cat.stockPct - cat.targetPct) >= 0.05;
					const flowBad =
						cat.flowPct !== null &&
						Math.abs(cat.flowPct - cat.targetPct) >= 0.05;
					return (
						<View
							key={cat.category}
							style={{
								flexDirection: "row",
								paddingVertical: 8,
								borderTopWidth: i > 0 ? 1 : 0,
								borderTopColor: t.cardBorder,
							}}
						>
							<Text style={{ flex: 1, color: t.textSecondary, fontSize: 13 }}>
								{cat.category}
							</Text>
							<Text
								style={{
									width: 44,
									textAlign: "right",
									color: t.textMuted,
									fontSize: 13,
								}}
							>
								{fmt(cat.targetPct)}
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
								{fmt(cat.stockPct)}
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
									{fmt(cat.flowPct)}
								</Text>
							)}
						</View>
					);
				})}
			</View>
		</View>
	);
}
