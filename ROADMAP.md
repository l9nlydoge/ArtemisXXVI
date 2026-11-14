# Artemis 26 roadmap

Written Saturday 14 November 2026, 15:00 Ankara time.

**Submission closes Sunday 15 November at 23:59 local time** ([Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)). That leaves about 33 hours on the clock and roughly 20 working hours. This plan aims to **submit by Sunday 21:00**, with a **feature freeze at Sunday 17:00**. Check with your Local Lead whether Ankara's local judging has an earlier deadline.

## 1. Where it stands

The engine is sound and the flight looks good. Almost everything around them is half-finished, and the site has two unrelated looks.

**Works today**
- Mission model: mass, power, data, cost and lifetime budgets, seeded random events, Failure Trace, star rating. Seven engine tests pass.
- Solo loop from start screen to mission report, for two scenarios.
- Photographic 3D flight with a detailed spacecraft built from the player's design.
- Mission patches earned on success.
- English and Turkish interface text.

**Half-done or rough**

| Area | What is wrong |
|---|---|
| Theme | The start, build, host and phone screens are white "clean room". The flight and report are black space. It reads as two different sites, and the white half does not say "Artemis". |
| Start screen | A title and a list. No space imagery, no explanation of how to play, no loading state. |
| Build screen | The 3D spacecraft sits in a small white box. The orbit picture next to it is still a flat diagram. Nothing teaches a first-time player what to do. |
| Launch | A flat rocket outline sliding up a colour fade. It is the weakest moment between two strong ones. |
| Flight | Events are only text. A solar storm, a micrometeoroid hit or a dead battery look the same on screen. A lost spacecraft just tumbles. A destroyed instrument stays on the model. |
| Mission report | A long page of text. The Failure Trace, the game's signature idea, is a plain list. |
| Team play | Rooms only sync between tabs on one computer until Firebase is set up. Secret objectives, the mid-design requirement change and the manager's override are not built. Never tested with phones or with the 3D flight. |
| Game depth | Only two scenarios. Balance is untested. One unlucky event can kill a mission in its first year. The L2 orbit is selectable but useless in both scenarios. |
| Validity | No in-game sources screen, so judges cannot see where the numbers come from or which are estimates. |
| Turkish | Menus are translated. Catalog names, mission facts and several hints are still English. |
| Checking | Only one spacecraft design has been looked at in 3D. Phones, slow laptops and frame rate are unverified. |

**Missing entirely**
- A public link. There is no GitHub remote and no deployment.
- The demo, the project page text and the required disclosures.
- Share-by-link loading, the "you beat X% of missions" chart, a leaderboard, sound.

## 2. What "done" means

A judge opens one link and, with no instructions:

1. Sees the Earth from orbit and understands this is a mission design game called Artemis 26.
2. Is walked through a first mission in under three minutes.
3. Watches their own spacecraft launch and fly.
4. Is shown exactly why it failed, fixes it, and succeeds.
5. Can check every number against its source.

The same link works on a phone, and four phones can join one room.

## 3. One space theme

This replaces the "clean room, then space" idea in `DESIGN.md`.

- **One world behind everything.** A single 3D scene (Earth, stars, the spacecraft) stays on screen from the start page to the report. Screens change the camera and the panels on top, and the page never cuts to white.
  - Start screen: a slow orbit over the Earth, with the title and missions over it.
  - Build screen: the spacecraft large in the foreground with the Earth behind it, controls in a panel at the side.
  - Launch and flight: the same scene, with the camera moving.
  - Report: the final frame held behind the report.
- **Dark interface on true black.** Thin panels with hairline borders, Jost type, gold-foil accent, and green, amber and red only for status.
- **Still no generated-UI clichés.** No neon, no gradients, no glow on controls, no glass blur. The photography carries the look, and the interface stays quiet.

## 4. The plan

"Build" tasks are code. Ask Claude for them one phase at a time. "You two" tasks need a person.

### Phase 0: Unblock (Saturday 15:00 to 16:00, you two)

| Task | Done when |
|---|---|
| Create a GitHub repository and push `main` | The code is online |
| Deploy to GitHub Pages or Netlify | A public link opens the game |
| Create a Firebase project and fill in `.env.local` | Two phones on mobile data join one room |
| Delete `src/UI/Components/BallotBoard.tsx` and the five merged branches | `git branch` shows only `main` |
| Ask the Local Lead about local judging times | You know the real deadline |
| Request a FortiGuard web-filter classification for the deployed link (the guide recommends it) | Request sent |

### Phase 1: One space theme (done Saturday 14 November)

The interface was rebuilt from scratch on top of one persistent 3D scene. The engine, team sync and 3D models were kept.

| Task | Hours | Done when |
|---|---|---|
| Rewrite `DESIGN.md` for the single space theme | 0.5 | Old clean-room rules are gone |
| Keep one 3D scene alive behind every screen | 1.5 | No white screen and no scene reload between pages |
| Start screen over the live Earth | 0.5 | Title, missions and patches sit over the orbit view |
| Build screen with the spacecraft in the foreground and a side panel | 1 | The spacecraft fills at least half the screen |
| Dark panels, buttons, tables and gauges | 0.5 | Every screen uses the same tokens |
| Loading screen while the Earth images arrive | 0.25 | No blank or popping globe |
| Browser tab icon and link-preview image | 0.25 | The link looks right when pasted in chat |

### Phase 2: Finish the core loop (Saturday 20:00 to 24:00, build)

