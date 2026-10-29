/* =====================================================================================
   THE MODEL BAY'S ENGINES. Every car on the bay has a voice: its own sim (the lab's EngineSim, revving
   on its own or driving a flat road) and its own synth. Each frame every running sim takes four steps,
   its events go to its synth, then one set of params, exactly as the lab does it. Only the car on the
   turntable hears the throttle; the rest idle where they are parked.
   ===================================================================================== */
/* a car's voice: its sim, its synth, and the way its body answers the engine */
const VOICES={};
/* the camera the last frame was drawn from: where the parked cars are heard from, and what a tap picks */
let CAMNOW=null;
const voiceOf=car=>VOICES[car]||(VOICES[car]={car,sim:null,spec:null,node:null,port:null,busy:false,asleep:false,offT:0,inp:null,popT:-1e9,
  flame:0,flameL:0,roll:0,rollV:0,pitch:0,pitchV:0,wheelA:0,shake:[0,0],dist:-1});
/* the voice of the car on the turntable, which the dock, the keys and the instruments talk to */
const cur=()=>voiceOf(BUILDS[APP.build].car);
Object.defineProperties(ENG,{sim:{get:()=>cur().sim},spec:{get:()=>cur().spec},inp:{get:()=>cur().inp}});
const runs=v=>!!v.sim&&v.sim.st!=='off'&&v.sim.st!=='stopping';

async function startEngine(v=cur()){
  if(v.busy||!v.sim)return;v.busy=true;
  try{await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();voiceNode(v);
    if(v.asleep){v.asleep=false;v.port.post({t:'sleep',v:0});}v.offT=0;v.sim.start();}
  catch(e){ENG.status='Sound could not start: '+e.message;}
  v.busy=false;engineLive(true);
}
function toggleEngine(){const v=cur();if(!v.port||!runs(v))startEngine(v);else{v.sim.stop();engineLive(true);}}
const engineOn=()=>runs(cur());

/* ---------- a car's engine: the lab's applySpec, for whichever build that car is on ---------- */
function engineFor(i){
  const v=voiceOf(BUILDS[i].car),spec=specOf(i);if(v.spec===spec)return v;v.spec=spec;
  if(!v.sim){v.sim=SIM.makeSim(spec);v.sim.mode='free';}else v.sim.setSpec(spec);
  if(v.port)v.port.post({t:'cfg',cfg:SIM.dspCfg(spec)});
  return v;
}
function setMode(m,v=cur()){
  const sim=v.sim;sim.mode=m;
  sim.gear=0;sim.clutch='open';sim.shiftT=0;sim.held=false;if(m==='free'){sim.v=0;sim.ww=0;sim.pos=0;}else sim.pos=-120;
}
/* ---------- hands and feet (the lab's car controls) ---------- */
const ENG_BTNS=[
  {id:'brake',l:'Brake',k:'KeyS',t:'hold',drive:1,tone:'red'},{id:'down',l:'Shift down',k:'KeyQ',t:'tap',drive:1},{id:'up',l:'Shift up',k:'KeyE',t:'tap',drive:1},
  {id:'nos',l:'Nitrous',k:'KeyN',t:'hold',tone:'cyan',need:e=>e.nosKw},{id:'purge',l:'Purge',k:'KeyP',t:'tap',need:e=>e.nosKw},{id:'blip',l:'Blip',k:'KeyB',t:'tap'}];
const ENG_ACT={up:()=>ENG.sim.shift(1),down:()=>ENG.sim.shift(-1),purge:()=>{const v=cur();if(v.port)v.port.post({t:'ev',ev:{type:'purge'}});},blip:()=>{ENG.blipT=.22;}};
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

