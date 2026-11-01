/* =====================================================================================
   DAY AND THE NIGHT, in the renderer's own units (a clear noon sky near 1.5, the sun near 6; the auto exposure brings
   each to the screen). High noon is the county as Back Forty lit it. The night is City Limits': a clear night under a
   full moon, bright enough to see the country and the salt in silver-blue away from the lights; the moon is the
   "sun" of the lighting (its cascades cast the moon shadows), cool, with the stars out.
   The town's lights (the street lamps, the boulevard's twin lamps, neon, the signs and shopfronts, the gas station,
   the diner, the garage) and the off-road park's towers and poles are real lights in the renderer's clustered grid
   (8 m cells over the town, the highway's lit stretch and the park), in the frame the renderer draws in: relative to
   the floating origin (51_world), so when the origin steps the grid's corner and its lights step with it (whole
   cells: nothing is sorted again). The farms' yard lights come and go with their chunks: the nearest few are the
   frame's own lamps, with the headlights (their low-beam cut-off and shadow map), the tail lights and the
   underglow. These games' lamps were about 1/160 of the renderer's (Rut Access scaled them so); here they are
   scaled by LK, less, because the renderer's lamps fall off as the square of the distance where these games' fell
   off more gently: at the 6 m a street lamp mostly lights, LK 100 kept Wide Open's balance of lamp to moon (whose
   light, like the sun's, is these games' times about five); 130, with the moon a third brighter than that and the
   night's exposure a tenth higher, puts the moonlit roads and the lamp-lit streets where Wide Open's own frames have
   them, a little brighter, for a phone held up bright (the Dev look's Moonlight, Lamps and Glow move each).
   ===================================================================================== */
/* (grade: saturation and contrast. The renderer grades in linear light, after the tone map, so any contrast above 1
   sends the darks to black: at 1.06 everything under about a fifth of mid grey goes, the shade under a car, a dark
   paint, a road at night. Wide Open graded after the gamma; here the contrast is left at 1, the Dev look can add it) */
const TOD={
  day:{name:'High noon',sun:V3.norm([-.52,.5,.4]),sunCol:[6.2,5.8,5.2],sunSize:.0095,ambUp:[.58,.64,.76],ambDn:[.3,.22,.14],skyZen:[.18,.36,.95],skyHor:[.75,.88,1.1],
    fogCol:[.6,.7,.88],fogDen:.0011,fogFall:.02,fogAmb:[.44,.5,.58],cloud:.25,stars:0,night:0,key:.23,expoRange:[.02,3],bloom:.035,grade:[1.3,1],lightsOn:0,draw:0,beam:30},
  night:{name:'Full moon',sun:V3.norm([-.42,.7,.3]),sunCol:[2.86,3.46,4.78],sunSize:.012,ambUp:[.073,.095,.156],ambDn:[.017,.017,.021],skyZen:[.0024,.0048,.014],skyHor:[.012,.017,.034],
    fogCol:[.03,.04,.07],fogDen:.0017,fogFall:.03,fogAmb:[.012,.015,.026],cloud:.1,stars:1,night:1,key:.22,expoRange:[.25,30],bloom:.06,grade:[1.1,1],lightsOn:1,draw:520,beam:2.2}
};
/* the time of day: the light the frame is lit with (55_gfx's envNow adds the weather); the probe starts over */
function applyTod(id){const T=TOD[id]||TOD.day;Object.assign(SKY,T);if(typeof R!=='undefined'&&R)R.probeFilled=0;}
/* the flicker slots the lamps can follow (none yet: every lamp steady) */
const FLICK=[1,1];

/* ---------- the light grid ----------
   The town's and the park's lights never change, so the grid is made once (3.8 by 2.4 km, 8 m cells, the
   brightest few in a cell if more than MAXPER reach it), in the renderer's own layout (a square of cells, each its
   start and count in one list), and handed to the renderer in place of the grid loadWorld made. Its lights' records
   hold positions relative to the floating origin: lgShift moves them, and the grid's corner, when the origin steps */
const LK=130;
const LG={n:0,entries:0,maxN:0,ms:0,x0:-3000,z0:-1600,size:3800,CELL:8,MAXPER:24,rec:null,lights:null,obj:null,ro:[0,0]};
/* a light of this game's ({p, r, c, d, cs}) as the renderer's record: point or spot, its reach, its colour in the
   renderer's units, its cone (the old shader's edge went from cs to cs + .1) */
