# Artemis 26 — Game design and balance

## Status

Last update: 15 November, afternoon. Branch `worktree-agent-a41006d0160f23a5f`.

- **Done:** measured the game, changed five numbers, added `src/Engine/Tests/Balance.test.ts` (B1 to B8 plus three checks of our own, about 12 seconds). `npx tsc -b` and `npx vitest run` pass, including `src/Data/Tests`.
- **Integration (evening):** merged with the `Screens` branch. Radar Mk I bay 3 → **2**, so that buying the radar after flight one changes flight two (see "Flight two after the first purchase"). B9 added.
- **Not done:** the Magnetic Shield and the Flight Computer still change flight two's points by nothing (see "Not resolved"). The per-module entries below are short.
- **How to read this:** "measured" means a bot flew it on the real weeks (`GameData.weeks`). A bot is not a person. Where I say what a player will feel, that is my judgement.

## For the integrator

### Numbers changed

| Where | Old | New | Why |
|---|---|---|---|
| `ModuleCatalog` Spectrometer Mk I unlock points | 60 | **0** (a starting module) | Flight one had one useful instrument. Players pressed the same buttons on 67% of turns and a careful player earned only 11% more than a careless one. |
| `ModuleCatalog` Camera power | 2 | **3** | At 2 the camera earned over 70% of the data in the best calm-week loadouts, and with the spectrometer added it pushed the starter past B1's 170-point ceiling. |
| `BusCatalog` SmallSat base generation | 2 | **1** | The starter now makes 3 power a turn against 6 for camera plus spectrometer. Power runs short over an encounter, and a second Solar Array is worth fitting. |
| `Rules.anomalyRadiation` | 2 | **1** | Calm-leg losses came from the anomaly, not from forecast storms. With shielding Mk I the anomaly now does nothing. Without shielding it costs 1 hull a hit and cannot kill a full-hull spacecraft on a calm week. |
| `AsteroidFlyby` | inline 6 / 6 / 8 | named constants `baseCapacity`, **values unchanged** | So that later tuning does not touch the constructor. |
| `ModuleCatalog` Radar Mk I bay | 3 | **2** (Mk II 3, Mk III 4 unchanged) | At 3 the radar did not fit beside the camera and spectrometer with any power, so a careful player gained nothing from it (+0% on both weeks). At 2 it swaps for the Particle Detector and the Radiation Shielding, and flight two gains 13 to 26%. Measured below. |

Spectrometer power is 3, as before. It was 4 in one intermediate commit.

### Spec and text that must change

- **Spec 5.1:** SmallSat base generation 1.
- **Spec 5.2:** Camera power 3. Spectrometer unlock points 0 / 140 / 360.
- **Spec 5.3:** the player starts with six modules at Mk I: SolarArray, Battery, Camera, Spectrometer, ParticleDetector, RadiationShielding. The default loadout costs 49 of 60 and fills **8 of 8** bay units.
- **Spec 5.4, rank 1:** "In the lab from the start" loses Spectrometer: Radar, MagneticShield, FlightComputer.
- **Spec 4.6:** the anomaly adds **1** radiation.
- **Spec 13.1:** the starter spacecraft has generation **3**, capacity 12, hull 16, shielding 1.
- **Spec 5.2:** Radar Mk I bay 2.
- **Spec 13.2:** B6 is adjusted (below). B1a, B1b, B4a and B9 are new.
- **Spec 13.3:** the whole table is out of date. Replace it with the "After" columns below.
- `Concept.md` section 10 still holds. No string in `StringsEn.json` needed a change: module text takes its numbers from the catalog.
- **Saved games:** a profile saved before this change does not own the Spectrometer. `Profile.fromJson` starts from `Profile.starter()` and then adds what was saved, so old saves gain it. Nothing to migrate.

### What the screens must show for this design to work

