# Mini Dirt Run Open World

Mini Dirt Run Solo's free play in a world forty miles square that is made as you drive. You start in a
garage. Route 6 runs dead straight east and west past the door for twenty miles each way, and a dirt
road heads north into the hills. Round them is a grid of blacktop, gravel and dirt roads a mile apart,
with an expressway two miles east, farms, small towns with grain elevators and water towers, creeks,
woods and power lines.

Every Mini Dirt Run Solo vehicle, part, driving level (Sim included), feat, sound and control is here.
Only free play: no career, no clock runs. Saves use their own keys (`mdow-*`), so they never mix with
Mini Dirt Run Solo's.

Published: https://claude.ai/artifact/AFTwsFP9GmbFMEM9HPRDtS

## How the world works

- **Everything is a function of where you are.** Height, ground, roads, farms, towns and trees all come
  from `WORLDGEN(seed)` in `src/worldgen.js`, so nothing is stored for the whole map and its size costs
  the phone nothing.
- **Chunks round the camera.** 128 m chunks are made at the detail their distance needs (every 2 m, 4 m
  or 8 m), with their roads, buildings, poles, trees and colliders. Beyond them, 512 m far tiles every
  32 m reach the horizon. Everything is let go once it's well behind.
- **A background worker makes them.** It gets `WORLDGEN` as text. If a browser won't run a worker, the
  same code runs on the main thread a few milliseconds a frame.
- **The physics is unchanged.** It reads the ground through Mini Dirt Run Solo's `GroundWorld` from each
  chunk's 2 m grid. Where a chunk isn't ready yet, it works the same grid points out directly, so the
  answer is the same.
- **Drawing is relative to the camera.** The GPU only ever sees numbers a few kilometres across, so
  nothing shakes however far out you drive.

## Build

```sh
./build.sh
```

`build.py` takes `base/mini-dirt-run-solo-sim.html` (Mini Dirt Run Solo with the Sim level, unchanged)
and writes `dist/mini-dirt-run-open-world.html`. It cuts out the ranch and the country round it, puts
in the open world, and patches the game: drawing relative to the camera, road markings, far-tile
blending, maps, places, free play only, the Dev tab and cruise.

## Layout

| Path | What's in it |
| --- | --- |
| `base/` | The Mini Dirt Run Solo page this is built from, untouched |
| `src/worldgen.js` | The generator: land, creeks, the road grid, farms and towns, chunk ground, chunk items, far tiles, map tiles, road and place queries |
| `src/world_rt.js` | The world in the game: the worker, which chunks to make and when, the physics' ground and colliders, drawing, trees, shadows, lights |
| `src/game_dev.js` | The Dev tab: world numbers overlay, view distance, worker or main thread, cruise, handling knobs, Sim switches |
| `src/game_maps.js` | The corner map and the big map (what you've seen, plus the roads and towns round you) |
| `tools/` | Node and Playwright checks: generator timings, a top-down map, a real-time flat-out stress run, screenshots, a boot check |

## Stress test

In the game: Dev tab, or **F** for the world numbers on screen and **T** for cruise. Cruise holds the
right-hand lane of the road you're on, flat out or at a set speed; brake to stop it. Go to has 5 and
10 miles out on Route 6 and the end of the road.

Headless, with the physics stepped in real time and nothing drawn:

```sh
node tools/stress.js "" coupeGT r6e 45       # the coupe flat out on Route 6 for 45 s
MAIN=1 node tools/stress.js "" coupeGT r6e 30 # the same with no worker
```

Measured in headless Chromium: at 186 mph the world kept up, with no holes and the ground under the car
ready every frame after spawn. A 2 m chunk takes about 6–11 ms in the worker, a 4 m one about 2 ms and an
8 m one under 1 ms. The world's meshes take about 9–10 MB on the GPU. The no-worker run also kept up,
at about 5–8 ms of a frame.

## Controls

As Mini Dirt Run Solo, plus **F** world numbers and **T** cruise.
W/↑ gas · S/↓ brake and reverse · A D steer · Space e-brake · Q E shift · O overdrive off · N nitrous ·
H horn · L low range · K lockers · J headlights · C camera · M map · R reset · I engine · Esc menu.
Game controllers and touch (made for a phone held sideways) work too.
