/* The whole game in a real browser (headless Chromium, WebGL in software), drawn through the renderer: boots the built
   page, then drives several places (the car on the gas through the game's own step, frames drawn on the way, the
   floating origin stepping as it goes), a race with a robot in your seat, a challenge, the showroom (the shed, the
   bay's window, the dyno lab). Prints what each did; any page error fails it.
   usage: node tools/wo2_check.js [places,comma,separated] [race id] [challenge id]     env: QUALITY (mobile), W, H, FILE */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','wide-open-2.html');
const places=(process.argv[2]||'garage,downtown,ring,hwyE,gas,ridge,oval,mud,strip,saltE').split(','),raceId=process.argv[3]||'',chalId=process.argv[4]||'';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  const t0=Date.now();
  await pg.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}`);
  try{await pg.waitForFunction(()=>window.__game&&(document.getElementById('loading').hidden||/wrong|compile/.test(document.getElementById('loading').textContent)),null,{timeout:600000,polling:1000});}
  catch(e){errs.push('boot timed out');}
  const loading=await pg.evaluate(()=>document.getElementById('loading').hidden?'':document.getElementById('loading').textContent);if(loading)errs.push('loading: '+loading);
  console.log('boot',((Date.now()-t0)/1000).toFixed(1)+'s');
  await pg.evaluate(()=>{window.requestAnimationFrame=()=>0;window.__game.GAME.hold=true;});
  const run=async(name,fn,arg)=>{const t=Date.now();try{const r=await pg.evaluate(fn,arg);console.log(name,((Date.now()-t)/1000).toFixed(0)+'s',JSON.stringify(r));}catch(e){errs.push(name+': '+e.message.slice(0,300));console.log(name,'FAILED',e.message.slice(0,300));}};
  /* the showroom first: it is the opening screen */
  await run('showroom',async()=>{const g=window.__game,dt=1/60,out={};
    for(let i=0;i<6;i++){g.APP.t+=dt;g.render(dt);}out.shed=g.APP.tris;
    g.showTab('garage');for(let i=0;i<6;i++){g.APP.t+=dt;g.render(dt);}out.garage=g.APP.tris;
    g.showFull(true);for(let i=0;i<6;i++){g.APP.t+=dt;g.render(dt);}out.bay=g.APP.tris;
    g.SHOW.tab='engine';g.syncShow();for(let i=0;i<6;i++){g.APP.t+=dt;g.render(dt);}out.lab=g.APP.tris;g.SHOW.tab='look';g.syncShow();
    g.showFull(false);g.closeMenu();return out;});
  for(const place of places)await run('drive '+place,async place=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));g.closeMenu();G.state='drive';g.goTo(place);
    const t=G.car,eye=()=>[t.p[0],t.p[1]+3,t.p[2]],ro0=[...g.RO];let frames=0,nan=0;
    for(let k=0;k<200;k++){g.worldUpdate(eye(),t);const c=g.WORLD.chunks.get((Math.floor(t.p[0]/128)+4096)*8192+Math.floor(t.p[2]/128)+4096);if(c&&c.H&&c.st)break;await wait(50);}
    g.placeCar(t.p[0],t.p[2],Math.atan2(-t.M[6],t.M[0]));
    g.setTestInput({steer:0,thr:.8,brk:0,hb:0,nos:false});
    for(let k=0;k<240;k++){g.APP.t+=dt;g.step(dt);if(k%12===0){g.render(dt);frames++;}else{g.worldUpdate(eye(),t);g.setOrigin(eye());}if(!t.p.every(Number.isFinite))nan++;if(k%10===0)await wait(0);}
    g.setTestInput(null);
    return {place:G.place,mph:Math.round(t.speed*2.237),frames,nan,tris:g.APP.tris,chunks:g.WORLD.chunks.size,ro:[...g.RO],stepped:g.RO[0]!==ro0[0]||g.RO[2]!==ro0[2],render:g.R.iw+'x'+g.R.ih};},place);
  /* a race: the first one (or the one asked for), a robot in your seat for a minute and a half, frames drawn on the way */
  await run('race',async id=>{const g=window.__game,G=g.GAME,R=g.RACE,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));g.closeMenu();G.state='drive';
    id=id||g.RACE_EVENTS[0].id;g.startRace(id);const t=G.car;let pd=null,frames=0,f=0;
    for(;f<60*90;f++){if(R.state==='done'||!R.on)break;G.state='drive';
      if(R.state!=='grid'&&!pd){pd=new g.Driver(t,R.me.line,{skill:.9,react:0});pd.go=true;pd.track();}
      if(pd){pd.drive(dt,R.cars.filter(c=>!c.me).map(c=>c.drv));g.setTestInput(Object.assign({},pd.inp,{reset:!!pd.resetReq}));pd.resetReq=false;}else g.setTestInput({steer:0,thr:0,brk:1,hb:0,nos:false});
      g.APP.t+=dt;g.step(dt);if(f%30===0){g.render(dt);frames++;}else{const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);}
      if(f%6===0)await wait(0);}
    const out={id,state:R.state,secs:Math.round(f/60),frames,tris:g.APP.tris,others:R.cars.filter(c=>!c.me).map(c=>c.name+(c.drv.kin?' (riding)':'')).join(', ')};
    g.setTestInput(null);if(G.state==='results')g.hideResults();else g.raceEnd(null);return out;},raceId);
  /* a challenge: the first one (or the one asked for), on the gas through its countdown and a few seconds after */
  await run('challenge',async id=>{const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));g.closeMenu();G.state='drive';
    const c=id?g.CHALS.find(q=>q.id===id):g.CHALS[0];g.chalStart(c);const t=G.car;t.pt.start();let frames=0;
    for(let f=0;f<60*12;f++){G.state='drive';g.setTestInput({steer:0,thr:f>200?.7:0,brk:f>200?0:1,hb:0,nos:false});g.APP.t+=dt;g.step(dt);
      if(f%30===0){g.render(dt);frames++;}else{const e=[t.p[0],t.p[1]+3,t.p[2]];g.worldUpdate(e,t);g.setOrigin(e);}if(f%6===0)await wait(0);}
    const r=g.CHAL.run,out={id:c.id,kind:c.kind,phase:r&&r.phase,frames,tris:g.APP.tris};g.setTestInput(null);if(g.chalQuit)g.chalQuit();g.CHAL.run=null;if(G.state==='cres'&&g.closeChalResult)g.closeChalResult(true);return out;},chalId);
  /* the night: the town's lamps, the headlights, a frame or two */
  await run('night',async()=>{const g=window.__game,G=g.GAME,dt=1/60;g.closeMenu();G.state='drive';g.applyTod('night');g.APP.lights=true;g.goTo('neon');
    for(let i=0;i<8;i++){g.APP.t+=dt;g.render(dt);}const out={tris:g.APP.tris,lights:g.R.lights.stats.lights,dyn:g.R.U.uNDyn,hl:g.R.U.uHLShOn};g.applyTod('day');g.APP.lights=false;return out;});
  console.log(errs.length?'PAGE ERRORS ('+errs.length+'):\n  '+errs.slice(0,12).join('\n  '):'no page errors');
  await b.close();process.exit(errs.length?1:0);})();
