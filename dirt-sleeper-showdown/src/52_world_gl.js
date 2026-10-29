/* =====================================================================================
   THE WORLD ON THE GPU. The ground is cut into 64 m tiles, each meshed three times (every 2 m,
   4 m and 8 m) with a skirt hanging from its edges so tiles of different detail never show a
   crack; near tiles get the fine mesh, far ones the coarse. On the two-mile map the fine
   meshes are made only for the tiles round the truck and let go behind it. Everything else the
   ranch code drew comes in tiles too, and the trees are drawn instanced, full shape near and a
   single lump far. Tiles behind the camera or past the fog are skipped.
   ===================================================================================== */
const RANCH={W:null,world:null,ground:[],props:[],sky:null,tris:0,ms:0,trees:null,lod0:0};
const LOD_STEP=[1,2,4],LOD_DIST=[150,290],TREE_NEAR=95;
/* one ground tile at one level of detail: every st-th grid point, skirts hanging off its edges */
function groundMesh(W,t,st){
  const N=W.N,H=W.H,NR=W.NRM,WT=W.W,{i0,j0,i1,j1}=t,P=[],Nn=[],C=[],M=[],I=[],grid=[];let nv=0;
  /* (weights a byte each, 0 to 255; normals a signed byte each) */
  const put=(i,j,drop)=>{const k=j*N+i;P.push(W.x0+i*W.cell,H[k]-drop,W.z0+j*W.cell);Nn.push(NR[k*3]/127,NR[k*3+1]/127,NR[k*3+2]/127);C.push(WT[k*4]/255,WT[k*4+1]/255,WT[k*4+2]/255,WT[k*4+3]/255);M.push(RMAT.TERRAIN);return nv++;};
  const is=[],js=[];for(let i=i0;i<i1;i+=st)is.push(i);is.push(i1);for(let j=j0;j<j1;j+=st)js.push(j);js.push(j1);
  for(const j of js){const row=[];for(const i of is)row.push(put(i,j,0));grid.push(row);}
  for(let b=0;b<js.length-1;b++)for(let a=0;a<is.length-1;a++){const p=grid[b][a],q=grid[b][a+1],r=grid[b+1][a],s=grid[b+1][a+1];I.push(p,s,q,p,r,s);}
  /* skirts: each edge drops 1.5 m so a coarser neighbour can't open a gap */
  const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=grid[ja][ia],b=grid[jb][ib];
    const c=put(is[ia],js[ja],1.5),d=put(is[ib],js[jb],1.5);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
  const nx=is.length-1,ny=js.length-1,top=[],bot=[],lef=[],rig=[];
  for(let a=0;a<=nx;a++){top.push([a,0]);bot.push([a,ny]);}for(let b=0;b<=ny;b++){lef.push([0,b]);rig.push([nx,b]);}
  edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
  const m=makeMesh({pos:new Float32Array(P),nrm:new Float32Array(Nn),col:new Float32Array(C),mat:new Float32Array(M),idx:new Uint32Array(I)});m.tris=I.length/3;return m;
}
/* the trees: three broadleaf shapes and two pines, each near (full) and far (one lump), drawn instanced */
function treeShapes(){
  const out=[],R=Ranch.rng(11),mk=fn=>{const B=new Ranch.MeshBuilderI();fn(B);
    for(let i=0;i<B.nv;i++)if(B.M[i]===RMAT.WOOD)B.C[i*4+3]=2;
    const m=makeMesh({pos:new Float32Array(B.P),nrm:new Float32Array(B.N),col:new Float32Array(B.C),mat:new Float32Array(B.M),idx:new Uint32Array(B.idx)});m.tris=B.idx.length/3;return m;};
  const leaf=(B,k)=>{B.m=[20,k,0,0];const v=235+R()*40;B.c=[v,v*(.96+R()*.08),v*(.94+R()*.1),255];};
  for(let v=0;v<3;v++){const th=2.4,cr=3.4,crowns=[];
    for(let k=0;k<3;k++){const a=R()*6.28,d=k?cr*(.35+R()*.25):0,r=cr*(k?.55+R()*.2:.78);crowns.push([Math.cos(a)*d,th+cr*(.62+(k?R()*.35:0)),Math.sin(a)*d,r]);}
    out.push([mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+cr*.5,0],.26,6,false,.14);for(const c of crowns){leaf(B,0);B.blob([c[0],c[1],c[2]],c[3],c[3]*.82,c[3],7,4);}}),
      mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+.6,0],.26,4,false,.16);leaf(B,0);B.blob([0,th+cr*.85,0],cr*1.05,cr*.92,cr*1.05,6,3);})]);}
  for(let v=0;v<2;v++){const th=1.6,cr=2.2*(.92+v*.16);
    out.push([mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th+cr*.5,0],.22,6,false,.1);for(let k=0;k<3;k++){leaf(B,1);const r=cr*(1-k*.26),y0=th-.4+k*cr*.62;B.tube([0,y0,0],[0,y0+cr*1.15,0],r,7,true,.05);}}),
      mk(B=>{B.m=[18,1,0,0];B.c=[110,90,72,255];B.tube([0,-.3,0],[0,th,0],.22,4,false,.12);leaf(B,1);B.tube([0,th-.4,0],[0,th-.4+cr*2.45,0],cr*1.02,5,true,.05);})]);}
  return out;
}
function buildTrees(W){
  const T=W.trees,n=T.length/12,tiles=new Map(),S=64;
  for(let i=0;i<n;i++){const x=T[i*12],y=T[i*12+1],z=T[i*12+2],k=Math.floor(x/S)+','+Math.floor(z/S);let t=tiles.get(k);
    if(!t)tiles.set(k,t={mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9],list:[]});t.list.push(i);
    t.mn[0]=Math.min(t.mn[0],x-6);t.mn[1]=Math.min(t.mn[1],y-1);t.mn[2]=Math.min(t.mn[2],z-6);t.mx[0]=Math.max(t.mx[0],x+6);t.mx[1]=Math.max(t.mx[1],y+14);t.mx[2]=Math.max(t.mx[2],z+6);}
  const counts=[0,0,0,0,0];for(let i=0;i<n;i++)counts[T[i*12+7]|0]++;
  return {T,n,tiles:[...tiles.values()],shapes:treeShapes(),buf:counts.map(c=>[new Float32Array(Math.max(1,c)*12),new Float32Array(Math.max(1,c)*12)]),cnt:[[0,0],[0,0],[0,0],[0,0],[0,0]]};
}
function buildRanchGL(){
  const t0=performance.now(),W=Ranch.buildRanch(),t1=performance.now();
  RANCH.W=W;RANCH.world=new GroundWorld(W.groundInto,W.colliders,FAR.EDGE-10);
  /* ground tiles: the middle and far meshes now, the fine one when the truck comes near */
  const N=W.N,TS=32,nt=Math.ceil((N-1)/TS),H=W.H;
  for(let tj=0;tj<nt;tj++)for(let ti=0;ti<nt;ti++){
    const i0=ti*TS,j0=tj*TS,i1=Math.min(N-1,i0+TS),j1=Math.min(N-1,j0+TS);
    let ymin=1e9,ymax=-1e9;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const h=H[j*N+i];if(h<ymin)ymin=h;if(h>ymax)ymax=h;}
    const tile={i0,j0,i1,j1,mn:[W.x0+i0*W.cell,ymin-1.6,W.z0+j0*W.cell],mx:[W.x0+i1*W.cell,ymax,W.z0+j1*W.cell],lod:[null,null,null]};
    tile.lod[1]=groundMesh(W,tile,LOD_STEP[1]);tile.lod[2]=groundMesh(W,tile,LOD_STEP[2]);
    RANCH.ground.push(tile);
  }
  for(const B of W.geo.tiles.values()){
    if(!B.idx.length)continue;
    const m=makeMesh({pos:new Float32Array(B.P),nrm:new Float32Array(B.N),col:new Float32Array(B.C),mat:new Float32Array(B.M),idx:new Uint32Array(B.idx)});
    m.tris=B.idx.length/3;RANCH.props.push({mesh:m,mn:B.mn,mx:B.mx,big:B.mx[0]-B.mn[0]>90||B.mx[2]-B.mn[2]>90});
  }
  /* the builders' arrays are on the GPU now */
  W.geo=null;
  RANCH.trees=buildTrees(W);
  RANCH.ms=performance.now()-t0;RANCH.shapeMs=t1-t0;
  return RANCH;
}
/* the six planes of the view frustum from a column-major view-projection matrix */
function frustum(m){const r=(a,b,c,d)=>{const l=Math.hypot(a,b,c);return [a/l,b/l,c/l,d/l];};
  return [r(m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]),r(m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]),r(m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]),
    r(m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]),r(m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]),r(m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14])];}
