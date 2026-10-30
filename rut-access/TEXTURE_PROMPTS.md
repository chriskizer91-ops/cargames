# Texture prompts for Rut Access

One picture per surface, generated with an image tool, dropped into `rut-access/textures/` under the file name
given. `TEXTURES.md` says how the game reads them. This is the list of prompts.

## Rules for every picture

**What to ask the tool for, every time**

- **Square, 1024 × 1024 pixels at the least; 2048 × 2048 if the tool offers it.** I downsize; I can't upsize.
- **PNG**, full quality, sRGB colour. I make the small JPG copies for the game myself, so don't let the tool
  compress. If PNG isn't offered, the highest-quality JPG it has.
- **Straight down.** A top-down photograph of the ground, the surface filling the whole frame edge to edge. No
  horizon, no sky, no perspective, nothing standing on the surface, no hands, feet, tools or scale objects.
- **Flat light.** Lit evenly from everywhere, like under a white overcast sky: no shadows, no highlights, no
  sun direction, no wet reflections, no vignette (dark corners), no blur, everything in focus. The game lights
  the surface itself; a baked-in sun looks wrong the moment the car turns.
- **Seamless.** Tileable on all four edges so copies laid side by side show no join. Use the tool's tiling
  option (Midjourney: add `--tile`; Stable Diffusion, ComfyUI, Automatic1111: "tiling" or "seamless"; Leonardo:
  "Tiling"). If your tool has no such option, make the pictures anyway and tell me: I can make them tile.
- **Photoreal.** A photograph of real ground, not a painting, render or cartoon. Keep one look across the set
  so they sit together on the same ranch.
- **Even tone.** Natural mid-tones, the detail in the small stuff. One bright or dark patch repeats visibly
  across a field, so nothing large and odd anywhere in the frame.
- **Nothing else.** No text, no watermark, no logo, no frame or border.

**Negative prompt**, where the tool takes one, for every picture:
`shadows, highlights, sunlight, sun, horizon, sky, perspective, depth of field, blur, vignette, dark corners, text,
watermark, logo, border, frame, people, hands, feet, objects, grass blades, flowers, puddles, reflections, 3D render,
cartoon, painting, illustration, tilted, angled view`

**Scale.** Each prompt says how wide a piece of ground the picture shows (about 1 to 3 m). That sets how big the
grit, stones and cracks come out; put the measure in the prompt as written.

## The pictures

The first six cover almost everything you drive on; make them first.

**1. `dirt_red.png`: open ground, most of the ranch.** The frame shows about 2 m across.

> Seamless tileable texture, straight-down photograph of dry red-brown dirt ground in the American Southwest,
> the frame showing about 2 metres of ground across, fine grit and coarse sand with scattered small stones the
> size of peas and grapes, a few faint hairline cracks, slightly dusty, natural mid-tone terracotta to rust brown,
> evenly lit under an overcast sky with no shadows and no highlights, perfectly flat ground, photorealistic,
> sharp detail, square.

**2. `dirt_red_2.png`: a second red dirt, to break the repeat on the big open ground.** About 2 m across.

> Seamless tileable texture, straight-down photograph of dry red-brown dirt ground, the frame showing about 2
> metres across, fine grit and sand with fewer stones than usual, a light scattering of dry twigs, dead leaves
> and bits of straw, faint dusty footprints of small animals, natural mid-tone terracotta to rust brown, evenly
> lit under an overcast sky with no shadows and no highlights, flat, photorealistic, sharp detail, square.

**3. `grass_dry.png`: pasture and verges.** About 2 m across. Flat matted grass, not blades.

> Seamless tileable texture, straight-down photograph of dry short grass pasture in late summer, the frame
> showing about 2 metres across, sun-bleached straw-yellow and khaki with a little faded green, grass matted and
> trodden flat, small patches of bare tan dirt showing through, no tall grass blades, no flowers, no weeds
> standing up, evenly lit under an overcast sky with no shadows, flat, photorealistic, sharp detail, square.

**4. `grass_dry_2.png`: the pasture's second tile.** About 2 m across.

> Seamless tileable texture, straight-down photograph of dry pasture ground, the frame showing about 2 metres
> across, thin patchy sun-bleached grass over sandy tan dirt, roughly half grass and half bare dirt in
> irregular patches, a few dry stalks lying flat, straw-yellow, khaki and tan, evenly lit under an overcast sky
> with no shadows, flat, photorealistic, sharp detail, square.

**5. `trail.png`: the two-track trail and the dirt lanes.** About 2 m across. No ruts in this one.

> Seamless tileable texture, straight-down photograph of a hard-packed dirt road surface, the frame showing
> about 2 metres across, compacted tan and light brown earth with small gravel embedded flush in it, faint
> shallow tyre tread impressions, dusty, a few slightly darker damp-coloured patches, no ruts, no standing
> water, evenly lit under an overcast sky with no shadows and no highlights, flat, photorealistic, sharp
> detail, square.

**6. `gravel.png`: gravel roads, the pits, the yards.** About 1.5 m across.

> Seamless tileable texture, straight-down photograph of a loose gravel road surface, the frame showing about
> 1.5 metres across, crushed angular stones from pea size to walnut size, a mix of grey, tan, rust and
> off-white stones with fine dust between them, dense and even with no bare patches, evenly lit under an
> overcast sky with no shadows and no highlights, flat, photorealistic, sharp detail, square.

**7. `asphalt.png`: the speedway, the county road, the strip's run-out.** About 2 m across. No lines.

> Seamless tileable texture, straight-down photograph of a worn dark grey asphalt road surface, the frame
> showing about 2 metres across, fine stone aggregate showing through the faded bitumen, slightly weathered,
> a few hairline cracks, no lane markings, no paint, no tyre marks, evenly lit under an overcast sky with no
> shadows and no highlights, flat, photorealistic, sharp detail, square.

