#!/bin/sh
# Builds suv-studio.html (one self-contained page) from shell/, src/game (the game's car builders, copied),
# src/hd (the studio's own detail) and src/studio (the renderer, bundled with three.js by esbuild).
# Needs: npm install (three, esbuild) in this folder once.
set -e
cd "$(dirname "$0")"
npx esbuild src/studio/main.js --bundle --minify --format=iife --target=es2020 --outfile=/tmp/suv-studio-bundle.js --log-level=warning
{
  cat shell/head.html
  printf '<script>\n'
  for f in src/game/*.js src/hd/*.js; do cat "$f"; printf '\n;\n'; done
  printf '</script>\n<script>\n'
  cat /tmp/suv-studio-bundle.js
  printf '\n</script>\n</body></html>\n'
} > suv-studio.html
echo "suv-studio.html: $(wc -c < suv-studio.html) bytes"
