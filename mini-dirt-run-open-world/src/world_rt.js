/* =====================================================================================
   THE OPEN WORLD. Mini Dirt Run Solo's game in a world forty miles square that is made as you drive:
   128 m chunks round the camera, each made at the detail its distance needs (every 2 m close by, 4 m,
   then 8 m), with its roads, buildings, poles and trees, and let go once it's well behind. Past them,
   512 m far tiles every 32 m out to the horizon. The making happens in a background worker (the
   generator below, sent to it as text) so the game's own frame never waits for it; when a browser
   won't run a worker the same code runs here a little at a time.
   The physics asks the chunk under each wheel for its ground (the same 2 m triangles that are drawn);
   if one isn't there yet it works the ground out point by point from the same functions, so it is the
   same answer either way.
   Drawing is relative to the camera (RO is where the camera is): the GPU only ever sees numbers a few
   kilometres across, so nothing shakes however far from the garage you drive.
   ===================================================================================== */
const RMAT={TERRAIN:40,ROCK:41,STRIP:42,TRAIL:43,MUDTRACK:44,CONCRETE:45,WOOD:46,SHEET:47,LEAF:48,HAY:49,WATER:50,SKY:51,LINE:52,GRAVEL:53,ASPHALT:54,RUTS:55,ROAD:56};
/*@@WORLDGEN@@*/
/* the tree shapes' builder, from the ranch code */
const Ranch=(()=>{
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],neg=a=>[-a[0],-a[1],-a[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
function rng(seed=1){let s=seed>>>0||1;return ()=>(s^=s<<13,s>>>=0,s^=s>>>17,s^=s<<5,s>>>=0,s/4294967296);}
const s2l=v=>Math.pow(v/255,2.2);
function mapVertex(m,c,u,w,ao,out){const id=m[0];
  const mid=id===4?RMAT.CONCRETE:id===18?RMAT.WOOD:id===19?RMAT.SHEET:id===20?RMAT.LEAF:id===22?RMAT.HAY:id===24?RMAT.WATER:MAT.COL;
  out[4]=mid;out[0]=s2l(c[0]);out[1]=s2l(c[1]);out[2]=s2l(c[2]);out[3]=id===19?m[1]:0;}
class MeshBuilderI{
  constructor(){this.P=[];this.N=[];this.C=[];this.M=[];this.idx=[];this.nv=0;this.m=[0,0,0,0];this.c=[255,255,255,255];this.o=[0,0,0,0,0];}
  v(p,n,u=0,w=0,ao){const o=this.o;mapVertex(this.m,this.c,u,w,ao,o);const l=Math.hypot(n[0],n[1],n[2])||1;
    this.P.push(p[0],p[1],p[2]);this.N.push(n[0]/l,n[1]/l,n[2]/l);this.C.push(o[0],o[1],o[2],o[3]);this.M.push(o[4]);return this.nv++;}
  quad(a,b,c,d){this.idx.push(a,b,c,a,c,d);}
  tube(a,b,r,n=6,caps=true,r2=r){
    const d=sub(b,a),L=Math.hypot(...d);if(L<1e-5)return;
    const t=d.map(x=>x/L),ref=Math.abs(t[1])<.9?[0,1,0]:[1,0,0],u=norm(cross(t,ref)),w=cross(t,u),ring=[],sl=(r-r2)/L;
    for(let i=0;i<=n;i++){const an=i/n*Math.PI*2,cs=Math.cos(an),sn=Math.sin(an),rn=[u[0]*cs+w[0]*sn,u[1]*cs+w[1]*sn,u[2]*cs+w[2]*sn],nn=norm([rn[0]+t[0]*sl,rn[1]+t[1]*sl,rn[2]+t[2]*sl]);
      ring.push([this.v([a[0]+rn[0]*r,a[1]+rn[1]*r,a[2]+rn[2]*r],nn,i/n,0),this.v([b[0]+rn[0]*r2,b[1]+rn[1]*r2,b[2]+rn[2]*r2],nn,i/n,L)]);}
    for(let i=0;i<n;i++)this.quad(ring[i][0],ring[i+1][0],ring[i+1][1],ring[i][1]);
    if(caps){const ca=this.v(a,neg(t)),cb=this.v(b,t);
      for(let i=0;i<n;i++){const p=(an,rr,o)=>[o[0]+(u[0]*Math.cos(an)+w[0]*Math.sin(an))*rr,o[1]+(u[1]*Math.cos(an)+w[1]*Math.sin(an))*rr,o[2]+(u[2]*Math.cos(an)+w[2]*Math.sin(an))*rr];
        const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
        this.idx.push(ca,this.v(p(a1,r,a),neg(t)),this.v(p(a0,r,a),neg(t)));
        if(r2>1e-4)this.idx.push(cb,this.v(p(a0,r2,b),t),this.v(p(a1,r2,b),t));}}
  }
  blob(c,rx,ry,rz,seg=7,rings=4){const ix=[],sd=c[0]*1.7+c[2]*.9;
    for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI,row=[];for(let i=0;i<=seg;i++){const th=i/seg*Math.PI*2,n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)],
      wob=j===0||j===rings?1:1+.16*Math.sin(th*3+j*2.1+sd)+.1*Math.sin(th*5-j*1.3+sd*2);
      row.push(this.v([c[0]+n[0]*rx*wob,c[1]+n[1]*ry*wob,c[2]+n[2]*rz*wob],n,0,0));}ix.push(row);}
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++)this.quad(ix[j][i],ix[j][i+1],ix[j+1][i+1],ix[j+1][i]);}
}
return {rng,s2l,MeshBuilderI};
})();

