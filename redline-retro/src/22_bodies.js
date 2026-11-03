/* =====================================================================================
   THE 4X4 — its face and tail, and the parts only it wears. Heights are in its own body
   coordinates (Y adds the lift and the bigger tyres).
   ===================================================================================== */
/* two round lamps in a flat black grille panel, five slots between them, small amber squares at the top corners */
FACES.trail=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.72,.72,Y(.84),Y(1.15),.02),MM.TRIM,.004);
  for(let k=0;k<5;k++){const y=.885+k*.052;decal('F',RR2(-.4,.4,Y(y),Y(y+.03),.008),MM.MESH,.007);}
  pair(s=>{
    ring2('F',s*.565,Y(.99),.085,.104,MM.CHROME,.008,20);decal('F',EL2(s*.565,Y(.99),.085,.085,20),MM.HEAD,.009);decal('F',EL2(s*.565,Y(.99),.02,.02,8),MM.CHROME,.011);
    decal('F',RR2(s*.745,s*.795,Y(1.085),Y(1.145),.008),MM.AMBER,.007);
  });
};
/* lamps low in the corners, red over a white reverse lens; the side-hinged door with its handle by the spare */
TAILS.trail=K=>{
  const {decal,line,pair,dy}=K,Y=y=>y+dy,w=.0055;
  pair(s=>{
    decal('R',RR2(s*.64,s*.79,Y(.86),Y(1.04),.012),MM.TAIL,.005);
    decal('R',RR2(s*.655,s*.775,Y(.875),Y(.925),.006),MM.REV,.008);
  });
  line('R',[[-.6,Y(.78)],[.6,Y(.78)],[.6,Y(1.25)],[-.6,Y(1.25)],[-.6,Y(.78)]],w,MM.SHUT,.004);
  decal('R',RR2(-.56,-.44,Y(1.1),Y(1.135),.01),MM.TRIM,.006);
};
/* a red D-ring shackle hanging from a tab: bow, pin, tab */
function shackle(pm,c,tab=V(lin('#1c1d1f'),MAT.METAL)){
  const sc=V(lin('#c8241c'),MAT.METAL),[cx,cy,z]=c,r=.034,pts=[];
  obox(pm,[cx-.01,cy+.03,z],[1,0,0],[0,1,0],[0,0,1],[.03,.035,.012],tab);
  for(let k=0;k<=8;k++){const t=-PI/2+PI*k/8;pts.push([cx+.03+Math.cos(t)*r*.6,cy-.02+Math.sin(t)*r,z]);}
  tubePath(pm,[[cx,cy-.02-r,z],...pts,[cx,cy-.02+r,z]],.01,6,sc);
  tubeAB(pm,[cx-.005,cy-.02-r-.015,z-.02],[cx-.005,cy-.02-r-.015,z+.02],.008,6,sc);
}
/* the factory bumper: a black steel bar as wide as the tyres, red shackles under it, a skid plate behind */
FRONTS.trail=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x0=X(0)+.03;
  obox(pm,[x0,Y(.735),0],[1,0,0],[0,1,0],[0,0,1],[.05,.075,.84],S);
  pair(s=>{obox(pm,[x0-.04,Y(.735),s*.86],V3.norm([1,0,-s*.9]),[0,1,0],V3.norm([s*.9,0,1]),[.035,.07,.05],S);shackle(pm,[x0+.03,Y(.62),s*.37],S);});
  obox(pm,[X(.3),Y(.5),0],V3.norm([1,.3,0]),V3.norm([-.3,1,0]),[0,0,1],[.28,.008,.45],S);
  for(let k=-3;k<=3;k++)obox(pm,[X(.12),Y(.555),k*.1],V3.norm([1,.3,0]),V3.norm([-.3,1,0]),[0,0,1],[.025,.0015,.02],V([.006,.006,.007],MAT.COL));};
