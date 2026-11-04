/* =====================================================================================
   THE WAYPOINT (rlcwo2rnf+traffic): tap or click the big map (M) to set one; tap it again to clear it. The county's
   roads as a graph: the town's junctions and the streets between them, the boulevard's corners, Highway 40 out to the
   salt, the section lines and where they cross. The route is the shortest way along them (Dijkstra) from where you
   are to the road nearest the waypoint, then on in a straight line where the waypoint is off the roads. Drawn on both
   maps; how far is left under the corner map; worked out again when you leave it; cleared when you arrive.
   ===================================================================================== */
const NAV={g:null,on:false,x:0,z:0,route:null,cum:null,len:0,left:0,i:0,t:0,offT:0,snap:null};
/* the graph, made on the loading screen (65_boot: about a tenth of a second), or the first time a waypoint is set */
function navBuild(){
  const L1=WG.L,R=WG.RING,nodes=[],edges=[];
  const node=(x,z)=>{for(let k=0;k<nodes.length;k++){const n=nodes[k];if(Math.abs(n.x-x)<4&&Math.abs(n.z-z)<4)return n;}const n={x,z,adj:[],i:nodes.length};nodes.push(n);return n;};
  const edge=(a,b,P)=>{if(a===b)return;const n=P.length/2,cum=new Float32Array(n);for(let k=1;k<n;k++)cum[k]=cum[k-1]+hyp2(P[2*k]-P[2*k-2],P[2*k+1]-P[2*k-1]);
    const e={a,b,pts:Float32Array.from(P),cum,len:cum[n-1]};edges.push(e);a.adj.push(e);b.adj.push(e);};
  /* the town: each junction to the next along its streets (the highway's stretch through town too) */
  const J=WG.TW.jn,at=new Map();for(const n of J)at.set(n.x+','+n.z,node(n.x,n.z));
  const G=[...new Set(J.map(n=>n.x))].sort((a,b)=>a-b);
  for(const x of G)for(let k=0;k+1<G.length;k++){const a=at.get(x+','+G[k]),b=at.get(x+','+G[k+1]);if(a&&b)edge(a,b,[a.x,a.z,b.x,b.z]);}
  for(const z of G)for(let k=0;k+1<G.length;k++){const a=at.get(G[k]+','+z),b=at.get(G[k+1]+','+z);if(a&&b)edge(a,b,[a.x,a.z,b.x,b.z]);}
  /* the boulevard's four corners */
  for(const c of WG.TW.arcs){const P=[];for(let q=0;q<=12;q++){const t=c.a0+(c.a1-c.a0)*q/12;P.push(c.cx+c.r*Math.cos(t),c.cz+c.r*Math.sin(t));}
    edge(node(P[0],P[1]),node(P[P.length-2],P[P.length-1]),P);}
  /* where two section lines cross (Highway 40 is line j 0) */
  const cross=(i,j)=>{let x=i*L1,z=j*L1;for(let r=0;r<8;r++){x=i*L1+WG.offNS(i,z);z=j*L1+WG.offEW(j,x);}return WG.clsNSz(i,z)&&WG.clsEWx(j,x)?[x,z]:null;};
  /* a section line from u0 to u1 (z for a north-south line, x for an east-west one), cut at every crossing on it */
  const line=(ns,i,u0,u1,n0)=>{const cen=u=>ns?[i*L1+WG.offNS(i,u),u]:[u,i*L1+WG.offEW(i,u)],lo=Math.min(u0,u1),hi=Math.max(u0,u1),cuts=[[u0,n0||node(...cen(u0))],[u1,node(...cen(u1))]];
    for(let k=-1;k<=1;k++){if(ns&&i===0&&k===0||!ns&&i===0&&k===0)continue;const c=ns?cross(i,k):cross(k,i);if(!c)continue;const u=ns?c[1]:c[0];if(u>lo+5&&u<hi-5)cuts.push([u,node(c[0],c[1])]);}
    cuts.sort((a,b)=>(a[0]-b[0])*(u1>u0?1:-1));
    for(let k=0;k+1<cuts.length;k++){const a=cuts[k][0],b=cuts[k+1][0],n=Math.max(1,Math.ceil(Math.abs(b-a)/10)),P=[];
      for(let q=0;q<=n;q++){const p=cen(a+(b-a)*q/n);P.push(p[0],p[1]);}edge(cuts[k][1],cuts[k+1][1],P);}};
  /* Highway 40 out of town both ways, Ridge and Wash Roads out of Central, the other section lines salt to salt */
  for(const sg of [-1,1]){
    line(false,0,sg*R,stRun(false,0,sg*(WG.EDGE+30),sg),at.get(sg*R+','+0));
    line(true,0,sg*R,stRun(true,0,sg*(WG.EDGE+30),sg),at.get('0,'+sg*R));}
  for(const i of [-1,1]){line(true,i,stRun(true,i,0,-1),stRun(true,i,0,1));line(false,i,stRun(false,i,0,-1),stRun(false,i,0,1));}
  NAV.g={nodes,edges};
}
/* the nearest point on the roads: its edge, how far along it, how far off it */
function navSnap(x,z){const E=NAV.g.edges;let best=null,bd=1e18;
  for(let q=0;q<E.length;q++){const e=E[q],P=e.pts,n=P.length/2;
    for(let k=1;k<n;k++){const ax=P[2*k-2],az=P[2*k-1],dx=P[2*k]-ax,dz=P[2*k+1]-az,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l2)),px=ax+dx*t,pz=az+dz*t,d=(x-px)*(x-px)+(z-pz)*(z-pz);
      if(d<bd){bd=d;best={e,s:e.cum[k-1]+(e.cum[k]-e.cum[k-1])*t,x:px,z:pz,d:Math.sqrt(d)};}}}
  return best;}
