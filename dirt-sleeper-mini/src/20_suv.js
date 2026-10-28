/* =====================================================================================
   THE TRUCK — an original mid-2000s midsize SUV, lofted from cross-sections the way the
   Shiftlight cars are. Real proportions (4.92 m long, 2.89 m wheelbase, 1.87 m wide, 1.85 m
   tall over the rails); the details follow the three concept sheets, with no badges and no
   signature grille. Every section is generated from a few designed lines: the side silhouette
   (bumper, grille face, hood, windshield, roof, liftgate), the shoulder, the lower edge, the
   plan-view width and a cladding line. The greenhouse grows out of the deck wherever the roof
   line rises above the glass, so the windshield, pillars and glass fall out of the same curves.
   Lamps, grilles, glass, shut lines and handles are projection decals: 2-D shapes drawn in
   front, rear, top or side view and wrapped onto whatever surface they land on.
   Local axes: +X forward, +Y up, +Z right; origin on the ground at the middle of the body.
   ===================================================================================== */
const SUVB={
  L:4.92,ovF:.93,wb:2.89,R0:.378,
  /* side silhouette, top: bumper face, ledge, grille face, hood, windshield, roof, rear glass, liftgate, bumper */
  top:[[0,.42],[0,.715,.06],[.075,.758,.02],[.10,.768,.012],[.137,1.052,.07],[.5,1.112,.6],[1.48,1.152,.05],[2.32,1.768,.26],[3.5,1.79,1.6],[4.6,1.776,.13],[4.80,1.21,.035],[4.838,.80,.02],[4.92,.772,.035],[4.92,.46]],
  /* the shoulder: fender tops at the hood edge, then the belt line under the glass */
  belt:[[0,.68],[.137,1.0,.1],[.45,1.088,.4],[1.0,1.128,.5],[1.48,1.146,.5],[3.0,1.162,1.5],[4.5,1.186,.4],[4.92,1.192]],
  /* lowest edge: air dam, rockers, rear bumper */
  sill:[[0,.46],[0,.40,.05],[.32,.37,.2],[1.6,.345,.5],[3.3,.345,.5],[4.42,.40,.2],[4.92,.465,.05],[4.92,.52]],
  /* plan view half-width */
  plan:[[0,0],[0,.80,.30],[.42,.93,.55],[2.4,.936,1.2],[4.4,.932,.45],[4.92,.872,.2],[4.92,0]],
  /* the top of the textured lower cladding: front valance, rockers, the whole rear bumper */
  clad:[[0,.565],[.47,.565],[.52,.60],[4.25,.60],[4.31,.80],[4.92,.80]],
  /* greenhouse: windshield base, roof front, roof rear, rear glass end, glass base lift and inset,
     roof width, crown, the D-pillar line and the black pillars between the side windows [u, lean, half width] */
  G:{cowl:1.48,rf:2.32,rr:4.60,be:4.80,base:.012,inset:.034,tum:.80,crown:.03,cB:4.53,cT:4.36,pillars:[[2.62,-.07,.032],[3.56,-.03,.03]]},
  dome:[.32,1.42,.022],bumperF:.088,bumperR:4.845
};
const MM={
  PAINT:V([1,1,1],MAT.PAINT),ACC:V([1,1,1],MAT.ACCENT),GL:V([0,0,0],MAT.GLASS),GLL:V([0,0,0],MAT.GLASSL),
  TRIM:V([.010,.010,.012],MAT.COL),BLACK:V([.022,.022,.024],MAT.METAL),CLAD:V([1,1,1],MAT.CLAD),CHROME:V([1,1,1],MAT.CHROME),
  MESH:V([0,0,0],MAT.MESH),HEAD:V([1,1,1],MAT.HEAD),TAIL:V([1,1,1],MAT.TAIL),AMBER:V([1,1,1],MAT.AMBER),LED:V([1,1,1],MAT.LED),
  HALO:V([1,1,1],MAT.HALO),REV:V([1,1,1],MAT.REV),SMOKE:V([1,1,1],MAT.SMOKE),REFL:V([1,1,1],MAT.REFL),PLATE:V([1,1,1],MAT.PLATE),
  SHUT:V([1,1,1],MAT.SHUT),UNDER:V([.028,.028,.03],MAT.METAL),RUBBER:V([.022,.022,.024],MAT.RUBBER),CARBON:V([1,1,1],MAT.CARBON),
  LOUVRE:V([1,1,1],MAT.LOUVRE),STEEL:V([.03,.03,.032],MAT.METAL),ALU:V([.35,.36,.38],MAT.METAL)
};
const col=(h,mat=MAT.METAL,em=0)=>V(lin(h),mat,em);
function suvDesign(look){
  const B=SUVB,L=B.L,R=look.tyre.R,dy=look.lift+(R-B.R0);
  const D={look,B,G:B.G,L,R,dy,uFa:B.ovF,uRa:B.ovF+B.wb,uC:L/2};
  const up=k=>[k[0],k[1]+dy,k[2]||0];
  D.top=profLine(B.top.map(up),L,1);D.belt=profLine(B.belt.map(up),L,1);D.sill=profLine(B.sill.map(up),L,-1);D.plan=profLine(B.plan,L,1);
  D.cladY=pwl(B.clad.map(k=>[k[0],k[1]+dy]));
  D.Hr=1.79+dy;D.sh=.968;
  const a=look.archR;D.arch={a,b:a*(look.archH||.985),n:look.archN||2.3,cy:B.R0+dy};
  D.cO=look.clad===false?0:.012;
  D.dome=u=>B.dome[2]*plat(u,(B.dome[0]+B.dome[1])/2,(B.dome[1]-B.dome[0])/2,.12);
  D.X=u=>D.uC-u;
  return D;
}
/* the arch opening (a superellipse, squarer as n grows): its top edge at u, or -1 */
function archY(D,u){let y=-1;const A=D.arch;for(const ua of [D.uFa,D.uRa]){const d=Math.abs(u-ua)/A.a;if(d<1)y=Math.max(y,A.cy+A.b*Math.pow(1-Math.pow(d,A.n),1/A.n));}return y;}
function archPt(D,ua,phi,grow=0){const A=D.arch,c=Math.cos(phi),s=Math.sin(phi),e=2/A.n;return [ua-(A.a+grow)*Math.sign(c)*Math.pow(Math.abs(c),e),A.cy+(A.b+grow)*Math.pow(Math.abs(s),e)];}
/* 14 key points (z,y) of the right half-section at u: 0 floor edge, 1 sill lip, 2 cladding top, 3 the
   step onto the paint, 4-5 body side, 6 shoulder, 7 shoulder top, 8-12 deck or greenhouse, 13 centre */
