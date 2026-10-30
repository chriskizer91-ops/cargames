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
