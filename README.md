# Artemis 26

A space mission design game for the 2026 NASA Space Apps Challenge, built in Ankara. It is a challenge entry, not an official NASA product.

The design, data and scope plan are in [proposal.md](proposal.md). The visual direction, and the list of patterns to avoid, is in [DESIGN.md](DESIGN.md). Read it before changing any UI.

## Run

```bash
npm install
npm run dev
```

`npm test` runs the engine tests. `npm run build` produces a static site in `dist/`.

## Team rooms

Without Firebase config, rooms use `LocalRoomSync`. It syncs between tabs of one browser, which is enough for development.

To make rooms work across phones:

1. Create a Firebase project.
2. Enable the Realtime Database.
3. Deploy `database.rules.json` to it.
4. Copy `.env.example` to `.env.local` and fill in the project's values.

## Layout

| Path | Contents |
|---|---|
| `src/Engine/Catalog` | Launch vehicles, orbits, instruments, buses and scenarios, with source links |
| `src/Engine/Models` | Mass, power, data, cost and lifetime budgets |
| `src/Engine/Simulation` | `MissionSimulator`, seeded random events, `FailureTracer`, star rating, design sampler, mission ranking and the strategy finder used by the balance tests |
| `src/Sync` | `RoomSync` with Firebase and local implementations, plus `TeamSession` |
| `src/State` | Zustand game store and saved mission patches |
| `src/I18n` | English and Turkish strings |
| `src/World` | The persistent 3D scene behind every screen (three.js), loaded on demand |
| `src/Interface` | Screens, controls, readouts and team panels drawn over the scene |

The engine is pure TypeScript with no React or browser dependencies. `MissionSimulator.run({ scenario, design, seed })` is deterministic, so every device in a room computes the same flight.

## Credits

Earth day, night and cloud images in `public/Textures` are from [Solar System Scope](https://www.solarsystemscope.com/textures/), based on NASA imagery, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The files were taken from the three.js examples, where they were resized and merged.
