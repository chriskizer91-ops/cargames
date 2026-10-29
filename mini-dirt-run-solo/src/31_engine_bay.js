/* =====================================================================================
   UNDER THE HOOD — the engine bay, for the garage only. buildSUV has already split the hood
   off the body and kept apart the floor and wheel wells under it. The bay is built the first
   time a hood opens and is drawn only while it is open: inner fenders and wheel tubs, the
   firewall, the radiator and the bay's furniture, and the engine the build actually has. Every
   upgrade in the build's engine recipe shows: a cone filter or an airbox, cast manifolds or
   headers, turbos with their charge pipes and intercooler, a blower and its hat, individual
   throttle bodies, nitrous solenoids, electric fans, a strut brace, a catch can.
   ===================================================================================== */
/* each engine's colours: the block, the valve covers, and whether the covers are polished */
const BAYLOOK={
  v46:{block:'#2b2c2f',cover:'#1b1c1e'},
  bb74:{block:'#b8401c',cover:'#c9ccd1',polish:1},
  tt35:{block:'#85888d',cover:'#1b1c1e'},
  i40:{block:'#2b2c2f',cover:'#7b7f86'},
  v62:{block:'#2b2c2f',cover:'#a3201c'},
  fp52:{block:'#85888d',cover:'#b0201c'},
  i525:{block:'#85888d',cover:'#232528'},
  v57:{block:'#2b2c2f',cover:'#1b1c1e'},
  bb72:{block:'#2b4796',cover:'#c9ccd1',polish:1},
  i18t:{block:'#85888d',cover:'#b0201c'}
};
const bm=h=>V(lin(h),MAT.METAL);
/* move what a mesh builder holds by a rigid transform */
function xformMB(mb,M){for(let i=0;i<mb.p.length;i+=3){const p=M4.xform(M,[mb.p[i],mb.p[i+1],mb.p[i+2]]),n=mb.n,x=n[i],y=n[i+1],z=n[i+2];
  mb.p[i]=p[0];mb.p[i+1]=p[1];mb.p[i+2]=p[2];n[i]=M[0]*x+M[4]*y+M[8]*z;n[i+1]=M[1]*x+M[5]*y+M[9]*z;n[i+2]=M[2]*x+M[6]*y+M[10]*z;}}
/* the engine, built round its crank: +x is the front (the belt end), +y up, the crank at y=0. An inline
   engine breathes in on its left (-z) and out on its right. Returns where its throttle body, turbos and
   thermostat are, for the bay to plumb to. */
