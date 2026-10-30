/* builds the world in Node and reports sizes, timings and a few ground samples */
globalThis.performance=globalThis.performance||{now:()=>Date.now()};
const {buildWorld}=await import('../src/world/clworld.js');
const t0=performance.now();const W=buildWorld();
console.log('world',Math.round(performance.now()-t0),'ms',W.stats,'desert ms',Math.round(W.D.ms));
const o={y:0,n:[0,0,0],surf:''};
for(const [x,y] of [[0,-60],[200,200],[383,0],[420,0],[600,0],[900,0],[1600,0],[1700,0],[2500,0],[0,900],[0,1290],[-150,-590],[660,560],[0,-860],[470,40]]){W.groundAt(x,-y,o);console.log(x,y,o.y.toFixed(2),o.surf,o.n.map(v=>v.toFixed(2)).join(','),W.placeName(x,y));}
for(const r of W.D.roads){let mx=-1e9,mn=1e9,g=0;for(let i=0;i<r.N;i++){mx=Math.max(mx,r.h[i]);mn=Math.min(mn,r.h[i]);if(i)g=Math.max(g,Math.abs(r.h[i]-r.h[i-1])/2);}console.log(r.id,r.N*2,'m','h',mn.toFixed(1),mx.toFixed(1),'max grade',(g*100).toFixed(1)+'%');}
let hmx=-1e9,hmn=1e9;for(const h of W.D.H){hmx=Math.max(hmx,h);hmn=Math.min(hmn,h);}console.log('grid h',hmn.toFixed(1),hmx.toFixed(1));
console.log('jumps',W.D.jumps.length,'lights',W.lights.length);
