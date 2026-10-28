/* =====================================================================================
   THE BAY'S ENGINE: the lab's own EngineSim drives the synth while the truck sits on the
   turntable (free rev, or drive on the lab's virtual road), with the lab's car controls.
   ===================================================================================== */
async function startEngine(){
  if(ENG.busy)return;ENG.busy=true;
  try{await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();ENG.sim.start();}
  catch(e){ENG.status='Sound could not start: '+e.message;}
  ENG.busy=false;engineLive(true);
}
function toggleEngine(){if(!ENG.audio||ENG.sim.st==='off'||ENG.sim.st==='stopping')startEngine();else{ENG.sim.stop();engineLive(true);}}
const engineOn=()=>!!ENG.sim&&ENG.sim.st!=='off'&&ENG.sim.st!=='stopping';

/* ---------- the truck's engine: the lab's applySpec, for whichever truck is on the turntable ---------- */
function engineFor(i){
  const spec=specOf(i);if(ENG.spec===spec)return;ENG.spec=spec;
  if(!ENG.sim){ENG.sim=SIM.makeSim(spec);ENG.sim.mode='free';}else ENG.sim.setSpec(spec);
  if(ENG.audio)ENG.audio.port.post({t:'cfg',cfg:SIM.dspCfg(spec)});
}
function setMode(m){
  const sim=ENG.sim;sim.mode=m;
  sim.gear=0;sim.clutch='open';sim.shiftT=0;sim.held=false;if(m==='free'){sim.v=0;sim.ww=0;sim.pos=0;}else sim.pos=-120;
}

/* ---------- hands and feet (the lab's car controls) ---------- */
const ENG_BTNS=[
  {id:'brake',l:'Brake',k:'KeyS',t:'hold',drive:1,tone:'red'},{id:'down',l:'Shift down',k:'KeyQ',t:'tap',drive:1},{id:'up',l:'Shift up',k:'KeyE',t:'tap',drive:1},
  {id:'nos',l:'Nitrous',k:'KeyN',t:'hold',tone:'cyan',need:e=>e.nosKw},{id:'purge',l:'Purge',k:'KeyP',t:'tap',need:e=>e.nosKw},{id:'blip',l:'Blip',k:'KeyB',t:'tap'}];
