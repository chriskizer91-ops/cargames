# Handoff: Redline County: Wide Open 2: Road Not Found + Traffic

As of 4 November 2026. Folder `rlcwo2rnf-traffic/` in `chriskizer91-ops/cargames`, branch `claude/youthful-bell-jj1yix`.
The published page: https://claude.ai/artifact/YVLGXSWv5wUEGxvq1QPzCd (republish the `dist/` copy to the same artifact).
This is **the game** going forward: one page for the laptop and the phone, not split. A separate, minimal game that
takes place only on the salt flats (the owner's `salt-mini-plus` repo) reuses this game's physics, digital engine and
some of its assets with the owner's high-detail cars (about half a million triangles each); nothing of that comes here.

The handoff that started this version (the fork from Wide Open 2, the brief for traffic and the map) is in this file's
history at commit 429b059's `wide-open-2/HANDOFF.md`.

---

## 1. What this is

- A single self-contained HTML page (about 9 MB: the code, the ground photographs and the voices inside it), no server,
  played from a file on a Windows laptop (MSI, Edge) and on a Pixel 7a. `sh build.sh` concatenates `src/` in the order
  it lists into `rlcwo2rnf-traffic.html` and `dist/rlcwo2rnf-traffic.artifact.html`.
- Graphics tiers Mobile, Low, Medium, High, Ultra; a phone starts on Mobile and a laptop on Low every launch (a choice in
  the menu lasts one start, `rt-gfx-next`). Save keys are `rt-`.

## 2. What's in it (this version)

- **Traffic on Highway 40** (`60_traffic.js`): cars ride its six lanes as loops, keep their distance (the intelligent
  driver model), stop for the town's signals, change lanes, and go onto the physics within a moment of touching you
  (crashes are real; a car hit stops and honks). Cars by level: 8 on Mobile to 32 on Ultra (Dev: Traffic cars).
- **Traffic on the town's streets and the country roads** (`60_streets.js`): the same machinery on loops of their own:
  49 rectangles round the town's blocks (right turns only), the boulevard both ways, each section line out and back
  (turning on the salt). Signals on the town's 30 s cycle, stop signs elsewhere, one car in a junction at a time;
  country cars wait for a gap to cross Highway 40. As thick as a quarter of the highway's traffic (Dev: Streets and
  country roads).
- **Police** (`60_police.js`, `60_heli.js`, `60_patrol.js`): with the police on (Drive tab), **patrols**: parked at a
  dozen spots and about one traffic car in ten; a chase starts when one sees you speeding (15 mph over the limit), run
  a red, or hit a car. The chase: a wanted level 1 to 5 (more and faster cars, PIT and boxing-in tactics, the
  helicopter at 5 with its searchlight, to be outrun at about 290 mph), busted at a standstill for 3 s (back to the
  garage, a $500 fine in the career), or away (every one of them past the escape distance for 5 s): then patrols again.
  The siren deeper and quieter than it was. Dev: When the police come (a patrol sees you / at once), Wanted level,
  Police cars, their speed, siren pitch and volume, the helicopter's speed, the escape distance.
- **Rear view** (REAR on the touch screen, G, a gamepad's R3).
- **The waypoint** (`61_nav.js`): tap or click the big map (M) to set one; the route by road on both maps, the distance
  under the corner map; worked out again when you leave it, cleared on arrival.
- **Efficiency** (all measured, all with proof; `PERF_PLAN.md` has the numbers):
  - a memory leak fixed: every car built kept all of its building, about 18 MB a car; the JavaScript heap in a drive on
    Mobile went from 414 MB to 104 MB (section 3);
  - the lean ground on Mobile and Low (the ground's fine procedural detail left out of the shader: 9 to 24% of the
    frame in the software renderer); the ground's dirt made only where it shows, road paint only on the lines (every
    tier, the same picture);
  - half precision in the post chain and (Mobile) the lighting; the dynamic resolution aimed at a share of the GPU's
    time measured with fences (cooler phones); the HUD sent by the rows drawn; culling and near-first drawing;
  - the physics' garbage cut (with the owner's leave, under proof: physcheck 0, the proving table byte for byte, a
    full-precision fingerprint identical; `Math.hypot` replaced by a bit-identical version without its allocation);
  - the physics and the traffic's car models warmed up on the loading screen (no stutter in the first seconds of a
    drive); the waypoint's road graph made there too.
- **Readouts** (F once: the Readout; twice: Everything; Dev: Numbers on screen): frames against the beat, frame time and
  worst, CPU and GPU time, the render size, which shader build (lean, half, noskip), the cars on the physics, every
  section's milliseconds (PHYS, AI, WORLD...), the render size's changes (RESIZES), the last spike.

## 3. What we know (measured)

