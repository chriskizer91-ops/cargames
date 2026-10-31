#!/usr/bin/env python3
"""Frames of the drag engines: a car with one in the garage (turntable and hood up, the bay's own engine) and on the
   road (the blower and its hat through the hood). python3 tools/drag_shot.py [car] [engine] [gfx] [outdir]"""
import sys, os, base64, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','redline-county-drag.html')
car=sys.argv[1] if len(sys.argv)>1 else 'suv'; eng=sys.argv[2] if len(sys.argv)>2 else 'tf500'
lvl=sys.argv[3] if len(sys.argv)>3 else 'laptop'; out=sys.argv[4] if len(sys.argv)>4 else '/tmp'
errs=[]
def snap(pg,name,frames=3):
    for i in range(frames): pg.evaluate("__game.render(1/30)")
    d=pg.evaluate("__game.snap()"); f=os.path.join(out,f'drag_{car}_{eng}_{name}.png'); open(f,'wb').write(base64.b64decode(d.split(',')[1])); print('saved',f)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720})
    pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    pg.add_init_script(f"localStorage.setItem('cc-gfx','{lvl}');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    pg.evaluate("__game.GAME.hold=true")
    info=pg.evaluate("""([car,eng])=>{const g=__game,P=g.parts;
      const base={suv:'sleeper',pickup:'prerunner',muscle:'muscleDrag',trail:'trailRig'}[car];let rig=g.presetRig(base);
      for(const [s,v] of [['engine',eng],['power',(P.ENGINES[eng].powers||['none'])[0]],['intake',2],['exhaust','zoomies'],['tune',2]]){rig[s]=v;rig=P.fixRig(car,rig);}
      g.APP.car=car;g.RIGS[car]=rig;g.spawnRig();return {bi:g.APP.bi,id:g.BUILDS[g.APP.bi].id,out:!!g.BUILDS[g.APP.bi].look.engineOut};}""",[car,eng])
    print(json.dumps(info))
    pg.evaluate("__game.showTab('garage')"); snap(pg,'garage',8)
    pg.evaluate("__game.SHOW.hood=true;__game.SHOW.hoodA=1;__game.showSetView('bay')"); snap(pg,'bay',8)
    pg.evaluate("__game.SHOW.hood=false;__game.SHOW.hoodA=0;__game.showSetView('front34')"); snap(pg,'front34',8)
    pg.evaluate("__game.closeMenu&&__game.closeMenu()")
    pg.wait_for_function("(()=>{const g=__game,t=g.GAME.car,c=g.WORLD.chunks.get(Math.floor(t.p[0]/128+4096)*8192+Math.floor(t.p[2]/128)+4096);return c&&c.H})()",timeout=180000)
    snap(pg,'road',6)
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
