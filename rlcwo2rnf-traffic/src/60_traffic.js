/* =====================================================================================
   LIFE ON THE ROADS: traffic on Highway 40 (rlcwo2rnf+traffic).
   Each car rides a lane, three each way on the right, where the road's paint has them (13_lit.js: 3.6 m lanes
   either side of a 0.3 m median, so their middles 2.1, 5.7 and 9.3 m out), and each lane is a loop: out along one
   side, round on the pavement just short of the barrels where the highway runs out on the salt, back along the
   other. Off the physics, its speed is the intelligent driver model's: it wants the road's speed (60 mph out in the
   country, 35 through town, slow round the turns at the ends; a little over or under it, by the driver), keeps a
   time gap to whatever is ahead in its lane (another car, you, a red light at one of the town's junctions, on the
   same 30 s cycle the signals show) and brakes no harder than a car can. About one driver in ten has their eyes
   elsewhere and sees you stopped in their lane only 25 to 45 m off: too late at highway speed, so stopping in a lane
   is a risk. Blocked, it moves over when the next lane
   has room; free, it keeps right. It sits on the road's own height (a profile along the highway from the world's
   generator, filled in round you a stretch at a time), pitched to its slope.
   Near you a car goes onto the physics the moment it would touch you (or another car on the physics) within the next
   0.6 s, or would have to brake harder than a car can for you: then it is a real car, with its own steering and
   pedals following the same rules, and the contacts between it and you are the physics' own (44_ai carContacts, as
   in a race). A car you have hit, or that hit you, stops and honks; once nothing is near it, it is upright and back by
   its lane, it rides the lane again and moves on. One left on its side or off the road stays where it is (not stepped
   once it is still and nothing is near) until it's out of sight.
   Cars are kept round you out to just past the draw distance. One that falls out of that range is moved to where
   you can't see it (past the draw distance, or out of the camera's view) and starts again there, so none pops into
   sight. Every car's numbers live in arrays made once: a frame of traffic makes no garbage.
   Drawn from 33_car_mesh's copies, each one mesh, one draw a car a pass: the light one (the body with its stations eight
   times apart and no underside, plain wheels: 9 to 12 thousand triangles) at middle distance, the far one (stations
   sixteen apart and only where the outline needs them, no small parts: 5 to 7 thousand) beyond that and into the
   shadow maps; up close the race's coarse copy (the light body on a phone) with its own wheels turning. Each car in a
   paint of its own; at night its lamps on and the nearest few headlights lighting the road. Off for races and timed
   challenges.
   ===================================================================================== */
/* how many cars round you, by graphics level (the Dev tab can set its own); how far their shadows reach; headlights */
const TRF_N={mobile:8,low:10,medium:14,high:24,ultra:32},TRF_SHD={mobile:40,low:50,medium:60,high:90,ultra:120},TRF_LAMPS={mobile:2,low:2,medium:3,high:4,ultra:6};
/* out to where each car is drawn from its light copy (the far copy beyond; a phone goes straight from the close-up to the far copy) */
const TRF_MID={mobile:28,low:45,medium:55,high:70,ultra:90};
/* the factory cars on the road, and how often each comes up */
const TRF_MODELS=[['stock',3],['wagon',2],['pickup',3],['hatch',3],['ev',2],['trail',1],['coupe',1],['muscle',1]];
const TRF_PAINT=['#e9e9e6','#1c1d20','#a2a6aa','#5d6268','#1f3658','#7b1c21','#b42020','#cbb68c','#2e4a3a','#d8d4c6','#3c6fa9','#c46a1c','#f2f2ef','#2b2d31','#8a8f94','#16213a'];
const TRF_MAX=40,TRF_NEAR=28,TRF_SETTLE={steer:0,thr:0,brk:0,hb:1,nos:false};
const TRF={live:false,models:[],cars:[],t:0,spawned:0,recycled:0,laneChanges:0,ms:0,tris:0,why:0};
let TRF_SEED=1906;const trfRnd=()=>(TRF_SEED^=TRF_SEED<<13,TRF_SEED^=TRF_SEED>>>17,TRF_SEED^=TRF_SEED<<5,(TRF_SEED>>>0)/4294967296);
const trfCount=()=>{const v=DEVW.trafN;return v===undefined||v==='auto'?TRF_N[GFX.level]||12:Math.max(0,Math.min(TRF_MAX,+v||0));};
/* off for races and timed challenges, and when it's switched off on the Drive tab */
const trafficWanted=()=>APP.traffic!==false&&!RACE.on&&!(CHAL.run&&CHAL.run.phase!=='done');