/* the crawler's stubby bumper: tucked inside the tyres, a winch in it, red shackles, a skid plate */
FRONTS.stubby=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x0=X(0)+.06;
  obox(pm,[x0,Y(.7),0],[1,0,0],[0,1,0],[0,0,1],[.08,.11,.56],S);
  pair(s=>{const a=V3.norm([-1,0,s*.9]);obox(pm,[x0-.1,Y(.73),s*.62],a,[0,1,0],V3.cross(a,[0,1,0]),[.11,.08,.04],S);shackle(pm,[x0+.07,Y(.6),s*.38],S);
    /* a hoop up round each lamp */
    tubePath(pm,[[x0+.02,Y(.8),s*.5],[x0+.08,Y(1.0),s*.66],[x0+.02,Y(1.12),s*.66],[X(.1),Y(1.14),s*.66]],.018,6,S);});
  tubeAB(pm,[x0+.05,Y(.74),-.2],[x0+.05,Y(.74),.2],.07,12,S);tubeAB(pm,[x0+.05,Y(.74),-.16],[x0+.05,Y(.74),.16],.074,12,V(lin('#202020'),MAT.RUBBER));
  obox(pm,[x0+.11,Y(.68),0],[1,0,0],[0,1,0],[0,0,1],[.02,.03,.1],MM.ALU);tubeAB(pm,[x0+.13,Y(.68),0],[x0+.15,Y(.55),0],.012,6,V(lin('#c83020'),MAT.FABRIC));
  obox(pm,[X(.3),Y(.5),0],V3.norm([1,.35,0]),V3.norm([-.35,1,0]),[0,0,1],[.3,.008,.42],S);};
/* the factory rear bumper: a black bar, red shackles, the tailpipe out the right */
REARS.trail=K=>{const {X,pm,dy,L,pair}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x=X(L)-.03;
  obox(pm,[x,Y(.64),0],[1,0,0],[0,1,0],[0,0,1],[.05,.08,.84],S);
  pair(s=>{obox(pm,[x+.05,Y(.64),s*.86],V3.norm([1,0,s*.9]),[0,1,0],V3.norm([-s*.9,0,1]),[.035,.075,.05],S);shackle(pm,[x-.03,Y(.53),s*.55],S);});};
/* the crawler's rear: a high-clearance bar with its corners cut away and a swing-out tyre carrier */
REARS.rig=K=>{const {D,X,pm,dy,L,pair}=K,Y=y=>y+dy,S=V(lin('#1c1d1f'),MAT.METAL),x=X(L)-.05,sy=(D.look.spare||{}).y||1.1;
  obox(pm,[x,Y(.68),0],[1,0,0],[0,1,0],[0,0,1],[.06,.09,.62],S);
  pair(s=>{const a=V3.norm([1,0,s*.9]);obox(pm,[x+.05,Y(.74),s*.7],a,[0,1,0],V3.cross(a,[0,1,0]),[.1,.05,.035],S);shackle(pm,[x-.05,Y(.58),s*.45],S);});
  /* the carrier: a post on the left corner, arms across to the tyre */
  tubeAB(pm,[x-.07,Y(.74),-.6],[x-.07,Y(sy+.3),-.6],.035,8,S);tubeAB(pm,[x-.07,Y(sy+.25),-.6],[x-.12,Y(sy+.1),.1],.03,8,S);
  tubeAB(pm,[x-.07,Y(.85),-.6],[x-.12,Y(sy-.05),0],.03,8,S);};
/* a spare on the back. lk.spare: {back: how far behind the tail, y: its height, cover: a black vinyl cover}.
   A bare spare is the build's own wheel, drawn again at D.spare. */
EXTRAS.spare=K=>{const {D,X,pm,dy,L}=K,lk=D.look,t=lk.tyre,sp=lk.spare||{},Y=y=>y+dy,x0=X(L)-(sp.back||.06),y=Y(sp.y||1.1);
  tubeAB(pm,[x0+.02,y,0],[x0-.04,y,0],.06,10,MM.BLACK);
  if(sp.cover){tubeAB(pm,[x0-.04,y,0],[x0-.04-t.W,y,0],t.R+.01,28,V(lin('#141416'),MAT.FABRIC));return;}
  (D.spares=D.spares||[]).push({p:[x0-.04-t.W/2,y,0],face:'back'});};
/* a flat black roof rack on four feet */
EXTRAS.flatRack=K=>{const {D,X,pm,topY,pair,G}=K,u0=G.rf+.16,u1=G.rr-.08,z=.68,y=topY((u0+u1)/2,0)+.075,B=MM.BLACK;
  pair(s=>{obox(pm,[X((u0+u1)/2),y,s*z],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,.018,.02],B);
    for(const u of [u0+.08,u1-.08]){const y0=topY(u,z);obox(pm,[X(u),(y0+y)/2,s*z],[1,0,0],[0,1,0],[0,0,1],[.04,(y-y0)/2+.01,.025],B);}});
  for(let k=0;k<4;k++){const u=u0+.1+(u1-u0-.2)*k/3;obox(pm,[X(u),y+.004,0],[1,0,0],[0,1,0],[0,0,1],[.022,.016,z],B);}
  for(const u of [u0,u1])obox(pm,[X(u),y,0],[1,0,0],[0,1,0],[0,0,1],[.02,.018,z],B);};
