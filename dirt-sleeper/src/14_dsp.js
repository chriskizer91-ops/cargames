/* ---- src/audio/engine-dsp.js ---- */
/* =====================================================================================
   DIGITAL ENGINE SYNTH — live, sample by sample.
   Every cylinder fires on its own crank angle, in its real firing order, into its own bank
   of pipe. The pipes are 1-D acoustic waveguides (Kelly-Lochbaum scattering at every change
   of bore, lossy where there is packing, a closed-ish valve at one end and an open radiating
   tip at the other), run live rather than baked into an impulse response. On top: flow rasp
   gated by each pulse, induction through its own airbox model, afterfire and bangs fired
   into the pipes, turbo/supercharger/gear whine, blow-off, nitrous, the starter, and a
   listener with real propagation delay (so Doppler falls out of a moving source).

   Heavy and old machinery adds: diesel combustion knock, the compression-release (jake)
   brake, two-stroke firing, steam chuffs through a blast pipe and chimney, drain cocks and
   safety valves, horns, whistles and bells, air brakes, hydraulic pumps and relief valves,
   track plates, rail joints, alternator hum, fans, chains, blades and propellers.

   makeDSP() returns the EngineDSP class. Its source is stringified into an AudioWorklet
   module, so everything it needs is declared inside this function.
   ===================================================================================== */
