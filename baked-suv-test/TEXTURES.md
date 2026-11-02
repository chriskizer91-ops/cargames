# The ground photographs

Wide Open drew all of its ground from procedural materials: noise, no pictures. Rut Access laid the owner's
seventeen ground photographs over the same kind of materials (its `TEXTURES.md` says how they were made), and they
belong on this county too. This is how they get into this game.

## Where the pictures are

- **The seventeen** (dirt ×2, dry grass ×2, the trail, gravel, asphalt, the strip's rubber, rock, dried ruts, wet
  mud, playa, red clay, concrete, planks, sheet metal, hay) stay in `../rut-access/textures/`. They are about 20 MB
  of quality-95 JPEG; they are **not copied into this folder**. The packer reads them from there.
- **This county's own** go in `wide-open-2/textures/` (the folder doesn't exist until the first one arrives; this
  version's packer reads it too, after its own `textures/`): the
  salt crust, brick, stucco, the forecourts, the road paint and the speedway's clay. `TEXTURE_PROMPTS.md` has a
  prompt for each in the same style as Rut Access's. A picture in this folder is used before one of the same name
  in Rut Access's.

## Packing them

`python3 tools/pack_textures.py` (then `sh build.sh`) makes each picture tile (its edges taken from its own middle
and faded in), evens out any baked-in shading, resizes it, encodes it as WebP and writes `src/49_textures.js`:
`TEXPACK={size,layers:[{id,t,m,scale,has,src}]}`, one layer per surface (`id` the file name, `t` the shader's
name for it, `m` the picture's mean colour in linear light, `scale` metres a tile, `has` whether there is a
picture). The page carries it; nothing is fetched.

**The size**: 1024 a side at WebP quality 74, which is what the seventeen take today (4.9 MB of WebP, 6.5 MB in the
page, **8.3 MB for the whole page**). The packer keeps the page under 9 MB by itself: if the pictures would take
more than 7.3 MB of the page (all six of this county's arriving would do it), it packs at 768 instead, and says
so. `--size 1024` or `--size 768` forces one.

## How the game reads them

- **The loader** (`src/52_world_gl.js`, `texLoad`): after the boot, while the opening screen is up, each picture is
  decoded into one `srgb8` texture array with mipmaps and anisotropic filtering, a layer for each picture there
  is. The tier sets the size on the GPU (`src/55_gfx.js`: Mobile 512, the others 1024; anisotropy 2 on Mobile, 4
  on Low and Medium, 8 above) and the pictures fade in over a second once they are ready.
- **The shader** (`src/13_lit.js`): each surface is `T_<name>`, its layer in the array, the layer it falls back on
  (`TEX_FALLBACK`: the second dirt and grass on the first, the speedway's clay on the red clay, the forecourts on
  the concrete), or -1 where there is no picture at all, in which case the surface is drawn exactly as Wide Open
  drew it (decided when the shader is made: a missing picture costs nothing). **A picture delivered later drops
  in by its file name: no code changes.**
- **How a picture is laid**: over the procedural colour as grain, pulled toward its own colour by the Dev look's
  **Photo colour** (default 50%), at two scales blended by a slow noise so no tile repeats visibly; **Ground
  photos** (default 100%) fades the lot. Rock is mapped from three axes by its normal; the strip's rubber, the
  lane's ruts, planks, ribs and straw run along their direction.

## Which surface reads which

| Surface | Picture |
| --- | --- |
| The open country, the verges, the park's infields | dirt ×2, grass ×2, rock, mud (by its weights) |
| Boulders and slabs | rock (three axes) |
| Highway 40, the town's streets and the blacktop county roads (road classes 3, 6–11) | asphalt; Wide Open's lines, zebras, hatched medians, the tyres' darker tracks and the gutters drawn over it; the paint takes the asphalt's grain (or `road_paint` when it comes) |
| The gravel county roads, yards and traps | gravel; the verges dirt and grass |
| The two-tracks and the dirt lanes | trail, grass on the crown; the lane's ruts from `ruts_dry` |
| Sidewalks, curbs, medians, the town's paved lots | concrete (a curb's sides from three axes) |
| The gas station, the diner, the paddock, Marisol's pad | `forecourt`, until then concrete |
| Speedway 25 | `clay_track`, until then red clay |
| The short course and the Outer Loop | dirt, the trail's packed surface down the groove; the Loop's stretch by the bog and the fords' banks mud |
| The mud track | wet mud |
| The drag strip | the trail and the strip's rubber in the grooves |
| The dry lake | playa |
| The salt flats and the salt course | `salt_crust`, until then Wide Open's own crust (the black line and the mile bars are drawn over either) |
| The town's walls | brick (`brick`), stucco (`stucco`): as grain in each building's own tint, until then Wide Open's bricks and render; concrete panels take the concrete's grain at half strength; glass, metal and the storefronts as they were |
| Barns and sheds, bridges and decks, bales | sheet metal, planks, hay |
| The showroom's floors | the concrete's grain under the dark bay's gloss and the light cyc's satin |

The water (creeks, ponds, fords), the puddles and the mud's shine stay as they are: the water is drawn by the
renderer, the mud's shine and ruts are the game's own.
