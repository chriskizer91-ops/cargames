/* =====================================================================================
   THE GAME: Dirt Sleeper HD. Free roam on the ranch and the country round it, in any of the seven cars
   built any way the garage allows (56_parts), for money: every feat pays (58_feats). Mini Dirt Run Solo's
   game with Dirt Sleeper Sim's fourth driving level (43_sim) and graphics (55_gfx). Underneath: the physics
   (40_physics, 42_chassis) at 240 steps a second, the car drawn from its own model where the physics puts
   it, a chase camera, keyboard, game controller and touch (64_touch), and the engine through the Digital
   Engine synth (17_audio), heard from behind the car.
   ===================================================================================== */
const RES=[[320,180,1],[480,270,1],[640,360,2],[960,540,3],[1280,720,4]];
const APP={t:0,bi:0,car:'suv',level:'real',cam:0,fps:60,tris:0,res:3,lights:true,tod:'night',steer:'slide',haptics:true,detail:'auto',od:false,orbit:false,bigMap:false};
/* each car's rig: what's on it now. A car not yet touched is its stock preset */
const RIGS={};
const CAR_STOCK={suv:'stock',trail:'trail',coupe:'coupe',wagon:'wagon',pickup:'pickup',muscle:'muscle',hatch:'hatch',ev:'ev',wedge:'wedge',hyper:'hyper'};
for(const id of MACH_IDS)CAR_STOCK[id]=id;
try{const s=JSON.parse(store.get('cc-game','{}'))||{};
  if(CAR_PARTS[s.car])APP.car=s.car;if(['real','middle','kids','sim'].includes(s.level))APP.level=s.level;if(s.cam>=0&&s.cam<3)APP.cam=s.cam|0;
  if(TOD[s.tod])APP.tod=s.tod;if(['slide','tilt','buttons'].includes(s.steer))APP.steer=s.steer;if(s.haptics===false)APP.haptics=false;if(['auto','sharp','smooth','fast'].includes(s.detail))APP.detail=s.detail;
  if(s.rigs)for(const car in s.rigs)if(CAR_PARTS[car])RIGS[car]=cleanRig(car,s.rigs[car]);}catch(e){}
/* a saved rig against today's parts: anything that no longer exists goes back to stock */
function cleanRig(car,r){const base=presetRig(CAR_STOCK[car]),out=Object.assign({},base);
  for(const [k] of SLOTS)if(r&&r[k]!==undefined&&slotOptions(car,k,Object.assign({},base,r)).some(o=>o[0]===r[k]))out[k]=r[k];
  for(const [k] of SLOTS)if(fits(car,out,k,out[k]))out[k]=base[k];
  return fixRig(car,out);}
const rigOf=car=>RIGS[car]||(RIGS[car]=presetRig(CAR_STOCK[car]));
const saveGame=()=>store.set('cc-game',JSON.stringify({car:APP.car,level:APP.level,cam:APP.cam,tod:APP.tod,steer:APP.steer,haptics:APP.haptics,detail:APP.detail,rigs:RIGS}));
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
/* the Plus button: any car, any build, with the Plus tune: 15% more power and a final drive 15% taller (the dev
   panel sets both). Measured on flat tarmac that's 4 to 16% more top speed (most where the redline, not the air,
   held the car back) and as quick or quicker off the line. The name gets a + ("Coupe Race+"); the body, the
   chassis and the sound are the build's own */
const PLUS={on:{},k:1.15,g:1.15};
try{const s=JSON.parse(store.get('cc-plus','{}'))||{};if(s.on)PLUS.on=s.on;if(s.k>=1.01&&s.k<=2)PLUS.k=+s.k;if(s.g>=1&&s.g<=1.5)PLUS.g=+s.g;}catch(e){}
const savePlus=()=>{const {on,k,g}=PLUS;store.set('cc-plus',JSON.stringify({on,k,g}));};
const plusK=car=>PLUS.on[car]?PLUS.k:0,plusG=car=>PLUS.on[car]?PLUS.g:1;
const plusTag=car=>PLUS.on[car]?'+':'';
function setPlus(car,on){PLUS.on[car]=!!on;if(!on)delete PLUS.on[car];savePlus();if(car===APP.car)spawnRig();}
function rigName(car,rig){
  for(const id of presetsOf(car)){const p=PRESET_PARTS[id];if(SLOTS.every(([k])=>p[k]===rig[k]))return BUILDS.find(b=>b.id===id).name;}
  return 'Custom';}
const carLabel=()=>carName({car:APP.car})+' '+rigName(APP.car,rigOf(APP.car))+plusTag(APP.car);

/* ---------- where things are: the garage in town, the town's streets, the roads out, the salt ---------- */
let PLACES=[];
/* inside Marisol's garage, facing its door (the game starts here) */
const HOME=[58,95,-PI/2];
function computePlaces(){
  const L=WG.L,P=WG.PARK,K=WG.PKW,hx=WG.HWY_X,rz=z=>WG.offNS(0,z);
  PLACES=[['garage',"Marisol's garage",...HOME],['downtown','Downtown, on Highway 40',-60,4,0],['neon','Neon Row',-180,117,0],['ring','Limits Boulevard',-120,-352,0],
    ['hwyE','Highway 40, heading east',420,4,0],['hwyW','Highway 40, heading west',-420,-4,PI],['gas',"Deke's Gas",470,-32,PI/2],['diner','The Starlite Diner',-470,22,0],
    ['ridge','Ridge Road, into the hills',rz(-420)+1,-420,PI/2],['hills','Up in the hills',rz(-2200)+1,-2200,PI/2],['wash','Wash Road, south',rz(420)-1,420,-PI/2],
    ['bog','The bog',WG.BOG.x+48,WG.BOG.z,PI],['paddock','The off-road park: the paddock',K.ROADX,K.LOT.z1-12,PI/2],['oval','Speedway 25 (the oval)',K.OV.x-14,K.OV.z+K.OV.R-2,0],
    ['short','The short course',-2690,-840,0],['mud','The mud track',-2412,-1440,0],['strip','The drag strip',K.ST.start-3.2,K.ST.lanes[0],0],
    ['saltE','Where the highway ends (east)',hx-200,4,0],['saltW','Where the highway ends (west)',-hx+200,-4,PI],['deep','Deep out on the salt',hx+3000,400,0]];
}
/* the name of the place the car is in */
function placeName(x,z){return WG.placeAt(x,z);}
function say(t,k=2.4,col){GAME.msgs.push({t,k,a:0,t0:APP.t,col});if(GAME.msgs.length>3)GAME.msgs.shift();}
/* the phone buzzes (Android; iPhones ignore it) */
let BUZZ_T=0;
function buzz(p){if(!APP.haptics||!navigator.vibrate||GAME.state!=='drive')return;const now=performance.now();if(now-BUZZ_T<60)return;BUZZ_T=now;try{navigator.vibrate(p);}catch(e){}}
Feats.pop=(t,col,big)=>say(t,big?2.6:2,col);Feats.buzz=buzz;Feats.carName=carLabel;Feats.place=()=>GAME.place;Feats.racing=()=>RACE.on;Feats.load('cc-free');

