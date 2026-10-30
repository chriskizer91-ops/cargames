/* =====================================================================================
   CITY LIMITS — the whole world in one place: the town (clcity), the desert (terrain), the salt flats
   (flats). Gives the renderer one packed mesh, the lights and the places, and gives the physics
   (Dirt Sleeper's GroundWorld) the ground: groundAt(x, z, out) and the colliders.
   World axes: X east, Y up, Z south (map y = -Z).
   ===================================================================================== */
import {Chunked,rng} from '../render/mesh.js';
import {buildCityMap,baseGround,inTown,EDGE,RING,GRID,CORNER,EXIT_HW,ROADS} from './clmap.js';
import {buildTown} from './clcity.js';
import {buildDesert,desertGround,gridHeight,TR,BOG,MOUNDS,FIELD,jumpProfile} from './terrain.js';
import {FLATS,flatsHeight,rampsIn,rampHeight} from './flats.js';

const CELL=16;
class Colliders{
  constructor(list){this.list=list;this.cells=new Map();
    for(const c of list){const x0=c.t==='c'?c.x-c.r:c.x0,x1=c.t==='c'?c.x+c.r:c.x1,z0=c.t==='c'?c.z-c.r:c.z0,z1=c.t==='c'?c.z+c.r:c.z1;
      for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)for(let j=Math.floor(z0/CELL);j<=Math.floor(z1/CELL);j++){const k=i*100003+j;let a=this.cells.get(k);if(!a)this.cells.set(k,a=[]);a.push(c);}}
    this.empty=[];}
  near(x,z){return this.cells.get(Math.floor(x/CELL)*100003+Math.floor(z/CELL))||this.empty;}
}

