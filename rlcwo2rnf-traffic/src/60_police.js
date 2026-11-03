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
/* how many at most, by the graphics level (each is a whole car on the physics: about 0.1 to 0.2 ms a frame here) */
const POL_CAP={mobile:3,low:3,medium:4,high:5,ultra:5},POL_MAX=5,POL_CRUMBS=600;
/* ---------- the wanted level, 1 to 5: how many come after you and what they drive. It rises with the chase, a level
   about every minute or two (the heat: a second of pursuit is 1, a second over 100 mph 1.5), faster for hitting them
   (12) or the traffic (6); a bust or getting away starts it again. Each level: one more car (up to the cap), a
   faster car (polTune, below), and braver round the bends. Dev: Wanted level (Auto or fixed) ---------- */
const WANTED={lvl:1,heat:0,hitT:-9};
const WANT_AT=[0,45,110,200,320];
const wantedLvl=()=>{const v=DEVW.wanted;return v&&v!=='auto'?Math.max(1,Math.min(5,+v||1)):WANTED.lvl;};
/* what they drive: your build, tuned for the level so it tops out at the level's speed on flat tarmac whatever you
   drive (125, 145, 165, 190, 215 mph; the helicopter's 290 is the fastest of all). Its engine scaled (down too, for a
   level slower than your car) and, where its limiter would stop it short, its gearing taller; worked out with the
   garage ratings' own top-speed sum (57_ratings) for 8% over the level's speed, and the driver holds it to the level's
   speed (the sum is only near: a few builds come out 10 to 20 mph off). So a car faster than the level's police gets
   away on the straights; one slower has to out-drive them. Dev, Police engines: Same as yours (your build as you have it) */
const POL_TOP=[125,145,165,190,215],POL_TUNE=new Map();
function polTune(i,L){const key=i+'/'+L;let r=POL_TUNE.get(key);if(r)return r;
  const S=rateSheet(i),e=S.e,vT=POL_TOP[L-1]/2.237*1.08,pw=v=>(S.rr('asphalt')*S.mass*G9+.5*RHO*S.cdA*v*v)*v,vB=Math.max(10,rateBuild(i).figs.top/2.237);
  let g=1;if(!e.cvt){const vl=(e.limiterRpm-60)*TAU/60*S.R/(e.gears[e.nG-1]*e.fd);if(vT*1.04>vl)g=vT*1.04/vl;}
  r={k:Math.max(.06,Math.min(6,pw(vT)/pw(vB))),g};POL_TUNE.set(key,r);return r;}
/* the engine scale and gearing they should have now */
function polTarget(){const i=APP.bi,b=BUILDS[i];if(DEVW.polPow==='same')return {k:Math.max(1,plusK(b.car)),g:plusG(b.car)};return polTune(i,wantedLvl());}
const POL={live:false,cars:[],k:0,cx:new Float64Array(POL_CRUMBS),cz:new Float64Array(POL_CRUMBS),bustT:0,holdT:0,outT:0,home:false,escT:0,escapes:0,slow:false,pitCool:0,pits:0,busts:0,respawns:0,bi:-1,bar:null,spawnT:0,lead:null};
const polCount=()=>{const v=DEVW.polN;return v===undefined||v==='auto'?Math.min(wantedLvl(),POL_CAP[GFX.level]||3):Math.max(1,Math.min(POL_MAX,+v||1));};
const policeWanted=()=>!!APP.police&&!RACE.on&&!(CHAL.run&&CHAL.run.phase!=='done');
function polNew(){return {role:'follow',pitT:0,pitHit:0,V:null,inp:{steer:0,thr:0,brk:0,hb:0,nos:false},ck:0,stuckT:0,revT:0,flipT:0,lostT:0,hold:false,M:new Float32Array(16),Mp:new Float32Array(16),prev:false,ro0:0,ro2:0,
  lamp:{pos:[0,0,0],r:24,col:[0,0,0],type:0,dir:[0,-1,0],cosO:-1},occ:[0,0,0,0,1,0,2,1],vox:null,d:1e9,see:false,MB:new Float32Array(16),MBp:new Float32Array(16)};}
for(let i=0;i<POL_MAX;i++)POL.cars.push(polNew());

/* ---------- your trail: where you were, every 4 m ---------- */
function polCrumb(){const p=GAME.car.p;if(POL.k>0){const j=(POL.k-1)%POL_CRUMBS,dx=p[0]-POL.cx[j],dz=p[2]-POL.cz[j];if(dx*dx+dz*dz<16)return;
    /* (a jump: a reset or a teleport starts the trail again, from here) */
    if(dx*dx+dz*dz>3600){POL.k=0;for(let _i22=0;_i22<POL.cars.length;_i22++){const P=POL.cars[_i22];P.ck=0;}}}
  const j=POL.k%POL_CRUMBS;POL.cx[j]=p[0];POL.cz[j]=p[2];POL.k++;}
/* nothing the physics would stop on (a tree, a post, a wall, a building) along the line from a to b, every 5 m */
function polClear(ax,az,bx,bz){const dx=bx-ax,dz=bz-az,d=hyp2(dx,dz),n=Math.ceil(d/5);
  for(let i=1;i<n;i++){const x=ax+dx*i/n,z=az+dz*i/n,L=WW.colliders.near(x,z);
    for(let q=0;q<L.length;q++){const o=L[q];if(o.t==='c'){const ex=x-o.x,ez=z-o.z,r=o.r+1.4;if(ex*ex+ez*ez<r*r)return false;}
      else if(o.x0!==undefined&&x>o.x0-1.4&&x<o.x1+1.4&&z>o.z0-1.4&&z<o.z1+1.4)return false;}}
  return true;}

