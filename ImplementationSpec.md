# Artemis 26 — Implementation spec

This document says how to build the game described in `Concept.md`. It holds every rule and every number. Where the two documents disagree, this one wins and the concept gets corrected.

**Status:** steps 1 (setup) and 2 (engine) of the build plan are done. The engine has 170 passing tests and no screens yet. The first build is on the branch `Archive/FirstBuild`; section 11.4 lists what was reused from it.

**How the numbers were checked:** the tables in section 5 were flown by the engine's two test players, 300 flights per loadout, on two hand-written sample weeks. Results are in section 13.3. They show the shape is right. They are starting values: the sample weeks are not the real data, and the balance tests in section 13.2 are what tune them once it is in.

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
| M9 | Earth backdrop from the first build, and the two card designs. |
| M10 | Deployed at a public link, with AI use declared in the README. |

### 1.2 Should (in this order, as time allows)

| ID | Item |
|---|---|
| S1 | First-flight hints (three prompts). |
| S2 | Third week: May 2024. |
| S3 | Storm visuals: aurora and streaks. |
| S4 | Thrusters, Antenna, Repair Drone. |
| S5 | Spacecraft model assembled from installed modules. |
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

Same as the first build, so `node_modules` and the reusable files carry over.

| Purpose | Choice |
|---|---|
| Build | Vite 8, TypeScript 7 (`tsc -b`) |
| Interface | React 19 |
| State | Zustand 5 |
| 3D | three 0.187, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing |
| Tests | Vitest 5 |
| Data script | Node, no extra packages (built-in `fetch`) |
| Hosting | Any static host. `base: './'` in the Vite config so it works from a sub-path. |

Removed from the first build: firebase, qrcode.

### 2.2 Conventions

- **PascalCase** for files, folders, classes and components. camelCase for members.
- **Classes with base classes** for engine logic. No loose functions holding rules.
- **Almost no comments.** Names carry the meaning.
- **Git for everything.** One branch per milestone, merged into `main` when the team says so.
- **The engine imports nothing from React, three or the browser.** It must run in Vitest under Node.
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
public/
  Textures/                    Earth images from the first build
  Images/Events/               NASA photographs for event cards
  Icon.svg
src/
  Main.tsx
  App.tsx
  Engine/
    Core/                      SeededRandom, Numbers
    Modules/                   ModuleCard and subclasses, MarkSpec, ModuleCatalog
    Spacecraft/                Bus, BusCatalog, InstalledModule, Loadout, Spacecraft
    Events/                    Channel, Rarity, TurnCondition, SpaceEvent and subclasses, EventFactory
    Weeks/                     Week, LegSpec, WeekCatalog, Forecast
    Flight/                    FlightSetup, CraftState, Contact, Scanner, Encounter,
                               TurnPlan, TurnPreview, TurnOutcome, Flight, FlightCommand,
                               FlightReport
    Progress/                  Profile, Rank, Lab, Logbook
    Bots/                      FlightBot, GreedyBot, CautiousBot
    Tests/
  Data/
    Snapshot/                  generated JSON: Asteroids, Storms, Exoplanets
    Curated/                   RareEvents.ts, WeekDefinitions.ts, Learned.ts, Images.ts
  State/                       GameStore, Screen, SaveGame
  I18n/                        Translator, StringsEn.json, StringsTr.json
  World/                       3D scene
  Interface/
    Screens/
    Cards/                     ModuleCardView, EventCardView, ContactCardView
    Meters/                    PowerMeter, HullMeter, ChannelBar, BudgetMeter, TurnTrack, FlightTrack
    Shared/                    Button, Panel, Hint
  Styles/Space.css
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
- Starting state: `charge = capacity`, `hull = maxHull`, `burnsLeft = burns`, `repairUsed = false`.
- Each leg runs: **Scan → (Encounter | Hold) → Cruise**.
- **Cruise** (after every leg, including a held one): `charge = min(capacity, charge + 2 × generation)`.
- The flight ends after leg 6 (**Completed**) or the moment `hull ≤ 0` (**Lost**).

### 4.3 Scan

For each leg the scanner deals contacts from the week's pool.