export function buildWorld(){
  const t0=performance.now();
  const M=buildCityMap(),C=new Chunked(64),R=rng(9001),lights=[];
  /* lamp posts and signal masts are solid: catch where the kit puts them */
  const posts=[];
  const {K,info}=buildTown(M,C,R,lights);
  for(const L of lights)if(L.pos[1]>6&&L.pos[1]<11&&inTown(L.pos[0],-L.pos[2]))posts.push(L);
  const D=buildDesert();
  for(const [k,B] of D.C.tiles)C.tiles.set('d'+k,B);
  lights.push(...D.lights);
  const geo=C.pack();
  /* ---------- colliders: the buildings, the desert's rocks, poles and signs ---------- */
  const cols=[...D.colliders];
  for(const L of M.lots)cols.push({x0:L.x0,x1:L.x1,z0:-L.y1,z1:-L.y0,top:L.h});
  for(const n of M.nodes)for(const [sx,sy] of [[1,1],[-1,-1],[1,-1],[-1,1]]){const x=n.x+sx*(n.hx+.9),y=n.y+sy*(n.hy+.9);if(baseGround(M,x,y)>.1)cols.push({t:'c',x,z:-y,r:.16,top:6});}
  const colliders=new Colliders(cols);
  /* ---------- the ground, everywhere ---------- */
  const tmp=[];
  function heightAt(x,y,o){
    if(inTown(x,y)){o.y=baseGround(M,x,y);o.surf=o.y>.1?'concrete':'asphalt';return o;}
    if(Math.abs(x)<TR.HALF&&Math.abs(y)<TR.HALF)return desertGround(D,x,y,o,tmp);
    o.y=flatsHeight(x,y);o.surf='salt';return o;
  }
  const q1={y:0,surf:''},q2={y:0,surf:''},q3={y:0,surf:''};
  /* the ground at a world point: height, a unit normal, what it is */
  function groundAt(X,Z,out){
    const x=X,y=-Z;heightAt(x,y,q1);const e=.35;
    heightAt(x+e,y,q2);const hx=q2.y;heightAt(x,y+e,q3);const hy=q3.y;
    let gx=(hx-q1.y)/e,gy=(hy-q1.y)/e;
    /* a kerb is a step, not a slope: the physics finds its face with the tyre's edge catch */
    if(Math.abs(hx-q1.y)>.06)gx=0;if(Math.abs(hy-q1.y)>.06)gy=0;
    const l=Math.hypot(gx,1,gy);out.y=q1.y;out.n[0]=-gx/l;out.n[1]=1/l;out.n[2]=gy/l;
    let s=q1.surf;if(s==='dirt'&&out.n[1]<.84)s='rock';out.surf=s;
    return out;
  }
  /* ---------- the minimap: every road as a polyline ---------- */
  const paths=[];
  for(const sg of M.segs){if(sg.axis==='arc'){const pts=[];for(let k=0;k<=12;k++){const a=sg.a0+(sg.a1-sg.a0)*k/12;pts.push([sg.cx+Math.cos(a)*sg.r,sg.cy+Math.sin(a)*sg.r]);}paths.push({pts,w:sg.cls==='ring'?2:1,kind:'town'});}
    else paths.push({pts:[[sg.x0,sg.y0],[sg.x1,sg.y1]],w:sg.cls==='street'?1:2,kind:'town'});}
  for(const r of D.roads){const pts=[];for(let i=0;i<r.N;i+=6)pts.push([r.x[i],r.y[i]]);if(r.closed)pts.push(pts[0]);else pts.push([r.x[r.N-1],r.y[r.N-1]]);paths.push({pts,w:r.kind==='asphalt'?2:1,kind:r.kind,closed:!!r.closed});}
  /* ---------- places, for Go to and the place name on the HUD ---------- */
  const roadAt=(id,f)=>{const r=D.roads.find(q=>q.id===id),i=Math.floor(r.N*f)%r.N;return {x:r.x[i],y:r.y[i],yaw:Math.atan2(r.dy[i],r.dx[i])};};
  const PLACES=[
    {id:'downtown',name:'Downtown',x:3.6,y:-60,yaw:Math.PI/2},
    {id:'neon',name:'Neon Row',x:-180,y:-116.4,yaw:0},
    {id:'ring',name:'Limits Boulevard',x:-120,y:-353,yaw:0},
    {id:'gas',name:'The gas station',x:452,y:-3.2,yaw:0},
    {id:'saltE',name:'Salt Road east',...roadAt('saltE',.18)},
    {id:'saltW',name:'Salt Road west',...roadAt('saltW',.18)},
    {id:'ridge',name:'Ridge Road',...roadAt('ridge',.08)},
    {id:'summit',name:'The summit',...roadAt('ridge',.66)},
    {id:'wash',name:'Wash Road',...roadAt('wash',.08)},
    {id:'bog',name:'The mud bog',x:BOG.x+48,y:BOG.y,yaw:Math.PI},
    {id:'rim',name:'Rim Trail',...roadAt('loop',.0)},
    {id:'rocks',name:'Boulder field',x:FIELD.x+40,y:FIELD.y+70,yaw:-2.2},
    {id:'flats',name:'The salt flats',x:TR.R1+120,y:-2.2,yaw:0},
    {id:'deep',name:'Deep on the salt',x:6000,y:-2.2,yaw:0}
  ];
  /* the name of where you are */
  function placeName(x,y){
    if(inTown(x,y)){
      if(Math.abs(Math.abs(x)-RING)<ROADS.ring.hw+2||Math.abs(Math.abs(y)-RING)<ROADS.ring.hw+2)return 'LIMITS BOULEVARD';
      for(const g of GRID){if(Math.abs(y-g)<10)return (M.names.y[String(g)]||'').toUpperCase();if(Math.abs(x-g)<10)return (M.names.x[String(g)]||'').toUpperCase();}
      const dz=M.district(x,y);return {downtown:'DOWNTOWN',neon:'NEON ROW',residential:'THE HEIGHTS',industrial:'THE YARDS',park:'COPPER PARK',mixed:'CITY LIMITS'}[dz]||'CITY LIMITS';}
    const r=Math.hypot(x,y);if(r>TR.R1-40)return 'THE SALT FLATS';
    for(const q of D.index.near(x,y,tmp))if(Math.abs(q.d)<q.road.hw+3)return q.road.name;
    if(Math.hypot(x-BOG.x,y-BOG.y)<BOG.r+10)return 'THE MUD BOG';
    if(Math.hypot(x-FIELD.x,y-FIELD.y)<90)return 'BOULDER FIELD';
    if(y>500)return 'THE HILLS';if(y<-560)return 'THE WASH';
    return 'THE DESERT';
  }
  const ms=performance.now()-t0;
  return {M,D,geo,lights,info:Object.assign(info,{lightGrid:{x0:-560,z0:-560,size:1120}}),colliders,groundAt,heightAt,paths,PLACES,placeName,ms,
    stats:{tris:geo.ni/3,verts:geo.nv,lights:lights.length,colliders:cols.length,tiles:geo.ranges.length}};
}
