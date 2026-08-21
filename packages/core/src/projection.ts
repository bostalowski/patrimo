import { deflate } from "./inflation";
import type { DcaFrequency, Envelope } from "./schema";

export const DEFAULT_ENVELOPE_PLAFONDS: Partial<Record<Envelope, number>> = {
	LIVRET: 22_950,
	PEA: 150_000,
};

export const DEFAULT_ENVELOPE_RATES: Record<Envelope, number> = {
	CTO: 0.08,
	PEA: 0.07,
	PEE: 0.06,
	AV: 0.04,
	LIVRET: 0.024,
	PER: 0.06,
};

export const DEFAULT_OVERFLOW_ENVELOPE: Envelope = "CTO";

export type ScenarioKey = "prudent" | "modere" | "dynamique";

export type ScenarioPreset = {
	key: ScenarioKey;
	label: string;
	rate: number;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
	{ key: "prudent", label: "Prudent", rate: 0.03 },
	{ key: "modere", label: "Modéré", rate: 0.05 },
	{ key: "dynamique", label: "Dynamique", rate: 0.08 },
];

export type ProjectionPoint = {
	date: string;
	value: number;
	invested: number;
	realValue: number;
};

export type InvestmentProjection = {
	points: ProjectionPoint[];
	finalValue: number;
	finalRealValue: number;
	totalContributed: number;
	gain: number;
	plafondReachedMonth: number | null;
};

function utc(year: number, monthIndex: number, day: number): Date {
	return new Date(Date.UTC(year, monthIndex, day));
}

export type ContributionStream = {
	amount: number;
	frequency: DcaFrequency;
	paymentMonth?: number;
};

function streamContribution(
	stream: ContributionStream,
	monthDate: Date,
	startMonth: Date,
): number {
	if (stream.amount <= 0) return 0;
	if (stream.frequency === "MENSUEL") return stream.amount;

	const calendarMonth = monthDate.getUTCMonth() + 1;
	const anchor = stream.paymentMonth ?? startMonth.getUTCMonth() + 1;

	if (stream.frequency === "ANNUEL") {
		return calendarMonth === anchor ? stream.amount : 0;
	}

	return (((calendarMonth - anchor) % 3) + 3) % 3 === 0 ? stream.amount : 0;
}

function resolveStreams(params: {
	monthlyContribution?: number;
	contributions?: ContributionStream[];
}): ContributionStream[] {
	return (
		params.contributions ??
		(params.monthlyContribution
			? [{ amount: params.monthlyContribution, frequency: "MENSUEL" }]
			: [])
	);
}

function finalizeProjection(
	value: number,
	invested: number,
	points: ProjectionPoint[],
	totalMonths: number,
	inflationRate: number,
	plafondReachedMonth: number | null,
): InvestmentProjection {
	return {
		points,
		finalValue: value,
		finalRealValue: deflate(value, totalMonths / 12, inflationRate),
		totalContributed: invested,
		gain: value - invested,
		plafondReachedMonth,
	};
}

export function projectInvestment(params: {
	startBalance: number;
	monthlyContribution?: number;
	contributions?: ContributionStream[];
	annualRate: number;
	years: number;
	start?: Date;
	inflationRate?: number;
	plafond?: number;
}): InvestmentProjection {
	const { startBalance, annualRate, years, plafond } = params;
	const inflationRate = params.inflationRate ?? 0;
	const start = params.start ?? new Date();
	const startMonth = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);
	const monthlyRate = annualRate / 12;
	const streams = resolveStreams(params);

	let value = startBalance;
	let invested = startBalance;
	let plafondReachedMonth: number | null = null;

	const toIso = (date: Date) => date.toISOString().slice(0, 10);
	const points: ProjectionPoint[] = [
		{
			date: toIso(startMonth),
			value,
			invested,
			realValue: deflate(value, 0, inflationRate),
		},
	];

	const totalMonths = Math.max(0, Math.round(years * 12));
	for (let month = 1; month <= totalMonths; month += 1) {
		const date = utc(
			startMonth.getUTCFullYear(),
			startMonth.getUTCMonth() + month,
			1,
		);
		const room =
			plafond !== undefined ? Math.max(0, plafond - invested) : Infinity;
		const due = streams.reduce(
			(sum, stream) => sum + streamContribution(stream, date, startMonth),
			0,
		);
		const contribution = Math.max(0, Math.min(due, room));
		if (
			plafond !== undefined &&
			plafondReachedMonth === null &&
			invested + contribution >= plafond
		) {
			plafondReachedMonth = month;
		}
		value = value * (1 + monthlyRate) + contribution;
		invested += contribution;
		points.push({
			date: toIso(date),
			value,
			invested,
			realValue: deflate(value, month / 12, inflationRate),
		});
	}

	return finalizeProjection(
		value,
		invested,
		points,
		totalMonths,
		inflationRate,
		plafondReachedMonth,
	);
}