/* ---------- the car on the ground ---------- */
const SETTLE={steer:0,thr:0,brk:1,hb:0,nos:false};
function placeCar(x,z,yaw){
  /* a fresh place: the first few seconds take the world as fast as it comes (51_world worldDrain) */
  WORLD.rush=APP.t+4;
  GAME.frozen=false;
  LAP.on=false;LAP.s=-1;parkReset();Feats.resetCar();
  const t=GAME.car,y=RANCH.W.heightAt(x,z);
  t.place([x,y+.05,z],yaw);
  for(const w of t.wheels){w.comp=0;w.ang=0;w.w=0;}
  if(t.lean){t.lean.x=t.lean.z=0;t.lean.bail=null;}
  const pt=t.pt;pt.gear=pt.g0||1;pt.cvtR=0;pt.jakeOn=false;pt.shiftT=0;pt.engage=0;pt.locked=false;t.rev=false;pt.rev=false;t.drift.on=false;
  if(pt.st!=='off')pt.st='run';
  for(let i=0;i<120;i++)t.step(DT,SETTLE);
  t.v.fill(0);t.w.fill(0);t.rev=false;pt.rev=false;t.revT=0;CAM.cut=true;GAME.flipT=0;PRB.fresh=true;CSM.fresh=true;
}
/* the meshes of builds no longer driven are let go (the wheels are shared and stay) */
function truckEvict(keep){for(const id of Object.keys(TRUCK)){if(keep.includes(id))continue;const T=TRUCK[id];for(const m of [T.body,T.hood,T.hide,T.bay&&T.bay.engine,T.far&&T.far.body,T.far&&T.far.hood,T.rider&&T.rider.lo,T.rider&&T.rider.up])if(m&&m.vao)freeMesh(m);delete TRUCK[id];}}
const RECENT=[];
/* what the Sim level builds the car with: roof loads move its centre of gravity, plus any cargo */
const simOpts=()=>APP.level==='sim'?{cg:!!SIMDEV.cg,cargo:simVal(SIM_CARGO,SIMSET.cargo)}:null;
function spawnCar(i,x,z,yaw){
  if(RACE.on)raceEnd('Race abandoned');
  const prev=GAME.car,t=makeCar(i,RANCH.world,simOpts(),plusK(BUILDS[i].car),plusG(BUILDS[i].car));t.setAssists(APP.level);devFit(t);
  const b=BUILDS[i];RECENT.unshift(b.id);RECENT.length=Math.min(RECENT.length,3);truckEvict(RECENT);truck(i);
  if(prev&&prev.pt.st!=='off'){t.pt.st='run';t.pt.we=t.pt.e.idle*TAU/60;}
  t.pt.maxG=APP.od&&hasOD(t.pt.e)?t.pt.e.nG-1:0;
  /* a machine's rider leans (34_machines); the semi has its jake brake */
  if(t.c.riderKg)t.lean={x:0,z:0,bail:null};t.pt.jake=!!t.pt.e.jake;
  GAME.car=t;APP.bi=i;GAME.dirt=b.dirt;
  if(x===undefined){if(prev){x=prev.p[0];z=prev.p[2];yaw=Math.atan2(-prev.M[6],prev.M[0]);}else{x=HOME[0];z=HOME[1];yaw=HOME[2];}}
  placeCar(x,z,yaw);
  /* the synth becomes this engine */
  const v=GAME.voice;v.spec=t.spec;if(v.port)v.port.post({t:'cfg',cfg:SIM.dspCfg(t.spec)});
  syncTouch();
}
/* drive the current car's rig (after a garage change or a new car) */
function spawnRig(keepPlace=true){const t=GAME.car;spawnCar(rigBuild(APP.car,rigOf(APP.car)),...(keepPlace&&t?[t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0])]:[]));}
const carWhole=t=>{for(const a of [t.p,t.v,t.w,t.q])for(let k=0;k<a.length;k++)if(!Number.isFinite(a[k]))return false;return true;};
function resetCar(){const t=GAME.car;placeCar(t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0]));}
function goTo(id){const p=PLACES.find(q=>q[0]===id);if(!p)return;RUN.on=null;if(RACE.on)raceEnd('Race abandoned');placeCar(p[2],p[3],p[4]);say(p[1].toUpperCase(),2);}
/* overdrive off: the automatic holds out of its top gear (the button on the shifter) */
const hasOD=e=>e.conv&&!e.cvt&&e.nG>2;
function setOD(on){const pt=GAME.car.pt;if(!hasOD(pt.e))return false;APP.od=on;pt.maxG=on?pt.e.nG-1:0;if(on&&pt.gear>pt.maxG&&pt.shiftT<=0)pt.shift(-1);return true;}

