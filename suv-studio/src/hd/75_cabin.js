/* =====================================================================================
   THE CABIN. The game's truck is a closed shell with its side windows painted on over black. Here the shell is
   cut open exactly behind each side window (the same outlines the game draws its glass with, 21_suv bodyCommon),
   so the glass is the only thing between you and the inside, and the inside is built: carpet and floor, door
   panels with armrests and pulls, the headliner, a dashboard with a gauge hood, two dials and the centre stack,
   a steering wheel on its column, the console and shifter, two bucket seats, the rear bench, the cargo floor,
   the mirror and visors. A mid-2000s two-tone: a charcoal dash, stone seats and door inserts, a light headliner.
   ===================================================================================== */
/* the body side seen from the right (SR) or the left (SL): the point at (u, y), pushed out by off */
function hdSS(s,u,y,off=0){const K=HDK;return [K.X(u),y,s*(K.sideZ(u,y)+off)];}
/* the side windows' outlines (u, y), as the game makes them */
function hdSideGlass(){
  const K=HDK,D=K.D,G=D.G,ks=u=>secKeys(D,u),f=.018;
  let u0=G.cowl;while(u0<G.cB){const k=ks(u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
  const ue=Math.max(G.cT,G.cB)+.03,top=[],bot=[];
  for(let u=u0;u<ue;u+=.025){const k=ks(u);top.push([u,k.P[10][1]-f]);}{const k=ks(ue);top.push([ue,k.P[10][1]-f]);}
  for(let u=ue;u>u0;u-=.025){const k=ks(u);bot.push([u,k.yG+f*.8]);}bot.push([u0,ks(u0).yG+f*.8]);
  const clip=(P,a,b,keepLeft)=>{const o=[],side=q=>((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]))*(keepLeft?1:-1)>=0;
    for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],sp=side(p),sq=side(q);if(sp)o.push(p);
      if(sp!==sq){const d1=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),d2=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]),t=d1/(d1-d2);o.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
    return o;};
  const yb=ks(G.cB).yG,yt=D.Hr;let poly=clip([...top,...bot],[G.cB,yb],[G.cT,yt],true);
  const ys=ks(u0+.2).yG;poly=clip(poly,[u0+.21,ys],[u0+.05,ys+.3],false);
  const cuts=G.pillars.map(([pu,ln,w])=>({a:o=>[pu+o,yb-.1],b:o=>[pu+ln+o,yt+.1],w})),out=[];
  for(let i=0;i<=cuts.length;i++){let p=poly;if(i>0){const c=cuts[i-1];p=clip(p,c.a(c.w),c.b(c.w),false);}if(i<cuts.length){const c=cuts[i];p=clip(p,c.a(-c.w),c.b(-c.w),true);}out.push(p);}
  return out;}
