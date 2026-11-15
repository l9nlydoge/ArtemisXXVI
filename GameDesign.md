# Artemis 26 — Game design and balance

## Status

Last update: 15 November, about 13:45. Branch `worktree-agent-a503422c6c602291a`.

- **Done (this pass):** the two open items of the previous pass, both about a judge's ten-minute session.
  1. **The storm week now opens on flight three.** May 2024 needed rank 4 (900 points), which a careful player reached on flight five. It now opens at rank 3 with the Explorer, and rank 3 needs 350 points. Every careful campaign measured (24 of 24) flies May 2024 on flight three. Careless campaigns fly it on flight three (19 of 24) or four (5 of 24).
  2. **The Lab after flight one no longer sells dead purchases on a calm week.** Mk II marks moved from rank 2 to rank 3, so they arrive with the storm week and the Explorer, where the power and protection marks have work to do. After flight one the Lab offers five Mk I modules: three earn a careful player 11 to 25% more on a week that is open, and the other two (Magnetic Shield, Flight Computer) are what keeps the spacecraft alive in the storm week, which opens one flight later. Thrusters take 1 bay instead of 2, which takes them from +9% to +12%.
- **Tests:** B7 tightened, B8's May search runs at May's new rank, B10 and B11 added. `npx tsc -b`, `npx vitest run` (287 tests, about 15 seconds) and `npm run build` pass.
- **Not done:** four Mk II marks (Solar Array, Spectrometer, Radar, Radiation Shielding) and the Repair Drone still measure +0% on flight three. See "Not resolved".
- **How to read this:** "measured" means a bot flew it on the real weeks (`GameData.weeks`). A bot is not a person. Where I say what a player will feel, that is my judgement.

## For the integrator

### Numbers and gates changed in this pass

| Where | Before | After | Why |
|---|---|---|---|
| `WeekDefinitions.json` May 2024 `minRank` | 4 | **3** | Opens with the Explorer, the smallest spacecraft that can carry a Magnetic Shield and still record. At rank 4 a careful player saw it on flight five. |
| `Rank.thresholds` rank 3 | 400 | **350** | At 400, 10 of 24 careful campaigns were short after two flights (they bank 158 to 220 on flight two, because the planets repeat and the logbook pays less). At 350, 24 of 24 reach it. |
| `Rules.markRanks` | [1, 2, 4] | **[1, 3, 4]** | Mk II at rank 2 offered six purchases on flight two that changed nothing on a calm week (Solar Array, Battery, Spectrometer, Particle Detector, Radiation Shielding II at +0%). They now open with the storm week, where Battery II, Particle Detector II and Magnetic Shield II earn 9 to 26%. |
| `ModuleCatalog` Thrusters bay | 2 / 2 / 3 | **1 / 1 / 2** | At 2 they only fitted in place of an instrument: +9% July, +0% autumn for a careful player. At 1 they take the Particle Detector's place: +12% July, +9% autumn (careless +25% and +31%). |

Nothing else changed: no module cost, value, power or unlock price, no bus, no event, no string. Rank 4 now unlocks only Mk III.

Earlier passes changed: Spectrometer Mk I unlock 60 → 0, Camera power 2 → 3, SmallSat base generation 2 → 1, anomaly radiation 2 → 1, Radar Mk I bay 3 → 2. Those still hold.

### Interface text

No sentence in `src/I18n/StringsEn.json` writes one of these numbers. Rank, mark and threshold strings all take parameters (`Week.Locked`, `Lab.Rank`, `Home.ToNext`, `Unlock.Mark`). Things the screens engineer should check by eye:

- **Debrief "Now open" at rank 3** now lists the Explorer, the May 2024 week, Antenna, Repair Drone and "Mk II of every module" together. That is five lines on one debrief; the rank 4 debrief lists only Mk III.
- **Imaging planets need Camera Mk II** (`minMark 2`). On flights one and two `Contact.NeedsMark` / `Waste.NeedsMark` now point at a mark the player cannot buy until rank 3. The text is correct, but a Lab hint that says "buy it" would be wrong before rank 3.
- **Any hint or Home line that says the storm week is "far off"** or names rank 4 would now be wrong. I found none in the strings.
- **Saved games:** a profile saved before this change with a Mk II bought at rank 2 keeps it. `LoadoutSearch` and `Loadout.issues` check the mark's rank, so the Hangar will show that Mk II as rank-locked until the player reaches 350 points. Players who reached rank 2 before (150 to 349 points) are now rank 2 still; players with 350 to 399 move up to rank 3.

