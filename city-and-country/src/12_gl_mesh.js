/* ===== GL plumbing and the flat-shaded mesh builder, from Shiftlight 2 ===== */
let P_LED,P_BR,P_BL,P_CO,P_LIT,VAO0,HTEX;
const FB={};let VW=1,VH=1,DPR=1,RECT={x:0,y:0,w:100,h:56},SCN=null;
function mkTarget(w,h,hdr=HDR,depth=false){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  let rb=null;if(depth){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);}
  return {t,f,w,h,rb};
}
function freeTarget(T){if(!T)return;gl.deleteTexture(T.t);gl.deleteFramebuffer(T.f);if(T.rb)gl.deleteRenderbuffer(T.rb);}
function glInit(){
  P_LED=compile(VS_FS,FS_LED);P_BR=compile(VS_FS,FS_BRIGHT);P_BL=compile(VS_FS,FS_BLUR);P_CO=compile(VS_FS,FS_COMP);
  P_LIT=compile(VS_LIT,FS_LIT,LIT_DEFS);if(typeof lgBind==='function')lgBind(P_LIT);
  VAO0=gl.createVertexArray();
  HTEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,HTEX);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
}
/* the scene draws at SS times the dots (each dot the average of SS*SS samples). With SCN_CAP (the game) never at
   much more than the screen has pixels (a small phone at the finest dots), nor less than one per dot */
let SCN_CAP=false;
function sceneTarget(){let w=BW*SS,h=BH*SS;if(SCN_CAP){w=Math.min(w,Math.max(BW,Math.round(VW*1.15/2)*2));h=Math.round(w*BH/BW);}
  if(SCN&&SCN.w===w&&SCN.h===h)return SCN;freeTarget(SCN);SCN=mkTarget(w,h,HDR,true);return SCN;}
function pass(p,src,dst,setup){
  gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:VW,dst?dst.h:VH);
  gl.useProgram(p.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.t);gl.uniform1i(p.u.uTex,0);
  if(setup)setup(p.u);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);
}
const POST={flash:[0,0,0],scn:1,quant:20,sat:1.2,con:1.07,edge:[0,0,0]};
/* upload the HUD buffer, composite with the scene into LED dots, bloom, tonemap */
/* the HUD's pixels go up into the same texture each frame (reallocated only when the dots change size) */
let HTEX_WH='';
function hudUpload(){txtFlush();gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);const wh=BW+'x'+BH;
  if(wh!==HTEX_WH){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,BW,BH,0,gl.RGBA,gl.UNSIGNED_BYTE,HB8);HTEX_WH=wh;}
  else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,BW,BH,gl.RGBA,gl.UNSIGNED_BYTE,HB8);}
function present(){
  hudUpload();
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.015,.03,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;
  gl.viewport(rx,ry,rw,rh);gl.useProgram(P_LED.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,SCN.t);gl.uniform1i(P_LED.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.uniform1i(P_LED.u.uHud,1);
  gl.uniform2f(P_LED.u.uRes,BW,BH);gl.uniform1f(P_LED.u.uGain,HDR?1.85:1.35);gl.uniform1i(P_LED.u.uStyle,STYLE_ID);
  gl.uniform1f(P_LED.u.uScn,POST.scn);gl.uniform3fv(P_LED.u.uEdge,POST.edge);gl.uniform3fv(P_LED.u.uFlash,POST.flash);gl.uniform1f(P_LED.u.uQuant,POST.quant);
  gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?1.0:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.useProgram(P_CO.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,FB.scene.t);gl.uniform1i(P_CO.u.uScene,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,FB.a.t);gl.uniform1i(P_CO.u.uB1,1);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,FB.c.t);gl.uniform1i(P_CO.u.uB2,2);
  gl.uniform1f(P_CO.u.uBloom,HDR?1:.55);gl.uniform3f(P_CO.u.uGrade,POST.sat,POST.con,0);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
function resize(){
  /* a phone draws at no more than twice its CSS pixels: past that the dots are smaller than the eye can split anyway */
  DPR=Math.min(window.devicePixelRatio||1,touchy?2:2.5);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  if(gl){for(const k in FB)freeTarget(FB[k]);
    FB.scene=mkTarget(VW,VH);FB.a=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));FB.b=mkTarget(Math.max(1,VW>>2),Math.max(1,VH>>2));
    FB.c=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));FB.d=mkTarget(Math.max(1,VW>>3),Math.max(1,VH>>3));}
  layout();
}
/* =====================================================================================
   5. MESHES — a flat-shaded mesh builder (vertex colour + emissive + material id) and
      VAO helpers. Instanced meshes take per-instance [x,y,z,yaw][sx,sy,sz,seed][r,g,b,emissive].
   ===================================================================================== */
