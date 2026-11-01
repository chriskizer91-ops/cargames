# QA sweep: Wide Open 2 as forked (1 November 2026)

## Summary

The game as forked from Wide Open, run top to bottom headless (Chromium under SwiftShader, through the game's own
functions and robots). **It works**: it boots clean on all four graphics levels, every menu control, place, car,
machine, preset, garage part, challenge, race (every difficulty), park clock, job flow, salt club and setting was
exercised with **no page errors and no NaNs anywhere**. The physics is untouched (physcheck worst difference 0
before and after; the proving table identical before and after).

Fixed (each its own commit on this branch):

| commit | what was wrong |
|---|---|
| `ca840d4` | The physics kept stepping under the opening screen, under the menu once a car had been rebuilt or moved there, under a challenge's result card and under the job dialog. Now nothing steps unless you are driving; a car placed while paused settles on its handbrake (`settleCar`); the engine note settles to idle while paused (Rut Access's fix). |
| `12507fb` | "Start the career over" saved the old career's cars and rigs over free play's: back in free play you were in the career's car and every free play build was stock again. |
| `d0ade16` | The menu's top line didn't follow a switch between the career and free play (the opening screen said "Career" in free play). |
| `cf8082d` | `tools/proving.js` could not run at all (inherited from Wide Open): stale module list, and a `design/ratings.json` this game never had. |
| `ca78968` | `tools/boot_node.js`'s graphics level was ignored (`?gfx=` is not read by the game); `tools/machine_check.py` and `tools/engine_tone.py` drove from Back Forty's `r6e`, not a place here, so the machines started boxed in Marisol's garage. |
| `b823727` | The phone's top bar still had the Gfx chip beside Menu (Rut Access's lesson: just Menu). |
| `e70b2d6` | On a phone held upright the menu ran off the right edge (a 560 px panel on a 412 px screen: the right column of cards, hints and the Plus button cut off, unreachable). |

Open (filed below with file:line and a recommendation): the challenge pars are out of step with today's robot
runs (the stock SUV takes gold on the full Outer Loop); the stock Hatch never stops under full brake on the proving
tool's flat ground at Realistic (physics: reported, not fixed); a few cosmetic items on the phone; documentation
that still names Wide Open's `cc-` keys and a day the game no longer has.

## How it was run (for the next person)

- **Python tools**: `pip install playwright` works here, but the Python package wants a browser build that isn't
  installed (and `playwright install` is not allowed). A `sitecustomize.py` that defaults `executable_path` to
  `/opt/pw-browsers/chromium` makes every `tools/*.py` run unchanged:
  ```python
  from playwright.sync_api._generated import BrowserType
  _o=BrowserType.launch
  def launch(self,*a,**k): k.setdefault('executable_path','/opt/pw-browsers/chromium'); return _o(self,*a,**k)
  BrowserType.launch=launch
  ```
  then `PYTHONPATH=<dir with that file> python3 tools/chal_drive.py all`.
- **Node checks** (the rest): a harness that boots the page, holds the loop (`GAME.hold=true`) and steps frames
  in-page (`step(1/60)`, `worldUpdate`, `setOrigin`, occasional `render`), because the page's own loop runs at about
  1 fps under SwiftShader here; real-time waits test nothing. Touch went through CDP `Input.dispatchTouchEvent`;
  sound needs `--autoplay-policy=no-user-gesture-required` and a wait for the synth port.
- Page screenshots: stub `requestAnimationFrame`, draw a few frames with `render`, then `page.screenshot` with a
  long timeout (30 to 130 s each at 915 x 412). `page.reload()` needs a long timeout too (30 s is not enough).
- `/home/user/scratch/` is shared with the agent porting the renderer in parallel: a scratch file of mine with a
  common name (`proving_before.txt`) was overwritten by someone else's run partway through. Keep scratch work in a
  folder of your own.
- The game has **one time of day**: the full moon (`TOD` in `59_daynight.js` holds only `night`); asking for `day`
  falls back to it.

## 1. The physics checks and the boots