/* stock rock rails: black box section under each door */
EXTRAS.rails=K=>{const {D,X,pm,pair}=K,u0=D.uFa+D.arch.a+.04,u1=D.uRa-D.arch.a-.04,um=(u0+u1)/2,y=D.sill(um)+.01,z=D.plan(um)+.005;
  pair(s=>obox(pm,[X(um),y,s*z],[1,0,0],[0,1,0],[0,0,1],[(u1-u0)/2,.045,.04],MM.BLACK));};
/* the crawler's exo-cage: tubes up the pillars and over the roof, a rack grid on top, an LED bar on the front hoop */
EXTRAS.cage=K=>{const {D,X,pm,dy,pair,G,L}=K,Y=y=>y+dy,B=MM.BLACK,r=.026,yt=D.Hr+.1,z=.8;
  const P=(u,y,zz)=>[X(u),y,zz],ub=D.belt(G.cowl)+.02,um=(G.rf+G.rr)/2;
  pair(s=>{tubePath(pm,[P(G.cowl-.08,ub,s*(z+.04)),P(G.rf+.02,yt,s*z),P(G.rr-.02,yt,s*z),P(L+.04,D.belt(L)+.02,s*(z+.02))],r,8,B);
    tubeAB(pm,P(um,yt,s*z),P(um,D.belt(um)+.02,s*(z+.06)),r,8,B);});
  for(let k=0;k<=6;k++){const u=G.rf+.02+(G.rr-G.rf-.04)*k/6;tubeAB(pm,P(u,yt,-z),P(u,yt,z),k%3?r*.6:r,8,B);}
  for(const zz of [-.3,.3])tubeAB(pm,P(G.rf+.02,yt,zz),P(G.rr-.02,yt,zz),r*.6,6,B);
  /* the light bar on tabs above the front hoop */
  const xb=X(G.rf+.05);
  pair(s=>obox(pm,[xb,yt+.045,s*.5],[1,0,0],[0,1,0],[0,0,1],[.02,.03,.012],B));
  rbox(pm,[xb,yt+.1,0],[1,0,0],[0,1,0],[0,0,1],[.045,.045,.66],B,.2,16,6);
  obox(pm,[xb+.046,yt+.1,0],[1,0,0],[0,1,0],[0,0,1],[.002,.03,.62],MM.HEAD);};

/* =====================================================================================
   THE COUPE — face, tail and its own parts, from its reference sheets. The nose curves back
   hard, so lamps drawn at the corners land well back on the fenders and come out swept.
   ===================================================================================== */
