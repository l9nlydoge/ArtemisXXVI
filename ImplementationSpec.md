# Artemis 26 — Implementation spec

This document says how to build the game described in `Concept.md`. It holds every rule and every number. Where the two documents disagree, this one wins and the concept gets corrected.

**Status:** steps 1 (setup), 2 (engine), 3 (data), 4 (screens) and 5 (polish) of the build plan are done, and the balance pass of step 6 is in. On 15 November the team chose a 2D pixel-art game: the 3D scene and three.js are gone, replaced by a pixel-art Earth on a starfield and a pixel-art spacecraft assembled from the fitted modules (section 11). There are 285 passing tests, including the balance targets of section 13.2 flown on the real weeks. The engine was reviewed independently twice and the data once; after each review deliberate errors were planted in a copy to confirm the tests catch them.

**How the numbers were checked:** the tables in section 5 were flown by the engine's test players on the real weeks, 300 flights per loadout. Results are in section 13.3, and the reasons for each change are in `GameDesign.md`. The balance tests in section 13.2 fail the build if a later change breaks them.

---

## Contents

1. Scope and priorities
2. Stack, conventions and layout
3. Words used
4. Rules
5. Content tables
6. Events from real data
7. Data pipeline
8. Engine design
9. State and saved data
10. Interface
11. Visual direction
12. Text and languages
13. Tests and balance
14. Build plan
15. Submission checklist
16. Risks and open points

---

## 1. Scope and priorities

Each item has an ID so the build plan and the cut list can refer to it.

### 1.1 Must (the game is not submittable without these)

| ID | Item |
|---|---|
| M1 | Engine: loadout, flight, encounter, scoring, lab, rank. Pure TypeScript, deterministic, tested. |
| M2 | Ten modules with three marks each: Solar Array, Battery, Camera, Spectrometer, Radar, Particle Detector, High-Energy Detector, Radiation Shielding, Magnetic Shield, Flight Computer. |
| M3 | Two weeks built from downloaded NASA data: July 2019 and September–October 2022. |
| M4 | Screens: Home, Week, Hangar, Flight (scanner and encounter), Debrief, Lab. |
| M5 | Debrief line "what you missed and why". |
| M6 | Logbook and Sources screens. |
| M7 | Progress saved in the browser. |
| M8 | English text. |
| M9 | Pixel-art Earth backdrop, made from the first build's Earth images, and the two card designs. |
| M10 | Deployed at a public link, with AI use declared in the README. |

### 1.2 Should (in this order, as time allows)

| ID | Item |
|---|---|
| S1 | First-flight hints (three prompts). |
| S2 | Third week: May 2024. |
| S3 | Storm visuals: the red storm-leg edge and the radiation-hit flash. |
| S4 | Thrusters, Antenna, Repair Drone. |
| S5 | Pixel-art spacecraft assembled from installed modules. |
| S6 | Phone layout at 375 px. |
| S7 | Turkish. |
| S8 | Resume a flight after a page reload. |

### 1.3 Later (not for the deadline; shown locked where the player would look for them)

Crew Capsule, further destinations, software patches, shared flight codes, debris hazard, sound, cooldowns on active modules.

### 1.4 Not doing

- No accounts, server or database. Everything runs in the browser.
- No live calls to NASA while playing. Data is downloaded once and shipped with the game (section 7).
- No team play.

---

## 2. Stack, conventions and layout

### 2.1 Stack

Same as the first build, without the 3D packages.

| Purpose | Choice |
|---|---|
| Build | Vite 8, TypeScript 7 (`tsc -b`) |
| Interface | React 19 |
| State | Zustand 5 |
| Pictures | 2D canvas: the backdrop and the spacecraft are drawn pixel by pixel, no library |
| Tests | Vitest 5 |
| Data script | Node, no extra packages (built-in `fetch`) |
| Hosting | Any static host. `base: './'` in the Vite config so it works from a sub-path. |

Removed from the first build: firebase, qrcode. Removed on 15 November: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, @types/three.

### 2.2 Conventions

- **PascalCase** for files, folders, classes and components. camelCase for members.
- **Classes with base classes** for engine logic. No loose functions holding rules.
- **Almost no comments.** Names carry the meaning.
- **Git for everything.** One branch per milestone, merged into `main` when the team says so.
- **The engine imports nothing from React or the browser.** It must run in Vitest under Node.
- **No number that is a rule lives in a component.** Components read from the engine.

### 2.3 Layout

```
Concept.md
ImplementationSpec.md
README.md
index.html
vite.config.ts
Tools/
  FetchNasaData.mjs            downloads and writes src/Data/Snapshot/*.json
  MakeBackdrop.py              turns the Earth stills into the pixel-art Earths (Python, PIL)
  CaptureScreens.mjs           headless screenshots of every screen
  Source/                      the two Earth stills rendered from the first build's globe
public/
  Backdrop/                    EarthLarge, EarthMedium, EarthSmall: indexed PNGs
  Images/Events/               NASA photographs for event cards
  Icon.svg
src/
  Main.tsx
  App.tsx
  Engine/
    Core/                      SeededRandom, Numbers, Rules, TextRef, UtcDate
    Modules/                   ModuleFamily, MarkSpec, ModuleCard, PowerModules, Instrument,
                               ProtectionModules, UtilityModules, ModuleCatalog
    Spacecraft/                Bus, BusCatalog, InstalledModule, Loadout, LoadoutIssue, Spacecraft
    Events/                    Channel, Rarity, RadiationBand, DateWindow, Records, SpaceEvent,
                               AsteroidFlyby, SolarStorm, ExoplanetTransit, RareEvent
    Weeks/                     WeekDefinition, Week, WeekBuilder, Forecast, WeekCatalog
    Flight/                    FlightSetup, EngineOptions, CraftState, TurnCondition, Contact,
                               Scanner, Scoring, TurnPlan, TurnPreview, Encounter, EncounterResult,
                               FlightCommand, Flight, FlightReport
    Progress/                  Profile, Rank, Lab, Logbook
    Bots/                      FlightBot, GreedyBot, CautiousBot
    Tests/
  Data/
    Snapshot/                  generated JSON: Asteroids, Storms, Exoplanets
    Curated/                   RareEvents.ts, WeekDefinitions.ts, Learned.ts, Images.ts
  State/                       GameStore, Screen, SaveGame
  I18n/                        Translator, StringsEn.json, StringsTr.json
  Interface/
    Backdrop/                  Backdrop (canvas behind every screen), Starfield
    Spacecraft/                SpacecraftBlueprint (layout), SpacecraftPainter (part sprites),
                               PixelCanvas, SpacecraftSprite (canvas component)
    Screens/
    Cards/                     ModuleCardView, EventCardView, ContactCardView
    Meters/                    PowerMeter, HullMeter, ChannelBar, BudgetMeter, TurnTrack, FlightTrack
    Shared/                    Button, Panel, Hint, MotionPreference
  Styles/Space.css, Scene.css
```

---

## 3. Words used

| Word | Meaning |
|---|---|
| **Module** | A piece of hardware, shown as a card. |
| **Mark** | A module's level: 1, 2 or 3, shown as Mk I, Mk II, Mk III. |
| **Loadout** | The modules and marks installed for one flight. The player's deck. |
| **Bus** | The spacecraft body. Sets budget, bay space, hull, and a little built-in power. |
| **Week** | A real span of dates that a flight plays through. |
| **Leg** | One of the six steps of a flight. |
| **Contact** | Something the scanner offers on a leg. |
| **Encounter** | Playing one contact, turn by turn. |
| **Channel** | One kind of data an event offers: Visible, Spectrum, Radar, Particles, HighEnergy. |
| **Signal** | A per-turn multiplier on what instruments record. |
| **Charge** | Power in the battery. |
| **Points** | Research points. |
| **Rank** | Level derived from lifetime points. |

---

## 4. Rules

This section is the authority for the engine.

### 4.1 Loadout

A loadout is valid when all of these hold:

1. Total cost of installed marks ≤ the bus budget.
2. Total bay units of installed marks ≤ the bus bay space.
3. Every installed mark is owned (unlocked in the lab).
4. No module is installed more often than its `maxCopies`.
5. At least one instrument is installed.
6. The player's rank is at least the bus's minimum rank.

The Hangar lets the player build an invalid loadout and shows what is wrong. The Launch button is disabled until it is valid.

Derived spacecraft values:

| Value | Formula |
|---|---|
| `generation` | bus base generation + sum of Solar Array values |
| `capacity` | bus base capacity + sum of Battery values |
| `maxHull` | bus hull |
| `passiveShield` | Radiation Shielding value, or 0 |
| `lookahead` | Flight Computer value, or 0 |
| `pointsMultiplier` | Antenna value, or 1 |
| `burns` | Thrusters value, or 0 |

### 4.2 Flight structure

- A flight has **6 legs**.
- A flight will not start unless its loadout passes rule 4.1, its seed is a whole number from 0 to 2³²−1, and, when the setup carries a week signature, the week data still matches it. The engine checks the structural rules itself and the ownership rules when it is given the player's profile.
- A setup whose loadout names an unknown bus, an unknown module, a bad mark, the same module key twice or the Crew Capsule is refused outright. It is never repaired and flown.
- Starting state: `charge = capacity`, `hull = maxHull`, `burnsLeft = burns`, `repairUsed = false`.
- Each leg runs: **Scan → (Encounter | Hold) → Cruise**.
- **Cruise** (after every leg, including a held one): `charge = min(capacity, charge + 2 × generation)`.
- The flight ends after leg 6 (**Completed**) or the moment `hull ≤ 0` (**Lost**).

### 4.3 Scan

For each leg the scanner deals contacts from the week's pool.

1. Take the week's events that have not been dealt on an earlier leg of this flight.
2. **Dated events** (asteroids, rare events) are eligible only on the leg whose date window contains their date. **Undated events** (exoplanets) are eligible on every leg.
3. **Pinned events** (set in the week definition) are always dealt on their leg.
4. Fill up to **2** contacts by weighted draw without replacement. Weights: Common 6, Notable 3, Headline 1. The draw gives every eligible event its own random key for the leg, `roll^(1/weight)`, and takes the highest keys.
5. If the leg has no pinned event, the first contact is its own weighted draw from the dated events only, when there are any. This keeps a week's own events in front of the player; without it the always-eligible planets crowd them out. The remaining contacts are a second, independent weighted draw from everything left.
6. If the pool runs out, the leg has fewer contacts. A leg with none can only be held.
7. An event pinned to one leg is never dealt on another.

**Identification:**

- Rare events are dealt **unidentified**.
- Headline events of other kinds are dealt unidentified.
- Notable events are dealt unidentified with probability 0.3.
- An unidentified contact shows only "Unknown contact" and its number of turns.

**Survey** (needs Radar): costs **3 charge**, once per leg. It identifies every contact on the leg and deals **1 more**: the next event in the leg's draw order. Available only if `charge ≥ 3`. If nothing is left to find it still costs the charge.

**Hold:** no encounter. `charge = capacity`. Not available on a storm leg.

**Storm legs:** if the leg has a storm (section 6.2):

- The storm itself is added as an extra, identified contact.
- Every other contact on the leg carries the storm's radiation (section 4.6).
- Hold is disabled. Choosing the storm contact is how you ride it out.

**Chase** (needs Thrusters, S4): after an encounter, if the leg still has an unplayed contact, the player may spend **1 burn and 2 charge** to play one more. Once per leg.

### 4.4 Encounter

An encounter has `T` turns (3 to 5), given by the event. For each turn `t`:

**Step 1, charge.** If the turn is not in shadow: `charge = min(capacity, charge + generation)`.

**Step 2, plan.** The player selects any set of active modules. A plan is valid when:

- the sum of their power costs ≤ `charge`,
- no module instance appears twice,
- Thrusters are selected only if `burnsLeft > 0`,
- Repair Drone is selected only if `repairUsed` is false.

The player may change the plan freely before committing. An empty plan is valid.

**Step 3, commit.** In this order:

1. `charge -= Σ power cost`.
2. If Repair Drone is in the plan: `hull = min(maxHull, hull + heal)`, `repairUsed = true`.
3. `signal = turn.signal`. If Thrusters are in the plan: `signal = max(signal, event.peakSignal)` and `burnsLeft -= 1`.
4. For each instrument in the plan, if the event has that instrument's channel and the instrument's mark ≥ the channel's `minMark`:
   - `gain = max(1, round(dataPerUse × signal))`
   - `recorded[channel] = min(capacity[channel], recorded[channel] + gain)`
   - An instrument fired at a channel the event lacks, or below `minMark`, still costs power and records nothing. The interface warns before commit.
5. `incoming = max(0, turn.radiation − passiveShield)`. If Magnetic Shield is in the plan: `incoming = max(0, incoming − block)`.
6. `hull = max(0, hull − incoming)`. If the hull reaches 0, the flight is Lost and the encounter ends now. Data recorded this turn still counts. The encounter stays on the fatal turn so the interface can show it.

**Step 4.** If `t = T`, the encounter ends. Otherwise go to the next turn.

`round` is half-up.

### 4.5 What the player can see

| What | Without Flight Computer | Mk I | Mk II | Mk III |
|---|---|---|---|---|
| Conditions of the current turn | Yes | Yes | Yes | Yes |
| Conditions of later turns | Hidden | Next 1 | Next 2 | All |
| Peak radiation band on a contact card | Yes, if identified | Yes | Yes | Yes |

Radiation bands on contact cards: None (0), Low (1–3), High (4–7), Severe (8+).

The flight track always shows which legs are storm legs and each storm's band. Storms are forecast.

### 4.6 Turn conditions

Each turn has `signal`, `radiation` and `inShadow`. A contact's conditions are fixed when it is dealt, so the contact card can show its true radiation band.

**Signal** comes from the event (section 6).

**Shadow:** for each turn after the first, `inShadow` is true with probability 0.3, and never on two turns in a row. Turn 1 is always sunlit.

**Radiation** on a turn is the sum of:

- the event's own radiation for that turn (only storms have any),
- the leg's storm overlay, if the leg is a storm leg and the contact is not the storm itself. For turn index `i` from 0, with `T` the contact's turns and `S` the storm's:
  - if `T ≥ S`, the storm is stretched: `storm.radiation[floor(i × S / T)]`;
  - if `T < S`, the contact sits in the middle of the storm: `storm.radiation[floor((S − T) / 2) + i]`.
  - Either way the contact meets the storm's peak. A short flyby takes less radiation in total, and cannot dodge the worst turn.
- the South Atlantic Anomaly: on a leg with no storm, each turn has probability 0.15 of **1** radiation. Radiation Shielding Mk I cancels it.

### 4.7 Scoring an encounter

With `r` = the event's rarity value (Common 1, Notable 2, Headline 3):

```
base        = Σ over channels of recorded[channel] × r
channelBonus = 3 × r for each channel that is full
fullBonus   = 5 × r if every channel is full
points      = round((base + channelBonus + fullBonus) × pointsMultiplier)
```

An event with every channel full is marked **complete** in the logbook. An event with any data recorded is marked **recorded**.

**Missed points**, for the debrief. For each encounter and each channel where the spacecraft had no instrument able to record it (not installed, or below `minMark`):

```
missed = capacity[channel] × r + 3 × r
```

Missed points are grouped by the instrument that would have recorded them.

### 4.8 End of flight

| Outcome | Points banked |
|---|---|
| Completed | 100% of points earned |
| Lost | `floor(0.5 × points earned)` |

Then: `profile.points += banked`, `profile.lifetimePoints += banked`, logbook updated, flight count incremented.

### 4.9 Lab and rank

- A lab offer is a module's next mark. It is **available** when the player's rank ≥ that mark's `minRank` and the previous mark is owned.
- Buying costs the mark's `unlockPoints` and sets the owned mark. Points spent do not reduce `lifetimePoints`.
- Rank is the highest rank whose threshold ≤ `lifetimePoints`.
- The bus used for a flight is the largest bus whose `minRank` ≤ the player's rank. The player may pick a smaller one.

### 4.10 Randomness

- Every random draw comes from a `SeededRandom` (mulberry32) derived from `FlightSetup.seed`.
- Each event has its own streams on each leg, keyed by leg and event: for its place in each draw, for whether it arrives unidentified, and for its shadow and anomaly rolls. So a survey never changes the rolls of anything else: a contact met on the same leg, with or without an earlier survey, is identical.
- A survey does change which contacts later legs offer. The event it reveals is used up, and if that event would have appeared on a later leg, the next one in line takes its place, and so on. That is unavoidable when nothing is dealt twice.
- Shadow and anomaly rolls for a contact are drawn when it is dealt, for all its turns.
- A flight is fully determined by `(FlightSetup, command log)` and the week data. `Flight.replay` rebuilds it. Tests and resume both depend on this. The cooldown option travels inside the setup for that reason.
- Commands are checked strictly. A command with a missing or wrongly typed field, as a damaged save could hold, is refused and changes nothing.
- All dates must be written as `YYYY-MM-DDTHH:MM`, with optional seconds, and end in `Z` or an offset such as `+03:00`. Anything else is refused, as is a date that does not exist. Looser forms are read as local time by some browsers, which would deal differently in different countries.

### 4.11 Option kept off by default: cooldowns

`FlightSetup.cooldowns = false`. If true, an active module used on turn `t` cannot be used on turn `t + 1`. Build the flag, leave it off, and decide after playtests.

---

## 5. Content tables

Costs are in millions of dollars. "Bay" is bay units. A value of 0 unlock points means the player starts with it.

### 5.1 Buses

| Id | Name | Min rank | Budget | Bay | Hull | Base generation | Base capacity |
|---|---|---|---|---|---|---|---|
| SmallSat | Small spacecraft | 1 | 60 | 8 | 16 | 1 | 6 |
| Explorer | Medium spacecraft | 3 | 110 | 12 | 22 | 2 | 8 |
| Flagship | Large spacecraft | 5 | 200 | 18 | 30 | 3 | 10 |

### 5.2 Modules

Format for three marks: `I / II / III`. Every Mk II needs rank 3 and every Mk III needs rank 4, in addition to the module's own minimum rank (`Rules.markRanks = [1, 3, 4]`).

**Power (passive)**

| Id | Min rank | Copies | Cost | Bay | Effect | Unlock points |
|---|---|---|---|---|---|---|
| SolarArray | 1 | 2 | 8 / 14 / 24 | 1 / 2 / 3 | generation +2 / +3 / +5 | 0 / 90 / 260 |
| Battery | 1 | 2 | 6 / 10 / 18 | 1 / 1 / 2 | capacity +6 / +10 / +16 | 0 / 70 / 220 |

**Instruments (active)**

| Id | Min rank | Channel | Power | Cost | Bay | Data per use | Unlock points |
|---|---|---|---|---|---|---|---|
| Camera | 1 | Visible | 3 | 10 / 18 / 30 | 2 / 2 / 3 | 3 / 4 / 6 | 0 / 110 / 320 |
| ParticleDetector | 1 | Particles | 1 | 6 / 10 / 16 | 1 / 1 / 1 | 2 / 3 / 5 | 0 / 80 / 240 |
| Spectrometer | 1 | Spectrum | 3 | 14 / 24 / 38 | 2 / 3 / 3 | 4 / 6 / 8 | 0 / 140 / 360 |
| Radar | 1 | Radar | 4 | 16 / 26 / 40 | 2 / 3 / 4 | 5 / 7 / 10 | 90 / 170 / 400 |
| HighEnergyDetector | 2 | HighEnergy | 3 | 18 / 28 / 44 | 2 / 2 / 3 | 4 / 6 / 9 | 120 / 200 / 440 |

Radar also enables Survey (section 4.3) at any mark.

**Protection**

| Id | Min rank | Kind | Power | Cost | Bay | Effect | Unlock points |
|---|---|---|---|---|---|---|---|
| RadiationShielding | 1 | Passive | — | 5 / 9 / 15 | 1 / 2 / 3 | radiation −1 / −2 / −3 every turn | 0 / 80 / 240 |
| MagneticShield | 1 | Active | 4 | 12 / 20 / 32 | 2 / 2 / 3 | blocks 6 / 9 / 13 this turn | 70 / 150 / 380 |

**Utility and mobility**

| Id | Priority | Min rank | Kind | Power | Cost | Bay | Effect | Unlock points |
|---|---|---|---|---|---|---|---|---|
| FlightComputer | Must | 1 | Passive | — | 6 / 10 / 16 | 1 / 1 / 1 | lookahead 1 / 2 / all | 40 / 100 / 240 |
| Thrusters | S4 | 2 | Active | 2 | 10 / 16 / 26 | 1 / 1 / 2 | 2 / 3 / 4 burns per flight | 100 / 180 / 400 |
| Antenna | S4 | 3 | Passive | — | 8 / 14 / 22 | 1 / 2 / 2 | points ×1.10 / ×1.20 / ×1.35 | 120 / 220 / 460 |
| RepairDrone | S4 | 3 | Active, once per flight | 3 | 9 / 15 / 24 | 1 / 1 / 2 | hull +6 / +9 / +12 | 110 / 200 / 420 |
| CrewCapsule | Later | 6 | — | — | — | — | Shown locked | — |

All modules have `maxCopies = 1` except Solar Array and Battery.

### 5.3 Starting profile

- Points 0, lifetime points 0, rank 1.
- Owned at Mk I: SolarArray, Battery, Camera, Spectrometer, ParticleDetector, RadiationShielding.
- Default loadout: those six on the SmallSat. Cost 49 of 60, bay 8 of 8. The bay is full, so every module bought later is fitted in place of another. The Hangar says what a module is short of before it is fitted (section 10.4).

### 5.4 Ranks

| Rank | Lifetime points | Title | Unlocks |
|---|---|---|---|
| 1 | 0 | Trainee | SmallSat, week July 2019. In the lab from the start: Radar, MagneticShield, FlightComputer |
| 2 | 150 | Flight Controller | Week 2022, HighEnergyDetector, Thrusters |
| 3 | 350 | Mission Specialist | Explorer, week May 2024, Antenna, RepairDrone, Mk II |
| 4 | 900 | Flight Director | Mk III |
| 5 | 1800 | Chief Scientist | Flagship |
| 6 | 3500 | Programme Director | Destinations and crew, shown "in development" |

### 5.5 Channels and rarity

| Channel | Recorded by |
|---|---|
| Visible | Camera |
| Spectrum | Spectrometer |
| Radar | Radar |
| Particles | ParticleDetector |
| HighEnergy | HighEnergyDetector |

| Rarity | Value | Deal weight |
|---|---|---|
| Common | 1 | 6 |
| Notable | 2 | 3 |
| Headline | 3 | 1 |

---

## 6. Events from real data

Each event kind is a subclass of `SpaceEvent` with a static factory that turns a data record into an event using the formulas below.

### 6.1 Asteroid flyby

Source record: one close approach from NASA/JPL's close-approach data service (the SBDB Close-Approach Data API, fed by the Center for Near-Earth Object Studies). It needs no key. NASA's NeoWs feed serves the same JPL data and was the first choice, but its demo key ran out during the download (section 7.2).

| Input | Field of the close-approach record |
|---|---|
| Speed `v` (km/s) | `v_rel` |
| Miss distance `d` (lunar distances) | `dist` in astronomical units × 389.17 |
| Diameter `D` (m) | mean of the smallest and largest estimate. The estimates come from brightness `h`: `1329 / √albedo × 10^(−h/5)` km, with albedo 0.25 for the smallest and 0.05 for the largest. NeoWs publishes the same two figures. A measured `diameter` is used when the record has one. |
| Hazard flag | whether the object is in the same query repeated with `pha=true` |
| Date | `jd`, the Julian date in Barycentric Dynamical Time, converted to UTC by subtracting 69.2 seconds and rounded to the minute |
| Observed | `first_obs` and `last_obs` from the Small-Body Database record for the object |
| Link | the JPL Small-Body Database page for the designation |

An asteroid's id is its designation without spaces, for example `2019OK`.

**Every pass is computed by NASA/JPL from the asteroid's orbit. Whether anyone watched it is a separate fact, and the card states it.** The pass date is compared with the object's first and last recorded observations:

| The pass is | The card says | "What was learned" says |
|---|---|---|
| Between the first and last observation | "NASA/JPL's observations of it run from 2017-02-21 to 2019-07-25" | its orbit rests on those observations. This does not mean it was being watched as it passed: the early date can be an old image found later. |
| Before the first observation | "First observed 2019-07-26, after this pass" | it passed before anyone had recorded it |
| After the last observation | "Last observation on record: 2019-07-23. This pass is computed from its orbit" | the pass is computed, with no later observation on record |

Of the 77 asteroids in the three weeks, 32 fall in the first group, 28 in the second and 17 in the third.

**Rough passes are left out.** The service gives a three-sigma uncertainty for the time of each pass and a smallest and largest possible distance. A pass is dropped when its time is uncertain by more than an hour, or when the gap between the largest and smallest distance is more than a quarter of the distance. Fifteen were dropped; the snapshot lists them under `leftOut`. One, 2021 JG9, could have passed anywhere from 0.3 to 51 lunar distances.

**Distances are from the centre of the Earth,** as NASA/JPL gives them, and the card says so. 2024 JT3's 25,753 km is about 19,400 km above the surface.

**Sizes are estimates** and the card says so: "Estimated 58 to 130 m across, from its brightness".

| Derived | Rule |
|---|---|
| Turns `T` | `v ≥ 20` → 3; `10 ≤ v < 20` → 4; `v < 10` → 5 |
| Peak signal `p` | `d < 1` → 2; `1 ≤ d < 5` → 1.5; otherwise 1 |
| Signal by turn | T=3: `[1, p, 1]`; T=4: `[0.5, 1, p, 1]`; T=5: `[0.5, 1, p, 1, 0.5]` |
| Size step `s` | `D < 30` → 0; `30 ≤ D < 140` → 3; `140 ≤ D < 1000` → 6; `D ≥ 1000` → 9 |
| Visible capacity | `6 + s` |
| Spectrum capacity | 6 |
| Radar capacity | `8 + s` if `d < 10`, otherwise no Radar channel |
| Rarity | Notable if `d < 1`, or hazard flag, or `D ≥ 140`. Otherwise Common. Headline only when pinned by a week. |
| Radiation | none |

Worked example, confirmed against the data on 14 November 2026: **2019 OK**, 25 July 2019 01:21 UTC, `v = 24.53`, `d = 0.186`, `D ≈ 94`. So `T = 3`, signal `[1, 2, 1]`, Visible 9, Spectrum 6, Radar 11. Pinned as Headline in the July 2019 week.

### 6.2 Solar storm

Source records: DONKI geomagnetic storms (GST), solar energetic particle events (SEP) and flares (FLR).

**Reading the Kp times.** DONKI stamps each three-hour Kp reading at the end of its three hours: a storm that "starts" at 15:00 has its first reading at 18:00. So a reading stamped at midnight belongs to the evening before. The engine places each reading at its stamp minus three hours.

A leg is a **storm leg** when any reading of Kp 5 or more begins inside the leg's date window.

| Input | Rule |
|---|---|
| `kp` | highest reading that begins inside the window, rounded down to a whole number, capped at 9 |
| Storm span | from the start of the leg's first reading to the stamp of its last |
| `sep` | true if a particle event falls in the storm span or the 24 hours before it |
| `flareClass` | strongest flare (X or M) in the storm span or the 72 hours before it. The lead is 72 hours because a flare's eruption takes one to three days to reach Earth. If there is none, the storm has no flare and no HighEnergy channel. If flare data could not be downloaded at all, the class is inferred: `kp ≥ 8` → X, otherwise M, and the card says "assumed". |
| Storm date | the start of the strongest reading |

**Only real detections near Earth count.** DONKI also lists model forecasts and detections at other spacecraft, such as STEREO A or the MAVEN orbiter at Mars. The download keeps a particle event or a flare only if an instrument on GOES, SOHO or ACE recorded it, and keeps only flares of class M or X. Each record carries the instruments that saw it.

| Derived | Rule |
|---|---|
| Peak radiation `P` | kp 5 → 3; 6 → 4; 7 → 6; 8 → 8; 9 → 10. Add 2 if `sep`. |
| Turns `T` | 5 if `kp ≥ 8`, otherwise 4 |
| Radiation by turn | T=4: `round(P × [0.4, 1, 0.8, 0.4])`; T=5: `round(P × [0.3, 0.7, 1, 0.7, 0.3])` |
| Signal by turn | `2 × radiation[t] / P` |
| Particles capacity | `3 × P` |
| HighEnergy capacity | 12 if flare class X; 8 if M; otherwise no channel |
| Rarity | `kp ≥ 8` → Headline; `kp = 7` → Notable; otherwise Common |

Worked examples from the downloaded data, May 2024:

| Leg | Readings that begin in it | `kp` | Particles | `P` | Radiation by turn |
|---|---|---|---|---|---|
| 10 May | 7.67, 8.67, 9.0 | 9 | SOHO and GOES, 10 May 12:59 onward | 12 | 4, 8, 12, 8, 4 |
| 11 May | 9.0 down to 7.33, eight readings | 9 | yes | 12 | 4, 8, 12, 8, 4 |
| 12 May | 6.67, 7.0, 6.33 | 7 | GOES, 11 May 02:10 | 8 | 3, 8, 6, 3 |
| 13 May | 5.67, 6.0 | 6 | none in time | 4 | 2, 4, 3, 2 |

The 11 May storm follows class X flares seen by GOES, so it has Particles 36 and HighEnergy 12.

### 6.3 Distant planet

Source record: one row of the Exoplanet Archive table `pscomppars`.

**Planets are standing targets.** They are offered on any leg of any week. The game does not time them to their real transits, and the Sources screen says so. A planet known only from a one-off event, such as a microlensing detection, cannot be a standing target and is not included.

| Input | Field |
|---|---|
| Discovery method | `discoverymethod` |
| Whether it transits | `tran_flag` |
| Star brightness `V` | `sy_vmag` |
| Planet radius (Earth radii) | `pl_rade`; `pl_rade_reflink` shows whether it is measured or calculated |
| Distance (parsecs) | `sy_dist` |
| Year, facility | `disc_year`, `disc_facility` |

How the planet is observed decides the instrument. That is not always how it was discovered: HD 209458 b was found by its star's wobble and also transits.

| Observing mode | When | Channel |
|---|---|---|
| Transit | the planet transits | Visible 14 |
| Radial velocity | it does not transit and was found by radial velocity | Spectrum 14 |
| Imaging | it does not transit and was found by imaging | Visible 20, needs Mk II |

| Derived | Rule |
|---|---|
| Turns | 5, signal 1 on each |
| Faint star | if `V > 12`, multiply each capacity amount by 1.25 and round, the atmosphere's 10 included |
| Atmosphere | if the curated list marks the planet as having a measured atmosphere, add Spectrum 10 |
| Rarity | Notable if on the curated "famous" list, otherwise Common |
| Radius fact | "About 14.1 times Earth's radius, estimated" when the archive's value is calculated |
| Radiation | none |
| Dated | no |

The eleven planets: TRAPPIST-1 e, Kepler-452 b, 51 Peg b, Proxima Cen b, WASP-39 b (atmosphere), HD 209458 b (atmosphere), Kepler-186 f, K2-18 b (atmosphere), TOI-700 d, 55 Cnc e, HR 8799 b. Famous: TRAPPIST-1 e, 51 Peg b, Proxima Cen b, WASP-39 b. The script reports any name the archive does not return, and the game refuses to start if the curated list names a planet the snapshot lacks.

### 6.4 Rare events

Hand-written in `Data/Curated/RareEvents.ts`. Each needs a date, a NASA page link, and a one-line "what was learned" checked against that page when it is written.

| Id | Date | Turns | Signal | Channels | Rarity |
|---|---|---|---|---|---|
| DartImpact | 26 Sep 2022 | 3 | `[1, 3, 1]` | Visible 12, Spectrum 8 | Headline |
| Grb221009A | 9 Oct 2022 | 3 | `[3, 1, 0.5]` | HighEnergy 18, Visible 8 | Headline |
| Oumuamua (candidate week, not built) | Oct 2017 | 4 | `[0.5, 1, 1.5, 1]` | Visible 12, Spectrum 12 | Headline |
| Chelyabinsk (candidate week, not built) | 15 Feb 2013 | 3 | `[0.5, 3, 0.5]` | Visible 10, HighEnergy 6 | Headline |

The two built events were checked on 14 November 2026 against NASA's DART mission page and NASA's article on GRB 221009A. `Data/Curated/LearnedSources.ts` records the page behind every hand-written line.

### 6.5 Weeks

A week definition lists six legs, each with a date window, and any pinned events.

**JulyNineteen — "A fifth of the way to the Moon"** (rank 1)

| Leg | Window (UT) | Pinned |
|---|---|---|
| 1 | 20 Jul 2019 | — |
| 2 | 21 Jul 2019 | — |
| 3 | 22 Jul 2019 | — |
| 4 | 23 Jul 2019 | — |
| 5 | 24 Jul 2019 | — |
| 6 | 25 Jul 2019 | 2019 OK |

Expected storms: none. If DONKI shows a storm in these dates, it becomes a storm leg like any other.

The real data gives 13 well-determined asteroids within 20 lunar distances: 1, 1, 2, 2, 4 and 3 per leg. The early legs are thin, so they offer one asteroid and one planet. The earlier title, "The one nobody saw coming", was dropped because no NASA page was found in this session to confirm how late 2019 OK was discovered. Its designation shows only that it was found in the second half of July 2019.

**AutumnTwentyTwo — "Impact and burst"** (rank 2)

| Leg | Window (UT) | Pinned |
|---|---|---|
| 1 | 24–25 Sep 2022 | — |
| 2 | 26–27 Sep 2022 | DartImpact |
| 3 | 28 Sep–1 Oct 2022 | — |
| 4 | 2–6 Oct 2022 | — |
| 5 | 7–10 Oct 2022 | Grb221009A |
| 6 | 11–13 Oct 2022 | — |

Storm legs: whatever DONKI records for these dates.

**MayTwentyFour — "The great storm"** (rank 3, S2; it opens with the Explorer, the smallest spacecraft that can carry a Magnetic Shield and still record)

| Leg | Window (UT) | Pinned |
|---|---|---|
| 1 | 8 May 2024 | — |
| 2 | 9 May 2024 | — |
| 3 | 10 May 2024 | — |
| 4 | 11 May 2024 | — |
| 5 | 12 May 2024 | — |
| 6 | 13 May 2024 | — |

Storm legs, from DONKI: legs 3 and 4 at Kp 9 (Severe), leg 5 at Kp 7 (Severe with particles), leg 6 at Kp 6 (High). Autumn 2022 has one storm leg, Kp 6 on 27 September. July 2019 has none.

**Per-leg limit:** at most 6 asteroids per leg are kept, chosen by smallest miss distance. Asteroids beyond 20 lunar distances are dropped.

**Forecast** (shown on the Week and Hangar screens), computed from the week's pool: number of storm legs and the strongest band; number of asteroid flybys and how many have a Radar channel; number of planets by channel; whether any unknown contacts are expected.

---

## 7. Data pipeline

### 7.1 Principle

`Tools/FetchNasaData.mjs` is run by hand. It downloads, filters, and writes JSON into `src/Data/Snapshot/`. Those files are committed. The game imports them and never calls NASA while running.

Reasons: no rate limit or outage can break the game in front of a judge, no key is shipped to the browser, and two of the sources do not allow browser calls at all.

### 7.2 Sources, as used on 14 November 2026

Every source is keyless. No key is used, stored or needed.

| Source | Request | Used for |
|---|---|---|
| JPL close-approach data | `GET https://ssd-api.jpl.nasa.gov/cad.api?date-min=…&date-max=…&dist-max=20LD&fullname=true&diameter=true`, and the same with `&pha=true` | Asteroid passes, and which are hazardous |
| JPL Small-Body Database | `GET https://ssd-api.jpl.nasa.gov/sbdb.api?des=<designation>` | First and last observation of each asteroid |
| DONKI | `GET https://ccmc.gsfc.nasa.gov/DONKI/api/donki/nuggets/<gst\|sep\|flr>/?startDate=YYYY-MM-DD HH:MM:SS&endDate=…` | Storms, particle events, flares. This is the endpoint the DONKI website itself uses. |
| Exoplanet Archive | `GET https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=<ADQL>&format=json` | Planets. No browser access header, so script only. |
| Image library | `GET https://images-api.nasa.gov/search?…` and `/asset/<nasa_id>` | Card images. The file server is slow: allow minutes per image. |