- `node tools/physcheck.js` (baseline): 12 runs, **worst difference 0**.
- `node tools/proving.js` (baseline): **failed to run** (`MACH_IDS is not defined`, then a missing
  `design/ratings.json`); identical failure in Wide Open's own copy. Fixed in `cf8082d` (tool only). Its table on the
  unchanged physics, all 34 builds, is the reference below; it was identical after the last change.
- `sh build.sh` reproduced the committed page byte for byte before any change.
- Boot (`node tools/boot_node.js 6 out.png <level>`, after `ca78968`), 960 x 540, opening screen:

  | level | boot | page errors |
  |---|---|---|
  | mini | 8.0 s | none |
  | phone | 10.6 s | none |
  | laptop | 9.5 s | none |
  | ultra | 9.3 s (its snapshot frame then takes minutes in software) | none |

  `python3 tools/boot_check.py phone 2`: booted 16 s, ground ready 24.6 s, 45 chunks, no errors.

## 2. Rut Access's lessons

**(a) The menu as a pause.** Before: reverse never engaged under the menu here (the idle input carries `park:true`,
which the physics honours: `40_physics.js:387-388`), and the menu froze the car if it was opened from driving and
nothing changed. But the physics kept stepping (3 s of steps per 3 s) under the opening screen, after any car
rebuilt or placed under the menu (a preset, a garage part, Sim, a place, a mode switch), under a challenge's
result card (the car rolled on 23 m) and under the job dialog. With the brake key held as Escape was pressed, the
car stayed frozen (it had been opened from driving). After `ca840d4`: 0 steps in every one of those cases; a car
rebuilt under the menu sits settled (v = 0); the engine note posted to the synth goes from 4,510 rpm to the 650
idle within about a second (3,488 at 0.1 s, 828 at 1 s); the electric car's voice winds from 10,800 to 0.
Driving, racing, challenges and the robots are unaffected (they all run in the drive state).

**The pause in a race, a challenge and a job** (after the fix): opening the menu mid-race holds the race clock,
your car and the rivals exactly (4 s under the menu: no change), the race resumes when it closes; the menu says
"Paused: Speedway 25" and "Back to the race", and **Leave the race** ends it. Mid-challenge the run's clock holds;
**Quit the challenge** ends it. A timed job's clock holds under the menu.

**(b) Touch release.** Real touch events (CDP) at 915 x 412: opening the menu zeroes every touch input (`inputRelease`)
while a finger is still on the gas; a finger lifted while the menu or a result card is up still reaches its pedal
(Chromium keeps the pointer capture on the hidden element), so nothing stays held after; a finger still down when
the menu closes takes the pedal again only when it moves. Pass. Not verifiable headless: tapping Menu with a second
thumb while the first holds the gas (CDP's touch emulation cannot lift one finger of two).

**(c) The rest.** The phone's bar is just Menu: it wasn't (the Gfx chip), fixed in `b823727`. Back-face culling:
doesn't apply yet (today's renderer switches culling off for the world, the cars and the showroom; the challenge
columns switch it on and off again, `60_chal.js:443-444`): the renderer port must keep these two-sided meshes
unculled. The engine settling to idle while paused and the settle on the handbrake: done in `ca840d4`. The Dev
tab's Look and Engine-note sliders belong to the renderer port.

## 3. Every feature

**Free play and the career** (Node, through the Drive tab's cards and the garage's buttons): into a new career
($2,500, a stock SUV); earning; a tyre bought through the garage (the buy bar: "Buy and fit: 265/70R17 all-terrain ·
$960"; owned afterwards, money down $960); the Hatch bought at the dealer ($9,000); the Electric shown locked ("Opens
with Marisol's job, The Quiet One"); the Semi refused for want of money (the bar says how much you have, Buy
disabled). The save survived a reload (money, cars, parts, the current car, the mode). Back to free play: free
play's own cars and builds as they were. **Start the career over** (two taps): a fresh career, but free play's builds
were overwritten (fixed, `12507fb`). Settings' **Clear money, cool stuff and bests** (two taps): cleared.

