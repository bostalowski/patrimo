# Contract: Observation indicative de la tranche d’imposition (foyer)

- Branch: `feat/tax-bracket-observation`
- Slug: `feat-tax-bracket-observation`
- Matrix row (FEATURES.md): **Fiscalité** (web done / mobile partial) — enrichir web ; **Budget** (web done) — carte d’observation
- Cadrage tier: B (behavior)
- Challenger: required — new workbook sheet, structuring `@patrimo/core` IR-barème math, new ADR (household progressive IR was deferred in [ADR 0028](../../../adr/0028-realestate-projection-reliability.md))

## Intent

- Symptom (who / when / pain): On ne peut nulle part **voir dans quelle tranche IR on se situe**, ni obtenir un **ordre de grandeur clé en main** (impôt estimé + taux de prélèvement à la source à viser). La TMI est un enum saisi à la main (immobilier / PER). Le Budget suit le cashflow sans lien avec un barème.
- Suspected cause (`fact`): `@patrimo/core` n’a pas de barème progressif foyer / quotient / TMI / PAS dérivés. [CONSTRAINTS.md](../../../../CONSTRAINTS.md) §3 + ADR 0028 ont volontairement limité la fiscalité à des heuristiques (PFU, TMI × base locative). (`fact`)
- Lever (where we act on the cause): Introduire un **foyer fiscal indicatif** persisté (source de revenu + parts) et un observateur « pack impôts » dans `@patrimo/core` — tranche / TMI / IR estimé (**somme progressive des tranches**, pas TMI × RNI) / **taux PAS conseillé** — exposé **sur Budget et Fiscalité**. Les **seuils du barème** viennent d’une **série officielle synchronisée** (même geste que la sync prix / Livret — [ADR 0024](../../../adr/0024-livret-official-rate-series.md)), pas d’un chiffre inventé en UI. Pas un moteur de déclaration.
- Success signal (observable): (1) Source `MANUAL` (brut/net/net imposable) **ou** `FROM_BUDGET` ; (2) Budget (carte lecture seule) et Fiscalité (formulaire + carte) montrent les **mêmes** TMI, tranche, IR annuel/mensuel, taux PAS conseillé, calculés avec le **barème daté le plus récent** de seed ∪ cache ; (3) disclaimer « indicatif » (dont absence de décote / plafond QF) + année de revenus du barème affichée ; (4) tests + round-trip feuille foyer ; (5) pas de réécriture Budget depuis le foyer ; (6) échec fetch **ou** parse barème **ne casse pas** la sync prix ni n’efface le cache.
- Band-aid risk (if we only treat the symptom): Afficher seulement le TMI immobilier saisi, ou une TMI sans IR/PAS, ou un IR = TMI × RNI — l’utilisateur ne peut pas « régler » son PAS ni chiffrer l’impôt. Hardcoder un seul millésime sans sync (rejeté en D7) laisse les seuils périmer. Omettre décote / plafond QF sans disclaimer donne une fausse précision PAS.

## Behavior cases

### Nominal

