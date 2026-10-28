/* ===== core: basics, bitmap fonts and the HUD pixel buffer, from Shiftlight 2 ===== */
/* =====================================================================================
   1. BASICS
   ===================================================================================== */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const sgn=v=>v<0?-1:v>0?1:0;
const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchy=matchMedia('(hover: none)').matches;
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const money=n=>'$'+fmt(Math.round(n));
const pick=a=>a[(Math.random()*a.length)|0];
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
/* sRGB hex -> linear float triple (for the GPU) */
function lin(h,k=1){const c=hexRGB(h);return [Math.pow(c[0]/255,2.2)*k,Math.pow(c[1]/255,2.2)*k,Math.pow(c[2]/255,2.2)*k];}
const c255=v=>v<0?0:v>255?255:v|0;
const pack=(r,g,b,a=255)=>(((a&255)<<24)|(c255(b)<<16)|(c255(g)<<8)|c255(r))>>>0;
const hx=(h,a=255)=>{const c=hexRGB(h);return pack(c[0],c[1],c[2],a);};
function mixC(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

const fmtT=(t,dp=2)=>{if(!(t>=0)||t>5999)return '--:--';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(dp);};
const fmtS=(t,dp=3)=>(t>=0?t.toFixed(dp):'-.---');

/* ---- tiny vector / matrix kit (column-major mat4 for GL) ---- */
const V3={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
};
const M4={
  id(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2),m=new Float32Array(16);m[0]=t/asp;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;},
  look(e,c,up){
    const z=V3.norm(V3.sub(e,c)),x=V3.norm(V3.cross(up,z)),y=V3.cross(z,x),m=new Float32Array(16);
    m[0]=x[0];m[4]=x[1];m[8]=x[2];m[1]=y[0];m[5]=y[1];m[9]=y[2];m[2]=z[0];m[6]=z[1];m[10]=z[2];
    m[12]=-V3.dot(x,e);m[13]=-V3.dot(y,e);m[14]=-V3.dot(z,e);m[15]=1;return m;
  },
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  inv(m){const a=m,o=new Float32Array(16);
    const b0=a[0]*a[5]-a[1]*a[4],b1=a[0]*a[6]-a[2]*a[4],b2=a[0]*a[7]-a[3]*a[4],b3=a[1]*a[6]-a[2]*a[5],b4=a[1]*a[7]-a[3]*a[5],b5=a[2]*a[7]-a[3]*a[6],
      b6=a[8]*a[13]-a[9]*a[12],b7=a[8]*a[14]-a[10]*a[12],b8=a[8]*a[15]-a[11]*a[12],b9=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    let d=b0*b11-b1*b10+b2*b9+b3*b8-b4*b7+b5*b6;if(!d)return M4.id();d=1/d;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b9)*d;o[1]=(a[2]*b10-a[1]*b11-a[3]*b9)*d;o[2]=(a[13]*b5-a[14]*b4+a[15]*b3)*d;o[3]=(a[10]*b4-a[9]*b5-a[11]*b3)*d;
    o[4]=(a[6]*b8-a[4]*b11-a[7]*b7)*d;o[5]=(a[0]*b11-a[2]*b8+a[3]*b7)*d;o[6]=(a[14]*b2-a[12]*b5-a[15]*b1)*d;o[7]=(a[8]*b5-a[10]*b2+a[11]*b1)*d;
    o[8]=(a[4]*b10-a[5]*b8+a[7]*b6)*d;o[9]=(a[1]*b8-a[0]*b10-a[3]*b6)*d;o[10]=(a[12]*b4-a[13]*b2+a[15]*b0)*d;o[11]=(a[9]*b2-a[8]*b4-a[11]*b0)*d;
    o[12]=(a[5]*b7-a[4]*b9-a[6]*b6)*d;o[13]=(a[0]*b9-a[1]*b7+a[2]*b6)*d;o[14]=(a[13]*b1-a[12]*b3-a[14]*b0)*d;o[15]=(a[8]*b3-a[9]*b1+a[10]*b0)*d;return o;},
  /* rigid transform from a basis: forward f, up u, right r (unit vectors) and position p. Local +X=fwd, +Y=up, +Z=right */
  basis(p,f,u,r){const m=new Float32Array(16);m[0]=f[0];m[1]=f[1];m[2]=f[2];m[4]=u[0];m[5]=u[1];m[6]=u[2];m[8]=r[0];m[9]=r[1];m[10]=r[2];m[12]=p[0];m[13]=p[1];m[14]=p[2];m[15]=1;return m;},
  xform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
};
/* yaw convention used everywhere: forward(yaw) = (cos, 0, -sin); positive yaw turns LEFT */
const fwdOf=a=>[Math.cos(a),0,-Math.sin(a)],leftOf=a=>[-Math.sin(a),0,-Math.cos(a)];