const lgRec=f=>({type:f.d?1:0,pos:f.p,r:f.r,col:f.c.map(v=>v*LK),dir:f.d||[0,-1,0],cosO:f.d?f.cs:-1,cosI:f.d?Math.min(.999,f.cs+.1):-1,axis:[0,0,0],flick:0,src:.1});
function lgBuild(){
  const t0=performance.now(),C=LG.CELL,gw=Math.ceil(LG.size/C),x0=LG.x0,z0=LG.z0,L=WG.townLights().map(lgRec),n=L.length,G=R.G;
  LG.lights=L;
  /* the records: four texels a light, as 11_sl3's LightGrid writes them */
  const rows=Math.max(1,Math.ceil(n*4/1024)),rec=new Float32Array(1024*rows*4);LG.rec=rec;
  const cells=new Array(gw*gw);
  L.forEach((f,i)=>{const I=Math.max(f.col[0],f.col[1],f.col[2]),r=f.r;
    const i0=Math.max(0,Math.floor((f.pos[0]-r-x0)/C)),i1=Math.min(gw-1,Math.floor((f.pos[0]+r-x0)/C)),j0=Math.max(0,Math.floor((f.pos[2]-r-z0)/C)),j1=Math.min(gw-1,Math.floor((f.pos[2]+r-z0)/C));
    for(let j=j0;j<=j1;j++)for(let k=i0;k<=i1;k++){const cx=x0+(k+.5)*C,cz=z0+(j+.5)*C,dx=Math.max(0,Math.abs(cx-f.pos[0])-C/2),dz=Math.max(0,Math.abs(cz-f.pos[2])-C/2),d2=dx*dx+dz*dz;
      if(d2>r*r)continue;const ci=j*gw+k;(cells[ci]||(cells[ci]=[])).push(i,I/(d2+4));}});
  let total=0,maxN=0;const MP=LG.MAXPER;
  for(let c=0;c<cells.length;c++){const a=cells[c];if(!a)continue;let m=a.length/2;
    if(m>MP){const idx=[];for(let q=0;q<m;q++)idx.push(q);idx.sort((p,q)=>a[q*2+1]-a[p*2+1]);const b=[];for(let q=0;q<MP;q++)b.push(a[idx[q]*2],0);cells[c]=b;m=MP;}
    total+=m;if(m>maxN)maxN=m;}
  const lrows=Math.max(1,Math.ceil(total/1024)),list=new Uint32Array(1024*lrows),grid=new Uint32Array(gw*gw*2);let o=0;
  for(let c=0;c<cells.length;c++){const a=cells[c];grid[c*2]=o;if(!a)continue;const m=a.length/2;grid[c*2+1]=m;for(let q=0;q<m;q++)list[o++]=a[q*2];}
  /* the renderer's grid, swapped for this one */
  const old=R.lights;if(old){G.del(old.tex);G.del(old.grid);G.del(old.list);}
  const obj={n,params:[x0,z0,1/C,gw],tex:G.texture(1024,rows,'rgba32f',{filter:'nearest'}),grid:G.texture(gw,gw,'rg32ui',{filter:'nearest',data:grid}),list:G.texture(1024,lrows,'r32ui',{filter:'nearest',data:list}),
    stats:{lights:n,entries:total,maxPerCell:maxN},bindings(){return {uLights:this.tex,uLGrid:this.grid,uLList:this.list};}};
  R.lights=LG.obj=obj;LG.ro=[NaN,NaN];lgPlace();
  Object.assign(LG,{n,entries:total,maxN,ms:performance.now()-t0});
}
/* the records and the corner for where the origin is now (the cells' lists don't change: the origin steps in whole
   cells). About a thousand lights: a fraction of a millisecond */
function lgPlace(){
  if(!LG.obj||LG.ro[0]===RO[0]&&LG.ro[1]===RO[2])return;const t0=performance.now(),rec=LG.rec;
  LG.lights.forEach((L,i)=>{const o=i*16;
    rec.set([L.pos[0]-RO[0],L.pos[1]-RO[1],L.pos[2]-RO[2],L.r],o);
    rec.set([L.col[0],L.col[1],L.col[2],L.type+8*(L.flick||0)],o+4);
    rec.set([L.dir[0],L.dir[1],L.dir[2],L.cosO],o+8);
    rec.set([L.cosI,L.src||.05,0,0],o+12);});
  R.G.upload(LG.obj.tex,rec);LG.obj.params=[LG.x0-RO[0],LG.z0-RO[2],1/LG.CELL,LG.obj.params[3]];R.U.uGridP=LG.obj.params;LG.ro=[RO[0],RO[2]];LG.placeMs=performance.now()-t0;
}

