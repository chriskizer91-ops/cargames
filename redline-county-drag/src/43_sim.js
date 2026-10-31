/* =====================================================================================
   SIM: the fourth driving level. Realistic is the car as it is; Sim is the car as it is AND the world
   as it is. Everything here only acts when a car is on the Sim level (Vehicle.sim); on the other three
   levels the physics is exactly as before (tools/physcheck.js).

   What Sim adds, and why:
   - True load transfer. The tyres' side forces reach the body through the suspension links, whose
     lines meet at the roll centre (20 cm up). Realistic applies the side force there, which rolls the
     body the right amount but leaves out the share of the weight transfer that goes straight through
     the links. Sim puts it back (the links' vertical pull, "jacking"), so the outside tyres carry the
     whole m*a*h/track and the truck tips at its real static stability factor (track / 2h: about 1.1 g
     for the SUV, 1.7 for the coupe). Drive and brake forces act at the ground, so the full m*a*h/L
     goes front to back too.
   - Soil trip. A tyre sliding sideways across dirt, gravel, grass or mud ploughs a berm in front of it.
     The berm builds over about half a metre of sideways travel and pushes back at ground level, past
     what the tyre's friction alone could give. That is how most real rollovers start (NHTSA: about 95%
     of single-vehicle rollovers are "tripped").
   - Edge catch. A sliding tyre feels the ground at its leading shoulder: a rut wall, a ditch lip or a
     ledge beside it catches the sidewall and shoves back.
   - Shocks that behave like shocks: firmer at low shaft speed (body control in a swerve), softer at
     high speed (sharp hits), and they heat up and fade when worked hard (whoops at speed). Bypass and
     rally dampers hold out far longer than stock ones.
   - Centre of gravity from what's on the roof: the expedition rack, a cage, spares in the bed and any
     cargo you load raise it, and add roll inertia.
   - Tyre load sensitivity closer to measured road tyres (grip per kilo falls less with load).
   - Tyre pressure: air down for mud, sand, grass and rock (a longer, softer footprint floats and
     wraps), air up for the road. Aired down on tarmac the steering goes vague, the rolling drag rises,
     the sidewalls roll under in hard turns, and pushed too hard a tyre can come off the bead.
   - Weather: wet tarmac keeps about 60-70% of its grip, wet grass and clay far less, and at speed in
     standing water the tyres aquaplane (NASA's 10.35*sqrt(psi) mph, sooner on slicks and worn treads).
   - Brake fade. Each rotor heats with the power its brake takes in and cools with airflow; past its
     pads' working range the brakes fade. A 60-0 stop warms the front rotors about 50 C.
   - The body against the ground: a roof skids on tarmac and digs into dirt and mud.
   - The car's own era: ABS only on cars that had it.
   Ported from Dirt Sleeper Sim into Mini Dirt Run Solo, with the machines' tyres added (a quad's knobbies run at
   about 5 psi, a semi's at 105) and no ABS on the quads, the side-by-side, the golf cart, the kart or the tractor.
   ===================================================================================== */
