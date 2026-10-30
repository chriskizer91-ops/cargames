/* =====================================================================================
   CITY LIMITS — the game page.
   Night racing in and around a little desert town under a full moon: the town's streets and street
   lights, the desert round it, the salt flats past that, forever.
   - Drawn by Shiftlight 3's renderer at its two lightest tiers (Mobile for the phone, Low for a laptop):
     moon shadows, every street light, headlights with a real cut-off, reflections, haze, TAA.
   - The cars, their physics (four driving levels, Sim included) and their engines (the Digital Engine's
     live synth) are Dirt Sleeper's (hd/, joined into build/hd.gen.js by tools/build.mjs).
   - Career or free play (profile.js): the garage (garage.js, Dirt Sleeper HD's parts and ratings),
     challenges round the town and the desert (chaldefs.js, chalrun.js) and jobs for the town's people
     (quests.js), shown in the world by lights (markers.js). No other cars yet. The salt keeps
     Shiftlight's records (top speed, the flying mile, the longest jump).
   Saves use cl- keys only.
   ===================================================================================== */
import {Renderer} from '../render/renderer.js';
import {HDCarRenderer,carDraw} from '../render/hdcar.js';
import {DRS} from '../render/drs.js';
import {Particles} from '../render/particles.js';
import {FlatsView} from '../render/flatsgeo.js';
import {FlatsRun} from './flatsrun.js';
import {Input} from './input.js';
import {CameraRig,CAM_MODES} from './camera.js';
import {HUD} from '../ui/hud.js';
import {TouchControls} from '../ui/touch.js';
import {buildWorld} from '../world/clworld.js';
import {inTown} from '../world/clmap.js';
import {TR} from '../world/terrain.js';
import {qmat,mcol,mvec,add,norm,madd,sub,len,dot,clamp} from '../physics/math3.js';
import * as HD from '../../build/hd.gen.js';
import {FULL_MOON} from './env.js';
import {Menu} from './menu.js';
import {Sound} from './sound.js';
import {Profile,DEALER} from './profile.js';
import {Garage} from './garage.js';
import {buildChallenges,MEDALS,KINDS,fmtVal} from './chaldefs.js';
import {ChalRun} from './chalrun.js';
import {buildQuests,Quests,PEOPLE} from './quests.js';
import {Markers} from './markers.js';

const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const COARSE=matchMedia('(pointer: coarse)').matches;
/* ---------- settings ---------- */
const DEFAULTS={quality:COARSE?'mobile':'low',mode:null,level:'middle',cam:'chase',units:'mph',volume:.8,touch:'auto',steer:'slide',hear:'bay',body:'fuller',scale:'auto',perf:false,flatsRec:null};
const settings=(()=>{let s={};try{s=JSON.parse(localStorage.getItem('cl-settings')||'{}');}catch(e){}return Object.assign({},DEFAULTS,s);})();
for(const k of Object.keys(DEFAULTS))if(Q.has(k))settings[k]=isNaN(+Q.get(k))?Q.get(k):+Q.get(k);
if(!['mobile','low'].includes(settings.quality))settings.quality='mobile';
const save=()=>{if(Q.has('manual'))return;try{localStorage.setItem('cl-settings',JSON.stringify(settings));}catch(e){}};
export const LEVELS=[['kids','Kids','Every helper on, extra grip, and it puts itself back on its wheels.'],['middle','Middle','Steering help, stability and traction control.'],
  ['real','Realistic','ABS and the automatic, nothing else.'],['sim','Sim','Everything real: load transfer, tripping in loose dirt, kerbs that catch, brake and shock fade, tyre pressure.']];

/* ---------- boot ---------- */
const canvas=$('view'),hudC=$('hud'),bootMsg=$('bootMsg');
const say=t=>{bootMsg.textContent=t;};
let R,W,GW,CR,flatsView,hud,input,touch,cam,drs,menu,sound,flatsRun,PS;
/* the game: the save, the garage, the challenges and the run at one, the town's jobs, the lights */
let P=null,garage,CH,QL,quests=null,marks,run=null,ask=null,dismissed=null,objKey='';
let car=null,carT=null,bi=0,state='boot',time=0,acc=0,camLast=null,frameMs=16,lastT=0,highBeam=false,flipT=0,lightsOn=true;
/* parked: the handbrake on and nothing else (a held brake at a standstill would put the automatic in reverse) */
const DT=1/240,IDLE={steer:0,thr:0,brk:0,hb:1,nos:false};

