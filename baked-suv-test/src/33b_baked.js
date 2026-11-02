/* =====================================================================================
   THE BAKED TRUCK (Baked SUV Test). The stock truck drawn with what SUV Studio's detailed model of it looks like,
   baked onto the game's own mesh (tools/bake/: SUV: Super Unlimited Venture's Baked truck, the same bake). About as
   many triangles as the game's own truck; three pictures more, one atlas for the whole truck (33b_baked_data).
   - On (Settings, Baked truck; on by default) any build shaped and coloured exactly like the stock truck is drawn
     with it, near and in the shed; off, with the game's own mesh. The far copies, the race's cars, traffic and the
     police are the game's own either way.
   - Its paint takes the build's colour (the paint mask), with the game's own flake and clear coat; its lamps still
     light (the tail lamps brake); the rest is as it was baked.
   - The pictures are half size (1024 x 1536) at Mobile and Low, full (2048 x 3072) above: about 25 MB of graphics memory
     against 100.
   ===================================================================================== */
const BK={on:store.get('bst-baked','1')!=='0',ready:false,loading:false,failed:'',res:0,tex:null,m:null,tris:0,dummy:null,ms:0};
function setBaked(on){BK.on=!!on;store.set('bst-baked',on?'1':'0');}
/* the pictures, decoded straight (no premultiplying: the colour's alpha is the paint mask, the other's the clear coat),
   uploaded on the spare unit, with their mips; then the meshes */
async function bakedLoad(){
  if(BK.ready||BK.loading||BK.failed||typeof BAKED_DATA==='undefined')return;BK.loading=true;const t0=performance.now();
  try{
    const A=BAKED_DATA.atlas,G=R.G,half=GFX.level==='mobile'||GFX.level==='low',w=half?A.w/2:A.w,h=half?A.h/2:A.h;
    /* (from the WebP's own bytes, not through an <img>: a browser keeps a decoded image premultiplied, and where an
       alpha is 0 its colour would come back black: the tyres' and the trim's occlusion and roughness, all the
       unpainted colour. Halved on the GPU, from the full picture's first mip, not by the decoder, which may
       premultiply to scale) */
    const up=(bm,w,h,fmt,an)=>{gl.activeTexture(gl.TEXTURE0+15);const T=G.texture(w,h,fmt,{mips:true,aniso:an});gl.bindTexture(gl.TEXTURE_2D,T.t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bm);gl.generateMipmap(gl.TEXTURE_2D);gl.bindTexture(gl.TEXTURE_2D,null);return T;};
    const one=async(src,fmt)=>{const b=atob(src.slice(src.indexOf(',')+1)),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
      const bm=await createImageBitmap(new Blob([u],{type:'image/webp'}),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
      const F=up(bm,A.w,A.h,fmt,half?4:8);if(bm.close)bm.close();if(!half)return F;
      gl.activeTexture(gl.TEXTURE0+15);const T=G.texture(w,h,fmt,{mips:true,aniso:4}),rf=gl.createFramebuffer(),df=gl.createFramebuffer();
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,rf);gl.framebufferTexture2D(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,F.t,1);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,df);gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,T.t,0);
      gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(rf);gl.deleteFramebuffer(df);G.del(F);
      gl.bindTexture(gl.TEXTURE_2D,T.t);gl.generateMipmap(gl.TEXTURE_2D);gl.bindTexture(gl.TEXTURE_2D,null);return T;};
    const [c,n,o]=await Promise.all([one(A.col,'srgb8'),one(A.nrm,'rgba8'),one(A.orm,'rgba8')]);
    const m={};for(const k of ['body','hood','hide','wheel'])m[k]=bakedMesh(BAKED_DATA.parts[k]);
    BK.tex={c,n,o};BK.m=m;BK.res=w;BK.tris=BAKED_DATA.parts.body.t+BAKED_DATA.parts.hood.t+BAKED_DATA.parts.hide.t+BAKED_DATA.parts.wheel.t*4;
    BK.ready=true;BK.ms=performance.now()-t0;}
  catch(e){BK.failed=String(e&&e.message||e);console.warn('baked truck: '+BK.failed);}
  BK.loading=false;
}
/* one of the meshes: positions 16-bit in its box, normals 8-bit, the atlas 16-bit, the material (32-36 baked, 2 and 3
   glass, 16 the dark underside) */
