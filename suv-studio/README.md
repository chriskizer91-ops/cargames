# Redline County: SUV Studio

The stock truck from Redline County: Wide Open 2: Road Not Found + Traffic, alone on a plain studio backdrop,
modelled for a close look. One self-contained page: `suv-studio.html` (open it in any browser with WebGL2).
Drag to turn round it, pinch or scroll to come closer; the buttons jump to views, open the hood, switch the
backdrop and repaint it in the game's eight colours.

## How it is made

- **The truck is the game's own.** `src/game/` holds copies of the game's car builders (`14_loft`, `16_engines`,
  `21_suv`, `22_faces`, `23_parts`, `30_wheels`, `31_engine_bay`, `32_builds`, copied from `rlcwo2rnf-traffic/src`
  unchanged) and `00_prelude.js` (the few helpers they need from `10_core`, `13_lit`, `12_gl_mesh` and
  `33_car_mesh`, with the mesh builder handing back its arrays instead of uploading them). The body is built with its
  stations four times closer together than the game's (`?lod=0.25`, the default; `?lod=1` is the game's own).
- **The studio's detail** is in `src/hd/`: `70_geo.js` (revolve, loft, sweep, rounded boxes, extrusions, all into the
  game's mesh builder), then one file per part, put on the truck by `89_hd.js`. Everything comes out in the game's own
  mesh form, so any of it could go back into the game.
- **The renderer** is `src/studio/main.js` with three.js (bundled in by esbuild): each of the game's material ids, and
  the studio's own (`SM` in `70_geo.js`), as a physically based material; a light made of soft boxes for the
  reflections; one key light with a soft shadow on a floor that shows nothing but the shadow.

## Building and checking

- `npm install` once (three, esbuild), then `sh build.sh` writes `suv-studio.html`.
- `node tools/shot.js <out-dir> front34 rear34:dark wheel bay::open ...` takes pictures (views: front34 rear34 side
  front rear top wheel lamp tail low cabin bay; backdrop light or dark; `open` for the hood).

## The parts so far

| Part | What it is |
| --- | --- |
| Wheel (`71_wheel.js`) | 245/65R17 all-season: real tread blocks (four ribs, slanted lateral grooves, a sipe in every block, shoulder blocks down the sidewall), rim protector and sidewall rings; the six-spoke wheel with a machined lip, drafted dished spokes, six lug nuts on a 135 mm circle, a chrome cap and the valve stem; behind it a vented rotor (forty vanes), a floating caliper with its bracket, boots and bleeder, and the dust shield. |
| Face (`72_face.js`) | The Classic face in 3-D: the body cut open exactly along each decal's outline, and in each hole the real thing. Headlamps: a cavity with a chrome reflector and dark walls, two projectors (chrome bezel, reflector bowl, barrel, dark lens), an amber corner behind a chrome divider with its bulb, a clear lens following the body's curve, a black seal, the chrome strip below. Grille: a chrome surround and two thick chrome bars over a honeycomb set back in the opening. Fog lamps in round black pods (bezel, reflector, bulb, lens). The lower grille: a honeycomb in a black frame. |
| Tail (`72_face.js`) | Two lamps a side: red lenses with a clear reverse window behind a black divider, chrome reflector ribs and bulbs inside; the bumper reflectors; the plate in a painted recess with a plain blank plate, its lamps and the chrome strip above. |
| Wheel houses (`73_arch.js`) | The game's sixteen flat panels a wheel taken out; a moulded liner 72 steps round in black grained plastic, closed by an inner wall. The arch flares turned in 96 steps instead of 28. |
