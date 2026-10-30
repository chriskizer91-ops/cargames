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