Not used:

- **api.nasa.gov (NeoWs and DONKI with a key).** In our use the demo key reported a limit of 10 requests and a wait of over four hours once it ran out, which happened during the first download.
- **`kauai.ccmc.gsfc.nasa.gov`,** an older keyless DONKI host. It does not answer from the team's network.

The asteroid numbers were compared with NeoWs for the eleven records both had: speed, distance, size and hazard flag agree.

### 7.2.1 The challenge's own resource list

Read on 14 November 2026 from the challenge page's Resources tab. The list is kept in `Data/Curated/ChallengeResources.ts`.

| Group | Resource |
|---|---|
| NASA data and resources | Design and Develop Science Missions (an overview of the systems-engineering approach, with four mission segments: launch, space, ground, user) |
| | General Mission Analysis Tool (GMAT) |
| | Concept Maturity Levels (CMLs) |
| | Mission Design Lab (MDL) |
| | NASA Mission Viz |
| | A Learning Game About Telescopes |
| | Cubesat 101 |
| Space agency partner resources | Canadian Space Agency: Digital Games and Activities |

- **None of the game's four data sources is on this list.** The list is about how missions are designed, not about data feeds. The page does not say teams are limited to it.
- **The game still uses NASA data,** which is what the Global Award rule asks for.
- **The submission should connect the game to this list,** truthfully. The hangar is a small version of what these resources describe: choosing instruments, power and protection against a budget and a volume. Before step 7, read "Design and Develop Science Missions" and "Cubesat 101" and cite, on the Sources screen and in the project description, the specific ideas the game takes from them. Nothing has been taken from them yet, so nothing may be claimed yet.
- **The site's certificate does not verify with this machine's command-line tools.** It opens normally in a browser.

### 7.3 The script

```
node Tools/FetchNasaData.mjs [--dry] [--offline]
```

1. Read the week definitions and the planet list from `src/Data/Curated/`.
2. For each week: two close-approach requests (all objects, and hazardous ones), then one Small-Body Database request per asteroid kept.
3. For each week: one GST, one SEP and one FLR request, from 75 hours before the week to 3 hours after it.
4. One exoplanet request by name.
5. Drop rough passes (section 6.1), keep at most six asteroids per leg, keep only near-Earth detections (section 6.2), and write each snapshot file that downloaded in full.
6. Print a report: asteroids per week and leg, storm legs found, passes left out, names not found, any request that failed.

- **Every response is cached** in `Tools/.cache` (not committed) together with the time it was fetched. A rerun repeats no request that already worked.
- **`retrievedAt` is the time of the newest request behind a file,** and `firstRetrievedAt` the oldest. Neither is the time the script last ran.
- **A part that fails does not stop the others.** The script writes what it has, lists the problem and exits with an error.

### 7.4 Snapshot shapes

```ts
interface AsteroidRecord {
  id: string                 // designation without spaces, "2019OK"
  name: string               // "2019 OK"
  dateUtc: string            // ISO
  speedKmS: number
  missLunar: number
  missKm: number
  diameterMinM: number
  diameterMaxM: number
  diameterMeasured: boolean  // false: estimated from brightness
  firstObserved: string      // YYYY-MM-DD
  lastObserved: string       // YYYY-MM-DD
  hazardous: boolean
  url: string                // JPL Small-Body Database page
  weekId: string
}

interface StormRecord {
  id: string                 // DONKI gstID
  weekId: string
  startUtc: string
  kpReadings: { timeUtc: string; kp: number }[]
  url: string                // DONKI link
}

interface ParticleEventRecord {
  id: string                 // DONKI activityID
  weekId: string
  timeUtc: string
  detectedBy: string[]       // near-Earth instruments, for example "GOES-P: SEISS >10 MeV"
  url: string
}

interface FlareRecord {
  id: string                 // DONKI flrID
  weekId: string
  peakUtc: string
  classType: string          // "M…" or "X…" only
  detectedBy: string[]
  url: string
}

interface SpaceWeather {     // what the engine reads for one week
  storms: StormRecord[]
  particleEvents: ParticleEventRecord[]
  flares: FlareRecord[]
  flaresAvailable: boolean   // false when the flare endpoint could not be reached
}

interface ExoplanetRecord {
  name: string
  host: string
  method: string
  year: number
  facility: string
  transits: boolean
  radiusEarth: number | null
  radiusEstimated: boolean
  periodDays: number | null
  distanceParsec: number | null
  starVmag: number | null
  url: string                // archive overview page for the planet
}

interface SnapshotFile<T> {
  retrievedAt: string
  firstRetrievedAt: string
  source: string
  requests: string[]         // with the key removed
  records: T[]
}
```

### 7.5 Images

Nine images are in `public/Images/Events/`, about 850 KB in all. Eight are from NASA's Image and Video Library and one from a NASA article. Each was resized to at most 1280 px and looked at before it went in: none carries a logo, insignia or mission patch.

| File | NASA id | What it shows | Credit | Kind |
|---|---|---|---|---|
| AsteroidA | PIA00136 | Asteroid Ida and its moon Dactyl | NASA/JPL | Photograph |
| AsteroidB | PIA00119 | Asteroid Gaspra | NASA/JPL/USGS | Photograph |
| AsteroidC | PIA02900 | The saddle of asteroid Eros | NASA/JPL/JHUAPL | Photograph |
| Storm | iss074e0150531 | Aurora from a geomagnetic storm, seen from the ISS, January 2026 | NASA | Photograph |
| StormSevere | PIA21949 | The X9.3 solar flare of 6 September 2017 | NASA/GSFC/Solar Dynamics Observatory | Telescope image |
| ExoplanetVisible | PIA21429 | The TRAPPIST-1 planets crossing their star | NASA/JPL-Caltech | Illustration |
| ExoplanetSpectrum | PIA20687 | A hot Jupiter whose clouds hide its water | NASA/JPL-Caltech | Illustration |
| DartImpact | PIA25329 | The DART spacecraft approaching Dimorphos | NASA/Johns Hopkins APL/Steve Gribben | Illustration |
| Grb221009A | from NASA's article on the burst | GRB 221009A itself, in X-rays, seen by Swift | NASA/Swift/A. Beardmore (University of Leicester) | Telescope image |

- **Most are representative, and say so.** No photograph exists of a 30 m asteroid passing Earth, or of these particular storms. Each image has a caption such as "Representative image: asteroid Gaspra, from NASA's Galileo spacecraft", and the card must show it.
- **Illustrations are labelled as illustrations.**
- **`Data/Curated/Images.ts` lists each file** with its NASA id, title, credit, kind, caption key and library page link. The Sources screen reads from it. A test fails if an event wants an image that is not listed, or a file is on disk without a credit.
- **A fourth asteroid image was dropped** because it has an unexplained inset of a second body.
- **Two gamma-ray images were dropped:** the first carried a mission logo, and the second turned out to show a star torn apart by a black hole, not an ordinary burst. The one used is NASA's own image of the 2022 burst.
- **Every image but that one and the DART illustration is representative,** and its caption begins "Representative". A test checks this.

### 7.6 Credit and use

- NASA material is generally free to use, with credit. The game credits each image and dataset on the Sources screen and on the card.
- No NASA insignia, logo or mission patch appears anywhere, and no image is cropped to show one.
- Nothing states or implies that NASA endorses the game. The footer says: "Uses public NASA data and imagery. Not affiliated with or endorsed by NASA."
- The Earth images from the first build are from Solar System Scope, CC BY 4.0, and stay credited.

---

## 8. Engine design

All classes below live under `src/Engine`. This section describes the engine as built in step 2. Bodies follow section 4.

### 8.1 Core

```ts
class SeededRandom {
  constructor(seed: number)
  next(): number
  chance(probability: number): boolean
  between(min: number, max: number): number
  integer(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  weighted<T>(items: readonly T[], weight: (item: T) => number): T
  static derive(seed: number, ...salts: number[]): SeededRandom
  static hashText(text: string): number
  static isSeed(value: unknown): value is number      // a whole number from 0 to 2³²−1
  static randomSeed(): number
}

class UtcDate { static parse(text: string): number }  // strict ISO form with a time zone; throws otherwise

class Numbers {
  static round(value: number, digits?: number): number
  static roundHalfUp(value: number): number
  static clamp(value: number, low: number, high: number): number
  static percent(fraction: number): number
}

class TextRef {                       // a text key plus its parameters; the engine never builds sentences
  constructor(key: string, params?: Record<string, string | number>)
  static literal(text: string): TextRef     // key 'Text.Literal', for names taken from NASA data
}

class Rules { /* every flight constant of section 4 as a static readonly number */ }
```

### 8.2 Modules

```ts
enum ModuleFamily { Power, Instrument, Protection, Mobility, Utility, Crew }
type Mark = 1 | 2 | 3

interface MarkSpec { costMusd: number; bayUnits: number; unlockPoints: number; value: number }
interface ModuleTraits { minRank: number; marks: [MarkSpec, MarkSpec, MarkSpec]; maxCopies?: number }

abstract class ModuleCard {
  constructor(id: string, traits: ModuleTraits)
  abstract readonly family: ModuleFamily
  mark(mark: Mark): MarkSpec
  minRankFor(mark: Mark): number          // max(minRank, 1 / 2 / 4)
  get powerCost(): number                  // 0 for passive
  get isActive(): boolean                  // powerCost > 0
  get isObtainable(): boolean              // false only for CrewCapsule
  get isStarter(): boolean                 // Mk I costs 0 points
}

class SolarArray, Battery                    // value = generation, capacity
class Instrument { readonly channel: Channel; get canSurvey(): boolean }   // value = data per use
class Radar extends Instrument               // canSurvey is true
class RadiationShielding, MagneticShield     // value = reduction per turn, block
class FlightComputer, Antenna                // value = lookahead (Mk III is Infinity), multiplier
class Thrusters, RepairDrone                 // value = burns, heal
class CrewCapsule                            // not obtainable

class ModuleCatalog {
  static readonly shared: ModuleCatalog
  readonly all: readonly ModuleCard[]
  has(id): boolean
  get(id): ModuleCard                        // throws on an unknown id
  ofFamily(family): ModuleCard[]
  get starters(): ModuleCard[]
  instrumentFor(channel): Instrument | undefined
  indexOf(id): number
}
```

### 8.3 Spacecraft

```ts
class Bus { id; minRank; budgetMusd; bayUnits; hull; baseGeneration; baseCapacity }
class BusCatalog { static readonly shared; all; has(id); get(id); availableAt(rank); largestFor(rank) }

class InstalledModule {
  constructor(card: ModuleCard, mark: Mark, copy: number)
  get key(): string                        // `${card.id}#${copy}`
  get spec(): MarkSpec
  get value(): number
  withMark(mark): InstalledModule
}

enum LoadoutIssueKind { OverBudget, OverBay, NotOwned, TooManyCopies, NoInstrument, BusLocked }
interface LoadoutIssue { kind: LoadoutIssueKind; moduleId?: string; amount?: number }
interface Ownership { readonly rank: number; owns(moduleId: string, mark: number): boolean }   // Profile implements this

class Loadout {                            // immutable; installed is kept in catalog order
  constructor(bus: Bus, installed: readonly InstalledModule[])
  static starter(): Loadout
  static fromJson(json: unknown): Loadout  // never throws: anything unreadable, unknown, duplicated or unobtainable is dropped
  static readsExactly(json: unknown): boolean      // true when fromJson would drop or change nothing
  toJson(): LoadoutJson                    // { busId, modules: { id, mark, copy }[] }
  get costMusd, bayUsed, budgetLeft, bayLeft
  copiesOf(cardId): InstalledModule[]
  find(key): InstalledModule | undefined
  has(cardId): boolean
  canAdd(card): boolean
  install(card, mark): Loadout             // takes the lowest free copy number
  remove(key): Loadout
  setMark(key, mark): Loadout
  withBus(bus): Loadout
  issues(owner: Ownership): LoadoutIssue[]
  isValid(owner: Ownership): boolean
  get structuralIssues(): LoadoutIssue[]   // the rules that need no owner: budget, bay, copies, an instrument
}

