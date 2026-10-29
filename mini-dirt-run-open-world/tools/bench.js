/* Times the generator in Node: a chunk's ground at each detail, its items, a far tile, single points;
   then a few sample points and Route 6's grades. Usage: node tools/bench.js */
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'..','src','worldgen.js'),'utf8');
const WORLDGEN=new Function(src+';return WORLDGEN;')();
const G=WORLDGEN(6);
const t=(f,n=1)=>{const a=performance.now();let r;for(let k=0;k<n;k++)r=f(k);return [(performance.now()-a)/n,r];};
// warm
for(let k=0;k<3;k++){G.genGround(k,-1,0);G.genStatic(k,-1);}
for(const lod of [0,1,2]){const [ms,r]=t(k=>G.genGround(5+k,3,lod),8);console.log('ground lod',lod,ms.toFixed(2),'ms tris',r.ground.tris,'water',r.water?r.water.tris:0);}
{const [ms,r]=t(k=>G.genStatic(k-4,-1),8);console.log('static',ms.toFixed(2),'ms roads tris',r.roads&&r.roads.tris,'props',r.props&&r.props.tris,'trees',r.trees.length/12,'cols',r.cols.length,'lights',r.lights.length);}
{const [ms,r]=t(k=>G.genFar(k,2),6);console.log('far',ms.toFixed(2),'ms',r.ground.tris);}
{const [ms]=t(k=>{const o={};for(let i=0;i<1000;i++)G.sample(37+i*.37,-30+k*3,o);},5);console.log('sample x1000',ms.toFixed(2),'ms');}
const o={};for(const [x,z] of [[37,-30],[0,0],[0,-200],[300,-3],[3218,0],[3218,-500],[-34,-262],[5000,-4000],[10000,0],[31000,0]]){G.sample(x,z,o);console.log(x,z,'h',o.h.toFixed(2),'surf',G.SURF[o.code],'k',o.k.toFixed(2),G.placeAt(x,z));}
console.log('towns',G.townsNear(0,0,15000).map(t=>t.name+'@'+Math.round(t.x)+','+Math.round(t.z)).join(' | '));
// hill stats along route 6
let mx=-1e9,mn=1e9,maxg=0,prev=null;for(let x=-30000;x<=30000;x+=20){const h=G.baseAt(x,0);mx=Math.max(mx,h);mn=Math.min(mn,h);if(prev!==null)maxg=Math.max(maxg,Math.abs(h-prev)/20);prev=h;}
console.log('route6 base range',mn.toFixed(1),mx.toFixed(1),'max grade',(maxg*100).toFixed(1)+'%');
