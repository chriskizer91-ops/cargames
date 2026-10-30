/* =====================================================================================
   THE ENGINE'S SOUND — the Digital Engine's own synth (hd/15 and 17: the lab's DSP in an audio worklet,
   its room and compressor), untouched. City Limits only decides where you hear it from and adds Back
   Forty's tone shaping after the synth:
   - Heard from: "Like the bay" (the lab's Behind spot: 3 m behind, centred) or "From the camera".
   - Body: "Fuller" (+6 dB at 140 Hz, +1 dB at 300, -2 dB above 5 kHz, the default), "Phone speaker"
     (-4 dB under 110, +3.5 dB at 300, -2 dB over 5 kHz) or "As the lab" (flat).
   The electric car has its own voice (hd/45_ev.js) through the same bus.
   ===================================================================================== */
const BODIES={fuller:[6,1,-2,110],phone:[-4,3.5,-2,110],lab:[0,0,0,110]};
export class Sound{
  constructor(HD,settings){this.HD=HD;this.s=settings;this.voice={spec:null,port:null,node:null,flame:0,flameL:0};this.ready=false;this.ducked=false;this.started=false;}
  async init(){
    const HD=this.HD;if(this.ready)return true;
    try{await HD.initAudio();const a=HD.ENG.audio;if(a.ctx.state!=='running')await a.ctx.resume();
      /* the tone bus: synth -> lowshelf -> peaking -> highshelf -> the lab's master (and its room send) */
      const ctx=a.ctx,ls=ctx.createBiquadFilter(),pk=ctx.createBiquadFilter(),hs=ctx.createBiquadFilter(),bus=ctx.createGain();
      ls.type='lowshelf';ls.frequency.value=140;pk.type='peaking';pk.frequency.value=300;pk.Q.value=.9;hs.type='highshelf';hs.frequency.value=5000;
      bus.connect(ls);ls.connect(pk);pk.connect(hs);hs.connect(a.master);hs.connect(a.send);
      this.bus=bus;this.eq=[ls,pk,hs];this.ctx=ctx;this.ready=true;this.configure(this.s);this.setVolume(this.s.volume);
    }catch(e){console.warn('sound',e);this.ready=false;}
    return this.ready;
  }
  configure(s){if(!this.eq)return;const b=BODIES[s.body]||BODIES.fuller,t=this.ctx.currentTime;
    this.eq[0].gain.setTargetAtTime(b[0],t,.05);this.eq[1].gain.setTargetAtTime(b[1],t,.05);this.eq[2].gain.setTargetAtTime(b[2],t,.05);}
  setVolume(v){const HD=this.HD;HD.ENG.vol=+v;if(HD.ENG.audio)HD.ENG.audio.master.gain.setTargetAtTime(this.ducked?v*.25:+v,HD.ENG.audio.ctx.currentTime,.05);}
  duck(on){this.ducked=on;this.setVolume(this.s.volume);}
  /* a new car: the synth becomes its engine (or the electric voice) */
  setCar(car){const v=this.voice;v.spec=car.spec;v.ev=!!car.spec.ev;
    if(this.ready)this.attach(car);}
  attach(car){
    const HD=this.HD,v=this.voice;
    if(car.spec.ev){if(v.node&&!v.evNode){try{v.node.disconnect();}catch(e){}v.port&&v.port.post({t:'sleep',v:true});}
      if(!v.evNode&&HD.evSound){v.evNode=HD.evSound(this.ctx);v.evNode.out.connect(this.bus);}return;}
    if(v.evNode){try{v.evNode.out.disconnect();}catch(e){}v.evNode=null;}
    if(!v.port){HD.voiceNode(v);try{v.node.disconnect();}catch(e){}v.node.connect(this.bus);}
    else{v.port.post({t:'sleep',v:false});try{v.node.disconnect();}catch(e){}v.node.connect(this.bus);v.port.post({t:'cfg',cfg:HD.SIM.dspCfg(car.spec)});}
  }
  /* a tap or key press started the game: the browser now lets us make a sound */
  async start(car){if(await this.init())this.attach(car);this.started=true;}
  wake(){if(this.ready&&this.ctx.state!=='running')this.ctx.resume();}
  update(car,c,state,dt){
    const v=this.voice;if(!this.ready)return;
    const pt=car.pt,M=car.M,F=[M[0],M[3],M[6]];
    let geo;
    if(this.s.hear==='camera'&&c&&c.pos){const ex=car.p,dx=c.pos[0]-ex[0],dy=c.pos[1]-ex[1],dz=c.pos[2]-ex[2],dist=Math.hypot(dx,dy,dz),right=[-c.fwd[2],0,c.fwd[0]],rl=Math.hypot(right[0],right[2])||1;
      const toCam=[dx/dist,dy/dist,dz/dist];geo={dist:Math.max(1.5,Math.min(5,dist)),pan:Math.max(-1,Math.min(1,(dx*right[0]+dz*right[2])/rl/dist*.9)),rear:Math.max(0,Math.min(1,.5-.5*(toCam[0]*F[0]+toCam[2]*F[2])))*.6+.4};}
    else geo={dist:car.spec.behindDist||3,pan:0,rear:1};
    if(car.spec.ev){if(v.evNode)v.evNode.update(car,dt,state);return;}
    if(!v.port)return;
    const ep=pt.soundParams(0,car.speed,geo);ep.horn=0;
    for(const e of pt.takeEvents())v.port.post({t:'ev',ev:e});
    v.port.post({t:'p',p:ep});
  }
}
