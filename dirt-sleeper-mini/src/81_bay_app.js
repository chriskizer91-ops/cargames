/* =====================================================================================
   THE MODEL BAY — one car on the turntable (or all of a car's builds at once), drawn into the scene
   target at matrix resolution and turned into LED dots by Shiftlight 2's present().
   ===================================================================================== */
const VIEWS=[['front34','Front ¾',-38,8,8.6,.86],['side','Side',90,2.5,8.4,.82],['rear34','Rear ¾',142,9,8.6,.86],
  ['front','Front',0,4,7.4,.86],['rear','Rear',180,5,7.4,.86],['top','Top',-35,58,9.6,.55],['low','Low',-24,1.5,6.6,.62],['bay','Bay',-36,46,4.1,0],['all','All',0,22,19,.9]];
const RES=[[320,180,1],[480,270,1],[640,360,2],[960,540,3]];
/* how far the hood swings open (rad) */
const HOOD_OPEN=1.0;
const APP={build:0,view:'front34',compare:false,garage:false,stage:'dark',lights:false,steer:false,spin:false,hood:false,hoodA:0,yaw:0,paint:{},dirt:{},
  cam:{th:-38,ph:8,d:8.6,ty:.86,tx:0,tz:0,fov:.5},camT:null,fov:.5,t:0,frameMs:0,fps:60,tris:0};
/* the build each car was last on: the one it sits on in the garage */
const CAR_LAST={};
try{const s=JSON.parse(store.get('dsmini-bay','{}'));for(const k of ['build','view','stage','lights','steer','hood','compare','garage'])if(s[k]!==undefined)APP[k]=s[k];APP.hoodA=APP.hood?1:0;if(s.paint)APP.paint=s.paint;if(s.dirt)APP.dirt=s.dirt;
  if(s.last)for(const [car] of CARS){const i=s.last[car];if(BUILDS[i]&&BUILDS[i].car===car)CAR_LAST[car]=i;}}catch(e){}
if(!(APP.build>=0&&APP.build<BUILDS.length))APP.build=0;
if(APP.garage)APP.compare=false;
const saveApp=()=>store.set('dsmini-bay',JSON.stringify({build:APP.build,view:APP.view,stage:APP.stage,lights:APP.lights,steer:APP.steer,hood:APP.hood,compare:APP.compare,garage:APP.garage,
  paint:APP.paint,dirt:APP.dirt,last:CAR_LAST}));
/* the build a car is on: the one on the turntable, or the one each of the others was last on */
const carBuild=car=>car===BUILDS[APP.build].car?APP.build:CAR_LAST[car]!==undefined?CAR_LAST[car]:carBuilds(car)[0];
/* ---------- meshes, built on demand ---------- */
const TRUCK={};
function truck(i){const b=BUILDS[i];if(TRUCK[b.id])return TRUCK[b.id];
  const t0=performance.now(),s=buildSUV(b.look,b),w=buildWheel(b.look.tyre),wr=b.look.tyreR?buildWheel(b.look.tyreR):w;
  return TRUCK[b.id]={body:s.body,hood:s.hood,hide:s.hide,D:s.D,wheel:w,wheelR:wr,bay:s.bay,engineOut:!!s.bay,
    tris:s.tris+w.tris*2+wr.tris*2+(s.bay?s.bay.tris:0),ms:performance.now()-t0};}
/* the engine bay: built the first time this build's hood opens, never with it shut */
const bayOf=i=>{const T=truck(i);return T.bay||(T.bay=buildBay(BUILDS[i],T.D));};
let STG={};
const stageMesh=(k,g)=>{const id=k+(g?'G':'');return STG[id]||(STG[id]=buildStage(k,g));};
/* ---------- GL state ---------- */
function setRes(i){const [dw,dh,hs]=RES[i];HS=hs;BW=dw;BH=dh;W=dw/hs;H=dh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);APP.res=i;store.set('dsmini-res',i);$('res').textContent='Dots '+BW+'×'+BH;}
/* ---------- matrices ---------- */
const M4T=(x,y,z)=>{const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m;};
const M4RY=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const M4S=(x,y,z)=>{const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m;};
const M4RX=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
const M4RZ=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
/* a flame for the exhaust tips: unit length along +X, hot at the root, red at the tip */
let FLAME=null;
function flameMesh(){if(FLAME)return FLAME;const mb=new MB(),seg=[[0,.18,1,.92,[1,.92,.62],9],[.18,.48,.92,.7,[1,.7,.22],7],[.48,.78,.7,.38,[1,.42,.08],5],[.78,1,.38,.04,[.9,.18,.04],3.5]];
  for(const [a,b,r0,r1,c,em] of seg)tubeAB(mb,[a,0,0],[b,0,0],r0,10,V(c,MAT.EMIT,em),a===0,r1);return FLAME=mb.build();}
