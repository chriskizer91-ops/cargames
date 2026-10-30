/* =====================================================================================
   CITY LIMITS — the town's map. Shift City's map (citymap.js) made small: a 6 x 6 grid of blocks,
   streets 120 m apart inside a ring boulevard with rounded corners, no expressway. The four middle
   lines leave town through the ring: Main Avenue east and west becomes the Salt Road (paved, out to
   the flats), Central Avenue north becomes Ridge Road (gravel, into the hills) and south Wash Road
   (dirt, down to the dry wash). Past the ring is a strip of sidewalk, then the desert (terrain.js).
   Pure data: physics, drawing and the minimap are built from this.
   Map coordinates: x east, y north, h up. World: X = x, Y = h, Z = -y.
   ===================================================================================== */
import {rng} from '../render/mesh.js';

export const GRID=[-360,-240,-120,0,120,240,360];
export const RING=360,CORNER=120;
export const ROADS={
  ring:{hw:14,lanes:2,lw:3.5,med:1.4,side:5,name:'Limits Boulevard'},
  main:{hw:8,lanes:2,lw:3.4,med:1.2,side:5,name:'Avenue'},
  ave:{hw:7,lanes:2,lw:3.4,med:0,side:4.5,name:'Avenue'},
  street:{hw:5.5,lanes:1,lw:3.6,med:0,side:4,name:'Street'}
};
/* the sidewalk band outside the ring, and where the desert starts */
export const EDGE=RING+ROADS.ring.hw+6;
/* the roads that leave town: the middle lines, their half width past the ring */
export const EXIT_HW=6;
const STREET_NAMES={x:{'-360':'West Limits','-240':'Mesa St','-120':'Cactus St','0':'Central Ave','120':'Copper St','240':'Mission Ave','360':'East Limits'},
  y:{'-360':'South Limits','-240':'Ocotillo St','-120':'Neon Row','0':'Main Ave','120':'Silver St','240':'Sunset Ave','360':'North Limits'}};
export const classOf=v=>Math.abs(v)===RING?'ring':v===0?'main':Math.abs(v)===240?'ave':'street';
export const hwOf=v=>ROADS[classOf(v)].hw;
export const streetName=(axis,v)=>STREET_NAMES[axis][String(v)];

