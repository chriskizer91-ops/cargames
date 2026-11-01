/* =====================================================================================
   THE RATINGS: every rig scored 0 to 50 on six kinds of ground, the places on the ranch and round it
   where you can feel them. They are measurements, not opinions: a quick simulator drives each rig
   through a course built like that place, using the same numbers the game's physics drives on: the
   engine's own torque curve through its gears, the tyres' grip on that surface from the tread tables,
   rolling resistance and mud drag per tread, weight, downforce and drag, wheel travel, ground clearance
   from the body's own lines, the centre of gravity against the track (how soon it tips), the brakes,
   lockers and low range. 50 is a little better than the best factory build anywhere; a car half as
   fast through a course scores half as much, and one that can't get through at all scores little.
   ===================================================================================== */
/* id, name, what it is */
const TERRAINS=[['dirt','Dirt road','The ranch roads and the trail loop: fast dirt, ruts and the odd kicker.'],
  ['gravel','Gravel road','The county roads: long and fast on loose stone, washboard and crossroads.'],
  ['mountain','Mountainside','Red Hill: steep loose climbs, switchbacks and off-camber turns.'],
  ['rocks','Rock crawl','The rock garden: ledges, a staircase, boulders and a tilted slab.'],
  ['mud','Mud','The mud pit, the mud track and the lane\'s ruts.'],
  ['asphalt','Asphalt','The race track: grip, brakes and power.']];
