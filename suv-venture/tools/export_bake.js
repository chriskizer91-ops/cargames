/* The two trucks the bake needs (tools/bake.py), written out as flat triangle lists:
   - low: the game's own stock truck (the game's builders at the game's resolution, the game's face, tail and wheel),
     split into its skin (what gets baked), its glass and its underside (left plain);
   - high: the studio's truck (src/hd on, the body four times finer), without its clear glass and lenses (the bake
     looks through them to what is behind) and without the cabin (the game's glass can't be seen through).
   Each list: Float32 positions (9 a triangle), normals (9), colours (12, rgb + emissive) and one material id a triangle.
   usage: node tools/export_bake.js <out-dir> */
const vm=require('vm'),fs=require('fs'),path=require('path');
const S=path.join(__dirname,'..','src'),out=process.argv[2]||path.join(__dirname,'..','bake','in');
const files=[...fs.readdirSync(S+'/game').sort().map(f=>S+'/game/'+f),...fs.readdirSync(S+'/hd').sort().map(f=>S+'/hd/'+f)];
const ctx={console,performance:{now:()=>Date.now()},window:{},Math,JSON};vm.createContext(ctx);
vm.runInContext(files.map(f=>fs.readFileSync(f,'utf8')).join('\n;\n'),ctx);
const K=ctx.window.KIT,MAT=K.MAT,SM=K.SM;fs.mkdirSync(out,{recursive:true});
const man={MAT,SM,pieces:{}};
function write(name,list){/* list: [src, filter(t, mat, colour) or null] */
  const P=[],N=[],C=[],M=[];
  for(const [src,keep] of list){const p=src.p;for(let t=0;t<p.length/9;t++){const m=src.m[t*3]|0;if(keep&&!keep(t,m,src.c[t*12]))continue;
    for(let k=0;k<9;k++){P.push(p[t*9+k]);N.push(src.n[t*9+k]);}for(let k=0;k<12;k++)C.push(src.c[t*12+k]);M.push(m);}}
  const b=[new Float32Array(P),new Float32Array(N),new Float32Array(C),new Float32Array(M)].map(a=>Buffer.from(a.buffer));
  fs.writeFileSync(path.join(out,name+'.bin'),Buffer.concat(b));man.pieces[name]={tris:M.length};}
/* the game's truck */
K.setHD(false);const G=K.studioBuild('stock',1);
const UNDER=.028,isGlass=m=>m===MAT.GLASS||m===MAT.GLASSL,isUnder=(m,c)=>m===MAT.METAL&&Math.abs(c-UNDER)<1e-4;
const parts=[G.body,G.hood,G.hide];
write('low_skin',parts.map(s=>[s,(t,m,c)=>!isGlass(m)&&!isUnder(m,c)]));
write('low_glass',parts.map(s=>[s,(t,m)=>isGlass(m)]));
write('low_under',parts.map(s=>[s,(t,m,c)=>isUnder(m,c)]));
write('low_wheel',[[G.wheel,null]]);
man.D={uC:G.D.uC,uFa:G.D.uFa,uRa:G.D.uRa,R:G.b.look.tyre.R,track:G.b.look.track,pitch:G.D.pitch,spares:G.D.spares||null};
/* the studio's truck */
K.setHD(true);const H=K.studioBuild('stock',.25);
const clear=m=>m===MAT.GLASS||m===MAT.GLASSL||m===SM.LENS||m===SM.TINT;
const hi=[[H.body,(t,m)=>!clear(m)],[H.hood,(t,m)=>!clear(m)],[H.hide,(t,m)=>!clear(m)]];
for(const [nm,src] of Object.entries(H.hd))if(src&&src.p&&nm!=='cabin')hi.push([src,(t,m)=>!clear(m)]);
write('high_body',hi);write('high_wheel',[[H.wheel,(t,m)=>!clear(m)]]);
man.build={paint:H.b.paint,paint2:H.b.paint2,rim:H.b.rim,cal:H.b.cal,clad:H.b.clad};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(man,null,1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(man.pieces).map(([k,v])=>[k,v.tris]))));