function bakedMesh(p){
  const dec=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;};
  const n=p.v,bx=p.box,P=new Uint16Array(dec(p.P)),N=new Int8Array(dec(p.N)),U=new Uint16Array(dec(p.U)),M=new Uint8Array(dec(p.M));
  const pos=new Float32Array(n*3),nrm=new Float32Array(n*3),col=new Float32Array(n*4),mat=new Float32Array(n),uv=new Float32Array(n*2);
  for(let k=0;k<n;k++){for(let a=0;a<3;a++){pos[k*3+a]=bx[a]+P[k*3+a]/65535*bx[3+a];nrm[k*3+a]=N[k*3+a]/127;}
    uv[k*2]=U[k*2]/65535;uv[k*2+1]=U[k*2+1]/65535;const q=M[k];mat[k]=q;
    if(q===16){col[k*4]=col[k*4+1]=.028;col[k*4+2]=.03;}else{col[k*4]=col[k*4+1]=col[k*4+2]=1;}}
  return makeMesh({pos,nrm,col,mat,uv,idx:p.i32?new Uint32Array(dec(p.I)):new Uint16Array(dec(p.I))});
}
/* the pictures for a pass (52_world_gl texUniforms); before they're in, a 1-pixel stand-in, so these units never
   keep a picture another pass is drawing into */
function bakedBind(P){if(!P.samplers||P.samplers.uBkC===undefined)return;const G=R.G;
  if(BK.on&&!BK.ready)bakedLoad();
  if(BK.ready){G.tex(P,{uBkC:BK.tex.c,uBkN:BK.tex.n,uBkO:BK.tex.o});return;}
  if(!BK.dummy){gl.activeTexture(gl.TEXTURE0+15);BK.dummy=G.texture(1,1,'rgba8',{data:new Uint8Array([128,128,255,255])});gl.bindTexture(gl.TEXTURE_2D,null);}
  G.tex(P,{uBkC:BK.dummy,uBkN:BK.dummy,uBkO:BK.dummy});}
/* the stock truck as the game built it, with the baked meshes in place of its body, hood, what the hood hides and
   wheels; null for a build that isn't shaped and coloured exactly like it (the stock build's own mesh counts, axles,
   tyres, ride and colours: anything else the bake doesn't know) */
function bakedOf(i,T){
  if(T.bk!==undefined)return T.bk;const b=BUILDS[i];
  const si=BUILDS.findIndex(q=>q.id==='stock');if(si<0||b.machine||b.car!=='suv'||b.liv)return T.bk=null;
  const S=BUILDS[si],ST=TRUCK.stock||truckMake(si),L=b.look,SL=S.look;
  const same=b===S||(T.tris===ST.tris&&!!T.bay===!!ST.bay&&Math.abs(T.D.uFa-ST.D.uFa)<1e-6&&Math.abs(T.D.uRa-ST.D.uRa)<1e-6&&!L.tyreR&&
    ['R','W','rim','tyre','style','brake'].every(k=>L.tyre[k]===SL.tyre[k])&&L.lift===SL.lift&&L.face===SL.face&&L.tail===SL.tail&&L.roof===SL.roof&&
    ['rim','cal','clad','paint2'].every(k=>b[k]===S[k]));
  if(!same)return T.bk=null;
  const m=BK.m;return T.bk=Object.assign({},T,{body:m.body,hood:m.hood,hide:m.hide,wheel:m.wheel,wheelR:m.wheel,tris:BK.tris,baked:true});
}
