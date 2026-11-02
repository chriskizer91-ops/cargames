"""Whole races headless: the player's car driven by a robot of its own through the game's own step (lights, the
   robots on and off the physics, laps, the flag, the results). python3 tools/race_run.py ids [car[:preset]] [diff] [skill]"""
import sys,json
from playwright.sync_api import sync_playwright
import os
PAGE='file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','baked-suv-test.html')
ids=sys.argv[1].split(','); car=sys.argv[2] if len(sys.argv)>2 else ''; diff=sys.argv[3] if len(sys.argv)>3 else 'medium'; skill=float(sys.argv[4]) if len(sys.argv)>4 else .9
REND=int(os.environ.get('RENDER','0'))   # render every this many frames (0: never), to run the drawing too
JS=r"""async ([id,car,diff,skill,REND])=>{
const g=__game,FR=60;
if(car){const [cr,pr]=car.split(':');g.APP.car=cr;if(pr)g.RIGS[cr]=g.presetRig(pr);g.spawnRig(false);}
g.closeMenu&&g.closeMenu();g.GAME.state='drive';g.RACE.diff=diff;
const t0=performance.now();g.startRace(id);const startMs=performance.now()-t0;
const R=g.RACE,t=g.GAME.car;let pd=null,f=0,ms=0,mx=0,mxr=0,msr=0,fr=0,phys=[0,0,0,0,0,0,0],nan=0,frames=0,kinSw=0,last={};
for(;f<FR*1500;f++){
  if(R.state==='done'||!R.on)break;
  g.GAME.state='drive';
  if(R.state!=='grid'&&!pd){pd=new g.Driver(t,R.me.line,{skill,react:0});pd.go=true;pd.track();}
  if(pd){const others=R.cars.filter(c=>!c.me).map(c=>c.drv);pd.drive(1/FR,others);if(pd.resetReq){g.setTestInput(Object.assign({},pd.inp,{reset:true}));pd.resetReq=false;pd.stuckT=pd.flipT=pd.offT=pd.wrongT=0;}else g.setTestInput(pd.inp);}
  else g.setTestInput({steer:0,thr:0,brk:1,hb:0,nos:false});
  const a=performance.now();g.step(1/FR);const d=performance.now()-a;ms+=d;if(R.state!=='grid'){mxr=Math.max(mxr,d);msr+=d;fr++;}mx=Math.max(mx,d);frames++;
  if(REND&&f%REND===0)g.render(1/FR);else{const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);}
  if(f%4===0)await new Promise(r=>setTimeout(r,0));
  let np=0;for(const c of R.cars){if(c.me)continue;if(!c.drv.kin)np++;if(last[c.name]!==undefined&&last[c.name]!==c.drv.kin)kinSw++;last[c.name]=c.drv.kin;if(!c.car.p.every(Number.isFinite))nan++;}phys[np]++;
}
const res=R.res;
const out={id,diff,startMs:Math.round(startMs),frames,secs:+(frames/FR).toFixed(1),msPerFrame:+(ms/frames).toFixed(2),maxFrameMs:Math.round(mx),racingMsPerFrame:+(msr/Math.max(1,fr)).toFixed(2),racingMaxMs:Math.round(mxr),physHist:phys.map(x=>+(x/frames).toFixed(2)),kinSwitches:kinSw,nan,
  place:res&&res.place,prize:res&&res.prize,rows:res&&res.rows.map(r=>r.name+' | '+r.car+' | '+r.time+(r.sub?' | '+r.sub:'')),
  paces:R.cars.filter(c=>!c.me).map(c=>c.name+' '+c.drv.pace.toFixed(2)),full:Object.keys(g.TRUCK).join(' '),coarse:Object.keys(g.TRUCKF).join(' ')};
if(g.GAME.state==='results')g.hideResults();else g.raceEnd(null);
return out;}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270});errs=[]
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m: errs.append(m.type+' '+m.text[:300]) if m.type in('error',) else None)
    pg.add_init_script("localStorage.setItem('bst-gfx','mini');")
    pg.goto(PAGE);pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=90000)
    pg.evaluate("__game.GAME.hold=true")
    for i in ids:
        try:
            r=pg.evaluate(JS,[i,car,diff,skill,REND])
            rows=r.pop('rows') or []
            print(json.dumps(r),flush=True)
            for x in rows: print('   ',x)
        except Exception as e: print(i,'ERR',str(e)[:600],flush=True)
    print('\n'.join(errs[:8]))
    b.close()
