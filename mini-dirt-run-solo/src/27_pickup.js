/* =====================================================================================
   THE PICKUP — face, tail and its own parts, from its reference sheets.
   ===================================================================================== */
/* a big honeycomb grille in a thick body-colour surround, square lamps with amber corners and an LED brow */
FACES.pickup=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.69,.69,Y(.82),Y(1.32),.03),MM.TRIM,.004);decal('F',RR2(-.665,.665,Y(.845),Y(1.295),.025),MM.PAINT,.006);
  decal('F',RR2(-.585,.585,Y(.885),Y(1.255),.02),MM.TRIM,.008);decal('F',RR2(-.565,.565,Y(.9),Y(1.24),.015),MM.MESH,.01);
  pair(s=>{
    decal('F',RR2(s*.70,s*.925,Y(.965),Y(1.255),.015),MM.SMOKE,.005);decal('F',RR2(s*.715,s*.85,Y(1.05),Y(1.24),.012),MM.REFL,.007);
    for(const z of [.745,.815])decal('F',EL2(s*z,Y(1.15),.03,.03,12),MM.HEAD,.009);
    decal('F',RR2(s*.855,s*.915,Y(.98),Y(1.24),.008),MM.AMBER,.008);decal('F',RR2(s*.715,s*.85,Y(.98),Y(1.035),.008),MM.HEAD,.008);
  });
};
/* tall lamps on the bed's corner posts, the tailgate with its handle, a third brake lamp on the cab */
TAILS.pickup=K=>{
  const {D,decal,line,pair,dy}=K,Y=y=>y+dy,w=.0055;
  pair(s=>{decal('R',RR2(s*.86,s*.945,Y(.86),Y(1.34),.01),MM.SMOKE,.004);decal('R',RR2(s*.87,s*.935,Y(1.12),Y(1.32),.008),MM.TAIL,.007);
    decal('R',RR2(s*.87,s*.935,Y(1.02),Y(1.1),.008),MM.REV,.007);decal('R',RR2(s*.87,s*.935,Y(.88),Y(1.0),.008),MM.TAIL,.007);});
  if(!D.look.noTailgate){line('R',[[-.84,Y(.72)],[.84,Y(.72)],[.84,Y(1.41)],[-.84,Y(1.41)],[-.84,Y(.72)]],w,MM.SHUT,.004);
    decal('R',RR2(-.14,.14,Y(1.16),Y(1.26),.02),MM.TRIM,.005);decal('R',RR2(-.1,.1,Y(1.18),Y(1.235),.015),V([.002,.002,.002],MAT.COL),.007);}
  decal('R',RR2(-.17,.17,Y(1.83),Y(1.862),.006),MM.TAIL,.006);
};
/* the factory bumper: black textured plastic as wide as the flares, fog lamps, red tow hooks, a silver skid plate */
FRONTS.pickup=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=MM.CLAD,x0=X(0)+.02;
  obox(pm,[x0,Y(.725),0],[1,0,0],[0,1,0],[0,0,1],[.065,.105,.9],S);
  obox(pm,[x0-.02,Y(.565),0],[1,0,0],[0,1,0],[0,0,1],[.05,.055,.7],S);
  for(let k=0;k<6;k++)obox(pm,[x0+.031,Y(.545+k*.012),0],[1,0,0],[0,1,0],[0,0,1],[.002,.003,.5],V([0,0,0],MAT.MESH));
  pair(s=>{const a=V3.norm([1,0,-s*1.1]);obox(pm,[x0-.14,Y(.725),s*.94],a,[0,1,0],V3.cross([0,1,0],a).map(v=>-v),[.11,.1,.05],S);
    obox(pm,[x0+.066,Y(.745),s*.8],[1,0,0],[0,1,0],[0,0,1],[.003,.032,.055],MM.HEAD);
    shackle(pm,[x0+.04,Y(.62),s*.45],S);});
  obox(pm,[X(.18),Y(.48),0],V3.norm([1,.4,0]),V3.norm([-.4,1,0]),[0,0,1],[.2,.012,.46],V(lin('#9a9da2'),MAT.METAL));};
