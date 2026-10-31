/* =====================================================================================
   THE WORLD'S GENERATOR (City & Country). Back Forty's generator turned round a town: City Limits' town in
   the middle at its own size (the boulevard that rings it, the grid of streets across it, its districts),
   Highway 40 straight through the middle of town east and west and out across the country until it just
   ends on the salt, a mile-square grid of country roads round the town (Ridge Road up into the hills to
   the north, Wash Road down to the south), farms, creeks, woods and hills, and past all of that the salt
   flats, flat and endless, with City Limits' ramps scattered over them. A patch of country west of town,
   north of the highway, is kept clear and level for the off-road park.
   Everything about the land is still a function of where you are, so nothing is stored for the whole map:
   the game asks for 128 m chunks round the car and lets them go behind it. This one function refers to
   nothing outside itself, so the same text runs in a background worker (it is sent there as a string)
   and on the main thread (for the physics' fallback, the road queries and the maps). Same code, same numbers.
   x runs east, z south, in metres; downtown is at the origin.
   ===================================================================================== */
function WORLDGEN(SEED){
'use strict';
SEED=SEED|0;
const L=1609.344,MILES=20,HALF=MILES*L,CH=128,ROAD_END=HALF-1000,RIM0=HALF-760,RIM1=HALF-60;
const MAT={COL:0,EMIT:15,METAL:16,TERRAIN:40,ROCK:41,STRIP:42,TRAIL:43,MUDTRACK:44,CLAY:56,CONCRETE:45,WOOD:46,SHEET:47,LEAF:48,HAY:49,WATER:50,GRAVEL:53,ROAD:58,FACADE:60,SIGNAL:61};
const SURF=['grass','dirt','strip','trail','rock','mud','concrete','water','gravel','asphalt','ruts'];
const SF={};SURF.forEach((n,i)=>SF[n]=i);
const sst=(a,b,x)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
const s2l=v=>Math.pow(v/255,2.2);
const lc=(r,g,b)=>[s2l(r),s2l(g),s2l(b)];

/* ---------- hashing and noise ---------- */
function hs(ix,iz,s){let h=Math.imul(ix|0,0x27d4eb2d)^Math.imul(iz|0,0x165667b1)^Math.imul((s+SEED)|0,0x9e3779b1);
  h=Math.imul(h^(h>>>15),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;}
function vn(x,z,s){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz);
  const a=hs(ix,iz,s),b=hs(ix+1,iz,s),c=hs(ix,iz+1,s),d=hs(ix+1,iz+1,s);return a+(b-a)*ux+(c-a)*uz+(a-b-c+d)*ux*uz;}
/* fractal noise, normalised to 0..1 */
function fbm(x,z,o,s){let t=0,a=.5,n=0;for(let i=0;i<o;i++){t+=a*vn(x,z,s+i*101);n+=a;x=x*2.03+17.3;z=z*2.03-9.1;a*=.5;}return t/n;}
function vn1(t,s){const i=Math.floor(t),f=t-i,u=f*f*(3-2*f),a=hs(i,7,s),b=hs(i+1,7,s);return a+(b-a)*u;}
/* a small seeded generator for placing things */
function rng(seed){let s=(seed>>>0)||1;return ()=>(s^=s<<13,s>>>=0,s^=s>>>17,s^=s<<5,s>>>=0,s/4294967296);}

/* ---------- the plan of the map ---------- */
/* the town: City Limits' grid (a line every 120 m) inside its boulevard, at the same size */
const GRID=[-360,-240,-120,0,120,240,360],RING=360,CORNER=120,EDGE=RING+20;
/* the land ends about two miles out (a rounded square, its edge wandering a little); then the salt */
const LAND=3100,SALT_BL=260,SALT_Y=-1.2;
/* the off-road park's ground, west of town and north of the highway (kept clear and level) */
const PARK={x0:-2900,z0:-1500,x1:-1700,z1:-260};
/* the mud bog south of town (where City Limits had it) */
const BOG={x:-150,z:590,r:34};
const townD=(x,z)=>Math.max(Math.abs(x),Math.abs(z));
function saltD(x,z){const a=x*x*x*x+z*z*z*z;return Math.sqrt(Math.sqrt(a))+(vn(x/900+4.4,z/900-2.2,171)-.5)*170;}
const parkD=(x,z)=>Math.hypot(Math.max(PARK.x0-x,0,x-PARK.x1),Math.max(PARK.z0-z,0,z-PARK.z1));
/* how hilly: hills to the north of town, rolling ground here and there, gentle round town, flattening to the salt */
function hillK(x,z,td,sd){
  if(td===undefined)td=townD(x,z);if(td<EDGE+80)return 0;
  if(sd===undefined)sd=saltD(x,z);if(sd>LAND-80)return 0;
  let k=sst(-450,-1900,z)*(.5+.65*fbm(x/1800+7.3,z/1800-3.1,2,11));
  k+=.32*sst(.58,.72,fbm(x/2600+1.1,z/2600+8.4,2,13));
  k*=sst(EDGE+80,EDGE+700,td);
  k*=1-sst(LAND-700,LAND-80,sd);
  return k>1?1:k<0?0:k;
}
const rimAt=(x,z)=>150*sst(RIM0,RIM1,Math.max(Math.abs(x),Math.abs(z)));

/* ---------- the country roads: a grid of section lines a mile apart, as functions ----------
   North-south line i runs at x = i*L + offNS(i, z); east-west line j at z = j*L + offEW(j, x), for i, j in
   -1..1. Line j = 0 is Highway 40, dead straight from salt to salt (the town draws its stretch through the
   middle). Line i = 0 leaves town north as Ridge Road (gravel, winding into the hills) and south as Wash
   Road (dirt). The others are blacktop, gravel or dirt a stretch at a time, and they all end at the salt. */
function offNS(i,z){
  if(i<-1||i>1)return 0;
  const k=hillK(i*L,z);
  let o=(10+210*k*k)*((vn1(z/1700+i*7.31,310+i*13)-.5)*1.4+(vn1(z/640+i*3.1,320+i*17)-.5)*.6);
  if(i===0)o*=sst(EDGE+20,EDGE+520,Math.abs(z));
  return o;
}
function offEW(j,x){
  if(j===0||j<-1||j>1)return 0;
  const k=hillK(x,j*L);
  return (10+210*k*k)*((vn1(x/1700+j*5.13,330+j*13)-.5)*1.4+(vn1(x/640+j*2.7,340+j*17)-.5)*.6);
}
const zCross=(i,j)=>{const x=i*L+offNS(i,j*L);return j*L+offEW(j,x);};
const xCross=(i,j)=>{const z=j*L+offEW(j,i*L);return i*L+offNS(i,z);};
function segNS(i,z){const j0=Math.floor(z/L);if(z<zCross(i,j0))return j0-1;if(z>=zCross(i,j0+1))return j0+1;return j0;}
function segEW(j,x){const i0=Math.floor(x/L);if(x<xCross(i0,j))return i0-1;if(x>=xCross(i0+1,j))return i0+1;return i0;}
/* 0 none, 1 dirt two-track, 2 gravel, 3 blacktop, 6 Highway 40 */
function clsNS(i,seg){
  if(i<-1||i>1)return 0;
  if(i===0)return seg<0?2:1;
  const k=hillK(i*L,(seg+.5)*L);
  return hs(i,seg,402)<.42-.2*k?3:hs(i,seg,403)<.55+.25*k?2:1;
}
function clsEW(j,seg){
  if(j<-1||j>1)return 0;
  if(j===0)return 6;
  const k=hillK((seg+.5)*L,j*L);
  return hs(seg,j,404)<.42-.2*k?3:hs(seg,j,405)<.55+.25*k?2:1;
}
/* where the highway stops: a little way out onto the salt */
const HWY_SALT=LAND+SALT_BL+160;
const clsNSz=(i,z)=>{if(i<-1||i>1)return 0;const x=i*L+offNS(i,z);if(townD(x,z)<EDGE-.5||saltD(x,z)>LAND+30)return 0;return clsNS(i,segNS(i,z));};
const clsEWx=(j,x)=>{if(j<-1||j>1)return 0;const z=j*L+offEW(j,x);if(townD(x,z)<EDGE-.5)return 0;if(saltD(x,z)>(j===0?HWY_SALT:LAND+30))return 0;return clsEW(j,segEW(j,x));};
/* each class: half width of the running surface, a shoulder, a ditch (depth, width), and how far the land
   is graded to it */
const CL=[null,
  {hw:2.4,draw:3.3,sh:0,ditch:0,dw:2,blend:10,name:'Dirt road'},
  {hw:3.8,draw:4.8,sh:0,ditch:.45,dw:4.5,blend:16,name:'Gravel road'},
  {hw:3.9,draw:3.9,sh:1.1,ditch:.7,dw:6,blend:20,name:'Blacktop'},
  null,null,
  {hw:12.6,draw:12.6,sh:1.6,ditch:1.1,dw:9,blend:44,name:'Highway 40'}];
const SPUR={hw:2.6,draw:3.4,sh:0,ditch:0,dw:2,blend:9,name:'Driveway'},PROAD={hw:3.9,draw:3.9,sh:1,ditch:.4,dw:4,blend:12,name:'Park Road'};
const LINE_NAME=(ns,i,z)=>ns?(i===0?(z<0?'Ridge Road':'Wash Road'):i<0?'West Line Road':'East Line Road'):(i===0?'Highway 40':i<0?'North Line Road':'South Line Road');

/* ---------- the town (City Limits' plan, made once) ----------
   Streets by class: Highway 40 through the middle east and west, Central Avenue north and south, the
   avenues at 240 m, streets between, the boulevard round it all with rounded corners. Each has a half
   width, a sidewalk, and the class the road shader paints it as (58: 6 highway, 7 boulevard, 8 Central,
   9 avenue, 10 street, 11 an intersection). */
const TCLS={hwy:{hw:12.6,cls:6,side:4.5},ring:{hw:14,cls:7,side:5},main:{hw:8,cls:8,side:5},ave:{hw:7,cls:9,side:4.5},street:{hw:5.5,cls:10,side:4}};
const zKind=g=>Math.abs(g)===RING?'ring':g===0?'hwy':Math.abs(g)===240?'ave':'street';
const xKind=g=>Math.abs(g)===RING?'ring':g===0?'main':Math.abs(g)===240?'ave':'street';
const hwZ=g=>TCLS[zKind(g)].hw,hwX=g=>TCLS[xKind(g)].hw;
const S_IN=RING-CORNER;
/* City Limits' districts (its map had y north; here z is south) */
function district(cx,cz){const cy=-cz;
  return cx>120&&cx<240&&cy>120&&cy<240?'park':Math.abs(cx)<120&&Math.abs(cy)<120?'downtown':cx<0&&cy<0&&cy>-240?'neon':cx>120&&cy<-120?'industrial':cx<-120&&cy>120?'residential':'mixed';}
const STREET_X={'-360':'West Limits','-240':'Mesa Street','-120':'Cactus Street','0':'Central Avenue','120':'Copper Street','240':'Mission Avenue','360':'East Limits'};
const STREET_Z={'-360':'North Limits','-240':'Sunset Avenue','-120':'Silver Street','0':'Highway 40','120':'Neon Row','240':'Ocotillo Street','360':'South Limits'};
/* the player's garage: Marisol's, on the block south-east of Central and the highway, its door onto Neon Row */
const GARAGE={x0:40,z0:82,x1:76,z1:108,h:6.2,door:[50,66,5.4]};
const NEON=[[1,.18,.55],[.2,.85,1],[.65,.3,1],[1,.25,.15],[1,.6,.12],[.35,1,.45],[1,.9,.3],[.95,.4,1]];
const WORDS=['NOODLES','HOTEL','BAR','RAMEN','MOTEL','24H','ARCADE','KARAOKE','DINER','TATTOO','LIQUOR','PARTS','GARAGE','OPEN','PIZZA','SUSHI','CLUB','DANCE','CAFE','RECORDS',
  'PAWN','LAUNDRY','PHARMACY','CINEMA','BOWLING','SHIFT','TURBO','NITRO','DRIFT','REDLINE','ROOMS','VACANCY','BEER','COFFEE','DONUTS','CASINO','POOL','JAZZ','VIDEO','TAXI','TACOS','GYM','SALON','TOYS','HOSTEL','NEON'];
/* the 5 x 7 font for the neon (City Limits' and the HUD's) */
const F5={};`A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|& 01100 10010 10100 01000 10101 10010 01101|- 00000 00000 00000 11111 00000 00000 00000`
  .split('|').forEach(l=>{const p=l.trim().split(/\s+/);F5[p[0]]=p.slice(1).map(r=>parseInt(r,2));});
/* facade styles (the road shader's 60): brick, concrete ribbon, glass, stucco, corrugated; their tints */
const TINTS={0:[[150,68,48],[120,58,44],[165,92,62],[96,52,44]],1:[[150,148,140],[120,120,118],[170,160,140]],2:[[60,90,110],[40,70,80],[90,110,120]],
  3:[[190,170,130],[150,165,170],[200,150,120],[120,150,130],[170,120,130],[210,200,180]],4:[[90,95,100],[110,80,60],[70,90,80]]};
const TW=(()=>{
  const R=rng(1906),T={roads:[],jn:[],walks:[],arcs:[],bld:[],lamps:[],sigs:[],palms:[],signs:[],spill:[],parks:[],lots:[]};
  /* the intersections */
  const nodes=new Map(),key=(x,z)=>x+','+z;
  for(const x of GRID)for(const z of GRID){
    if(Math.abs(x)===RING&&Math.abs(z)===RING||Math.abs(x)===RING&&Math.abs(z)>S_IN||Math.abs(z)===RING&&Math.abs(x)>S_IN)continue;
    nodes.set(key(x,z),{x,z,hx:hwX(x),hz:hwZ(z)});}
  for(const n of nodes.values()){T.jn.push(n);
    /* signals where something bigger than two streets meet */
    const big=[xKind(n.x),zKind(n.z)].filter(k=>k!=='street').length;n.sig=big>=1&&!(Math.abs(n.x)===RING&&Math.abs(n.z)===RING);n.ph=hs(n.x,n.z,77);}
  /* straight pieces between the intersections: along each north-south line, then each east-west one */
  for(const x of GRID){const col=GRID.map(z=>nodes.get(key(x,z))).filter(Boolean);
    for(let k=0;k<col.length-1;k++){const a=col[k],b=col[k+1];T.roads.push({ax:'z',line:x,a:a.z+a.hz,b:b.z-b.hz,kind:xKind(x)});}}
  for(const z of GRID){const row=GRID.map(x=>nodes.get(key(x,z))).filter(Boolean);
    for(let k=0;k<row.length-1;k++){const a=row[k],b=row[k+1];T.roads.push({ax:'x',line:z,a:a.x+a.hx,b:b.x-b.hx,kind:zKind(z)});}}
  /* the ways out of town: the highway east and west, Central north and south, to the edge of town */
  for(const s of [-1,1]){T.roads.push({ax:'x',line:0,a:s<0?-EDGE:RING+TCLS.ring.hw,b:s<0?-RING-TCLS.ring.hw:EDGE,kind:'hwy',exit:1});
    T.roads.push({ax:'z',line:0,a:s<0?-EDGE:RING+TCLS.ring.hw,b:s<0?-RING-TCLS.ring.hw:EDGE,kind:'main',exit:1});}
  /* the boulevard's four corners */
  for(const [sx,sz] of [[1,1],[1,-1],[-1,-1],[-1,1]]){const a0=Math.atan2(sz,0),a1=Math.atan2(0,sx);
    T.arcs.push({cx:sx*S_IN,cz:sz*S_IN,r:CORNER,a0,a1,sx,sz});}
  /* the blocks between the streets: a sidewalk round each, then lots of buildings by district */
  const RES=[[GARAGE.x0-4,GARAGE.z0-4,GARAGE.x1+4,GARAGE.z1+6]];
  const STY={downtown:()=>R()<.6?2:R()<.6?1:0,neon:()=>R()<.45?3:R()<.6?0:1,residential:()=>R()<.6?0:3,industrial:()=>R()<.75?4:1,mixed:()=>[0,1,3,3,2][Math.floor(R()*5)]};
  const HGT={downtown:()=>R()<.4?48+R()*70:20+R()*26,neon:()=>9+R()*13,residential:()=>9+R()*9,industrial:()=>8+R()*6,mixed:()=>10+Math.pow(R(),1.5)*22};
  for(let i=0;i<GRID.length-1;i++)for(let j=0;j<GRID.length-1;j++){
    const xa=GRID[i],xb=GRID[i+1],za=GRID[j],zb=GRID[j+1];
    const b={x0:xa+hwX(xa),x1:xb-hwX(xb),z0:za+hwZ(za),z1:zb-hwZ(zb),sw:{w:TCLS[xKind(xa)].side,e:TCLS[xKind(xb)].side,n:TCLS[zKind(za)].side,s:TCLS[zKind(zb)].side}};
    b.cx=(b.x0+b.x1)/2;b.cz=(b.z0+b.z1)/2;b.district=district(b.cx,b.cz);b.corner=Math.abs(b.cx)>S_IN&&Math.abs(b.cz)>S_IN;
    T.walks.push(b);
    if(b.district==='park'){T.parks.push(b);continue;}
    const zx0=b.x0+b.sw.w,zx1=b.x1-b.sw.e,zz0=b.z0+b.sw.n,zz1=b.z1-b.sw.s,dz=b.district;
    const wMin=dz==='downtown'?20:dz==='industrial'?28:dz==='neon'?9:12,wMax=dz==='downtown'?44:dz==='industrial'?52:dz==='neon'?16:26;
    const rows=zz1-zz0>40?2:1,cols=[];let x=zx0;
    while(x<zx1-6){let w=wMin+R()*(wMax-wMin);if(zx1-(x+w)<wMin*.7)w=zx1-x;cols.push([x,Math.min(zx1,x+w)]);x+=w;}
    cols.forEach(([cx0,cx1],ci)=>{for(let r=0;r<rows;r++){
      const depth=rows===1?zz1-zz0:Math.min((zz1-zz0)/2,dz==='downtown'?(zz1-zz0)/2:14+R()*14);
      const lz0=rows===1||r===0?zz0:zz1-depth,lz1=rows===1?zz1:r===0?zz0+depth:zz1,gap=R()<.25?1.5:0;
      const lx0=cx0+(ci>0?gap/2:0),lx1=cx1-(ci<cols.length-1?gap/2:0);
      if(b.corner){const far=Math.hypot(Math.max(Math.abs(lx0),Math.abs(lx1))-S_IN,Math.max(Math.abs(lz0),Math.abs(lz1))-S_IN);
        if((Math.abs(lx0)>S_IN||Math.abs(lx1)>S_IN)&&(Math.abs(lz0)>S_IN||Math.abs(lz1)>S_IN)&&far>CORNER-TCLS.ring.hw-TCLS.ring.side-1)continue;}
      const h=HGT[dz](),style=STY[dz](),seed=R(),tower=dz==='downtown'&&h>46&&lx1-lx0>22&&lz1-lz0>22;
      const street={n:rows===1||r===0,s:rows===1||r===1,w:ci===0,e:ci===cols.length-1};
      const pod=tower?{p:10+R()*8,i:3+R()*3}:null,tint=TINTS[style][Math.floor(R()*TINTS[style].length)];
      if(RES.some(q=>lx0<q[2]&&lx1>q[0]&&lz0<q[3]&&lz1>q[1]))continue;
      T.lots.push({x0:lx0,z0:lz0,x1:lx1,z1:lz1,h,style,seed,tower:pod,tint,street,district:dz,shops:dz==='downtown'||dz==='neon'||dz==='mixed'});}});
  }
  /* lamps along both sides of every straight piece, staggered; on the boulevard, twin arms on its median */
  for(const s of T.roads){const c=TCLS[s.kind],L0=Math.min(s.a,s.b),L1=Math.max(s.a,s.b);
    if(s.kind==='ring'){for(let a=L0+20;a<L1-12;a+=44)T.lamps.push({t:'twin',x:s.ax==='x'?a:s.line,z:s.ax==='x'?s.line:a,ax:s.ax});continue;}
    for(const side of [1,-1])for(let a=L0+14+(side>0?0:18);a<L1-8;a+=36){
      const off=c.hw+.7,x=s.ax==='x'?a:s.line+side*off,z=s.ax==='x'?s.line+side*off:a,dir=s.ax==='x'?[0,-side]:[-side,0];
      T.lamps.push({t:'arm',x,z,dir,arm:s.kind==='street'?1.8:2.6,h:s.kind==='street'?7:8.5,led:district(x,z)==='downtown'||s.kind==='hwy'});}
    /* palms along the bigger streets' sidewalks */
    if(s.kind==='main'||s.kind==='ave'||s.kind==='hwy')for(const side of [1,-1])for(let a=L0+8+(side>0?6:0);a<L1-8;a+=14){
      const off=c.hw+c.side-1.2,x=s.ax==='x'?a:s.line+side*off,z=s.ax==='x'?s.line+side*off:a;if(R()<.85)T.palms.push([x,z,R()<.5?5:6,.85+R()*.35]);}}
  /* the boulevard's corners: twin lamps round the arcs */
  for(const A of T.arcs){for(let k=1;k<4;k++){const t=A.a0+(A.a1-A.a0)*k/4;T.lamps.push({t:'twin',x:A.cx+Math.cos(t)*A.r,z:A.cz+Math.sin(t)*A.r,ang:t});}}
  /* the highway lit a way out of town each side, then dark */
  for(const s of [-1,1])for(let x=EDGE+30;x<760;x+=40)for(const side of [1,-1])T.lamps.push({t:'arm',x:s*x+(side>0?0:20)*s,z:side*(TCLS.hwy.hw+2.4),dir:[0,-side],arm:2.8,h:9.5,led:true,hwyOut:1});
  /* Copper Park: lamps round a path */
  for(const p of T.parks){const cx=(p.x0+p.x1)/2,cz=(p.z0+p.z1)/2;for(let k=0;k<8;k++){const a=k/8*Math.PI*2;T.lamps.push({t:'post',x:cx+Math.cos(a)*(p.x1-p.x0)*.32,z:cz+Math.sin(a)*(p.z1-p.z0)*.32});}
    for(let k=0;k<26;k++){const x=p.x0+p.sw.w+3+R()*(p.x1-p.x0-p.sw.w-p.sw.e-6),z=p.z0+p.sw.n+3+R()*(p.z1-p.z0-p.sw.n-p.sw.s-6);
      if(Math.abs(Math.hypot((x-cx)/((p.x1-p.x0)*.32),(z-cz)/((p.z1-p.z0)*.32))-1)<.12)continue;T.palms.push([x,z,R()<.7?(R()*3|0):5,.9+R()*.4]);}}
  /* the signals: a mast at each corner of a junction, an arm over each road */
  for(const n of T.jn){if(!n.sig)continue;
    for(const [sx,sz] of [[1,1],[1,-1],[-1,-1],[-1,1]]){
      const px=n.x+sx*(n.hx+.9),pz=n.z+sz*(n.hz+.9);if(Math.abs(px)>RING+14||Math.abs(pz)>RING+14)continue;
      T.sigs.push({x:px,z:pz,ax:-sx*Math.min(9,n.hx*1.45),az:-sz*Math.min(9,n.hz*1.45),ph:n.ph});}}
  /* neon on the street faces: a word on a board, a blade sign, or a strip of light */
  const SIGNS={neon:.75,downtown:.24,mixed:.3,residential:.12,industrial:.05};
  for(const q of T.lots){const dens=SIGNS[q.district]||.2;
    /* each street face from the left end to the right end as someone facing it sees it */
    const faces=[];if(q.street.n)faces.push([q.x1,q.z0,q.x0,q.z0,0,-1]);if(q.street.s)faces.push([q.x0,q.z1,q.x1,q.z1,0,1]);
    if(q.street.w)faces.push([q.x0,q.z0,q.x0,q.z1,-1,0]);if(q.street.e)faces.push([q.x1,q.z1,q.x1,q.z0,1,0]);
    for(const f of faces){const [ax,az,bx,bz,nx,nz]=f,Wd=Math.hypot(bx-ax,bz-az),rt=[(bx-ax)/Wd,(bz-az)/Wd];
      if(q.shops)for(let u=4;u<Wd-2;u+=16){const hs2=R();T.spill.push({x:ax+rt[0]*u+nx*1.4,z:az+rt[1]*u+nz*1.4,c:hs2<.55?[1,.7,.42]:hs2<.85?[.8,.9,1]:[1,.55,.8]});}
      if(Wd<7||R()>dens)continue;const r=R(),col=NEON[Math.floor(R()*NEON.length)];
      if(r<.6){const word=WORDS[Math.floor(R()*WORDS.length)],px=.13+R()*.05,len=word.length*6*px-px;if(len>Wd-1.5)continue;
        const u0=1+R()*(Wd-1.5-len),h0=5.15+R()*.6;T.signs.push({t:'word',word,px,len,o:[ax+rt[0]*u0,az+rt[1]*u0],rt,n:[nx,nz],h0,col});}
      else if(r<.9){const word=WORDS[Math.floor(R()*WORDS.length)].slice(0,7),u0=R()<.5?1.2:Wd-1.2;
        T.signs.push({t:'blade',word,o:[ax+rt[0]*u0,az+rt[1]*u0],rt,n:[nx,nz],h0:7+R()*3,col});}
      else T.signs.push({t:'strip',a:[ax+rt[0]*.6,az+rt[1]*.6],b:[bx-rt[0]*.6,bz-rt[1]*.6],n:[nx,nz],col});}}
  return T;
})();
/* every light in town and at the places by the highway, made once: the game builds its light grid from these
   (the chunks don't carry them) */
const lampLight=(l,out)=>{const y=0;
  if(l.t==='arm'){const top=y+l.h,hx=l.x+l.dir[0]*l.arm,hz=l.z+l.dir[1]*l.arm;out.push({p:[hx,top-.3,hz],r:24+l.h*.6,c:l.led?[2.3,2.5,2.9]:[3.4,2.0,.9],d:[0,-1,0],cs:Math.cos(1.2)});}
  else if(l.t==='twin'){const top=y+9,ax=l.ax==='z'?[1,0]:l.ax==='x'?[0,1]:[Math.cos(l.ang),Math.sin(l.ang)];
    for(const sd of [1,-1])out.push({p:[l.x+ax[0]*sd*4.2,top+.3,l.z+ax[1]*sd*4.2],r:30,c:[2.2,2.4,2.8],d:[0,-1,0],cs:Math.cos(1.2)});}
  else out.push({p:[l.x,y+4.5,l.z],r:13,c:[2.2,1.7,1.1]});};
function signLight(g,out){
  if(g.t==='word'){const px=g.px,len=g.len;out.push({p:[g.o[0]+g.n[0]*1.2+g.rt[0]*len/2,g.h0+3.5*px,g.o[1]+g.n[1]*1.2+g.rt[1]*len/2],r:11,c:g.col.map(v=>v*2.2)});}
  else if(g.t==='blade'){const len=g.word.length*1.35,c0=[g.o[0]+g.n[0]*1.25,g.o[1]+g.n[1]*1.25];out.push({p:[c0[0]+g.n[0],g.h0+len/2,c0[1]+g.n[1]],r:13,c:g.col.map(v=>v*2.4)});}
  else out.push({p:[(g.a[0]+g.b[0])/2+g.n[0]*.5,4.4,(g.a[1]+g.b[1])/2+g.n[1]*.5],r:9,c:g.col.map(v=>v*1.5)});}
let TOWN_LIGHTS=null;
function townLights(){
  if(TOWN_LIGHTS)return TOWN_LIGHTS;const out=[];
  for(const l of TW.lamps)lampLight(l,out);for(const g of TW.signs)signLight(g,out);
  for(const s of TW.spill)out.push({p:[s.x,2.4,s.z],r:6,c:s.c.map(v=>v*.32)});
  for(const P of SPECIAL)for(const b of P.bld)building(b,null,()=>{},()=>{},out,true);
  for(const f of parkLights())out.push(f);
  return TOWN_LIGHTS=out;}
/* what's at a point in town: how far past the nearest road's edge (negative on the road) and its sidewalk's width */
const TQ={e:0,side:0,kind:''};
function townQ(x,z,o){
  let e=1e9,side=0,kind='';const ax=Math.abs(x),az=Math.abs(z);
  if(ax>S_IN&&az>S_IN){const d=Math.abs(Math.hypot(ax-S_IN,az-S_IN)-CORNER)-14;if(d<e){e=d;side=5;kind='ring';}}
  else{if(az<=S_IN){const d=Math.abs(ax-RING)-14;if(d<e){e=d;side=5;kind='ring';}}if(ax<=S_IN){const d=Math.abs(az-RING)-14;if(d<e){e=d;side=5;kind='ring';}}}
  for(const g of GRID){if(g===RING||g===-RING)continue;
    if(az<=RING||g===0&&az<=EDGE+2){const k=xKind(g),d=Math.abs(x-g)-TCLS[k].hw;if(d<e){e=d;side=TCLS[k].side;kind=k;}}
    if(ax<=RING||g===0&&ax<=EDGE+2){const k=zKind(g),d=Math.abs(z-g)-TCLS[k].hw;if(d<e){e=d;side=TCLS[k].side;kind=k;}}}
  o.e=e;o.side=side;o.kind=kind;return o;
}

/* ---------- the places: farms, the gas station, the diner, the garage (made once, kept) ---------- */
const PLAN=new Map();
function plan(key,fn){let p=PLAN.get(key);if(p===undefined){p=fn();PLAN.set(key,p);if(PLAN.size>6000)PLAN.delete(PLAN.keys().next().value);}return p;}
/* buildings are described, then meshed and given colliders by whichever chunk they fall in */
const SPECIAL=[
  /* Deke's gas station, east on the highway just out of town */
  {pads:[{x0:444,z0:-66,x1:500,z1:-16,surf:'concrete',bl:10}],spurs:[],
    bld:[{t:'canopy',b:[452,-48,488,-26],h:5.2},{t:'box',b:[458,-62,488,-52],h:4,roof:'flat',col:lc(196,186,160),mat:MAT.COL},{t:'sign',x:448,z:-19},
      {t:'lamp',x:496,z:-20,h:8},{t:'neon',word:'GAS',o:[462,-51.8],rt:[1,0],n:[0,1],px:.3,h0:4.6,col:[1,.25,.15]},{t:'neon',word:'OPEN 24H',o:[468,-51.8],rt:[1,0],n:[0,1],px:.13,h0:2.6,col:[.2,.85,1]}],
    trees:[],name:"Deke's Gas",x:470,z:-40,special:1},
  /* Rosa's Starlite Diner, west on the highway just out of town */
  {pads:[{x0:-496,z0:16,x1:-444,z1:64,surf:'concrete',bl:10}],spurs:[],
    bld:[{t:'box',b:[-488,30,-452,50],h:4.4,roof:'flat',col:lc(214,206,196),mat:MAT.SHEET},{t:'lamp',x:-492,z:20,h:8},{t:'lamp',x:-448,z:20,h:8},
      {t:'neon',word:'DINER',o:[-465,29.8],rt:[-1,0],n:[0,-1],px:.32,h0:4.9,col:[1,.18,.55]},{t:'neon',word:'EAT',o:[-452.5,29.8],rt:[-1,0],n:[0,-1],px:.2,h0:2.4,col:[.35,1,.45]}],
    trees:[[-500,58,5],[-440,58,6]],name:'The Starlite Diner',x:-470,z:40,special:1},
  /* Marisol's garage in town (yours) */
  {pads:[{x0:GARAGE.x0,z0:GARAGE.z0,x1:GARAGE.x1,z1:GARAGE.z1+2,surf:'concrete',bl:2}],spurs:[],bld:[Object.assign({t:'garage'},GARAGE),{t:'neon',word:'GARAGE',o:[GARAGE.x0+2,GARAGE.z1+.25],rt:[1,0],n:[0,1],px:.2,h0:6.4,col:[1,.6,.12]}],trees:[],name:"Marisol's Garage",x:58,z:95,town:false,special:1}
];
function farmPlan(si,sj){
  return plan('f'+si+','+sj,()=>{
    const h=hs(si,sj,300);if(h>.72)return null;
    const R=rng(Math.floor(hs(si,sj,301)*4294967296)),west=R()<.5;
    let xc,zc,cls,xr,zr;
    if(west){const z=sj*L+L*(.25+.5*R());cls=clsNSz(si,z);if(!cls||cls===6)return null;xr=si*L+offNS(si,z);zc=z;xc=xr+CL[cls].hw+CL[cls].sh+34;}
    else{const x=si*L+L*(.25+.5*R());cls=clsEWx(sj,x);if(!cls)return null;zr=sj*L+offEW(sj,x);xc=x;zc=zr+CL[cls].hw+CL[cls].sh+34;}
    if(townD(xc,zc)<EDGE+180||saltD(xc,zc)>LAND-160||parkD(xc,zc)<90)return null;
    const cr={};creekAt(xc,zc,cr);if(cr.dc<40)return null;
    /* yard-local: u away from the road, v along it */
    const W=(u,v)=>west?[xc+u,zc+v]:[xc+v,zc+u],box=(u0,v0,u1,v1)=>{const a=W(u0,v0),b=W(u1,v1);return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];};
    const yard=box(-24,-22,24,22),bld=[],trees=[],flip=R()<.5?1:-1;
    const house=box(-10,-19*flip,0,-11*flip),barn=box(6,-3,22,11),shed=box(-6,8,6,18);
    const hc=[[236,232,222],[210,200,176],[200,212,220],[236,226,200]][R()*4|0];
    bld.push({t:'box',b:house,h:3,roof:'gable',ra:west?'z':'x',rh:2.2,col:lc(...hc),rc:lc(70,62,58),mat:MAT.WOOD});
    bld.push({t:'box',b:barn,h:5.2,roof:'gable',ra:west?'x':'z',rh:3.6,col:R()<.7?lc(150,40,30):lc(170,170,166),rc:lc(120,120,118),mat:MAT.WOOD,rmat:MAT.SHEET});
    if(R()<.7)bld.push({t:'box',b:shed,h:4.2,roof:'gable',ra:west?'z':'x',rh:1.2,col:lc(176,178,176),rc:lc(160,162,160),mat:MAT.SHEET,rmat:MAT.SHEET});
    const nb=1+(R()*3|0);for(let k=0;k<nb;k++){const p=W(15-k*7.5,-15*flip);bld.push({t:'cyl',x:p[0],z:p[1],r:3.2,h:6+R()*2,cone:1.8,col:lc(190,192,194),mat:MAT.SHEET});}
    {const p=W(-3,3);bld.push({t:'lamp',x:p[0],z:p[1],h:7});}
    /* a windbreak behind the yard and a few shade trees round the house */
    for(let v=-26;v<=26;v+=5){const p=W(30+R()*2,v+R()*2);trees.push([p[0],p[1],R()<.6?3+(R()*2|0):(R()*3|0)]);}
    for(let k=0;k<3;k++){const p=W(-16+R()*10,(-6-R()*14)*-flip);trees.push([p[0],p[1],R()*3|0]);}
    /* the driveway from the road edge to the yard */
    const re=CL[cls].hw+CL[cls].sh+.05,spur=west?{x0:xr+re,z0:zc,x1:yard[0]+1,z1:zc,ax:'x'}:{x0:xc,z0:zr+re,x1:xc,z1:yard[1]+1,ax:'z'};
    return {pads:[{x0:yard[0],z0:yard[1],x1:yard[2],z1:yard[3],surf:'gravel',bl:12}],spurs:[spur],bld,trees,name:'A farm',x:xc,z:zc};
  });
}
/* the plans whose things could reach a box */
function plansIn(x0,z0,x1,z1){
  const out=[],m=420;
  for(const p of SPECIAL)out.push(p);
  for(let si=Math.floor((x0-m)/L);si<=Math.floor((x1+m)/L);si++)for(let sj=Math.floor((z0-m)/L);sj<=Math.floor((z1+m)/L);sj++){
    if(si<-2||si>1||sj<-2||sj>1)continue;const f=farmPlan(si,sj);if(f)out.push(f);}
  return out.filter(p=>{const b=planBox(p);return b[0]<x1+m&&b[2]>x0-m&&b[1]<z1+m&&b[3]>z0-m;});
}
function planBox(p){if(p._b)return p._b;let a=1e9,b=1e9,c=-1e9,d=-1e9;
  for(const q of p.pads){a=Math.min(a,q.x0);b=Math.min(b,q.z0);c=Math.max(c,q.x1);d=Math.max(d,q.z1);}
  for(const s of p.spurs){a=Math.min(a,s.x0,s.x1);b=Math.min(b,s.z0,s.z1);c=Math.max(c,s.x0,s.x1);d=Math.max(d,s.z0,s.z1);}
  for(const t of p.trees){a=Math.min(a,t[0]);b=Math.min(b,t[1]);c=Math.max(c,t[0]);d=Math.max(d,t[1]);}
  for(const q of p.bld){const bx=q.b||(q.x0!==undefined?[q.x0,q.z0,q.x1,q.z1]:q.o?[q.o[0],q.o[1],q.o[0],q.o[1]]:[q.x,q.z,q.x,q.z]);a=Math.min(a,bx[0]);b=Math.min(b,bx[1]);c=Math.max(c,bx[2]);d=Math.max(d,bx[3]);}
  return p._b=[a-30,b-30,c+30,d+30];}

