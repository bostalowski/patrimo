import { Text, View } from "react-native";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import {
	SAVINGS_CAPACITY_QUESTION,
	SAVINGS_CAPACITY_STATUS_LABEL,
	SAVINGS_CAPACITY_SURPLUS_CAPTION,
	SAVINGS_CAPACITY_TITLE,
	savingsCapacityEmergencyFundSurplusRecommendation,
	savingsCapacityLivretRecommendation,
	savingsCapacityRecommendation,
} from "@patrimo/core/savings-capacity-copy";
import { formatEuro } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

function statusColor(status: SavingsCapacity["status"], theme: Theme): string {
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

	const recommendation = savingsCapacityRecommendation(capacity, formatEuro);
	const livretReco = savingsCapacityLivretRecommendation(capacity, formatEuro);
	const efSurplusReco = savingsCapacityEmergencyFundSurplusRecommendation(
		capacity,
		formatEuro,
	);

	const detailParts = [
		`DCA investi ${formatEuro(capacity.plannedDcaMonthly)}`,
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
			<View style={[shared.row, { marginBottom: 4 }]}>
				<Text style={[shared.label, { color: t.textSecondary }]}>
					{SAVINGS_CAPACITY_TITLE}
				</Text>
				<Text style={{ color: tone, fontSize: 13, fontWeight: "600" }}>
					{SAVINGS_CAPACITY_STATUS_LABEL[capacity.status]}
				</Text>
			</View>
			<Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
				{SAVINGS_CAPACITY_QUESTION}
			</Text>
			<Text
				style={{
					fontSize: 22,
					fontWeight: "600",
					color: t.text,
					marginBottom: 2,
				}}
			>
				{formatEuro(capacity.investableSurplus)}
			</Text>
			<Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
				{SAVINGS_CAPACITY_SURPLUS_CAPTION}
			</Text>
			<Text
				style={{
					color:
						capacity.status === "over_committed"
							? t.danger
							: capacity.status === "tight"
								? "#d97706"
								: t.text,
					fontSize: 13,
					marginBottom: 6,
					fontWeight: "500",
				}}
			>
				{recommendation}
			</Text>
			{efSurplusReco && (
				<Text
					style={{
						color: "#d97706",
						fontSize: 13,
						marginBottom: 6,
						fontWeight: "500",
					}}
				>
					{efSurplusReco}
				</Text>
			)}
			{livretReco && (
				<Text
					style={{
						color: "#d97706",
						fontSize: 13,
						marginBottom: 6,
						fontWeight: "500",
					}}
				>
					{livretReco}
				</Text>
			)}
			<Text style={{ color: t.textMuted, fontSize: 12 }}>
				{detailParts.join(" · ")}
			</Text>
		</View>
	);
}
