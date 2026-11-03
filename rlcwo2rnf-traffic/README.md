# Redline County: Wide Open 2: Road Not Found + Traffic

**rlcwo2rnf+traffic** (the folder and the page spell it `rlcwo2rnf-traffic`): Wide Open 2: Road Not
Found (`../wide-open-2/`) with two new jobs, **life on the roads** (traffic on Highway 40 and the town's streets,
parked cars at the diner, the gas station and the garage, people where the job markers are) and **the map with
waypoints** (pins on the big map, a waypoint set by a tap, the route by road). This folder is a fork of
`wide-open-2/` at 70b67fc (1 November 2026). `HANDOFF.md` is this version's brief: its rules, the two features, the
build order and the upgrades after them. `BRIEF.md` and `QA.md` are Wide Open 2's port brief and bug sweep, kept as
found.

Open `rlcwo2rnf-traffic.html` in a browser with WebGL2 (one self-contained page, about 8.3 MB with the photographs).
`sh build.sh` rebuilds it, and `dist/rlcwo2rnf-traffic.artifact.html` beside it, from `src/` and `shell/`.

## Where this version is

- **Step 1, the fork**: done. The page and its title, the menu's name, the save keys (`rt-` where Wide Open 2 has
  `wo2-`: on a `file://` page every local HTML file shares one localStorage, so this keeps the two versions' saves
  apart), the Node tools (`rt_check.js`, `shot_rt.js`, `eval_rt.js`, `frame_rt.js`, `perf_rt.js`, `alloc_rt.js`) and
  the Python tools pointed at this page and its keys. The texture packer also reads `../wide-open-2/textures/`, so a
  picture delivered for either version is found. Otherwise the game is Wide Open 2 as found.
- **The physics is Wide Open 2's**: `40_physics.js`, `41_ground.js`, `42_chassis.js`, `44_ai.js`, `45_ev.js`,
  `15_digital_engine.js`, `32_builds.js`, `37_newbuilds.js` and `34_machines.js` are byte for byte Wide Open 2's;
  `16_engines.js` and `43_sim.js` differ only in their save keys' prefix (`rt-tune`, `rt-sim`), the way Wide Open 2's
  fork changed Wide Open's `cc-`. `node tools/physcheck.js` says 0; `node tools/proving.js` prints `QA.md`'s table.
- **Traffic on Highway 40** (`src/60_traffic.js`): done. Below.
- **Police mode** (`src/60_police.js`): done. Below.
- **Next**: the town's streets and the country roads, parked cars, people at the markers; the map with waypoints.

## Traffic on Highway 40 (`src/60_traffic.js`)

- **The lanes**: three each way on the right, where the road's paint has them (3.6 m lanes either side of a 0.3 m
  median). Each lane is a loop: out along one side, round on the pavement just short of the barrels where the highway
  runs out on the salt (a left turn across the median on an 8.5 m circle), back along the other.
- **The drivers** (off the physics): the intelligent driver model. Each wants the road's speed (60 mph in the country,
  35 through town, slow round the turns at the ends; a little over or under, by the driver), keeps a time gap to
  whatever is ahead in its lane (another car, you, a red light) and brakes no harder than a car can. Blocked, it moves
  over when the next lane has room (a car already moving into a lane counts as in it); free, it keeps right; never
  within 80 m of a stop line. About one driver in ten has their eyes elsewhere and sees you stopped in their lane only
  25 to 45 m off: at highway speed that's too late, so stopping in a lane is a risk.
- **The lights**: the town's signals, on the same 30 s cycle the signal heads show. On the amber a driver goes if it
  will reach the line before the red at the speed it has, and holds that speed; otherwise it stops, as hard as it
  must. Through on the red only when it can't stop at all.
