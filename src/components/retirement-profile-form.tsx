"use client";

import {
	civilYmd,
	normalizeRetirementProfile,
	PENSION_SCENARIO_TYPES,
	serializeRetirementProfileForWrite,
	type PensionScenarioType,
} from "@patrimo/core/retirement-profile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PENSION_SCENARIO_LABELS } from "@/lib/pension-scenario-labels";
import { RetirementProfile } from "@/lib/schema";

const inputClasses =
	"rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

type ScenarioDraft = {
	startDate: string;
	grossMonthly: string;
};

export type RetirementProfileFormState = {
	birthDate: string;
	activeScenario: PensionScenarioType | "";
	scenarios: Record<PensionScenarioType, ScenarioDraft>;
};

function emptyScenarios(): Record<PensionScenarioType, ScenarioDraft> {
	return {
		LEGAL_AGE: { startDate: "", grossMonthly: "" },
		FULL_RATE: { startDate: "", grossMonthly: "" },
		AUTOMATIC_FULL_RATE: { startDate: "", grossMonthly: "" },
	};
}

export function retirementProfileToForm(
	profile: RetirementProfile,
): RetirementProfileFormState {
	const normalized = normalizeRetirementProfile(profile);
	const scenarios = emptyScenarios();
	for (const type of PENSION_SCENARIO_TYPES) {
		const slot = normalized.scenarios?.[type];
		scenarios[type] = {
			startDate: slot?.startDate ? civilYmd(slot.startDate) : "",
			grossMonthly:
				slot?.grossMonthly !== undefined ? String(slot.grossMonthly) : "",
		};
	}
	return {
		birthDate: normalized.birthDate ? civilYmd(normalized.birthDate) : "",
		activeScenario: normalized.activeScenario ?? "",
		scenarios,
	};
}

function formToProfile(form: RetirementProfileFormState): RetirementProfile {
	const scenarios: RetirementProfile["scenarios"] = {};
	for (const type of PENSION_SCENARIO_TYPES) {
		const draft = form.scenarios[type];
		const gross =
			draft.grossMonthly.trim() === ""
				? undefined
				: Math.max(0, Number(draft.grossMonthly) || 0);
		const startDate =
			draft.startDate.trim() === "" ? undefined : new Date(`${draft.startDate}T00:00:00.000Z`);
		if (gross !== undefined || startDate !== undefined) {
			scenarios[type] = { grossMonthly: gross, startDate };
		}
	}
	return RetirementProfile.parse({
		birthDate: form.birthDate ? new Date(`${form.birthDate}T00:00:00.000Z`) : undefined,
		scenarios,
		activeScenario: form.activeScenario || undefined,
	});
}

export function RetirementProfileForm({
	initialProfile,
	refreshOnBirthDateChange = true,
}: {
	initialProfile: RetirementProfile;
	refreshOnBirthDateChange?: boolean;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [form, setForm] = useState<RetirementProfileFormState>(() =>
		retirementProfileToForm(initialProfile),
	);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		setForm(retirementProfileToForm(initialProfile));
	}, [initialProfile]);

	async function persist(next: RetirementProfileFormState, refresh: boolean) {
		setSaveError(null);
		const model = normalizeRetirementProfile(formToProfile(next));
		const body = serializeRetirementProfileForWrite(model);
		const res = await fetch("/api/retirement-profile", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const data = (await res.json()) as { error?: string };
			setSaveError(data.error ?? "Erreur de sauvegarde");
			return;
		}
		if (refresh) {
			startTransition(() => router.refresh());
		}
	}

	function updateForm(
		patch: Partial<RetirementProfileFormState>,
		refresh: boolean,
	) {
		setForm((current) => {
			const next = { ...current, ...patch };
			void persist(next, refresh);
			return next;
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profil retraite</CardTitle>
				<p className="text-xs text-zinc-500">
					Trois scénarios de pension publique (date de départ + montant brut
					mensuel). Le scénario utilisé pour les projections se choisit sur{" "}
					<Link href="/projection" className="underline">
						Projection
					</Link>
					.
					{pending && " Mise à jour…"}
				</p>
			</CardHeader>
			<CardBody className="flex max-w-2xl flex-col gap-6">
				{saveError && (
					<p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
				)}

				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						Date de naissance
					</span>
					<input
						type="date"
						className={inputClasses}
						value={form.birthDate}
						onChange={(e) =>
							setForm((f) => ({ ...f, birthDate: e.target.value }))
						}
						onBlur={() =>
							updateForm({ birthDate: form.birthDate }, refreshOnBirthDateChange)
						}
					/>
				</label>

				<div className="space-y-4">
					<p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Scénarios pension publique
					</p>
					{PENSION_SCENARIO_TYPES.map((type) => (
						<div
							key={type}
							className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
						>
							<p className="text-sm font-medium">{PENSION_SCENARIO_LABELS[type]}</p>
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="flex flex-col gap-1 text-xs text-zinc-500">
									Date de départ
									<input
										type="date"
										className={inputClasses}
										value={form.scenarios[type].startDate}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												scenarios: {
													...f.scenarios,
													[type]: {
														...f.scenarios[type],
														startDate: e.target.value,
													},
												},
											}))
										}
										onBlur={() => void persist(form, false)}
									/>
								</label>
								<label className="flex flex-col gap-1 text-xs text-zinc-500">
									Pension brute (€ / mois)
									<input
										type="number"
										min={0}
										step={50}
										className={inputClasses}
										value={form.scenarios[type].grossMonthly}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												scenarios: {
													...f.scenarios,
													[type]: {
														...f.scenarios[type],
														grossMonthly: e.target.value,
													},
												},
											}))
										}
										onBlur={() => void persist(form, false)}
									/>
								</label>
							</div>
						</div>
					))}
				</div>

				<p className="text-xs leading-relaxed text-zinc-500">
					Estimation officielle sur{" "}
					<a
						href="https://www.info-retraite.fr"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sky-600 underline dark:text-sky-400"
					>
						info-retraite.fr
					</a>
					. Choisis le scénario actif sur{" "}
					<Link href="/projection" className="underline">
						Projection
					</Link>
					.
				</p>
			</CardBody>
		</Card>
	);
}
