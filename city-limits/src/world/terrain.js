/* =====================================================================================
   THE DESERT — everything between the town's edge and the salt flats.
   - the ground: hills to the north, low badlands east and west, a dry wash and a mud bog to the south,
     three mesas; flat near town and flattening again into the salt past R1. Built once on an 8 m grid:
     the mesh and the physics read the same grid (triangle by triangle), so you drive on what you see.
   - the roads: the Salt Road east and west (paved, two lanes, straight out to the flats), Ridge Road
     north (gravel, winding up over the hills), Wash Road south (dirt, across the wash), the Rim Trail
     (a two-track loop round the town) and the Boulder Spur. Each has a height profile: the ground under
     it smoothed and held to a grade, pinned to the roads it crosses. The grid is graded flat in a
     corridor beside each road and blended back to the natural ground beyond it.
   - things: dirt kickers on the trails, rock mounds to crawl, boulders, scrub, cacti, power lines and
     reflector posts along the Salt Road, CITY LIMITS signs, a gas station and a diner at the edge of town.
   Map coordinates: x east, y north, h up. World: X = x, Y = h, Z = -y.
   ===================================================================================== */
import {MeshBuilder,Chunked,rng,norm,cross} from '../render/mesh.js';
import {W} from './kit.js';
import {glyphPixels} from '../ui/font.js';
import {EDGE,EXIT_HW,inTown} from './clmap.js';
import {FLATS} from './flats.js';

