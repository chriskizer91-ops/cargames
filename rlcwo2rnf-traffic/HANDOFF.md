# Handoff: rlcwo2rnf+traffic

**Redline County: Wide Open 2: Road Not Found + Traffic.** The next version of the owner's HD car game, to be built by a
fresh session. Its two jobs: **life on the roads** (traffic, parked cars, people) and **the map with waypoints**. Everything
else the owner might want is listed at the end as potential upgrades, with what each costs the machine.

Paste this to start the fresh session:

> Read `wide-open-2/HANDOFF.md` in `chriskizer91-ops/cargames` (branch `claude/practical-galileo-ko5a7t`, head 429b059 or
> later) and do what it says: make `rlcwo2rnf-traffic/` from `wide-open-2/`, then build life on the roads and the map with
> waypoints, under its rules.

---

## 1. What this is

- A single self-contained HTML page, no server, played from a file on a Windows laptop (MSI, Edge, the F overlay says
  "GFX HIGH") and on a Pixel 7a. Everything is rendered on the owner's own machine.
- The line so far: Redline County: Wide Open (the owner's source game, frozen) → **Wide Open 2** (`wide-open-2/`: the same
  game drawn by Shiftlight 3's renderer, with the owner's ground photographs, three times of day, rain, phone budgets,
  stunts, nitrous in the wild) → **this version**.
- Name the new version **rlcwo2rnf+traffic**. For the folder, the page and the branch use the safe spelling
  `rlcwo2rnf-traffic` (a `+` in a folder name is trouble in URLs and shells); the page's title and the menu say
  "Redline County: Wide Open 2: Road Not Found + Traffic".

## 2. The repo as you find it

- Repo `chriskizer91-ops/cargames`. The branch with everything is `claude/practical-galileo-ko5a7t`; head **429b059**
  ("the efficiency branch merged into the main line"). You will be given your own branch; start it from there.
- `wide-open-2/` is complete and checked at that commit: `src/` (modules numbered in load order), `shell/` (the page's
  HTML and CSS), `tools/`, `build.sh` (concatenates `src/` into `wide-open-2.html` and `dist/wide-open-2.artifact.html`),
  `BRIEF.md` (the rules and phases of the port), `QA.md` (the QA sweep, how to run things headless, open items),
  `TEXTURES.md`, `TEXTURE_PROMPTS.md` (six pictures the owner may still deliver), `README.md`.
- History worth knowing: 4d8346f the fork of Wide Open; e8b1072 renderer port + QA merged; 67cf042..a87d9d2 Phases 2 and
  3 (pictures, night, golden hour, rain, Dev look; phone budgets, staged boot, touch and menus, pars rerun); the efficiency
  branch (587495e, 5aac9d5, 45fd6d9: fewer uniform uploads and texture binds, standing things drawn before the ground, no
  per-frame garbage from the world or the renderer; 5cac57c the refused-upload fix; 0fc5013 the owner's stunts update;
  ba940d1 nitrous in the wild) merged at 429b059.
- The published page: https://claude.ai/artifact/GFVBSyXY9vfptxKCkSpfnV (republish it, or a new one for this version, with
  the artifacts tools; the full `wide-open-2.html` with its doctype is what publishes, not the `dist/` copy).
- The 20 MB of source photographs live in `rut-access/textures/`; `wide-open-2/tools/pack_textures.py` reads them from
  there into `src/49_textures.js` (1024 px WebP; it drops to 768 px by itself if the page would pass 9 MB).