/* ---------- the engine and its sound ---------- */
async function startEngine(){
  if(GAME.busy)return;GAME.busy=true;
  /* the engine runs whether or not the browser will make a sound */
  GAME.car.pt.start();
  try{ENG.room=roomNow();await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();voiceNode(GAME.voice);}
  catch(e){ENG.status='Sound could not start: '+e.message;}
  GAME.busy=false;
}
function toggleEngine(){const pt=GAME.car.pt;if(pt.st==='off'||pt.st==='stopping')startEngine();else pt.stop();}
/* the room the engine is heard in: the setting, or on Auto the lab's garage inside a building and open air outside */
function roomNow(){if(ENG.roomMode!=='auto')return ENG.roomMode;const p=GAME.place||'';return /^In (the|a) /.test(p)?'garage':'open';}
/* City Limits' electric car has no engine to synthesise: its own voice (45_ev's evSound) on the engine bus, and the
   synth asleep while it plays */
function evVoice(car,dt,on){const v=GAME.voice,a=ENG.audio;if(!a)return;
  if(on){if(!v.ev){v.ev=evSound(a.ctx);v.ev.out.connect(a.eng);}if(car)v.ev.update(car,dt,GAME.state);if(v.port&&!v.evZ){v.port.post({t:'sleep',v:true});v.evZ=true;}}
  else{if(v.ev)v.ev.out.gain.setTargetAtTime(0,a.ctx.currentTime,.05);if(v.port&&v.evZ){v.port.post({t:'sleep',v:false});v.evZ=false;}}}
/* what the synth hears: the lab's 'behind' listener, from wherever the chase camera is */
function soundUpdate(c){
  const v=GAME.voice;if(!ENG.audio||!v.port)return;const t=GAME.car,M=t.M,F=mcol(M,0),mode=CAMS[APP.cam],D=carD(t);
  const isEV=!!t.spec.ev;evVoice(t,1/60,isEV);if(isEV){t.pt.takeEvents();return;}
  const ex=add(t.p,mvec(M,[-(D.L/2-.15)-t.cg[0],.4-t.cg[1],0])),dist=len(sub2(c.eye,ex)),right=norm2([-c.fwd[2],0,c.fwd[0]]),toCam=norm2(sub2(c.eye,t.p));
  /* the camera sits 7 to 11 m back; the synth hears it from no further than the lab's own 'behind' spot plus a little, so it sounds like the lab */
  let geo={dist:clamp(dist,1.5,5),pan:clamp(-dot2(norm2(sub2(t.p,c.eye)),right)*.9,-1,1),rear:clamp(.5-.5*dot2(toCam,F),0,1)*.6+.4};
  /* Back Forty: the model bay's mic, the lab's Behind spot (3 m back, square on), whatever the camera does */
  if(ENG.mic==='bay')geo={dist:t.spec.behindDist||3,pan:0,rear:1};
  if(mode==='Hood'&&!APP.orbit)geo={dist:3.2,pan:0,rear:.3};
  /* the room follows where the car is, once it has been there a second */
  const rm=roomNow();if(rm!==ENG.room){ENG.roomT=(ENG.roomT||0)+1/60;if(ENG.roomT>1){ENG.roomT=0;ENG.room=rm;swapRoom();}}else ENG.roomT=0;
  const ep=t.pt.soundParams(0,t.speed,geo);ep.horn=GAME.state==='drive'&&keyOn('horn')?1:0;ep.jake=t.pt.jakeOn?3:0;
  /* the pitch test (V): the synth hears the engine turning slower than it is; the physics and the tach don't change */
  if(ENG.pitch!==1)ep.rpm*=ENG.pitch;
  for(const e of t.pt.takeEvents())v.port.post({t:'ev',ev:e});
  v.port.post({t:'p',p:ep});
}

