# Artemis 26 visual direction

Read this before changing any UI. It exists so the game keeps one identity, whoever (or whatever) writes the next screen.

## The idea: clean room, then space

- **You build in the clean room.** Spacecraft are assembled in bright white rooms, so the menu, build, host and phone screens are light: cool white, ink text, hairline rules.
- **You fly in space.** Launch plays an ascent from sky blue to black. The flight and mission report screens are true black.
- **The spacecraft is the hero.** A drawing of the player's actual design sits at the centre of the build screen and changes with every choice. The interface around it stays quiet.

## Palette (every colour comes from the subject)

| Token | Hex | Role |
|---|---|---|
| `--CleanRoom` | `#F3F5F6` | Light background |
| `--Ink` | `#12161B` | Text and primary buttons on light |
| `--Foil` | `#C8962E` | Gold thermal blanket: spacecraft body, sunlit orbit, selection marks |
| `--Cell` | `#27307E` | Solar-cell indigo: arrays only |
| `--Earth` | `#3B7DD8` | Earth's day side, links |
| `--Go` / `--Caution` / `--NoGo` | `#1E9E5A` / `#D98A00` / `#D62839` | Budget status and votes, never decoration |

## Type

- **Jost** for everything. It is an open Futura, and Futura is the lettering on Apollo-era NASA hardware.
- Sentence case. Capitals only for the literal words GO and NO-GO.
- Numbers use tabular figures and always carry a unit.

## Rules

1. Every picture is data. The spacecraft, the orbit diagram and the rockets are drawn from the design and the catalog, to scale. Nothing is decorative.
2. Show quantities, not just percentages: `1,456 of 2,300 kg`.
3. Choices are visible rows with their trade-offs, not dropdowns.
4. Status is always a shape plus a word plus a colour.
5. Motion answers the player: gauges move when a choice changes. The set pieces are the ascent, the flight and the Failure Trace rewind.

## 3D and rewards

The player has to get something back for the ten minutes they spend designing.

- **The spacecraft is a 3D model** built from the same data as the flat drawing. It turns in the clean room and then flies in the mission.
- **The flight is a 3D scene.** A chase camera follows the spacecraft over the Earth, then pulls back for the finale.
- **Science is visible.** Every pass paints a gold track on the globe. A mission that meets its goal covers the Earth in gold; a weak one leaves it mostly bare.
- **Success earns a mission patch** that is kept on the start screen. Three stars earns a gold border.
- **The Earth is drawn, not photographed.** Blue ocean, off-white land, ink coastlines, in the same palette as the rest of the game. No photoreal textures, lens flares or bloom.
- The 3D code is in `src/UI/Scene`. It loads only when needed, and the flat drawings in `src/UI/Visuals` are the fallback when WebGL is missing.

## Banned (the usual generated-UI tells)

- Dark navy with one neon accent, purple or blue gradients, gradient text, glow, glass blur.
- Grids of identical rounded cards, the same radius and shadow on everything, cards inside cards.
- All-caps tracked labels above headings, `A · B · C` meta strings, arrows glued to button text, monospace for small labels.
- Fade-and-slide-up on every element, count-up numbers, bounce easing.
- Pills around static text, emoji as icons, invented statistics.
- Inter, Roboto, Orbitron or any "sci-fi" display face.
