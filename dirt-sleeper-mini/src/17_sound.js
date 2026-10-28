/* =====================================================================================
   THE ENGINE IN THE BAY. The audio graph, the room, and the loop that feeds the synth are the
   Digital Engine lab's own (roomIR, ROOM_SEND, setRoom and initAudio are copied from it, with
   its page state renamed to ENG). Each frame the sim takes four steps, its events go to the synth,
   then one set of params, exactly as the lab does it.
   ===================================================================================== */
const ENG={sim:null,spec:null,audio:null,busy:false,listener:0,room:'open',vol:.8,tab:'look',
  keys:new Set(),digits:new Set(),pad:0,padOn:false,brkBtn:false,nos:false,blipT:0,popT:-1e9,
  status:'',flame:0,flameL:0,roll:0,rollV:0,pitch:0,pitchV:0,wheelA:0,shake:[0,0]};
try{const s=JSON.parse(store.get('dsmini-engine','{}'));if(['open','garage','tunnel'].includes(s.room))ENG.room=s.room;
  if(s.listener>=0&&s.listener<=2)ENG.listener=s.listener|0;if(s.vol>=0&&s.vol<=1)ENG.vol=+s.vol;if(s.tab==='engine')ENG.tab='engine';}catch(e){}
const saveEng=()=>store.set('dsmini-engine',JSON.stringify({room:ENG.room,listener:ENG.listener,vol:ENG.vol,tab:ENG.tab}));
const LISTEN=['Behind','Cabin','Trackside'];

/* ---------- from the lab: the room ---------- */
function roomIR(ctx,kind){
  const sr=ctx.sampleRate,n=Math.round(sr*{open:.5,garage:1.2,tunnel:2.4}[kind]),b=ctx.createBuffer(2,n,sr);let seed=1234567;
  const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647*2-1;};
  for(let ch=0;ch<2;ch++){const X=b.getChannelData(ch);let lp=0;
    if(kind==='tunnel'){
      /* flutter echoes bouncing between the walls, each a little duller, then a long diffuse tail */
      for(let k=1;k<44;k++){const i=Math.round((k*.036+(k&1?ch*.011:0)+rnd()*.0015)*sr);if(i>=n)break;const a=Math.pow(.8,k)*(((k+ch)&1)?.55:1);
        for(let q=0;q<90&&i+q<n;q++)X[i+q]+=a*Math.exp(-q/(5+k*1.4))*(q?rnd()*.6:1);}
      for(let i=0;i<n;i++){const t=i/sr;lp+=.3*(rnd()-lp);X[i]+=lp*.55*Math.exp(-t*2.5)*Math.min(1,t/.03);}
    }else if(kind==='garage'){
      for(const [t,a] of [[.007,.7],[.013,.5],[.019,.45],[.026,.35],[.034,.3],[.041,.28]])X[Math.round((t+ch*.0013)*sr)]+=a*(rnd()>0?1:-1);
      for(let i=0;i<n;i++){const t=i/sr;lp+=.45*(rnd()-lp);X[i]+=lp*.5*Math.exp(-t*5.8)*Math.min(1,t/.012);}
    }else{
      /* open air: a ground bounce and the slap off a distant wall */
      X[Math.round((.0045+ch*.0006)*sr)]+=.5;
      for(const [t,a,d] of [[.085,.22,12],[.16,.12,18]]){const s=Math.round((t+ch*.005)*sr);for(let q=0;q<80;q++)X[s+q]+=a*Math.exp(-q/d)*rnd();}
      for(let i=0;i<n;i++){const t=i/sr;lp+=.25*(rnd()-lp);X[i]+=lp*.12*Math.exp(-t*9)*Math.min(1,t/.02);}
    }}
  return b;
}
const ROOM_SEND={open:.28,garage:.5,tunnel:.8};
function setRoom(){if(!ENG.audio)return;const a=ENG.audio;a.conv.buffer=roomIR(a.ctx,ENG.room);a.send.gain.setTargetAtTime(ROOM_SEND[ENG.room]*(ENG.listener===1?.35:1),a.ctx.currentTime,.05);}

