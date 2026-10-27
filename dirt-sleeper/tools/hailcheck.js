const fs=require('fs'),spec=require('./spec.js'),SR=48000;
const s=fs.readFileSync(__dirname+'/../src/33_ambience.js','utf8');const A=new Function(s+';return makeAmb')()();
const run=(mk,p,N=SR*5)=>{const a=mk();a.set(p);const L=new Float32Array(N),R=new Float32Array(N);for(let o=0;o<N;o+=128)a.process(L.subarray(o,o+128),R.subarray(o,o+128),128);return L;};
console.log('rain outside ',spec(run(()=>new A(SR),{rain:.7}),SR));
console.log('rain in cab  ',spec(run(()=>new A(SR),{rain:.7,cabin:1}),SR));
// the old gravel layer, rebuilt from git-less memory: clicks at (260+70v)/s, 0.86 decay, BP 2900/6200
const BP=class{constructor(f,q){const w=2*Math.PI*f/SR,al=Math.sin(w)/(2*q),a0=1+al;this.b0=al/a0;this.a1=-2*Math.cos(w)/a0;this.a2=(1-al)/a0;this.x1=this.x2=this.y1=this.y2=0;}run(x){const y=this.b0*x-this.b0*this.x2-this.a1*this.y1-this.a2*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=y;return y;}};
{const N=SR*5,L=new Float32Array(N),f1=new BP(2900,1.3),f2=new BP(6200,1.8);let e=0,a=0;for(let i=0;i<N;i++){const wn=Math.random()*2-1;if(Math.random()<(260+15*70)*.55/SR){e=1;a=.3+Math.random()*.7;}e*=.86;L[i]=(f1.run(wn*e*a)*1.3+f2.run(wn*e*a)*.6)*.88;}console.log('OLD gravel   ',spec(L,SR));}
const fx=fs.readFileSync(__dirname+'/../src/31_audio.js','utf8');const i=fx.indexOf('function makeFX'),j=fx.indexOf('// src/audio/game-audio.js');const F=new Function(fx.slice(i,j)+';return makeFX')()();
{const f=new F(SR);f.set({lat:[0,0,0,0],lon:[0,0,0,0],load:[5000,5000,5000,5000],speed:15,loose:1,sqK:[.06,.06,.06,.06]});const N=SR*5,L=new Float32Array(N),R=new Float32Array(N);f.process(L,R,N);console.log('NEW gravel   ',spec(L,SR));}
