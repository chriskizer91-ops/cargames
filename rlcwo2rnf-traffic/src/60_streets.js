/* =====================================================================================
   LIFE ON THE STREETS: traffic on the town's streets and the county's roads (rlcwo2rnf+traffic).
   The highway's cars (60_traffic) ride Highway 40's lanes as loops; these ride loops of their own, made the same way
   (a point every 2 m: where, which way, how sharp, how fast), so everything a highway car does (keeping its distance,
   the lights, going onto the physics near you, the drawing) works on them as it is:
   - in town, rectangles round the blocks (one block, two by two, and strips right across), driven clockwise in the
     right-hand lane: right turns only, so nobody turns across oncoming traffic; and the boulevard both ways round;
   - out in the country, each section line out and back on the right of the road: round on the open salt at the far
     end (out wide, round, back in), and Ridge and Wash Roads round in the boulevard's junction where Central Avenue
     meets it.
   A car comes to the line at every junction: where there are signals, on the town's 30 s cycle (the one the heads
   show); where there are none, a stop sign. Then it takes the junction, one car in a junction box at a time, when the
   box is clear of the other cars, you and the police, and nothing on the physics is about to arrive; where a country
   road crosses Highway 40, only when no highway car will reach the crossing within 8 s. A highway car finds a street
   car on its crossing (or one caught in a town junction by the change of the lights) and waits for it.
   How many: as thick on the ground as a share of the highway's (Dev: Streets and country roads, a quarter by
   default): the kilometres of lane round you, times the highway's cars a kilometre of lane, times the share.
   Each loop's heights come from the world's generator a 32 m stretch at a time, the first time a car needs them.
   ===================================================================================== */
/* the town's roads by kind: half width, the right-hand lane's middle out from the road's middle, its speed (13_lit's
   lane paint: a street's one lane each way, the outer of an avenue's, Central's and the boulevard's two) */
const ST_TK={ring:{hw:14,o:5.95,v:15.6},hwy:{hw:12.6,o:9.3,v:15.6},main:{hw:8,o:5.7,v:13.4},ave:{hw:7,o:5.1,v:13.4},street:{hw:5.5,o:1.8,v:11.2}};
/* the country's by class (1 dirt, 2 gravel, 3 blacktop): the lane's middle out from the road's, its speed */
const ST_CK={1:{o:1.15,v:11.2},2:{o:1.7,v:15.6},3:{o:1.85,v:22.4}};
const ST={loops:[],J:[],jAt:new Map(),todo:[],cur:null,curT:0,slice:0,ready:false,pts:null,cand:[],want:0,t:-9,lk:0};
/* Dev: Streets and country roads, as thick as this share of the highway's traffic */
const ST_SHARE={off:0,'8':.125,'4':.25,'2':.5,'1':1};
const stShare=()=>{const v=ST_SHARE[DEVW.stS];return v===undefined?.25:v;};
const stKX=x=>{const a=Math.abs(x);return a===WG.RING?'ring':a===0?'main':a===240?'ave':'street';};
const stKZ=z=>{const a=Math.abs(z);return a===WG.RING?'ring':a===0?'hwy':a===240?'ave':'street';};

/* ---------- a path: points about a metre apart, each with the road's speed there ---------- */
function stP(){return {x:[],z:[],v:[]};}
function stPt(P,x,z,v){const n=P.x.length;if(n){const dx=x-P.x[n-1],dz=z-P.z[n-1];if(dx*dx+dz*dz<.25)return;}P.x.push(x);P.z.push(z);P.v.push(v);}
function stTo(P,x1,z1,v){const n=P.x.length;if(!n){stPt(P,x1,z1,v);return;}const x0=P.x[n-1],z0=P.z[n-1],k=Math.ceil(hyp2(x1-x0,z1-z0));for(let s=1;s<=k;s++){const t=s/k;stPt(P,x0+(x1-x0)*t,z0+(z1-z0)*t,v);}}
/* an arc round (cx, cz), from angle a0 to a1, reached by a straight at the speed vIn */
function stArc(P,cx,cz,r,a0,a1,vIn,v){stTo(P,cx+r*Math.cos(a0),cz+r*Math.sin(a0),vIn);const k=Math.max(3,Math.ceil(Math.abs(a1-a0)*r));
  for(let s=1;s<=k;s++){const a=a0+(a1-a0)*s/k;stPt(P,cx+r*Math.cos(a),cz+r*Math.sin(a),v);}}

