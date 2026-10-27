// Winding/normal consistency + bounds for the SUV meshes, per material.
const fs=require('fs');
const r=fs.readFileSync(__dirname+'/../src/10_sl3_render.js','utf8').split('\n');
const c=fs.readFileSync(__dirname+'/../src/11_sl3_car.js','utf8').split('\n');
let code=r.slice(218,445).join('\n')+'\n'+c.slice(0,231).join('\n')+'\n'+fs.readFileSync(__dirname+'/../src/50_suvmesh.js','utf8')+'\nreturn {buildSUV,buildSuvWheel,suvLook,SUV,MeshBuilder};';
const M=new Function(code)();
function check(B,name){
  const f=B.f,s=B.s,b=B.b,idx=B.idx,bad={},tot={};
  for(let i=0;i<idx.length;i+=3){
    const v=[idx[i],idx[i+1],idx[i+2]],P=v.map(k=>[f[k*9],f[k*9+1],f[k*9+2]]),N=v.map(k=>[s[k*18+6],s[k*18+7],s[k*18+8]]);
    const e1=[P[1][0]-P[0][0],P[1][1]-P[0][1],P[1][2]-P[0][2]],e2=[P[2][0]-P[0][0],P[2][1]-P[0][1],P[2][2]-P[0][2]];
    const g=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
    const gl=Math.hypot(...g); if(gl<1e-9)continue;
    const n=[0,1,2].map(k=>N[0][k]+N[1][k]+N[2][k]);
    const d=(g[0]*n[0]+g[1]*n[1]+g[2]*n[2])/gl/(Math.hypot(...n)||1);
    const m=b[v[0]*36+28]+':'+b[v[0]*36+29];
    tot[m]=(tot[m]||0)+1; if(d<-0.2)bad[m]=(bad[m]||0)+1;
  }
  const rows=Object.keys(tot).filter(k=>bad[k]).map(k=>`${k} ${bad[k]}/${tot[k]}`);
  console.log(name.padEnd(28),'verts',B.nv,'tris',idx.length/3,'bbox',B.mn.map(x=>x.toFixed(2)).join(','),'..',B.mx.map(x=>x.toFixed(2)).join(','),rows.length?'\n   FLIPPED '+rows.join('  '):'ok');
}
const looks=JSON.parse(process.argv[2]||'[{}]');
for(const L of looks){const m=M.buildSUV(L);check(m.body,'body '+JSON.stringify(L).slice(0,40));check(m.glass,'glass');check(M.buildSuvWheel(m.look),'wheel '+m.look.tread+'/'+m.look.wheel);}