/* ---------- a police car on the physics ---------- */
/* (as 42_chassis's makeCar, with the tune: makeCar won't scale an engine down) */
function polMake(){const i=APP.bi,b=BUILDS[i],T=polTarget(),c=buildChassis(i,simOpts()),V=new Vehicle(c,T.k!==1||T.g!==1?plusSpec(specOf(i),T.k,T.g):specOf(i),RANCH.world);
  V.build=b;V.bi=i;V.cg=c.cg;V.low=false;V.locked=false;V.pt.lo=1;V.pt.partShift=true;V.polK=T.k;V.polG=T.g;V.setAssists('ai');devFit(V);V.pt.st='run';V.pt.we=V.pt.e.idle*TAU/60;return V;}
/* set it down at (x, z) facing yaw, moving at v (the wheels rolling, the engine in the gear for it) */
function polPlace(P,x,z,yaw,v){const V=P.V;V.place([x,RANCH.W.heightAt(x,z)+.15,z],yaw);for(const w of V.wheels){w.comp=0;w.ang=0;w.w=v/w.R;w.dig=0;w.FyB=0;w.vt=0;}
  const R=V.M;V.v[0]=R[0]*v;V.v[1]=R[3]*v;V.v[2]=R[6]*v;V.rev=false;V.revT=0;const pt=V.pt,e=pt.e;pt.rev=false;
  const Rw=pt.o.R||V.wheels[2].R;let g=1,ratio;if(e.cvt){ratio=e.cvt.lo*e.fd;pt.cvtR=0;}else{for(;g<e.nG;g++){const rpm=v/Rw*e.gears[g-1]*e.fd*60/TAU;if(rpm<pt.upRpm[g-1]*.95)break;}ratio=e.gears[g-1]*e.fd;}
  pt.st='run';pt.gear=g;pt.shiftT=0;pt.engage=1;pt.locked=v>3;pt.we=Math.max(e.idle*TAU/60,Math.min(e.limiterRpm*TAU/60,v/Rw*ratio));
  P.stuckT=P.revT=P.flipT=P.lostT=0;P.hold=false;P.prev=false;P.ck=Math.max(0,POL.k-1);}
/* back in behind you, out of sight: back along your trail 130 m or more (minBack: no nearer than that; a place you drove,
   so it can be driven), facing along it, at your pace; with no trail yet, behind you the way you're facing */
function polRespawn(P,minBack=0){
  const t=GAME.car,cam=CAM.last,F=cam&&cam.VPw?frustum(cam.VPw):null,want=Math.max(GFX.level==='mobile'?130:160,minBack),v=Math.min(Math.max(12,t.speed*.9),40);
  const inView=(x,z)=>{if(!F)return false;const y=RANCH.W.heightAt(x,z)+1;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-3)return false;}return hyp2(x-cam.eye[0],z-cam.eye[2])<(GFX.far+40);};
  let k=POL.k-1,acc=0,px=t.p[0],pz=t.p[2];
  while(k>0&&k>POL.k-POL_CRUMBS+1){const j=k%POL_CRUMBS,x=POL.cx[j],z=POL.cz[j],sd=hyp2(x-px,z-pz);if(sd>40)break;acc+=sd;px=x;pz=z;
    if(acc>=want&&!inView(x,z)&&!polCrowded(P,x,z)){const j2=(k+1)%POL_CRUMBS,yaw=Math.atan2(-(POL.cz[j2]-z),POL.cx[j2]-x);polPlace(P,x,z,yaw,v);P.ck=k+1;POL.respawns++;return true;}
    if(acc>want+200)break;k--;}
  const M=t.M,hl=hyp2(M[0],M[6])||1,fx=M[0]/hl,fz=M[6]/hl;
  for(const back of [want,want+60,want+120]){const x=t.p[0]-fx*back,z=t.p[2]-fz*back;if(!inView(x,z)&&!polCrowded(P,x,z)){polPlace(P,x,z,Math.atan2(-fz,fx),v*.8);POL.respawns++;return true;}}
  return false;}
const polCrowded=(P,x,z)=>{for(let _i23=0;_i23<POL.cars.length;_i23++){const o=POL.cars[_i23];if(o===P||!o.V)continue;if(hyp2(o.V.p[0]-x,o.V.p[2]-z)<14)return true;}for(let _i24=0;_i24<TRF_ON.length;_i24++){const c=TRF_ON[_i24];if(hyp2(c.x-x,c.z-z)<30)return true;}return false;};
function policeClear(){for(let _i25=0;_i25<POL.cars.length;_i25++){const P=POL.cars[_i25];P.V=null;if(P.vox)P.vox.g.gain.value=0;}POL.live=false;POL.bustT=0;POL.holdT=0;POL.outT=0;POL.home=false;WANTED.lvl=1;WANTED.heat=0;VOX.startT=-1;VOX.place='';heliOff();}

