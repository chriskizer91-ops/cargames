# City & Country (working title)

Back Forty's game with City Limits' town, cars and night. Everything from Back Forty (its cars, machines, garage
window with the dyno lab and the Tune sheet, the Plus tune, the Sim level, the dev panel, the settings, the phone
controls) in a new world: City Limits' town at its own size in the middle, the country round it, and the salt
flats past that, under a full moon.

Open `city-and-country.html` in a browser with WebGL2. `sh build.sh` rebuilds it from `src/`.
Saves use `cc-` keys only, so nothing is shared with Back Forty (`b40-`) or City Limits (`cl-`).

## Where it comes from

- **Back Forty v9.1** (`back-forty/` on `back-forty/published`): every module, as the base.
- **City Limits v2** (`city-limits/` on `city-limits/published`): the town's plan (its `clmap.js`, districts, lots and
  buildings, lamps, signals, neon, palms, the park), the salt flats' ramps (`flats.js`), the cluster light grid
  (`render/lights.js`), the facade and salt looks (`render/glsl/world.js`), the full moon (`game/env.js`), and the
  three cars (`hd/34_ev`, `35_wedge`, `36_hyper`, `37_newbuilds`, `45_ev`, `58_clparts` -> `58_ccparts`).

## The world (`src/50_worldgen.js`)

Everything is a function of where you are, made in 128 m chunks round the car by a worker, as in Back Forty.
x runs east, z south; downtown is at the origin.

- **The town**: City Limits' grid of streets every 120 m inside Limits Boulevard (a ring 720 m across with rounded
  corners), its districts (Downtown's towers, Neon Row, the Heights, the Yards, Copper Park), the same size.
  Street classes for the road shader: 6 Highway 40, 7 the boulevard, 8 Central Avenue, 9 the avenues, 10 the
  streets, 11 the intersections (zebras). Sidewalks, curbs, medians, paved lots, buildings with lit windows and
  storefronts (material 60), traffic signals on a 30 s cycle (61), neon words, blade signs and strips, palms.
- **Highway 40**: three lanes each way with a painted median, straight through the middle of town east and west,
  lit a little way out of town, then dark across the country, and it just ends on the salt (barrels and a
  ROAD ENDS sign, at `HWY_X`, about 3.47 km out).
- **The country**: a mile grid of roads round town (lines at -1, 0, +1 miles): Ridge Road north into the hills
  (gravel), Wash Road south (dirt), the others blacktop, gravel or dirt a stretch at a time. Farms, creeks, woods,
  hills to the north, rolling ground, drier toward the salt. Deke's Gas east of town and the Starlite Diner west,
  on the highway. The bog south of town. Marisol's garage downtown, where the game starts.
- **The off-road park's ground**: kept clear and level west of town, north of the highway (`PARK`), for the
  tracks to come.
- **The salt flats**: past about two miles (a rounded square, its edge wandering), flat, hard (the physics'
  `strip` surface) and endless, with City Limits' ramps (kickers, table-tops, mega ramps) in most 360 m cells.

## The night (`src/59_daynight.js`, `src/13_lit.js`)

One night, City Limits': a full moon bright enough to see the country and the salt. The town's ~1,100 lights
(street lamps, the boulevard's twin lamps, neon, shopfronts, the gas station, the diner, the garage) are put into
a grid of 8 m cells once (1.6 km square), each cell listing the lights that reach it, and the lit shader lights each
pixel from its cell's list (City Limits' cluster grid). The headlights and the farms' yard lights nearest the car
are the shader's own eight lamps, as in Back Forty.

## Checks

- `node tools/physcheck.js`: the existing cars' physics, still bit-identical (worst difference 0).
- `python3 tools/drive_check.py hwyE 70`: town to the end of the highway on the salt; no NaNs, no ground steps.
- `python3 tools/boot_check.py`, `tools/shot.py`, the rest of Back Forty's tools still apply.

## Next

- The off-road park (dirt oval, short course, mud track, drag strip) and the super off-road circuit round the city.
- City Limits' career, challenges and jobs, with the Tune sheet as the shopping list in career.
- Robot racers (HD's drivers and Showdown's cross-country drivers).
