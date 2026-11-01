# Redline County: Wide Open 2: Road Not Found

The sequel to Redline County: Wide Open: the same county, cars, career, challenges, people, races and park, drawn
by Shiftlight 3's renderer at the quality Rut Access: Road Not Found reached on a phone (`../rut-access/`, the
worked example of that port), with the owner's ground photographs on the ground, three times of day, the renderer's
rain, and the whole game run top to bottom for bugs on the way. This folder is a fork of `city-and-country/` on the
`city-and-country/round-1` branch (Wide Open as published, 31 October 2026). `BRIEF.md` is the build brief,
`QA.md` the bug sweep, `TEXTURES.md` and `TEXTURE_PROMPTS.md` the ground photographs; the sections after the line
below are Wide Open's own README, kept as the description of the game (corrected where this one differs).

Open `wide-open-2.html` in a browser with WebGL2 (one self-contained page, about 8.3 MB with the photographs).
`sh build.sh` rebuilds it, and `dist/wide-open-2.artifact.html` beside it, from `src/` and `shell/`.

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

- **Tiers** (`55_gfx.js`): Mobile to Ultra, Mobile by default on a touch screen. Changing the tier starts the page
  again on it.
- **The phone's budgets** (Dev tab, `52_world_gl.js` `BUDGET`, Mobile only; the other tiers always draw
  everything): the render scale's ceiling, the shadow distance, the trees' distance and how near they are full, the
  reflection probe's and the far cascade's cadence, the dust allowed at once, your car's coarse copy in the far
  cascades. The frame where the floating origin steps draws only the cascades that need it.
- **The performance readout** (F, or Dev: Numbers on screen, Readout): frames a second against the beat, the frame
  time and its worst, the CPU's and the GPU's time, the render size, triangles, chunks and lights, under the HUD's
  name block. Everything shows the world's own numbers as well.
- **The look** (Dev tab, saved as `wo2-look`): saturation, contrast, exposure, haze, ground detail, ground photos,
  photo colour, sunlight, bloom, stars, moonlight, lamps, glow, headlights, dust and spray, rain, the challenges'
  columns, sun shadows, the shade under the cars. Each is a multiplier on what the time of day sets; 100% is the
  game as tuned against Wide Open's own pictures.

## Saves

Every setting and save is under a `wo2-` key, so nothing is shared with Wide Open (`cc-`), Back Forty (`b40-`),
City Limits (`cl-`) or Rut Access (`rut-`): free play `wo2-game` (car, level, camera, time of day, the cars' rigs),
`wo2-tune` (the Tune sheet and the Dev tab's traction), `wo2-fchal` (free play's challenge bests), `wo2-plus`,
`wo2-free`; the career `wo2-career` and its feats `wo2-cfeats`, `wo2-mode` (which one you were in); `wo2-races`,
`wo2-park`, `wo2-laps`, `wo2-runs`; the settings `wo2-gfx`, `wo2-display`, `wo2-res`, `wo2-dottext`, `wo2-sim`,
`wo2-engine`, `wo2-dyno`, `wo2-show`; the Dev tab's `wo2-look`, `wo2-budget`, `wo2-simdev`, `wo2-devworld`.

## Tools

- `node tools/wo2_check.js`: the whole game headless (boot, the showroom, ten places with the origin stepping, a race,
  a challenge, the night); fails on any page error. `node tools/physcheck.js` (worst difference must be 0) and
  `node tools/proving.js` (the physics table) for the physics; `node tools/boot_node.js [s] [png] [tier]`.
- `node tools/shot_wo2.js <out> name:tier:display:tod:place[:cam]` (pictures of this build, or of Wide Open's with
  `FILE=`; tod is day, golden or night; `JS=` runs code first, `PAGE=1` shoots the whole page with its menus),
  `node tools/eval_wo2.js "<code>"`, `python3 tools/sheet.py` (pictures side by side).
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

Open `wide-open-2.html` in a browser with WebGL2. `sh build.sh` rebuilds it from `src/`.
Saves use `wo2-` keys only, so nothing is shared with Wide Open (`cc-`), Back Forty (`b40-`) or City Limits (`cl-`)
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
  game keeps its own save: `wo2-career` (money, cars, parts, medals, jobs, its own hand tunes) and free play's
  `wo2-game`, `wo2-tune`, `wo2-fchal`.
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
