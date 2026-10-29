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
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,-9.1);a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn3(p);p=p*2.07+vec3(1.7,9.2,4.1);a*=.5;}return s;}
/* the studio as seen in reflections. Dark bay: a black room, an overhead softbox and eight tall strip
   lights round the cove. Light cyc: a pale grey infinity wall with a big soft key overhead. */
#ifdef WORLD
uniform vec3 uSkyZen;uniform vec3 uSkyHor;
#endif
vec3 env(vec3 d){
  float t=d.y;
#ifdef WORLD
  if(uStage>2.5){
    /* the open world's sky: deep blue overhead to a pale horizon, warm ground below it, the sun and its glow */
    vec3 c=mix(uSkyHor,uSkyZen,pow(smoothstep(0.,.75,t),.8));
    c=mix(c,uSkyHor*vec3(.62,.5,.4)*.55,smoothstep(.02,-.12,t));
    float sd=max(dot(d,uSunDir),0.);c+=uSunCol*(pow(sd,900.)*12.+pow(sd,24.)*.08+pow(sd,4.)*.03)*smoothstep(-.05,.02,t);
    return c;
  }
#endif
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
/* how much of the sun reaches this point (the world's shadow map sets it; 1 everywhere else) */
float gSun=1.;
vec3 shade(vec3 P,vec3 N,vec3 V,vec3 alb,float spec,float shin){
  vec3 c=alb*(uSkyAmb*(.55+.45*N.y)+uGndAmb*(.45-.45*N.y));
  float nl=max(dot(N,uSunDir),0.);vec3 Hs=normalize(uSunDir+V);
  c+=uSunCol*gSun*nl*(alb+spec*pow(max(dot(N,Hs),0.),shin));
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
#ifdef WORLD
layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform float uInst;
#endif
void main(){
#ifdef WORLD
  if(uInst>.5){
    /* instanced bits (dust, mud, spray, trees): position and yaw, size, colour and glow per instance;
       a vertex whose colour alpha is 2 keeps its own colour (tree trunks) */
    float c=cos(iA.w),s=sin(iA.w);vec3 q=aPos*iB.xyz;vec3 w=iA.xyz+vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);
    vN=normalize(vec3(c*aNrm.x+s*aNrm.z,aNrm.y,-s*aNrm.x+c*aNrm.z));vC=aCol.a>1.5?vec4(aCol.rgb,0.):vec4(iC.rgb*aCol.rgb,iC.a);vL=aPos;vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);return;}
#endif
  vec3 w=(uM*vec4(aPos,1.)).xyz;vN=normalize(mat3(uM)*aNrm);vC=aCol;vL=aPos;vP=w;vMat=aMat;gl_Position=uVP*vec4(w,1.);}`;
const FS_LIT=GLSL_COMMON+`
in vec3 vP;in vec3 vN;in vec4 vC;in float vMat;in vec3 vL;out vec4 o;
uniform vec3 uPaint;uniform vec3 uPaint2;uniform vec3 uRim;uniform vec3 uCal;uniform vec3 uClad;
uniform float uLiv;uniform float uLights;uniform float uBrake;uniform float uDirt;uniform float uGround;uniform vec4 uLivP;
uniform vec4 uSh[8];uniform float uShA[8];uniform int uNSh;uniform float uSpin;
#ifdef WORLD
uniform float uShK[8];uniform float uMudOff;uniform float uMudLocal;
/* the sun's shadow map round the car (55_gfx): its matrix, on/texel size/normal offset, and the weather:
   uCloud = cloud cover, cloud brightness, haze toward the sun, rain; uWet = how wet the ground is */
