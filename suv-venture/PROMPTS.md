# Picture prompts for SUV: grass and weed cutouts, and rocks

For the clutter test in SUV (a switch that scatters grass, weeds and rocks over the ground, with the frame-rate
readout showing what it costs). Make them in one fresh image chat so they share a look, save each under the file
name given, and send them over (attach them in a chat, or drop them in `suv-venture/pictures/`). Nothing breaks
while they're missing; the switch only appears once there are pictures to use.

## Paste this first, once, at the top of the chat

> We're making picture assets for a realistic driving game set in a dry, late-summer prairie county with red clay
> soil, rolling pasture, gravel roads and scrubby fence lines (think rural Oklahoma or north Texas in August). Every
> picture I ask for should be a photograph, never a painting or a 3-D render, with soft, even light from an overcast
> sky: no hard shadows, no sun direction, no bright highlights, no blur, everything in focus. Keep one consistent look
> and colour across the whole set so they all belong to the same place. Square, 2048 × 2048 if you can, otherwise
> 1024 × 1024. PNG.

## Cutouts: grass and weeds (transparent background)

What makes a cutout work in the game: **PNG with a transparent background**, the plant **seen from the side at eye
level**, standing straight up, **centred**, its whole height in the picture with a little empty margin round it, its
base cut cleanly where it would meet the ground (no soil, no pot, no shadow on the ground, nothing behind it). The
game stands two of these crossed in an X, so the plant should look right from the side.

1. `grass_dry_short.png`: *A short tuft of dry, straw-coloured prairie grass, about ankle high, thin blades fanning
   out from one base. Side view, transparent background.*
2. `grass_dry_tall.png`: *A tall clump of dry golden bunchgrass, about knee high, with seed heads at the tips of some
   stems. Side view, transparent background.*
3. `grass_green.png`: *A tuft of green-and-tan pasture grass, ankle to shin high, mostly green with some dry tips.
   Side view, transparent background.*
4. `foxtail.png`: *A clump of foxtail barley / wild oats with drooping bushy seed heads, pale gold, shin high. Side
   view, transparent background.*
5. `weeds_broadleaf.png`: *A low roadside broadleaf weed (like dock or plantain) with a few tall seed stalks, dusty
   green with brown edges. Side view, transparent background.*
6. `thistle.png`: *A single bull thistle plant, knee high, spiny grey-green leaves, two or three purple flower heads.
   Side view, transparent background.*
7. `weeds_dead.png`: *A clump of dead, dried brown roadside weeds and stalks, tangled, knee high. Side view,
   transparent background.*
8. `cattails.png`: *A small clump of cattails with brown seed heads and long green-and-tan leaves, for the edge of a
   muddy pond. Side view, transparent background.*

Seen from above (these lie flat on the ground):

9. `clover_top.png`: *Looking straight down at a small patch of clover and short weeds about 30 cm across, roughly
   round, transparent background round it (no soil showing).*
10. `leaves_top.png`: *Looking straight down at a loose scatter of dry brown fallen leaves and twigs about 40 cm
    across, transparent background round it.*

## Rocks

A rock in the game is two things: **a shape**, which I make (see below), and **a skin**, which comes from these
pictures. The skins follow the same rules as the ground pictures already in the game: **looking straight at the
surface, filling the whole frame, seamless on all four edges, flat even light**.

11. `rock_limestone.png`: *A seamless, tileable photograph looking straight at weathered grey limestone: pitted,
    cracked, a few faint lichen spots, filling the whole frame edge to edge. No horizon, no shadows from outside the
    rock. Seamless on all four edges.*
12. `rock_sandstone.png`: *The same, red-brown sandstone with faint layering lines, a little rust and dust.*
13. `rock_granite.png`: *The same, rough speckled pink-and-grey granite with patches of pale green and orange
    lichen.*
14. `rock_creek.png`: *The same, smooth rounded creek-bed stone, grey-brown, water-worn, matte and dry.*

Optional, and only if the tool does them well: the same four again as height maps.

15. `rock_limestone_height.png` (and `_sandstone_`, `_granite_`, `_creek_`): *The same rock surface as a black-and-white
    height map: white where the surface is highest, black in the deepest cracks, smooth greys between. No lighting,
    no shadows, no colour.* (If these come out wrong or don't match, skip them; I can work the bumps out from the
    colour pictures.)

## How a rock gets to be 3-D

- **The shape is made, not drawn.** I start from a ball, push it in and out with layers of noise (big lumps, then
  smaller ridges, then sharp cracks and flat broken faces), flatten the bottom so it sits on the ground, and make
  five or six different ones: a boulder, a flat slab, a pile of three, a half-buried one, some small stones.
- **Then the same trick as the truck.** Each rock is made detailed (tens of thousands of triangles), then baked onto
  a light copy of itself (a few hundred), so it carries the cracks and lumps as pictures and costs almost nothing.
- **The skin wraps on from all sides** (projected from the three directions and blended, so there is no seam to
  find), from your pictures above; the height maps, or the colour pictures themselves, give the fine bumps.
- **Scattered by the thousand**: one rock drawn many times in one go is cheap, the same as the grass.
