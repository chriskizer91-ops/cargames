/* =====================================================================================
   THE MODEL BAY, in the garage: Dirt Sleeper Mini's bay brought into the game. The car stands where it was
   parked while the game is paused, turning in front of you or held at a view, and the dock under the car
   lets you look it over (hood up with the engine bay built and drawn, lights, wheels turned, paint, mud)
   and listen to its engine: start it, rev it on the pad or drive it up through its gears in the Digital
   Engine lab's own sim, heard from behind, inside or trackside, in the open, a garage or a tunnel. The
   engine you leave running is running when you drive off, and the one you switch off is off.
   The bay's sim is the lab's (15_digital_engine's SIM), fed the car's own engine spec, so what you hear
   here is the model bay's sound exactly; the car's physics waits, untouched, for the drive.
   ===================================================================================== */
/* how far the hood swings open (rad) */
const HOOD_OPEN=1.0;
/* the views: id, name, where round the car (deg; 0 is in front of it), how high (deg), how near (times the orbit's distance), where to look (m above the car's centre) */
const BAY_VIEWS=[['front34','Front ¾',-38,8,1,.1],['side','Side',90,2.5,.98,.1],['rear34','Rear ¾',142,9,1,.1],['front','Front',0,4,.88,.1],['rear','Rear',180,5,.88,.1],
  ['top','Top',-35,58,1.1,-.2],['low','Low',-24,1.5,.78,-.15],['bay','Bay',-36,46,.6,0]];
const BAY={active:false,sim:null,spec:null,mode:'free',tab:'look',view:'front34',spin:true,hood:false,hoodA:0,steer:false,room:'open',
  th:-.66,ph:.14,phT:.14,dk:1,dkT:1,tyT:.1,at:null,pad:0,padOn:false,brkBtn:false,nos:false,blipT:0,status:'',drag:null};
try{const s=JSON.parse(store.get('rut-bay','{}'))||{};for(const k of ['tab','view','spin','steer','mode'])if(s[k]!==undefined)BAY[k]=s[k];if(['open','garage','tunnel'].includes(s.room))BAY.room=s.room;}catch(e){}
if(BAY.view&&!BAY_VIEWS.some(v=>v[0]===BAY.view))BAY.view='front34';
const baySave=()=>store.set('rut-bay',JSON.stringify({tab:BAY.tab,view:BAY.view,spin:BAY.spin,steer:BAY.steer,mode:BAY.mode,room:BAY.room}));
const BAY_BTNS=[{id:'brake',l:'Brake',key:'S',t:'hold',drive:1,tone:'red'},{id:'down',l:'Shift down',key:'Q',t:'tap',drive:1},{id:'up',l:'Shift up',key:'E',t:'tap',drive:1},
  {id:'nos',l:'Nitrous',key:'N',t:'hold',tone:'cyan',need:e=>e.nosKw},{id:'purge',l:'Purge',key:'B',t:'tap',need:e=>e.nosKw},{id:'blip',l:'Blip',key:'G',t:'tap'}];
/* ---------- the bay's engine: the lab's sim on the car's own spec, kept across a change of parts (a rebuilt car brings a new spec; the sim takes it and keeps running) ---------- */
function baySim(){const t=GAME.car,spec=t.spec;if(BAY.sim&&BAY.spec===spec)return BAY.sim;BAY.spec=spec;
  if(BAY.sim)BAY.sim.setSpec(spec);else{BAY.sim=SIM.makeSim(spec);BAY.sim.mode=BAY.mode;}return BAY.sim;}