- [x] N1: If `incomeSource` is `MANUAL`, `manualBasis` is `NET_IMPOSABLE`, and `manualAmount` is a positive monthly amount, then `observeTaxBracket` returns annual RNI = `manualAmount × 12`, quotient = RNI / `parts`, TMI = rate of the last IR bracket the quotient reaches, plus tranche bounds + `roomToNextBracket` (core result only; UI surfaces in N6).
- [x] N2: If `incomeSource` is `MANUAL` and `manualBasis` is `BRUT`, then annual RNI is the annualized amount after the indicative 10 % *frais professionnels* abatement clamped by the **embedded** min/max constants for the seed income year (D5 / D15 — not fetched from OpenFisca this branch), then TMI/tranche as in N1.
- [x] N3: If `incomeSource` is `MANUAL` and `manualBasis` is `NET`, then annual RNI is the annualized amount **without** the 10 % abatement (cash net treated as RNI proxy), with a stronger indicative disclaimer flag on the result, then TMI/tranche as in N1.
- [x] N4: If `incomeSource` is `FROM_BUDGET`, then annual cash income = sum of **all** budget lines with `kind === "REVENU"` via existing `monthlyAmount` (frequency already normalized) × 12 — including `SALAIRE`, `PRIME`, `LOCATIF`, `AUTRE_REVENU` with **no** regime filter — treated with the same RNI rule as `NET` (N3), then TMI/tranche as in N1.
- [x] N5: If the foyer config is saved on web, then sheet **Foyer fiscal** round-trips (`incomeSource`, `manualAmount`, `manualBasis`, `parts`) via the web serializer; mobile serializer **parses and rewrites unchanged** the same sheet so a later mobile workbook write does not drop the rows.
- [x] N6: If Fiscalité is open, then a full foyer section owns **create/edit** controls + barème visualization (seuils du cache) + pack chiffres (IR, PAS) + disclaimer. If Budget is open, then the **same** observation card (shared component, **read-only** — no foyer writes) shows the same figures from the same core result, with a link to Fiscalité for configure / long form. Incomplete foyer (E1) shows CTA on both, without invented numbers.
- [x] N7: If `parts` is 2 (or any valid value > 1, including half-parts e.g. 1.5) vs 1 with the same RNI, then quotient and possibly TMI / IR / PAS change according to simplified quotient familial (tax per part × parts; TMI from quotient vs brackets; **no** plafond QF).
- [x] N8: If an observation is computed with IR indicatif > 0, then core also returns `irMensuelIndicatif = irAnnuel / 12` and `tauxPrelevementConseille` = IR / `assiettePas` (see D13), distinct from TMI (marginal). UI display of the PAS % is covered by N6 / D12.
- [x] N9: If IR indicatif is 0 (e.g. low quotient in the 0 % band), then `tauxPrelevementConseille` is **0** and `irMensuelIndicatif` is 0 — not an empty/error state when the foyer is otherwise configured.
- [x] N10: If web/mobile **price sync** runs, then platforms fetch/merge the official IR barème series into a local cache (not the Excel workbook; CONSTRAINTS §2 spirit — derived cache, not recoverable history); subsequent `observeTaxBracket` uses the **chronologically latest** dated table in seed ∪ cache (D7 resolve). Same isolation pattern as Livret rates — ADR 0024.
- [x] N11: If seed barème revenus **2025** is in force, `MANUAL` / `NET_IMPOSABLE` / 2 500 €/mois / 1 part, then IR annuel indicatif equals the **progressive** tax on quotient 30 000 € (0 % band + 11 % band + 30 % slice above 29 579 €) ≈ **2 103,99 €** (unit test pins ±0,01 €) — **not** `30 000 × 30 %`. PAS = IR / RNI ≈ **7,0 %** (1 decimal), strictly below TMI 30 %.

### Edge

- [x] E1: If `incomeSource` is `FROM_BUDGET` and there is no `REVENU` line (or annualized total is 0), then `observeTaxBracket` returns status `incomplete` (no invented TMI / IR / PAS). UI CTA (add Budget revenus or switch to `MANUAL`) is part of N6.
- [x] E2: If `incomeSource` is `MANUAL` and `manualAmount` is missing or ≤ 0, then write is rejected (API/core validation) — no silent 0 % TMI/PAS presented as a result.
- [x] E3: If `parts` is missing, ≤ 0, non-finite, or not a positive multiple of `0.5`, then write is rejected. Absent sheet → E4 (`not configured`); there is **no** silent default household / `parts = 1` without a saved config.
- [x] E4: If the workbook has no **Foyer fiscal** sheet, behave as « not configured » (no observation numbers, CTA to configure on Fiscalité) — backward compatible.
- [x] E5: If quotient sits exactly on a bracket upper bound, TMI is the rate of the bracket that bound **closes** according to the official table convention documented in core (inclusive/exclusive as in the locked year table) — one unit test pins the boundary.
- [x] E6: If the next bracket does not exist (top 45 % band), then `roomToNextBracket` is `null` / « dernière tranche » — do not show a fake next threshold.
- [x] E7: Changing Budget `REVENU` lines while `incomeSource` is `FROM_BUDGET` changes the observation (TMI / IR / PAS) without writing foyer amount fields; switching to `MANUAL` freezes the last saved manual amount and ignores Budget revenus for the pack.
- [x] E8: If `assiettePas` would be 0 while IR > 0 (should not happen for valid configs), then `tauxPrelevementConseille` is omitted / null — never divide by zero; unit test guards the helper.
- [x] E9: If the IR barème fetch **fails**, or the YAML/JSON **parse is malformed/empty**, during price sync, then price sync still succeeds; existing barème cache is **preserved** (not wiped); cold start uses embedded seed in `@patrimo/core` (offline). Observation never blocks on network.

