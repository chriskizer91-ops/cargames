/* =====================================================================================
   THE STUDIO'S DETAIL, put on the game's truck: each piece replaces or adds to what the game builds.
   ===================================================================================== */
function hdBuild(out){
  const lk=out.b.look;
  /* the wheel, modelled for a close look (71_wheel) */
  if(!HD_ON)return;
  if(lk.tyre.tyre==='hwy'&&lk.tyre.style==='six'){out.wheel=hdWheel(lk.tyre,out.b);out.wheelR=out.wheel;}
  /* the face and tail in three dimensions (72_face), in a part list of their own */
  const fx=new MB();if(lk.face==='classic')hdFaceClassic(fx,out);if(lk.tail==='classic')hdTailClassic(fx,out);out.hd.face=fx;
  /* moulded wheel-house liners in place of the game's flat panels (73_arch) */
  const ar=new MB();hdArches(ar,out);out.hd.arches=ar;const fl=new MB();hdFlares(fl);out.hd.flares=fl;
}