const ENG_ACT={up:()=>ENG.sim.shift(1),down:()=>ENG.sim.shift(-1),purge:()=>{if(ENG.audio)ENG.audio.port.post({t:'ev',ev:{type:'purge'}});},blip:()=>{ENG.blipT=.22;}};
function engHold(d,v){if(d.el)d.el.classList.toggle('on',v);if(d.id==='brake')ENG.brkBtn=v;else if(d.id==='nos')ENG.nos=v;}
function engPress(d){if(d.el&&d.el.disabled)return;if(ENG_ACT[d.id])ENG_ACT[d.id]();}
function readInput(dt){
  let thr=ENG.keys.has('thr')?1:0;
  for(const d of ENG.digits)thr=Math.max(thr,d/10);
  if(ENG.padOn)thr=Math.max(thr,ENG.pad);
  if(ENG.blipT>0){ENG.blipT-=dt;thr=1;}
  return {thr,brk:ENG.keys.has('brk')||ENG.brkBtn?1:0,nos:ENG.nos};
}
addEventListener('keydown',e=>{
  if(!ENG.sim||typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
  const c=e.code,onRange=e.target&&e.target.type==='range';
  const d=ENG_BTNS.find(x=>x.k===c&&x.el&&!x.el.hidden);
  if(d){e.preventDefault();if(d.t==='hold'){if(!e.repeat)engHold(d,true);}else if(!e.repeat)engPress(d);return;}
  if(c==='Space'||c==='KeyW'||(c==='ArrowUp'&&!onRange)){e.preventDefault();ENG.keys.add('thr');return;}
  if(c==='KeyS'||(c==='ArrowDown'&&!onRange)){e.preventDefault();ENG.keys.add('brk');return;}
  if(/^Digit\d$/.test(c)){ENG.digits.add(+c.slice(5)||10);return;}
  if(e.repeat)return;
  if(c==='KeyI')toggleEngine();
  else if(c==='KeyV'){setListener((ENG.listener+1)%3);syncEngineDock();}
});
addEventListener('keyup',e=>{const c=e.code;
  const d=ENG_BTNS.find(x=>x.k===c);if(d&&d.t==='hold'){engHold(d,false);return;}
  if(c==='Space'||c==='KeyW'||c==='ArrowUp'){ENG.keys.delete('thr');if(c==='Space'&&!typing(e.target))e.preventDefault();}
  if(c==='KeyS'||c==='ArrowDown')ENG.keys.delete('brk');
  if(/^Digit\d$/.test(c))ENG.digits.delete(+c.slice(5)||10);});
addEventListener('blur',()=>{ENG.keys.clear();ENG.digits.clear();ENG.padOn=false;ENG.brkBtn=false;ENG.nos=false;for(const d of ENG_BTNS)if(d.t==='hold')engHold(d,false);});

/* ---------- the loop: the lab's frame, minus its instruments ---------- */
function engineFrame(dt){
  const sim=ENG.sim;if(!sim)return;
  const inp=readInput(dt);for(let k=0;k<4;k++)sim.step(dt/4,inp);
  const ev=sim.takeEvents();
  if(ENG.audio){for(const e of ev)ENG.audio.port.post({t:'ev',ev:e});ENG.audio.port.post({t:'p',p:sim.params(ENG.listener,1)});}
  if(sim.stalled){sim.stalled=false;ENG.status='It stalled. Start it again with the button or I.';}
  ENG.inp=inp;
  /* the truck answers: torque rocks the body on its springs, acceleration squats it, the wheels turn */
  const e=ENG.spec,run=sim.running,Te=run?Math.max(-e.tq*.3,SIM.engTq(e,Math.max(sim.rpm,1),sim.thr,sim.boost)):0;
  const rollT=-.02*Te/e.peak.tq,pitchT=sim.mode==='drive'?clamp(sim.aPrev/9.81,-1,1)*.014:0;
  ENG.rollV+=(-(ENG.roll-rollT)*80-ENG.rollV*6.5)*dt;ENG.roll+=ENG.rollV*dt;
  ENG.pitchV+=(-(ENG.pitch-pitchT)*60-ENG.pitchV*7)*dt;ENG.pitch+=ENG.pitchV*dt;
  const idle=run?1-clamp((sim.rpm-e.idle)/(e.idle*1.5),0,1):0,lope=[0,.012,.032,.065][e.cam|0],amp=run?(.0004+lope*.03*idle+.0003*sim.load):0;
  ENG.shake=[(Math.random()-.5)*amp,(Math.random()-.5)*amp*1.6];
  ENG.wheelA=(ENG.wheelA+(sim.mode==='drive'?sim.ww:0)*dt)%(TAU*1000);
  ENG.flame=Math.max(0,ENG.flame-dt*9);
}
function engineHud(){
  const sim=ENG.sim,e=ENG.spec;if(!sim||!e)return;
  const on=sim.st!=='off',rpm=on?Math.max(0,sim.rpmOut||0):0;
  if(!on&&ENG.tab!=='engine')return;
  engShiftLights(Math.round(W/2-45),3,e,rpm,sim.running);
  /* the tach in the corner with the gear in its middle; speed and the boost and nitrous bars to its left */
  const r=Math.round(H*.15),cx=W-r-7,cy=H-11;
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));
  engTach(cx,cy,r,e,rpm);
  const drive=sim.mode==='drive',g=!drive?'N':sim.shiftT>0?'-':sim.gear?String(sim.gear):'N';
  otxt5(g,cx,cy-r+12,rpm>e.shiftRpm-50&&drive?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-47;hRect(sx-3,H-20,47,18,pack(4,3,8,150));
  seg7(String(Math.round(sim.v*2.237)).padStart(3,' '),sx,H-17,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,H-9,PAL.dim);
  let bx=sx-10;const by=H-36;
  if(e.fiBoost){const b=clamp((sim.boost||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  if(e.nosKw){const b=clamp(sim.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),sim.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* the lab's chips */
  const bang=performance.now()-ENG.popT<140,run=sim.running;
  const C=[['LIMITER',sim.cutFrac>.5&&!sim.twostep&&!sim.tcOn&&sim.shiftT<=0,PAL.red],['2-STEP',sim.twostep,PAL.amber],['TC',sim.tcOn,PAL.green],
    ['NOS',sim.nosOn,PAL.cyan],['BANG',bang,PAL.red]];
  if(e.antilag)C.splice(3,0,['ANTI-LAG',!!(e.turbo&&sim.thr<.2&&run&&sim.rpm>e.redline*.3),PAL.amber]);
  let x=4;for(const [t,v,col] of C){if(t==='NOS'&&!e.nosKw)continue;txt3(t,x,H-7,v?col:pack(70,64,86));x+=tw3(t)+5;}
  txt3(LISTEN[ENG.listener].toUpperCase()+' . '+(drive?'DRIVE':'FREE REV'),x+2,H-7,PAL.dim);
  if(!on){const msg=touchy?'TAP START ENGINE':'PRESS I TO START';if((APP.t*1.6|0)%2===0)otxt5(msg,W/2,H-24,GR.steel,1,'c');}
  else if(sim.st==='crank')otxt3('CRANKING',W/2,H-20,PAL.amber,1,'c');
}
