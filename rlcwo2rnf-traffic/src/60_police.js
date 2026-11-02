/* =====================================================================================
   POLICE MODE (rlcwo2rnf+traffic): switched on and off on the Drive tab. The police come after you anywhere: the
   town, the country, off the road, out onto the salt flats and on across them, and they never give up. They drive
   what you drive (the same build, on the same physics, with the robot's stability control, ABS and traction
   control, in black and white with a light bar), so on a straight they hold the gap you leave them: keep just out
   of their reach and you can lead them as far out into the emptiness as you like.
   Each is a car on the physics with a pursuit driver: in sight of you (no tree, post or wall in the way, 140 m at
   most) it aims at where you'll be; out of sight it follows your trail (where you were every few metres, for the last
   few minutes), so it comes round the same corners you did. It goes as fast as the turn ahead allows, closes on you
   and matches your speed once it's on your bumper; stuck against something it backs off and goes again. One that
   has lost you (far behind for a few seconds, rolled, stuck for good) comes back in behind you, out of sight, on your
   trail, already moving: the chase never ends. Stopped with a police car beside you for three seconds: BUSTED (a
   $500 fine in the career; free play counts them), they back off, and a few seconds later it starts again.
   Off for races and timed challenges. The siren wails, and yelps once they're close; the light bar flashes red and
   blue, and lights the ground round them at night. They're dots on the corner map and the big one.
   ===================================================================================== */
const POL_N={mobile:1,low:1,medium:2,high:2,ultra:3},POL_MAX=4,POL_CRUMBS=600;
const POL={live:false,cars:[],k:0,cx:new Float64Array(POL_CRUMBS),cz:new Float64Array(POL_CRUMBS),bustT:0,holdT:0,busts:0,respawns:0,bi:-1,bar:null,spawnT:0};
const polCount=()=>{const v=DEVW.polN;return v===undefined||v==='auto'?POL_N[GFX.level]||2:Math.max(1,Math.min(POL_MAX,+v||1));};
const policeWanted=()=>!!APP.police&&!RACE.on&&!(CHAL.run&&CHAL.run.phase!=='done');
function polNew(){return {V:null,inp:{steer:0,thr:0,brk:0,hb:0,nos:false},ck:0,stuckT:0,revT:0,flipT:0,lostT:0,hold:false,M:new Float32Array(16),Mp:new Float32Array(16),prev:false,ro0:0,ro2:0,
  lamp:{pos:[0,0,0],r:24,col:[0,0,0],type:0,dir:[0,-1,0],cosO:-1},occ:[0,0,0,0,1,0,2,1],vox:null,d:1e9,see:false,MB:new Float32Array(16),MBp:new Float32Array(16)};}
for(let i=0;i<POL_MAX;i++)POL.cars.push(polNew());

/* ---------- your trail: where you were, every 4 m ---------- */
function polCrumb(){const p=GAME.car.p,k=POL.k;if(k>0){const j=(k-1)%POL_CRUMBS,dx=p[0]-POL.cx[j],dz=p[2]-POL.cz[j];if(dx*dx+dz*dz<16)return;
    /* (a jump: a reset or a teleport starts the trail again) */
    if(dx*dx+dz*dz>3600){POL.k=0;for(let _i22=0;_i22<POL.cars.length;_i22++){const P=POL.cars[_i22];P.ck=0;}}}
  const j=k%POL_CRUMBS;POL.cx[j]=p[0];POL.cz[j]=p[2];POL.k++;}
/* nothing the physics would stop on (a tree, a post, a wall, a building) along the line from a to b, every 5 m */
function polClear(ax,az,bx,bz){const dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz),n=Math.ceil(d/5);
  for(let i=1;i<n;i++){const x=ax+dx*i/n,z=az+dz*i/n,L=WW.colliders.near(x,z);
    for(let q=0;q<L.length;q++){const o=L[q];if(o.t==='c'){const ex=x-o.x,ez=z-o.z,r=o.r+1.4;if(ex*ex+ez*ez<r*r)return false;}
      else if(o.x0!==undefined&&x>o.x0-1.4&&x<o.x1+1.4&&z>o.z0-1.4&&z<o.z1+1.4)return false;}}
  return true;}