/* a big trapezoid of honeycomb, slim swept lamps over its corners, round fogs in black pods, a gill behind each front wheel */
FACES.coupe=K=>{
  const {D,decal,pair,dy}=K,Y=y=>y+dy,lk=D.look;
  decal('F',[[-.57,Y(.225)],[.57,Y(.225)],[.62,Y(.3)],[.45,Y(.505)],[-.45,Y(.505)],[-.62,Y(.3)]],MM.SMOKE,.005);
  decal('F',[[-.54,Y(.24)],[.54,Y(.24)],[.585,Y(.3)],[.43,Y(.488)],[-.43,Y(.488)],[-.585,Y(.3)]],MM.MESH,.007);
  pair(s=>{
    decal('F',[[s*.45,Y(.525)],[s*.86,Y(.592)],[s*.91,Y(.64)],[s*.86,Y(.655)],[s*.47,Y(.567)]],MM.SMOKE,.005);
    decal('F',EL2(s*.6,Y(.565),.024,.022,12),MM.HEAD,.009);decal('F',EL2(s*.72,Y(.588),.024,.022,12),MM.HEAD,.009);
    decal('F',[[s*.47,Y(.531)],[s*.84,Y(.592)],[s*.85,Y(.603)],[s*.48,Y(.543)]],MM.LED,.008);
    decal('F',EL2(s*.73,Y(.3),.055,.042,16),MM.SMOKE,.005);decal('F',EL2(s*.73,Y(.3),.022,.022,12),MM.HEAD,.008);
  });
  /* the gills behind the front wheels, and on the GT a slot ahead of each rear wheel */
  const ug=D.uFa+D.arch.a+(lk.flares?.2:.1);
  decal('S',[[ug,Y(.40)],[ug+.06,Y(.40)],[ug+.16,Y(.64)],[ug+.1,Y(.64)]],MM.SMOKE,.005,.04);
  decal('S',[[ug+.015,Y(.42)],[ug+.05,Y(.42)],[ug+.14,Y(.62)],[ug+.105,Y(.62)]],MM.MESH,.007,.04);
  if(lk.flares){const ur=D.uRa-D.arch.a-.32;for(const o of [0,.07])decal('S',[[ur+o,Y(.44)],[ur+o+.03,Y(.44)],[ur+o+.1,Y(.62)],[ur+o+.07,Y(.62)]],MM.SMOKE,.006,.04);}
};
/* thin blade lamps sweeping out and up under the ducktail, the lid's outline, honeycomb over the diffuser */
TAILS.coupe=K=>{
  const {D,decal,line,pair,dy,L}=K,Y=y=>y+dy,w=.0055;
  pair(s=>{
    decal('R',[[s*.22,Y(.70)],[s*.62,Y(.706)],[s*.8,Y(.728)],[s*.87,Y(.762)],[s*.8,Y(.768)],[s*.22,Y(.726)]],MM.SMOKE,.005);
    decal('R',[[s*.24,Y(.708)],[s*.79,Y(.736)],[s*.84,Y(.756)],[s*.24,Y(.719)]],MM.TAIL,.008);
  });
  line('R',[[-.62,Y(.8)],[-.6,Y(.55)],[.6,Y(.55)],[.62,Y(.8)]],w,MM.SHUT,.004);
  line('T',[[3.98,-.6],[3.98,.6]],w,MM.SHUT,.004);pair(s=>line('T',[[3.98,s*.6],[L-.06,s*.66]],w,MM.SHUT,.004));
  decal('R',RR2(-.46,.46,Y(.37),Y(.43),.02),MM.MESH,.006);
};
/* a wide black diffuser: undertray, fins, red reflectors at its ends */
REARS.coupeDiff=K=>{const {D,X,pm,pair,L}=K,x=X(L),y0=D.sill(L);
  obox(pm,[x+.12,y0-.03,0],V3.norm([1,-.18,0]),V3.norm([.18,1,0]),[0,0,1],[.16,.006,.76],MM.BLACK);
  obox(pm,[x-.006,y0+.03,0],[1,0,0],[0,1,0],[0,0,1],[.012,.06,.78],MM.BLACK);
  for(let k=-2;k<=2;k++)plateXY(pm,[[x+.22,y0-.05],[x-.012,y0+.06],[x-.012,y0-.02],[x+.15,y0-.06]],k*.16,.006,MM.BLACK);
  pair(s=>obox(pm,[x-.02,y0+.05,s*.74],[1,0,0],[0,1,0],[0,0,1],[.003,.012,.035],MM.TAIL));};
/* two mesh vents near the front corners of the hood */
HOODS.coupe=K=>{const {decal,pair}=K;
  pair(s=>{decal('T',[[.5,s*.36],[.82,s*.4],[.82,s*.56],[.5,s*.5]],MM.SMOKE,.004,.05);decal('T',[[.52,s*.375],[.8,s*.41],[.8,s*.545],[.52,s*.49]],MM.MESH,.007,.05);});};

/* =====================================================================================
   THE WAGON — face and tail, from its reference sheets: nothing on it says fast.
   ===================================================================================== */
/* plain lamps with two round reflectors and amber ends, a chrome-topped grille, rub strips on the bumper corners,
   a wide slatted intake low down (with an intercooler showing through it on the sleeper) */
