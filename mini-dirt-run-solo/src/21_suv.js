/* =====================================================================================
   THE TRUCK — an original mid-2000s midsize SUV, lofted from cross-sections the way the
   Shiftlight cars are. Real proportions (4.92 m long, 2.89 m wheelbase, 1.87 m wide, 1.85 m
   tall over the rails); the details follow the three concept sheets, with no badges and no
   signature grille. Every section is generated from a few designed lines: the side silhouette
   (bumper, grille face, hood, windshield, roof, liftgate), the shoulder, the lower edge, the
   plan-view width and a cladding line. The greenhouse grows out of the deck wherever the roof
   line rises above the glass, so the windshield, pillars and glass fall out of the same curves.
   Lamps, grilles, glass, shut lines and handles are projection decals: 2-D shapes drawn in
   front, rear, top or side view and wrapped onto whatever surface they land on.
   Local axes: +X forward, +Y up, +Z right; origin on the ground at the middle of the body.
   ===================================================================================== */
const SUVB={
  L:4.92,ovF:.93,wb:2.89,R0:.378,
  /* side silhouette, top: bumper face, ledge, grille face, hood, windshield, roof, rear glass, liftgate, bumper */
  top:[[0,.42],[0,.715,.06],[.075,.758,.02],[.10,.768,.012],[.137,1.052,.07],[.5,1.112,.6],[1.48,1.152,.05],[2.32,1.768,.26],[3.5,1.79,1.6],[4.6,1.776,.13],[4.80,1.21,.035],[4.838,.80,.02],[4.92,.772,.035],[4.92,.46]],
  /* the shoulder: fender tops at the hood edge, then the belt line under the glass */
  belt:[[0,.68],[.137,1.0,.1],[.45,1.088,.4],[1.0,1.128,.5],[1.48,1.146,.5],[3.0,1.162,1.5],[4.5,1.186,.4],[4.92,1.192]],
  /* lowest edge: air dam, rockers, rear bumper */
  sill:[[0,.46],[0,.40,.05],[.32,.37,.2],[1.6,.345,.5],[3.3,.345,.5],[4.42,.40,.2],[4.92,.465,.05],[4.92,.52]],
  /* plan view half-width */
  plan:[[0,0],[0,.80,.30],[.42,.93,.55],[2.4,.936,1.2],[4.4,.932,.45],[4.92,.872,.2],[4.92,0]],
  /* the top of the textured lower cladding: front valance, rockers, the whole rear bumper */
  clad:[[0,.565],[.47,.565],[.52,.60],[4.25,.60],[4.31,.80],[4.92,.80]],
  /* greenhouse: windshield base, roof front, roof rear, rear glass end, glass base lift and inset,
     roof width, crown, the D-pillar line and the black pillars between the side windows [u, lean, half width] */
  G:{cowl:1.48,rf:2.32,rr:4.60,be:4.80,base:.012,inset:.034,tum:.80,crown:.03,cB:4.53,cT:4.36,pillars:[[2.62,-.07,.032],[3.56,-.03,.03]]},
  dome:[.32,1.42,.022],bumperF:.088,bumperR:4.845,hood0:.14,
  /* roof height, shoulder tuck, hip bulge over the front and rear arches */
  Hr:1.79,sh:.968,hip:[.018,.018],oy:1,
  /* doors (4: the rear one steps round the arch), handle stations, the fuel door, the liftgate outline,
     roof rails [u0, u1, z], where the rear wiper sits, a spare under the tail */
  doors:4,fuel:4.42,lift:{z:.71,u:4.8},rails:[2.72,4.48,.6],wiperR:4.8,underSpare:1,
  /* how far the chassis, the front parts and the rear parts sit above or below the SUV's, the exhaust's start */
  chY:0,fit:{fdy:0,rdy:0,exU:3.3}
};
/* every body the bay can build. Each one is a set of designed lines and the numbers its parts fit to */
const BODIES={suv:SUVB};
/* the 4x4, from its reference sheets: an original two-door short-wheelbase off-roader on a ladder frame.
   3.50 m long on a 2.33 m wheelbase, 1.66 m wide over the body (the black flares add the rest), 1.79 m
   tall. Very short overhangs, a flat grille face just behind the bumper, a clamshell hood rising to the
   cowl, a raked windshield, a flat roof and a vertical back with the spare on the door. */
BODIES.trail={
  L:3.50,ovF:.68,wb:2.33,R0:.415,
  top:[[0,.55],[0,.80,.02],[.06,.81,.01],[.08,1.19,.03],[.5,1.23,.6],[1.18,1.30,.03],[1.56,1.76,.06],[2.5,1.785,2],[3.44,1.78,.04],[3.48,1.27,.012],[3.50,1.23,.012],[3.50,.58]],
  belt:[[0,.78],[.08,1.18,.04],[.5,1.22,.5],[1.18,1.255,.2],[1.6,1.245,.5],[3.50,1.245]],
  sill:[[0,.58],[0,.55,.02],[.3,.52,.1],[1.0,.50,.2],[2.6,.50,.2],[3.3,.52,.1],[3.50,.56,.02],[3.50,.6]],
  plan:[[0,0],[0,.76,.08],[.1,.82,.15],[.5,.83,.4],[3.2,.83,.4],[3.50,.81,.05],[3.50,0]],
  clad:[[0,.80],[.06,.80],[.12,.62],[3.38,.62],[3.44,.74],[3.50,.74]],
  G:{cowl:1.18,rf:1.56,rr:3.44,be:3.48,base:.012,inset:.028,tum:.94,crown:.01,cB:3.40,cT:3.38,pillars:[[2.52,0,.04]]},
  dome:[.3,1.0,0],bumperF:.06,bumperR:9,hood0:.09,
  Hr:1.785,sh:.985,hip:[.008,.008],oy:1,doors:2,doorR:2.56,handles:[2.34],fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,seams:false,
  chY:.08,fit:{fdy:.1,rdy:.06,exU:2.3,sideZ:.9,ventU:-.25}
};
/* the coupe, from its reference sheets: an original front-engine V8 fastback. 4.45 m long on a long 2.88 m
   wheelbase, 1.92 m wide, 1.21 m tall. A tall blunt nose round a big grille, a long hood rising to a high
   cowl, the cabin well back, a fastback falling to a low ducktail, a narrow waist and wide rear hips. */
