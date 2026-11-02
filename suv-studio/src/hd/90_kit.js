/* =====================================================================================
   THE STUDIO'S ENTRY TO THE BUILDERS. The game's own builders (src/game, copied from Road Not Found +
   Traffic) make the truck exactly as the game does, only with the body's stations closer together
   (BODY_LOD below 1); the studio's own parts (src/hd) are added on top. Everything comes back as the
   builders' flat arrays (p: positions, n: normals, c: colour + emissive, m: material id, all per vertex).
   ===================================================================================== */
function studioBuild(id,lod){
  const i=BUILDS.findIndex(b=>b.id===id),b=BUILDS[i];KIT_OUT.length=0;
  const t0=performance.now();BODY_LOD=lod;let s;try{s=buildSUV(b.look,b);}finally{BODY_LOD=1;}
  const w=buildWheel(b.look.tyre),wr=b.look.tyreR?buildWheel(b.look.tyreR):w,by=buildBay(b,s.D);
  const out={b,D:s.D,body:s.body,hood:s.hood,hide:s.hide,wheel:w,wheelR:wr,bay:by,ms:0,hd:{}};
  if(typeof hdBuild==='function')hdBuild(out);
  out.ms=performance.now()-t0;return out;
}
window.KIT={studioBuild,BUILDS,PAINTS,MAT,SM};
