# Contract: DCA-first monthly card (EF + breach alert)

- Branch: `feat/dca-first-monthly-card`
- Slug: `feat-dca-first-monthly-card`
- Matrix row (FEATURES.md): Next-euro plan (web) — reframe surfaces / Notes
- Cadrage tier: B (behavior)
- Challenger: required — new ADR superseding-in-part ADR 0021 / 0020 / 0015 UI framing

## Intent

- Symptom (who / when / pain): Sur Dashboard et Diversification, la carte **Ajustement DCA du mois** pousse à dévier du plan DCA pour rattraper les cibles de diversification. L’utilisateur suit son DCA comme règle ; les cibles servent surtout de garde-fous d’exposition. Le conseil fonds d’urgence (bandeau) reste pertinent mais est collé à cette carte.
- Suspected cause (`fact`): ADR 0021 / next-euro card answer « Faut-il dévier de ton plan DCA investi ce mois-ci ? » and Exécution defaults `useTilt` on when verdict is `tilt` / `adjust_plan`. Diversification already has `AllocationCoherenceCard` for band monitoring.
- Lever: Replace Dashboard card with DCA-first « Ce mois-ci » (EF + saved plan + breach-only exposure alert); remove tilt card from Diversification; Exécution defaults to saved DCA with opt-in tilt.
- Success signal: When investment pool > 0, Dashboard leads with saved DCA (+ EF when relevant + breach alert when applicable), never tilt catch-up euros; Diversification has no Next-euro tilt card; Exécution opens on saved plan. When pool === 0, this Dashboard card stays hidden (EF may still exist in core — accepted gap, same hide rule as ADR 0020/0021).
- Band-aid risk: Softening copy only while keeping tilt-default Exécution and dual surfaces — users still feel pushed to rebalance via DCA.

## Behavior cases

### Nominal

- [x] If investment DCA pool > 0 and EF surplus recommendation is non-`none`, then Dashboard « Ce mois-ci » shows the EF surplus copy as the primary advisory banner (hors enveloppe DCA), not band catch-up euros.
- [x] If investment DCA pool > 0, then Dashboard card lead states this month’s investment action is the **saved** DCA plan and links to Exécution; the card contains **no** tilt verdict lead and **no** per-asset catch-up euro list / « oriente X € » copy.
- [x] If coherence has one or more stock `band_drift` findings with tone `breach` (ADR 0012 stockPct — geo and/or CRYPTO keys), then Dashboard shows a short exposure alert listing those keys per D8 + link to Diversification.
- [x] If user opens Diversification, then `NextEuroPlanCard` / Ajustement DCA du mois is absent; `AllocationCoherenceCard` (and existing exposure panels) remain.
- [x] If Exécution loads with tilt verdict `tilt` or `adjust_plan`, then orders default to the **saved** DCA plan; applying diversification adjustment is an explicit opt-in toggle (off by default, not persisted — D9).

### Edge

- [x] If investment DCA pool === 0, then the monthly Dashboard card is hidden even if EF gap exists; do not resurrect capacity UI in this branch.
- [x] If coherence is null, aligned, or only `watch` (no stock `band_drift` breach), then Dashboard shows **no** exposure alert block.
- [x] If only `flow_misalign` findings exist (any tone) and there is no stock `band_drift` breach, then Dashboard shows **no** exposure alert (D3).
- [x] If multiple stock `band_drift` breaches, then Dashboard alert follows D8 (top 3 by |signedΔ|, then link Diversification).
- [x] If EF recommendation is null or mode `none`, then Dashboard card omits the EF banner but still shows saved-DCA lead when pool > 0.
- [x] If tilt verdict is `aligned`, Exécution uses saved plan; tilt toggle is not pushed as required.
- [x] If user enables tilt then navigates away and returns to Exécution, toggle is off again (D9 — no persistence).

### Out of scope