BODIES.coupe={
  L:4.45,ovF:.90,wb:2.88,R0:.35,
  top:[[0,.22],[0,.50,.07],[.10,.635,.12],[.8,.75,1.2],[1.62,.86,.05],[2.30,1.18,.45],[2.65,1.21,1.0],[3.05,1.17,.6],[3.95,.90,.3],[4.30,.86,.05],[4.40,.885,.02],[4.45,.84,.03],[4.45,.30]],
  belt:[[0,.48],[.12,.62,.12],[.90,.76,.4],[1.62,.79,.4],[2.5,.80,1.2],[3.78,.86,.4],[4.25,.87,.3],[4.45,.83]],
  sill:[[0,.30],[0,.20,.05],[.35,.17,.2],[1.4,.165,.3],[3.2,.165,.3],[4.05,.21,.2],[4.45,.28,.04],[4.45,.34]],
  plan:[[0,0],[0,.62,.30],[.45,.90,.55],[1.0,.95,.45],[2.3,.915,.8],[3.78,.96,.45],[4.25,.90,.3],[4.45,.74,.2],[4.45,0]],
  clad:[[0,.26],[4.45,.26]],
  G:{cowl:1.62,rf:2.30,rr:3.02,be:3.95,base:.012,inset:.03,tum:.72,crown:.03,cB:3.55,cT:3.0,pillars:[[2.92,-.12,.022]]},
  dome:[.3,1.45,.012],bumperF:.1,bumperR:9,hood0:.12,
  Hr:1.21,sh:.94,hip:[.015,.04],oy:.5,doors:2,doorR:3.0,handles:[2.78],fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,
  chY:-.15,fit:{fdy:-.21,rdy:-.22,exU:3.1,sideZ:.97,ventU:-.18,lipZ:.8,lipU:.35,epU:.2,sideEx:.96,sideExY:.03,filler:[3.9,.72]}
};
/* the wagon, from its reference sheets: an original mid-2000s family estate, as plain as a car gets. 4.72 m
   long on a 2.86 m wheelbase, 1.82 m wide, 1.43 m tall. A short soft nose, a cab-forward windshield, a long
   flat roof, three side windows and a near-upright tailgate between tall lamps. */
BODIES.wagon={
  L:4.72,ovF:.76,wb:2.86,R0:.33,
  top:[[0,.18],[0,.50,.06],[.08,.66,.10],[.16,.74,.05],[.6,.82,.6],[1.12,.94,.05],[1.80,1.39,.25],[3.0,1.43,1.6],[4.30,1.41,.12],[4.62,.98,.05],[4.72,.62,.04],[4.72,.22]],
  belt:[[0,.50],[.16,.72,.1],[.76,.82,.4],[1.12,.92,.3],[2.6,.96,1.5],[4.2,1.0,.4],[4.72,.96]],
  sill:[[0,.22],[0,.17,.04],[.35,.20,.2],[1.3,.22,.4],[3.0,.22,.4],[4.2,.24,.2],[4.72,.22,.04],[4.72,.26]],
  plan:[[0,0],[0,.76,.26],[.4,.885,.5],[2.4,.91,1.2],[4.2,.905,.45],[4.72,.84,.18],[4.72,0]],
  clad:[[0,.40],[4.2,.40],[4.35,.60],[4.72,.60]],
  G:{cowl:1.12,rf:1.80,rr:4.30,be:4.60,base:.012,inset:.03,tum:.84,crown:.03,cB:4.32,cT:4.22,pillars:[[2.36,-.04,.03],[3.42,-.02,.035]]},
  dome:[.3,.9,.006],bumperF:.1,bumperR:9,hood0:.17,
  Hr:1.43,sh:.965,hip:[.012,.012],oy:.65,doors:4,fuel:3.95,lift:{z:.6,u:4.6},rails:[1.95,4.15,.62],wiperR:4.55,underSpare:0,markers:false,
  chY:-.1,fit:{fdy:-.2,rdy:-.2,exU:3.0}
};
/* the pickup, from its reference sheets: an original mid-2000s full-size crew cab with a short bed, in factory
   off-road trim. 5.66 m long on a 3.64 m wheelbase, 1.90 m wide over the body, 1.88 m tall. A tall square
   nose round a big grille, a long flat hood, an upright cab, and an open bed with its floor at 1.0 m. */
BODIES.pickup={
  L:5.66,ovF:.87,wb:3.64,R0:.42,
  top:[[0,.55],[0,.80,.02],[.06,.82,.01],[.08,1.30,.03],[.2,1.34,.08],[1.0,1.385,.8],[1.43,1.44,.04],[2.04,1.86,.12],[3.0,1.875,2],[3.58,1.86,.04],[3.62,1.0,.01],[5.66,1.0]],
  belt:[[0,.80],[.08,1.28,.03],[.4,1.33,.4],[1.43,1.38,.3],[2.0,1.37,.6],[3.58,1.38,.4],[3.68,1.42,.03],[5.66,1.42]],
  sill:[[0,.58],[0,.55,.02],[.4,.52,.1],[1.4,.50,.2],[4.0,.50,.2],[5.2,.56,.1],[5.66,.60,.02],[5.66,.64]],
  plan:[[0,0],[0,.88,.06],[.1,.93,.15],[.6,.95,.4],[5.5,.95,.4],[5.66,.94,.03],[5.66,0]],
  clad:[[0,.80],[5.66,.80]],
  G:{cowl:1.43,rf:2.04,rr:3.58,be:3.62,base:.012,inset:.03,tum:.93,crown:.02,cB:3.50,cT:3.48,pillars:[[2.63,0,.04],[3.42,0,.06]]},
  dome:[.3,1.2,0],bumperF:.06,bumperR:9,hood0:.2,bed:3.66,
  Hr:1.875,sh:.985,hip:[.008,.008],oy:1.1,doors:4,doorStep:false,fuel:3.75,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,seams:false,
  chY:.15,fit:{fdy:.25,rdy:.2,exU:3.4,sideZ:1.0}
};
/* the muscle car, from its reference sheets: an original 1970-style V8 fastback. 4.99 m long on a 2.97 m
   wheelbase, 1.86 m wide, 1.25 m tall. A long rising hood with a power bulge, a full-width grille, the cabin
   well back, a fastback roof onto a long deck with a lip, and a haunch over the rear wheels. */