/* ---------- Highway 40's lanes as loops ---------- */
const HW={lanes:[2.1,5.7,9.3],loops:null,prof:null,pOK:null,px0:0,pdx:4,pn:0,blk:16,town:395,vTown:15.6,vCountry:26.8};
/* a centripetal Catmull-Rom spline through points P[1]..P[n-2] (P[0] and P[n-1] only steer it), k pieces a span, onto out */
function crInto(P,k,out){
  const d=(a,b)=>Math.pow(Math.hypot(b[0]-a[0],b[1]-a[1]),.5)||1e-3;
  for(let i=1;i<P.length-2;i++){const p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2],t1=d(p0,p1),t2=t1+d(p1,p2),t3=t2+d(p2,p3);
    for(let j=i===1?0:1;j<=k;j++){const t=t1+(t2-t1)*j/k,L=(a,b,ta,tb)=>[(a[0]*(tb-t)+b[0]*(t-ta))/(tb-ta),(a[1]*(tb-t)+b[1]*(t-ta))/(tb-ta)];
      const A1=L(p0,p1,0,t1),A2=L(p1,p2,t1,t2),A3=L(p2,p3,t2,t3),B1=L(A1,A2,0,t2),B2=L(A2,A3,t1,t3),C=L(B1,B2,t1,t2);out.push(C[0],C[1]);}}
}
function hwBuild(){
  const X=WG.HWY_X-14,R=8.5,loops=[],jn=WG.TW.jn.filter(n=>n.z===0&&n.sig).sort((a,b)=>a.x-b.x);
  for(let k=0;k<3;k++){const zk=HW.lanes[k],m=R-zk;
    /* the east end's turn, from the eastbound lane round to the westbound one (a left turn, across the median), on a
       circle 8.5 m round centred 14 m short of the barrels; the west end's is the same turned half round */
    const T=[[X-110,zk],[X-80,zk],[X-50,zk],[X-28,zk+m*.35],[X-14,zk+m*.85],[X-4,R]];
    for(let j=1;j<=5;j++){const f=j/6*PI;T.push([X+R*Math.sin(f),R*Math.cos(f)]);}
    T.push([X-4,-R],[X-14,-(zk+m*.85)],[X-28,-(zk+m*.35)],[X-50,-zk],[X-80,-zk],[X-110,-zk]);
    const dense=[];for(let x=-X+80;x<X-80;x+=4)dense.push(x,zk);
    const iE=dense.length/2;crInto(T,10,dense);const iW=dense.length/2-1;
    for(let x=X-84;x>-X+80;x-=4)dense.push(x,-zk);
    crInto(T.map(([x,z])=>[-x,-z]),10,dense);dense.length-=2;
    /* resampled every 2 m along it, closed */
    const nd=dense.length/2,cum=new Float64Array(nd+1);for(let i=1;i<=nd;i++){const a=(i-1)*2,b=(i%nd)*2;cum[i]=cum[i-1]+Math.hypot(dense[b]-dense[a],dense[b+1]-dense[a+1]);}
    const len=cum[nd],n=Math.round(len/2),ds=len/n,x=new Float64Array(n),z=new Float64Array(n);
    for(let i=0,j=0;i<n;i++){const s=i*ds;while(j<nd-1&&cum[j+1]<s)j++;const f=(s-cum[j])/((cum[j+1]-cum[j])||1),a=j*2,b=((j+1)%nd)*2;x[i]=dense[a]+(dense[b]-dense[a])*f;z[i]=dense[a+1]+(dense[b+1]-dense[a+1])*f;}
    const tx=new Float32Array(n),tz=new Float32Array(n),kap=new Float32Array(n),vA=new Float32Array(n);
    for(let i=0;i<n;i++){const a=(i-1+n)%n,b=(i+1)%n,dx=x[b]-x[a],dz=z[b]-z[a],l=Math.hypot(dx,dz)||1;tx[i]=dx/l;tz[i]=dz/l;}
    for(let i=0;i<n;i++){const a=(i-2+n)%n,b=(i+2)%n,c=tx[a]*tz[b]-tz[a]*tx[b],e=tx[a]*tx[b]+tz[a]*tz[b];kap[i]=Math.atan2(c,e)/(4*ds);}
    /* the road's speed: town or country, slow enough round a bend, then braked back from every slower bit */
    for(let i=0;i<n;i++){const v0=Math.abs(x[i])<HW.town?HW.vTown:HW.vCountry,ak=Math.abs(kap[i]);vA[i]=ak>1e-4?Math.min(v0,Math.sqrt(2.4/ak)):v0;}
    for(let r=0;r<2;r++)for(let i=n-1;i>=0;i--){const j=(i+1)%n;vA[i]=Math.min(vA[i],Math.sqrt(vA[j]*vA[j]+2*1.1*ds));}
    /* the straights: east from xE0 at s 0 for lenE; west from xW0 at sW0 for as long. Lane changes and new cars only
       well away from the turns (inside turnX) */
    const L={k,zk,n,ds,len,x,z,tx,tz,kap,vA,xE0:-X+80,lenE:cum[iE],xW0:X-80,sW0:cum[iW],turnX:X-200,stopS:null,stopPh:null};
    /* the signals in town: a stop line short of each junction, on the side you come in from */
    const st=[];for(const j of jn){const hx=j.hx+2;st.push([hwS(L,j.x-hx,1),j.ph],[hwS(L,j.x+hx,-1),j.ph]);}
    st.sort((a,b)=>a[0]-b[0]);L.stopS=Float64Array.from(st.map(a=>a[0]));L.stopPh=Float32Array.from(st.map(a=>a[1]));
    loops.push(L);}
  HW.loops=loops;
  /* the road's height along it (at its centre line: across the six lanes it is level to a few centimetres), filled in
     round you a block of 64 m a frame (hwFill) */
  HW.px0=-WG.HWY_X-24;HW.pn=Math.ceil((2*WG.HWY_X+48)/HW.pdx)+2;HW.prof=new Float32Array(HW.pn);HW.pOK=new Uint8Array(Math.ceil(HW.pn/HW.blk));
}
/* the distance along a loop of a point on one of its straights (dir 1 east, -1 west) */
const hwS=(L,x,dir)=>dir>0?x-L.xE0:L.sW0+(L.xW0-x);
/* which straight a distance along a loop is on, well clear of the turns: 1 east, -1 west, 0 neither */
function hwDir(L,s){if(s<=L.lenE)return Math.abs(L.xE0+s)<L.turnX?1:0;if(s>=L.sW0&&s<=L.sW0+L.lenE)return Math.abs(L.xW0-(s-L.sW0))<L.turnX?-1:0;return 0;}
const HWS={o:{}};
function hwFill(px,most){const B=HW.blk,nb=HW.pOK.length;let done=0;
  const c=Math.max(0,Math.min(nb-1,Math.floor((px-HW.px0)/HW.pdx/B)));
  for(let r=0;r<nb&&done<most;r++)for(let q=0;q<2;q++){const b=q?c+r:c-r;if(b<0||b>=nb||HW.pOK[b]||done>=most)continue;
    for(let i=b*B;i<Math.min(HW.pn,(b+1)*B);i++){WG.sample(HW.px0+i*HW.pdx,0,HWS.o);HW.prof[i]=HWS.o.h;}HW.pOK[b]=1;done++;}}
const hwReady=x=>{const i=Math.floor((x-HW.px0)/HW.pdx);return i>=0&&i<HW.pn-1&&!!HW.pOK[Math.floor(i/HW.blk)]&&!!HW.pOK[Math.floor((i+1)/HW.blk)];};
/* the road's height at x, and its slope along x */
const HWY={y:0,g:0};
function hwY(x){const f=(x-HW.px0)/HW.pdx,i=Math.max(0,Math.min(HW.pn-2,Math.floor(f))),t=f-i,a=HW.prof[i],b=HW.prof[i+1];HWY.y=a+(b-a)*t;HWY.g=(b-a)/HW.pdx;return HWY;}

/* ---------- the cars' kinds: one settled on its springs on flat ground (its ride height, its wheels), its light copy ---------- */
let TRF_FLAT=null;
function trfModel(id,w){
  const bi=BUILDS.findIndex(b=>b.id===id);if(bi<0)return null;const b=BUILDS[bi];
  if(!TRF_FLAT)TRF_FLAT=new GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9);
  const v=makeCar(bi,TRF_FLAT);v.setAssists('real');v.place([0,0,0],0);v.pt.start();for(let k=0;k<240;k++)v.step(DT,TRF_SETTLE);v.v.fill(0);v.w.fill(0);
  const hubs=v.wheels.map(q=>[q.hp[0]+v.cg[0],q.hp[1]-q.len+v.cg[1],q.hp[2],q.hp[2]<0?-1:1,q.front]);
  const T=truckLite(bi,hubs);if(!T)return null;const D=T.D,c3=h=>Float32Array.from(lin(h));
  return {id,bi,b,T,w,v,pool:[v],made:1,rideH:v.p[1],cg0:v.cg[0],cg1:v.cg[1],L:v.c.body.L,W:v.c.body.W,wb:v.c.wb,hubs,wR:[v.wheels[0].R,v.wheels[2].R],comp0:v.wheels.map(q=>q.comp),
    rim:c3(b.rim),cal:c3(b.cal),clad:c3(b.clad),livP:new Float32Array([D.X(0),D.X(D.L),D.belt(2.5),D.Hr]),lampX:D.L/2-.1,lampY:.78+liftOf(v)};
}
/* (one kind a call, so starting the traffic costs a frame here and there, never one long one; on a laptop each kind's
   coarse copy too, for the cars close by) */
