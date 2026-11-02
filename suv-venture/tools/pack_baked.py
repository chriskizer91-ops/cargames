"""The baked truck (tools/bake.py's out folder) packed for the page, into src/venture/48_baked.js:
   - the light meshes, welded and indexed, positions as 16-bit integers inside their bounding box, normals as
     8-bit, picture coordinates as 16-bit (a fraction of the size of plain floats, no visible loss);
   - the pictures as WebP: colour, normals, and occlusion + roughness + metal packed into one picture's red, green
     and blue (the way the renderer reads them), the clear coat's mask at half size.
   usage: python3 tools/pack_baked.py <bake-out-dir> [skin px] [quality]"""
import sys, os, io, json, base64
import numpy as np
from PIL import Image
D = sys.argv[1]; SK = int(sys.argv[2]) if len(sys.argv) > 2 else 2048; Q = int(sys.argv[3]) if len(sys.argv) > 3 else 85
HERE = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(os.path.join(D, 'bake.json')))
b64 = lambda a: base64.b64encode(a.tobytes()).decode()
def mesh(name, uv=True):
    raw = np.fromfile(os.path.join(D, name + '.bin'), dtype=np.float32); k = 8 if uv else 6; n = len(raw) // k
    P = raw[:n * 3].reshape(-1, 3); N = raw[n * 3:n * 6].reshape(-1, 3); U = raw[n * 6:n * 8].reshape(-1, 2) if uv else np.zeros((n, 2), np.float32)
    N = N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9)
    key = np.c_[np.round(P * 2e4), np.round(N * 127), np.round(U * 65535)].astype(np.int64)
    uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    first = np.zeros(len(uq), np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    p, nn, u = P[first], N[first], U[first]
    lo = p.min(0); sc = np.maximum(p.max(0) - lo, 1e-6)
    qp = np.round((p - lo) / sc * 65535).astype(np.uint16); qn = np.round(nn * 127).astype(np.int8); qu = np.round(np.clip(u, 0, 1) * 65535).astype(np.uint16)
    I = inv.astype(np.uint32 if len(uq) > 65535 else np.uint16)
    o = {'v': int(len(uq)), 't': int(len(I) // 3), 'box': [float(x) for x in list(lo) + list(sc)], 'P': b64(qp), 'N': b64(qn), 'I': b64(I), 'i32': bool(len(uq) > 65535)}
    if uv: o['U'] = b64(qu)
    return o
def webp(im, q=Q, lossless=False):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6, lossless=lossless); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())
def grey(name): return Image.open(os.path.join(D, name + '.png')).convert('L')
maps, sizes = {}, {}
for tag, sz in (('skin', SK), ('wheel', min(SK, meta['wheel']))):
    col = Image.open(os.path.join(D, tag + '_col.png')).convert('RGB').resize((sz, sz), Image.LANCZOS)
    nrm = Image.open(os.path.join(D, tag + '_nrm.png')).convert('RGB').resize((sz, sz), Image.LANCZOS)
    # (no occlusion on metal: a chrome reflector down in a lamp still shows what it faces, and three.js darkens a
    # metal's reflections by the occlusion too, which turned the lamps and the wheels' spokes black)
    ao, me = np.asarray(grey(tag + '_ao'), np.float32), np.asarray(grey(tag + '_metal'), np.float32)
    ao = np.maximum(ao, me * .9).clip(0, 255).astype(np.uint8)
    orm = Image.merge('RGB', [Image.fromarray(ao), grey(tag + '_rough'), grey(tag + '_metal')]).resize((sz, sz), Image.LANCZOS)
    for k, im, q in (('col', col, Q), ('nrm', nrm, 92), ('orm', orm, Q)):
        maps[tag + '_' + k], sizes[tag + '_' + k] = webp(im, q)
    if os.path.exists(os.path.join(D, tag + '_coat.png')):
        maps[tag + '_coat'], sizes[tag + '_coat'] = webp(grey(tag + '_coat').resize((sz // 2, sz // 2), Image.LANCZOS).convert('RGB'), 80)
parts = {'skin': mesh('skin'), 'wheel': mesh('wheel'), 'glass': mesh('glass', False), 'under': mesh('under', False)}
js = '/* the baked truck, written by tools/pack_baked.py from tools/bake.py\'s pictures and meshes */\nconst BAKED=' + json.dumps({'D': meta['D'], 'build': meta['build'], 'parts': parts, 'maps': maps}) + ';\n'
open(os.path.join(HERE, '..', 'src', 'venture', '48_baked.js'), 'w').write(js)
print('meshes:', {k: (v['v'], v['t']) for k, v in parts.items()})
print('pictures KB:', {k: v // 1024 for k, v in sizes.items()}, 'file KB', len(js) // 1024)