uniform highp sampler2DShadow uShTex;uniform mat4 uShM;uniform vec4 uShP;uniform vec4 uCloud;uniform float uWet;
float sunShadow(vec3 P,vec3 N){
  if(uShP.x<.5)return 1.;
  vec4 q=uShM*vec4(P+N*uShP.z,1.);vec3 p=q.xyz*.5+.5;
  if(p.x<.002||p.y<.002||p.x>.998||p.y>.998||p.z>1.)return 1.;
  float t=uShP.y,b=uShP.w,s=texture(uShTex,vec3(p.xy+vec2(-.6,-.25)*t,p.z-b))+texture(uShTex,vec3(p.xy+vec2(.25,-.6)*t,p.z-b))
    +texture(uShTex,vec3(p.xy+vec2(.6,.25)*t,p.z-b))+texture(uShTex,vec3(p.xy+vec2(-.25,.6)*t,p.z-b));
  float e=max(abs(p.x-.5),abs(p.y-.5))*2.;
  return mix(s*.25,1.,smoothstep(.78,.98,e));
}
#endif
/* mud: caked and wet low down, dry and splattered higher up; returns 0..1 coverage */
float mud(vec3 L,float h){
  if(uDirt<=0.)return 0.;
  float n=fbm3(L*vec3(2.2,5.,2.2));
  float line=.2+.68*uDirt+(n-.5)*.28;
  float cake=1.-smoothstep(line-.05,line+.05,h);
  float spl=smoothstep(.6-.1*uDirt,.66-.1*uDirt,fbm3(L*7.+3.))*(1.-smoothstep(line,line+.45+.35*uDirt,h))*uDirt;
  return clamp(max(cake,spl*.85),0.,1.);
}
#ifdef WORLD
/* the soft shadows under the cars on open ground: rounded rectangles at (x, z), half size, turned by yaw,
   each as dark as uShK says (they fade as a car leaves the ground) */
float wshadow(vec3 P){
  float sh=1.;
  for(int i=0;i<8;i++){if(i>=uNSh)break;
    vec2 q=P.xz-uSh[i].xy;float c=cos(uShA[i]),s=sin(uShA[i]);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
    vec2 e=abs(q)-uSh[i].zw;float dd=length(max(e,0.))+min(max(e.x,e.y),0.);
    sh=min(sh,1.-uShK[i]*(.78*(1.-smoothstep(-.4,.7,dd))+.1*(1.-smoothstep(-.2,2.6,dd))));}
  return sh;
}
/* the ranch's red-dirt country (Dirt Sleeper's palette) */
vec3 dirtCol(vec2 p){float n1=fbm(p*.09),n3=vn(p*3.1);return mix(vec3(.21,.095,.045),vec3(.36,.2,.105),n1)*(.8+.35*n3);}
vec3 grassCol(vec2 p){float dry=smoothstep(.3,.78,fbm(p*.045+7.));float n2=vn(p*.7),n3=vn(p*3.1),n4=vn(p*11.);
  return mix(vec3(.06,.105,.022),vec3(.2,.17,.06),dry)*(.62+.5*n4*n3+.25*n2);}
vec3 rockCol(vec3 P){float n=fbm(P.xz*vec2(.8,2.6)+P.y),n2=vn(P.xz*7.+P.y*3.);
  vec3 c=mix(vec3(.25,.13,.08),vec3(.3,.25,.2),n2)*(.6+.6*n)*(.85+.3*n2);return mix(c,vec3(.2,.19,.07),smoothstep(.62,.7,fbm(P.xz*1.7+3.))*.5);}
#endif
vec3 mudCol(vec3 L,float h){float w=1.-smoothstep(.0,.6,h),g=vn3(L*14.);return mix(vec3(.30,.22,.14),vec3(.13,.09,.055),w)*(.88+.24*g);}
void main(){
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vP);if(dot(N,V)<0.)N=-N;
  vec3 alb=vC.rgb;float em=vC.a;float spec=.04,shin=12.;vec3 emc=vec3(0.);vec3 add=vec3(0.);
#ifdef WORLD
  /* a car out in the world measures its mud up itself; see-through by dropping pixels (the dot pass averages
     them): dust and spray carry their opacity as a negative glow; trees thin out right in front of the camera */
  int m=int(vMat+.5);float h=uMudLocal>.5?vL.y+uMudOff:vP.y-uGround;bool dirty=false;
  if(em<0.){if(h12(gl_FragCoord.xy+fract(uTime*7.3)*91.)>-em)discard;em=0.;}
  if(m==48){float dc=length(vP-uCam);if(dc<8.&&h12(gl_FragCoord.xy)>smoothstep(3.,8.,dc))discard;}
  if(m!=51)gSun=sunShadow(vP,N);
