/* Builds the world in Node and writes a top-down map (surface colours, hill shading, a 100 m grid,
   north up) as a PPM, for checking the layout. usage: node tools/world_map.js out.ppm [px] */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Uint16Array,Uint32Array,Number,String,JSON,Set,Map,isFinite,isNaN,performance};
vm.createContext(ctx);
const has=f=>fs.existsSync(path.join(__dirname,'..','src',f));
vm.runInContext('const MAT={COL:0,EMIT:15};'+(has('59_country.js')?src('59_country.js'):'')+src('60_ranch.js')+'\nthis.Ranch=Ranch;',ctx);
const t0=performance.now(),Wd=ctx.Ranch.buildRanch();console.log('built in',(performance.now()-t0).toFixed(0),'ms');
const out=process.argv[2]||'map.ppm',n=+(process.argv[3]||800),span=Wd.D.size,px=Buffer.alloc(n*n*3);
const C={grass:[64,96,36],dirt:[140,84,46],strip:[186,150,108],trail:[160,112,66],rock:[120,104,92],mud:[52,36,20],concrete:[170,168,164],water:[50,110,200],gravel:[190,184,170],asphalt:[40,40,44],ruts:[90,60,30]};
for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=-span/2+(i+.5)/n*span,z=-span/2+(j+.5)/n*span,g=Wd.groundAt(x,z),c=C[g.surf]||[255,0,255];
  const sh=.55+.6*Math.max(0,Math.min(1,g.n[0]*.6-g.n[2]*.5+g.n[1]*.45)),hh=Math.max(.7,Math.min(1.3,.85+g.y/150));
  let r=c[0]*sh*hh,gg=c[1]*sh*hh,b=c[2]*sh*hh;
  if(Math.abs(x%100)<span/n||Math.abs(z%100)<span/n){r=r*.7+60;gg=gg*.7+60;b=b*.7+60;}
  const o=(j*n+i)*3;px[o]=Math.min(255,r);px[o+1]=Math.min(255,gg);px[o+2]=Math.min(255,b);}
/* trees and colliders as dots */
const dot=(x,z,col)=>{const i=Math.floor((x+span/2)/span*n),j=Math.floor((z+span/2)/span*n);if(i<0||j<0||i>=n||j>=n)return;const o=(j*n+i)*3;px[o]=col[0];px[o+1]=col[1];px[o+2]=col[2];};
for(const c of Wd.colliders.list)if(c.t==='c')dot(c.x,c.z,[20,50,20]);else for(let x=c.x0;x<=c.x1;x+=1)for(let z=c.z0;z<=c.z1;z+=1)dot(x,z,[230,230,230]);
fs.writeFileSync(out,Buffer.concat([Buffer.from(`P6 ${n} ${n} 255\n`),px]));
let hmin=1e9,hmax=-1e9;for(const h of Wd.H){hmin=Math.min(hmin,h);hmax=Math.max(hmax,h);}console.log('grid',Wd.N,'heights',hmin.toFixed(1),hmax.toFixed(1),'colliders',Wd.colliders.list.length);
