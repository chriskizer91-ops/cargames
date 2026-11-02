/* =====================================================================================
   THE MATERIALS, as the SUV Studio has them (suv-studio/src/studio/main.js, copied): each of the game's material ids,
   and the studio's own, as a physically based three.js material, and the builders' flat arrays turned into meshes.
   ===================================================================================== */
export function makeMats(THREE,K){
const MAT=K.MAT,SM=K.SM;
/* ---------- the materials: the game's ids, as physically based surfaces ---------- */
/* a fine grain for textured plastic and tyre rubber: a tiling normal map made here */
function grainMap(n,amp,seed){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),im=g.createImageData(n,n);
  let s=seed;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};const h=new Float32Array(n*n);for(let i=0;i<n*n;i++)h[i]=r();
  /* blur once so the grain is pebbly, not pixel noise */
  const b=new Float32Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let t=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)t+=h[((y+dy+n)%n)*n+(x+dx+n)%n];b[y*n+x]=t/9;}
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,dx=b[y*n+(x+1)%n]-b[y*n+(x-1+n)%n],dy=b[((y+1)%n)*n+x]-b[((y-1+n)%n)*n+x];
    const nx=-dx*amp,ny=-dy*amp,l=Math.hypot(nx,ny,1);im.data[i*4]=(nx/l*.5+.5)*255;im.data[i*4+1]=(ny/l*.5+.5)*255;im.data[i*4+2]=(1/l*.5+.5)*255;im.data[i*4+3]=255;}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;return t;}
const GRAIN=grainMap(256,6,7);GRAIN.repeat.set(1,1);
const col=h=>new THREE.Color(h);
let B=null;
/* (the game draws every face from both sides: its builders do not keep one winding) */
const P=(o)=>new THREE.MeshPhysicalMaterial({side:THREE.DoubleSide,...o});
/* the cabin's surfaces see little of the studio's light through the glass: their share of the reflections and the
   room's light is cut (a stand-in for the occlusion a closed cabin has) */
