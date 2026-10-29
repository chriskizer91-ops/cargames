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
/* the engine bay: built the first time this build's hood opens, never with it shut */
const bayOf=i=>{const T=truck(i);return T.bay||(T.bay=buildBay(BUILDS[i],T.D));};
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