### Out of scope

- [ ] Explicitly not in this branch: auto-write Budget lines from foyer amounts; auto-sync `tmiAssocie` / PER `tmiNow`; option barème vs PFU on CTO; IFI; CSG déductible; AV 4 600/9 200; parts complexes (invalidité, garde alternée fine, calculator enfants) ; mobile **UI** of the observation (serializer read/rewrite-safe only) ; scraping HTML BOFiP/service-public (use machine-readable OpenFisca YAML) ; filing / avis d’impôt import ; **décote** / **plafond quotient familial** / CEHR ; sync du taux PAS vers un employeur ou impots.gouv ; prélèvements sociaux dans ce pack (reste sur Fiscalité PFU existante) ; bouton « sync barème » séparé (hooked to price sync only) ; **fetch/sync of OpenFisca `abatpro` min/max YAML** (embedded seed constants only — D15) ; filtering `LOCATIF` / other Budget categories out of `FROM_BUDGET`.

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 — Tranche shipping | How slices reach review | LOCKED | Incremental commits in **one open PR** (first slice opens the PR; later slices push on the same branch) | Stacked PRs merged before the next slice pushes |
| D2 — Surfaces | Where to observe | LOCKED | **Both** web Budget (shared **read-only** card) and web Fiscalité (full section + **sole config editor**). Same core result. | Budget only; Fiscalité only; editable foyer on both pages |
| D3 — Income sources | How RNI is obtained | LOCKED | Exclusive `incomeSource`: `MANUAL` (amount + `BRUT` \| `NET` \| `NET_IMPOSABLE`) **or** `FROM_BUDGET` (annualized sum of all `kind === "REVENU"` via `monthlyAmount`). Budget cashflow stays user-authored; foyer save **must not** upsert Budget lines. `FROM_BUDGET` is a cash RNI **proxy** (includes `LOCATIF` etc. — no micro-foncier / PFU split). | Derive TMI only from existing `tmiAssocie`; always Budget; always manual; exclude `LOCATIF` from the sum |
| D4 — Amount convention | Monthly vs annual input | LOCKED | Manual amount is **monthly** (same grain as Budget). Core annualizes × 12. | Annual-only field; mix of frequencies in foyer sheet |
| D5 — Basis heuristics | BRUT / NET / Budget → RNI | LOCKED | `NET_IMPOSABLE`: annualize as RNI. `BRUT`: annualize then indicative 10 % frais pro clamped by **embedded** min/max (D15). `NET` and `FROM_BUDGET`: annualize as RNI **proxy** (no 10 %), stronger disclaimer. Not a payslip engine. | Treat all bases as RNI; reverse-engineer cotisations from NET; apply 10 % on NET too; sync `abatpro` YAML this branch |
| D6 — Quotient | Household parts | LOCKED | Simplified: `quotient = RNI / parts`; apply **progressive** barème to quotient; IR indicatif = tax_per_part × parts; TMI = last bracket rate on quotient. User-entered `parts` = positive multiple of `0.5`. No automatic part calculator; **no** plafond QF. | No parts (TMI on RNI only); full CGI part engine + plafond |
| D7 — Barème source | Where thresholds come from | LOCKED | **Fetch/merge during price sync** (web `POST /api/prices/sync` + mobile price sync), same family as Livret ([ADR 0024](../../../adr/0024-livret-official-rate-series.md)). Machine-readable source: OpenFisca-France `impot_revenu/bareme_ir_depuis_1945/bareme.yaml` (mirrors art. 197 CGI). Cache: web `data/ir-bareme.json`, mobile AsyncStorage — **derived cache**, not workbook SoT (CONSTRAINTS §2 spirit). Embedded **seed** in `@patrimo/core` for cold start / offline. Core stays pure (series in → observation out). **Resolve:** use the chronologically **latest** dated bracket table in seed ∪ cache (cache wins on same `effectiveFrom`). Fetch **or** malformed/empty parse MUST NOT fail price sync nor wipe cache. ADR **0031** extends CONSTRAINTS §4. UI shows which income-year barème is in force. No user-edited thresholds in Excel. | Hardcode one year forever; scrape HTML service-public/BOFiP; put barème rows in the workbook; separate sync button; resolve by “calendar year as-of” instead of latest dated table |
| D8 — Persistence | Workbook shape | LOCKED | Optional sheet **`Foyer fiscal`** (pattern `Fonds urgence`): columns for source, monthly amount, basis, parts only. `Workbook.foyerFiscalConfig?`. Barème thresholds live in **cache/seed**, not on this sheet. Mobile parse + rewrite-unchanged to preserve the sheet. | Store thresholds in Excel; `data/config.json` for foyer income; reuse Immobilier `tmiAssocie` |
| D9 — Tax constraint | Legal posture | LOCKED | Keep CONSTRAINTS §3: figures **indicative**. Visible disclaimer on both pages: IR + PAS are heuristics, **not** an avis; **no décote**, **no plafond QF**, **no CEHR**, frais-pro min/max may lag synced barème year. New ADR **0031** (household observation + PAS conseil + **official barème sync**). Append-only see-also on ADR 0028 uncovered « household progressive IR ». Update CONSTRAINTS §4 allowlist. | Present as avis d’impôt ; reopen ADR 0028 in place without new ADR |
| D10 — Downstream TMI | Immobilier / PER | LOCKED | **Do not** auto-write `tmiAssocie` or PER TMI this branch. Observation is standalone. Optional later prefill. | Write through to every property on save |
| D11 — Platforms | Web vs mobile UI | LOCKED | V1 UI **web only**. Mobile: serializer must read (and rewrite unchanged) **Foyer fiscal** so Excel is not stripped; mobile may still merge IR barème cache on price sync (N10) with no observation UI. | Mobile Fiscalité/Budget UI parity in the same branch |
| D12 — Pack clé en main | What the UI must show | LOCKED | Always show together when configured: **TMI**, tranche bounds + room-to-next, **IR annuel indicatif**, **IR mensuel** (IR/12), **taux PAS conseillé** (D13). Label TMI as marginal and PAS as average-style withhold tip. No prélèvements sociaux in this card. Disclaimer must call out missing décote / plafond QF. | TMI-only badge; IR without PAS; full décote / CEHR |
| D13 — PAS formula | How recommended withhold rate is computed | LOCKED | `tauxPrelevementConseille = IR_indicatif / assiettePas` (ratio 0–1, UI as % to **1 decimal**). `assiettePas`: for `NET` and `FROM_BUDGET` = annualized cash amount (closest to employer PAS base); for `NET_IMPOSABLE` = RNI; for `BRUT` = annualized brut × `(1 − 0.22)` (indicative employee social-charge haircut, constant in core). If IR = 0 → rate 0. Distinct from TMI. Disclaimer: not the personalized rate from impots.gouv. | PAS = TMI; PAS always = IR/RNI only; ignore BRUT haircut; push rate to employer API |
| D14 — Config UX | Who edits the foyer | LOCKED | **Fiscalité only** creates/edits/saves foyer config (API + form). Budget card is observation-only + link to Fiscalité. | Editable foyer controls duplicated on Budget |
| D15 — Frais-pro constants | Min/max source vs barème sync | LOCKED | Embed 10 % + min/max for seed income year **2025** in `@patrimo/core` (OpenFisca `abatpro`: min **509** €, max **14 555** € — pin in seed + test). **Do not** fetch `abatpro/*.yaml` this branch. If resolved barème year ≠ seed abatpro year, still apply embedded constants and rely on D9 disclaimer (frais-pro floor/ceiling may lag). | Sync abatpro YAML alongside bareme.yaml; omit min/max clamp (10 % only) |

