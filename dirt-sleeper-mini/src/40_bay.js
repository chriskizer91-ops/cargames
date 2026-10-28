/* =====================================================================================
   THE MODEL BAY — one truck on the turntable (or all four in a grid), drawn into the scene
   target at matrix resolution and turned into LED dots by Shiftlight 2's present().
   ===================================================================================== */
const VIEWS=[['front34','Front ¾',-38,8,8.6,.86],['side','Side',90,2.5,8.4,.82],['rear34','Rear ¾',142,9,8.6,.86],
  ['front','Front',0,4,7.4,.86],['rear','Rear',180,5,7.4,.86],['top','Top',-35,58,9.6,.55],['low','Low',-24,1.5,6.6,.62]];
const RES=[[320,180,1],[480,270,1],[640,360,2]];
const APP={build:0,view:'front34',compare:false,stage:'dark',lights:false,steer:false,spin:false,yaw:0,paint:{},dirt:{},
  cam:{th:-38,ph:8,d:8.6,ty:.86},camT:null,fov:.5,t:0,frameMs:0,fps:60,tris:0};
try{const s=JSON.parse(store.get('dsmini-bay','{}'));for(const k of ['build','view','stage','lights','steer','compare'])if(s[k]!==undefined)APP[k]=s[k];if(s.paint)APP.paint=s.paint;if(s.dirt)APP.dirt=s.dirt;}catch(e){}
const saveApp=()=>store.set('dsmini-bay',JSON.stringify({build:APP.build,view:APP.view,stage:APP.stage,lights:APP.lights,steer:APP.steer,compare:APP.compare,paint:APP.paint,dirt:APP.dirt}));
/* ---------- meshes, built on demand ---------- */
const TRUCK={};
function truck(i){const b=BUILDS[i];if(TRUCK[b.id])return TRUCK[b.id];
  const t0=performance.now(),s=buildSUV(b.look),w=buildWheel(b.look.tyre);
  return TRUCK[b.id]={body:s.body,D:s.D,wheel:w,tris:s.tris+w.tris*4,ms:performance.now()-t0};}
let STG={};
const stageMesh=k=>STG[k]||(STG[k]=buildStage(k));
/* ---------- GL state ---------- */
function setRes(i){const [dw,dh,hs]=RES[i];HS=hs;BW=dw;BH=dh;W=dw/hs;H=dh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);APP.res=i;store.set('dsmini-res',i);$('res').textContent='Dots '+BW+'×'+BH;}
/* ---------- matrices ---------- */
const M4T=(x,y,z)=>{const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m;};
const M4RY=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const M4S=(x,y,z)=>{const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m;};
const CAMS={};
function camFor(c,asp){
  const th=c.th*PI/180,ph=c.ph*PI/180,t=[0,c.ty,0],e=[c.d*Math.cos(ph)*Math.cos(th),c.ty+c.d*Math.sin(ph),-c.d*Math.cos(ph)*Math.sin(th)];
  const V_=M4.look(e,t,[0,1,0]),P_=M4.persp(APP.fov,asp,.2,200);return {eye:e,V:V_,P:P_,VP:M4.mul(P_,V_)};}