/* ---------- the creeks: winding channels along a contour of a noise field (not in town, the park or on the salt) ---------- */
function creekAt(x,z,o,td,sd){
  o.dep=0;o.wet=0;o.dc=1e9;
  if(td===undefined)td=townD(x,z);if(td<EDGE+200)return o;
  if(sd===undefined)sd=saltD(x,z);if(sd>LAND-150)return o;
  const g=sst(EDGE+200,EDGE+650,td)*(1-sst(LAND-500,LAND-150,sd))*sst(40,160,parkD(x,z));if(g<=0)return o;
  const s=1/2300,cn=fbm(x*s+11.1,z*s-6.6,2,81),e=Math.abs(cn-.5);
  if(e>.012)return o;
  const h=3,gx=(fbm((x+h)*s+11.1,z*s-6.6,2,81)-fbm((x-h)*s+11.1,z*s-6.6,2,81))/(2*h),gz=(fbm(x*s+11.1,(z+h)*s-6.6,2,81)-fbm(x*s+11.1,(z-h)*s-6.6,2,81))/(2*h);
  const dc=e/(Math.hypot(gx,gz)+1e-9);o.dc=dc;
  if(dc<12){o.dep=1.8*(1-sst(3.2,11,dc))*g;o.wet=dc<3.4&&g>.6&&fbm(x/5200+3,z/5200-1,1,91)>.4?1:0;}
  return o;
}

/* ---------- the salt flats' ramps (City Limits'): one in most 360 m cells, kickers, table-tops and now and
   then a mega ramp, each its own height and heading; clear of the highway's line and Ridge and Wash's ---------- */
const RCELL=360,RCACHE=new Map();
function rampsIn(ci,cj){
  const key=(ci+30000)*60000+(cj+30000);let list=RCACHE.get(key);if(list)return list;
  list=[];if(RCACHE.size>4000)RCACHE.clear();RCACHE.set(key,list);
  const cx=(ci+.5)*RCELL,cz=(cj+.5)*RCELL,h=k=>hs(ci,cj,910+k);
  if(h(-1)>.62)return list;
  const t=h(-2);let r;
  if(t<.12)r={kind:'mega',H:7+h(0)*5,Lf:44+h(1)*18,T:6,k:1.5,hw:10+h(2)*3,ws:6};
  else if(t<.45)r={kind:'table',H:2+h(0)*2.2,Lf:14+h(1)*8,T:16+h(2)*22,k:1.15,hw:6+h(3)*3,ws:3.5};
  else r={kind:'kicker',H:2.2+h(0)*2.6,Lf:13+h(1)*9,T:3+h(2)*3,k:1.6,hw:5+h(3)*3,ws:3};
  r.Lb=r.kind==='table'?r.Lf*1.1:r.Lf*(r.kind==='mega'?1.9:2.4);r.L=r.Lf+r.T+r.Lb;
  const yaw=h(5)*Math.PI*2;r.dx=Math.cos(yaw);r.dz=Math.sin(yaw);
  const rad=Math.hypot(r.L/2,r.hw),room=RCELL/2-rad-6,mx=cx+(h(6)-.5)*2*Math.max(0,room),mz=cz+(h(7)-.5)*2*Math.max(0,room);
  r.ox=mx-r.dx*r.L/2;r.oz=mz-r.dz*r.L/2;r.mx=mx;r.mz=mz;r.rad=rad;
  if(saltD(mx,mz)-rad<LAND+SALT_BL+80||Math.abs(mz)<rad+40||Math.abs(mx)<rad+40)return list;
  list.push(r);return list;
}
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function rampHeight(r,x,z){
  const dx=x-r.ox,dz=z-r.oz,u=dx*r.dx+dz*r.dz,v=-dx*r.dz+dz*r.dx,av=Math.abs(v);
  if(u<=0||u>=r.L||av>=r.hw)return 0;
  const p=u<r.Lf?r.H*Math.pow(u/r.Lf,r.k):u<r.Lf+r.T?r.H:r.H*(1-smooth((u-r.Lf-r.T)/r.Lb));
  return av<r.hw-r.ws?p:p*smooth((r.hw-av)/r.ws);
}
/* (a ramp keeps inside its own cell, so only the cells within 70 m of the point need asking) */
function rampAt(x,z){let h=0;const fx=x/RCELL,fz=z/RCELL,ci=Math.floor(fx),cj=Math.floor(fz),m=70/RCELL,ox=fx-ci,oz=fz-cj;
  const i0=ox<m?ci-1:ci,i1=ox>1-m?ci+1:ci,j0=oz<m?cj-1:cj,j1=oz>1-m?cj+1:cj;
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const l=rampsIn(i,j);for(let k=0;k<l.length;k++){const r=l[k];if(Math.abs(x-r.mx)>r.rad||Math.abs(z-r.mz)>r.rad)continue;const q=rampHeight(r,x,z);if(q>h)h=q;}}
  return h;}
/* the level ground of the park and its height */
const PARK_Y=(()=>{const x=(PARK.x0+PARK.x1)/2,z=(PARK.z0+PARK.z1)/2,k=hillK(x,z);
  return (fbm(x/3300+1.7,z/3300+4.1,2,21)-.5)*2*(14+60*k)+(fbm(x/700+3.3,z/700-8.2,2,31)-.5)*2*(2.5+15*k)*.55;})();

/* ---------- THE OFF-ROAD PARK: four tracks round a paddock, on the level ground west of town ----------
   Speedway 25 (HD's banked clay oval, half a mile round), the short course (HD's: two tabletops, the whoops,
   berms in the turns and the big sweeper home), the mud track (a long loop sunk in the ground, banked turns,
   a chicane and a splash), and an eighth-mile dirt drag strip with a tree. The paddock and its lot are on
   the park road in from the highway; a gravel lane runs north from the lot between the tracks.
   Each track is a path of straight lines and arcs (an arc's angle 0 points south (+z), PI/2 east (+x), as in
   HD), so where a point sits on it (metres along, metres across, positive to the right) is worked out
   exactly. The banking, berms, jumps and whoops are the ground's own heights, and the track's surface is
   drawn on the ground's own triangles (genGround), so the physics drives exactly what is drawn. */
