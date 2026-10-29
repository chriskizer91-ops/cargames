/* Finds a wet creek near a road (for screenshots) and lists the towns near the garage. Usage: node tools/find.js */
const fs=require('fs');const src=fs.readFileSync(require('path').join(__dirname,'..','src','worldgen.js'),'utf8');
const G=new Function(src+';return WORLDGEN;')()(6);
// a wet creek close to a road, not far from the garage
let best=null;const o={};
for(let x=-6000;x<=6000;x+=40)for(let z=-6000;z<=6000;z+=40){const c=G.creekAt(x,z,{});if(c.wet&&c.dc<3){const r=G.roadAt(x,z);if(r&&Math.abs(r.d)>25&&Math.abs(r.d)<60){const d=Math.hypot(x,z);if(!best||d<best.d)best={x,z,d,r:r.d,cls:r.cls};}}}
console.log('creek',JSON.stringify(best));
const towns=G.townsNear(0,0,20000);console.log('towns',towns.length,towns.slice(0,8).map(t=>t.name+'@'+Math.round(t.x/1609)+','+Math.round(t.z/1609)).join(' '));