class Spacecraft {
  constructor(loadout: Loadout)
  readonly generation, capacity, maxHull, passiveShield, lookahead, pointsMultiplier, burns
  readonly actives: readonly InstalledModule[]
  readonly instruments: readonly InstalledModule[]
  get hasRadar, magneticShield, thrusters, repairDrone, channels
  active(key): InstalledModule | undefined
  instrumentFor(channel): InstalledModule | undefined
  canRecord(channel, minMark?): boolean
}
```

### 8.4 Events

```ts
enum Channel { Visible, Spectrum, Radar, Particles, HighEnergy }
enum Rarity { Common = 1, Notable = 2, Headline = 3 }
enum EventKind { Asteroid, Storm, Exoplanet, Rare }
enum RadiationBand { None, Low, High, Severe }

class DateWindow { constructor(startUtc, endUtc); contains(dateUtc); withLead(hours); get days }

interface ChannelSpec { capacity: number; minMark: Mark }
interface EventTurn { signal: number; radiation: number }

abstract class SpaceEvent {
  abstract readonly kind: EventKind
  readonly id: string
  readonly label: TextRef
  readonly dateUtc?: string
  readonly rarity: Rarity
  readonly channels: ReadonlyMap<Channel, ChannelSpec>
  readonly turns: readonly EventTurn[]
  readonly facts: readonly TextRef[]
  readonly learned: TextRef
  readonly sourceUrl: string
  readonly imageId: string
  get isDated, startsUnidentified, turnCount, peakSignal, peakRadiation, band, totalCapacity
  capacity(channel): number
}

class AsteroidFlyby    { static fromRecord(record: AsteroidRecord, pinned?: boolean); static idFor(recordId) }
class SolarStorm       { static forWindow(window: DateWindow, weather: SpaceWeather): SolarStorm | undefined; readonly reading; readonly peak }
enum FlareClass { None, C, M, X }       // None: flare data exists and shows no flare before the storm
class ExoplanetTarget  { static fromRecord(record, note?); static modeFor(record); static canObserve(record); readonly mode: ObservingMode; static idFor(name) }
enum ObservingMode { Transit, RadialVelocity, Imaging }
enum ObservationHistory { SeenBeforeAndAfter, FirstSeenAfter, LastSeenBefore }     // AsteroidFlyby.history
class RareEvent        { /* constructed directly from EventDetails in Curated/RareEvents.ts */ }
```

Event ids: `Asteroid.<designation without spaces>`, `Storm.<YYYY-MM-DD of the leg>`, `Exoplanet.<name without spaces or punctuation>`, and whatever a rare event is given.

"What was learned" keys: a pinned asteroid, a famous planet and every rare event use `Learned.<event id>`, written by hand in step 3. Everything else uses a shared template: `Learned.Asteroid.<observation history>`, `Learned.Storm`, `Learned.Mode.<Transit | RadialVelocity | Imaging>`.

**Hand-written lines are locked.** A test holds a checksum of every hand-written line, image credit, source link and curated flag. Changing any of them fails the test until it has been checked against its source again and the number updated.

### 8.5 Weeks

```ts
interface WeekDefinition { id: string; minRank: number; legs: { startUtc; endUtc; pinned?: string[] }[] }
interface Leg { window: DateWindow; pinnedEventIds: readonly string[]; storm?: SolarStorm }

class Week {
  constructor(id, minRank, legs: readonly Leg[], events: readonly SpaceEvent[])
      // throws unless: 6 legs in date order without overlap, no event id twice, every pin an ordinary event pinned once
  readonly forecast: Forecast
  get storms, everything, startUtc, endUtc
  get signature(): string                  // changes with anything that changes play; not with the order events or channels are listed in
  event(id): SpaceEvent | undefined
  stormOn(legIndex): SolarStorm | undefined
  pinnedOn(legIndex): SpaceEvent[]
  eligible(legIndex, alreadyDealt: ReadonlySet<string>): SpaceEvent[]
}

class WeekBuilder {                        // applies sections 6.2 and 6.5 to raw records
  constructor(sources: { asteroids: AsteroidRecord[]; weather: SpaceWeather; undated: SpaceEvent[]; rare: SpaceEvent[] })
  build(definition: WeekDefinition): Week
}

class Forecast {
  readonly stormLegs, worstBand, asteroidCount, radarTargets, planetCount, unknownsExpected
  planetsFor(channel): number
  channelDemand(channel): number           // total capacity × rarity
  demandShare(channel): number
  get channelsByDemand(): Channel[]
}

class WeekCatalog {
  static shared: WeekCatalog               // empty until step 3 fills it from the snapshots
  all; has(id); get(id); availableAt(rank)
}
```

### 8.6 Flight

```ts
interface FlightSetup { loadout: LoadoutJson; weekId: string; seed: number; cooldowns?: boolean; weekSignature?: string }
interface EngineOptions { weeks?: WeekCatalog; owner?: Ownership }     // owner: also check what the player has unlocked

class CraftState { charge; hull; burnsLeft; repairUsed }

interface TurnCondition { signal: number; radiation: number; inShadow: boolean; anomaly: boolean }
class ConditionRoller {
  constructor(random)
  roll(event, overlay: SolarStorm | undefined, stormLeg: boolean): TurnCondition[]
  static weather(storm, turnIndex, turnCount): number     // the storm overlay of section 4.6
}

class Contact {
  readonly event: SpaceEvent
  identified: boolean
  played: boolean
  readonly conditions: readonly TurnCondition[]    // rolled when the contact is dealt
  readonly overlay?: SolarStorm
  get turnCount, peakRadiation, band, peakSignal
  showsBandTo(craft): boolean              // identified, or a flight computer is fitted
}

class Scanner {
  constructor(week: Week, seed: number)
  deal(legIndex): Contact[]
  dealExtra(legIndex): Contact | undefined
}

class Scoring {
  static points(event, recorded: ReadonlyMap<Channel, number>, multiplier?): number
  static isComplete(event, recorded): boolean
  static potential(event, craft): { reachable: number; total: number }
  static missed(event, craft): { channel; moduleId; neededMark; points }[]
}

class TurnPlan { static readonly empty; constructor(keys); has(key); toggle(key); with(key); get list, isEmpty }

enum PlanProblem { UnknownModule, NotEnoughCharge, NoBurnsLeft, RepairUsed, CoolingDown, EncounterOver }
enum WasteReason { NoChannel, ChannelFull, NeedsMark }
interface InstrumentYield { channel: Channel; gain: number; waste?: WasteReason; neededMark?: Mark }

interface TurnPreview {
  valid: boolean
  problem?: PlanProblem
  powerCost: number
  chargeAfter: number
  signal: number
  gains: ReadonlyMap<Channel, number>
  wasted: readonly string[]                // keys of instruments that would record nothing
  repaired: number
  blocked: number
  incoming: number
  hullAfter: number
  lost: boolean
}
interface TurnOutcome extends TurnPreview { encounterOver: boolean }

class Encounter {                          // the first turn's charge step runs in the constructor
  constructor(contact, legIndex, craft: Spacecraft, state: CraftState, cooldowns?: boolean)
  get event, turnIndex, turnCount, turnsPlayed, isOver, recorded, current
  get history(): readonly TurnOutcome[]            // one entry per turn played
  get visible(): (TurnCondition | undefined)[]     // undefined = hidden by lookahead
  isCooling(key): boolean
  problemWith(key, plan): PlanProblem | undefined  // why this module cannot be added to the plan
  yieldOf(key, boosted?): InstrumentYield | undefined   // what one instrument would record this turn
  preview(plan: TurnPlan): TurnPreview             // changes nothing
  commit(plan: TurnPlan): TurnOutcome              // throws if the plan is not valid
  result(): EncounterResult
}

interface EncounterResult { legIndex; eventId; recorded; points; complete; anyRecorded; missed; turnsPlayed; damageTaken }

enum FlightPhase { Scanning, Encounter, EncounterDone, Completed, Lost }
enum CommandType { Survey, Choose, Hold, Commit, Continue, Chase }
type FlightCommand = { type: Survey } | { type: Choose; contactIndex } | { type: Hold }
                   | { type: Commit; keys: string[] } | { type: Continue } | { type: Chase; contactIndex }
class Commands { static survey, hold, proceed; static choose(index), chase(index), commit(keys) }

class Flight {
  static setup(loadout, week, seed, cooldowns?): FlightSetup      // fills in the week signature
  static begin(setup: FlightSetup, options?: EngineOptions): Flight   // throws on a bad loadout, seed or week signature
  readonly setup: FlightSetup              // the flight's own normalised copy, with the week signature filled in
  static replay(setup, log: readonly FlightCommand[], options?): Flight
  readonly setup, craft: Spacecraft, state: CraftState, week: Week
  get phase, legIndex, contacts, encounter, results, log, lastOutcome, pointsEarned, isOver, isStormLeg, hasSurveyed
  can(command): boolean
  apply(command): void                     // throws if !can; the flight is unchanged when it throws
  report(): FlightReport                   // throws while the flight is in progress
}

class FlightReport {
  readonly outcome: FlightOutcome          // Completed | Lost
  readonly encounters: readonly EncounterResult[]
  readonly pointsEarned, pointsBanked, hullLeft, legsFlown
  readonly misses: readonly { moduleId; points; count }[]      // largest first
  readonly loss?: { legIndex; eventId; radiation; shielding; hadActiveShield }
  get survived, biggestMiss, pointsMissed, completeCount
}
```

Phase transitions:

```
Scanning ──Survey──► Scanning
Scanning ──Choose──► Encounter
Scanning ──Hold────► Scanning (next leg) | Completed
Encounter ──Commit─► Encounter | EncounterDone | Lost
EncounterDone ──Chase────► Encounter
EncounterDone ──Continue─► Scanning (next leg) | Completed
```

The encounter stays readable through `flight.encounter` during `EncounterDone` and `Lost`, so the interface can show its result. After the last turn, or a fatal one, `turnIndex` and `current` stay on that turn.

`EncounterResult.recorded` is a `Map`, so a `FlightReport` does not survive `JSON.stringify`. After a page reload the debrief is rebuilt by replaying the saved log.

### 8.7 Progress

```ts
interface ProfileJson {
  version: 1
  points: number
  lifetimePoints: number
  ownedMarks: Record<string, 0 | 1 | 2 | 3>
  logbook: Record<string, { recorded: boolean; complete: boolean; bestPoints: number }>
  flights: number
  lastLoadout?: LoadoutJson
  hintsSeen: string[]
}

class Profile implements Ownership {       // immutable
  static starter(): Profile
  static fromJson(json: unknown): Profile  // a fresh profile if unreadable or the wrong version; damaged fields are repaired
  toJson(): ProfileJson
  get points, lifetimePoints, rank, flights, lastLoadout
  ownedMark(moduleId): 0 | 1 | 2 | 3
  owns(moduleId, mark?): boolean
  logged(eventId): { recorded; complete; bestPoints }
  hasSeen(hint): boolean
  withHintSeen(hint): Profile
  withLoadout(loadout): Profile
  afterFlight(report: FlightReport, loadout: Loadout): Profile
  afterUnlock(moduleId, mark, cost): Profile      // used by Lab; throws if points are short
}
```

Spendable points can never exceed lifetime points; `fromJson` enforces it.

```ts
class Rank {
  static readonly thresholds: readonly number[]
  static get top(): number
  static of(lifetimePoints): number
  static threshold(rank): number
  static progress(lifetimePoints): { rank; into; span; toNext; isTop }
  static unlocksAt(rank, weeks?): { kind: Bus | Week | Module | Mark | Teaser; id: string }[]
}

enum OfferState { Available, TooExpensive, RankLocked, Maxed, InDevelopment }
interface LabOffer { card; ownedMark; mark?; cost; state; needsRank?; shortBy? }

class Lab {
  offers(profile): LabOffer[]              // one per module, in catalog order
  offer(profile, card): LabOffer
  canBuy(profile, moduleId): boolean
  buy(profile, moduleId): Profile          // throws if the offer is not Available
}