FACES.wagon=K=>{
  const {D,decal,ring2,pair,dy}=K,Y=y=>y+dy,lk=D.look;
  pair(s=>{
    decal('F',[[s*.45,Y(.545)],[s*.84,Y(.555)],[s*.86,Y(.70)],[s*.47,Y(.715)]],MM.REFL,.005);
    for(const z of [.56,.69]){ring2('F',s*z,Y(.628),.048,.058,MM.CHROME,.008,16);decal('F',EL2(s*z,Y(.628),.048,.048,16),MM.HEAD,.009);}
    decal('F',[[s*.775,Y(.56)],[s*.845,Y(.56)],[s*.86,Y(.695)],[s*.775,Y(.7)]],MM.AMBER,.008);
    decal('F',RR2(s*.44,s*.88,Y(.43),Y(.46),.01),MM.TRIM,.005);
  });
  decal('F',RR2(-.42,.42,Y(.525),Y(.68),.02),MM.TRIM,.004);
  for(let k=0;k<4;k++){const y=.54+k*.028;decal('F',RR2(-.39,.39,Y(y),Y(y+.016),.005),MM.MESH,.007);}
  decal('F',RR2(-.43,.43,Y(.655),Y(.678),.008),MM.CHROME,.009);
  decal('F',RR2(-.7,.7,Y(.235),Y(.325),.03),MM.TRIM,.004);
  if(lk.ic){decal('F',RR2(-.46,.46,Y(.25),Y(.31),.008),V(lin('#8f9297'),MAT.METAL),.007);
    for(let k=0;k<6;k++)decal('F',RR2(-.45,.45,Y(.255+k*.01),Y(.259+k*.01),.001),V([.02,.02,.022],MAT.COL),.009);}
  else for(const y of [.25,.29])decal('F',RR2(-.66,.66,Y(y),Y(y+.022),.006),MM.MESH,.007);
};
/* tall lamps up the D-pillars with white and amber blocks low down, a plate recess, a rub strip, a high stop lamp */
TAILS.wagon=K=>{
  const {decal,line,pair,dy}=K,Y=y=>y+dy,w=.0055;
  pair(s=>{
    decal('R',[[s*.62,Y(.66)],[s*.84,Y(.66)],[s*.82,Y(1.0)],[s*.76,Y(1.2)],[s*.72,Y(1.3)],[s*.64,Y(1.3)],[s*.62,Y(1.0)]],MM.TAIL,.005);
    decal('R',RR2(s*.645,s*.83,Y(.69),Y(.745),.006),MM.REV,.008);
    decal('R',RR2(s*.645,s*.83,Y(.755),Y(.79),.006),MM.AMBER,.008);
  });
  line('R',[[-.32,Y(.64)],[.32,Y(.64)],[.33,Y(.86)],[-.33,Y(.86)],[-.32,Y(.64)]],w,MM.SHUT,.004);
  decal('R',RR2(-.26,.26,Y(.69),Y(.8),.008),MM.PLATE,.006);
  decal('R',RR2(-.12,.12,Y(.875),Y(.892),.006),MM.CHROME,.006);
  decal('R',RR2(-.88,.88,Y(.47),Y(.5),.01),MM.TRIM,.005);
  decal('R',RR2(-.13,.13,Y(1.385),Y(1.405),.005),MM.TAIL,.006);
};
/* black rub strips down the sides at bumper height, broken by the wheel arches */
EXTRAS.rubstrip=K=>{const {D,line}=K,a=D.arch.a,Y=y=>y+D.dy,w=.03;
  line('S',[[.12,Y(.445)],[D.uFa-a-.04,Y(.445)]],w,MM.TRIM,.006);
  line('S',[[D.uFa+a+.04,Y(.49)],[D.uRa-a-.04,Y(.49)]],w,MM.TRIM,.006);
  line('S',[[D.uRa+a+.04,Y(.485)],[K.L-.1,Y(.485)]],w,MM.TRIM,.006);};

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

/* =====================================================================================
   THE HATCH — face, tail and its own parts, from its reference sheets.
   ===================================================================================== */
