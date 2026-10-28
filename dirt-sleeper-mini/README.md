# Dirt Sleeper Mini

The same off-road game as Dirt Sleeper, rebuilt light. Dirt Sleeper's high-detail mode lags a laptop
once the truck starts rolling over; Mini draws everything on Shiftlight 2's LED dot-matrix pipeline
instead (one small HDR scene target, the LED dot pass, two-level bloom, ACES). The engine sound is
Digital Engine's, used exactly as it is.

Two pages come out of `build.sh`:

- `dist/dirt-sleeper-mini.html`: the game. Free roam on Dirt Sleeper's ranch and the country round it, with the four trucks.
- `dist/model-bay.html`: the model bay. The four trucks on a turntable, with their engines.

## The game

Free roam on a mile-square map with the ranch in the middle: the shop and its yard, the dirt drag
strip, the burnout pad, the mud pit, the rock garden, the hill climb up Red Hill, the trail loop with
its kickers and creek, and the mud track that fords the creek twice. Round the ranch:

- Gravel county roads with ditches, fences and a power line: the county road east to west below the
  ranch, Range Road north from a crossroads, the forest road west through the woods and West Road back
  down. The ranch drive runs out of the yard to the county road.
- Feed & Fuel at the crossroads: a store with a canopy and pumps, a feed barn with a loading dock,
  grain bins, stop signs.
- A home place off the county road at the end of a long lane of muddy ruts (finer than the ground
  grid, so the wheels sit in them): a white farmhouse with a porch, a red barn, a utility trailer, a
  swing set and a trampoline.
- Woods across the north with a two-track trail that splashes through the shallow end of a pond, and a
  trail up to it from the ranch's trail loop.
- A paved road course in the south-east: 1.6 km of asphalt with kerbs, gravel traps and tyre walls, a
  paddock with garages, a pit wall, a grandstand and a start gantry. Laps are timed (over the line,
  past two checkpoints, over the line again) and the best for each truck and level is kept.

The corner map scrolls with the truck; M (or a tap on it) opens the whole map. The menu (Esc) picks the
truck, the driving level, where to go, the camera and the volume.

Three driving levels:

- **Realistic** (the default): ABS, the automatic gearbox and, on the Stock and the Sleeper, the
  factory all-wheel-drive traction control that brakes a spinning wheel so the others pull. It slides,
  spins its tyres and rolls.
- **Middle**: a steering helper, stability control and traction control.
- **Kids**: all of that, extra grip, a hand that keeps it on its wheels, about 40 mph at most, and it
  flips itself back over if it does go over.

Keys: W/↑ gas, S/↓ brake and reverse, A/D steer, Space handbrake, Q/E shift, N nitrous, L low range,
K lockers, H horn, J headlights, C camera, M map, R reset, I engine, Esc menu. A game controller works too. On a phone
or tablet there are on-screen pedals.

- `src/50_physmath.js`, `51_tyre.js`, `52_tune.js`, `53_vehicle.js`: Dirt Sleeper's physics (Shiftlight
  3's vehicle with Dirt Sleeper's off-road changes), at 240 steps a second. The three driving levels are
  its assist sets.
- `src/54_truckphys.js`: each build's chassis by Dirt Sleeper's rules (springs from ride height, shocks,
  sway bars, brakes, grip and rolling resistance per tread and surface), with the body's real size.
  The Stock runs all-season tyres and the Sleeper street performance tyres; both have the factory
  traction control and a torque converter, so they pull out of muddy ruts the way the real truck does.
  The Rock & Mud has mud tyres, lockers and low range; the Race's slicks still bog in mud and slide on grass.
