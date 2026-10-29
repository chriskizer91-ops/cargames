# Dirt Sleeper HD

Free roam on the ranch and the country round it, in any of seven cars built any way the garage
allows, for money, drawn on an LED dot matrix. This is its own version of the game, kept apart from
the others in this repo. It started as two forks of Dirt Sleeper Mini's game merged into one:

- **Mini Dirt Run Solo**: the garage (every car built a part at a time, from presets), ratings on
  six kinds of ground, feats that pay (drifts, jumps, two wheels, saves, speed runs, burnouts, close
  calls, splashes, the mud pit, Red Hill, the rock garden, laps, clock runs) with combos, day and
  night, phone controls made for a phone held sideways (slide or tilt to steer, pressure pedals).
- **Dirt Sleeper Sim**: a fourth driving level, Sim (true load transfer, soil trip, edge catch,
  shock and brake fade, roof loads, tyre pressure, weather, ABS by era), and graphics levels with
  real sun shadows, clouds and rain.

From here it is being taken further toward Shiftlight 7's look, with graphics levels for a phone
and for a laptop.

Open `dirt-sleeper-hd.html` in a browser with WebGL2.

## Files

| Path | What's in it |
| --- | --- |
| `dirt-sleeper-hd.html` | The whole game in one file (built) |
| `build.sh` | Builds the page: the shell's head, the source modules in order, the shell's tail. Run `./build.sh` after changing anything in `src/` or `shell/` |
| `src/` | The modules. 10-33: the display, the meshes, the engines and their sound, the seven bodies, their parts, wheels and builds. 40-43: the physics, the ground contact, each build's chassis and the Sim level. 50-55: the country, the ranch, its drawing, the dust and mud, the developer panel and the graphics. 56-65: the garage's parts, the ratings, the feats, day and night, the game, its HUD, menu, garage, touch controls and boot |
| `shell/` | The page's head (title, styles, markup) and tail |
| `tools/physcheck.js` | Steps the physics beside Dirt Sleeper Mini 4's (`tools/ref/dsm4-physics.js`) on the first three levels, with the e-brake's free centre diff switched off (`hbCentre`), and reports the worst difference: `node tools/physcheck.js` |
| `tools/proving.js` | Every factory build through a drag run, grip tests and a 60-0 stop: `node tools/proving.js [build ids...]` |

## Where the pieces came from

The car, engine, physics and world modules are Dirt Sleeper Mini's (`../dirt-sleeper-mini/src`) at
the time of the split, with each fork's changes merged in:

- Mini Dirt Run Solo: the 4.6 V8 retuned to the real engine's curve, a quicker six-speed automatic,
  a single turbo for engines that never had one, overdrive off (O), the e-brake freeing an
  all-wheel-drive car's centre diff, low range ratios per transfer case, headlights and yard lights
  as spot lights, stars and the moon.
- Dirt Sleeper Sim: everything under the Sim level (`43_sim`, and the parts of `40_physics`,
  `41_ground` and `42_chassis` that only act when a car is on it), the sun's shadow map, clouds, wet
  ground and rain (`55_gfx`), and the scene drawn at no more than the screen's own pixels.

The game, HUD, menu, garage and touch modules are Mini Dirt Run Solo's, with the Sim card, the
graphics choice and the developer panel (a Dev tab) added. Saved settings use their own `dshd-`
keys, so this version never reads or overwrites another version's.