const PKW=(()=>{
  const PI=Math.PI;
  /* a path from its pieces: their lengths, where each starts along it, how hard each turns (negative left) */
  function mkPath(prims,closed){let s=0;const bb=[1e9,1e9,-1e9,-1e9],ext=(x,z)=>{bb[0]=Math.min(bb[0],x);bb[1]=Math.min(bb[1],z);bb[2]=Math.max(bb[2],x);bb[3]=Math.max(bb[3],z);};
    for(const p of prims){p.s0=s;
      if(p.t==='L'){p.len=Math.hypot(p.x1-p.x0,p.z1-p.z0);p.ux=(p.x1-p.x0)/p.len;p.uz=(p.z1-p.z0)/p.len;p.k=0;ext(p.x0,p.z0);ext(p.x1,p.z1);}
      else{p.sg=p.a1>p.a0?1:-1;p.span=Math.abs(p.a1-p.a0);p.len=p.span*p.R;p.k=-p.sg/p.R;for(let i=0;i<=24;i++){const a=p.a0+(p.a1-p.a0)*i/24;ext(p.cx+p.R*Math.sin(a),p.cz+p.R*Math.cos(a));}}
      s+=p.len;}
    return {prims,len:s,closed,bb};}
  /* a path laid out by steering: ['L', metres] straight on, ['A', radius, degrees] round (positive left) */
  function steer(x,z,dx,dz,cmds){const out=[];
    for(const c of cmds){
      if(c[0]==='L'){const x1=x+dx*c[1],z1=z+dz*c[1];out.push({t:'L',x0:x,z0:z,x1,z1});x=x1;z=z1;continue;}
      const R=c[1],th=c[2]*PI/180,sg=th>0?1:-1,cx=x+(sg>0?dz:-dz)*R,cz=z+(sg>0?-dx:dx)*R,a0=Math.atan2(x-cx,z-cz),a1=a0+th;
      out.push({t:'A',cx,cz,R,a0,a1});x=cx+R*Math.sin(a1);z=cz+R*Math.cos(a1);dx=sg*Math.cos(a1);dz=-sg*Math.sin(a1);}
    return {prims:out,x,z,dx,dz};}
  /* where (x, z) is on a path: s along, off across (positive right), d away, the way it runs, how hard it turns */
  function near(P,x,z,o){let best=1e18;
    for(const p of P.prims){let px,pz,dx,dz,sl;
      if(p.t==='L'){let t=(x-p.x0)*p.ux+(z-p.z0)*p.uz;t=t<0?0:t>p.len?p.len:t;px=p.x0+p.ux*t;pz=p.z0+p.uz*t;dx=p.ux;dz=p.uz;sl=t;}
      else{const a=Math.atan2(x-p.cx,z-p.cz);let u=((a-p.a0)*p.sg)%(2*PI);if(u<0)u+=2*PI;if(u>p.span)u=u-p.span<2*PI-u?p.span:0;
        const A=p.a0+p.sg*u;px=p.cx+p.R*Math.sin(A);pz=p.cz+p.R*Math.cos(A);dx=p.sg*Math.cos(A);dz=-p.sg*Math.sin(A);sl=u*p.R;}
      const d2=(x-px)*(x-px)+(z-pz)*(z-pz);if(d2<best){best=d2;o.s=p.s0+sl;o.dx=dx;o.dz=dz;o.off=(x-px)*-dz+(z-pz)*dx;o.k=p.k;}}
    o.d=Math.sqrt(best);return o;}
  /* the point s along a path, and the way it runs there */
  function at(P,s,o){const L=P.len;if(P.closed){s%=L;if(s<0)s+=L;}else s=Math.max(0,Math.min(L,s));
    let p=P.prims[P.prims.length-1];for(const q of P.prims)if(s<q.s0+q.len){p=q;break;}const u=s-p.s0;
    if(p.t==='L'){o.x=p.x0+p.ux*u;o.z=p.z0+p.uz*u;o.dx=p.ux;o.dz=p.uz;}
    else{const A=p.a0+p.sg*u/p.R;o.x=p.cx+p.R*Math.sin(A);o.z=p.cz+p.R*Math.cos(A);o.dx=p.sg*Math.cos(A);o.dz=-p.sg*Math.sin(A);}
    o.k=p.k;return o;}
  /* how hard it turns at s, averaged over +-w metres (so the banking eases in and out) */
  function kAvg(P,s,w){let t=0;const L=P.len,sh=P.closed?[-L,0,L]:[0];
    for(const p of P.prims){if(!p.k)continue;for(const o of sh){const a=Math.max(s-w,p.s0+o),b=Math.min(s+w,p.s0+o+p.len);if(b>a)t+=p.k*(b-a);}}return t/(2*w);}

  /* ---- Speedway 25: HD's oval, counter-clockwise on the map from the middle of the front (south) straight ---- */
  const OV={x:-2050,z:-820,half:100,R:64,hw:8};
  const oval=mkPath([{t:'L',x0:OV.x,z0:OV.z+OV.R,x1:OV.x+OV.half,z1:OV.z+OV.R},{t:'A',cx:OV.x+OV.half,cz:OV.z,R:OV.R,a0:0,a1:PI},
    {t:'L',x0:OV.x+OV.half,z0:OV.z-OV.R,x1:OV.x-OV.half,z1:OV.z-OV.R},{t:'A',cx:OV.x-OV.half,cz:OV.z,R:OV.R,a0:PI,a1:2*PI},
    {t:'L',x0:OV.x-OV.half,z0:OV.z+OV.R,x1:OV.x,z1:OV.z+OV.R}],true);
  /* ---- the short course: HD's, moved here. The start straight east, a banked 180 left, the whoops back west, a
     right hairpin, the second jump east, another banked 180, the long run west and the big sweeper home ---- */
  const SH_HW=6;
  const short=mkPath([{t:'L',x0:-2700,z0:-840,x1:-2450,z1:-840},{t:'A',cx:-2450,cz:-900,R:60,a0:0,a1:PI},{t:'L',x0:-2450,z0:-960,x1:-2570,z1:-960},
    {t:'A',cx:-2570,cz:-1010,R:50,a0:0,a1:-PI},{t:'L',x0:-2570,z0:-1060,x1:-2420,z1:-1060},{t:'A',cx:-2420,cz:-1110,R:50,a0:0,a1:PI},
    {t:'L',x0:-2420,z0:-1160,x1:-2700,z1:-1160},{t:'A',cx:-2700,cz:-1000,R:160,a0:PI,a1:2*PI}],true);
  const NQ={};const sAt=(P,x,z)=>near(P,x,z,NQ).s;
  const JUMPS=[{s:sAt(short,-2570,-840),h:1.7,up:11,top:12,down:13},{s:sAt(short,-2495,-1060),h:1.5,up:10,top:10,down:12}];
  const WHOOP=[sAt(short,-2465,-960),sAt(short,-2535,-960)],CREST=sAt(short,-2560,-1160);
  /* ---- the mud track: a long loop the right way round (clockwise on the map), the north straight first,
     a chicane in the back straight and a splash before the last turn ---- */
  const MUD_HW=5;
  const mud=(()=>{const T=steer(-2400,-1440,1,0,[['L',150],['A',50,-180],['L',30],['A',40,45],['A',40,-90],['A',40,45],['L',76.9],['A',50,-180]]);
    T.prims.push({t:'L',x0:T.x,z0:T.z,x1:-2400,z1:-1440});return mkPath(T.prims,true);})();
  const SPLASH=[mud.prims[6].s0+12,mud.prims[6].s0+60];
  /* ---- the drag strip: east from the line, two lanes, the eighth mile and a long shutdown ---- */
  const ST={x0:-2826,start:-2780,x1:-2480,z:-360,half:9,lanes:[-364,-356],eighth:201.168,quarter:402.336};
  /* ---- the paddock's lot, the park road in from the highway, the lane north between the tracks ---- */
  const LOT={x0:-2390,z0:-420,x1:-2230,z1:-310},ROADX=-2310,LANEX=-2300,LANEZ=-1290;
  const TRACKS=[{id:'oval',name:'Speedway 25',P:oval,hw:OV.hw,kind:'circuit'},{id:'short',name:'The short course',P:short,hw:SH_HW,kind:'circuit'},
    {id:'mud',name:'The mud track',P:mud,hw:MUD_HW,kind:'circuit'}];
  /* the bounds each one shapes the ground within */
  const grow=(b,m)=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m],OVB=grow(oval.bb,44),SHB=grow(short.bb,30),MUB=grow(mud.bb,26),STB=[ST.x0-30,ST.z-44,ST.x1+30,ST.z+44];
  const inB=(b,x,z)=>x>b[0]&&x<b[2]&&z>b[1]&&z<b[3];

  /* the heights across them, over the park's level */
  function ovalLift(s,off){const hw=OV.hw,k=kAvg(oval,s,18),th=(5+9*sst(1/260,1/90,Math.abs(k)))*PI/180,t=Math.tan(th),top=t*2*hw;
    if(off<=-hw)return 0;if(off<=hw)return t*(off+hw);if(off<=hw+3)return top;return top*(1-sst(hw+3,hw+14,off));}
  function table(u,J){const a=J.top/2;if(u<-a-J.up||u>a+J.down)return 0;if(u<-a)return J.h*Math.pow((u+a+J.up)/J.up,1.25);if(u<=a)return J.h;return J.h*(1-sst(a,a+J.down,u));}
  function shortLift(s,off){const hw=SH_HW,k=kAvg(short,s,10),out=-Math.sign(k)||1,o=off*out,t=Math.min(.22,Math.abs(k)*14),across=1-sst(hw+.5,hw+4,Math.abs(off));
    let y=0;if(o>-hw)y+=o<=hw?t*(o+hw):t*2*hw*(1-sst(hw+1,hw+9,o));
    for(const J of JUMPS)y+=table(s-J.s,J)*across;
    if(s>WHOOP[0]&&s<WHOOP[1])y+=.32*(.5-.5*Math.cos((s-WHOOP[0])/8*2*PI))*sst(WHOOP[0],WHOOP[0]+6,s)*sst(WHOOP[1],WHOOP[1]-6,s)*across;
    y+=1.3*Math.exp(-Math.pow((s-CREST)/14,2))*across;
    return y;}
  function splashK(s){return sst(SPLASH[0],SPLASH[0]+12,s)*(1-sst(SPLASH[1]-12,SPLASH[1],s));}
  function mudLift(s,off){const hw=MUD_HW,ao=Math.abs(off),k=kAvg(mud,s,12),out=-Math.sign(k)||1,o=off*out,t=Math.min(.1,Math.abs(k)*5);
    const inT=1-sst(hw-.6,hw+1.4,ao);
    let y=-.4*inT;
    if(t>0&&o>-hw)y+=o<=hw?t*(o+hw):t*2*hw*(1-sst(hw+1,hw+7,o));
    /* mud pushed up into a lip along both sides, lumps along the bed, the splash's dip */
    y+=.42*Math.exp(-Math.pow((ao-hw-1.7)/1.2,2));
    y+=(vn(s/4.3,off/2.9,881)-.5)*.3*inT;
    y-=.6*splashK(s)*(1-sst(hw-1.5,hw+1,ao));
    return y;}

  /* what the park makes of a point: its height over the park's level (lift), how smooth the ground must be
     (sm), the surface (code, or -1), how grassy (g, or -1), standing water, and the track it is drawn as:
     tm (its material), ta..td (along, across, kind, half width), tin (inside the drawn edge) */
  function q(x,z,o){
    o.lift=0;o.sm=0;o.code=-1;o.g=-1;o.wet=0;o.wl=0;o.tm=0;o.ta=0;o.tb=0;o.tc=0;o.td=0;o.tin=0;o.tlen=0;
    if(inB(OVB,x,z)){near(oval,x,z,NQ);const hw=OV.hw,d=NQ.d,off=NQ.off,inf=Math.hypot(Math.max(0,Math.abs(x-OV.x)-OV.half),z-OV.z)<OV.R;
      if(inf)o.g=1;if(d>hw+40)return o;
      o.g=inf?1:1-sst(hw+12,hw+30,d);if(d<hw+16)o.lift=ovalLift(NQ.s,off);o.sm=1-sst(hw+16,hw+24,d);
      o.code=off>-hw-2.2&&off<hw+.6?SF.strip:SF.grass;
      if(off>-hw-2.4-16&&off<hw+.9+16){o.tm=MAT.CLAY;o.ta=NQ.s;o.tb=off;o.tc=0;o.td=hw;o.tin=off>-hw-2.4&&off<hw+.9?1:0;o.tlen=oval.len;}
      return o;}
    if(inB(SHB,x,z)){near(short,x,z,NQ);const hw=SH_HW,d=NQ.d;if(d>hw+26)return o;
      o.g=1-sst(hw+12,hw+24,d);if(d<hw+11)o.lift=shortLift(NQ.s,NQ.off);o.sm=1-sst(hw+11,hw+17,d);
      o.code=d<hw+.3?SF.dirt:SF.grass;
      if(d<hw+1.2+16){o.tm=MAT.CLAY;o.ta=NQ.s;o.tb=NQ.off;o.tc=1;o.td=hw;o.tin=d<hw+1.2?1:0;o.tlen=short.len;}
      return o;}
    if(inB(MUB,x,z)){near(mud,x,z,NQ);const hw=MUD_HW,d=NQ.d;if(d>hw+22)return o;
      o.g=1-sst(hw+10,hw+20,d);if(d<hw+10)o.lift=mudLift(NQ.s,NQ.off);o.sm=1-sst(hw+10,hw+14,d);
      const sp=splashK(NQ.s);
      o.code=d<hw?(sp>.5&&d<hw-1.2?SF.water:SF.mud):d<hw+1.4?SF.dirt:SF.grass;
      if(sp>0&&d<hw+.6){o.wet=d<hw-.8&&sp>.2?1:0;o.wl=PARK_Y-.4-.6+.34;}
      if(d<6.4+16){o.tm=MAT.MUDTRACK;o.ta=NQ.s;o.tb=NQ.off;o.tc=0;o.td=hw;o.tin=d<6.4?1:0;o.tlen=mud.len;}
      return o;}
    if(inB(STB,x,z)){const dz=z-ST.z,ad=Math.abs(dz),ex=Math.max(ST.x0-x,0,x-ST.x1);
      o.g=1-sst(ST.half+10,ST.half+26,Math.hypot(ex,Math.max(0,ad-ST.half)));o.sm=1-sst(4,12,Math.hypot(ex,Math.max(0,ad-ST.half-2)));
      if(ex<=0&&ad<ST.half+.5)o.code=SF.strip;else if(ex<=0&&ad<ST.half+2)o.code=SF.dirt;
      if(ex<16&&ad<10.8+16){o.tm=MAT.STRIP;o.ta=x-ST.start;o.tb=dz;o.tc=0;o.td=ST.half;o.tin=ex<=.6&&ad<10.8?1:0;o.tlen=0;}
      return o;}
    return o;}
  /* nothing of the park's within reach (for its trees) */
  function clear(x,z){
    for(const T of TRACKS){const b=T.P.bb;if(x>b[0]-60&&x<b[2]+60&&z>b[1]-60&&z<b[3]+60&&near(T.P,x,z,NQ).d<T.hw+36)return false;}
    if(x>ST.x0-30&&x<ST.x1+30&&Math.abs(z-ST.z)<ST.half+30)return false;
    if(x>LOT.x0-25&&x<LOT.x1+25&&z>LOT.z0-25&&z<LOT.z1+25)return false;
    if(Math.abs(x-ROADX)<14&&z>LOT.z1-5||Math.abs(x-LANEX)<12&&z<LOT.z0+5&&z>LANEZ-12)return false;
    if(x>OV.x-OV.half-OV.R-40&&x<OV.x+OV.half+OV.R+40&&z>OV.z-OV.R-40&&z<OV.z+OV.R+50)return false;
    return true;}
  /* what a spot in the park is called */
  function nameAt(x,z){
    for(const T of TRACKS){const b=T.P.bb;if(x<b[0]-T.hw-30||x>b[2]+T.hw-0+30||z<b[1]-T.hw-30||z>b[3]+T.hw+30)continue;if(near(T.P,x,z,NQ).d<T.hw+25)return T.name;}
    if(x>ST.x0-20&&x<ST.x1+20&&Math.abs(z-ST.z)<ST.half+16)return 'The drag strip';
    if(x>LOT.x0-6&&x<LOT.x1+6&&z>LOT.z0-6&&z<LOT.z1+6)return 'The paddock';
    if(Math.abs(x-ROADX)<9&&z>LOT.z1&&z<-12)return 'Park Road';
    if(Math.abs(x-LANEX)<7&&z<LOT.z0&&z>LANEZ-4)return 'The paddock lane';
    return null;}
  return {OV,oval,short,mud,ST,LOT,ROADX,LANEX,LANEZ,SH_HW,MUD_HW,JUMPS,WHOOP,CREST,SPLASH,TRACKS,near,at,kAvg,q,nameAt,clear};
})();
/* the paddock as a place: its lot, the park road in from the highway, the lane north, the office */
SPECIAL.push((()=>{const Lt=PKW.LOT,e=CL[6].hw+CL[6].sh+.05,ox0=Lt.x1-46,oz0=Lt.z0+8;
  return {pads:[{x0:Lt.x0,z0:Lt.z0,x1:Lt.x1,z1:Lt.z1,surf:'concrete',bl:10}],
    spurs:[{x0:PKW.ROADX,z0:-e,x1:PKW.ROADX,z1:Lt.z1+.3,ax:'z',cl:3,c:PROAD},{x0:PKW.LANEX,z0:PKW.LANEZ,x1:PKW.LANEX,z1:Lt.z0-.3,ax:'z'}],
    bld:[{t:'box',b:[ox0,oz0,ox0+36,oz0+16],h:5.6,roof:'flat',col:lc(200,196,186),mat:MAT.SHEET},
      {t:'neon',word:'OFF-ROAD PARK',o:[ox0+3,oz0+16.25],rt:[1,0],n:[0,1],px:.18,h0:3.3,col:[1,.55,.1]},{t:'neon',word:'ENTRIES',o:[ox0+28,oz0+16.25],rt:[1,0],n:[0,1],px:.08,h0:2.2,col:[.3,.95,1]}],
    trees:[],name:'The paddock',x:(Lt.x0+Lt.x1)/2,z:(Lt.z0+Lt.z1)/2,special:1};})());

/* ---------- one point of the world ----------
   ctx holds the roads near the point (ns: [xc, inv, cls] for each north-south line at this z; ew: [zc, inv,
   cls] for each east-west line at this x), and the pads and spurs of the plans near it. o gets: h, code,
   grass, rock, mud, salt, wet, wl (the water's level), B (the road base), rk. */