**8. `strip_rubber.png`: the drag strip's launch pad, rubbered in.** About 2 m across.

> Seamless tileable texture, straight-down photograph of a drag strip launch pad, the frame showing about 2
> metres across, dark grey asphalt almost completely covered in layered black tyre rubber, dense streaks of
> laid rubber running straight up and down the picture, matte, no paint lines, no shine, evenly lit under an
> overcast sky with no shadows and no highlights, flat, photorealistic, sharp detail, square.

**9. `rock.png`: the rocks, ledges and the climb.** About 1.5 m across. This one wraps over 3D rock, so it
needs no direction.

> Seamless tileable texture, straight-down photograph of a weathered rock surface, the frame showing about
> 1.5 metres across, red-grey sandstone with some grey granite, rough and pitted, fine layering and small
> fractures, small flecks of pale green and orange lichen, a little sand in the hollows, no direction to the
> pattern, evenly lit under an overcast sky with no shadows and no highlights, flat, photorealistic, sharp
> detail, square.

**10. `ruts_dry.png`: the lane's dried ruts.** About 2 m across. The ruts must run straight up and down
the picture, continuing through the top and bottom edges.

> Seamless tileable texture, straight-down photograph of a dried mud track, the frame showing about 2 metres
> across, two parallel hardened tyre ruts running perfectly straight from the top edge to the bottom edge with
> a raised centre strip between them, the mud dried into a cracked crust with tyre tread pressed into the
> rut floors, grey-brown and tan, bone dry, no water, evenly lit under an overcast sky with no shadows and no
> highlights, photorealistic, sharp detail, square.

**11. `mud_wet.png`: the bog and the mud track.** About 2 m across. Matte: the game adds the shine and the
puddles, so the picture must have none.

> Seamless tileable texture, straight-down photograph of dark churned mud, the frame showing about 2 metres
> across, soft wet-looking earth pushed into lumps and ridges by tyres, dark brown to near black with lighter
> brown where it has dried a little, matte surface with no reflections and no standing water, no puddles, no
> grass, evenly lit under an overcast sky with no shadows and no highlights, photorealistic, sharp detail,
> square.

**12. `playa.png`: the dry lake bed.** About 3 m across.

> Seamless tileable texture, straight-down photograph of a dry lake bed, the frame showing about 3 metres
> across, pale grey-beige silt dried into large flat polygon plates 10 to 20 centimetres across separated by
> dark narrow cracks, the plate edges slightly curled up, bone dry, no plants, no water, evenly lit under an
> overcast sky with no shadows and no highlights, flat, photorealistic, sharp detail, square.

**13. `clay_red.png`: Red Hill.** About 2 m across.

> Seamless tileable texture, straight-down photograph of a bare red clay slope surface, the frame showing
> about 2 metres across, smooth compacted iron-red clay with light scuffs, a fine dusting of lighter dry clay
> powder, a few small embedded pebbles, slight water-worn streaks, no plants, evenly lit under an overcast
> sky with no shadows and no highlights, flat, photorealistic, sharp detail, square.

**14. `concrete.png`: pads, the shop floor, the staging lanes.** About 2 m across. No joints or lines.

> Seamless tileable texture, straight-down photograph of a weathered grey concrete slab, the frame showing
> about 2 metres across, fine aggregate faintly showing, light grey with slightly darker dusty areas, a few
> small chips and pits, faint old oil stains, no expansion joints, no lines, no cracks across the frame,
> evenly lit under an overcast sky with no shadows and no highlights, flat, photorealistic, sharp detail,
> square.

**15. `wood_planks.png`: bridges and decks.** About 1 m across. The planks run straight up and down the
picture, full length, continuing through the top and bottom edges.

> Seamless tileable texture, straight-down photograph of old weathered wooden planks, the frame showing about
> 1 metre across, five planks side by side running perfectly straight from the top edge to the bottom edge
> with narrow dark gaps between them, silver-grey weathered wood with warm brown grain showing through, small
> cracks along the grain, rusty nail heads, evenly lit under an overcast sky with no shadows and no highlights,
> flat, photorealistic, sharp detail, square.

**16. `sheet_metal.png`: barns and sheds.** About 1 m across. Ribs straight up and down, continuing through
the top and bottom edges.

> Seamless tileable texture, straight-down photograph of corrugated galvanised steel roofing sheet, the frame
> showing about 1 metre across, eight evenly spaced ribs running perfectly straight from the top edge to the
> bottom edge, dull zinc grey with a soft crystalline galvanised pattern, rust streaks and orange-brown
> staining along the rib tops and a few rusty screw heads, matte, evenly lit under an overcast sky with no
> shadows and no highlights, photorealistic, sharp detail, square.

**17. `hay.png`: hay bales.** About 1 m across. Strands straight up and down.

> Seamless tileable texture, straight-down photograph of the side of a tightly packed straw bale, the frame
> showing about 1 metre across, dense straw strands running mostly straight from the top edge to the bottom
> edge, golden yellow and pale straw with a few darker stalks, tightly compressed, no twine, no gaps, evenly
> lit under an overcast sky with no shadows and no highlights, photorealistic, sharp detail, square.

## Sending them back

- Keep the file names above (the game looks for them), at the size the tool gave you; don't resize or
  re-save them in another program.
- Check each one by laying it 2 × 2: if you can see the joins, say which ones and I'll fix the tiling.
- Tell me which tool made them and whether its tiling option was on.
- Don't make normal (bump) maps; I derive them from the colour pictures, which comes out better than a tool
  guessing them.
- Any you don't get to, the game keeps its own procedural surface for, so a partial set is fine.