function trfModelsStep(){
  if(TRF.models.length<TRF_MODELS.length){const [id,w]=TRF_MODELS[TRF.models.length];const m=trfModel(id,w);TRF.models.push(m||{id,w:0,T:null});return true;}
  if(GFX.level!=='mobile')for(const m of TRF.models)if(m.T&&!TRUCKF[m.id]){truckFar(m.bi);return true;}
  /* a second car of each kind ready for the physics, so a crash never waits for one to be made */
  for(const m of TRF.models)if(m.T&&m.made<2){const V=makeCar(m.bi,RANCH.world);V.setAssists('real');m.pool.push(V);m.made++;return true;}
  return false;}
const trfKeeps=id=>GFX.level!=='mobile'&&TRF.models.some(m=>m.id===id);
function trfPickModel(){let tot=0;for(const m of TRF.models)if(m.T)tot+=m.w;if(!tot)return null;let r=trfRnd()*tot;for(const m of TRF.models){if(!m.T)continue;r-=m.w;if(r<=0)return m;}return null;}

/* ---------- a car ---------- */
function trfNew(){return {on:false,look:160,m:null,L:null,goL:null,goK:-1,mode:'kin',veh:null,inp:{steer:0,thr:0,brk:0,hb:0,nos:false},physT:0,safeT:0,stopT:0,honkT:0,wreck:false,hits:0,s:0,v:0,acc:0,lat:0,lat0:0,lcT:9,lcDur:3,vk:1,T:1.4,a:1.5,b:2.5,s0:2.5,dir:0,lp:0,
  x:0,y:0,z:0,fx:1,fz:0,ox:0,oy:0,oz:0,M:new Float32Array(16),Mp:new Float32Array(16),prev:false,ro0:0,ro2:0,wa:0,wap:0,st:0,brake:false,lcNext:0,
  paint:new Float32Array(3),dirt:0,d2:1e9,vis:false,
  lamp:{pos:[0,0,0],r:32,col:[150,145,130],type:1,dir:[0,0,0],cosO:Math.cos(.6)},occ:[0,0,0,0,1,0,2,1]};}
for(let i=0;i<TRF_MAX;i++)TRF.cars.push(trfNew());
/* the cars that are out, nearest first (for the lamps and the shade under them) */
const TRF_ON=[];
function trfClear(){for(const c of TRF.cars){if(c.mode!=='kin')trfFree(c);c.on=false;}TRF.live=false;TRF_ON.length=0;TRF_PHYS.length=0;}
/* a car's place on the road from where it is along its loop: position, heading, pitch; the model matrix's turn (its
   place relative to the floating origin is put in each frame by trafficPrep) */
function trfPose(c){
  const L=c.L,f=c.s/L.ds,i=Math.floor(f)%L.n,j=(i+1)%L.n,t=f-Math.floor(f);
  let tx=L.tx[i]+(L.tx[j]-L.tx[i])*t,tz=L.tz[i]+(L.tz[j]-L.tz[i])*t;const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
  /* moving over to the next lane: across on a smooth step, the nose turned a little the way it's going */
  let lat=0,yaw=0;if(c.lcT<c.lcDur){const u=c.lcT/c.lcDur;lat=c.lat0*(1-u*u*(3-2*u));yaw=-c.lat0*6*u*(1-u)/c.lcDur/Math.max(2,c.v);}
  c.lat=lat;
  const x=L.x[i]+(L.x[j]-L.x[i])*t-tz*lat,z=L.z[i]+(L.z[j]-L.z[i])*t+tx*lat;
  if(yaw){const cy=Math.cos(yaw),sy=Math.sin(yaw),ax=tx*cy-tz*sy,az=tz*cy+tx*sy;tx=ax;tz=az;}
  const g=hwY(x),gy=g.g*tx,fl=Math.sqrt(1+gy*gy),Fx=tx/fl,Fy=gy/fl,Fz=tz/fl;
  /* up: square to forward in its upright plane; right: forward x up */
  const uy=Math.sqrt(Math.max(1e-6,1-Fy*Fy)),Ux=-Fy*Fx/uy,Uy=uy,Uz=-Fy*Fz/uy,Rx=Fy*Uz-Fz*Uy,Ry=Fz*Ux-Fx*Uz,Rz=Fx*Uy-Fy*Ux;
  const m=c.m,h=m.rideH-m.cg1,M=c.M;
  c.ox=x+Ux*h-Fx*m.cg0;c.oy=g.y+Uy*h-Fy*m.cg0;c.oz=z+Uz*h-Fz*m.cg0;
  M[0]=Fx;M[1]=Fy;M[2]=Fz;M[3]=0;M[4]=Ux;M[5]=Uy;M[6]=Uz;M[7]=0;M[8]=Rx;M[9]=Ry;M[10]=Rz;M[11]=0;M[15]=1;
  c.x=x;c.y=g.y;c.z=z;c.fx=tx;c.fz=tz;c.st=Math.atan(m.wb*L.kap[i]);
  c.dir=hwDir(L,c.s);c.lp=L.zk+lat;
}

/* ---------- the driver: the intelligent driver model ---------- */
/* the acceleration it wants behind something gap metres ahead (bumper to bumper) going vL its way */
function trfIdm(c,v0,gap,vL){const v=c.v,dv=v-vL,ss=c.s0+Math.max(0,v*c.T+v*dv/(2*Math.sqrt(c.a*c.b))),g=Math.max(gap,.1),q=v/Math.max(v0,.5);
  return c.a*(1-q*q*q*q-(ss/g)*(ss/g));}
/* what a car wants in the lane at lp (lane position: metres out from the median, to the right of its way): the free
   road's pull, or less for the nearest thing ahead in that lane (TRF.why: 0 nothing, 1 a car, 2 you or another car on
   the physics) */
