#!/usr/bin/env python3
"""Proves the Digital Engine synth and sim in Dirt Sleeper Mini are byte-for-byte the lab's.

The block between the BEGIN/END markers in src/15_de_engine.js (and in each built page) must hash to
the lab's engine-dsp.js + engine-sim.js, which are lines 224-1343 of Digital_Engine.html.

usage: tools/check_de.py [path/to/Digital_Engine.html]
"""
import hashlib, os, sys

LAB_SHA256 = 'aaa1d81cb76aeeca087612fa7c1c76cd07530d634d77d426252b3ad65fe5c802'
BEGIN, END = '/* ---- BEGIN DIGITAL ENGINE ---- */\n', '/* ---- END DIGITAL ENGINE ---- */\n'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def block(path):
    s = open(path, encoding='utf-8').read()
    i, j = s.find(BEGIN), s.find(END)
    if i < 0 or j < 0:
        raise SystemExit(f'{path}: markers missing')
    return s[i + len(BEGIN):j]


ok = True
want = LAB_SHA256
if len(sys.argv) > 1:
    lines = open(sys.argv[1], encoding='utf-8').read().split('\n')
    lab = '\n'.join(lines[223:1343]) + '\n'
    want = hashlib.sha256(lab.encode()).hexdigest()
    print('lab file      ', want, '(matches the recorded hash)' if want == LAB_SHA256 else '(DIFFERENT from the recorded hash: the lab changed)')
for rel in ['src/15_de_engine.js', 'dist/model-bay.html', 'dist/model-bay.artifact.html']:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        continue
    h = hashlib.sha256(block(p).encode()).hexdigest()
    same = h == want
    ok &= same
    print(f'{rel:30s}', 'unchanged' if same else 'CHANGED ' + h)
sys.exit(0 if ok else 1)
