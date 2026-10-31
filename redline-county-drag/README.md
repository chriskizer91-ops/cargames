# Redline County: Wide Open, with drag engines

A copy of Redline County (`city-and-country/` on `city-and-country/round-1`, which this folder leaves untouched)
with five drag-racing engines added: the "glug glug" ones. Everything else is the same game.

Open `redline-county-drag.html` in a browser with WebGL2. `sh build.sh` rebuilds it from `src/`.
Saves use `rcd-` keys. The code still names them `cc-`; the store in `src/10_core.js` swaps the prefix. The first
time this copy runs in a browser it copies every `cc-` save across once (career, garage, tunes, settings), so
progress carries over, and from then on the two never share: a drag engine bought here can't end up in Redline
County's own save, where that game wouldn't know it.

## The drag engines (`src/58_drag.js`)

The glug is a big cam's lumpy idle. Its intake and exhaust valves are open together for a long time (overlap), so
at idle each cylinder fills a little differently: some cycles fire weak, and the revs hunt up and down. Each engine
is a Digital Engine spec with the lab's Wild cam and an extra idle lope (the spec's `lope`, which the lab's sim and
the synth already read). The synth is unchanged, byte for byte.

| Engine | Real class | Dressed* | Idle, hunting | Redline | Fits | Price |
| --- | --- | --- | --- | --- | --- | --- |
| 9.4 big-block, big cam (572) | street / bracket big-block | ~790 hp | ~950 rpm, about 690-1,010 | 6,600 | SUV, pickup, muscle, 4x4 | $9,500 |
| 8.2 Pro Stock (500) | Pro Stock, no power adder | ~1,400 hp | ~1,600, about 1,140-1,700 | 10,500 | SUV, pickup, muscle | $32,000 |
| 13.4 mountain motor (820) | Mountain Motor Pro Stock | ~1,900 hp | ~1,300, about 890-1,400 | 9,300 | SUV, pickup, muscle | $42,000 |
| 8.6 Pro Mod, screw blower (526) | Pro Mod, methanol | ~3,800 hp | ~1,400, about 960-1,500 | 8,000 | SUV, pickup, muscle | $55,000 |
| 8.2 Top Fuel nitro (500) | Top Fuel / Funny Car, nitromethane | ~11,000 hp | ~1,700, about 1,060-1,730 | 8,400 | SUV, pickup, muscle | $85,000 |

*Crank hp with ram air, zoomie headers and a race tune (SIM.makeSpec's peak). Without them about 80% of that.

- **Their cams are part of them**: the Cam slot shows only theirs, and `engineSpec` (`src/16_engines.js`) leaves a
  drag engine's cam, torque and redline as its spec has them.
- **The blown two bring their own blower** (power slot: "Its own blower"; the bay draws a screw blower like a
  Roots), wear the bug-catcher hat and poke through the hood on any body (`look.engineOut`, the hood cut round it).
- **Zoomie headers**: a new exhaust choice (the lab's Open headers, +8%), offered with the drag engines only.
  Swapping back to another engine puts side exits on instead.
- **Idle lope on the Tune sheet** (`src/63_dyno_lab.js`): a new Engine row, 0-20%, for any piston engine. Sound and
  tach only, so it's free in the career too. The game's physics now adds the spec's `lope` to the tach and sound's
  idle hunt (`src/40_physics.js` `_out`), as the lab's sim does; it is 0 on every other engine, so they're unchanged,
  and the dyno bay's idle shake follows it (`src/63_showroom.js`).
- The new engines are on `__game.parts` (`fits`, `fixRig`, `isDrag`, `DRAG_ENGINES`) for the tools.

Measured (`tools/drag_check.py`, flat tarmac, each car's drag-ready preset with the engine swapped in, ram air,
zoomies, race tune; Realistic level, no traction control):

| Car | Engine | 0-60 | 1/4 mile | Top |
| --- | --- | --- | --- | --- |
| SUV (Sleeper as it comes) | 3.8 twin-turbo V6 | 2.4 s | 9.7 s @ 157 | 242 mph |
| SUV | 572 | 3.3 | 11.5 @ 123 | 191 |
| SUV | Pro Stock | 3.5 | 10.7 @ 149 | 237 |
| SUV | mountain motor | 2.2 | 9.1 @ 162 | 254 |
| SUV | Pro Mod | 1.8 | 7.8 @ 203 | 275 |
| SUV | Top Fuel | 1.9 | 7.4 @ 239 | 281 |
| Muscle drag car | Top Fuel | 2.1 | 8.2 @ 207 | 262 |

Off the line the big ones are limited by the tyres, not the engine: Top Fuel makes far more than any tyre in the
game can put down, so at the Middle level traction control holds it to about the same launch as the Sleeper.

## Before the drag engines: Redline County

(Was City & Country while it was being put together.) No city limit, no speed limit: a county with no edge,
and cars you can tune past anything real.

Back Forty's game with City Limits' town, cars and night. Everything from Back Forty (its cars, machines, garage
window with the dyno lab and the Tune sheet, the Plus tune, the Sim level, the dev panel, the settings, the phone
controls) in a new world: City Limits' town at its own size in the middle, the country round it, and the salt
flats past that, under a full moon.

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
  game keeps its own save: `cc-career` (money, cars, parts, medals, jobs, its own hand tunes) and free play's
  `cc-game`, `cc-tune`, `cc-fchal`.
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

## The night (`src/59_daynight.js`, `src/13_lit.js`)

One night, City Limits': a full moon bright enough to see the country and the salt. The town's ~1,100 lights
(street lamps, the boulevard's twin lamps, neon, shopfronts, the gas station, the diner, the garage) and the off-road
park's towers and poles are put into a grid of 8 m cells once (3.8 by 2.4 km, town and park), each cell listing the
lights that reach it, and the lit shader lights each
pixel from its cell's list (City Limits' cluster grid). The headlights and the farms' yard lights nearest the car
are the shader's own eight lamps, as in Back Forty.

## Checks

- `tools/drag_check.py [middle|real]`: every drag engine in every car that takes it fits, builds, starts and pulls
  with no NaN; prints hp, 0-60, the quarter and top speed; writes `tools/ref/drag_specs.json`.
- `node tools/drag_sound.js [outdir]`: renders each drag engine (start, idle, blips, a rev to the limiter) through
  the synth with the game's Fuller body and a master-like compressor, as WAVs; prints the idle hunt.
- `tools/drag_shot.py [car] [engine]`: garage frames of a car with a drag engine, hood shut and open.
- `node tools/physcheck.js`: the existing cars' physics, still bit-identical (worst difference 0).
- `python3 tools/drive_check.py hwyE 70`: town to the end of the highway on the salt; no NaNs, no ground steps.
- `python3 tools/boot_check.py`, `tools/shot.py`, the rest of Back Forty's tools still apply.

- `python3 tools/park_drive.py oval,short,mud,strip 1 [car] [speed cap m/s]`: a robot lap of each circuit and a
  drag run; no NaNs, no ground steps, the lap clock and the slip.
- `python3 tools/chal_drive.py [ids|all] [car:preset]`: a robot through each challenge with the game's own run (the
  countdown, gates, laps, trap, mile, the flight); `list` lists them; `pars` gives the numbers for `CH_PARS`.

## Next

- Salt speed challenges.
- Robot racers (HD's drivers and Showdown's cross-country drivers).