const CR={dep:0,wet:0,dc:1e9},PQO={};
function core(x,z,ctx,o){
  const td=townD(x,z);
  /* (two short cuts: inside town and out on the salt the land's own shape doesn't matter) */
  if(td<EDGE+8){const tq=townQ(x,z,TQ),dz=district(x,z);let code,grass=0;
    if(tq.e<0)code=SF.asphalt;
    else if(tq.e<tq.side)code=SF.concrete;
    else if(Math.abs(x)>RING||Math.abs(z)>RING){grass=sst(.32,.6,fbm(x/30+5,z/30,2,111)+.18)*.5;code=grass>.5?SF.grass:SF.dirt;}
    else if(dz==='park'){code=SF.grass;grass=1;}
    else if(dz==='residential'){grass=Math.max(.6,sst(.32,.6,fbm(x/30+5,z/30,2,111)+.18));code=grass>.35?SF.grass:SF.dirt;}
    else code=SF.concrete;
    o.h=tq.e<0?0:.12;o.code=code;o.grass=grass;o.rock=0;o.mud=0;o.salt=0;o.ramp=0;o.wet=0;o.wl=o.h;o.B=0;o.rk=0;o.k=0;o.tm=0;o.tin=0;return o;}
  const sd=saltD(x,z);
  if(sd>LAND+SALT_BL){const ramp=rampAt(x,z);let code=ramp>.04?SF.concrete:SF.strip,h=SALT_Y+ramp;
    const ew=ctx.ew;for(let q=0;q<ew.length;q+=3){const cl=ew[q+2];if(cl&&Math.abs(z-ew[q])*ew[q+1]<CL[cl].hw){code=SF.asphalt;h=SALT_Y;}}
    o.h=h+rimAt(x,z);o.code=code;o.grass=0;o.rock=0;o.mud=0;o.salt=1;o.ramp=ramp;o.wet=0;o.wl=o.h;o.B=SALT_Y;o.rk=0;o.k=0;o.tm=0;o.tin=0;return o;}
  const k=hillK(x,z,td,sd),rim=rimAt(x,z);
  const tk=1-sst(EDGE+10,EDGE+230,td),sk=sst(LAND,LAND+SALT_BL,sd),pk=1-sst(30,170,parkD(x,z));
  const big=(fbm(x/3300+1.7,z/3300+4.1,2,21)-.5)*2*(14+60*k);
  const med=(fbm(x/700+3.3,z/700-8.2,2,31)-.5)*2*(2.5+15*k);
  const det=(fbm(x/90,z/90,2,41)-.5)*2*(.7+2.2*k)+(vn(x/19,z/19,51)-.5)*(.4+.5*k);
  const kHw=1-sst(60,700,Math.abs(z));
  let B=big+.55*med*(1-kHw)+rim;
  let rk=0;if(k>.55){rk=sst(.55,.9,k)*sst(.7,.8,fbm(x/260-5.1,z/260+2.2,2,61));}
  const out=rk>0?rk*(4+7*vn(x/41,z/41,71)):0;
  creekAt(x,z,CR,td,sd);
  let T=big+med+det*(1-pk*.85)+out+rim-CR.dep;
  /* the park's level ground and its tracks' banking, berms and jumps (smooth where they run); the town's flat
     streets and raised blocks; the salt, flat but for its ramps */
  let PQ=null;
  if(pk>0){PQ=PKW.q(x,z,PQO);T=T+(PARK_Y+PQ.lift+det*.12*(1-PQ.sm)-T)*pk;B=B+(PARK_Y-B)*pk;}
  if(tk>0){T=T*(1-tk);B=B*(1-tk);}
  let ramp=0;if(sk>.98){ramp=rampAt(x,z);}
  if(sk>0){T=T+(SALT_Y+ramp-T)*sk;B=B+(SALT_Y-B)*sk;}
  /* the roads near: grade the land to them, cut their ditches, and say what's underfoot */
  let corr=0,flat=0,ditch=0,best=1e9,bCls=0,dirtNear=0;
  const roadC=(dd,c,cl)=>{
    const e=c.hw+c.sh;
    const f=1-sst(e+.3,e+1.8,dd);if(f>flat)flat=f;
    const cr=1-sst(e+c.dw*.7,e+c.dw+c.blend,dd);if(cr>corr)corr=cr;
    if(c.ditch>0){const di=c.ditch*sst(e+.8,e+2.3,dd)*(1-sst(e+c.dw-2.2,e+c.dw,dd))*(1-sk);if(di>ditch)ditch=di;}
    const m=dd-c.hw;if(m<best){best=m;bCls=cl;}
    if(cl===1){const dn=1-sst(3,14,dd);if(dn>dirtNear)dirtNear=dn;}
  };
  const ns=ctx.ns,ew=ctx.ew;
  for(let q=0;q<ns.length;q+=3){const cl=ns[q+2];if(!cl)continue;const dd=Math.abs(x-ns[q])*ns[q+1];if(dd<80)roadC(dd,CL[cl],cl);}
  for(let q=0;q<ew.length;q+=3){const cl=ew[q+2];if(!cl)continue;const dd=Math.abs(z-ew[q])*ew[q+1];if(dd<80)roadC(dd,CL[cl],cl);}
  for(const s of ctx.spurs){const dd=s.ax==='x'?(x<Math.min(s.x0,s.x1)?Math.hypot(x-Math.min(s.x0,s.x1),z-s.z0):x>Math.max(s.x0,s.x1)?Math.hypot(x-Math.max(s.x0,s.x1),z-s.z0):Math.abs(z-s.z0))
    :(z<Math.min(s.z0,s.z1)?Math.hypot(z-Math.min(s.z0,s.z1),x-s.x0):z>Math.max(s.z0,s.z1)?Math.hypot(z-Math.max(s.z0,s.z1),x-s.x0):Math.abs(x-s.x0));
    if(dd<40)roadC(dd,s.c||SPUR,s.cl===3?3:7);}
  let pad=null;
  for(const p of ctx.pads){const dx=Math.max(p.x0-x,0,x-p.x1),dz=Math.max(p.z0-z,0,z-p.z1),dp=Math.hypot(dx,dz);if(dp>p.bl+3)continue;
    const f=1-sst(0,1.5,dp);if(f>flat)flat=f;const cr=1-sst(2,2+p.bl,dp);if(cr>corr)corr=cr;if(dp<=0)pad=p;}
  /* mud: holes along the dirt roads and in the wet ground by the creeks, and the bog south of town */
  let mud=0;
  {const db=Math.hypot(x-BOG.x,z-BOG.z),bog=1-sst(BOG.r-12,BOG.r+(vn(x/6,z/6,105)-.5)*8,db);
    const al=Math.max(dirtNear,CR.dc<45?.75*(1-sst(25,45,CR.dc)):0);
    if(al>0||bog>0){const mn=vn(x/34+3,z/34-7,101);mud=Math.max(sst(.74,.84,mn)*al,bog);}
    if(pad||tk>.5||sk>.5)mud=0;}
  let h=T+(B-T)*corr-ditch*(1-flat)-mud*(Math.hypot(x-BOG.x,z-BOG.z)<BOG.r+6?1.1:.42);
  /* the ground: grass, dirt fields, rock on the outcrops and the creek banks; drier toward the salt */
  let grass=sst(.32,.6,fbm(x/30+5,z/30,2,111)+.18);
  {const pi=Math.floor(x/(L/2)),pj=Math.floor(z/(L/2));if(hs(pi,pj,131)<.55*(1-sst(.3,.7,hillK((pi+.5)*L/2,(pj+.5)*L/2))))grass*=.15+.3*vn(x/9,z/9,141);}
  grass*=1-sst(LAND-950,LAND-120,sd)*.85;grass*=1-pk*.4;
  let rock=rk;if(CR.dc<9&&CR.dep>.3)rock=Math.max(rock,.35*(1-sst(3,9,CR.dc)));
  grass*=1-rock*.9;
  let code=mud>.5?SF.mud:rk>.55?SF.rock:grass>.5?SF.grass:SF.dirt;
  if(best<0)code=bCls===7||bCls===2?SF.gravel:bCls>=3?SF.asphalt:SF.trail;
  else if(bCls>=3&&bCls<7&&best<CL[bCls].sh)code=SF.gravel;
  if(best<1.2&&mud<=.5){grass*=.4;}
  if(PQ){if(PQ.code>=0&&best>=0)code=PQ.code;if(PQ.g>0){grass=Math.max(grass,PQ.g);rock*=1-PQ.g;}}
  if(pad){code=SF[pad.surf];grass=0;rock=0;}
  if(CR.wet&&!pad&&best>1)code=SF.water;
  if(best<0&&bCls===1&&mud>.5)code=SF.mud;
  /* on the salt: hard and smooth (the physics' "strip"), concrete on the ramps */
  let salt=0;
  if(sk>.55){salt=sk;grass=0;rock=0;if(best>=0||bCls<6)code=ramp>.04?SF.concrete:SF.strip;}else if(sk>0)salt=sk;
  o.h=h;o.code=code;o.grass=grass;o.rock=rock;o.mud=Math.max(mud,CR.wet?.8:0);o.salt=salt;o.ramp=ramp;o.wet=CR.wet&&!pad&&best>1?1:0;o.wl=h+.5*(CR.dep/1.8);o.B=B;o.rk=rk;o.k=k;
  o.tm=0;o.tin=0;
  if(PQ){if(PQ.wl){o.wet=PQ.wet;o.wl=PQ.wl;}if(PQ.tm){o.tm=PQ.tm;o.ta=PQ.ta;o.tb=PQ.tb;o.tc=PQ.tc;o.td=PQ.td;o.tin=PQ.tin;o.tlen=PQ.tlen;}}
  return o;
}
/* the road base alone (where a road's surface is): the same sums as core without the detail */
function baseAt(x,z){
  const k=hillK(x,z),rim=rimAt(x,z),td=townD(x,z),sd=saltD(x,z);
  const tk=1-sst(EDGE+10,EDGE+230,td),sk=sst(LAND,LAND+SALT_BL,sd),pk=1-sst(30,170,parkD(x,z));
  const big=(fbm(x/3300+1.7,z/3300+4.1,2,21)-.5)*2*(14+60*k);
  const med=(fbm(x/700+3.3,z/700-8.2,2,31)-.5)*2*(2.5+15*k);
  const kHw=1-sst(60,700,Math.abs(z));
  let B=big+.55*med*(1-kHw)+rim;
  if(pk>0)B=B+(PARK_Y-B)*pk;
  if(tk>0)B=B*(1-tk);
  if(sk>0)B=B+(SALT_Y-B)*sk;
  return B;
}

/* ---------- the roads near a box, for core ---------- */
function nsLines(x0,x1){const a=[];for(let i=Math.max(-1,Math.floor((x0-300)/L));i<=Math.min(1,Math.floor((x1+300)/L)+1);i++)a.push(i);return a;}
function nsInfo(lines,z,out){out.length=0;
  for(const i of lines){const xc=i*L+offNS(i,z),s=(offNS(i,z+1)-offNS(i,z-1))*.5;out.push(xc,1/Math.sqrt(1+s*s),clsNSz(i,z));}return out;}
function ewInfo(lines,x,out){out.length=0;
  for(const j of lines){const zc=j*L+offEW(j,x),s=(offEW(j,x+1)-offEW(j,x-1))*.5;out.push(zc,1/Math.sqrt(1+s*s),clsEWx(j,x));}return out;}
/* a context for one box: its plans' pads and spurs */
function boxCtx(x0,z0,x1,z1){
  const P=plansIn(x0,z0,x1,z1),pads=[],spurs=[];
  for(const p of P){for(const q of p.pads)if(q.x0<x1+20&&q.x1>x0-20&&q.z0<z1+20&&q.z1>z0-20)pads.push(q);
    for(const s of p.spurs)if(Math.min(s.x0,s.x1)<x1+40&&Math.max(s.x0,s.x1)>x0-40&&Math.min(s.z0,s.z1)<z1+40&&Math.max(s.z0,s.z1)>z0-40)spurs.push(s);}
  return {plans:P,pads,spurs,ns:[],ew:[]};
}
/* one point on its own (the physics' fallback, placing things): slower, the same answer */
const PCTX=new Map();
function pointCtx(x,z){
  const key=Math.floor(x/CH)*100003+Math.floor(z/CH);let c=PCTX.get(key);
  if(!c){const x0=Math.floor(x/CH)*CH,z0=Math.floor(z/CH)*CH;c=boxCtx(x0,z0,x0+CH,z0+CH);c.nsL=nsLines(x0,x0+CH);c.ewL=nsLines(z0,z0+CH);PCTX.set(key,c);if(PCTX.size>400)PCTX.delete(PCTX.keys().next().value);}
  nsInfo(c.nsL,z,c.ns);ewInfo(c.ewL,x,c.ew);return c;
}
const PO={};
function sample(x,z,o){return core(x,z,pointCtx(x,z),o||PO);}

/* ---------- meshes: positions are relative to the chunk's corner ---------- */
class MB{
  constructor(ox,oz){this.P=[];this.N=[];this.C=[];this.M=[];this.I=[];this.n=0;this.ox=ox;this.oz=oz;}
  v(x,y,z,nx,ny,nz,c0,c1,c2,c3,m){this.P.push(x-this.ox,y,z-this.oz);this.N.push(nx,ny,nz);this.C.push(c0,c1,c2,c3);this.M.push(m);return this.n++;}
  quad(a,b,c,d,col,m,em){/* four corners [x,y,z], a flat face */
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=d[0]-a[0],wy=d[1]-a[1],wz=d[2]-a[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const e=em||0,i0=this.v(a[0],a[1],a[2],nx,ny,nz,col[0],col[1],col[2],e,m),i1=this.v(b[0],b[1],b[2],nx,ny,nz,col[0],col[1],col[2],e,m),i2=this.v(c[0],c[1],c[2],nx,ny,nz,col[0],col[1],col[2],e,m),i3=this.v(d[0],d[1],d[2],nx,ny,nz,col[0],col[1],col[2],e,m);
    this.I.push(i0,i1,i2,i0,i2,i3);}
  tri(a,b,c,col,m,em){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;
    const e=em||0;const i0=this.v(a[0],a[1],a[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m),i1=this.v(b[0],b[1],b[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m),i2=this.v(c[0],c[1],c[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m);this.I.push(i0,i1,i2);}
  box(x0,y0,z0,x1,y1,z1,col,m,em,skip){const s=skip||'';
    if(!s.includes('t'))this.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],col,m,em);
    if(!s.includes('b'))this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col,m,em);
    if(!s.includes('x'))this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],col,m,em);
    if(!s.includes('X'))this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],col,m,em);
    if(!s.includes('z'))this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],col,m,em);
    if(!s.includes('Z'))this.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],col,m,em);}
  /* an upright cylinder, smooth sides; a cone on top if asked */
  cyl(cx,cz,y0,y1,r,seg,col,m,cone,em){const e=em||0,ring=[];
    for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,c=Math.cos(a),s=Math.sin(a);ring.push([this.v(cx+c*r,y0,cz+s*r,c,0,s,col[0],col[1],col[2],e,m),this.v(cx+c*r,y1,cz+s*r,c,0,s,col[0],col[1],col[2],e,m)]);}
    for(let i=0;i<seg;i++)this.I.push(ring[i][0],ring[i][1],ring[i+1][1],ring[i][0],ring[i+1][1],ring[i+1][0]);
    if(cone>0){const ap=[cx,y1+cone,cz];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;this.tri([cx+Math.cos(a)*r,y1,cz+Math.sin(a)*r],ap,[cx+Math.cos(b)*r,y1,cz+Math.sin(b)*r],col,m,e);}}
    else if(cone===0){const ci=this.v(cx,y1,cz,0,1,0,col[0],col[1],col[2],e,m);for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
      const p=this.v(cx+Math.cos(a)*r,y1,cz+Math.sin(a)*r,0,1,0,col[0],col[1],col[2],e,m),q=this.v(cx+Math.cos(b)*r,y1,cz+Math.sin(b)*r,0,1,0,col[0],col[1],col[2],e,m);this.I.push(ci,q,p);}}}
  /* a straight piece from a to b, square in section (posts, legs, wires) */
  bar(a,b,w,col,m,em){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1,t=[dx/l,dy/l,dz/l],ref=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];
    let u=[t[1]*ref[2]-t[2]*ref[1],t[2]*ref[0]-t[0]*ref[2],t[0]*ref[1]-t[1]*ref[0]];const ul=Math.hypot(...u);u=[u[0]/ul*w,u[1]/ul*w,u[2]/ul*w];
    const v=[(t[1]*u[2]-t[2]*u[1]),(t[2]*u[0]-t[0]*u[2]),(t[0]*u[1]-t[1]*u[0])];
    const P=(p,su,sv)=>[p[0]+u[0]*su+v[0]*sv,p[1]+u[1]*su+v[1]*sv,p[2]+u[2]*su+v[2]*sv];
    for(const [s0,t0,s1,t1] of [[1,1,-1,1],[-1,1,-1,-1],[-1,-1,1,-1],[1,-1,1,1]])this.quad(P(a,s0,t0),P(a,s1,t1),P(b,s1,t1),P(b,s0,t0),col,m,em);}
  out(){return {pos:new Float32Array(this.P),nrm:new Float32Array(this.N),col:new Float32Array(this.C),mat:new Float32Array(this.M),idx:this.n<65536?new Uint16Array(this.I):new Uint32Array(this.I),tris:this.I.length/3};}
}

/* ---------- the map's colours (as the HUD packs them: RGBA bytes); "strip" is the salt here ---------- */
const MAPC=[[54,84,30],[120,70,38],[214,208,194],[150,104,62],[112,96,84],[46,32,18],[150,148,144],[60,120,190],[178,168,146],[46,46,52],[84,58,32]];
const pk=(r,g,b)=>((235<<24)|((Math.max(0,Math.min(255,b))|0)<<16)|((Math.max(0,Math.min(255,g))|0)<<8)|(Math.max(0,Math.min(255,r))|0))>>>0;

/* ---------- one chunk's ground at one level of detail: every 2, 4 or 8 m ----------
   The colour carries grass, rock, mud (salt as negative mud: the two never meet) and ambient occlusion */
function genGround(cx,cz,lod){
  const st=2<<lod,n=CH/st+1,nb=n+2,x0=cx*CH,z0=cz*CH,ctx=boxCtx(x0-st,z0-st,x0+CH+st,z0+CH+st);
  const nsL=nsLines(x0,x0+CH),ewL=nsLines(z0,z0+CH),ewI=[];
  const Hb=new Float64Array(nb*nb),code=new Uint8Array(n*n),Wt=new Float32Array(n*n*4),wet=new Uint8Array(n*n),wl=new Float32Array(n*n),o={};
  /* the park's tracks: which one each point is drawn as, and its along, across, kind and half width there */
  const TM=new Uint8Array(n*n),TA=new Float32Array(n*n*4),TIN=new Uint8Array(n*n),TL=new Float32Array(n*n);let anyT=false;
  for(let i=0;i<nb;i++)ewI.push(ewInfo(ewL,x0+(i-1)*st,[]));
  for(let j=0;j<nb;j++){const z=z0+(j-1)*st;nsInfo(nsL,z,ctx.ns);
    for(let i=0;i<nb;i++){const x=x0+(i-1)*st;ctx.ew=ewI[i];core(x,z,ctx,o);Hb[j*nb+i]=o.h;
      if(i>0&&j>0&&i<=n&&j<=n){const k=(j-1)*n+(i-1);code[k]=o.code;Wt[k*4]=o.grass;Wt[k*4+1]=o.rock;Wt[k*4+2]=o.salt>.02?-o.salt:o.mud;wet[k]=o.wet;wl[k]=o.wl;
        if(o.tm){TM[k]=o.tm;TA[k*4]=o.ta;TA[k*4+1]=o.tb;TA[k*4+2]=o.tc;TA[k*4+3]=o.td;TIN[k]=o.tin;TL[k]=o.tlen;anyT=true;}}}}
  /* normals, slope rock and hollows */
  const nrm=new Float32Array(n*n*3);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const b=(j+1)*nb+(i+1),k=j*n+i,hx=Hb[b-1]-Hb[b+1],hz=Hb[b-nb]-Hb[b+nb],ny=2*st,l=Math.hypot(hx,ny,hz);
    nrm[k*3]=hx/l;nrm[k*3+1]=ny/l;nrm[k*3+2]=hz/l;
    const slope=Math.sqrt(Math.max(0,1-(ny/l)*(ny/l)))/Math.max(ny/l,.05),rs=sst(.6,1.05,slope)*(Wt[k*4+2]<0?0:1);if(rs>Wt[k*4+1]){Wt[k*4+1]=rs;Wt[k*4]*=1-rs*.8;}
    const curv=(Hb[b-1]+Hb[b+1]+Hb[b-nb]+Hb[b+nb])/4-Hb[b];Wt[k*4+3]=Math.max(.55,Math.min(1,1-curv*.35*2/st));}
  /* the mesh, with skirts hanging from its edges so a neighbour of other detail never shows a crack */
  /* a square of the grid is drawn as a track (its own four corners, the track's material) if any corner is
     inside the track's drawn edge: the track's look fades to grass before that edge, and the ground past it
     is grass, so the squares' steps never show */
  const isT=(p,q,r,s)=>anyT&&(TIN[p]|TIN[q]|TIN[r]|TIN[s])&&TM[p]&&TM[p]===TM[q]&&TM[p]===TM[r]&&TM[p]===TM[s];
  let nT=0;if(anyT)for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const p=j*n+i;if(isT(p,p+1,p+n,p+n+1))nT++;}
  const drop=[1.5,2.5,5][lod],nv=n*n+4*n*2+nT*4,P=new Float32Array(nv*3),N=new Float32Array(nv*3),C=new Float32Array(nv*4),M=new Float32Array(nv).fill(MAT.TERRAIN),I=[];
  let v=0;const put=(i,j,dy)=>{const k=j*n+i;P[v*3]=i*st;P[v*3+1]=Hb[(j+1)*nb+i+1]-dy;P[v*3+2]=j*st;N[v*3]=nrm[k*3];N[v*3+1]=nrm[k*3+1];N[v*3+2]=nrm[k*3+2];
    C[v*4]=Wt[k*4];C[v*4+1]=Wt[k*4+1];C[v*4+2]=Wt[k*4+2];C[v*4+3]=Wt[k*4+3];return v++;};
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)put(i,j,0);
  /* a track's corner: the same point and normal as the ground's; along (unwrapped round the lap), across, kind, half width */
  const putT=(k,sx)=>{for(let c=0;c<3;c++){P[v*3+c]=P[k*3+c];N[v*3+c]=N[k*3+c];}C[v*4]=sx;C[v*4+1]=TA[k*4+1];C[v*4+2]=TA[k*4+2];C[v*4+3]=TA[k*4+3];M[v]=TM[k];return v++;};
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const p=j*n+i,q=p+1,r=p+n,s=r+1;
    if(!isT(p,q,r,s)){I.push(p,s,q,p,r,s);continue;}
    const ks=[p,q,r,s],sx=ks.map(k=>TA[k*4]),L=TL[p];
    if(L>0&&Math.max(...sx)-Math.min(...sx)>L/2)for(let a=0;a<4;a++)if(sx[a]>L/2)sx[a]-=L;
    const a=putT(p,sx[0]),b=putT(q,sx[1]),c=putT(r,sx[2]),d=putT(s,sx[3]);I.push(a,d,b,a,c,d);}
  const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=ja*n+ia,b=jb*n+ib,c=put(ia,ja,drop),d=put(ib,jb,drop);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
  const top=[],bot=[],lef=[],rig=[];for(let a=0;a<n;a++){top.push([a,0]);bot.push([a,n-1]);lef.push([0,a]);rig.push([n-1,a]);}
  edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
  const ground={pos:P.subarray(0,v*3),nrm:N.subarray(0,v*3),col:C.subarray(0,v*4),mat:M.subarray(0,v),idx:v<65536?new Uint16Array(I):new Uint32Array(I),tris:I.length/3};
  /* water lying in the creek beds */
  let water=null;{const wb=new MB(x0,z0);
    for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const k=j*n+i,ks=[k,k+1,k+n+1,k+n];if(!(wet[ks[0]]|wet[ks[1]]|wet[ks[2]]|wet[ks[3]]))continue;
      let lv=-1e9;for(const q of ks)if(wet[q])lv=Math.max(lv,wl[q]);
      const pts=ks.map(q=>{const ii=q%n,jj=(q/n)|0;return [x0+ii*st,wet[q]?wl[q]:Math.max(lv,wl[q]),z0+jj*st];});
      wb.quad(pts[0],pts[3],pts[2],pts[1],[.05,.06,.05],MAT.WATER);}
    if(wb.n)water=wb.out();}
  /* the map tile: 4 m a pixel from the fine grids, 8 m from the coarse */
  const tn=lod<2?32:16,tile=new Uint32Array(tn*tn),ts=CH/tn;
  for(let j=0;j<tn;j++)for(let i=0;i<tn;i++){const gi=Math.min(n-1,Math.round((i+.5)*ts/st)),gj=Math.min(n-1,Math.round((j+.5)*ts/st)),k=gj*n+gi,c=TIN[k]?(TM[k]===MAT.CLAY?(TA[k*4+2]>.5?[132,88,52]:[156,82,46]):TM[k]===MAT.MUDTRACK?[64,44,26]:[160,120,80]):MAPC[code[k]]||MAPC[1],
    sh=.62+.5*Math.max(0,Math.min(1,nrm[k*3]*.6-nrm[k*3+2]*.5+nrm[k*3+1]*.5)),hh=Math.max(.75,Math.min(1.25,.8+Hb[(gj+1)*nb+gi+1]/160));tile[j*tn+i]=pk(c[0]*sh*hh,c[1]*sh*hh,c[2]*sh*hh);}
  const res={cx,cz,lod,ground,water,tile,tn,ymin:1e9,ymax:-1e9};
  for(let k=0;k<n*n;k++){const h=Hb[((k/n|0)+1)*nb+k%n+1];if(h<res.ymin)res.ymin=h;if(h>res.ymax)res.ymax=h;}
  if(lod===0){const H=new Float32Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)H[j*n+i]=Hb[(j+1)*nb+i+1];res.H=H;res.SC=code;}
  return res;
}

