# Demo video script

The Space Apps rule: the demo is one video of 30 seconds or less (or a 7-slide deck), at a public link that opens without a login. AI-made video must carry a visible mark, and this project's art and sound are AI-assisted, so the whole video carries one (see "The AI mark" below).

Plan: record one continuous take of a May 2024 flight (about five minutes), then cut it to the six shots below. The prepared save makes every moment reachable in one flight.

## Setup

- **Browser:** Chrome or Edge, on the deployed game (`PLAY_URL`), not the dev server.
- **Size:** record the page at 1280 x 720. The easiest way: DevTools (F12), device toolbar (Ctrl+Shift+M), "Responsive", 1280 x 720, zoom 100%, then close DevTools before recording, or set the window so the page area is 1280 x 720. Or record a full-screen 1920 x 1080 window; the game scales to it.
- **Sound on.** All sound is synthesised by the game. Check the speaker button in the bottom-left corner is not muted (M toggles it). Record system audio, not the microphone.
- **Recorder:** any screen recorder that captures one window with its audio (OBS, the Xbox Game Bar on Windows with Win+Alt+R, QuickTime on macOS).

## Prepare the save

This replaces the browser's progress for this site with a rank 3 profile (Mission Specialist): May 2024 open, the medium spacecraft, Radar, Magnetic Shield, Flight Computer and High-Energy Detector owned at Mk I, and the first-flight hints already seen. Open the game, press F12, choose Console, paste and press Enter. Chrome may ask you to type "allow pasting" first.

```js
localStorage.setItem('Artemis26.Profile.v1', JSON.stringify({ version: 1, points: 200, lifetimePoints: 400, flights: 3, logbook: {}, ownedMarks: { Radar: 1, MagneticShield: 1, FlightComputer: 1, HighEnergyDetector: 1 }, hintsSeen: ['Hangar', 'Scanner', 'Encounter', 'Radiation', 'Debrief', 'Lab'] }))
localStorage.removeItem('Artemis26.Flight.v1')
location.reload()
```

The page reloads on Home showing "Rank 3 Mission Specialist". To go back to a new player afterwards, clear the site's data (padlock icon, "Cookies and site data", delete) and reload.

## The AI mark

After the reload, paste this too. It puts a small line at the bottom centre of the page for the whole recording. It does not survive a reload, so paste it again if you reload.

```js
(() => { const mark = document.createElement('div'); mark.textContent = 'AI-assisted project: code, art and sound produced with Claude'; Object.assign(mark.style, { position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '2px', zIndex: 99999, font: '15px "Jersey 10", monospace', letterSpacing: '0.04em', color: '#eef3f7', background: 'rgba(7, 11, 26, 0.8)', padding: '1px 8px', pointerEvents: 'none', whiteSpace: 'nowrap' }); document.body.appendChild(mark) })();
```

If you edit the video in an editor instead, add the same line as a text layer over the full 30 seconds.

Both snippets were tested on the built game at 1280 x 720: the profile loads, May 2024 opens, and the line stays legible on Home, the hangar and an encounter without covering any control.

## Shot list (30 seconds)

| Time | Shot | What to do while recording | Caption (optional) |
|---|---|---|---|
| 0–3 | Home | Hold on Home: the title, the pixel Earth, "Rank 3 Mission Specialist". | Design a spacecraft. Fly a week that really happened. |
| 3–8 | Hangar | Click "Fly a mission", then "Build for this week" under "The great storm" (May 8 – May 13 2024). In the module list, click "Fit Mk I" on Magnetic Shield. Bay space goes from 8 to 10 of 12; keep "Cannot record: X-rays and gamma rays" in view. Do not fit the High-Energy Detector. | Fit instruments and shields within budget and bay space. |
| 8–13 | Launch | Click "Launch". Keep five seconds of the pad, the climb and the Earth falling away. | Launch into the week of 8 May 2024. |
| 13–20 | Encounter | Leg 1: click "Approach" on an asteroid. Press 1 and 2 (Camera, Spectrometer), let the 30-second timer run a few seconds, then click "End turn" (or press Enter). Keep the asteroid crossing behind the spacecraft and the data bars filling. | Every asteroid is a real pass computed by NASA/JPL. |
| 20–25 | Storm | Leg 2: click "Hold and recharge" (cut this). Leg 3, 10 May: click "Ride out the storm". Turn 1: press 3 and 4 (Particle Detector, Magnetic Shield), Enter. Turn 2: press only 3, Enter, to show the radiation hit and the hull dropping. | 10 May 2024: Kp 9, the strongest storm in two decades. |
| 25–30 | Debrief and lab | Play the remaining legs off camera (on legs 4 to 6 approach a contact; use the shield on storm legs). Click "See the debrief": hold on "What you missed: No High-Energy Detector". Click "Go to the lab". | Learn what you should have packed, then build again. |

Notes:

- The contacts on leg 1 change from flight to flight; any asteroid works. On leg 3 the storm is always there.
- The storm legs are 10, 11, 12 and 13 May. Hold is not allowed on them, so legs 4 to 6 must be played. Using the Magnetic Shield on each storm turn keeps the hull alive in most flights; if the spacecraft is lost, the debrief still shows "What you missed", so the shot works either way.
- In our test flight with this save and this loadout, the debrief read "No High-Energy Detector: 135 points missed, in 4 of your encounters".
- Keep the turn timer visible in the encounter shot; it is part of the game.

## Upload

Upload to YouTube (Public or Unlisted; both open without a login) or another host that plays without signing in. Check the link in a private window, then put it in the project form as `VIDEO_URL`.