const ACT=[];
function trfAhead(c,lp,v0,k){
  const m=c.m,L=c.L;let acc=c.a*(1-Math.pow(c.v/Math.max(v0,.5),4)),why=0;if(k===undefined)k=L.k;
  for(const o of TRF_ON){if(o===c||o.mode!=='kin')continue;let gap;
    if(c.dir!==0&&o.dir===c.dir){const al=(o.x-c.x)*c.dir;if(al<=0||al>200||Math.abs(o.lp-lp)>(m.W+o.m.W)/2+.3&&o.L.k!==k)continue;gap=al-(m.L+o.m.L)/2;}
    else if(o.L===L&&lp===c.lp){let d=o.s-c.s;if(d<0)d+=L.len;if(d<=0||d>200)continue;gap=d-(m.L+o.m.L)/2;}
    else continue;
    const a=trfIdm(c,v0,gap,o.v);if(a<acc){acc=a;why=1;}}
  for(const t of ACT){const dx=t.p[0]-c.x,dz=t.p[2]-c.z,al=dx*c.fx+dz*c.fz;if(al<=-2||al>c.look)continue;
    const lr=-dx*c.fz+dz*c.fx,M=t.M,hf=Math.hypot(M[0],M[6])||1,ct=(M[0]*c.fx+M[6]*c.fz)/hf,sn=(-M[0]*c.fz+M[6]*c.fx)/hf,tL=t.c.body.L/2,tW=t.c.body.W/2,
      pa=Math.abs(ct)*tL+Math.abs(sn)*tW,pw=Math.abs(sn)*tL+Math.abs(ct)*tW;
    if(Math.abs(c.lp+lr-lp)>m.W/2+pw+.4)continue;
    const gap=al-m.L/2-pa;if(gap<-m.L)continue;const a=trfIdm(c,v0,gap,t.v[0]*c.fx+t.v[2]*c.fz);if(a<acc){acc=a;why=2;}}
  TRF.why=why;return acc;}
/* the light at the next stop line along its loop: 1e9 when nothing holds it, else the acceleration that stops it there.
   On the amber a driver goes if it will reach the line before the red at the speed it has, and holds that speed (c.goK:
   the line it has decided to go through, until it is past it); otherwise it stops, as hard as it has to. Through on the
   red only when it can't stop at all */
function trfLight(c,v0){const L=c.L,S=L.stopS,n=S.length;if(!n)return 1e9;const front=c.s+c.m.L/2;let k=0;while(k<n&&S[k]<front-1)k++;
  if(c.goK>=0&&(c.goL!==L||c.goK!==k))c.goK=-1;
  const gap=(k<n?S[k]:S[0]+L.len)-front;TRF.lgap=1e9;if(gap>140)return 1e9;
  const tt=((APP.t/30+L.stopPh[k%n]+.5)%1+1)%1;if(tt<.42){c.goK=-1;return 1e9;}TRF.lgap=gap;
  if(c.goK===k)return 1e9;
  if(tt<.5&&gap/Math.max(c.v,.1)<=(.5-tt)*30+.4||gap<c.v*c.v/(2*7)){c.goL=L;c.goK=k;return 1e9;}
  return trfIdm(c,v0,Math.max(gap,0),0);}

/* ---------- each frame (60_game's step, before the physics) ---------- */
function trafficFrame(dt){
  if(!trafficWanted()){if(TRF.live)trfClear();ACT.length=0;return;}
  const t0=performance.now();
  if(!HW.loops)hwBuild();
  trfModelsStep();
  const P=GAME.car.p,px=P[0],pz=P[2],far=SKY.night&&SKY.draw?Math.min(SKY.draw,GFX.far):GFX.far,keep=far+80,N=Math.min(trfCount(),TRF_MAX),
    near=Math.abs(pz)<keep&&Math.abs(px)<WG.HWY_X+keep;
  if(near)hwFill(px,1);
  TRF.live=true;TRF.t+=dt;
  TRF_ON.length=0;for(let i=0;i<TRF_MAX;i++){const c=TRF.cars[i];if(!c.on)continue;if(i>=N||!near){if(c.mode!=='kin')trfFree(c);c.on=false;continue;}TRF_ON.push(c);}
  /* what the cars keep clear of on the physics: you, and the cars of theirs on it */
  ACT.length=0;ACT.push(GAME.car);if(POL.live)for(const P of POL.cars)if(P.V)ACT.push(P.V);
  TRF_PHYS.length=0;for(const c of TRF_ON)if(c.mode!=='kin'){TRF_PHYS.push(c);ACT.push(c.veh);}
  for(let i=0;i<TRF_ON.length;i++){const c=TRF_ON[i];if(c.mode==='kin'){trfDrive(c,dt);if(TRF_PHYS.length<TRF_PHYS_MAX&&trfThreat(c))trfEngage(c);}else trfPhysDrive(c,dt);}
  /* one that has fallen out of range goes, and starts again out of sight (two a frame at most) */
  for(const c of TRF_ON){const dx=c.x-px,dz=c.z-pz;c.d2=dx*dx+dz*dz;if(c.d2>keep*keep||c.mode!=='kin'&&c.wreck&&c.d2>far*far){if(c.mode!=='kin')trfFree(c);c.on=false;TRF.recycled++;}}
  if(near){let tries=0;for(let i=0;i<N&&tries<2;i++){const c=TRF.cars[i];if(c.on)continue;tries++;trfSpawn(c,px,pz,far,keep);}}
  TRF_ON.length=0;for(let i=0;i<TRF_MAX;i++){const c=TRF.cars[i];if(!c.on)continue;
    /* (nearest first: an insertion, no sort's scratch) */
    let j=TRF_ON.length;TRF_ON.push(c);while(j>0&&TRF_ON[j-1].d2>c.d2){TRF_ON[j]=TRF_ON[j-1];j--;}TRF_ON[j]=c;}
  TRF.ms=performance.now()-t0;
}
function trfDrive(c,dt){
  let L=c.L;const i=Math.floor(c.s/L.ds)%L.n,v0=L.vA[i]*c.vk;
  c.lcT+=dt;
  const accL=trfLight(c,v0),v0g=c.goK>=0?Math.max(v0,c.v):v0,accA=trfAhead(c,c.lp,v0g),why=TRF.why;
  /* lane changes, on the straights, never with a light holding it: blocked, it looks for a lane with room where it can
     go faster; free, it drifts back right when the right is as good */
  if(c.dir!==0&&accL>1e8&&!trfNearStop(c)&&c.lcT>=c.lcDur&&TRF.t>=c.lcNext){c.lcNext=TRF.t+.5+trfRnd()*.4;
    const want=why>0&&(accA<-.3||c.v<v0*.8);let best=-1,gain=want?.35:1e9;
    for(let q=0;q<2;q++){const k=q?L.k+1:L.k-1;if(k<0||k>2)continue;const right=k>L.k;if(!want&&!right)continue;
      const lp=HW.lanes[k];if(!trfRoom(c,lp,k))continue;
      const a2=trfAhead(c,lp,v0,k),g=a2-accA+(right?.25:0);if(a2<-2.5)continue;if(want?g>gain:a2>accA-.15&&a2>-.1){gain=g;best=k;}}
    if(best>=0){const N=HW.loops[best];c.lat0=c.lp-N.zk;c.s=hwS(N,c.x,c.dir);c.L=L=N;c.lcT=0;c.lcDur=Math.max(2.4,Math.min(4,3.4-c.v*.03));TRF.laneChanges++;}}
  c.accYou=why===2?accA:0;
  const acc=Math.max(-9,Math.min(c.a,Math.min(accA,accL)));c.acc=acc;c.brake=acc<-1.2||c.v<.3;
  c.v=Math.max(0,c.v+acc*dt);c.s+=c.v*dt;if(c.s>=L.len)c.s-=L.len;
  c.wap=c.wa;c.wa=(c.wa+c.v*dt/c.m.wR[0])%TAU;
  trfPose(c);
}
/* within 80 m of a stop line (no changing lanes there) */
function trfNearStop(c){const S=c.L.stopS,fr=c.s+c.m.L/2;for(let k=0;k<S.length;k++){const d=S[k]-fr;if(d>-c.m.L&&d<80)return true;}return false;}
/* room to move into lane k (at lp): nothing alongside, nothing just ahead, nothing just behind that would have to brake
   hard for it (a car already moving into that lane counts as in it), you nowhere near that bit of the lane */
