#!/usr/bin/env python3
"""Drive the off-road park's circuits headless (no drawing), a simple pursuit of each track's centreline at
   what its bends allow, and a run down the drag strip. Checks: no NaNs, the ground ready, no steps in the
   ground under the car, the lap clock and the drag slip working, the jumps flown.
   python3 tools/park_drive.py [tracks: oval,short,mud,strip] [laps] [car]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','city-and-country.html')
tracks=(sys.argv[1] if len(sys.argv)>1 else 'oval,short,mud,strip').split(','); laps=int(sys.argv[2]) if len(sys.argv)>2 else 2; car=sys.argv[3] if len(sys.argv)>3 else ''; vcap=float(sys.argv[4]) if len(sys.argv)>4 else 0
JS=r"""async ([id,laps,car,vcap])=>{
const g=__game,K=g.WG.PKW,FR=60;g.GAME.hold=true;if(car){g.APP.car=car;g.spawnRig(false);}
g.closeMenu&&g.closeMenu();g.goTo(id);const t=g.GAME.car;t.pt.start();
const W=g.WORLD,S=W.st,miss0=S.missT;
const settle=async n=>{for(let f=0;f<n;f++){g.GAME.state='drive';g.setTestInput({steer:0,thr:0,brk:1,hb:0,nos:false});g.step(1/FR);const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);if(f%4===0)await new Promise(r=>setTimeout(r,0));}};
await settle(90);
let nan=0,maxStep=0,maxAt=null,prevY=null,prevP=null,top=0,air=0,airMax=0,off=0,frames=0;
const mon=()=>{if(!t.p.every(Number.isFinite)||!t.v.every(Number.isFinite)){nan++;return false;}
  const gy=g.RANCH.W.heightAt(t.p[0],t.p[2]);if(prevP){const d=Math.hypot(t.p[0]-prevP[0],t.p[2]-prevP[1]),dy=Math.abs(gy-prevY)-.35*d;if(dy>maxStep){maxStep=dy;maxAt=[+t.p[0].toFixed(1),+t.p[2].toFixed(1)];}}
  prevY=gy;prevP=[t.p[0],t.p[2]];top=Math.max(top,t.speed);
  const ong=t.wheels.some(w=>w.contact||w.onGround||w.load>0);const h=t.p[1]-gy;if(h>1.6){air+=1/FR;}else{airMax=Math.max(airMax,air);air=0;}
  frames++;return true;};
if(id==='strip'){
  /* stage: nose to the line, stop; off the gas until green; flat out */
  const St=K.ST;let staged=false;
  for(let f=0;f<FR*30;f++){g.GAME.state='drive';const D=g.PARKT.dr;let inp={steer:0,thr:0,brk:0,hb:0,nos:false};
    if(D.st===''){const M=t.M,F=[M[0],M[3],M[6]];const front=t.p[0]+F[0]*2.3;inp=front<St.start-.6?{steer:0,thr:.12,brk:0,hb:0,nos:false}:{steer:0,thr:0,brk:1,hb:0,nos:false};}
    else if(D.st==='tree'){inp={steer:0,thr:0,brk:0,hb:0,nos:false};staged=true;}
    else if(D.st==='run')inp={steer:0,thr:1,brk:0,hb:0,nos:false};
    else if(D.st==='done')break;
    g.setTestInput(inp);g.step(1/FR);const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);if(!mon())break;if(f%3===0)await new Promise(r=>setTimeout(r,0));}
  return {id,staged,slip:g.PARKT.dr.slip,st:g.PARKT.dr.st,nan,worst_ground_step_m:+maxStep.toFixed(3),at:maxAt,top_mph:Math.round(top*2.237),ground_not_ready_frames:S.missT-miss0};}
const T=K.TRACKS.find(q=>q.id===id),P=T.P,L=P.len,A={},N={};let lapsDone=0,lapT=[],steps=0,maxOff=0,firstOff=null,trace=[];
const want=laps;
for(let f=0;f<FR*60*6;f++){g.GAME.state='drive';
  const n=K.near(P,t.p[0],t.p[2],N),v=t.speed,ld=Math.max(10,Math.min(32,v*1.0));
  K.at(P,n.s+ld,A);const tx=A.x,tz=A.z,Fm=g.GAME.car.M,F=[Fm[0],Fm[3],Fm[6]],fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl;
  const ax=tx-t.p[0],az=tz-t.p[2],dl=Math.hypot(ax,az)||1,al=Math.atan2((ax*-fz+az*fx)/dl,(ax*fx+az*fz)/dl),c=t.c;
  const del=Math.atan(2*c.wb*Math.sin(al)/ld),lim=Math.min(c.lock,.6);let steer=Math.max(-1,Math.min(1,del/lim));
  /* how fast: what the bends ahead allow on loose ground */
  let vs=40;for(const d of [5,15,30,50,75]){const k=Math.abs(K.kAvg(P,n.s+d,8));if(k>1e-4)vs=Math.min(vs,Math.sqrt(5.2/k)+d*.18);}
  if(id==='mud')vs=Math.min(vs,15);if(id==='short')vs=Math.min(vs,24);if(vcap)vs=Math.min(vs,vcap);
  const thr=v<vs-1?1:v<vs+1?.35:0,brk=v>vs+3?Math.min(.8,(v-vs)/8):0;
  g.setTestInput({steer,thr,brk,hb:0,nos:false});g.step(1/FR);
  const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);
  if(!mon())break;maxOff=Math.max(maxOff,n.d);if(n.d>T.hw+3){off++;if(!firstOff)firstOff={s:+n.s.toFixed(0),x:+t.p[0].toFixed(0),z:+t.p[2].toFixed(0),v:+v.toFixed(1),up:+t.M[4].toFixed(2)};}
  if(f%600===0)trace.push([f/FR,+n.s.toFixed(0),+v.toFixed(1),+n.off.toFixed(1),g.PARKT.on?g.PARKT.on.id:'-',g.PARKT.cp]);
  const last=g.PARKT.last;if(last&&last.id===id&&(!lapT.length||lapT[lapT.length-1]!==last.t)){lapT.push(last.t);if(lapT.length>=want)break;}
  if(f%3===0)await new Promise(r=>setTimeout(r,0));}
return {id,trace,firstOff,len:+L.toFixed(0),laps:lapT.map(v=>+v.toFixed(2)),nan,frames,off_track_frames:off,max_off_m:+maxOff.toFixed(1),top_mph:Math.round(top*2.237),
  longest_air_s:+airMax.toFixed(2),worst_ground_step_m:+maxStep.toFixed(3),at:maxAt,ground_not_ready_frames:S.missT-miss0};}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('cc-gfx','mini');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    for tr in tracks:
        print(json.dumps(pg.evaluate(JS,[tr,laps,car,vcap])),flush=True)
    print('\n'.join(errs[:10]) or 'no page errors')
    b.close()
