/* =====================================================================================
   THE FACE AND THE TAIL, IN THREE DIMENSIONS. The game paints its lamps, grilles and fog lamps on as decals
   (22_faces, the Classic face and tail). Here the body is cut open where each one sits and the real thing is
   built in the hole: a lamp is a cavity with a chrome reflector and dark walls, its projectors or bulbs inside,
   and a clear lens over the opening following the body's curve; a grille is a chrome surround and bars over a
   honeycomb set back in the opening. The outlines and sizes are the decals' own, so the face is the same face.
   ===================================================================================== */
let HDK=null;
/* the body's surface seen from the front (F) or the back (R): the point at (z, y), pushed out by off (metres) */
const HDS_MEMO=new Map();
function hdS(view,z,y,off=0){const K=HDK,k=view+(Math.round(z*2e4))+','+Math.round(y*2e4);let x=HDS_MEMO.get(k);
  if(x===undefined){x=view==='F'?K.X(K.uFront(z,y)):K.X(K.uRear(z,y));HDS_MEMO.set(k,x);}
  return view==='F'?[x+off,y,z]:[x-off,y,z];}
const hdOut=view=>view==='F'?[1,0,0]:[-1,0,0];
/* an outline walked in steps of about st metres */
function hdResample(P,st=.008){const o=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/st));
  for(let k=0;k<n;k++)o.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}return o;}
function hdIn(P,x,y){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function hdCen(P){let x=0,y=0;for(const p of P){x+=p[0];y+=p[1];}return [x/P.length,y/P.length];}
/* the outline shrunk toward its centre (k: 1 as is, 0 the centre) */
const hdShrink=(P,k,c=hdCen(P))=>P.map(p=>[c[0]+(p[0]-c[0])*k,c[1]+(p[1]-c[1])*k]);
/* Sutherland-Hodgman: keep the part of a convex polygon of vertices (each with .q, its (z, y)) on one side of the
   line a-b (inside: to the left when keep is 1, the right when -1); everything a vertex carries is interpolated */
function hdClip(V,a,b,keep){const o=[],side=v=>keep*((b[0]-a[0])*(v.q[1]-a[1])-(b[1]-a[1])*(v.q[0]-a[0]));
  for(let i=0;i<V.length;i++){const p=V[i],q=V[(i+1)%V.length],sp=side(p),sq=side(q);if(sp>=0)o.push(p);
    if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq),L=(x,y)=>x.map((v,k)=>v+(y[k]-v)*t);o.push({q:L(p.q,q.q),p:L(p.p,q.p),n:L(p.n,q.n),c:L(p.c,q.c)});}}
  return o;}
const hdCCW=P=>{let A=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];A+=p[0]*q[1]-q[0]*p[1];}return A>0?1:-1;};
/* cut the body open along a convex outline seen from that end: every triangle on that end's surface loses exactly
   the part inside the outline (cut along the line, not by whole triangles); triangles elsewhere are kept whole */
