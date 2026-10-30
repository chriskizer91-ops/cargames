/* =====================================================================================
   THE ENGINES. Each build's engine is a Digital Engine spec, built by the lab's own
   SIM.makeSpec from a base engine plus bolt-ons, the same way Dirt Sleeper builds them (its
   ENGINES table and buildSpec). Nothing here touches the synth: it only says what engine it is.
   ===================================================================================== */
const DE_ENGINES={
  /* the 4.6 three-valve as the real one pulls: 300 lb-ft at about 3,950 rpm and still 290 hp at 5,750, a 5,900 redline
     (Mini Dirt Run Solo's change, so the stock SUV drives like the truck it's modelled on; the sound is untouched) */
  v46: {layout:'V8',disp:4.6,redline:5900,idle:650,tq:407,cP:.67,cW:.49,cA:.65,Ie:.2,crackle:.12,limiter:'soft'},
  bb74:{layout:'V8',disp:7.4,redline:6300,idle:750,tq:660,cP:.6,cW:.52,cA:.62,Ie:.3,crackle:.4,limiter:'hard'},
  tt35:{layout:'V6',disp:3.5,redline:6800,idle:750,tq:330,cP:.6,cW:.5,cA:.55,Ie:.15,fi:'twin',boost:1.1,tsize:1,bov:'valve',crackle:.4,limiter:'hard'},
  /* the star SUVs' engines (Oct 30: the owner wanted the Sleeper and the Rock & Mud to be the fastest things in the
     game): the twin-turbo V6 built to 3.8 with forged internals and bigger turbos, and a 10.4 big-block (a 632) for the
     Roots blower */
  tt38:{layout:'V6',disp:3.8,redline:7200,idle:800,tq:650,cP:.62,cW:.5,cA:.55,Ie:.17,fi:'twin',boost:1.4,tsize:2,bov:'valve',crackle:.5,limiter:'hard'},
  bb104:{layout:'V8',disp:10.4,redline:6300,idle:700,tq:1400,cP:.58,cW:.55,cA:.62,Ie:.42,crackle:.45,limiter:'hard'},
  /* the 4x4's lazy truck six, the V8 that gets swapped into it, the coupe's flat-plane and the wagon's turbo five */
  i40: {layout:'I6',disp:4.0,redline:5400,idle:700,tq:320,cP:.55,cW:.55,cA:.6,Ie:.2,crackle:.1,limiter:'soft'},
  v62: {layout:'V8',disp:6.2,redline:6400,idle:750,tq:610,cP:.6,cW:.5,cA:.55,Ie:.25,crackle:.35,limiter:'hard'},
  fp52:{layout:'V8F',disp:5.2,redline:8250,idle:950,tq:560,cP:.72,cW:.45,cA:.5,Ie:.15,crackle:.35,limiter:'hard'},
  i525:{layout:'I5',disp:2.5,redline:6500,idle:800,tq:330,cP:.6,cW:.5,cA:.5,Ie:.14,fi:'turbo',boost:.9,tsize:1,bov:'valve',crackle:.2,limiter:'soft'},
  /* the pickup's 5.7, the muscle car's 7.0 big-block, the hatch's turbo four */
  v57: {layout:'V8',disp:5.7,redline:5800,idle:650,tq:520,cP:.58,cW:.55,cA:.6,Ie:.24,crackle:.15,limiter:'soft'},
  bb72:{layout:'V8',disp:7.0,redline:6200,idle:750,tq:640,cP:.6,cW:.52,cA:.6,Ie:.3,crackle:.3,limiter:'soft'},
  i18t:{layout:'I4',disp:1.8,redline:7000,idle:900,tq:250,cP:.58,cW:.48,cA:.45,Ie:.11,fi:'turbo',boost:.9,tsize:1,bov:'flutter',crackle:.3,limiter:'hard'}
};
const DE_GEARS={auto6:[4.17,2.34,1.52,1.14,.87,.69],race4:[2.76,1.57,1,.72],seq6:[2.9,2.1,1.66,1.37,1.16,1],auto4:[2.8,1.55,1,.7],auto5:[3.6,2.19,1.41,1,.83],man6:[3.0,2.07,1.43,1.0,.84,.62],man4:[2.52,1.88,1.46,1.0],man5:[3.3,1.94,1.29,.97,.78],rally5:[3.0,2.1,1.6,1.28,1.05]};
const DE_SHIFT={auto6:.35,race4:.11,seq6:.06,auto4:.5,auto5:.4,man6:.3,man4:.32,man5:.3,rally5:.09};
/* the recipes. power: none | bigturbo (V6) | roots | twin. exhaust: stock | headers | side.
   intake: 0 airbox, 1 cold air, 2 ram air. cam and tune 0..3 and 0..2. nos: 0, 1 = 35-shot .. 4 = 250-shot */
