# Redline County: Wide Open 2: Road Not Found — the build brief

> Wide Open 2's port brief, kept as found. In this folder (`rlcwo2rnf-traffic/`, see `README.md` and `HANDOFF.md`) the page is
> `rlcwo2rnf-traffic.html`, the save keys are `rt-` and the Node tools are `rt_check.js`, `shot_rt.js`, `eval_rt.js`, `frame_rt.js`,
> `perf_rt.js`, `alloc_rt.js`.

The owner's call, 1 November 2026: Redline County: Wide Open (`city-and-country/` on the `city-and-country/round-1`
branch, published 31 October) is now the source game, and the renderer upgrade that Rut Access: Road Not Found gave
Showdown is to be given to it, in a folder of its own, as the sequel: **Redline County: Wide Open 2: Road Not
Found**. Two things at once: raise the picture to what Rut Access reached (Shiftlight 3's renderer at its Mobile
tier on a Pixel 7a), and run the whole game top to bottom for bugs, fixing what is found. This folder,
`wide-open-2/`, is that fork (Phase 0 done: the title, the file name `wide-open-2.html` and the save keys `wo2-`).

## Rules (the same as Rut Access's)

- Work only inside `wide-open-2/`, plus the one row for this game in the repository's root `README.md`.
- One self-contained page, `wide-open-2.html`, built by `build.sh` from `src/` and `shell/`; `dist/wide-open-2.artifact.html`
  is the same page without its outer tags, for publishing. Commit the built pages with the source.
- **The physics is unchanged**: `40_physics.js`, `41_ground.js`, `42_chassis.js`, `43_sim.js`, `44_ai.js`, `45_ev.js`.
  Run `node tools/physcheck.js` (worst difference must stay 0) and `node tools/proving.js` (its table must not change)
  before and after any step that touches a module they read. A bug in the physics is reported, not fixed here.
- **The Digital Engine block** in `src/15_digital_engine.js` stays byte for byte the lab's (the BEGIN/END markers).
- **The car models keep their shapes** (21–37): their materials may be converted for the renderer, their geometry not.
- Save keys are `wo2-` only.
- Things a model can't judge (how bright, how much haze, how loud) are made switchable and put in the Dev tab for the
  owner to A/B on the phone; the owner reports the values and they become the defaults.
- Commit after each step with a plain-language message (what changed and why; no model names anywhere in the
  repository), push to the branch you are on, never open a pull request.
- The target is a Pixel 7a in landscape (915 × 412 CSS px, 60–90 Hz, Mali-G710) at a steady 45–60 fps on the
  Mobile tier; a laptop at Ultra should look as good as it can.

## The worked example: `rut-access/`

Rut Access: Road Not Found is Showdown (Wide Open's ancestor) drawn by Shiftlight 3's renderer; it is in this
repository beside this folder and it is the pattern to follow. Read its `README.md` and `BRIEF.md`, then its
modules, in this order:

- `src/11_sl3.js`: Shiftlight 3's renderer bundled (esbuild, iife, global `SL3`), hand-patched: `noWorld`, the sky
  shader passed in, a `probe(R,U2,texs)` hook, `S.after(R)` after the final pass, `S.led` for the dot display, the
  camera's `shift`, the three cascade textures `uCSM0/1/2` with `csmTap`. The renderer's source is in
  `chriskizer91-ops/shiftlight3` (a read-only clone at `/home/user/chriskizer91-ops/shiftlight3` if it is still
  there; otherwise the bundle is the source of truth).
- `src/12_display.js`, `src/12_gl_mesh.js`: the renderer's context, the quality tier, `DRS`, the mesh format
  (pos, nrm, col with alpha = emissive/AO/half-width/flags, mat = material id; instanced attributes at 5/6/7).
- `src/13_lit.js`: Showdown's materials ported into Shiftlight's lighting (`Surf`: rough = sqrt(2/(shin+2)), diff,
  F0, clear coat, emissives ×5), the sky, the depth pass, the puffs; the photo-texture helpers (`photoG`, `photoG2`,
  `photoUV`, `photoTri`) over the ground materials.
- `src/52_world_gl.js`: the hook object `LAND` (`prepare`, `shadow`, `opaque`, `probe`) that draws the land through
  the renderer; `src/53_fx.js`: `FXP`, the particles hook; `src/60_game.js`: `CARHOOK`, `render()` building the
  renderer's scene (`cam`, `env`, `dyn` lamps, `headlights`, `occ`, `led`, `after`), the frame pacing, the pause;
  `src/59_daynight.js`: the times of day in the renderer's units (Showdown's lights were about 1/160 of
  Shiftlight's), `landLights()`, `carLights()`; `src/55_gfx.js`: the tiers; `src/55_post.js`: clear or LED-dot
  display, dynamic resolution, the performance readout, the HUD overlay; `src/65_boot.js`.
- `src/49_textures.js` and `tools/pack_textures.py`: the owner's seventeen ground photographs packed into the page
  (`rut-access/textures/`, `TEXTURES.md`, `TEXTURE_PROMPTS.md`). They belong on this game's ground too.
- `tools/shot_rut.js`, `tools/eval_rut.js`, `tools/showdown_check.js`: headless screenshots, in-page checks and the
  whole-game check under SwiftShader. Node Playwright is installed (`require('playwright')`); the Python Playwright
  package that this folder's own `.py` tools want is not. Either install it (`pip install playwright`, with
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; the browser binary is `/opt/pw-browsers/chromium`) or port the
  checks to Node as `tools/boot_node.js` starts to.