- **Round you**: out to just past the draw distance. A car that falls out of that range starts again where you can't
  see it (past the draw distance, or out of the camera's view), heading towards you (by your own speed), no faster
  than it could stop for what's ahead of it. Nothing pops into sight.
- **Near you, the physics**: a car goes onto the physics the moment it would touch you (or the police, or another car
  on the physics) within the next 0.6 s, or would have to brake harder than a car can for you. Then it is a real car
  (its own steering and pedals, the same following rules) and the contacts are the physics' own, as in a race: stop
  dead in a lane in front of a car that can't stop and it hits you. A car that hits or is hit stops and honks; clear,
  upright and back by its lane for a second, it rides the lane again and moves on. One left wrecked stays put (not
  stepped once it's still) until it's out of sight. Each kind keeps two cars for the physics, made at the boot.
- **The cars**: the factory SUV, wagon, pickup, hatch, electric, 4x4, coupe and muscle car, each in a paint of its own.
  Drawn from light copies (`33_car_mesh.js` truckLite), each one mesh, one draw a car a pass: the light one (the body's
  stations eight times apart, no underside, plain 196-triangle wheels: 9 to 12 thousand triangles) at middle distance,
  the far one (stations sixteen apart only where the outline needs them, no small parts: 5 to 7 thousand) beyond that
  and into the shadow maps; up close the race's coarse copy (the light body on a phone) with its wheels turning. The
  full and coarse cars are untouched: `node tools/mesh_same.js` builds every build's meshes here and in Wide Open 2 and
  compares their vertex buffers byte for byte. At night their lamps are on and the nearest few light the road.
- **The wanted level**, 1 to 5 (`WANTED`). It rises with the chase: the heat is a second of pursuit (1 a second; 1.5
  over 100 mph), 12 for hitting a police car, 6 for hitting one of the traffic; level 2 at 45, 3 at 110, 4 at 200,
  5 at 320 (about 45 s, 2 min, 3.3 min and 5.3 min of plain chase). Each level brings one more car (up to 3 on Mobile
  and Low, 4 on Medium, 5 on High and Ultra), a stronger engine than yours (0, 15, 30, 45, 60% more torque: each car
  out there is refitted where it is when the level changes) and braver driving (85% of the grip round the bends at
  level 1 to 95% at 5; following 8 m + 0.3 s at 1, 7 m + 0.25 s at 2, 6 m + 0.2 s from 3). Dev: Wanted level (Auto, or
  held at 1 to 5), Police cars (Wanted, or 1 to 5), Police engines (By wanted level, Same as yours). Off for races and
  timed challenges. Traffic brakes for them and goes onto the physics near them, as for you.
- **How they stop you**: level 1, one car follows and pulls up behind you when you stop. From level 2, with you slowed
  right down (crashed, spun, stuck: under 4 m/s for a second) they hem you in: the nearest gets past you and across
  your front, slowing; the next comes up to your back, the third alongside, each closing to about half a metre and
  holding; any more wait 15 m off. From level 3, with you between 8 and 30 m/s, the nearest tries a PIT: lines its
  nose up with your back wheel a hand's width off, then nudges through your back corner to turn you round (one at a
  time, six seconds between). `police_check.js evade` (round and round town at up to 50 mph, the test's driver never
  stopping): level 1 never stops it; levels 3 and 5 did in 29 to 127 s (Mobile and High, one run each), with 1 to 9
  PITs; their own wall hits there, 0 to 8 a run, mostly in the mess after a PIT.
- **Checks**: `node tools/traffic_check.js [park,drive,ram]` (you parked across a lane; you through town at 70; you
  into the traffic at 90): no NaNs, never over the budget, no two lane cars overlapping, none into you, no red run, all
  in their lanes; `node tools/rt_check.js` has a traffic scene.

## Police mode (`src/60_police.js`)

- **On the Drive tab** (Police: Off, On; saved). They come after you anywhere: town, country, off the road, onto the
  salt and across it, and never give up.
- **They drive what you drive**: your build, on the same physics, with the robot's stability control, ABS and traction
  control, in black and white (the doors and roof white: the livery shader's style 5) with a light bar flashing red
  and blue; with a stronger engine as the wanted level rises (below).
- **The pursuit**: a police car drives your trail (where you were every 4 m, the last few minutes: a line you drove, so
  one that can be driven), steering for a point along it (nearer in a corner, so it doesn't cut through a building's
  corner) and reading the trail further on for the bends: no faster than 80% of the grip allows round the tightest one
  ahead, braking for it in time. The nearest car, close and in sight of you, settles a few car lengths back (8 m and
  0.3 s at your speed: about 19 m at 77 mph) and holds it; when you stop it pulls up just behind you, a little to one
  side. The others keep their distance from the one ahead, counted along the trail, so round a corner too. A car in its
  way it slows for in time (and drops back if touching); the traffic it goes round when there's room beside it, you and
  the other police it never does. Stuck, it backs off and goes again. Lost (far behind, rolled, stuck for good), it
  comes back in behind you out of sight, on your trail, already moving, clear of the traffic.
- **How they drove before and after** (`tools/police_check.js town,hwy`, three runs each, averages; the town run is
  west on Highway 40 into town, six turns on its streets, out east; the highway run east in its traffic at 65 mph):

  | | wall hits | car contacts | touching you | rolled | stuck | come back in |
  |---|---|---|---|---|---|---|
  | Town, Mobile, before | 13.3 | 93 | 67 | 0 | 13.3 | 10 |
  | Town, Mobile, after | 0 | 0 | 0 | 0 | 0 | 1 |
  | Town, High, before | 24.3 | 109 | 37 | 0.7 | 41 | 8.7 |
  | Town, High, after | 0 | 8.3 | 0 | 0 | 0 | 3 |
  | Highway, Mobile, before | 0 | 93 | 93 | 0 | 0 | 1 |
  | Highway, Mobile, after | 0 | 0 | 0 | 0 | 0 | 1 |
  | Highway, High, before | 0 | 146 | 42 | 0.7 | 0 | 7.3 |
  | Highway, High, after | 0 | 15.3 | 0 | 0 | 0 | 5 |

  (A contact is counted at most one and a half times a second for each police car, so it is near enough seconds of
  touching; "come back in" counts the first time in too. Before, the police in town knocked the test's own car off its
  route in all six runs, by 37 to 164 m. What's left: on High, two police cars on Highway 40 still brush a car of the
  traffic now and then, a car changing lanes into them or one they squeeze past.)
- **The helicopter** (`src/60_heli.js`), at wanted level 5: 85 m over the ground under it, after you at up to 130 m/s
  (290 mph; Dev: Helicopter top speed 200, 250, 290 mph), a little behind you and leading you by a second; not on
  the physics. Drawn plain, for a silhouette up there: a dark body, tail and skids, two thin blades turning, a red light
  blinking under it and a white one on the tail. At night its searchlight lights the ground round you (faint on the
  salt, which is bright at night anyway). Its own dot on both maps (white, blinking red); HELICOPTER on the HUD, then
  HELICOPTER LOSING YOU and the seconds left. Its sound is made, not recorded: low noise pulsed at the blades' 17 a
  second, a beat under it, the turbine's whine; panned, quieter with distance, a touch of Doppler. Outrun it (more
  than 350 m from it across the ground for six seconds) and it has lost you: the chase is over, the police gone for
  45 s, the level back to 1. No build of ours goes that fast yet (the fastest stock: 247 mph), so at 290 mph level 5
  is for good until there is one. `police_check.js heli`: with you at 77 and 268 mph it keeps up (264 m behind at
  most at 268), at 313 mph (the test setting your speed itself) it loses you after 46 s. The pilot's two radio calls
  are in `VOICE_PROMPTS.md`, not recorded yet (till then: the officer's "Lost visual").
- **Busted**: at a standstill (under 0.3 m/s: shoving a police car out of the way doesn't count) with a police car
  within 8 m, three seconds running. So they have to stop you: hem you in, or you give up. Then, after a moment,
  you're taken back to Marisol's garage (and fined $500 in the career); the chase is over and the level back to 1, and
  they come after you again once you're 120 m out of the garage's block.
- **The siren** wails, yelps once they're within 45 m, each car its own voice, panned and with the Doppler. Deeper
  and quieter than it was: the sweep 28% lower with a low-pass in place of the band-pass, at 40% of the old volume
  (Dev: Siren pitch Deeper, A little deeper, As before; Siren volume 25%, 40%, 60%, As before). At night the bar lights
  the ground round them. They're blinking dots on both maps; the HUD shows WANTED and the level as stars, POLICE and
  the distance.
- **How many**: 1 on Mobile and Low, 2 on Medium and High, 3 on Ultra (Dev: Police cars). Off for races and timed
  challenges. Traffic brakes for them and goes onto the physics near them, as for you.
- **Voices**: 14 recorded lines (`voices/`, the owner's pack, made to `VOICE_PROMPTS.md`; packed into the page by
  `tools/pack_voices.py` as `src/49_voices.js`, 470 KB). The police radio plays in your car through a scanner's narrow
  band with a squelch click either side: the call when a chase starts, into town, out onto the salt, lost you, found
  you, backup after a minute and a half, stopped. Their loudspeaker comes from the nearest police car, through a
  megaphone, every 9 to 14 s while it's close and you're still going ("There's nothing out there" on the salt), and
  at a bust. The traffic's drivers don't talk: they honk. Decoded the first frame the sound is up; one line at a time.
- **The rear view**: to see who's behind you. The chase camera turned round, out in front of your car and looking back
  over it. On the phone a REAR button, top of the left-hand column (above CAM): one tap looks back, another looks
  ahead again (lit while it's on; a toggle, as both thumbs are busy). On the keyboard G, held; on a gamepad the right
  stick pressed in, held. REAR VIEW shows under the instruments while it's on.
- **Check**: `node tools/police_check.js [chase,bust,town,hwy,evade,heli]` (town, hwy, chase and bust hold the level at 1).

---

# Wide Open 2: Road Not Found (the game this version is built on)

The sequel to Redline County: Wide Open: the same county, cars, career, challenges, people, races and park, drawn
by Shiftlight 3's renderer at the quality Rut Access: Road Not Found reached on a phone (`../rut-access/`, the
worked example of that port), with the owner's ground photographs on the ground, three times of day, the renderer's
rain, and the whole game run top to bottom for bugs on the way. Wide Open 2 is a fork of `city-and-country/` on the
`city-and-country/round-1` branch (Wide Open as published, 31 October 2026). `BRIEF.md` is its build brief,
`QA.md` the bug sweep, `TEXTURES.md` and `TEXTURE_PROMPTS.md` the ground photographs; the sections after the line
below are Wide Open's own README, kept as the description of the game (corrected where this one differs). Names in
these sections are this folder's (the page, the `rt-` keys, the tools).

## The picture

The game is drawn by Shiftlight 3's renderer (`src/11_sl3.js`, the bundle Rut Access uses): HDR with the sun (by
night the full moon) through cascaded shadow maps, the town's lamps in a clustered light grid, the car's headlights
with a real low-beam cut-off and their own shadow map, a reflection probe at the car, screen-space reflections,
volumetric fog, TAA that rebuilds full resolution from a jittered lower-resolution frame with dynamic resolution,
bloom, eye-like auto exposure and the ACES grade. Everything Wide Open drew comes from its own meshes and
materials, through the renderer's hooks:

- **The world** (`52_world_gl.js`, `LAND`): the far tiles, the streamed chunks at their levels of detail, the roads,
  the buildings, poles and stands, the trees, the mud clods, into the scene, the probe and the shadow maps, all
  relative to the floating origin (when it steps, the last frame's matrix, the light grid and each car's kept
  matrices step with it, and the cascades are drawn afresh).
- **The materials** (`13_lit.js`): Showdown's and Wide Open's materials in the renderer's lighting: the salt crust
  and the salt course's line and mile bars, the public roads by class with their lines, zebras and medians, the
  town's facades with lit windows and storefronts, the signals, the park's tracks, the cars' light strips and
  underglow, the two studios.
- **The ground photographs** (`49_textures.js`, made by `tools/pack_textures.py` from Rut Access's seventeen
  pictures in `../rut-access/textures/`): dirt, grass, the trail, gravel, asphalt, the strip's rubber, rock, ruts,
  mud, playa, clay, concrete, planks, sheet metal and hay laid over the procedural ground as grain (Mobile reads
  them at 512, the other tiers at 1024). The salt, brick, stucco, the forecourts, the road paint and the speedway's
  clay keep Wide Open's look until the owner's pictures for them arrive (`TEXTURE_PROMPTS.md`); a delivered picture
  drops in through the packer by its file name.
- **The lights** (`59_daynight.js`): the town's and the park's 1,158 lights in the renderer's grid (8 m cells over
  3.8 by 2.4 km, made once the opening screen is up), at 130 times these games' values; the yard lights nearest the
  car, the tail lights, the underglow and the others' headlights as the frame's own lamps.
- **The cars** (`60_game.js`, `CARHOOK`): yours and a race's others, the riders, each part with its last frame's
  matrix so TAA sees it move; the shade under each car; the challenges' columns of light in the glass pass.
- **Dust, spray and rain** (`53_fx.js`): dust and spray as soft lit puffs, mud clods as lumps; the rain through the
  renderer's own rain particles and splashes over a mask of the ground round the camera, spray off wet tarmac, drops
  on the lens from the hood camera.
- **The showroom** (`63_showroom.js`, `STUDIO`): the two studios as scenes of their own (the dark bay's glossy floor
  through the screen-space reflections), the dyno lab over the car.
- **The display** (`55_post.js`): the clear picture with the HUD's dots and smooth text over it, or the LED dot
  matrix; dynamic resolution; frames on an even beat (every second refresh on a 90 Hz phone: 45 fps on a Pixel 7a).

## The times of day (`59_daynight.js`, the Drive tab)

- **High noon**: the county as Back Forty lit it.
- **Golden hour**: the sun about eight degrees up in the west, long shadows, a light warm haze toward the sun, the
  windows, neon and street lamps coming on.
- **Full moon** (the game opens here, as Wide Open did): City Limits' night, bright enough to see the country and
  the salt, the town lit by its lamps and neon, the headlights on.

The Sim level's weather (Damp, Rain, Downpour) turns any of them grey and wet: the volumetric fog thickens, the
ground darkens with a sheen and puddles, the renderer's rain falls.

## Graphics, the phone and the Dev tab

- **Tiers** (`55_gfx.js`): Mobile to Ultra. Every start is on Low (the owner's call: a tier too heavy for the device
  can't leave the game stuck loading start after start). Changing the tier in the menu starts the page again on it,
  for that start only (`rt-gfx-next`, read once and cleared); the page's `?quality=` still picks one for the tools.
- **The phone's budgets** (Dev tab, `52_world_gl.js` `BUDGET`, Mobile only; the other tiers always draw
  everything): the render scale's ceiling, the shadow distance, the trees' distance and how near they are full, the
  reflection probe's and the far cascade's cadence, the dust allowed at once, your car's coarse copy in the far
  cascades. The frame where the floating origin steps draws only the cascades that need it.
- **The performance readout** (F, or Dev: Numbers on screen, Readout): frames a second against the beat, the frame
  time and its worst, the CPU's and the GPU's time, the render size, triangles, chunks and lights, under the HUD's
  name block. Everything shows the world's own numbers as well.
- **The look** (Dev tab, saved as `rt-look`): saturation, contrast, exposure, haze, ground detail, ground photos,
  photo colour, sunlight, bloom, stars, moonlight, lamps, glow, headlights, dust and spray, rain, the challenges'
  columns, sun shadows, the shade under the cars. Each is a multiplier on what the time of day sets; 100% is the
  game as tuned against Wide Open's own pictures.

## Saves

Every setting and save is under an `rt-` key, so nothing is shared with Wide Open 2 (`wo2-`), Wide Open (`cc-`),
Back Forty (`b40-`), City Limits (`cl-`) or Rut Access (`rut-`): free play `rt-game` (car, level, camera, time of day, the cars' rigs),
`rt-tune` (the Tune sheet and the Dev tab's traction), `rt-fchal` (free play's challenge bests), `rt-plus`,
`rt-free`; the career `rt-career` and its feats `rt-cfeats`, `rt-mode` (which one you were in); `rt-races`,
`rt-park`, `rt-laps`, `rt-runs`; the settings `rt-gfx-next` (one start only), `rt-display`, `rt-res`, `rt-dottext`, `rt-sim`,
`rt-engine`, `rt-dyno`, `rt-show`; the Dev tab's `rt-look`, `rt-budget`, `rt-simdev`, `rt-devworld`.

## Tools

- `node tools/rt_check.js`: the whole game headless (boot, the showroom, ten places with the origin stepping, a race,
  a challenge, the night); fails on any page error. `node tools/physcheck.js` (worst difference must be 0) and
  `node tools/proving.js` (the physics table) for the physics; `node tools/boot_node.js [s] [png] [tier]`.
- `node tools/shot_rt.js <out> name:tier:display:tod:place[:cam]` (pictures of this build, or of Wide Open's with
  `FILE=`; tod is day, golden or night; `JS=` runs code first, `PAGE=1` shoots the whole page with its menus),
  `node tools/eval_rt.js "<code>"`, `python3 tools/sheet.py` (pictures side by side).
- `python3 tools/pack_textures.py` (the ground photographs into `src/49_textures.js`).
- The Python tools (`chal_drive.py`, `race_run.py`, `park_drive.py` and the rest) want the Python Playwright package
  and, here, a shim that points it at the installed browser (`QA.md`, "How it was run").

---

# Redline County: Wide Open

(Was City & Country while it was being put together.) No city limit, no speed limit: a county with no edge,
and cars you can tune past anything real.

Back Forty's game with City Limits' town, cars and night. Everything from Back Forty (its cars, machines, garage
window with the dyno lab and the Tune sheet, the Plus tune, the Sim level, the dev panel, the settings, the phone
controls) in a new world: City Limits' town at its own size in the middle, the country round it, and the salt
flats past that, under a full moon (in Wide Open 2, at high noon and golden hour too: the top of this file).

Open `rlcwo2rnf-traffic.html` in a browser with WebGL2. `sh build.sh` rebuilds it from `src/`.
Saves use `rt-` keys only, so nothing is shared with Wide Open 2 (`wo2-`), Wide Open (`cc-`), Back Forty (`b40-`) or City Limits (`cl-`)
(the list is under Saves, at the top of this file).

## Where it comes from

- **Back Forty v9.1** (`back-forty/` on `back-forty/published`): every module, as the base.
- **City Limits v2** (`city-limits/` on `city-limits/published`): the town's plan (its `clmap.js`, districts, lots and
  buildings, lamps, signals, neon, palms, the park), the salt flats' ramps (`flats.js`), the cluster light grid
  (`render/lights.js`), the facade and salt looks (`render/glsl/world.js`), the full moon (`game/env.js`), and the
  three cars (`hd/34_ev`, `35_wedge`, `36_hyper`, `37_newbuilds`, `45_ev`, `58_clparts` -> `58_ccparts`).

## The world (`src/50_worldgen.js`)

Everything is a function of where you are, made in 128 m chunks round the car by a worker, as in Back Forty.
x runs east, z south; downtown is at the origin.

- **The town**: City Limits' grid of streets every 120 m inside Limits Boulevard (a ring 720 m across with rounded
  corners), its districts (Downtown's towers, Neon Row, the Heights, the Yards, Copper Park), the same size.
  Street classes for the road shader: 6 Highway 40, 7 the boulevard, 8 Central Avenue, 9 the avenues, 10 the
  streets, 11 the intersections (zebras). Sidewalks, curbs, medians, paved lots, buildings with lit windows and
  storefronts (material 60), traffic signals on a 30 s cycle (61), neon words, blade signs and strips, palms.
- **Highway 40**: three lanes each way with a painted median, straight through the middle of town east and west,
  lit a little way out of town, then dark across the country, and it just ends on the salt (barrels and a
  ROAD ENDS sign, at `HWY_X`, about 3.47 km out).
- **The country**: a mile grid of roads round town (lines at -1, 0, +1 miles): Ridge Road north into the hills
  (gravel), Wash Road south (dirt), the others blacktop, gravel or dirt a stretch at a time. Farms, creeks, woods,
  hills to the north, rolling ground, drier toward the salt. Deke's Gas east of town and the Starlite Diner west,
  on the highway. The bog south of town. Marisol's garage downtown, where the game starts.
- **The off-road park** (`PKW` in the generator, the clocks in `src/60_park.js`), west of town, north of the
  highway, in by Park Road from Highway 40 under a lit gate:
  - **Speedway 25**: HD's banked clay oval, half a mile round (14 degrees in the turns, 5 on the straights), a
    concrete wall and catch fence, a grandstand with a press box, eight light towers, haulers in the infield.
  - **The short course**: HD's, 1.8 km of loose dirt: two tabletops, the whoops, berms in the turns, a crest
    and the big sweeper home; a start gantry, tyre walls round the turns, flags.
  - **The mud track**: a 770 m loop sunk in the ground, the right way round, banked turns, a chicane and a
    splash of standing water; an arch with its name, round bales round the turns.
  - **The drag strip**: HD's eighth mile of packed dirt, two lanes, the tree, timing boards, fences, light poles,
    a little grandstand, bales at the end of the shutdown.
  - **The paddock**: a lot with haulers, the park office and its sign; a gravel lane north between the tracks.
  - Each track is a path of lines and arcs; the banking, berms, jumps and whoops are the ground's own heights,
    and the track's surface is drawn on the ground's own triangles (`genGround`), its look fading to grass at
    the edge where the ground's grass takes over, so the physics drives exactly what's drawn.
  - Laps are timed on the three circuits (over the line, past checkpoints at a third and two thirds, over the
    line again), the best kept for each car and level. On the strip: stop with the nose on the line in a lane,
    the tree counts down (the car is held on its brakes), then the slip: reaction time, 60 ft, 330 ft, the
    eighth mile and the speed. Flooring it before green is a red light.
- **The Outer Loop** (`OL` in the generator): a 14 km off-road circuit all the way round the city, out in the
  country, clockwise on the map from the line on the west side (between the park and town). North past the park,
  up into the hills, east along them through the creek twice and over Ridge Road, round the rocks, down the east
  side to run flat out along the edge of the salt and over Highway 40, back west across the south through a set
  of esses, over Wash Road, through the mud beside the bog, across the little creek's loop twice, over the
  highway again and home. It crosses the roads at grade. A centripetal Catmull-Rom spline through its waypoints,
  2 m steps, a 32 m grid for finding the nearest step; its profile is the land's own along it, smoothed, level
  with each road it crosses, dipped through the fords (water lying level in each), a crest about every
  kilometre, berms on the bends. Drawn on the ground's triangles like the park's tracks (loose dirt; the shader
  takes the mud by the bog as kind 1 to 2). Farms, trees and power poles keep off it. A gantry over the line,
  marker posts with reflectors, chevrons on the tighter bends, red and white posts at the road crossings, depth
  posts at the fords, a board every kilometre. Its laps are timed with a checkpoint about every kilometre.
- **The salt flats**: past about two miles (a rounded square, its edge wandering), flat, hard (the physics'
  `strip` surface) and endless, with City Limits' ramps (kickers, table-tops, mega ramps) in most 360 m cells.

## The career, the challenges and the county's people

- **Two games side by side** (`src/60_career.js`), picked on the Drive tab. **Free play**: every car and every
  part yours, the money a score, the Tune sheet open all the way. **The career**: a stock SUV and $2,500; the
  challenges, the people's jobs and a share of the feats (35%) pay real money, which buys parts (the garage marks
  each with its price; what you buy stays bought) and cars at the dealer. Three cars open only through a job: the
  electric (Marisol's The Quiet One), the wedge (Vince's Night Runner) and the hypercar (Hal's Two Hundred). Each
  game keeps its own save: `rt-career` (money, cars, parts, medals, jobs, its own hand tunes) and free play's
  `rt-game`, `rt-tune`, `rt-fchal`.
- **Challenges** (`src/60_chal.js`): City Limits' kinds on this map: sprints through gates, laps, standing starts,
  the speed trap, the flying mile, big air off a mega ramp, and drift zones (City Limits' drift scoring). Town:
  Limits Loop, Downtown Quarter, Downtown Dash, Neon Row Drift. Out of town: Out to the Salt, the Highway 40 speed
  trap, Ridge Road, Wash Road, The Bog. The Outer Loop: the North Woods section and the full lap. The park:
  Speedway 25, the Short Course, the Mud Track, the eighth-mile drag, Paddock Drift. The salt: the Flying Mile and
  Big Air. A tall column of light marks each start (cyan; gold once you hold the gold; green when a job wants
  it): stop in it and press Enter or Start, or pick one in the Challenges tab. A countdown on the brakes, then the
  clock, the next gate lit as a column with an arrow to it, laps and splits; the result screen shows the medal,
  your best and the pay. Pay by tier as City Limits (gold/silver/bronze 1,600/1,000/600 up to 4,000/2,700/1,700);
  a better medal pays the difference, a repeat a tenth. Medal times come from robot runs
  (`tools/chal_drive.py pars`): bronze a little slower than the stock SUV, gold a little slower than the build
  made for that ground.
- **The county's people** (`src/60_jobs.js`): City Limits' five (Marisol at the garage on Neon Row, Deke at the gas
  station, Rosa at the Starlite, Vince on Neon Row, Old Hal, now with a trailer on the salt past the end of the
  highway) and Bo Tanner at the off-road park's paddock. Eighteen jobs: errands against the clock, finding a
  lost crate on the Outer Loop, a pie for a couple camped where Ridge Road meets the Loop, medals they want to
  see, 200 mph on the salt. A column in someone's colour means they have work: stop beside them and listen. One
  job at a time; the HUD shows it with an arrow to where it wants you.
- **The Tune sheet in the career: tune within your hardware** (`src/63_tune_career.js`). Always free: the sound and
  feel (knock, pipe length, crackle, blow-off, horn, launch rpm, the limiter). Free up to what's bolted on, then a
  kit: displacement (stroker kit, big-bore block), redline (valve springs, billet valvetrain), boost (wastegate
  and injectors, forged bottom end), turbo size, the nitrous shot, the cam. The part itself: an engine swap,
  induction, exhaust, intake, anti-lag, straight-cut gears, launch control, diesel, the jake brake. Each slider
  shows the locked stretch with the next kit and its price; each choice its price; let go past the line and the
  buy bar asks, Not now puts it back.

## The salt course and the salt challenges (round 5)

- **The course** (`src/50_worldgen.js` `COURSE`, `SLALOM`, `RAMPRUN`): east from where Highway 40 runs out on the salt,
  along z = 0, as far as the salt goes (the ramps keep 40 m clear of that line everywhere). Five lanes at the start
  line, Bonneville's black line down the middle and a bar across the lanes every mile (drawn by the ground shader,
  `uCourse`, no geometry), a lit MILE sign every mile, light towers at the timed mile (1,100 m out), a TURN sign for
  the two-way runs, and a slalom of twelve cones north of the course where no ramp comes near.
- **The challenges** (`src/60_chal.js`): the Flying Mile (middle lane), the Standing Mile (time, and the speed at the
  line), 0-100-0 and 0-200-0 (to the speed and back to a dead stop), the Two-Way Mile (record rules: the timed mile
  east, round the turn, back west; the average), the Salt Slalom, the Ramp Run (a minute among the ramps: every flight
  scores its distance, back-to-back flights raise the multiplier), and Big Air.
- **The salt clubs**: 150, 200, 250, 300 and 330 mph ("Wide Open") anywhere on the salt, each paid once. The check is
  one comparison a frame until the car beats the next club's speed.

## Races (round 6: `src/60_race.js`, `src/44_ai.js`)

- **The races**: Speedway 25 (six laps of the park's clay oval), Last Car Out (the oval, last car out every lap),
  the Short Course, the Mud Track Dash (four cars), the Boulevard Run (two laps of Limits Boulevard, anticlockwise in
  the outside carriageway, from the median's edge to the curb), the Outer Loop Enduro (once round the city, 14 km)
  and the Eighth-Mile Drag on the park's strip. Easy, medium and hard: how much of their cars the others use, where
  you start, how much the places pay. The prize goes into the career's money, or free play's.
- **Who you race**: the factory cars and trucks (not the machines) whose time round that course is nearest yours,
  worked out on the robots' own sum (the line's planned speeds through the corners, the engine's pull between them;
  `raceEst`), not the ratings' generic courses: on those a stock SUV and a track hypercar rate alike on dirt, round
  the clay oval the hypercar is a fifth quicker. The mud goes by the ratings' mud course, the strip by 0-60.
- **The drivers** are HD's (an elastic-band line between the edges, the speeds the car can take each bit at, gas and
  brake to hold them, round slower cars), with Showdown's variable width and effort.
- **Off the physics far from you**: a robot more than 190 m away rides its line instead of being simulated (at the
  ghost's speed below, set down on the ground, wheels turning), and goes back on the physics, moving and in the right
  gear, inside 140 m. Round the oval that is two or three of the five at a time; on the Enduro it is usually all of
  them but the one or two near you. A robot on the physics costs about as much as your own car; one riding its line
  about a tenth of that, and out past where it could be seen it isn't even set down on the ground. The riders, the
  ghosts and the race clock all run on the time the physics does each frame, so on a slow phone (below 30 fps,
  where the physics runs a little slow) the riders don't run on ahead. A car stopped for good past the flag, or out of
  Last Car Out, is parked: not stepped unless you're close enough to hit it.
- **The ghost**: while a robot is on the physics a ghost rides its line from where it is for fifteen seconds at a time
  (the plan's speeds, the engine's pull: `_kinV`), and how far the car got over how far the ghost did is the pace it
  rides at when it's off the physics (fifteen seconds mostly stuck behind someone don't count). Measured that way the
  riders finish within a few per cent of the same car on the physics (`tools/race_cal.py`).
- **The cars' meshes**: the others are drawn from one coarser copy each (`truckFar`: the body's stations three times
  further apart, six at the ends and round the glass, no stations either side of the creases, the decals in bigger
  pieces: about 16-20 thousand triangles to the full car's 40-60), near or far, built on the grid one a frame while
  the lights wait; the full car is never made for a rival. Only those within 150 m cast shadows. Their meshes go 20
  s after the race unless another starts (Race again keeps them). The car builder itself got a third quicker on the
  way (`MB.tri`, the hood split straight from the flat arrays), with every build's meshes checked bit for bit
  against the old builder's, and a wheel's matrix is now made in one scratch matrix instead of nine new ones.

## Stunts (`src/58_feats.js`)

A stunt is everything from all four wheels leaving the ground with the body clear of it too (or the car going over
past 78 degrees) until it is back on its wheels and settled for half a second. On the way it counts the flight up
to the first touch of the ground (distance, time, height); every full flip, roll and spin while it's off its wheels
(a turn about 30 degrees short still counts; read from the car's orientation frame to frame, from the moment it
leaves its wheels; after a touchdown only while it's really off them, so a spin-out on landing isn't a spin; a spin
done nose up, which reads partly as a roll, is credited whole); and every tree, post or wall it clips (not the other
cars in a race). Hitting things doesn't end it, and a hard hit no longer costs the combo on its own: coming to rest
does. At rest on its wheels without a reset it's LANDED and pays (CLEAN, half as much again, if it came down upright
and soft first time, stayed down and clipped nothing); at rest on its side or roof for a second it's BAILED (ROLLED
IT if it never left the ground) and the unbanked combo goes with it; a quad's rider thrown off is a bail too. Hung up
on something, upright with no wheels down, it's just over. A tip past 78 degrees and back with no air or turns is a
save. A drift, two wheels or a burnout going when a stunt starts is paid there and then. Pausing doesn't bank the
combo while a stunt is going (the car waits frozen under the menu). Flips pay 300, rolls 220, spins 120, clips 50, on
top of the air. `tools/stunt_check.py` throws the car about on the salt and prints what each throw made.