1. Take the week's events that have not been dealt on an earlier leg of this flight.
2. **Dated events** (asteroids, rare events) are eligible only on the leg whose date window contains their date. **Undated events** (exoplanets) are eligible on every leg.
3. **Pinned events** (set in the week definition) are always dealt on their leg.
4. Fill up to **2** contacts by weighted draw without replacement. Weights: Common 6, Notable 3, Headline 1.
5. If the leg has no pinned event, the first contact is drawn from the dated events only, when there are any. This keeps a week's own events in front of the player; without it the always-eligible planets crowd them out.
6. If the pool runs out, the leg has fewer contacts. A leg with none can only be held.
7. An event pinned to one leg is never dealt on another.

**Identification:**

- Rare events are dealt **unidentified**.
- Headline events of other kinds are dealt unidentified.
- Notable events are dealt unidentified with probability 0.3.
- An unidentified contact shows only "Unknown contact" and its number of turns.

**Survey** (needs Radar): costs **3 charge**, once per leg. It identifies every contact on the leg and deals **1 more**. Available only if `charge ≥ 3`.

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
6. `hull -= incoming`. If `hull ≤ 0`, the flight is Lost and the encounter ends now. Data recorded this turn still counts.

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
- the leg's storm overlay, if the leg is a storm leg and the contact is not the storm itself: `storm.radiation[floor(i × storm.T / T)]` for turn index `i` from 0,
- the South Atlantic Anomaly: on a leg with no storm, each turn has probability 0.15 of **2** radiation.

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
- Each leg has its own stream for dealing, and its own for the survey's extra contact. Each contact has its own stream for shadow and anomaly rolls, keyed by leg and position. So using the survey, or the order contacts are played in, does not change the rolls of anything else.
- Shadow and anomaly rolls for a contact are drawn when it is dealt, for all its turns.
- A flight is fully determined by `(FlightSetup, command log)`. `Flight.replay` rebuilds it. Tests and resume both depend on this.

### 4.11 Option kept off by default: cooldowns

`EngineOptions.cooldowns = false`. If true, an active module used on turn `t` cannot be used on turn `t + 1`. Build the flag, leave it off, and decide after playtests.

---

## 5. Content tables

Costs are in millions of dollars. "Bay" is bay units. A value of 0 unlock points means the player starts with it.

### 5.1 Buses

| Id | Name | Min rank | Budget | Bay | Hull | Base generation | Base capacity |
|---|---|---|---|---|---|---|---|
| SmallSat | Small spacecraft | 1 | 60 | 8 | 16 | 2 | 6 |
| Explorer | Medium spacecraft | 3 | 110 | 12 | 22 | 2 | 8 |
| Flagship | Large spacecraft | 5 | 200 | 18 | 30 | 3 | 10 |

### 5.2 Modules

Format for three marks: `I / II / III`. Every Mk II needs rank 2 and every Mk III needs rank 4, in addition to the module's own minimum rank.

**Power (passive)**

| Id | Min rank | Copies | Cost | Bay | Effect | Unlock points |
|---|---|---|---|---|---|---|
| SolarArray | 1 | 2 | 8 / 14 / 24 | 1 / 2 / 3 | generation +2 / +3 / +5 | 0 / 90 / 260 |
| Battery | 1 | 2 | 6 / 10 / 18 | 1 / 1 / 2 | capacity +6 / +10 / +16 | 0 / 70 / 220 |

**Instruments (active)**

| Id | Min rank | Channel | Power | Cost | Bay | Data per use | Unlock points |
|---|---|---|---|---|---|---|---|
| Camera | 1 | Visible | 2 | 10 / 18 / 30 | 2 / 2 / 3 | 3 / 4 / 6 | 0 / 110 / 320 |
| ParticleDetector | 1 | Particles | 1 | 6 / 10 / 16 | 1 / 1 / 1 | 2 / 3 / 5 | 0 / 80 / 240 |
| Spectrometer | 1 | Spectrum | 3 | 14 / 24 / 38 | 2 / 3 / 3 | 4 / 6 / 8 | 60 / 140 / 360 |
| Radar | 1 | Radar | 4 | 16 / 26 / 40 | 3 / 3 / 4 | 5 / 7 / 10 | 90 / 170 / 400 |
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
| Thrusters | S4 | 2 | Active | 2 | 10 / 16 / 26 | 2 / 2 / 3 | 2 / 3 / 4 burns per flight | 100 / 180 / 400 |
| Antenna | S4 | 3 | Passive | — | 8 / 14 / 22 | 1 / 2 / 2 | points ×1.10 / ×1.20 / ×1.35 | 120 / 220 / 460 |
| RepairDrone | S4 | 3 | Active, once per flight | 3 | 9 / 15 / 24 | 1 / 1 / 2 | hull +6 / +9 / +12 | 110 / 200 / 420 |
| CrewCapsule | Later | 6 | — | — | — | — | Shown locked | — |