function boxVisible(F,mn,mx){for(const p of F){const x=p[0]>0?mx[0]:mn[0],y=p[1]>0?mx[1]:mn[1],z=p[2]>0?mx[2]:mn[2];if(p[0]*x+p[1]*y+p[2]*z+p[3]<0)return false;}return true;}
const boxDist=(e,mn,mx)=>{let s=0;for(let k=0;k<3;k+=2){const d=Math.max(mn[k]-e[k],0,e[k]-mx[k]);s+=d*d;}return Math.sqrt(s);};
/* the sky, where nothing else has been drawn (13_lit's FS_SKY), with the lit program's frame uniforms */
let P_SKY=null,P_SKYP=null;
function drawSky(cam){
  if(!P_SKY){P_SKY=compile(VS_SKY,FS_SKY,LIT_DEFS);P_SKYP=compile(VS_SKY,FS_SKY,LIT_DEFS+'#define PROBE\n');}
  const SP=CUR===PRB.P?P_SKYP:P_SKY,u=SP.u,S=skyNow(),cl=cloudVec();gl.useProgram(SP.p);
  gl.uniformMatrix4fv(u.uInvVP,false,M4.inv(cam.VP));gl.uniform3fv(u.uCam,cam.eye);gl.uniform1f(u.uTime,APP.t);
  gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyZen,S.zen);gl.uniform3fv(u.uSkyHor,S.hor);
  gl.uniform1f(u.uNight,SKY.night||0);gl.uniform4fv(u.uCloud,cl);
  gl.depthMask(false);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);
  gl.useProgram(CUR.p);
}
/* draw the ground, the props, the trees and then the sky; uM must be identity on entry */
function drawRanch(cam,maxD=420){
  const u=CUR.u,F=frustum(cam.VP),e=cam.eye;let tris=0,built=0;
  gl.uniformMatrix4fv(u.uM,false,M4.id());
  for(const t of RANCH.ground){const d=boxDist(e,t.mn,t.mx);
    /* the fine mesh is made a little before it's needed (a few a frame) and let go well after */
    if(d<LOD_DIST[0]+50){if(!t.lod[0]&&built<3){t.lod[0]=groundMesh(RANCH.W,t,LOD_STEP[0]);built++;RANCH.lod0++;}}
    else if(t.lod[0]&&d>LOD_DIST[0]+140){freeMesh(t.lod[0]);t.lod[0]=null;RANCH.lod0--;}
    if(d>maxD||!boxVisible(F,t.mn,t.mx))continue;
    const m=t.lod[d<LOD_DIST[0]?0:d<LOD_DIST[1]?1:2]||t.lod[1];drawMesh(m);tris+=m.tris;}
  const tg=tris;for(const p of RANCH.props){const d=boxDist(e,p.mn,p.mx);if(d>maxD-40||!boxVisible(F,p.mn,p.mx))continue;drawMesh(p.mesh);tris+=p.mesh.tris;}
  const tt=drawTrees(cam,F,maxD-40);RANCH.stat={ground:tg,props:tris-tg,trees:tt};
  drawSky(cam);
  return tris+tt;
}
/* sort the trees in view into near and far for each shape, then one instanced draw for each */
function drawTrees(cam,F,maxD){
  const TR=RANCH.trees,T=TR.T,e=cam.eye,nn=TREE_NEAR*TREE_NEAR,md=maxD*maxD;let tris=0;
  for(const c of TR.cnt){c[0]=0;c[1]=0;}
  for(const t of TR.tiles){if(boxDist(e,t.mn,t.mx)>maxD||!boxVisible(F,t.mn,t.mx))continue;
    for(const i of t.list){const o=i*12,dx=T[o]-e[0],dz=T[o+2]-e[2],d2=dx*dx+dz*dz;if(d2>md)continue;
      const v=T[o+7]|0,l=d2<nn?0:1,b=TR.buf[v][l],k=TR.cnt[v][l]++*12;for(let q=0;q<12;q++)b[k+q]=T[o+q];}}
  gl.uniform1f(CUR.u.uInst,1);
  for(let v=0;v<5;v++)for(let l=0;l<2;l++){const n=TR.cnt[v][l];if(!n)continue;const m=TR.shapes[v][l];setInst(m,TR.buf[v][l].subarray(0,n*12));drawMeshI(m);tris+=m.tris*n;}
  gl.uniform1f(CUR.u.uInst,0);
  return tris;
}

