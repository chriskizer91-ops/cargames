# Dirt Sleeper Mini

The model bay: four cars and their builds on a turntable, drawn on an LED dot matrix, each with
its own engine running live in the Engine tab.

| Car | Builds | What it is |
| --- | --- | --- |
| SUV | Stock, Sleeper, Rock & Mud, Race | A mid-2000s luxury SUV, built every way the game allows. |
| 4x4 | Stock, Crawler | A short two-door off-roader that is good in the dirt from the factory, then lifted onto 37s with an exo-cage. |
| Coupe | Stock, GT | A front-engine flat-plane V8 fastback that is a track car with plates, then a widebody GT race car. |
| Wagon | Stock, Sleeper | A plain family wagon with a turbo five and all-wheel drive, then a big-turbo sleeper that still looks like a grocery getter. |

Open `model-bay.html` in a browser with WebGL2. Pick a car, then a build; **Compare** shows all of a
car's builds at once.

## Files

| Path | What's in it |
| --- | --- |
| `model-bay.html` | The whole bay in one file |
| `reference/image-prompts.md` | The prompts for the reference sheets the 4x4, coupe and wagon were modelled from |
| `tools/shot.js` | Screenshots for checking the cars by eye: `node tools/shot.js <out-dir> <build>:<view>[:<stage>]` |

## How a car is made

- **A body** in `BODIES`: designed lines (side silhouette, shoulder, sill, plan-view width, cladding)
  that are lofted into the skin, plus the numbers its parts fit to (doors, rails, fuel door, how high
  the chassis and the front and rear parts sit).
- **A face and a tail** in `FACES` and `TAILS`: lamps, grilles and badges drawn in front or rear view
  and wrapped onto the body.
- **Builds** in `BUILDS`: which body, ride height, tyres and wheels, and the bolt-ons (`FRONTS`,
  `REARS`, `HOODS`, `EXTRAS`).
- **An engine** in `ENGINE_OF`: a Digital Engine base engine plus bolt-ons, a gearbox and a weight.
