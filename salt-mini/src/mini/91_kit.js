/* =====================================================================================
   WHAT THE PAGE TAKES FROM THE GAME'S CODE: the physics (src/drive, copied from Road Not Found + Traffic unchanged:
   makeCar, GroundWorld, the driving levels), the builds, the Plus tune, the Digital Engine's tables, the ground pictures, and the
   tuner bay's way in: the game's own engineSpec path (16_engines), the same one its Tune sheet uses; and the game's
   HUD and engine sound (src/ui).
   ===================================================================================== */
{const STOCK=BUILDS.findIndex(b=>b.id==='stock'),SB=BUILDS[STOCK];
  /* the stock truck as its parts make it (what the tuner's edits are measured from) */
  const fake=()=>Object.assign({},SB,{car:'suv',rig:{engine:'mini'}});
  function baseEngine(){for(const q in TUNE)delete TUNE[q];return engineSpec(fake());}
  /* the truck's engine with the tuner's edits (the Tune sheet's own keys) and its final drive; the car built next
     drives it (makeCar reads SPECS) */
  function tunedEngine(edits,fd,plus){const b=fake(),k=tuneKey(b);for(const q in TUNE)delete TUNE[q];
    if(edits&&Object.keys(edits).length)TUNE[k]=Object.assign({},edits);
    let e=engineSpec(b);if(fd)e.fd=fd;for(const q in TUNE)delete TUNE[q];
    /* the game's Plus tune (60_game, plusSpec in 16_engines): this many times the torque at every rev */
    if(plus>1.001)e=plusSpec(e,plus,1);
    SPECS[SB.id]=e;return e;}
  window.DRIVE={makeCar,GroundWorld,ASSISTS,BUILDS,stock:STOCK,SIM,baseEngine,tunedEngine,setLow,setLockers};}
/* the game's HUD (src/ui: 10_hud, 20_instruments, 61_hud) and its engine sound (17_audio), for the page */
window.UI={APP,MSGS,setRes,hudLayout,miniHud,say,txtFlush,txtFonts,txtClear,ENG,initAudio,voiceNode,setVolume,setBody,saveEng,
  get HB8(){return HB8;},get BW(){return BW;},get BH(){return BH;},get RECT(){return RECT;}};
window.GROUND_TEX=GROUND_TEX;