## Teach-back

Human marks each ✅/❌. Acceptance is recorded **only** in PROGRESS (`Teach-back: accepted`).

Official barème used for numbers below = **revenus 2025** (impôt 2026), service-public / art. 197 CGI / OpenFisca `2025-01-01`: 0 % ≤ 11 600 € ; 11 % ≤ 29 579 € ; 30 % ≤ 84 577 € ; 41 % ≤ 181 917 € ; 45 % au-delà. After sync, the app uses the **chronologically latest** dated table in seed ∪ cache (may advance later without a code change).

**Challenger 2026-10-05:** scenarios amended (pinned progressive IR € / PAS %, Budget read-only card, frais-pro seed constants). Prior teach-back acceptance is **void until human re-accepts** all scenarios below.

- [ ] Scenario 1 — Manuel net imposable : 1 part, 2 500 €/mois en `NET_IMPOSABLE`. RNI = 30 000 €. Quotient = 30 000 € → TMI = **30 %**. IR annuel progressif ≈ **2 104 €** (pas 9 000 €). PAS conseillé ≈ **7,0 %** (&lt; TMI). Bornes tranche 30 % + marge avant 84 577 €. Mêmes chiffres carte Budget (lecture seule) + Fiscalité. Disclaimer + année de barème + pas de décote/plafond QF. Aucune ligne Budget créée. Config editable seulement sur Fiscalité.
- [ ] Scenario 2 — Depuis le Budget : `FROM_BUDGET`, une ligne `REVENU` / `SALAIRE` 2 000 €/mois, 1 part. RNI proxy = 24 000 € → TMI **11 %**. Passer à 3 000 €/mois → RNI 36 000 → TMI **30 %**. Une ligne `LOCATIF` compte aussi dans la somme (proxy cash, pas de filtre régime). Passer en `MANUAL` → Budget n’alimente plus le calcul.
- [ ] Scenario 3 — Parts : RNI 30 000 €, **2 parts**. Quotient = 15 000 € → TMI **11 %**. IR / PAS plus bas qu’à 1 part. Demi-part **1,5** acceptée à l’enregistrement ; `parts = 0` refusée.
- [ ] Scenario 4 — Brut : `MANUAL` / `BRUT` 4 000 €/mois, 1 part. RNI après 10 % frais pro (sous plafond seed) → TMI **30 %**. Même montant en `NET` (sans 10 %) → IR indicatif plus élevé.
- [ ] Scenario 5 — Vides : pas de feuille **Foyer fiscal** → CTA Fiscalité. `FROM_BUDGET` sans `REVENU` → état incomplet (pas de chiffres inventés). `parts = 0` / montant ≤ 0 → refus enregistrement.
- [ ] Scenario 6 — Pack PAS : scénario 1 → outre TMI 30 %, afficher **IR annuel ≈ 2 104 €**, **IR mensuel (÷12)**, **taux PAS conseillé ≈ 7,0 %** (IR / RNI, 1 décimale, **&lt; TMI**). Identique Budget (carte) / Fiscalité. Disclaimer indicatif.
- [ ] Scenario 7 — Sync barème : offline / cache seed → observation fonctionne avec le barème seedé. Après sync prix réussie, les seuils viennent du **dernier** millésime mergé OpenFisca ; si le fetch **ou** le parse barème échoue, la sync prix reste OK et l’ancien cache/seed continue (pas d’effacement).

