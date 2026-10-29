/* Screenshots of the game, for checking the graphics by eye (and that the page boots without errors).
   usage: node tools/game_shot.js <out-dir> <shot> ...
   a shot is  name:build:place:gfx[:level:weather:dots]  e.g.  stock-yard:stock:shop:plus  or  rain:race:track:high:sim:storm:3
   The loop is held still; each shot steps the physics a little (so the car settles) and draws one frame. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const page=process.env.PAGE||path.resolve(__dirname,'..','game.html');
(async()=>{
  const [out,...jobs]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
  const logs=[];pg.on('console',m=>{if(m.type()!=='log')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message));
  /* the first animation frame (the boot) runs; the game loop's never do */
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}let n=0;window.requestAnimationFrame=cb=>{if(n++<1)setTimeout(()=>cb(performance.now()),0);return 0;};});
  const t0=Date.now();await pg.goto('file://'+page);
  try{await pg.waitForFunction(()=>window.__game&&window.__game.GAME.car,null,{timeout:240000});}
  catch(e){console.log('boot failed');for(const l of logs.slice(0,30))console.log(l.slice(0,600));await b.close();return;}
  console.log('booted in',((Date.now()-t0)/1000).toFixed(1),'s');
  await pg.evaluate(()=>{__game.GAME.hold=true;__game.closeMenu();});
  for(const j of jobs){
    const [name,bid='stock',place='shop',gfx='plus',level='real',wx='dry',dots='3',cam='0']=j.split(':');
    const T=Date.now();
    const r=await pg.evaluate(([bid,place,gfx,level,wx,dots,cam])=>{
      const G=__game,i=G.BUILDS.findIndex(b=>b.id===bid);G.APP.level=level;G.SIMSET.wx=wx;G.setGfx(gfx);G.setRes(+dots);G.APP.cam=+cam;
      G.spawnCar(i);G.goTo(place);G.syncWeather();
      for(let k=0;k<60;k++)G.step(1/60);
      G.render(1/60);G.render(1/60);
      return [G.snap(),G.APP.tris];
    },[bid,place,gfx,level,wx,dots,cam]);
    const f=path.join(out,name+'.png');fs.writeFileSync(f,Buffer.from(r[0].split(',')[1],'base64'));
    console.log(f,Math.round(r[1]/1000)+'k tris',((Date.now()-T)/1000).toFixed(1)+' s');
  }
  for(const l of logs.slice(0,30))console.log(l.slice(0,600));
  await b.close();
})();
