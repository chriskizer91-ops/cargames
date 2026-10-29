#!/bin/sh
# Builds the single-file game. The page is its shell's head (title, styles, markup, the opening of the one
# script scope), the source modules in order, and its shell's tail. Also writes game.artifact.html: the same
# page without the document skeleton, for publishing as an artifact.
set -e
cd "$(dirname "$0")"
MODS="10_core 11_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_audio 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 30_wheels 31_engine_bay 32_builds 33_car_mesh
  40_physics 41_ground 42_chassis 43_sim 50_country 51_ranch 52_world_gl 53_fx 55_gfx 54_dev 60_game 61_hud 62_menu"
{ cat shell/game.head.html; for m in $MODS; do cat "src/$m.js"; done; cat shell/game.tail.html; } > game.html
echo "game.html $(wc -c < game.html) bytes"
# the artifact: drop the skeleton the host adds back (doctype, html/head/body and the host's own base style)
python3 - <<'PY'
import re
s=open('game.html',encoding='utf8').read()
s=re.sub(r'^<!doctype html><html><head>.*?</head><body>\n','',s,count=1,flags=re.S)
s=re.sub(r'\n?</body></html>\s*$','\n',s)
open('game.artifact.html','w',encoding='utf8').write(s)
PY
echo "game.artifact.html $(wc -c < game.artifact.html) bytes"
