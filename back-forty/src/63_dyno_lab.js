/* =====================================================================================
   THE DYNO LAB: the Digital Engine lab's own instruments over the car on the dyno (the bay's Engine panel).
   The lab's tachometer with its fifteen shift lights, the big gear, speed and power, its throttle, boost and
   nitrous bars and its chips; its throttle pad and buttons; its four panels (torque and power, the firing order,
   the pressure at your ear, the spectrogram) and its setup sheet, every one of them driven by the bay's engine:
   the car's own engine as its parts built it, Plus, the dyno pull and the bay's rooms and listening spots.
   The drawing is the lab's, made cheaper for a phone: the dial's face is drawn once and kept, and the glow is a
   wide soft stroke under a sharp one rather than a live blur.
   The setup sheet changes the car's engine for real: the bay's engine follows each slider as it moves, and the
   car you drive takes it a moment after you let go. Each car keeps its own tune for the engine parts it has
   (TUNE in 16_engines); Reset to preset gives the parts' own engine back.
   ===================================================================================== */
const DLC={well:'#07080b',raised:'#181b23',line:'rgba(214,220,255,.09)',line2:'rgba(214,220,255,.17)',ink:'#ecebf3',ink2:'#a09fb3',ink3:'#6b6a80',
  accent:'#ff3d5a',amber:'#ffb43c',a:'#3fd8ff',b:'#ff5ab4',go:'#5dff7a',blue:'#4c86ff'};
const DLF={num:'"Saira Condensed","Arial Narrow",sans-serif',disp:'"Chakra Petch","Arial Narrow",sans-serif'};
const dlA=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
const dlFmt=n=>Math.round(n).toLocaleString('en-US');
const DL={tab:'',cv:{},face:null,faceKey:'',glow:[],crankPh:0,shown:{},ro:{},au:null,lut:null,scopeAmp:0,rows:[],built:false,specKey:'',n:0,tuneT:0,curve:null};
const DL_TABS=[['sheet','Sheet'],['curve','Engine'],['crank','Firing'],['scope','Sound'],['spec','Spectrum'],['tune','Tune']];
const DL_CHIPS=[['lim','Limiter','red'],['step','Two-step','amber',e=>e.launch],['tc','TC','green'],['al','Anti-lag','amber',e=>e.antilag],
  ['nos','Nitrous','cyan',e=>e.nosKw],['jake','Jake','amber',e=>e.jake],['horn','Horn','cyan'],['bang','Bang','red']];

/* ---------- building it ---------- */
function dlBuild(){
  if(DL.built||!$('dl'))return;DL.built=true;
  const tabs=$('dlTabs');
  for(const [id,n] of DL_TABS){const b=document.createElement('button');b.type='button';b.dataset.v=id;b.textContent=n;b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{dlOpen(DL.tab===id?'':id);b.blur();});tabs.appendChild(b);}
  /* the lab's pad: press and hold, higher up for more throttle (a press starts the engine) */
  const pad=$('dlPad'),setPad=e=>{const r=pad.getBoundingClientRect();SHOW.pad=clamp((r.bottom-e.clientY-6)/Math.max(10,r.height-12),0,1);};
  pad.addEventListener('contextmenu',e=>e.preventDefault());
  pad.addEventListener('pointerdown',e=>{e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(_){}SHOW.padOn=true;setPad(e);if(!showRuns())showEngine(true);});
  pad.addEventListener('pointermove',e=>{if(SHOW.padOn)setPad(e);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,()=>{SHOW.padOn=false;});
  dlBuildSetup();
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{dlFit();SHOW.dockTop=undefined;});for(const id of ['dlTach','dlCurve','dlCrank','dlScope','dlSpec','shChartC'])ro.observe($(id));ro.observe(document.querySelector('#dl .dlsheet'));}
  else addEventListener('resize',dlFit);
}
/* open a panel in the cluster's place (or close it: the cluster comes back) */
function dlOpen(tab){
  DL.tab=tab;for(const b of $('dlTabs').children)b.setAttribute('aria-pressed',String(b.dataset.v===tab));
  $('dlClu').hidden=!!tab;$('dlDraw').hidden=!tab;for(const p of $('dlDraw').children)p.hidden=p.dataset.p!==tab;
  PULL.sheet=tab==='sheet';DL.shown={};SHOW.dockTop=undefined;
  if(tab==='tune')dlSyncSetup();
  requestAnimationFrame(()=>{dlFit();if(tab==='sheet')showChart();SHOW.dockTop=undefined;});
}
/* each canvas at the screen's pixels (twice CSS at most) */
function dlFit(){const d=Math.min(2,devicePixelRatio||1);
  for(const id of ['dlTach','dlCurve','dlCrank','dlScope','dlSpec']){const c=$(id);if(!c)continue;const w=Math.max(16,Math.round(c.clientWidth*d)),h=Math.max(16,Math.round(c.clientHeight*d)),ch=c.width!==w||c.height!==h;
    if(ch){c.width=w;c.height=h;}DL.cv[id]={c,x:c.getContext('2d'),w,h,u:d,changed:ch||(DL.cv[id]&&DL.cv[id].changed)};}
  if(PULL.sheet&&SHOW.full)showChart();}

