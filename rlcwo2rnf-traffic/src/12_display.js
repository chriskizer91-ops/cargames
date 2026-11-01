/* ===== display: the GL context (Shiftlight 3's renderer's) and shader compiling for the game's own passes ===== */
/* =====================================================================================
   4. DISPLAY — WebGL2 through Shiftlight 3's renderer (11_sl3). R is the renderer, gl its context; both are made
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
  RESO=new SL3.DRS({min:.5,max:R.Q.maxScale,start:Math.min(R.Q.maxScale,touchy?.75:.85)});
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