/* ---------- keyboard, game controller and the touch controls ---------- */
const KEYS={thr:['ArrowUp','KeyW'],brk:['ArrowDown','KeyS'],left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],hb:['Space'],nos:['ShiftLeft','ShiftRight','KeyN'],
  up:['KeyE','KeyX'],down:['KeyQ','KeyZ'],cam:['KeyC'],stats:['KeyF'],cruise:['KeyY'],pitch:['KeyV'],reset:['KeyR'],menu:['Escape','KeyP'],low:['KeyL'],lockers:['KeyK'],lights:['KeyJ'],ign:['KeyI'],purge:['KeyB'],horn:['KeyH'],map:['KeyM'],od:['KeyO'],trac:['KeyT']};
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
  /* the number keys are part throttle, as in the lab and the model bay: 1 is 10% gas, 9 is 90% */
  let pth=0;for(let d=1;d<=9;d++)if(INPUT.down.has('Digit'+d)||INPUT.down.has('Numpad'+d))pth=Math.max(pth,d/10);
  /* W like a driver's foot: half gas while it's held (the automatic shifts about 3,500 then); a quick second press
     (W twice within a third of a second) is a kickdown: the floor, until W comes up */
  const wOn=keyOn('thr');
  if(wOn&&!INPUT.wWas){INPUT.kick=APP.t-(INPUT.wUp||-9)<.33;}
  if(!wOn&&INPUT.wWas)INPUT.wUp=APP.t;
  INPUT.wWas=wOn;if(!wOn)INPUT.kick=false;
  const foot=ENG.gas==='foot'&&!INPUT.kick?.5:1;
  INPUT.thr+=clamp((keyOn('thr')?foot:pth)-INPUT.thr,-8*dt,6*dt);INPUT.brk+=clamp((keyOn('brk')?1:0)-INPUT.brk,-10*dt,8*dt);
  out.steer=INPUT.steer;out.thr=INPUT.thr;out.brk=INPUT.brk;out.hb=keyOn('hb')?1:0;out.nos=keyOn('nos');
  for(const k of ['up','down','cam','reset','menu','low','lockers','lights','ign','purge','map','od','trac','stats','cruise','pitch'])out[k]=keyHit(k);
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
const IDLE_IN={steer:0,thr:0,brk:1,hb:1,nos:false,park:true};
/* a test can drive the car (tools/engine_tone.py): its inputs instead of the keys */
let TEST_IN=null;const setTestInput=o=>{TEST_IN=o;};
function step(dt){
  if(TEST_IN)INPUT.pressed.clear();
  const t=GAME.car,inp=TEST_IN||pollInput(dt),pt=t.pt;
  if(inp.menu&&SHOW.full){showFull(false);inp.menu=false;}
  if(inp.menu){if(GAME.state==='results')hideResults();else GAME.state==='drive'?openMenu(false):closeMenu();}
  let drive=IDLE_IN;
  if(GAME.state==='drive'){
    if(inp.cam){APP.cam=(APP.cam+1)%CAMS.length;CAM.cut=true;saveGame();say(CAMS[APP.cam]+' camera',1.2);}
    if(inp.reset){if(RACE.on&&RACE.state!=='grid')raceResetMe();else if(!RACE.on)resetCar();say('Reset',1);}
    if(inp.up)pt.shift(1);if(inp.down)pt.shift(-1);
    if(inp.low)say(setLow(t,!t.low)?(t.low?'Low range':'High range'):'No low range on this car',1.4);
    if(inp.lockers)say(setLockers(t,!t.locked)?(t.locked?'Lockers on':'Lockers off'):'No lockers on this car',1.4);
    if(inp.od)say(setOD(!APP.od)?(APP.od?'Overdrive off':'Overdrive on'):pt.e.cvt?'No overdrive on a belt drive':'No overdrive button on a manual',1.4);
    if(inp.lights){APP.lights=!APP.lights;say(APP.lights?'Lights on':'Lights off',1);}
    if(inp.map)APP.bigMap=!APP.bigMap;
    if(inp.stats){DEVW.hud=!DEVW.hud;saveDev();}
    if(inp.cruise)toggleCruise();
    if(inp.pitch){ENG.pitch=ENG.pitch===1?.9:ENG.pitch===.9?.8:1;saveEng();syncSound();say('ENGINE PITCH '+Math.round(ENG.pitch*100)+'%'+(ENG.pitch===1?' (TRUE)':''),1.8);}
    if(inp.trac&&DEV)say('Traction '+pct(devStep()),1.4);
    if(inp.ign)toggleEngine();
    if(inp.purge&&GAME.voice.port&&pt.e.nosKw)GAME.voice.port.post({t:'ev',ev:{type:'purge'}});
    drive=inp;
    if(CRUISE.on)drive=cruiseDrive(t,drive);
    /* brake and gas together at a standstill: a race gearbox holds on its trans-brake for a launch; anything
       else gets a line lock (the front brakes held, the drive to the rear wheels) for a burnout */
    if(!pt.e.launch&&inp.brk>.5&&inp.thr>.3&&t.speed<3&&!t.rev&&pt.running)drive=Object.assign({},inp,{brk:0,lock:true});
    if((inp.thr>.1||inp.brk>.1)&&pt.st==='off'&&!GAME.busy&&!GAME.engineWanted){GAME.engineWanted=true;startEngine();}
    /* a governor (the kids' quad's limiter screw, the golf cart, the semi's road-speed limit) eases the throttle off at its speed */
    const gov=t.build.gov;if(gov&&drive.thr>0&&t.speed>gov-1.2)drive=Object.assign({},drive,{thr:drive.thr*clamp((gov-t.speed)/1.2,0,1)});
  }
  /* a race: held on the grid until the lights go green; paused with the menu up (60_race) */
  if(RACE.on&&RACE.hold)drive={steer:0,thr:drive.thr||0,brk:1,hb:1,nos:false};
  /* the drag strip's tree (60_park): the car held on its brakes until green (rev it all you like); the gas
     floored before green is a red light */
  if(!RACE.on&&PARKT.dr.st==='tree'){if(drive.thr>.6&&!PARKT.dr.foul){PARKT.dr.foul=true;say('RED LIGHT',1.8,PAL.red);}drive={steer:drive.steer||0,thr:drive.thr||0,brk:1,hb:1,nos:false,park:true};}
  if(RACE.on&&GAME.state!=='drive'){GAME.acc=0;return;}
  /* paused: the car is held exactly as it was (speed and all) until the menu closes; changing it or going
     somewhere places it afresh, and that unfreezes it */
  if(GAME.state==='menu'&&GAME.frozen){GAME.acc=0;return;}
  /* a machine's rider leans; a rider who has bailed lets go of everything */
  if(t.lean)riderStep(dt,t,drive);
  if(t.lean&&t.lean.bail)drive=IDLE_IN;
  GAME.acc+=dt;let n=0;
  if(RACE.on)raceFrame(dt);
  /* at most eight steps (a thirtieth of a second) a frame: below 30 fps the game runs a little slow rather than
     spending a slow frame catching up and making the next one slow too */
  const tp=performance.now();
  while(GAME.acc>=DT&&n<8){t.step(DT,drive);if(RACE.on)raceSub(DT);GAME.acc-=DT;n++;GAME.time+=DT;}
  /* a last line: if the car's numbers ever break, it goes back to where it last was whole, on its wheels, and the
     camera starts afresh (one broken frame used to leave the screen black until a restart) */
  if(carWhole(t)){if(GAME.time-(GAME.safeT||-9)>.5){GAME.safeT=GAME.time;GAME.safe=[t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0])];}}
  else{const s=GAME.safe||HOME;spawnCar(APP.bi,s[0],s[1],Number.isFinite(s[2])?s[2]:0);CAM.cut=true;CAM.yaw=null;CAM.off=null;say('Reset',1.2);}
  PS.sub+=n;psT(PS_PHYS,tp);
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
  const ev=t.takeEvents();riderBail(t,ev);if(ev.land>4||ev.wall>4||ev.ground>5)CAM.shake=Math.min(1,Math.max(ev.land,ev.wall,ev.ground)/12);
  if(ev.wall>4||ev.ground>6)buzz(Math.min(90,20+Math.max(ev.wall,ev.ground)*6));
  if(ev.debead)say('A tyre rolled off its rim. R to reset',3.5,PAL.amber);
  simWarn(dt,t);
  /* the phone feels the gearbox and the limiter */
  if(pt.gear!==GAME.gear){if(pt.gear>GAME.gear&&GAME.state==='drive')buzz(12);GAME.gear=pt.gear;}
  if(pt.running&&pt.rpm>pt.e.limiterRpm-30&&pt.thr>.5&&APP.t-GAME.limT>.18){GAME.limT=APP.t;buzz(6);}
  GAME.placeT=(GAME.placeT||0)-dt;if(GAME.placeT<=0){GAME.placeT=.5;const p=placeName(t.p[0],t.p[2]);if(p!==GAME.place){GAME.place=p;}}
  if(GAME.state==='drive'){Feats.step(dt,t,ev,RANCH.W);if(RACE.on)racePost(dt);else{lapStep(dt,t);runStep(dt,t);parkStep(dt,t);}}
}
/* ---------- a rider on a machine: leaning into turns, uphill on a slope, forward up a climb; in the air the
   gas pulls the bars (nose up) and the brake pushes them (nose down), and steering throws the weight across.
   A quad rider who goes over with it, or lands far too hard, bails off ---------- */
