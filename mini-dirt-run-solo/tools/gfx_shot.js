/* Graphics levels and weather in the browser: each case boots nothing new, just sets the graphics level, the
   weather, the time of day and the driving level, drives a moment and saves the frame.
   usage: node tools/gfx_shot.js <out-dir> [phone|laptop] */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','mini-dirt-run-solo.html');
(async()=>{
  const [out='/tmp/mdrs-g',kind='laptop']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext(kind==='phone'?{viewport:{width:915,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const pg=await ctx.newPage();const logs=[];
  pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.goto('file://'+PAGE);await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:180000});
  await pg.evaluate(()=>{const G=__game;G.GAME.hold=true;G.closeMenu();});
  const cases=[['mini_dry','mini','dry','day','real'],['plus_dry','plus','dry','day','real'],['high_dry','high','dry','day','real'],['plus_rain','plus','wet','day','sim'],
    ['plus_storm','plus','storm','day','sim'],['plus_night_rain','plus','wet','night','real'],['mini_storm','mini','storm','day','real']];
  for(const [name,gfx,wx,tod,level] of cases){
    const info=await pg.evaluate(([gfx,wx,tod,level])=>{const G=__game;G.setGfx(gfx);G.SIMSET.wx=wx;G.syncWeather();G.APP.tod=tod;G.applyTod(tod);G.APP.lights=tod==='night';G.APP.level=level;
      G.spawnRig(false);G.goTo('shop');G.TOUCH.on=true;G.TOUCH.thr=.5;for(let i=0;i<45;i++)G.step(1/30);G.TOUCH.thr=0;G.step(1/30);
      const t0=performance.now();G.render(1/30);G.render(1/30);return {ms:((performance.now()-t0)/2).toFixed(0),tris:G.APP.tris,sim:!!G.GAME.car.sim,wet:G.GAME.car.wet};},[gfx,wx,tod,level]);
    const d=await pg.evaluate(()=>__game.snap());fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(d.split(',')[1],'base64'));console.log(name,JSON.stringify(info));}
  for(const l of logs.slice(0,30))console.log(l.slice(0,600));
  await b.close();
})();
