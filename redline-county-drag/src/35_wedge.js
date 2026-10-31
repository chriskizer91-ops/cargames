/* =====================================================================================
   THE WEDGE — an original late-1980s mid-engine V12 supercar: one straight line from a knife-edge nose to
   the base of a steep windshield, a cab-forward glasshouse, a flat louvred engine deck, a cut-off tail, wide
   hips over the rear wheels and big black intakes ahead of them. At night its pop-up lamps are up.
   4.20 m long on a 2.5 m wheelbase, 2.0 m wide, 1.08 m tall. No real badges, names or signature details.
   The Night Runner is the same car built for the late, empty roads: a bolted widebody, a deck wing, a
   splitter, twin turbos, a neon slash down each side and the glow underneath.
   ===================================================================================== */
BODIES.wedge={
  L:4.20,ovF:.95,wb:2.5,R0:.33,
  top:[[0,.30],[0,.43,.02],[.05,.465,.03],[1.10,.80,.06],[1.72,1.045,.14],[2.15,1.08,.4],[2.50,1.06,.08],[2.66,.95,.05],[3.95,.925,.15],[4.12,.94,.02],[4.20,.885,.02],[4.20,.38]],
  belt:[[0,.43],[.05,.455,.03],[1.10,.75,.2],[2.0,.80,.4],[3.0,.865,.4],[4.0,.895,.1],[4.20,.86]],
  sill:[[0,.30],[0,.22,.03],[.35,.17,.1],[1.0,.16,.2],[3.2,.16,.2],[3.9,.22,.1],[4.20,.30,.03],[4.20,.36]],
  plan:[[0,0],[0,.60,.06],[.25,.86,.2],[.9,.94,.3],[1.9,.93,.6],[2.9,1.0,.4],[3.9,1.0,.2],[4.20,.97,.04],[4.20,0]],
  clad:[[0,.27],[4.2,.27]],
  G:{cowl:1.12,rf:1.72,rr:2.5,be:2.64,base:.012,inset:.04,tum:.76,crown:.02,cB:2.5,cT:2.42,pillars:[[2.47,-.08,.02]]},
  dome:[.3,1.0,0],bumperF:.07,bumperR:9,hood0:.1,
  Hr:1.08,sh:.95,hip:[.01,.06],oy:.5,doors:2,doorR:2.46,handles:[2.3],fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,seams:false,
  chY:-.15,fit:{fdy:-.22,rdy:-.18,exU:3.4,sideZ:.98,ventU:-.18,lipZ:.8,lipU:.3,epU:.2,sideEx:.98,sideExY:.03,filler:[3.5,.8]}
};
/* the knife-edge nose: a slot across the bumper, amber blades at the corners, small round driving lamps.
   The intakes in the flanks and the louvred deck are part of the body, so they are here too */
FACES.wedge=K=>{
  const {D,decal,pair,dy,line,G}=K,Y=y=>y+dy;
  decal('F',RR2(-.62,.62,Y(.305),Y(.385),.012),MM.SMOKE,.005);
  for(let k=0;k<3;k++)decal('F',RR2(-.6,.6,Y(.315+k*.024),Y(.327+k*.024),.003),MM.MESH,.007);
  pair(s=>{decal('F',RR2(s*.64,s*.84,Y(.395),Y(.418),.006),MM.AMBER,.006);decal('F',EL2(s*.73,Y(.345),.028,.028,12),MM.HEAD,.008);});
  /* the flank intakes: big black mouths ahead of the rear wheels, three body-colour fins across each */
  const u0=G.cB+.1,u1=D.uRa-D.arch.a-.06;
  decal('S',[[u0,Y(.47)],[u1,Y(.42)],[u1+.04,Y(.79)],[u0+.14,Y(.74)]],MM.SMOKE,.005,.05);
  decal('S',[[u0+.05,Y(.49)],[u1-.03,Y(.445)],[u1,Y(.76)],[u0+.17,Y(.72)]],MM.MESH,.007,.05);
  for(const y of [.53,.6,.67])line('S',[[u0+.06,Y(y)],[u1+.01,Y(y-.02)]],.028,MM.PAINT,.011);
  /* the engine deck: louvres from the cabin back to the tail */
  decal('T',RR2(G.be+.18,D.L-.32,-.56,.56,.03),MM.TRIM,.004,.06);
  for(let u=G.be+.22;u<D.L-.36;u+=.085)decal('T',RR2(u,u+.045,-.53,.53,.006),MM.LOUVRE,.008,.06);
};
/* the tail: a black panel across the back with two square lamps each side, the reversing lamps between */
TAILS.wedge=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('R',RR2(-.92,.92,Y(.56),Y(.84),.012),MM.TRIM,.004);
  for(let k=0;k<5;k++)decal('R',RR2(-.3,.3,Y(.585+k*.05),Y(.605+k*.05),.003),MM.MESH,.006);
  pair(s=>{decal('R',RR2(s*.36,s*.6,Y(.6),Y(.8),.01),MM.TAIL,.006);decal('R',RR2(s*.64,s*.88,Y(.6),Y(.8),.01),MM.TAIL,.006);
    decal('R',RR2(s*.36,s*.6,Y(.6),Y(.64),.006),MM.AMBER,.008);decal('R',RR2(s*.3,s*.34,Y(.6),Y(.8),.004),MM.REV,.008);});
  decal('R',RR2(-.2,.2,Y(.42),Y(.52),.01),MM.PLATE,.006);
};
/* the pop-up lamps, up: a body-colour pod each side on the front of the hood, its lamp facing the road */
EXTRAS.popups=K=>{const {D,X,pm,topY,pair}=K,u0=.34,u1=.66,zc=.62,hw=.17;
  pair(s=>{const yb=Math.max(topY(u0,zc-hw),topY(u0,zc+hw)),yt=yb+.13,xa=X(u0),xb=X(u1);
    obox(pm,[(xa+xb)/2,yt-.075,s*zc],[1,0,0],[0,1,0],[0,0,1],[(xa-xb)/2,.075,hw],MM.PAINT);
    obox(pm,[xa+.003,yt-.065,s*zc],[1,0,0],[0,1,0],[0,0,1],[.004,.048,hw-.02],MM.TRIM);
    for(const dz of [-.075,.075]){tubeAB(pm,[xa-.002,yt-.065,s*zc+dz],[xa+.008,yt-.065,s*zc+dz],.042,14,MM.HEAD);}});};
/* the Night Runner's tube under the sills: it glows its own colour on the road (the game adds the light) */
EXTRAS.underglow=K=>{const {D,X,pm,pair}=K,u0=D.uFa+D.arch.a+.08,u1=D.uRa-D.arch.a-.08,y=D.sill(2)-.025;
  pair(s=>tubeAB(pm,[X(u0),y,s*(D.plan(2)*.8)],[X(u1),y,s*(D.plan(2)*.8)],.012,6,V([1,1,1],MAT.UNDERGLOW)));
  tubeAB(pm,[X(.25),D.sill(.25)-.02,-.4],[X(.25),D.sill(.25)-.02,.4],.012,6,V([1,1,1],MAT.UNDERGLOW));};