/* ---------- from the lab: the audio graph, the synth in an audio worklet ---------- */
async function initAudio(){
  if(ENG.audio)return ENG.audio;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('This browser has no Web Audio.');
  const ctx=new AC({latencyHint:'interactive'});
  const master=ctx.createGain();master.gain.value=ENG.vol;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-8;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.15;
  master.connect(comp);comp.connect(ctx.destination);
  const send=ctx.createGain();send.gain.value=0;const conv=ctx.createConvolver();send.connect(conv);conv.connect(master);
  let node,port,kind;
  try{
    if(!ctx.audioWorklet)throw new Error('no worklet');
    const src=`const EngineDSP=(${makeDSP.toString()})();
class DigitalEngine extends AudioWorkletProcessor{
  constructor(){super();this.d=new EngineDSP(sampleRate);this.k=0;
    this.port.onmessage=e=>{const m=e.data;if(m.t==='cfg')this.d.configure(m.cfg);else if(m.t==='p')this.d.set(m.p);else if(m.t==='ev')this.d.event(m.ev);};}
  process(i,o){const out=o[0];this.d.process(out[0],out[1]||out[0],out[0].length);if(++this.k>=8){this.k=0;const s=this.d.takeStats();if(s)this.port.postMessage(s);}return true;}
}
registerProcessor('digital-engine',DigitalEngine);`;
    /* a blob URL where the page has a real origin; a data URL where it does not (a file opened from disk) */
    try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));}
    catch(e1){await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));}
    node=new AudioWorkletNode(ctx,'digital-engine',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    node.port.onmessage=e=>onStats(e.data);port={post:m=>node.port.postMessage(m)};kind='audio worklet';
  }catch(err){
    /* fallback: the same synth on the main thread */
    const D=makeDSP(),d=new D(ctx.sampleRate);node=ctx.createScriptProcessor(1024,1,2);
    const silent=ctx.createConstantSource?ctx.createConstantSource():null;if(silent){silent.offset.value=0;silent.connect(node);silent.start();}
    node.onaudioprocess=ev=>{const b=ev.outputBuffer;d.process(b.getChannelData(0),b.getChannelData(1),b.length);const s=d.takeStats();if(s)onStats(s);};
    port={post:m=>{if(m.t==='cfg')d.configure(m.cfg);else if(m.t==='p')d.set(m.p);else if(m.t==='ev')d.event(m.ev);}};kind='main-thread fallback ('+(err&&err.message||err)+')';
  }
  node.connect(master);node.connect(send);
  ENG.audio={ctx,master,comp,send,conv,node,port,kind};
  setRoom();port.post({t:'cfg',cfg:SIM.dspCfg(ENG.spec)});
  ENG.status=`Digital Engine synth running live in an ${kind} at ${(ctx.sampleRate/1000).toFixed(1)} kHz.`;
  return ENG.audio;
}
/* a bang in the pipes lights the bang chip and throws a flame out of the tips */
function onStats(s){if(s.pops){ENG.popT=performance.now();ENG.flame=Math.min(1.4,ENG.flame+.45+.25*s.pops);ENG.flameL=.55+Math.random()*.6;}}
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
function setListener(v){ENG.listener=+v;setRoom();saveEng();}
function setRoomKind(v){ENG.room=v;setRoom();saveEng();}
function setVolume(v){ENG.vol=+v;if(ENG.audio)ENG.audio.master.gain.setTargetAtTime(ENG.vol,ENG.audio.ctx.currentTime,.03);saveEng();}

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
const typing=t=>t&&(t.tagName==='SELECT'||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&t.type!=='range'));
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
/* ---------- the dot-matrix instruments: Shiftlight 2's shift lights, tach, gear and speed ---------- */
function engShiftLights(x,y,e,rpm,n=15){
  const sAt=e.shiftRpm,lo=sAt-Math.min(3500,sAt*.42),f=clamp((rpm-lo)/(sAt-lo),0,1),lit=Math.floor(f*n+.001),over=rpm>=sAt-40&&ENG.sim.running,blink=(APP.t*14|0)%2;
  for(let i=0;i<n;i++){const cx=x+i*6,on=i<lit;
    let col=i<5?[60,255,90]:i<10?[255,210,40]:[255,50,60];if(over)col=[80,140,255];
    const c=(over?blink:on)?pack(col[0],col[1],col[2]):pack(col[0]*.12,col[1]*.12,col[2]*.12);
    hDisc(cx+2,y+2,2.3,c);if(over?blink:on)hPx(cx+1,y+1,PAL.white);}
}
function engTach(cx,cy,r,e,rpm){
  const lim=e.limiterRpm,n=34,a0=PI*1.12,a1=-PI*.12;
  for(let i=0;i<n;i++){const t=i/(n-1),a=a0+(a1-a0)*t,rv=t*lim*1.05,x=cx+Math.cos(a)*r,y=cy-Math.sin(a)*r;
    const on=rv<=rpm,red=rv>e.redline,c=red?(on?PAL.red:pack(70,10,16)):on?PAL.ink:pack(50,46,64);hDisc(x,y,1.3,c);}
  for(let k=0;k<=Math.floor(lim/1000);k++){const t=k*1000/(lim*1.05),a=a0+(a1-a0)*t;txt3(String(k),Math.round(cx+Math.cos(a)*(r-7))-1,Math.round(cy-Math.sin(a)*(r-7))-2,k*1000>e.redline?PAL.red:PAL.dim);}
}
function engineHud(){
  const sim=ENG.sim,e=ENG.spec;if(!sim||!e)return;
  const on=sim.st!=='off',rpm=on?Math.max(0,sim.rpmOut||0):0;
  if(!on&&ENG.tab!=='engine')return;
  engShiftLights(Math.round(W/2-45),3,e,rpm);
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