### Spec

`ImplementationSpec.md` sections 5.2, 5.4, 6.5, 13.2, 13.3 and open point 16.4 are brought into line. Section 4 quotes none of these numbers. Sections 9 and 10 are left to the screens engineer.

### What the screens must show for this design to work

1. **The Week screen must make May 2024's lock visible from the start** ("Unlocks at rank 3") so the judge knows it is two flights away.
2. **The Hangar must make the swap obvious.** The starter fills the bay 8 of 8, so every purchase means taking something off.
3. **Before May 2024, the Lab and Hangar should say that the Magnetic Shield is what survives it.** A player who has not bought it by flight three has no way to finish the week (0% in every measurement).
4. **Power per turn against the plan's cost, every turn; the radiation band on every contact card; the storm legs on the flight track before launch; cooldowns off.** Unchanged from the previous pass.
5. **The Flight Computer's next-turn conditions must be visible in the storm,** because what it buys is knowing whether the next storm turn needs the shield (measured below).

## Method and harness

- `src/Engine/Bots/Campaign.ts` plays a profile flight after flight: chooses the best loadout it owns for the week, flies it, banks, buys in a fixed order. New: a cheap `scout` bot ranks the candidates and the flying bot tries the best 16 (when there are more than 80), the log keeps the profile before and after the Lab, and there is a careful buying order (`carefulPriorities`: Radar, Magnetic Shield, High-Energy Detector, Camera, …) and week choice (`newestShieldedWeek`: the newest week, but not a week with Kp 8+ storms until a Magnetic Shield is owned).
- `src/Engine/Bots/PurchaseStudy.ts`: for a profile and a Lab offer, the best loadout the bot can fly on a week with and without the purchase, flown on fresh seeds. A purchase can never lower the score, because the player can keep the old fit.
- `Tools/Balance/*.probe.ts`, run with `npx vitest run --config Tools/Balance/vitest.config.ts --disableConsoleIntercept`. `Study` (campaigns and purchase tables; `CAMPAIGNS`, `FLY`, `AFTER` set the sizes), `Foresight` (the Flight Computer on fixed loadouts), `Variants` (one-number changes tried in place). These are not part of `npx vitest run`.

**Player models.** *Careful:* PlannerBot flies (it searches the rest of each encounter, using only the turns the spacecraft can see), Cautious scouts loadouts, buys Radar first and the Magnetic Shield second, stays out of May 2024 until it has a shield. *Careless:* GreedyBot flies (presses every useful instrument it can afford, shields only when 3 or more radiation is coming), the old default buying order (Spectrometer, Radar, Magnetic Shield, Flight Computer, …), always flies the newest week. Both choose their fit by searching what they own, which is better than a new player will do.

**Sizes and stability.** Campaigns: 24 seeds of five flights each, per model. Flight seeds `seed × 1000 + flight`. Purchase values: 4 search seeds, then 60 flights. The run-to-run spread of a purchase value is about ±3 points of percentage for a fixed loadout; the larger error is in choosing the loadout on 4 seeds, which can hide a gain under 10% (one case below). A full study run takes about three minutes.

## Evidence

### Problem 1: flights until each week opens

| Week | Before (May at rank 4, rank 3 at 400): careful | careless | After: careful | careless |
|---|---|---|---|---|
| July 2019 | flight 1 (24 of 24) | flight 1 | flight 1 | flight 1 |
| Autumn 2022 | flight 2 (24 of 24) | flight 2 (21 of 24), 3 (3) | flight 2 (24 of 24) | flight 2 (21 of 24), 3 (3) |
| May 2024 | flight 5 (5 of 6), 6 (1 of 6) | flight 5 (3 of 6), 6 (3 of 6) | **flight 3 (24 of 24)** | **flight 3 (19 of 24), 4 (5 of 24)** |