## Scope

- [ ] One behavior for this branch: Persist an indicative household fiscal config (manual **or** Budget revenus); sync official IR barème during price sync (seed ∪ cache); observe a **turnkey tax pack** (tranche / TMI / progressive IR € / PAS %) on web Budget (read-only card) + Fiscalité (editor) — without writing Budget lines or property TMI.
- [ ] Files / packages expected to change:
  - Core: `packages/core/src/schema.ts`, `workbook-template.ts`, `tax-bracket.ts` + `ir-bareme.ts` (seed/merge/resolve, like livret-rates) (+ tests), `ARCHITECTURE.md`
  - Docs: ADR 0031 (+ CONSTRAINTS §4 allowlist), glossary (**Foyer fiscal** sheet), ADR 0028 see-also, `FEATURES.md` / price-sync note on merge
  - Web: `src/lib/excel.ts`, `src/lib/ir-bareme/sync.ts` hooked in price sync, `src/app/api/foyer-fiscal/route.ts`, shared observation component, `src/app/fiscalite/*`, `src/app/budget/*`, e2e smoke
  - Mobile: `mobile/lib/excel-mobile.ts` foyer parse/rewrite-unchanged; `mobile/lib/ir-bareme` (or equivalent) hooked in price sync

## Verification

- `verify-static`: `make verify`
- `verify-behavior`: `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme` plus serializer/API/sync tests — cases N1–N11, E1–E9 as RED → GREEN slices
- `verify-e2e`: `make e2e` (workbook I/O + web UI / API)
- Screenshots: Fiscalité foyer section (configured + empty CTA); Budget card (same TMI + PAS %, read-only); barème year label — see [ui-screenshots-in-pr.md](../../howto/ui-screenshots-in-pr.md)
- Feature-specific: save foyer → reload Excel → same pack; observation uses seed thresholds offline; mocked sync merges new thresholds; N11 golden IR/PAS; sync isolation if barème fetch/parse fails; Budget cannot POST foyer

