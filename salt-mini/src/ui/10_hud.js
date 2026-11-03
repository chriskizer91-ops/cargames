/* =====================================================================================
   THE GAME'S HUD, from Road Not Found + Traffic's 10_core.js (sections 2 and 3 and the smooth text, copied as they
   are): the bitmap fonts, the HUD's dot buffer and its drawing, and the words in the UI's typefaces on their own
   canvas. With the few basics from section 1 the copied car code doesn't already bring (00_prelude).
   ===================================================================================== */
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const touchy=matchMedia('(hover: none)').matches;
const NF=new Intl.NumberFormat('en-US'),fmt=n=>NF.format(Math.floor(n));
/* where the HUD's 16:9 grid sits on the screen, in CSS pixels (61_hud's layout) */
let RECT={x:0,y:0,w:100,h:56};
/* =====================================================================================
   2. BITMAP FONTS — 5x7 and 3x5, extended with $ % # ( ) = * arrows and a star
   ===================================================================================== */
const F5SRC=`& 01100 10010 10100 01000 10101 10010 01101|A 01110 10001 10001 11111 10001 10001 10001|B 11110 10001 10001 11110 10001 10001 11110|C 01110 10001 10000 10000 10000 10001 01110|D 11110 10001 10001 10001 10001 10001 11110|E 11111 10000 10000 11110 10000 10000 11111|F 11111 10000 10000 11110 10000 10000 10000|G 01110 10001 10000 10111 10001 10001 01111|H 10001 10001 10001 11111 10001 10001 10001|I 01110 00100 00100 00100 00100 00100 01110|J 00111 00010 00010 00010 00010 10010 01100|K 10001 10010 10100 11000 10100 10010 10001|L 10000 10000 10000 10000 10000 10000 11111|M 10001 11011 10101 10101 10001 10001 10001|N 10001 10001 11001 10101 10011 10001 10001|O 01110 10001 10001 10001 10001 10001 01110|P 11110 10001 10001 11110 10000 10000 10000|Q 01110 10001 10001 10001 10101 10010 01101|R 11110 10001 10001 11110 10100 10010 10001|S 01111 10000 10000 01110 00001 00001 11110|T 11111 00100 00100 00100 00100 00100 00100|U 10001 10001 10001 10001 10001 10001 01110|V 10001 10001 10001 10001 10001 01010 00100|W 10001 10001 10001 10101 10101 10101 01010|X 10001 10001 01010 00100 01010 10001 10001|Y 10001 10001 01010 00100 00100 00100 00100|Z 11111 00001 00010 00100 01000 10000 11111|0 01110 10001 10011 10101 11001 10001 01110|1 00100 01100 00100 00100 00100 00100 01110|2 01110 10001 00001 00010 00100 01000 11111|3 11111 00010 00100 00010 00001 10001 01110|4 00010 00110 01010 10010 11111 00010 00010|5 11111 10000 11110 00001 00001 10001 01110|6 00110 01000 10000 11110 10001 10001 01110|7 11111 00001 00010 00100 01000 01000 01000|8 01110 10001 10001 01110 10001 10001 01110|9 01110 10001 10001 01111 00001 00010 01100|! 00100 00100 00100 00100 00100 00000 00100|. 00000 00000 00000 00000 00000 01100 01100|, 00000 00000 00000 00000 01100 00100 01000|: 00000 01100 01100 00000 01100 01100 00000|- 00000 00000 00000 11111 00000 00000 00000|+ 00000 00100 00100 11111 00100 00100 00000|? 01110 10001 00001 00010 00100 00000 00100|' 00100 00100 01000 00000 00000 00000 00000|/ 00001 00001 00010 00100 01000 10000 10000|> 01000 00100 00010 00001 00010 00100 01000|< 00010 00100 01000 10000 01000 00100 00010|x 00000 00000 10001 01010 00100 01010 10001|$ 00100 01111 10100 01110 00101 11110 00100|% 11001 11010 00010 00100 01000 01011 10011|# 01010 01010 11111 01010 11111 01010 01010|( 00010 00100 01000 01000 01000 00100 00010|) 01000 00100 00010 00010 00010 00100 01000|= 00000 00000 11111 00000 11111 00000 00000|* 00000 00100 10101 01110 10101 00100 00000|^ 00100 01110 10101 00100 00100 00100 00100|~ 00100 00100 00100 00100 10101 01110 00100|[ 00010 00110 01110 11110 01110 00110 00010|] 01000 01100 01110 01111 01110 01100 01000|@ 00100 00100 11111 01110 01110 11011 10001|" 01010 01010 00000 00000 00000 00000 00000|_ 00000 00000 00000 00000 00000 00000 00000`;
const G5={};for(const ln of F5SRC.split('|')){const p=ln.trim().split(/\s+/);G5[p[0]==='_'?' ':p[0]]=p.slice(1).map(r=>parseInt(r,2));}
const F3SRC=`A 010 101 111 101 101|B 110 101 110 101 110|C 011 100 100 100 011|D 110 101 101 101 110|E 111 100 110 100 111|F 111 100 110 100 100|G 011 100 101 101 011|H 101 101 111 101 101|I 111 010 010 010 111|J 001 001 001 101 010|K 101 101 110 101 101|L 100 100 100 100 111|M 101 111 111 101 101|N 110 101 101 101 101|O 010 101 101 101 010|P 110 101 110 100 100|Q 010 101 101 110 011|R 110 101 110 101 101|S 011 100 010 001 110|T 111 010 010 010 010|U 101 101 101 101 111|V 101 101 101 101 010|W 101 101 111 111 101|X 101 101 010 101 101|Y 101 101 010 010 010|Z 111 001 010 100 111|0 111 101 101 101 111|1 010 110 010 010 111|2 111 001 111 100 111|3 111 001 011 001 111|4 101 101 111 001 001|5 111 100 111 001 111|6 111 100 111 101 111|7 111 001 001 010 010|8 111 101 111 101 111|9 111 101 111 001 111|x 000 101 010 101 000|+ 000 010 111 010 000|- 000 000 111 000 000|: 0 1 0 1 0|. 0 0 0 0 1|, 0 0 0 1 1|! 1 1 1 0 1|/ 001 001 010 100 100|' 1 1 0 0 0|> 100 010 001 010 100|< 001 010 100 010 001|? 111 001 011 000 010|( 01 10 10 10 01|) 10 01 01 01 10|% 101 001 010 100 101|# 101 111 101 111 101|$ 011 110 010 011 110|^ 010 111 010 010 010|~ 010 010 010 111 010|[ 001 011 111 011 001|] 100 110 111 110 100|= 000 111 000 111 000|* 010 111 010 101 000|@ 010 111 111 010 101|" 101 101 000 000 000`;
const G3={};for(const ln of F3SRC.split('|')){const p=ln.trim().split(/\s+/);G3[p[0]]=p.slice(1);}
function dtw5(s,sc=1){return s.length*6*sc-sc;}
function dtw3(s,sc=1){let w=0;for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];w+=((gg?gg[0].length:3)+1)*sc;}return Math.max(0,w-sc);}