All modules have `maxCopies = 1` except Solar Array and Battery.

### 5.3 Starting profile

- Points 0, lifetime points 0, rank 1.
- Owned at Mk I: SolarArray, Battery, Camera, ParticleDetector, RadiationShielding.
- Default loadout: those five on the SmallSat. Cost 35 of 60, bay 6 of 8.

### 5.4 Ranks

| Rank | Lifetime points | Title | Unlocks |
|---|---|---|---|
| 1 | 0 | Trainee | SmallSat, week July 2019 |
| 2 | 150 | Flight Controller | Week 2022, HighEnergyDetector, Thrusters, Mk II |
| 3 | 400 | Mission Specialist | Explorer, Antenna, RepairDrone |
| 4 | 900 | Flight Director | Week May 2024, Mk III |
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

Source record: one close approach from NeoWs.

| Input | Field |
|---|---|
| Speed `v` (km/s) | `close_approach_data[0].relative_velocity.kilometers_per_second` |
| Miss distance `d` (lunar distances) | `close_approach_data[0].miss_distance.lunar` |
| Diameter `D` (m) | mean of `estimated_diameter.meters.estimated_diameter_min` and `_max` |
| Hazard flag | `is_potentially_hazardous_asteroid` |
| Date | `close_approach_data[0].close_approach_date_full` |
| Link | `nasa_jpl_url` |

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

Worked example, confirmed against the feed on 14 November 2026: **2019 OK**, 25 July 2019 01:22 UT, `v = 24.53`, `d = 0.186`, `D ≈ 94`. So `T = 3`, signal `[1, 2, 1]`, Visible 9, Spectrum 6, Radar 11. Pinned as Headline in the July 2019 week.

### 6.2 Solar storm

Source records: DONKI geomagnetic storms (GST) and solar energetic particle events (SEP), plus flares (FLR) when that endpoint answers (section 7.2).

A leg is a **storm leg** when any GST Kp reading of 5 or more falls inside the leg's date window.

| Input | Rule |
|---|---|
| `kp` | highest `allKpIndex[].kpIndex` inside the window, rounded down to a whole number, capped at 9 |
| `sep` | true if any SEP `eventTime` falls in the window or the 24 hours before it |
| `flareClass` | strongest flare class letter (X, M, C) in the window or the 72 hours before it, if flare data is available; otherwise inferred: `kp ≥ 8` → X, otherwise M. The lead is 72 hours because a flare's eruption takes one to three days to reach Earth. |

| Derived | Rule |
|---|---|
| Peak radiation `P` | kp 5 → 3; 6 → 4; 7 → 6; 8 → 8; 9 → 10. Add 2 if `sep`. |
| Turns `T` | 5 if `kp ≥ 8`, otherwise 4 |
| Radiation by turn | T=4: `round(P × [0.4, 1, 0.8, 0.4])`; T=5: `round(P × [0.3, 0.7, 1, 0.7, 0.3])` |
| Signal by turn | `2 × radiation[t] / P` |
| Particles capacity | `3 × P` |
| HighEnergy capacity | 12 if flare class X; 8 if M; none if C |
| Rarity | `kp ≥ 8` → Headline; `kp = 7` → Notable; otherwise Common |

Worked example, confirmed against DONKI on 14 November 2026: **the leg of 11 May 2024**. Kp reached 9.0 at 00:00 and 03:00 UT that day, and an SEP event began at 12:59 UT on 10 May, inside the 24 hours before. So `P = 12`, `T = 5`, radiation `[4, 8, 12, 8, 4]`, Particles 36, HighEnergy 12, Headline. The leg of 10 May reads Kp 8.67 at 21:00 UT, so `kp = 8`, `P = 10`.

### 6.3 Planet crossing its star

Source record: one row of the Exoplanet Archive table `pscomppars`.

| Input | Field |
|---|---|
| Method | `discoverymethod` |
| Star brightness `V` | `sy_vmag` |
| Planet radius (Earth radii) | `pl_rade` |
| Distance (parsecs) | `sy_dist` |
| Year, facility | `disc_year`, `disc_facility` |