BODIES.muscle={
  L:4.99,ovF:.85,wb:2.97,R0:.31,
  top:[[0,.27],[0,.44,.02],[.05,.46,.01],[.05,.66,.015],[.10,.70,.03],[.9,.80,1.2],[1.64,.93,.05],[2.12,1.24,.2],[2.6,1.25,1.0],[2.98,1.23,.4],[4.22,.94,.3],[4.64,.91,.12],[4.88,.93,.02],[4.94,.82,.03],[4.99,.72,.02],[4.99,.32]],
  belt:[[0,.60],[.10,.68,.05],[.85,.78,.5],[1.64,.89,.3],[2.4,.92,1.0],[3.3,.92,.6],[3.82,.95,.3],[4.6,.92,.3],[4.99,.80]],
  sill:[[0,.30],[0,.27,.04],[.4,.26,.2],[1.3,.25,.3],[3.4,.25,.3],[4.5,.30,.2],[4.99,.33,.04],[4.99,.38]],
  plan:[[0,0],[0,.86,.1],[.3,.92,.3],[1.2,.93,.6],[2.6,.915,1.0],[3.82,.95,.6],[4.6,.93,.3],[4.99,.87,.08],[4.99,0]],
  clad:[[0,.28],[4.99,.28]],
  G:{cowl:1.64,rf:2.12,rr:2.98,be:4.22,base:.012,inset:.03,tum:.78,crown:.03,cB:3.42,cT:3.06,pillars:[[2.98,-.03,.018]],sails:1},
  dome:[.3,1.4,0],bumperF:.06,bumperR:9,hood0:.12,
  Hr:1.25,sh:.955,hip:[.008,.03],oy:.55,doors:2,doorR:3.02,handles:[2.80],fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:[.12,.53,.12,.55],seams:false,
  chY:-.1,fit:{fdy:-.05,rdy:-.05,exU:3.0,sideZ:.97}
};
/* the hatch, from its reference sheets: an original mid-1980s three-door turbo four-wheel-drive homologation
   special. 3.60 m over the body (3.68 with its bumpers) on a 2.41 m wheelbase, 1.70 m wide, 1.39 m tall.
   A flat bonnet, a tall glasshouse, a near-upright hatch, black bumpers and sills. */
BODIES.hatch={
  L:3.60,ovF:.63,wb:2.41,R0:.30,
  top:[[0,.24],[0,.55,.02],[.07,.57,.01],[.08,.77,.015],[.14,.795,.05],[.98,.89,.04],[1.62,1.37,.12],[2.4,1.385,1.2],[2.94,1.37,.06],[3.40,.90,.04],[3.52,.78,.03],[3.60,.74,.02],[3.60,.30]],
  belt:[[0,.55],[.08,.75,.03],[.4,.80,.4],[.98,.86,.3],[2.0,.88,.6],[3.0,.89,.4],[3.45,.86,.2],[3.60,.74]],
  sill:[[0,.30],[0,.24,.03],[.3,.22,.1],[1.0,.21,.2],[2.6,.21,.2],[3.3,.24,.1],[3.60,.30,.03],[3.60,.34]],
  plan:[[0,0],[0,.78,.06],[.15,.83,.15],[.6,.85,.4],[3.0,.85,.4],[3.45,.83,.1],[3.60,.80,.04],[3.60,0]],
  clad:[[0,.57],[.08,.57],[.14,.26],[3.4,.26],[3.5,.55],[3.6,.55]],capClad:1,
  G:{cowl:.98,rf:1.62,rr:2.94,be:3.40,base:.012,inset:.03,tum:.9,crown:.02,cB:2.90,cT:2.86,pillars:[[2.40,0,.035]]},
  dome:[.3,1.0,0],bumperF:.07,bumperR:9,hood0:.14,lipW:.62,
  Hr:1.385,sh:.98,hip:[.012,.012],oy:.75,doors:2,doorR:2.42,handles:[2.24],fuel:null,lift:null,rails:null,wiperR:3.38,underSpare:0,markers:[.70,.76],seams:false,
  chY:-.12,fit:{fdy:-.12,rdy:-.1,exU:2.4,sideZ:.88}
};
const MM={
  PAINT:V([1,1,1],MAT.PAINT),ACC:V([1,1,1],MAT.ACCENT),GL:V([0,0,0],MAT.GLASS),GLL:V([0,0,0],MAT.GLASSL),
  TRIM:V([.010,.010,.012],MAT.COL),BLACK:V([.022,.022,.024],MAT.METAL),CLAD:V([1,1,1],MAT.CLAD),CHROME:V([1,1,1],MAT.CHROME),
  MESH:V([0,0,0],MAT.MESH),HEAD:V([1,1,1],MAT.HEAD),TAIL:V([1,1,1],MAT.TAIL),AMBER:V([1,1,1],MAT.AMBER),LED:V([1,1,1],MAT.LED),
  HALO:V([1,1,1],MAT.HALO),REV:V([1,1,1],MAT.REV),SMOKE:V([1,1,1],MAT.SMOKE),REFL:V([1,1,1],MAT.REFL),PLATE:V([1,1,1],MAT.PLATE),
  SHUT:V([1,1,1],MAT.SHUT),UNDER:V([.028,.028,.03],MAT.METAL),RUBBER:V([.022,.022,.024],MAT.RUBBER),CARBON:V([1,1,1],MAT.CARBON),
  LOUVRE:V([1,1,1],MAT.LOUVRE),STEEL:V([.03,.03,.032],MAT.METAL),ALU:V([.35,.36,.38],MAT.METAL)
};
const col=(h,mat=MAT.METAL,em=0)=>V(lin(h),mat,em);
function suvDesign(look){
  const B=BODIES[look.body||'suv'],L=B.L,R=look.tyre.R,dy=look.lift+(R-B.R0);
  const D={look,B,G:B.G,L,R,dy,uFa:B.ovF,uRa:B.ovF+B.wb,uC:L/2};
  const up=k=>[k[0],k[1]+dy,k[2]||0];
  D.top=profLine(B.top.map(up),L,1);D.belt=profLine(B.belt.map(up),L,1);D.sill=profLine(B.sill.map(up),L,-1);D.plan=profLine(B.plan,L,1);
  D.cladY=pwl(B.clad.map(k=>[k[0],k[1]+dy]));
  D.Hr=B.Hr+dy;D.sh=B.sh;
  const a=look.archR;D.arch={a,b:a*(look.archH||.985),n:look.archN||2.3,cy:B.R0+dy};
  /* the rear can run its own arch and tyre (drag slicks); then the body pitches over the front axle so the
     rear arch sits round the bigger wheel: D.pitch, about the front contact of the axle line */
  const ar=look.archRr||a;D.archB=look.archRr?{a:ar,b:ar*(look.archHr||look.archH||.985),n:look.archNr||D.arch.n,cy:D.arch.cy}:D.arch;
  D.Rr=look.tyreR?look.tyreR.R:R;D.pitch=Math.asin((R-D.Rr)/B.wb);
  D.cO=look.clad===false?0:.012;
  D.dome=u=>B.dome[2]*plat(u,(B.dome[0]+B.dome[1])/2,(B.dome[1]-B.dome[0])/2,.12);
  D.X=u=>D.uC-u;
  return D;
}
/* the arch opening (a superellipse, squarer as n grows): its top edge at u, or -1 */
function archY(D,u){let y=-1;for(const ua of [D.uFa,D.uRa]){const A=ua===D.uRa?D.archB:D.arch,d=Math.abs(u-ua)/A.a;if(d<1)y=Math.max(y,A.cy+A.b*Math.pow(1-Math.pow(d,A.n),1/A.n));}return y;}
function archPt(D,ua,phi,grow=0){const A=ua===D.uRa?D.archB:D.arch,c=Math.cos(phi),s=Math.sin(phi),e=2/A.n;return [ua-(A.a+grow)*Math.sign(c)*Math.pow(Math.abs(c),e),A.cy+(A.b+grow)*Math.pow(Math.abs(s),e)];}
/* 14 key points (z,y) of the right half-section at u: 0 floor edge, 1 sill lip, 2 cladding top, 3 the
   step onto the paint, 4-5 body side, 6 shoulder, 7 shoulder top, 8-12 deck or greenhouse, 13 centre */
