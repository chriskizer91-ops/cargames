"""The Rock & Mud's model and chassis: pulls what the game knows about the build from the built game for the game sheet's spec page (tools/game_sheet.py).
   python3 tools/rm_specs.py   (after ./build.sh)"""
import json
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
P = 'file://' + os.path.join(HERE, '..', 'back-forty.html')
OUT = os.path.join(HERE, 'ref', 'rm_specs.json')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 480, 'height': 270})
    pg.add_init_script("localStorage.setItem('b40-gfx','mini');localStorage.setItem('b40-res','0');")
    pg.goto(P); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden", timeout=150000)
    pg.evaluate("__game.GAME.hold=true")
    r = pg.evaluate("""(()=>{const g=__game,rig=g.presetRig('crawler'),i=g.rigBuild('suv',rig),b=g.BUILDS[i],T=g.truck(i),D=T.D,s=g.specOf(i),k=1.15,
      f=g.rateRig('suv',rig),c=g.makeCar(i,new g.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9),null,k,1.15),cs=c.c;
      const pick=o=>Object.fromEntries(Object.entries(o||{}).filter(([q,v])=>typeof v==='number'||typeof v==='string'||typeof v==='boolean'));
      return JSON.stringify({look:pick(b.look),tyre:b.look.tyre,D:pick(D),B:pick(D.B),figs:f.figs,
        chassis:pick(cs),susp:pick(cs.susp),diff:pick(cs.diff),
        spec:{layout:s.layout,disp:s.disp,cyl:s.cyl,redline:s.redline,limiterRpm:s.limiterRpm,idle:s.idle,fi:s.fi,boost:s.boost,cam:s.cam,intake:s.intake,ex:s.ex,nos:s.nos,nosKw:s.nosKw,
          tq:s.tq,peak:s.peak,gears:s.gears,fd:s.fd,R:s.R,mass:s.mass,drv:s.drv,cdA:s.cdA,mu:s.mu,limiter:s.limiter,launch:s.launch,launchRpm:s.launchRpm,shiftT:s.shiftT,conv:s.conv,crackle:s.crackle},
        plusPeak:c.pt.e.peak,plusFd:c.pt.e.fd,mass:c.m});})()""")
    open(OUT,'w').write(r)
    d=json.loads(r)
    for k in ['figs','D','B','look','tyre','susp','diff']: print(k, json.dumps(d[k])[:900])
    print('chassis', json.dumps(d['chassis'])[:1200])
    print('spec', json.dumps(d['spec']))
    print('plus', d['plusPeak'], d['plusFd'], d['mass'])
    b.close()
