#!/usr/bin/env python3
"""The ground's photographs, packed into the game (Rut Access's packer, for this county).

Reads each layer's picture from wide-open-2/textures/<name>.png or .jpg (pictures made for this county) or, failing
that, from ../rut-access/textures/<name>.png or .jpg (the owner's seventeen ground photographs, which live there
and are not copied into this folder), makes each one tile (the half-offset blend: the edges of the tile are taken
from its own middle, which is continuous across the wrap, faded in over a band), flattens any baked-in shading
(the slow part of the brightness is evened out so the renderer's light is the only light), resizes, encodes WebP
and writes src/49_textures.js: TEXPACK, one layer a surface, with each picture's mean colour in linear light
(what the shader divides by to lay the picture's grain over the procedural colour), its scale in metres a tile,
the name the shader knows it by (t: T_<t> in 13_lit.js) and whether there is a picture (has).

A surface with no picture is listed with has:false and no picture; the shader leaves that surface as this game
drew it, or reads the layer it falls back on (13_lit.js's TEX_FALLBACK). So a picture delivered later drops in by
its file name: put it in textures/, run this, run build.sh. No code changes.

The size: 1024 a side unless the pack would push the page past its budget (9 MB in all; --budget is what the
pictures may take, 7.3 MB by default, the rest of the page being about 1.6 MB), then 768. --size forces one.

usage: python3 tools/pack_textures.py [--size auto|1024|768|512] [--quality 74] [--budget 7.3] [--preview out.png]
"""
import sys, os, io, json, base64, argparse
import numpy as np
from PIL import Image, ImageFilter

HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
TDIRS=[os.path.join(ROOT,'textures'),os.path.join(ROOT,'..','rut-access','textures')]
# file name, the shader's name for it (T_<name>), metres a tile, how hard to flatten baked shading (0..1), whether the
# picture has a direction (ribs, planks, ruts, bricks: a narrower blend across them)
LAYERS=[
  # the owner's seventeen, as Rut Access packs them
  ('dirt_red','DIRT',2,.45,0),('dirt_red_2','DIRT2',2,.45,0),('grass_dry','GRASS',2,.4,0),('grass_dry_2','GRASS2',2,.4,0),
  ('trail','TRAIL',2,.45,1),('gravel','GRAVEL',1.5,.5,0),('asphalt','ASPHALT',2,.4,0),('strip_rubber','STRIP',2,.45,1),
  ('rock','ROCK',1.5,.8,0),('ruts_dry','RUTS',3.1,.7,1),('mud_wet','MUD',2,.7,0),('playa','PLAYA',3,.5,0),
  ('clay_red','CLAY',2,.5,0),('concrete','CONCRETE',2,.45,0),('wood_planks','PLANKS',1,.5,1),('sheet_metal','SHEET',1,.6,1),
  ('hay','HAY',1,.5,1),
  # this county's own (TEXTURE_PROMPTS.md): the salt, the town's walls, the forecourts, the road paint, the speedway's clay
  ('salt_crust','SALT',3,.5,0),('brick','BRICK',1.2,.55,1),('stucco','STUCCO',2,.5,0),('forecourt','FORECOURT',3,.45,0),
  ('road_paint','PAINT',1,.45,0),('clay_track','CLAYTRACK',3,.5,0)]

def smooth(t):
    t=np.clip(t,0,1);return t*t*(3-2*t)

def flatten(a,strength):
    """even out the slow brightness: a big blur of the luminance, divided out (partly), the mean kept"""
    if strength<=0:return a
    L=a@np.array([.299,.587,.114],dtype=np.float32)
    small=Image.fromarray((np.clip(L,0,1)*255).astype(np.uint8)).resize((256,256),Image.BOX)
    blur=np.asarray(small.filter(ImageFilter.GaussianBlur(14)).resize(a.shape[1::-1],Image.BILINEAR)).astype(np.float32)/255
    mean=L.mean();f=(mean/np.maximum(blur,.04))**strength
    f=np.clip(f,.55,1.8)
    out=a*f[...,None];out*=mean/max(1e-4,(out@np.array([.299,.587,.114],dtype=np.float32)).mean())
    return np.clip(out,0,1)

