# Rut Access: Road Not Found

The next game in the Dirt Sleeper line: Dirt Sleeper Showdown's driving, cars, races and stunts, with
Mini Dirt Run Solo's quads and odd machines, drawn by Shiftlight 3's renderer at its phone settings, for a
Pixel 7a. Noon, golden hour and night; clear, rain and fog; at night, lamps where a real place would have
them.

[`BRIEF.md`](BRIEF.md) is the plan: what the game is, where every piece comes from, what must not change,
and the phases to build it in. This README says where the build stands.

Open `rut-access.html` in a browser with WebGL2, or on a phone held sideways.

## Where it stands

**Phase 0, the fork, is done.** `rut-access.html` is Dirt Sleeper Showdown (branch
`dirt-sleeper-showdown/cross-country`) with the title and the saved-settings keys changed (`rut-`, so this
game never reads or overwrites another version's). It plays exactly like Showdown: the same seven cars and
sixteen factory builds, the two-mile world, the four driving levels, the feats, the races, the rivals who
size you up and the callouts at the strip. Every Showdown tool runs on it with the same results, and
`tools/check_de.py` proves its Digital Engine is byte for byte the lab's.

Next: Phase 1, Shiftlight 3's renderer.

## Layout

| Path | What's in it |
| --- | --- |
| `BRIEF.md` | The build brief |
| `rut-access.html` | The whole game in one file (built) |
| `dist/rut-access.artifact.html` | The same page without its outer tags, for publishing as an artifact |
| `build.sh` | Builds both: the shell's head, the source modules in order, the shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The modules, Showdown's: 10-33 the display, the meshes, the engines and their sound, the seven bodies, their parts, wheels and builds; 40-45 the physics, the ground contact, each build's chassis, the Sim level, the robot drivers and the cross-country routes; 50-55 the far country, the country, the ranch, its drawing, the dust and mud, the developer panel and the graphics; 56-65 the garage's parts, the ratings, the feats, day and night, the game, the races and callouts, its HUD, menu, garage, touch controls and boot |
| `shell/` | The page's head (title, styles, markup) and tail |
| `design/ratings.json` | Each factory build's six ground ratings |
| `lab/digital-engine.html` | The Digital Engine lab: the engine synth and sim every Dirt game uses, and a page to hear them in |
| `docs/visual-comparison.jpg` | Shiftlight 3 on its Mobile setting beside every Dirt game on its best, the look to aim for |
| `tools/physcheck.js` | Steps the physics beside Dirt Sleeper Mini 4's (`tools/ref/dsm4-physics.js`) and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | Every factory build through a drag run, grip tests and a 60-0 stop: `node tools/proving.js [build ids...]` |
| `tools/races.js`, `cross.js`, `ladder.js` | The robot drivers round every course, down every cross-country route, and down the eighth mile: `node tools/races.js par`, `node tools/cross.js`, `node tools/ladder.js` |
| `tools/showdown_check.js` | The built page in headless Chromium: a whole race on each route with a robot in your seat, then a callout; fails on any page error: `node tools/showdown_check.js` |
| `tools/check_de.py` | Proves the game's Digital Engine block is byte for byte the lab's: `python3 tools/check_de.py` |
| `tools/shot_showdown.js`, `shot_sl3.js`, `shot_dirt_sleeper.js` | Headless screenshots of this game (and HD, Showdown, Open World), of Shiftlight 3, and of the original Dirt Sleeper |
| `tools/sheet.py` | Lays screenshots out in a labelled grid |
