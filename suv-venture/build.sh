#!/bin/sh
# Builds suv-venture.html (one self-contained page): the shell, then one script with the game's code in the game's
# own order (src/game: the car builders and the helpers they need; src/drive: the physics, copied unchanged from
# Road Not Found + Traffic), the SUV Studio's detail (src/hd), the baked truck and the ground pictures (src/venture,
# written by tools/pack_baked.py and tools/pack_ground.py), then the page itself (src/venture/main.js with three.js,
# bundled by esbuild). Needs: npm install (three, esbuild) in this folder once.
set -e
cd "$(dirname "$0")"
npx esbuild src/venture/main.js --bundle --minify --format=iife --target=es2020 --outfile=/tmp/suv-venture-bundle.js --log-level=warning
ORDER="game/00_prelude game/14_loft drive/15_digital_engine game/16_engines game/21_suv game/22_faces game/23_parts
  drive/24_4x4 drive/25_coupe drive/26_wagon drive/27_pickup drive/28_muscle drive/29_hatch drive/34_ev drive/35_wedge drive/36_hyper
  game/30_wheels game/31_engine_bay game/32_builds drive/34_machines
  drive/40_physics drive/41_ground drive/42_chassis drive/43_sim drive/37_newbuilds drive/45_ev
  hd/70_geo hd/71_wheel hd/72_face hd/73_arch hd/75_cabin hd/76_trim hd/89_hd hd/90_kit
  venture/48_baked venture/49_ground venture/91_kit"
{
  cat shell/head.html
  printf '<script>\n'
  for m in $ORDER; do cat "src/$m.js"; printf '\n;\n'; done
  printf '</script>\n<script>\n'
  cat /tmp/suv-venture-bundle.js
  printf '\n</script>\n</body></html>\n'
} > suv-venture.html
echo "suv-venture.html: $(wc -c < suv-venture.html) bytes"
