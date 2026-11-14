# Artemis 26 — Game concept

Entry for the 2026 NASA Space Apps Challenge, "Space Mission Design Game". Team Artemis 26, Ankara.

This document says what the game is. `ImplementationSpec.md` says how to build it and holds every number.

---

## 1. The game in one paragraph

You run a small space observatory programme. Before each flight you build a spacecraft from module cards you have unlocked: cameras, a radar, shields, solar arrays, a battery. Money and bay space limit what fits. Then you fly a real week in space. Every asteroid, solar storm and distant planet you meet is taken from NASA's records for that week, with its real numbers. You can record only what your instruments can see, and only while your battery lasts. When the spacecraft reaches the end of its life you bank the research you collected, spend it on better hardware, and fly again.

**The pitch in one line:** build the spacecraft, fly a week that really happened, and find out what you should have packed.

## 2. Where the idea came from

- **The idea is the team's.** It was written down by a team member on 14 November 2026: a run-based deck builder set in space, where the cards are spacecraft hardware.
- **AI was used to structure it,** to write these two documents and to write code. The submission must say so.
- **The genre is the only thing borrowed.** Run-based deck builders share a shape: build a deck, face a string of encounters, improve between runs. The cards, names, rules, art and screens here are our own.

## 3. Why it fits the challenge

| The challenge asks for | How the game answers |
|---|---|
| A game about designing a space mission | The hangar is mission design: choose instruments, power and protection under a budget and a volume limit. |
| Trade-offs, with no single right answer | Each week needs different hardware. A storm week rewards shields and a particle detector. An asteroid week rewards a camera and a radar. You cannot fit everything. |
| Showing how the parts work together as a system | Power is shared. Running the shield means not running the radar. A bigger battery takes the bay space of an instrument. |
| NASA data | Every event is a real record: NASA/JPL's asteroid close-approach data, NASA's space weather database and its exoplanet archive. |
| Something people want to play again | A flight takes about five minutes, and each one unlocks hardware that changes the next. |

## 4. The loop

```
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
   PICK A WEEK ──► BUILD ──► FLY ──► DEBRIEF ──► LAB ──────────────┘
   real dates,     fit        6 legs,   research     spend research
   real forecast   modules    turn by   points and   points on new
                   under      turn      rank         modules and marks
                   budget
                   and bay
```

One full loop takes five to eight minutes.

## 5. The four numbers the player manages

| Number | Where it matters | What it limits |
|---|---|---|
| **Budget** (millions of dollars) | Hangar | Which modules, and which mark of each, you can afford on this flight. |
| **Bay space** (units) | Hangar | How many modules physically fit. |
| **Power** (charge in the battery) | Flight | What you can switch on this turn. |
| **Hull** | Flight | How much radiation damage you can take before the spacecraft is lost. |

There are two more numbers that are rewards, not limits:

| Number | What it is | What it does |
|---|---|---|
| **Research points** | What your recordings were worth | You spend them in the lab. |
| **Rank** (the XP) | Your lifetime total of research points. It never goes down. | Unlocks bigger spacecraft and harder weeks. |

## 6. Module cards

A module card is a piece of hardware. Your **deck** is the set of modules bolted to the spacecraft for this flight.

### 6.1 Marks: this is how you configure a card

Every module comes in three marks: Mk I, Mk II and Mk III. A higher mark is better and costs more budget, and often more bay space.

- **You unlock a mark once, with research points,** in the lab. It is yours for good.
- **You pay for the mark you install, from the flight's budget,** every flight. You may fly a Mk I to save money even if you own the Mk III.

So "upgrading" and "configuring" are one mechanism. Nothing improves for free.

### 6.2 The modules

