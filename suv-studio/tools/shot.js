/* Pictures of the studio, drawn frame by frame (the page's loop held).
   usage: node tools/shot.js <out-dir> view[:back[:hood]] ...    e.g. front34 rear34:dark wheel bay::open
   env: W, H (viewport, 1280 x 800), PAGE (another built page), Q (extra query, e.g. lod=1) */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const out=process.argv[2]||'/tmp/studio',shots=process.argv.slice(3);fs.mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||1280),height:+(process.env.H||800)}});const errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  const t0=Date.now();
  await p.goto('file://'+path.resolve(process.env.PAGE||path.join(__dirname,'..','suv-studio.html'))+'?'+(process.env.Q||''));
  await p.waitForFunction(()=>window.STUDIO,null,{timeout:600000,polling:500});
  await p.evaluate(()=>STUDIO.hold(true));
  console.log('booted',((Date.now()-t0)/1000).toFixed(0)+'s',JSON.stringify(await p.evaluate(()=>STUDIO.stats())));
  for(const s of shots.length?shots:['front34']){const [v,bk,hd]=s.split(':');const t1=Date.now();
    const d=await p.evaluate(([v,bk,hd])=>{STUDIO.setBack(bk||'light');STUDIO.setHood(hd==='open');STUDIO.settle();STUDIO.setView(v);STUDIO.snap();return STUDIO.snap();},[v,bk,hd]);
    const f=path.join(out,s.replace(/:/g,'_')+'.png');fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));console.log('saved',f,((Date.now()-t1)/1000).toFixed(0)+'s');}
  if(errs.length)console.log('page errors:',errs.slice(0,5));else console.log('no page errors');
  await b.close();
})();
