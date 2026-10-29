/* =====================================================================================
   THE GAME: Dirt Sleeper Showdown. Free roam on the ranch and the country round it, in any of the seven cars
   built any way the garage allows (56_parts), for money: every feat pays (58_feats). Mini Dirt Run Solo's
   game with Dirt Sleeper Sim's fourth driving level (43_sim) and graphics (55_gfx). Underneath: the physics
   (40_physics, 42_chassis) at 240 steps a second, the car drawn from its own model where the physics puts
   it, a chase camera, keyboard, game controller and touch (64_touch), and the engine through the Digital
   Engine synth (17_audio), heard from behind the car.
   ===================================================================================== */
const RES=[[320,180,1],[480,270,1],[640,360,2],[960,540,3],[1280,720,4]];
const APP={t:0,bi:0,car:'suv',level:'real',cam:0,fps:60,tris:0,res:3,lights:false,tod:'day',steer:'slide',haptics:true,detail:'auto',od:false,orbit:false,bigMap:false};
/* each car's rig: what's on it now. A car not yet touched is its stock preset */
const RIGS={};
const CAR_STOCK={suv:'stock',trail:'trail',coupe:'coupe',wagon:'wagon',pickup:'pickup',muscle:'muscle',hatch:'hatch'};
try{const s=JSON.parse(store.get('dssd-game','{}'))||{};
  if(CAR_PARTS[s.car])APP.car=s.car;if(['real','middle','kids','sim'].includes(s.level))APP.level=s.level;if(s.cam>=0&&s.cam<3)APP.cam=s.cam|0;
  if(TOD[s.tod])APP.tod=s.tod;if(['slide','tilt','buttons'].includes(s.steer))APP.steer=s.steer;if(s.haptics===false)APP.haptics=false;if(['auto','sharp','smooth','fast'].includes(s.detail))APP.detail=s.detail;
  if(s.rigs)for(const car in s.rigs)if(CAR_PARTS[car])RIGS[car]=cleanRig(car,s.rigs[car]);}catch(e){}
/* a saved rig against today's parts: anything that no longer exists goes back to stock */
function cleanRig(car,r){const base=presetRig(CAR_STOCK[car]),out=Object.assign({},base);
  for(const [k] of SLOTS)if(r&&r[k]!==undefined&&slotOptions(car,k,Object.assign({},base,r)).some(o=>o[0]===r[k]))out[k]=r[k];
  for(const [k] of SLOTS)if(fits(car,out,k,out[k]))out[k]=base[k];
  return fixRig(car,out);}
const rigOf=car=>RIGS[car]||(RIGS[car]=presetRig(CAR_STOCK[car]));
const saveGame=()=>store.set('dssd-game',JSON.stringify({car:APP.car,level:APP.level,cam:APP.cam,tod:APP.tod,steer:APP.steer,haptics:APP.haptics,detail:APP.detail,rigs:RIGS}));
const LEVELS=[['real','Realistic','The car as it is: ABS, the automatic gearbox and, on the cars that have it, the factory traction control that brakes a spinning wheel so the others pull. It slides on loose dirt, spins its tyres, and rolls if you ask it to.'],
  ['middle','Middle','A steering helper, stability control and traction control step in when it starts to get away from you. Still rolls if you really try.'],
  ['kids','Kids','Extra grip, every helper on, and a hand that keeps it on its wheels, at full speed. If it does go over, it flips itself back.'],
  ['sim','Sim','Realistic, and the world as it is: the full weight transfer through the suspension, tyres that dig into dirt and gravel when they slide sideways and trip the car over, kerbs and rut walls that catch a sliding tyre, shocks and brakes that fade when they get hot, roof loads that raise the centre of gravity, ABS only on cars that had it, and your choice of tyre pressure, weather and roof cargo below. Slide a tall truck sideways off the road and it will roll.']];
const CAMS=['Chase','Far','Hood'];
const DT=1/240;
/* car: the player's Vehicle. voice: its synth (any object with the engine's spec; voiceNode gives it a port) */
const GAME={car:null,voice:{spec:null,node:null,port:null,popT:-1e9,flame:0,flameL:0},state:'boot',acc:0,time:0,flipT:0,place:'',msgs:[],dirt:0,engineWanted:false,touch:false,busy:false,gear:1,limT:0};
/* small vector sums for the camera and the sound, once a frame (the physics makes no garbage; these may) */
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub2=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],madd=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k],
  dot2=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(a[0],a[1],a[2]),norm2=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
  mvec=(m,v)=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]],mcol=(m,i)=>[m[i],m[3+i],m[6+i]];
/* how far a car's model sits off its centre of gravity, and how much it has been lifted off its factory height */
const carD=t=>truck(t.bi).D,liftOf=t=>t.cg[1]-HCG[t.build.look.body||'suv'];
/* the name the HUD and the log give the car: its preset's name, or Custom once a part has changed */
function rigName(car,rig){
  for(const id of presetsOf(car)){const p=PRESET_PARTS[id];if(SLOTS.every(([k])=>p[k]===rig[k]))return BUILDS.find(b=>b.id===id).name;}
  return 'Custom';}
const carLabel=()=>carName({car:APP.car})+' '+rigName(APP.car,rigOf(APP.car));

