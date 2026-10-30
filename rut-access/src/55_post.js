/* =====================================================================================
   THE PICTURE: how the renderer's frame reaches the screen.
   - Two displays. Clear is Shiftlight's picture at the screen's own resolution (TAA rebuilds it from the
     render scale dynamic resolution picks), with the HUD lit up in dots over it. Dots is the LED matrix every
     Dirt Sleeper has had: the picture made at twice the dot pitch, then each dot the average of what's behind
     it, the HUD's dots among them. The matrix fills the window; the HUD keeps its 16:9 grid in the middle.
   - Dynamic resolution (Shiftlight's DRS): the GPU's own frame time where the browser reports it, the frame
     rate where it doesn't, trading render scale for an even frame rate.
   - The performance readout (P): frames a second, where the frame's time goes, the GPU time, the resolution
     being drawn, the tier, the graphics chip.
   ===================================================================================== */
/* the clear picture is the default everywhere; the LED matrix is the switchable display every Dirt game has had */
const DISP={mode:'clear'};
{const Q=new URLSearchParams(location.search),d=Q.get('display')||store.get('rut-display','');DISP.mode=d==='dots'||d==='clear'?d:'clear';}
function setDisplay(m){DISP.mode=m;store.set('rut-display',m);if(R)resize();}
/* the picture's size, and the dot matrix's */
const PIC={w:2,h:2,dots:[320,180]};
/* dots the pitch of the HUD's grid (BH rows over the window's height), across the whole window */
function dotsRes(){return [Math.max(16,Math.round(BH*VW/VH)),BH];}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,R?R.Q.dpr:2);VW=Math.max(2,Math.round(innerWidth*DPR));VH=Math.max(2,Math.round(innerHeight*DPR));cv.width=VW;cv.height=VH;
  layout();
  if(!R)return;
  if(DISP.mode==='clear'){PIC.w=VW;PIC.h=VH;}
  else{const d=PIC.dots=dotsRes();PIC.w=Math.min(VW,d[0]*2);PIC.h=Math.min(VH,d[1]*2);}
  R.resize(PIC.w,PIC.h,R.iw?R.scale:RESO.scale);
}
/* ---------- dynamic resolution ---------- */
function drsStep(dt){if(!RESO||!R||GAME.state!=='drive')return;const sc=RESO.update(dt*1000,R.gpuMs);if(Math.abs(sc-R.scale)>.001)R.resize(PIC.w,PIC.h,sc);}
/* ---------- the HUD over the picture, in dots ---------- */
const POST={quant:20,edge:[0,0,0],flash:[0,0,0]};
/* where the HUD's 16:9 grid sits on the canvas, in device pixels from the bottom left */
function hudRect(){const rx=Math.round(RECT.x*DPR),rh=Math.round(RECT.h*DPR),rw=Math.round(RECT.w*DPR),ry=VH-Math.round(RECT.y*DPR)-rh;return [rx,ry,rw,rh];}
/* the clear display: the HUD's dots over the finished picture (blended: ONE, ONE_MINUS_SRC_ALPHA), on a dark panel */
const FS_HUDDOT=`in vec2 vT;out vec4 o;uniform sampler2D uHud;uniform vec4 uRect;uniform vec2 uRes;uniform vec3 uEdge;
void main(){
  vec2 p=(gl_FragCoord.xy-uRect.xy)/uRect.zw;vec3 add=vec3(0.);float a=0.;
  vec2 qe=vT-.5;add+=uEdge*smoothstep(.15,.33,dot(qe,qe))*.6;
  if(p.x>=0.&&p.y>=0.&&p.x<=1.&&p.y<=1.){vec2 cell=p*uRes,id=floor(cell),f=fract(cell)-.5;vec4 hu=texture(uHud,vec2((id.x+.5)/uRes.x,1.-(id.y+.5)/uRes.y));
    if(hu.a>0.){float fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f),dm=1.-smoothstep(.42-fw*.6,.42+fw*.6,d),far=smoothstep(.38,.95,fw),
      m=mix(dm*(.82+.4*(1.-smoothstep(0.,.42,d))),.62,far);
      add+=min(hu.rgb*1.15,vec3(1.))*m*hu.a;a=hu.a*.82;}}
  o=vec4(add,a);}`;
