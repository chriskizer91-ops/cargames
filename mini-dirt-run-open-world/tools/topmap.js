/* A top-down map of the generator's land (surface colours, hill shading) as a PPM image.
   Usage: node tools/topmap.js [centreX centreZ spanMetres pixels out.ppm] */
const fs=require('fs');const src=fs.readFileSync(require('path').join(__dirname,'..','src','worldgen.js'),'utf8');
const G=new Function(src+';return WORLDGEN;')()(6);
const [cx,cz,span,n,out]=[+(process.argv[2]||0),+(process.argv[3]||-1500),+(process.argv[4]||7000),+(process.argv[5]||700),process.argv[6]||'map.ppm'];
const C=[[54,84,30],[120,70,38],[176,140,100],[150,104,62],[112,96,84],[46,32,18],[150,148,144],[60,120,190],[178,168,146],[46,46,52],[84,58,32]];
const px=Buffer.alloc(n*n*3),o={};const H=new Float64Array(n*n);
for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=cx-span/2+(i+.5)/n*span,z=cz-span/2+(j+.5)/n*span;G.sample(x,z,o);H[j*n+i]=o.h;const c=C[o.code];const k=(j*n+i)*3;px[k]=c[0];px[k+1]=c[1];px[k+2]=c[2];}
for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i,dx=H[k+1]-H[k-1],dz=H[k+n]-H[k-n],m=span/n,sh=Math.max(.5,Math.min(1.5,1+(-dx*.6+dz*.4)/m*1.2))*(0.85+H[k]/300);for(let q=0;q<3;q++)px[k*3+q]=Math.max(0,Math.min(255,px[k*3+q]*sh));}
fs.writeFileSync(out,Buffer.concat([Buffer.from(`P6 ${n} ${n} 255\n`),px]));