/* ---------- the frame's own lamps ---------- */
/* the player's: the headlights (with their shadow map and the low-beam cut-off) when they're on, the tail lights with
   them and brighter under braking, an underglow's colour thrown on the road under the car */
function carLights(t,L){
  const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],Rt=[M[2],M[5],M[8]],lift=liftOf(t),Mc=t.c.machine&&MACH[t.c.machine];
  const at=(x,y,z)=>[t.p[0]-RO[0]+F[0]*x+U[0]*y+Rt[0]*z,t.p[1]-RO[1]+F[1]*x+U[1]*y+Rt[1]*z,t.p[2]-RO[2]+F[2]*x+U[2]*y+Rt[2]*z];
  const xf=D.L/2-.15-t.cg[0],y=(Mc?Mc.lampY:.78)+lift-t.cg[1],zs=Mc?Math.min(.62,Mc.W*.3):.62,xr=-(D.L/2-.1)-t.cg[0];
  if(APP.lights){const dir=V3.norm([F[0]-U[0]*.06,F[1]-U[1]*.06,F[2]-U[2]*.06]);
    /* (half as bright again as the port had them: the pool of light and its cut-off read on a phone like Wide Open's) */
    const hk=1.5*LOOK.hl;L.headlights={on:1,high:0,posL:at(xf,y,-zs),posR:at(xf,y,zs),dir,right:Rt,up:U,col:[1050*hk,1090*hk,1140*hk],range:85};}
  const brake=t.brkIn>.05;
  if(APP.lights||brake){const back=V3.norm([-F[0]-U[0]*.35,-F[1]-U[1]*.35,-F[2]-U[2]*.35]);
    for(const z of [-.66,.66])L.dyn.push({pos:at(xr,y,z),r:brake?11:6,col:brake?[5,.12,.06]:[.9,.02,.01],type:1,dir:back,cosO:Math.cos(1.3)});}
  if(SKY.night&&t.build.underglow&&t.build.glow){const g=t.build.glow;L.dyn.push({pos:at(0,.15,0),r:7,col:[g[0]*5*LK*.5,g[1]*5*LK*.5,g[2]*5*LK*.5],type:0});}
}
/* the farms' yard lights, the diner's and the like that come with the chunks round the car: the nearest few */
function yardLights(L,p,n){
  if(!SKY.night)return;
  const F=worldLights(p,200).map(f=>({f,d:Math.hypot(f.p[0]-p[0],f.p[2]-p[2])-f.r})).filter(q=>q.d<160).sort((a,b)=>a.d-b.d);
  for(const {f} of F){if(L.dyn.length>=n)break;const r=lgRec(f);L.dyn.push({pos:[f.p[0]-RO[0],f.p[1]-RO[1],f.p[2]-RO[2]],r:r.r,col:r.col.map(v=>v*LOOK.lamps),type:r.type,dir:r.dir,cosO:r.type?r.cosO:-1});}
}
/* the other cars' headlights at night: spot lights for the nearest few */
function rivalLights(L,cars,eye){
  const n={mobile:2,low:2,medium:3,high:4,ultra:6}[GFX.level]||3;
  const near=cars.map(t=>({t,d:Math.hypot(t.p[0]-eye[0],t.p[2]-eye[2])})).sort((a,b)=>a.d-b.d).slice(0,n);
  for(const {t} of near){const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],lift=liftOf(t),x=D.L/2-.1-t.cg[0],y=.78+lift-t.cg[1];
    if(L.dyn.length>=16)break;
    L.dyn.push({pos:[t.p[0]-RO[0]+F[0]*x+U[0]*y,t.p[1]-RO[1]+F[1]*x+U[1]*y,t.p[2]-RO[2]+F[2]*x+U[2]*y],r:32,col:[150,145,130],type:1,dir:V3.norm([F[0]-U[0]*.08,F[1]-U[1]*.08-.04,F[2]-U[2]*.08]),cosO:Math.cos(.6)});}
}