/* =====================================================================================
   2. BITMAP FONTS — 5x7 and 3x5, extended with $ % # ( ) = * arrows and a star
   ===================================================================================== */
const F5SRC=`& 01100 10010 10100 01000 10101 10010 01101|A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|! 00100 00100 00100 00100 00100 00000 00100|. 00000 00000 00000 00000 00000 01100 01100|, 00000 00000 00000 00000 01100 00100 01000|: 00000 01100 01100 00000 01100 01100 00000|- 00000 00000 00000 11111 00000 00000 00000|+ 00000 00100 00100 11111 00100 00100 00000|? 01110 10001 00001 00010 00100 00000 00100|' 00100 00100 01000 00000 00000 00000 00000|/ 00001 00001 00010 00100 01000 10000 10000|> 01000 00100 00010 00001 00010 00100 01000|< 00010 00100 01000 10000 01000 00100 00010|x 00000 00000 10001 01010 00100 01010 10001|$ 00100 01111 10100 01110 00101 11110 00100|% 11001 11010 00010 00100 01000 01011 10011|# 01010 01010 11111 01010 11111 01010 01010|( 00010 00100 01000 01000 01000 00100 00010|) 01000 00100 00010 00010 00010 00100 01000|= 00000 00000 11111 00000 11111 00000 00000|* 00000 00100 10101 01110 10101 00100 00000|^ 00100 01110 10101 00100 00100 00100 00100|~ 00100 00100 00100 00100 10101 01110 00100|[ 00010 00110 01110 11110 01110 00110 00010|] 01000 01100 01110 01111 01110 01100 01000|@ 00100 00100 11111 01110 01110 11011 10001|" 01010 01010 00000 00000 00000 00000 00000|_ 00000 00000 00000 00000 00000 00000 00000`;
const G5={};for(const ln of F5SRC.split('|')){const p=ln.trim().split(/\s+/);G5[p[0]==='_'?' ':p[0]]=p.slice(1).map(r=>parseInt(r,2));}
const F3SRC=`A 010 101 111 101 101|B 110 101 110 101 110|C 011 100 100 100 011|D 110 101 101 101 110|E 111 100 110 100 111|F 111 100 110 100 100|G 011 100 101 101 011|H 101 101 111 101 101|I 111 010 010 010 111|J 001 001 001 101 010|K 101 101 110 101 101|L 100 100 100 100 111|M 101 111 111 101 101|N 110 101 101 101 101|O 010 101 101 101 010|P 110 101 110 100 100|Q 010 101 101 110 011|R 110 101 110 101 101|S 011 100 010 001 110|T 111 010 010 010 010|U 101 101 101 101 111|V 101 101 101 101 010|W 101 101 111 111 101|X 101 101 010 101 101|Y 101 101 010 010 010|Z 111 001 010 100 111|0 111 101 101 101 111|1 010 110 010 010 111|2 111 001 111 100 111|3 111 001 011 001 111|4 101 101 111 001 001|5 111 100 111 001 111|6 111 100 111 101 111|7 111 001 001 010 010|8 111 101 111 101 111|9 111 101 111 001 111|x 000 101 010 101 000|+ 000 010 111 010 000|- 000 000 111 000 000|: 0 1 0 1 0|. 0 0 0 0 1|, 0 0 0 1 1|! 1 1 1 0 1|/ 001 001 010 100 100|' 1 1 0 0 0|> 100 010 001 010 100|< 001 010 100 010 001|? 111 001 011 000 010|( 01 10 10 10 01|) 10 01 01 01 10|% 101 001 010 100 101|# 101 111 101 111 101|$ 011 110 010 011 110|^ 010 111 010 010 010|~ 010 010 010 111 010|[ 001 011 111 011 001|] 100 110 111 110 100|= 000 111 000 111 000|* 010 111 010 101 000|@ 010 111 111 010 101|" 101 101 000 000 000`;
const G3={};for(const ln of F3SRC.split('|')){const p=ln.trim().split(/\s+/);G3[p[0]]=p.slice(1);}
function tw5(s,sc=1){return s.length*6*sc-sc;}
function tw3(s,sc=1){let w=0;for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];w+=((gg?gg[0].length:3)+1)*sc;}return Math.max(0,w-sc);}

