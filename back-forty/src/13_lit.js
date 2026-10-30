/* ===== the scene shader: one lit pass for the cars and the world =====
   Dirt Sleeper HD's lighting, after Shiftlight 7's. Every surface keeps the material it had (a diffuse
   colour, a specular strength and a Blinn exponent, which becomes a roughness), lit physically:
   - the sun and the lamps through a GGX highlight with height-correlated Smith visibility and Fresnel,
     its roughness widened where the normal changes faster than a pixel can show (specular anti-aliasing);
   - the sun through cascaded shadow maps (55_gfx), the hemisphere sky and ground as ambient, with
     ambient occlusion from the ground's own vertex AO, the trees' crowns and the cars' contact shadows;
   - reflections from the probe at the car (55_gfx) where it is on, the sky where it isn't;
   - fine detail cut into the ground without textures: value noise with its analytic gradient and
     cellular noise make clods, grain, pebbles, gravel, cracks and rock relief, all bump-mapped and
     faded out by how big a pixel is on the ground (so nothing shimmers in the distance);
   - headlights with a real low-beam cut-off, leaves that glow with the sun behind them;
   - height fog whose colour is the sky's own colour toward the horizon in that direction, so the land
     melts into the sky instead of into a flat grey.
   The defines: PROBE draws the cheaper version the probe sees (no shadows, no bump, sky reflections). */