**Every menu tab and control** (a sweep clicking every visible button and moving every slider, frames stepped
between, coming back to the menu when a control leaves it): Drive 61 controls (both game cards, all 18 cars, the
presets and Plus, the four levels, the Sim card, time of day, the three cameras, the 21 places), Challenges 24,
Races 10 (each race starts), Garage 59, Cool stuff (no controls), Settings 27, Dev 49. **No page errors.** The Sim
card's Light and Heavy cargo are disabled on the stock SUV (no rails), as designed.

**Every place on the Drive tab** (`goTo`, world streamed in, 2 s at rest): all 21 land upright (worst 0.996), still
(at most 1 cm of movement) and on their surface (garage concrete, the town's asphalt, gravel up Ridge Road, the
Wash's trail, the paddock's concrete, the oval's clay strip, the mud track's mud, the salt). "The bog" puts you on
the grass beside it and "Up in the hills" on Ridge Road, by design.

**The garage, every car and machine**: every slot opened and every part that fits picked through its own button
(1,457 picks over the 18 vehicles); after each the car is whole and the six ratings and the figures are numbers.
**Build it for me** for each of the seven targets on the SUV raises each one in free play (all-round 26 to 43,
mud 14 to 34, mountain 31 to 50); in a fresh career it only uses parts you own, as designed. Every preset of every
car (34) driven: below.

**The showroom, dyno lab and Tune sheet** (the Garage tab, Open the bay): every one of the look panel's 19 buttons
(the two studios, the nine views, spin, hood, lights, wash) clicked with frames drawn; the engine panel's 25 controls
listed and its buttons used (start, shift up and down, blip, purge, free rev and drive, the three listeners, the
three rooms); a **dyno pull** ran to its sheet (60 points, peak 193 whp at 5,746 rpm for the stock SUV); all six lab
tabs drawn (Sheet, Engine, Firing, Sound, Spectrum, Tune). **The Tune sheet in free play**: all 27 rows set to new
values, the engine remade whole, the car driven on it. **In the career**: a redline in the valve springs' stretch
asks "Valve springs for the SUV Stock · $1,400"; Not now puts it back to the line (6,200); Buy it pays $1,400 and
keeps 6,500; past the billet valvetrain it only says "Past that the engine comes apart"; a sound setting (crackle)
is free. No page errors. (The dyno pull took 16 minutes of real time under SwiftShader.)

**Every car and machine** (every preset, 34 builds): spawned, started, 1 s at rest, 5 s flat out with the nitrous
held on Highway 40, a frame drawn: no NaNs, no GL errors, no page errors (then the stock build of each of the 18
again; every run is under the full moon, the game's only time of day). `python3 tools/machine_check.py` (after `ca78968`): every machine pulls away, no
creep at rest, governors hold (kids' quad 13.4 mph against its 12.1 screw, golf cart 15.9, the semi held at 66.6 of
70), no NaNs.

**Every challenge** (`python3 tools/chal_drive.py all`, the stock SUV, the game's own run: countdown, gates, laps,
trap, mile, flight): all 21 timed ones ran with no NaNs; results in the table at the end. The drift zones and the
ramp run are scored by a person (the robot skips them); the result card and its three buttons were exercised (Try
again restarts, Drive on carries on, All challenges opens the list). The 0-200-0 fails in a stock SUV (it can't reach
200) and the slalom's robot runs wide (it doesn't slow for the cones): the robot's limits, not the game's.

