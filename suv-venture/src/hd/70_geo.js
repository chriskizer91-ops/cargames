/* =====================================================================================
   THE STUDIO'S GEOMETRY KIT. Everything here writes into the game's mesh builder (MB: flat triangles with a
   colour, an emissive and a material id per vertex), so the studio's parts come out in the same form as the
   game's own and could be handed back to the game. Each part is built in its own MB, smoothed with its own
   crease angle, then poured into the part list (hdPut).
   ===================================================================================== */
/* the studio's own materials (the game's run to 31; 13_lit leaves 70 and up free) */
const SM={LENS:70,BULB:71,GLOSSBLK:72,VINYL:73,CARPET:74,DASH:75,TREAD:76,WALL:77,BRUSH:78,LUG:79,ROTORF:80,
  REFLC:81,AMBERL:82,REDL:83,SEAT:84,HEADLINER:85,GAUGE:86,SATIN:87,BOLT:88,SEAL:89,MIRROR:90,TINT:91,HONEY:92,CAST:93,LINER:94,CLADS:95};
const SV=(c,m,em=0)=>[c,em,m];
const HC={LENS:SV([1,1,1],SM.LENS),BULB:SV([1,1,1],SM.BULB),GB:SV([.012,.012,.013],SM.GLOSSBLK),VINYL:SV(lin('#2b2a29'),SM.VINYL),
  CARPET:SV(lin('#242322'),SM.CARPET),DASH:SV(lin('#262524'),SM.DASH),TREAD:SV([.028,.028,.03],SM.TREAD),WALL:SV([.03,.03,.032],SM.WALL),
  BRUSH:SV(lin('#9a9ca0'),SM.BRUSH),LUG:SV([1,1,1],SM.LUG),ROTORF:SV(lin('#7d7c7a'),SM.ROTORF),REFLC:SV([1,1,1],SM.REFLC),
  AMBERL:SV([1,1,1],SM.AMBERL),REDL:SV([1,1,1],SM.REDL),SEAT:SV(lin('#3a3836'),SM.SEAT),HEADLINER:SV(lin('#8f8a82'),SM.HEADLINER),
  GAUGE:SV(lin('#0d0e10'),SM.GAUGE),SATIN:SV(lin('#55575b'),SM.SATIN),BOLT:SV(lin('#8a8c90'),SM.BOLT),SEAL:SV([.015,.015,.016],SM.SEAL),
  MIRROR:SV([1,1,1],SM.MIRROR),TINT:SV([1,1,1],SM.TINT),HONEY:SV([.01,.01,.011],SM.HONEY),CAST:SV(lin('#3c3d40'),SM.CAST),LINER:SV(lin('#111112'),SM.LINER)};
/* a part list: many MBs poured into one (each already smoothed) */
function hdPut(dst,src){for(let i=0;i<src.p.length;i++)dst.p.push(src.p[i]);for(let i=0;i<src.n.length;i++)dst.n.push(src.n[i]);
  for(let i=0;i<src.c.length;i++)dst.c.push(src.c[i]);for(let i=0;i<src.m.length;i++)dst.m.push(src.m[i]);return dst;}
/* a fresh part: build it with f(mb), smooth it, pour it into dst */
function hdPart(dst,f,deg=35,o=null,M=null){const mb=new MB();if(M)mb.setM(M);f(mb);mb.M=null;if(deg>0)mb.smooth(deg,o);hdPut(dst,mb);return mb;}
/* revolve a profile [[r,z],...] about the z axis, n steps from a0 to a1 (whole turn by default) */
function hdRev(mb,prof,n,m,a0=0,a1=TAU,flip=false){
  const full=Math.abs(a1-a0-TAU)<1e-9;
  for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n,b=a0+(a1-a0)*(i+1)/n,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
    for(let k=0;k<prof.length-1;k++){const p=prof[k],q=prof[k+1];if(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])<1e-7)continue;
      const A=[ca*p[0],sa*p[0],p[1]],B=[cb*p[0],sb*p[0],p[1]],C=[cb*q[0],sb*q[0],q[1]],D=[ca*q[0],sa*q[0],q[1]];
      if(flip)mb.quad(A,D,C,B,m[0],m[1],m[2]);else mb.quad(A,B,C,D,m[0],m[1],m[2]);}}
  return full;}
/* a profile loft: rings of 3-D points (all the same length), joined in order; closed rings wrap */
function hdLoft(mb,rings,m,closed=true,flip=false){
  for(let i=0;i<rings.length-1;i++){const A=rings[i],B=rings[i+1],n=A.length;
    for(let j=0;j<(closed?n:n-1);j++){const j1=(j+1)%n;if(flip)mb.quad(A[j],A[j1],B[j1],B[j],m[0],m[1],m[2]);else mb.quad(A[j],B[j],B[j1],A[j1],m[0],m[1],m[2]);}}}