const GLSL_COMMON=`
uniform mat4 uVP;uniform vec3 uCam;uniform float uTime;
uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uSkyAmb;uniform vec3 uGndAmb;uniform vec3 uFogCol;uniform float uFogD;
uniform vec4 uLP[8];uniform vec4 uLC[8];uniform vec4 uLD[8];uniform int uNL;uniform float uStage;
uniform vec3 uSkyZen;uniform vec3 uSkyHor;uniform float uNight;
/* the weather (55_gfx): cloud cover, cloud brightness, haze toward the sun, rain; how wet the ground is */
uniform vec4 uCloud;uniform float uWet;
const float PI=3.14159265;
float sat(float x){return clamp(x,0.,1.);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,-9.1);a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.07+vec3(1.7,9.2,4.1);a*=.5;}return s;}
/* value noise and its gradient (x: the value, yz: d/dp), so a bump needs no second lookup */
vec3 vnd(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
  float a=h12(i),b=h12(i+vec2(1,0)),c=h12(i+vec2(0,1)),d=h12(i+vec2(1,1)),k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*(vec2(b-a,c-a)+k*u.yx));}
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
/* a headlight's beam: a low beam's flat cut-off that steps up on the right, a hot spot just under it,
   a wide fill and spill toward the ground in front (Lw: from the lamp to the point; fw: where it aims) */
float beam(vec3 Lw,vec3 fw){
  vec3 rt=normalize(cross(fw,vec3(0.,1.,0.))),up=cross(rt,fw);float z=dot(Lw,fw);if(z<=.05)return 0.;
  float x=dot(Lw,rt)/z,y=dot(Lw,up)/z,cut=-.02+.035*smoothstep(-.04,.16,x),under=1.-smoothstep(cut-.025,cut+.008,y);
  float hot=exp(-x*x*16.-(y+.045)*(y+.045)*160.),wide=exp(-x*x*1.7-(y+.1)*(y+.1)*16.),spill=exp(-x*x*.7)*smoothstep(-1.2,-.25,y)*(1.-smoothstep(-.3,.05,y));
  return (hot*1.6+wide*.75)*under+spill*.22+.035*exp(-x*x*.5-y*y*3.);}
/* the open sky: deep blue overhead to a pale horizon, the ground's own colour below it, the sun's glow
   (wider and warmer the lower it is), and at night the moon and the stars */
vec3 skyBase(vec3 d){
  float t=d.y,sd=max(dot(d,uSunDir),0.),low=1.-sat(uSunDir.y*1.6);
  vec3 c=mix(uSkyHor,uSkyZen,pow(smoothstep(0.,.75,t),.8));
  c=mix(c,uSkyHor*vec3(.62,.5,.4)*.55,(1.-smoothstep(-.12,.02,t)));
  /* the glow round the sun, and toward a low sun the whole horizon on that side warms */
  c+=uSunCol*(pow(sd,24.)*.08+pow(sd,4.)*.03)*smoothstep(-.05,.02,t);
  c+=uSunCol*vec3(1.,.62,.32)*low*pow(sd,3.)*.22*(1.-smoothstep(0.,.45,t))*(1.-uNight);
  return c;}
/* the model bay's two photo studios (63_showroom, from Dirt Sleeper Mini's lit shader): stage 1 the dark bay,
   its key light overhead, a ring of strip lights round the cove and an LED line at its foot; stage 2 the light
   cyc, a pale seamless wall under a big soft box. The open world is stage 3 */
vec3 studioEnv(vec3 d){
  float t=d.y;
  if(uStage<1.5){
    vec3 c=mix(vec3(.02,.02,.026),vec3(.004,.004,.007),smoothstep(-.1,.6,t));
    if(t>.2){vec2 q=d.xz/t;c+=vec3(1.,.97,.92)*2.6*(1.-smoothstep(.45,.6,abs(q.x)))*(1.-smoothstep(.2,.3,abs(q.y)));}
    float k=fract(atan(d.z,d.x)/.7853982+.5)-.5;c+=vec3(.85,.9,1.)*.9*(1.-smoothstep(.01,.05,abs(k)))*(1.-smoothstep(.04,.34,abs(t-.16)));
    c+=vec3(.9,.92,1.)*.5*exp(-abs(t+.04)*55.);
    return c;}
  vec3 c=mix(vec3(.30,.29,.28),vec3(.62,.61,.60),smoothstep(-.25,.35,t));
  c=mix(c,vec3(.48,.47,.46),smoothstep(.35,.9,t));
  if(t>.25){vec2 q=d.xz/t;c+=vec3(1.,.98,.95)*1.6*(1.-smoothstep(.6,.9,abs(q.x)))*(1.-smoothstep(.35,.6,abs(q.y)));}
  c+=vec3(.7)*exp(-abs(t-.02)*30.)*.25;
  return c;}
vec3 env(vec3 d){
  if(uStage<2.5)return studioEnv(d);
  vec3 c=skyBase(d);float t=d.y,sd=max(dot(d,uSunDir),0.);
  /* the sun's disc (not in the probe: a small cube would smear it into a blob in every reflection; the
     highlight a surface shows of the sun is the lighting's own) */
#ifndef PROBE
  c+=uSunCol*pow(sd,900.)*12.*smoothstep(-.05,.02,t);
#endif
  /* night: the moon is the sun turned down and bluer; stars scattered over the dome */
  if(uNight>0.){c+=uSunCol*pow(sd,2400.)*260.*uNight;vec3 q=floor(d*620.);float st=h13(q);
    c+=vec3(.9,.92,1.)*step(.9982,st)*(.6+1.4*h13(q+7.))*uNight*smoothstep(.02,.2,t);}
  return c;}
/* the sky with clouds drifting over it (lit toward the sun, grey and heavy in the rain; toward a low sun
   their edges catch its colour) */
vec3 skyCol(vec3 d){
  vec3 sc=env(d);if(uStage<2.5)return sc;
  if(uCloud.x>0.&&d.y>0.){vec2 uv=d.xz/(d.y+.12)*1.5+uTime*vec2(.006,.0025);float n=fbm(uv*1.2)*.62+fbm(uv*3.4+3.1)*.38;
    float cov=smoothstep(1.-uCloud.x,1.25-uCloud.x,n)*smoothstep(.0,.08,d.y),sd=max(dot(d,uSunDir),0.);
    vec3 cc=mix(vec3(.5,.55,.64),vec3(1.12,1.08,1.02),(.35+.65*sd)*(.6+.4*n))*uCloud.y;
    cc+=uSunCol*vec3(1.,.6,.3)*pow(sd,6.)*(1.-sat(uSunDir.y*2.))*(1.-n)*.6*uCloud.y;sc=mix(sc,cc,cov*.92);}
  return sc;}
/* the haze in a direction: the sky's colour at the horizon there (no sun disc), dimmed a touch */
vec3 hazeCol(vec3 d){if(uStage<2.5)return uFogCol;vec3 h=normalize(vec3(d.x,clamp(d.y,.0,.25)*.35+.015,d.z));return mix(uFogCol,skyBase(h)*.92,.7);}
`;
const VS_LIT=`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in float aMat;
uniform mat4 uM;uniform mat4 uVP;uniform float uTime;uniform vec3 uCam;uniform vec4 uFarDrop;
out vec3 vP;out vec3 vN;out vec4 vC;out float vMat;out vec3 vL;
layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform float uInst;
void main(){
  if(uInst>.5){
    /* instanced bits (dust, mud, spray, trees): position and yaw, size, colour and glow per instance;
       a vertex whose colour alpha is 2 keeps its own colour (tree trunks) */
    float c=cos(iA.w),s=sin(iA.w);vec3 q=aPos*iB.xyz;vec3 w=iA.xyz+vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);
    /* the trees sway in the wind, more the higher up (leaves 48, trunks 46) */
    if(aMat>45.5&&aMat<48.5){float ph=iA.x*.13+iA.z*.17,k=max(q.y-1.2,0.);
      w.xz+=vec2(sin(uTime*1.1+ph)+.4*sin(uTime*2.7+ph*1.7),.6*cos(uTime*.9+ph*1.3))*k*k*.0035;}
    vN=normalize(vec3(c*aNrm.x+s*aNrm.z,aNrm.y,-s*aNrm.x+c*aNrm.z));vC=aCol.a>1.5?vec4(aCol.rgb,0.):vec4(iC.rgb*aCol.rgb,iC.a);vL=aPos*iB.xyz;vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);return;}
  vec3 w=(uM*vec4(aPos,1.)).xyz;
  /* the far tiles sink a little where the chunks are drawn, so the chunks always show (51_world) */
  if(uFarDrop.x>.5)w.y-=uFarDrop.w*(1.-smoothstep(uFarDrop.y,uFarDrop.z,length(w.xz-uCam.xz)));
  vN=normalize(mat3(uM)*aNrm);vC=aCol;vL=aPos;vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);}`;
