# Adaptateur Ship — Patrimo

Lu par la skill `ship` au bootstrap. Remplace les étapes propres à la swile-stack.
Le harness du repo (`AGENTS.md`, `CONSTRAINTS.md`) prime sur `ship`.

## Correspondance des étapes

| Étape Ship | Patrimo |
|---|---|
| Intake / cadrage | `make branch-contract` → CONTRACT rempli → `make branch-ready` |
| 5 TDD stack | `make red CASE=… CMD=…` (RED sur test ciblé). Pas de swile-stack. |
| 6 Build | RED → GREEN, une tranche à la fois ([tdd-red-green](../docs/howto/tdd-red-green.md)) |
| 7 Vérif | `make verify`, puis `make gauntlet`. `make e2e` : **proposer d'abord** (voir ci-dessous) |
| 8 Contrôle | `make checker` + agent séparé (`swile-independent-controller`), ≤ 3 tours |
| 9 Alignement | ARCHITECTURE / ADR / glossaire / FEATURES à jour |
| Fin | `make pr-check` doit passer |

## Autonomie

Après l'acceptation du cadrage, les étapes 5 à Fin s'enchaînent **sans demander**.
Arrêts autorisés uniquement :

1. `make e2e` (`verify-e2e` s'applique : UI web, `src/app/api`, workbook I/O, settings) : proposer, attendre le oui ;
2. besoin hors CONTRACT ;
3. blocage après 3 tours de contrôle.

Jamais de saut d'étape « parce que c'est petit ». Seul le Tier A
(`verify-behavior: n/a` dans le CONTRACT) allège cadrage-lock et RED → GREEN.
Un hook Stop (`scripts/stop-pr-check.sh`) bloque la fin de session si `make pr-check` échoue.
