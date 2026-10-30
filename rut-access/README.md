# Rut Access: Road Not Found

The next game in the Dirt Sleeper line: Dirt Sleeper Showdown's driving, cars, races and stunts, with
Mini Dirt Run Solo's quads and odd machines, drawn by Shiftlight 3's renderer at its phone settings, for a
Pixel 7a. Noon, golden hour and night; clear, rain and fog; at night, lamps where a real place would have
them.

[`BRIEF.md`](BRIEF.md) is the plan: what the game is, where every piece comes from, what must not change,
and the phases to build it in. This README says where the build stands.

Open `rut-access.html` in a browser with WebGL2, or on a phone held sideways.

## Where it stands

**Phase 1, the renderer, is done.** The game is drawn by Shiftlight 3's renderer (`src/11_sl3.js`, bundled from
`chriskizer91-ops/shiftlight3`): HDR with the sun through cascaded shadow maps, the lamps in a clustered light
grid, the car's headlights with a real low-beam cut-off and their own shadow map, a reflection probe at the car
that the paint, glass, chrome and water show, screen-space reflections on wet ground, volumetric fog, TAA that
rebuilds full resolution from a jittered lower-resolution frame with dynamic resolution, bloom, eye-like auto
exposure and the ACES grade. Everything Showdown drew still comes from its own meshes and materials
(`src/13_lit.js` carries Dirt Sleeper's ground, car and tree materials into the renderer's lighting), through the
renderer's hooks: the land (`52_world_gl.js`), the cars (`60_game.js`), the dust and spray (`53_fx.js`). The
car models are the shapes they were. The HUD is still drawn in dots, over the clear picture or as part of the
LED matrix.