/* ---------- each frame (60_game's step, before the traffic and the physics) ---------- */
function policeFrame(dt){
  if(!policeWanted()){if(POL.live)policeClear();return;}
  const t=GAME.car,N=polCount();
  if(!POL.live){POL.live=true;POL.k=0;polCrumb();truckFar(APP.bi);WANTED.lvl=1;WANTED.heat=0;say('POLICE!',2.2,PAL.red);}
  /* the build changed: they come after you in the new one */
  if(POL.bi!==APP.bi){POL.bi=APP.bi;truckFar(APP.bi);for(let _i26=0;_i26<POL.cars.length;_i26++){const P=POL.cars[_i26];P.V=null;}}
  polCrumb();
  /* busted: a moment, then back to the garage; and nobody after you again till you're out of its block */
  if(POL.outT>0){POL.outT-=dt;if(POL.outT<=0)polHome();}
  if(POL.home){if(hyp2(t.p[0]-HOME[0],t.p[2]-HOME[1])>120){POL.home=false;POL.holdT=0;VOX.startT=-1;}else{POL.near=1e9;POL.lead=null;POL.bustT=0;return;}}
  /* new ones in behind you, one a second */
  /* (new ones join at the back of the pursuit, not on your bumper: getting away from them stays getting away) */
  let back=0;for(let i=0;i<POL.cars.length;i++){const P=POL.cars[i];if(P.V)back=Math.max(back,hyp2(P.V.p[0]-t.p[0],P.V.p[2]-t.p[2])+30);}
  POL.spawnT-=dt;for(let i=0;i<POL_MAX;i++){const P=POL.cars[i];if(i>=N){P.V=null;continue;}if(!P.V&&POL.spawnT<=0&&POL.holdT<=0){P.V=polMake();if(!polRespawn(P,back))P.V=null;POL.spawnT=1;}}
  let near=1e9;POL.lead=null;for(let _i27=0;_i27<POL.cars.length;_i27++){const P=POL.cars[_i27];if(!P.V)continue;const d=hyp2(P.V.p[0]-t.p[0],P.V.p[2]-t.p[2]);if(d<near){near=d;POL.lead=P;}}POL.near=near;
  polHeat(dt,t,near);
  /* got away: every one of them further than the escape distance (Dev: 400, 800, 1200 m; at level 5 the helicopter has
     lost you too) for five seconds running */
  if(POL.holdT<=0&&POL.lead&&near>polEscD()&&(!HELI.on||HELI.d>HELI_SEE)){POL.escT+=dt;if(POL.escT>5){polEscape();return;}}else POL.escT=0;
  {const T=polTarget(),k=T.k*10+T.g;if(Math.abs(k-(POL.kNow||0))>.001){POL.kNow=k;polRefit();}}
  polRoles(dt,t);
  if(POL.holdT>0){POL.holdT-=dt;if(POL.holdT<=0)for(let _i28=0;_i28<POL.cars.length;_i28++){const P=POL.cars[_i28];if(P.V)polRespawn(P);}}
  /* busted: at a standstill (under 0.3 m/s: shoving one out of the way doesn't count) with one at you, three seconds
     running. So they have to stop you: hem you in, or you give up */
  else if(t.speed<.3&&near<8){POL.bustT+=dt;if(POL.bustT>3)polBust();}else if(t.speed>.6||near>=8)POL.bustT=0;
  for(let _i29=0;_i29<POL.cars.length;_i29++){const P=POL.cars[_i29];if(P.V)polDrive(P,dt);}
  voxChase(dt);heliFrame(dt);
}
/* the heat, and the level it makes (Auto) */
function polHeat(dt,t,near){
  if(POL.holdT<=0&&near<300)WANTED.heat+=dt*(t.speed>44.7?1.5:1);
  /* you hit one of them (each police car's knocks are read here, and cleared) */
  for(let i=0;i<POL.cars.length;i++){const P=POL.cars[i];if(!P.V)continue;const e=P.V.ev;if(e.car>0&&P.d<7&&APP.t-WANTED.hitT>2){WANTED.heat+=12;WANTED.hitT=APP.t;}e.car=0;e.wall=0;}
  /* you hit one of the traffic (its knocks counted, near you) */
  for(let i=0;i<TRF_ON.length;i++){const c=TRF_ON[i],h=c.hits|0;if(h<(c.wh|0))c.wh=h;if(h>(c.wh|0)){c.wh=h;if(hyp2(c.x-t.p[0],c.z-t.p[2])<9)WANTED.heat+=6;}}
  while(WANTED.lvl<5&&WANTED.heat>=WANT_AT[WANTED.lvl]){WANTED.lvl++;if(!DEVW.wanted||DEVW.wanted==='auto')polLevelUp();}
}
function polLevelUp(){const L=wantedLvl();say('WANTED LEVEL '+L,2.5,PAL.red);buzz(30);
  if(L===2||L===4){voxSay('radio_backup','radio',0,0,0);setTimeout(()=>voxSay('radio_copy','radio',0,0,0),2600);}}
function polBust(){POL.bustT=0;POL.busts++;POL.outT=2.5;POL.holdT=3;
  if(CAREER.on){const fine=Math.min(500,Math.max(0,cash()));spend(fine);say('BUSTED · $'+fine+' FINE',3.5,PAL.red);}else say('BUSTED',3,PAL.red);
  buzz([60,40,60]);
  let P=null;for(let _i30=0;_i30<POL.cars.length;_i30++){const c=POL.cars[_i30];if(c.V&&(!P||c.d<P.d))P=c;}if(P)voxSay('police_pa_engine_off','pa',P.V.p[0],P.V.p[2],0);setTimeout(()=>voxSay('radio_stopped','radio',0,0,0),3600);}
/* what each one is doing: following you; or (level 2 up) with you slowed right down (crashed, spun, stuck: under
   4 m/s for a second, till you're past 8 again) hemming you in, the nearest across your front, the next at your back,
   the third alongside, any more waiting 15 m off; or (level 3 up, you between 8 and 34 m/s, the nearest close and in sight) a PIT: lined up with your back
   corner, then a nudge into it to turn you round. One PIT at a time, six seconds between */
function polRoles(dt,t){const L=wantedLvl();
  POL.slowT=t.speed<4&&POL.near<40?(POL.slowT||0)+dt:0;if(POL.slow){if(t.speed>8||POL.near>60)POL.slow=false;}else if(POL.slowT>1)POL.slow=true;
  POL.pitCool-=dt;let a=null,b=null,c=null;
  for(let i=0;i<POL.cars.length;i++){const P=POL.cars[i];if(!P.V)continue;
    if(P.role==='pit'&&!(L>=3&&!POL.slow&&P.d<34&&t.speed>7&&t.speed<34)){P.role='follow';P.pitT=0;P.pitHit=0;POL.pitCool=Math.max(POL.pitCool,3);}
    if(P.role!=='pit')P.role='follow';
    if(!a||P.d<a.d){c=b;b=a;a=P;}else if(!b||P.d<b.d){c=b;b=P;}else if(!c||P.d<c.d)c=P;}
  if(L>=2&&POL.slow){if(a&&a.d<45)a.role='front';if(b&&b.d<45)b.role='rear';if(c&&c.d<45)c.role='side';}
  else if(L>=3&&a&&a.role!=='pit'&&a.see&&a.d<30&&t.speed>8&&t.speed<30&&POL.pitCool<=0){a.role='pit';a.pitT=0;a.pitHit=0;}}