/* plain rectangular lamps with amber wrapping the corners, a black slatted grille between them */
FACES.hatch=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.41,.41,Y(.59),Y(.74),.01),MM.TRIM,.004);
  for(let k=0;k<4;k++){const y=.61+k*.03;decal('F',RR2(-.38,.38,Y(y),Y(y+.014),.003),MM.MESH,.007);}
  pair(s=>{decal('F',RR2(s*.42,s*.69,Y(.585),Y(.75),.008),MM.REFL,.005);decal('F',RR2(s*.455,s*.655,Y(.61),Y(.725),.02),MM.HEAD,.008);
    decal('F',RR2(s*.695,s*.785,Y(.585),Y(.75),.008),MM.AMBER,.005);});
};
/* wide lamps (amber outboard, red, a white reverse block inboard) across a black ribbed panel */
TAILS.hatch=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('R',RR2(-.3,.3,Y(.6),Y(.765),.008),MM.TRIM,.004);
  for(let k=0;k<5;k++){const y=.615+k*.03;decal('R',RR2(-.28,.28,Y(y),Y(y+.012),.003),MM.MESH,.006);}
  pair(s=>{decal('R',RR2(s*.3,s*.7,Y(.6),Y(.765),.008),MM.TAIL,.005);decal('R',RR2(s*.66,s*.785,Y(.6),Y(.765),.008),MM.AMBER,.007);
    decal('R',RR2(s*.3,s*.4,Y(.6),Y(.68),.006),MM.REV,.007);});
};
/* black bumpers standing proud of the body, with slots and lamps in the front one */
FRONTS.hatch=K=>{const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=MM.CLAD,x0=X(0)+.02;
  obox(pm,[x0,Y(.44),0],[1,0,0],[0,1,0],[0,0,1],[.06,.09,.83],S);obox(pm,[x0-.03,Y(.29),0],[1,0,0],[0,1,0],[0,0,1],[.05,.06,.8],S);
  for(let k=0;k<3;k++)obox(pm,[x0+.021,Y(.26+k*.025),0],[1,0,0],[0,1,0],[0,0,1],[.002,.006,.42],V([0,0,0],MAT.MESH));
  pair(s=>{obox(pm,[x0+.021,Y(.3),s*.66],[1,0,0],[0,1,0],[0,0,1],[.003,.02,.06],MM.AMBER);
    const a=V3.norm([1,0,-s*1.4]);obox(pm,[x0-.1,Y(.44),s*.84],a,[0,1,0],V3.cross([0,1,0],a).map(v=>-v),[.08,.09,.045],S);});};
REARS.hatch=K=>{const {D,X,pm,dy,pair,L}=K,Y=y=>y+dy,S=MM.CLAD,x=X(L)-.02;
  obox(pm,[x,Y(.42),0],[1,0,0],[0,1,0],[0,0,1],[.06,.13,.83],S);
  pair(s=>{const a=V3.norm([1,0,s*1.4]);obox(pm,[x+.1,Y(.42),s*.84],a,[0,1,0],V3.cross([0,1,0],a).map(v=>-v),[.08,.13,.045],S);});};
/* the thin red and black stripe down the sides, broken by the arches */
EXTRAS.hatchStripe=K=>{const {D,line,dy,L}=K,Y=y=>y+dy,a=D.arch.a+.06,segs=[[.12,D.uFa-a],[D.uFa+a,D.uRa-a],[D.uRa+a,L-.1]];
  for(const [u0,u1] of segs){line('S',[[u0,Y(.682)],[u1,Y(.682)]],.009,V(lin('#c8241c'),MAT.COL),.006);line('S',[[u0,Y(.666)],[u1,Y(.666)]],.009,V([.015,.015,.016],MAT.COL),.006);}};
/* Group B: a deep spoiler under the bumper and an aluminium stone guard */
FRONTS.rallyB=K=>{FRONTS.hatch(K);const {D,X,pm,dy,pair}=K,Y=y=>y+dy,S=MM.CLAD,x0=X(0)+.03;
  obox(pm,[x0-.02,Y(.17),0],[1,0,0],[0,1,0],[0,0,1],[.06,.05,.86],S);
  for(let k=0;k<4;k++)obox(pm,[x0+.041,Y(.17),-.45+k*.3],[1,0,0],[0,1,0],[0,0,1],[.002,.025,.1],V([0,0,0],MAT.MESH));
  obox(pm,[X(.35),Y(.15),0],V3.norm([1,.12,0]),V3.norm([-.12,1,0]),[0,0,1],[.35,.008,.6],V(lin('#a3a6ab'),MAT.METAL));
  for(let k=-3;k<=3;k++)obox(pm,[X(.3),Y(.143),k*.16],V3.norm([1,.12,0]),V3.norm([-.12,1,0]),[0,0,1],[.04,.002,.04],V([.01,.01,.01],MAT.COL));};
/* four round spot lamps on a bar across the front of the bonnet */
EXTRAS.lampPod=K=>{const {D,X,pm,topY}=K,u=D.B.hood0+.1,y=topY(u,0)+.1,B=MM.BLACK;
  obox(pm,[X(u),y-.07,0],[1,0,0],[0,1,0],[0,0,1],[.02,.012,.56],B);
  for(const z of [-.405,-.135,.135,.405]){tubeAB(pm,[X(u)-.06,y,z],[X(u)+.04,y,z],.1,18,B);tubeAB(pm,[X(u)+.04,y,z],[X(u)+.05,y,z],.088,18,MM.HEAD);
    tubeAB(pm,[X(u)+.05,y,z],[X(u)+.052,y,z],.02,8,MM.CHROME);obox(pm,[X(u)-.01,y-.07,z],[1,0,0],[0,1,0],[0,0,1],[.015,.04,.015],B);}};
