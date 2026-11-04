/* =====================================================================================
   POLICE PATROLS (rlcwo2rnf+traffic): with the police on (the Drive tab), nobody comes after you until a patrol sees
   you break the law. Patrol cars sit parked at the roadside at a dozen spots round the county (Highway 40's shoulders,
   the section lines' verges, the town's parking lanes) and ride in the traffic (about one car in ten, two at most round
   you), in the police's black and white, the light bar dark. A chase starts when one of them, near you and with
   nothing in the way, sees you
     - doing more than 15 mph over the road's limit (35 in town, 60 on the highway, 50, 35 and 25 on blacktop, gravel
       and dirt);
     - going into a junction on its red;
     - hitting a car (or a police car: that one starts it whoever sees it).
   That patrol car is the first after you, where it is, at its speed; the chase is the police mode's own (60_police:
   the wanted level, the helicopter, busted or got away). Busted or away, the chase ends and it's patrols again.
   Dev: When the police come: a patrol sees you (this), or at once (the chase straight away, as before).
   A parked patrol is a whole car on the physics, made when you come within 380 m of its spot and let go past 450 m,
   but stepped only when something is near enough to touch it (so it costs nothing until then); one in the traffic is a
   traffic car like the rest until the moment it comes after you.
   ===================================================================================== */
const PAT={cars:[],spots:null,model:null,modelBi:-1,hitT:-9,hitX:0,hitZ:0,hitPol:false,inJ:null,seeT:0,see:null,jAt:null,starts:0,why:''};
const PAT_PARK=3;
for(let i=0;i<PAT_PARK;i++)PAT.cars.push(Object.assign(polNew(),{spot:null}));
const patOn=()=>policeWanted()&&DEVW.polStart!=='once';
/* the spots: [x, z, yaw, where]. On a shoulder or a verge facing the way the traffic on that side goes, or in a town
   street's parking lane (the strip between the lane and the kerb), half way between junctions */
function patSpots(){
  const L1=WG.L,out=[],hy=WG.HWY_X,side=(cls)=>(WG.CL[cls]||WG.CL[1]).hw+1.7;
  /* Highway 40's shoulders (the south side runs east, the north side west) */
  for(const [x,s] of [[-2300,-1],[-1100,1],[800,-1],[2100,1]])if(Math.abs(x)<hy-300)out.push([x,s*13.3,s>0?0:PI,'Highway 40']);
  /* the section lines' verges, the right-hand side for the traffic heading towards town */
  const ns=(i,z,sg,name)=>{const c=WG.clsNSz(i,z);if(!c)return;const x=i*L1+WG.offNS(i,z),s=(WG.offNS(i,z+1)-WG.offNS(i,z-1))/2,yaw=Math.atan2(-sg,sg*s);
    /* (heading sg along z: its right is -sg in x, near enough on these gentle bends) */
    out.push([x-sg*side(c),z,yaw,name]);};
  const ew=(j,x,sg,name)=>{const c=WG.clsEWx(j,x);if(!c)return;const z=j*L1+WG.offEW(j,x),s=(WG.offEW(j,x+1)-WG.offEW(j,x-1))/2,yaw=Math.atan2(-sg*s,sg);
    out.push([x,z+sg*side(c),yaw,name]);};
  ns(0,-1300,1,'Ridge Road');ns(0,1300,-1,'Wash Road');ns(1,-700,1,'East Line Road');ns(-1,700,-1,'West Line Road');
  ew(-1,700,-1,'North Line Road');ew(1,-700,1,'South Line Road');
  /* the town's streets (one lane each way, the parking lane 4.6 m out from the middle) */
  out.push([-115.4,-60,PI/2,'Cactus Street'],[115.4,60,-PI/2,'Copper Street'],[60,-115.4,0,'Silver Street'],[-60,115.4,PI,'Neon Row']);
  return out;}
/* the traffic's patrol car: your build's light copy (60_traffic's trfModel), made again when you change cars */
function patModel(){const i=APP.bi;if(PAT.modelBi===i)return PAT.model;PAT.modelBi=i;PAT.model=null;
  const b=BUILDS[i];if(!b||b.machine)return null;try{PAT.model=trfModel(b.id,0);}catch(e){PAT.model=null;}return PAT.model;}
/* how many patrols ride in the traffic round you */
const patInTraffic=()=>{let n=0;for(let q=0;q<TRF_ON.length;q++)if(TRF_ON[q].police)n++;return n;};
/* a traffic car starting out (60_traffic, 60_streets): one in ten a patrol, two at most, none in a chase */
function patMaybe(c){c.police=false;if(!patOn()||POL.chase||!PAT.model||trfRnd()>.1||patInTraffic()>=2)return;c.police=true;c.m=PAT.model;}
/* the speed limit where you are (m/s) */
function patLimit(x,z){if(Math.abs(x)<WG.RING+30&&Math.abs(z)<WG.RING+30)return 15.6;
  const r=WG.roadAt(x,z);if(r&&Math.abs(r.d)<r.hw+4)return r.cls===6?26.8:r.cls===3?22.4:r.cls===2?15.6:11.2;return 26.8;}