- One blemish to tell the owner about if it matters: the commits from 67cf042 to a87d9d2 carry a model name in their
  trailer (an agent followed the harness's attribution line). The owner's rule is no model names anywhere; the branch is
  pushed, so leave history alone unless the owner asks.

## 3. The rules (hard, from BRIEF.md; the owner holds to them)

1. **The physics is not edited.** These modules stay byte for byte as they are: `40_physics.js`, `41_ground.js`,
   `42_chassis.js`, `43_sim.js`, `44_ai.js`, `45_ev.js`, `15_digital_engine.js`, `16_engines.js`, `32_builds.js`,
   `37_newbuilds.js`, `34_machines.js`. `node tools/physcheck.js` must say `worst difference over all runs: 0`;
   `node tools/proving.js` must print the same table as QA.md's. If something needs a physics number, the game sets
   it from outside (nitrous's bottle is the worked example: `60_nitrous.js`). The one exception the owner may grant:
   removing the physics step's garbage under the zero-difference proof (see potential upgrades); ask first.
   **Granted and done (3 November 2026):** the owner said yes; `40_physics.js` and `41_ground.js` changed only in how
   numbers reach a call (arrays and scratch objects in place of loose numbers, indexed loops, a method in place of two
   closures), every sum and its order as before. physcheck 0, proving.js's table byte for byte, and a full-precision
   fingerprint of every build at every level (Sim on, riders, drift, collisions) bit-identical. The other modules are
   still byte for byte; the rule stands for everything else: no physics number changes.
2. `src/15_digital_engine.js` is identical to `rut-access/src/15_digital_engine.js` (`diff` prints nothing).
3. The car models keep their shapes. Save keys are prefixed per version (`wo2-` here; use `rt-` for this version: on a
   `file://` page every local HTML file shares one localStorage, so two versions with the same keys would share saves).
4. Each version lives in its own folder with its own page from its own `build.sh`, and a row in the root `README.md`.
5. **No model names anywhere** in the repository: code, comments, commit messages, README. Plain-language commit
   subjects in the repo's style ("Wide Open 2: the menu fits a phone held upright"). End commits with whatever
   attribution lines your session gives you.
6. Anything a model can't judge by eye or on real hardware becomes a Dev control with a sensible default (the Dev tab
   already has Look sliders, phone budgets, pass switches). Never trade picture quality for speed on High or Ultra.
7. Commit each step, push each commit to your branch, no pull request unless asked.
8. Present each improvement to the owner as it is made, with proof (numbers before and after, a frame comparison, a
   screenshot), not at the end.

## 4. The owner

- Wants to be the one steering; wants the main session to build, with two or three sub-agents at most, at extra-high
  effort, when the work parallelises. Likes screenshots and plain numbers. Dislikes crowded phone UI. Checks things on
  the laptop and the phone and reports back with photos.
- Said: "unlimited nitrous in free play", "buy nitrous out in the wild, delivered like the jobs deliver things" (done),
  "nothing wasting computation, highest quality on the laptop as often as possible", and asked for this version: life on
  the roads and the map with waypoints, with the rest as potential upgrades.
- Open questions the owner has not yet answered: whether challenge medals in free play should use the career's bottle
  rule (unlimited nitrous makes pars easy); whether to remove the physics step's garbage under proof; the Phase 2/3
  agent's list to confirm on the phone (full moon as the opening time, Photo colour 50%, golden hour, column and bay
  brightness, 1.5× headlights, the budgets, whether a career wipe keeps the bests).

## 5. Running and checking the game headless

- Node Playwright with the pre-installed Chromium, software rendering:
  `chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})`.
  Never run `playwright install`. Python tools need the shim in QA.md ("How it was run"). The page's own loop runs at
  about 1 fps here, so every tool holds the loop (`GAME.hold`) and steps frames itself; a frame at High takes 1 to 4 s,
  a page screenshot 30 to 130 s, a boot 30 to 60 s. GPU times mean nothing here; counts and pixels do.
