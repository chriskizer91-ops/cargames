/* Screenshots of Shiftlight 3, for comparing looks.
   usage: node tools/shot_sl3.js <shiftlight.html> <out-dir> name:quality:env:level[:x,z] ...
   quality: mobile low medium high ultra · env: rain night dusk day · level: city or loop
   x,z puts the car there first (1100,40 is out on the Flats, west of the city).
   e.g.   node tools/shot_sl3.js ../shiftlight3/dist/shiftlight.html /tmp/shots rain:mobile:rain:city flats:mobile:rain:city:1100,40
   Software rendering: a minute or two a shot. */
const {chromium}=require('playwright');
const [file,out,...jobs]=process.argv.slice(2);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const j of jobs){
    const [name,q,env,level,at]=j.split(':');const t0=Date.now();
    const p=await b.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
    await p.goto('file://'+require('path').resolve(file)+`?manual&quality=${q}&env=${env}&level=${level||'city'}&scale=1`);
    await p.waitForFunction(()=>window.__game&&window.__game.ready,null,{timeout:400000,polling:1000});
    await p.evaluate(at=>{const g=window.__game;g.begin();
      if(at){const [x,z]=at.split(',').map(Number);g.car.p=[x,5,z];g.level.resetAt(g.car);if(g.cam)g.cam.cut=true;}},at||'');
    /* enough frames for TAA, exposure and the camera to settle */
    for(let i=0;i<70;i++)await p.evaluate(()=>window.__game.frame(1/60));
    await p.screenshot({path:`${out}/${name}.png`,timeout:300000});
    console.log(name,((Date.now()-t0)/1000).toFixed(0)+'s',await p.evaluate(()=>JSON.stringify(window.__game.stats())),errs.slice(0,3).join(' | '));
    await p.close();
  }
  await b.close();
})();