function secKeys(D,u){
  const G=D.G,L=D.L,hb=D.plan(u),hs=hb*D.sh;
  const ySill=D.sill(u);let yS=ySill;const ya=archY(D,u);
  const arch=clamp((ya-yS)/.05,0,1);if(ya>yS)yS=ya;
  const ends=sm01(u/.35)*sm01((L-u)/.35),yT=D.top(u);
  let yB=Math.min(D.belt(u),yT+.15*ends);yB=Math.max(yB,yS+.1);
  const yc=Math.max(yS+.02,Math.min(D.cladY(u),yB-.12)),cO=D.cO,sk=D.look.skirt||0;
  const hip=.018*Math.max(plat(u,D.uFa,.42,.3),plat(u,D.uRa,.42,.3)),hl=hb+hip;
  const P=new Array(14);
  P[0]=[hb*.84,Math.max(ySill+.04,yS)];
  P[1]=[hl*lerp(.96,.985,arch)+cO+sk*.02*(1-arch),yS-sk*.03*(1-arch)];
  P[2]=[hl*.995+cO+sk*.012*(1-arch),yc];
  P[3]=[hl*.99,yc+.006];
  P[4]=[hl,yc+(yB-yc)*.45];
  P[5]=[hl*.5+hs*.5,yB-(yB-yc)*.14];
  P[6]=[hs,yB];
  P[7]=[hs-.028,yB+.011];
  const z7=P[7][0],y7=P[7][1],dm=D.dome(u);
  const dk=(fr,d)=>[z7*fr,yT+(y7-yT)*Math.pow(fr,2.4)+d];
  let Q=[dk(.86,0),dk(.66,0),dk(.47,0),dk(.43,dm),dk(.18,dm)];
  const yG=yB+G.base,gk=sm01((yT-yG)/.09);
  if(gk>0){
    const zG=Math.min(z7-.006,hs-G.inset),kc=sm01((yT-yG)/.22),cr=G.crown;
    const yE=yT-(cr+.03)*kc,zR=hs*G.tum,te=clamp((yE-yG)/Math.max(.05,D.Hr-yG),0,1),zE=zG+(zR-zG)*te;
    const g=[[zG,yG],[(zG+zE)/2+.006*kc,(yG+yE)/2],[zE,yE],[zE-.05*kc,yE+.026*kc],[zE*.52,yT-cr*.22*kc]];
    Q=Q.map((d,i)=>[lerp(d[0],g[i][0],gk),lerp(d[1],g[i][1],gk)]);
  }
  for(let i=0;i<5;i++)P[8+i]=Q[i];
  P[13]=[0,yT+dm*(1-gk)];
  return {P,gk,yG,yT,yB,yS,yc,arch,hb,hs,dm};
}
/* refine to 27 points: Catmull-Rom midpoints, with creases (sill lip, cladding step, shoulder, glass
   base, drip rail, the edges of the hood dome) cut sharp by extrapolating along the span */