/* ---------- a closed path as a loop of points every 2 m: as 60_traffic's hwBuild makes the highway's ---------- */
function stLoop(P,name){
  const nd=P.x.length,cum=new Float64Array(nd+1);
  for(let i=1;i<=nd;i++){const a=i-1,b=i%nd;cum[i]=cum[i-1]+hyp2(P.x[b]-P.x[a],P.z[b]-P.z[a]);}
  const len=cum[nd],n=Math.round(len/2),ds=len/n,x=new Float64Array(n),z=new Float64Array(n),v0=new Float32Array(n);
  for(let i=0,j=0;i<n;i++){const s=i*ds;while(j<nd-1&&cum[j+1]<s)j++;const f=(s-cum[j])/((cum[j+1]-cum[j])||1),b=(j+1)%nd;
    x[i]=P.x[j]+(P.x[b]-P.x[j])*f;z[i]=P.z[j]+(P.z[b]-P.z[j])*f;v0[i]=P.v[j];}
  const tx=new Float32Array(n),tz=new Float32Array(n),kap=new Float32Array(n),vA=new Float32Array(n);
  for(let i=0;i<n;i++){const a=(i-1+n)%n,b=(i+1)%n,dx=x[b]-x[a],dz=z[b]-z[a],l=hyp2(dx,dz)||1;tx[i]=dx/l;tz[i]=dz/l;}
  for(let i=0;i<n;i++){const a=(i-2+n)%n,b=(i+2)%n,c=tx[a]*tz[b]-tz[a]*tx[b],e=tx[a]*tx[b]+tz[a]*tz[b];kap[i]=Math.atan2(c,e)/(4*ds);}
  /* the road's speed, slow enough round a bend, then braked back from every slower bit */
  for(let i=0;i<n;i++){const ak=Math.abs(kap[i]);vA[i]=ak>1e-4?Math.min(v0[i],Math.sqrt(2.4/ak)):v0[i];}
  for(let r=0;r<2;r++)for(let i=n-1;i>=0;i--){const j=(i+1)%n;vA[i]=Math.min(vA[i],Math.sqrt(vA[j]*vA[j]+2*1.1*ds));}
  let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(let i=0;i<n;i++){if(x[i]<x0)x0=x[i];if(x[i]>x1)x1=x[i];if(z[i]<z0)z0=z[i];if(z[i]>z1)z1=z[i];}
  const L={k:-1,zk:0,street:true,name,n,ds,len,x,z,tx,tz,kap,vA,y:new Float32Array(n),yOK:new Uint8Array(Math.ceil(n/16)),inJ:new Uint8Array(n),bb:[x0,z0,x1,z1],
    stopS:null,stopPh:null,stopJ:null,stopKind:null,stopX:null};
  stStops(L);return L;
}
/* its stop lines: where it comes into each junction's box (a metre short of it, as the car's front), where it leaves
   it, the signal's phase for the way it comes in (an east-west road runs half a cycle from a north-south one) */
