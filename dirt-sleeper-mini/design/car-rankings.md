# Car rankings: circuit, street and off-road

Every car and build ranked for the three kinds of race the demo will have, before the tracks are
built, so each track can be made to suit the cars that should win on it.

These are measurements, not opinions. `tools/rank.js` takes every build's own Digital Engine (the
same sim the model bay runs) and drives it flat out from a standstill, with launch control where the
build has it and no nitrous. It reads each build's chassis from its model: tyre type and width,
track, roof height (for the centre of gravity), sill height and ride height (for ground clearance),
suspension, brakes and wing. Then a lap simulator drives three reference courses. It takes each
corner as fast as that tyre allows on that surface, brakes as late as the brakes allow, and
accelerates out as hard as the engine, gearbox and tyres allow, sharing grip between turning and
accelerating. Bumps, rocks and jumps cap the speed by wheel travel, damping and ground clearance.

**Rating** is 100 for the fastest lap of a course by any build; each 1% slower is about 1 point
less. **Class**: S 95+, A 88+, B 80+, C 72+, D below that. The same rating will become each car's
class in the career, so parts move a car up the classes as it's built from stock to fully modified.

## The three reference courses

| Kind | Course | Length | What it asks for |
| --- | --- | --- | --- |
| Circuit | Ridgeline Raceway | 3.2 km | A 900 m straight, a hairpin, esses, a fast sweeper, a chicane. Grip, brakes and power. |
| Street | Harbor District | 4.0 km | Square downtown corners with dips that ground low cars, then a harbour expressway with traffic and expansion joints, a cloverleaf, and back through the warehouses. Launches, mid-range pull and a car that can take a bump. |
| Off-road | Red Rock Rally-Raid | 3.9 km | Fast gravel corners, two sets of whoops, a hill climb, a rocky ledge, three jumps and a water splash. Loose-surface grip, wheel travel and clearance. |

## Stock cars

| | Circuit | Street | Off-road |
| --- | --- | --- | --- |
| 1 | Coupe (B 83.4) | Hatch (A 93.3) | 4x4 (C 76.4) |
| 2 | Hatch (C 76.8) | Coupe (A 92.2) | Pickup (C 74.8) |
| 3 | Muscle (C 76.4) | Muscle (A 91.9) | SUV (D 68.8) |
| 4 | Wagon (C 73.6) | Wagon (A 89.6) | Wagon (D 66.5) |
| 5 | Pickup (D 68.8) | Pickup (B 82.7) | Hatch (D 66.3) |
| 6 | SUV (D 67.9) | SUV (B 81.6) | Muscle (D 63.3) |
| 7 | 4x4 (D 64.4) | 4x4 (C 77.5) | Coupe (D 58.0) |

The cars that were meant to be good at something from the factory are:
- **The coupe** is the best stock car on a circuit by 6.6 points. On the street, only the hatch's quick-steering lightness beats it.
- **The 4x4** is the best stock car off-road. The pickup is close behind on its all-terrains and 2-inch lift.
- **The wagon** is the sleeper. Its 0-60 of 5.0 s beats the stock coupe (5.4 s) and muscle car (5.7 s), and only the hatch (4.8 s) is quicker. On its narrow touring tyres it's mid-pack in corners, so its stock rankings are 4th on both circuit and street. Its built version is the fastest car on the street. If the stock wagon should rank higher on the street, it needs shorter gears or wider tyres, not more power.

## Every build, by car

| Build | Circuit | Street | Off-road | Built for |
| --- | --- | --- | --- | --- |
| SUV Stock | D 67.9 | B 81.6 | D 68.8 | |
| SUV Sleeper | B 80.9 | **S 98.0** | D 61.2 | Street |
| SUV Rock & Mud | C 73.6 | A 90.8 | **A 88.6** | Off-road |
| SUV Race | **S 97.1** | S 97.9 | D 49.0 | Circuit |
| 4x4 Stock | D 64.4 | C 77.5 | C 76.4 | |
| 4x4 Crawler | D 71.0 | B 87.9 | **A 89.2** | Off-road |
| Coupe Stock | B 83.4 | A 92.2 | D 58.0 | |
| Coupe GT | **S 100.0** | S 96.6 | D 50.5 | Circuit |
| Wagon Stock | C 73.6 | A 89.6 | D 66.5 | |
| Wagon Sleeper | B 82.3 | **S 100.0** | D 59.7 | Street |
| Pickup Stock | D 68.8 | B 82.7 | C 74.8 | |
| Pickup Prerunner | C 73.0 | A 89.4 | **S 100.0** | Off-road |
| Muscle Stock | C 76.4 | A 91.9 | D 63.3 | |
| Muscle Drag | B 80.1 | **S 96.0** | D 52.8 | Drag strip, street |
| Hatch Stock | C 76.8 | A 93.3 | D 66.3 | |
| Hatch Group B | C 79.5 | S 97.6 | **S 99.8** | Off-road (rally) |

