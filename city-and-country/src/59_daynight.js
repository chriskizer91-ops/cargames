/* =====================================================================================
   THE NIGHT. City & Country has one, City Limits': a clear night under a full moon, bright enough to see the
   country and the salt in silver-blue away from the lights. The moon is the "sun" of the lighting (its
   cascades cast the moon shadows), cool and much brighter than Back Forty's night, with thinner fog.
   The town's street lights, signs and shopfronts (and the farms' yard lights) go into a grid of 8 m cells on
   the ground round the car, each cell with a list of the lights that reach it (City Limits' cluster grid),
   so the scene shader lights a pixel with the few that reach it out of hundreds. The headlights are the
   shader's own two lamps.
   ===================================================================================== */
const TOD={
  night:{name:'Full moon',sun:V3.norm([-.42,.7,.3]),sunCol:[.46,.55,.76],sky:[.04,.052,.088],gnd:[.012,.012,.015],zen:[.0016,.0032,.0095],hor:[.008,.0115,.023],
    fogD:.0017,fogK:[1.1,1.05,1],draw:520,night:1,expo:[.08,1,1.8],haze:1}
};
function applyTod(id){const T=TOD[id]||TOD.night;Object.assign(SKY,{sun:T.sun,sunCol:T.sunCol,sky:T.sky,gnd:T.gnd,zen:T.zen,hor:T.hor,fogD:T.fogD,fogK:T.fogK,draw:T.draw,night:T.night,expo:T.expo,haze:T.haze});
  if(typeof CSM!=='undefined')CSM.fresh=true;}
/* the shader's own lamps: the car's headlights */
const LP=new Float32Array(32),LC=new Float32Array(32),LD=new Float32Array(32),LN={n:0};

/* ---------- the light grid ----------
   The town's lights never change, so the grid is made once, over the town and the highway's lit stretch
   (1.6 km square, 8 m cells): each light's position (from the grid's corner), reach, colour and spot; each
   cell's start and count in one list, the brightest few first if more than the cap reach it */
