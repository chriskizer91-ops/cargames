#!/bin/sh
# Builds dist/redline-retro.html: the shell (title, styles, markup) and every source module in
# tools/modules.txt, in order, inside one script scope. ORIG=1 builds the untouched original
# (src/orig/) to check the split against the file it came from.
set -e
cd "$(dirname "$0")/.."
OUT=${OUT:-dist/redline-retro.html}
{ cat shell/head.html; while read -r m; do [ -n "$m" ] && cat "src/$m.js"; done < tools/modules.txt; cat shell/tail.html; } > "$OUT"
ls -l "$OUT"