function trfRoom(c,lp,k){const m=c.m;
  for(const o of TRF_ON){if(o===c||o.mode!=='kin'||o.dir!==c.dir||Math.abs(o.lp-lp)>(m.W+o.m.W)/2+.4&&o.L.k!==k)continue;const al=(o.x-c.x)*c.dir,h=(m.L+o.m.L)/2;
    if(al>0){if(al-h<Math.max(6,c.v*.6))return false;}
    else{const gap=-al-h,dv=o.v-c.v;if(gap<Math.max(5,o.v*.5))return false;if(dv>0&&gap<dv*dv/(2*2.5)+o.v*.8)return false;}}
  for(const t of ACT){const dx=t.p[0]-c.x,dz=t.p[2]-c.z,al=dx*c.fx+dz*c.fz,lr=-dx*c.fz+dz*c.fx;if(Math.abs(c.lp+lr-lp)<m.W/2+1.6&&al>-14&&al<Math.max(14,c.v*1.2))return false;}
  return true;}
/* out where it can't be seen: past the draw distance, or out of the camera's view and at least 60 m off; on a straight,
   in a lane with nobody within 45 m of the spot; going the way that brings it towards you (by your own speed along the
   road: ahead of you a car coming the other way, or one going your way slower than you; behind you one going your way
   faster), so it comes into sight rather than off away from you unseen */
function trfSpawn(c,px,pz,far,keep){
  const m=trfPickModel();if(!m)return false;const cam=CAM.last,F=cam&&cam.VPw?frustum(cam.VPw):null;
  for(let a=0;a<4;a++){
    const k=Math.floor(trfRnd()*3),L=HW.loops[k],side=trfRnd()<.5?-1:1,x=px+side*(60+trfRnd()*(keep-70)),vp=GAME.car.v[0],ve=HW.vCountry*.95,
      okE=side*(ve-vp)<0,okW=side*(-ve-vp)<0,dir=okE&&okW?(trfRnd()<.5?1:-1):okE?1:okW?-1:(trfRnd()<.5?1:-1);
    if(Math.abs(x)>L.turnX||!hwReady(x))continue;
    const z=dir>0?L.zk:-L.zk,dd=Math.hypot(x-px,z-pz);if(dd<60||dd>keep)continue;
    let clash=false;for(const o of TRF.cars){if(o.on&&o!==c&&o.dir===dir&&Math.abs(o.x-x)<45&&Math.abs(o.lp-L.zk)<3){clash=true;break;}}if(clash)continue;
    if(dd<far+10&&F){const y=hwY(x).y+1;let inside=true;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-3){inside=false;break;}}if(inside)continue;}
    /* (about one driver in ten has their eyes elsewhere: a stopped car in their lane is seen only 25 to 45 m off) */
    c.look=trfRnd()<.1?25+trfRnd()*20:160;
    c.on=true;c.m=m;c.L=L;c.s=hwS(L,x,dir);c.lat=0;c.lat0=0;c.lcT=9;c.vk=.92+trfRnd()*.16+(2-k)*.025;c.T=1.1+trfRnd()*.6;c.a=1.2+trfRnd()*.9;c.b=2+trfRnd();c.s0=2+trfRnd()*1.2;
    c.v=L.vA[Math.floor(c.s/L.ds)%L.n]*c.vk;c.lcNext=TRF.t+trfRnd();c.prev=false;c.wa=trfRnd()*TAU;c.wap=c.wa;
    /* (no faster than it could stop comfortably for a light that isn't green, or the nearest car ahead) */
    c.goK=-1;trfPose(c);trfLight(c,c.v);c.goK=-1;if(TRF.lgap<1e8)c.v=Math.min(c.v,Math.sqrt(2*2.5*Math.max(0,TRF.lgap-3)));
    for(const o of TRF_ON){if(o.dir!==dir||Math.abs(o.lp-L.zk)>2.5)continue;const al=(o.x-x)*dir;if(al>0)c.v=Math.min(c.v,o.v+Math.sqrt(2*2.5*Math.max(0,al-(m.L+o.m.L)/2-4)));}
    const pc=lin(TRF_PAINT[Math.floor(trfRnd()*TRF_PAINT.length)]);c.paint[0]=pc[0];c.paint[1]=pc[1];c.paint[2]=pc[2];c.dirt=trfRnd()*.12;
    trfPose(c);c.d2=dd*dd;c.born=TRF.t;TRF.spawned++;return true;}
  return false;}

/* ---------- drawing ---------- */
/* each frame once the floating origin is set (60_game's render): every car's matrix relative to it, and last frame's moved
   with it when it stepped */
function trafficPrep(){if(!TRF.live)return;
  for(const c of TRF_ON){const M=c.M;if(c.mode!=='kin')trfPhysPose(c);M[12]=c.ox-RO[0];M[13]=c.oy-RO[1];M[14]=c.oz-RO[2];
    if(c.ro0!==RO[0]||c.ro2!==RO[2]){if(c.prev){c.Mp[12]-=RO[0]-c.ro0;c.Mp[14]-=RO[2]-c.ro2;}c.ro0=RO[0];c.ro2=RO[2];}}}