/* ---------- where things are on the ranch ---------- */
let PLACES=[];
function computePlaces(){
  const W=RANCH.W,D=W.D,dirYaw=(p,s)=>{const d=p.dir(s);return Math.atan2(-d[1],d[0]);},at=(p,s)=>p.at(s);
  PLACES=[
    ['shop','The shop',6,4,0],
    ['strip','Drag strip',D.strip.start-9,D.strip.lanes[0],0],
    ['burn','Burnout pad',D.burn.x-D.burn.w/2+4,D.burn.z,0],
    ['mud','Mud pit',D.mud.x+D.mud.rx+9,D.mud.z,PI],
    ['rocks','Rock garden',D.rocks.x0-8,D.rocks.z0+22,0],
    ['climb','Hill climb',...at(W.climb,3),dirYaw(W.climb,3)],
    ['loop','Trail loop',...at(W.loop,6),dirYaw(W.loop,6)],
    ['mudtrack','Mud track',...at(W.mudTrack,8),dirYaw(W.mudTrack,8)]];
  /* out in the country */
  const C=W.country,T=C.track,wn=C.woods.nearest(-250,-520,2).s;
  PLACES.push(['home','Home',-468,630,Math.atan2(16,10)],['lane','The lane',...at(C.lane,8),dirYaw(C.lane,8)],['store','Feed & Fuel',506,387,PI],
    ['track','Race track',...at(T,T.len-40),dirYaw(T,T.len-40)],['county','County road',300,401,0],['pond','The pond',-60,-474,PI/2],['woods','Woods trail',...at(C.woods,wn),dirYaw(C.woods,wn)]);
  /* the far country (50_far) */
  const F=C.far,pad=F.pad;
  PLACES.push(['speedway','Speedway',...at(F.oval,F.oval.len-60),dirYaw(F.oval,F.oval.len-60)],['short','Short course',...at(F.short,F.short.len-30),dirYaw(F.short,F.short.len-30)],
    ['summit','Summit Road',...at(F.summit,12),dirYaw(F.summit,12)],['top','Mountain top',(pad[0]+pad[2])/2,(pad[1]+pad[3])/2,PI],
    ['rally','Rally stage',...at(F.rally,12),dirYaw(F.rally,12)],['lake','Dry lake',...at(F.lakeLoop,F.lakeLoop.len-40),dirYaw(F.lakeLoop,F.lakeLoop.len-40)]);
}
/* the name of the place the car is in */
function placeName(x,z){
  const W=RANCH.W,D=W.D,S=D.strip,in2=(x0,z0,x1,z1)=>x>x0&&x<x1&&z>z0&&z<z1;
  if(in2(S.x0,S.z-S.half-4,S.x1,S.z+S.half+4))return x<S.start?'Drag strip: staging':x<S.start+S.eighth?'Drag strip':'Drag strip: shutdown';
  if(Math.hypot((x-D.mud.x)/D.mud.rx,(z-D.mud.z)/D.mud.rz)<1.25)return 'Mud pit';
  const B=D.burn;if(in2(B.x-B.w/2-2,B.z-B.d/2-2,B.x+B.w/2+2,B.z+B.d/2+2))return 'Burnout pad';
  const R=D.rocks;if(in2(R.x0,R.z0,R.x0+R.w,R.z0+R.d))return 'Rock garden';
  if(in2(D.shop.x0-4,D.shop.z0-4,D.shop.x1+4,D.shop.z1+2))return 'In the shop';
  if(in2(-26,-16,26,16))return 'The yard';
  const near=(p,r)=>{const n=p.nearest(x,z,2);return n&&n.d<r;};
  if(near(W.mudTrack,10))return 'Mud track';
  if(near(W.climb,8))return Math.hypot(x-D.hill.x,z-D.hill.z)<30?'Top of the hill':'Hill climb';
  if(near(W.creek,7))return 'The creek';
  if(near(W.loop,8))return 'Trail loop';
  if(Math.hypot(x-D.hill.x,z-D.hill.z)<70)return 'Red Hill';
  /* out in the country */
  const C=W.country,P=C.pond,pd=C.paddock;
  if(x>-530&&x<-440&&z>610&&z<690)return 'Home';
  if(near(C.lane,6))return 'The lane';
  if(x>396&&x<566&&z>316&&z<420)return 'Feed & Fuel';
  if(x>pd.x0-5&&x<pd.x1+5&&z>pd.z0-5&&z<pd.z1+3)return 'The paddock';
  {const n=C.track.nearest(x,z,2);if(n&&n.d<30)return n.s<150||n.s>C.track.len-130?'Race track: the straight':'Race track';}
  if(Math.hypot((x-P.x)/P.rx,(z-P.z)/P.rz)<1.5)return 'The pond';
  if(near(C.woods,8)||near(C.conn,8))return 'Woods trail';
  if(near(C.drive,7))return 'Ranch drive';
  /* the far country */
  const F=C.far,L=F.DEF.lake,sp=F.DEF.speedway,pad=F.pad;
  {const n=F.oval.nearest(x,z,2);if(n&&n.d<26)return n.s<110||n.s>F.oval.len-110?'Speedway: the front straight':'Speedway';}
  if(near(F.short,14))return 'Short course';
  if(x>sp.x0-10&&x<sp.x1+10&&z>sp.z0-10&&z<sp.z1+10)return z>F.DEF.lot.z0-6?'Speedway car park':'Speedway Park';
  if(x>pad[0]-6&&x<pad[2]+6&&z>pad[1]-6&&z<pad[3]+6)return 'The summit';
  if(near(F.summit,10))return 'Summit Road';
  if(near(F.rally,9))return 'Rally stage';
  if(near(F.mill,9))return 'Mill Road';
  if(near(F.brook,8))return 'The brook';
  if(Math.hypot((x-L.x)/L.rx,(z-L.z)/L.rz)<1.05)return 'Dry lake';
  if(near(F.lakeRd,9))return 'Lake road';
  if(near(F.spRd,9))return 'Speedway road';
  if(near(C.cr,9))return 'County road';
  if(near(C.range,9))return z<-560?'Forest road':x<0?'West road':'Range road';
  if(Math.abs(x)>1540||Math.abs(z)>1540)return 'Edge of the map';
  if(z<-760&&x>-700&&x<900)return 'Bald Mountain';
  if(x<-820)return 'Cedar Hills';
  if(z<-430&&Math.abs(x)<800)return 'The woods';
  if(x>800)return 'East country';
  if(z>800)return 'The flats';
  if(z>410)return 'The fields';
  return Math.abs(x)<400&&Math.abs(z)<400?'Open range':'Open country';
}
function say(t,k=2.4,col){GAME.msgs.push({t,k,a:0,t0:APP.t,col});if(GAME.msgs.length>3)GAME.msgs.shift();}
/* the phone buzzes (Android; iPhones ignore it) */
let BUZZ_T=0;
function buzz(p){if(!APP.haptics||!navigator.vibrate||GAME.state!=='drive')return;const now=performance.now();if(now-BUZZ_T<60)return;BUZZ_T=now;try{navigator.vibrate(p);}catch(e){}}
Feats.pop=(t,col,big)=>say(t,big?2.6:2,col);Feats.buzz=buzz;Feats.carName=carLabel;Feats.place=()=>GAME.place;Feats.racing=()=>RACE.on;Feats.load('dssd-free');

