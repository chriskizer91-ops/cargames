#!/usr/bin/env python3
"""Drive the challenges headless with a robot (a pursuit of each route at what its bends allow), through the game's
   own run (60_chal's ChalRun via chalStart): the countdown, the gates, laps, the trap, the mile, the flight off the
   ramp. Prints each run's result and medal, and with --pars the numbers for CH_PARS (the stock SUV and a build).
   python3 tools/chal_drive.py [ids, comma separated, or all] [car rig id, e.g. suv or hatch:groupB] [speed cap m/s]
   python3 tools/chal_drive.py list        (just the list: lengths, gates, medals, where each starts)
   python3 tools/chal_drive.py pars [ids]  (the stock SUV and each challenge's own build: the CH_PARS lines for 60_chal)"""
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','rlcwo2rnf-traffic.html')
PARS=len(sys.argv)>1 and sys.argv[1]=='pars'
if PARS: sys.argv.pop(1)
ids=sys.argv[1] if len(sys.argv)>1 else 'all'; car=sys.argv[2] if len(sys.argv)>2 else ''; vcap=float(sys.argv[3]) if len(sys.argv)>3 else 0
BEST={'coupeGT':'coupe','sleeper':'suv','hatchB':'hatch','wedgeNR':'wedge','crawler':'suv','muscleDrag':'muscle','hyperTrack':'hyper','prerunner':'pickup','trailRig':'trail'}
LIST=r"""()=>{const g=__game;return g.CHALS.map(c=>{const s=g.WG.sample(c.start.x,c.start.z,{});
  return {id:c.id,kind:c.kind,len:Math.round(c.len),gates:c.gates?c.gates.length:0,medals:c.medals,limit:c.limit,start:[Math.round(c.start.x),Math.round(c.start.z),+c.start.yaw.toFixed(2)],code:s.code,place:g.placeName?g.placeName(c.start.x,c.start.z):''};});}"""
