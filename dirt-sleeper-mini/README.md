# Dirt Sleeper Mini

The same off-road game as Dirt Sleeper, rebuilt light. Dirt Sleeper's high-detail mode lags a laptop
once the truck starts rolling over; Mini draws everything on Shiftlight 2's LED dot-matrix pipeline
instead (one small HDR scene target, the LED dot pass, two-level bloom, ACES). The engine sound will be
Digital Engine's, used exactly as it is.

The first step is the truck. `dist/model-bay.html` is a model bay: one original, fictional mid-2000s
SUV (no real badges, names or signature grille) in four builds, on a turntable in a dark bay or a light
cyc.

- **Stock**: as it left the factory. Chrome twin-bar face, six-spoke 17s on 245/65R17 all-seasons,
  roof rails with crossbars, 4.6 V8.
- **Sleeper**: dropped two inches on 20-inch ten-spokes with big red brakes, split-mesh face, smoked
  lamps, hood scoop, lip, roof spoiler, LED tails, copper pinstripe.
- **Rock & Mud**: six-inch lift, 37-inch mud-terrains on beadlocks, solid axles on coilovers, steel
  bumpers with winch and shackles, sliders, snorkel, expedition rack, mud.
- **Race**: bolted widebody, 18-inch centre-locks on slicks, splitter, canards, diffuser, GT wing,
  vented hood, roof scoop, side-exit exhaust, white-and-red livery.

Drag to orbit, wheel or pinch to zoom, double-tap to reset. The dock picks the build, the view (front
¾, side, rear ¾, front, rear, top, low, or all four side by side), paint, mud, lights, steering, spin,
the studio and the dot resolution.

## The engines

Each truck has its engine, and the sound is Digital Engine's synth, unchanged. The Engine tab in the
dock starts it (or press I) and gives you the lab's car controls: Free rev or Drive, throttle (hold
Space, 1 to 9 for part throttle, or the pad), brake S, shifts Q and E, nitrous N, purge P, blip B, and
where you listen (V: behind, cabin, trackside), plus the lab's three rooms and a volume slider.

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
- `src/17_sound.js`: the lab's audio graph (master gain, its compressor, the room convolver and send)
  and its loop (four sim steps a frame, events, then params). Also the dot-matrix shift lights, tach,
  gear and speed, the body rocking on revs, wheels turning in Drive, brake lights and exhaust flames
  when the synth fires a bang.
- `tools/engine_check.js` runs each engine through the sim and synth offline and reports power,
  levels, clipping and NaNs (`--wav DIR` writes the audio).

## How the truck is made

- `src/20_suv.js`: the body is lofted from designed lines (profile, belt, sill, plan) into 27-point
  sections, with the greenhouse grown from the deck, superellipse wheel arches and hips over both
  axles. Lamps, grilles and trim are decals projected onto the skin from the front, rear, top or sides.
- `src/21_faces.js`: four faces and four tails.
- `src/22_parts.js`: suspension, flares, bumpers, roof gear, spoilers, exhausts and extras.
- `src/23_wheels.js`: wheels and tyres, built once per build and drawn four times.
- `src/24_builds.js`: the four builds. Each one is a `look` (ride height, track, tyres, face, tail,
  parts) plus paint, mud and specs.
- `src/13_shader.js`: one lit shader with material IDs (paint with flake and livery, mud by height,
  cladding, glass, chrome, lenses, rubber, mesh, brakes).
- `src/10_core.js`, `11_display.js`, `12_gl.js`: Shiftlight 2's fonts, HUD buffer and display pipeline.

About 48k to 60k triangles per truck, built in a few hundred milliseconds.

## Build and check

```sh
./build.sh                       # writes dist/model-bay.html (and an artifact copy)
python3 tools/shots.py '{"builds":[0,1,2,3],"views":["front34","side","rear34"]}' /tmp/sheet.png
```

`tools/shots.py` renders the bay headless with Playwright and SwiftShader and stitches a contact sheet.
