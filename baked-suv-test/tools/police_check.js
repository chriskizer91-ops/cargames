/* Police mode (src/60_police.js) in a real browser, headless, the game's own step driving it:
     chase   police on; you from the country east of town, east onto the salt flats and on across them at about 80 mph
             for two minutes (a little controller of the test's own holding the heading): how far behind they keep,
             how often one had to come back in behind you, that none is ever lost for good
     bust    then you stop: they catch up and call it, and after holding off they come back
   Checks: no NaNs; police out the whole time; the nearest within 300 m at least 90% of the chase; a bust within 40 s
   of stopping. Any failure, or a page error, makes the exit code 1.
   usage: node tools/police_check.js [chase,bust]      env: QUALITY (mobile), CAR (a build id, default the stock SUV), FILE, W, H */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','baked-suv-test.html');
const which=(process.argv[2]||'chase,bust').split(',');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});const errs=[];let fails=0;
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  const t0=Date.now();await pg.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}`);
  try{await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:600000,polling:1000});}catch(e){errs.push('boot timed out');}
  console.log('boot',((Date.now()-t0)/1000).toFixed(1)+'s');
  await pg.evaluate(car=>{window.requestAnimationFrame=()=>0;const g=window.__game;g.GAME.hold=true;if(car){const i=g.BUILDS.findIndex(b=>b.id===car);if(i>=0)g.spawnCar(i);}},process.env.CAR||'');
  const run=async(name,fn,check)=>{const t=Date.now();try{const r=await pg.evaluate(fn);const bad=check(r);if(bad.length)fails++;
      console.log(name,((Date.now()-t)/1000).toFixed(0)+'s',bad.length?'FAIL: '+bad.join(', '):'pass',JSON.stringify(r));}
    catch(e){fails++;errs.push(name+': '+e.message.slice(0,300));console.log(name,'FAILED',e.message.slice(0,300));}};
  if(which.includes('chase'))await run('chase',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.applyTod('day');g.closeMenu();G.state='drive';g.placeCar(1800,40,0);g.APP.cam=1;g.APP.police=true;g.render(dt);
    const t=G.car,inp={steer:0,thr:0,brk:0,hb:0,nos:false},vt=36,zt=40;let nan=0,within=0,frames=0,maxD=0,sum=0,out=0;const trace=[];
    for(let f=0;f<120*60;f++){const M=t.M,hl=Math.hypot(M[0],M[6])||1,hz=M[6]/hl;inp.steer=Math.max(-.3,Math.min(.3,.03*(zt-t.p[2])-1.2*hz));
      inp.thr=Math.max(0,Math.min(1,(vt-t.speed)*.3));inp.brk=t.speed>vt+3?.3:0;g.setTestInput(inp);g.APP.t+=dt;g.step(dt);
      if(t.M[4]<.3)g.placeCar(t.p[0],t.p[2],0);
      const P=g.POL,n=P.cars.filter(c=>c.V).length;frames++;if(n)out++;const d=P.near;if(d<300)within++;if(d<1e8){maxD=Math.max(maxD,d);sum+=d;}
      for(const c of P.cars)if(c.V&&!c.V.p.every(Number.isFinite))nan++;
      if(f%600===0)trace.push(Math.round(t.p[0])+':'+(d<1e8?Math.round(d):'-'));
      if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const P=g.POL;
    return {you:[Math.round(t.p[0]),Math.round(t.p[2]),Math.round(t.speed*2.237)+'mph'],place:G.place,nan,policeOutShare:+(out/frames).toFixed(3),within300Share:+(within/frames).toFixed(3),
      meanGap:Math.round(sum/frames),maxGap:Math.round(maxD),respawns:P.respawns,cars:P.cars.filter(c=>c.V).length,trace,cues:g.VOX.log.slice()};},
    r=>{const bad=[];if(r.nan)bad.push('NaN');if(r.policeOutShare<.95)bad.push('police missing');if(r.within300Share<.9)bad.push('lost you');return bad;});
  if(which.includes('bust'))await run('bust',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),t=G.car,b0=g.POL.busts;g.APP.police=true;
    let at=-1,nan=0;
    for(let f=0;f<60*60;f++){g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false,park:true});g.APP.t+=dt;g.step(dt);
      for(const c of g.POL.cars)if(c.V&&!c.V.p.every(Number.isFinite))nan++;
      if(at<0&&g.POL.busts>b0)at=f*dt;if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);return {bustedAfter:at<0?null:+at.toFixed(1),busts:g.POL.busts-b0,nan,nearest:Math.round(g.POL.near),holding:g.POL.holdT>0,cues:g.VOX.log.slice(-6)};},
    r=>{const bad=[];if(r.nan)bad.push('NaN');if(r.bustedAfter===null||r.bustedAfter>40)bad.push('never busted');return bad;});
  if(errs.length){fails++;console.log('PAGE ERRORS:\n  '+errs.slice(0,8).join('\n  '));}else console.log('no page errors');
  await b.close();process.exit(fails?1:0);
})();
