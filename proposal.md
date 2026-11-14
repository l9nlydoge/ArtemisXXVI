# Artemis 26 — Space Apps 2026 proposal (Ankara)

> **Pitch:** Design a NASA-style mission in ten minutes and fly it in thirty seconds. When it fails, the game traces the failure back to the exact decision that caused it. Then you negotiate your crew to a unanimous **GO** and try again.

Numbers in `[n]` refer to the source list at the end. **EST** marks a number we estimated or tuned rather than took from a source. The game's in-app Sources screen should show these same labels.

---

## 0. Why this, in one paragraph (the gap)

- **Digital sandboxes get the physics right, but have no missions.** Kerbal Space Program, Juno/SimpleRockets and Spaceflight Simulator have no payload, data or comms budgets and no team roles.
- **Classroom card games have the right trade-offs, but are slow and unexplained.** JPL's *Marsbound* [41] is the closest match: a rocket mass limit, power and budget limits, scored on cost per unit of science. It takes 1–2 hours on paper, and launch success is a dice roll with no explanation.
- **Professional design teams have the right structure, but take days.** JPL Team X and ESA's Concurrent Design Facility have the multi-role structure we want: one expert per subsystem, all working on shared numbers. A design session there takes days.
- **Nobody combines all of it.** No tool we found gives a 10-minute session, visible consequence chains, explained failure, role-based negotiation and real NASA numbers together.
- **Past attempts fell short.** Space Apps 2021 projects on a similar theme (e.g. "Decks to Orbit") shipped with their game logic unfinished.
- **This matches the challenge text.** It says existing tools cover single topics "without demonstrating how these elements interact as a complete system" [1]. Artemis 26 is built around that sentence.

---

## 1. Name + pitch

**Artemis 26.** Named for NASA's Artemis programme and for 2026: the year Artemis II carried a crew around the Moon, and the year of this challenge. The launch decision in the game keeps the name of the real flight-readiness poll, **GO / NO-GO**, in which every console lead must say "GO" before launch.

## 2. Core loop (≈10 min per mission)

1. **Pick a mission card.** For example: *Crop Watch*, "Map global farmland every 8 days for 5 years. Budget $600M."
   - The card shows the objective, requirements (science points, revisit time, lifetime) and budget.
2. **Build the spacecraft in six panels.**
   - The panels are: Instruments → Bus → Power (array area, battery) → Orbit → Comms + ground stations → Launch vehicle (plus number of copies).
   - Every change animates the **Ripple**: affected budget bars pulse, and any that cross into red shake.
3. **Hold the Readiness Review.**
   - Five budgets show traffic lights: Mass, Power, Data, Cost, Lifetime.
   - In team mode, every role votes GO or NO-GO here.
4. **Launch.** The mission timeline plays over about 20 seconds: launch, then years ticking by, with seeded random events.
5. **Read the post-mortem.**
   - You get a star rating.
   - The **Failure Trace** (see §3) explains what went wrong.
   - A card compares your design with how NASA did it.
6. **Fix and relaunch.** One click takes you back to the decision that caused the failure. Players usually play 3–4 iterations, and that replay loop is where the learning happens.

## 3. The signature moment: the Failure Trace

When something breaks, the timeline **freezes**. The camera then rewinds along a glowing red chain of causes back to the decision that started it:

```
YEAR 1.8  ⚠ Battery worn out → instruments offline
   ↑  battery cycled to 47% depth every orbit (safe LEO limit ≈ 25% [5])
   ↑  36-minute eclipse every 93-minute orbit at 450 km
   ↑  load rose from 180 W to 610 W
   ↑  YOU added the Thermal Imager (380 W [15])           [ Fix this → ]
```

- **Why judges will remember it.** Kerbal shows *that* the craft exploded, and Marsbound rolls dice. Neither tells you *why*.
- **Why it's educational.** Explanatory feedback ("why it's wrong") consistently beats right/wrong feedback for novices [L3]. The Failure Trace is that principle turned into something you watch.
- **It reuses the Ripple graph.** The trace and the design-time Ripple draw the same dependency graph: forward while you design, backward after a failure. We build it once and use it twice.