export const TR={HALF:1800,CELL:8,R1:FLATS.R1,BLEND:320};
const NC=Math.round(TR.HALF*2/TR.CELL),NV=NC+1;
const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---------- noise ---------- */
function hash2(i,j){let h=Math.imul(i|0,374761393)^Math.imul(j|0,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function vnoise(x,y){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash2(i,j),b=hash2(i+1,j),c=hash2(i,j+1),d=hash2(i+1,j+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o=4){let s=0,a=.5,n=0;for(let k=0;k<o;k++){s+=a*vnoise(x,y);n+=a;const X=x*1.6+y*1.2+1.7,Y=-x*1.2+y*1.6+9.2;x=X;y=Y;a*=.5;}return s/n;}

/* ---------- the land's features ---------- */
const MESAS=[{x:-980,y:520,r:110,h:34,w:30},{x:1080,y:-640,r:80,h:26,w:26},{x:-760,y:-1080,r:70,h:22,w:24}];
export const BOG={x:-150,y:-590,r:32,depth:1.1};
export const WASH={y0:-860,amp:80,w:16,depth:2.4};
/* flat pads graded for the buildings at the edge of town */
export const PADS=[{x:470,y:40,hx:26,hy:24},{x:-470,y:-30,hx:24,hy:22}];
const washY=x=>WASH.y0+WASH.amp*Math.sin(x/260+.6)+30*Math.sin(x/97+1.3);
/* the boulder field: smooth rock mounds you can crawl over (and the physics climbs them) */
export const FIELD={x:590,y:470};
export const MOUNDS=(()=>{const R=rng(4711),out=[];const cx=FIELD.x,cy=FIELD.y;
  for(let k=0;k<22;k++){const a=R()*Math.PI*2,r=Math.sqrt(R())*70,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r,rad=3+R()*5,h=.8+R()*2.2;
    if(out.some(m=>Math.hypot(m.x-x,m.y-y)<(m.rad+rad)*.7))continue;out.push({x,y,rad,h,seed:R()});}
  return out;})();
const moundH=(m,x,y)=>{const d=Math.hypot(x-m.x,y-m.y)/m.rad;if(d>=1)return 0;const t=1-d*d;return m.h*t*t*(1.6-.6*t)*(1+.08*Math.sin((x-m.x)*2.1+m.seed*9)*Math.sin((y-m.y)*1.7));};

/* the natural ground at a map point, before any road is graded through it */
export function natural(x,y){
  const r=Math.hypot(x,y);
  const north=ss(-200,600,y),n1=fbm(x*.0021+3.1,y*.0021-1.7,4),n2=fbm(x*.0068+9.2,y*.0068+4.4,3),n3=vnoise(x*.034,y*.034);
  let h=north*(Math.pow(n1,1.6)*92+n2*14)+(1-north)*(Math.pow(n1,1.2)*18+n2*9)+n3*1.1;
  /* mesas: flat tops, steep sides */
  for(const m of MESAS){const d=Math.hypot(x-m.x,y-m.y);const k=ss(m.r+m.w,m.r,d);if(k>0)h=Math.max(h,h*(1-k)+(m.h+n2*3)*Math.pow(k,.7));}
  /* the dry wash: a sandy channel meandering east-west across the south */
  if(y<-500&&y>-1250){const dw=Math.abs(y-washY(x));if(dw<WASH.w*2.2)h-=WASH.depth*(1-ss(WASH.w*.6,WASH.w*2.2,dw));}
  /* flat near town, then the salt */
  const ax=Math.abs(x),ay=Math.abs(y),dTown=Math.max(0,Math.max(ax,ay)-EDGE);
  h*=ss(0,240,dTown);
  const k=ss(TR.R1-TR.BLEND,TR.R1,r);h=h*(1-k)+FLATS.y*k;
  return h;
}

/* ---------- the roads ---------- */
/* kind: asphalt | gravel | dirt | trail. Listed in the order they are graded (later ones pinned to earlier) */
function loopPts(){const R=rng(77),p=[];for(let k=0;k<28;k++){const a=k/28*Math.PI*2,r=880+(R()-.5)*120+60*Math.sin(a*3+1);p.push([Math.cos(a)*r,Math.sin(a)*r]);}return p;}
const ROAD_DEFS=[
  {id:'saltE',name:'SALT ROAD',kind:'asphalt',hw:EXIT_HW,pts:[[EDGE-4,0],[900,0],[TR.HALF+60,0]],town:0},
  {id:'saltW',name:'SALT ROAD',kind:'asphalt',hw:EXIT_HW,pts:[[-EDGE+4,0],[-900,0],[-TR.HALF-60,0]],town:0},
  {id:'ridge',name:'RIDGE ROAD',kind:'gravel',hw:4.6,pts:[[0,EDGE-4],[0,470],[-25,560],[-100,640],[-60,730],[55,785],[120,865],[45,950],[-75,1010],[-30,1110],[90,1180],[60,1290],[0,1400],[0,1560],[0,TR.HALF+60]],town:0},
  {id:'wash',name:'WASH ROAD',kind:'dirt',hw:4.6,pts:[[0,-EDGE+4],[0,-480],[40,-580],[-25,-700],[-80,-820],[-35,-960],[30,-1100],[0,-1260],[0,-1520],[0,-TR.HALF-60]],town:0},
  {id:'loop',name:'RIM TRAIL',kind:'trail',hw:3.6,closed:true,pts:loopPts()},
  {id:'spur',name:'BOULDER SPUR',kind:'trail',hw:3.2,pts:[[648,668],[632,600],[612,540],[600,505]],join:'loop'}
];
/* Catmull-Rom through the control points, resampled every ds metres */
function resample(pts,closed,ds=2){
  const P=closed?[pts[pts.length-1],...pts,pts[0],pts[1]]:[pts[0],...pts,pts[pts.length-1]],dense=[];
  for(let i=1;i<P.length-2;i++){const [p0,p1,p2,p3]=[P[i-1],P[i],P[i+1],P[i+2]];const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(2,Math.ceil(L/1));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;dense.push([0,1].map(c=>.5*(2*p1[c]+(-p0[c]+p2[c])*t+(2*p0[c]-5*p1[c]+4*p2[c]-p3[c])*t2+(-p0[c]+3*p1[c]-3*p2[c]+p3[c])*t3)));}}
  if(!closed)dense.push(pts[pts.length-1]);
  /* even spacing */
  const out=[dense[0]];let acc=0;
  for(let i=1;i<dense.length;i++){const a=dense[i-1],b=dense[i];let L=Math.hypot(b[0]-a[0],b[1]-a[1]),t0=0;
    while(acc+L*(1-t0)>=ds){const need=ds-acc,t=t0+need/L;out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);t0=t;acc=0;}acc+=L*(1-t0);}
  if(closed&&Math.hypot(out[0][0]-out[out.length-1][0],out[0][1]-out[out.length-1][1])<ds*.5)out.pop();
  return out;
}
class Road{
  constructor(def){
    Object.assign(this,def);const P=resample(def.pts,!!def.closed);this.N=P.length;this.x=new Float32Array(this.N);this.y=new Float32Array(this.N);
    P.forEach((p,i)=>{this.x[i]=p[0];this.y[i]=p[1];});this.ds=2;this.len=this.N*2;this.h=new Float32Array(this.N);this.pin=new Uint8Array(this.N);
    this.dx=new Float32Array(this.N);this.dy=new Float32Array(this.N);
    for(let i=0;i<this.N;i++){const a=this.idx(i-1),b=this.idx(i+1);const dx=this.x[b]-this.x[a],dy=this.y[b]-this.y[a],l=Math.hypot(dx,dy)||1;this.dx[i]=dx/l;this.dy[i]=dy/l;}
  }
  idx(i){return this.closed?((i%this.N)+this.N)%this.N:clamp(i,0,this.N-1);}
  /* the height along the road: the ground smoothed, held to the grade, pinned where it must meet something */
  profile(grade,pins){
    const N=this.N,h=new Float32Array(N);for(let i=0;i<N;i++)h[i]=natural(this.x[i],this.y[i]);
    const win=this.kind==='asphalt'?60:this.kind==='trail'?8:14;
    for(let pass=0;pass<2;pass++){const c=h.slice();for(let i=0;i<N;i++){let s=0,n=0;for(let k=-win;k<=win;k++){const j=this.closed?this.idx(i+k):i+k;if(j<0||j>=N)continue;s+=c[j];n++;}h[i]=s/n;}}
    for(const [i,v] of pins){h[i]=v;this.pin[i]=1;}
    const g=grade*this.ds;
    for(let it=0;it<4;it++){
      for(let i=1;i<N;i++)if(!this.pin[i])h[i]=clamp(h[i],h[i-1]-g,h[i-1]+g);
      if(this.closed&&!this.pin[0])h[0]=clamp(h[0],h[N-1]-g,h[N-1]+g);
      for(let i=N-2;i>=0;i--)if(!this.pin[i])h[i]=clamp(h[i],h[i+1]-g,h[i+1]+g);
      for(const [i,v] of pins)h[i]=v;}
    this.h=h;
  }
}
/* a spatial hash of road points, for "which road is here" */
const HC=24;
class RoadIndex{
  constructor(roads){this.roads=roads;this.cells=new Map();
    roads.forEach((r,ri)=>{for(let i=0;i<r.N;i++){const reach=r.hw+26;const x=r.x[i],y=r.y[i];
      for(let cx=Math.floor((x-reach)/HC);cx<=Math.floor((x+reach)/HC);cx++)for(let cy=Math.floor((y-reach)/HC);cy<=Math.floor((y+reach)/HC);cy++){
        const k=cx*100003+cy;let a=this.cells.get(k);if(!a)this.cells.set(k,a=[]);a.push(ri*65536+i);}}});}
  /* the nearest point of each road near (x, y): [{road, i, t, d (signed, left +), h}] */
  near(x,y,out=[]){out.length=0;const a=this.cells.get(Math.floor(x/HC)*100003+Math.floor(y/HC));if(!a)return out;
    const best=new Map();
    for(const code of a){const ri=code>>>16,i=code&65535,r=this.roads[ri],dx=x-r.x[i],dy=y-r.y[i],d2=dx*dx+dy*dy,b=best.get(ri);if(!b||d2<b.d2)best.set(ri,{i,d2});}
    for(const [ri,{i}] of best){const r=this.roads[ri];
      /* project onto the segment toward the nearer neighbour */
      let j=r.idx(i+1);const dx=x-r.x[i],dy=y-r.y[i];if((r.x[j]-r.x[i])*dx+(r.y[j]-r.y[i])*dy<0){j=r.idx(i-1);}
      const ex=r.x[j]-r.x[i],ey=r.y[j]-r.y[i],el=Math.hypot(ex,ey)||1,t=clamp((dx*ex+dy*ey)/(el*el),0,1);
      const px=r.x[i]+ex*t,py=r.y[i]+ey*t,qx=x-px,qy=y-py,side=(ex*qy-ey*qx)>=0?1:-1,d=Math.hypot(qx,qy)*side;
      const h=r.h[i]+(r.h[j]-r.h[i])*t,s=(i+(j>i||(r.closed&&j===0&&i===r.N-1)?t:-t))*r.ds;
      out.push({road:r,ri,i,j,t,d,h,s});}
    return out;}
}

/* ---------- build it all ---------- */
export function buildDesert(){
  const t0=performance.now();
  const roads=ROAD_DEFS.map(d=>new Road(d));
  /* grade each road, pinned at town (0) and to the roads it crosses */
  const graded=[];
  for(const r of roads){
    const pins=[];
    if(r.town===0){for(let i=0;i<r.N;i++){const x=r.x[i],y=r.y[i];if(Math.max(Math.abs(x),Math.abs(y))<EDGE+10)pins.push([i,0]);}}
    if(graded.length){const idx=new RoadIndex(graded),tmp=[];
      for(let i=0;i<r.N;i++){for(const q of idx.near(r.x[i],r.y[i],tmp))if(Math.abs(q.d)<q.road.hw+r.hw+2){pins.push([i,q.h]);break;}}}
    r.profile(r.kind==='asphalt'?.06:r.kind==='trail'?.16:.11,pins);graded.push(r);
  }
  const index=new RoadIndex(roads);
  /* ---------- the ground grid ---------- */
  const H=new Float32Array(NV*NV),SURF=new Uint8Array(NV*NV),tmp=[];
  const X0=-TR.HALF;
  for(let j=0;j<NV;j++)for(let i=0;i<NV;i++){
    const x=X0+i*TR.CELL,y=X0+j*TR.CELL;let h=natural(x,y);
    /* graded corridors beside the roads */
    let wBest=0,hT=0;
    for(const q of index.near(x,y,tmp)){const ad=Math.abs(q.d),r=q.road,c0=r.hw+(r.kind==='trail'?3:7),c1=c0+(r.kind==='trail'?10:18);
      const w=ad<c0?1:1-ss(c0,c1,ad);if(w>wBest){wBest=w;hT=q.h-.06;}}
    if(wBest>0)h=h*(1-wBest)+hT*wBest;
    for(const P of PADS){const ex=Math.max(0,Math.abs(x-P.x)-P.hx),ey=Math.max(0,Math.abs(y-P.y)-P.hy),e=Math.hypot(ex,ey);if(e<20){const k=1-ss(0,20,e);h=h*(1-k)+(P.h??(P.h=natural(P.x,P.y)))*k;}}
    /* the bog's hollow */
    const db=Math.hypot(x-BOG.x,y-BOG.y);if(db<BOG.r*1.6)h-=BOG.depth*(1-ss(BOG.r*.5,BOG.r*1.6,db));
    H[j*NV+i]=h;
  }
  /* what the ground is made of at each grid point (for the shader's masks; the physics asks surfAt) */
  const G={H,index,roads};
  const hAt=(i,j)=>H[clamp(j,0,NC)*NV+clamp(i,0,NC)];
  /* ---------- the mesh ---------- */
  const C=new Chunked(128),R=rng(2024),lights=[],colliders=[];
  const vtx=(B,i,j)=>{const x=X0+i*TR.CELL,y=X0+j*TR.CELL,h=hAt(i,j);
    const gx=(hAt(i+1,j)-hAt(i-1,j))/(2*TR.CELL),gy=(hAt(i,j+1)-hAt(i,j-1))/(2*TR.CELL);const n=norm([-gx,1,gy]);
    const m=masks(x,y,n[1],h);B.c=[m[0],m[1],m[2],m[3]];return B.v(W(x,y,h),n,x,-y);};
  for(let tj=0;tj<NC;tj+=16)for(let ti=0;ti<NC;ti+=16){
    const cx=X0+(ti+8)*TR.CELL,cy=X0+(tj+8)*TR.CELL;
    /* skip tiles wholly inside town */
    let any=false;for(let j=tj;j<tj+16&&!any;j++)for(let i=ti;i<ti+16&&!any;i++){const x=X0+(i+.5)*TR.CELL,y=X0+(j+.5)*TR.CELL;if(!cellInTown(x,y))any=true;}
    if(!any)continue;
    const B=C.mat(22).at(cx,-cy);const ids=new Map();
    const id=(i,j)=>{const k=i*4096+j;let v=ids.get(k);if(v===undefined){v=vtx(B,i,j);ids.set(k,v);}return v;};
    for(let j=tj;j<Math.min(tj+16,NC);j++)for(let i=ti;i<Math.min(ti+16,NC);i++){
      const x=X0+(i+.5)*TR.CELL,y=X0+(j+.5)*TR.CELL;if(cellInTown(x,y))continue;
      /* quad (i,j)-(i+1,j+1); counter-clockwise seen from above in world (Z = -y) */
      const a=id(i,j),b=id(i+1,j),c=id(i+1,j+1),d=id(i,j+1);B.tri(a,c,b);B.tri(a,d,c);}
  }
  /* ---------- road surfaces ---------- */
  for(const r of roads)ribbon(C,r);
  /* ---------- things ---------- */
  const things=placeThings(G,C,R,lights,colliders);
  G.colliders=colliders;G.lights=lights;G.things=things;G.ms=performance.now()-t0;
  G.C=C;
  return G;
  function cellInTown(x,y){return inTown(x,y)&&inTown(x-TR.CELL*.5,y-TR.CELL*.5)&&inTown(x+TR.CELL*.5,y+TR.CELL*.5)&&inTown(x-TR.CELL*.5,y+TR.CELL*.5)&&inTown(x+TR.CELL*.5,y-TR.CELL*.5);}
  /* the shader's masks: r rock (steep ground, mesa walls), g sand (the wash), b mud (the bog), a salt */
  function masks(x,y,ny,h){
    const rock=ss(.86,.72,ny),r=Math.hypot(x,y),salt=ss(TR.R1-140,TR.R1,r);
    const dw=y<-500&&y>-1250?Math.abs(y-washY(x)):999,sand=1-ss(WASH.w*.8,WASH.w*1.8,dw);
    const db=Math.hypot(x-BOG.x,y-BOG.y),mud=1-ss(BOG.r*.85,BOG.r*1.3,db);
    return [rock*255,sand*255,mud*255,salt*255];
  }
}

/* a road's surface: a strip a few centimetres over its graded corridor, following its profile */
function ribbon(C,r){
  const mat=r.kind==='asphalt'?24:23,kind={gravel:1,dirt:2,trail:0}[r.kind]||0,hw=r.hw;
  const n=r.closed?r.N:r.N-1,across=r.kind==='asphalt'?[-hw-.6,-hw*.5,0,hw*.5,hw+.6]:[-hw-.8,-hw*.33,hw*.33,hw+.8];
  for(let i0=0;i0<n;i0+=4){
    const i1=Math.min(i0+4,n);const mid=r.idx((i0+i1)>>1);const B=C.mat(mat,kind,Math.round(hw*8)).at(r.x[mid],-r.y[mid]);B.c=[255,0,0,255];
    let prev=null;
    for(let k=i0;k<=i1;k++){const i=r.idx(k),x=r.x[i],y=r.y[i],h=r.h[i]+.035,nx=-r.dy[i],ny=r.dx[i],s=k*r.ds;
      /* skip what lies inside town (the town draws its own streets) */
      const row=across.map(d=>{const px=x+nx*d,py=y+ny*d,ed=Math.abs(d)>hw?-.07:0;return B.v(W(px,py,h+ed),[0,1,0],s,d);});
      if(prev&&!(inTown(x,y)&&inTown(r.x[r.idx(k-1)],r.y[r.idx(k-1)])))for(let c=0;c<across.length-1;c++)B.quad(prev[c],prev[c+1],row[c+1],row[c]);
      prev=row;}
  }
}

/* ---------- the things standing in the desert ---------- */
function placeThings(G,C,R,lights,colliders){
  const out={jumps:[],signs:[],stations:[]};
  const onRoad=(x,y,m=0)=>{for(const q of G.index.near(x,y))if(Math.abs(q.d)<q.road.hw+m)return true;return false;};
  const gh=(x,y)=>groundHeight(G,x,y);
  /* jumps: dirt kickers on the trails and a big table on Wash Road, each along its road */
  const jumpAt=(r,s,spec)=>{const i=Math.round(s/r.ds)%r.N;const yaw=Math.atan2(r.dy[i],r.dx[i]);
    const J=Object.assign({dx:Math.cos(yaw),dy:Math.sin(yaw)},spec);J.L=J.Lf+J.T+J.Lb;J.ox=r.x[i]-J.dx*J.Lf;J.oy=r.y[i]-J.dy*J.Lf;J.base=r.h[i];J.road=r.id;out.jumps.push(J);};
  const loop=G.roads.find(r=>r.id==='loop'),wash=G.roads.find(r=>r.id==='wash'),ridge=G.roads.find(r=>r.id==='ridge');
  for(const f of [.06,.31,.56,.81])jumpAt(loop,loop.len*f,{kind:'kicker',H:1.6,Lf:9,T:2,Lb:16,k:1.6,hw:3.2,ws:1.2});
  jumpAt(wash,wash.len*.72,{kind:'table',H:2.4,Lf:14,T:14,Lb:16,k:1.15,hw:5,ws:2});
  jumpAt(ridge,ridge.len*.9,{kind:'kicker',H:2.2,Lf:12,T:3,Lb:24,k:1.5,hw:4.4,ws:1.5});
  G.jumps=out.jumps;
  const baseAt=(x,y)=>desertGround(G,x,y,{y:0,surf:''},[],true).y;
  for(const J of out.jumps)jumpMesh(C,J,baseAt);
  /* rock mounds, none on a road */
  for(let k=MOUNDS.length-1;k>=0;k--){const m=MOUNDS[k];if(onRoad(m.x,m.y,m.rad+3))MOUNDS.splice(k,1);}
  for(const m of MOUNDS)moundMesh(C,m,gh);
  /* boulders: solid, scattered off the roads, thicker in the north and round the mesas */
  for(let k=0;k<520;k++){const a=R()*Math.PI*2,rr=EDGE+60+Math.pow(R(),.8)*(TR.R1-EDGE-160),x=Math.cos(a)*rr,y=Math.sin(a)*rr;
    if(y<0&&R()<.5)continue;if(onRoad(x,y,6))continue;const s=.5+Math.pow(R(),2.4)*2.6;
    rockMesh(C,x,y,gh(x,y),s,R);colliders.push({t:'c',x,z:-y,r:s*.85,top:gh(x,y)+s*1.1});}
  /* scrub: low and everywhere off the roads; cacti here and there. Neither stops a car */
  for(let k=0;k<2600;k++){const a=R()*Math.PI*2,rr=EDGE+20+Math.sqrt(R())*(TR.R1-EDGE-120),x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(onRoad(x,y,2.5))continue;
    const s=.35+R()*.8;bushMesh(C,x,y,gh(x,y),s,R);}
  for(let k=0;k<260;k++){const a=R()*Math.PI*2,rr=EDGE+80+Math.sqrt(R())*(TR.R1-EDGE-300),x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(onRoad(x,y,5))continue;
    cactusMesh(C,x,y,gh(x,y),3+R()*5,R);colliders.push({t:'c',x,z:-y,r:.35,top:gh(x,y)+4});}
  /* the Salt Road: power poles on the north side, reflector posts both sides */
  for(const sx of [1,-1]){
    let prev=null;
    for(let x=EDGE+60;x<TR.R1-20;x+=64){const px=sx*x,py=EXIT_HW+9,h=gh(px,py);const top=W(px,py,h+10.5);
      C.mat(13,230).col(80,62,46);const B=C.at(px,-py);B.tube(W(px,py,h),top,.16,6,false,.12);
      C.mat(8,160,60).col(70,66,60);B.box(W(px,py,h+9.6),[1,0,0],[0,1,0],[0,0,1],[.1,.08,1.3]);
      colliders.push({t:'c',x:px,z:-py,r:.22,top:h+11});
      if(prev){C.mat(8,90,200).col(30,30,32);for(const dz of [-1.15,0,1.15]){const a=[prev[0],prev[1]+.15,prev[2]+dz],b=[top[0],top[1]-.75,top[2]+dz];sag(C,a,b);}}
      prev=[top[0],top[1]-.75,top[2]];}
    for(let x=EDGE+30;x<TR.R1;x+=50)for(const side of [1,-1]){const px=sx*x,py=side*(EXIT_HW+2.2),h=gh(px,py);
      C.mat(4,0).col(255,0,0,255);const B=C.at(px,-py);B.box(W(px,py,h+.55),[1,0,0],[0,1,0],[0,0,1],[.05,.55,.05]);
      C.mat(28,side*sx>0?1:0).col(255,255,255);B.box(W(px+sx*.06,py,h+.98),[1,0,0],[0,1,0],[0,0,1],[.012,.1,.04]);}
  }
  /* reflector posts on Ridge and Wash roads' bends, so the curves show up in the headlights */
  for(const r of [ridge,wash])for(let i=6;i<r.N-6;i+=15){const a=r.idx(i-6),b=r.idx(i+6),turn=r.dx[a]*r.dy[b]-r.dy[a]*r.dx[b];if(Math.abs(turn)<.12)continue;
    const side=turn>0?-1:1,px=r.x[i]-r.dy[i]*side*(r.hw+1.6),py=r.y[i]+r.dx[i]*side*(r.hw+1.6);if(inTown(px,py))continue;const h=gh(px,py);
    C.mat(4,0).col(255,0,0,255);const B=C.at(px,-py);B.box(W(px,py,h+.55),[1,0,0],[0,1,0],[0,0,1],[.05,.55,.05]);
    C.mat(28,2).col(255,255,255);B.box(W(px,py,h+.98),[1,0,0],[0,1,0],[0,0,1],[.06,.1,.06]);}
  /* CITY LIMITS signs where each road leaves town, facing the traffic coming in */
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const d=EDGE+24,side=-1;
    const px=dx*d+(dy?dy*side*(EXIT_HW+2.4):0),py=dy*d+(dx?-dx*side*(EXIT_HW+2.4):0);const h=gh(px,py);
    roadSign(C,px,py,h,[-dx,-dy],['CITY','LIMITS']);out.signs.push({x:px,y:py});colliders.push({t:'c',x:px,z:-py,r:.3,top:h+3});}
  /* the gas station at the east end of town, the diner at the west */
  station(C,lights,colliders,gh,470,34,R,out);
  diner(C,lights,colliders,gh,-470,-34,R);
  return out;
}

