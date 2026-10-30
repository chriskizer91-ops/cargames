/* =====================================================================================
   THE ELECTRIC DRIVE — for the electric sedan. No engine, no clutch, one gear: the motor turns with the
   wheels, its torque flat to its base speed and its power flat after that, cut at its top speed. Off the
   pedal it brakes on the motors (regeneration), fading out at walking pace. Traction control works on the
   motor's torque directly, so it reacts far quicker than an engine's. The diffs are the same as every other
   car's (Powertrain.step's), so all-wheel drive, lockers and the e-brake behave alike.
   Its sound is its own: hd/45_ev's evSound, not the Digital Engine (there is no engine to synthesise).
   ===================================================================================== */
class EVPowertrain extends Powertrain{
  constructor(e,o){super(e,o);const m=e.evm;this.Tm=m.nm;this.Pm=m.kw*1000;this.wMax=m.maxRpm*TAU/60;this.regen=m.regen;this.st='off';this.auto=true;this.gear=1;}
  start(){if(this.st!=='run'){this.st='run';this.t=0;this.events.push({type:'evOn'});}}
  stop(){this.st='off';}
  shift(){return false;}
  autoShift(){}
  get running(){return this.st==='run';}
  step(dt,inp,W,aid){
    const e=this.e,o=this.o,R=o.R,Iw=o.Iw,drv=this.drv;
    this.t+=dt;this.tcOn=false;this.etcOn=false;this.cutFrac=0;this.boost=0;this.nosOn=false;this.shiftT=0;
    let thrIn=clamp(inp.thr,0,1);if(this.st!=='run')thrIn=0;
    this.thr+=(thrIn-this.thr)*Math.min(1,dt*22);
    const gr=this.ratio(),wm=this.meanW(W);this.vW=wm*R;
    const ws=gr*wm,wmot=Math.abs(ws);this.we=ws;this.rpm=wmot*60/TAU;
    let dslip=0;for(let k=0;k<drv.length;k++)dslip=Math.max(dslip,W[drv[k]].kap);this.dslip=dslip;
    /* the motor: flat torque to its base speed, then flat power, nothing past its top speed */
    const Tav=Math.min(this.Tm,this.Pm/Math.max(wmot,1))*(1-sstep(this.wMax*.97,this.wMax,wmot));
    let T=Tav*this.thr;
    if(aid.tc&&!this.rev&&aid.fmax>0){const cap=aid.fmax*.97*R/(Math.abs(gr)*.95);if(T>cap){T=cap;this.tcOn=true;}}
    if(aid.tc&&Math.abs(this.vW)>.3&&!this.rev){const err=dslip-.1;if(err>0)this.tcMul-=Math.min(err,1)*dt*22;else this.tcMul+=dt*4;this.tcMul=clamp(this.tcMul,.25,1);T*=this.tcMul;if(this.tcMul<.97)this.tcOn=true;}
    else this.tcMul=1;
    if(aid.escThr<1)T*=aid.escThr;
    /* regeneration off the pedal (more with the brake on), against the way the motor turns */
    let Tr=0;if(this.thr<.03&&this.st==='run'){const k=sstep(.6,4,Math.abs(this.vW));Tr=-Math.sign(ws||1)*this.regen*this.Tm*.45*k*(inp.brk>.05?1.6:1);}
    this.Te=T+Tr;
    /* motor and driven wheels turn as one, solved implicitly against the tyres' stiffness (as a locked clutch) */
    const n=drv.length;let Fsum=0,Ksum=0;for(let k=0;k<n;k++){Fsum+=W[drv[k]].Fx;Ksum+=W[drv[k]].Kd;}
    const Itot=e.Ie*gr*gr+n*Iw,tau=this.Te*gr*.95-R*Fsum,dwm=dt*tau/(Itot+dt*R*Ksum);
    for(let k=0;k<n;k++)W[drv[k]].w+=dwm;
    const Tdrv=this.Te*gr*.95;this.Tdrv=Tdrv;this.locked=true;this.engage=1;this.launching=false;this.launchW=0;
    this.load=clamp(Math.abs(this.Te)/this.Tm,0,1);this.thrSnd=this.thr;
    /* the diffs: as Powertrain.step */
    const D=o.diff;
    if(n===2){const i=drv[0],j=drv[1],m=(W[i].w+W[j].w)/2;let Dd=(W[i].w-W[j].w)/2;
      Dd+=dt*(-R*(W[i].Fx-W[j].Fx)/2)/(Iw+dt*R*(W[i].Kd+W[j].Kd)/2);
      const lk=D.pre+(Tdrv>=0?D.acc:D.dec)*Math.abs(Tdrv);Dd-=sgn(Dd)*Math.min(Math.abs(Dd),dt*lk/Iw);W[i].w=m+Dd;W[j].w=m-Dd;}
    else{const m=(W[0].w+W[1].w+W[2].w+W[3].w)/4;let Dc=(W[0].w+W[1].w-(W[2].w+W[3].w))/4,Df=(W[0].w-W[1].w)/2,Dr=(W[2].w-W[3].w)/2;
      const Qc=-R*(W[0].Fx+W[1].Fx-W[2].Fx-W[3].Fx)-Tdrv*.2;
      const E=D.etc||0;let eC=0,eF=0,eR=0;
      if(E){eC=1400*(E*sstep(.5,2,Math.abs(Dc)*2*R));eF=1700*(E*sstep(.5,2,Math.abs(Df)*2*R));eR=1700*(E*sstep(.5,2,Math.abs(Dr)*2*R));this.etcOn=Math.max(eC,eF,eR)>500;}
      Dc+=dt*Qc/(4*Iw+dt*R*(W[0].Kd+W[1].Kd+W[2].Kd+W[3].Kd));
      const cFree=this.hbFree&&!D.cLock;
      Dc-=sgn(Dc)*Math.min(Math.abs(Dc),dt*(D.cLock?1e6:cFree?20:160+Math.abs(Dc)*80+eC)/(4*Iw));
      Df+=dt*(-R*(W[0].Fx-W[1].Fx))/(2*Iw+dt*R*(W[0].Kd+W[1].Kd));Df-=sgn(Df)*Math.min(Math.abs(Df),dt*(D.fLock?1e6:20+.1*Math.abs(Tdrv)+eF)/(2*Iw));
      Dr+=dt*(-R*(W[2].Fx-W[3].Fx))/(2*Iw+dt*R*(W[2].Kd+W[3].Kd));
      const lk=D.rLock?1e6:D.pre+(Tdrv>=0?D.acc:D.dec)*Math.abs(Tdrv)*.6+eR;Dr-=sgn(Dr)*Math.min(Math.abs(Dr),dt*lk/(2*Iw));
      W[0].w=m+Dc+Df;W[1].w=m+Dc-Df;W[2].w=m-Dc+Dr;W[3].w=m-Dc-Dr;}
    for(let i=0;i<4;i++)if(!this.isDrv(i)){const wh=W[i];wh.w+=dt*(-wh.R*wh.Fx)/(wh.Iw+dt*wh.R*wh.Kd);}
    this.rpmOut=this.rpm;
  }
}
/* the electric builds get the electric drive; their spec carries the motor */
{const mk=makeCar;makeCar=function(i,world,sim){const v=mk(i,world,sim),r=ENGINE_OF[v.build.id];
  if(r&&r.ev){const o=v.pt.o;v.pt=new EVPowertrain(v.spec,o);v.pt.partShift=true;}return v;};}
{const es=engineSpec;engineSpec=function(b){const e=es(b),r=ENGINE_OF[b.id];
  if(r&&r.ev){e.ev=true;e.evm=r.ev;e.limiterRpm=r.ev.maxRpm;e.shiftRpm=r.ev.maxRpm;e.nosKw=0;e.turbo=false;e.sup=false;e.fiBoost=0;
    e.peak={kw:r.ev.kw,hp:r.ev.kw*1.341,nm:r.ev.nm*r.axle,rpm:Math.round(r.ev.kw*1000/r.ev.nm*60/TAU)};e.behindDist=3;}
  return e;};}