- The tools (`wide-open-2/tools/`, all documented in their first lines):
  - `wo2_check.js`: the whole game (boot, showroom, places, a race, a challenge, the night); must end `no page errors`.
  - `boot_node.js`: boot at a graphics level, a snap. `shot_wo2.js`: pictures by place/quality/display/time of day.
  - `eval_wo2.js "<code with the game as g>"`: run code in the booted page; the fastest way to test a mechanic.
  - `frame_wo2.js`: one frame the same every time (world whole, frame count, history, probe, clock and camera reset),
    with `DEBUG=color|depth|normal|vel` for the renderer's buffers; compare two builds with a pixel diff.
  - `perf_wo2.js`: GL calls, triangles, JavaScript time per part and garbage per frame, before and after a change.
  - `alloc_wo2.js`: where the garbage is made (V8's sampling heap profiler), by function.
  - `physcheck.js`, `proving.js`, `chal_drive.py pars`, `stunt_check.py`, `sheet.py`, `pack_textures.py`.
- Pitfalls met here: `cd` can be reset between commands (use absolute paths); a background `until pgrep -f X` loop
  matches its own command line (use `pgrep -f 'nam[e]'`); `pkill -f` kills the shell that runs it; running several
  Chromiums at once makes everything slower but not different.
- Headless can't lift one finger of two on the touch controls, can't hear sound without
  `--autoplay-policy=no-user-gesture-required`, and can't measure a real GPU: put those on the owner's phone list.

## 6. The architecture you need

Modules load in `build.sh`'s order; everything is in one script scope, no imports.

- **The world** `50_worldgen.js` (`WG`): the county is generated by functions and by a worker in 128 m chunks.
  Roads: Highway 40 runs east-west along z = 0 (`kind:'hwy'`), the main street north-south along x = 0, a mile-square grid
  of country section lines (`offNS`, `offEW`), the town's streets as axis-aligned segments in `T.roads`
  (`{ax:'x'|'z', line, a, b, kind}` with classes in `TCLS`), the Outer Loop `WG.OL` as a path (`at(s, out)`, `near`,
  `len`), the park's tracks (`oval`, `short`, `mud`) as paths, places in `PLACES`. **`WG.roadLines(x0,z0,x1,z1,step)`**
  returns road polylines with a class, used by the big map; it is the natural source of traffic rails and routes.
  `nameAt(x,z)` names a place; `heightAt` is on `RANCH.W`.
- **Streaming and drawing the world** `51_world.js` (`WORLD`, `chunkList()`, `farList()`, `drawWorld`, trees,
  `worldLights`, the frustum ring), `52_world_gl.js` (the renderer hooks `LAND`, `CARHOOK`, `FXP`, `GLASSHOOK`; the hook
  order is car, land, particles, glass), `13_lit.js` (the scene shaders), `11_sl3.js` (the renderer; don't rewrite it).
- **Cars** `33_car_mesh.js`: `truck(i)` the full car (built once, kept in `TRUCK`), `truckFar(i)` the coarse copy used for
  every other car (5 to 15k triangles; `TRUCKF`, evicted by `truckEvict`). `60_game.js`: `drawWorldCar` draws a car with
  motion vectors, `carLights`/`yardLights`/`rivalLights` (`59_daynight.js`) feed lamps to the renderer (16 dynamic lamps
  at most), `occOf` the shade under a car (8 at most).
- **Other cars already exist for races** `44_ai.js`: `RaceLine` (a polyline with `ds`, `idx`, `at`, `room`, lateral `off`,
  half-width `hwA`), `Driver` (steers to a target speed, passes, holds a lane, and `toKin()` switches it to kinematic,
  no physics, which is how a far rival is cheap). `60_race.js`: `raceCar`, `raceSettle`, the per-substep loop that steps
  only non-kinematic cars within range and calls `carContacts(RACE_CARS)` for collisions with you, `raceDraw` (coarse
  bodies), `raceCars()` the visible list, `rivalLights`, race voices `RVOX`. Traffic should reuse these: cars on rails are
  kinematic `Driver`s on `RaceLine`s built from `WG.roadLines`, with physics switched on only within about 30 m of you.
- **People and jobs** `60_jobs.js`: `PEOPLE` (Marisol at the garage, Deke at the gas station, Rosa at the diner, Vince on
  Neon Row, Bo at the park, Hal on the salt) with positions and colours, their columns of light, the job steps
  (`talk`, `deliver`, `goto`, ...), the current target and the HUD arrow to it. `60_nitrous.js` is the delivery pattern
  (a price, a wait, a HUD chip, the buy bar).
- **The HUD and the map** `61_hud.js` (dot-matrix HUD into `HB`): `drawMap` the corner map around the car (map tiles
  kept per chunk, north up, the car's arrow), `drawBigMap` (M, or tap the corner map): four miles across, roads from
  `WG.roadLines` cached in `BIGM`, towns named. `10_core.js` has the dot primitives and the smooth text layer.
- **Menus and touch** `62_menu.js` (tabs Drive, Challenges, Races, Garage, Cool stuff, Settings, Dev), `64_touch.js`,
  `shell/game.head.html`. The Drive tab has Go to, Time of day, Camera, Nitrous.
- **Career and money** `60_career.js`: `cash()`, `earn()`, `spend()`, `askBuy()` (the buy bar), the dealer, parts
  ownership. Free play: every car and part is yours, money is a score.
- **Performance** `52_world_dev.js` (the F overlay: frame times, draws, refused uploads), `55_gfx.js` (tiers and the
  phone budgets, `BUDGET`), `55_post.js` (display, dynamic resolution). Today at High on the owner's laptop: 64 to 72 fps,
  110 to 190k triangles a frame, about 170 draws; at Mobile the beat is 45 fps.

## 7. The two features

### Life on the roads

What the owner wants: the county alive. Traffic on Highway 40 and the town's streets, cars parked at the diner, the gas
station and the garage, people standing where the job markers are.

Design that fits the machine:
- **Cars on rails.** Each traffic car is a kinematic `Driver` on a `RaceLine` made from a road polyline
  (`WG.roadLines`), lane offset by direction, speed by road class (highway 25 to 30 m/s, town 12 to 15, country 20),
  slowing for the car ahead and for you. Spawn them out of sight ahead and behind on the roads near the car, recycle the
  ones that fall out of range, never pop one into view. Keep the whole thing allocation-free per frame (`perf_wo2.js`
  garbage must not rise) and off the physics unless within about 30 m of you, where the race code's switch to physics and
  `carContacts` give real collisions. A collision is the player's problem, not the robot's: it brakes, honks, moves on.
- **Drawn as coarse copies** (`truckFar`), lit at night with `rivalLights` (the lamp cap is 16: nearest first), shadows
  and the probe only within 60 m, nothing drawn beyond the budget. Budgets in Dev (`BUDGET`): about 6 cars on Mobile,
  16 on High, 24 on Ultra; the Mobile default must leave the frame rate where it is (check the triangle count per frame:
  Mobile stays under about +40%).
- **Parked cars** are static coarse bodies at the diner's and the gas station's lots and the garage's forecourt (the
  worldgen has `lots`), placed once per chunk, no AI, no lights by day. **People** are small static figures (the mesh
  builder `MB` in `12_gl_mesh.js`/`14_loft.js`) at `PEOPLE` positions, facing the road, with the column of light still
  the way you find them.
- Acceptance: `wo2_check.js` extended with a traffic scene (a drive down Highway 40 and through downtown with traffic on:
  no NaNs, no page errors, cars count within budget, none inside a building); `perf_wo2.js` before and after (garbage per
  frame unchanged, draws within budget); `physcheck` 0; a Dev switch to turn traffic off.

### The map with waypoints

- The big map (`drawBigMap`) gets pins: the people (their colours), the places of the Drive tab, challenge starts, the
  park's tracks, your car. Tap or click a spot (or a pin) to set a waypoint; the corner map shows it and the HUD shows
  the arrow and the distance the way a job's target does today; clear it on arrival or with a tap.
- A route: with `WG.roadLines` as a graph (nodes at junctions), a shortest path by road from the car to the waypoint,
  drawn on the big map and the corner map as a line, and optionally on the road ahead as a faint ribbon through the glass
  hook (`chalDraw` draws the challenge columns that way). Work the route out once per waypoint and when the car leaves it
  by more than a lane; nothing per frame.
- Touch: the big map already opens from the corner map; pins need hit targets a thumb can land on (the phone sheets in
  `dist/shots/phone/` show the layout). Keys: M for the map, and a key to clear the waypoint.
- Acceptance: a headless test that sets a waypoint across town and checks the route's length and that the arrow's
  bearing matches; the phone layout at 412 × 915 with the map open.

### Build order

1. Fork: `cp -r wide-open-2 rlcwo2rnf-traffic`, rename the page, the title, the save keys (`wo2-` → `rt-`), the tools'
   paths, the root README row; build; `wo2_check`; commit.
2. Traffic on rails on Highway 40 only, kinematic, drawn coarse; a Dev switch and the budget; measure; commit.
3. Town streets and country roads, lanes and junction rules, parked cars; measure; commit.
4. Physics within 30 m and collisions; people at the markers; night lights; commit.
5. The map's pins and the waypoint; then the route and the line; commit each.
6. Screenshots and the phone sheets; a short section in the README; republish; report to the owner with numbers.

## 8. Potential upgrades (the rest), with what they cost the machine

Ordered by the owner's interest after these two. Costs are per frame on top of today's game; a phone has about a third
of the laptop's budget on the main thread, the GPU and memory.

| Upgrade | Challenge for the player | Main thread | GPU | Memory | Phone |
|---|---|---|---|---|---|
| A day that turns (the sun arcs through golden hour into the full moon and back, lights at dusk, weather fronts) | Medium | None | None, the same passes with different numbers | None | Free |
| Deke's idea elsewhere: Bo's recovery truck when stuck or rolled far from a road; fuel at Deke's pumps with a tank | Medium | None | None | None | Free |
| Mechanical wear and a repair bill (tyre wear and flats, heat from nitrous abuse, brake fade; Marisol fixes it for money) | Medium to high | None (the sim already tracks fade and flats) | A flat tyre mesh at most | None | Free |
| The ground remembers (skid marks, tyre tracks in dirt and mud, rubber on the strip) | None, feedback | Tiny | One 1024² marks texture around the car, one extra read per ground pixel: about 0.2 ms laptop, 0.5 ms phone at 512² | A few MB | Fine |
| Photo mode (free camera, HUD off, pick the time, save a PNG) | None | None in play; the one shot can render above live quality | None | None | Free |
| Replays of races and challenges with a free camera | None | About 100 bytes a frame recorded; playback has no physics | None | About 700 KB per two-minute race | Fine |
| Save export and import as a file | None | None | None | None | Free |
| Gamepad menu navigation and rumble | None | None | None | None | n/a |
| Sound by place (reverb by place, tyre and road noise by surface, wind) | None | Tiny | None | None | Fine |
| Rivals with personalities and a championship season | Medium | None | None | Small | Fine |
| Interior camera with a dash | None | None | Small | Interior meshes per car: large to build | Fine |

Two performance items still open in `wide-open-2`: the HUD's dot buffer is uploaded whole every frame (3.7 MB at the
laptop's 1280 × 720 dots; dirty-row uploads would cut most of it); and the physics step makes about 90 KB of garbage a
frame (a scratch-buffer rewrite would be numerically identical, provable with `physcheck`, but it touches the physics
files: the owner's call).

## 9. Known open items

- The stock Hatch never quite stops under full brake on the proving tool's flat ground at 100% traction (the game runs at
  200% by default, where it stops); inside the physics, reported only.
- The ground casts no shadows (Wide Open's didn't either); the studio's lens shift is done by tilting the camera.
- Six pictures the owner may deliver (TEXTURE_PROMPTS.md); the packer takes them by file name.
- Nothing has been measured on the Pixel 7a's GPU; the phone budgets are conservative and all in Dev.
- `NOS.pending` (a bottle on its way) is not saved; closing the page mid-delivery loses the bottle but not the money.

## 10. First steps for the fresh session

1. Read this file, then `wide-open-2/BRIEF.md` and `QA.md` ("How it was run"), then `README.md`.
2. `git fetch`; confirm `claude/practical-galileo-ko5a7t` is at 429b059 or later and that your own branch starts there.
3. Build and check `wide-open-2` once as found (`sh build.sh`, `node tools/physcheck.js`, `node tools/wo2_check.js`) so
   you know the baseline numbers on your machine; run `perf_wo2.js day night` for the counts you will compare against.
4. Fork into `rlcwo2rnf-traffic/` (section 7, step 1). Everything after that is this version's.