export function buildCityMap(seed=1906){
  const R=rng(seed),M={grid:GRID,ring:RING,corner:CORNER,names:STREET_NAMES,hwy:null,ramps:[],ribbons:[]};
  /* ---------- intersections and the street segments between them ---------- */
  const nodes=[],nodeAt=new Map(),key=(x,y)=>x+','+y;
  for(const x of GRID)for(const y of GRID){
    if(Math.abs(x)===RING&&Math.abs(y)===RING)continue;
    if(Math.abs(x)===RING&&Math.abs(y)>RING-CORNER)continue;
    if(Math.abs(y)===RING&&Math.abs(x)>RING-CORNER)continue;
    const n={id:nodes.length,x,y,cx:classOf(x),cy:classOf(y),hx:hwOf(x),hy:hwOf(y),links:[]};
    n.ring=Math.abs(x)===RING||Math.abs(y)===RING;n.signal=true;
    /* where a road leaves town through the ring */
    n.exit=n.ring&&(x===0||y===0);
    nodes.push(n);nodeAt.set(key(x,y),n);}
  M.nodes=nodes;
  const segs=[];
  const addSeg=(a,b,axis,line)=>{const cls=classOf(line),s={id:segs.length,a:a.id,b:b.id,axis,line,cls,...ROADS[cls]};
    s.x0=a.x;s.y0=a.y;s.x1=b.x;s.y1=b.y;s.len=Math.hypot(b.x-a.x,b.y-a.y);segs.push(s);a.links.push(s.id);b.links.push(s.id);return s;};
  for(const x of GRID){const col=GRID.map(y=>nodeAt.get(key(x,y))).filter(Boolean);for(let i=0;i<col.length-1;i++)addSeg(col[i],col[i+1],'y',x);}
  for(const y of GRID){const row=GRID.map(x=>nodeAt.get(key(x,y))).filter(Boolean);for(let i=0;i<row.length-1;i++)addSeg(row[i],row[i+1],'x',y);}
  const S=RING-CORNER;M.corners=[];
  for(const [sx,sy] of [[1,1],[1,-1],[-1,-1],[-1,1]]){
    const a=nodeAt.get(key(sx*S,sy*RING)),b=nodeAt.get(key(sx*RING,sy*S));
    const c={id:segs.length,a:a.id,b:b.id,axis:'arc',cls:'ring',...ROADS.ring,cx:sx*S,cy:sy*S,r:CORNER,
      a0:Math.atan2(a.y-sy*S,a.x-sx*S),a1:Math.atan2(b.y-sy*S,b.x-sx*S),len:Math.PI/2*CORNER};
    if(c.a1-c.a0>Math.PI)c.a1-=2*Math.PI;else if(c.a1-c.a0<-Math.PI)c.a1+=2*Math.PI;
    c.x0=a.x;c.y0=a.y;c.x1=b.x;c.y1=b.y;segs.push(c);a.links.push(c.id);b.links.push(c.id);M.corners.push(c);}
  M.segs=segs;
  /* ---------- blocks, districts, lots ---------- */
  const district=(cx,cy)=>{
    if(cx>120&&cx<240&&cy>120&&cy<240)return 'park';
    if(Math.abs(cx)<120&&Math.abs(cy)<120)return 'downtown';
    if(cx<0&&cy<0&&cy>-240)return 'neon';
    if(cx>120&&cy<-120)return 'industrial';
    if(cx<-120&&cy>120)return 'residential';
    return 'mixed';};
  M.district=district;
  const blocks=[];
  for(let i=0;i<GRID.length-1;i++)for(let j=0;j<GRID.length-1;j++){
    const xa=GRID[i],xb=GRID[i+1],ya=GRID[j],yb=GRID[j+1];
    const b={x0:xa+hwOf(xa),x1:xb-hwOf(xb),y0:ya+hwOf(ya),y1:yb-hwOf(yb),sw:{w:ROADS[classOf(xa)].side,e:ROADS[classOf(xb)].side,s:ROADS[classOf(ya)].side,n:ROADS[classOf(yb)].side}};
    b.cx=(b.x0+b.x1)/2;b.cy=(b.y0+b.y1)/2;b.district=district(b.cx,b.cy);
    b.corner=Math.abs(b.cx)>S&&Math.abs(b.cy)>S;
    blocks.push(b);}
  M.blocks=blocks;
  const lots=[];
  const STY={downtown:()=>R()<.6?2:R()<.6?1:0,neon:()=>R()<.45?3:R()<.6?0:1,residential:()=>R()<.6?0:3,industrial:()=>R()<.75?4:1,mixed:()=>[0,1,3,3,2][Math.floor(R()*5)]};
  const HGT={downtown:()=>R()<.4?48+R()*70:20+R()*26,neon:()=>9+R()*13,residential:()=>9+R()*9,industrial:()=>8+R()*6,mixed:()=>10+Math.pow(R(),1.5)*22};
  for(const b of blocks){
    if(b.district==='park')continue;
    const zx0=b.x0+b.sw.w,zx1=b.x1-b.sw.e,zy0=b.y0+b.sw.s,zy1=b.y1-b.sw.n;
    const dz=b.district,wMin=dz==='downtown'?20:dz==='industrial'?28:dz==='neon'?9:12,wMax=dz==='downtown'?44:dz==='industrial'?52:dz==='neon'?16:26;
    const rows=zy1-zy0>40?2:1;const cols=[];let x=zx0;
    while(x<zx1-6){let w=wMin+R()*(wMax-wMin);if(zx1-(x+w)<wMin*.7)w=zx1-x;cols.push([x,Math.min(zx1,x+w)]);x+=w;}
    cols.forEach(([cx0,cx1],ci)=>{for(let r=0;r<rows;r++){
      const depth=rows===1?zy1-zy0:Math.min((zy1-zy0)/2,dz==='downtown'?(zy1-zy0)/2:14+R()*14);
      const ly0=rows===1?zy0:r===0?zy0:zy1-depth,ly1=rows===1?zy1:r===0?zy0+depth:zy1;
      const gap=R()<.25?1.5:0,lx0=cx0+(ci>0?gap/2:0),lx1=cx1-(ci<cols.length-1?gap/2:0);
      if(b.corner){const far=Math.hypot(Math.max(Math.abs(lx0),Math.abs(lx1))-S,Math.max(Math.abs(ly0),Math.abs(ly1))-S);
        if(Math.abs(lx0)>S||Math.abs(lx1)>S)if(Math.abs(ly0)>S||Math.abs(ly1)>S)if(far>CORNER-ROADS.ring.hw-ROADS.ring.side-1)continue;}
      const street={n:rows===1||r===1,s:rows===1||r===0,w:ci===0,e:ci===cols.length-1};
      const h=HGT[dz](),tower=dz==='downtown'&&h>46&&lx1-lx0>22&&ly1-ly0>22;
      lots.push({x0:lx0,y0:ly0,x1:lx1,y1:ly1,h,style:STY[dz](),district:dz,street,tower:tower?{podium:10+R()*8,inset:3+R()*3}:null,seed:Math.floor(R()*255)});
    }});
  }
  M.lots=lots;
  M.outer={r0:RING+ROADS.ring.hw,r1:EDGE};
  return M;
}

/* the ground in town: streets at 0, blocks and sidewalks 15 cm up (a kerb you can bump over).
   Past the ring a sidewalk band out to EDGE, with the four roads out of town cut through it. */
export function baseGround(M,x,y){
  const ax=Math.abs(x),ay=Math.abs(y),S=RING-CORNER;
  if(ax>S&&ay>S){const d=Math.hypot(ax-S,ay-S);if(Math.abs(d-CORNER)<ROADS.ring.hw)return 0;return .15;}
  if(Math.abs(ax-RING)<ROADS.ring.hw&&ay<=S+1)return 0;
  if(Math.abs(ay-RING)<ROADS.ring.hw&&ax<=S+1)return 0;
  if(ax>RING||ay>RING){if(ax<EXIT_HW&&ay>RING||ay<EXIT_HW&&ax>RING)return 0;return .15;}
  for(const g of GRID){if(Math.abs(x-g)<hwOf(g))return 0;if(Math.abs(y-g)<hwOf(g))return 0;}
  return .15;
}
/* is a map point in town (the city's square, out to the sidewalk band's edge)? */
export function inTown(x,y){const ax=Math.abs(x),ay=Math.abs(y),S=RING-CORNER;if(ax>=EDGE||ay>=EDGE)return false;
  return ax<=S||ay<=S||Math.hypot(ax-S,ay-S)<CORNER+ROADS.ring.hw+6;}
