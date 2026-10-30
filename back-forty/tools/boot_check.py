#!/usr/bin/env python3
"""Boot Back Forty headless, report page errors, the world's state, and save a frame.
   python3 tools/boot_check.py [gfx level] [seconds to drive] [out.png]"""
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','back-forty.html')
lvl=sys.argv[1] if len(sys.argv)>1 else 'phone'; secs=float(sys.argv[2]) if len(sys.argv)>2 else 0; out=sys.argv[3] if len(sys.argv)>3 else '/tmp/b40_boot.png'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720})
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.add_init_script(f"localStorage.setItem('b40-gfx','{lvl}');")
    t0=time.time();pg.goto(PAGE)
    pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=120000)
    print('booted in %.1fs'%(time.time()-t0))
    # the game opens on the showroom, which doesn't stream the world: close it to drive
    pg.evaluate("__game.closeMenu&&__game.closeMenu()")
    # wait for the ground under the car
    pg.wait_for_function("(()=>{const g=__game,t=g.GAME.car,c=g.WORLD.chunks.get(Math.floor(t.p[0]/128+4096)*8192+Math.floor(t.p[2]/128)+4096);return c&&c.H})()",timeout=120000)
    print('ground ready %.1fs'%(time.time()-t0))
    st=pg.evaluate("""(()=>{const g=__game,t=g.GAME.car;return {mode:g.WORLD.mode,chunks:g.WORLD.chunks.size,far:g.WORLD.far.size,p:[...t.p].map(v=>+v.toFixed(2)),
      gfx:g.GFX.level,ro:[...g.RO],place:g.GAME.place,car:g.APP.car}})()""")
    print(json.dumps(st))
    if secs>0:
        pg.evaluate("__game.closeMenu&&__game.closeMenu()")
        pg.wait_for_timeout(int(secs*1000))
    pg.evaluate("__game.GAME.hold=true")
    for i in range(3): pg.evaluate("__game.render(1/60)")
    d=pg.evaluate("__game.snap()")
    open(out,'wb').write(base64.b64decode(d.split(',')[1])); print('saved',out)
    st=pg.evaluate("""(()=>{const g=__game,t=g.GAME.car;return {chunks:g.WORLD.chunks.size,far:g.WORLD.far.size,tris:g.APP.tris,stat:g.RANCH.stat,holes:g.WORLD.st.holes,p:[...t.p].map(v=>+v.toFixed(2))}})()""")
    print(json.dumps(st))
    b.close()
print('\n'.join(errs[:30]) or 'no errors')
