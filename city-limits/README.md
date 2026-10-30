# City Limits

A night-time racer under a full moon: a little city with a boulevard that rings it, off-road country around it, and endless salt flats past that. Career or free play, a garage of parts, 14 challenges with medals, and 14 jobs from people round town.

Open `city-limits.html` in a browser to play (mobile first, a Pixel 7a; also a computer).

## What this file is

The published page, saved byte for byte (claude.ai artifact version `1793374268-0ba7`, sha256 `51752fa5…abe634`). The original modular source (ES modules built with esbuild) was never committed, so this page is the only copy. It is readable: every module starts with a `// src/...` marker, so it can be split back into modules later.

- Renderer, world code, HUD, touch controls and camera: Shiftlight 3, at its Mobile and Low settings.
- Cars, physics, the Sim level, parts and ratings: Dirt Sleeper HD's modules, joined into one module (`hd_gen`).
- Engine sound: the Digital Engine's synth, unchanged, with Back Forty's "Fuller" body by default.
- Saves use `cl-` keys only (`cl-settings`, `cl-engine`, `cl-career`, `cl-free`).
