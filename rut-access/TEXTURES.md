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

A prompt that has worked for this kind of thing, for the first one: *"seamless tileable texture, top-down
photo of dry red-brown dirt with fine grit and small stones, flat even lighting, no shadows, no highlights,
photorealistic, 1024x1024"*. Swap the subject for each row.

## Where to put them

Drop the files in `rut-access/textures/` with the names above. The build will pack whatever is there into
`src/49_textures.js` (base64) and the land shader will read each surface's picture where it has one and keep
Showdown's procedural material where it hasn't, so a half-finished set is fine. Mobile reads them at
512 × 512 (the pack makes that copy); higher tiers read the full 1024.

The puddles, the pond, the creek and the mud pits stay as they are: the water is drawn by the renderer, and the
mud pit's shine, ruts and clods are the game's own.
