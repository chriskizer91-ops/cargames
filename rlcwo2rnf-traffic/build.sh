#!/bin/sh
# Builds rlcwo2rnf-traffic.html: the shell's head (title, styles, markup, the opening of the one script scope),
# the source modules in order, and the shell's tail.
set -e
cd "$(dirname "$0")"
page(){ out=$1;shell=$2;shift 2
  # (the fonts go in where the head says <!--FONTS-->: tools/embed_fonts.py writes them)
  { awk '$0=="<!--FONTS-->"{while((getline l<"shell/fonts.html")>0)print l;next}1' "shell/$shell.head.html"
    for m in "$@"; do cat "src/$m.js"; done; cat "shell/$shell.tail.html"; } > "$out"
  echo "$out $(wc -c < "$out") bytes"; }

# everything a car is: Shiftlight 3's renderer (11_sl3), the display, the meshes, the engine and its sound, the bodies, parts, wheels and builds
CARS="10_core 11_sl3 12_display 12_gl_mesh 13_lit 14_loft 15_digital_engine 16_engines 17_audio 20_instruments
  21_suv 22_faces 23_parts 24_4x4 25_coupe 26_wagon 27_pickup 28_muscle 29_hatch 34_ev 35_wedge 36_hyper 30_wheels 31_engine_bay 32_builds 33_car_mesh 34_machines"
# how they drive: the physics, the ground contact, each build's chassis and the Sim level
DRIVE="40_physics 41_ground 42_chassis 43_sim 37_newbuilds 44_ai 45_ev"
# the world: the ground's photographs (49_textures, made by tools/pack_textures.py), the generator (run in a worker), the chunks round the camera, the world through the renderer's hooks, the world's dev panel and cruise, the dust and mud, the developer panel, the graphics tiers and the display
WORLD="49_textures 49_voices 50_worldgen 51_world 52_world_gl 52_world_dev 53_fx 54_dev 55_gfx 55_post"
# the game: the garage's parts, the ratings, the feats, day and night, the game, its HUD, menu, garage, touch and boot
GAME="56_parts 57_ratings 58_ccparts 58_feats 59_daynight 60_game 60_career 60_race 60_traffic 60_streets 60_police 60_heli 60_park 60_chal 60_jobs 60_nitrous 61_hud 62_menu 63_garage 63_showroom 63_dyno_lab 63_tune_career 64_touch 65_boot"

page rlcwo2rnf-traffic.html game $CARS $DRIVE $WORLD $GAME
# the artifact host wants the doctype in capitals
sed -i '1s/^<!doctype html>/<!DOCTYPE html>/' rlcwo2rnf-traffic.html
# the same page without its outer tags, for publishing as an artifact
mkdir -p dist
sed -e '1d' -e '$s#^</body></html>$##' rlcwo2rnf-traffic.html > dist/rlcwo2rnf-traffic.artifact.html
echo "dist/rlcwo2rnf-traffic.artifact.html $(wc -c < dist/rlcwo2rnf-traffic.artifact.html) bytes"