**The people's jobs** (a career, through the game's flow: stop beside them, listen, take it, each step, the pay):
Marisol's First Night (talk to Deke, +$800), Deke's Jerry Can (to Rosa inside 80 s, +$1,200), Rosa's Pies Before
Midnight (left to run out: "TOO LATE · PIES BEFORE MIDNIGHT" at exactly 180 s, then "ASK ROSA AGAIN"; taken again and
delivered, +$2,000), Vince's Prove It (silver on the loop, +$2,000 and the medal's own pay), Bo's Dirt Day, Hal's The
Mile (after Rosa's chain). The part, medals and speed steps read correct (`jobStep`, `60_jobs.js:130`).

**Every race at every difficulty** (`python3 tools/race_run.py oval,elim,short,mud,ring,enduro,drag '' <diff>`):
21 races to the flag, results and prize paid, no NaNs, under 0.5 ms a frame for the game's step:

| race | easy | medium | hard |
|---|---|---|---|
| Speedway 25 | 1st, $1,820 | 4th, $730 | 4th, $1,020 |
| Last Car Out | 3rd (out lap 4) | 6th (out lap 1) | 5th (out lap 2) |
| Short Course | 2nd | 6th | 4th |
| Mud Track Dash | 3rd | 3rd | 4th |
| Boulevard Run | 1st, $2,100 | 2nd | 5th |
| Outer Loop Enduro | 5th | 3rd, $2,520 | 4th, $2,350 |
| Eighth-Mile Drag | 2nd | 2nd | 2nd |

**The park clocks and the Outer Loop** (`python3 tools/park_drive.py oval,short,mud,strip 1`, then `loop 1 '' 26`):
oval lap 37.2 s, short course 93.2 s, mud track 84.4 s, the strip's slip (RT 0.466, 60 ft 2.16, 330 ft 6.40,
ET 9.97 at 69.7 mph, no foul), the Outer Loop lap 573.4 s (capped at 26 m/s, as its notes say; uncapped the robot
flies off the S-bend in the woods). No NaNs, no ground steps.

**The salt clubs**: the track hypercar flat out on Highway 40 at 211 mph paid nothing (not the salt); deep on the
salt at 210 mph the 150 and 200 clubs paid once each (+$7,000); a second run paid nothing more.

**Settings**: display (dots / clear), dots, detail, dot text (Dev), haptics, steering (slide, tilt, buttons), volume,
graphics level, the engine sound's five choices, camera and driving level, each set through its own buttons: every
one took and **every one survived a reload**.

**Keyboard**: C cycles the three cameras, F the stats readout, Y cruise, V the pitch test (90, 80, true), L low range
and K lockers (each says "No ... on this car" where there is none), J lights, M the big map, O overdrive, T
traction (Dev), I the ignition, W half gas and Up full, 1-9 part gas, E/X and Q/Z shift, A/D and the arrows steer,
Space the handbrake, Shift/N nitrous, B purge, H horn, S the brake (and reverse once stopped), R reset,
Escape and P open and close the menu, Enter in a challenge's start ring starts it. All worked.

**The performance readout** (F, or Dev's HUD switch): drawn (frame time, 1% low, JS ms, draws, the per-pass
milliseconds, chunk and upload stats). On a phone it covers most of the left half of the picture (filed, cosmetic).

**The phone, 915 x 412 landscape** (page screenshots with the touch controls, before `b823727`): the opening screen,
every tab, driving, the result card, the job dialog, the job HUD, a race and its results all fit and read; the side
buttons sit in the pillarbox bars clear of the picture; the sticky Start driving button covers the bottom of each
tab's scrolling list, as a sticky footer does. The Gfx chip overlapped the minimap's top and the showroom's car name
(fixed).

**The phone, 412 x 915 portrait**: the game asks to be turned sideways and draws the picture as a 16:9 band with
the touch controls round it (playable, by design). The result card, the job dialog and the race results fit. **The
menu didn't**: the panel ran from 16 to 576 px on the 412 px screen, cutting off
the tagline, the right-hand column of cards, the hints and the Plus button with no way to scroll to them. The menu
is a one-column grid and its column was sized from the panel's own `min(560px,100%)` (or 880) rather than the screen.
Fixed in `e70b2d6` (`grid-template-columns:minmax(0,1fr)` on `#menu`): 380 px of 412 on every tab, landscape
unchanged (560 px at 915 x 412, measured before and after). Left over: the Settings tab's Dots row is 17 px wider
than the panel in portrait (filed, cosmetic).

## 4. Open bugs and recommendations