## Nitrous out in the wild (`src/60_nitrous.js`)

The bottle (eight seconds of shot, whatever the kit's size) used to fill only when the car was built, so an empty one
meant a trip to the Garage tab. In free play the bottle is always full. In the career a bottle comes from Deke at the
gas station on Highway 40 east: at his pumps it is the bottle's price (by the kit's shot) and no wait; anywhere else
the Drive tab's Nitrous row calls him out: the bottle, a fee for the drive by the distance, paid at once, and he
arrives after the drive out at a delivery's pace, the clock on the HUD as DEKE 1:12 (it waits with the physics under
the menu). Keep driving; it finds you. A rebuild in the Garage tab no longer fills the bottle for free in the career;
a new kit, or another car, comes with its own full bottle. The physics is untouched: the bottle is a number the game sets.

## The night (`src/59_daynight.js`, `src/13_lit.js`)

City Limits' night, one of Wide Open 2's three times of day (the top of this file says how the renderer draws them):
a full moon bright enough to see the country and the salt. The town's ~1,100 lights
(street lamps, the boulevard's twin lamps, neon, shopfronts, the gas station, the diner, the garage) and the off-road
park's towers and poles are put into a grid of 8 m cells once (3.8 by 2.4 km, town and park), each cell listing the
lights that reach it, and the lit shader lights each
pixel from its cell's list (City Limits' cluster grid). The headlights and the farms' yard lights nearest the car
are the shader's own eight lamps, as in Back Forty.