/* ---------- a police car on the physics ---------- */
function polMake(){const i=APP.bi,b=BUILDS[i];const V=makeCar(i,RANCH.world,simOpts(),plusK(b.car),plusG(b.car));V.setAssists('ai');devFit(V);V.pt.st='run';V.pt.we=V.pt.e.idle*TAU/60;return V;}
/* set it down at (x, z) facing yaw, moving at v (the wheels rolling, the engine in the gear for it) */
function polPlace(P,x,z,yaw,v){const V=P.V;V.place([x,RANCH.W.heightAt(x,z)+.15,z],yaw);for(const w of V.wheels){w.comp=0;w.ang=0;w.w=v/w.R;w.dig=0;w.FyB=0;w.vt=0;}
  const R=V.M;V.v[0]=R[0]*v;V.v[1]=R[3]*v;V.v[2]=R[6]*v;V.rev=false;V.revT=0;const pt=V.pt,e=pt.e;pt.rev=false;
  const Rw=pt.o.R||V.wheels[2].R;let g=1,ratio;if(e.cvt){ratio=e.cvt.lo*e.fd;pt.cvtR=0;}else{for(;g<e.nG;g++){const rpm=v/Rw*e.gears[g-1]*e.fd*60/TAU;if(rpm<pt.upRpm[g-1]*.95)break;}ratio=e.gears[g-1]*e.fd;}
  pt.st='run';pt.gear=g;pt.shiftT=0;pt.engage=1;pt.locked=v>3;pt.we=Math.max(e.idle*TAU/60,Math.min(e.limiterRpm*TAU/60,v/Rw*ratio));
  P.stuckT=P.revT=P.flipT=P.lostT=0;P.hold=false;P.prev=false;P.ck=Math.max(0,POL.k-1);}
/* back in behind you, out of sight: back along your trail 130 to 320 m (a place you drove, so it can be driven), facing
   along it, at your pace; with no trail yet, behind you the way you're facing */
function polRespawn(P){
  const t=GAME.car,cam=CAM.last,F=cam&&cam.VPw?frustum(cam.VPw):null,want=GFX.level==='mobile'?130:160,v=Math.min(Math.max(8,t.speed*.9),40);
  const inView=(x,z)=>{if(!F)return false;const y=RANCH.W.heightAt(x,z)+1;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-3)return false;}return Math.hypot(x-cam.eye[0],z-cam.eye[2])<(GFX.far+40);};
  let k=POL.k-1,acc=0,px=t.p[0],pz=t.p[2];
  while(k>0&&k>POL.k-POL_CRUMBS+1){const j=k%POL_CRUMBS,x=POL.cx[j],z=POL.cz[j],sd=Math.hypot(x-px,z-pz);if(sd>40)break;acc+=sd;px=x;pz=z;
    if(acc>=want&&!inView(x,z)&&!polCrowded(P,x,z)){const j2=(k+1)%POL_CRUMBS,yaw=Math.atan2(-(POL.cz[j2]-z),POL.cx[j2]-x);polPlace(P,x,z,yaw,v);P.ck=k+1;POL.respawns++;return true;}
    if(acc>320)break;k--;}
  const M=t.M,hl=Math.hypot(M[0],M[6])||1,fx=M[0]/hl,fz=M[6]/hl;
  for(const back of [want,want+60,want+120]){const x=t.p[0]-fx*back,z=t.p[2]-fz*back;if(!inView(x,z)&&!polCrowded(P,x,z)){polPlace(P,x,z,Math.atan2(-fz,fx),v*.6);POL.respawns++;return true;}}
  return false;}
const polCrowded=(P,x,z)=>{for(let _i23=0;_i23<POL.cars.length;_i23++){const o=POL.cars[_i23];if(o===P||!o.V)continue;if(Math.hypot(o.V.p[0]-x,o.V.p[2]-z)<10)return true;}for(let _i24=0;_i24<TRF_ON.length;_i24++){const c=TRF_ON[_i24];if(Math.hypot(c.x-x,c.z-z)<8)return true;}return false;};
function policeClear(){for(let _i25=0;_i25<POL.cars.length;_i25++){const P=POL.cars[_i25];P.V=null;if(P.vox)P.vox.g.gain.value=0;}POL.live=false;POL.bustT=0;POL.holdT=0;VOX.startT=-1;VOX.place='';}