function riderStep(dt,t,drive){
  const L=t.lean,M=t.M,pitch=Math.asin(clamp(M[3],-1,1)),roll=Math.asin(clamp(M[5],-1,1));
  if(L.bail)return;
  let tx,tz;
  if(t.air&&t.airT>.15){tx=clamp((drive.brk-drive.thr)*.9,-1,1);tz=clamp(drive.steer,-1,1);}
  else{tz=clamp(drive.steer*clamp(t.speed/6,0,1)*1.1+roll*2.4,-1,1);tx=clamp(pitch*2.6-drive.brk*.3+(t.speed<4?0:drive.thr*.15),-1,1);}
  const k=Math.min(1,dt*7);L.x+=(tx-L.x)*k;L.z+=(tz-L.z)*k;
}
function riderBail(t,ev){
  const L=t.lean,M=t.M,Mc=MACH[t.c.machine];if(!L||L.bail)return;
  if(Mc&&Mc.kind==='quad'&&GAME.state==='drive'&&(M[4]<.35||ev.land>13)){
    const gy=RANCH.W.heightAt(t.p[0],t.p[2]),F=[M[0],M[3],M[6]],side=M[5]>0?-1:1;
    L.bail={p:[t.p[0]-M[2]*side*.9,gy,t.p[2]-M[8]*side*.9],yaw:Math.atan2(-F[2],F[0])+.6};
    say(GAME.touch?'BAILED! Tap Reset to get back on':'BAILED! Press R to get back on',3,'#ff3d5a');buzz([80,40,80]);}
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
try{LAP.best=JSON.parse(store.get('cc-laps','{}'))||{};}catch(e){}
const fmtLap=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const lapKey=()=>BUILDS[APP.bi].id+':'+APP.level;
function lapStep(dt,t){return;
  const T=RANCH.W.country.track,n=T.nearest(t.p[0],t.p[2],2);
  if(!n||n.d>16){if(LAP.on&&(LAP.offT+=dt)>8){LAP.on=false;say('Lap abandoned',1.6);}LAP.s=-1;return;}
  LAP.offT=0;const s=n.s,L=T.len,p=LAP.s;LAP.s=s;if(p<0)return;
  if(p>L-60&&s<60){
    if(LAP.on&&LAP.cp>=2){const lt=GAME.time-LAP.t0,k=lapKey(),b=LAP.best[k];
      if(!b||lt<b){LAP.best[k]=lt;store.set('cc-laps',JSON.stringify(LAP.best));}
      Feats.timed('lap',`LAP ${fmtLap(lt)}${b&&lt<b?' BEST':''}`,120+Math.max(0,90-lt)*6,{s:lt},'lap',lt,`Race track lap ${fmtLap(lt)}`);}
    else if(!LAP.on)say('LAP STARTED',1.4);
    LAP.on=true;LAP.t0=GAME.time;LAP.cp=0;}
  else if(p<60&&s>L-60)LAP.on=false;
  if(LAP.on){if(LAP.cp===0&&p<L/3&&s>=L/3)LAP.cp=1;else if(LAP.cp===1&&p<2*L/3&&s>=2*L/3)LAP.cp=2;}
}
/* ---------- clock runs: from one place to another, any way you like, against the clock and a par time ---------- */
const RUNS=[];
const RUN={on:null,t0:0,armed:false,best:{}};
try{RUN.best=JSON.parse(store.get('cc-runs','{}'))||{};}catch(e){}
function startRun(id){const r=RUNS.find(q=>q.id===id);if(!r)return;goTo(r.from);RUN.on=r;RUN.armed=false;say(r.name.toUpperCase(),2.4);say('GO WHEN YOU\'RE READY',2.4);}
function runStep(dt,t){
  const r=RUN.on;if(!r)return;
  if(!RUN.armed){if(t.speed>1.5){RUN.armed=true;RUN.t0=GAME.time;}return;}
  const d=Math.hypot(t.p[0]-r.to[0],t.p[2]-r.to[1]),el=GAME.time-RUN.t0;
  if(d<16){RUN.on=null;const b=RUN.best[r.id],nb=!b||el<b;if(nb){RUN.best[r.id]=el;store.set('cc-runs',JSON.stringify(RUN.best));}
    const under=el<=r.par;Feats.timed('run',`${r.name.toUpperCase()} ${fmtLap(el)}${under?' UNDER PAR':''}`,(150+Math.max(0,r.par-el)*8)*(under?1.5:1),{s:el},'run:'+r.id,el,`${r.name} in ${fmtLap(el)}`);}
  else if(el>r.par*3){RUN.on=null;say('RUN TIMED OUT',2);}
}

/* ---------- the camera: it sits further back and higher for a longer or taller car; in the garage it circles the car ---------- */
const CAM={yaw:null,yawV:0,off:null,pv:[0,0,0],fq:null,cut:true,shake:0,orbitA:0};
const springTo=(x,v,t,w,dt)=>{const a=2*dt*w,b=dt*dt*w*w,n=(x*(1+a)+dt*v+b*t)/(1+a+b);return [n,(n-x)/dt];};
function camUpdate(dt){
  const t=GAME.car,M=t.M,F=mcol(M,0),U=mcol(M,1),sp=t.speed,mode=CAMS[APP.cam],cut=CAM.cut,lift=liftOf(t),D=carD(t),kl=Math.sqrt(D.L/4.92);CAM.cut=false;
  CAM.shake=Math.max(0,CAM.shake-dt*3);
  /* (a fixed view from somewhere else, for the tools: {eye, at, fov}) */
  if(CAM.over){const o=CAM.over;return {eye:o.eye.slice(),fwd:norm2(sub2(o.at,o.eye)),up:[0,1,0],fov:o.fov||1};}
  const body=(x,y,z)=>add(t.p,mvec(M,[x-t.cg[0],y-t.cg[1],z]));let eye,fwd,up=[0,1,0],fov=1.02;
  if(APP.orbit){
    /* the garage: round and round the car, a little above it */
    CAM.orbitA+=dt*.32;const yaw=Math.atan2(-M[6],M[0])+CAM.orbitA,r=D.L*1.25+2.2+lift*2;
    eye=[t.p[0]+Math.cos(yaw)*r,t.p[1]+1.1+lift,t.p[2]-Math.sin(yaw)*r];const gy=RANCH.W.heightAt(eye[0],eye[2])+.6;if(eye[1]<gy)eye[1]=gy;
    fwd=norm2(sub2([t.p[0],t.p[1]+.1,t.p[2]],eye));CAM.yaw=null;CAM.off=null;CAM.fq=null;return {eye,fwd,up,fov:.9};
  }
  if(mode==='Hood'){
    /* on the hood, just behind the front axle */
    const u=D.uFa+D.B.wb*.15;eye=D.machine?body(D.eye[0],D.eye[1],D.eye[2]):body(D.X(u),D.belt(u)+.25,0);if(!CAM.fq||cut)CAM.fq={F,U};const k=1-Math.exp(-dt*20);
    CAM.fq.F=norm2(madd(CAM.fq.F,sub2(F,CAM.fq.F),k));CAM.fq.U=norm2(madd(CAM.fq.U,sub2(U,CAM.fq.U),k));fwd=CAM.fq.F;up=CAM.fq.U;fov=1.1;CAM.yaw=null;
    /* a machine's helmet camera looks down a little, to the bars, the wheel or the hood (wider on a laptop than a phone) */
    if(D.machine){const dn=D.eyeDown;fwd=norm2(madd(fwd,up,-dn));up=norm2(madd(up,fwd,dn));fov=GFX.level==='mini'||GFX.level==='phone'?1.05:1.18;}
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
function camMats(c,asp){
  /* the GPU sees the world relative to the floating origin (51_world); the culling, and anything worked out on
     the CPU in world coordinates, uses VPw */
  const eR=[c.eye[0]-RO[0],c.eye[1]-RO[1],c.eye[2]-RO[2]],V_=M4.look(eR,add(eR,c.fwd),c.up),Vw=M4.look(c.eye,add(c.eye,c.fwd),c.up),
    far=Math.max(1500,WORLD.farR+600),P_=M4.persp(c.fov,asp,mode0Near(),far);
  /* in the garage the menu covers the left of the screen: the picture slides right so the car sits in what's left */
  if(APP.orbit){const mr=APP.menuRight||0,right=Math.min(innerWidth,RECT.x+RECT.w),cx=(Math.max(mr,RECT.x)+right)/2;P_[8]=-clamp((cx-RECT.x)/RECT.w*2-1,0,.8);}
  return Object.assign(c,{eyeR:eR,V:V_,P:P_,VP:M4.mul(P_,V_),VPw:M4.mul(P_,Vw),asp,near:mode0Near(),far});}
const mode0Near=()=>CAMS[APP.cam]==='Hood'&&!APP.orbit?.12:.3;

/* ---------- drawing ---------- */
const SKY={sun:V3.norm([-.52,.5,.4]),sunCol:[1.28,1.18,1.02],sky:[.44,.5,.62],gnd:[.24,.18,.13],zen:[.16,.32,.85],hor:[.78,.86,1.02],fogD:.0011,fogK:[.68,.72,.78],draw:420,night:0};
function worldUniforms(c){
  /* the sky for the time of day, turned grey by the weather (55_gfx) */
  const u=CUR.u,k=SKY.fogK,S=skyNow();
  gl.uniformMatrix4fv(u.uVP,false,c.VP);gl.uniform3fv(u.uCam,c.eyeR);gl.uniform1f(u.uTime,APP.t);if(u.uFarDrop)gl.uniform4f(u.uFarDrop,0,0,0,0);orgFor(u,RO[0],RO[2]);
  gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);
  gl.uniform3fv(u.uSkyZen,S.zen);gl.uniform3fv(u.uSkyHor,S.hor);gl.uniform3fv(u.uFogCol,[S.hor[0]*k[0],S.hor[1]*k[1],S.hor[2]*k[2]]);gl.uniform1f(u.uFogD,S.fogD);gl.uniform1f(u.uStage,3);
  gl.uniform1i(u.uNL,0);gl.uniform1f(u.uInst,0);gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);gl.uniform1f(u.uDirt,0);gl.uniform1i(u.uNSh,0);
}
/* the soft shadows under the cars on the ground: centre, half size, yaw and how dark (fading as a car leaves the ground) */
const WSH=new Float32Array(32),WSA=new Float32Array(8),WSK=new Float32Array(8);
function worldShadows(cars){
  const u=CUR.u;let n=0;
  for(const t of cars){if(n>=8)break;const D=carD(t),M=t.M,o=mvec(M,[-t.cg[0],-t.cg[1],0]),x=t.p[0]+o[0],z=t.p[2]+o[2],gy=RANCH.W.heightAt(x,z),hgt=t.p[1]+o[1]-gy;
    WSH[n*4]=x-RO[0];WSH[n*4+1]=z-RO[2];WSH[n*4+2]=D.L/2-.02;WSH[n*4+3]=t.build.look.track/2+.12;WSA[n]=Math.atan2(-M[6],M[0]);WSK[n]=clamp(1-hgt/3.5,0,1)*(SKY.night?.5:CSM.on?.55:.9);n++;}
  gl.uniform4fv(u.uSh,WSH);gl.uniform1fv(u.uShA,WSA);gl.uniform1fv(u.uShK,WSK);gl.uniform1i(u.uNSh,n);
}
/* the car's model matrix: physics frame (centre of gravity) to the model's frame (ground under the middle) */
function carMatrix(t){const R=t.M,m=new Float32Array(16);
  m[0]=R[0];m[1]=R[3];m[2]=R[6];m[4]=R[1];m[5]=R[4];m[6]=R[7];m[8]=R[2];m[9]=R[5];m[10]=R[8];m[12]=t.p[0]-RO[0];m[13]=t.p[1]-RO[1];m[14]=t.p[2]-RO[2];m[15]=1;
  return M4.mul(m,M4T(-t.cg[0],-t.cg[1],0));}
function carUniformsW(t,v,dirt){
  const u=CUR.u,b=t.build,D=carD(t);
  gl.uniform3fv(u.uPaint,lin(b.paint));gl.uniform3fv(u.uPaint2,lin(b.paint2));gl.uniform3fv(u.uRim,lin(b.rim));gl.uniform3fv(u.uCal,lin(b.cal));gl.uniform3fv(u.uClad,lin(b.clad));
  gl.uniform1f(u.uLiv,b.liv);gl.uniform1f(u.uLights,APP.lights?1:0);gl.uniform3fv(u.uGlow,b.glow||[0,0,0]);gl.uniform1f(u.uBrake,t.brkIn>.05?1:0);gl.uniform1f(u.uDirt,dirt);
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
  if(far){const F=truckFar(i);drawMesh(F.body);if(F.hood)drawMesh(F.hood);}
  else{drawMesh(T.body);if(T.hood)drawMesh(T.hood);if(T.hide)drawMesh(T.hide);if(T.engineOut)drawMesh(T.bay.engine);}
  if(T.rider&&!far)drawRider(t,T,Mb);
  for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
  if(v&&v.flame>.04&&D.tips)for(const tp of D.tips){
    const up=Math.abs(tp.d[1])>.9?[1,0,0]:[0,1,0],rr=V3.norm(V3.cross(tp.d,up)),uu=V3.cross(rr,tp.d),k=Math.min(1,v.flame),fl=(.12+.42*k*v.flameL)*(.85+.3*Math.random()),fr=tp.r*(.8+.5*k);
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4.basis(tp.p,tp.d,uu,rr),M4S(fl,fr,fr))));drawMesh(flameMesh());}
  for(const w of t.wheels){const s=w.hp[2]<0?-1:1,st=w.front?t.steer:0;gl.uniform1f(u.uMudOff,w.R);
    /* the semi's tandem: two axles of duals where the physics has one */
    const xs=!w.front&&D.tandem?D.tandem:[0],zs=!w.front&&D.dual?[D.dual,-D.dual]:[0];
    for(const dx of xs)for(const dz of zs){
      const M=M4.mul(M0,M4.mul(M4T(w.hp[0]+t.cg[0]+dx,w.hp[1]-w.len+t.cg[1],w.hp[2]+dz*s),M4.mul(M4RY(-st),M4.mul(M4S(1,1,s),M4RZ(-w.ang)))));
      gl.uniformMatrix4fv(u.uM,false,M);drawMesh(w.front?T.wheel:T.wheelR);}}
  gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);
  return far?truckFar(i).tris+T.tris-(T.body.n+(T.hood?T.hood.n:0)+(T.hide?T.hide.n:0))/3:T.tris;
}
/* the rider: legs on the pegs, the upper body leaning about the hips; bailed, lying in the dirt beside the machine.
   From the helmet camera only the legs and hands are drawn (Mini Dirt Run Solo's, drawn relative to the origin) */