/* ---------- one chunk's roads, buildings, poles, trees, colliders and lights ---------- */
const POLE_COL=lc(96,76,58),WIRE_COL=lc(30,30,32),LAMP_COL=lc(58,60,64);
function genStatic(cx,cz){
  const x0=cx*CH,z0=cz*CH,x1=x0+CH,z1=z0+CH,ctx=boxCtx(x0,z0,x1,z1),RB=new MB(x0,z0),PB=new MB(x0,z0),trees=[],cols=[],lights=[],labels=[];
  const inC=(x,z)=>x>=x0&&x<x1&&z>=z0&&z<z1,R=rng(Math.floor(hs(cx,cz,600)*4294967296)+1);
  const nsL=nsLines(x0,x1),ewL=nsLines(z0,z1);
  const colBox=(a,b,c,d,top)=>{if(c>x0-1&&a<x1+1&&d>z0-1&&b<z1+1)cols.push({x0:a,z0:b,x1:c,z1:d,top});};
  const colCirc=(x,z,r,top)=>{if(x+r>x0-1&&x-r<x1+1&&z+r>z0-1&&z-r<z1+1)cols.push({t:'c',x,z,r,top});};
  /* --- the country roads' ribbons: 4 m segments, each drawn by the chunk its middle falls in --- */
  const ST=4,lift=.035;
  const cols3=(c,cl)=>cl>=5?[-c.draw,-c.draw/2,0,c.draw/2,c.draw]:[-c.draw,0,c.draw];
  const ribbon=(ax,bx,az,bz,sA,sB,c,cl,nA,nB)=>{
    /* a,b: centreline ends; n*: the unit across (pointing +x for north-south lines, +z for east-west) */
    const D=cols3(c,cl),mat=cl>=3?MAT.ROAD:cl===1?MAT.TRAIL:MAT.GRAVEL,row=(px,pz,nx,nz,s)=>D.map(d=>{const x=px+nx*d,z=pz+nz*d,y=baseAt(x,z)+lift;
      return cl>=3?RB.v(x,y,z,0,1,0,s%1200,d,cl,c.hw,mat):cl===1?RB.v(x,y,z,0,1,0,s%1200,d,0,1,mat):RB.v(x,y,z,0,1,0,s%1200,d,0,c.hw,mat);});
    const ra=row(ax,az,nA[0],nA[1],sA),rb=row(bx,bz,nB[0],nB[1],sB);
    for(let k=0;k<D.length-1;k++)RB.I.push(ra[k],rb[k],rb[k+1],ra[k],rb[k+1],ra[k+1]);
    /* gravel shoulders beside the blacktop */
    if(cl>=3)for(const sg of [-1,1]){const e0=c.hw*sg,e1=(c.hw+c.sh)*sg,q=(px,pz,nx,nz,d)=>{const x=px+nx*d,z=pz+nz*d;return RB.v(x,baseAt(x,z)+lift*.6,z,0,1,0,0,0,1,c.hw,MAT.GRAVEL);};
      const a0=q(ax,az,nA[0],nA[1],e0),a1=q(ax,az,nA[0],nA[1],e1),b0=q(bx,bz,nB[0],nB[1],e0),b1=q(bx,bz,nB[0],nB[1],e1);RB.I.push(a0,b0,b1,a0,b1,a1);}
  };
  /* clip a segment where it meets a road of its class or better running across it */
  const clipAcross=(crossD,hwX)=>{const [dA,dB]=crossD;const inA=Math.abs(dA)<hwX,inB=Math.abs(dB)<hwX;if(inA&&inB)return null;
    if(!inA&&!inB)return [0,1];const e=(inA?Math.sign(dB):Math.sign(dA))*hwX,t=(e-dA)/(dB-dA);return inA?[t,1]:[0,t];};
  for(const i of nsL){
    if(Math.abs(i*L+offNS(i,z0+CH/2)-(x0+CH/2))>CH/2+300)continue;
    for(let z=Math.floor(z0/ST)*ST-ST;z<z1;z+=ST){
      const zm=z+ST/2,xm=i*L+offNS(i,zm);if(!inC(xm,zm))continue;
      const cl=clsNSz(i,zm);if(!cl)continue;const c=CL[cl];
      let xa=i*L+offNS(i,z),xb=i*L+offNS(i,z+ST),zA=z,zB=z+ST,tr=[0,1];
      for(const j of ewL){const zc=j*L+offEW(j,xm);if(Math.abs(zm-zc)>40)continue;const cx2=clsEWx(j,xm);if(!cx2||cx2<cl)continue;
        const s=(offEW(j,xm+1)-offEW(j,xm-1))*.5,inv=1/Math.sqrt(1+s*s),dA=(zA-(j*L+offEW(j,xa)))*inv,dB=(zB-(j*L+offEW(j,xb)))*inv,cl2=CL[cx2];
        const t=clipAcross([dA,dB],cl2.hw+cl2.sh+.05);if(!t){tr=null;break;}tr=[Math.max(tr[0],t[0]),Math.min(tr[1],t[1])];}
      if(!tr||tr[1]-tr[0]<1e-3)continue;
      if(cl===1){sample(xm,zm,CRo);if(CRo.mud>.3)continue;}
      const XA=xa+(xb-xa)*tr[0],XB=xa+(xb-xa)*tr[1],ZA=zA+ST*tr[0],ZB=zA+ST*tr[1];
      const sa=(offNS(i,ZA+.5)-offNS(i,ZA-.5)),sb=(offNS(i,ZB+.5)-offNS(i,ZB-.5)),na=[1/Math.sqrt(1+sa*sa),-sa/Math.sqrt(1+sa*sa)],nb=[1/Math.sqrt(1+sb*sb),-sb/Math.sqrt(1+sb*sb)];
      ribbon(XA,XB,ZA,ZB,ZA+HALF,ZB+HALF,c,cl,na,nb);
    }
  }
  for(const j of ewL){
    if(Math.abs(j*L+offEW(j,x0+CH/2)-(z0+CH/2))>CH/2+300)continue;
    for(let x=Math.floor(x0/ST)*ST-ST;x<x1;x+=ST){
      const xm=x+ST/2,zm=j*L+offEW(j,xm);if(!inC(xm,zm))continue;
      const cl=clsEWx(j,xm);if(!cl)continue;const c=CL[cl];
      let za=j*L+offEW(j,x),zb=j*L+offEW(j,x+ST),xA=x,xB=x+ST,tr=[0,1];
      for(const i of nsL){const xc=i*L+offNS(i,zm);if(Math.abs(xm-xc)>40)continue;const cx2=clsNSz(i,zm);if(!cx2||cx2<=cl)continue;
        const s=(offNS(i,zm+1)-offNS(i,zm-1))*.5,inv=1/Math.sqrt(1+s*s),dA=(xA-(i*L+offNS(i,za)))*inv,dB=(xB-(i*L+offNS(i,zb)))*inv,cl2=CL[cx2];
        const t=clipAcross([dA,dB],cl2.hw+cl2.sh+.05);if(!t){tr=null;break;}tr=[Math.max(tr[0],t[0]),Math.min(tr[1],t[1])];}
      if(!tr||tr[1]-tr[0]<1e-3)continue;
      if(cl===1){sample(xm,zm,CRo);if(CRo.mud>.3)continue;}
      const XA=xA+ST*tr[0],XB=xA+ST*tr[1],ZA=za+(zb-za)*tr[0],ZB=za+(zb-za)*tr[1];
      const sa=(offEW(j,XA+.5)-offEW(j,XA-.5)),sb=(offEW(j,XB+.5)-offEW(j,XB-.5)),na=[-sa/Math.sqrt(1+sa*sa),1/Math.sqrt(1+sa*sa)],nb=[-sb/Math.sqrt(1+sb*sb),1/Math.sqrt(1+sb*sb)];
      ribbon(XA,XB,ZA,ZB,XA+HALF,XB+HALF,c,cl,na,nb);
    }
  }
  /* the driveways */
  for(const s of ctx.spurs){const ax=s.ax==='x',a0=ax?Math.min(s.x0,s.x1):Math.min(s.z0,s.z1),a1=ax?Math.max(s.x0,s.x1):Math.max(s.z0,s.z1),len=a1-a0,nseg=Math.max(1,Math.ceil(len/ST));
    for(let k=0;k<nseg;k++){const p=a0+len*k/nseg,q=a0+len*(k+1)/nseg,m=(p+q)/2,xm=ax?m:s.x0,zm=ax?s.z0:m;if(!inC(xm,zm))continue;
      const c=s.c||SPUR,cl=s.cl===3?3:2;if(ax)ribbon(p,q,s.z0,s.z0,p,q,c,cl,[0,1],[0,1]);else ribbon(s.x0,s.x0,p,q,p,q,c,cl,[1,0],[1,0]);}}
  /* --- the pads: concrete or gravel laid over their ground --- */
  for(const p of ctx.pads){const a=Math.max(p.x0,x0),b=Math.max(p.z0,z0),c=Math.min(p.x1,x1),d=Math.min(p.z1,z1);if(a>=c||b>=d)continue;
    const nx=Math.max(1,Math.ceil((c-a)/4)),nz=Math.max(1,Math.ceil((d-b)/4)),idx=[],mat=p.surf==='concrete'?MAT.CONCRETE:MAT.GRAVEL;
    for(let j=0;j<=nz;j++){const row=[];for(let i=0;i<=nx;i++){const x=a+(c-a)*i/nx,z=b+(d-b)*j/nz;row.push(RB.v(x,(townD(x,z)<EDGE+8?.12:baseAt(x,z))+.03,z,0,1,0,.4,.4,1,0,mat));}idx.push(row);}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)RB.I.push(idx[j][i],idx[j+1][i],idx[j+1][i+1],idx[j][i],idx[j+1][i+1],idx[j][i+1]);}
  /* --- the town --- */
  if(x1>-EDGE-40&&x0<EDGE+40&&z1>-EDGE-40&&z0<EDGE+40)townStatic(x0,z0,x1,z1,inC,RB,PB,trees,colBox,colCirc,lights,R);
  /* --- the off-road park --- */
  if(x1>PARK.x0-80&&x0<PARK.x1+80&&z1>PARK.z0-80&&z0<PARK.z1+80||x1>PKW.ROADX-30&&x0<PKW.ROADX+30&&z1>-60&&z0<-20)parkStatic(x0,z0,x1,z1,inC,PB,colBox,colCirc);
  /* --- buildings, from the plans: meshed by the chunk their middle is in; colliders wherever they reach --- */
  for(const P of ctx.plans){
    for(const b of P.bld){
      const bx=b.b?(b.b[0]+b.b[2])/2:b.x0!==undefined?(b.x0+b.x1)/2:b.o?b.o[0]:b.x,bz=b.b?(b.b[1]+b.b[3])/2:b.z0!==undefined?(b.z0+b.z1)/2:b.o?b.o[1]:b.z,own=inC(bx,bz);
      building(b,own?PB:null,colBox,colCirc,P.special?NOL:lights,own);
    }
    if(P.name&&P.x!==undefined&&inC(P.x,P.z)&&P.label)labels.push({name:P.name,x:P.x,z:P.z});
    for(const t of P.trees){const [x,z,v]=t;if(!inC(x,z)||x<x0+.9||x>x1-.9||z<z0+.9||z>z1-.9)continue;addTree(x,z,v,.95+hs(Math.round(x),Math.round(z),610)*.35);}
  }
  /* --- power lines along the paved country roads (and some gravel), not on the highway --- */
  const poleLine=(i,j,ns)=>{
    const seed=ns?i*7+1:j*13+5,side=hs(seed,ns?1:2,620)<.5?-1:1,sp=52;
    const posAt=k=>{const s=k*sp;
      if(ns){const cl=clsNSz(i,s);if(cl<2||cl===6||(cl===2&&hs(i,segNS(i,s),621)>.4))return null;const c=CL[cl],d=(c.hw+c.sh+c.dw+2)*side,x=i*L+offNS(i,s)+d;return [x,s,cl];}
      const cl=clsEWx(j,s);if(cl<2||cl===6||(cl===2&&hs(segEW(j,s),j,621)>.4))return null;const c=CL[cl],d=(c.hw+c.sh+c.dw+2)*side,z=j*L+offEW(j,s)+d;return [s,z,cl];};
    const ok=p=>{if(!p)return false;const [x,z]=p;if(townD(x,z)<EDGE+30)return false;
      for(let q=-1;q<=1;q++){const ii=Math.round(x/L)+q;if(ns&&ii===i)continue;const xc=ii*L+offNS(ii,z),cl=clsNSz(ii,z);if(cl&&Math.abs(x-xc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+3)return false;}
      for(let q=-1;q<=1;q++){const jj=Math.round(z/L)+q;if(!ns&&jj===j)continue;const zc=jj*L+offEW(jj,x),cl=clsEWx(jj,x);if(cl&&Math.abs(z-zc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+3)return false;}
      return true;};
    const a0=ns?z0:x0,k0=Math.floor((a0-sp)/sp),k1=Math.ceil((a0+CH+sp)/sp);
    for(let k=k0;k<=k1;k++){const p=posAt(k);if(!ok(p))continue;let [x,z]=p;if(!inC(x,z))continue;
      if(x<x0+.6||x>x1-.6||z<z0+.6||z>z1-.6)continue;
      const y=sample(x,z,CRo).h,h=9;if(CRo.code===SF.water)continue;
      PB.bar([x,y-.5,z],[x,y+h,z],.13,POLE_COL,MAT.WOOD);
      const ax=ns?[0,1]:[1,0];PB.bar([x-ax[0]*1.3,y+h-.5,z-ax[1]*1.3],[x+ax[0]*1.3,y+h-.5,z+ax[1]*1.3],.07,POLE_COL,MAT.WOOD);
      colCirc(x,z,.22,y+h);
      let q=posAt(k+1);if(!ok(q))q=null;
      if(q){const yq=sample(q[0],q[1],CRo).h;for(const o of [-1.1,0,1.1]){const ox=ax[0]*o,oz=ax[1]*o,A=[x+ox,y+h-.35,z+oz],Bp=[q[0]+ox,yq+h-.35,q[1]+oz];let prev=A;
        for(let t=1;t<=4;t++){const u=t/4,P=[A[0]+(Bp[0]-A[0])*u,A[1]+(Bp[1]-A[1])*u-1.1*4*u*(1-u),A[2]+(Bp[2]-A[2])*u];PB.bar(prev,P,.018,WIRE_COL,MAT.COL);prev=P;}}}
    }
  };
  for(const i of nsL)poleLine(i,0,true);
  for(const j of ewL)poleLine(0,j,false);
  /* --- where the highway runs out onto the salt: barrels across it and a sign --- */
  for(const sg of [-1,1]){const x=sg*HWY_X,z=0;if(!inC(x,z))continue;const y=baseAt(x,z),c=CL[6];
    for(let d=-c.hw+1;d<=c.hw-1;d+=2.4){const bz=d;PB.cyl(x,bz,y,y+1.1,.36,10,lc(240,110,20),MAT.COL,0);PB.cyl(x,bz,y+.62,y+.82,.37,10,lc(240,240,240),MAT.COL,-1,.4);colCirc(x,bz,.4,y+1.1);}
    PB.bar([x+sg*1.5,y-.3,-c.hw-2],[x+sg*1.5,y+2.6,-c.hw-2],.07,lc(170,170,170),MAT.METAL);PB.bar([x+sg*1.5,y-.3,c.hw+2],[x+sg*1.5,y+2.6,c.hw+2],.07,lc(170,170,170),MAT.METAL);
    PB.box(x+sg*1.5-.06,y+1.55,-c.hw-2.2,x+sg*1.5+.06,y+2.65,c.hw+2.2,lc(40,40,44),MAT.COL);
    /* (read by a driver heading out of town: facing back toward it, left to right for them) */
    const px=.12,len=9*6*px-px;neonWord(PB,'ROAD ENDS',[x+sg*1.5-sg*.08,y+1.68,-sg*len/2],[0,0,sg],[-sg,0,0],px,[1,.6,.12],0,0,null);}
  /* --- the salt's ramps: concrete laid over the ground's own bumps --- */
  if(saltD((x0+x1)/2,(z0+z1)/2)>LAND+SALT_BL-120){
    for(let i=Math.floor(x0/RCELL)-1;i<=Math.floor(x1/RCELL)+1;i++)for(let j=Math.floor(z0/RCELL)-1;j<=Math.floor(z1/RCELL)+1;j++)for(const r of rampsIn(i,j)){
      if(!inC(r.mx,r.mz))continue;const nu=Math.ceil(r.L/1.5),nv=8,grid=[];
      for(let a=0;a<=nu;a++){const u=r.L*a/nu,row=[];for(let b=0;b<=nv;b++){const v=-r.hw+2*r.hw*b/nv,x=r.ox+r.dx*u-r.dz*v,z=r.oz+r.dz*u+r.dx*v;
        row.push([x,SALT_Y+rampHeight(r,x,z)+.03,z]);}grid.push(row);}
      for(let a=0;a<nu;a++)for(let b=0;b<nv;b++){const p=grid[a][b],q=grid[a+1][b],s=grid[a+1][b+1],t=grid[a][b+1];
        if(p[1]<SALT_Y+.06&&q[1]<SALT_Y+.06&&s[1]<SALT_Y+.06&&t[1]<SALT_Y+.06)continue;
        const lip=r.kind!=='table'&&Math.abs((a+.5)/nu*r.L-r.Lf-r.T)<1.2,chev=(a+.5)/nu*r.L<r.Lf&&Math.abs(((a+.5)/nu*r.L+Math.abs(-r.hw+2*r.hw*(b+.5)/nv)*.7)%6-3)<.6;
        RB.quad(p,t,s,q,lip?lc(230,180,30):chev?lc(220,210,190):lc(150,146,138),lip||chev?MAT.COL:MAT.CONCRETE,lip?.25:0);}}}
  /* --- the trees: woods in the hills, cottonwoods by the creeks, the odd one in a pasture --- */
  function addTree(x,z,v,sc){const y=sample(x,z,CRo).h;if(CRo.code===SF.water||CRo.code===SF.asphalt)return;
    const pine=v>=3&&v<5,palm=v>=5,t=palm?[86,110,52]:pine?[52,74,46]:hs(Math.round(x*3),Math.round(z*3),630)<.5?[70,96,44]:[88,104,50],j1=hs(Math.round(x*7),Math.round(z*7),631),j2=hs(Math.round(x*5),Math.round(z*5),632);
    trees.push(x,y,z,j1*6.283,sc*(.9+j2*.2),sc*(.92+j1*.2),sc*(.9+j2*.2),v,s2l(t[0]+(j1-.5)*18),s2l(t[1]+(j2-.5)*18),s2l(t[2]+(j1-.5)*12),0);
    cols.push({t:'c',x,z,r:palm?.32*sc:.35*sc+.15,top:y+(palm?8:(pine?1.6:2.4)+(pine?2.2:3.4))*sc});}
  townTrees(x0,z0,x1,z1,inC,addTree);
  {const G=6.2,n=Math.floor(CH/G),cr={};
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const r1=R(),r2=R(),r3=R(),r4=R();
      const x=Math.min(x1-.9,Math.max(x0+.9,x0+(i+.15+r1*.7)*G)),z=Math.min(z1-.9,Math.max(z0+.9,z0+(j+.15+r2*.7)*G));
      if(townD(x,z)<EDGE+60)continue;const pd=parkD(x,z);if(pd<40&&(r3>.05||!PKW.clear(x,z)))continue;const sd=saltD(x,z);if(sd>LAND-60)continue;
      const k=hillK(x,z),wn=fbm(x/900+2.2,z/900-4.4,2,121),woods=sst(.56-.2*k,.66-.2*k,wn)*.55*(1-sst(LAND-900,LAND-300,sd));
      creekAt(x,z,cr);let p=Math.max(woods,cr.dc>5&&cr.dc<24?.3:0,.012*(1-sst(LAND-900,LAND-200,sd)));
      if(p<.02&&r3>.02)continue;if(r3>p)continue;
      /* not on a road, a pad, or in the water */
      let near=false;
      for(const ii of nsL){const xc=ii*L+offNS(ii,z),cl=clsNSz(ii,z);if(cl&&Math.abs(x-xc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+2.5){near=true;break;}}
      if(!near)for(const jj of ewL){const zc=jj*L+offEW(jj,x),cl=clsEWx(jj,x);if(cl&&Math.abs(z-zc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+2.5){near=true;break;}}
      if(!near)for(const q of ctx.pads)if(x>q.x0-4&&x<q.x1+4&&z>q.z0-4&&z<q.z1+4){near=true;break;}
      if(!near)for(const s of ctx.spurs){const ax=s.ax==='x';if(ax?(Math.abs(z-s.z0)<5&&x>Math.min(s.x0,s.x1)-3&&x<Math.max(s.x0,s.x1)+3):(Math.abs(x-s.x0)<5&&z>Math.min(s.z0,s.z1)-3&&z<Math.max(s.z0,s.z1)+3)){near=true;break;}}
      if(near||cr.dc<4.5)continue;
      if(Math.hypot(x-BOG.x,z-BOG.z)<BOG.r+8)continue;
      const pine=(k>.45&&r4<.65)||r4<.12;addTree(x,z,pine?3+(r4*10%2|0):(r4*30%3|0),.85+R()*.5);}}
  /* how far its meshes reach (buildings stick out of their chunk, and up): for the culling */
  let bb=[0,1e9,0,CH,-1e9,CH];for(const Bm of [RB,PB]){const P=Bm.P;for(let i=0;i<P.length;i+=3){if(P[i]<bb[0])bb[0]=P[i];if(P[i]>bb[3])bb[3]=P[i];if(P[i+1]<bb[1])bb[1]=P[i+1];if(P[i+1]>bb[4])bb[4]=P[i+1];if(P[i+2]<bb[2])bb[2]=P[i+2];if(P[i+2]>bb[5])bb[5]=P[i+2];}}
  return {cx,cz,roads:RB.n?RB.out():null,props:PB.n?PB.out():null,trees:new Float32Array(trees),cols,lights,labels,bb:[x0+bb[0],bb[1],z0+bb[2],x0+bb[3],bb[4],z0+bb[5]]};
}
const CRo={},NOL=[];
/* where the highway's asphalt stops on the salt, east and west */
const HWY_X=(()=>{let x=LAND;while(x<LAND+3000&&saltD(x,0)<=HWY_SALT)x+=2;return x-6;})();

/* ---------- a neon word: runs of lit pixels from the 5 x 7 font as glowing quads, on a dark board ----------
   o: its bottom-left corner [x,y,z] (on the face, the board behind it); rt: along the word; n: out of the face */
function neonWord(B,word,o,rt,n,px,col,ox,oz,lights){
  if(!B)return;const len=word.length*6*px-px,ex=.06,cx=o[0]+rt[0]*len/2,cz=o[2]+rt[2]*len/2;
  /* the board */
  const bl=[o[0]-rt[0]*.25+n[0]*.02,o[1]-.22,o[2]-rt[2]*.25+n[2]*.02],h=7*px+.44,wd=len+.5;
  B.quad(bl,[bl[0]+rt[0]*wd,bl[1],bl[2]+rt[2]*wd],[bl[0]+rt[0]*wd,bl[1]+h,bl[2]+rt[2]*wd],[bl[0],bl[1]+h,bl[2]],lc(28,28,32),MAT.COL);
  const P=(u,y)=>[o[0]+rt[0]*u+n[0]*ex,o[1]+y,o[2]+rt[2]*u+n[2]*ex];
  for(let k=0;k<word.length;k++){const g=F5[word[k]];if(!g)continue;
    for(let r=0;r<7;r++){let c=0;while(c<5){if(!((g[r]>>(4-c))&1)){c++;continue;}let e=c;while(e+1<5&&((g[r]>>(4-e-1))&1))e++;
      const u0=(k*6+c)*px+px*.12,u1=(k*6+e+1)*px-px*.12,y0=(6-r)*px+px*.12,y1=(7-r)*px-px*.12;
      B.quad(P(u0,y0),P(u1,y0),P(u1,y1),P(u0,y1),col,MAT.EMIT,2.6);c=e+1;}}}
  if(lights)lights.push({p:[cx+n[0]*.9,o[1]+3.5*px,cz+n[2]*.9],r:12,c:[col[0]*2.4,col[1]*2.4,col[2]*2.4],g:1});
}

/* ---------- the town in one chunk: its streets, sidewalks, buildings, lamps, signals and neon ---------- */
const CURB=lc(150,148,142),ROOF=lc(46,46,50),PARAPET=lc(96,94,90),MEDIAN=lc(130,128,122),SIG_COL=lc(45,48,40);
function townStatic(x0,z0,x1,z1,inC,RB,PB,trees,colBox,colCirc,lights,Rn){
  const T=TW,y=0,lift=.035;
  /* a straight street piece: 4 m strips, red = metres along, green = metres across, blue = class, alpha = half width */
  for(const s of T.roads){const c=TCLS[s.kind],a0=Math.min(s.a,s.b),a1=Math.max(s.a,s.b),n=Math.max(1,Math.ceil((a1-a0)/4));
    for(let k=0;k<n;k++){const a=a0+(a1-a0)*k/n,b=a0+(a1-a0)*(k+1)/n,m=(a+b)/2,xm=s.ax==='x'?m:s.line,zm=s.ax==='x'?s.line:m;if(!inC(xm,zm))continue;
      const D=[-c.hw,-c.hw/2,0,c.hw/2,c.hw],row=t=>D.map(d=>s.ax==='x'?RB.v(t,y+lift,s.line+d,0,1,0,(t+HALF)%1200,d,c.cls,c.hw,MAT.ROAD):RB.v(s.line-d,y+lift,t,0,1,0,(t+HALF)%1200,d,c.cls,c.hw,MAT.ROAD));
      const ra=row(a),rb=row(b);for(let q=0;q<D.length-1;q++)RB.I.push(ra[q],rb[q],rb[q+1],ra[q],rb[q+1],ra[q+1]);}}
  /* the boulevard's corners: the same, round an arc (green out from its middle) */
  for(const A of T.arcs){const c=TCLS.ring,span=(A.a1-A.a0),ang0=A.a0+Math.sign(span)*(TCLS.ave.hw/A.r),ang1=A.a1-Math.sign(span)*(TCLS.ave.hw/A.r),n=Math.ceil(Math.abs(ang1-ang0)*A.r/3);
    for(let k=0;k<n;k++){const t0=ang0+(ang1-ang0)*k/n,t1=ang0+(ang1-ang0)*(k+1)/n,tm=(t0+t1)/2;if(!inC(A.cx+Math.cos(tm)*A.r,A.cz+Math.sin(tm)*A.r))continue;
      const D=[-c.hw,-c.hw/2,0,c.hw/2,c.hw],row=t=>D.map(d=>RB.v(A.cx+Math.cos(t)*(A.r+d),y+lift,A.cz+Math.sin(t)*(A.r+d),0,1,0,(t*A.r*Math.sign(span)+5000)%1200,d,c.cls,c.hw,MAT.ROAD));
      const ra=row(t0),rb=row(t1);for(let q=0;q<D.length-1;q++)RB.I.push(ra[q],rb[q],rb[q+1],ra[q],rb[q+1],ra[q+1]);}}
  /* the intersections: plain tarmac with a zebra on each side (class 11; alpha packs both half widths) */
  for(const n of T.jn){if(!inC(n.x,n.z))continue;const pk2=Math.round(n.hx*10)+Math.round(n.hz*10)/1000;
    const v=(dx,dz)=>RB.v(n.x+dx,y+lift,n.z+dz,0,1,0,dx,dz,11,pk2,MAT.ROAD),a=v(-n.hx,-n.hz),b=v(n.hx,-n.hz),c=v(n.hx,n.hz),d=v(-n.hx,n.hz);RB.I.push(a,d,c,a,c,b);}
  /* the ring's medians and Central's: low concrete islands (a car rides over them) */
  for(const s of T.roads){if(s.kind!=='ring'&&s.kind!=='main')continue;const w=s.kind==='ring'?.7:.6,a0=Math.min(s.a,s.b)+3,a1=Math.max(s.a,s.b)-3;
    for(let a=a0;a<a1;a+=40){const b=Math.min(a1,a+40),m=(a+b)/2;if(!(s.ax==='x'?inC(m,s.line):inC(s.line,m)))continue;
      if(s.ax==='x')PB.box(a,y,s.line-w,b,y+.16,s.line+w,MEDIAN,MAT.CONCRETE,0,'b');else PB.box(s.line-w,y,a,s.line+w,y+.16,b,MEDIAN,MAT.CONCRETE,0,'b');}}
  /* sidewalks: a band round each block, a curb at the road side */
  /* (in 8 m tiles, each drawn by the chunk its middle is in, so a long band never sticks out of its chunk) */
  const walk=(ax0,az0,ax1,az1)=>{if(ax1-ax0<.2||az1-az0<.2)return;
    const nx=Math.max(1,Math.ceil((ax1-ax0)/8)),nz=Math.max(1,Math.ceil((az1-az0)/8));
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=ax0+(ax1-ax0)*i/nx,b=az0+(az1-az0)*j/nz,c=ax0+(ax1-ax0)*(i+1)/nx,d=az0+(az1-az0)*(j+1)/nz;
      if(!inC((a+c)/2,(b+d)/2))continue;RB.quad([a,y+.15,b],[a,y+.15,d],[c,y+.15,d],[c,y+.15,b],[.4,.4,.4],MAT.CONCRETE);}};
  const curb=(ax,az,bx,bz)=>{const mx=(ax+bx)/2,mz=(az+bz)/2;if(!inC(mx,mz))return;
    PB.quad([ax,y,az],[bx,y,bz],[bx,y+.15,bz],[ax,y+.15,az],CURB,MAT.CONCRETE);};
  for(const b of T.walks){const {x0:a,z0:c,x1:d,z1:e,sw}=b;
    if(b.corner){/* the corner blocks: sidewalks along their two inner edges only; the boulevard's arc has its own */
      const sx=Math.sign(b.cx),sz=Math.sign(b.cz);
      if(sx>0)walk(a,c,a+sw.w,e);else walk(d-sw.e,c,d,e);
      if(sz>0)walk(a,c,d,c+sw.n);else walk(a,e-sw.s,d,e);continue;}
    /* split into 32 m pieces so each chunk draws its own */
    walk(a,c,d,c+sw.n);walk(a,e-sw.s,d,e);walk(a,c+sw.n,a+sw.w,e-sw.s);walk(d-sw.e,c+sw.n,d,e-sw.s);
    for(let x=a;x<d;x+=16){const xb=Math.min(d,x+16);curb(x,c,xb,c);curb(xb,e,x,e);}
    for(let z=c;z<e;z+=16){const zb=Math.min(e,z+16);curb(a,zb,a,z);curb(d,z,d,zb);}
    /* the ground inside the sidewalks: paved, but for the yards in the Heights and the park */
    if(b.district!=='park'&&b.district!=='residential'){const lx0=a+sw.w,lx1=d-sw.e,lz0=c+sw.n,lz1=e-sw.s,n1=Math.max(1,Math.ceil((lx1-lx0)/16)),n2=Math.max(1,Math.ceil((lz1-lz0)/16));
      for(let i=0;i<n1;i++)for(let j=0;j<n2;j++){const p0=lx0+(lx1-lx0)*i/n1,p1=lx0+(lx1-lx0)*(i+1)/n1,q0=lz0+(lz1-lz0)*j/n2,q1=lz0+(lz1-lz0)*(j+1)/n2;
        if(!inC((p0+p1)/2,(q0+q1)/2))continue;if(b.corner&&Math.hypot(Math.max(0,Math.abs((p0+p1)/2)-S_IN),Math.max(0,Math.abs((q0+q1)/2)-S_IN))>CORNER-19)continue;
        RB.quad([p0,y+.13,q0],[p0,y+.13,q1],[p1,y+.13,q1],[p1,y+.13,q0],[.4,.4,.4],MAT.CONCRETE);}}
    if(b.district==='park'){/* grass, and a path round it */
      const cx=(a+d)/2,cz=(c+e)/2,rx=(d-a)*.32,rz=(e-c)*.32;for(let k=0;k<48;k++){const t0=k/48*Math.PI*2,t1=(k+1)/48*Math.PI*2,tm=(t0+t1)/2;if(!inC(cx+Math.cos(tm)*rx,cz+Math.sin(tm)*rz))continue;
        const p=(t,r)=>[cx+Math.cos(t)*rx*r,y+.17,cz+Math.sin(t)*rz*r];RB.quad(p(t0,.94),p(t0,1.06),p(t1,1.06),p(t1,.94),[.4,.4,.4],MAT.CONCRETE);}}}
  /* the boulevard's inner sidewalk round its arcs, and its outer band */
  for(const A of T.arcs){for(const [r0,r1] of [[A.r-14-5,A.r-14],[A.r+14,A.r+19]]){const n=Math.ceil(Math.abs(A.a1-A.a0)*r1/4);
    for(let k=0;k<n;k++){const t0=A.a0+(A.a1-A.a0)*k/n,t1=A.a0+(A.a1-A.a0)*(k+1)/n,tm=(t0+t1)/2,rm=(r0+r1)/2;if(!inC(A.cx+Math.cos(tm)*rm,A.cz+Math.sin(tm)*rm))continue;
      const p=(t,r)=>[A.cx+Math.cos(t)*r,y+.15,A.cz+Math.sin(t)*r];RB.quad(p(t0,r0),p(t0,r1),p(t1,r1),p(t1,r0),[.4,.4,.4],MAT.CONCRETE);}}}
  for(const sg of [-1,1])for(const ax of ['x','z']){/* the outer band along the straight sides, cut where the roads leave */
    const cut=ax==='x'?TCLS.hwy.hw:TCLS.main.hw;
    for(let a=-S_IN;a<S_IN;a+=16){const b=a+16;if(Math.abs(a+8)<cut+2)continue;
      if(ax==='x')walk(sg>0?RING+14:-RING-19,a,sg>0?RING+19:-RING-14,b);else walk(a,sg>0?RING+14:-RING-19,b,sg>0?RING+19:-RING-14);}}
  /* --- the buildings --- */
  for(const q of T.lots){const mx=(q.x0+q.x1)/2,mz=(q.z0+q.z1)/2,own=inC(mx,mz);
    colBox(q.x0,q.z0,q.x1,q.z1,y+q.h);if(!own)continue;
    const tint=lc(...q.tint),fa=q.style+(q.shops?5:0)+(Math.floor(q.seed*36)+.5)/40;
    const wall=(ax0,az0,ax1,az1,ya,yb,f)=>{/* the four walls as facade, the roof a dark deck with a parapet */
      PB.quad([ax0,ya,az0],[ax0,yb,az0],[ax1,yb,az0],[ax1,ya,az0],tint,MAT.FACADE,f);PB.quad([ax1,ya,az1],[ax1,yb,az1],[ax0,yb,az1],[ax0,ya,az1],tint,MAT.FACADE,f);
      PB.quad([ax0,ya,az1],[ax0,yb,az1],[ax0,yb,az0],[ax0,ya,az0],tint,MAT.FACADE,f);PB.quad([ax1,ya,az0],[ax1,yb,az0],[ax1,yb,az1],[ax1,ya,az1],tint,MAT.FACADE,f);
      PB.quad([ax0,yb,az0],[ax0,yb,az1],[ax1,yb,az1],[ax1,yb,az0],ROOF,MAT.COL);
      const pt=.3,ph=1;for(const [bx0,bz0,bx1,bz1] of [[ax0,az0,ax1,az0+pt],[ax0,az1-pt,ax1,az1],[ax0,az0,ax0+pt,az1],[ax1-pt,az0,ax1,az1]])PB.box(bx0,yb,bz0,bx1,yb+ph,bz1,PARAPET,MAT.COL,0,'b');};
    if(q.tower){const p=q.tower,i=p.i;wall(q.x0,q.z0,q.x1,q.z1,y,y+p.p,fa);wall(q.x0+i,q.z0+i,q.x1-i,q.z1-i,y+p.p,y+q.h,fa);
      PB.box(mx-.15,y+q.h+1,mz-.15,mx+.15,y+q.h+1.4,mz+.15,[1,.06,.04],MAT.EMIT,3);}
    else wall(q.x0,q.z0,q.x1,q.z1,y,y+q.h,fa);
    /* rooftop units */
    const R2=rng(Math.floor(q.seed*1e9)+7),ni=1+(R2()*3|0),ix0=q.x0+(q.tower?q.tower.i:0),iz0=q.z0+(q.tower?q.tower.i:0),ix1=q.x1-(q.tower?q.tower.i:0),iz1=q.z1-(q.tower?q.tower.i:0);
    for(let k=0;k<ni;k++){const w=1.2+R2()*2.5,l=1.2+R2()*3,h=.8+R2()*1.6;if(ix1-ix0<w+4||iz1-iz0<l+4)break;const px=ix0+2+R2()*(ix1-ix0-4-w),pz=iz0+2+R2()*(iz1-iz0-4-l);
      PB.box(px,y+q.h,pz,px+w,y+q.h+h,pz+l,lc(120,122,125),MAT.METAL,0,'b');}}
  /* --- lamps --- */
  for(const l of T.lamps){if(!inC(l.x,l.z))continue;colCirc(l.x,l.z,.15,y+8);
    if(l.t==='arm'){const top=y+l.h,hx=l.x+l.dir[0]*l.arm,hz=l.z+l.dir[1]*l.arm,col=l.led?[.9,.95,1]:[1,.7,.4];
      PB.bar([l.x,y,l.z],[l.x,top+.1,l.z],.09,LAMP_COL,MAT.METAL);PB.bar([l.x,top+.1,l.z],[hx,top,hz],.05,LAMP_COL,MAT.METAL);
      PB.box(hx-.3,top-.1,hz-.18,hx+.3,top-.04,hz+.18,col,MAT.EMIT,2.2);
}
    else if(l.t==='twin'){const top=y+9,ax=l.ax==='z'?[1,0]:l.ax==='x'?[0,1]:[Math.cos(l.ang),Math.sin(l.ang)];
      PB.bar([l.x,y,l.z],[l.x,top,l.z],.12,LAMP_COL,MAT.METAL);
      for(const sd of [1,-1]){const hx=l.x+ax[0]*sd*4.2,hz=l.z+ax[1]*sd*4.2;PB.bar([l.x,top,l.z],[hx,top+.6,hz],.06,LAMP_COL,MAT.METAL);
        PB.box(hx-.32,top+.52,hz-.16,hx+.32,top+.58,hz+.16,[.92,.95,1],MAT.EMIT,2.2);
}}
    else{const top=y+4.5;PB.bar([l.x,y,l.z],[l.x,top,l.z],.07,LAMP_COL,MAT.METAL);PB.box(l.x-.2,top,l.z-.2,l.x+.2,top+.4,l.z+.2,[1,.85,.6],MAT.EMIT,1.6);
}}
  /* --- the signals: a mast at each corner, an arm over each road, heads facing both ways along it ---
     (the heads' lamps are the road shader's 61: red, amber, green on the cycle, by which road they face) */
  for(const s of T.sigs){if(!inC(s.x,s.z))continue;colCirc(s.x,s.z,.15,y+6.2);
    PB.bar([s.x,y,s.z],[s.x,y+6.2,s.z],.11,SIG_COL,MAT.METAL);
    for(const [dx,dz,axis] of [[s.ax,0,0],[0,s.az,1]]){const Lr=Math.hypot(dx,dz);if(!Lr)continue;const ux=dx/Lr,uz=dz/Lr;
      PB.bar([s.x,y+5.9,s.z],[s.x+dx,y+5.9,s.z+dz],.07,SIG_COL,MAT.METAL);
      for(const t of [.55,.92]){const hx=s.x+dx*t,hz=s.z+dz*t,fx=-uz,fz=ux;
        PB.box(hx-.18,y+4.77,hz-.18,hx+.18,y+5.73,hz+.18,lc(30,32,26),MAT.COL,0,'b');
        for(const sd of [1,-1])for(let l=0;l<3;l++){const yy=y+5.6-l*.33,cxx=hx+fx*sd*.185,czz=hz+fz*sd*.185,rx=-fz*sd*.1,rz=fx*sd*.1;
          PB.quad([cxx-rx,yy-.1,czz-rz],[cxx+rx,yy-.1,czz+rz],[cxx+rx,yy+.1,czz+rz],[cxx-rx,yy+.1,czz-rz],[l,axis,s.ph],MAT.SIGNAL,1);}}}}
  /* --- neon: words on boards, blade signs, strips; the glow from the shopfronts --- */
  for(const g of T.signs){
    if(g.t==='word'){if(!inC(g.o[0],g.o[1]))continue;const n3=[g.n[0],0,g.n[1]],rt3=[g.rt[0],0,g.rt[1]];
      neonWord(PB,g.word,[g.o[0]+g.n[0]*.32,g.h0,g.o[1]+g.n[1]*.32],rt3,n3,g.px,g.col,0,0,null);}
    else if(g.t==='blade'){if(!inC(g.o[0],g.o[1]))continue;const px=.15,lh=9*px,len=g.word.length*lh,out=1.9,c0=[g.o[0]+g.n[0]*(out/2+.3),g.o[1]+g.n[1]*(out/2+.3)];
      const nx=g.n[0],nz=g.n[1],rx=g.rt[0],rz=g.rt[1];
      PB.box(Math.min(c0[0]-nx*out/2-rx*.09,c0[0]+nx*out/2+rx*.09),g.h0,Math.min(c0[1]-nz*out/2-rz*.09,c0[1]+nz*out/2+rz*.09),Math.max(c0[0]-nx*out/2-rx*.09,c0[0]+nx*out/2+rx*.09),g.h0+len+.4,Math.max(c0[1]-nz*out/2-rz*.09,c0[1]+nz*out/2+rz*.09),lc(25,25,30),MAT.COL);
      for(const sgn of [1,-1])for(let k=0;k<g.word.length;k++){const hh=g.h0+len-(k+1)*lh+px+.2,rs=sgn>0?1:-1,fp=[c0[0]+rx*sgn*.13-nx*rs*2.5*px,c0[1]+rz*sgn*.13-nz*rs*2.5*px];
        neonWord(PB,g.word[k],[fp[0],hh,fp[1]],[nx*rs,0,nz*rs],[rx*sgn,0,rz*sgn],px,g.col,0,0,null);}
}
    else{const mx=(g.a[0]+g.b[0])/2,mz=(g.a[1]+g.b[1])/2;if(!inC(mx,mz))continue;
      PB.bar([g.a[0]+g.n[0]*.12,4.55,g.a[1]+g.n[1]*.12],[g.b[0]+g.n[0]*.12,4.55,g.b[1]+g.n[1]*.12],.035,g.col,MAT.EMIT,2.4);
}}
}
/* the town's palms and the park's trees */
function townTrees(x0,z0,x1,z1,inC,addTree){
  for(const p of TW.palms){if(!inC(p[0],p[1]))continue;addTree(p[0],p[1],p[2],p[3]);}
}

/* one described building into the props mesh (when this chunk owns it), its colliders, its lights */
function building(b,B,colBox,colCirc,lights,own){
  if(b.t==='box'){const [a,c,d,e]=b.b,y=Math.min(baseAt(a,c),baseAt(d,e),baseAt(a,e),baseAt(d,c)),y0=y-.6,y1=y+b.h,m=b.mat||MAT.COL;
    colBox(a,c,d,e,y1+(b.rh||0));if(!B)return;
    B.box(a,y0,c,d,y1,e,b.col,m,m===MAT.SHEET?1:0,'b');
    if(b.roof==='gable'){const rh=b.rh,rc=b.rc,rm=b.rmat||MAT.COL;
      if(b.ra==='x'){const zm=(c+e)/2;B.quad([a-.3,y1-.1,c-.4],[a-.3,y1+rh,zm],[d+.3,y1+rh,zm],[d+.3,y1-.1,c-.4],rc,rm);B.quad([a-.3,y1-.1,e+.4],[d+.3,y1-.1,e+.4],[d+.3,y1+rh,zm],[a-.3,y1+rh,zm],rc,rm);
        B.tri([a,y1,c],[a,y1,e],[a,y1+rh,zm],b.col,m);B.tri([d,y1,c],[d,y1+rh,zm],[d,y1,e],b.col,m);}
      else{const xm=(a+d)/2;B.quad([a-.4,y1-.1,c-.3],[d+.4,y1-.1,c-.3],[xm,y1+rh,c-.3],[xm,y1+rh,c-.3],rc,rm);
        B.quad([a-.4,y1-.1,c-.3],[xm,y1+rh,c-.3],[xm,y1+rh,e+.3],[a-.4,y1-.1,e+.3],rc,rm);B.quad([d+.4,y1-.1,c-.3],[d+.4,y1-.1,e+.3],[xm,y1+rh,e+.3],[xm,y1+rh,c-.3],rc,rm);
        B.tri([a,y1,c],[xm,y1+rh,c],[d,y1,c],b.col,m);B.tri([a,y1,e],[d,y1,e],[xm,y1+rh,e],b.col,m);}}
    else B.box(a-.2,y1,c-.2,d+.2,y1+.3,e+.2,lc(90,86,80),MAT.COL);
    /* a door and two windows on the long side facing the road */
    if(b.h<6){const dc=lc(40,34,30),wc=[.05,.06,.07],zf=c-.03,xm=(a+d)/2;B.quad([xm-.5,y,zf],[xm-.5,y+2.1,zf],[xm+.5,y+2.1,zf],[xm+.5,y,zf],dc,MAT.COL);
      for(const o of [-.3,.3]){const xw=a+(d-a)*(.5+o);B.quad([xw-.6,y+1.1,zf],[xw-.6,y+2,zf],[xw+.6,y+2,zf],[xw+.6,y+1.1,zf],wc,MAT.COL,.15);}}
    return;}
  if(b.t==='cyl'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,b.r,y+b.h);if(B){B.cyl(b.x,b.z,y-.5,y+b.h,b.r,14,b.col,b.mat||MAT.SHEET,b.cone);}return;}
  if(b.t==='lamp'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,.2,y+b.h);if(own)lights.push({p:[b.x,y+b.h-.3,b.z],r:26,c:[3.4,2.9,2.1],d:[0,-1,0],cs:Math.cos(1.15),g:1});
    if(B){B.bar([b.x,y-.4,b.z],[b.x,y+b.h,b.z],.11,POLE_COL,MAT.WOOD);B.box(b.x-.35,y+b.h-.45,b.z-.25,b.x+.35,y+b.h-.15,b.z+.25,[1,.9,.7],MAT.EMIT,1.4);}return;}
  if(b.t==='sign'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,.25,y+5);if(B){B.bar([b.x,y-.3,b.z],[b.x,y+5,b.z],.14,lc(70,70,74),MAT.METAL);B.box(b.x-2.4,y+3.4,b.z-.12,b.x+2.4,y+5.2,b.z+.12,lc(200,40,30),MAT.COL,0);
    B.box(b.x-2.1,y+3.7,b.z+.13,b.x+2.1,y+4.9,b.z+.15,[1,.85,.5],MAT.EMIT,.9);}return;}
  if(b.t==='neon'){const y=baseAt(b.o[0],b.o[1]);neonWord(B,b.word,[b.o[0],y+b.h0,b.o[1]],[b.rt[0],0,b.rt[1]],[b.n[0],0,b.n[1]],b.px,b.col,0,0,own?lights:null);return;}
  if(b.t==='canopy'){const [a,c,d,e]=b.b,y=baseAt((a+d)/2,(c+e)/2);
    for(const [x,z] of [[a+1,c+1],[d-1,c+1],[a+1,e-1],[d-1,e-1]])colCirc(x,z,.3,y+b.h);
    if(own)lights.push({p:[(a+d)/2,y+b.h-.4,(c+e)/2],r:22,c:[4,3.8,3.4],d:[0,-1,0],cs:Math.cos(1.2),g:1});
    if(!B)return;for(const [x,z] of [[a+1,c+1],[d-1,c+1],[a+1,e-1],[d-1,e-1]])B.bar([x,y-.3,z],[x,y+b.h,z],.2,lc(220,220,220),MAT.COL);
    B.box(a,y+b.h,c,d,y+b.h+.9,e,lc(220,40,40),MAT.COL);B.box(a+2,y+b.h-.05,c+2,d-2,y+b.h,e-2,[1,.95,.85],MAT.EMIT,.8,'t');
    for(const x of [a+8,d-8]){B.box(x-.5,y,(c+e)/2-.3,x+.5,y+1.7,(c+e)/2+.3,lc(210,210,214),MAT.COL);colBox(x-.6,(c+e)/2-.4,x+.6,(c+e)/2+.4,y+1.7);}
    return;}
  if(b.t==='garage'){const {x0:a,z0:c,x1:d,z1:e,h}=b,y=baseAt((a+d)/2,(c+e)/2),[d0,d1,dh]=b.door,wc=lc(188,192,196),tr=lc(60,64,70),t=.3;
    /* walls as colliders: back, sides, and the front either side of the door */
    colBox(a,c,d,c+t,y+h);colBox(a,c,a+t,e,y+h);colBox(d-t,c,d,e,y+h);colBox(a,e-t,d0,e,y+h);colBox(d1,e-t,d,e,y+h);
    if(own){lights.push({p:[(d0+d1)/2,y+dh+.8,e+1.2],r:30,c:[4.2,3.8,3.2],d:[0,-.8,.6],cs:Math.cos(1.2),g:1});
    lights.push({p:[(a+d)/2,y+h-.6,(c+e)/2],r:26,c:[3.6,3.6,3.4],d:[0,-1,0],cs:Math.cos(1.35),g:1});}
    if(!B)return;
    B.box(a,y-.6,c,d,y+h,c+t,wc,MAT.SHEET,1);B.box(a,y-.6,c,a+t,y+h,e,wc,MAT.SHEET,1);B.box(d-t,y-.6,c,d,y+h,e,wc,MAT.SHEET,1);
    B.box(a,y-.6,e-t,d0,y+h,e,wc,MAT.SHEET,1);B.box(d1,y-.6,e-t,d,y+h,e,wc,MAT.SHEET,1);B.box(d0,y+dh,e-t,d1,y+h,e,wc,MAT.SHEET,1);
    /* trim, the gable roof and the door frame */
    const rh=2.4,xm=(a+d)/2,rc=lc(120,40,32);
    B.quad([a-.5,y+h,c-.5],[xm,y+h+rh,c-.5],[xm,y+h+rh,e+.5],[a-.5,y+h,e+.5],rc,MAT.SHEET);B.quad([d+.5,y+h,c-.5],[d+.5,y+h,e+.5],[xm,y+h+rh,e+.5],[xm,y+h+rh,c-.5],rc,MAT.SHEET);
    B.tri([a,y+h,e],[d,y+h,e],[xm,y+h+rh,e],wc,MAT.SHEET,1);B.tri([a,y+h,c],[xm,y+h+rh,c],[d,y+h,c],wc,MAT.SHEET,1);
    B.box(d0-.4,y,e-.05,d0,y+dh+.4,e+.15,tr,MAT.METAL);B.box(d1,y,e-.05,d1+.4,y+dh+.4,e+.15,tr,MAT.METAL);B.box(d0-.4,y+dh,e-.05,d1+.4,y+dh+.4,e+.15,tr,MAT.METAL);
    B.box(d0,y+dh+.05,e-.1,d1,y+dh+.9,e-.02,lc(80,84,90),MAT.METAL);
    /* inside: a workbench, a tool chest, a lift */
    B.box(a+1,y,c+1,a+7,y+.95,c+2,lc(110,80,50),MAT.WOOD);B.box(d-4,y,c+1,d-1.4,y+1.2,c+2,lc(180,30,30),MAT.COL);
    for(const x of [a+12,a+16])B.box(x-.25,y,c+6,x+.25,y+3.5,c+6.5,lc(30,90,170),MAT.COL);
    colBox(a+1,c+1,a+7,c+2,y+.95);colBox(d-4,c+1,d-1.4,c+2,y+1.2);
    B.box(a+.4,y+h-.25,c+2,d-.4,y+h-.15,c+3,[1,1,.95],MAT.EMIT,1.2);B.box(a+.4,y+h-.25,e-4,d-.4,y+h-.15,e-3,[1,1,.95],MAT.EMIT,1.2);return;}
}