/* ---------- what's on it: the car, its engine, its chips ---------- */
function dlSync(){
  if(!DL.built)return;
  const e=showE();if(!e)return;const rig=rigOf(APP.car),E=ENGINES[rig.engine];DL.specObj=e;DL.carSpec=GAME.car.spec;
  /* (a build the sheet can't tune has no Tune tab) */
  const can=!!(dlBase().layout&&tuneKey(BUILDS[APP.bi])),tb=$('dlTabs').querySelector('[data-v=tune]');if(tb&&tb.hidden===can)tb.hidden=!can;if(!can&&DL.tab==='tune')dlOpen('');
  dlText('dlName',carName({car:APP.car})+' '+rigName(APP.car,rig)+plusTag(APP.car));
  const tag=(E?E.name:'')+(e.tuned||GAME.car.spec.tuned?' · ':''),el=$('dlTag');
  if(DL.ro.tagH!==tag+(e.tuned||GAME.car.spec.tuned)){DL.ro.tagH=tag+(e.tuned||GAME.car.spec.tuned);el.textContent=tag;if(GAME.car.spec.tuned){const t=document.createElement('em');t.textContent='Tuned on the dyno';el.appendChild(t);}}
  /* (a diesel's limiter is its governor, as the lab calls it on the heavy machines) */
  const ch=$('dlChips'),want=DL_CHIPS.filter(c=>!c[3]||c[3](e)).map(c=>c[0]).join()+(e.diesel?'/d':'');
  if(ch.dataset.k!==want){ch.dataset.k=want;ch.textContent='';for(const [k,n,tone,need] of DL_CHIPS){if(need&&!need(e))continue;const s=document.createElement('span');s.dataset.c=k;s.dataset.tone=tone;s.textContent=k==='lim'&&e.diesel?'Governor':n;ch.appendChild(s);}}
  DL.curve=SIM.curve(e,140);DL.glow=new Array((SIM.LAYOUTS[e.layout]||SIM.LAYOUTS.I4).fire.length).fill(0);DL.faceKey='';
  dlInfo(e);if(DL.tab==='tune')dlSyncSetup();
}
function dlText(id,v){if(DL.ro[id]!==v){DL.ro[id]=v;const el=$(id);if(el)el.textContent=v;}}
/* the panels' captions and notes (the lab's syncInfo) */
function dlInfo(e){
  const L=SIM.LAYOUTS[e.layout]||SIM.LAYOUTS.I4,iv=SIM.bankIntervals(L),pk=e.peak||{hp:0,rpm:0,tq:0,tqRpm:0};
  dlText('dlCrankN',L.name+(L.rotary?' · rotor firings':L.stroke2?' · fires every turn':' · '+L.fire.length+' cylinders'));
  const ivs=a=>a.length&&a.every(v=>v===a[0])?'every '+a[0]+'°':a.map(v=>v+'°').join(', ');
  const nt=$('dlCrankNote'),bank=(L.dual||L.bank.some(b=>b))?` <b>Bank A</b> fires ${ivs(iv[0])}. <b>Bank B</b> fires ${ivs(iv[1])}.`:'',html=(L.note||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+bank;
  if(nt.innerHTML!==html)nt.innerHTML=html;
  dlText('dlCurvePk',`${dlFmt(pk.hp)} hp at ${dlFmt(pk.rpm)} · ${dlFmt(pk.tq*.7376)} lb-ft at ${dlFmt(pk.tqRpm)}`);
  dlText('dlCurveNote',e.fi==='none'?(e.diesel?'A diesel makes its torque low and runs out of breath early; the governor stops it just past the rated speed.':'Naturally aspirated. Power keeps climbing until the cams run out of breath near the redline.')
    :e.turbo?(e.diesel?'Boost builds with exhaust energy: fuel and speed together. Below about a third of rated speed it is waiting on the turbo.':`Boost builds from about ${dlFmt(e.s0)} rpm and is all there by ${dlFmt(e.s1)}. Below that you are waiting on the turbo.`)
    :'A crank-driven blower makes boost from just off idle, so the torque arrives at once.');
}

/* ---------- every frame, while the Engine panel is up ---------- */
function dlFrame(dt){
  if(!DL.built)return;
  const sim=SHOW.sim,e=showE();if(!e)return;
  if(DL.specObj!==e||DL.carSpec!==GAME.car.spec)dlSync();
  /* a pull opens the sheet */
  if(PULL.sheet&&DL.tab!=='sheet')dlOpen('sheet');
  if(!DL.cv.dlTach)dlFit();
  const on=!!(SHOW.eng&&sim&&sim.st!=='off'),run=!!(on&&sim.running),drive=SHOW.mode==='drive',rpm=on?Math.max(0,sim.rpmOut||0):0;DL.n++;
  if(!DL.tab&&DL.cv.dlTach)dlTach(DL.cv.dlTach,e,sim,on,rpm);
  /* the readouts (the lab's, in miles an hour) */
  const g=!drive||!on?'N':sim.shiftT>0?'–':sim.gear?(e.bayCvt?'D':String(sim.gear+(e.bayG0||1)-1)):'N';dlText('dlGear',g);
  dlText('dlSpd',dlFmt(drive&&sim?sim.v*2.237:0));
  dlText('dlPwr',dlFmt(run?Math.max(0,SIM.engTq(e,sim.rpm,sim.thr,sim.boost))*sim.rpm*TAU/60/745.7+(sim.nosOn?e.nosKw*1.341:0):0));
  dlMeter(1,true,'Throttle',Math.round((sim?sim.thr:0)*100)+'%',sim?sim.thr:0);
  dlMeter(2,!!e.fiBoost,'Boost',((sim&&sim.boost)||0).toFixed(2)+' bar',((sim&&sim.boost)||0)/(e.fiBoost*1.05||1));
  if(e.nosKw)dlMeter(3,true,'Nitrous',SIM.NOS_SHOTS[e.nos|0]+'-shot',sim?sim.nos:0);
  else if(e.jake)dlMeter(3,true,'Jake brake',['Off','Low','Medium','High'][sim?sim.c.jake|0:0],(sim?sim.c.jake|0:0)/3);else dlMeter(3,false);
  if(sim){const bang=performance.now()-GAME.voice.popT<140,C={lim:sim.cutFrac>.5&&!sim.twostep&&!sim.tcOn&&sim.shiftT<=0||e.diesel&&sim.rpm>e.limiterRpm-60,step:sim.twostep,tc:sim.tcOn,
      al:!!(e.antilag&&e.turbo&&sim.thr<.2&&run&&sim.rpm>e.redline*.3),nos:sim.nosOn,jake:!!sim.jakeOut,horn:sim.hornOn,bang};
    for(const s of $('dlChips').children){const v=!!C[s.dataset.c];if(s.classList.contains('on')!==v)s.classList.toggle('on',v);}}
  /* the drums */
  dlText('dlWhp',dlFmt(drive?SHOW.whp:0));dlText('dlWtq',dlFmt(drive&&rpm>300?SHOW.whp*5252/rpm:0));
  dlText('dlPk',PULL.ph==='roll'?'Rolling up to '+dlFmt(PULL.start)+' rpm':PULL.ph==='pull'?'Pulling, wide open':PULL.ph==='down'?'Coming down':
    SHOW.peak.hp>1&&drive?'Peak '+dlFmt(SHOW.peak.hp)+' whp at '+dlFmt(SHOW.peak.rpm)+' rpm':drive?'Peak –':'Drive puts it on the drums');
  dlText('dlPadHint',on?'Press and hold. Higher up, more throttle.':'Press and hold to start it and rev.');
  /* the open panel (the slow ones every other frame on a phone) */
  const T=DL.tab,slow=touchy&&(DL.n&1);
  if(T==='curve'&&!slow&&DL.cv.dlCurve)dlCurve(DL.cv.dlCurve,e,sim,on);
  else if(T==='crank'&&DL.cv.dlCrank)dlCrank(DL.cv.dlCrank,e,sim,on,rpm,dt);
  else if(T==='scope'&&!slow&&DL.cv.dlScope)dlScope(DL.cv.dlScope,e,sim,on);
  else if(T==='spec'&&DL.cv.dlSpec)dlSpec(DL.cv.dlSpec,e,sim,on,rpm);
}
function dlMeter(i,show,lbl,txt,f){const m=$('dlM'+i);if(m.hidden===show)m.hidden=!show;if(!show)return;dlText('dlL'+i,lbl);dlText('dlT'+i,txt);
  const w=(clamp(f||0,0,1)*100).toFixed(1)+'%';if(DL.ro['f'+i]!==w){DL.ro['f'+i]=w;$('dlF'+i).style.width=w;}}

/* ---------- the tachometer: the lab's dial (its face drawn once and kept), its fifteen shift lights ---------- */
function dlScale(e){const top=e.limiterRpm,cand=[5,10,20,25,50,100,200,250,500,1000,2000,5000];
  const step=cand.find(s=>top*1.05/s<=11)||5000,M=Math.ceil((top+step*.3)/step)*step,div=M>=4000?1000:1;return {step,M,div};}
function dlGeom(o){const w=o.w,h=o.h,u=o.u,n=15,sp=Math.min(w*.86/n,26*u),lr=Math.min(sp*.33,7*u),ly=lr+5*u,top=ly+lr+8*u,R=Math.min(w*.47,(h-top)*.56),cx=w/2,cy=top+R*1.02;
  return {w,h,u,n,sp,lr,ly,R,cx,cy,x0:w/2-sp*(n-1)/2};}
function dlFace(o,e){
  const key=[o.w,o.h,e.redline,e.limiterRpm].join('|');if(DL.faceKey===key&&DL.face)return DL.face;
  const c=DL.face||document.createElement('canvas');c.width=o.w;c.height=o.h;const x=c.getContext('2d'),G=dlGeom(o),{u,R,cx,cy}=G;x.clearRect(0,0,o.w,o.h);
  const {step,M,div}=dlScale(e),a0=PI*.75,a1=PI*2.25,ang=r=>a0+(a1-a0)*clamp(r/M,0,1.015),red=e.redline;
  /* the dial's well: a dark disc so it reads over the studio */
  const bg=x.createRadialGradient(cx,cy,R*.1,cx,cy,R*1.12);bg.addColorStop(0,'rgba(20,23,32,.6)');bg.addColorStop(1,'rgba(7,8,11,0)');x.fillStyle=bg;x.beginPath();x.arc(cx,cy,R*1.12,0,TAU);x.fill();
  x.lineCap='butt';x.lineWidth=1*u;x.strokeStyle=DLC.line2;x.beginPath();x.arc(cx,cy,R,a0,a1);x.stroke();
  x.lineWidth=7*u;x.strokeStyle=dlA(DLC.accent,.85);x.beginPath();x.arc(cx,cy,R*.93,ang(red),a1);x.stroke();
  const minor=step/(String(step)[0]==='2'?4:5);
  for(let r=0;r<=M+1e-6;r+=minor){const a=ang(r),maj=Math.abs(r/step-Math.round(r/step))<1e-6,r0=R*(maj?.83:.89),r1=R*.97,cs=Math.cos(a),sn=Math.sin(a);
    x.lineWidth=(maj?2.2:1)*u;x.strokeStyle=r>=red?DLC.accent:maj?DLC.ink:DLC.ink3;x.beginPath();x.moveTo(cx+cs*r0,cy+sn*r0);x.lineTo(cx+cs*r1,cy+sn*r1);x.stroke();
    if(maj){x.fillStyle=r>=red?DLC.accent:DLC.ink2;x.font=`600 ${Math.round(R*(String(r/div).length>3?.1:.13))}px ${DLF.num}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(r/div),cx+cs*R*.69,cy+sn*R*.69);}}
  x.textAlign='center';x.textBaseline='alphabetic';x.fillStyle=DLC.ink3;x.font=`600 ${Math.round(R*.07)}px ${DLF.disp}`;x.fillText('RPM',cx,cy+R*.76);if(div>1)x.fillText('×1000',cx,cy-R*.3);
  DL.face=c;DL.faceKey=key;return c;
}
function dlTach(o,e,sim,on,rpm){
  const x=o.x,G=dlGeom(o),{u,R,cx,cy,n,sp,lr,ly,x0}=G;x.clearRect(0,0,o.w,o.h);
  x.drawImage(dlFace(o,e),0,0);
  /* shift lights: green, amber, red, all blue and flashing at the shift point */
  const sAt=e.shiftRpm||e.redline*.99,lo=sAt-Math.min(3500,sAt*.42),f=clamp((rpm-lo)/(sAt-lo),0,1),lit=Math.floor(f*n+.001),at=on&&rpm>=sAt-40&&sim.running,blink=(performance.now()/65|0)%2===0;
  for(let i=0;i<n;i++){const col=at?DLC.blue:i<5?DLC.go:i<10?DLC.amber:DLC.accent,lt=at?blink:i<lit,px=x0+i*sp;
    if(lt){x.fillStyle=dlA(col,.22);x.beginPath();x.arc(px,ly,lr*1.9,0,TAU);x.fill();x.fillStyle=col;}else x.fillStyle=dlA(col,.13);
    x.beginPath();x.arc(px,ly,lr,0,TAU);x.fill();}
  const {M}=dlScale(e),a0=PI*.75,a1=PI*2.25,ang=r=>a0+(a1-a0)*clamp(r/M,0,1.015);
  /* the sweep and the needle, each a soft wide stroke under a sharp one (the lab's glow, without a live blur) */
  if(rpm>1){x.lineCap='butt';x.strokeStyle=dlA(DLC.amber,.22);x.lineWidth=9*u;x.beginPath();x.arc(cx,cy,R,a0,ang(rpm));x.stroke();
    x.strokeStyle=DLC.amber;x.lineWidth=3*u;x.beginPath();x.arc(cx,cy,R,a0,ang(rpm));x.stroke();}
  const a=ang(rpm),c=Math.cos(a),s=Math.sin(a);x.lineCap='round';
  x.strokeStyle=dlA(DLC.amber,.25);x.lineWidth=10*u;x.beginPath();x.moveTo(cx-c*R*.12,cy-s*R*.12);x.lineTo(cx+c*R*.9,cy+s*R*.9);x.stroke();
  x.strokeStyle=DLC.amber;x.lineWidth=4*u;x.beginPath();x.moveTo(cx-c*R*.12,cy-s*R*.12);x.lineTo(cx+c*R*.9,cy+s*R*.9);x.stroke();
  x.fillStyle=DLC.raised;x.beginPath();x.arc(cx,cy,R*.085,0,TAU);x.fill();x.strokeStyle=DLC.line2;x.lineWidth=1*u;x.stroke();
  x.textAlign='center';x.textBaseline='alphabetic';x.fillStyle=on?DLC.ink:DLC.ink3;x.font=`700 ${Math.round(R*.25)}px ${DLF.num}`;x.fillText(dlFmt(rpm),cx,cy+R*.6);
}

/* ---------- the lab's panels ---------- */
/* torque and power at the crank, as the parts made them, with where it is now */
function dlCurve(o,e,sim,on){
  const x=o.x,w=o.w,h=o.h,u=o.u,pts=DL.curve;x.clearRect(0,0,w,h);if(!pts)return;
  const l=34*u,rr=w-34*u,t=10*u,b=h-18*u,mt=Math.max(...pts.map(p=>p.tq))*.7376*1.12,mp=Math.max(...pts.map(p=>p.hp))*1.12,M=e.limiterRpm;
  const X=r=>l+(rr-l)*r/M,Yt=v=>b-(b-t)*v/mt,Yp=v=>b-(b-t)*v/mp;
  x.strokeStyle=DLC.line;x.lineWidth=1*u;for(let k=1;k<=4;k++){const y=b-(b-t)*k/4;x.beginPath();x.moveTo(l,y);x.lineTo(rr,y);x.stroke();}
  const step=M>12500?4000:M>8000?2000:M>3000?1000:500;x.fillStyle=DLC.ink3;x.font=`500 ${Math.round(10*u)}px ${DLF.num}`;x.textAlign='center';x.textBaseline='top';
  for(let r=0;r<=M;r+=step)x.fillText(step<1000?(r/1000).toFixed(1):String(r/1000),X(r),b+4*u);
  x.textAlign='right';x.textBaseline='middle';x.fillStyle=DLC.amber;x.fillText(dlFmt(mt/1.12),l-5*u,Yt(mt/1.12));x.fillText('lb-ft',l-5*u,t+4*u);
  x.textAlign='left';x.fillStyle=DLC.accent;x.fillText(dlFmt(mp/1.12),rr+5*u,Yp(mp/1.12));x.fillText('hp',rr+5*u,t+4*u);
  x.fillStyle=dlA(DLC.accent,.08);x.fillRect(X(e.redline),t,rr-X(e.redline),b-t);
  const line=(f,col)=>{x.strokeStyle=col;x.lineWidth=2.2*u;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(X(p.rpm),f(p)):x.moveTo(X(p.rpm),f(p)));x.stroke();};
  line(p=>Yt(p.tq*.7376),DLC.amber);line(p=>Yp(p.hp),DLC.accent);
  const rpm=on?sim.rpm:0;if(rpm>0){const q=pts.reduce((a,p)=>Math.abs(p.rpm-rpm)<Math.abs(a.rpm-rpm)?p:a,pts[0]);
    x.strokeStyle=dlA(DLC.ink,.5);x.lineWidth=1*u;x.beginPath();x.moveTo(X(rpm),t);x.lineTo(X(rpm),b);x.stroke();
    for(const [y,col] of [[Yt(q.tq*.7376),DLC.amber],[Yp(q.hp),DLC.accent]]){x.fillStyle=col;x.beginPath();x.arc(X(rpm),y,3.5*u,0,TAU);x.fill();}}
}
/* the firing order: a slowed-down crank, each cylinder lighting as it fires, and the same cycle unrolled per bank */
function dlCrank(o,e,sim,on,rpm,dt){
  const x=o.x,w=o.w,h=o.h,u=o.u,L=SIM.LAYOUTS[e.layout]||SIM.LAYOUTS.I4,n=L.fire.length;x.clearRect(0,0,w,h);
  const real=rpm*6,dps=rpm>50?Math.min(real,150+420*clamp(rpm/e.redline,0,1)):0,prev=DL.crankPh;DL.crankPh=(DL.crankPh+dps*dt)%720;
  for(let i=0;i<n;i++){const a=L.fire[i],crossed=prev<=DL.crankPh?(a>prev&&a<=DL.crankPh):(a>prev||a<=DL.crankPh);if(crossed&&dps>0)DL.glow[i]=1;DL.glow[i]=(DL.glow[i]||0)*Math.exp(-dt*5);}
  const r=Math.min(h*.36,w*.2),cx=r+18*u,cy=h/2,th=d=>d/720*TAU-PI/2,labels=n<=16;
  x.lineWidth=1*u;x.strokeStyle=DLC.line2;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();
  for(let i=0;i<n;i++){const t=th(L.fire[i]),col=L.bank[i]?DLC.b:DLC.a,gl=DL.glow[i],px=cx+Math.cos(t)*r,py=cy+Math.sin(t)*r;
    if(gl>.05){x.fillStyle=dlA(col,.25*gl);x.beginPath();x.arc(px,py,(7+6*gl)*u,0,TAU);x.fill();}
    x.beginPath();x.arc(px,py,((labels?3.2:2.2)+3.5*gl)*u,0,TAU);x.fillStyle=gl>.05?col:dlA(col,.45);x.fill();
    if(labels){x.fillStyle=gl>.3?DLC.ink:DLC.ink3;x.font=`600 ${Math.round(10*u)}px ${DLF.num}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(L.order[i]),cx+Math.cos(t)*(r+12*u),cy+Math.sin(t)*(r+12*u));}}
  const tn=th(DL.crankPh);x.strokeStyle=DLC.amber;x.lineWidth=2*u;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(tn)*r*.86,cy+Math.sin(tn)*r*.86);x.stroke();
  x.fillStyle=DLC.ink3;x.font=`600 ${Math.round(9*u)}px ${DLF.disp}`;x.textAlign='center';x.textBaseline='middle';x.fillText('720°',cx,cy+r*.35);
  const one=!L.bank.some(b=>b),tx0=cx+r+34*u,tx1=w-8*u,tw=tx1-tx0,rows=one?[[0,'PIPE',DLC.a]]:[[0,'BANK A',DLC.a],[1,'BANK B',DLC.b]],rh=h*.26;
  rows.forEach(([b,lbl,col],k)=>{const y=one?h*.62:h*.3+k*rh*1.25;x.fillStyle=DLC.ink3;x.font=`600 ${Math.round(9*u)}px ${DLF.disp}`;x.textAlign='left';x.textBaseline='bottom';x.fillText(lbl,tx0,y-rh*.55);
    x.strokeStyle=DLC.line;x.lineWidth=1*u;x.beginPath();x.moveTo(tx0,y);x.lineTo(tx1,y);x.stroke();
    for(let i=0;i<n;i++){if(L.bank[i]!==b)continue;const px=tx0+L.fire[i]/720*tw,gl=DL.glow[i],bw=Math.min(9*u,tw/n*.8);x.fillStyle=gl>.05?col:dlA(col,.4);
      x.beginPath();x.moveTo(px,y);x.lineTo(px+bw*.33,y-rh*(.45+.5*gl));x.lineTo(px+bw,y);x.closePath();x.fill();}});
  const ph=tx0+DL.crankPh/720*tw;x.strokeStyle=dlA(DLC.amber,.8);x.lineWidth=1.5*u;x.beginPath();x.moveTo(ph,h*.12);x.lineTo(ph,h*.92);x.stroke();
  if(dps>0){const k=Math.round(real/dps);dlText('dlCrankN',`${L.name} · ${k<=1?'real speed':'shown '+k+'× slower'}`);}
}
/* the sound itself: an analyser on the game's engine bus, after the room and the compressor */
function dlAudio(){
  const A=ENG.audio;if(!A||!A.ctx)return null;
  if(DL.au&&DL.au.ctx!==A.ctx){try{DL.au.an.disconnect();}catch(_){}DL.au=null;}if(DL.au)return DL.au;
  const an=A.ctx.createAnalyser();an.fftSize=4096;an.smoothingTimeConstant=0;an.minDecibels=-110;an.maxDecibels=-20;(A.comp||A.master).connect(an);
  return DL.au={ctx:A.ctx,an,td:new Float32Array(an.fftSize),fd:new Float32Array(an.frequencyBinCount),sr:A.ctx.sampleRate};
}
/* one engine cycle of pressure (two turns of the crank, every cylinder once), triggered on its biggest pulse */
function dlScope(o,e,sim,on){
  const x=o.x,w=o.w,h=o.h,u=o.u;x.clearRect(0,0,w,h);
  x.strokeStyle=DLC.line;x.lineWidth=1*u;x.beginPath();x.moveTo(0,h/2);x.lineTo(w,h/2);x.stroke();
  const au=on&&dlAudio();if(!au)return;
  const td=au.td;au.an.getFloatTimeDomainData(td);const sr=au.sr,N=td.length;
  const rpm=Math.max(300,sim.rpmOut||0),cyc=Math.round(clamp(120/rpm*sr,256,N/2));
  let pk=0,pi=0;for(let i=1;i<N-cyc;i++){const v=td[i];if(v>pk){pk=v;pi=i;}}
  let s0=pi;while(s0>1&&!(td[s0-1]<0&&td[s0]>=0))s0--;
  let amp=1e-4;for(let i=0;i<cyc;i++)amp=Math.max(amp,Math.abs(td[s0+i]));DL.scopeAmp=Math.max(amp,(DL.scopeAmp||amp)*.94);
  const path=()=>{x.beginPath();for(let i=0;i<cyc;i++){const px=i/(cyc-1)*w,py=h/2-td[s0+i]/DL.scopeAmp*h*.42;i?x.lineTo(px,py):x.moveTo(px,py);}};
  x.lineJoin='round';path();x.strokeStyle=dlA(DLC.go,.22);x.lineWidth=5*u;x.stroke();x.strokeStyle=DLC.go;x.lineWidth=1.6*u;x.stroke();
  const full=cyc>=Math.round(120/rpm*sr)-1;dlText('dlScopeN',full?`one engine cycle · ${(cyc/sr*1000).toFixed(0)} ms`:`the last ${(cyc/sr*1000).toFixed(0)} ms`);
}
/* the spectrogram: log frequency, scrolling left, the firing note traced over it */
function dlLut(){const a=new Uint8ClampedArray(256*4),hx3=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
  const stops=[[0,hx3(DLC.well)],[.3,[30,20,60]],[.55,hx3(DLC.b)],[.78,hx3(DLC.amber)],[1,[255,246,230]]];
  for(let i=0;i<256;i++){const t=i/255;let k=0;while(k<stops.length-2&&t>stops[k+1][0])k++;const [t0,c0]=stops[k],[t1,c1]=stops[k+1],q=clamp((t-t0)/(t1-t0),0,1);for(let j=0;j<3;j++)a[i*4+j]=c0[j]+(c1[j]-c0[j])*q;a[i*4+3]=255;}DL.lut=a;}