/* the courses: pieces of [length m, corner radius m (0 straight), {surf, grade, rough, ledge, rock, camber, jump, depth}] */
const deg2=(r,a,o)=>[r*a*PI/180,r,o||{}];
const COURSES_T={
  asphalt:{surf:'asphalt',pieces:[[300,0],deg2(30,90),[180,0],deg2(70,70),[140,0],deg2(15,170),[220,0],deg2(120,50),[90,0],deg2(25,100),[160,0],deg2(45,80),[120,0],deg2(60,60)]},
  gravel:{surf:'gravel',pieces:[[320,0,{rough:.15}],deg2(140,45,{rough:.2}),[220,0,{rough:.25,jump:1}],deg2(70,60,{rough:.2}),[160,0,{rough:.2}],deg2(18,90),[260,0,{rough:.15}],deg2(90,70,{rough:.2}),
    [180,0,{rough:.3,jump:1}],deg2(50,80,{rough:.2}),[300,0,{rough:.2}],deg2(18,90),[200,0,{rough:.15}],deg2(110,50,{rough:.2}),[150,0,{rough:.2}]]},
  dirt:{surf:'dirt',pieces:[[200,0,{rough:.25}],deg2(40,90,{rough:.2}),[150,0,{rough:.35,jump:1}],deg2(25,120,{surf:'trail',rough:.3}),[120,0,{surf:'trail',rough:.4}],[15,0,{surf:'water',rough:.3}],
    [180,0,{surf:'trail',rough:.3}],deg2(60,60,{rough:.2}),[200,0,{rough:.3,jump:1}],deg2(30,100,{surf:'grass',rough:.3}),[150,0,{rough:.25}]]},
  mountain:{surf:'trail',pieces:[[60,0,{grade:.18,rough:.3}],deg2(10,170,{grade:.2,camber:.12}),[80,0,{grade:.3,rough:.35}],deg2(10,170,{grade:.22,camber:.16}),
    [70,0,{grade:.4,rough:.35,rock:.12}],deg2(12,150,{grade:.25,camber:.2}),[60,0,{grade:.49,rough:.3}],[40,0,{grade:.3,surf:'rock',rock:.18}],deg2(14,120,{grade:.2,camber:.14}),[50,0,{grade:.42,rough:.35}]]},
  rocks:{surf:'rock',pieces:[[15,0,{grade:.15,rock:.2}],[6,0,{ledge:.25,grade:.3}],[10,0,{grade:.2,rock:.28}],[6,0,{ledge:.35}],[6,0,{ledge:.45}],[12,0,{camber:.32,rock:.22}],
    [6,0,{ledge:.45,grade:.3}],[14,0,{grade:-.3,rock:.3}],[8,0,{ledge:.35}],[20,0,{camber:.25,rock:.25}],[10,0,{grade:.35,rock:.3}]]},
  mud:{surf:'mud',pieces:[[60,0,{depth:.22}],[30,0,{surf:'dirt',rough:.3}],deg2(15,90,{rough:.35}),[60,0,{rough:.55}],[12,0,{surf:'water'}],deg2(20,120,{rough:.3}),[80,0,{surf:'ruts',depth:.18}],
    [12,0,{surf:'water'}],deg2(15,90,{rough:.35}),[70,0,{rough:.5}],deg2(25,90,{surf:'ruts',depth:.18})]}
};
const G9=9.81;
/* how much of the traction open diffs keep when one wheel is light or in the slop, by what the car has */
const DIFF_K={rocks:{open:.55,etc:.74,lsd:.7,r:.86,rf:1},mud:{open:.72,etc:.86,lsd:.82,r:.93,rf:1},rough:{open:.9,etc:.96,lsd:.95,r:.97,rf:1}};
/* the car's figures, from its chassis, engine and model */
function rateSheet(i){
  const b=BUILDS[i],c=buildChassis(i),e=specOf(i),l=b.look,MC=b.machine?MACH[l.body]:null,rn=RUNNING[b.id]||RUNNING.stock,sp=SUSP[rn.susp]||SUSP.stock;
  const lr=l.tyreR||l.tyre,R=lr.R,Rf=l.tyre.R,drv=e.drv||'RWD';
  let clear;
  /* a machine's belly is its frame: its own clearance, raised by a lift and by taller tyres */
  if(MC)clear=MC.clear+l.lift+(Rf-MC.R)*.6;
  else{const D=suvDesign(l);let sill=9;for(let u=D.uFa;u<=D.uRa;u+=.05)sill=Math.min(sill,D.sill(u));
    const frame={suv:1,trail:1,pickup:1}[b.car]?.1:.04,solid=l.susp==='solid'||b.car==='trail',solidR=solid||b.car==='pickup'||b.car==='muscle';
    clear=Math.min(sill-frame,solid?Rf-.13:Rf-.05,solidR?R-.13:R-.05);}
  const track=(l.track+(l.trackR||l.track))/2,ssf=(track/2+(MC?MC.leanZ*MC.riderKg/c.mass:0))/c.hcg;
  const can=c.diff.can,dk=can.f?'rf':can.r?'r':c.diff.pre>=70?'lsd':c.diff.etc?'etc':'open';
  const muOf=(s,f)=>{const t=f?c.tyre:(c.tyreR||c.tyre),m=f?c.surfMu:(c.surfMuR||c.surfMu);return t.mu*(m[s]??.8);};
  return {b,c,e,R,Rf,drv,mass:c.mass,hcg:c.hcg,wb:c.wb,wf:c.wf,clear,ssf,track,travel:sp.droop+sp.bump,ride:SHOCKS[rn.shocks]||1,
    dk,low:can.low?c.diff.lowK:1,aero:c.clF+c.clR,cdA:c.cdA,brake:c.brake/(R*c.mass),muOf,rr:s=>(c.surfRRR||c.surfRR)[s]??.015,drag:s=>(c.surfDragR||c.surfDrag)[s]||0,
    conv:!!e.conv,shiftT:e.shiftT||.3,Iw:c.IwR||c.Iw,_df:new Map()};
}
/* the best drive force at speed v over every gear (low range when the car has it and the going is slow) */
function gearForce(S,v,g,lo){
  const e=S.e,R=S.R;
  /* a belt CVT: whatever ratio puts the engine at its peak, within its range */
  const ratio=e.cvt?clamp(e.cvt.top*TAU/60*R/Math.max(v,.1)/(e.fd*lo),e.cvt.hi,e.cvt.lo)*e.fd*lo:e.gears[g]*e.fd*lo;let rpm=v/R*ratio*60/TAU,mult=1;
  if(rpm>e.limiterRpm-60)return 0;
  /* pulling away: the clutch slips at launch revs; a torque converter also multiplies the torque */
  const launch=Math.max(e.idle*1.5,Math.min(e.redline*.45,3200));if(rpm<launch){if(S.conv)mult=1+.6*clamp(1-rpm/launch,0,1);rpm=launch;}
  /* the engine and wheels spinning up count as extra mass, a lot of it in the low gears */
  S._me=S.mass+e.Ie*ratio*ratio/(R*R)+4*S.Iw/(R*R);
  return SIM.engTq(e,rpm,1,SIM.steadyBoost(e,rpm))*mult*ratio*.88/R;
}
function driveForce(S,v,lowOn){
  /* the courses ask at the same speeds over and over: answers are kept on a quarter-metre-a-second grid */
  const key=(lowOn?1e6:0)+Math.round(v*4),c=S._df.get(key);if(c){S._me=c[1];S._g=c[2];return c[0];}
  const e=S.e,lo=lowOn?S.low:1,vq=Math.round(v*4)/4||.25;let best=0,me=S.mass*1.04,bg=0;
  for(let g=0;g<e.nG;g++){const F=gearForce(S,vq,g,lo);if(F>best){best=F;me=S._me;bg=g;}}
  S._df.set(key,[best,me,bg]);S._me=me;S._g=bg;return best;
}
/* one course: the speed each metre allows, braking down to it, accelerating out of it */
function rateCourse(S,key){
  const C=COURSES_T[key],pts=[],m=S.mass;let pen=0;
  for(const [len,r,o={}] of C.pieces){const n=Math.max(1,Math.round(len));for(let k=0;k<n;k++)pts.push({r,o,surf:o.surf||C.surf,last:k===n-1,first:k===0});}
  const N=pts.length,cap=new Float64Array(N);
  const latMu=s=>{const f=S.muOf(s,true),r=S.muOf(s,false);return .65*Math.min(f,r)+.35*Math.max(f,r);};
  const tracMu=(s,o)=>{const a=S.drv==='AWD'?(S.muOf(s,true)+S.muOf(s,false))/2:S.muOf(s,S.drv==='FWD');
    /* a climb leans the weight back onto the rear axle */
    const tr=S.hcg/S.wb*(o.grade||0),share=S.drv==='AWD'?1:S.drv==='RWD'?(1-S.wf)+.08+tr:S.wf-.06-tr,kind=s==='rock'||o.ledge?'rocks':s==='mud'||s==='ruts'?'mud':o.rough>.3?'rough':null;
    return a*share*(kind?DIFF_K[kind][S.dk]:1);};
  for(let k=0;k<N;k++){const p=pts[k],o=p.o,s=p.surf;let v=S.b.gov||70;
    const lim=Math.min(latMu(s),S.ssf*.92);
    if(p.r){let w=Math.sqrt(lim*G9*p.r);for(let q=0;q<6;q++)w=Math.sqrt((lim*G9+S.aero*.5*RHO*w*w/m*(s==='asphalt'?1:.6))*p.r);v=Math.min(v,w);}
    /* bumps: what the suspension can soak up at speed grows with the square of its travel */
    if(o.rough){const vw=(6+150*S.travel*S.travel)*Math.pow(1500/m,.15)*S.ride;v=Math.min(v,vw*Math.pow(.8/o.rough,1.2));}
    if(o.jump&&p.last&&S.travel<.2)v=Math.min(v,12+40*S.travel);
    /* off-camber: past what the centre of gravity and track allow, it creeps or it rolls */
    if(o.camber){const m2=S.ssf-o.camber*1.6;if(m2<.15){v=Math.min(v,1.2);if(p.first)pen+=m2<0?40:12;}else v=Math.min(v,3+18*m2);}
    /* rocks underfoot: a car that clears them picks its way through; one that doesn't drags its belly */
    if(o.rock){const d=S.clear-o.rock;v=Math.min(v,d>=0?3+12*d:Math.max(1,3+20*d));if(d<0&&p.first)pen+=Math.min(12,-d*80);}
    if(o.depth&&S.clear<o.depth+.05&&p.first)pen+=(o.depth+.05-S.clear)*60;
    if(s==='water')v=Math.min(v,9);
    /* a ledge: the wheel has to climb a step against its radius, pushed by the other wheels */
    if(o.ledge&&p.first){const h=o.ledge,rf=h/S.Rf,mu=tracMu('rock',o),need=rf>=1?(rf>1.15?9:2.8+(rf-1)*12):Math.tan(Math.acos(1-rf))*.5,
        wheelT=driveForce(S,.3,true)/m/G9;
      const ok=Math.min(mu/Math.max(need,1e-3),wheelT/Math.max(need,1e-3));
      if(ok<1)pen+=ok<.6?45:8+60*(1-ok);v=Math.min(v,1.2+1.5*clamp(ok-1,0,1));
      if(S.clear<h*.7)pen+=4;}
    if(o.ledge)v=Math.min(v,2.5);
    cap[k]=v;}
  /* braking pass */
  const vb=Float64Array.from(cap);
  for(let k=N-2;k>=0;k--){const p=pts[k],dec=Math.min(S.brake,latMu(p.surf)*1.02)*G9+(p.o.grade||0)*G9;vb[k]=Math.min(vb[k],Math.sqrt(vb[k+1]*vb[k+1]+2*Math.max(.5,dec)));}
  /* driving pass */
  let v=0,t=0,stuck=0,gPrev=-1;
  for(let k=0;k<N;k++){const p=pts[k],o=p.o,s=p.surf,gr=o.grade||0,cs=1/Math.sqrt(1+gr*gr),sn=gr*cs;
    const slow=v<6&&(s==='rock'||s==='mud'||s==='ruts'||gr>.25||o.ledge);
    let F=driveForce(S,Math.max(v,.3),slow&&S.low>1);
    const trac=tracMu(s,o)*m*G9*cs;F=Math.min(F,trac);
    const res=S.rr(s)*m*G9*cs+S.drag(s)*m*G9*v+.5*RHO*S.cdA*v*v+m*G9*sn;
    let a=(F-res)/S._me;
    if(p.r){const used=v*v/p.r/(Math.min(latMu(s),S.ssf*.92)*G9);a*=Math.sqrt(Math.max(0,1-used*used));}
    /* each upshift costs the shift time (the automatics' converters also slip a little) */
    if(v>4){const g=S._g;if(gPrev>=0&&g>gPrev)t+=S.shiftT*.6;if(g!==gPrev)gPrev=g;}
    let v2=Math.sqrt(Math.max(0,v*v+2*a));
    if(v2<.25){/* it can't keep going: count the time it sits there spinning, then let it scrabble on at a crawl */stuck++;v2=.25;}
    v2=Math.min(v2,vb[k]);t+=2/(v+v2+1e-6);v=v2;}
  t+=pen+stuck*1.5;
  return t;
}
/* the reference times: the best factory build on each course, a little bettered, so a stock car is
   somewhere in the middle and a rig built for one place can reach 50 there */
