# Mini Dirt Run Solo (MDRS)

A free-roam driving game for a phone held sideways (made on a Pixel 7a), drawn on an LED dot matrix:
the ranch and the mile of country round it from Dirt Sleeper Mini, seven cars you can build any way
the garage allows, and money for every cool thing you do. No racing: just you, the clock, and the dirt.

It started as a copy of the newest Dirt Sleeper Mini (the seven-car version) and goes its own way from
there; nothing here touches `dirt-sleeper-mini/`.

## Play

Open `mini-dirt-run-solo.html` in a browser with WebGL2. `./build.sh` rebuilds it from `src/` and also
writes `dist/mini-dirt-run-solo.artifact.html` (the same page without its outer tags) for publishing.

**On a phone** (sideways): put your left thumb down anywhere on the left side and slide to steer (or
pick Tilt in Settings). The gas pedal is analog: how high your thumb sits is how much throttle, so the
automatic shifts early when you go easy and holds on when you push. The brake works the same way; the
e-brake sits above it. Brake and gas together at a standstill is a line lock for a burnout (or the
trans-brake, on a race gearbox). Small buttons down the sides: camera, reset, horn, lights, nitrous, low
range, lockers and overdrive off, whichever the car has. The phone buzzes on shifts, the limiter,
landings and when a combo banks (Android).

**Keys**: W/S gas and brake (hold S to reverse), A/D steer, Space e-brake, Q/E shift, O overdrive off,
N nitrous, L low range, K lockers, J headlights, H horn, C camera, M map, R reset, I engine, Esc menu.
A game controller works too.

## What's in it

- **Feats that pay** (`src/57_feats.js`): drifts, jumps (distance, air time, a clean or sketchy
  landing), two wheels, saving it from a roll, speed runs on dirt and gravel, burnouts, close calls past
  the trees, splashes, the mud pit, Red Hill, the rock garden, laps of the race track and clock runs.
  Back to back they stack into a combo; the multiplier grows with each feat and more with each new kind.
  The combo banks after a few quiet seconds (or when you open the menu). Roll it, wreck it or reset first
  and the unbanked money is lost. Free play keeps your money as a score, your last ten cool things and
  your bests on the device.
- **The garage** (`src/55_rigs.js`, `src/63_garage.js`): every car has its own list of parts that
  plausibly fit it, in 19 slots (engine swaps, turbos and blowers, intake, exhaust, cam, tune, nitrous,
  gearbox, axle gears, transfer case, diffs and lockers, tyres, suspension, shocks, brakes, weight, body
  kit, wheels, paint). Tyres too big for the ride height, slicks on a lifted truck and the drag slicks
  without the tubbed body say why they don't fit. The factory builds are presets you start from.
  In free play every car and part is yours. "Build it for me" tries every part twice round and keeps the
  best for what you're building for.
- **Ratings, 0 to 50, on six kinds of ground** (`src/56_ratings.js`): dirt road, gravel road,
  mountainside, rock crawl, mud and asphalt, each a course built like the place on the map where you can
  feel it. A quick simulator drives each rig through each course with the physics' own numbers (the
  engine's torque curve through its gears, the tyre grip and mud drag tables per tread and surface,
  weight, drag, downforce, travel, clearance from the body's lines, centre of gravity against the track,
  brakes, lockers, low range). 50 is a little better than the best factory build on that course. Pick one
  as what you're building for and every part shows what it does to all six. 0-60 is measured on the
  game's physics. `tools/terrain_check.js` drives the factory builds through the real mud pit, Red Hill
  and rock garden to check the ratings put them in the right order (they do, broadly).
- **Phone controls** (`src/64_touch.js`) and **detail** that steps itself down if the frame rate drops.
  Phones start on the fine 960 x 540 dot grid.
- **Night** (`src/58_sky.js`): a moon, stars, fog that closes in (so less is drawn), headlights, and the
  ranch's lights: the shop's yard lights, the strip's poles, the canopy at Feed & Fuel, the porch at home
  and the paddock's floodlights. Pick High noon or Night in the menu.
- **Clock runs**: Home to Feed & Fuel, Feed & Fuel to the top of Red Hill, the shop to the pond, the race
  track to home, the mud pit to the race track. Any route, against a par time.
- **The stock SUV drives like the real 2006 truck it's modelled on**: the 4.6 V8's torque curve reshaped
  to the real one (300 lb-ft at about 3,950 rpm, 294 hp, a 5,900 rpm redline), a two-speed transfer case
  with low range, an overdrive-off button, and a progressive gas pedal so the six-speed automatic shifts
  around 3,800 rpm at a light pedal and near 6,000 floored. 0-60 in 7.6 s, the quarter in 15.8 s at 90
  (`tools/drag_check.js`). The engine's sound is the Digital Engine's, unchanged.
- The e-brake on an all-wheel-drive car lets the centre diff go while it's held, like a rally car's
  hydraulic handbrake, so the car turns about its nose.

## Tools

| Tool | What it does |
| --- | --- |
| `tools/load.js` | Loads the modules in Node without a page, for the other tools. |
| `tools/smoke.js` | Opens the built page in headless Chromium at phone size and saves screenshots. |
| `tools/feats_check.js` | A robot drives the real ranch and checks the feats fire and pay. |
| `tools/drag_check.js` | 0-60, the quarter mile and the shift points at several pedal positions. |
| `tools/terrain_check.js` | The factory builds through the mud pit, up Red Hill and over the rocks, beside their ratings. |
| `tools/proving.js` | Dirt Sleeper Mini's proving ground: drag, grip and brakes on flat ground. |

## Next

Quads (a kids' 90 cc, a 450 sport quad, a utility ranch quad), the odd vehicles (golf cart, go-kart,
tractor, semi), then the career: the slow grind, where the money buys the parts and the odd vehicles
are joke rewards.
