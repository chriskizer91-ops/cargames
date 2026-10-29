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