/* the level changed: each car out there gets the new level's engine, where it is, at the speed it's doing */
function polRefit(){const T=polTarget();
  for(let i=0;i<POL.cars.length;i++){const P=POL.cars[i],o=P.V;if(!o||Math.abs((o.polK||1)-T.k)<.01&&Math.abs((o.polG||1)-T.g)<.01)continue;
    const M=o.M,ck=P.ck,yaw=Math.atan2(-M[6],M[0]),v=Math.max(0,o.v[0]*M[0]+o.v[2]*M[6]);P.V=polMake();polPlace(P,o.p[0],o.p[2],yaw,v);P.ck=ck;}}
const polEscD=()=>+(DEVW.escD||800)||800;
/* you got away: the chase is over, the police gone for 45 s, the level back to 1 */
function polEscape(){POL.escapes++;POL.escT=0;heliOff();for(let i=0;i<POL.cars.length;i++)POL.cars[i].V=null;POL.holdT=45;POL.bustT=0;WANTED.lvl=1;WANTED.heat=0;VOX.startT=-1;
  say('YOU LOST THEM',3.5,PAL.green);say('THE POLICE ARE BACK IN 45 S',3,PAL.amber);buzz([30,30,30]);
  if(!(HELI.escaping&&voxSay('radio_air_lost','radio',0,0,0)))voxSay('radio_lost_visual','radio',0,0,0);HELI.escaping=false;}
/* back at the garage: the chase over, the level back to 1 */
function polHome(){goTo('garage');for(let i=0;i<POL.cars.length;i++)POL.cars[i].V=null;POL.home=true;POL.holdT=0;POL.bustT=0;WANTED.lvl=1;WANTED.heat=0;
  say('TAKEN BACK TO THE GARAGE',3,PAL.amber);}
/* how a police car drives. It follows your trail (where you drove, so it can be driven), steering for a point a little
   way along it, and reads the trail further on for the bends: no faster than the tightest bend ahead allows, braking in
   time for it. Close behind you and in plain sight it takes a place a few car lengths back (beside you when you stop)
   instead of your bumper. A car in its way (the traffic, another police car, you) it slows for, and goes round when
   there's room. Nothing here knows the physics: it only works the pedals and the wheel, as you do */
const POL_AB=.6,POL_MU=.85;
/* (the working values a police car's drive passes to its helpers: module level, so a frame makes no garbage) */
const PD={px:0,pz:0,fx:0,fz:0,lx:0,lz:0,Lm:0,Wm:0,spd:0,aB:0,probe:0,tl:0,tx:0,tz:0,vt:0,off:0,nf:0,slow:false};
/* the point L along your trail from the car (past the end of it, you) */
function polAlong(P,L){const t=GAME.car,N=POL_CRUMBS;let acc=0,qx=PD.px,qz=PD.pz;PD.tx=t.p[0];PD.tz=t.p[2];
  for(let k=P.ck;k<POL.k;k++){const j=k%N,x=POL.cx[j],z=POL.cz[j],sd=hyp2(x-qx,z-qz);
    if(acc+sd>=L){const u=(L-acc)/Math.max(sd,1e-6);PD.tx=qx+(x-qx)*u;PD.tz=qz+(z-qz)*u;return;}acc+=sd;qx=x;qz=z;}}
/* a car in the way (kind 0: one of the traffic, c; 1: another police car's vehicle; 2: you): slow for it, or (the
   traffic only) go round it. (It's handed the car, not its numbers: a number handed to a function is a little garbage) */
function polObst(c,kind){let ox,oz,ofx,ofz,ov,oL,oW;
  if(kind===0){ox=c.x;oz=c.z;}else{ox=c.p[0];oz=c.p[2];}
  /* (most of the traffic is nowhere near: out before any more sums) */
  const r=PD.probe+8;if(ox<PD.px-r||ox>PD.px+r||oz<PD.pz-r||oz>PD.pz+r)return;
  if(kind===0){ofx=c.fx;ofz=c.fz;ov=c.v;oL=c.m.L;oW=c.m.W;}
  else{const M=c.M,ml=hyp2(M[0],M[6])||1;ofx=M[0]/ml;ofz=M[6]/ml;ov=c.v[0]*ofx+c.v[2]*ofz;oL=c.c.body.L;oW=c.c.body.W;}
  const you=kind===2,pass=kind===0,rx=ox-PD.px,rz=oz-PD.pz,f=rx*PD.fx+rz*PD.fz,ext=(PD.Lm+oL)*.5;if(f<-ext||f>PD.probe)return;
  const sd=rx*PD.lx+rz*PD.lz,half=(PD.Wm+oW)*.5,clear=half+.8;if(Math.abs(sd)>clear+1.5)return;
  const vo=ov*(ofx*PD.fx+ofz*PD.fz),room=f-ext-(you&&PD.slow?1.2:2.5),inPath=f>0&&Math.abs(sd)<half+.3,tl=PD.tl;
  if(inPath&&(PD.spd-vo>.5||room<3)){let cap=room>0?Math.max(0,vo)+Math.sqrt(2*PD.aB*room):Math.max(0,vo+room*1.2);
    if(pass&&room>0&&f<PD.nf){const sg=tl-sd>.3?1:tl-sd<-.3?-1:(sd>0?-1:1),want=sd+sg*clear-tl;
      if(Math.abs(tl+want)<4.5&&polClear(PD.px,PD.pz,PD.tx+PD.lx*want,PD.tz+PD.lz*want)){PD.nf=f;PD.off=want;cap=Math.max(cap,Math.min(vo+9,99));}}
    if(cap<PD.vt)PD.vt=cap;}
  else if(!you&&f<PD.nf&&Math.abs(tl-sd)<clear){const sg=tl-sd>=0?1:-1,want=sd+sg*clear-tl;if(Math.abs(tl+want)<4.5){PD.nf=f;PD.off=want;}}}
