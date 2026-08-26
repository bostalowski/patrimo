# Contract: DCA-first Dashboard surfaces (EF + breach alert)

- Branch: `feat/dca-first-monthly-card`
- Slug: `feat-dca-first-monthly-card`
- Matrix row (FEATURES.md): Next-euro plan (web) — reframe surfaces / Notes
- Cadrage tier: B (behavior)
- Challenger: required — new ADR superseding-in-part ADR 0021 / 0020 / 0015 UI framing

## Amendment 2026-08-26 (human UX follow-up, same branch)

Locked into Intent / cases / decisions below (supersedes initial « Ce mois-ci » grab-bag):

- EF surplus copy → **EmergencyFundCard** (not a monthly card).
- **Remove** Dashboard « Ce mois-ci » / `ThisMonthCard`; Exécution remains the DCA action surface.
- Stock breach → **DashboardExposureAlert** (conditional, no DCA lead).
- EF surplus may show when investment pool === 0 (no longer tied to a monthly-card hide rule).
- ADR 0022 updated in place; glossary + FEATURES Notes synced.

## Intent

- Symptom (who / when / pain): Sur Dashboard et Diversification, la carte **Ajustement DCA du mois** pousse à dévier du plan DCA pour rattraper les cibles de diversification. L’utilisateur suit son DCA comme règle ; les cibles servent surtout de garde-fous d’exposition. Le conseil fonds d’urgence (bandeau) reste pertinent mais était collé à cette carte (puis à un « Ce mois-ci » grab-bag).
- Suspected cause (`fact`): ADR 0021 / next-euro card answer « Faut-il dévier de ton plan DCA investi ce mois-ci ? » and Exécution defaults `useTilt` on when verdict is `tilt` / `adjust_plan`. Diversification already has `AllocationCoherenceCard` for band monitoring. A « Ce mois-ci » card that also reminded saved DCA duplicated Exécution.
- Lever: Host EF surplus on EmergencyFundCard; show breach-only `DashboardExposureAlert`; remove Dashboard tilt / « Ce mois-ci » card and Diversification Next-euro tilt card; Exécution defaults to saved DCA with opt-in tilt.
- Success signal: Dashboard never shows tilt catch-up euros or a « Ce mois-ci » DCA reminder; EF surplus appears on Fonds d’urgence (including when investment pool === 0); Diversification has no Next-euro tilt card; Exécution opens on saved plan; stock breach alert appears only when applicable.
- Band-aid risk: Softening copy only while keeping tilt-default Exécution and dual surfaces — users still feel pushed to rebalance via DCA.

## Behavior cases

### Nominal

- [x] If EF surplus recommendation is non-`none`, then `EmergencyFundCard` shows the EF surplus copy (hors enveloppe DCA), not band catch-up euros — including when investment DCA pool === 0.
- [x] Dashboard does **not** mount `ThisMonthCard` / « Ce mois-ci » and does **not** show tilt verdict lead or per-asset catch-up euro list / « oriente X € » copy; monthly investment DCA action lives on Exécution.
- [x] If coherence has one or more stock `band_drift` findings with tone `breach` (ADR 0012 stockPct — geo and/or CRYPTO keys), then Dashboard shows `DashboardExposureAlert` listing those keys per D8 + link to Diversification.
- [x] If user opens Diversification, then `NextEuroPlanCard` / Ajustement DCA du mois is absent; `AllocationCoherenceCard` (and existing exposure panels) remain.
- [x] If Exécution loads with tilt verdict `tilt` or `adjust_plan`, then orders default to the **saved** DCA plan; applying diversification adjustment is an explicit opt-in toggle (off by default, not persisted — D9).

### Edge

- [x] If investment DCA pool === 0 and EF surplus is actionable, then `EmergencyFundCard` still shows surplus copy; no capacity UI resurrected.
- [x] If coherence is null, aligned, or only `watch` (no stock `band_drift` breach), then Dashboard shows **no** exposure alert block.
- [x] If only `flow_misalign` findings exist (any tone) and there is no stock `band_drift` breach, then Dashboard shows **no** exposure alert (D3).
- [x] If multiple stock `band_drift` breaches, then Dashboard alert follows D8 (top 3 by |signedΔ|, then link Diversification).
- [x] If EF recommendation is null or mode `none`, then `EmergencyFundCard` omits the surplus banner (health UI unchanged when health is present).
- [x] If tilt verdict is `aligned`, Exécution uses saved plan; tilt toggle is not pushed as required.
- [x] If user enables tilt then navigates away and returns to Exécution, toggle is off again (D9 — no persistence).

### Out of scope