/* ---------- the park's furniture: the oval's wall and catch fence, the grandstands, the light towers, the
   short course's gantry and tyre walls, the mud track's bales, the strip's tree, boards and fences, the
   paddock's haulers and poles, the gate on the park road. Long things are drawn a piece at a time by the
   chunk each piece's middle is in; colliders go to every chunk they reach. Lights are in parkLights. ---------- */
const PKA={};
const pkSide=(P,s,off)=>{PKW.at(P,s,PKA);return [PKA.x-PKA.dz*off,PKA.z+PKA.dx*off,PKA.dx,PKA.dz];};
/* where the park's light towers and poles stand: [x, z, height, aim x, aim z, kind] */
const PK_POLES=(()=>{const out=[],O=PKW.oval,S=PKW.short,M=PKW.mud,T=PKW.ST,Lt=PKW.LOT;
  for(let i=0;i<8;i++){const [x,z,dx,dz]=pkSide(O,i/8*O.len+O.len/16,PKW.OV.hw+12);out.push([x,z,18,dz,-dx,'tower']);}
  for(let i=0;i<7;i++){const s=i/7*S.len+30,k=PKW.kAvg(S,s,10),o=(k<0?-1:1)*(PKW.SH_HW+15),[x,z,dx,dz]=pkSide(S,s,o),sg=o>0?1:-1;out.push([x,z,16,dz*sg,-dx*sg,'tower']);}
  for(let i=0;i<5;i++){const s=i/5*M.len+20,k=PKW.kAvg(M,s,12),o=(k<0?-1:1)*(PKW.MUD_HW+9),[x,z,dx,dz]=pkSide(M,s,o),sg=o>0?1:-1;out.push([x,z,13,dz*sg,-dx*sg,'tower']);}
  for(const sd of [-1,1])for(let x=T.x0+20;x<T.x1;x+=45)out.push([x,T.z+sd*(T.half+6),12,0,-sd,'pole']);
  for(const [x,z] of [[Lt.x0+2,Lt.z0+2],[Lt.x1-2,Lt.z0+2],[Lt.x0+2,Lt.z1-2],[Lt.x1-2,Lt.z1-2],[(Lt.x0+Lt.x1)/2,Lt.z0+2],[(Lt.x0+Lt.x1)/2,Lt.z1-2],[Lt.x0+2,(Lt.z0+Lt.z1)/2],[Lt.x1-2,(Lt.z0+Lt.z1)/2]])
    out.push([x,z,12,(Lt.x0+Lt.x1)/2-x,(Lt.z0+Lt.z1)/2-z,'lot']);
  for(const sd of [-1,1])out.push([PKW.ROADX+sd*7.5,-40,7,0,1,'gate']);
  return out;})();
