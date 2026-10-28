/* Builds the ranch in Node and reports its size, the tiles it draws, and what the ground is like at
   each area. usage: node tools/ranch_check.js */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Uint16Array,Uint32Array,Number,String,JSON,Set,Map,isFinite,isNaN,performance};
vm.createContext(ctx);
vm.runInContext('const MAT={COL:0,EMIT:15};'+src('60_ranch.js')+'\nthis.Ranch=Ranch;',ctx);
const t0=performance.now(),W=ctx.Ranch.buildRanch(),ms=performance.now()-t0;
let tiles=0,tris=0,verts=0,maxT=0;for(const B of W.geo.tiles.values()){if(!B.idx.length)continue;tiles++;tris+=B.idx.length/3;verts+=B.nv;maxT=Math.max(maxT,B.idx.length/3);}
console.log(`built in ${ms.toFixed(0)} ms: grid ${W.N}x${W.N} at ${W.cell} m, prop tiles ${tiles}, ${verts} verts, ${tris} tris (largest tile ${maxT})`);
console.log('colliders',W.colliders.list.length,'gates',W.gates.length,'loop',W.loop.len.toFixed(0),'m climb',W.climb.len.toFixed(0),'m mud track',W.mudTrack.len.toFixed(0),'m');
const at=(n,x,z)=>{const g=W.groundAt(x,z);console.log(`${n.padEnd(12)} (${x},${z}) y ${g.y.toFixed(2)} ${g.surf} slope ${(Math.acos(g.n[1])*57.3).toFixed(1)}°`);};
const D=W.D;at('shop pad',0,0);at('strip',100,D.strip.z);at('mud pit',D.mud.x,D.mud.z);at('burnout',D.burn.x,D.burn.z);
at('rock garden',D.rocks.x0+31,D.rocks.z0+22);at('hill top',D.hill.x,D.hill.z);at('climb start',D.climb[0][0],D.climb[0][1]);at('loop',D.loop[3][0],D.loop[3][1]);at('mud track',D.mudTrack[2][0],D.mudTrack[2][1]);
let hmin=1e9,hmax=-1e9;for(const h of W.H){hmin=Math.min(hmin,h);hmax=Math.max(hmax,h);}console.log('height range',hmin.toFixed(1),hmax.toFixed(1));
const world=new ctx.Ranch.RanchWorld(W);const r=world.raycast([0,5,0],[0,-1,0],10);console.log('raycast at shop',r&&r.t.toFixed(3),r&&r.surf);