/* a scoop on the front of the roof */
EXTRAS.roofScoop=K=>{const {D,X,pm,G,topY,pair}=K,u0=G.rf+.08,u1=u0+.42,w=.17,h=.075;
  for(let i=0;i<6;i++){const a=u0+(u1-u0)*i/6,b=u0+(u1-u0)*(i+1)/6,ha=h*(1-i/6),hb=h*(1-(i+1)/6);
    pm.quad([X(a),topY(a,0)+ha,-w],[X(b),topY(b,0)+hb,-w],[X(b),topY(b,0)+hb,w],[X(a),topY(a,0)+ha,w],[1,1,1],0,MAT.PAINT);
    pair(s=>pm.quad([X(a),topY(a,0),s*w],[X(b),topY(b,0),s*w],[X(b),topY(b,0)+hb,s*w],[X(a),topY(a,0)+ha,s*w],[1,1,1],0,MAT.PAINT));}
  pm.quad([X(u0),topY(u0,0),-w],[X(u0),topY(u0,0),w],[X(u0),topY(u0,0)+h,w],[X(u0),topY(u0,0)+h,-w],[0,0,0],0,MAT.MESH);};
/* black louvres over the rear side windows */
EXTRAS.louvres=K=>{const {D,G,decal,secKeys}=K,u0=G.pillars[0][0]+.07,u1=G.cB-.06,k=secKeys((u0+u1)/2),y0=k.yG+.03,y1=k.P[10][1]-.04;
  decal('S',RR2(u0,u1,y0,y1,.02),MM.TRIM,.006,.06);
  for(let i=0;i<7;i++){const y=y0+.02+(y1-y0-.04)*i/6;decal('S',RR2(u0+.02,u1-.02,y-.012,y+.006,.004),MM.BLACK,.012,.06);}};
/* blank white number panels on the doors and a plate on the bonnet */
EXTRAS.numberPanel=K=>{const {D,G,decal,line,dy}=K,Y=y=>y+dy,u0=G.cowl+.18,u1=u0+.42,W=V([.93,.93,.9],MAT.COL),Bk=V([.02,.02,.02],MAT.COL);
  decal('S',RR2(u0,u1,Y(.38),Y(.74),.01),W,.007,.06);line('S',[[u0,Y(.38)],[u1,Y(.38)],[u1,Y(.74)],[u0,Y(.74)],[u0,Y(.38)]],.008,Bk,.009);
  decal('T',RR2(.36,.6,-.18,.18,.02),W,.006,.05);};

/* =====================================================================================
   THE ELECTRIC SEDAN — an original four-door electric fastback, from the user's two pictures: a long low
   body-colour nose with no grille, slim LED lamps swept up into the fenders over big black triangular
   intakes, a cab-forward glasshouse that runs back in one curve to a short ducktail, a light bar across the
   tail. 4.95 m long on a 3.0 m wheelbase, 1.96 m wide, 1.42 m tall. No real badges, names or signature grille.
   The race build bolts on the widebody, a splitter and canards, a big wing on swan necks and slicks.
   ===================================================================================== */
