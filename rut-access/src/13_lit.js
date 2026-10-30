/* ===== the scene shaders: Dirt Sleeper's materials, lit by Shiftlight 3's pipeline =====
   Every surface keeps the material it had in Showdown (a colour, a specular strength and a Blinn exponent, plus
   the detail cut into the ground without textures: clods, grain, pebbles, gravel, cracks, rock relief, all
   bump-mapped and faded by how big a pixel is on the ground). What lights it is Shiftlight 3's: the sun through
   its cascaded shadow maps, the clustered lamps, the car's headlights with their low-beam cut-off and shadow map,
   the probe at the car for reflections (and the screen for wet ground, through the SSR pass), a GGX BRDF with a
   clear coat for the paint, translucent leaves, the soft occlusion under the cars. The shaders write the
   renderer's targets: colour, normal + roughness + reflection weight, and motion (for TAA and motion blur).
   The defines: PROBE draws the cheaper version the reflection probe sees (no bump, sky reflections, one target).
   Everything is assembled by rutShaders() the first time it is asked for, so this module loads in Node (the
   tools) where the renderer is not. */
/* material ids (used by the mesh builders) */
const MAT={COL:0,PAINT:1,GLASS:2,GLASSL:3,ACCENT:4,CHROME:5,TYRE:6,TAIL:7,HEAD:8,LED:9,AMBER:10,MESH:11,RIM:12,CLAD:13,SHUT:14,EMIT:15,METAL:16,CARBON:17,LOUVRE:18,CALIPER:19,ROTOR:20,FLOOR:21,PLATE:22,REV:23,SMOKE:24,REFL:25,FABRIC:26,RUBBER:27,HALO:29};
/* (kept for the modules that still pass defines around) */
let LIT_DEFS='';
let RUT_SRC=null;
function rutShaders(){
  if(RUT_SRC)return RUT_SRC;
  const G=SL3.GLSL;
/* ---------- the sky, shared by the sky pass, the fog and the reflections: Dirt Sleeper's look in the renderer's units ---------- */
const SKYFN=`
uniform vec3 uFogAmb;
/* the open sky: deep blue overhead to a pale horizon, the ground's own colour below it, the sun's glow (wider and
   warmer the lower it is) */
vec3 skyBase(vec3 d){
  float t=d.y,sd=max(dot(d,uSunDir),0.),low=1.-saturate(uSunDir.y*1.6);
  vec3 c=mix(uSkyHor,uSkyZen,pow(smoothstep(0.,.75,t),.8));
  c=mix(c,uAmbDn*.9,(1.-smoothstep(-.12,.02,t)));
  c+=uSunCol*(pow(sd,24.)*.08+pow(sd,4.)*.03)*smoothstep(-.05,.02,t)*(1.-uNight*.7);
  c+=uSunCol*vec3(1.,.62,.32)*low*pow(sd,3.)*.22*(1.-smoothstep(0.,.45,t))*(1.-uNight);
  return c;}
/* the sky with the sun (or the moon and the stars) and the clouds drifting over it: lit toward the sun, grey and
   heavy in the rain, their edges catching a low sun's colour */
vec3 rutSky(vec3 d,bool clouds){
  vec3 c=skyBase(d);float t=d.y,sd=max(dot(d,uSunDir),0.);
#ifndef PROBE
  /* the sun's disc (not in the probe: a small cube would smear it into a blob in every reflection) */
  float disc=smoothstep(cos(uSunSize*1.15),cos(uSunSize),sd);c+=uSunCol*disc*(uNight>.5?6.:60.)*smoothstep(-.05,.02,t)*(1.-uCloud*.85);
#endif
  if(uNight>0.){c+=uSunCol*pow(sd,2400.)*120.*uNight;
    if(uStars>0.){vec3 q=floor(d*620.);float st=h13(q);c+=vec3(.9,.92,1.)*step(.9982,st)*(.6+1.4*h13(q+7.))*uStars*uNight*smoothstep(.02,.2,t)*.3;}}
  if(clouds&&uCloud>0.&&t>0.){vec2 uv=d.xz/(t+.12)*1.5+uTime*vec2(.006,.0025);float n=fbm(uv*1.2)*.62+fbm(uv*3.4+3.1)*.38;
    float cov=smoothstep(1.-uCloud,1.25-uCloud,n)*smoothstep(.0,.08,t);
    vec3 day=mix(vec3(.5,.55,.64),vec3(1.12,1.08,1.02),(.35+.65*sd)*(.6+.4*n))*mix(1.,.45,uRain)*max(uSkyHor.b,.2);
    vec3 night=uSkyHor*2.2+uSkyZen*.8;
    vec3 cc=mix(day,night,uNight);
    cc+=uSunCol*vec3(1.,.6,.3)*pow(sd,6.)*(1.-saturate(uSunDir.y*2.))*(1.-n)*.6*(1.-uNight);
    c=mix(c,cc,cov*.92);}
  return c;}
/* what the air adds along a ray in direction rd: the ambient haze and the sun scattered forward, the same light
   the volumetric fog pass marches through (so the far land, fogged analytically, matches it) */
float hgS(float c,float g){float g2=g*g;return (1.0-g2)/(4.*PI*pow(1.0+g2-2.0*g*c,1.5));}
vec3 fogLi(vec3 rd){float sd=dot(rd,uSunDir);return uFogAmb+uSunCol*(hgS(sd,.55)*.8+hgS(sd,-.2)*.2);}
/* the haze toward the horizon in a direction: the sky's own colour there (no sun disc), dimmed a touch */
vec3 hazeCol(vec3 d){vec3 h=normalize(vec3(d.x,clamp(d.y,.0,.25)*.35+.015,d.z));return mix(uFogCol,skyBase(h)*.92,.7);}
/* what the far land fades into: the fog's light near, the horizon's colour far off */
vec3 fogFar(vec3 rd,float dist){return mix(fogLi(rd),hazeCol(rd),smoothstep(160.,700.,dist));}
`;
/* ---------- the sky pass ---------- */
const SKY_FS=G.FRAME+G.NOISE+G.PACK+SKYFN+`
in vec2 vT;layout(location=0) out vec4 oCol;
#ifndef PROBE
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
void main(){
  vec4 q=uInvVP*vec4(vT*2.-1.,1.,1.);vec3 d=normalize(q.xyz/q.w-uCam);
  vec3 c=rutSky(d,true);
  /* the haze toward the horizon: the fog, as far as the eye sees it */
  float fogT=exp(-uFogDen*900.*saturate(1.0-d.y*2.));c=c*mix(1.0,fogT,.85)+hazeCol(d)*(1.0-fogT)*.85;
  oCol=vec4(c,1.0);
#ifndef PROBE
  oNrm=vec4(0,0,1,0);
  vec4 cp=uVPnj*vec4(uCam+d*5000.,1.),pp=uPrevVP*vec4(uCam+d*5000.,1.);
  oVel=(cp.xy/cp.w-pp.xy/pp.w)*.5;
#endif
}`;
/* ---------- the vertex shader: the game's meshes (position, normal, colour, material), plain or instanced ---------- */
const VS=`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in float aMat;
layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform mat4 uM;uniform mat4 uPrevM;uniform mat4 uVP;uniform mat4 uVPnj;uniform mat4 uPrevVP;uniform float uTime;uniform float uInst;
out vec3 vP;out vec3 vN;out vec4 vC;out float vMat;out vec3 vL;out vec4 vCur;out vec4 vPrev;
void main(){
  vec3 w,pw;
  if(uInst>.5){
    /* instanced bits (mud, trees): position and yaw, size, colour and glow per instance; a vertex whose colour
       alpha is 2 keeps its own colour (tree trunks) */
    float c=cos(iA.w),s=sin(iA.w);vec3 q=aPos*iB.xyz;w=iA.xyz+vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);
    /* the trees sway in the wind, more the higher up (leaves 48, trunks 46) */
    if(aMat>45.5&&aMat<48.5){float ph=iA.x*.13+iA.z*.17,k=max(q.y-1.2,0.);
      w.xz+=vec2(sin(uTime*1.1+ph)+.4*sin(uTime*2.7+ph*1.7),.6*cos(uTime*.9+ph*1.3))*k*k*.0035;}
    vN=normalize(vec3(c*aNrm.x+s*aNrm.z,aNrm.y,-s*aNrm.x+c*aNrm.z));vC=aCol.a>1.5?vec4(aCol.rgb,0.):vec4(iC.rgb*aCol.rgb,iC.a);vL=aPos*iB.xyz;pw=w;}
  else{vec4 p=vec4(aPos,1.);w=(uM*p).xyz;pw=(uPrevM*p).xyz;vN=normalize(mat3(uM)*aNrm);vC=aCol;vL=aPos;}
  vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);vCur=uVPnj*vec4(w,1.);vPrev=uPrevVP*vec4(pw,1.);}`;
/* ---------- the depth pass (the shadow maps): position only ---------- */
const DEPTH_VS=`
layout(location=0) in vec3 aPos;layout(location=3) in float aMat;layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;
uniform mat4 uM;uniform mat4 uVP;uniform float uTime;uniform float uInst;
void main(){vec3 w;
  if(uInst>.5){float c=cos(iA.w),s=sin(iA.w);vec3 q=aPos*iB.xyz;w=iA.xyz+vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);
    if(aMat>45.5&&aMat<48.5){float ph=iA.x*.13+iA.z*.17,k=max(q.y-1.2,0.);w.xz+=vec2(sin(uTime*1.1+ph)+.4*sin(uTime*2.7+ph*1.7),.6*cos(uTime*.9+ph*1.3))*k*k*.0035;}}
  else w=(uM*vec4(aPos,1.)).xyz;
  gl_Position=uVP*vec4(w,1.);}`;
const DEPTH_FS=`out vec4 o;void main(){o=vec4(0.);}`;
/* ---------- the materials ---------- */
const MATFN=`
uniform samplerCube uProbe;uniform float uProbeLod;
/* the car being drawn */
uniform vec3 uPaint;uniform vec3 uPaint2;uniform vec3 uRim;uniform vec3 uCal;uniform vec3 uClad;
uniform float uLiv;uniform float uLamps;uniform float uBrake;uniform float uDirt;uniform float uGround;uniform vec4 uLivP;
uniform float uMudOff;uniform float uMudLocal;
/* how much fine detail to draw (0 a weak phone .. 1 a laptop), and how far the land is drawn */
uniform float uDetail;uniform float uDrawFar;
/* emissives were tuned against a sun of 1.3; the renderer's sun is 6 */
const float EMK=5.;
float sat(float x){return clamp(x,0.,1.);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbmS(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,-9.1);a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.07+vec3(1.7,9.2,4.1);a*=.5;}return s;}
/* cellular noise: the nearest feature point (x: its distance, yz: the vector to it, w: its cell's id) */
vec4 cell(vec2 p){vec2 n=floor(p),f=fract(p),mr=vec2(0.);float md=8.,id=0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),c=n+g,r=g+vec2(h12(c),h12(c+19.7))-f;float d=dot(r,r);if(d<md){md=d;mr=r;id=h12(c+3.1);}}
  return vec4(sqrt(md),mr,id);}
/* and the distance to the nearest cell edge (cracks), Quilez's two passes */
float cellEdge(vec2 p){vec2 n=floor(p),f=fract(p),mg=vec2(0.),mr=vec2(0.);float md=8.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),c=n+g,r=g+vec2(h12(c),h12(c+19.7))-f;float d=dot(r,r);if(d<md){md=d;mr=r;mg=g;}}
  md=8.;for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){vec2 g=mg+vec2(i,j),c=n+g,r=g+vec2(h12(c),h12(c+19.7))-f;
    if(dot(mr-r,mr-r)>1e-5)md=min(md,dot(.5*(mr+r),normalize(r-mr)));}
  return md;}
vec3 envBRDF(vec3 F0,float NoV,float r){const vec4 c0=vec4(-1,-.0275,-.572,.022),c1=vec4(1,.0425,1.04,-.04);vec4 rr=r*c0+c1;
  float a=min(rr.x*rr.x,exp2(-9.28*NoV))*rr.x+rr.y;vec2 AB=vec2(-1.04,1.04)*a+rr.zw;return F0*AB.x+AB.y;}
/* mud: caked and wet low down, dry and splattered higher up; returns 0..1 coverage */
float mud(vec3 L,float h){
  if(uDirt<=0.)return 0.;
  float n=fbm3(L*vec3(2.2,5.,2.2));
  float line=.2+.68*uDirt+(n-.5)*.28;
  float cake=1.-smoothstep(line-.05,line+.05,h);
  float spl=smoothstep(.6-.1*uDirt,.66-.1*uDirt,fbm3(L*7.+3.))*(1.-smoothstep(line,line+.45+.35*uDirt,h))*uDirt;
  return clamp(max(cake,spl*.85),0.,1.);
}
vec3 mudCol(vec3 L,float h){float w=1.-smoothstep(.0,.6,h),g=vn3(L*14.);return mix(vec3(.30,.22,.14),vec3(.13,.09,.055),w)*(.88+.24*g);}
/* ---------- the ground's materials ---------- */
/* metres per pixel here, and the height gradient the detail adds (world x, z) */
float gFP=0.;vec2 gG=vec2(0.);
/* fades detail of a given size (m) out as pixels grow past it */
float near(float size){return sat(1.-gFP/size)*uDetail;}
/* the ranch's red-dirt country (Dirt Sleeper's palette) */
vec3 dirtCol(vec2 p){float n1=fbmS(p*.09),n3=vn(p*3.1);return mix(vec3(.21,.095,.045),vec3(.36,.2,.105),n1)*(.8+.35*n3);}
vec3 grassCol(vec2 p){float dry=smoothstep(.3,.78,fbmS(p*.045+7.));float n2=vn(p*.7),n3=vn(p*3.1),n4=vn(p*11.);
  return mix(vec3(.06,.105,.022),vec3(.2,.17,.06),dry)*(.62+.5*n4*n3+.25*n2);}
vec3 rockCol(vec3 P){float n=fbmS(P.xz*vec2(.8,2.6)+P.y),n2=vn(P.xz*7.+P.y*3.);
  vec3 c=mix(vec3(.25,.13,.08),vec3(.3,.25,.2),n2)*(.6+.6*n)*(.85+.3*n2);return mix(c,vec3(.2,.19,.07),smoothstep(.62,.7,fbmS(P.xz*1.7+3.))*.5);}
/* packed dirt: clods, grain and small stones bedded in it */
void dirtDetail(vec2 p,inout vec3 alb,float k){
  float f1=near(.25),f2=near(.06);if(f1<=0.)return;
  vec3 a=vnd(p*1.7),b=vnd(p*7.3+4.1);gG+=(a.yz*1.7*.05+b.yz*7.3*.012*f2)*f1*k;alb*=1.+(b.x-.5)*.22*f2*k;
  /* stones: one cell in three or so has one, each its own size, a little out of round, its own shade */
  if(f2>0.){vec4 c=cell(p*5.3);float sz=fract(c.w*7.13),r=.1+.22*sz*sz,wob=1.+.25*(vn(p*23.+c.w*40.)-.5),st=1.-smoothstep(r*.6,r,c.x*wob);
    if(st>0.&&c.w>.62){alb=mix(alb,alb*mix(vec3(.75,.72,.7),vec3(1.45,1.38,1.3),fract(c.w*13.7))*(.85+.3*c.w),st*f2*k);gG+=c.yz/(r*r)*2.*5.3*.008*st*f2*k;}}}
/* grass: tufts and the odd bare patch, streaked a little along the wind */
void grassDetail(vec2 p,inout vec3 alb){
  float f1=near(.3),f2=near(.05);if(f1<=0.)return;
  vec3 a=vnd(p*vec2(3.1,2.2)),b=vnd(p*vec2(13.,9.)+2.);gG+=(a.yz*vec2(3.1,2.2)*.025+b.yz*vec2(13.,9.)*.006*f2)*f1;
  alb*=.82+.36*mix(.5,b.x,f2)*(.7+.6*a.x);}
/* rock: relief and cracks, in 3D for the boulders' sides (returns a height for the derivative bump) */
float rockH(vec3 P){float h=fbm3(P*1.3)*.12+vn3(P*5.1)*.03*near(.08);
  if(uDetail>.6){float e=cellEdge(P.xz*.9+P.y*.4);h-=(1.-smoothstep(0.,.06,e))*.025*near(.06);}
  return h;}
/* gravel: stones of every size and colour */
void gravelDetail(vec2 p,inout vec3 alb){
  float f=near(.05),f1=near(.2);if(f1<=0.)return;
  vec4 c=cell(p*9.);float r=.38+.12*c.w,st=1.-smoothstep(r*.55,r,c.x);
  alb*=mix(1.,(.7+.6*c.w)*(.8+.4*st),f1);gG+=c.yz/(r*r)*2.*9.*.006*st*f;
  vec3 b=vnd(p*2.2);gG+=b.yz*2.2*.02*f1;}
/* tarmac: fine aggregate, cracks, a darker seam now and then */
void asphaltDetail(vec2 p,inout vec3 alb,float ad,float hw){
  float f=near(.03),f1=near(.15);if(f1<=0.)return;
  vec3 a=vnd(p*38.);alb*=1.+(a.x-.5)*.25*f;gG+=a.yz*38.*.0008*f;
  if(uDetail>.6&&ad<hw){float e=cellEdge(p*.45),cr=(1.-smoothstep(0.,.03,e))*smoothstep(.55,.75,vn(p*.31));alb*=1.-.45*cr*f1;}}
/* mud that is drying out: plates and the cracks between them, away from the wet middle */
void mudCracks(vec2 p,inout vec3 alb,float dry,inout float spec){
  float f=near(.06);if(f<=0.||dry<=0.||uDetail<.6)return;
  float e=cellEdge(p*2.6),cr=(1.-smoothstep(.0,.05,e))*dry*f;alb=mix(alb,alb*.45,cr);alb*=1.+.12*dry*f;spec*=1.-.6*dry;}
/* falling rain on standing water: expanding rings (returns a normal gradient) */
vec2 ripplesS(vec2 p){
  vec2 g=vec2(0.);for(int L=0;L<2;L++){vec2 q=p*(L==0?1.6:2.3)+float(L)*7.3,n=floor(q);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 c=n+vec2(i,j);float h=h12(c+float(L)*3.1),t=fract(uTime*.9+h);
      vec2 d=q-(c+vec2(h12(c+1.3),h12(c+2.7)));float r=length(d),w=t*.9-r;
      if(abs(w)<.12)g+=d/max(r,1e-3)*sin(w*52.)*(1.-t)*(1.-abs(w)/.12)*.25;}}
  return g;}
`;
const FS=G.FRAME+G.NOISE+G.PACK+G.LIGHTING+G.SHADE+SKYFN+MATFN+`
in vec3 vP;in vec3 vN;in vec4 vC;in float vMat;in vec3 vL;in vec4 vCur;in vec4 vPrev;
layout(location=0) out vec4 oCol;
#ifndef PROBE
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
void main(){
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vP);if(dot(N,V)<0.)N=-N;vec3 Ng=N;
  vec3 alb=vC.rgb;float em=vC.a;float spec=.04,shin=12.,metal=0.,clear=0.,clearR=.035,trans=0.,ao=1.,ssr=0.,pud=0.;vec3 emc=vec3(0.);
  float dist=length(vP-uCam);gFP=max(length(dFdx(vP)),length(dFdy(vP)));
  /* a car out in the world measures its mud up itself; see-through things drop pixels (TAA averages them over the
     frames: the dust and spray carry their opacity as a negative glow); trees thin out right in front of the camera */
  int m=int(vMat+.5);float h=uMudLocal>.5?vL.y+uMudOff:vP.y-uGround;bool dirty=false,ground=false;
  if(em<0.){if(ign(gl_FragCoord.xy,uFrame)>-em)discard;em=0.;}
  if(m==48){if(dist<8.&&ign(gl_FragCoord.xy,uFrame)>smoothstep(3.,8.,dist))discard;
    /* the crown's edge broken into clumps of leaves: where it turns away from the eye, gaps open between them
       (anchored to the world, so they don't crawl; faded out where a clump is smaller than a few pixels) */
    float ed=1.-abs(dot(normalize(vN),V)),lv=vn3(vP*3.2)*.65+vn3(vP*9.)*.35,kf=1.-smoothstep(.04,.18,gFP);
    if(lv<(ed*ed*1.15-.2)*kf)discard;}
  if(m==1||m==4){
    vec3 pc=m==4?uPaint2:uPaint;
    /* race livery: a swept band low on the sides, twin stripes down the middle */
    if(uLiv>.5&&m==1){
      float xn=(vL.x-uLivP.y)/(uLivP.x-uLivP.y);
      float band=uLivP.z-.30+.34*smoothstep(.15,.85,1.-xn);
      bool l2=uLiv>1.5;
      if(uLiv>2.5){float az=abs(vL.z);bool top=N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3;
        if(uLiv<3.5){if(top&&(az>.03&&az<.25||az>.27&&az<.285))pc=uPaint2;}
        else if(abs(N.z)>.35){float q=vL.y-(uLivP.z-.43)-(1.-xn)*.5+.18*fract(xn*2.2);if(q>0.&&q<.11)pc=uPaint2;else if(q>-.1&&q<-.03&&xn<.62)pc=vec3(.025);}
        l2=true;}
      else if(!l2&&abs(N.z)>.35&&vL.y<band&&vL.y>uLivP.z-.62)pc=uPaint2;
      float az=abs(vL.z),s0=l2?.02:.07,s1=l2?.15:.2;if(uLiv<2.5&&az>s0&&az<s1&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=uPaint2;
      if(!l2&&az>.035&&az<.06&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=vec3(.9);
    }
    /* metallic flake under a smooth clear coat: each flake turns the normal a little (faded out once a flake is
       smaller than a pixel); the coat reflects the world and catches the sun as a sharp glint */
    alb=pc;vec3 fc=floor(vL*420.);float fl=h13(fc),fk=near(.004);alb*=.975+.05*fl;
    N=normalize(N+(vec3(fl,h13(fc+17.1),h13(fc+31.7))-.5)*.35*fk);
    spec=.5;shin=60.;metal=.55;clear=1.;clearR=.035;dirty=true;
  }
  else if(m==2){alb=vec3(.012,.014,.018);spec=1.;shin=40000.;ssr=1.;}
  else if(m==3){alb=vec3(.03,.036,.042);spec=1.;shin=40000.;ssr=1.;}
  else if(m==5){alb=vec3(.55,.56,.6);spec=1.;shin=90.;metal=1.;}
  else if(m==6){
    /* rubber: a darker tread band and sipes cut across it */
    alb=vec3(.032,.032,.034);spec=.06;shin=10.;
    float r=length(vL.xy),a=atan(vL.y,vL.x);
    if(em>0.&&r>em*.962)alb*=.62+.7*step(.42,fract(a*em*34.+step(0.,vL.z)*.5));
    em=0.;dirty=true;}
  else if(m==7){float on=max(uLamps*.5,uBrake);emc=vec3(1.,.05,.03)*(.25+on*2.6);alb=vec3(.25,.01,.01);spec=.7;shin=80.;}
  else if(m==8){emc=vec3(1.,.97,.9)*(uLamps*5.+.06);alb=vec3(.5);spec=1.;shin=90.;}
  else if(m==9){emc=vec3(.85,.92,1.)*(.7+uLamps*2.2);alb=vec3(.3);}
  else if(m==10){emc=vec3(1.,.48,.06)*(.12+uLamps*.5);alb=vec3(.35,.17,.03);spec=.7;shin=60.;}
  else if(m==11){
    vec3 nl=normalize(cross(dFdx(vL),dFdy(vL)));vec3 an=abs(nl);vec2 q=an.x>.6?vL.zy:an.y>.6?vL.xz:vL.xy;
    q*=34.;vec2 rr=vec2(1.,1.732),hh=rr*.5,a=mod(q,rr)-hh,b=mod(q-hh,rr)-hh,g=dot(a,a)<dot(b,b)?a:b;
    float d=max(abs(g.x),abs(g.x)*.5+abs(g.y)*.866),e=smoothstep(.36,.46,d);
    alb=mix(vec3(.004),vec3(.05),e);spec=.5*e;shin=50.;metal=.5*e;}
  else if(m==12){alb=uRim*.55;spec=.8;shin=70.;metal=1.;dirty=true;}
  else if(m==13){
    /* textured unpainted plastic */
    float g=vn3(vL*90.);alb=uClad*(.85+.3*g);spec=.07;shin=14.;dirty=true;}
  else if(m==14){alb=uPaint*.12;spec=.1;}
  else if(m==15){emc=alb*em;alb*=.25;}
  else if(m==16){spec=.6;shin=30.;metal=.6;dirty=true;}
  else if(m==17){float w=step(.5,fract((vL.x+vL.z)*55.))*.5+step(.5,fract((vL.x-vL.z)*55.))*.5;alb=vec3(.03+.025*w);spec=.7;shin=90.;clear=.8;clearR=.05;}
  else if(m==18){alb=vec3(.01)*(1.+2.*step(.55,fract(vL.x*30.)));spec=.3;}
  else if(m==19){alb=uCal*.7;spec=.5;shin=50.;clear=.6;clearR=.06;}
  else if(m==20){float r=length(vL.xy);alb=vec3(.28,.28,.3)*(.8+.2*step(.5,fract(r*60.)));spec=.6;shin=40.;metal=.8;}
  else if(m==22){alb=vec3(.62,.62,.58);spec=.2;}
  else if(m==23){emc=vec3(.9)*uLamps*.25;alb=vec3(.6);spec=.8;shin=80.;}
  else if(m==24){alb=vec3(.02,.018,.016);spec=1.;shin=120.;ssr=1.;}
  else if(m==25){alb=vec3(.35,.32,.28);spec=.8;shin=60.;metal=1.;}
  else if(m==26){float g=vn3(vL*60.);alb*=.85+.3*g;spec=.03;dirty=true;}
  else if(m==27){spec=.05;shin=10.;dirty=true;}
  else if(m==29){emc=vec3(.75,.88,1.)*(.15+uLamps*2.4);alb=vec3(.2);}
  else if(m>=40){
    vec2 wp=vP.xz;ground=true;
    if(m==40){
      /* the ground: weights for grass, rock and mud in the colour, ambient occlusion in its alpha */
      float n2=vn(wp*.7),n3=vn(wp*3.1),n4=vn(wp*11.);
      float gw=smoothstep(.3,.72,vC.r+(n2-.5)*.45),rw=smoothstep(.35,.65,vC.g+(n3-.5)*.3),mw=smoothstep(.25,.6,vC.b+(n2-.5)*.25);
      alb=dirtCol(wp);dirtDetail(wp,alb,1.-gw);
      if(gw>.004){vec3 gc=grassCol(wp);vec2 g0=gG;gG=vec2(0.);grassDetail(wp,gc);gG=mix(g0,gG,gw);alb=mix(alb,gc,gw);}
      if(rw>.004){alb=mix(alb,rockCol(vP),rw);vec3 a=vnd(wp*1.1);gG+=a.yz*1.1*.08*rw*near(.4);}
      spec=.03;shin=8.;
      if(mw>0.){vec3 md=mix(vec3(.15,.1,.06),vec3(.09,.06,.035),smoothstep(.3,.8,n3))*(.8+.35*n4);pud=smoothstep(.7,.76,fbmS(wp*.28)+mw*.05)*mw;
        alb=mix(alb,md,mw);spec=mix(spec,.25,mw);shin=30.;gG*=1.-mw*.7;mudCracks(wp,alb,mw*(1.-smoothstep(.55,.85,mw))*.9,spec);}
      ao=mix(1.,em,.85);em=0.;
    }
    else if(m==41){
      /* boulders and slabs: relief in 3D, bumped by the derivative of its height */
      alb=rockCol(vP);spec=.08;shin=16.;ao=mix(1.,em,.8);em=0.;ground=false;
#ifndef PROBE
      if(uDetail>.3&&gFP<.15){float hh=rockH(vP);vec3 dpx=dFdx(vP),dpy=dFdy(vP),r1=cross(dpy,N),r2=cross(N,dpx);float det=dot(dpx,r1);
        vec3 gr=sign(det)*(dFdx(hh)*r1+dFdy(hh)*r2);N=normalize(abs(det)*N-gr*1.2);alb*=.88+hh*1.4;}
#endif
    }
    else if(m==42){
      /* the drag strip: packed dirt, darker grooves where the tyres run, chalk lines (colour = metres past the line, metres across) */
      float sx=vC.r,d=vC.g,ad=abs(d),n2=vn(vec2(sx,d)*2.5);
      alb=dirtCol(wp)*mix(vec3(1.),vec3(.72,.66,.62),.35+.15*n2);
      float lane=min(abs(d+4.),abs(d-4.)),groove=exp(-pow(min(abs(lane-.82),abs(lane+.82))/.34,2.))*(.35+.65*(1.-smoothstep(-10.,90.,sx)));alb*=1.-.4*groove;
      alb=mix(alb,dirtCol(wp*1.3)*1.08,smoothstep(7.,8.8,ad));
      float ch=max(max(1.-step(.16,abs(sx)),1.-step(.16,abs(sx-201.168)))*step(ad,8.2),(1.-step(.07,abs(d)))*step(.45,fract(sx/5.))*step(-6.,sx)*step(sx,250.));
      ch=max(ch,(1.-step(.05,abs(ad-7.9)))*step(-12.,sx)*step(sx,250.));
      vec3 b=vnd(wp*14.);gG+=b.yz*14.*.002*near(.05)*(1.-groove);
      alb=mix(alb,vec3(.7,.68,.63),ch*(1.-.6*smoothstep(.4,.8,fbmS(vec2(sx,d)*vec2(.6,2.)))));spec=.04+.1*groove;shin=8.+30.*groove;
    }
    else if(m==43){
      /* a two-track: packed ruts, a grassy crown, grass closing in at the verges */
      float d=vC.g,ad=abs(d),n2=vn(vec2(vC.r,d)*2.5);alb=dirtCol(wp);
      float rut=exp(-pow((ad-.86)/.3,2.)),crown=1.-smoothstep(.18,.45,ad),verge=smoothstep(1.9,3.3,ad+(n2-.5)*.8);
      dirtDetail(wp,alb,1.-rut*.6);gG*=1.-rut*.5;
      alb*=1.-.22*rut;float gw=max(crown*.85*smoothstep(.25,.55,vn(vec2(vC.r*.7,d*3.))),verge);
      if(gw>.01){vec3 gc=grassCol(wp);grassDetail(wp,gc);alb=mix(alb,gc,gw);}spec=.04+.04*rut;shin=8.+10.*rut;
    }
    else if(m==44){
      /* the mud track: churned and wet, ruts with water lying in them */
      float sx=vC.r,d=vC.g,ad=abs(d),n3=vn(vec2(sx*.9,d*2.2)),n4=vn(vec2(sx,d)*7.);
      vec3 md=mix(vec3(.13,.085,.05),vec3(.075,.05,.03),smoothstep(.3,.8,n3))*(.8+.35*n4);
      float rut=0.;for(int i=0;i<4;i++){float c=(float(i)-1.5)*1.55+(vn(vec2(sx*.08,float(i)*3.))-.5)*.7;rut=max(rut,exp(-pow((d-c)/.34,2.)));}
      float edge=smoothstep(3.8,4.9,ad+(n3-.5)*1.2),clod=smoothstep(.55,.8,vn(vec2(sx*3.,d*5.)))*(1.-rut);
      alb=mix(md*(1.+clod*.45),dirtCol(wp)*.85,edge*.6);spec=.3;shin=40.;
      vec3 b=vnd(wp*3.3);gG+=b.yz*3.3*.03*near(.15)*(1.-rut)*(.5+clod);
      pud=rut*smoothstep(.45,.6,fbmS(vec2(sx*.15,d*.6)))*(1.-edge);
      mudCracks(wp,alb,edge*.8,spec);
    }
    else if(m==45){float j=max(step(fract(wp.x/4.),.012),step(fract(wp.y/4.),.012));alb=vec3(.26,.25,.235)*(.82+.25*vn(wp*2.3)+.1*vn(wp*13.))*(1.-.35*j);spec=.06;shin=20.;
      vec3 b=vnd(wp*24.);gG+=b.yz*24.*.0007*near(.03);alb*=1.-.18*smoothstep(.6,.85,fbmS(wp*.35))*uDetail;}
    else if(m==46){float g=vn(vec2((vP.x+vP.z)*1.5,vP.y*38.))*.6+vn(vec2((vP.x+vP.z)*.4,vP.y*7.))*.4;alb*=.62+.5*g;spec=.03;ground=false;}
    else if(m==47){float rib=abs(fract((vP.x+vP.z)*3.6+(em>.5?vP.y*3.6:0.))-.5),st=smoothstep(.55,.85,vn(vec2((vP.x+vP.z)*2.,vP.y*.25)))*.35;
      alb*=(.86+.22*rib)*(1.-st*.5);alb=mix(alb,vec3(.18,.08,.04),st*.35);spec=em>.5?.15:.5;shin=em>.5?20.:60.;metal=em>.5?.2:.6*(1.-st);em=0.;ground=false;}
    else if(m==48){
      /* leaves: light comes through them; the crown is darker underneath and deep inside */
      alb*=.6+.55*vn3(vP*2.2);spec=.05;shin=10.;trans=.45;ground=false;
      ao=.45+.55*sat(N.y*.5+.5)*sat(vL.y/7.+.2);
#ifndef PROBE
      /* clumps of leaves catch the light or sit in shade: a bump at the clumps' size, and at the leaves' */
      if(gFP<.2){float hh=vn3(vP*2.4)*.3+vn3(vP*7.)*.05*sat(1.-gFP/.06);vec3 dpx=dFdx(vP),dpy=dFdy(vP),r1=cross(dpy,N),r2=cross(N,dpx);float det=dot(dpx,r1);
        N=normalize(abs(det)*N-sign(det)*(dFdx(hh)*r1+dFdy(hh)*r2)*sat(1.-gFP/.2)*uDetail);}
#endif
    }
    else if(m==49){float st=vn(vec2((vP.x+vP.z)*30.,vP.y*20.))*.6+vn(vec2(atan(vL.z,vL.y)*20.,vP.y*6.))*.4;alb=vec3(.42,.31,.1)*(.6+.6*st);spec=.02;ground=false;}
    else if(m==50){
      /* the creek and the pond: dark water, the world in it, ripples running downstream (and rain rings) */
      vec2 rp=wp*1.3+vec2(uTime*.3,uTime*.5);vec2 gw=vec2((vn(rp)-.5)*.25+(vn(wp*3.1-uTime*.4)-.5)*.12,(vn(rp+7.)-.5)*.25);
      if(uRain>.35)gw+=ripplesS(wp*1.7)*uRain*near(.05);
      N=normalize(vec3(gw.x,1.,gw.y));alb=vec3(.025,.03,.018);spec=.6;shin=2000.;ssr=1.;ground=false;
    }
    else if(m==52){alb=vec3(.7,.68,.63);}
    else if(m==53){
      /* gravel: a county road (two worn wheel tracks, loose stone down the middle and the edges, the
         verge closing in) or a loose bed (the traps at the track, the yard at home); alpha = road half width */
      float d=vC.g,ad=abs(d),hw=em,n1=vn(wp*1.7),n2=vn(wp*9.),n3=vn(wp*31.);
      vec3 gc=mix(vec3(.16,.145,.12),vec3(.27,.245,.205),n1)*(.7+.42*n2)*(.78+.36*n3);float tr=0.;
      if(vC.b<.5){tr=exp(-pow((ad-1.5)/.55,2.));gc=mix(gc,gc*vec3(.8,.78,.76),tr*.85);}
      gravelDetail(wp,gc);gG*=1.-tr*.6;
      if(vC.b<.5){float edge=smoothstep(hw-.6,hw+.3,ad+(n1-.5)*.9);gc=mix(gc,mix(dirtCol(wp),grassCol(wp),smoothstep(.25,.7,vn(wp*.35))),edge);}
      alb=gc;spec=.05+.04*tr;shin=14.;em=0.;
    }
    else if(m==54){
      /* asphalt: dark and fine grained, rubber down the middle, white edge lines, red and white kerbs where
         it bends (blue slot), grass beyond, a chequered band at the line; alpha = half width */
      float sx=vC.r,d=vC.g,ad=abs(d),hw=em,n2=vn(wp*7.),n3=vn(wp*41.);
      vec3 ac=vec3(.05,.05,.056)*(.82+.28*n2)*(.88+.22*n3);float rub=exp(-pow(d/2.4,2.));ac*=1.-.2*rub;
      asphaltDetail(wp,ac,ad,hw);
      ac=mix(ac,vec3(.6,.6,.58),step(hw-.45,ad)*step(ad,hw-.2));
      if(ad>hw){vec3 kc=mix(vec3(.46,.03,.025),vec3(.64,.63,.6),step(.5,fract(sx/1.6)));ac=mix(grassCol(wp),kc,smoothstep(.35,.45,vC.b)*step(ad,hw+1.5));}
      else if(sx<1.6){ac=mix(vec3(.015),vec3(.64),mod(floor(sx/.8)+floor((d+hw)/.8),2.));}
      alb=ac;spec=.3;shin=36.+40.*rub;em=0.;
    }
    else if(m==55){
      /* the home lane: mud in the ruts with water lying in the deep spots, grass on the crown and the verges (blue = rut depth) */
      float sx=vC.r,d=vC.g,ad=abs(d),dep=vC.b,n2=vn(vec2(sx,d)*2.3),n3=vn(vec2(sx*.7,d*3.));
      vec3 md=mix(vec3(.14,.09,.05),vec3(.075,.05,.03),smoothstep(.3,.8,n3))*(.8+.35*vn(vec2(sx,d)*8.));
      float rut=exp(-pow((ad-.82)/.3,2.)),gr=max(1.-smoothstep(.2,.48,ad+(n2-.5)*.22),smoothstep(1.55,2.25,ad+(n2-.5)*.5));
      vec3 gc=grassCol(wp);grassDetail(wp,gc);gG*=gr;
      alb=mix(md,gc*.92,gr*(.7+.3*n2));spec=.22;shin=36.;
      pud=rut*smoothstep(.15,.19,dep+(n3-.5)*.05);
      em=0.;
    }
    else if(m==56){
      /* the dirt oval's clay (blue 0) or the short course's loose dirt (blue 1): a dark polished groove where the
         cars run, loose stuff thrown up to the outside, the line across at the start; alpha = half width */
      float sx=vC.r,d=vC.g,ad=abs(d),hw=em,kind=vC.b,n2=vn(wp*.8),n3=vn(wp*3.7);
      vec3 c=kind<.5?mix(vec3(.25,.11,.055),vec3(.34,.16,.08),n2)*(.84+.26*n3):dirtCol(wp)*(.92+.12*n3);
      float groove=exp(-pow((d-(kind<.5?-.25*hw:0.))/(hw*.42),2.)),rut=kind>.5?max(exp(-pow((d-1.)/.45,2.)),exp(-pow((d+1.)/.45,2.)))*.6:0.;
      float cushion=smoothstep(hw*.55,hw*.95,kind<.5?d:ad)*(.6+.4*n3);
      c*=1.-.28*groove-.15*rut;c=mix(c,c*1.22+vec3(.025,.018,.01),cushion*.7);
      dirtDetail(wp,c,(1.-groove*.7)*(.45+.55*cushion));
      if(kind<.5&&d<-hw)c=mix(c*.8,vec3(.5,.49,.46),(1.-step(.12,abs(d+hw+.15))));
      if(kind>.5&&ad>hw){vec3 gc=grassCol(wp);grassDetail(wp,gc);c=mix(c,gc,smoothstep(hw,hw+.8,ad+(n2-.5)*.6));}
      c=mix(c,vec3(.72,.7,.66),(1.-step(.35,abs(sx-.35)))*step(ad,hw)*(1.-.5*smoothstep(.45,.8,vn(vec2(sx,d)*vec2(3.,1.5)))));
      alb=c;spec=.05+.16*groove;shin=10.+36.*groove;em=0.;
    }
    else if(m==57){
      /* the dry lake: pale clay baked into plates, the cracks between them, darker where the cars have run */
      float n1=vn(wp*.04),n2=vn(wp*.6),n3=vn(wp*4.1);
      vec3 c=mix(vec3(.29,.25,.2),vec3(.36,.32,.26),n1)*(.9+.1*n2+.06*n3);
      float tr=smoothstep(.55,.8,fbmS(wp*.02+3.))*.25;c*=1.-tr;
      mudCracks(wp*.55,c,.9,spec);vec3 b=vnd(wp*1.3);gG+=b.yz*1.3*.01*near(.15);
      alb=c;spec=.03;shin=8.;
    }
    /* rain soaks the porous ground dark and puts a sheen with the world in it on the hard ground; low spots fill */
    float por=m==40||m==42||m==43||m==44||m==53||m==55||m==56||m==57?1.:0.,hard=m==54||m==45?1.:0.;
    if(uWet>0.){alb*=1.-uWet*(.36*por+.22*hard);spec=mix(spec,.6,uWet*(.75*hard+.2*por));shin=mix(shin,160.,uWet*(hard+.4*por));ssr=max(ssr,uWet*(.7*hard+.25*por));
      if(por>0.)pud=max(pud,smoothstep(.66,.72,fbmS(wp*.09+11.3)*.8+vn(wp*.55)*.2+uWet*.12-.1)*uWet*.9);}
    if(pud>0.){alb=mix(alb,alb*.35+vec3(.02,.015,.01),pud*.85);gG*=1.-pud;
      vec2 rg=uRain>.35?ripplesS(wp*1.8)*uRain*near(.05):vec2(0.);N=normalize(N+vec3(rg.x,0.,rg.y)*pud);
      spec=mix(spec,1.,pud);shin=mix(shin,1200.,pud);ssr=max(ssr,pud);}
    /* the bump: the detail's height gradient tips the normal (on ground, which faces mostly up) */
#ifndef PROBE
    if(ground&&(gG.x!=0.||gG.y!=0.))N=normalize(N+vec3(-gG.x,0.,-gG.y));
#endif
  }
  if(dirty){float k=mud(vL,h);if(k>0.){alb=mix(alb,mudCol(vL,h),k);spec*=1.-.8*k;clear*=1.-.9*k;metal*=1.-.9*k;}}
  /* ---------- light it ---------- */
  Surf s;s.P=vP;s.V=V;s.N=N;s.Nc=Ng;s.ao=ao;s.spec=1.;s.trans=trans;s.clear=clear;s.clearR=clearR;
  s.rough=sqrt(2./(shin+2.));
  s.diff=alb*(1.-metal);s.F0=mix(vec3(.04*sat(spec*3.)),alb,metal);
  /* specular anti-aliasing: widen the lobe where the normal changes within a pixel */
  {vec3 dx=dFdx(s.N),dy=dFdy(s.N);float var=.25*(dot(dx,dx)+dot(dy,dy));float a2=s.rough*s.rough;s.rough=sqrt(sqrt(saturate(a2*a2+min(2.*var,.2))));}
  float occ=carOcc(vP);s.ao*=occ;
  vec3 col=emc*EMK;
  if(em>0.&&m==0)col+=vC.rgb*em*EMK;
  col+=directAll(s,gl_FragCoord.xy,dist)*mix(1.,occ,.45)+ambient(s);
  /* leaves: brightest looking toward the sun through them */
  if(trans>0.)col+=uSunCol*s.diff*trans*pow(saturate(dot(-V,uSunDir)),4.)*.6*sunShadow(vP,Ng,dist,gl_FragCoord.xy);
  /* reflections: the probe at the car (the sky, in the probe's own picture), then the clear coat over it */
  float NoV=max(dot(s.N,V),1e-3);vec3 ew=envBRDF(s.F0,NoV,s.rough);float so=saturate(pow(NoV+s.ao,exp2(-16.*s.rough-1.))-1.+s.ao);
  vec3 refl=vec3(0.);
#ifdef PROBE
  refl=rutSky(reflect(-V,s.N),false)*ew*so*.6;ssr=0.;
#else
  if(ssr<=0.||s.rough>.45){refl=textureLod(uProbe,reflect(-V,s.N),s.rough*uProbeLod).rgb*ew*so;ssr=0.;}
#endif
  if(s.clear>0.){float Fc=F_Sch(vec3(.04),NoV).x*s.clear;
#ifdef PROBE
    vec3 cc=rutSky(reflect(-V,Ng),false)*.6;
#else
    vec3 cc=textureLod(uProbe,reflect(-V,Ng),s.clearR*uProbeLod*2.).rgb;
#endif
    col=col*(1.-Fc)+refl*(1.-Fc)+cc*Fc;}
  else col+=refl;
  ssr=ssr>0.?lum(ew)*so:0.;
  /* the land melts into the sky: past the volumetric fog's reach the haze goes on analytically, and the last
     stretch before the draw distance fades out so nothing pops in at the edge */
  vec3 dir=(vP-uCam)/max(dist,1e-3);
  float far=max(dist-160.,0.),fogA=1.-exp(-uFogDen*exp(-max(vP.y,0.)*uFogFall)*far);
  fogA=max(fogA,smoothstep(uDrawFar*.72,uDrawFar*.98,dist));
  col=mix(col,fogFar(dir,dist),fogA);
#ifdef DEBUG_SHADOW
  /* the sun's visibility and which cascade answered (r: lit, g: cascade 0..2 /2, b: outside every cascade);
     DEBUG_SHADOW 1..3: one cascade's answer for every pixel (r lit, b outside its window) */
#if DEBUG_SHADOW==0
  {int k=dist<uCSMS.x?0:dist<uCSMS.y?1:2;float sv=csmLayer(vP,Ng,k,0.);col=vec3(sunShadow(vP,Ng,dist,gl_FragCoord.xy),float(k)*.5,sv<0.?1.:0.)*.3;}
#elif DEBUG_SHADOW==4
  {int k=dist<uCSMS.x?0:dist<uCSMS.y?1:2;float sv=csmLayer(vP,Ng,k,ign(gl_FragCoord.xy,uFrame)*6.283);col=vec3(max(sv,0.),0.,sv<0.?1.:0.)*.3;}
#elif DEBUG_SHADOW==5
  {int k=dist<uCSMS.x?0:dist<uCSMS.y?1:2;float sv=csmLayer(vP,Ng,k,0.);col=vec3(max(sv,0.),0.,sv<0.?1.:0.)*.3;}
#elif DEBUG_SHADOW==6
  col=vec3(uCSMOn,uCSMS.x/200.,uCSMS.y/200.)*.3;
#else
  {float sv=csmLayer(vP,Ng,DEBUG_SHADOW-1,0.);col=vec3(max(sv,0.),0.,sv<0.?1.:0.)*.3;}
#endif
#endif
  oCol=vec4(col,1.);
#ifndef PROBE
  oNrm=vec4(octEnc(s.N),s.rough,ssr*(1.-fogA));
  oVel=(vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;
#endif
}`;
/* ---------- the dust and the spray: soft round puffs facing the camera, lit where they are, drawn over the finished scene ---------- */
const PUFF_VS=G.FRAME+G.NOISE+G.LIGHTING+SL3.POINT_LIGHT+`
layout(location=0) in vec3 aPos;layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform vec3 uRt;uniform vec3 uUp;out vec2 vQ;out vec4 vC;out vec3 vP;out float vS;out vec3 vLi;out float vZ;
void main(){float c=cos(iA.w),s=sin(iA.w);vec2 q=vec2(c*aPos.x-s*aPos.y,s*aPos.x+c*aPos.y);vec3 w=iA.xyz+(uRt*q.x+uUp*q.y)*iB.x;
  vQ=aPos.xy;vC=iC;vP=w;vS=iB.y;vec3 V=normalize(uCam-w);vLi=lightAt(w,V);vec4 cp=uVP*vec4(w,1.);gl_Position=cp;vZ=cp.w;}`;
const PUFF_FS=G.FRAME+G.NOISE+SL3.SOFT+SKYFN+`
in vec2 vQ;in vec4 vC;in vec3 vP;in float vS;in vec3 vLi;in float vZ;out vec4 o;
void main(){float r=length(vQ);if(r>1.)discard;
  float n=vn(vQ*2.3+vS*17.)*.6+vn(vQ*5.1-vS*9.)*.4,a=vC.a*(1.-smoothstep(.25,1.,r+(n-.5)*.5));if(a<.004)discard;
  a*=soft(vZ,.6);
  vec3 dir=normalize(vP-uCam);float dist=length(vP-uCam);
  vec3 c=vC.rgb*vLi*(.7+.3*n)*1.2;
  float fog=1.-exp(-uFogDen*dist);c=mix(c,fogLi(dir),fog);
  o=vec4(c*a,a);}`;
  return RUT_SRC={SKY_FS,VS,FS,DEPTH_VS,DEPTH_FS,PUFF_VS,PUFF_FS};
}
