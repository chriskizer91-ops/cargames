/* ===== display: the GL context (Shiftlight 3's renderer's) and shader compiling for the game's own passes ===== */
/* =====================================================================================
   4. DISPLAY — WebGL2 through Shiftlight 3's renderer (11_sl3). R is the renderer, gl its context; both are
      made by rutInit (called from the boot, 65_boot) once the graphics tier is known. Everything the game
      draws goes through the renderer's hooks (52_world_gl's LAND, 60_game's CARS, 53_fx's FXP); the
      display modes (the LED dot matrix and the clear picture) and the HUD over them are 55_post's.
   ===================================================================================== */
const cv=$('gl');
let R=null,gl=null,RESO=null;
/* float colour targets: the renderer needs them, and refuses to start without */
const HDR=true;
const STYLE_ID={color:0,amber:1,lamp:2}[(location.search.match(/[?&]style=(\w+)/)||[])[1]||'color']||0;
/* the renderer, at the graphics tier (55_gfx), with this game's own sky and no city of its own */
function rutInit(){
  R=new SL3.Renderer(cv,{quality:GFX.level,sky:rutShaders().SKY_FS,noWorld:true});gl=R.gl;
  RESO=new SL3.DRS({min:.5,max:R.Q.maxScale,start:Math.min(R.Q.maxScale,touchy?.75:.85)});
  glInit();resize();addEventListener('resize',resize);
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
const VS_FS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