function drawRider(t,T,Mb){
  const u=CUR.u,R=T.rider,L=t.lean,P=R.pivot;
  if(L&&L.bail){const B=L.bail,M=M4.mul(M4.mul(M4T(B.p[0]-RO[0],B.p[1]+.2-RO[1],B.p[2]-RO[2]),M4RY(B.yaw)),M4.mul(M4RX(PI/2),M4T(-P[0],-P[1]*.4,-P[2])));
    gl.uniformMatrix4fv(u.uM,false,M);drawMesh(R.lo);gl.uniformMatrix4fv(u.uM,false,M4.mul(M,M4T(P[0],P[1],P[2])));drawMesh(R.up);gl.uniformMatrix4fv(u.uM,false,Mb);return;}
  gl.uniformMatrix4fv(u.uM,false,Mb);drawMesh(R.lo);
  if(CAMS[APP.cam]==='Hood'&&GAME.car===t)return;
  const lx=L?L.x:0,lz=L?L.z:0,Mc=MACH[t.c.machine]||{},sh=(Mc.leanZ||0)*.5*lz;
  gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(P[0]+lx*(Mc.leanX||0)*.3,P[1],P[2]+sh),M4.mul(M4RX(lz*.38),M4RZ(-lx*.42)))));drawMesh(R.up);
  gl.uniformMatrix4fv(u.uM,false,Mb);
}
function render(dt){
  /* the opening screen and the garage: the showroom (63_showroom) */
  if(showActive()){renderShow(dt);return;}
  hClear();
  let tq=performance.now();
  let cw=camUpdate(dt);
  /* (a camera that lost its numbers starts again behind the car rather than staying lost) */
  if(![...cw.eye,...cw.fwd].every(Number.isFinite)){CAM.cut=true;CAM.yaw=null;CAM.off=null;CAM.fq=null;cw=camUpdate(dt);}
  const T=sceneTargetHD(),t=GAME.car;worldUpdate(cw.eye,t);setOrigin(cw.eye);const c=CAM.last=camMats(cw,T.w/T.h);GFX.frame++;
  tq=psT(PS_WORLD,tq);
  /* the sun's cascaded shadow maps and a face of the reflection probe first (55_gfx) */
  csmPass(c,t);tq=psT(PS_SHADOW,tq);probePass(t);tq=psT(PS_PROBE,tq);
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.viewport(0,0,T.w,T.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);useLit(P_LIT);
  worldUniforms(c);gfxUniforms();skyLights(t);worldShadows([t,...raceCars()]);
  /* at night the fog closes in and the world past it isn't drawn; by day the graphics level sets how far */
  let tris=drawWorld(c,SKY.night?SKY.draw:0);
  tris+=drawWorldCar(t,GAME.voice,GAME.dirt);tris+=raceDraw(c);
  if(!DEVW.off.fx)tris+=fxDraw();tris+=rainDraw(c,dt);
  /* the dust and spray last, blended over the rest (into the colour only, not the normals the passes read) */
  if(SC.mrt)gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.NONE]);if(!DEVW.off.fx)tris+=fxDrawSoft(c);if(SC.mrt)gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);
  gl.bindVertexArray(null);APP.tris=tris;tq=psT(PS_SCENE,tq);
  /* occlusion and light in the air (laptop), the exposure, then the HUD and the display (55_post) */
  const src=postPasses(c,dt);tq=psT(PS_POST,tq);
  drawHud(c);tq=psT(PS_HUD,tq);
  presentHD(src);psT(PS_SEND,tq);
}