async function boot(){
  await new Promise(r=>setTimeout(r,30));
  try{R=new Renderer(canvas,{quality:settings.quality});}catch(e){say(e.message);throw e;}
  say('building the town and the desert…');await new Promise(r=>setTimeout(r,20));
  W=buildWorld();
  R.loadWorld({geo:W.geo,lights:W.lights,info:W.info},null);
  GW=new HD.GroundWorld(W.groundAt,W.colliders,1e9);
  CR=new HDCarRenderer(R);
  flatsView=new FlatsView(R);
  /* dust, tyre smoke and mud (Shiftlight's puff pool; no rain in the desert, so the rain mask is empty) */
  PS=new Particles(R,{n:2,data:new Float32Array(8),params:[-1e5,-1e5,1/2e5,0]},{rainN:1,splashN:1});PS.rain.on=0;
  flatsRun=new FlatsRun(settings.flatsRec,rec=>{settings.flatsRec=Object.assign({},rec);save();});
  drs=new DRS({min:.5,max:R.Q.maxScale,start:settings.scale==='auto'?.8:+settings.scale});drs.enabled=settings.scale==='auto';
  hud=new HUD(hudC);hud.setMap({paths:W.paths.filter(p=>p.kind==='town'||p.kind==='asphalt'||p.kind==='gravel'||p.kind==='dirt'||p.kind==='trail')});
  touch=new TouchControls($('touch'));
  input=new Input(window,touch);
  cam=new CameraRig({camCollide:camCollide,tvSpot:()=>({id:0,pos:[0,10,0]})});cam.mode=Math.max(0,CAM_MODES.indexOf(settings.cam));
  sound=new Sound(HD,settings);
  CH=buildChallenges(W);QL=buildQuests(W);marks=new Markers(R,W);
  garage=new Garage($('garage'),{HD,profile:()=>P,spawnRig,settings,LEVELS,drive:()=>startDriving(),back:()=>toTitle(),
    level:id=>{settings.level=id;save();car.setAssists(id);},quality:q=>{settings.quality=q;save();location.reload();}});
  menu=new Menu($('menu'),{settings,save,LEVELS,places:W.PLACES,builds:HD.BUILDS,profile:()=>P,run:()=>run,job:()=>quests&&quests.hud(),challenges:CH,MEDALS,KINDS,fmtVal,
    startChal:id=>{menu.close();startChal(CH.find(c=>c.id===id));},restartChal:()=>{if(run){const c=run.c;menu.close();startChal(c);}},
    quitChal:()=>{run=null;pause(false);hud.message('CHALLENGE OFF','#ffffff',1.4);},dropJob:()=>{quests.drop();},title:()=>{menu.close();toTitle();},
    resume:()=>pause(false),goTo:p=>{placeAt(p.x,p.y,p.yaw);pause(false);hud.message(p.name.toUpperCase(),'#9fd8ff',2);},
    level:id=>{settings.level=id;save();car.setAssists(id);},
    quality:q=>{settings.quality=q;save();location.reload();},
    camera:m=>{cam.mode=CAM_MODES.indexOf(m);settings.cam=m;save();},
    volume:v=>{settings.volume=v;save();sound.setVolume(v);},
    hear:()=>{save();sound.configure(settings);},
    garage:()=>{menu.close();openGarage();},reset:()=>{resetCar();pause(false);}});
  say('compiling shaders…');
  await R.G.warmup((d,n)=>say(`compiling shaders ${d}/${n}`));
  /* the car on the title: the last career's or free play's, else the stock SUV */
  const last=settings.mode&&Profile.exists(settings.mode)?new Profile(settings.mode,HD):null;
  spawn(last?HD.rigBuild(last.current,last.rig()):HD.rigBuild('suv',HD.presetRig('stock')),W.PLACES[0]);
  $('boot').hidden=true;
  toTitle();
  addEventListener('keydown',e=>{if(e.repeat)return;
    if(e.code==='Escape'||e.code==='KeyP'){if(state==='drive')pause(true);else if(state==='pause')pause(false);else if(state==='talk')closeDialog(false);else if(state==='result')closeResult();}
    if(e.code==='Enter'||e.code==='NumpadEnter'){if(state==='talk')closeDialog(true);else if(state==='result')closeResult();else if(state==='drive'&&ask)startChal(ask);}});
  addEventListener('resize',fit);fit();
  requestAnimationFrame(frame);
  window.__game={W,R,get car(){return car;},settings,setInput:f=>{autoInput=f;},spawn:i=>spawn(i),placeAt,HD,cam,state:()=>state,go:()=>startDriving(),
    hold:on=>{hold=on;},frame:(dt=1/30)=>{frame(0,dt);},
    /* step the physics only (no drawing) for t seconds */
    sim:(t,dt=1/60)=>{for(let k=0;k<t/dt;k++){const {ev}=step(dt);}},
    shot:()=>{frame(0,1/30);const gl=R.gl;gl.finish();const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const g=c.getContext('2d');g.drawImage(canvas,0,0);g.drawImage(hudC,0,0);return c.toDataURL('image/png');},
    toTitle,chooseMode,openGarage,startChal:id=>startChal(CH.find(c=>c.id===id)),CH,get run(){return run;},get P(){return P;},get quests(){return quests;},garage,spawnRig,
    talk:who=>{const o=quests.offerOf(who);if(o)openDialog({who,q:o});}};
}
let autoInput=null;

/* ---------- the car ---------- */
function spawn(i,where){
  const prev=car;bi=i;
  const sim=settings.level==='sim'?{cg:true,cargo:0}:null;
  car=HD.makeCar(i,GW,sim);car.setAssists(settings.level);
  if(carT&&carT!==HD.truck(i))CR.release(carT);carT=HD.truck(i);
  if(prev&&prev.pt.st!=='off'){car.pt.st='run';car.pt.we=car.pt.e.idle*Math.PI*2/60;}
  const p=where||(prev?{x:prev.p[0],y:-prev.p[2],yaw:Math.atan2(-prev.M[6],prev.M[0])}:W.PLACES[0]);
  placeAt(p.x,p.y,p.yaw);
  sound.setCar(car);
  touch.configure({nos:!!car.pt.e.nosKw,manual:false,steer:settings.steer});
}
function placeAt(x,y,yaw){
  const o={y:0,n:[0,1,0],surf:''};W.groundAt(x,-y,o);
  car.place([x,o.y+.05,-y],yaw);
  for(const w of car.wheels){w.comp=0;w.ang=0;w.w=0;}
  const pt=car.pt;pt.gear=1;pt.shiftT=0;pt.engage=0;pt.locked=false;car.rev=false;pt.rev=false;car.drift.on=false;if(pt.st!=='off')pt.st='run';
  for(let i=0;i<120;i++)car.step(DT,IDLE);
  car.v.fill(0);car.w.fill(0);car.rev=false;car.pt.rev=false;car.revT=0;cam.cut=true;cam.yaw=null;cam.pos=null;flipT=0;R.resetTAA=true;if(flatsRun)flatsRun.restart();
}
function resetCar(){const M=car.M,yaw=Math.atan2(-M[6],M[0]);placeAt(car.p[0],-car.p[2],yaw);}

