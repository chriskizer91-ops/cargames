/* =====================================================================================
   THE HYPERCAR — an original modern mid-engine V10: a low pointed nose between big intakes, a teardrop
   canopy pushed far forward, a pinched waist and huge hips, a long tail over the engine with a mesh panel
   and thin light blades. 4.62 m long on a 2.7 m wheelbase, 2.06 m wide, 1.13 m tall. No real badges,
   names or signature details. The Track edition: a shark fin from the roof to a big deck wing, a splitter
   with canards, a widebody, a roof scoop, slicks on centre-locks, stripes.
   ===================================================================================== */
BODIES.hyper={
  L:4.62,ovF:1.0,wb:2.7,R0:.35,
  top:[[0,.26],[0,.40,.04],[.12,.50,.15],[.9,.655,.6],[1.3,.725,.08],[1.88,1.09,.35],[2.3,1.13,.6],[2.8,1.07,.4],[3.6,.90,.4],[4.3,.86,.15],[4.5,.875,.03],[4.62,.80,.03],[4.62,.34]],
  belt:[[0,.40],[.12,.49,.1],[.9,.62,.4],[1.6,.70,.3],[2.6,.79,.5],[3.5,.845,.4],[4.3,.85,.2],[4.62,.77]],
  sill:[[0,.26],[0,.15,.04],[.4,.13,.2],[1.3,.12,.3],[3.4,.12,.3],[4.2,.17,.2],[4.62,.26,.04],[4.62,.32]],
  plan:[[0,0],[0,.62,.25],[.45,.93,.4],[1.05,.99,.35],[1.95,.9,.5],[3.05,1.03,.4],[4.0,1.03,.3],[4.62,.9,.15],[4.62,0]],
  clad:[[0,.24],[4.62,.24]],
  G:{cowl:1.3,rf:1.88,rr:2.8,be:3.55,base:.012,inset:.05,tum:.64,crown:.04,cB:3.0,cT:2.74,pillars:[[2.72,-.1,.02]]},
  dome:[.3,1.15,.012],bumperF:.08,bumperR:9,hood0:.1,
  Hr:1.13,sh:.93,hip:[.015,.07],oy:.45,doors:2,doorR:2.78,handles:[2.55],fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,seams:false,
  chY:-.17,fit:{fdy:-.24,rdy:-.2,exU:3.4,sideZ:1.0,ventU:-.2,lipZ:.84,lipU:.3,epU:.2,sideEx:1.0,sideExY:.03,filler:[3.6,.76]}
};
/* slim angular lamps high on the corners, big black intakes under them, a black blade across the nose;
   the flank intakes behind the doors and the vents on the hood */
FACES.hyper=K=>{
  const {D,decal,pair,dy,line,G}=K,Y=y=>y+dy;
  decal('F',RR2(-.36,.36,Y(.19),Y(.29),.02),MM.SMOKE,.005);decal('F',RR2(-.34,.34,Y(.2),Y(.28),.015),MM.MESH,.007);
  pair(s=>{
    decal('F',[[s*.47,Y(.49)],[s*.84,Y(.545)],[s*.92,Y(.6)],[s*.86,Y(.6)],[s*.5,Y(.53)]],MM.SMOKE,.006);
    decal('F',[[s*.5,Y(.5)],[s*.83,Y(.552)],[s*.88,Y(.585)],[s*.84,Y(.586)],[s*.52,Y(.52)]],MM.LED,.009);
    decal('F',EL2(s*.7,Y(.54),.035,.014,10),MM.HEAD,.01);
    decal('F',[[s*.4,Y(.16)],[s*.93,Y(.18)],[s*.93,Y(.44)],[s*.62,Y(.4)],[s*.42,Y(.3)]],MM.SMOKE,.005);
    decal('F',[[s*.44,Y(.175)],[s*.9,Y(.193)],[s*.9,Y(.42)],[s*.63,Y(.385)],[s*.45,Y(.295)]],MM.MESH,.007);
    /* hood vents */
    decal('T',[[.35,s*.18],[.75,s*.3],[.75,s*.5],[.35,s*.4]],MM.SMOKE,.004,.05);decal('T',[[.38,s*.2],[.72,s*.31],[.72,s*.48],[.38,s*.38]],MM.MESH,.007,.05);
  });
  const u0=G.cB-.05,u1=D.uRa-D.arch.a-.04;
  decal('S',[[u0,Y(.36)],[u1,Y(.34)],[u1+.02,Y(.74)],[u0+.12,Y(.62)]],MM.SMOKE,.005,.05);
  decal('S',[[u0+.04,Y(.38)],[u1-.02,Y(.36)],[u1,Y(.71)],[u0+.15,Y(.61)]],MM.MESH,.007,.05);
  /* the engine cover: a mesh panel between the hips */
  decal('T',RR2(G.be+.12,D.L-.35,-.42,.42,.04),MM.SMOKE,.004,.06);decal('T',RR2(G.be+.15,D.L-.38,-.4,.4,.03),MM.MESH,.007,.06);
};
/* thin red blades across the tail over a big mesh panel, the plate low */
TAILS.hyper=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('R',RR2(-.82,.82,Y(.4),Y(.66),.02),MM.SMOKE,.004);decal('R',RR2(-.8,.8,Y(.41),Y(.65),.015),MM.MESH,.006);
  pair(s=>{decal('R',[[s*.18,Y(.705)],[s*.84,Y(.69)],[s*.9,Y(.72)],[s*.2,Y(.728)]],MM.SMOKE,.006);decal('R',[[s*.2,Y(.708)],[s*.83,Y(.695)],[s*.87,Y(.715)],[s*.21,Y(.722)]],MM.TAIL,.009);
    decal('R',RR2(s*.06,s*.14,Y(.69),Y(.72),.005),MM.REV,.008);});
};
/* the Track edition's shark fin, along the spine of the engine cover from the roof back to the wing */
EXTRAS.fin=K=>{const {D,X,pm,G,topY}=K,u0=G.rr-.15,u1=D.L-.4,n=8,pts=[];
  for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n;pts.push([u,topY(u,0)-.01,topY(G.rr,0)+.03-(topY(G.rr,0)-topY(u1,0))*.25*Math.pow(i/n,1.4)]);}
  for(let i=0;i<n;i++){const [ua,ya,ha]=pts[i],[ub,yb,hb]=pts[i+1];
    for(const s of [1,-1])pm.quad([X(ua),ya,s*.006],[X(ub),yb,s*.006],[X(ub),hb,s*.006],[X(ua),ha,s*.006],[1,1,1],0,MAT.CARBON);
    pm.quad([X(ua),ha,-.006],[X(ub),hb,-.006],[X(ub),hb,.006],[X(ua),ha,.006],[1,1,1],0,MAT.CARBON);}};
