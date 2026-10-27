/* ---- src/engine/engine-sim.js ---- */
/* =====================================================================================
   ENGINE, DRIVETRAIN AND MACHINE SIMS — run on the main thread, feeding the synth its rpm,
   load, boost, ignition cuts and everything the machine around the engine is doing. Layouts
   carry real firing orders: the crank angle of each exhaust pulse over a 720 degree cycle and
   which bank of pipe it feeds. Two-strokes fire every turn, so they list each cylinder twice.
   ===================================================================================== */
const SIM=(()=>{
'use strict';
const TAU=Math.PI*2,G0=9.81,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const steps=(n,d)=>Array.from({length:n},(_,i)=>i*d);
const alt=n=>Array.from({length:n},(_,i)=>i&1);
const twice=a=>a.concat(a);
const DSPC=makeDSP(),EXH=DSPC.EXH,INT=DSPC.INTAKES,HORN_KINDS=DSPC.HORNS;

/* fire: crank angle of each exhaust pulse (of 720). bank: which pipe it feeds. order: the cylinder
   (or rotor) firing at that angle. split: extra primary length on bank B (m). dual: separate tailpipes */
const LAYOUTS={
  I3:  {name:'Inline 3',fam:'Inline',fire:[0,240,480],bank:[0,1,0],order:[1,2,3],split:.06,dual:0,
        note:'Three pulses every two turns. The off-beat thrum comes from the 240 degree gaps.'},
  I4:  {name:'Inline 4',fam:'Inline',fire:steps(4,180),bank:[0,1,0,1],order:[1,3,4,2],amp:[1,.97,1.02,.98],split:.06,dual:0,
        note:'Even 180 degree firing into a 4-2-1 manifold. Bright and buzzy, sings at high rpm.'},
  I4X: {name:'Inline 4 · crossplane',fam:'Inline',fire:[0,270,450,540],bank:[0,1,1,0],order:[1,3,2,4],split:.05,dual:0,
        note:'A big-bang crank: gaps of 270, 180, 90 and 180 degrees. It sounds more like a V4 than a four.'},
  I5:  {name:'Inline 5',fam:'Inline',fire:steps(5,144),bank:[0,1,0,1,0],order:[1,2,4,5,3],amp:[1,.93,1.05,.96,1.03],split:.1,dual:0,
        note:'An odd number of cylinders into one collector: the pulses never line up, so it warbles.'},
  I6:  {name:'Inline 6',fam:'Inline',fire:steps(6,120),bank:alt(6),order:[1,5,3,6,2,4],split:.04,dual:0,
        note:'Perfectly balanced, front three and back three into separate scrolls. Smooth and silky.'},
  I8:  {name:'Inline 8',fam:'Inline',fire:steps(8,90),bank:[0,1,0,1,1,0,1,0],order:[1,6,2,5,8,3,7,4],split:.05,dual:0,
        note:'The straight-eight: V8 firing frequency, but the front and rear groups fire unevenly.'},
  V6:  {name:'V6 · 60° even-fire',fam:'V',fire:steps(6,120),bank:alt(6),order:[1,2,3,4,5,6],split:.08,dual:1,
        note:'Each bank fires every 240 degrees, like two inline threes woven together.'},
  V6O: {name:'V6 · 90° odd-fire',fam:'V',fire:[0,90,240,330,480,570],bank:alt(6),order:[1,6,5,4,3,2],split:.1,dual:1,
        note:'Gaps of 90 and 150 degrees. The engine gallops at idle.'},
  V8:  {name:'V8 · cross-plane',fam:'V',fire:steps(8,90),bank:[0,1,1,0,1,0,0,1],order:[1,8,4,3,6,5,7,2],amp:[1,.94,.97,.95,1,.93,.98,.96],split:.12,dual:1,
        note:'Each bank fires unevenly (90, 180 and 270 degree gaps). That is the burble.'},
  V8F: {name:'V8 · flat-plane',fam:'V',fire:steps(8,90),bank:alt(8),order:[1,5,3,7,4,8,2,6],split:.05,dual:1,
        note:'Banks alternate, so each fires evenly every 180 degrees: two inline fours that scream.'},
  V10: {name:'V10 · even-fire',fam:'V',fire:steps(10,72),bank:alt(10),order:[1,6,5,10,2,7,3,8,4,9],split:.06,dual:1,
        note:'Ten pulses per cycle, each bank firing every 144 degrees like an inline five. A raw, hard-edged howl.'},
  V10O:{name:'V10 · odd-fire',fam:'V',fire:[0,90,144,234,288,378,432,522,576,666],bank:alt(10),order:[1,6,5,10,2,7,3,8,4,9],split:.08,dual:1,
        note:'A 90 degree V10 on a shared crankpin: gaps of 54 and 90 degrees give it a rasping edge.'},
  V12: {name:'V12 · 60°',fam:'V',fire:steps(12,60),bank:alt(12),order:[1,7,5,11,3,9,6,12,2,8,4,10],split:.04,dual:1,ch:{scatter:.12},
        note:'Two inline sixes fired alternately. Silky at low revs, a shriek at the top.'},
  F4:  {name:'Flat 4 · boxer',fam:'Flat',fire:steps(4,180),bank:[0,0,1,1],order:[1,3,2,4],split:.55,rumble:1,dual:0,
        note:'Unequal-length headers: one side fires twice, then the other. The rumble.'},
  F6:  {name:'Flat 6',fam:'Flat',fire:steps(6,120),bank:alt(6),order:[1,6,2,4,3,5],split:.05,dual:1,
        note:'Opposed sixes, banks alternating. Mechanical, metallic and hard-edged near the redline.'},
  R2:  {name:'Rotary · 2 rotor',fam:'Rotary',rotary:1,fire:steps(4,180),bank:[0,1,0,1],order:['R1','R2','R1','R2'],split:.05,dual:0,ch:{tr:.55,td:1.7,scatter:.24,rasp:1.9,bright:1.25,lope:.02},
        note:'Each rotor fires once per shaft turn through a port that opens all at once: long, harsh pulses.'},
  R3:  {name:'Rotary · 3 rotor',fam:'Rotary',rotary:1,fire:steps(6,120),bank:[0,1,0,0,1,0],order:['R1','R2','R3','R1','R2','R3'],split:.05,dual:0,ch:{tr:.55,td:1.7,scatter:.22,rasp:1.9,bright:1.3,lope:.015},
        note:'Three rotors, six pulses per cycle into two pipes. The high, piercing shriek of a racing rotary.'},
  P2X: {name:'Parallel twin · 270°',fam:'Twin',fire:[0,270],bank:[0,1],order:[1,2],split:.04,dual:0,ch:{scatter:.22},
        note:'A parallel twin with a 270 degree crank: the beat of a V-twin from a narrower engine.'},
  V2L: {name:'V-twin · 90°',fam:'Twin',fire:[0,270],bank:[0,1],order:['F','R'],split:.12,dual:0,ch:{scatter:.22},
        note:'An L-twin: 270 degrees, then 450, between bangs. Even primary balance, uneven beat.'},
  V2:  {name:'V-twin · 45°',fam:'Twin',fire:[0,315],bank:[0,1],order:['F','R'],split:.1,dual:1,ch:{scatter:.28},
        note:'Both rods on one crankpin: bang, 315 degrees, bang, 405 degrees. The potato-potato idle.'},
  P2T: {name:'Horizontal twin · 180°',fam:'Twin',fire:[0,180],bank:[0,0],order:[1,2],split:0,dual:0,ch:{td:1.25,scatter:.22},
        note:'Both pistons on a 180 degree crank: bang-bang, then a turn and a half of quiet. Pop-pop.'},
  V4:  {name:'V4 · twin-pulse',fam:'V',fire:[0,90,290,380],bank:[0,1,0,1],order:[1,2,3,4],split:.08,dual:0,
        note:'Two bangs close together, then a gap: the twin-pulse beat.'},
  S1:  {name:'Single',fam:'Single',fire:[0],bank:[0],order:[1],split:0,dual:0,ch:{scatter:.25},
        note:'One bang every two turns, and every one a little different.'},
  S1T: {name:'Two-stroke single',fam:'Single',stroke2:1,cyl:1,fire:[0,360],bank:[0,0],order:[1,1],split:0,dual:0,ch:{tr:.65,td:.7,rasp:1.6,scatter:.3},
        note:'Fires every turn. Sharp, raspy pulses, and on a tuned pipe it comes on with a bang.'},
  H1T: {name:'Hot-bulb single',fam:'Single',stroke2:1,cyl:1,fire:[0,360],bank:[0,0],order:[1,1],split:0,dual:0,ch:{tr:1.7,td:1.9,scatter:.3,rasp:.6},
        note:'A two-stroke semi-diesel lit by a glowing iron bulb. One deep thump every turn.'},
  HM1: {name:'Hit-and-miss single',fam:'Single',fire:[0],bank:[0],order:[1],split:0,dual:0,ch:{td:1.5,tr:1.3,scatter:.15},
        note:'Fires only when the governor lets it. Otherwise the exhaust valve is latched open and it coasts on its flywheels.'},
  I6T2:{name:'Inline 6 · two-stroke',fam:'Inline',stroke2:1,cyl:6,fire:steps(12,60),bank:alt(12),order:twice([1,5,3,4,2,6]),split:.08,dual:0,
        note:'Every cylinder fires every turn: twelve pulses every two turns, blown through by a scavenge pump.'},
  V8T2:{name:'V8 · two-stroke',fam:'V',stroke2:1,cyl:8,fire:steps(16,45),bank:alt(16),order:twice(['L1','R1','L3','R3','L4','R4','L2','R2']),split:.1,dual:1,
        note:'Sixteen pulses every two turns, the air pushed in by a Roots blower. That is the two-stroke scream.'},
  V16T2:{name:'V16 · two-stroke',fam:'V',stroke2:1,cyl:16,fire:steps(32,22.5),bank:alt(32),order:twice(steps(16,1).map(i=>i+1)),split:.12,dual:0,
        note:'Thirty-two pulses every two turns. At full power that is a 480 Hz note from 169 litres.'},
  ST2: {name:'Steam · 2 cylinders',fam:'Steam',kind:'steam',cyl:2,fire:steps(8,90),bank:Array(8).fill(0),order:twice(['L','R','L','R']),amp:[1,.84,1.05,.88,1,.84,1.05,.88],split:0,dual:0,ch:{scatter:.12},
        note:'Two double-acting cylinders, cranks a quarter turn apart: four beats per turn of the wheels, a little out of step.'},
  ST3: {name:'Steam · 3 cylinders',fam:'Steam',kind:'steam',cyl:3,fire:steps(12,60),bank:Array(12).fill(0),order:twice(['L','M','R','L','M','R']),split:0,dual:0,ch:{scatter:.1},
        note:'Three cylinders: six even beats per turn of the wheels. Softer and faster than a two-cylinder engine.'}
};
const LAYOUT_IDS=Object.keys(LAYOUTS);
const CAM_LOPE=[0,.012,.032,.065];
const EXHAUSTS=EXH.map(x=>x.n);
const INTAKES=INT.map(x=>x.n);
const CAMS=['Stock','Street','Race','Wild'];
const INDUCTION={none:'Natural',turbo:'Turbo',twin:'Twin turbo',roots:'Roots blower',screw:'Screw blower',cent:'Centrifugal'};
const HORNS=Object.assign({'':'None'},Object.fromEntries(Object.entries(HORN_KINDS).map(([k,v])=>[k,v.n])));
const NOS_SHOTS=[0,35,75,125,250];
const GEARS6=[3.13,2.1,1.58,1.25,1.03,.86],GEARS6R=[2.9,2.1,1.66,1.37,1.16,1.0],GEARS7=[3.0,2.4,1.98,1.68,1.45,1.27,1.12],GEARS4=[2.7,1.75,1.3,1.0];
const BIKE6=[2.6,1.95,1.6,1.38,1.22,1.1],TRUCK10=[12.8,9.25,6.76,4.94,3.55,2.53,1.86,1.36,1,.74],BUS4=[3.58,1.93,1.35,1];

/* turbo sizes: spool window (fraction of redline) and lag */
const TURBO_SIZE=[{n:'Small',s0:.32,s1:.48,lag:.24},{n:'Medium',s0:.4,s1:.6,lag:.36},{n:'Large',s0:.48,s1:.7,lag:.55}];

/* what each kind of machine is: how you drive it and what you hear around it */
const MACHINES={
  car:      {n:'Car',road:1},
  bike:     {n:'Motorcycle',road:1},
  truck:    {n:'Truck',road:1},
  loco:     {n:'Diesel locomotive',lever:{label:'Throttle notch',steps:8,names:['Idle','Notch 1','Notch 2','Notch 3','Notch 4','Notch 5','Notch 6','Notch 7','Notch 8']}},
  steam:    {n:'Steam locomotive',lever:{label:'Regulator'}},
  ship:     {n:'Ship',lever:{label:'Engine telegraph',steps:4,names:['Stop','Dead slow','Slow','Half ahead','Full ahead']}},
  genset:   {n:'Generator',stationary:1,lever:{label:'Load bank'}},
  hitmiss:  {n:'Stationary engine',stationary:1,lever:{label:'Governor speed'}},
  tractor:  {n:'Tractor',lever:{label:'Hand throttle'}},
  excavator:{n:'Excavator',lever:{label:'Throttle dial',steps:9,names:['Dial 1','Dial 2','Dial 3','Dial 4','Dial 5','Dial 6','Dial 7','Dial 8','Dial 9','Dial 10']}},
  saw:      {n:'Chainsaw',stationary:1},
  mower:    {n:'Mower',stationary:1,lever:{label:'Throttle lever'}}
};

const PRESETS=[
  /* ---------------- cars ---------------- */
  {id:'street4',name:'Street Four',tag:'2.0 L inline-4, stock',layout:'I4',disp:2.0,redline:7200,idle:850,tq:205,cP:.6,cW:.48,cA:.45,Ie:.13,ex:0,intake:0,cam:0,crackle:.15,limiter:'soft',mass:1180,drv:'RWD'},
  {id:'screamer',name:'Ten-Grand Four',tag:'2.0 L inline-4, throttle bodies, 9,400 rpm',layout:'I4',disp:2.0,redline:9400,idle:1150,tq:232,cP:.8,cW:.42,cA:.42,Ie:.085,ex:3,intake:3,cam:3,crackle:.55,seq:1,gearWhine:1,limiter:'hard',mass:980,drv:'RWD'},
  {id:'three',name:'Pocket Three',tag:'1.6 L inline-3, turbo',layout:'I3',disp:1.6,redline:7200,idle:900,tq:190,cP:.55,cW:.5,cA:.5,Ie:.11,fi:'turbo',boost:1.25,tsize:0,bov:'flutter',ex:2,intake:1,cam:1,crackle:.6,mass:1180,drv:'FWD'},
  {id:'five',name:'Group B Five',tag:'2.1 L inline-5, turbo, anti-lag',layout:'I5',disp:2.1,redline:8000,idle:950,tq:235,cP:.62,cW:.45,cA:.42,Ie:.13,fi:'turbo',boost:1.6,tsize:1,antilag:1,bov:'valve',ex:3,intake:2,cam:2,crackle:.9,launch:1,launchRpm:5500,mass:1100,drv:'AWD'},
  {id:'six',name:'Big-Turbo Six',tag:'3.0 L inline-6, single turbo, 75-shot',layout:'I6',disp:3.0,redline:7600,idle:850,tq:300,cP:.58,cW:.5,cA:.5,Ie:.17,fi:'turbo',boost:1.4,tsize:2,bov:'flutter',ex:3,intake:1,cam:1,crackle:.4,nos:2,mass:1450,drv:'RWD'},
  {id:'eight',name:'Blown Straight-Eight',tag:'4.0 L inline-8, roots blower, 1930s Grand Prix',layout:'I8',disp:4.0,redline:6200,idle:650,tq:430,cP:.6,cW:.55,cA:.55,Ie:.24,fi:'roots',boost:.85,ex:4,intake:0,cam:1,crackle:.65,gearWhine:1,mass:1050,drv:'RWD',mu:.95,gears:GEARS4},
  {id:'oddv6',name:'Odd-Fire V6',tag:'3.8 L 90-degree V6, odd-firing crank',layout:'V6O',disp:3.8,redline:5800,idle:700,tq:350,cP:.5,cW:.5,cA:.6,Ie:.22,ex:3,intake:0,cam:2,crackle:.3,mass:1500,drv:'RWD'},
  {id:'v6tt',name:'Twin-Turbo V6',tag:'3.5 L 60-degree V6, twin turbos',layout:'V6',disp:3.5,redline:7600,idle:850,tq:340,cP:.6,cW:.48,cA:.5,Ie:.15,fi:'twin',boost:1.2,tsize:0,bov:'valve',ex:2,intake:1,cam:1,crackle:.5,seq:1,mass:1550,drv:'AWD'},
  {id:'muscle',name:'Lumpy-Cam V8',tag:'6.2 L cross-plane V8, big cam',layout:'V8',disp:6.2,redline:6800,idle:780,tq:640,cP:.6,cW:.5,cA:.55,Ie:.27,ex:3,intake:1,cam:3,crackle:.5,limiter:'hard',mass:1650,drv:'RWD'},
  {id:'blown',name:'Blown Big-Block',tag:'8.2 L V8, roots blower, 125-shot',layout:'V8',disp:8.2,redline:7200,idle:900,tq:780,cP:.55,cW:.55,cA:.6,Ie:.32,fi:'roots',boost:.9,ex:4,intake:2,cam:3,crackle:.6,nos:3,launch:1,launchRpm:4800,limiter:'hard',mass:1500,drv:'RWD',mu:1.45},
  {id:'flatplane',name:'Flat-Plane V8',tag:'4.5 L flat-plane V8, 9,000 rpm',layout:'V8F',disp:4.5,redline:9000,idle:1000,tq:540,cP:.72,cW:.45,cA:.5,Ie:.16,ex:2,intake:2,cam:2,crackle:.35,seq:1,mass:1450,drv:'RWD'},
  {id:'v10',name:'V10 Supercar',tag:'5.2 L V10, even-firing, 8,700 rpm',layout:'V10',disp:5.2,redline:8700,idle:950,tq:560,cP:.75,cW:.45,cA:.5,Ie:.17,ex:2,intake:1,cam:2,crackle:.45,seq:1,mass:1550,drv:'AWD'},
  {id:'gp',name:'Grand Prix V10',tag:'3.0 L V10, 19,000 rpm',layout:'V10',disp:3.0,redline:19000,idle:4200,tq:345,cP:.82,cW:.34,cA:.42,Ie:.022,ex:4,intake:3,cam:3,crackle:.25,seq:1,gearWhine:1,limiter:'hard',mass:610,drv:'RWD',cdA:1.0,mu:1.8,gears:GEARS7},
  {id:'v12',name:'V12 Grand Tourer',tag:'6.5 L V12, 8,900 rpm',layout:'V12',disp:6.5,redline:8900,idle:900,tq:720,cP:.72,cW:.48,cA:.5,Ie:.2,ex:2,intake:1,cam:2,crackle:.35,seq:1,mass:1650,drv:'RWD'},
  {id:'boxer',name:'Boxer Rally',tag:'2.0 L flat-4, turbo, anti-lag',layout:'F4',disp:2.0,redline:7800,idle:950,tq:225,cP:.6,cW:.46,cA:.45,Ie:.12,fi:'turbo',boost:1.3,tsize:1,antilag:1,bov:'valve',ex:2,intake:1,cam:1,crackle:.7,seq:1,gearWhine:1,launch:1,launchRpm:5200,mass:1230,drv:'AWD'},
  {id:'flat6',name:'Flat-Six Wail',tag:'4.0 L flat-6, 9,000 rpm',layout:'F6',disp:4.0,redline:9000,idle:950,tq:470,cP:.74,cW:.45,cA:.5,Ie:.15,ex:2,intake:2,cam:2,crackle:.3,seq:1,mass:1420,drv:'RWD'},
  {id:'rotary2',name:'Bridge-Port Twin Rotor',tag:'1.3 L two-rotor, bridge port',layout:'R2',disp:1.3,redline:9200,idle:1300,tq:215,cP:.7,cW:.45,cA:.45,Ie:.08,ex:3,intake:1,cam:3,crackle:.75,mass:1150,drv:'RWD'},
  {id:'rotary3',name:'Three-Rotor Shriek',tag:'2.6 L three-rotor, peripheral ports',layout:'R3',disp:2.6,redline:9500,idle:1400,tq:340,cP:.78,cW:.42,cA:.42,Ie:.1,ex:4,intake:3,cam:3,crackle:.5,seq:1,gearWhine:1,mass:900,drv:'RWD',mu:1.6},

  /* ---------------- motorcycles ---------------- */
  {id:'bk_i4',grp:'Bikes',machine:'bike',name:'Superbike Four',tag:'1.0 L inline-4, 14,500 rpm',layout:'I4',disp:1.0,redline:14500,idle:1300,tq:112,cP:.78,cW:.4,cA:.42,Ie:.022,ex:5,intake:3,cam:2,crackle:.5,seq:1,ch:{tr:.85},mass:200,cdA:.32,mu:1.3,R:.31,gears:BIKE6,vTop:83,horn:'car'},
  {id:'bk_cross',grp:'Bikes',machine:'bike',name:'Crossplane Four',tag:'1.0 L inline-4, big-bang crank',layout:'I4X',disp:1.0,redline:14000,idle:1300,tq:112,cP:.74,cW:.42,cA:.45,Ie:.024,ex:5,intake:3,cam:2,crackle:.5,seq:1,mass:200,cdA:.32,mu:1.3,R:.31,gears:BIKE6,vTop:82,horn:'car'},
  {id:'bk_v4',grp:'Bikes',machine:'bike',name:'Twin-Pulse V4',tag:'1.1 L V4, 13,000 rpm',layout:'V4',disp:1.1,redline:13000,idle:1400,tq:124,cP:.72,cW:.42,cA:.45,Ie:.026,ex:5,intake:3,cam:2,crackle:.55,seq:1,mass:205,cdA:.33,mu:1.3,R:.31,gears:BIKE6,vTop:83,horn:'car'},
  {id:'bk_triple',grp:'Bikes',machine:'bike',name:'Street Triple',tag:'765 cc inline-3',layout:'I3',disp:.765,redline:12500,idle:1300,tq:80,cP:.72,cW:.45,cA:.5,Ie:.02,ex:5,intake:2,cam:1,crackle:.45,mass:190,cdA:.36,mu:1.25,R:.31,gears:BIKE6,vTop:70,horn:'car'},
  {id:'bk_ltwin',grp:'Bikes',machine:'bike',name:'L-Twin 1200',tag:'1.2 L 90-degree V-twin',layout:'V2L',disp:1.2,redline:11000,idle:1200,tq:120,cP:.68,cW:.5,cA:.5,Ie:.03,ex:5,intake:2,cam:1,crackle:.55,mass:200,cdA:.35,mu:1.25,R:.31,gears:BIKE6,vTop:76,horn:'car'},
  {id:'bk_cruiser',grp:'Bikes',machine:'bike',name:'Big Cruiser',tag:'1.8 L 45-degree V-twin, open shotguns',layout:'V2',disp:1.8,redline:5800,idle:850,tq:160,cP:.5,cW:.55,cA:.6,Ie:.06,ex:7,intake:0,cam:3,crackle:.7,ch:{td:1.2},mass:340,cdA:.55,mu:1.1,R:.33,gears:BIKE6,vTop:55,horn:'car'},
  {id:'bk_twin270',grp:'Bikes',machine:'bike',name:'Middleweight Twin',tag:'700 cc parallel twin, 270-degree crank',layout:'P2X',disp:.7,redline:10000,idle:1200,tq:68,cP:.65,cW:.5,cA:.5,Ie:.018,ex:5,intake:1,cam:1,crackle:.45,mass:185,cdA:.38,mu:1.2,R:.31,gears:BIKE6,vTop:62,horn:'car'},
  {id:'bk_single',grp:'Bikes',machine:'bike',name:'Thumper 450',tag:'450 cc single, straight pipe',layout:'S1',disp:.45,redline:11500,idle:1400,tq:50,cP:.7,cW:.5,cA:.5,Ie:.012,ex:3,intake:1,cam:2,crackle:.6,ch:{td:1.1},mass:120,cdA:.4,mu:1.2,R:.3,gears:BIKE6,vTop:45},
  {id:'bk_2t',grp:'Bikes',machine:'bike',name:'Two-Stroke 250',tag:'250 cc single, expansion chamber',layout:'S1T',disp:.25,redline:9500,idle:1600,tq:44,cP:.86,cW:.24,cA:.32,Ie:.008,ex:6,intake:1,cam:0,crackle:.4,mass:110,cdA:.36,mu:1.2,R:.3,gears:BIKE6,vTop:60},

  /* ---------------- heavy diesel ---------------- */
  {id:'semi',grp:'Heavy',machine:'truck',name:'Long-Haul Semi',tag:'15 L inline-6 turbo diesel, jake brake, 10-speed',
    layout:'I6',disp:15,redline:2100,idle:650,tq:1050,cP:.55,cW:.5,cA:.55,Ie:3.2,fi:'turbo',boost:2.4,tsize:2,bov:'none',ex:8,intake:4,cam:0,crackle:0,limiter:'soft',
    diesel:1,mech:1.2,mechTone:2700,jake:1,airbrakes:1,horn:'air',starter:'elec',stF:.6,crankRpm:160,crankT:1.1,flare:.3,catchT:.5,
    mass:36000,drv:'RWD',cdA:6.5,mu:.8,R:.51,gears:TRUCK10,vTop:31,shiftT:.75,shiftRpm:1750,behindDist:5,twK:1.6,twF:1.15,gain:1.6},
  {id:'bus',grp:'Heavy',machine:'truck',name:'Two-Stroke Bus',tag:'12.1 L two-stroke V8 diesel, Roots blower and turbo',
    layout:'V8T2',disp:12.1,redline:2100,idle:600,tq:950,cP:.6,cW:.5,cA:.55,Ie:2.4,fi:'turbo',blower:'roots',boost:1.2,tsize:1,bov:'none',ex:8,intake:4,cam:0,crackle:0,limiter:'soft',
    diesel:1,mech:1.4,mechTone:3300,jake:1,airbrakes:1,horn:'air',starter:'elec',stF:.65,crankRpm:170,crankT:1,flare:.35,catchT:.45,
    mass:15000,drv:'RWD',cdA:7,mu:.85,R:.5,gears:BUS4,vTop:27,shiftT:.45,shiftRpm:1950,behindDist:5,gain:1.3},
  {id:'loco',grp:'Heavy',machine:'loco',name:'Diesel Freight Loco',tag:'169 L two-stroke V16, 3,000 hp, eight notches',
    layout:'V16T2',disp:169,redline:904,idle:255,tq:12000,cP:.95,cW:.7,cA:.75,Ie:600,fi:'turbo',boost:1.8,tsize:1,bov:'none',ex:10,intake:4,
    diesel:1,mech:.9,mechTone:1700,horn:'loco',bell:1,starter:'elec',stF:.45,crankRpm:75,crankT:3,flare:.12,catchT:1.4,
    mass:400000,kW:2240,gwSpeed:19.4,rail:1,railJoint:11.9,axles:[0,1.9,3.8,13.9,15.8,17.7],passY:8,behindDist:7,cabDist:4,govWn:2,slewUp:65,slewDn:45,twK:3,twF:.72,gain:2.4,
    imp:{lo:75,mid:420,hi:1900,qlo:2,qmid:5,qhi:12}},
  {id:'ship',grp:'Heavy',machine:'ship',name:'Container Ship',tag:'9,600 L slow-speed two-stroke inline-6, 90 rpm',
    layout:'I6T2',disp:9600,redline:90,idle:25,tq:700000,cP:.95,cW:.7,cA:.75,Ie:6e5,fi:'turbo',boost:3,tsize:1,bov:'none',ex:11,intake:4,
    diesel:1,mech:1.3,mechTone:1300,horn:'ship',starter:'air',crankRpm:16,crankT:2.4,flare:.05,catchT:1.5,minRpm:3,
    orders:[0,30,45,65,85],vmax:11.3,lever0:.25,blades:5,passY:60,behindDist:16,cabDist:6,govWn:.8,slewUp:6,slewDn:5,twK:2.5,twF:.55,gain:3,
    imp:{lo:55,mid:300,hi:1400,qlo:2,qmid:4,qhi:8}},
  {id:'genset',grp:'Yard',machine:'genset',name:'Standby Generator',tag:'19 L inline-6 turbo diesel, 500 kW at 1,800 rpm',
    layout:'I6',disp:19,redline:1800,rated:1800,idle:700,tq:1350,cP:.7,cW:.6,cA:.7,Ie:25,fi:'turbo',boost:2.5,tsize:1,bov:'none',ex:15,intake:4,
    diesel:1,mech:1.1,mechTone:2500,starter:'elec',stF:.6,crankRpm:150,crankT:1.2,flare:.06,catchT:2.2,catchRpm:1800,
    kW:500,hz:60,govWn:4,behindDist:5,cabDist:2,farDist:28,twK:1.6,gain:1.3},
  {id:'excavator',grp:'Heavy',machine:'excavator',name:'30-Tonne Excavator',tag:'7 L inline-6 turbo diesel, hydraulics and tracks',
    layout:'I6',disp:7,redline:2000,idle:1000,tq:600,cP:.65,cW:.55,cA:.65,Ie:2.5,fi:'turbo',boost:1.8,tsize:0,bov:'none',ex:18,intake:4,
    diesel:1,mech:1.1,mechTone:2600,horn:'car',starter:'elec',stF:.7,crankRpm:170,crankT:.9,flare:.25,catchT:.5,
    mass:30000,govWn:5,behindDist:4,cabDist:1.6,passY:10,twK:1.2,gain:1,imp:{lo:110,mid:680,hi:1900,qlo:2,qmid:6,qhi:10}},

  /* ---------------- vintage and small engines ---------------- */
  {id:'steam',grp:'Heavy',machine:'steam',name:'Steam Express',tag:'Two-cylinder 4-6-2, 1.88 m driving wheels',
    layout:'ST2',disp:0,redline:340,idle:0,tq:1,Ie:1,ex:16,intake:0,horn:'steam',starter:'none',minRpm:.4,
    driverD:1.88,Fmax:160000,Wadh:60000,boiler:15.5,steamRate:80,mass:320000,Idr:6000,clank:1,hpOverride:2200,
    rail:1,railJoint:13.7,axles:[0,1.1,3.1,5.1,7.1,10.4,12.4,14.6,16.6],passY:8,behindDist:5,cabDist:2.5,gain:2.2,
    imp:{lo:70,mid:620,hi:2400,qlo:2,qmid:10,qhi:18}},
  {id:'hitmiss',grp:'Yard',machine:'hitmiss',name:'Hit-and-Miss Engine',tag:'6 hp single, 1910s, flywheel governor',
    layout:'HM1',disp:3.5,redline:560,idle:250,tq:100,cP:.8,cW:.6,cA:.7,Ie:9,ex:17,intake:6,crackle:.1,
    mech:.9,mechTone:1800,mechAll:1,starter:'hand',crankRpm:110,crankT:1.2,flare:0,catchT:.3,catchRpm:330,govMin:300,govMax:520,lever0:.6,
    behindDist:2.5,cabDist:1.2,farDist:18,gain:1.4,imp:{lo:65,mid:820,hi:3200,qlo:2,qmid:9,qhi:6}},
  {id:'popper',grp:'Yard',machine:'tractor',name:'Two-Cylinder Popper',tag:'5.5 L horizontal twin, 180-degree crank, 1940s tractor',
    layout:'P2T',disp:5.5,redline:975,idle:450,tq:260,cP:.75,cW:.6,cA:.7,Ie:6,ex:12,intake:4,crackle:.3,mech:.5,mechTone:1500,
    starter:'hand',crankRpm:90,crankT:1.2,flare:.2,catchT:.5,govWn:2.5,lever0:.25,mass:2600,gearV:[.95,1.4,1.95,2.7,3.9,5.6],
    behindDist:3,cabDist:1.3,passY:6,gain:1.3},
  {id:'hotbulb',grp:'Yard',machine:'tractor',name:'Hot-Bulb Single',tag:'10.3 L single-cylinder two-stroke semi-diesel',
    layout:'H1T',disp:10.3,redline:630,idle:400,tq:650,cP:.8,cW:.6,cA:.7,Ie:25,ex:12,intake:4,crackle:0,diesel:1,mech:1,mechTone:1100,lope:.02,
    starter:'hand',crankRpm:80,crankT:1.4,flare:.15,catchT:.6,govWn:2,lever0:.2,mass:3400,gearV:[.8,1.3,1.9,2.7,4,5.5],
    behindDist:3,cabDist:1.3,passY:6,gain:1.5},
  {id:'saw',grp:'Yard',machine:'saw',name:'Chainsaw',tag:'60 cc two-stroke, 13,500 rpm',
    layout:'S1T',disp:.06,redline:12000,idle:2800,tq:4.2,cP:.72,cW:.38,cA:.45,Ie:.0016,ex:14,intake:5,crackle:.2,mech:.3,mechTone:4200,limiter:'none',
    ch:{tr:.65,td:.65,rasp:2,scatter:.3,bright:1.2},starter:'pull',crankRpm:700,crankT:.38,flare:.3,catchT:.25,clutch:4200,
    behindDist:1.2,cabDist:.7,farDist:15,gain:0.55},
  {id:'mower',grp:'Yard',machine:'mower',name:'Lawn Mower',tag:'160 cc single, governed, 3,100 rpm',
    layout:'S1',disp:.16,redline:3300,idle:1800,tq:9,cP:.6,cW:.6,cA:.7,Ie:.035,ex:13,intake:5,crackle:.15,mech:.25,mechTone:3500,
    starter:'pull',crankRpm:620,crankT:.36,flare:.1,catchT:.3,catchRpm:3100,govWn:5,lever0:.92,
    behindDist:1.5,cabDist:.9,farDist:15,gain:0.8}
];
const DEFAULTS={grp:'Cars',machine:'car',fi:'none',boost:1,tsize:1,antilag:0,bov:'valve',ex:1,intake:0,cam:0,crackle:.3,seq:0,gearWhine:0,nos:0,launch:0,launchRpm:5000,limiter:'hard',
  mass:1350,drv:'RWD',cdA:.68,mu:1.15,R:.33,horn:'',starter:'elec',stF:1,crankRpm:235,crankT:.8,flare:.95,catchT:.22,exLen:1,diesel:0,mech:0,mechTone:2600,jake:0,lope:0,gain:0};

/* fill in a full engine spec from a preset plus any edits */
function makeSpec(base){
  const e=Object.assign({},DEFAULTS,base),L=LAYOUTS[e.layout]||LAYOUTS.I4,M=MACHINES[e.machine]||MACHINES.car;
  e.M=M;e.kind=L.kind||'piston';e.cyl=L.cyl||L.fire.length;e.rotary=!!L.rotary;e.stroke2=!!L.stroke2;
  e.limiterRpm=Math.round(e.redline*1.022+(e.redline>3000?40:0));
  e.ch=Object.assign({tr:1,td:1,scatter:.18,rasp:1,bright:1,lope:0},L.ch||{},base.ch||{});
  for(const k of ['tr','td','scatter'])if(base['ch_'+k]!==undefined)e.ch[k]=base['ch_'+k];
  e.turbo=e.fi==='turbo'||e.fi==='twin';e.sup=['roots','screw','cent'].includes(e.fi)?e.fi:'';
  const ts=TURBO_SIZE[e.tsize|0];e.s0=e.redline*ts.s0;e.s1=e.redline*ts.s1;e.lag=ts.lag*(e.fi==='twin'?.8:1)*(e.diesel?1.6:1);
  e.fiBoost=e.fi==='none'?0:e.boost;
  e.nosKw=[0,26,56,93,186][e.nos|0];e.nosT=8;
  e.resp=(INT[e.intake|0]||INT[0]).resp;
  e.road=!!M.road;e.stationary=!!M.stationary;
  if(e.genHz)e.hz=e.genHz;if(e.machine==='genset'){e.rated=e.hz===50?1500:1800;e.redline=e.rated;e.catchRpm=e.rated;e.limiterRpm=Math.round(e.rated*1.15);}
  if(e.road){
    e.gears=(e.gears||(e.seq?GEARS6R:GEARS6)).slice();e.nG=e.gears.length;
    e.shiftT=e.shiftT||(e.seq?.06:.3);
    e.peak=peakPower(e);
    const vTop=e.vTop||clamp(46+e.peak.hp*.06,62,98);e.fd=(e.limiterRpm*TAU/60)*e.R/(e.gears[e.nG-1]*vTop);
    e.shiftRpm=e.shiftRpm||e.redline*.99;
  }else{
    e.nG=e.gearV?e.gearV.length:1;e.gears=[1];
    e.peak=e.kind==='steam'?{hp:e.hpOverride||0,kw:(e.hpOverride||0)*.7457,rpm:e.redline,tq:e.Fmax,tqRpm:0}:peakPower(e);
  }
  /* governor gains from the plant: rack drives torque, inertia resists it */
  const a=e.tq*(1+e.fiBoost*.62)/(Math.max(1e-6,e.Ie)*e.redline*TAU/60),wn=e.govWn||3;e.gKp=1.6*wn/a;e.gKi=wn*wn/a;
  return e;
}
/* crank torque (N m): bell-shaped NA curve x (1 + boost), friction and pumping when off throttle */
function engTq(e,rpm,thr,boost){
  const x=rpm/e.redline;
  const base=e.tq*(e.cA+(1-e.cA)*Math.exp(-Math.pow((x-e.cP)/e.cW,2)));
  const fade=rpm>e.redline?Math.max(0,1-(rpm-e.redline)/(e.redline*.18)):1;
  const wot=base*(1+boost*.62)*fade-(e.sup?e.tq*.03*x:0);
  const fric=e.tq*(.08+.13*x);
  return thr*wot-(1-thr)*fric;
}
function steadyBoost(e,rpm){
  if(!e.fiBoost)return 0;
  if(e.sup==='roots'||e.sup==='screw')return e.fiBoost*Math.pow(Math.min(1,rpm/(e.redline*.38)),.6);
  if(e.sup==='cent')return e.fiBoost*Math.pow(rpm/e.redline,2);
  if(e.diesel)return e.fiBoost*sstep(.25,.75,rpm/e.redline);
  return e.fiBoost*sstep(e.s0,e.s1,rpm);
}
function peakPower(e){let pk=0,pr=0,tk=0,tr=0;const r0=e.road?e.idle:Math.max(e.idle,e.redline*.3);for(let rpm=r0;rpm<=e.redline*1.02;rpm+=e.redline/200){const t=engTq(e,rpm,1,steadyBoost(e,rpm)),p=t*rpm*TAU/60;if(p>pk){pk=p;pr=rpm;}if(t>tk){tk=t;tr=rpm;}}
  if(e.machine==='genset'){const kw=e.kW||500;return {kw,hp:kw/.7457,rpm:e.rated,tq:tk,tqRpm:tr};}
  return {kw:pk/1000,hp:pk/745.7,rpm:pr,tq:tk,tqRpm:tr};}
function curve(e,n=120){const out=[];for(let i=0;i<=n;i++){const rpm=e.idle+(e.limiterRpm-e.idle)*i/n,b=steadyBoost(e,rpm),t=engTq(e,rpm,1,b);out.push({rpm,tq:t,hp:t*rpm*TAU/60/745.7,boost:b});}return out;}
/* bank firing intervals, for the crank diagram */
function bankIntervals(L){const out=[[],[]];for(const b of [0,1]){const a=L.fire.filter((_,i)=>L.bank[i]===b);for(let i=0;i<a.length;i++)out[b].push(((a[(i+1)%a.length]-a[i])+720)%720||720);}return out;}

/* the synth's configuration for a spec */
function dspCfg(e){
  const L=LAYOUTS[e.layout],n=L.fire.length;
  return {kind:e.kind,layout:e.layout,ang:L.fire.slice(),bank:L.bank.slice(),amp:L.amp?L.amp.slice():Array.from({length:n},(_,i)=>1+.03*Math.sin(i*2.39+n)),
    ch:e.ch,lope:CAM_LOPE[e.cam|0]+(e.ch.lope||0)+(e.lope||0),split:L.split,dual:L.dual,rumble:L.rumble|0,cyl:e.cyl,
    ex:e.ex|0,exLen:e.exLen||1,intake:e.intake|0,disp:e.disp||1,redline:e.redline,idle:e.idle,turbo:e.turbo?1:0,twin:e.fi==='twin'?1:0,sup:e.sup||e.blower||'',fiBoost:e.fiBoost||(e.blower?.8:0),
    crackle:e.crackle,gearWhine:e.gearWhine|0,seq:e.seq|0,gain:e.gain||(n>=10?.85:n<=3?1.15:1),
    diesel:e.diesel|0,mech:e.mech||0,mechTone:e.mechTone||2600,mechAll:e.mechAll|0,jake:e.jake|0,starter:e.starter,stF:e.stF||1,horn:e.horn||'',
    gwSpeed:e.gwSpeed||0,twK:e.twK||1,twF:e.twF||1,imp:e.imp||null,railJoint:e.railJoint||13,axles:e.axles||[0,2.5],minRpm:e.minRpm||25,clank:e.clank||1};
}

/* ---------- the engine and car (also bikes and trucks) ---------- */
class EngineSim{
  constructor(spec){this.st='off';this.t=0;this.we=0;this.rpm=0;this.thr=0;this.boost=0;this.gear=0;this.v=0;this.cutT=0;this.cutFrac=0;
    this.shiftT=0;this.shiftTo=0;this.clutch='open';this.engage=0;this.spin=false;this.nos=1;this.nosOn=false;this.thrPrev=0;this.load=0;
    this.twostep=false;this.events=[];this.pos=-40;this.ww=0;this.launching=false;this.launchT=0;this.wHold=0;this.slip=0;this.tc=true;this.tcOn=false;this.jump=false;this.held=false;this.aPrev=0;this.lopeT=0;this.rpmOut=0;this.mode='free';this.auto=true;
    this.c={};this.fx={};this.hornOn=false;this.jakeOut=0;this.brkT=0;this.airUse=0;this.dryerT=0;this.rack=0;this.gi=0;this.chip={};
    if(spec)this.setSpec(spec);}
  setSpec(e){const keep=this.e;this.e=e;if(keep&&this.gear>e.nG)this.gear=e.nG;if(!keep||keep.id!==e.id||keep.machine!==e.machine)this.resetControls();}
  resetControls(){const e=this.e;this.c={jake:0,lever:e.lever0||0,gearM:2,cutoff:.45};this.lever=e.lever0||0;this.fx={};}
  ctl(id,v){this.c[id]=v;}
  start(){if(this.st==='off'||this.st==='stopping'){this.st='crank';this.t=0;this.nos=1;if(this.e.starter==='pull')this.events.push({type:'pull'});}}
  stop(){if(this.st!=='off')this.st='stopping';}
  get running(){return this.st==='run'||this.st==='catch';}
  shift(dir){
    const e=this.e;if(this.mode!=='drive'||this.shiftT>0||!this.running)return false;
    const to=this.gear+dir;if(to<1||to>e.nG)return false;
    if(this.gear===0){this.gear=to;this.clutch='open';return true;}
    this.shiftTo=to;this.shiftT=e.shiftT;this.clutch='open';this.engage=0;
    if(dir>0&&e.seq&&this.thr>.6)this.events.push({type:'shift'});
    return true;
  }
  /* cranking, catching and stopping: shared by every machine with a starter */
  _startup(dt){
    const e=this.e,idleW=(e.catchRpm||e.idle)*TAU/60;
    if(this.st==='off'){this.we=0;this.v=this.v>0?Math.max(0,this.v-dt*3):Math.min(0,this.v+dt*3);this.cutFrac=0;this.load=0;this.rack=0;this.rpm=0;this._out();return true;}
    if(this.st==='crank'){this.we=e.crankRpm*(1+.3*Math.sin(this.t*38*Math.min(1,e.crankRpm/235)))*TAU/60;this.thr=0;this.load=0;this.rpm=this.we*60/TAU;
      if(this.t>e.crankT){this.st='catch';this.t=0;}this._out();return true;}
    if(this.st==='catch'){const t=this.t,rt=e.catchT,cw=e.crankRpm*TAU/60;
      const tgt=idleW*(1+e.flare*Math.sin(Math.min(1,t/rt)*Math.PI/2)*Math.exp(-Math.max(0,t-rt)*2.6));
      this.we=cw+(tgt-cw)*sstep(0,rt,t);this.load=t<rt?.6:0;this.rack=.3;this.gi=.25;
      if(t>rt+.9)this.st='run';this.rpm=this.we*60/TAU;this._out();return true;}
    return false;
  }
  /* inp: {thr 0..1, brk 0..1, nos bool} */
  step(dt,inp){
    const e=this.e,idleW=e.idle*TAU/60,limW=e.limiterRpm*TAU/60;this.t+=dt;this.lopeT+=dt;
    this.twostep=false;this.cutFrac=0;let thrIn=clamp(inp.thr||0,0,1);const brk=clamp(inp.brk||0,0,1);
    this._extras(dt,brk);
    if(this._startup(dt))return;
    if(this.st==='stopping')thrIn=0;
    /* ---- throttle body ---- */
    this.thr+=(thrIn-this.thr)*Math.min(1,dt*(thrIn>this.thr?9:14)*e.resp);
    let thr=this.thr,thrSnd=this.thr;const rpm=this.we*60/TAU;
    /* ---- the rev limiter (a diesel's governor simply stops injecting) ---- */
    if(this.cutT>0){this.cutT-=dt;thr=0;this.cutFrac=1;}
    else if(e.limiter==='hard'&&rpm>e.limiterRpm){this.cutT=clamp(24/e.cyl*60/rpm*2,.025,.07);thr=0;this.cutFrac=1;}
    else if(e.limiter==='soft'&&rpm>e.limiterRpm-160*(e.redline/7000)){const k=clamp((e.limiterRpm-rpm)/(160*e.redline/7000),0,1);thr*=k;if(e.diesel)thrSnd*=k;else this.cutFrac=1-k;}
    /* ---- shifting ---- */
    const drive=this.mode==='drive',R=e.R;
    if(!drive)this.ww=this.v/R;
    if(this.shiftT>0){this.shiftT-=dt;
      if(this.shiftTo>this.gear){if(!(e.seq&&thrIn>.7)){thr=0;thrSnd=0;}else{thr=0;this.cutFrac=1;}}
      else{const tgt=e.gears[this.shiftTo-1]*e.fd*this.ww;thr=Math.max(thr,clamp((tgt-this.we)*.03,0,1));thrSnd=thr;}
      if(this.shiftT<=0){this.gear=this.shiftTo;this.clutch='slip';this.launching=false;this.engage=e.seq?.85:.3;this.engT=e.seq?.05:.18;}}
    /* ---- launch: hold the brake at a standstill, rev against the two-step, let go to launch ---- */
    if(drive&&this.v<.4&&brk>.5){this.held=true;this.clutch='open';this.launching=false;if(this.gear===0)this.gear=1;
      if(e.launch&&rpm>e.launchRpm){thr=0;this.cutFrac=.75;this.twostep=thrIn>.4;}}
    else if(drive&&this.held&&brk<.3)this.held=false;
    if(drive&&this.gear===0&&thrIn>.1&&this.running)this.gear=1;
    /* pulling away: the driver's left foot slips the clutch to hold the revs and lets it go as the car catches up */
    if(drive&&this.clutch==='open'&&!this.held&&this.shiftT<=0&&this.gear>0&&thrIn>.1&&this.running){
      this.clutch='slip';this.launching=this.v<4;this.launchT=0;this.engage=this.launching?.6:.2;this.engT=.25;
      this.wHold=e.launch?e.launchRpm*TAU/60:lerp(idleW*1.4,e.redline*.55*TAU/60,thrIn);}
    /* ---- traction control: cut sparks while the driven tyres spin past their peak (the rally-car stutter) ---- */
    this.tcOn=false;
    if(this.tc&&drive&&this.gear>0&&this.clutch!=='open'&&this.slip>.16&&this.v>.5){const k=clamp((this.slip-.16)*4.5,0,.85);thr*=1-k;this.cutFrac=Math.max(this.cutFrac,e.diesel?0:k);this.tcOn=k>.05;}
    /* ---- forced induction ---- */
    if(e.turbo){const spool=e.diesel?sstep(.22,.7,rpm/e.redline):sstep(e.s0,e.s1,rpm),tgt=thrSnd>.15?e.fiBoost*spool*(.35+.65*thrSnd):e.antilag&&this.running?e.fiBoost*.75*sstep(e.s0*.7,e.s1,rpm):0;
      if(this.boost>.35&&this.thrPrev>.6&&thrIn<.2&&!e.antilag&&e.bov!=='none'){this.events.push({type:'bov',flutter:e.bov==='flutter'});}
      this.boost+=(tgt-this.boost)*Math.min(1,dt*(tgt>this.boost?(.5+1.5*rpm/e.redline)/e.lag:6));}
    else this.boost=steadyBoost(e,rpm)*(thrSnd>.05?1:.2);
    this.thrPrev=thrIn;
    /* ---- torque ---- */
    let Te=engTq(e,Math.max(rpm,1),thr,this.boost);
    this.nosOn=false;
    if(inp.nos&&e.nosKw&&this.nos>0&&thrIn>.5&&this.running&&this.shiftT<=0&&!this.held&&this.cutFrac<.5){this.nosOn=true;this.nos=Math.max(0,this.nos-dt/e.nosT);Te+=Math.min(e.nosKw*1000/Math.max(this.we,150),e.tq*1.6);}
    if(this.st==='run'&&this.we<idleW*1.1&&thr<.3)Te+=Math.max(0,(idleW-this.we)*e.Ie*28);
    /* jake brake: the engine becomes an air compressor that dumps its work out of the stack */
    this.jakeOut=0;
    if(e.jake&&this.c.jake&&thrIn<.05&&rpm>e.idle*1.4&&this.running){this.jakeOut=this.c.jake;Te-=e.tq*(.9+.6*this.c.jake/3)*this.c.jake/3*Math.min(1,rpm/e.redline*1.4);}
    /* what the cylinders that do fire are breathing: the limiter drops events, it does not close the throttle */
    const TeS=engTq(e,Math.max(rpm,1),thrSnd,this.boost);
    this.load=this.st==='run'?clamp(thrSnd*(TeS>0?1:0)*(.42+.58*Math.min(1,TeS/e.tq)),0,1):0;
    /* ---- drivetrain: engine, clutch, gearbox, driven wheels with their own speed, tyre slip ---- */
    const m=e.mass,eta=.9,G=drive&&this.gear>0?e.gears[this.gear-1]*e.fd:0,Iw=(e.drv==='AWD'?4.8:2.4)*Math.max(1,m/2500);
    const drvF=e.drv==='AWD'?1:e.drv==='FWD'?.6-.15*this.aPrev/G0:.56+.18*this.aPrev/G0,Fmax=e.mu*m*G0*clamp(drvF,.35,1);
    /* tyre: force rises with slip to a peak at 12 percent, then falls away to a sliding plateau */
    const vn=Math.max(this.v,3),kap=(this.ww*R-this.v)/vn,KP=.12,sl=kap/KP,as=Math.abs(sl);
    let tf,tdf;if(as<1){tf=sl*(2-as);tdf=2-2*as;}else{tf=Math.sign(sl)*(.82+.18*Math.exp(-(as-1)*.8));tdf=0;}
    const F0=Fmax*tf,K=Fmax*tdf/KP;
    const res=.5*1.2*e.cdA*this.v*this.v+(this.v>.05?.013*m*G0+brk*m*G0*.95:0);
    /* semi-implicit wheel update: the tyre's own stiffness goes into the denominator */
    const wheel=(Tw,J)=>{const dww=dt*(Tw-F0*R)/(J+dt*K*R*R/vn);this.ww+=dww;return F0+K*dww*R/vn;};
    let F=0;
    if(!drive||this.gear===0||this.clutch==='open'){this.we+=dt*Te/e.Ie;F=wheel(0,Iw);}
    else if(this.clutch==='slip'){
      this.engage=Math.min(1,this.engage+dt/Math.max(.03,this.engT||.2));
      const cap=e.tq*(1.6+e.fiBoost*.7)*this.engage,wG=G*this.ww;let Tc;
      const wCar=G*this.v/R;if(this.launching&&wCar>=this.we-15)this.launching=false;
      if(this.launching){this.launchT+=dt;const wT=Math.max(wCar,this.wHold*Math.max(.8,1-.25*this.launchT));Tc=clamp(Te+30*e.Ie*(this.we-wT),0,cap);}
      else{Tc=cap*clamp((this.we-wG)/14,-1,1);if(Tc>0&&this.we<idleW*1.25)Tc=Math.min(Tc,Math.max(0,Te+e.Ie*30*(this.we-idleW*1.05)));}
      this.we+=dt*(Te-Tc)/e.Ie;F=wheel(Tc*G*eta,Iw);
      if(this.engage>=1&&!this.launching&&Math.abs(this.we-G*this.ww)<8){this.clutch='lock';this.launching=false;this.we=G*this.ww;}
      if(this.launching&&this.launchT>3)this.launching=false;
    }else{
      F=wheel(Te*G*eta,Iw+e.Ie*G*G*eta);this.we=G*this.ww;
      if(this.we<idleW*.8&&this.v<6)this.clutch='open';
    }
    if(brk>.1)this.ww+=(this.v/R-this.ww)*Math.min(1,dt*25*brk);
    let dv=(F-res)/(m+Iw/(R*R));
    if(this.held){dv=Math.min(0,dv);this.ww=0;}
    this.v=Math.max(0,this.v+dv*dt);if(this.v<.05&&brk>.1){this.v=0;this.ww=0;}
    this.ww=Math.max(0,this.ww);this.aPrev=dv;this.spin=kap>.2;this.slip=kap;
    if(this.we>limW*1.08)this.we=limW*1.08;
    if(this.st==='stopping'){if(this.we<idleW*.35){this.st='off';this.we=0;}}
    else if(this.we<idleW*.6)this.we=idleW*.6;
    this.rpm=this.we*60/TAU;
    /* ---- the automatic gearbox ---- */
    if(drive&&this.auto&&this.shiftT<=0&&!this.held&&this.gear>0){
      if(this.clutch!=='open'&&!this.launching&&this.gear<e.nG&&this.rpm>e.shiftRpm&&thrIn>.3)this.shift(1);
      else if(this.gear>1){const after=this.rpm*e.gears[this.gear-2]/e.gears[this.gear-1];if(after<e.redline*.86&&(this.rpm<e.redline*.42||(brk>.3&&after<e.redline*.8)||(this.jakeOut&&after<e.redline*.85&&this.rpm<e.redline*.62)))this.shift(-1);}
    }
    if(drive&&this.v<.5&&this.gear>1&&this.shiftT<=0)this.gear=1;
    this._move(dt);
    this._out();
  }
  /* horn, air brakes and other things the driver does with the other hand */
  _extras(dt,brk){
    const e=this.e;this.hornOn=!!this.c.horn;
    if(e.airbrakes&&this.running){
      if(brk>.5){if(this.brkT===0)this.events.push({type:'airApply'});this.brkT+=dt;}
      else{if(this.brkT>.25){this.events.push({type:'airRelease'});this.airUse+=1;if(this.airUse>=3&&this.dryerT<=0)this.dryerT=2.5+Math.random()*2;}this.brkT=0;}
      if(this.dryerT>0){this.dryerT-=dt;if(this.dryerT<=0){this.events.push({type:'airDryer'});this.airUse=0;}}
    }
  }
  _move(dt){this.pos+=this.v*dt;if(this.pos>170){this.pos=-170;this.jump=true;}else if(this.pos<-170){this.pos=170;this.jump=true;}}
  _out(){
    const e=this.e,w=1-clamp((this.rpm-e.idle)/(e.idle*.9+1),0,1),lope=CAM_LOPE[e.cam|0]*1.4+(e.ch.lope||0)+(e.lope||0);
    /* lumpy cams hunt at idle: the needle and the sound both bob */
    const mod=this.running&&lope?lope*w*(Math.sin(this.lopeT*TAU*1.55)+.6*Math.sin(this.lopeT*TAU*.62+1.3)):0;
    this.rpmOut=this.st==='off'?0:this.st==='crank'?this.we*60/TAU:this.we*60/TAU*(1+mod);
  }
  /* parameters for the synth. listener: 0 outside, 1 in the cab, 2 at the side (or across the yard) */
  params(listener,vol=1){
    const e=this.e;let dist=e.behindDist||3,pan=0,rear=1;
    if(listener===1){dist=e.cabDist||1.4;rear=.35;}
    else if(listener===2){if(e.stationary){dist=e.farDist||22;pan=.3;rear=.55;}else{const y=e.passY||7;dist=Math.hypot(this.pos,y);pan=clamp(this.pos/dist,-1,1);rear=.5+.5*this.pos/dist;}}
    const crank=this.st==='crank'||!!this.airStart;
    return {on:this.st!=='off'&&this.st!=='crank'?1:0,firing:(this.st==='run'||this.st==='catch')&&!this.airStart?1:0,crank:crank?1:0,crankT:crank?this.t:0,
      rpm:this.rpmOut,load:this.load,cutFrac:this.cutFrac,boost:this.boost,nos:this.nosOn?1:0,speed:Math.abs(this.v),gear:this.gear,twostep:this.twostep?1:0,
      antilag:e.antilag&&e.turbo&&this.thr<.2&&this.running?1:0,view:listener,dist,pan,rear,vol,jump:this._jump(),jake:this.jakeOut||0,horn:this.hornOn?1:0,fx:this.fx||{}};
  }
  _jump(){const j=this.jump?1:0;this.jump=false;return j;}
  takeEvents(){const ev=this.events;this.events=[];return ev;}
}

/* ---------- everything that is not a road vehicle: a governor holds the speed, the machine loads it ---------- */
class MachineSim extends EngineSim{
  resetControls(){
    const e=this.e;super.resetControls();
    this.lever=e.lever0||0;this.tg=e.idle;this.lr=0;this.notchT=0;this.bellT=0;this.beepT=0;this.pumpT=0;this.resv=1;this.pB=e.boiler?e.boiler-.6:0;this.saf=false;this.slipOn=false;this.wd=0;
    this.hp=0;this.dec=0;this.hit=false;this.nextHit=false;this.stroke='';this.hits=[];this.idleT=0;this.press=0;this.flow=0;this.relief=0;this.swing=0;this.trackV=0;
    this.soil=0;this.wood=.5;this.tripT=0;this.dynOn=false;this.airStart=0;this.orderPrev=0;this.stalled=false;this.loadE=0;
    this.c.gearM=e.machine==='tractor'?2:1;this.c.cutoff=.6;this.v=0;
  }
  start(){
    if(this.e.machine==='steam'){if(this.st==='off'||this.st==='stopping'){this.st='run';this.t=0;}return;}
    this.stalled=false;super.start();
  }
  _gov(dt,tgt,Tl,o){
    const e=this.e;let rpm=this.we*60/TAU;
    const err=(tgt-rpm)/e.redline;
    this.gi=clamp(this.gi+err*e.gKi*dt,-.3,1.1);
    let rack=clamp(e.gKp*err+this.gi,0,1);
    /* the smoke limiter: a turbo diesel cannot burn more fuel than its boost has air for */
    if(e.turbo&&e.diesel){const lim=.55+.45*clamp(this.boost/Math.max(.3,e.fiBoost),0,1);rack=Math.min(rack,lim);}
    if(o&&o.rack!==undefined)rack=o.rack;
    this.rack+=(rack-this.rack)*Math.min(1,dt*25);
    /* boost follows exhaust energy: fuel and speed */
    if(e.turbo){const tb=e.fiBoost*clamp(this.rack*1.2-.12,0,1)*sstep(.15,.7,rpm/e.redline)+(o&&o.boostFloor||0);
      this.boost+=(tb-this.boost)*Math.min(1,dt*(tb>this.boost?1/e.lag:2.5));}
    else this.boost=steadyBoost(e,rpm)*(this.rack>.1?1:.3);
    const Te=o&&o.Te!==undefined?o.Te:engTq(e,Math.max(rpm,1),this.rack,this.boost);
    this.we=Math.max(0,this.we+dt*(Te-Tl)/e.Ie);
    this.rpm=this.we*60/TAU;
    this.pwr=(this.pwr||0)+(Math.max(0,Te)*this.we-(this.pwr||0))*Math.min(1,dt*3);
    this.load=this.st==='run'?clamp(this.rack*(e.diesel?1.05:1),0,1):0;
    return Te;
  }
  step(dt,inp){
    const e=this.e,c=this.c;this.t+=dt;this.lopeT+=dt;this.cutFrac=0;this.twostep=false;this.chip={};
    this.hornOn=!!c.horn;
    if(e.machine==='steam'){this._steam(dt,inp);return;}
    if(this.airStart>0){this._ship(dt,inp);this._move(dt);this._out();return;}
    if(this._startup(dt)){this.fx=this._fxIdle();return;}
    const stopping=this.st==='stopping';
    const fn=this['_'+e.machine];if(fn)fn.call(this,dt,inp,stopping);
    if(stopping&&this.we<(e.idle*TAU/60)*.3){this.st='off';this.we=0;this.rpm=0;}
    this._move(dt);this._out();
  }
  _fxIdle(){return this.e.machine==='genset'?{alt:1,ef:this.rpm/30*(this.e.hz===50?1:1)}:{};}
  /* ---- standby generator: an isochronous governor holds 1,800 rpm while you throw load at it ---- */
  _genset(dt,inp,stopping){
    const e=this.e,c=this.c,rated=e.rated,w=Math.max(this.we,20);
    let ld=stopping?0:clamp(this.lever,0,1);if(this.tripT>0){this.tripT-=dt;ld=0;}
    this.loadE+=(ld-this.loadE)*Math.min(1,dt*30);
    const P=this.loadE*e.kW*1000/.93,Tl=P/w+e.tq*.06;
    this._gov(dt,stopping?0:rated,Tl,stopping?{rack:0}:null);
    const f=this.rpm/60*2;this.freq=f;this.kWout=this.loadE*e.kW*clamp(this.rpm/rated,0,1.1);
    this.chip={gov:Math.abs(this.rpm-rated)>rated*.012,over:this.rack>=.98&&this.rpm<rated*.97,trip:this.tripT>0};
    this.fx={alt:1,elec:this.loadE,ef:f,fan:.25+.6*this.loadE,fanHz:175};
    this.v=0;
  }
  trip(){if(this.e.machine==='genset'&&this.running){this.tripT=.4;this.lever=0;this.events.push({type:'trip'});}}
  /* ---- diesel-electric locomotive: notches set the engine speed, the load regulator brings the generator in ---- */
  _loco(dt,inp,stopping){
    const e=this.e,c=this.c,N=[255,315,395,485,565,650,735,820,904].map(r=>r*e.redline/904),notch=stopping?0:Math.round(clamp(this.lever,0,1)*8);
    const dyn=!!c.dyn&&!stopping,isolated=this.mode==='free';
    const want=dyn?N[Math.max(4,notch)]:N[notch];
    const sl=want>this.tg?e.slewUp:e.slewDn;this.tg+=clamp(want-this.tg,-sl*dt,sl*dt);
    if(notch!==this.notchPrev){if(notch>(this.notchPrev||0))this.lr=Math.min(this.lr,.15);this.notchPrev=notch;}
    this.lr=Math.min(1,this.lr+dt*.22);
    const frac=notch/8,Pdem=isolated||dyn?0:e.kW*1000*Math.pow(frac,1.15)*this.lr*clamp((this.rpm-N[0])/(N[notch]-N[0]+1)*1.2,0,1);
    const w=Math.max(this.we,10),Tl=Pdem/w+e.tq*(.05+(dyn?.12:0));
    this._gov(dt,stopping?0:this.tg,Tl,stopping?{rack:0}:{boostFloor:e.fiBoost*.15*this.rpm/e.redline});
    /* the train */
    const m=e.mass,Fadh=.28*180000*G0,Pt=Pdem*.86;let F=this.v>.02||Pt>0?Math.min(Pt/Math.max(this.v,1.2),Fadh):0;
    if(this.v>30)F*=clamp((33-this.v)/3,0,1);
    const Fdyn=dyn?Math.min(240000,30000*this.v):0,Fb=c.brake?.09*m*G0:0;
    const res=this.v>.01?m*G0*.0016+30*this.v+7*this.v*this.v:0;
    this.v=Math.max(0,this.v+(F-res-Fdyn-Fb)/m*dt);if(this.v<.03&&F<=0)this.v=0;
    this.notch=notch;this.dynOn=dyn;this.trac=Pt/1000;
    this.chip={lr:this.lr<.98&&notch>0&&!isolated&&!dyn,dyn,horn:this.hornOn,bell:!!c.bell};
    this._bellTick(dt);this._brakeAir(dt,!!c.brake);
    this.fx={rail:1,fan:dyn?clamp(this.v/12,.2,1):.12+.25*frac*frac,fanHz:dyn?120:150};
  }
  _bellTick(dt){if(this.c.bell&&this.running){this.bellT-=dt;if(this.bellT<=0){this.bellT=.78;this.events.push({type:'bell'});}}else this.bellT=0;}
  _brakeAir(dt,on){if(on){if(this.brkT===0)this.events.push({type:'airApply'});this.brkT+=dt;}else{if(this.brkT>.25)this.events.push({type:'airRelease'});this.brkT=0;}}
  /* ---- slow-speed marine diesel: the telegraph sets rpm, the propeller is the load, air starts it ---- */
  _ship(dt,inp,stopping){
    const e=this.e,order=stopping?0:Math.round(clamp(this.lever,0,1)*4),want=e.orders[order]*e.redline/90;this.order=order;
    const x=this.rpm/e.redline,Tp=e.tq*1.6*x*x*(1.15-.15*clamp(this.v/e.vmax,0,1));
    if(this.airStart>0){
      /* starting air: compressed air drives the pistons until the engine turns fast enough to fire */
      this.airStart-=dt;this.chip={air:true,horn:this.hornOn};const wc=e.crankRpm*TAU/60;this.we+=(wc-this.we)*Math.min(1,dt*1.5);this.rpm=this.we*60/TAU;this.load=0;
      if(this.airStart<=0){this.airStart=0;this.tg=Math.max(this.rpm,want*.8);this.gi=.35;this.rack=.4;}
      this.v+=(e.vmax*x-this.v)*dt/30;
      this.fx={prop:x,wash:clamp(this.v/e.vmax,0,1),blades:e.blades};return;
    }
    if(order===0||stopping){
      /* fuel off: the propeller drags the engine to a stop */
      this._gov(dt,0,Tp+e.tq*.06,{rack:0});if(this.rpm<1.5){this.we=0;this.rpm=0;}
      if(stopping&&this.rpm<1){this.st='off';}
    }else{
      if(this.rpm<e.idle*.45){this.airStart=2.4;this.events.push({type:'airApply'});return;}
      const sl=want>this.tg?e.slewUp:e.slewDn;this.tg+=clamp(want-this.tg,-sl*dt,sl*dt);
      this._gov(dt,this.tg,Tp+e.tq*.04,null);
    }
    this.v+=(e.vmax*clamp(this.rpm/e.redline,0,1.1)-this.v)*dt/30;
    this.power=Math.max(0,Tp*this.we)/1e6;
    this.chip={air:this.airStart>0,horn:this.hornOn};
    this.fx={prop:clamp(x,0,1.1),wash:clamp(this.v/e.vmax,0,1),blades:e.blades};
  }
  /* ---- hit-and-miss: fire only when the flywheels have slowed below the set speed ---- */
  _hitmiss(dt,inp,stopping){
    const e=this.e,c=this.c,set=lerp(e.govMin,e.govMax,clamp(this.lever,0,1));let rpm=this.rpm;this.setRpm=set;
    this.hp+=rpm*6*dt;
    if(this.hp>=540&&!this.dec){this.dec=1;this.nextHit=!stopping&&rpm<set;}
    if(this.hp>=720){this.hp-=720;this.dec=0;this.hit=this.nextHit;this.stroke=this.hit?'HIT':'MISS';this.strokeT=0;this.hits.push(this.hit?1:0);if(this.hits.length>16)this.hits.shift();}
    const Tl=(c.belt?e.tq*.22:0)+(c.heavy?e.tq*.3:0);
    const power=this.hit&&this.hp<180;
    const Te=power?4*engTq(e,Math.max(rpm,1),1,0):engTq(e,Math.max(rpm,1),0,0);
    this._gov(dt,set,Tl,{rack:power?1:0,Te});
    this.cutFrac=this.nextHit?0:1;this.load=this.nextHit?.95:0;
    this.chip={hit:this.stroke==='HIT',miss:this.stroke==='MISS',belt:!!c.belt};
    if(!stopping&&this.rpm<e.idle*.5&&this.st==='run'){this.st='stopping';this.stalled=true;}
    this.v=0;this.fx={};
  }
  /* ---- tractor: hand throttle sets the governor, gears set ground speed, the plough drags ---- */
  _tractor(dt,inp,stopping){
    const e=this.e,c=this.c,tgt=stopping?0:lerp(e.idle,e.redline,clamp(this.lever,0,1)),drive=this.mode==='drive'&&!stopping;
    const g=clamp(c.gearM|0,1,e.nG),vt=drive?this.rpm/e.redline*e.gearV[g-1]:0;
    this.soil+=((Math.random()-.5)*1.4-this.soil*.6)*dt*3;
    const dv=vt-this.v;this.v+=dv*Math.min(1,dt*1.6);
    const plough=drive&&c.plow&&this.v>.15?e.tq*(.55+.3*clamp(this.soil,-1,1))*(.55+.45*g/e.nG):0;
    const Tl=e.tq*.07+(drive?e.mass*.02*G0*e.gearV[g-1]/(e.redline*TAU/60)*.5+Math.max(0,dv)*e.mass*.5*e.gearV[g-1]/(e.redline*TAU/60):0)+plough;
    this._gov(dt,tgt,Tl,stopping?{rack:0}:null);
    this.chip={plow:!!c.plow,lug:this.rack>.97&&this.rpm<tgt*.9};
    if(!stopping&&this.rpm<e.idle*.5){this.st='stopping';this.stalled=true;}
    this.fx={};
  }
  /* ---- excavator: the dial sets engine speed, the hydraulic pump loads it, the relief valve screams at the stall ---- */
  _excavator(dt,inp,stopping){
    const e=this.e,c=this.c,dial=Math.round(clamp(this.lever,0,1)*9)+1;this.dial=dial;
    const act=c.boom||c.swing||c.dig||c.travel||c.reverse;
    this.idleT=act?0:this.idleT+dt;const auto=this.idleT>4;
    const tgt=stopping?0:auto?e.idle:lerp(e.idle,e.redline,(dial-1)/9);
    const Pw=Math.max(c.boom?.55:0,c.swing?.45:0,c.travel||c.reverse?.5:0,c.dig?1:0),Qw=Math.min(1,(c.boom?.6:0)+(c.swing?.45:0)+(c.travel||c.reverse?.75:0)+(c.dig?.25:0));
    this.press+=(Pw-this.press)*Math.min(1,dt*(Pw>this.press?6:3));this.flow+=(Qw-this.flow)*Math.min(1,dt*5);
    this.relief+=((c.dig?1:0)-this.relief)*Math.min(1,dt*8);this.swing+=((c.swing?1:0)-this.swing)*Math.min(1,dt*(c.swing?1.2:2));
    const x=this.rpm/e.redline,vT=(c.travel?1.4:c.reverse?-1.4:0)*x;this.trackV+=(vT-this.trackV)*Math.min(1,dt*1.5);this.v=this.trackV;
    const Tl=e.tq*1.7*this.press*(.35+.65*this.flow)*x+e.tq*.12;
    this._gov(dt,tgt,Tl,stopping?{rack:0}:null);
    if(c.reverse&&this.running){this.beepT-=dt;if(this.beepT<=0){this.beepT=1;this.events.push({type:'beep'});}}else this.beepT=0;
    this.chip={rel:this.relief>.5,auto,alarm:!!c.reverse};
    this.fx={hyd:this.press*clamp(x*1.2,0,1),flow:this.flow*x,relief:this.relief,swing:this.swing,trackV:Math.abs(this.trackV),fan:.25+.35*this.press,fanHz:this.rpm/60*1.3*7};
  }
  /* ---- chainsaw: a trigger, a centrifugal clutch, and wood ---- */
  _saw(dt,inp,stopping){
    const e=this.e,c=this.c,thrIn=stopping?0:clamp(inp.thr||0,0,1);let rpm=this.rpm;
    this.thr+=(thrIn-this.thr)*Math.min(1,dt*(thrIn>this.thr?14:18));
    const idleRack=stopping?0:clamp(.16+(e.idle-rpm)/e.idle*.6,0,.4),rack=Math.max(this.thr,idleRack);
    const engaged=rpm>e.clutch;this.wood+=((Math.random()-.5)*.8+(.5-this.wood))*dt*2;
    const cut=engaged&&c.cut&&!stopping;
    const Tl=(engaged?e.tq*.1:0)+(cut?e.tq*(.55+.35*this.wood)*clamp(rpm/e.redline,0,1.2)*1.35:0);
    this._gov(dt,0,Tl,{rack});
    /* off the wood at full throttle a two-stroke runs rich and misses: it four-strokes */
    const fs=rack>.85&&!cut&&rpm>e.redline*.9;if(fs)this.cutFrac=.35;
    this.chainV=engaged?rpm*.00185:0;this.load=clamp(rack,0,1);
    this.chip={clutch:engaged,cut,fs};
    this.fx={chain:engaged?clamp(rpm/e.redline,0,1):0,chainV:this.chainV,cut:cut?clamp(rpm/e.redline,.3,1):0};
    if(!stopping&&rpm<1000&&this.st==='run'){this.st='stopping';this.stalled=true;}
    this.v=0;
  }
  /* ---- lawn mower: an air-vane governor, a blade on the crank, and a thick patch of grass ---- */
  _mower(dt,inp,stopping){
    const e=this.e,c=this.c,tgt=stopping?0:lerp(e.idle,e.redline*.95,clamp(this.lever,0,1));
    this.soil+=((Math.random()-.5)*1.6-this.soil*.8)*dt*4;
    const grass=c.mow?(c.thick?.95+.25*this.soil:.3+.1*this.soil):0;
    const Tl=e.tq*(.12+.18*Math.pow(this.rpm/e.redline,2))+e.tq*.62*Math.max(0,grass);
    this._gov(dt,tgt,Tl,stopping?{rack:0}:null);
    this.chip={mow:!!c.mow,bog:this.rpm<tgt*.88};
    this.fx={blade:clamp(this.rpm/e.redline,0,1),grass:Math.max(0,grass)*clamp(this.rpm/e.redline,0,1)};
    if(!stopping&&this.rpm<900&&this.st==='run'){this.st='stopping';this.stalled=true;}
    this.v=0;
  }
  /* ---- steam: regulator and cut-off, a boiler that can run short, and wheels that can slip ---- */
  _steam(dt,inp){
    const e=this.e,c=this.c,r=e.driverD/2,m=e.mass;
    const lit=this.st==='run';if(this.st==='stopping'||this.st==='crank'||this.st==='catch')this.st=lit?'run':'off';
    const reg=lit?clamp(this.lever,0,1):0,cut=clamp(c.cutoff,.15,.75);
    const mep=cut*(1+Math.log(1/cut))/(.75*(1+Math.log(1/.75)));
    const pr=clamp(this.pB/e.boiler,0,1.05),rpmD=this.wd*60/TAU;
    let F=e.Fmax*reg*pr*mep;
    /* above the boiler's steaming rate the chest pressure falls away */
    const dem=reg*cut*Math.max(rpmD,15)/e.steamRate;if(dem>1)F/=dem;
    /* the fireman: steam made at a steady rate, the blower draws the fire harder, the safety valves lift at full pressure */
    const use=reg*cut*Math.max(rpmD,8)*.0042+(this.saf?.35:0)+(c.horn?.05:0)+(c.drain?.04:0),gen=lit?Math.min(.34+(c.blower?.08:0),.045+(use-(this.saf?.35:0))*1.02+(c.blower?.04:0)):0;
    this.pB=clamp(this.pB+(gen-use)*dt,0,e.boiler+.4);
    if(this.pB>=e.boiler+.15)this.saf=true;else if(this.pB<e.boiler-.25)this.saf=false;
    if(!lit)this.saf=false;
    /* adhesion: push harder than the rails will take and the drivers spin */
    const Fa=.26*e.Wadh*G0;let Ft;
    if(!this.slipOn&&F>Fa*(1+.04*Math.sin(this.t*3)))this.slipOn=true;
    if(this.slipOn){const Fr=Fa*.7;this.wd+=dt*(F-Fr)*r/e.Idr;Ft=Fr;if(F<Fa*.78&&this.wd*r<=this.v+.3)this.slipOn=false;}
    else Ft=F;
    const Fb=c.brake&&this.v>0?.09*m*G0:0,res=this.v>.01?m*G0*.0018+40*this.v+8*this.v*this.v:0;
    this.v=Math.max(0,this.v+(Ft-res-Fb)/m*dt);if(this.v<.02&&Ft<=res)this.v=Ft>0?this.v:0;
    if(!this.slipOn)this.wd=this.v/r;else this.wd=Math.max(this.wd,this.v/r);
    this.pwr=(this.pwr||0)+(Math.max(0,Ft*this.v)-(this.pwr||0))*Math.min(1,dt*3);
    this.we=this.wd;this.rpm=this.wd*60/TAU;this.rpmOut=this.rpm;
    this.load=clamp(reg*pr*(.35+.65*mep),0,1);this.thr=reg;this.boost=0;
    /* the air pump tops up the brake reservoir, a stroke at a time */
    if(c.brake)this.resv=Math.max(0,this.resv-dt*.22);
    if(lit&&this.resv<.98){this.pumpT-=dt;if(this.pumpT<=0){this.pumpT=1.05+Math.random()*.25;this.resv=Math.min(1,this.resv+.07);this.events.push({type:'pump'});}}
    else if(lit){this.resv-=dt*.004;}
    this._brakeAir(dt,!!c.brake);
    this.chip={slip:this.slipOn,drain:!!c.drain,saf:this.saf,whistle:this.hornOn};
    this.fx={rail:1,cutoff:cut,drain:!!c.drain,safety:this.saf?1:0,blower:lit&&(c.blower||reg<.05)?(c.blower?1:.35):0};
    this._move(dt);
  }
  params(listener,vol=1){
    const p=super.params(listener,vol);const e=this.e;
    if(e.machine==='steam'){p.on=this.st==='run'?1:0;p.firing=p.on;p.crank=0;p.rpm=this.rpm;}
    if(e.machine==='ship'&&this.order===0&&this.rpm<1){p.firing=0;}
    return p;
  }
  _move(dt){
    const e=this.e,lim=e.machine==='ship'?320:170;this.pos+=this.v*dt;
    if(this.pos>lim){this.pos=-lim;this.jump=true;}else if(this.pos<-lim){this.pos=lim;this.jump=true;}
  }
}
function makeSim(spec){return spec&&spec.road?new EngineSim(spec):new MachineSim(spec);}
return {LAYOUTS,LAYOUT_IDS,PRESETS,DEFAULTS,MACHINES,EXHAUSTS,INTAKES,CAMS,INDUCTION,HORNS,NOS_SHOTS,TURBO_SIZE,makeSpec,engTq,steadyBoost,curve,bankIntervals,dspCfg,EngineSim,MachineSim,makeSim,clamp};
})();
if(typeof module!=='undefined')module.exports=SIM;