/* =====================================================================================
   3. HUD PIXEL BUFFER — the HUD/UI layer is drawn straight into a Uint32 RGBA buffer
      (straight alpha) and uploaded as a texture; the LED pass composites it over the 3D scene.
   ===================================================================================== */
/* W x H is the logical HUD grid every layout works in. At high detail the dot matrix (and the
   buffer) is HS times finer: blocks, text and boxes cover HS x HS dots, while lines, discs, rings
   and dithers are drawn at the native dot pitch so needles and curves come out smooth. */
let W=320,H=180,HS=1,BW=320,BH=180,HB=null,HB8=null;
function hClear(){HB.fill(0);txtBegin();}
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
function dtxt5(s,x,y,col,sc=1,align,it=0){
  s=String(s);if(align==='c')x=Math.round(x-dtw5(s,sc)/2);else if(align==='r')x=x-dtw5(s,sc);
  const cols=Array.isArray(col)?col:null;let c=col;
  for(const ch of s){const gl5=G5[ch]||G5[ch.toUpperCase()]||G5[' '];
    for(let r=0;r<7;r++){if(cols)c=cols[Math.min(cols.length-1,r)];const row=gl5[r];if(!row)continue;const ox=it?Math.round((6-r)*it*sc):0;
      for(let cc=0;cc<5;cc++)if((row>>(4-cc))&1){if(sc===1)hPx(x+cc+ox,y+r,c);else hRect(x+cc*sc+ox,y+r*sc,sc,sc,c);}}
    x+=6*sc;}
}
function dtxt3(s,x,y,col,sc=1,align){
  s=String(s);if(align==='c')x=Math.round(x-dtw3(s,sc)/2);else if(align==='r')x=x-dtw3(s,sc);
  for(const ch of s){const gg=G3[ch]||G3[ch.toUpperCase()];if(!gg){x+=4*sc;continue;}
    for(let r=0;r<5;r++){const row=gg[r];for(let c=0;c<row.length;c++)if(row.charCodeAt(c)===49){if(sc===1)hPx(x+c,y+r,col);else hRect(x+c*sc,y+r*sc,sc,sc,col);}}
    x+=(gg[0].length+1)*sc;}
}
const O8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const OUT=pack(0,0,0,235);
function otxt5(s,x,y,col,sc=1,align,it=0,ol=OUT){if(TXT.on)return tq(0,s,x,y,col,sc,align,it,ol);const o=Math.max(1,sc>>1);for(const [a,b] of O8)dtxt5(s,x+a*o,y+b*o,ol,sc,align,it);dtxt5(s,x,y,col,sc,align,it);}
function otxt3(s,x,y,col,sc=1,align,ol=OUT){if(TXT.on)return tq(1,s,x,y,col,sc,align,0,ol);for(const [a,b] of O8)dtxt3(s,x+a*sc,y+b*sc,ol,sc,align);dtxt3(s,x,y,col,sc,align);}
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
function dseg7(s,x,y,h,col,dim,th){
  s=String(s);const w=Math.max(3,Math.round(h*.52)),t=th||Math.max(1,Math.round(h/7)),hh=Math.round(h/2);
  for(const ch of s){
    if(ch==='.'){hRect(x,y+h-t,t,t,col);x+=t+2;continue;}
    const m=SEG[ch]===undefined?0:SEG[ch];
    const segs=[[x+t,y,w-2*t,t],[x+w-t,y+t,t,hh-t],[x+w-t,y+hh+1,t,h-hh-t-1],[x+t,y+h-t,w-2*t,t],[x,y+hh+1,t,h-hh-t-1],[x,y+t,t,hh-t],[x+t,y+hh-((t/2)|0),w-2*t,t]];
    for(let k=0;k<7;k++){const on=(m>>k)&1;if(on)hRect(...segs[k],col);else if(dim)hRect(...segs[k],dim);}
    x+=w+Math.max(2,t+1);
  }
}
const dseg7w=(s,h,th)=>{const w=Math.max(3,Math.round(h*.52)),t=th||Math.max(1,Math.round(h/7));let x=0;for(const ch of String(s))x+=ch==='.'?t+2:w+Math.max(2,t+1);return x-Math.max(2,t+1);};