/* ---------- screens: the title, the garage, driving ---------- */
const $m=n=>'$'+Math.round(n).toLocaleString('en-US');
function orbitHere(garageView){const asp=innerWidth/Math.max(1,innerHeight),fov=.62,dist=garageView?8.6:7.8;
  cam.orbit={yaw:garageView?.8:2.4,pitch:garageView?.13:.1,dist,fov,y:garageView?-.35:(innerHeight<520?-.3:-.75),
    shift:garageView?-Math.tan(fov/2)*asp*dist*(innerWidth<760?.42:.36):0};}
function hideAll(){for(const id of ['menu','title','garage','dialog','result'])$(id).hidden=true;}
function toTitle(){
  state='title';hideAll();$('title').hidden=false;touch.show(false);run=null;ask=null;renderObj(true);
  orbitHere(false);renderModes();
  /* parked under the lamps downtown, the engine idling (heard once the page has had a tap or a key) */
  const p=W.PLACES[0];placeAt(p.x,p.y,p.yaw);car.pt.start();
}
let wipeArm=false;
function renderModes(){
  const pc=Profile.peek('career'),pf=Profile.peek('free'),cnt=d=>{const m=Object.values(d.medals||{}).filter(v=>v>=0).length,j=Object.values(d.quests||{}).filter(q=>q.done).length;return `${m} medal${m===1?'':'s'} · ${j} of ${QL.length} jobs`;};
  const el=$('modes');
  el.innerHTML=`<div class="mrow"><button class="mode career" data-m="career"><b>${pc?'Career':'New career'}</b>
      ${pc?`<em>${$m(pc.money)} · ${cnt(pc)}</em><span>Pick up where you left off.</span>`:`<span>A stock SUV and ${$m(2500)}. Win medals, do jobs for the town, buy parts and better cars.</span>`}</button>
    <button class="mode free" data-m="free"><b>Free play</b><span>Every car and every part in the garage. The money is just a score.</span>${pf?`<em>Score ${$m(pf.money)} · ${cnt(pf)}</em>`:''}</button></div>
    <div class="msmall">${LEVELS.map(([id,n])=>`<button class="${settings.level===id?'on':''}" data-l="${id}">${n}</button>`).join('')}
    ${['mobile','low'].map(q=>`<button class="${settings.quality===q?'on':''}" data-q="${q}">${q==='mobile'?'Graphics: Mobile':'Graphics: Low'}</button>`).join('')}</div>
    ${pc?`<button class="wipe" data-w="1">${wipeArm?'Tap again to erase the career for good':'Start the career over'}</button>`:''}`;
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{sound.wake();chooseMode(b.dataset.m);});
  el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{settings.level=b.dataset.l;save();car.setAssists(settings.level);renderModes();});
  el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{if(settings.quality===b.dataset.q)return;settings.quality=b.dataset.q;save();location.reload();});
  el.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{if(!wipeArm){wipeArm=true;renderModes();return;}wipeArm=false;Profile.wipe('career');renderModes();});
}
function chooseMode(mode){settings.mode=mode;save();P=new Profile(mode,HD);quests=new Quests(QL,P,CH);openGarage();}
function openGarage(){
  if(!P)return toTitle();
  state='garage';hideAll();touch.show(false);run=null;ask=null;renderObj(true);sound.duck(false);
  orbitHere(true);garage.open();
}
/* the garage puts a rig on the turntable downtown */
function spawnRig(c,rig){const i=HD.rigBuild(c,rig);if(i!==bi||!car)spawn(i,W.PLACES[0]);else{const p=W.PLACES[0];placeAt(p.x,p.y,p.yaw);}if(car.pt.st==='off')car.pt.start();}
async function startDriving(){
  hideAll();cam.orbit=null;cam.cut=true;
  const want=HD.rigBuild(P.current,P.rig());if(want!==bi)spawn(want,W.PLACES[0]);
  state='drive';touch.show(settings.touch==='on'||settings.touch==='auto'&&COARSE);
  if(car.pt.st==='off')car.pt.start();sound.start(car);
  hud.message(W.placeName(car.p[0],-car.p[2]),'#9fd8ff',2.2);
  /* a new career or free play: Marisol has a word before you go */
  if(!P.d.seen.intro){P.d.seen.intro=1;P.save();const o=quests.offerOf('marisol');if(o)openDialog({who:'marisol',q:o});}
}
/* ---------- challenges ---------- */
function startChal(c){
  if(!c||!P)return;hideAll();cam.orbit=null;ask=null;
  const L=c.lane||0,y=c.start.yaw,x0=c.start.x+Math.sin(y)*L,y0=c.start.y-Math.cos(y)*L;
  placeAt(x0,y0,y);run=new ChalRun(c);state='drive';touch.show(settings.touch==='on'||settings.touch==='auto'&&COARSE);
  hud.message(c.name.toUpperCase(),'#4fe3ff',2.6);sound.duck(false);
}
function chalMessages(){
  const mph=settings.units!=='kmh';
  for(const m of run.take()){
    if(m.t==='go')hud.message('GO','#5dff7a',1.1);
    else if(m.t==='lap')hud.message('LAP '+m.lap+'/'+run.c.laps,'#4fe3ff',1.6);
    else if(m.t==='jump'&&m.d>8)hud.message((m.best?'BEST ':'')+'AIR '+fmtVal({unit:'dist'},m.d,mph).toUpperCase(),m.best?'#5dff7a':'#ff4fa0',1.8);
    else if(m.t==='mileIn')hud.message('IN THE MILE · HOLD IT','#ffd23f',1.8);
    else if(m.t==='zoneOut')hud.message('BACK INSIDE THE RING','#ffb040',1.6);
    else if(m.t==='finish'||m.t==='fail')showResult();}
}
function showResult(){
  const r=run,c=r.c,mph=settings.units!=='kmh',res=r.value!=null?P.result(c,r.value,r.medal):{money:0,newBest:false};
  state='result';touch.show(false);const best=P.best(c.id);
  const head=r.failed?'<div class="rmedal" style="color:#ff6b7f">Out of time</div>':r.medal>=0?`<div class="rmedal" style="color:${MEDALS[r.medal][2]}">${MEDALS[r.medal][1]}</div>`:'<div class="rmedal" style="color:var(--dim)">No medal</div>';
  const meds=c.medals.map((v,i)=>`<span><b style="color:${MEDALS[i][2]}">${MEDALS[i][1]}</b> ${fmtVal(c,v,mph)}</span>`).join('');
  $('result').innerHTML=`<div class="dcard" style="--c:#4fe3ff"><div class="dtitle">${KINDS[c.kind]} · ${c.where}</div><div class="dwho"><b>${c.name}</b></div>${head}
    ${r.value!=null?`<div class="rval">${fmtVal(c,r.value,mph)}${res.newBest&&r.medal>=-1?' <span class="rsub">new best</span>':''}</div>`:''}
    <div class="rsub">${best!=null?'Your best: '+fmtVal(c,best,mph):''}</div><div class="rmeds">${meds}</div>
    ${res.money?`<p class="dreward">+${$m(res.money)}${P.free?' score':''}${res.upgraded?'':' (a repeat pays a tenth)'}</p>`:''}
    <div class="dbtns"><button class="yes" data-r="again">Again</button><button data-r="on">Drive on</button><button data-r="list">Challenges</button></div></div>`;
  $('result').hidden=false;
  $('result').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const a=b.dataset.r;if(a==='again')startChal(c);else{closeResult();if(a==='list')pause(true);}});
}
function closeResult(){$('result').hidden=true;run=null;car.rev=false;car.pt.rev=false;state='drive';touch.show(settings.touch==='on'||settings.touch==='auto'&&COARSE);}
/* ---------- the town's people ---------- */
function openDialog(o){
  const p=PEOPLE[o.who],q=o.q,cur=quests.active;
  state='talk';touch.show(false);
  $('dialog').innerHTML=`<div class="dcard" style="--c:${p.col}"><div class="dwho"><b>${p.name}</b><span>${p.role}</span></div><div class="dtitle">${q.title}</div>
    ${q.intro.map(l=>`<p>${l}</p>`).join('')}${q.tip?`<p class="rsub">${q.tip}</p>`:''}${q.reward&&q.reward.money?`<p class="rsub">Pays ${$m(q.reward.money)}${q.reward.car?' and opens a car at the dealer':''}.</p>`:''}
    ${cur&&cur.q.id!==q.id?`<p class="rsub">You're on "${cur.q.title}" for ${PEOPLE[cur.q.who].short}. Taking this one drops it.</p>`:''}
    <div class="dbtns"><button class="yes" data-d="1">Take the job</button><button data-d="0">Later</button></div></div>`;
  $('dialog').hidden=false;$('dialog').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.d==='1'));
  dialogFor=o;
}
let dialogFor=null;
function closeDialog(yes){
  $('dialog').hidden=true;
  if(dialogFor&&dialogFor.q){if(yes)quests.accept(dialogFor.q);else dismissed=dialogFor.who;}
  dialogFor=null;state='drive';touch.show(settings.touch==='on'||settings.touch==='auto'&&COARSE);
}
function jobDone(m){
  const q=m.q,o=q.outro||{},who=o.who===undefined?q.who:o.who,p=who?PEOPLE[who]:null,r=m.reward||{};
  state='talk';touch.show(false);dialogFor=null;
  $('dialog').innerHTML=`<div class="dcard" style="--c:${p?p.col:'#5dff7a'}">${p?`<div class="dwho"><b>${p.name}</b><span>${p.role}</span></div>`:''}<div class="dtitle">${q.title} · done</div>
    <p>${o.text||''}</p>${r.money?`<p class="dreward">+${$m(r.money)}${P.free?' score':''}</p>`:''}
    ${r.car&&!P.free?`<p class="dreward">The ${HD.CARS.find(c=>c[0]===r.car)[1]} is at the dealer now (Garage).</p>`:''}
    <div class="dbtns"><button class="yes" data-d="1">Good</button></div></div>`;
  $('dialog').hidden=false;$('dialog').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>closeDialog(false));
}
function questMessages(){
  for(const m of quests.take()){
    if(m.t==='accept')hud.message('NEW JOB','#5dff7a',1.6);
    else if(m.t==='step')hud.message('NEXT · '+(m.step.text||'').toUpperCase().slice(0,34),'#5dff7a',2.2);
    else if(m.t==='late')hud.message('TOO LATE · TRY AGAIN','#ff3d5a',2.6);
    else if(m.t==='done')jobDone(m);}
}
/* each frame while driving: the run, the jobs, a challenge start under the wheels, someone to talk to */
function gameUpdate(dt,ev){
  if(!P)return;
  if(run){run.update(dt,car,ev);chalMessages();}
  if(state!=='drive')return;
  quests.update(dt,car);questMessages();
  if(state!=='drive')return;
  const x=car.p[0],y=-car.p[2];
  ask=null;if(!run&&car.speed<6)for(const c of CH)if(Math.hypot(x-c.start.x,y-c.start.y)<13){ask=c;break;}
  if(dismissed&&Math.hypot(x-PEOPLE[dismissed].x,y-PEOPLE[dismissed].y)>16)dismissed=null;
  if(!run&&quests.near&&car.speed<2.5&&dismissed!==quests.near.who)openDialog(quests.near);
}
/* the line at the top: the job you're on, and a challenge to start where you've stopped */
function renderObj(force){
  const el=$('obj');let h='';
  if(P&&(state==='drive')&&!(run&&run.phase!=='done')){
    const j=quests&&quests.hud();
    if(j){const p=PEOPLE[quests.active.q.who];h+=`<div class="job" style="--c:${p.col}"><b>${j.who} · ${j.title}</b>${j.text}${j.left!=null?`<i>${Math.floor(j.left/60)}:${String(Math.floor(j.left%60)).padStart(2,'0')}</i>`:''}</div>`;}
    if(ask){const c=ask,m=P.medal(c.id),b=P.best(c.id),mph=settings.units!=='kmh';
      h+=`<div class="ask"><div><b>${c.name}</b><span>${KINDS[c.kind]} · gold ${fmtVal(c,c.medals[0],mph)}${m>=0?' · you have '+MEDALS[m][1].toLowerCase():''}${b!=null?' · best '+fmtVal(c,b,mph):''}</span></div><button data-go="${c.id}">Start</button></div>`;}}
  if(h!==objKey||force){objKey=h;el.innerHTML=h;const b=el.querySelector('[data-go]');if(b)b.onclick=()=>startChal(CH.find(c=>c.id===b.dataset.go));}
}
function pause(on){
  if(on&&state==='drive'){state='pause';menu.open(car);touch.show(false);sound.duck(true);renderObj(true);}
  else if(!on&&state==='pause'){state='drive';menu.close();touch.show(settings.touch==='on'||settings.touch==='auto'&&COARSE);sound.duck(false);}
}

/* ---------- the camera stays out of buildings and above the ground ---------- */
const cg={y:0,n:[0,1,0],surf:''};
function camCollide(p,pivot){
  W.groundAt(p[0],p[2],cg);let q=p.slice();if(q[1]<cg.y+.45)q[1]=cg.y+.45;
  for(const c of W.colliders.near(q[0],q[2])){if(c.t==='c'||q[1]>c.top+.3)continue;
    if(q[0]>c.x0-.4&&q[0]<c.x1+.4&&q[2]>c.z0-.4&&q[2]<c.z1+.4){
      /* slide toward the car until it's out */
      for(let k=1;k<=12;k++){const t=k/12,r=[q[0]+(pivot[0]-q[0])*t,q[1]+(pivot[1]-q[1])*t,q[2]+(pivot[2]-q[2])*t];if(!(r[0]>c.x0-.4&&r[0]<c.x1+.4&&r[2]>c.z0-.4&&r[2]<c.z1+.4)){q=r;break;}}}}
  return q;
}

/* ---------- one frame ---------- */
function fit(){const dpr=Math.min(R.Q.dpr||2,devicePixelRatio||1),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;hudC.width=w;hudC.height=h;}
  R.resize(w,h,R.iw?R.scale:(settings.scale==='auto'?drs.scale:+settings.scale));}
function step(dt){
  const inp=input.poll(dt);
  let drive=IDLE;
  if(state==='drive'){
    if(inp.pause)pause(true);
    if(inp.cam){cam.next();if(CAM_MODES[cam.mode]==='tv')cam.next();settings.cam=CAM_MODES[cam.mode];save();}
    if(inp.reset){resetCar();hud.message('RESET','#ffffff',1);}
    if(inp.high){highBeam=!highBeam;}
    if(inp.up)car.pt.shift(1);if(inp.down)car.pt.shift(-1);
    if(inp.perf){settings.perf=!settings.perf;save();}
    drive=inp;
    if(autoInput)drive=Object.assign({},drive,autoInput(car,time));
    /* brake and gas together at a standstill: line lock for a burnout (a race box launches off its trans-brake) */
    if(!car.pt.e.launch&&drive.brk>.5&&drive.thr>.3&&car.speed<3&&!car.rev&&car.pt.running)drive=Object.assign({},drive,{brk:0,lock:true});
    /* the countdown: held on the handbrake, the engine free to rev */
    if(run&&run.phase==='count')drive={steer:0,thr:0,brk:0,hb:1,nos:false};
  }else if(state==='result'||state==='talk'){drive=car.speed>2.5?{steer:0,thr:0,brk:.45,hb:0,nos:false}:IDLE;}
  else if(state==='title'||state==='garage'){drive=IDLE;}
  else if(state==='pause'){return {ev:{}};}
  acc+=dt;let n=0;
  while(acc>=DT&&n<12){car.step(DT,drive);acc-=DT;n++;time+=DT;}
  if(acc>DT)acc=0;
  /* rolled: Kids puts it back by itself; otherwise say how */
  if(car.M[4]<.3&&car.speed<1.5){flipT+=dt;if(settings.level==='kids'&&flipT>1.2){resetCar();hud.message('BACK ON ITS WHEELS','#5dff7a',1.6);}
    else if(flipT>2&&flipT-dt<=2)hud.message(touch.visible?'ROLLED IT · TAP RESET':'ROLLED IT · PRESS R','#ffb040',3);}else flipT=0;
  const ev=car.takeEvents();
  if(state==='drive'){flatsUpdate(dt);gameUpdate(dt,ev);}
  return {ev};
}
function flatsUpdate(dt){const mph=settings.units==='mph';flatsRun.update(dt,time,flatsProxy(),mph);
  const sp=v=>(v*(mph?2.23694:3.6)).toFixed(1)+(mph?' MPH':' KM/H'),far=d=>mph?Math.round(d*3.28084)+' FT':Math.round(d)+' M';
  for(const m of flatsRun.takeMessages()){
    if(m.t==='jump')hud.message((m.best?'BEST JUMP  ':'AIR ')+m.air.toFixed(1)+' S  '+far(m.dist),m.best?'#5dff7a':'#ff4fa0',2.2);
    else if(m.t==='top')hud.message('NEW TOP SPEED  '+sp(m.v),'#5dff7a',2.6);
    else if(m.t==='flying')hud.message('FLYING '+(m.unit==='mile'?'MILE':'KM')+'  '+sp(m.v),'#5dff7a',2.6);}}
/* what Shiftlight's flats records read from a car */
function flatsProxy(){return {p:car.p,v:car.v,vf:car.vf,speed:car.speed,air:car.air,wheels:car.wheels.map(w=>({contact:w.contact})),q:car.q};}

/* what the tyres throw up: dust off the dirt, gravel, sand and salt, smoke off tarmac when they spin, clods out of the mud */
const LOOSE={dirt:1,trail:1,gravel:.8,sand:1.3,salt:.7,rock:.3};
function effects(dt){
  if(state!=='drive')return;
  const M=car.M,F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],sp=car.speed,max=settings.quality==='mobile'?.6:1;
  car.wheels.forEach((w,i)=>{if(!w.contact)return;const loose=LOOSE[w.surf]||0,slip=w.slipV||0;
    if(loose>0&&(sp>3||slip>2))PS.emit('d'+i,max*loose*(Math.min(sp,40)*.9+slip*3)*(w.front?.5:1),dt,()=>{const r=()=>Math.random()-.5,p=[w.cp[0]-F[0]*.3+U[0]*.1,w.cp[1]+.15,w.cp[2]-F[2]*.3+U[2]*.1];
      PS.spawn(3,p,[car.v[0]*.25+r()*1.5,.5+Math.random()*1.2,car.v[2]*.25+r()*1.5],1.6+Math.random()*1.8,.4,2.4+sp*.04,.16*loose);});
    if(w.surf==='mud'&&(sp>2||slip>2))PS.emit('m'+i,max*(sp*1.2+slip*4),dt,()=>{const r=()=>Math.random()-.5,p=[w.cp[0],w.cp[1]+.2,w.cp[2]];
      PS.spawn(4,p,[car.v[0]*.4-F[0]*slip*.4+r()*2,1.5+Math.random()*2.5,car.v[2]*.4-F[2]*slip*.4+r()*2],.7+Math.random()*.5,.08,.22,.9);});
    if((w.surf==='asphalt'||w.surf==='concrete')&&slip>3.5)PS.emit('s'+i,max*(slip-3.5)*w.Fz/2500*5,dt,()=>{const p=[w.cp[0]+U[0]*.15,w.cp[1]+.15,w.cp[2]+U[2]*.15];
      PS.spawn(1,p,[car.v[0]*.3+(Math.random()-.5),.4+Math.random()*.5,car.v[2]*.3+(Math.random()-.5)],1.8+Math.random()*1.6,.35,3.2,.22);});});
}
/* the car as the renderer and the camera want it */
function hdView(){
  const d=carDraw(car,carT),b=car.build,night=1;
  return Object.assign(d,{key:'you',T:carT,build:b,self:true,lamp:lightsOn?1:0,brake:car.brkIn>.05?1:0,rev:car.rev?1:0,ind:[0,0],dirt:b.dirt||0,
    glow:b.glow||[0,0,0],metal:b.metal??.55,emK:3});
}
function carLights(){
  const M=qmat(car.q),F=mcol(M,0),U=mcol(M,1),Rt=mcol(M,2),D=carT.D,cgx=car.cg[0],cgy=car.cg[1];
  const at=(x,y,z)=>add(car.p,mvec(M,[x-cgx,y-cgy,z]));
  const hu=.1,hx=D.X(hu),hy=Math.max(.42,(D.belt(hu)+D.sill(hu))/2+.05),hz=D.plan(hu)*.7;
  const tu=D.L-.05,tx=D.X(tu),ty=Math.max(.5,D.belt(tu)-.12),tz=D.plan(tu)*.7;
  const dyn=[],brake=car.brkIn>.05;
  for(const z of [-tz,tz])dyn.push({pos:at(tx-.05,ty,z),r:brake?11:6,col:brake?[5,.12,.06]:[.9,.02,.01],type:1,dir:norm(madd(F.map(v=>-v),U,-.35)),cosO:Math.cos(1.3)});
  if(car.rev)for(const z of [-tz*.5,tz*.5])dyn.push({pos:at(tx-.05,ty-.05,z),r:9,col:[3,2.9,2.7],type:1,dir:norm(madd(F.map(v=>-v),U,-.3)),cosO:Math.cos(1.2)});
  const g=car.build.glow;if(g&&car.build.underglow)dyn.push({pos:at(0,.12,0),r:7,col:g.map(v=>v*5),type:0,dir:[0,-1,0],cosO:-1});
  /* the garage's lamps: a warm key light up front, a cool one behind the other side, one overhead */
  if(state==='garage'||state==='title'){const P0=car.p,W3=(f,r,u)=>[P0[0]+F[0]*f+Rt[0]*r,P0[1]+u,P0[2]+F[2]*f+Rt[2]*r];
    dyn.push({pos:W3(4.2,-3.2,3.2),r:13,col:[16,14,11.5],type:0,dir:[0,-1,0],cosO:-1},{pos:W3(-3.5,3.6,2.6),r:12,col:[5,7.5,12],type:0,dir:[0,-1,0],cosO:-1},{pos:W3(.3,0,4.6),r:9,col:[6,6,6.4],type:0,dir:[0,-1,0],cosO:-1});}
  return {dyn,headlights:lightsOn?{on:1,high:highBeam?1:0,posL:at(hx+.05,hy,-hz),posR:at(hx+.05,hy,hz),dir:norm(madd(F,U,-.035)),right:Rt,up:U,col:[1050,1090,1140],range:95}:null};
}
const FLICK=t=>[1,.9+.1*Math.sin(t*37),Math.random()<.04?.15:1,(Math.sin(t*3.1)>.96)?.25:1,.88+.12*Math.sin(t*61),.6+.4*Math.sin(t*1.3),Math.sin(t*5.6)>0?1:0,1,1,1,1,1,1,1,1,1];
function render(dt,ev){
  const proxy={p:car.p,q:car.q,v:car.v,c:{hcg:car.cg[1]},accB:car.accB};
  if((state==='title'||state==='garage')&&cam.orbit)cam.orbit.yaw+=dt*(state==='title'?.12:.045);
  const c=cam.update(dt,proxy,{look:false,impact:Math.max(ev.wall||0,ev.land||0)*.2});c.far=2600;
  camLast=c;
  const L=carLights(),M=qmat(car.q),F=mcol(M,0),fw=norm([F[0],0,F[2]]);
  flatsView.update(c.pos);effects(dt);PS.update(dt,c.pos);
  if(P&&state!=='title'){const live=run&&run.phase!=='done'?run:null;
    marks.update({starts:live?[]:CH.map(q=>({x:q.start.x,y:q.start.y,gold:P.medal(q.id)===0})),people:quests?quests.beacons():[],run:live?{c:live.c,gi:live.gi,lap:live.lap}:null});}
  else marks.update({starts:[],people:[],run:null});
  renderObj();
  const you=hdView();
  const D=carT.D;
  R.render({time,dt,cam:c,cut:c.cut,env:FULL_MOON,flicker:FLICK(time),probePos:add(car.p,[0,.4,0]),dyn:L.dyn,headlights:L.headlights,
    occ:[[car.p[0],car.p[1],car.p[2],car.cg[1],fw[0],fw[2],D.L/2,car.build.look.track/2+.15]],cars:[],hdcars:[you],shutter:.5,lensRain:0,led:null,debug:Q.get('debug')});
  CR.commit();
  const hs=state==='drive'?hudState():null;
  hudLayout();hud.draw(hs,dt);
  if(settings.perf&&state==='drive')perf();else $('perf').hidden=true;
  sound.update(car,c,state,dt);
}
function hudState(){
  const pt=car.pt,e=pt.e,g=Math.max(1,pt.gear),mph=settings.units==='mph',k=mph?2.23694:3.6,x=car.p[0],y=-car.p[2];
  const S={rpm:pt.rpm,limiter:e.limiterRpm,shiftRpm:(pt.upRpm&&pt.upRpm[g-1])||e.shiftRpm,speed:car.vf,units:mph?'MPH':'KM/H',
    gear:pt.gear,rev:car.rev,auto:pt.auto,shiftLamp:pt.rpm>((pt.upRpm&&pt.upRpm[g-1])||e.shiftRpm)*.985,
    boost:pt.boost*(e.fiBoost||0),boostMax:e.turbo||e.sup?e.fiBoost:0,nos:pt.nos,nosMax:e.nosKw?1:0,nosOn:pt.nosOn,
    levelName:P?(P.free?'SCORE ':'')+$m(P.money):'CITY LIMITS',laps:false,place:W.placeName(x,y),mapHead:Math.atan2(-F0(car)[2],F0(car)[0]),
    assistName:LEVELS.find(l=>l[0]===settings.level)[1].toUpperCase()+' · AUTO',
    tc:pt.tcOn||car.etcOn,abs:car.absOn,esc:car.escOn,drift:car.drift.on,guide:0,mapCar:[x,y],mapDots:mapDots(),
    hint:time<8?(touch.visible?'II FOR THE MENU · CAM CAMERA · RESET BACK ON THE ROAD':'ESC MENU · C CAMERA · H HIGH BEAM · R RESET'):null};
  if(!inTown(x,y)){const d=Math.hypot(x,y),dirs=['EAST','NORTHEAST','NORTH','NORTHWEST','WEST','SOUTHWEST','SOUTH','SOUTHEAST'],kk=((Math.round(Math.atan2(-y,-x)/(Math.PI/4))%8)+8)%8;
    S.placeSub='TOWN '+(mph?(d/1609.344).toFixed(1)+' MI':(d/1000).toFixed(1)+' KM')+' '+dirs[kk];}
  if(run)chalHud(S,mph);
  arrowHud(S,x,y,mph);
  if(Math.hypot(x,y)>TR.R1&&!run){const u=v=>v*k,R2=flatsRun.rec;
    S.flats={top:u(flatsRun.top),topBest:u(R2.top),fly:u(flatsRun.flying),flyBest:u(mph?R2.mile:R2.km),flyName:mph?'FLYING MILE':'FLYING KM',jump:mph?R2.jump*3.28084:R2.jump,jumpUnit:mph?'FT':'M',air:R2.air};}
  return S;
}
const F0=c=>[c.M[0],c.M[3],c.M[6]];
/* the run on the HUD: the clock (or the speed, the flight, the points), where you are in it, the medals */
const fmtT=t=>{const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);};
function chalHud(S,mph){
  const r=run,c=r.c,X={kind:(KINDS[c.kind]+' · '+c.where).toUpperCase()},sp=v=>(v*(mph?2.23694:3.6)).toFixed(1);
  S.levelName=c.name.toUpperCase();
  if(c.unit==='time'){X.big=fmtT(r.phase==='done'&&r.value?r.value:r.t);
    X.sub=c.kind==='lap'?'LAP '+r.lap+'/'+c.laps+' · GATE '+Math.min(r.gi+1,c.gates.length)+'/'+c.gates.length:'GATE '+Math.min(r.gi+1,c.gates.length)+'/'+c.gates.length;}
  else if(c.kind==='trap'){X.big=sp(r.phase==='done'&&r.value?r.value:car.speed);X.sub=(mph?'MPH':'KM/H')+' · TRAP IN '+fmtVal({unit:'dist'},r.distNext(car),mph).toUpperCase();}
  else if(c.kind==='mile'){const inM=r.mileT0!=null;X.big=sp(r.phase==='done'&&r.value?r.value:inM?(r.t>r.mileT0+.2?Math.min(car.speed,(1609.344-r.distNext(car))/(r.t-r.mileT0)):car.speed):car.speed);
    X.sub=inM?'IN THE MILE · AVERAGE':(mph?'MPH':'KM/H')+' · MILE IN '+fmtVal({unit:'dist'},r.distNext(car),mph).toUpperCase();X.bigCol=inM?'#ffd23f':null;}
  else if(c.kind==='jump'){X.big=fmtVal(c,r.bestJump||0,mph).toUpperCase().replace(' ','');X.sub='BEST FLIGHT · FINISH IN '+fmtVal({unit:'dist'},r.distNext(car),mph).toUpperCase();}
  else if(c.kind==='drift'){const d=r.drift.hud();X.big=String(d.driftTotal);X.sub='POINTS · '+Math.max(0,Math.ceil(c.time-r.t))+' S LEFT'+(r.inZone?'':' · OUTSIDE');
    X.chain=d.driftChain;X.mult=d.driftMult;X.gap=d.driftGap;X.near=d.driftNear;}
  const cur=c.unit==='time'?null:c.kind==='drift'?r.drift.total:c.kind==='jump'?r.bestJump:r.value;
  X.meds=c.medals.map((v,i)=>[MEDALS[i][1].toUpperCase(),fmtVal(c,v,mph).toUpperCase(),MEDALS[i][2],cur!=null&&(c.better==='high'?cur>=v:false)]);
  S.chal=X;S.lights=r.lights;S.go=r.phase==='run'&&r.t<1.2;S.place=null;
}
/* the arrow: to the next gate in a run, else to wherever the job wants you */
function arrowHud(S,x,y,mph){
  let tg=null,col='#5dff7a',label='';
  if(run&&run.phase==='run'&&run.next&&c_needsArrow(run.c)){const g=run.next;tg={x:g.x,y:g.y};col='#ff4fa0';}
  else if(!run&&quests&&quests.active){const t=quests.target();if(t){tg=t;const d=Math.hypot(t.x-x,t.y-y);if(d<14)tg=null;else label=(t.name?t.name.toUpperCase()+' · ':'')+(mph?(d>800?(d/1609.344).toFixed(1)+' MI':Math.round(d*3.28084/10)*10+' FT'):(d>1000?(d/1000).toFixed(1)+' KM':Math.round(d/10)*10+' M'));}}
  if(!tg||!camLast)return;
  const f=camLast.fwd,head=Math.atan2(-f[2],f[0]),b=Math.atan2(tg.y-y,tg.x-x);let a=head-b;a=Math.atan2(Math.sin(a),Math.cos(a));
  S.arrow={a,col,label};
}
const c_needsArrow=c=>c.kind!=='drag'&&c.kind!=='trap';
let dotsKey='',dotsCache=null;
function mapDots(){if(!P)return null;const k=run?'run':JSON.stringify(quests?quests.beacons():[]);if(k===dotsKey)return dotsCache;dotsKey=k;
  dotsCache=run?(run.c.gates||[]).map(g=>[g.x,g.y]):[...CH.map(c=>[c.start.x,c.start.y]),...(quests?quests.beacons():[]).map(b=>[b.x,b.y])];return dotsCache;}
/* where the HUD can draw: the notch and the touch buttons (Shiftlight's touchUI) */
let layoutKey='';
function hudLayout(){
  const on=touch.visible,lk=[on,state,canvas.width,canvas.height,innerWidth,innerHeight].join();if(lk===layoutKey)return;layoutKey=lk;
  document.documentElement.classList.toggle('touch',on||COARSE);
  const dpr=canvas.width/Math.max(1,innerWidth),cs=getComputedStyle($('safe')),px=v=>(parseFloat(v)||0)*dpr;
  const ins={l:px(cs.paddingLeft),r:px(cs.paddingRight),t:px(cs.paddingTop),b:px(cs.paddingBottom)};
  const cb=on?touch.el.cam.getBoundingClientRect():null;
  Object.assign(hud,{touch:on,ui:Math.max(1,Math.min(1.45,.46/Math.min(innerWidth/1920,innerHeight/1080))),ins,mapRight:cb&&cb.width?(cb.left-18)*dpr:0,replayBar:0});
}
function perf(){const el=$('perf');el.hidden=false;const st=W.stats;
  el.textContent=`${(1000/frameMs).toFixed(0)} fps  ${frameMs.toFixed(1)} ms\nscale ${R.scale.toFixed(2)}  ${R.iw}x${R.ih} of ${R.W}x${R.H}\nworld tiles ${R.drawn}  car tris ${CR.tris|0}\n${R.gpuName}\nquality ${settings.quality}  ${car.build.id}`;}
let hold=false;
function frame(now,manualDt){
  if(manualDt===undefined){requestAnimationFrame(frame);if(hold)return;}
  else{lastT=0;}
  const dt=manualDt!==undefined?manualDt:Math.min(.05,Math.max(.001,(now-(lastT||now))/1000));if(manualDt===undefined)lastT=now;frameMs=frameMs*.9+dt*1000*.1;
  if(state==='boot')return;
  const {ev}=step(dt);
  if(drs.enabled&&state==='drive'){const s0=drs.scale;drs.update(dt*1000,R.gpuMs);if(Math.abs(drs.scale-s0)>.001)R.resize(R.W,R.H,drs.scale);}
  render(dt,ev);
}
boot().catch(e=>{console.error(e);say('Could not start: '+e.message);});