/* ---------- each frame (60_game's step, before the traffic and the physics) ---------- */
function policeFrame(dt){
  if(!policeWanted()){if(POL.live)policeClear();return;}
  const t=GAME.car,N=polCount();
  if(!POL.live){POL.live=true;POL.k=0;polCrumb();truckFar(APP.bi);say('POLICE!',2.2,PAL.red);}
  /* the build changed: they come after you in the new one */
  if(POL.bi!==APP.bi){POL.bi=APP.bi;truckFar(APP.bi);for(let _i26=0;_i26<POL.cars.length;_i26++){const P=POL.cars[_i26];P.V=null;}}
  polCrumb();
  /* new ones in behind you, one a second */
  POL.spawnT-=dt;for(let i=0;i<POL_MAX;i++){const P=POL.cars[i];if(i>=N){P.V=null;continue;}if(!P.V&&POL.spawnT<=0){P.V=polMake();if(!polRespawn(P))P.V=null;POL.spawnT=1;}}
  /* busted: stopped with one beside you for three seconds */
  let near=1e9;for(let _i27=0;_i27<POL.cars.length;_i27++){const P=POL.cars[_i27];if(P.V)near=Math.min(near,Math.hypot(P.V.p[0]-t.p[0],P.V.p[2]-t.p[2]));}POL.near=near;
  if(POL.holdT>0){POL.holdT-=dt;if(POL.holdT<=0)for(let _i28=0;_i28<POL.cars.length;_i28++){const P=POL.cars[_i28];if(P.V)polRespawn(P);}}
  else if(t.speed<1.5&&near<8){POL.bustT+=dt;if(POL.bustT>3)polBust();}else POL.bustT=Math.max(0,POL.bustT-dt*2);
  for(let _i29=0;_i29<POL.cars.length;_i29++){const P=POL.cars[_i29];if(P.V)polDrive(P,dt);}
  voxChase(dt);
}
function polBust(){POL.bustT=0;POL.holdT=6;POL.busts++;
  if(CAREER.on){const fine=Math.min(500,Math.max(0,cash()));spend(fine);say('BUSTED · $'+fine+' FINE',3.5,PAL.red);}else say('BUSTED',3,PAL.red);
  say('THEY\'LL BE BACK',3,PAL.amber);buzz([60,40,60]);
  let P=null;for(let _i30=0;_i30<POL.cars.length;_i30++){const c=POL.cars[_i30];if(c.V&&(!P||c.d<P.d))P=c;}if(P)voxSay('police_pa_engine_off','pa',P.V.p[0],P.V.p[2],0);setTimeout(()=>voxSay('radio_stopped','radio',0,0,0),3600);}
