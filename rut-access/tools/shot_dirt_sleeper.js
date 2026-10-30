/* Screenshots of the original Dirt Sleeper (dirt-sleeper/ on main), for comparing looks.
   usage: node tools/shot_dirt_sleeper.js <dirt-sleeper.local.html> <out-dir> name:quality:env:event ...
   quality: low medium high ultra · env: afternoon dusk night · event: trail climb bog roam
   e.g.   node tools/shot_dirt_sleeper.js ../dirt-sleeper/dist/dirt-sleeper.local.html /tmp/shots best:ultra:afternoon:trail
   Software rendering: three to four minutes a shot. */
const {chromium}=require('playwright');
const [file,out,...jobs]=process.argv.slice(2);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const j of jobs){
    const [name,q,env,ev]=j.split(':');const t0=Date.now();
    const p=await b.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
    await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
    await p.goto('file://'+require('path').resolve(file)+`?q=${q}&manual&fixed`);
    await p.waitForFunction(()=>window.__game&&window.__game.ready,null,{timeout:400000,polling:1000});
    await p.evaluate(([env,ev])=>{const g=window.__game;g.chooseMode('free');g.startEvent(ev||'roam');g.setEnv(env);},[env,ev]);
    for(let i=0;i<40;i++)await p.evaluate(()=>window.__game.frame(1/60));
    await p.screenshot({path:`${out}/${name}.png`,timeout:300000});
    console.log(name,((Date.now()-t0)/1000).toFixed(0)+'s',errs.slice(0,3).join(' | '));
    await p.close();
  }
  await b.close();
})();