/* the camera's (origin-relative) frustum against a sphere round the car */
function trfVisible(F,c,r){const x=c.x-RO[0],y=c.y+1-RO[1],z=c.z-RO[2];for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-r)return false;}return true;}
const TRF_WP=new Float32Array(16);
/* into the scene: each car in its paint, with its lamps and last frame's matrix (so TAA sees it move); up close the
   coarse copy (the light one on a phone) with its own wheels turning, otherwise the light copy, whole */
function trafficDraw(U,eye){
  TRF.tris=0;if(!TRF.live||!TRF_ON.length)return 0;
  const u=CUR.u,F=frustum(U.uVP),far=(SKY.night&&SKY.draw?SKY.draw:GFX.far)+20,lamps=SKY.lightsOn?1:0,big=GFX.level!=='mobile',mid=TRF_MID[GFX.level]||60;let tris=0,set=false;
  for(const c of TRF_ON){const dx=c.x-eye[0],dz=c.z-eye[2],d=Math.sqrt(dx*dx+dz*dz);
    c.vis=d<=far&&trfVisible(F,c,c.m.L*.6+1);if(!c.vis){c.prev=false;continue;}
    if(!set){set=true;gl.uniform1f(u.uMudLocal,1);gl.uniform1f(u.uPrevOn,1);gl.uniform1f(u.uLiv,0);gl.uniform3f(u.uGlow,0,0,0);gl.uniform1f(u.uLamps,lamps);}
    const m=c.m;gl.uniform3fv(u.uPaint,c.paint);gl.uniform3fv(u.uPaint2,c.paint);gl.uniform3fv(u.uRim,m.rim);gl.uniform3fv(u.uCal,m.cal);gl.uniform3fv(u.uClad,m.clad);
    gl.uniform1f(u.uBrake,c.brake?1:0);gl.uniform1f(u.uDirt,c.dirt);gl.uniform4fv(u.uLivP,m.livP);gl.uniform1f(u.uMudOff,0);
    gl.uniformMatrix4fv(u.uM,false,c.M);gl.uniformMatrix4fv(u.uPrevM,false,c.prev?c.Mp:c.M);
    if(d<TRF_NEAR||c.mode!=='kin'&&d<TRF_NEAR*2){const TF=big?TRUCKF[m.id]:null;
      if(TF){drawMesh(TF.body);if(TF.hood)drawMesh(TF.hood);tris+=TF.tris;}else{drawMesh(m.T.body);tris+=m.T.trisBody+m.T.trisWheel*4;}
      const V=c.veh;
      for(let k=0;k<4;k++){const h=m.hubs[k];let hx=h[0],hy=h[1],hz=h[2],st=h[4]?c.st:0,an=c.wa,ap=c.wap;
        if(V){const w=V.wheels[k];hx=w.hp[0]+V.cg[0];hy=w.hp[1]-w.len+V.cg[1];hz=w.hp[2];st=w.front?V.steer:0;an=w.ang;ap=w.ang;}
        gl.uniform1f(u.uMudOff,m.wR[h[4]?0:1]);
        if(c.prev){wheelMat(c.Mp,hx,hy,hz,st,h[3],ap);TRF_WP.set(WHM);}
        wheelMat(c.M,hx,hy,hz,st,h[3],an);gl.uniformMatrix4fv(u.uM,false,WHM);gl.uniformMatrix4fv(u.uPrevM,false,c.prev?TRF_WP:WHM);
        drawMesh(TF?(h[4]?TF.wheel:TF.wheelR):(h[4]?m.T.wheel:m.T.wheelR));}}
    else if(d<mid){drawMesh(m.T.all);tris+=m.T.tris;}
    else{drawMesh(m.T.far);tris+=m.T.trisFar;}
    c.Mp.set(c.M);c.prev=true;c.wap=c.wa;}
  if(set){gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);gl.uniform1f(u.uPrevOn,0);gl.uniform1f(u.uDirt,0);gl.uniform1f(u.uLamps,0);gl.uniform1f(u.uBrake,0);}
  TRF.tris=tris;return tris;
}
/* into a sun shadow map: the light copy of each car within the level's shadow reach that the cascade sees (F: the
   cascade's frustum in world space) */
function trafficShadow(F,used,G,VP,eye){
  if(!TRF.live)return used;const r=TRF_SHD[GFX.level]||60;
  for(const c of TRF_ON){const dx=c.x-eye[0],dz=c.z-eye[2];if(dx*dx+dz*dz>r*r)break;
    const x=c.x,y=c.y+1,z=c.z,rr=c.m.L*.6+1;let inside=true;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-rr){inside=false;break;}}if(!inside)continue;
    if(!used){used=true;useLit(P_DEPTH);G.uni(P_DEPTH,'uVP',VP);G.uni(P_DEPTH,'uInst',0);gl.disable(gl.CULL_FACE);}
    gl.uniformMatrix4fv(CUR.u.uM,false,c.M);drawMesh(c.m.T.far);}
  return used;}
/* at night the nearest few headlights as the frame's own lamps */
function trafficLights(L){if(!TRF.live||!SKY.lightsOn)return;let n=TRF_LAMPS[GFX.level]||3;
  for(const c of TRF_ON){if(n<=0||L.dyn.length>=16)break;if(!c.vis)continue;const m=c.m,M=c.M,q=c.lamp;
    q.pos[0]=M[12]+M[0]*m.lampX+M[4]*m.lampY;q.pos[1]=M[13]+M[1]*m.lampX+M[5]*m.lampY;q.pos[2]=M[14]+M[2]*m.lampX+M[6]*m.lampY;
    const dx=M[0]-M[4]*.08,dy=M[1]-M[5]*.08-.04,dz=M[2]-M[6]*.08,l=Math.hypot(dx,dy,dz)||1;q.dir[0]=dx/l;q.dir[1]=dy/l;q.dir[2]=dz/l;
    L.dyn.push(q);n--;}}
/* the soft shade under the nearest cars (the renderer takes eight in all) */
function trafficOcc(occ){if(!TRF.live)return;for(const c of TRF_ON){if(occ.length>=8||c.d2>2500)break;const o=c.occ,m=c.m;
  o[0]=c.x-RO[0];o[1]=c.y+m.rideH-RO[1];o[2]=c.z-RO[2];o[3]=m.cg1;o[4]=c.fx;o[5]=c.fz;o[6]=m.L/2;o[7]=m.b.look.track/2+.12;occ.push(o);}}