/* =====================================================================================
   3. HUD PIXEL BUFFER — the HUD/UI layer is drawn straight into a Uint32 RGBA buffer
      (straight alpha) and uploaded as a texture; the LED pass composites it over the 3D scene.
   ===================================================================================== */
/* W x H is the logical HUD grid every layout works in. At high detail the dot matrix (and the
   buffer) is HS times finer: blocks, text and boxes cover HS x HS dots, while lines, discs, rings
   and dithers are drawn at the native dot pitch so needles and curves come out smooth. */
let W=320,H=180,HS=1,BW=320,BH=180,HB=null,HB8=null;
function hClear(){HB.fill(0);}
/* blend a packed colour (with alpha) onto buffer pixel i */
function hBlend(i,c){
  const sa=c>>>24;if(sa===255){HB[i]=c;return;}if(sa===0)return;
  const d=HB[i],da=d>>>24;
  if(da===0){HB[i]=c;return;}
  const a=sa/255,b=da/255*(1-a),oa=a+b,ia=1/oa;
  const r=((c&255)*a+(d&255)*b)*ia,g=(((c>>>8)&255)*a+((d>>>8)&255)*b)*ia,bl=(((c>>>16)&255)*a+((d>>>16)&255)*b)*ia;
  HB[i]=((Math.round(oa*255)<<24)|(bl<<16)|(g<<8)|r)>>>0;
}
/* native-dot primitives */
function nPx(X,Y,c){if(X>=0&&Y>=0&&X<BW&&Y<BH)hBlend(Y*BW+X,c);}
function nSpan(X0,X1,Y,c){if(Y<0||Y>=BH)return;X0=Math.max(0,X0);X1=Math.min(BW,X1);if(X1<=X0)return;const o=Y*BW;
  if((c>>>24)===255)HB.fill(c,o+X0,o+X1);else for(let i=o+X0;i<o+X1;i++)hBlend(i,c);}
function hPx(x,y,c){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;if(HS===1){hBlend(y*W+x,c);return;}
  const X=x*HS,Y=y*HS;for(let j=0;j<HS;j++)nSpan(X,X+HS,Y+j,c);}
function hRect(x,y,w,h,c){x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  const x0=Math.max(0,x),x1=Math.min(W,x+w),y0=Math.max(0,y),y1=Math.min(H,y+h);if(x1<=x0)return;
  for(let j=y0*HS;j<y1*HS;j++)nSpan(x0*HS,x1*HS,j,c);}
function hFrame(x,y,w,h,c){hRect(x,y,w,1,c);hRect(x,y+h-1,w,1,c);hRect(x,y+1,1,h-2,c);hRect(x+w-1,y+1,1,h-2,c);}
/* rounded frame by skipping corners (pixel-art style) */
function hBox(x,y,w,h,fill,edge){if(fill)hRect(x+1,y+1,w-2,h-2,fill);if(edge){hRect(x+1,y,w-2,1,edge);hRect(x+1,y+h-1,w-2,1,edge);hRect(x,y+1,1,h-2,edge);hRect(x+w-1,y+1,1,h-2,edge);}}
const BAY4=new Float32Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16));
/* ordered-dither fill: the signature way to show tone on a dot grid (at the native dot pitch) */
function hDither(x,y,w,h,c,lev){x=Math.round(x);y=Math.round(y);
  const X0=Math.max(0,x*HS),X1=Math.min(BW,(x+w)*HS),Y0=Math.max(0,y*HS),Y1=Math.min(BH,(y+h)*HS);
  for(let j=Y0;j<Y1;j++)for(let i=X0;i<X1;i++)if(BAY4[((j&3)<<2)|(i&3)]<lev)hBlend(j*BW+i,c);}
