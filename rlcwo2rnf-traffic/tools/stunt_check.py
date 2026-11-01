"""Stunts on the salt, scripted: the car thrown into the air with a spin, a flip, a roll, a flat jump, dropped on its roof,
   a small hop. Prints what the feats made of each (LANDED, CLEAN, BAILED) and the HUD line. python3 tools/stunt_check.py"""
import sys,json
from playwright.sync_api import sync_playwright
import os
PAGE='file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','rlcwo2rnf-traffic.html')
JS=r"""async ([name,h,v,w,secs])=>{
const g=__game,t=g.GAME.car,F=g.Feats,C=g.WG.COURSE,x=C.x0+1000+Math.random()*300,z=0;
g.closeMenu();g.GAME.state='drive';g.placeCar(x,z,0);
for(let i=0;i<40;i++){g.GAME.state='drive';g.setTestInput({steer:0,thr:0,brk:1,hb:0,nos:false});g.step(1/60);const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);await new Promise(r=>setTimeout(r,5));}
F.bankNow();g.GAME.msgs.length=0;const log0=F.S.log.length;
t.p[1]+=h;t.v[0]=v[0];t.v[1]=v[1];t.v[2]=v[2];t.w[0]=w[0];t.w[1]=w[1];t.w[2]=w[2];
const seen=[];let hudMax='';
for(let i=0;i<secs*60;i++){g.GAME.state='drive';g.setTestInput({steer:0,thr:0,brk:i>30?.6:0,hb:0,nos:false});g.step(1/60);
  const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);
  for(const m of g.GAME.msgs)if(!seen.includes(m.t))seen.push(m.t);
  const hd=F.hud();if(hd.live.length)hudMax=hd.live[0][0];
  if(i%6===0)await new Promise(r=>setTimeout(r,2));}
return {name,msgs:seen,hud:hudMax,up:+t.M[4].toFixed(2),combo:F.S.combo&&F.S.combo.list,best:F.S.best.stunt&&F.S.best.stunt.label};}"""
CASES=[('yaw spin',6,[18,4,0],[0,11,0],7),('flip',7,[16,6,0],[0,0,6.5],12),('barrel roll',6,[18,5,0],[7,0,0],8),('big flat jump',4,[30,9,0],[0,0,0],7),('roof drop',3,[2,0,0],[9,0,0],8),('small hop',0.3,[15,2,0],[0,0,0],4)]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270});errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.add_init_script("localStorage.setItem('rt-gfx','mini');")
    pg.goto(PAGE);pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=90000)
    pg.evaluate("__game.GAME.hold=true")
    for c in CASES:
        try: print(json.dumps(pg.evaluate(JS,list(c))),flush=True)
        except Exception as e: print(c[0],'ERR',str(e)[:400])
    print('\n'.join(errs[:6]))
    b.close()