function polDrive(P,dt){
  const V=P.V,t=GAME.car,inp=P.inp,spd=V.speed,R=V.M,dx=t.p[0]-V.p[0],dz=t.p[2]-V.p[2],d=hyp2(dx,dz);P.d=d;
  /* holding back after a bust */
  if(POL.holdT>0){inp.thr=0;inp.brk=spd>.6?1:0;inp.hb=spd<.6?1:0;inp.steer=0;return;}
  /* lost you, rolled, or stuck for good: back in behind you */
  /* rolled, or stuck for good: back in, but further back than it was (a crash costs them ground). Left behind, it
     doesn't jump back in behind you: it keeps on after you along your trail, and if they all fall far enough behind
     you've got away (policeFrame) */
  P.flipT=R[4]<.4?P.flipT+dt:0;
  if(P.flipT>2||P.stuckT>6){if(!polRespawn(P,d+60))P.V=null;return;}
  const N=POL_CRUMBS,hl=hyp2(R[0],R[6])||1,fx=R[0]/hl,fz=R[6]/hl,ll=hyp2(R[2],R[8])||1,lx=R[2]/ll,lz=R[8]/ll,
    LV=wantedLvl(),muK=POL_MU+.025*(LV-1),mu=V.tyre.mu||1,aB=(POL_AB+.03*(LV-1))*mu*9.81,px0=V.p[0],pz0=V.p[2],Lm=V.c.body.L,Wm=V.c.body.W;
  P.see=d<140&&polClear(px0,pz0,t.p[0],t.p[2]);
  /* where it is on your trail: past the crumbs it has reached, or left behind it */
  const k0=Math.max(0,POL.k-N+1);if(P.ck<k0)P.ck=k0;
  while(P.ck<POL.k-1){const j=P.ck%N,ex=POL.cx[j]-px0,ez=POL.cz[j]-pz0,e2=ex*ex+ez*ez;if(e2>36&&(ex*fx+ez*fz>0||e2>400))break;P.ck++;}
  /* the point to steer for: Ld along the trail (at the end of it, you) */
  PD.px=px0;PD.pz=pz0;let Ld=Math.max(8,Math.min(34,6+spd*.5));polAlong(P,Ld);
  /* (round a corner the straight line to that point would cut it, through the corner of a building: a nearer one) */
  for(let q=0;q<3&&Ld>5&&!polClear(px0,pz0,PD.tx,PD.tz);q++){Ld*=.6;polAlong(P,Ld);}
  let tx=PD.tx,tz=PD.tz;
  /* the bends ahead on the trail: the turn over each 8 m, the speed it allows (85% of the grip at level 1, 95% at 5),
     braking for it */
  let vt=99;
  {let acc=0,qx=px0,qz=pz0;const look=Math.min(190,spd*spd/(2*aB)+25);
    for(let k=P.ck;k<POL.k-2&&acc<look;k++){const j=k%N,x=POL.cx[j],z=POL.cz[j];acc+=hyp2(x-qx,z-qz);qx=x;qz=z;if(k-2<k0)continue;
      const ja=(k-2)%N,jb=(k+2)%N,ax=x-POL.cx[ja],az=z-POL.cz[ja],bx=POL.cx[jb]-x,bz=POL.cz[jb]-z,la=hyp2(ax,az),lb=hyp2(bx,bz);if(la<1||lb<1)continue;
      const th=Math.acos(Math.max(-1,Math.min(1,(ax*bx+az*bz)/(la*lb)))),kap=th/((la+lb)*.5);if(kap<1e-3)continue;
      const vc=Math.sqrt(muK*mu*9.81/kap),va=Math.sqrt(vc*vc+2*aB*Math.max(0,acc-4));if(va<vt)vt=va;}}
  /* close behind you and in sight (the nearest one only): a place a few car lengths back, at your speed; when you
     stop, just behind you and a little to one side */
  const tv=hyp2(t.v[0],t.v[2]),tM=t.M,thl=hyp2(tM[0],tM[6])||1,hx=tv>2?t.v[0]/tv:tM[0]/thl,hz=tv>2?t.v[2]/tv:tM[6]/thl;
  let close=false;
  if(P.see&&d<60&&POL.lead===P&&P.role==='follow'){close=true;let sx,sz;
    if(t.speed<3){const rx=-hz,rz=hx,sd=(px0-t.p[0])*rx+(pz0-t.p[2])*rz>=0?1:-1,gap=(Lm+t.c.body.L)*.5+1.5;sx=t.p[0]+rx*sd*1.2-hx*gap;sz=t.p[2]+rz*sd*1.2-hz*gap;}
    else{const gap=LV<2?8+tv*.3:LV<3?7+tv*.25:6+tv*.2;sx=t.p[0]-hx*gap;sz=t.p[2]-hz*gap;}
    /* (it still steers along your trail, round the corners you took; the place only sets its speed. Stopped, it
       steers for the place itself) */
    const ex=sx-px0,ez=sz-pz0,ds=hyp2(ex,ez);
    if(t.speed<3){if(ds>Ld){tx=sx;tz=sz;}else{tx=sx+hx*(Ld-ds);tz=sz+hz*(Ld-ds);}}
    const alg=ex*hx+ez*hz;
    vt=Math.min(vt,t.speed<3?Math.sqrt(2*3*Math.max(0,ds-.8)):Math.max(0,tv+Math.max(-tv-2,Math.min(14,alg*.6))));}
  /* hemming you in, or a PIT (polRoles): its own place by you, steered for straight when there's nothing in the way,
     at your speed and a little to close up. These are meant to touch you, so you are not in their way */
  let tac=false;
  if(P.role!=='follow'&&d<45){
    const Lp=t.c.body.L,Wp=t.c.body.W,rx=-hz,rz=hx,sn=(px0-t.p[0])*rx+(pz0-t.p[2])*rz>=0?1:-1,ah=(px0-t.p[0])*hx+(pz0-t.p[2])*hz;
    let sx,sz,vr=0,thru=false;
    if(P.role==='rear'){const g=(Lp+Lm)*.5+.3;sx=t.p[0]-hx*g;sz=t.p[2]-hz*g;}
    else if(P.role==='side'){const w=(Wp+Wm)*.5+.4;sx=t.p[0]+rx*sn*w;sz=t.p[2]+rz*sn*w;}
    else if(P.role==='front'){const g=(Lp+Lm)*.5+.8;
      /* (still to get past: alongside first, a car's width out; then across your nose, slowing) */
      if(ah<g-.5){const w=(Wp+Wm)*.5+1;sx=t.p[0]+hx*(g+2)+rx*sn*w;sz=t.p[2]+hz*(g+2)+rz*sn*w;vr=2;}else{sx=t.p[0]+hx*g;sz=t.p[2]+hz*g;vr=-2;}}
    else{/* the PIT: its nose by your back wheel, a hand's width off; lined up, a nudge through your back corner */
      const w=(Wp+Wm)*.5+.25,bk=(Lp+Lm)*.5-1.3;sx=t.p[0]-hx*bk+rx*sn*w;sz=t.p[2]-hz*bk+rz*sn*w;P.pitT+=dt;
      const ex=sx-px0,ez=sz-pz0;
      if(P.pitHit>0){P.pitHit-=dt;thru=true;vr=2.5;if(P.pitHit<=0){P.role='follow';P.pitT=0;POL.pitCool=6;POL.pits++;}}
      else if(Math.abs(ex*hx+ez*hz)<1&&Math.abs(ex*rx+ez*rz)<.7&&Math.abs(spd-tv)<2.5)P.pitHit=.6;
      else if(P.pitT>7){P.role='follow';P.pitT=0;POL.pitCool=4;}}
    if(thru){tx=t.p[0]-hx*Lp*.3-rx*sn*1.5;tz=t.p[2]-hz*Lp*.3-rz*sn*1.5;tac=true;}
    else if(sx!==undefined&&polClear(px0,pz0,sx,sz)){const ex=sx-px0,ez=sz-pz0,ds=hyp2(ex,ez),la=Math.max(4,Math.min(Ld,4+spd*.3));
      if(ds>la){tx=sx;tz=sz;}else{tx=sx+hx*(la-ds);tz=sz+hz*(la-ds);}tac=true;
      const alg=ex*hx+ez*hz;let vq=tv+vr+Math.max(-6,Math.min(7,alg*.7));
      /* (at your back or side with you near enough stopped: up to the place, then hold, not shove) */
      if((P.role==='rear'||P.role==='side')&&tv<2)vq=Math.min(vq,ds>1.2?Math.sqrt(2*2*(ds-1)):0);
      vt=Math.min(vt,Math.max(0,vq));}
    if(thru)vt=Math.min(vt,tv+vr);}
  /* in its way: a car of the traffic, another police car, or you. Ahead in its path, it slows to that car's speed in
     time (and drops back if it's touching); if it's the traffic and there's room beside it, it goes round instead, its
     line moved over to clear it by a lane's margin, and keeps clear of it while alongside. You, and the other police,
     it never goes round: it falls in behind */
  PD.fx=fx;PD.fz=fz;PD.lx=lx;PD.lz=lz;PD.Lm=Lm;PD.Wm=Wm;PD.spd=spd;PD.aB=aB;PD.probe=Math.max(14,spd*1.8+8);PD.tx=tx;PD.tz=tz;PD.tl=(tx-px0)*lx+(tz-pz0)*lz;PD.vt=vt;PD.off=0;PD.nf=1e9;PD.slow=t.speed<3;
  for(let i=0;i<TRF_ON.length;i++)polObst(TRF_ON[i],0);
  /* (another police car only if it's ahead of this one on your trail, or level: the one behind gives way, so two
     can't wait on each other) */
  for(let i=0;i<POL.cars.length;i++){const o=POL.cars[i];if(o!==P&&o.V&&o.ck>=P.ck)polObst(o.V,1);}
  if(!tac)polObst(t,2);
  if(!tac&&POL.slow&&LV>=2&&P.role==='follow')PD.vt=Math.min(PD.vt,Math.sqrt(2*3*Math.max(0,d-15)));
  vt=PD.vt;
  /* another police car ahead of it on your trail: it keeps its distance, counted along the trail, so round a corner too */
  for(let i=0;i<POL.cars.length;i++){const o=POL.cars[i];if(o===P||!o.V||o.ck<=P.ck||o.ck-P.ck>20)continue;
    const room=(o.ck-P.ck)*4.2-(Lm+o.V.c.body.L)*.5-4-spd*.3,vo=o.V.speed,cap=room>0?vo+Math.sqrt(2*aB*room):Math.max(0,vo+room*1.2);if(cap<vt)vt=cap;}
  if(PD.off){tx+=lx*PD.off;tz+=lz*PD.off;}
  /* steering: the arc that reaches the point, as a share of what the steering can do at this speed (44_ai's _aim),
     turned no faster than a driver would */
  const ax=tx-px0,az=tz-pz0,L2=ax*ax+az*az,side=ax*R[2]+az*R[8],fwd=ax*R[0]+az*R[6],ang=Math.atan(V.c.wb*2*side/Math.max(L2,1)),
    lim=Math.min(V.c.lock,V.tyre.aPk*1.6+V.c.wb*9/Math.max(spd*spd,1));let steer=Math.max(-1,Math.min(1,ang/lim));
  if(fwd<0&&!close)vt=Math.min(vt,6);
  /* (the level's top speed, held like a governor) */
  if(DEVW.polPow!=='same')vt=Math.min(vt,POL_TOP[LV-1]/2.237);
  let thr=spd<vt+1?Math.max(0,Math.min(1,(vt-spd)*.5+.3)):0,brk=spd>vt+1.5?Math.min(1,(spd-vt)/6):0;
  /* (holding still: on the handbrake, not the brake, which held at a standstill would be reverse) */
  if(vt<.5&&spd<1){thr=0;brk=0;}
  /* stuck against something: back off, turning the other way, then go again */
  if(P.revT>0){P.revT-=dt;thr=0;brk=1;steer=-steer;}
  /* (stuck is also wanting to stay put for three seconds with you 20 m off or more: hemmed in by a queue, or by
     another car; it backs off, and in the end comes back in further back) */
  else{P.waitT=spd<1&&vt<1&&d>20?(P.waitT||0)+dt:0;
    if(spd<1.2&&(thr>.5||P.waitT>3)&&d>8)P.stuckT+=dt;else P.stuckT=Math.max(0,P.stuckT-dt*.5);if(P.stuckT>1.6&&P.stuckT<1.6+dt*1.5)P.revT=1.6;}
  const rate=(2.5+30/(spd+5))*dt;inp.steer=P.revT>0?steer:inp.steer+Math.max(-rate,Math.min(rate,steer-inp.steer));
  inp.thr=thr;inp.brk=brk;inp.hb=vt<.5&&spd<1?1:0;inp.nos=false;
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
  if(P.ro0!==RO[0]||P.ro2!==RO[2]){if(P.prev){P.Mp[12]-=RO[0]-P.ro0;P.Mp[14]-=RO[2]-P.ro2;}P.ro0=RO[0];P.ro2=RO[2];}}heliPrep();}