let RATE_REF=null;
function rateRefs(){
  if(RATE_REF)return RATE_REF;
  RATE_REF={};const best={};
  /* the references are the cars' and trucks' factory builds: the machines are scored on the same scale, so a
     sport quad can top out on a dirt road and a semi barely registers in the rocks */
  for(const id of Object.keys(PRESET_PARTS)){const car=BUILDS.find(b=>b.id===id).car;if(MACH[car])continue;const S=rateSheet(rigBuild(car,presetRig(id)));
    for(const [k] of TERRAINS){const t=rateCourse(S,k);best[k]=Math.min(best[k]||1e9,t);}}
  for(const [k] of TERRAINS)RATE_REF[k]=best[k]*.97;
  return RATE_REF;
}
const RATE_CACHE=new Map();
/* a build's six ratings and the figures behind them */
function rateBuild(i){
  const id=BUILDS[i].id;if(RATE_CACHE.has(id))return RATE_CACHE.get(id);
  const ref=rateRefs(),S=rateSheet(i),out={figs:null};
  for(const [k] of TERRAINS){const t=rateCourse(S,k);out[k]=clamp(Math.round(50*Math.pow(ref[k]/t,2)),0,50);}
  /* figures a player knows: 0-60 on tarmac, top speed, grip */
  let v=0,t=0,z60=null,g=0,sh=0;const e=S.e,trac=S.muOf('asphalt',S.drv==='FWD')*(S.drv==='AWD'?1:S.drv==='RWD'?.55:.5)*S.mass*G9;
  while(v<110&&t<90){
    /* the gearbox up through its gears at the limiter, the drive cut for the shift time at each */
    if(sh<=0&&g<e.nG-1&&v/S.R*e.gears[g]*e.fd*60/TAU>=e.limiterRpm-60){g++;sh=S.shiftT;}
    const res=S.rr('asphalt')*S.mass*G9+.5*RHO*S.cdA*v*v;
    if(S.b.gov&&v>=S.b.gov)break;
    if(sh>0){sh-=.01;v-=res/S.mass*.01;t+=.01;continue;}
    const F=Math.min(gearForce(S,Math.max(v,.3),g,1),trac),a=(F-res)/S._me;
    if(a<.05&&g>=e.nG-1)break;v+=Math.max(0,a)*.01;t+=.01;if(z60===null&&v>=26.82)z60=t;}
  out.figs={hp:Math.round(S.e.peak.hp),kg:S.mass,drv:S.drv,z60:z60&&+z60.toFixed(1),top:Math.round(v*2.237),clear:Math.round(S.clear*100),travel:Math.round(S.travel*100),
    tip:+S.ssf.toFixed(2),low:S.low>1?S.low:0,lockers:S.dk==='rf'?2:S.dk==='r'?1:0};
  RATE_CACHE.set(id,out);return out;
}
const rateRig=(car,rig)=>rateBuild(rigBuild(car,rig));
const TERRAIN_SHORT={dirt:'Dirt',gravel:'Gravel',mountain:'Mountain',rocks:'Rocks',mud:'Mud',asphalt:'Asphalt'};
/* 0-60 measured on the game's own physics (flat tarmac, Middle level so traction control launches it the way
   a player would): the quick simulator above is a little optimistic off the line, so the garage shows this */