const LG={tex:null,grid:null,list:null,on:false,built:false,x0:-800,z0:-800,gw:200,n:0,entries:0,maxN:0,ms:0,CELL:8,MAXPER:24};
function lgTex(t,w,h,ifmt,fmt,type,data){gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,data);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);}
function lgInit(){
  if(LG.tex)return;LG.tex=gl.createTexture();LG.grid=gl.createTexture();LG.list=gl.createTexture();
  lgTex(LG.tex,1,1,gl.RGBA32F,gl.RGBA,gl.FLOAT,new Float32Array(4));lgTex(LG.grid,1,1,gl.RG32UI,gl.RG_INTEGER,gl.UNSIGNED_INT,new Uint32Array(2));lgTex(LG.list,1,1,gl.R32UI,gl.RED_INTEGER,gl.UNSIGNED_INT,new Uint32Array(1));
}
function lgBuild(){
  LG.built=true;const t0=performance.now(),C=LG.CELL,gw=LG.gw,x0=LG.x0,z0=LG.z0,L=WG.townLights(),n=L.length;
  const rows=Math.max(1,Math.ceil(n*3/1024)),rec=new Float32Array(1024*rows*4),cells=new Array(gw*gw);
  L.forEach((f,i)=>{const o=i*12,I=f.c[0]+f.c[1]+f.c[2];
    rec[o]=f.p[0]-x0;rec[o+1]=f.p[1];rec[o+2]=f.p[2]-z0;rec[o+3]=f.r;rec[o+4]=f.c[0];rec[o+5]=f.c[1];rec[o+6]=f.c[2];
    if(f.d){rec[o+8]=f.d[0];rec[o+9]=f.d[1];rec[o+10]=f.d[2];rec[o+11]=f.cs;}else{rec[o+9]=-1;rec[o+11]=-2;}
    const r=f.r,i0=Math.max(0,Math.floor((f.p[0]-r-x0)/C)),i1=Math.min(gw-1,Math.floor((f.p[0]+r-x0)/C)),j0=Math.max(0,Math.floor((f.p[2]-r-z0)/C)),j1=Math.min(gw-1,Math.floor((f.p[2]+r-z0)/C));
    for(let j=j0;j<=j1;j++)for(let k=i0;k<=i1;k++){const cx=x0+(k+.5)*C,cz=z0+(j+.5)*C,dx=Math.max(0,Math.abs(cx-f.p[0])-C/2),dz=Math.max(0,Math.abs(cz-f.p[2])-C/2),d2=dx*dx+dz*dz;
      if(d2>r*r)continue;const ci=j*gw+k;(cells[ci]||(cells[ci]=[])).push(i,I/(d2+4));}});
  let total=0,maxN=0;const MP=LG.MAXPER;
  for(let c=0;c<cells.length;c++){const a=cells[c];if(!a)continue;let m=a.length/2;
    if(m>MP){const idx=[];for(let q=0;q<m;q++)idx.push(q);idx.sort((p,q)=>a[q*2+1]-a[p*2+1]);const b=[];for(let q=0;q<MP;q++)b.push(a[idx[q]*2],0);cells[c]=b;m=MP;}
    total+=m;if(m>maxN)maxN=m;}
  const lrows=Math.max(1,Math.ceil(total/1024)),list=new Uint32Array(1024*lrows),grid=new Uint32Array(gw*gw*2);let o=0;
  for(let c=0;c<cells.length;c++){const a=cells[c];grid[c*2]=o;if(!a)continue;const m=a.length/2;grid[c*2+1]=m;for(let q=0;q<m;q++)list[o++]=a[q*2];}
  lgInit();lgTex(LG.tex,1024,rows,gl.RGBA32F,gl.RGBA,gl.FLOAT,rec);lgTex(LG.grid,gw,gw,gl.RG32UI,gl.RG_INTEGER,gl.UNSIGNED_INT,grid);lgTex(LG.list,1024,lrows,gl.R32UI,gl.RED_INTEGER,gl.UNSIGNED_INT,list);
  gl.activeTexture(gl.TEXTURE0);
  Object.assign(LG,{n,entries:total,maxN,on:n>0,ms:performance.now()-t0});
}
/* every lit program's samplers point at units 5, 6 and 7, and those hold the grid (or a 1 x 1 stand-in) */
function lgBind(P){
  lgInit();const u=P.u;if(!u.uLTex)return;
  gl.useProgram(P.p);gl.uniform1i(u.uLTex,5);gl.uniform1i(u.uLGrid,6);gl.uniform1i(u.uLList,7);
  gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,LG.tex);gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,LG.grid);
  gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,LG.list);gl.activeTexture(gl.TEXTURE0);
  gl.uniform4f(u.uLG,LG.x0-RO[0],LG.z0-RO[2],1/LG.CELL,LG.gw);gl.uniform1f(u.uLGOn,LG.on&&SKY.night&&!DEVW.off.lgrid?1:0);
}
/* the lights for this frame: the car's headlights, the grid, and the farms' yard lights nearest the car */
function skyLights(t){
  const u=CUR.u;let n=0;
  if(SKY.night&&APP.lights&&t){
    const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],R=[M[2],M[5],M[8]],lift=liftOf(t),dir=V3.norm([F[0]-U[0]*.06,F[1]-U[1]*.06,F[2]-U[2]*.06]);
    const Mc=t.c.machine&&MACH[t.c.machine];
    for(const s of [-1,1]){const x=D.L/2-.15-t.cg[0],y=(Mc?Mc.lampY:.78)+lift-t.cg[1],z=s*(Mc?Math.min(.62,Mc.W*.3):.62),w=[t.p[0]+F[0]*x+U[0]*y+R[0]*z,t.p[1]+F[1]*x+U[1]*y+R[1]*z,t.p[2]+F[2]*x+U[2]*y+R[2]*z];
      LP.set([w[0]-RO[0],w[1]-RO[1],w[2]-RO[2],80],n*4);LC.set([6.5,6.1,5.3,1],n*4);LD.set([dir[0],dir[1],dir[2],Math.cos(.5)],n*4);n++;}}
  /* an underglow throws its colour on the road under the car */
  if(SKY.night&&t&&t.build.underglow&&t.build.glow){const g=t.build.glow;LP.set([t.p[0]-RO[0],t.p[1]-RO[1]-.2,t.p[2]-RO[2],7],n*4);LC.set([g[0]*5,g[1]*5,g[2]*5,0],n*4);LD.set([0,-1,0,-2],n*4);n++;}
  if(SKY.night){
    const p=t?t.p:CAM.last.eye,F=worldLights(p,200).map(f=>({f,d:Math.hypot(f.p[0]-p[0],f.p[2]-p[2])-f.r})).filter(q=>q.d<160).sort((a,b)=>a.d-b.d);
    for(const {f} of F){if(n>=8)break;LP.set([f.p[0]-RO[0],f.p[1]-RO[1],f.p[2]-RO[2],f.r],n*4);LC.set([f.c[0],f.c[1],f.c[2],0],n*4);LD.set(f.d?[f.d[0],f.d[1],f.d[2],f.cs]:[0,-1,0,-2],n*4);n++;}}
  if(!LG.built)lgBuild();
  gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform4fv(u.uLD,LD);gl.uniform1i(u.uNL,n);LN.n=n;gl.uniform1f(u.uNight,SKY.night||0);
  lgBind(CUR);
}