function stStops(L){
  const st=[],n=L.n,bb=L.bb;
  for(const J of ST.J){
    if(J.x+J.hx+4<bb[0]||J.x-J.hx-4>bb[2]||J.z+J.hz+4<bb[1]||J.z-J.hz-4>bb[3])continue;
    const ex=J.hx+1.5,ez=J.hz+1.5,inside=i=>Math.abs(L.x[i]-J.x)<ex&&Math.abs(L.z[i]-J.z)<ez;
    let i0=-1;for(let i=0;i<n;i++)if(!inside(i)){i0=i;break;}if(i0<0)continue;
    for(let q=1;q<=n;q++){const i=(i0+q)%n,p=(i0+q-1)%n;if(!inside(i)||inside(p))continue;
      let e=i,g=0;while(inside(e)&&g<n){L.inJ[e]=1;e=(e+1)%n;g++;}
      const ew=Math.abs(L.tx[i])>Math.abs(L.tz[i]),sIn=((i*L.ds-1)%L.len+L.len)%L.len;
      st.push([sIn,J.sig?(ew?J.ph:J.ph+.5):0,J,J.sig?0:1,e*L.ds]);}}
  st.sort((a,b)=>a[0]-b[0]);
  L.stopS=Float64Array.from(st.map(a=>a[0]));L.stopPh=Float32Array.from(st.map(a=>a[1]));L.stopJ=st.map(a=>a[2]);L.stopKind=Uint8Array.from(st.map(a=>a[3]));L.stopX=Float64Array.from(st.map(a=>a[4]));
}
/* a loop's road height at its point i (filled a 32 m stretch at a time, the first time it is wanted) */
const STY={o:{}};
function stFill(L,b){const i0=b*16,i1=Math.min(L.n,i0+16);for(let i=i0;i<i1;i++){WG.sample(L.x[i],L.z[i],STY.o);L.y[i]=STY.o.h;}L.yOK[b]=1;}
function stY(L,i){const b=i>>4;if(!L.yOK[b])stFill(L,b);return L.y[i];}

/* ---------- the town: a block's rectangle, clockwise ----------
   Each corner a right turn on an arc that stays on the road: its radius the exit road's room right of its lane plus the
   approach road's (so the kerb's corner is inside the arc, a car's half width and more from it) */
function stRect(xa,xb,za,zb){
  const kT=ST_TK[stKZ(za)],kB=ST_TK[stKZ(zb)],kL=ST_TK[stKX(xa)],kR=ST_TK[stKX(xb)],oT=kT.o,oB=kB.o,oL=kL.o,oR=kR.o;
  const mT=kT.hw-oT,mB=kB.hw-oB,mL=kL.hw-oL,mR=kR.hw-oR,P=stP();
  /* east along the top, south down the right, west along the bottom, north up the left */
  {const r=mR+mT;stArc(P,xb-oR-r,za+oT+r,r,-PI/2,0,kT.v,kR.v);}
  {const r=mB+mR;stArc(P,xb-oR-r,zb-oB-r,r,0,PI/2,kR.v,kB.v);}
  {const r=mL+mB;stArc(P,xa+oL+r,zb-oB-r,r,PI/2,PI,kB.v,kL.v);}
  {const r=mT+mL;stArc(P,xa+oL+r,za+oT+r,r,PI,1.5*PI,kL.v,kT.v);}
  /* (the top's straight back to the first corner: the loop closes on it; its points at the top's speed) */
  P.v[P.v.length-1]=kT.v;
  const L=stLoop(P,'block '+xa+','+za+' to '+xb+','+zb);L.town=true;return L;
}
/* the boulevard round town, clockwise (right lane inside, corners tighter) or the other way */
function stRing(cw){
  const k=ST_TK.ring,o=k.o,v=k.v,S=WG.RING-120,P=stP();
  if(cw){const r=120-o;stArc(P,S,-S,r,-PI/2,0,v,v);stArc(P,S,S,r,0,PI/2,v,v);stArc(P,-S,S,r,PI/2,PI,v,v);stArc(P,-S,-S,r,PI,1.5*PI,v,v);}
  else{const r=120+o;stArc(P,-S,-S,r,1.5*PI,PI,v,v);stArc(P,-S,S,r,PI,PI/2,v,v);stArc(P,S,S,r,PI/2,0,v,v);stArc(P,S,-S,r,0,-PI/2,v,v);}
  const L=stLoop(P,cw?'boulevard, clockwise':'boulevard, anticlockwise');L.town=true;return L;
}
function stTownSpecs(){
  const G=[...new Set(WG.TW.jn.map(n=>n.x))].sort((a,b)=>a-b),R=WG.RING,zs=G.filter(z=>z!==0),has=(x,z)=>ST.jAt.has(x+','+z),out=[];
  const ok=(xa,xb,za,zb)=>has(xa,za)&&has(xb,za)&&has(xa,zb)&&has(xb,zb);
  const add=(xa,xb,za,zb)=>{if(ok(xa,xb,za,zb))out.push(()=>stRect(xa,xb,za,zb));};
  for(let i=0;i+1<G.length;i++)for(let j=0;j+1<zs.length;j++)add(G[i],G[i+1],zs[j],zs[j+1]);
  for(let i=0;i+2<G.length;i++)for(let j=0;j+2<zs.length;j++)add(G[i],G[i+2],zs[j],zs[j+2]);
  for(let j=0;j+1<zs.length;j++)if(Math.abs(zs[j])<R&&Math.abs(zs[j+1])<R)add(-R,R,zs[j],zs[j+1]);
  const xin=G.filter(x=>Math.abs(x)<R);for(let i=0;i+1<xin.length;i++)add(xin[i],xin[i+1],-R,R);
  out.push(()=>stRing(true),()=>stRing(false));
  return out;
}

