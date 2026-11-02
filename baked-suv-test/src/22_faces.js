/* ===== the four faces and four tails: decals drawn in front or rear view (z, y in metres) ===== */
const FACES={},TAILS={};
/* 01 Classic: a chrome-framed grille with two thick chrome bars, clear twin-projector lamps with amber
   corners that wrap the fenders, a painted bumper over a textured valance with a wide lower grille and
   round fog lamps in black pods */
FACES.classic=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.462,.462,Y(.786),Y(1.03),.04),MM.CHROME,.004);
  decal('F',RR2(-.446,.446,Y(.80),Y(1.016),.03),MM.MESH,.007);
  decal('F',RR2(-.452,.452,Y(.93),Y(.962),.01),MM.CHROME,.011);
  decal('F',RR2(-.452,.452,Y(.856),Y(.884),.01),MM.CHROME,.011);
  pair(s=>{
    decal('F',[[s*.488,Y(.81)],[s*.86,Y(.816)],[s*.9,Y(.88)],[s*.885,Y(1.01)],[s*.488,Y(1.024)]],MM.SMOKE,.005);
    decal('F',[[s*.5,Y(.822)],[s*.83,Y(.828)],[s*.83,Y(1.004)],[s*.5,Y(1.012)]],MM.REFL,.007);
    for(const z of [.58,.72]){ring2('F',s*z,Y(.918),.046,.058,MM.CHROME,.009,16);decal('F',EL2(s*z,Y(.918),.046,.046,16),MM.HEAD,.01);}
    decal('F',[[s*.835,Y(.83)],[s*.865,Y(.832)],[s*.9,Y(.885)],[s*.888,Y(.99)],[s*.835,Y(1.0)]],MM.AMBER,.01);
    /* a chrome strip under the lamp, as on the concept */
    decal('F',[[s*.49,Y(.803)],[s*.85,Y(.809)],[s*.85,Y(.816)],[s*.49,Y(.81)]],MM.CHROME,.006);
  });
  decal('F',RR2(-.43,.43,Y(.452),Y(.548),.03),MM.MESH,.006);
  pair(s=>{decal('F',EL2(s*.685,Y(.5),.082,.062,18),MM.TRIM,.005);ring2('F',s*.685,Y(.5),.037,.047,MM.CHROME,.008,14);decal('F',EL2(s*.685,Y(.5),.037,.037,14),MM.HEAD,.009);});
};
/* 02 Street: a gloss-black surround split into two mesh openings, smoked lamps with halo rings and an
   LED strip, a big mesh intake and slim fog lamps */
FACES.street=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.465,.465,Y(0.793),Y(1.032),.03),MM.SMOKE,.004);
  pair(s=>decal('F',RR2(s*.045,s*.43,Y(0.813),Y(1.012),.035),MM.MESH,.007));
  pair(s=>{
    decal('F',[[s*.488,Y(0.808)],[s*.86,Y(0.814)],[s*.9,Y(0.878)],[s*.885,Y(1.008)],[s*.488,Y(1.022)]],MM.SMOKE,.005);
    for(const z of [.575,.70]){ring2('F',s*z,Y(0.923),.043,.052,MM.HALO,.008,16);decal('F',EL2(s*z,Y(0.923),.026,.026,12),MM.HEAD,.009);}
    decal('F',[[s*.52,Y(0.828)],[s*.84,Y(0.834)],[s*.86,Y(0.848)],[s*.52,Y(0.844)]],MM.LED,.009);
    decal('F',[[s*.8,Y(0.858)],[s*.87,Y(0.861)],[s*.885,Y(0.898)],[s*.8,Y(0.898)]],MM.AMBER,.009);
  });
  decal('F',RR2(-.54,.54,Y(0.432),Y(0.592),.04),MM.SMOKE,.005);
  decal('F',RR2(-.52,.52,Y(0.445),Y(0.578),.035),MM.MESH,.007);
  pair(s=>{decal('F',RR2(s*.64,s*.8,Y(0.470),Y(0.530),.02),MM.SMOKE,.005);decal('F',RR2(s*.655,s*.785,Y(0.483),Y(0.517),.012),MM.HEAD,.008);});
};
/* 03 Backcountry: quad round lamps in black panels with amber signals under them, a body-colour grille
   cut with three black slots. The steel bumper is a part. */
