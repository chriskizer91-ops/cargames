/* =====================================================================================
   THE ENGINE SOUND. The audio graph and the room are the Digital Engine lab's own (roomIR, ROOM_SEND,
   setRoom and initAudio are copied from it, with its page state renamed to ENG). Every car gets a synth
   of its own (voiceNode), all playing into the one room, so any number of engines can run at once: the
   model bay's garage, or a grid of cars in a race. A voice is any object with the car's engine spec;
   voiceNode gives it a node and a port to post the synth's params to.
   ===================================================================================== */
const ENG={audio:null,init:null,listener:0,room:'open',vol:.8,tab:'look',
  keys:new Set(),digits:new Set(),pad:0,padOn:false,brkBtn:false,nos:false,blipT:0,status:''};
try{const s=JSON.parse(store.get('rut-engine','{}'));if(['open','garage','tunnel'].includes(s.room))ENG.room=s.room;
  if(s.listener>=0&&s.listener<=2)ENG.listener=s.listener|0;if(s.vol>=0&&s.vol<=1)ENG.vol=+s.vol;if(s.tab==='engine')ENG.tab='engine';}catch(e){}
const saveEng=()=>store.set('rut-engine',JSON.stringify({room:ENG.room,listener:ENG.listener,vol:ENG.vol,tab:ENG.tab}));
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
  /* starting every car at once asks for the graph several times over; they all wait on the one */
  if(!ENG.init)ENG.init=(async()=>{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('This browser has no Web Audio.');
    const ctx=new AC({latencyHint:'interactive'});
    const master=ctx.createGain();master.gain.value=ENG.vol;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-8;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.15;
    master.connect(comp);comp.connect(ctx.destination);
    const send=ctx.createGain();send.gain.value=0;const conv=ctx.createConvolver();send.connect(conv);conv.connect(master);
    let worklet=false,kind;
    try{
      if(!ctx.audioWorklet)throw new Error('no worklet');
      /* the lab's processor, plus a nap: a parked engine that is off stops costing anything */
      const src=`const EngineDSP=(${makeDSP.toString()})();
class DigitalEngine extends AudioWorkletProcessor{
  constructor(){super();this.d=new EngineDSP(sampleRate);this.k=0;this.zz=false;
    this.port.onmessage=e=>{const m=e.data;if(m.t==='cfg')this.d.configure(m.cfg);else if(m.t==='p')this.d.set(m.p);else if(m.t==='ev')this.d.event(m.ev);else if(m.t==='sleep')this.zz=!!m.v;};}
  process(i,o){if(this.zz)return true;const out=o[0];this.d.process(out[0],out[1]||out[0],out[0].length);if(++this.k>=8){this.k=0;const s=this.d.takeStats();if(s)this.port.postMessage(s);}return true;}
}
registerProcessor('digital-engine',DigitalEngine);`;
      /* a blob URL where the page has a real origin; a data URL where it does not (a file opened from disk) */
      try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));}
      catch(e1){await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));}
      worklet=true;kind='audio worklet';
    }catch(err){kind='main-thread fallback ('+(err&&err.message||err)+')';}
    ENG.audio={ctx,master,comp,send,conv,worklet,kind};
    setRoom();
    ENG.status=`Digital Engine synth running live in an ${kind} at ${(ctx.sampleRate/1000).toFixed(1)} kHz.`;
    return ENG.audio;
  })();
  try{return await ENG.init;}finally{ENG.init=null;}
}
/* one car's synth, made the first time its engine starts */
function voiceNode(v){
  if(v.port)return;const a=ENG.audio,ctx=a.ctx;let node=null,port;
  if(a.worklet)try{node=new AudioWorkletNode(ctx,'digital-engine',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    const np=node.port;np.onmessage=e=>onStats(v,e.data);port={post:m=>np.postMessage(m)};}catch(e){node=null;}
  if(!node){
    /* fallback: the same synth on the main thread */
    const D=makeDSP(),d=new D(ctx.sampleRate);let zz=false;node=ctx.createScriptProcessor(1024,1,2);
    const silent=ctx.createConstantSource?ctx.createConstantSource():null;if(silent){silent.offset.value=0;silent.connect(node);silent.start();}
    node.onaudioprocess=ev=>{const b=ev.outputBuffer;if(zz){b.getChannelData(0).fill(0);b.getChannelData(1).fill(0);return;}
      d.process(b.getChannelData(0),b.getChannelData(1),b.length);const s=d.takeStats();if(s)onStats(v,s);};
    port={post:m=>{if(m.t==='cfg')d.configure(m.cfg);else if(m.t==='p')d.set(m.p);else if(m.t==='ev')d.event(m.ev);else if(m.t==='sleep')zz=!!m.v;}};
  }
  node.connect(a.master);node.connect(a.send);
  v.node=node;v.port=port;v.asleep=false;port.post({t:'cfg',cfg:SIM.dspCfg(v.spec)});
}
/* a bang in the pipes lights the bang chip and throws a flame out of the tips */
function onStats(v,s){if(s.pops){v.popT=performance.now();v.flame=Math.min(1.4,v.flame+.45+.25*s.pops);v.flameL=.55+Math.random()*.6;}}
function setListener(v){ENG.listener=+v;setRoom();saveEng();}
function setRoomKind(v){ENG.room=v;setRoom();saveEng();}
function setVolume(v){ENG.vol=+v;if(ENG.audio)ENG.audio.master.gain.setTargetAtTime(ENG.vol,ENG.audio.ctx.currentTime,.03);saveEng();}
/* is the player typing into a field (so a key is not a pedal) */
const typing=t=>t&&(t.tagName==='SELECT'||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&t.type!=='range'));
