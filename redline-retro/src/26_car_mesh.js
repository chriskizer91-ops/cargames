/* =====================================================================================
   EACH CAR'S MESHES, built the first time they are needed and kept: the body, the hood, what the hood
   hides, the wheels and, with the hood open, the engine bay. Shared by the model bay and the game.
   ===================================================================================== */
/* ---------- meshes, built on demand ---------- */
/* (Redline Retro: every car's body is built coarse, its stations RETRO_CAR.lod times further apart than designed (the
   traffic's light copy has them 8 apart), nothing under the floor, on the traffic's plain wheels: a car is a few
   thousand triangles where the full game's was fifty thousand, and the shapes still read at 240 rows. ?carlod= in
   the page's address tries another) */
const RETRO_CAR={lod:+(new URLSearchParams(location.search).get('carlod')||9)};
const RWHEEL=new Map();
function retroWheel(t){const k=JSON.stringify(t);let m=RWHEEL.get(k);if(!m){const mb=wheelLiteMB(t);m=mb.build();m.tris=mb.p.length/9;RWHEEL.set(k,m);}return m;}
const TRUCK={};
function truck(i){const b=BUILDS[i];if(TRUCK[b.id])return TRUCK[b.id];
  /* the quads, the carts, the tractor and the semi are built from parts, not lofted (34_machines) */
  if(b.machine){const t0=performance.now(),T=buildMachine(b);T.ms=performance.now()-t0;return TRUCK[b.id]=T;}
  const t0=performance.now();BODY_LOD=RETRO_CAR.lod;BODY_NOUNDER=true;let s;try{s=buildSUV(b.look,b);}finally{BODY_LOD=1;BODY_NOUNDER=false;}
  const w=retroWheel(b.look.tyre),wr=b.look.tyreR?retroWheel(b.look.tyreR):w;
  return TRUCK[b.id]={body:s.body,hood:s.hood,hide:s.hide,D:s.D,wheel:w,wheelR:wr,bay:s.bay,engineOut:!!s.bay,
    tris:s.tris+w.tris*2+wr.tris*2+(s.bay?s.bay.tris:0),ms:performance.now()-t0};}
/* a coarser copy (the body's stations RACE_LOD times further apart), built on its own: the other cars in a race
   are drawn from nothing else, near or far, so the full car (several times the building, several times the
   memory) is never made for them. Its own body, hood and any blower through it; the wheels are everyone's */
const TRUCKF={},RACE_LOD=Math.max(10,RETRO_CAR.lod*2);
function truckFar(i){const b=BUILDS[i];if(TRUCKF[b.id])return TRUCKF[b.id];
  /* a machine is built from parts, not lofted: its copy is itself, without its rider */
  if(b.machine){const T=truck(i);return TRUCKF[b.id]={body:T.body,hood:null,D:T.D,wheel:T.wheel,wheelR:T.wheelR,shared:true,tris:T.tris,ms:0};}
  const t0=performance.now();BODY_LOD=RACE_LOD;BODY_NOUNDER=true;let s;try{s=buildSUV(b.look,b);}finally{BODY_LOD=1;BODY_NOUNDER=false;}
  /* (only the blower is drawn of a blown engine's bay: the rest of it goes at once) */
  if(s.hide&&s.hide.vao)freeMesh(s.hide);if(s.bay){for(const m of [s.bay.bay,s.bay.liner])if(m&&m.vao)freeMesh(m);}
  const w=retroWheel(b.look.tyre),wr=b.look.tyreR?retroWheel(b.look.tyreR):w;
  return TRUCKF[b.id]={body:s.body,hood:s.hood,D:s.D,bay:s.bay,engineOut:!!s.bay,wheel:w,wheelR:wr,
    tris:(s.body.n+s.hood.n+(s.bay?s.bay.engine.n:0))/3+w.tris*2+wr.tris*2,ms:performance.now()-t0};}
/* the traffic's light copies (60_traffic): the body with its stations BODY_LITE times apart (the race's coarse copy has
   them three times apart), the hood and the spares on it, and four plain wheels (30_wheels wheelLiteMB) where the
   car settled on its springs has them, all in one mesh: one draw a car a pass. Farther off, the same with the
   stations BODY_FAR apart and the body bare of its small parts (21_suv BODY_BARE: the skin, glass, faces and tails,
   so its lamps still show at night). Also the light body alone and the plain wheels on their own, for a car near
   enough that its wheels should be seen to turn. hubs: [x, y, z, side, front] for each wheel in the model's frame
   (60_traffic, from the car settled on flat ground) */
