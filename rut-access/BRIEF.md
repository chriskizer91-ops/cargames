# Rut Access: Road Not Found (build brief)

This is the brief for building **Rut Access: Road Not Found**, the next game in the Dirt Sleeper line.
Read all of it before writing code. It says what the game is, where every piece comes from, what must
not change, and the order to build it in, with a stop after each phase so the owner can try it on their
phone.

## The game

The gameplay, physics, cars and sound of **Dirt Sleeper Showdown** (with everything HD and Mini Dirt Run
Solo have), drawn by **Shiftlight 3's renderer at its Mobile settings**, on a **Pixel 7a**. Drive
anywhere in the world, do stunts for money (jumps, drifts, slides, two wheels, wheelies, saves, close
calls), race, build any car the garage allows. Day, golden hour and night; clear, rain and fog; at night
the light comes from real lamps in the places that would have them.

The owner's verdict on the line so far:

- **Shiftlight 3 is the look.** It runs on their Pixel 7a at its lowest (Mobile) setting and looks
  better than every Dirt game at its highest. See `docs/visual-comparison.jpg`: Shiftlight 3 on
  Mobile beside each Dirt game on its best setting.
- **Showdown, HD and Open World are the gameplay, physics, cars and sound.** Their physics should be
  close to each other; Showdown is the newest. Keep the car models exactly as they are.
- **The original Dirt Sleeper** (`dirt-sleeper/` on `main`) looks good because it already uses an older
  Shiftlight 3 renderer, but its cars and physics are not the ones wanted. Use it only as a worked
  example of that renderer drawing a ranch.

## Rules

1. **Your own folder.** Everything goes in `rut-access/`, apart from this game's row in the root
   `README.md`. Never edit another game's folder or another branch. Saved settings and progress use their
   own key prefix (`rut-`), so this game never reads or overwrites another version's.
2. **One self-contained HTML file**, no network, no libraries, built from `src/` modules by `build.sh`
   the way Showdown is built. Also write an artifact copy (the page without its outer tags, like
   `mini-dirt-run-solo/dist/mini-dirt-run-solo.artifact.html`) so the owner can publish it and open it on
   the phone.
3. **Physics stays Showdown's** (`src/40_physics.js`, `41_ground.js`, `42_chassis.js`, `43_sim.js`,
   `44_ai.js`). Don't change how a car drives unless the owner asks. Run `tools/physcheck.js`,
   `tools/proving.js` and `tools/showdown_check.js` before and after anything that touches the game loop,
   and report any difference.
4. **The car and machine models keep their shapes.** They get Shiftlight 3's shading (paint, clearcoat,
   glass, chrome, lamps, reflections), not new geometry.
5. **Digital Engine is the lab's.** The block inside the BEGIN/END markers in
   `src/15_digital_engine.js` is always byte for byte the synth and sim in `lab/digital-engine.html`;
   `tools/check_de.py` proves it. The owner wants to work on the synth, so it can change, but only in the
   lab first, when the owner asks, and then copied into the game. Everything else about sound
   (`16_engines.js`, `17_audio.js`, the room, the mix) is the game's own.
6. **The target is a Pixel 7a** in Chrome, held sideways: a 1080 × 2400 OLED at up to 90 Hz, a Tensor G2
   chip (Mali-G710 GPU). The CSS viewport is about 915 × 412 sideways, at 2.625 device pixels per CSS pixel.
   Laptops get the higher tiers.
7. **Things a model can't judge, ask about:** how an engine or the mix sounds, how a car feels, the real
   frame rate on the phone, and whether it looks like Shiftlight 3. Make changes like these switchable
   (a Dev-tab toggle) so the owner can A/B them on the phone.
8. Commit after each working step with a plain-language message, like the rest of this repo. Push to
   your branch. Don't open a pull request unless asked.

## Where everything is