def seamless(a,directional):
    """the half-offset blend, over a band at each edge: wide where the picture has no direction, narrow across a direction"""
    h,w,_=a.shape;sh=np.roll(np.roll(a,h//2,0),w//2,1)
    bx=(.06 if directional else .15)*w;by=.15*h
    x=np.arange(w);dx=np.minimum(x,w-1-x);rx=smooth(1-dx/bx)
    y=np.arange(h);dy=np.minimum(y,h-1-y);ry=smooth(1-dy/by)
    m=np.maximum(rx[None,:],ry[:,None])[...,None]
    return a*(1-m)+sh*m

def linear_mean(a):
    c=np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4);return [round(float(v),4) for v in c.reshape(-1,3).mean(0)]

def find(name):
    for d in TDIRS:
        for ext in ('.png','.jpg','.jpeg','.webp'):
            f=os.path.join(d,name+ext)
            if os.path.exists(f):return f
    return None

def prepare():
    """each picture made tileable and flattened, at full size (resized per pass below)"""
    out=[]
    for name,t,scale,flat,direc in LAYERS:
        f=find(name)
        if not f:out.append((name,t,scale,None,None));continue
        a=np.asarray(Image.open(f).convert('RGB')).astype(np.float32)/255
        a=seamless(flatten(a,flat),bool(direc))
        out.append((name,t,scale,Image.fromarray((np.clip(a,0,1)*255+.5).astype(np.uint8)),f))
    return out

def encode(prep,size,quality):
    layers=[];total=0
    for name,t,scale,im,f in prep:
        if im is None:layers.append({'id':name,'t':t,'m':[.5,.5,.5],'scale':scale,'has':False,'src':''});continue
        im2=im.resize((size,size),Image.LANCZOS);buf=io.BytesIO();im2.save(buf,'WEBP',quality=quality,method=6);b=buf.getvalue();total+=len(b)
        layers.append({'id':name,'t':t,'m':linear_mean(np.asarray(im2).astype(np.float32)/255),'scale':scale,'has':True,
          'src':'data:image/webp;base64,'+base64.b64encode(b).decode('ascii'),'kb':len(b)/1024,'from':os.path.relpath(f,ROOT),'im':im2})
    return layers,total

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--size',default='auto');ap.add_argument('--quality',type=int,default=74)
    ap.add_argument('--budget',type=float,default=7.3);ap.add_argument('--preview',default='')
    o=ap.parse_args();prep=prepare()
    sizes=[1024,768] if o.size=='auto' else [int(o.size)]
    for size in sizes:
        layers,total=encode(prep,size,o.quality)
        js_mb=total*4/3/1048576
        print(f'{size} px: {sum(l["has"] for l in layers)} pictures, {total/1048576:.2f} MB of WebP, about {js_mb:.2f} MB in the page')
        if js_mb<=o.budget:break
    for l in layers:
        print(f'{l["id"]:14} T_{l["t"]:10} '+(f'{size}px {l["kb"]:6.0f} KB  {l["scale"]} m a tile  from {l["from"]}  mean {l["m"]}' if l['has'] else '(no picture: the procedural look, or its fallback)'))
    js='/* GENERATED by tools/pack_textures.py: do not edit by hand. The ground\'s photographs (the owner\'s texture packs,\n   from ../rut-access/textures/ and this folder\'s textures/), made seamless, flattened and packed; a layer a surface.\n   id: the file name; t: the shader\'s name for it (T_<t>, 13_lit.js); m: the mean colour in linear light; scale:\n   metres a tile; has: whether there is a picture (a layer without one keeps the procedural look). */\n'
    js+='const TEXPACK={size:%d,layers:[\n'%size
    js+=',\n'.join('{id:%s,t:%s,m:%s,scale:%s,has:%s,src:%s}'%(json.dumps(l['id']),json.dumps(l['t']),json.dumps(l['m']),json.dumps(l['scale']),'true' if l['has'] else 'false',json.dumps(l['src'])) for l in layers)
    js+='\n]};\n'
    with open(os.path.join(ROOT,'src','49_textures.js'),'w') as fh:fh.write(js)
    print(f'src/49_textures.js: {len(js)/1048576:.2f} MB at {size} px, WebP quality {o.quality}')
    if o.preview:
        from PIL import ImageDraw
        pv=[(l['id'],l['im']) for l in layers if l['has']];cols=6;rows=(len(pv)+cols-1)//cols
        sheet=Image.new('RGB',(cols*328+8,rows*346+8),(20,20,28));d=ImageDraw.Draw(sheet)
        for i,(n,im) in enumerate(pv):
            t=im.resize((160,160),Image.LANCZOS);tile=Image.new('RGB',(320,320));[tile.paste(t,(x,y)) for x in (0,160) for y in (0,160)]
            x=8+(i%cols)*328;y=8+(i//cols)*346;sheet.paste(tile,(x,y+18));d.text((x,y+2),n,fill=(230,230,240))
        sheet.save(o.preview);print('preview',o.preview)
if __name__=='__main__':main()
