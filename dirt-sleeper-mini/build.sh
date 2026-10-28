#!/bin/sh
# Concatenates the modules into one self-contained page: dist/model-bay.html
cd "$(dirname "$0")"
{
  cat src/00_head.html
  for f in src/*.js; do cat "$f"; echo; done
  cat src/99_tail.html
} > dist/model-bay.html
echo "dist/model-bay.html $(wc -c < dist/model-bay.html) bytes"
# The same page for publishing as a claude.ai artifact: the host supplies doctype, html, head and body,
# so strip ours and promise the side gutter (the bar and dock pad with max(16px, safe-area)).
python3 - <<'PY'
s=open('dist/model-bay.html').read()
s=s.replace('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Dirt Sleeper Mini</title>',
            '<title>Dirt Sleeper Mini</title>\n<meta name="claude:viewport-fit-sides" content="cover">',1)
s=s.replace('</style></head><body>','</style>',1).replace('</script>\n</body></html>','</script>',1)
assert '<html' not in s and '<body' not in s and '</head>' not in s
open('dist/model-bay.artifact.html','w').write(s)
PY
echo "dist/model-bay.artifact.html $(wc -c < dist/model-bay.artifact.html) bytes"