/* ---------- the country: a section line out and back ----------
   ns: a north-south line (u is z) or east-west (u is x); line i; from u0 (the near end) to u1 (the far end, on the
   salt). Out on the right of the road, round on the salt (out wide, a circle of 7 m, back in), back on the other
   side; at the near end round on the salt the same, or (town) round in the boulevard's junction on Central's lanes */
function* stLine(ns,i,u0,u1,town){
  const L1=WG.L,cen=ns?u=>i*L1+WG.offNS(i,u):u=>i*L1+WG.offEW(i,u),cls=u=>ns?WG.clsNSz(i,u):WG.clsEWx(i,u);
  const sg=u1>u0?1:-1,span=Math.abs(u1-u0),N=Math.ceil(span/2),U=new Float64Array(N+3),W=new Float64Array(N+3),O=new Float32Array(N+1),V=new Float32Array(N+1);
  /* the road's middle every 2 m, and a step past each end for the way it runs there: one call into the generator a
     point, a few hundred a frame (made over several frames, so a 12 km line never holds one up) */
  for(let q=-1;q<=N+1;q++){const u=q<0?u0-sg*2:q>N?u1+sg*2:u0+sg*Math.min(span,q*2);U[q+1]=u;W[q+1]=cen(u);if(q%300===299)yield;}
  /* the lane's offset and the speed by the road's class (looked up every 20 m: a class runs a mile) */
  let k=ST_CK[1];
  for(let q=0;q<=N;q++){if(q%10===0)k=ST_CK[cls(U[q+1])]||ST_CK[1];let o=k.o,v=k.v;
    if(town){const w=sstep(WG.EDGE+40,WG.EDGE,Math.abs(U[q+1]));o+=(ST_TK.main.o-o)*w;v+=(ST_TK.main.v-v)*w;}O[q]=o;V[q]=v;}
  yield;
  const cx=q=>ns?W[q+1]:U[q+1],cz=q=>ns?U[q+1]:W[q+1],tan=q=>{const dx=cx(q+1)-cx(q-1),dz=cz(q+1)-cz(q-1),l=hyp2(dx,dz)||1;return [dx/l,dz/l];},P=stP();
  /* out: the right of the road */
  for(let q=0;q<=N;q++){const t=tan(q),o=O[q];stPt(P,cx(q)-t[1]*o,cz(q)+t[0]*o,V[q]);}
  stEnd(P,[cx(N),cz(N)],tan(N),O[N],7,V[N]);
  /* back: the other side */
  for(let q=N;q>=0;q--){const t=tan(q),o=O[q];stPt(P,cx(q)+t[1]*o,cz(q)-t[0]*o,V[q]);}
  const t0=tan(0),tb=[-t0[0],-t0[1]];
  if(town)stTurn(P,[cx(0),cz(0)],tb,O[0],V[0]);else stEnd(P,[cx(0),cz(0)],tb,O[0],7,V[0]);
  yield;
  return stLoop(P,ns?(i===0?(u1<0?'Ridge Road':'Wash Road'):i<0?'West Line Road':'East Line Road'):(i<0?'North Line Road':'South Line Road'));
}
/* round at a road's end on the salt: on past the end, out wide to the right, a circle of radius R, back in on the
   other side (E the road's end, T outward, o the lane's offset) */