const bayOn=()=>!!BAY.sim&&BAY.sim.running;
/* into the bay: the game's engine, running or not, is what you hear; out of it: the bay's engine is what you drive off with */
function baySync(){if(APP.orbit)bayEnter();else bayLeave();}
function bayEnter(){
  if(BAY.active)return;BAY.active=true;const t=GAME.car,pt=t.pt,sim=baySim(),v=GAME.voice;
  if(pt.running&&!sim.running&&sim.st!=='crank'){sim.st='run';sim.we=Math.max(t.spec.idle*TAU/60,pt.we||0);sim.rpm=sim.we*60/TAU;}
  else if(!pt.running&&pt.st!=='crank'&&sim.st!=='off'){sim.st='off';sim.we=0;sim.rpm=0;}
  if(sim.mode!==BAY.mode)baySetMode(BAY.mode);
  v.live=true;v.roll=v.rollV=v.pitch=v.pitchV=0;v.shake=[0,0];
  BAY.at=null;BAY.status='';{const sp=BAY.spin;if(BAY.view)bayView(BAY.view,true);else BAY.th=CAM.orbitA;BAY.spin=sp;}
  if(ENG.room!==BAY.room)setRoomKind(BAY.room);
  /* a key is a pedal here: nothing in the menu should have the keyboard's focus */
  if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();
  $('bayDrag').hidden=false;baySyncDock();
}
function bayLeave(){
  if(!BAY.active)return;BAY.active=false;const t=GAME.car,pt=t.pt,sim=BAY.sim,v=GAME.voice;
  if(sim){if(sim.running&&!pt.running&&pt.st!=='crank'){pt.st='run';pt.we=Math.max(pt.e.idle*TAU/60,sim.we);}
    else if(!sim.running&&sim.st!=='crank'&&pt.st!=='off')pt.stop();}
  t.steer=0;v.live=false;v.roll=v.pitch=0;v.shake=[0,0];
  BAY.hood=false;BAY.pad=0;BAY.padOn=false;BAY.brkBtn=false;BAY.nos=false;BAY.blipT=0;BAY.drag=null;
  for(const d of BAY_BTNS)if(d.el)d.el.classList.remove('on');
  /* the drive is heard in the open; the bay keeps its own room for next time */
  if(ENG.room!=='open')setRoomKind('open');
  GAME.pRpm=undefined;$('bayDrag').hidden=true;
}
/* ---------- every frame (from the loop, paused or not): the hood swings; in the bay the sim runs and the car answers it ---------- */
function bayTick(dt){
  const ht=BAY.active&&BAY.hood?1:0;if(BAY.hoodA!==ht)BAY.hoodA=ht>BAY.hoodA?Math.min(1,BAY.hoodA+dt*1.8):Math.max(0,BAY.hoodA-dt*1.8);
  if(!BAY.active)return;
  const t=GAME.car,sim=baySim(),v=GAME.voice,inp=bayInput(dt);
  for(let k=0;k<4;k++)sim.step(dt/4,inp);
  const ev=sim.takeEvents();if(v.port)for(const e of ev)v.port.post({t:'ev',ev:e});
  if(sim.stalled){sim.stalled=false;BAY.status='It stalled. Start it again with the button or I.';baySyncDock();}
  bayBody(v,sim,dt);
  t.steer=BAY.steer?.36:0;
  /* in Drive the wheels turn with the sim's road speed (a look only: the physics is paused) */
  if(sim.mode==='drive'&&sim.ww)for(const w of t.wheels)w.ang+=sim.ww*dt*sim.e.R/w.R;
  bayLive();
}
/* the car answers: torque rocks the body on its springs, acceleration squats it (the model bay's bodyFrame) */
function bayBody(v,sim,dt){
  const e=sim.e,run=sim.running,Te=run?Math.max(-e.tq*.3,SIM.engTq(e,Math.max(sim.rpm,1),sim.thr,sim.boost)):0;
  const rollT=-.02*Te/e.peak.tq,pitchT=sim.mode==='drive'?clamp(sim.aPrev/9.81,-1,1)*.014:0;
  v.rollV+=(-(v.roll-rollT)*80-v.rollV*6.5)*dt;v.roll+=v.rollV*dt;
  v.pitchV+=(-(v.pitch-pitchT)*60-v.pitchV*7)*dt;v.pitch+=v.pitchV*dt;
  const idle=run?1-clamp((sim.rpm-e.idle)/(e.idle*1.5),0,1):0,lope=[0,.012,.032,.065][e.cam|0]||0,amp=run?(.0004+lope*.03*idle+.0003*sim.load):0;
  v.shake=[(Math.random()-.5)*amp,(Math.random()-.5)*amp*1.6];
}
/* what the synth hears from the bay: the lab's own params, from wherever the listener buttons say */
function bayVoice(){const v=GAME.voice,sim=BAY.sim;if(!sim||!v.port)return;v.port.post({t:'p',p:sim.params(ENG.listener,1)});}
/* ---------- hands and feet: the pad, the buttons and the keys (the lab's car controls) ---------- */
function bayInput(dt){
  let thr=keyOn('thr')||INPUT.down.has('Space')?1:0;
  for(let d=1;d<=9;d++)if(INPUT.down.has('Digit'+d))thr=Math.max(thr,d/10);
  if(BAY.padOn)thr=Math.max(thr,BAY.pad);
  if(BAY.blipT>0){BAY.blipT-=dt;thr=1;}
  return {thr,brk:keyOn('brk')||BAY.brkBtn?1:0,nos:keyOn('nos')||BAY.nos};
}
/* the keys that are taps, from the game's own poll (60_game's step hands them here while the game is paused) */
function bayKeys(inp){
  if(!BAY.active||!BAY.sim)return;const sim=BAY.sim;
  if(inp.ign)bayToggleEngine();if(inp.up)sim.shift(1);if(inp.down)sim.shift(-1);if(inp.purge)bayPurge();if(inp.blip)BAY.blipT=.22;
  if(inp.listen){setListener((ENG.listener+1)%3);baySyncDock();}
  if(inp.lights){APP.lights=!APP.lights;baySyncDock();}
}
function bayHold(d,v){if(d.el)d.el.classList.toggle('on',v);if(d.id==='brake')BAY.brkBtn=v;else if(d.id==='nos')BAY.nos=v;}
function bayPress(d){if(d.el&&d.el.disabled)return;const sim=baySim();({up:()=>sim.shift(1),down:()=>sim.shift(-1),purge:bayPurge,blip:()=>{BAY.blipT=.22;}})[d.id]();}
function bayPurge(){const v=GAME.voice;if(v.port&&BAY.sim&&BAY.sim.e.nosKw)v.port.post({t:'ev',ev:{type:'purge'}});}
/* ---------- the engine: start, stop, free rev or drive ---------- */
async function bayStart(){
  if(GAME.busy)return;const sim=baySim();GAME.busy=true;sim.start();BAY.status='';
  try{await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();voiceNode(GAME.voice);if(ENG.room!==BAY.room)setRoomKind(BAY.room);}
  catch(e){ENG.status='Sound could not start: '+e.message;}
  GAME.busy=false;bayLive(true);baySyncDock();
}
function bayToggleEngine(){const sim=baySim();if(!sim.running&&sim.st!=='crank')bayStart();else{sim.stop();bayLive(true);}}
function baySetMode(m,save){const sim=baySim();BAY.mode=m;sim.mode=m;sim.gear=0;sim.clutch='open';sim.shiftT=0;sim.held=false;if(m==='free'){sim.v=0;sim.ww=0;sim.pos=0;}else sim.pos=-120;if(save)baySave();}
/* ---------- the look: a view, the spin, a drag ---------- */
function bayView(id,now){const v=BAY_VIEWS.find(q=>q[0]===id);if(!v)return;BAY.view=id;BAY.spin=false;BAY.th=v[2]*PI/180;BAY.phT=v[3]*PI/180;BAY.dkT=v[4];BAY.tyT=v[5];
  if(id==='bay')BAY.hood=true;
  if(now){CAM.orbitA=BAY.th;BAY.ph=BAY.phT;BAY.dk=BAY.dkT;}baySave();baySyncDock();}