const CAMS={};
function camFor(c,asp){
  const th=c.th*PI/180,ph=c.ph*PI/180,tx=c.tx||0,tz=c.tz||0,t=[tx,c.ty,tz],e=[tx+c.d*Math.cos(ph)*Math.cos(th),c.ty+c.d*Math.sin(ph),tz-c.d*Math.cos(ph)*Math.sin(th)];
  const V_=M4.look(e,t,[0,1,0]),P_=M4.persp(c.fov||APP.fov,asp,.2,200);return {eye:e,V:V_,P:P_,VP:M4.mul(P_,V_),right:[V_[0],V_[4],V_[8]]};}
/* a point in the world to the matrix's -1..1 (null behind the camera) */
const project=(M,p)=>{const x=M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],y=M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],w=M[3]*p[0]+M[7]*p[1]+M[11]*p[2]+M[15];return w>.1?[x/w,y/w]:null;};
/* ---------- uniforms ---------- */
function frameUniforms(cam,st,garage){
  const u=P_LIT.u,S=STAGES[st],LS=stageLights(S,garage);
  gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,cam.eye);gl.uniform1f(u.uTime,APP.t);
  gl.uniform3fv(u.uSunDir,S.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);
  gl.uniform3fv(u.uFogCol,S.fog);gl.uniform1f(u.uFogD,S.fogD);gl.uniform1f(u.uStage,S.id);
  const LP=new Float32Array(32),LC=new Float32Array(32);LS.forEach((l,i)=>{LP.set([l[0],l[1],l[2],l[3]],i*4);LC.set([l[4][0]*l[5],l[4][1]*l[5],l[4][2]*l[5],0],i*4);});
  gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform1i(u.uNL,LS.length);
}
function carUniforms(b,i,v){
  const u=P_LIT.u,p=APP.paint[b.id]||b.paint,dirt=APP.dirt[b.id]!==undefined?APP.dirt[b.id]:b.dirt,T=truck(i),D=T.D;
  gl.uniform3fv(u.uPaint,lin(p));gl.uniform3fv(u.uPaint2,lin(b.paint2));gl.uniform3fv(u.uRim,lin(b.rim));gl.uniform3fv(u.uCal,lin(b.cal));gl.uniform3fv(u.uClad,lin(b.clad));
  gl.uniform1f(u.uLiv,b.liv);gl.uniform1f(u.uLights,APP.lights?1:0);gl.uniform1f(u.uBrake,v&&v.inp&&v.inp.brk?1:0);gl.uniform1f(u.uDirt,dirt);gl.uniform1f(u.uGround,0);
  gl.uniform4f(u.uLivP,D.X(0),D.X(D.L),D.belt(2.5),D.Hr);
}
/* ---------- the floor's contact shadows: x, z, half length, half width and yaw for each car ---------- */
const SHB=new Float32Array(32),SHA=new Float32Array(8);
function setShadows(list){const u=P_LIT.u,n=Math.min(8,list.length);for(let k=0;k<n;k++){SHB.set(list[k].slice(0,4),k*4);SHA[k]=list[k][4];}
  gl.uniform4fv(u.uSh,SHB);gl.uniform1fv(u.uShA,SHA);gl.uniform1i(u.uNSh,n);}
const shadowOf=(i,x,z,yaw)=>{const b=BUILDS[i];return [x,z,truck(i).D.L/2+.15,b.look.track/2+b.look.tyre.W*.5,yaw];};
/* ---------- one car, placed by Mc ----------
   v is its engine's voice when the car should answer it (rock on its springs, shake, throw flames,
   turn its wheels), hoodA how far its hood is open, steer whether its front wheels follow Steer */