/* how hard each surface ploughs back at a tyre sliding sideways across it (share of the tyre's load) */
const SIM_PLOW={dirt:.5,trail:.45,grass:.36,gravel:.55,mud:.5,ruts:.5,strip:.2,water:.12,rock:0,asphalt:0,concrete:0};
/* faces that don't give when a tyre hits them sideways (kerbs, ledges); dirt and mud walls crumble */
const SIM_RIGID={rock:1,concrete:1,asphalt:1};
/* the body sliding on the ground: friction per surface */
const SIM_BODYMU={asphalt:.42,concrete:.42,strip:.55,dirt:.7,trail:.66,grass:.55,gravel:.62,rock:.5,mud:.75,ruts:.7,water:.35};
/* grip in the wet, per surface (at full rain), and how each tread copes on hard wet ground and in water */
const SIM_WET={asphalt:.64,concrete:.66,strip:.56,dirt:.52,trail:.56,grass:.45,rock:.66,mud:.92,water:1,gravel:.86,ruts:.84};
const SIM_HARD={asphalt:1,concrete:1,strip:1};
const TREAD_WET={allseason:1,perf:.97,mud:.9,slick:.7,at:.96,gravel:.95,drag:.75,runner:.9,knobby:.88,paddle:.75,flat:.85,kart:.7,kartDirt:.85,ag:.8,rib:.95,turf:.85,truck:.98};
const TREAD_AQUA={allseason:1,perf:.95,mud:1.08,slick:.82,at:1.04,gravel:1,drag:.8,runner:.92,knobby:1.1,paddle:1.1,flat:.95,kart:.82,kartDirt:1,ag:1.1,rib:1,turf:.95,truck:1};
/* each tread's road pressure (psi) */
const TREAD_PSI={allseason:35,perf:36,mud:32,slick:26,at:34,gravel:30,drag:16,runner:32,knobby:5,paddle:4,flat:7,kart:12,kartDirt:10,ag:16,rib:28,turf:18,truck:105};
/* how much a softer footprint helps on each surface (per unit of pressure let out) */
const SIM_SOFT={mud:.42,ruts:.36,water:.22,grass:.24,dirt:.16,trail:.2,gravel:.12,strip:.05,rock:.32,asphalt:0,concrete:0};
/* damper heat: how much heat a shock soaks up per degree (J/K); bigger bodies and reservoirs fade later */
const SHOCK_HEAT={stock:1500,sport:1800,bypass:5200,rally:4200,race:2600,drag:1500};
/* where the pads start to fade (C) */
const BRAKE_FADE={stock:330,big:420,race:560,drag:300};
/* ABS by era: the 1970 car, its drag build and the 1980s hatches never had it */
const SIM_NOABS={muscle:1,muscleDrag:1,hatch:1,hatchB:1,quad90:1,quad450:1,quadUtil:1,sxs:1,golf:1,kart:1,tractor:1};
/* the player's Sim settings. air: the tyres' pressure as a share of their road pressure; wx: the weather;
   cargo: what's strapped to the roof (cars with rails, bars or a rack) */
const SIM_AIR=[['down','Aired down',.45,'About 15 psi: floats on mud, grass and sand and wraps over rock. Vague and draggy on tarmac, and hard turns can roll the tyre off its rim.'],
  ['road','Road',1,'Each tyre at its road pressure.'],
  ['up','Aired up',1.2,'A few psi over: sharper steering and less drag on the road, a smaller, harder footprint everywhere else.']];
const SIM_WX=[['dry','Dry',0,'Dry ground.'],['damp','Damp',.35,'After a shower: the tarmac is a little slick, the grass and clay more so.'],
  ['wet','Rain',.7,'Raining: wet tarmac keeps about two thirds of its grip, wet grass and clay much less, and standing water can float the tyres at highway speed.'],
  ['storm','Downpour',1,'Pouring: everything is slick, and at speed the tyres aquaplane.']];
const SIM_CARGO=[['none','Empty',0,'Nothing on the roof.'],['light','Light',40,'A cargo box with some gear, 40 kg.'],['heavy','Heavy',120,'A roof-top tent and gear, 120 kg: well past most roofs\' rated load, and it raises the centre of gravity.']];
const SIMSET={air:'road',wx:'dry',cargo:'none'};
try{const s=JSON.parse(store.get('cc-sim','{}'))||{};
  if(SIM_AIR.some(a=>a[0]===s.air))SIMSET.air=s.air;if(SIM_WX.some(a=>a[0]===s.wx))SIMSET.wx=s.wx;if(SIM_CARGO.some(a=>a[0]===s.cargo))SIMSET.cargo=s.cargo;}catch(e){}
const saveSim=()=>store.set('cc-sim',JSON.stringify(SIMSET));
const simVal=(T,k)=>(T.find(a=>a[0]===k)||T[1]||T[0])[2];
/* the developer's Sim switches: each piece on or off */
const SIMDEV={jack:1,trip:1,edge:1,shocks:1,cg:1,fade:1,body:1,abs:1,press:1,wet:1,
  /* and the strengths: tyre load sensitivity, how hard soil ploughs back, sway bars and shocks (1 = as built) */
  ls:.3,plow:1,arb:1,damp:1,
  /* when a tyre counts as sliding sideways enough to plough: sideways speed (m/s) and slip angle (tan) where it starts */
  pv0:2.5,pa0:.6};