#else
  int m=int(vMat+.5);float h=vP.y-uGround;bool dirty=false;
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
#ifdef WORLD
  else if(m>=40){
    vec2 wp=vP.xz;float sh=wshadow(vP);
    if(m==51){
      /* the sky, with clouds drifting over it (lit toward the sun, grey and heavy in the rain) */
      vec3 d=normalize(vP-uCam),sc=env(d);
      if(uCloud.x>0.&&d.y>0.){vec2 uv=d.xz/(d.y+.12)*1.5+uTime*vec2(.006,.0025);float n=fbm(uv*1.2)*.62+fbm(uv*3.4+3.1)*.38;
        float cov=smoothstep(1.-uCloud.x,1.25-uCloud.x,n)*smoothstep(.0,.08,d.y),sd=max(dot(d,uSunDir),0.);
        vec3 cc=mix(vec3(.5,.55,.64),vec3(1.12,1.08,1.02),(.35+.65*sd)*(.6+.4*n))*uCloud.y;sc=mix(sc,cc,cov*.92);}
      o=vec4(sc,1.);return;}
    if(m==40){
      /* the ground: weights for grass, rock and mud in the colour, ambient occlusion in its alpha */
      float n2=vn(wp*.7),n3=vn(wp*3.1),n4=vn(wp*11.);
      float gw=smoothstep(.3,.72,vC.r+(n2-.5)*.45),rw=smoothstep(.35,.65,vC.g+(n3-.5)*.3),mw=smoothstep(.25,.6,vC.b+(n2-.5)*.25);
      alb=dirtCol(wp);if(gw>.004)alb=mix(alb,grassCol(wp),gw);if(rw>.004)alb=mix(alb,rockCol(vP),rw);spec=.03;shin=8.;
      if(mw>0.){vec3 md=mix(vec3(.15,.1,.06),vec3(.09,.06,.035),smoothstep(.3,.8,n3))*(.8+.35*n4);float pud=smoothstep(.7,.76,fbm(wp*.28)+mw*.05)*mw;
        alb=mix(alb,md,mw);spec=mix(spec,.25,mw);shin=30.;if(pud>0.){alb=mix(alb,vec3(.1,.07,.04),pud*.8);spec=mix(spec,.9,pud);shin=120.;add+=env(R)*F*pud*.6;}}
      alb*=mix(1.,em,.85);em=0.;
    }
    else if(m==41){alb=rockCol(vP)*mix(1.,em,.8);spec=.08;shin=16.;em=0.;}
    else if(m==42){
      /* the drag strip: packed dirt, darker grooves where the tyres run, chalk lines (colour = metres past the line, metres across) */
      float sx=vC.r,d=vC.g,ad=abs(d),n2=vn(vec2(sx,d)*2.5);
      alb=dirtCol(wp)*mix(vec3(1.),vec3(.72,.66,.62),.35+.15*n2);
      float lane=min(abs(d+4.),abs(d-4.)),groove=exp(-pow(min(abs(lane-.82),abs(lane+.82))/.34,2.))*(.35+.65*smoothstep(90.,-10.,sx));alb*=1.-.4*groove;
      alb=mix(alb,dirtCol(wp*1.3)*1.08,smoothstep(7.,8.8,ad));
      float ch=max(max(1.-step(.16,abs(sx)),1.-step(.16,abs(sx-201.168)))*step(ad,8.2),(1.-step(.07,abs(d)))*step(.45,fract(sx/5.))*step(-6.,sx)*step(sx,250.));
      ch=max(ch,(1.-step(.05,abs(ad-7.9)))*step(-12.,sx)*step(sx,250.));
      alb=mix(alb,vec3(.7,.68,.63),ch*(1.-.6*smoothstep(.4,.8,fbm(vec2(sx,d)*vec2(.6,2.)))));spec=.04+.1*groove;
    }
    else if(m==43){
      /* a two-track: packed ruts, a grassy crown, grass closing in at the verges */
      float d=vC.g,ad=abs(d),n2=vn(vec2(vC.r,d)*2.5);alb=dirtCol(wp);
      float rut=exp(-pow((ad-.86)/.3,2.)),crown=1.-smoothstep(.18,.45,ad),verge=smoothstep(1.9,3.3,ad+(n2-.5)*.8);
      alb*=1.-.22*rut;alb=mix(alb,grassCol(wp),max(crown*.85*smoothstep(.25,.55,vn(vec2(vC.r*.7,d*3.))),verge));spec=.04;
    }
    else if(m==44){
      /* the mud track: churned and wet, ruts with water lying in them */
      float sx=vC.r,d=vC.g,ad=abs(d),n3=vn(vec2(sx*.9,d*2.2)),n4=vn(vec2(sx,d)*7.);
      vec3 md=mix(vec3(.13,.085,.05),vec3(.075,.05,.03),smoothstep(.3,.8,n3))*(.8+.35*n4);
      float rut=0.;for(int i=0;i<4;i++){float c=(float(i)-1.5)*1.55+(vn(vec2(sx*.08,float(i)*3.))-.5)*.7;rut=max(rut,exp(-pow((d-c)/.34,2.)));}
      float edge=smoothstep(3.8,4.9,ad+(n3-.5)*1.2),clod=smoothstep(.55,.8,vn(vec2(sx*3.,d*5.)))*(1.-rut);
      alb=mix(md*(1.+clod*.45),dirtCol(wp)*.85,edge*.6);spec=.3;shin=40.;
      float pud=rut*smoothstep(.45,.6,fbm(vec2(sx*.15,d*.6)))*(1.-edge);
      if(pud>0.){alb=mix(alb,vec3(.07,.05,.03),pud*.8);spec=mix(spec,1.,pud);shin=140.;add+=env(R)*F*pud*.7;}
    }
    else if(m==45){float j=max(step(fract(wp.x/4.),.012),step(fract(wp.y/4.),.012));alb=vec3(.26,.25,.235)*(.82+.25*vn(wp*2.3)+.1*vn(wp*13.))*(1.-.35*j);spec=.06;shin=20.;}
    else if(m==46){float g=vn(vec2((vP.x+vP.z)*1.5,vP.y*38.))*.6+vn(vec2((vP.x+vP.z)*.4,vP.y*7.))*.4;alb*=.62+.5*g;spec=.03;}
    else if(m==47){float rib=abs(fract((vP.x+vP.z)*3.6+(em>.5?vP.y*3.6:0.))-.5),st=smoothstep(.55,.85,vn(vec2((vP.x+vP.z)*2.,vP.y*.25)))*.35;
      alb*=(.86+.22*rib)*(1.-st*.5);alb=mix(alb,vec3(.18,.08,.04),st*.35);spec=em>.5?.15:.5;shin=em>.5?20.:60.;add+=env(R)*F*.25*(1.-st);em=0.;}
    else if(m==48){alb*=.6+.55*vn3(vP*2.2);spec=.05;shin=10.;}
    else if(m==49){float st=vn(vec2((vP.x+vP.z)*30.,vP.y*20.))*.6+vn(vec2(atan(vL.z,vL.y)*20.,vP.y*6.))*.4;alb=vec3(.42,.31,.1)*(.6+.6*st);spec=.02;}
    else if(m==50){
      /* the creek: dark water, the sky in it, ripples running downstream */
      vec2 rp=wp*1.3+vec2(uTime*.3,uTime*.5);vec3 Nw=normalize(vec3((vn(rp)-.5)*.25+(vn(wp*3.1-uTime*.4)-.5)*.12,1.,(vn(rp+7.)-.5)*.25));
      vec3 Rw=reflect(-V,Nw);float Fw=.03+.97*pow(1.-max(dot(Nw,V),0.),5.);alb=vec3(.025,.03,.018);spec=1.;shin=200.;add+=env(Rw)*(.08+.9*Fw);
    }
    else if(m==52){alb=vec3(.7,.68,.63);}
    else if(m==53){
      /* gravel: a county road (two worn wheel tracks, loose stone down the middle and the edges, the
         verge closing in) or a loose bed (the traps at the track, the yard at home); alpha = road half width */
      float d=vC.g,ad=abs(d),hw=em,n1=vn(wp*1.7),n2=vn(wp*9.),n3=vn(wp*31.);
      vec3 gc=mix(vec3(.16,.145,.12),vec3(.27,.245,.205),n1)*(.7+.42*n2)*(.78+.36*n3);
      if(vC.b<.5){float tr=exp(-pow((ad-1.5)/.55,2.));gc=mix(gc,gc*vec3(.8,.78,.76),tr*.85);
        float edge=smoothstep(hw-.6,hw+.3,ad+(n1-.5)*.9);gc=mix(gc,mix(dirtCol(wp),grassCol(wp),smoothstep(.25,.7,vn(wp*.35))),edge);}
      alb=gc;spec=.05;shin=14.;em=0.;
    }
    else if(m==54){
      /* asphalt: dark and fine grained, rubber down the middle, white edge lines, red and white kerbs where
         it bends (blue slot), grass beyond, a chequered band at the line; alpha = half width */
      float sx=vC.r,d=vC.g,ad=abs(d),hw=em,n2=vn(wp*7.),n3=vn(wp*41.);
      vec3 ac=vec3(.05,.05,.056)*(.82+.28*n2)*(.88+.22*n3);ac*=1.-.2*exp(-pow(d/2.4,2.));
      ac=mix(ac,vec3(.6,.6,.58),step(hw-.45,ad)*step(ad,hw-.2));
      if(ad>hw){vec3 kc=mix(vec3(.46,.03,.025),vec3(.64,.63,.6),step(.5,fract(sx/1.6)));ac=mix(grassCol(wp),kc,smoothstep(.35,.45,vC.b)*step(ad,hw+1.5));}
      else if(sx<1.6){ac=mix(vec3(.015),vec3(.64),mod(floor(sx/.8)+floor((d+hw)/.8),2.));}
      alb=ac;spec=.2;shin=36.;add+=env(R)*F*.1;em=0.;
    }
    else if(m==55){
      /* the home lane: mud in the ruts with water lying in the deep spots, grass on the crown and the verges (blue = rut depth) */
      float sx=vC.r,d=vC.g,ad=abs(d),dep=vC.b,n2=vn(vec2(sx,d)*2.3),n3=vn(vec2(sx*.7,d*3.));
      vec3 md=mix(vec3(.14,.09,.05),vec3(.075,.05,.03),smoothstep(.3,.8,n3))*(.8+.35*vn(vec2(sx,d)*8.));
      float rut=exp(-pow((ad-.82)/.3,2.)),gr=max(1.-smoothstep(.2,.48,ad+(n2-.5)*.22),smoothstep(1.55,2.25,ad+(n2-.5)*.5));
      alb=mix(md,grassCol(wp)*.92,gr*(.7+.3*n2));spec=.22;shin=36.;
      float pud=rut*smoothstep(.15,.19,dep+(n3-.5)*.05);
      if(pud>0.){alb=mix(alb,vec3(.06,.045,.03),pud*.85);spec=mix(spec,1.,pud);shin=140.;add+=env(R)*F*pud*.75;}
      em=0.;
    }
    /* rain: porous ground goes dark, tarmac and concrete get a sheen with the sky in it */
    if(uWet>0.){float por=m==40||m==42||m==43||m==44||m==53||m==55?1.:0.,hard=m==54||m==45?1.:0.;
      alb*=1.-uWet*(.36*por+.22*hard);spec=mix(spec,.7,uWet*(.75*hard+.2*por));shin=mix(shin,110.,uWet*hard);add+=env(R)*F*uWet*(.6*hard+.1*por);}
    alb*=sh;add*=sh;
  }
