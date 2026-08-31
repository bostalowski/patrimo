# Progress — `feat-retirement-pension-scenarios`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **Next:** merge prep — FEATURES matrix if needed (web Retirement profile stays done; mobile partial unchanged)
- **Blocked:** none
- **Done just now (2026-08-31):** Checker re-Pass after UX polish (Projection-only activeScenario picker)

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: **B**
- Framer session / date: 2026-08-31
- Challenger: Pass (2026-08-31, pass #3bis) — locks confirmed on disk (omit plats ; Horizon Projection sans scénario ; Surfaces Retraite ; Objectifs write revenu ; edges Y-M-D / aucun scénario / legacy âge sans pension). Prior Fail #1/#2/#3 archived in Done.
- Teach-back: accepted (2026-08-31)
- `make branch-ready`: **passed** (2026-08-31) — 14/14

## Checker (2026-08-31) — Pass (re-check after UX polish)

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | Layer 1 `make verify` 90/606; Layer 2 61 targeted (`retirement-profile` 9, `financial-goals` 45, excel 6, `retraite-client` 1); Layer 3 `make e2e` 2 passed. Spot-check: Projection-only activeScenario picker (`projection-client.tsx` buttons among `filledScenarios`); profile form has no radio (`retirement-profile-form.tsx` links to `/projection`); Retraite incomplete without filled active (`retraite-client.tsx`); brut/net/réel + totaux net; excel `Pension publique` + Âge vide on income write (web + mobile). |
| Architecture | A | Domain math in `@patrimo/core` (`retirement-profile.ts` owns `PENSION_BRUT_TO_NET_APPROX`, re-exported from `retraite.ts`); `financial-goals.ts` date/link overlap via `compareCivilYmd`; ARCHITECTURE codemap row present; web+mobile Objectifs serializers. |
| Scope | A | One CONTRACT; exclusions respected (no info-retraite import; mobile Objectifs UI untouched; no 4th scenario; profil stays JSON not Excel). |
| Tests / evidence | A | RED evidence in PROGRESS for profile, goals, Fail-fix cases; green re-run this session. UX radio removal aligns to locked « Projection — sélection » (no separate RED; covered by prior Layer 2 + spot-check). |
| Docs | A | Teach-back + Challenger Pass; ADR 0025 accepted; glossary + financial-goals topic; 0014/0023 see-also. FEATURES on merge still open. |

Verdict: **Pass** (no D; Correctness/Architecture ≥ B; Scope A).

## Checker (2026-08-31) — Pass (archived — pre UX polish)

Prior Pass after Fail fixes; Architecture scored B (codemap + constant drift since polished). Superseded by re-check above.

## Checker (2026-08-31) — Fail (archived)

Correctness C: Retraite invented 10y horizon; Objectifs age→date unwired. See prior notes.

## Done (this branch)

- [x] Branche + `make branch-contract`
- [x] Teach-back accepted + défaut Aucune
- [x] Challenger #1 Fail → CONTRACT v2
- [x] Challenger #2 Fail → humain OK 4 points
- [x] CONTRACT v3 écrit sur disque (omit plats, incomplete horizon, Retraite=activeScenario, âge write vide)
- [x] Challenger: Pass (2026-08-31, pass #3bis)
- [x] Maker RED → GREEN: profile scenarios + legacy migrate + serialize omit plats
- [x] Maker RED → GREEN: goals publicPensionLink + date overlap + validate targetDate
- [x] Excel `Pension publique` + Objectifs date-only write (web + mobile)
- [x] Store normalize/serialize; Projection/Retraite/Investissements/Objectifs UI
- [x] ADR 0025 + glossary + financial-goals topic note
- [x] Layer 1 `make verify` green (2026-08-31)
- [x] Checker Fail (2026-08-31) — Retraite 10y fallback + Objectifs age→date unwired
- [x] Maker Fail fixes (2026-08-31): Retraite no invented horizon; assess/Objectifs/Projection age→date; progress=1 + excel Âge vide tests; ADR 0014 see-also 0025
- [x] Checker Pass (2026-08-31) — re-verify after Fail fixes
- [x] Architecture polish (2026-08-31): `PENSION_BRUT_TO_NET_APPROX` owned by `retirement-profile.ts` (re-exported from `retraite`); core ARCHITECTURE codemap row
- [x] UX (2026-08-31): remove active-scenario radio from profile form; Projection-only picker; Retraite/form copy → `/projection`
- [x] Checker Pass re-check (2026-08-31) — after UX polish + architecture polish

## RED evidence (when Layer 2 applies)

### Profile scenarios / migration (2026-08-31)

- Case: three typed scenarios round-trip; filled IFF date+gross; legacy flat → LEGAL_AGE; orphan activeScenario cleared; write omits flats
- Command: `npm test -- packages/core/src/retirement-profile.test.ts`
- Failure reason (stubs): `isPensionScenarioFilled` always false; `normalizeRetirementProfile` identity (no `activeScenario` / no `scenarios.LEGAL_AGE`); serialize kept `targetRetirementAge`
- Date: 2026-08-31
- GREEN: same command — 9 passed

### Goals pension link + date (2026-08-31)

- Case: NONE never subtracts; FULL_RATE + date ≥ start subtracts net; date before start → 0; unfilled link → NONE; CAPITAL ignores link; income ≤ net → 0; validate requires targetDate
- Command: `npm test -- packages/core/src/financial-goals.test.ts`
- Failure reason: requiredCapitalToday still age/`estimatedPublicPension` overlap → 1_200_000 instead of 400_000; validate still `missing_target_age` for date-only goals
- Date: 2026-08-31
- GREEN: same command — 41 passed

### Checker Fail fixes (2026-08-31)

- Case: Retraite without filled activeScenario — no fixed N-year horizon copy / projection
- Command: `npm test -- src/app/retraite/retraite-client.test.tsx`
- Failure reason: UI still showed « horizon fixe de 10 ans »
- GREEN: same command — 1 passed (copy « aucun horizon … inventé »; no projection cards without scenario)

- Case: legacy Objectifs age-only + profile birthDate → migrate targetDate at assess
- Command: `npm test -- packages/core/src/financial-goals.test.ts`
- Failure reason: `incomplete` stayed true (assess did not call `normalizeFinancialGoals` with birthDate)
- GREEN: same command — assess migrates; also `progressCurrent === 1`; normalize age/date wins; excel Âge cible cleared on write (6 excel tests)

## Last verify

- Command: `make verify` then Layer 2 targeted then `make e2e` (checker re-check)
- Result: Layer 1 green (90 / 606); Layer 2 green (61); Layer 3 green (2 Playwright)
- Date: 2026-08-31

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Maker session 2026-08-31: core `retirement-profile.ts`, schema scenarios + `publicPensionLink`, financial-goals date/link math, excel column, UI form + projection select, ADR 0025.

Maker Fail-fix session 2026-08-31: Retraite page mirrors Projection (no `DEFAULT_HORIZON_YEARS`); `assessFinancialGoals` + Objectifs page + GoalsAlignment normalize with `birthDate`; ADR 0014 see-also → 0025.

Checker session 2026-08-31: Pass after Fail fixes; Architecture B (codemap / constant) later polished.

Checker re-check 2026-08-31: Pass after Projection-only picker + architecture polish; Architecture A.