function polDrive(P,dt){
  const V=P.V,t=GAME.car,inp=P.inp,spd=V.speed,dx=t.p[0]-V.p[0],dz=t.p[2]-V.p[2],d=Math.hypot(dx,dz);P.d=d;
  /* holding back after a bust */
  if(POL.holdT>0){inp.thr=0;inp.brk=spd>.6?1:0;inp.hb=spd<.6?1:0;inp.steer=0;return;}
  /* lost you, rolled, or stuck for good: back in behind you */
  P.lostT=d>(GFX.level==='mobile'?240:300)?P.lostT+dt:0;P.flipT=V.M[4]<.4?P.flipT+dt:0;
  if(P.lostT>3||P.flipT>2||P.stuckT>6){polRespawn(P);return;}
  /* where to aim: at you (where you'll be) in plain sight, else along your trail */
  let tx,tz;P.see=d<140&&polClear(V.p[0],V.p[2],t.p[0],t.p[2]);
  if(P.see){const tau=Math.min(1.2,d/Math.max(8,spd))*.8;tx=t.p[0]+t.v[0]*tau;tz=t.p[2]+t.v[2]*tau;P.ck=Math.max(P.ck,POL.k-2);}
  else{if(P.ck<POL.k-POL_CRUMBS+1)P.ck=POL.k-POL_CRUMBS+1;
    while(P.ck<POL.k-1){const j=P.ck%POL_CRUMBS;if(Math.hypot(POL.cx[j]-V.p[0],POL.cz[j]-V.p[2])>Math.max(10,spd*.5))break;P.ck++;}
    const ahead=Math.min(POL.k-1,P.ck+Math.max(1,Math.round(spd*.25))),j=ahead%POL_CRUMBS;tx=POL.cx[j];tz=POL.cz[j];if(ahead>=POL.k-1){tx=t.p[0];tz=t.p[2];}}
  /* steering: the arc that reaches it, as a share of what the steering can do at this speed (44_ai's _aim) */
  const ax=tx-V.p[0],az=tz-V.p[2],L2=ax*ax+az*az,side=ax*V.M[2]+az*V.M[8],fwd=ax*V.M[0]+az*V.M[6],kk=2*side/Math.max(L2,1),ang=Math.atan(V.c.wb*kk),
    lim=Math.min(V.c.lock,V.tyre.aPk*1.6+V.c.wb*9/Math.max(spd*spd,1));let steer=Math.max(-1,Math.min(1,ang/lim));
  /* how fast: flat out when far, as fast as the turn to the target allows, and your speed (and a little) on your bumper */
  const dl=Math.sqrt(L2)||1,sa=Math.abs(side)/dl,R=Math.max(4,dl/(2*Math.max(.05,sa))),vc=fwd<0?6:Math.sqrt(9.81*(V.tyre.mu||1)*R)*1.15;
  /* (you stopped or nearly: it pulls up a few metres off rather than shoving you along) */
  const vt=Math.min(t.speed<3&&d<25?Math.max(0,(d-6)*.7):d>45?99:Math.max(t.speed*1.04+(d>14?5:1.5),6),vc);
  let thr=spd<vt?1:spd<vt+2?.3:0,brk=spd>vt+3?Math.min(1,(spd-vt)/8):0;
  /* (holding still: on the handbrake, not the brake, which held at a standstill would be reverse) */
  if(vt<.5&&spd<1){thr=0;brk=0;}
  /* stuck against something: back off, turning the other way, then go again */
  if(P.revT>0){P.revT-=dt;thr=0;brk=1;steer=-steer;}
  else{if(spd<1.2&&thr>.5&&d>8)P.stuckT+=dt;else P.stuckT=Math.max(0,P.stuckT-dt*.5);if(P.stuckT>1.6&&P.stuckT<1.6+dt*1.5)P.revT=1.6;}
  inp.steer=steer;inp.thr=thr;inp.brk=brk;inp.hb=vt<.5&&spd<1?1:0;inp.nos=false;
}
/* each physics step, with the traffic's (60_traffic trafficSub): the police on the physics, into the contact list */
function policeSub(dt,list){if(!POL.live)return;for(let _i31=0;_i31<POL.cars.length;_i31++){const P=POL.cars[_i31];if(P.V){P.V.step(dt,P.inp);list.push(P.V);}}}

/* ---------- drawing ---------- */
/* the light bar: a black base, a red lens on the left and a blue on the right, each lit or dark */
function polBar(){if(POL.bar)return POL.bar;const box=(mb,x0,y0,z0,x1,y1,z1,col,em,mat)=>mb.box(x0,y0,z0,x1,y1,z1,col,em,mat);
  const base=new MB();box(base,-.17,0,-.56,.17,.07,.56,[.025,.025,.03],0,MAT.COL);box(base,-.05,.07,-.03,.05,.14,.03,[.03,.03,.035],0,MAT.COL);
  const lens=(z0,z1,col,on)=>{const mb=new MB();box(mb,-.14,.07,z0,.14,.15,z1,on?col:col.map(v=>v*.18),on?7:0,on?MAT.EMIT:MAT.COL);return mb.build();};
  return POL.bar={base:base.build(),rOn:lens(-.52,-.04,[1,.06,.04],1),rOff:lens(-.52,-.04,[1,.06,.04],0),bOn:lens(.04,.52,[.08,.25,1],1),bOff:lens(.04,.52,[.08,.25,1],0)};}