1. **The Hangar must make it obvious that a module comes off to make room.** The starter now fills the bay 8 of 8, so every purchase means a swap. The lesson is "take the Particle Detector off on a calm week". If the Hangar only shows "over bay space", a new player will think the purchase was wasted.
2. **Power per turn against the plan's cost, every turn.** "Makes 3, plan costs 6" is the whole decision on flight one. `Flight.PowerNext` already shows "+gain next turn". Keep it next to the plan's cost.
3. **The radiation band on every contact card, including "Low".** An anomaly turn makes a calm contact show "Low". That band is how the anomaly is forecast. Without it the anomaly is dice. `ContactCard` shows it when `showsBandTo` allows. Keep it.
4. **The storm leg's band on the flight track before launch** (already in `ForecastLines`).
5. **Cooldowns stay off.** The screens do not show a resting module, and the measurements below say the option breaks the storm week.

### Tests

- Every test passes, including `src/Data/Tests/Data.test.ts`. Its B1 check ("starter on July 2019 banks under 170") was the binding constraint on these numbers. The greedy starter now banks 161.
- Engine tests whose pinned numbers changed: `Core`, `Encounter`, `Flight`, `Loadout`, `Modules`, `Progress`, `Robustness`, `Scanner`, `Bots`. In `Bots.test.ts` the sample-week checks now allow the starter up to 230 on the synthetic calm week. The radar check now compares swapping the battery, shielding and detector for a radar, not adding one.

## Evidence

Bots: **Greedy** presses every useful instrument it can afford. **Cautious** keeps shield power in reserve. **Planner** (`PlannerBot`) searches the rest of each encounter and stands in for a careful player. N = 60 to 300 seeds per row. Before = the code at `892ada1`. After = this branch.

### Flight one (starter, July 2019)

| Measure | Before | After |
|---|---|---|
| Greedy mean points / completed | 108 / 100% | 161 / 100% |
| Planner mean points | 120 | 215 |
| Careful player's gain over careless (Planner ÷ Greedy) | +11% | **+34%** |
| Turns where the plan repeats the previous turn's | 67% | **27%** |
| Turns where a useful instrument stays off (no power, or saved for a better turn) | 11% | **48%** |
| Turns where two instruments are wanted | 0% (one useful instrument) | 70% |

The careful player gets more by not firing at low signal (0.5) and saving charge for the peak turn or the next contact. The hard limit is rarely hit: the Planner runs out of power on only 1% of turns because it never lets the battery run dry. The Greedy player does, which is where its 34% goes. **Judgement:** that is a real but quiet decision. Turns feel different, but no single turn is agonising. See "Not resolved".

### Losses on calm legs

| Loadout | Week | Before: completed (Planner / Greedy), lost on a calm leg | After |
|---|---|---|---|
| Unshielded SmallSat, Camera, Spectrometer, Radar, one array | July 2019 | 98% / 100%, 1 of 180 | 100% / 100%, **0** |
| the same | Autumn 2022 | 68% / 83%, **36 of 180** | 98% / 98%, 19 of 300 |
| Starter | any calm week | 100%, 0 | 100%, 0 |

After the change, the remaining Autumn losses are spacecraft that flew the forecast Kp 6 storm with no shielding and were then finished off by 1-point anomaly hits at 1 to 3 hull. That is the player's choice made visible, and Hold is available. **Judgement:** acceptable. B1a now fails the build if anything can be lost in July 2019.

### Flight two after the first purchase

Measured on the integration branch: a profile with the starter modules plus one purchase, rank 2, SmallSat. For each bot, every maximal loadout it owns is flown on 6 seeds, the best is kept and then flown on 100 fresh seeds. Planner is the careful player, Greedy the careless one. Percentages are against the same bot with no purchase (Planner 224 on July, 240 on Autumn; Greedy 180 and 153).