/* ---------- the dock ---------- */
function baySetTab(v){BAY.tab=v;for(const el of document.querySelectorAll('#bay [data-bp]'))el.hidden=el.dataset.bp!==v;
  for(const x of $('bTabs').children)x.setAttribute('aria-pressed',String(x.dataset.v===v));baySave();baySyncDock();}
const BAY_TRANS={auto6:'a six-speed automatic',race4:'a race four-speed with a trans-brake',seq6:'a six-speed sequential',auto4:'a four-speed automatic',auto5:'a five-speed automatic',man6:'a six-speed manual',man4:'a four-speed manual',man5:'a five-speed manual',rally5:'a five-speed dog box'};
/* a custom build has no written recipe: one is read off its parts */
function bayDescribe(e,r){
  const base=DE_ENGINES[r.engine]||{},lay={V8:'V8',V6:'V6',I6:'straight six',I5:'inline five',I4:'inline four',V8F:'flat-plane V8'}[base.layout]||base.layout||'engine';
  const bits=[];
  if(r.power==='roots')bits.push('a Roots blower');else if(r.power==='twin')bits.push('twin turbos');else if(r.power==='bigturbo')bits.push('bigger turbos');else if(base.fi==='turbo')bits.push('its turbo');else if(base.fi==='twin')bits.push('its twin turbos');
  bits.push(['the stock airbox','a cold-air intake','ram air'][r.intake|0]);
  bits.push({stock:'the stock exhaust',catback:'a cat-back exhaust',headers:'long-tube headers',straight:'straight pipes',side:'side pipes',stacks:'stacks'}[r.exhaust]||'the stock exhaust');
  if(r.cam)bits.push(['','a mild cam','a hot cam','a race cam'][r.cam]);
  if(r.tune)bits.push(['','a street tune','a race tune'][r.tune]);
  if(e.nosKw)bits.push('a '+Math.round(e.nosKw*1.341/5)*5+'-hp shot of nitrous');
  const disp=(r.disp||base.disp||0).toFixed(1);
  return 'A '+disp+' '+lay+' with '+bits.slice(0,-1).join(', ')+(bits.length>1?' and ':'')+bits[bits.length-1]+'; '+(BAY_TRANS[r.trans]||'its gearbox')+(r.axle?', '+r.axle+' gears':'')+'.';
}
function bayInfo(){
  const t=GAME.car,b=t.build,e=t.spec,r=ENGINE_OF[b.id]||ENGINE_OF.stock;
  if(BAY.tab==='engine'){const d=r.desc||bayDescribe(e,r),pk=e.peak||{hp:0,rpm:0,tq:0};
    return '<b>'+carName(b)+' '+b.name+' engine.</b> '+d+' <b>'+fmt(Math.round(pk.hp))+' hp</b> at '+fmt(Math.round(pk.rpm/50)*50)+' rpm · <b>'+fmt(Math.round(pk.tq*.7376))+' lb-ft</b> · redline '+fmt(e.redline)+'. <span class="st">'+(BAY.status||ENG.status||'Sound starts when you start the engine. In Drive, Space and the pad are the gas; in Free rev the engine is out of gear.')+'</span>';}
  return '<b>'+carName(b)+' · '+b.name+'.</b> '+(b.blurb||'')+' '+(b.specs||[]).map(s=>'<b>'+s[0]+'</b> '+s[1]).join(' · ')+' <span class="st">Drag the picture to turn the car. The parts below change it where it stands.</span>';
}
function baySyncDock(){
  if(!$('bViews').children.length)return;
  for(const el of $('bViews').children)el.setAttribute('aria-pressed',String(el.dataset.v===BAY.view&&!BAY.spin));
  $('bSpin').setAttribute('aria-pressed',String(!!BAY.spin));$('bHood').setAttribute('aria-pressed',String(!!BAY.hood));
  $('bSteer').setAttribute('aria-pressed',String(!!BAY.steer));$('bLights').setAttribute('aria-pressed',String(!!APP.lights));
  const paint=rigOf(APP.car).paint;for(const el of $('bPaints').children)el.setAttribute('aria-pressed',String(+el.dataset.i===(paint===undefined?-1:paint)));
  $('bMud').value=GAME.dirt;
  for(const x of $('bMode').children)x.setAttribute('aria-pressed',String(x.dataset.v===BAY.mode));
  for(const x of $('bListen').children)x.setAttribute('aria-pressed',String(+x.dataset.v===ENG.listener));
  for(const x of $('bRoom').children)x.setAttribute('aria-pressed',String(x.dataset.v===BAY.room));
  const e=GAME.car.spec;for(const d of BAY_BTNS){if(!d.el)continue;d.el.hidden=!!(d.need&&!d.need(e));d.el.disabled=!!(d.drive&&BAY.mode!=='drive');}
  $('bVol').value=ENG.vol;$('bInfo').innerHTML=bayInfo();bayLive(true);
}
/* the bits that change every frame: the power button, the pad's fill and its label */
const BLIVE={};
function bayLive(force){
  const on=bayOn(),thr=BAY.sim?BAY.sim.thr:0,lbl=on?'Hold to rev · further right, more throttle':'Hold to start the engine and rev it';
  if(force||BLIVE.on!==on){BLIVE.on=on;$('bPower').setAttribute('aria-pressed',String(on));$('bPowerLbl').textContent=on?'Engine on':'Start engine';}
  if(force||BLIVE.lbl!==lbl){BLIVE.lbl=lbl;$('bPadLbl').textContent=lbl;}
  const w=Math.round(thr*100);if(force||BLIVE.w!==w){BLIVE.w=w;$('bPadFill').style.width=w+'%';$('bPad').setAttribute('aria-valuenow',String(w));}
  if(BLIVE.st!==ENG.status){BLIVE.st=ENG.status;if(BAY.tab==='engine')$('bInfo').innerHTML=bayInfo();}
}
/* the dock: built once with the menu (62_menu) */
function buildBayDock(){
  $('bTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)baySetTab(b.dataset.v);});
  const vx=$('bViews');for(const [id,n] of BAY_VIEWS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;el.addEventListener('click',()=>bayView(id));vx.appendChild(el);}
  $('bSpin').addEventListener('click',()=>{BAY.spin=!BAY.spin;if(BAY.spin){BAY.view=null;}else{BAY.th=CAM.orbitA;}baySave();baySyncDock();});
  $('bHood').addEventListener('click',()=>{BAY.hood=!BAY.hood;baySyncDock();});
  $('bSteer').addEventListener('click',()=>{BAY.steer=!BAY.steer;baySave();baySyncDock();});
  $('bLights').addEventListener('click',()=>{APP.lights=!APP.lights;baySyncDock();});
  const px=$('bPaints'),sw=(i,n,c)=>{const el=document.createElement('button');el.type='button';el.dataset.i=String(i);el.title=n;el.setAttribute('aria-label',n);if(c)el.style.background=c;else el.className='kit';
    el.addEventListener('click',()=>{setPart('paint',i);baySyncDock();});px.appendChild(el);};
  sw(-1,'As the body kit comes',null);PAINTS.forEach((p,i)=>sw(i,p[0],p[1]));
  $('bMud').addEventListener('input',e=>{GAME.dirt=+e.target.value;});
  $('bPower').addEventListener('click',bayToggleEngine);
  $('bMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;baySetMode(b.dataset.v,true);baySyncDock();});
  const sl=$('bListen');LISTEN.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.dataset.v=String(i);b.textContent=n;sl.appendChild(b);});
  sl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setListener(+b.dataset.v);baySyncDock();});
  $('bRoom').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;BAY.room=b.dataset.v;setRoomKind(BAY.room);baySave();baySyncDock();});
  $('bVol').value=ENG.vol;$('bVol').addEventListener('input',e=>{setVolume(e.target.value);$('vol').value=ENG.vol;});
  /* the pad: further right, more throttle; pressing it with the engine off starts the engine, as the gas pedal does on the road */
  const pad=$('bPad'),setPad=e=>{const r=pad.getBoundingClientRect();BAY.pad=clamp((e.clientX-r.left-4)/(r.width-8),0,1);};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(_){}BAY.padOn=true;setPad(e);if(!bayOn()&&BAY.sim&&BAY.sim.st!=='crank')bayStart();});
  pad.addEventListener('pointermove',e=>{if(BAY.padOn)setPad(e);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,()=>{BAY.padOn=false;});
  const box=$('bBtns');
  for(const d of BAY_BTNS){const b=document.createElement('button');b.type='button';b.className='tog';if(d.tone)b.dataset.tone=d.tone;
    b.innerHTML='<span></span><kbd></kbd>';b.querySelector('span').textContent=d.l;b.querySelector('kbd').textContent=d.key;d.el=b;
    if(d.t==='hold'){const set=v=>{if(!b.disabled)bayHold(d,v);};
      b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}set(true);});
      for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>set(false));}
    else b.addEventListener('click',()=>bayPress(d));
    box.appendChild(b);}
  /* a drag on the picture beside the menu turns the view and stops the spin */
  const dz=$('bayDrag');
  dz.addEventListener('pointerdown',e=>{e.preventDefault();BAY.drag={id:e.pointerId,x:e.clientX,a:CAM.orbitA};try{dz.setPointerCapture(e.pointerId);}catch(_){}});
  dz.addEventListener('pointermove',e=>{const d=BAY.drag;if(!d||e.pointerId!==d.id)return;if(BAY.spin||BAY.view){BAY.spin=false;BAY.view=null;baySave();baySyncDock();}CAM.orbitA=BAY.th=d.a-(e.clientX-d.x)*.012;});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])dz.addEventListener(ev,e=>{if(BAY.drag&&e.pointerId===BAY.drag.id)BAY.drag=null;});
  baySetTab(BAY.tab);
}