function hdCut(src,view,P,tol=.03){if(!src||!src.p)return 0;const p=src.p,N=src.n,C=src.c,M=src.m,o={p:[],n:[],c:[],m:[]},w=hdCCW(P);
  let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const q of P){z0=Math.min(z0,q[0]);z1=Math.max(z1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  let cut=0;
  const emit=(V,t)=>{for(let k=1;k<V.length-1;k++)for(const v of [V[0],V[k],V[k+1]]){o.p.push(...v.p);const l=Math.hypot(...v.n)||1;o.n.push(v.n[0]/l,v.n[1]/l,v.n[2]/l);o.c.push(...v.c);o.m.push(M[t*3]);}};
  for(let t=0;t<p.length/9;t++){const b=t*9;
    const V=[0,1,2].map(k=>({q:[p[b+k*3+2],p[b+k*3+1]],p:[p[b+k*3],p[b+k*3+1],p[b+k*3+2]],n:[N[b+k*3],N[b+k*3+1],N[b+k*3+2]],c:[C[t*12+k*4],C[t*12+k*4+1],C[t*12+k*4+2],C[t*12+k*4+3]]}));
    let tz0=1e9,tz1=-1e9,ty0=1e9,ty1=-1e9;for(const v of V){tz0=Math.min(tz0,v.q[0]);tz1=Math.max(tz1,v.q[0]);ty0=Math.min(ty0,v.q[1]);ty1=Math.max(ty1,v.q[1]);}
    let on=tz1>=z0&&tz0<=z1&&ty1>=y0&&ty0<=y1;
    if(on){const cx=(V[0].p[0]+V[1].p[0]+V[2].p[0])/3,cz=(V[0].q[0]+V[1].q[0]+V[2].q[0])/3,cy=(V[0].q[1]+V[1].q[1]+V[2].q[1])/3;on=Math.abs(hdS(view,cz,cy)[0]-cx)<tol;}
    if(!on){emit(V,t);continue;}
    let rest=V,any=false;
    for(let i=0;i<P.length&&rest.length>=3;i++){const a=P[i],c=P[(i+1)%P.length],outp=hdClip(rest,a,c,-w);if(outp.length>=3){emit(outp,t);}rest=hdClip(rest,a,c,w);}
    if(rest.length>=3)cut++;}
  src.p=o.p;src.n=o.n;src.c=o.c;src.m=o.m;return cut;}
/* a patch over a convex outline, wrapped on the surface: a grid of cells cl metres square, each clipped to the
   outline; off(z, y) its height over the surface, mat(z, y) its material (by each cell's middle) */
function hdGrid(mb,view,P,off,mat,cl=.006){const w=hdCCW(P);let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const q of P){z0=Math.min(z0,q[0]);z1=Math.max(z1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const nz=Math.max(1,Math.ceil((z1-z0)/cl)),ny=Math.max(1,Math.ceil((y1-y0)/cl)),dz=(z1-z0)/nz,dyy=(y1-y0)/ny;
  for(let i=0;i<nz;i++)for(let j=0;j<ny;j++){const a=z0+i*dz,b=y0+j*dyy;
    let V=[[a,b],[a+dz,b],[a+dz,b+dyy],[a,b+dyy]].map(q=>({q,p:[0,0,0],n:[0,0,0],c:[0,0,0,0]}));
    const inner=hdIn(P,a,b)&&hdIn(P,a+dz,b)&&hdIn(P,a+dz,b+dyy)&&hdIn(P,a,b+dyy);
    if(!inner)for(let k=0;k<P.length&&V.length>=3;k++)V=hdClip(V,P[k],P[(k+1)%P.length],w);
    if(V.length<3)continue;let cz=0,cy=0;for(const v of V){cz+=v.q[0];cy+=v.q[1];}cz/=V.length;cy/=V.length;const m=mat(cz,cy);
    const S=V.map(v=>hdS(view,v.q[0],v.q[1],off(v.q[0],v.q[1])));
    for(let k=1;k<S.length-1;k++){if(view==='F'?w>0:w<0)mb.tri(S[0],S[k],S[k+1],m[0],m[1],m[2]);else mb.tri(S[0],S[k+1],S[k],m[0],m[1],m[2]);}}}
/* a patch over a (convex) outline, wrapped on the surface: rings from the centre out; off(z, y) its height over the
   surface, mat(z, y) its material */
function hdPatch(mb,view,P,off,mat,nr=6){const c=hdCen(P),R=[];
  for(let k=1;k<=nr;k++){const t=k/nr;R.push(P.map(p=>{const z=c[0]+(p[0]-c[0])*t,y=c[1]+(p[1]-c[1])*t;return hdS(view,z,y,off(z,y));}));}
  const C=hdS(view,c[0],c[1],off(c[0],c[1]));
  const put=(a,b,d,zm,ym)=>{const m=mat(zm,ym);mb.tri(a,b,d,m[0],m[1],m[2]);};
  for(let j=0;j<P.length;j++){const j1=(j+1)%P.length,a=R[0][j],b=R[0][j1];put(C,a,b,(C[2]+a[2]+b[2])/3,(C[1]+a[1]+b[1])/3);}
  for(let k=0;k<nr-1;k++)for(let j=0;j<P.length;j++){const j1=(j+1)%P.length,a=R[k][j],b=R[k][j1],d=R[k+1][j1],e=R[k+1][j];
    put(a,e,d,(a[2]+d[2])/2,(a[1]+d[1])/2);put(a,d,b,(a[2]+d[2])/2,(a[1]+d[1])/2);}
  return R[nr-1];}
/* a recess: the opening's edge on the surface, walls going in to a back depth deep (the back outline shrunk by
   k toward the middle), the back itself a patch of material back(z, y). Hands back the back's offset function */
function hdRecess(out,view,P,deep,k,wall,back,nr=6){
  const Pf=hdResample(P),c=hdCen(Pf),Pb=hdShrink(Pf,k,c);
  hdPart(out,mb=>{const F=Pf.map(p=>hdS(view,p[0],p[1],-.001)),B=Pb.map(p=>hdS(view,p[0],p[1],-deep));hdLoft(mb,[F,B],wall,true);},30);
  hdPart(out,mb=>{hdGrid(mb,view,Pb,()=>-deep,back,.008);},30);}
/* a surface-following strip along a path of (z, y) points: a rounded section w wide, h proud of the surface */
function hdTrim(out,view,path,w,h,m,closed=false,deg=40,lift=0){
  const pts=path.map(p=>hdS(view,p[0],p[1],lift));if(closed)pts.push(pts[0]);
  const n=8,sec=[];for(let i=0;i<=n;i++){const a=PI*i/n;sec.push([Math.cos(a)*w/2,Math.max(0,Math.sin(a))*h-.002]);}
  sec.push([-w/2,-.004],[w/2,-.004]);
  hdPart(out,mb=>{hdSweep(mb,pts,sec,m,hdOut(view),true,!closed);},deg);}
/* a revolved piece facing out of that end, centred at p (the profile [r, along the axis]) */
function hdRevAt(out,view,p,prof,m,n=48,deg=40){const M=hdM(p,view==='F'?PI/2:-PI/2);hdPart(out,mb=>{hdRev(mb,prof,n,m);},deg,null,M);}
/* a honeycomb across an outline, set back by deep from the surface: hexagonal cells of pitch pc, walls tw thick
   and dp deep, each cell flat to the view */
function hdHoney(out,view,P,deep,pc,tw,dp,m){
  let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const p of P){z0=Math.min(z0,p[0]);z1=Math.max(z1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
  const r=pc/Math.sqrt(3),dz=pc,dyy=r*1.5,sx=view==='F'?1:-1;
  hdPart(out,mb=>{
    for(let j=0;y0+j*dyy<=y1+r;j++)for(let i=-1;z0+i*dz<=z1+dz;i++){const cz=z0+i*dz+(j%2?dz/2:0),cy=y0+j*dyy;
      if(!hdIn(P,cz,cy))continue;const s=hdS(view,cz,cy,-deep),x=s[0];
      const H=k=>{const a=PI/6+k*PI/3;return [Math.cos(a),Math.sin(a)];};
      for(let k=0;k<6;k++){const a=H(k),b=H(k+1),ro=r,ri=r-tw;
        const A=[x,cy+a[1]*ro,cz+a[0]*ro],B=[x,cy+b[1]*ro,cz+b[0]*ro],Ci=[x,cy+b[1]*ri,cz+b[0]*ri],Di=[x,cy+a[1]*ri,cz+a[0]*ri];
        mb.quad(A,B,Ci,Di,m[0],m[1],m[2]);
        const back=v=>[v[0]-sx*dp,v[1],v[2]];mb.quad(Di,Ci,back(Ci),back(Di),m[0],m[1],m[2]);}}},25);}

/* ---------- the Classic face ---------- */
function hdFaceClassic(out,car){
  const K=HDK,dy=K.dy,Y=y=>y+dy,cuts=[car.body,car.hood];
  /* the grille: cut a little inside the chrome surround's outer edge, so the surround covers the cut */
  const gOut=RR2(-.462,.462,Y(.786),Y(1.03),.04),gIn=RR2(-.446,.446,Y(.80),Y(1.016),.03);
  for(const c of cuts)hdCut(c,'F',RR2(-.455,.455,Y(.792),Y(1.024),.036));
  hdRecess(out,'F',RR2(-.455,.455,Y(.792),Y(1.024),.036),.075,.985,HC.GB,()=>HC.GB);
  hdHoney(out,'F',gIn,.03,.017,.0022,.014,HC.HONEY);
  /* the chrome surround and the two thick bars */
  hdTrim(out,'F',hdResample(RR2(-.454,.454,Y(.793),Y(1.023),.036),.01),.019,.012,MM.CHROME,true,50);
  for(const [ya,yb] of [[.93,.962],[.856,.884]]){const yc=Y((ya+yb)/2),h=(yb-ya)/2,path=[];for(let z=-.447;z<=.4471;z+=.012)path.push(hdS('F',z,yc,.004));
    const sec=hdRRect(h,.011,.007,4);hdPart(out,mb=>{hdSweep(mb,path,sec,MM.CHROME,[1,0,0],true,true);},50);}
  /* the lamps: a cavity behind a clear lens; two projectors in chrome bezels, an amber corner, a chrome strip below */
  for(const s of [1,-1]){
    const L=[[s*.488,Y(.81)],[s*.86,Y(.816)],[s*.9,Y(.88)],[s*.885,Y(1.01)],[s*.488,Y(1.024)]],Lr=hdResample(L,.006);
    for(const c of cuts)hdCut(c,'F',L);
    const amb=z=>Math.abs(z)>.832;
    hdRecess(out,'F',L,.085,.9,HC.SATIN,()=>HC.REFLC,7);
    /* a bezel band across the lamp's inner part, black, the projectors set in it */
    for(const zp of [.58,.72]){const z=s*zp,y=Y(.918),b=hdS('F',z,y,-.048);
      hdRevAt(out,'F',b,[[.062,-.03],[.06,.004],[.056,.0105],[.05,.012],[.046,.008],[.044,0]],MM.CHROME,64);
      hdRevAt(out,'F',b,[[.044,0],[.04,-.012],[.032,-.022],[.02,-.028],[0,-.03]],HC.REFLC,64);
      hdRevAt(out,'F',b,[[.031,-.02],[.031,.012],[.029,.016]],HC.SATIN,48);
      hdRevAt(out,'F',b,[[.029,.016],[.027,.026],[.02,.035],[.01,.039],[0,.04]],HC.GB,48,60);}
    /* the amber corner's bulb, and a ribbed amber reflector face */
    {const b=hdS('F',s*.865,Y(.9),-.07);hdPart(out,mb=>{ball(mb,b,.007,14,HC.BULB);},50);}
    /* the clear outer lens, proud of the opening by a few millimetres in the middle, and its black seal */
    /* (amber over the corner, clear over the rest: the divider below covers the seam) */
    hdPart(out,mb=>{hdGrid(mb,'F',L,()=>.0015,(z)=>amb(z)?HC.AMBERL:HC.LENS,.006);},40);
    /* a chrome divider between the clear part and the amber corner */
    {const p=[];for(let y=.83;y<=1.0;y+=.01)p.push([s*.832,Y(y)]);hdTrim(out,'F',p,.006,.07,MM.CHROME,false,50,-.078);}
    hdTrim(out,'F',Lr,.007,.003,HC.SEAL,true,50);
    /* the chrome strip under the lamp */
    {const path=[];for(let z=.495;z<=.846;z+=.01)path.push([s*z,Y(.8065+(z-.49)/.36*.006)]);hdTrim(out,'F',path,.008,.004,MM.CHROME,false,50,.0005);}
  }
  /* fog lamps in round black pods */
  for(const s of [1,-1]){const zc=s*.685,yc=Y(.5),pod=EL2(zc,yc,.082,.062,40);
    for(const c of cuts)hdCut(c,'F',pod);
    hdRecess(out,'F',pod,.045,.86,HC.GB,()=>HC.GB);
    const b=hdS('F',zc,yc,-.03);
    hdRevAt(out,'F',b,[[.049,-.005],[.048,.012],[.045,.019],[.04,.02],[.037,.016]],MM.CHROME,56);
    hdRevAt(out,'F',b,[[.037,.016],[.03,0],[.018,-.012],[0,-.016]],HC.REFLC,56);
    hdPart(out,mb=>{ball(mb,V3.add(b,[.0,0,0]),.009,12,HC.BULB);},50);
    /* (the lens: a shallow dome in the bezel, clear) */
    hdRevAt(out,'F',b,[[.038,.016],[.03,.021],[.015,.024],[0,.025]],HC.LENS,56,60);}
  /* the wide lower grille in the valance: a black frame, a honeycomb behind */
  {const lg=RR2(-.43,.43,Y(.452),Y(.548),.03);for(const c of cuts)hdCut(c,'F',lg);
    hdRecess(out,'F',lg,.06,.97,HC.GB,()=>HC.GB);hdHoney(out,'F',RR2(-.425,.425,Y(.456),Y(.544),.026),.012,.019,.0026,.016,HC.HONEY);}
}

/* ---------- the Classic tail ---------- */
function hdTailClassic(out,car){
  const K=HDK,dy=K.dy,Y=y=>y+dy,cuts=[car.body];
  for(const s of [1,-1]){
    /* two lamps a side, one on the quarter panel and one on the liftgate: red lenses over chrome, a clear reverse window */
    for(const [L,rv] of [[[[s*.665,Y(.955)],[s*.875,Y(.95)],[s*.885,Y(1.125)],[s*.665,Y(1.13)]],RR2(s*.70,s*.82,Y(1.0),Y(1.045),.006)],
                         [[[s*.452,Y(.965)],[s*.648,Y(.962)],[s*.648,Y(1.115)],[s*.452,Y(1.11)]],RR2(s*.47,s*.63,Y(1.06),Y(1.09),.006)]]){
      const Lr=hdResample(RR2(Math.min(L[0][0],L[1][0]),Math.max(L[0][0],L[1][0]),Math.max(L[0][1],L[1][1]),Math.min(L[2][1],L[3][1]),.014),.006);
      for(const c of cuts)hdCut(c,'R',RR2(Math.min(L[0][0],L[1][0]),Math.max(L[0][0],L[1][0]),Math.max(L[0][1],L[1][1]),Math.min(L[2][1],L[3][1]),.014));
      const inRv=(z,y)=>hdIn(rv,z,y);
      hdRecess(out,'R',Lr,.06,.92,HC.GB,(z,y)=>HC.REFLC,7);
      /* the red lens, with horizontal optic ribs where the lamp is red, and clear over the reverse window */
      const Lp=RR2(Math.min(L[0][0],L[1][0]),Math.max(L[0][0],L[1][0]),Math.max(L[0][1],L[1][1]),Math.min(L[2][1],L[3][1]),.014);
      hdPart(out,mb=>{hdGrid(mb,'R',Lp,()=>.002,(z,y)=>inRv(z,y)?HC.LENS:HC.REDL,.004);},40);
      hdTrim(out,'R',hdResample(rv,.006),.005,.0025,HC.SEAL,true,50,.002);
      hdTrim(out,'R',Lr,.006,.003,HC.SEAL,true,50);
      /* bulbs behind: two in the red, one behind the reverse window */
      const c=hdCen(Lr);hdPart(out,mb=>{ball(mb,hdS('R',c[0],c[1]-.03,-.045),.007,14,HC.BULB);ball(mb,hdS('R',c[0],c[1]+.03,-.045),.007,14,HC.BULB);},50);
      const cr=hdCen(rv);hdPart(out,mb=>{ball(mb,hdS('R',cr[0],cr[1],-.045),.007,12,HC.BULB);},50);
      /* ribs inside the red: thin horizontal chrome blades on the reflector */
      hdPart(out,mb=>{for(let y=Lr.reduce((a,p)=>Math.min(a,p[1]),9)+.012;y<Lr.reduce((a,p)=>Math.max(a,p[1]),-9)-.008;y+=.014){if(inRv(c[0],y))continue;
        const zs=Lr.filter(p=>Math.abs(p[1]-y)<.02).map(p=>p[0]);if(zs.length<2)continue;const za=Math.min(...zs)*.96+c[0]*.04,zb=Math.max(...zs)*.96+c[0]*.04;
        const a=hdS('R',za,y,-.05),b=hdS('R',zb,y,-.05);hdCyl(mb,a,b,.0025,.0025,6,HC.REFLC,false);}},30);}
    /* the bumper's small reflector */
    {const r=RR2(s*.76,s*.86,Y(.665),Y(.69),.006);for(const c of cuts)hdCut(c,'R',r);hdRecess(out,'R',r,.012,.95,HC.GB,()=>HC.REDL,3);}
  }
  /* the plate in its recess, the chrome strip above it */
  {const pr=RR2(-.23,.23,Y(.855),Y(1.04),.03);for(const c of cuts)hdCut(c,'R',pr);
    hdRecess(out,'R',pr,.025,.98,SV([1,1,1],MAT.PAINT),()=>SV([1,1,1],MAT.PAINT),5);
    hdPart(out,mb=>{const P=hdResample(RR2(-.155,.155,Y(.878),Y(.952),.008),.01),M=P.map(p=>hdS('R',p[0],p[1],-.021));
      hdGrid(mb,'R',RR2(-.155,.155,Y(.878),Y(.952),.008),()=>-.021,()=>SV([1,1,1],MAT.PLATE),.02);
      hdLoft(mb,[M,P.map(p=>hdS('R',p[0],p[1],-.025))],SV([1,1,1],MAT.PLATE),true);},20);
    /* a plain raised border round the plate, no lettering */
    hdTrim(out,'R',hdResample(RR2(-.15,.15,Y(.883),Y(.947),.006),.01),.004,.0015,SV([.05,.07,.18],MAT.COL),true,50,-.021);
    /* plate lamps above it */
    for(const z of [-.08,.08])hdPart(out,mb=>{hdRBox(mb,hdS('R',z,Y(1.028),-.02),[.012,.004,.02],.003,HC.LENS,2);},40);
    hdTrim(out,'R',Array.from({length:37},(_,k)=>[-.36+.02*k,Y(1.062)]),.018,.006,MM.CHROME,false,50);}
}
