#!/usr/bin/env python3
"""Every machine (and the stock SUV for scale) on Route 6, no drawing: 5 s idle at rest (no creep), then 20 s flat out.
   Top speed, revs, gears, the gear it pulled away in, CVT revs, governors, NaNs. python3 tools/machine_check.py"""
import os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','city-and-country.html')
JS=r"""async ()=>{const g=__game,out=[];g.GAME.hold=true;g.closeMenu();await new Promise(r=>setTimeout(r,500));
for(const car of ['suv','quad90','quad450','quadUtil','sxs','golf','kart','tractor','semi']){
  g.APP.car=car;g.spawnRig(false);g.goTo('r6e');const t=g.GAME.car,pt=t.pt,e=pt.e;pt.start();
  for(let f=0;f<240;f++){g.GAME.state='drive';g.setTestInput({steer:0,thr:0,brk:0,hb:0,nos:false});g.step(1/60);}
  const creep=t.speed;g.setTestInput({steer:0,thr:1,brk:0,hb:0,nos:false});
  let top=0,rmax=0,rmin=1e9,nan=false,g0=null,gmax=0,t30=null;
  for(let f=0;f<1200;f++){g.GAME.state='drive';g.step(1/60);if(!t.p.every(Number.isFinite)){nan=true;break;}
    if(g0===null&&t.speed>.5)g0=pt.gear;top=Math.max(top,t.speed);gmax=Math.max(gmax,pt.gear);
    if(f>120){rmax=Math.max(rmax,pt.rpm);rmin=Math.min(rmin,pt.rpm);}if(!t30&&t.speed*2.237>=30)t30=+(f/60).toFixed(1);}
  out.push({car,name:t.build.name,engine:e.name||'',creep_mph:+(creep*2.237).toFixed(2),pulled_away_in:g0,top_gear:gmax,top_mph:+(top*2.237).toFixed(1),
    zero_30_s:t30,rpm_range:[Math.round(rmin),Math.round(rmax)],redline:Math.round(e.redline),cvt:e.cvt?[Math.round(e.cvt.eng),Math.round(e.cvt.top)]:null,gov_mph:t.build.gov?+(t.build.gov*2.237).toFixed(1):null,nan,
    tris:g.truck(t.bi).tris});}
g.APP.car='suv';g.spawnRig(false);return out;}"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270}); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('cc-gfx','mini');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    for r in pg.evaluate(JS): print(json.dumps(r))
    b.close()
print(errs[:5] or 'no page errors')
