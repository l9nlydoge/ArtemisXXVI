# Space Apps submission text

Paste-ready text for the project page, one field per heading. Replace `PLAY_URL`, `REPO_URL` and `VIDEO_URL` before pasting. Numbers are taken from the code and the data snapshot as of this commit.

## Project name

Artemis 26

## High-level summary

A pixel-art browser game: design a small science spacecraft within a budget, fly a real week of NASA-recorded asteroids and solar storms, and learn what you should have packed.

## Detailed project description

Artemis 26 is a mission design game that runs in a browser, with no install and no login.

What it does. The player chooses one of three real weeks: July 2019, September to October 2022, or May 2024. Each week comes with a forecast of what is coming: asteroid passes, storm legs, distant planets and unknown contacts. In the hangar the player fits a spacecraft from module cards, such as solar arrays, batteries, a camera, a spectrometer, radar, particle and high-energy detectors, radiation shielding, a magnetic shield and a flight computer, within a fixed budget and a fixed bay. Then the spacecraft launches and flies six legs through that week. On each leg the player approaches one contact and spends three to five turns recording it, switching instruments on against a limited power supply, with 30 seconds per turn. Each instrument records one kind of data, so an asteroid that only radar can measure, or a storm that carries X-rays, is lost to a spacecraft that did not bring the matching instrument. Storms bring radiation; if the hull runs out the spacecraft is lost.

How it works. Every asteroid pass, storm, particle event, flare and planet comes from a NASA record downloaded once and shipped with the game: 77 asteroid passes from NASA/JPL's close-approach data, 5 storm legs built from DONKI's geomagnetic storm, particle and flare records, and 11 planets from the NASA Exoplanet Archive. Two hand-written events, the DART impact and gamma-ray burst GRB 221009A, are checked against NASA pages. Nothing is fetched while playing. The engine is deterministic TypeScript with 314 automated tests, including balance targets played by bots on the real weeks.

Benefits. The game turns real space data into decisions. A player learns that instruments, power and protection compete for the same money and volume, that a forecast should shape the payload, and that a storm such as May 2024's changes what a spacecraft must carry. The debrief names what was missed and which module would have recorded it, so the next design improves for a reason the player can see.

What we hoped to achieve. A short, honest game a student can finish in minutes and replay, where every number about the sky is real and labelled. Asteroid sizes are marked as estimates, representative pictures are marked as representative, and the game says plainly that its costs and power figures are game values, not engineering figures.

Tools and languages. TypeScript, React, Zustand and Vite, with Vitest for tests; Node.js scripts for the NASA data download; Python with Pillow for the pixel art; the Web Audio API for synthesised sound; Claude through Claude Code for AI-assisted production. It deploys as static files.

## How the project addresses the challenge

The challenge asks for a game that teaches how space missions are designed. Artemis 26 makes the player do a small version of that work. They choose instruments to match what the mission is expected to meet, using a forecast built from real data. They trade capability against a fixed budget and a fixed bay: the starting spacecraft is full, so every new module replaces another. They manage power during the flight, because instruments draw from a battery that only recharges in sunlight, and they weigh recording against protection when a storm leg arrives. After each flight the debrief shows the points each missing instrument cost, and the lab lets them buy it, so the design improves flight by flight. The three weeks ask for different spacecraft: radar for the close asteroid passes of July 2019 and autumn 2022, a high-energy detector for the gamma-ray burst, and shielding for the great storm of May 2024. What is simplified is stated in the game: costs, capacities and power figures are chosen for play.

## Space agency data used

- NASA/JPL Center for Near-Earth Object Studies, SBDB Close-Approach Data API and Small-Body Database API: every asteroid pass, with date, speed, miss distance, estimated size, hazard flag and the dates the asteroid was first and last observed. https://cneos.jpl.nasa.gov/ca/ and https://ssd-api.jpl.nasa.gov/doc/cad.html
- NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI), Community Coordinated Modeling Center: geomagnetic storms with Kp readings, solar energetic particle events and M and X class flares, kept only when detected near Earth by GOES, SOHO or ACE. https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA Exoplanet Archive, Planetary Systems Composite Parameters: eleven planets, with discovery method, year, facility, distance and radius. https://exoplanetarchive.ipac.caltech.edu/
- NASA Image and Video Library: eight images (PIA00136, PIA00119, PIA02900, iss074e0150531, PIA21949, PIA21429, PIA20687, PIA25329) redrawn as pixel art, plus NASA's image of GRB 221009A from its article on the burst. https://images.nasa.gov/
- NASA pages used to check the hand-written events: https://science.nasa.gov/mission/dart/ and https://www.nasa.gov/universe/nasa-missions-study-what-may-be-a-1-in-10000-year-gamma-ray-burst/

All data was retrieved on 14 November 2026. Every source is listed in the game's Sources screen with its retrieval date, an example request and links.

## References and resources

- Earth imagery: Solar System Scope textures, CC BY 4.0. https://www.solarsystemscope.com/textures/
- Font: Jersey 10, Google Fonts, SIL Open Font License 1.1.
- Software: TypeScript, React, Zustand, Vite, Vitest, Pillow.
- The challenge's own resource list (read 14 November 2026) is reproduced on the game's Sources screen for reference. The game's data does not come from it.
- The game uses public NASA data and imagery. It is not affiliated with or endorsed by NASA, and uses no NASA logo, insignia or mission patch.

## Demo

VIDEO_URL

## Project link

Play: PLAY_URL

Repository: REPO_URL

## Use of AI

The idea and the gameplay loop are the team's own: a deck-building spacecraft game where you fit modules, fly a real week and record real events. The team designed the game and directed every step. The project is AI-assisted: the code (engine and interface), the interface design, the pixel art and the sound were produced with Claude under the team's direction. All mission data is real NASA data.

The tool was Claude, used through Claude Code; commits made with it carry a `Co-Authored-By: Claude` line. The pixel art is generated by scripts in the repository's `Tools/` folder and by drawing code in the game; the event pictures are redrawn from the NASA images named on the Sources screen. All sound is synthesised in the browser. The game shows an AI notice on its Home and Sources screens, and the demo video carries a visible AI-assisted mark.
