#!/bin/sh
# Builds the single-file pages. Each page is its shell's head (title, styles, markup, the opening of
# the one script scope), the source modules it uses in order, and its shell's tail.
set -e
cd "$(dirname "$0")"
page(){ out=$1;shell=$2;shift 2
  { cat "shell/$shell.head.html"; for m in "$@"; do cat "src/$m.js"; done; cat "shell/$shell.tail.html"; } > "$out"
  echo "$out $(wc -c < "$out") bytes"; }

# everything a car is: the display, the meshes, the engine and its sound, the bodies, parts, wheels and builds
CARS="10_core 11_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_audio 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 30_wheels 31_engine_bay 32_builds 33_car_mesh"

page model-bay.html bay $CARS 18_bay_voices 19_engine_loop 80_bay_stage 81_bay_app

# the game: the cars, the physics, the ranch and the country round it, the game, its HUD and its menu
page game.html game $CARS 40_physics 41_ground 42_chassis 50_country 51_ranch 52_world_gl 53_fx 60_game 61_hud 62_menu
