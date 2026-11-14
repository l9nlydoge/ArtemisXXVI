# GO / NO-GO

A space mission design game for NASA Space Apps 2026. Team Artemis 26, Ankara.

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
| `src/Engine/Simulation` | `MissionSimulator`, seeded random events, `FailureTracer`, star rating, design sampler |
| `src/Sync` | `RoomSync` with Firebase and local implementations, plus `TeamSession` |
| `src/State` | Zustand game store |
| `src/I18n` | English and Turkish strings |
| `src/UI/Visuals` | The spacecraft, orbit and rocket drawings, generated from the design |
| `src/UI` | Screens and components |

The engine is pure TypeScript with no React or browser dependencies. `MissionSimulator.run({ scenario, design, seed })` is deterministic, so every device in a room computes the same flight.