("Before" for May is from a 6-campaign run; the other rows did not change.)

Rank 2 at 150 opens autumn 2022 after flight one for every careful campaign and 21 of 24 careless ones (88%). The three that miss banked 142 to 149 on July 2019 with GreedyBot; they fly July again and open autumn on flight two. I left 150 as it is: the careful player always reaches it, and a careless first flight that banks under 150 is the B1 lesson working.

**Points per flight (After, mean, min to max, lost):**

| Flight | Careful | Careless |
|---|---|---|
| 1 (July 2019) | 227 (185–263), 0 lost | 182 (142–237), 0 lost |
| 2 (autumn 2022) | 186 (158–220), 0 lost | 221 (73–323), 2 lost |
| 3 | May 2024: 191 (85–273), **3 of 24 lost** | autumn or May: 174 (55–249), 3 lost |
| 4 (May 2024) | 249 (102–312), 1 lost | 194 (153–293), 0 lost |
| 5 (May 2024) | 294 (261–376), 0 lost | 213 (168–285), 0 lost |

Flight two banks less than flight one for the careful player: autumn on the SmallSat is harder, and the distant planets repeat between the weeks, so the logbook pays less for them. Rank 4 arrives on flight four or five.

### Problem 1: can the player survive the storm week when it opens?

When May 2024 opens, the careful player owns the starter modules, Radar Mk I and Magnetic Shield Mk I, and has about 230 points. Their fit for May (22 of 24 campaigns): Explorer with Solar Array, Battery, Camera, Spectrometer, Radar, Particle Detector, Radiation Shielding, Magnetic Shield, all Mk I (12 of 12 bay). Flown on 100 fresh seeds:

| Who flies that fit | Points | Completed |
|---|---|---|
| PlannerBot (careful) | 188 | **82%** |
| CautiousBot | 155 | 94% |
| GreedyBot (spends the shield's power on instruments) | 149 | **60%** |

| Other May 2024 fits | Planner | Greedy | Cautious |
|---|---|---|---|
| The B4 kit (Mag I, array, battery, Camera, Particle and High-Energy Detectors, shielding) | 79% (82% earlier pass) | 29–33% | 91–95% |
| Two arrays, two batteries, Camera, both detectors, shielding, Mag I (2 of 24 campaigns, after buying the High-Energy Detector) | 100% | 97% | 100% |
| No Magnetic Shield, best fit | 0% | 0% | 0% |
| The starter | 0% | 0% | 0% |

In the campaigns, 3 of 24 careful players lost their first May flight (and banked half). **Judgement:** dangerous, not impossible, not free. Without the shield it cannot be finished; with a Mk I shield on thin power, care is worth 20 points of completion; with power bought (two arrays, two batteries) it is safe, which is the reward for reading the forecast. The careless campaign also lost 3 of 24, because its fit search is better than a careless person's; a careless person with an instrument-heavy fit is the B4a row (29%).

### Problem 2: what each Lab purchase is worth

Median careful profile after flight one: rank 2, 230 points. Gain in the next flight's points, best fit with against without, 60 seeds. Completion stayed at 98 to 100% throughout unless stated.

**Before** (Mk II at rank 2, Thrusters bay 2). The Radar and High-Energy rows here are from the same harness; the previous pass measured +13% / +26% and +0% / +29%.

| Offer (points) | July, careful | July, careless | Autumn, careful | Autumn, careless |
|---|---|---|---|---|
| Radar I (90) | +11% | +7% | +25% | +57% |
| High-Energy Detector I (120) | +0% | +0% | +18% | +0% |
| Camera II (110) | +11% | +15% | +7% | +15% |
| Thrusters I (100) | +9% | +4% | +0% | +1% |
| Magnetic Shield I (70) | +0% | +0% | +0% | +0% |
| Flight Computer I (40) | +0% | +0% | +0% | +0% |
| Solar Array II, Battery II, Spectrometer II, Particle Detector II, Radiation Shielding II | +0% | +0% | +0 to 1% | +0 to 1% |

**After** (what the Lab now offers after flight one):

| Offer (points) | July, careful | July, careless | Autumn, careful | Autumn, careless | May 2024, one flight later |
|---|---|---|---|---|---|
| Radar I (90) | +11% | +7% | **+25%** | +57% | in the careful fit |
| High-Energy Detector I (120) | +0% | +0% | **+18%** | +0% | +41% at rank 3, completion 87 → 100% |
| Thrusters I (100), bay 1 | **+12%** | +25% | +9% | +31% | +0% |
| Magnetic Shield I (70) | +0% | +0% | +0% | +0% | **completion 0% → 82%** (required) |
| Flight Computer I (40) | +0% | +0% | +0% | +0% | **completion 79% → 93%, points +12%** (B4 kit with a free bay) |

No offer is so strong that it makes the others pointless: the largest careful gain is the radar's +25% on autumn, the High-Energy Detector is close behind there, and July is best served by the radar or the thrusters. B11 fails the build if any non-storm offer drops under 10%, if any reaches 40%, or if fewer than three reach 10%.

**After flight two** (median careful profile: rank 3, 258 points, owns Radar I and Magnetic Shield I; the Explorer is now the bus). Careful player, best of the three open weeks:

| Offer (points) | Best gain, careful | Where |
|---|---|---|
| High-Energy Detector I (120) | +41%, completion 87 → 100% | May 2024 (+24% autumn) |
| Particle Detector II (80) | +26% | May 2024 |
| Thrusters I (100) | +10% | July and autumn |
| Battery II (70) | +10%, completion 87 → 98% | May 2024 |
| Camera II (110) | +10% | July 2019 |
| Antenna I (120) | +10% | July and autumn |
| Magnetic Shield II (150) | +9% (careless +18%) | May 2024 |
| Solar Array II (90), Spectrometer II (140), Radar II (170), Radiation Shielding II (80), Repair Drone I (110), Flight Computer I (40) | +0% | — |

### The Flight Computer: what foresight is worth

Its effect is information: the next turn's real conditions (Mk I), or more. PlannerBot plans with what the spacecraft can see and assumes average conditions for the rest, so it is the bot that can use it. Same loadout with and without the computer, 150 seeds:

| Week, loadout | Planner: none → Mk I → Mk II → Mk III | Greedy and Cautious |
|---|---|---|
| July 2019, SmallSat, array, battery, Camera, Spectrometer | 213.6 → 213.6 → 213.7 → 214.2 | no change |
| Autumn 2022, SmallSat with Radar | 182 → 182 → 182 → 185 (97 → 100% at Mk III) | no change |
| July or autumn, Explorer | +0 to 0.3 points | no change |
| **May 2024, B4 kit (Mag I)** | **179 (79%) → 201 (93%) → 209 (100%) → 211 (100%)** | Greedy no change; Cautious worse (its reserve rule keys on unseen storm turns) |

**Honest value:** on a calm week the computer is worth nothing measurable: shadow and the anomaly are rare and cheap, and a careful player loses little by not seeing them. In the storm it is the second-best survival purchase in the game: Mk I turns 21% losses into 7% for 40 points, because the storm's turn-by-turn radiation is random around the forecast and seeing the next turn tells the player whether to raise the shield. It is +0% in the purchase table above only because the careful May fit fills the Explorer's 12 bay; with a free bay (Variants: bay 0) it takes that fit from 87% to 97% completed. A person probably gains more than the bot on calm weeks, because the bot already knows every event's signal shape.

### Earlier evidence that still holds

These were not re-run except where marked; none of the changed numbers touches them.

| Measure (flight one, starter, July 2019) | Value |
|---|---|
| Greedy points / completed | 161 / 100% (B1, 300 seeds) |
| Planner points | 215 |
| Careful over careless | +34% (B1b requires 20%) |
| Turns where the plan repeats the previous turn's | 27% |

| Calm-leg losses | Result |
|---|---|
| July 2019, any loadout | 0 (B1a) |
| Autumn 2022, unshielded SmallSat | 2% of flights, after the Kp 6 storm at low hull |

| Cooldowns (spec 4.11) | Off | On |
|---|---|---|
| Storm build Mag II, May 2024, Planner | 100% | 0% |

Keep cooldowns off.

### Balance targets (spec 13.2), as tested in `Balance.test.ts`

| # | Target | Result |
|---|---|---|
| B1 | Starter, July 2019, Greedy: ≥95% complete, 90–170 points | 100%, 161 |
| B1a | Nothing is lost in July 2019, shielded or not | 0 losses |
| B1b | Careful play earns ≥20% more on flight one | +34% |
| B2 | Starter lost in May 2024 ≥90% | 100% |
| B3 | Best Explorer without Magnetic Shield lost ≥60% in May 2024 | 100% |
| B4 | Explorer with Mag I, Cautious, ≥85% | 91–95% |
| B4a | The same kit, Greedy, <60% | 29–33% |
| B5 | Best loadouts differ by ≥2 modules between weeks | pass (May searched at rank 3 now) |
| B6 | No instrument >60% of the best Explorer loadout's data, 80% on the SmallSat | pass |
| B7 | Greedy reaches rank 2 within 2 flights and **rank 3 within 3** (was 5) | pass. Tightened because rank 3 is now the storm week. |
| B8 | Every module sold by rank 2 appears in some week's top five | pass |
| B9 | Radar after flight one: careful ≥15% autumn, ≥5% July; careless ≥15% autumn | pass |
| **B10** (new) | Careful campaigns (seeds 1–3): rank 2 after flight one, rank 3 and a Magnetic Shield after flight two; careless (seeds 3–4): rank 3 after flight three. May's rank gives the Explorer. The careful player's May fit: Planner completes 75–97%, Greedy at least 10 points less. | pass (82% and 60% on 100 seeds) |
| **B11** (new) | Every Lab offer after flight one: ≥10% on an open week for a careful player, except the two storm modules; none ≥40%; at least three ≥10%. Magnetic Shield: May fit at rank 3 from ≤10% to ≥75% completed. Flight Computer: +8 points of May completion on the B4 kit. | pass |

## A new player's first five flights

From the careful campaign, seed 1 (Planner flies; typical of the 24). Measured, then my reading.

| Flight | Week | Banked | Rank after | Fit, then what was bought |
|---|---|---|---|---|
| 1 | July 2019 | 233 | 2 | Starter refitted: two arrays and two batteries in place of the Particle Detector and the shielding. Autumn 2022 opens. Bought Radar I (90) and Magnetic Shield I (70). |
| 2 | Autumn 2022 | 198 | 3 | SmallSat with the radar in place of the Spectrometer and a battery, keeping the shielding for the Kp 6 storm. Explorer, May 2024, Antenna, Repair Drone and Mk II open together. Bought Radar II. |
| 3 | **May 2024**, Explorer | 246 | 3 | Mk I shield on thin power (one array, one battery) with four instruments. 82% of such flights finish. Bought Magnetic Shield II, High-Energy Detector I, Battery II. |
| 4 | May 2024 | 306 | 4 | Two arrays, Battery II, both detectors, Mag II. Mk III opens. Bought High-Energy Detector II, Camera II. |
| 5 | May 2024 | 368 | 4 | Safe storm build. Bought Camera III. |

A careless player (Greedy, seed 1) banks 180 on July 2019, buys the radar and the shield, flies autumn without shielding and is **lost** in the storm leg (73 banked), reaches rank 3 on flight three and meets May 2024 on flight four.

**Judgement for a judge who plays three to five flights:** flight one teaches power; flight two brings the storm leg, two rare events and the radar swap; flight three is the great storm on the medium spacecraft, with a shield bought two flights earlier for exactly this. A judge who plays well sees the best content in about seven minutes.

## Modules

| Module | Role | When it first pays | Evidence |
|---|---|---|---|
| Solar Array | Power per turn | Flight one (two on the SmallSat) | In every top July and autumn fit. Mk II +0% (bay 2 for +1 generation). |
| Battery | Carries power to the peak turn | Flight one; Mk II in May | Mk II +10% and 87 → 98% completion in May. |
| Camera | Backbone of calm weeks | Flight one | Mk II +10% on July (imaging planets need it). |
| Spectrometer | Second calm-week instrument | Flight one | Mk II +0%: asteroid Spectrum (6) fills in two Mk I uses. |
| Radar | Close asteroids, survey | Flight two | +25% careful, +57% careless on autumn. Mk II +0% (asteroid Radar 8+ fills in two uses either way). |
| Particle Detector | Storm science | May | Mk II +26% in May. |
| High-Energy Detector | Flares, GRB 221009A | Autumn | +18% autumn on the SmallSat; +41% and full completion in May on the Explorer. |
| Radiation Shielding | Calm-week insurance, storm edge | Autumn's storm leg | Mk II +0% (bay 2). |
| Magnetic Shield | Storm survival | May (required) | 0% → 82% completion. Mk II +9% careful, +18% careless. |
| Flight Computer | Foresight | May | Mk I 79 → 93% completion on the B4 kit; 0 on calm weeks. Loses its slot on a full Explorer. |
| Thrusters | Peak signal on demand, chase | Flight two | Bay 1: +12% July, +9% autumn. |
| Antenna | Points ×1.1 | Rank 3 | +10% on calm weeks. |
| Repair Drone | One heal per flight | Rank 3 | +0%: the careful fit has no bay for it and the Planner rarely needs it. |

## Weeks

| Week | Rank | Role |
|---|---|---|
| July 2019 | 1 | Calm. Camera and spectrometer. Nothing can be lost. |
| Autumn 2022 | 2 | One forecast Kp 6 storm leg, DART and GRB 221009A. Rewards the radar and the High-Energy Detector. Unshielded spacecraft can be lost after the storm. |
| May 2024 | **3** | Four storm legs (Kp 9, 9, 7, 6). Magnetic Shield required, Explorer only. Care decides the Mk I attempt; bought power makes it safe. |

## Not resolved

1. **Four Mk II marks and the Repair Drone are still +0% when they first appear** (Solar Array II, Spectrometer II, Radar II, Radiation Shielding II). They now open at rank 3 beside the storm week rather than on flight two, so a player who buys one has other good options on the same screen, but the purchase itself still changes nothing. Tried in place with `Variants.probe.ts`, all still +0% for the careful player: Solar Array II bay 1, Spectrometer II bay 2, Radar II bay 2, Radar II value 8, Radar II value 8 and bay 2. Solar Array II bay 1 did add +8% in May on a hand-swapped fit, but the search did not pick it on 4 seeds, so I did not change it. The reason is mostly in the rules, not the numbers: an asteroid's Spectrum (6) and Radar (8 + size) channels fill in two Mk I uses, so a stronger instrument saves a turn's power but records nothing more, and on the Explorer power is not the limit on calm weeks.
   **Rule change I would propose (not made):** let a mark above the event's `minMark` add a share of its excess to the channel's capacity (for example capacity + 2 per mark above Mk I), so a Mk II instrument records more from the same asteroid. That is a rule (spec 4.7), so I stopped short of it.
2. **The Flight Computer earns nothing on a calm week.** Its value is real and large in the storm (above), and it is cheap. If it must pay earlier, the honest change is a rule: show the next contact's identity, or the next leg's contacts, at the scanner. Not made.
3. **Rank 2 at 150 misses 12% of careless first flights.** Left as it is (above). Lowering it to 140 would catch them.
4. **The careless model is too good at choosing a fit.** Both bots search their owned modules for the best loadout. A careless person will not, so the real careless loss rate in May is between the campaign's 12% and B4a's 70%.
5. **The Camera is still the calm-week backbone** (B6 loosened for the SmallSat, as before).
6. **The bots are not people.** The Planner knows every event's signal shape.

## Tools

- `src/Engine/Bots/PlannerBot.ts`, `EncounterPlanner.ts`: beam search over an encounter, using only the turns the spacecraft can see.
- `src/Engine/Bots/LoadoutSearch.ts`: every maximal loadout a profile can fly, ranked by a bot; `shortlisted` scouts with a cheap bot first.
- `src/Engine/Bots/Campaign.ts`: a profile flown, paid and upgraded flight after flight, careful or careless.
- `src/Engine/Bots/PurchaseStudy.ts`: what a Lab offer adds to the next flight.
- `Tools/Balance/`: the probes behind every table here.
- `src/Engine/Tests/Balance.test.ts`: the targets above.
