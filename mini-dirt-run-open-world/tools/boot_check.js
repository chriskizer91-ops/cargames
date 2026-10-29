/* Loads the page and prints the world's state every 1.5 s: worker or main thread, chunks, what's been made, holes.
   Usage: node tools/boot_check.js [page.html] */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:960,height:540}});
  const errs=[];p.on('console',m=>{if(m.type()!=='warning'||/worker/i.test(m.text()))errs.push(m.type()+': '+m.text().slice(0,300));});p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p.goto('file://'+(process.argv[2]||require('path').join(__dirname,'..','dist','mini-dirt-run-open-world.html')));
  for(let k=0;k<3;k++){await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{const g=window.__game;if(!g)return 'no game';const W=g.WORLD;return {mode:W.mode,inflight:W.inflight,pend:W.pend.size,chunks:W.chunks.size,far:W.far.size,n:W.st.n,sn:W.st.sn,fn:W.st.fn,q:W.st.queue,holes:W.st.holes,fps:g.APP.fps.toFixed(1),loading:document.getElementById('loading').hidden};});
    console.log(JSON.stringify(r));}
  console.log(errs.slice(0,20).join('\n'));
  await b.close();
})();