/* the step bumper: black, with a pad on top, a plate and a hitch receiver */
REARS.pickup=K=>{const {X,pm,dy,L,pair}=K,Y=y=>y+dy,S=MM.CLAD,x=X(L)-.03;
  obox(pm,[x,Y(.65),0],[1,0,0],[0,1,0],[0,0,1],[.06,.095,.9],S);obox(pm,[x+.02,Y(.748),0],[1,0,0],[0,1,0],[0,0,1],[.05,.004,.86],V([.015,.015,.016],MAT.RUBBER));
  obox(pm,[x-.061,Y(.64),0],[1,0,0],[0,1,0],[0,0,1],[.002,.055,.15],MM.PLATE);
  obox(pm,[x-.05,Y(.5),0],[1,0,0],[0,1,0],[0,0,1],[.08,.04,.04],MM.BLACK);obox(pm,[x-.131,Y(.5),0],[1,0,0],[0,1,0],[0,0,1],[.002,.028,.028],V([.01,.01,.01],MAT.COL));};
/* running boards on brackets between the arches */
EXTRAS.steps=K=>{const {D,X,pm,pair}=K,u0=D.uFa+D.arch.a+.06,u1=D.uRa-D.archB.a-.06,um=(u0+u1)/2,y=D.sill(um)-.05,z=D.plan(um)+.07;
  pair(s=>{obox(pm,[X(um),y,s*z],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,.022,.08],MM.BLACK);obox(pm,[X(um),y+.023,s*z],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2-.02,.002,.07],V([.015,.015,.016],MAT.RUBBER));
    for(const u of [u0+.25,um,u1-.25])obox(pm,[X(u),y+.03,s*(z-.08)],[1,0,0],[0,1,0],[0,0,1],[.025,.03,.05],MM.BLACK);});};
/* the prerunner's tube bumper: hoops round a skid plate, four round lights on the bar */
FRONTS.prerun=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,B=MM.BLACK,x0=X(0)+.1,r=.03;
  pair(s=>{tubePath(pm,[[x0-.02,Y(.62),0],[x0,Y(.62),s*.55],[x0-.12,Y(.64),s*.88],[X(.25),Y(.7),s*.92]],r,8,B);
    tubePath(pm,[[x0,Y(.62),s*.55],[x0+.02,Y(.82),s*.6],[X(.04),Y(.85),s*.62]],r,8,B);
    tubeAB(pm,[x0,Y(.62),s*.3],[X(.04),Y(.78),s*.3],r*.8,8,B);});
  tubeAB(pm,[x0+.02,Y(.8),-.6],[x0+.02,Y(.8),.6],r,8,B);
  for(const z of [-.5,-.32,.32,.5]){tubeAB(pm,[x0-.03,Y(.72),z],[x0+.07,Y(.72),z],.055,14,B);tubeAB(pm,[x0+.07,Y(.72),z],[x0+.072,Y(.72),z],.046,14,MM.HEAD);
    obox(pm,[x0,Y(.66),z],[1,0,0],[0,1,0],[0,0,1],[.015,.04,.01],B);}
  obox(pm,[X(.22),Y(.5),0],V3.norm([1,.4,0]),V3.norm([-.4,1,0]),[0,0,1],[.26,.012,.5],V(lin('#a3a6ab'),MAT.METAL));
  for(let k=-2;k<=2;k++)obox(pm,[X(.12),Y(.545),k*.16],V3.norm([1,.4,0]),V3.norm([-.4,1,0]),[0,0,1],[.04,.002,.04],V([.01,.01,.01],MAT.COL));};
/* the bed cage: hoops behind the cab, braces to the tail, tubes for a tailgate, two spares strapped upright,
   the rear bypass shocks coming up through the bed floor */
