/* =====================================================================================
   THE BOLT-ONS: mirrors, door handles and roof rails, each taken off the game's body and modelled again.
   - Mirrors: a black sail on the door, a neck, a housing lofted from rounded sections (body colour over a black
     lower shell), a real mirror glass in a black bezel facing back, the turn repeater.
   - Door handles: a pocket cut into the door skin, dark inside, and a chrome pull standing proud of it.
   - Roof rails: a rounded rail on each side running down into moulded feet, a middle stanchion, and two aero
     crossbars with towers where they clamp on.
   ===================================================================================== */
/* drop triangles from a builder's arrays: pred(centroid, material, colour, vertices) */
function hdDrop(src,pred){const p=src.p,keep=[];
  for(let t=0;t<p.length/9;t++){const o=t*9,c=[(p[o]+p[o+3]+p[o+6])/3,(p[o+1]+p[o+4]+p[o+7])/3,(p[o+2]+p[o+5]+p[o+8])/3];
    if(!pred(c,src.m[t*3],src.c[t*12],[[p[o],p[o+1],p[o+2]],[p[o+3],p[o+4],p[o+5]],[p[o+6],p[o+7],p[o+8]]]))keep.push(t);}
  const q={p:[],n:[],c:[],m:[]};for(const t of keep){for(let k=0;k<9;k++){q.p.push(src.p[t*9+k]);q.n.push(src.n[t*9+k]);}for(let k=0;k<12;k++)q.c.push(src.c[t*12+k]);for(let k=0;k<3;k++)q.m.push(src.m[t*3+k]);}
  const n=p.length/9-keep.length;Object.assign(src,q);return n;}
/* how far a point stands off the body side */
const hdOff=v=>{const D=HDK.D,u=D.uC-v[0];return Math.abs(v[2])-HDK.sideZ(u,Math.min(v[1],D.belt(u)+.3));};