- `src/59_country.js`: the country round the ranch. It hooks into the ranch build at each stage (the
  shape of the land, carving, the surface map, the ground in the lane's ruts, the geometry). Roads that
  cross meet at one level; ditches fill in at junctions.
- `src/60_ranch.js`: Dirt Sleeper's ranch code. The ranch itself builds the same: its land, trails and
  surfaces match the old build (apart from the last metre of the old edge hills at its corners), and the
  speed-ups give the same answers. The edge hills moved out to the mile, the trees are drawn instanced
  (and on hillsides they are solid now; before, the truck could pass through them), and new surfaces
  (gravel, asphalt, ruts) carry their own grip and rolling resistance in `54_truckphys.js`.
- `src/61_ranchmesh.js`: the ground in 64 m tiles, each meshed at 2, 4 and 8 m with skirts; the fine
  mesh is made only round the truck. Props in tiles, trees instanced (full near, one lump far), the sky.
  The busiest views draw about 70 to 90 thousand triangles of world, fewer than the ranch alone did.
- `src/62_fx.js`: dust, mud clods and creek spray, at most 360 at once in one instanced draw.
- `src/70_game.js`, `71_hud.js`, `72_menus.js`: the loop, the camera, input, the engine sound from the
  powertrain, the dot-matrix HUD and map, and the menu.

## The engines

Each truck has its engine, and the sound is Digital Engine's synth, unchanged.

| Truck | Engine | Peak | Gearbox |
|---|---|---|---|
| Stock | 4.6 V8, factory | 287 hp | six-speed auto, 3.73 |
| Sleeper | twin-turbo 3.5 V6, bigger turbos, 250-shot | 638 hp | race four-speed, trans-brake, 4.56 |
| Rock & Mud | 7.4 big-block, Roots blower, race cam, 35-shot | 1,027 hp | race four-speed, trans-brake, 5.38 |
| Race | 7.4 big-block, twin turbos, wild cam, 250-shot | 1,216 hp | six-speed sequential, straight-cut |

- `src/15_de_engine.js`: Digital Engine's `engine-dsp.js` and `engine-sim.js`, byte for byte.
  `tools/check_de.py` proves it (and the built pages) still match the lab.
- `src/16_engines.js`: the four engines as Digital Engine specs, built with the lab's own
  `SIM.makeSpec` from Dirt Sleeper's engine table and bolt-on rules.
- `src/17_audio.js`: the lab's audio graph (master gain, its compressor, the room convolver and send).
  In the game the powertrain feeds the synth (Dirt Sleeper's `soundParams`, with the listener placed
  from the camera); in the bay the lab's own EngineSim does (`src/39_bayengine.js`).
- `src/18_instruments.js`: Shiftlight 2's shift lights and tach for the dot matrix.

## The model bay

Drag to orbit, wheel or pinch to zoom, double-tap to reset. The Look tab picks the view (front ¾, side,
rear ¾, front, rear, top, low, or all four side by side), paint, mud, lights, steering, spin, the
studio and the dot resolution. The Engine tab starts the engine (or press I) with the lab's car
controls: Free rev or Drive, throttle (hold Space, 1 to 9 for part throttle, or the pad), brake S,
shifts Q and E, nitrous N, purge P, blip B, where you listen (V), the lab's three rooms and a volume
slider. [ and ] switch trucks.

## How the truck is made

- `src/20_suv.js`: the body is lofted from designed lines (profile, belt, sill, plan) into 27-point
  sections, with the greenhouse grown from the deck, superellipse wheel arches and hips over both
  axles. Lamps, grilles and trim are decals projected onto the skin from the front, rear, top or sides.
- `src/21_faces.js`: four faces and four tails.
- `src/22_parts.js`: suspension, flares, bumpers, roof gear, spoilers, exhausts and extras.
- `src/23_wheels.js`: wheels and tyres, built once per build and drawn four times.
- `src/24_builds.js`: the four builds. Each one is a `look` (ride height, track, tyres, face, tail,
  parts) plus paint, mud and specs.
- `src/13_shader.js`: one lit shader with material IDs (paint with flake and livery, mud, cladding,
  glass, chrome, lenses, rubber, mesh, brakes, and the ranch's ground, rock, water and timber).
- `src/10_core.js`, `11_display.js`, `12_gl.js`: Shiftlight 2's fonts, HUD buffer and display pipeline.

About 48k to 60k triangles per truck, built in a few hundred milliseconds.

## Build and check

```sh
./build.sh                                   # both pages, plus artifact copies
python3 tools/check_de.py                    # the synth is still the lab's
node tools/engine_check.js                   # each engine through the synth, offline
node tools/phys_check.js                     # each truck and driving level on flat ground
node tools/ranch_check.js                    # the ranch: size, tiles, the ground at each area
node tools/ranch_drive.js [level]            # a driver through the ranch's mud pit, rocks, climb, mud track, a jump
node tools/country_drive.js [level]          # the home lane, the county road, a timed lap, the woods trail, a ditch
node tools/world_map.js map.ppm 800          # a top-down map of the whole world
python3 tools/tri_count.py                   # triangles drawn at spots round the world
python3 tools/game_shots.py '{"runs":[{"name":"mud","build":2,"place":"mud","keys":["KeyW"],"secs":3}]}' /tmp/g
python3 tools/shots.py '{"builds":[0,1,2,3],"views":["front34","side","rear34"]}' /tmp/sheet.png
```

The shot tools render headless with Playwright and SwiftShader (slow: software GL takes a minute or
more per game frame; a real GPU takes milliseconds).