/* the points along an edge from distance s0 to s1 (either way) */
function navAlong(out,e,s0,s1){const P=e.pts,n=P.length/2,at=s=>{let k=1;while(k<n-1&&e.cum[k]<s)k++;const f=(s-e.cum[k-1])/((e.cum[k]-e.cum[k-1])||1);return [P[2*k-2]+(P[2*k]-P[2*k-2])*f,P[2*k-1]+(P[2*k+1]-P[2*k-1])*f];};
  const a=at(s0);out.push(a[0],a[1]);
  if(s1>=s0){for(let k=0;k<n;k++)if(e.cum[k]>s0&&e.cum[k]<s1)out.push(P[2*k],P[2*k+1]);}else{for(let k=n-1;k>=0;k--)if(e.cum[k]<s0&&e.cum[k]>s1)out.push(P[2*k],P[2*k+1]);}
  const b=at(s1);out.push(b[0],b[1]);}
/* the route from (px, pz) to the waypoint: Dijkstra over the junctions, from both ends of the edge you're on to both
   ends of the waypoint's */
function navRoute(px,pz){
  const g=NAV.g,A=navSnap(px,pz),B=NAV.snap;if(!A||!B){NAV.route=null;return;}
  const N=g.nodes.length,dist=new Float64Array(N).fill(1e18),via=new Array(N).fill(null),done=new Uint8Array(N);
  dist[A.e.a.i]=A.s;dist[A.e.b.i]=A.e.len-A.s;
  for(;;){let u=-1,ud=1e18;for(let k=0;k<N;k++)if(!done[k]&&dist[k]<ud){ud=dist[k];u=k;}if(u<0)break;done[u]=1;const nu=g.nodes[u];
    for(const e of nu.adj){const v=e.a===nu?e.b:e.a,d=ud+e.len;if(d<dist[v.i]){dist[v.i]=d;via[v.i]=e;}}}
  const viaA=dist[B.e.a.i]+B.s,viaB=dist[B.e.b.i]+(B.e.len-B.s),direct=A.e===B.e?Math.abs(A.s-B.s):1e18;
  const out=[px,pz];
  if(direct<=Math.min(viaA,viaB))navAlong(out,A.e,A.s,B.s);
  else{const end=viaA<=viaB?B.e.a:B.e.b,chain=[];let n=end;
    while(true){const e=via[n.i];if(!e)break;chain.push([e,n]);n=e.a===n?e.b:e.a;}
    /* n: the end of your edge the route leaves by */
    navAlong(out,A.e,A.s,n===A.e.a?0:A.e.len);
    for(let k=chain.length-1;k>=0;k--){const [e,to]=chain[k];navAlong(out,e,to===e.b?0:e.len,to===e.b?e.len:0);}
    navAlong(out,B.e,end===B.e.a?0:B.e.len,B.s);}
  if(B.d>12)out.push(NAV.x,NAV.z);
  /* (points closer than a metre dropped) */
  const P=[out[0],out[1]];for(let k=2;k<out.length;k+=2){const dx=out[k]-P[P.length-2],dz=out[k+1]-P[P.length-1];if(dx*dx+dz*dz>1)P.push(out[k],out[k+1]);}
  const n=P.length/2,cum=new Float32Array(n);for(let k=1;k<n;k++)cum[k]=cum[k-1]+hyp2(P[2*k]-P[2*k-2],P[2*k+1]-P[2*k-1]);
  NAV.route=Float32Array.from(P);NAV.cum=cum;NAV.len=cum[n-1];NAV.i=0;NAV.left=NAV.len;NAV.offT=0;
}
function navSet(x,z){if(!NAV.g)navBuild();NAV.on=true;NAV.x=x;NAV.z=z;NAV.snap=navSnap(x,z);const t=GAME.car;navRoute(t.p[0],t.p[2]);
  say('WAYPOINT SET: '+navDist(NAV.left),1.6,PAL.pink);}
