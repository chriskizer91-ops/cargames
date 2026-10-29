#!/bin/sh
# Builds the single-file pages. Each page is its shell's head (title, styles, markup, the opening of
# the one script scope), the source modules it uses in order, and its shell's tail.
set -e
cd "$(dirname "$0")"
page(){ out=$1;shell=$2;shift 2
  { cat "shell/$shell.head.html"; for m in "$@"; do cat "src/$m.js"; done; cat "shell/$shell.tail.html"; } > "$out"
  echo "$out $(wc -c < "$out") bytes"; }

# everything a car is: the display, the meshes, the engine and its sound, the bodies, parts, wheels and builds
CARS="10_core 11_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_engine_audio 18_engine_keys 19_engine_loop 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 30_wheels 31_engine_bay 32_builds"

page model-bay.html bay $CARS 80_bay_stage 81_bay_app
