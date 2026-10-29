# Dirt Sleeper Sim

Dirt Sleeper Mini's game (seven cars, sixteen builds, the ranch and the mile of country round it) with
a fourth driving level, **Sim**, and graphics a step up. Dirt Sleeper Mini is left as it was; this is a
separate game with its own saves (`dssim-*`).

Open `game.html` in a browser with WebGL2. `game.artifact.html` is the same page without the document
skeleton, for publishing.

## The Sim level

Realistic is the car as it is. Sim is the car as it is and the world as it is. On the other three
levels the physics is exactly as before (`tools/physcheck.js` still finds no difference).

| Piece | What it does |
| --- | --- |
| True load transfer | The tyres' side forces reach the body through the suspension links. Realistic puts the side force at the roll centre (20 cm up), which rolls the body right but leaves out the links' share of the weight transfer. Sim puts it back, so the outside tyres carry the full m·a·h/track. Drive and brake forces act at the ground. |
| Soil trip | A tyre sliding sideways over dirt, gravel, grass or mud ploughs a berm that pushes back at ground level. It builds over about half a metre of sideways travel, only once the tyre is truly sideways (past about 30° and 2.5 m/s). This trips the car over. |
| Edge catch | A sliding tyre feels the ground at its leading shoulder. Lips under 9 cm it rides up. Kerbs, ledges and rut walls are faces: rock, concrete and tarmac don't give, while dirt walls crumble once the soil can't bear more, so a tyre climbs out of a rut. |
| Real shocks | Firmer below 0.25 m/s shaft speed, softer above it. They heat with the work they do and fade past about 110 °C. Bypass and rally shocks hold out longest. |
| Roof load | The expedition rack, the exo-cage, the bed cage with its spares and any roof cargo raise the centre of gravity and add roll inertia. |
| Tyre pressure | Air down to about 15 psi for mud, grass, sand and rock: more grip and less bog drag. On tarmac it gives vague steering, more rolling drag and sidewalls that roll under, and a hard turn can roll a tyre off its rim. Air up for less drag and sharper steering. |
| Weather | Damp, rain and a downpour. Wet tarmac keeps about 64% of its grip, grass 45% and clay about half. In a downpour the tyres aquaplane at NASA's 10.35·√psi mph, and sooner on slicks. |
| Brake fade | Each rotor heats with the power its brake takes in and cools with airflow. A 70-0 stop warms the SUV's fronts by about 70 °C. Stock pads fade from about 330 °C. |
| Body grip | A roof skids on tarmac and digs into dirt and mud. |
| ABS by era | The 1970 muscle car, its drag build and the 1980s hatches have no ABS. A proportioning valve still keeps their rears from locking first, so the fronts lock instead. Cars with ABS also get brake-force distribution. |

The Sim card in the menu sets tyre pressure, weather and roof cargo. The HUD shows SIM with any
non-road pressure, the weather and the cargo, and lights FADE, SHOCK and FLAT when they happen.

The developer panel (`DEV` in `src/54_dev.js`) has a **Sim physics** section on the Sim level. It has a
switch for each piece and sliders for tyre load sensitivity, soil trip strength, sway bars and shocks.

### What it does (`tools/simcheck.js`)

- Static stability (track / 2h): SUV 1.08, Rock & Mud 0.85, 4x4 1.00, pickup 1.13, coupe 1.78, wagon 1.40.
  With 120 kg on the roof the SUV drops to 0.99.
- Sliding sideways (beam-on): on tarmac nothing trips. On dirt and gravel, Sim rolls the SUV, the 4x4,
  the pickup and Rock & Mud at 25 mph, and Rock & Mud lifts its wheels at 15. Grass trips the lifted
  trucks. The coupe, wagon and muscle car slide, and the Group B hatch rolls at 35 on gravel. Realistic
  never rolls any of them.
- Sliding sideways into a 15 cm kerb: Rock & Mud rolls from 12 mph, the SUV, the 4x4 and the wagon from
  16, and the pickup and the hatch at 20. The coupe and the muscle car lift but stay up.
- Lane changes and braking into turns on tarmac, dirt and gravel are as stable as Realistic, or steadier.
  The exception is the cars without ABS: brake hard into a turn and their fronts lock.
- The SUV stops 60-0 in 158 ft dry, 172 ft in rain and 198 ft in a downpour. Over ten back-to-back 70-0
  stops its fronts reach about 450 °C.

## Graphics

**Detail**: Mini is Dirt Sleeper Mini's look. Plus (the default) adds a sun shadow map round the car: the
car on itself and the ground, plus the trees, sheds, fences, rocks and stands within about 30 m, at 1024².
It also adds clouds, haze lit toward the sun, and rain with wet ground. High uses a 2048² map reaching about
55 m and draws the land further out. **Dots** go up to 1280×720 and are in the menu, so phones can pick them too.
The scene never draws at much more than the screen's own pixels. If the frame rate drops below about 34 fps for a
few seconds on Plus or High, the game suggests a lighter level.

## Fixes

- A car with the race-game gearbox that came to rest in a high gear (the muscle car) now drops into
  first, instead of pulling away in third.

## Files

| Path | What's in it |
| --- | --- |
| `build.sh` | Builds `game.html` and `game.artifact.html` |
| `src/40_physics.js` | The vehicle, with the Sim hooks (all behind `Vehicle.sim`) |
| `src/41_ground.js` | Ground contact, with the edge catch (`_lip`) |
| `src/42_chassis.js` | Each build's chassis, with its Sim numbers and roof load |
| `src/43_sim.js` | The Sim level's tables, settings and switches |
| `src/55_gfx.js` | Graphics levels, the shadow map, the weather on screen |
| `tools/physcheck.js` | The first three levels against Mini 4's physics (must be 0) |
| `tools/simcheck.js` | The Sim proving ground: `node tools/simcheck.js [ssf fishhook trip curb lane fade air wet shocks cargo jump]` |
| `tools/game_shot.js` | Headless screenshots: `node tools/game_shot.js <dir> name:build:place:gfx[:level:weather:dots:cam]` |
