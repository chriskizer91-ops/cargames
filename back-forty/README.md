# Back Forty

Dirt Sleeper HD's game (its cars and garage, the Sim level, feats and combos, phone controls, and its renderer
modelled on Shiftlight 7) in Mini Dirt Run Open World's forty-mile world, made as you drive. Its own game with its
own name and its own saves (`b40-`), kept apart from every other folder in this repo.

Open `back-forty.html` in a browser with WebGL2. `sh build.sh` rebuilds it from `src/`.

## Where it comes from

- **Dirt Sleeper HD** (`dirt-sleeper-hd/` on `claude/zealous-noether-iab04x`): every module except the world.
- **Mini Dirt Run Open World** (`mini-dirt-run-open-world/`): the generator (`src/50_worldgen.js`, unchanged except
  the public roads' material, 56 -> 58, since HD uses 56 and 57), the chunks round the camera (`src/51_world.js`,
  from `world_rt.js`), the world's dev panel and cruise control (`src/52_world_dev.js`, from `game_dev.js`), the
  maps (in `src/61_hud.js`, from `game_maps.js`) and the places.
- **The Digital Engine** synth, byte for byte (`src/15_digital_engine.js`, sha256 of the block `aaa1d81c...`).

## What changed to put the open world under HD's renderer

- **A floating origin.** The GPU draws everything relative to RO, the camera's spot rounded to 512 m, at sea
  level (`setOrigin` in 51_world). Because it moves in whole steps and never up or down, HD's height fog,
  cascaded shadows, reflection probe and post passes work as they did; the cascades and the probe are redrawn
  when it moves. `camMats` keeps a world-space view (`VPw`) for culling and gives the passes `eyeR`.
- **Textures anchored to the world.** Each draw's `uOrg` is the origin minus the 8,192 m cell its chunk starts in;
  the ground's procedural detail uses `Pw = vP + uOrg`, so it never crawls or pops as the origin moves.
- The cascades' casters are the chunks' buildings, poles and trees (`worldCasters`); the probe draws the near
  world only. The far tiles sink under the chunks by distance from the camera.