/* ---------- the car on the ground ---------- */
const SETTLE={steer:0,thr:0,brk:1,hb:0,nos:false};
function placeCar(x,z,yaw){
  LAP.on=false;LAP.s=-1;Feats.resetCar();
  const t=GAME.car,y=RANCH.W.heightAt(x,z);
  t.place([x,y+.05,z],yaw);
  for(const w of t.wheels){w.comp=0;w.ang=0;w.w=0;}
  const pt=t.pt;pt.gear=1;pt.shiftT=0;pt.engage=0;pt.locked=false;t.rev=false;pt.rev=false;t.drift.on=false;
  if(pt.st!=='off')pt.st='run';
  for(let i=0;i<120;i++)t.step(DT,SETTLE);
  t.v.fill(0);t.w.fill(0);t.rev=false;pt.rev=false;t.revT=0;CAM.cut=true;GAME.flipT=0;PRB.fresh=true;CSM.fresh=true;
}
/* the meshes of builds no longer driven are let go (the wheels are shared and stay) */
function truckEvict(keep){for(const id of Object.keys(TRUCK)){if(keep.includes(id))continue;const T=TRUCK[id];for(const m of [T.body,T.hood,T.hide,T.bay&&T.bay.engine,T.far&&T.far.body,T.far&&T.far.hood])if(m&&m.vao)freeMesh(m);delete TRUCK[id];}}
const RECENT=[];
/* what the Sim level builds the car with: roof loads move its centre of gravity, plus any cargo */
const simOpts=()=>APP.level==='sim'?{cg:!!SIMDEV.cg,cargo:simVal(SIM_CARGO,SIMSET.cargo)}:null;
function spawnCar(i,x,z,yaw){
  if(RACE.on)raceEnd('Race abandoned');
  const prev=GAME.car,t=makeCar(i,RANCH.world,simOpts());t.setAssists(APP.level);devFit(t);
  const b=BUILDS[i];RECENT.unshift(b.id);RECENT.length=Math.min(RECENT.length,3);truckEvict(RECENT);truck(i);
  if(prev&&prev.pt.st!=='off'){t.pt.st='run';t.pt.we=t.pt.e.idle*TAU/60;}
  t.pt.maxG=APP.od&&t.pt.e.conv?t.pt.e.nG-1:0;
  GAME.car=t;APP.bi=i;GAME.dirt=b.dirt;
  if(x===undefined){if(prev){x=prev.p[0];z=prev.p[2];yaw=Math.atan2(-prev.M[6],prev.M[0]);}else{x=6;z=4;yaw=0;}}
  placeCar(x,z,yaw);
  /* the synth becomes this engine */
  const v=GAME.voice;v.spec=t.spec;if(v.port)v.port.post({t:'cfg',cfg:SIM.dspCfg(t.spec)});
  syncTouch();
}
/* drive the current car's rig (after a garage change or a new car) */
function spawnRig(keepPlace=true){const t=GAME.car;spawnCar(rigBuild(APP.car,rigOf(APP.car)),...(keepPlace&&t?[t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0])]:[]));}
function resetCar(){const t=GAME.car;placeCar(t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0]));}
function goTo(id){const p=PLACES.find(q=>q[0]===id);if(!p)return;RUN.on=null;if(RACE.on)raceEnd('Race abandoned');placeCar(p[2],p[3],p[4]);say(p[1].toUpperCase(),2);}
/* overdrive off: the automatic holds out of its top gear (the button on the shifter) */
function setOD(on){const pt=GAME.car.pt;if(!pt.e.conv)return false;APP.od=on;pt.maxG=on?pt.e.nG-1:0;if(on&&pt.gear>pt.maxG&&pt.shiftT<=0)pt.shift(-1);return true;}

/* ---------- the engine and its sound ---------- */
async function startEngine(){
  if(GAME.busy)return;GAME.busy=true;
  /* the engine runs whether or not the browser will make a sound */
  GAME.car.pt.start();
  try{ENG.room='open';await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();voiceNode(GAME.voice);}
  catch(e){ENG.status='Sound could not start: '+e.message;}
  GAME.busy=false;
}
function toggleEngine(){const pt=GAME.car.pt;if(pt.st==='off'||pt.st==='stopping')startEngine();else pt.stop();}
/* what the synth hears: the lab's 'behind' listener, from wherever the chase camera is */
function soundUpdate(c){
  const v=GAME.voice;if(!ENG.audio||!v.port)return;const t=GAME.car,M=t.M,F=mcol(M,0),mode=CAMS[APP.cam],D=carD(t);
  const ex=add(t.p,mvec(M,[-(D.L/2-.15)-t.cg[0],.4-t.cg[1],0])),dist=len(sub2(c.eye,ex)),right=norm2([-c.fwd[2],0,c.fwd[0]]),toCam=norm2(sub2(c.eye,t.p));
  /* the camera sits 7 to 11 m back; the synth hears it from no further than the lab's own 'behind' spot plus a little, so it sounds like the lab */
  let geo={dist:clamp(dist,1.5,5),pan:clamp(-dot2(norm2(sub2(t.p,c.eye)),right)*.9,-1,1),rear:clamp(.5-.5*dot2(toCam,F),0,1)*.6+.4};
  if(mode==='Hood'&&!APP.orbit)geo={dist:3.2,pan:0,rear:.3};
  const ep=t.pt.soundParams(0,t.speed,geo);ep.horn=GAME.state==='drive'&&keyOn('horn')?1:0;
  for(const e of t.pt.takeEvents())v.port.post({t:'ev',ev:e});
  v.port.post({t:'p',p:ep});
}

