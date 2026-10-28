/* Runs each truck's engine through Digital Engine's sim and synth offline, the way the bay drives
   them (sim.step x4 per frame, params once a frame, synth in 128-sample blocks), and reports power,
   levels and anything broken (NaN, silence, clipping). With --wav DIR it also writes the audio.
   usage: node tools/engine_check.js [--wav DIR] */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Number,String,JSON,Set,Map,isFinite,isNaN};
vm.createContext(ctx);
vm.runInContext(src('15_de_engine.js')+'\n'+src('16_engines.js')+'\nthis.SIM=SIM;this.makeDSP=makeDSP;this.engineSpec=engineSpec;this.ENGINE_OF=ENGINE_OF;',ctx);
const {SIM,makeDSP,engineSpec}=ctx;
const BUILDS=[{id:'stock',name:'Stock',R:.378},{id:'sleeper',name:'Sleeper',R:.372},{id:'crawler',name:'Rock & Mud',R:.47},{id:'race',name:'Race',R:.345}];
const wavDir=process.argv.includes('--wav')?process.argv[process.argv.indexOf('--wav')+1]:null;
if(wavDir)fs.mkdirSync(wavDir,{recursive:true});
const SR=48000,FPS=60,BL=128;
function wav(file,L,R){const n=L.length,b=Buffer.alloc(44+n*4);b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);
  b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
  for(let i=0;i<n;i++){b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(L[i]*32767))),44+i*4);b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(R[i]*32767))),46+i*4);}fs.writeFileSync(file,b);}
/* a script: [seconds, mode, throttle, brake, nos, listener] per segment; 'start' starts the engine */
const SCRIPTS={
  rev:[[3.2,'free',0],[.25,'free',1],[1.2,'free',0],[.25,'free',1],[1.2,'free',0],[2.6,'free',1],[2.2,'free',0]],
  pull:[[3,'free',0],[.1,'drive',0,1],[1.6,'drive',1,1],[9,'drive',1,0],[3,'drive',0]],
  cabin:[[3,'free',0,0,0,1],[2.6,'free',1,0,0,1],[2,'free',0,0,0,1]]
};
function run(b,script){
  const spec=engineSpec({id:b.id,name:b.name,look:{tyre:{R:b.R}}}),sim=SIM.makeSim(spec),D=makeDSP(),d=new D(SR);
  d.configure(SIM.dspCfg(spec));sim.mode='free';sim.start();
  const L=[],R=[],tl=[];let t=0,acc=0,maxRpm=0,maxV=0,shifts=0,lastGear=0;
  const bufL=new Float32Array(BL),bufR=new Float32Array(BL);
  for(const [dur,mode,thr,brk=0,nos=0,lis=0] of script){
    if(mode!==sim.mode){sim.mode=mode;sim.gear=0;sim.clutch='open';sim.shiftT=0;sim.held=false;if(mode==='drive')sim.pos=-120;}
    const frames=Math.round(dur*FPS);
    for(let f=0;f<frames;f++){
      for(let k=0;k<4;k++)sim.step(1/FPS/4,{thr,brk,nos:!!nos});
      for(const e of sim.takeEvents())d.event(e);
      d.set(sim.params(lis,1));
      acc+=SR/FPS;while(acc>=BL){acc-=BL;d.process(bufL,bufR,BL);for(let i=0;i<BL;i++){L.push(bufL[i]);R.push(bufR[i]);}}
      maxRpm=Math.max(maxRpm,sim.rpm);maxV=Math.max(maxV,sim.v);if(sim.gear!==lastGear){if(sim.gear>lastGear&&lastGear>0)shifts++;lastGear=sim.gear;}
      t+=1/FPS;if((f%30)===0)tl.push([+t.toFixed(1),Math.round(sim.rpm),sim.gear,+(sim.v*2.237).toFixed(0),+sim.boost.toFixed(2)]);
    }
  }
  let nan=0,peak=0,ss=0,clip=0;for(let i=0;i<L.length;i++){const a=L[i],c=R[i];if(!isFinite(a)||!isFinite(c)){nan++;continue;}const m=Math.max(Math.abs(a),Math.abs(c));peak=Math.max(peak,m);if(m>.995)clip++;ss+=a*a+c*c;}
  return {spec,L,R,nan,peak,rms:Math.sqrt(ss/(2*L.length)),clip,maxRpm,maxV,shifts,tl};
}
for(const b of BUILDS){
  const r0=run(b,SCRIPTS.rev),e=r0.spec;
  console.log(`\n${b.name}: ${e.layout} ${e.disp} L, ${Math.round(e.peak.hp)} hp @ ${Math.round(e.peak.rpm)}, ${Math.round(e.peak.tq)} N m, redline ${e.redline}, limiter ${e.limiterRpm} (${e.limiter}), fi ${e.fi} ${e.fiBoost}, nos ${e.nosKw} kW, ex ${e.ex}, cam ${e.cam}, gears ${e.gears.join('/')} x ${e.fd}`);
  for(const [name,sc] of Object.entries(SCRIPTS)){
    const r=name==='rev'?r0:run(b,sc);
    console.log(`  ${name.padEnd(5)} rms ${(20*Math.log10(r.rms+1e-12)).toFixed(1)} dBFS  peak ${r.peak.toFixed(3)}  clipped ${r.clip}  NaN ${r.nan}  max ${Math.round(r.maxRpm)} rpm  ${(r.maxV*2.237).toFixed(0)} mph  upshifts ${r.shifts}`);
    if(name==='pull')console.log('        t,rpm,gear,mph,boost: '+r.tl.filter((_,i)=>i%2===0).map(x=>x.join(',')).join('  '));
    if(wavDir)wav(path.join(wavDir,`${b.id}_${name}.wav`),r.L,r.R);
  }
}