- [x] Explicitly not in this branch: mobile Next-euro / monthly card UI
- [x] Explicitly not in this branch: deleting `buildMonthlyDcaTilt` / core tilt math (kept for opt-in Exécution)
- [x] Explicitly not in this branch: re-enabling Savings capacity Dashboard card
- [x] Explicitly not in this branch: changing diversification target sheet / coherence tones (ADR 0012)
- [x] Explicitly not in this branch: auto-resize LIVRET DCA or EF config changes (ADR 0018/0020 math stays)
- [x] Explicitly not in this branch: adding a Dashboard saved-DCA reminder card (Exécution is the action surface)

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Diversification surface | **LOCKED** | Remove `NextEuroPlanCard` from Diversification page entirely | Keep card with softer copy — rejected (wrong place for monthly DCA action) |
| D2 | Dashboard surfaces | **LOCKED** | No « Ce mois-ci » card; EF surplus on `EmergencyFundCard`; breach-only `DashboardExposureAlert`; Exécution = DCA action | Keep ThisMonthCard with saved-DCA lead — rejected (duplicates Exécution); EF-only without breach alert — rejected by user |
| D3 | Exposure alert threshold | **LOCKED** | Stock `band_drift` **breach** only (ADR 0012 stockPct geo/CRYPTO — not `watch`, not `flow_misalign` alone) | Any misaligned finding — rejected (noisy); no Dashboard alert — rejected by user |
| D4 | Exécution tilt default | **LOCKED** | Saved DCA by default; tilt is opt-in when available | Keep default-on — rejected; remove tilt from Exécution — deferred |
| D5 | Core tilt math | **LOCKED** | Keep `buildMonthlyDcaTilt` for Exécution opt-in; stop using it as Dashboard/Diversification primary narrative | Delete tilt module — rejected this branch |
| D6 | Docs / ADR | **LOCKED** | ADR 0022 supersedes-in-part **0021** (Dashboard+Diversification tilt card + Exécution tilt-on default); **0020** UI host (EF surplus on EmergencyFundCard); **0015** placement. Update glossary + `next-euro-plan.md` + FEATURES Notes | Docs-only without ADR — rejected |
| D7 | EF surface title (FR) | **LOCKED** | Keep « Fonds d’urgence » on `EmergencyFundCard`; no Dashboard « Ce mois-ci » title | Keep « Ce mois-ci » grab-bag — rejected (amendment); « Ajustement DCA du mois » — rejected |
| D8 | Multi-breach alert | **LOCKED** | List up to **3** stock breach keys sorted by descending \|signedΔ\|, then « voir Diversification » | Single worst key only — rejected (hides other breaches); uncapped list — rejected (noisy) |
| D9 | `useTilt` persistence | **LOCKED** | **Not** persisted — each Exécution mount starts with toggle off | Session/localStorage persistence — rejected (would re-push tilt next visit) |
| D10 | Component strategy | **LOCKED** | Extend `EmergencyFundCard`; add `DashboardExposureAlert`; **remove** `ThisMonthCard`; **stop mounting** `NextEuroPlanCard` on Dashboard and Diversification | Soften `NextEuroPlanCard` in place — rejected (dual narrative risk); keep ThisMonthCard — rejected (amendment) |

## Teach-back

Human accepted 2026-08-26 (scenarios 1–5). Scenario 6 added post-Challenger and accepted 2026-08-26. Amendment teach-back (scenarios 1–2, 5 rewritten) accepted 2026-08-26 per PROGRESS cadrage lock.

- [x] Scenario 1: DCA investi 500 €/mois, EF gap avec reco mensuelle « ajoute 80 € LIVRET », stock US en breach. → `EmergencyFundCard` montre le bandeau EF ; `DashboardExposureAlert` liste US → Diversification ; **pas** de carte « Ce mois-ci » ni liste « oriente X € vers US ».
- [x] Scenario 2: Même DCA, EF OK (mode none), aucune bande en breach (watch only ou aligned). → Pas de bandeau EF surplus ; pas d’alerte exposition ; pas de carte « Ce mois-ci ».
- [x] Scenario 3: Page Diversification. → Pas de carte Ajustement DCA / Next-euro ; cohérence d’allocation toujours visible si cibles renseignées.
- [x] Scenario 4: Exécution, verdict tilt disponible. → À l’ouverture, ordres = plan sauvé ; case « Appliquer l’ajustement… » décochée ; cocher recalcule via contributions tilt.
- [x] Scenario 5: Pool investi = 0 avec gap EF actionable. → `EmergencyFundCard` montre le surplus EF ; pas de carte « Ce mois-ci ».
- [x] Scenario 6: Pool > 0, US en watch, EUROPE en stock breach, flow_misalign breach sur US seulement. → Alerte Dashboard = EUROPE (pas US watch, pas flow-only) ; si plusieurs breaches stock, top 3 par \|Δ\| (D8).

## Scope

- [x] One behavior for this branch: Reframe monthly web guidance away from tilt catch-up; keep EF advice on Fonds d’urgence + breach exposure ping; demote diversification tilt to Exécution opt-in; remove Diversification tilt card and Dashboard « Ce mois-ci ».
- [x] Files / packages expected to change:
  - `src/components/` — `EmergencyFundCard` surplus + `DashboardExposureAlert` (+ tests); remove `ThisMonthCard`; stop using `NextEuroPlanCard` on Dashboard/Diversification
  - `src/app/page.tsx`, `src/app/diversification/page.tsx`
  - `src/app/investissements/dca-execution.tsx` (+ tests) — default `useTilt` false; no persistence
  - `@patrimo/core` breach helpers (`this-month-copy`) + EF banner copy reuse
  - `docs/adr/` ADR 0022; glossary; `packages/core/next-euro-plan.md`; ADR 0021/0020/0015 see-also; `FEATURES.md` Notes

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test --` targeted paths for EmergencyFundCard surplus, DashboardExposureAlert (breach D8), Dashboard page wiring (no ThisMonthCard), Diversification no NextEuroPlanCard, Exécution default-off + non-persisted tilt — RED → GREEN per cases above
- Layer 3: `make e2e` (web UI change)
- Feature-specific: no workbook schema change expected

## Exclusions

- Not in this branch: mobile parity; capacity card re-enable; deleting tilt core; changing ADR 0012 bands; EF oneshot/monthly math changes; Dashboard saved-DCA reminder card
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md) — re-check after CONTRACT sync + commit + e2e (prior Pass was pre-follow-up; re-checker Fail 2026-08-26)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [x] Update `FEATURES.md` row **Next-euro plan** Notes to: `ADR 0015/0020/0021 + 0022; web EF surplus on Emergency fund card; Dashboard breach alert; Diversification card absent; Exécution tilt opt-in` — status stays `done` / mobile `absent`
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