/* ---------- near you: the physics ---------- */
const TRF_PHYS=[],TRF_PHYS_MAX=6,TRF_CC=[];
/* two boxes on the ground (centres, unit forward, full length and width) overlapping */
function trfBoxes(ax,az,afx,afz,aL,aW,bx,bz,bfx,bfz,bL,bW){
  for(let q=0;q<4;q++){const ux=q===0?afx:q===1?-afz:q===2?bfx:-bfz,uz=q===0?afz:q===1?afx:q===2?bfz:bfx;
    const ra=Math.abs(afx*ux+afz*uz)*aL/2+Math.abs(-afz*ux+afx*uz)*aW/2,rb=Math.abs(bfx*ux+bfz*uz)*bL/2+Math.abs(-bfz*ux+bfx*uz)*bW/2;
    if(Math.abs((bx-ax)*ux+(bz-az)*uz)>ra+rb)return false;}
  return true;}
/* would this car riding its lane touch something on the physics within 0.6 s (each moving as it is), or does it need to
   brake harder for you than a car can? */
function trfThreat(c){
  if(c.accYou<-8.5)return true;
  for(const t of ACT){const dx=t.p[0]-c.x,dz=t.p[2]-c.z;if(dx*dx+dz*dz>1600)continue;
    const M=t.M,hf=Math.hypot(M[0],M[6])||1,afx=M[0]/hf,afz=M[6]/hf,rvx=t.v[0]-c.fx*c.v,rvz=t.v[2]-c.fz*c.v;
    for(let k=0;k<=4;k++){const tt=k*.15;if(trfBoxes(0,0,c.fx,c.fz,c.m.L+.6,c.m.W+.6,dx+rvx*tt,dz+rvz*tt,afx,afz,t.c.body.L,t.c.body.W))return true;}}
  return false;}
/* onto the physics where it rides: square to the road as it was, at its speed, the wheels rolling, the engine in the gear
   that speed wants (44_ai's toPhysics, for a traffic car) */
function trfEngage(c){
  const m=c.m;let V=m.pool.pop();if(!V){V=makeCar(m.bi,RANCH.world);V.setAssists('real');m.made++;}
  V.world=RANCH.world;const M=c.M,R=V.M,q=V.q,v=c.v;
  R[0]=M[0];R[3]=M[1];R[6]=M[2];R[1]=M[4];R[4]=M[5];R[7]=M[6];R[2]=M[8];R[5]=M[9];R[8]=M[10];
  const tr=R[0]+R[4]+R[8];let S;
  if(tr>0){S=Math.sqrt(tr+1)*2;q[3]=.25*S;q[0]=(R[7]-R[5])/S;q[1]=(R[2]-R[6])/S;q[2]=(R[3]-R[1])/S;}
  else if(R[0]>R[4]&&R[0]>R[8]){S=Math.sqrt(1+R[0]-R[4]-R[8])*2;q[3]=(R[7]-R[5])/S;q[0]=.25*S;q[1]=(R[1]+R[3])/S;q[2]=(R[2]+R[6])/S;}
  else if(R[4]>R[8]){S=Math.sqrt(1+R[4]-R[0]-R[8])*2;q[3]=(R[2]-R[6])/S;q[0]=(R[1]+R[3])/S;q[1]=.25*S;q[2]=(R[5]+R[7])/S;}
  else{S=Math.sqrt(1+R[8]-R[0]-R[4])*2;q[3]=(R[3]-R[1])/S;q[0]=(R[2]+R[6])/S;q[1]=(R[5]+R[7])/S;q[2]=.25*S;}
  qToM(R,q);
  V.p[0]=c.x+R[1]*m.rideH;V.p[1]=c.y+R[4]*m.rideH;V.p[2]=c.z+R[7]*m.rideH;V.v[0]=R[0]*v;V.v[1]=R[3]*v;V.v[2]=R[6]*v;V.w.fill(0);V.rev=false;V.revT=0;
  const pt=V.pt,e=pt.e;pt.rev=false;
  for(let k=0;k<4;k++){const w=V.wheels[k];w.w=v/w.R;w.dig=0;w.FyB=0;w.vt=0;w.comp=m.comp0[k];w.len=V.c.susp.rest-w.comp;}
  const Rw=pt.o.R||V.wheels[2].R;let g=1,ratio;
  if(e.cvt){ratio=e.cvt.lo*e.fd;pt.cvtR=0;}else{for(;g<e.nG;g++){const rpm=v/Rw*e.gears[g-1]*e.fd*60/TAU;if(rpm<pt.upRpm[g-1]*.95)break;}ratio=e.gears[g-1]*e.fd;}
  pt.st='run';pt.gear=g;pt.shiftT=0;pt.engage=1;pt.locked=v>3;pt.we=Math.max(e.idle*TAU/60,Math.min(e.limiterRpm*TAU/60,v/Rw*ratio));
  V.ev.car=0;V.ev.wall=0;
  c.veh=V;c.mode='phys';c.physT=0;c.safeT=0;c.stopT=0;c.wreck=false;c.dir=0;TRF.engaged=(TRF.engaged||0)+1;
}
/* off the physics: its car back to its kind's pool */
function trfFree(c){if(c.veh){c.m.pool.push(c.veh);c.veh=null;}c.mode='kin';}
/* where a car on the physics is, for the drawing, the lamps and the others: its matrix from the physics' */
function trfPhysPose(c){const V=c.veh,R=V.M,M=c.M,m=c.m;
  M[0]=R[0];M[1]=R[3];M[2]=R[6];M[3]=0;M[4]=R[1];M[5]=R[4];M[6]=R[7];M[7]=0;M[8]=R[2];M[9]=R[5];M[10]=R[8];M[11]=0;M[15]=1;
  c.ox=V.p[0]-R[0]*m.cg0-R[1]*m.cg1;c.oy=V.p[1]-R[3]*m.cg0-R[4]*m.cg1;c.oz=V.p[2]-R[6]*m.cg0-R[7]*m.cg1;
  const hf=Math.hypot(R[0],R[6])||1;c.x=V.p[0];c.z=V.p[2];c.y=V.p[1]-m.rideH;c.fx=R[0]/hf;c.fz=R[6]/hf;c.v=Math.max(0,V.vf);}
/* its driver on the physics: the same following (the lane ahead, you and the rest on the physics) through the pedals,
   steering for the middle of its lane; hit (or hitting), it stops and honks; clear of everything, upright and back by
   its lane for a second, it rides the lane again */
