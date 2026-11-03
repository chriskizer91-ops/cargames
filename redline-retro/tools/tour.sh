#!/bin/sh
# Screenshots round the county: each place at the times of day given. usage: tools/tour.sh "downtown hwyE" "day night" [query]
cd "$(dirname "$0")/.."
PLACES=${1:-"garage downtown neon hwyE gas ridge oval saltE"}; TODS=${2:-"day night"}; Q=${3:-}
STEPS='[["wait",800],["click","#mGo"],["wait",500]'
for t in $TODS; do for p in $PLACES; do
  STEPS="$STEPS,[\"js\",\"(()=>{const g=window.__game;g.APP.tod='$t';g.applyTod('$t');g.APP.lights=!!(g.TOD['$t'].beams??g.TOD['$t'].lightsOn);g.goTo('$p');g.closeMenu();})()\"],[\"wait\",4500],[\"shot\",\"${p}_$t\"]"
done; done
STEPS="$STEPS,[\"js\",\"(()=>{const g=window.__game;return {fps:g.APP.fps.toFixed(0),tris:g.APP.tris,chunks:g.WORLD.chunks.size,traffic:g.TRF_ON.length}})()\"]]"
timeout 600 node tools/shot.cjs "$STEPS" "$Q"