function hdMirrors(out,car){
  const K=HDK,D=K.D,G=D.G,X=K.X;let u0=G.cowl;while(u0<G.cB){const k=secKeys(D,u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
  const k=secKeys(D,u0+.1),ub=u0+.1,yb=k.yG,zb=k.P[8][0];
  /* the game's mirror: everything standing off the side round where it sits */
  hdDrop(car.body,(c,m,cl,V)=>{const u=D.uC-c[0];if(u<ub-.16||u>ub+.14||c[1]<yb-.03||c[1]>yb+.24||Math.abs(c[2])<zb-.04)return false;
    return Math.max(...V.map(hdOff))>.009;});
  for(const s of [1,-1]){
    /* the sail: a flat black plate on the door at the window's front corner, its edges rounded */
    const sail=[[ub-.1,yb-.005],[ub+.07,yb-.005],[ub+.06,yb+.07],[ub-.04,yb+.1],[ub-.1,yb+.03]];
    hdPart(out,mb=>{hdExtrude(mb,sail,zb-.006,zb+.02,HC.GB,.006,3);},40,null,M4.mul(M4T(X(0),0,0),M4S(-1,1,s)));
    /* the neck, out to the housing */
    const c=[X(ub+.02),yb+.1,s*(zb+.18)],ax=V3.norm([1,0,-.1*s]),az=V3.norm([.1*s,0,1]),Mh=M4.basis(c,ax,[0,1,0],az);
    hdPart(out,mb=>{hdRBox(mb,[X(ub+.0),yb+.065,s*(zb+.065)],[.04,.022,.055],.018,HC.GB,3);},40);
    /* the housing: rounded sections lofted outward (local z), body colour above a black lower shell */
    /* (the section: well rounded at the front, nearly square at the back where the glass sits) */
    const sec=(t)=>{const w=.062-.004*t*t,h=.088*(1-.06*t*t),pts=[];
      for(const [x,y,q,r] of [[w,h,0,.045],[-w,h,1,.012],[-w,-h,2,.012],[w,-h,3,.045]])for(let i=0;i<=5;i++){const a=(q+i/5)*PI/2;pts.push([x-Math.sign(x)*r+Math.cos(a)*r,y-Math.sign(y)*r+Math.sin(a)*r]);}
      return pts;};
    hdPart(out,mb=>{const zs=[-.14,-.132,-.11,0,.11,.13,.138],rings=zs.map((z,i)=>{const t=Math.abs(z)/.14,sc=i===0||i===zs.length-1?.82:1,yo=.012;return sec(t).map(([x,y])=>[x*sc+.004,y*sc+yo,z*s]);});
      for(let i=0;i<rings.length-1;i++){const A=rings[i],B=rings[i+1];for(let j=0;j<A.length;j++){const j1=(j+1)%A.length,ym=(A[j][1]+A[j1][1])/2,m=ym>-.03?SV([1,1,1],MAT.PAINT):HC.GB;
        if(s>0)mb.quad(A[j],B[j],B[j1],A[j1],m[0],m[1],m[2]);else mb.quad(A[j],A[j1],B[j1],B[j],m[0],m[1],m[2]);}}
      hdCap(mb,rings[0],SV([1,1,1],MAT.PAINT),s>0);hdCap(mb,rings[rings.length-1],SV([1,1,1],MAT.PAINT),s<0);},38,null,Mh);
    /* the glass in its bezel, facing back */
    hdPart(out,mb=>{const pts=[];for(const [x,y,q] of [[.1,.058,0],[-.1,.058,1],[-.1,-.056,2],[.1,-.056,3]])for(let i=0;i<=4;i++){const a=(q+i/4)*PI/2;pts.push([x+Math.cos(a)*.016,y+Math.sin(a)*.016]);}
      /* (in the housing's frame the glass lies in the z-y plane just behind its back, x = -0.062) */
      const ring=(d,k)=>pts.map(([z,y])=>[-.0615-d,y*k+.012,z*k*s]);hdLoft(mb,[ring(0,1.0),ring(.005,.97)],HC.GB,true,s<0);
      const g=ring(.0045,.965);hdCap(mb,g,HC.MIRROR,s>0);},20,null,Mh);
    /* the turn repeater on the cap's lower front edge */
    hdPart(out,mb=>{hdRBox(mb,[.05,-.02,s*.06],[.012,.006,.045],.005,HC.AMBERL,2);},40,null,Mh);
  }
}

function hdHandles(out,car){
  const K=HDK,D=K.D,G=D.G,X=K.X,lk=D.look;if(lk.noHandles)return;
  for(const u of D.B.handles||[G.pillars[0][0]-.2,G.pillars[1][0]-.17]){const y=D.belt(u)-.09,P=RR2(u-.085,u+.055,y-.02,y+.02,.016);
    /* the game's decal handle off; the pocket cut into the skin */
    hdDrop(car.body,(c,m)=>{const uu=D.uC-c[0];return Math.abs(uu-(u-.015))<.1&&Math.abs(c[1]-y)<.03&&(m===MAT.COL||m===MAT.CHROME)&&hdOff(c)>.002;});
    for(const s of [1,-1]){hdCutSide(car.body,s,P,.01);
      const Pr=hdResample(P,.006),F=Pr.map(([uu,yy])=>hdSS(s,uu,yy,-.0005)),c=hdCen(Pr);
      hdPart(out,mb=>{const B=Pr.map(([uu,yy])=>{const q=[c[0]+(uu-c[0])*.9,c[1]+(yy-c[1])*.75];return hdSS(s,q[0],q[1],-.022);});hdLoft(mb,[F,B],SV([1,1,1],MAT.PAINT),true);hdCap(mb,B,HC.GB,s<0);},30);
      /* the chrome pull: a bar the length of the pocket, proud of the skin, its ends turning in */
      hdPart(out,mb=>{const path=[];for(let i=0;i<=16;i++){const t=i/16,uu=u-.072+.114*t,o=.012*Math.sin(PI*Math.min(1,Math.min(t,1-t)*5)),q=hdSS(s,uu,y+.006,o-.004);path.push(q);}
        const sec=hdRRect(.0065,.013,.006,3);hdSweep(mb,path,sec,MM.CHROME,[0,1,0],true,true);},45);}}
}

function hdRails(out,car){
  const K=HDK,D=K.D,X=K.X,lk=D.look;if(!lk.roof||lk.roof==='none'||!D.B.rails)return;
  const [u0,u1,zr]=D.B.rails,ry=u=>K.topY(u,zr)+.058;
  /* the game's rails, feet and bars */
  hdDrop(car.body,(c,m,cl)=>{const u=D.uC-c[0];return m===MAT.METAL&&Math.abs(cl-MM.BLACK[0][0])<1e-6&&u>u0-.08&&u<u1+.08&&c[1]>K.topY(u,Math.min(Math.abs(c[2]),zr))+.004;});
  const RM=lk.railCol||SV([.03,.03,.033],SM.GLOSSBLK);
  for(const s of [1,-1]){
    /* the rail: a rounded section swept along, dipping into a foot at each end and resting on one in the middle */
    const path=[];const n=60;for(let i=0;i<=n;i++){const t=i/n,u=u0+(u1-u0)*t,e=Math.min(t,1-t),dip=e<.05?(.05-e)/.05:0,y=ry(u)-dip*dip*.045;path.push([X(u),y,s*zr]);}
    const sec=[];for(let i=0;i<20;i++){const a=i/20*TAU;sec.push([Math.cos(a)*.017*(1+.08*Math.sin(a)),Math.sin(a)*.0135]);}
    hdPart(out,mb=>{hdSweep(mb,path,sec,RM,[0,1,0],true,true);},40);
    for(const u of [u0+.04,u1-.04,(u0+u1)/2]){const y0=K.topY(u,zr),y1=ry(u);
      hdPart(out,mb=>{const rings=[];for(let k=0;k<=4;k++){const t=k/4,y=y0-.004+(y1-y0)*t,w=.06-.025*t,d=.022-.004*t;rings.push(hdRRect(w,d,.012,3).map(([a,b])=>[X(u)+a,y,s*zr+b]));}
        hdLoft(mb,rings,RM,true);},40);}}
  if(lk.roof==='bars')for(const u of [u0+.3,u1-.32]){const y=ry(u)+.024;
    /* an aero bar: a teardrop section, leading edge forward */
    const foil=[];for(let i=0;i<24;i++){const a=i/24*TAU,c=Math.cos(a),s2=Math.sin(a);foil.push([c>0?c*.024:c*.034,s2*.0105*(c>0?1:1-.35*(-c))]);}
    hdPart(out,mb=>{const path=[];for(let i=0;i<=24;i++)path.push([X(u),y+.004*Math.sin(i/24*PI),-zr+2*zr*i/24]);hdSweep(mb,path,foil.map(([a,b])=>[b,a]),RM,[1,0,0],true,true);},45);
    for(const s of [1,-1])hdPart(out,mb=>{hdRBox(mb,[X(u),y-.012,s*zr],[.05,.026,.028],.012,RM,3);},40);}
}
