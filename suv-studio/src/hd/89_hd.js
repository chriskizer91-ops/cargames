/* =====================================================================================
   THE STUDIO'S DETAIL, put on the game's truck: each piece replaces or adds to what the game builds.
   ===================================================================================== */
function hdBuild(out){
  const lk=out.b.look;
  /* the wheel, modelled for a close look (71_wheel) */
  if(lk.tyre.tyre==='hwy'&&lk.tyre.style==='six'){out.wheel=hdWheel(lk.tyre,out.b);out.wheelR=out.wheel;}
}