/* the LED matrix (Shiftlight's dot pass, with the HUD kept to its own grid and Dirt Sleeper's styles) */
const FS_LED=`in vec2 vT;out vec4 o;
uniform sampler2D uSrc;uniform sampler2D uHud;uniform vec2 uRes;uniform float uGain;uniform float uQuant;uniform vec4 uRect;uniform vec2 uCanvas;uniform int uStyle;uniform vec3 uEdge;
const float BY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 tc=(id+.5)/uRes;
  vec3 sc=texture(uSrc,tc).rgb;sc=pow(sc,vec3(2.2));
  /* the HUD's dot under this one, where this dot falls in the HUD's own grid */
  vec2 hp=(tc*uCanvas-uRect.xy)/uRect.zw;
  vec4 hu=(hp.x>=0.&&hp.x<=1.&&hp.y>=0.&&hp.y<=1.)?texture(uHud,vec2(hp.x,1.-hp.y)):vec4(0.);
  /* tame highlights under opaque UI so a bright sky can't glow through it */
  float ka=hu.a*hu.a*hu.a;sc/=1.+ka*max(max(sc.r,sc.g),sc.b)*4.;
  vec3 c=mix(sc,pow(hu.rgb,vec3(2.2))*1.25,hu.a);
  if(uQuant>0.){int bi=(int(mod(id.y,4.))<<2)|int(mod(id.x,4.));float d=(BY[bi]+.5)/16.;vec3 q=sqrt(max(c,0.));q=floor(q*uQuant+d)/uQuant;c=q*q;}
  float r=.43;
  if(uStyle==1){float l=dot(c,vec3(.3,.59,.11));l=floor(pow(l,.8)*15.+.5)/15.;c=vec3(1.,.38,.06)*l*1.25;r=.4;}
  if(uStyle==2){r=.47;}
  float fw=max(fwidth(cell.x),fwidth(cell.y)),dd=length(f);
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,dd),hot=1.0-smoothstep(0.0,r,dd),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.74+.48*hot),.58,far);
  if(uStyle==2){m=mix(dm*(.55+.9*hot*hot),.6,far);float spec=1.0-smoothstep(0.0,.12,length(f-vec2(-.13,.15)));c+=vec3(.35,.3,.25)*spec*dm*(.15+length(c));}
  vec3 unlit=(uStyle==1?vec3(.6,.25,.08):vec3(.52,.5,.62))*.016;
  vec3 col=(c*uGain+unlit)*m;
  vec2 qe=vT-.5;col+=uEdge*smoothstep(.15,.33,dot(qe,qe))*m*.85;
  vec2 q2=vT-vec2(.22,.9);col+=vec3(.010,.010,.014)*(1.0-smoothstep(0.0,.8,length(q2)));
  o=vec4(pow(col,vec3(1./2.2)),1.0);
}`;
let P_HUDDOT=null,P_LED=null;
/* both displays' programs, made at the boot so switching between them never stalls */
function displayPrograms(){if(!P_HUDDOT)P_HUDDOT=compile(VS_FS,FS_HUDDOT);if(!P_LED)P_LED=R.G.program('rutLed',SL3.FS_VS,FS_LED);}
function hudOverlay(R){
  if(APP.photo)return;
  if(!P_HUDDOT)P_HUDDOT=compile(VS_FS,FS_HUDDOT);const P=P_HUDDOT,u=P.u;gl.useProgram(P.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.uniform1i(u.uHud,0);
  gl.uniform4fv(u.uRect,hudRect());gl.uniform2f(u.uRes,BW,BH);gl.uniform3fv(u.uEdge,POST.edge);
  gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);gl.bindVertexArray(null);
}
/* what the renderer needs for the LED display this frame, or null for the clear picture */
function ledState(){
  if(DISP.mode!=='dots')return null;
  if(!P_LED)P_LED=R.G.program('rutLed',SL3.FS_VS,FS_LED);
  return {res:PIC.dots,hud:{t:HTEX,target:gl.TEXTURE_2D},quant:POST.quant,program:P_LED,uniforms:{uRect:hudRect(),uCanvas:[VW,VH],uStyle:STYLE_ID,uEdge:POST.edge,uGain:1.25}};
}
/* ---------- the performance readout ---------- */
const PERF={on:store.get('rut-perf','0')==='1',n:0,t:0,worst:0,step:0,draw:0,gpu:0,gpuN:0,t0:performance.now()};
function setPerf(on){PERF.on=on;store.set('rut-perf',on?'1':'0');}
function perfAcc(dt,stepMs,drawMs){
  const P=PERF;P.n++;P.t+=dt*1000;P.worst=Math.max(P.worst,dt*1000);P.step+=stepMs;P.draw+=drawMs;if(R.gpuMs>0){P.gpu+=R.gpuMs;P.gpuN++;}
  const el=$('perf'),on=PERF.on&&GAME.state==='drive';if(el.hidden===on)el.hidden=!on;
  const now=performance.now();if(now-P.t0<500)return;
  if(on&&P.n){const f=x=>x.toFixed(1);
    el.textContent=[`${Math.round(1000*P.n/(now-P.t0))} FPS   target ${(RESO.hz/RESO.div).toFixed(0)} (${RESO.hz} Hz screen)   frame ${f(P.t/P.n)} ms   worst ${f(P.worst)} ms`,
      `CPU   game ${f(P.step/P.n)} ms · draw ${f(P.draw/P.n)} ms`,
      `GPU   ${P.gpuN?f(P.gpu/P.gpuN)+' ms':'not reported by this browser'}`,
      `render ${R.iw}×${R.ih} of ${R.W}×${R.H} (${Math.round(R.iw/R.W*100)}%)   ${GFX_LEVELS.find(l=>l[0]===GFX.level)[1]}${DISP.mode==='dots'?'   dots '+PIC.dots[0]+'×'+PIC.dots[1]:''}`,
      `${fmt(APP.tris/1000)}k tris   land ${RANCH.stat?fmt((RANCH.stat.ground+RANCH.stat.props)/1000)+'k, trees '+fmt(RANCH.stat.trees/1000)+'k':''}`,
      `chip  ${R.gpuName}${R.software?'  (SOFTWARE: no graphics card)':''}`].join('\n');}
  P.n=0;P.t=0;P.worst=0;P.step=0;P.draw=0;P.gpu=0;P.gpuN=0;P.t0=now;
}
