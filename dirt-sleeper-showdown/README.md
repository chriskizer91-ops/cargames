# Dirt Sleeper Showdown

Dirt Sleeper HD with three things added, all about racing other cars:

- **Cross-country races.** Point to point over more than one kind of ground (mud, dirt, gravel, tarmac),
  against a field of different cars, each one quick somewhere else on the route.
- **Rivals who size you up.** Every car has a looks score: how fast it looks to a rival across the
  staging lanes. Against a car that looks slow, the others take it easy, until it gets by them. Beat a car
  that looks faster than yours and there's a bonus on top of the prize: *nobody saw it coming*.
- **Strip callouts.** Stop in a staging lane at the drag strip and someone pulls up beside you with
  something to say about your car. A ladder of eight, slowest first.

This is its own version of the game, kept apart from the others in this repo: it was copied from
`dirt-sleeper-hd/` (branch `claude/zealous-noether-iab04x`), and nothing in that folder changes. Saved
settings use their own `dssd-` keys, so Showdown never reads or overwrites another version's.

Open `dirt-sleeper-showdown.html` in a browser with WebGL2.

## Cross-country races

The Races tab, first section (`src/45_cross.js` has the routes, `src/60_race.js` runs them). You race
the car you're in against five robots, from a grid where the difficulty says (front, middle or back).
The route is the gold line on the corner map and the big map (M), with the finish marked. The HUD shows
your place, the kilometres to go, the clock, the gaps either side and an arrow that points the way the
route goes from here (red, with WRONG WAY, if you've turned round).

| Race | Length | The ground |
| --- | --- | --- |
| Mud to Tarmac | 1.3 km | Off the yard and through the mud pit, round onto the ranch drive, the county gravel and the lake road, across a field and onto the race track to the line |
| Paddock to the Peak | 3.5 km | Out of the paddock gate, up Range Road's gravel, west on the forest road, then Summit Road's paved switchbacks to the mast |
| Home to the Hills | 2.7 km | Out of the home yard and up the rutted mud lane, west on the county road, then the Cedar Hills rally stage over the crests and across the brook |
| Lake to Speedway | 3.9 km | Off the dry lake's clay, up the lake road, the length of the county road east, north to Speedway Park and a lap of the short course with its jumps and whoops |

A route is made of the world's own roads and trails (each leg names a path and where along it to go),
joined by short runs across open ground, with a width for each leg. Where one road turns sharply into
another the corner is rounded, so the robots see the curve a car really takes through the junction and
brake for it. The robots' line (`44_ai`'s `RaceLine`) now takes a width that changes along it.

Who you race: factory builds rated close to yours **for that route**. The rating is each build's six
ground ratings (`57_ratings`) weighted by how much of the route is that ground, and the field is picked
from different cars where it can be, so it's strong in different places. A car that can't get through
somewhere (slicks in the mud pit) is put back three times and then **towed** 30 m on; you get the
tractor too if you reset three times in one spot.

## Rivals who size you up

`looksOf` in `src/56_parts.js`: 0 to 10, from the body kit and what shows on it: big or sticky tyres,
the stance, side pipes, a blower or anti-lag, aftermarket wheels, a strip-out. Nitrous, a tune and a
bigger turbo don't show at all. The garage shows it under the figures, and the Races tab says what
yours is doing to the others.

| Build | Looks |
| --- | --- |
| SUV Stock, Wagon Stock | 0 |
| 4x4 Stock, Pickup Stock | 1 |
| Hatch Stock | 1.5 |
| Wagon Sleeper | 2 |
| SUV Sleeper, Muscle Stock | 2.5 |
| Coupe Stock | 3.5 |
| 4x4 Crawler | 5 |
| SUV Rock & Mud, Pickup Prerunner | 5.5 |
| Hatch Group B | 7 |
| SUV Race, Muscle Drag | 9 |
| Coupe GT | 9.5 |