1. **Challenge pars out of step** (`src/60_chal.js:20-28`, `CH_PARS`). The stock SUV takes **gold** on the full
   Outer Loop lap (565.9 s in `chal_drive.py`, 573.4 s in `park_drive.py`, against gold 602.2; its par says the stock
   SUV runs 657.9, "the round-3 robot lap"), and misses bronze on the short course by 0.1 s (201.4 against 201.3; par
   179.7). Ridge Road also runs slower than its par (81.3 against 73.7, with a roll). Repro: `python3
   tools/chal_drive.py loopLap,short,ridge`. Recommendation: rerun `python3 tools/chal_drive.py pars` and update
   `CH_PARS` (a balance decision, so not changed here).
2. **Physics: the stock Hatch never comes to rest under full brake on the proving tool's flat asphalt at the
   Realistic level** (`node tools/proving.js hatch` prints `-` for 60-0; traced: from 60 mph it slows to about 12 mph,
   drops into first and rolls on at 9-12 mph at 1,250-1,700 rpm with the brake on the floor, indefinitely). Middle and
   Kids stop it in 4.1 and 3.5 s; the Group B hatch and every other build stop. In the game on Highway 40 it stops
   (0 mph by 4 s), so it looks like an edge of the factory traction control or the idle on perfectly flat ground.
   In `40_physics.js`: reported, not fixed.
3. **"Start the career over" keeps the old career's feats** (`src/60_career.js:61`, `careerWipe`): the career's Cool
   stuff (its log of feats, its bests and their running total, `wo2-cfeats`) survives the wipe. The button says "the
   career is gone for good". Recommendation: `Feats.clear()` after the wipe's `setMode('career')` (left as is: whether
   bests belong to the career is the owner's call).
4. **A selected menu tab can be off the edge of the tab row** (`src/62_menu.js:40`, `showTab`): at 915 px the row
   ends at Settings; Dev is reached by swiping the row (it scrolls, with no scrollbar), and a tab selected by the game
   isn't scrolled into view. Recommendation: scroll the selected tab into view in `showTab`.
5. **The stats readout covers the phone's picture** (`src/52_world_dev.js:83`, `drawWorldStats`): at 915 x 412 its
   text and graph take most of the left half, over the HUD's flags and the steering area. Cosmetic (a Dev readout);
   Phase 3 may want a smaller phone layout for it.
6. **"SLIDE TO STEER" partly under the steering knob** at rest (`shell/game.head.html:48-50`): cosmetic.
7. **Documentation**: `README.md:91-92` and the header of `src/60_career.js:8-9` still name Wide Open's save keys
   (`cc-career`, `cc-game`, `cc-tune`, `cc-fchal`); the game uses `wo2-` keys. The README's world says "day" in
   places; the game has only the full moon.
8. **Settings' Dots row in portrait** (`shell/game.head.html`, the row holding `#sDots`): 17 px wider than the
   panel at 412 px (five sizes on one line). Cosmetic; the `.seg` rows elsewhere scroll inside themselves.
9. **Not verifiable headless**: tapping Menu with one thumb while the other holds the gas (CDP cannot lift one
   finger of two). The Menu button listens for `click` (`src/62_menu.js:152`); if the phone test shows it ignoring a
   second-thumb tap, `pointerup` on it would be the fix.

### Status after Phase 3 (the phone pass, 1 November)

1. **Pars**: `chal_drive.py pars` rerun on Wide Open 2 and `CH_PARS` updated (step 4 of Phase 3: the old and new
   numbers are in that commit). The physics is unchanged, so the pars were stale in Wide Open too. The full Outer
   Loop's gold is now 518.4 s (was 602.2): the stock SUV's 566 s robot lap is a silver.