/* where the bar sits on this car's roof: over the middle of the roof, on its highest point there */
function polBarAt(V){const T=TRUCKF[V.build.id]||truckFar(V.bi),D=T.D;if(D._bar)return D._bar;
  if(!D.G){return D._bar=[0,(D.H||1.6)+.05];}
  const u=(D.G.rf+D.G.rr)/2,r=secRing(D,u);let y=0;for(const p of r.p)y=Math.max(y,p[1]);return D._bar=[D.X(u),y];}
const polFlash=()=>{const a=(APP.t*1.5)%1,s=(APP.t*9)%1<.55;return [a<.5&&s,a>=.5&&s];};
function policePrep(){if(!POL.live)return;for(let _i32=0;_i32<POL.cars.length;_i32++){const P=POL.cars[_i32];if(!P.V)continue;const V=P.V,R=V.M,M=P.M,cg=V.cg;
  M[0]=R[0];M[1]=R[3];M[2]=R[6];M[3]=0;M[4]=R[1];M[5]=R[4];M[6]=R[7];M[7]=0;M[8]=R[2];M[9]=R[5];M[10]=R[8];M[11]=0;M[15]=1;
  M[12]=V.p[0]-R[0]*cg[0]-R[1]*cg[1]-RO[0];M[13]=V.p[1]-R[3]*cg[0]-R[4]*cg[1]-RO[1];M[14]=V.p[2]-R[6]*cg[0]-R[7]*cg[1]-RO[2];
  if(P.ro0!==RO[0]||P.ro2!==RO[2]){if(P.prev){P.Mp[12]-=RO[0]-P.ro0;P.Mp[14]-=RO[2]-P.ro2;}P.ro0=RO[0];P.ro2=RO[2];}}}
const POL_PAINT=Float32Array.from(lin('#141518')),POL_WHITE=Float32Array.from(lin('#f0f0ec')),POL_RIM=Float32Array.from(lin('#2a2b2e')),POL_WP=new Float32Array(16);
function policeDraw(U,eye){
  if(!POL.live)return 0;const u=CUR.u,F=frustum(U.uVP),[rOn,bOn]=polFlash(),B=polBar();let tris=0;
  for(let _i33=0;_i33<POL.cars.length;_i33++){const P=POL.cars[_i33];if(!P.V)continue;const V=P.V,T=TRUCKF[V.build.id];if(!T){P.prev=false;continue;}
    const x=V.p[0]-RO[0],y=V.p[1]-RO[1],z=V.p[2]-RO[2],r=V.c.body.L*.6+1;let inside=true;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-r){inside=false;break;}}
    if(!inside||Math.hypot(V.p[0]-eye[0],V.p[2]-eye[2])>GFX.far+20){P.prev=false;continue;}
    gl.uniform3fv(u.uPaint,POL_PAINT);gl.uniform3fv(u.uPaint2,POL_WHITE);gl.uniform3fv(u.uRim,POL_RIM);gl.uniform3fv(u.uCal,POL_RIM);gl.uniform3fv(u.uClad,POL_PAINT);
    const D=T.D;gl.uniform1f(u.uLiv,5);gl.uniform4f(u.uLivP,D.X(0),D.X(D.L),D.belt(2.5),D.Hr);gl.uniform1f(u.uLamps,SKY.lightsOn?1:0);gl.uniform1f(u.uBrake,V.brkIn>.05?1:0);
    gl.uniform3f(u.uGlow,0,0,0);gl.uniform1f(u.uDirt,.05);gl.uniform1f(u.uMudLocal,1);gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uPrevOn,1);
    gl.uniformMatrix4fv(u.uM,false,P.M);gl.uniformMatrix4fv(u.uPrevM,false,P.prev?P.Mp:P.M);drawMesh(T.body);if(T.hood)drawMesh(T.hood);tris+=T.tris;
    for(let k=0;k<4;k++){const w=V.wheels[k],s=w.hp[2]<0?-1:1,st=w.front?V.steer:0,hx=w.hp[0]+V.cg[0],hy=w.hp[1]-w.len+V.cg[1],hz=w.hp[2];gl.uniform1f(u.uMudOff,w.R);
      if(P.prev){wheelMat(P.Mp,hx,hy,hz,st,s,w.ang);POL_WP.set(WHM);}wheelMat(P.M,hx,hy,hz,st,s,w.ang);gl.uniformMatrix4fv(u.uM,false,WHM);gl.uniformMatrix4fv(u.uPrevM,false,P.prev?POL_WP:WHM);
      drawMesh(w.front?T.wheel:T.wheelR);}
    /* the light bar on the roof */
    const [bx,by]=polBarAt(V);gl.uniform1f(u.uLiv,0);gl.uniform1f(u.uMudLocal,0);
    for(let q=0;q<16;q++){P.MB[q]=P.M[q];P.MBp[q]=P.prev?P.Mp[q]:P.M[q];}
    for(const A of [P.MB,P.MBp]){A[12]+=A[0]*bx+A[4]*by;A[13]+=A[1]*bx+A[5]*by;A[14]+=A[2]*bx+A[6]*by;}
    gl.uniformMatrix4fv(u.uM,false,P.MB);gl.uniformMatrix4fv(u.uPrevM,false,P.MBp);drawMesh(B.base);drawMesh(rOn?B.rOn:B.rOff);drawMesh(bOn?B.bOn:B.bOff);
    P.Mp.set(P.M);P.prev=true;}
  gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);gl.uniform1f(u.uPrevOn,0);gl.uniform1f(u.uDirt,0);gl.uniform1f(u.uLiv,0);gl.uniform1f(u.uLamps,0);gl.uniform1f(u.uBrake,0);
  return tris;}
