"""The baked truck packed for the game (src/33b_baked_data.js), from tools/bake/bake.py's out folder.
   - One picture set for the whole truck, an atlas 2048 x 3072: the body's 2048 square on top, the wheel's 1024
     square under it on the left. Three pictures: colour (its alpha the paint mask), normals (in the truck's own
     axes), and occlusion + roughness + metal (its alpha the clear coat). One set means the car's shader needs only
     three more samplers and the wheel draws with the body's.
   - The meshes the game draws a car with, as its builders split them: the body, the hood, what the hood hides,
     and the wheel. Each vertex: position (16-bit in its box), normal (8-bit), its place on the atlas (16-bit, already
     turned to the way the game uploads pictures: the top row first), and its material (32: baked; 33-36: baked
     and a lamp, so it still lights: 33 a tail and brake lamp, 34 a headlamp, 35 an amber lamp, 36 a reversing lamp;
     2 and 3: the game's two glasses; 16: the dark underside). Which of the game's materials each baked triangle had
     is found by matching it to the game's own triangle in tools/bake/export.js's lists (the same corners).
   usage: python3 tools/bake/pack_game.py <bake-out-dir> [quality] [export-dir, /tmp/bst-bake-in]"""
import sys, os, io, json, base64
import numpy as np
from PIL import Image
D = sys.argv[1]; Q = int(sys.argv[2]) if len(sys.argv) > 2 else 85
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', 'src', '33b_baked_data.js')
W, H, SK, WH = 2048, 3072, 2048, 1024
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
def raw(name, uv):
    r = np.fromfile(os.path.join(D, name + '.bin'), dtype=np.float32); k = 9 if uv else 7; n = len(r) // k
    P = r[:n * 3].reshape(-1, 3); N = r[n * 3:n * 6].reshape(-1, 3)
    U = r[n * 6:n * 8].reshape(-1, 2) if uv else np.zeros((n, 2), np.float32); G = r[n * 8:n * 9] if uv else r[n * 6:n * 7]
    return P, N, U, G.astype(np.int32)
def atlas_uv(U, region):
    s, t = U[:, 0].copy(), 1 - U[:, 1]
    if region == 'skin': return np.c_[s * SK / W, t * SK / H]
    return np.c_[s * WH / W, (SK + t * WH) / H]
IN = sys.argv[3] if len(sys.argv) > 3 else '/tmp/bst-bake-in'
def game_mat(src, P):
    """each corner's material in the game: its triangle found among export.js's triangles by its middle"""
    from scipy.spatial import cKDTree
    r = np.fromfile(os.path.join(IN, src + '.bin'), dtype=np.float32); n = len(r) // 32
    T = r[:n * 9].reshape(-1, 3, 3).mean(1); M = r[n * 30:n * 31].astype(np.int32)
    d, i = cKDTree(T).query(P.reshape(-1, 3, 3).mean(1)); assert d.max() < 1e-4, ('unmatched triangle', src, d.max())
    return np.repeat(M[i], 3)
LAMP = {7: 33, 8: 34, 9: 34, 29: 34, 10: 35, 23: 36}
pieces = {'body': [], 'hood': [], 'hide': [], 'wheel': []}
P, N, U, G = raw('skin', True); UA = atlas_uv(U, 'skin'); MS = np.array([LAMP.get(m, 32) for m in game_mat('low_skin', P)])
for g, part in enumerate(('body', 'hood', 'hide')):
    sel = G == g; pieces[part].append((P[sel], N[sel], UA[sel], MS[sel]))
P, N, U, G = raw('glass', False); MG = game_mat('low_glass', P)
for g, part in enumerate(('body', 'hood', 'hide')):
    sel = G == g; pieces[part].append((P[sel], N[sel], np.zeros((sel.sum(), 2)), MG[sel]))
P, N, U, G = raw('under', False)
for g, part in enumerate(('body', 'hood', 'hide')):
    sel = G == g; pieces[part].append((P[sel], N[sel], np.zeros((sel.sum(), 2)), np.full(sel.sum(), 16)))
