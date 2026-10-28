/* =====================================================================================
   PARTS — everything bolted to the shell: arch flares, the chassis underneath, roof rails and
   racks, spoilers and wings, bumpers, lips, sliders, exhausts, hoods, lights and livery.
   ===================================================================================== */
function buildParts(K){
  const lk=K.D.look;
  underbody(K);flares(K);roof(K);spoiler(K);exhausts(K);
  if(lk.front)FRONTS[lk.front](K);if(lk.rear)REARS[lk.rear](K);
  if(lk.hood)HOODS[lk.hood](K);
  for(const x of lk.extras||[])EXTRAS[x](K);
}
/* ---------- arch flares: a band round each opening, standing off the body side ---------- */
function flares(K){
  const {D,X,pm,sideZ}=K,F=D.look.flares;if(!F)return;
  const n=28,w=F.w,o=F.out,sec=[[-.012,-.01],[0,o*.7],[w*.18,o],[w*.62,o*.86],[w,o*.12],[w+.012,0]];
  const m=F.mat||MM.CLAD;
  for(const ua of [D.uFa,D.uRa])for(const s of [1,-1]){
    const G=[];
    for(let k=0;k<=n;k++){const ph=(F.a0||-.01)+((F.a1||1.01)-(F.a0||-.01))*k/n,end=sm01(Math.min(k,n-k)/(n*.1)),row=[];
      for(const [dr,dz] of sec){const [u,y]=archPt(D,ua,ph*PI,dr);row.push([X(u),y,s*(sideZ(u,y)+Math.max(0,dz)*(.35+.65*end)+Math.min(0,dz))]);}
      G.push(row);}
    for(let k=0;k<n;k++)for(let j=0;j<sec.length-1;j++)pm.quad(G[k][j],G[k+1][j],G[k+1][j+1],G[k][j+1],m[0],m[1],m[2]);
    for(const k of [0,n]){const r=G[k];for(let j=1;j<r.length-1;j++)pm.tri(r[0],r[j],r[j+1],m[0],m[1],m[2]);}
    if(F.bolts)for(let k=2;k<n-1;k+=3){const ph=(F.a0||-.01)+((F.a1||1.01)-(F.a0||-.01))*k/n,[u,y]=archPt(D,ua,ph*PI,w*.45);
      ball(pm,[X(u),y,s*(sideZ(u,y)+o*.95)],.011,6,MM.CHROME);}
  }
}
/* ---------- underneath: frame, drivetrain, tank, spare, suspension ---------- */
function underbody(K){
  const {D,X,pm,dy,pair}=K,lk=D.look,R=D.R,Y=y=>y+dy,M=MM.UNDER,tw=lk.track/2;
  pair(s=>abox(pm,[X(2.46),Y(.37),s*.5],[2.08,.045,.038],M));
  for(const u of [.5,1.35,2.25,3.2,4.38])abox(pm,[X(u),Y(.37),0],[.035,.035,.5],M);
  rbox(pm,[X(1.65),Y(.47),0],[1,0,0],[0,1,0],[0,0,1],[.52,.11,.17],M,.4,12,6);
  abox(pm,[X(3.32),Y(.42),.05],[.3,.065,.4],M);
  tubeAB(pm,[X(4.52),Y(.36),0],[X(4.52),Y(.5),0],.33,16,MM.RUBBER);
  if(lk.susp==='solid')solidAxles(K);else for(const ua of [D.uFa,D.uRa])ifs(K,ua,ua===D.uRa);
}
/* a coil spring between two points */
function coil(pm,a,b,r,turns,wire,m){const d=V3.sub(b,a),L=V3.len(d),ax=V3.mul(d,1/L),up=Math.abs(ax[1])<.9?[0,1,0]:[1,0,0],u=V3.norm(V3.cross(ax,up)),w=V3.cross(ax,u),n=turns*8,pts=[];
  for(let i=0;i<=n;i++){const t=i/n,ang=t*turns*TAU;pts.push(V3.add(V3.add(a,V3.mul(ax,t*L)),V3.add(V3.mul(u,Math.cos(ang)*r),V3.mul(w,Math.sin(ang)*r))));}
  for(let i=0;i<n;i++)tubeAB(pm,pts[i],pts[i+1],wire,5,m,false);}
