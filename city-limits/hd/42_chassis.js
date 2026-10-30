/* =====================================================================================
   EVERY CAR ON ITS WHEELS. Dirt Sleeper Mini 4's chassis rules (springs from the weight, so every car
   sits at its ride height; shocks from the springs; sway bars; brakes scaled to the tyres; grip and
   rolling resistance per tread and surface), applied to all sixteen builds. The four SUV builds keep
   Mini 4's numbers, except where their parts now count: the race build's wing and splitter make downforce,
   and the sleeper's big brakes and the race build's race brakes stop harder.
   Each body's size, centre of gravity and hull come from its model, so a car is exactly as long, as
   wide and as tall as it is drawn.
   ===================================================================================== */
/* grip per tread and surface. allseason, perf, mud and slick are Dirt Sleeper's: the factory all-seasons
   get an AWD truck down a muddy lane, the performance tyres are a touch better on hard ground and much the
   same off it. at: all-terrains, nearly as good as all-seasons on tarmac and better everywhere loose.
   gravel: rally tyres, made for loose stone. drag: soft drag radials, sticky on prepped ground and lost in
   the dirt. runner: a drag car's skinny front runners, made to roll, not to turn */
const TREAD_MU={
  allseason:{concrete:1,strip:.84,dirt:.77,trail:.75,grass:.68,rock:.82,mud:.47,water:.47,gravel:.72,asphalt:1.02,ruts:.52},
  perf:{concrete:1.08,strip:.92,dirt:.75,trail:.72,grass:.64,rock:.8,mud:.43,water:.45,gravel:.7,asphalt:1.12,ruts:.47},
  mud:{concrete:.9,strip:.88,dirt:.86,trail:.86,grass:.8,rock:.9,mud:.68,water:.56,gravel:.8,asphalt:.92,ruts:.7},
  slick:{concrete:1.25,strip:.95,dirt:.62,trail:.52,grass:.45,rock:.62,mud:.24,water:.3,gravel:.5,asphalt:1.32,ruts:.27},
  at:{concrete:.97,strip:.86,dirt:.82,trail:.81,grass:.74,rock:.86,mud:.57,water:.52,gravel:.78,asphalt:.99,ruts:.61},
  gravel:{concrete:.93,strip:.9,dirt:.9,trail:.88,grass:.78,rock:.86,mud:.6,water:.55,gravel:.92,asphalt:.95,ruts:.64},
  drag:{concrete:1.12,strip:1.08,dirt:.68,trail:.64,grass:.56,rock:.7,mud:.36,water:.4,gravel:.6,asphalt:1.15,ruts:.4},
  runner:{concrete:.82,strip:.78,dirt:.62,trail:.6,grass:.55,rock:.66,mud:.38,water:.4,gravel:.58,asphalt:.84,ruts:.42}};
/* rolling resistance per surface, and how much more the bog drags each tread */
const SURF_RR={concrete:.012,strip:.02,dirt:.024,trail:.028,grass:.034,rock:.022,mud:.14,water:.09,gravel:.026,asphalt:.011,ruts:.065};
const TREAD_RR_MUD={allseason:1,perf:1.05,mud:.8,slick:1.35,at:.9,gravel:.95,drag:1.2,runner:1.4};
/* suspension: spring rate against the factory truck's (the springs grow with the weight, so ride height and
   bounce hold), sway bars (N/m of difference across the axle), how far the wheel drops and how far it rises */
const SUSP={
  stock:{k:1,arbF:36e3,arbR:6e3,droop:.1,bump:.09},lowered:{k:1.3,arbF:50.4e3,arbR:8.4e3,droop:.06,bump:.06},lift6:{k:.78,arbF:18e3,arbR:3e3,droop:.18,bump:.18},
  trail:{k:.9,arbF:24e3,arbR:4e3,droop:.12,bump:.12},longtravel:{k:.7,arbF:12e3,arbR:2e3,droop:.17,bump:.17},
  coupe:{k:1.6,arbF:30e3,arbR:15e3,droop:.07,bump:.07},gt:{k:2.6,arbF:42e3,arbR:28e3,droop:.05,bump:.05},
  wagon:{k:1,arbF:26e3,arbR:8e3,droop:.09,bump:.08},wagonLow:{k:1.25,arbF:30e3,arbR:10e3,droop:.07,bump:.07},
  pickup:{k:1,arbF:34e3,arbR:4e3,droop:.11,bump:.11},prerunner:{k:.55,arbF:16e3,arbR:2e3,droop:.23,bump:.23},
  muscle:{k:.95,arbF:22e3,arbR:5e3,droop:.08,bump:.08},drag:{k:.8,arbF:12e3,arbR:0,droop:.08,bump:.06},
  hatch:{k:1.15,arbF:22e3,arbR:12e3,droop:.085,bump:.085},rally:{k:.85,arbF:20e3,arbR:12e3,droop:.13,bump:.13}};