function dlSpec(o,e,sim,on,rpm){
  const x=o.x,w=o.w,h=o.h,u=o.u,lab=30*u,PW=w-lab,step=Math.max(1,Math.round(1.5*u)),f0=20,f1=10000;if(!DL.lut)dlLut();
  if(o.changed){o.changed=false;x.fillStyle=DLC.well;x.fillRect(0,0,w,h);}
  const lf=Math.log(f0),lr=Math.log(f1)-lf,yOf=f=>h-(Math.log(f)-lf)/lr*h;
  x.drawImage(o.c,step,0,PW-step,h,0,0,PW-step,h);
  const col=x.createImageData(step,h),D=col.data,L=DL.lut,au=on&&dlAudio();
  if(au){const fd=au.fd;au.an.getFloatFrequencyData(fd);const bins=fd.length;
    for(let y=0;y<h;y++){const f=Math.exp(lf+(1-y/h)*lr),bi=Math.min(bins-1,Math.round(f/(au.sr/2)*bins));let v=fd[bi];if(bi>1&&bi<bins-1)v=Math.max(v,fd[bi-1],fd[bi+1]);
      const q=clamp(Math.round((v+92)/68*255),0,255);for(let k=0;k<step;k++){const p=(y*step+k)*4;D[p]=L[q*4];D[p+1]=L[q*4+1];D[p+2]=L[q*4+2];D[p+3]=255;}}}
  else{for(let i=0;i<D.length;i+=4){D[i]=7;D[i+1]=8;D[i+2]=11;D[i+3]=255;}}
  x.putImageData(col,PW-step,0);
  const L2=SIM.LAYOUTS[e.layout]||SIM.LAYOUTS.I4,ff=rpm/60*L2.fire.length/2;
  if(ff>=f0&&ff<=f1&&((performance.now()/120|0)%2)){x.fillStyle=DLC.a;x.fillRect(PW-step,yOf(ff)-u,step,2*u);}
  x.fillStyle=DLC.well;x.fillRect(PW,0,lab,h);x.fillStyle=DLC.ink3;x.font=`500 ${Math.round(10*u)}px ${DLF.num}`;x.textAlign='left';x.textBaseline='middle';
  for(const [f,t] of [[30,'30'],[100,'100'],[300,'300'],[1000,'1k'],[3000,'3k'],[10000,'10k']]){const y=clamp(yOf(f),6*u,h-6*u);x.fillRect(PW,yOf(f),4*u,1);x.fillText(t,PW+6*u,y);}
  dlText('dlSpecN',ff>1?`firing note ${ff<100?ff.toFixed(1):dlFmt(ff)} Hz`:'');
}

