#!/usr/bin/env python3
"""Drive Back Forty headless without drawing: the world asked for and the origin moved as the frame would, the car
   held on Route 6 by the cruise control, flat out. Checks: no NaNs, the car's ground ready every frame, the ground
   under the car continuous (no steps at the chunk seams), the chunk grid and the point-by-point ground agreeing.
   python3 tools/drive_check.py [place] [seconds] [car]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','back-forty.html')
place=sys.argv[1] if len(sys.argv)>1 else 'r6e'; secs=float(sys.argv[2]) if len(sys.argv)>2 else 90; car=sys.argv[3] if len(sys.argv)>3 else ''
JS=r"""async ([place,secs,car])=>{
const g=__game;g.GAME.hold=true;if(car){g.APP.car=car;g.spawnRig(false);}
g.closeMenu&&g.closeMenu();g.goTo(place);const t=g.GAME.car;t.pt.start();
await new Promise(r=>setTimeout(r,1500));
g.DEVW.cruise='max';g.CRUISE.on=true;g.CRUISE.line=null;g.setTestInput({steer:0,thr:1,brk:0,hb:0,nos:false});
const W=g.WORLD,S=W.st,FR=60;let nan=0,maxStep=0,maxStepAt=null,prevY=null,prevP=null,top=0,shifts=0,dist=0,miss0=S.missT,roCh=0,lastRO=[...g.RO];
for(let f=0;f<secs*FR;f++){
  g.GAME.state='drive';g.step(1/FR);
  const eye=[t.p[0]-8,t.p[1]+3,t.p[2]];g.worldUpdate(eye,t);if(g.setOrigin(eye))roCh++;
  if(!t.p.every(Number.isFinite)||!t.v.every(Number.isFinite)){nan++;break;}
  const gy=g.RANCH.W.heightAt(t.p[0],t.p[2]);
  if(prevP){const d=Math.hypot(t.p[0]-prevP[0],t.p[2]-prevP[1]);dist+=d;
    /* a step in the ground beyond what a 25 % grade over that distance allows */
    const dy=Math.abs(gy-prevY)-.25*d;if(dy>maxStep){maxStep=dy;maxStepAt=[+t.p[0].toFixed(1),+t.p[2].toFixed(1)];}}
  prevY=gy;prevP=[t.p[0],t.p[2]];top=Math.max(top,t.speed);
  if(f%2===0)await new Promise(r=>setTimeout(r,0));
  if(!g.CRUISE.on)break;}
/* the chunk grid against the point-by-point answer, at random spots round the car */
let worst=0;for(let i=0;i<400;i++){const x=t.p[0]+(Math.random()-.5)*300,z=t.p[2]+(Math.random()-.5)*300;
  const a=g.RANCH.W.heightAt(x,z),b=g.WG.sample(x,z,{}).h;worst=Math.max(worst,Math.abs(a-b));}
return {place,secs,cruise:g.CRUISE.on,miles:+(dist/1609.34).toFixed(2),top_mph:Math.round(top*2.237),nan,
  ground_not_ready_frames:S.missT-miss0,worst_ground_step_m:+maxStep.toFixed(3),at:maxStepAt,origin_moves:roCh,
  grid_vs_exact_terrain_m:+worst.toFixed(3),chunks:W.chunks.size,mode:W.mode,gear:t.pt.gear,rpm:Math.round(t.pt.rpm)};}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('b40-gfx','mini');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    print(json.dumps(pg.evaluate(JS,[place,secs,car])))
    print('\n'.join(errs[:10]) or 'no page errors')
    b.close()