/* ---------- small meshes ---------- */
function sag(C,a,b){const n=6;let p=a;for(let k=1;k<=n;k++){const t=k/n,q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-Math.sin(Math.PI*t)*.9,a[2]+(b[2]-a[2])*t];C.at(q[0],q[2]).tube(p,q,.018,3,false);p=q;}}
function jumpMesh(C,J,baseAt){
  C.mat(23,3,Math.round(J.hw*8));const B=C.at(J.ox+J.dx*J.L/2,-(J.oy+J.dy*J.L/2));B.c=[255,0,0,255];
  const us=[];for(let k=0;k<=14;k++)us.push(J.Lf*k/14);us.push(J.Lf+J.T*.5,J.Lf+J.T);for(let k=1;k<=10;k++)us.push(J.Lf+J.T+J.Lb*k/10);
  const vs=[-J.hw,-J.hw+J.ws*.5,-J.hw+J.ws,0,J.hw-J.ws,J.hw-J.ws*.5,J.hw];const idx=[];
  for(const u of us){const row=[];for(const v of vs){const x=J.ox+J.dx*u-J.dy*v,y=J.oy+J.dy*u+J.dx*v,h=baseAt(x,y)+jumpProfile(J,u,v)+.05;
    const e=.2,du=(jumpProfile(J,u+e,v)-jumpProfile(J,u-e,v))/(2*e),dv=(jumpProfile(J,u,v+e)-jumpProfile(J,u,v-e))/(2*e);
    const gx=du*J.dx-dv*J.dy,gy=du*J.dy+dv*J.dx;row.push(B.v(W(x,y,h),[-gx,1,gy],u-J.Lf,v));}idx.push(row);}
  for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++)B.quad(idx[i][j],idx[i+1][j],idx[i+1][j+1],idx[i][j+1]);
}
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
/* a jump's height over its own road at (u along from its foot, v across) */
export function jumpProfile(J,u,v){const av=Math.abs(v);if(u<=0||u>=J.L||av>=J.hw)return 0;let p;
  if(u<J.Lf)p=J.H*Math.pow(u/J.Lf,J.k);else if(u<J.Lf+J.T)p=J.H;else p=J.H*(1-sm((u-J.Lf-J.T)/J.Lb));
  return av<J.hw-J.ws?p:p*sm((J.hw-av)/J.ws);}
