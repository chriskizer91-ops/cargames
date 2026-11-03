/* =====================================================================================
   4. DISPLAY — WebGL2 through the retro renderer (11_retro, in Shiftlight 3's renderer's place). R is the renderer, gl its context; both are made
      by rutInit (called from the boot, 65_boot) once the graphics tier is known. The renderer needs floating-point
      colour targets and refuses to start without them, so HDR is always on.
   ===================================================================================== */
const cv=$('gl');
let R=null,gl=null,RESO=null;
const HDR=true;
const STYLE_ID={color:0,amber:1,lamp:2}[(location.search.match(/[?&]style=(\w+)/)||[])[1]||'color']||0;
/* the renderer, at the graphics tier, with no city of its own (the game's world comes through its hooks) */
function rutInit(){
  R=new SL3.Renderer(cv,{quality:GFX.level,sky:rutShaders().SKY_FS,noWorld:true});gl=R.gl;
  /* the renderer keeps which program is in use and skips re-binding it; the game's own passes (the HUD's dots, the
     challenges' columns of light) bind theirs straight, so the context itself remembers what is bound and the
     renderer asks it */
  {const use=gl.useProgram.bind(gl),G=R.G;let cur=null;gl.useProgram=p=>{cur=p;use(p);};
    G.use=P=>{if(!P.ready)G.finish(P);if(cur!==P.p)gl.useProgram(P.p);return P;};}
  /* (Redline Retro: the small picture's size is RETRO.lines, fixed; the dynamic resolution only paces the frames) */
  RESO=new SL3.DRS({min:1,max:1,start:1});
  glInit();
}
/* a program of the game's own (the HUD's dots, the puffs): the same header the renderer gives its shaders */
function compile(vs,fs,defs=''){
  const p=gl.createProgram();
  const hdr='#version 300 es\nprecision highp float;precision highp int;precision highp sampler2DArray;precision highp sampler2DShadow;precision highp sampler2DArrayShadow;precision highp usampler2D;precision highp samplerCube;\n'+defs;
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
    const s=gl.createShader(t);gl.shaderSource(s,hdr+src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);console.error(log,src.split('\n').map((l,i)=>(i+3+defs.split('\n').length-1)+': '+l).join('\n'));throw new Error(log);}
    gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);const nm=inf.name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
/* the dot matrix's sampling of the scene: kept for the settings that still set it (the renderer's dynamic resolution
   does its job now) */
let SS=2;
const VS_FS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
/* ===== the flat-shaded mesh builder and the mesh helpers, from Shiftlight 2 ===== */
let VAO0,HTEX;
let VW=1,VH=1,DPR=1,RECT={x:0,y:0,w:100,h:56};
function glInit(){
  VAO0=gl.createVertexArray();
  /* the HUD buffer's texture: uploaded once a frame, read by the dot passes (55_post) */
  HTEX=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,HTEX);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
}
/* the HUD's pixels go up into the same texture each frame (reallocated only when the dots change size); the smooth
   text's canvas is painted first (10_core) */
let HTEX_WH='';
function hudUpload(){txtFlush();gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);const wh=BW+'x'+BH;
  if(wh!==HTEX_WH){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,BW,BH,0,gl.RGBA,gl.UNSIGNED_BYTE,HB8);HTEX_WH=wh;}
  /* (only the rows drawn or cleared since the last upload: 10_core's hMark) */
  else{const a=Math.max(0,HU0),b=Math.min(BH,HU1);if(b>a)gl.texSubImage2D(gl.TEXTURE_2D,0,0,a,BW,b-a,gl.RGBA,gl.UNSIGNED_BYTE,HB8.subarray(a*BW*4,b*BW*4));}
  HU0=1<<30;HU1=0;}
