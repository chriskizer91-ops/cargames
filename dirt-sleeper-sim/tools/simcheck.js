/* The Sim level's proving ground: what the extra realism does, build by build, against Realistic.
   usage: node tools/simcheck.js [test ...] [--build id,id]
   tests:
     ssf      static stability: track / 2h, and the tilt-table angle where the uphill wheels lift
     fishhook NHTSA's fishhook at 35-55 mph: steer full one way, then full the other; reports wheel lift and roll
     trip     the car sliding sideways onto dirt, gravel, grass and tarmac at 15-35 mph: does it trip over?
     curb     sliding sideways into a 15 cm kerb on tarmac
     lane     a 60 mph lane change and braking into a turn on tarmac (how sideways it gets)
     fade     ten 70-0 stops back to back: stopping distance and front rotor temperature
     air      tyre pressure: lateral grip on tarmac, 0-20 mph in mud, pulling up a muddy slope, rolling drag
     wet      wet tarmac: 60-0 and grip, and aquaplaning at speed
     shocks   whoops at 35 mph for a minute: damper temperature and how much they fade
     cargo    the roof load and cargo: centre of gravity and the fishhook again
     jump     a drop onto flat ground: does it bounce more on Sim's dampers? */
const X=require('./proving.js');
const DT=1/240;
const args=process.argv.slice(2),bi=args.indexOf('--build'),only=bi>=0?args[bi+1].split(','):null,tests=args.filter((a,i)=>!a.startsWith('--')&&(bi<0||i!==bi+1));
const want=t=>!tests.length||tests.includes(t);
const idx=id=>X.BUILDS.findIndex(b=>b.id===id);
const builds=ids=>(only||ids).map(idx).filter(i=>i>=0);
const f=(x,d=1)=>x==null?'-':(+x).toFixed(d);
const mph=v=>v*2.237;
/* a world from a ground function (x,z) -> [y, nx, ny, nz, surf] */
const world=fn=>new X.GroundWorld((x,z,o)=>{const g=fn(x,z);o.y=g[0];o.n[0]=g[1];o.n[1]=g[2];o.n[2]=g[3];o.surf=g[4];},null,1e9);
const flat=surf=>world(()=>[0,0,1,0,surf]);
/* the Sim settings a test asks for */
function setSim(o={}){X.SIMSET.air=o.air||'road';X.SIMSET.wx=o.wx||'dry';X.SIMSET.cargo=o.cargo||'none';Object.assign(X.SIMDEV,X.SIMDEV0,o.dev||{});}
function car(i,w,level,o={}){
  setSim(o);const sim=level==='sim'?{cg:X.SIMDEV.cg,cargo:X.simVal(X.SIM_CARGO,X.SIMSET.cargo)}:null;
  const v=X.makeCar(i,w,sim);v.setAssists(level);v.place([0,0,0],0);v.pt.start();
  const I={steer:0,thr:0,brk:1,hb:0,nos:false};for(let k=0;k<240*2.5;k++)v.step(DT,I);
  v.rev=false;v.pt.rev=false;v.revT=0;
  return v;
}
const up=v=>v.M[4];
const rollDeg=v=>Math.asin(Math.max(-1,Math.min(1,-v.M[3+2]*0+v.M[5])))*57.3;
/* steering the way the game's keys move it */
function keySteer(st,tgt){const rate=tgt===0?6:Math.sign(tgt)!==Math.sign(st)&&st!==0?8:3.2;return st+Math.max(-rate*DT,Math.min(rate*DT,tgt-st));}
/* the robot's hands (proving.js): aim at a point down the road along z = 0 */
function aim(v,tx,tz){const dx=tx-v.p[0],dz=tz-v.p[2],L2=dx*dx+dz*dz,side=dx*v.M[2]+dz*v.M[8],k=2*side/Math.max(L2,1),ang=Math.atan(v.c.wb*k);
  const lim=Math.min(v.c.lock,v.tyre.aPk*1.6+v.c.wb*9/Math.max(v.speed*v.speed,1));return Math.max(-1,Math.min(1,ang/lim));}
