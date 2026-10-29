# Dirt Sleeper HD

Free roam on the ranch and the country round it, two miles square, in any of seven cars built any way
the garage allows, for money, and races against robot drivers; drawn on an LED dot matrix or clear.
This is its own version of the game, kept apart from the others in this repo. It started as two forks
of Dirt Sleeper Mini's game merged into one:

- **Mini Dirt Run Solo**: the garage (every car built a part at a time, from presets), ratings on
  six kinds of ground, feats that pay (drifts, jumps, two wheels, saves, speed runs, burnouts, close
  calls, splashes, the mud pit, Red Hill, the rock garden, laps, clock runs) with combos, day and
  night, phone controls made for a phone held sideways (slide or tilt to steer, pressure pedals).
- **Dirt Sleeper Sim**: a fourth driving level, Sim (true load transfer, soil trip, edge catch,
  shock and brake fade, roof loads, tyre pressure, weather, ABS by era), and graphics levels with
  real sun shadows, clouds and rain.

On top of those it has a new renderer, after Shiftlight 7's, with graphics levels for a phone and for
a laptop, a world four times the size and races (below).

Open `dirt-sleeper-hd.html` in a browser with WebGL2.

## The world

Two miles square (`src/50_far.js`). The mile in the middle is the ranch and the country round it as
they were; the county road now runs on east and west to the edge, and round them is new land:

- **Speedway Park** (east): a banked dirt oval (14 degrees in the turns) with a wall and catch fence,
  a grandstand, haulers in the infield and light poles for night racing; north of it a short course
  with two tabletop jumps, whoops, banked hairpins and a big sweeper.
- **Bald Mountain** (north): about 150 m high, with the paved Summit Road switching back up its south
  face at a steady 8 per cent (laid out by walking up the slope at that grade), guard rails where the
  ground falls away, and a radio mast with a red light at the top.
- **The Cedar Hills** (west): wooded hills with a 2.6 km gravel rally stage through them (crests to get
  light over, hairpins, a ford through the brook), and Mill Road back to the forest road.
- **The dry lake** (south): a flat clay pan 1.3 km across at the end of Lake Road, with a cone course.

Every new place is in Go to and on the big map (M).

## Races

The Races tab. You race the car you're in, as it's built, against drivers in factory cars rated close
to yours for that kind of ground (`src/57_ratings.js`), on the same physics as yours. Places pay into
the free play money. **How hard** sets how much of their cars the others use (85, 90 or nearly 100%),
where you start on the grid and how much it pays.

| Race | What it is |
| --- | --- |
| Speedway 25 | Eight laps of the dirt oval, six cars |
| Last Car Out | The oval, six cars: every time a lap is done the last car is out |
| Short Course | Four laps of the short course, six cars |
| Road Course | Three laps of the paved road course, six cars |
| Dry Lake Dash | Two laps of the cone course on the dry lake, six cars |
| Mud Bog Dash | Three laps of the ranch's mud track, four cars |
| Eighth-Mile Drag | One on one down the strip, the tree counting down; off the gas until it goes green |
| Cedar Hills Rally | The rally stage against the clock and five rivals' times, with splits |
| Summit Hill Climb | Summit Road against the clock and five rivals' times, with splits |

The robots (`src/44_ai.js`) work out a line through each course that bends as little as its edges
allow, and for their own car how fast each bit of it can be taken (the tyres' grip on that ground, the
banking, the speed at which a tall car would tip, braking back from every corner, slowing over crests
and through water). They learn their car's real grip as they go, back off when they run towards the
edge, pass slower cars on the side with more room, and are put back on the course if they get stuck,
roll or end up facing the wrong way. The cars touch: each car's hull against the others' boxes. Far off,
the other cars are drawn from a coarser copy of their body. The rivals' stage times are the robots' own
times in each factory build (`tools/races.js par`). In a race R puts you back on the course.

## Graphics

Settings has the **Graphics** level and the **Display**. A phone starts on Phone with LED dots, a
laptop on Laptop with Clear; both can be changed, and the choice is kept.

Every level gets the new lighting (`src/13_lit.js`):
- A physically based highlight (GGX) from the sun and every lamp, with Fresnel, and specular
  anti-aliasing so nothing sparkles.
