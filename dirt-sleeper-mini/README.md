# Dirt Sleeper Mini

The model bay: four cars and their builds on a turntable, drawn on an LED dot matrix, each with
its own engine running live in the Engine tab.

| Car | Builds | What it is |
| --- | --- | --- |
| SUV | Stock, Sleeper, Rock & Mud, Race | A mid-2000s luxury SUV, built every way the game allows. |
| 4x4 | Stock, Crawler | A short two-door off-roader that is good in the dirt from the factory, then lifted onto 37s with an exo-cage. |
| Coupe | Stock, GT | A front-engine flat-plane V8 fastback that is a track car with plates, then a widebody GT race car. |
| Wagon | Stock, Sleeper | A plain family wagon with a turbo five and all-wheel drive, then a big-turbo sleeper that still looks like a grocery getter. |
| Pickup | Stock, Prerunner | A full-size crew cab in factory off-road trim, then a long-travel desert prerunner with two spares in a bed cage. |
| Muscle | Stock, Drag | A 1970-style big-block fastback, then a blown, tubbed pro-street drag car on slicks with wheelie bars. |
| Hatch | Stock, Group B | A mid-1980s turbo four-wheel-drive homologation hatch, then a full Group B gravel rally car with anti-lag. |

Open `model-bay.html` in a browser with WebGL2. Pick a car, then a build; **Compare** shows all of a
car's builds at once. **Hood** (or H) opens the hood, and the **Bay** view looks into the engine bay.

## Files

| Path | What's in it |
| --- | --- |
| `model-bay.html` | The whole bay in one file |
| `reference/image-prompts.md` | The prompts for the reference sheets the 4x4, coupe, wagon, pickup, muscle car and hatch were modelled from |
| `tools/shot.js` | Screenshots for checking the cars by eye: `node tools/shot.js <out-dir> <build>:<view>[:<stage>]` |

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
