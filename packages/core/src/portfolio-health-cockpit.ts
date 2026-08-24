import type { DiversificationCoherenceResult } from "./diversification-coherence";
import type { EmergencyFundHealth } from "./emergency-fund";
import type { GoalsAssessment } from "./financial-goals";
import { formatEuro } from "./format";
import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import {
	assessRiskMetricStatus,
	type DrawdownStatus,
	type VolatilityStatus,
} from "./portfolio-risk";
import type { SavingsCapacity } from "./savings-capacity";

export type PortfolioHealthTone = "ok" | "watch" | "breach";

export type PortfolioHealthPillId =
	| "emergency_fund"
	| "savings_capacity"
	| "diversification"
	| "risk"
	| "goals";

export type PortfolioHealthPill = {
	id: PortfolioHealthPillId;
	label: string;
	tone: PortfolioHealthTone;
	href: string;
};

export type PortfolioHealthNextActionSource = "next_euro" | "pill" | "all_ok";

export type PortfolioHealthNextAction = {
	sentence: string;
	href: string;
	source: PortfolioHealthNextActionSource;
	pillId?: PortfolioHealthPillId;
};

export type PortfolioHealthCockpit = {
	pills: PortfolioHealthPill[];
	nextAction: PortfolioHealthNextAction;
};

export type PortfolioHealthCockpitInput = {
	emergencyFund: EmergencyFundHealth | null;
	savingsCapacity: SavingsCapacity | null;
	diversification: DiversificationCoherenceResult | null;
	/** Raw metrics; bands via `assessRiskMetricStatus`. Sharpe excluded. */
	volatility: number | null;
	drawdown: number | null;
	goals: GoalsAssessment | null;
	nextEuroPlan: NextEuroPlan | null;
};

const PILL_ORDER: PortfolioHealthPillId[] = [
	"emergency_fund",
	"savings_capacity",
	"diversification",
	"risk",
	"goals",
];

const TONE_RANK: Record<PortfolioHealthTone, number> = {
	ok: 0,
	watch: 1,
	breach: 2,
};

const NEXT_EURO_ACTION_LABEL = {
	buy: "Acheter",
	hold: "Conserver",
	pause: "Pause",
} as const;

const PILL_BREACH_COPY: Record<PortfolioHealthPillId, string> = {
	emergency_fund: "Priorité : renforcer le fonds d'urgence.",
	savings_capacity: "Priorité : ajuster le plan d'épargne (surengagement).",
	diversification: "Priorité : réaligner la diversification.",
	risk: "Priorité : examiner le risque du portefeuille.",
	goals: "Priorité : revoir les objectifs (souscription excessive).",
};

const PILL_WATCH_COPY: Record<PortfolioHealthPillId, string> = {
	emergency_fund: "Surveille le fonds d'urgence.",
	savings_capacity: "Surveille la capacité d'épargne.",
	diversification: "Surveille la diversification.",
	risk: "Surveille le risque du portefeuille.",
	goals: "Surveille la trajectoire des objectifs.",
};

/**
 * Unified portfolio health cockpit (composition only). Maps existing
 * assessments to traffic-light tones and picks one next-action sentence.
 * Returns null when there is nothing to show.
 */
export function buildPortfolioHealthCockpit(
	input: PortfolioHealthCockpitInput,
): PortfolioHealthCockpit | null {
	const pills = collectPills(input);
	const nextEuroStep = firstNextEuroStep(input.nextEuroPlan);

	if (pills.length === 0 && !nextEuroStep) return null;

	const nextAction = selectNextAction(pills, nextEuroStep);
	return { pills, nextAction };
}

