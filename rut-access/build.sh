#!/bin/sh
# Builds Rut Access: Road Not Found as one HTML file: the shell's head (title, styles, markup, the opening of
# the one script scope), the source modules in order, and the shell's tail. Run ./build.sh after changing
# anything in src/ or shell/.
#   rut-access.html                 the game, a whole page: open it in a browser with WebGL2
#   dist/rut-access.artifact.html   the same page without its outer tags (the first line's doctype, html, head
#                                   and body, and the closing tags), for publishing as an artifact: the host
#                                   adds its own
set -e
cd "$(dirname "$0")"
page(){ out=$1;shell=$2;shift 2
  { cat "shell/$shell.head.html"; for m in "$@"; do cat "src/$m.js"; done; cat "shell/$shell.tail.html"; } > "$out"
  echo "$out $(wc -c < "$out") bytes"; }

# everything a car is: Shiftlight 3's renderer (11_sl3), the display, the meshes, the engine and its sound, the bodies, parts, wheels and builds
CARS="10_core 11_sl3 12_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_audio 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 30_wheels 31_engine_bay 32_builds 33_car_mesh"
# how they drive: the physics, the ground contact, each build's chassis, the Sim level, the robots and the cross-country routes
DRIVE="40_physics 41_ground 42_chassis 43_sim 44_ai 45_cross"
# the world: the far country, the country, the ranch, its drawing through the renderer, the dust and mud, the developer panel, the graphics tiers and the display
WORLD="50_far 50_country 51_ranch 52_world_gl 53_fx 54_dev 55_gfx 55_post"
# the game: the garage's parts, the ratings, the feats, day and night, the game, its HUD, menu, garage, touch and boot
GAME="56_parts 57_ratings 58_feats 59_daynight 60_game 60_race 61_hud 62_menu 63_garage 64_touch 65_boot"

page rut-access.html game $CARS $DRIVE $WORLD $GAME
mkdir -p dist
sed -e '1d' -e '$s#^</body></html>$##' rut-access.html > dist/rut-access.artifact.html
echo "dist/rut-access.artifact.html $(wc -c < dist/rut-access.artifact.html) bytes"