function stEnd(P,E,T,o,R,v){const rx=-T[1],rz=T[0],at=(d,w)=>stPt(P,E[0]+T[0]*d+rx*w,E[1]+T[1]*d+rz*w,v),sm=t=>t*t*(3-2*t);
  for(let d=1;d<=10;d++)at(d,o);for(let d=11;d<=22;d++)at(d,o+(R-o)*sm((d-10)/12));
  const k=Math.ceil(PI*R);for(let s=1;s<k;s++){const th=PI*s/k;at(22+R*Math.sin(th),R*Math.cos(th));}
  for(let d=22;d>=11;d--)at(d,-(o+(R-o)*sm((d-10)/12)));for(let d=10;d>=1;d--)at(d,-o);}
/* round in a junction: a half circle of the lane's offset, from one side to the other */
function stTurn(P,E,T,o,v){const rx=-T[1],rz=T[0],k=Math.ceil(PI*o);for(let s=1;s<k;s++){const th=PI*s/k;stPt(P,E[0]+T[0]*o*Math.sin(th)+rx*o*Math.cos(th),E[1]+T[1]*o*Math.sin(th)+rz*o*Math.cos(th),v);}}
/* where a section line's road runs: from u outwards (sg) while it has a class, in 10 m steps */
function stRun(ns,i,u,sg){const cls=w=>ns?WG.clsNSz(i,w):WG.clsEWx(i,w);while(Math.abs(u)<WG.LAND+2000&&cls(u+sg*10))u+=sg*10;return u;}
/* the country, a slice at a time (finding where each road runs is a few thousand calls into the generator): each
   line's run, its points for the lane count (stWant), then its loop queued */
function* stCountry(){
  const E=WG.EDGE,R=WG.RING,L1=WG.L,pts=Array.from(ST.pts||[]);
  const line=(ns,i,u0,u1)=>{const n=Math.max(1,Math.round(Math.abs(u1-u0)/25));for(let q=0;q<n;q++){const u=u0+(u1-u0)*(q+.5)/n;if(ns)pts.push(i*L1+WG.offNS(i,u),u);else pts.push(u,i*L1+WG.offEW(i,u));}};
  /* Ridge Road north and Wash Road south: from the boulevard's junction on Central out to the salt */
  for(const sg of [-1,1]){const u1=stRun(true,0,sg*(E+30),sg);yield;if(Math.abs(u1)>E+200){line(true,0,sg*(E+30),u1);ST.todo.push(()=>stLine(true,0,sg*(R+4),u1,true));}yield;}
  /* the other section lines, salt to salt */
  for(const i of [-1,1])for(const ns of [true,false]){const a=stRun(ns,i,0,-1);yield;const b=stRun(ns,i,0,1);yield;
    if(b-a>400){line(ns,i,a,b);ST.todo.push(()=>stLine(ns,i,a,b,false));}yield;}
  ST.pts=Float32Array.from(pts);
  return null;
}

