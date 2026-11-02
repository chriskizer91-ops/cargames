"""The studio's truck rendered by Blender's path tracer (Cycles), from the parts tools/export_parts.js writes out.
   It answers one question: what does the same model look like when light is traced properly (soft shadows that
   fall off with distance, light bouncing inside the cabin, glass that bends and reflects), with nothing about
   the model changed. Needs Blender's Python module: pip install bpy.
   usage: python3 tools/cycles_render.py <export-dir> <out.png> [view] [width] [height] [samples]
   views: front34 rear34 side wheel lamp cabin (the page's own)"""
import sys, json, math, os
import numpy as np
import bpy
src, outp = sys.argv[1], sys.argv[2]
view = sys.argv[3] if len(sys.argv) > 3 else 'front34'
W, H = int(sys.argv[4]) if len(sys.argv) > 4 else 1600, int(sys.argv[5]) if len(sys.argv) > 5 else 1000
SAMPLES = int(sys.argv[6]) if len(sys.argv) > 6 else 96
man = json.load(open(os.path.join(src, 'manifest.json')))
MAT, SM, B = man['MAT'], man['SM'], man['build']
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def hexlin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c] + [1]
# ---------- materials ----------
def principled(name, base=None, vc=False, metal=0., rough=.5, coat=0., coat_r=.03, emit=None, emit_s=0., sheen=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']
    if vc:
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_name = 'col'; nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
    elif base: p.inputs['Base Color'].default_value = base
    p.inputs['Metallic'].default_value = metal; p.inputs['Roughness'].default_value = rough
    if coat: p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = coat_r
    if sheen: p.inputs['Sheen Weight'].default_value = sheen
    if emit: p.inputs['Emission Color'].default_value = emit; p.inputs['Emission Strength'].default_value = emit_s
    return m
def thin_glass(name, tint, rough=0.):
    """a single sheet of glass (the windows and lenses are one surface): the reflection it gives by Fresnel, the rest let
       through with its tint, unbent"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = tint
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = rough
    nt.links.new(fr.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], o.inputs['Surface'])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m
inv = {v: k for k, v in MAT.items()}; inv.update({v: 'SM_' + k for k, v in SM.items()})
def mat_for(i):
    k = inv.get(i, 'COL')
    if k == 'PAINT': return principled(k, hexlin(B['paint']), metal=.22, rough=.42, coat=1)
    if k == 'ACCENT': return principled(k, hexlin(B['paint2']), metal=.22, rough=.42, coat=1)
    if k == 'GLASS': return thin_glass(k, (.16, .17, .18, 1))
    if k == 'GLASSL': return thin_glass(k, (.6, .62, .64, 1))
    if k in ('CHROME', 'SM_REFLC', 'SM_LUG', 'HEAD', 'REV'): return principled(k, (.92, .92, .93, 1), metal=1, rough=.05)
    if k == 'SM_MIRROR': return principled(k, (.95, .95, .95, 1), metal=1, rough=0)
    if k in ('TYRE', 'SM_TREAD'): return principled(k, (.025, .025, .027, 1), rough=.9)
    if k == 'SM_WALL': return principled(k, (.028, .028, .03, 1), rough=.75)
    if k == 'TAIL': return principled(k, (.35, .01, .01, 1), rough=.1, coat=1)
    if k == 'AMBER': return principled(k, (.75, .3, .04, 1), rough=.1, coat=1)
    if k in ('SM_LENS',): return thin_glass(k, (.93, .93, .93, 1))
    if k == 'SM_REDL': return thin_glass(k, (.75, .03, .02, 1))
    if k == 'SM_AMBERL': return thin_glass(k, (.95, .45, .05, 1))
    if k == 'SM_TINT': return thin_glass(k, (.3, .3, .3, 1))
    if k in ('MESH', 'SM_HONEY', 'SM_GLOSSBLK', 'SMOKE'): return principled(k, vc=k == 'SM_GLOSSBLK', base=(.01, .01, .011, 1), rough=.18, coat=.6)
    if k == 'RIM': return principled(k, hexlin(B['rim']), metal=1, rough=.25)
    if k == 'SM_BRUSH': return principled(k, vc=True, metal=1, rough=.15)
    if k in ('SM_ROTORF',): return principled(k, vc=True, metal=.85, rough=.38)
    if k in ('SM_CAST',): return principled(k, vc=True, metal=.7, rough=.55)
    if k in ('CLAD', 'SM_CLADS'): return principled(k, hexlin(B['clad']), rough=.72)
    if k == 'SM_LINER': return principled(k, (.012, .012, .013, 1), rough=.8)
    if k == 'CALIPER': return principled(k, hexlin(B['cal']), rough=.35, coat=.6)
    if k == 'ROTOR': return principled(k, (.35, .35, .37, 1), metal=.9, rough=.32)
    if k == 'PLATE': return principled(k, (.72, .72, .66, 1), rough=.4)
    if k == 'SHUT': return principled(k, (.01, .01, .01, 1), rough=.7)
    if k in ('SM_SEAT', 'SM_CARPET', 'SM_HEADLINER', 'FABRIC'): return principled(k, vc=True, rough=.95, sheen=.5)
    if k in ('SM_VINYL', 'SM_DASH', 'SM_SEAL'): return principled(k, vc=True, rough=.7)
    if k == 'SM_SATIN': return principled(k, vc=True, metal=.8, rough=.32)
    if k == 'SM_BOLT': return principled(k, vc=True, metal=1, rough=.3)
    if k == 'SM_BULB': return principled(k, (1, .97, .9, 1), rough=.2, emit=(1, .95, .85, 1), emit_s=1.5)
    if k in ('LED', 'HALO', 'EMIT'): return principled(k, (1, 1, 1, 1), emit=(1, 1, 1, 1), emit_s=3)
    if k == 'SM_GAUGE': return principled(k, vc=True, rough=.3)
    if k in ('METAL', 'RUBBER'): return principled(k, vc=True, metal=.55 if k == 'METAL' else 0, rough=.45 if k == 'METAL' else .85)
    return principled(k, vc=True, rough=.55)
mats = {}
# ---------- the meshes (game axes: x forward, y up, z right; Blender's: z up) ----------
G2B = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], dtype=np.float32)
for pc in man['pieces']:
    raw = np.fromfile(os.path.join(src, pc['file'] + '.bin'), dtype=np.float32); n = pc['tris']
    P = raw[:n * 9].reshape(-1, 3); N = raw[n * 9:n * 18].reshape(-1, 3); C = raw[n * 18:n * 30].reshape(-1, 4)
    M = np.array(pc['M'], dtype=np.float32).reshape(4, 4).T
    P = (np.c_[P, np.ones(len(P), np.float32)] @ M.T)[:, :3]; N = N @ M[:3, :3].T
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
    if np.linalg.det(M[:3, :3]) < 0:   # (a mirrored wheel: keep its faces turned out)
        P = P.reshape(-1, 3, 3)[:, ::-1].reshape(-1, 3); N = N.reshape(-1, 3, 3)[:, ::-1].reshape(-1, 3); C = C.reshape(-1, 3, 4)[:, ::-1].reshape(-1, 4)
    P = P @ G2B.T; N = N @ G2B.T
    # the game keeps no one winding (its sides are mirrored with the same order): turn every triangle so its own facing
    # agrees with its normals, or Cycles takes it as seen from behind and shades it from the inside
    T3 = P.reshape(-1, 3, 3); g = np.cross(T3[:, 1] - T3[:, 0], T3[:, 2] - T3[:, 0]); bad = (g * N.reshape(-1, 3, 3).sum(1)).sum(1) < 0
    if bad.any():
        for A, k in ((P, 3), (N, 3), (C, 4)):
            V = A.reshape(-1, 3, k); V[bad] = V[bad][:, ::-1]
    me = bpy.data.meshes.new(pc['file'])
    me.vertices.add(len(P)); me.vertices.foreach_set('co', P.ravel())
    me.loops.add(len(P)); me.loops.foreach_set('vertex_index', np.arange(len(P), dtype=np.int32))
    me.polygons.add(n); me.polygons.foreach_set('loop_start', np.arange(0, len(P), 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(n, 3, np.int32))
    me.update(); me.validate()
    if len(me.loops) == len(N): me.normals_split_custom_set(N.tolist())
    ca = me.color_attributes.new('col', 'FLOAT_COLOR', 'CORNER'); ca.data.foreach_set('color', np.c_[C[:, :3], np.ones(len(C))].astype(np.float32).ravel())
    if pc['mat'] not in mats: mats[pc['mat']] = mat_for(pc['mat']) if not os.environ.get('NOMAT') else principled('grey',(.5,.5,.5,1),rough=.6)
    me.materials.append(mats[pc['mat']])
    ob = bpy.data.objects.new(pc['name'], me); sc.collection.objects.link(ob)
# ---------- the studio: a floor that catches only the shadow, soft boxes, a light grey backdrop ----------
bpy.ops.mesh.primitive_plane_add(size=60); fl = bpy.context.active_object; fl.is_shadow_catcher = True
def area(name, size, loc, rot, power, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = 'RECTANGLE'; d.size, d.size_y = size; d.energy = power; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot; sc.collection.objects.link(o); return o
def aim(o, target):
    import mathutils
    d = mathutils.Vector(target) - o.location; o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
k = area('top', (12, 4), (0, 0, 9), (0, 0, 0), 1100); aim(k, (0, 0, 0))
for y in (-9, 9):
    s = area('strip', (1.6, 8), (1.5, y, 4.5), (0, 0, 0), 260); aim(s, (0, 0, 1))
f = area('front', (6, 4), (11, -3, 4), (0, 0, 0), 520, (1, .97, .93)); aim(f, (0, 0, .8))
r = area('back', (6, 3), (-11, 2, 4), (0, 0, 0), 300, (.92, .96, 1)); aim(r, (0, 0, 1))
key = bpy.data.lights.new('key', 'SUN'); key.energy = 1.6; key.angle = math.radians(6)
ko = bpy.data.objects.new('key', key); ko.location = (3.2, -2.4, 7.5); aim(ko, (0, 0, 0)); sc.collection.objects.link(ko)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (.07, .07, .072, 1)
# ---------- the camera, from the page's views (game axes) ----------
VIEWS = {'front34': ((5.6, 1.55, 4.6), (.15, .8, 0)), 'rear34': ((-5.4, 1.7, 4.8), (-.1, .85, 0)), 'side': ((0, 1.0, 8.2), (0, .85, 0)),
         'wheel': ((2.6, .55, 2.35), (1.36, .4, .8)), 'lamp': ((3.9, 1.0, 1.55), (2.35, .88, .55)), 'cabin': ((1.6, 1.75, 2.2), (-.2, 1.05, 0))}
pos, tgt = VIEWS[view]; g2b = lambda v: (v[0], -v[2], v[1])
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.angle = math.radians(28)
co = bpy.data.objects.new('cam', cd); co.location = g2b(pos); aim(co, g2b(tgt)); sc.collection.objects.link(co); sc.camera = co
# ---------- render ----------
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 10; sc.cycles.diffuse_bounces = 6; sc.cycles.transparent_max_bounces = 16
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
sc.render.film_transparent = True
try: sc.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception: sc.view_settings.view_transform = 'Standard'
sc.render.filepath = outp + '.raw.png'; sc.render.image_settings.color_mode = 'RGBA'
bpy.ops.render.render(write_still=True)
# the backdrop: the page's light grey behind the truck and its shadow
from PIL import Image
im = Image.open(outp + '.raw.png').convert('RGBA'); bgc = Image.new('RGBA', im.size, (230, 229, 226, 255)); bgc.alpha_composite(im); bgc.convert('RGB').save(outp)
print("saved", outp)