const INSIDE=new Set();
function matFor(id,em,b){const m=matFor0(id,em,b);if(INSIDE.has(id)){m.envMapIntensity=.32;}return m;}
function matFor0(id,em,b){
  const vc={vertexColors:true};
  switch(id){
    case MAT.PAINT:return P({color:col(b.paint),metalness:.1,roughness:.5,clearcoat:1,clearcoatRoughness:.03});
    case MAT.ACCENT:return P({color:col(b.paint2),metalness:.22,roughness:.42,clearcoat:1,clearcoatRoughness:.03});
    case MAT.GLASS:return P({color:col('#05070a'),metalness:0,roughness:.02,transparent:true,opacity:.72,depthWrite:false,envMapIntensity:1.4,specularIntensity:1});
    case MAT.GLASSL:return P({color:col('#0a0e12'),metalness:0,roughness:.02,transparent:true,opacity:.42,depthWrite:false,envMapIntensity:1.4,specularIntensity:1});
    case MAT.CHROME:return P({color:col('#f1f2f4'),metalness:1,roughness:.045});
    case MAT.TYRE:return P({color:col('#1b1b1d'),roughness:.88,normalMap:GRAIN,normalScale:new THREE.Vector2(.25,.25)});
    case MAT.TAIL:return P({color:col('#7a0a06'),roughness:.08,metalness:.1,clearcoat:1,clearcoatRoughness:.02,emissive:col('#ff1206'),emissiveIntensity:.05});
    case MAT.HEAD:return P({color:col('#d8dce0'),metalness:.95,roughness:.07,clearcoat:1,clearcoatRoughness:.01});
    case MAT.LED:return P({color:col('#ffffff'),emissive:col('#dfe8ff'),emissiveIntensity:1.2});
    case MAT.AMBER:return P({color:col('#c9661c'),roughness:.08,metalness:.15,clearcoat:1,clearcoatRoughness:.02,emissive:col('#ff7a10'),emissiveIntensity:.04});
    case MAT.MESH:return P({color:col('#0c0c0d'),roughness:.55,metalness:.2});
    case MAT.RIM:return P({color:col(b.rim),metalness:1,roughness:.22});
    case MAT.CLAD:return P({color:col(b.clad),roughness:.74,normalMap:GRAIN,normalScale:new THREE.Vector2(.25,.25)});
    case MAT.SHUT:return P({color:col('#0a0a0a'),roughness:.7});
    case MAT.EMIT:return P({...vc,emissive:col('#ffffff'),emissiveIntensity:1});
    case MAT.METAL:return P({...vc,metalness:.55,roughness:.45});
    case MAT.CARBON:return P({color:col('#151517'),roughness:.25,clearcoat:.8});
    case MAT.LOUVRE:return P({color:col('#101012'),roughness:.6});
    case MAT.CALIPER:return P({color:col(b.cal),roughness:.35,metalness:.2,clearcoat:.6});
    case MAT.ROTOR:return P({color:col('#7a7a7e'),metalness:.9,roughness:.32});
    case MAT.PLATE:return P({color:col('#d9d8cf'),roughness:.4,metalness:.1});
    case MAT.REV:return P({color:col('#e6e8ea'),metalness:.9,roughness:.06,clearcoat:1});
    case MAT.SMOKE:return P({color:col('#0b0a09'),roughness:.05,clearcoat:1});
    case MAT.REFL:return P({color:col('#9a8a76'),metalness:1,roughness:.25});
    case MAT.FABRIC:return P({...vc,roughness:1,sheen:.6,sheenRoughness:.8});
    case MAT.RUBBER:return P({...vc,roughness:.85});
    case MAT.HALO:return P({color:col('#ffffff'),emissive:col('#cfe0ff'),emissiveIntensity:.8});
    /* the studio's own (src/hd/70_geo SM) */
    case SM.LENS:return P({color:col('#ffffff'),metalness:0,roughness:.01,transmission:1,thickness:.004,ior:1.49,transparent:true,depthWrite:false,envMapIntensity:1.2});
    case SM.BULB:return P({color:col('#fffaf0'),emissive:col('#fff3dc'),emissiveIntensity:.25,roughness:.1});
    case SM.GLOSSBLK:return P({...vc,roughness:.12,clearcoat:1,clearcoatRoughness:.05});
    case SM.VINYL:return P({...vc,roughness:.62,normalMap:GRAIN,normalScale:new THREE.Vector2(.15,.15)});
    case SM.CARPET:return P({...vc,roughness:1,sheen:1,sheenRoughness:.9,sheenColor:col('#555'),normalMap:GRAIN,normalScale:new THREE.Vector2(1.2,1.2)});
    case SM.DASH:return P({...vc,roughness:.75,normalMap:GRAIN,normalScale:new THREE.Vector2(.35,.35)});
    case SM.TREAD:return P({...vc,roughness:.92,normalMap:GRAIN,normalScale:new THREE.Vector2(.4,.4)});
    case SM.WALL:return P({...vc,roughness:.78,normalMap:GRAIN,normalScale:new THREE.Vector2(.12,.12)});
    case SM.BRUSH:return P({...vc,metalness:1,roughness:.16});
    case SM.LUG:return P({color:col('#eceef0'),metalness:1,roughness:.06});
    case SM.ROTORF:return P({...vc,metalness:.85,roughness:.38});
    case SM.REFLC:return P({color:col('#f4f5f6'),metalness:1,roughness:.04});
    case SM.AMBERL:return P({color:col('#ff8a1e'),metalness:0,roughness:.02,transmission:.75,thickness:.004,ior:1.49,transparent:true,depthWrite:false,attenuationColor:col('#ff7a00'),attenuationDistance:.006});
    case SM.REDL:return P({color:col('#d0160c'),metalness:0,roughness:.03,transmission:.55,thickness:.005,ior:1.49,transparent:true,depthWrite:false,attenuationColor:col('#c00a04'),attenuationDistance:.004});
    case SM.SEAT:return P({...vc,roughness:.9,sheen:.5,sheenRoughness:.7,sheenColor:col('#666'),normalMap:GRAIN,normalScale:new THREE.Vector2(.6,.6)});
    case SM.HEADLINER:return P({...vc,roughness:1,sheen:.4,sheenRoughness:.9});
    case SM.GAUGE:return P({...vc,roughness:.3,emissive:col('#ffffff'),emissiveIntensity:0});
    case SM.SATIN:return P({...vc,metalness:.8,roughness:.32});
    case SM.BOLT:return P({...vc,metalness:1,roughness:.3});
    case SM.SEAL:return P({...vc,roughness:.7});
    case SM.MIRROR:return P({color:col('#ffffff'),metalness:1,roughness:.0});
    case SM.TINT:return P({color:col('#000000'),metalness:0,roughness:.03,transparent:true,opacity:.6,depthWrite:false});
    case SM.HONEY:return P({...vc,roughness:.35,clearcoat:.5});
    case SM.CAST:return P({...vc,metalness:.7,roughness:.55});
    case SM.CLADS:return P({color:col(b.clad),roughness:.72});
    case SM.LINER:return P({...vc,roughness:.8,normalMap:GRAIN,normalScale:new THREE.Vector2(.4,.4)});
    default:return P({...vc,roughness:.55,...(em>0?{emissive:col('#ffffff'),emissiveIntensity:1}:{})});
  }
}
/* one builder's flat arrays as a set of meshes, one per material (so glass sorts after everything solid) */
function meshes(src,name,b){
  const P=src.p,N=src.n,C=src.c,M=src.m,nt=P.length/9,by=new Map();
  for(let t=0;t<nt;t++){const id=M[t*3]|0,em=C[t*12+3]>0?1:0,k=id*2+em;let a=by.get(k);if(!a)by.set(k,a=[]);a.push(t);}
  const g=new THREE.Group();g.name=name;
  for(const [k,ts] of by){const id=k>>1,em=k&1,n=ts.length,pp=new Float32Array(n*9),nn=new Float32Array(n*9),cc=new Float32Array(n*9);
    for(let i=0;i<n;i++){const t=ts[i],o=t*9;
      /* the game keeps no one winding (its two sides are mirrored in the same order): each triangle is turned so its own
         facing agrees with its normals, or a double-sided material, taking it as seen from behind, would light it from
         the inside */
      const ux=P[o+3]-P[o],uy=P[o+4]-P[o+1],uz=P[o+5]-P[o+2],vx=P[o+6]-P[o],vy=P[o+7]-P[o+1],vz=P[o+8]-P[o+2],
        gx=uy*vz-uz*vy,gy=uz*vx-ux*vz,gz=ux*vy-uy*vx,ok=gx*(N[o]+N[o+3]+N[o+6])+gy*(N[o+1]+N[o+4]+N[o+7])+gz*(N[o+2]+N[o+5]+N[o+8])>=0,ord=ok?[0,1,2]:[0,2,1];
      for(let v=0;v<3;v++){const s=ord[v];for(let k=0;k<3;k++){pp[i*9+v*3+k]=P[o+s*3+k];nn[i*9+v*3+k]=N[o+s*3+k];cc[i*9+v*3+k]=C[t*12+s*4+k];}}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pp,3));geo.setAttribute('normal',new THREE.BufferAttribute(nn,3));geo.setAttribute('color',new THREE.BufferAttribute(cc,3));
    if(MAT_UV[id])addUV(geo,MAT_UV[id]);
    const m=new THREE.Mesh(geo,matFor(id,em,b));m.castShadow=!(id===MAT.GLASS||id===MAT.GLASSL);m.receiveShadow=id!==SM.LINER;m.userData.mat=id;g.add(m);}
  return g;
}
/* a box projection for the grain maps (textured plastic, rubber): metres times k */
const MAT_UV={};for(const k of ['VINYL','CARPET','DASH','SEAT','HEADLINER','GAUGE'])INSIDE.add(SM[k]);MAT_UV[MAT.CLAD]=18;MAT_UV[MAT.TYRE]=30;
for(const [k,v] of [['LINER',24],['TREAD',40],['WALL',36],['VINYL',14],['CARPET',30],['DASH',20],['SEAT',16]])MAT_UV[SM[k]]=v;
function addUV(geo,k){const p=geo.attributes.position.array,n=geo.attributes.normal.array,uv=new Float32Array(p.length/3*2);
  for(let i=0;i<p.length/3;i++){const ax=Math.abs(n[i*3]),ay=Math.abs(n[i*3+1]),az=Math.abs(n[i*3+2]);let u,v;
    if(ax>=ay&&ax>=az){u=p[i*3+2];v=p[i*3+1];}else if(ay>=az){u=p[i*3];v=p[i*3+2];}else{u=p[i*3];v=p[i*3+1];}uv[i*2]=u*k;uv[i*2+1]=v*k;}
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));}

return {meshes,matFor,GRAIN};
}