/* ---------- keyboard, game controller and the touch controls ---------- */
const KEYS={thr:['ArrowUp','KeyW'],brk:['ArrowDown','KeyS'],left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],hb:['Space'],nos:['ShiftLeft','ShiftRight','KeyN'],
  up:['KeyE','KeyX'],down:['KeyQ','KeyZ'],cam:['KeyC'],reset:['KeyR'],menu:['Escape','KeyP'],low:['KeyL'],lockers:['KeyK'],lights:['KeyJ'],ign:['KeyI'],purge:['KeyB'],horn:['KeyH'],map:['KeyM'],od:['KeyO'],trac:['KeyT']};
const INPUT={down:new Set(),pressed:new Set(),steer:0,thr:0,brk:0,usingPad:false,padPrev:[]};
addEventListener('keydown',e=>{if(typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
  if(!e.repeat){INPUT.down.add(e.code);INPUT.pressed.add(e.code);}
  if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();INPUT.usingPad=false;});
addEventListener('keyup',e=>INPUT.down.delete(e.code));
addEventListener('blur',()=>INPUT.down.clear());
const keyOn=k=>KEYS[k].some(c=>INPUT.down.has(c)),keyHit=k=>KEYS[k].some(c=>INPUT.pressed.has(c));
/* a pedal you can press part way is progressive, the way a real throttle body opens: a third of the way down
   is already more than half the engine's pull, so the automatic shifts early when you go easy and holds on
   when you push */
const pedalMap=p=>p<=0?0:1-Math.pow(1-clamp(p,0,1),2.2);
function pollInput(dt){
  const out={steer:0,thr:0,brk:0,hb:0,nos:false};
  const tgt=(keyOn('right')?1:0)-(keyOn('left')?1:0),rate=tgt===0?6:Math.sign(tgt)!==Math.sign(INPUT.steer)&&INPUT.steer!==0?8:3.2;
  INPUT.steer+=clamp(tgt-INPUT.steer,-rate*dt,rate*dt);
  INPUT.thr+=clamp((keyOn('thr')?1:0)-INPUT.thr,-8*dt,6*dt);INPUT.brk+=clamp((keyOn('brk')?1:0)-INPUT.brk,-10*dt,8*dt);
  out.steer=INPUT.steer;out.thr=INPUT.thr;out.brk=INPUT.brk;out.hb=keyOn('hb')?1:0;out.nos=keyOn('nos');
  for(const k of ['up','down','cam','reset','menu','low','lockers','lights','ign','purge','map','od','trac'])out[k]=keyHit(k);
  /* the touch controls: analog steering (slide or tilt), a gas pedal set by how high the thumb sits, the brake and the e-brake */
  if(TOUCH.on){if(TOUCH.steerActive||APP.steer==='tilt')out.steer=TOUCH.steer;if(TOUCH.thr>0)out.thr=Math.max(out.thr,pedalMap(TOUCH.thr));if(TOUCH.brk>0)out.brk=Math.max(out.brk,TOUCH.brk);if(TOUCH.hb)out.hb=1;}
  const pads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const p of pads)if(p&&p.connected){gp=p;break;}
  if(gp){const dz=(v,d=.08)=>Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d),sx=dz(gp.axes[0]||0),rt=gp.buttons[7]?gp.buttons[7].value:0,lt=gp.buttons[6]?gp.buttons[6].value:0;
    if(Math.abs(sx)>0||rt>.02||lt>.02||gp.buttons.some(b=>b.pressed))INPUT.usingPad=true;
    if(INPUT.usingPad){const pr=i=>gp.buttons[i]&&gp.buttons[i].pressed&&!INPUT.padPrev[i];
      out.steer=Math.sign(sx)*Math.pow(Math.abs(sx),1.35);out.thr=pedalMap(rt);out.brk=lt;out.hb=gp.buttons[0]&&gp.buttons[0].pressed?1:0;out.nos=!!(gp.buttons[1]&&gp.buttons[1].pressed);
      out.up=out.up||pr(5);out.down=out.down||pr(4);out.cam=out.cam||pr(3);out.reset=out.reset||pr(8);out.menu=out.menu||pr(9);out.low=out.low||pr(2);}
    INPUT.padPrev=gp.buttons.map(b=>b.pressed);}
  INPUT.pressed.clear();return out;
}

