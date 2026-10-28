/* =====================================================================================
   THE FOUR ENGINES. Each truck's engine is a Digital Engine spec, built by the lab's own
   SIM.makeSpec from a base engine plus bolt-ons, the same way Dirt Sleeper builds them (its
   ENGINES table and buildSpec). Nothing here touches the synth: it only says what engine it is.
   ===================================================================================== */
const DE_ENGINES={
  v46: {layout:'V8',disp:4.6,redline:5800,idle:650,tq:407,cP:.62,cW:.55,cA:.65,Ie:.2,crackle:.12,limiter:'soft'},
  bb74:{layout:'V8',disp:7.4,redline:6300,idle:750,tq:660,cP:.6,cW:.52,cA:.62,Ie:.3,crackle:.4,limiter:'hard'},
  tt35:{layout:'V6',disp:3.5,redline:6800,idle:750,tq:330,cP:.6,cW:.5,cA:.55,Ie:.15,fi:'twin',boost:1.1,tsize:1,bov:'valve',crackle:.4,limiter:'hard'}
};
const DE_GEARS={auto6:[4.17,2.34,1.52,1.14,.87,.69],race4:[2.76,1.57,1,.72],seq6:[2.9,2.1,1.66,1.37,1.16,1]};
const DE_SHIFT={auto6:.42,race4:.11,seq6:.06};
/* the recipes. power: none | bigturbo (V6) | roots | twin. exhaust: stock | headers | side.
   intake: 0 airbox, 1 cold air, 2 ram air. cam and tune 0..3 and 0..2. nos: 0, 1 = 35-shot .. 4 = 250-shot */
const ENGINE_OF={
  stock:  {desc:'The factory 4.6 V8 with its airbox and muffler, a six-speed automatic and 3.73 gears.',engine:'v46', power:'none',    intake:0,exhaust:'stock',  cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,mass:2180,cdA:1.25,mu:1.0},
  sleeper:{desc:'Twin-turbo 3.5 V6 with bigger turbos, ram air, long-tube headers, a race tune and a 250-shot of nitrous. Race four-speed with a trans-brake, 4.56 gears.',engine:'tt35',power:'bigturbo',intake:2,exhaust:'headers',cam:0,tune:2,nos:4,trans:'race4',axle:4.56,mass:2090,cdA:1.2, mu:1.15},
  crawler:{desc:'7.4 big-block with a Roots blower, race cam, ram air, headers, a race tune and a 35-shot. Race four-speed with a trans-brake, 5.38 gears.',engine:'bb74',power:'roots',   intake:2,exhaust:'headers',cam:2,tune:2,nos:1,trans:'race4',axle:5.38,mass:2480,cdA:1.55,mu:.95},
  race:   {desc:'7.4 big-block with twin turbos, a wild cam, ram air, side exits, a race tune and a 250-shot. Six-speed sequential with straight-cut gears.',engine:'bb74',power:'twin',    intake:2,exhaust:'side',   cam:3,tune:2,nos:4,trans:'seq6', axle:3.73,mass:1960,cdA:1.3, mu:1.45}
};
function engineSpec(b){
  const r=ENGINE_OF[b.id]||ENGINE_OF.stock,base=Object.assign({},DE_ENGINES[r.engine]);let k=1;
  k*=[1,1.03,1.05][r.intake];base.intake=r.intake;
  base.ex={stock:0,catback:1,headers:2,straight:3,side:3,stacks:9}[r.exhaust];k*={stock:1,catback:1.03,headers:1.07,straight:1.06,side:1.06,stacks:1.06}[r.exhaust];
  if(base.layout!=='V6'){base.cam=r.cam;k*=[1,1.03,1.06,1.08][r.cam];base.cP+=.03*r.cam;base.redline+=150*r.cam;}
  k*=[1,1.05,1.1][r.tune];base.redline+=[0,150,300][r.tune];if(r.tune===2){base.limiter='hard';base.crackle=Math.max(base.crackle,.65);}
  if(r.power==='roots'){base.fi='roots';base.boost=.72;}
  else if(r.power==='twin'){base.fi='twin';base.boost=.95;base.tsize=1;base.bov='flutter';}
  else if(r.power==='bigturbo'){base.boost+=.5;base.tsize=2;}
  base.tq=Math.round(base.tq*k);base.nos=r.nos;
  if(r.trans==='race4'){base.launch=1;base.launchRpm=Math.round(base.redline*.55);}
  if(r.trans==='seq6'){base.seq=1;base.gearWhine=1;}
  const gears=DE_GEARS[r.trans],R=b.look.tyre.R;
  const e=SIM.makeSpec(Object.assign(base,{id:b.id,name:b.name,machine:'car',mass:r.mass,drv:'AWD',R,gears,cdA:r.cdA,mu:r.mu,horn:'car'}));
  e.gears=gears.slice();e.nG=gears.length;e.fd=r.axle;e.shiftT=DE_SHIFT[r.trans];e.R=R;
  return e;
}
const SPECS={};
const specOf=i=>{const b=BUILDS[i];return SPECS[b.id]||(SPECS[b.id]=engineSpec(b));};
