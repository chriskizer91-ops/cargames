/* What the drag engines sound like, offline: each engine's spec (tools/ref/drag_specs.json, written by
   tools/drag_check.py: the SUV with the engine, ram air, zoomies and a race tune) run in the Digital Engine lab's own
   sim (free rev, as the garage's dyno bay runs it), heard from behind (the lab's Behind spot), through the synth,
   then the game's Fuller body EQ and a compressor like the master's (-8 dB, 4:1, 3 ms / 150 ms).
   The script: start it, idle 6 s (the glug), three blips, idle, floor it to the limiter and hold it there a moment,
   lift, idle. Writes a WAV per engine (and the reference: the Sleeper as it comes) and prints idle numbers:
   how much the revs hunt and how unevenly it fires.
   usage: node tools/drag_sound.js [outdir]  */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src','15_digital_engine.js'),'utf8');
const {SIM,makeDSP}=new Function(src+'\nreturn {SIM,makeDSP};')();
const specs=JSON.parse(fs.readFileSync(path.join(__dirname,'ref','drag_specs.json'),'utf8'));
const out=process.argv[2]||'/tmp/drag_sound';fs.mkdirSync(out,{recursive:true});
const SR=48000,FR=120,N=SR/FR,TAU=Math.PI*2;
/* the throttle over time: [until s, throttle] */
const SCRIPT=[[1.6,0],[7.6,0],[7.85,.65],[8.5,0],[8.75,.65],[9.4,0],[9.65,.8],[11.2,0],[13.2,1],[14.4,1],[14.4001,0],[17.5,0]];
const thrAt=t=>{for(const [u,v] of SCRIPT)if(t<u)return v;return 0;};
function biq(x,type,f0,gdB,Q){const A=Math.pow(10,gdB/40),w=2*Math.PI*f0/SR,c=Math.cos(w),s=Math.sin(w);let b0,b1,b2,a0,a1,a2;
  if(type==='ls'){const al=s/2*Math.sqrt(2),k=2*Math.sqrt(A)*al;b0=A*((A+1)-(A-1)*c+k);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-k);a0=(A+1)+(A-1)*c+k;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-k;}
  else if(type==='hs'){const al=s/2*Math.sqrt(2),k=2*Math.sqrt(A)*al;b0=A*((A+1)+(A-1)*c+k);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-k);a0=(A+1)-(A-1)*c+k;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-k;}
  else{const al=s/(2*Q);b0=1+al*A;b1=-2*c;b2=1-al*A;a0=1+al/A;a1=-2*c;a2=1-al/A;}
  const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=(b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v;}return y;}
/* the master's compressor, roughly: a peak-ish detector, -8 dB threshold, 4:1, 6 dB knee */
function comp(x){const at=Math.exp(-1/(.003*SR)),rl=Math.exp(-1/(.15*SR));let env=0;const y=new Float32Array(x.length);
  for(let i=0;i<x.length;i++){const a=Math.abs(x[i]);env=a>env?at*env+(1-at)*a:rl*env+(1-rl)*a;const db=20*Math.log10(env+1e-9),T=-8,K=6;
    let gr=0;if(db>T+K/2)gr=(db-T)*(1-1/4);else if(db>T-K/2){const d=db-T+K/2;gr=(1-1/4)*d*d/(2*K);}y[i]=x[i]*Math.pow(10,-gr/20);}return y;}
function wav(file,x){const n=x.length,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(x[i]*32767))),44+i*2);fs.writeFileSync(file,b);}
const NAMES={ref:'00 Sleeper SUV (reference)',bb572:'01 572 big-cam',ps500:'02 Pro Stock 500',mm820:'03 Mountain Motor 820',pm526:'04 Pro Mod 526 screw blower',tf500:'05 Top Fuel nitro 500'};
for(const id of Object.keys(NAMES)){if(!specs[id])continue;
  const e=SIM.makeSpec(specs[id]),sim=SIM.makeSim(e),D=makeDSP(),d=new D(SR);d.configure(SIM.dspCfg(e));sim.mode='free';sim.start();
  const secs=SCRIPT[SCRIPT.length-1][0],L=new Float32Array(Math.round(secs*SR)),Rr=new Float32Array(L.length),l=new Float32Array(N),r=new Float32Array(N);
  const rpms=[],idleRpm=[];let maxR=0;
  for(let f=0;f*N<L.length-N;f++){const t=f/FR,thr=thrAt(t);sim.step(1/FR,{thr,brk:0,nos:false});for(const ev of sim.events)d.event(ev);sim.events.length=0;
    const p=sim.params(0,1);d.set(p);d.process(l,r,N);L.set(l,f*N);Rr.set(r,f*N);rpms.push(p.rpm);if(t>3&&t<7.5)idleRpm.push(p.rpm);maxR=Math.max(maxR,p.rpm);}
  let m=new Float32Array(L.length);for(let i=0;i<L.length;i++)m[i]=(L[i]+Rr[i])*.5;
  m=biq(biq(biq(m,'ls',140,6),'pk',300,1,.8),'hs',5000,-2);m=comp(m);
  /* one gain for every engine (so the loudness differences stay), then a soft clip as a safety */
  for(let i=0;i<m.length;i++){const v=m[i]*1.6;m[i]=Math.tanh(v);}
  let nan=0,pk=0,e2=0,ei=0,ni=0;for(let i=0;i<m.length;i++){if(!Number.isFinite(m[i])){nan++;m[i]=0;}pk=Math.max(pk,Math.abs(m[i]));e2+=m[i]*m[i];}
  for(let i=3*SR;i<7.5*SR;i++){ei+=m[i]*m[i];ni++;}
  const mean=idleRpm.reduce((a,b)=>a+b,0)/idleRpm.length,lo=Math.min(...idleRpm),hi=Math.max(...idleRpm);
  wav(path.join(out,NAMES[id]+'.wav'),m);
  console.log(`${id.padEnd(6)} idle ${Math.round(mean)} rpm (hunts ${Math.round(lo)}-${Math.round(hi)})  lope ${SIM.dspCfg(e).lope.toFixed(3)}  max ${Math.round(maxR)} rpm  idle level ${(10*Math.log10(ei/ni)).toFixed(1)} dB  whole ${(10*Math.log10(e2/m.length)).toFixed(1)} dB  peak ${pk.toFixed(2)}${nan?'  NaN '+nan:''}`);}