| Task | Hours | Done when |
|---|---|---|
| Guided first mission: a starter design that fails for one clear reason, with three prompts | 1 | A new player launches, fails and fixes it without help |
| 3D launch: the rocket leaves the ground and the camera follows it to orbit | 1.5 | No flat outline; the launch cuts straight into the flight |
| Events you can see: storm flash, impact, instrument gone from the model, arrays dimming | 0.75 | Each event looks different |
| Failure you can see: dark and drifting for a dead battery, glowing re-entry for a decayed orbit | 0.5 | The cause is visible before the text says it |
| Failure Trace as an animated chain over the frozen flight | 0.75 | The chain draws link by link back to "you chose" |

### Phase 3: Fair, deep and checkable (Sunday 09:00 to 12:00, build plus one of you playing)

| Task | Hours | Done when |
|---|---|---|
| Balance pass with the random-design sampler | 1 | At least three different strategies win each scenario |
| Fairness: no mission-ending random event in year one on Normal | 0.25 | A sound design never dies to luck early |
| Sources screen: every number, its link, and an "estimated" label | 0.75 | Reachable from the start screen and the report |
| "You beat X% of possible missions" chart on the report | 0.75 | Shown after every flight |
| Hide the L2 orbit, or add the Deep Sky telescope scenario | 0.25 or 1.5 | No option is useless |

### Phase 4: Team play (Sunday 12:00 to 15:00, build plus both of you with phones)

| Task | Hours | Done when |
|---|---|---|
| Play a full room with four real phones | 0.5 | Join, edit, vote, fly, report, redesign all work |
| Phone layout with the 3D scene | 0.5 | Nothing is cut off on a phone held upright |
| Secret objective per role | 1 | Each phone shows one, and the report says who met theirs |
| Manager override that costs a star | 0.5 | The report names the overridden NO-GO |
| Rejoin after a refresh or a locked phone | 0.5 | The seat comes back |

### Phase 5: Quality sweep (Sunday 15:00 to 17:00, all hands)

| Task | Done when |
|---|---|
| Look at every bus, instrument, antenna, array type and shielding option in 3D | No broken or floating parts |
| Check the geostationary orbit, and L2 if it stays | The camera and the tracks make sense |
| Finish Turkish: catalog names, mission facts, hints | No English left in Turkish mode |
| Try a slow laptop and a mid-range phone | Playable, with quality dropping by itself |
| Keyboard use, reduced motion, and a device without WebGL | The game still works |
| Remove dead code and fix what the sweep finds | Build and tests pass |

**Feature freeze: Sunday 17:00.** Only bug fixes after this.

### Phase 6: Submit (Sunday 17:00 to 21:00, you two)

| Task | Done when |
|---|---|
| Record the demo. The guide allows a video of 30 seconds or less, or a 7-slide deck. Use the video: ripple, launch and Failure Trace, then phones voting GO | Uploaded with a public link |
| Write the project page: name, summary, detailed description, tools used | Saved on the project page |
| List the NASA data and resources used. At least one is required for a Global Award | Listed with links |
| List all other references, including the Earth images and their licence | Listed |
| Answer the "Use of Super Intelligence" question honestly (see section 6) | Answered |
| Open every link in a private window | All open with no login |
| Submit | Confirmation seen by 21:00 |

## 5. If time runs out, cut in this order

1. Deep Sky scenario (hide L2 instead).
2. Manager override.
3. Secret objectives.
4. "You beat X%" chart.
5. 3D launch (restyle the current ascent to match the dark theme).
6. Visible events in flight.

Do not cut: the single space theme, the guided first mission, the balance pass, the sources screen, the real-phone test, or the three hours for submission.

## 6. Rules that affect us

From the [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/):

- **AI use must be declared, and marked in the work itself.** The guide calls it "Super Intelligence". Code must acknowledge it in descriptive text and metadata; images and video need a visible watermark.
  - Our commits already carry a co-author line, which is metadata.
  - Add a plain statement to the README and the project page.
  - Watermark the demo video if any frame of it is AI-generated imagery. In-game 3D rendering is code output, so describe it in text.
- **AI should not be used to come up with the idea.** The guide says so directly. The concept in `proposal.md` was drafted by Claude from your brief. You two need to decide how you describe the idea's origin, and describe it truthfully.
- **No NASA branding in generated content:** no logos, flags or mission identifiers. The mission patches are drawn by code, so keep them clear of any real NASA or Artemis insignia. The name "Artemis 26" is your choice of project name; the start screen already says the game is not an official NASA product.
- **At least one NASA data source or resource** is needed for Global Award eligibility. We use NASA's small-spacecraft technology report, the GSFC margin rules, and NASA, USGS and NOAA mission pages. The sources screen in Phase 3 makes this visible.
- **Every link must open without a login.**

## 7. Risks

| Risk | What to do |
|---|---|
| The persistent 3D scene takes longer than 1.5 hours | Fall back to a dark theme with a still Earth image behind the menus |
| The 3D is slow on judges' machines | Phase 5 slow-laptop test; quality already drops automatically; add a "simple graphics" switch if needed |
| Firebase or venue Wi-Fi fails | Record the team demo early on Sunday on a good connection |
| Balance work reveals the scoring is broken | Fix the estimated numbers only, never the sourced ones |
| The submission is rushed | The 17:00 freeze is fixed |

## 8. Decisions needed from you

1. Is the single space theme in section 3 what you meant by "fit a space theme"?
2. Hide L2, or spend 1.5 hours on a third scenario?
3. Video or slides for the demo?
4. How will you describe the idea's origin and the AI use on the project page?