- When the origin moves, the cascades' and the probe's matrices are shifted by the step instead of redrawn.
- The public roads (material 58) are drawn in HD's style, with its asphalt detail and a wet sheen in rain.
- No blades of grass at any level, for good (the owner's call): the ground's own grass colour carries it, and that
  budget goes on the vehicles and the physics. `55_grass` is gone from the build.
- Races and clock runs are hidden: their courses were the old ranch's.

## The engine's sound

The synth is untouched. What changed is how it is heard (Settings, "The engine's sound"):

- **Heard from: Like the bay** (default). The lab's Behind spot, 3 m back and square on, as the model bay hears it.
  HD heard it from the chase camera, clamped to 5 m and panning as the camera swung: 4.5 dB quieter.
- **Body.** An engine bus after the synth: a low shelf, a low-mid bell and a high shelf. *Fuller* (default on a
  laptop) is +6 dB under 140 Hz and -2 dB over 5 kHz; *Phone speaker* (default on a phone) lifts the low mids
  instead (+3.5 dB at 320 Hz), since a phone's speaker turns deep bass into buzz; *As the lab* is flat.
- **Room.** Auto: the lab's garage inside a building, open air outside. Or Open air, Garage or Tunnel.
- **1 to 9** on the keyboard are part throttle (10 to 90 % gas), as in the lab and the model bay. HD's automatic
  shifts early at part throttle, so this is how to cruise at low revs from a keyboard.

Measured offline (`tools/engine_tone.py`, the stock SUV's own physics on Route 6, through the DSP): at full gas
the bay's spot is 4.5 dB louder than HD's with the same tone; Fuller takes the share of energy under 250 Hz from
33 % to 49 % and the spectral centroid from 490 to 380 Hz. Ears decide: try it on the laptop and on the phone.

## The showroom and the garage

The game opens in the model bay's stage: the shed with every vehicle parked in it, and the turntable. The Garage
tab's **Open the bay** pops the turntable out into a window of its own that fills the whole screen (the dots take
the window's shape, at the pitch the 16:9 picture would have had: `bayFill` in 60_game), with two panels: **Look**
(studio, views, spin, hood, lights, wash, and a pad to rev it while you look) and **Engine**, the Digital Engine
lab over the car (below). Drag to orbit, pinch or wheel to zoom; Esc or Back closes it. Keys in the window:
W/Up/Space gas, 1-9 part gas, S brake, Q/E shift, B blip, N nitrous, P purge, J jake brake, H horn, I engine,
V where you listen, M mode.

### The dyno lab (63_dyno_lab)

The Engine panel is the Digital Engine lab's own interface, its look and its code, driven by the bay's engine (the
car's engine as its parts built it, Plus, the dyno pull, the bay's rooms and listening spots): the lab's tachometer
with its fifteen shift lights, the big gear, mph and live horsepower, the throttle, boost and nitrous (or jake)
bars and the chips; the lab's throttle pad (higher up, more throttle) and buttons (the semi gets its jake brake,
every vehicle a horn); the dyno's row (Dyno pull, what the drums read now and the run's peak, Plus); Free rev or
Drive, where you listen, the room, the volume. Its panels open in the cluster's place: **Dyno sheet**, **Engine**
(torque and power at the crank, with where it is now), **Firing** (the lab's firing-order crank and banks),
**Sound** (one engine cycle of pressure at your ear) and **Spectrum** (the scrolling spectrogram with the firing
note traced), both from an analyser on the game's engine bus, and **Tune**.

**Tune** is the lab's setup sheet, live on the car's engine: layout, displacement (torque goes with it, litre for
litre), redline, cam; knock and clatter, pulse length, roughness, diesel; induction, boost, turbo size, blow-off,
anti-lag, intake; exhaust system, pipe length, pops; automatic shifts and traction control (dyno only),
straight-cut gears, launch control and its revs, the limiter; the nitrous shot; the horn and a jake brake. The bay's
engine follows each slider as it moves; the car you drive takes it a moment after you let go (`TUNE` in
16_engines, kept per car and per the engine parts it was tuned on, `b40-tune`). **Reset to preset** gives the
parts' own engine back; **Copy engine spec** copies it as the lab does.

Upright, the instruments and the hands and feet stack at the bottom and the car fills the top; sideways, the cluster
and the dyno row on the left, the controls on the right, the car between them; on a laptop the same with more
room. The camera fits the car into what the panels leave free. Drawn for a phone: the dial's face is drawn once
and kept, the glow is a soft stroke under a sharp one rather than a live blur, the slower panels draw every other
frame on a touch screen, and the frosted glass is only on a mouse-driven screen. The perf overlay's HUD timer is
the lab's cost while it's up.

**Drive** puts the car on a chassis dyno: a steel deck rises under it, a drum under each driven axle, straps, a fan
off the front corner. The lab's EngineSim drives it through the gears (its automatic, or Shift up and down; hold
Brake at a standstill to rev against it). Only the driven wheels turn; the body squats nose-up as the wheels
pull, nods at each shift, rocks to the engine's torque.  The machines keep their start gears, CVTs and governors.

**Dyno pull** runs a pull the way a shop does: rolls up through the gears to about a third of the redline in the
gear nearest 1:1, holds it, then wide open to the redline with the dyno's absorber holding the sweep to about eight
seconds. The **sheet** shows power at the wheels and torque (worked back from power and revs, so they cross at
5,252), the engine's own power at the crank, and that car's pull before, faint, to see what a part changed. Each
car's last sheet is kept (`b40-dyno`).

