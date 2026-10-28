// Render every version of every world sound, check levels, CPU and NaNs, and write WAVs for listening.
const fs=require('fs'),path=require('path'),SR=48000,spec=require('./spec.js');
const src=['33_ambience.js','34_mix.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8')).join('\n');
const X=new Function(src+';return {makeAmb,MIX_SOUNDS,MIX_DEFAULT,mixFor,MIX_WORLD,mixFill}')(),A=X.makeAmb();
const OUT=process.env.WAVS||path.join(__dirname,'wav');fs.mkdirSync(OUT,{recursive:true});
const wav=(name,L,R)=>{const n=L.length,b=Buffer.alloc(44+n*4);b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(L[i]*32767))),44+i*4);b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(R[i]*32767))),46+i*4);}fs.writeFileSync(path.join(OUT,name+'.wav'),b);};
const ctx={rain:{rain:.8,storm:1},roof:{rain:.8,cabin:1},thunder:{rain:.5,storm:1},wind:{wind:.6},birds:{birds:1},daybugs:{dayBugs:1},nightbugs:{crickets:1},creek:{creek:1},crowd:{crowd:.8}};
const db=x=>(20*Math.log10(Math.max(1e-9,x))).toFixed(1);
for(const S of X.MIX_SOUNDS.filter(q=>q.bus==='world'&&q.id!=='ui')){
  for(const [v] of (S.vars.length?S.vars:[[null]])){
    const m=X.mixFill({});for(const k in m.s)m.s[k].on=0;m.s[S.id].on=1;if(v)m.s[S.id].v=v;
    const a=new A(SR);a.set(Object.assign({mix:X.mixFor(m,X.MIX_WORLD)},ctx[S.id]||{}));
    if(S.id==='thunder')a.event({type:'thunder',kind:v});if(S.id==='crowd')a.event({type:'cheer',a:1});
    const N=SR*8,L=new Float32Array(N),R=new Float32Array(N),t0=Date.now();
    for(let o=0;o<N;o+=128)a.process(L.subarray(o,o+128),R.subarray(o,o+128),128);
    const ms=Date.now()-t0,sp=spec(L,SR);let pk=0;for(const x of L)pk=Math.max(pk,Math.abs(x));
    console.log((S.id+(v?'/'+v:'')).padEnd(22),'rms',db(sp.rms).padStart(6),'pk',db(pk).padStart(6),'centroid',String(sp.centroid).padStart(5),'crest',String(sp.crest).padStart(4),'cpu',(ms/80).toFixed(1)+'%',L.some(isNaN)?'NaN!':'');
    wav(S.id+(v?'-'+v:''),L,R);
  }
}