function parkLights(){const out=[];
  for(const [x,z,h,ax,az,kind] of PK_POLES){const y=sample(x,z,CRo).h,l=Math.hypot(ax,az)||1,ty=y+h+.3;
    if(kind==='tower'){const d=[ax/l*.7,-.72,az/l*.7],dl=Math.hypot(...d);out.push({p:[x+ax/l*.8,ty-.5,z+az/l*.8],r:h>17?110:88,c:[3.8,3.7,3.4],d:d.map(v=>v/dl),cs:Math.cos(1.05)});}
    else if(kind==='pole'){const d=[0,-1,az*.55],dl=Math.hypot(...d);out.push({p:[x,ty-.4,z+az*.5],r:46,c:[3.6,3.5,3.2],d:d.map(v=>v/dl),cs:Math.cos(1.05)});}
    else if(kind==='lot'){const d=[ax/l*.5,-1,az/l*.5],dl=Math.hypot(...d);out.push({p:[x+ax/l*.6,ty-.4,z+az/l*.6],r:48,c:[1.5,1.5,1.55],d:d.map(v=>v/dl),cs:Math.cos(1.1)});}
    else out.push({p:[x,y+h+.6,z+1],r:16,c:[3,2.6,2]});}
  return out;}
function parkStatic(x0,z0,x1,z1,inC,PB,colBox,colCirc){
  const hAt=(x,z)=>sample(x,z,CRo).h,nearC=(x,z,m)=>x>x0-m&&x<x1+m&&z>z0-m&&z<z1+m;
  const bx=(cx,cy,cz,hx,hy,hz,col,m,em)=>PB.box(cx-hx,cy-hy,cz-hz,cx+hx,cy+hy,cz+hz,col,m||MAT.COL,em);
  const Y=PARK_Y,GREY=lc(70,72,76),WHITE=lc(230,230,226),RED=lc(200,40,30);
  /* a wall along a path at an offset: drawn 2 m at a time (h tall, t thick, outward), colliders every .9 m */
  const wallAlong=(P,off,h,t,col,mat,s0,s1,cable)=>{let prev=null;
    for(let s=s0;s<=s1+.01;s+=2){const [x,z,dx,dz]=pkSide(P,s,off),cur={x,z,dx,dz,y:null};
      if(prev){const mx=(prev.x+x)/2,mz=(prev.z+z)/2;
        if(inC(mx,mz)){if(prev.y===null)prev.y=hAt(prev.x,prev.z);cur.y=hAt(x,z);const a=prev,b=cur,sg=off>0?1:-1;
          const oa=[-a.dz*t*sg,a.dx*t*sg],ob=[-b.dz*t*sg,b.dx*t*sg];
          const A0=[a.x,a.y-.3,a.z],A1=[a.x,a.y+h,a.z],B0=[b.x,b.y-.3,b.z],B1=[b.x,b.y+h,b.z],A2=[a.x+oa[0],a.y+h,a.z+oa[1]],B2=[b.x+ob[0],b.y+h,b.z+ob[1]],A3=[a.x+oa[0],a.y-.3,a.z+oa[1]],B3=[b.x+ob[0],b.y-.3,b.z+ob[1]];
          if(sg>0){PB.quad(A0,A1,B1,B0,col,mat);PB.quad(A1,A2,B2,B1,col,mat);PB.quad(A3,B3,B2,A2,col,mat);}
          else{PB.quad(A0,B0,B1,A1,col,mat);PB.quad(A1,B1,B2,A2,col,mat);PB.quad(A3,A2,B2,B3,col,mat);}
          if(cable){for(const hh of [1.9,2.7,3.5])PB.bar([a.x+oa[0]*.5,a.y+hh,a.z+oa[1]*.5],[b.x+ob[0]*.5,b.y+hh,b.z+ob[1]*.5],.016,GREY,MAT.METAL);
            if(Math.round(s)%8===0)PB.bar([b.x+ob[0]*.5,b.y+h,b.z+ob[1]*.5],[b.x+ob[0]*.5,b.y+3.8,b.z+ob[1]*.5],.05,GREY,MAT.METAL);}}}
      prev=cur;}
    for(let s=s0;s<=s1;s+=.9){const [x,z]=pkSide(P,s,off+(off>0?.2:-.2));if(nearC(x,z,2))colCirc(x,z,.5,hAt(x,z)+h);}};
  /* a neon word on a board on two posts, facing n (rt along it as the reader sees it), its middle at (cx, cz) */
  const board=(word,cx,cz,y,rt,n,px,col)=>{const len=word.length*6*px-px,o=[cx-rt[0]*len/2,y,cz-rt[1]*len/2];
    for(const e of [-1,1]){const px2=cx+rt[0]*(len/2+.4)*e,pz2=cz+rt[1]*(len/2+.4)*e;PB.bar([px2-n[0]*.1,y-6,pz2-n[1]*.1],[px2-n[0]*.1,y+7*px+.3,pz2-n[1]*.1],.09,GREY,MAT.METAL);}
    neonWord(PB,word,o,[rt[0],0,rt[1]],[n[0],0,n[1]],px,col,0,0,null);};
  /* ---- Speedway 25 ---- */
  {const O=PKW.oval,OV=PKW.OV,hw=OV.hw;
    if(nearC(OV.x,OV.z,OV.half+OV.R+70)){
      wallAlong(O,hw+.9,1.1,.35,lc(206,206,200),MAT.CONCRETE,0,O.len,true);
      /* the grandstand behind the front straight, facing the track, a roof over the top rows, the press box */
      const z0=OV.z+OV.R+hw+16,ga=OV.x-85,gb=OV.x+85;
      if(inC(OV.x,z0+8)){
        for(let r=0;r<10;r++){bx(OV.x,Y+.4+r*.55,z0+2+r*1.1,85,.07,.5,lc(176,160,140),MAT.WOOD);bx(OV.x,Y+.2+r*.55,z0+2.4+r*1.1,85,.22+r*.28,.06,lc(120,122,128),MAT.METAL);}
        bx(OV.x,Y+3.1,z0+13.6,86,3.1,.25,lc(120,122,128),MAT.SHEET);
        for(const x of [ga+6,OV.x-28,OV.x+28,gb-6])bx(x,Y+4.4,z0+12.8,.18,4.4,.18,lc(90,92,98),MAT.METAL);
        bx(OV.x,Y+8.9,z0+9,87,.15,5.5,RED);bx(OV.x,Y+8.75,z0+9,87,.04,5.5,WHITE);
        bx(OV.x,Y+10.6,z0+12,9,1.6,2.2,lc(220,220,214),MAT.SHEET);bx(OV.x,Y+10.8,z0+9.75,8.6,.7,.04,lc(26,32,40));
        const px=.3,len=11*6*px-px;neonWord(PB,'SPEEDWAY 25',[OV.x+len/2,Y+9.15,z0+3.4],[-1,0,0],[0,0,-1],px,[1,.3,.16],0,0,null);}
      colBox(ga,z0+1.4,gb,z0+14,Y+6.4);
      /* the flag stand at the line */
      {const x=OV.x,z=OV.z+OV.R+hw+3.5;if(inC(x,z)){const y=hAt(x,z);bx(x,y+2.4,z,1.2,.06,1.2,lc(200,200,204),MAT.METAL);
        for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]])bx(x+a*1.1,y+1.2,z+b*1.1,.06,1.2,.06,lc(200,200,204),MAT.METAL);}
        colCirc(x,z,1.5,Y+4);}
      /* haulers parked in the infield */
      for(let i=0;i<4;i++){const x=OV.x-60+i*40,z=OV.z,col=[[200,40,30],[30,80,170],[230,230,226],[40,140,70]][i];
        if(inC(x,z)){const y=hAt(x,z);bx(x,y+2.1,z,7,1.7,1.25,lc(...col),MAT.SHEET);bx(x+8.6,y+1.8,z,1.6,1.4,1.2,lc(40,42,46),MAT.METAL);
          bx(x+9.9,y+2.2,z,.3,.5,1,lc(20,24,30),MAT.COL,0);}
        colBox(x-7.2,z-1.4,x+10.3,z+1.4,Y+3.9);}}}
  /* ---- the short course: a start gantry, tyre walls round the outside of its turns, flags ---- */
  {const P=PKW.short,hw=PKW.SH_HW,b=P.bb;
    if(x1>b[0]-40&&x0<b[2]+40&&z1>b[1]-40&&z0<b[3]+40){
      {const [cx,cz]=pkSide(P,0,0);
        for(const sd of [-1,1]){const [x,z]=pkSide(P,0,sd*(hw+1.6)),y=hAt(x,z);if(inC(cx,cz))PB.bar([x,y-.3,z],[x,y+6.6,z],.2,GREY,MAT.METAL);colCirc(x,z,.35,y+6.6);}
        if(inC(cx,cz)){const y=hAt(cx,cz);bx(cx,y+6.4,cz,.4,.4,hw+1.9,lc(40,40,44));for(let k=-2;k<=2;k++)bx(cx-.45,y+6.4,cz+k*.9,.05,.15,.15,[1,.08,.04],MAT.EMIT,1.4);
          const px=.22,len=12*6*px-px;neonWord(PB,'SHORT COURSE',[cx-.45,y+6.95,cz-len/2],[0,0,1],[-1,0,0],px,[.3,.9,1],0,0,null);}}
      for(let s=0;s<P.len;s+=.8){const k=PKW.kAvg(P,s,10);if(Math.abs(k)<1/75)continue;const out=-Math.sign(k),[x,z]=pkSide(P,s,out*(hw+10));
        if(!nearC(x,z,1))continue;const y=hAt(x,z);
        if(inC(x,z)){PB.cyl(x,z,y-.05,y+.78,.36,8,lc(22,22,24),MAT.COL,0);PB.cyl(x,z,y+.5,y+.58,.365,8,(s/2.4|0)%2?WHITE:RED,MAT.COL,-1);}
        colCirc(x,z,.42,y+.8);}
      for(let s=20;s<P.len;s+=45){const [x,z]=pkSide(P,s,(s/45|0)%2?hw+3:-hw-3);if(!inC(x,z))continue;const y=hAt(x,z);
        PB.bar([x,y-.2,z],[x,y+2.6,z],.03,lc(220,220,220),MAT.METAL);bx(x+.4,y+2.35,z,.4,.25,.02,(s/45|0)%3?lc(255,110,26):lc(40,120,230));}}}
  /* ---- the mud track: an arch over the line with its name, round bales round the outside of the turns ---- */
  {const P=PKW.mud,hw=PKW.MUD_HW,b=P.bb;
    if(x1>b[0]-40&&x0<b[2]+40&&z1>b[1]-40&&z0<b[3]+40){
      {const [cx,cz]=pkSide(P,0,0);
        for(const sd of [-1,1]){const [x,z]=pkSide(P,0,sd*(hw+2.2)),y=hAt(x,z);if(inC(cx,cz))PB.bar([x,y-.3,z],[x,y+5.6,z],.22,lc(110,84,58),MAT.WOOD);colCirc(x,z,.35,y+5.6);}
        if(inC(cx,cz)){const y=hAt(cx,cz);bx(cx,y+5.3,cz,.3,.5,hw+2.6,lc(96,74,52),MAT.WOOD);
          const px=.26,len=7*6*px-px;neonWord(PB,'MUD BOG',[cx-.32,y+5.9,cz-len/2],[0,0,1],[-1,0,0],px,[1,.62,.12],0,0,null);}}
      for(let s=0;s<P.len;s+=1.6){const k=PKW.kAvg(P,s,12);if(Math.abs(k)<1/70)continue;const out=-Math.sign(k),[x,z]=pkSide(P,s,out*(hw+3.4));
        if(!nearC(x,z,1))continue;const y=hAt(x,z);if(inC(x,z))PB.cyl(x,z,y-.1,y+1.15,.72,9,lc(186,156,92),MAT.COL,0);colCirc(x,z,.75,y+1.15);}}}
  /* ---- the drag strip (HD's): the tree between the lanes behind the line, boards at the finish, fences,
     light poles, a little grandstand, bales at the end of the shutdown ---- */
  {const T=PKW.ST;
    if(x1>T.x0-40&&x0<T.x1+40&&z1>T.z-40&&z0<T.z+40){const y=Y;
      {const tx=T.start-1.6,tz=T.z;if(inC(tx,tz)){PB.bar([tx,y,tz],[tx,y+2.6,tz],.07,lc(40,40,44),MAT.METAL);bx(tx,y+2.75,tz,.12,.85,.32,lc(16,16,18));
        for(let lane=0;lane<2;lane++)for(let k=0;k<7;k++){const c=k<2?[1,1,.9]:k<5?[1,.6,.1]:k===5?[.2,1,.3]:[1,.1,.08];bx(tx-.14,y+3.45-k*.24,tz+(lane?.17:-.17),.03,.07,.07,c.map(v=>v*.35),MAT.EMIT,.025);}}
        colCirc(tx,tz,.25,y+4);}
      for(const lane of [0,1]){const z=lane?T.z+T.half+2.5:T.z-T.half-2.5,fx=T.start+T.eighth;
        if(inC(fx,z)){bx(fx,y+2.2,z,.12,2.2,.12,lc(50,50,54),MAT.METAL);bx(fx,y+4.6,z,.2,.7,1.6,lc(18,18,20));bx(fx-.21,y+4.6,z,.02,.4,1.3,[1,.25,.1],MAT.EMIT,.35);}
        if(inC(T.start-.5,z))bx(T.start-.5,y+.6,z,.1,.6,.1,WHITE);colCirc(fx,z,.3,y+4.4);}
      for(const sd of [-1,1]){const z=T.z+sd*(T.half+4);
        for(let x=T.x0+4;x<T.x1-4;x+=3){if(!inC(x+1.5,z))continue;bx(x,y+.6,z,.07,.6,.07,lc(140,112,86),MAT.WOOD);bx(x+1.5,y+.95,z,1.5,.06,.03,lc(168,134,100),MAT.WOOD);bx(x+1.5,y+.5,z,1.5,.06,.03,lc(168,134,100),MAT.WOOD);}
        colBox(T.x0+3,z-.2,T.x1-3,z+.2,y+1.2);}
      {const gx=T.start+90,gz=T.z+T.half+9;if(inC(gx,gz+2)){for(let r=0;r<5;r++){bx(gx,y+.35+r*.45,gz+r*.8,26,.07,.4,lc(176,150,116),MAT.WOOD);bx(gx,y+.18+r*.45,gz+.3+r*.8,26,.2+r*.22,.05,lc(120,100,80),MAT.WOOD);}
        const px=.24,len=10*6*px-px;board('DRAG STRIP',gx,gz+4.6,y+3.2,[-1,0],[0,-1],px,[1,.85,.2]);}
        colBox(gx-26,gz-.5,gx+26,gz+4.5,y+3);}
      for(let k=0;k<9;k++){const z=T.z-8+k*2,x=T.x1+6+(k&1)*.6;if(inC(x,z))bx(x,y+.55,z,.6,.55,.95,lc(196,166,98));colCirc(x,z,1,y+1.1);}}}
  /* ---- the light towers and poles ---- */
  for(const [x,z,h,ax,az,kind] of PK_POLES){if(!nearC(x,z,2))continue;const y=hAt(x,z),l=Math.hypot(ax,az)||1,ux=ax/l,uz=az/l;
    colCirc(x,z,kind==='tower'?.45:.25,y+h);if(!inC(x,z))continue;
    if(kind==='gate'){continue;}
    PB.bar([x,y-.5,z],[x,y+h,z],kind==='tower'?.26:.14,GREY,MAT.METAL);
    if(kind==='tower'){bx(x,y+h+.3,z,1.6,.5,1.6,lc(60,62,66),MAT.METAL);bx(x+ux*.9,y+h,z+uz*.9,1.2,.25,1.2,[1,.97,.9],MAT.EMIT,1.6);}
    else{bx(x+ux*.4,y+h-.1,z+uz*.4,.5,.12,.5,[1,.98,.92],MAT.EMIT,1.4);}}
  /* ---- the paddock: haulers in rows in the lot; the gate over the park road by the highway ---- */
  {const Lt=PKW.LOT;
    if(x1>Lt.x0-10&&x0<Lt.x1+10&&z1>Lt.z0-10&&z0<Lt.z1+10){const R=rng(4711),cols=[[200,40,30],[30,80,170],[230,230,226],[40,140,70],[240,170,30],[30,30,34],[120,60,150]];
      for(let row=0;row<2;row++)for(const i of [0,1,4,5]){if(R()<.25)continue;const x=Lt.x0+20+i*24,z=Lt.z0+44+row*36,col=cols[Math.floor(R()*cols.length)],tl=5+R()*3;
        if(inC(x,z)){bx(x,Y+1.9,z,1.25,1.6,tl,lc(...col),MAT.SHEET);bx(x,Y+1.6,z+tl+1.7,1.2,1.3,1.5,lc(40,42,46),MAT.METAL);bx(x,Y+2.1,z+tl+3.25,1,.45,.05,lc(20,24,30),MAT.COL,0);}
        colBox(x-1.4,z-tl-.2,x+1.4,z+tl+3.3,Y+3.6);}}
    const gx=PKW.ROADX,gz=-40;
    if(x1>gx-20&&x0<gx+20&&z1>gz-10&&z0<gz+10){const y=hAt(gx,gz);
      for(const sd of [-1,1]){const x=gx+sd*7.5;if(inC(gx,gz)){PB.bar([x,y-.3,gz],[x,y+7.4,gz],.3,lc(110,84,58),MAT.WOOD);bx(x,y+7.7,gz+.6,.3,.12,.25,[1,.9,.7],MAT.EMIT,1.2);}colCirc(x,gz,.4,y+7.4);}
      if(inC(gx,gz)){bx(gx,y+6.8,gz,8.2,.9,.3,lc(96,74,52),MAT.WOOD);const px=.15,len=13*6*px-px;neonWord(PB,'OFF-ROAD PARK',[gx-len/2,y+6.25,gz+.32],[1,0,0],[0,0,1],px,[1,.55,.1],0,0,null);}}}
}

