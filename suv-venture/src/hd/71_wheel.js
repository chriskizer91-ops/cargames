/* =====================================================================================
   THE STUDIO'S WHEEL: the stock truck's 245/65R17 all-season on the factory six-spoke, modelled for a close
   look. Same axes as the game's wheel (axle along z, the outer face at +z, spin about z), same size.
   - The tyre: a carcass turned in 192 steps, then real tread blocks on it: four ribs between three
     circumferential grooves, slanted lateral grooves, a sipe across every block, shoulder blocks that run
     down onto the sidewall, a rim protector rib and two fine rings on the sidewall. No lettering.
   - The wheel: a turned barrel (bead seats, drop centre, a machined outer lip), six drafted spokes dished
     out to the lip, a hub face, six chrome lug nuts on a 135 mm circle, a plain chrome cap, a valve stem.
   - The brake behind it: a vented rotor (two plates, forty vanes, a hat), a single-piston floating caliper
     with its bracket, slide-pin boots and bleeder, and the dust shield.
   ===================================================================================== */
function hdWheel(w,b){
  const out=new MB(),R=w.R,W=w.W,hw=W/2,rimR=w.rim*.0254/2,base=R-.009;
  /* ---------- the tyre carcass ---------- */
  hdPart(out,mb=>{
    const half=[[rimR+.004,.094],[rimR+.016,.099],[rimR+.03,.107],[rimR+.045,.114],[rimR+.054,.1195],[rimR+.06,.1215],[rimR+.066,.1205],[rimR+.072,.118],
      [rimR+.085,.1195],[.30,.1225],[.318,.1222],[.3185,.1232],[.321,.1232],[.3215,.1222],[.326,.1218],[.3265,.1228],[.329,.1228],[.3295,.1216],
      [.345,.118],[.358,.112],[.366,.106],[base,.099]];
    const prof=[...half.map(([r,z])=>[r,-z]),...half.slice().reverse().map(([r,z])=>[r,z])];
    /* (the walls are their own material: the tread's grain is coarser) */
    const wall=prof.filter(q=>q[0]<base-1e-4);
    hdRev(mb,[...half.map(([r,z])=>[r,z])],192,HC.WALL,0,TAU,true);
    hdRev(mb,[...half.map(([r,z])=>[r,-z])],192,HC.WALL);
    hdRev(mb,[[base,-.099],[base,.099]],192,HC.TREAD);
  },28);
  /* ---------- the tread blocks ---------- */
  hdPart(out,mb=>{
    const NP=60,pa=TAU/NP,pl=pa*R;
    const P3=(s,z,r)=>{const a=s/R;return [Math.cos(a)*r,Math.sin(a)*r,z];};
    const rTop=z=>{const a=Math.abs(z);return R-Math.max(0,a-.09)*.55-Math.max(0,a-.1)*.9;};
    /* one block: a four-cornered outline in (s, z) (s along the tread in metres), from the groove floor up to the top */
    const blk=(q,depth=.009)=>{const ns=3,nz=2;
      /* the top: a small grid between the outline's two long sides (q0-q1 and q3-q2) */
      const L=(t,u)=>{const a=[q[0][0]+(q[1][0]-q[0][0])*t,q[0][1]+(q[1][1]-q[0][1])*t],b=[q[3][0]+(q[2][0]-q[3][0])*t,q[3][1]+(q[2][1]-q[3][1])*t];return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];};
      for(let i=0;i<ns;i++)for(let j=0;j<nz;j++){const p=[L(i/ns,j/nz),L((i+1)/ns,j/nz),L((i+1)/ns,(j+1)/nz),L(i/ns,(j+1)/nz)];
        mb.quad(...p.map(v=>P3(v[0],v[1],rTop(v[1]))),HC.TREAD[0],0,HC.TREAD[2]);}
      /* the walls, each edge in a few steps so they follow the curve */
      for(let k=0;k<4;k++){const a=q[k],c=q[(k+1)%4],n=k%2===0?ns:nz;
        for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,u=[a[0]+(c[0]-a[0])*t0,a[1]+(c[1]-a[1])*t0],v=[a[0]+(c[0]-a[0])*t1,a[1]+(c[1]-a[1])*t1];
          mb.quad(P3(u[0],u[1],rTop(u[1])-depth-.001),P3(v[0],v[1],rTop(v[1])-depth-.001),P3(v[0],v[1],rTop(v[1])),P3(u[0],u[1],rTop(u[1])),HC.TREAD[0],0,HC.TREAD[2]);}}};
    for(const side of [1,-1]){const ph=side>0?0:.27;
      for(let i=0;i<NP;i++){const s0=(i+ph)*pl;
        /* shoulder rib: a block cut by a lateral groove every pitch and a sipe across its middle; its outer end runs
           down the shoulder onto the sidewall */
        const z0=side*.057,z1=side*.106,g=.21*pl,sp=.0016,mid=s0+(pl-g)*.48;
        const sh=(a,b2)=>{blk([[a,z0],[b2,z0],[b2+.002,z1],[a+.002,z1]].map(([s,z])=>[s,z]));
          /* the shoulder's drop: a sloped face from the block's outer edge down the carcass */
          const zz=side*.106,zo=side*.112;mb.quad(P3(a+.002,zz,rTop(zz)),P3(b2+.002,zz,rTop(zz)),P3(b2+.004,zo,R-.03),P3(a+.004,zo,R-.03),HC.TREAD[0],0,HC.TREAD[2]);};
        sh(s0,mid-sp/2);sh(mid+sp/2,s0+pl-g);
        /* inner rib: slanted blocks, staggered half a pitch from the shoulder, a sipe across each */
        const zi0=side*.008,zi1=side*.0465,o=s0+pl*.5,k=.32,gi=.17*pl,cut=(o+(pl-gi)*.5);
        const sl=z=>(Math.abs(z)-.008)*k*side;
        blk([[o+sl(zi0),zi0],[cut-sp/2+sl(zi0),zi0],[cut-sp/2+sl(zi1),zi1],[o+sl(zi1),zi1]]);
        blk([[cut+sp/2+sl(zi0),zi0],[o+pl-gi+sl(zi0),zi0],[o+pl-gi+sl(zi1),zi1],[cut+sp/2+sl(zi1),zi1]]);}}
  },20);
  /* ---------- the wheel ---------- */
  const RIMC=SV([1,1,1],MAT.RIM),face=.058;
  hdPart(out,mb=>{
    /* the barrel, outboard flange to inboard flange (its outside is under the tyre) */
    hdRev(mb,[[rimR+.004,.086],[rimR+.014,.094],[rimR+.019,.098],[rimR+.0195,.1015],[rimR+.016,.104]],128,HC.BRUSH);
    hdRev(mb,[[rimR+.016,.104],[rimR+.004,.1045],[rimR-.006,.1025],[rimR-.012,.098]],128,HC.BRUSH);
    hdRev(mb,[[rimR-.012,.098],[rimR-.012,.078],[rimR-.009,.062],[rimR-.032,.04],[rimR-.034,-.03],[rimR-.012,-.052],[rimR-.009,-.086],[rimR+.004,-.097],[rimR+.016,-.101]],128,HC.CAST);
  },40);
  /* six spokes: lofted along the radius, dished from the hub out to the lip, drafted sides, a soft crown */
  hdPart(out,mb=>{
    const r0=.07,r1=rimR-.011,n=18;
    for(let k=0;k<6;k++){const a=k/6*TAU+PI/6,ca=Math.cos(a),sa=Math.sin(a),tx=-sa,ty=ca;const rings=[];
      for(let i=0;i<=n;i++){const t=i/n,r=r0+(r1-r0)*t,zf=face+(.094-face)*Math.pow(t,1.35),wt=.044+.03*Math.pow(t,1.2)+.012*sm01((t-.82)/.18),d=.03;
        const sec=[[-wt/2-.006,zf-d],[-wt/2-.002,zf-.006],[-wt/2+.002,zf-.0012],[-wt/4,zf+.0012],[0,zf+.0016],[wt/4,zf+.0012],[wt/2-.002,zf-.0012],[wt/2+.002,zf-.006],[wt/2+.006,zf-d]];
        rings.push(sec.map(([u,z])=>[ca*r+tx*u,sa*r+ty*u,z]));}
      hdLoft(mb,rings,RIMC,false);}
  },32,[0,0,-.2]);
  /* the hub face: a raised centre, chamfered into the spokes */
  hdPart(out,mb=>{hdRev(mb,[[0,face+.0085],[.048,face+.0085],[.052,face+.0072],[.078,face+.001],[.09,face-.004],[.094,face-.02]],96,RIMC,0,TAU,true);},30);
  /* lug nuts on a 135 mm circle, each in a dark seat, and a plain domed chrome cap */
  for(let k=0;k<6;k++){const a=k/6*TAU+PI/6,cx=Math.cos(a)*.0675,cy=Math.sin(a)*.0675,M=M4T(cx,cy,0);
    hdPart(out,mb=>{hdRev(mb,[[.0175,face+.0064],[.0125,face+.0088],[.0116,face+.0091]],24,HC.CAST);},30,null,M);
    hdPart(out,mb=>{const n=6,top=face+.026;
      /* a hex body with a coned seat under it and a rounded crown */
      const hx=[];for(let i=0;i<n;i++){const t=i/n*TAU+PI/6;hx.push([Math.cos(t)*.0122,Math.sin(t)*.0122]);}
      const rings=[hx.map(p=>[p[0]*.86,p[1]*.86,face+.009]),hx.map(p=>[p[0],p[1],face+.012]),hx.map(p=>[p[0],p[1],top-.004]),hx.map(p=>[p[0]*.82,p[1]*.82,top])];
      hdLoft(mb,rings,HC.LUG,true);hdCap(mb,rings[3],HC.LUG,true);},20,null,M);}
  hdPart(out,mb=>{hdRev(mb,[[.044,face+.0085],[.0435,face+.016],[.04,face+.021],[.03,face+.0245],[.015,face+.026],[0,face+.0264]],64,MM.CHROME,0,TAU,true);},50);
  /* the valve stem, between two spokes near the lip */
  {const a=0,r=rimR-.016,p0=[Math.cos(a)*r,Math.sin(a)*r,.09],p1=[Math.cos(a)*(r-.006),Math.sin(a)*(r-.006),.113];
    hdPart(out,mb=>{hdCyl(mb,p0,p1,.0048,.0042,12,SV([.02,.02,.022],MAT.RUBBER));},40);
    hdPart(out,mb=>{hdCyl(mb,p1,V3.add(p1,V3.mul(V3.norm(V3.sub(p1,p0)),.011)),.0036,.0034,12,MM.CHROME);},40);}
  /* ---------- the brake ---------- */
  const zc=-.022,ri=.098,ro=.160,cal=SV([1,1,1],MAT.CALIPER);
  hdPart(out,mb=>{for(const [z0,z1] of [[zc+.006,zc+.014],[zc-.014,zc-.006]]){
      hdRev(mb,[[ri,z1],[ro-.0015,z1],[ro,z1-.0015],[ro,z0+.0015],[ro-.0015,z0],[ri,z0],[ri,z1]],128,HC.ROTORF);}},35);
  hdPart(out,mb=>{for(let k=0;k<40;k++){const a=(k+.5)/40*TAU,c=Math.cos(a),s=Math.sin(a),tx=-s*.0022,ty=c*.0022,r0=ri+.004,r1=ro-.002;
      const q=[[c*r0+tx,s*r0+ty],[c*r1+tx,s*r1+ty],[c*r1-tx,s*r1-ty],[c*r0-tx,s*r0-ty]];hdExtrude(mb,q,zc-.006,zc+.006,HC.CAST);}},20);
  /* the hat: the rotor's centre, out to the hub's mounting face */
  hdPart(out,mb=>{hdRev(mb,[[ri+.002,zc+.014],[.088,zc+.016],[.085,.004],[.04,.004],[.04,-.002]],96,HC.ROTORF,0,TAU,true);},30);
  /* the dust shield behind */
  hdPart(out,mb=>{hdRev(mb,[[.06,zc-.05],[.17,zc-.044],[.182,zc-.03],[.184,zc-.022]],96,HC.CAST);},35);
  /* the caliper: a floating single-piston body over the top-rear of the rotor */
  const ca0=PI*.56,ca1=PI*.84,cr=.152;
  hdPart(out,mb=>{const path=[],n=14;for(let i=0;i<=n;i++){const a=ca0+(ca1-ca0)*i/n;path.push([Math.cos(a)*cr,Math.sin(a)*cr,zc-.004]);}
    /* the body's section across its arc: radial (x) and along the axle (y), a rounded box */
    const sec=hdRRect(.03,.034,.011,5).map(([x,y])=>[y,x]);hdSweep(mb,path,sec,cal,[0,0,1],true,true);},40);
  /* the piston's housing on the inboard side, and the bridge's ribs */
  {const am=(ca0+ca1)/2,c=Math.cos(am),s=Math.sin(am);
    hdPart(out,mb=>{hdCyl(mb,[c*.15,s*.15,zc-.03],[c*.15,s*.15,zc-.062],.03,.027,28,cal);},40);
    for(const t of [.2,.5,.8]){const a=ca0+(ca1-ca0)*t;hdPart(out,mb=>{hdRBox(mb,[Math.cos(a)*.184,Math.sin(a)*.184,zc-.004],[.006,.006,.03],.004,cal,2);},40,null);}
    /* the slide pins' rubber boots and the bracket's ends, and the bleeder */
    for(const a of [ca0-.06,ca1+.06]){const c2=Math.cos(a),s2=Math.sin(a);
      hdPart(out,mb=>{hdCyl(mb,[c2*.146,s2*.146,zc-.03],[c2*.146,s2*.146,zc-.052],.009,.007,14,SV([.02,.02,.022],MAT.RUBBER));},40);
      hdPart(out,mb=>{hdRBox(mb,[c2*.146,s2*.146,zc-.012],[.016,.016,.018],.005,HC.CAST,2);},40);}
    hdPart(out,mb=>{hdCyl(mb,[c*.18,s*.18,zc-.05],[c*.196,s*.196,zc-.055],.004,.004,10,HC.BOLT);},40);}
  return out;
}