class Logbook {
  constructor(profile: Profile, weeks?: WeekCatalog)
  readonly entries: readonly { event; weekIds; recorded; complete; bestPoints }[]   // every event of every week the rank can fly, each once
  get totals(): { recorded; complete; total }
  inWeek(weekId): entries
}
```

### 8.8 Bots

Used only by tests.

```ts
abstract class FlightBot {
  next(flight: Flight): FlightCommand
  fly(setup: FlightSetup, options?): { flight: Flight; report: FlightReport }
}
class GreedyBot      // picks the contact worth most to this loadout; shields when 3 or more would get through; fires instruments by data per charge
class CautiousBot    // the same, and keeps enough charge for the magnetic shield while a storm or a known dangerous turn is still to come
```

---

## 9. State and saved data

### 9.1 Store

One Zustand store, `GameStore`.

```ts
interface GameState {
  screen: Screen
  language: Language
  profile: Profile
  weekId: string
  loadout: Loadout
  flight?: Flight
  flightTick: number                   // incremented after every command so components re-render
  plan: TurnPlan
  lastReport?: FlightReport
  worldReady: boolean

  go(screen: Screen): void
  pickWeek(weekId: string): void
  editLoadout(change: (loadout: Loadout) => Loadout): void
  launch(): void
  send(command: FlightCommand): void
  togglePlan(key: string): void
  finishFlight(): void
  buy(moduleId: string): void
  markHint(hint: string): void
  setLanguage(language: Language): void
  resetProgress(): void
}

enum Screen { Home, Week, Hangar, Flight, Debrief, Lab, Logbook, Sources }
```

`Flight` is mutable inside the engine. The store holds one instance and bumps `flightTick` after each `apply`.

**Hints.** `State/HintBook.ts` decides whether a first-flight hint is wanted: not yet in the profile's `hintsSeen`, and the player is new. The Hangar, Scanner, Encounter and Radiation hints need `flights === 0`; the Debrief and Lab hints need `flights === 1` and the Hangar hint already seen, so a player who flew before hints existed never gets them. A hint is written to `hintsSeen` through `markHint` the moment it appears, so it never shows twice even if the player ignores it. Erasing progress resets the profile and with it the hints.

### 9.2 Saved data

| Key | Content | Written |
|---|---|---|
| `Artemis26.Profile.v1` | `ProfileJson` | After every flight and purchase |
| `Artemis26.Flight.v1` | `{ setup, log }` | After every command (S8) |
| `Artemis26.Language` | `"en"` or `"tr"` | On change |

- Every read and write is wrapped in try/catch. With storage unavailable the game plays normally and progress lasts for the session.
- On load, a saved flight is rebuilt with `Flight.replay`. If replay throws, the saved flight is discarded.
- **Reset progress** needs a second press on a clearly labelled "Erase all progress" control before anything is deleted.

---

## 10. Interface

Sizes below are for 1440 × 900. Section 10.10 covers smaller screens. Wireframes show layout only; the real interface uses no emoji and no icon without a label.

### 10.1 Screen flow

```
Home ──► Week ──► Hangar ──► Flight ──► Debrief ──► Lab ──► Home
  │                                         │
  ├──► Lab                                  └──► Hangar (fly again, same week)
  ├──► Logbook
  └──► Sources
```

### 10.2 Home

- **Left third:** the wordmark "Artemis 26", one line saying what the game is, and one primary button: **Fly a mission**. Below it, three quiet links: Lab, Logbook, Sources.
- **Bottom left:** rank title, a progress bar to the next rank with the number of points to go, and the points balance.
- **Rest of the screen:** the Earth.
- **Bottom edge:** language switch, the NASA non-affiliation line, credits link.

Home must fit 1280 × 720 without scrolling. The first build did not.

### 10.3 Week

A row of week cards, one per week, locked ones included.

Each card shows: dates, title, a real photograph, the forecast in three lines, and how much of the week's logbook is complete. A locked card shows the rank it needs.

Selecting an unlocked card goes to the Hangar.

### 10.4 Hangar

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹ Weeks      20–25 July 2019 · A fifth of the way to the Moon             │
│                                                                           │
│ ┌ Forecast ─────────┐                            ┌ Your modules ────────┐ │
│ │ No storms         │                            │ Power                │ │
│ │ 9 asteroid flybys │      spacecraft            │  [Solar Array  Mk I] │ │
│ │  5 in radar range │  (Earth's limb below)      │  [Battery      Mk I] │ │
│ │ 4 planets         │                            │ Instruments          │ │
│ │ Unknowns likely   │                            │  [Camera       Mk I] │ │
│ └───────────────────┘                            │  [Spectrometer —   ] │ │
│                                                  │  [Radar      locked] │ │
│ ┌ Spacecraft ───────────────────────────┐        │ Protection           │ │
│ │ Budget   ▓▓▓▓▓▓▓▓▓▓░░  49 of 60       │        │  …                   │ │
│ │ Bay      ▓▓▓▓▓▓▓▓▓▓▓▓   8 of 8        │        └──────────────────────┘ │
│ │ Power    +3 a turn · holds 12         │                                 │
│ │ Hull     16 · Shielding −1            │                    [ Launch ]   │
│ │ Can record: Visible, Particles        │                                 │
│ │ Cannot record: Radar, Spectrum,       │                                 │
│ │                High-energy            │                                 │
│ └───────────────────────────────────────┘                                 │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Module list (right):** grouped by family. Each row is a module card in compact form.
  - Owned and not installed: click to install at the highest owned mark that fits.
  - Installed: gold left edge; a mark stepper (I, II, III; unowned marks disabled); a remove control.
  - Solar Array and Battery, once installed, show "Add a second". Each copy has its own mark.
  - Not owned: dimmed, with "Unlock in the lab: 90 points".
  - A fit that would go over bay space or budget is still allowed, but before it is pressed the row says what is short: "Needs 2 more bay and $5M more: remove a module first". The fit control is drawn dashed. The count includes any excess the loadout already has.
  - When the bay is full, the spacecraft panel says so: "Bay full. To fit another module, remove one first." The starter fills it, so every purchase is a swap.
  - Rank-locked: dimmed, with "Rank 2".
- **Spacecraft panel (bottom left):** the two limits as meters, the derived values, and two lists: what this loadout can and cannot record. The "cannot" list is compared with the forecast: a channel the week needs and the loadout lacks is flagged.
- **Launch** is disabled while `issues()` is not empty, and every issue is written next to it.
- **Hover or focus on a module** shows the full card: drawing, what it does in one sentence, numbers for all three marks.

### 10.5 Flight: scanner

- **Top:** the flight track. Six leg markers with dates. Done legs filled, the current one gold, storm legs marked with their band from the start.
- **Centre:** two or three contact cards side by side.
- **Bottom left:** hull and power meters.
- **Bottom right:** **Survey** (if a radar is installed, with its cost) and **Hold and recharge**.

A contact card shows:

| Identified | Unidentified |
|---|---|
| Photograph, name, date | Dark card, "Unknown contact" |
| Two real facts (for example speed and miss distance) | Number of turns |
| Channels, each marked "can record" or with the missing module's name | "Survey to identify" if a radar is installed |
| Turns, peak signal, radiation band | |
| Points available with this loadout, and in total | |

Choosing a card starts the encounter.

### 10.6 Flight: encounter

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Leg 6 of 6 · 25 July 2019        ● ● ● ● ● ◉                 Points 118   │
│                                                                           │
│ ┌ Event ──────────────────┐                       ┌ Turns ──────────────┐ │
│ │ [photograph]            │                       │  1     2     3      │ │
│ │ 2019 OK                 │                       │ ×1    ×2     ?      │ │
│ │ 24.5 km/s               │    spacecraft and     │ sun   shadow ?      │ │
│ │ 71,355 km from Earth    │  (Earth's limb below) │ rad 0 rad 2  ?      │ │
│ │                         │                       └─────────────────────┘ │
│ │ Visible   ▓▓▓░░░  3 / 9 │                                               │
│ │ Spectrum  ░░░░░░  0 / 6 │                                               │
│ │ Radar     no radar      │                                               │
│ └─────────────────────────┘                                               │
│                                                                           │
│ Hull ▓▓▓▓▓▓▓▓░ 14 / 16            Power ▓▓▓▓▓▓░░ 9 / 12   +4 next turn    │
│                                                                           │
│ [Camera        ] [Spectrometer  ] [Particle Det. ] [Magnetic Shield]      │
│ [2 power  +6   ] [3 power  +8   ] [1 power  none ] [4 power  blocks 6]    │
│                                                                           │
│ Plan uses 5 power. Makes 3 a turn · records 14 · no damage   [ End turn ] │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Module row:** one card per active module. Click to toggle. A selected card lifts and gets the gold edge. Each card shows its power cost and what it would do **this turn**, already multiplied by signal.
- **A module that would record nothing** says why ("nothing to record", "channel full", "needs Mk II") and is dimmed, and can still be selected.
- **A module the player cannot afford** is disabled and says "needs 2 more power".
- **Preview line:** updates on every toggle from `Encounter.preview`. Damage is shown in the warning colour when above zero, and "this destroys the spacecraft" when `hullAfter ≤ 0`.
- **Turn track:** current turn highlighted. Hidden turns show a question mark and the hint "A flight computer shows what is coming" the first time.
- **End turn** commits. Then, in order: power drains, channel bars fill, radiation flashes and the hull meter drops, the track advances. About 900 ms in total; skipped with reduced motion.
- **After the last turn:** a result strip replaces the module row: points earned, channels completed, the "what was learned" line with its link, and **Continue** (plus **Chase** when allowed).

Keyboard: `1`–`9` toggle the modules in order, `Enter` ends the turn or continues, `Escape` clears the plan.

### 10.7 Debrief

- **Heading:** "Mission complete" or "Spacecraft lost on leg 4", with points banked. For a loss, one line says what killed it: "The storm on 11 May peaked at 12. Your shielding stops 1."
- **Rank bar:** animates from the old total to the new one. A rank-up lists what it unlocked.
- **What you missed:** the biggest miss as a sentence, then a short table of the rest.
  - "Five radar targets passed and you had no radar: 74 points missed."
  - Each row has a button: **See it in the lab**.
- **Encounters:** one row per leg: name, points, complete or not.
- **Buttons:** **Go to the lab** (primary), **Fly this week again**, **Home**.

### 10.8 Lab

A grid of module cards at full size, grouped by family. Each shows the next mark the player can get.

| State | Shown as |
|---|---|
| Available | Cost in points, **Unlock** button |
| Too expensive | Cost, and how many points short |
| Rank-locked | "Rank 3" |
| Maxed | "Mk III owned" |
| Later (Crew Capsule) | "In development" |

Unlocking plays one short stamp animation on the card and updates the balance. Points balance and rank are fixed at the top.

### 10.9 Logbook and Sources

Both are reached from Home (quiet links beside Lab). The Debrief links to the Logbook, and the Logbook links to Sources.

**Logbook:** a header with "N of M events recorded" and how many have a full dataset, counted by the engine's `Logbook` over the weeks the rank can fly. Below it, a scrolling grid of cards, one per recorded event, in date order: the pixel picture with its caption and credit, the name, the date and week, "Full dataset" or "Part of the dataset" with the best points, and the "what was learned" line with its source link. Complete ones have a gold border. Events not yet recorded are only counted, never shown. An empty logbook says to fly a mission and has the button for it.

**Sources:** one scrolling column of panels, read from the code at run time.

| Panel | Content | From |
|---|---|---|
| Intro | Where the data comes from, and how many asteroid passes, storm legs, planets and rare events the weeks hold (counted at run time) | `WeekCatalog.shared` |
| Data | Each dataset: name, what the game takes from it, date retrieved, number of saved requests, its home page and one real request | `GameData.sources` (the snapshot files) |
| Event pictures | Each picture at 2x: title, caption, kind, NASA id, credit, link to the original | `Images.all` |
| Checked lines | Each hand-written "what was learned" line: event, date checked, the page it was checked against | `LearnedSources.all` |
| How the data is used | The two `Sources.Note` lines, and that power costs, capacities, budgets and prices are game values | strings |
| The challenge's resource list | The challenge page's list, said to be for reference only (nothing from it is claimed yet, section 7.2.1) | `ChallengeResources` |
| AI use | `Credits.Statement`, word for word | strings |
| Use and credit | The Earth credit and the non-affiliation line | `Footer.*` |

Every link opens in a new tab with `rel="noopener noreferrer"`.

### 10.10 Smaller screens

- **1280 × 720:** everything above must fit without page scroll. The module list in the Hangar scrolls inside its panel.
- **Under 800 px wide (S6):**
  - Hangar: the spacecraft panel becomes a sticky bar at the top showing only Budget and Bay; the module list fills the page.
  - Encounter: the event card collapses to name and channel bars; the module row becomes a two-column grid; the preview line and **End turn** are a sticky bar at the bottom.
  - Touch targets are at least 44 px.
- No horizontal page scroll at any width from 375 px.

### 10.11 First-flight hints (S1)

Six callouts, each shown once (section 9.1). A callout is a small dark-blue panel with a stepped pointer, one or two sentences and a **Got it** button; Escape closes it, and so does Enter unless another control has focus. It never dims the screen, never covers the control it describes, and play goes on while it is open (in the encounter, keys 1–9 still work; the first Enter closes the hint, the next ends the turn). The text describes mechanics, never numbers, so balance changes cannot make it false. Keys are `Hint.*` in `StringsEn.json`.

| Hint | Where | When it closes on its own |
|---|---|---|
| Hangar | In the space between the spacecraft panel and the module list, pointing at the spacecraft panel: each instrument records one kind of data, compare Cannot record with the forecast, budget and bay, launch | Leaving the Hangar |
| Scanner | In the scanner's footer, in place of the usual line, pointing up at the contacts: approach one contact a leg, what the bars mean, what holding does | Leaving the scanner |
| Encounter | Above the module row on the first turn of the first encounter: switch modules on by click or keys 1–9, power and sunlit turns, End turn or Enter | The turn ends |
| Radiation | Same place, the first turn whose radiation is above the spacecraft's shielding: damage shows above End turn, hull at zero loses the spacecraft | The turn ends |
| Debrief | Inside What you missed, after the first flight: points buy modules and marks in the lab, what the missed line means | Leaving the Debrief |
| Lab | Under the rank panel, after the first flight: unlock, then fit in the hangar, swap when the bay is full | Leaving the Lab |

### 10.12 Accessibility

- Every control reachable and operable by keyboard, with a visible focus ring.
- Status is never colour alone: warnings carry a word or a shape.
- `prefers-reduced-motion`: the Earth jumps to each screen's place instead of sliding, the stars do not twinkle, the spacecraft does not idle, no card lifts, instant meter changes.
- Text contrast at least 4.5:1 against its panel. Text never sits directly on the bright Earth; it sits on a panel or a scrim, and each screen's framing keeps the Earth clear of loose text.
- Meters use `role="meter"` with a label and values.

---

## 11. Visual direction

### 11.1 Principle

You are in orbit, in a 2D pixel-art game. On 15 November the team chose 2D pixel art over the 3D scene: it reads at a glance, stays fast on any laptop, and lets the spacecraft change visibly with every module. The pixel-art Earth is the picture. The interface is dark, flat and quiet, and stays at the edges. Photographs carry the wonder; the interface carries the numbers. It should feel clean and responsive, like a well-made 2D pixel game, and every piece of art is original.

### 11.2 Tokens

| Token | Value | Use |
|---|---|---|
| `--Space` | `#000000` | Page background |
| `--Panel` | `rgba(7, 9, 12, 0.94)` | Panels. 94%, up from 86% in the first build, where the scene showed through text. |
| `--Line` | `rgba(255, 255, 255, 0.14)` | Borders and dividers |
| `--Text` | `#F3F5F6` | Primary text |
| `--Muted` | `#A6B0BB` | Secondary text |
| `--Foil` | `#E8A838` | The one accent: selection, the primary button, Mk III, "complete" |
| `--Go` | `#3ECF85` | Positive status |
| `--NoGo` | `#FF5263` | Damage and errors |
| `--Caution` | `#F2E05A` | Warnings. Moved to yellow so it can never be mistaken for the accent. |