- **Graphics** has Shiftlight's tiers, Mobile to Ultra; Mobile is the default on a touch screen. Changing the
  tier restarts the page on it (the renderer's targets are sized by the tier).
- **Display**: the clear picture is the default; LED dots is the matrix every Dirt game has had, now drawn at
  twice the dot pitch and sampled per dot. The dot count (Dots) is the HUD's grid too.
- **P** (or Settings) shows the performance readout: frames a second against the beat the screen is paced
  to, where each frame's time goes, the GPU time where the browser reports it, the resolution being drawn, the
  tier, the triangles, the graphics chip.
- Frames come on an even beat: every refresh of the screen, or on a phone that refreshes faster than 75 Hz,
  every second one (45 fps on a 90 Hz Pixel 7a), and the dynamic resolution aims for that beat.
- **Dev: the look** (the Dev tab) has the judgment calls to A/B on the phone: saturation, contrast, exposure,
  haze, ground detail, sun shadows on and off, the shade under the cars.
- Day and night are in the renderer's units now (`59_daynight.js`); the ranch's own lamps and the fixtures
  (Feed & Fuel, home, the paddock, the speedway, the mast) are real lights in the grid. Night, rain and fog get
  their proper pass in Phase 3; the grass you drive through comes back in Phase 2 (`tools/ref/55_grass.showdown.js`
  is Showdown's, kept for it).
- Physics, proving and the whole-race check are unchanged and pass; `tools/check_de.py` proves the Digital
  Engine block is the lab's.

**After the first phone playtest** (the owner's notes on Phase 1):

- **The car is solid again.** The renderer switches back-face culling on before it hands the frame to the
  game's hooks, and Showdown's meshes are two-sided (the shader turns each normal to face the eye), so half
  the body's triangles were being culled and you saw through the car. The land and car hooks switch culling
  off (`52_world_gl.js`, `60_game.js`).
- **The menu pauses the game.** Showdown kept stepping the physics under the menu with the brake held, and a
  brake held at a standstill for half a second is how the physics engages reverse, so the car drove itself
  backwards at full throttle while you read the menu. Now nothing steps while the menu or the results are up;
  the engine's sound settles to idle instead of droning where it was caught; a car rebuilt in the garage
  settles onto its springs in a burst there and then (handbrake only, so reverse can't engage); opening the
  menu lets go of every touch input. The physics itself is untouched.
- **The garage has the model bay** (`63_bay.js`, Dirt Sleeper Mini's bay in the Garage tab): Look: eight
  views, spin, drag the picture to turn the car, hood up with the engine bay built and drawn, lights, wheels
  turned, paint swatches, a mud slider. Engine: start, free rev or drive through the gears on the Digital
  Engine lab's own sim with the car's own engine spec, heard from behind, inside or trackside, in the open,
  a garage or a tunnel, a hold-to-rev pad, brake, shift, nitrous, purge and blip, volume, and the engine's
  description with its peak figures. The engine you leave running is running when you drive off. Saved as
  `rut-bay`. Not brought over: the Mini's studio stages (the car stands in the world, with the Drive tab's
  time of day), Compare, and the all-cars shed with "start all".
- **Dev: the engine note** (the Dev tab): bass, body and treble shelves and a touch of grit (soft saturation)
  on the game's own EQ in front of the lab's compressor, so every engine moves together; the owner sets them on
  the phone and the numbers they land on become the defaults. Saved as `rut-tone`. At 0 the chain is the lab's.
- **The phone's bar** shows only Menu on a touch screen (the graphics tier is in Settings; the Dots chip only
  with the LED display); the performance readout sits under the HUD's name block, clear of the tach and the
  car, and a tap closes it.
- No grass to drive through and no 3D objects on the ground beyond the rocks and the trees as they are: the
  owner's call. Showdown's grass reference is gone from `tools/ref`. The ground's detail will come from
  texture packs the owner has made (`TEXTURES.md` says what to make).

Phase 0, the fork, was Showdown with the title and the saved-settings keys changed (`rut-`).

Next: Phase 2, the land: ground texture packs, trees as they are, water and mud as they are, dust and spray,
golden hour.

## Layout

| Path | What's in it |
| --- | --- |
| `BRIEF.md` | The build brief |
| `rut-access.html` | The whole game in one file (built) |
| `dist/rut-access.artifact.html` | The same page without its outer tags, for publishing as an artifact |
| `build.sh` | Builds both: the shell's head, the source modules in order, the shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The modules: `10_core` the basics and the HUD's pixel buffer; `11_sl3` Shiftlight 3's renderer, bundled; `12_display` the renderer's GL context and shader compiling; `12_gl_mesh` the mesh builder; `13_lit` the scene shaders (Dirt Sleeper's materials in the renderer's lighting, the sky, the shadow depth pass, the puffs); 14-33 the lofts, the engines and their sound, the seven bodies, their parts, wheels and builds; 40-45 the physics, the ground contact, each build's chassis, the Sim level, the robot drivers and the cross-country routes; `50_far`, `50_country`, `51_ranch` the world; `52_world_gl` the land through the renderer's hooks; `53_fx` the dust, mud and spray; `54_dev` the developer panel (traction, Sim, the look); `55_gfx` the graphics tiers, the weather and the frame's environment; `55_post` the display (clear or LED dots), the HUD's dots, dynamic resolution and the performance readout; 56-65 the garage's parts, the ratings, the feats, day and night (the lamps), the game and its drawing hooks, the races and callouts, the HUD, menu, garage, the model bay in the garage (`63_bay`), touch controls and boot |
| `shell/` | The page's head (title, styles, markup) and tail |
| `design/ratings.json` | Each factory build's six ground ratings |
| `lab/digital-engine.html` | The Digital Engine lab: the engine synth and sim every Dirt game uses, and a page to hear them in |
| `docs/visual-comparison.jpg` | Shiftlight 3 on its Mobile setting beside every Dirt game on its best, the look to aim for |
| `tools/physcheck.js` | Steps the physics beside Dirt Sleeper Mini 4's (`tools/ref/dsm4-physics.js`) and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | Every factory build through a drag run, grip tests and a 60-0 stop: `node tools/proving.js [build ids...]` |
| `tools/races.js`, `cross.js`, `ladder.js` | The robot drivers round every course, down every cross-country route, and down the eighth mile: `node tools/races.js par`, `node tools/cross.js`, `node tools/ladder.js` |
| `tools/showdown_check.js` | The built page in headless Chromium: a whole race on each route with a robot in your seat, then a callout; fails on any page error: `node tools/showdown_check.js` |
| `tools/check_de.py` | Proves the game's Digital Engine block is byte for byte the lab's: `python3 tools/check_de.py` |
| `tools/shot_rut.js` | Headless screenshots of this game, drawn frame by frame through its hooks: `node tools/shot_rut.js <out> name:quality:display:tod:place ...`; `DEBUG=` shows one of the renderer's buffers (or `shadow` for the sun's visibility), `PAGE=1` shoots the whole page, `JS=` runs code first, `FILE=` shoots another build |
| `tools/eval_rut.js` | Runs a piece of code inside the booted page and prints what it returns, for checks that need no picture: `node tools/eval_rut.js "return g.GAME.car.p"` |
| `tools/shot_showdown.js`, `shot_sl3.js`, `shot_dirt_sleeper.js` | Headless screenshots of HD, Showdown and Open World, of Shiftlight 3, and of the original Dirt Sleeper |
| `TEXTURES.md` | The texture packs to make for the ground: what, what size, how they are read |
| `TEXTURE_PROMPTS.md` | A ready image-tool prompt for each ground texture, and the rules to give the tool every time |
| `tools/sheet.py` | Lays screenshots out in a labelled grid |