/** One envelope input for multi-envelope projection with overflow. */
export type EnvelopeProjectionSpec = {
	envelope: Envelope;
	startBalance: number;
	monthlyContribution?: number;
	contributions?: ContributionStream[];
	annualRate: number;
	plafond?: number;
};

/** Surplus clipped at a source plafond and routed to the overflow envelope. */
export type EnvelopeOverflowEvent = {
	source: Envelope;
	target: Envelope;
	/** 1-indexed projection month when the first surplus was accepted by the target. */
	firstOverflowMonth: number;
	/**
	 * Steady monthly surplus accepted after the first full-clip month, when constant;
	 * `null` when surplus varies (e.g. non-monthly streams only).
	 */
	monthlySurplus: number | null;
	totalOverflow: number;
};

export type EnvelopesWithOverflowResult = {
	projections: Array<{ envelope: Envelope; result: InvestmentProjection }>;
	overflows: EnvelopeOverflowEvent[];
};

type EnvelopeState = {
	envelope: Envelope;
	streams: ContributionStream[];
	monthlyRate: number;
	plafond: number | undefined;
	value: number;
	invested: number;
	plafondReachedMonth: number | null;
	points: ProjectionPoint[];
};

type OverflowAccumulator = {
	firstOverflowMonth: number | null;
	totalOverflow: number;
	/** Accepted surplus amounts for months where source room was 0 at month start. */
	steadyAccepted: number[];
};

/**
 * Project several envelopes together. When a source envelope clips contributions
 * at its plafond, the surplus is routed once to `overflowEnvelope` (default CTO).
 * Single hop only: if the fallback is also at plafond that month, remaining
 * surplus is dropped. Self-overflow (source === fallback) does not redirect.
 */
