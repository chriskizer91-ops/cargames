/* =====================================================================================
   EACH TRUCK ON ITS WHEELS. Dirt Sleeper's chassis rules (springs from ride height, shocks,
   sway bars, brakes scaled to the tyres, grip and rolling resistance per tread and surface)
   applied to the four Mini builds, with the body's real dimensions from the model.
   ===================================================================================== */
const HCG0=.74;                 /* centre of gravity above the ground, factory truck */
/* grip per tread and surface, rolling resistance, and how much more the bog drags each tread (Dirt Sleeper) */
/* allseason: the factory P245/65R17s, which get an AWD truck down a muddy country lane every spring.
   perf: the sleeper's street-legal performance tyres, a touch better on hard ground, much the same off it. */
const TREAD_MU={
  allseason:{concrete:1,strip:.84,dirt:.77,trail:.75,grass:.68,rock:.82,mud:.47,water:.47},
  perf:{concrete:1.08,strip:.92,dirt:.75,trail:.72,grass:.64,rock:.8,mud:.43,water:.45},
  mud:{concrete:.9,strip:.88,dirt:.86,trail:.86,grass:.8,rock:.9,mud:.68,water:.56},
  slick:{concrete:1.25,strip:.95,dirt:.62,trail:.52,grass:.45,rock:.62,mud:.24,water:.3}};
const SURF_RR={concrete:.012,strip:.02,dirt:.024,trail:.028,grass:.034,rock:.022,mud:.14,water:.09},TREAD_RR_MUD={allseason:1,perf:1.05,mud:.8,slick:1.35};
/* the running gear per build: tyre, ride, shocks, lockers, low range */
const RUNNING={
  stock:  {tyre:{tread:'allseason',kPk:.12,aPk:.15,slide:.82,slideW:.65,If:1},susp:'stock',  shocks:'stock', lockers:0,low:false,wm:1,   etc:1},
  sleeper:{tyre:{tread:'perf',kPk:.11,aPk:.13,slide:.8,slideW:.6,If:1.05},     susp:'lowered',shocks:'stock', lockers:0,low:false,wm:1.05,etc:1},
  crawler:{tyre:{tread:'mud',kPk:.15,aPk:.18,slide:.85,slideW:.8,If:1.1},   susp:'lift6',  shocks:'bypass',lockers:2,low:true, wm:1.15},
  race:   {tyre:{tread:'slick',kPk:.1,aPk:.12,slide:.75,slideW:.5,If:.9},   susp:'lowered',shocks:'bypass',lockers:0,low:false,wm:.95}};
const SUSP={lowered:{k:1.3,arb:1.4,droop:.06,bump:.06},stock:{k:1,arb:1,droop:.1,bump:.09},lift6:{k:.78,arb:.5,droop:.18,bump:.18}};
/* where the centre of gravity sits in the model's coordinates (x along the truck, y up from the ground) */
function cgOf(b){const B=SUVB,dy=b.look.lift+(b.look.tyre.R-B.R0),xr=B.L/2-(B.ovF+B.wb);return [xr+B.wb*(1.44/2.89),HCG0+dy];}
function buildChassis(b){
  const T=TUNE,rn=RUNNING[b.id]||RUNNING.stock,ty=rn.tyre,eg=ENGINE_OF[b.id]||ENGINE_OF.stock,sp=SUSP[rn.susp],R=b.look.tyre.R;
  const m=eg.mass*T.mass,hcg=cgOf(b)[1],kMul=sp.k*T.spring,arbMul=sp.arb*T.arb,kF=44e3*kMul*m/2150,kR=48e3*kMul*m/2150;
  const c0=Math.max(m*9.81*.5/2/kF,m*9.81*.5/2/kR),damp=(rn.shocks==='bypass'?1.35:1)*T.damp,cs=Math.sqrt(kF*m/4),rr=Object.assign({},SURF_RR);
  rr.mud*=TREAD_RR_MUD[ty.tread];rr.water*=TREAD_RR_MUD[ty.tread];
  return {name:b.id,mass:m,wb:SUVB.wb,wf:1.44/2.89,hcg,trackF:b.look.track,trackR:b.look.track,R,Iw:1.6*Math.pow(R/.375,4)*ty.If*rn.wm,rcH:T.roll,
    susp:{rest:c0+sp.droop,travel:c0+sp.bump,kF,kR,cbF:cs*.55*damp,crF:cs*.85*damp,cbR:cs*.55*damp,crR:cs*.85*damp,arbF:24e3*arbMul,arbR:14e3*arbMul},
    body:{L:4.92,W:1.9,H:1.86},
    tyre:{mu:1,kPk:ty.kPk,aPk:ty.aPk,slide:Math.min(1,ty.slide*T.slide),slideW:ty.slideW,loadSens:.1},
    brake:7200*R/.375*m/2150*T.brake,bias:.62,hbTorque:3200*R/.375,lock:.6*T.lock,cdA:eg.cdA,clF:.03,clR:.05,
    diff:{pre:40,acc:.3,dec:.15,rLock:false,fLock:false,cLock:false,etc:rn.etc||0,can:{r:rn.lockers>=1,f:rn.lockers>=2,low:rn.low}},
    surfMu:TREAD_MU[ty.tread],surfRR:rr,surfDrag:{mud:.06*TREAD_RR_MUD[ty.tread]**1.5,water:.018*TREAD_RR_MUD[ty.tread]},tread:ty.tread};
}
/* a build on four wheels: the Vehicle with this truck's tyres, surfaces, lockers, low range and a hull the shape of its body */
function makeTruck(i,world){
  const b=BUILDS[i],ch=buildChassis(b),e=engineSpec(b),v=new Vehicle(ch,e,world),[xc,hc]=cgOf(b),dy=b.look.lift+(b.look.tyre.R-SUVB.R0);
  v.surfMu=ch.surfMu;v.surfRR=ch.surfRR;v.surfDrag=ch.surfDrag;v.build=b;v.bi=i;v.cg=[xc,hc];v.hull=[];
  const P=(x,y,z)=>v.hull.push([x-xc,y+dy-hc,z]);
  for(const x of [2.40,1.05,-.15,-1.35,-2.42])for(const z of [-.84,.84])P(x,Math.abs(x)>2.3?.46:.33,z);
  for(const x of [2.3,.45,-2.3])for(const z of [-.92,.92])P(x,.85,z);
  const roofY=b.look.roof==='rack'?2.02:1.82;for(const x of [.25,-1.95])for(const z of [-.7,.7])P(x,roofY,z);
  P(2.48,.62,0);P(-2.5,.62,0);P(0,.3,0);
  v.low=false;v.locked=false;v.pt.lo=1;v.tuned=v.pt.tuned=true;
  return v;
}
function setLow(v,on){const c=v.c.diff.can;if(!c.low)return false;v.low=on;v.pt.lo=on?2.64:1;v.c.diff.cLock=on;return true;}
function setLockers(v,on){const c=v.c.diff.can;if(!c.r)return false;v.locked=on;v.c.diff.rLock=on&&c.r;v.c.diff.fLock=on&&c.f;return true;}
/* a flat, endless test ground */
class FlatWorld{
  constructor(surf='dirt'){this.surf=surf;}
  locate(){return {i:0,s:0,d:0};}
  ground(){return {y:0,n:[0,1,0],surf:this.surf,i:0};}
  raycast(o,d,maxT){if(d[1]>-1e-4)return null;const t=-o[1]/d[1];return t<0||t>maxT?null:{t,p:[o[0]+d[0]*t,0,o[2]+d[2]*t],n:[0,1,0],surf:this.surf,i:0};}
  wall(){return null;}
}
