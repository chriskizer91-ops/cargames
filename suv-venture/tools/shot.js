/* Pictures of SUV, drawn frame by frame (the page's loop held): for each truck, drive a little, then the chase camera.
   usage: node tools/shot.js <out-dir> truck[:seconds[:steer]] ...      e.g. game studio:3:.4 baked
   env: W, H (viewport, 1280 x 720), LOT=1 (the ten-truck lot on), LOOK=1 (the free camera, from the side) */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const out=process.argv[2]||'/tmp/suv',shots=process.argv.slice(3);fs.mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||1280),height:+(process.env.H||720)}});const errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  const t0=Date.now();await p.goto('file://'+path.resolve(path.join(__dirname,'..','suv-venture.html'))+'?shots=1');
  await p.waitForFunction(()=>window.SUV,null,{timeout:600000,polling:500});await p.evaluate(()=>SUV.hold(true));
  console.log('booted',((Date.now()-t0)/1000).toFixed(0)+'s');
  if(process.env.LOT)await p.evaluate(()=>SUV.lot(true));
  if(process.env.VIEW)await p.evaluate(v=>SUV.view(...JSON.parse(v)),process.env.VIEW);
  for(const s of shots.length?shots:['game']){const [k,sec,st]=s.split(':');const t1=Date.now();
    await p.evaluate(([k])=>{SUV.spawn();SUV.setTruck(k);SUV.snap();},[k]);await p.waitForTimeout(2500);
    const r=await p.evaluate(([k,sec,st])=>{SUV.step(+(sec||2.5),{steer:+(st||0),thr:.7,brk:0,hb:0});SUV.snap();
      const T=SUV.TRUCKS[k];return {tris:Math.round(T.tris),build:Math.round(T.buildMs),mph:Math.round(SUV.car.speed*2.237),img:SUV.snap()};},[k,sec,st]);
    const f=path.join(out,s.replace(/[:.]/g,'_')+'.png');fs.writeFileSync(f,Buffer.from(r.img.split(',')[1],'base64'));
    console.log('saved',f,'truck triangles',r.tris,'built in',r.build,'ms',r.mph,'mph',((Date.now()-t1)/1000).toFixed(0)+'s');}
  console.log(errs.length?'page errors: '+errs.slice(0,5).join(' | '):'no page errors');await b.close();
})();