/* ---------- one frame of driving ---------- */
const IDLE_IN={steer:0,thr:0,brk:1,hb:1,nos:false};
/* a test's hands on the wheel (tools/showdown_check.js): what it returns overrides the keys */
let AUTO=null;const setAuto=f=>{AUTO=f;};
function step(dt){
  const t=GAME.car,inp=pollInput(dt),pt=t.pt;if(AUTO)Object.assign(inp,AUTO(dt,t)||{});
  if(inp.menu){if(GAME.state==='results')hideResults();else GAME.state==='drive'?openMenu(false):closeMenu();}
  let drive=IDLE_IN;
  if(GAME.state==='drive'){
    if(inp.cam){APP.cam=(APP.cam+1)%CAMS.length;CAM.cut=true;saveGame();say(CAMS[APP.cam]+' camera',1.2);}
    if(inp.reset){if(RACE.on&&RACE.state!=='grid')raceResetMe();else if(!RACE.on)resetCar();say('Reset',1);}
    if(inp.up)pt.shift(1);if(inp.down)pt.shift(-1);
    if(inp.low)say(setLow(t,!t.low)?(t.low?'Low range':'High range'):'No low range on this car',1.4);
    if(inp.lockers)say(setLockers(t,!t.locked)?(t.locked?'Lockers on':'Lockers off'):'No lockers on this car',1.4);
    if(inp.od)say(setOD(!APP.od)?(APP.od?'Overdrive off':'Overdrive on'):'No overdrive button on a manual',1.4);
    if(inp.lights){APP.lights=!APP.lights;say(APP.lights?'Lights on':'Lights off',1);}
    if(inp.map)APP.bigMap=!APP.bigMap;
    if(inp.trac&&DEV)say('Traction '+pct(devStep()),1.4);
    if(inp.ign)toggleEngine();
    if(inp.purge&&GAME.voice.port&&pt.e.nosKw)GAME.voice.port.post({t:'ev',ev:{type:'purge'}});
    drive=inp;
    /* brake and gas together at a standstill: a race gearbox holds on its trans-brake for a launch; anything
       else gets a line lock (the front brakes held, the drive to the rear wheels) for a burnout */
    if(!pt.e.launch&&inp.brk>.5&&inp.thr>.3&&t.speed<3&&!t.rev&&pt.running)drive=Object.assign({},inp,{brk:0,lock:true});
    if((inp.thr>.1||inp.brk>.1)&&pt.st==='off'&&!GAME.busy&&!GAME.engineWanted){GAME.engineWanted=true;startEngine();}
  }
  /* a race: held on the grid until the lights go green; paused with the menu up (60_race) */
  if(RACE.on&&RACE.hold)drive={steer:0,thr:drive.thr||0,brk:1,hb:1,nos:false};
  if(RACE.on&&GAME.state!=='drive'){GAME.acc=0;return;}
  GAME.acc+=dt;let n=0;
  if(RACE.on)raceFrame(dt);
  while(GAME.acc>=DT&&n<24){t.step(DT,drive);if(RACE.on)raceSub(DT);GAME.acc-=DT;n++;GAME.time+=DT;}
  if(GAME.acc>DT)GAME.acc=0;
  /* rolled over: say how to get back up; Kids flips it back by itself */
  if(t.M[4]<.3&&t.speed<1.5){GAME.flipT+=dt;
    if(APP.level==='kids'&&GAME.flipT>1.2){resetCar();say('Back on its wheels',1.6);}
    else if(GAME.flipT>2&&!GAME.flipSaid){GAME.flipSaid=true;say(GAME.touch?'Rolled it. Tap Reset to flip back over.':'Rolled it. Press R to flip back over.',4);}}
  else{GAME.flipT=0;GAME.flipSaid=false;}
  /* mud builds up on the paint in the bog, on the mud track and in the lane's ruts; the creek and the pond wash some off */
  let mud=0,water=0;for(const w of t.wheels)if(w.contact){if(w.surf==='mud')mud++;else if(w.surf==='ruts')mud+=.6;else if(w.surf==='water')water++;}
  GAME.dirt=clamp(GAME.dirt+dt*(mud*.025*Math.min(1,t.speed/3+.3)-water*.02*Math.min(1,t.speed/4)),0,1);
  fxEmit(dt,t);fxStep(dt);
  const ev=t.takeEvents();if(ev.land>4||ev.wall>4||ev.ground>5)CAM.shake=Math.min(1,Math.max(ev.land,ev.wall,ev.ground)/12);
  if(ev.wall>4||ev.ground>6)buzz(Math.min(90,20+Math.max(ev.wall,ev.ground)*6));
  if(ev.debead)say('A tyre rolled off its rim. R to reset',3.5,PAL.amber);
  simWarn(dt,t);
  /* the phone feels the gearbox and the limiter */
  if(pt.gear!==GAME.gear){if(pt.gear>GAME.gear&&GAME.state==='drive')buzz(12);GAME.gear=pt.gear;}
  if(pt.running&&pt.rpm>pt.e.limiterRpm-30&&pt.thr>.5&&APP.t-GAME.limT>.18){GAME.limT=APP.t;buzz(6);}
  GAME.placeT=(GAME.placeT||0)-dt;if(GAME.placeT<=0){GAME.placeT=.5;const p=placeName(t.p[0],t.p[2]);if(p!==GAME.place){GAME.place=p;}}
  if(GAME.state==='drive'){Feats.step(dt,t,ev,RANCH.W);if(RACE.on)racePost(dt);else{lapStep(dt,t);runStep(dt,t);calloutStep(dt,t);}}
}
/* ---------- Sim: say so when the brakes or the shocks start to fade ---------- */
const SIMW={brake:false,shock:false};
function simWarn(dt,t){
  if(!t.sim)return;let bf=1,sf=1;for(const w of t.wheels){bf=Math.min(bf,w.bF);sf=Math.min(sf,w.shF);}
  if(bf<.92&&!SIMW.brake){SIMW.brake=true;say('Brakes fading: let them cool',3,PAL.amber);}else if(bf>.98)SIMW.brake=false;
  if(sf<.92&&!SIMW.shock){SIMW.shock=true;say('Shocks fading: they are too hot',3,PAL.amber);}else if(sf>.98)SIMW.shock=false;
}
/* ---------- lap times on the road course: over the line, past two checkpoints, over the line again ---------- */
const LAP={on:false,t0:0,cp:0,s:-1,best:{},offT:0};
try{LAP.best=JSON.parse(store.get('dssd-laps','{}'))||{};}catch(e){}
const fmtLap=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const lapKey=()=>BUILDS[APP.bi].id+':'+APP.level;
function lapStep(dt,t){
  const T=RANCH.W.country.track,n=T.nearest(t.p[0],t.p[2],2);
  if(!n||n.d>16){if(LAP.on&&(LAP.offT+=dt)>8){LAP.on=false;say('Lap abandoned',1.6);}LAP.s=-1;return;}
  LAP.offT=0;const s=n.s,L=T.len,p=LAP.s;LAP.s=s;if(p<0)return;
  if(p>L-60&&s<60){
    if(LAP.on&&LAP.cp>=2){const lt=GAME.time-LAP.t0,k=lapKey(),b=LAP.best[k];
      if(!b||lt<b){LAP.best[k]=lt;store.set('dssd-laps',JSON.stringify(LAP.best));}
      Feats.timed('lap',`LAP ${fmtLap(lt)}${b&&lt<b?' BEST':''}`,120+Math.max(0,90-lt)*6,{s:lt},'lap',lt,`Race track lap ${fmtLap(lt)}`);}
    else if(!LAP.on)say('LAP STARTED',1.4);
    LAP.on=true;LAP.t0=GAME.time;LAP.cp=0;}
  else if(p<60&&s>L-60)LAP.on=false;
  if(LAP.on){if(LAP.cp===0&&p<L/3&&s>=L/3)LAP.cp=1;else if(LAP.cp===1&&p<2*L/3&&s>=2*L/3)LAP.cp=2;}
}
/* ---------- clock runs: from one place to another, any way you like, against the clock and a par time ---------- */
const RUNS=[
  {id:'homeStore',name:'Home to Feed & Fuel',from:'home',to:[506,387],par:100,blurb:'Down the lane, out onto the county road, east to the crossroads.'},
  {id:'storeHill',name:'Feed & Fuel to the top of Red Hill',to:[236,-262],from:'store',par:130,blurb:'Up Range Road and over the open range to the summit.'},
  {id:'shopPond',name:'The shop to the pond',from:'shop',to:[-60,-474],par:70,blurb:'Across the ranch and through the woods to the water.'},
  {id:'trackHome',name:'The race track to home',from:'track',to:[-480,640],par:95,blurb:'From the paddock all the way west to the house.'},
  {id:'pitTrack',name:'The mud pit to the race track',from:'mud',to:[420,505],par:85,blurb:'Mud on your tyres, then flat out to the start line.'}];
