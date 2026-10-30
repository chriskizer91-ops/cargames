#!/usr/bin/env python3
"""The engine's sound, measured offline: the car's own physics on Route 6 at full throttle from rest (and at 30%
   gas), its synth params rendered through the Digital Engine DSP heard as Dirt Sleeper HD heard it (5 m, the
   chase camera's distance clamp) and as the model bay does (the lab's Behind spot, 3 m), then through the body
   settings' filters. Prints level, the share of energy under 250 Hz and the spectral centroid.
   python3 tools/engine_tone.py [car id]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','back-forty.html')
car=sys.argv[1] if len(sys.argv)>1 else ''
JS=r"""async (car)=>{
const g=__game,TAU=Math.PI*2,makeDSP=g.makeDSP,SIM=g.SIM,BODY=g.BODY;g.GAME.hold=true;
if(car){g.APP.car=car;g.spawnRig(false);}
g.goTo('r6e');const t=g.GAME.car;t.pt.start();
const SR=48000,FR=60,N=SR/FR;
/* drive: record the synth params each frame (the physics at its own fixed step inside step()) */
function drive(thr,secs){g.placeCar(t.p[0]<0?70:t.p[0],1.85,0);t.pt.st='run';t.pt.we=t.pt.e.idle*TAU/60;const out=[],ev=[];
  for(let f=0;f<secs*FR;f++){g.GAME.state='drive';g.setTestInput({steer:0,thr,brk:0,hb:0,nos:false});g.step(1/FR);
    const p=Object.assign({},t.pt.soundParams(0,t.speed,{dist:5,pan:0,rear:1}));out.push(p);ev.push(t.pt.takeEvents());}
  return {P:out,E:ev,rpm:out.map(p=>p.rpm),v:t.speed};}
/* render through the DSP heard from dist */
function render(rec,dist){const D=makeDSP(),d=new D(SR);d.configure(SIM.dspCfg(t.spec));const L=new Float32Array(rec.P.length*N),R=new Float32Array(rec.P.length*N),l=new Float32Array(N),r=new Float32Array(N);
  for(let i=0;i<rec.P.length;i++){const p=Object.assign({},rec.P[i],{dist,pan:0,rear:1});for(const e of rec.E[i])d.event(e);d.set(p);d.process(l,r,N);L.set(l,i*N);R.set(r,i*N);}
  const M=new Float32Array(L.length);for(let i=0;i<L.length;i++)M[i]=(L[i]+R[i])*.5;return M;}
/* RBJ biquads, as WebAudio's lowshelf, peaking and highshelf */
function biq(x,type,f0,gdB,Q){const A=Math.pow(10,gdB/40),w=2*Math.PI*f0/SR,c=Math.cos(w),s=Math.sin(w);let b0,b1,b2,a0,a1,a2;
  if(type==='ls'){const al=s/2*Math.sqrt(2),k=2*Math.sqrt(A)*al;b0=A*((A+1)-(A-1)*c+k);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-k);a0=(A+1)+(A-1)*c+k;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-k;}
  else if(type==='hs'){const al=s/2*Math.sqrt(2),k=2*Math.sqrt(A)*al;b0=A*((A+1)+(A-1)*c+k);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-k);a0=(A+1)-(A-1)*c+k;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-k;}
  else{const al=s/(2*Q);b0=1+al*A;b1=-2*c;b2=1-al*A;a0=1+al/A;a1=-2*c;a2=1-al/A;}
  const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=(b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v;}return y;}
function body(x,B){return biq(biq(biq(x,'ls',B.ls[0],B.ls[1]),'pk',B.pk[0],B.pk[1],B.pk[2]),'hs',B.hs[0],B.hs[1]);}
/* metrics over the clip after the first half second: RMS dBFS, energy share under 250 Hz, centroid */
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k],vr=re[i+k+len/2]*cr-im[i+k+len/2]*ci,vi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;
    re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;const t2=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t2;}}}}
function metrics(x){const s=SR/2|0,n=4096;let e=0,cnt=0;for(let i=s;i<x.length;i++){e+=x[i]*x[i];cnt++;}
  let lo=0,tot=0,cw=0;for(let o=s;o+n<=x.length;o+=n){const re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++)re[i]=x[o+i]*(.5-.5*Math.cos(2*Math.PI*i/n));fft(re,im);
    for(let k=1;k<n/2;k++){const p=re[k]*re[k]+im[k]*im[k],f=k*SR/n;tot+=p;cw+=p*f;if(f<250)lo+=p;}}
  let pk=0;for(let i=s;i<x.length;i++)pk=Math.max(pk,Math.abs(x[i]));
  return {rms_dB:+(10*Math.log10(e/cnt)).toFixed(1),peak:+pk.toFixed(2),low250:+(100*lo/tot).toFixed(1)+'%',centroid:Math.round(cw/tot)};}
const res={car:g.APP.car,spec:t.spec.name||t.spec.layout,behindDist:t.spec.behindDist||3};
for(const [name,thr,secs] of [['full gas',1,9],['30% gas',.3,9]]){
  const rec=drive(thr,secs),rp=rec.rpm.filter((x,i)=>i>30);
  const hd=render(rec,5),bay=render(rec,res.behindDist);
  res[name]={rpm_avg:Math.round(rp.reduce((a,b)=>a+b,0)/rp.length),rpm_max:Math.round(Math.max(...rp)),mph_end:+(rec.v*2.237).toFixed(0),
    'HD (5 m)':metrics(hd),'bay mic (3 m)':metrics(bay),'bay mic + Fuller':metrics(body(bay,BODY.full)),'bay mic + Phone speaker':metrics(body(bay,BODY.phone))};}
return res;}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':640,'height':360})
    pg.add_init_script("localStorage.setItem('b40-gfx','mini');")
    pg.goto(PAGE); pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    print(json.dumps(pg.evaluate(JS,car),indent=1))
    b.close()