function ifs(K,ua,rear){
  const {D,X,pm,dy,pair}=K,lk=D.look,R=D.R,Y=y=>y+dy,tw=lk.track/2,M=MM.UNDER,x=X(ua);
  const dyF=Math.min(R,Y(.5));
  ball(pm,[x+(rear?0:.05),dyF,0],.13,10,M);
  pair(s=>{const hub=[x,R,s*(tw-.12)];
    tubeAB(pm,[x,dyF,s*.12],hub,.03,8,MM.STEEL);
    for(const o of [-.17,.17])tubeAB(pm,[x+o,Y(.34),s*.4],[x,R-.12,s*(tw-.13)],.022,6,M);
    for(const o of [-.11,.11])tubeAB(pm,[x+o,Y(.6),s*.5],[x,R+.12,s*(tw-.17)],.018,6,M);
    const lo=[x-.06,R-.1,s*(tw-.26)],hi=[x-.06,Y(.82),s*.58];
    tubeAB(pm,lo,hi,.026,8,MM.STEEL);coil(pm,V3.lerp(lo,hi,.12),V3.lerp(lo,hi,.7),.06,6,.009,lk.springCol||MM.UNDER);});
}
function solidAxles(K){
  const {D,X,pm,dy,pair}=K,lk=D.look,R=D.R,Y=y=>y+dy,tw=lk.track/2,M=MM.UNDER;
  for(const ua of [D.uFa,D.uRa]){const x=X(ua),rear=ua===D.uRa;
    tubeAB(pm,[x,R,-(tw-.09)],[x,R,tw-.09],.055,10,M);
    ball(pm,[x+(rear?-.02:.04),R,.16],.17,12,M);tubeAB(pm,[x+(rear?-.1:.12),R,.16],[x+(rear?-.32:.42),R+.04,.16],.03,8,MM.STEEL);
    pair(s=>{tubeAB(pm,[x,R+.02,s*(tw-.1)],[x,R+.02,s*(tw-.03)],.085,10,M);
      for(const [o,yy,zz] of [[1,-.1,.42],[1,.12,.3]]){const dir=rear?1:-1;tubeAB(pm,[x,R+yy,s*zz],[x+dir*.85,Y(.36),s*.48],.025,8,MM.STEEL);}
      const lo=[x+(rear?.12:-.12),R+.06,s*(tw-.3)],hi=[x+(rear?.12:-.12),Y(.86),s*.6];
      tubeAB(pm,lo,hi,.032,8,MM.ALU);tubeAB(pm,V3.lerp(lo,hi,.55),hi,.042,8,MM.STEEL);
      coil(pm,V3.lerp(lo,hi,.15),V3.lerp(lo,hi,.82),.075,7,.012,lk.springCol||MM.UNDER);
      tubeAB(pm,V3.add(hi,[0,-.05,s*.07]),V3.add(hi,[0,-.32,s*.08]),.03,8,MM.ALU);});
    if(!rear){tubeAB(pm,[x+.18,R+.05,-(tw-.14)],[x+.18,R+.05,tw-.14],.02,6,MM.STEEL);}
  }
}
/* ---------- roof: rails, crossbars, the expedition rack ---------- */
function roof(K){
  const {D,X,pm,topY,pair}=K,lk=D.look,r=lk.roof;if(!r||r==='none')return;
  const zr=.6,u0=2.72,u1=4.48,ry=u=>topY(u,zr)+.058,RM=lk.railCol||MM.BLACK;
  pair(s=>{const n=10;for(let i=0;i<n;i++){const a=u0+(u1-u0)*i/n,b=u0+(u1-u0)*(i+1)/n;
      const p=[X(a),ry(a),s*zr],q=[X(b),ry(b),s*zr],c=V3.lerp(p,q,.5),ax=V3.norm(V3.sub(q,p));
      obox(pm,c,ax,V3.norm(V3.cross([0,0,1],ax)),[0,0,1],[V3.len(V3.sub(q,p))/2+.002,.014,.017],RM);}
    for(const u of [u0+.04,u1-.04,(u0+u1)/2]){const y0=topY(u,zr);obox(pm,[X(u),(y0+ry(u))/2,s*zr],[1,0,0],[0,1,0],[0,0,1],[.05,(ry(u)-y0)/2+.012,.02],RM);}});
  if(r==='bars')for(const u of [3.02,4.16]){const y=ry(u)+.022;obox(pm,[X(u),y,0],[1,0,0],[0,1,0],[0,0,1],[.032,.011,zr+.015],RM);
    pair(s=>obox(pm,[X(u),y-.012,s*zr],[1,0,0],[0,1,0],[0,0,1],[.045,.022,.03],RM));}
  if(r==='rack')rack(K,ry);
}
function rack(K,ry){
  const {D,X,pm,topY,pair}=K,lk=D.look,B=MM.BLACK;
  const u0=2.66,u1=4.52,y=ry(3.6)+.07,w=.68,fr=.016;
  for(const u of [u0+.1,3.6,u1-.1])pair(s=>obox(pm,[X(u),(y+ry(u))/2,s*.6],[1,0,0],[0,1,0],[0,0,1],[.03,Math.max(.01,(y-ry(u))/2),.016],B));
  pair(s=>obox(pm,[X((u0+u1)/2),y,s*w],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,fr,fr],B));
  for(const u of [u0,u1])obox(pm,[X(u),y,0],[1,0,0],[0,1,0],[0,0,1],[fr,fr,w],B);
  for(let k=1;k<11;k++)obox(pm,[X(u0+(u1-u0)*k/11),y+.004,0],[1,0,0],[0,1,0],[0,0,1],[.018,.007,w-.01],B);
  /* a low rail round the edge, a wind deflector in front */
  pair(s=>{for(let k=0;k<=6;k++){const u=u0+(u1-u0)*k/6;obox(pm,[X(u),y+.05,s*w],[1,0,0],[0,1,0],[0,0,1],[.008,.05,.008],B);}
    obox(pm,[X((u0+u1)/2),y+.1,s*w],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,.01,.01],B);});
  obox(pm,[X(u0-.035),y+.035,0],V3.norm([.6,1,0]),V3.norm([-1,.6,0]),[0,0,1],[.05,.005,w],B);
  /* two hard cases at the back, a rolled olive duffel, recovery boards along the side */
  pair(s=>{const c=[X(4.1),y+.13,s*.32];rbox(pm,c,[1,0,0],[0,1,0],[0,0,1],[.28,.11,.27],V(lin('#26282a'),MAT.METAL),.16,16,8);
    obox(pm,[c[0],c[1]+.012,c[2]],[1,0,0],[0,1,0],[0,0,1],[.285,.007,.275],V(lin('#151617'),MAT.METAL));
    for(const dx of [-.14,.14])obox(pm,[c[0]+dx,c[1]+.05,c[2]+s*.273],[1,0,0],[0,1,0],[0,0,1],[.03,.02,.005],MM.ALU);});
  tubeAB(pm,[X(3.42),y+.12,-.46],[X(3.42),y+.12,.46],.11,14,V(lin('#55593a'),MAT.FABRIC));
  for(const z of [-.3,.3])tubeAB(pm,[X(3.42),y+.12,z-.016],[X(3.42),y+.12,z+.016],.114,14,V(lin('#1a1a1a'),MAT.FABRIC));
  tubeAB(pm,[X(3.0),y+.075,-.28],[X(3.0),y+.075,.28],.068,12,V(lin('#3c3f2c'),MAT.FABRIC));
  pair(s=>{obox(pm,[X(3.5),y+.075,s*(w+.03)],[1,0,0],[0,1,0],[0,0,1],[.44,.068,.012],V(lin('#a8481c'),MAT.METAL));
    for(const u of [3.22,3.78])obox(pm,[X(u),y+.075,s*(w+.042)],[1,0,0],[0,1,0],[0,0,1],[.02,.06,.004],B);});
  /* four square LED pods across the front of the rack */
  for(const z of [-.5,-.17,.17,.5]){obox(pm,[X(u0-.01),y+.035,z],[1,0,0],[0,1,0],[0,0,1],[.012,.03,.012],B);
    rbox(pm,[X(u0-.04),y+.085,z],[1,0,0],[0,1,0],[0,0,1],[.04,.055,.058],B,.22,12,6);
    obox(pm,[X(u0-.081),y+.085,z],[1,0,0],[0,1,0],[0,0,1],[.003,.044,.047],MM.HEAD);}
  /* a whip antenna on the back corner */
  tubeAB(pm,[X(u1),y,-.62],[X(u1+.06),y+.95,-.62],.005,5,B);ball(pm,[X(u1+.06),y+.955,-.62],.012,6,MM.TAIL);
}
/* ---------- spoilers and wings ---------- */
function spoiler(K){
  const {D,X,pm,topY,pair,G}=K,lk=D.look,sp=lk.spoiler;if(!sp)return;
  const big=sp==='roof'||sp==='wing',u0=G.rr-.08,len=big?.26:.13,n=8,w=.68;
  /* a lofted lip over the rear glass: carries the roofline back and tips down, fins down each side when big */
  const rows=[];for(let i=0;i<=n;i++){const t=i/n,u=u0+len*t,y0=topY(u0,0)+.004;rows.push([u,y0+.01*Math.sin(t*PI)-(big?.05:.03)*t*t,(big?.025:.018)*(1-t)+.008]);}
  const m=lk.spoilerMat||MM.PAINT;
  for(let i=0;i<n;i++){const [ua,ya,ta]=rows[i],[ub,yb,tb]=rows[i+1];
    pm.quad([X(ua),ya,-w],[X(ub),yb,-w],[X(ub),yb,w],[X(ua),ya,w],m[0],m[1],m[2]);
    pm.quad([X(ua),ya-ta,-w],[X(ua),ya-ta,w],[X(ub),yb-tb,w],[X(ub),yb-tb,-w],m[0],m[1],m[2]);
    pair(s=>pm.quad([X(ua),ya,s*w],[X(ub),yb,s*w],[X(ub),yb-tb,s*w],[X(ua),ya-ta,s*w],m[0],m[1],m[2]));}
  {const [u,y,t]=rows[n];pm.quad([X(u),y,-w],[X(u),y,w],[X(u),y-t,w],[X(u),y-t,-w],m[0],m[1],m[2]);
    obox(pm,[X(u-.02),y-t-.006,0],[1,0,0],[0,1,0],[0,0,1],[.012,.007,.2],MM.TAIL);}
  if(big)pair(s=>plateXY(pm,[[X(u0+.02),topY(u0,.6)],[X(u0+len),rows[n][1]],[X(u0+len-.02),rows[n][1]-.12],[X(u0+.04),topY(u0+.04,.6)-.05]],s*(w-.005),.012,m));
  if(sp==='wing'){
    /* a GT wing on swan necks off the roof, endplates, a Gurney flap */
    const uw=G.rr+.02,yw=topY(G.rr-.25,0)+.3,hw=.82,c=.36,x=X(uw);
    wing(pm,x+.06,yw,hw,c,.03,.2,MM.CARBON,true);
    obox(pm,[x+.06-c*1.0,yw+.05,0],[1,0,0],[0,1,0],[0,0,1],[.004,.018,hw],MM.CARBON);
    pair(s=>{const z=s*.42,yb=topY(G.rr-.3,.42);
      tubePath(pm,[[X(G.rr-.3),yb,z],[X(G.rr-.24),yw-.08,z],[x-.06,yw+.07,z],[x-.16,yw+.04,z]],.014,6,MM.BLACK);
      plateXY(pm,[[x+.12,yw-.1],[x+.1,yw+.12],[x-.38,yw+.14],[x-.42,yw+.06],[x-.4,yw-.1]],s*(hw+.006),.01,MM.CARBON);});
  }
}
/* ---------- exhaust tips ---------- */
function exhausts(K){
  const {D,X,pm,dy,pair,L}=K,lk=D.look,Y=y=>y+dy,ex=lk.exhaust||'single';
  const tipAt=(c,r,dir=[-1,0,0],len=.12)=>{const b=V3.add(c,V3.mul(dir,len));tubeAB(pm,c,b,r,14,MM.CHROME,false);
    tubeAB(pm,V3.add(b,V3.mul(dir,-.03)),b,r*.82,14,V([.012,.012,.012],MAT.COL),true);};
  if(ex==='single'){tubeAB(pm,[X(3.3),Y(.36),.42],[X(L-.12),Y(.39),.6],.03,8,MM.UNDER);tipAt([X(L-.13),Y(.39),.6],.037);}
  if(ex==='dual')pair(s=>{tubeAB(pm,[X(3.3),Y(.36),s*.42],[X(L-.1),Y(.43),s*.64],.035,8,MM.UNDER);tipAt([X(L-.12),Y(.43),s*.64],.048,[-1,0,0],.16);});
  if(ex==='crawl'){tubeAB(pm,[X(3.3),Y(.4),.42],[X(L-.2),Y(.5),.55],.035,8,MM.UNDER);tipAt([X(L-.22),Y(.5),.55],.04,V3.norm([-.6,-.8,0]),.1);}
  if(ex==='side'){for(const o of [-.09,.09]){const u=D.uRa-D.arch.a-.18+o;tubeAB(pm,[X(u),Y(.36),.5],[X(u),Y(.36),.86],.04,8,MM.UNDER);tipAt([X(u),Y(.36),.86],.046,[0,-.15,1],.1);}}
}
/* ---------- front ends ---------- */
const FRONTS={
  /* the sleeper's lip: a black splitter that follows the bumper, a red line along its front edge */
  lip:K=>{const {D,X,pm,dy,uFront,pair}=K,Y=y=>y+dy,n=14,y=Y(.425);
    const P=[];for(let k=0;k<=n;k++){const z=-.84+1.68*k/n;P.push([uFront(z*.96,y+.04)-.045,z]);}
    for(let k=0;k<n;k++){const [ua,za]=P[k],[ub,zb]=P[k+1];
      pm.quad([X(ua),y,za],[X(ub),y,zb],[X(.3),y,zb],[X(.3),y,za],MM.BLACK[0],0,MM.BLACK[2]);
      pm.quad([X(ua),y,za],[X(ub),y,zb],[X(ub),y+.022,zb],[X(ua),y+.022,za],MM.BLACK[0],0,MM.BLACK[2]);
      pm.quad([X(ua)+.002,y+.006,za],[X(ub)+.002,y+.006,zb],[X(ub)+.002,y+.014,zb],[X(ua)+.002,y+.014,za],[1,1,1],0,MAT.ACCENT);}},
  /* the crawler's steel bumper: plated, winch in the middle, bronze shackles, LED cubes, a skid plate */
  steel:K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x0=X(0)+.07;
    obox(pm,[x0,Y(.56),0],[1,0,0],[0,1,0],[0,0,1],[.09,.115,.62],S);
    pair(s=>{const a=V3.norm([-.55,0,s]);obox(pm,[x0-.12,Y(.6),s*.76],a,[0,1,0],V3.cross(a,[0,1,0]),[.2,.085,.06],S);
      obox(pm,[x0-.06,Y(.68),s*.55],[1,0,0],[0,1,0],[0,0,1],[.07,.012,.12],S);
      /* shackle: a bronze bow through a tab */
      obox(pm,[x0+.1,Y(.5),s*.42],[1,0,0],[0,1,0],[0,0,1],[.03,.035,.012],S);
      const sc=V(lin('#a8783c'),MAT.METAL),cx=x0+.13,cy=Y(.5),z=s*.42,r=.036,pts=[];
      for(let k=0;k<=8;k++){const t=-PI/2+PI*k/8;pts.push([cx+Math.cos(t)*r+.02,cy+Math.sin(t)*r,z]);}
      tubePath(pm,[[cx-.04,cy-r,z],...pts,[cx-.04,cy+r,z]],.011,6,sc);tubeAB(pm,[cx-.04,cy-r-.02,z],[cx-.04,cy+r+.02,z],.009,6,sc);
      rbox(pm,[x0+.03,Y(.7),s*.6],[1,0,0],[0,1,0],[0,0,1],[.04,.05,.05],S,.2,10,6);obox(pm,[x0+.071,Y(.7),s*.6],[1,0,0],[0,1,0],[0,0,1],[.003,.04,.04],MM.HEAD);});
    /* winch */
    tubeAB(pm,[x0+.04,Y(.66),-.2],[x0+.04,Y(.66),.2],.07,12,S);tubeAB(pm,[x0+.04,Y(.66),-.16],[x0+.04,Y(.66),.16],.074,12,V(lin('#202020'),MAT.RUBBER));
    obox(pm,[x0+.1,Y(.6),0],[1,0,0],[0,1,0],[0,0,1],[.02,.03,.1],MM.ALU);tubeAB(pm,[x0+.12,Y(.6),0],[x0+.16,Y(.58),0],.012,6,V(lin('#c83020'),MAT.METAL));
    obox(pm,[X(.32),Y(.38),0],V3.norm([1,.35,0]),V3.norm([-.35,1,0]),[0,0,1],[.3,.008,.5],S);},
  /* race: a carbon splitter well out front with endplates, two canards a side, a red tow strap */
  race:K=>{const {D,X,pm,dy,uFront,pair}=K,Y=y=>y+dy,n=14,y=Y(.4);
    const P=[];for(let k=0;k<=n;k++){const z=-.9+1.8*k/n;P.push([uFront(z*.95,y+.05)-.14,z]);}
    for(let k=0;k<n;k++){const [ua,za]=P[k],[ub,zb]=P[k+1];
      pm.quad([X(ua),y,za],[X(ub),y,zb],[X(.35),y,zb],[X(.35),y,za],[1,1,1],0,MAT.CARBON);
      pm.quad([X(ua),y,za],[X(ub),y,zb],[X(ub),y+.018,zb],[X(ua),y+.018,za],[1,1,1],0,MAT.CARBON);}
    pair(s=>{plateXY(pm,[[X(P[0][0]),y],[X(.08),y],[X(.1),y+.13],[X(P[0][0])+.02,y+.06]],s*.9,.008,MM.CARBON);
      for(const [yy,du] of [[.62,.05],[.53,.03]]){const u0=K.uFront(.8,Y(yy))+du;
        pm.tri([X(u0),Y(yy),s*.8],[X(u0+.24),Y(yy+.03),s*.93],[X(u0+.02),Y(yy+.005),s*.93],[1,1,1],0,MAT.CARBON);}});
    const xr=X(K.uFront(.35,Y(.47)));tubeAB(pm,[xr,Y(.47),.35],[xr+.09,Y(.42),.35],.014,6,V(lin('#d02020'),MAT.FABRIC));obox(pm,[xr+.09,Y(.42),.35],[1,0,0],[0,1,0],[0,0,1],[.012,.035,.006],V(lin('#d02020'),MAT.FABRIC));}
};
const REARS={
  diffuser:K=>{const {D,X,pm,dy,pair,L}=K,Y=y=>y+dy,x=X(L);
    obox(pm,[x+.15,Y(.47),0],V3.norm([1,-.25,0]),V3.norm([.25,1,0]),[0,0,1],[.18,.007,.5],MM.BLACK);
    for(let k=-2;k<=2;k++)plateXY(pm,[[x+.3,Y(.44)],[x-.01,Y(.52)],[x-.01,Y(.47)],[x+.2,Y(.43)]],k*.18,.006,MM.BLACK);
    obox(pm,[x-.012,Y(.53),0],[1,0,0],[0,1,0],[0,0,1],[.003,.005,.48],V([1,1,1],MAT.ACCENT));},
  steel:K=>{const {D,X,pm,dy,pair,L}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x=X(L)-.06;
    obox(pm,[x,Y(.56),0],[1,0,0],[0,1,0],[0,0,1],[.08,.1,.86],S);
    obox(pm,[x-.12,Y(.52),0],[1,0,0],[0,1,0],[0,0,1],[.06,.035,.035],S);
    pair(s=>{const sc=V(lin('#a8783c'),MAT.METAL);obox(pm,[x-.06,Y(.48),s*.55],[1,0,0],[0,1,0],[0,0,1],[.03,.035,.012],S);
      tubeAB(pm,[x-.11,Y(.47),s*.55-.04],[x-.11,Y(.47),s*.55+.04],.012,6,sc);
      obox(pm,[x-.081,Y(.6),s*.75],[1,0,0],[0,1,0],[0,0,1],[.003,.02,.06],MM.TAIL);});},
  race:K=>{const {D,X,pm,dy,pair,L}=K,Y=y=>y+dy,x=X(L);
    obox(pm,[x+.25,Y(.43),0],V3.norm([1,-.3,0]),V3.norm([.3,1,0]),[0,0,1],[.28,.008,.66],MM.CARBON);
    for(let k=-3;k<=3;k++)plateXY(pm,[[x+.45,Y(.37)],[x-.06,Y(.56)],[x-.06,Y(.43)],[x+.25,Y(.36)]],k*.2,.008,MM.CARBON);
    obox(pm,[x-.02,Y(.62),0],[1,0,0],[0,1,0],[0,0,1],[.012,.035,.045],MM.TAIL);
    tubeAB(pm,[x,Y(.5),-.42],[x-.08,Y(.48),-.42],.012,6,V(lin('#d02020'),MAT.FABRIC));}
};
const HOODS={
  /* a raised scoop at the front of the hood, open to the front */
  scoop:K=>{const {D,X,pm,topY}=K,u0=.5,u1=1.15,n=10,w=.24,rows=[];
    for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n,t=(u-u0)/(u1-u0),h=.065*(1-t)*Math.min(1,t*12+.4),row=[];
      for(let k=-3;k<=3;k++){const z=k/3*w*(1-.12*t),yy=topY(u,z)+h*Math.pow(Math.cos(k/3*PI/2),.5)+.002;row.push([X(u),yy,z]);}rows.push(row);}
    for(let i=0;i<n;i++)for(let k=0;k<6;k++)pm.quad(rows[i][k],rows[i+1][k],rows[i+1][k+1],rows[i][k+1],[1,1,1],0,MAT.PAINT);
    const f=rows[0];for(let k=0;k<6;k++){const a=f[k],b=f[k+1],ya=topY(u0,a[2]),yb=topY(u0,b[2]);pm.quad([a[0],ya,a[2]],[b[0],yb,b[2]],[b[0],b[1],b[2]],[a[0],a[1],a[2]],[0,0,0],0,MAT.MESH);}
    for(const k of [0,6]){const r=rows.map(q=>q[k]);for(let i=0;i<n;i++){const a=r[i],b=r[i+1];pm.quad(a,b,[b[0],topY(u0+(u1-u0)*(i+1)/n,b[2]),b[2]],[a[0],topY(u0+(u1-u0)*i/n,a[2]),a[2]],[1,1,1],0,MAT.PAINT);}}},
  /* race: two louvred vents and hood pins */
  vents:K=>{const {D,decal,pair}=K;
    pair(s=>{decal('T',[[.7,s*.22],[1.25,s*.24],[1.25,s*.58],[.7,s*.52]],MM.TRIM,.004,.06);
      for(let k=0;k<9;k++){const u=.75+k*.055;decal('T',[[u,s*.235],[u+.02,s*.235],[u+.02,s*.53],[u,s*.53]],MM.CARBON,.008,.08);}
      decal('T',RR2(.24,.27,s*.6-.015,s*.6+.015,.01),MM.CHROME,.008);});}
};
/* ---------- everything else ---------- */
const EXTRAS={
  /* rock sliders: a tube along each rocker, kicked out from the frame */
  sliders:K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,u0=D.uFa+D.arch.a+.06,u1=D.uRa-D.arch.a-.06,z=.99;
    pair(s=>{tubeAB(pm,[X(u0),Y(.43),s*z],[X(u1),Y(.43),s*z],.032,10,MM.BLACK);for(const u of [u0+.05,(u0+u1)/2,u1-.05])tubeAB(pm,[X(u),Y(.43),s*z],[X(u),Y(.4),s*.55],.026,8,MM.BLACK);
      tubeAB(pm,[X(u0),Y(.43),s*z],[X(u0-.06),Y(.5),s*.86],.03,8,MM.BLACK);tubeAB(pm,[X(u1),Y(.43),s*z],[X(u1+.06),Y(.5),s*.86],.03,8,MM.BLACK);});},
  /* a snorkel up the right A-pillar */
  snorkel:K=>{const {D,X,pm,G,secKeys,dy}=K,z0=.97,pts=[];
    const k1=secKeys(1.35),k2=secKeys(G.cowl+.05),ua=G.cowl+.08;
    pts.push([X(1.35),k1.yB-.08,z0],[X(1.62),k2.yB+.02,z0-.005]);
    for(let t=0;t<=1.001;t+=.25){const u=lerp(ua,G.rf-.05,t),k=secKeys(u);pts.push([X(u),k.P[10][1]+.01,k.P[10][0]+.08]);}
    const top=pts[pts.length-1];pts.push([top[0],top[1]+.12,top[2]-.01]);
    tubePath(pm,pts,.05,10,MM.BLACK);
    rbox(pm,[top[0]+.03,top[1]+.17,top[2]-.01],[1,0,0],[0,1,0],[0,0,1],[.1,.06,.06],MM.BLACK,.3,10,6);
    obox(pm,[top[0]+.131,top[1]+.17,top[2]-.01],[1,0,0],[0,1,0],[0,0,1],[.003,.045,.045],V([0,0,0],MAT.MESH));},
  /* ditch lights on the cowl corners */
  ditch:K=>{const {D,X,pm,pair,G}=K,k=secKeys(D,G.cowl-.02);
    pair(s=>{const c=[X(G.cowl-.04),k.yB+.08,s*(k.hs-.05)];tubeAB(pm,[c[0],c[1]-.08,c[2]],c,.012,6,MM.BLACK);
      tubeAB(pm,[c[0]-.03,c[1]+.02,c[2]],[c[0]+.05,c[1]+.02,c[2]],.05,12,MM.BLACK,false);tubeAB(pm,[c[0]+.05,c[1]+.02,c[2]],[c[0]+.052,c[1]+.02,c[2]],.045,12,MM.HEAD);});},
  /* bolt-on mud flaps behind each wheel */
  flaps:K=>{const {D,X,pm,dy,pair,sideZ}=K;for(const ua of [D.uFa,D.uRa])pair(s=>{const u=ua+D.arch.a+.04,z=sideZ(u,D.arch.cy)*.9;
    obox(pm,[X(u),D.arch.cy-.14,s*z],[1,0,0],[0,1,0],[0,0,1],[.006,.16,.13],V(lin('#141414'),MAT.RUBBER));});},
  /* race: carbon side skirts */
  skirts:K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,u0=D.uFa+D.arch.a+.1,u1=D.uRa-D.arch.a-.1;
    pair(s=>{obox(pm,[X((u0+u1)/2),Y(.34),s*.95],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,.035,.035],MM.CARBON);});},
  /* race: a roof scoop, a windshield banner, a fuel filler, a number on each front door */
  raceKit:K=>{const {D,X,pm,G,topY,decal,pair}=K;
    const u0=G.rf+.12,u1=u0+.45,w=.2,h=.07;
    for(let i=0;i<6;i++){const a=u0+(u1-u0)*i/6,b=u0+(u1-u0)*(i+1)/6,ha=h*(1-i/6),hb=h*(1-(i+1)/6);
      pm.quad([X(a),topY(a,0)+ha,-w],[X(b),topY(b,0)+hb,-w],[X(b),topY(b,0)+hb,w],[X(a),topY(a,0)+ha,w],[1,1,1],0,MAT.PAINT);
      pair(s=>pm.quad([X(a),topY(a,0),s*w],[X(b),topY(b,0),s*w],[X(b),topY(b,0)+hb,s*w],[X(a),topY(a,0)+ha,s*w],[1,1,1],0,MAT.PAINT));}
    pm.quad([X(u0),topY(u0,0),-w],[X(u0),topY(u0,0),w],[X(u0),topY(u0,0)+h,w],[X(u0),topY(u0,0)+h,-w],[0,0,0],0,MAT.MESH);
    decal('T',[[G.rf-.2,-.66],[G.rf-.02,-.66],[G.rf-.02,.66],[G.rf-.2,.66]],MM.TRIM,.004,.1);
    decal('SR',EL2(4.4,K.secKeys(4.4).yG+.22,.045,.045,14),MM.CHROME,.007);
    /* the number: a white roundel with digits drawn from the dot-matrix font */
    const uc=(G.cowl+G.pillars[0][0])/2+.08,yc=D.belt(uc)-.3,cell=.026;
    decal('S',EL2(uc,yc,.24,.24,24),V([.92,.92,.9],MAT.COL),.006,.08);
    const txt='06',wd=txt.length*6-1;
    for(const side of ['SR','SL'])for(let ci=0;ci<txt.length;ci++){const g=G5[txt[ci]];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g[r]>>(4-c))&1){
      const col=ci*6+c,du=(col-(wd-1)/2)*cell*(side==='SR'?-1:1),y=yc+(3-r)*cell*1.15;
      decal(side,[[uc+du-cell/2,y-cell*.58],[uc+du+cell/2,y-cell*.58],[uc+du+cell/2,y+cell*.58],[uc+du-cell/2,y+cell*.58]],V([.02,.02,.02],MAT.COL),.009,.1);}}},
  /* sleeper: a copper pinstripe along the skirts and red calipers do the talking */
  pinstripe:K=>{const {D,line}=K,u0=D.uFa+D.arch.a+.08,u1=D.uRa-D.arch.a-.08,y=D.sill(2)+.025;
    line('S',[[u0,y],[u1,y]],.012,V(lin('#b0703c'),MAT.METAL),.016);}
};