function moundMesh(C,m,gh){
  C.mat(25,Math.floor(m.seed*255));const B=C.at(m.x,-m.y);B.c=[255,255,255,255];const nr=7,na=18,rows=[];
  for(let a=0;a<=nr;a++){const row=[];const rr=m.rad*(a/nr);for(let b=0;b<na;b++){const th=b/na*Math.PI*2,x=m.x+Math.cos(th)*rr,y=m.y+Math.sin(th)*rr;
    const h=gh(x,y),e=.25,gx=(gh(x+e,y)-gh(x-e,y))/(2*e),gy=(gh(x,y+e)-gh(x,y-e))/(2*e);row.push(B.v(W(x,y,h+.02),[-gx,1,gy],x,-y));}rows.push(row);}
  for(let a=0;a<nr;a++)for(let b=0;b<na;b++){const b1=(b+1)%na;B.quad(rows[a][b],rows[a+1][b],rows[a+1][b1],rows[a][b1]);}
}
function rockMesh(C,x,y,h,s,R){
  C.mat(25,Math.floor(R()*255));const B=C.at(x,-y);B.c=[255,255,255,255];
  const seg=7,rings=4,ix=[],sx=1+R()*.6,sz=1+R()*.6,sy=.55+R()*.4,rot=R()*6.28,seed=R()*100;
  for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI*.62,row=[];for(let i=0;i<seg;i++){const th=i/seg*Math.PI*2+rot;
    const wob=.8+.4*hash2(Math.floor(seed)+i,j);const n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];
    const p=[x+n[0]*s*sx*wob,h-s*.25+n[1]*s*sy*wob*1.3,-y+n[2]*s*sz*wob];row.push(B.v(p,n,p[0],p[2]));}ix.push(row);}
  for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const i1=(i+1)%seg;B.quad(ix[j][i],ix[j+1][i],ix[j+1][i1],ix[j][i1]);}
}
function bushMesh(C,x,y,h,s,R){
  C.mat(26,Math.floor(R()*255)).col(70+R()*30,74+R()*24,52+R()*16);const B=C.at(x,-y);
  const seg=5,ix=[],rot=R()*6.28;for(let j=0;j<=2;j++){const ph=j/2*Math.PI*.8,row=[];for(let i=0;i<seg;i++){const th=i/seg*Math.PI*2+rot,wob=.75+.5*R();
    const n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];row.push(B.v([x+n[0]*s*1.3*wob,h-.05+(n[1]+.25)*s*.8,-y+n[2]*s*1.3*wob],n,0,0));}ix.push(row);}
  for(let j=0;j<2;j++)for(let i=0;i<seg;i++){const i1=(i+1)%seg;B.quad(ix[j][i],ix[j+1][i],ix[j+1][i1],ix[j][i1]);}
}
function cactusMesh(C,x,y,h,H,R){
  C.mat(27,Math.floor(R()*255)).col(60,90,50);const B=C.at(x,-y);const r=.22+H*.02;
  B.tube(W(x,y,h-.2),W(x,y,h+H),r,7,true,r*.85);
  const arms=R()<.3?0:R()<.6?1:2;for(let k=0;k<arms;k++){const a=R()*6.28,ax=Math.cos(a),ay=Math.sin(a),hh=h+H*(.35+R()*.25),out=.7+R()*.5,up=1+R()*1.6;
    const p0=W(x+ax*r*.6,y+ay*r*.6,hh),p1=W(x+ax*out,y+ay*out,hh+.15),p2=W(x+ax*out,y+ay*out,hh+up);B.tube(p0,p1,r*.6,6,false);B.tube(p1,p2,r*.62,6,true,r*.55);}
}
/* a green road sign on two posts, its words retroreflective (lit by your headlights) */
function roadSign(C,x,y,h,face,lines){
  const fx=face[0],fy=face[1],rt=[fy,-fx];const B=C.at(x,-y);const w=3.4,H=1.9,base=h+1.4;
  C.mat(8,150,200).col(150,152,156);for(const s of [-1,1])B.tube(W(x+rt[0]*s*1.2,y+rt[1]*s*1.2,h),W(x+rt[0]*s*1.2,y+rt[1]*s*1.2,base+H),.05,5,false);
  C.mat(13,140).col(20,95,52);B.box(W(x,y,base+H/2),norm([rt[0],0,-rt[1]]),[0,1,0],norm([fx,0,-fy]),[w/2,H/2,.03]);
  C.mat(28,3).col(240,240,235);const px=.075;
  lines.forEach((t,li)=>{const L=t.length*6*px-px;let cx=-L/2;const y0=base+H-.45-li*.72;
    for(const ch of t){for(const [c,r] of glyphPixels(ch)){const ox=cx+(c+.5)*px,oy=y0-r*px;B.box(W(x+rt[0]*ox+fx*.04,y+rt[1]*ox+fy*.04,oy),norm([rt[0],0,-rt[1]]),[0,1,0],norm([fx,0,-fy]),[px*.48,px*.48,.01]);}cx+=6*px;}});
  /* a thin white border */
  C.mat(28,3).col(240,240,235);for(const [a,b] of [[[-w/2+.06,H-.06],[w/2-.06,H-.06]],[[-w/2+.06,.06],[w/2-.06,.06]]])B.box(W(x+rt[0]*(a[0]+b[0])/2+fx*.04,y+rt[1]*(a[0]+b[0])/2+fy*.04,base+a[1]),norm([rt[0],0,-rt[1]]),[0,1,0],norm([fx,0,-fy]),[(b[0]-a[0])/2,.025,.01]);
}
/* neon letters (glass tubes) on a panel */
function neonWord(C,text,origin,right,up,px,col){
  C.mat(7,60,0,0).col(col[0]*255,col[1]*255,col[2]*255);const B=C.at(origin[0],origin[2]);let cx=0;
  for(const ch of text){const pix=glyphPixels(ch),on=new Set(pix.map(([c,r])=>c+','+r));
    for(const [c,r] of pix){const P=(a,b)=>[origin[0]+right[0]*(cx+a)*px+up[0]*(6-b)*px,origin[1]+right[1]*(cx+a)*px+up[1]*(6-b)*px,origin[2]+right[2]*(cx+a)*px+up[2]*(6-b)*px];
      if(on.has((c+1)+','+r))B.tube(P(c,r),P(c+1,r),px*.17,5,false);if(on.has(c+','+(r+1)))B.tube(P(c,r),P(c,r+1),px*.17,5,false);B.sphere(P(c,r),px*.19,5,3);}
    cx+=6;}
}
function station(C,lights,colliders,gh,x,y,R,out){
  const h=gh(x,y)+.02,B=C.at(x,-y);
  /* the forecourt */
  C.mat(4,0).col(255,0,0,255);B.box(W(x,y,h-.1),[1,0,0],[0,1,0],[0,0,1],[22,.12,14]);
  /* the canopy on four columns, lit underneath */
  C.mat(8,120,40).col(200,202,206);for(const sx of [-1,1])for(const sy of [-1,1]){B.tube(W(x+sx*7,y+sy*3.5,h),W(x+sx*7,y+sy*3.5,h+5.2),.25,8,false);colliders.push({t:'c',x:x+sx*7,z:-(y+sy*3.5),r:.3,top:h+5});}
  C.mat(10,8).col(230,30,40);B.box(W(x,y,h+5.6),[1,0,0],[0,1,0],[0,0,1],[10,.45,6]);
  C.mat(4,0).col(255,0,0,255);B.box(W(x,y,h+5.12),[1,0,0],[0,1,0],[0,0,1],[9.9,.04,5.9]);
  for(const sx of [-5,-1.7,1.7,5])for(const sy of [-2.6,2.6]){C.mat(7,140,0,0).col(250,252,255);B.box(W(x+sx,y+sy,h+5.07),[1,0,0],[0,1,0],[0,0,1],[.6,.02,.3]);
    lights.push({type:1,pos:[x+sx,h+4.9,-(y+sy)],r:16,col:[220,230,240].map(v=>v*.55),dir:[0,-1,0],cosO:Math.cos(1.35),cosI:Math.cos(.9),src:.3,axis:[0,0,0],flick:0});}
  /* pumps */
  for(const sx of [-3.5,3.5]){C.mat(8,200,20).col(200,40,40);B.box(W(x+sx,y,h+.8),[1,0,0],[0,1,0],[0,0,1],[.5,.8,.35]);C.mat(10,6).col(255,255,240);B.box(W(x+sx,y,h+1.3),[1,0,0],[0,1,0],[0,0,1],[.4,.18,.36]);
    colliders.push({x0:x+sx-.55,x1:x+sx+.55,z0:-(y)-.4,z1:-(y)+.4,top:h+1.6});}
  /* the shop behind, its windows lit */
  const sy=y+12;C.mat(5,1,Math.floor(R()*255),3<<4).col(160,150,130,180);
  const shop={x0:x-9,x1:x+9,y0:sy-4,y1:sy+4,h:4.5};
  for(const [a,b,n] of [[[shop.x0,shop.y0],[shop.x1,shop.y0],[0,0,1]],[[shop.x1,shop.y1],[shop.x0,shop.y1],[0,0,-1]],[[shop.x1,shop.y0],[shop.x1,shop.y1],[1,0,0]],[[shop.x0,shop.y1],[shop.x0,shop.y0],[-1,0,0]]]){
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);B.quadP(W(a[0],a[1],h),W(b[0],b[1],h),W(b[0],b[1],h+shop.h),W(a[0],a[1],h+shop.h),[[0,0],[L,0],[L,shop.h],[0,shop.h]],n);}
  C.mat(6).col(255,0,0,255);B.quadP(W(shop.x0,shop.y0,h+shop.h),W(shop.x1,shop.y0,h+shop.h),W(shop.x1,shop.y1,h+shop.h),W(shop.x0,shop.y1,h+shop.h),[[0,0],[1,0],[1,1],[0,1]],[0,1,0]);
  colliders.push({x0:shop.x0,x1:shop.x1,z0:-shop.y1,z1:-shop.y0,top:h+shop.h});
  neonWord(C,'OPEN 24H',W(x-4.4,shop.y0-.15,h+3.0),[1,0,0],[0,1,0],.18,[.2,.9,1]);
  /* the tall sign by the road */
  const px=x-16,py=y-14;C.mat(8,150,200).col(90,92,96);B.tube(W(px,py,h),W(px,py,h+11),.22,8,false);colliders.push({t:'c',x:px,z:-py,r:.3,top:h+11});
  C.mat(10,7).col(240,40,40);B.box(W(px,py,h+12.4),[1,0,0],[0,1,0],[0,0,1],[2.6,1.5,.3]);
  neonWord(C,'GAS',W(px-1.85,py-.35,h+11.75),[1,0,0],[0,1,0],.2,[1,.95,.6]);
  lights.push({type:0,pos:[px,h+12,-(py)+1],r:14,col:[60,10,8],dir:[0,-1,0],cosO:-1,cosI:-1,src:.6,axis:[0,0,0],flick:0});
  out.stations.push({x,y,name:'GAS'});
}
function diner(C,lights,colliders,gh,x,y,R){
  const h=gh(x,y)+.02,B=C.at(x,-y);
  C.mat(4,0).col(255,0,0,255);B.box(W(x,y+4,h-.1),[1,0,0],[0,1,0],[0,0,1],[20,.12,12]);
  /* a long low diner, chrome-banded */
  const d={x0:x-11,x1:x+11,y0:y-14,y1:y-6,h:4};
  C.mat(5,3,Math.floor(R()*255),3<<4).col(200,190,170,200);
  for(const [a,b,n] of [[[d.x0,d.y0],[d.x1,d.y0],[0,0,1]],[[d.x1,d.y1],[d.x0,d.y1],[0,0,-1]],[[d.x1,d.y0],[d.x1,d.y1],[1,0,0]],[[d.x0,d.y1],[d.x0,d.y0],[-1,0,0]]]){
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);B.quadP(W(a[0],a[1],h),W(b[0],b[1],h),W(b[0],b[1],h+d.h),W(a[0],a[1],h+d.h),[[0,0],[L,0],[L,d.h],[0,d.h]],n);}
  C.mat(6).col(255,0,0,255);B.quadP(W(d.x0,d.y0,h+d.h),W(d.x1,d.y0,h+d.h),W(d.x1,d.y1,h+d.h),W(d.x0,d.y1,h+d.h),[[0,0],[1,0],[1,1],[0,1]],[0,1,0]);
  C.mat(14).col(200,200,205);B.box(W(x,d.y1+.05,h+3.2),[1,0,0],[0,1,0],[0,0,1],[11,.12,.06]);
  colliders.push({x0:d.x0,x1:d.x1,z0:-d.y1,z1:-d.y0,top:h+d.h});
  neonWord(C,'DINER',W(x-4.2,d.y1+.2,h+4.6),[1,0,0],[0,1,0],.28,[1,.2,.55]);
  neonWord(C,'EAT',W(x+6,d.y1+.2,h+2.2),[1,0,0],[0,1,0],.16,[.3,1,.5]);
  for(const sx of [-8,0,8]){C.mat(7,90,0,1).col(255,190,120);B.box(W(x+sx,y,h+6),[1,0,0],[0,1,0],[0,0,1],[.3,.03,.18]);C.mat(8,140,230).col(58,60,64);B.tube(W(x+sx,y,h),W(x+sx,y,h+6),.08,5,false);
    lights.push({type:1,pos:[x+sx,h+5.7,-y],r:20,col:[230,128,52],dir:[0,-1,0],cosO:Math.cos(1.2),cosI:Math.cos(.6),src:.2,axis:[0,0,0],flick:0});
    colliders.push({t:'c',x:x+sx,z:-y,r:.15,top:h+6});}
}

