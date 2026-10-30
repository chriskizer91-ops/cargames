#!/usr/bin/env python3
"""A frame from a place in Back Forty. python3 tools/shot.py PLACE OUT.png [gfx] [wait s] [tod] [cam]"""
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','city-and-country.html')
place=sys.argv[1]; out=sys.argv[2]; lvl=sys.argv[3] if len(sys.argv)>3 else 'phone'; wait=float(sys.argv[4]) if len(sys.argv)>4 else 8
tod=sys.argv[5] if len(sys.argv)>5 else ''; disp=sys.argv[6] if len(sys.argv)>6 else ''
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720})
    pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    init=f"localStorage.setItem('cc-gfx','{lvl}');"
    if disp: init+=f"localStorage.setItem('cc-disp','{disp}');"
    pg.add_init_script(init)
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    if tod: pg.evaluate(f"__game.applyTod('{tod}')")
    pg.evaluate(f"__game.closeMenu&&__game.closeMenu();__game.goTo('{place}')")
    pg.wait_for_function("(()=>{const g=__game,t=g.GAME.car,c=g.WORLD.chunks.get(Math.floor(t.p[0]/128+4096)*8192+Math.floor(t.p[2]/128)+4096);return c&&c.H&&c.st})()",timeout=180000)
    pg.evaluate("__game.placeCar(__game.GAME.car.p[0],__game.GAME.car.p[2],Math.atan2(-__game.GAME.car.M[6],__game.GAME.car.M[0]))")
    pg.wait_for_timeout(int(wait*1000))
    pg.evaluate("__game.GAME.hold=true")
    for i in range(3): pg.evaluate("__game.render(1/60)")
    d=pg.evaluate("__game.snap()"); open(out,'wb').write(base64.b64decode(d.split(',')[1]))
    print(json.dumps(pg.evaluate("""(()=>{const g=__game,t=g.GAME.car;return {p:[...t.p].map(v=>+v.toFixed(2)),ro:[...g.RO],place:g.GAME.place,tris:g.APP.tris,holes:g.WORLD.st.holes,chunks:g.WORLD.chunks.size,stat:g.RANCH.stat}})()""")))
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