/* ---------- the setup sheet: the lab's, on this car's engine, live ---------- */
const turboOf=o=>o.fi==='turbo'||o.fi==='twin';
const niceStep=v=>{const p=Math.pow(10,Math.floor(Math.log10(Math.max(v,1e-6))));return v/p>=5?p*.5:v/p>=2?p*.2:p*.1;};
const DL_SETUP=[
  {h:'Engine',rows:[
    {k:'layout',l:'Layout',t:'select',opts:()=>SIM.LAYOUT_IDS.filter(id=>!SIM.LAYOUTS[id].kind).map(id=>[id,SIM.LAYOUTS[id].name])},
    {k:'disp',l:'Displacement',t:'range',rng:o=>{const d0=dlBase().disp||o.disp;return d0<1.2?[.05,Math.max(1.5,Math.round(d0*3*20)/20),.01]:[.5,Math.max(9,Math.ceil(d0*1.8)),.05];},
      fmt:v=>v>=10?v.toFixed(1)+' L':v<1?Math.round(v*1000)+' cc':v.toFixed(2)+' L',why:'The torque goes with it, litre for litre.'},
    {k:'redline',l:'Redline',t:'range',rng:o=>{const r0=dlBase().redline||o.redline,st=r0<2500?25:100,lo=Math.min(4000,Math.floor(r0*.6/st)*st),hi=Math.min(20000,Math.max(9000,Math.ceil(r0*1.8/st)*st));return [lo,hi,st];},fmt:v=>dlFmt(v)+' rpm'},
    {k:'cam',l:'Camshaft',t:'seg',opts:()=>SIM.CAMS.map((n,i)=>[i,n])}]},
  {h:'Combustion',rows:[
    {k:'mech',l:'Knock and clatter',t:'range',rng:()=>[0,2.5,.05],fmt:v=>v?Math.round(v*100)+'%':'Off',why:'Combustion and valvetrain noise from the block. Diesels live here.'},
    {k:'mechTone',l:'Clatter tone',t:'range',show:o=>o.mech>0,rng:()=>[600,6000,50],fmt:v=>dlFmt(v)+' Hz'},
    {k:'ch_td',l:'Pulse length',t:'range',rng:()=>[.4,2.5,.01],fmt:v=>v.toFixed(2)+'×',val:()=>SHOW.bs?SHOW.bs.ch.td:1,why:'How long each exhaust beat lasts. Longer is softer and rounder.'},
    {k:'ch_scatter',l:'Roughness',t:'range',rng:()=>[0,.6,.01],fmt:v=>Math.round(v*100)+'%',val:()=>SHOW.bs?SHOW.bs.ch.scatter:.18,why:'Cycle-to-cycle scatter. Singles, old engines and steam run rough.'},
    {k:'diesel',l:'Diesel combustion',t:'toggle'}]},
  {h:'Induction',rows:[
    {k:'fi',l:'Type',t:'select',opts:()=>Object.entries(SIM.INDUCTION)},
    {k:'boost',l:'Boost',t:'range',rng:()=>[.2,3.5,.05],fmt:v=>v.toFixed(2)+' bar · '+Math.round(v*14.5)+' psi',show:o=>o.fi!=='none'},
    {k:'tsize',l:'Turbo size',t:'seg',opts:()=>SIM.TURBO_SIZE.map((s,i)=>[i,s.n]),show:turboOf},
    {k:'bov',l:'Blow-off',t:'seg',opts:()=>[['valve','Valve'],['flutter','Flutter'],['none','None']],show:o=>turboOf(o)&&!o.diesel},
    {k:'antilag',l:'Anti-lag',t:'toggle',show:o=>turboOf(o)&&!o.diesel},
    {k:'intake',l:'Intake',t:'select',opts:()=>SIM.INTAKES.map((n,i)=>[i,n])}]},
  {h:'Exhaust',rows:[
    {k:'ex',l:'System',t:'select',opts:()=>SIM.EXHAUSTS.map((n,i)=>[i,n])},
    {k:'exLen',l:'Pipe length',t:'range',rng:()=>[.5,2,.01],fmt:v=>v.toFixed(2)+'×',why:'Moves every pipe resonance. Longer is deeper and boomier.'},
    {k:'crackle',l:'Pops and crackle',t:'range',rng:()=>[0,1,.05],fmt:v=>Math.round(v*100)+'%',show:o=>!o.diesel}]},
  {h:'Gearbox and launch',rows:[
    {k:'auto',l:'Automatic shifts',t:'toggle',sim:1,why:'On the dyno only. On the road the game shifts the way your level says.'},
    {k:'tc',l:'Traction control',t:'toggle',sim:1},
    {k:'gearWhine',l:'Straight-cut gears',t:'toggle'},
    {k:'launch',l:'Launch control',t:'toggle',show:o=>!o.diesel},
    {k:'launchRpm',l:'Launch rpm',t:'range',rng:o=>[1500,Math.max(4000,Math.round((o.redline||8000)*.9/100)*100),100],fmt:v=>dlFmt(v)+' rpm',show:o=>o.launch&&!o.diesel},
    {k:'limiter',l:'Rev limiter',t:'seg',show:o=>!o.diesel,opts:()=>[['soft','Soft cut'],['hard','Hard cut']]}]},
  {h:'Nitrous',rows:[{k:'nos',l:'Shot',t:'seg',opts:()=>SIM.NOS_SHOTS.map((n,i)=>[i,n?String(n):'None'])}]},
  {h:'Horn',rows:[{k:'horn',l:'Horn',t:'select',opts:()=>Object.entries(SIM.HORNS).map(([k,h])=>[k,typeof h==='string'?h:h.name||k]),why:'Any horn on any car. An air horn on a golf cart is allowed.'},
    {k:'jake',l:'Jake brake fitted',t:'toggle'}]}
];
/* the engine as its parts made it, and with this car's tune over it */
const dlBase=()=>(GAME.car&&GAME.car.spec&&GAME.car.spec.src0)||{};
function dlParams(){const k=tuneKey(BUILDS[APP.bi]);return Object.assign({},SIM.DEFAULTS,dlBase(),k&&TUNE[k]||{});}
function dlBuildSetup(){
  const box=$('dlSetup');box.textContent='';DL.rows.length=0;
  for(const sec of DL_SETUP){
    const s=document.createElement('div');s.className='sheet';
    const h=document.createElement('h3');h.textContent=sec.h;s.appendChild(h);sec.el=s;
    for(const r of sec.rows){
      const row=document.createElement('div');row.className='srow'+(r.t==='toggle'?' tog':'');const id='dls-'+r.k;
      const head=document.createElement('div');head.className='head';const lab=document.createElement('label');lab.htmlFor=id;lab.textContent=r.l;head.appendChild(lab);row.appendChild(head);
      let el;
      if(r.t==='select'){el=document.createElement('select');el.id=id;el.addEventListener('change',()=>{const raw=el.value;dlSetVal(r,/^\d+$/.test(raw)?+raw:raw,true);});row.appendChild(el);}
      else if(r.t==='seg'){el=document.createElement('div');el.className='seg';el.id=id;el.setAttribute('role','group');row.appendChild(el);}
      else if(r.t==='range'){el=document.createElement('input');el.type='range';el.id=id;const out=document.createElement('output');out.htmlFor=id;head.appendChild(out);r.out=out;
        el.addEventListener('input',()=>{out.textContent=r.fmt(+el.value);dlSetVal(r,+el.value,false);});el.addEventListener('change',()=>dlSetVal(r,+el.value,true));row.appendChild(el);}
      else{el=document.createElement('button');el.type='button';el.className='switch';el.id=id;el.setAttribute('role','switch');el.setAttribute('aria-labelledby',id+'-l');lab.id=id+'-l';
        el.addEventListener('click',()=>dlSetVal(r,el.getAttribute('aria-checked')!=='true'?1:0,true));row.appendChild(el);}
      if(r.why){const w=document.createElement('p');w.className='why';w.textContent=r.why;row.appendChild(w);}
      r.el=el;r.row=row;DL.rows.push(r);s.appendChild(row);
    }
    box.appendChild(s);
  }
  const act=document.createElement('div');act.className='sheet';
  act.innerHTML='<h3>This engine</h3><div class="actions"><button type="button" id="dlReset">Reset to preset</button><button type="button" id="dlCopy">Copy engine spec</button></div><p class="tuned" id="dlTuned"></p>';
  box.appendChild(act);
  $('dlReset').addEventListener('click',()=>{const k=tuneKey(BUILDS[APP.bi]);if(k&&TUNE[k]){delete TUNE[k];saveTune();}if(SHOW.sim){SHOW.sim.auto=true;SHOW.sim.tc=false;}dlRetune(true);});
  $('dlCopy').addEventListener('click',()=>{const o=dlParams(),skip=new Set(['id','grp','tag','gears','gearV','orders','axles','imp','ch','name','machine','mass','drv','R','cdA','mu']),out={name:carName({car:APP.car})+' '+rigName(APP.car,rigOf(APP.car))};
    for(const k in o)if(!skip.has(k)&&o[k]!==SIM.DEFAULTS[k]&&o[k]!==undefined&&typeof o[k]!=='object')out[k]=typeof o[k]==='number'?+o[k].toFixed(4):o[k];
    const txt=JSON.stringify(out,null,1),b=$('dlCopy');try{navigator.clipboard.writeText(txt).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy engine spec',1400);},()=>{b.textContent='Copy failed';});}catch(e){b.textContent='Copy failed';}});
}
function dlSyncSetup(){
  if(!DL.rows.length||!GAME.car)return;const o=dlParams(),sim=SHOW.sim;
  for(const r of DL.rows){
    const show=!r.show||!!r.show(o);r.row.hidden=!show;if(!show)continue;
    const v=r.sim?(sim?sim[r.k]:false):r.val?r.val(o):o[r.k];
    if(r.t==='select'){const opts=r.opts(o),key=opts.map(q=>q[0]).join('|');if(r.el.dataset.k!==key){r.el.dataset.k=key;r.el.textContent='';for(const [val,n] of opts){const op=document.createElement('option');op.value=String(val);op.textContent=n;r.el.appendChild(op);}}r.el.value=String(v===undefined?'':v);}
    else if(r.t==='seg'){const opts=r.opts(o),key=opts.map(q=>q[0]).join('|');if(r.el.dataset.k!==key){r.el.dataset.k=key;r.el.textContent='';for(const [val,n] of opts){const b=document.createElement('button');b.type='button';b.dataset.v=String(val);b.textContent=n;b.addEventListener('click',()=>dlSetVal(r,val,true));r.el.appendChild(b);}}
      for(const b of r.el.children)b.setAttribute('aria-pressed',String(b.dataset.v===String(v)));}
    else if(r.t==='range'){const [mn,mx,sp]=r.rng(o);r.el.min=mn;r.el.max=mx;r.el.step=sp;if(document.activeElement!==r.el)r.el.value=v;r.out.textContent=r.fmt(+r.el.value);}
    else r.el.setAttribute('aria-checked',String(!!v));
  }
  for(const sec of DL_SETUP)sec.el.hidden=sec.rows.every(r=>r.row.hidden);
  const k=tuneKey(BUILDS[APP.bi]),n=k&&TUNE[k]?Object.keys(TUNE[k]).filter(q=>q!=='tq'&&q!=='idle').length:0;
  $('dlTuned').textContent=!k?'':n?`Tuned here: ${n} setting${n>1?'s':''} changed from what the parts made. The car drives with this engine; Reset to preset gives the parts' own engine back.`
    :'As the parts made it. Anything changed here goes with the car onto the road.';
}
/* a setting changed: the bay's engine follows at once; the car you drive takes it when you let go */
function dlSetVal(r,v,final){
  const b=BUILDS[APP.bi],k=tuneKey(b);if(!k||!GAME.car)return;
  if(r.sim){if(SHOW.sim)SHOW.sim[r.k]=!!v;dlSyncSetup();return;}
  const base=dlBase(),o={[r.k]:v};
  /* a bigger engine makes more torque: the parts' torque per litre is kept */
  if(r.k==='disp'&&base.disp&&isFinite(base.tq))o.tq=base.tq/base.disp*v;
  if(r.k==='redline'){const cur=dlParams();if((cur.launchRpm||0)>v*.9)o.launchRpm=Math.round(v*.65/100)*100;if((cur.idle||0)>v*.6)o.idle=Math.round(v*.3);}
  const T=Object.assign(TUNE[k]||{},o);
  for(const q in T)if(base[q]!==undefined&&Math.abs(+T[q]-+base[q])<1e-9||T[q]===base[q])delete T[q];
  if(Object.keys(T).length)TUNE[k]=T;else delete TUNE[k];if(final)saveTune();dlRetune(final);
}
/* while a slider moves: one rebuild a frame at most, the synth's pipes re-made at most ten times a second (each
   new config rebuilds them); on release, everything at once */
function dlRetune(final){
  if(!final){if(!DL.raf)DL.raf=requestAnimationFrame(()=>{DL.raf=0;dlApply(false);});return;}
  if(DL.raf){cancelAnimationFrame(DL.raf);DL.raf=0;}dlApply(true);
}
function dlApply(final){
  const i=APP.bi,b=BUILDS[i];delete SPECS[b.id];
  const s0=specOf(i),pk=plusK(APP.car),pg=plusG(APP.car),e=pk>1||pg!==1?plusSpec(s0,Math.max(1,pk),pg):s0;
  if(PULL.ph)showPullEnd(true);
  SHOW.bs=showSpec(e);if(SHOW.sim){SHOW.sim.setSpec(SHOW.bs);SHOW.peak={hp:0,rpm:0};}
  const now=performance.now();if(GAME.voice.port&&SHOW.eng&&(final||now-(DL.cfgT||0)>100)){DL.cfgT=now;GAME.voice.port.post({t:'cfg',cfg:SIM.dspCfg(e)});}
  else if(!final){clearTimeout(DL.cfgTm);DL.cfgTm=setTimeout(()=>{if(SHOW.eng&&GAME.voice.port&&SHOW.bs){DL.cfgT=performance.now();GAME.voice.port.post({t:'cfg',cfg:SIM.dspCfg(SHOW.bs)});}},110);}
  dlSync();if(final||!(document.activeElement&&document.activeElement.type==='range'))dlSyncSetup();
  /* the car you drive takes the same spec object (plusSpec keeps one copy per spec), so the bay knows it's this tune
     coming back and doesn't start its engine over */
  SHOW.tuneFor=e;clearTimeout(DL.tuneT);
  DL.tuneT=setTimeout(()=>{DL.tuneT=0;if(APP.bi===i)spawnRig();},final?60:600);
}
/* leaving the bay with a tune still to hand over: the car takes it now */
function dlFlush(){if(DL.raf){cancelAnimationFrame(DL.raf);DL.raf=0;dlApply(true);}if(DL.tuneT){clearTimeout(DL.tuneT);DL.tuneT=0;spawnRig();}saveTune();}