const WSEED=6,WG=WORLDGEN(WSEED),CHK=WG.CH,FTS=WG.FT,CHN=CHK/2+1;
const ckey=(cx,cz)=>(cx+4096)*8192+(cz+4096);
/* where the camera is: everything is drawn relative to it */
const RO=[0,0,0];
const WORLD={chunks:new Map(),far:new Map(),tiles:new Map(),labels:new Map(),pend:new Map(),inflight:0,nextId:1,worker:null,mode:'starting',frame:0,
  near:640,farR:2400,lodD:[170,340],propD:460,sky:null,ready:false,forceLocal:false,
  st:{n:[0,0,0],ms:[0,0,0],mx:[0,0,0],sn:0,sms:0,smx:0,fn:0,fms:0,upms:0,miss:0,missT:0,holes:0,queue:0,bytes:0,last:0,ring:0,odo:0,top:0,lastP:null,genRate:0,genAcc:0,genT:0}};
/* the sizes of the rings by graphics level (the dev panel can push them out or in) */
const WRING={mini:{near:540,farR:1800,lodD:[115,270],propD:340},plus:{near:640,farR:2400,lodD:[170,340],propD:460},high:{near:820,farR:3000,lodD:[220,430],propD:600}};
function worldRings(){
  const r=WRING[GFX.level]||WRING.plus,k=DEVW.view==='near'?.75:DEVW.view==='far'?1.35:1;
  WORLD.near=r.near*k;WORLD.farR=r.farR*k;WORLD.lodD=[r.lodD[0]*k,r.lodD[1]*k];WORLD.propD=r.propD*k;
  if(SKY.night){WORLD.near=Math.min(WORLD.near,420);WORLD.farR=0;WORLD.propD=Math.min(WORLD.propD,330);}
}