const POL_PAINT=Float32Array.from(lin('#141518')),POL_WHITE=Float32Array.from(lin('#f0f0ec')),POL_RIM=Float32Array.from(lin('#2a2b2e')),POL_WP=new Float32Array(16);
function policeDraw(U,eye){
  if(!POL.live)return 0;const u=CUR.u,F=frustum(U.uVP),[rOn,bOn]=polFlash(),B=polBar();let tris=0;
  for(let _i33=0;_i33<POL.cars.length;_i33++){const P=POL.cars[_i33];if(!P.V)continue;const V=P.V,T=TRUCKF[V.build.id];if(!T){P.prev=false;continue;}
    const x=V.p[0]-RO[0],y=V.p[1]-RO[1],z=V.p[2]-RO[2],r=V.c.body.L*.6+1;let inside=true;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-r){inside=false;break;}}
    if(!inside||hyp2(V.p[0]-eye[0],V.p[2]-eye[2])>GFX.far+20){P.prev=false;continue;}
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
  tris+=heliDraw(U,u);
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
    if(rOn){q.col[0]=70;q.col[1]=3;q.col[2]=2;}else{q.col[0]=3;q.col[1]=10;q.col[2]=80;}L.dyn.push(q);}heliLight(L);}
function policeOcc(occ){if(!POL.live)return;for(let _i36=0;_i36<POL.cars.length;_i36++){const P=POL.cars[_i36];if(!P.V||occ.length>=8||P.d>60)continue;const V=P.V,o=P.occ,M=V.M,l=hyp2(M[0],M[6])||1,D=carD(V);
  o[0]=V.p[0]-RO[0];o[1]=V.p[1]-RO[1];o[2]=V.p[2]-RO[2];o[3]=V.cg[1];o[4]=M[0]/l;o[5]=M[6]/l;o[6]=D.L/2;o[7]=V.build.look.track/2+.12;occ.push(o);}}

