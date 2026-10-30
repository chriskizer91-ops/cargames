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