/* ---------- the worker ---------- */
function startWorker(){
  if(WORLD.forceLocal){WORLD.worker=null;WORLD.mode='main thread';return;}
  const src=WORLDGEN.toString()+'\nconst G=WORLDGEN('+WSEED+');\n'+
`onmessage=e=>{const q=e.data,t0=performance.now();let r;
  try{r=q.k==='g'?G.genGround(q.cx,q.cz,q.lod):q.k==='s'?G.genStatic(q.cx,q.cz):G.genFar(q.cx,q.cz);}
  catch(err){postMessage({id:q.id,err:String(err&&err.stack||err)});return;}
  const tr=new Set();(function walk(o){if(!o||typeof o!=='object')return;if(ArrayBuffer.isView(o)){tr.add(o.buffer);return;}
    if(Array.isArray(o)){for(const v of o)if(v&&typeof v==='object')walk(v);return;}for(const k in o)walk(o[k]);})(r);
  postMessage({id:q.id,r,ms:performance.now()-t0},[...tr]);};`;
  let w=null;
  try{w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));WORLD.mode='worker';}
  catch(e){try{w=new Worker('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(src))));WORLD.mode='worker (data)';}catch(e2){w=null;}}
  if(!w){WORLD.mode='main thread';return;}
  w.onmessage=e=>worldResult(e.data);
  w.onerror=e=>{console.warn('world worker failed; making the world on the main thread',e&&e.message);workerDown();};
  WORLD.worker=w;
}
function workerDown(){
  if(WORLD.worker)try{WORLD.worker.terminate();}catch(e){}
  WORLD.worker=null;WORLD.mode='main thread';
  /* whatever it was making is asked for again */
  for(const q of WORLD.pend.values())wUnmark(q);WORLD.pend.clear();WORLD.inflight=0;
}
function wUnmark(q){if(q.k==='f'){const t=WORLD.far.get(q.key);if(t)t.req=false;return;}const c=WORLD.chunks.get(q.key);if(c)delete c.req[q.k==='g'?'g'+q.lod:'s'];}
function wSend(q){
  q.id=WORLD.nextId++;q.t0=performance.now();q.f0=WORLD.frame;WORLD.pend.set(q.id,q);WORLD.inflight++;
  WORLD.worker.postMessage({id:q.id,k:q.k,cx:q.cx,cz:q.cz,lod:q.lod});
}
/* without a worker: the same generator here, a few milliseconds a frame */
function runLocal(q){
  const t0=performance.now();let r;
  try{r=q.k==='g'?WG.genGround(q.cx,q.cz,q.lod):q.k==='s'?WG.genStatic(q.cx,q.cz):WG.genFar(q.cx,q.cz);}catch(e){console.error(e);r=null;}
  q.id=-1;WORLD.pend.set(-1,q);WORLD.inflight++;worldResult({id:-1,r,ms:performance.now()-t0});
}
function meshOf(d){if(!d)return null;const m=makeMesh(d);m.tris=d.tris;m.bytes=d.pos.byteLength+d.nrm.byteLength+d.col.byteLength+d.mat.byteLength+d.idx.byteLength;WORLD.st.bytes+=m.bytes;return m;}
function freeM(m){if(!m)return;WORLD.st.bytes-=m.bytes||0;freeMesh(m);}
function worldResult(msg){
  if(msg.id>0)WORLD.heard=true;
  const q=WORLD.pend.get(msg.id);if(!q)return;WORLD.pend.delete(msg.id);WORLD.inflight--;
  if(msg.err||!msg.r){console.error('world chunk failed',msg.err);wUnmark(q);return;}
  const r=msg.r,S=WORLD.st,t0=performance.now();
  S.genAcc+=msg.ms;
  if(q.k==='f'){const t=WORLD.far.get(q.key);S.fn++;S.fms+=msg.ms;if(!t){return;}
    t.m=meshOf(r.ground);t.marks=meshOf(r.marks);t.mn[1]=r.ymin-10;t.mx[1]=r.ymax+10;t.req=false;}
  else{
    const c=WORLD.chunks.get(q.key);
    if(q.k==='g'){S.n[q.lod]++;S.ms[q.lod]+=msg.ms;S.mx[q.lod]=Math.max(S.mx[q.lod],msg.ms);
      /* the map remembers what you've seen, at the best detail it was made */
      const old=WORLD.tiles.get(q.key);if(!old||old.tn<=r.tn){WORLD.tiles.delete(q.key);WORLD.tiles.set(q.key,{tn:r.tn,px:r.tile});if(WORLD.tiles.size>2500)WORLD.tiles.delete(WORLD.tiles.keys().next().value);}
      if(c){delete c.req['g'+q.lod];if(c.g[q.lod]){freeM(c.g[q.lod].m);freeM(c.g[q.lod].w);}
        c.g[q.lod]={m:meshOf(r.ground),w:meshOf(r.water)};c.mn[1]=Math.min(c.mn[1],r.ymin-2);c.mx[1]=Math.max(c.mx[1],r.ymax+2);c.ymax=Math.max(c.ymax,r.ymax);
        if(q.lod===0){c.H=r.H;c.SC=r.SC;WLC.cx=NaN;}}}
    else{S.sn++;S.sms+=msg.ms;S.smx=Math.max(S.smx,msg.ms);
      for(const l of r.labels)WORLD.labels.set(Math.round(l.x)+','+Math.round(l.z),l);
      if(c){delete c.req.s;
        /* the colliders into 16 m buckets, 8 x 8 to a chunk */
        const cb=new Array(64);for(const o of r.cols){const a=o.t==='c'?o.x-o.r:o.x0,b=o.t==='c'?o.z-o.r:o.z0,d=o.t==='c'?o.x+o.r:o.x1,e=o.t==='c'?o.z+o.r:o.z1;
          for(let i=Math.max(0,Math.floor((a-c.x0)/16));i<=Math.min(7,Math.floor((d-c.x0)/16));i++)for(let j=Math.max(0,Math.floor((b-c.z0)/16));j<=Math.min(7,Math.floor((e-c.z0)/16));j++)(cb[j*8+i]||(cb[j*8+i]=[])).push(o);}
        c.st={roads:meshOf(r.roads),props:meshOf(r.props),trees:r.trees,cb,lights:r.lights};WLC.cx=NaN;}}
  }
  S.upms+=performance.now()-t0;
  /* keep the worker busy between frames: the next most wanted */
  if(WORLD.worker)wPump();
}
function wPump(){const W=WORLD,T=W.todo;if(!T)return;
  while(W.worker&&W.inflight<4&&W.todoI<T.length){const q=T[W.todoI++];
    if(q.k==='f'){const t=W.far.get(q.key);if(!t||t.m||t.req)continue;}
    else{const c=W.chunks.get(q.key);if(!c||c.req[q.k==='g'?'g'+q.lod:'s'])continue;if(q.k==='g'?c.g[q.lod]:c.st)continue;}
    wMark(q);wSend(q);}}

/* ---------- chunks ---------- */
function newChunk(cx,cz){const x0=cx*CHK,z0=cz*CHK;return {cx,cz,x0,z0,key:ckey(cx,cz),g:[null,null,null],H:null,SC:null,st:null,req:{},want:2,seen:0,
  mn:[x0,1e9,z0],mx:[x0+CHK,-1e9,z0+CHK],ymax:-1e9};}
function freeChunk(c){for(const g of c.g)if(g){freeM(g.m);freeM(g.w);}if(c.st){freeM(c.st.roads);freeM(c.st.props);}c.g=[null,null,null];c.st=null;c.H=null;}
const wBox2=(x,z,c)=>{const dx=Math.max(c.x0-x,0,x-c.x0-CHK),dz=Math.max(c.z0-z,0,z-c.z0-CHK);return Math.hypot(dx,dz);};
/* once a frame: ask for what's missing round the camera (the car's own ground first, then what's ahead of
   it, then the rest by distance), and let go of what's far behind */
function worldUpdate(eye,car){
  const W=WORLD,S=W.st;W.frame++;worldRings();
  if(!W.worker&&!W.forceLocal&&W.mode==='starting')startWorker();
  const ex=eye[0],ez=eye[2],R=W.near,px=car?car.p[0]:ex,pz=car?car.p[2]:ez,vx=car?car.v[0]:0,vz=car?car.v[2]:0,sp=Math.hypot(vx,vz);
  const fx=sp>1?vx/sp:0,fz=sp>1?vz/sp:0,lead=Math.min(1,sp/30)*.75,ccx=Math.floor(px/CHK),ccz=Math.floor(pz/CHK),todo=[];
  for(let cx=Math.floor((ex-R)/CHK);cx<=Math.floor((ex+R)/CHK);cx++)for(let cz=Math.floor((ez-R)/CHK);cz<=Math.floor((ez+R)/CHK);cz++){
    const k=ckey(cx,cz);let c=W.chunks.get(k);
    const dx=Math.max(cx*CHK-ex,0,ex-cx*CHK-CHK),dz=Math.max(cz*CHK-ez,0,ez-cz*CHK-CHK),d=Math.hypot(dx,dz);
    const under=Math.abs(cx-ccx)<=1&&Math.abs(cz-ccz)<=1;
    if(d>R&&!under)continue;
    if(!c){c=newChunk(cx,cz);W.chunks.set(k,c);WLC.cx=NaN;}
    c.seen=W.frame;
    let lod=d<W.lodD[0]?0:d<W.lodD[1]?1:2;
    if(c.want<lod&&d<W.lodD[c.want]+25)lod=c.want;
    if(under)lod=0;
    c.want=lod;c.d=d;
    const ox=(cx+.5)*CHK-px,oz=(cz+.5)*CHK-pz,pr=d-(ox*fx+oz*fz)*lead,have=c.g[0]||c.g[1]||c.g[2];
    if(!c.g[lod]&&!c.req['g'+lod])todo.push({k:'g',key:k,cx,cz,lod,pr:pr+(under&&lod===0?-1e5:0)+(have?40+lod*10:0)});
    if(!c.st&&!c.req.s&&(d<W.propD+60||under))todo.push({k:'s',key:k,cx,cz,pr:pr+20+(under?-9e4:0)});
    /* once it has the detail it wants, the others go */
    if(c.g[lod])for(let l=0;l<3;l++)if(l!==lod&&c.g[l]){freeM(c.g[l].m);freeM(c.g[l].w);c.g[l]=null;}
  }
  /* the far tiles, beyond the chunks */
  if(W.farR>0){const F=W.farR;
    for(let tx=Math.floor((ex-F)/FTS);tx<=Math.floor((ex+F)/FTS);tx++)for(let tz=Math.floor((ez-F)/FTS);tz<=Math.floor((ez+F)/FTS);tz++){
      const dx=Math.max(tx*FTS-ex,0,ex-tx*FTS-FTS),dz=Math.max(tz*FTS-ez,0,ez-tz*FTS-FTS),d=Math.hypot(dx,dz);if(d>F)continue;
      const k=ckey(tx,tz)+1e8;let t=W.far.get(k);if(!t){t={tx,tz,x0:tx*FTS,z0:tz*FTS,m:null,marks:null,req:false,mn:[tx*FTS,-50,tz*FTS],mx:[tx*FTS+FTS,150,tz*FTS+FTS]};W.far.set(k,t);}
      t.seen=W.frame;if(!t.m&&!t.req)todo.push({k:'f',key:k,cx:tx,cz:tz,pr:3000+d});}}
  S.queue=todo.length;
  /* send the most wanted */
  if(todo.length){todo.sort((a,b)=>a.pr-b.pr);
    if(W.worker){
      /* a worker that has said nothing for 8 s and 90 frames (2.5 s and 30 if it never has) is not going to */
      for(const q of W.pend.values()){const age=performance.now()-q.t0,fr=W.frame-q.f0;if(W.heard?age>8000&&fr>90:age>2500&&fr>30){workerDown();break;}}}
    if(W.worker){W.todo=todo;W.todoI=0;wPump();}
    else{const t0=performance.now();for(const q of todo){wMark(q);runLocal(q);if(performance.now()-t0>(GAME.state==='drive'?5:14))break;}}}
  /* let go of what's far behind */
  for(const [k,c] of W.chunks){if(c.seen===W.frame)continue;if(wBox2(ex,ez,c)>R+160){freeChunk(c);W.chunks.delete(k);WLC.cx=NaN;}}
  for(const [k,t] of W.far){if(t.seen===W.frame)continue;const d=Math.hypot(t.x0+FTS/2-ex,t.z0+FTS/2-ez);if(d>W.farR+FTS*1.5||W.farR===0){freeM(t.m);freeM(t.marks);W.far.delete(k);}}
  /* the stress test's numbers: how far, how fast, any frame where the car's own ground wasn't ready */
  if(car){if(S.lastP){const dd=Math.hypot(px-S.lastP[0],pz-S.lastP[1]);if(dd<60)S.odo+=dd;}S.lastP=[px,pz];S.top=Math.max(S.top,sp);
    const cc=W.chunks.get(ckey(ccx,ccz));if(!cc||!cc.H)S.missT++;}
  S.genT+=1/60;if(S.genT>=1){S.genRate=S.genAcc/S.genT;S.genAcc=0;S.genT=0;}
  W.ready=true;
}
function wMark(q){if(q.k==='f'){const t=WORLD.far.get(q.key);if(t)t.req=true;return;}const c=WORLD.chunks.get(q.key);if(c)c.req[q.k==='g'?'g'+q.lod:'s']=true;}

/* ---------- the ground for the physics: the chunk's 2 m grid, or worked out point by point ---------- */
const WLC={cx:NaN,cz:NaN,c:null};
function chunkAt(x,z){const cx=Math.floor(x/CHK),cz=Math.floor(z/CHK);if(cx===WLC.cx&&cz===WLC.cz)return WLC.c;const c=WORLD.chunks.get(ckey(cx,cz))||null;WLC.cx=cx;WLC.cz=cz;WLC.c=c;return c;}
const GPH=new Map(),GPS=new Map(),GPO={};
/* one grid point's height and surface, worked out (and kept a while): float32, like the chunks' grids */
function gridKey(i,j){const k=(i+30000)*60000+(j+30000);if(!GPH.has(k)){WG.sample(i*2,j*2,GPO);if(GPH.size>40000){GPH.clear();GPS.clear();}GPH.set(k,Math.fround(GPO.h));GPS.set(k,GPO.code);WORLD.st.miss++;}return k;}
function gridH(i,j){return GPH.get(gridKey(i,j));}
function gridC(i,j){return GPS.get(gridKey(i,j));}
function groundInto(x,z,o){
  const c=chunkAt(x,z);let h00,h10,h01,h11,code,fx,fz;
  if(c&&c.H){fx=(x-c.x0)/2;fz=(z-c.z0)/2;let i=Math.floor(fx),j=Math.floor(fz);if(i>63)i=63;if(j>63)j=63;if(i<0)i=0;if(j<0)j=0;fx-=i;fz-=j;
    const H=c.H,k=j*CHN+i;h00=H[k];h10=H[k+1];h01=H[k+CHN];h11=H[k+CHN+1];code=c.SC[k+(fz>.5?CHN:0)+(fx>.5?1:0)];}
  else{const gi=Math.floor(x/2),gj=Math.floor(z/2);fx=x/2-gi;fz=z/2-gj;h00=gridH(gi,gj);h10=gridH(gi+1,gj);h01=gridH(gi,gj+1);h11=gridH(gi+1,gj+1);code=gridC(gi+(fx>.5?1:0),gj+(fz>.5?1:0));}
  let y,gx,gz;
  if(fx>fz){gx=(h10-h00)/2;gz=(h11-h10)/2;y=h00+(h10-h00)*fx+(h11-h10)*fz;}
  else{gx=(h11-h01)/2;gz=(h01-h00)/2;y=h00+(h11-h01)*fx+(h01-h00)*fz;}
  const l=Math.hypot(gx,1,gz);o.y=y;o.n[0]=-gx/l;o.n[1]=1/l;o.n[2]=-gz/l;o.surf=WG.SURF[code];return o;
}
const WHQ={y:0,n:[0,1,0],surf:''};
const WNONE=[];
const WW={
  heightAt:(x,z)=>groundInto(x,z,WHQ).y,
  groundAt:(x,z)=>{const o={y:0,n:[0,1,0],surf:''};groundInto(x,z,o);return o;},
  groundInto,
  colliders:{near(x,z){const c=chunkAt(x,z);if(!c||!c.st)return WNONE;const i=Math.floor((x-c.x0)/16),j=Math.floor((z-c.z0)/16);return (i>=0&&j>=0&&i<8&&j<8&&c.st.cb[j*8+i])||WNONE;}},
  lights:[]};
const RANCH={W:WW,world:new GroundWorld(groundInto,WW.colliders,WG.HALF-30),ms:0,stat:null};

/* ---------- drawing ---------- */
/* the six planes of the view frustum from a column-major view-projection matrix */
function frustum(m){const r=(a,b,c,d)=>{const l=Math.hypot(a,b,c);return [a/l,b/l,c/l,d/l];};
  return [r(m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]),r(m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]),r(m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]),
    r(m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]),r(m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]),r(m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14])];}