/* ---------- the matrix fills the window, 16:9 ---------- */
function setRes(i,keep){const [dw,dh,hs]=RES[i];HS=hs;BW=dw;BH=dh;W=dw/hs;H=dh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);APP.res=i;if(!keep)store.set('cc-res',i);$('res').textContent='Dots '+BW+'×'+BH;}
function layout(){const vw=innerWidth,vh=innerHeight;
  /* the bay's window fills the whole screen, the car behind the lab's instruments: its dots take the window's shape */
  if(SHOW.full){bayFill(vw,vh);return;}if(BAYGRID.on){BAYGRID.on=false;setRes(APP.res,true);}
  let w=vw,h=w*9/16;if(h>vh){h=vh;w=h*16/9;}RECT={x:(vw-w)/2,y:(vh-h)/2,w,h};}
/* the same dot pitch the 16:9 picture would have had, over the whole window */
const BAYGRID={on:false,key:''};
function bayFill(vw,vh){const [dw,dh,hs]=RES[APP.res];let w=vw,h=w*9/16;if(h>vh){h=vh;w=h*16/9;}const pitch=w/dw;
  const bw=Math.max(hs,Math.round(vw/pitch/hs)*hs),bh=Math.max(hs,Math.round(vh/pitch/hs)*hs),key=bw+'x'+bh+'/'+hs;
  if(!BAYGRID.on||BAYGRID.key!==key){HS=hs;BW=bw;BH=bh;W=bw/hs;H=bh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);BAYGRID.key=key;}
  BAYGRID.on=true;RECT={x:0,y:0,w:vw,h:vh};}