function makeDSP(){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const C_GAS=500;   /* speed of sound in hot exhaust gas, m/s */
const C_AIR=343;   /* and in the air between the machine and you */
const ftanh=x=>{if(x>3)return 1;if(x<-3)return -1;const x2=x*x;return x*(27+x2)/(27+9*x2);};
const LP=0,HP=1,BP=2;

class Biquad{
  constructor(){this.b0=1;this.b1=0;this.b2=0;this.a1=0;this.a2=0;this.z1=0;this.z2=0;}
  set(type,f,q,sr){
    const w=TAU*clamp(f,8,sr*.47)/sr,cw=Math.cos(w),al=Math.sin(w)/(2*q),a0=1+al;let b0,b1,b2;
    if(type===LP){b0=(1-cw)/2;b1=1-cw;b2=b0;}else if(type===HP){b0=(1+cw)/2;b1=-(1+cw);b2=b0;}else{b0=al;b1=0;b2=-al;}
    this.b0=b0/a0;this.b1=b1/a0;this.b2=b2/a0;this.a1=-2*cw/a0;this.a2=(1-al)/a0;return this;
  }
  tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
  reset(){this.z1=this.z2=0;}
}

/* 1-D acoustic waveguide. sec = [[length m, bore m, packing 0..1], ...] from the valve outward.
   Each section is a pair of delay lines; at every change of bore a Kelly-Lochbaum junction
   splits the waves with k=(A1-A2)/(A1+A2). Packing is a lowpass and a loss per pass. The valve
   end reflects (rPort); the open tip reflects inverted and duller (rEnd) and radiates the flow
   it lets out through a leaky differentiator, the way a pipe's far field behaves. */
class Waveguide{
  constructor(sec,sr,rPort=.7,rEnd=-.8){
    const n=sec.length;this.n=n;this.rPort=rPort;this.rEnd=rEnd;
    this.m=new Int32Array(n);this.a=new Float64Array(n);this.g=new Float64Array(n);this.K=new Float64Array(n);this.p=new Int32Array(n);
    this.yr=new Float64Array(n);this.yl=new Float64Array(n);this.ar=new Float64Array(n);this.al=new Float64Array(n);this.nr=new Float64Array(n);this.nl=new Float64Array(n);
    this.R=[];this.L=[];
    for(let i=0;i<n;i++){const [l,,pk]=sec[i];this.m[i]=Math.max(2,Math.round(l/C_GAS*sr));this.a[i]=Math.min(.75,1-Math.min(.9,.6*pk));this.g[i]=.985-.08*pk;
      this.R.push(new Float64Array(this.m[i]));this.L.push(new Float64Array(this.m[i]));}
    for(let i=0;i<n-1;i++){const A1=sec[i][1]*sec[i][1],A2=sec[i+1][1]*sec[i+1][1];this.K[i]=(A1-A2)/(A1+A2);}
    this.tip=0;this.u1=0;this.dn=1e-20;
  }
  tick(x){
    const n=this.n,a=this.a,g=this.g,ar=this.ar,al=this.al,nr=this.nr,nl=this.nl,R=this.R,L=this.L,p=this.p,yr=this.yr,yl=this.yl,K=this.K,m=this.m;
    for(let i=0;i<n;i++){const q=p[i];yr[i]+=a[i]*(R[i][q]-yr[i]);ar[i]=yr[i]*g[i];yl[i]+=a[i]*(L[i][q]-yl[i]);al[i]=yl[i]*g[i];}
    this.dn=-this.dn;nr[0]=this.rPort*al[0]+x+this.dn;
    for(let i=0;i<n-1;i++){const k=K[i];nr[i+1]=(1+k)*ar[i]-k*al[i+1];nl[i]=k*ar[i]+(1-k)*al[i+1];}
    this.tip+=.5*(ar[n-1]-this.tip);const back=this.rEnd*this.tip,u=ar[n-1]-back;nl[n-1]=back;const out=u-.6*this.u1;this.u1=u;
    for(let i=0;i<n;i++){const q=p[i];R[i][q]=nr[i];L[i][q]=nl[i];p[i]=q+1>=m[i]?0:q+1;}
    return out;
  }
}
function irOf(sec,sr,rp,re){const w=new Waveguide(sec,sr,rp,re),n=Math.round(.15*sr),o=new Float64Array(n);for(let t=0;t<n;t++)o[t]=w.tick(t===0?1:0);return o;}
/* peak tailpipe response to one standard blowdown pulse: every system is levelled by it */
function pulsePeak(ir,sr){
  const n=Math.round(.005*sr),P=new Float64Array(n);for(let q=0;q<n;q++){const t=q/sr*1.5;P[q]=(1-Math.exp(-t/1e-4))*Math.exp(-t/1.5e-3);}
  const M=Math.min(ir.length,Math.round(.04*sr));let pk=1e-6;
  for(let t=0;t<M;t++){let s=0;for(let q=0;q<n&&q<=t;q++)s+=P[q]*ir[t-q];if(Math.abs(s)>pk)pk=Math.abs(s);}
  return pk;
}
/* exhaust systems, [length m, bore m, packing] valve to tip.
   k = [exhaust level, drive, brightness, rasp, pop, crackle]. tune: car-style primaries that shorten
   as the engine revs higher. tuned: equal-length headers that tidy up a bank split. */
const EXH=[
  {n:'Stock muffler',tune:1,sec:[[.34,.036,.05],[.26,.05,.05],[.26,.1,.35],[1.05,.048,.05],[.34,.09,.4],[.85,.048,.05],[.42,.11,.55],[.3,.045,.05]],k:[.5,.55,.55,.05,.25,.35]},
  {n:'Cat-back',tune:1,sec:[[.34,.036,.05],[.26,.05,.05],[.26,.1,.35],[1.3,.056,.04],[.42,.09,.28],[.34,.058,.04]],k:[.66,.65,.75,.09,.45,.6]},
  {n:'Headers',tune:1,tuned:1,sec:[[.74,.04,.04],[.3,.06,.04],[.22,.085,.18],[1.3,.062,.03],[.34,.09,.2],[.3,.063,.03]],k:[.82,.8,.9,.15,.7,1]},
  {n:'Straight pipe',tune:1,tuned:1,sec:[[.78,.042,.03],[.3,.064,.03],[1.9,.068,.02],[.22,.076,.02]],k:[1,1,1.15,.24,1,1.35]},
  {n:'Open headers',tune:1,tuned:1,sec:[[.62,.042,.02],[.2,.056,.02]],k:[1.1,1.12,1.3,.3,1.15,1.6]},
  {n:'Bike 4-2-1 and can',tune:1,tuned:1,sec:[[.55,.032,.03],[.33,.042,.03],[.25,.05,.03],[.36,.088,.45],[.1,.05,.05]],k:[.85,.85,1,.14,.8,.9]},
  {n:'Expansion chamber',tuned:1,sec:[[.12,.034,.02],[.09,.042,.02],[.09,.055,.02],[.1,.072,.02],[.18,.09,.02],[.08,.078,.02],[.07,.06,.02],[.06,.042,.02],[.08,.022,.02],[.22,.05,.5],[.06,.024,.04]],k:[.9,.9,1.1,.3,.4,.35]},
  {n:'Open shotguns',sec:[[1.1,.045,.02],[.08,.05,.02]],k:[1.05,1.05,1,.28,1.1,1.4]},
  {n:'Truck muffler and stack',sec:[[.6,.05,.03],[.4,.07,.03],[2.4,.125,.04],[1,.3,.55],[2.2,.127,.03],[.15,.14,.02]],k:[.62,.7,.75,.08,.3,.15]},
  {n:'Straight stacks',sec:[[.6,.05,.03],[.4,.07,.03],[2.4,.125,.03],[2.6,.127,.02],[.15,.14,.02]],k:[.95,.92,1,.18,.6,.4]},
  {n:'Locomotive stack',sec:[[2.2,.25,.03],[.6,.35,.2],[1.2,.5,.15],[.8,.45,.25],[.4,.5,.05]],k:[.85,.8,.75,.12,.3,.1]},
  {n:'Ship funnel',sec:[[3,.7,.03],[1.5,1,.35],[18,1.1,.05],[5,2.2,.6],[8,1.2,.05],[1,1.4,.02]],k:[.9,.75,.5,.06,.2,.05]},
  {n:'Tractor stack',sec:[[.35,.05,.03],[1.1,.07,.02],[.08,.08,.02]],k:[.95,.9,.85,.15,.6,.5]},
  {n:'Small engine muffler',sec:[[.06,.018,.02],[.08,.06,.6],[.03,.012,.05]],k:[.7,.75,.9,.18,.4,.3]},
  {n:'Chainsaw muffler',sec:[[.04,.016,.02],[.07,.05,.45],[.02,.01,.05]],k:[.8,.85,1.25,.35,.5,.4]},
  {n:'Industrial silencer',sec:[[.5,.06,.03],[.3,.08,.03],[1.5,.2,.7],[1,.1,.04],[1.2,.25,.65],[2,.1,.03]],k:[.5,.6,.6,.06,.2,.1]},
  {n:'Steam chimney',sec:[[.5,.12,.02],[1.4,1.5,.15],[.9,.4,.02],[.15,.45,.02]],k:[1,.7,.9,0,0,0]},
  {n:'Open elbow',sec:[[.25,.05,.02],[.35,.055,.02]],k:[1,1,.9,.2,.5,.2]},
  {n:'Excavator muffler',sec:[[.4,.06,.03],[.3,.07,.03],[.8,.25,.55],[.6,.1,.03],[.08,.11,.02]],k:[.65,.7,.7,.08,.25,.12]}
];
const INTAKES=[
  {n:'Airbox',sec:[[.22,.04,.03],[.32,.13,.35],[.06,.06,.05],[.45,.07,.08],[.3,.2,.6],[.22,.06,.1]],k:.22,resp:1},
  {n:'Cold air',sec:[[.22,.04,.03],[.32,.13,.3],[.06,.065,.04],[.55,.075,.05],[.12,.12,.25]],k:.3,resp:1.1},
  {n:'Ram air',sec:[[.22,.04,.03],[.32,.13,.25],[.06,.07,.03],[.35,.09,.05],[.2,.16,.2],[.25,.1,.05]],k:.38,resp:1.25},
  {n:'Individual throttles',sec:[[.2,.044,.02],[.08,.052,.02]],k:.75,resp:1.7},
  {n:'Heavy-duty air cleaner',sec:[[.3,.06,.03],[.5,.18,.3],[.8,.12,.05],[.5,.3,.7],[.2,.12,.1]],k:.14,resp:.8},
  {n:'Small engine filter',sec:[[.05,.02,.02],[.06,.05,.4],[.03,.02,.05]],k:.3,resp:1.3},
  {n:'Open mixer',sec:[[.1,.03,.02],[.05,.04,.02]],k:.5,resp:1}
];
/* horns and whistles: partial frequencies, levels, the bell's formant, breath, attack and the pitch scoop as air pressure builds */
const HORNS={
  car:{n:'Car horn',f:[415,520],a:[1,.85],form:2400,fq:1.4,lp:5000,nz:0,att:.012,rel:.04,scoop:0,lvl:.05},
  air:{n:'Air horn',f:[311,370],a:[1,.9],form:1500,fq:.9,lp:4200,nz:.1,att:.07,rel:.18,scoop:.07,lvl:.065},
  loco:{n:'Five-chime horn',f:[311,370,415,494,622],a:[1,.9,.85,.8,.65],form:1700,fq:.8,lp:4500,nz:.06,att:.12,rel:.25,scoop:.05,lvl:.04},
  steam:{n:'Steam whistle',f:[440,554,659],a:[1,.85,.7],whistle:1,lp:6000,nz:.7,att:.18,rel:.3,scoop:.09,lvl:.07},
  ship:{n:'Ship horn',f:[87,130.5],a:[1,.45],form:320,fq:.7,lp:900,nz:.03,att:.35,rel:.6,scoop:.03,lvl:.12}
};
const BELL=[[205,.4,2.2],[410,1,1.6],[488,.5,1.2],[615,.35,.9],[820,.45,.8],[1030,.25,.5],[1240,.2,.35]];
const BEEP=[[1050,1,9],[3150,.28,9],[5250,.12,9]];
const NOFX={};
function pipeGeom(c,bank){
  const X=EXH[c.ex|0]||EXH[0],P=X.sec.map(s=>s.slice()),L=c.exLen||1;
  /* tuned primaries get shorter as the engine revs higher */
  if(X.tune)P[0][0]*=clamp(Math.pow(7000/c.redline,.7),.5,1.25);
  /* the second bank's primaries are longer: equal-length headers tidy that up, a boxer keeps its rumble */
  if(bank){P[0][0]+=c.split*(X.tuned&&!c.rumble?.4:1);if(c.dual)P[Math.min(3,P.length-1)][0]+=.16;}
  if(c.turbo&&X.tune)P.splice(2,0,[.1,.032,.5]); /* the turbine: a lossy throat that swallows the crackle */
  for(const s of P)s[0]*=L;
  return P;
}
function intakeGeom(c){const I=INTAKES[c.intake|0]||INTAKES[0];return I.sec.map(s=>[s[0]*clamp(Math.pow(7000/c.redline,.5),.6,1.2),s[1],s[2]]);}
const hermite=(y0,y1,y2,y3,f)=>{const c1=.5*(y2-y0),c2=y0-2.5*y1+2*y2-.5*y3,c3=.5*(y3-y0)+1.5*(y1-y2);return ((c3*f+c2)*f+c1)*f+y1;};
/* band-limited sawtooth (polyBLEP), for horns */
const blep=(ph,dt)=>{let v=2*ph-1;if(ph<dt){const t=ph/dt;v-=t+t-t*t-1;}else if(ph>1-dt){const t=(ph-1)/dt;v-=t*t+t+t+1;}return v;};
const bank0=()=>({e1:0,e2:0,u1:0,u2:0,env:0,kn:0,j1:0,j2:0,c1:0,c2:0,dc:0});

class EngineDSP{
  constructor(sr){
    this.sr=sr;this.t=0;this.cfg=null;this.pend=null;
    this.p={on:0,firing:0,crank:0,crankT:0,rpm:0,load:0,cutFrac:0,boost:0,nos:0,speed:0,gear:0,twostep:0,antilag:0,view:0,dist:3,pan:0,rear:1,vol:1,jake:0,horn:0,fx:NOFX};
    this.rpm=0;this.load=0;this.ph=0;this.ei=0;this.idleW=1;this.kOn=0;this.und=.3;this.pl=0;this.crk=0;
    this.bs=[bank0(),bank0()];
    this.bg=[{a1:0,a2:0,an:0,d1:0,d2:0,dn:0},{a1:0,a2:0,an:0,d1:0,d2:0,dn:0}];
    this.dc={d1:0,d2:0,d3:0,d4:0,de:0,dk:0,dj1:0,dj2:0,dc1:0,dc2:0,ddc:0};
    this.pq=[];this.vox=[];this.tones=[];
    const B=()=>new Biquad();
    this.f={rasp:B().set(BP,2400,.55,sr),roar:B(),rush:B(),sup:B(),nos:B().set(BP,3800,1.2,sr),start:B().set(LP,900,1.4,sr),
      hpL:B().set(HP,28,.7,sr),hpR:B().set(HP,28,.7,sr),lpL:B(),lpR:B(),lpI:B(),lpI2:B(),
      mech1:B(),mech2:B(),airN:B().set(HP,1800,.7,sr),
      chN:B().set(LP,1700,.7,sr),chB:B().set(BP,320,.9,sr),chL:B().set(LP,170,.8,sr),blow:B().set(LP,500,.7,sr),drN:B().set(BP,3200,.9,sr),safN:B().set(BP,3600,.8,sr),safH:B().set(HP,6000,.7,sr),
      impLo:B(),impMid:B(),impHi:B(),
      hornF:B(),hornL:B(),hornN:B(),wh:[B(),B(),B()],
      fanN:B().set(LP,1100,.6,sr),hydN:B().set(BP,2600,.9,sr),relN:B().set(BP,3400,7,sr),trkN:B().set(BP,1250,1.2,sr),
      chainN:B().set(BP,4200,1.3,sr),cutN:B().set(BP,1700,.9,sr),cutL:B().set(LP,500,.7,sr),bladeN:B().set(LP,750,.7,sr),grassN:B().set(BP,2300,.8,sr),
      washN:B().set(LP,420,.6,sr),propN:B().set(LP,140,1.2,sr)};
    this.g={og:0,ov:0,exG:0,inG:0,drive:1,post:1,rasp:0,roar:0,tw:0,rush:0,sup:0,gw:0,nos:0,st:0,fade:0,pan:0,gd:1,mech:0,
      drain:0,saf:0,blow:0,fan:0,hyd:0,flow:0,rel:0,swing:0,trk:0,chain:0,cut:0,blade:0,grass:0,alt:0,prop:0,wash:0};
    this.T={};for(const k in this.g)this.T[k]=this.g[k];
    this.ph1=0;this.ph2=0;this.ph3=0;this.phS=0;this.phG=0;this.phSt=0;this.phAm=0;
    this.phF=0;this.phH=0;this.phR=0;this.phSw=0;this.phC=0;this.phB=0;this.phA=0;this.phP=0;this.phSf=0;
    this.hPh=new Float64Array(6);this.hg=0;this.hT=0;this.hk=null;
    this.iLo=0;this.iMid=0;this.iHi=0;this.iN=0;this.iAct=0;this.kIL=1;this.kIM=1;this.kIH=1;
    this.railPos=0;this.trk=[0,.09];this.grassE=0;
    this.xd={n:64,a:new Float64Array(64),b:new Float64Array(64),w:0,d:6,x:.9};
    this.dn=1<<15;this.dlL=new Float64Array(this.dn);this.dlR=new Float64Array(this.dn);this.dw=0;this.dS=3;this.airL=0;this.airR=0;this.aa=1;
    this.stats={pops:0,fires:0};
    this.ks=1-Math.exp(-1/(.012*sr));       /* per-sample smoothing for gains, ~12 ms */
    this.kd=1-Math.exp(-1/(.06*sr));        /* listener distance, ~60 ms */
    this.dIN=Math.exp(-1/(.0015*sr));
  }
  /* ---------- control from the main thread ---------- */
  configure(c){
    if(!this.cfg){this._apply(c,false);this.g.fade=0;this.T.fade=1;return;}
    const geo=k=>JSON.stringify([k.kind,k.layout,k.ex,k.exLen,k.intake,k.disp,k.redline,!!k.turbo,k.split,k.dual,k.rumble]);
    if(geo(c)!==geo(this.cfg)){this.pend=c;this.T.fade=0;}else this._apply(c,true);
  }
  set(p){this.p=p;if(!p.fx)p.fx=NOFX;if(p.jump)this.dS=p.dist;}
  event(e){
    const T=this.t,sr=this.sr;
    if(e.type==='bov'){
      const k=clamp((this.p.boost||0)/.9,.35,1.3);
      if(e.flutter){for(let i=0;i<10;i++)this._vox(T+(.015+i*.036*(1+i*.07))*sr,.026,.3*k*Math.pow(.82,i),1500-i*50,1100-i*40,BP,2.4);this._vox(T,.18,.16*k,700,300,LP,.7);}
      else{this._vox(T,.42,.26*k,5200,1400,BP,.9);this._vox(T,.12,.12*k,9000,6000,HP,.7);}
    }else if(e.type==='pop')this._bang(Math.random()<.5?0:1,e.k||.8);
    else if(e.type==='shift'){if(this.cfg&&this.cfg.ex>=1&&this.cfg.ex<=7)this._bang(Math.random()<.5?0:1,.5);}
    else if(e.type==='purge'){this._vox(T,1.1,.32,7000,3000,HP,.7);this._vox(T,.9,.2,2600,900,BP,.8);}
    /* air brakes: a soft hiss as they go on, the big release, and the dryer purging after the compressor cuts out */
    else if(e.type==='airApply'){this._vox(T,.35,.07,2600,1800,BP,1);}
    else if(e.type==='airRelease'){this._vox(T,.75,.34,5200,2300,BP,.75);this._vox(T,.3,.12,9000,5000,HP,.7);}
    else if(e.type==='airDryer'){this._vox(T,.07,.5,8000,5000,HP,.7);this._vox(T,.6,.4,4200,1600,BP,.7);}
    /* a pull cord: the rope zips out and the pawls ratchet on the flywheel */
    else if(e.type==='pull'){this._vox(T,.34,.16,700,2400,BP,1.6);for(let i=0;i<6;i++)this._imp(T+(.03+i*.045)*sr,[0,.12,.25]);}
    /* the Westinghouse pump on a steam loco: a thump at the end of each stroke and a puff of exhaust */
    else if(e.type==='pump'){this._imp(T,[.6,.35,.08]);this._vox(T+.02*sr,.22,.1,1100,500,BP,.8);}
    else if(e.type==='bell'){this._tone(T,BELL,0,0,1,.05);}
    else if(e.type==='beep'){this._tone(T,BEEP,.004,.42,.015,.035);}
    else if(e.type==='clank'){this._imp(T,[e.lo||.3,e.mid||.4,e.hi||.2]);}
    else if(e.type==='trip'){this._imp(T,[.5,.6,.5]);this._vox(T,.08,.25,5000,3000,BP,1.5);}
  }
  takeStats(){const s=this.stats;if(!s.pops&&!s.fires)return null;this.stats={pops:0,fires:0};return s;}
  _apply(c,soft){
    const prev=this.cfg;this.cfg=c;const sr=this.sr,X=EXH[c.ex|0]||EXH[0],K=X.k,tb=!!c.turbo&&!!X.tune,ch=c.ch;
    this.k={ex:K[0],drive:K[1],bright:K[2]*(tb?.82:1)*ch.bright,rasp:K[3]*(tb?.6:1)*ch.rasp,pop:K[4],
      inl:(INTAKES[c.intake|0]||INTAKES[0]).k,crackle:c.crackle*K[5]*(tb?.75:1),whine:c.gearWhine?1:.15,gain:c.gain||1};
    this.hk=HORNS[c.horn]||null;
    const f=this.f,mt=c.mechTone||2600,im=c.imp||{};
    f.mech1.set(BP,mt,1.2,sr);f.mech2.set(BP,mt*2.3,1.6,sr);
    f.impLo.set(BP,im.lo||85,im.qlo||2,sr);f.impMid.set(BP,im.mid||520,im.qmid||5,sr);f.impHi.set(BP,im.hi||2200,im.qhi||9,sr);
    this.kIL=1/f.impLo.b0;this.kIM=1/f.impMid.b0;this.kIH=1/f.impHi.b0;
    if(this.hk){const H=this.hk;if(H.whistle)H.f.forEach((fr,i)=>f.wh[i].set(BP,fr,14,sr));else f.hornF.set(BP,H.form,H.fq,sr);f.hornL.set(LP,H.lp,.7,sr);f.hornN.set(BP,H.form||2000,.7,sr);}
    if(soft&&prev&&prev.layout===c.layout&&prev.kind===c.kind)return;
    this.wgA=new Waveguide(pipeGeom(c,0),sr);this.wgB=new Waveguide(pipeGeom(c,1),sr);this.wgI=new Waveguide(intakeGeom(c),sr,.8,-.85);
    this.gEx=1/pulsePeak(irOf(pipeGeom(c,0),sr),sr);this.gIn=1/pulsePeak(irOf(intakeGeom(c),sr,.8,-.85),sr);
    /* twin pipes sit apart; a single tip is close to mono */
    this.xd.d=Math.round((c.dual?3.5e-4:1.2e-4)*sr);this.xd.x=c.dual?.5:.92;this.xd.a.fill(0);this.xd.b.fill(0);
    for(let i=0;i<2;i++)this.bs[i]=bank0();for(const b of this.bg){b.a1=b.a2=b.an=0;}
    for(const k of ['hpL','hpR','lpL','lpR','lpI','lpI2'])this.f[k].reset();
    this.ei=c.ang.findIndex(a=>a>this.ph);if(this.ei<0)this.ei=c.ang.length;
    /* bigger cylinders blow down for longer */
    const cylL=Math.max(.02,(c.disp||2)/Math.max(1,c.cyl||c.ang.length));this.tsK=clamp(Math.pow(cylL/.5,.12),.7,3);
  }
  /* noise voice: an enveloped, swept, filtered noise burst (blow-off, flutter, purge, air brakes) */
  _vox(t0,dur,vol,f0,f1,type,q){
    if(this.vox.length>40)this.vox.shift();const sr=this.sr,N=Math.max(8,Math.round(dur*sr)),att=Math.round(.004*sr);
    this.vox.push({t0:Math.round(t0),N,att,e:1e-4,mA:Math.pow(vol/1e-4,1/att),mD:Math.pow(1e-4/vol,1/Math.max(1,N-att)),f0,f1,type,q,bq:new Biquad().set(type,f0,q,sr)});
  }
  /* struck tone: a bell, a beeper. partials = [[Hz, level, decay s], ...] */
  _tone(t0,partials,att,hold,rel,lvl){
    if(this.tones.length>12)this.tones.shift();const sr=this.sr;
    this.tones.push({t0:Math.round(t0),f:partials.map(p=>p[0]/sr),a:partials.map(p=>p[1]),e:partials.map(()=>1),d:partials.map(p=>Math.exp(-1/(p[2]*sr))),ph:partials.map(()=>Math.random()),
      att:Math.max(1,att*sr),hold:hold*sr,rel:Math.max(1,rel*sr),end:(att+hold)*sr+Math.max(rel*6,Math.max(...partials.map(p=>p[2]))*5)*sr,lvl});
  }
  /* an impact into three resonators: a thump, a clank and a ring (rail joints, track plates, rods, latches) */
  _imp(at,a){if(this.pq.length>96)return;this._ins({at:Math.round(at),kind:2,a});}
  _ins(e){let i=this.pq.length;while(i>0&&this.pq[i-1].at>e.at)i--;this.pq.splice(i,0,e);}
  /* a bang in the pipe: a hard pressure spike with a ragged tail, sometimes a double or a triple */
  _bang(b,k,extra=true){
    const s=this.bg[b],sr=this.sr,rate=.75+.5*Math.random(),tr=4e-5/rate,td=5e-4/rate,A=k*this.k.pop*1.6;
    s.d1=Math.exp(-1/(td*sr));s.d2=Math.exp(-1/(1/(1/tr+1/td)*sr));s.dn=Math.exp(-1/(6e-3/rate*sr));
    s.a1+=A;s.a2+=A;s.an+=A;this.stats.pops++;
    if(extra){const r=Math.random();if(r<.4)this._sched(this.t+(.005+Math.random()*.022)*sr,b,k*(.35+.5*Math.random()),0);if(r<.15)this._sched(this.t+(.02+Math.random()*.03)*sr,b,k*(.3+.4*Math.random()),0);}
  }
  _sched(at,b,k,kind){if(this.pq.length>64)return;this._ins({at:Math.round(at),b,k,kind});}
  _burst(expect,k,n){let c=Math.floor(expect)+(Math.random()<expect%1?1:0);while(c-->0)this._sched(this.t+Math.random()*n,Math.random()<.5?0:1,k,0);}
  /* one cylinder's exhaust valve cracks open (or one end of a steam cylinder exhausts) */
  _fire(i){
    const c=this.cfg,p=this.p,b=c.bank[i],base=c.amp[i],R=Math.random,s=this.bs[b],sr=this.sr;let A;
    this.stats.fires++;
    if(c.kind==='steam'){
      /* steam: the exhaust beat up the blast pipe. Regulator and cut-off set how hard it is */
      A=p.firing?base*(.05+.95*this.kOn)*(1+c.ch.scatter*(R()-.5)):0;
      s.c1+=A;s.c2+=A;s.e1+=A*.5;s.e2+=A*.5;s.env+=A;
      if(p.fx.drain)s.dc+=.5+.5*this.kOn;
      /* the rods knock as each piston passes dead centre */
      const k=clamp(this.rpm/150,.15,1)*(c.clank||1);this._imp(this.t+R()*.003*sr,[.12*k,.35*k,.22*k]);
      return;
    }
    /* compression-release brake: the exhaust valve is cracked at the top of compression and the air dumps at 35 bar */
    const jk=p.jake>0&&c.jake&&this.load<.08&&this.rpm>c.idle*1.4&&(p.jake>=3||(i%3)<p.jake);
    if(jk){A=base*(1.05+.15*R());s.j1+=A;s.j2+=A;s.env+=A*1.6;return;}
    if(p.crank&&c.starter==='air')this._vox(this.t,.11,.16,2600,1700,BP,1.1);
    if(!p.firing||R()<p.cutFrac){
      /* no combustion: the piston still pumps air, and unburnt fuel can light off in the pipe */
      A=base*.1*(.8+.4*R());
      if(c.mechAll&&p.firing)this._imp(this.t,[.04,.28*c.mech,.06*c.mech]);
      if(p.firing&&!c.diesel&&R()<.1*this.k.crackle+(p.twostep||p.antilag?.12:0))this._sched(this.t+(.0012+R()*.004)*sr,b,.5+.6*R(),0);
    }else{
      const r1=R(),sc=c.ch.scatter,kOn=this.kOn;
      const on=base*(1-sc*.5+sc*r1)*(1+.5*Math.min(p.boost||0,2.5)+(p.nos?.35:0));
      /* off load a petrol engine breathes past a closed throttle; a diesel has no throttle and simply stops injecting */
      const off=c.diesel?base*(.4+.12*r1):base*(.32+.55*r1*r1)*(.7+.3*Math.min(1,this.rpm/c.redline*1.5));
      A=off+(on-off)*kOn;
      /* lumpy cams (and rotaries) idle unevenly: weak cycles, the odd near-misfire */
      const lope=c.lope*this.idleW;if(lope>0){A*=1+lope*(R()-.5)*5;if(R()<lope*1.6)A*=.2;}
      /* on overrun, now and then the thin charge lights off late in the header: the burble */
      if(!c.diesel&&kOn<.5&&R()<(.02+.08*this.k.crackle)*(1-kOn*2))this._sched(this.t+(.0014+R()*.003)*sr,b,(.45+.6*R())*.35,1);
      /* combustion knock radiated by the block: the diesel clatter */
      if(c.mech>0)s.kn+=base*(.35+.65*kOn)*(c.diesel?1:.5);
      if(c.mechAll)this._imp(this.t,[.25,.2*c.mech,.45*c.mech]);
    }
    const u=this.und;s.e1+=A;s.e2+=A;s.u1+=A*u;s.u2+=A*u;s.env+=A;
  }
  process(L,R,n){for(let o=0;o<n;o+=128)this._block(L,R,o,Math.min(128,n-o));}
  _block(OL,OR,o,n){
    if(!this.cfg){for(let i=0;i<n;i++){OL[o+i]=0;OR[o+i]=0;}this.t+=n;return;}
    /* a new engine waits until the old one has faded out, then swaps in at a block boundary */
    if(this.pend&&this.g.fade<.002){this._apply(this.pend,false);this.pend=null;this.T.fade=1;}
    const c=this.cfg,p=this.p,fx=p.fx||NOFX,sr=this.sr,bt=n/sr,T=this.T,g=this.g,f=this.f,k=this.k,steam=c.kind==='steam';
    /* ---- block-rate state ---- */
    const r0=this.rpm,rT=p.on||p.crank?Math.max(0,p.rpm):0;this.rpm+=(rT-this.rpm)*(1-Math.exp(-bt/.01));const r1=this.rpm;
    const cut=p.cutFrac>.5;this.load+=((p.load||0)-this.load)*(1-Math.exp(-bt/(cut?.003:.02)));
    const L=this.load,rpm=Math.max(r1,1),x=rpm/c.redline;
    this.idleW=steam?0:1-clamp((rpm-c.idle)/(c.idle*.7+1),0,1);
    this.kOn=p.firing?Math.max(Math.pow(L,.6),this.idleW*.55):0;const kOn=this.kOn,lw=Math.max(L,this.idleW*.3,p.firing?.3*Math.min(1,x):0);
    /* pulse shape: crank-angle-ish at idle, tighter with revs, longer for big cylinders */
    const ts=clamp(Math.pow(3000/Math.max(rpm,30),.6),.26,14)*this.tsK;
    let tr=lerp(.22e-3,.1e-3,kOn)*ts*c.ch.tr,td=lerp(1.1e-3,1.5e-3,kOn)*ts*c.ch.td;
    if(steam){const cl=clamp((fx.cutoff||.4)*30/Math.max(rpm,8)*.6+.012,.02,.45)*c.ch.td;td=cl*.55;tr=cl*.12;
      this.dc.dc1=Math.exp(-1/(cl*.42*sr));this.dc.dc2=Math.exp(-1/(cl*.07*sr));}
    const td3=2.7*td,dc=this.dc;
    dc.d1=Math.exp(-1/(td*sr));dc.d2=Math.exp(-1/(sr/(1/tr+1/td)));dc.d3=Math.exp(-1/(td3*sr));dc.d4=Math.exp(-1/(sr/(1/td+1/td3)));dc.de=Math.exp(-1/(2e-3*ts*sr));
    dc.dk=Math.exp(-1/(1.3e-3*sr));dc.dj1=Math.exp(-1/(8e-4*sr));dc.dj2=Math.exp(-1/(5e-5*sr));dc.ddc=Math.exp(-1/(.22*sr));
    this.und=lerp(.16,.3,kOn);
    const view=p.view|0,cab=view===1,rear=p.rear===undefined?1:p.rear,vol=p.vol===undefined?1:p.vol;
    const jkOn=p.jake>0&&c.jake&&L<.08&&rpm>c.idle*1.4;
    T.drive=k.drive*(.5+.9*lw*Math.min(1,x*1.2))*(1+.25*Math.min(p.boost||0,2))*(jkOn?1.5:1);T.post=1/(.6+.5*k.drive);
    f.lpL.set(LP,clamp((700+(1800+7000*lw)*x+(jkOn?2500:0))*k.bright*(cab?.45:1)*(.75+.35*rear),250,17000),.6,sr);f.lpR.b0=f.lpL.b0;f.lpR.b1=f.lpL.b1;f.lpR.b2=f.lpL.b2;f.lpR.a1=f.lpL.a1;f.lpR.a2=f.lpL.a2;
    T.exG=k.ex*(cab?.6:1)*(.75+.35*rear);
    T.rasp=jkOn?.45*clamp(k.rasp*4,.4,1.2):k.rasp*lw*Math.min(1.2,x*x*1.4);
    T.inG=k.inl*(.12+.88*L)*(.35+.65*x)*(cab?2:1)*(.7+.5*(1-rear));
    f.lpI.set(LP,3500,.5,sr);f.lpI2.set(LP,3500*(cab?.7:1),.5,sr);
    T.roar=k.inl*.09*L*x*(cab?1.6:1);f.roar.set(BP,380+rpm*.12,.8,sr);
    T.mech=(c.mech||0)*.32*(cab?1.8:1)*(view===2?.75:1);
    /* forced induction and gears */
    const b=c.fiBoost>0?clamp((p.boost||0)/Math.max(.3,c.fiBoost),0,1.3):0,twK=c.twK||1;
    this.fw=(900+b*4200+rpm*.05)*(c.twF||1);
    T.tw=c.turbo?b*b*.04*(.35+.65*L)*twK*(cab?1.4:1):0;T.rush=c.turbo?b*.04*L*Math.sqrt(twK)+(p.antilag?b*.02:0):0;f.rush.set(BP,1300+b*2400,1.1,sr);
    if(c.sup==='roots'){this.fs=rpm*.13;f.sup.set(BP,rpm*.26,1.1,sr);T.sup=.07*Math.pow(clamp(x,0,1.1),1.2)*(.45+.55*L);}
    else if(c.sup==='screw'){this.fs=rpm*.24;f.sup.set(BP,rpm*.245,2.5,sr);T.sup=.055*Math.pow(clamp(x,0,1.1),1.3)*(.45+.55*L);}
    else if(c.sup==='cent'){this.fs=700+5200*x*x;T.sup=.05*x*x*(.3+.7*L);}
    else T.sup=0;
    /* gear whine: off the crank, or (on a locomotive) the traction motor gears, off road speed */
    const spd=p.speed||0;
    if(c.gwSpeed){this.fg=spd*c.gwSpeed;T.gw=.05*clamp(spd/12,0,1)*(.3+.7*L)*(cab?1.6:1);}
    else{this.fg=rpm/60*23;T.gw=k.whine*.026*clamp(spd/30,0,1)*(.4+.6*L)*(cab?1.8:1);}
    T.nos=p.nos?.06:0;
    T.st=p.crank&&(c.starter==='elec'||c.starter==='air')?.5:0;const sf=c.stF||1;this.fSt=(90+60*Math.min(1,(p.crankT||0)/.8))*sf;this.fAm=(6+6*Math.min(1,(p.crankT||0)/.8))*Math.sqrt(sf);
    T.og=.42*vol*(.32+.22*L+.75*Math.pow(Math.min(1.05,x),1.4))*k.gain*(p.on||p.crank?1:0)+(p.crank?.25:0);
    T.ov=.42*vol*k.gain*(p.on||p.crank?1:0);
    if(jkOn)T.og*=1.45;
    /* ---- machinery layers ---- */
    T.drain=fx.drain?.5:0;T.saf=(fx.safety||0)*.16;T.blow=(fx.blower||0)*.4;
    T.fan=(fx.fan||0)*.1;this.ffan=(fx.fanHz||170)/sr;
    T.hyd=(fx.hyd||0)*.05*(cab?1.5:1);T.flow=(fx.flow||0)*.05;this.fhy=rpm/60*9/sr;
    T.rel=(fx.relief||0)*.07;T.swing=(fx.swing||0)*.035;this.fsw=(260+520*(fx.swing||0))/sr;
    T.trk=(fx.trackV||0)*.03;
    T.chain=(fx.chain||0)*.06;this.fch=(fx.chainV||0)/.033/sr;T.cut=(fx.cut||0)*.11;
    T.blade=(fx.blade||0)*.07;this.fbl=rpm/60*2/sr;T.grass=(fx.grass||0)*.08;
    T.alt=(fx.elec||0)*.05+(fx.alt?.008:0);this.falt=(fx.ef||60)/sr;
    T.prop=(fx.prop||0)*.1;T.wash=(fx.wash||0)*.14;this.fprop=rpm/60*(fx.blades||5)/sr;
    const hk=this.hk,hornOn=hk&&p.horn&&(p.on||p.crank)?1:0;
    /* the listener: distance, air, pan */
    const dT=Math.max(.5,p.dist||3);this.aa=1-Math.exp(-TAU*clamp(21000/(1+this.dS/28),900,20000)/sr);
    T.pan=clamp(p.pan||0,-1,1);T.gd=clamp(3/Math.max(this.dS,.6),0,2.4)*(view===2?1.5:1);
    const width=clamp(5/Math.max(this.dS,1),.15,1);
    /* events fired into the pipes */
    if(!c.diesel&&!steam){
      if(this.pl>.5&&L<.15&&x>.45&&k.crackle>0)this.crk=Math.max(this.crk,.25+Math.random()*.5*k.crackle);
      if(L<.2&&this.crk>0){this.crk-=bt;this._burst((5+9*k.crackle)*clamp(x*1.3,0,1.2)*(this.crk>.15?1:.45)*bt,.3+.5*Math.random(),n);}else if(L>.3)this.crk=0;
    }
    this.pl=L;
    if(p.antilag&&L<.2&&x>.3)this._burst(14*bt,.8+.4*Math.random(),n);
    if(p.twostep)this._burst(11*bt,.7+.3*Math.random(),n);
    /* rail joints under every axle, track plates over the sprockets, wood chips and grass */
    if(fx.rail&&spd>.3){this.railPos+=spd*bt;const J=c.railJoint||13;
      while(this.railPos>=J){this.railPos-=J;const back=this.railPos/spd,ax=c.axles||[0,2.5];
        for(const d of ax){const dt=d/spd-back;if(dt<0||dt>4)continue;const a=clamp(spd/18,.25,1)*(.75+.5*Math.random());this._imp(this.t+dt*sr,[.7*a,.25*a,.35*a]);}}}
    if(fx.trackV>.02){const v=fx.trackV;for(let q=0;q<2;q++){this.trk[q]+=v*bt*(q?1.03:1);if(this.trk[q]>=.19){this.trk[q]-=.19;const a=clamp(v/1.2,.25,1)*(.6+.6*Math.random());this._imp(this.t+Math.random()*n,[.3*a,.6*a,.3*a]);}}}
    if(fx.cut>.05&&Math.random()<fx.cut*60*bt)this._imp(this.t+Math.random()*n,[0,.03,.12*Math.random()]);
    if(fx.grass>.05){if(Math.random()<fx.grass*45*bt)this._imp(this.t+Math.random()*n,[0,.02,.08*Math.random()]);this.grassE+=((.4+.6*Math.random())-this.grassE)*.3;}
    /* ---- per sample ---- */
    const ang=c.ang,nE=ang.length,A=this.bs[0],B=this.bs[1],GA=this.bg[0],GB=this.bg[1],ks=this.ks,kd=this.kd,xd=this.xd,dl=this.dlL,dr=this.dlR,dn=this.dn,dm=dn-1;
    const gEx=this.gEx,gIn=this.gIn,ftw=this.fw/sr,fsu=(this.fs||0)/sr,fgw=this.fg/sr,fst=this.fSt/sr,fam=this.fAm/sr;
    const twin=!!c.twin,cent=c.sup==='cent',d1=dc.d1,d2=dc.d2,d3=dc.d3,d4=dc.d4,de=dc.de,dk=dc.dk,dj1=dc.dj1,dj2=dc.dj2,dc1=dc.dc1,dc2=dc.dc2,ddc=dc.ddc;
    const minRpm=c.minRpm||25,drainC=(fx.drain&&steam?.5*kOn*(spd<2?1:.4):0),hAtt=hk?1-Math.exp(-1/(hk.att*sr)):0,hRel=hk?1-Math.exp(-1/(hk.rel*sr)):0;
    for(let i=0;i<n;i++){
      g.og+=(T.og-g.og)*ks;g.ov+=(T.ov-g.ov)*ks;g.exG+=(T.exG-g.exG)*ks;g.inG+=(T.inG-g.inG)*ks;g.drive+=(T.drive-g.drive)*ks;g.post+=(T.post-g.post)*ks;
      g.rasp+=(T.rasp-g.rasp)*ks;g.roar+=(T.roar-g.roar)*ks;g.tw+=(T.tw-g.tw)*ks;g.rush+=(T.rush-g.rush)*ks;g.sup+=(T.sup-g.sup)*ks;g.mech+=(T.mech-g.mech)*ks;
      g.gw+=(T.gw-g.gw)*ks;g.nos+=(T.nos-g.nos)*ks;g.st+=(T.st-g.st)*ks;g.fade+=(T.fade-g.fade)*ks*1.5;g.pan+=(T.pan-g.pan)*ks*.25;g.gd+=(T.gd-g.gd)*ks*.25;
      const rpmI=r0+(r1-r0)*(i/n);
      if(rpmI>minRpm&&(p.on||p.crank)){
        this.ph+=rpmI*6/sr;
        while(this.ei<nE&&this.ph>=ang[this.ei])this._fire(this.ei++);
        if(this.ph>=720){this.ph-=720;this.ei=0;while(this.ei<nE&&this.ph>=ang[this.ei])this._fire(this.ei++);}
      }
      while(this.pq.length&&this.pq[0].at<=this.t){const e=this.pq.shift();
        if(e.kind===2){const a=e.a;this.iLo+=a[0];this.iMid+=a[1];this.iHi+=a[2];this.iN+=a[2]*.6;this.iAct=Math.round(sr*.35);}
        else if(e.kind===1){const s=this.bg[e.b];s.d1=Math.exp(-1/(6e-4*sr));s.d2=Math.exp(-1/(sr/(1/6e-5+1/6e-4)));s.dn=Math.exp(-1/(1.5e-3*sr));s.a1+=e.k;s.a2+=e.k;s.an+=e.k*.5;}
        else this._bang(e.b,e.k,true);}
      this.t++;
      const w=Math.random()*2-1,w2=Math.random()*2-1;
      /* blowdown pulses: a fast rise, a decay, and the rarefaction behind it; the jake bark is sharper still */
      let pa=A.e1-A.e2-(A.u1-A.u2)+2.4*(A.j1-A.j2),pb=B.e1-B.e2-(B.u1-B.u2)+2.4*(B.j1-B.j2);
      A.e1*=d1;A.e2*=d2;A.u1*=d3;A.u2*=d4;A.env*=de;B.e1*=d1;B.e2*=d2;B.u1*=d3;B.u2*=d4;B.env*=de;
      A.j1*=dj1;A.j2*=dj2;B.j1*=dj1;B.j2*=dj2;
      const ba=2.4*(GA.a1-GA.a2)+.32*GA.an*w,bb=2.4*(GB.a1-GB.a2)+.32*GB.an*w2;
      GA.a1*=GA.d1;GA.a2*=GA.d2;GA.an*=GA.dn;GB.a1*=GB.d1;GB.a2*=GB.d2;GB.an*=GB.dn;
      let sa,sb;
      if(steam){
        /* the beat: a burst of steam through the blast pipe, with the pressure wave under it */
        const ca=A.c1-A.c2,cb=B.c1-B.c2;A.c1*=dc1;A.c2*=dc2;B.c1*=dc1;B.c2*=dc2;
        const w3=Math.random()*2-1,nn=f.chN.tick(w3)+1.8*f.chB.tick(w3)+4*f.chL.tick(w3);
        g.blow+=(T.blow-g.blow)*ks;
        sa=ca*nn*1.5+pa*.45+(g.blow>1e-5?f.blow.tick(w2)*g.blow:0);sb=cb*nn*1.5+pb*.45;
      }else{const rn=f.rasp.tick(w);sa=pa+rn*A.env*g.rasp+ba;sb=pb+rn*B.env*g.rasp+bb;}
      const xa=this.wgA.tick(sa)*gEx,xb=this.wgB.tick(sb)*gEx;
      xd.a[xd.w]=xa;xd.b[xd.w]=xb;const ri=(xd.w-xd.d+xd.n)%xd.n,da=xd.a[ri],db=xd.b[ri];xd.w=(xd.w+1)%xd.n;
      /* saturation that grows with load, asymmetric so it adds even harmonics */
      let l=xa+db*xd.x,r=da*xd.x+xb;
      l=clamp(l*g.drive,-1,1);r=clamp(r*g.drive,-1,1);
      l=ftanh(1.5*(l+.16*l*l))*1.07*g.post;r=ftanh(1.5*(r+.16*r*r))*1.07*g.post;
      l=f.lpL.tick(f.hpL.tick(l))*g.exG;r=f.lpR.tick(f.hpR.tick(r))*g.exG;
      /* induction: the same pulses through the airbox and runners, plus a pulse-locked roar */
      let m=f.lpI2.tick(f.lpI.tick(this.wgI.tick(pa+pb)*gIn))*g.inG+f.roar.tick(w2)*(A.env+B.env)*g.roar+(ba+bb)*k.pop*.08;
      if(g.mech>1e-5){m+=(f.mech1.tick(w)+.55*f.mech2.tick(w2))*(A.kn+B.kn)*g.mech*3;}
      A.kn*=dk;B.kn*=dk;
      if(c.turbo){this.ph1+=ftw;if(this.ph1>1)this.ph1-=1;this.ph2+=ftw*1.51;if(this.ph2>1)this.ph2-=1;
        let tw=Math.sin(TAU*this.ph1)+.35*Math.sin(TAU*this.ph2);if(twin){this.ph3+=ftw*1.034;if(this.ph3>1)this.ph3-=1;tw+=.8*Math.sin(TAU*this.ph3);}
        m+=tw*g.tw+f.rush.tick(w)*g.rush;}
      if(g.sup>1e-5){this.phS+=fsu;if(this.phS>1)this.phS-=1;m+=(cent?Math.sin(TAU*this.phS)+.3*Math.sin(2*TAU*this.phS):f.sup.tick(2*this.phS-1)*3)*g.sup;}
      if(g.gw>1e-5){this.phG+=fgw;if(this.phG>1)this.phG-=1;m+=(4*Math.abs(this.phG-.5)-1)*g.gw;}
      if(g.nos>1e-5)m+=f.nos.tick(w2)*g.nos*3;
      if(g.st>1e-4){
        if(c.starter==='air')m+=f.airN.tick(w)*g.st*.35;
        else{this.phSt+=fst;if(this.phSt>1)this.phSt-=1;this.phAm+=fam;if(this.phAm>1)this.phAm-=1;m+=f.start.tick(2*this.phSt-1)*(.55+.45*(this.phAm<.5?1:-1))*g.st;}}
      /* ---- the machine around the engine: its own level, not the engine's ---- */
      let mx=0;
      for(let v=this.vox.length-1;v>=0;v--){const o2=this.vox[v],age=this.t-o2.t0;if(age<0)continue;if(age>=o2.N){this.vox.splice(v,1);continue;}
        if((age&31)===0)o2.bq.set(o2.type,o2.f0*Math.pow(o2.f1/o2.f0,age/o2.N),o2.q,sr);o2.e*=age<o2.att?o2.mA:o2.mD;mx+=o2.bq.tick(Math.random()*2-1)*o2.e*3;}
      for(let v=this.tones.length-1;v>=0;v--){const o2=this.tones[v],age=this.t-o2.t0;if(age<0)continue;if(age>o2.end){this.tones.splice(v,1);continue;}
        const env=(age<o2.att?age/o2.att:1)*(age<o2.att+o2.hold?1:Math.exp(-(age-o2.att-o2.hold)/o2.rel));let s=0;
        for(let q=0;q<o2.f.length;q++){o2.ph[q]+=o2.f[q];if(o2.ph[q]>1)o2.ph[q]-=1;s+=o2.a[q]*o2.e[q]*Math.sin(TAU*o2.ph[q]);o2.e[q]*=o2.d[q];}
        mx+=s*env*o2.lvl;}
      if(this.iAct>0){const nb=this.iN*w2;this.iN*=this.dIN;
        mx+=(f.impLo.tick(this.iLo*this.kIL)*.5+f.impMid.tick(this.iMid*this.kIM+nb*.4)*.35+f.impHi.tick(this.iHi*this.kIH+nb)*.3)*.4;
        this.iLo=this.iMid=this.iHi=0;this.iAct--;}
      /* horns and whistles: band-limited saws through the bell, or (a whistle) pure tones with breath */
      this.hg+=(hornOn-this.hg)*(hornOn>this.hg?hAtt:hRel);
      if(this.hg>1e-4){const H=hk;this.hT+=1/sr;const sc=1-H.scoop*Math.exp(-this.hT/.09)*(hornOn?1:0);let s=0;
        if(H.whistle){for(let q=0;q<H.f.length;q++){const dt=H.f[q]*sc/sr;this.hPh[q]+=dt;if(this.hPh[q]>1)this.hPh[q]-=1;s+=H.a[q]*(Math.sin(TAU*this.hPh[q])+.18*blep(this.hPh[q],dt)+H.nz*f.wh[q].tick(w)*3);}
          s=f.hornL.tick(s);}
        else{for(let q=0;q<H.f.length;q++){const dt=H.f[q]*sc/sr;this.hPh[q]+=dt;if(this.hPh[q]>1)this.hPh[q]-=1;s+=H.a[q]*blep(this.hPh[q],dt);}
          s=f.hornF.tick(s)*2+f.hornL.tick(s)*.5+(H.nz?f.hornN.tick(w2)*H.nz*4:0);}
        mx+=s*this.hg*H.lvl*6;}
      else this.hT=0;
      if(T.drain||g.drain>1e-5){g.drain+=(T.drain-g.drain)*ks;mx+=f.drN.tick(w2)*(A.dc+B.dc+drainC)*g.drain*2;}
      A.dc*=ddc;B.dc*=ddc;
      if(T.saf||g.saf>1e-5){g.saf+=(T.saf-g.saf)*ks*.3;this.phSf+=7/sr;if(this.phSf>1)this.phSf-=1;mx+=(f.safN.tick(w)*2+f.safH.tick(w2))*g.saf*(1+.12*Math.sin(TAU*this.phSf));}
      if(T.fan||g.fan>1e-5){g.fan+=(T.fan-g.fan)*ks*.2;this.phF+=this.ffan;if(this.phF>1)this.phF-=1;mx+=(f.fanN.tick(w)*2+.25*Math.sin(TAU*this.phF))*g.fan;}
      if(T.hyd||g.hyd>1e-5){g.hyd+=(T.hyd-g.hyd)*ks*.3;g.flow+=(T.flow-g.flow)*ks*.3;this.phH+=this.fhy;if(this.phH>1)this.phH-=1;const ph=TAU*this.phH;
        mx+=(Math.sin(ph)+.45*Math.sin(2*ph)+.22*Math.sin(3*ph))*g.hyd+f.hydN.tick(w)*g.flow*2;}
      if(T.rel||g.rel>1e-5){g.rel+=(T.rel-g.rel)*ks*.5;this.phR+=(2650+60*w)/sr;if(this.phR>1)this.phR-=1;mx+=(f.relN.tick(w2)*4+.35*Math.sin(TAU*this.phR))*g.rel;}
      if(T.swing||g.swing>1e-5){g.swing+=(T.swing-g.swing)*ks*.1;this.phSw+=this.fsw;if(this.phSw>1)this.phSw-=1;mx+=(Math.sin(TAU*this.phSw)+.3*Math.sin(2*TAU*this.phSw))*g.swing;}
      if(T.trk||g.trk>1e-5){g.trk+=(T.trk-g.trk)*ks*.2;mx+=f.trkN.tick(w)*g.trk*(1+.6*Math.sin(TAU*this.phF*3.1));}
      if(T.chain||g.chain>1e-5){g.chain+=(T.chain-g.chain)*ks*.5;this.phC+=this.fch;if(this.phC>1)this.phC-=1;mx+=f.chainN.tick(w)*(1+.7*(this.phC<.5?1:-1))*g.chain*2;}
      if(T.cut||g.cut>1e-5){g.cut+=(T.cut-g.cut)*ks*.3;mx+=(f.cutN.tick(w2)*(.6+.8*this.phC)*2+f.cutL.tick(w)*1.4)*g.cut;}
      if(T.blade||g.blade>1e-5){g.blade+=(T.blade-g.blade)*ks*.3;this.phB+=this.fbl;if(this.phB>1)this.phB-=1;const sb2=Math.sin(TAU*this.phB);mx+=(f.bladeN.tick(w)*(1+.9*sb2)*1.6+.25*sb2)*g.blade;}
      if(T.grass||g.grass>1e-5){g.grass+=(T.grass-g.grass)*ks*.3;mx+=f.grassN.tick(w2)*this.grassE*g.grass*2.5;}
      if(T.alt||g.alt>1e-5){g.alt+=(T.alt-g.alt)*ks*.1;this.phA+=this.falt;if(this.phA>1)this.phA-=1;const ph=TAU*this.phA;
        mx+=(.35*Math.sin(ph)+Math.sin(2*ph)+.3*Math.sin(3*ph)+.18*Math.sin(6*ph))*g.alt;}
      if(T.prop||T.wash||g.prop>1e-5||g.wash>1e-5){g.prop+=(T.prop-g.prop)*ks*.1;g.wash+=(T.wash-g.wash)*ks*.05;this.phP+=this.fprop;if(this.phP>1)this.phP-=1;
        mx+=f.propN.tick(w)*(1+.8*Math.sin(TAU*this.phP))*g.prop*3+f.washN.tick(w2)*g.wash*2;}
      l=((l+m)*g.og+mx*g.ov)*g.fade;r=((r+m)*g.og+mx*g.ov)*g.fade;
      /* the listener: propagation delay (Doppler falls out of it), air absorption, distance, pan */
      this.dS+=(dT-this.dS)*kd;
      dl[this.dw]=l;dr[this.dw]=r;
      const dly=Math.min(dn-4,this.dS/C_AIR*sr+1),ip=Math.floor(dly),fr=dly-ip,j=this.dw-ip;
      const j0=(j+1)&dm,j1=j&dm,j2=(j-1)&dm,j3=(j-2)&dm;
      l=hermite(dl[j0],dl[j1],dl[j2],dl[j3],fr);r=hermite(dr[j0],dr[j1],dr[j2],dr[j3],fr);
      this.dw=(this.dw+1)&dm;
      this.airL+=this.aa*(l-this.airL);this.airR+=this.aa*(r-this.airR);
      const mid=(this.airL+this.airR)*.5,side=(this.airL-this.airR)*.5*width,th=(g.pan+1)*Math.PI/4;
      l=(mid+side)*Math.cos(th)*1.4142*g.gd;r=(mid-side)*Math.sin(th)*1.4142*g.gd;
      /* a soft knee so nothing ever hard-clips */
      const al=Math.abs(l),ar=Math.abs(r);
      if(al>.9)l=Math.sign(l)*(.9+.1*ftanh((al-.9)*10));if(ar>.9)r=Math.sign(r)*(.9+.1*ftanh((ar-.9)*10));
      OL[o+i]=l;OR[o+i]=r;
    }
  }
}
EngineDSP.EXH=EXH;EngineDSP.INTAKES=INTAKES;EngineDSP.HORNS=HORNS;
return EngineDSP;
}
if(typeof module!=='undefined')module.exports={makeDSP};