/* close a ring with a fan to its centre (flat-ish caps) */
function hdCap(mb,ring,m,flip=false){let c=[0,0,0];for(const p of ring){c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];}c=c.map(v=>v/ring.length);
  for(let j=0;j<ring.length;j++){const a=ring[j],b=ring[(j+1)%ring.length];if(flip)mb.tri(c,b,a,m[0],m[1],m[2]);else mb.tri(c,a,b,m[0],m[1],m[2]);}}
/* a rounded rectangle outline [x,y] (half sizes hx, hy, corner radius r, nc steps a corner), anticlockwise */
function hdRRect(hx,hy,r,nc=6,cx=0,cy=0){r=Math.min(r,hx,hy);const o=[];const C=[[hx-r,hy-r,0],[-hx+r,hy-r,1],[-hx+r,-hy+r,2],[hx-r,-hy+r,3]];
  for(const [x,y,q] of C)for(let k=0;k<=nc;k++){const a=(q+k/nc)*PI/2;o.push([cx+x+Math.cos(a)*r,cy+y+Math.sin(a)*r]);}return o;}
/* a box with every edge rounded (radius r), centred at c with half sizes h: a cube's grid pushed onto the rounded shape */
function hdRBox(mb,c,h,r,m,seg=4){
  const g=[];const n=seg*2+2;
  /* stations along one axis: dense in the rounds, one step across the flat middle */
  const st=hh=>{const s=[];for(let k=0;k<=seg;k++)s.push(-hh+r-r*Math.cos(k/seg*PI/2));for(let k=seg;k>=0;k--)s.push(hh-r+r*Math.cos(k/seg*PI/2));return s;};
  const sx=st(h[0]),sy=st(h[1]),sz=st(h[2]);
  const P=(x,y,z)=>{const ix=clamp(x,-h[0]+r,h[0]-r),iy=clamp(y,-h[1]+r,h[1]-r),iz=clamp(z,-h[2]+r,h[2]-r),dx=x-ix,dy=y-iy,dz=z-iz,l=Math.hypot(dx,dy,dz)||1;
    return [c[0]+ix+dx/l*r*(l>1e-9?1:0),c[1]+iy+dy/l*r*(l>1e-9?1:0),c[2]+iz+dz/l*r*(l>1e-9?1:0)];};
  /* the six faces, each a grid over the other two axes' stations, wound outward */
  const face=(A,Bs,fix,ax,sgn)=>{for(let i=0;i<A.length-1;i++)for(let j=0;j<Bs.length-1;j++){
    const q=(a,b)=>{const v=[0,0,0];v[ax]=fix;v[(ax+1)%3]=a;v[(ax+2)%3]=b;return P(v[0],v[1],v[2]);};
    const p0=q(A[i],Bs[j]),p1=q(A[i+1],Bs[j]),p2=q(A[i+1],Bs[j+1]),p3=q(A[i],Bs[j+1]);
    if(sgn>0)mb.quad(p0,p1,p2,p3,m[0],m[1],m[2]);else mb.quad(p0,p3,p2,p1,m[0],m[1],m[2]);}};
  face(sy,sz,h[0],0,1);face(sy,sz,-h[0],0,-1);face(sz,sx,h[1],1,1);face(sz,sx,-h[1],1,-1);face(sx,sy,h[2],2,1);face(sx,sy,-h[2],2,-1);}
/* a cylinder from a to b, radius r (or r0 to r1), n sides, with caps */
function hdCyl(mb,a,b,r0,r1,n,m,caps=true){
  const d=V3.norm(V3.sub(b,a)),up=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],u=V3.norm(V3.cross(d,up)),v=V3.cross(d,u);
  const ring=(c,r)=>{const o=[];for(let i=0;i<n;i++){const t=i/n*TAU;o.push(V3.add(c,V3.add(V3.mul(u,Math.cos(t)*r),V3.mul(v,Math.sin(t)*r))));}return o;};
  const A=ring(a,r0),B=ring(b,r1);hdLoft(mb,[A,B],m,true);if(caps){hdCap(mb,A,m,false);hdCap(mb,B,m,true);}}
/* ear clipping for a simple polygon [[x,y],...] (either winding): triangles as index triples */
function hdTri2(P){const n=P.length;if(n<3)return [];let A=0;for(let i=0;i<n;i++){const p=P[i],q=P[(i+1)%n];A+=p[0]*q[1]-q[0]*p[1];}
  const idx=[...Array(n).keys()];if(A<0)idx.reverse();const out=[];let guard=0;
  const cr=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const inT=(p,a,b,c)=>cr(a,b,p)>=0&&cr(b,c,p)>=0&&cr(c,a,p)>=0;
  while(idx.length>3&&guard++<5000){let cut=false;
    for(let i=0;i<idx.length;i++){const ia=idx[(i+idx.length-1)%idx.length],ib=idx[i],ic=idx[(i+1)%idx.length],a=P[ia],b=P[ib],c=P[ic];
      if(cr(a,b,c)<=1e-12)continue;let ok=true;for(const j of idx){if(j===ia||j===ib||j===ic)continue;if(inT(P[j],a,b,c)){ok=false;break;}}
      if(ok){out.push([ia,ib,ic]);idx.splice(i,1);cut=true;break;}}
    if(!cut)break;}
  if(idx.length===3)out.push([idx[0],idx[1],idx[2]]);return out;}