Rut Access's lessons that apply here, all found on the phone: the renderer switches back-face culling on before it
hands the frame to the game's hooks, and these games' meshes are two-sided, so the hooks must switch it off (or you
see through the cars); the menu must pause the physics (the old games kept stepping it with the brake held, which
engages reverse after half a second, so the car reversed at full throttle under the menu); every menu opening must
let go of the touch inputs; the engine sound should settle to idle while paused; a car rebuilt under the menu
settles on its springs in a burst with the handbrake only; the Dev tab's Look and Engine-note sliders are how the
owner tunes; the phone's bar is just Menu.

## What is different here (what the port has to carry that Showdown didn't have)

Read Wide Open's own README (the lower part of `README.md`) for the game; the renderer-relevant differences:

1. **The world is streamed**: made by a worker in 128 m chunks round the car (`50_worldgen.js`, `51_world.js`), each
   chunk with ground meshes at three levels of detail, roads, props, trees and its lights, freed as you leave; a
   **floating origin** (`RO`, stepped every 512 m) so GPU positions stay small. The land hook draws what `drawWorld`
   draws today; the renderer's previous-frame matrices (TAA, motion vectors) must be corrected when the origin steps,
   and the probe, the cascades and the light grid are in origin-relative space.
2. **The lights**: about 1,100 town lights (street lamps, the boulevard's twin lamps, neon, shopfronts, the gas
   station, the diner, the garage) plus the park's towers and poles, put once into an 8 m cell grid over 3.8 × 2.4 km
   (`59_daynight.js`, City Limits' cluster grid), and the shader's own eight lamps (headlights, the nearest yard
   lights). Shiftlight 3 has the same idea (`LightGrid`, 8 m cells, `loadWorld({lights, info:{lightGrid}})`): feed it
   the same lights, in origin-relative coordinates, rebuilt when the origin steps (or placed with the grid's own
   origin). Units: Wide Open's light values were HD's; Rut Access scaled Showdown's by 160 and tuned by eye.
3. **The night is a full moon** (City Limits'): the sun becomes the moon (direction, colour, a sky with stars), the
   town lit by its lamps; the headlights with the renderer's real low-beam cut-off and their shadow map.
4. **Materials beyond Showdown's**: the salt flats' crust and clay, the highway and street classes (6 Highway 40,
   7 boulevard, 8 Central Avenue, 9 avenues, 10 streets, 11 intersections with zebras), sidewalks, curbs, medians,
   paved lots, the town's facades with lit windows and storefronts (60), traffic signals on a 30 s cycle (61), neon
   words, blade signs and strips, palms, the park's tracks drawn on the ground's triangles, the salt course's black
   line and mile bars from the ground shader (`uCourse`), fords with water lying level, the cars' light strips (30)
   and underglow (31), the challenges' columns of light. Every one of these keeps its look through `Surf`.
5. **Three more cars** (the electric sedan with its electric drive, the wedge, the hypercar) and **the machines**
   (quads, a side-by-side and the rest of `34_machines.js`), each with the same material conversion as the seven.
6. **The showroom** (`63_showroom.js`: Dirt Sleeper Mini's model bay as the opening screen and the garage, with two
   photo studios, the dark bay's glossy floor and the light cyclorama) and **the dyno lab** (`63_dyno_lab.js`) over the
   car: the studios are scenes of their own, to be drawn by the renderer with their own lights and probe.
7. **The display**: Wide Open draws the LED dot matrix and a crisp "smooth text" HUD in the UI's typefaces (`TXT`,
   `10_core.js`); Rut Access's clear picture with the HUD dots over it, and its LED mode, replace the matrix path.
8. **Races** with robots riding their lines far off, **challenges**, **jobs**, **the career**: game logic that the
   renderer must not disturb; the QA sweep drives them all.

## Phases

- **Phase 0** (done): the fork, renamed, built, boots clean (`node tools/boot_node.js`).
- **QA sweep** (an agent of its own, in parallel): the game as forked, top to bottom, on its own tools and new Node
  ones where the Python ones can't run; every bug fixed or filed in `QA.md` with how to reproduce; the Rut Access
  lessons checked first (pause, reverse under the menu, culling can't apply yet, touch release).
- **Phase 1, the renderer**: Shiftlight 3 draws the county (day) through hooks, the same picture as Wide Open's,
  nothing missing: town, park, salt, every road class, the cars, the machines, the showroom. Mobile tier, phone
  frame rate, screenshots of each place beside Wide Open's own (`tools/shot.py` or a Node port).
- **Phase 2, the picture**: the ground photographs (the pack from Rut Access plus pictures for the town and the
  salt: ask the owner with prompts in the style of `rut-access/TEXTURE_PROMPTS.md`), the night under the moon with the
  town's lights, golden hour, dust and spray, the weather, the look's Dev sliders.
- **Phase 3, the phone**: sustained frame rate, boot time, shader warm-up, touch, the menus at 915 × 412 and in
  portrait, the 45 fps beat, the performance readout.
- At the end of each phase: screenshots, the checks, a commit, a push, the artifact republished, and a stop for the
  owner's phone test.
