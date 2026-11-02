# SUV: Super Unlimited Venture

A test, its own thing: nothing here touches the game. The stock truck from Redline County: Wide Open 2: Road Not
Found + Traffic, on the game's own physics, on a patch of ground in the owner's pictures, drawn three ways, with
what each costs on screen. One self-contained page: `suv-venture.html`.

## The three trucks

| Truck | What it is | Triangles |
| --- | --- | --- |
| **Game** | The truck exactly as Road Not Found builds it (the game's builders at the game's resolution). | about 51 600 |
| **Studio** | The SUV Studio's truck: the body four times finer, the face, tail, wheels, cabin and trim modelled. | about 484 000 |
| **Baked** | The game's truck again, wearing the Studio truck's detail as pictures (below). | about 51 500 |

The point of the test: whether the baked truck looks closer to the Studio truck than to the Game truck while costing
what the Game truck costs. The readout (top left) says the frame rate, the frame's time, the GPU's own time where
the browser will tell it (desktop Chrome and Edge do; most phones don't), the triangles drawn and the draw calls,
and which graphics chip it is. **Benchmark** drives each truck round the same circle for six seconds and puts the
numbers side by side. **×10** parks nine more of whichever truck is showing: what it would cost if every car in the
game were drawn that way. A screen shows at most its refresh rate (60, or 120 on some phones and laptops), so on a
fast machine all three can read 60 FPS; then the GPU column, or ×10, is what tells them apart.

## Driving

Keyboard: W / up arrow gas, S / down arrow brake (hold it stopped to reverse), A D / left right steer, Space the
e-brake, R back to the start, C the camera (Chase behind, or Look: drag round it), 1 2 3 the trucks. On a phone:
the pedals and steering on screen. The driving-level button cycles Middle (the game's steering helper, stability
and traction control), Realistic and Kids.

The ground: an asphalt pad and a road through it, concrete, gravel, red dirt with a few mounds, mud, ruts and a trail,
on dry grass; the physics knows each one (grip, rolling drag, the mud's drag) exactly as the game does.

## How the baked truck is made

1. `node tools/export_bake.js bake/in`: the Game truck (split into its skin, its glass and its underside) and the
   Studio truck (without its clear glass and lenses, which the bake looks through, and without the cabin, which the
   game's solid glass would hide), as flat triangle lists.
2. `python3 tools/bake.py bake/in bake/out 2048 1024 32`: Blender's Python module (`pip install bpy`, no window)
   welds the Game truck's skin, turns every triangle to face the way its normals do, unwraps it flat onto a square
   picture, and for every pixel sends a ray into the Studio truck and writes what it finds: the surface's colour,
   which way it faces (in the truck's own axes), how much open sky a spot sees within 8 cm (the darkening in
   recesses and where surfaces meet), roughness, metal, and where the clear coat goes (the paint, and the lamps'
   insides, standing in for the lens the Game truck doesn't have). The same for the wheel at 1024 px. About 80
   seconds on two processor cores.
3. `python3 tools/pack_baked.py bake/out 2048 85`: the meshes welded, indexed and packed small, the pictures as
   WebP (colour, normals, and occlusion + roughness + metal in one picture's three channels), into
   `src/venture/48_baked.js` (about 2.6 MB).

## The rest

- `src/game/` and `src/hd/`: the same car builders and Studio detail as `suv-studio/` (copied). `src/drive/`: the
  physics and every build's chassis, copied unchanged from `rlcwo2rnf-traffic/src` (40_physics, 41_ground,
  42_chassis, 43_sim, the engine and powertrain in 15_digital_engine, the other bodies and builds they read).
- `src/venture/49_ground.js`: the owner's ground pictures from `rut-access/textures`, 768 px WebP
  (`python3 tools/pack_ground.py 768 72`).
- `src/venture/main.js` (three.js, bundled by esbuild) and `src/venture/mats.js` (the Studio's materials).
- `sh build.sh` builds the page; `node tools/shot.js <dir> game baked studio:3:.4` takes pictures.
- `PROMPTS.md`: picture prompts for the next switch (grass and weed cutouts, rocks) and how rocks get to be 3-D.

The engine sound is not in this test yet.