const SIMDEV0=Object.assign({},SIMDEV);
/* the roof load a build carries: kilograms and how high (metres above the ground at factory height) */
function roofLoadOf(b,D){
  /* a machine has no roof (34_machines) */
  if(!D)return {items:[],top:0,canCargo:false};
  const l=b.look,ex=l.extras||[];let top=0;for(let u=0;u<=D.L;u+=.05)top=Math.max(top,D.top(u));
  const items=[];
  /* (factory rails and crossbars are in the body's own centre of gravity already) */
  if(l.roof==='rack')items.push([85,top+.22]);
  if(ex.includes('flatRack'))items.push([32,top+.1]);
  if(ex.includes('cage'))items.push([55,top*.8]);
  if(ex.includes('roofBar'))items.push([9,top+.05]);
  if(ex.includes('bedCage'))items.push([115,1.25]);
  /* only cars with something to strap it to carry cargo */
  const canCargo=l.roof==='rack'||l.roof==='rails'||l.roof==='bars'||ex.includes('flatRack');
  return {items,top,canCargo};
}
/* the Sim numbers a chassis carries (always built; only read on the Sim level) */
function simChassis(b,rn,c,D){
  const ty=rn.tyre,tyR=rn.tyreR||ty,bk=rn.brake||b.look.tyre.brake||'stock',rl=roofLoadOf(b,D);
  return {psiF:TREAD_PSI[ty.tread]||34,psiR:TREAD_PSI[tyR.tread]||34,treadF:ty.tread,treadR:tyR.tread,
    abs:!(b.machine&&SIM_NOABS[b.car])&&!SIM_NOABS[b.id],shC:SHOCK_HEAT[rn.shocks]||1500,Tf:BRAKE_FADE[bk]||380,
    /* rotor heat capacity (J/K): a ten-kilo iron front rotor on the factory truck, scaled with the car and its brakes */
    Cb:[4600*c.mass/2150*({stock:1,big:1.25,race:1.5,drag:.8}[bk]||1),2800*c.mass/2150*({stock:1,big:1.2,race:1.45,drag:.9}[bk]||1)],
    roof:rl.items,canCargo:rl.canCargo,roofTop:rl.top};
}
/* move a chassis's centre of gravity for its roof load and cargo: hcg up, mass and roll inertia added */
function simLoad(c,cargoKg){
  const S=c.sim,h0=c.hcg;let h=h0,I=0;
  /* the build's own roof parts are already in its weight, but not in its body's factory centre of gravity:
     move the centre up by each part's share of the mass times how far above it the part sits */
  for(const [kg,y] of S.roof){h+=kg*(y-h0)/c.mass;I+=kg*(y-h0)*(y-h0);}
  /* cargo adds weight as well */
  if(cargoKg&&S.canCargo){const y=S.roofTop+.25,M=c.mass+cargoKg;h=(h*c.mass+cargoKg*y)/M;I+=cargoKg*(y-h0)*(y-h0);c.mass=M;}
  c.hcg=h;c.simRollI=I;
  return c;
}
/* a tyre at a pressure (pr: share of its road pressure): softer has more slip before it peaks (vaguer), firmer less */
function simTyre(t,pr,ls){
  const o=Object.assign({},t),d=1-pr;
  o.aPk=t.aPk*(d>0?1+.55*d:1+.6*d);o.kPk=t.kPk*(d>0?1+.35*d:1+.3*d);
  o.loadSens=ls;
  return o;
}
/* grip on a surface from the pressure (pr) and the rain (wet 0..1), for a tread, at speed v */
function simGrip(surf,tread,pr,wet,v,psi){
  let g=1;const d=1-pr,hard=SIM_HARD[surf];
  /* the footprint: a softer tyre floats and wraps on loose ground, and gives a little away on tarmac */
  if(hard)g*=d>0?1-.12*d*d:1-.05*(-d);
  else g*=clamp(1+(SIM_SOFT[surf]||0)*d,.82,1.3);
  if(wet>0){
    g*=1-(1-(SIM_WET[surf]??.8))*wet;
    if(hard){g*=1-(1-(TREAD_WET[tread]||1))*wet;
      /* aquaplaning in standing water: NASA's 10.35*sqrt(psi) mph, sooner on slicks and bald treads */
      const vhp=10.35*Math.sqrt(psi*pr)*.447*(TREAD_AQUA[tread]||1),k=clamp((wet-.4)/.6,0,1);
      if(k>0)g*=1-.5*k*sstep(.8*vhp,1.15*vhp,v);}
  }
  return g;
}
/* rolling drag from the pressure: more on hard ground when soft, less on soft ground */
const simRR=(surf,pr)=>SIM_HARD[surf]||surf==='rock'?Math.pow(pr,-.7):Math.pow(pr,.5);
