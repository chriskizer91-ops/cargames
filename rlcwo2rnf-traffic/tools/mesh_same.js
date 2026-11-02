/* Proof that the cars' meshes are what they were: every build's full car (truck) and coarse copy (truckFar) built in
   this page and in another (FILE, e.g. ../wide-open-2/wide-open-2.html), with each vertex buffer the GPU is handed
   fingerprinted on the way (FNV-1a over its bytes). Prints the builds whose fingerprints differ, if any.
   usage: node tools/mesh_same.js [other page]      (default ../wide-open-2/wide-open-2.html) */
const {chromium}=require('playwright');const path=require('path');
const pages=[path.resolve(__dirname,'..','rlcwo2rnf-traffic.html'),path.resolve(process.argv[2]||path.resolve(__dirname,'..','..','wide-open-2','wide-open-2.html'))];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const res=[];
  for(const file of pages){const p=await b.newPage({viewport:{width:480,height:270}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
    await p.goto('file://'+file+'?quality=mobile');
    await p.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:600000,polling:1000});
    const r=await p.evaluate(()=>{const g=window.__game,gl=g.gl,o=WebGL2RenderingContext.prototype.bufferData;let h=0x811c9dc5>>>0,n=0;
      gl.bufferData=function(t,d,u){if(d&&d.buffer&&t===gl.ARRAY_BUFFER){const v=new Uint8Array(d.buffer,d.byteOffset,d.byteLength);for(let i=0;i<v.length;i++){h^=v[i];h=Math.imul(h,0x01000193)>>>0;}n+=v.length;}return o.apply(this,arguments);};
      const out={};for(let i=0;i<g.BUILDS.length;i++){const bd=g.BUILDS[i];h=0x811c9dc5>>>0;n=0;
        /* (fresh: whatever the boot already built is let go first, so each is built here) */
        delete g.TRUCK[bd.id];delete g.TRUCKF[bd.id];g.truck(i);g.truckFar(i);out[bd.id]=h.toString(16)+':'+n;}
      return out;});
    res.push(r);if(errs.length)console.log(path.basename(file),'page errors:',errs.slice(0,3));await p.close();}
  const [A,B]=res,ids=Object.keys(A);let diff=0;
  for(const id of ids)if(A[id]!==B[id]){diff++;console.log('DIFFERS',id,A[id],B[id]);}
  console.log(ids.length,'builds,',diff?diff+' differ':'every mesh identical, byte for byte');
  await b.close();process.exit(diff?1:0);
})();