/* a flat outline [[x,y]] pushed out along z from z0 to z1, its front edge rounded by bevel b (nb steps):
   the front face at z1, the walls, and the back face at z0 if back */
function hdExtrude(mb,poly,z0,z1,m,b=0,nb=3,back=false,mw=null){
  /* inset outline by d (miter offsets; fine for gently curved outlines) */
  const n=poly.length;let A=0;for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n];A+=p[0]*q[1]-q[0]*p[1];}const s=A>0?1:-1;
  const inset=d=>poly.map((p,i)=>{const a=poly[(i+n-1)%n],c=poly[(i+1)%n],e1=V3.norm([p[0]-a[0],p[1]-a[1],0]),e2=V3.norm([c[0]-p[0],c[1]-p[1],0]);
    const n1=[-e1[1]*s,e1[0]*s],n2=[-e2[1]*s,e2[0]*s],nm=V3.norm([n1[0]+n2[0],n1[1]+n2[1],0]),k=Math.max(.35,nm[0]*n1[0]+nm[1]*n1[1]);return [p[0]+nm[0]*d/k,p[1]+nm[1]*d/k];});
  const rings=[];const R3=(o,z)=>o.map(p=>[p[0],p[1],z]);
  rings.push(R3(poly,z0));
  if(b>0){for(let k=0;k<=nb;k++){const t=k/nb*PI/2;rings.push(R3(inset(b*(1-Math.cos(t))),z1-b+b*Math.sin(t)));}}else rings.push(R3(poly,z1));
  hdLoft(mb,rings,mw||m,true,s<0);
  const top=b>0?inset(b):poly,T=hdTri2(top);for(const [i,j,k] of T)mb.tri([top[i][0],top[i][1],z1],[top[j][0],top[j][1],z1],[top[k][0],top[k][1],z1],m[0],m[1],m[2]);
  if(back){const T2=hdTri2(poly);for(const [i,j,k] of T2)mb.tri([poly[k][0],poly[k][1],z0],[poly[j][0],poly[j][1],z0],[poly[i][0],poly[i][1],z0],m[0],m[1],m[2]);}}
/* a tube of radius r along a 3-D path (parallel-transport frames), nr sides */
function hdTube(mb,path,r,nr,m,closed=false,caps=true){
  const rings=[];let up=null;
  for(let i=0;i<path.length;i++){const p=path[i],a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
    let t=V3.norm(V3.sub(b,a));if(closed&&(i===0||i===path.length-1))t=V3.norm(V3.sub(path[1],path[path.length-2]));
    if(!up){const g=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];up=V3.norm(V3.cross(V3.cross(t,g),t));}
    else{up=V3.norm(V3.sub(up,V3.mul(t,V3.dot(up,t))));}
    const sd=V3.cross(t,up),rr=typeof r==='function'?r(i/(path.length-1)):r,ring=[];
    for(let k=0;k<nr;k++){const a2=k/nr*TAU;ring.push(V3.add(p,V3.add(V3.mul(up,Math.cos(a2)*rr),V3.mul(sd,Math.sin(a2)*rr))));}rings.push(ring);}
  hdLoft(mb,rings,m,true);if(caps&&!closed){hdCap(mb,rings[0],m,true);hdCap(mb,rings[rings.length-1],m,false);}}
/* a profile [[x,y]] (in the plane across the path) swept along a 3-D path, with the given up vector kept */
function hdSweep(mb,path,prof,m,upv=[0,1,0],closedProf=true,caps=false){
  const rings=[];
  for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],t=V3.norm(V3.sub(b,a));
    let u=V3.norm(V3.sub(upv,V3.mul(t,V3.dot(upv,t)))),s=V3.cross(t,u);
    rings.push(prof.map(q=>V3.add(path[i],V3.add(V3.mul(s,q[0]),V3.mul(u,q[1])))));}
  hdLoft(mb,rings,m,closedProf);if(caps){hdCap(mb,rings[0],m,true);hdCap(mb,rings[rings.length-1],m,false);}}
/* a transform for parts built about the origin: translate to p, turn by yaw (about y), pitch (about z), roll (about x) */
function hdM(p,yaw=0,pitch=0,roll=0,s=null){let M=M4T(p[0],p[1],p[2]);if(yaw)M=M4.mul(M,M4RY(yaw));if(pitch)M=M4.mul(M,M4RZ(pitch));if(roll)M=M4.mul(M,M4RX(roll));
  if(s)M=M4.mul(M,M4S(s[0],s[1],s[2]));return M;}