| Derived | Rule |
|---|---|
| Turns | 5 |
| Signal | `[1, 1, 1, 1, 1]` |
| Channel | Transit → Visible 14. Radial Velocity → Spectrum 14. Imaging → Visible 20 with `minMark` 2. Microlensing → Visible 10 with signal `[0.5, 3, 0.5]` and 3 turns. Any other method → Visible 14. |
| Faint star | if `V > 12`, multiply capacity by 1.25 and round |
| Atmosphere | if the curated list marks the planet as having a measured atmosphere, add Spectrum 10 |
| Rarity | Notable if on the curated "famous" list, otherwise Common |
| Radiation | none |
| Dated | no |

Planets to fetch, by archive name: TRAPPIST-1 e, Kepler-452 b, 51 Peg b, Proxima Cen b, WASP-39 b (atmosphere), HD 209458 b (atmosphere), Kepler-186 f, K2-18 b (atmosphere), TOI-700 d, 55 Cnc e, HR 8799 b, OGLE-2005-BLG-390L b. The script reports any name the archive does not return.

### 6.4 Rare events

Hand-written in `Data/Curated/RareEvents.ts`. Each needs a date, a NASA page link, and a one-line "what was learned" checked against that page when it is written.

| Id | Date | Turns | Signal | Channels | Rarity |
|---|---|---|---|---|---|
| DartImpact | 26 Sep 2022 | 3 | `[1, 3, 1]` | Visible 12, Spectrum 8 | Headline |
| Grb221009A | 9 Oct 2022 | 3 | `[3, 1, 0.5]` | HighEnergy 18, Visible 8 | Headline |
| Oumuamua (candidate week) | Oct 2017 | 4 | `[0.5, 1, 1.5, 1]` | Visible 12, Spectrum 12 | Headline |
| Chelyabinsk (candidate week) | 15 Feb 2013 | 3 | `[0.5, 3, 0.5]` | Visible 10, HighEnergy 6 | Headline |

### 6.5 Weeks

A week definition lists six legs, each with a date window, and any pinned events.

**JulyNineteen — "The one nobody saw coming"** (rank 1)

| Leg | Window (UT) | Pinned |
|---|---|---|
| 1 | 20 Jul 2019 | — |
| 2 | 21 Jul 2019 | — |
| 3 | 22 Jul 2019 | — |
| 4 | 23 Jul 2019 | — |
| 5 | 24 Jul 2019 | — |
| 6 | 25 Jul 2019 | 2019 OK |

Expected storms: none. If DONKI shows a storm in these dates, it becomes a storm leg like any other.

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

**MayTwentyFour — "The great storm"** (rank 4, S2)

| Leg | Window (UT) | Pinned |
|---|---|---|
| 1 | 8 May 2024 | — |
| 2 | 9 May 2024 | — |
| 3 | 10 May 2024 | — |
| 4 | 11 May 2024 | — |
| 5 | 12 May 2024 | — |
| 6 | 13 May 2024 | — |

Storm legs: from DONKI. Legs 3 and 4 are expected to be Severe.

**Per-leg limit:** at most 6 asteroids per leg are kept, chosen by smallest miss distance. Asteroids beyond 20 lunar distances are dropped.

**Forecast** (shown on the Week and Hangar screens), computed from the week's pool: number of storm legs and the strongest band; number of asteroid flybys and how many have a Radar channel; number of planets by channel; whether any unknown contacts are expected.

---

## 7. Data pipeline

### 7.1 Principle

`Tools/FetchNasaData.mjs` is run by hand. It downloads, filters, and writes JSON into `src/Data/Snapshot/`. Those files are committed. The game imports them and never calls NASA while running.

Reasons: no rate limit or outage can break the game in front of a judge, no key is shipped to the browser, and two of the sources do not allow browser calls at all.

### 7.2 Sources, as tested on 14 November 2026