function drawCar(i,Mc,v,hoodA,steer){
  const b=BUILDS[i],T=truck(i),D=T.D,u=P_LIT.u;carUniforms(b,i,v);
  const live=!!(v&&v.sim);let Mb=Mc;
  if(live){const pv=.62;Mb=M4.mul(Mc,M4.mul(M4T(0,pv+v.shake[1],v.shake[0]),M4.mul(M4RX(v.roll),M4.mul(M4RZ(v.pitch),M4T(0,-pv,0)))));}
  /* a build on bigger rear tyres sits tail-up: the whole body turns about the front axle */
  const fx=D.X(D.uFa),R=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(M4T(fx,R,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R,0))));
  gl.uniformMatrix4fv(u.uM,false,Mb);drawMesh(T.body);
  /* the hood, swung up about its hinge at the cowl; while it is open the bay is drawn and the insides it replaces are not */
  const ha=sstep(0,1,hoodA);let Mh=Mb,bt=0;
  /* the engine rocks on its mounts against the torque. It is drawn only with the hood open, unless it
     sticks out through the hood (a blower), when it is part of the car on the road too */
  const engM=BY=>{const p=BY.pivot,a=live?-v.roll*3:0;return a?M4.mul(Mb,M4.mul(M4T(p[0],p[1],p[2]),M4.mul(BY.trans?M4RZ(a):M4RX(a),M4T(-p[0],-p[1],-p[2])))):Mb;};
  if(ha>0){const [hx,hy]=D.hood.hinge;Mh=M4.mul(Mb,M4.mul(M4T(hx,hy,0),M4.mul(M4RZ(ha*HOOD_OPEN),M4T(-hx,-hy,0))));
    /* the bay is built the first time this hood opens */
    const BY=bayOf(i),dirt=APP.dirt[b.id]!==undefined?APP.dirt[b.id]:b.dirt;bt=BY.tris;
    gl.uniform1f(u.uDirt,dirt*.3);drawMesh(BY.bay);
    if(!T.engineOut){gl.uniformMatrix4fv(u.uM,false,engM(BY));drawMesh(BY.engine);}
    gl.uniformMatrix4fv(u.uM,false,Mh);drawMesh(BY.liner);gl.uniform1f(u.uDirt,dirt);}
  if(T.engineOut){gl.uniformMatrix4fv(u.uM,false,engM(T.bay));drawMesh(T.bay.engine);}
  gl.uniformMatrix4fv(u.uM,false,Mh);drawMesh(T.hood);
  gl.uniformMatrix4fv(u.uM,false,Mb);if(ha===0)drawMesh(T.hide);
  /* a bare spare on the back is the build's own wheel, turned to face rearward */
  for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
  if(live&&v.flame>.04&&D.tips)for(const tp of D.tips){
    const up=Math.abs(tp.d[1])>.9?[1,0,0]:[0,1,0],rr=V3.norm(V3.cross(tp.d,up)),uu=V3.cross(rr,tp.d),k=Math.min(1,v.flame),fl=(.12+.42*k*v.flameL)*(.85+.3*Math.random()),fr=tp.r*(.8+.5*k);
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4.basis(tp.p,tp.d,uu,rr),M4S(fl,fr,fr))));drawMesh(flameMesh());}
  /* the sim's wheel angle is the driven wheels' at its own tyre radius: each wheel turns by its own */
  const st2=steer&&APP.steer?.36:0,wa=live?-v.wheelA:0,wb=D.uRa-D.uFa,eR=specOf(i).R;
  for(const front of [1,0])for(const s of [1,-1]){
    const x=front?fx:fx-wb*Math.cos(D.pitch),Rw=front?R:D.Rr,tw=(front?b.look.track:b.look.trackR||b.look.track)/2;
    const M=M4.mul(Mc,M4.mul(M4T(x,Rw,s*tw),M4.mul(M4RY(front?st2:0),M4.mul(M4S(1,1,s),M4RZ(wa*eR/Rw)))));
    gl.uniformMatrix4fv(u.uM,false,M);drawMesh(front?T.wheel:T.wheelR);}
  return T.tris+bt;
}
/* ---------- one view: stage, turntable, car ---------- */
function renderOne(i,vp,cam){
  const u=P_LIT.u,st=stageMesh(APP.stage),yaw=APP.yaw;
  gl.viewport(vp[0],vp[1],vp[2],vp[3]);frameUniforms(cam,APP.stage);
  setShadows([shadowOf(i,0,0,yaw)]);
  gl.uniformMatrix4fv(u.uM,false,M4.id());drawMesh(st.stage);
  const Mc=M4RY(yaw);gl.uniformMatrix4fv(u.uM,false,Mc);drawMesh(st.table);
  setShadows([]);
  /* the car on the turntable is the one whose engine is running: it rocks on its springs */
  return st.tris+drawCar(i,Mc,i===APP.build?cur():null,APP.hoodA,true);
}
/* ---------- the garage: every car in the shed ----------
   The car you picked is on the turntable, just as it is out of the garage: the views, the hood and
   the bay all work on it. The others are parked in their bays round the back, each on the build it
   was last on, hood shut, each with its own engine to start */