/* how much finer than the dots the scene is drawn: Sharp 2x2, Smooth 1.5x1.5, Fast one sample a dot.
   Auto starts sharp (smooth on a phone) and steps down while driving if the frame rate can't keep up */
const DETAIL={sharp:2,smooth:1.5,fast:1};
function setDetail(id){APP.detail=id;SS=id==='auto'?(GAME.touch||touchy?1.5:2):DETAIL[id];APP.slowT=0;saveGame();}
/* (dots only: the clear display has its own, 55_post drsStep; and the dots it lowers to aren't saved, so the
   setting you chose comes back next time) */
function autoDetail(dt){
  if(APP.detail!=='auto'||GAME.state!=='drive'||DISP.mode==='clear')return;
  if(APP.fps<48){APP.slowT=(APP.slowT||0)+dt;if(APP.slowT>3){APP.slowT=0;if(SS>1){SS=SS>1.5?1.5:1;say('Detail lowered to keep it smooth',1.6);}else if(APP.res>2){setRes(APP.res-1,true);layout();say('Fewer dots to keep it smooth',1.6);}}}
  else APP.slowT=Math.max(0,(APP.slowT||0)-dt*.5);
}

/* ---------- the loop ---------- */
let LAST=0;
function frame(ts){
  const dt=Math.min(.05,LAST?(ts-LAST)/1000:1/60);LAST=ts;APP.t+=dt;
  /* (a test can hold the loop still and draw frames itself) */
  perfBegin();
  if(!GAME.hold)try{step(dt);GAME.voice.flame=Math.max(0,GAME.voice.flame-dt*9);render(dt);const ts0=performance.now();if(showActive())showSound(dt);else if(CAM.last){soundUpdate(CAM.last);raceSound(CAM.last);}psT(PS_SOUND,ts0);autoDetail(dt);drsStep(dt);}catch(e){console.error(e);}
  perfEnd(dt);APP.fps=lerp(APP.fps,1/Math.max(dt,1e-3),.05);gfxWatch(dt);
  if((APP.t*4|0)!==(APP.st4|0)){APP.st4=APP.t*4;$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps · '+WORLD.chunks.size+' chunks';}
  requestAnimationFrame(frame);
}