/* ---------- a far tile: 512 m, every 32 m, the land only (and downtown's towers, seen from out of town) ---------- */
const FT=512;
function genFar(tx,tz){
  const st=32,n=FT/st+1,x0=tx*FT,z0=tz*FT,ctx={ns:[],ew:[],spurs:[],pads:[]},o={};
  const nv=n*n+4*n*2,P=new Float32Array(nv*3),N=new Float32Array(nv*3),C=new Float32Array(nv*4),M=new Float32Array(nv).fill(MAT.TERRAIN),Hh=new Float64Array((n+2)*(n+2)),Wt=new Float32Array(n*n*4);
  const nb=n+2;
  for(let j=0;j<nb;j++)for(let i=0;i<nb;i++){const x=x0+(i-1)*st,z=z0+(j-1)*st;core(x,z,ctx,o);Hh[j*nb+i]=o.h;
    if(i>0&&j>0&&i<=n&&j<=n){const k=(j-1)*n+i-1,wn=fbm(x/900+2.2,z/900-4.4,2,121),wd=sst(.56-.2*o.k,.66-.2*o.k,wn)*(o.salt>0?0:1);
      Wt[k*4]=Math.max(o.grass,wd);Wt[k*4+1]=o.rock;Wt[k*4+2]=o.salt>.02?-o.salt:o.mud*.5;Wt[k*4+3]=1-wd*.5;}}
  let v=0;const I=[];
  const put=(i,j,dy)=>{const b=(j+1)*nb+i+1,k=j*n+i,hx=Hh[b-1]-Hh[b+1],hz=Hh[b-nb]-Hh[b+nb],l=Math.hypot(hx,2*st,hz);
    P[v*3]=i*st;P[v*3+1]=Hh[b]-dy;P[v*3+2]=j*st;N[v*3]=hx/l;N[v*3+1]=2*st/l;N[v*3+2]=hz/l;C[v*4]=Wt[k*4];C[v*4+1]=Wt[k*4+1];C[v*4+2]=Wt[k*4+2];C[v*4+3]=Wt[k*4+3];return v++;};
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)put(i,j,0);
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const p=j*n+i,q=p+1,r=p+n,s=r+1;I.push(p,s,q,p,r,s);}
  const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=ja*n+ia,b=jb*n+ib,c=put(ia,ja,8),d=put(ib,jb,8);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
  const top=[],bot=[],lef=[],rig=[];for(let a=0;a<n;a++){top.push([a,0]);bot.push([a,n-1]);lef.push([0,a]);rig.push([n-1,a]);}
  edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
  let ymin=1e9,ymax=-1e9;for(let k=0;k<n*n;k++){const h=Hh[((k/n|0)+1)*nb+k%n+1];if(h<ymin)ymin=h;if(h>ymax)ymax=h;}
  /* downtown's towers, lit, as plain blocks: the skyline from out in the country */
  const LB=new MB(x0,z0);
  for(const q of TW.lots){if(q.h<30)continue;const mx=(q.x0+q.x1)/2,mz=(q.z0+q.z1)/2;if(mx<x0||mx>=x0+FT||mz<z0||mz>=z0+FT)continue;
    const fa=q.style+(q.shops?5:0)+(Math.floor(q.seed*36)+.5)/40,tint=lc(...q.tint);LB.box(q.x0,0,q.z0,q.x1,q.h,q.z1,tint,MAT.FACADE,fa,'b');ymax=Math.max(ymax,q.h+2);}
  return {tx,tz,ground:{pos:P.subarray(0,v*3),nrm:N.subarray(0,v*3),col:C.subarray(0,v*4),mat:M.subarray(0,v),idx:new Uint16Array(I),tris:I.length/3},marks:LB.n?LB.out():null,ymin,ymax};
}

/* ---------- questions the game asks ---------- */
/* the nearest country road to a point: which line, its class, how far across (signed) and which way it runs */
function roadAt(x,z){
  let best=null;
  for(let q=-1;q<=1;q++){const i=Math.round(x/L)+q,xc=i*L+offNS(i,z),cl=clsNSz(i,z);if(!cl)continue;const s=(offNS(i,z+1)-offNS(i,z-1))*.5,inv=1/Math.sqrt(1+s*s),d=(x-xc)*inv;
    if(!best||Math.abs(d)-CL[cl].hw<Math.abs(best.d)-CL[best.cls].hw)best={ns:true,i,cls:cl,d,dir:[s*inv,inv],hw:CL[cl].hw,name:LINE_NAME(true,i,z)};}
  for(let q=-1;q<=1;q++){const j=Math.round(z/L)+q,zc=j*L+offEW(j,x),cl=clsEWx(j,x);if(!cl)continue;const s=(offEW(j,x+1)-offEW(j,x-1))*.5,inv=1/Math.sqrt(1+s*s),d=(z-zc)*inv;
    if(!best||Math.abs(d)-CL[cl].hw<Math.abs(best.d)-CL[best.cls].hw)best={ns:false,j,cls:cl,d,dir:[inv,s*inv],hw:CL[cl].hw,name:LINE_NAME(false,j,x)};}
  return best;
}
/* the road lines through a box, as polylines (for the big map): the country's, then the town's */
function roadLines(x0,z0,x1,z1,step){
  const out=[];
  for(let i=-1;i<=1;i++){let cur=null;
    for(let z=Math.floor(z0/step)*step;z<=z1+step;z+=step){const cl=clsNSz(i,z),x=i*L+offNS(i,z);
      if(!cl||x<x0-step||x>x1+step){cur=null;continue;}if(!cur||cur.cls!==cl){const p=cur;cur={cls:cl,pts:p?[p.pts[p.pts.length-2],p.pts[p.pts.length-1]]:[]};out.push(cur);}cur.pts.push(x,z);}}
  for(let j=-1;j<=1;j++){let cur=null;
    for(let x=Math.floor(x0/step)*step;x<=x1+step;x+=step){const cl=clsEWx(j,x),z=j*L+offEW(j,x);
      if(!cl||z<z0-step||z>z1+step){cur=null;continue;}if(!cur||cur.cls!==cl){const p=cur;cur={cls:cl,pts:p?[p.pts[p.pts.length-2],p.pts[p.pts.length-1]]:[]};out.push(cur);}cur.pts.push(x,z);}}
  if(x1>-EDGE&&x0<EDGE&&z1>-EDGE&&z0<EDGE){
    for(const s of TW.roads){const c=TCLS[s.kind];out.push({cls:c.cls,pts:s.ax==='x'?[s.a,s.line,s.b,s.line]:[s.line,s.a,s.line,s.b]});}
    for(const n of TW.jn){out.push({cls:TCLS[xKind(n.x)].cls,pts:[n.x,n.z-n.hz,n.x,n.z+n.hz]},{cls:TCLS[zKind(n.z)].cls,pts:[n.x-n.hx,n.z,n.x+n.hx,n.z]});}
    for(const A of TW.arcs){const pts=[];for(let k=0;k<=8;k++){const t=A.a0+(A.a1-A.a0)*k/8;pts.push(A.cx+Math.cos(t)*A.r,A.cz+Math.sin(t)*A.r);}out.push({cls:7,pts});}}
  return out;
}
/* the places with names on the big map */
const NAMED=[{name:'City Limits',x:0,z:0},{name:"Deke's Gas",x:470,z:-40,special:1},{name:'The Starlite',x:-470,z:40},{name:'Off-road park',x:(PARK.x0+PARK.x1)/2,z:(PARK.z0+PARK.z1)/2},
  {name:'Speedway 25',x:-2050,z:-820,park:1},{name:'Short course',x:-2600,z:-1000,park:1},{name:'Mud track',x:-2360,z:-1390,park:1},{name:'Drag strip',x:-2650,z:-360,park:1},{name:'Paddock',x:-2310,z:-395,park:1},
  {name:'The bog',x:BOG.x,z:BOG.z},{name:'The salt flats',x:LAND+700,z:-180},{name:'The salt flats',x:-LAND-700,z:180},{name:'The hills',x:-200,z:-2300}];
function townsNear(x,z,r){return NAMED.filter(t=>Math.hypot(t.x-x,t.z-z)<r).map(t=>Object.assign({i:0,j:0},t));}
/* what a place is called */
function placeAt(x,z){
  if(x>GARAGE.x0-4&&x<GARAGE.x1+4&&z>GARAGE.z0-4&&z<GARAGE.z1+14)return x>GARAGE.x0&&x<GARAGE.x1&&z>GARAGE.z0&&z<GARAGE.z1?'In the garage':"Marisol's Garage";
  const td=townD(x,z);
  if(td<EDGE+4){const ax=Math.abs(x),az=Math.abs(z);
    if(ax<=RING+16&&az<=RING+16){const q=townQ(x,z,{});
      if(q.e<2){if(q.kind==='ring')return 'Limits Boulevard';
        let bx=null,bz=null;for(const g of GRID){if(Math.abs(x-g)<hwX(g)+2)bx=g;if(Math.abs(z-g)<hwZ(g)+2)bz=g;}
        if(bz!==null&&(bx===null||hwZ(bz)>=hwX(bx)))return STREET_Z[String(bz)];if(bx!==null)return STREET_X[String(bx)];}
      const dz=district(x,z);return {downtown:'Downtown',neon:'Neon Row',residential:'The Heights',industrial:'The Yards',park:'Copper Park',mixed:'City Limits'}[dz]||'City Limits';}
    if(Math.abs(z)<16)return 'Highway 40';return 'Edge of town';}
  if(Math.hypot(x-470,z+40)<40)return "Deke's Gas";if(Math.hypot(x+470,z-40)<40)return 'The Starlite Diner';
  if(Math.hypot(x-BOG.x,z-BOG.z)<BOG.r+12)return 'The bog';
  if(parkD(x,z)<40||Math.abs(x-PKW.ROADX)<9&&z<-12&&z>-300){const nm=PKW.nameAt(x,z);if(nm)return nm;}
  if(parkD(x,z)<20)return 'Off-road park';
  const sd=saltD(x,z);if(sd>LAND+SALT_BL*.6)return Math.abs(z)<20&&Math.abs(x)<HWY_X+5?'Highway 40, on the salt':'The salt flats';
  const r=roadAt(x,z);if(r&&Math.abs(r.d)<r.hw+3)return r.name;
  const cr={};creekAt(x,z,cr);if(cr.dc<12)return 'The creek';
  const k=hillK(x,z);if(Math.max(Math.abs(x),Math.abs(z))>RIM0-200)return 'Edge of the map';
  const wn=fbm(x/900+2.2,z/900-4.4,2,121);if(wn>.6-.2*k)return k>.5?'Woods in the hills':'The woods';
  if(sd>LAND-500)return 'Out toward the salt';
  return k>.5?'The hills':k>.25?'Rolling country':'Open country';
}
const xExp=z=>1e9;
return {L,HALF,CH,FT,ROAD_END,SURF,SF,CL,core,sample,baseAt,genGround,genStatic,genFar,roadAt,roadLines,townsNear,placeAt,hillK,offNS,offEW,clsNSz,clsEWx,creekAt,xExp,
  EDGE,RING,LAND,SALT_Y,HWY_X,PARK,BOG,GARAGE,townD,saltD,parkD,TW,townLights,PKW,PARK_Y};
}
