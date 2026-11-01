/* Boot the built page headless in Chromium (Node Playwright, SwiftShader), let it run its own loop for a while, and
   report: page errors, the world's state and the frame rate it managed, plus a screenshot.
   usage: node tools/boot_node.js [seconds=8] [out.png] [gfx level]      env: FILE (another built page), W, H
   (The python tools in this folder want the Python Playwright package; this one needs only the Node package that is
   already installed here: require('playwright').) */
const {chromium}=require('playwright');const path=require('path');
const secs=+(process.argv[2]||8),out=process.argv[3]||'',gfx=process.argv[4]||'';
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||960),height:+(process.env.H||540)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  /* (the game takes its graphics level from its saved setting, rt-gfx: there is no ?gfx= in the address) */
  await p.addInitScript(gfx=>{try{localStorage.clear();if(gfx)localStorage.setItem('rt-gfx',gfx);}catch(e){}},gfx);
  const t0=Date.now();
  await p.goto('file://'+file);
  try{await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:400000,polling:1000});}
  catch(e){errs.push('boot timed out');}
  const boot=(Date.now()-t0)/1000;
  await p.waitForTimeout(secs*1000);
  const r=await p.evaluate(()=>{const g=window.__game;if(!g)return null;const G=g.GAME||{};const car=G.car;
    return {state:G.state,gfx:g.GFX&&g.GFX.level,car:car?{p:car.p.map(v=>+v.toFixed(1)),speed:+car.speed.toFixed(1)}:null,fps:g.APP&&g.APP.fps?+g.APP.fps.toFixed(1):null,tris:g.APP&&g.APP.tris,
      world:g.WORLD?{mode:g.WORLD.mode,chunks:g.WORLD.chunks&&g.WORLD.chunks.size}:null,keys:Object.keys(g).length};});
  /* a frame through the game's own snap (the loop held), as the python tools take it; a page screenshot can wait forever under software rendering */
  if(out){try{const d=await p.evaluate(()=>{const g=window.__game;g.GAME.hold=true;for(let i=0;i<3;i++)g.render(1/60);return g.snap();});require('fs').writeFileSync(out,Buffer.from(d.split(',')[1],'base64'));}catch(e){errs.push('snap: '+e.message);}}
  console.log(JSON.stringify({boot_s:+boot.toFixed(1),...r},null,1));
  if(errs.length)console.log('PAGE ERRORS ('+errs.length+'):\n  '+errs.slice(0,8).join('\n  '));else console.log('no page errors');
  await b.close();process.exit(errs.length?1:0);
})();