function secKeys(D,u){
  const G=D.G,L=D.L,hb=D.plan(u),hs=hb*D.sh;
  const ySill=D.sill(u);let yS=ySill;const ya=archY(D,u);
  const arch=clamp((ya-yS)/.05,0,1);if(ya>yS)yS=ya;
  const ends=sm01(u/.35)*sm01((L-u)/.35),yT=D.top(u),bed=D.B.bed&&u>=D.B.bed;
  let yB=bed?D.belt(u):Math.min(D.belt(u),yT+.15*ends);yB=Math.max(yB,yS+.1);
  const yc=Math.max(yS+.02,Math.min(D.cladY(u),yB-.12)),cO=D.cO,sk=D.look.skirt||0;
  const hip=Math.max(D.B.hip[0]*plat(u,D.uFa,.42,.3),D.B.hip[1]*plat(u,D.uRa,.42,.3)),hl=hb+hip;
  const P=new Array(14);
  /* the floor rides up over the wheels, but never through a hood that sits lower than the arches */
  P[0]=[hb*.84,Math.min(Math.max(ySill+.04,yS),yT-.1)];
  P[1]=[hl*lerp(.96,.985,arch)+cO+sk*.02*(1-arch),yS-sk*.03*(1-arch)];
  P[2]=[hl*.995+cO+sk*.012*(1-arch),yc];
  P[3]=[hl*.99,yc+.006];
  P[4]=[hl,yc+(yB-yc)*.45];
  P[5]=[hl*.5+hs*.5,yB-(yB-yc)*.14];
  P[6]=[hs,yB];
  P[7]=[hs-.028,yB+.011];
  const z7=P[7][0],y7=P[7][1],dm=D.dome(u);
  const dk=(fr,d)=>[z7*fr,yT+(y7-yT)*Math.pow(fr,2.4)+d];
  let Q=[dk(.86,0),dk(.66,0),dk(.47,0),dk(.43,dm),dk(.18,dm)];
  const yG=yB+G.base,gk=sm01((yT-yG)/.09);
  if(gk>0){
    const zG=Math.min(z7-.006,hs-G.inset),kc=sm01((yT-yG)/.22),cr=G.crown;
    const yE=yT-(cr+.03)*kc,zR=hs*G.tum,te=clamp((yE-yG)/Math.max(.05,D.Hr-yG),0,1),zE=zG+(zR-zG)*te;
    const g=[[zG,yG],[(zG+zE)/2+.006*kc,(yG+yE)/2],[zE,yE],[zE-.05*kc,yE+.026*kc],[zE*.52,yT-cr*.22*kc]];
    Q=Q.map((d,i)=>[lerp(d[0],g[i][0],gk),lerp(d[1],g[i][1],gk)]);
  }
  /* a pickup bed: the rail's inner edge, a straight inner wall, the floor */
  if(bed)Q=[[z7-.035,y7+.004],[z7-.045,y7-.03],[z7-.055,yT+.025],[z7-.09,yT],[z7*.5,yT]];
  for(let i=0;i<5;i++)P[8+i]=Q[i];
  P[13]=[0,yT+dm*(1-gk)];
  return {P,gk:bed?0:gk,yG,yT,yB,yS,yc,arch,hb,hs,dm,bed};
}
/* refine to 27 points: Catmull-Rom midpoints, with creases (sill lip, cladding step, shoulder, glass
   base, drip rail, the edges of the hood dome) cut sharp by extrapolating along the span */