At the start of a race (not the stages, which are against the clock) every robot sizes your car up.
Below 7, they drive at 0.9 + 0.01 x your looks of their effort: corners a little slower, never more than
about seven-tenths of the throttle, and off the drag strip's tree a beat late. They wake up, at full
effort, when you pass them, or after six seconds stuck behind you; the HUD says who woke up, and in the
running order the ones still taking it easy are dim with ZZ. At 7 or more they saw you coming and go
flat out from the start.

**Nobody saw it coming:** for every rival you finish ahead of whose car looks more than a point faster
than yours, 3% of the purse for each point between you, on top of the prize (more on harder settings).

## Strip callouts

Stop in either staging lane at the drag strip, facing down it (Go to: Drag strip puts you there). After
a moment the next one on the ladder pulls up in the other lane and says something about your car (one
line if it looks slower than theirs, another if it doesn't). Stay put and the race is on a few seconds
later; drive off and it isn't. Win and the next one is up. The Races tab shows the ladder.

| | Who | Car | Looks |
| --- | --- | --- | --- |
| 1 | Earl Tibbs | Muscle Stock | 2.5 |
| 2 | Wade Pruitt | Pickup Stock | 1 |
| 3 | Tommy Vo | Coupe Stock | 3.5 |
| 4 | Big Red | Muscle Drag | 9 |
| 5 | Dusty Maddox | Pickup Prerunner | 5.5 |
| 6 | Lena Marsh | Hatch Group B | 7 |
| 7 | Rita Kowalski | Wagon Sleeper | 2 |
| 8 | The Ghost | SUV Race | 9 |

The order is the robots' own eighth-mile times on the dirt strip (`tools/ladder.js`): 10.6 s for the
stock muscle car down to 6.9 s for the race SUV. On dirt, the drag car's slicks only make it fourth.

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

## Circuits, drags and stages

HD's races, all still here. You race the car you're in, as it's built, against drivers in factory cars rated close
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
| `dirt-sleeper-showdown.html` | The whole game in one file (built) |
| `build.sh` | Builds the page: the shell's head, the source modules in order, the shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The modules. 10-33: the display, the meshes, the engines and their sound, the seven bodies, their parts, wheels and builds. 40-45: the physics, the ground contact, each build's chassis, the Sim level, the robot drivers (`44_ai`) and the cross-country routes (`45_cross`). 50-55: the far country (`50_far`), the country, the ranch, its drawing, the dust and mud, the developer panel, the graphics levels with the shadows and the probe (`55_gfx`), the passes between the scene and the screen and the displays (`55_post`), and the grass (`55_grass`). 56-65: the garage's parts, the ratings, the feats, day and night, the game, the races and the callouts (`60_race`), its HUD, menu, garage, touch controls and boot |
| `shell/` | The page's head (title, styles, markup) and tail |
| `tools/physcheck.js` | Steps the physics beside Dirt Sleeper Mini 4's (`tools/ref/dsm4-physics.js`) on the first three levels, with the e-brake's free centre diff switched off (`hbCentre`), and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | Every factory build through a drag run, grip tests and a 60-0 stop: `node tools/proving.js [build ids...]` |
| `tools/races.js` | The whole world built as the game builds it and the robot drivers on it: `node tools/races.js oval stock race` (each build alone round a course: lap or stage time, top speed, how far it strayed, how often it was put back), `node tools/races.js field short 6` (a race), `node tools/races.js par` (the rivals' stage times, for `60_race`). It knows the cross-country routes too: `node tools/races.js mudtar stock` |
| `tools/cross.js` | Every factory build down every cross-country route as the game's rivals drive it: time, splits by kind of ground, top speed, how far it strayed and where, resets and tows: `node tools/cross.js [route ids] [--builds a,b]` |
| `tools/ladder.js` | Every build down the eighth mile on the dirt strip, slowest first, for the callouts' ladder: `node tools/ladder.js` |
| `tools/showdown_check.js` | The built page in headless Chromium: a whole race on each route with a robot in your seat (through the game's own step), then a callout; prints the fields, who woke up, the results and the bonus, and fails on any page error: `node tools/showdown_check.js` |

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
graphics choice, the Races tab and the developer panel (a Dev tab) added in HD, and Showdown's cross-country races,
looks, callouts and their menu sections and HUD added after.
