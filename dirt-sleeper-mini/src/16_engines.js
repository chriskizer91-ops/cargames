/* =====================================================================================
   THE ENGINES. Each build's engine is a Digital Engine spec, built by the lab's own
   SIM.makeSpec from a base engine plus bolt-ons, the same way Dirt Sleeper builds them (its
   ENGINES table and buildSpec). Nothing here touches the synth: it only says what engine it is.
   ===================================================================================== */
const DE_ENGINES={
  v46: {layout:'V8',disp:4.6,redline:5800,idle:650,tq:407,cP:.62,cW:.55,cA:.65,Ie:.2,crackle:.12,limiter:'soft'},
  bb74:{layout:'V8',disp:7.4,redline:6300,idle:750,tq:660,cP:.6,cW:.52,cA:.62,Ie:.3,crackle:.4,limiter:'hard'},
  tt35:{layout:'V6',disp:3.5,redline:6800,idle:750,tq:330,cP:.6,cW:.5,cA:.55,Ie:.15,fi:'twin',boost:1.1,tsize:1,bov:'valve',crackle:.4,limiter:'hard'},
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
const DE_SHIFT={auto6:.42,race4:.11,seq6:.06,auto4:.5,auto5:.4,man6:.3,man4:.32,man5:.3,rally5:.09};
/* the recipes. power: none | bigturbo (V6) | roots | twin. exhaust: stock | headers | side.
   intake: 0 airbox, 1 cold air, 2 ram air. cam and tune 0..3 and 0..2. nos: 0, 1 = 35-shot .. 4 = 250-shot */
const ENGINE_OF={
  stock:  {desc:'The factory 4.6 V8 with its airbox and muffler, a six-speed automatic and 3.73 gears.',engine:'v46', power:'none',    intake:0,exhaust:'stock',  cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,mass:2180,cdA:1.25,mu:1.0},
  sleeper:{desc:'Twin-turbo 3.5 V6 with bigger turbos, ram air, long-tube headers, a race tune and a 250-shot of nitrous. Race four-speed with a trans-brake, 4.56 gears.',engine:'tt35',power:'bigturbo',intake:2,exhaust:'headers',cam:0,tune:2,nos:4,trans:'race4',axle:4.56,mass:2090,cdA:1.2, mu:1.15},
  crawler:{desc:'7.4 big-block with a Roots blower, race cam, ram air, headers, a race tune and a 35-shot. Race four-speed with a trans-brake, 5.38 gears.',engine:'bb74',power:'roots',   intake:2,exhaust:'headers',cam:2,tune:2,nos:1,trans:'race4',axle:5.38,mass:2480,cdA:1.55,mu:.95},
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
  k*=[1,1.03,1.05][r.intake];base.intake=r.intake;
  base.ex={stock:0,catback:1,headers:2,straight:3,side:3,stacks:9}[r.exhaust];k*={stock:1,catback:1.03,headers:1.07,straight:1.06,side:1.06,stacks:1.06}[r.exhaust];
  if(base.layout!=='V6'){base.cam=r.cam;k*=[1,1.03,1.06,1.08][r.cam];base.cP+=.03*r.cam;base.redline+=150*r.cam;}
  k*=[1,1.05,1.1][r.tune];base.redline+=[0,150,300][r.tune];if(r.tune===2){base.limiter='hard';base.crackle=Math.max(base.crackle,.65);}
  if(r.power==='roots'){base.fi='roots';base.boost=.72;}
  else if(r.power==='twin'){base.fi='twin';base.boost=.95;base.tsize=1;base.bov='flutter';}
  else if(r.power==='bigturbo'){base.boost+=.5;base.tsize=2;}
  base.tq=Math.round(base.tq*k);base.nos=r.nos;
  if(r.trans==='race4'){base.launch=1;base.launchRpm=Math.round(base.redline*.55);}
  if(r.trans==='seq6'||r.trans==='rally5'){base.seq=1;base.gearWhine=1;}
  /* anti-lag keeps the turbo lit off the throttle: bangs and flames on every lift */
  if(r.antilag){base.antilag=1;base.crackle=Math.max(base.crackle,.95);}
  /* the sim turns the driven wheels: on a car with bigger tyres at the back, those */
  const gears=DE_GEARS[r.trans],R=(r.drv==='FWD'?b.look.tyre:b.look.tyreR||b.look.tyre).R;
  const e=SIM.makeSpec(Object.assign(base,{id:b.id,name:b.name,machine:'car',mass:r.mass,drv:r.drv||'AWD',R,gears,cdA:r.cdA,mu:r.mu,horn:'car'}));
  e.gears=gears.slice();e.nG=gears.length;e.fd=r.axle;e.shiftT=DE_SHIFT[r.trans];e.R=R;
  /* the automatics and the race four-speed pull away through a torque converter; the manuals, sequentials
     and the rally dog box through a clutch (the game's physics reads this) */
  e.conv=/^auto|^race4/.test(r.trans);
  return e;
}
const SPECS={};
const specOf=i=>{const b=BUILDS[i];return SPECS[b.id]||(SPECS[b.id]=engineSpec(b));};