All of these are in `chriskizer91-ops/cargames` unless noted. Fetch a branch with
`git fetch origin <branch>` and read files with `git show origin/<branch>:<path>`.

| What | Branch | Path | Take |
| --- | --- | --- | --- |
| **Dirt Sleeper Showdown** | `dirt-sleeper-showdown/cross-country` | `dirt-sleeper-showdown/` | **The base.** Copy `src/`, `shell/`, `tools/`, `design/`, `build.sh`. Read its README in full |
| Dirt Sleeper HD | `claude/zealous-noether-iab04x` | `dirt-sleeper-hd/` | Showdown was copied from it. Read `TODO.md` (the engine's low end) |
| Mini Dirt Run Solo | `mini-dirt-run-solo/free-play` | `mini-dirt-run-solo/` | The machines (`34_machines.js`, `55_rigs.js`), the career (`65_career.js`), their tools (`machine_check.js`, `career_check.js`, `feats_check.js`). Made on a Pixel 7a |
| Mini Dirt Run Open World | `mini-dirt-run-open-world/first-build` | `mini-dirt-run-open-world/` | The streamed procedural world (`src/worldgen.js`, `src/world_rt.js`), maps (`src/game_maps.js`), cruise. `base/mini-dirt-run-solo-sim.html` is Mini Dirt Run Solo with the Sim level, the page Open World patches |
| **Shiftlight 3** | repo `chriskizer91-ops/shiftlight3`, `main` | `src/render/`, `src/ui/touch.js`, `test/` | **The renderer.** See below |
| **Digital Engine lab** | this folder | `lab/digital-engine.html` | **The engine synth and sim**, and the lab to hear them in (cars, bikes, heavy machines and more). Not in any other repo; the owner brought it |
| The model bay | `claude/zealous-noether-iab04x`, commit `52943a4` | `dirt-sleeper-mini/model-bay.html` | The seven cars in a garage, each running its own Digital Engine, hoods open to their engine bays. The reference for how the cars and their engine voices should look and sound. `git show 52943a4:dirt-sleeper-mini/model-bay.html` |
| Dirt Sleeper (original) | `main` | `dirt-sleeper/` | Reference only: an older Shiftlight 3 renderer hooked to a ranch (`src/10`–`12`, `40_world.js`, `41_worldmat.js`, `51_suvrender.js`) and an ambience synth (`33_ambience.js`) |

The other branches (`dirt-sleeper-mini/*`, `dirt-sleeper-sim/*`, `dirt-sleeper/*`) are older steps of the
same line; everything worth having from them is already in the ones above.

### How the pieces are related

- Dirt Sleeper Mini → Mini Dirt Run Solo (free play, feats, phone controls, night) → its machines and
  career → its Sim level (that page is Open World's `base/`) → Mini Dirt Run Open World.
- Dirt Sleeper HD = an early Mini Dirt Run Solo + Dirt Sleeper Sim, merged, with a new renderer, a world
  two miles square, races and robot drivers. HD forked from Solo **before** the machines and the career,
  so Showdown has neither.
- Showdown = HD + cross-country races, looks ("rivals who size you up") and strip callouts.

## What to take from each

| Feature | From |
| --- | --- |
| Physics, all four driving levels (Sim included), ground contact, chassis, robot drivers | Showdown |
| The seven bodies, their parts, wheels, engine bays and 16 factory builds | Showdown |
| The machines: kids' quad, sport quad, ranch quad, side-by-side, golf cart, go-kart, tractor, semi; the quad rider who leans and bails | Mini Dirt Run Solo |
| The world two miles square: ranch, drag strip, mud pit, rock garden, hill climb, trail loop, Speedway Park, short course, Bald Mountain and Summit Road, Cedar Hills rally stage, the dry lake | Showdown |
| Free roam, Go to, the big map | Showdown |
| Feats with combos and money: drift, jump, two wheels, wheelie, save, speed run, burnout, close call, splash, mud pit, summit, rock garden, lap, clock run | Showdown (Solo's `57_feats.js` has the same set) |
| Races: Speedway 25, Last Car Out, Short Course, Road Course, Dry Lake Dash, Mud Bog Dash, eighth-mile drag, rally, hill climb, the four cross-country races | Showdown |
| Looks and "nobody saw it coming", strip callouts and their ladder | Showdown |
| Career with joke-reward machines | Mini Dirt Run Solo (later phase, ask first) |
| Cruise (hold the lane) | Open World |
| Procedural country round the edge: road grid, farms, towns, power lines | Open World (optional last phase, ask first) |
| Touch controls (slide or tilt steering, analog pedals, haptics) | Showdown (`64_touch.js`); compare with Shiftlight's `src/ui/touch.js` and keep the better |
| Engine sound: Digital Engine and the engine specs | Showdown (`15`, `16`, `17`). Its Digital Engine block is byte for byte the lab's (`lab/digital-engine.html`), and newer and bigger than the engine in Shiftlight 3; don't use Shiftlight's |

## The renderer: Shiftlight 3 at Mobile

Shiftlight 3's look comes from its pipeline, not from expensive settings: on Mobile it looks almost the
same as on Ultra. The pipeline (`src/render/renderer.js`, shaders in `src/render/glsl/`):

- HDR forward rendering with clustered lights (`lights.js`, thousands per level)
- cascaded sun shadows, and a headlight shadow map with a real low-beam cut-off
- a cubemap probe at the car for reflections in paint, glass and water
- screen-space reflections on wet ground (`SSR_FS`), puddles and raindrop rings
- volumetric fog lit by the sun and the lamps (`FOG_FS`)
- TAA that rebuilds full resolution from a jittered, lower-resolution frame (`TAA_FS`), with dynamic
  resolution (`drs.js`)
- bloom, eye-like auto exposure (`EXPO_FS`), then `FINAL_FS`: ACES (Hill's fit), saturation and
  contrast grade, vignette, grain, lens rain
- the LED dot-matrix view as a switchable pass (`LED_FS`)
- specular anti-aliasing and procedural material detail everywhere (no textures)

The Mobile tier came in commit `b122814` ("Phones and tablets"); even frame pacing and drawing between
physics steps in `c15a83e`. Its numbers (`QUALITY.mobile` in `renderer.js`):

| | Mobile | Laptop tiers |
| --- | --- | --- |
| Sun shadow cascades | 1024, far cascade redrawn every 4th frame | 1024 to 3072 |
| Headlight shadow | 512 | 512 to 1536 |
| Reflection probe | 64, one face every 3rd frame | 128 to 256, every frame |
| Volumetric fog | 6 steps, 3 lights, quarter resolution | 10 to 28 steps |
| Screen-space reflections | 12 steps | 20 to 30 |
| Motion blur | off | on |
| Device pixels per CSS pixel | at most 1.25 | 1.5 to 2 |
| Render scale | at most 0.75, dynamic, TAA rebuilds the rest | up to 1.25 |

On the Pixel 7a that is about 1144 × 515 output pixels and about 858 × 386 drawn. Keep Shiftlight's tier
names (Mobile, Low, Medium, High, Ultra), Mobile by default on a touch screen, and its **P** performance
readout (frame time split, GPU time, resolution, GPU name).

### Fitting it to this game

- **Hooks.** `Renderer` draws the world it was given in `loadWorld(city, T)`; everything else (cars,
  particles) registers in `R.extra` with `prepare`, `opaque`, `glass`, `shadow` and `particles` hooks.
  The world, its chunks, trees, grass, cars and machines can all be drawn through these.
- **Lights.** `loadWorld` builds the `LightGrid` from `city.lights` over `info.lightGrid` (Shift City
  uses a 1520 m square). Showdown's world is about 3.2 km square, so the grid has to cover it or follow
  the camera.
- **Materials.** Shiftlight's world shader knows a city (asphalt, facades, the Flats). The land needs
  its own materials in the same system, ported from Showdown's `13_lit.js`: packed dirt with clods and
  stones, grass tufts, gravel, rock relief and cracks, drying-mud plates, wet mud, tarmac, the drag
  strip's grooves and chalk, two-track ruts with a grassy crown, water in ruts. Keep the bump detail and
  specular anti-aliasing, and fade detail with distance.
- **What gets replaced** in the Showdown copy: its drawing. That is `13_lit.js`, `52_world_gl.js`,
  `55_gfx.js`, `55_post.js`, `55_grass.js`, the drawing half of `53_fx.js`, the scene passes in
  `11_display.js` (its LED pass, bloom and tone map) and the GL plumbing in `12_gl_mesh.js`. Keep
  everything that makes geometry: `12_gl_mesh.js`'s mesh builder, `14_loft.js`, `21`–`33`, and the world
  builders in `50`–`51`. Keep the HUD drawn in dots (`61_hud.js`) over the clear picture, the way
  Shiftlight draws its dot-matrix HUD. Read each module before deciding; several mix both kinds.
- **Trees** are the weakest thing in every version: blobs. Make them the biggest single upgrade.
  Showdown already breaks crowns into clumps that glow with the sun behind them; with TAA, leaf cards
  with alpha-to-coverage become usable. Keep them cheap at Mobile.
- **Grass** you drive through (`55_grass.js`) is a laptop-tier effect. Find a cheap Mobile version or
  leave it for laptops.
- **The LED matrix** stays as a switchable display (Shiftlight's **L**), because every Dirt game has
  it. The default is the clear picture.

## Moods: time of day and weather

Three times of day (Showdown has them): **noon, golden hour, night**. Three kinds of weather: **clear,
rain, fog**. Any time with any weather. The title screen opens on a rainy night.

- **Rain**, like Shiftlight's Midnight Rain: puddles in ruts and low spots that mirror the sky and the
  lamps (SSR and the probe), wet mud and paint with a sheen, rain streaks, drops on the lens, splashes.
  The Sim level's wet grip already exists (damp, rain, downpour); the look follows it.
- **Fog** (new): ground fog through the volumetric pass, thick enough to cut the draw distance. Cull
  and stream to what the fog lets you see, so fog is the cheapest mood to draw. Headlight beams and
  yard lights show as cones in it.
- **Night** needs lamps; dark land with nothing glowing looks empty.

### Lights where they belong

Put lamps only where a real place would have power and a reason; country roads stay dark between
places. A mix of old sodium orange and newer white LED. Every lamp is a real light in the clustered
grid, and the bright ones cast into the volumetric fog.

- **The ranch and the shop:** yard lights on poles over the shop door and the barn, a porch light, lit
  windows.
- **Home:** a yard light and lit windows down the home lane.
- **The drag strip:** light towers at the start and the finish, the tree's lamps and the staging bulbs.
- **Speedway Park:** its light poles round the oval and the short course (already modelled) become
  real lights; the grandstand and pit lights.
- **Junctions on the county road:** one cobra-head light at a crossroads, a lit stop sign.
- **Bald Mountain:** the radio mast's blinking red light, seen from everywhere.
- **The dry lake:** none, apart from cones and markers with reflective bands.
- **Anything reflective** lights up in the headlights: road paint, sign faces, delineator posts, cone
  bands (Shiftlight's retroreflective paint).
- **Cars and machines:** headlights with the low-beam cut-off, the light bar, taillights and brake
  lights, the rivals' lights.
- **The sky:** the moon and stars.
- If the Open World country comes in later: street lights on a town's main street, a gas station
  canopy, the grain elevator's top light, porch lights on farms.

Showdown already has yard lights and headlights as spot lights, the light bar, the moon and the stars
(`59_daynight.js`); they move into the clustered lights.

## Sound

- **The first sound task** is HD's `TODO.md`: the engine sounds thin and high next to the lab's
  garage setting. Its notes say why (the open-air room, the listener distance) and list ideas (a low
  shelf at 100–150 Hz, more early body in the open-air room, a setting because a phone speaker turns
  bass into distortion). Log the RPM first, as it says. Make each change switchable and ask the owner
  to listen on the phone speaker and on headphones.
- **The owner wants to work on Digital Engine itself.** `lab/digital-engine.html` is the lab, exactly
  as the owner brought it. Its synth and sim (`src/audio/engine-dsp.js` and `src/engine/engine-sim.js`,
  between those markers and `lab/engine-lab.js`) hash the same as the block in Showdown, HD and the
  model bay (`aaa1d81c…`). Work on the synth in the lab, where it can be heard on its own, then copy it
  into `15_digital_engine.js` and run `tools/check_de.py`. Keep the lab openable on the phone so the
  owner can listen there too. Shiftlight 3's `lab/engine-lab.js` is an older, smaller lab; don't use it.
- **Ambience** for the moods: rain on the ground and the roof, wind, night insects and frogs by the
  pond, thunder far off in a downpour. The original Dirt Sleeper's `33_ambience.js` synthesises an
  environment live and is worth reading.

## Gameplay

Everything Showdown has, unchanged, plus the machines. Two things to extend:

- **Close calls** now count passing within 1.1 m of a collider (trees, posts). Count them past rival
  cars too.
- **Near misses with traffic** would need traffic. There is none in Showdown; Shiftlight 3 has a traffic
  system. Ask the owner before adding it.

## Phases

Stop at the end of each phase. Give the owner: what changed, screenshots (headless, see Tools), the
published page to open on the Pixel 7a, and what to check.

0. **Fork.** Copy Showdown into `rut-access/`, rename the title and the save keys, build it, and run
   every Showdown tool. It plays exactly like Showdown.
1. **The renderer.** Shiftlight 3's renderer draws Showdown's world and cars at noon, with the
   Mobile to Ultra tiers, dynamic resolution, TAA, the grade and the P readout. The HUD stays in dots.
   Check: the same places and cars, framed like the reference screenshots, and the frame rate on the
   phone.
2. **The land.** Ground materials, trees, water and mud, dust and spray, golden hour. Grass on laptop
   tiers.
3. **Night, rain, fog and the lights.**
4. **Every vehicle.** Mini Dirt Run Solo's machines and rider, in the garage with their parts and ratings.
5. **Sound.** The engine's low end, ambience for the moods, the mix on a phone speaker.
6. **The phone.** Hold the frame rate for 15 minutes of driving (the Tensor G2 slows down when it gets
   hot), boot time, shader warm-up behind the boot screen, touch controls, menus that fit 915 × 412.
   Consider 45 fps (every other refresh at 90 Hz) as a frame-rate choice alongside 60.
7. **Optional, ask first:** the career; Open World's procedural country round the two miles, streamed
   by its worker; traffic.

## Tools

- Showdown's tools (`physcheck.js`, `proving.js`, `races.js`, `cross.js`, `ladder.js`,
  `showdown_check.js`) keep working on the new page.
- `tools/check_de.py`: proves the game's Digital Engine block is the lab's.
- Headless screenshots: Chromium and Playwright are installed (`require('playwright')`; launch with
  `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Software rendering
  takes one to three minutes a frame, so stop the page's own animation loop and draw single frames
  through the game's hooks. `tools/shot_sl3.js`, `tools/shot_showdown.js` and
  `tools/shot_dirt_sleeper.js` made the shots in `docs/visual-comparison.jpg`, and `tools/sheet.py`
  laid them out; use them to put the new game beside the same shots.
- Shiftlight 3's `test/mobile.mjs` (an emulated phone) and `test/cpu.mjs` (game time per tier) are worth
  porting.
