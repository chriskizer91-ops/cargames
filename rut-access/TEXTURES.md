# Texture packs for the ground

Rut Access draws its ground from Showdown's procedural materials: noise, no pictures. The owner wants the
ground's detail to come from texture packs made with an image tool instead, with no grass blades, no 3D things
on the ground beyond the rocks and the trees, and the puddles and the mud pits as they are. This is the list of
what to make, how to make it so it tiles and lights properly, and where to put it. Phase 2 reads them.

## What to make, in the order they matter

Each is one square picture that tiles on all four edges. The first six cover almost everything you drive on.

| File name | Surface | What it should look like | Covers (m per tile) |
| --- | --- | --- | --- |
| `dirt_red.jpg` | Open ground, the ranch | Dry red-brown dirt, fine grit and small stones, a few faint cracks | 3 |
| `grass_dry.jpg` | Pasture | Short sun-bleached grass seen straight down, matted, flat (no tall blades, no flowers) | 3 |
| `trail.jpg` | The two-track trail, the lane | Hard-packed tan dirt with embedded gravel and faint tyre tread | 2 |
| `gravel.jpg` | Gravel roads, the pits | Loose grey-brown gravel, pea to walnut size, dusty | 1.5 |
| `asphalt.jpg` | The speedway, the county road, the drag strip | Worn dark asphalt, fine aggregate showing, a few hairline cracks | 2 |
| `rock.jpg` | The rocks, the climb, ledges | Red-grey sandstone or granite face, weathered, lichen flecks | 2 |
| `ruts_dry.jpg` | The lane's dried ruts | Dried mud with hard tyre ruts and cracked crust | 2 |
| `mud_wet.jpg` | The bog, the mud track | Dark wet mud, churned, glossy pockets (the game adds the shine and the puddles) | 2 |
| `playa.jpg` | The dry lake bed | Pale cracked clay, large polygon cracks, bone dry | 3 |
| `clay_red.jpg` | Red Hill | Red clay, smoother than the dirt, scuffed | 3 |
| `concrete.jpg` | Pads, the shop floor, the staging lanes | Weathered grey concrete, light aggregate, oil stains | 2 |
| `wood_planks.jpg` | Bridges, decks | Grey weathered planks, straight along the tile, nail heads | 2 |
| `sheet_metal.jpg` | Barns and sheds | Corrugated galvanised sheet, rust at the ribs, straight along the tile | 1 |
| `hay.jpg` | Hay bales | Baled straw, straight along the tile | 1 |

Optional, for any of them: a second variant (`dirt_red_2.jpg`) to break repetition on the big surfaces, and a
normal map (`dirt_red_n.png`) for the ones with real relief (gravel, rock, ruts, playa, planks, sheet).

## How to make them so they work

- **Square, 1024 × 1024.** JPG at quality 85 or so for the colour pictures (they are embedded in the one game
  file, so size matters: fourteen 1024 JPGs are about 3 MB; PNG would be ten times that). Normal maps as PNG.
- **Seamless.** Tileable on all four edges with no visible join. Most image tools have a "seamless" or
  "tileable" option; use it, and check by tiling the result 2 × 2.
- **Flat light.** Albedo only: the colour of the surface, lit evenly from everywhere, no baked shadows, no
  sun direction, no highlights, no vignette. The renderer lights it. A picture with a baked sun looks wrong
  the moment the car turns.
- **No direction** on the ground surfaces (dirt, grass, gravel, rock, mud, clay, playa, concrete): nothing
  that reads as "up" in the picture, so a tile can be laid any way round. Planks, sheet metal and hay are
  the exception and run straight along the tile.
- **Mid-tone and not too busy.** Big bright or dark spots repeat visibly across a field. Keep the contrast in
  the fine detail and the overall tone even; the game adds the large-scale variation (dust, wear, wheel
  tracks, wet patches) over the top.
- **Colour.** sRGB, as the tool saves it. Red dirt about `#9a5a34` to `#b8713f`, dry grass about `#a8955a`,
  gravel about `#8c8578`, asphalt about `#3a3a3c`. The time of day grades everything afterwards, so aim for
  how it looks at noon.
- **Normal maps**, if made: tangent space, OpenGL convention (green up, +Y is "towards the top of the
  picture"), no baked lighting, 1024 × 1024 PNG. Make them from the colour picture's height, not by hand.

`TEXTURE_PROMPTS.md` has a full prompt for every surface, with the rules to give the tool each time.

## Where to put them, and how they are read

Drop the files in `rut-access/textures/` with the names above, then run `python3 tools/pack_textures.py` and
`./build.sh`. The packer makes each picture tile (its edges are taken from its own middle and faded in over a
band, narrow across planks, ribs and ruts), evens out any baked-in shading (the slow part of the brightness is
divided out, harder on the rock, the ruts, the mud and the sheet metal), resizes to 1024, encodes WebP and
writes `src/49_textures.js`: one layer a surface, with the picture's mean colour in linear light and its scale
in metres a tile. A surface with no picture gets an empty layer and keeps Showdown's procedural material, so a
half-finished set is fine. The game decodes them after boot into one texture array (512 a side on Mobile, drawn
down from the 1024; the full 1024 on the other tiers) and fades them in. In the shader each picture is laid over
the procedural colour as grain, pulled toward its own colour by the Dev look's Photo colour setting, at two
scales blended by a slow noise so no tile repeats visibly. Rock is mapped from three axes by its normal; the
lane's ruts, the strip's rubber, planks, ribs and straw run along their direction.

The set delivered on 30 October 2026 (OpenAI's image tool, 1254 px, no tiling option) is in `textures/`: all
seventeen, none seamless as made, which the packer handles. They are kept as quality-95 JPEG (about 1 MB each;
the PNGs the tool made were 4.4 MB each, 72 MB for the set); the packer reads `.png` or `.jpg`.

The puddles, the pond, the creek and the mud pits stay as they are: the water is drawn by the renderer, and the
mud pit's shine, ruts and clods are the game's own.
