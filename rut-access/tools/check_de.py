#!/usr/bin/env python3
"""Proves the game's Digital Engine synth and sim are byte for byte the lab's.

The lab (lab/digital-engine.html) carries the synth and sim as src/audio/engine-dsp.js and
src/engine/engine-sim.js, ending where lab/engine-lab.js begins. The game carries the same text between
the BEGIN/END DIGITAL ENGINE markers in src/15_digital_engine.js and in every built page. A change to the
synth is made in the lab first, then copied in; this check fails until the two match again.

It also says whether the lab is still the version every earlier Dirt game shipped (RECORDED).

usage: tools/check_de.py
"""
import glob, hashlib, os, sys

RECORDED = 'aaa1d81cb76aeeca087612fa7c1c76cd07530d634d77d426252b3ad65fe5c802'
LAB_FROM, LAB_TO = '/* ---- src/audio/engine-dsp.js ---- */', '/* ---- lab/engine-lab.js ---- */'
BEGIN, END = '/* ---- BEGIN DIGITAL ENGINE ---- */\n', '/* ---- END DIGITAL ENGINE ---- */\n'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def read(path):
    return open(path, encoding='utf-8').read().replace('\r\n', '\n')


lab = read(os.path.join(ROOT, 'lab', 'digital-engine.html'))
i, j = lab.find(LAB_FROM), lab.find(LAB_TO)
if i < 0 or j < 0:
    raise SystemExit('lab/digital-engine.html: markers missing')
want = sha(lab[i:j])
print(f'{"lab/digital-engine.html":34s}', want[:16], '(as every Dirt game shipped)' if want == RECORDED else '(changed since the Dirt games)')

ok = True
pages = [os.path.join(ROOT, 'src', '15_digital_engine.js')] + sorted(
    p for p in glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'dist', '*.html')))
for path in pages:
    if not os.path.exists(path):
        continue
    s = read(path)
    a, b = s.find(BEGIN), s.find(END)
    rel = os.path.relpath(path, ROOT)
    if a < 0 or b < 0:
        print(f'{rel:34s} no Digital Engine markers')
        ok = False
        continue
    same = sha(s[a + len(BEGIN):b]) == want
    ok &= same
    print(f'{rel:34s}', 'matches the lab' if same else 'DIFFERENT from the lab')
sys.exit(0 if ok else 1)