2. **The stock Hatch under full brake**: investigated, not fixed (the physics modules are not changed here). From 60
   mph at Realistic on the proving tool's flat asphalt it slows to about 12 mph, then in first gear holds 9 to 12 mph
   with the brake on the floor. In `40_physics.js`: below about 12 mph the wheels lock under full brake at 100%
   traction; the ABS (line 492: above 2.5 m/s, whenever a wheel's slip passes its threshold, that wheel's brake
   torque is cut, down to a fifth) lets them go; the automatic's clutch re-engages whenever the driven wheels turn
   the engine faster than 1.1 times idle (line 210), and the idle governor adds torque whenever the engine is pulled
   below idle (line 196), so in first gear the engine drives the car against an ABS that keeps letting go, and the
   car settles where the two balance, never reaching the 2.5 m/s under which the ABS would stop. Outside the
   physics: the game drives at 200% traction by default (`54_dev.js`, `DEV_ALL0=2`, put on every car by `devFit`),
   where the wheels don't lock and the Hatch stops in about 4 s (traced: 0 m/s at 4.0 s); `tools/proving.js`'s flat
   ground has no traction setting (a `GroundWorld` with no `grip`: 100%), so its 60-0 column tests a ground the game
   never drives on by default.
3. **The career wipe**: `Feats.clear()` after the wipe (the old career's feats and their money go); the bests are
   kept, as records of the game rather than of the career (the owner's call, either way).
4. **The tab row**: the selected tab is scrolled into view.
5. **The stats readout on a phone**: the small performance readout under the HUD's name block (F, or the Dev tab:
   Off, Readout, Everything); the full numbers stay for a laptop.
6. **SLIDE TO STEER**: over the knob's track, centred on it.
7. **Documentation**: `README.md` and `60_career.js` name the `wo2-` keys; the README describes the three times of day.
8. **The Dots row upright**: fits (each side of a two-setting row may shrink; the buttons scroll inside it).
9. **Menu with a second thumb**: answers the touch's pointerup, and the menu's opening lets go of every pedal, the
   handbrake and the steering; still not verifiable headless (the touch emulation can't lift one finger of two).

## 5. Challenge results (stock SUV, `chal_drive.py all`)

| id | result | medal | id | result | medal |
|---|---|---|---|---|---|
| loop | 2:49.50 | bronze | oval | 1:49.58 | silver |
| quarter | 0:15.50 | bronze | short | 3:21.40 | none (0.1 s off) |
| dash | 1:01.78 | silver | mudtrack | 2:45.93 | silver |
| salt | 0:59.68 | bronze | eighth | 0:09.93 | bronze |
| trap | 112.8 mph | bronze | mile | 121.7 mph | bronze |
| ridge | 1:21.27 | bronze | jump | 310 ft | bronze |
| wash | 1:53.72 | silver | smile | 0:40.47 | bronze |
| loopN | 1:24.03 | silver | stop100 | 0:27.00 | bronze |
| loopLap | 9:25.88 | **gold** | stop200 | out of time (can't reach 200) | none |
| bog | 0:18.90 | bronze | mile2 | 123.3 mph | bronze |
| slalom | out of time (robot runs wide) | none | drift, pdrift, ramprun | scored by a person | |

## 6. Final checks

- `node tools/physcheck.js` after the last change: **worst difference 0**.
- `node tools/proving.js` after the last change: the physics columns of all 34 builds identical to the baseline
  (the table below). The rankings' columns are blank: this game has no `design/ratings.json`.
- `sh build.sh`: the built page and the artifact copy are committed with each fix and rebuild identically;
  `node tools/boot_node.js 4 '' phone` boots the final page in 9.5 s with **no page errors**.
- The pause checks rerun on the final page: 0 physics steps under the opening screen, the menu (opened driving, after
  a rebuild, after a place), the challenge result card and the job dialog; a car rebuilt under the menu sits still
  (0.002 m/s) when driving resumes.

## 7. The proving table (unchanged physics; identical before and after)

```
build          0-60   0-100  1/4 mile        top | grip 20m/s 35m/s gravel | 60-0 ft | ranked: 0-60  grip  dirt
stock           7.6   20.8  15.80 @ 90   133 |      0.79  0.83   0.61  |   155   |          -      -      -  
sleeper         2.8    5.1  9.99 @ 156   241 |      0.88  0.93   0.60  |   148   |          -      -      -  
crawler         3.6    6.1  10.70 @ 157   247 |      0.67  0.69   0.59  |   176   |          -      -      -  
race            2.9    5.2  10.17 @ 151   154 |      1.06  1.13   0.46  |   125   |          -      -      -  
trail           8.9   28.9  16.69 @ 82   118 |      0.77  0.79   0.62  |   156   |          -      -      -  
trailRig        4.9   10.7  13.04 @ 111   152 |      0.69  0.70   0.59  |   174   |          -      -      -  
coupe           5.7   10.1  13.39 @ 123   205 |      1.07  1.13   0.67  |   123   |          -      -      -  
coupeGT         4.6    7.4  11.72 @ 149   186 |      1.26  1.41   0.50  |   104   |          -      -      -  
wagon           4.7   11.2  13.40 @ 107   172 |      0.84  0.89   0.62  |   153   |          -      -      -  
wagonSleeper    3.3    6.8  11.01 @ 134   194 |      1.00  1.04   0.54  |   140   |          -      -      -  
pickup          6.8   19.9  15.48 @ 91   133 |      0.80  0.84   0.66  |   154   |          -      -      -  
prerunner       4.5   10.4  12.98 @ 110   157 |      0.77  0.79   0.63  |   159   |          -      -      -  
muscle          6.9   12.9  14.96 @ 112   126 |      0.90  0.94   0.64  |   142   |          -      -      -  
muscleDrag      4.2    7.1  11.38 @ 150   220 |      0.69  0.74   0.50  |   164   |          -      -      -  
hatch           4.8   11.4  13.47 @ 110   153 |      0.90  0.95   0.57  |   -     |          -      -      -  
hatchB          3.7    6.8  11.47 @ 119   119 |      0.84  0.90   0.77  |   140   |          -      -      -  
quad90          -      -    33.11 @ 31    31 |      0.58  0.58   0.55  |    57   |          -      -      -  
quad450         8.0    -    17.00 @ 72    72 |      0.61  0.62   0.56  |   163   |          -      -      -  
quadUtil        8.3    -    17.02 @ 70    70 |      0.66  0.67   0.55  |   173   |          -      -      -  
sxs             7.6    -    16.24 @ 78    78 |      0.82  0.86   0.66  |   149   |          -      -      -  
golf            -      -    59.31 @ 16    16 |      0.57  0.57   0.44  |    17   |          -      -      -  
kart            -      -    32.15 @ 31    31 |      1.01  1.01   0.51  |    39   |          -      -      -  
tractor         -      -    68.18 @ 14    14 |      0.51  0.51   0.44  |    15   |          -      -      -  
semi           20.5    -    25.17 @ 67    96 |      0.75  0.74   0.56  |   148   |          -      -      -  
quad450X        8.0    -    17.00 @ 72    72 |      0.61  0.62   0.56  |   163   |          -      -      -  
quadUtilX       8.3    -    17.02 @ 70    70 |      0.66  0.67   0.55  |   173   |          -      -      -  
sxsX            7.6    -    16.24 @ 78    78 |      0.82  0.86   0.66  |   149   |          -      -      -  
golfX           -      -    59.31 @ 16    16 |      0.57  0.57   0.44  |    17   |          -      -      -  
ev              3.3    6.4  11.00 @ 137   166 |      1.08  1.12   0.69  |   108   |          -      -      -  
evRace          2.5    4.4  9.42 @ 161   171 |      1.26  1.34   0.49  |    89   |          -      -      -  
wedge           5.4   10.3  13.44 @ 116   190 |      1.05  1.09   0.66  |   139   |          -      -      -  
wedgeNR         4.6    7.8  11.92 @ 151   197 |      1.11  1.21   0.69  |   128   |          -      -      -  
hyper           3.7    6.8  11.33 @ 140   196 |      1.15  1.21   0.73  |   111   |          -      -      -  
hyperTrack      2.8    4.9  9.82 @ 160   209 |      1.34  1.47   0.51  |   107   |          -      -      -  
```