**Supporting beat: "No single right answer."**
- When the game loads, it silently simulates about 2,000 random valid designs for the scenario.
- The post-mortem plots them as a cost-versus-science scatter, with your design highlighted and the Pareto frontier drawn. For example: "You beat 84% of possible missions."
- This shows the challenge's "rarely one right design" requirement directly. It's the Opus Magnum score-histogram pattern [D1].

## 4. Systems model (codeable in a day)

`simulate(design, scenario, seed) → { budgets, timeline[], verdict, traces[] }` is one pure TypeScript function, and the UI only renders its output. Agree this interface in the first hour, so that one person builds the engine while the other builds the UI.

### 4.1 Mass
```
dry   = bus.mass + Σinst.mass + comms.mass + A_array·kgPerM2 + battWh/120 + shielding
prop  = dry · (exp(Δv_total / (Isp·9.81)) − 1)      // rocket equation, Isp 220 s hydrazine (EST)
Δv_total = orbit.insertionDv + orbit.keepingDvPerYr · designLife
launch = dry·(1+contingency) + prop                 // contingency: Easy 10 / Normal 20 / Hard 30 %
```
- **Why those contingency values:** the NASA GSFC Gold Rules call for more than 15% mass margin at the end of Phase A, with growth allowance added on top [6].
- **Fail condition:** `launch × copies > LV.capacity[orbit.class]` means **NO LAUNCH**. The game says "over by X kg; drop the thermal imager or pick Vega-C."

### 4.2 Power
```
sunFrac   = 1 − eclipseMin/periodMin
P_sun     = A_array · 300 W/m² · (0.975)^year     // 350 W/m² array × 0.85 losses; 2.5 %/yr degradation (EST)
P_avail   = P_sun · sunFrac · 0.9                 // battery round-trip (EST)
load      = bus.baseW + Σinst.W·duty + comms.W
margin    = P_avail/load − 1                       // ★ needs ≥ 20 % (Gold Rules Phase A [6])
DoD       = load·eclipseMin/60 / battWh
```
- **Brownout:** if `P_avail < load`, instruments run at duty = `P_avail/load`, and science drops by the same fraction.
- **Battery life:** `battLife = 10 yr · (DoDsafe/DoD)²`, where DoDsafe is 25% in LEO/SSO [5] and 60% in GEO (EST). If DoD exceeds 100%, the spacecraft goes into safe mode in every eclipse.

### 4.3 Data
```
generated/day = Σ inst.Mbps · inst.duty · 86 400
downlink/day  = comms.Mbps · orbit.rateFactor · contactMin(orbit, stations) · 60
delivered     = min(1, downlink/generated)          // ★ data margin ≥ 20 %
```
- **Contact time per day:**
  - LEO: 50 min per ground station, from about 5 passes of about 10 min [31].
  - SSO: 60 min per station, a polar-station bonus (EST).
  - GEO: 1,440 min, i.e. continuous contact [30].
  - L2: 480 min of Deep Space Network time (EST).