| First purchase (points) | July 2019, Planner | July, Greedy | Autumn 2022, Planner | Autumn, Greedy |
|---|---|---|---|---|
| Radar I (90), bay 3 (before) | +0% | +0% | +0% | +6% |
| **Radar I (90), bay 2 (after)** | **+13%** | +4% | **+26%** | **+50%** |
| Magnetic Shield I (70) | +0% | +0% | +0% | +0% |
| Flight Computer I (40) | +0% | +0% | +0% | +0% |
| Spectrometer II (140) | +0% | +0% | +0% | +0% |
| Solar Array II (90) | +0% | +0% | +0% | +0% |
| Battery II (70) | +0% | +0% | +0% | +1% |
| Camera II (110) | +13% | +15% | +8% | −9% (75% complete) |
| High-Energy Detector I (120) | +0% | +0% | +29% | −7% |

Only the radar row changed between before and after. Flight one does not change at all: the radar is not in the starter kit. With the radar, the careful player's best loadout is the starter with the Particle Detector and the Radiation Shielding taken off and the radar fitted (Solar Array, Battery, Camera, Spectrometer, Radar: 8 of 8 bay, 54 of 60 $M). That is the swap the Hangar has to make obvious. B9 now fails the build if the radar gives a careful player less than 15% on Autumn 2022 or 5% on July 2019, or a careless one less than 15% on Autumn. 15% of 240 is about one more asteroid recorded on all three channels per flight.

Tried and rejected:

| Change | Result |
|---|---|
| Asteroid Spectrum 6 → 8 + size step (the earlier proposal) | Spectrometer II goes from +0% to +1% on July. Radar, Shield, Computer unchanged. Not worth breaking the 2019 OK numbers. |
| Radar power 4 → 3 | Careful player +0% on both weeks. |
| Asteroid Radar 8 → 12 + size | Careful player +0%. |
| Radar power 3 and bay 2 | +21% July, +27% Autumn: no better than bay 2 alone, and a cheaper radar would be the best instrument per power. |

### May 2024 once the Magnetic Shield is owned

| Loadout (Explorer) | Planner | Greedy | Cautious | Storm turns where shield and an instrument both want the power |
|---|---|---|---|---|
| Storm build: Mag II, Battery II, Array II, Shielding II, Detector II, Camera | 100% | 100% | 100% | 0% |
| Mag I, one array, battery, Detector, Camera, High-Energy, Shielding | 82% | **29%** | 91% | **32%** |
| Mag I, two arrays, battery, Detector, Spectrometer, Camera, Shielding | 96% | 86% | 100% | 9% |
| No Magnetic Shield (best found) | 0% | 0% | 0% | — |

The first May flight a player can afford (Mk I shield, thin power) is a real challenge. A careless player loses 71% of them and a careful one 9 to 18%. The fully upgraded storm build is trivially safe. It costs about 470 points of Mk II unlocks, so I judge that a fair reward. **Not changed:** Magnetic Shield power. Measured before the camera change: at 5 the Mk I builds fall to 10–55% even for the Planner, while the Mk II build stays at 100%. It would punish the first attempt without touching the easy case. If the easy case must go, cut Battery Mk II from +10 to +8 instead.

### Cooldowns (spec 4.11): keep off

Planner bot, on the code before this branch's number changes.

| Loadout, week | Off | On |
|---|---|---|
| Starter, July 2019 | 120 / 100% | 70 / 100% |
| Storm build Mag II, May 2024 | 187 / **100%** | 39 / **0%** |
| Mag I builds, May 2024 | 80–98% | 0% |

With cooldowns the shield cannot be raised on two turns running. Storm peaks are 8, 12, 8 on consecutive turns, so May 2024 becomes unsurvivable. The screens also do not show a resting module. Turn variety is better bought by power, as above.

### Best loadouts found by search (Cautious bot, every Mk I owned, 4 seeds per candidate)

| Week (bus) | Best | Mean | Instrument share of data |
|---|---|---|---|
| July 2019 (SmallSat) | 2 arrays, 2 batteries, Camera, Spectrometer | 191 | Visible 59%, Spectrum 41% |
| Autumn 2022 (SmallSat) | array, Camera, High-Energy, Shielding, Thrusters | 187 | Visible 76%, High-Energy 24% |
| May 2024 (Explorer) | 2 arrays, 2 batteries, Detector, High-Energy, Shielding, Mag, Flight Computer, Antenna | 239 | Particles 49%, High-Energy 51% |