/* ---------- uniforms ---------- */
function frameUniforms(cam,st){
  const u=P_LIT.u,S=STAGES[st];
  gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,cam.eye);gl.uniform1f(u.uTime,APP.t);
  gl.uniform3fv(u.uSunDir,S.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);
  gl.uniform3fv(u.uFogCol,S.fog);gl.uniform1f(u.uFogD,S.fogD);gl.uniform1f(u.uStage,S.id);
  const LP=new Float32Array(32),LC=new Float32Array(32);S.lights.forEach((l,i)=>{LP.set([l[0],l[1],l[2],l[3]],i*4);LC.set([l[4][0]*l[5],l[4][1]*l[5],l[4][2]*l[5],0],i*4);});
  gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform1i(u.uNL,S.lights.length);
}
function carUniforms(b,i){
  const u=P_LIT.u,p=APP.paint[b.id]||b.paint,dirt=APP.dirt[b.id]!==undefined?APP.dirt[b.id]:b.dirt,T=truck(i),D=T.D;
  gl.uniform3fv(u.uPaint,lin(p));gl.uniform3fv(u.uPaint2,lin(b.paint2));gl.uniform3fv(u.uRim,lin(b.rim));gl.uniform3fv(u.uCal,lin(b.cal));gl.uniform3fv(u.uClad,lin(b.clad));
  gl.uniform1f(u.uLiv,b.liv);gl.uniform1f(u.uLights,APP.lights?1:0);gl.uniform1f(u.uBrake,0);gl.uniform1f(u.uDirt,dirt);gl.uniform1f(u.uGround,0);
  gl.uniform4f(u.uLivP,D.X(0),D.X(D.L),D.belt(2.5),D.Hr);
}
/* ---------- one view: stage, turntable, truck ---------- */
function renderOne(i,vp,cam){
  const b=BUILDS[i],T=truck(i),D=T.D,u=P_LIT.u,st=stageMesh(APP.stage);
  gl.viewport(vp[0],vp[1],vp[2],vp[3]);
  frameUniforms(cam,APP.stage);carUniforms(b,i);
  const yaw=APP.yaw,hl=D.L/2+.15,hw=b.look.track/2+b.look.tyre.W*.5;
  gl.uniform4f(u.uShadow,0,0,hl,hw);gl.uniform4f(u.uShadow2,0,0,yaw,0);
  gl.uniformMatrix4fv(u.uM,false,M4.id());drawMesh(st.stage);
  const Mc=M4RY(yaw);gl.uniformMatrix4fv(u.uM,false,Mc);drawMesh(st.table);
  gl.uniform4f(u.uShadow,1e3,1e3,0,0);
  drawMesh(T.body);
  const R=b.look.tyre.R,tw=b.look.track/2,st2=APP.steer?.36:0;
  for(const [u0,front] of [[D.uFa,1],[D.uRa,0]])for(const s of [1,-1]){
    const M=M4.mul(Mc,M4.mul(M4T(D.X(u0),R,s*tw),M4.mul(M4RY(front?st2:0),M4S(1,1,s))));
    gl.uniformMatrix4fv(u.uM,false,M);drawMesh(T.wheel);}
  return T.tris+st.tris;
}
/* ---------- the frame ---------- */
function curCam(){const c=APP.cam,b=BUILDS[APP.build],T=truck(APP.build);return Object.assign({},c,{ty:c.ty+T.D.dy*.55});}
function render(dt){
  hClear();
  const T=sceneTarget();gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.viewport(0,0,T.w,T.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.useProgram(P_LIT.p);
  let tris=0;
  if(APP.compare){const w=T.w>>1,h=T.h>>1;
    for(let q=0;q<4;q++){const c=Object.assign({},APP.cam,{ty:APP.cam.ty+truck(q).D.dy*.55});tris+=renderOne(q,[(q&1)*w,(q<2?1:0)*h,w,h],camFor(c,w/h));}
    for(let q=0;q<4;q++){const x=(q&1)*(W>>1)+4,y=(q<2?0:H>>1)+3;otxt5(BUILDS[q].name.toUpperCase(),x,y,q===APP.build?GR.volt:GR.steel,1);}
    hRect(W>>1,0,1,H,pack(0,0,0,255));hRect(0,H>>1,W,1,pack(0,0,0,255));}
  else{tris=renderOne(APP.build,[0,0,T.w,T.h],camFor(curCam(),T.w/T.h));
    const b=BUILDS[APP.build],sc=W>=400?2:1;otxt5(b.name.toUpperCase(),5,5,GR.volt,sc,'l',.12);txt3(b.tag.toUpperCase(),5,7+7*sc+2,PAL.ink);}
  gl.bindVertexArray(null);
  APP.tris=tris;
  present();
}
/* ---------- input: drag to orbit, wheel or pinch to zoom, double-tap to reset ---------- */
const PT=new Map();let pinch0=0,d0=0;
cv.addEventListener('pointerdown',e=>{e.preventDefault();PT.set(e.pointerId,[e.clientX,e.clientY]);try{cv.setPointerCapture(e.pointerId);}catch(_){}cv.classList.add('drag');APP.camT=null;
  if(PT.size===2){const [a,b]=[...PT.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);d0=APP.cam.d;}});
cv.addEventListener('pointermove',e=>{if(!PT.has(e.pointerId))return;const p=PT.get(e.pointerId),dx=e.clientX-p[0],dy=e.clientY-p[1];PT.set(e.pointerId,[e.clientX,e.clientY]);
  if(PT.size===1){APP.cam.th-=dx*.35;APP.cam.ph=clamp(APP.cam.ph+dy*.25,-2,80);markView(null);}
  else if(PT.size===2){const [a,b]=[...PT.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0>0)APP.cam.d=clamp(d0*pinch0/d,3.5,16);}});
const up=e=>{PT.delete(e.pointerId);if(!PT.size)cv.classList.remove('drag');pinch0=0;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();APP.camT=null;APP.cam.d=clamp(APP.cam.d*Math.exp(e.deltaY*.0012),3.5,16);},{passive:false});
cv.addEventListener('dblclick',()=>setView(APP.view||'front34'));
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const n=+e.key;if(n>=1&&n<=4){setBuild(n-1);}
  else if(e.key==='c'||e.key==='C')setCompare(!APP.compare);else if(e.key==='l'||e.key==='L')toggle('lights');
  else if(e.key==='ArrowLeft'){APP.cam.th+=6;markView(null);}else if(e.key==='ArrowRight'){APP.cam.th-=6;markView(null);}});