/* the convex hull of an outline (the windows are convex but for a few millimetres where a curve is sampled) */
function hdHull(P){const q=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of q){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=q.length-1;i>=0;i--){const p=q[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  return lo.slice(0,-1).concat(up.slice(0,-1));}
/* cut the shell open behind a side window: every triangle on that side's surface loses exactly the part inside */
function hdCutSide(src,s,P0,tol=.02){const P=hdHull(P0),w=hdCCW(P),p=src.p,N=src.n,C=src.c,M=src.m,o={p:[],n:[],c:[],m:[]},D=HDK.D;let n=0;
  const emit=(V,t)=>{for(let k=1;k<V.length-1;k++)for(const v of [V[0],V[k],V[k+1]]){o.p.push(v.p[0],v.p[1],v.p[2]);const l=Math.hypot(v.n[0],v.n[1],v.n[2])||1;o.n.push(v.n[0]/l,v.n[1]/l,v.n[2]/l);o.c.push(v.c[0],v.c[1],v.c[2],v.c[3]);o.m.push(M[t*3]);}};
  let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const q of P){z0=Math.min(z0,q[0]);z1=Math.max(z1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  for(let t=0;t<p.length/9;t++){const b=t*9;
    const V=[0,1,2].map(k=>({q:[D.uC-p[b+k*3],p[b+k*3+1]],p:[p[b+k*3],p[b+k*3+1],p[b+k*3+2]],n:[N[b+k*3],N[b+k*3+1],N[b+k*3+2]],c:[C[t*12+k*4],C[t*12+k*4+1],C[t*12+k*4+2],C[t*12+k*4+3]]}));
    let tz0=1e9,tz1=-1e9,ty0=1e9,ty1=-1e9;for(const v of V){tz0=Math.min(tz0,v.q[0]);tz1=Math.max(tz1,v.q[0]);ty0=Math.min(ty0,v.q[1]);ty1=Math.max(ty1,v.q[1]);}
    /* (the glass itself stays: it is the game's decal over the opening) */
    let on=tz1>=z0&&tz0<=z1&&ty1>=y0&&ty0<=y1&&M[t*3]!==MAT.GLASS&&M[t*3]!==MAT.GLASSL;
    if(on){const cz=(V[0].p[2]+V[1].p[2]+V[2].p[2])/3,cu=(V[0].q[0]+V[1].q[0]+V[2].q[0])/3,cy=(V[0].q[1]+V[1].q[1]+V[2].q[1])/3;on=Math.sign(cz)===s&&Math.abs(Math.abs(cz)-HDK.sideZ(cu,cy))<tol;}
    if(!on){emit(V,t);continue;}
    let rest=V;for(let e=0;e<P.length&&rest.length>=3;e++){const a=P[e],c=P[(e+1)%P.length],outp=hdClip(rest,a,c,-w);if(outp.length>=3)emit(outp,t);rest=hdClip(rest,a,c,w);}
    if(rest.length>=3)n++;}
  src.p=o.p;src.n=o.n;src.c=o.c;src.m=o.m;return n;}

function hdCabin(out,car){
  const K=HDK,D=K.D,G=D.G,X=K.X,L=D.L,dy=D.dy;
  /* open the shell behind the side glass, both sides */
  for(const P of hdSideGlass())for(const s of [1,-1])for(const src of [car.body,car.hood])hdCutSide(src,s,P);
  const STONE=SV(lin('#6d675f'),SM.SEAT),STONED=SV(lin('#57524b'),SM.SEAT),CHAR=SV(lin('#242322'),SM.DASH),CHARV=SV(lin('#2c2b2a'),SM.VINYL),
    INS=SV(lin('#6a645c'),SM.VINYL),HL=SV(lin('#7a746b'),SM.HEADLINER),CARP=SV(lin('#2a2826'),SM.CARPET),SAT=HC.SATIN,BLK=SV([.012,.012,.013],SM.DASH);
  const yF=.5+dy,zw=u=>K.sideZ(u,Math.min(D.belt(u)-.1,.95+dy))-.05;
  /* ---------- the floor: carpet from the toe board to the tailgate, the tunnel down the middle ---------- */
  hdPart(out,mb=>{const rows=[],u0=G.cowl+.05,u1=G.be-.05;
    for(let u=u0;u<=u1+1e-6;u+=.05){const toe=sm01((G.cowl+.32-u)/.27),y=yF+toe*.24,cargo=sm01((u-(G.pillars[1][0]+.22))/.08)*.08,yy=y+cargo,zz=zw(u)-.01,row=[];
      for(let j=0;j<=12;j++){const z=-zz+2*zz*j/12,tun=u<G.pillars[1][0]-.2?.11*Math.exp(-Math.pow(z/.12,2)):0;row.push([X(u),yy+tun,z]);}rows.push(row);}
    hdLoft(mb,rows,CARP,false,true);},40);
  /* ---------- door panels and quarter trims: inside the shell from the floor to the window sill ---------- */
  for(const s of [1,-1])hdPart(out,mb=>{const rows=[];
    for(let u=G.cowl+.02;u<=G.be-.05+1e-6;u+=.025){const yb=yF-.02,yt=D.belt(u)-.035,row=[];
      for(let j=0;j<=10;j++){const t=j/10,y=yb+(yt-yb)*t,arm=.035*Math.exp(-Math.pow((y-(.82+dy))/.04,2))*(u<G.pillars[1][0]+.1?1:0),zi=K.sideZ(u,Math.min(y,D.belt(u)-.04))-.035-arm-.02*(1-t);
        row.push([X(u),y,s*zi]);}
      /* the sill's cap, rolling over to meet the glass */
      const zt=K.sideZ(u,D.belt(u)-.03);row.push([X(u),D.belt(u)-.005,s*(zt-.03)],[X(u),D.belt(u)+.006,s*(zt-.012)]);rows.push(row);}
    hdLoft(mb,rows,CHARV,false,s<0);},40);
  /* stone inserts and pulls on the four doors */
  for(const s of [1,-1])for(const [u0,u1] of [[G.cowl+.18,G.pillars[0][0]-.06],[G.pillars[0][0]+.08,G.pillars[1][0]-.06]]){
    hdPart(out,mb=>{const rows=[];for(let u=u0;u<=u1+1e-6;u+=.02){const row=[];for(let j=0;j<=4;j++){const y=.86+dy+.16*j/4;row.push([X(u),y,s*(K.sideZ(u,y)-.058-.004*Math.sin(j/4*PI))]);}rows.push(row);}
      hdLoft(mb,rows,INS,false,s<0);},40);
    hdPart(out,mb=>{const u=(u0+u1)/2-.05;hdRBox(mb,[X(u),.86+dy,s*(K.sideZ(u,.86+dy)-.085)],[.13,.016,.022],.012,CHARV,3);
      hdRBox(mb,[X(u0+.06),1.03+dy,s*(K.sideZ(u0+.06,1.03+dy)-.06)],[.035,.012,.008],.005,MM.CHROME,2);},40);}
  /* ---------- the headliner: under the roof from the windshield header to the liftgate ---------- */
  hdPart(out,mb=>{const rows=[],u0=G.rf-.12,u1=G.rr-.04;
    for(let u=u0;u<=u1+1e-6;u+=.04){const row=[];const zm=secKeys(D,u).P[10][0]-.035;
      for(let j=0;j<=16;j++){const z=-zm+2*zm*j/16,y=K.topY(u,Math.abs(z))-.045-.05*Math.pow(Math.abs(z)/zm,6);row.push([X(u),y,z]);}rows.push(row);}
    hdLoft(mb,rows,HL,false);},40);
  /* the visors and the mirror */
  for(const s of [1,-1])hdPart(out,mb=>{const u=G.rf+.03,y=K.topY(u,.35)-.07;hdRBox(mb,[X(u),y,s*.38],[.08,.012,.17],.01,HL,3);},40);
  hdPart(out,mb=>{const u=G.rf+.02,y=K.topY(u,0)-.12;hdRBox(mb,[X(u),y,0],[.012,.03,.12],.012,BLK,3);hdCyl(mb,[X(u)+.01,y+.02,0],[X(u)+.03,y+.075,0],.006,.006,8,BLK);},40);
  hdPart(out,mb=>{const u=G.rf+.012,y=K.topY(u,0)-.12;hdRBox(mb,[X(u)-.0135,y,0],[.001,.026,.115],.001,HC.MIRROR,1);},20);
  /* ---------- the dashboard: lofted across the cabin, a gauge hood over the driver's side ---------- */
  const uD=G.cowl,uE=G.cowl+.5;
  hdPart(out,mb=>{const rows=[];for(let k=0;k<=40;k++){const z=-.86+1.72*k/40,az=Math.abs(z),zc=Math.min(az,zw(uE)-.01)*Math.sign(z);
      const hood=.055*Math.exp(-Math.pow((z+.38)/.17,4)),stack=Math.exp(-Math.pow(z/.2,4));
      const yt=1.08+dy+hood,yw=secKeys(D,uD+.06).yG-.01;
      const prof=[[uD+.04,yw],[uD+.22,yt-.01],[uE-.12,yt],[uE-.05,yt-.012-hood*.3],[uE-.02,yt-.06],[uE-.015,.92+dy],[uE-.05-.06*stack,.8+dy],[uE-.1+.18*stack,.66+dy],[uE-.18+.14*stack,yF+.12]];
      rows.push(prof.map(([u,y])=>[X(u),y,zc]));}
    const R=rows[0].map((_,j)=>rows.map(r=>r[j]));hdLoft(mb,R,CHAR,false);},34);
  /* the gauge cluster: two dials and a strip of warning lamps behind a dark face, under the hood */
  {const u=uE-.09,y=1.035+dy,z0=-.38;
    hdPart(out,mb=>{hdRBox(mb,[X(u-.02),y,z0],[.012,.06,.17],.02,BLK,3);},40);
    for(const [dz,r] of [[-.075,.058],[.075,.058]]){const M=M4.mul(hdM([X(u)-.008,y,z0+dz]),M4RY(-PI/2));
      hdPart(out,mb=>{hdRev(mb,[[0,0],[r,0]],48,HC.GAUGE);hdRev(mb,[[r,0],[r+.004,.006],[r+.006,.004]],48,MM.CHROME);},30,null,M);
      /* the ticks and the needle */
      hdPart(out,mb=>{for(let k=0;k<=10;k++){const a=PI*1.25-k/10*PI*1.5,c=Math.cos(a),s2=Math.sin(a);mb.quad([c*r*.8,s2*r*.8-.0012,.0008],[c*r*.92,s2*r*.92-.0012,.0008],[c*r*.92,s2*r*.92+.0012,.0008],[c*r*.8,s2*r*.8+.0012,.0008],lin('#e8e4dc'),.6,MAT.COL);}
        const a=PI*.9;mb.quad([0,-.0015,.002],[Math.cos(a)*r*.85,Math.sin(a)*r*.85-.001,.002],[Math.cos(a)*r*.85,Math.sin(a)*r*.85+.001,.002],[0,.0015,.002],lin('#ff5a1a'),.8,MAT.COL);},20,null,M);}}
  /* the centre stack: vents, the radio, the climate knobs */
  {const u=uE-.03,ys=[.98,.9,.82];
    for(const zz of [-.6,-.12,.12,.6])hdPart(out,mb=>{const yy=zz*zz>.1?1.0+dy:.995+dy;hdRBox(mb,[X(u)+.004,yy,zz],[.01,.032,.06],.012,BLK,3);for(let k=-2;k<=2;k++)hdRBox(mb,[X(u)+.012,yy+k*.011,zz],[.004,.002,.052],.0015,SAT,1);},40);
    hdPart(out,mb=>{hdRBox(mb,[X(u)+.004,.9+dy,0],[.012,.045,.1],.01,BLK,3);hdRBox(mb,[X(u)+.014,.915+dy,0],[.002,.012,.06],.002,SV(lin('#0a1a10'),MAT.COL,.25),1);
      for(const zz of [-.075,.075])hdCyl(mb,[X(u)+.012,.89+dy,zz],[X(u)+.03,.89+dy,zz],.014,.013,20,SAT);
      for(let k=-3;k<=3;k++)hdRBox(mb,[X(u)+.017,.868+dy,k*.016],[.004,.005,.006],.002,SAT,1);},40);
    hdPart(out,mb=>{for(const zz of [-.07,0,.07])hdCyl(mb,[X(u+.04),ys[2]+dy,zz],[X(u+.04)+.02,ys[2]+dy,zz],.016,.015,20,SAT);},40);}
  /* the glove box's shut line */
  hdPart(out,mb=>{hdRBox(mb,[X(uE-.03)+.002,.9+dy,.42],[.002,.06,.2],.004,BLK,2);},20);
  /* ---------- the steering wheel on its column, tilted toward the driver ---------- */
  {const c=[X(uE+.2),1.0+dy,-.38],n=V3.norm([-.9,.44,0]),f=V3.norm([.44,.9,0]),M=M4.basis(c,f,[0,0,-1],n);
    hdPart(out,mb=>{const path=[];for(let k=0;k<=72;k++){const a=k/72*TAU;path.push([Math.cos(a)*.19,Math.sin(a)*.19,0]);}hdTube(mb,path,.016,14,CHARV,true,false);},45,null,M);
    hdPart(out,mb=>{hdRBox(mb,[0,0,.018],[.075,.085,.028],.03,CHAR,4);
      for(const a of [PI/2,-PI/2,PI]){const d=[Math.cos(a),Math.sin(a),0];hdTube(mb,[V3.mul(d,.07),V3.add(V3.mul(d,.13),[0,0,-.005]),V3.mul(d,.18)],.012,10,CHAR,false,true);}},40,null,M);
    hdPart(out,mb=>{hdCyl(mb,V3.add(c,V3.mul(n,-.02)),V3.add(c,V3.mul(n,-.3)),.034,.042,18,BLK);
      /* the stalks either side of the column */
      for(const s2 of [1,-1])hdCyl(mb,V3.add(c,V3.add(V3.mul(n,-.09),[0,0,s2*.03])),V3.add(c,V3.add(V3.mul(n,-.06),[.02,.01,s2*.15])),.006,.006,8,BLK);},40);}
  /* ---------- the console and shifter between the front seats ---------- */
  {const u0=uE-.02,u1=G.pillars[0][0]+.15;
    hdPart(out,mb=>{hdRBox(mb,[X((u0+u1)/2),yF+.13,0],[(u1-u0)/2,.13,.11],.03,CHAR,4);hdRBox(mb,[X(u1-.16),yF+.28,0],[.16,.028,.1],.025,CHARV,4);},40);
    hdPart(out,mb=>{const b=[X(u0+.25),yF+.27,0];hdRev(mb,[[.04,0],[.03,.03],[.015,.07]],24,SV([.02,.02,.02],MAT.RUBBER));},40,null,M4.mul(M4T(X(u0+.25),yF+.26,0),M4RX(-PI/2)));
    hdPart(out,mb=>{const p=[X(u0+.25),yF+.35,0];ball(mb,p,.026,18,CHARV);hdCyl(mb,[X(u0+.25),yF+.29,0],[X(u0+.25),yF+.33,0],.01,.01,10,SAT);},40);}
  /* ---------- the seats: two buckets, the rear bench ---------- */
  const seat=(c,w,recl,head=1,bolst=1)=>{const M=M4.mul(M4T(c[0],c[1],c[2]),M4RZ(0));
    /* the cushion, its side bolsters and the plastic skirt under it */
    hdPart(out,mb=>{hdRBox(mb,[.24,.05,0],[.25,.06,w/2-.01],.045,STONE,5);},40,null,M);
    if(bolst)for(const s2 of [1,-1])hdPart(out,mb=>{hdRBox(mb,[.22,.085,s2*(w/2-.04)],[.22,.05,.045],.04,STONED,4);},40,null,M);
    hdPart(out,mb=>{hdRBox(mb,[.22,-.07,0],[.22,.07,w/2-.03],.02,CHAR,2);},40,null,M);
    /* the back, reclined, with its bolsters, and the headrests on chrome posts */
    const Mb=M4.mul(M,M4RZ(recl));
    hdPart(out,mb=>{hdRBox(mb,[-.04,.34,0],[.07,.31,w/2-.01],.05,STONE,5);},40,null,Mb);
    if(bolst)for(const s2 of [1,-1])hdPart(out,mb=>{hdRBox(mb,[-.02,.3,s2*(w/2-.045)],[.075,.27,.05],.045,STONED,4);},40,null,Mb);
    const hs=head===1?[0]:head===3?[-w/3,0,w/3]:[];
    for(const hz of hs){hdPart(out,mb=>{hdRBox(mb,[-.05,.75,hz],[.05,.095,head===1?.13:.12],.04,STONE,4);},40,null,Mb);
      hdPart(out,mb=>{for(const s2 of [1,-1])hdCyl(mb,[-.05,.62,hz+s2*.07],[-.05,.68,hz+s2*.07],.006,.006,8,MM.CHROME);},40,null,Mb);}};
  const uHF=G.pillars[0][0]+.2,uHR=G.pillars[1][0]+.12;
  for(const s of [1,-1])seat([X(uHF),yF+.36,s*.38],.5,.3);
  seat([X(uHR),yF+.33,0],1.42,.26,3,0);
  /* the cargo floor's sill plate at the tailgate */
  hdPart(out,mb=>{const u=G.be-.07;hdRBox(mb,[X(u),yF+.09,0],[.025,.02,zw(u)-.02],.008,SAT,2);},40);
}