| Source | Request | Result |
|---|---|---|
| NeoWs feed | `GET https://api.nasa.gov/neo/rest/v1/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&api_key=KEY` | Works. At most 7 days per request. |
| DONKI GST | `GET https://api.nasa.gov/DONKI/GST?startDate=…&endDate=…&api_key=KEY` | Works. |
| DONKI SEP | `GET https://api.nasa.gov/DONKI/SEP?startDate=…&endDate=…&api_key=KEY` | Works. |
| DONKI CME | `GET https://api.nasa.gov/DONKI/CME?…` | Works. Not needed by the rules; kept as a fallback for dating storms. |
| DONKI FLR | `GET https://api.nasa.gov/DONKI/FLR?…` | **Returned 404 today.** The direct host `kauai.ccmc.gsfc.nasa.gov` timed out. Treat flares as optional; section 6.2 has the fallback. |
| Exoplanet Archive | `GET https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=<ADQL>&format=json` | Works. No browser access header, so script only. |
| Image library | `GET https://images-api.nasa.gov/search?q=…&media_type=image` | Works. No key. |
| JPL close-approach data | `GET https://ssd-api.jpl.nasa.gov/cad.api?…` | Works. A cross-check for asteroid figures; not required. |

**Key:** `DEMO_KEY` works but allowed only 10 requests an hour in today's test. The script needs about 15 requests in total. Either run it across two hours, or have a team member get a free key at api.nasa.gov and pass it as `NASA_API_KEY` in the environment. The key is never committed.

### 7.3 The script

```
node Tools/FetchNasaData.mjs [--week JulyNineteen] [--dry]
```

1. Read week definitions (date windows) from a small JSON copy of `WeekDefinitions`.
2. For each week: request NeoWs in chunks of at most 7 days; request GST and SEP for the whole span; try FLR and continue if it fails.
3. Request the exoplanet rows by name in one ADQL query.
4. Filter and trim to the fields in section 7.4.
5. Write the three snapshot files, each with a header: `retrievedAt`, `source`, `request`.
6. Print a report: counts per week and leg, storm legs found, names not found, any request that failed.

The script fails loudly if a week ends up with fewer than 8 events or a pinned asteroid is missing.

### 7.4 Snapshot shapes

```ts
interface AsteroidRecord {
  id: string                 // NeoWs id
  name: string               // "(2019 OK)" with brackets removed
  dateUtc: string            // ISO
  speedKmS: number
  missLunar: number
  missKm: number
  diameterMinM: number
  diameterMaxM: number
  hazardous: boolean
  url: string                // nasa_jpl_url
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
  id: string                 // DONKI sepID
  weekId: string
  timeUtc: string
  url: string
}

interface FlareRecord {
  id: string                 // DONKI flrID
  weekId: string
  peakUtc: string
  classType: string          // for example "X2.2"
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
  radiusEarth: number | null
  periodDays: number | null
  distanceParsec: number | null
  starVmag: number | null
  url: string                // archive overview page for the planet
}

interface SnapshotFile<T> {
  retrievedAt: string
  source: string
  requests: string[]         // with the key removed
  records: T[]
}
```

### 7.5 Images

- **Event cards use real NASA photographs,** stored in `public/Images/Events/` at the library's "medium" size (about 1280 px wide, roughly 100–300 KB each).
- **Most small asteroids have no photograph.** Their cards use one of four representative asteroid images, and the caption says so: "Representative image: asteroid Bennu."
- **About 14 files in total:** 4 asteroids, 2 Sun or aurora, 4 exoplanet illustrations, DART, the gamma-ray burst, 2 spare.
- **Each file is listed in `Data/Curated/Images.ts`** with its `nasa_id`, title, credit line and page link. The Sources screen reads from that file.
- **Downloading needs the team's go-ahead.** The list of exact files and sizes is shown for approval before anything is fetched.
- **Exoplanet images are artist's concepts** and are labelled as such on the card.

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
  static randomSeed(): number
}

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
  static fromJson(json: LoadoutJson): Loadout     // unknown ids, marks and buses are dropped or defaulted
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
class ExoplanetTransit { static fromRecord(record: ExoplanetRecord, note?: ExoplanetNote); static idFor(name) }
class RareEvent        { /* constructed directly from EventDetails in Curated/RareEvents.ts */ }
```

Event ids: `Asteroid.<NeoWs id>`, `Storm.<YYYY-MM-DD of the leg>`, `Exoplanet.<name without spaces or punctuation>`, and whatever a rare event is given.

"What was learned" keys: a pinned asteroid, a famous planet and every rare event use `Learned.<event id>`, written by hand in step 3. Everything else uses a shared template: `Learned.Asteroid`, `Learned.Storm`, `Learned.Method.<Transit | RadialVelocity | Imaging | Microlensing>`.

### 8.5 Weeks

```ts
interface WeekDefinition { id: string; minRank: number; legs: { startUtc; endUtc; pinned?: string[] }[] }
interface Leg { window: DateWindow; pinnedEventIds: readonly string[]; storm?: SolarStorm }

