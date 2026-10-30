# City Limits

Night racing in and around a little desert town under a full moon: the town's streets and street lights,
the desert round it, and the salt flats past that, forever. A career (or free play) of challenges, jobs
for the town's people and a garage full of parts. No other cars on the road yet.

Open `dist/city-limits.html` in a browser with WebGL2 (a phone held sideways, or a laptop).

## What it's made of

- **Drawing:** Shiftlight 3's renderer (`src/render`, `src/render/glsl`) at its two lightest tiers only:
  **Mobile** (the phone default) and **Low** (the laptop default). Moon shadows in cascades, every street
  light in the cluster grid, headlights with a real low-beam cut-off, the reflection probe, haze, TAA with
  dynamic resolution, bloom and auto exposure. Low adds motion blur, a sharper probe and more haze steps.
- **Cars, physics, engines:** Dirt Sleeper HD's modules (`hd/`), joined into one ES module by
  `tools/build.mjs` (`build/hd.gen.js`). Four driving levels (Kids, Middle, Realistic, Sim), the
  Digital Engine's live synth for every engine, untouched, with Back Forty's "Fuller" tone after it and the
  "Like the bay" listener by default.
- **Car drawing:** `src/render/hdcar.js` and `glsl/hdcar.js` draw the Dirt Sleeper meshes in Shiftlight's
  light (every Dirt Sleeper material, mud, liveries, plus a glow strip and underglow).
- **The world:** `src/world/clmap.js` + `clcity.js` (Shift City's generator made small: 6 x 6 blocks inside
  Limits Boulevard, palms, no expressway), `terrain.js` (the desert on an 8 m grid that the mesh and the
  physics share, five roads with graded profiles, jumps, rock mounds, boulders, scrub, cacti, power lines,
  reflector posts, CITY LIMITS signs, a gas station and a diner), `flats.js` (Shiftlight's endless flats,
  starting at 1.65 km), `clworld.js` (all of it for the renderer and the physics).
- **The game:** `src/game/main.js` (loop, cameras, title, HUD, dust and smoke, the run and job screens),
  `env.js` (the full moon), `menu.js` (pause menu with the job and every challenge), `sound.js` (engine bus
  and the electric voice).

## Career, garage, challenges, jobs

- **Two modes** (`src/game/profile.js`, saved as `cl-career` and `cl-free`). Career: a stock SUV and
  $2,500; challenges and jobs pay; money buys parts and cars at the dealer (hatch $9,000, coupe $24,000,
  electric $32,000, wedge $42,000, hypercar $68,000; the last three open only through a job). Free play:
  every car and every part, the money is a score.
- **Garage** (`src/game/garage.js`): Dirt Sleeper HD's parts and ratings (`hd/56_parts.js`, `57_ratings.js`)
  with City Limits' own (`hd/58_clparts.js`): parts for the electric car (motors, inverters, software,
  reduction gears), the wedge (a 5.7 V12 stroker) and the hypercar (a 5.6 V10), tyres, rides and kits for
  each, night paints, and an underglow slot. Each car keeps one rig; what you buy stays bought. A part you
  don't own goes on for a look first, with the bill. Six ratings (dirt, gravel, mountain, rocks, mud, asphalt)
  and the figures, with what a change does.
- **Challenges** (`src/game/chaldefs.js`, `chalrun.js`): 14 round the town and the desert: Limits Loop, Main
  Avenue Quarter, Downtown Dash, Neon Row Drift, Salt Road Run, the Salt Road speed trap, Ridge Road Climb,
  Wash Road, Rim Trail North, Rim Trail Lap, The Bog, Boulder Field, Big Air, Flying Mile. Cyan columns of
  light mark the starts (gold once you hold the gold); stop in the ring to start, or pick one from the pause
  menu. Lit gates, an arrow to the next, medals. Medal times come from robots (`tools/par.mjs` writes
  `src/game/pars.js`): bronze a little slower than the stock SUV, gold a little slower than the build made
  for that ground.
- **Jobs** (`src/game/quests.js`): Marisol at the garage, Deke at the gas station, Rosa at the diner, Vince
  and the Neon Row crew, Old Hal out on the salt. 14 jobs in five strings: deliveries against the clock,
  finding things, medals they want to see. A light in their colour means they have work; the next place is
  green. Three of them open the electric car, the wedge and the hypercar.
- **Lights in the world** (`src/game/markers.js`): neon geometry the renderer draws as dynamic world meshes.

## The 13 cars

| Car | Builds |
| --- | --- |
| SUV | Stock (the 4.6 V8 truck), Sleeper, Rock & Mud |
| Coupe | Stock, GT |
| Hatch | Stock, Group B |
| Electric (new) | Stock: two motors, 750 hp, one gear. Race: widebody, wing, slicks, three motors, 1,100 hp |
| Wedge (new) | Stock: late-80s mid-engine 5.2 V12, pop-up lamps. Night Runner: twin-turbo 5.7 V12, widebody, wing, neon slash, underglow |
| Hypercar (new) | Stock: modern mid-engine 5.2 V10, AWD. Track: 5.6 V10, shark fin, big wing, slicks |

The new bodies are `hd/34_ev.js`, `35_wedge.js`, `36_hyper.js`; their builds, engines and chassis
`hd/37_newbuilds.js`; the electric drive and its sound `hd/45_ev.js`. All original designs: no real
badges, names or signature details.

## Build and check

Needs Node 18 or newer. `npm install` fetches esbuild (the build) and Playwright (only the screenshot and
in-page check tools). `build/` is made by the build and isn't kept; `dist/city-limits.html` is the whole game
in one file.

```
npm install
node tools/build.mjs                 # dist/city-limits.html
node tools/proving.js [ids]          # 0-60, quarter mile, top speed on flat tarmac
node tools/drive_check.mjs [ids] [level]   # robots on every road: distance, stuck, rolls, NaNs
node tools/worldcheck.mjs            # world sizes, timings, ground samples
node tools/tour.mjs dir places|cars  # screenshots (headless, software GL: slow)
node tools/cars.mjs dir ids yaw      # the cars on the title spot, no HUD
node tools/phone.mjs dir             # a Pixel 7a held sideways: title and touch controls
node tools/par.mjs [ids] [--show]    # robots set the medal times (src/game/pars.js)
node tools/game_check.mjs dir [phone]   # garage, a job, a challenge run, in the page
node tools/marks_shot.mjs dir [phone] [shots]   # the garage and the lights in the world
```

Saves use `cl-` keys only (`cl-settings`, `cl-engine`, `cl-career`, `cl-free`).