P, N, U, G = raw('wheel', True); pieces['wheel'].append((P, N, atlas_uv(U, 'wheel'), np.full(len(P), 32)))
def pack(lst):
    P = np.concatenate([a[0] for a in lst]); N = np.concatenate([a[1] for a in lst]); U = np.concatenate([a[2] for a in lst]); M = np.concatenate([a[3] for a in lst])
    N = N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9)
    key = np.c_[np.round(P * 2e4), np.round(N * 127), np.round(U * 65535), M].astype(np.int64)
    uq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    first = np.zeros(len(uq), np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    p, nn, u, m = P[first], N[first], U[first], M[first]
    lo = p.min(0); sc = np.maximum(p.max(0) - lo, 1e-6)
    I = inv.astype(np.uint32 if len(uq) > 65535 else np.uint16)
    return {'v': int(len(uq)), 't': int(len(I) // 3), 'box': [float(x) for x in list(lo) + list(sc)],
            'P': b64(np.round((p - lo) / sc * 65535).astype(np.uint16)), 'N': b64(np.round(nn * 127).astype(np.int8)),
            'U': b64(np.round(np.clip(u, 0, 1) * 65535).astype(np.uint16)), 'M': b64(m.astype(np.uint8)), 'I': b64(I), 'i32': bool(len(uq) > 65535)}
parts = {k: pack(v) for k, v in pieces.items()}
# ---------- the atlas ----------
L = lambda n: Image.open(os.path.join(D, n + '.png'))
def put(dst, skin, wheel):
    dst.paste(skin.resize((SK, SK), Image.LANCZOS), (0, 0)); dst.paste(wheel.resize((WH, WH), Image.LANCZOS), (0, SK)); return dst
grey = lambda n: np.asarray(L(n).convert('L'), np.float32)
def orm(tag, coat):
    ao, me = grey(tag + '_ao'), grey(tag + '_metal'); ao = np.maximum(ao, me * .9)
    ch = [ao, grey(tag + '_rough'), me, grey(tag + '_coat') if coat else np.zeros_like(ao)]
    return Image.fromarray(np.stack(ch, -1).clip(0, 255).astype(np.uint8), 'RGBA')
def colour(tag, paint):
    c = np.asarray(L(tag + '_col').convert('RGB'), np.uint8); a = grey(tag + '_paint') if paint else np.zeros(c.shape[:2], np.float32)
    return Image.fromarray(np.concatenate([c, a.clip(0, 255).astype(np.uint8)[..., None]], -1), 'RGBA')
col = put(Image.new('RGBA', (W, H), (8, 8, 8, 0)), colour('skin', True), colour('wheel', False))
nrm = put(Image.new('RGB', (W, H), (128, 255, 128)), L('skin_nrm').convert('RGB'), L('wheel_nrm').convert('RGB'))
ormi = put(Image.new('RGBA', (W, H), (255, 128, 0, 0)), orm('skin', True), orm('wheel', False))
def webp(im, q):
    # (exact: WebP otherwise throws away the colour under a fully clear alpha, and here the alpha is a mask, not see-through)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6, alpha_quality=100, exact=True); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())
(cs, cn), (ns, nn_), (os_, on) = webp(col, Q), webp(nrm, 92), webp(ormi, Q)
js = ('/* =====================================================================================\n'
      '   THE BAKED TRUCK\'S DATA, written by tools/bake/pack_game.py (see tools/bake/): the stock truck\'s own meshes with\n'
      '   their places on one picture atlas, and the atlas (colour + paint mask, normals, occlusion + roughness + metal +\n'
      '   clear coat) as WebP. 33b_baked.js puts it on the road.\n'
      '   ===================================================================================== */\n'
      'const BAKED_DATA=' + json.dumps({'atlas': {'w': W, 'h': H, 'col': cs, 'nrm': ns, 'orm': os_}, 'parts': parts}) + ';\n')
open(OUT, 'w').write(js)
print({k: (v['v'], v['t']) for k, v in parts.items()}, 'lamps', {m: int((MS == m).sum() // 3) for m in (33, 34, 35, 36)}, 'pictures KB', cn // 1024, nn_ // 1024, on // 1024, 'file KB', len(js) // 1024)