class Week {
  constructor(id, minRank, legs: readonly Leg[], events: readonly SpaceEvent[])   // throws unless 6 legs and every pin exists
  readonly forecast: Forecast
  get storms, everything, startUtc, endUtc
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
interface FlightSetup { loadout: LoadoutJson; weekId: string; seed: number }
interface EngineOptions { cooldowns?: boolean; weeks?: WeekCatalog }

class CraftState { charge; hull; burnsLeft; repairUsed }

interface TurnCondition { signal: number; radiation: number; inShadow: boolean; anomaly: boolean }
class ConditionRoller { constructor(random); roll(event, overlay: SolarStorm | undefined, stormLeg: boolean): TurnCondition[] }

class Contact {
  readonly event: SpaceEvent
  identified: boolean
  played: boolean
  readonly conditions: readonly TurnCondition[]    // rolled when the contact is dealt
  readonly overlay?: SolarStorm
  get turnCount, peakRadiation, band, peakSignal
}

class Scanner {
  constructor(week: Week, seed: number)
  deal(legIndex): Contact[]
  dealExtra(legIndex, slot): Contact | undefined
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
  get event, turnIndex, turnCount, isOver, recorded, current
  get visible(): (TurnCondition | undefined)[]     // undefined = hidden by lookahead
  isCooling(key): boolean
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
  static begin(setup: FlightSetup, options?: EngineOptions): Flight
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

The encounter stays readable through `flight.encounter` during `EncounterDone` and `Lost`, so the interface can show its result.

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
  setLanguage(language: Language): void
  resetProgress(): void
}

enum Screen { Home, Week, Hangar, Flight, Debrief, Lab, Logbook, Sources }
```

`Flight` is mutable inside the engine. The store holds one instance and bumps `flightTick` after each `apply`.

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
│ ‹ Weeks      20–25 July 2019 · The one nobody saw coming                  │
│                                                                           │
│ ┌ Forecast ─────────┐                            ┌ Your modules ────────┐ │
│ │ No storms         │                            │ Power                │ │
│ │ 9 asteroid flybys │      spacecraft            │  [Solar Array  Mk I] │ │
│ │  5 in radar range │      (Earth behind)        │  [Battery      Mk I] │ │
│ │ 4 planets         │                            │ Instruments          │ │
│ │ Unknowns likely   │                            │  [Camera       Mk I] │ │
│ └───────────────────┘                            │  [Spectrometer —   ] │ │
│                                                  │  [Radar      locked] │ │
│ ┌ Spacecraft ───────────────────────────┐        │ Protection           │ │
│ │ Budget   ▓▓▓▓▓▓▓░░░░░  35 of 60       │        │  …                   │ │
│ │ Bay      ▓▓▓▓▓▓▓▓▓░░░   6 of 8        │        └──────────────────────┘ │
│ │ Power    +4 a turn · holds 12         │                                 │
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
  - Not owned: dimmed, with "Unlock in the lab for 60 points".
  - Rank-locked: dimmed, with "Rank 2".
- **Spacecraft panel (bottom left):** the two limits as meters, the derived values, and two lists: what this loadout can and cannot record. The "cannot" list is compared with the forecast: a channel the week needs and the loadout lacks is flagged.
- **Launch** is disabled while `issues()` is not empty, and the first issue is written next to it.
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
│ │ 71,355 km from Earth    │    Earth              │ rad 0 rad 2  ?      │ │
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
│ This turn: uses 5 power · records 14 · takes 0 damage        [ End turn ] │
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

**Logbook:** a grid of every event in the unlocked weeks. Unrecorded events show as dark cards with only their kind. Recorded ones show the photograph, real facts, the "what was learned" line and the source link. Complete ones carry a gold corner. A header shows totals.

**Sources:** a plain table.

| Section | Rows |
|---|---|
| Data | Each dataset: name, what the game takes from it, date retrieved, link |
| Images | Each image: title, credit, link |
| Game numbers | A statement that power costs, capacities and prices are game values chosen for play, and are not real engineering figures |
| AI use | What AI was used for |

### 10.10 Smaller screens

- **1280 × 720:** everything above must fit without page scroll. The module list in the Hangar scrolls inside its panel.
- **Under 800 px wide (S6):**
  - Hangar: the spacecraft panel becomes a sticky bar at the top showing only Budget and Bay; the module list fills the page.
  - Encounter: the event card collapses to name and channel bars; the module row becomes a two-column grid; the preview line and **End turn** are a sticky bar at the bottom.
  - Touch targets are at least 44 px.
- No horizontal page scroll at any width from 375 px.

### 10.11 First-flight hints (S1)

Three prompts, each shown once and stored in `hintsSeen`:

1. Hangar: "This week is mostly asteroids. A camera records them. Press Launch."
2. First encounter: "Switch on the camera, then end the turn. Signal is strongest at closest approach."
3. First debrief: "You missed points because you had no radar. The lab is where you fix that."

### 10.12 Accessibility

- Every control reachable and operable by keyboard, with a visible focus ring.
- Status is never colour alone: warnings carry a word or a shape.
- `prefers-reduced-motion`: no camera moves, no card lifts, instant meter changes.
- Text contrast at least 4.5:1 against its panel. Text never sits directly on the 3D scene; it sits on a panel or a scrim.
- Meters use `role="meter"` with a label and values.

---

## 11. Visual direction

### 11.1 Principle

You are in orbit. The Earth is the picture. The interface is dark, flat and quiet, and stays at the edges. Photographs carry the wonder; the interface carries the numbers.

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
- Middle: a fine white line drawing of the hardware, one per module, drawn as inline SVG.
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
| Earth | `src/World/Earth/EarthMaterial.ts`, `AtmosphereMaterial.ts`, `Globe.tsx` | Fix the oversized sun glint: exponent 90 → about 600, strength 2.2 → about 0.7. |
| Earth images | `public/Textures/*.jpg` | None. Keep the credit. |
| Spacecraft parts | `src/World/Spacecraft/**` | Feed from `Loadout` instead of the old design (S5). |
| Graphics checks | `src/World/GraphicsSupport.ts`, `MotionPreference.ts` | None. |
| Random and number helpers | `src/Engine/Simulation/SeededRandom.ts`, `src/Engine/Numbers.ts` | Move to `Engine/Core`, extend. |
| Translation | `src/I18n/Translator.ts`, `UseTranslator.ts`, `Language.ts` | None. New string files. |
| Project setup | `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/Icon.svg` | Remove firebase and qrcode. |

Not taken: the old engine, the old screens, team sync, the camera director (a simpler fixed camera replaces it), the landmark spacecraft.

### 11.5 The world

- **One scene behind every screen:** the Earth, slowly turning, seen from low orbit, lit by the Sun with a night side and city lights.
- **Camera:** fixed per screen, with a slow eased move between screens. Home: Earth fills the right two thirds. Hangar: Earth lower, spacecraft centre. Flight: spacecraft small at centre, Earth's limb across the lower half.
- **Without WebGL:** a still photograph of Earth as the page background. Everything else works.
- **Storm (S3):** an aurora band on the night side scaled by the turn's radiation, and thin bright streaks across the view for 600 ms when radiation hits.
- **Encounter subject:** not modelled in 3D. The photograph on the card is the subject.

### 11.6 Motion

- One orchestrated moment per screen: cards dealt onto the scanner, or the rank bar filling.
- Everything else moves only in answer to the player.
- Durations: 120 ms for presses, 240 ms for cards, 600 ms for meters.

### 11.7 Not allowed

Glass or blurred panels, gradient buttons, glow text, emoji, icons without labels, rounded pill tags, capital-letter eyebrow labels, three shades of the same amber, cartoon illustrations, text placed directly over the bright Earth.

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
| Spacecraft | Derived values for the starter loadout: generation 4, capacity 12, hull 16, shielding 1. |
| Event factories | 2019 OK and the 11 May 2024 storm produce the values in sections 6.1 and 6.2. Each exoplanet method maps to its channel. |
| Encounter | Charge step respects shadow and capacity; a plan over budget is invalid; gain uses signal and caps at capacity; `minMark` blocks recording; shield order (passive, then active); loss on hull ≤ 0. |
| Scoring | Base, channel bonus, full bonus, antenna multiplier, missed points. |
| Scanner | Pinned events appear on their leg; no event is dealt twice in a flight; Survey adds one and identifies all; storm legs add the storm and disable Hold. |
| Flight | Legal and illegal commands per phase; cruise recharge; completes after six legs; `replay` of a log reproduces the same state; the same seed gives the same flight. |
| Progress | Rank thresholds; purchase rules; loss banks half; logbook marks. |
| Data | Every snapshot record builds an event without throwing; every week has at least 8 events; every event has a source link and an image. |
| Text | Every key used by the engine exists in the string file. |

### 13.2 Balance tests

Run with bots, 300 seeds each. These are the targets the numbers are tuned to.

| # | Check | Target |
|---|---|---|
| B1 | Starter loadout, July 2019, GreedyBot | Completes ≥ 95%. Banks 90–170 points. |
| B2 | Starter loadout, May 2024 | Lost ≥ 90%. A new player cannot walk through the storm. |
| B3 | Best affordable Explorer loadout without a Magnetic Shield, May 2024 | Lost ≥ 60%. |
| B4 | Explorer loadout with Magnetic Shield, May 2024, CautiousBot | Completes ≥ 85%. |
| B5 | For each week, the best loadout found by search differs from the best for the other weeks in at least two modules | True. No universal loadout. |
| B6 | For each week, no single instrument accounts for more than 60% of points in the best loadout | True. |
| B7 | A player following GreedyBot reaches rank 2 within 2 flights and rank 3 within 5 | True. |
| B8 | No module is absent from every week's top five loadouts | True. No dead cards. |

### 13.3 What the engine shows so far

Flown by the engine's test players, 300 flights per row, on the two sample weeks used by the tests. The quiet sample week is 21 asteroids, 5 planets and one rare event. The storm sample week uses the real May 2024 storm readings.

| Loadout | Week | Player | Mean points | Completed | Turns where power ran short |
|---|---|---|---|---|---|
| Starter | Quiet | Greedy | 142 | 100% | 0% |
| Camera only, nothing else | Quiet | Greedy | 142 | 99% | — |
| Camera and Radar, small spacecraft | Quiet | Greedy | 232 | 100% | 7% |
| Camera, Spectrometer, Radar, one Solar Array | Quiet | Greedy | 272 | 100% | 59% |
| Camera, Spectrometer, Radar, no power modules | Quiet | Greedy | 151 | 100% | 81% |
| Camera, Spectrometer, Radar, large spacecraft's power | Quiet | Greedy | 409 | 100% | 0% |
| Starter | Storm | Greedy | 31 | 0% | — |
| Medium, Mk II shielding, no Magnetic Shield | Storm | Greedy | 67 | 0% | — |
| Medium, Magnetic Shield Mk II, two instruments | Storm | Cautious | 184 | 100% | — |
| Medium, Magnetic Shield Mk I, one Solar Array, four instruments | Storm | Greedy | 259 | 63% | 9% |
| The same | Storm | Cautious | 272 | 98% | 22% |

What this says:

- **Power is the real limit once you carry three instruments.** The same three instruments earn 151, 272 or 409 depending only on power. That is the trade-off between instruments and power modules.
- **The first flight is safe and is not a puzzle.** The starter never runs short of power. It earns enough for one or two unlocks, and three of its five modules do nothing on a quiet week. Swapping them out is the first design lesson.
- **The storm cannot be survived without the Magnetic Shield.**
- **How you fly matters.** On thin power in the storm, a player who saves charge for the shield survives 98% of the time. One who spends it all on instruments survives 63%.
- **With plenty of power the storm is safe once you own the shield.** If real-data playtests find that too easy, raise the shield's power cost before touching anything else.

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
| 4. Playable | Hangar, scanner, encounter, debrief, lab, home, saving. Plain styling. | 4 | A full loop can be played by hand. |
| 5. Look | Card designs, meters, world camera, motion, images. | 3 | Matches section 11 at both desktop sizes. |
| 6. Finish | Logbook, Sources, hints, balance pass against B1–B8. | 1.5 | Balance tests pass or their targets are adjusted with a note. |
| 7. Ship | Deploy, README with AI declaration, 30-second video, submission text. | 1 | Public link opens without login; video recorded. |

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
- [ ] Project description names the NASA data used: NeoWs, DONKI, Exoplanet Archive, Image and Video Library.

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
4. Whether the third week (May 2024) should be reachable sooner than rank 4 so that judges are more likely to see it.