BODIES.ev={
  L:4.95,ovF:.94,wb:3.0,R0:.36,
  top:[[0,.27],[0,.50,.06],[.10,.625,.12],[.8,.765,1.0],[1.5,.885,.05],[2.24,1.355,.42],[2.8,1.42,1.2],[3.45,1.34,.6],[4.3,1.03,.3],[4.72,.975,.06],[4.85,.99,.02],[4.95,.935,.03],[4.95,.34]],
  belt:[[0,.47],[.12,.60,.12],[.9,.765,.4],[1.5,.855,.4],[2.6,.895,1.2],[3.9,.95,.4],[4.5,.965,.3],[4.95,.92]],
  sill:[[0,.30],[0,.20,.05],[.35,.19,.2],[1.2,.18,.3],[3.6,.18,.3],[4.4,.22,.2],[4.95,.30,.04],[4.95,.36]],
  plan:[[0,0],[0,.70,.3],[.45,.925,.55],[1.0,.965,.45],[2.5,.95,.8],[3.95,.98,.45],[4.5,.935,.3],[4.95,.78,.2],[4.95,0]],
  clad:[[0,.26],[4.95,.26]],
  G:{cowl:1.5,rf:2.24,rr:3.42,be:4.45,base:.012,inset:.03,tum:.74,crown:.03,cB:3.98,cT:3.45,pillars:[[2.95,-.07,.024],[3.72,-.03,.03]]},
  dome:[.3,1.4,.006],bumperF:.1,bumperR:9,hood0:.12,
  Hr:1.42,sh:.945,hip:[.012,.036],oy:.55,doors:4,fuel:null,lift:null,rails:null,wiperR:null,underSpare:0,markers:false,seams:false,
  chY:-.12,fit:{fdy:-.2,rdy:-.2,exU:3.0,sideZ:.97,ventU:-.12,lipZ:.84,lipU:.35,epU:.2,filler:[4.2,.82]}
};
/* slim LED lamps swept up and out into the fenders, big black triangles low at the corners, a black slot
   across the bottom */
FACES.ev=K=>{
  const {decal,pair,dy,line}=K,Y=y=>y+dy;
  decal('F',[[-.5,Y(.205)],[.5,Y(.205)],[.44,Y(.33)],[-.44,Y(.33)]],MM.SMOKE,.005);
  decal('F',[[-.47,Y(.215)],[.47,Y(.215)],[.42,Y(.315)],[-.42,Y(.315)]],MM.MESH,.007);
  pair(s=>{
    /* the lamp: a thin sweep, a white LED blade along its top edge */
    decal('F',[[s*.46,Y(.575)],[s*.78,Y(.606)],[s*.9,Y(.648)],[s*.86,Y(.664)],[s*.74,Y(.632)],[s*.47,Y(.598)]],MM.SMOKE,.006);
    decal('F',[[s*.5,Y(.588)],[s*.77,Y(.614)],[s*.86,Y(.645)],[s*.84,Y(.652)],[s*.75,Y(.628)],[s*.5,Y(.6)]],MM.LED,.009);
    decal('F',EL2(s*.66,Y(.606),.03,.012,10),MM.HEAD,.01);decal('F',EL2(s*.74,Y(.616),.026,.011,10),MM.HEAD,.01);
    /* the intakes: tall black triangles, pointing up and out */
    decal('F',[[s*.53,Y(.22)],[s*.92,Y(.24)],[s*.86,Y(.52)],[s*.74,Y(.40)]],MM.SMOKE,.005);
    decal('F',[[s*.57,Y(.235)],[s*.89,Y(.252)],[s*.85,Y(.47)],[s*.75,Y(.39)]],MM.MESH,.007);
  });
  /* flush door handles, a charge flap on the front fender */
  decal('S',RR2(K.D.uFa+.5,K.D.uFa+.66,Y(.92),Y(.955),.012),MM.SHUT,.005,.04);
};
/* a light bar right across the tail, under the ducktail, with the reversing lamps low in the bumper */
TAILS.ev=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  decal('R',RR2(-.86,.86,Y(.835),Y(.872),.012),MM.SMOKE,.005);
  decal('R',RR2(-.84,.84,Y(.843),Y(.864),.008),MM.TAIL,.008);
  pair(s=>{decal('R',[[s*.6,Y(.83)],[s*.9,Y(.84)],[s*.92,Y(.88)],[s*.62,Y(.875)]],MM.TAIL,.009);decal('R',RR2(s*.2,s*.32,Y(.37),Y(.4),.008),MM.REV,.007);});
  decal('R',RR2(-.18,.18,Y(.6),Y(.72),.01),MM.PLATE,.006);
};
/* the race car's front: the splitter, canards, a red tow strap (FRONTS.race), plus the vents in its fenders */
EXTRAS.evRace=K=>{const {D,decal,pair}=K;
  decal('S',[[D.uFa+.48,K.dy+.58],[D.uFa+.7,K.dy+.62],[D.uFa+.66,K.dy+.72],[D.uFa+.5,K.dy+.68]],MM.SMOKE,.007,.05);
  for(const o of [0,.06])decal('S',[[D.uFa+.52+o,K.dy+.6],[D.uFa+.55+o,K.dy+.61],[D.uFa+.53+o,K.dy+.7],[D.uFa+.5+o,K.dy+.69]],MM.MESH,.009,.05);};
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
