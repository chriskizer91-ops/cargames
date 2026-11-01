/* One frame, the same every time: for telling whether a change to the drawing changed the picture. The game is
   booted with the loop held, sent to a place, left until the world round the car is whole, then the renderer's
   frame count, TAA history and probe are reset, the clock set, and exactly K frames drawn at a fixed step before
   the canvas is saved. Two builds run through this give the same bytes unless the drawing differs (random things,
   dust and flames, are off: the car stands still by day).
   usage: node tools/frame_wo2.js <out.png> [place] [tod]        env: QUALITY (high), W, H (480 x 270), K (frames, 16), FILE, JS */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const out=process.argv[2]||'/tmp/frame.png',place=process.argv[3]||'downtown',tod=process.argv[4]||'day';
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','wide-open-2.html');
const Q=process.env.QUALITY||'high',K=+(process.env.K||16),JS=process.env.JS||'';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${Q}&display=clear`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:400000,polling:500});
  const r=await p.evaluate(async([place,tod,K,JS])=>{const g=__game,G=g.GAME,R=g.R,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.applyTod(tod==='night'?'night':'day');g.APP.tod=tod;g.APP.lights=tod==='night';
    g.closeMenu();G.state='drive';g.goTo(place);g.APP.cam=1;
    if(JS)await (new Function('g',JS))(g);
    /* the world round the car, whole: frames drawn (the worker's meshes arrive between them) until nothing is missing
       or pending, then a few more for the trees' lists and the far tiles */
    let tries=0;for(;tries<120;tries++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(40);const W=g.WORLD;if(tries>8&&W.st.holes===0&&W.pend.size===0&&W.inbox.length===0&&W.st.queue===0)break;}
    for(let i=0;i<6;i++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(40);}
    /* the same start for every build: frame count (the TAA jitter's phase), history, probe, clock */
    R.frameN=0;R.resetTAA=true;R.hasPrev=false;R.probeFilled=0;R.probeFace=0;g.APP.t=100;g.GAME.car.v.fill(0);g.GAME.car.w.fill(0);
    for(let i=0;i<K;i++){g.APP.t+=dt;g.step(dt);g.render(dt);}
    return {tries,chunks:g.WORLD.chunks.size,far:g.WORLD.far.size,render:R.iw+'x'+R.ih+' of '+R.W+'x'+R.H,frameN:R.frameN,p:G.car.p.map(v=>+v.toFixed(2)),png:g.snap()};},[place,tod,K,JS]);
  fs.writeFileSync(out,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;
  console.log(path.basename(out),JSON.stringify(r),errs.length?'ERRORS '+JSON.stringify(errs):'');
  await b.close();
})();
