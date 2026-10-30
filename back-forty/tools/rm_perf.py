"""The Rock & Mud+'s acceleration, braking and shift points: pulls measured runs on flat tarmac (Realistic, the dev panel's fit, as the sheet) from the built game for the game sheet's spec page (tools/game_sheet.py).
   python3 tools/rm_perf.py   (after ./build.sh)"""
import json
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
P = 'file://' + os.path.join(HERE, '..', 'back-forty.html')
OUT = os.path.join(HERE, 'ref', 'rm_perf.json')
JS = r"""((plus,level)=>{const g=__game,i=g.BUILDS.findIndex(b=>b.id==='crawler');
  const flat=()=>new g.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9);
  const mk=()=>{const v=g.makeCar(i,flat(),null,plus,plus||1);v.setAssists(level);if(level!=='middle')g.devFit(v);v.place([0,0,0],0);v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;
    const z={thr:0,brk:0};for(let k=0;k<480;k++)v.step(1/240,z);v.v.fill(0);v.w.fill(0);return v;};
  const DT=1/240,marks=[30,60,100,130,150,200,250].map(m=>[m,m/2.23694]),T={},go={thr:1,steer:0,brk:0};
  let v=mk(),t=0,d=0,top=0,topT=0,q=null,h=null,mile=null,shifts=[],lastG=v.pt.gear,maxG=0;
  for(;t<150;t+=DT){v.step(DT,go);const s=v.speed;d+=s*DT;for(const [m,ms] of marks)if(T[m]==null&&s>=ms)T[m]=+t.toFixed(2);
    if(v.pt.gear!==lastG){shifts.push([v.pt.gear,+(s*2.23694).toFixed(1),Math.round(v.pt.rpm)]);lastG=v.pt.gear;}
    if(q==null&&d>=402.34)q=[+t.toFixed(2),+(s*2.23694).toFixed(1)];if(h==null&&d>=804.67)h=[+t.toFixed(2),+(s*2.23694).toFixed(1)];if(mile==null&&d>=1609.34)mile=[+t.toFixed(2),+(s*2.23694).toFixed(1)];
    if(s>top+.01){top=s;topT=t;}if(t-topT>8)break;}
  const res={i,T,q,h,mile,top:+(top*2.23694).toFixed(1),rpmTop:Math.round(v.pt.rpm),gearTop:v.pt.gear,shifts,dist:Math.round(d)};
  /* braking: get to just over the speed, then lift and brake hard in a straight line */
  for(const mph of [60,100]){const w=mk(),ms=mph/2.23694;let tt=0;for(;tt<40&&w.speed<ms;tt+=DT)w.step(DT,go);
    let bd=0,bt=0,peak=0;const br={thr:0,steer:0,brk:1};const v0=w.speed;for(;bt<30&&w.speed>.05;bt+=DT){const s0=w.speed;w.step(DT,br);bd+=w.speed*DT;peak=Math.max(peak,(s0-w.speed)/DT);}
    res['brake'+mph]={ft:+(bd*3.28084*ms/v0*ms/v0).toFixed(0),m:+(bd*(ms/v0)**2).toFixed(1),s:+bt.toFixed(2),peakG:+(peak/9.81).toFixed(2),v0:+(v0*2.23694).toFixed(1)};}
  return JSON.stringify(res);})"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 480, 'height': 270})
    pg.add_init_script("localStorage.setItem('b40-gfx','mini');localStorage.setItem('b40-res','0');")
    pg.goto(P); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden", timeout=150000)
    pg.evaluate("__game.GAME.hold=true")
    out = {}
    for name, plus in (('built', 0), ('plus', 1.15)):
        out[name] = json.loads(pg.evaluate(JS + f"({plus},'real')"))
        print(name, json.dumps(out[name]))
    json.dump(out, open(OUT, 'w'))
    b.close()
