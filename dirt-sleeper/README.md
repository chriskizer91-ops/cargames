# Dirt Sleeper

A driving game about one truck: an original, fictional mid-2000s luxury SUV that you build into a
dirt-drag sleeper, a mud rig, or both, on a ranch with a dirt strip, a trail loop, a hill climb and
a mud pit.

Free play is the main game. It opens on four trucks, each the best arrangement of parts for its job,
found by running the game's own physics over the strip, the bog and the climb:

- **Starter**: the truck as it left the factory.
- **Sleeper**: looks stock, runs a 7.97 on the dirt eighth. Twin-turbo V6 with bigger turbos and a
  250-shot, race four-speed, all-terrains on the factory alloys.
- **Mudder**: six-inch lift, 40-inch swampers, a blown big-block, low range and lockers. Gold in the
  bog and up Red Hill.
- **Racer**: twin-turbo big-block, paddle tyres, wheelie bars. A 7.47 on the dirt eighth.

The ranch has a **burnout pad** east of the shop (hold G for the line lock and floor it), a **rock
garden** past it on its own half-metre heightfield, a **mud track** out west that fords the creek twice,
plus the drag strip, the Ridge Loop, Red Hill and the mud pit. The pause menu jumps straight to any of
them and shows your bests: biggest burnout, longest air, fastest mud lap, best rock-garden run. Big
jumps, drag launches and big burnouts play back in slow motion from the side; Y replays the last few
seconds any time.

- **Campaign**: start with $2,500 and the Starter, beat seven drag racers, earn medals, earn the
  Sleeper (beat The Professor), the Mudder (gold in the Mud Bog) and the Racer (beat The Ghost), and
  fill a 16-trophy case.

The truck has a tall, square face, hips over both axles, a raised centre on the hood and textured
cladding around the arches and along the rockers, with three front ends, two tail-lamp styles and a
pile of bolt-ons.

![The truck in three of its looks, rendered in the game](../docs/dirt-sleeper/looks.png)

**Tuning panel.** Press Tab while driving (or Pause → Tuning and sounds) for live sliders: grip per
surface, slope slip on loose ground, grip once a tyre is spinning, engine power and a torque cap in 1st
and 2nd, springs, shocks, sway bars, weight, tip-over resistance, brakes, steering, and gravity in the
air. Every default is the game as it ships (the baseline); V flips between your set and the baseline
while you drive. A set copies out as a short code (`DSTUNE1.…`), and the set picked as the best one
becomes the baseline in `src/19_tune.js`.

Everything runs in one HTML file with no dependencies: WebGL2 graphics (from the Shiftlight 3
renderer), the engine from Digital Engine played exactly as its lab plays it (same synth, compressor
and room), and the other sounds synthesised live from the physics: tyre rumble, dirt under the tread,
wheelspin, suspension thumps and landings, body hits and scrapes, mud, and the HUD. Those were rebuilt
from scratch with no ringing resonators; each stays off in the game until it's approved on the sound
board. Water and gravel are waiting for recordings.

## Build

```sh
./build.sh
```

This writes two pages, each as the page body (as published) and as a `.local.html` full document
you can open straight from disk:

- `dist/dirt-sleeper.html`: the game.
- `dist/sound-board.html`: the sound board. Pick a scene (shop, trail, gravel road, strip, burnout,
  jumps, mud bog, rock crawl, water crossing), solo a sound, switch its versions, set levels against the
  engine at idle or redline, then paste the mix code (`DSMIX3.…`) into the game's Sounds panel.

## Layout

| Path | What's in it |
| --- | --- |
| `src/10`–`15` | Renderer, car shader pipeline, particles, maths, engine DSP and engine specs (from Shiftlight 3 and Digital Engine) |
| `src/19` | The tuning panel's numbers and the baseline |
| `src/20`–`22` | Tyre model, powertrain and vehicle physics |
| `src/30`–`34` | Input, game audio (the ground and body synth, the lab's engine chain and rooms, buses, limiter), the shop and HUD sounds, and the shared mix |
| `src/40`–`41` | The ranch: terrain, strip, trails, shop, burnout pad, mud track, rock garden, and their materials |
| `src/50`–`51` | The truck's mesh, bolt-on parts and paint shader |
| `src/60`–`61` | The parts catalogue and how a build becomes an engine, a chassis and a look |
| `src/70`–`90` | Game flow, events, rivals, trophies, UI and boot |
| `src/95` | The sound board |
| `shell/` | The page shells: title, styles, markup |
| `tools/` | Node and Playwright checks: mesh winding, drag estimates, autopilot runs over the trail, climb and bog, the preset search (`tune_builds.js`, `tune_mudder.js`), screenshots (`truck_shots.py`), the sound renders and their tone test (`fxcheck.js`) |

## Controls

W/↑ gas · S/↓ brake (hold to reverse) · A D steer · Space handbrake · Shift nitrous · G line lock ·
Y instant replay · L low range · K lockers · F lights · H horn · C camera (chase, far, cinematic, hood,
driver) · R flip/reset · Tab tuning panel · V your tuning or the baseline · Esc pause. Gamepads and
touch work too.