function bayEngine(mb,r,mechFan){
  const E=DE_ENGINES[r.engine],BL=BAYLOOK[r.engine]||BAYLOOK.v46,lay=E.layout,v=lay[0]==='V',n=+(lay.match(/\d+/)||[4])[0],np=v?n/2:n;
  const len=np*.095+.14,hx=len/2,ang=lay==='V6'?PI/3:PI/2;
  const BLK=bm(BL.block),HEAD=bm('#74777c'),COV=bm(BL.polish?'#8d9096':BL.cover),IRON=bm('#4a3f36'),DARK=bm('#161618'),ALU=bm('#7f8288'),PIPE=bm('#8f8b84');
  const hdr=['headers','straight','side'].includes(r.exhaust),fi=r.power==='roots'?'roots':r.power==='twin'?'twin':(E.fi||'none'),big=r.power==='bigturbo';
  const itb=v&&lay==='V8F'&&r.intake>=2&&fi==='none',xs=k=>-hx+.07+(k+.5)*(len-.14)/np;
  const I={len,hx,v,fi,itb,top:0,topCore:0,tb:null,turbos:[],cool:[hx+.02,.26,0]};
  /* the bottom end, the front cover, pulleys and belt, the alternator, the bellhousing */
  abox(mb,[0,-.13,0],[hx-.02,.07,v?.19:.13],DARK);
  abox(mb,[hx+.015,.1,0],[.015,.17,v?.17:.12],BLK);
  tubeAB(mb,[hx+.03,-.03,0],[hx+.075,-.03,0],.085,16,DARK);
  tubeAB(mb,[hx+.03,.19,0],[hx+.07,.19,0],.06,14,ALU);
  obox(mb,[hx+.055,.08,0],[1,0,0],[0,1,0],[0,0,1],[.012,.12,.05],DARK);
  tubeAB(mb,[hx-.05,v?.33:.08,-.21],[hx+.06,v?.33:.08,-.21],.062,12,ALU);
  tubeAB(mb,[-hx,.03,0],[-hx-.22,0,0],.21,16,ALU,true,.13);
  if(mechFan)for(let k=0;k<5;k++){const a=k/5*TAU,c=Math.cos(a),s=Math.sin(a);obox(mb,[hx+.14,.19+c*.11,s*.11],[1,0,0],[0,c,s],[0,-s,c],[.006,.1,.04],DARK);}
  /* exhaust: cast logs or a header per cylinder; with turbos, everything feeds the turbine */
  const turbo=(c,s,r0)=>{
    ball(mb,c,r0*1.1,12,IRON);tubeAB(mb,[c[0]-.04,c[1],c[2]],[c[0]+.03,c[1],c[2]],r0,14,IRON);
    tubeAB(mb,[c[0]+.03,c[1],c[2]],[c[0]+.07,c[1],c[2]],r0*.45,10,DARK);
    const cc=[c[0]+.11,c[1],c[2]];ball(mb,cc,r0,12,ALU);tubeAB(mb,[cc[0]-.04,cc[1],cc[2]],[cc[0]+.03,cc[1],cc[2]],r0*1.02,16,ALU);
    tubeAB(mb,[c[0],c[1]-r0,c[2]],[c[0]-.03,-.24,c[2]*.9],.042,10,IRON);
    I.turbos.push({inlet:[cc[0]+.03,cc[1],cc[2]],outlet:[cc[0],cc[1]+r0,cc[2]],s,r:r0});};
  const exhaustBank=(s,port,out)=>{
    const tz=s*(v?.36:.3),tc=[-hx*.15,v?.02:.14,tz],col=fi==='twin'||(fi==='turbo'&&s>0)?tc:[-hx+.06,-.16,s*(v?.3:.24)];
    if(hdr)for(let k=0;k<np;k++){const p=port(k),q=V3.add(p,V3.mul(out,.07));
      tubePath(mb,[p,q,[p[0]*.85+col[0]*.15,(q[1]+col[1])/2,(q[2]+col[2])/2+s*.03],[col[0]+(k-(np-1)/2)*.025,col[1]+.05,col[2]]],.019,8,PIPE);}
    else{const a=V3.add(port(0),V3.mul(out,.05)),b=V3.add(port(np-1),V3.mul(out,.05));tubeAB(mb,a,b,.035,10,IRON);
      for(let k=0;k<np;k++)tubeAB(mb,port(k),V3.add(port(k),V3.mul(out,.05)),.026,8,IRON);
      tubeAB(mb,a[0]<b[0]?a:b,[col[0],col[1]+.05,col[2]],.034,10,IRON);}
    if(col===tc)turbo(tc,s,(big?.1:.075));
    else tubeAB(mb,[col[0],col[1]+.05,col[2]],[col[0]-.05,-.24,col[2]],.034,10,hdr?PIPE:IRON);};
  if(!v){
    abox(mb,[0,.1,0],[hx,.16,.15],BLK);abox(mb,[0,.31,0],[hx-.02,.05,.14],HEAD);
    rbox(mb,[0,.39,0],[1,0,0],[0,1,0],[0,0,1],[hx-.04,.045,.115],COV,.3,16,6);
    for(let k=0;k<np;k++)abox(mb,[xs(k),.445,0],[.022,.018,.028],DARK);
    for(let k=0;k<np;k++)tubePath(mb,[[xs(k),.33,-.13],[xs(k),.38,-.22],[xs(k),.33,-.29]],.022,8,ALU);
    rbox(mb,[0,.31,-.33],[1,0,0],[0,1,0],[0,0,1],[hx-.04,.06,.05],ALU,.35,14,6);
    tubeAB(mb,[hx-.06,.31,-.33],[hx+.04,.31,-.33],.042,14,ALU);I.tb=[hx+.04,.31,-.33];
    exhaustBank(1,k=>[xs(k),.27,.155],[0,0,1]);I.top=I.topCore=.47;
  }else{
    abox(mb,[0,.02,0],[hx,.1,.2],BLK);
    for(const s of [1,-1]){const a=ang/2,d=[0,Math.cos(a),s*Math.sin(a)],az=[0,-d[2],d[1]],out=V3.mul(az,s),P=(t,o)=>V3.add(V3.mul(d,t),V3.mul(out,o));
      obox(mb,P(.15,0),[1,0,0],d,az,[hx,.1,.12],BLK);obox(mb,P(.29,0),[1,0,0],d,az,[hx-.02,.04,.115],HEAD);
      rbox(mb,P(.37,0),[1,0,0],d,az,[hx-.04,.04,.1],COV,.3,16,6);
      exhaustBank(s,k=>{const q=P(.27,.12);return [xs(k)+s*.024,q[1],q[2]];},out);
      I.top=Math.max(I.top,P(.41,-.1)[1]);}
    if(itb){for(const s of [1,-1])for(let k=0;k<np;k++){const x=xs(k)+s*.024;tubeAB(mb,[x,.3,s*.1],[x,.47,s*.12],.026,10,bm('#9a9da3'),false,.042);}
      I.top=I.topCore=.48;}
    else{rbox(mb,[0,.34,0],[1,0,0],[0,1,0],[0,0,1],[hx-.06,.06,.12],fi==='roots'?ALU:bm(BL.polish?'#8d9096':'#2a2b2e'),.35,14,6);I.topCore=.4;
      if(fi==='roots'){const yb=.5;rbox(mb,[0,yb,0],[1,0,0],[0,1,0],[0,0,1],[hx-.1,.1,.13],bm('#8d9096'),.25,16,8);
        for(let k=0;k<6;k++)obox(mb,[-hx+.14+k*(len-.28)/5,yb,0],[1,0,0],[0,1,0],[0,0,1],[.006,.105,.135],ALU);
        tubeAB(mb,[hx-.1,yb,0],[hx+.06,yb,0],.05,12,ALU);tubeAB(mb,[hx+.06,yb,0],[hx+.1,yb,0],.075,16,DARK);
        obox(mb,[hx+.085,(yb-.03)/2,0],[1,0,0],[0,1,0],[0,0,1],[.01,(yb+.03)/2,.04],DARK);
        if(r.hat==='bug'){const hy=yb+.2,POL=bm('#b9bcc2');rbox(mb,[-.02,hy,0],[1,0,0],[0,1,0],[0,0,1],[.2,.09,.17],POL,.25,16,8);
          for(const z of [-.11,0,.11]){tubeAB(mb,[.06,hy+.03,z],[.25,hy+.06,z],.05,14,POL,false,.058);tubeAB(mb,[.245,hy+.06,z],[.25,hy+.06,z],.05,14,V([.01,.01,.012],MAT.COL));}
          for(const s of [1,-1])tubeAB(mb,[-.1,yb+.1,s*.15],[-.1,yb+.14,s*.15],.025,10,bm('#c8241c'));I.top=hy+.12;}
        else{rbox(mb,[0,yb+.17,0],[1,0,0],[0,1,0],[0,0,1],[.16,.07,.12],bm('#9a9da3'),.3,14,6);
          obox(mb,[.161,yb+.17,0],[1,0,0],[0,1,0],[0,0,1],[.003,.05,.1],V([0,0,0],MAT.MESH));I.top=yb+.24;}
        I.out=[hx-.06,.17,yb-.1];}
      else{tubeAB(mb,[hx-.08,.36,0],[hx+.04,.36,0],.045,14,ALU);I.tb=[hx+.04,.36,0];I.top=Math.max(I.top,.4);}}
  }
  /* nitrous: a blue and a red solenoid by the intake, their lines running back */
  if(r.nos){const t=I.tb||[0,I.topCore+.02,0];
    for(const [dz,c] of [[-.07,'#2456a8'],[.07,'#c8241c']]){const p=[t[0]-.1,t[1]+.07,t[2]+dz];tubeAB(mb,[p[0],p[1]-.035,p[2]],[p[0],p[1]+.035,p[2]],.022,10,bm(c));
      tubePath(mb,[[p[0],p[1]+.035,p[2]],[p[0]-.12,p[1]+.07,p[2]],[-hx-.1,p[1]+.03,p[2]*1.6]],.007,6,bm('#5a5c61'));}}
  return I;
}
function buildBay(b,D){
  const lk=b.look,r=ENGINE_OF[b.id]||ENGINE_OF.stock,X=D.X,topY=D.topY,H=D.hood,hz=H.hz;
  const st=new MB(),en=new MB(),ln=new MB(),PAINT=MM.PAINT,DARK=bm('#161618'),HOSE=V(lin('#121212'),MAT.RUBBER),ALU=bm('#7f8288'),PIPE=bm('#8d9096');
  const uF=H.u0+.09,uR=H.u1-.02,edge=u=>topY(u,hz(u)),yFloor=D.sill((uF+uR)/2)+.02,up=r.tune>0||r.power!=='none';
  /* ---- the engine, set in the bay: back against the firewall, as low as its sump allows, under the hood ---- */
  const I=bayEngine(en,r,!up),trans=r.mount==='trans';
  const uc=trans?clamp((uF+.5+uR-.34)/2,uF+.42,uR-.3):Math.max(uF+.27,uR-.12-I.len)+I.hx;
  let hm=9;for(let u=trans?uc-.35:uc-I.hx;u<=(trans?uc+.32:uc+I.hx+.1);u+=.05)hm=Math.min(hm,topY(u,.22));
  const yC=Math.max(yFloor+.12,Math.min(D.arch.cy+.2,hm-I.topCore-.03));
  const EM=trans?M4.basis([X(uc),yC,.06],[0,0,1],[0,1,0],[-1,0,0]):M4.basis([X(uc),yC,0],[1,0,0],[0,1,0],[0,0,1]);
  xformMB(en,EM);const E=p=>M4.xform(EM,p);
  /* a splash shield between the radiator and the engine (a front-mid engine leaves a lot of bay ahead of it) */
  {const ue=trans?uc-.42:uc-I.hx-.14,y=Math.max(yFloor,yC-.17),z=lk.track/2-lk.tyre.W/2-.07;
    if(ue>uF+.2)st.quad([X(uF+.12),y,-z],[X(uF+.12),y,z],[X(ue),y,z],[X(ue),y,-z],MM.UNDER[0],0,MM.UNDER[2]);}
  /* ---- inner fenders and wheel tubs, strut towers on the independent fronts ---- */
  const tw=lk.track/2,zin=tw-lk.tyre.W/2-.05,N=28,ytub=u=>{const a=archY(D,u);return a>0?Math.min(edge(u)-.03,a+.04):-1;};
  for(const s of [1,-1]){
    for(let k=0;k<N;k++){const ua=uF+(uR-uF)*k/N,ub=uF+(uR-uF)*(k+1)/N,za=s*(hz(ua)-.005),zb=s*(hz(ub)-.005);
      const la=Math.max(yFloor,ytub(ua)),lb=Math.max(yFloor,ytub(ub));
      st.quad([X(ua),la,za],[X(ub),lb,zb],[X(ub),edge(ub)-.03,zb],[X(ua),edge(ua)-.03,za],PAINT[0],0,PAINT[2]);
      const ta=ytub(ua),tb=ytub(ub);if(ta>yFloor&&tb>yFloor){
        st.quad([X(ua),yFloor,s*zin],[X(ub),yFloor,s*zin],[X(ub),tb,s*zin],[X(ua),ta,s*zin],MM.UNDER[0],0,MM.UNDER[2]);
        st.quad([X(ua),ta,s*zin],[X(ub),tb,s*zin],[X(ub),tb,zb],[X(ua),ta,za],MM.UNDER[0],0,MM.UNDER[2]);}}
    if(lk.susp!=='solid'){const u=D.uFa,z=s*(hz(u)-.13),y0=Math.max(yFloor,ytub(u)),y1=edge(u)-.07;
      tubeAB(st,[X(u),y0,z],[X(u),y1,z],.085,14,PAINT);tubeAB(st,[X(u),y1,z],[X(u),y1+.01,z],.05,12,DARK);tubeAB(st,[X(u),y1,z],[X(u),y1+.035,z],.014,6,ALU);
      if(r.tune>0)tubeAB(st,[X(u),y1+.02,z],[X(u),y1+.02,-z*.98],.018,8,bm('#c8241c'));}}
  /* ---- the firewall, its insulation, the cowl tray ---- */
  {const z=hz(uR)-.005,ym=yFloor+(edge(uR)-yFloor)*.45,x=X(uR),c=bm('#1d1d20');
    st.quad([x,yFloor,-z],[x,yFloor,z],[x,ym,z],[x,ym,-z],PAINT[0],0,PAINT[2]);
    st.quad([x,ym,-z],[x,ym,z],[x,edge(uR)-.02,z],[x,edge(uR)-.02,-z],c[0],0,MAT.FABRIC);
    const y=edge(uR)-.02;st.quad([x,y,-z],[x,y,z],[X(H.u1+.03),y,z],[X(H.u1+.03),y,-z],c[0],0,MAT.FABRIC);}
  /* ---- the front: support bar, radiator, shroud and fans ---- */
  const yrT=edge(uF)-.1,yrB=Math.max(yFloor+.08,yrT-.45),yr=(yrT+yrB)/2,hr=(yrT-yrB)/2,zr=Math.min(.6,hz(uF)-.1);
  abox(st,[X(uF),edge(uF)-.05,0],[.03,.025,hz(uF)-.02],PAINT);
  abox(st,[X(uF+.05),yr,0],[.025,hr,zr],V([0,0,0],MAT.MESH));
  for(const s of [1,-1])abox(st,[X(uF+.05),yr,s*(zr+.02)],[.03,hr+.01,.02],DARK);
  tubeAB(st,[X(uF+.05),yrT+.01,zr*.7],[X(uF+.05),yrT+.04,zr*.7],.022,10,MM.CHROME);
  abox(st,[X(uF+.1),yr,0],[.012,hr,zr],DARK);
  if(up)for(const s of [1,-1]){const c=[X(uF+.115),yr,s*zr*.5],R=Math.min(hr,zr*.5)*.9;tubeAB(st,[c[0],c[1],c[2]],[c[0]-.03,c[1],c[2]],R,20,bm('#0c0c0d'));tubeAB(st,[c[0]-.03,c[1],c[2]],[c[0]-.05,c[1],c[2]],R*.25,12,ALU);}
  /* the radiator hoses to the thermostat and the water pump */
  {const c=E(I.cool),w=E([I.hx+.03,.12,-.05]),yu=Math.min(yrT-.04,c[1]+.04);
    tubePath(en,[[X(uF+.12),yrT-.04,zr*.6],[X(uF+.18),yu,zr*.6],[c[0]+.1,yu,zr*.35],c],.022,8,HOSE);
    tubePath(en,[[X(uF+.12),yrB+.05,-zr*.6],[X(uF+.18),yrB+.05,-zr*.6],[w[0]+.1,yrB+.05,-zr*.35],w],.024,8,HOSE);}
  /* ---- the furniture: battery, coolant tank, brake booster, fuse box ---- */
  {const u=uF+.22,z=-(hz(u)-.17),yb=Math.max(yFloor+.2,edge(u)-.36);abox(st,[X(u),yb+.09,z],[.1,.09,.075],DARK);
    tubeAB(st,[X(u)+.05,yb+.18,z+.04],[X(u)+.05,yb+.21,z+.04],.016,8,bm('#c8241c'));tubeAB(st,[X(u)-.05,yb+.18,z+.04],[X(u)-.05,yb+.21,z+.04],.016,8,DARK);}
  {const u=uR-.12,z=-(hz(u)-.24),y=edge(u)-.2;tubeAB(st,[X(uR),y,z],[X(uR)+.09,y,z],.13,18,DARK);
    tubeAB(st,[X(uR)+.09,y+.02,z],[X(uR)+.27,y+.02,z],.035,10,ALU);abox(st,[X(uR)+.2,y+.08,z],[.05,.03,.04],V(lin('#a29e94'),MAT.COL));}
  {const u=uR-.12,z=hz(u)-.2;abox(st,[X(u),edge(u)-.13,z],[.08,.05,.1],DARK);}
  {const u=uF+.5,z=hz(u)-.15;abox(st,[X(u),edge(u)-.2,z],[.07,.07,.055],V(lin('#a29e94'),MAT.COL));tubeAB(st,[X(u),edge(u)-.13,z],[X(u),edge(u)-.11,z],.025,10,DARK);}
  if(r.tune>0){const u=uR-.3,z=hz(u)-.32,y=edge(u)-.2;tubeAB(st,[X(u),y-.06,z],[X(u),y+.06,z],.035,12,ALU);tubeAB(st,[X(u),y+.06,z],E([0,I.topCore-.02,.08]),.008,6,HOSE);}
  /* ---- breathing: an airbox, a cone filter, or the turbos' own; the intercooler and its piping ---- */
  const zA=hz(uF+.25)-.22,airIn=(from,dir)=>{
    if(r.intake>=1){const a=V3.add(from,V3.mul(dir,.06));tubeAB(en,from,a,.045,12,PIPE);tubeAB(en,a,V3.add(a,V3.mul(dir,.14)),.062,14,bm('#a8221c'),true,.045);}
    else{const box=[X(uF+.25),edge(uF+.25)-.17,zA];abox(st,box,[.12,.075,.11],DARK);tubePath(en,[from,V3.add(from,V3.mul(dir,.1)),[box[0]-.12,box[1],box[2]]],.045,10,HOSE);}};
  if(I.fi==='roots'||I.itb){}
  else if(I.turbos.length){
    const zic=zr+.05,yic=yrB+.02,xic=X(uF-.035);abox(st,[xic,yic,0],[.025,.07,zic+.04],V([0,0,0],MAT.MESH));
    for(const s of [1,-1])abox(st,[xic,yic,s*(zic+.04)],[.03,.08,.02],ALU);
    for(const t of I.turbos){const o=E(t.outlet),inl=E(t.inlet),s=t.s,z=s*zic,dir=V3.norm(V3.sub(inl,E([t.inlet[0]-.03,t.inlet[1],t.inlet[2]])));
      tubePath(en,[o,[o[0],o[1]+.07,o[2]],[o[0],o[1]+.07,z],[X(uF+.08),yic+.06,z],[xic,yic,z]],.033,10,PIPE);airIn(inl,dir);}
    if(I.tb){const tb=E(I.tb),s=I.turbos.length>1?0:-1,z=s*zic;
      if(s)tubePath(en,[[xic,yic,z],[X(uF+.08),yic+.06,z],[X(uF+.18),tb[1],z*.6],[tb[0]+.1,tb[1],tb[2]],tb],.036,10,PIPE);
      else tubePath(en,[[xic,yic+.07,0],[xic,yrT+.05,0],[X(uF+.12),yrT+.05,0],[tb[0]+.1,tb[1],tb[2]],tb],.036,10,PIPE);}}
  else if(I.tb){const tb=E(I.tb),dir=V3.norm(V3.sub(tb,E([I.tb[0]-.1,I.tb[1],I.tb[2]])));airIn(tb,dir);}
  /* ---- the underside of the hood: an insulation pad that lifts with it ---- */
  const hole=lk.engineOut&&I.out?(()=>{const a=E([I.out[0],I.out[2],0]),b=E([-I.out[0],I.out[2],0]);return [Math.max(a[0],b[0])+.03,Math.min(a[0],b[0])-.03,I.out[1]+.03];})():null;
  {const nz=8,c=bm('#1c1c1e');for(let u=H.u0+.06;u<H.u1-.04;u+=.08){const v=Math.min(u+.08,H.u1-.04);
    for(let k=0;k<nz;k++){if(hole&&X(u)>hole[1]&&X(v)<hole[0]&&Math.abs(-(hz(u)-.05)+2*(hz(u)-.05)*(k+.5)/nz)<hole[2])continue;const z0=-(hz(u)-.05)+2*(hz(u)-.05)*k/nz,z1=-(hz(u)-.05)+2*(hz(u)-.05)*(k+1)/nz,w0=-(hz(v)-.05)+2*(hz(v)-.05)*k/nz,w1=-(hz(v)-.05)+2*(hz(v)-.05)*(k+1)/nz;
      ln.quad([X(u),topY(u,z0)-.012,z0],[X(u),topY(u,z1)-.012,z1],[X(v),topY(v,w1)-.012,w1],[X(v),topY(v,w0)-.012,w0],c[0],0,MAT.FABRIC);}}}
  st.smooth(30);en.smooth(30);
  return {bay:st.build(),engine:en.build(),liner:ln.build(),pivot:[X(uc),yC,0],trans,hole,tris:(st.p.length+en.p.length+ln.p.length)/9};
}