const RUN={on:null,t0:0,armed:false,best:{}};
try{RUN.best=JSON.parse(store.get('dssd-runs','{}'))||{};}catch(e){}
function startRun(id){const r=RUNS.find(q=>q.id===id);if(!r)return;goTo(r.from);RUN.on=r;RUN.armed=false;say(r.name.toUpperCase(),2.4);say('GO WHEN YOU\'RE READY',2.4);}
function runStep(dt,t){
  const r=RUN.on;if(!r)return;
  if(!RUN.armed){if(t.speed>1.5){RUN.armed=true;RUN.t0=GAME.time;}return;}
  const d=Math.hypot(t.p[0]-r.to[0],t.p[2]-r.to[1]),el=GAME.time-RUN.t0;
  if(d<16){RUN.on=null;const b=RUN.best[r.id],nb=!b||el<b;if(nb){RUN.best[r.id]=el;store.set('dssd-runs',JSON.stringify(RUN.best));}
    const under=el<=r.par;Feats.timed('run',`${r.name.toUpperCase()} ${fmtLap(el)}${under?' UNDER PAR':''}`,(150+Math.max(0,r.par-el)*8)*(under?1.5:1),{s:el},'run:'+r.id,el,`${r.name} in ${fmtLap(el)}`);}
  else if(el>r.par*3){RUN.on=null;say('RUN TIMED OUT',2);}
}

/* ---------- the camera: it sits further back and higher for a longer or taller car; in the garage it circles the car ---------- */
const CAM={yaw:null,yawV:0,off:null,pv:[0,0,0],fq:null,cut:true,shake:0,orbitA:0};
const springTo=(x,v,t,w,dt)=>{const a=2*dt*w,b=dt*dt*w*w,n=(x*(1+a)+dt*v+b*t)/(1+a+b);return [n,(n-x)/dt];};
function camUpdate(dt){
  /* a tool's camera (screenshots): it says where to look from */
  if(CAM.free)return CAM.free(dt);
  const t=GAME.car,M=t.M,F=mcol(M,0),U=mcol(M,1),sp=t.speed,mode=CAMS[APP.cam],cut=CAM.cut,lift=liftOf(t),D=carD(t),kl=Math.sqrt(D.L/4.92);CAM.cut=false;
  CAM.shake=Math.max(0,CAM.shake-dt*3);
  const body=(x,y,z)=>add(t.p,mvec(M,[x-t.cg[0],y-t.cg[1],z]));let eye,fwd,up=[0,1,0],fov=1.02;
  if(APP.orbit){
    /* the garage: round and round the car, a little above it */
    CAM.orbitA+=dt*.32;const yaw=Math.atan2(-M[6],M[0])+CAM.orbitA,r=D.L*1.25+2.2+lift*2;
    eye=[t.p[0]+Math.cos(yaw)*r,t.p[1]+1.1+lift,t.p[2]-Math.sin(yaw)*r];const gy=RANCH.W.heightAt(eye[0],eye[2])+.6;if(eye[1]<gy)eye[1]=gy;
    fwd=norm2(sub2([t.p[0],t.p[1]+.1,t.p[2]],eye));CAM.yaw=null;CAM.off=null;CAM.fq=null;return {eye,fwd,up,fov:.9};
  }
  if(mode==='Hood'){
    /* on the hood, just behind the front axle */
    const u=D.uFa+D.B.wb*.15;eye=body(D.X(u),D.belt(u)+.25,0);if(!CAM.fq||cut)CAM.fq={F,U};const k=1-Math.exp(-dt*20);
    CAM.fq.F=norm2(madd(CAM.fq.F,sub2(F,CAM.fq.F),k));CAM.fq.U=norm2(madd(CAM.fq.U,sub2(U,CAM.fq.U),k));fwd=CAM.fq.F;up=CAM.fq.U;fov=1.1;CAM.yaw=null;
  }else{
    const far=mode==='Far',fh=norm2([F[0],0,F[2]]);let dir=fh;
    if(sp>3){const vd=norm2([t.v[0],0,t.v[2]]),k=clamp((sp-3)/12,0,1)*.45*(dot2(vd,fh)>0?1:0);dir=norm2([fh[0]+vd[0]*k,0,fh[2]+vd[2]*k]);}
    /* upside down or nose up: follow where it is going, not where the nose points */
    if(Math.abs(F[1])>.85||U[1]<0)dir=CAM.yaw===null?[1,0,0]:[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)];
    const ty=Math.atan2(-dir[2],dir[0]);if(CAM.yaw===null||cut){CAM.yaw=ty;CAM.yawV=0;}
    let d=ty-CAM.yaw;while(d>PI)d-=TAU;while(d<-PI)d+=TAU;[CAM.yaw,CAM.yawV]=springTo(CAM.yaw,CAM.yawV,CAM.yaw+d,3.6+clamp(sp/12,0,3),dt);
    const h=[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)],dist=(far?10.5:6.8)*kl+clamp(sp*.03,0,1.6)+lift*2.5,ht=(far?3.7:2.25)*(.6+.4*D.Hr/1.79)+lift*1.4;
    const off=[-h[0]*dist,ht,-h[2]*dist];if(!CAM.off||cut){CAM.off=off.slice();CAM.pv=[0,0,0];}
    for(let k=0;k<3;k++){const r=springTo(CAM.off[k],CAM.pv[k],off[k],k===1?5:7,dt);CAM.off[k]=r[0];CAM.pv[k]=r[1];}
    eye=add(t.p,CAM.off);
    /* stay above the ground */
    const gy=RANCH.W.heightAt(eye[0],eye[2])+.9;if(eye[1]<gy){eye[1]=gy;}
    const at=[t.p[0]+h[0]*2.4*kl,t.p[1]+.85*(.6+.4*D.Hr/1.79)+lift,t.p[2]+h[2]*2.4*kl];fwd=norm2(sub2(at,eye));
    /* the view widens a touch with speed, and more on the nitrous */
    fov=(far?.92:1.02)+clamp(sp*.003,0,.2)+(t.pt.nosOn?.06:0);CAM.fq=null;
  }
  if(CAM.shake>0){const s=CAM.shake*.06;eye=[eye[0]+(Math.random()-.5)*s,eye[1]+(Math.random()-.5)*s,eye[2]+(Math.random()-.5)*s];}
  return {eye,fwd,up,fov};
}
function camMats(c,asp){const tgt=add(c.eye,c.fwd),V_=M4.look(c.eye,tgt,c.up),P_=M4.persp(c.fov,asp,mode0Near(),1500);
  /* in the garage the menu covers the left of the screen: the picture slides right so the car sits in what's left */
  if(APP.orbit){const mr=APP.menuRight||0,right=Math.min(innerWidth,RECT.x+RECT.w),cx=(Math.max(mr,RECT.x)+right)/2;P_[8]=-clamp((cx-RECT.x)/RECT.w*2-1,0,.8);}
  return Object.assign(c,{V:V_,P:P_,VP:M4.mul(P_,V_),asp,near:mode0Near()});}
