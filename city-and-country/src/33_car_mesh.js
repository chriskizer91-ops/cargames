/* =====================================================================================
   EACH CAR'S MESHES, built the first time they are needed and kept: the body, the hood, what the hood
   hides, the wheels and, with the hood open, the engine bay. Shared by the model bay and the game.
   ===================================================================================== */
/* ---------- meshes, built on demand ---------- */
const TRUCK={};
function truck(i){const b=BUILDS[i];if(TRUCK[b.id])return TRUCK[b.id];
  /* the quads, the carts, the tractor and the semi are built from parts, not lofted (34_machines) */
  if(b.machine){const t0=performance.now(),T=buildMachine(b);T.ms=performance.now()-t0;return TRUCK[b.id]=T;}
  const t0=performance.now(),s=buildSUV(b.look,b),w=buildWheel(b.look.tyre),wr=b.look.tyreR?buildWheel(b.look.tyreR):w;
  return TRUCK[b.id]={body:s.body,hood:s.hood,hide:s.hide,D:s.D,wheel:w,wheelR:wr,bay:s.bay,engineOut:!!s.bay,
    tris:s.tris+w.tris*2+wr.tris*2+(s.bay?s.bay.tris:0),ms:performance.now()-t0};}
/* a coarser copy (the body's stations RACE_LOD times further apart), built on its own: the other cars in a race
   are drawn from nothing else, near or far, so the full car (several times the building, several times the
   memory) is never made for them. Its own body, hood and any blower through it; the wheels are everyone's */
const TRUCKF={},RACE_LOD=3;
function truckFar(i){const b=BUILDS[i];if(TRUCKF[b.id])return TRUCKF[b.id];
  /* a machine is built from parts, not lofted: its copy is itself, without its rider */
  if(b.machine){const T=truck(i);return TRUCKF[b.id]={body:T.body,hood:null,D:T.D,wheel:T.wheel,wheelR:T.wheelR,shared:true,tris:T.tris,ms:0};}
  const t0=performance.now();BODY_LOD=RACE_LOD;let s;try{s=buildSUV(b.look,b);}finally{BODY_LOD=1;}
  /* (only the blower is drawn of a blown engine's bay: the rest of it goes at once) */
  if(s.hide&&s.hide.vao)freeMesh(s.hide);if(s.bay){for(const m of [s.bay.bay,s.bay.liner])if(m&&m.vao)freeMesh(m);}
  const w=buildWheel(b.look.tyre),wr=b.look.tyreR?buildWheel(b.look.tyreR):w;
  return TRUCKF[b.id]={body:s.body,hood:s.hood,D:s.D,bay:s.bay,engineOut:!!s.bay,wheel:w,wheelR:wr,
    tris:(s.body.n+s.hood.n+(s.bay?s.bay.engine.n:0))/3+w.tris*2+wr.tris*2,ms:performance.now()-t0};}
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