class MB{
  constructor(){this.p=[];this.n=[];this.c=[];this.m=[];this.M=null;}
  setM(m){this.M=m;return this;}
  _v(p){if(!this.M)return p;return M4.xform(this.M,p);}
  tri(a,b,c,col,em=0,mat=0){
    a=this._v(a);b=this._v(b);c=this._v(c);
    const n=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a)));
    for(const v of [a,b,c]){this.p.push(v[0],v[1],v[2]);this.n.push(n[0],n[1],n[2]);this.c.push(col[0],col[1],col[2],em);this.m.push(mat);}
  }
  quad(a,b,c,d,col,em,mat){this.tri(a,b,c,col,em,mat);this.tri(a,c,d,col,em,mat);}
  /* quad with a colour per corner (gradients) */
  quadC(a,b,c,d,ca,cb,cc,cd,em=0,mat=0){const n0=this.c.length;this.quad(a,b,c,d,ca,em,mat);const C=[ca,cb,cc,ca,cc,cd];for(let k=0;k<6;k++)for(let j=0;j<3;j++)this.c[n0+k*4+j]=C[k][j];}
  /* weld the normals of coincident vertices whose faces lie within the crease angle, after
     turning every face outward from centre o: flat facets become smooth, real edges stay sharp */
  smooth(deg=40,o=null,v0=0){
    const ct=Math.cos(deg*PI/180),P=this.p,N=this.n,nv=P.length/3,G=new Map();
    if(o)for(let i=v0;i<nv;i++){const d=(P[i*3]-o[0])*N[i*3]+(P[i*3+1]-o[1])*N[i*3+1]+(P[i*3+2]-o[2])*N[i*3+2];if(d<0){N[i*3]=-N[i*3];N[i*3+1]=-N[i*3+1];N[i*3+2]=-N[i*3+2];}}
    const O=N.slice();
    for(let i=v0;i<nv;i++){const k=(Math.round(P[i*3]*500)+16384)*1073741824+(Math.round(P[i*3+1]*500)+16384)*32768+(Math.round(P[i*3+2]*500)+16384);let g=G.get(k);if(!g)G.set(k,g=[]);g.push(i);}
    for(const g of G.values()){if(g.length<2)continue;for(const i of g){let x=0,y=0,z=0;
      for(const j of g)if(O[i*3]*O[j*3]+O[i*3+1]*O[j*3+1]+O[i*3+2]*O[j*3+2]>=ct){x+=O[j*3];y+=O[j*3+1];z+=O[j*3+2];}
      const l=Math.hypot(x,y,z)||1;N[i*3]=x/l;N[i*3+1]=y/l;N[i*3+2]=z/l;}}
    return this;
  }
  box(x0,y0,z0,x1,y1,z1,col,em=0,mat=0,skip=''){
    const P=(x,y,z)=>[x,y,z];
    if(!skip.includes('t'))this.quad(P(x0,y1,z0),P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),col,em,mat);
    if(!skip.includes('b'))this.quad(P(x0,y0,z0),P(x1,y0,z0),P(x1,y0,z1),P(x0,y0,z1),col,em,mat);
    if(!skip.includes('x'))this.quad(P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1),P(x1,y0,z1),col,em,mat);
    if(!skip.includes('X'))this.quad(P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1),P(x0,y1,z0),col,em,mat);
    if(!skip.includes('z'))this.quad(P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1),col,em,mat);
    if(!skip.includes('Z'))this.quad(P(x0,y0,z0),P(x0,y1,z0),P(x1,y1,z0),P(x1,y0,z0),col,em,mat);
  }
  /* cylinder along an axis ('x','y','z') centred at c */
  cyl(c,r,len,seg,axis,col,em=0,mat=0,caps=true,capCol,capMat){
    const pts=(o)=>{const a=[];for(let i=0;i<seg;i++){const t=i/seg*TAU,u=Math.cos(t)*r,v=Math.sin(t)*r;
      a.push(axis==='x'?[c[0]+o,c[1]+u,c[2]+v]:axis==='y'?[c[0]+u,c[1]+o,c[2]+v]:[c[0]+u,c[1]+v,c[2]+o]);}return a;};
    const A=pts(-len/2),B=pts(len/2);
    for(let i=0;i<seg;i++){const j=(i+1)%seg;this.quad(A[i],A[j],B[j],B[i],col,em,mat);}
    if(caps){const ca=axis==='x'?[c[0]-len/2,c[1],c[2]]:axis==='y'?[c[0],c[1]-len/2,c[2]]:[c[0],c[1],c[2]-len/2];
      const cb=axis==='x'?[c[0]+len/2,c[1],c[2]]:axis==='y'?[c[0],c[1]+len/2,c[2]]:[c[0],c[1],c[2]+len/2];
      for(let i=0;i<seg;i++){const j=(i+1)%seg;this.tri(ca,A[j],A[i],capCol||col,em,capMat===undefined?mat:capMat);this.tri(cb,B[i],B[j],capCol||col,em,capMat===undefined?mat:capMat);}}
  }
  cone(c,r,h,seg,col,em=0,mat=0){const top=[c[0],c[1]+h,c[2]];for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU;
    const p=[c[0]+Math.cos(a)*r,c[1],c[2]+Math.sin(a)*r],q=[c[0]+Math.cos(b)*r,c[1],c[2]+Math.sin(b)*r];this.tri(p,q,top,col,em,mat);this.tri(p,c,q,col,em,mat);}}
  /* a low sphere-ish blob (octahedron subdivided once) */
  blob(c,rx,ry,rz,col,em=0,mat=0){
    const v=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],f=[[0,2,4],[4,2,1],[1,2,5],[5,2,0],[0,4,3],[4,1,3],[1,5,3],[5,0,3]];
    const P=a=>[c[0]+a[0]*rx,c[1]+a[1]*ry,c[2]+a[2]*rz];
    for(const [a,b,d] of f){const ab=V3.norm(V3.add(v[a],v[b])),bd=V3.norm(V3.add(v[b],v[d])),da=V3.norm(V3.add(v[d],v[a]));
      this.tri(P(v[a]),P(ab),P(da),col,em,mat);this.tri(P(ab),P(v[b]),P(bd),col,em,mat);this.tri(P(da),P(bd),P(v[d]),col,em,mat);this.tri(P(ab),P(bd),P(da),col,em,mat);}
  }
  get count(){return this.p.length/3;}
  append(o){for(const k of ['p','n','c','m'])for(let i=0;i<o[k].length;i++)this[k].push(o[k][i]);return this;}
  build(){return makeMesh({pos:new Float32Array(this.p),nrm:new Float32Array(this.n),col:new Float32Array(this.c),mat:new Float32Array(this.m)});}
}
function vbuf(loc,data,size,div=0){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);if(div)gl.vertexAttribDivisor(loc,div);return b;}
function makeMesh(d){
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const bufs=[];
  bufs.push(vbuf(0,d.pos,3),vbuf(1,d.nrm,3),vbuf(2,d.col,4));if(d.mat)bufs.push(vbuf(3,d.mat,1));if(d.uv)bufs.push(vbuf(4,d.uv,2));
  let ib=null,it=0;if(d.idx){ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,d.idx,gl.STATIC_DRAW);it=d.idx instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}
  gl.bindVertexArray(null);
  return {vao,bufs,ib,it,n:d.idx?d.idx.length:d.pos.length/3,inst:null,ni:0};
}
/* per-instance data: Float32Array of 12 floats per instance */
function setInst(mesh,data){
  gl.bindVertexArray(mesh.vao);
  if(!mesh.inst){mesh.inst=gl.createBuffer();}
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.inst);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  for(let k=0;k<3;k++){gl.enableVertexAttribArray(5+k);gl.vertexAttribPointer(5+k,4,gl.FLOAT,false,48,k*16);gl.vertexAttribDivisor(5+k,1);}
  gl.bindVertexArray(null);mesh.ni=data.length/12;
}
/* draw calls this frame (the performance overlay, 52_world_dev) */
const GLC={n:0};
function drawMesh(m){GLC.n++;gl.bindVertexArray(m.vao);if(m.ib)gl.drawElements(gl.TRIANGLES,m.n,m.it,0);else gl.drawArrays(gl.TRIANGLES,0,m.n);}
/* point a shape's instance attributes at one of the instance lists' own buffers (no upload) */
function instBind(mesh,buf,n){gl.bindVertexArray(mesh.vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  for(let k=0;k<3;k++){gl.enableVertexAttribArray(5+k);gl.vertexAttribPointer(5+k,4,gl.FLOAT,false,48,k*16);gl.vertexAttribDivisor(5+k,1);}
  gl.bindVertexArray(null);mesh.ni=n;}
function drawMeshI(m){if(!m.ni)return;GLC.n++;gl.bindVertexArray(m.vao);if(m.ib)gl.drawElementsInstanced(gl.TRIANGLES,m.n,m.it,0,m.ni);else gl.drawArraysInstanced(gl.TRIANGLES,0,m.n,m.ni);}
function freeMesh(m){if(!m)return;gl.deleteVertexArray(m.vao);for(const b of m.bufs)gl.deleteBuffer(b);if(m.ib)gl.deleteBuffer(m.ib);if(m.inst)gl.deleteBuffer(m.inst);}

