"""The owner's ground pictures (rut-access/textures, the same ones Road Not Found's county uses) packed for this page:
   each one cut down to 1024 px and saved as WebP into src/venture/49_ground.js, as data URIs.
   usage: python3 tools/pack_ground.py [size] [quality]"""
import sys, os, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, '..', '..', 'rut-access', 'textures')
size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024; q = int(sys.argv[2]) if len(sys.argv) > 2 else 80
NAMES = {'asphalt': 'asphalt.jpg', 'concrete': 'concrete.jpg', 'dirt': 'dirt_red.jpg', 'grass': 'grass_dry.jpg', 'gravel': 'gravel.jpg',
         'mud': 'mud_wet.jpg', 'trail': 'trail.jpg', 'ruts': 'ruts_dry.jpg'}
out = ['/* the owner\'s ground pictures (rut-access/textures), %d px WebP, written by tools/pack_ground.py */' % size, 'const GROUND_TEX={']
total = 0
for k, f in NAMES.items():
    im = Image.open(os.path.join(SRC, f)).convert('RGB'); im = im.resize((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); d = b.getvalue(); total += len(d)
    out.append("  %s:'data:image/webp;base64,%s'," % (k, base64.b64encode(d).decode()))
out.append('};')
open(os.path.join(HERE, '..', 'src', 'venture', '49_ground.js'), 'w').write('\n'.join(out) + '\n')
print('packed', len(NAMES), 'pictures,', total // 1024, 'KB')