const NK=14,NR=2*(NK-1)+1;
function secRing(D,u){
  const s=secKeys(D,u),P=s.P,dmk=s.dm>.002?1-s.gk:0;
  const cw=s.bed?[1,1,1,1,0,0,.85,1,1,1,1,1,0,0]:[1,1,1,1,0,0,.85,0,s.gk,0,Math.max(.6*s.gk,dmk),dmk,0,0];
  const p=[];
  for(let i=0;i<NK-1;i++){const a=P[i],b=P[i+1],pa=i>0?P[i-1]:null,pb=i<NK-2?P[i+2]:[-P[NK-2][0],P[NK-2][1]];
    const ea=[2*a[0]-b[0],2*a[1]-b[1]],eb=[2*b[0]-a[0],2*b[1]-a[1]],wa=i===0?1:cw[i],wb=cw[i+1];
    const p0=pa?[lerp(pa[0],ea[0],wa),lerp(pa[1],ea[1],wa)]:ea,p3=[lerp(pb[0],eb[0],wb),lerp(pb[1],eb[1],wb)];
    p.push(a,[(-p0[0]+9*a[0]+9*b[0]-p3[0])/16,(-p0[1]+9*a[1]+9*b[1]-p3[1])/16]);}
  p.push(P[NK-1]);s.p=p;return s;
}
function faceMat(D,u,K,y,gk,yG){
  const G=D.G,lk=D.look;
  if(K===0)return MM.UNDER;
  if(K<=2)return D.cO>0?MM.CLAD:MM.PAINT;
  if(u>D.B.bumperR&&K>=3&&lk.rearClad!==false&&D.cO>0)return MM.CLAD;
  if(K<=7)return MM.PAINT;
  /* the bed is lined; the cab's back wall is glass only above the rails */
  if(D.B.bed){if(u>=D.B.bed)return MM.CLAD;if(u>G.rr&&y<D.belt(u)+.06)return MM.PAINT;}
  if(u<G.cowl||u>G.be)return MM.PAINT;
  if(K<=9){if(gk<.5)return MM.PAINT;const t=clamp((y-yG)/Math.max(.05,D.Hr-yG),0,1);return u<lerp(G.cB,G.cT,t)-.03?MM.TRIM:MM.PAINT;}
  if(K===10)return MM.PAINT;
  if(u<G.rf)return MM.GLL;
  if(u<G.rr)return lk.roofBlack?MM.TRIM:MM.PAINT;
  /* a fastback whose rear window sits between body-colour sails */
  if(G.sails&&K===11)return MM.PAINT;
  return MM.GL;
}
/* ---------- the builder ---------- */
function buildSUV(look,build){
  const D=suvDesign(look),G=D.G,L=D.L,X=D.X,dy=D.dy;
  const mb=new MB(),pm=new MB();
  /* stations: 5 cm everywhere, 5 mm across the vertical faces at both ends, dense around the arches
     and wherever the greenhouse changes */
  const US=[];{const s=new Set(),a=u=>{if(u>=0&&u<=L)s.add(Math.round(u*4000)/4000);};
    for(let u=0;u<=L+1e-6;u+=.05)a(u);
    for(let u=0;u<.2;u+=.005)a(u);for(let u=L-.2;u<=L+1e-6;u+=.005)a(u);
    for(const ua of [D.uFa,D.uRa]){for(let k=0;k<=28;k++)a(archPt(D,ua,k/28*PI)[0]);a(ua-D.arch.a-.012);a(ua+D.arch.a+.012);}
    for(let u=G.cowl-.06;u<G.cowl+.3;u+=.012)a(u);for(let u=G.rr-.06;u<G.be+.06;u+=.012)a(u);
    const B=D.B;for(const k of [G.rf,G.cB,G.cT,B.bumperR,B.bumperF,...B.clad.slice(1,-1).map(c=>c[0]),B.dome[0],B.dome[1]])a(k-.012),a(k),a(k+.012);
    for(const [pu,ln,w] of G.pillars)for(const o of [-w,w])a(pu+o),a(pu+ln+o);
    const srt=[...s].sort((p,q)=>p-q);for(const u of srt)if(!US.length||u-US[US.length-1]>.002)US.push(u);
    if(US[US.length-1]<L-1e-6)US.push(L);else US[US.length-1]=L;}
  const memo=new Map(),ringAt=u=>{const k=Math.round(u*1e4);let r=memo.get(k);if(!r){r=secRing(D,k/1e4);memo.set(k,r);}return r;};
  const rings=US.map(ringAt);
  /* skin */
  for(let i=0;i<US.length-1;i++){
    const A=rings[i],B=rings[i+1],ua=US[i],ub=US[i+1],um=(ua+ub)/2,gk=(A.gk+B.gk)/2,xa=X(ua),xb=X(ub);
    for(let j=0;j<NR-1;j++){
      const a0=A.p[j],a1=A.p[j+1],b0=B.p[j],b1=B.p[j+1];
      if(Math.abs(a0[0]-a1[0])+Math.abs(a0[1]-a1[1])+Math.abs(b0[0]-b1[0])+Math.abs(b0[1]-b1[1])<1e-5)continue;
      const m=faceMat(D,um,j>>1,(a0[1]+a1[1]+b0[1]+b1[1])/4,gk,(A.yG+B.yG)/2);
      for(const sd of [1,-1])mb.quad([xa,a0[1],a0[0]*sd],[xb,b0[1],b0[0]*sd],[xb,b1[1],b1[0]*sd],[xa,a1[1],a1[0]*sd],m[0],m[1],m[2]);
    }
    mb.quad([xa,A.p[0][1],A.p[0][0]],[xb,B.p[0][1],B.p[0][0]],[xb,B.p[0][1],-B.p[0][0]],[xa,A.p[0][1],-A.p[0][0]],MM.UNDER[0],0,MM.UNDER[2]);
  }
  /* the faces at both ends, in horizontal bands so the bumpers can be two-tone */
  for(const [i,front] of [[0,1],[US.length-1,0]]){const r=rings[i].p,x=X(US[i]),gate=!front&&look.noTailgate&&rings[i].bed,zi=gate?r[16][0]:0,yf=rings[i].yT+.01;
    for(let j=0;j<NR-1;j++){const a=r[j],b=r[j+1],ym=(a[1]+b[1])/2;
      const m=front?(ym<D.cladY(0)&&D.cO>0?MM.CLAD:MM.PAINT):(D.cO>0&&look.rearClad!==false&&(!D.B.capClad||ym<D.cladY(L))?MM.CLAD:MM.PAINT);
      /* with no tailgate, above the floor only the bed's sides are capped */
      if(gate&&Math.max(a[1],b[1])>yf){if(j<14)for(const sd of [1,-1])mb.quad([x,a[1],a[0]*sd],[x,b[1],b[0]*sd],[x,b[1],zi*sd],[x,a[1],zi*sd],m[0],m[1],m[2]);continue;}
      mb.quad([x,a[1],a[0]],[x,b[1],b[0]],[x,b[1],-b[0]],[x,a[1],-a[0]],m[0],m[1],m[2]);}
  }
  /* wheel wells: inner walls so the arches read as deep holes */
  const ww0=pm.p.length/9;
  for(const ua of [D.uFa,D.uRa]){const zi=D.plan(ua)*.78,n=16;
    for(let k=0;k<n;k++){const p0=archPt(D,ua,PI*k/n),p1=archPt(D,ua,PI*(k+1)/n),yb=D.arch.cy-.06;
      for(const sd of [1,-1])pm.quad([X(p0[0]),yb,zi*sd],[X(p1[0]),yb,zi*sd],[X(p1[0]),p1[1],zi*sd],[X(p0[0]),p0[1],zi*sd],MM.UNDER[0],0,MM.UNDER[2]);
      for(const sd of [1,-1])pm.quad([X(p0[0]),p0[1],zi*sd],[X(p1[0]),p1[1],zi*sd],[X(p1[0]),p1[1],D.plan(p1[0])*.9*sd],[X(p0[0]),p0[1],D.plan(p0[0])*.9*sd],MM.UNDER[0],0,MM.UNDER[2]);}}
  const ww1=pm.p.length/9;
  /* ---------- surface lookups for decals and parts ---------- */
  const inside=(u,z,y)=>zOut(ringAt(u).p,y)>=Math.abs(z);
  /* first station (from the nose, or from the tail) whose section holds (z,y), refined by bisection */
  const uFront=(z,y)=>{if(inside(0,z,y))return 0;let i=1;while(i<US.length&&!inside(US[i],z,y))i++;if(i>=US.length)return 0;
    let a=US[i-1],b=US[i];for(let k=0;k<6;k++){const m=(a+b)/2;if(inside(m,z,y))b=m;else a=m;}return b;};
  const uRear=(z,y)=>{const n=US.length-1;if(inside(L,z,y))return L;let i=n-1;while(i>0&&!inside(US[i],z,y))i--;if(i<=0)return L;
    let a=US[i],b=US[i+1];for(let k=0;k<6;k++){const m=(a+b)/2;if(inside(m,z,y))a=m;else b=m;}return a;};
  const topY=(u,z)=>{const p=ringAt(u).p;let y=yAt(p,Math.abs(z));if(y<-1e8){let zm=0;for(const q of p)zm=Math.max(zm,q[0]);y=yAt(p,Math.min(Math.abs(z),zm*.995));}return y;};
  const sideZ=(u,y)=>{const p=ringAt(u).p;let z=zOut(p,y);if(z<0){let y0=1e9,y1=-1e9;for(const q of p){y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}z=zOut(p,clamp(y,y0+.001,y1-.001));}return Math.max(0,z);};
  const MAP={F:(q,o)=>[X(uFront(q[0],q[1]))+o,q[1],q[0]],R:(q,o)=>[X(uRear(q[0],q[1]))-o,q[1],q[0]],
    T:(q,o)=>[X(q[0]),topY(q[0],q[1])+o,q[1]],SR:(q,o)=>[X(q[0]),q[1],sideZ(q[0],q[1])+o],SL:(q,o)=>[X(q[0]),q[1],-(sideZ(q[0],q[1])+o)]};
  /* a convex 2-D shape in one view, fanned and split where the surface under it bends, then wrapped on.
     F and R shapes are (z, y); T shapes are (u, z); S shapes are (u, y) and go on both sides */
  function decal(view,poly,m,off=.005,res=.05){
    if(view==='S'){decal('SR',poly,m,off,res);decal('SL',poly,m,off,res);return;}
    if(poly.length<3)return;
    let cx=0,cy=0;for(const q of poly){cx+=q[0];cy+=q[1];}cx/=poly.length;cy/=poly.length;
    const cache=new Map(),mp=q=>{const key=Math.round(q[0]*1e4)+','+Math.round(q[1]*1e4);let r=cache.get(key);if(!r){r=MAP[view](q,off);cache.set(key,r);}return r;};
    const out=[],sub=(t,d)=>{const [a,b,c]=t,l=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]),L1=l(a,b),L2=l(b,c),L3=l(c,a),mx=Math.max(L1,L2,L3);
      if(mx<res||d>8){out.push(t);return;}
      const [p,q,o]=mx===L1?[a,b,c]:mx===L2?[b,c,a]:[c,a,b],M=[(p[0]+q[0])/2,(p[1]+q[1])/2];
      if(mx<.45){const P=mp(p),Q=mp(q),PM=mp(M);if(Math.hypot(PM[0]-(P[0]+Q[0])/2,PM[1]-(P[1]+Q[1])/2,PM[2]-(P[2]+Q[2])/2)<.0012){out.push(t);return;}}
      sub([p,M,o],d+1);sub([M,q,o],d+1);};
    for(let k=0;k<poly.length;k++)sub([[cx,cy],poly[k],poly[(k+1)%poly.length]],0);
    for(const t of out)pm.tri(mp(t[0]),mp(t[1]),mp(t[2]),m[0],m[1],m[2]);
  }
  /* a stroke of width w along a polyline, as one decal per segment (shut lines, pinstripes) */
  const line=(view,pts,w,m,off=.003)=>{for(let i=0;i<pts.length-1;i++){const [u0,y0]=pts[i],[u1,y1]=pts[i+1],dx=u1-u0,dyy=y1-y0,l=Math.hypot(dx,dyy)||1,nx=-dyy/l*w/2,ny=dx/l*w/2,ex=dx/l*w*.4,ey=dyy/l*w*.4;
    decal(view,[[u0+nx-ex,y0+ny-ey],[u1+nx+ex,y1+ny+ey],[u1-nx+ex,y1-ny+ey],[u0-nx-ex,y0-ny-ey]],m,off,.08);}};
  const ring2=(view,xc,yc,r0,r1,m,off,n=16)=>{for(let k=0;k<n;k++){const a=k/n*TAU,b=(k+1)/n*TAU;decal(view,[[xc+Math.cos(a)*r0,yc+Math.sin(a)*r0],[xc+Math.cos(a)*r1,yc+Math.sin(a)*r1],[xc+Math.cos(b)*r1,yc+Math.sin(b)*r1],[xc+Math.cos(b)*r0,yc+Math.sin(b)*r0]],m,off,.2);}};
  const pair=fn=>{fn(1);fn(-1);};
  const K={D,G,L,X,dy,mb,pm,decal,line,ring2,pair,uFront,uRear,topY,sideZ,ringAt,secKeys:u=>secKeys(D,u),inside};
  bodyCommon(K);
  if(FACES[look.face])FACES[look.face](K);if(TAILS[look.tail])TAILS[look.tail](K);
  buildParts(K);
  const S={skin:mb.p.length/9,parts:0};
  mb.smooth(34,[0,D.B.oy+dy*.5,0]);pm.smooth(28);S.parts=pm.p.length/9;
  /* the hood comes away from the body so it can open in the garage, and what lies under it (the floor and
     the wheel wells where they cross the bay) is kept apart, to be drawn only while the hood is shut */
  const h0=D.B.hood0,h1=G.cowl-.05,hz=u=>Math.max(.2,D.plan(u)*D.sh-.07);
  D.hood={u0:h0,u1:h1,hz,hinge:[X(h1),topY(h1,0)]};D.topY=topY;
  const where=(x,y,z)=>{const u=D.uC-x;if(u<h0||u>h1)return 0;const zh=hz(u),az=Math.abs(z);if(az>zh)return 0;
    const ye=topY(u,az);return y>=ye-.015?1:az<zh-.02&&y<ye-.05?2:0;};
  /* an engine that sticks out through the hood (a blower) is part of the car on the road: build its bay now
     and cut its hole in the hood */
  const BY=look.engineOut&&build?buildBay(build,D):null,hole=BY&&BY.hole;
  const out=[new MB(),new MB(),new MB()];
  const put=(vs,mat,hide)=>{let x=0,y=0,z=0;for(const v of vs){x+=v.p[0]/3;y+=v.p[1]/3;z+=v.p[2]/3;}let w=where(x,y,z);if(w===2&&!hide)w=0;const d=out[w];
    if(w===1&&hole&&x<hole[0]&&x>hole[1]&&Math.abs(z)<hole[2])return;
    for(const v of vs){d.p.push(...v.p);d.n.push(...v.n);d.c.push(...v.c);d.m.push(mat);}};
  /* a skin triangle that straddles the hood's edge is cut along it, so the hood comes away cleanly */
  const lv=(a,b,t)=>{const n=[0,1,2].map(k=>a.n[k]+(b.n[k]-a.n[k])*t),l=Math.hypot(...n)||1;
    return {p:[0,1,2].map(k=>a.p[k]+(b.p[k]-a.p[k])*t),n:n.map(q=>q/l),c:[0,1,2,3].map(k=>a.c[k]+(b.c[k]-a.c[k])*t)};};
  const clipTo=(vs,f,keep)=>{const o=[];for(let i=0;i<vs.length;i++){const a=vs[i],b=vs[(i+1)%vs.length],fa=f(a)*keep,fb=f(b)*keep;
    if(fa>=0)o.push(a);if((fa>=0)!==(fb>=0))o.push(lv(a,b,fa/(fa-fb)));}return o;};
  const split=(src,hideOk,cut)=>{const P=src.p,N=src.n,C=src.c,Mt=src.m;
    for(let t=0;t<P.length/9;t++){const vs=[0,1,2].map(k=>({p:[P[t*9+k*3],P[t*9+k*3+1],P[t*9+k*3+2]],n:[N[t*9+k*3],N[t*9+k*3+1],N[t*9+k*3+2]],c:[C[t*12+k*4],C[t*12+k*4+1],C[t*12+k*4+2],C[t*12+k*4+3]]})),mat=Mt[t*3],hide=hideOk(t);
      if(cut){const uc=D.uC-(vs[0].p[0]+vs[1].p[0]+vs[2].p[0])/3,zc=(vs[0].p[2]+vs[1].p[2]+vs[2].p[2])/3;
        if(uc>=h0&&uc<=h1){const sg=zc<0?-1:1,c=hz(uc),f=v=>sg*v.p[2]-c,fs=vs.map(f);
          if(Math.min(...fs)<0&&Math.max(...fs)>0){for(const keep of [1,-1]){const q=clipTo(vs,f,keep);for(let k=1;k<q.length-1;k++)put([q[0],q[k],q[k+1]],mat,hide);}continue;}}}
      put(vs,mat,hide);}};
  /* from the skin only its underside is hidden; from the parts only the wheel wells */
  split(mb,t=>mb.m[t*3]===MAT.METAL&&Math.abs(mb.c[t*12]-MM.UNDER[0][0])<1e-6,true);split(pm,t=>t>=ww0&&t<ww1,false);
  const n=out[0].p.length+out[1].p.length+out[2].p.length;
  return {body:out[0].build(),hood:out[1].build(),hide:out[2].build(),D,bay:BY,tris:n/9,stats:S};
}
/* ---------- glass, pillars, shut lines, handles, markers, mirrors, wipers: every build has these ---------- */
function bodyCommon(K){
  const {D,G,L,X,dy,pm,decal,line,pair,topY,sideZ,ringAt}=K,lk=D.look,ks=u=>secKeys(D,u);
  /* side glass: bounded by the glass base, the drip rail, the A-pillar and the D-pillar line; split by the
     black B and C pillars; the front window starts behind a small black sail for the mirror */
  {const f=.018;let u0=G.cowl;while(u0<G.cB){const k=ks(u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
    const ue=Math.max(G.cT,G.cB)+.03,top=[],bot=[];
    for(let u=u0;u<ue;u+=.025){const k=ks(u);top.push([u,k.P[10][1]-f]);}{const k=ks(ue);top.push([ue,k.P[10][1]-f]);}
    for(let u=ue;u>u0;u-=.025){const k=ks(u);bot.push([u,k.yG+f*.8]);}bot.push([u0,ks(u0).yG+f*.8]);
    const clip=(P,a,b,keepLeft)=>{const o=[],side=q=>((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]))*(keepLeft?1:-1)>=0;
      for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],sp=side(p),sq=side(q);if(sp)o.push(p);if(sp!==sq){const d1=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),d2=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]),t=d1/(d1-d2);o.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
      return o;};
    const yb=ks(G.cB).yG,yt=D.Hr;
    let poly=clip([...top,...bot],[G.cB,yb],[G.cT,yt],true);
    /* the sail: the front window starts where the door frame does */
    const ys=ks(u0+.2).yG;poly=clip(poly,[u0+.21,ys],[u0+.05,ys+.3],false);
    const cuts=G.pillars.map(([pu,ln,w])=>({a:o=>[pu+o,yb-.1],b:o=>[pu+ln+o,yt+.1],w}));
    const tints=[lk.tintF||MM.GLL,lk.tintR||MM.GL,lk.tintR||MM.GL];
    for(let i=0;i<=cuts.length;i++){let p=poly;
      if(i>0){const c=cuts[i-1];p=clip(p,c.a(c.w),c.b(c.w),false);}
      if(i<cuts.length){const c=cuts[i];p=clip(p,c.a(-c.w),c.b(-c.w),true);}
      decal('S',p,tints[i],.004,.12);}
    /* a black seal along the glass base */
    const sl=[];for(let u=u0+.03;u<G.cB-.02;u+=.1)sl.push([u,ks(u).yG+.006]);sl.push([G.cB-.02,ks(G.cB-.02).yG+.006]);
    line('S',sl,.012,MM.TRIM,.005);}
  /* shut lines: hood, front and rear doors (the rear one steps round the arch), fuel door, bumper seams */
  {const w=.0055,yb=u=>D.sill(u)+.075,yt=u=>D.belt(u)-.02,A=D.arch,B=D.B;
    const fd=G.cowl+.06,bd=G.pillars[0][0]-.005;
    line('S',[[fd,yb(fd)+.04],[fd-.012,yt(fd)-.02],[fd+.03,yt(fd)+.012]],w,MM.SHUT);
    if(B.doors===2){
      /* one long door: its back edge runs straight down a little behind the pillar */
      const rd=B.doorR;line('S',[[rd,yt(rd)+.012],[rd-.015,yb(rd)]],w,MM.SHUT);line('S',[[fd+.04,yb(fd)+.02],[rd-.02,yb(rd)]],w,MM.SHUT);
    }else{
      const rd=G.pillars[1][0]+.02;
      line('S',[[bd+.01,yb(bd)],[bd-.01,yt(bd)+.012]],w,MM.SHUT);
      if(B.doorStep===false){line('S',[[rd,yt(rd)+.012],[rd,yb(rd)]],w,MM.SHUT);line('S',[[fd+.04,yb(fd)+.02],[bd-.02,yb(bd)]],w,MM.SHUT);line('S',[[bd+.03,yb(bd)],[rd-.02,yb(rd)]],w,MM.SHUT);}
      else{const ra=archPt(D,D.uRa,PI*.14,.06),rb=archPt(D,D.uRa,PI*.42,.06);
      line('S',[[rd,yt(rd)+.012],[rd-.02,rb[1]+.08],[rb[0],rb[1]],[ra[0],ra[1]],[ra[0]+.01,D.sill(ra[0])+.06]],w,MM.SHUT);
      line('S',[[fd+.04,yb(fd)+.02],[bd-.02,yb(bd)]],w,MM.SHUT);line('S',[[bd+.03,yb(bd)],[ra[0]-.04,yb(ra[0])]],w,MM.SHUT);}}
    /* front bumper to fender, and rear bumper to quarter panel */
    if(B.seams!==false){const fa=archPt(D,D.uFa,PI*.08,.07);
      line('S',[[.12,D.cladY(.12)+.15],[.32,D.cladY(.3)+.16],[fa[0]-.02,fa[1]+.02]],w,MM.SHUT);
      const rq=archPt(D,D.uRa,PI*.94,.07),ur=L-.32;
      line('S',[[rq[0]+.02,rq[1]+.02],[ur,D.cladY(ur)+.02],[L-.05,D.cladY(L)+.01]],w,MM.SHUT);}
    /* hood: along the fender tops and across the cowl */
    const hz=u=>Math.max(.2,D.plan(u)*D.sh-.07),u1=G.cowl-.05;
    const um=Math.min(1.2,u1-.1);pair(s=>line('T',[[.2,s*(hz(.2)-.02)],[.6,s*hz(.6)],[um,s*hz(um)],[u1,s*hz(u1)]],w,MM.SHUT,.004));
    line('T',[[u1,-hz(u1)],[u1,hz(u1)]],w,MM.SHUT,.004);
    /* liftgate outline on the tail */
    if(!lk.noLiftLine&&B.lift){const yl=D.cladY(L)+.02,zl=B.lift.z;
      line('R',[[-zl,yl+.02],[zl,yl+.02]],w,MM.SHUT,.004);pair(s=>line('R',[[s*zl,yl+.02],[s*(zl+.01),D.belt(B.lift.u)-.04],[s*(zl-.01),D.Hr-.15]],w,MM.SHUT,.004));}
    /* fuel door on the right rear quarter */
    const f=B.fuel,yf=D.belt(f+.08);
    if(!lk.noFuel&&f){decal('SR',RR2(f,f+.18,yf-.25,yf-.1,.03),MM.SHUT,.0035,.05);decal('SR',RR2(f+.01,f+.17,yf-.24,yf-.11,.024),MM.PAINT,.005,.05);}}
  /* door handles, a little recessed */
  if(!lk.noHandles)for(const u of D.B.handles||[G.pillars[0][0]-.2,G.pillars[1][0]-.17]){const y=D.belt(u)-.09;
    decal('S',RR2(u-.09,u+.06,y-.022,y+.022,.014),MM.TRIM,.004,.05);decal('S',RR2(u-.085,u+.055,y-.016,y+.016,.012),lk.handles||MM.CHROME,.007,.05);}
  /* side markers on the bumper corners */
  const mk=D.B.markers;
  if(!lk.noMarkers&&Array.isArray(mk)){decal('S',RR2(mk[0],mk[0]+.12,mk[1]+dy,mk[1]+dy+.035,.012),MM.AMBER,.004);if(mk.length>2)decal('S',RR2(L-mk[2]-.12,L-mk[2],mk[3]+dy,mk[3]+dy+.035,.012),MM.TAIL,.004);}
  else if(!lk.noMarkers&&mk!==false){decal('S',RR2(.20,.33,D.cladY(.25)+.05,D.cladY(.25)+.085,.012),MM.AMBER,.004);
    decal('S',RR2(L-.30,L-.17,D.cladY(L)-.12,D.cladY(L)-.085,.012),MM.TAIL,.004);}
  /* wipers lying at the base of the windshield, and one on the rear glass */
  {const u=G.cowl+.07,y0=topY(u,0);
    for(const [z0,z1] of [[-.62,.06],[.02,.66]])line('T',[[u,z0],[u+.02,z1]],.014,MM.TRIM,.012);
    const wr=D.B.wiperR;if(wr)line('R',[[.04,D.belt(wr)+.1],[.42,D.belt(wr)+.22]],.012,MM.TRIM,.012);}
  /* mirrors: a black base on the sail and a big housing with a painted cap */
  mirrors(K);
}
function mirrors(K){
  const {D,G,X,pm,pair}=K,lk=D.look;let u0=G.cowl;while(u0<G.cB){const k=secKeys(D,u0);if(k.P[10][1]-k.yG>.07)break;u0+=.01;}
  const k=secKeys(D,u0+.1),ub=u0+.1,yb=k.yG,zb=k.P[8][0];
  pair(s=>{
    if(lk.mirror==='race'){
      tubeAB(pm,[X(ub),yb+.05,s*zb],[X(ub+.02),yb+.1,s*(zb+.12)],.012,6,MM.BLACK);
      const c=[X(ub+.03),yb+.11,s*(zb+.15)];rbox(pm,c,[1,0,0],[0,1,0],[0,0,1],[.05,.035,.075],MM.PAINT,.35,12,6);
      pm.quad([c[0]-.051,c[1]-.025,c[2]-.06],[c[0]-.051,c[1]+.025,c[2]-.06],[c[0]-.051,c[1]+.025,c[2]+.06],[c[0]-.051,c[1]-.025,c[2]+.06],[0,0,0],0,MAT.GLASS);return;}
    /* the sail block on the door */
    obox(pm,[X(ub-.02),yb+.035,s*(zb+.005)],[1,0,0],[0,1,0],[0,0,1],[.075,.035,.018],MM.TRIM);
    /* the arm */
    obox(pm,[X(ub+.0),yb+.06,s*(zb+.06)],[1,0,0],[0,1,0],[0,0,1],[.045,.022,.05],MM.TRIM);
    const c=[X(ub+.02),yb+.1,s*(zb+.18)],ax=V3.norm([1,0,-.1*s]),az=V3.norm([.1*s,0,1]);
    rbox(pm,[c[0]+.008,c[1]+.025,c[2]],ax,[0,1,0],az,[.064,.085,.138],lk.mirrorCap||MM.PAINT,.3,14,8);
    rbox(pm,[c[0]+.002,c[1]-.04,c[2]],ax,[0,1,0],az,[.062,.05,.134],MM.TRIM,.3,14,6);
    /* the glass, facing back */
    const g=[c[0]-.058,c[1],c[2]];pm.quad([g[0],g[1]-.085,g[2]-.12],[g[0],g[1]+.09,g[2]-.12],[g[0],g[1]+.09,g[2]+.12],[g[0],g[1]-.085,g[2]+.12],[0,0,0],0,MAT.GLASSL);
    /* turn repeater on the cap's lower edge */
    obox(pm,[c[0]+.03,c[1]-.03,c[2]+s*.07],[1,0,0],[0,1,0],[0,0,1],[.012,.006,.04],MM.AMBER);
  });
}