/* =====================================================================================
   SMOOTH TEXT. The HUD's words, numbers and labels are drawn crisp in the UI's typefaces (Chakra Petch for
   words, Saira Condensed for numbers, both built into the page) on their own canvas over the picture, at the
   screen's full sharpness, instead of in dots. Every layout still works in the HUD's grid: a call queues its
   words where the dot font would have put them (same top, same left, centre or right), the widths come from
   the real font so what is laid out beside them still lines up, and the canvas is redrawn only when the
   words change. The dot font stays (dtxt5 and the rest) for the dev panel's "Dot text" switch.
   ===================================================================================== */
const TXT={on:store.get('sm-dottext','0')!=='1',q:[],prev:[],paintT:0,lx:0,ly:0,lw:0,lW:0,keys:[],last:'',cv:null,cx:null,w:0,h:0,mw:new Map(),cap:{},css:new Map(),ready:false};
const TXT_F=[['600','"Chakra Petch"'],['600','"Saira Condensed"'],['600','"Saira Condensed"'],['600','"Saira Condensed"'],['700','"Chakra Petch"']];
/* kind 0 = the 5x7 font, 1 = the 3x5 labels, 2 = the 7-segment digits */
const tNum=s=>/^[\s\d.,:+\-%$x×\/]*$/i.test(s)&&/\d/.test(s);
function tFace(kind,s,sc){return kind===2||tNum(s)?(kind===1?2:3):kind===0&&sc>=2?4:kind;}
function tCtx(){if(!TXT.cx){TXT.cv=$('txt');TXT.cx=TXT.cv&&TXT.cv.getContext('2d');}return TXT.cx;}
/* the grid's cell on screen, in CSS pixels, and a word's size in grid units (a floor keeps the small labels
   readable on a phone; the widths follow it) */
