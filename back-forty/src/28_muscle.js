/* =====================================================================================
   THE MUSCLE CAR — face, tail and its own parts, from its reference sheets.
   ===================================================================================== */
/* a full-width black grille with a chrome edge, the round lamps set into its ends, amber parking lamps low down */
FACES.muscle=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.875,.875,Y(.445),Y(.675),.03),MM.CHROME,.004);decal('F',RR2(-.86,.86,Y(.455),Y(.665),.025),MM.TRIM,.006);
  for(let k=0;k<8;k++){const y=.47+k*.024;decal('F',RR2(-.63,.63,Y(y),Y(y+.012),.004),MM.MESH,.008);}
  pair(s=>{ring2('F',s*.755,Y(.56),.072,.086,MM.CHROME,.009,20);decal('F',EL2(s*.755,Y(.56),.072,.072,20),MM.HEAD,.01);
    decal('F',EL2(s*.755,Y(.56),.022,.022,8),MM.CHROME,.012);decal('F',RR2(s*.66,s*.78,Y(.265),Y(.31),.01),MM.AMBER,.006);});
};
/* two wide lamps in chrome bezels across a black panel, a plate below the bumper, the deck lid */
TAILS.muscle=K=>{
  const {decal,line,pair,dy,L}=K,Y=y=>y+dy,w=.0055;
  decal('R',RR2(-.9,.9,Y(.485),Y(.655),.02),MM.TRIM,.004);
  pair(s=>{decal('R',RR2(s*.2,s*.865,Y(.5),Y(.64),.03),MM.CHROME,.006);decal('R',RR2(s*.212,s*.853,Y(.512),Y(.628),.025),MM.TAIL,.008);
    for(const y of [.553,.587])decal('R',RR2(s*.215,s*.85,Y(y),Y(y+.006),.002),MM.CHROME,.01);});
  decal('R',RR2(-.17,.17,Y(.29),Y(.385),.01),MM.SHUT,.005);decal('R',RR2(-.155,.155,Y(.3),Y(.375),.008),MM.PLATE,.007);
  line('T',[[4.28,-.62],[4.28,.62]],w,MM.SHUT,.004);pair(s=>line('T',[[4.28,s*.62],[L-.08,s*.7]],w,MM.SHUT,.004));
};
/* thin chrome bumpers that wrap the corners */
FRONTS.chrome=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,x0=X(0)-.005;
  rbox(pm,[x0,Y(.4),0],[1,0,0],[0,1,0],[0,0,1],[.04,.035,.86],MM.CHROME,.4,16,6);
  pair(s=>{const a=V3.norm([1,0,-s*1.6]);rbox(pm,[x0-.13,Y(.4),s*.9],a,[0,1,0],V3.cross([0,1,0],a).map(v=>-v),[.14,.035,.04],MM.CHROME,.4,12,6);});};
REARS.chrome=K=>{const {D,X,pm,dy,pair,L}=K,Y=y=>y+dy,x=X(L)+.005;
  rbox(pm,[x,Y(.45),0],[1,0,0],[0,1,0],[0,0,1],[.04,.035,.87],MM.CHROME,.4,16,6);
  pair(s=>{const a=V3.norm([1,0,s*1.6]);rbox(pm,[x+.13,Y(.45),s*.91],a,[0,1,0],V3.cross([0,1,0],a).map(v=>-v),[.14,.035,.04],MM.CHROME,.4,12,6);});};
/* the drag car's front: the chrome bumper and a black chin spoiler under it */
FRONTS.chin=K=>{FRONTS.chrome(K);const {D,X,pm,dy,pair,uFront}=K,Y=y=>y+dy,y=Y(.22),n=12;
  const P=[];for(let k=0;k<=n;k++){const z=-.86+1.72*k/n;P.push([uFront(z*.97,y+.06)-.05,z]);}
  for(let k=0;k<n;k++){const [ua,za]=P[k],[ub,zb]=P[k+1];pm.quad([X(ua),y,za],[X(ub),y,zb],[X(.4),y,zb],[X(.4),y,za],MM.BLACK[0],0,MM.BLACK[2]);
    pm.quad([X(ua),y,za],[X(ub),y,zb],[X(ub),y+.06,zb],[X(ua),y+.06,za],MM.BLACK[0],0,MM.BLACK[2]);}};