When `verify-behavior` applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Behaviour-gate cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

Ship as incremental commits in one open PR (D1 — tranche shipping).

| # | Tranche | Behavior cases covered | Verify bands | PR / commit |
|---|---|---|---|---|
| 1 | Core seed/resolve barème + `observeTaxBracket` (progressive IR + TMI + PAS) + schema **Foyer fiscal** + frais-pro seed constants | N1 N2 N3 N4 N7 N8 N9 N11 E1 E2 E3 E5 E6 E7 E8 | verify-static verify-behavior | not yet shipped |
| 2 | Workbook I/O foyer + API + **IR barème sync** web/mobile (price-sync hook, parse-fail isolation) | N5 N10 E4 E9 | verify-static verify-behavior verify-e2e | not yet shipped |
| 3 | Shared read-only Budget card + Fiscalité editor/section + disclaimer (pack clé en main, D14) | N6 | verify-static verify-e2e | not yet shipped |
| 4 | ADR 0031 + CONSTRAINTS §4 + glossary + ARCHITECTURE + ADR 0028 see-also + FEATURES | | verify-static | not yet shipped |

## Exclusions

- Not in this branch: rewriting Budget from foyer; syncing immobilier/PER TMI; PFU vs barème on financial envelopes; IFI / décote / plafond QF / CEHR finesse; pushing PAS to employer or impots.gouv; mobile observation UI; importing avis d’impôt; HTML scraping; dedicated barème-only sync UX; OpenFisca `abatpro` network sync; Budget-side foyer editor
- Do not refactor unrelated modules (realized events PFU, real-estate `annualTax`, savings-capacity, Livret rate math)

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when `verify-behavior` applied; behaviour-gate teach-back / cadrage lock recorded when `verify-behavior` applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix (Fiscalité web: foyer / tranche / PAS observation)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Behaviour-gate: all product decisions **LOCKED**, teach-back accepted, Challenger Pass (`Challenger: required`), then `make branch-ready` must pass before coding.
