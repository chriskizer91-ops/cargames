// How loud is the engine synth at idle, cruise and redline, per engine and listener position?
const H=require('./harness.js'),g=H.get,SR=48000;
const D=g('makeDSP')(),SIM=H.SIM;
const B=(o)=>Object.assign({},H.STOCK_BUILD,o);
const builds={stock:{},hot62:{engine:'v62',exhaust:'headers',cam:2,tune:2},blown74:{engine:'bb74',power:'roots',exhaust:'straight',cam:3,tune:2},tt35:{engine:'tt35',power:'bigturbo',tune:2},diesel:{engine:'d67',power:'compound',tune:2,exhaust:'stacks'}};
const db=(x)=>(20*Math.log10(Math.max(1e-9,x))).toFixed(1);
for(const [name,o] of Object.entries(builds)){
  const e=g('buildSpec')(B(o)),cfg=SIM.dspCfg(e);
  const row=[name.padEnd(8)];
  for(const [lab,rpm,load,view,dist] of [['idle',e.idle,0.05,0,3],['cruise',e.redline*0.45,0.4,0,3],['redline',e.limiterRpm-60,1,0,3],['redline cab',e.limiterRpm-60,1,1,1.4]]){
    const d=new D(SR);d.configure(cfg);
    const N=SR*3,L=new Float32Array(N),R=new Float32Array(N);
    for(let o2=0;o2<N;o2+=128){const t=o2/SR;d.set({on:1,firing:1,crank:0,rpm:rpm*(1+0.004*Math.sin(t*7)),load,cutFrac:0,boost:SIM.steadyBoost(e,rpm)*load,nos:0,speed:20,gear:3,twostep:0,antilag:0,view,dist,pan:0,rear:1,vol:1});d.process(L.subarray(o2,o2+128),R.subarray(o2,o2+128),128);}
    let pk=0,s=0;for(let i=SR;i<N;i++){pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i]));s+=L[i]*L[i];}
    row.push(`${lab}: rms ${db(Math.sqrt(s/(N-SR)))} pk ${db(pk)}`);
  }
  console.log(row.join(' | '));
}