const GLSL_CSM=`
/* the cascaded sun shadows (55_gfx): the cascades' matrices; uCSMS = where each ends (m) and 1/size;
   uCSMB = the normal offset per cascade (m); uCSMN = how many cascades, and the filter (4 or 9 taps) */
uniform highp sampler2DArrayShadow uCSM;uniform mat4 uCSMM[3];uniform vec4 uCSMS;uniform vec4 uCSMB;uniform ivec2 uCSMN;
float csmTap(int k,vec3 q,vec2 o,float b){return texture(uCSM,vec4(q.xy+o,float(k),q.z-b));}
float csm(vec3 P,vec3 N,float dist){
  int n=uCSMN.x;if(n==0)return 1.;
  int k=dist<uCSMS.x?0:dist<uCSMS.y?1:2;if(k>=n)return 1.;
  vec3 q=(uCSMM[k]*vec4(P+N*uCSMB[k],1.)).xyz*.5+.5;
  if(q.x<.002||q.y<.002||q.x>.998||q.y>.998||q.z>1.)return 1.;
  float b=.00025*(1.+float(k)),tx=uCSMS.w,s=0.;
  if(uCSMN.y>4){for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=csmTap(k,q,vec2(i,j)*tx*1.15,b);s/=9.;}
  else s=(csmTap(k,q,vec2(-.6,-.25)*tx*1.4,b)+csmTap(k,q,vec2(.25,-.6)*tx*1.4,b)+csmTap(k,q,vec2(.6,.25)*tx*1.4,b)+csmTap(k,q,vec2(-.25,.6)*tx*1.4,b))*.25;
  /* the last cascade fades out toward its end */
  if(k==n-1){float e=k==0?uCSMS.x:k==1?uCSMS.y:uCSMS.z;s=mix(s,1.,smoothstep(e*.82,e,dist));}
  return s;}
`;
const FS_LIT=GLSL_COMMON+`
in vec3 vP;in vec3 vN;in vec4 vC;in float vMat;in vec3 vL;
layout(location=0) out vec4 o;layout(location=1) out vec4 oN;
uniform vec3 uPaint;uniform vec3 uPaint2;uniform vec3 uRim;uniform vec3 uCal;uniform vec3 uClad;
uniform float uLiv;uniform float uLights;uniform float uBrake;uniform float uDirt;uniform float uGround;uniform vec4 uLivP;
/* positions are drawn relative to a floating origin; uOrg puts the textures back on the world (51_world) */
uniform vec3 uOrg;
uniform vec4 uSh[8];uniform float uShA[8];uniform int uNSh;uniform float uSpin;
uniform float uShK[8];uniform float uMudOff;uniform float uMudLocal;
/* how much fine detail to draw (0 a weak phone .. 1 a laptop) */
uniform float uDetail;
/* the light this pixel gets: the sun's visibility, ambient occlusion, a leaf's translucency, and the
   ambient light's share of the colour (for the screen-space AO pass) */
float gSun=1.,gAO=1.,gTrans=0.,gAmb=0.,gMet=0.;
#ifndef PROBE
`+GLSL_CSM+`
/* the reflection probe at the car: a cubemap with mips (x: on, y: its last mip) */
uniform samplerCube uProbe;uniform vec4 uProbeP;
#endif
/* reflected light for a material of this Blinn exponent: the probe where it's on, else the sky */
vec3 envR(vec3 R,float sh){
#ifndef PROBE
  if(uProbeP.x>.5){float a=sqrt(2./(sh+2.));return textureLod(uProbe,R,sat(a*1.7)*uProbeP.y).rgb;}
#endif
  return env(R);}
/* GGX with height-correlated Smith visibility; multiplied by PI, as the diffuse here is albedo * N.L */
float ggx(float NH,float NV,float NL,float a){float a2=a*a,d=NH*NH*(a2-1.)+1.,D=a2/(PI*d*d);
  float gv=NL*sqrt(NV*NV*(1.-a2)+a2),gl=NV*sqrt(NL*NL*(1.-a2)+a2);return D*.5/max(gv+gl,1e-5)*PI;}
/* light from the sun, the sky and the lamps on a surface with albedo alb, specular strength spec (as F0) and
   Blinn exponent sh (as a GGX roughness) */
vec3 shade(vec3 P,vec3 N,vec3 V,vec3 alb,float spec,float sh){
  float a=sqrt(2./(sh+2.));
  /* specular anti-aliasing: a normal that turns within the pixel widens the highlight */
  vec3 dnx=dFdx(N),dny=dFdy(N);float var=.25*(dot(dnx,dnx)+dot(dny,dny));a=sqrt(sqrt(sat(a*a*a*a+min(.5*var,.012))));a=max(a,.006);
  vec3 amb=alb*(uSkyAmb*(.55+.45*N.y)+uGndAmb*(.45-.45*N.y))*gAO;
  /* the material's specular strength as a reflectance at normal incidence: a dielectric's few per cent, a
     metal's (gMet) much more; Fresnel takes it toward all at grazing angles */
  float NV=max(dot(N,V),1e-3),NL=max(dot(N,uSunDir),0.);vec3 H=normalize(uSunDir+V);float f0=spec*mix(.12,.75,gMet);
  float F=f0+(1.-f0)*pow(1.-max(dot(V,H),0.),5.)*min(spec*4.,1.);
  /* (the sun's highlight is capped: a mirror-smooth glint of the real sun would be thousands of times white,
     and the bloom would make it a flare across the screen. The smoother the surface the lower the cap, so a
     window's glint is a spark, not a patch) */
  vec3 c=amb+uSunCol*gSun*(alb*NL*(.3+.7*gAO)+min(NL*F*ggx(max(dot(N,H),0.),NV,NL,a),3.*clamp(a/.12,.25,1.)));
  /* leaves: light through them from behind, brightest looking toward the sun */
  if(gTrans>0.)c+=uSunCol*gSun*alb*gTrans*(sat(-dot(N,uSunDir))*.6+pow(sat(dot(-V,uSunDir)),4.)*.8);
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 L=uLP[i].xyz-P;float d2=dot(L,L),r=uLP[i].w;if(d2>r*r)continue;
    float d=sqrt(d2);L/=d;float k=1.-d/r;k*=k;
    /* a headlight (colour alpha 1): its beam pattern; a spot (w the cosine of its edge); else every way */
    if(uLC[i].a>.5)k*=beam(-L,uLD[i].xyz);
    else if(uLD[i].w>-1.){float cs=dot(-L,uLD[i].xyz);k*=smoothstep(uLD[i].w,uLD[i].w+.1,cs);}
    if(k<=0.)continue;
    float ln=max(dot(N,L),0.);vec3 Hh=normalize(L+V);float al=min(1.,a+.05/d);
    /* (a lamp's highlight is capped like the sun's: a chrome stack under a studio lamp or a headlight would otherwise
       be tens of thousands, and the bloom adding those up runs past what the targets hold) */
    c+=uLC[i].rgb*k*(alb*(ln*.85+.15*gAO)+min(ln*f0*ggx(max(dot(N,Hh),0.),NV,ln,al),3.*clamp(al/.12,.25,1.)));}
  gAmb=dot(amb,vec3(.3,.59,.11));
  return c;}
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
/* the soft shadows under the cars on open ground: rounded rectangles at (x, z), half size, turned by yaw,
   each as dark as uShK says (they fade as a car leaves the ground). With real shadows on they are only the
   occlusion right under the car */
float wshadow(vec3 P){
  float sh=1.;
  for(int i=0;i<8;i++){if(i>=uNSh)break;
    vec2 q=P.xz-uSh[i].xy;float c=cos(uShA[i]),s=sin(uShA[i]);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
    vec2 e=abs(q)-uSh[i].zw;float dd=length(max(e,0.))+min(max(e.x,e.y),0.);
    sh=min(sh,1.-uShK[i]*(.78*(1.-smoothstep(-.4,.7,dd))+.1*(1.-smoothstep(-.2,2.6,dd))));}
  return sh;
}
/* ---------- the ground's materials ---------- */
/* metres per pixel here, and the height gradient the detail adds (world x, z) */
float gFP=0.;vec2 gG=vec2(0.);
/* fades detail of a given size (m) out as pixels grow past it */
float near(float size){return sat(1.-gFP/size)*uDetail;}
/* the ranch's red-dirt country (Dirt Sleeper's palette) */
vec3 dirtCol(vec2 p){float n1=fbm(p*.09),n3=vn(p*3.1);return mix(vec3(.21,.095,.045),vec3(.36,.2,.105),n1)*(.8+.35*n3);}
vec3 grassCol(vec2 p){float dry=smoothstep(.3,.78,fbm(p*.045+7.));float n2=vn(p*.7),n3=vn(p*3.1),n4=vn(p*11.);
  return mix(vec3(.06,.105,.022),vec3(.2,.17,.06),dry)*(.62+.5*n4*n3+.25*n2);}
vec3 rockCol(vec3 P){float n=fbm(P.xz*vec2(.8,2.6)+P.y),n2=vn(P.xz*7.+P.y*3.);
  vec3 c=mix(vec3(.25,.13,.08),vec3(.3,.25,.2),n2)*(.6+.6*n)*(.85+.3*n2);return mix(c,vec3(.2,.19,.07),smoothstep(.62,.7,fbm(P.xz*1.7+3.))*.5);}
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
vec2 ripples(vec2 p){
  vec2 g=vec2(0.);for(int L=0;L<2;L++){vec2 q=p*(L==0?1.6:2.3)+float(L)*7.3,n=floor(q);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 c=n+vec2(i,j);float h=h12(c+float(L)*3.1),t=fract(uTime*.9+h);
      vec2 d=q-(c+vec2(h12(c+1.3),h12(c+2.7)));float r=length(d),w=t*.9-r;
      if(abs(w)<.12)g+=d/max(r,1e-3)*sin(w*52.)*(1.-t)*(1.-abs(w)/.12)*.25;}}
  return g;}
void main(){
  /* (a degenerate normal, as on a few of the machines' part-built pieces, would be NaN, and one NaN pixel is a black
     screen once the bloom has spread it) */
  vec3 N=dot(vN,vN)>1e-12?normalize(vN):vec3(0.,1.,0.);vec3 V=normalize(uCam-vP);if(dot(N,V)<0.)N=-N;
  vec3 alb=vC.rgb;float em=vC.a;float spec=.04,shin=12.;vec3 emc=vec3(0.);vec3 add=vec3(0.);
  float dist=length(vP-uCam);gFP=max(length(dFdx(vP)),length(dFdy(vP)));
  /* a car out in the world measures its mud up itself; see-through by dropping pixels (the dot pass averages
     them): dust and spray carry their opacity as a negative glow; trees thin out right in front of the camera */
  int m=int(vMat+.5);float h=uMudLocal>.5?vL.y+uMudOff:vP.y-uGround;bool dirty=false;vec3 Pw=vP+uOrg;
  if(em<0.){if(h12(gl_FragCoord.xy+fract(uTime*7.3)*91.)>-em)discard;em=0.;}
  if(m==48){if(dist<8.&&h12(gl_FragCoord.xy)>smoothstep(3.,8.,dist))discard;
    /* the crown's edge broken into clumps of leaves: where it turns away from the eye, gaps open between them
       (anchored to the world, so they don't crawl; faded out where a clump is smaller than a few pixels) */
    float ed=1.-abs(dot(normalize(vN),V)),lv=vn3(Pw*3.2)*.65+vn3(Pw*9.)*.35,kf=1.-smoothstep(.04,.18,gFP);
    if(lv<(ed*ed*1.15-.2)*kf)discard;}
#ifndef PROBE
  if(m!=51)gSun=csm(vP,normalize(vN),dist);
#endif
  float NV=max(dot(N,V),0.),F=.04+.96*pow(1.-NV,5.);vec3 R=reflect(-V,N);
  if(m==1||m==4){
    vec3 pc=m==4?uPaint2:uPaint;
    /* race livery: a swept band low on the sides, twin stripes down the middle */
    if(uLiv>.5&&m==1){
      float xn=(vL.x-uLivP.y)/(uLivP.x-uLivP.y);
      float band=uLivP.z-.30+.34*smoothstep(.15,.85,1.-xn);
      bool l2=uLiv>1.5;
      if(uLiv>2.5){float az=abs(vL.z);bool top=N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3;
        /* 3: two wide stripes nose to tail with pinstripes outside them */
        if(uLiv<3.5){if(top&&(az>.03&&az<.25||az>.27&&az<.285))pc=uPaint2;}
        /* 4: rally slashes, a red one rising toward the tail with a black one under it at the back */
        else if(abs(N.z)>.35){float q=vL.y-(uLivP.z-.43)-(1.-xn)*.5+.18*fract(xn*2.2);if(q>0.&&q<.11)pc=uPaint2;else if(q>-.1&&q<-.03&&xn<.62)pc=vec3(.025);}
        l2=true;}
      else if(!l2&&abs(N.z)>.35&&vL.y<band&&vL.y>uLivP.z-.62)pc=uPaint2;
      float az=abs(vL.z),s0=l2?.02:.07,s1=l2?.15:.2;if(uLiv<2.5&&az>s0&&az<s1&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=uPaint2;
      if(!l2&&az>.035&&az<.06&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=vec3(.9);
    }
    alb=pc*.6;
    /* metallic flake: each flake turns the normal a little (faded out once a flake is smaller than a pixel),
       under a smooth clear coat that reflects the world and catches the sun as a sharp glint */
    vec3 fc=floor(vL*420.);float fl=h13(fc),fk=near(.004);alb*=.975+.05*fl;
    vec3 Nf=normalize(N+(vec3(fl,h13(fc+17.1),h13(fc+31.7))-.5)*.35*fk);
    float NHc=max(dot(N,normalize(uSunDir+V)),0.);
    add+=envR(R,900.)*F*.75+pc*envR(reflect(-V,Nf),60.)*.12*(1.-NV)+uSunCol*gSun*min(ggx(NHc,max(NV,.05),max(dot(N,uSunDir),0.),.08)*.025*max(dot(N,uSunDir),0.),1.);
    spec=.03;shin=60.;N=Nf;dirty=true;
  }
  else if(m==2){alb=vec3(.012,.014,.018);spec=.9;shin=40000.;add+=envR(R,900.)*(.05+.6*F);}
  else if(m==3){alb=vec3(.03,.036,.042);spec=.9;shin=40000.;add+=envR(R,900.)*(.07+.6*F);}
  else if(m==5){alb=vec3(.55,.56,.6);spec=1.;shin=90.;gMet=1.;add+=envR(R,400.)*vec3(.8,.82,.86);}
  else if(m==6){
    /* rubber: a darker tread band and sipes cut across it */
    alb=vec3(.032,.032,.034);spec=.06;shin=10.;
    float r=length(vL.xy),a=atan(vL.y,vL.x);
    if(em>0.&&r>em*.962)alb*=.62+.7*step(.42,fract(a*em*34.+step(0.,vL.z)*.5));
    em=0.;dirty=true;}
  else if(m==7){float on=max(uLights*.5,uBrake);emc=vec3(1.,.05,.03)*(.25+on*2.6);alb=vec3(.25,.01,.01);spec=.7;shin=80.;add+=envR(R,80.)*.15;}
  else if(m==8){emc=vec3(1.,.97,.9)*(uLights*5.+.06);alb=vec3(.5);spec=1.;shin=90.;add+=envR(R,90.)*.45;}
  else if(m==9){emc=vec3(.85,.92,1.)*(.7+uLights*2.2);alb=vec3(.3);}
  else if(m==10){emc=vec3(1.,.48,.06)*(.12+uLights*.5);alb=vec3(.35,.17,.03);spec=.7;shin=60.;add+=envR(R,60.)*.2;}
  else if(m==11){
    vec3 nl=normalize(cross(dFdx(vL),dFdy(vL)));vec3 an=abs(nl);vec2 q=an.x>.6?vL.zy:an.y>.6?vL.xz:vL.xy;
    q*=34.;vec2 rr=vec2(1.,1.732),hh=rr*.5,a=mod(q,rr)-hh,b=mod(q-hh,rr)-hh,g=dot(a,a)<dot(b,b)?a:b;
    float d=max(abs(g.x),abs(g.x)*.5+abs(g.y)*.866),e=smoothstep(.36,.46,d);
    alb=mix(vec3(.004),vec3(.05),e);spec=.5*e;shin=50.;add+=envR(R,50.)*.05*e;}
  else if(m==12){alb=uRim*.55;spec=.8;shin=70.;gMet=1.;add+=envR(R,70.)*uRim*.55;dirty=true;}
  else if(m==13){
    /* textured unpainted plastic */
    float g=vn3(vL*90.);alb=uClad*(.85+.3*g);spec=.07;shin=14.;add+=envR(R,14.)*F*.08;dirty=true;}
  else if(m==14){alb=uPaint*.12;spec=.1;}
  else if(m==15){emc=alb*em;alb*=.25;}
  else if(m==21){
    /* the studio floor: glossy, the cars' soft contact shadows on it, the studio in it */
    float sh=wshadow(vP);spec=.55;shin=60.;alb*=sh;add+=envR(R,60.)*(.08+.5*F)*sh*(uStage>1.5?.5:1.);}
  else if(m==16){spec=.25;shin=30.;add+=envR(R,30.)*F*.18;dirty=true;}
  else if(m==17){float w=step(.5,fract((vL.x+vL.z)*55.))*.5+step(.5,fract((vL.x-vL.z)*55.))*.5;alb=vec3(.03+.025*w);spec=.7;shin=90.;add+=envR(R,90.)*(.05+.4*F);}
  else if(m==18){alb=vec3(.01)*(1.+2.*step(.55,fract(vL.x*30.)));spec=.3;}
  else if(m==19){alb=uCal*.7;spec=.5;shin=50.;add+=envR(R,50.)*uCal*.1;}
  else if(m==20){float r=length(vL.xy);alb=vec3(.28,.28,.3)*(.8+.2*step(.5,fract(r*60.)));spec=.6;shin=40.;add+=envR(R,40.)*.15;}
  else if(m==22){alb=vec3(.62,.62,.58);spec=.2;}
  else if(m==23){emc=vec3(.9)*uLights*.25;alb=vec3(.6);spec=.8;shin=80.;add+=envR(R,80.)*.3;}
  else if(m==24){alb=vec3(.02,.018,.016);spec=1.;shin=120.;add+=envR(R,120.)*(.06+.5*F);}
  else if(m==25){alb=vec3(.35,.32,.28);spec=.8;shin=60.;gMet=1.;add+=envR(R,60.)*.4;}
  else if(m==26){float g=vn3(vL*60.);alb*=.85+.3*g;spec=.03;dirty=true;}
  else if(m==27){spec=.05;shin=10.;dirty=true;}
  else if(m==29){emc=vec3(.75,.88,1.)*(.15+uLights*2.4);alb=vec3(.2);}
  else if(m>=40){
    vec2 wp=Pw.xz;float sh=wshadow(vP),pud=0.;bool ground=true;
    if(m==51){o=vec4(skyCol(normalize(vP-uCam)),1.);oN=vec4(0.);return;}
    if(m==40){
      /* the ground: weights for grass, rock and mud in the colour, ambient occlusion in its alpha */
      float n2=vn(wp*.7),n3=vn(wp*3.1),n4=vn(wp*11.);
      float gw=smoothstep(.3,.72,vC.r+(n2-.5)*.45),rw=smoothstep(.35,.65,vC.g+(n3-.5)*.3),mw=smoothstep(.25,.6,vC.b+(n2-.5)*.25);
      alb=dirtCol(wp);dirtDetail(wp,alb,1.-gw);
      if(gw>.004){vec3 gc=grassCol(wp);vec2 g0=gG;gG=vec2(0.);grassDetail(wp,gc);gG=mix(g0,gG,gw);alb=mix(alb,gc,gw);}
      if(rw>.004){alb=mix(alb,rockCol(Pw),rw);vec3 a=vnd(wp*1.1);gG+=a.yz*1.1*.08*rw*near(.4);}
      spec=.03;shin=8.;
      if(mw>0.){vec3 md=mix(vec3(.15,.1,.06),vec3(.09,.06,.035),smoothstep(.3,.8,n3))*(.8+.35*n4);pud=smoothstep(.7,.76,fbm(wp*.28)+mw*.05)*mw;
        alb=mix(alb,md,mw);spec=mix(spec,.25,mw);shin=30.;gG*=1.-mw*.7;mudCracks(wp,alb,mw*(1.-smoothstep(.55,.85,mw))*.9,spec);}
      gAO=mix(1.,em,.85);em=0.;
    }
    else if(m==41){
      /* boulders and slabs: relief in 3D, bumped by the derivative of its height */
      alb=rockCol(Pw);spec=.08;shin=16.;gAO=mix(1.,em,.8);em=0.;ground=false;
#ifndef PROBE
      if(uDetail>.3&&gFP<.15){float hh=rockH(Pw);vec3 dpx=dFdx(vP),dpy=dFdy(vP),r1=cross(dpy,N),r2=cross(N,dpx);float det=dot(dpx,r1);
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
      alb=mix(alb,vec3(.7,.68,.63),ch*(1.-.6*smoothstep(.4,.8,fbm(vec2(sx,d)*vec2(.6,2.)))));spec=.04+.1*groove;shin=8.+30.*groove;
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
      pud=rut*smoothstep(.45,.6,fbm(vec2(sx*.15,d*.6)))*(1.-edge);
      mudCracks(wp,alb,edge*.8,spec);
    }
    else if(m==45){float j=max(step(fract(wp.x/4.),.012),step(fract(wp.y/4.),.012));alb=vec3(.26,.25,.235)*(.82+.25*vn(wp*2.3)+.1*vn(wp*13.))*(1.-.35*j);spec=.06;shin=20.;
      vec3 b=vnd(wp*24.);gG+=b.yz*24.*.0007*near(.03);alb*=1.-.18*smoothstep(.6,.85,fbm(wp*.35))*uDetail;}
    else if(m==46){float g=vn(vec2((Pw.x+Pw.z)*1.5,Pw.y*38.))*.6+vn(vec2((Pw.x+Pw.z)*.4,Pw.y*7.))*.4;alb*=.62+.5*g;spec=.03;ground=false;}
    else if(m==47){float rib=abs(fract((Pw.x+Pw.z)*3.6+(em>.5?Pw.y*3.6:0.))-.5),st=smoothstep(.55,.85,vn(vec2((Pw.x+Pw.z)*2.,Pw.y*.25)))*.35;
      alb*=(.86+.22*rib)*(1.-st*.5);alb=mix(alb,vec3(.18,.08,.04),st*.35);spec=em>.5?.15:.5;shin=em>.5?20.:60.;add+=envR(R,shin)*F*.25*(1.-st);em=0.;ground=false;}
    else if(m==48){
      /* leaves: light comes through them; the crown is darker underneath and deep inside */
      alb*=.6+.55*vn3(Pw*2.2);spec=.05;shin=10.;gTrans=.45;ground=false;
      gAO=.45+.55*sat(N.y*.5+.5)*sat(vL.y/7.+.2);
#ifndef PROBE
      /* clumps of leaves catch the light or sit in shade: a bump at the clumps' size, and at the leaves' */
      if(gFP<.2){float hh=vn3(Pw*2.4)*.3+vn3(Pw*7.)*.05*sat(1.-gFP/.06);vec3 dpx=dFdx(vP),dpy=dFdy(vP),r1=cross(dpy,N),r2=cross(N,dpx);float det=dot(dpx,r1);
        N=normalize(abs(det)*N-sign(det)*(dFdx(hh)*r1+dFdy(hh)*r2)*sat(1.-gFP/.2)*uDetail);}
#endif
    }
    else if(m==49){float st=vn(vec2((Pw.x+Pw.z)*30.,Pw.y*20.))*.6+vn(vec2(atan(vL.z,vL.y)*20.,Pw.y*6.))*.4;alb=vec3(.42,.31,.1)*(.6+.6*st);spec=.02;ground=false;}
    else if(m==50){
      /* the creek and the pond: dark water, the world in it, ripples running downstream (and rain rings) */
      vec2 rp=wp*1.3+vec2(uTime*.3,uTime*.5);vec2 gw=vec2((vn(rp)-.5)*.25+(vn(wp*3.1-uTime*.4)-.5)*.12,(vn(rp+7.)-.5)*.25);
      if(uCloud.w>.35)gw+=ripples(wp*1.7)*uCloud.w*near(.05);
      vec3 Nw=normalize(vec3(gw.x,1.,gw.y));
      vec3 Rw=reflect(-V,Nw);float Fw=.03+.97*pow(1.-max(dot(Nw,V),0.),5.);alb=vec3(.025,.03,.018);spec=1.;shin=400.;add+=envR(Rw,2000.)*(.08+.9*Fw);N=Nw;ground=false;
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
      alb=ac;spec=.2;shin=36.+40.*rub;add+=envR(R,shin)*F*.1;em=0.;
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
      float tr=smoothstep(.55,.8,fbm(wp*.02+3.))*.25;c*=1.-tr;
      mudCracks(wp*.55,c,.9,spec);vec3 b=vnd(wp*1.3);gG+=b.yz*1.3*.01*near(.15);
      alb=c;spec=.03;shin=8.;
    }
    else if(m==58){
      /* the open world's public roads (51_world): blacktop (blue 3), Route 6 (4), the expressway (5). Red = metres
         along (mod 1200), green = metres across; edge lines white, a dashed yellow down the middle (a double one on
         the expressway, with dashed white between its lanes), darker where the tyres run */
      float sx=vC.r,d=vC.g,ad=abs(d),cls=vC.b,n2=vn(wp*6.),n3=vn(wp*37.),lane=cls>3.5?3.65:3.2,lanes=cls>4.5?2.:1.,el=lane*lanes;
      vec3 ac=(cls<3.5?vec3(.085,.08,.074):vec3(.052,.052,.058))*(.84+.26*n2)*(.88+.22*n3);
      float q=mod(ad,lane);ac*=1.-.12*exp(-pow((q-lane*.28)/.45,2.))-.12*exp(-pow((q-lane*.72)/.45,2.));
      asphaltDetail(wp,ac,ad,el);
      float wht=step(el-.16,ad)*step(ad,el),yel=cls>4.5?step(.07,ad)*step(ad,.19):step(ad,.065)*step(fract(sx/12.),.25);
      if(cls>4.5)wht=max(wht,step(abs(ad-lane),.065)*step(fract(sx/12.),.25));
      ac=mix(ac,vec3(.6,.6,.58),wht*(.75+.25*n3));ac=mix(ac,vec3(.58,.42,.07),yel*(.75+.25*n3));
      alb=ac;spec=.18;shin=40.;add+=envR(R,shin)*F*.08;em=0.;
    }
    /* rain soaks the porous ground dark and puts a sheen with the world in it on the hard ground; low spots fill */
    float por=m==40||m==42||m==43||m==44||m==53||m==55||m==56||m==57?1.:0.,hard=m==54||m==45||m==58?1.:0.;
    if(uWet>0.){alb*=1.-uWet*(.36*por+.22*hard);spec=mix(spec,.6,uWet*(.75*hard+.2*por));shin=mix(shin,160.,uWet*(hard+.4*por));
      if(por>0.)pud=max(pud,smoothstep(.66,.72,fbm(wp*.09+11.3)*.8+vn(wp*.55)*.2+uWet*.12-.1)*uWet*.9);}
    if(pud>0.){alb=mix(alb,alb*.35+vec3(.02,.015,.01),pud*.85);gG*=1.-pud;
      vec2 rg=uCloud.w>.35?ripples(wp*1.8)*uCloud.w*near(.05):vec2(0.);vec3 Np=normalize(N+vec3(rg.x,0.,rg.y)*pud);
      vec3 Rp=reflect(-V,Np);float Fp=.03+.97*pow(1.-max(dot(Np,V),0.),5.);spec=mix(spec,.9,pud);shin=mix(shin,1200.,pud);add+=envR(Rp,1500.)*Fp*pud*.85;}
    /* the bump: the detail's height gradient tips the normal (on ground, which faces mostly up) */
#ifndef PROBE
    if(ground&&(gG.x!=0.||gG.y!=0.))N=normalize(N+vec3(-gG.x,0.,-gG.y));
#endif
    gAO*=sh;add*=sh;gSun*=mix(1.,sh,.35);
  }
  if(dirty){float k=mud(vL,h);if(k>0.){alb=mix(alb,mudCol(vL,h),k);spec*=1.-.8*k;add*=1.-.85*k;}}
  vec3 col=shade(vP,N,V,alb,spec,shin)+add*gAO+emc;
  if(em>0.&&m==0)col+=vC.rgb*em;
  /* height fog: thicker low down, thinner up on the hills, coloured like the sky behind it */
  vec3 dv=vP-uCam,dir=dv/max(dist,1e-3);float fb=.012,fy=dir.y*dist*fb,ff=abs(fy)>1e-3?(1.-exp(-fy))/fy:1.;
  float fog=1.-exp(-uFogD*dist*exp(-max(uCam.y,0.)*fb)*ff);vec3 fc=hazeCol(dir);
  /* the haze is brighter looking toward the sun */
  if(uCloud.z>0.)fc+=uSunCol*pow(max(dot(dir,uSunDir),0.),6.)*.2*uCloud.z;
  col=mix(col,fc,fog);
  /* (checked on the bits: a compiler may assume isnan never fires; and kept inside a half float's range, where the
     scene target would turn a bigger value into an infinity) */
  if(any(equal(floatBitsToUint(col)&uvec3(0x7f800000u),uvec3(0x7f800000u))))col=vec3(0.);col=min(col,vec3(2e3));
  o=vec4(col,1.);
/* (a debugging view: the material, the brightness, the specular strength and exponent) */
#ifdef DEBUG_MAT
  o=vec4(float(m),dot(col,vec3(.3,.59,.11)),spec,shin);
#endif
  /* for the screen-space passes: the normal, and how much of this colour is ambient light */
  oN=vec4(N*.5+.5,sat(gAmb/max(dot(col,vec3(.3,.59,.11)),1e-4))*(1.-fog));
}`;
/* the sky: one triangle over the whole view at the far plane, drawn after everything else so it only
   colours what nothing covers; each pixel's direction comes from the inverse view-projection */
const VS_SKY=`out vec2 vNdc;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2))*2.-1.;vNdc=p;gl_Position=vec4(p,.99999,1.);}`;
const FS_SKY=GLSL_COMMON+`
in vec2 vNdc;uniform mat4 uInvVP;layout(location=0) out vec4 o;layout(location=1) out vec4 oN;
void main(){vec4 q=uInvVP*vec4(vNdc,1.,1.);vec3 d=normalize(q.xyz/q.w-uCam);o=vec4(skyCol(d),1.);oN=vec4(0.);}`;
/* the defines the scene shader is compiled with: WORLD for the game (the HD shader is the world's only) */
let LIT_DEFS='';
/* material ids (used by the mesh builders) */
const MAT={COL:0,PAINT:1,GLASS:2,GLASSL:3,ACCENT:4,CHROME:5,TYRE:6,TAIL:7,HEAD:8,LED:9,AMBER:10,MESH:11,RIM:12,CLAD:13,SHUT:14,EMIT:15,METAL:16,CARBON:17,LOUVRE:18,CALIPER:19,ROTOR:20,FLOOR:21,PLATE:22,REV:23,SMOKE:24,REFL:25,FABRIC:26,RUBBER:27,HALO:29};