/* shock absorbers against the factory truck's: desert bypass shocks and rally dampers take bumps at speed */
const SHOCKS={stock:1,bypass:1.35,rally:1.3,race:1.2,sport:1.1,drag:.9};
const BRAKES={stock:1,big:1.15,race:1.35,drag:.9};
/* the centre of gravity of each body at factory ride height (the factory truck's is Mini 4's .74 m) */
const HCG={suv:.74,trail:.70,coupe:.46,wagon:.55,pickup:.76,muscle:.50,hatch:.52};
/* the running gear per build. tyre: tread and curve (peak slip, peak angle, grip once sliding, how fast it
   falls away, the wheel's inertia against the factory truck's); a rear tyre where the axles differ. wf: the
   share of weight on the front wheels. tc: traction control the car has of its own, on at every driving
   level (the modern coupe from the factory, the GT car and the race build from their teams; the 1970 muscle
   car, the drag car, the 1980s hatches and the prerunner have none). diff: preload and lock under power and coast, brake traction control
   (etc), lockers (1 rear, 2 both) and low range. aero: downforce on each axle (lift coefficient times area) */
const T_=(tread,kPk,aPk,slide,slideW,If,mu=1.08)=>({tread,kPk,aPk,slide,slideW,If,mu});
const RUNNING={
  stock:  {tyre:T_('allseason',.12,.15,.82,.65,1),susp:'stock',shocks:'stock',wm:1,wf:.55,diff:{etc:1}},
  sleeper:{tyre:T_('perf',.11,.13,.8,.6,1.05),susp:'lowered',shocks:'stock',wm:1.05,wf:.55,diff:{etc:1}},
  crawler:{tyre:T_('mud',.15,.18,.85,.8,1.1),susp:'lift6',shocks:'bypass',wm:1.15,wf:.55,diff:{lockers:2,low:true}},
  race:   {tyre:T_('slick',.1,.12,.75,.5,.9),susp:'lowered',shocks:'bypass',wm:.95,wf:.55,aero:[.4,.6],brake:'race',tc:1},
  trail:  {tyre:T_('at',.13,.16,.84,.72,1),susp:'trail',shocks:'stock',wm:1.05,wf:.54,diff:{etc:1,low:true}},
  trailRig:{tyre:T_('mud',.15,.18,.85,.8,1.1),susp:'longtravel',shocks:'bypass',wm:1.15,wf:.55,diff:{lockers:2,low:true}},
  coupe:  {tyre:T_('perf',.11,.13,.8,.6,1,1.12),susp:'coupe',shocks:'sport',wm:1,wf:.52,aero:[.06,.08],lock:.58,diff:{pre:60,acc:.35,dec:.2},tc:1},
  coupeGT:{tyre:T_('slick',.1,.12,.75,.5,.9,1.12),susp:'gt',shocks:'race',wm:.9,wf:.48,aero:[.45,.65],lock:.58,diff:{pre:80,acc:.5,dec:.3},tc:1},
  wagon:  {tyre:T_('allseason',.12,.15,.82,.65,.9,1.04),susp:'wagon',shocks:'stock',wm:.9,wf:.58,diff:{etc:1}},
  wagonSleeper:{tyre:T_('drag',.13,.15,.82,.7,1),susp:'wagonLow',shocks:'stock',wm:1,wf:.58},
  pickup: {tyre:T_('at',.13,.16,.84,.72,1.05,1.1),susp:'pickup',shocks:'stock',wm:1.05,wf:.56,lock:.55,diff:{etc:1,lockers:1,low:true}},
  prerunner:{tyre:T_('at',.14,.17,.85,.78,1.15,1.12),susp:'prerunner',shocks:'bypass',wm:1.15,wf:.55,lock:.55,diff:{lockers:1,low:true}},
  muscle: {tyre:T_('allseason',.12,.16,.8,.62,.95,1.06),susp:'muscle',shocks:'stock',wm:1,wf:.55,diff:{pre:30,acc:.2,dec:.08}},
  muscleDrag:{tyre:T_('runner',.12,.18,.75,.6,.6,1.0),tyreR:T_('slick',.14,.15,.85,.7,1.3,1.18),susp:'drag',shocks:'drag',wm:1,wmR:1.3,wf:.52,aero:[.02,.04],brake:'drag',diff:{spool:true}},
  hatch:  {tyre:T_('perf',.11,.14,.8,.6,.85,1.02),susp:'hatch',shocks:'stock',wm:.85,wf:.62,lock:.62},
  hatchB: {tyre:T_('gravel',.13,.16,.88,.85,.9,1.1),susp:'rally',shocks:'rally',wm:.9,wf:.58,aero:[.14,.2],lock:.62,diff:{pre:100,acc:.6,dec:.35}}
};
/* where the centre of gravity sits in the model's coordinates: x along the car, y up from the ground */
function cgOf(b){
  const B=BODIES[b.look.body||'suv'],rn=RUNNING[b.id]||RUNNING.stock,dy=b.look.lift+(b.look.tyre.R-B.R0),xr=B.L/2-(B.ovF+B.wb);
  return [xr+B.wb*rn.wf,HCG[b.look.body||'suv']+dy];
}
/* tyre grip, rolling resistance and bog drag for one tread */
function treadTables(tread){
  const rr=Object.assign({},SURF_RR),k=TREAD_RR_MUD[tread];rr.mud*=k;rr.water*=k;rr.ruts*=k;
  return {surfMu:TREAD_MU[tread],surfRR:rr,surfDrag:{mud:.06*k**1.5,water:.018*k,ruts:.012*k,sand:.014*k}};
}
/* sim: null for the first three levels; on the Sim level {cargo: kg on the roof, cg: whether roof loads move
   the centre of gravity} */
