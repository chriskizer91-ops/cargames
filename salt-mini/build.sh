#!/bin/sh
# Builds salt-mini.html (one self-contained page): the shell, then one script with the game's code in the game's own
# order (src/game: the car builders and the helpers they need; src/drive: the physics, copied unchanged from Road Not
# Found + Traffic but for its save keys), the SUV Studio's detail (src/hd), the ground pictures (src/mini/49_ground,
# written by tools/pack_ground.py), the game's HUD and engine sound (src/ui), then the page itself (src/mini/main.js with three.js, bundled by esbuild).
# Needs: npm ci (three, esbuild) in this folder once.
set -e
cd "$(dirname "$0")"
npx esbuild src/mini/main.js --bundle --minify --format=iife --target=es2020 --outfile=/tmp/salt-mini-bundle.js --log-level=warning
ORDER="game/00_prelude ui/10_hud game/14_loft drive/15_digital_engine game/16_engines game/21_suv game/22_faces game/23_parts
  drive/24_4x4 drive/25_coupe drive/26_wagon drive/27_pickup drive/28_muscle drive/29_hatch drive/34_ev drive/35_wedge drive/36_hyper
  game/30_wheels game/31_engine_bay game/32_builds drive/34_machines
  drive/40_physics drive/41_ground drive/42_chassis drive/43_sim drive/37_newbuilds drive/45_ev
  hd/70_geo hd/71_wheel hd/72_face hd/73_arch hd/75_cabin hd/76_trim hd/89_hd hd/90_kit
  ui/17_audio ui/20_instruments ui/61_hud mini/49_ground mini/91_kit"
{
  # (the fonts go in where the head says <!--FONTS-->: the game's own, shell/fonts.html)
  awk '$0=="<!--FONTS-->"{while((getline l<"shell/fonts.html")>0)print l;next}1' shell/head.html
  printf '<script>\n'
  for m in $ORDER; do cat "src/$m.js"; printf '\n;\n'; done
  printf '</script>\n<script>\n'
  cat /tmp/salt-mini-bundle.js
  printf '\n</script>\n</body></html>\n'
} > salt-mini.html
echo "salt-mini.html: $(wc -c < salt-mini.html) bytes"
