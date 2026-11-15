# Artemis 26 — Game design and balance

## Status

Kept current as work goes. Last update: 15 November, first commit.

- **Done:** read the concept, spec and engine; dumped the three real weeks; wrote a stronger bot (`src/Engine/Bots/PlannerBot.ts`, beam search over the rest of an encounter in `EncounterPlanner.ts`); measured the game as it stands (below).
- **In progress:** turn-level statistics, the new player's first five flights, and the first number change.
- **Next:** fix the worst problem, re-measure, commit; then `src/Engine/Tests/Balance.test.ts` (B1 to B8); then the per-module, per-bus and per-week write-up.

## Baseline: the game as it was (measured)

100 seeds per row, real weeks (`GameData.weeks`). Greedy and Cautious are the existing bots; Planner is the new one (plans each turn by searching the rest of the encounter, knows the event's signal shape and the storm's shape but not hidden shadow or anomaly turns).

| Loadout | Week | Greedy mean / completed | Planner mean / completed |
|---|---|---|---|
| Starter | July 2019 | 109 / 100% | 120 / 100% |
| Starter | Autumn 2022 | 101 / 100% | 138 / 100% |
| Starter | May 2024 | 27 / 0% | 28 / 0% |
| SmallSat Camera, Spectrometer, Radar, one array, no shielding | July 2019 | 212 / 100% | 204 / 98% |
| the same | Autumn 2022 | 198 / 84% | 200 / 62% |
| SmallSat Camera, Spectrometer, array, battery, shielding | July 2019 | 174 / 100% | 222 / 100% |
| the same | Autumn 2022 | 149 / 100% | 234 / 100% |
| Explorer storm build with Magnetic Shield Mk II | May 2024 | 185 / 100% | 186 / 100% |
| Explorer, no Magnetic Shield | May 2024 | 56 / 0% | 59 / 0% |

First reading (judgement, to be tested):

1. **The starter has no turn decision.** Generation 4 a turn against a Camera that costs 2: the camera is on every turn and power never binds. The better bot gains only 10% on July 2019.
2. **May 2024 is binary.** With a Magnetic Shield Mk II it is 100% safe and every bot plays it identically; without one it is 0%.
3. **Losses on calm weeks come from the South Atlantic Anomaly,** not from anything the player saw coming: an unshielded SmallSat loses 16% to 38% of Autumn 2022 flights.