const MEASURED=new Map();
/* (tools: a build's 0-60, quarter mile and top speed on endless flat tarmac, with or without the Plus tune) */
function speedTest(i,plus=0,secs=150,gear=1,level='middle'){
  const flat=new GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9),v=makeCar(i,flat,null,plus,gear),DT1=1/240,z={thr:0,brk:0},go={thr:1,steer:0,brk:0};
  /* (the game's own way: its level's assists, the dev panel's traction and handling, a governor where there is one) */
  v.setAssists(level);if(level!=='middle')devFit(v);v.place([0,0,0],0);v.pt.st='run';v.pt.we=v.pt.e.idle*TAU/60;for(let k=0;k<480;k++)v.step(DT1,z);v.v.fill(0);v.w.fill(0);
  const gov=BUILDS[i].gov||0;
  let t=0,z60=null,z100=null,top=0,topT=0,q=null,dist=0,minUp=1;
  for(;t<secs;t+=DT1){go.thr=gov&&v.speed>gov-1.2?clamp((gov-v.speed)/1.2,0,1):1;v.step(DT1,go);const sp=v.speed;dist+=sp*DT1;if(z60===null&&sp>=26.82)z60=t;if(z100===null&&sp>=44.7)z100=t;if(q===null&&dist>=402.3)q=[t,sp];if(sp>top+.01){top=sp;topT=t;}if(v.M[4]<minUp)minUp=v.M[4];if(t-topT>8)break;}
  return {z60:z60&&+z60.toFixed(1),z100:z100&&+z100.toFixed(1),q:q&&[+q[0].toFixed(1),Math.round(q[1]*2.237)],top:Math.round(top*2.237),rpm:Math.round(v.pt.rpm),gear:v.pt.gear,nG:v.pt.e.nG,redline:v.pt.e.redline,
    hp:Math.round(v.pt.e.peak?v.pt.e.peak.hp:0),tq:Math.round(v.pt.e.peak?v.pt.e.peak.tq*.7376:0),kg:Math.round(v.m||v.c.mass||0),drv:v.pt.e.drv||'',nan:!Number.isFinite(v.speed),minUp:+minUp.toFixed(2)};
}
function measure60(i){
  const id=BUILDS[i].id;if(MEASURED.has(id))return MEASURED.get(id);
  const flat=new GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9),v=makeCar(i,flat),DT1=1/240,z={thr:0,brk:0},go={thr:1};
  v.setAssists('middle');v.place([0,0,0],0);v.pt.st='run';v.pt.we=v.pt.e.idle*TAU/60;for(let k=0;k<480;k++)v.step(DT1,z);v.v.fill(0);v.w.fill(0);
  let t=0;for(;t<25&&v.speed<26.82;t+=DT1)v.step(DT1,go);
  const out=v.speed>=26.82?+t.toFixed(1):null;MEASURED.set(id,out);return out;
}