- **Memory.** A heap snapshot in a drive (Mobile, `tools/mem_rt.js`): 414 MB before the leak fix, of it 354 MB plain
  arrays, 309 MB of them car mesh builders' vertex arrays. The cause: `21_suv.js`'s `buildSUV` stores two closures (the
  hood's `hz`, `topY`) on the car's `D`, which is kept for every built car, and a closure keeps every variable of the
  function it was made in. Fixed by emptying the builders once their meshes are made. After: 104 MB in a drive, 283 MB
  at the end of the boot (the boot's own building, collected once a drive starts). Watch for the same pattern anywhere a
  builder function hands out a closure.
- **The lean ground.** In the software renderer, whole frame, Mobile: the fine detail left out saves 9 to 24% (most in
  the country); summing the colour noise in two layers instead of four never paid (it's in the code for the tools only).
  Nobody has measured it on the phone's GPU yet.
- **Race vs traffic vs a chase on the CPU** (the game's step, Mobile, this machine): free drive 0.21 ms a frame, a race's
  start 0.91 ms (6 cars on the physics), a 3-star chase 0.84 ms (4 to 5); the cost follows the cars on the physics; the
  drivers' thinking stays near 0.1 ms. A phone is about 3 to 5 times slower.
- **Today's traffic cars** are trimmed copies of the game's own cars: 9 to 12 thousand triangles close up, 5 to 7
  thousand far, built on the device (now on the loading screen). The owner's baked models will replace them (section 4).
- **The engine's garble** (heard in version 13 on the laptop): nothing in the sound changed; the synth follows each
  frame's engine speed within 10 ms, so frames arriving unevenly come out as steps in the pitch. The owner had a Linux
  virtual machine running beside the game; with it closed the garble seems gone. If it comes back: Menu, Settings, the
  last line (audio worklet or main-thread fallback); Dev, GPU load target, Hold (the render size frozen); Dev, Lean
  ground, Off.
- **The render size's steps** may each be a hitch on a phone (the targets remade); unmeasured: the RESIZES row on the
  Everything readout shows how often and the worst frame after one. The full fix (targets made once, drawn into part of
  them) is a day's change to the renderer and waits on those numbers.
- **Headless limits.** The software renderer can't time a phone's GPU, can't hear, and its frames take 1 to 3 s: timing
  in it needs each frame waited for (a pixel read back); its GPU numbers mean nothing; counts, pixels and JavaScript
  time do. Since the streets' traffic, its loops are made in 3 ms slices by the clock, so two runs can differ by where a
  street car is: compare pictures with the traffic off (`JS="g.DEVW.stS='off';g.APP.traffic=false;"` on
  `tools/frame_rt.js`).

## 4. Moving forward (the agreed direction, in order)

1. **The owner's numbers** from the phone and the laptop: the test sheet in `PERF_PLAN.md` (which numbers to read, what
   is bad, the A/B switches). They decide the next efficiency items.
2. **The baked traffic and police cars.** The owner is making them in another thread: studio models (about 750,000
   triangles, engine bay and underside included) baked onto models under 5,000 triangles, only a couple of kinds
   repeated. `TRAFFIC_MODELS.md` is the spec (glb, metres, the origin, three levels of detail, wheels as their own
   objects, one UV set with tangents, base colour with a paint mask, normal map, ORM; glass, lamps and the light bar
   unbaked; texture sizes per tier). When the first arrives: `tools/pack_cars.py` (glb to the game's mesh format and
   WebP maps inside the page, as `pack_textures.py` does the ground), a baked-car shader of its own (nothing else gets
   heavier), and **instanced drawing** (all the cars of one kind in one draw a pass, colours in the instance data). Then
   the traffic can be thicker for the same cost. Physics for a crashed traffic car stays the nearest build of its size.
3. **The owner's environment asset pack** (trees, stacks of tyres, oil barrels and the like; in another repo of the
   owner's, `building-with-assets-` or `3d-construction`): deliberately later, because it adds load. When it comes: one
   placement system: each kind instanced, placed per chunk by the world's generator from a seed (so it's the same every
   drive and costs nothing to remember), drawn within a radius with levels of detail, in the shadow maps only near the
   car, drive-through or solid per kind, a density and an on/off in Dev, its GPU memory counted on the F overlay. The
   ground clutter once planned (grass tufts, bushes) becomes part of it.
4. **The efficiency backlog** (`PERF_PLAN.md` section 5), one item at a time: the render size without remaking targets
   (if the RESIZES row shows hitches), police far behind riding cheaply off the physics, the drawing side's remaining
   garbage, a yard-light cap for the phone, smaller vertices, a second round of the lean ground (each its own A/B).

## 5. The rules (hard; the owner holds to them)

1. **The physics is not edited**, except the owner's one grant (the step's garbage, done under proof). `40_physics.js`,
   `41_ground.js` changed only in how numbers reach a call; everything else of the physics byte for byte:
   `42_chassis.js`, `43_sim.js`, `44_ai.js` (only `Math.hypot` → `hyp2/3/4`), `45_ev.js`, `15_digital_engine.js`,
   `16_engines.js`, `32_builds.js`, `37_newbuilds.js`, `34_machines.js`. `node tools/physcheck.js` must say
   `worst difference over all runs: 0`; `node tools/proving.js` the same table.
2. **No model names anywhere** in the repository: code, comments, commit messages, README, this file.
3. Never trade picture quality for speed on High or Ultra (Mobile and Low may trade, behind a Dev switch). Anything a
   model can't judge by eye or on real hardware becomes a Dev control with a sensible default.
4. Commit each step, push to the branch, no pull request unless asked. Show each improvement with proof (numbers before
   and after, a pixel comparison, a picture).
5. Efficiency first, then features; slowly, one thing at a time, measured.

## 6. The owner

- Steers; plays on the laptop and the Pixel 7a and reports with photos and readout numbers. Likes plain numbers and
  pictures; dislikes crowded phone UI.
- Sub-agents allowed at extra-high effort: a builder for work in its own worktree, and a reviewer for read-only reviews
  given the code, not conclusions (one reviewed the lean shader and found a real bug). The owner names which models.
- Open questions: a bust's $500 fine plus the garage, or the garage only; the helicopter's two voice lines to record
  (`VOICE_PROMPTS.md`); the time of day (golden hour or night only: take day off the Drive tab, or only the default?);
  the patrols' feel (the limits, how far they see, how many) once played.

## 7. Running and checking

- Node Playwright with the pre-installed Chromium, software rendering:
  `chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})`.
  Never run `playwright install`. Every tool holds the game's loop (`GAME.hold`) and steps frames itself; each documents
  itself in its first lines.
- The whole game: `rt_check.js` (must end `no page errors`). The physics: `physcheck.js`, `proving.js`.
- Pictures: `frame_rt.js` (one frame the same every time; `JS=`, `FILE=` for another build; compare with a pixel diff),
  `shot_rt.js`, `eval_rt.js "<code with the game as g>"` (don't declare `g` yourself: it's taken).
- Performance: `perf_rt.js` (GL calls, JavaScript per part, garbage), `alloc_rt.js` (where the garbage is made),
  `shader_cost.js` (the land shader's variants timed in one page), `load_rt.js` (race vs traffic vs chase on the CPU),
  `mem_rt.js` (what holds the memory).
- Behaviour: `traffic_check.js` (the highway; `STREETS=off`), `streets_check.js` (town, Neon Row, the country, the
  crossing), `police_check.js` (chases; runs them At once), `patrol_check.js` (the patrols' offences, getting away).
- Pitfalls: the container can restart and stop background runs (re-run them); `cd` can be reset between commands (use
  absolute paths); a `pgrep -f X` loop matches its own command line; several Chromiums at once only slow each other.

## 8. Where things are

Modules load in `build.sh`'s order, all in one script scope.

- The world: `50_worldgen.js` (`WG`: roads, the town `WG.TW` with its junctions `jn` and streets `roads`, the section
  lines `offNS`/`offEW`, `roadAt`, `sample`), `51_world.js` (streaming, chunks, trees), `52_world_gl.js` (the renderer's
  hooks, the land's programs and their defines: `landDefs`, `landRebuild`), `13_lit.js` (the scene's shaders: the lean
  ground's `LEAN_D`), `11_sl3.js` (the renderer: `NO_SKIP`, `HALF`, the dynamic resolution `DRS`).
- Cars: `33_car_mesh.js` (`truck`, `truckFar`, `truckLite`), `21_suv.js` (the body builder), `60_game.js` (the frame,
  the camera, drawing your car, the physics warm-up).
- Traffic: `60_traffic.js` (the highway's loops, the driver, the lights, the physics near you, drawing),
  `60_streets.js` (the streets' and country roads' loops, junctions and their claims, spawning).
- Police: `60_police.js` (the chase), `60_patrol.js` (the patrols), `60_heli.js`.
- Map and HUD: `61_nav.js` (the waypoint), `61_hud.js` (both maps), `64_touch.js`.
- Performance: `52_world_dev.js` (the readouts, the Dev world controls, `PS` sections), `55_post.js` (the dynamic
  resolution step, the GPU readout), `55_gfx.js` (the tiers), `65_boot.js` (the boot: what's warmed up while the shaders
  compile; `window.__game` for the tools).

## 9. First steps for the next session

1. Read this file, `PERF_PLAN.md`, `TRAFFIC_MODELS.md`, then the README's top sections.
2. `git fetch`; check out `claude/youthful-bell-jj1yix`; `sh build.sh`; `node tools/rt_check.js` and
   `node tools/physcheck.js` once, for this machine's baseline.
3. Ask the owner for the phone and laptop numbers, and whether the first baked car is ready.