/* a line HS dots thick, stepped one native dot at a time along its major axis */
function hLine(x0,y0,x1,y1,c){
  if(HS===1){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)hPx(Math.round(x0+(x1-x0)*k/n),Math.round(y0+(y1-y0)*k/n),c);return;}
  const X0=(x0+.5)*HS,Y0=(y0+.5)*HS,X1=(x1+.5)*HS,Y1=(y1+.5)*HS,dx=X1-X0,dy=Y1-Y0,xm=Math.abs(dx)>=Math.abs(dy),n=Math.max(1,Math.round(Math.max(Math.abs(dx),Math.abs(dy))));
  for(let k=0;k<=n;k++){const X=X0+dx*k/n,Y=Y0+dy*k/n;
    if(xm){const xi=Math.floor(X),yi=Math.round(Y-HS/2);for(let j=0;j<HS;j++)nPx(xi,yi+j,c);}
    else{const yi=Math.floor(Y),xi=Math.round(X-HS/2);for(let j=0;j<HS;j++)nPx(xi+j,yi,c);}}
}
function hDisc(cx,cy,r,c){const R=r*HS,CX=cx*HS,CY=cy*HS;for(let Y=Math.floor(CY-R);Y<=Math.ceil(CY+R);Y++)for(let X=Math.floor(CX-R);X<=Math.ceil(CX+R);X++){const dx=X+.5-CX,dy=Y+.5-CY;if(dx*dx+dy*dy<=R*R)nPx(X,Y,c);}}
function hRing(cx,cy,r,c){if(HS===1){const n=Math.max(8,Math.round(r*7));for(let k=0;k<n;k++){const a=k/n*TAU;hPx(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),c);}return;}
  /* annulus HS dots wide centred on radius r, so each dot is visited once */
  const R=r*HS,CX=(cx+.5)*HS,CY=(cy+.5)*HS,ri=R-HS/2,ro=R+HS/2;
  for(let Y=Math.floor(CY-ro);Y<=Math.ceil(CY+ro);Y++)for(let X=Math.floor(CX-ro);X<=Math.ceil(CX+ro);X++){const dx=X+.5-CX,dy=Y+.5-CY,d=dx*dx+dy*dy;if(d>=ri*ri&&d<ro*ro)nPx(X,Y,c);}}