- **Rate factor:** LEO/SSO 1. GEO 0.25 (EST). At L2 only X and Ka bands work, capped at 2 Mbps (EST) and 28 Mbps (Webb's Ka-band rate [13]).

### 4.4 Lifetime
```
life = min(designLife, battLife, radLife)
```
- **Radiation life (radLife):** 15 yr in LEO/SSO. In GEO, 3 yr unshielded and 12 yr with shielding (+5% dry mass, EST). At L2, 10 yr.
- **Design life:** a 1–10 yr slider. Each year adds propellant and 5% to bus cost (EST).

### 4.5 Cost
```
craft = bus.cost·(1+0.05·(designLife−3)) + Σinst.cost + comms.cost + array + battery
cost  = 1.30·craft·(1 + 0.8·(copies−1))   // 30 % program overhead, 80 % learning curve (EST)
      + launches·LV.price + stations·$2M·life (EST)
```
- **Over budget** means **PROJECT CANCELLED** before launch. The game says "Congress pulled funding."

### 4.6 Science and score
```
S = Σ_i inst.pointsPerYr · fit[scenario][inst] · fit[scenario][orbit]
      · delivered · avgDuty · min(life, targetYears)
coverage = min(1, requiredRevisitHrs / (orbit.revisitHrs / copies))
SCORE = S · coverage
```
- **1 ★ Mission success:** SCORE meets the scenario threshold and life is at least the target years.
- **2 ★ Smart spending:** success, and at least 10% of the budget left in reserve.
- **3 ★ Flight-ready:** success, plus mass, power and data margins each at least 20%.
- **Leaderboard metric:** science per $M, the same scoring Marsbound uses [41].

### 4.7 Random events (seeded, so a replay is reproducible)
- **Launch anomaly:** roughly 2–7% depending on vehicle (EST).
- **Solar storm:** cuts the array by 10%, plus a radiation hit in GEO/L2.
- **Micrometeoroid:** takes out one instrument unless redundancy was bought.
- **High solar activity:** drag doubles in LEO and eats propellant.

**The teaching point is that margins are insurance.** A design with a 20% power margin rides out the solar storm, while a 3% margin browns out. The post-mortem says exactly that.

## 5. Starter data

### 5.1 Launch vehicles
| Vehicle | LEO kg | SSO kg | GTO kg | Escape/L2 kg | Price | Src |
|---|---|---|---|---|---|---|
| SpaceX Rideshare | — | ≤300 (game cap, EST) | — | — | $350k for 50 kg + $7k/kg | [29] |
| Rocket Lab Electron | 300 | 200 | — | — | ~$7.5M | [21][22] |
| Vega-C | 3,300 | 2,300 | — | — | ~$52M (€48M, EST conversion) | [25][26] |
| Falcon 9 (reusable) | 17,500 | 12,000 (EST, not published) | 5,500 | 3,000 (EST) | $74M | [23][24] |
| Ariane 64 | 21,600 | 15,500 (sources conflict: 14,900) | 11,500 | 6,300 (EST) | ~$125M (€115M, EST) | [27][28] |

**How the escape capacity was estimated:** EST ≈ 0.55 × GTO. As a sanity check, Ariane 5 sent the 6.2 t Webb telescope to L2.

### 5.2 Orbits
| Orbit | Period | Eclipse | Revisit / view | Contact | Radiation | Δv & upkeep | Sci. strength |
|---|---|---|---|---|---|---|---|
| LEO 450 km | 93 min | 36 min/orbit (calc) | ~12 h single sat (EST); constellations for continuous coverage [30] | 50 min/day per station [31] | low, <1 krad/yr [32] | drag: reentry within years below 600 km [33]; 25 m/s/yr upkeep (EST) | sharpest images, storms |
| SSO 705 km | 99 min [35] | 35 min (calc) | 16-day repeat, same local sun time [35][30] | 60 min/day per station (EST) | low [32] | ~0.3 km/s more than LEO (calc); 5 m/s/yr (EST) | land imaging, Landsat [8] |
| GEO 35,786 km | 23 h 56 m [30] | none most of the year; ≤72 min/day in eclipse seasons [36] | fixed view of one hemisphere | continuous [30] | high [32] | +1.5 km/s from GTO (calc) [39]; 50 m/s/yr (EST) | weather, continuous watch |
| Sun–Earth L2 | ~6-mo halo [38] | none [38] | whole sky, no Earth view | DSN, ~1.5M km [38] | solar particles and cosmic rays [32] | LV direct (~3.4 km/s from LEO [39]); 4 m/s/yr (EST) | telescopes |

**How the eclipse values were calculated:** worst-case eclipse fraction is `asin(R/(R+h))/180°`.

### 5.3 Spacecraft components
| Item | Value | Src |
|---|---|---|
| Sunlight at 1 AU | 1,361 W/m² | [4] |
| Multi-junction cells | ~30% efficient; 403–433 W/m² at the cell | [2] |
| Rigid array | ~350 W/m², 30 W/kg (≈12 kg/m²), cheap | [2] (per m² is EST) |
| Roll-out array (ROSA-class) | 100 W/kg (≈3.5 kg/m²), ×3 cost (EST) | [2] |
| Li-ion battery pack | 120 Wh/kg (EST, inside the sourced 75–250 range) | [2] |
| Safe depth of discharge, LEO | 20–25% | [5] |
| UHF radio | 9.6 kbps | [3] |
| S-band | 2 Mbps (sourced range 1–10) | [3] |
| X-band | 384 Mbps (Landsat 8) | [7] |
| Ka-band | 1 Gbps (products); 28 Mbps at L2 (Webb) | [3][13] |
| Laser terminal | 200 Gbps (TBIRD, 6U CubeSat), but clouds block it (random event) | [12] |
| Margins | Mass >15% at end of Phase A; power 20% at Phase A; RF link ≥3 dB | [6] |
| Radio mass, power and cost | EST: UHF 1 kg/5 W/$0.2M · S 3 kg/15 W/$1M · X 15 kg/60 W/$8M · Ka 20 kg/90 W/$15M · Laser 10 kg/40 W/$12M | EST |

### 5.4 Instruments
| Instrument | Mass | Power | Data (on) | Duty | Cost | Src |
|---|---|---|---|---|---|---|
| Landsat-class imager (OLI) | ≤400 kg | 425 W | 261 Mbps | 25% | $180M (EST) | [14] |
| Thermal imager (TIRS) | 236 kg | 380 W | 26 Mbps | 25% | $120M (EST) | [15] (non-NASA) |
| Microwave sounder (ATMS) | 85 kg | 130 W | 0.032 Mbps | 100% | $60M (EST) | [16] |
| Mini microwave radiometer (TROPICS-class) | 1.5 kg (EST; whole satellite 5.4 kg) | 10 W (EST) | 0.1 Mbps (EST) | 100% | $3M (EST) | [19] |
| CubeSat camera (Dove-class) | 1.5 kg (EST; whole satellite ~5 kg) | 8 W (EST) | 50 Mbps (EST) | 25% | $1M (EST) | [18] |
| Radar (SAR) | 1,000 kg (EST; full NISAR observatory 2,380 kg) | 4 kW (EST; full NISAR observatory ~5 kW) | 2,000 Mbps (EST) | 15% | $400M (EST) | [17] |

**How to label OLI's figures:** they come from a 2005 not-to-exceed draft, so call them "Landsat-class approx."

**Bus classes (all EST, tuned for gameplay):**
| Bus | Bus mass | Max payload | Base power | Cost | Notes |
|---|---|---|---|---|---|
| 6U CubeSat | 6 kg | 4 kg | 5 W | $2M | ~40% payload share, from SMAD (secondhand) |
| SmallSat | 100 kg | 100 kg | 80 W | $25M | |
| Medium | 700 kg | 600 kg | 300 W | $90M | |
| Large | 1,300 kg | 1,200 kg | 500 W | $130M | anchored on the Landsat 9 spacecraft contract, $129.9M [11] |

### 5.5 "How NASA did it" cards
| | Landsat 9 → *Crop Watch* | TROPICS → *Storm Chaser* |
|---|---|---|
| Mass | 2,710 kg [9] | ~5.4 kg each [19] |
| Orbit | 705 km SSO, 99 min; 8-day revisit together with Landsat 8 [8] | 550 km, ~30° inclination [19] |
| Instruments | OLI-2 + TIRS-2 [8] | one microwave radiometer, 90–205 GHz [19] |
| Downlink | X-band 384 Mbps [7] | not found |
| Life | 5 yr design, consumables for 10 [8] | ~2 yr design |
| Launch | Atlas V 401, $153.8M [10] | Rocket Lab Electron [19] |
| Total cost | $885M life-cycle [11] | ~$30M [20] |
| Lesson | one big, capable, long-lived satellite | many tiny ones, for fast revisit over storms |

### 5.6 Scenarios
1. **MUST: Crop Watch** (SSO land imaging, $600M).
   - It is tuned so a Landsat replica costs about $700M, so it's unaffordable.
   - Players must drop the thermal imager, pick a smaller bus, or fly two Medium satellites. Each choice is a different trade-off.
2. **SHOULD: Storm Chaser** (revisit ≤ 2 h, $60M).
   - A single ATMS-class satellite blows the budget and misses the revisit requirement.
   - A constellation of 4–6 CubeSats on Electron wins, which is the TROPICS lesson.
3. **COULD: Deep Sky.** An infrared telescope at L2, where the bottleneck is Deep Space Network data rate (Webb's 28 Mbps).

## 6. Team mode (1–4 players: everyone on their own phone, with pass-the-device as a fallback)

Each role owns certain dials. Its own dashboard shows its budget in full, while the other roles' budgets appear only as a red/yellow/green light. This information gap forces players to talk, the way *Keep Talking and Nobody Explodes* and *Spaceteam* do [D3].

| Role | Owns | Sees in full | Example secret agenda (draw 2, keep 1) |
|---|---|---|---|
| **Principal Investigator** | instruments, design life | science points, fit table | "Your pet thermal imager MUST fly" |
| **Spacecraft Engineer** | bus, array, battery, shielding | mass and power budgets | "Your reputation: power margin ≥ 30%" |
| **Mission Ops & Comms** | orbit, radio, ground stations | data budget, contact minutes | "Fly the new laser terminal as a tech demo" |
| **Program Manager** | launch vehicle, copies, reserve | cost and schedule | "Return ≥ 15% of the budget to HQ" |

**Combining roles for smaller teams:**
- 2 players: PI + PM against Engineer + Ops.
- 3 players: Ops merges into Engineer.
- Solo: all four panels are open.

**How negotiation is created:**
1. **Owned dials.** Each dial belongs to one role, so the PI can't fix the power budget; they have to persuade the Engineer.
2. **Secret agendas.** These follow the *Dead of Winter* pattern [D4]. You win only if the mission earns ≥1★ **and** your agenda is met. Agendas deliberately pull against each other (thermal imager vs power margin vs budget return), and they stop one player from directing everyone ("quarterbacking").
3. **A mid-design requirement change.** The game draws a card such as "HQ cuts 10%" or "Add 6-hour data latency."
4. **The GO / NO-GO poll.**
   - Launch requires unanimous GO.
   - A NO-GO must cite one of the voter's red items.
   - The PM may override, at the cost of one star. If the mission then fails in that subsystem, the post-mortem says so: "Ops called NO-GO on downlink. Overridden."

### 6.1 Room play: one shared screen plus each player's phone (primary)

This works like a party game where phones are the controllers and one screen is shared.

1. **Host.** A laptop or projector clicks **Host team mission**. It shows a 4-letter room code and a QR code.
2. **Join.** Players scan the QR code with their phone, pick a free role, and their phone becomes **that role's private console**. It shows only the dials that role owns, its own full budget, and its secret agenda.
3. **Shared screen.** The big screen shows the spacecraft, everyone's traffic lights, the Ripple animation, and the GO/NO-GO board as votes come in.

Each player is physically looking at different information, so the information gap is real rather than enforced by hiding screens. That makes players talk to each other, and it's the strongest shot in the demo.

**Why it's not literally "local network only":**
- A static HTTPS site can't open a server or discover other devices on a LAN.
- Browsers block an HTTPS page from talking to `ws://192.168…` (mixed-content rules).
- Venue and school Wi-Fi often isolate clients from each other, so phones on the same Wi-Fi can't reach one another anyway.
- So the room goes through a **hosted realtime database**. That still means no server code of our own.

**Choice: Firebase Realtime Database (free Spark plan).**
- There is no server to write; we only write a short rules file.
- It works through any network: venue Wi-Fi, mobile data, or devices in different cities.
- It reconnects automatically.
- *Runner-up:* PeerJS/WebRTC needs no account, but it depends on a free public signalling server and fails on some carrier and venue networks. Rejected for reliability.

**How it fits the engine:**
- **What's shared:** the room only holds `{design, roles, votes, phase, seed}`.
- **Each device simulates locally:** every device runs `simulate(design, scenario, seed)` itself. The engine is a pure function, so all devices show identical results, and the only thing sent over the network is the design.
- **No edit conflicts:** each role writes only to its own path (e.g. `design/power`), because the dials are role-owned. Two phones never fight over the same field.
- **Secret agendas stay on the device:** each phone draws its agenda locally from `seed + playerId` and reveals only met/not met at the post-mortem.
- **Refreshes rejoin:** a refreshed or locked phone rejoins with the room code and role saved in localStorage. Firebase's `onDisconnect` greys out a role that drops.
- **Cleanup:** rooms expire after 24 h, via a timestamp checked in a cleanup on host start.

**Code sketch** (about 40 lines in total, behind a `sync.ts` interface so the UI never imports Firebase directly):
```ts
// host
set(ref(db, `rooms/${code}`), { scenario, seed, phase: 'design', created: serverTimestamp() })
// any player
update(ref(db, `rooms/${code}/design/${role}`), partialDesign)
onValue(ref(db, `rooms/${code}`), snap => store.setRoom(snap.val()))
```

### 6.2 Fallbacks (no network needed)
- **Pass-the-device:** a "Hand to: Spacecraft Engineer" screen hides the other dashboards. It uses the same role filter, so it costs almost nothing once room play exists.
- **Projector mode:** all dashboards are open at once, for a teacher leading a whole class.
- **Share link:** the whole design is encoded in the URL hash, so a link carries it to another device without any network room.

## 7. Scope plan

**Stack:**
- Vite + React + TypeScript, Zustand for state, Framer Motion for animation, SVG for the Ripple graph and budget bars, Vitest for engine tests.
- Firebase Realtime Database for team rooms only. Solo play never touches the network.
- Deploy as a static site on GitHub Pages or Netlify.
- Target current Chrome, Edge, Firefox and Safari (desktop and mobile).
- Responsive from phone to projector. Every action works by tap or click. Status uses icons and text, not colour alone. Heavy animation switches off under `prefers-reduced-motion`.
- All text lives in `strings.en.json` and `strings.tr.json` from the first commit.

**MUST: end of today (day 1)**
- Person A (engine):
  - `data.ts` with the tables above.
  - `simulate()` covering mass, power, data, lifetime, cost, science, stars and trace generation.
  - A Vitest sanity test: the Landsat replica must be *feasible but over budget*, at about $700M.
- Person B (UI):
  - Mission card and the six build panels.
  - Live budget bars with traffic lights.
  - A simple launch timeline with a progress bar and event ticks.
  - A post-mortem screen with stars and the Failure Trace as an animated text chain.
- Together: *Crop Watch* playable start to finish, in solo mode, deployed to a URL by tonight.

**SHOULD: day 2, in this order**
1. The animated Ripple / Failure Trace graph in SVG (the signature moment, so polish it first).
2. Random events.
3. The "How NASA did it" card.
4. Team mode, part 1, about 3 h: roles, owned dials, agendas and the GO/NO-GO poll, built as a role filter over the solo state, plus the pass-the-device hand-off screen.
4b. Team mode, part 2, about 4 h: room play.
   - `sync.ts` on Firebase.
   - Host screen with room code and QR (`qrcode` npm package).
   - Phone console layout.
   - Rejoin on refresh.
   - Test with 4 real phones on mobile data *and* venue Wi-Fi.
5. The *Storm Chaser* scenario.
6. The design-space scatter ("you beat 84%").
7. Turkish strings, a local leaderboard (localStorage, science per $M), and a Sources screen.
8. Feature freeze 4 hours before the deadline, then record the video.

**COULD**
- *Deep Sky* (L2).
- Difficulty levels (the contingency percentage plus event frequency).
- Sandbox mode (no budget, everything unlocked).
- A small Three.js orbit view on the launch screen.

**CUT**
- Real orbital mechanics or GMAT integration.
- Rocket building.
- Accounts, our own server, a global leaderboard, and a true LAN-only mode (see §6.1 for why).
- Offline mode.
- Audio.
- More than three scenarios.
- Onboard data storage.
- Thermal and attitude-control subsystems. Mention them on a slide as future work.

## 8. Demo script (30 s)

1. **0–9 s: "Every choice ripples."** The player swaps the CubeSat camera for the Landsat-class imager.
   - Mass jumps by 400 kg, and the Electron chip shakes red. The player switches to Vega-C.
   - The power bar goes red, and the array slider grows.
   - The cost meter ticks up.
2. **9–20 s: "It tells you why."** Launch, and the years fast-forward.
   - At year 1.8 the timeline freezes.
   - The red Failure Trace rewinds to "YOU added the Thermal Imager" and the player taps **Fix this**.
3. **20–30 s: "Teams negotiate. No single right answer."** Four hands, each holding a phone with a different role console, sit in front of the projector.
   - The Ops phone votes NO-GO with "downlink 60%". The Ops player adds a ground station on their phone, and all four tiles on the big screen flip to **GO**.
   - Three stars appear, with the "vs Landsat 9: $885M" card and the scatter plot showing the player's dot near the frontier.
   - End title: *Artemis 26.*

## 9. How it scores on the judging criteria, and the top risks

| Criterion | Why we score |
|---|---|
| **Impact** | Opens from a link and runs in a 10-minute lesson, in English and Turkish. It applies the research: explanatory feedback [L3], replay over several sessions and group play [L1], and simple visuals plus good design [L2]. The post-mortem works as a built-in debrief [L5]. |
| **Creativity** | The Failure Trace, a GO/NO-GO poll with secret agendas, and a scatter of every possible design. We found none of these in any existing mission game. |
| **Validity** | Launch, orbit, power, comms and reference-mission numbers come from NASA, ESA, USGS and manufacturers. Margins follow the GSFC Gold Rules. Physics formulas are shown, and every estimate is labelled EST on an in-game Sources screen. |
| **Relevance** | Covers every challenge bullet [1]: objective, spacecraft, instruments, launch vehicle, orbit, budget, mass, power, data, comms, lifetime, consequences, the "why" analysis, solo plus teams of up to 4 roles, random events, difficulty, reports and a leaderboard. Put this checklist on a slide. |
| **Presentation** | The demo has three memorable beats with large visual payoffs, and the Failure Trace makes a strong thumbnail frame. |

**Top risks**
1. **A degenerate optimum,** such as "Falcon 9 + Large bus always wins." *Mitigation:* run the random-design sampler on the first evening. If the scatter shows no spread, tune **only the EST values**, never the sourced ones.
2. **Team mode runs late.** *Mitigation:* build it as a view filter over the same state (who can edit which dial), not a separate game. Cap it at 4 hours.
3. **Engine and UI drift apart.** *Mitigation:* freeze the `simulate()` types in the first hour, and the UI renders mock output until the engine lands.
4. **A judge questions an estimate.** *Mitigation:* show the EST labels and the sources on screen. Simplifying is fine; hiding it is not.
5. **No time left for the video.** *Mitigation:* hard feature freeze 4 hours before the deadline; demo state comes from a fixed seed.
6. **Room play fails on stage,** because of venue internet or Firebase. *Mitigation:*
   - Record the demo video with a known-good connection.
   - Keep pass-the-device as a fallback; the in-app menu switches to it with one tap.
   - The room code screen shows connection status, so a failure is visible rather than silent.
7. **Pricing goes stale.** The Falcon 9 and rideshare prices come from secondary sources citing SpaceX, and SpaceX does not publish an SSO payload figure. Label them "approx. 2026."

---

## Sources

**Challenge.**
- [1] https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/

**Power and comms.**
- [2] NASA SST-SoA, Power: https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/
- [3] NASA SST-SoA, Comms: https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/
- [4] Solar irradiance (TSIS): https://earth.gsfc.nasa.gov/climate/projects/solar-irradiance/science
- [5] NASA Li-ion depth-of-discharge study: https://webarchive.library.unt.edu/web/20170124182352/https:/esto.nasa.gov/files/2003/Li-IonBatteryFinalReport.pdf
- [12] TBIRD: https://www.nasa.gov/directorates/somd/space-communications-navigation-program/nasas-record-breaking-laser-demo-completes-mission/
- [13] JWST Ka-band: https://ntrs.nasa.gov/api/citations/20240011425/downloads/Ka-Band%202024_One%20Network%20Evolution.pdf

**Margins.**
- [6] GSFC Gold Rules (GSFC-STD-1000 Rev I): https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf

**Landsat.**
- [7] USGS Landsat 8: https://www.usgs.gov/landsat-missions/landsat-8
- [8] USGS Landsat 9: https://www.usgs.gov/landsat-missions/landsat-9
- [9] Landsat 9 fast facts: https://www.nasa.gov/wp-content/uploads/2015/04/landsat_9_fast_facts.pdf
- [10] Landsat 9 launch contract: https://www.nasa.gov/press-release/nasa-awards-launch-services-contract-for-landsat-9-mission
- [11] Landsat 9 cost: https://landsat.gsfc.nasa.gov/article/landsat-9-project-on-track-u-s-general-accounting-office-assesses
- [35] Landsat 8 orbit: https://science.nasa.gov/mission/landsat-8

**Instruments.**
- [14] OLI: https://gsaw.org/wp-content/uploads/2014/03/2014s04mah.pdf
- [15] TIRS, eoPortal: https://www.eoportal.org/satellite-missions/landsat-8-ldcm
- [16] ATMS: https://www.nesdis.noaa.gov/s3/2023-10/JPSS-Instrument-Fact-Sheet_ATMS.pdf
- [17] NISAR: https://science.nasa.gov/blogs/nisar/2025/07/30/nasa-isros-nisar-mission-by-the-numbers
- [18] Planet, eoPortal: https://www.eoportal.org/satellite-missions/planet
- [19] TROPICS: https://www.nasa.gov/news-release/nasa-rocket-lab-launch-first-pair-of-storm-observing-cubesats/
- [20] TROPICS cost: https://spaceflightnow.com/2022/06/10/astra-poised-to-begin-three-launch-campaign-with-nasa-hurricane-research-satellites/

**Launch vehicles.**
- [21] Electron user guide: https://rocketlabcorp.com/assets/Electron-Payload-User-Guide-7.0-v6.pdf
- [22] Electron (Wikipedia): https://en.wikipedia.org/wiki/Electron_(rocket)
- [23] Falcon 9 (Wikipedia): https://en.wikipedia.org/wiki/Falcon_9
- [24] Falcon 9 price (secondary): https://keeptrack.space/deep-dive/how-much-does-a-falcon-9-launch-cost
- [25] Vega-C (ESA): https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Vega-C
- [26] Vega-C (Wikipedia): https://en.wikipedia.org/wiki/Vega-C
- [27] Ariane 64 (CNES): https://cnes.fr/en/news/new-ariane-6-four-booster-a64-variant-changes-game
- [28] Ariane 6 (Wikipedia): https://en.wikipedia.org/wiki/Ariane_6
- [29] Rideshare pricing (secondary): https://newspaceeconomy.ca/2026/02/27/spacex-rideshare-pricing-as-of-february-2026-what-it-costs-whats-included-and-how-buyers-budget-a-mission/

**Orbits and operations.**
- [30] ESA orbit types: https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits
- [31] STF-1 ground passes: https://ntrs.nasa.gov/api/citations/20190028946/downloads/20190028946.pdf
- [32] Radiation by orbit: https://ntrs.nasa.gov/api/citations/20240016296/downloads/RADSET_SciTech25_PayloadDev_EXPREV.pdf and https://nepp.nasa.gov/workshops/etw2017/talks/28-JUN-WED/1400%20-%202017-561-Campola-Final-ETW-presentation-TNXXXX-06232017.pdf
- [33] Orbital debris FAQ: https://orbitaldebris.jsc.nasa.gov/faq/
- [34] NASA orbits catalog: https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits
- [36] GOES eclipse seasons: https://www.ospo.noaa.gov/operations/goes/eclipse.html
- [38] Webb orbit: https://science.nasa.gov/mission/webb/orbit/
- [39] Delta-v budget (Wikipedia): https://en.wikipedia.org/wiki/Delta-v_budget

**Existing games.**
- [41] JPL Marsbound: https://www.jpl.nasa.gov/edu/teach/activity/marsbound

**Design patterns.**
- [D1] Opus Magnum score histograms: https://www.pcgamer.com/perfectly-solving-opus-magnums-puzzles-is-impossible-but-thats-ok
- [D2] Poly Bridge 2 star goals: https://www.shacknews.com/article/118338/poly-bridge-2-review-trussing-the-process
- [D3] Keep Talking and Nobody Explodes (GDC): https://gdcvault.com/play/1023113/contactUs
- [D3] Spaceteam: https://www.gamedeveloper.com/design/road-to-the-igf-henry-smith-s-i-spaceteam-i-
- [D4] Dead of Winter secret objectives: https://www.quartertothree.com/fp/?p=32789
- [D5] Mars Horizon: https://en.wikipedia.org/wiki/Mars_Horizon

**Learning research.**
- [L1] Wouters et al. 2013 meta-analysis (multiple sessions and group play help; d≈0.3): https://research-portal.uu.nl/en/publications/a-meta-analysis-of-the-cognitive-and-motivational-effects-of-seri/
- [L2] Clark, Tanner-Smith & Killingsworth 2016 (design matters; simple visuals work): https://www.sri.com/publication/education-learning-pubs/digital-learning-pubs/digital-games-design-and-learning-a-systematic-review-and-meta-analysis-brief/
- [L3] Moreno 2004 / Mayer's feedback principle (explanatory feedback beats corrective feedback for novices): https://serc.carleton.edu/resources/40398.html
- [L4] PhET implicit scaffolding (guide through the interface, not text): https://arxiv.org/pdf/1306.6544
- [L5] Crookall 2010 on debriefing: https://ideas.repec.org/a/sae/simgam/v41y2010i6p898-920.html