/* ---------- the siren: a wail, a yelp up close; each car its own, where it is, with the Doppler ---------- */
/* the siren's pitch and loudness (Dev): deeper and quieter than it was by default; 'As before' is the old one exactly.
   Deeper is the sweep lower and the edge off it (a low-pass in place of the band-pass) */
const SIREN_P={deep:.72,lower:.85,orig:1},SIREN_V={'25':.25,'40':.4,'60':.6,'100':1};
function policeSound(c){const A=ENG.audio;if(!A||!c)return;const ctx=A.ctx,now=ctx.currentTime,pk=SIREN_P[DEVW.sirP]||.72,vk=SIREN_V[DEVW.sirV]??.4,ft=pk<1?'lowpass':'bandpass';
  for(let _i37=0;_i37<POL.cars.length;_i37++){const P=POL.cars[_i37];
    if(!P.V||!POL.live||GAME.state!=='drive'||POL.holdT>0){if(P.vox)P.vox.g.gain.setTargetAtTime(0,now,.1);continue;}
    if(!P.vox){const o=ctx.createOscillator(),o2=ctx.createOscillator(),m2=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
      o.type='sawtooth';o2.type='square';m2.gain.value=.35;f.type='bandpass';f.Q.value=1.1;g.gain.value=0;o.connect(f);o2.connect(m2);m2.connect(f);f.connect(g);
      if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);o.start();o2.start();P.vox={o,o2,f,g,p,ph:Math.random()};}
    const v=P.vox,V=P.V,dx=V.p[0]-c.eye[0],dz=V.p[2]-c.eye[2],d=hyp2(dx,dz)||1,yelp=P.d<45,per=yelp?.32:4.4,ph=((APP.t/per+v.ph)%1),
      sw=yelp?Math.abs(ph*2-1):.5-.5*Math.cos(ph*TAU),base=(yelp?720+780*sw:600+760*sw)*pk,
      vr=((V.v[0]-GAME.car.v[0])*dx+(V.v[2]-GAME.car.v[2])*dz)/d,f=base/(1+Math.max(-.3,Math.min(.3,vr/343)));
    if(v.f.type!==ft){v.f.type=ft;v.f.Q.value=ft==='lowpass'?.7:1.1;}
    v.o.frequency.setTargetAtTime(f,now,.02);v.o2.frequency.setTargetAtTime(f*.5,now,.02);v.f.frequency.setTargetAtTime(f*(ft==='lowpass'?2.2:1.4),now,.05);
    v.g.gain.setTargetAtTime(.22*vk/(1+Math.pow(d/30,1.3)),now,.05);
    if(v.p){const rx=-c.fwd[2],rz=c.fwd[0];v.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*rx+dz*rz)/d*.85)),now,.05);}}
  heliSound(c,A);}

