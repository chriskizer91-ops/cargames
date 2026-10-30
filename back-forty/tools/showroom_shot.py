#!/usr/bin/env python3
"""Frames of the showroom: the opening screen (the shed), then the garage tab's turntable in each studio and with
   the hood up. python3 tools/showroom_shot.py [gfx] [outdir]"""
import sys, os, base64, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','back-forty.html')
lvl=sys.argv[1] if len(sys.argv)>1 else 'laptop'; out=sys.argv[2] if len(sys.argv)>2 else '/tmp'
errs=[]
def snap(pg,name,frames=3):
    for i in range(frames): pg.evaluate("__game.render(1/30)")
    d=pg.evaluate("__game.snap()"); f=os.path.join(out,f'show_{name}.png'); open(f,'wb').write(base64.b64decode(d.split(',')[1])); print('saved',f,pg.evaluate("__game.APP.tris"))
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720})
    pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    pg.add_init_script(f"localStorage.setItem('b40-gfx','{lvl}');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    pg.evaluate("__game.GAME.hold=true")
    snap(pg,'title',9)
    pg.evaluate("__game.showTab('garage')"); snap(pg,'garage_dark',8)
    pg.evaluate("__game.SHOW.stage='light'"); snap(pg,'garage_light',2)
    pg.evaluate("__game.SHOW.stage='dark';__game.SHOW.hood=true;__game.SHOW.hoodA=1;__game.showSetView('bay')"); snap(pg,'garage_bay',8)
    print(json.dumps(pg.evaluate("({title:__game.APP.title,tab:__game.MENU.tab,state:__game.GAME.state})")))
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