/* ---------- the physics' view of the desert ---------- */
/* the ground height on the grid, on the same two triangles per cell the mesh draws */
export function gridHeight(G,x,y){
  const fx=(x+TR.HALF)/TR.CELL,fy=(y+TR.HALF)/TR.CELL;const i=clamp(Math.floor(fx),0,NC-1),j=clamp(Math.floor(fy),0,NC-1),u=clamp(fx-i,0,1),v=clamp(fy-j,0,1);
  const H=G.H,a=H[j*NV+i],b=H[j*NV+i+1],c=H[(j+1)*NV+i+1],d=H[(j+1)*NV+i];
  /* triangles (a,c,b) below the diagonal and (a,d,c) above it */
  return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
}
export function groundHeight(G,x,y){const g=gridHeight(G,x,y);let h=g;for(const m of MOUNDS)if(Math.abs(x-m.x)<m.rad&&Math.abs(y-m.y)<m.rad)h=Math.max(h,g+moundH(m,x,y));return h;}
/* everything the car can stand on in the desert: the road it's on (exact profile), a jump, the rock
   mounds, else the grid; and what it's made of */
export function desertGround(G,x,y,out,tmp,noJumps){
  let h=gridHeight(G,x,y),surf='dirt',road=null;
  for(const q of G.index.near(x,y,tmp))if(Math.abs(q.d)<q.road.hw+.4){if(!road||q.road.kind==='asphalt'){road=q;}}
  if(road){h=road.h;surf={asphalt:'asphalt',gravel:'gravel',dirt:'dirt',trail:'trail'}[road.road.kind];}
  if(!noJumps)for(const J of G.jumps){const dx=x-J.ox,dy=y-J.oy,u=dx*J.dx+dy*J.dy,v=-dx*J.dy+dy*J.dx;if(u>0&&u<J.L&&Math.abs(v)<J.hw){const p=jumpProfile(J,u,v);if(p>0){h+=p;surf='dirt';}}}
  for(const m of MOUNDS){if(Math.abs(x-m.x)>=m.rad||Math.abs(y-m.y)>=m.rad)continue;const k=moundH(m,x,y);if(k>0){h=Math.max(h,gridHeight(G,x,y)+k);surf='rock';}}
  if(!road&&surf==='dirt'){
    const r=Math.hypot(x,y);if(r>TR.R1-80)surf='salt';
    else{const db=Math.hypot(x-BOG.x,y-BOG.y);if(db<BOG.r)surf='mud';
      else if(y<-500&&y>-1250&&Math.abs(y-washY(x))<WASH.w*1.2)surf='sand';}}
  out.y=h;out.surf=surf;return out;
}