const NK=14,NR=2*(NK-1)+1;
function secRing(D,u){
  const s=secKeys(D,u),P=s.P,dmk=s.dm>.002?1-s.gk:0;
  const cw=[1,1,1,1,0,0,.85,0,s.gk,0,Math.max(.6*s.gk,dmk),dmk,0,0];
  const p=[];
  for(let i=0;i<NK-1;i++){const a=P[i],b=P[i+1],pa=i>0?P[i-1]:null,pb=i<NK-2?P[i+2]:[-P[NK-2][0],P[NK-2][1]];
    const ea=[2*a[0]-b[0],2*a[1]-b[1]],eb=[2*b[0]-a[0],2*b[1]-a[1]],wa=i===0?1:cw[i],wb=cw[i+1];
    const p0=pa?[lerp(pa[0],ea[0],wa),lerp(pa[1],ea[1],wa)]:ea,p3=[lerp(pb[0],eb[0],wb),lerp(pb[1],eb[1],wb)];
    p.push(a,[(-p0[0]+9*a[0]+9*b[0]-p3[0])/16,(-p0[1]+9*a[1]+9*b[1]-p3[1])/16]);}
  p.push(P[NK-1]);s.p=p;return s;
}
function faceMat(D,u,K,y,gk,yG){
  const G=D.G,lk=D.look;
  if(K===0)return MM.UNDER;
  if(K<=2)return D.cO>0?MM.CLAD:MM.PAINT;
  if(u>SUVB.bumperR&&K>=3&&lk.rearClad!==false&&D.cO>0)return MM.CLAD;
  if(K<=7)return MM.PAINT;
  if(u<G.cowl||u>G.be)return MM.PAINT;
  if(K<=9){if(gk<.5)return MM.PAINT;const t=clamp((y-yG)/Math.max(.05,D.Hr-yG),0,1);return u<lerp(G.cB,G.cT,t)-.03?MM.TRIM:MM.PAINT;}
  if(K===10)return MM.PAINT;
  if(u<G.rf)return MM.GLL;
  if(u<G.rr)return lk.roofBlack?MM.TRIM:MM.PAINT;
  return MM.GL;
}
/* ---------- the builder ---------- */
function buildSUV(look){
  const D=suvDesign(look),G=D.G,L=D.L,X=D.X,dy=D.dy;
  const mb=new MB(),pm=new MB();
  /* stations: 5 cm everywhere, 5 mm across the vertical faces at both ends, dense around the arches
     and wherever the greenhouse changes */
  const US=[];{const s=new Set(),a=u=>{if(u>=0&&u<=L)s.add(Math.round(u*4000)/4000);};
    for(let u=0;u<=L+1e-6;u+=.05)a(u);
    for(let u=0;u<.2;u+=.005)a(u);for(let u=L-.2;u<=L+1e-6;u+=.005)a(u);
    for(const ua of [D.uFa,D.uRa]){for(let k=0;k<=28;k++)a(archPt(D,ua,k/28*PI)[0]);a(ua-D.arch.a-.012);a(ua+D.arch.a+.012);}
    for(let u=G.cowl-.06;u<G.cowl+.3;u+=.012)a(u);for(let u=G.rr-.06;u<G.be+.06;u+=.012)a(u);
    for(const k of [G.rf,G.cB,G.cT,SUVB.bumperR,SUVB.bumperF,.47,.52,4.25,4.31,SUVB.dome[0],SUVB.dome[1]])a(k-.012),a(k),a(k+.012);
    for(const [pu,ln,w] of G.pillars)for(const o of [-w,w])a(pu+o),a(pu+ln+o);
    const srt=[...s].sort((p,q)=>p-q);for(const u of srt)if(!US.length||u-US[US.length-1]>.002)US.push(u);
    if(US[US.length-1]<L-1e-6)US.push(L);else US[US.length-1]=L;}
  const memo=new Map(),ringAt=u=>{const k=Math.round(u*1e4);let r=memo.get(k);if(!r){r=secRing(D,k/1e4);memo.set(k,r);}return r;};
  const rings=US.map(ringAt);
  /* skin */
  for(let i=0;i<US.length-1;i++){
    const A=rings[i],B=rings[i+1],ua=US[i],ub=US[i+1],um=(ua+ub)/2,gk=(A.gk+B.gk)/2,xa=X(ua),xb=X(ub);
    for(let j=0;j<NR-1;j++){
      const a0=A.p[j],a1=A.p[j+1],b0=B.p[j],b1=B.p[j+1];
      if(Math.abs(a0[0]-a1[0])+Math.abs(a0[1]-a1[1])+Math.abs(b0[0]-b1[0])+Math.abs(b0[1]-b1[1])<1e-5)continue;
      const m=faceMat(D,um,j>>1,(a0[1]+a1[1]+b0[1]+b1[1])/4,gk,(A.yG+B.yG)/2);
      for(const sd of [1,-1])mb.quad([xa,a0[1],a0[0]*sd],[xb,b0[1],b0[0]*sd],[xb,b1[1],b1[0]*sd],[xa,a1[1],a1[0]*sd],m[0],m[1],m[2]);
    }
    mb.quad([xa,A.p[0][1],A.p[0][0]],[xb,B.p[0][1],B.p[0][0]],[xb,B.p[0][1],-B.p[0][0]],[xa,A.p[0][1],-A.p[0][0]],MM.UNDER[0],0,MM.UNDER[2]);
  }
  /* the faces at both ends, in horizontal bands so the bumpers can be two-tone */
  for(const [i,front] of [[0,1],[US.length-1,0]]){const r=rings[i].p,x=X(US[i]);
    for(let j=0;j<NR-1;j++){const a=r[j],b=r[j+1],ym=(a[1]+b[1])/2;
      const m=front?(ym<D.cladY(0)&&D.cO>0?MM.CLAD:MM.PAINT):(D.cO>0&&look.rearClad!==false?MM.CLAD:MM.PAINT);
      mb.quad([x,a[1],a[0]],[x,b[1],b[0]],[x,b[1],-b[0]],[x,a[1],-a[0]],m[0],m[1],m[2]);}
  }
  /* wheel wells: inner walls so the arches read as deep holes */
  for(const ua of [D.uFa,D.uRa]){const zi=D.plan(ua)*.78,n=16;
    for(let k=0;k<n;k++){const p0=archPt(D,ua,PI*k/n),p1=archPt(D,ua,PI*(k+1)/n),yb=D.arch.cy-.06;
      for(const sd of [1,-1])pm.quad([X(p0[0]),yb,zi*sd],[X(p1[0]),yb,zi*sd],[X(p1[0]),p1[1],zi*sd],[X(p0[0]),p0[1],zi*sd],MM.UNDER[0],0,MM.UNDER[2]);
      for(const sd of [1,-1])pm.quad([X(p0[0]),p0[1],zi*sd],[X(p1[0]),p1[1],zi*sd],[X(p1[0]),p1[1],D.plan(p1[0])*.9*sd],[X(p0[0]),p0[1],D.plan(p0[0])*.9*sd],MM.UNDER[0],0,MM.UNDER[2]);}}
  /* ---------- surface lookups for decals and parts ---------- */
  const inside=(u,z,y)=>zOut(ringAt(u).p,y)>=Math.abs(z);
  /* first station (from the nose, or from the tail) whose section holds (z,y), refined by bisection */
  const uFront=(z,y)=>{if(inside(0,z,y))return 0;let i=1;while(i<US.length&&!inside(US[i],z,y))i++;if(i>=US.length)return 0;
    let a=US[i-1],b=US[i];for(let k=0;k<6;k++){const m=(a+b)/2;if(inside(m,z,y))b=m;else a=m;}return b;};
  const uRear=(z,y)=>{const n=US.length-1;if(inside(L,z,y))return L;let i=n-1;while(i>0&&!inside(US[i],z,y))i--;if(i<=0)return L;
    let a=US[i],b=US[i+1];for(let k=0;k<6;k++){const m=(a+b)/2;if(inside(m,z,y))a=m;else b=m;}return a;};
  const topY=(u,z)=>{const p=ringAt(u).p;let y=yAt(p,Math.abs(z));if(y<-1e8){let zm=0;for(const q of p)zm=Math.max(zm,q[0]);y=yAt(p,Math.min(Math.abs(z),zm*.995));}return y;};
  const sideZ=(u,y)=>{const p=ringAt(u).p;let z=zOut(p,y);if(z<0){let y0=1e9,y1=-1e9;for(const q of p){y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}z=zOut(p,clamp(y,y0+.001,y1-.001));}return Math.max(0,z);};
  const MAP={F:(q,o)=>[X(uFront(q[0],q[1]))+o,q[1],q[0]],R:(q,o)=>[X(uRear(q[0],q[1]))-o,q[1],q[0]],
    T:(q,o)=>[X(q[0]),topY(q[0],q[1])+o,q[1]],SR:(q,o)=>[X(q[0]),q[1],sideZ(q[0],q[1])+o],SL:(q,o)=>[X(q[0]),q[1],-(sideZ(q[0],q[1])+o)]};
  /* a convex 2-D shape in one view, fanned and split where the surface under it bends, then wrapped on.
     F and R shapes are (z, y); T shapes are (u, z); S shapes are (u, y) and go on both sides */
  function decal(view,poly,m,off=.005,res=.05){
    if(view==='S'){decal('SR',poly,m,off,res);decal('SL',poly,m,off,res);return;}
    if(poly.length<3)return;
    let cx=0,cy=0;for(const q of poly){cx+=q[0];cy+=q[1];}cx/=poly.length;cy/=poly.length;
    const cache=new Map(),mp=q=>{const key=Math.round(q[0]*1e4)+','+Math.round(q[1]*1e4);let r=cache.get(key);if(!r){r=MAP[view](q,off);cache.set(key,r);}return r;};
    const out=[],sub=(t,d)=>{const [a,b,c]=t,l=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]),L1=l(a,b),L2=l(b,c),L3=l(c,a),mx=Math.max(L1,L2,L3);
      if(mx<res||d>8){out.push(t);return;}
      const [p,q,o]=mx===L1?[a,b,c]:mx===L2?[b,c,a]:[c,a,b],M=[(p[0]+q[0])/2,(p[1]+q[1])/2];
      if(mx<.45){const P=mp(p),Q=mp(q),PM=mp(M);if(Math.hypot(PM[0]-(P[0]+Q[0])/2,PM[1]-(P[1]+Q[1])/2,PM[2]-(P[2]+Q[2])/2)<.0012){out.push(t);return;}}
      sub([p,M,o],d+1);sub([M,q,o],d+1);};
    for(let k=0;k<poly.length;k++)sub([[cx,cy],poly[k],poly[(k+1)%poly.length]],0);
    for(const t of out)pm.tri(mp(t[0]),mp(t[1]),mp(t[2]),m[0],m[1],m[2]);
  }
  /* a stroke of width w along a polyline, as one decal per segment (shut lines, pinstripes) */
  const line=(view,pts,w,m,off=.003)=>{for(let i=0;i<pts.length-1;i++){const [u0,y0]=pts[i],[u1,y1]=pts[i+1],dx=u1-u0,dyy=y1-y0,l=Math.hypot(dx,dyy)||1,nx=-dyy/l*w/2,ny=dx/l*w/2,ex=dx/l*w*.4,ey=dyy/l*w*.4;
    decal(view,[[u0+nx-ex,y0+ny-ey],[u1+nx+ex,y1+ny+ey],[u1-nx+ex,y1-ny+ey],[u0-nx-ex,y0-ny-ey]],m,off,.08);}};
  const ring2=(view,xc,yc,r0,r1,m,off,n=16)=>{for(let k=0;k<n;k++){const a=k/n*TAU,b=(k+1)/n*TAU;decal(view,[[xc+Math.cos(a)*r0,yc+Math.sin(a)*r0],[xc+Math.cos(a)*r1,yc+Math.sin(a)*r1],[xc+Math.cos(b)*r1,yc+Math.sin(b)*r1],[xc+Math.cos(b)*r0,yc+Math.sin(b)*r0]],m,off,.2);}};
  const pair=fn=>{fn(1);fn(-1);};
  const K={D,G,L,X,dy,mb,pm,decal,line,ring2,pair,uFront,uRear,topY,sideZ,ringAt,secKeys:u=>secKeys(D,u),inside};
  bodyCommon(K);
  FACES[look.face](K);TAILS[look.tail](K);
  buildParts(K);
  const S={skin:mb.p.length/9,parts:0};
  mb.smooth(34,[0,1+dy*.5,0]);pm.smooth(28);S.parts=pm.p.length/9;mb.append(pm);
  return {body:mb.build(),D,tris:mb.p.length/9,stats:S};
}
/* ---------- glass, pillars, shut lines, handles, markers, mirrors, wipers: every build has these ---------- */
function bodyCommon(K){
  const {D,G,L,X,dy,pm,decal,line,pair,topY,sideZ,ringAt}=K,lk=D.look,ks=u=>secKeys(D,u);
  /* side glass: bounded by the glass base, the drip rail, the A-pillar and the D-pillar line; split by the
     black B and C pillars; the front window starts behind a small black sail for the mirror */
  {const f=.018;let u0=G.cowl;while(u0<G.cB){const k=ks(u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
    const ue=Math.max(G.cT,G.cB)+.03,top=[],bot=[];
    for(let u=u0;u<ue;u+=.025){const k=ks(u);top.push([u,k.P[10][1]-f]);}{const k=ks(ue);top.push([ue,k.P[10][1]-f]);}
    for(let u=ue;u>u0;u-=.025){const k=ks(u);bot.push([u,k.yG+f*.8]);}bot.push([u0,ks(u0).yG+f*.8]);
    const clip=(P,a,b,keepLeft)=>{const o=[],side=q=>((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]))*(keepLeft?1:-1)>=0;
      for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],sp=side(p),sq=side(q);if(sp)o.push(p);if(sp!==sq){const d1=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),d2=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]),t=d1/(d1-d2);o.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
      return o;};
    const yb=ks(G.cB).yG,yt=D.Hr;
    let poly=clip([...top,...bot],[G.cB,yb],[G.cT,yt],true);
    /* the sail: the front window starts where the door frame does */
    const ys=ks(u0+.2).yG;poly=clip(poly,[u0+.21,ys],[u0+.05,ys+.3],false);
    const cuts=G.pillars.map(([pu,ln,w])=>({a:o=>[pu+o,yb-.1],b:o=>[pu+ln+o,yt+.1],w}));
    const tints=[lk.tintF||MM.GLL,lk.tintR||MM.GL,lk.tintR||MM.GL];
    for(let i=0;i<=cuts.length;i++){let p=poly;
      if(i>0){const c=cuts[i-1];p=clip(p,c.a(c.w),c.b(c.w),false);}
      if(i<cuts.length){const c=cuts[i];p=clip(p,c.a(-c.w),c.b(-c.w),true);}
      decal('S',p,tints[i],.004,.12);}
    /* a black seal along the glass base */
    const sl=[];for(let u=u0+.03;u<G.cB-.02;u+=.1)sl.push([u,ks(u).yG+.006]);sl.push([G.cB-.02,ks(G.cB-.02).yG+.006]);
    line('S',sl,.012,MM.TRIM,.005);}
  /* shut lines: hood, front and rear doors (the rear one steps round the arch), fuel door, bumper seams */
  {const w=.0055,yb=u=>D.sill(u)+.075,yt=u=>D.belt(u)-.02,A=D.arch;
    const fd=G.cowl+.06,bd=G.pillars[0][0]-.005,rd=G.pillars[1][0]+.02;
    line('S',[[fd,yb(fd)+.04],[fd-.012,yt(fd)-.02],[fd+.03,yt(fd)+.012]],w,MM.SHUT);
    line('S',[[bd+.01,yb(bd)],[bd-.01,yt(bd)+.012]],w,MM.SHUT);
    const ra=archPt(D,D.uRa,PI*.14,.06),rb=archPt(D,D.uRa,PI*.42,.06);
    line('S',[[rd,yt(rd)+.012],[rd-.02,rb[1]+.08],[rb[0],rb[1]],[ra[0],ra[1]],[ra[0]+.01,D.sill(ra[0])+.06]],w,MM.SHUT);
    line('S',[[fd+.04,yb(fd)+.02],[bd-.02,yb(bd)]],w,MM.SHUT);line('S',[[bd+.03,yb(bd)],[ra[0]-.04,yb(ra[0])]],w,MM.SHUT);
    /* front bumper to fender, and rear bumper to quarter panel */
    const fa=archPt(D,D.uFa,PI*.08,.07),fb=archPt(D,D.uFa,0,.08);
    line('S',[[.12,D.cladY(.12)+.15],[.32,D.cladY(.3)+.16],[fa[0]-.02,fa[1]+.02]],w,MM.SHUT);
    const rq=archPt(D,D.uRa,PI*.94,.07);
    line('S',[[rq[0]+.02,rq[1]+.02],[4.6,D.cladY(4.6)+.02],[L-.05,D.cladY(L)+.01]],w,MM.SHUT);
    /* hood: along the fender tops and across the cowl */
    const hz=u=>Math.max(.2,D.plan(u)*D.sh-.07),u1=G.cowl-.05;
    pair(s=>line('T',[[.2,s*(hz(.2)-.02)],[.6,s*hz(.6)],[1.2,s*hz(1.2)],[u1,s*hz(u1)]],w,MM.SHUT,.004));
    line('T',[[u1,-hz(u1)],[u1,hz(u1)]],w,MM.SHUT,.004);
    /* liftgate outline on the tail */
    if(!lk.noLiftLine){const yl=D.cladY(L)+.02+(lk.tail==='race'?0:0),zl=.71;
      line('R',[[-zl,yl+.02],[zl,yl+.02]],w,MM.SHUT,.004);pair(s=>line('R',[[s*zl,yl+.02],[s*(zl+.01),D.belt(4.8)-.04],[s*(zl-.01),D.Hr-.15]],w,MM.SHUT,.004));}
    /* fuel door on the right rear quarter */
    if(!lk.noFuel)decal('SR',RR2(4.42,4.6,D.belt(4.5)-.25,D.belt(4.5)-.1,.03).map(p=>p),MM.SHUT,.0035,.05);
    if(!lk.noFuel)decal('SR',RR2(4.43,4.59,D.belt(4.5)-.24,D.belt(4.5)-.11,.024),MM.PAINT,.005,.05);}
  /* door handles, a little recessed */
  if(!lk.noHandles)for(const u of [G.pillars[0][0]-.2,G.pillars[1][0]-.17]){const y=D.belt(u)-.09;
    decal('S',RR2(u-.09,u+.06,y-.022,y+.022,.014),MM.TRIM,.004,.05);decal('S',RR2(u-.085,u+.055,y-.016,y+.016,.012),lk.handles||MM.CHROME,.007,.05);}
  /* side markers on the bumper corners */
  if(!lk.noMarkers){decal('S',RR2(.20,.33,D.cladY(.25)+.05,D.cladY(.25)+.085,.012),MM.AMBER,.004);
    decal('S',RR2(L-.30,L-.17,D.cladY(L)-.12,D.cladY(L)-.085,.012),MM.TAIL,.004);}
  /* wipers lying at the base of the windshield, and one on the rear glass */
  {const u=G.cowl+.07,y0=topY(u,0);
    for(const [z0,z1] of [[-.62,.06],[.02,.66]])line('T',[[u,z0],[u+.02,z1]],.014,MM.TRIM,.012);
    const ur=(G.rr+G.be)/2;line('R',[[.04,D.belt(4.8)+.1],[.42,D.belt(4.8)+.22]],.012,MM.TRIM,.012);}
  /* mirrors: a black base on the sail and a big housing with a painted cap */
  mirrors(K);
}
function mirrors(K){
  const {D,G,X,pm,pair}=K,lk=D.look;let u0=G.cowl;while(u0<G.cB){const k=secKeys(D,u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
  const k=secKeys(D,u0+.1),ub=u0+.1,yb=k.yG,zb=k.P[8][0];
  pair(s=>{
    if(lk.mirror==='race'){
      tubeAB(pm,[X(ub),yb+.05,s*zb],[X(ub+.02),yb+.1,s*(zb+.12)],.012,6,MM.BLACK);
      const c=[X(ub+.03),yb+.11,s*(zb+.15)];rbox(pm,c,[1,0,0],[0,1,0],[0,0,1],[.05,.035,.075],MM.PAINT,.35,12,6);
      pm.quad([c[0]-.051,c[1]-.025,c[2]-.06],[c[0]-.051,c[1]+.025,c[2]-.06],[c[0]-.051,c[1]+.025,c[2]+.06],[c[0]-.051,c[1]-.025,c[2]+.06],[0,0,0],0,MAT.GLASS);return;}
    /* the sail block on the door */
    obox(pm,[X(ub-.02),yb+.035,s*(zb+.005)],[1,0,0],[0,1,0],[0,0,1],[.075,.035,.018],MM.TRIM);
    /* the arm */
    obox(pm,[X(ub+.0),yb+.06,s*(zb+.06)],[1,0,0],[0,1,0],[0,0,1],[.045,.022,.05],MM.TRIM);
    const c=[X(ub+.02),yb+.1,s*(zb+.18)],ax=V3.norm([1,0,-.1*s]),az=V3.norm([.1*s,0,1]);
    rbox(pm,[c[0]+.008,c[1]+.025,c[2]],ax,[0,1,0],az,[.064,.085,.138],lk.mirrorCap||MM.PAINT,.3,14,8);
    rbox(pm,[c[0]+.002,c[1]-.04,c[2]],ax,[0,1,0],az,[.062,.05,.134],MM.TRIM,.3,14,6);
    /* the glass, facing back */
    const g=[c[0]-.058,c[1],c[2]];pm.quad([g[0],g[1]-.085,g[2]-.12],[g[0],g[1]+.09,g[2]-.12],[g[0],g[1]+.09,g[2]+.12],[g[0],g[1]-.085,g[2]+.12],[0,0,0],0,MAT.GLASSL);
    /* turn repeater on the cap's lower edge */
    obox(pm,[c[0]+.03,c[1]-.03,c[2]+s*.07],[1,0,0],[0,1,0],[0,0,1],[.012,.006,.04],MM.AMBER);
  });
}