| Family | Module | What it does |
|---|---|---|
| Power | **Solar Array** | Makes power every turn you are in sunlight. |
| Power | **Battery** | Stores power. Without it, power you don't use is wasted. |
| Instrument | **Camera** | Records visible light: asteroids, planets crossing their stars, afterglows. |
| Instrument | **Spectrometer** | Records what things are made of. |
| Instrument | **Radar** | Records shape and distance of nearby objects. Its survey mode also finds more contacts, at a power cost. |
| Instrument | **Particle Detector** | Records radiation storms. Cheap to run, and useless on a quiet week. |
| Instrument | **High-Energy Detector** | Records X-rays and gamma rays: solar flares and distant explosions. |
| Protection | **Radiation Shielding** | Always on. Takes a little off every radiation hit. |
| Protection | **Magnetic Shield** | Switched on for one turn. Blocks a lot, and drains the battery fast. |
| Mobility | **Thrusters** | A limited number of burns per flight. A burn moves you in close for one turn, or lets you chase a second contact. |
| Utility | **Flight Computer** | Shows what the coming turns will bring, so you can plan power. |
| Utility | **Antenna** | Sends more of your data home. Raises research points earned. |
| Utility | **Repair Drone** | One use per flight. Restores hull. |
| Crew | **Crew Capsule** | Shown locked, "in development". See section 14. |

- **Passive modules** work all the time and cost no power: solar array, battery, radiation shielding, flight computer, antenna.
- **Active modules** do something only on the turn you switch them on, and cost power each time: every instrument, the magnetic shield, thrusters, the repair drone.

### 6.3 What we deliberately leave out: a random hand

In most deck builders you draw a few random cards each turn. Here, every installed module is available every turn.

- **Reason:** a spacecraft does not forget it has a camera. The thing that is scarce in orbit is power, so power is what limits a turn.
- **What replaces the luck of the draw:** the events. You never know exactly what the next leg will offer.
- **Alternative if playtests feel flat:** active modules need one turn to cool down after use. This is in the spec as an option, off by default.

## 7. A flight

### 7.1 The week

Before building, you pick a **week**: a real span of dates. The game shows a forecast taken from the real records, for example:

> **8–14 May 2024.** 2 solar storms, the stronger at the top of the scale. 7 asteroid flybys. 4 planets crossing their stars.

The forecast is what you design against. This is the mission-design moment.

### 7.2 Legs

A flight is **six legs**. Each leg is a day or two of the week. The spacecraft's lifetime is those six legs.

On each leg:

1. **The scanner shows two contacts.** Each contact card shows what it is, how long it stays, what it would take to record it, and how dangerous it is.
2. **You pick one,** or you hold position and recharge.
3. **You play the encounter,** turn by turn.

Some contacts show only as **Unknown contact**. They are often the rare, valuable ones. You can approach blind, or run the radar's survey mode, which costs power, identifies unknowns and adds a third contact.

### 7.3 An encounter

An encounter lasts three to five turns: the time the object is in view. Each turn:

1. **The battery charges** from the solar arrays, unless you are in Earth's shadow.
2. **You see this turn's conditions:**
   - **Signal:** how well instruments work this turn. An asteroid's signal peaks at closest approach.
   - **Radiation:** how much is about to hit you.
   - **Shadow:** whether the arrays are producing.
3. **You switch modules on.** Each costs power. The game shows what you will record and what damage you will take before you commit.
4. **You end the turn.** Instruments record. Radiation hits, less whatever your shields stop. What gets through damages the hull.

Each object has one or more **channels**, such as visible light, radar or spectrum. Each channel fills up as you record it. You can fill a channel only with the matching instrument.

**This is the rule the whole game hangs on: without the instrument, you cannot record it.** A radar target with no radar on board scores nothing on that channel, and the debrief tells you how much you missed.

### 7.4 Storms

A solar storm is not a contact you can decline. It is weather: it covers whole legs of the week, on its real dates, and you can see it coming on the flight track from the start.

- **On a storm leg, every turn carries the storm's radiation,** whatever you chose to observe.
- **Radiation Shielding takes the edge off.** It will not stop the peak of a major storm.
- **The Magnetic Shield will,** at a power cost that means not running an instrument that turn.
- **A storm is also science.** The Particle Detector records the most on exactly the turns that hurt the most.

That is the central decision of a storm turn: shield, record, or split what power you have.

### 7.5 Ending

