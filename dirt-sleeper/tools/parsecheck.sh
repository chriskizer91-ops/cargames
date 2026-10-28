#!/bin/sh
# Syntax-check the script inside each built page.
cd "$(dirname "$0")/.."
for f in dist/dirt-sleeper.html dist/sound-board.html; do
  python3 -c "import sys;s=open('$f').read();print(s[s.index('<script>')+8:s.rindex('</script>')])" > /tmp/_pc.js && node --check /tmp/_pc.js && echo "ok $f"
done