JS=r"""async ([id,car,vcap])=>{
const g=__game,FR=60,c=g.CHALS.find(q=>q.id===id);if(!c)return {id,err:'no such challenge'};
if(car){const [cr,pr]=car.split(':');g.APP.car=cr;if(pr&&g.RIGS)g.RIGS[cr]=g.presetRig(pr);g.spawnRig(false);}
g.closeMenu&&g.closeMenu();g.GAME.state='drive';
g.chalStart(c);const t=g.GAME.car;t.pt.start();const r=g.CHAL.run,W=g.WORLD,S=W.st,miss0=S.missT;
/* let the world load round the start, held on the brakes in the countdown */
r.cd=1e9;for(let f=0;f<90;f++){g.GAME.state='drive';g.setTestInput({steer:0,thr:0,brk:1,hb:0,nos:false});g.step(1/FR);const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);if(f%4===0)await new Promise(q=>setTimeout(q,0));}
r.cd=.5;
if(c.kind==='drift'||c.kind==='air')return {id,skip:c.kind+' (scored by a person)'};
/* the robot keeps to the challenge's lane (the boulevard's median is on the route's centre line) */
const P0=c.route,n=P0.length,closed=!!c.closed,ln=c.lane||0,P=P0.map((p,i)=>{const a=P0[Math.max(0,i-1)],b=P0[Math.min(n-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return [p[0]-dz/l*ln,p[1]+dx/l*ln];}),cum=[0];for(let i=1;i<n;i++)cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
const at=i=>P[closed?((i%n)+n)%n:Math.max(0,Math.min(n-1,i))];
/* curvature over a span */
const kAt=i=>{const a=at(i-4),b=at(i),d=at(i+4),ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-b[0],vz=d[1]-b[1],la=Math.hypot(ux,uz)||1,lb=Math.hypot(vx,vz)||1;
  const cr=(ux*vz-uz*vx)/(la*lb),ang=Math.asin(Math.max(-1,Math.min(1,cr)));return ang/((la+lb)/2);};
const ds=cum[1]||2,straight=['drag','trap','mile','jump','stop'].includes(c.kind);
/* the robot's settings for the ground: how hard it corners (m/s2) and any cap */
const RB={loop:[5.5],dash:[6],ridge:[5],wash:[4.5],loopN:[4.5,26],loopLap:[4.5,26],bog:[4,14],oval:[5.2],short:[5.2,24],mudtrack:[3.2,15]}[id]||[6.5];
let idx=0,top=0,nan=0,frames=0,maxOff=0,flips=0,trace=[];
const grip=RB[0];
for(let f=0;f<FR*(c.limit+15);f++){g.GAME.state='drive';
  /* nearest point on the route, searched forward from the last */
  let best=1e18,bi=idx;for(let k=-5;k<60;k++){const i=idx+k,p=at(i),d=(p[0]-t.p[0])**2+(p[1]-t.p[2])**2;if(d<best){best=d;bi=i;}}idx=closed?bi:Math.max(0,Math.min(n-1,bi));
  const v=t.speed,ld=Math.max(8,Math.min(40,v*1.05)),tg=at(idx+Math.round(ld/ds));
  const M=t.M,F=[M[0],M[3],M[6]],fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl,ax=tg[0]-t.p[0],az=tg[1]-t.p[2],dl=Math.hypot(ax,az)||1;
  const al=Math.atan2((ax*-fz+az*fx)/dl,(ax*fx+az*fz)/dl),cc=t.c,del=Math.atan(2*cc.wb*Math.sin(al)/ld),lim=Math.min(cc.lock,.6);
  let steer=Math.max(-1,Math.min(1,del/lim)),vs=200;
  /* what the bends ahead allow, and the braking to get down to it (6 m/s2) */
  if(!straight)for(const d of [6,16,30,50,80,120,180,260,360,480,620,780,950]){const k=Math.abs(kAt(idx+Math.round(d/ds)));if(k>1e-4){const vk=Math.sqrt(grip/k);vs=Math.min(vs,d<=120?vk+d*.16:Math.sqrt(vk*vk+2*6*d));}}
  if(vcap)vs=Math.min(vs,vcap);if(RB[1])vs=Math.min(vs,RB[1]);
  let thr=v<vs-1?1:v<vs+1?.4:0,brk=v>vs+3?Math.min(.9,(v-vs)/8):0;if(c.kind==='stop'&&r.reached!=null){thr=0;brk=1;}
  g.setTestInput({steer,thr,brk,hb:0,nos:straight});g.step(1/FR);
  const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);frames++;
  if(!t.p.every(Number.isFinite)){nan++;break;}top=Math.max(top,t.speed);maxOff=Math.max(maxOff,Math.sqrt(best));
  if(t.M[4]<.2&&t.speed<2){flips++;g.resetCar();}
  if(f%(FR*5)===0)trace.push([Math.round(f/FR),idx,+v.toFixed(1),r.gi,r.lap,Math.round(t.p[0]),Math.round(t.p[2]),+t.M[4].toFixed(2)]);
  if(r.phase==='done'||g.GAME.state==='cres')break;
  if(f%3===0)await new Promise(q=>setTimeout(q,0));}
const res={id,kind:c.kind,car:car||'current',phase:r.phase,value:r.value==null?null:+r.value.toFixed(2),shown:g.chFmt(c,r.value),medal:r.medal,failed:r.failed,medals:c.medals,
  t:+r.t.toFixed(2),gate:r.gi+'/'+(c.gates?c.gates.length:0),lap:r.lap,top_mph:Math.round(top*2.237),max_off_m:+maxOff.toFixed(1),flips,nan,ground_not_ready:S.missT-miss0,trace};
g.closeChalResult&&g.closeChalResult(true);g.CHAL.run=null;return res;}"""
BESTOF=r"""()=>Object.fromEntries(__game.CHALS.map(c=>[c.id,[c.best||'',c.better]]))"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':480,'height':270}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('rt-gfx','mini');localStorage.setItem('rt-fchal','{}');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    if PARS:
        bo=pg.evaluate(BESTOF); want=list(bo) if ids=='all' else ids.split(',')
        for i in want:
            best,better=bo[i]
            if not best: continue
            a=pg.evaluate(JS,[i,'suv:stock',0]); bcar=BEST.get(best,'')
            b2=pg.evaluate(JS,[i,bcar+':'+best,0]) if bcar else None
            print(json.dumps({'id':i,'stock':a.get('value'),'best':b2 and b2.get('value'),'build':best,'stock_run':{k:a.get(k) for k in ('failed','flips','max_off_m','t','gate')},'best_run':b2 and {k:b2.get(k) for k in ('failed','flips','max_off_m','t','gate')}}),flush=True)
    elif ids=='list':
        for row in pg.evaluate(LIST): print(json.dumps(row))
    else:
        all_ids=[c['id'] for c in pg.evaluate(LIST)] if ids=='all' else ids.split(',')
        for i in all_ids:
            print(json.dumps(pg.evaluate(JS,[i,car,vcap])),flush=True)
    print('\n'.join(errs[:10]) or 'no page errors')
    b.close()