/* ---------- the electric car's sound ----------
   Two motors heard from outside: a clean tone that climbs with motor speed (sine, its octave and a soft
   twelfth), a little gear mesh far up, and the tyres' low rumble on the road. Gentle on purpose: nothing hissy
   and no shrill whine. Louder with load, softer coasting, a lower note under regeneration. */
function evSound(ctx){
  const out=ctx.createGain();out.gain.value=0;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;lp.Q.value=.6;lp.connect(out);
  const osc=(type,mul,base)=>{const o=ctx.createOscillator();o.type=type;const g=ctx.createGain();g.gain.value=0;o.connect(g);g.connect(lp);o.start();return {o,g,mul,base};};
  const V=[osc('sine',1,.55),osc('sine',2,.2),osc('triangle',3,.06),osc('sine',.5,.18),osc('sine',9.6,.012)];
  /* the road: low rumble only (noise through a low-pass at a few hundred hertz) */
  const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);let s=1234567,lpv=0;
  for(let i=0;i<nd.length;i++){s=(s*16807)%2147483647;lpv+=.05*((s/2147483647)*2-1-lpv);nd[i]=lpv*3;}
  const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;const nf=ctx.createBiquadFilter();nf.type='lowpass';nf.frequency.value=260;const ng=ctx.createGain();ng.gain.value=0;
  ns.connect(nf);nf.connect(ng);ng.connect(out);ns.start();
  let lvl=0;
  return {out,update(car,dt,state){
    const pt=car.pt,t=ctx.currentTime,on=pt.st==='run'?1:0,rpm=pt.rpm,load=pt.load,regen=pt.Te<0;
    const f0=65+rpm/60*2.4*(regen?.92:1);
    for(const v of V){v.o.frequency.setTargetAtTime(f0*v.mul,t,.025);
      const k=v.mul>5?Math.min(1,rpm/4000):1;v.g.gain.setTargetAtTime(v.base*k*(.18+.82*load)*on,t,.05);}
    lp.frequency.setTargetAtTime(900+2400*load+rpm*.06,t,.08);
    const sp=Math.abs(car.speed||0);ng.gain.setTargetAtTime(Math.min(.5,sp/40)*.35,t,.1);
    lvl+=(on-lvl)*Math.min(1,dt*4);out.gain.setTargetAtTime(.55*lvl,t,.05);
  }};
}