/* ---------- each frame, while no one is after you ---------- */
function patFrame(dt){
  const t=GAME.car,px=t.p[0],pz=t.p[2];
  if(!PAT.spots)PAT.spots=patSpots();
  patModel();
  /* the parked ones: out within 380 m of their spot, gone past 450 */
  for(const P of PAT.cars){if(P.V&&hyp2(P.spot[0]-px,P.spot[1]-pz)>450){P.V=null;P.spot=null;}}
  for(const s of PAT.spots){if(hyp2(s[0]-px,s[1]-pz)>380||PAT.cars.some(P=>P.spot===s))continue;const P=PAT.cars.find(P=>!P.V);if(!P)break;
    truckFar(APP.bi);P.V=polMake();P.spot=s;polPlace(P,s[0],s[1],s[2],0);}
  for(const P of PAT.cars){if(!P.V)continue;const i=P.inp;i.steer=0;i.thr=0;i.brk=1;i.hb=1;P.d=hyp2(P.V.p[0]-px,P.V.p[2]-pz);}
  /* what you're doing: over the limit, into a junction on its red, a car just hit */
  let why='',wx=px,wz=pz;
  if(t.speed>patLimit(px,pz)+6.7)why='SPEEDING';
  {if(!PAT.jAt){PAT.jAt=new Map();for(const n of WG.TW.jn)PAT.jAt.set(n.x+','+n.z,n);}
    const n=PAT.jAt.get(Math.round(px/120)*120+','+Math.round(pz/120)*120),inn=n&&n.sig&&Math.abs(px-n.x)<n.hx&&Math.abs(pz-n.z)<n.hz?n:null;
    if(inn&&PAT.inJ!==inn&&t.speed>3){const ew=Math.abs(t.v[0])>Math.abs(t.v[2]),tt=((APP.t/30+inn.ph+(ew?.5:0))%1+1)%1;if(tt>=.5+.5/30)why='RAN A RED LIGHT';}
    PAT.inJ=inn;}
  if(TRF.t-PAT.hitT<.5){why=PAT.hitPol?'HIT A POLICE CAR':'HIT A CAR';wx=PAT.hitX;wz=PAT.hitZ;}
  for(const P of PAT.cars)if(P.V&&P.V.ev.car>0&&P.d<9){P.V.ev.car=0;why='HIT A POLICE CAR';}
  if(!why)return;
  /* a patrol near enough, with nothing in the way: the nearest that sees it (a police car hit sees it itself) */
  const range=why==='SPEEDING'?70:100;PAT.seeT-=dt;let best=null,bd=1e9,traf=null;
  for(const P of PAT.cars){if(!P.V)continue;const d=hyp2(P.V.p[0]-wx,P.V.p[2]-wz);if(d<range&&d<bd&&(why==='HIT A POLICE CAR'||polClear(P.V.p[0],P.V.p[2],wx,wz))){bd=d;best=P;traf=null;}}
  for(let q=0;q<TRF_ON.length;q++){const c=TRF_ON[q];if(!c.police)continue;const d=hyp2(c.x-wx,c.z-wz);if(d<range&&d<bd&&(why==='HIT A POLICE CAR'||polClear(c.x,c.z,wx,wz))){bd=d;best=null;traf=c;}}
  if(best||traf)patChase(best,traf,why);
}
/* the chase begins: the patrol that saw it is the first after you (a parked one where it is; one in the traffic made a
   pursuit car where it is, at its speed) */
function patChase(P0,c,why){
  POL.chase=true;POL.live=true;POL.k=0;polCrumb();truckFar(APP.bi);WANTED.lvl=1;WANTED.heat=0;POL.bi=APP.bi;POL.spawnT=1.5;PAT.starts++;PAT.why=why;
  const P=POL.cars[0];
  if(P0){P.V=P0.V;P0.V=null;P0.spot=null;P.ck=Math.max(0,POL.k-1);P.stuckT=P.revT=P.flipT=P.lostT=0;P.hold=false;P.prev=false;}
  else if(c){P.V=polMake();polPlace(P,c.x,c.z,Math.atan2(-c.fz,c.fx),c.v);trfOff(c);}
  /* (the rest of the patrols stand down: the parked ones stay parked, the traffic's ride on as traffic) */
  say('POLICE! '+why,2.6,PAL.red);buzz([40,30,40]);
}
/* the chase over (busted or away): patrols again */
function patEnd(){POL.chase=false;}
function patClear(){for(const P of PAT.cars){P.V=null;P.spot=null;}PAT.inJ=null;}
/* each physics step: a parked patrol stepped only with something near enough to touch it */
function patSub(dt,list){for(const P of PAT.cars){if(!P.V)continue;let near=P.d<25;
  if(!near)for(let q=0;q<TRF_PHYS.length;q++){const c=TRF_PHYS[q];if(c.veh&&hyp2(c.veh.p[0]-P.V.p[0],c.veh.p[2]-P.V.p[2])<20){near=true;break;}}
  if(near){P.V.step(dt,P.inp);list.push(P.V);}}}
