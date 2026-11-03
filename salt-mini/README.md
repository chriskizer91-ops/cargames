# Redline County: Salt Mini

**Salt Mini** (the folder `salt-mini/`, the page `salt-mini.html`): a small standalone page. The SUV Studio's full
truck (`../suv-studio/`, about 484 000 triangles with its wheels) on Road Not Found + Traffic's own physics, driven
exactly as in SUV: Super Unlimited Venture (`../suv-venture/`): the same physics setup, controls and driving level.
It sits on a bare salt flat with a ten-mile road across it, with a speedometer, nitrous and the tuner bay.
**No sound yet.**

Open `salt-mini.html` in a browser with WebGL2 (one self-contained page, about 2.2 MB). `sh build.sh` rebuilds it
(run `npm ci` in this folder once first).

![On the road with the nitrous lit](docs/road.png)

![The tuner bay](docs/tuner_bay.png)

## Driving

- **Keys**: W A S D or the arrows, Space for the e-brake, N or Shift for NOS, T for the tuner bay, C for the camera
  (Chase or Look, free round the truck), R to go back to the start line.
- **Phone**: steering bottom left, brake and gas bottom right, NOS above the gas, the e-brake above the brake, the
  dial at the top right.
- **The road**: 10 miles of two-lane blacktop running straight out from the start line, with white edge lines, a
  yellow dashed centre line, and a bar across the road with a sign at the start, the quarter mile and every mile.
  The road is the game's asphalt. The salt runs on forever and uses the game's own salt-flat surface, a little
  looser than the road.
- **The speedometer** reads in mph. Its scale steps up as you outrun it (160, 240, 320, up to 640). Inside it are
  the gear, a rev arc with the redline, the nitrous bottle (the cyan arc at the bottom, flashing while it fires) and
  the run's top speed.
- **NOS** is the physics' own nitrous: it fires with the gas floored and not mid-shift. A bottle lasts eight
  seconds and refills by itself in about twelve while you're off it. The page starts with a 125-shot fitted.

## The tuner bay

The bay stops the truck where it stands, swings the camera round it and opens the game's Tune sheet beside it. It
has the sheet's rows that change how the truck goes (the sound-only rows wait for the sound):

- **Engine**: layout, displacement, redline, camshaft.
- **Induction**: type, boost, turbo size, anti-lag, intake.
- **Exhaust** and the **nitrous** shot.
- **Plus power**: the game's Plus tune, up to twice the torque at every rev.
- **Final drive** and **Help** (the driving level).

Every change goes through the game's own path (`16_engines` `engineSpec` with the sheet's keys), with the sheet's
rules: a bigger engine keeps its torque per litre, and a lower redline pulls the launch revs and the idle down with
it. Above the rows are a dyno chart (hp and lb-ft against rpm), the peaks, and a top-speed estimate. The estimate
works gear by gear the way the automatic shifts, and never asks the tyres for more than they can put down. Press
**Drive** and the truck is rebuilt with the new engine where it stood. The tune is kept in this page's own save
(`sm-mini`).

Checked against full-throttle runs on the road:

| Tune | Peak | Estimate | Measured |
|---|---|---|---|
| Stock + 125 shot (no NOS used) | 294 hp | 134 mph | about 132 mph |
| 9 L twin turbo, 2.5 bar, 9,000 rpm, final drive 2.2 | 2,237 hp | 271 mph | 266–273 mph |
| The same at 3.5 bar, 10,000 rpm, final drive 2.0, Plus × 2 | 6,185 hp | 366 mph | 360–362 mph |

Past about 300 mph the tyres, not the engine, are the limit. The truck runs dead straight at every speed.

## What it's made of

- `src/game`, `src/drive`, `src/hd`: copies from SUV: Super Unlimited Venture. The physics (`40_physics`,
  `41_ground`, `42_chassis`, `43_sim`, `44_ai`, `45_ev`, `15_digital_engine`, `32_builds`, `37_newbuilds`,
  `34_machines`) is unchanged, except that `16_engines` and `43_sim` use this page's save keys (`sm-tune`, `sm-sim`).
- `src/mini/91_kit.js`: what the page takes from the game's code, including the tuner's way into `engineSpec` and
  `plusSpec`.
- `src/mini/main.js`: the page. It has the sky with the sun behind the truck, the salt (one big square that follows
  the truck, with the picture laid at three sizes so it doesn't visibly repeat), the road and its signs, the truck,
  the chase camera (kept round the truck so it never falls behind, a little wider with speed and on nitrous), the
  controls and the bay.
- `src/mini/speedo.js`: the dial. `src/mini/tuner.js`: the bay's sheet, chart and estimate.
  `src/mini/mats.js`: SUV Studio's materials.
- `src/mini/49_ground.js`, made by `tools/pack_ground.py`: the salt (the owner's playa picture, turned grey and
  lifted toward white) and the county's asphalt.
- `tools/shot.js`: headless pictures and numbers (`node tools/shot.js /tmp/mini 'run=MINI.step(10,{thr:1})'`).

## Next

The sound: the game's Digital Engine, with the sheet's sound rows coming back to the bay.