function navClear(why){NAV.on=false;NAV.route=null;if(why)say(why,2,PAL.pink);}
const navDist=m=>m>=160?(m/1609.34).toFixed(1)+' MI':Math.max(10,Math.round(m*3.281/10)*10)+' FT';
/* each frame: how far along the route you are (the nearest point near where you were), off it for over a second: a
   new route; within 25 m of the waypoint: arrived */
function navUpdate(dt){
  if(!NAV.on||!NAV.route||GAME.state!=='drive')return;const t=GAME.car,x=t.p[0],z=t.p[2];
  if(hyp2(x-NAV.x,z-NAV.z)<25){navClear('YOU HAVE ARRIVED');return;}
  NAV.t+=dt;if(NAV.t<.2)return;NAV.t=0;
  const P=NAV.route,n=P.length/2;let bi=NAV.i,bd=1e18,bs=0;
  for(let k=Math.max(1,NAV.i-20);k<Math.min(n,NAV.i+200);k++){const ax=P[2*k-2],az=P[2*k-1],dx=P[2*k]-ax,dz=P[2*k+1]-az,l2=dx*dx+dz*dz||1,u=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l2)),qx=ax+dx*u,qz=az+dz*u,d=(x-qx)*(x-qx)+(z-qz)*(z-qz);
    if(d<bd){bd=d;bi=k-1;bs=NAV.cum[k-1]+(NAV.cum[k]-NAV.cum[k-1])*u;}}
  NAV.i=bi;NAV.left=NAV.len-bs+0;
  if(Math.sqrt(bd)>45){NAV.offT+=.2;if(NAV.offT>1)navRoute(x,z);}else NAV.offT=0;
}
/* the route and the waypoint on a map (toXY: world to map, null when off it); on the corner map a waypoint off the edge
   is an arrow on the edge pointing at it */
function navDraw(toXY,edge){
  if(!NAV.on||!NAV.route)return;const P=NAV.route,n=P.length/2,col=PAL.pink;let last=null;
  for(let k=Math.max(0,NAV.i);k<n;k++){const q=toXY(P[2*k],P[2*k+1]);if(!q){last=null;continue;}
    if(last){const dx=q[0]-last[0],dy=q[1]-last[1];if(dx*dx+dy*dy<1&&k<n-1)continue;hLine(last[0],last[1],q[0],q[1],col);}last=q;}
  const w=toXY(NAV.x,NAV.z),blink=(APP.t*3|0)%2;
  if(w){hDisc(w[0],w[1],2.2,PAL.white);hDisc(w[0],w[1],1.4,blink?col:PAL.white);}
  else if(edge)edge(NAV.x,NAV.z,col);
}
/* a tap or click on the big map at (hx, hy) in HUD units: near the waypoint clears it, anywhere else sets it there */
function navTap(hx,hy){const r=bigRect(),t=GAME.car,x=t.p[0]+(hx-(r[0]+r[2]/2))/r[2]*BIG_SPAN,z=t.p[2]+(hy-(r[1]+r[2]/2))/r[2]*BIG_SPAN;
  if(NAV.on){const px=r[0]+r[2]/2+(NAV.x-t.p[0])/BIG_SPAN*r[2],py=r[1]+r[2]/2+(NAV.z-t.p[2])/BIG_SPAN*r[2];if(Math.hypot(hx-px,hy-py)<5){navClear('WAYPOINT CLEARED');return;}}
  navSet(x,z);}
