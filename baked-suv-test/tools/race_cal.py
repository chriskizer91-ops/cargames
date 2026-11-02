"""Robots alone on a race course: on the physics and riding the line (kinematic), lap times side by side.
   python3 tools/race_cal.py course[,course] build[,build] [laps]"""
import sys,json
from playwright.sync_api import sync_playwright
import os
PAGE='file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','baked-suv-test.html')
courses=sys.argv[1].split(','); bids=sys.argv[2].split(','); laps=int(sys.argv[3]) if len(sys.argv)>3 else 2
JS=r"""([course,bid,laps])=>{
const g=__game,t0=performance.now(),L=g.raceLine(course),tl=performance.now()-t0,i=g.BUILDS.findIndex(b=>b.id===bid);
const out={course,bid,n:L.n,len:Math.round(L.len),buildMs:Math.round(tl)};
let pace=null;for(const kin of [false,true]){
  const o=g.raceCar({i},L,{skill:.9,name:'x',react:0}),d=o.drv,s0=L.len-10,[x,z]=L.at(s0,0),[x2,z2]=L.at(s0+3,0);
  o.car.place([x,g.RANCH.W.heightAt(x,z)+.05,z],Math.atan2(-(z2-z),x2-x));g.raceSettle(o);d.go=true;d.i=-1;d.track();
  if(kin){d.pace=pace;d.toKin();}
  let t=0,lapT=[],last=d.lap,lt0=0,resets=0,top=0,stepMs=0;const others=[d];
  while(t<laps*400&&lapT.length<laps+1){
    const a=performance.now();
    if(kin)d.ride(1/60,others);else{d.drive(1/60,others);for(let k=0;k<4;k++)o.car.step(1/240,d.inp);d.track();
      if(d.resetReq){resets++;const [x,z,yaw]=d.resetPose(8);o.car.place([x,g.RANCH.W.heightAt(x,z)+.05,z],yaw);g.raceSettle(o);d.i=-1;d.track();}}
    stepMs+=performance.now()-a;t+=1/60;top=Math.max(top,kin?d.kv:o.car.speed);
    if(d.lap>last){lapT.push(+(t-lt0).toFixed(2));lt0=t;last=d.lap;}}
  if(!kin)pace=d.pace;out[kin?'kin':'phys']={laps:lapT.slice(1),first:lapT[0],resets,top:Math.round(top*2.237),msPerSec:+(stepMs/t).toFixed(2),pace:+d.pace.toFixed(3)};}
return out;}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270});errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.add_init_script("localStorage.setItem('bst-gfx','mini');")
    pg.goto(PAGE);pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=90000)
    pg.evaluate("__game.GAME.hold=true")
    for c in courses:
        for bid in bids:
            try: print(json.dumps(pg.evaluate(JS,[c,bid,laps])),flush=True)
            except Exception as e: print(c,bid,'ERR',str(e)[:400])
    print('\n'.join(errs[:6]))
    b.close()