export function projectEnvelopesWithOverflow(params: {
	envelopes: EnvelopeProjectionSpec[];
	years: number;
	start?: Date;
	inflationRate?: number;
	overflowEnvelope?: Envelope;
}): EnvelopesWithOverflowResult {
	const inflationRate = params.inflationRate ?? 0;
	const overflowEnvelope = params.overflowEnvelope ?? DEFAULT_OVERFLOW_ENVELOPE;
	const start = params.start ?? new Date();
	const startMonth = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);
	const toIso = (date: Date) => date.toISOString().slice(0, 10);
	const totalMonths = Math.max(0, Math.round(params.years * 12));

	const byEnvelope = new Map<Envelope, EnvelopeState>();
	for (const spec of params.envelopes) {
		if (byEnvelope.has(spec.envelope)) {
			throw new Error(
				`projectEnvelopesWithOverflow: duplicate envelope ${spec.envelope}`,
			);
		}
		byEnvelope.set(spec.envelope, {
			envelope: spec.envelope,
			streams: resolveStreams(spec),
			monthlyRate: spec.annualRate / 12,
			plafond: spec.plafond,
			value: spec.startBalance,
			invested: spec.startBalance,
			plafondReachedMonth: null,
			points: [
				{
					date: toIso(startMonth),
					value: spec.startBalance,
					invested: spec.startBalance,
					realValue: deflate(spec.startBalance, 0, inflationRate),
				},
			],
		});
	}

	if (!byEnvelope.has(overflowEnvelope)) {
		byEnvelope.set(overflowEnvelope, {
			envelope: overflowEnvelope,
			streams: [],
			monthlyRate: DEFAULT_ENVELOPE_RATES[overflowEnvelope] / 12,
			plafond: DEFAULT_ENVELOPE_PLAFONDS[overflowEnvelope],
			value: 0,
			invested: 0,
			plafondReachedMonth: null,
			points: [
				{
					date: toIso(startMonth),
					value: 0,
					invested: 0,
					realValue: 0,
				},
			],
		});
	}

	const overflowAcc = new Map<Envelope, OverflowAccumulator>();

	for (let month = 1; month <= totalMonths; month += 1) {
		const date = utc(
			startMonth.getUTCFullYear(),
			startMonth.getUTCMonth() + month,
			1,
		);

		const ownContribution = new Map<Envelope, number>();
		const surplusBySource = new Map<Envelope, number>();
		let overflowPool = 0;

		for (const state of byEnvelope.values()) {
			const room =
				state.plafond !== undefined
					? Math.max(0, state.plafond - state.invested)
					: Infinity;
			const due = state.streams.reduce(
				(sum, stream) => sum + streamContribution(stream, date, startMonth),
				0,
			);
			const contribution = Math.max(0, Math.min(due, room));
			const surplus = Math.max(0, due - contribution);
			ownContribution.set(state.envelope, contribution);
			if (state.envelope !== overflowEnvelope && surplus > 0) {
				surplusBySource.set(state.envelope, surplus);
				overflowPool += surplus;
			}
		}

		const target = byEnvelope.get(overflowEnvelope);
		if (!target) {
			throw new Error(
				`projectEnvelopesWithOverflow: missing overflow envelope ${overflowEnvelope}`,
			);
		}
		const targetOwn = ownContribution.get(overflowEnvelope) ?? 0;
		const targetRoomAfterOwn =
			target.plafond !== undefined
				? Math.max(0, target.plafond - target.invested - targetOwn)
				: Infinity;
		const acceptedOverflow = Math.max(
			0,
			Math.min(overflowPool, targetRoomAfterOwn),
		);

		// Allocate accepted overflow proportionally to each source's surplus.
		if (acceptedOverflow > 0 && overflowPool > 0) {
			let remaining = acceptedOverflow;
			const sources = Array.from(surplusBySource.entries());
			for (let i = 0; i < sources.length; i += 1) {
				const entry = sources[i];
				if (!entry) continue;
				const [source, surplus] = entry;
				const share =
					i === sources.length - 1
						? remaining
						: Math.min(remaining, (acceptedOverflow * surplus) / overflowPool);
				remaining -= share;
				if (share <= 0) continue;
				let acc = overflowAcc.get(source);
				if (!acc) {
					acc = {
						firstOverflowMonth: null,
						totalOverflow: 0,
						steadyAccepted: [],
					};
					overflowAcc.set(source, acc);
				}
				if (acc.firstOverflowMonth === null) {
					acc.firstOverflowMonth = month;
				}
				acc.totalOverflow += share;
				const sourceState = byEnvelope.get(source);
				if (!sourceState) continue;
				const sourceRoomAtStart =
					sourceState.plafond !== undefined
						? Math.max(0, sourceState.plafond - sourceState.invested)
						: Infinity;
				if (sourceRoomAtStart === 0) {
					acc.steadyAccepted.push(share);
				}
			}
		}

		for (const state of byEnvelope.values()) {
			let contribution = ownContribution.get(state.envelope) ?? 0;
			if (state.envelope === overflowEnvelope) {
				contribution += acceptedOverflow;
			}
			if (
				state.plafond !== undefined &&
				state.plafondReachedMonth === null &&
				state.invested + contribution >= state.plafond
			) {
				state.plafondReachedMonth = month;
			}
			state.value = state.value * (1 + state.monthlyRate) + contribution;
			state.invested += contribution;
			state.points.push({
				date: toIso(date),
				value: state.value,
				invested: state.invested,
				realValue: deflate(state.value, month / 12, inflationRate),
			});
		}
	}

	const projections = Array.from(byEnvelope.values()).map((state) => ({
		envelope: state.envelope,
		result: finalizeProjection(
			state.value,
			state.invested,
			state.points,
			totalMonths,
			inflationRate,
			state.plafondReachedMonth,
		),
	}));

	const overflows: EnvelopeOverflowEvent[] = [];
	for (const [source, acc] of overflowAcc) {
		if (acc.firstOverflowMonth === null || acc.totalOverflow <= 0) continue;
		let monthlySurplus: number | null = null;
		const steadyFirst = acc.steadyAccepted[0];
		if (steadyFirst !== undefined) {
			const constant = acc.steadyAccepted.every(
				(amount) => Math.abs(amount - steadyFirst) < 1e-9,
			);
			monthlySurplus = constant ? steadyFirst : null;
		}
		overflows.push({
			source,
			target: overflowEnvelope,
			firstOverflowMonth: acc.firstOverflowMonth,
			monthlySurplus,
			totalOverflow: acc.totalOverflow,
		});
	}

	return { projections, overflows };
}
