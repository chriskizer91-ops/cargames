# Traffic and police car models: what the game needs

A spec for the light traffic and police cars (under 5,000 triangles), so they drop into Redline County: Road Not
Found + Traffic without rework. A converter in this repo (`tools/pack_cars.py`, written when the first model
arrives) turns them into the game's own mesh format inside the page, the way `tools/pack_textures.py` does the
ground photographs.

## Why

Today each traffic car is a trimmed copy of one of the game's own player cars, built on the device: 9 to 12
thousand triangles close up (plus four wheels), 5 to 7 thousand far off, and tens of milliseconds to make each
kind the first time traffic starts. Purpose-made models under 5,000 triangles draw cheaper, load instantly (nothing
to build) and use less GPU memory, which leaves room for more cars on the road.

## The file

- **glTF 2.0 binary (`.glb`)**, one file a car. Blender's glTF exporter with its defaults is fine.
- **Metres**, real size.
- **Origin** on the ground, at the middle of the car's footprint (half way along, half way across).
- **Facing**: say which way the front points (the converter turns it to the game's +X forward, +Y up, +Z right).
  The same way for every model.
- **No textures, no UVs.** The colour comes from each material's base colour (or vertex colours). The game's lighting
  and reflections do the rest; textures would cost memory on the phone for little.
- **Normals** as you want them shaded (smooth where it's round, split where it's a crease).

## Levels of detail

| Level | Triangles | Used |
|---|---|---|
| `LOD0` | under 5,000 (body; wheels separate, below) | close up, out to about 30 m |
| `LOD1` | about 1,500 (wheels merged in) | middle distance |
| `LOD2` | about 400 to 600 (wheels merged in) | far off, and in the sun's shadow maps |

As objects in the one file, named `LOD0`, `LOD1`, `LOD2` (or with those as suffixes). If only `LOD0` exists, the
converter can merge its wheels in for the far levels, at the full count.

## Wheels (on `LOD0`)

Four separate objects, `wheel_FL`, `wheel_FR`, `wheel_RL`, `wheel_RR`, each with its origin at the wheel's centre, so
they turn as the car rolls and the front ones steer. Or one `wheel` object at the front left, which the converter
copies to the other three corners. Tyre and rim as their own materials (below).

## Materials (by name)

The game's shader picks how each surface looks by its material: these names map to it. Anything else draws as plain
colour.

| Material name | What it does in the game |
|---|---|
| `paint` | the body colour: replaced per car by a colour from the traffic's palette |
| `paint2` | a second colour (two-tone; on the police car, the white doors and roof) |
| `glass` | windows: dark, with the world reflected in them |
| `glass_light` | lighter glass (lamp covers) |
| `chrome` | bright metal |
| `rim` | the wheels' rims |
| `tyre` | rubber with a tread band |
| `trim` | black plastic: bumpers, mirrors, grille surrounds |
| `headlight` | lit at night |
| `taillight` | lit at night, brighter when braking |
| `indicator` | amber |
| `plate` | number plates |
| `grille` | a mesh grille |
| `interior` | seats and dash (dark fabric) |
| `metal` | plain metal: exhaust tips, underbody bits |
| `lightbar_red`, `lightbar_blue` | the police light bar: flashing at night and in a chase |

## Sizes

For each model: its length, width, height, wheelbase, track and tyre radius (or the converter measures them). When a
traffic car crashes it goes onto the physics as the nearest of the game's builds of that size, so its handling needs
nothing new.

## Which cars

Today's traffic mix is eight kinds: a stock sedan, a wagon, a pickup, a hatchback, an electric car, an off-road
trail truck, a coupe and a muscle car, plus the police car. Any number from about three up works; each kind costs a
little memory and nothing per frame.

## How heavy, on the phone

At these budgets a car close up is about a third of today's triangles, a far one about a tenth. The far level is
the one that counts most: it is also drawn into the shadow maps, and most of the traffic in view is far.