function buildChassis(i,sim=null){
  const b=BUILDS[i],l=b.look,rn=RUNNING[b.id]||RUNNING.stock,eg=ENGINE_OF[b.id]||ENGINE_OF.stock,sp=SUSP[rn.susp],B=BODIES[l.body||'suv'],D=suvDesign(l);
  const m=eg.mass,R=l.tyre.R,Rr=l.tyreR?l.tyreR.R:R,ty=rn.tyre,tyR=rn.tyreR||ty,hcg=cgOf(b)[1];
  const kF=44e3*sp.k*m/2150,kR=48e3*sp.k*m/2150,c0=Math.max(m*9.81*.5/2/kF,m*9.81*.5/2/kR),damp=SHOCKS[rn.shocks]||1,cs=Math.sqrt(kF*m/4);
  const tyre=t=>({mu:t.mu,kPk:t.kPk,aPk:t.aPk,slide:Math.min(1,t.slide),slideW:t.slideW,loadSens:.3});
  const d=rn.diff||{},aero=rn.aero||[.03,.05],bk=BRAKES[rn.brake||l.tyre.brake]||1,TF=treadTables(ty.tread),TR=treadTables(tyR.tread);
  /* the body for its inertia: the factory truck keeps Mini 4's numbers, the rest are measured off their models */
  let W=0;for(let u=0;u<=B.L;u+=.05)W=Math.max(W,D.plan(u)*2);
  const body=(l.body||'suv')==='suv'?{L:4.92,W:1.9,H:1.86}:{L:B.L,W,H:D.Hr};
  const c={name:b.id,mass:m,wb:B.wb,wf:rn.wf,hcg,trackF:l.track,trackR:l.trackR||l.track,R,Rr,
    Iw:1.6*Math.pow(R/.375,4)*ty.If*rn.wm,IwR:1.6*Math.pow(Rr/.375,4)*tyR.If*(rn.wmR||rn.wm),rcH:.2,
    susp:{rest:c0+sp.droop,travel:c0+sp.bump,kF,kR,cbF:cs*.55*damp,crF:cs*.85*damp,cbR:cs*.55*damp,crR:cs*.85*damp,arbF:sp.arbF,arbR:sp.arbR},
    body,tyre:tyre(ty),tyreR:rn.tyreR?tyre(tyR):null,
    brake:7200*Rr/.375*m/2150*bk,bias:.62,hbTorque:3200*Rr/.375,lock:rn.lock||.6,cdA:eg.cdA,clF:aero[0],clR:aero[1],
    diff:{pre:d.pre??40,acc:d.acc??.3,dec:d.dec??.15,rLock:!!d.spool,fLock:false,cLock:false,etc:d.etc||0,lowK:d.lowK||2.64,can:{r:(d.lockers||0)>=1,f:(d.lockers||0)>=2,low:!!d.low}},
    surfMu:TF.surfMu,surfRR:TF.surfRR,surfDrag:TF.surfDrag,tread:ty.tread,factoryTC:!!rn.tc};
  if(rn.tyreR){c.surfMuR=TR.surfMu;c.surfRRR=TR.surfRR;c.surfDragR=TR.surfDrag;c.treadR=tyR.tread;}
  c.tyreW=l.tyre.W||.25;c.tyreWR=(l.tyreR||l.tyre).W||c.tyreW;c.sim=simChassis(b,rn,c,D);
  /* on the Sim level the roof load (and any cargo) moves the centre of gravity, and the hull with it */
  const cg=cgOf(b);if(sim&&sim.cg){simLoad(c,sim.cargo||0);cg[1]=c.hcg;}
  c.cg=cg;c.hull=hullOf(b,D,cg);
  return c;
}
/* the hull, from the model's own lines: the sills and bumpers low down, the shoulders, the roof, the nose and
   tail and the belly, as points around the centre of gravity */
