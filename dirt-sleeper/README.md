# Dirt Sleeper

A driving game about one truck: an original mid-2000s luxury SUV in bronze-grey that you build
into a dirt-drag sleeper, a mud rig, or both, on a ranch with a dirt strip, a trail loop, a hill
climb and a mud pit.

- **Campaign**: start with $2,500 and a stock truck, beat seven drag racers, earn medals and fill a
  16-trophy case.
- **Free play**: every part, racer and run unlocked, no prices.

Everything runs in one HTML file with no dependencies: WebGL2 graphics (from the Shiftlight 3
renderer), live engine sound (from Digital Engine), and a live-synthesised environment.

## Build

```sh
./build.sh
```

This writes `dist/dirt-sleeper.html` (the page body, as published) and
`dist/dirt-sleeper.local.html` (a full HTML document you can open straight from disk).

## Layout

| Path | What's in it |
| --- | --- |
| `src/10`–`15` | Renderer, car shader pipeline, particles, maths, engine DSP and engine specs (from Shiftlight 3 and Digital Engine) |
| `src/20`–`22` | Tyre model, powertrain and vehicle physics |
| `src/30`–`33` | Input, game audio (tyres, ground, mix bus) and the ambience synth |
| `src/40`–`41` | The ranch: terrain, strip, trails, shop, and their materials |
| `src/50`–`51` | The truck's mesh, bolt-on parts and paint shader |
| `src/60`–`61` | The parts catalogue and how a build becomes an engine, a chassis and a look |
| `src/70`–`90` | Game flow, events, rivals, trophies, UI and boot |
| `shell/` | The page shells: title, styles, markup |
| `tools/` | Node and Playwright checks: mesh winding, drag estimates, autopilot runs, audio renders, screenshots |

## Controls

W/↑ gas · S/↓ brake (hold to reverse) · A D steer · Space handbrake · Shift nitrous · L low range ·
K lockers · F light bar · H horn · C camera · R flip/reset · Esc pause. Gamepads and touch work too.