- **The spacecraft completes its sixth leg:** you bank all the research points.
- **The hull reaches zero:** the spacecraft is lost. You keep half, for the data that was already sent home.

## 8. What you meet, and where it comes from

Every event card is a real record. Its real numbers set how it plays.

| Event | NASA source | Real numbers used | What they change in play |
|---|---|---|---|
| **Asteroid flyby** | NASA/JPL close-approach data (Center for Near-Earth Object Studies) | Size, speed, miss distance, date | Fast means fewer turns. Close means a stronger signal and a radar channel. Large means more to record. |
| **Solar storm** | Space weather database (DONKI): geomagnetic storms, particle events, flares | Storm strength on the Kp scale, dates | Strength sets the radiation each turn. Dates set which legs it covers. |
| **Planet crossing its star** | NASA Exoplanet Archive | How the planet was found, star brightness, planet size | The discovery method decides the instrument: a camera for a transit, a spectrometer for a star's wobble. |
| **Rare event** | Hand-picked, each with a NASA page | Date, type | High-value contacts: a gamma-ray burst, a visitor from another star, a spacecraft hitting an asteroid on purpose. |
| **Crossing the South Atlantic Anomaly** | A real region of stronger radiation in low Earth orbit | — | A small radiation hit on some turns, even on a quiet week. |

After you record an object, its card shows one line on what was really learned from it, and a link to the source.

### 8.1 The weeks

Each week is a real span of dates chosen because something happened in it. Three ship first.

| Week | What happened | Plays as | Unlocks at |
|---|---|---|---|
| **July 2019** | Asteroid 2019 OK, up to 130 m across, passed at less than a fifth of the Moon's distance. Its name shows it was found that same fortnight. | A calm first flight about asteroids. | Start |
| **September–October 2022** | NASA's DART spacecraft struck the asteroid moonlet Dimorphos. Two weeks later came the brightest gamma-ray burst on record. | Rare events and timing. | Rank 2 |
| **May 2024** | The strongest geomagnetic storm in two decades. | The hard week. Shields decide it. | Rank 4 |

Two more are candidates if time allows: February 2013 (asteroid Duende passed on the same day as the Chelyabinsk fireball) and September–October 2017 (major flares, and the first known interstellar object).

Dates and figures are confirmed against the data when it is downloaded. Two are confirmed already: 2019 OK on 25 July 2019 at 71,355 km and 24.5 km/s, and the May 2024 storm reaching the top value of 9 on the Kp scale.

## 9. Between flights

### 9.1 Debrief

- **Research points earned,** by object.
- **What you missed and why.** For example: "Three radar targets passed and you had no radar: 46 points missed." This is the game's teaching moment, and it tells the player what to buy next.
- **Rank progress.**
- **New entries in the logbook.**

### 9.2 Lab

Spend research points to unlock a new module, or the next mark of one you own. Rank decides what the lab offers.

### 9.3 Rank

| Rank | Unlocks |
|---|---|
| 1 | The small spacecraft, the July 2019 week |
| 2 | The 2022 week, more modules in the lab, Mk II |
| 3 | The medium spacecraft: more budget, bay space and hull |
| 4 | The May 2024 week, Mk III |
| 5 | The large spacecraft |
| 6 | Further destinations, shown as "in development" |

Rank is why XP exists. Research points measure what you can afford. Rank measures how far the programme lets you go, and it cannot be bought.

### 9.4 Logbook

Every real object you have recorded, with its picture, its numbers, what was learned and a link. A fully recorded object gets a gold mark. The logbook is the collection the player fills in over many flights.

## 10. What makes it fun

Each of these was missing from the first build.

| The first build | This game |
|---|---|
| Every decision was made before launch | You decide something every turn of the flight |
| The result was fixed when you pressed Launch | The result depends on how you spend power, turn by turn |
| One right answer per mission | Different weeks reward different spacecraft |
| Failure came from dice | Storms are forecast. If one kills you, you chose not to pack or not to raise the shield. |
| No reason to play twice | Each flight buys hardware that opens new options |

The moments we are building for:

