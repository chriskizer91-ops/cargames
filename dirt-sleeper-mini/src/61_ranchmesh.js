/* =====================================================================================
   THE RANCH ON THE GPU. The ground is cut into 64 m tiles, each meshed three times (every 2 m,
   4 m and 8 m) with a skirt hanging from its edges so tiles of different detail never show a
   crack; near tiles get the fine mesh, far ones the coarse. Everything else Dirt Sleeper's
   ranch code drew comes in tiles too. Tiles behind the camera or past the fog are skipped.
   ===================================================================================== */
const RANCH={W:null,world:null,ground:[],props:[],sky:null,tris:0,ms:0};
const LOD_STEP=[1,2,4],LOD_DIST=[150,290];
function buildRanchGL(){
  const t0=performance.now(),W=Ranch.buildRanch(),t1=performance.now();
  RANCH.W=W;RANCH.world=new Ranch.RanchWorld(W);
  const N=W.N,TS=32,nt=Math.ceil((N-1)/TS),H=W.H,NR=W.NRM,WT=W.W;
  for(let tj=0;tj<nt;tj++)for(let ti=0;ti<nt;ti++){
    const i0=ti*TS,j0=tj*TS,i1=Math.min(N-1,i0+TS),j1=Math.min(N-1,j0+TS);
    let ymin=1e9,ymax=-1e9;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const h=H[j*N+i];if(h<ymin)ymin=h;if(h>ymax)ymax=h;}
    const tile={mn:[W.x0+i0*W.cell,ymin-1.6,W.z0+j0*W.cell],mx:[W.x0+i1*W.cell,ymax,W.z0+j1*W.cell],lod:[]};
    for(const st of LOD_STEP){
      const P=[],Nn=[],C=[],M=[],I=[],grid=[];let nv=0;
      const put=(i,j,drop)=>{const k=j*N+i;P.push(W.x0+i*W.cell,H[k]-drop,W.z0+j*W.cell);Nn.push(NR[k*3],NR[k*3+1],NR[k*3+2]);C.push(WT[k*4],WT[k*4+1],WT[k*4+2],WT[k*4+3]);M.push(RMAT.TERRAIN);return nv++;};
      const is=[],js=[];for(let i=i0;i<i1;i+=st)is.push(i);is.push(i1);for(let j=j0;j<j1;j+=st)js.push(j);js.push(j1);
      for(const j of js){const row=[];for(const i of is)row.push(put(i,j,0));grid.push(row);}
      for(let b=0;b<js.length-1;b++)for(let a=0;a<is.length-1;a++){const p=grid[b][a],q=grid[b][a+1],r=grid[b+1][a],s=grid[b+1][a+1];I.push(p,s,q,p,r,s);}
      /* skirts: each edge drops 1.5 m so a coarser neighbour can't open a gap */
      const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=grid[ja][ia],b=grid[jb][ib];
        const c=put(is[ia],js[ja],1.5),d=put(is[ib],js[jb],1.5);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
      const nx=is.length-1,ny=js.length-1,top=[],bot=[],lef=[],rig=[];
      for(let a=0;a<=nx;a++){top.push([a,0]);bot.push([a,ny]);}for(let b=0;b<=ny;b++){lef.push([0,b]);rig.push([nx,b]);}
      edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
      tile.lod.push(makeMesh({pos:new Float32Array(P),nrm:new Float32Array(Nn),col:new Float32Array(C),mat:new Float32Array(M),idx:new Uint32Array(I)}));
      tile.lod[tile.lod.length-1].tris=I.length/3;
    }
    RANCH.ground.push(tile);
  }
  for(const B of W.geo.tiles.values()){
    if(!B.idx.length)continue;
    const m=makeMesh({pos:new Float32Array(B.P),nrm:new Float32Array(B.N),col:new Float32Array(B.C),mat:new Float32Array(B.M),idx:new Uint32Array(B.idx)});
    m.tris=B.idx.length/3;RANCH.props.push({mesh:m,mn:B.mn,mx:B.mx,big:B.mx[0]-B.mn[0]>90||B.mx[2]-B.mn[2]>90});
  }
  /* the sky: an inside-out dome that follows the camera */
  {const mb=new Ranch.MeshBuilderI();mb.m=[0,0,0,0];const seg=28,rings=14,ix=[];
    for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI,row=[];for(let i=0;i<=seg;i++){const th=i/seg*TAU,n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];row.push(mb.v([n[0]*900,n[1]*900,n[2]*900],n));}ix.push(row);}
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++)mb.quad(ix[j][i],ix[j+1][i+1],ix[j][i+1]);
    RANCH.sky=makeMesh({pos:new Float32Array(mb.P),nrm:new Float32Array(mb.N),col:new Float32Array(mb.C),mat:new Float32Array(mb.P.length/3).fill(RMAT.SKY),idx:new Uint32Array(mb.idx)});}
  RANCH.ms=performance.now()-t0;RANCH.shapeMs=t1-t0;
  return RANCH;
}
/* the six planes of the view frustum from a column-major view-projection matrix */
function frustum(m){const r=(a,b,c,d)=>{const l=Math.hypot(a,b,c);return [a/l,b/l,c/l,d/l];};
  return [r(m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]),r(m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]),r(m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]),
    r(m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]),r(m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]),r(m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14])];}
function boxVisible(F,mn,mx){for(const p of F){const x=p[0]>0?mx[0]:mn[0],y=p[1]>0?mx[1]:mn[1],z=p[2]>0?mx[2]:mn[2];if(p[0]*x+p[1]*y+p[2]*z+p[3]<0)return false;}return true;}
const boxDist=(e,mn,mx)=>{let s=0;for(let k=0;k<3;k+=2){const d=Math.max(mn[k]-e[k],0,e[k]-mx[k]);s+=d*d;}return Math.sqrt(s);};
/* draw the sky, the ground and the props; uM must be identity on entry */
function drawRanch(cam,maxD=420){
  const u=P_LIT.u,F=frustum(cam.VP),e=cam.eye;let tris=0;
  gl.uniformMatrix4fv(u.uM,false,M4T(e[0],e[1],e[2]));gl.depthMask(false);drawMesh(RANCH.sky);gl.depthMask(true);
  gl.uniformMatrix4fv(u.uM,false,M4.id());
  for(const t of RANCH.ground){const d=boxDist(e,t.mn,t.mx);if(d>maxD||!boxVisible(F,t.mn,t.mx))continue;
    const m=t.lod[d<LOD_DIST[0]?0:d<LOD_DIST[1]?1:2];drawMesh(m);tris+=m.tris;}
  for(const p of RANCH.props){const d=boxDist(e,p.mn,p.mx);if(d>maxD-40||!boxVisible(F,p.mn,p.mx))continue;drawMesh(p.mesh);tris+=p.mesh.tris;}
  return tris;
}