const mode0Near=()=>CAMS[APP.cam]==='Hood'&&!APP.orbit?.12:.3;

/* ---------- drawing ---------- */
const SKY={sun:V3.norm([-.52,.5,.4]),sunCol:[1.28,1.18,1.02],sky:[.44,.5,.62],gnd:[.24,.18,.13],zen:[.16,.32,.85],hor:[.78,.86,1.02],fogD:.0016,fogK:[.68,.72,.78],draw:420,night:0};
function worldUniforms(c){
  /* the sky for the time of day, turned grey by the weather (55_gfx) */
  const u=CUR.u,k=SKY.fogK,S=skyNow();
  gl.uniformMatrix4fv(u.uVP,false,c.VP);gl.uniform3fv(u.uCam,c.eye);gl.uniform1f(u.uTime,APP.t);
  gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);
  gl.uniform3fv(u.uSkyZen,S.zen);gl.uniform3fv(u.uSkyHor,S.hor);gl.uniform3fv(u.uFogCol,[S.hor[0]*k[0],S.hor[1]*k[1],S.hor[2]*k[2]]);gl.uniform1f(u.uFogD,S.fogD);gl.uniform1f(u.uStage,3);
  gl.uniform1i(u.uNL,0);gl.uniform1f(u.uInst,0);gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);gl.uniform1f(u.uDirt,0);gl.uniform1i(u.uNSh,0);
}
/* the soft shadows under the cars on the ground: centre, half size, yaw and how dark (fading as a car leaves the ground) */
const WSH=new Float32Array(32),WSA=new Float32Array(8),WSK=new Float32Array(8);
function worldShadows(cars){
  const u=CUR.u;let n=0;
  for(const t of cars){if(n>=8)break;const D=carD(t),M=t.M,o=mvec(M,[-t.cg[0],-t.cg[1],0]),x=t.p[0]+o[0],z=t.p[2]+o[2],gy=RANCH.W.heightAt(x,z),hgt=t.p[1]+o[1]-gy;
    WSH[n*4]=x;WSH[n*4+1]=z;WSH[n*4+2]=D.L/2-.02;WSH[n*4+3]=t.build.look.track/2+.12;WSA[n]=Math.atan2(-M[6],M[0]);WSK[n]=clamp(1-hgt/3.5,0,1)*(SKY.night?.5:CSM.on?.55:.9);n++;}
  gl.uniform4fv(u.uSh,WSH);gl.uniform1fv(u.uShA,WSA);gl.uniform1fv(u.uShK,WSK);gl.uniform1i(u.uNSh,n);
}
/* the car's model matrix: physics frame (centre of gravity) to the model's frame (ground under the middle) */
function carMatrix(t){const R=t.M,m=new Float32Array(16);
  m[0]=R[0];m[1]=R[3];m[2]=R[6];m[4]=R[1];m[5]=R[4];m[6]=R[7];m[8]=R[2];m[9]=R[5];m[10]=R[8];m[12]=t.p[0];m[13]=t.p[1];m[14]=t.p[2];m[15]=1;
  return M4.mul(m,M4T(-t.cg[0],-t.cg[1],0));}
function carUniformsW(t,v,dirt){
  const u=CUR.u,b=t.build,D=carD(t);
  gl.uniform3fv(u.uPaint,lin(b.paint));gl.uniform3fv(u.uPaint2,lin(b.paint2));gl.uniform3fv(u.uRim,lin(b.rim));gl.uniform3fv(u.uCal,lin(b.cal));gl.uniform3fv(u.uClad,lin(b.clad));
  gl.uniform1f(u.uLiv,b.liv);gl.uniform1f(u.uLights,APP.lights?1:0);gl.uniform1f(u.uBrake,t.brkIn>.05?1:0);gl.uniform1f(u.uDirt,dirt);
  gl.uniform4f(u.uLivP,D.X(0),D.X(D.L),D.belt(2.5),D.Hr);
}
/* one car where the physics has it: the body (tail-up over big rear tyres, as on the turntable), the hood
   shut, a blower through it, the spares, flames from the pipes, and each wheel at its own hub, steered and
   turning. Mud is measured up the car itself, not up the world */