/* ---------- the dock ---------- */
function setBuild(i){APP.build=i;for(const [k,el] of [...$('builds').children].entries())el.setAttribute('aria-pressed',String(k===i));syncDock();saveApp();}
function setView(id){const v=VIEWS.find(q=>q[0]===id);if(!v)return;APP.view=id;APP.camT={th:v[2],ph:v[3],d:v[4],ty:v[5]};
  /* go round the short way */
  while(APP.camT.th-APP.cam.th>180)APP.camT.th-=360;while(APP.camT.th-APP.cam.th<-180)APP.camT.th+=360;
  if(APP.spin){APP.spin=false;$('spin').setAttribute('aria-pressed','false');}
  APP.yaw=0;markView(id);saveApp();}
function markView(id){if(id===null)APP.view=null;for(const el of $('views').children)el.setAttribute('aria-pressed',String(el.dataset.v===id));}
function setCompare(on){APP.compare=on;$('cmp').setAttribute('aria-pressed',String(on));if(on)for(let i=0;i<4;i++)truck(i);saveApp();}
function toggle(k){APP[k]=!APP[k];$(k).setAttribute('aria-pressed',String(APP[k]));saveApp();}
function syncDock(){
  const b=BUILDS[APP.build],p=APP.paint[b.id]||b.paint;
  for(const el of $('paints').children)el.setAttribute('aria-pressed',String(el.dataset.c===p));
  $('mud').value=APP.dirt[b.id]!==undefined?APP.dirt[b.id]:b.dirt;
  $('info').innerHTML='<b>'+b.name+'.</b> '+b.blurb+' '+b.specs.map(s=>'<b>'+s[0]+'</b> '+s[1]).join(' · ');
  requestAnimationFrame(layout);
}
function buildDock(){
  const bx=$('builds');BUILDS.forEach((b,i)=>{const el=document.createElement('button');el.type='button';el.className='bld';el.innerHTML='<b>'+b.name+'</b><small>'+b.tag+'</small>';
    el.setAttribute('aria-pressed',String(i===APP.build));el.addEventListener('click',()=>setBuild(i));bx.appendChild(el);});
  const vx=$('views');for(const [id,n] of VIEWS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;el.addEventListener('click',()=>setView(id));vx.appendChild(el);}
  const px=$('paints');for(const [n,c] of PAINTS){const el=document.createElement('button');el.type='button';el.dataset.c=c;el.title=n;el.setAttribute('aria-label',n);el.style.background=c;
    el.addEventListener('click',()=>{APP.paint[BUILDS[APP.build].id]=c;syncDock();saveApp();});px.appendChild(el);}
  $('mud').addEventListener('input',e=>{APP.dirt[BUILDS[APP.build].id]=+e.target.value;saveApp();});
  $('cmp').addEventListener('click',()=>setCompare(!APP.compare));
  for(const k of ['lights','steer','spin'])$(k).addEventListener('click',()=>toggle(k));
  $('stage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;APP.stage=b.dataset.v;for(const x of $('stage').children)x.setAttribute('aria-pressed',String(x===b));saveApp();});
  $('res').addEventListener('click',()=>{setRes((APP.res+1)%RES.length);layout();});
  for(const k of ['lights','steer'])$(k).setAttribute('aria-pressed',String(APP[k]));
  $('cmp').setAttribute('aria-pressed',String(APP.compare));
  for(const x of $('stage').children)x.setAttribute('aria-pressed',String(x.dataset.v===APP.stage));
  syncDock();
}
/* ---------- layout: the matrix fits the space between the top bar and the dock ---------- */
function layout(){
  const sa=getComputedStyle($('sa')),sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0,st=parseFloat(sa.paddingTop)||0;
  const vw=innerWidth,vh=innerHeight,top=Math.max(10,st)+42,bottom=$('dock').offsetHeight+4,gl2=Math.max(12,sl),gr=Math.max(12,sr),aw=vw-gl2-gr,ah=Math.max(80,vh-top-bottom);
  let w=aw,h=w*9/16;if(h>ah){h=ah;w=h*16/9;}RECT={x:gl2+(aw-w)/2,y:top+(ah-h)/2,w,h};
}
/* ---------- loop ---------- */
let LAST=0;
function frame(ts){
  const dt=Math.min(.05,LAST?(ts-LAST)/1000:1/60);LAST=ts;APP.t+=dt;
  if(APP.spin)APP.yaw+=dt*.3;
  if(APP.camT){const k=1-Math.exp(-dt*7),c=APP.cam,t=APP.camT;let done=true;for(const q of ['th','ph','d','ty']){c[q]+=(t[q]-c[q])*k;if(Math.abs(t[q]-c[q])>.01)done=false;}if(done){Object.assign(c,t);APP.camT=null;}}
  const t0=performance.now();
  try{render(dt);}catch(e){console.error(e);}
  const ms=performance.now()-t0;APP.frameMs=lerp(APP.frameMs||ms,ms,.1);APP.fps=lerp(APP.fps,1/Math.max(dt,1e-3),.05);
  if((APP.t*4|0)!==(APP.st4|0)){APP.st4=APP.t*4;$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps';}
  requestAnimationFrame(frame);
}
/* ---------- boot ---------- */
if(!gl){$('err').style.display='grid';}
else{
  let r=parseInt(store.get('dsmini-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1;r=!touchy&&innerWidth*d>=1500?2:1;}
  setRes(r);glInit();buildDock();resize();
  if(APP.view)setView(APP.view);if(APP.camT){Object.assign(APP.cam,APP.camT);APP.camT=null;}
  if(APP.compare)setCompare(true);
  addEventListener('resize',resize);
  requestAnimationFrame(frame);
  window.__bay={APP,BUILDS,truck,render,setBuild,setView,setCompare,setRes,present,
    shot(o){Object.assign(APP,o.app||{});if(o.cam)Object.assign(APP.cam,o.cam);APP.camT=null;render(1/60);return true;},
    snap(){render(1/60);return cv.toDataURL('image/png');},bench(n=5){gl.finish();const t=performance.now();for(let i=0;i<n;i++)render(1/60);gl.finish();return (performance.now()-t)/n;}};
}