- [x] Explicitly not in this branch: mobile Next-euro / monthly card UI
- [x] Explicitly not in this branch: deleting `buildMonthlyDcaTilt` / core tilt math (kept for opt-in Exécution)
- [x] Explicitly not in this branch: re-enabling Savings capacity Dashboard card
- [x] Explicitly not in this branch: changing diversification target sheet / coherence tones (ADR 0012)
- [x] Explicitly not in this branch: auto-resize LIVRET DCA or EF config changes (ADR 0018/0020 math stays)
- [x] Explicitly not in this branch: showing EF-only Dashboard surface when investment pool === 0

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Diversification surface | **LOCKED** | Remove `NextEuroPlanCard` from Diversification page entirely | Keep card with softer copy — rejected (wrong place for monthly DCA action) |
| D2 | Dashboard card content | **LOCKED** | New DCA-first monthly card: EF banner (when relevant) + saved-DCA lead + link Exécution + breach-only exposure alert | Keep current NextEuroPlanCard summary — rejected (pushes tilt); EF-only card without DCA reminder — rejected (loses monthly action anchor) |
| D3 | Exposure alert threshold | **LOCKED** | Stock `band_drift` **breach** only (ADR 0012 stockPct geo/CRYPTO — not `watch`, not `flow_misalign` alone) | Any misaligned finding — rejected (noisy); no Dashboard alert — rejected by user |
| D4 | Exécution tilt default | **LOCKED** | Saved DCA by default; tilt is opt-in when available | Keep default-on — rejected; remove tilt from Exécution — deferred |
| D5 | Core tilt math | **LOCKED** | Keep `buildMonthlyDcaTilt` for Exécution opt-in; stop using it as Dashboard/Diversification primary narrative | Delete tilt module — rejected this branch |
| D6 | Docs / ADR | **LOCKED** | New ADR supersedes-in-part: **0021** (Dashboard+Diversification tilt card + title Ajustement DCA + Exécution tilt-on default); **0020** UI host only (EF banner moves to « Ce mois-ci », hide-when-pool=0 unchanged); **0015** placement (Diversification / Dashboard as next-euro tilt surfaces). Update glossary + `next-euro-plan.md` + FEATURES Notes | Docs-only without ADR — rejected |
| D7 | Card title (FR) | **LOCKED** | « Ce mois-ci » on Dashboard | Keep « Ajustement DCA du mois » — rejected; « Fonds d’urgence » alone — rejected (D2) |
| D8 | Multi-breach alert | **LOCKED** | List up to **3** stock breach keys sorted by descending \|signedΔ\|, then « voir Diversification » | Single worst key only — rejected (hides other breaches); uncapped list — rejected (noisy) |
| D9 | `useTilt` persistence | **LOCKED** | **Not** persisted — each Exécution mount starts with toggle off | Session/localStorage persistence — rejected (would re-push tilt next visit) |
| D10 | Component strategy | **LOCKED** | New Dashboard « Ce mois-ci » component; **stop mounting** `NextEuroPlanCard` on Dashboard and Diversification (may delete or leave unmounted for later cleanup) | Soften `NextEuroPlanCard` in place — rejected (dual narrative risk) |

## Teach-back

Human accepted 2026-08-26 (scenarios 1–5). Scenario 6 added post-Challenger (same intent; no product flip) and accepted 2026-08-26.

- [x] Scenario 1: DCA investi 500 €/mois, EF gap avec reco mensuelle « ajoute 80 € LIVRET », stock US en breach. → Dashboard « Ce mois-ci » montre d’abord le bandeau EF, puis « suis ton plan DCA (500 €) » + lien Exécution, puis alerte exposition US → Diversification. Pas de liste « oriente X € vers US ».
- [x] Scenario 2: Même DCA, EF OK (mode none), aucune bande en breach (watch only ou aligned). → Carte Dashboard sans bandeau EF ni alerte exposition ; lead = plan DCA sauvé + lien Exécution.
- [x] Scenario 3: Page Diversification. → Pas de carte Ajustement DCA / Next-euro ; cohérence d’allocation toujours visible si cibles renseignées.
- [x] Scenario 4: Exécution, verdict tilt disponible. → À l’ouverture, ordres = plan sauvé ; case « Appliquer l’ajustement… » décochée ; cocher recalcule via contributions tilt.
- [x] Scenario 5: Pool investi = 0. → Pas de carte « Ce mois-ci » sur le Dashboard (même si gap EF).
- [x] Scenario 6: Pool > 0, US en watch, EUROPE en stock breach, flow_misalign breach sur US seulement. → Alerte Dashboard = EUROPE (pas US watch, pas flow-only) ; si plusieurs breaches stock, top 3 par \|Δ\| (D8).

## Scope

- [x] One behavior for this branch: Reframe monthly web guidance to DCA-first + keep EF advice + breach exposure ping; demote diversification tilt to Exécution opt-in; remove Diversification tilt card.
- [x] Files / packages expected to change:
  - `src/components/` — new « Ce mois-ci » card + tests; stop using `NextEuroPlanCard` on Dashboard/Diversification
  - `src/app/page.tsx`, `src/app/diversification/page.tsx`
  - `src/app/investissements/dca-execution.tsx` (+ tests) — default `useTilt` false; no persistence
  - `@patrimo/core` copy helpers as needed for EF / saved-DCA / breach alert strings
  - `docs/adr/` new ADR; glossary; `packages/core/next-euro-plan.md`; ADR 0021/0020/0015 see-also; `FEATURES.md` Notes

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test --` targeted paths for Ce mois-ci card (EF / saved DCA / breach D8 / hide pool=0), Diversification no NextEuroPlanCard, Exécution default-off + non-persisted tilt — RED → GREEN per cases above
- Layer 3: `make e2e` (web UI change)
- Feature-specific: no workbook schema change expected

## Exclusions

- Not in this branch: mobile parity; capacity card re-enable; deleting tilt core; changing ADR 0012 bands; EF oneshot/monthly math changes; EF-only Dashboard when pool === 0
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md) — **Pass** 2026-08-26 (see PROGRESS)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [x] Update `FEATURES.md` row **Next-euro plan** Notes to: `ADR 0015/0020/0021 + 0022; web Dashboard « Ce mois-ci » (EF + saved DCA + breach alert); Diversification card absent; Exécution tilt opt-in` — status stays `done` / mobile `absent`
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