function drawWorldCar(t,v,dirt,far){
  const i=t.bi,b=t.build,T=truck(i),D=T.D,u=CUR.u,M0=carMatrix(t);let Mb=M0;
  carUniformsW(t,v,dirt);gl.uniform1f(u.uMudLocal,1);gl.uniform1f(u.uMudOff,0);
  const fx=D.X(D.uFa),R=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(M4T(fx,R,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R,0))));
  gl.uniformMatrix4fv(u.uM,false,Mb);
  /* a car far off (another car in a race) is drawn from its coarse copy */
  if(far){const F=truckFar(i);drawMesh(F.body);drawMesh(F.hood);}
  else{drawMesh(T.body);drawMesh(T.hood);drawMesh(T.hide);if(T.engineOut)drawMesh(T.bay.engine);}
  for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
  if(v&&v.flame>.04&&D.tips)for(const tp of D.tips){
    const up=Math.abs(tp.d[1])>.9?[1,0,0]:[0,1,0],rr=V3.norm(V3.cross(tp.d,up)),uu=V3.cross(rr,tp.d),k=Math.min(1,v.flame),fl=(.12+.42*k*v.flameL)*(.85+.3*Math.random()),fr=tp.r*(.8+.5*k);
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4.basis(tp.p,tp.d,uu,rr),M4S(fl,fr,fr))));drawMesh(flameMesh());}
  for(const w of t.wheels){const s=w.hp[2]<0?-1:1,st=w.front?t.steer:0;gl.uniform1f(u.uMudOff,w.R);
    const M=M4.mul(M0,M4.mul(M4T(w.hp[0]+t.cg[0],w.hp[1]-w.len+t.cg[1],w.hp[2]),M4.mul(M4RY(-st),M4.mul(M4S(1,1,s),M4RZ(-w.ang)))));
    gl.uniformMatrix4fv(u.uM,false,M);drawMesh(w.front?T.wheel:T.wheelR);}
  gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);
  return far?truckFar(i).tris+T.tris-(T.body.n+T.hood.n+T.hide.n)/3:T.tris;
}
function render(dt){
  hClear();
  const T=sceneTargetHD(),c=CAM.last=camMats(camUpdate(dt),T.w/T.h),t=GAME.car;GFX.frame++;
  /* the sun's cascaded shadow maps and a face of the reflection probe first (55_gfx) */
  csmPass(c,t);probePass(t);
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.viewport(0,0,T.w,T.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);useLit(P_LIT);
  worldUniforms(c);gfxUniforms();skyLights(t);worldShadows([t,...raceCars()]);
  /* at night the fog closes in and the world past it isn't drawn; by day the graphics level sets how far */
  let tris=drawRanch(c,SKY.night?SKY.draw:GFX.far);
  tris+=grassDraw(c,t);
  tris+=drawWorldCar(t,GAME.voice,GAME.dirt);tris+=raceDraw(c);
  tris+=fxDraw();tris+=rainDraw(c,dt);
  /* the dust and spray last, blended over the rest (into the colour only, not the normals the passes read) */
  if(SC.mrt)gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.NONE]);tris+=fxDrawSoft(c);if(SC.mrt)gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);
  gl.bindVertexArray(null);APP.tris=tris;
  /* occlusion and light in the air (laptop), the exposure, then the HUD and the display (55_post) */
  const src=postPasses(c,dt);
  if(!APP.photo)drawHud(c);else HB.fill(0);
  presentHD(src);
}

/* ---------- the matrix fills the window, 16:9 ---------- */
function setRes(i){const [dw,dh,hs]=RES[i];HS=hs;BW=dw;BH=dh;W=dw/hs;H=dh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);APP.res=i;store.set('dssd-res',i);$('res').textContent='Dots '+BW+'×'+BH;}
function layout(){const vw=innerWidth,vh=innerHeight;let w=vw,h=w*9/16;if(h>vh){h=vh;w=h*16/9;}RECT={x:(vw-w)/2,y:(vh-h)/2,w,h};}
/* how much finer than the dots the scene is drawn: Sharp 2x2, Smooth 1.5x1.5, Fast one sample a dot.
   Auto starts sharp (smooth on a phone) and steps down while driving if the frame rate can't keep up */
const DETAIL={sharp:2,smooth:1.5,fast:1};
function setDetail(id){APP.detail=id;SS=id==='auto'?(GAME.touch||touchy?1.5:2):DETAIL[id];APP.slowT=0;saveGame();}
function autoDetail(dt){
  if(APP.detail!=='auto'||GAME.state!=='drive')return;
  if(APP.fps<48){APP.slowT=(APP.slowT||0)+dt;if(APP.slowT>3){APP.slowT=0;if(SS>1){SS=SS>1.5?1.5:1;say('Detail lowered to keep it smooth',1.6);}else if(APP.res>2){setRes(APP.res-1);layout();say('Fewer dots to keep it smooth',1.6);}}}
  else APP.slowT=Math.max(0,(APP.slowT||0)-dt*.5);
}

/* ---------- the loop ---------- */
let LAST=0;
function frame(ts){
  const dt=Math.min(.05,LAST?(ts-LAST)/1000:1/60);LAST=ts;APP.t+=dt;
  /* (a test can hold the loop still and draw frames itself) */
  if(!GAME.hold)try{step(dt);GAME.voice.flame=Math.max(0,GAME.voice.flame-dt*9);render(dt);if(CAM.last){soundUpdate(CAM.last);raceSound(CAM.last);}autoDetail(dt);drsStep(dt);}catch(e){console.error(e);}
  APP.fps=lerp(APP.fps,1/Math.max(dt,1e-3),.05);gfxWatch(dt);
  if((APP.t*4|0)!==(APP.st4|0)){APP.st4=APP.t*4;$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps';}
  requestAnimationFrame(frame);
}