function policeShadow(F,used,G,VP){if(!POL.live)return used;
  for(let _i34=0;_i34<POL.cars.length;_i34++){const P=POL.cars[_i34];if(!P.V)continue;const V=P.V,T=TRUCKF[V.build.id];if(!T)continue;const x=V.p[0],y=V.p[1],z=V.p[2],r=V.c.body.L*.6+1;let inside=true;
    for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-r){inside=false;break;}}if(!inside)continue;
    if(!used){used=true;useLit(P_DEPTH);G.uni(P_DEPTH,'uVP',VP);G.uni(P_DEPTH,'uInst',0);gl.disable(gl.CULL_FACE);}
    gl.uniformMatrix4fv(CUR.u.uM,false,P.M);drawMesh(T.body);}
  return used;}
/* the bar's flashes as the frame's own lamps at night: red, then blue */
function policeLights(L){if(!POL.live||!SKY.lightsOn)return;const [rOn,bOn]=polFlash();
  for(let _i35=0;_i35<POL.cars.length;_i35++){const P=POL.cars[_i35];if(!P.V||L.dyn.length>=16||P.d>220)continue;const M=P.M,[bx,by]=polBarAt(P.V),q=P.lamp;if(!rOn&&!bOn)continue;
    q.pos[0]=M[12]+M[0]*bx+M[4]*(by+.3);q.pos[1]=M[13]+M[1]*bx+M[5]*(by+.3);q.pos[2]=M[14]+M[2]*bx+M[6]*(by+.3);
    if(rOn){q.col[0]=70;q.col[1]=3;q.col[2]=2;}else{q.col[0]=3;q.col[1]=10;q.col[2]=80;}L.dyn.push(q);}}
function policeOcc(occ){if(!POL.live)return;for(let _i36=0;_i36<POL.cars.length;_i36++){const P=POL.cars[_i36];if(!P.V||occ.length>=8||P.d>60)continue;const V=P.V,o=P.occ,M=V.M,l=Math.hypot(M[0],M[6])||1,D=carD(V);
  o[0]=V.p[0]-RO[0];o[1]=V.p[1]-RO[1];o[2]=V.p[2]-RO[2];o[3]=V.cg[1];o[4]=M[0]/l;o[5]=M[6]/l;o[6]=D.L/2;o[7]=V.build.look.track/2+.12;occ.push(o);}}

