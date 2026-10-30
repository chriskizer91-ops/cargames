/* =====================================================================================
   CITY LIMITS — the town, drawn. Shift City's builder (citygeo.js) on the small map: streets with
   their markings, intersections with working signals, medians, sidewalks and blocks, buildings by
   district, a park, trees and lamps. No expressway: the ring boulevard gets twin-arm lamps on its
   median instead. Outside the ring a sidewalk band, cut where the four roads leave town.
   World materials as Shift City's: 3 sidewalk, 4 concrete, 5 facades, 7 lamps, 8 metal, 15 signals,
   16 foliage, 17 city street, 19 grass.
   ===================================================================================== */
import {norm} from '../render/mesh.js';
import {makeKit,W} from './kit.js';
import {GRID,RING,CORNER,ROADS,EDGE,EXIT_HW,classOf,baseGround} from './clmap.js';

const CLS={ring:0,main:1,ave:2,street:3};
export function buildTown(M,C,R,lights){
  const K=makeKit(C,R,lights),info={signals:[]};
  /* a desert town plants palms: a leaning trunk and a crown of drooping fronds (lighter than the kit's trees) */
  K.tree=(px,py,h0,size=1)=>{
    const s=size*(.85+R()*.4),H=(7+R()*3)*s,lean=(R()-.5)*.8,la=R()*6.28,B=C.at(px,-py);
    const top=[px+Math.cos(la)*lean,py+Math.sin(la)*lean];C.mat(13,230).col(92,74,56);
    const mid=W(px+Math.cos(la)*lean*.35,py+Math.sin(la)*lean*.35,h0+H*.5),tp=W(top[0],top[1],h0+H);
    B.tube(W(px,py,h0),mid,.2*s,6,false,.17*s);B.tube(mid,tp,.17*s,6,false,.14*s);
    C.mat(16,Math.floor(R()*255)).col(48+R()*20,82+R()*30,36+R()*14);
    const n=8;for(let k=0;k<n;k++){const a=k/n*6.283+R()*.4,L=(2.6+R()*.8)*s,ca=Math.cos(a),sa=Math.sin(a),w=.32*s;
      let p0=tp;for(let j=1;j<=3;j++){const t=j/3,d=L*t,dr=-.15*s-1.6*s*t*t,c=[top[0]+ca*d,top[1]+sa*d],p1=W(c[0],c[1],h0+H+dr+.3*s*t),
        side=[-sa*w*(1-t*.6),ca*w*(1-t*.6)];
        const a0=[p0[0]-side[0],p0[1],p0[2]+side[1]],a1=[p0[0]+side[0],p0[1],p0[2]-side[1]],b0=[p1[0]-side[0],p1[1],p1[2]+side[1]],b1=[p1[0]+side[0],p1[1],p1[2]-side[1]];
        B.quadP(a0,a1,b1,b0,[[0,0],[1,0],[1,1],[0,1]]);B.quadP(a1,a0,b0,b1,[[0,0],[1,0],[1,1],[0,1]]);p0=p1;}}
  };
  const S=RING-CORNER;
  const quad=(x0,y0,x1,y1,h,uv)=>{const B=C.at((x0+x1)/2,-(y0+y1)/2);B.quadP(W(x0,y0,h),W(x1,y0,h),W(x1,y1,h),W(x0,y1,h),uv,[0,1,0]);};
  /* ---------- streets ---------- */
  for(const sg of M.segs){
    const A=M.nodes[sg.a],B=M.nodes[sg.b];
    if(sg.axis==='arc'){roadArc(sg,A,B);continue;}
    const L0=sg.axis==='x'?A.x+A.hx:A.y+A.hy,L1=sg.axis==='x'?B.x-B.hx:B.y-B.hy,L=L1-L0,hw=sg.hw;
    C.mat(17,CLS[sg.cls],Math.min(255,Math.round(L*2)),0).col(255,0,0,255);
    const n=Math.max(1,Math.ceil(L/30));
    for(let k=0;k<n;k++){const a=L0+L*k/n,b=L0+L*(k+1)/n,ua=a-L0,ub=b-L0;
      if(sg.axis==='x')quad(a,sg.line-hw,b,sg.line+hw,0,[[ua,-hw],[ub,-hw],[ub,hw],[ua,hw]]);
      else{const Bq=C.at(sg.line,-(a+b)/2);Bq.quadP(W(sg.line+hw,a,0),W(sg.line+hw,b,0),W(sg.line-hw,b,0),W(sg.line-hw,a,0),[[ua,-hw],[ub,-hw],[ub,hw],[ua,hw]],[0,1,0]);}}
    if(sg.med>0){const m0=L0+3,m1=L1-3;C.mat(3).col(255,0,0,255);
      for(let a=m0;a<m1;a+=40){const b=Math.min(m1,a+40),c=(a+b)/2,hl=(b-a)/2;
        if(sg.axis==='x')C.at(c,-sg.line).box(W(c,sg.line,.08),[1,0,0],[0,1,0],[0,0,1],[hl,.08,sg.med],8);
        else C.at(sg.line,-c).box(W(sg.line,c,.08),[1,0,0],[0,1,0],[0,0,1],[sg.med,.08,hl],8);}}
    /* lamps: both sides, staggered; on the ring, twin arms on the median */
    if(sg.cls!=='ring'){for(const side of [1,-1]){for(let a=L0+14+(side>0?0:18);a<L1-8;a+=36){
      const off=hw+.7,lx=sg.axis==='x'?a:sg.line+side*off,ly=sg.axis==='x'?sg.line+side*off:a,dir=sg.axis==='x'?[0,-side]:[-side,0];
      K.lamp(lx,ly,.15,dir,{arm:sg.cls==='street'?1.8:2.6,height:sg.cls==='street'?7:8.5,led:M.district(lx,ly)==='downtown'});}}}
    else for(let a=L0+20;a<L1-12;a+=44)medianLamp(sg.axis==='x'?a:sg.line,sg.axis==='x'?sg.line:a,sg.axis);
    if(sg.cls==='main'||sg.cls==='ave')for(const side of [1,-1])for(let a=L0+8+(side>0?6:0);a<L1-8;a+=14){
      const off=hw+2.2,tx=sg.axis==='x'?a:sg.line+side*off,ty=sg.axis==='x'?sg.line+side*off:a;if(R()<.85)K.tree(tx,ty,.15,.9);}
  }
  function medianLamp(x,y,axis){
    const base=W(x,y,.16),top=[base[0],base[1]+9,base[2]];C.mat(8,140,230).col(70,72,76);const B=C.at(x,-y);
    B.tube(base,top,.12,6,true,.08);
    for(const sd of [1,-1]){const hx=axis==='x'?x:x+sd*4.2,hy=axis==='x'?y+sd*4.2:y,head=W(hx,hy,9.6);B.tube(top,head,.06,4,false);
      C.mat(7,110,0,1).col(235,242,255);B.box([head[0],head[1]-.08,head[2]],[1,0,0],[0,1,0],[0,0,1],[.32,.03,.16]);C.mat(8,140,230).col(70,72,76);
      lights.push({type:1,pos:[head[0],head[1]-.3,head[2]],r:30,col:[184,198,230],dir:[0,-1,0],cosO:Math.cos(1.2),cosI:Math.cos(.62),src:.2,axis:[0,0,0],flick:0});}
  }
  /* ---------- intersections and their signals ---------- */
  M.nodes.forEach(n=>{
    C.mat(17,4,0,0).col(255,0,0,255);quad(n.x-n.hx,n.y-n.hy,n.x+n.hx,n.y+n.hy,0,[[n.x-n.hx,n.y-n.hy],[n.x+n.hx,n.y-n.hy],[n.x+n.hx,n.y+n.hy],[n.x-n.hx,n.y+n.hy]]);
    n.sig=Math.floor(R()*255);
    const corners=n.ring?[[1,1],[-1,-1]].filter(([sx,sy])=>Math.abs(n.y)===RING?sy===-Math.sign(n.y):sx===-Math.sign(n.x)):[[-1,-1],[1,1]];
    for(const [sx,sy] of corners)K.signal(n.x+sx*(n.hx+.9),n.y+sy*(n.hy+.9),-sx*Math.min(9,n.hx*1.45),-sy*Math.min(9,n.hy*1.45),n.sig);
    info.signals.push({x:n.x,y:n.y,id:n.sig});
  });
  /* the exits: the junction's road surface carried out across the ring's outer half and the sidewalk band */
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const a=RING+ROADS.ring.hw,b=EDGE+.5,hw=EXIT_HW;C.mat(17,2,Math.round((b-a)*2),0).col(255,0,0,255);
    if(dx)quad(Math.min(dx*a,dx*b),-hw,Math.max(dx*a,dx*b),hw,0,[[0,-hw],[b-a,-hw],[b-a,hw],[0,hw]]);
    else quad(-hw,Math.min(dy*a,dy*b),hw,Math.max(dy*a,dy*b),0,[[0,-hw],[b-a,-hw],[b-a,hw],[0,hw]]);
  }
  function roadArc(sg,A,B){
    const n=40,hw=sg.hw,cx=sg.cx,cy=sg.cy,r=sg.r,a0=sg.a0+(A.hx/r)*Math.sign(sg.a1-sg.a0),a1=sg.a1-(B.hy/r)*Math.sign(sg.a1-sg.a0);
    C.mat(17,0,255,1).col(255,0,0,255);
    for(let k=0;k<n;k++){const t0=a0+(a1-a0)*k/n,t1=a0+(a1-a0)*(k+1)/n,P=(t,rr)=>[cx+Math.cos(t)*rr,cy+Math.sin(t)*rr];
      const [p0,p1,p2,p3]=[P(t0,r+hw),P(t1,r+hw),P(t1,r-hw),P(t0,r-hw)],ua=Math.abs(t0-a0)*r,ub=Math.abs(t1-a0)*r;
      const Bq=C.at((p0[0]+p2[0])/2,-(p0[1]+p2[1])/2);
      if(a1<a0)Bq.quadP(W(p3[0],p3[1],0),W(p2[0],p2[1],0),W(p1[0],p1[1],0),W(p0[0],p0[1],0),[[ua,-hw],[ub,-hw],[ub,hw],[ua,hw]],[0,1,0]);
      else Bq.quadP(W(p0[0],p0[1],0),W(p1[0],p1[1],0),W(p2[0],p2[1],0),W(p3[0],p3[1],0),[[ua,-hw],[ub,-hw],[ub,hw],[ua,hw]],[0,1,0]);}
    C.mat(3).col(255,0,0,255);
    for(let k=0;k<10;k++){const t0=a0+(a1-a0)*(k+.05)/10,t1=a0+(a1-a0)*(k+.95)/10,tm=(t0+t1)/2,c=[cx+Math.cos(tm)*r,cy+Math.sin(tm)*r];
      C.at(c[0],-c[1]).box(W(c[0],c[1],.08),[-Math.sin(tm),0,-Math.cos(tm)],[0,1,0],[Math.cos(tm),0,-Math.sin(tm)],[Math.abs(t1-t0)*r/2,.08,sg.med],8);}
    for(let k=1;k<3;k++){const t=a0+(a1-a0)*k/3,c=[cx+Math.cos(t)*r,cy+Math.sin(t)*r];arcLamp(c[0],c[1],t);}
  }
  function arcLamp(x,y,t){const base=W(x,y,.16),top=[base[0],base[1]+9,base[2]];C.mat(8,140,230).col(70,72,76);const B=C.at(x,-y);B.tube(base,top,.12,6,true,.08);
    for(const sd of [1,-1]){const hx=x+Math.cos(t)*sd*4.2,hy=y+Math.sin(t)*sd*4.2,head=W(hx,hy,9.6);B.tube(top,head,.06,4,false);
      C.mat(7,110,0,1).col(235,242,255);B.box([head[0],head[1]-.08,head[2]],[1,0,0],[0,1,0],[0,0,1],[.32,.03,.16]);C.mat(8,140,230).col(70,72,76);
      lights.push({type:1,pos:[head[0],head[1]-.3,head[2]],r:30,col:[184,198,230],dir:[0,-1,0],cosO:Math.cos(1.2),cosI:Math.cos(.62),src:.2,axis:[0,0,0],flick:0});}}
  /* ---------- blocks: raised sidewalks, then buildings, the park ---------- */
  const slab=(x0,y0,x1,y1,edges)=>{C.mat(3).col(255,0,0,255);quad(x0,y0,x1,y1,.15,[[x0,-y0],[x1,-y0],[x1,-y1],[x0,-y1]]);
    if(!edges)return;C.mat(4,0).col(255,0,0,255);const B2=C.at((x0+x1)/2,-(y0+y1)/2),lo=-.3,t=.15;
    if(edges.s!==false)B2.quadP(W(x0,y0,lo),W(x1,y0,lo),W(x1,y0,t),W(x0,y0,t),[[x0,lo],[x1,lo],[x1,t],[x0,t]],[0,0,1]);
    if(edges.n!==false)B2.quadP(W(x1,y1,lo),W(x0,y1,lo),W(x0,y1,t),W(x1,y1,t),[[x1,lo],[x0,lo],[x0,t],[x1,t]],[0,0,-1]);
    if(edges.e!==false)B2.quadP(W(x1,y0,lo),W(x1,y1,lo),W(x1,y1,t),W(x1,y0,t),[[y0,lo],[y1,lo],[y1,t],[y0,t]],[1,0,0]);
    if(edges.w!==false)B2.quadP(W(x0,y1,lo),W(x0,y0,lo),W(x0,y0,t),W(x0,y1,t),[[y1,lo],[y0,lo],[y0,t],[y1,t]],[-1,0,0]);};
  for(const b of M.blocks){
    if(!b.corner)slab(b.x0,b.y0,b.x1,b.y1,{});
    else for(let x=b.x0;x<b.x1;x+=4)for(let y=b.y0;y<b.y1;y+=4){const x1=Math.min(b.x1,x+4),y1=Math.min(b.y1,y+4);if(baseGround(M,(x+x1)/2,(y+y1)/2)>.1)slab(x,y,x1,y1,false);}
    if(b.district==='park')park(b);
  }
  /* outside the ring: the sidewalk band, cut where the roads leave town */
  const O0=RING+ROADS.ring.hw,O1=EDGE,hx=EXIT_HW;
  for(const sg of [1,-1]){
    for(const [a,b] of [[-S,-hx],[hx,S]]){slab(a,sg>0?O0:-O1,b,sg>0?O1:-O0,{});slab(sg>0?O0:-O1,a,sg>0?O1:-O0,b,{});}}
  for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
    /* the band round each rounded corner, in short straight pieces */
    const n=14;for(let k=0;k<n;k++){const t0=k/n*Math.PI/2,t1=(k+1)/n*Math.PI/2,r0=CORNER+ROADS.ring.hw,r1=CORNER+ROADS.ring.hw+6;
      const P=(t,r)=>[sx*(S+Math.cos(t)*r),sy*(S+Math.sin(t)*r)];const [a,b,c,d]=[P(t0,r0),P(t1,r0),P(t1,r1),P(t0,r1)];
      C.mat(3).col(255,0,0,255);const Bq=C.at((a[0]+c[0])/2,-(a[1]+c[1])/2);const up=[0,1,0];
      const flip=sx*sy<0;const q=[W(a[0],a[1],.15),W(b[0],b[1],.15),W(c[0],c[1],.15),W(d[0],d[1],.15)];
      if(flip)Bq.quadP(q[0],q[1],q[2],q[3],[[a[0],-a[1]],[b[0],-b[1]],[c[0],-c[1]],[d[0],-d[1]]],up);else Bq.quadP(q[3],q[2],q[1],q[0],[[d[0],-d[1]],[c[0],-c[1]],[b[0],-b[1]],[a[0],-a[1]]],up);
      C.mat(4,0).col(255,0,0,255);const e0=W(d[0],d[1],-.3),e1=W(c[0],c[1],-.3),e2=W(c[0],c[1],.15),e3=W(d[0],d[1],.15);
      if(flip)Bq.quadP(e1,e0,e3,e2,[[0,0],[1,0],[1,1],[0,1]]);else Bq.quadP(e0,e1,e2,e3,[[0,0],[1,0],[1,1],[0,1]]);}
  }
  function park(b){
    const x0=b.x0+b.sw.w,x1=b.x1-b.sw.e,y0=b.y0+b.sw.s,y1=b.y1-b.sw.n;
    C.mat(19).col(255,0,0,255);quad(x0,y0,x1,y1,.17,[[x0,-y0],[x1,-y0],[x1,-y1],[x0,-y1]]);
    C.mat(3).col(255,0,0,255);const cx=(x0+x1)/2,cy=(y0+y1)/2;
    for(const [ax,ay] of [[1,1],[1,-1]]){const L=Math.hypot(x1-x0,y1-y0)/2,d=norm([ax*(x1-x0),0,-ay*(y1-y0)]);C.at(cx,-cy).box(W(cx,cy,.18),d,[0,1,0],norm([d[2],0,-d[0]]),[L,.015,1.4]);}
    for(let k=0;k<26;k++){const tx=x0+4+R()*(x1-x0-8),ty=y0+4+R()*(y1-y0-8);if(Math.abs(Math.abs((tx-cx)/(x1-x0))-Math.abs((ty-cy)/(y1-y0)))<.04)continue;K.tree(tx,ty,.17,1.2);}
    for(let k=0;k<8;k++){const a=k/8*6.283,px=cx+Math.cos(a)*(x1-x0)*.32,py=cy+Math.sin(a)*(y1-y0)*.32;K.lamp(px,py,.17,[0,0],{arm:0,height:4.5});}
    C.mat(4,0).col(255,0,0,255);C.at(cx,-cy).tube(W(cx,cy,.17),W(cx,cy,.6),5,24,true);C.mat(9,8).col(90,140,255);C.at(cx,-cy).tube(W(cx,cy,.55),W(cx,cy,.62),4.6,24,true);
    info.park={x:cx,y:cy};
  }
  /* ---------- buildings ---------- */
  const SIGNS={neon:.75,downtown:.24,mixed:.3,residential:.12,industrial:.05};
  for(const lot of M.lots){
    const dz=lot.district;
    K.building(lot,f=>K.signs(f,SIGNS[dz]||.2,dz==='neon'||dz==='downtown'||dz==='mixed'));
    if((dz==='downtown'||dz==='neon'||dz==='mixed')&&!lot.tower&&lot.h<34&&R()<.25){
      const sides=Object.keys(lot.street).filter(k=>lot.street[k]);if(sides.length){const sd=sides[Math.floor(R()*sides.length)];
        const F={s:[[lot.x0,lot.y0],[lot.x1,lot.y0],0,-1],n:[[lot.x1,lot.y1],[lot.x0,lot.y1],0,1],e:[[lot.x1,lot.y0],[lot.x1,lot.y1],1,0],w:[[lot.x0,lot.y1],[lot.x0,lot.y0],-1,0]}[sd];
        K.billboard(F[0],F[1],F[2],F[3],lot.h);}}
  }
  /* the ground under the town (the desert's ground starts at its edge) */
  C.mat(11,1).col(255,0,0,255);
  for(let gx=-EDGE;gx<EDGE;gx+=EDGE/2)for(let gy=-EDGE;gy<EDGE;gy+=EDGE/2){const g2=EDGE/2;
    C.at(gx+g2/2,-(gy+g2/2)).quadP(W(gx,gy,-.12),W(gx+g2,gy,-.12),W(gx+g2,gy+g2,-.12),W(gx,gy+g2,-.12),[[gx,-gy],[gx+g2,-gy],[gx+g2,-gy-g2],[gx,-gy-g2]],[0,1,0]);}
  return {K,info};
}