function collectPills(
	input: PortfolioHealthCockpitInput,
): PortfolioHealthPill[] {
	const pills: PortfolioHealthPill[] = [];

	if (input.emergencyFund) {
		pills.push({
			id: "emergency_fund",
			label: "Fonds d'urgence",
			tone: toneForEmergencyFund(input.emergencyFund.status),
			href: "/budget",
		});
	}

	if (input.savingsCapacity) {
		pills.push({
			id: "savings_capacity",
			label: "Capacité d'épargne",
			tone: toneForSavingsCapacity(input.savingsCapacity.status),
			href:
				input.savingsCapacity.status === "over_committed" ? "/dca" : "/budget",
		});
	}

	if (input.diversification) {
		pills.push({
			id: "diversification",
			label: "Diversification",
			tone: toneForDiversification(input.diversification.status),
			href: "/diversification",
		});
	}

	const riskTone = toneForRisk(
		assessRiskMetricStatus("volatility", input.volatility),
		assessRiskMetricStatus("drawdown", input.drawdown),
	);
	if (riskTone !== null) {
		pills.push({
			id: "risk",
			label: "Risque",
			tone: riskTone,
			href: "/#performance",
		});
	}

	if (input.goals) {
		pills.push({
			id: "goals",
			label: "Objectifs",
			tone: toneForGoals(input.goals),
			href: "/objectifs",
		});
	}

	return pills;
}

export function toneForEmergencyFund(
	status: EmergencyFundHealth["status"],
): PortfolioHealthTone {
	if (status === "insufficient") return "breach";
	if (status === "acceptable" || status === "over_allocated") return "watch";
	return "ok";
}

export function toneForSavingsCapacity(
	status: SavingsCapacity["status"],
): PortfolioHealthTone {
	if (status === "over_committed") return "breach";
	if (status === "tight") return "watch";
	return "ok";
}

export function toneForDiversification(
	status: DiversificationCoherenceResult["status"],
): PortfolioHealthTone {
	if (status === "misaligned") return "breach";
	if (status === "watch") return "watch";
	return "ok";
}

export function toneForRisk(
	volatility: VolatilityStatus | null,
	drawdown: DrawdownStatus | null,
): PortfolioHealthTone | null {
	if (volatility === null && drawdown === null) return null;

	const tones: PortfolioHealthTone[] = [];
	if (volatility !== null) {
		if (volatility === "high") tones.push("breach");
		else if (volatility === "moderate") tones.push("watch");
		else tones.push("ok");
	}
	if (drawdown !== null) {
		if (drawdown === "severe") tones.push("breach");
		else if (drawdown === "marked") tones.push("watch");
		else tones.push("ok");
	}

	if (tones.includes("breach")) return "breach";
	if (tones.includes("watch")) return "watch";
	return "ok";
}

export function toneForGoals(goals: GoalsAssessment): PortfolioHealthTone {
	if (goals.oversubscribed) return "breach";
	const anyBehind = goals.goals.some((g) => g.status === "behind");
	if (anyBehind) return "watch";
	const anyIncomplete =
		goals.incompleteProfile || goals.goals.some((g) => g.incomplete);
	if (anyIncomplete) return "watch";
	return "ok";
}

function firstNextEuroStep(plan: NextEuroPlan | null): NextEuroStep | null {
	if (!plan || plan.steps.length === 0) return null;
	return plan.steps[0] ?? null;
}

function formatNextEuroSentence(step: NextEuroStep): string {
	const action = NEXT_EURO_ACTION_LABEL[step.action];
	if (step.euros > 0) {
		return `${action} ${formatEuro(step.euros)} — ${step.reason}`;
	}
	return `${action} — ${step.reason}`;
}

function selectNextAction(
	pills: PortfolioHealthPill[],
	nextEuroStep: NextEuroStep | null,
): PortfolioHealthNextAction {
	if (nextEuroStep) {
		return {
			sentence: formatNextEuroSentence(nextEuroStep),
			href: "/diversification",
			source: "next_euro",
		};
	}

	const worst = worstPill(pills);
	if (worst && worst.tone !== "ok") {
		const copy =
			worst.tone === "breach"
				? PILL_BREACH_COPY[worst.id]
				: PILL_WATCH_COPY[worst.id];
		return {
			sentence: copy,
			href: worst.href,
			source: "pill",
			pillId: worst.id,
		};
	}

	return {
		sentence: "Rien d'urgent — surveille le Dashboard.",
		href: "/",
		source: "all_ok",
	};
}

function worstPill(
	pills: PortfolioHealthPill[],
): PortfolioHealthPill | undefined {
	let best: PortfolioHealthPill | undefined;
	for (const id of PILL_ORDER) {
		const pill = pills.find((p) => p.id === id);
		if (!pill) continue;
		// Same tone: keep earlier in fixed order (PILL_ORDER iteration).
		if (!best || TONE_RANK[pill.tone] > TONE_RANK[best.tone]) {
			best = pill;
		}
	}
	return best;
}
