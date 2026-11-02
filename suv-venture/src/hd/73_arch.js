/* =====================================================================================
   WHEEL HOUSES. The game closes each arch with sixteen flat panels (enough at a distance, faceted up close);
   here they are taken out of the body and each arch gets a moulded liner: a smooth half-tube following the
   opening 72 steps round, from just inside the body side to the inner wall, in black grained plastic, with the
   inner wall closing the back of the house.
   ===================================================================================== */
function hdArches(out,car){
  const K=HDK,D=K.D,X=K.X,A=D.arch;
  /* the game's wells and the floor riding over the arches: dropped from the body */
  for(const src of [car.body,car.hide]){const p=src.p,keep=[];
  for(let t=0;t<p.length/9;t++){const o=t*9,x=(p[o]+p[o+3]+p[o+6])/3,y=(p[o+1]+p[o+4]+p[o+7])/3,z=Math.abs((p[o+2]+p[o+5]+p[o+8])/3),u=D.uC-x,m=src.m[t*3];
    let drop=false;
    for(const ua of [D.uFa,D.uRa]){const Ar=ua===D.uRa?D.archB:A;if(Math.abs(u-ua)<Ar.a+.03&&y>Ar.cy-.075&&(m===MAT.METAL&&z<D.plan(u)*1.01)&&y<Ar.cy+Ar.b+.06){drop=true;break;}}
    /* the game's flare: a triangle standing off the body side (a corner more than 4 mm out) round an arch */
    if(!drop&&y>D.arch.cy-.06){for(const ua of [D.uFa,D.uRa]){const Ar=ua===D.uRa?D.archB:A;if(Math.abs(u-ua)>Ar.a+(D.look.flares?D.look.flares.w:0)+.05)continue;
      let off=-1;for(let k=0;k<3;k++){const vu=D.uC-p[o+k*3],vy=p[o+k*3+1],vz=Math.abs(p[o+k*3+2]);off=Math.max(off,vz-K.sideZ(vu,Math.min(vy,D.belt(vu)-.02)));}
      if(off>.004&&off<.06){drop=true;break;}}}
    if(!drop)keep.push(t);}
  const q={p:[],n:[],c:[],m:[]};for(const t of keep){for(let k=0;k<9;k++){q.p.push(src.p[t*9+k]);q.n.push(src.n[t*9+k]);}for(let k=0;k<12;k++)q.c.push(src.c[t*12+k]);for(let k=0;k<3;k++)q.m.push(src.m[t*3+k]);}
  Object.assign(src,q);}
  const LIN=HC.LINER;
  for(const ua of [D.uFa,D.uRa])for(const s of [1,-1]){const Ar=ua===D.uRa?D.archB:A,zi=D.plan(ua)*.7,n=72;
    hdPart(out,mb=>{const rings=[];
      for(let k=0;k<=n;k++){const ph=-.02+(PI+.04)*k/n,[u,y]=archPt(D,ua,ph,.012),zo=Math.max(zi+.05,K.sideZ(u,Math.min(y,D.belt(u)-.05))-.012);
        /* across the liner: the outer edge, a soft round, then straight in to the inner wall */
        const row=[];for(let j=0;j<=6;j++){const t=j/6,z=zo+(zi-zo)*t,bulge=.01*Math.sin(t*PI);
          const c=archPt(D,ua,ph,.012+bulge);row.push([X(c[0]),c[1],s*z]);}
        rings.push(row);}
      hdLoft(mb,rings,LIN,false);
      /* the inner wall: from the liner's inner edge down to the axle's height */
      const ib=rings.map(r=>r[r.length-1]),floor=ib.map(v=>[v[0],Ar.cy-.07,v[2]]);hdLoft(mb,[ib,floor],LIN,false);},40);}
}
/* the arch flares, as the game's (23_parts flares) but turned in 96 steps instead of 28 and smoothed, in place of the game's own, which is taken off */
function hdFlares(out){
  const K=HDK,D=K.D,X=K.X,F=D.look.flares;if(!F)return;
  const n=96,w=F.w,o=F.out,sec=[[-.012,-.01],[0,o*.7],[w*.18,o],[w*.62,o*.86],[w,o*.12],[w+.012,0]],m=F.mat||SV([1,1,1],SM.CLADS);
  /* (its own material: the cladding's colour without the cladding's grain, which a box projection streaks on a
     surface that turns through every direction) */
  for(const ua of [D.uFa,D.uRa])for(const s of [1,-1])hdPart(out,mb=>{const G=[];
    for(let k=0;k<=n;k++){const ph=(F.a0||-.01)+((F.a1||1.01)-(F.a0||-.01))*k/n,end=sm01(Math.min(k,n-k)/(n*.1)),row=[];
      /* (the body side's z taken just above the opening's edge for the whole row: below the edge, inside the opening,
         there is no side to measure, and a point there would be pulled in to the floor) */
      const e=archPt(D,ua,ph*PI,.006),ye=Math.min(e[1],D.belt(e[0])-.02),zs=K.sideZ(e[0],ye);
      for(const [dr,dz] of sec){const [u,y0]=archPt(D,ua,ph*PI,dr),y=Math.min(y0,D.belt(u)-.02),zb=dr>0?Math.max(zs,K.sideZ(u,y)):zs;row.push([X(u),y,s*(zb+Math.max(0,dz)*(.35+.65*end)+Math.min(0,dz))]);}
      G.push(row);}
    hdLoft(mb,G,m,false);
    for(const k of [0,n]){const r=G[k];for(let j=1;j<r.length-1;j++)mb.tri(r[0],r[j],r[j+1],m[0],m[1],m[2]);}},40);
}