function parked(){const sel=BUILDS[APP.build].car,out=[];
  for(const [car] of CARS)if(car!==sel){const s=spotOf(car);out.push({car,i:carBuild(car),s,M:M4.mul(M4T(s.p[0],0,s.p[2]),M4RY(s.yaw))});}
  return out;}
function renderGarage(vp,cam){
  /* a car not built yet is built on the frame it first shows, one a frame, so the shed fills up
     car by car instead of the page stopping while all of them are made */
  let fresh=false;const P=parked().filter(q=>TRUCK[BUILDS[q.i].id]||(!fresh&&(fresh=true)));
  const u=P_LIT.u,st=stageMesh(APP.stage,true),yaw=APP.yaw;
  gl.viewport(vp[0],vp[1],vp[2],vp[3]);frameUniforms(cam,APP.stage,true);
  setShadows([shadowOf(APP.build,0,0,yaw)].concat(P.map(q=>shadowOf(q.i,q.s.p[0],q.s.p[2],q.s.yaw))));
  gl.uniformMatrix4fv(u.uM,false,M4.id());drawMesh(st.stage);
  const Mc=M4RY(yaw);gl.uniformMatrix4fv(u.uM,false,Mc);drawMesh(st.table);
  setShadows([]);
  let tris=st.tris+drawCar(APP.build,Mc,cur(),APP.hoodA,true);
  for(const q of P){const v=VOICES[q.car];tris+=drawCar(q.i,q.M,v&&v.sim?v:null,0,false);}
  garageLabels(cam,P);
  return tris;
}
/* the parked cars' names on the floor in front of their bays, once the camera stands back far enough
   to see the row; green while that car's engine runs */
