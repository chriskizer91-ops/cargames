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