- Detail cut into the ground without textures: clods, grain and stones in the dirt, tufts in the
  grass, gravel stones, cracked drying mud, rock relief, fine tarmac with cracks. It is bump-mapped,
  and fades out with distance.
- Leaves that glow with the sun behind them, and tree crowns broken into clumps.
- Height fog coloured like the sky behind it, so the land melts into the horizon.
- Headlights with a real low-beam cut-off.
- Filmic tone mapping with exposure that adapts like an eye.
- Soft, sun-lit dust and spray.
- Three times of day: high noon, golden hour and night.

The levels add, each to the one before (`src/55_gfx.js`, `src/55_post.js`, `src/55_grass.js`):

| Level | What it adds |
| --- | --- |
| Mini | The soft shadow under the car and the least ground detail. For an old phone. |
| Phone | Real sun shadows in two cascades (1024). Real reflections: a cubemap probe at the car (64, a face every third frame) that the paint, glass, chrome, water and puddles show. Clouds. |
| Laptop | Three cascades (2048, a softer filter, to 200 m), a 128 probe every frame, all the ground's detail, the land drawn to 560 m. Plus three laptop-only effects: **ambient occlusion** in screen space, **light in the air** (sun shafts through the trees and dust, headlight beams at night) and **grass you drive through** (GPU-made clumps that sway, lie down under the car and take the shadows). |
| Ultra | Laptop, bigger: 3072 cascades to 260 m, a 256 probe, denser grass further out, the land to 700 m. |

**Display:** LED dots is the matrix every Dirt Sleeper has. Clear is the picture at the screen's own
resolution, smoothed (FXAA), with the HUD still lit in dots on top. It draws at a share of the
screen's pixels that follows the frame rate (dynamic resolution). If the frame rate stays low, the
game suggests the level below.

## Files

| Path | What's in it |
| --- | --- |
| `dirt-sleeper-hd.html` | The whole game in one file (built) |
| `build.sh` | Builds the page: the shell's head, the source modules in order, the shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The modules. 10-33: the display, the meshes, the engines and their sound, the seven bodies, their parts, wheels and builds. 40-44: the physics, the ground contact, each build's chassis, the Sim level and the robot drivers (`44_ai`). 50-55: the far country (`50_far`), the country, the ranch, its drawing, the dust and mud, the developer panel, the graphics levels with the shadows and the probe (`55_gfx`), the passes between the scene and the screen and the displays (`55_post`), and the grass (`55_grass`). 56-65: the garage's parts, the ratings, the feats, day and night, the game, the races (`60_race`), its HUD, menu, garage, touch controls and boot |
| `shell/` | The page's head (title, styles, markup) and tail |
| `tools/physcheck.js` | Steps the physics beside Dirt Sleeper Mini 4's (`tools/ref/dsm4-physics.js`) on the first three levels, with the e-brake's free centre diff switched off (`hbCentre`), and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | Every factory build through a drag run, grip tests and a 60-0 stop: `node tools/proving.js [build ids...]` |
| `tools/races.js` | The whole world built as the game builds it and the robot drivers on it: `node tools/races.js oval stock race` (each build alone round a course: lap or stage time, top speed, how far it strayed, how often it was put back), `node tools/races.js field short 6` (a race), `node tools/races.js par` (the rivals' stage times, for `60_race`) |

## Where the pieces came from

The car, engine, physics and world modules are Dirt Sleeper Mini's (`../dirt-sleeper-mini/src`) at
the time of the split, with each fork's changes merged in:

- Mini Dirt Run Solo: the 4.6 V8 retuned to the real engine's curve, a quicker six-speed automatic,
  a single turbo for engines that never had one, overdrive off (O), the e-brake freeing an
  all-wheel-drive car's centre diff, low range ratios per transfer case, headlights and yard lights
  as spot lights, stars and the moon.
- Dirt Sleeper Sim: everything under the Sim level (`43_sim`, and the parts of `40_physics`,
  `41_ground` and `42_chassis` that only act when a car is on it), the sun's shadow map, clouds, wet
  ground and rain (`55_gfx`), and the scene drawn at no more than the screen's own pixels.

The game, HUD, menu, garage and touch modules are Mini Dirt Run Solo's, with the Sim card, the
graphics choice, the Races tab and the developer panel (a Dev tab) added. Saved settings use their own `dshd-`
keys, so this version never reads or overwrites another version's.