function garageLabels(cam,P){
  if(APP.cam.d<12)return;
  for(const q of P){const b=BUILDS[q.i],th=q.s.th,r=GAR.R-3.4,pr=project(cam.VP,[r*Math.cos(th),0,-r*Math.sin(th)]);if(!pr)continue;
    const x=Math.round((pr[0]*.5+.5)*W),y=Math.round((.5-pr[1]*.5)*H),v=VOICES[q.car],on=!!(v&&runs(v));
    otxt3(carName(b).toUpperCase(),x,y-6,on?PAL.green:PAL.ink,1,'c');otxt3(b.name.toUpperCase(),x,y+1,on?PAL.lime:PAL.dim,1,'c');}
}
/* a tap on a car in the garage puts it on the turntable */
function pickCar(cx,cy){
  if(!APP.garage||!CAMNOW)return false;
  const nx=(cx-RECT.x)/RECT.w*2-1,ny=1-(cy-RECT.y)/RECT.h*2;if(Math.abs(nx)>1||Math.abs(ny)>1)return false;
  const sel=BUILDS[APP.build].car,c=CAMNOW,asp=RECT.w/RECT.h;let best=null,bd=1;
  for(const [car] of CARS){const p=car===sel?[0,.8,0]:[spotOf(car).p[0],.8,spotOf(car).p[2]],q=project(c.VP,p),q2=project(c.VP,V3.add(p,V3.mul(c.right,2.2)));if(!q||!q2)continue;
    /* how far from the car's middle, in car half-widths */
    const r=Math.hypot((q2[0]-q[0])*asp,q2[1]-q[1]),d=Math.hypot((q[0]-nx)*asp,q[1]-ny)/Math.max(r,.06);if(d<bd){bd=d;best=car;}}
  if(best&&best!==sel)setCar(best);
  return !!best;
}
/* ---------- the frame ---------- */
function curCam(){const c=APP.cam,b=BUILDS[APP.build],T=truck(APP.build);return Object.assign({},c,{ty:c.ty+T.D.dy*.55});}
function render(dt){
  hClear();
  const T=sceneTarget();gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.viewport(0,0,T.w,T.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.useProgram(P_LIT.p);
  let tris=0;
  const label=()=>{const b=BUILDS[APP.build],sc=W>=400?2:1;otxt5((carName(b)+' '+b.name).toUpperCase(),5,5,GR.volt,sc,'l',.12);txt3(b.tag.toUpperCase(),5,7+7*sc+2,PAL.ink);};
  if(APP.garage){const cam=camFor(curCam(),T.w/T.h);CAMNOW=cam;tris=renderGarage([0,0,T.w,T.h],cam);label();engineHud();}
  else if(APP.compare){
    /* every build of this car: four in a 2x2 grid, two stacked */
    const list=carBuilds(BUILDS[APP.build].car),n=list.length,cols=n>2?2:1,rows=Math.ceil(n/cols),w=Math.floor(T.w/cols),h=Math.floor(T.h/rows),cw=Math.floor(W/cols),ch=Math.floor(H/rows);
    list.forEach((q,k)=>{const c=Object.assign({},APP.cam,{ty:APP.cam.ty+truck(q).D.dy*.55,d:APP.cam.d*(cols===1&&rows>1?.66:1)});tris+=renderOne(q,[(k%cols)*w,(rows-1-Math.floor(k/cols))*h,w,h],camFor(c,w/h));});
    list.forEach((q,k)=>otxt5(BUILDS[q].name.toUpperCase(),(k%cols)*cw+4,Math.floor(k/cols)*ch+3,q===APP.build?GR.volt:GR.steel,1));
    for(let c=1;c<cols;c++)hRect(cw*c,0,1,H,pack(0,0,0,255));for(let r=1;r<rows;r++)hRect(0,ch*r,W,1,pack(0,0,0,255));}
  else{const cam=camFor(curCam(),T.w/T.h);CAMNOW=cam;tris=renderOne(APP.build,[0,0,T.w,T.h],cam);label();engineHud();}
  gl.bindVertexArray(null);
  APP.tris=tris;
  present();
}
/* ---------- input: drag to orbit, wheel or pinch to zoom, double-tap to reset ---------- */
const PT=new Map();let pinch0=0,d0=0,tap=null;
/* the garage lets the camera stand further back, to see the whole row */
const dMax=()=>APP.garage?26:16;
cv.addEventListener('pointerdown',e=>{e.preventDefault();PT.set(e.pointerId,[e.clientX,e.clientY]);try{cv.setPointerCapture(e.pointerId);}catch(_){}cv.classList.add('drag');
  tap=PT.size===1?{x:e.clientX,y:e.clientY,t:performance.now(),cam:Object.assign({},APP.cam),camT:APP.camT,view:APP.view}:null;APP.camT=null;
  if(PT.size===2){const [a,b]=[...PT.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);d0=APP.cam.d;}});
cv.addEventListener('pointermove',e=>{if(!PT.has(e.pointerId))return;const p=PT.get(e.pointerId),dx=e.clientX-p[0],dy=e.clientY-p[1];PT.set(e.pointerId,[e.clientX,e.clientY]);
  if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<6)return;tap=null;
  if(PT.size===1){APP.cam.th-=dx*.35;APP.cam.ph=clamp(APP.cam.ph+dy*.25,-2,80);markView(null);}
  else if(PT.size===2){const [a,b]=[...PT.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0>0)APP.cam.d=clamp(d0*pinch0/d,3.5,dMax());}});
const up=e=>{PT.delete(e.pointerId);if(!PT.size)cv.classList.remove('drag');pinch0=0;
  /* a tap, not a drag: in the garage it picks the car under it, and a tap on nothing leaves the camera where it was going */
  if(tap&&e.type==='pointerup'&&performance.now()-tap.t<450&&!pickCar(tap.x,tap.y)&&tap.camT)APP.camT=tap.camT;tap=null;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();APP.camT=null;APP.cam.d=clamp(APP.cam.d*Math.exp(e.deltaY*.0012),3.5,dMax());},{passive:false});
cv.addEventListener('dblclick',()=>setView(APP.view||(APP.garage?'all':'front34')));
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.code==='BracketLeft'||e.code==='BracketRight'){setBuild((APP.build+(e.code==='BracketRight'?1:BUILDS.length-1))%BUILDS.length);}
  else if(e.key==='c'||e.key==='C')setCompare(!APP.compare);else if(e.key==='g'||e.key==='G')setGarage(!APP.garage);else if(e.key==='l'||e.key==='L')toggle('lights');else if(e.key==='h'||e.key==='H')toggle('hood');
  else if(e.key==='ArrowLeft'){APP.cam.th+=6;markView(null);}else if(e.key==='ArrowRight'){APP.cam.th-=6;markView(null);}});