/* the power bulge: a raised panel up the middle of the hood with a lip at its front */
HOODS.bulge=K=>{const {D,X,pm,topY}=K,u0=.42,u1=1.25,n=10,w=.2,rows=[];
  for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n,t=(u-u0)/(u1-u0),h=.05*Math.min(1,t*8+.15)*(1-.3*t),row=[];
    for(let k=-3;k<=3;k++){const z=k/3*w,yy=topY(u,z)+h*Math.pow(Math.cos(k/3*PI/2),.35)+.002;row.push([X(u),yy,z]);}rows.push(row);}
  for(let i=0;i<n;i++)for(let k=0;k<6;k++)pm.quad(rows[i][k],rows[i+1][k],rows[i+1][k+1],rows[i][k+1],[1,1,1],0,MAT.PAINT);
  const f=rows[0];for(let k=0;k<6;k++){const a=f[k],b=f[k+1];pm.quad([a[0],topY(u0,a[2]),a[2]],[b[0],topY(u0,b[2]),b[2]],b,a,[1,1,1],0,MAT.PAINT);}
  for(const k of [0,6]){const r=rows.map(q=>q[k]);for(let i=0;i<n;i++){const a=r[i],b=r[i+1];pm.quad(a,b,[b[0],topY(u0+(u1-u0)*(i+1)/n,b[2]),b[2]],[a[0],topY(u0+(u1-u0)*i/n,a[2]),a[2]],[1,1,1],0,MAT.PAINT);}}};
/* wheelie bars from the rear axle back to two little wheels just off the ground */
EXTRAS.wheelie=K=>{const {D,X,pm,pair,L}=K,B=MM.BLACK,px=X(D.uFa),py=D.R,c=Math.cos(-D.pitch),sn=Math.sin(-D.pitch);
  /* a point given in the world (the car pitched over its slicks) is put back into the body's own frame */
  const toBody=(x,y)=>[px+(x-px)*c-(y-py)*sn,py+(x-px)*sn+(y-py)*c];
  const xr=px-(D.uRa-D.uFa)*Math.cos(D.pitch),w=toBody(X(L)-.85,.075),ax=[X(D.uRa)+.05,D.R+.02];
  pair(s=>{const a=[ax[0],ax[1],s*.42],b=[w[0],w[1],s*.34];tubeAB(pm,a,b,.02,8,B);tubeAB(pm,[a[0]-.35,D.R+.22,s*.4],V3.lerp(a,b,.7),.016,8,B);
    tubeAB(pm,[b[0],b[1],s*.27],[b[0],b[1],s*.39],.07,14,V([.03,.03,.032],MAT.RUBBER));tubeAB(pm,[b[0],b[1],s*.26],[b[0],b[1],s*.4],.03,10,MM.ALU);});
  tubeAB(pm,[w[0]+.04,w[1],-.34],[w[0]+.04,w[1],.34],.016,8,B);};
/* a parachute pack on the back bumper, its release cord hanging down */
EXTRAS.chute=K=>{const {D,X,pm,dy,L}=K,Y=y=>y+dy,x=X(L)-.1;
  rbox(pm,[x-.02,Y(.62),0],[1,0,0],[0,1,0],[0,0,1],[.1,.12,.14],V(lin('#141416'),MAT.FABRIC),.35,14,8);
  obox(pm,[x+.08,Y(.62),0],[1,0,0],[0,1,0],[0,0,1],[.02,.04,.05],MM.BLACK);
  tubePath(pm,[[x-.05,Y(.52),.06],[x-.08,Y(.36),.05],[x-.05,Y(.22),.02]],.008,6,V(lin('#e9e8e2'),MAT.FABRIC));};

