/* The truck as the studio builds it, written out for another program (Blender: tools/cycles_render.py): every part
   split by material, each a flat triangle list (Float32 positions, normals and colours), with where each piece goes.
   usage: node tools/export_parts.js <out-dir> [lod]      (lod 0.25 by default, as the page) */
const vm=require('vm'),fs=require('fs'),path=require('path');
const S=path.join(__dirname,'..','src'),out=process.argv[2]||'/tmp/suv-export',lod=+(process.argv[3]||.25);
const files=[...fs.readdirSync(S+'/game').sort().map(f=>S+'/game/'+f),...fs.readdirSync(S+'/hd').sort().map(f=>S+'/hd/'+f)];
const ctx={console,performance:{now:()=>Date.now()},window:{},Math,JSON};vm.createContext(ctx);
vm.runInContext(files.map(f=>fs.readFileSync(f,'utf8')).join('\n;\n'),ctx);
const K=ctx.window.KIT,T=K.studioBuild('stock',lod),b=T.b,D=T.D;fs.mkdirSync(out,{recursive:true});
const man={build:{paint:b.paint,paint2:b.paint2,rim:b.rim,cal:b.cal,clad:b.clad},MAT:K.MAT,SM:K.SM,pieces:[]};let k=0;
function put(src,name,M){const P=src.p,N=src.n,C=src.c,Mt=src.m,by=new Map();
  for(let t=0;t<P.length/9;t++){const id=Mt[t*3]|0;let a=by.get(id);if(!a)by.set(id,a=[]);a.push(t);}
  for(const [id,ts] of by){const n=ts.length,pp=new Float32Array(n*9),nn=new Float32Array(n*9),cc=new Float32Array(n*12);
    ts.forEach((t,i)=>{for(let j=0;j<9;j++){pp[i*9+j]=P[t*9+j];nn[i*9+j]=N[t*9+j];}for(let j=0;j<12;j++)cc[i*12+j]=C[t*12+j];});
    const f='p'+(k++);fs.writeFileSync(path.join(out,f+'.bin'),Buffer.concat([Buffer.from(pp.buffer),Buffer.from(nn.buffer),Buffer.from(cc.buffer)]));
    man.pieces.push({file:f,name,mat:id,tris:n,M});}}
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
put(T.body,'body',I);put(T.hood,'hood',I);put(T.hide,'hide',I);
for(const [nm,src] of Object.entries(T.hd))if(src&&src.p)put(src,nm,I);
const fx=D.X(D.uFa),R=b.look.tyre.R,wb=D.uRa-D.uFa;
for(const front of [1,0])for(const s of [1,-1]){const x=front?fx:fx-wb*Math.cos(D.pitch),tw=b.look.track/2;
  put(front?T.wheel:T.wheelR,'wheel',[1,0,0,0,0,1,0,0,0,0,s,0,x,front?R:D.Rr,s*tw,1]);}
for(const sp of D.spares||[])put(T.wheel,'spare',[1,0,0,0,0,1,0,0,0,0,sp.p[2]<0?-1:1,0,sp.p[0],sp.p[1],sp.p[2],1]);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(man));
console.log(man.pieces.length,'pieces,',man.pieces.reduce((a,p)=>a+p.tris,0),'triangles');