/* ---------- the dock ---------- */
function setBuild(i){
  const was=cur(),m=was.sim?was.sim.mode:'free';APP.build=i;CAR_LAST[BUILDS[i].car]=i;const v=engineFor(i);
  /* a car that leaves the turntable goes back into neutral and the next one takes over the mode. Out of
     the garage the car you leave is gone from view, so a running engine moves with you to the next car */
  if(was!==v){if(was.sim&&was.sim.mode!=='free')setMode('free',was);if(v.sim.mode!==m)setMode(m,v);
    if(!APP.garage&&runs(was)){was.sim.stop();if(!runs(v))startEngine(v);}}
  if($('builds').dataset.car!==BUILDS[i].car)fillBuilds();if(APP.view==='bay')setView('bay');
  for(const el of $('builds').children)el.setAttribute('aria-pressed',String(+el.dataset.i===i));
  for(const el of $('cars').children)el.setAttribute('aria-pressed',String(el.dataset.v===BUILDS[i].car));syncDock();saveApp();}
/* a car comes back on the build it was last on */
function setCar(car){if(BUILDS[APP.build].car===car)return;setBuild(carBuild(car));if(APP.compare)setCompare(true);}
function fillBuilds(){
  const bx=$('builds'),car=BUILDS[APP.build].car,list=carBuilds(car);bx.dataset.car=car;bx.textContent='';bx.style.gridTemplateColumns='repeat('+list.length+',minmax(0,1fr))';
  for(const i of list){const b=BUILDS[i],el=document.createElement('button');el.type='button';el.className='bld';el.dataset.i=String(i);el.innerHTML='<b></b><small></small>';
    el.querySelector('b').textContent=b.name;el.querySelector('small').textContent=b.tag;
    el.setAttribute('aria-pressed',String(i===APP.build));el.addEventListener('click',()=>setBuild(i));bx.appendChild(el);}
}
function setView(id){const v=VIEWS.find(q=>q[0]===id);if(!v)return;APP.view=id;APP.camT={th:v[2],ph:v[3],d:v[4],ty:v[5],tx:0,tz:0,fov:APP.fov};
  /* the whole garage: from over the turntable, back toward the row of parked cars, a little wider */
  if(id==='all')Object.assign(APP.camT,{tx:-4.5,fov:.6});
  if(id==='bay'){const D=truck(APP.build).D,H=D.hood;APP.camT.tx=D.X((H.u0+H.u1)/2);APP.camT.ty=H.hinge[1]-.38-D.dy*.55;
    if(!APP.hood){APP.hood=true;$('hood').setAttribute('aria-pressed','true');}}
  /* go round the short way */
  while(APP.camT.th-APP.cam.th>180)APP.camT.th-=360;while(APP.camT.th-APP.cam.th<-180)APP.camT.th+=360;
  if(APP.spin){APP.spin=false;$('spin').setAttribute('aria-pressed','false');}
  APP.yaw=0;markView(id);saveApp();}
function markView(id){if(id===null)APP.view=null;for(const el of $('views').children)el.setAttribute('aria-pressed',String(el.dataset.v===id));}
function setCompare(on){if(on&&APP.garage)setGarage(false);APP.compare=on;$('cmp').setAttribute('aria-pressed',String(on));if(on)for(const i of carBuilds(BUILDS[APP.build].car))truck(i);saveApp();}
/* the garage: every car in one shed. Leaving it switches off the engines of the cars left parked there */
function setGarage(on){
  APP.garage=on;$('garage').setAttribute('aria-pressed',String(on));
  for(const el of $('views').children)if(el.dataset.v==='all')el.hidden=!on;
  if(on){if(APP.compare)setCompare(false);if(ENG.room!=='garage')setRoomKind('garage');setView('all');}
  else{const sel=cur();for(const car in VOICES){const v=VOICES[car];if(v!==sel&&runs(v))v.sim.stop();}
    setView(APP.view&&APP.view!=='all'?APP.view:'front34');APP.cam.d=Math.min(APP.cam.d,dMax());}
  syncDock();saveApp();}
