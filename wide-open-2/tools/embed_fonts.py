#!/usr/bin/env python3
"""Writes shell/fonts.html: the game's three typefaces built into the page as @font-face data URIs, so the text is
   right offline and on the first frame. Latin subsets from Fontsource, SIL Open Font License 1.1 (tools/ref/fonts).
   python3 tools/embed_fonts.py"""
import base64, os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ref', 'fonts')
OUT = os.path.join(HERE, '..', 'shell', 'fonts.html')
FACES = [('Chakra Petch', 'chakra-petch', (500, 600, 700)), ('Saira', 'saira', (400, 500, 600)),
         ('Saira Condensed', 'saira-condensed', (500, 600, 700))]
css = ['<style>/* Chakra Petch, Saira and Saira Condensed (SIL Open Font License 1.1; Latin, from Fontsource) */']
for fam, slug, weights in FACES:
    for w in weights:
        b = base64.b64encode(open(os.path.join(SRC, f'{slug}-latin-{w}-normal.woff2'), 'rb').read()).decode()
        css.append(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{w};font-display:block;'
                   f'src:url(data:font/woff2;base64,{b}) format("woff2")}}')
css.append('</style>')
open(OUT, 'w').write('\n'.join(css) + '\n')
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
