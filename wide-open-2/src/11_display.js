/* ===== display: the LED dot pass, bloom and tone map, from Shiftlight 2 ===== */
/* =====================================================================================
   4. DISPLAY — WebGL2. The 3D scene renders into a (BW*SS x BH*SS) HDR target; the HUD lives
      in a BW x BH RGBA buffer (BW = W*HS: the logical grid times the high-detail scale). The LED pass samples both once per dot (a linear fetch at the
      dot centre = an exact 2x2 box filter), composites, quantizes to LED PWM steps with an
      ordered dither, and draws round dots. Then two-level bloom, ACES, vignette.
   ===================================================================================== */
const cv=$('gl');
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
/* float colour targets: full floats where there are, half floats on the phones that only have those */
const HDR=gl?!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float')):false;
const STYLE_ID={color:0,amber:1,lamp:2}[(location.search.match(/[?&]style=(\w+)/)||[])[1]||'color']||0;
let SS=2;
function compile(vs,fs,defs=''){
  const p=gl.createProgram();
  for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
    const s=gl.createShader(t);gl.shaderSource(s,'#version 300 es\nprecision highp float;precision highp int;\n'+defs+src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);console.error(log,src.split('\n').map((l,i)=>(i+3+defs.split('\n').length-1)+': '+l).join('\n'));throw new Error(log);}
    gl.attachShader(p,s);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);const nm=inf.name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(p,inf.name);}
  return {p,u};
}
const VS_FS=`out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const FS_LED=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uHud;uniform sampler2D uExpo;uniform vec2 uRes;uniform float uGain;uniform int uStyle;uniform float uScn;uniform vec3 uFlash;uniform float uQuant;uniform vec3 uEdge;out vec4 o;
const float BY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 tc=(id+.5)/uRes;
  /* (the exposure: 55_post's auto exposure, 1 where there is none) */
  vec3 sc=texture(uScene,tc).rgb*uScn*texture(uExpo,vec2(.5)).r+uFlash;
  vec4 hu=texture(uHud,vec2(tc.x,1.-tc.y));
  /* tame HDR highlights under opaque UI so a bright light behind a panel can't glow through it */
  float ka=hu.a*hu.a*hu.a;sc/=1.+ka*max(max(sc.r,sc.g),sc.b)*4.;
  vec3 c=mix(sc,pow(hu.rgb,vec3(2.2))*1.25,hu.a);
  if(uQuant>0.){int bi=(int(mod(id.y,4.))<<2)|int(mod(id.x,4.));float d=(BY[bi]+.5)/16.;vec3 q=sqrt(max(c,0.));q=floor(q*uQuant+d)/uQuant;c=q*q;}
  float r=.43;
  if(uStyle==1){float l=dot(c,vec3(.3,.59,.11));l=floor(pow(l,.8)*15.+.5)/15.;c=vec3(1.,.38,.06)*l*1.25;r=.4;}
  if(uStyle==2){r=.47;}
  float fw=max(fwidth(cell.x),fwidth(cell.y));
  float d=length(f);
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d);
  float hot=1.0-smoothstep(0.0,r,d);
  float far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.74+.48*hot),.58,far);
  if(uStyle==2){m=mix(dm*(.55+.9*hot*hot),.6,far);float spec=1.0-smoothstep(0.0,.12,length(f-vec2(-.13,.15)));c+=vec3(.35,.3,.25)*spec*dm*(.15+length(c));}
  vec3 unlit=(uStyle==1?vec3(.6,.25,.08):vec3(.52,.5,.62))*.016;
  vec3 col=(c*uGain+unlit)*m;
  vec2 qe=vT-.5;col+=uEdge*smoothstep(.15,.33,dot(qe,qe))*m*.85;   /* nitro / boost glow on the edge dots */
  vec2 q2=vT-vec2(.22,.9);col+=vec3(.010,.010,.014)*(1.0-smoothstep(0.0,.8,length(q2)));
  o=vec4(col,1.0);
}`;
const FS_BRIGHT=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=texture(uTex,vT+uPx*vec2(-1,-1)).rgb+texture(uTex,vT+uPx*vec2(1,-1)).rgb+texture(uTex,vT+uPx*vec2(-1,1)).rgb+texture(uTex,vT+uPx*vec2(1,1)).rgb;
c*=.25;float l=max(c.r,max(c.g,c.b));c*=max(l-uThr,0.0)/max(l,1e-4);o=vec4(c,1.0);}`;
const FS_BLUR=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uDir;out vec4 o;
void main(){vec3 s=texture(uTex,vT).rgb*.227027;s+=(texture(uTex,vT+uDir*1.3846).rgb+texture(uTex,vT-uDir*1.3846).rgb)*.316216;
s+=(texture(uTex,vT+uDir*3.2308).rgb+texture(uTex,vT-uDir*3.2308).rgb)*.070270;o=vec4(s,1.0);}`;
const FS_COMP=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform float uBloom;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
uniform vec3 uGrade;
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.8+texture(uB2,vT).rgb*1.2)*uBloom;c=aces(c*1.1);c=pow(c,vec3(1.0/2.2));
  /* grade: saturation, contrast around mid grey, and an edge tint for nitro and boost */
  float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uGrade.x);c=clamp((c-.5)*uGrade.y+.5,0.,1.);
  vec2 q=vT-.5;float e=dot(q,q);c*=1.0-e*.5;o=vec4(c,1.0);}`;