FACES.back=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.452,.452,Y(0.798),Y(1.030),.03),MM.TRIM,.004);
  decal('F',RR2(-.432,.432,Y(0.813),Y(1.016),.025),MM.PAINT,.006);
  for(const [a,b] of [[.81,.845],[.87,.905],[.93,.965]])decal('F',RR2(-.40,.40,Y(a),Y(b),.012),MM.MESH,.008);
  pair(s=>{
    decal('F',[[s*.47,Y(0.793)],[s*.865,Y(0.798)],[s*.9,Y(0.858)],[s*.885,Y(1.018)],[s*.47,Y(1.030)]],MM.TRIM,.005);
    for(const z of [.565,.715]){ring2('F',s*z,Y(0.943),.05,.062,MM.CHROME,.008,16);decal('F',EL2(s*z,Y(0.943),.05,.05,16),MM.HEAD,.009);decal('F',EL2(s*z,Y(0.943),.014,.014,8),MM.CHROME,.011);}
    decal('F',RR2(s*.5,s*.84,Y(0.813),Y(0.848),.008),MM.AMBER,.009);
  });
};
/* 04 Race: mesh everywhere air can get in, slim LED lamps, brake ducts */
FACES.race=K=>{
  const {decal,ring2,pair,dy}=K,Y=y=>y+dy;
  decal('F',RR2(-.47,.47,Y(0.793),Y(1.032),.03),MM.SMOKE,.004);
  decal('F',RR2(-.445,.445,Y(0.808),Y(1.016),.025),MM.MESH,.007);
  pair(s=>{
    decal('F',[[s*.488,Y(0.808)],[s*.86,Y(0.814)],[s*.9,Y(0.878)],[s*.885,Y(1.008)],[s*.488,Y(1.022)]],MM.SMOKE,.005);
    decal('F',[[s*.5,Y(0.948)],[s*.87,Y(0.943)],[s*.88,Y(0.973)],[s*.5,Y(0.980)]],MM.LED,.009);
    decal('F',EL2(s*.6,Y(0.878),.034,.034,12),MM.HEAD,.009);decal('F',EL2(s*.72,Y(0.878),.034,.034,12),MM.HEAD,.009);
  });
  decal('F',RR2(-.64,.64,Y(0.420),Y(0.610),.04),MM.SMOKE,.005);
  decal('F',RR2(-.6,.6,Y(0.432),Y(0.598),.035),MM.MESH,.007);
  pair(s=>{decal('F',EL2(s*.73,Y(0.520),.07,.06,16),MM.SMOKE,.006);decal('F',EL2(s*.73,Y(0.520),.058,.048,16),MM.MESH,.008);});
};
/* tails: (z, y) in rear view */
TAILS.classic=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  pair(s=>{
    decal('R',[[s*.665,Y(.955)],[s*.875,Y(.95)],[s*.885,Y(1.125)],[s*.665,Y(1.13)]],MM.TAIL,.005);
    decal('R',RR2(s*.70,s*.82,Y(1.0),Y(1.045),.006),MM.REV,.008);
    decal('R',[[s*.452,Y(.965)],[s*.648,Y(.962)],[s*.648,Y(1.115)],[s*.452,Y(1.11)]],MM.TAIL,.005);
    decal('R',RR2(s*.47,s*.63,Y(1.06),Y(1.09),.006),MM.REV,.008);
    decal('R',RR2(s*.76,s*.86,Y(.665),Y(.69),.006),MM.TAIL,.006);
  });
  decal('R',RR2(-.23,.23,Y(.855),Y(1.04),.03),MM.SHUT,.004);
  decal('R',RR2(-.16,.16,Y(.875),Y(.955),.008),MM.PLATE,.007);
  decal('R',RR2(-.36,.36,Y(1.052),Y(1.072),.008),MM.CHROME,.006);
  /* the step pad on the bumper top */
  K.decal('T',RR2(K.D.B.bumperR+.005,K.L-.01,-.55,.55,.01),MM.RUBBER,.004);
};
TAILS.led=K=>{
  const {decal,pair,dy,ring2}=K,Y=y=>y+dy;
  decal('R',RR2(-.66,.66,Y(.96),Y(1.12),.02),MM.SMOKE,.004);
  decal('R',RR2(-.6,.6,Y(.965),Y(.975),.004),MM.TAIL,.007);
  pair(s=>{
    decal('R',[[s*.64,Y(.93)],[s*.875,Y(.925)],[s*.885,Y(1.14)],[s*.64,Y(1.145)]],MM.SMOKE,.005);
    const zc=.785,yc=Y(1.035),hw=.11,hh=.075,t=.016;
    for(const [a,b] of [[[zc-hw,yc+hh-t],[zc+hw,yc+hh]],[[zc-hw,yc-hh],[zc+hw,yc-hh+t]],[[zc-hw,yc-hh],[zc-hw+t,yc+hh]],[[zc+hw-t,yc-hh],[zc+hw,yc+hh]]])
      decal('R',RR2(s*a[0],s*b[0],a[1],b[1],.004),MM.TAIL,.008);
    decal('R',RR2(s*(zc-.05),s*(zc+.05),yc-.012,yc+.012,.004),MM.REV,.008);
  });
  decal('R',RR2(-.2,.2,Y(.85),Y(.955),.02),MM.SHUT,.004);
  decal('R',RR2(-.16,.16,Y(.865),Y(.945),.008),MM.PLATE,.007);
};
TAILS.back=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  pair(s=>{
    decal('R',[[s*.67,Y(.92)],[s*.875,Y(.915)],[s*.885,Y(1.16)],[s*.67,Y(1.165)]],MM.TAIL,.005);
    decal('R',RR2(s*.69,s*.865,Y(.93),Y(.975),.006),MM.REV,.008);
    decal('R',RR2(s*.69,s*.865,Y(.985),Y(1.02),.006),MM.AMBER,.008);
  });
  decal('R',RR2(-.23,.23,Y(.855),Y(1.04),.03),MM.SHUT,.004);
  decal('R',RR2(-.16,.16,Y(.875),Y(.955),.008),MM.PLATE,.007);
};
TAILS.race=K=>{
  const {decal,pair,dy}=K,Y=y=>y+dy;
  pair(s=>{
    decal('R',[[s*.64,Y(1.05)],[s*.875,Y(1.045)],[s*.885,Y(1.1)],[s*.64,Y(1.105)]],MM.SMOKE,.005);
    decal('R',[[s*.66,Y(1.062)],[s*.865,Y(1.058)],[s*.87,Y(1.075)],[s*.66,Y(1.079)]],MM.TAIL,.008);
  });
  decal('R',RR2(-.64,.64,Y(1.062),Y(1.07),.003),MM.TAIL,.007);
};

