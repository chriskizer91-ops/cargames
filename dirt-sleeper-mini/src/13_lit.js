/* ===== the scene shader: one lit pass for the truck and the stage =====
   Shiftlight 2's lighting (hemisphere ambient, a sun, point lights, a studio environment for
   reflections) with the truck's own materials: paint with a livery and mud, textured cladding,
   tinted glass, chrome, rubber with tread, lenses that light up, and a glossy studio floor that
   carries a soft contact shadow under the truck. */
const GLSL_COMMON=`
uniform mat4 uVP;uniform vec3 uCam;uniform float uTime;
uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uSkyAmb;uniform vec3 uGndAmb;uniform vec3 uFogCol;uniform float uFogD;
uniform vec4 uLP[8];uniform vec4 uLC[8];uniform int uNL;uniform float uStage;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.07+vec3(1.7,9.2,4.1);a*=.5;}return s;}
/* the studio as seen in reflections. Dark bay: a black room, an overhead softbox and eight tall strip
   lights round the cove. Light cyc: a pale grey infinity wall with a big soft key overhead. */
vec3 env(vec3 d){
  float t=d.y;
  if(uStage<1.5){
    vec3 c=mix(vec3(.02,.02,.026),vec3(.004,.004,.007),smoothstep(-.1,.6,t));
    if(t>.2){vec2 q=d.xz/t;c+=vec3(1.,.97,.92)*2.6*(1.-smoothstep(.45,.6,abs(q.x)))*(1.-smoothstep(.2,.3,abs(q.y)));}
    float k=fract(atan(d.z,d.x)/.7853982+.5)-.5;c+=vec3(.85,.9,1.)*.9*(1.-smoothstep(.01,.05,abs(k)))*(1.-smoothstep(.04,.34,abs(t-.16)));
    c+=vec3(.9,.92,1.)*.5*exp(-abs(t+.04)*55.);
    return c;
  }
  vec3 c=mix(vec3(.30,.29,.28),vec3(.62,.61,.60),smoothstep(-.25,.35,t));
  c=mix(c,vec3(.48,.47,.46),smoothstep(.35,.9,t));
  if(t>.25){vec2 q=d.xz/t;c+=vec3(1.,.98,.95)*1.6*(1.-smoothstep(.6,.9,abs(q.x)))*(1.-smoothstep(.35,.6,abs(q.y)));}
  c+=vec3(.7)*exp(-abs(t-.02)*30.)*.25;
  return c;
}
vec3 shade(vec3 P,vec3 N,vec3 V,vec3 alb,float spec,float shin){
  vec3 c=alb*(uSkyAmb*(.55+.45*N.y)+uGndAmb*(.45-.45*N.y));
  float nl=max(dot(N,uSunDir),0.);vec3 Hs=normalize(uSunDir+V);
  c+=uSunCol*nl*(alb+spec*pow(max(dot(N,Hs),0.),shin));
  for(int i=0;i<8;i++){if(i>=uNL)break;vec3 L=uLP[i].xyz-P;float d2=dot(L,L),r=uLP[i].w;if(d2>r*r)continue;
    float d=sqrt(d2);L/=d;float a=1.-d/r;a*=a;float ln=max(dot(N,L),0.);vec3 Hh=normalize(L+V);
    c+=uLC[i].rgb*a*(alb*(ln*.85+.15)+spec*pow(max(dot(N,Hh),0.),shin)*ln*1.5);}
  return c;
}
`;
const VS_LIT=`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in float aMat;
uniform mat4 uM;uniform mat4 uVP;
out vec3 vP;out vec3 vN;out vec4 vC;out float vMat;out vec3 vL;
void main(){vec3 w=(uM*vec4(aPos,1.)).xyz;vN=normalize(mat3(uM)*aNrm);vC=aCol;vL=aPos;vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);}`;
const FS_LIT=GLSL_COMMON+`
in vec3 vP;in vec3 vN;in vec4 vC;in float vMat;in vec3 vL;out vec4 o;
uniform vec3 uPaint;uniform vec3 uPaint2;uniform vec3 uRim;uniform vec3 uCal;uniform vec3 uClad;
uniform float uLiv;uniform float uLights;uniform float uBrake;uniform float uDirt;uniform float uGround;uniform vec4 uLivP;
uniform vec4 uSh[8];uniform float uShA[8];uniform int uNSh;uniform float uSpin;
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
void main(){
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vP);if(dot(N,V)<0.)N=-N;
  vec3 alb=vC.rgb;float em=vC.a;float spec=.04,shin=12.;vec3 emc=vec3(0.);vec3 add=vec3(0.);
  int m=int(vMat+.5);float h=vP.y-uGround;bool dirty=false;
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
    /* metallic: a little sparkle in the flake and a coloured highlight */
    float fl=h13(floor(vL*260.));alb*=.975+.05*fl;
    spec=.55;shin=110.;add+=env(R)*F*.75+pc*env(R)*.08*(1.-NV);dirty=true;
  }
  else if(m==2){alb=vec3(.012,.014,.018);spec=.9;shin=140.;add+=env(R)*(.05+.6*F);}
  else if(m==3){alb=vec3(.03,.036,.042);spec=.9;shin=140.;add+=env(R)*(.07+.6*F);}
  else if(m==5){alb=vec3(.55,.56,.6);spec=1.;shin=90.;add+=env(R)*vec3(.8,.82,.86);}
  else if(m==6){
    /* rubber: a darker tread band and sipes cut across it */
    alb=vec3(.032,.032,.034);spec=.06;shin=10.;
    float r=length(vL.xy),a=atan(vL.y,vL.x);
    if(em>0.&&r>em*.962)alb*=.62+.7*step(.42,fract(a*em*34.+step(0.,vL.z)*.5));
    em=0.;dirty=true;}
  else if(m==7){float on=max(uLights*.5,uBrake);emc=vec3(1.,.05,.03)*(.25+on*2.6);alb=vec3(.25,.01,.01);spec=.7;shin=80.;add+=env(R)*.15;}
  else if(m==8){emc=vec3(1.,.97,.9)*(uLights*5.+.06);alb=vec3(.5);spec=1.;shin=90.;add+=env(R)*.45;}
  else if(m==9){emc=vec3(.85,.92,1.)*(.7+uLights*2.2);alb=vec3(.3);}
  else if(m==10){emc=vec3(1.,.48,.06)*(.12+uLights*.5);alb=vec3(.35,.17,.03);spec=.7;shin=60.;add+=env(R)*.2;}
  else if(m==11){
    vec3 nl=normalize(cross(dFdx(vL),dFdy(vL)));vec3 an=abs(nl);vec2 q=an.x>.6?vL.zy:an.y>.6?vL.xz:vL.xy;
    q*=34.;vec2 rr=vec2(1.,1.732),hh=rr*.5,a=mod(q,rr)-hh,b=mod(q-hh,rr)-hh,g=dot(a,a)<dot(b,b)?a:b;
    float d=max(abs(g.x),abs(g.x)*.5+abs(g.y)*.866),e=smoothstep(.36,.46,d);
    alb=mix(vec3(.004),vec3(.05),e);spec=.5*e;shin=50.;add+=env(R)*.05*e;}
  else if(m==12){alb=uRim*.55;spec=.8;shin=70.;add+=env(R)*uRim*.55;dirty=true;}
  else if(m==13){
    /* textured unpainted plastic */
    float g=vn3(vL*90.);alb=uClad*(.85+.3*g);spec=.07;shin=14.;add+=env(R)*F*.08;dirty=true;}
  else if(m==14){alb=uPaint*.12;spec=.1;}
  else if(m==15){emc=alb*em;alb*=.25;}
  else if(m==16){spec=.25;shin=30.;add+=env(R)*F*.18;dirty=true;}
  else if(m==17){float w=step(.5,fract((vL.x+vL.z)*55.))*.5+step(.5,fract((vL.x-vL.z)*55.))*.5;alb=vec3(.03+.025*w);spec=.7;shin=90.;add+=env(R)*(.05+.4*F);}
  else if(m==18){alb=vec3(.01)*(1.+2.*step(.55,fract(vL.x*30.)));spec=.3;}
  else if(m==19){alb=uCal*.7;spec=.5;shin=50.;add+=env(R)*uCal*.1;}
  else if(m==20){float r=length(vL.xy);alb=vec3(.28,.28,.3)*(.8+.2*step(.5,fract(r*60.)));spec=.6;shin=40.;add+=env(R)*.15;}
  else if(m==21){
    /* the studio floor: glossy, with a soft contact shadow under each car (x, z, half length, half width; turned by uShA) */
    float sh=1.;
    for(int i=0;i<8;i++){if(i>=uNSh)break;
      vec2 q=vP.xz-uSh[i].xy;float c=cos(uShA[i]),s=sin(uShA[i]);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
      vec2 e=abs(q)-uSh[i].zw;float dd=length(max(e,0.))+min(max(e.x,e.y),0.);
      sh=min(sh,1.-.82*(1.-smoothstep(-.35,.55,dd))-.10*(1.-smoothstep(-.2,2.4,dd)));}
    spec=.55;shin=60.;alb*=sh;add+=env(R)*(.08+.5*F)*sh*(uStage>1.5?.5:1.);}
  else if(m==22){alb=vec3(.62,.62,.58);spec=.2;}
  else if(m==23){emc=vec3(.9)*uLights*.25;alb=vec3(.6);spec=.8;shin=80.;add+=env(R)*.3;}
  else if(m==24){alb=vec3(.02,.018,.016);spec=1.;shin=120.;add+=env(R)*(.06+.5*F);}
  else if(m==25){alb=vec3(.35,.32,.28);spec=.8;shin=60.;add+=env(R)*.4;}
  else if(m==26){float g=vn3(vL*60.);alb*=.85+.3*g;spec=.03;dirty=true;}
  else if(m==27){spec=.05;shin=10.;dirty=true;}
  else if(m==29){emc=vec3(.75,.88,1.)*(.15+uLights*2.4);alb=vec3(.2);}
  if(dirty){float k=mud(vL,h);if(k>0.){alb=mix(alb,mudCol(vL,h),k);spec*=1.-.8*k;add*=1.-.85*k;}}
  vec3 col=shade(vP,N,V,alb,spec,shin)+add+emc;
  if(em>0.&&m==0)col+=vC.rgb*em;
  float fog=1.-exp(-length(vP-uCam)*uFogD);col=mix(col,uFogCol,fog);
  o=vec4(col,1.);
}`;
/* material ids (used by the mesh builders) */
const MAT={COL:0,PAINT:1,GLASS:2,GLASSL:3,ACCENT:4,CHROME:5,TYRE:6,TAIL:7,HEAD:8,LED:9,AMBER:10,MESH:11,RIM:12,CLAD:13,SHUT:14,EMIT:15,METAL:16,CARBON:17,LOUVRE:18,CALIPER:19,ROTOR:20,FLOOR:21,PLATE:22,REV:23,SMOKE:24,REFL:25,FABRIC:26,RUBBER:27,HALO:29};