const ENGINE_OF={
  stock:  {desc:'The factory 4.6 V8 with its airbox and muffler, a six-speed automatic and 3.73 gears.',engine:'v46', power:'none',    intake:0,exhaust:'stock',  cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,mass:2180,cdA:1.25,mu:1.0},
  sleeper:{desc:'Built 3.8 twin-turbo V6 with bigger turbos, ram air, long-tube headers, a race tune and a 250-shot of nitrous. Race four-speed with a trans-brake, 3.55 gears.',engine:'tt38',power:'bigturbo',intake:2,exhaust:'headers',cam:0,tune:2,nos:4,trans:'race4',axle:3.55,mass:2090,cdA:1.2, mu:1.15},
  crawler:{desc:'10.4 big-block (a 632) with a Roots blower, race cam, ram air, headers, a race tune and a 35-shot. Race four-speed with a trans-brake, 4.10 gears.',engine:'bb104',power:'roots',   intake:2,exhaust:'headers',cam:2,tune:2,nos:1,trans:'race4',axle:4.10,mass:2480,cdA:1.55,mu:.95},
  race:   {desc:'7.4 big-block with twin turbos, a wild cam, ram air, side exits, a race tune and a 250-shot. Six-speed sequential with straight-cut gears.',engine:'bb74',power:'twin',    intake:2,exhaust:'side',   cam:3,tune:2,nos:4,trans:'seq6', axle:3.73,mass:1960,cdA:1.3, mu:1.45},
  trail:  {desc:'The factory 4.0 inline-six, a four-speed automatic, a two-speed transfer case and 4.10 gears.',engine:'i40',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto4',axle:4.10,mass:1620,cdA:1.25,mu:1.0},
  trailRig:{desc:'A 6.2 V8 swapped in with a cam, a cold-air intake, headers and a tune. Four-speed automatic, 4.88 gears and lockers.',engine:'v62',power:'none',intake:1,exhaust:'headers',cam:2,tune:1,nos:0,trans:'auto4',axle:4.88,mass:1880,cdA:1.4,mu:.95},
  coupe:  {desc:'The factory 5.2 flat-plane V8, revving past 8,000, a six-speed manual and 3.73 gears, driving the rear wheels.',engine:'fp52',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man6',axle:3.73,mass:1560,cdA:.72,mu:1.15,drv:'RWD'},
  coupeGT:{desc:'The flat-plane bored to 5.5 with ram air, a wild cam, side pipes and a race tune. Six-speed sequential with straight-cut gears.',engine:'fp52',disp:5.5,power:'none',intake:2,exhaust:'side',cam:3,tune:2,nos:0,trans:'seq6',axle:3.91,mass:1340,cdA:.85,mu:1.55,drv:'RWD'},
  wagon:  {desc:'The factory 2.5 turbo five, a five-speed automatic, all-wheel drive and 3.5 gears. Nothing on the outside says so.',engine:'i525',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto5',axle:3.5,mass:1640,cdA:.78,mu:1.0},
  pickup: {desc:'The factory 5.7 V8, a six-speed automatic, a two-speed transfer case and 3.73 gears.',engine:'v57',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,mass:2500,cdA:1.6,mu:1.0},
  prerunner:{desc:'A 6.2 V8 with a cold-air intake, long-tube headers, a cam and a tune, breathing out of a stack in the bed. Six-speed automatic and 4.56 gears.',engine:'v62',power:'none',intake:1,exhaust:'headers',cam:2,tune:2,nos:0,trans:'auto6',axle:4.56,mass:2350,cdA:1.7,mu:1.0},
  muscle: {desc:'A 7.0 big-block with a mild cam and a four-barrel, a four-speed manual and 3.73 gears, rear-drive.',engine:'bb72',power:'none',intake:0,exhaust:'stock',cam:1,tune:0,nos:0,trans:'man4',axle:3.73,mass:1650,cdA:1.0,mu:1.0,drv:'RWD'},
  muscleDrag:{desc:'A 7.4 big-block under a Roots blower and a bug-catcher hat, a full race cam, headers out the sides and a race tune. Race four-speed with a trans-brake and 4.56 gears, on slicks.',engine:'bb74',power:'roots',hat:'bug',intake:2,exhaust:'side',cam:3,tune:2,nos:0,trans:'race4',axle:4.56,mass:1450,cdA:1.05,mu:1.65,drv:'RWD'},
  hatch:  {desc:'The homologation 1.8 turbo four, mounted across the nose, a five-speed manual and four-wheel drive.',engine:'i18t',mount:'trans',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man5',axle:4.1,mass:1180,cdA:.8,mu:1.0},
  hatchB: {desc:'The four on a huge turbo with anti-lag, ram air, a straight-through exhaust, a race cam and a race tune. Five-speed dog box, four-wheel drive, gravel tyres.',engine:'i18t',mount:'trans',power:'bigturbo',antilag:1,intake:2,exhaust:'straight',cam:2,tune:2,nos:0,trans:'rally5',axle:4.4,mass:1050,cdA:.95,mu:1.1},
  wagonSleeper:{desc:'The five on a big single turbo with a cold-air intake, a straight-through exhaust, a cam, a race tune and a 75-shot. Race four-speed with a trans-brake, 4.10 gears.',engine:'i525',power:'bigturbo',intake:1,exhaust:'straight',cam:2,tune:2,nos:2,trans:'race4',axle:4.10,mass:1580,cdA:.78,mu:1.25}
};
function engineSpec(b){
  const r=ENGINE_OF[b.id]||ENGINE_OF.stock,base=Object.assign({},DE_ENGINES[r.engine]);let k=1;
  if(r.disp){k*=r.disp/base.disp;base.disp=r.disp;}
  /* (the cars' intake, exhaust and cam are in the else below, as in MDRS: run for a machine they turned its
     'pipe' exhaust into NaN torque and took its cam away) */
  if(base.exMap){
    /* a machine (34_machines) keeps its own voice: its intake and exhaust codes are the lab's, the parts only
       change which of its own pipes it breathes out of and how much it makes */
    k*=[1,1.04,1.06][r.intake]||1;base.ex=base.exMap[r.exhaust]??base.exMap.stock;k*={stock:1,pipe:1.07,stacks:1.04}[r.exhaust]||1;
    if(base.cam!==undefined&&r.cam){base.cam=r.cam;k*=[1,1.03,1.06,1.08][r.cam];}
    if(base.tuneRpm)base.redline+=base.tuneRpm[r.tune]||0;
    else if(!base.tuneGov){k*=[1,1.05,1.1][r.tune];if(r.tune===2){base.limiter='hard';base.crackle=Math.max(base.crackle,.5);}}
  }else{
  k*=[1,1.03,1.05][r.intake];base.intake=r.intake;
  base.ex={stock:0,catback:1,headers:2,straight:3,side:3,stacks:9}[r.exhaust];k*={stock:1,catback:1.03,headers:1.07,straight:1.06,side:1.06,stacks:1.06}[r.exhaust];
  if(base.layout!=='V6'){base.cam=r.cam;k*=[1,1.03,1.06,1.08][r.cam];base.cP+=.03*r.cam;base.redline+=150*r.cam;}
  k*=[1,1.05,1.1][r.tune];base.redline+=[0,150,300][r.tune];if(r.tune===2){base.limiter='hard';base.crackle=Math.max(base.crackle,.65);}}
  if(r.power==='roots'){base.fi='roots';base.boost=.72;}
  else if(r.power==='twin'){base.fi='twin';base.boost=.95;base.tsize=1;base.bov='flutter';}
  else if(r.power==='bigturbo'){base.boost+=.5;base.tsize=2;}
  /* a single turbo bolted to an engine that never had one (MDRS's garage) */
  else if(r.power==='turbo'){base.fi='turbo';base.boost=.8;base.tsize=1;base.bov='valve';}
  base.tq=Math.round(base.tq*k);base.nos=r.nos;
  if(r.trans==='race4'){base.launch=1;base.launchRpm=Math.round(base.redline*.55);}
  if(r.trans==='seq6'||r.trans==='rally5'){base.seq=1;base.gearWhine=1;}
  /* anti-lag keeps the turbo lit off the throttle: bangs and flames on every lift */
  if(r.antilag){base.antilag=1;base.crackle=Math.max(base.crackle,.95);}
  /* the sim turns the driven wheels: on a car with bigger tyres at the back, those */
  const gears=DE_GEARS[r.trans],R=(r.drv==='FWD'?b.look.tyre:b.look.tyreR||b.look.tyre).R;
  /* the dyno's setup sheet (63_dyno_lab): the lab's own numbers, changed by hand on one car's engine, over what its
     parts made (src0 is what the parts made, src what the synth and the physics are given) */
  Object.assign(base,{id:b.id,name:b.name,machine:'car',mass:r.mass,drv:r.drv||'AWD',R,gears,cdA:r.cdA,mu:r.mu,horn:base.horn||'car'});
  const src0=Object.assign({},base),tk=tuneKey(b),tn=tk&&TUNE[tk];if(tn)Object.assign(base,tn);
  const e=SIM.makeSpec(base);e.src0=src0;e.src=Object.assign({},base);e.tuned=!!tn;
  e.gears=gears.slice();e.nG=gears.length;e.fd=r.axle;e.shiftT=DE_SHIFT[r.trans];e.R=R;
  /* the automatics and the race four-speed pull away through a torque converter; the manuals, sequentials
     and the rally dog box through a clutch (the game's physics reads this) */
  e.conv=/^auto|^race4|^cvt/.test(r.trans);
  /* Back Forty: a machine's spec says so, and only machines take Mini Dirt Run Solo's phase-2 gearbox fixes (40_physics),
     so the cars stay bit for bit what they were */
  if(b.machine)e.mach=true;
  /* a box with crawler gears pulls away in a working gear: the semi bobtailing in third, the tractor in second */
  e.startG={truck10:3,trac6:2}[r.trans]||1;
  /* a belt CVT: its low and high ratios against the final drive, the revs it engages at and the revs it holds floored */
  if(/^cvt/.test(r.trans)){const pk=e.peak&&e.peak.rpm||e.redline*.85;e.cvt={lo:3,hi:1,eng:Math.max(e.idle*1.7,e.redline*.38),top:Math.min(pk*1.02,e.redline*.97)};}
  return e;
}
const SPECS={};
/* a hand-tuned engine is kept per car and per the engine parts it was tuned on (paint and tyres don't lose it) */
const TUNE=(()=>{try{const T=JSON.parse(store.get('cc-tune','{}'))||{};
  for(const k in T){const o=T[k];if(!o||typeof o!=='object'){delete T[k];continue;}for(const q in o)if(typeof o[q]==='number'&&!isFinite(o[q])||o[q]===null)delete o[q];}return T;}catch(e){return {};}})();
const tuneKey=b=>b&&b.rig&&b.car?b.car+'|'+['engine','power','intake','exhaust','cam','tune','nos','trans','axle'].map(k=>b.rig[k]).join('|'):'';
const saveTune=()=>store.set('cc-tune',JSON.stringify(TUNE));
const specOf=i=>{const b=BUILDS[i];return SPECS[b.id]||(SPECS[b.id]=engineSpec(b));};
/* the Plus tune: the same engine with k times the torque at every rev (so k times the power), and the final drive
   g times taller (1: as built), everything else as built. engTq scales with e.tq, so the gearbox, the limiter, the
   sound and the lab's dyno all follow; one copy per spec and setting */
const PLUS_SPECS=new WeakMap();
function plusSpec(e,k,g=1){const key=k.toFixed(3)+'/'+g.toFixed(3);let m=PLUS_SPECS.get(e);if(!m)PLUS_SPECS.set(e,m=new Map());
  let p=m.get(key);if(p)return p;
  p=Object.assign({},e,{tq:e.tq*k,fd:e.fd/g,plusK:k,plusG:g});if(e.peak)p.peak=Object.assign({},e.peak,{hp:e.peak.hp*k,tq:e.peak.tq*k,kw:(e.peak.kw||0)*k});
  m.set(key,p);return p;}