const TRUCKL={},BODY_LITE=8,BODY_FAR=16;
function truckLite(i,hubs){const b=BUILDS[i];if(TRUCKL[b.id])return TRUCKL[b.id];if(b.machine)return null;
  const t0=performance.now(),wF=wheelLiteMB(b.look.tyre),wR=b.look.tyreR?wheelLiteMB(b.look.tyreR):wF;
  const one=(q,bare)=>{BODY_LOD=q;BODY_MB=true;BODY_BARE=bare;BODY_NOUNDER=true;let s;try{s=buildSUV(b.look,b);}finally{BODY_LOD=1;BODY_MB=false;BODY_BARE=false;BODY_NOUNDER=false;}
    const D=s.D,fx=D.X(D.uFa),R0=b.look.tyre.R,Mp=D.pitch?M4.mul(M4T(fx,R0,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R0,0))):M4.id();
    /* (tail-up over big rear tyres, as drawWorldCar sits the body) */
    const body=new MB();mbAppendX(body,s.mbs[0],Mp);mbAppendX(body,s.mbs[1],Mp);
    (D.spares||[]).forEach(sp=>mbAppendX(body,sp.rear?wR:wF,M4.mul(Mp,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1)))));
    const all=new MB().append(body);for(const [x,y,z,sd,front] of hubs)mbAppendX(all,front?wF:wR,M4.mul(M4T(x,y,z),M4S(1,1,sd)));
    return {D,body,all,stats:s.stats};};
  const A=one(BODY_LITE,false),B=one(BODY_FAR,true);
  const T={all:A.all.build(),body:A.body.build(),far:B.all.build(),wheel:wF.build(),wheelR:null,D:A.D,
    tris:A.all.p.length/9,trisBody:A.body.p.length/9,trisFar:B.all.p.length/9,trisWheel:wF.p.length/9,stats:A.stats,statsFar:B.stats};
  T.wheelR=wR===wF?T.wheel:wR.build();T.ms=performance.now()-t0;return TRUCKL[b.id]=T;}
/* a mesh builder's triangles into another, moved by a model matrix (its normals turned with it) */
function mbAppendX(dst,src,M){const P=src.p,N=src.n;
  for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2],nx=N[i],ny=N[i+1],nz=N[i+2];
    dst.p.push(M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14]);
    const ax=M[0]*nx+M[4]*ny+M[8]*nz,ay=M[1]*nx+M[5]*ny+M[9]*nz,az=M[2]*nx+M[6]*ny+M[10]*nz,l=Math.hypot(ax,ay,az)||1;dst.n.push(ax/l,ay/l,az/l);}
  for(let i=0;i<src.c.length;i++)dst.c.push(src.c[i]);for(let i=0;i<src.m.length;i++)dst.m.push(src.m[i]);return dst;}
/* the engine bay: built the first time this build's hood opens, never with it shut */
const bayOf=i=>{const T=truck(i);return T.bay||(T.bay=buildBay(BUILDS[i],T.D));};
/* ---------- matrices ---------- */
const M4T=(x,y,z)=>{const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m;};
const M4RY=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const M4S=(x,y,z)=>{const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m;};
const M4RX=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
const M4RZ=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
/* a wheel's matrix: the car's M0 times its hub at (x, y, z), steered st, the side s (+-1) and turned ang, written
   into one scratch matrix (M0 x T x RY(-st) x S(1,1,s) x RZ(-ang) as nine new matrices was a wheel's cost, every
   wheel of every car in every pass). GL copies it at once, so the one is enough */
const WHM=new Float32Array(16),WHL=new Float64Array(16);
function wheelMat(M0,x,y,z,st,s,ang){
  const cb=Math.cos(-st),sb=Math.sin(-st),cg=Math.cos(-ang),sg=Math.sin(-ang),L=WHL;
  L[0]=cb*cg;L[1]=sg;L[2]=-sb*cg;L[3]=0;L[4]=-cb*sg;L[5]=cg;L[6]=sb*sg;L[7]=0;L[8]=sb*s;L[9]=0;L[10]=cb*s;L[11]=0;L[12]=x;L[13]=y;L[14]=z;L[15]=1;
  for(let c=0;c<4;c++){const c4=c*4;for(let r=0;r<4;r++)WHM[c4+r]=M0[r]*L[c4]+M0[4+r]*L[c4+1]+M0[8+r]*L[c4+2]+M0[12+r]*L[c4+3];}
  return WHM;}
/* a flame for the exhaust tips: unit length along +X, hot at the root, red at the tip */
let FLAME=null;
function flameMesh(){if(FLAME)return FLAME;const mb=new MB(),seg=[[0,.18,1,.92,[1,.92,.62],9],[.18,.48,.92,.7,[1,.7,.22],7],[.48,.78,.7,.38,[1,.42,.08],5],[.78,1,.38,.04,[.9,.18,.04],3.5]];
  for(const [a,b,r0,r1,c,em] of seg)tubeAB(mb,[a,0,0],[b,0,0],r0,10,V(c,MAT.EMIT,em),a===0,r1);return FLAME=mb.build();}
