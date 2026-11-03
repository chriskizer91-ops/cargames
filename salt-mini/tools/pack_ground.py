"""The two ground pictures this page needs, from the owner's pictures (rut-access/textures, the ones Road Not Found's
   county uses), cut down and saved as WebP into src/mini/49_ground.js:
   - salt: the dry lake's cracked crust (playa), turned grey and lifted toward white, the way the salt reads;
   - asphalt: the county's blacktop.
   usage: python3 tools/pack_ground.py [size] [quality]"""
import sys, os, io, base64
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, '..', '..', 'rut-access', 'textures')
size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024; q = int(sys.argv[2]) if len(sys.argv) > 2 else 82
def salt():
    a = np.asarray(Image.open(os.path.join(SRC, 'playa.jpg')).convert('L'), np.float32) / 255
    m = a.mean(); a = (a - m) * .75 + .80          # less contrast, lifted to near white
    rgb = np.stack([a * 1.0, a * .99, a * .965], -1)  # a touch warm, as the crust is
    return Image.fromarray((rgb.clip(0, 1) * 255).astype(np.uint8), 'RGB')
PICS = {'salt': salt(), 'asphalt': Image.open(os.path.join(SRC, 'asphalt.jpg')).convert('RGB')}
out = ['/* the ground pictures (from rut-access/textures), %d px WebP, written by tools/pack_ground.py */' % size, 'const GROUND_TEX={']
total = 0
for k, im in PICS.items():
    im = im.resize((size, size), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); d = b.getvalue(); total += len(d)
    out.append("  %s:'data:image/webp;base64,%s'," % (k, base64.b64encode(d).decode()))
    im.resize((384, 384)).save('/tmp/sm_%s.png' % k)
out.append('};')
open(os.path.join(HERE, '..', 'src', 'mini', '49_ground.js'), 'w').write('\n'.join(out) + '\n')
print('packed', len(PICS), 'pictures,', total // 1024, 'KB')