- **The storm turn.** Radiation is about to peak, the detector would record its best data, and there is power for one of the two.
- **The close pass.** Signal doubles for one turn. You saved the battery for it, or you did not.
- **The unknown contact.** Something rare may be out there. Scanning costs power you may need later.
- **The debrief line.** "You had no radar." The player goes straight to the lab.

## 11. What the player learns

- **Instruments are chosen for a mission.** Nothing records everything.
- **Power is a budget.** Arrays make it, batteries hold it, and shadow takes it away.
- **Protection costs mass, volume and power** that could have been science.
- **Space weather is real, forecast, and dated.**
- **Asteroids pass close more often than people think,** and how well we can study one depends on speed and distance.
- **Planets around other stars are found by different methods,** and each method needs a different instrument.

## 12. How it looks

The direction from the first build stands: you are in orbit, the Earth is photographic, the interface is dark and quiet, and one gold accent means "yours".

- **Event cards are photographs.** Each carries a real NASA image, with a caption strip like a photo log: date, catalogue name, credit.
- **Module cards are data plates.** Black, with a fine line drawing of the hardware and its numbers stamped in. Mk III gets a gold edge.
- **The Earth turns behind everything.** It is reused from the first build.
- **The spacecraft is assembled from what you installed,** and visible in the hangar.
- **A storm changes the scene:** aurora on the night side, and streaks across the view.
- **No decoration that carries no information.** No glass panels, no gradient buttons, no emoji.

## 13. Scope for the deadline

Submission closes Sunday 15 November 2026 at 23:59.

| Must | Should | Later |
|---|---|---|
| Hangar with budget and bay limits | Third week (May 2024) | More destinations: Moon, Mars, Jupiter |
| Turn-by-turn flight, six legs | Spacecraft model built from modules | Crew |
| 10 modules, three marks each | Storm visuals | Software patches during a flight |
| Two weeks from real data | Thrusters, Antenna, Repair Drone | Shared flight codes to race a friend |
| Research points, lab, rank | Turkish | Debris as a second hazard |
| Debrief with "what you missed" | Phone layout | Sound |
| Logbook and sources screen | First-flight hints, saving mid-flight | |
| Saved progress | | |
| English | | |

## 14. Later ideas

- **Crew.** A Crew Capsule sends astronauts to investigate an unknown contact in person. They record far more, and they have a radiation dose limit, so shielding stops being optional.
- **Destinations.** The Moon, Mars, the asteroid belt and Jupiter. Sunlight falls with distance, so solar arrays weaken and a nuclear power source becomes a card. Jupiter's radiation is constant.
- **Software patches.** After some legs, mission control uplinks a patch: pick one of three small boosts for the rest of the flight.
- **Flight codes.** Share a code so a friend flies the same week with the same events, and compare scores. No server needed.
- **Debris.** A second hazard with its own shield, so protection becomes a choice between threats.

## 15. Decisions made here, to confirm

These were open in the original idea. Each has an alternative if the team disagrees.

| Decision | Chosen | Alternative |
|---|---|---|
| Random hand each turn? | No. All modules are available; power limits you. | Cooldowns on active modules. |
| What is a run? | One spacecraft's life: six legs through one real week. | A longer campaign across several weeks with one spacecraft. |
| How do you configure a card? | Pick its mark, I to III, paid from the flight budget. | Separate sliders per module. More to build and to balance. |
| What is XP? | Rank: lifetime research points. | Remove it, and gate content on research points spent. |
| Can storms be avoided? | No. They are forecast and cover whole legs. | Storms as optional contacts. Then shields are never needed. |
| What happens when the spacecraft is lost? | You keep half the research points. | Keep nothing. Harsher, and worse for a first-time player. |
| Team play? | Not for the deadline. | Shared flight codes, listed under later ideas. |

## 16. Rules the submission must follow

- **Declare AI use,** in the project description and in the repository.
- **No NASA logos, flags or mission insignia** on anything we generate. Real NASA photographs are used as photographs, with credit, and never to suggest NASA endorses the game.
- **At least one NASA data source.** The game uses four.
- **Every link opens without a login.**
- **The demo is a video of 30 seconds or less,** or seven slides.