## Checks

- `node tools/physcheck.js`: the existing cars' physics, still bit-identical (worst difference 0).
- `python3 tools/drive_check.py hwyE 70`: town to the end of the highway on the salt; no NaNs, no ground steps.
- `python3 tools/boot_check.py`, `tools/shot.py`, the rest of Back Forty's tools still apply.

- `python3 tools/park_drive.py oval,short,mud,strip 1 [car] [speed cap m/s]`: a robot lap of each circuit and a
  drag run; no NaNs, no ground steps, the lap clock and the slip.
- `python3 tools/chal_drive.py [ids|all] [car:preset]`: a robot through each challenge with the game's own run (the
  countdown, gates, laps, trap, mile, the flight); `list` lists them; `pars` gives the numbers for `CH_PARS`.
- `python3 tools/race_run.py ids [car:preset] [easy|medium|hard]`: whole races with your car driven by a robot of its
  own through the game's step: the results, how many of the others were on the physics, the cost a frame.
- `python3 tools/race_cal.py courses builds [laps]`: a robot alone round a course on the physics, then riding the line
  at the pace its ghost measured: the two times side by side.

## Next

- Showdown's cross-country races on this map's roads and trails, the rivals sizing your car up by its looks, and the
  strip callouts.
- The rivals' engines: quiet pre-rendered loops in place of the oscillators.