/* ---------- the junctions: the town's (its nodes) and the country's crossings ---------- */
function stJunctions(){
  if(ST.J.length)return;
  for(const n of WG.TW.jn){n.kind='town';n.claim=null;n.claimT=0;ST.J.push(n);ST.jAt.set(n.x+','+n.z,n);}
  const L1=WG.L;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if(i===0&&j===0)continue;
    let x=i*L1,z=j*L1;for(let r=0;r<8;r++){x=i*L1+WG.offNS(i,z);z=j*L1+WG.offEW(j,x);}
    const cn=WG.clsNSz(i,z),ce=WG.clsEWx(j,x);if(!cn||!ce)continue;
    ST.J.push({x,z,hx:WG.CL[cn].hw+.6,hz:WG.CL[ce].hw+.6,sig:false,ph:0,kind:j===0?'hwy':'country',claim:null,claimT:0});}
  ST.todo=stTownSpecs();ST.todo.push(stCountry);
  /* the kilometres of lane round you, counted from a point every 25 m down the middle of each road (two lanes each):
     the town's streets (not the highway's stretch) and the boulevard's corners here, the country's section lines as
     their runs are found (stCountry) */
  const pts=[];
  for(const r of WG.TW.roads){if(r.kind==='hwy')continue;const n=Math.max(1,Math.round((r.b-r.a)/25));for(let q=0;q<n;q++){const u=r.a+(r.b-r.a)*(q+.5)/n;if(r.ax==='z')pts.push(r.line,u);else pts.push(u,r.line);}}
  for(const a of WG.TW.arcs){for(let q=0;q<8;q++){const t=a.a0+(a.a1-a.a0)*(q+.5)/8;pts.push(a.cx+a.r*Math.cos(t),a.cz+a.r*Math.sin(t));}}
  ST.pts=Float32Array.from(pts);
}
/* a few loops a frame (3 ms at most) until they are all made; a long one (a country line, a generator) a slice at a
   time */
function stBuildStep(){if(ST.ready||!ST.J.length)return;const t0=performance.now();
  while(performance.now()-t0<3){
    if(!ST.cur){if(!ST.todo.length){ST.ready=true;return;}ST.cur=ST.todo.shift();ST.curT=0;}
    const t1=performance.now();let L=null;
    if(typeof ST.cur==='function'){const r=ST.cur();if(r&&typeof r.next==='function')ST.cur=r;else{L=r;ST.cur=null;}}
    else{const it=ST.cur.next();if(it.done){L=it.value;ST.cur=null;}}
    const d=performance.now()-t1;ST.curT+=d;ST.slice=Math.max(ST.slice||0,d);
    if(L){L.ms=ST.curT;ST.loops.push(L);}}}
/* twice a second: how many street cars round you (the lanes' kilometres within reach, times the highway's cars a
   kilometre of lane, times the share), and the loops near enough to start one on */
function stWant(px,pz,keep,N){
  if(TRF.t-ST.t<.5)return;ST.t=TRF.t;const sh=stShare();ST.cand.length=0;
  if(!sh||!ST.pts){ST.want=0;return;}
  const P=ST.pts,k2=keep*keep;let n=0;for(let q=0;q<P.length;q+=2){const dx=P[q]-px,dz=P[q+1]-pz;if(dx*dx+dz*dz<k2)n++;}
  ST.lk=n*25*2/1000;
  const dh=N/(2*keep/1000*6);ST.want=Math.min(TRF_SMAX,Math.round(sh*dh*ST.lk));
  for(const L of ST.loops){const b=L.bb;if(px<b[0]-keep||px>b[2]+keep||pz<b[1]-keep||pz>b[3]+keep)continue;ST.cand.push(L);}
}
/* one junction at a time: a street car takes it (and gives it up once its back is out of the box) */
function jFree(J,c){
  if(J.claim&&J.claim!==c){const o=J.claim;if(o.on&&o.claimJ===J&&TRF.t-J.claimT<25)return false;J.claim=null;}
  const ex=J.hx+1.2,ez=J.hz+1.2;
  for(let q=0;q<TRF_ON.length;q++){const o=TRF_ON[q];if(o===c)continue;const r=o.m.L/2;if(Math.abs(o.x-J.x)<ex+r&&Math.abs(o.z-J.z)<ez+r)return false;}
  for(let q=0;q<ACT.length;q++){const t=ACT[q],dx=t.p[0]-J.x,dz=t.p[2]-J.z;if(Math.abs(dx)<ex+3&&Math.abs(dz)<ez+3)return false;
    /* (you, the police or a car on the physics coming at it within 4 s) */
    const d=hyp2(dx,dz);if(d<90){const cl=-(t.v[0]*dx+t.v[2]*dz)/Math.max(d,1);if(cl>2&&d/cl<4)return false;}}
  return true;}
