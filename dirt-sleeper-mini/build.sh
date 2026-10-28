#!/bin/sh
# Builds the two pages into dist/: the model bay and the game. Each page is its shell (title, styles,
# markup) followed by its modules, all inside one script scope, then the shared tail.
set -e
cd "$(dirname "$0")"
COMMON="10_core 11_display 12_gl 13_shader 14_loft 15_de_engine 16_engines 17_audio 18_instruments 20_suv 21_faces 22_parts 23_wheels 24_builds"
BAY="$COMMON 30_stage 39_bayengine 40_bay"
GAME="$COMMON 50_physmath 51_tyre 52_tune 53_vehicle 54_truckphys 60_ranch 61_ranchmesh 62_fx 70_game 71_hud 72_menus"
page() { out="$1"; head="$2"; shift 2
  { cat "src/$head"; for m in "$@"; do if [ -f "src/$m.js" ]; then cat "src/$m.js"; echo; fi; done; cat src/99_tail.html; } > "dist/$out"
  echo "dist/$out $(wc -c < "dist/$out") bytes"; }
page model-bay.html 00_head.html $BAY
[ -f src/00_game_head.html ] && page dirt-sleeper-mini.html 00_game_head.html $GAME
# The same pages for publishing as claude.ai artifacts: the host supplies doctype, html, head and body,
# so strip ours and promise the side gutter (the pages pad their edges with max(16px, safe-area)).
python3 - <<'PY'
import os
for name in ['model-bay','dirt-sleeper-mini']:
    src=f'dist/{name}.html'
    if not os.path.exists(src): continue
    s=open(src).read()
    i=s.index('<title>');j=s.index('</title>')+len('</title>')
    head_open=s[:i]
    assert head_open.startswith('<!doctype html>'),name
    s=s[i:j]+'\n<meta name="claude:viewport-fit-sides" content="cover">'+s[j:]
    s=s.replace('</style></head><body>','</style>',1).replace('</script>\n</body></html>','</script>',1)
    assert '<html' not in s and '<body' not in s and '</head>' not in s,name
    open(f'dist/{name}.artifact.html','w').write(s)
    print(f'dist/{name}.artifact.html {len(s.encode())} bytes')
PY
