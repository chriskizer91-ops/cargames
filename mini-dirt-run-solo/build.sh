#!/bin/sh
# Builds Mini Dirt Run Solo as one HTML file: the shell's head (title, styles, markup, the opening of the
# one script scope), the source modules in order, and the shell's tail.
#   mini-dirt-run-solo.html           the game, a whole page
#   dist/mini-dirt-run-solo.artifact.html   the same page without its doctype, html, head and body tags,
#                                       for publishing as an artifact (the host adds its own)
set -e
cd "$(dirname "$0")"
MODS="10_core 11_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_audio 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 30_wheels 31_engine_bay 32_builds 33_car_mesh 34_machines
  40_physics 41_ground 42_chassis 43_sim 50_country 51_ranch 52_world_gl 53_fx 54_gfx
  55_rigs 56_ratings 57_feats 58_sky 60_game 61_hud 62_menu 63_garage 64_touch 65_career 69_boot"
out=mini-dirt-run-solo.html
{ cat shell/game.head.html; for m in $MODS; do cat "src/$m.js"; done; cat shell/game.tail.html; } > "$out"
echo "$out $(wc -c < "$out") bytes"
mkdir -p dist
sed -e '1s/^<!doctype html><html lang="en"><head>//' -e 's#^</head><body>$##' -e 's#^</body></html>$##' "$out" > dist/mini-dirt-run-solo.artifact.html
echo "dist/mini-dirt-run-solo.artifact.html $(wc -c < dist/mini-dirt-run-solo.artifact.html) bytes"