/* ---------- the siren: a wail, a yelp up close; each car its own, where it is, with the Doppler ---------- */
function policeSound(c){const A=ENG.audio;if(!A||!c)return;const ctx=A.ctx,now=ctx.currentTime;
  for(let _i37=0;_i37<POL.cars.length;_i37++){const P=POL.cars[_i37];
    if(!P.V||!POL.live||GAME.state!=='drive'||POL.holdT>0){if(P.vox)P.vox.g.gain.setTargetAtTime(0,now,.1);continue;}
    if(!P.vox){const o=ctx.createOscillator(),o2=ctx.createOscillator(),m2=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
      o.type='sawtooth';o2.type='square';m2.gain.value=.35;f.type='bandpass';f.Q.value=1.1;g.gain.value=0;o.connect(f);o2.connect(m2);m2.connect(f);f.connect(g);
      if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);o.start();o2.start();P.vox={o,o2,f,g,p,ph:Math.random()};}
    const v=P.vox,V=P.V,dx=V.p[0]-c.eye[0],dz=V.p[2]-c.eye[2],d=Math.hypot(dx,dz)||1,yelp=P.d<45,per=yelp?.32:4.4,ph=((APP.t/per+v.ph)%1),
      sw=yelp?Math.abs(ph*2-1):.5-.5*Math.cos(ph*TAU),base=yelp?720+780*sw:600+760*sw,
      vr=((V.v[0]-GAME.car.v[0])*dx+(V.v[2]-GAME.car.v[2])*dz)/d,f=base/(1+Math.max(-.3,Math.min(.3,vr/343)));
    v.o.frequency.setTargetAtTime(f,now,.02);v.o2.frequency.setTargetAtTime(f*.5,now,.02);v.f.frequency.setTargetAtTime(f*1.4,now,.05);
    v.g.gain.setTargetAtTime(.22/(1+Math.pow(d/30,1.3)),now,.05);
    if(v.p){const rx=-c.fwd[2],rz=c.fwd[0];v.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*rx+dz*rz)/d*.85)),now,.05);}}}

/* ---------- the HUD: the nearest one's distance, flashing; the dots on the maps ---------- */
function policeHud(C){if(!POL.live||!(POL.near<1e8))return;const [r,b]=polFlash();C.push(['POLICE '+fmtDist(POL.near),true,r?PAL.red:b?PAL.cyan:PAL.white]);
  if(POL.bustT>.3)C.push(['STOPPING YOU '+Math.max(0,3-POL.bustT).toFixed(1),true,PAL.red]);}
function policeMapDots(toXY){if(!POL.live)return;const [r]=polFlash();for(let _i38=0;_i38<POL.cars.length;_i38++){const P=POL.cars[_i38];if(!P.V)continue;const q=toXY(P.V.p[0],P.V.p[2]);if(q)hDisc(q[0],q[1],1.3,r?PAL.red:PAL.cyan);}}

/* ---------- the voices (49_voices.js, from VOICE_PROMPTS.md): the police radio in your car, the loudspeaker from
   theirs, a driver you've hit. Each decoded once, the first time police mode comes on; a line with no recording
   yet is simply not heard (VOX.log keeps every cue, heard or not, for the tools) ---------- */
const VOX={buf:{},until:0,log:[],t:{},lostT:0,lost:false,place:'',startT:-1,backup:false};
function voxWarm(){const A=ENG.audio;if(!A)return;for(const k in VOICES)if(VOX.buf[k]===undefined){VOX.buf[k]=null;
  fetch(VOICES[k]).then(r=>r.arrayBuffer()).then(a=>A.ctx.decodeAudioData(a)).then(d=>{VOX.buf[k]=d;}).catch(()=>{});}}
/* one line: kind 'radio' (in your car, the scanner's band, a squelch click either side), 'pa' (from x, z: a megaphone)
   or 'yell' (from x, z); not over another line, and not the same line again within its own wait */
