/* =====================================================================================
   WHEELS AND TYRES. One mesh per build, drawn four times. Local axes: the axle along z with
   the wheel's face at +z (the left side is drawn mirrored), spin about z.
   Tyres: highway all-season, low-profile performance, mud-terrain with real lugs, race slick.
   Wheels: the factory six-spoke, a ten-spoke, a beadlock with a bolt ring, a centre-lock.
   ===================================================================================== */
const WHEELMESH={};
function buildWheel(w){
  const key=JSON.stringify(w);if(WHEELMESH[key])return WHEELMESH[key];
  const mb=new MB(),R=w.R,W=w.W,rimR=w.rim*.0254/2,seg=w.tyre==='mt'?40:36;
  const TY=[.032,.032,.034];
  /* ---------- the tyre: a revolved profile (r, z), inner bead to outer bead ---------- */
  const hw=W/2,sh=R-rimR;let prof;
  if(w.tyre==='slick')prof=[[rimR+.012,-hw*.86],[rimR+.03,-hw*.98],[R-.05,-hw],[R-.012,-hw*.93],[R,-hw*.8],[R,hw*.8],[R-.012,hw*.93],[R-.05,hw],[rimR+.03,hw*.98],[rimR+.012,hw*.86]];
  else if(w.tyre==='perf'){const g=(z)=>[[R,z-.012],[R-.007,z-.008],[R-.007,z+.008],[R,z+.012]];
    prof=[[rimR+.012,-hw*.86],[rimR+.025,-hw*.98],[R-.035,-hw],[R-.008,-hw*.94],[R,-hw*.84],...g(-hw*.36),...g(hw*.36),[R,hw*.84],[R-.008,hw*.94],[R-.035,hw],[rimR+.025,hw*.98],[rimR+.012,hw*.86]];}
  else if(w.tyre==='at')prof=[[rimR+.012,-hw*.85],[rimR+.03,-hw*.97],[R-.085,-hw*1.01],[R-.035,-hw*.97],[R-.016,-hw*.88],[R-.016,hw*.88],[R-.035,hw*.97],[R-.085,hw*1.01],[rimR+.03,hw*.97],[rimR+.012,hw*.85]];
  else if(w.tyre==='mt')prof=[[rimR+.012,-hw*.84],[rimR+.03,-hw*.97],[R-.1,-hw*1.02],[R-.045,-hw*.98],[R-.026,-hw*.9],[R-.026,hw*.9],[R-.045,hw*.98],[R-.1,hw*1.02],[rimR+.03,hw*.97],[rimR+.012,hw*.84]];
  else{const g=(z)=>[[R,z-.01],[R-.007,z-.007],[R-.007,z+.007],[R,z+.01]];
    prof=[[rimR+.012,-hw*.86],[rimR+.03,-hw*.97],[R-.07,-hw*1.01],[R-.025,-hw*.97],[R-.004,-hw*.82],...g(-hw*.4),...g(0),...g(hw*.4),[R-.004,hw*.82],[R-.025,hw*.97],[R-.07,hw*1.01],[rimR+.03,hw*.97],[rimR+.012,hw*.86]];}
  /* the tread's sipes are drawn by the shader: em carries the outer radius */
  const tread=w.tyre==='slick'||w.tyre==='mt'||w.tyre==='at'?0:R;
  for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
    for(let k=0;k<prof.length-1;k++){const p=prof[k],q=prof[k+1];mb.quad([ca*p[0],sa*p[0],p[1]],[cb*p[0],sb*p[0],p[1]],[cb*q[0],sb*q[0],q[1]],[ca*q[0],sa*q[0],q[1]],TY,tread,MAT.TYRE);}}
  /* mud-terrain lugs: two staggered rows of blocks across the tread, and shoulder lugs down the sidewalls */
  const blk=(a0,a1,r0,r1,z0,z1)=>{
    const P=(a,r,z)=>[Math.cos(a)*r,Math.sin(a)*r,z],f=(p,q,s,t)=>mb.quad(p,q,s,t,TY,0,MAT.TYRE);
    const A=[P(a0,r0,z0),P(a1,r0,z0),P(a1,r0,z1),P(a0,r0,z1)],B=[P(a0,r1,z0),P(a1,r1,z0),P(a1,r1,z1),P(a0,r1,z1)];
    f(B[0],B[1],B[2],B[3]);f(A[0],A[1],B[1],B[0]);f(A[2],A[3],B[3],B[2]);f(A[1],A[2],B[2],B[1]);f(A[3],A[0],B[0],B[3]);};
  /* all-terrain: smaller blocks in three staggered rows with sipes between, and short shoulder blocks */
  if(w.tyre==='at'){const np=30,p=TAU/np,d=.016;
    for(let i=0;i<np;i++){const a=i*p;
      blk(a,a+p*.62,R-d,R,hw*.36,hw*.9);blk(a+p*.5,a+p*1.12,R-d,R,-hw*.9,-hw*.36);blk(a+p*.25,a+p*.8,R-d,R,-hw*.28,hw*.28);
      for(const s of [1,-1]){const a0=a+(s>0?0:p*.5);blk(a0,a0+p*.5,R-.075,R-.02,s*hw*.97,s*hw*1.02);}}}
  if(w.tyre==='mt'){const np=21;
    for(let i=0;i<np;i++){const p=TAU/np,a=i*p;
      blk(a,a+p*.55,R-.028,R,hw*.06,hw*.9);blk(a+p*.5,a+p*1.05,R-.028,R,-hw*.9,-hw*.06);
      blk(a+p*.2,a+p*.38,R-.028,R-.004,-hw*.12,hw*.12);
      /* shoulder lugs on both sidewalls */
      for(const s of [1,-1]){const a0=a+(s>0?0:p*.5),a1=a0+p*.42,P=(aa,r,z)=>[Math.cos(aa)*r,Math.sin(aa)*r,z],z0=s*hw*.98,z1=s*hw*1.07,r0=R-.115,r1=R-.03;
        const f=(p1,q,s2,t)=>mb.quad(p1,q,s2,t,TY,0,MAT.TYRE);
        f(P(a0,r0,z1),P(a1,r0,z1),P(a1,r1,z1),P(a0,r1,z1));f(P(a0,r1,z0),P(a1,r1,z0),P(a1,r1,z1),P(a0,r1,z1));
        f(P(a0,r0,z0),P(a0,r0,z1),P(a0,r1,z1),P(a0,r1,z0));f(P(a1,r0,z0),P(a1,r1,z0),P(a1,r1,z1),P(a1,r0,z1));f(P(a0,r0,z0),P(a1,r0,z0),P(a1,r0,z1),P(a0,r0,z1));}}}
  /* ---------- the wheel ---------- */
  const zf=hw*.86,RIM=[1,1,1],dish={bead:.012,ten:.03,split:.035,cap:.02,steel:.03,flat:.012,mag:.04}[w.style]||.05;
  const face=zf-dish,lipIn=rimR*.93;
  for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU,c=Math.cos,s=Math.sin;
    /* the outer lip, the inner barrel, and the dark back of the barrel */
    mb.quad([c(a)*rimR*1.04,s(a)*rimR*1.04,zf+.006],[c(b)*rimR*1.04,s(b)*rimR*1.04,zf+.006],[c(b)*lipIn,s(b)*lipIn,zf-.004],[c(a)*lipIn,s(a)*lipIn,zf-.004],RIM,0,w.style==='bead'?MAT.METAL:MAT.RIM);
    mb.quad([c(a)*lipIn,s(a)*lipIn,zf-.004],[c(b)*lipIn,s(b)*lipIn,zf-.004],[c(b)*lipIn,s(b)*lipIn,face-.14],[c(a)*lipIn,s(a)*lipIn,face-.14],[.4,.4,.42],0,MAT.METAL);}
  {const back=new Array(seg).fill(0).map((_,i)=>[Math.cos(i/seg*TAU)*lipIn,Math.sin(i/seg*TAU)*lipIn,face-.13]);for(let i=0;i<seg;i++)mb.tri([0,0,face-.13],back[(i+1)%seg],back[i],[.01,.01,.012],0,MAT.COL);}
  /* the brake: rotor and caliper (painted with the big kits) */
  const bigB=w.brake!=='stock',rr=rimR*(bigB?.86:.78),cz=face-.06;
  tubeAB(mb,[0,0,cz-.016],[0,0,cz+.016],rr,24,V([1,1,1],MAT.ROTOR));
  tubeAB(mb,[0,0,cz-.03],[0,0,cz+.02],rimR*.36,14,V([.18,.18,.2],MAT.METAL));
  {const a0=PI*.12,a1=PI*(bigB?.62:.48),r0=rr*.72,r1=rr*1.04,z0=cz-.04,z1=cz+.035,n=6,CM=V([1,1,1],MAT.CALIPER);
    for(let k=0;k<n;k++){const p=a0+(a1-a0)*k/n,q=a0+(a1-a0)*(k+1)/n,C=Math.cos,S=Math.sin;
      mb.quad([C(p)*r1,S(p)*r1,z1],[C(q)*r1,S(q)*r1,z1],[C(q)*r0,S(q)*r0,z1],[C(p)*r0,S(p)*r0,z1],CM[0],0,CM[2]);
      mb.quad([C(p)*r1,S(p)*r1,z0],[C(q)*r1,S(q)*r1,z0],[C(q)*r1,S(q)*r1,z1],[C(p)*r1,S(p)*r1,z1],CM[0],0,CM[2]);}}
  /* spokes: a prism from the hub to the lip, with depth and a little concavity */
  const RM=w.style==='bead'?MAT.METAL:MAT.RIM,rO=lipIn*.985;
  const sp=(a,w0,w1,r0,r1,tw,dz,dp=.03)=>{const c=Math.cos(a),s=Math.sin(a),c2=Math.cos(a+tw),s2=Math.sin(a+tw),n0=[-s,c],n1=[-s2,c2];
    const A=[c*r0+n0[0]*w0,s*r0+n0[1]*w0],B2=[c*r0-n0[0]*w0,s*r0-n0[1]*w0],C=[c2*r1-n1[0]*w1,s2*r1-n1[1]*w1],Dd=[c2*r1+n1[0]*w1,s2*r1+n1[1]*w1],zh=face+dz,zr=face;
    mb.quad([A[0],A[1],zh],[Dd[0],Dd[1],zr],[C[0],C[1],zr],[B2[0],B2[1],zh],RIM,0,RM);
    mb.quad([A[0],A[1],zh],[Dd[0],Dd[1],zr],[Dd[0],Dd[1],zr-dp],[A[0],A[1],zh-dp],RIM,0,RM);
    mb.quad([B2[0],B2[1],zh],[C[0],C[1],zr],[C[0],C[1],zr-dp],[B2[0],B2[1],zh-dp],RIM,0,RM);};
  const disc=(r0,r1,z,m,n=seg)=>{for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU,C=Math.cos,S=Math.sin;mb.quad([C(a)*r1,S(a)*r1,z],[C(b)*r1,S(b)*r1,z],[C(b)*r0,S(b)*r0,z],[C(a)*r0,S(a)*r0,z],m[0],m[1],m[2]);}};
  let lugs=6,lugR=.072,hubR=.085;
  if(w.style==='six'){for(let i=0;i<6;i++){const a=i/6*TAU+PI/6;sp(a,.045,.07,.07,rO,0,.045,.035);}
    /* a turned ring where the spokes meet the lip */
    disc(rO*.93,rO,face+.004,V(RIM,RM));}
  else if(w.style==='ten'){for(let i=0;i<10;i++)sp(i/10*TAU,.017,.022,.06,rO,.06,.028,.03);lugs=5;}
  else if(w.style==='bead'){
    /* a flat face with eight round windows, a black bolt ring and its bolts */
    disc(.06,rO*.9,face+.01,V(RIM,MAT.RIM),seg);
    for(let i=0;i<8;i++){const a=i/8*TAU+PI/8,c=[Math.cos(a)*rO*.6,Math.sin(a)*rO*.6];
      for(let k=0;k<12;k++){const p=k/12*TAU,q=(k+1)/12*TAU,r=rO*.17;mb.tri([c[0],c[1],face+.0115],[c[0]+Math.cos(q)*r,c[1]+Math.sin(q)*r,face+.0115],[c[0]+Math.cos(p)*r,c[1]+Math.sin(p)*r,face+.0115],[.008,.008,.009],0,MAT.COL);}}
    disc(rO*.9,rimR*1.045,zf+.012,V([.025,.025,.027],MAT.METAL));
    for(let i=0;i<24;i++){const a=i/24*TAU,r=rimR*.975;tubeAB(mb,[Math.cos(a)*r,Math.sin(a)*r,zf+.012],[Math.cos(a)*r,Math.sin(a)*r,zf+.024],.008,6,MM.ALU);}
    hubR=.075;}
  else if(w.style==='race'){for(let i=0;i<6;i++){const a=i/6*TAU;sp(a,.03,.03,.07,rO*.52,0,.045);sp(a+.11,.014,.016,rO*.48,rO,.07,.012);sp(a-.11,.014,.016,rO*.48,rO,-.07,.012);}
    lugs=0;}
  else if(w.style==='mag'){for(let i=0;i<5;i++)sp(i/5*TAU+PI/10,.028,.07,.065,rO*.97,0,.038,.03);disc(rO*.9,rO,face+.006,V(RIM,RM));lugs=5;}
  else if(w.style==='flat'){
    /* a flat white face with eight round windows and a plain cap: the rally wheel */
    disc(.06,rO*.94,face+.01,V(RIM,MAT.RIM),seg);
    for(let i=0;i<8;i++){const a=i/8*TAU,c=[Math.cos(a)*rO*.66,Math.sin(a)*rO*.66];
      for(let k=0;k<12;k++){const p=k/12*TAU,q=(k+1)/12*TAU,r=rO*.13;mb.tri([c[0],c[1],face+.0115],[c[0]+Math.cos(q)*r,c[1]+Math.sin(q)*r,face+.0115],[c[0]+Math.cos(p)*r,c[1]+Math.sin(p)*r,face+.0115],[.008,.008,.009],0,MAT.COL);}}
    disc(rO*.94,rimR*1.03,zf+.006,V(RIM,MAT.RIM));lugs=4;lugR=.055;}
  else if(w.style==='five'){for(let i=0;i<5;i++)sp(i/5*TAU+PI/10,.05,.085,.07,rO,0,.045,.035);disc(rO*.93,rO,face+.004,V(RIM,RM));}
  else if(w.style==='split'){for(let i=0;i<5;i++){const a=i/5*TAU;sp(a-.05,.015,.019,.07,rO,-.1,.032,.03);sp(a+.05,.015,.019,.07,rO,.1,.032,.03);}lugs=5;}
  else if(w.style==='cap'||w.style==='steel'){
    /* a revolved profile [r, z] in front of the face */
    const rev=(P,m)=>{for(let k=0;k<P.length-1;k++){const [r0,z0]=P[k],[r1,z1]=P[k+1];
      for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU,C=Math.cos,S=Math.sin;mb.quad([C(a)*r1,S(a)*r1,face+z1],[C(b)*r1,S(b)*r1,face+z1],[C(b)*r0,S(b)*r0,face+z0],[C(a)*r0,S(a)*r0,face+z0],m[0],m[1],m[2]);}}};
    const hole=(c,r,z)=>{for(let k=0;k<12;k++){const p=k/12*TAU,q=(k+1)/12*TAU;mb.tri([c[0],c[1],face+z],[c[0]+Math.cos(q)*r,c[1]+Math.sin(q)*r,face+z],[c[0]+Math.cos(p)*r,c[1]+Math.sin(p)*r,face+z],[.008,.008,.009],0,MAT.COL);}};
    if(w.style==='cap'){
      /* a plastic wheel cover: a shallow dome to the lip, a ring of slots, a plain centre */
      rev([[rimR*1.03,dish+.004],[rO*.86,.042],[rO*.5,.06],[.06,.068],[0,.07]],V(RIM,MAT.RIM));
      for(let i=0;i<10;i++){const a=i/10*TAU,b=a+TAU/10*.55,r0=rO*.6,r1=rO*.8,z=t=>.06+(.042-.06)*(t-rO*.5)/(rO*.36)+.0015,C=Math.cos,S=Math.sin;
        mb.quad([C(a)*r0,S(a)*r0,face+z(r0)],[C(a)*r1,S(a)*r1,face+z(r1)],[C(b)*r1,S(b)*r1,face+z(r1)],[C(b)*r0,S(b)*r0,face+z(r0)],[.008,.008,.009],0,MAT.COL);}}
    else{
      /* a pressed steel wheel: a raised centre, six round vents, and a small chrome dog-dish cap over the nuts */
      rev([[rimR*1.03,dish+.004],[rO*.9,.006],[rO*.56,.006],[rO*.48,.022],[.06,.022]],V(RIM,MAT.RIM));
      for(let i=0;i<6;i++){const a=i/6*TAU+PI/6;hole([Math.cos(a)*rO*.73,Math.sin(a)*rO*.73],rO*.08,.0075);}
      rev([[rO*.45,.026],[rO*.38,.05],[rO*.2,.066],[0,.07]],MM.CHROME);}
    lugs=0;hubR=.05;}
  /* hub, cap, lug nuts (or the centre-lock nut) */
  tubeAB(mb,[0,0,face-.01],[0,0,face+.05],hubR,16,V(RIM,RM));
  if(lugs)for(let i=0;i<lugs;i++){const a=i/lugs*TAU+.3;tubeAB(mb,[Math.cos(a)*lugR,Math.sin(a)*lugR,face+.04],[Math.cos(a)*lugR,Math.sin(a)*lugR,face+.062],.01,6,MM.CHROME);}
  if(w.style==='race'){tubeAB(mb,[0,0,face+.04],[0,0,face+.085],.05,6,V([1,1,1],MAT.CALIPER));tubeAB(mb,[0,0,face+.085],[0,0,face+.095],.02,8,MM.CHROME);}
  else tubeAB(mb,[0,0,face+.05],[0,0,face+.056],hubR*.55,14,w.style==='bead'?V([.02,.02,.022],MAT.METAL):MM.CHROME);
  mb.smooth(30);
  const m=mb.build();m.tris=mb.p.length/9;WHEELMESH[key]=m;return m;
}