function trfPhysDrive(c,dt){
  const V=c.veh,L=c.L,m=c.m;trfPhysPose(c);c.physT+=dt;c.honkT-=dt;
  /* where it is along its lane: the nearest point within 80 m of where it was */
  const n=L.n,i0=Math.round(c.s/L.ds);let bi=i0,bd=1e18;
  for(let k=-40;k<=40;k++){const i=((i0+k)%n+n)%n,dx=L.x[i]-c.x,dz=L.z[i]-c.z,d=dx*dx+dz*dz;if(d<bd){bd=d;bi=i;}}
  c.s=bi*L.ds;const tx=L.tx[bi],tz=L.tz[bi],lo=-(c.x-L.x[bi])*tz+(c.z-L.z[bi])*tx,he=Math.atan2(c.fx*tz-c.fz*tx,c.fx*tx+c.fz*tz),up=V.M[4];
  /* a knock: stop, honk */
  if(V.ev.car>0){V.ev.car=0;c.hits++;c.stopT=2.5;if(c.honkT<=0){trfHonk(c);c.honkT=3;
    /* (a driver you've just hit has something to say) */
    const t=GAME.car;if(Math.hypot(t.p[0]-c.x,t.p[2]-c.z)<9)voxSay(TRF_YELL[Math.floor(trfRnd()*TRF_YELL.length)],'yell',c.x,c.z,4);}}
  if(up<.5||Math.abs(lo)>9)c.wreck=true;
  const inp=c.inp,spd=V.speed;
  if(c.wreck){inp.steer=0;inp.thr=0;inp.brk=1;inp.hb=1;
    /* still, and nothing near: not stepped (stepped again the moment anything comes close) */
    let near=false;for(const t of ACT){if(t===V)continue;const dx=t.p[0]-c.x,dz=t.p[2]-c.z;if(dx*dx+dz*dz<196){near=true;break;}}
    c.mode=spd<.3&&!near?'park':'phys';c.brake=true;return;}
  c.stopT-=dt;
  /* the pedals from the following it would do on its lane */
  c.lp=L.zk+lo;const i=bi,v0=L.vA[i]*c.vk;let acc=trfAhead(c,c.lp,v0,L.k);const al=trfLight(c,v0);if(al<acc)acc=al;
  if(c.stopT>0)acc=Math.min(acc,-6);
  inp.thr=acc>0?Math.min(.8,.15+acc*.35):0;inp.brk=acc<0?Math.min(1,-acc/8):0;inp.hb=c.stopT>0&&spd<.5?1:0;inp.nos=false;
  /* (a car at a standstill with the brake held would be in reverse after half a second: it waits on the handbrake) */
  if(spd<.6&&acc<=0){inp.brk=0;inp.hb=1;}
  /* steering: at a point down the middle of its lane */
  const La=Math.max(6,Math.min(30,5+spd*.6)),j=(bi+Math.round(La/L.ds))%n,dx=L.x[j]-V.p[0],dz=L.z[j]-V.p[2],L2=dx*dx+dz*dz,side=dx*V.M[2]+dz*V.M[8],
    kk=2*side/Math.max(L2,1),ang=Math.atan(V.c.wb*kk),lim=Math.min(V.c.lock,V.tyre.aPk*1.6+V.c.wb*9/Math.max(spd*spd,1));inp.steer=Math.max(-1,Math.min(1,ang/lim));
  c.brake=inp.brk>.1;c.st=V.steer;
  /* back to riding its lane: nothing about to touch it, upright, within a metre of its lane's middle and pointing along it */
  let clear=true;for(const t of ACT){if(t===V)continue;const dx2=t.p[0]-c.x,dz2=t.p[2]-c.z;if(dx2*dx2+dz2*dz2<144){clear=false;break;}}
  if(clear&&c.stopT<=0&&up>.9&&Math.abs(lo)<1.2&&Math.abs(he)<.15&&!trfThreatPhys(c))c.safeT+=dt;else c.safeT=0;
  if(c.safeT>1){const v=Math.max(0,V.vf);trfFree(c);c.v=v;c.lat0=lo;c.lcT=0;c.lcDur=2;c.goK=-1;trfPose(c);TRF.released=(TRF.released||0)+1;}
}
/* (the threat check for a car already on the physics, by its own velocity) */
function trfThreatPhys(c){const V=c.veh;
  for(const t of ACT){if(t===V)continue;const dx=t.p[0]-c.x,dz=t.p[2]-c.z;if(dx*dx+dz*dz>1600)continue;
    const M=t.M,hf=Math.hypot(M[0],M[6])||1,afx=M[0]/hf,afz=M[6]/hf,rvx=t.v[0]-V.v[0],rvz=t.v[2]-V.v[2];
    for(let k=0;k<=6;k++){const tt=k*.15;if(trfBoxes(0,0,c.fx,c.fz,c.m.L+.6,c.m.W+.6,dx+rvx*tt,dz+rvz*tt,afx,afz,t.c.body.L,t.c.body.W))return true;}}
  return false;}
/* each physics step (60_game's step, with yours): the cars of the traffic on the physics and the police, then everyone
   touching everyone */
function trafficSub(dt){
  if(!TRF_PHYS.length&&!POL.live)return;TRF_CC.length=0;TRF_CC.push(GAME.car);policeSub(dt,TRF_CC);
  /* (a car let off the physics earlier this frame is on the list until the next: skipped) */
  for(const c of TRF_PHYS){if(c.mode!=='phys'||!c.veh)continue;c.veh.step(dt,c.inp);TRF_CC.push(c.veh);}
  for(const c of TRF_PHYS)if(c.mode==='park'&&c.veh)TRF_CC.push(c.veh);
  if(TRF_CC.length>1)carContacts(TRF_CC);
}
const TRF_YELL=['traffic_hey','traffic_watch_it','traffic_seriously','traffic_learn_to_drive'];
/* ---------- the horn: a car's two notes, where it is ---------- */
let TRF_HORN=null;
function trfHonk(c){const A=ENG.audio,cam=CAM.last;if(!A||!cam)return;const ctx=A.ctx,now=ctx.currentTime;
  if(!TRF_HORN){const o1=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
    o1.type='square';o2.type='square';o1.frequency.value=415;o2.frequency.value=523;f.type='lowpass';f.frequency.value=2400;f.Q.value=.8;g.gain.value=0;
    o1.connect(f);o2.connect(f);f.connect(g);if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);o1.start();o2.start();TRF_HORN={g,p};}
  const H=TRF_HORN,dx=c.x-cam.eye[0],dz=c.z-cam.eye[2],d=Math.hypot(dx,dz),vol=.16/(1+Math.pow(d/14,1.4));
  if(H.p){const rx=-cam.fwd[2],rz=cam.fwd[0];H.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*rx+dz*rz)/(d||1)*.8)),now,.02);}
  const G=H.g.gain;G.cancelScheduledValues(now);G.setTargetAtTime(vol,now,.008);G.setTargetAtTime(0,now+.32,.02);G.setTargetAtTime(vol,now+.45,.008);G.setTargetAtTime(0,now+1.05,.04);
}