const straight=v=>aim(v,v.p[0]+Math.max(8,v.speed*.9),0);
function upTo(v,mphT,maxT=40){const I={steer:0,thr:1,brk:0,hb:0,nos:false};let t=0;
  while(mph(v.vf)<mphT&&t<maxT){I.steer=straight(v);v.step(DT,I);t+=DT;}return t;}
/* hold a speed with a little gas */
const cruise=(v,s)=>Math.max(0,Math.min(1,(s-v.speed)*.6+.25));

/* ---------- static stability ---------- */
function ssf(){
  console.log('\n# Static stability: track/2h and the tilt-table lift angle (Sim, empty, then with 120 kg on the roof)');
  for(const i of builds(X.BUILDS.map(b=>b.id))){
    const b=X.BUILDS[i],c=X.buildChassis(i,{cg:1,cargo:0}),c2=X.buildChassis(i,{cg:1,cargo:120}),c0=X.buildChassis(i);
    const ssf=c.trackF/(2*c.hcg);
    console.log(`${b.id.padEnd(13)} h ${f(c0.hcg,3)} -> ${f(c.hcg,3)} m (roof parts)  SSF ${f(ssf,2)}  tips at ${f(Math.atan(ssf)*57.3,0)} deg tilt`+(c2.sim.canCargo?`   +120 kg cargo: h ${f(c2.hcg,3)}  SSF ${f(c2.trackF/(2*c2.hcg),2)}`:''));
  }
}
/* ---------- the fishhook ---------- */
function fishhookRun(i,level,mphT,o){
  const v=car(i,flat('asphalt'),level,o);upTo(v,mphT);
  const I={steer:0,thr:0,brk:0,hb:0,nos:false};let st=0,lift=0,liftT=0,minUp=1,maxRoll=0,maxB=0;
  /* NHTSA: steer one way at 720 deg/s to its peak, hold, then the other way; the game's keys get there in about 0.3 s */
  const script=[[.6,-1],[1.2,1],[2.5,0]];
  for(const [secs,tgt] of script)for(let k=0;k<secs*240;k++){st=keySteer(st,tgt);I.steer=st;v.step(DT,I);
    const W=v.wheels,two=(!W[0].contact||W[0].Fz<1)&&(!W[2].contact||W[2].Fz<1)||(!W[1].contact||W[1].Fz<1)&&(!W[3].contact||W[3].Fz<1);
    if(two){liftT+=DT;}lift=Math.max(lift,liftT);minUp=Math.min(minUp,up(v));maxB=Math.max(maxB,Math.abs(v.beta));}
  return {lift,rolled:minUp<.2,minUp,maxB:maxB*57.3};
}
function fishhook(){
  console.log('\n# Fishhook on dry tarmac (keyboard steering): two-wheel lift time, slip angle; ROLLED if it went over');
  for(const i of builds(['stock','sleeper','crawler','race','trail','trailRig','pickup','prerunner','coupe','wagon','muscle','hatch'])){
    const out=[];
    for(const s of [35,45,55]){for(const lv of ['real','sim']){const r=fishhookRun(i,lv,s,{});out.push(`${lv==='sim'?'S':'R'}${s}: ${r.rolled?'ROLLED':f(r.lift,2)+'s'} ${f(r.maxB,0)}°`);}}
    console.log(X.BUILDS[i].id.padEnd(13)+out.join('  '));
  }
}
/* ---------- a sideways slide ---------- */
function slide(i,level,surf,lat,o={},kerb=0){
  /* the car facing +x, sliding toward +z (its right) at lat m/s; a kerb (step up) at z = 2 when asked */
  const w=kerb?world((x,z)=>{const e=1/(1+Math.exp(-(z-2.2)*60)),y=kerb*e,dz=kerb*60*e*(1-e),l=Math.hypot(dz,1);return [y,0,1/l,-dz/l,'asphalt'];}):flat(surf);
  const v=car(i,w,level,o);v.v[2]=lat;v.v[0]=.5;
  const I={steer:0,thr:0,brk:.3,hb:0,nos:false};let minUp=1,t=0;
  for(;t<6;t+=DT){v.step(DT,I);minUp=Math.min(minUp,up(v));if(v.speed<.3&&t>1)break;}
  return {rolled:minUp<.2,lift:minUp<.97,minUp,end:up(v)};
}
function trip(){
  console.log('\n# Sliding sideways (beam-on) at 15-35 mph: R = Realistic, S = Sim. ROLLED, lift (wheels left the ground) or held');
  for(const i of builds(['stock','crawler','race','trail','pickup','coupe','wagon','muscle','hatchB'])){
    const out=[];
    for(const surf of ['asphalt','dirt','gravel','grass']){const row=[];
      for(const m of [15,25,35]){const r=slide(i,'real',surf,m/2.237),s=slide(i,'sim',surf,m/2.237);
        const tag=x=>x.rolled?'ROLL':x.lift?'lift':'-';row.push(m+':'+tag(r)+'/'+tag(s));}
      out.push(surf.slice(0,5)+' '+row.join(' '));}
    console.log(X.BUILDS[i].id.padEnd(10)+out.join(' | '));
  }
}
function curb(){
  console.log('\n# Sliding sideways into a 15 cm kerb on tarmac at 8-20 mph: R / S');
  for(const i of builds(['stock','crawler','trail','pickup','coupe','wagon','muscle','hatch'])){
    const row=[];for(const m of [8,12,16,20]){const r=slide(i,'real','asphalt',m/2.237,{},.15),s=slide(i,'sim','asphalt',m/2.237,{},.15);
      const tag=x=>x.rolled?'ROLL':x.lift?'lift':'-';row.push(m+' mph '+tag(r)+'/'+tag(s));}
    console.log(X.BUILDS[i].id.padEnd(10)+row.join('  '));
  }
}
/* ---------- quick transitions: lane change and braking into a turn ---------- */
function manoeuvre(i,level,surf,mphT,script,o){
  const v=car(i,flat(surf),level,o);upTo(v,mphT);let st=0,maxB=0,minUp=1;
  for(const [secs,c] of script)for(let k=0;k<secs*240;k++){st=keySteer(st,c.steer);v.step(DT,{thr:c.thr,brk:c.brk||0,steer:st,hb:0});maxB=Math.max(maxB,Math.abs(v.beta));minUp=Math.min(minUp,up(v));}
  return {b:maxB*57.3,rolled:minUp<.2};
}
const LC=[[.7,{steer:-1,thr:.3}],[.7,{steer:1,thr:.3}],[1.5,{steer:0,thr:.3}]],BT=[[.25,{steer:1,thr:0,brk:1}],[2,{steer:1,thr:0,brk:.6}],[1,{steer:1,thr:.3}]];
function lane(){
  console.log('\n# Lane change and braking into a turn (body slip angle, degrees): Realistic vs Sim; over ~25 is a slide, over ~60 a spin');
  for(const i of builds(['stock','sleeper','crawler','race','trail','coupe','coupeGT','wagon','pickup','muscle','hatch','hatchB'])){
    const row=[];for(const [surf,s] of [['asphalt',60],['asphalt',80],['dirt',45],['gravel',50]]){
      const a=manoeuvre(i,'real',surf,s,LC),b=manoeuvre(i,'sim',surf,s,LC),c=manoeuvre(i,'real',surf,s,BT),d=manoeuvre(i,'sim',surf,s,BT);
      const t=x=>x.rolled?'RL':f(x.b,0);row.push(`${surf.slice(0,4)}${s} lc ${t(a)}/${t(b)} bt ${t(c)}/${t(d)}`);}
    console.log(X.BUILDS[i].id.padEnd(13)+row.join(' | '));
  }
}
/* ---------- brake fade ---------- */
function stopFrom(v,mphT){
  const I={steer:0,thr:1,brk:0,hb:0,nos:false};upTo(v,mphT+1);I.thr=0;I.brk=1;let x0=null;
  for(let k=0;k<240*20;k++){I.steer=straight(v);v.step(DT,I);if(x0===null&&mph(v.vf)<=mphT)x0=v.p[0];if(x0!==null&&v.speed<.3)break;}
  return v.p[0]-x0;
}
/* drive on at a steady speed for a while (the rotors cool in the air) */
function drive(v,mphT,secs){const I={steer:0,thr:1,brk:0,hb:0,nos:false};for(let k=0;k<secs*240;k++){I.steer=straight(v);I.thr=cruise(v,mphT/2.237);v.step(DT,I);}}
function fade(){
  console.log('\n# Ten 70-0 stops, 8 s at 50 mph between them: stopping distance (ft) / hottest rotor (C)');
  for(const i of builds(['stock','sleeper','race','pickup','coupe','muscle','muscleDrag'])){
    const v=car(i,flat('asphalt'),'sim');const out=[];
    for(let n=0;n<10;n++){
      const d=stopFrom(v,70),hot=Math.max(...v.wheels.map(w=>w.bT));out.push(`${f(d*3.281,0)}/${f(hot,0)}`);
      drive(v,50,8);
    }
    console.log(X.BUILDS[i].id.padEnd(13)+out.join(' '));
  }
}
/* ---------- tyre pressure ---------- */
function gripAt(i,surf,speed,o){
  const v=car(i,flat(surf),'sim',o),I={steer:0,thr:0,brk:0,hb:0,nos:false};
  for(let k=0;k<240*40&&v.speed<speed;k++){I.thr=1;v.step(DT,I);}
  let st=0,best=0,win=0,n=0;
  for(let k=0;k<240*30;k++){st=Math.min(1,st+DT/20);I.steer=st;I.thr=cruise(v,speed);I.brk=v.speed>speed+2?.3:0;v.step(DT,I);
    win+=v.accB[2];n++;if(n===120){best=Math.max(best,Math.abs(win/n)/9.81);win=0;n=0;}if(Math.abs(v.beta)>.35||up(v)<.5)break;}
  return best;
}
function accel(i,surf,toMph,o,slope=0){
  const s=Math.tan(slope*Math.PI/180),w=world((x)=>[x*s,-s/Math.hypot(s,1),1/Math.hypot(s,1),0,surf]);
  const v=car(i,w,'sim',o),I={steer:0,thr:1,brk:0,hb:0,nos:false};let t=0;
  for(;t<30;t+=DT){v.step(DT,I);if(mph(v.vf)>=toMph)return t;}return null;
}
function coast(i,o){
  const v=car(i,flat('asphalt'),'sim',o);upTo(v,50);const I={steer:0,thr:0,brk:0,hb:0,nos:false};let t=0;
  for(;t<60;t+=DT){v.step(DT,I);if(mph(v.vf)<=30)return t;}return null;
}
function air(){
  console.log('\n# Tyre pressure (Sim): aired down / road / aired up');
  for(const i of builds(['stock','crawler','trail','trailRig','pickup','prerunner','race'])){
    const r=[];for(const a of ['down','road','up']){const o={air:a};
      r.push(`${a.padEnd(4)}: tarmac ${f(gripAt(i,'asphalt',20,o),2)}g, mud 0-20 ${f(accel(i,'mud',20,o),1)}s, mud 15deg 0-10 ${f(accel(i,'mud',10,o,15),1)}s, coast 50-30 ${f(coast(i,o),1)}s`);}
    console.log(X.BUILDS[i].id+'\n   '+r.join('\n   '));
  }
}
/* ---------- the wet ---------- */
function wet(){
  console.log('\n# Wet tarmac (Sim): 60-0 (ft), lateral grip at 20 m/s, and grip left at 50/70 mph in a downpour (aquaplaning)');
  for(const i of builds(['stock','sleeper','race','coupe','coupeGT','wagon','muscleDrag','hatchB'])){
    const row=[];for(const wx of ['dry','wet','storm']){const o={wx};const v=car(i,flat('asphalt'),'sim',o);
      const d=stopFrom(v,60);row.push(`${wx}: 60-0 ${f(d*3.281,0)} grip ${f(gripAt(i,'asphalt',20,o),2)}`);}
    const S=X.makeCar(i,flat('asphalt'),{cg:1,cargo:0});S.setAssists('sim');setSim({wx:'storm'});S.applySim();
    const w=S.wheels[2],a=X.simGrip('asphalt',w.tread,1,1,50/2.237,w.psi),b=X.simGrip('asphalt',w.tread,1,1,70/2.237,w.psi);
    console.log(X.BUILDS[i].id.padEnd(13)+row.join(' | ')+` | downpour grip at 50 ${f(a,2)}, at 70 ${f(b,2)}`);
  }
}
/* ---------- the dampers ---------- */
function shocks(){
  console.log('\n# Whoops (25 cm, 6 m apart) at 35 mph for 60 s on dirt (Sim): hottest damper (C) and the damping left');
  const w=world((x,z)=>{const k=2*Math.PI/6,y=.125*Math.sin(x*k),dy=.125*k*Math.cos(x*k),l=Math.hypot(dy,1);return [y,-dy/l,1/l,0,'dirt'];});
  for(const i of builds(['stock','crawler','trail','trailRig','pickup','prerunner','hatchB'])){
    const v=car(i,w,'sim'),I={steer:0,thr:1,brk:0,hb:0,nos:false};let t=0,out=[];
    for(;t<60;t+=DT){I.thr=cruise(v,35/2.237);I.steer=Math.max(-1,Math.min(1,-v.p[2]*.08-Math.atan2(-v.M[6],v.M[0])*1.2));v.step(DT,I);
      if(Math.abs(t-15)<DT/2||Math.abs(t-30)<DT/2||Math.abs(t-59.99)<DT/2){const T=Math.max(...v.wheels.map(w=>w.shT)),F=Math.min(...v.wheels.map(w=>w.shF));out.push(`${f(t,0)}s ${f(T,0)}C ${f(F*100,0)}%`);}}
    console.log(X.BUILDS[i].id.padEnd(13)+out.join('  ')+(up(v)<.5?'  (rolled)':''));
  }
}
function cargo(){
  console.log('\n# Roof cargo (Sim): the fishhook at 45 and 50 mph, empty / light / heavy');
  for(const i of builds(['stock','crawler','trail','wagon'])){
    const row=[];for(const cg of ['none','light','heavy'])for(const s of [45,50]){const r=fishhookRun(i,'sim',s,{cargo:cg});row.push(`${cg} ${s}: ${r.rolled?'ROLLED':f(r.lift,2)+'s'}`);}
    console.log(X.BUILDS[i].id.padEnd(13)+row.join('  '));
  }
}
function jump(){
  console.log('\n# A 1.2 m drop onto flat dirt: bounces (body vertical speed reversals) and peak bump-stop hit, Realistic vs Sim');
  for(const i of builds(['stock','crawler','prerunner','race'])){
    const out=[];for(const lv of ['real','sim']){const v=car(i,flat('dirt'),lv);v.p[1]+=1.2;let rev=0,prev=0,bot=0;
      for(let k=0;k<240*4;k++){v.step(DT,{steer:0,thr:0,brk:1,hb:0});const vy=v.v[1];if(prev<-.05&&vy>.05||prev>.05&&vy<-.05)rev++;prev=vy;for(const w of v.wheels)bot=Math.max(bot,w.bot||0);}
      out.push(`${lv}: ${rev} reversals, hit ${f(bot,1)} m/s`);}
    console.log(X.BUILDS[i].id.padEnd(13)+out.join('  '));
  }
}
for(const [n,fn] of Object.entries({ssf,fishhook,trip,curb,lane,fade,air,wet,shocks,cargo,jump}))if(want(n))fn();
