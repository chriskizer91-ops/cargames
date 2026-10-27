#!/bin/sh
# Builds the single-file pages in dist/. Each page is its shell (title, styles, markup)
# followed by the source modules, all inside one script scope.
set -e
cd "$(dirname "$0")"
GAME="10_sl3_render 11_sl3_car 12_sl3_env_fx 13_math3 14_dsp 15_sim 20_tyre 21_powertrain_vehicle 22_cars 30_input_camera 31_audio 33_ambience 40_world 41_worldmat 50_suvmesh 51_suvrender 60_build 61_truck 71_events 70_game 80_ui 90_boot"
{ cat shell/game-head.html; for m in $GAME; do cat "src/$m.js"; done; } > dist/dirt-sleeper.html
# a full HTML document around the page, for opening the file locally or in tests
for f in dist/*.html; do
  case "$f" in *.local.html) continue;; esac
  { printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>'; cat "$f"; printf '</body></html>'; } > "${f%.html}.local.html"
done
ls -l dist