function toggle(k){APP[k]=!APP[k];$(k).setAttribute('aria-pressed',String(APP[k]));saveApp();}
function syncDock(){
  const b=BUILDS[APP.build],p=APP.paint[b.id]||b.paint;
  for(const el of $('paints').children)el.setAttribute('aria-pressed',String(el.dataset.c===p));
  $('mud').value=APP.dirt[b.id]!==undefined?APP.dirt[b.id]:b.dirt;
  if(ENG.tab==='engine'){const e=specOf(APP.build),r=ENGINE_OF[b.id];
    $('info').innerHTML='<b>'+carName(b)+' '+b.name+' engine.</b> '+r.desc+' <b>'+fmt(Math.round(e.peak.hp))+' hp</b> at '+fmt(Math.round(e.peak.rpm/50)*50)+' rpm · <b>'+fmt(Math.round(e.peak.tq*.7376))+' lb-ft</b> · redline '+fmt(e.redline)+'. <span class="st">'+(ENG.status||'Sound starts when you start the engine.')+'</span>';}
  else $('info').innerHTML='<b>'+carName(b)+' · '+b.name+'.</b> '+b.blurb+' '+b.specs.map(s=>'<b>'+s[0]+'</b> '+s[1]).join(' · ')+
    (APP.garage?' <span class="st">Tap a car in the garage to put it on the turntable.</span>':'');
  syncEngineDock();
  requestAnimationFrame(layout);
}
function buildDock(){
  const cx=$('cars');for(const [id,n] of CARS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;
    el.setAttribute('aria-pressed',String(id===BUILDS[APP.build].car));el.addEventListener('click',()=>setCar(id));cx.appendChild(el);}
  fillBuilds();
  const vx=$('views');for(const [id,n] of VIEWS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;el.hidden=id==='all'&&!APP.garage;el.addEventListener('click',()=>setView(id));vx.appendChild(el);}
  const px=$('paints');for(const [n,c] of PAINTS){const el=document.createElement('button');el.type='button';el.dataset.c=c;el.title=n;el.setAttribute('aria-label',n);el.style.background=c;
    el.addEventListener('click',()=>{APP.paint[BUILDS[APP.build].id]=c;syncDock();saveApp();});px.appendChild(el);}
  $('mud').addEventListener('input',e=>{APP.dirt[BUILDS[APP.build].id]=+e.target.value;saveApp();});
  $('cmp').addEventListener('click',()=>setCompare(!APP.compare));
  $('garage').addEventListener('click',()=>setGarage(!APP.garage));
  for(const k of ['lights','steer','spin','hood'])$(k).addEventListener('click',()=>toggle(k));
  $('stage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;APP.stage=b.dataset.v;for(const x of $('stage').children)x.setAttribute('aria-pressed',String(x===b));saveApp();});
  $('res').addEventListener('click',()=>{setRes((APP.res+1)%RES.length);layout();});
  for(const k of ['lights','steer','hood'])$(k).setAttribute('aria-pressed',String(APP[k]));
  $('cmp').setAttribute('aria-pressed',String(APP.compare));$('garage').setAttribute('aria-pressed',String(APP.garage));
  for(const x of $('stage').children)x.setAttribute('aria-pressed',String(x.dataset.v===APP.stage));
  syncDock();
}
/* ---------- the engine tab ---------- */
function setTab(v){ENG.tab=v;for(const el of document.querySelectorAll('#dock [data-p]'))el.hidden=el.dataset.p!==v;
  for(const x of $('tabs').children)x.setAttribute('aria-pressed',String(x.dataset.v===v));saveEng();syncDock();}
function buildEngineDock(){
  $('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.v);});
  $('power').addEventListener('click',toggleEngine);
  $('allEng').addEventListener('click',()=>allEngines(!allOn()));
  $('segMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setMode(b.dataset.v);syncEngineDock();});
  const sl=$('segListen');LISTEN.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.dataset.v=String(i);b.textContent=n;sl.appendChild(b);});
  sl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setListener(+b.dataset.v);syncEngineDock();});
  $('segRoom').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setRoomKind(b.dataset.v);syncEngineDock();});
  $('vol').value=ENG.vol;$('vol').addEventListener('input',e=>setVolume(e.target.value));
  const pad=$('pad'),setPad=e=>{const r=pad.getBoundingClientRect();ENG.pad=clamp((e.clientX-r.left-4)/(r.width-8),0,1);};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(_){}ENG.padOn=true;setPad(e);});
  pad.addEventListener('pointermove',e=>{if(ENG.padOn)setPad(e);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,()=>{ENG.padOn=false;});
  const box=$('ebtns');
  for(const d of ENG_BTNS){const b=document.createElement('button');b.type='button';b.className='tog';if(d.tone)b.dataset.tone=d.tone;
    b.innerHTML='<span></span><kbd>'+d.k.replace('Key','')+'</kbd>';b.querySelector('span').textContent=d.l;d.el=b;
    if(d.t==='hold'){const set=v=>{if(!b.disabled)engHold(d,v);};
      b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}set(true);});
      for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>set(false));}
    else b.addEventListener('click',()=>engPress(d));
    box.appendChild(b);}
  setTab(ENG.tab);
}
function syncEngineDock(){
  if(!ENG.sim||!$('ebtns').children.length)return;
  const sim=ENG.sim,e=ENG.spec;
  for(const x of $('segMode').children)x.setAttribute('aria-pressed',String(x.dataset.v===sim.mode));
  for(const x of $('segListen').children)x.setAttribute('aria-pressed',String(+x.dataset.v===ENG.listener));
  for(const x of $('segRoom').children)x.setAttribute('aria-pressed',String(x.dataset.v===ENG.room));
  for(const d of ENG_BTNS){if(!d.el)continue;d.el.hidden=!!(d.need&&!d.need(e));d.el.disabled=!!(d.drive&&sim.mode!=='drive');}
  engineLive(true);
}
/* whether every car in the shed is running */
const allOn=()=>CARS.every(([car])=>VOICES[car]&&runs(VOICES[car]));
/* the bits that change every frame: the power button, the start-all button, the pad's fill and its label */
const ELIVE={};
function engineLive(force){
  if(!ENG.sim)return;const on=engineOn(),thr=ENG.inp?ENG.inp.thr:0,lbl=on?'Hold to rev · further right, more throttle':'Start the engine first';
  if(force||ELIVE.on!==on){ELIVE.on=on;$('power').setAttribute('aria-pressed',String(on));$('powerLbl').textContent=on?'Engine on':'Start engine';}
  if(force||ELIVE.lbl!==lbl){ELIVE.lbl=lbl;$('padLbl').textContent=lbl;}
  const w=Math.round(thr*100);if(force||ELIVE.w!==w){ELIVE.w=w;$('padFill').style.width=w+'%';$('pad').setAttribute('aria-valuenow',String(w));}
  const all=APP.garage?allOn()?'Stop all':'Start all':'';if(force||ELIVE.all!==all){ELIVE.all=all;$('allEng').hidden=!all;if(all)$('allEng').textContent=all;}
  if(ELIVE.st!==ENG.status){ELIVE.st=ENG.status;if(ENG.tab==='engine')syncDock();}
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
  {const t=APP.hood?1:0;if(APP.hoodA!==t)APP.hoodA=t>APP.hoodA?Math.min(1,APP.hoodA+dt*1.8):Math.max(0,APP.hoodA-dt*1.8);}
  if(APP.camT){const k=1-Math.exp(-dt*7),c=APP.cam,t=APP.camT;let done=true;for(const q of ['th','ph','d','ty','tx','tz','fov']){c[q]=(c[q]||0)+((t[q]||0)-(c[q]||0))*k;if(Math.abs(t[q]-c[q])>.01)done=false;}if(done){Object.assign(c,t);APP.camT=null;}}
  const t0=performance.now();
  try{engineFrame(dt);}catch(e){console.error(e);}
  try{render(dt);}catch(e){console.error(e);}
  engineLive();
  const ms=performance.now()-t0;APP.frameMs=lerp(APP.frameMs||ms,ms,.1);APP.fps=lerp(APP.fps,1/Math.max(dt,1e-3),.05);
  if((APP.t*4|0)!==(APP.st4|0)){APP.st4=APP.t*4;$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps';}
  requestAnimationFrame(frame);
}
/* ---------- boot ---------- */
if(!gl){$('err').style.display='grid';}
else{
  let r=parseInt(store.get('dsmini-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1;r=!touchy&&innerWidth*d>=1500?2:1;}
  setRes(r);glInit();engineFor(APP.build);buildDock();buildEngineDock();resize();
  if(APP.view==='all'&&!APP.garage)APP.view='front34';
  if(APP.garage)setGarage(true);else if(APP.view)setView(APP.view);
  if(APP.camT){Object.assign(APP.cam,APP.camT);APP.camT=null;}
  if(APP.compare)setCompare(true);
  addEventListener('resize',resize);
  requestAnimationFrame(frame);
  window.__bay={APP,ENG,VOICES,BUILDS,BODIES,SIM,CARS,specOf,suvDesign,secRing,startEngine,setMode,setTab,engineFrame,truck,render,setBuild,setCar,setView,setCompare,setGarage,
    allEngines,voiceOf,spotOf,pickCar,carBuild,setRes,present,get CAMNOW(){return CAMNOW;},get RECT(){return RECT;},
    shot(o){Object.assign(APP,o.app||{});if(o.cam)Object.assign(APP.cam,o.cam);APP.camT=null;APP.hoodA=APP.hood?1:0;render(1/60);return true;},
    snap(){render(1/60);return cv.toDataURL('image/png');},bench(n=5){gl.finish();const t=performance.now();for(let i=0;i<n;i++)render(1/60);gl.finish();return (performance.now()-t)/n;}};
}