function hullOf(b,D,cg){
  const L=D.L,P=[],at=(u,y,z)=>P.push([D.X(u)-cg[0],y-cg[1],z]),mid=u=>(D.sill(u)+D.belt(u))/2;
  for(const f of [.05,.29,.53,.77,.985]){const u=f*L,z=D.plan(u)*.9;at(u,D.sill(u),-z);at(u,D.sill(u),z);}
  for(const f of [.04,.5,.96]){const u=f*L,z=D.plan(u)*.98;at(u,mid(u),-z);at(u,mid(u),z);}
  /* the roof: where the top line is within 15 cm of its highest (a rack or a cage stands above it) */
  let hi=0;for(let u=0;u<=L;u+=.02)hi=Math.max(hi,D.top(u));
  let u0=-1,u1=-1;for(let u=0;u<=L;u+=.02)if(D.top(u)>hi-.15){if(u0<0)u0=u;u1=u;}
  const above=b.look.roof==='rack'?.2:b.look.roof==='cage'?.1:0;
  for(const f of [.1,.9]){const u=u0+(u1-u0)*f,z=D.plan(u)*.75;at(u,D.top(u)+above,-z);at(u,D.top(u)+above,z);}
  at(.02,mid(.02),0);at(L-.02,mid(L-.02),0);at(L/2,D.sill(L/2)-.03,0);
  return P;
}
/* a build on four wheels */
function makeCar(i,world,sim=null){
  const b=BUILDS[i],c=buildChassis(i,sim),v=new Vehicle(c,specOf(i),world);
  v.build=b;v.bi=i;v.cg=c.cg;v.low=false;v.locked=false;v.pt.lo=1;v.pt.partShift=true;
  return v;
}
function setLow(v,on){const c=v.c.diff.can;if(!c.low)return false;v.low=on;v.pt.lo=on?v.c.diff.lowK:1;v.c.diff.cLock=on;return true;}
function setLockers(v,on){const c=v.c.diff.can;if(!c.r)return false;v.locked=on;v.c.diff.rLock=on&&c.r||!!(RUNNING[v.build.id].diff||{}).spool;v.c.diff.fLock=on&&c.f;return true;}
