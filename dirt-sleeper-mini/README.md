# Dirt Sleeper Mini

Seven cars and sixteen builds, drawn on an LED dot matrix, each with its own Digital Engine running
live. There are two pages:

- `game.html`, the game: drive any build around the ranch and the country round it.
- `model-bay.html`, the model bay: the cars on a turntable, or all of them parked together in a garage.

| Car | Builds | What it is |
| --- | --- | --- |
| SUV | Stock, Sleeper, Rock & Mud, Race | A mid-2000s luxury SUV, built every way the game allows. |
| 4x4 | Stock, Crawler | A short two-door off-roader that is good in the dirt from the factory, then lifted onto 37s with an exo-cage. |
| Coupe | Stock, GT | A front-engine flat-plane V8 fastback that is a track car with plates, then a widebody GT race car. |
| Wagon | Stock, Sleeper | A plain family wagon with a turbo five and all-wheel drive, then a big-turbo sleeper that still looks like a grocery getter. |
| Pickup | Stock, Prerunner | A full-size crew cab in factory off-road trim, then a long-travel desert prerunner with two spares in a bed cage. |
| Muscle | Stock, Drag | A 1970-style big-block fastback, then a blown, tubbed pro-street drag car on slicks with wheelie bars. |
| Hatch | Stock, Group B | A mid-1980s turbo four-wheel-drive homologation hatch, then a full Group B gravel rally car with anti-lag. |

## The game

Open `game.html` in a browser with WebGL2, on a laptop or a phone. The menu picks the car and its
build, the driving level, where to go and the camera. It is Dirt Sleeper Mini 4's ranch and country:
the drag strip, the burnout pad, the mud pit, the rock garden, the hill climb, the trail loop, the
mud track, the lane, the county road, the woods and the race track.

Keys: <kbd>W</kbd>/<kbd>↑</kbd> gas, <kbd>S</kbd>/<kbd>↓</kbd> brake and reverse, <kbd>A</kbd> <kbd>D</kbd> steer,
<kbd>Space</kbd> handbrake, <kbd>Q</kbd> <kbd>E</kbd> shift, <kbd>N</kbd> nitrous, <kbd>L</kbd> low range,
<kbd>K</kbd> lockers, <kbd>C</kbd> camera, <kbd>M</kbd> map, <kbd>T</kbd> traction (developer), <kbd>R</kbd> reset, <kbd>Esc</kbd> menu. A game
controller works too. On a phone the pedals, steering and buttons are on the screen; turn it sideways
for the bigger view.

### The physics

Every build drives on the same physics: Mini 4's car model (a rigid body stepped 240 times a second,
raycast wheels with a footprint of seven rays, a combined-slip tyre, a clutch or a torque converter,
diffs, lockers and low range), rewritten so a step allocates nothing. That keeps phones from
stuttering on garbage collection. `tools/physcheck.js` steps it beside Mini 4's own code and the two
stay bit-identical.

Each build's chassis comes from its model and its parts (`src/42_chassis.js`): weight and where it
sits, the centre of gravity from the body and the ride height, springs, shocks and travel from the
suspension, sway bars, tyres per tread and per surface, each axle's own tyre size, brakes, downforce,
diffs, lockers and low range. The coupes and the SUV race build have factory traction control. The
automatic shifts early at part throttle, kicks down, and holds its gear while the tyres are spinning
rather than shifting up and down through the wheelspin.

The three driving levels: **Realistic** is the car as it is; **Middle** adds a steering helper,
stability control and traction control; **Kids** adds grip and keeps the car on its wheels.

### The developer panel

While the game is being made, the menu has a **Developer: traction** panel (`src/54_dev.js`; set
`DEV` to false to ship without it).

- **Traction is the ground, not the cars.** It sets how much grip each surface gives, overall and
  surface by surface (tarmac, concrete, drag strip, dirt, gravel, trail, grass, rock, mud, ruts,
  water). Every car feels it through its own tyres: the physics multiplies a tread's grip on a
  surface by the ground's. So the cars keep their order at any setting. On dirt the drag car's slicks
  always have less grip than the crawler's mud tyres, and on the drag strip they always have more.
  The ground's grip lives on the world (`GroundWorld.grip`), so anything driving there feels it.
- **The grip ladder** shows every build's driven tyres on one surface with the ground as it is set,
  best first, starting on the surface the car is on.
- **Every car's handling**: back-end grip, grip once sliding and steering at speed. Each works on
  every car from that car's own setup (`Vehicle.tune`).
- <kbd>T</kbd> while driving steps Traction through 75, 100, 125 and 150%. The HUD shows
  `TRACTION 125%` while it is off the default, with `+` (or `DEV`) when other knobs have changed.
  The settings are saved on the device.

At the defaults the physics is untouched: `tools/physcheck.js` still finds no difference from Mini 4.