#endif
  if(dirty){float k=mud(vL,h);if(k>0.){alb=mix(alb,mudCol(vL,h),k);spec*=1.-.8*k;add*=1.-.85*k;}}
  vec3 col=shade(vP,N,V,alb,spec,shin)+add+emc;
  if(em>0.&&m==0)col+=vC.rgb*em;
  float fog=1.-exp(-length(vP-uCam)*uFogD);vec3 fc=uFogCol;
#ifdef WORLD
  /* the haze is brighter looking toward the sun */
  if(uCloud.z>0.)fc+=uSunCol*pow(max(dot(normalize(vP-uCam),uSunDir),0.),6.)*.2*uCloud.z;
#endif
  col=mix(col,fc,fog);
  o=vec4(col,1.);
}`;
/* the defines the scene shader is compiled with: the game adds WORLD (the ground, the sky, instancing, mud
   measured on a moving car); the model bay leaves them out and keeps a shader made for cars */
let LIT_DEFS='';
/* material ids (used by the mesh builders) */
const MAT={COL:0,PAINT:1,GLASS:2,GLASSL:3,ACCENT:4,CHROME:5,TYRE:6,TAIL:7,HEAD:8,LED:9,AMBER:10,MESH:11,RIM:12,CLAD:13,SHUT:14,EMIT:15,METAL:16,CARBON:17,LOUVRE:18,CALIPER:19,ROTOR:20,FLOOR:21,PLATE:22,REV:23,SMOKE:24,REFL:25,FABRIC:26,RUBBER:27,HALO:29};