/* where a country road crosses Highway 40: no highway car within 8 s of the crossing (or on it) */
function jHwy(J){for(let q=0;q<TRF_ON.length;q++){const o=TRF_ON[q];if(o.L.street||o.mode!=='kin'||!o.dir)continue;const d=(J.x-o.x)*o.dir;if(d<-(J.hx+4)||d>260)continue;if(d/Math.max(o.v,1)<8)return false;}return true;}
function jClaim(J,c,L,ki,front){J.claim=c;J.claimT=TRF.t;c.claimJ=J;c.claimLeft=((L.stopX[ki]-front)%L.len+L.len)%L.len+c.m.L+.5;}
function jRelease(c){const J=c.claimJ;if(!J)return;if(J.claim===c)J.claim=null;c.claimJ=null;}

/* ---------- a street car starting out ----------
   As the highway's (trfSpawn): out where it can't be seen (past the draw distance, or out of the camera's view and at
   least 55 m off), on a straight and not in a junction, nobody within 30 m of the spot, no faster than it could stop
   for the next line or the car ahead */
function trfSpawnStreet(c,px,pz,far,keep){
  const m=trfPickModel();if(!m||!ST.cand.length)return false;const cam=CAM.last,F=cam&&cam.VPw?frustum(cam.VPw):null;
  for(let a=0;a<6;a++){
    const L=ST.cand[Math.floor(trfRnd()*ST.cand.length)],i=Math.floor(trfRnd()*L.n),x=L.x[i],z=L.z[i],dd=hyp2(x-px,z-pz);
    if(dd<55||dd>keep||L.inJ[i]||Math.abs(L.kap[i])>.012)continue;
    let clash=false;for(let q=0;q<TRF.cars.length;q++){const o=TRF.cars[q];if(o.on&&o!==c&&(o.x-x)*(o.x-x)+(o.z-z)*(o.z-z)<900){clash=true;break;}}
    for(let q=0;q<ACT.length&&!clash;q++){const t=ACT[q];if((t.p[0]-x)*(t.p[0]-x)+(t.p[2]-z)*(t.p[2]-z)<1600)clash=true;}if(clash)continue;
    const y=stY(L,i)+1;
    if(dd<far+10&&F){let inside=true;for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-3){inside=false;break;}}if(inside)continue;}
    c.look=trfRnd()<.1?25+trfRnd()*20:160;
    c.on=true;c.m=m;patMaybe(c);c.L=L;c.s=i*L.ds;c.lat=0;c.lat0=0;c.lcT=9;c.vk=.9+trfRnd()*.18;c.T=1.1+trfRnd()*.6;c.a=1.2+trfRnd()*.9;c.b=2+trfRnd();c.s0=2+trfRnd()*1.2;
    c.v=L.vA[i]*c.vk;c.lcNext=TRF.t+trfRnd();c.prev=false;c.wa=trfRnd()*TAU;c.wap=c.wa;c.claimJ=null;c.stopK=-1;c.stopL=null;
    c.goK=-1;trfPose(c);trfLight(c,c.v);c.goK=-1;if(TRF.lgap<1e8)c.v=Math.min(c.v,Math.sqrt(2*2.5*Math.max(0,TRF.lgap-3)));
    for(let q=0;q<TRF_ON.length;q++){const o=TRF_ON[q];const dx=o.x-x,dz=o.z-z,al=dx*c.fx+dz*c.fz;if(al<=0||al>150||Math.abs(-dx*c.fz+dz*c.fx)>2.5||o.fx*c.fx+o.fz*c.fz<.5)continue;
      c.v=Math.min(c.v,o.v+Math.sqrt(2*2.5*Math.max(0,al-(m.L+o.m.L)/2-4)));}
    const pc=lin(TRF_PAINT[Math.floor(trfRnd()*TRF_PAINT.length)]);c.paint[0]=pc[0];c.paint[1]=pc[1];c.paint[2]=pc[2];c.dirt=trfRnd()*.12+(L.town?0:.1);
    trfPose(c);c.d2=dd*dd;c.born=TRF.t;TRF.spawned++;TRF.stSpawned=(TRF.stSpawned||0)+1;return true;}
  return false;}