- **Type:** Jost for everything, with tabular figures for numbers. No second typeface, no monospace labels.
- **Corners:** 2 px on panels and cards. Nothing is a pill.
- **Depth:** a 1 px line, never a blurred shadow or a glass panel.
- **Capitals:** sentence case everywhere. No tracked-out capital labels.

### 11.3 The two cards

**Module card (a data plate).** 5:7. Black, with a 1 px line border.

- Top: module name, mark at the right ("Mk II").
- Middle: a picture of the hardware, one per module, on the shared art grid (section 11.8).
- Bottom: three stamped figures in a row: cost, bay, power. Then one sentence of effect.
- Mk III: the border is gold.
- Selected or installed: a 3 px gold left edge.

**Event card (a photograph).** 5:7.

- Top two thirds: the photograph, edge to edge.
- A caption strip under it, like a photo log: date, name, credit.
- Bottom: real facts, then channel bars.
- Unidentified: no photograph; a dark field with faint scan lines and "Unknown contact".

### 11.4 Reuse from the first build

Taken from `Archive/FirstBuild` with `git show Archive/FirstBuild:<path>`.

| Take | Path | Change |
|---|---|---|
| Earth | the first build's globe and its Solar System Scope images | Rendered once to two stills (`Tools/Source/`), then turned into pixel art by `Tools/MakeBackdrop.py`. The globe code and the images are no longer in the game. Keep the credit. |
| Spacecraft layout | `SpacecraftBlueprint` | Rewritten to place part sprites on the art grid, fed from `Loadout` (S5). |
| Motion check | `MotionPreference.ts` | Moved to `Interface/Shared`. |
| Random and number helpers | `src/Engine/Simulation/SeededRandom.ts`, `src/Engine/Numbers.ts` | Move to `Engine/Core`, extend. |
| Translation | `src/I18n/Translator.ts`, `UseTranslator.ts`, `Language.ts` | None. New string files. |
| Project setup | `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/Icon.svg` | Remove firebase and qrcode. |

Not taken: the old engine, the old screens, team sync, the camera director, the landmark spacecraft, and since 15 November the 3D scene.

### 11.5 The world

- **One backdrop behind every screen:** a `<canvas>` drawn at art resolution and scaled up by a whole number with `image-rendering: pixelated`. One art pixel is the viewport height divided by about 225, rounded to a whole number of device pixels: 3 at 1280 × 720, 4 at 1440 × 900, 5 at 1920 × 1080.
- **Stars:** a seeded field of single stars in three brightnesses and a few larger cross-shaped stars. About a third twinkle in three steps by swapping colours, not by fading.
- **The Earth:** three pieces of art, each made for its size instead of scaled: a large limb (500 art pixels across, top 170 rows only, centred on South America) for Week, Hangar, Flight and Debrief; a medium globe (250) for Home; a small globe (140) for the Lab. Each is a palette-indexed PNG with ordered dithering on the terminator and the haze near the limb, single warm pixels for city lights and a stepped one-pixel atmosphere rim. Together they weigh about 30 KB.
- **Framing per screen:** Home, the globe on the right two thirds. Week, Hangar and Flight, the limb across the lower part of the view, low enough in the Hangar and the encounter that the spacecraft sits over black space. Debrief, the limb in the gap between the top panels and the leg log. Lab, a small globe at the lower right. Between screens one Earth travels: its centre and radius move together from the old framing to the new one over 850 ms with an ease-out, landing on whole art pixels each frame, and a change of screen mid-way continues from wherever the Earth is. The three images are the same globe at 500, 250 and 140 art pixels, so during the move the image whose size is nearest the current radius is drawn scaled with nearest-neighbour sampling, and the settled frame is the target image at exactly 1:1. The stars drift a few pixels with it. Under reduced motion the Earth is simply at the new framing.
- **The spacecraft:** a sprite assembled from part sprites (section 11.8) by `SpacecraftBlueprint` and `SpacecraftPainter`, drawn to a canvas at 1x and scaled by a whole number: up to 4 in the middle of the Hangar, up to 3 in the middle of the encounter, smaller only when the space is too narrow. Every fitted module has a part, and a higher mark is bigger or more elaborate. In the encounter the parts switched on this turn get a gold outline. Two idle frames: the flight computer's light blinks, the battery's top cell flickers and the repair drone bobs one pixel.
- **Storm (S3):** the red storm-leg edge on the flight screen and the red flash when radiation hits.
- **Encounter subject:** not drawn. The photograph on the card is the subject.

### 11.6 Motion

- One orchestrated moment per screen: cards dealt onto the scanner, or the rank bar filling.
- The Earth's slide between screens, the stars' twinkle and the spacecraft's two idle frames are the only ambient motion, and all three stop under `prefers-reduced-motion`.
- Everything else moves only in answer to the player.
- Durations: 120 ms for presses, 240 ms for cards, 600 ms for meters, 900 ms for the Earth's slide.

### 11.7 Not allowed

Glass or blurred panels, gradient buttons, glow text, emoji, icons without labels, rounded pill tags, capital-letter eyebrow labels, three shades of the same amber, cartoon illustrations, text placed directly over the bright Earth, smoothed or fractionally scaled pixel art, soft glows on sprites.

### 11.8 Pixel-art rules

Shared by the backdrop, the spacecraft, the module pictures and the event card pictures.