EXTRAS.bedCage=K=>{const {D,X,pm,dy,pair,L}=K,B=MM.BLACK,r=.028,u0=D.B.bed+.08,yf=D.top(L-.5),yr=D.belt(L-.5),zr=D.plan(L-.5)-.08,yt=D.Hr+.02;
  const P=(u,y,z)=>[X(u),y,z];
  tubePath(pm,[P(u0,yr,-zr),P(u0,yt,-zr*.85),P(u0,yt,zr*.85),P(u0,yr,zr)],r,8,B);
  pair(s=>{tubePath(pm,[P(u0,yt,s*zr*.85),P(L-.35,yr+.12,s*zr),P(L-.02,yr-.05,s*zr)],r,8,B);tubeAB(pm,P(u0+.4,yt-.1,s*zr*.88),P(u0+.4,yr,s*zr),r*.8,8,B);});
  for(const y of [yr-.05,yf+.22])tubeAB(pm,P(L-.02,y,-zr),P(L-.02,y,zr),r,8,B);
  tubeAB(pm,P(L-.02,yf+.22,-zr),P(L-.02,yr-.05,zr),r*.8,8,B);tubeAB(pm,P(L-.02,yf+.22,zr),P(L-.02,yr-.05,-zr),r*.8,8,B);
  /* the spares, standing on the floor across the bed, and their straps */
  const t=D.look.tyre,us=u0+.55;
  for(const z of [-.2,.2]){(D.spares=D.spares||[]).push({p:[X(us),yf+t.R+.01,z],face:'side'});
    tubePath(pm,[P(us-t.R*.7,yf+.02,z),P(us-t.R*.5,yf+t.R*1.9,z),P(us+t.R*.5,yf+t.R*1.9,z),P(us+t.R*.7,yf+.02,z)],.012,6,V(lin('#c8241c'),MAT.FABRIC));}
  pair(s=>{const a=[X(D.uRa+.08),yf+.02,s*(zr-.1)],b=[X(D.uRa-.05),yr+.32,s*(zr-.12)];tubeAB(pm,a,b,.045,12,V(lin('#2f74c8'),MAT.METAL));
    tubeAB(pm,V3.lerp(a,b,.6),[b[0]+.12,b[1]-.05,b[2]],.03,10,V(lin('#2f74c8'),MAT.METAL));tubeAB(pm,b,P(u0+.4,yt-.1,s*zr*.88),r*.7,6,B);});};
/* bypass shocks beside the front coilovers */
EXTRAS.bypass=K=>{const {D,X,pm,dy,pair}=K,lk=D.look,R=D.R,tw=lk.track/2,x=X(D.uFa),BL=V(lin('#2f74c8'),MAT.METAL);
  pair(s=>{const lo=[x+.1,R-.05,s*(tw-.28)],hi=[x+.1,D.belt(D.uFa)-.12,s*(tw-.5)];tubeAB(pm,lo,hi,.04,12,BL);tubeAB(pm,V3.lerp(lo,hi,.55),hi,.05,12,MM.ALU);
    tubeAB(pm,[hi[0]-.02,hi[1]-.05,hi[2]],[hi[0]-.02,hi[1]-.35,hi[2]-s*.02],.03,10,BL);});};
/* an LED bar along the front edge of the roof */
EXTRAS.roofBar=K=>{const {D,X,pm,topY,pair,G}=K,u=G.rf+.1,y=topY(u,0)+.07,B=MM.BLACK;
  pair(s=>obox(pm,[X(u),y-.04,s*.62],[1,0,0],[0,1,0],[0,0,1],[.02,.045,.015],B));
  rbox(pm,[X(u),y,0],[1,0,0],[0,1,0],[0,0,1],[.045,.045,.78],B,.2,16,6);
  for(let k=0;k<12;k++){const z=-.7+k*1.4/11;tubeAB(pm,[X(u)+.04,y,z],[X(u)+.047,y,z],.026,10,MM.HEAD);}};