Every upgraded build wins or nearly wins the kind of race it was built for, and pays for it
somewhere else.
- **Race cars on rough ground:** the race SUV and the Coupe GT are the two slowest builds off-road. They have 9 cm and 6 cm of clearance and drag their bellies over the rocks.
- **Street rankings bunch up** (77 to 100, the narrowest spread of the three), because traffic and bumps take away a race car's top-speed advantage. Street races will be close.
- **Off-road rankings spread out the most** (49 to 100). The wrong car can't keep up at all.

## The figures behind them

Flat out on tarmac from a standstill, no nitrous. Grip is lateral grip on dry tarmac; dirt grip is
on loose gravel. Clearance is to the lowest frame or diff; travel is usable wheel travel.

| Build | hp | kg | Drive | 0-60 | 1/4 mile | Top mph | Grip (g) | Dirt grip | Brakes (g) | Clearance | Travel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SUV Stock | 287 | 2180 | AWD | 7.7 s | 15.9 s @ 89 | 133 | 0.74 | 0.52 | 0.90 | 22 cm | 20 cm |
| SUV Sleeper | 638 | 2090 | AWD | 4.5 s | 12.5 s @ 122 | 184 | 0.90 | 0.48 | 1.05 | 17 cm | 15 cm |
| SUV Rock & Mud | 1027 | 2480 | AWD | 4.1 s | 11.7 s @ 134 | 194 | 0.63 | 0.71 | 0.90 | 34 cm | 30 cm |
| SUV Race | 1216 | 1960 | AWD | 2.4 s | 9.6 s @ 153 | 154 | 1.19 | 0.37 | 1.30 | 9 cm | 9 cm |
| 4x4 Stock | 195 | 1620 | AWD | 8.8 s | 16.8 s @ 84 | 120 | 0.66 | 0.64 | 0.90 | 28 cm | 24 cm |
| 4x4 Crawler | 600 | 1880 | AWD | 4.5 s | 12.6 s @ 117 | 165 | 0.62 | 0.71 | 0.90 | 34 cm | 34 cm |
| Coupe Stock | 546 | 1560 | RWD | 5.4 s | 13.2 s @ 125 | 206 | 1.00 | 0.51 | 1.05 | 12 cm | 14 cm |
| Coupe GT | 908 | 1340 | RWD | 3.4 s | 10.4 s @ 157 | 185 | 1.31 | 0.39 | 1.30 | 6 cm | 10 cm |
| Wagon Stock | 359 | 1640 | AWD | 5.0 s | 13.6 s @ 108 | 172 | 0.76 | 0.54 | 0.90 | 17 cm | 17 cm |
| Wagon Sleeper | 638 | 1580 | AWD | 3.6 s | 11.3 s @ 134 | 194 | 0.86 | 0.45 | 1.05 | 15 cm | 14 cm |
| Pickup Stock | 348 | 2500 | AWD | 6.7 s | 15.5 s @ 92 | 132 | 0.75 | 0.64 | 0.90 | 29 cm | 22 cm |
| Pickup Prerunner | 642 | 2350 | AWD | 5.1 s | 13.5 s @ 112 | 161 | 0.70 | 0.72 | 0.90 | 34 cm | 46 cm |
| Muscle Stock | 494 | 1650 | RWD | 5.7 s | 13.5 s @ 118 | 124 | 0.82 | 0.55 | 0.90 | 18 cm | 16 cm |
| Muscle Drag | 1081 | 1450 | RWD | 3.4 s | 10.2 s @ 158 | 223 | 0.71 | 0.32 | 0.85 | 17 cm | 14 cm |
| Hatch Stock | 277 | 1180 | AWD | 4.8 s | 13.2 s @ 110 | 154 | 0.85 | 0.49 | 0.90 | 16 cm | 17 cm |
| Hatch Group B | 500 | 1050 | AWD | 3.2 s | 11.1 s @ 120 | 120 | 0.76 | 0.79 | 1.30 | 22 cm | 26 cm |

Some top speeds are set by gearing, not power. The race SUV (154 mph) and the Group B hatch
(120 mph) run out of revs in top gear. That is right for a circuit car and a rally car, and a
taller final drive will be a part in the career.

## What the model needs that the cars' data doesn't carry yet

These numbers are set in `CHASSIS` at the top of `tools/rank.js`, and they will move into the
game's car data:
- **Wheel travel**, from 9 cm (race SUV) to 46 cm (prerunner).
- **How well the dampers take bumps at speed:** rally dampers and bypass shocks above 1, a crawler's soft articulation below it.
- **Downforce**, from the wings and splitters.
- **The drag car's skinny front runners and light drag brakes.**

The full ranked tables are in `rank-tables.md`. The data the game will read is in `ratings.json`.

## A fix this turned up

The drag car's engine was geared to its skinny front runners instead of its 33-inch rear slicks.
That held it to 154 mph and made its revs climb too fast in the model bay's Drive mode. The sim
now uses the driven wheels' radius, and the drag car runs 10.2 s at 158 mph with a 223 mph top
speed.