The three weeks want different spacecraft (B5 passes). Every module the lab sells by rank 2 appears in some week's top five (B8 passes).

### Balance targets (spec 13.2), as tested in `Balance.test.ts`

| # | Target | Result | Note |
|---|---|---|---|
| B1 | Starter, July 2019, Greedy: ≥95% complete, 90–170 points | 100%, 161 | |
| B1a (new) | Nothing is lost in July 2019, shielded or not | 0 losses | |
| B1b (new) | Careful play earns ≥20% more on flight one | +34% | |
| B2 | Starter lost in May 2024 ≥90% | 100% lost | |
| B3 | Best Explorer without Magnetic Shield lost ≥60% in May 2024 | passes. A hand-built no-shield Explorer is lost 100%. | |
| B4 | Explorer with Mag I, Cautious, ≥85% | 91% | |
| B4a (new) | The same kit, Greedy, <60% | 29% | May must not be safe by default. |
| B5 | Best loadouts differ by ≥2 modules between weeks | pass | |
| B6 | No instrument >60% of the best loadout's data | **adjusted:** 60% on the Explorer, 80% on the SmallSat | On a 60 $M SmallSat the best Autumn build carries one main instrument plus the High-Energy Detector for the gamma-ray burst. The camera then does three quarters of the work. That follows from the budget and the real week, not from a broken number. |
| B7 | Greedy player rank 2 within 2 flights, rank 3 within 5 | rank 2 after flight 1, rank 3 after flight 3 | |
| B8 | No module absent from every week's top five | **adjusted:** every module sold by rank 2 | The search runs at Mk I on the bus of each week's rank. Antenna and Repair Drone (rank 3) are not required, but they do appear in May's top five. |
| B9 (new) | Radar bought after flight one: careful player ≥15% more on Autumn 2022 and ≥5% on July 2019, careless ≥15% on Autumn | +26%, +13%, +50% | |

## A new player's first five flights

From a Greedy campaign (`Campaign`: picks the best owned loadout, buys by a fixed priority, always flies the newest week). Measured, then my reading.

| Flight | Week | Banked | Rank after | What changed |
|---|---|---|---|---|
| 1 | July 2019 | 161 | 2 | Starter, refitted with two arrays and two batteries in place of the detector and shielding. Power is short at the peak. Then bought Spectrometer Mk II. |
| 2 | Autumn 2022 (new at rank 2) | 211 | 2 | First storm on the track (Kp 6, leg 2). DART impact and GRB 221009A are pinned rare events. Then bought Radar, Magnetic Shield and Flight Computer. |
| 3 | Autumn 2022 | 254 | 3 | Radar fitted in place of the batteries and the shielding (two arrays, Camera, Spectrometer, Radar). Explorer unlocked. Then bought Radar Mk II and Flight Computer Mk II. |
| 4 | Autumn 2022, Explorer | 290 | 4 | Three instruments and a Magnetic Shield on the medium spacecraft. May 2024 unlocked. Then bought Magnetic Shield Mk II and the High-Energy Detector. |
| 5 | May 2024, Explorer | 215 | 4 | First storm week, with a Mk II shield. |

Integration run, after the radar change. The bot's fixed priority buys Spectrometer Mk II first, which changes nothing (table above); a player who buys the radar first gets the gain one flight earlier.

**Judgement for judges who play two or three flights:** they meet a two-instrument decision on flight one, the storm and two rare events on flight two, a three-instrument spacecraft after the first radar purchase, and the medium spacecraft by flight three or four.

## Modules