function voxSay(name,kind,x,z,wait=8){
  const now=APP.t;if(VOX.t[name]!==undefined&&now-VOX.t[name]<wait)return false;VOX.t[name]=now;VOX.log.push(name);if(VOX.log.length>40)VOX.log.shift();
  const A=ENG.audio,b=VOX.buf[name];if(!A||!b)return false;const ctx=A.ctx,t0=ctx.currentTime;if(t0<VOX.until)return false;VOX.until=t0+b.duration+.3;
  const src=ctx.createBufferSource();src.buffer=b;const g=ctx.createGain();let head=src;
  if(kind!=='yell'){const f=ctx.createBiquadFilter(),w=ctx.createWaveShaper(),k=kind==='radio'?2.2:4,c=new Float32Array(256);
    for(let i=0;i<256;i++){const x=i/127.5-1;c[i]=Math.tanh(x*k)/Math.tanh(k);}w.curve=c;f.type='bandpass';f.frequency.value=kind==='radio'?1700:1300;f.Q.value=kind==='radio'?.9:.7;src.connect(f);f.connect(w);head=w;}
  head.connect(g);let vol=kind==='radio'?.5:.9;
  if(kind!=='radio'&&CAM.last){const c=CAM.last,dx=x-c.eye[0],dz=z-c.eye[2],d=Math.hypot(dx,dz)||1;vol/=1+Math.pow(d/(kind==='pa'?35:12),1.3);
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner(),rx=-c.fwd[2],rz=c.fwd[0];p.pan.value=Math.max(-1,Math.min(1,(dx*rx+dz*rz)/d*.8));g.connect(p);p.connect(A.master);}else g.connect(A.master);}
  else g.connect(A.master);
  g.gain.value=vol;src.start(t0+(kind==='radio'?.09:0));
  /* the squelch: a breath of static either side of a radio line */
  if(kind==='radio'){for(const at of [t0,t0+.09+b.duration]){const n=ctx.createBufferSource(),nb=ctx.createBuffer(1,Math.round(ctx.sampleRate*.07),ctx.sampleRate),d=nb.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.25;n.buffer=nb;const ng=ctx.createGain();ng.gain.value=.35;n.connect(ng);ng.connect(A.master);n.start(at);}}
  return true;}
const VOX_PA=['police_pa_pull_over','police_pa_stop_vehicle','police_pa_pull_over_now','police_pa_slow_down'];
/* the cues, each frame of a chase (from policeFrame) */
function voxChase(dt){
  const t=GAME.car,now=APP.t;if(VOX.startT<0){VOX.startT=now;VOX.lost=false;VOX.lostT=0;VOX.backup=false;voxWarm();}
  if(now-VOX.startT>1.5&&now-VOX.startT<2)voxSay('radio_in_pursuit','radio',0,0,60);
  /* where the chase has got to: into town, out onto the salt */
  const td=Math.max(Math.abs(t.p[0]),Math.abs(t.p[2])),pl=td<WG.EDGE?'town':WG.saltD(t.p[0],t.p[2])>WG.LAND+80?'salt':'country';
  if(pl!==VOX.place){if(pl==='town'&&VOX.place)voxSay('radio_in_town','radio',0,0,40);if(pl==='salt')voxSay('radio_heading_salt','radio',0,0,40);VOX.place=pl;}
  /* lost sight of you for six seconds, and found you again */
  let see=false,close=null;for(let _i39=0;_i39<POL.cars.length;_i39++){const P=POL.cars[_i39];if(!P.V)continue;if(P.see)see=true;if(P.see&&P.d<50&&(!close||P.d<close.d))close=P;}
  VOX.lostT=see?0:VOX.lostT+dt;if(!VOX.lost&&VOX.lostT>6){VOX.lost=true;voxSay('radio_lost_visual','radio',0,0,20);}
  if(VOX.lost&&see){VOX.lost=false;voxSay('radio_back_on','radio',0,0,20);}
  if(!VOX.backup&&now-VOX.startT>90){VOX.backup=true;voxSay('radio_backup','radio',0,0,120);setTimeout(()=>voxSay('radio_copy','radio',0,0,120),2600);}
  /* the loudspeaker, close behind you and you still going */
  if(close&&t.speed>3&&now-(VOX.paT||-99)>9+Math.random()*5){VOX.paT=now;const V=close.V;voxSay(pl==='salt'&&Math.random()<.4?'police_pa_salt':VOX_PA[Math.floor(Math.random()*VOX_PA.length)],'pa',V.p[0],V.p[2],0);}
}