`tools/proving.js` runs every build through a drag run, ramp-steer grip tests on tarmac and gravel
and a 60-0 stop, and prints the figures beside the rankings in `design/ratings.json`. They agree to
within about ten per cent.

## The model bay

Open `model-bay.html` in a browser with WebGL2. Pick a car, then a build; **Compare** shows all of a
car's builds at once. **Hood** (or H) opens the hood, and the **Bay** view looks into the engine bay.
**Garage** (or G) parks every car in one shed, each on the build it was last on. The car you
picked sits on the turntable in the middle, where the views, the hood and the Bay view work as usual.
Tap a parked car to swap it onto the turntable. The **All** view stands back to show the whole row.

## The garage's engines

Every car has a voice of its own: its own sim and its own synth (an audio worklet), all playing into
one room, so any number can run at once. In the Engine tab, the power button starts the car on the
turntable and **Start all** starts every car in the shed. Only the car on the turntable takes the
throttle, brake, shift and nitrous; the rest idle in their bays. The car on the turntable is heard
from where the listener buttons say (behind, cabin or trackside). Each parked car is heard from the
camera, panned to its side, as far off as it is, and from its front or its tail depending on which
end faces you. The garage switches the room to Garage; you can change it in the Engine tab. Leaving
the garage stops the parked engines, and an engine that is off sleeps in its worklet, so it costs
nothing until it is started again. Outside the garage a running engine moves with you when you
switch cars.

The parked cars are built one per frame the first time the garage opens, so the shed fills up car
by car instead of the page freezing while all of them are made. Parked cars keep their hoods shut,
so their engine bays are never built.

## Files

| Path | What's in it |
| --- | --- |
| `game.html` | The whole game in one file (built) |
| `model-bay.html` | The whole bay in one file (built) |
| `build.sh` | Builds both pages: each is its shell's head, the source modules it uses, and its shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The source modules. 10-33: the display, the meshes, the engines and their sound, the bodies, parts, wheels and builds. 40-42: the physics, the ground contact and each build's chassis. 50-53: the country, the ranch, its drawing and the dust and mud. 54: the developer panel. 60-62: the game, its HUD and its menu. 18, 19, 80, 81: the model bay |
| `shell/` | Each page's head (title, styles, markup) and tail |
| `tools/physcheck.js` | Steps the physics beside Mini 4's original (`tools/ref/dsm4-physics.js`) and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | The proving ground for every build on the game's physics: `node tools/proving.js [build ids...]` |
| `reference/image-prompts.md` | The prompts for the reference sheets the 4x4, coupe, wagon, pickup, muscle car and hatch were modelled from |
| `tools/shot.js` | Screenshots for checking the cars by eye: `node tools/shot.js <out-dir> <build>:<view>[:<stage>]` |
| `tools/rank.js` | Ranks every build for circuit, street and off-road racing from its own engine and chassis: `node tools/rank.js [out-dir]` |
| `design/car-rankings.md` | The rankings, how they were measured, and what they mean for the tracks |
| `design/ratings.json`, `design/rank-tables.md` | The ratings as data for the game, and the full ranked tables |

## How a car is made

- **A body** in `BODIES`: designed lines (side silhouette, shoulder, sill, plan-view width, cladding)
  that are lofted into the skin, plus the numbers its parts fit to (doors, rails, fuel door, how high
  the chassis and the front and rear parts sit). A body can have an open bed behind the cab (`bed`).
- **A face and a tail** in `FACES` and `TAILS`: lamps, grilles and badges drawn in front or rear view
  and wrapped onto the body.
- **Builds** in `BUILDS`: which body, ride height, tyres and wheels, and the bolt-ons (`FRONTS`,
  `REARS`, `HOODS`, `EXTRAS`). A build can run bigger rear tyres on their own arches and track
  (`tyreR`, `archRr`, `trackR`), and the body then pitches over them, nose down.
- **An engine** in `ENGINE_OF`: a Digital Engine base engine plus bolt-ons, a gearbox and a weight.
- **An engine bay**, built from that same recipe by `buildBay` the first time the hood opens: the
  inner fenders, firewall, radiator and furniture, and an engine (`bayEngine`) that shows what the build
  has: an airbox or a cone filter, cast manifolds or headers, turbos with their piping and intercooler,
  a blower and its hat, individual throttle bodies, nitrous solenoids, electric fans, a strut brace.
  The bay is garage-only: it is never built or drawn with the hood shut, so driving costs nothing for it.

## Garage-only detail

The body is built in three pieces: the body, the hood, and the floor and wheel wells under the hood.
With the hood shut all three are drawn and the car looks exactly as it would on the road. With it open,
the hood swings up on its hinge, the bits under it are skipped and the bay is drawn in their place. On
the road the game can draw the body and the hood and never build a bay at all.

The one exception is an engine that sticks out through the hood, like the drag car's blower
(`engineOut`): that engine is part of the car on the road, so it is built with the car, a hole is
cut in the hood for it, and it is drawn whether the hood is open or not.