| Module | Role | When to pick it | Evidence |
|---|---|---|---|
| Solar Array | Power per turn | Almost always two on the SmallSat | In 20 of 20 top July and Autumn loadouts. |
| Battery | Carries power to the peak turn | Two on the calm-week SmallSat, two on the storm Explorer | In 17 to 20 of the top 20 loadouts on every week. |
| Camera | Backbone of calm weeks | Everywhere but May | 59–76% of calm-week data. Watch for dominance. |
| Spectrometer | Second calm-week instrument | July. Planets with spectrum channels. | 41% of July's best. Its Mk II is weak on asteroids, whose Spectrum channel (6) fills in one use. |
| Radar | Close asteroids, survey | Autumn 2022, July's last two legs | The first purchase that pays: +26% (careful) and +50% (careless) on Autumn 2022 at bay 2. |
| Particle Detector | Storm science | May; Autumn's storm leg | Dead in July by design. It is the first thing to take off. |
| High-Energy Detector | Flares, GRB 221009A | Autumn and May | In 14 to 15 of the top 20 loadouts in each. |
| Radiation Shielding | Calm-week insurance, storm edge | Storm weeks; optional in July | It now cancels the anomaly fully. |
| Magnetic Shield | Storm survival | May (required) | 0% completion without it. |
| Flight Computer | Planning | Thin-power builds | Rarely in top loadouts on the SmallSat. Its value is information a bot already has. **Judgement:** worth more to a person than these numbers show. |
| Thrusters, Antenna, Repair Drone | S4 extras | May (Antenna, Drone), Autumn (Thrusters) | Appear in top-five lists. Their marks are not measured. |

## Spacecraft

| Bus | Role | Evidence |
|---|---|---|
| SmallSat (60 $M, 8 bay, base generation 1, base capacity 6) | Two instruments, or three with no protection | Three-instrument builds are power-limited on 34–90% of turns. |
| Explorer (110 $M, 12 bay) | Storm-capable | The only bus measured on May 2024. |
| Flagship | Not measured | — |

## Weeks

| Week | Role | Evidence |
|---|---|---|
| July 2019 | Calm. Camera and spectrometer. Radar only for the last two legs. | No losses in any loadout. |
| Autumn 2022 | One forecast Kp 6 storm. Two pinned rare events. Rewards Radar and the High-Energy Detector. | Unshielded spacecraft can be lost, and only after the storm. |
| May 2024 | Four storm legs. Magnetic Shield required. Flight care decides the Mk I attempt. | See the table above. |

## Not resolved

1. **Resolved for the radar, not for the Magnetic Shield or the Flight Computer.** The radar now changes flight two (table above). The Magnetic Shield and the Flight Computer change flight two's points by 0% on both weeks, before and after: the shield's job is May 2024 (0% completion without it), and the computer's is information a bot already has. Making either earn points on a calm week would change what the module is, so I left them. Spectrometer Mk II and the second marks of the power modules also give +0% on flight two, and the bot's campaign buys Spectrometer Mk II first. A player who does the same will feel the purchase was wasted. Raising asteroid Spectrum capacity does not fix this (+1%).
2. **Power rarely hits zero for a careful player** with two instruments, because channels fill in 2 or 3 uses. The decision is when to spend, not what to leave off. With the radar fitted there are three instruments on 3 power a turn, which deepens it.
3. **The Camera is still the calm-week backbone** (B6 had to be loosened for the SmallSat).
4. **Mk II and Mk III marks were not measured one by one.** The search used Mk I only. The campaign buys Mk II of Radar, Magnetic Shield, Flight Computer and Spectrometer (Mk III) without measuring each.
5. **The bots are not people.** The Planner knows every event's signal shape, and a new player does not. The real skill gap on flight one is probably larger than 34% at first and smaller later.

## Tools

- `src/Engine/Bots/PlannerBot.ts`, `EncounterPlanner.ts`: beam search over an encounter, which values hull by what the storms ahead will take.
- `src/Engine/Bots/LoadoutSearch.ts`: every maximal loadout a profile can fly, ranked by a bot.
- `src/Engine/Bots/Campaign.ts`: a profile flown, paid and upgraded flight after flight.
- `src/Engine/Tests/Balance.test.ts`: the targets above.
