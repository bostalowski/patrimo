import { Text, View } from "react-native";
import type {
	SavingsCapacity,
	SavingsCapacityStatus,
} from "@patrimo/core/savings-capacity";
import { formatEuro } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<SavingsCapacityStatus, string> = {
	comfortable: "À l'aise",
	tight: "Serré",
	over_committed: "Surengagé",
};

function statusColor(status: SavingsCapacityStatus, theme: Theme): string {
	switch (status) {
		case "comfortable":
			return theme.success;
		case "tight":
			return "#d97706";
		case "over_committed":
			return theme.danger;
	}
}

export function SavingsCapacityCard({
	capacity,
	theme: t,
}: {
	capacity: SavingsCapacity | null;
	theme: Theme;
}) {
	if (!capacity) return null;

	const tone = statusColor(capacity.status, t);
	const targetLabel =
		capacity.emergencyTargetEuro !== undefined
			? formatEuro(capacity.emergencyTargetEuro)
			: `${capacity.emergencyTargetMonths} mois de dépenses`;

	const detailParts = [
		`DCA investissement ${formatEuro(capacity.plannedDcaMonthly)}`,
	];
	if (capacity.plannedLivretDcaMonthly > 0) {
		detailParts.push(
			`LIVRET prévu ${formatEuro(capacity.plannedLivretDcaMonthly)}`,
		);
	}
	if (capacity.monthlyEmergencyReserve > 0) {
		detailParts.push(
			`besoin rattrapage ${formatEuro(capacity.monthlyEmergencyReserve)} / mois pour atteindre ${targetLabel}`,
		);
	}

	return (
		<View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
			<View style={[shared.row, { marginBottom: 8 }]}>
				<Text style={[shared.label, { color: t.textSecondary }]}>
					{"Capacité d'épargne"}
				</Text>
				<Text style={{ color: tone, fontSize: 13, fontWeight: "600" }}>
					{STATUS_LABEL[capacity.status]}
				</Text>
			</View>
			<Text
				style={{
					fontSize: 22,
					fontWeight: "600",
					color: t.text,
					marginBottom: 6,
				}}
			>
				{formatEuro(capacity.investableSurplus)} / mois
			</Text>
			<Text style={{ color: t.textMuted, fontSize: 12 }}>
				{detailParts.join(" · ")}
			</Text>
			{capacity.emergencyOverContributing && (
				<Text style={{ color: "#d97706", fontSize: 12, marginTop: 6 }}>
					{`LIVRET au-dessus du besoin : +${formatEuro(capacity.emergencyOverContribution)} / mois`}
				</Text>
			)}
			{capacity.status === "over_committed" && (
				<Text style={{ color: t.danger, fontSize: 12, marginTop: 6 }}>
					Écart {formatEuro(capacity.gap)} / mois au-dessus de la capacité
				</Text>
			)}
		</View>
	);
}
