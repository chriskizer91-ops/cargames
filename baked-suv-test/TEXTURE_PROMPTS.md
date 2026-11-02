# Texture prompts for Redline County: Wide Open 2

The county already uses the owner's seventeen ground photographs made for Rut Access (dirt, grass, the trail,
gravel, asphalt, the strip's rubber, rock, ruts, mud, playa, clay, concrete, planks, sheet metal, hay; they live in
`rut-access/textures/` and the packer reads them from there). These six are what the county has that Rut Access's
ranch didn't: the salt flats, the town's brick and stucco walls, the gas station's and the diner's forecourts, the
paint on the roads, and the speedway's clay. Until a picture arrives that surface keeps the look Wide Open drew for
it (or, for the forecourts and the speedway, the concrete and clay photographs). One picture per surface, generated
with an image tool, dropped into `wide-open-2/textures/` under the file name given. `TEXTURES.md` says how the game
reads them.

## Rules for every picture

**What to ask the tool for, every time**

- **Square, 1024 × 1024 pixels at the least; 2048 × 2048 if the tool offers it.** I downsize; I can't upsize.
- **PNG**, full quality, sRGB colour. I make the small copies for the game myself, so don't let the tool
  compress. If PNG isn't offered, the highest-quality JPG it has.
- **Straight on.** A photograph taken square to the surface (straight down on the ground, straight at the wall),
  the surface filling the whole frame edge to edge. No horizon, no sky, no perspective, nothing standing on the
  surface, no hands, feet, tools or scale objects.
- **Flat light.** Lit evenly from everywhere, like under a white overcast sky: no shadows, no highlights, no
  sun direction, no wet reflections, no vignette (dark corners), no blur, everything in focus. The game lights
  the surface itself; a baked-in sun looks wrong the moment the car turns.
- **Seamless.** Tileable on all four edges so copies laid side by side show no join. Use the tool's tiling
  option (Midjourney: add `--tile`; Stable Diffusion, ComfyUI, Automatic1111: "tiling" or "seamless"; Leonardo:
  "Tiling"). If your tool has no such option, make the pictures anyway and tell me: I can make them tile.
- **Photoreal.** A photograph of a real surface, not a painting, render or cartoon. Keep one look across the set
  and with the seventeen already in the game, so they sit together in the same county.
- **Even tone.** Natural mid-tones, the detail in the small stuff. One bright or dark patch repeats visibly
  across a street or a wall, so nothing large and odd anywhere in the frame.
- **Nothing else.** No text, no watermark, no logo, no frame or border.

**Negative prompt**, where the tool takes one, for every picture:
`shadows, highlights, sunlight, sun, horizon, sky, perspective, depth of field, blur, vignette, dark corners, text,
watermark, logo, border, frame, people, hands, feet, objects, puddles, reflections, 3D render, cartoon, painting,
illustration, tilted, angled view`

**Scale.** Each prompt says how wide a piece of surface the picture shows (about 1 to 3 m). That sets how big the
grains, bricks and cracks come out; put the measure in the prompt as written.

**Colour.** The walls are tinted building by building in the game (red brick, brown brick, cream stucco, pink
stucco), so the brick and the stucco only give their grain: make them a plain mid-tone of their material, not a
striking colour. The ground ones are used with their own colour half and half with the game's.

## The pictures

**1. `salt_crust.png`: the salt flats, past two miles out.** About 3 m across. The biggest surface in the county:
the most important of the six.

> Seamless tileable texture, straight-down photograph of a dry salt flat surface like Bonneville, the frame
> showing about 3 metres across, hard bright off-white salt crust with a faint grey-beige tint, a fine crystalline
> grain, shallow low ridges outlining irregular polygon plates 30 to 60 centimetres across, a few faint tan
> patches where clay shows through, bone dry, no water, no tyre marks, evenly lit under an overcast sky with no
> shadows and no highlights, flat, photorealistic, sharp detail, square.

**2. `brick.png`: the town's brick buildings (Downtown's older blocks, the Yards).** About 1.2 m across. Courses
level, running straight across the picture and continuing through the left and right edges.

> Seamless tileable texture, straight-on photograph of an old common brick wall, the frame showing about 1.2
> metres across, standard bricks about 22 centimetres long and 7 centimetres high laid in running bond, the
> courses perfectly level and straight across the frame, recessed light grey mortar joints, the bricks a muted
> mid-tone red-brown with natural variation from brick to brick, some chipped edges, a little weathering and
> soot, no paint, no graffiti, no windows, evenly lit under an overcast sky with no shadows and no highlights,
> flat, photorealistic, sharp detail, square.

**3. `stucco.png`: the stucco walls (the Heights, Neon Row's low buildings).** About 2 m across.

> Seamless tileable texture, straight-on photograph of a weathered painted stucco wall, the frame showing about 2
> metres across, a coarse sand-finish render with fine trowel texture and small pits, a pale neutral off-white
> paint slightly faded and dusty, a few fine hairline cracks and faint patched areas, no stains running down,
> no windows, no graffiti, evenly lit under an overcast sky with no shadows and no highlights, flat,
> photorealistic, sharp detail, square.

**4. `forecourt.png`: the gas station's and the diner's forecourts, the paddock's lot, the garage's pad.** About 3 m
across. No painted lines or joints: the game draws the joints.

> Seamless tileable texture, straight-down photograph of a well-used concrete gas station forecourt, the frame
> showing about 3 metres across, light grey broom-finished concrete with faint aggregate, darker dusty areas,
> scattered dark oil drips and old fuel stains, faint black tyre scuffs, a few small chips, no expansion joints,
> no painted lines, no cracks across the frame, evenly lit under an overcast sky with no shadows and no
> highlights, flat, photorealistic, sharp detail, square.

**5. `road_paint.png`: the white lines, the double yellow and the zebra crossings.** About 1 m across. The picture
is laid over every painted line and tinted white or yellow by the game, so it should be all paint, no road.

> Seamless tileable texture, straight-down photograph of worn white thermoplastic road marking paint filling the
> whole frame, the frame showing about 1 metre across, the paint slightly rough with fine glass beads and the
> dark stone aggregate of the asphalt showing through in small worn spots and scuffs, grey-white overall, no
> edges of the line visible, no asphalt border, no text or arrows, evenly lit under an overcast sky with no
> shadows and no highlights, flat, photorealistic, sharp detail, square.

**6. `clay_track.png`: Speedway 25, the park's banked clay oval.** About 3 m across.

> Seamless tileable texture, straight-down photograph of a dirt track racing surface, the frame showing about 3
> metres across, dark red-brown packed racing clay, smooth and slightly polished where the cars run with fine
> tyre streaks all running one way, small loose crumbs and clods of lighter dry clay scattered on top, a little
> moisture darkening, no stones, no grass, no lines, evenly lit under an overcast sky with no shadows and no
> highlights, flat, photorealistic, sharp detail, square.

## Sending them back

- Keep the file names above (the packer looks for them), at the size the tool gave you; don't resize or re-save
  them in another program. Put them in `wide-open-2/textures/` (make the folder), then
  `python3 tools/pack_textures.py` and `sh build.sh`.
- Check each one by laying it 2 × 2: if you can see the joins, say which ones and I'll fix the tiling.
- Tell me which tool made them and whether its tiling option was on.
- Don't make normal (bump) maps; the game cuts its own relief into the ground.
- Any you don't get to, the game keeps its own surface for, so a partial set is fine.