- **Pixel scale.** Art is authored on a small grid and shown at whole-number multiples with `image-rendering: pixelated` and no smoothing. One art pixel is 3 CSS pixels for sprites and the spacecraft; the backdrop uses a coarser grid since it is scenery. Never scale by a fraction, never rotate a sprite in CSS, and place sprites on whole art-pixel positions.
- **Palette.** Black `#000000`; space `#070b1a`, `#0e1630`, `#1b2a4e`; ocean `#173a73`, `#1f5aa8`, `#3b7dd8`, `#7db8f2`; cloud `#c5d2e0`, `#eef3f7`, `#ffffff`; land `#1f4d2c`, `#3a7a3a`, `#6aa84f`, `#c9a45c`, `#8a6a3a`; night lights `#ffcf6b`; foil gold `#6b4410`, `#b9741c`, `#e8a838`, `#ffd27a`; hull grey `#161a22`, `#2b313c`, `#4a5362`, `#7c8797`, `#b8c1cc`; solar cell `#131a4d`, `#27307e`, `#4c57ba`; danger `#7a1f2b`, `#c8323f`, `#ff5263`; good `#1f7a4d`, `#3ecf85`; caution `#f2e05a`; aurora `#6a3fb8`, `#b06cf0`.
- **Style.** Flat shading in two or three tones per material with the light from the upper left, a one-pixel darker outline on sprites against space, ordered dithering only where a gradient is needed (the Earth's terminator, the atmosphere), no anti-aliasing, no blur, no soft glows.
- **Formats.** PNG, never JPEG, for pixel art. Indexed colour where possible.

---

## 12. Text and languages

- All interface text lives in `StringsEn.json`, keyed like `Hangar.Launch` or `Module.Camera.Effect`.
- Engine output carries keys and parameters, never finished sentences. Example: `{ key: 'Debrief.Missed', params: { count: 5, module: 'Radar', points: 74 } }`.
- Numbers are formatted by the translator for the language (thousands separators, decimal mark).
- Event names from NASA data are not translated.
- "What was learned" lines live in `Data/Curated/Learned.ts`, one per curated event, with a template for ordinary asteroids built from their numbers.
- Turkish (S7) is a second string file with the same keys. A test fails if the key sets differ.
- Tone: plain, short, sentence case. Buttons say what happens: "Launch", "End turn", "Unlock for 60 points".

---

## 13. Tests and balance

### 13.1 Unit tests

| Area | Cases |
|---|---|
| Loadout | Each issue kind is reported; a valid loadout has none; install, remove and setMark return new objects; JSON round trip. |
| Spacecraft | Derived values for the starter loadout: generation 3, capacity 12, hull 16, shielding 1. |
| Event factories | 2019 OK and the 11 May 2024 storm produce the values in sections 6.1 and 6.2. Each exoplanet method maps to its channel. |
| Encounter | Charge step respects shadow and capacity; a plan over budget is invalid; gain uses signal and caps at capacity; `minMark` blocks recording; shield order (passive, then active); loss on hull ≤ 0. |
| Scoring | Base, channel bonus, full bonus, antenna multiplier, missed points. |
| Scanner | Pinned events appear on their leg; no event is dealt twice in a flight; Survey adds one and identifies all; storm legs add the storm and disable Hold. |
| Flight | Legal and illegal commands per phase; cruise recharge; completes after six legs; `replay` of a log reproduces the same state; the same seed gives the same flight. |
| Progress | Rank thresholds; purchase rules; loss banks half; logbook marks. |
| Data | Every snapshot record builds an event without throwing; every week has at least 8 events; every event has a source link and an image. |
| Text | Every key used by the engine exists in the string file. |

### 13.2 Balance tests

In `src/Engine/Tests/Balance.test.ts`, on the real weeks, 300 seeds unless stated. These are the targets the numbers are tuned to. GreedyBot presses every useful instrument it can afford, CautiousBot keeps shield power in reserve, and PlannerBot searches the rest of each encounter and stands in for a careful player.

| # | Check | Target |
|---|---|---|
| B1 | Starter loadout, July 2019, GreedyBot | Completes ≥ 95%. Banks 90–170 points. |
| B1a | July 2019, the starter and an unshielded SmallSat (Camera, Spectrometer, Radar, one Solar Array) | Nothing is lost. |
| B1b | Starter loadout, July 2019, PlannerBot against GreedyBot, 60 seeds | Careful play earns ≥ 20% more. |
| B2 | Starter loadout, May 2024 | Lost ≥ 90%. A new player cannot walk through the storm. |
| B3 | Best affordable Explorer loadout without a Magnetic Shield, May 2024 | Lost ≥ 60%. |
| B4 | Explorer loadout with Magnetic Shield Mk I, May 2024, CautiousBot | Completes ≥ 85%. |
| B4a | The same loadout, GreedyBot | Completes < 60%. May must not be safe for a player who spends the shield's power on instruments. |
| B5 | For each week, the best loadout found by search differs from the best for the other weeks in at least two modules | True. No universal loadout. |
| B6 | For each week, no single instrument accounts for more than 60% of the data in the best Explorer loadout, or 80% on the SmallSat | True. **Loosened** for the SmallSat: on 60 $M the best autumn 2022 build carries one main instrument plus the High-Energy Detector for the gamma-ray burst, so the camera does three quarters of the work. That follows from the budget and the real week. |
| B7 | A player following GreedyBot reaches rank 2 within 2 flights and rank 3 within 3 | True. Tightened from "rank 3 within 5": rank 3 now opens the storm week. |
| B8 | Every module the lab sells by rank 2 appears in some week's top five loadouts | True. **Loosened** from "every module": the search runs at Mk I on the bus of each week's rank, so the rank-3 modules (Antenna, Repair Drone) are not required. They do appear in May's top five. |
| B9 | Radar bought after flight one, best loadout each bot can fly, 60 seeds | A careful player (PlannerBot) earns ≥ 15% more on autumn 2022 and ≥ 5% more on July 2019; a careless one (GreedyBot) ≥ 15% more on autumn 2022. 15% is about one more asteroid recorded on all three channels per flight. |
| B10 | Campaigns: PlannerBot with the careful buying order (Radar, then Magnetic Shield) on seeds 1 to 3, GreedyBot with the default order on seeds 3 and 4 | Autumn 2022 opens after flight one and May 2024 after flight two for every careful campaign; May 2024 after flight three for the careless ones. May's rank gives the Explorer. The fit the careful player takes into May completes 75 to 97% for PlannerBot over 60 seeds (dangerous, not impossible, not free), and at least 10 points less for GreedyBot. |
| B11 | Every Lab offer after flight one (rank 2, 230 points), best loadout with and without it, PlannerBot, 40 seeds | Each raises the next flight's points by ≥ 10% on July 2019 or autumn 2022, except the two storm modules. No offer gives 40% or more, and at least three give 10% or more. The Magnetic Shield takes the best May 2024 fit at rank 3 from ≤ 10% to ≥ 75% completed. The Flight Computer added to the B4 kit raises PlannerBot's May completion by ≥ 8 points (100 seeds). |

### 13.3 What the engine shows so far

Flown by the engine's test players on the real weeks, 300 flights per row unless stated, on the numbers in section 5. Figures from `GameDesign.md` (balance pass of 15 November, afternoon).

| Loadout | Week | Greedy: points, completed | Planner: points, completed |
|---|---|---|---|
| Starter (six modules) | July 2019 | 162, 100% | 212, 100% |
| Two arrays, two batteries, Camera, Spectrometer | July 2019 | 179, 100% | 222, 100% |
| Solar Array, Battery, Camera, Spectrometer, Radar | July 2019 | 172, 100% | 251, 100% |
| Starter | Autumn 2022 | 133, 100% | 233, 100% |
| Solar Array, Battery, Camera, Spectrometer, Radar | Autumn 2022 | 159, 88% | 299, 98% |
| Solar Array, Camera, Spectrometer, Radar, no shielding | Autumn 2022 | 187, 99% | 224, 98% |
| Starter | May 2024 | 37, 0% | 41, 0% |
| Medium: Magnetic Shield Mk I, one array, battery, Camera, Particle and High-Energy Detectors, shielding | May 2024 | 29% completed (Cautious 91%) | 82% completed |
| Medium: Magnetic Shield, Battery, Solar Array, Shielding and Particle Detector at Mk II, Camera | May 2024 | 100% completed | 100% completed |

**May 2024 when it opens (flight three).** The careful player's fit (Explorer, Solar Array, Battery, Camera, Spectrometer, Radar, Particle Detector, Radiation Shielding, Magnetic Shield, all Mk I), 100 seeds: Planner 188 points, 82% completed; Cautious 94%; Greedy 60%. Without a Magnetic Shield: 0%.

**Flights until each week opens** (24 campaigns of five flights, `Tools/Balance/Study.probe.ts`):

| Week (rank) | Careful player | Careless player |
|---|---|---|
| July 2019 (1) | flight 1 | flight 1 |
| Autumn 2022 (2) | flight 2, 24 of 24 | flight 2, 21 of 24; flight 3, 3 |
| May 2024 (3) | flight 3, 24 of 24 | flight 3, 19 of 24; flight 4, 5 |

Before this pass (May at rank 4, rank 3 at 400) the careful player reached May 2024 on flight five.

**The Lab after flight one** (rank 2, 230 points). Best loadout with the purchase against without it, 60 seeds (Planner 227 on July 2019 and 238 on autumn 2022 without):

| Bought | July 2019, careful | Autumn 2022, careful | Autumn 2022, careless | May 2024, one flight later |
|---|---|---|---|---|
| Radar Mk I | +11% | +25% | +57% | in the careful fit |
| High-Energy Detector | +0% | +18% | +0% | +41%, completion 87 → 100% |
| Thrusters (bay 1) | +12% | +9% | +31% | — |
| Magnetic Shield | +0% | +0% | +0% | completion 0 → 82% |
| Flight Computer | +0% | +0% | +0% | completion 79 → 93% on the B4 kit |

Mk II marks open at rank 3. After flight two, Particle Detector II (+26%), Battery II (+10%, completion 87 → 98%) and Magnetic Shield II (+9%) pay in May 2024 and Camera II (+10%) on July 2019; Solar Array II, Spectrometer II, Radar II, Radiation Shielding II and the Repair Drone measure +0%.

What this says:

- **The first flight is safe and has a decision.** The starter's two instruments want 6 power a turn against 3 made, so a careful player who saves charge for the peak turn earns about 30% more than one who presses everything. Nothing is lost on July 2019.
- **Power is the real limit once you carry three instruments.** The radar pays only because at 2 bay it fits in place of the Particle Detector and the shielding.
- **Dropping the shielding has a price on autumn 2022,** which has one Kp 6 storm: 1 to 12% of flights are lost, after the storm, at low hull.
- **May 2024 opens on flight three and cannot be survived without the Magnetic Shield.** On a Mk I shield with thin power, how you fly decides it: 60% for a player who spends the shield's power on instruments, 82 to 94% for a careful one; with two arrays and two batteries it is safe.
- **The Magnetic Shield and the Flight Computer earn no points on a calm week.** Their worth is May 2024, one flight after they can first be bought.

### 13.4 Manual checks before each merge

- `npx tsc -b`, `npx vitest run`, `npm run build` all pass.
- One full loop played by hand in the browser: Home → Week → Hangar → Flight → Debrief → Lab → Hangar.
- 1440 × 900 and 1280 × 720 looked at for overflow.

---

## 14. Build plan

It is Saturday evening, 14 November. Submission closes Sunday 15 November at 23:59. The plan assumes about 15 working hours.

| Step | Work | Hours | Done when |
|---|---|---|---|
| 1. Setup | Restore project files and reusable code from the archive; empty app builds and deploys. | 0.5 | `npm run build` passes; the Earth renders. |
| 2. Engine | Sections 4, 5 and 8, with the unit tests. Hand-written sample events stand in for data. | 3.5 | Unit tests pass; GreedyBot completes a flight. |
| 3. Data | Section 7. Script, snapshots for two weeks, curated files. | 1.5 | Data tests pass; the script's report shows ≥ 8 events per week. |
| 4. Screens | Every screen built once, in its final design, in the order a judge meets them: Home, Hangar, Encounter, Scanner, Debrief, Lab, Week. Card designs, meters, images and saving included. | 5.5 | A full loop can be played by hand, and every screen matches section 11 at 1440 × 900 and 1280 × 720. |
| 5. Polish | A pass over the finished screens: motion, the camera move between screens, fixes from an independent design review, then the spacecraft model (S5) and storm visuals (S3) if time allows. | 1.5 | The review's serious findings are fixed; each screen has its one orchestrated moment. |
| 6. Finish | Logbook, Sources, hints, balance pass against B1–B8. | 1.5 | Balance tests pass or their targets are adjusted with a note. |
| 7. Ship | Deploy, README with AI declaration, 30-second video, submission text. | 1 | Public link opens without login; video recorded. |

**Why steps 4 and 5 changed.** They were "build everything plain, then restyle everything". The team decided on 15 November that these two steps decide what a judge sees, so each screen is now built finished, most important first. If time runs out, the screens that exist are complete ones. Step 5 remains as a separate polish pass.

**Order to cut if late:** S8, S7, S6, S5, S4, S3, S2, then the Logbook's photographs, then the second week. The game is still submittable with one week and ten modules.

**Things only the team can do:** approve the image downloads, create the public repository and hosting, optionally get a NASA API key, record and upload the video, submit the form.

---

## 15. Submission checklist

- [ ] Public link to the game, opens without login.
- [ ] Public repository.
- [ ] README states: the idea is the team's; AI (Claude) was used to structure the design, write the documents and write code; commits carry a co-author line.
- [ ] Sources screen lists every dataset and image with links.
- [ ] No NASA logo, insignia, flag or mission patch anywhere. Non-affiliation line in the footer.
- [ ] Any AI-generated image or video is watermarked. The plan uses none: card art is real photographs and our own line drawings.
- [ ] Demo: one video of 30 seconds or less, at a public link.
- [ ] Project description names the NASA data used: JPL/CNEOS close-approach data, DONKI, Exoplanet Archive, Image and Video Library.

---

## 16. Risks and open points

| Risk | Effect | Answer |
|---|---|---|
| Turns feel solved: the player presses the same modules every turn | The flight is dull again | Signal, shadow and radiation change every turn, and charge carries between encounters. If still flat after step 4, switch on cooldowns (section 4.11). |
| Fifteen hours is not enough | Unfinished submission | The cut order in section 14. Steps 2 and 4 are the game; everything else can shrink. |
| A NASA endpoint is down when the script runs | Missing data | Storm rules work without flare data. Asteroid figures can come from the JPL close-approach service. Snapshots, once written, never need the network again. |
| A week's real data is thin or dull | A flat flight | The script reports counts per leg. Windows in section 6.5 can be widened by a day without changing any rule. |
| Dates or facts in curated events are wrong | Wrong teaching, and embarrassment | Every curated line is checked against its linked NASA page when written, and the link ships with it. |
| Players do not understand why they scored nothing | Frustration | Contact cards say which module is missing before the encounter, and the debrief repeats it. |
| Balance numbers are untested with real data | Too easy or impossible | Section 13.2, run in step 6. |

**Open points for the team:**

1. The seven decisions in `Concept.md` section 15.
2. Whether to take a NASA API key or run the script slowly on the demo key.
3. Which of the image candidates to approve, once the list is produced in step 3.
4. ~~Whether the third week (May 2024) should be reachable sooner than rank 4.~~ Done on 15 November: it opens at rank 3 (350 points), on the third flight for a careful player. See `GameDesign.md`.