In the bay's window the picture spends what the open world would cost on the one car: up to 1.25 times the
screen's pixels, the occlusion pass, every studio lamp, a real shadow map for the key light (an overhead softbox in
the dark bay), the car reflected in the turntable's glossy disc, and the flames and their flash when it bangs at
the limiter. It steps down by itself if the frame rate can't hold. The camera fits the car into what the controls
and the sheet leave free.
(`src/63_showroom.js`.)

## The star SUVs

The Sleeper and the Rock & Mud are the game's stars and its fastest vehicles, as built and with Plus (the top four
spots). The Sleeper runs a built 3.8 twin-turbo V6 (`tt38`) on 3.55 gears; the Rock & Mud a 10.4 big-block (`bb104`,
a 632) under its Roots blower on 4.10 gears. Both engines are SUV-only parts in the garage. Measured on the game's
own physics (flat tarmac, Realistic, 200% traction): Rock & Mud 249 mph (258 with Plus), Sleeper 242 (252); the next
fastest is the Muscle drag build at 224 (237).

## The Plus tune

**Plus** (Drive tab, after the build presets, and in the bay's Engine bar) gives any car, on any build, 15% more
power (the engine's torque at every rev) and a final drive 15% taller; its name gets a +. Most builds are held back
by their redline in top gear rather than the air, so power alone adds little top speed; with the taller gearing
Plus adds 4 to 16% top speed and is as quick or quicker off the line. The dev panel sets both (Plus power, Plus
gearing); about 150% power with 115% gearing gives close to 15% more top speed on everything.

## The machines

From Mini Dirt Run Solo (`src/34_machines.js`): the kids' quad (governed), the 450 sport quad, the ranch quad,
the side-by-side, the golf cart, the go-kart, the tractor and the semi, with their CVTs, start gears, the semi's
jake brake and road-speed governor, the rider's lean as weight, bailing off, and the helmet cam. The gearbox
fixes they need are gated by `e.mach`, so the cars' physics is bit-identical (`physcheck.js` worst difference 0).
`tools/machine_check.py` drives each one: creep, pull-away gear, top speed, rpm, CVT and governor, NaNs.

## Measuring on the phone

F shows the world's numbers and the performance overlay: frame time (average and the 1 % low), the JavaScript's
share of each frame, draw calls, triangles, the world's GPU memory, and a graph of the last four seconds with
lines at 60 and 30 fps. Under it, **each frame's milliseconds by section** (physics, world, shadows, probe, scene,
post, HUD, sound, and the trees' share) with the physics steps, chunks made and tree lists remade a frame, and the
**last spike**: the breakdown of the frame before the last one over 30 ms. If its sections add up to much less than
the spike (UNSEEN), the time went where JavaScript can't see it: the GPU, garbage collection or the browser.
The Dev tab can switch off the sun shadows, reflections, far land, trees and the post passes one at a time, to read
each one's cost by subtraction.

What changed after the first Pixel 7a run (about 60 fps, 1 % lows of 23 to 30 near trees):
- Each pass (the view, each cascade, the probe) keeps its own tree list in its own GPU buffers and remakes it
  only when it crosses an 8 m cell, a chunk's trees arrive or go, or the chunks in sight change. Before, every
  pass walked every tree in range and re-sent them all, three or four times a frame.
- What the world worker sends back becomes meshes a few milliseconds' worth a frame (2.5 ms on a phone), not all
  at once when several chunks land together; no limit for 4 s after going somewhere, or while the ground under
  the car is still to come.
- The clear display's scene size follows the middle frame of the last two seconds and changes at most every 4 s
  down or 8 s up (each change reallocates the scene's targets, which itself makes a slow frame).
- At most eight physics steps a frame; the HUD's texture is updated in place, not reallocated every frame.
- Auto detail no longer touches the clear display and no longer saves the dots it lowers to.

## Keys

W/Up gas, 1-9 part gas, S/Down brake and reverse, A/D steer, Space e-brake, Q/E shift, O overdrive off, N nitrous,
H horn, L low range, K lockers, J lights, C camera, M map, F world numbers, Y cruise (holds the road), T traction
(dev), R reset, I engine, Esc menu.

## Smooth text

Every word the game draws over the picture (the HUD, the maps, feats and combos, run messages, the dev numbers) is
drawn crisp in the UI's typefaces on its own canvas (`#txt`) at the screen's full sharpness, instead of in the dot
font: Chakra Petch for words, Saira Condensed for numbers, built into the page (`shell/fonts.html`, written by
`tools/embed_fonts.py` from Fontsource's Latin files, SIL Open Font License, in `tools/ref/fonts`). The layouts are
unchanged: a call queues its words where the dot font would have put them, widths come from the real font so what
sits beside them still lines up, and the canvas is redrawn only when the words change (`TXT` in 10_core). The race
numbers painted on the cars stay in dots. Dev panel, **Text on screen**: Smooth or Dots.

## Checks

- `tools/boot_check.py [gfx] [s] [out.png]`: boots, reports page errors and the world, saves a frame.
- `tools/shot.py PLACE out.png [gfx] [wait]`: a frame from any place in Go to.
- `tools/drive_check.py [place] [s] [car]`: drives with the cruise control, no drawing; NaNs, ground readiness,
  steps at chunk seams, origin moves.
- `tools/engine_tone.py [car]`: the engine's level and spectrum, HD's way and the bay's, with each body setting.
- HD's `tools/physcheck.js`, `proving.js`, `races.js` still apply to the unchanged physics modules.

## Fast tumbles (40_physics)

At 260 mph into a tree the Rock & Mud went into a tumble whose spin fed on itself in the air: the plain Euler step of
the gyroscopic term adds energy every step, so the spin grew without limit until the numbers became NaN and the
screen went black. Above 10 rad/s the gyroscopic step now keeps the rotational energy it started with, and the spin
is capped at 38 rad/s (about six turns a second); below 10 rad/s nothing changed, so physcheck is still 0. As a
backstop, a car whose state ever turns non-finite is put back at the last place it was whole (kept every half second
by `carWhole` in 60_game), the camera is reset, and the screen says Reset.

## The game sheet (draft)

`python3 tools/game_sheet.py` writes `back-forty-game-sheet.html`: one page describing the game, the two star SUVs,
top speeds, the full performance sheet (as built and Plus) and every build's parts, engine spec and what holds its
top speed (the limiter in top gear, a governor, or the air). It reads `tools/ref/sheet_builds.json` (pulled from the
game with `tools/ref/sheet_extract.js` through `__game.parts`) and `tools/ref/sheet_perf.json` (the measured rows).
Put a picture named for a slot (`cover.jpg`, `suv-crawler.png`, ...) in `tools/ref/shots/` and it is embedded in
that slot. A draft for the owner: not shipped with the game.

The **Rock & Mud+ specifications** section writes the star with Plus up as a real car's spec sheet: engine, drivetrain,
chassis, dimensions, weight, off-road, aero, a full timed sheet (0-30 to 0-250, quarter, half and standing mile,
60-0 and 100-0 stops), speeds in each gear and the build's parts at garage prices. It reads `tools/ref/rm_specs.json`
(`tools/rm_specs.py`: the build's model, chassis and engine from the game) and `tools/ref/rm_perf.json`
(`tools/rm_perf.py`: timed runs, shift points and stops). Details the game doesn't model (bore and stroke,
compression, blower size, fuel, seats, construction) are marked B, for builder's spec.

## Next

- Phone tuning from the new overlay numbers (the last-spike line says which section to cut).
- Vehicle detail where it's nearly free on a phone (it's confined to the car's pixels): brake discs and calipers
  through the spokes, visible links and steering arms, metallic flake and clearcoat, the near cascade fitted
  tight round the car for crisp self-shadowing.
- The career: money buys parts, the odd machines as joke unlocks.
- Races on the generated roads; HD's venues as landmarks.
