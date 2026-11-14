# Artemis 26 visual direction

Read this before changing any UI. It exists so the game keeps one identity, whoever (or whatever) writes the next screen.

## The idea: you are in orbit the whole time

- **One world behind everything.** A single 3D scene (the Earth, the stars, your spacecraft) stays on screen from the start page to the mission report. It never reloads and the page never cuts to a blank colour.
- **Screens are camera shots plus panels.** Changing screen moves the camera and swaps the panels on top.

| Screen | Shot |
|---|---|
| Start | Following a real spacecraft (the ISS by default), or low orbit along the horizon |
| Build, host, phone console | The spacecraft in the foreground in sunlight, the Earth behind it. Drag to turn it. |
| Flight | Chase view behind the spacecraft, then the whole Earth for the finale |
| Report | The whole Earth held to one side, dimmed behind the report |

- **Space is photographic; the interface is quiet.** The Earth uses real day, night and cloud imagery. The spacecraft is a detailed model built from the player's design. Panels are plain and dark so the scene carries the look.
- **Real neighbours share the sky.** The ISS, Hubble, Landsat 9, a GOES weather satellite and the Webb telescope fly on their real orbits, built from the same parts kit as the player's spacecraft. The start screen follows one of them, and they are labelled during the flight.
- **The player gets something back.** Science shows as faint gold ground tracks on the globe, and a successful mission earns a mission patch.

## Palette

| Token | Value | Role |
|---|---|---|
| `--Space` | `#000000` | Page background. True black, never tinted. |
| `--Panel` | black at 86% | Panels over the scene. No blur. |
| `--Line` | white at 15% | Hairline borders and dividers |
| `--Text` / `--Muted` | `#F3F5F6` / `#A6B0BB` | Text |
| `--Foil` | `#E8A838` | Gold thermal foil. The one accent: selection marks, the launch button, "you chose" in the Failure Trace. |
| `--Go` / `--Caution` / `--NoGo` | `#3ECF85` / `#F5AE2B` / `#FF5263` | Budget status and votes only, never decoration |

## Type

- **Jost** for everything. It is an open Futura, and Futura is the lettering on Apollo-era NASA hardware.
- Sentence case. Capitals only for the literal words GO and NO-GO.
- Numbers use tabular figures and always carry a unit.

## Rules

1. Every picture is data. The spacecraft, its orbit, the rockets and the ground tracks are drawn from the design and the catalog.
2. Show quantities, not just percentages: `1,456 of 2,300 kg`.
3. Choices are visible rows with their trade-offs, not dropdowns.
4. Status is always a shape plus a word plus a colour.
5. Panels sit at the edges. Keep the middle of the screen clear for the spacecraft.
6. Motion answers the player. The set pieces are camera moves: the pull-in to the spacecraft, the launch, the flight and the Failure Trace.
7. Glow is only for things that really are bright (the Sun, glints off metal).

## Banned (the usual generated-UI tells)

- Tinted "space navy" backgrounds, neon accents, purple or blue gradients, gradient text.
- Glow, glass blur or drop shadows on panels and controls.
- Grids of identical rounded cards, cards inside cards.
- All-caps tracked labels above headings, `A · B · C` meta strings, arrows glued to button text, monospace for small labels.
- Fade-and-slide-up on every element, count-up numbers, bounce easing.
- Pills around static text, emoji as icons, invented statistics.
- Sci-fi display faces such as Orbitron. HUD brackets, scan lines and hexagons.
- Lens-flare sprites and coloured fog.

## Where things live

| Path | Contents |
|---|---|
| `src/World` | The persistent 3D scene: camera shots, Earth, spacecraft model, and the real spacecraft in `Landmarks`. Loaded on demand. |
| `src/Interface` | Screens, controls, readouts, team panels and the flat diagrams used as a fallback without WebGL |
| `src/Styles/Space.css` | All styling and the tokens above |
| `public/Textures` | Earth imagery (see the README for credits) |