function txt5(s,x,y,col,sc=1,align,it=0){
  s=String(s);if(align==='c')x=Math.round(x-tw5(s,sc)/2);else if(align==='r')x=x-tw5(s,sc);
  const cols=Array.isArray(col)?col:null;let c=col;
  for(const ch of s){const gl5=G5[ch]||G5[ch.toUpperCase()]||G5[' '];
    for(let r=0;r<7;r++){if(cols)c=cols[Math.min(cols.length-1,r)];const row=gl5[r];if(!row)continue;const ox=it?Math.round((6-r)*it*sc):0;
      for(let cc=0;cc<5;cc++)if((row>>(4-cc))&1){if(sc===1)hPx(x+cc+ox,y+r,c);else hRect(x+cc*sc+ox,y+r*sc,sc,sc,c);}}
    x+=6*sc;}
}
function txt3(s,x,y,col,sc=1,align){
  s=String(s);if(align==='c')x=Math.round(x-tw3(s,sc)/2);else if(align==='r')x=x-tw3(s,sc);
  for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}
    for(let r=0;r<5;r++){const row=gg[r];for(let c=0;c<row.length;c++)if(row.charCodeAt(c)===49){if(sc===1)hPx(x+c,y+r,col);else hRect(x+c*sc,y+r*sc,sc,sc,col);}}
    x+=(gg[0].length+1)*sc;}
}
const O8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const OUT=pack(0,0,0,235);
function otxt5(s,x,y,col,sc=1,align,it=0,ol=OUT){const o=Math.max(1,sc>>1);for(const [a,b] of O8)txt5(s,x+a*o,y+b*o,ol,sc,align,it);txt5(s,x,y,col,sc,align,it);}
function otxt3(s,x,y,col,sc=1,align,ol=OUT){for(const [a,b] of O8)txt3(s,x+a*sc,y+b*sc,ol,sc,align);txt3(s,x,y,col,sc,align);}
/* gradients for 5x7 text (one colour per glyph row) */
const GRH={
  volt:['#ffffff','#fff7cc','#ffe46a','#ffc21a','#ff9a10','#e2600a','#902c06'],
  cyan:['#ffffff','#e6fbff','#a6f3ff','#4fe0ff','#22b4ff','#2a70ff','#3a36c8'],
  red:['#ffffff','#ffe0e6','#ff9aab','#ff4a62','#ff1a3a','#c80d2a','#7a0618'],
  steel:['#ffffff','#eef1f8','#cfd6e6','#a2adc6','#76829e','#4e5876','#2c3250'],
  pink:['#ffffff','#ffe2f2','#ffa6d6','#ff5ab4','#ff2f9a','#c81476','#760a46'],
  green:['#ffffff','#eaffe6','#b4ffaa','#6aff5a','#2ee04a','#1a9c3a','#0e5a26'],
  violet:['#ffffff','#f0e6ff','#d0b4ff','#a878ff','#8048ff','#5a2ad8','#34168a'],
  gold:['#ffffff','#fff3c4','#ffe08a','#ffc845','#e8a020','#b06a10','#6a3a06']
};
const GR={};for(const k in GRH)GR[k]=GRH[k].map(h=>hx(h));
/* palette for UI (packed) */
const PAL={
  white:hx('#ffffff'),ink:hx('#e8e4f2'),dim:hx('#8a84a0'),faint:hx('#4a4560'),dark:hx('#16121f'),
  red:hx('#ff3d5a'),hot:hx('#ff6a3d'),amber:hx('#ffb040'),gold:hx('#ffd84a'),green:hx('#5dff7a'),lime:hx('#b8ff4a'),
  cyan:hx('#4fe3ff'),blue:hx('#3a7bff'),violet:hx('#a878ff'),pink:hx('#ff5ab4'),
  panel:pack(10,8,16,226),panel2:pack(22,18,34,235),edge:pack(255,255,255,46),shade:pack(0,0,0,150)
};
/* 7-segment LED digits for the speedometer — unlit segments show faintly like a real display */
const SEG={'0':0x3f,'1':0x06,'2':0x5b,'3':0x4f,'4':0x66,'5':0x6d,'6':0x7d,'7':0x07,'8':0x7f,'9':0x6f,'-':0x40,' ':0,'N':0x37,'R':0x50,'P':0x73,'E':0x79,'L':0x38,'A':0x77,'C':0x39,'H':0x76,'O':0x3f,'U':0x3e,'b':0x7c,'d':0x5e,'r':0x50,'n':0x54,'t':0x78};
function seg7(s,x,y,h,col,dim,th){
  s=String(s);const w=Math.max(3,Math.round(h*.52)),t=th||Math.max(1,Math.round(h/7)),hh=Math.round(h/2);
  for(const ch of s){
    if(ch==='.'){hRect(x,y+h-t,t,t,col);x+=t+2;continue;}
    const m=SEG[ch]===undefined?0:SEG[ch];
    const segs=[[x+t,y,w-2*t,t],[x+w-t,y+t,t,hh-t],[x+w-t,y+hh+1,t,h-hh-t-1],[x+t,y+h-t,w-2*t,t],[x,y+hh+1,t,h-hh-t-1],[x,y+t,t,hh-t],[x+t,y+hh-((t/2)|0),w-2*t,t]];
    for(let k=0;k<7;k++){const on=(m>>k)&1;if(on)hRect(...segs[k],col);else if(dim)hRect(...segs[k],dim);}
    x+=w+Math.max(2,t+1);
  }
}
const seg7w=(s,h,th)=>{const w=Math.max(3,Math.round(h*.52)),t=th||Math.max(1,Math.round(h/7));let x=0;for(const ch of String(s))x+=ch==='.'?t+2:w+Math.max(2,t+1);return x-Math.max(2,t+1);};