/* ---------- the HUD: the nearest one's distance, flashing; the dots on the maps ---------- */
const WANT_TXT=['','WANTED *....','WANTED **...','WANTED ***..','WANTED ****.','WANTED *****'];
const ESC_TXT=['LOSING THEM 5','LOSING THEM 4','LOSING THEM 3','LOSING THEM 2','LOSING THEM 1','LOSING THEM 0'];
function policeHud(C){if(!POL.live||POL.home)return;if(POL.holdT>5&&!POL.lead)return;C.push([WANT_TXT[wantedLvl()],true,PAL.red]);heliHud(C);
  if(POL.escT>0)C.push([ESC_TXT[Math.min(5,Math.floor(POL.escT))],true,PAL.green]);if(!(POL.near<1e8))return;const [r,b]=polFlash();C.push(['POLICE '+fmtDist(POL.near),true,r?PAL.red:b?PAL.cyan:PAL.white]);
  if(POL.bustT>.3)C.push(['STOPPING YOU '+Math.max(0,3-POL.bustT).toFixed(1),true,PAL.red]);}
function policeMapDots(toXY){if(!POL.live)return;const [r]=polFlash();for(let _i38=0;_i38<POL.cars.length;_i38++){const P=POL.cars[_i38];if(!P.V)continue;const q=toXY(P.V.p[0],P.V.p[2]);if(q)hDisc(q[0],q[1],1.3,r?PAL.red:PAL.cyan);}heliMapDot(toXY);}

/* ---------- the voices (49_voices.js, from VOICE_PROMPTS.md): the police radio in your car, the loudspeaker from
   theirs (the traffic's drivers don't talk: they honk). Each decoded once, the first time police mode comes on; a line with no recording
   yet is simply not heard (VOX.log keeps every cue, heard or not, for the tools) ---------- */
const VOX={buf:{},warm:false,until:0,log:[],heard:[],inP:false,t:{},lostT:0,lost:false,place:'',startT:-1,backup:false};
function voxWarm(){const A=ENG.audio;if(!A||VOX.warm)return;VOX.warm=true;for(const k in VOICES)if(VOX.buf[k]===undefined){VOX.buf[k]=null;
  fetch(VOICES[k]).then(r=>r.arrayBuffer()).then(a=>A.ctx.decodeAudioData(a)).then(d=>{VOX.buf[k]=d;}).catch(()=>{});}}
/* one line: kind 'radio' (in your car, the scanner's band, a squelch click either side), 'pa' (from x, z: a megaphone)
   or 'yell' (from x, z); not over another line, and not the same line again within its own wait */
function voxSay(name,kind,x,z,wait=8){
  const now=APP.t;if(VOX.t[name]!==undefined&&now-VOX.t[name]<wait)return false;VOX.log.push(name);if(VOX.log.length>40)VOX.log.shift();
  /* (not ready, or another line still going: not said, and not counted as said) */
  const A=ENG.audio,b=VOX.buf[name];if(!A||!b)return false;const ctx=A.ctx,t0=ctx.currentTime;if(t0<VOX.until)return false;VOX.until=t0+b.duration+.3;VOX.t[name]=now;VOX.heard.push(name);if(VOX.heard.length>40)VOX.heard.shift();
  const src=ctx.createBufferSource();src.buffer=b;const g=ctx.createGain();let head=src;
  if(kind!=='yell'){const f=ctx.createBiquadFilter(),w=ctx.createWaveShaper(),k=kind==='radio'?2.2:4,c=new Float32Array(256);
    for(let i=0;i<256;i++){const x=i/127.5-1;c[i]=Math.tanh(x*k)/Math.tanh(k);}w.curve=c;f.type='bandpass';f.frequency.value=kind==='radio'?1700:1300;f.Q.value=kind==='radio'?.9:.7;src.connect(f);f.connect(w);head=w;}
  head.connect(g);let vol=kind==='radio'?.5:.9;
  if(kind!=='radio'&&CAM.last){const c=CAM.last,dx=x-c.eye[0],dz=z-c.eye[2],d=hyp2(dx,dz)||1;vol/=1+Math.pow(d/(kind==='pa'?35:12),1.3);
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
  const t=GAME.car,now=APP.t;if(VOX.startT<0){VOX.startT=now;VOX.lost=false;VOX.lostT=0;VOX.backup=false;VOX.inP=false;}
  /* (the sound starts with the engine, at the first touch of the gas: the voices are decoded the first frame it's up) */
  if(!VOX.warm)voxWarm();
  /* the call that starts it: as soon as it can be heard, within the chase's first twelve seconds */
  if(!VOX.inP&&now-VOX.startT>1.5&&now-VOX.startT<12&&voxSay('radio_in_pursuit','radio',0,0,0))VOX.inP=true;
  /* where the chase has got to: into town, out onto the salt */
  const td=Math.max(Math.abs(t.p[0]),Math.abs(t.p[2])),pl=td<WG.EDGE?'town':WG.saltD(t.p[0],t.p[2])>WG.LAND+80?'salt':'country';
  if(pl!==VOX.place){if(pl==='town'&&VOX.place)voxSay('radio_in_town','radio',0,0,40);if(pl==='salt')voxSay('radio_heading_salt','radio',0,0,40);VOX.place=pl;}
  /* lost sight of you for six seconds, and found you again */
  let see=false,close=null;for(let _i39=0;_i39<POL.cars.length;_i39++){const P=POL.cars[_i39];if(!P.V)continue;if(P.see)see=true;if(P.see&&P.d<50&&(!close||P.d<close.d))close=P;}
  VOX.lostT=see?0:VOX.lostT+dt;if(!VOX.lost&&VOX.lostT>6){VOX.lost=true;voxSay('radio_lost_visual','radio',0,0,20);}
  if(VOX.lost&&see){VOX.lost=false;voxSay('radio_back_on','radio',0,0,20);}
  /* the loudspeaker, close behind you and you still going */
  if(close&&t.speed>3&&now-(VOX.paT||-99)>9+Math.random()*5){VOX.paT=now;const V=close.V;voxSay(pl==='salt'&&Math.random()<.4?'police_pa_salt':VOX_PA[Math.floor(Math.random()*VOX_PA.length)],'pa',V.p[0],V.p[2],0);}
}