function tCell(){return Math.max(.01,(typeof RECT!=='undefined'?RECT.w:W)/W);}
function tSize(kind,face,sc){const capH=kind===2?sc:(kind===0?7:5)*sc,c=TXT.cap[face]||.7,cell=tCell();
  const px=Math.max(capH/c*cell,kind===1?8.5:kind===0?10:0);return px/cell;}
function tFont(face,sizeGrid,cell){const f=TXT_F[face];return `${f[0]} ${(sizeGrid*cell).toFixed(2)}px ${f[1]}`;}
function tTrack(kind){return kind===1?.05:0;}
function tNat(kind,s,sc){s=String(s);const face=tFace(kind,s,sc),sz=tSize(kind,face,sc),k=face+'|'+kind+'|'+s;let m=TXT.mw.get(k);
  if(m===undefined){const x=tCtx();if(!x)return s.length*6*sc;x.font=tFont(face,100,1);x.letterSpacing='0px';m=x.measureText(s).width/100+tTrack(kind)*s.length;if(TXT.mw.size>4000)TXT.mw.clear();TXT.mw.set(k,m);}
  return m*sz;}
/* the words take no more room than the dot font's (a few per cent at most): the layouts were made for those
   widths, so a word that would run wider is drawn a little narrower instead */
function tWidth(kind,s,sc){const n=tNat(kind,s,sc);if(kind===2)return Math.ceil(n);const d=(kind===0?dtw5(String(s),sc):dtw3(String(s),sc))*1.04+1;return Math.ceil(Math.min(n,d));}
function tw5(s,sc=1){return TXT.on?tWidth(0,s,sc):dtw5(s,sc);}
function tw3(s,sc=1){return TXT.on?tWidth(1,s,sc):dtw3(s,sc);}
const seg7w=(s,h,th)=>dseg7w(s,h,th);
function txt5(s,x,y,col,sc=1,align,it=0){if(TXT.on)return tq(0,s,x,y,col,sc,align,it,0);dtxt5(s,x,y,col,sc,align,it);}
function txt3(s,x,y,col,sc=1,align){if(TXT.on)return tq(1,s,x,y,col,sc,align,0,0);dtxt3(s,x,y,col,sc,align);}
function seg7(s,x,y,h,col,dim,th){if(TXT.on)return tq(2,String(s).trim(),x+dseg7w(s,h,th),y,col,h,'r',0,0);dseg7(s,x,y,h,col,dim,th);}
/* queue: [kind, text, x, y, colour (or a colour per glyph row), scale, align, slant, outline] */
function tq(kind,s,x,y,col,sc,align,it,ol){s=String(s);if(!s.trim())return;TXT.q.push([kind,s,x,y,col,sc,align||'l',it||0,ol||0]);}
function tCss(c){let v=TXT.css.get(c);if(v===undefined){if(TXT.css.size>2000)TXT.css.clear();v=`rgba(${c&255},${(c>>>8)&255},${(c>>>16)&255},${((c>>>24)/255).toFixed(3)})`;TXT.css.set(c,v);}return v;}
function txtBegin(){TXT.q.length=0;}
/* draw the queue on the text canvas (from hudUpload, once a frame); nothing to do if the words haven't changed */
function txtFlush(){
  const x=tCtx();if(!x)return;
  if(!TXT.on){if(TXT.last!==''){x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,TXT.cv.width,TXT.cv.height);TXT.last='';}return;}
  /* (at the screen's own sharpness, whatever the picture is drawn at: the renderer draws at fewer device pixels than a
     phone has, and TAA and the scale make that up; words must not be) */
  const TD=Math.min(window.devicePixelRatio||1,touchy?3:2.5),TW=Math.max(2,Math.round(innerWidth*TD)),TH=Math.max(2,Math.round(innerHeight*TD));
  if(TXT.w!==TW||TXT.h!==TH){TXT.cv.width=TXT.w=TW;TXT.cv.height=TXT.h=TH;TXT.last='#';}
  /* the layer is repainted whole, so: compared item by item with what was painted (no key string built every
     frame), painted at once when the layout changes or an item comes or goes (a message), and at most every 80 ms
     when only a value moved (the speed, a clock, a fade), so live numbers cost at most a dozen repaints a second */
  const Q=TXT.q;if(Q.length>1500)Q.length=0;const P=TXT.prev,lay=TXT.last!=='#'&&TXT.lx===RECT.x&&TXT.ly===RECT.y&&TXT.lw===RECT.w&&TXT.lW===W;
  if(lay&&P.length===Q.length){let same=true;for(let i=0;i<Q.length&&same;i++){const a=Q[i],b=P[i];for(let k=0;k<9;k++)if(a[k]!==b[k]){same=false;break;}}
    if(same||performance.now()-TXT.paintT<80)return;}
  TXT.last='p';TXT.lx=RECT.x;TXT.ly=RECT.y;TXT.lw=RECT.w;TXT.lW=W;TXT.prev=Q.slice();TXT.paintT=performance.now();
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,TW,TH);
  const cell=tCell(),k=cell*TD,ox=RECT.x*TD,oy=RECT.y*TD;
  x.textBaseline='alphabetic';x.lineJoin='round';
  for(const [kind,s,gx,gy,col,sc,align,it,ol] of Q){
    const face=tFace(kind,s,sc),sz=tSize(kind,face,sc),w=tWidth(kind,s,sc),nat=tNat(kind,s,sc),sx=nat>w?w/nat:1,capH=kind===2?sc:(kind===0?7:5)*sc;
    let lx=gx;if(align==='c')lx=gx-w/2;else if(align==='r')lx=gx-w;
    const px=ox+lx*k,base=oy+(gy+capH)*k,top=oy+gy*k;
    x.font=tFont(face,sz,k);x.letterSpacing=(tTrack(kind)*sz*k).toFixed(2)+'px';
    x.save();x.translate(px,base);if(sx<1)x.scale(sx,1);if(it)x.transform(1,0,-it,1,0,0);
    if(ol){x.strokeStyle=tCss(((ol&0xffffff)|(Math.round((ol>>>24)*.72)<<24))>>>0);x.lineWidth=Math.max(1.5,sz*k*.13);x.strokeText(s,0,0);}
    if(Array.isArray(col)){const g=x.createLinearGradient(0,top-base,0,0);for(let i=0;i<col.length;i++)g.addColorStop(i/Math.max(1,col.length-1),tCss(col[i]));x.fillStyle=g;}
    else x.fillStyle=tCss(col);
    x.fillText(s,0,0);x.restore();
  }
}
/* the typefaces are in the page; once they're ready, measure their capitals and draw again */
function txtFonts(){
  if(!document.fonts||!document.fonts.load){TXT.ready=true;return;}
  Promise.all(TXT_F.map(f=>document.fonts.load(`${f[0]} 20px ${f[1]}`))).then(()=>{
    const x=tCtx();if(x)TXT_F.forEach((f,i)=>{x.font=`${f[0]} 100px ${f[1]}`;const m=x.measureText(i>=2&&i<=3?'0123456789':'HXE');TXT.cap[i]=clamp(m.actualBoundingBoxAscent/100,.5,.9);});
    TXT.mw.clear();TXT.last='#';TXT.ready=true;}).catch(()=>{TXT.ready=true;});
}
function setDotText(on){TXT.on=!on;store.set('sm-dottext',on?'1':'0');TXT.mw.clear();TXT.last='#';if(!TXT.on)txtFlush();}