function boxVisible(F,mn,mx){for(const p of F){const x=p[0]>0?mx[0]:mn[0],y=p[1]>0?mx[1]:mn[1],z=p[2]>0?mx[2]:mn[2];if(p[0]*x+p[1]*y+p[2]*z+p[3]<0)return false;}return true;}
const boxDist=(e,mn,mx)=>{let s=0;for(let k=0;k<3;k+=2){const d=Math.max(mn[k]-e[k],0,e[k]-mx[k]);s+=d*d;}return Math.sqrt(s);};
/* a model matrix that only moves: the chunk's corner, relative to the camera */
const WTM=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function atM(u,x,y,z){WTM[12]=x-RO[0];WTM[13]=y-RO[1];WTM[14]=z-RO[2];gl.uniformMatrix4fv(u.uM,false,WTM);}
const bestG=c=>c.g[c.want]||c.g[0]||c.g[1]||c.g[2];
function worldInit(){
  const t0=performance.now();
  /* the sky: an inside-out dome round the camera */
  {const mb=new Ranch.MeshBuilderI();mb.m=[0,0,0,0];const seg=28,rings=14,ix=[];
    for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI,row=[];for(let i=0;i<=seg;i++){const th=i/seg*TAU,n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];row.push(mb.v([n[0]*900,n[1]*900,n[2]*900],n));}ix.push(row);}
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++)mb.quad(ix[j][i],ix[j+1][i+1],ix[j][i+1]);
    WORLD.sky=makeMesh({pos:new Float32Array(mb.P),nrm:new Float32Array(mb.N),col:new Float32Array(mb.C),mat:new Float32Array(mb.P.length/3).fill(RMAT.SKY),idx:new Uint32Array(mb.idx)});}
  TREES.shapes=treeShapes();
  startWorker();
  RANCH.ms=performance.now()-t0;
}
/* draw the sky, the far tiles, the ground, the roads, the buildings and the trees */
function drawWorld(cam){
  const W=WORLD,u=P_LIT.u,F=frustum(cam.VPw),e=cam.eye;let tris=0,holes=0;
  gl.uniformMatrix4fv(u.uM,false,M4.id());gl.depthMask(false);drawMesh(W.sky);gl.depthMask(true);
  /* far tiles: pushed down a little where the chunks are, so the chunks always win */
  if(W.farR>0){gl.uniform4f(u.uFarDrop,1,W.near-90,W.near+30,14);
    for(const t of W.far.values()){if(!t.m)continue;if(boxDist(e,t.mn,t.mx)>W.farR||!boxVisible(F,t.mn,t.mx))continue;atM(u,t.x0,0,t.z0);drawMesh(t.m);tris+=t.m.tris;if(t.marks){drawMesh(t.marks);tris+=t.marks.tris;}}
    gl.uniform4f(u.uFarDrop,0,0,0,0);}
  const vis=[];
  for(const c of W.chunks.values()){const g=bestG(c);const d=boxDist(e,c.mn,c.mx);
    if(!g){if(d<W.near*.6&&c.mn[1]<1e8)holes++;else if(d<W.near*.6)holes++;continue;}
    if(d>W.near||!boxVisible(F,c.mn,c.mx))continue;atM(u,c.x0,0,c.z0);drawMesh(g.m);tris+=g.m.tris;if(g.w){drawMesh(g.w);tris+=g.w.tris;}c.vd=d;vis.push(c);}
  const tg=tris;
  /* the roads lie on the ground like paint */
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1.5,-3);
  for(const c of vis)if(c.st&&c.st.roads&&c.vd<W.near-20){atM(u,c.x0,0,c.z0);drawMesh(c.st.roads);tris+=c.st.roads.tris;}
  gl.disable(gl.POLYGON_OFFSET_FILL);
  const tr=tris;
  for(const c of vis)if(c.st&&c.st.props&&c.vd<W.propD+40){atM(u,c.x0,0,c.z0);drawMesh(c.st.props);tris+=c.st.props.tris;}
  gl.uniformMatrix4fv(u.uM,false,M4.id());
  const tt=drawTreesW(cam,F,W.propD);
  W.st.holes=holes;RANCH.stat={ground:tg,roads:tr-tg,props:tris-tr,trees:tt};
  return tris+tt;
}
/* the trees: three broadleaf shapes and two pines, each near (full) and far (one lump), drawn instanced */
const TREES={shapes:null,buf:null,cnt:null};
const TREE_NEAR=95;
function treeShapes(){
  const out=[],R=Ranch.rng(11),mk=fn=>{const B=new Ranch.MeshBuilderI();fn(B);
    for(let i=0;i<B.nv;i++)if(B.M[i]===RMAT.WOOD)B.C[i*4+3]=2;
    const m=makeMesh({pos:new Float32Array(B.P),nrm:new Float32Array(B.N),col:new Float32Array(B.C),mat:new Float32Array(B.M),idx:new Uint32Array(B.idx)});m.tris=B.idx.length/3;return m;};
  const leaf=(B,k)=>{B.m=[20,k,0,0];const v=235+R()*40;B.c=[v,v*(.96+R()*.08),v*(.94+R()*.1),255];};
  for(let v=0;v<3;v++){const th=2.4,cr=3.4,crowns=[];
    for(let k=0;k<3;k++){const a=R()*6.28,d=k?cr*(.35+R()*.25):0,r=cr*(k?.55+R()*.2:.78);crowns.push([Math.cos(a)*d,th+cr*(.62+(k?R()*.35:0)),Math.sin(a)*d,r]);}
    out.push([mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+cr*.5,0],.26,6,false,.14);for(const c of crowns){leaf(B,0);B.blob([c[0],c[1],c[2]],c[3],c[3]*.82,c[3],7,4);}}),
      mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+.6,0],.26,4,false,.16);leaf(B,0);B.blob([0,th+cr*.85,0],cr*1.05,cr*.92,cr*1.05,5,3);})]);}
  for(let v=0;v<2;v++){const th=1.6,cr=2.2*(.92+v*.16);
    out.push([mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+cr*.5,0],.22,6,false,.1);for(let k=0;k<3;k++){leaf(B,1);const r=cr*(1-k*.26),y0=th-.4+k*cr*.62;B.tube([0,y0,0],[0,y0+cr*1.15,0],r,7,true,.05);}}),
      mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th,0],.22,4,false,.12);leaf(B,1);B.tube([0,th-.4,0],[0,th-.4+cr*2.45,0],cr*1.02,5,true,.05);})]);}
  return out;
}
/* sort the trees near enough into near and far for each shape (relative to the camera), one instanced draw each */
function treeFill(ctr,maxD,F,nearOnly){
  if(!TREES.buf){TREES.buf=[];TREES.cnt=[];for(let v=0;v<5;v++){TREES.buf.push([new Float32Array(12*512),new Float32Array(12*512)]);TREES.cnt.push([0,0]);}}
  for(const c of TREES.cnt){c[0]=0;c[1]=0;}
  const nn=TREE_NEAR*TREE_NEAR,md=maxD*maxD;
  for(const c of WORLD.chunks.values()){const T=c.st&&c.st.trees;if(!T||!T.length)continue;
    const dx=Math.max(c.x0-ctr[0],0,ctr[0]-c.x0-CHK),dz=Math.max(c.z0-ctr[2],0,ctr[2]-c.z0-CHK);if(dx*dx+dz*dz>md)continue;
    if(F){c.mx[1]=Math.max(c.mx[1],c.ymax+18);if(!boxVisible(F,c.mn,c.mx))continue;}
    for(let o=0;o<T.length;o+=12){const ex=T[o]-ctr[0],ez=T[o+2]-ctr[2],d2=ex*ex+ez*ez;if(d2>md)continue;
      const v=T[o+7]|0,l=nearOnly||d2<nn?0:1,cn=TREES.cnt[v];let b=TREES.buf[v][l];
      if((cn[l]+1)*12>b.length){const nb=new Float32Array(b.length*2);nb.set(b);TREES.buf[v][l]=b=nb;}
      const k=cn[l]++*12;b[k]=T[o]-RO[0];b[k+1]=T[o+1]-RO[1];b[k+2]=T[o+2]-RO[2];for(let q=3;q<12;q++)b[k+q]=T[o+q];}}
}
function drawTreesW(cam,F,maxD){
  treeFill(cam.eye,maxD,F,false);let tris=0;
  gl.uniform1f(P_LIT.u.uInst,1);
  for(let v=0;v<5;v++)for(let l=0;l<2;l++){const n=TREES.cnt[v][l];if(!n)continue;const m=TREES.shapes[v][l];setInst(m,TREES.buf[v][l].subarray(0,n*12));drawMeshI(m);tris+=m.tris*n;}
  gl.uniform1f(P_LIT.u.uInst,0);
  return tris;
}
/* the shadow map's share: the buildings and poles near its centre (world ctr), the trees round it */
function worldShadowCasters(u,ctr,R){
  let tris=0;
  for(const c of WORLD.chunks.values()){if(!c.st||!c.st.props)continue;if(c.x0>ctr[0]+R||c.x0+CHK<ctr[0]-R||c.z0>ctr[2]+R||c.z0+CHK<ctr[2]-R)continue;atM(u,c.x0,0,c.z0);drawMesh(c.st.props);tris+=c.st.props.tris;}
  gl.uniformMatrix4fv(u.uM,false,M4.id());
  treeFill(ctr,R,null,true);gl.uniform1f(u.uInst,1);
  for(let v=0;v<5;v++){const n=TREES.cnt[v][0];if(!n)continue;const m=TREES.shapes[v][0];setInst(m,TREES.buf[v][0].subarray(0,n*12));drawMeshI(m);tris+=m.tris*n;}
  gl.uniform1f(u.uInst,0);
  return tris;
}
/* the lights of the farms, the towns and the garage near a point (for the night) */
function worldLights(p,r){const out=[];
  for(const c of WORLD.chunks.values()){if(!c.st||!c.st.lights.length)continue;if(wBox2(p[0],p[2],c)>r)continue;for(const l of c.st.lights)out.push(l);}
  return out;}
